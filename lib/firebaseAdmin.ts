import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://malvin-df21d-default-rtdb.firebaseio.com" // Get this from your Firebase Realtime DB tab
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.database();
export const adminAuth = admin.auth();