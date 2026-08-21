const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldHelmet = `app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://www.gstatic.com", "https://www.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com", "https://wa.me", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://www.googleapis.com", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://accounts.google.com", "https://*.firebaseapp.com", "https://www.google.com", "https://www.gstatic.com"],
      mediaSrc: ["'self'", "https://assets.mixkit.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));`;

const newHelmet = `app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://www.gstatic.com", "https://www.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'", 
        "https://api.stripe.com", 
        "https://maps.googleapis.com", 
        "https://wa.me", 
        "https://identitytoolkit.googleapis.com", 
        "https://securetoken.googleapis.com", 
        "https://www.googleapis.com", 
        "https://www.google.com", 
        "https://www.gstatic.com",
        "https://fcmregistrations.googleapis.com",
        "https://fcm.googleapis.com",
        "https://*.firebase.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://accounts.google.com", "https://*.firebaseapp.com", "https://www.google.com", "https://www.gstatic.com"],
      mediaSrc: ["'self'", "https://assets.mixkit.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));`;

code = code.replace(oldHelmet, newHelmet);
fs.writeFileSync('server.ts', code);
