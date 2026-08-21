import fs from 'fs';

const file = 'src/pages/ProviderPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldPayload = `      const bookingPayload = {
         providerId: provider.id,
         clientName,
         clientWhatsApp,
         clientPhone: clientWhatsApp.replace(/\\D/g, ''),
         clientEmail,
         services: Array.from(selectedServices),
         totalPrice,
         totalDuration,
         bufferTime: totalBufferTime,
         bookingSource: 'public_link',
         status: 'Pendente',
         startAt,
         endAt
      };`;

const newPayload = `      // Simula a verificação de captcha (na prática, integraria o reCAPTCHA V3 aqui)
      const captchaToken = 'token_valido_gerado_no_client_' + Date.now();
      
      const bookingPayload = {
         providerId: provider.id,
         clientName,
         clientWhatsApp,
         clientPhone: clientWhatsApp.replace(/\\D/g, ''),
         clientEmail,
         services: Array.from(selectedServices),
         totalPrice,
         totalDuration,
         bufferTime: totalBufferTime,
         bookingSource: 'public_link',
         status: 'Pendente',
         startAt,
         endAt,
         captchaToken
      };`;

if (code.includes(oldPayload)) {
  code = code.replace(oldPayload, newPayload);
  fs.writeFileSync(file, code);
  console.log('ProviderPage updated successfully.');
} else {
  console.log('ProviderPage payload not found!');
}
