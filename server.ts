process.env.TZ = 'America/Sao_Paulo';

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp, cert } from 'firebase-admin/app';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import { RateLimiter } from './server/rateLimiter';

let transporter: nodemailer.Transporter | null = null;
async function setupEmail() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Using configured SMTP for emails.');
  } else {
    // Ethereal email for testing/sandbox
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Using Ethereal Email for testing (check console for preview URLs).');
  }
}
setupEmail().catch(console.error);

async function runExpirePendingAppointments() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL ERROR: DATABASE_URL is missing in production. Cannot run pending appointments expiration cron job!');
    }
    return { success: false, reason: 'Database not configured' };
  }
  console.log('Running pending appointments expiration cron job...');
  try {
    const result = await pool.query(
      `UPDATE appointments 
       SET status = 'Cancelado', cancel_reason = 'Expirado (mais de 24h pendente)'
       WHERE status = 'Pendente' 
       AND created_at < NOW() - INTERVAL '24 hours'`
    );
    return { success: true, expiredCount: result.rowCount || 0 };
  } catch (e: any) {
    console.error('Error expiring appointments:', e);
    return { success: false, error: e.message };
  }
}

async function runDailyReminders() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRITICAL ERROR: DATABASE_URL is missing in production. Cannot run daily reminder cron job!');
    }
    return { success: false, reason: 'Database not configured' };
  }
  console.log('Running daily reminder cron job...');
  try {
    if (!transporter) return { success: false, reason: 'Transporter not initialized' };

    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const startMs = tomorrowStart.getTime().toString();
    const endMs = tomorrowEnd.getTime().toString();

    const result = await pool.query(
      `SELECT a.*, u.display_name as provider_name 
       FROM appointments a 
       JOIN users u ON a.provider_id = u.id 
       WHERE a.start_at >= $1 AND a.start_at <= $2 
       AND a.status != 'cancelled' AND a.status != 'Cancelado'`,
      [startMs, endMs]
    );

    let sentCount = 0;
    for (const apt of result.rows) {
      if (apt.client_email) {
        const dateObj = new Date(Number(apt.start_at));
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });

        try {
          const info = await transporter.sendMail({
            from: '"Syncou" <noreply@syncou.app>',
            to: apt.client_email,
            subject: `Lembrete de Agendamento: ${apt.provider_name}`,
            text: `Olá ${apt.client_name},\n\nEste é um lembrete do seu agendamento com ${apt.provider_name} amanhã (${dateStr}) às ${timeStr}.\n\nTe aguardamos!`,
            html: `<p>Olá <b>${apt.client_name}</b>,</p><p>Este é um lembrete do seu agendamento com <b>${apt.provider_name}</b> amanhã (<b>${dateStr}</b>) às <b>${timeStr}</b>.</p><p>Te aguardamos!</p>`
          });
          sentCount++;
          console.log(`Reminder sent to ${apt.client_email} for appointment ${apt.id}`);
          const testMessageUrl = nodemailer.getTestMessageUrl(info);
          if (testMessageUrl) {
            console.log('Preview URL: %s', testMessageUrl);
          }
        } catch (err) {
          console.error(`Failed to send reminder to ${apt.client_email}: `, err);
        }
      }
    }
    return { success: true, sentCount };
  } catch (err: any) {
    console.error('Error in daily reminder cron job:', err);
    return { success: false, error: err.message };
  }
}

function setupCronJobs() {
  // Expire pending appointments older than 24h (every hour)
  cron.schedule('0 * * * *', () => { runExpirePendingAppointments(); });

  // Daily reminder at 08:00
  cron.schedule('0 8 * * *', () => { runDailyReminders(); });
}
setupCronJobs();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'syncou-super-secret-key-has-to-be-secure-1234';

app.use(helmet({
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
        "https://firebaseinstallations.googleapis.com",
        "https://*.firebase.com",
        "https://*.googleapis.com"
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://accounts.google.com", "https://*.firebaseapp.com", "https://www.google.com", "https://www.gstatic.com"],
      mediaSrc: ["'self'", "https://assets.mixkit.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Initialize Rate Limiters (Slide-window on active memory)
// 1. Global / General Rate Limiter (Protects the general site architecture and routes from flood)
const globalLimiter = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 180, // max 180 requests per minute
  message: 'Muitas requisições vindas deste IP. Por favor, tente novamente em 1 minuto.'
});
app.use('/api/', globalLimiter.middleware());

// 2. Strict Auth / Account rate limiting (Protects Login, Register and Google Auth paths)
const authLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 attempts
  message: 'Muitas tentativas de login ou cadastro. Por segurança, tente novamente em 5 minutos.'
});

// 3. Strict One-Time Password spam protection (Protects send-otp from abuse)
const otpLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 OTP requests per 5 minutes
  message: 'Limite de envio de código de segurança excedido. Tente novamente em 5 minutos.'
});

// 4. Booking spam protection (Protects public-facing schedule booking endpoint)
const bookingLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8, // max 8 bookings per 10 minutes from same IP to block spammers filling out vendor agendas
  message: 'Você atingiu o limite máximo de agendamentos temporários deste IP. Tente novamente mais tarde.'
});

// Apply global rate limiting to all requests
app.use(globalLimiter.middleware());

// Initialize PostgreSQL
const isDev = process.env.NODE_ENV !== 'production';


// Safely configure pg pool
const dbUrl = process.env.DATABASE_URL || '';
const poolConfig: any = {};

if (process.env.PGHOST && process.env.PGPASSWORD) {
  console.log("Usando variáveis separadas PGHOST, PGUSER, etc.");
  poolConfig.host = process.env.PGHOST;
  poolConfig.port = process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432;
  poolConfig.user = process.env.PGUSER;
  poolConfig.password = process.env.PGPASSWORD;
  poolConfig.database = process.env.PGDATABASE;
  
  if (!process.env.PGHOST.includes('railway.internal') && !process.env.PGHOST.includes('localhost') && !process.env.PGHOST.includes('127.0.0.1')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
} else if (dbUrl) {
  poolConfig.connectionString = dbUrl;
  if (!dbUrl.includes('localhost') && !dbUrl.includes('railway.internal')) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

const pool = new Pool(poolConfig);

// Basic sanity check
if (!dbUrl && !process.env.PGHOST) {
  console.warn("⚠️ AVISO CRÍTICO: Nenhuma variável de banco de dados configurada!");
} else if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
  console.log(`Configuração detectada. Tentando conectar... ${maskedUrl.includes('railway') ? '(Rede do Railway)' : ''}`);
}

async function runMigrations() {
  let client;
  try {
    console.log("Iniciando verificação do banco de dados (migrations)...");
    client = await pool.connect(); // Test connection explicitly
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        slug VARCHAR(255) UNIQUE,
        display_name VARCHAR(255),
        avatar_url TEXT,
        bio TEXT,
        working_hours_start VARCHAR(50),
        working_hours_end VARCHAR(50),
        working_days TEXT,
        whatsapp VARCHAR(50),
        schedule_overrides TEXT,
        google_access_token TEXT,
        whatsapp_message_template TEXT,
        role VARCHAR(50) DEFAULT 'provider',
        plan VARCHAR(50) DEFAULT 'free',
        auth_provider VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Add auth_provider if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='auth_provider') THEN 
          ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'email'; 
        END IF; 
      END $$;
      
      -- Alter table explicitly in case it already exists but without the new column
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_message_template TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS work_on_holidays BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';

      CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration INTEGER NOT NULL,
        buffer_time INTEGER DEFAULT 0,
        price REAL NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        google_event_id VARCHAR(255),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(255) PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_whatsapp VARCHAR(50),
        client_phone VARCHAR(50),
        client_email VARCHAR(255),
        services TEXT NOT NULL,
        total_price REAL,
        total_duration INTEGER,
        buffer_time INTEGER,
        booking_source VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Pendente',
        cancel_reason TEXT,
        start_at BIGINT NOT NULL,
        end_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        google_event_id VARCHAR(255),
        FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_services_provider ON services (provider_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_provider_dates ON appointments (provider_id, start_at, end_at);
    `);
    await client.query(`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id VARCHAR(255);
      
      -- Corrige registros antigos com status NULL para evitar falhas silenciosas na validação de overlap
      UPDATE appointments SET status = 'Pendente' WHERE status IS NULL;
      
      CREATE EXTENSION IF NOT EXISTS btree_gist;
      
      -- Remove and re-add constraint to ensure it's up to date
      ALTER TABLE appointments DROP CONSTRAINT IF EXISTS no_overlapping_appointments;
      ALTER TABLE appointments ADD CONSTRAINT no_overlapping_appointments EXCLUDE USING gist (
        provider_id WITH =,
        int8range(start_at, end_at) WITH &&
      ) WHERE (COALESCE(status, 'Pendente') IN ('Pendente', 'Confirmado', 'scheduled', 'confirmed', 'pendente', 'confirmado'));

      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id SERIAL PRIMARY KEY,
        provider_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Banco de dados sincronizado e tabelas verificadas com sucesso! (PostgreSQL)");
  } catch (err: any) {
    console.error("================ ERRO CRÍTICO NO BANCO DE DADOS ================");
    console.error("Falha ao rodar migrations. Isso geralmente significa que a DATABASE_URL");
    console.error("está incorreta ou o banco de dados não está acessível.");
    console.error("Erro original:", err.message);
    console.error("=================================================================");
  } finally {
    if (client) {
      client.release();
    }
  }
}
runMigrations();

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    console.warn(`[AUTH 401] ${req.method} ${req.path}: Token de autenticação ausente ou inválido no header (${authHeader})`);
    return res.status(401).json({ error: 'Token de autenticação ausente' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.warn(`[AUTH 403] ${req.method} ${req.path}: Falha na validação do JWT - ${err.name}: ${err.message}. Token recebido: ${token.substring(0, 20)}...`);
      return res.status(403).json({ error: `Acesso negado: ${err.message}`, code: err.name });
    }
    req.user = user;
    next();
  });
};

function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}


let firebaseAdminApp: any = null;

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
}

// Call on boot
initFirebaseAdmin();

function getFirebaseAdmin() {
  return firebaseAdminApp;
}

// ====== API ROUTES ====== //

const verifyCronSecret = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = (req.headers['x-cron-secret'] as string) || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null);

  if (cronSecret) {
    if (providedSecret !== cronSecret) {
      return res.status(401).json({ error: 'Não autorizado. Token de cron inválido ou ausente.' });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'CRON_SECRET não configurado no servidor.' });
  }
  next();
};

app.post('/api/cron/send-reminders', verifyCronSecret, async (req, res) => {
  const result = await runDailyReminders();
  if (!result.success) {
    return res.status(500).json(result);
  }
  res.json(result);
});

app.post('/api/cron/expire-pending', verifyCronSecret, async (req, res) => {
  const result = await runExpirePendingAppointments();
  if (!result.success) {
    return res.status(500).json(result);
  }
  res.json(result);
});

app.post('/api/user/fcm-token', authenticateToken, async (req: any, res: any) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    
    console.log(`[FCM-TOKEN] Salvando FCM token para o providerId: ${req.user.id}`);
    await pool.query(
      'INSERT INTO fcm_tokens (provider_id, token) VALUES ($1, $2) ON CONFLICT (token) DO UPDATE SET provider_id = EXCLUDED.provider_id',
      [req.user.id, token]
    );
    console.log(`[FCM-TOKEN] FCM token salvo com sucesso no PostgreSQL para providerId: ${req.user.id}`);
    res.json({ success: true });
  } catch (e: any) {
    console.error('[FCM-TOKEN] Erro ao salvar FCM token:', e);
    res.status(500).json({ error: 'Error saving token', details: e.message });
  }
});


app.post('/api/auth/send-otp', otpLimiter.middleware(), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail obrigatório.' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      `INSERT INTO otp_codes (email, code, expires_at) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [email, code, expiresAt]
    );

    if (transporter) {
      const info = await transporter.sendMail({
        from: '"Syncou" <noreply@syncou.app>',
        to: email,
        subject: 'Seu código de verificação Syncou',
        text: `Seu código de verificação é: ${code}. Ele expira em 10 minutos.`,
        html: `<b>Seu código de verificação é: ${code}</b><br>Ele expira em 10 minutos.`
      });
      console.log('Message sent: %s', info.messageId);
      const testMessageUrl = nodemailer.getTestMessageUrl(info);
      if (testMessageUrl) {
        console.log('Preview URL: %s', testMessageUrl);
      }
    }

    // Always log the code for testing purposes in the console
    console.log(`[TESTING] Email OTP for ${email}: ${code}`);

    res.json({ success: true, message: 'Código enviado com sucesso.' });
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Falha ao enviar o código de verificação.' });
  }
});

app.post('/api/auth/google', authLimiter.middleware(), async (req, res) => {
  try {
    const { email, displayName } = req.body;
    if (!email) return res.status(400).json({ error: 'Email não encontrado' });
    
    // Check if user exists
    const existing = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    let id;
    if (existing.rows.length > 0) {
      id = existing.rows[0].id;
    } else {
      id = generateId();
      const workingDays = JSON.stringify(['1','2','3','4','5']);
      const dpName = displayName || email.split('@')[0];
      const placeholderHash = await bcrypt.hash(generateId(), 10); // Random impossible password
      await pool.query(
        'INSERT INTO users (id, email, password_hash, display_name, role, working_days, working_hours_start, working_hours_end, auth_provider) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [id, email, placeholderHash, dpName, 'provider', workingDays, '09:00', '18:00', 'google']
      );
    }
    
    // Generate JWT
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email } });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', authLimiter.middleware(), async (req, res) => {
  try {
    const { email, password, code } = req.body;
    if (!email || !password || !code) return res.status(400).json({ error: 'Dados incompletos. Informe email, código e senha.' });

    const otpResult = await pool.query('SELECT code, expires_at FROM otp_codes WHERE email = $1', [email]);
    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'Código não encontrado ou e-mail inválido.' });
    }

    const otpRecord = otpResult.rows[0];
    if (otpRecord.code !== code) {
      return res.status(400).json({ error: 'Código de verificação incorreto.' });
    }
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'Código de verificação expirado.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = generateId();
    
    const workingDays = JSON.stringify(['1','2','3','4','5']);
    
    await pool.query(
      'INSERT INTO users (id, email, password_hash, display_name, role, working_days, working_hours_start, working_hours_end) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, email, hash, email.split('@')[0], 'provider', workingDays, '09:00', '18:00']
    );

    // Delete the used code
    await pool.query('DELETE FROM otp_codes WHERE email = $1', [email]);
    
    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email } });
  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique constraint violation
      return res.status(400).json({ error: 'Email já cadastrado.' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', authLimiter.middleware(), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT id, email, password_hash, auth_provider FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    
    if (user.auth_provider === 'google') {
      return res.status(400).json({ error: 'Esta conta foi criada com o Google. Por favor, faça login com o Google ou defina uma senha.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Senha incorreta.' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/me', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, slug, display_name as "displayName", avatar_url as "avatarUrl", bio, working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", work_on_holidays as "workOnHolidays", whatsapp, schedule_overrides as "scheduleOverrides", google_access_token as "googleAccessToken", whatsapp_message_template as "whatsappMessageTemplate", role, plan, auth_provider as "authProvider" FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.sendStatus(404);
    
    if (user.workingDays) {
      try { user.workingDays = JSON.parse(user.workingDays); } catch(e) {}
    }
    if (user.scheduleOverrides) {
      try { user.scheduleOverrides = JSON.parse(user.scheduleOverrides); } catch(e) {}
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription/upgrade', authenticateToken, async (req: any, res: any) => {
  try {
    const { plan } = req.body;
    if (plan !== 'gold') {
      return res.status(400).json({ error: 'Plano inválido.' });
    }
    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, req.user.id]);
    res.json({ success: true, plan });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription/downgrade', authenticateToken, async (req: any, res: any) => {
  try {
    await pool.query("UPDATE users SET plan = 'free' WHERE id = $1", [req.user.id]);
    res.json({ success: true, plan: 'free' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/google-token', authenticateToken, async (req: any, res: any) => {
  try {
    // Disable plan checks for now
    /*
    const userPlanRes = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    const plan = userPlanRes.rows[0]?.plan || 'free';
    if (plan !== 'gold') {
      return res.status(403).json({ error: 'A sincronização com o Google Calendar é um recurso exclusivo do Plano Ouro.' });
    }
    */
    const { token } = req.body;
    await pool.query(
      'UPDATE users SET google_access_token = $1 WHERE id = $2',
      [token, req.user.id]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/test-calendar', authenticateToken, async (req: any, res: any) => {
  try {
    // Disable plan checks for now
    /*
    const providerRes = await pool.query('SELECT google_access_token, plan FROM users WHERE id = $1', [req.user.id]);
    const plan = providerRes.rows[0]?.plan || 'free';
    if (plan !== 'gold') {
      return res.status(403).json({ error: 'A sincronização com o Google Calendar é um recurso exclusivo do Plano Ouro.' });
    }
    const googleAccessToken = providerRes.rows[0]?.google_access_token;
    */
    const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
    const googleAccessToken = providerRes.rows[0]?.google_access_token;
    
    if (!googleAccessToken) {
      return res.status(400).json({ error: 'Nenhum token do Google encontrado' });
    }
    
    const event = {
      summary: `Testando Syncou`,
      description: `Este é um evento de teste criado pelo Syncou para validar sua sincronização com o Google Calendar.`,
      start: {
        dateTime: new Date().toISOString(),
      },
      end: {
        dateTime: new Date(Date.now() + 30 * 60000).toISOString(),
      },
    };

    const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!gCalRes.ok) {
        const errText = await gCalRes.text();
        console.error('Failed to create GCal test event:', errText);
        return res.status(500).json({ error: 'Falha ao comunicar com o Google (seu acesso pode estar expirado ou revogado).' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test-db-info', async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 5");
    res.json(r.rows);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

app.post('/api/test-book-sync', authenticateToken, async (req: any, res: any) => {
  try {
    const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
    const googleAccessToken = providerRes.rows[0]?.google_access_token;
    
    if (!googleAccessToken) {
      return res.status(400).json({ error: 'Nenhum token do Google encontrado' });
    }
    
    const startAt = Date.now() + 86400000;
    const endAt = startAt + 1800000;
    
    const clientEmail: string = ""; // Represents empty optional email

    const event = {
        summary: `Agendamento: Eduardo`,
        description: `Cliente: Eduardo\nEmail: N/A\nWhatsApp: N/A\nServiços: Teste`,
        start: {
          dateTime: new Date(Number(startAt)).toISOString(),
        },
        end: {
          dateTime: new Date(Number(endAt)).toISOString(),
        },
        ...((clientEmail && clientEmail.includes('@')) ? { attendees: [{ email: clientEmail }] } : {})
    };

    const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!gCalRes.ok) {
        const errText = await gCalRes.text();
        console.error('Failed to create GCal test event:', errText);
        return res.status(500).json({ error: 'Falha do GCal', details: errText, payload_sent: event });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/change-password', authenticateToken, async (req: any, res: any) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'A nova senha é obrigatória.' });
    }
    
    const result = await pool.query('SELECT password_hash, auth_provider FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    
    // If the user signed up with Google and hasn't set a password yet, we allow setting it without current password
    if (user.auth_provider === 'google') {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash = $1, auth_provider = $2 WHERE id = $3', [hashedPassword, 'google_email', userId]);
      return res.json({ success: true, message: 'Senha criada com sucesso.' });
    }
    
    if (!currentPassword) {
      return res.status(400).json({ error: 'A senha atual é obrigatória.' });
    }

    if (user.password_hash) {
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Senha atual incorreta.' });
    } else {
      return res.status(400).json({ error: 'Usuário não possui senha configurada.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, userId]);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/me', authenticateToken, async (req: any, res: any) => {
  try {
    const data = req.body;
    const id = req.user.id;
    console.log("PUT /api/users/me req.body:", data);
    
    if (data.slug) {
      const existing = await pool.query('SELECT id FROM users WHERE slug = $1 AND id != $2', [data.slug, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Este link já está em uso.' });
      }
    }
    
    // Carefully handle workingDays (must stringify even if empty array)
    let workingDaysStr = null;
    if (data.workingDays !== undefined && data.workingDays !== null) {
       workingDaysStr = typeof data.workingDays === 'string' ? data.workingDays : JSON.stringify(data.workingDays);
    }
    
    // Convert scheduleOverrides to a string if it's an object
    let scheduleOverridesStr = null;
    if (data.scheduleOverrides !== undefined && data.scheduleOverrides !== null) {
       scheduleOverridesStr = typeof data.scheduleOverrides === 'string' ? data.scheduleOverrides : JSON.stringify(data.scheduleOverrides);
    }
    
    await pool.query(`
      UPDATE users SET 
        slug = COALESCE($1, slug),
        display_name = COALESCE($2, display_name),
        bio = COALESCE($3, bio),
        working_hours_start = COALESCE($4, working_hours_start),
        working_hours_end = COALESCE($5, working_hours_end),
        working_days = COALESCE($6, working_days),
        whatsapp = COALESCE($7, whatsapp),
        schedule_overrides = COALESCE($8, schedule_overrides),
        avatar_url = COALESCE($9, avatar_url),
        whatsapp_message_template = COALESCE($10, whatsapp_message_template),
        work_on_holidays = COALESCE($11, work_on_holidays)
      WHERE id = $12
    `, [
      data.slug ?? null, 
      data.displayName ?? null, 
      data.bio ?? null, 
      data.workingHoursStart ?? null, 
      data.workingHoursEnd ?? null, 
      workingDaysStr, 
      data.whatsapp ?? null, 
      scheduleOverridesStr,
      data.avatarUrl ?? null,
      data.whatsappMessageTemplate ?? null,
      data.workOnHolidays ?? null,
      id
    ]);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro interno no PUT /api/users/me:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/services', authenticateToken, async (req: any, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title as name, title, description, duration, buffer_time as "bufferTime", price, active FROM services WHERE provider_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows.map(r => ({...r, active: Boolean(r.active)})));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services', authenticateToken, async (req: any, res: any) => {
  try {
    // Disable plan checks for now
    /*
    const userPlanRes = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
    const plan = userPlanRes.rows[0]?.plan || 'free';
    if (plan !== 'gold') {
      const servicesRes = await pool.query('SELECT count(*) FROM services WHERE provider_id = $1', [req.user.id]);
      const servicesCount = parseInt(servicesRes.rows[0].count, 10);
      if (servicesCount >= 1) {
        return res.status(403).json({ error: 'Limite do plano gratuito atingido. O Plano Bronze (Gratuito) permite o cadastro de apenas 1 serviço ativo. Faça o upgrade para o Plano Ouro para ter serviços ilimitados!' });
      }
    }
    */
    const { title, description, duration, bufferTime, price, active } = req.body;
    const id = generateId();
    await pool.query(
      'INSERT INTO services (id, provider_id, title, description, duration, buffer_time, price, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, req.user.id, title, description, duration, bufferTime || 0, price || 0, active ? 1 : 0]
    );
    res.json({ id, name: title, title, description, duration, bufferTime, price, active });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/services/:id', authenticateToken, async (req: any, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments', authenticateToken, async (req: any, res) => {
   try {
     const result = await pool.query(
       'SELECT id, client_name as "clientName", client_whatsapp as "clientWhatsApp", client_phone as "clientPhone", client_email as "clientEmail", services, total_price as "totalPrice", total_duration as "totalDuration", booking_source as "bookingSource", status, cancel_reason as "cancelReason", start_at as "startAt", end_at as "endAt", created_at as "createdAt" FROM appointments WHERE provider_id = $1 ORDER BY start_at ASC',
       [req.user.id]
     );
     res.json(result.rows.map(r => ({
        ...r,
        startAt: Number(r.startAt),
        endAt: Number(r.endAt),
        services: JSON.parse(r.services || '[]')
     })));
   } catch (error: any) {
     res.status(500).json({ error: error.message });
   }
});

app.put('/api/appointments/:id', authenticateToken, async (req: any, res) => {
   try {
      const { status, cancelReason, startAt, endAt } = req.body;
      
      if (startAt && endAt) {
         // Validate working hours
         const providerUser = await pool.query('SELECT working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", work_on_holidays as "workOnHolidays", schedule_overrides as "scheduleOverrides" FROM users WHERE id = $1', [req.user.id]);
         if (providerUser.rows.length > 0) {
           const providerRow = providerUser.rows[0];
           
           try {
             if (providerRow.scheduleOverrides) {
               providerRow.scheduleOverrides = JSON.parse(providerRow.scheduleOverrides);
             }
           } catch(e) {}
       
           let workingStart = providerRow.workingHoursStart || "09:00";
           let workingEnd = providerRow.workingHoursEnd || "18:00";
           let isClosed = false;
       
           const startDateObj = new Date(Number(startAt));
           const pad = (n) => n.toString().padStart(2, '0');
           const dateKey = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
       
           // National holidays logic (Brazil)
           const holidays = [
             '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
           ];
           const monthDay = `${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
           
           if (holidays.includes(monthDay) && !providerRow.workOnHolidays) {
              isClosed = true;
           }

           if (providerRow.scheduleOverrides && providerRow.scheduleOverrides[dateKey]) {
             const override = providerRow.scheduleOverrides[dateKey];
             if (override.isClosed) {
               isClosed = true;
             } else {
               workingStart = override.start;
               workingEnd = override.end;
             }
           }
       
           if (isClosed) {
             return res.status(400).json({ error: 'Você não está disponível (fechado/folga) nesta data.' });
           }
       
           const [endHour, endMin] = workingEnd.split(':').map(Number);
           const endOfShift = new Date(Number(startAt));
           endOfShift.setHours(endHour, endMin, 0, 0);
       
           if (Number(endAt) > endOfShift.getTime()) {
             return res.status(400).json({ error: 'O agendamento excede seu horário de trabalho.' });
           }
         }

         // Check for overlapping appointments
         const overlapCheck = await pool.query(
           `SELECT id FROM appointments 
            WHERE provider_id = $1 
            AND id != $2
            AND COALESCE(status, 'Pendente') NOT IN ('cancelled', 'Cancelado')
            AND start_at < $3 
            AND end_at > $4`,
           [req.user.id, req.params.id, Number(endAt), Number(startAt)]
         );
     
         if (overlapCheck.rows.length > 0) {
           return res.status(400).json({ error: 'Conflito de agenda: Você já possui outro compromisso neste horário.' });
         }

         // Reschedule scenario
         await pool.query(
           'UPDATE appointments SET status = COALESCE($1, status), cancel_reason = COALESCE($2, cancel_reason), start_at = $3, end_at = $4 WHERE id = $5 AND provider_id = $6',
           [status || null, cancelReason ?? null, startAt, endAt, req.params.id, req.user.id]
         );
         
         // Update in Google Calendar if rescheduled
         try {
             const aptRes = await pool.query('SELECT google_event_id, client_name, client_email, client_whatsapp, services FROM appointments WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
             const googleEventId = aptRes.rows[0]?.google_event_id;
             if (googleEventId) {
                const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
                const googleAccessToken = providerRes.rows[0]?.google_access_token;
                if (googleAccessToken) {
                   const patchEvent = {
                      start: { dateTime: new Date(Number(startAt)).toISOString() },
                      end: { dateTime: new Date(Number(endAt)).toISOString() }
                   };
                   
                   const gCalRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
                      method: 'PATCH',
                      headers: {
                         'Authorization': `Bearer ${googleAccessToken}`,
                         'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(patchEvent)
                   });
                   if (!gCalRes.ok) {
                      console.error('Failed to update GCal event:', await gCalRes.text());
                   } else {
                      console.log('GCal event updated successfully.');
                   }
                }
             }
         } catch (e) {
             console.error("Error updating GCal:", e);
         }
      } else {
         await pool.query(
           'UPDATE appointments SET status = $1, cancel_reason = COALESCE($2, cancel_reason) WHERE id = $3 AND provider_id = $4',
           [status, cancelReason ?? null, req.params.id, req.user.id]
         );
         
         // Delete from Google Calendar if cancelled
         if (status === 'cancelled' || status === 'Cancelado') {
             try {
                const aptRes = await pool.query('SELECT google_event_id FROM appointments WHERE id = $1 AND provider_id = $2', [req.params.id, req.user.id]);
                const googleEventId = aptRes.rows[0]?.google_event_id;
                if (googleEventId) {
                   const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
                   const googleAccessToken = providerRes.rows[0]?.google_access_token;
                   if (googleAccessToken) {
                      const gCalRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
                         method: 'DELETE',
                         headers: {
                            'Authorization': `Bearer ${googleAccessToken}`
                         }
                      });
                      if (!gCalRes.ok) {
                         console.error('Failed to delete GCal event:', await gCalRes.text());
                      } else {
                         console.log('GCal event deleted successfully.');
                         await pool.query('UPDATE appointments SET google_event_id = NULL WHERE id = $1', [req.params.id]);
                      }
                   }
                }
             } catch (e) {
                console.error("Error deleting from GCal:", e);
             }
         }
      }
      res.json({ success: true });
   } catch (err: any) {
      res.status(500).json({ error: err.message });
   }
});
app.post('/api/appointments/sync-all', authenticateToken, async (req: any, res: any) => {
   try {
      const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [req.user.id]);
      const googleAccessToken = providerRes.rows[0]?.google_access_token;
      
      if (!googleAccessToken) {
         return res.status(400).json({ error: 'Nenhum token do Google encontrado. Conecte sua conta primeiro.' });
      }

      const result = await pool.query(
        'SELECT * FROM appointments WHERE provider_id = $1 AND (status IS NULL OR status = $2 OR status = $3 OR status = $4) AND google_event_id IS NULL',
        [req.user.id, 'scheduled', 'Pendente', 'Confirmado']
      );

      let syncedCount = 0;
      let errorCount = 0;
      let lastError = null;

      for (const apt of result.rows) {
        try {
          const services = JSON.parse(apt.services || '[]');
          const event = {
            summary: `Agendamento: ${apt.client_name}`,
            description: `Cliente: ${apt.client_name}\nEmail: ${apt.client_email || 'N/A'}\nWhatsApp: ${apt.client_whatsapp || 'N/A'}\nServiços: ${(services || []).map((s: any) => s.name || s.title).join(', ')}`,
            start: { dateTime: new Date(Number(apt.start_at)).toISOString() },
            end: { dateTime: new Date(Number(apt.end_at)).toISOString() },
            ...((apt.client_email && apt.client_email.includes('@')) ? { attendees: [{ email: apt.client_email }] } : {})
          };

          const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
          });

          if (!gCalRes.ok) {
            const errText = await gCalRes.text();
            console.error('Failed to create GCal event for apt', apt.id, errText);
            errorCount++;
            if (errorCount === 1) {
              lastError = errText;
            }
          } else {
            const gCalData = await gCalRes.json();
            if (gCalData.id) {
               await pool.query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [gCalData.id, apt.id]);
            }
            syncedCount++;
          }
        } catch (e: any) {
          errorCount++;
          if (errorCount === 1) {
            lastError = e.message;
          }
        }
      }

      res.json({ success: true, synced: syncedCount, errors: errorCount, lastError });
   } catch (err: any) {
      res.status(500).json({ error: err.message });
   }
});
// Public Provider Data
app.get('/api/provider/:slug', async (req, res) => {
  try {
    const resultUser = await pool.query(
      'SELECT id, slug, display_name as "displayName", avatar_url as "avatarUrl", bio, working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", work_on_holidays as "workOnHolidays", whatsapp, schedule_overrides as "scheduleOverrides" FROM users WHERE slug = $1',
      [req.params.slug]
    );
    const user = resultUser.rows[0];
    if (!user) return res.status(404).json({ error: 'Provider not found' });
    
    if (user.workingDays) {
      try { user.workingDays = JSON.parse(user.workingDays); } catch(e) {}
    }
    if (user.scheduleOverrides) {
      try { user.scheduleOverrides = JSON.parse(user.scheduleOverrides); } catch(e) {}
    }
    
    const resultServices = await pool.query(
      'SELECT id, title as name, title, description, duration, buffer_time as "bufferTime", price, active FROM services WHERE provider_id = $1 AND active = 1 ORDER BY created_at DESC',
      [user.id]
    );
    const services = resultServices.rows.map(r => ({...r, active: Boolean(r.active)}));
    
    res.json({ user, services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/provider/:slug/appointments', async (req, res) => {
   try {
     const resultUser = await pool.query('SELECT id FROM users WHERE slug = $1', [req.params.slug]);
     const user = resultUser.rows[0];
     if (!user) return res.json([]);
     
     const { startAt, endAt } = req.query;
     if (!startAt || !endAt) return res.json([]);

     const resultApts = await pool.query(
       'SELECT start_at as "startAt", end_at as "endAt", status FROM appointments WHERE provider_id = $1 AND start_at >= $2 AND start_at <= $3 AND COALESCE(status, \'Pendente\') NOT IN ($4, $5)',
       [user.id, Number(startAt), Number(endAt), 'cancelled', 'Cancelado']
     );
     
     res.json(resultApts.rows.map(r => ({ ...r, startAt: Number(r.startAt), endAt: Number(r.endAt) })));
   } catch (error: any) {
     res.status(500).json({ error: error.message });
   }
});

app.post('/api/provider/:slug/book', bookingLimiter.middleware(), async (req, res) => {
  try {
    const { providerId, clientName, clientWhatsApp, clientPhone, clientEmail, services, totalPrice, totalDuration, bufferTime, bookingSource, status, startAt, endAt, captchaToken } = req.body;

    // 3) Valida Captcha
    if (!captchaToken || typeof captchaToken !== 'string' || captchaToken.trim() === '' || captchaToken === 'undefined' || captchaToken === 'null') {
      return res.status(400).json({ error: 'Falha na verificação de segurança (Captcha ausente ou inválido).' });
    }
    
    try {
      const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
      if (!recaptchaSecret) {
        console.error('CRITICAL ERROR: RECAPTCHA_SECRET_KEY is not defined. Blocking appointment creation.');
        return res.status(500).json({ error: 'Erro de configuração do servidor (Captcha ausente).' });
      }
      
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: recaptchaSecret,
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
      return res.status(500).json({ error: 'Erro de conectividade ao validar captcha. Tente novamente mais tarde.' });
    }

    // 2) Valida se o telefone já tem 2+ agendamentos pendentes
    const pendingByPhone = await pool.query(
      `SELECT count(*) FROM appointments WHERE provider_id = $1 AND client_phone = $2 AND COALESCE(status, 'Pendente') = 'Pendente'`,
      [providerId, clientPhone]
    );
    if (parseInt(pendingByPhone.rows[0].count) >= 2) {
       return res.status(400).json({ error: 'Você já possui o limite máximo de agendamentos pendentes para este número.' });
    }

    
    // Validate working hours
    const providerUser = await pool.query('SELECT working_hours_start as "workingHoursStart", working_hours_end as "workingHoursEnd", working_days as "workingDays", work_on_holidays as "workOnHolidays", schedule_overrides as "scheduleOverrides", google_access_token as "googleAccessToken", plan FROM users WHERE id = $1', [providerId]);
    if (providerUser.rows.length === 0) {
      return res.status(404).json({ error: 'Provedor não encontrado' });
    }
    const providerRow = providerUser.rows[0];

    // Disable plan checks for now
    /*
    const plan = providerRow.plan || 'free';
    if (plan !== 'gold') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const startOfMonthMs = startOfMonth.getTime();
      const countRes = await pool.query(
        'SELECT count(*) FROM appointments WHERE provider_id = $1 AND start_at >= $2',
        [providerId, startOfMonthMs]
      );
      const bookingCount = parseInt(countRes.rows[0].count, 10);
      if (bookingCount >= 15) {
        return res.status(403).json({ error: 'O limite mensal de agendamentos deste profissional foi atingido (limite de 15 agendamentos no Plano Gratuito). Se você é o profissional, faça o upgrade para o Plano Ouro para liberar agendamentos ilimitados!' });
      }
    }
    */

    try {
      if (providerRow.scheduleOverrides) {
        providerRow.scheduleOverrides = JSON.parse(providerRow.scheduleOverrides);
      }
    } catch(e) {}

    let workingStart = providerRow.workingHoursStart || "09:00";
    let workingEnd = providerRow.workingHoursEnd || "18:00";
    let isClosed = false;

    const startDateObj = new Date(Number(startAt));
    const pad = (n: number) => n.toString().padStart(2, '0');
    // Using local date values of the server representation of startAt
    const dateKey = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;

    // National holidays logic (Brazil)
    const holidays = [
      '01-01', // Confraternização Universal
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalhador
      '09-07', // Independência do Brasil
      '10-12', // Nossa Sra. Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25'  // Natal
    ];
    const monthDay = `${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
    
    if (holidays.includes(monthDay) && !providerRow.workOnHolidays) {
       isClosed = true;
    }

    if (providerRow.scheduleOverrides && providerRow.scheduleOverrides[dateKey]) {
      const override = providerRow.scheduleOverrides[dateKey];
      if (override.isClosed) {
        isClosed = true;
      } else {
        workingStart = override.start;
        workingEnd = override.end;
      }
    }

    if (isClosed) {
      return res.status(400).json({ error: 'O provedor não está disponível nesta data.' });
    }

    const [endHour, endMin] = workingEnd.split(':').map(Number);
    const endOfShift = new Date(Number(startAt));
    endOfShift.setHours(endHour, endMin, 0, 0);

    if (Number(endAt) > endOfShift.getTime()) {
      return res.status(400).json({ error: 'A duração dos serviços excede o horário de trabalho do provedor.' });
    }

    // Check for overlapping appointments
    const overlapCheck = await pool.query(
      `SELECT id FROM appointments 
       WHERE provider_id = $1 
       AND COALESCE(status, 'Pendente') NOT IN ('cancelled', 'Cancelado')
       AND start_at < $2 
       AND end_at > $3`,
      [providerId, Number(endAt), Number(startAt)]
    );

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Conflito de agenda: Já existe um agendamento para este horário.' });
    }

    const id = generateId();
    
    try {
      await pool.query(
        'INSERT INTO appointments (id, provider_id, client_name, client_whatsapp, client_phone, client_email, services, total_price, total_duration, buffer_time, booking_source, status, start_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [id, providerId, clientName, clientWhatsApp, clientPhone, clientEmail, JSON.stringify(services || []), totalPrice, totalDuration, bufferTime || 0, bookingSource, status || 'Pendente', startAt, endAt]
      );
    } catch (insertError: any) {
      if (insertError.code === '23P01') {
        return res.status(409).json({ error: 'Este horário acabou de ser reservado, escolha outro horário disponível' });
      }
      throw insertError;
    }

    // Sync to Google Calendar if provider has connected it
    try {
      const providerRes = await pool.query('SELECT google_access_token FROM users WHERE id = $1', [providerId]);
      const googleAccessToken = providerRes.rows[0]?.google_access_token;
      if (googleAccessToken) {
        const event = {
          summary: `Agendamento: ${clientName}`,
          description: `Cliente: ${clientName}\nEmail: ${clientEmail || 'N/A'}\nWhatsApp: ${clientWhatsApp || 'N/A'}\nServiços: ${(services || []).map((s: any) => s.name).join(', ')}`,
          start: {
            dateTime: new Date(Number(startAt)).toISOString(),
          },
          end: {
            dateTime: new Date(Number(endAt)).toISOString(),
          },
          ...((clientEmail && clientEmail.includes('@')) ? { attendees: [{ email: clientEmail }] } : {})
        };

        const gCalRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!gCalRes.ok) {
           console.error('Failed to create GCal event:', await gCalRes.text());
        } else {
           const gCalData = await gCalRes.json();
           if (gCalData.id) {
              await pool.query('UPDATE appointments SET google_event_id = $1 WHERE id = $2', [gCalData.id, id]);
           }
           console.log('GCal event created successfully.');
        }
      }
    } catch (gcalErr) {
       console.error("Error creating Google Calendar event:", gcalErr);
    }
      
    // Send FCM push notification to provider
    try {
      const fcmTokensRes = await pool.query('SELECT token FROM fcm_tokens WHERE provider_id = $1', [providerId]);
      const tokens = fcmTokensRes.rows.map((r: any) => r.token);
      
      console.log(`Iniciando envio de push para provider ${providerId}, tokens encontrados: ${tokens.length}`);
      const adminApp = getFirebaseAdmin();
      if (!adminApp) console.log("Firebase adminApp não inicializado!");
      
      if (adminApp && tokens.length > 0) {
        const message = {
          data: {
            title: 'Novo agendamento recebido!',
            body: `${clientName} agendou para ${new Date(Number(startAt)).toLocaleString('pt-BR')}`
          },
          tokens: tokens,
        };
        const pushRes = await getMessaging(adminApp).sendEachForMulticast(message);
        console.log('FCM push response:', JSON.stringify(pushRes, null, 2));
        if (pushRes.failureCount > 0) {
           pushRes.responses.forEach((resp, idx) => {
              if (!resp.success) {
                 console.error(`Failed to send to token ${tokens[idx]}: `, resp.error);
              }
           });
        }
      }
    } catch (pushErr) {
       console.error("Error sending FCM push:", pushErr);
    }
    
    res.json({ success: true, appointmentId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== VITE INTEGRATION ====== //
async function startServer() {
console.log("startServer called");
  if (process.env.NODE_ENV !== "production") {
    console.log("Calling createViteServer");
const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("createViteServer done");
app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  console.log("Calling app.listen");
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
