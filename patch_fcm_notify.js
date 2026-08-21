import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const target = `    res.json({ success: true, appointmentId: id });`;
const notifyLogic = `    // Send FCM push notification to provider
    try {
      const fcmTokensRes = await pool.query('SELECT token FROM fcm_tokens WHERE provider_id = $1', [providerId]);
      const tokens = fcmTokensRes.rows.map((r: any) => r.token);
      
      const adminApp = getFirebaseAdmin();
      if (adminApp && tokens.length > 0) {
        const message = {
          notification: {
            title: 'Novo agendamento recebido!',
            body: \`\${clientName} agendou para \${new Date(Number(startAt)).toLocaleString('pt-BR')}\`
          },
          tokens: tokens,
        };
        await adminApp.messaging().sendEachForMulticast(message);
        console.log('FCM push sent to provider.');
      }
    } catch (pushErr) {
       console.error("Error sending FCM push:", pushErr);
    }
    
    res.json({ success: true, appointmentId: id });`;

code = code.replace(target, notifyLogic);
fs.writeFileSync('server.ts', code);
