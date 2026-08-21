import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const importAdmin = `import jwt from 'jsonwebtoken';\nimport admin from 'firebase-admin';`;
code = code.replace(`import jwt from 'jsonwebtoken';`, importAdmin);

const fcmTable = `      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;
code = code.replace(`      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );`, fcmTable);

const firebaseAdminInit = `
let firebaseAdminApp: admin.app.App | null = null;
function getFirebaseAdmin() {
  if (firebaseAdminApp) return firebaseAdminApp;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) return null;
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
    firebaseAdminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return firebaseAdminApp;
  } catch (e) {
    console.error('Failed to init Firebase Admin:', e);
    return null;
  }
}
`;
code = code.replace(`// ====== API ROUTES ====== //`, firebaseAdminInit + `\n// ====== API ROUTES ====== //`);

fs.writeFileSync('server.ts', code);
