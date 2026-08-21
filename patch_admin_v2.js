import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

// Replace import
code = code.replace("import admin from 'firebase-admin';", "import { getMessaging } from 'firebase-admin/messaging';\nimport { initializeApp, cert } from 'firebase-admin/app';");

// Replace init
const oldInit = `let firebaseAdminApp: admin.app.App | null = null;

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
}`;

const newInit = `let firebaseAdminApp: any = null;

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
    
    firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("✅ Firebase Admin inicializado com sucesso para o projeto:", serviceAccount.project_id);
    return firebaseAdminApp;
  } catch (e: any) {
    console.error('❌ ERRO CRÍTICO ao inicializar Firebase Admin:', e.message);
    return null;
  }
}`;

code = code.replace(oldInit, newInit);

// Replace the call
const oldCall = `const pushRes = await adminApp.messaging().sendEachForMulticast(message);`;
const newCall = `const pushRes = await getMessaging(adminApp).sendEachForMulticast(message);`;
code = code.replace(oldCall, newCall);

fs.writeFileSync('server.ts', code);
