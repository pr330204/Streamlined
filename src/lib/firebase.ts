import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  "projectId": "cinefind-blty1",
  "appId": "1:958093334516:web:4cc754965c32f223660ba1",
  "storageBucket": "cinefind-blty1.firebasestorage.app",
  "apiKey": "AIzaSyAM9xAtL15eqibqmN8BWtTiDjRjO6tfYi4",
  "authDomain": "cinefind-blty1.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "958093334516"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const messaging = (typeof window !== 'undefined') ? getMessaging(app) : null;


export { app, db, messaging };
