import fs from 'fs';

const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const dailyCronStr = "  cron.schedule('0 8 * * *', async () => {\n    console.log('Running daily reminder cron job...');";
const expireCronStr = `
  // Expire pending appointments older than 24h
  cron.schedule('0 * * * *', async () => {
    console.log('Running pending appointments expiration cron job...');
    try {
      await pool.query(
        \`UPDATE appointments 
         SET status = 'Cancelado', cancel_reason = 'Expirado (mais de 24h pendente)'
         WHERE status = 'Pendente' 
         AND created_at < NOW() - INTERVAL '24 hours'\`
      );
    } catch (e) {
      console.error('Error expiring appointments:', e);
    }
  });

  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily reminder cron job...');`;

if (code.includes(dailyCronStr)) {
  code = code.replace(dailyCronStr, expireCronStr);
  fs.writeFileSync(file, code);
  console.log('Cron job added successfully.');
} else {
  console.log('Daily cron not found!');
}
