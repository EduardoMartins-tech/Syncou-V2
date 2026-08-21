import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const registerTokenRoute = `// ====== API ROUTES ====== //

app.post('/api/user/fcm-token', authenticateToken, async (req: any, res: any) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });
    
    await pool.query(
      'INSERT INTO fcm_tokens (provider_id, token) VALUES ($1, $2) ON CONFLICT (token) DO UPDATE SET provider_id = EXCLUDED.provider_id',
      [req.user.id, token]
    );
    res.json({ success: true });
  } catch (e: any) {
    console.error('Error saving FCM token:', e);
    res.status(500).json({ error: 'Error saving token' });
  }
});
`;

code = code.replace(`// ====== API ROUTES ====== //`, registerTokenRoute);
fs.writeFileSync('server.ts', code);
