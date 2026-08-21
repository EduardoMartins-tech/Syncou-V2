import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldAdmin = `let firebaseAdminApp: admin.app.App | null = null;
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
}`;

const newAdmin = `let firebaseAdminApp: admin.app.App | null = null;

// Initialize and validate Firebase Admin on boot
function initFirebaseAdmin() {
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  
  if (!serviceAccountBase64) {
    console.warn("⚠️ AVISO: A variável de ambiente FIREBASE_SERVICE_ACCOUNT_BASE64 não está configurada. O envio de notificações push não funcionará.");
    return null;
  }
  
  try {
    const decoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    if (!decoded || !decoded.includes('project_id')) {
      throw new Error("A base64 decodificada não parece ser um JSON válido de service account.");
    }
    const serviceAccount = JSON.parse(decoded);
    
    // Fallback import check in case admin.credential is undefined
    const cert = admin.credential ? admin.credential.cert(serviceAccount) : require('firebase-admin').credential.cert(serviceAccount);
    
    firebaseAdminApp = admin.initializeApp({
      credential: cert
    });
    console.log("✅ Firebase Admin inicializado com sucesso para o projeto:", serviceAccount.project_id);
    return firebaseAdminApp;
  } catch (e: any) {
    console.error('❌ ERRO CRÍTICO ao inicializar Firebase Admin:', e.message);
    return null;
  }
}

// Call on boot
initFirebaseAdmin();

function getFirebaseAdmin() {
  return firebaseAdminApp;
}`;

code = code.replace(oldAdmin, newAdmin);
fs.writeFileSync('server.ts', code);
