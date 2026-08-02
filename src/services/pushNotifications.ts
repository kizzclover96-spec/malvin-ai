import { PushNotifications, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { firestore as db } from '../firebase';

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