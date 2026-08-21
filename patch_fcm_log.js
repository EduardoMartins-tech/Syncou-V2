import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldMessage = `        await adminApp.messaging().sendEachForMulticast(message);
        console.log('FCM push sent to provider.');
      }`;

const newMessage = `        const pushRes = await adminApp.messaging().sendEachForMulticast(message);
        console.log('FCM push response:', JSON.stringify(pushRes, null, 2));
        if (pushRes.failureCount > 0) {
           pushRes.responses.forEach((resp, idx) => {
              if (!resp.success) {
                 console.error(\`Failed to send to token \${tokens[idx]}: \`, resp.error);
              }
           });
        }
      }`;

code = code.replace(oldMessage, newMessage);
fs.writeFileSync('server.ts', code);
