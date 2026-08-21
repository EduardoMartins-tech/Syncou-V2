import fs from 'fs';
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const oldGuard = "    if (!process.env.DATABASE_URL && !process.env.PGHOST) return;";
const newGuardExpiration = `    if (!process.env.DATABASE_URL && !process.env.PGHOST) {
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL ERROR: DATABASE_URL is missing in production. Cannot run pending appointments expiration cron job!');
      }
      return;
    }`;
const newGuardReminder = `    if (!process.env.DATABASE_URL && !process.env.PGHOST) {
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL ERROR: DATABASE_URL is missing in production. Cannot run daily reminder cron job!');
      }
      return;
    }`;

// Replace the first occurrence (Expiration)
code = code.replace(oldGuard, newGuardExpiration);
// Replace the second occurrence (Reminder)
code = code.replace(oldGuard, newGuardReminder);

fs.writeFileSync(file, code);
