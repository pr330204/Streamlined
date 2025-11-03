
import * as admin from 'firebase-admin';

// IMPORTANT: This file should only be used in server-side code.

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_JSON;

if (!admin.apps.length) {
  if (serviceAccountKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey)),
      });
    } catch (e: any) {
      console.error('Firebase Admin Initialization Error', e.stack);
    }
  } else {
    console.warn(
      'FIREBASE_SERVICE_ACCOUNT_KEY_JSON not set, Firebase Admin SDK will not be initialized.'
    );
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminMessaging = admin.messaging();

export { adminDb, adminAuth, adminMessaging };
