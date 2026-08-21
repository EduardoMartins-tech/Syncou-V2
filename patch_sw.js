import fs from 'fs';
let code = fs.readFileSync('src/sw.ts', 'utf8');

const oldSW = `onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.ts] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Notificação';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/pwa-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});`;

const newSW = `onBackgroundMessage(messaging, (payload) => {
  console.log('[sw.ts] Received background message ', payload);
  
  // Use payload.data if available (pure data payload for reliable background delivery),
  // fallback to payload.notification just in case.
  const title = payload.data?.title || payload.notification?.title || 'Notificação';
  const options = {
    body: payload.data?.body || payload.notification?.body,
    icon: '/pwa-192x192.png',
  };

  self.registration.showNotification(title, options);
});`;

code = code.replace(oldSW, newSW);
fs.writeFileSync('src/sw.ts', code);
