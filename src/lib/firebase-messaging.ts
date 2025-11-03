
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { User } from './types';
import { toast } from '@/hooks/use-toast';

export const initializeFCM = async (user: User | null) => {
  if (typeof window === 'undefined' || !app || !user) {
    return;
  }

  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');

      const currentToken = await getToken(messaging, {
        vapidKey: 'BH-eh9b_QLigTGm3zVT7VFKjzJGtTVIoT_C26aQxGRYpU4tbyPxouS5rC1a2sZCZZjJWZ6Q2Pt1hmqE3kjeQinA',
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        if (user.fcmToken !== currentToken) {
          // Save the token to the user's document in Firestore
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            fcmToken: currentToken,
          });
          console.log('FCM token saved to user profile.');
        }
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Unable to get permission to notify.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }

  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    toast({
      title: payload.notification?.title,
      description: payload.notification?.body,
    });
  });
};
