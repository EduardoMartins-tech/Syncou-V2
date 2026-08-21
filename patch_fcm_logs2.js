import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldPush = `    // Send FCM push notification to provider
    try {
      const fcmTokensRes = await pool.query('SELECT token FROM fcm_tokens WHERE provider_id = $1', [providerId]);
      const tokens = fcmTokensRes.rows.map((r: any) => r.token);
      
      const adminApp = getFirebaseAdmin();`;

const newPush = `    // Send FCM push notification to provider
    try {
      const fcmTokensRes = await pool.query('SELECT token FROM fcm_tokens WHERE provider_id = $1', [providerId]);
      const tokens = fcmTokensRes.rows.map((r: any) => r.token);
      
      console.log(\`Iniciando envio de push para provider \${providerId}, tokens encontrados: \${tokens.length}\`);
      const adminApp = getFirebaseAdmin();
      if (!adminApp) console.log("Firebase adminApp não inicializado!");
      `;

code = code.replace(oldPush, newPush);
fs.writeFileSync('server.ts', code);
