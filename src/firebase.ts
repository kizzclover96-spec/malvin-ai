import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
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


// FIXED: Use initializeFirestore with long-polling fallback enabled.
// The persistent (IndexedDB-backed) cache below requires a real, non-opaque
// origin. StoreFront.tsx's sandboxed <iframe> grants allow-same-origin
// (real origin separation — stores.malvinai.com vs this app's own origin —
// makes that safe; see the comment on that <iframe>), so this should have
// a real origin in normal operation. This feature-detects and falls back
// to the in-memory cache anyway, as a safety net alongside the guards in
// main.jsx: if that ever isn't true (a misconfigured STORE_ORIGIN pointing
// back at this same origin, say), Firestore still works fine without
// persistence — it just re-fetches from the network each load instead of
// warming from disk, a non-issue for a store page opened fresh each time.
function isPersistentStorageAvailable() {
  try {
    const testKey = '__malvin_storage_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: isPersistentStorageAvailable()
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache(),
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
//onAuthStateChanged(auth, (user) => {
    //if (!user) {
   //   signInAnonymously(auth).catch((err) =>
    //    console.error("Anonymous auth bootstrap failed:", err)
   //   );
  //  }
 // });//