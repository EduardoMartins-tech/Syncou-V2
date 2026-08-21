import fs from 'fs';
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const importMessaging = `import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';`;

code = code.replace(`import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';`, importMessaging);

const exportMessaging = `
export const messaging = async () => {
  const supported = await isSupported();
  if (supported) {
    return getMessaging(app);
  }
  return null;
};
`;

code += exportMessaging;
fs.writeFileSync('src/lib/firebase.ts', code);
