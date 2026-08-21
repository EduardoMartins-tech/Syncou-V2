import fs from 'fs';
let code = fs.readFileSync('src/pages/DashboardHome.tsx', 'utf8');

const oldToken = `      const currentToken = await getToken(msg, { vapidKey });`;

const newToken = `      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready yet', err);
      }
      const currentToken = await getToken(msg, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });`;

code = code.replace(oldToken, newToken);
fs.writeFileSync('src/pages/DashboardHome.tsx', code);
