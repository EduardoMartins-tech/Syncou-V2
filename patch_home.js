import fs from 'fs';
let code = fs.readFileSync('src/pages/DashboardHome.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    if (notificationPerm === 'granted') {
      registerFcmToken();
    }
  }, [notificationPerm]);`;

const newEffect = `  useEffect(() => {
    if (notificationPerm === 'granted') {
      registerFcmToken();
    }
  }, [notificationPerm]);

  useEffect(() => {
    const setupForegroundListener = async () => {
      const msg = await messaging();
      if (msg) {
        import('firebase/messaging').then(({ onMessage }) => {
          onMessage(msg, (payload) => {
            console.log('Foreground message received: ', payload);
            const title = payload.data?.title || payload.notification?.title || 'Notificação';
            const body = payload.data?.body || payload.notification?.body || '';
            toast(title, { description: body });
          });
        });
      }
    };
    setupForegroundListener();
  }, []);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/pages/DashboardHome.tsx', code);
