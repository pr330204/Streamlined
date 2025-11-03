// This file must be in the public directory
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAM9xAtL15eqibqmN8BWtTiDjRjO6tfYi4",
  authDomain: "cinefind-blty1.firebaseapp.com",
  projectId: "cinefind-blty1",
  storageBucket: "cinefind-blty1.firebasestorage.app",
  messagingSenderId: "958093334516",
  appId: "1:958093334516:web:4cc754965c32f223660ba1"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
