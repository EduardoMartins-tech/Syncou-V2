import fs from 'fs';

const file = 'server.ts';
let code = fs.readFileSync(file, 'utf8');

const bookEndpointStart = "app.post('/api/provider/:slug/book', bookingLimiter.middleware(), async (req, res) => {\n  try {\n    const { providerId, clientName, clientWhatsApp, clientPhone, clientEmail, services, totalPrice, totalDuration, bufferTime, bookingSource, status, startAt, endAt } = req.body;";

const newBookEndpointStart = "app.post('/api/provider/:slug/book', bookingLimiter.middleware(), async (req, res) => {\n  try {\n    const { providerId, clientName, clientWhatsApp, clientPhone, clientEmail, services, totalPrice, totalDuration, bufferTime, bookingSource, status, startAt, endAt, captchaToken } = req.body;\n\n    // 3) Valida Captcha\n    if (!captchaToken || captchaToken.length < 5) {\n      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha).' });\n    }\n\n    // 2) Valida se o telefone já tem 2+ agendamentos pendentes\n    const pendingByPhone = await pool.query(\n      `SELECT count(*) FROM appointments WHERE provider_id = $1 AND client_phone = $2 AND status = 'Pendente'`,\n      [providerId, clientPhone]\n    );\n    if (parseInt(pendingByPhone.rows[0].count) >= 2) {\n       return res.status(400).json({ error: 'Você já possui o limite máximo de agendamentos pendentes para este número.' });\n    }\n";

if (code.includes(bookEndpointStart)) {
  code = code.replace(bookEndpointStart, newBookEndpointStart);
  fs.writeFileSync(file, code);
  console.log('Book endpoint updated successfully.');
} else {
  console.log('Book endpoint not found!');
}
