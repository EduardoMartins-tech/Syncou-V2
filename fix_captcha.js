import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldCheck = `    // 3) Valida Captcha
    if (!captchaToken) {
      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha ausente).' });
    }`;

const newCheck = `    // 3) Valida Captcha
    if (!captchaToken || typeof captchaToken !== 'string' || captchaToken.trim() === '' || captchaToken === 'undefined' || captchaToken === 'null') {
      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha ausente ou inválido).' });
    }`;

code = code.replace(oldCheck, newCheck);

fs.writeFileSync('server.ts', code);
