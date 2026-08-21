import fs from 'fs';
let code = fs.readFileSync('vite.config.ts', 'utf8');

const oldManifest = `        manifest: {
          name: 'Syncou - Agendamentos',
          short_name: 'Syncou',
          description: 'Gestão inteligente de agendamentos',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',`;

const newManifest = `        manifest: {
          name: 'Syncou - Agendamentos',
          short_name: 'Syncou',
          description: 'Gestão inteligente de agendamentos',
          theme_color: '#0f172a',
          background_color: '#020617',
          display: 'standalone',
          gcm_sender_id: '103953800507',`;

code = code.replace(oldManifest, newManifest);
fs.writeFileSync('vite.config.ts', code);
