import fs from 'fs';
let code = fs.readFileSync('src/pages/DashboardHome.tsx', 'utf8');

const importToken = `import { messaging } from '../lib/firebase';\nimport { getToken } from 'firebase/messaging';`;
code = code.replace(`import { googleSignInForCalendar } from '../lib/firebase';`, importToken + `\nimport { googleSignInForCalendar } from '../lib/firebase';`);

const registerTokenFunction = `
  const registerFcmToken = async () => {
    try {
      const msg = await messaging();
      if (!msg) return;
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not set');
        return;
      }
      
      const currentToken = await getToken(msg, { vapidKey });
      if (currentToken) {
        // Send to backend
        const tokenStr = localStorage.getItem('token');
        await fetch('/api/user/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${tokenStr}\`
          },
          body: JSON.stringify({ token: currentToken })
        });
        console.log('FCM token registered.');
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.log('An error occurred while retrieving token. ', err);
    }
  };

  useEffect(() => {
    if (notificationPerm === 'granted') {
      registerFcmToken();
    }
  }, [notificationPerm]);
`;

code = code.replace(`const [notificationPerm, setNotificationPerm] = useState<string>(Notification.permission);`, `const [notificationPerm, setNotificationPerm] = useState<string>(Notification.permission);\n` + registerTokenFunction);

fs.writeFileSync('src/pages/DashboardHome.tsx', code);
