import { PushNotifications, Token } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { firestore as db } from '../firebase';

// Must match com.google.firebase.messaging.default_notification_channel_id in
// AndroidManifest.xml, or server pushes land on a channel Android invented for
// them — with no name, no sound and no way for the user to manage it.
const CHANNEL_ID = 'malvin_default';

// Creates the notification channel that both server pushes and local
// notifications post to. Android 8+ requires one; without it notifications
// either don't appear or show up under a nameless "Miscellaneous" category.
// Creating an existing channel is a no-op, so this is safe to call repeatedly.
//
// From Android 8 the CHANNEL owns the sound, not the message — a push asking
// for a sound on a low-importance channel still arrives silently. importance 5
// is what makes these audible and pop as a heads-up banner. `sound` is
// deliberately left unset: the property expects a filename in res/raw, and
// naming a file that doesn't exist mutes the channel entirely, whereas
// omitting it uses the device's default notification tone.
//
// NOTE: Android freezes a channel's settings the first time it's created.
// Changing importance/sound later needs a new channel id (or an app reinstall)
// to take effect on devices that already have this one.
async function ensureChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Malvin AI',
      description: 'Orders, appointments, chats and account activity',
      importance: 5, // IMPORTANCE_HIGH — audible + heads-up banner
      visibility: 1, // VISIBILITY_PUBLIC — shows content on the lock screen
      lights: true,
      lightColor: '#0066FF',
      vibration: true,
    });
  } catch (err) {
    console.error('Failed to create notification channel:', err);
  }
}

// Registers this device for push notifications and saves the resulting FCM
// token to Firestore so the backend knows where to deliver a push. Safe to
// call every time the app opens with a signed-in user — re-registering is a
// no-op if permission is already granted, and re-saving the same token is
// harmless.
//
// Only does anything on a native platform (iOS/Android via Capacitor) — on
// web this quietly does nothing, since web push needs a completely
// different setup (service worker + VAPID key) that this project doesn't
// use, given the app is wrapped in Capacitor pointing at a remote URL.
export async function registerPushNotifications(uid: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!uid) return;

  try {
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      console.log('Push permission not granted:', permission.receive);
      return;
    }

    await ensureChannel();

    // Registration is async — the token arrives via the 'registration'
    // event listener below, not as a return value from register().
    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token: Token) => {
      try {
        await setDoc(
          doc(db, 'customers', uid),
          {
            pushToken: token.value,
            pushPlatform: Capacitor.getPlatform(), // 'ios' | 'android'
            pushTokenUpdatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error('Failed to save push token:', err);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err);
    });

    // Foreground notifications don't show a system banner by default on
    // some platforms — this at least logs them for now. Front.tsx's
    // NotificationBell already picks up the underlying Firestore doc via
    // its own live listener, so the in-app UI updates regardless.
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push tapped:', action.notification);
    });
  } catch (err) {
    console.error('Push notification setup failed:', err);
  }
}

// Fixed id so a repeat greeting replaces the previous one instead of stacking
// several "Welcome back" notifications in the shade.
const WELCOME_NOTIFICATION_ID = 1001;

// Module-level, so it resets when the app process does: the greeting fires once
// per app run per account, not on every onAuthStateChanged re-fire (which also
// emits on token refresh and on cold start with a restored session).
const greetedUids = new Set<string>();

// Posts the one-off "you're signed in" notification. This is a *local*
// notification rather than a server push — the trigger is entirely on-device,
// so a round trip through FCM would only add latency and a failure mode. It
// lands on the same channel and wears the same icon, so it's indistinguishable
// from a real push to the person receiving it.
export async function sendSignInNotification(uid: string, displayName?: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!uid || greetedUids.has(uid)) return;
  greetedUids.add(uid);

  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== 'granted') return;

    await ensureChannel();

    const firstName = (displayName || '').trim().split(' ')[0];

    await LocalNotifications.schedule({
      notifications: [
        {
          id: WELCOME_NOTIFICATION_ID,
          channelId: CHANNEL_ID,
          title: firstName ? `Welcome back, ${firstName} ✦` : 'Welcome back ✦',
          body: "You're signed in to Malvin AI — tap to pick up where you left off.",
          smallIcon: 'ic_stat_malvin',
          iconColor: '#0066FF',
          // A beat of delay so it doesn't fire mid sign-in transition.
          schedule: { at: new Date(Date.now() + 1500) },
        },
      ],
    });
  } catch (err) {
    console.error('Failed to post the sign-in notification:', err);
  }
}

// Lets the greeting fire again after a genuine sign-out/sign-in cycle.
export function resetSignInGreeting(uid?: string | null): void {
  if (uid) greetedUids.delete(uid);
  else greetedUids.clear();
}

const PENDING_WORK_NOTIFICATION_ID = 1002;
const remindedUids = new Set<string>();

/**
 * Fires the "you still have work waiting" notification at sign-in.
 *
 * The recurring version of this is a scheduled Cloud Function
 * (remindPendingWork) so it can keep firing hourly with the app closed. This
 * one exists because waiting up to an hour to hear about a queue you already
 * have is useless — it asks the backend for the live counts and posts them
 * immediately. Silent when the queue is empty, and for shoppers (who have no
 * orders/appointments/chats of their own) it always is.
 */
export async function notifyPendingWorkOnSignIn(uid: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!uid || remindedUids.has(uid)) return;
  remindedUids.add(uid);

  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const callable = httpsCallable(getFunctions(), 'getPendingWorkSummary');
    const result: any = await callable();

    const summary = result?.data?.summary;
    const total = Number(result?.data?.total || 0);
    if (!summary || total === 0) return;

    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== 'granted') return;

    await ensureChannel();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: PENDING_WORK_NOTIFICATION_ID,
          channelId: CHANNEL_ID,
          title: 'You still have work waiting',
          body: `${summary} still need your attention.`,
          smallIcon: 'ic_stat_malvin',
          iconColor: '#0066FF',
          // Staggered behind the welcome notification so the two don't land
          // on top of each other.
          schedule: { at: new Date(Date.now() + 4000) },
        },
      ],
    });
  } catch (err) {
    // A shopper account, an offline start, or functions not deployed yet —
    // none of these should be loud, the dashboards still show the real state.
    console.log('Pending-work reminder skipped:', err);
  }
}

// Mirrors resetSignInGreeting so a fresh sign-in gets a fresh reminder.
export function resetPendingWorkReminder(uid?: string | null): void {
  if (uid) remindedUids.delete(uid);
  else remindedUids.clear();
}

/**
 * Posts a one-off device notification for something that just happened while
 * the app is running — a mechanic accepting a booking, say.
 *
 * This is a LOCAL notification, so it only fires on a device that currently
 * has the app open or backgrounded. Reaching a device with the app closed
 * needs a server-side FCM send from a Cloud Function, which this deliberately
 * isn't: the accepting mechanic can't write to the customer's device, and
 * Firestore rules rightly stop them notifying another user directly.
 *
 * No-ops on the web, where LocalNotifications isn't available.
 */
export async function postLocalAlert(title: string, body: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    let permission = await LocalNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions();
    }
    if (permission.display !== 'granted') return;

    await ensureChannel();

    await LocalNotifications.schedule({
      notifications: [
        {
          // A distinct id per post, so a second alert doesn't overwrite the
          // first the way the fixed-id welcome notification intends to.
          id: Math.floor(Math.random() * 1_000_000) + 1000,
          channelId: CHANNEL_ID,
          title,
          body,
          smallIcon: 'ic_stat_malvin',
          iconColor: '#0066FF',
        },
      ],
    });
  } catch (err) {
    console.error('Failed to post local alert:', err);
  }
}

// Call on sign-out so a device that gets shared or re-logged-into doesn't
// keep receiving another person's notifications.
export async function clearPushToken(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(
      doc(db, 'customers', uid),
      { pushToken: deleteField(), pushPlatform: deleteField() },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to clear push token:', err);
  }
}