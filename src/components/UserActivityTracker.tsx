
'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/hooks/use-user';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const UserActivityTracker = () => {
  const { user } = useUser();
  const sessionRef = useRef<{ id: string; startTime: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const startSession = async () => {
      try {
        const startTime = Date.now();
        const sessionData = {
          userId: user.id,
          startTime: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, 'user-sessions'), sessionData);
        sessionRef.current = { id: docRef.id, startTime: startTime };
        console.log('Session started:', docRef.id);
      } catch (error) {
        console.error('Error starting session:', error);
      }
    };

    const endSession = async () => {
      if (sessionRef.current) {
        try {
          const { id, startTime } = sessionRef.current;
          const endTime = Date.now();
          const duration = Math.round((endTime - startTime) / 1000); // Duration in seconds
          
          const sessionDocRef = doc(db, 'user-sessions', id);
          await updateDoc(sessionDocRef, {
            endTime: serverTimestamp(),
            duration: duration,
          });
          console.log('Session ended:', id, 'Duration:', duration, 'seconds');
          sessionRef.current = null;
        } catch (error) {
          console.error('Error ending session:', error);
        }
      }
    };
    
    // Start session when component mounts and user is available
    startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endSession();
      } else {
        // If user comes back to the tab, start a new session
        if (!sessionRef.current) {
            startSession();
        }
      }
    };
    
    const handleBeforeUnload = () => {
        // This is a synchronous fallback for when the tab is closed
        endSession();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup: End session if the component unmounts (e.g., logout)
      endSession();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  return null; // This component does not render anything.
};

export default UserActivityTracker;
