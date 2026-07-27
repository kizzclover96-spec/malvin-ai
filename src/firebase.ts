import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) {
  console.error(
    "🚨 CRITICAL ERROR: VITE_FIREBASE_PROJECT_ID is empty! " +
    "Check your .env file and restart your local npm dev server."
  );
}
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Prevent duplicate initializations during hot reloads
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);


// FIXED: Use initializeFirestore with long-polling fallback enabled
export const firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const functions = getFunctions(app, "us-central1");

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

setPersistence(auth, browserLocalPersistence)
  .catch((err) => console.error("Persistence error:", err));

// 🔐 GUEST CHECKOUT FIX:
// Cloud Functions like createDirectPaymentSession require a real Firebase Auth
// session (request.auth.uid). Previously, guests only got a random localStorage
// id with no Firebase session behind it, so callable functions always rejected
// them with "unauthenticated". Signing guests in anonymously gives them a real
// (but limited/anonymous) Firebase Auth UID, so auth.currentUser is always
// populated and secure Cloud Functions keep working for guests too.
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((err) =>
      console.error("Anonymous auth bootstrap failed:", err)
    );
  }
});