import fs from 'fs';

const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const oldCaptcha = `    // 3) Valida Captcha
    if (!captchaToken || captchaToken.length < 5) {
      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha).' });
    }`;

const newCaptcha = `    // 3) Valida Captcha
    if (!captchaToken) {
      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha ausente).' });
    }
    
    try {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      if (!recaptchaSecret) {
        console.warn('RECAPTCHA_SECRET_KEY is not defined in environment variables.');
      }
      
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: recaptchaSecret || '',
          response: captchaToken
        }).toString()
      });
      
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        console.error('Captcha validation failed:', verifyData);
        return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha inválido).' });
      }
    } catch (e) {
      console.error('Error verifying captcha:', e);
      return res.status(500).json({ error: 'Erro interno ao validar captcha.' });
    }`;

if (code.includes(oldCaptcha)) {
  code = code.replace(oldCaptcha, newCaptcha);
  fs.writeFileSync(file, code);
  console.log('Captcha logic updated');
} else {
  console.log('Old captcha logic not found');
}
