
'use client';

import { useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { initializeFCM } from '@/lib/firebase-messaging';

const NotificationListener = () => {
  const { user } = useUser();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // The initializeFCM function is called from useUser hook when the user is loaded.
      // This component just ensures the listener is active on the client.
    }
  }, [user]);

  return null; // This component does not render anything.
};

export default NotificationListener;
