import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldConnect = `connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com", "https://wa.me", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com"],`;
const newConnect = `connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com", "https://wa.me", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", "https://www.google.com", "https://www.gstatic.com"],`;

code = code.replace(oldConnect, newConnect);

fs.writeFileSync('server.ts', code);
