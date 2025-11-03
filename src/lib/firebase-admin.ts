
import * as admin from 'firebase-admin';
import 'dotenv/config';

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

function getAdminServices() {
  if (!admin.apps.length) {
    // Return mock or dummy objects if not initialized to prevent crashes
    return {
      adminDb: null,
      adminAuth: null,
      adminMessaging: null,
    };
  }
  return {
    adminDb: admin.firestore(),
    adminAuth: admin.auth(),
    adminMessaging: admin.messaging(),
  };
}

const { adminDb, adminAuth, adminMessaging } = getAdminServices();

export { adminDb, adminAuth, adminMessaging };
