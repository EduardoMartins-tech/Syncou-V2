/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST || []);

// Firebase Push Notification Background handler
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.ts] Received background message ', payload);
  
  // Use payload.data if available (pure data payload for reliable background delivery),
  // fallback to payload.notification just in case.
  const title = payload.data?.title || payload.notification?.title || 'Notificação';
  const options = {
    body: payload.data?.body || payload.notification?.body,
    icon: '/pwa-192x192.png',
  };

  self.registration.showNotification(title, options);
});
