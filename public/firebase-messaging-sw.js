// Malvin AI — Web Push (Firebase Cloud Messaging) background handler.
//
// This is SEPARATE from the native push setup in the Android/iOS apps —
// this file only runs for people using Malvin as an installed web app
// (iOS "Add to Home Screen") or in an ordinary browser tab. It's what lets
// a push notification show up even when that tab/PWA isn't in the
// foreground, without needing anything from the App Store or an Apple
// Developer account.
//
// Service workers are plain static files — they can't `import` from the
// Vite-bundled app, so the same Firebase project config that's already
// visible in every network request this app makes has to be repeated here
// directly. These values identify the Firebase project; they are not
// secret keys — Firebase's actual security is enforced by Firestore/
// Storage rules, not by hiding this object.
//
// TODO: paste in the same values you used for VITE_FIREBASE_* in your .env
// file (Firebase console ▸ Project settings ▸ General ▸ "Your apps" ▸ SDK
// setup and configuration). They're identical — just copy them across.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAfKq3_PeV4lwEzSG9nV6AlH8fA3IaJ6Ew',
  authDomain: 'malvin-df21d.firebaseapp.com',
  projectId: 'malvin-df21d',
  storageBucket: 'malvin-df21d.firebasestorage.app',
  messagingSenderId: '581592622100',
  appId: '1:581592622100:web:9471d95a5e758424a53301',
});

const messaging = firebase.messaging();

// Fires when a push arrives and this tab/PWA is in the background or
// closed — exactly the case a person who added Malvin to their iPhone
// Home Screen needs covered. The compat SDK would show a bare default
// notification on its own; this just gives it Malvin's icon and a click
// target.
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Malvin AI', {
    body: body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
  });
});

// Tapping the notification focuses an already-open Malvin tab/PWA if one
// exists, otherwise opens a fresh one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});