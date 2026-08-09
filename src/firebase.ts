import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Every one of these is required for at least one Firebase service this app
// actually uses — most silently produce a working-looking app that fails
// much later, deep inside SDK internals, with an error that gives no hint
// the real problem is a missing env var. appId is the sharpest example:
// Auth/Firestore/Storage don't need it, so the app runs fine right up until
// something touches Firebase Installations (which underlies Cloud
// Messaging's getToken()) — see registerWebPush in
// services/pushNotifications.ts, which now checks for this explicitly
// rather than letting that surface as "Installations: Missing App
// configuration value: appId" with no clue where to even start looking.
const REQUIRED_FIREBASE_ENV_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const missingFirebaseEnvVars = REQUIRED_FIREBASE_ENV_VARS.filter(
  (key) => !import.meta.env[key]
);
if (missingFirebaseEnvVars.length > 0) {
  console.error(
    `🚨 CRITICAL ERROR: missing Firebase config value(s): ${missingFirebaseEnvVars.join(", ")}. ` +
    "Check your .env file (and your deploy/CI environment's env vars, if this is happening in " +
    "production and not locally — a value present in .env but never set on the actual build " +
    "environment produces exactly this) and rebuild."
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