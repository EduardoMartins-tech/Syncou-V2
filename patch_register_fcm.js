import fs from 'fs';
let code = fs.readFileSync('src/pages/DashboardHome.tsx', 'utf8');

const oldRegister = `  const registerFcmToken = async () => {
    try {
      const msg = await messaging();
      if (!msg) return;
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not set');
        return;
      }
      
      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready yet', err);
      }
      const currentToken = await getToken(msg, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });
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
  };`;

const newRegister = `  const registerFcmToken = async () => {
    try {
      console.log('Iniciando registerFcmToken...');
      const msg = await messaging();
      if (!msg) {
         console.warn('Firebase messaging indisponível');
         return;
      }
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not set');
        return;
      }
      
      let registration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Service worker not ready yet', err);
      }
      console.log('Chamando getToken()...');
      const currentToken = await getToken(msg, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });
      console.log('Resultado do getToken:', currentToken ? 'Token obtido (ocultado)' : 'Vazio/Nulo');
      
      if (currentToken) {
        // Send to backend
        const tokenStr = localStorage.getItem('token');
        const fcmRes = await fetch('/api/user/fcm-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${tokenStr}\`
          },
          body: JSON.stringify({ token: currentToken })
        });
        console.log('FCM token salvo no backend. Status:', fcmRes.status);
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token:', err);
    }
  };`;

const oldClick = `                   <Button 
                     onClick={async () => {
                       if (!('Notification' in window)) {
                         notifyError('Navegador não suporta notificações.');
                         return;
                       }
                       if (Notification.permission === 'denied') {
                         notifyError('Notificações bloqueadas. Libere nas permissões do site/navegador para receber alertas.');
                         return;
                       }
                       const p = await Notification.requestPermission();
                       setNotificationPerm(p);
                       if (p === 'granted') notifySuccess('Notificações ativadas!');
                     }} 
                     variant="outline" `;

const newClick = `                   <Button 
                     onClick={async () => {
                       console.log('Valor atual de Notification.permission antes do clique:', Notification.permission);
                       if (!('Notification' in window)) {
                         notifyError('Navegador não suporta notificações.');
                         return;
                       }
                       if (Notification.permission === 'denied') {
                         notifyError('Notificações bloqueadas. Libere nas permissões do site/navegador para receber alertas.');
                         return;
                       }
                       const p = await Notification.requestPermission();
                       console.log('Valor de Notification.permission após request:', p);
                       setNotificationPerm(p);
                       if (p === 'granted') notifySuccess('Notificações ativadas! (Nota: isso apenas mostra que a permissão foi dada no browser)');
                     }} 
                     variant="outline" `;

code = code.replace(oldRegister, newRegister);
code = code.replace(oldClick, newClick);

fs.writeFileSync('src/pages/DashboardHome.tsx', code);
