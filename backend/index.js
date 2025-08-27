// backend/index.js

require('dotenv').config({
  path: require('path').resolve(__dirname, '.env')
});

const express  = require('express');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const pool     = require('./db');
const path     = require('path');
const fs       = require('fs');
const multer   = require('multer');
const ExcelJS   = require('exceljs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const QRCode    = require('qrcode');

const app  = express();
const port = process.env.PORT || 4000;

// ─── SMTP / Mail Konfiguration aus .env lesen ────────────────────────────
// Immer SMTP, keine Gmail-Option mehr
const SMTP_FROM   = process.env.SMTP_FROM || 'TempSys <noreply@tempsys.de>';
const SMTP_HOST   = process.env.SMTP_HOST || 'mxe9b3.netcup.net';
const SMTP_PORT   = Number(process.env.SMTP_PORT || '465'); // 465 = SSL
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'true') === 'true';
const SMTP_USER   = process.env.SMTP_USER || 'noreply@tempsys.de';
const SMTP_PASS   = process.env.SMTP_PASS || '';

// ─── Device stamp config ───────────────────────────────────────────────────────
const DEVICE_ROUND_MIN    = Number(process.env.DEVICE_ROUND_MIN    || '15'); // Minuten runden
const DEVICE_COOLDOWN_MIN = Number(process.env.DEVICE_COOLDOWN_MIN || '15'); // Minuten Cooldown

app.use(cors());
app.use(express.json());

const bcrypt = require('bcrypt');
const { query, withTransaction, notify } = require('./utils/db');
const { hashPw, randomToken64 } = require('./utils/security');
const { loadVacationPolicy, upsertVacationPolicy, daysInclusive, getEffectiveAllowance, getBalance, setBalance, ensureBalance } = require('./utils/vacation');
const { TOTP_DIGITS, TOTP_PERIOD, totpCheck, randomSecretBase32 } = require('./utils/totp');
const { startMonitoring } = require('./services/monitoring');

// BACKEND — SUPPORT: Validierungs‑Konstanten
const SUPPORT_CATEGORIES = new Set(['question', 'incident', 'billing', 'feature']);
const SUPPORT_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const SUPPORT_STATUSES   = new Set(['open', 'in_progress', 'closed']);

const updateRoutes = require('./routes/updates');          // für /api/clocks/:id/update + heartbeat
const channelRoutes = require('./routes/updateChannels');  // für Channel-Setzen (einzeln & bulk)
const clocksRoutes = require('./routes/clocks');           // für globale Clock-Liste (admin)

function isEmail(x) {
  return typeof x === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

app.use(updateRoutes);
app.use(channelRoutes);
app.use(clocksRoutes);

// ───────────────────────────────────────────────────────────────────────────────
// Upload-Verzeichnis + statische Auslieferung (optional, falls Proxy /uploads → Backend)
// ───────────────────────────────────────────────────────────────────────────────
const uploadRoot = path.resolve(process.cwd(), 'uploads', 'sick-notes');
fs.mkdirSync(uploadRoot, { recursive: true });
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// ───────────────────────────────────────────────────────────────────────────────
// Multer (File Uploads)
// ───────────────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// TOTP Enrollment (nur während Einrichtung nötig; wird nach Verify geleert)
const totpSetupStore = new Map(); // userId -> { base32, otpauthUrl, createdAt }

startMonitoring();

// === Telegram Helper global verfügbar machen (EINMALIG) ===
// Voraussetzung: sendTelegram(text) existiert bereits (aus deinem Health-Notifier).
if (typeof global.tgNotify !== 'function') {
  global.tgNotify = async (text) => {
    try {
      if (!text) return;
      await sendTelegram(text);
    } catch (e) {
      console.warn('[TG] notify failed:', e?.message || e);
    }
  };
}


function issueSessionJwt(u) {
  return jwt.sign(
    { userId: u.userId, companyId: u.companyid || u.companyId, username: u.username, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}
function issueTempJwt(u) {
  return jwt.sign(
    { sub: u.userId, u: { role: u.role, companyId: u.companyid || u.companyId, username: u.username } },
    process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}


// ───────────────────────────────────────────────────────────────────────────────
// SSE (Server-Sent Events) – Schedule und Times
// ───────────────────────────────────────────────────────────────────────────────
const scheduleClients = new Map(); // companyId -> Set(res)
function addScheduleClient(companyId, res){
  let s = scheduleClients.get(companyId) || new Set();
  s.add(res);
  scheduleClients.set(companyId, s);
}
function removeScheduleClient(companyId, res){
  const s = scheduleClients.get(companyId);
  if (!s) return;
  s.delete(res);
  if (!s.size) scheduleClients.delete(companyId);
}
function emitSchedule(companyId, payload){
  const s = scheduleClients.get(String(companyId));
  if (!s) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const r of s) { try { r.write(line); } catch {} }
}

const timesClients = new Map(); // userId -> Set(res)
function addTimesClient(userId, res){
  let s = timesClients.get(userId) || new Set();
  s.add(res);
  timesClients.set(userId, s);
}
function removeTimesClient(userId, res){
  const s = timesClients.get(userId);
  if (!s) return;
  s.delete(res);
  if (!s.size) timesClients.delete(userId);
}
function emitTimes(userId, payload){
  const s = timesClients.get(String(userId));
  if (!s) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const r of s) { try { r.write(line); } catch {} }
}

// JWT aus Header **oder** Query (?token=…) akzeptieren (für <a href> Downloads)
function authenticateHeaderOrQuery(req, res, next){
  let token = (req.headers.authorization || '').replace(/^Bearer\s/i,'');
  if (!token && req.query && req.query.token) token = String(req.query.token);
  if (!token) return res.status(401).json({ message:'Token fehlt' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded)=>{
    if (err) return res.status(401).json({ message:'Ungültiger Token' });
    req.user = decoded;
    next();
  });
}

// Helper Rundungsintervall
function roundToMinuteString(d = new Date(), step = DEVICE_ROUND_MIN) {
  const dt = new Date(d);
  dt.setSeconds(0, 0);
  const m = dt.getMinutes();
  const rest = m % step;
  const delta = rest < step/2 ? -rest : (step - rest);
  dt.setMinutes(m + delta);
  // 'HH:MM'
  return dt.toTimeString().slice(0,5);
}

// === LOGIN STEP-FLOW HELPERS ===
function issueSessionJwt(payloadUser) {
  return jwt.sign(
    {
      userId: payloadUser.userId,
      companyId: payloadUser.companyid || payloadUser.companyId,
      username: payloadUser.username,
      role: payloadUser.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function issueTempJwt(payloadUser) {
  // Kurzlebiger Token NUR für 2FA/Email-OTP Steps (keine Rechte)
  return jwt.sign(
    {
      sub: payloadUser.userId,
      u: {
        role: payloadUser.role,
        companyId: payloadUser.companyid || payloadUser.companyId,
        username: payloadUser.username,
      },
    },
    process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

// === Email-OTP In-Memory Store & Utils ===
const emailOtpStore = new Map(); // userId -> { hash, exp, email }
function generateOtp(len = 6) {
  return String(Math.floor(Math.random()*10**len)).padStart(len,'0');
}
function hashOtp(code) {
  return require('crypto').createHash('sha256').update(String(code||'')).digest('hex');
}
function saveEmailOtp(userId, email, code, ttlMs = 10*60*1000) {
  emailOtpStore.set(String(userId), { hash:hashOtp(code), exp:Date.now()+ttlMs, email });
}
function verifyEmailOtp(userId, code) {
  const rec = emailOtpStore.get(String(userId));
  if (!rec) return { ok:false, reason:'missing' };
  if (Date.now() > rec.exp) { emailOtpStore.delete(String(userId)); return { ok:false, reason:'expired' }; }
  const ok = rec.hash === hashOtp(code);
  if (ok) emailOtpStore.delete(String(userId));
  return { ok, email: rec.email };
}
function verifyTempJwt(token) {
  try { return jwt.verify(token, process.env.JWT_TEMP_SECRET || process.env.JWT_SECRET); }
  catch { return null; }
}
async function sendLoginOtpMail(to, code) {
  const transporter = createTransport();
  return transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject: 'Ihr Login-Code',
    text: `Ihr TempSys Login-Code lautet: ${code}\nEr ist 10 Minuten gültig.`,
    html: `<p>Ihr TempSys Login-Code:</p>
           <p style="font-size:20px;font-weight:700;letter-spacing:2px">${code}</p>
           <p>Gültig für 10 Minuten.</p>`
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// Auth
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { company, username, password } = req.body || {};
  try {
    const rows = await query(
      `SELECT u.id AS "userId",
              u.password AS "dbpass",
              u.role,
              u.email,
              COALESCE(u.twofa_enabled,false) AS "twofaEnabled",
              c.id AS companyid
         FROM users u
         JOIN companies c ON u.company_id = c.id
        WHERE c.name = $1 AND u.username = $2`,
      [company, username]
    );

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Ungültige Daten' });
    }

    const { userId, dbpass, role, companyid, email, twofaEnabled } = rows[0];

    // Passwort prüfen (Hash oder Klartext)
    const looksHashed = typeof dbpass === 'string' && dbpass.startsWith('$2');
    let valid = false;
    if (looksHashed) {
      const bcrypt = require('bcryptjs');
      valid = await bcrypt.compare(password, dbpass);
    } else {
      valid = (password === dbpass);
    }
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Ungültige Daten' });
    }

    // Step-Flow je nach .env
    const useStepFlow = String(process.env.AUTH_STEP_FLOW || '').toLowerCase() === 'true';
    if (useStepFlow) {
      const tempToken = issueTempJwt({ userId, role, companyid, username });

      // Reihenfolge:
      // 1) Wenn TOTP aktiv → "totp"
      // 2) Sonst: wenn Email vorhanden → "email_otp"
      // 3) Sonst: "email_input"
      let next = 'email_input';
      if (twofaEnabled) next = 'totp';
      else if (email)  next = 'email_otp';

      return res.json({
        success: true,
        next,
        temp_token: tempToken,
        meta: {
          hasEmail: !!email,
          hasTotp: !!twofaEnabled
        }
      });
    }

    // Fallback: direkt einloggen (ohne Step-Flow)
    const token = issueSessionJwt({ userId, companyid, username, role });
    return res.json({ success: true, role, token, companyId: companyid, username, userId });
  } catch (err) {
    console.error('🔴 Login error:', err);
    return res.status(500).json({ success: false, message: 'Server-Fehler' });
  }
});

// === Email-OTP: Code senden ===
// Body: { temp_token, email? }
// Regel: Wenn in DB bereits eine E-Mail existiert und im Body KEINE email kommt,
//        senden wir an die DB-E-Mail. Kommt im Body eine email, wird sie für
//        diesen OTP-Lauf verwendet (gespeichert wird erst nach VERIFY).
app.post('/api/auth/email/start', async (req, res) => {
  try {
    const { temp_token, email } = req.body || {};
    if (!temp_token) return res.status(400).json({ ok:false, message:'temp_token erforderlich' });

    const payload = verifyTempJwt(temp_token);
    if (!payload || !payload.sub) return res.status(401).json({ ok:false, message:'Temp-Token ungültig' });
    const userId = String(payload.sub);

    // Nutzer + ggf. vorhandene E-Mail aus DB laden
    const { rows:[u] } = await pool.query(
      `SELECT email FROM users WHERE id=$1 LIMIT 1`,
      [userId]
    );
    if (!u) return res.status(404).json({ ok:false, message:'User nicht gefunden' });

    const bodyEmail = String(email || '').trim();
    const targetEmail = bodyEmail || String(u.email || '').trim();

    // Muss valide sein
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(targetEmail)) {
      return res.status(400).json({ ok:false, message:'Gültige E-Mail-Adresse erforderlich' });
    }

    // OTP generieren & versenden (Adresse wird erst bei VERIFY fest in DB gespeichert)
    const code = generateOtp(6);
    saveEmailOtp(userId, targetEmail, code);
    await sendLoginOtpMail(targetEmail, code);

    return res.json({ ok:true, message:'OTP gesendet' });
  } catch (e) {
    console.error('email/start error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// === Email-OTP: Code prüfen → finale Session erstellen ===
// Body: { temp_token, code }
// Effekt: Falls E-Mail noch nicht (oder anders) hinterlegt war → jetzt speichern und verifizieren.
app.post('/api/auth/email/verify', async (req, res) => {
  try {
    const { temp_token, code } = req.body || {};
    if (!temp_token || !code) return res.status(400).json({ ok:false, message:'temp_token und code erforderlich' });

    const payload = verifyTempJwt(temp_token);
    if (!payload || !payload.sub) return res.status(401).json({ ok:false, message:'Temp-Token ungültig' });

    const userId    = String(payload.sub);
    const username  = payload?.u?.username || '';
    const role      = payload?.u?.role     || '';
    const companyId = payload?.u?.companyId;

    const v = verifyEmailOtp(userId, code);
    if (!v.ok) {
      const msg = v.reason === 'expired' ? 'Code abgelaufen' : 'Code ungültig';
      return res.status(401).json({ ok:false, message: msg });
    }

    // E-Mail aus OTP-Store kommt als v.email
    const verifiedEmail = String(v.email || '').trim();
    if (verifiedEmail) {
      // DB aktualisieren: E-Mail setzen/aktualisieren + als verifiziert markieren
      await pool.query(
        `UPDATE users
            SET email=$2,
                email_verified_at = NOW()
          WHERE id=$1`,
        [userId, verifiedEmail]
      );
    }

    // Finale Session ausstellen
    const token = jwt.sign({ userId, companyId, username, role }, process.env.JWT_SECRET, { expiresIn:'2h' });
    return res.json({ ok:true, token, role, companyId, username, userId });
  } catch (e) {
    console.error('email/verify error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// === TOTP (Authenticator App) – Status / Setup / Verify / Disable ===

// Status holen: ist 2FA aktiv?
app.get('/api/auth/2fa/status', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT COALESCE(twofa_enabled,false) AS "enabled"
         FROM users
        WHERE id = $1`,
      [req.user.userId]
    );
    return res.json({ ok: true, enabled: !!rows?.[0]?.enabled });
  } catch (e) {
    console.error('2fa/status error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// Setup starten: Secret erzeugen + in DB speichern, QR/Otpauth zurückgeben
app.post('/api/auth/2fa/setup/start', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT COALESCE(twofa_enabled,false) AS "enabled", twofa_secret
         FROM users
        WHERE id=$1`,
      [req.user.userId]
    );
    if (rows?.[0]?.enabled) {
      return res.status(409).json({ ok:false, message:'2FA bereits aktiviert' });
    }

    // neues Secret (20 Byte) generieren
    const secret = randomSecretBase32(20);
    await query(`UPDATE users SET twofa_secret=$2 WHERE id=$1`, [req.user.userId, secret]);

    const label  = encodeURIComponent(`TempSys:${req.user.username}`);
    const issuer = encodeURIComponent('TempSys');
    const otpauthUrl =
      `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}&algorithm=SHA1`;

    // QR als Data-URL erzeugen (kein externer Host nötig)
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 6, // ~220px
    });

    return res.json({ ok:true, secret, otpauthUrl, qrDataUrl });
  } catch (e) {
    console.error('2fa/setup/start error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// Setup verifizieren: Code prüfen → 2FA aktivieren
app.post('/api/auth/2fa/setup/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok:false, message:'code erforderlich' });

    const rows = await query(
      `SELECT twofa_secret FROM users WHERE id=$1`,
      [req.user.userId]
    );
    const secret = rows?.[0]?.twofa_secret;
    if (!secret) return res.status(400).json({ ok:false, message:'Kein Setup gestartet' });

    if (!totpCheck(code, secret, 1)) {
      return res.status(401).json({ ok:false, message:'Code ungültig' });
    }

    await query(`UPDATE users SET twofa_enabled=true WHERE id=$1`, [req.user.userId]);
    return res.json({ ok:true });
  } catch (e) {
    console.error('2fa/setup/verify error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// 2FA deaktivieren (mit aktuellem App-Code absichern)
app.post('/api/auth/2fa/disable', authenticate, async (req, res) => {
  try {
    const { code } = req.body || {};
    const rows = await query(
      `SELECT twofa_secret, COALESCE(twofa_enabled,false) AS "enabled"
         FROM users WHERE id=$1`,
      [req.user.userId]
    );
    const secret = rows?.[0]?.twofa_secret;
    const enabled = !!rows?.[0]?.enabled;
    if (!enabled || !secret) return res.status(400).json({ ok:false, message:'2FA nicht aktiv' });
    if (!code || !totpCheck(code, secret, 1)) {
      return res.status(401).json({ ok:false, message:'Code ungültig' });
    }
    await query(`UPDATE users SET twofa_enabled=false, twofa_secret=NULL WHERE id=$1`, [req.user.userId]);
    return res.json({ ok:true });
  } catch (e) {
    console.error('2fa/disable error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// Login-Step: TOTP prüfen → finale Session
// Body: { temp_token, code }
app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { temp_token, code } = req.body || {};
    if (!temp_token || !code) {
      return res.status(400).json({ ok:false, message:'temp_token und code erforderlich' });
    }

    const payload = verifyTempJwt(temp_token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ ok:false, message:'Temp-Token ungültig' });
    }

    const userId = String(payload.sub);
    const rows = await query(
      `SELECT u.username, u.role, u.company_id AS "companyId",
              COALESCE(u.twofa_enabled,false) AS "enabled",
              u.twofa_secret
         FROM users u
        WHERE u.id=$1`,
      [userId]
    );
    const u = rows?.[0];
    if (!u)  return res.status(404).json({ ok:false, message:'User nicht gefunden' });
    if (!u.enabled || !u.twofa_secret) {
      return res.status(400).json({ ok:false, message:'2FA nicht aktiv' });
    }
    if (!totpCheck(code, u.twofa_secret, 1)) {
      return res.status(401).json({ ok:false, message:'Code ungültig' });
    }

    const token = jwt.sign(
      { userId, companyId: u.companyId, username: u.username, role: u.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    return res.json({ ok:true, token, role: u.role, companyId: u.companyId, username: u.username, userId });
  } catch (e) {
    console.error('2fa/verify error:', e);
    return res.status(500).json({ ok:false, message:'Server-Fehler' });
  }
});

// ——— EINZELNES Passwort auf Default zurücksetzen ———
// PUT /api/users/:id/password-reset
app.put('/api/users/:id/password-reset', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const DEFAULT_PW = 'pass1234';
    const ROUNDS = 12;

    const hash = await bcrypt.hash(DEFAULT_PW, ROUNDS);

    await query(
      `UPDATE users
         SET password = $1,
             password_lock_token = NULL
       WHERE id = $2`,
      [hash, userId]
    );

    res.json({ success: true, message: 'Passwort zurückgesetzt.' });
  } catch (err) {
    console.error('password-reset failed:', err);
    res.status(500).json({ message: 'Fehler beim Zurücksetzen' });
  }
});

// ——— ALLE Passwörter einer Firma zurücksetzen ———
// PUT /api/companies/:companyId/password-reset-all
app.put('/api/companies/:companyId/password-reset-all', async (req, res) => {
  try {
    const { companyId } = req.params;
    const DEFAULT_PW = 'pass1234';
    const hashed = hashPw(DEFAULT_PW);

    await query(
      'UPDATE users SET password = $1, password_lock_token = NULL WHERE company_id = $2',
      [hashed, companyId]
    );

    res.json({ success: true, message: 'Alle Nutzerpasswörter auf Standard gesetzt.' });
  } catch (err) {
    console.error('password-reset-all failed:', err);
    res.status(500).json({ message: 'Fehler beim Zurücksetzen (alle Nutzer)' });
  }
});

// BACKEND: Account sperren – 64 Zeichen Klartext-Token anzeigen, bcrypt-Hash speichern
// Datei: backend/index.js

app.put('/api/users/:id/lock', authenticate, async (req, res) => {
  try {
    const userId = req.params.id;
    const token = randomToken64();            // KLARTEXT für Admin-Panel
    const hash  = await bcrypt.hash(token, 12); // bcrypt in users.password

    await query(
      `UPDATE users
         SET password = $1,
             password_lock_token = $2
       WHERE id = $3`,
      [hash, token, userId]
    );

    res.json({ success: true, token }); // Klartext-Token zurück ans UI
  } catch (err) {
    console.error('lock failed:', err);
    res.status(500).json({ message: 'Fehler beim Sperren' });
  }
});

// ↓↓↓ Middlewares als Funktionsdeklarationen (werden gehoistet) ↓↓↓
function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s/i, '');
  if (!token) return res.status(401).json({ message: 'Token fehlt' });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Ungültiger Token' });
    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin-Berechtigung erforderlich' });
  }
  next();
}

function requireCompanyOrSystemAdmin(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'companyAdmin') return next();
  return res.status(403).json({ message: 'Zugriff nur für System- oder Firmen-Admins' });
}

function selfOrAdmin(req, res, next) {
  if (
    req.user.role === 'admin' ||
    req.user.role === 'companyAdmin' ||
    String(req.user.userId) === String(req.params.userId)
  ) {
    return next();
  }
  return res.status(403).json({ message: 'Zugriff verweigert' });
}
// ↑↑↑ Ende Middlewares ↑↑↑

// ─── Passwort ändern (hashen + altes prüfen) ───────────────────────────────────
app.put('/api/users/:id/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const targetUserId = String(req.params.id);
  const caller = req.user;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Neues Passwort muss mindestens 6 Zeichen haben' });
  }

  const isSelf = String(caller.userId) === targetUserId;
  const isAdmin = caller.role === 'admin' || caller.role === 'companyAdmin';
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ message: 'Keine Berechtigung' });
  }

  try {
    const { rows } = await pool.query(`SELECT id, password FROM users WHERE id=$1`, [targetUserId]);
    const u = rows[0];
    if (!u) return res.status(404).json({ message: 'User nicht gefunden' });

    // Altes Passwort prüfen (Admins dürfen fremd ändern, ohne currentPassword)
    if (!isAdmin || isSelf) {
      const dbpass = u.password || '';
      const looksHashed = typeof dbpass === 'string' && dbpass.startsWith('$2');
      let valid = false;
      if (looksHashed) {
        const bcrypt = require('bcryptjs');
        valid = await bcrypt.compare(currentPassword || '', dbpass);
      } else {
        valid = (currentPassword === dbpass);
      }
      if (!valid) {
        return res.status(400).json({ message: 'Aktuelles Passwort falsch' });
      }
    }

    // Neues Passwort immer hashen
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12); // cost 12 empfohlen
    const hashed = await bcrypt.hash(newPassword, salt);

    await pool.query(`UPDATE users SET password=$2 WHERE id=$1`, [targetUserId, hashed]);
    return res.json({ success: true });
  } catch (e) {
    console.error('Passwortwechsel fehlgeschlagen:', e);
    return res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Support — Nachricht anlegen (Company‑Kontext oder Admin global)
// Body: { companyId, subject, category?, priority?, message, contactEmail?, includeLogs? }
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/support/messages', authenticate, async (req, res) => {
  try {
    const user = req.user || {};
    const {
      companyId,
      subject,
      category = 'question',
      priority = 'normal',
      message,
      contactEmail,
      includeLogs = false,
    } = req.body || {};

    if (!companyId || !subject || !message) {
      return res.status(400).json({ message: 'companyId, subject und message sind erforderlich' });
    }
    if (!SUPPORT_CATEGORIES.has(String(category))) {
      return res.status(400).json({ message: 'Ungültige category' });
    }
    if (!SUPPORT_PRIORITIES.has(String(priority))) {
      return res.status(400).json({ message: 'Ungültige priority' });
    }
    if (contactEmail && !isEmail(contactEmail)) {
      return res.status(400).json({ message: 'contactEmail ungültig' });
    }

    // ACL: normale Nutzer / companyAdmin NUR für ihre Firma; System‑Admin für jede
    if (!(user.role === 'admin' || (user.companyId && String(user.companyId) === String(companyId)))) {
      return res.status(403).json({ message: 'Nicht berechtigt' });
    }

    const rows = await query(
      `INSERT INTO support_messages
         (company_id, subject, category, priority, message, contact_email, include_logs, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'open')
       RETURNING id, company_id AS "companyId", subject, category, priority, message,
                 contact_email AS "contactEmail", include_logs AS "includeLogs",
                 status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [companyId, subject, category, priority, message, contactEmail || null, !!includeLogs]
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error('support POST error:', e);
    return res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Support — Liste (nur System‑Admin).
// Query:
//   ?status=open|in_progress|closed|all (default: open)
//   ?companyId=<uuid> (optional)
//   ?withLogs=true|false (optional; default false)  ← NEU
//   ?logsLimit=<int>    (optional; default 100)     ← NEU
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/support/messages', authenticate, requireAdmin, async (req, res) => {
  try {
    const status    = String(req.query.status || 'open').toLowerCase();
    const companyId = req.query.companyId ? String(req.query.companyId) : null;
    const withLogs  = String(req.query.withLogs || 'false').toLowerCase() === 'true';
    const logsLimit = Math.min(Math.max(parseInt(req.query.logsLimit || '100', 10) || 100, 1), 500);

    // --- Basisauswahl: Support-Nachrichten holen ---
    const params = [];
    const where  = [];
    if (status !== 'all') {
      if (!SUPPORT_STATUSES.has(status)) {
        return res.status(400).json({ message: 'Ungültiger status' });
      }
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (companyId) {
      params.push(companyId);
      where.push(`company_id = $${params.length}`);
    }

    const messages = await query(
      `SELECT id,
              company_id     AS "companyId",
              subject,
              category,
              priority,
              message,
              contact_email  AS "contactEmail",
              include_logs   AS "includeLogs",
              status,
              created_at     AS "createdAt",
              updated_at     AS "updatedAt"
         FROM support_messages
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY created_at DESC
        LIMIT 500`,
      params
    );

    // Wenn keine Logs gewünscht → sofort antworten
    if (!withLogs || messages.length === 0) {
      return res.json(messages);
    }

    // Nur für Nachrichten, die include_logs=true haben, Logs laden.
    const companiesNeedingLogs = Array.from(
      new Set(messages.filter(m => m.includeLogs).map(m => m.companyId))
    );

    if (companiesNeedingLogs.length === 0) {
      // Niemand hat Logs angefordert
      return res.json(messages.map(m => ({ ...m, logs: undefined })));
    }

    // Logs pro Firma in einem Query holen (letzte N je Firma).
    // Hinweis: Wir holen insgesamt die letzten N Einträge pro Firma
    // und hängen sie an alle Nachrichten dieser Firma an.
    const inParams = companiesNeedingLogs.map((_, i) => `$${i + 1}`).join(',');
    const deviceLogs = await query(
      `SELECT company_id  AS "companyId",
              device_id   AS "deviceId",
              message     AS "logMessage",
              created_at  AS "createdAt"
         FROM device_logs
        WHERE company_id IN (${inParams})
        ORDER BY created_at DESC
        LIMIT ${logsLimit * companiesNeedingLogs.length}`,
      companiesNeedingLogs
    );

    // Nach Firma gruppieren
    const logsByCompany = new Map();
    for (const row of deviceLogs) {
      if (!logsByCompany.has(row.companyId)) logsByCompany.set(row.companyId, []);
      const arr = logsByCompany.get(row.companyId);
      if (arr.length < logsLimit) arr.push(row);
    }

    // Logs nur dort anhängen, wo includeLogs=true ist
    const enriched = messages.map(m => ({
      ...m,
      logs: m.includeLogs ? (logsByCompany.get(m.companyId) || []) : undefined,
    }));

    return res.json(enriched);
  } catch (e) {
    console.error('support GET error:', e);
    return res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Support — Status aktualisieren (nur System‑Admin)
// Body: { status: 'open'|'in_progress'|'closed' }
// ───────────────────────────────────────────────────────────────────────────────
app.put('/api/support/messages/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!SUPPORT_STATUSES.has(String(status))) {
      return res.status(400).json({ message: 'Ungültiger status' });
    }
    const rows = await query(
      `UPDATE support_messages
          SET status = $2,
              updated_at = NOW()
        WHERE id = $1
        RETURNING id, company_id AS "companyId", subject, category, priority, message,
                  contact_email AS "contactEmail", include_logs AS "includeLogs",
                  status, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [req.params.id, status]
    );
    if (!rows.length) return res.status(404).json({ message: 'Nachricht nicht gefunden' });
    res.json(rows[0]);
  } catch (e) {
    console.error('support PUT error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Companies
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies', authenticate, requireAdmin, async (_req, res) => {
  try {
    const companies = await query('SELECT id, name FROM companies', []);
    res.json(companies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.post('/api/companies', authenticate, requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name erforderlich' });
  try {
    const [newCompany] = await query('INSERT INTO companies(name) VALUES($1) RETURNING id, name',[name]);
    res.status(201).json(newCompany);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.delete('/api/companies/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM companies WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Users
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/users', authenticate, async (req, res) => {
  try {
    const users = await query(
      `SELECT
        id,
        username,
        tag_id AS "tagId",
        role,
        (password_lock_token IS NOT NULL) AS "isLocked",
        password_lock_token AS "lockToken"   -- KLARTEXT für das Adminpanel
      FROM users
      WHERE company_id = $1
      ORDER BY username ASC`,
      [req.params.companyId]
    );
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.post('/api/users', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  const { companyId, username, password, role, tagId } = req.body;
  if (!companyId || !username || !password || !tagId || !role || !['user','companyAdmin','admin'].includes(role)) {
    return res.status(400).json({ message:'companyId, username, password, tagId und gültige role erforderlich' });
  }
  try {
    const [newUser] = await query(
      `INSERT INTO users(company_id, username, password, tag_id, role)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id, username, tag_id AS "tagId", role`,
      [companyId, username, password, tagId, role]
    );
    res.status(201).json(newUser);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.put('/api/users/:id', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  const { username, tagId, role } = req.body;
  if (!username || !tagId || !role || !['user','companyAdmin','admin'].includes(role)) {
    return res.status(400).json({ message:'username, tagId und gültige role erforderlich' });
  }
  try {
    const [updated] = await query(
      `UPDATE users
          SET username=$2, tag_id=$3, role=$4
        WHERE id=$1
        RETURNING id, username, tag_id AS "tagId", role`,
      [req.params.id, username, tagId, role]
    );
    if (!updated) return res.status(404).json({ message:'User nicht gefunden' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.delete('/api/users/:id', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Data Export
// ───────────────────────────────────────────────────────────────────────────────

// ─── ADD: Tabelle export_settings nutzen (siehe SQL unten) ─────────────────────
// Helper: Einstellungen laden/speichern
async function loadExportSettings(companyId) {
  const rows = await query(
    `SELECT company_id AS "companyId",
            recipients, cc, bcc,
            use_gmail   AS "useGmail",
            active, updated_at AS "updatedAt"
       FROM export_settings
      WHERE company_id = $1`,
    [companyId]
  );
  // Defaults, falls noch kein Eintrag
  if (!rows.length) {
    return {
      companyId,
      recipients: [],
      cc: [],
      bcc: [],
      useGmail: false,
      active: false,
      updatedAt: null
    };
  }
  return rows[0];
}

async function upsertExportSettings(companyId, payload) {
  const { recipients = [], cc = [], bcc = [], active = false } = payload;
  const useGmail = false;
  const rows = await query(
    `INSERT INTO export_settings(company_id, recipients, cc, bcc, use_gmail, active)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (company_id) DO UPDATE
        SET recipients=$2, cc=$3, bcc=$4, use_gmail=$5, active=$6, updated_at=now()
     RETURNING company_id AS "companyId", recipients, cc, bcc, use_gmail AS "useGmail", active, updated_at AS "updatedAt"`,
    [companyId, recipients, cc, bcc, useGmail, active]
  );
  return rows[0];
}

// --- Times-Export (DB → Struktur) MIT Pausen/Netto ----------------------------
async function fetchTimesForMonth(companyId, monthStr /* 'YYYY-MM' */) {
  // Policy laden (für Fallback, falls break_minutes in DB fehlt)
  const pol = await loadBreakPolicy(companyId);

  // Rohdaten holen (inkl. gespeicherter break_minutes)
  const rows = await query(
    `SELECT u.id AS "userId", u.username,
            wt.date,
            to_char(wt.start_time,'HH24:MI') AS start,
            to_char(wt.end_time,'HH24:MI')   AS "end",
            COALESCE(wt.break_minutes, NULL) AS "breakMinutesStored",
            EXTRACT(EPOCH FROM (wt.end_time - wt.start_time))/60.0 AS minutesGross
       FROM work_times wt
       JOIN users u ON u.id = wt.user_id
      WHERE wt.company_id = $1
        AND to_char(wt.date,'YYYY-MM') = $2
      ORDER BY u.username, wt.date`,
    [companyId, monthStr]
  );

  // Gruppieren je User und Netto/Pause berechnen
  const byUser = new Map();
  for (const r of rows) {
    const gross = r.minutesGross ? Math.max(0, Math.round(r.minutesGross)) : 0;
    const breakAuto = computeAutoBreak(gross, pol);
    const breakMin  = (r.breakMinutesStored == null ? breakAuto : Math.max(0, Number(r.breakMinutesStored)));
    const netMin    = Math.max(0, gross - breakMin);

    if (!byUser.has(r.userId)) byUser.set(r.userId, { username: r.username, items: [] });
    byUser.get(r.userId).items.push({
      date: r.date,
      start: r.start || '',
      end: r.end || '',
      breakMinutes: breakMin,
      minutesGross: gross,
      minutes: netMin,                 // ← NETTO
    });
  }

  // Totals
  const users = [];
  for (const [userId, { username, items }] of byUser.entries()) {
    const totalNetMin   = items.reduce((s, i) => s + (i.minutes || 0), 0);
    const totalBreakMin = items.reduce((s, i) => s + (i.breakMinutes || 0), 0);
    users.push({ userId, username, items, totalMin: totalNetMin, totalBreakMin });
  }

  const grandTotal = users.reduce((s, u) => s + u.totalMin, 0);
  return { month: monthStr, users, grandTotal };
}

// --- Excel bauen (mit Pause/Netto/Kosten + Summen) ----------------------------
async function buildExcelBuffer({ month, users, grandTotal }, cfg) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'TempSys';
  wb.created = new Date();

  // Helper: effektiver Stundensatz bzw. Monatslohn je User
  const getDeptRate = (userId) => {
    const dept = (cfg.userDepartments || {})[userId];
    if (!dept) return 0;
    return Number((cfg.departmentRates || {})[dept] || 0);
  };
  const getHourly  = (userId) => Number((cfg.userHourlyCents  || {})[userId] || 0);
  const getMonthly = (userId) => Number((cfg.userMonthlyCents || {})[userId] || 0);

  // Übersicht
  const wsSum = wb.addWorksheet('Übersicht');
  wsSum.columns = [
    { header: 'Mitarbeiter',  key: 'user', width: 28 },
    { header: 'Pausen (Min)', key: 'brk',  width: 14 },
    { header: 'Netto (Min)',  key: 'min',  width: 14 },
    { header: 'Netto (Std)',  key: 'hrs',  width: 14 },
    { header: 'Kosten (EUR)', key: 'cost', width: 16 },
  ];

  let grandCostCents = 0;
  for (const u of users) {
    const userId = String(u.userId);
    const hours  = u.totalMin / 60;
    let costCents = 0;

    if (cfg.mode === 'perUserMonthly') {
      costCents = getMonthly(userId);
    } else {
      let rate = 0;
      if (cfg.mode === 'uniform') rate = Number(cfg.defaultHourlyCents || 0);
      else if (cfg.mode === 'department') rate = getDeptRate(userId);
      else if (cfg.mode === 'perUserHourly') rate = getHourly(userId);
      costCents = Math.round(hours * rate);
    }
    grandCostCents += costCents;

    wsSum.addRow({
      user: u.username,
      brk: u.totalBreakMin || 0,
      min: u.totalMin,
      hrs: (hours).toFixed(2),
      cost: (costCents/100)
    });
  }
  wsSum.addRow({});
  wsSum.addRow({
    user: 'GESAMT',
    brk: users.reduce((s,u)=>s+(u.totalBreakMin||0),0),
    min: grandTotal,
    hrs: (grandTotal/60).toFixed(2),
    cost: (grandCostCents/100)
  });
  wsSum.getRow(1).font = { bold: true };
  wsSum.getColumn('cost').numFmt = '#,##0.00';

  // je User eigenes Sheet
  for (const u of users) {
    const ws = wb.addWorksheet(u.username.substring(0, 31));
    ws.columns = [
      { header: 'Datum',          key: 'date', width: 12 },
      { header: 'Start',          key: 'start', width: 8 },
      { header: 'Ende',           key: 'end', width: 8 },
      { header: 'Pause (Min)',    key: 'brk', width: 12 },
      { header: 'Netto (Min)',    key: 'min', width: 12 },
      { header: 'Netto (Std)',    key: 'hrs', width: 12 },
      { header: 'Satz (EUR/h)',   key: 'rate', width: 14 },
      { header: 'Kosten (EUR)',   key: 'cost', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };

    const userId = String(u.userId);
    let rateCents = 0;
    let isMonthly = (cfg.mode === 'perUserMonthly');
    if (!isMonthly) {
      if (cfg.mode === 'uniform') rateCents = Number(cfg.defaultHourlyCents || 0);
      else if (cfg.mode === 'department') rateCents = getDeptRate(userId);
      else if (cfg.mode === 'perUserHourly') rateCents = getHourly(userId);
    }

    // Zeilen
    for (const it of u.items) {
      const hrs = (it.minutes || 0)/60;
      const costCents = isMonthly ? 0 : Math.round(hrs * rateCents);
      ws.addRow({
        date: new Date(it.date),
        start: it.start,
        end: it.end,
        brk: it.breakMinutes || 0,
        min: it.minutes || 0,
        hrs: hrs.toFixed(2),
        rate: isMonthly ? '' : (rateCents/100),
        cost: isMonthly ? '' : (costCents/100),
      });
    }

    // Summen
    const totalHours = (u.totalMin/60);
    const totalCostCents = isMonthly ? getMonthly(userId)
                                     : Math.round(totalHours * rateCents);

    ws.addRow({});
    ws.addRow({
      date: 'SUMME',
      brk: u.totalBreakMin || 0,
      min: u.totalMin,
      hrs: totalHours.toFixed(2),
      rate: isMonthly ? 'Monatslohn' : (rateCents/100),
      cost: (totalCostCents/100),
    });

    ws.getColumn('date').numFmt = 'DD.MM.YYYY';
    ws.getColumn('rate').numFmt = '#,##0.00';
    ws.getColumn('cost').numFmt = '#,##0.00';
  }

  return await wb.xlsx.writeBuffer();
}

// --- CSV bauen (eine Datei) mit Pause/Netto/Kosten + Gesamt -------------------
function buildCsv({ month, users }, cfg) {
  // Helper für Rate/Kosten
  const getDeptRate = (userId) => {
    const dept = (cfg.userDepartments || {})[userId];
    if (!dept) return 0;
    return Number((cfg.departmentRates || {})[dept] || 0);
  };
  const getHourly  = (userId) => Number((cfg.userHourlyCents  || {})[userId] || 0);
  const getMonthly = (userId) => Number((cfg.userMonthlyCents || {})[userId] || 0);

  const lines = [];
  lines.push(['Monat', month]);
  lines.push([]);
  lines.push(['Benutzer','Datum','Start','Ende','Pause_Min','Netto_Min','Netto_Std','Satz_EUR_h','Kosten_EUR']);

  let grandNetMin = 0;
  let grandCostCents = 0;

  for (const u of users) {
    const userId = String(u.userId);
    let rateCents = 0;
    const isMonthly = (cfg.mode === 'perUserMonthly');
    if (!isMonthly) {
      if (cfg.mode === 'uniform') rateCents = Number(cfg.defaultHourlyCents || 0);
      else if (cfg.mode === 'department') rateCents = getDeptRate(userId);
      else if (cfg.mode === 'perUserHourly') rateCents = getHourly(userId);
    }

    let userCostCents = 0;
    for (const it of u.items) {
      const hrs = ((it.minutes || 0)/60);
      const rowCostCents = isMonthly ? 0 : Math.round(hrs * rateCents);
      lines.push([
        u.username,
        new Date(it.date).toISOString().slice(0,10),
        it.start || '',
        it.end || '',
        it.breakMinutes || 0,
        it.minutes || 0,
        hrs.toFixed(2),
        isMonthly ? '' : (rateCents/100).toFixed(2),
        isMonthly ? '' : (rowCostCents/100).toFixed(2),
      ]);
      userCostCents += rowCostCents;
    }

    grandNetMin += u.totalMin;
    grandCostCents += isMonthly ? getMonthly(userId) : userCostCents;
  }

  lines.push([]);
  lines.push([
    'GESAMT','','','',
    users.reduce((s,u)=>s+(u.totalBreakMin||0),0),
    grandNetMin,
    (grandNetMin/60).toFixed(2),
    '',
    (grandCostCents/100).toFixed(2),
  ]);

  return lines.map(r => r.map(v => String(v)).join(',')).join('\n');
}

// ─── ADD: Mail Versand (pro User ein Attachment) ───────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host: SMTP_HOST,          // z.B. mxe9b3.netcup.net
    port: SMTP_PORT,          // 465 oder 587
    secure: SMTP_SECURE,      // 465 -> true, 587 -> false
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// BACKEND: Drop-in-Replacement für sendMonthlyMail
async function sendMonthlyMail(companyId, monthStr) {
  const settings = await loadExportSettings(companyId);
  if (!settings.recipients || settings.recipients.length === 0) {
    throw new Error('Keine Empfänger konfiguriert.');
  }

  // Konfiguration & Daten laden
  const cfg    = await loadCompensationConfig(companyId);
  const policy = await loadBreakPolicy(companyId);
  const data   = await fetchTimesForMonth(companyId, monthStr);

  // Hilfsfunktionen (robust & lokal, damit Mail-Export identisch rechnet wie Download)
  const SEP = ';';
  const toDecComma = (n) => Number(n).toFixed(2).replace('.', ',');
  const parseHM = (str) => {
    const s = String(str ?? '').trim();
    const m = s.match(/(\d{1,2}):(\d{2})/);
    if (!m) return [0, 0];
    const h = Math.min(23, Math.max(0, Number(m[1] || 0)));
    const mm = Math.min(59, Math.max(0, Number(m[2] || 0)));
    return [Number.isFinite(h) ? h : 0, Number.isFinite(mm) ? mm : 0];
  };
  const diffMinutes = (startHHMM, endHHMM) => {
    const [sh, sm] = parseHM(startHHMM);
    const [eh, em] = parseHM(endHHMM);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;       // Overnight-Schichten zulassen
    return Math.max(0, diff);
  };
  const computeLine = (it) => {
    const start = String(it.start ?? '').trim();
    const end   = String(it.end   ?? '').trim();
    // totalMin: bevorzugt vorhandenen totalMin, sonst aus Start/Ende
    let totalMin = Number(it.totalMin);
    if (!Number.isFinite(totalMin) || totalMin <= 0) {
      totalMin = diffMinutes(start, end);
    }
    // breakMin: bevorzugt breakMin, dann breakMinutes, sonst Policy
    let breakMin = it.breakMin;
    if (breakMin == null && it.breakMinutes != null) breakMin = Number(it.breakMinutes);
    if (!Number.isFinite(Number(breakMin))) {
      breakMin = computeAutoBreak(totalMin, policy);
    } else {
      breakMin = Number(breakMin);
    }
    // clamp
    if (breakMin < 0) breakMin = 0;
    if (breakMin > totalMin) breakMin = totalMin;

    const netMin = Math.max(0, totalMin - breakMin);
    const netHr  = Math.round((netMin / 60) * 100) / 100; // Dezimalstunden
    return { start, end, totalMin, breakMin, netMin, netHr };
  };

  const attachments = [];

  for (const u of (data.users || [])) {
    const userId = String(u.userId);
    const isMonthly = (cfg.mode === 'perUserMonthly');

    // Stundensatz bestimmen (in Cents)
    let rateCents = 0;
    if (!isMonthly) {
      if (cfg.mode === 'uniform') {
        rateCents = Number(cfg.defaultHourlyCents || 0);
      } else if (cfg.mode === 'department') {
        const dept = (cfg.userDepartments || {})[userId];
        rateCents = dept ? Number((cfg.departmentRates || {})[dept] || 0) : 0;
      } else if (cfg.mode === 'perUserHourly') {
        rateCents = Number((cfg.userHourlyCents || {})[userId] || 0);
      }
    }
    const monthlyCents = isMonthly ? Number((cfg.userMonthlyCents || {})[userId] || 0) : 0;

    // CSV aufbauen
    const lines = [
      ['Datum','Start','Ende','Pause_Min','Netto_Min','Netto_Std','Satz_EUR_h','Kosten_EUR']
    ];
    let sumBreak = 0, sumNetMin = 0, sumCostCents = 0;

    for (const it of (u.items || [])) {
      const { start, end, breakMin, netMin, netHr } = computeLine(it);

      const rowCostCents = isMonthly ? 0 : Math.round(netHr * rateCents);
      sumBreak    += breakMin;
      sumNetMin   += netMin;
      sumCostCents+= rowCostCents;

      lines.push([
        String(it.date).slice(0,10),          // Datum YYYY-MM-DD
        start || '',
        end   || '',
        breakMin,
        netMin,
        toDecComma(netHr),
        isMonthly ? '' : toDecComma(rateCents / 100),
        isMonthly ? '' : toDecComma(rowCostCents / 100),
      ]);
    }

    // Monatslohn ggf. addieren
    const totalCostCents = isMonthly ? (sumCostCents + monthlyCents) : sumCostCents;

    // Summenzeile
    lines.push([]);
    lines.push([
      'SUMME','','',
      sumBreak,
      sumNetMin,
      toDecComma(sumNetMin / 60),
      isMonthly ? 'Monatslohn' : toDecComma(rateCents / 100),
      toDecComma(totalCostCents / 100),
    ]);

    // CSV-String bauen: Semikolon, BOM für Excel
    const csv = '\uFEFF' + lines.map(r => r.join(SEP)).join('\n');

    attachments.push({
      filename: `${u.username}_${monthStr}.csv`,
      content: Buffer.from(csv, 'utf8'),
      contentType: 'text/csv; charset=utf-8'
    });
  }

const transporter = createTransport();
const info = await transporter.sendMail({
  from: SMTP_FROM,
  to: settings.recipients,
  cc: settings.cc && settings.cc.length ? settings.cc : undefined,
  bcc: settings.bcc && settings.bcc.length ? settings.bcc : undefined,
  subject: `Arbeitszeiten ${monthStr}`,
  text: `Anbei die erfassten Zeiten pro Mitarbeiter für ${monthStr}.

Bitte öffnen Sie die angehängte Datei in Excel, da die Vorschau in der E-Mail möglicherweise fehlerhaft dargestellt wird.

Mit Freundlichen Grüßen

Ihr TempSys Team`,
  attachments
});
return info;
}

async function loadBreakPolicy(companyId){
  const rows = await query(
    `SELECT mode,
            auto_threshold1_minutes AS "t1",
            auto_break1_minutes     AS "b1",
            auto_threshold2_minutes AS "t2",
            auto_break2_minutes     AS "b2",
            COALESCE(min_block_minutes,15) AS "minBlock"
       FROM company_break_policy
      WHERE company_id=$1`,
    [companyId]
  );
  if (!rows.length) {
    // Default: „de facto“-Standard (keine Rechtsberatung): >6h ⇒ 30m, >9h ⇒ 45m
    return { mode:'auto', t1:360, b1:30, t2:540, b2:45, minBlock:15 };
  }
  const r = rows[0];
  return {
    mode: r.mode || 'none',
    t1:   Number(r.t1 ?? 360),
    b1:   Number(r.b1 ?? 30),
    t2:   Number(r.t2 ?? 540),
    b2:   Number(r.b2 ?? 45),
    minBlock: Number(r.minBlock ?? 15),
  };
}

function diffMinutesHHMM(startHHMM, endHHMM){
  if (!startHHMM || !endHHMM) return 0;
  const [sh,sm] = String(startHHMM).split(':').map(Number);
  const [eh,em] = String(endHHMM).split(':').map(Number);
  const start = sh*60 + sm;
  const end   = eh*60 + em;
  return Math.max(0, end - start);
}

function computeAutoBreak(totalMin, pol){
  if (pol.mode !== 'auto') return 0;
  if (totalMin > (pol.t2 || 0)) return Math.max(0, pol.b2||0);
  if (totalMin > (pol.t1 || 0)) return Math.max(0, pol.b1||0);
  return 0;
}

// Pausen (break_minutes) für einen Tag gemäß Policy berechnen & in work_times schreiben
async function upsertBreakForDay(companyId, userId, dateISO, clientOrPool = pool) {
  const client = clientOrPool;
  // Start/Ende holen
  const { rows:[wt] } = await client.query(
    `SELECT start_time, end_time
       FROM work_times
      WHERE company_id=$1 AND user_id=$2 AND date=$3::date
      LIMIT 1`,
    [companyId, userId, String(dateISO).slice(0,10)]
  );
  if (!wt || !wt.start_time || !wt.end_time) {
    // nichts zu tun (offen oder nicht vorhanden)
    return 0;
  }
  const startHHMM = String(wt.start_time).slice(0,5);
  const endHHMM   = String(wt.end_time).slice(0,5);
  const totalMin  = diffMinutesHHMM(startHHMM, endHHMM);
  const pol       = await loadBreakPolicy(companyId);
  const breakMin  = computeAutoBreak(totalMin, pol);

  await client.query(
    `UPDATE work_times
        SET break_minutes=$4
      WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
    [companyId, userId, String(dateISO).slice(0,10), breakMin]
  );
  return breakMin;
}

// ─── ADD: Routes ───────────────────────────────────────────────────────────────

// Settings holen/speichern (Company Admin + Admin)
app.get('/api/companies/:companyId/export-settings', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const cfg = await loadExportSettings(req.params.companyId);
    res.json(cfg);
  } catch (e) {
    console.error('export-settings get error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.put('/api/companies/:companyId/export-settings', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const cfg = await upsertExportSettings(req.params.companyId, req.body || {});
    res.json(cfg);
  } catch (e) {
    console.error('export-settings put error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// GET Policy
app.get('/api/companies/:companyId/break-policy',
  authenticate, requireCompanyOrSystemAdmin,
  async (req,res)=>{
    try {
      const pol = await loadBreakPolicy(req.params.companyId);
      res.json(pol);
    } catch(e){
      console.error('break-policy GET error:', e);
      res.status(500).json({ message:'Server-Fehler' });
    }
});

// PUT Policy
app.put('/api/companies/:companyId/break-policy',
  authenticate, requireCompanyOrSystemAdmin,
  async (req,res)=>{
    try {
      const { mode='auto', t1=360, b1=30, t2=540, b2=45, minBlock=15 } = req.body || {};
      const m = String(mode)==='none' ? 'none' : 'auto';
      const rows = await query(
        `INSERT INTO company_break_policy(company_id,mode,auto_threshold1_minutes,auto_break1_minutes,
                                          auto_threshold2_minutes,auto_break2_minutes,min_block_minutes,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,now())
         ON CONFLICT (company_id) DO UPDATE
           SET mode=EXCLUDED.mode,
               auto_threshold1_minutes=EXCLUDED.auto_threshold1_minutes,
               auto_break1_minutes=EXCLUDED.auto_break1_minutes,
               auto_threshold2_minutes=EXCLUDED.auto_threshold2_minutes,
               auto_break2_minutes=EXCLUDED.auto_break2_minutes,
               min_block_minutes=EXCLUDED.min_block_minutes,
               updated_at=now()
         RETURNING mode,
                   auto_threshold1_minutes AS "t1",
                   auto_break1_minutes     AS "b1",
                   auto_threshold2_minutes AS "t2",
                   auto_break2_minutes     AS "b2",
                   min_block_minutes       AS "minBlock"`,
        [req.params.companyId, m, Number(t1), Number(b1), Number(t2), Number(b2), Number(minBlock)]
      );
      res.json(rows[0]);
    } catch(e){
      console.error('break-policy PUT error:', e);
      res.status(500).json({ message:'Server-Fehler' });
    }
});

app.get('/api/users/:userId/times', authenticate, selfOrAdmin, async (req, res) => {
  const { from, to } = req.query;
  const params = [req.user.companyId, req.params.userId];
  let where = `company_id=$1 AND user_id=$2`;
  if (from) { params.push(from); where += ` AND date >= $${params.length}`; }
  if (to)   { params.push(to);   where += ` AND date <= $${params.length}`; }

  try {
    const pol = await loadBreakPolicy(req.user.companyId);

    const rows = await query(
      `SELECT id, date,
              to_char(start_time,'HH24:MI') AS "start",
              to_char(end_time,'HH24:MI')   AS "end",
              source
         FROM work_times
        WHERE ${where}
        ORDER BY date DESC`,
      params
    );

    const enriched = rows.map(r => {
      const rawMin    = diffMinutesHHMM(r.start, r.end);
      const breakMin  = computeAutoBreak(rawMin, pol);
      const netMin    = Math.max(0, rawMin - breakMin);
      return {
        ...r,
        workedMinutesRaw: rawMin,
        breakMinutes: breakMin,
        workedMinutesNet: netMin
      };
    });

    res.json(enriched);
  } catch (e) {
    console.error('Error fetching work_times:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Datei-Export: Zeit-Helper (robust) + Normalisierung
// Backend
// ───────────────────────────────────────────────────────────────────────────────

// "HH:MM" aus beliebigen Strings ziehen (unterstützt HH:MM, HH:MM:SS, +TZ, Whitespace)
function parseHM(str) {
  const s = String(str ?? '').trim();
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return [0, 0];
  const h = Math.min(23, Math.max(0, Number(m[1] || 0)));
  const mm = Math.min(59, Math.max(0, Number(m[2] || 0)));
  return [Number.isFinite(h) ? h : 0, Number.isFinite(mm) ? mm : 0];
}

// Minuten-Differenz; Overnight (Ende < Start) → +24h
function minutesBetweenHHMM(startHHMM, endHHMM) {
  const [sh, sm] = parseHM(startHHMM);
  const [eh, em] = parseHM(endHHMM);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, diff);
}

// total/break/net defensiv berechnen
function computeLineMinutes(it, policy) {
  const start = String(it.start ?? '').trim();
  const end   = String(it.end   ?? '').trim();

  const calcTotal = minutesBetweenHHMM(start, end);
  let totalMin = Number(it.totalMin);
  if (!Number.isFinite(totalMin) || totalMin <= 0) totalMin = calcTotal;

  let breakMin = it.breakMin;
  if (breakMin == null && it.breakMinutes != null) breakMin = Number(it.breakMinutes);
  if (!Number.isFinite(Number(breakMin))) {
    breakMin = (typeof computeAutoBreak === 'function') ? computeAutoBreak(totalMin, policy) : 0;
  } else {
    breakMin = Number(breakMin);
  }

  if (breakMin < 0) breakMin = 0;
  if (breakMin > totalMin) breakMin = totalMin;

  const netMin = Math.max(0, totalMin - breakMin);
  const netHr  = Math.round((netMin / 60) * 100) / 100;

  return { start, end, totalMin, breakMin, netMin, netHr };
}

// Normalisieren: garantiert start/end/totalMin/breakMin/netMin vorhanden
function normalizeDataForExport(data, policy) {
  for (const u of (data.users || [])) {
    u.items = (u.items || []).map((raw) => {
      const r = computeLineMinutes(raw, policy);
      return { ...raw, ...r }; // <— WICHTIG: KEIN ".raw"!
    });
  }
  return data;
}

// ───────────────────────────────────────────────────────────────────────────────
// Gruppierte Builder (Name nur einmal je Mitarbeiter, dann Tageszeilen + Gesamt)
// ───────────────────────────────────────────────────────────────────────────────

function centsToEurStr(cents) {
  return (Number(cents || 0) / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function rateForUserCents(cfg, userId) {
  const uid = String(userId);
  if (cfg.mode === 'uniform')       return Number(cfg.defaultHourlyCents || 0);
  if (cfg.mode === 'department') {
    const dept = (cfg.userDepartments || {})[uid];
    return Number((cfg.departmentRates || {})[dept] || 0);
  }
  if (cfg.mode === 'perUserHourly') return Number((cfg.userHourlyCents || {})[uid] || 0);
  if (cfg.mode === 'perUserMonthly') return null; // Monatsblöcke, kein Stundensatz
  return 0;
}

// CSV (Semikolon; Excel DE)
function buildCsv(data, cfg, policy) {
  const sep = ';';
  const lines = [];
  lines.push(['Mitarbeiter','Datum','Start','Ende','Pause_Min','Netto_Min','Netto_Std','Satz_EUR_h','Kosten_EUR'].join(sep));

  for (const u of (data.users || [])) {
    const uid  = String(u.userId);
    const rate = rateForUserCents(cfg, uid);
    let sumBreak = 0, sumNetMin = 0, sumCost = 0;

    // Kopfzeile mit Name (nur einmal)
    lines.push([u.username,'','','','','','','',''].join(sep));

    const isMonthly = (cfg.mode === 'perUserMonthly');
    const monthlyCents = Number((cfg.userMonthlyCents || {})[uid] || 0);

    for (const it of (u.items || [])) {
      const { start, end, breakMin, netMin, netHr } = computeLineMinutes(it, policy);
      sumBreak  += breakMin;
      sumNetMin += netMin;

      let rowRate = '';
      let rowCost = '';
      if (!isMonthly) {
        const costCents = Math.round(netHr * Number(rate || 0));
        sumCost += costCents;
        rowRate = (Number(rate || 0) / 100).toFixed(2).replace('.', ',');
        rowCost = centsToEurStr(costCents);
      }

      lines.push([
        '',                                   // Name leer in Tageszeilen
        String(it.date).slice(0,10),
        start || '',
        end   || '',
        breakMin,
        netMin,
        netHr.toFixed(2).replace('.', ','),
        rowRate,
        rowCost
      ].join(sep));
    }

    if (isMonthly) sumCost += monthlyCents;

    lines.push([
      '','Gesamt','','',
      sumBreak,
      sumNetMin,
      (sumNetMin/60).toFixed(2).replace('.', ','),
      isMonthly ? 'Monatslohn' : '',
      centsToEurStr(sumCost)
    ].join(sep));
  }

  return lines.join('\n');
}

async function buildExcelBuffer(data, cfg, policy) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Zeiten');

  // Header
  ws.addRow(['Mitarbeiter','Datum','Start','Ende','Pause_Min','Netto_Min','Netto_Std','Satz_EUR_h','Kosten_EUR']);
  ws.getRow(1).font = { bold: true };

  for (const u of (data.users || [])) {
    const uid  = String(u.userId);
    const rate = rateForUserCents(cfg, uid);
    const isMonthly = (cfg.mode === 'perUserMonthly');
    const monthlyCents = Number((cfg.userMonthlyCents || {})[uid] || 0);

    let sumBreak = 0, sumNetMin = 0, sumCost = 0;

    // Name-Kopfzeile
    ws.addRow([u.username,'','','','','','','','']).font = { bold: true };

    for (const it of (u.items || [])) {
      const { start, end, breakMin, netMin, netHr } = computeLineMinutes(it, policy);
      sumBreak  += breakMin;
      sumNetMin += netMin;

      let rateCell = '';
      let costCell = '';
      if (!isMonthly) {
        const costCents = Math.round(netHr * Number(rate || 0));
        sumCost += costCents;
        rateCell = Number(((rate || 0) / 100).toFixed(2));
        costCell = Number((costCents / 100).toFixed(2));
      }

      ws.addRow([
        '',                         // Name leer
        new Date(it.date),
        start || '',
        end   || '',
        breakMin,                   // Pause_Min
        netMin,                     // Netto_Min (Minuten)
        Number(netHr.toFixed(2)),   // Netto_Std
        rateCell,                   // EUR/h Zahl oder ''
        costCell                    // Kosten EUR Zahl oder ''
      ]);
    }

    if (isMonthly) sumCost += monthlyCents;

    ws.addRow(['','Gesamt','','',
      sumBreak,
      sumNetMin,
      Number((sumNetMin/60).toFixed(2)),
      isMonthly ? 'Monatslohn' : '',
      Number((sumCost/100).toFixed(2))
    ]).font = { bold: true };
  }

  // Formate
  ws.getColumn(2).numFmt = 'yyyy-mm-dd';
  ws.getColumn(7).numFmt = '0.00';
  ws.getColumn(8).numFmt = '€ #,##0.00';
  ws.getColumn(9).numFmt = '€ #,##0.00';
  ws.columns.forEach(c => { c.width = 13; });
  ws.getColumn(1).width = 22;

  const buf = await wb.xlsx.writeBuffer();
  return buf;
}

// ───────────────────────────────────────────────────────────────────────────────
// Routen
// ───────────────────────────────────────────────────────────────────────────────

app.get('/api/companies/:companyId/export', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const month = String(req.query.month || '').trim();    // 'YYYY-MM'
    const companyId = req.params.companyId;
    const format = String(req.query.format || 'xlsx').toLowerCase(); // 'xlsx' | 'csv'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month=YYYY-MM erforderlich' });
    }

    // Datenbasis + Policy laden
    const rawData = await fetchTimesForMonth(companyId, month);
    const cfg     = await loadCompensationConfig(companyId);
    const policy  = await loadBreakPolicy(companyId);

    // Policy global verfügbar machen (für Builder, falls sie separat genutzt werden)
    globalThis.__breakPolicy__ = policy;

    // Normalisieren, damit breakMin/totalMin sicher vorhanden sind
    const data = normalizeDataForExport(rawData, policy);

    if (format === 'csv') {
      const csv = buildCsv(data, cfg);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="times_${month}.csv"`);
      // UTF‑8 BOM für Excel
      return res.send('\uFEFF' + csv);
    }

    // default: xlsx
    const buf = await buildExcelBuffer(data, cfg);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="times_${month}.xlsx"`);
    return res.send(Buffer.from(buf));
  } catch (e) {
    console.error('export download error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.post('/api/companies/:companyId/export-send-now', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const month = String((req.body && req.body.month) || '').trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month=YYYY-MM erforderlich' });
    }
    const info = await sendMonthlyMail(req.params.companyId, month);
    res.json({ success: true, messageId: info.messageId });
  } catch (e) {
    console.error('export send now error:', e);
    res.status(500).json({ message: 'Server-Fehler', detail: e.message });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Company Data Dump (alle firmenspezifischen Tabellen auf einen Blick)
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/data-dump', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const limNum = Number(req.query.limit);
    const L = !isNaN(limNum) && limNum > 0 ? Math.floor(limNum) : null;
    const limitClause = L ? ` LIMIT ${L}` : '';

    // Helper: Counts separat holen (schnell, ohne LIMIT)
    const counts = {};
    async function countOf(sql, params) {
      const r = await query(`SELECT COUNT(*)::int AS c FROM (${sql}) x`, params);
      return r?.[0]?.c ?? 0;
    }

    // Queries
    const usersSql = `
      SELECT id, username, tag_id AS "tagId", role
        FROM users
       WHERE company_id = $1
       ORDER BY username${limitClause}
    `;

    const devicesSql = `
      SELECT id, serial, name, notes,
             company_id AS "companyId",
             last_seen  AS "lastSeen",
             version, ip, mac
        FROM devices
       WHERE company_id = $1
       ORDER BY last_seen DESC NULLS LAST${limitClause}
    `;

    const absencesSql = `
      SELECT a.id, a.date, a.status,
             a.sick_note_path AS "sickNotePath",
             a.user_message   AS "userMessage",
             a.user_id        AS "userId",
             u.username
        FROM absences a
        JOIN users u ON u.id = a.user_id
       WHERE a.company_id = $1
       ORDER BY a.date DESC${limitClause}
    `;

    const timeCorrectionsSql = `
      SELECT tc.id, tc.date,
             tc.new_start  AS "newStart",
             tc.new_end    AS "newEnd",
             tc.reason, tc.status,
             tc.user_id    AS "userId",
             u.username
        FROM time_corrections tc
        JOIN users u ON u.id = tc.user_id
       WHERE tc.company_id = $1
       ORDER BY tc.date DESC, tc.created_at DESC${limitClause}
    `;

    const workTimesSql = `
      SELECT id,
             user_id    AS "userId",
             date,
             start_time AS "startTime",
             end_time   AS "endTime",
             source
        FROM work_times
       WHERE company_id = $1
       ORDER BY date DESC${limitClause}
    `;

    const scheduleSql = `
      SELECT s.id, s.date, s.user_id AS "userId", u.username
        FROM schedule s
        JOIN users u ON u.id = s.user_id
       WHERE s.company_id = $1
       ORDER BY s.date DESC${limitClause}
    `;

    const empWeeklyTargetsSql = `
      SELECT user_id AS "userId", weekly_target_minutes AS "weeklyTargetMinutes"
        FROM employee_weekly_targets
       WHERE company_id = $1
       ORDER BY user_id${limitClause}
    `;

    const workingConfigSql = `
      SELECT mode, uniform_weekly_target_minutes AS "uniformWeeklyTargetMinutes"
        FROM company_working_config
       WHERE company_id = $1
       LIMIT 1
    `;

    const openingHoursSql = `
      SELECT weekday, open_time AS "open", close_time AS "close"
        FROM company_opening_hours
       WHERE company_id = $1
       ORDER BY weekday
    `;

    const exportSettingsSql = `
      SELECT company_id AS "companyId",
             recipients, cc, bcc,
             use_gmail   AS "useGmail",
             active,
             updated_at  AS "updatedAt"
        FROM export_settings
       WHERE company_id = $1
       LIMIT 1
    `;

    const companyFeaturesSql = `
      SELECT f.id, f.key, f.label
        FROM features f
        JOIN company_features cf ON f.id = cf.feature_id
       WHERE cf.company_id = $1
       ORDER BY f.id${limitClause}
    `;

    const swapRequestsSql = `
      SELECT id, date, status, requester, target, created_at AS "createdAt"
        FROM swap_requests
       WHERE company_id = $1
       ORDER BY created_at DESC${limitClause}
    `;

    const messagesSql = `
      SELECT id, recipient, type, title, body, payload,
             created_at AS "createdAt",
             read_at    AS "readAt"
        FROM messages
       WHERE company_id = $1
       ORDER BY created_at DESC${limitClause}
    `;

    // Parallel laden
    const [
      users, devices, absences, time_corrections, work_times, schedule,
      employee_weekly_targets, company_working_config, company_opening_hours,
      export_settings_row, company_features, swap_requests, messages,
      cUsers, cDevices, cAbs, cTC, cWT, cSch, cEmp, cOH, cCF, cSR, cMsg
    ] = await Promise.all([
      query(usersSql, [companyId]),
      query(devicesSql, [companyId]),
      query(absencesSql, [companyId]),
      query(timeCorrectionsSql, [companyId]),
      query(workTimesSql, [companyId]),
      query(scheduleSql, [companyId]),
      query(empWeeklyTargetsSql, [companyId]),
      query(workingConfigSql, [companyId]),
      query(openingHoursSql, [companyId]),
      query(exportSettingsSql, [companyId]),
      query(companyFeaturesSql, [companyId]),
      query(swapRequestsSql, [companyId]),
      query(`SELECT * FROM users WHERE company_id=$1`, [companyId]).then(()=>countOf(`SELECT id FROM users WHERE company_id='${companyId}'`, [])),
      query(`SELECT * FROM devices WHERE company_id=$1`, [companyId]).then(()=>countOf(`SELECT id FROM devices WHERE company_id='${companyId}'`, [])),
      countOf(`SELECT id FROM absences WHERE company_id='${companyId}'`, []),
      countOf(`SELECT id FROM time_corrections WHERE company_id='${companyId}'`, []),
      countOf(`SELECT id FROM work_times WHERE company_id='${companyId}'`, []),
      countOf(`SELECT id FROM schedule WHERE company_id='${companyId}'`, []),
      countOf(`SELECT user_id FROM employee_weekly_targets WHERE company_id='${companyId}'`, []),
      countOf(`SELECT weekday FROM company_opening_hours WHERE company_id='${companyId}'`, []),
      countOf(`SELECT feature_id FROM company_features WHERE company_id='${companyId}'`, []),
      countOf(`SELECT id FROM swap_requests WHERE company_id='${companyId}'`, []),
      countOf(`SELECT id FROM messages WHERE company_id='${companyId}'`, []),
    ]);

    counts.users = cUsers;
    counts.devices = cDevices;
    counts.absences = cAbs;
    counts.time_corrections = cTC;
    counts.work_times = cWT;
    counts.schedule = cSch;
    counts.employee_weekly_targets = cEmp;
    counts.company_opening_hours = cOH;
    counts.company_features = cCF;
    counts.swap_requests = cSR;
    counts.messages = cMsg;

    const tables = {
      users,
      devices,
      absences,
      time_corrections,
      work_times,
      schedule,
      employee_weekly_targets,
      company_working_config: company_working_config?.[0] ?? null,
      company_opening_hours,
      export_settings: export_settings_row?.[0] ?? null,
      company_features,
      swap_requests,
      messages,
    };

    res.json({ tables, counts });
  } catch (e) {
    console.error('data-dump error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Privacy Consent (Datenschutz-Zustimmung) – GET/PUT
// ───────────────────────────────────────────────────────────────────────────────

// Helpers
async function loadPrivacyConsent(companyId) {
  const rows = await query(
    `SELECT accepted, version, accepted_at AS "acceptedAt"
       FROM privacy_consent
      WHERE company_id = $1`,
    [companyId]
  );
  // Default, wenn noch nichts gespeichert ist
  if (!rows.length) return { accepted: false, version: null, acceptedAt: null };
  return rows[0];
}

async function upsertPrivacyConsent(companyId, payload) {
  const accepted   = !!payload?.accepted;
  const version    = payload?.version ?? null;
  const acceptedAt = payload?.acceptedAt
    ? new Date(payload.acceptedAt).toISOString()
    : new Date().toISOString();

  const rows = await query(
    `INSERT INTO privacy_consent(company_id, accepted, version, accepted_at)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (company_id) DO UPDATE
        SET accepted   = EXCLUDED.accepted,
            version    = EXCLUDED.version,
            accepted_at= EXCLUDED.accepted_at
     RETURNING accepted, version, accepted_at AS "acceptedAt"`,
    [companyId, accepted, version, acceptedAt]
  );
  return rows[0];
}

// GET: aktuellen Zustimmungsstatus holen
app.get('/api/companies/:companyId/privacy-consent',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const data = await loadPrivacyConsent(req.params.companyId);
      res.json(data);
    } catch (e) {
      console.error('privacy-consent GET error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// PUT: Zustimmung speichern/aktualisieren
app.put('/api/companies/:companyId/privacy-consent',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const { accepted, version, acceptedAt } = req.body || {};
      if (accepted !== true && accepted !== false) {
        return res.status(400).json({ message: 'accepted (true|false) erforderlich' });
      }
      const saved = await upsertPrivacyConsent(req.params.companyId, { accepted, version, acceptedAt });
      res.json(saved);
    } catch (e) {
      console.error('privacy-consent PUT error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Compensation Config – Laden/Speichern
// ───────────────────────────────────────────────────────────────────────────────
async function loadCompensationConfig(companyId) {
  const rows = await query(
    `SELECT mode,
            default_hourly_cents      AS "defaultHourlyCents",
            department_rates          AS "departmentRates",
            user_departments          AS "userDepartments",
            user_hourly_cents         AS "userHourlyCents",
            user_monthly_cents        AS "userMonthlyCents"
       FROM compensation_config
      WHERE company_id=$1`,
    [companyId]
  );
  if (!rows.length) {
    return {
      mode: 'uniform',
      defaultHourlyCents: 0,
      departmentRates: {},
      userDepartments: {},
      userHourlyCents: {},
      userMonthlyCents: {}
    };
  }
  const row = rows[0];
  // JSON Felder sicherstellen
  return {
    mode: row.mode || 'uniform',
    defaultHourlyCents: row.defaultHourlyCents || 0,
    departmentRates: row.departmentRates || {},
    userDepartments: row.userDepartments || {},
    userHourlyCents: row.userHourlyCents || {},
    userMonthlyCents: row.userMonthlyCents || {}
  };
}

async function upsertCompensationConfig(companyId, cfg) {
  const mode = String(cfg.mode || 'uniform');
  const allowed = new Set(['uniform','department','perUserHourly','perUserMonthly']);
  if (!allowed.has(mode)) throw new Error('Ungültiger Modus');

  const row = await query(
    `INSERT INTO compensation_config(
        company_id, mode, default_hourly_cents,
        department_rates, user_departments,
        user_hourly_cents, user_monthly_cents, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (company_id) DO UPDATE SET
        mode=$2,
        default_hourly_cents=$3,
        department_rates=$4,
        user_departments=$5,
        user_hourly_cents=$6,
        user_monthly_cents=$7,
        updated_at=NOW()
     RETURNING mode,
               default_hourly_cents AS "defaultHourlyCents",
               department_rates     AS "departmentRates",
               user_departments     AS "userDepartments",
               user_hourly_cents    AS "userHourlyCents",
               user_monthly_cents   AS "userMonthlyCents"`,
    [
      companyId,
      mode,
      Number(cfg.defaultHourlyCents || 0),
      cfg.departmentRates || {},
      cfg.userDepartments || {},
      cfg.userHourlyCents || {},
      cfg.userMonthlyCents || {}
    ]
  );
  return row[0];
}

// GET Konfiguration
app.get('/api/companies/:companyId/compensation-config',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const data = await loadCompensationConfig(req.params.companyId);
      res.json(data);
    } catch (e) {
      console.error('compensation-config GET error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// PUT Konfiguration
app.put('/api/companies/:companyId/compensation-config',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const saved = await upsertCompensationConfig(req.params.companyId, req.body || {});
      res.json(saved);
    } catch (e) {
      console.error('compensation-config PUT error:', e);
      res.status(400).json({ message: e.message || 'Speichern fehlgeschlagen' });
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Monatskosten berechnen (mit Pausen: break_minutes → Nettozeit)
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/compensation-costs',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const month = String(req.query.month || '').trim(); // 'YYYY-MM'
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ message: 'month=YYYY-MM erforderlich' });
      }

      const cfg = await loadCompensationConfig(companyId);

      // Alle User + Aggregation ihrer Zeiten für den Monat (inkl. User ohne Zeiten)
      const rows = await query(
        `SELECT
            u.id AS "userId",
            u.username,
            COALESCE(SUM(CASE WHEN w.date IS NOT NULL THEN COALESCE(w.break_minutes,0) ELSE 0 END),0)::int AS "breakMinutes",
            COALESCE(SUM(
              CASE WHEN w.start_time IS NOT NULL AND w.end_time IS NOT NULL
                   THEN EXTRACT(EPOCH FROM (w.end_time - w.start_time))/60.0
                   ELSE 0 END
            ),0) AS "grossMinutes",
            COALESCE(SUM(
              GREATEST(
                0,
                CASE WHEN w.start_time IS NOT NULL AND w.end_time IS NOT NULL
                     THEN EXTRACT(EPOCH FROM (w.end_time - w.start_time))/60.0
                     ELSE 0 END
                - COALESCE(w.break_minutes,0)
              )
            ),0) AS "netMinutes"
         FROM users u
         LEFT JOIN work_times w
           ON w.company_id = u.company_id
          AND w.user_id    = u.id
          AND to_char(w.date,'YYYY-MM') = $2
        WHERE u.company_id = $1
        GROUP BY u.id, u.username
        ORDER BY u.username`,
        [companyId, month]
      );

      // Helpers für Sätze/Gehälter
      const getDeptRate = (userId) => {
        const dept = (cfg.userDepartments || {})[userId];
        if (!dept) return 0;
        return Number((cfg.departmentRates || {})[dept] || 0);
      };
      const getHourly  = (userId) => Number((cfg.userHourlyCents  || {})[userId] || 0);
      const getMonthly = (userId) => Number((cfg.userMonthlyCents || {})[userId] || 0);

      const items = [];
      let totalCents = 0;

      for (const r of rows) {
        const userId       = String(r.userId);
        const username     = r.username;
        const breakMinutes = Math.round(Number(r.breakMinutes || 0));
        const netMinutes   = Math.round(Number(r.netMinutes   || 0));
        const hours        = netMinutes / 60; // Netto-Stunden

        if (cfg.mode === 'perUserMonthly') {
          const monthly = getMonthly(userId);
          items.push({
            userId: r.userId,
            username,
            // Für Vollständigkeit liefern wir auch bei Monatslohn die Felder mit:
            minutes: netMinutes,
            hours,
            breakMinutes,
            type: 'monthly',
            rateCents: monthly,
            costCents: monthly
          });
          totalCents += monthly;
        } else {
          let rate = 0;
          if (cfg.mode === 'uniform') {
            rate = Number(cfg.defaultHourlyCents || 0);
          } else if (cfg.mode === 'department') {
            rate = getDeptRate(userId);
          } else if (cfg.mode === 'perUserHourly') {
            rate = getHourly(userId);
          }
          const cost = Math.round((netMinutes / 60) * rate);

          items.push({
            userId: r.userId,
            username,
            minutes: netMinutes,   // Netto-Minuten
            hours,
            breakMinutes,          // Pausen-Minuten → Frontend-Spalte „Pausen“
            type: 'hourly',
            rateCents: rate,
            costCents: cost
          });
          totalCents += cost;
        }
      }

      res.json({
        month,
        mode: cfg.mode,
        items,
        totalCents
      });
    } catch (e) {
      console.error('compensation-costs GET error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Devices (Uhren) + kompatible "clocks"-Route
// Erwartet in .env: DEVICE_SHARED_KEY (Fallback: CLOCK_SHARED_SECRET)
// DB: devices(serial UNIQUE), optional: company_id, name, notes, mac, ip, version, last_seen
// ───────────────────────────────────────────────────────────────────────────────

// Heartbeat vom Gerät (ohne Auth-JWT, mit shared key)
app.post('/api/devices/heartbeat', async (req, res) => {
  try {
    const SHARED = String(process.env.DEVICE_SHARED_KEY || process.env.CLOCK_SHARED_SECRET || '').trim();
    const { serial, mac, ip, version, name, notes, key } = req.body || {};

    if (!serial) return res.status(422).json({ message: 'serial erforderlich' });

    const bodyKey = String(key || '').trim();
    if (SHARED && (!bodyKey || bodyKey !== SHARED)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [row] = await query(
      `INSERT INTO devices(serial, mac, ip, version, name, notes, last_seen)
       VALUES($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (serial) DO UPDATE
         SET mac       = COALESCE(EXCLUDED.mac,      devices.mac),
             ip        = COALESCE(EXCLUDED.ip,       devices.ip),
             version   = COALESCE(EXCLUDED.version,  devices.version),
             name      = COALESCE(EXCLUDED.name,     devices.name),
             notes     = COALESCE(EXCLUDED.notes,    devices.notes),
             last_seen = now()
       RETURNING id, serial, mac, ip, version, name, notes,
                 company_id AS "companyId",
                 last_seen  AS "lastSeen"`,
      [serial, mac || null, ip || null, version || null, name || null, notes || null]
    );
    // ⬇️ REGISTRIERUNG + Online-Meldung (first heartbeat / zurück aus offline)
    try {
      if (typeof global.registerHeartbeat === 'function') {
        const meta = {
          ip: (ip || req.ip || req.headers['x-forwarded-for'] || '').toString(),
          mac: mac || undefined,
          version: version || undefined,
          name: name || undefined,
        };
        global.registerHeartbeat(serial, meta);
      }
    } catch (e) {
      console.warn('registerHeartbeat failed:', e?.message || e);
    }

    res.json(row);
  } catch (e) {
    console.error('Heartbeat error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Device Logs Ingest (vom Gerät) – ohne JWT, mit shared key (wie heartbeat)
// Body: { serial, level: 'info'|'warn'|'error', code?, message, meta? }
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/devices/logs', async (req, res) => {
  try {
    const SHARED = String(process.env.DEVICE_SHARED_KEY || process.env.CLOCK_SHARED_SECRET || '').trim();
    const { serial, deviceId, level, code, message, meta, key } = req.body || {};

    if (!serial && !deviceId) return res.status(422).json({ message: 'serial oder deviceId erforderlich' });
    const bodyKey = String(key || '').trim();
    if (SHARED && (!bodyKey || bodyKey !== SHARED)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const lvl = String(level || 'info').toLowerCase();
    if (!['info','warn','error'].includes(lvl)) return res.status(422).json({ message: 'level ungültig' });

    let dev = null;
    if (deviceId) {
      const d = await query(`SELECT id, company_id AS "companyId", serial FROM devices WHERE id=$1`, [deviceId]);
      dev = d[0] || null;
    } else if (serial) {
      const d = await query(`SELECT id, company_id AS "companyId", serial FROM devices WHERE serial=$1`, [serial]);
      dev = d[0] || null;
    }

    const logRows = await query(
      `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, company_id AS "companyId", device_id AS "deviceId", serial, level, code, message, meta, created_at AS "createdAt"`,
      [dev?.companyId || null, dev?.id || deviceId || null, dev?.serial || serial || null, lvl, code || null, message || null, meta || null]
    );
    const saved = logRows[0];

    if (saved.companyId) emitLog(String(saved.companyId), { type:'log', log: saved });
    res.json({ success:true, log: saved });
  } catch (e) {
    console.error('device log ingest error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Device Logs – REST
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/device-logs',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const companyId = req.params.companyId;
      const level = String(req.query.level || 'all').toLowerCase();
      const q = String(req.query.q || '').trim();
      let limit = parseInt(String(req.query.limit || '200'), 10);
      if (isNaN(limit) || limit <= 0) limit = 200;
      if (limit > 1000) limit = 1000;

      const params = [companyId];
      const where = ['company_id = $1'];

      if (['info','warn','error'].includes(level)) {
        params.push(level);
        where.push(`level = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        params.push(`%${q}%`);
        params.push(`%${q}%`);
        where.push(`(coalesce(serial,'') ILIKE $${params.length-2} OR coalesce(code,'') ILIKE $${params.length-1} OR coalesce(message,'') ILIKE $${params.length})`);
      }

      const rows = await query(
        `SELECT id, serial, level, code, message, meta, created_at AS "createdAt",
                device_id AS "deviceId", company_id AS "companyId"
           FROM device_logs
          WHERE ${where.join(' AND ')}
          ORDER BY created_at DESC
          LIMIT ${limit}`,
        params
      );
      res.json(rows);
    } catch (e) {
      console.error('device-logs list error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// ───────────────────────────────────────────────────────────────────────────────
// Device Logs – SSE Stream
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/device-logs/stream', authenticateHeaderOrQuery, (req,res)=>{
  const { role } = req.user || {};
  if (!(role === 'admin' || role === 'companyAdmin')) return res.status(403).end();
  const companyId = String(req.params.companyId);
  res.set({
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive'
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write(`event: hello\ndata: {}\n\n`);
  const ping = setInterval(()=>{ try{ res.write(`event: ping\ndata: {}\n\n`);}catch{} }, 25000);
  addLogsClient(companyId, res);
  req.on('close', ()=>{ clearInterval(ping); removeLogsClient(companyId, res); });
});

// ───────────────────────────────────────────────────────────────────────────────
// Device Stamp – Uhr sendet UID, Server macht Rounding/Cooldown/Toggle
// Auth: shared key (wie heartbeat). Body: { serial, uid, key, ts? }
// Antwort: { ok, action:'in'|'out'|'cooldown', username, date, time, cooldownRemainingSec? }
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/devices/stamp', async (req, res) => {
  const SHARED = String(process.env.DEVICE_SHARED_KEY || process.env.CLOCK_SHARED_SECRET || '').trim();

  // kleine Helper nur für diese Route
  const minutesFromHHMM = (s) => {
    if (!s || typeof s !== 'string') return null;
    const [h, m] = s.slice(0,5).split(':').map(n => parseInt(n,10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h*60 + m;
  };
  const hhmm = (d) => String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');

  try {
    const { serial, uid, key, ts, import: isImport, tsStart, tsEnd } = req.body || {};

    if (!serial || !uid) {
      return res.status(422).json({ ok:false, code:'bad_request', message:'serial und uid erforderlich' });
    }
    if (SHARED && String(key || '') !== SHARED) {
      return res.status(401).json({ ok:false, code:'unauthorized', message:'Shared key ungültig' });
    }

    // BACKEND — /api/devices/stamp: Timestamp robust parsen
// Ort: direkt unter minutesFromHHMM / hhmm einfügen
function parseStampTs(input) {
  if (!input) return new Date();
  let s = String(input).trim();

  // 6 Nachkommastellen (Mikrosekunden) → auf Millisekunden kürzen
  s = s.replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d{3})\d{3}(Z|[+-]\d{2}:\d{2})?$/,
    '$1.$2$3'
  );

  // Falls keine TZ angegeben → lokale Zeit aus YYYY-MM-DDTHH:MM(:SS[.ms]) bauen
  if (!/[Zz]|[+-]\d{2}:\d{2}$/.test(s) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?$/.test(s)) {
    const [datePart, timePart] = s.split('T');
    const [Y, M, D] = datePart.split('-').map(Number);
    const [h, m, rest] = timePart.split(':');
    const [secStr, msStr='0'] = String(rest || '0').split('.');
    const dt = new Date(Number(Y), Number(M)-1, Number(D), Number(h), Number(m), Number(secStr), Number(msStr));
    if (!isNaN(dt.getTime())) return dt;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

    // Gerät & Firma holen
    const dev = (await query(
      `SELECT id, company_id AS "companyId", serial
         FROM devices
        WHERE serial=$1`,
      [serial]
    ))[0];

    if (!dev || !dev.companyId) {
      await query(
        `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
         VALUES($1,$2,$3,'error','NO_COMPANY','Uhr keiner Firma zugewiesen', NULL)`,
        [dev?.companyId || null, dev?.id || null, serial]
      );
      return res.status(409).json({ ok:false, code:'no_company', message:'Uhr keiner Firma zugewiesen' });
    }

    // ──────────────────────── NEU: IMPORT-BYPASS ────────────────────────
    // CSV-Import (fertige Intervalle) → direkt in work_times schreiben
    if (isImport === true) {
      if (!tsStart || !tsEnd) {
        return res.status(400).json({ ok:false, code:'missing_fields', message:'tsStart/tsEnd erforderlich' });
      }

      // robustes Parsing ohne TZ-Zicken (nehmen local HH:MM aus String)
      const splitIso = (s) => {
        const str = String(s).trim();
        const [d,t] = str.split('T');
        return { date: d, hhmm: (t||'').slice(0,5) };
      };
      const s1 = splitIso(tsStart);
      const s2 = splitIso(tsEnd);
      if (!s1.date || !s1.hhmm || !s2.date || !s2.hhmm || s1.date !== s2.date) {
        return res.status(400).json({ ok:false, code:'bad_ts', message:'tsStart/tsEnd ungültig oder über Tagesgrenze' });
      }

      // Nutzer via UID (Doppelpunkte egal)
      const u = (await query(
        `SELECT id, username
           FROM users
          WHERE company_id=$1
            AND UPPER(REPLACE(tag_id, ':','')) = UPPER(REPLACE($2, ':',''))
          LIMIT 1`,
        [dev.companyId, uid]
      ))[0];

      if (!u) {
        await query(
          `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
           VALUES($1,$2,$3,'error','UNKNOWN_TAG','Unbekannte UID',
                  jsonb_build_object('uid',$4::text))`,
          [dev.companyId, dev.id, serial, uid]
        );
        return res.status(404).json({ ok:false, code:'unknown_tag', message:'Tag unbekannt' });
      }

      // Idempotenz: exakt gleiche Zeile schon vorhanden?
      const dup = await query(
        `SELECT 1
           FROM work_times
          WHERE company_id=$1 AND user_id=$2
            AND date=$3::date AND start_time=$4::time AND end_time=$5::time
          LIMIT 1`,
        [dev.companyId, u.id, s1.date, s1.hhmm, s2.hhmm]
      );
      if (dup?.length) {
        return res.json({ ok:true, imported:0, duplicate:true, username:u.username, date:s1.date, start:s1.hhmm, end:s2.hhmm });
      }

      await query(
        `INSERT INTO work_times(id, company_id, user_id, date, start_time, end_time, source)
         VALUES(gen_random_uuid(), $1, $2, $3::date, $4::time, $5::time, 'import')`,
        [dev.companyId, u.id, s1.date, s1.hhmm, s2.hhmm]
      );

      await query(
        `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
         VALUES($1,$2,$3,'info','IMPORT','Interval übernommen',
                jsonb_build_object('uid',$4::text,'userId',$5::text,'date',$6::text,'start',$7::text,'end',$8::text))`,
        [dev.companyId, dev.id, serial, uid, String(u.id), s1.date, s1.hhmm, s2.hhmm]
      );

      return res.json({ ok:true, imported:1, username:u.username, date:s1.date, start:s1.hhmm, end:s2.hhmm });
    }
    // ─────────────────── Ende Import-Bypass (Rest wie vorher) ───────────────────

    // Nutzer per Tag (case-insensitive) in derselben Firma
    const user = (await query(
      `SELECT id, username
         FROM users
        WHERE company_id=$1 AND upper(tag_id)=upper($2)`,
      [dev.companyId, uid]
    ))[0];

    if (!user) {
      await query(
        `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
         VALUES($1,$2,$3,'error','UNKNOWN_TAG','Unbekannte UID',
                jsonb_build_object('uid',$4::text))`,
        [dev.companyId, dev.id, serial, uid]
      );
      return res.status(404).json({ ok:false, code:'unknown_tag', message:'Tag unbekannt' });
    }

    // Zeitpunkt bestimmen & runden (lokal)
    const now = parseStampTs(ts);
    const dateStr = now.toISOString().slice(0,10); // YYYY-MM-DD
    const timeRounded = roundToMinuteString(now, DEVICE_ROUND_MIN); // 'HH:MM'

    // Cooldown: letztes Event heute als 'HH:MM' ziehen, dann Differenz
    const last = (await query(
      `SELECT to_char(COALESCE(end_time, start_time),'HH24:MI') AS last
         FROM work_times
        WHERE company_id=$1 AND user_id=$2 AND date=$3::date
        ORDER BY COALESCE(end_time, start_time) DESC
        LIMIT 1`,
      [dev.companyId, user.id, dateStr]
    ))[0];

    if (last?.last) {
      const lastMin = minutesFromHHMM(last.last);
      const nowMin = now.getHours()*60 + now.getMinutes();
      let diffMin = nowMin - lastMin;
      if (diffMin < 0) diffMin += 24*60;

      if (diffMin < DEVICE_COOLDOWN_MIN) {
        const remainingSec = Math.max(0, Math.round((DEVICE_COOLDOWN_MIN - diffMin) * 60));
        await query(
          `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
           VALUES($1,$2,$3,'warn','COOLDOWN','Stamp in Cooldown',
                  jsonb_build_object('uid',$4::text,'userId',$5::text,'remainingSec',$6::int))`,
          [dev.companyId, dev.id, serial, uid, String(user.id), remainingSec]
        );
        return res.json({
          ok: true,
          action: 'cooldown',
          username: user.username,
          date: dateStr,
          time: timeRounded,
          cooldownRemainingSec: remainingSec
        });
      }
    }

    // Offene Zeile heute?
    const open = (await query(
      `SELECT id
         FROM work_times
        WHERE company_id=$1 AND user_id=$2 AND date=$3::date AND end_time IS NULL
        ORDER BY start_time DESC
        LIMIT 1`,
      [dev.companyId, user.id, dateStr]
    ))[0];

    let action, recordId;
    if (open) {
      // AUSSTEMPELN
      const upd = await query(
        `UPDATE work_times
            SET end_time = $4::time, source='device'
          WHERE id=$1 AND company_id=$2 AND user_id=$3
        RETURNING id`,
        [open.id, dev.companyId, user.id, timeRounded]
      );
      action = 'out';
      recordId = upd?.[0]?.id || open.id;
    } else {
      // EINSTEMPELN
      const ins = await query(
        `INSERT INTO work_times(id, company_id, user_id, date, start_time, end_time, source)
         VALUES(gen_random_uuid(), $1, $2, $3::date, $4::time, NULL, 'device')
         RETURNING id`,
        [dev.companyId, user.id, dateStr, timeRounded]
      );
      action = 'in';
      recordId = ins[0].id;
    }

    // Wenn ausgestempelt wurde → Pausen nach Policy für den Tag aktualisieren
    if (action === 'out') {
      try { await upsertBreakForDay(dev.companyId, user.id, dateStr); } catch {}
    }

    // Loggen (alle Meta-Werte sauber casten)
    await query(
      `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
       VALUES($1,$2,$3,'info','STAMP','OK',
              jsonb_build_object('uid',$4::text,'userId',$5::text,'action',$6::text,'date',$7::text,'time',$8::text,'recordId',$9::text))`,
      [dev.companyId, dev.id, serial, uid, String(user.id), action, dateStr, timeRounded, String(recordId)]
    );

    return res.json({ ok: true, action, username: user.username, date: dateStr, time: timeRounded });

  } catch (e) {
    console.error('device stamp error:', e);
    // zusätzlich ins Gerätelog, damit es im Web auftaucht
    try {
      const serial = (req.body && req.body.serial) || null;
      const dev = serial
        ? (await query(`SELECT id, company_id AS "companyId" FROM devices WHERE serial=$1`, [serial]))[0]
        : null;
      await query(
        `INSERT INTO device_logs(company_id, device_id, serial, level, code, message, meta)
         VALUES($1,$2,$3,'error','STAMP_SERVER_ERROR','Unhandled error in /devices/stamp',
                jsonb_build_object('err',$4::text))`,
        [dev?.companyId || null, dev?.id || null, serial, String(e && e.message || e)]
      );
    } catch {}
    return res.status(500).json({ ok:false, code:'server_error', message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Tag-Snapshot für Offline-Cache der Uhr
// GET /api/devices/:serial/tag-snapshot?key=SHARED
// Antwort: { version, tags: [{ userId, username, uid }] }
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/devices/:serial/tag-snapshot', async (req, res) => {
  try {
    const SHARED = String(process.env.DEVICE_SHARED_KEY || process.env.CLOCK_SHARED_SECRET || '').trim();
    const { serial } = req.params;
    const { key } = req.query;
    if (SHARED && String(key || '') !== SHARED) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [dev] = await query(
      `SELECT id, company_id AS "companyId" FROM devices WHERE serial=$1`,
      [serial]
    );
    if (!dev) return res.status(404).json({ message: 'Device not found' });
    if (!dev.companyId) return res.status(409).json({ message: 'Device has no company' });

    const rows = await query(
      `SELECT id AS "userId", username, upper(tag_id) AS uid
         FROM users
        WHERE company_id=$1 AND tag_id IS NOT NULL`,
      [dev.companyId]
    );

    const concat = rows.map(r => `${r.uid}:${r.userId}`).sort().join('|');
    const version = crypto.createHash('md5').update(concat).digest('hex');

    res.json({ version, tags: rows });
  } catch (e) {
    console.error('tag-snapshot error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// (Optional) Bestehende Light-API belassen – backward kompatibel
app.get('/api/devices/tags', async (req, res) => {
  try {
    const { serial, key } = req.query || {};
    const SHARED = String(process.env.DEVICE_SHARED_KEY || process.env.CLOCK_SHARED_SECRET || '').trim();
    if (!serial) return res.status(422).json([]);
    if (SHARED && String(key || '') !== SHARED) return res.status(401).json([]);

    const dev = (await query(
      `SELECT company_id AS "companyId" FROM devices WHERE serial=$1`,
      [serial]
    ))[0];
    if (!dev?.companyId) return res.json([]);

    const rows = await query(
      `SELECT upper(tag_id) AS uid, username
         FROM users
        WHERE company_id=$1 AND tag_id IS NOT NULL`,
      [dev.companyId]
    );
    res.json(rows);
  } catch {
    res.json([]);
  }
});


// Admin-Liste aller Geräte (optional filter: ?unassigned=true, ?companyId=uuid)
app.get('/api/devices', authenticate, requireAdmin, async (req, res) => {
  try {
    const { unassigned, companyId } = req.query;
    const params = [];
    const where = [];
    if (String(unassigned || '') === 'true') where.push('d.company_id IS NULL');
    if (companyId) { params.push(companyId); where.push(`d.company_id = $${params.length}`); }

    const rows = await query(
      `SELECT d.id, d.serial, d.name, d.notes, d.company_id AS "companyId",
              d.last_seen AS "lastSeen", d.version, d.ip, d.mac,
              c.name AS "companyName",
              (NOW() - d.last_seen) < INTERVAL '2 minutes' AS "isOnline"
         FROM devices d
         LEFT JOIN companies c ON c.id = d.company_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY d.last_seen DESC NULLS LAST`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching devices:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Geräte einer Firma – Admin ODER CompanyAdmin
// (liefert weiterhin "clocks"-kompatible Struktur fürs Frontend)
app.get('/api/companies/:companyId/clocks', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.id, d.serial, d.name, d.notes,
              d.last_seen AS "lastSeen", d.version, d.ip, d.mac,
              (NOW() - d.last_seen) < INTERVAL '2 minutes' AS "online"
         FROM devices d
        WHERE d.company_id = $1
        ORDER BY d.last_seen DESC NULLS LAST`,
      [req.params.companyId]
    );

    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      serial: r.serial,
      mac: r.mac,
      ip: r.ip,
      version: r.version,
      online: !!r.online,
      lastSeen: r.lastSeen,
      notes: r.notes
    })));
  } catch (e) {
    console.error('GET /companies/:companyId/clocks failed', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Gerät umbenennen / Notizen ändern – Admin ODER CompanyAdmin (nur eigene Firma)
app.put('/api/devices/:id', authenticate, async (req, res) => {
  const { name, notes } = req.body || {};
  if (name == null && notes == null) {
    return res.status(400).json({ message: 'name oder notes erforderlich' });
  }
  try {
    const dev = await query(`SELECT company_id FROM devices WHERE id = $1`, [req.params.id]);
    if (!dev.length) return res.status(404).json({ message: 'Device nicht gefunden' });

    const deviceCompany = dev[0].company_id;
    const { role, companyId } = req.user;
    if (!(role === 'admin' || (role === 'companyAdmin' && deviceCompany === companyId))) {
      return res.status(403).json({ message: 'Nicht berechtigt' });
    }

    const [row] = await query(
      `UPDATE devices
          SET name  = COALESCE($2, name),
              notes = COALESCE($3, notes)
        WHERE id = $1
      RETURNING id, serial, name, notes, company_id AS "companyId"`,
      [req.params.id, name ?? null, notes ?? null]
    );
    res.json({ success: true, device: row });
  } catch (err) {
    console.error('Update device error:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Gerät -> Firma zuweisen (nur Admin)
app.post('/api/devices/:id/assign-company', authenticate, requireAdmin, async (req, res) => {
  try {
    const { companyId } = req.body || {};
    if (!companyId) return res.status(422).json({ message: 'companyId erforderlich' });

    const [row] = await query(
      `UPDATE devices SET company_id=$2 WHERE id=$1
       RETURNING id, serial, name, company_id AS "companyId"`,
      [req.params.id, companyId]
    );
    if (!row) return res.status(404).json({ message: 'Device nicht gefunden' });
    res.json({ success: true, device: row });
  } catch (e) {
    console.error('Assign device error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Gerät von Firma lösen (nur Admin)
app.post('/api/devices/:id/unassign', authenticate, requireAdmin, async (req, res) => {
  try {
    const [row] = await query(
      `UPDATE devices SET company_id=NULL WHERE id=$1
       RETURNING id, serial, name, company_id AS "companyId"`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ message: 'Device nicht gefunden' });
    res.json({ success: true, device: row });
  } catch (e) {
    console.error('Unassign device error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Update-Channel für alle Geräte einer Firma (nur Admin)
app.post('/api/companies/:companyId/update-channel', authenticate, requireAdmin, async (req, res) => {
  const { channel } = req.body || {};
  if (!['stable', 'beta'].includes(channel)) {
    return res.status(400).json({ message: 'Ungültiger Channel' });
  }
  try {
    const suffix = channel === 'beta' ? '-beta' : '';
    await query(
      `UPDATE devices
          SET version = regexp_replace(COALESCE(version,''), '-beta$', '') || $2
        WHERE company_id = $1`,
      [req.params.companyId, suffix]
    );
    res.json({ success: true, channel });
  } catch (err) {
    console.error('Update channel error:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Schedule + SSE
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/companies/:companyId/schedule', authenticate, async (req, res) => {
  try {
    const rows = await query(
      `SELECT s.id, to_char(s.date,'YYYY-MM-DD') AS date, s.user_id AS "userId", u.username
         FROM schedule s
         JOIN users u ON s.user_id = u.id
        WHERE s.company_id = $1
        ORDER BY s.date DESC`,
      [req.params.companyId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Ersetzt den bisherigen POST /api/companies/:companyId/schedule
app.post('/api/companies/:companyId/schedule', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    const companyId = String(req.params.companyId);
    const { date, userId } = req.body || {};

    const dateOnly = String(date || '').slice(0, 10);
    if (!dateOnly || !userId) {
      return res.status(400).json({ message: 'date (YYYY-MM-DD) und userId erforderlich' });
    }

    // Nutzer muss zur Firma gehören
    const userRows = await query(
      `SELECT id, username FROM users WHERE id=$1 AND company_id=$2`,
      [userId, companyId]
    );
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ message: 'User nicht gefunden oder falsche Firma' });
    }

    // Urlaub/Wunschfrei an diesem Tag? (pending ODER approved → blocken)
    const vac = await query(
      `SELECT kind, status
         FROM vacation_requests
        WHERE company_id=$1
          AND user_id=$2
          AND status IN ('pending','approved')
          AND $3::date BETWEEN start_date AND end_date
        LIMIT 1`,
      [companyId, userId, dateOnly]
    );
    if (vac.length) {
      const v = vac[0];
      const kindLabel = v.kind === 'vacation' ? 'Urlaub' : 'Wunschfrei';
      const stLabel   = v.status === 'approved' ? 'genehmigt' : 'beantragt';
      return res.status(409).json({
        message: `Mitarbeiter hat ${kindLabel} (${stLabel}) am ${new Date(dateOnly).toLocaleDateString('de-DE')}.`
      });
    }

    // Eintrag speichern (Duplicate werden durch ON CONFLICT abgefangen)
    const rows = await query(
      `INSERT INTO schedule(company_id, user_id, date)
       VALUES($1, $2, $3::date)
       ON CONFLICT (company_id, user_id, date) DO NOTHING
       RETURNING id, to_char(date,'YYYY-MM-DD') AS date, user_id AS "userId"`,
      [companyId, userId, dateOnly]
    );

    let entry;
    if (rows.length) {
      entry = rows[0];
    } else {
      // Bereits vorhanden → sauber zurückgeben
      [entry] = await query(
        `SELECT id, to_char(date,'YYYY-MM-DD') AS date, user_id AS "userId"
           FROM schedule
          WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
        [companyId, userId, dateOnly]
      );
      if (!entry) {
        return res.status(500).json({ message: 'Konnte Eintrag nicht erstellen/finden' });
      }
    }

    // Live-Update
    emitSchedule(companyId, {
      type: 'upsert',
      id: entry.id,
      date: entry.date,
      userId: entry.userId,
      username: user.username
    });

    return res.json({
      id: entry.id,
      date: entry.date,
      userId: entry.userId,
      username: user.username
    });
  } catch (err) {
    console.error('Error creating schedule entry:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.delete('/api/companies/:companyId/schedule/:id', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  try {
    await query('DELETE FROM schedule WHERE id = $1', [req.params.id]);
    emitSchedule(String(req.params.companyId), { type:'delete', id:req.params.id });
    res.status(204).end();
  } catch (err) {
    console.error('Error deleting schedule entry:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.get('/api/companies/:companyId/schedule/stream', authenticateHeaderOrQuery, (req,res)=>{
  if (!(req.user.role === 'admin' || req.user.role === 'companyAdmin')) return res.status(403).end();
  const companyId = String(req.params.companyId);
  res.set({
    'Content-Type':'text/event-stream; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'Connection':'keep-alive'
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  res.write(`event: hello\ndata: {}\n\n`);
  const ping = setInterval(()=>{ try{ res.write(`event: ping\ndata: {}\n\n`);}catch{} }, 25000);
  addScheduleClient(companyId, res);
  req.on('close', ()=>{ clearInterval(ping); removeScheduleClient(companyId, res); });
});

// ─── Attendance Overview (expected vs clocked) ────────────────────────────────
app.get('/api/companies/:companyId/attendance', authenticate, requireCompanyOrSystemAdmin, async (req, res) => {
  const companyId = req.params.companyId;
  const date = String((req.query.date || new Date().toISOString().slice(0,10))).slice(0,10);

  try {
    // Geplante Mitarbeiter + Work-Time an dem Tag
    const expected = await query(
      `SELECT
         u.id                         AS "userId",
         u.username                   AS "username",
         (wt.id IS NOT NULL)          AS "clockedIn",
         to_char(wt.start_time,'HH24:MI') AS "start",
         to_char(wt.end_time,'HH24:MI')   AS "end"
       FROM schedule s
       JOIN users u
         ON u.id = s.user_id
       LEFT JOIN work_times wt
         ON wt.company_id = s.company_id
        AND wt.user_id   = s.user_id
        AND wt.date      = s.date
      WHERE s.company_id = $1
        AND s.date = $2::date
      ORDER BY u.username`,
      [companyId, date]
    );

    // Eingestempelt ohne Plan
    const unexpected = await query(
      `SELECT
         u.id                         AS "userId",
         u.username                   AS "username",
         to_char(wt.start_time,'HH24:MI') AS "start",
         to_char(wt.end_time,'HH24:MI')   AS "end"
       FROM work_times wt
       JOIN users u
         ON u.id = wt.user_id
       LEFT JOIN schedule s
         ON s.company_id = wt.company_id
        AND s.user_id   = wt.user_id
        AND s.date      = wt.date
      WHERE wt.company_id = $1
        AND wt.date = $2::date
        AND s.id IS NULL
      ORDER BY u.username`,
      [companyId, date]
    );

    res.json({ date, expected, unexpected });
  } catch (e) {
    console.error('Error building attendance overview:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// WorkingHoursConfig
// ───────────────────────────────────────────────────────────────────────────────

// ─── Working Hours Config (company-level) ──────────────────────────────────────
// Get config + opening hours
app.get('/api/companies/:companyId/working-hours-config',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    const companyId = req.params.companyId;
    try {
      const [cfg] = await query(
        `SELECT mode, uniform_weekly_target_minutes AS "uniformWeeklyTargetMinutes"
           FROM company_working_config
          WHERE company_id = $1`,
        [companyId]
      );

      const hours = await query(
        `SELECT weekday, to_char(open_time,'HH24:MI') AS open, to_char(close_time,'HH24:MI') AS close
           FROM company_opening_hours
          WHERE company_id = $1
          ORDER BY weekday`,
        [companyId]
      );

      // response normalized: openingHours: [{weekday, open, close}] with open/close or null
      res.json({
        mode: cfg?.mode || 'none',
        uniformWeeklyTargetMinutes: cfg?.uniformWeeklyTargetMinutes ?? null,
        openingHours: hours.map(h => ({
          weekday: h.weekday,
          open: h.open || null,
          close: h.close || null
        }))
      });
    } catch (e) {
      console.error('Error fetching working-hours-config:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// Upsert config + opening hours
app.put('/api/companies/:companyId/working-hours-config',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    const companyId = req.params.companyId;
    const { mode, uniformWeeklyTargetMinutes, openingHours } = req.body || {};
    const modes = new Set(['none','uniform','perEmployee']);
    if (!modes.has(mode)) return res.status(400).json({ message: 'Ungültiger mode' });

    if (mode === 'uniform' && (uniformWeeklyTargetMinutes == null || isNaN(uniformWeeklyTargetMinutes))) {
      return res.status(400).json({ message: 'uniformWeeklyTargetMinutes erforderlich (in Minuten)' });
    }

    try {
      await withTransaction(async (client) => {
        // upsert config
        await client.query(
          `INSERT INTO company_working_config(company_id, mode, uniform_weekly_target_minutes)
           VALUES($1,$2,$3)
           ON CONFLICT (company_id) DO UPDATE
             SET mode=EXCLUDED.mode,
                 uniform_weekly_target_minutes=EXCLUDED.uniform_weekly_target_minutes,
                 updated_at=NOW()`,
          [companyId, mode, mode === 'uniform' ? Number(uniformWeeklyTargetMinutes) : null]
        );

        if (Array.isArray(openingHours)) {
          // wir machen’s simpel: alle Tage löschen, neu schreiben
          await client.query(`DELETE FROM company_opening_hours WHERE company_id=$1`, [companyId]);
          for (const h of openingHours) {
            const wd = Number(h.weekday);
            if (isNaN(wd) || wd < 0 || wd > 6) continue;
            const open = h.open || null;
            const close = h.close || null;
            await client.query(
              `INSERT INTO company_opening_hours(company_id, weekday, open_time, close_time)
               VALUES($1,$2,$3::time,$4::time)`,
              [companyId, wd, open, close]
            );
          }
        }
      });

      res.json({ success: true });
    } catch (e) {
      console.error('Error saving working-hours-config:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// Per-employee targets (nur relevant bei mode='perEmployee')
app.get('/api/companies/:companyId/employee-weekly-targets',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    const companyId = req.params.companyId;
    try {
      const rows = await query(
        `SELECT u.id AS "userId", u.username,
                e.weekly_target_minutes AS "weeklyTargetMinutes", u.role
           FROM users u
           LEFT JOIN employee_weekly_targets e
             ON e.company_id = u.company_id AND e.user_id = u.id
          WHERE u.company_id = $1
          ORDER BY u.username`,
        [companyId]
      );
      res.json(rows);
    } catch (e) {
      console.error('Error fetching employee targets:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

app.put('/api/companies/:companyId/employee-weekly-targets',
  authenticate, requireCompanyOrSystemAdmin,
  async (req, res) => {
    const companyId = req.params.companyId;
    const { items } = req.body || {};
    if (!Array.isArray(items)) return res.status(400).json({ message: 'items[] erforderlich' });

    try {
      await withTransaction(async (client) => {
        for (const it of items) {
          const userId = it.userId;
          const val = it.weeklyTargetMinutes;
          if (!userId) continue;

          if (val == null || isNaN(val)) {
            // null = Eintrag löschen
            await client.query(
              `DELETE FROM employee_weekly_targets WHERE company_id=$1 AND user_id=$2`,
              [companyId, userId]
            );
          } else {
            await client.query(
              `INSERT INTO employee_weekly_targets(company_id, user_id, weekly_target_minutes)
               VALUES($1,$2,$3)
               ON CONFLICT (company_id, user_id) DO UPDATE
                 SET weekly_target_minutes=EXCLUDED.weekly_target_minutes`,
              [companyId, userId, Number(val)]
            );
          }
        }
      });
      res.json({ success: true });
    } catch (e) {
      console.error('Error saving employee targets:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// GET: eigenes Wochen-Soll des eingeloggten Users (nicht admin-only)
app.get('/api/working-hours/my-target', authenticate, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const userId = req.user.userId;

    const [cfg] = await query(
      `SELECT mode, uniform_weekly_target_minutes AS "uniformWeeklyTargetMinutes"
         FROM company_working_config
        WHERE company_id = $1`,
      [companyId]
    );

    let mode = cfg?.mode || 'none';
    let weeklyTargetMinutes = 0;

    if (mode === 'uniform') {
      weeklyTargetMinutes = Number(cfg?.uniformWeeklyTargetMinutes || 0);
    } else if (mode === 'perEmployee') {
      const r = await query(
        `SELECT weekly_target_minutes AS "weeklyTargetMinutes"
           FROM employee_weekly_targets
          WHERE company_id=$1 AND user_id=$2`,
        [companyId, userId]
      );
      weeklyTargetMinutes = Number(r?.[0]?.weeklyTargetMinutes || 0);
    } else {
      mode = 'none';
    }

    res.json({ mode, weeklyTargetMinutes });
  } catch (e) {
    console.error('my-target GET error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Vacation Policy / Balances – korrigierte Routen (mit Fallback-Anzeige)
// WICHTIG: Resturlaub wird NICHT automatisch aus der Policy geschrieben.
// Für die Anzeige/Checks nutzt /api/vacation-policy/mine ggf. den Policy-Wert,
// wenn noch KEIN Balance-Eintrag existiert. Es wird dabei NICHT in die DB geschrieben.
// Vorausgesetzt: loadVacationPolicy, getEffectiveAllowance, getBalance, setBalance,
// upsertVacationPolicy, query, authenticate, requireCompanyOrSystemAdmin
// ───────────────────────────────────────────────────────────────────────────────

// Effektive Regeln + eigener Resturlaub (lesen; KEIN Auto-Init; mit Fallback)
app.get('/api/vacation-policy/mine', authenticate, async (req, res) => {
  try {
    const { companyId, userId } = req.user;

    const pol         = await loadVacationPolicy(companyId);
    const myAllowance = await getEffectiveAllowance(companyId, userId); // z. B. 28
    const currentBal  = await getBalance(companyId, userId);            // kann null sein

    // Fallback für Anzeige/Checks: wenn keine Balance existiert, nimm Policy-Wert
    const remainingDays = (currentBal == null)
      ? Math.max(0, Number(myAllowance || 0))
      : Math.max(0, Number(currentBal));

    res.json({
      mode: pol.mode,
      uniformDays: pol.uniformDays ?? null,
      myAllowance,
      remainingDays,
      vacationEnabled: myAllowance > 0,
    });
  } catch (e) {
    console.error('vacation-policy mine error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Company-Level Policy lesen (Admin/CompanyAdmin)
app.get('/api/companies/:companyId/vacation-policy',
  authenticate,
  requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const policy = await loadVacationPolicy(companyId); // liefert Defaults, falls kein Datensatz
      res.json(policy);
    } catch (e) {
      console.error('vacation-policy GET error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// Company-Level Policy setzen (Admin/CompanyAdmin)
app.put('/api/companies/:companyId/vacation-policy',
  authenticate,
  requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const saved = await upsertVacationPolicy(companyId, req.body || {});
      res.json(saved);
    } catch (e) {
      console.error('vacation-policy PUT error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);

// Eigenen Resturlaub abrufen (nur reale Balance; KEIN Fallback, KEIN Auto-Init)
app.get('/api/vacation-balance/mine', authenticate, async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const currentBal = await getBalance(companyId, userId); // kann null sein
    res.json({ remainingDays: Math.max(0, Number(currentBal ?? 0)) });
  } catch (e) {
    console.error('vacation-balance mine error:', e);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

// Resturlaub eines Users ABSOLUT setzen (Admin/CompanyAdmin)
app.put('/api/companies/:companyId/vacation-balances/:userId',
  authenticate,
  requireCompanyOrSystemAdmin,
  async (req, res) => {
    try {
      const companyId = String(req.params.companyId);
      const userId    = String(req.params.userId);

      // Existenz prüfen
      const check = await query(
        `SELECT 1 FROM users WHERE id=$1 AND company_id=$2 LIMIT 1`,
        [userId, companyId]
      );
      if (!check.length) {
        return res.status(404).json({ message: 'User nicht gefunden' });
      }

      const val = Number(req.body?.remainingDays);
      if (!Number.isFinite(val) || val < 0) {
        return res.status(400).json({ message: 'remainingDays >= 0 erforderlich' });
      }

      await setBalance(companyId, userId, Math.floor(val));
      const newBal = await getBalance(companyId, userId);
      res.json({ userId, remainingDays: Math.max(0, Number(newBal ?? 0)) });
    } catch (e) {
      console.error('vacation-balance set error:', e);
      res.status(500).json({ message: 'Server-Fehler' });
    }
  }
);


// ───────────────────────────────────────────────────────────────────────────────
// Swap / Übergabe
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/schedule/swap-request', authenticate, async (req, res) => {
  let { date, from, to } = req.body;
  try {
    const companyId = req.user.companyId;
    const dateOnly = String(date || '').slice(0,10);
    if (!dateOnly) return res.status(400).json({ message:'Datum fehlt' });

    const { rows:[has] } = await pool.query(
      `SELECT 1 FROM schedule WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
      [companyId, from, dateOnly]
    );
    if (!has) return res.status(422).json({ message:'Du hast an diesem Tag keinen Dienst.' });

    await query(
      `INSERT INTO swap_requests(company_id, date, requester, target)
       VALUES($1,$2::date,$3,$4)`,
      [companyId, dateOnly, from, to]
    );
    res.json({ success:true });
  } catch (e) {
    console.error('Error creating swap request:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.get('/api/schedule/swap-requests', authenticate, async (req, res) => {
  const { companyId, userId } = req.user;
  try {
    const rows = await query(
      `SELECT sr.id,
              sr.date,
              sr.status,
              sr.created_at AS "createdAt",
              sr.requester,
              ru.username   AS "requesterName",
              sr.target,
              tu.username   AS "targetName"
         FROM swap_requests sr
         JOIN users ru ON ru.id = sr.requester
         JOIN users tu ON tu.id = sr.target
        WHERE sr.company_id = $1
          AND sr.target     = $2
          AND sr.status     = 'pending'
        ORDER BY sr.created_at DESC`,
      [companyId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching swap requests:', err);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

app.get('/api/schedule/my-swap-requests', authenticate, async (req,res)=>{
  const { companyId, userId } = req.user;
  try {
    const rows = await query(
      `SELECT to_char(date,'YYYY-MM-DD') AS date
         FROM swap_requests
        WHERE company_id=$1 AND requester=$2 AND status='pending'
        ORDER BY date DESC`,
      [companyId, userId]
    );
    res.json(rows);
  } catch(e){
    console.error('Error fetching my swap requests:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/schedule/swap-requests/:id/accept', authenticate, async (req,res)=>{
  const { id } = req.params;
  const { companyId, userId, role } = req.user;
  try {
    const result = await withTransaction(async (client)=>{
      const { rows:[sr] } = await client.query(
        `SELECT * FROM swap_requests
          WHERE id=$1 AND company_id=$2 AND status='pending'
          FOR UPDATE`,
        [id, companyId]
      );
      if (!sr) return { status:404, body:{ message:'Anfrage nicht gefunden' } };
      if (!(role==='admin'||role==='companyAdmin'||userId===sr.target)) {
        return { status:403, body:{ message:'Keine Berechtigung' } };
      }

      const { rows:[conflict] } = await client.query(
        `SELECT 1 FROM schedule WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
        [companyId, sr.target, sr.date]
      );
      if (conflict) return { status:409, body:{ message:'Zielnutzer hat bereits einen Dienst an diesem Tag' } };

      const del = await client.query(
        `DELETE FROM schedule WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
        [companyId, sr.requester, sr.date]
      );
      if (del.rowCount === 0) return { status:409, body:{ message:'Kein passender Dienst des Absenders an diesem Tag' } };

      const { rows:[ins] } = await client.query(
        `INSERT INTO schedule(company_id, user_id, date)
         VALUES($1,$2,$3::date)
         ON CONFLICT (company_id, user_id, date) DO NOTHING
         RETURNING id, to_char(date,'YYYY-MM-DD') AS date`,
        [companyId, sr.target, sr.date]
      );
      if (!ins) return { status:409, body:{ message:'Zielnutzer hat bereits einen Dienst an diesem Tag' } };

      await client.query(`UPDATE swap_requests SET status='accepted' WHERE id=$1`, [id]);

      const { rows:[tgtNameRow] } = await client.query(`SELECT username FROM users WHERE id=$1`, [sr.target]);
      const dateStr = new Date(sr.date).toLocaleDateString('de-DE');
      await notify({
        companyId,
        recipient: sr.requester,
        type: 'handoff_response',
        title: 'Übergabe-Anfrage',
        body: `${tgtNameRow?.username || 'Kollege'} hat deinen Dienst am ${dateStr} übernommen.`,
        payload: { swapRequestId:id, date:sr.date, status:'accepted', requester:sr.requester, target:sr.target }
      }, client);

      return { status:200, body:{ success:true } };
    });
    emitSchedule(String(companyId), { type:'refresh' });
    res.status(result.status).json(result.body);
  } catch(e){
    console.error('Error accepting handoff:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/schedule/swap-requests/:id/decline', authenticate, async (req,res)=>{
  const { id } = req.params;
  const { companyId, userId, role } = req.user;
  try {
    const result = await withTransaction(async (client)=>{
      const { rows:[sr] } = await client.query(
        `SELECT * FROM swap_requests
          WHERE id=$1 AND company_id=$2 AND status='pending'
          FOR UPDATE`,
        [id, companyId]
      );
      if (!sr) return { status:404, body:{ message:'Anfrage nicht gefunden' } };
      if (!(role==='admin'||role==='companyAdmin'||userId===sr.target)) {
        return { status:403, body:{ message:'Keine Berechtigung' } };
      }

      await client.query(`UPDATE swap_requests SET status='declined' WHERE id=$1`, [id]);

      const { rows:[tgtNameRow] } = await client.query(`SELECT username FROM users WHERE id=$1`, [sr.target]);
      const dateStr = new Date(sr.date).toLocaleDateString('de-DE');
      await notify({
        companyId,
        recipient: sr.requester,
        type: 'handoff_response',
        title: 'Übergabe-Anfrage',
        body: `${tgtNameRow?.username || 'Kollege'} hat deine Übergabe am ${dateStr} abgelehnt.`,
        payload: { swapRequestId:id, date:sr.date, status:'declined', requester:sr.requester, target:sr.target }
      }, client);

      return { status:200, body:{ success:true } };
    });
    res.status(result.status).json(result.body);
  } catch(e){
    console.error('Error declining handoff:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Time Corrections & Work Times
// ───────────────────────────────────────────────────────────────────────────────
app.post('/api/time-corrections', authenticate, async (req, res) => {
  const { date, newStart, newEnd, reason } = req.body;
  const userId    = req.user.userId;
  const companyId = req.user.companyId;
  if (!date) return res.status(400).json({ message:'date erforderlich' });
  if (!newStart && !newEnd) return res.status(400).json({ message:'Gib mindestens Start oder Ende an' });

  try {
    const [row] = await query(
      `INSERT INTO time_corrections(id, company_id, user_id, date, new_start, new_end, reason, status)
       VALUES(gen_random_uuid(), $1, $2, $3::date, $4::time, $5::time, $6, 'pending')
       RETURNING id`,
      [companyId, userId, String(date).slice(0,10), newStart || null, newEnd || null, reason || null]
    );
    res.status(201).json({ success:true, id: row.id });
  } catch (e) {
    console.error('Error creating time_correction:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.get('/api/time-corrections/mine', authenticate, async (req,res)=>{
  const { companyId, userId } = req.user;
  const status = (req.query.status || 'pending').toLowerCase();
  const allowed = new Set(['pending','approved','declined']);
  const st = allowed.has(status) ? status : 'pending';
  try {
    const rows = await query(
      `SELECT id, to_char(date,'YYYY-MM-DD') AS date,
              to_char(new_start,'HH24:MI') AS "newStart",
              to_char(new_end,  'HH24:MI') AS "newEnd",
              status
         FROM time_corrections
        WHERE company_id=$1 AND user_id=$2 AND status=$3
        ORDER BY date DESC, created_at DESC`,
      [companyId, userId, st]
    );
    res.json(rows);
  } catch(e){
    console.error('Error fetching my time_corrections:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.get('/api/companies/:companyId/time-corrections', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  const status = (req.query.status || 'pending').toLowerCase();
  const allowed = new Set(['pending','approved','declined']);
  const st = allowed.has(status) ? status : 'pending';
  try {
    const rows = await query(
      `SELECT tc.id, to_char(tc.date,'YYYY-MM-DD') AS date,
              to_char(tc.new_start,'HH24:MI') AS "newStart",
              to_char(tc.new_end,  'HH24:MI') AS "newEnd",
              tc.reason, tc.status, u.username, tc.user_id AS "userId"
         FROM time_corrections tc
         JOIN users u ON u.id = tc.user_id
        WHERE tc.company_id=$1 AND tc.status=$2
        ORDER BY tc.date DESC, tc.created_at DESC`,
      [req.params.companyId, st]
    );
    res.json(rows);
  } catch(e){
    console.error('Error listing time_corrections:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/time-corrections/:id/approve', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  try {
    const result = await withTransaction(async (client)=>{
      const { rows:[tc] } = await client.query(
        `SELECT id, company_id, user_id, date, new_start, new_end
           FROM time_corrections
          WHERE id=$1 AND company_id=$2 AND status='pending'
          FOR UPDATE`,
        [req.params.id, req.user.companyId]
      );
      if (!tc) return { status:404, body:{ message:'Antrag nicht gefunden' } };

      const { rows:[wt] } = await client.query(
        `SELECT start_time, end_time
           FROM work_times
          WHERE company_id=$1 AND user_id=$2 AND date=$3::date
          FOR UPDATE`,
        [tc.company_id, tc.user_id, tc.date]
      );

      const finalStart = tc.new_start || (wt ? wt.start_time : null);
      const finalEnd   = tc.new_end   || (wt ? wt.end_time   : null);

      if (wt) {
        await client.query(
          `UPDATE work_times
              SET start_time=$4, end_time=$5, source='correction'
            WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
          [tc.company_id, tc.user_id, tc.date, finalStart, finalEnd]
        );
      } else {
        await client.query(
          `INSERT INTO work_times(id, company_id, user_id, date, start_time, end_time, source)
           VALUES(gen_random_uuid(), $1, $2, $3::date, $4::time, $5::time, 'correction')`,
          [tc.company_id, tc.user_id, tc.date, finalStart, finalEnd]
        );
      }

      // 👉 Pausen für den Tag aktualisieren (innerhalb der TX, mit client):
      await upsertBreakForDay(tc.company_id, tc.user_id, tc.date, client);

      // Rest wie gehabt …
      await client.query(
        `DELETE FROM absences WHERE company_id=$1 AND user_id=$2 AND date=$3::date`,
        [tc.company_id, tc.user_id, tc.date]
      );
      await client.query(`UPDATE time_corrections SET status='approved' WHERE id=$1`, [tc.id]);

      const dateStr = new Date(tc.date).toLocaleDateString('de-DE');
      const fmt = (t)=> (t ? String(t).slice(0,5) : '—');
      await notify({
        companyId: tc.company_id,
        recipient: tc.user_id,
        type: 'time_correction_response',
        title: 'Zeitkorrektur',
        body: `Deine Zeitkorrektur vom ${dateStr} wurde genehmigt. Neuer Zeitraum: ${fmt(finalStart)} – ${fmt(finalEnd)}.`,
        payload: { timeCorrectionId: tc.id, date: tc.date, status: 'approved', newStart: finalStart, newEnd: finalEnd }
      }, client);

      emitTimes(String(tc.user_id), { type:'times_update', date: String(tc.date).slice(0,10) });
      return { status:200, body:{ success:true } };
    });
    res.status(result.status).json(result.body);
  } catch(e){
    console.error('Error approving time_correction:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/time-corrections/:id/decline', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  try {
    const result = await withTransaction(async (client)=>{
      const { rows:[tc] } = await client.query(
        `SELECT id, company_id, user_id, date
           FROM time_corrections
          WHERE id=$1 AND company_id=$2 AND status='pending'
          FOR UPDATE`,
        [req.params.id, req.user.companyId]
      );
      if (!tc) return { status:404, body:{ message:'Antrag nicht gefunden' } };

      await client.query(`UPDATE time_corrections SET status='declined' WHERE id=$1`, [tc.id]);

      const dateStr = new Date(tc.date).toLocaleDateString('de-DE');
      await notify({
        companyId: tc.company_id,
        recipient: tc.user_id,
        type: 'time_correction_response',
        title: 'Zeitkorrektur',
        body: `Deine Zeitkorrektur vom ${dateStr} wurde abgelehnt.`,
        payload: { timeCorrectionId: tc.id, date: tc.date, status: 'declined' }
      }, client);

      emitTimes(String(tc.user_id), { type:'times_info', date: String(tc.date).slice(0,10) });

      return { status:200, body:{ success:true } };
    });
    res.status(result.status).json(result.body);
  } catch(e){
    console.error('Error declining time_correction:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Vacation / Wish Requests – create & admin workflow
// Voraussetzungen: Helper aus diesem File vorhanden:
//   - daysInclusive(startDate,endDate)
//   - getEffectiveAllowance(companyId,userId)
//   - ensureBalance(companyId,userId)
//   - withTransaction(...), query(...), pool, notify(...)
// Tabellen: vacation_requests, vacation_balances, vacation_policy
// ───────────────────────────────────────────────────────────────────────────────

// User: Antrag erstellen
app.post('/api/vacation-requests', authenticate, async (req,res)=>{
  try{
    const companyId = req.user.companyId;
    const userId    = req.user.userId;
    const { kind, startDate, endDate, days, reason } = req.body || {};
    const k     = (kind === 'wish') ? 'wish' : 'vacation';
    const start = String(startDate||'').slice(0,10);
    const end   = String(endDate||'').slice(0,10);

    if (!start || !end) {
      return res.status(400).json({ message:'startDate und endDate erforderlich' });
    }

    // Range validieren
    if (new Date(start) > new Date(end)) {
      return res.status(400).json({ message:'endDate darf nicht vor startDate liegen' });
    }

    // Tage berechnen (inkl. beider Enden); Body-Override nur falls >0
    const d = Math.max(1, Number(days || daysInclusive(start, end)));

    // Policy-Check & Resttage prüfen (nur für Urlaub, nicht für Wunschfrei)
    if (k === 'vacation') {
      const allowance = await getEffectiveAllowance(companyId, userId);
      if (!allowance || allowance <= 0) {
        return res.status(422).json({ message:'Urlaub ist derzeit deaktiviert (0 Tage konfiguriert).' });
      }
      // 🔧 Nur lesen: existierende Balance; wenn keine existiert → virtuell mit Policy prüfen
      const bal       = await getBalance(companyId, userId);        // kann null sein
      const effective = await getEffectiveAllowance(companyId, userId); // Policy (uniform/perUser)
      const available = (bal == null ? effective : bal);

      if (d > available) {
        return res.status(409).json({ message: `Nicht genug Resturlaub. Verfügbar: ${available} Tag(e).` });
      }
    }

    // Überschneidungen mit bestehenden (pending/approved) verhindern
    const overlap = await query(
      `SELECT 1
         FROM vacation_requests
        WHERE company_id=$1 AND user_id=$2
          AND status IN ('pending','approved')
          AND NOT ($3::date > end_date OR $4::date < start_date)
        LIMIT 1`,
      [companyId, userId, start, end]
    );
    if (overlap.length) {
      return res.status(409).json({ message:'Überlappender Antrag existiert bereits.' });
    }

    const { rows:[row] } = await pool.query(
      `INSERT INTO vacation_requests(
         id, company_id, user_id, kind, start_date, end_date, days, reason, status, created_at
       ) VALUES (gen_random_uuid(), $1,$2,$3,$4::date,$5::date,$6,$7,'pending', now())
       RETURNING id`,
      [companyId, userId, k, start, end, d, reason || null]
    );

    return res.status(201).json({ success:true, id: row.id });
  }catch(e){
    console.error('vacation-requests POST error:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// Admin: Anträge listen
app.get('/api/companies/:companyId/vacation-requests',
  authenticate, requireCompanyOrSystemAdmin,
  async (req,res)=>{
    try{
      const st = (String(req.query.status||'pending').toLowerCase());
      const allowed = new Set(['pending','approved','declined']);
      const status = allowed.has(st) ? st : 'pending';
      const rows = await query(
        `SELECT vr.id,
                vr.kind,
                to_char(vr.start_date,'YYYY-MM-DD') AS "startDate",
                to_char(vr.end_date,  'YYYY-MM-DD') AS "endDate",
                vr.days, vr.reason, vr.status,
                vr.user_id AS "userId",
                u.username
           FROM vacation_requests vr
           JOIN users u ON u.id = vr.user_id
          WHERE vr.company_id = $1
            AND vr.status = $2
          ORDER BY vr.start_date DESC, vr.created_at DESC`,
        [req.params.companyId, status]
      );
      res.json(rows);
    }catch(e){
      console.error('vacation-requests list error:', e);
      res.status(500).json({ message:'Server-Fehler' });
    }
  }
);

// Admin: genehmigen (zieht ggf. Resturlaub ab)
app.post('/api/vacation-requests/:id/approve',
  authenticate, requireCompanyOrSystemAdmin,
  async (req,res)=>{
    try{
      const approverId = req.user.userId;
      const result = await withTransaction(async (client)=>{
        const { rows:[r] } = await client.query(
          `SELECT id, company_id AS "companyId", user_id AS "userId",
                  kind, start_date AS "startDate", end_date AS "endDate", days, status
             FROM vacation_requests
            WHERE id=$1 AND company_id=$2
            FOR UPDATE`,
          [req.params.id, req.user.companyId]
        );
        if (!r) return { status:404, body:{ message:'Antrag nicht gefunden' } };
        if (r.status !== 'pending') return { status:409, body:{ message:'Antrag nicht mehr offen' } };

                if (r.kind === 'vacation') {
          // Balance prüfen & abziehen – Balance-Row bei Bedarf erst jetzt mit Policy-Wert anlegen
          const balRows = await client.query(
            `SELECT remaining_days AS "remainingDays"
               FROM vacation_balances
              WHERE company_id=$1 AND user_id=$2
              FOR UPDATE`,
            [r.companyId, r.userId]
          );
          let remaining = balRows.rows[0]?.remainingDays;

          if (remaining == null) {
            // noch kein Eintrag: mit aktueller Policy starten (erst hier schreiben)
            remaining = await getEffectiveAllowance(r.companyId, r.userId);
            await client.query(
              `INSERT INTO vacation_balances(company_id,user_id,remaining_days)
               VALUES($1,$2,$3)
               ON CONFLICT (company_id,user_id) DO UPDATE SET remaining_days=EXCLUDED.remaining_days`,
              [r.companyId, r.userId, remaining]
            );
          }

          if (r.days > remaining) {
            return { status:409, body:{ message:`Nicht genug Resturlaub. Verfügbar: ${remaining} Tag(e).` } };
          }

          const newRem = remaining - r.days;
          await client.query(
            `UPDATE vacation_balances
                SET remaining_days=$3
              WHERE company_id=$1 AND user_id=$2`,
            [r.companyId, r.userId, newRem]
          );
        }


        await client.query(
          `UPDATE vacation_requests
              SET status='approved', decided_by=$2, decided_at=now()
            WHERE id=$1`,
          [r.id, approverId]
        );

        const dateInfo = (r.startDate && r.endDate)
          ? new Date(r.startDate).toLocaleDateString('de-DE') +
            (r.endDate !== r.startDate ? `–${new Date(r.endDate).toLocaleDateString('de-DE')}` : '')
          : '';

        await notify({
          companyId: r.companyId,
          recipient: r.userId,
          type: 'vacation_response',
          title: r.kind === 'vacation' ? 'Urlaubsantrag' : 'Wunschfrei',
          body: `Dein Antrag (${dateInfo}) wurde genehmigt.`,
          payload: { requestId:r.id, status:'approved', days:r.days, kind:r.kind }
        }, client);

        return { status:200, body:{ success:true } };
      });

      res.status(result.status).json(result.body);
    }catch(e){
      console.error('vacation approve error:', e);
      res.status(500).json({ message:'Server-Fehler' });
    }
  }
);

// Admin: ablehnen
app.post('/api/vacation-requests/:id/decline',
  authenticate, requireCompanyOrSystemAdmin,
  async (req,res)=>{
    try{
      const result = await withTransaction(async (client)=>{
        const { rows:[r] } = await client.query(
          `SELECT id, company_id AS "companyId", user_id AS "userId",
                  kind, start_date AS "startDate", end_date AS "endDate", days, status
             FROM vacation_requests
            WHERE id=$1 AND company_id=$2
            FOR UPDATE`,
          [req.params.id, req.user.companyId]
        );
        if (!r) return { status:404, body:{ message:'Antrag nicht gefunden' } };
        if (r.status !== 'pending') return { status:409, body:{ message:'Antrag nicht mehr offen' } };

        await client.query(
          `UPDATE vacation_requests
              SET status='declined', decided_by=$2, decided_at=now()
            WHERE id=$1`,
          [r.id, req.user.userId]
        );

        const dateInfo = (r.startDate && r.endDate)
          ? new Date(r.startDate).toLocaleDateString('de-DE') +
            (r.endDate !== r.startDate ? `–${new Date(r.endDate).toLocaleDateString('de-DE')}` : '')
          : '';

        await notify({
          companyId: r.companyId,
          recipient: r.userId,
          type: 'vacation_response',
          title: r.kind === 'vacation' ? 'Urlaubsantrag' : 'Wunschfrei',
          body: `Dein Antrag (${dateInfo}) wurde abgelehnt.`,
          payload: { requestId:r.id, status:'declined', days:r.days, kind:r.kind }
        }, client);

        return { status:200, body:{ success:true } };
      });

      res.status(result.status).json(result.body);
    }catch(e){
      console.error('vacation decline error:', e);
      res.status(500).json({ message:'Server-Fehler' });
    }
  }
);

// Vacation / Wish Requests – Meine Anträge (pending + approved)
app.get('/api/vacation-requests/mine', authenticate, async (req,res)=>{
  try{
    const { companyId, userId } = req.user;
    const rows = await query(
      `SELECT id,
              kind,
              to_char(start_date,'YYYY-MM-DD') AS "startDate",
              to_char(end_date,  'YYYY-MM-DD') AS "endDate",
              days, status,
              created_at AS "createdAt"
         FROM vacation_requests
        WHERE company_id=$1 AND user_id=$2
          AND status IN ('pending','approved')
        ORDER BY created_at DESC`,
      [companyId, userId]
    );
    res.json(rows);
  }catch(e){
    console.error('vacation-requests mine error:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});


// ───────────────────────────────────────────────────────────────────────────────
// SSE – Device Logs
// ───────────────────────────────────────────────────────────────────────────────
const logsClients = new Map(); // companyId -> Set(res)
function addLogsClient(companyId, res){
  let s = logsClients.get(companyId) || new Set();
  s.add(res);
  logsClients.set(companyId, s);
}
function removeLogsClient(companyId, res){
  const s = logsClients.get(companyId);
  if (!s) return;
  s.delete(res);
  if (!s.size) logsClients.delete(companyId);
}
function emitLog(companyId, payload){
  const s = logsClients.get(String(companyId));
  if (!s) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const r of s) { try { r.write(line); } catch {} }
}

// ───────────────────────────────────────────────────────────────────────────────
// Features
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/features', authenticate, requireAdmin, async (_req,res) => {
  try {
    const features = await query('SELECT id,key,label,description FROM features ORDER BY id',[]);
    res.json(features);
  } catch (e) {
    console.error('Error fetching features:', e);
    res.status(500).json({ message:'Server error' });
  }
});

app.get('/api/companies/:companyId/features', authenticate, async (req,res) => {
  try {
    const rows = await query(
      `SELECT f.id,f.key,f.label
         FROM features f
         JOIN company_features cf ON f.id=cf.feature_id
        WHERE cf.company_id=$1
        ORDER BY f.id`,
      [req.params.companyId]
    );
    res.json(rows);
  } catch (e) {
    console.error('Error fetching company features:', e);
    res.status(500).json({ message:'Server error' });
  }
});

app.put('/api/companies/:companyId/features', authenticate, requireAdmin, async (req,res) => {
  const { featureIds } = req.body;
  if (!Array.isArray(featureIds)) return res.status(400).json({ message:'featureIds muss ein Array sein' });
  try {
    await query('DELETE FROM company_features WHERE company_id=$1',[req.params.companyId]);
    if (featureIds.length){
      const placeholders = featureIds.map((_,i)=>`($1,$${i+2})`).join(',');
      await query(`INSERT INTO company_features(company_id,feature_id) VALUES ${placeholders}`,[req.params.companyId, ...featureIds]);
    }
    res.status(204).end();
  } catch (e) {
    console.error('Error updating company features:', e);
    res.status(500).json({ message:'Server error' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Messages
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/messages', authenticate, async (req,res)=>{
  const { userId, companyId } = req.user;
  try {
    const rows = await query(
      `SELECT id, type, title, body, payload, created_at AS "createdAt", read_at AS "readAt"
         FROM messages
        WHERE recipient=$1 AND company_id=$2 AND read_at IS NULL
        ORDER BY created_at DESC`,
      [userId, companyId]
    );
    res.json(rows);
  } catch(e){
    console.error('Error fetching messages:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/messages/:id/read', authenticate, async (req,res)=>{
  const { id } = req.params;
  const { userId, companyId } = req.user;
  try {
    const { rows:[row] } = await pool.query(
      `UPDATE messages SET read_at = NOW()
        WHERE id=$1 AND recipient=$2 AND company_id=$3 AND read_at IS NULL
        RETURNING id`,
      [id, userId, companyId]
    );
    if (!row) return res.status(404).json({ message:'Nachricht nicht gefunden' });
    res.json({ success:true });
  } catch(e){
    console.error('Error marking message read:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// Absences
// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/users/:userId/absences', authenticate, selfOrAdmin, async (req,res)=>{
  const { from, to } = req.query;
  const params = [req.user.companyId, req.params.userId];
  let where = `a.company_id=$1 AND a.user_id=$2`;
  if (from) { params.push(from); where += ` AND a.date >= $${params.length}`; }
  if (to)   { params.push(to);   where += ` AND a.date <= $${params.length}`; }
  try {
    const rows = await query(
      `SELECT a.id,
              to_char(a.date,'YYYY-MM-DD') AS date,
              a.status,
              a.sick_note_path AS "sickNotePath",
              a.user_message   AS "userMessage"
         FROM absences a
        WHERE ${where}
        ORDER BY a.date DESC`,
      params
    );
    res.json(rows);
  } catch(e){
    console.error('Error fetching absences:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/absences/:id/message', authenticate, async (req,res)=>{
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ message:'message erforderlich' });
  const { rows:[a] } = await pool.query(
    `SELECT company_id, user_id FROM absences WHERE id=$1`,
    [req.params.id]
  );
  if (!a) return res.status(404).json({ message:'Abwesenheit nicht gefunden' });
  if (!(req.user.role==='admin'||req.user.role==='companyAdmin'||String(req.user.userId)===String(a.user_id))) {
    return res.status(403).json({ message:'Keine Berechtigung' });
  }
  try {
    await pool.query(`UPDATE absences SET user_message=$2 WHERE id=$1`, [req.params.id, message]);
    res.json({ success:true });
  } catch(e){
    console.error('Error saving message:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/absences/:id/upload-sick-note', authenticate, upload.single('file'), async (req,res)=>{
  const { rows:[a] } = await pool.query(`SELECT company_id, user_id FROM absences WHERE id=$1`, [req.params.id]);
  if (!a) return res.status(404).json({ message:'Abwesenheit nicht gefunden' });
  if (!(req.user.role==='admin'||req.user.role==='companyAdmin'||String(req.user.userId)===String(a.user_id)))
    return res.status(403).json({ message:'Keine Berechtigung' });
  if (!req.file) return res.status(400).json({ message:'Datei fehlt' });
  const relPath = `/uploads/sick-notes/${req.file.filename}`;
  try {
    await pool.query(`UPDATE absences SET sick_note_path=$2 WHERE id=$1`, [req.params.id, relPath]);
    res.json({ success:true, path: relPath });
  } catch(e){
    console.error('Error attaching file:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// Datei sicher ausliefern – Token via Header **oder** ?token=… (für <a href>)
app.get('/api/absences/:id/sick-note', authenticateHeaderOrQuery, async (req,res)=>{
  try {
    const { rows:[a] } = await pool.query(
      `SELECT company_id, user_id, sick_note_path FROM absences WHERE id=$1`,
      [req.params.id]
    );
    if (!a) return res.status(404).json({ message:'Abwesenheit nicht gefunden' });

    const allowed = (req.user.role==='admin' || req.user.role==='companyAdmin'
      || (String(req.user.userId)===String(a.user_id) && String(req.user.companyId)===String(a.company_id)));
    if (!allowed) return res.status(403).json({ message:'Keine Berechtigung' });

    if (!a.sick_note_path) return res.status(404).json({ message:'Keine Datei hinterlegt' });

    const fname = path.basename(a.sick_note_path);
    const filePath = path.resolve(uploadRoot, fname);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message:'Datei nicht gefunden' });

    return res.sendFile(filePath);
  } catch(e){
    console.error('Error serving sick note:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// Admin-Listen + Aktionen
app.get('/api/companies/:companyId/absences', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  const st = (req.query.status || 'open').toLowerCase();
  const allowed = new Set(['open','excused','declined']);
  const status = allowed.has(st) ? st : 'open';
  try {
    const rows = await query(
      `SELECT a.id,
              to_char(a.date,'YYYY-MM-DD') AS date,
              a.status,
              a.sick_note_path AS "sickNotePath",
              a.user_message   AS "userMessage",
              u.username, a.user_id AS "userId"
         FROM absences a
         JOIN users u ON u.id=a.user_id
        WHERE a.company_id=$1 AND a.status=$2
        ORDER BY a.date DESC`,
      [req.params.companyId, status]
    );
    res.json(rows);
  } catch(e){
    console.error('Error listing absences:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/absences/:id/excuse', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  try {
    const { rows:[a] } = await pool.query(
      `UPDATE absences SET status='excused'
        WHERE id=$1 AND status='open'
        RETURNING company_id, user_id, date`,
      [req.params.id]
    );
    if (!a) return res.status(404).json({ message:'Abwesenheit nicht gefunden/kein offener Status' });

    const dateStr = new Date(a.date).toLocaleDateString('de-DE');
    await notify({
      companyId: a.company_id, recipient: a.user_id, type: 'absence_response',
      title: 'Abwesenheit', body: `Deine Abwesenheit am ${dateStr} wurde entschuldigt.`,
      payload: { absenceId: req.params.id, date: a.date, status: 'excused' }
    });
    res.json({ success:true });
  } catch(e){
    console.error('Error excusing absence:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

app.post('/api/absences/:id/decline', authenticate, requireCompanyOrSystemAdmin, async (req,res)=>{
  try {
    const { rows:[a] } = await pool.query(
      `UPDATE absences SET status='declined'
        WHERE id=$1 AND status='open'
        RETURNING company_id, user_id, date`,
      [req.params.id]
    );
    if (!a) return res.status(404).json({ message:'Abwesenheit nicht gefunden/kein offener Status' });

    const dateStr = new Date(a.date).toLocaleDateString('de-DE');
    await notify({
      companyId: a.company_id, recipient: a.user_id, type: 'absence_response',
      title: 'Abwesenheit', body: `Deine Abwesenheit am ${dateStr} wurde abgelehnt.`,
      payload: { absenceId: req.params.id, date: a.date, status: 'declined' }
    });
    res.json({ success:true });
  } catch(e){
    console.error('Error declining absence:', e);
    res.status(500).json({ message:'Server-Fehler' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
app.get('/api/dashboard-data', authenticate, async (req, res) => {
  res.json({ secret: `Dashboard-Inhalt für ${req.user.username}` });
});

// ───────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────────
// Start Server
// ───────────────────────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`🚀 Backend läuft auf http://localhost:${port}`);
});
// ───────────────────────────────────────────────────────────────────────────────
// Start Server
// ───────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────────────

// === Telegram Start-/Health-Notifier (inline) ===
// Benötigt in .env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
// Optional: PROC_NAME, THR_DISK, THR_LOAD, HEALTH_EVERY_SEC, API_URL, API_TOKEN

const https = require('https');
const { execSync } = require('child_process');

const TG_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT   = process.env.TELEGRAM_CHAT_ID;
const PROC_NAME = process.env.PROC_NAME || 'tempsys-backend';
const THR_DISK  = Number(process.env.THR_DISK || 90);     // Warnschwelle % auf /
const THR_LOAD  = Number(process.env.THR_LOAD || 5.0);    // 1-Min-Load
const API_URL   = (process.env.API_URL || '').replace(/\/+$/,''); // optional
const API_TOKEN = process.env.API_TOKEN || '';            // optional
const HEALTH_EVERY_SEC = Number(process.env.HEALTH_EVERY_SEC || 600); // alle 10 Min

function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) return;
  const body = new URLSearchParams({ chat_id: TG_CHAT, text });
  const req = https.request({
    hostname: 'api.telegram.org',
    path: `/bot${TG_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, res => res.resume());
  req.on('error', () => { /* stillschweigen */ });
  req.write(body.toString());
  req.end();
}

function getDiskUseRoot() {
  try {
    const out = execSync(`df -P / | awk 'NR==2 {gsub("%","",$5); print $5}'`).toString().trim();
    return Number(out || 0);
  } catch { return NaN; }
}

function getPm2State() {
  try {
    // Versuche pm2 jlist (JSON); wenn das fehlschlägt, fallback auf "pm2 status"
    try {
      const j = execSync(`pm2 jlist`).toString();
      const nameIdx = j.indexOf(`"name":"${PROC_NAME}"`);
      if (nameIdx >= 0) {
        const slice = j.slice(nameIdx, nameIdx + 400);
        const m = slice.match(/"status":"([^"]+)"/);
        if (m) return m[1];
      }
    } catch {
      const out = execSync(`pm2 status ${PROC_NAME}`).toString();
      const m = out.split('\n')[2]?.split(/\s+/);
      if (m && m.length) return m[m.length - 1] || 'unknown';
    }
  } catch {}
  return 'n/a';
}

function apiHealthLine(cb) {
  if (!API_URL || !API_TOKEN) return cb('');
  const url = new URL(`${API_URL}/dashboard-data`);
  const opts = { method: 'GET', headers: { Authorization: `Bearer ${API_TOKEN}` } };
  const t0 = Date.now();
  const req = https.request(url, opts, (res) => {
    res.resume();
    const ms = (Date.now() - t0) / 1000;
    cb(` | API:${res.statusCode} (${ms.toFixed(2)}s)`);
  });
  req.on('error', () => cb(' | API:n/a'));
  req.end();
}

function runHealthOnce() {
  const host = os.hostname();
  const date = new Date().toISOString().replace('T',' ').replace(/\..+/, '');
  const disk = getDiskUseRoot();
  const load1 = (os.loadavg()[0] || 0);
  const pm2 = getPm2State();

  const warns = [];
  if (!Number.isNaN(disk) && disk > THR_DISK) warns.push(`⚠️ Disk voll: ${disk}%`);
  if (Number(load1) > THR_LOAD) warns.push(`⚠️ Load hoch: ${load1.toFixed(2)}`);
  if (pm2 !== 'online' && pm2 !== 'n/a') warns.push(`❌ pm2:${PROC_NAME}=${pm2}`);

  apiHealthLine((apiLine) => {
    const base = `Host: ${host}\nZeit: ${date}\nDisk: ${disk || 'n/a'}% | Load1: ${load1.toFixed(2)} | pm2:${PROC_NAME}=${pm2}${apiLine}`;
    const msg = warns.length
      ? `🚨 TempSys Health WARN\n- ${warns.join('\n- ')}\n${base}`
      : `✅ TempSys Health OK\n${base}`;
    sendTelegram(msg);
  });
}

// Sofortige Nachricht beim Start (damit du Restarts siehst)
if (TG_TOKEN && TG_CHAT) {
  sendTelegram(`ℹ️ TempSys Backend gestartet auf ${os.hostname()} (${new Date().toISOString().replace('T',' ').replace(/\..+/, '')})`);
  // Ersten Health-Check leicht verzögern, dann im Intervall
  setTimeout(runHealthOnce, 30 * 1000);
  setInterval(runHealthOnce, HEALTH_EVERY_SEC * 1000);
}

// === Online/Offline Monitoring – registerHeartbeat (korrigiert) ===
const lastHeartbeat = global.__hb_lastHeartbeat || new Map();
const offlineFlag   = global.__hb_offlineFlag   || new Set();
global.__hb_lastHeartbeat = lastHeartbeat;
global.__hb_offlineFlag   = offlineFlag;

/**
 * Registriert Heartbeat und verschickt Online-Meldungen:
 * - Erste Sichtung => "✅ Device online (first heartbeat)"
 * - Rückkehr aus Offline => "✅ Device online"
 */
global.registerHeartbeat = (deviceId, meta = {}) => {
  if (!deviceId) return;

  const wasKnown   = lastHeartbeat.has(deviceId);
  const wasOffline = offlineFlag.has(deviceId);

  lastHeartbeat.set(deviceId, Date.now());

  // 1) Erste Sichtung: sofort melden
  if (!wasKnown) {
    const parts = [];
    if (meta.name)    parts.push(`Name: ${meta.name}`);
    if (meta.ip)      parts.push(`IP: ${meta.ip}`);
    if (meta.mac)     parts.push(`MAC: ${meta.mac}`);
    if (meta.version) parts.push(`Ver: ${meta.version}`);
    const tail = parts.length ? ` | ${parts.join(' | ')}` : '';
    global.tgNotify(`✅ Device online (first heartbeat): ${deviceId}${tail}`);
    return;
  }

  // 2) Rückkehr aus Offline
  if (wasOffline) {
    offlineFlag.delete(deviceId);
    const parts = [];
    if (meta.ip)      parts.push(`IP: ${meta.ip}`);
    if (meta.version) parts.push(`Ver: ${meta.version}`);
    const tail = parts.length ? ` | ${parts.join(' | ')}` : '';
    global.tgNotify(`✅ Device online: ${deviceId}${tail}`);
  }
};

// Offline-Checker (einmalig starten)
const HB_OFFLINE_AFTER_MS = Number(process.env.HB_OFFLINE_AFTER_MS || 5 * 60 * 1000);
const HB_CHECK_EVERY_MS   = Number(process.env.HB_CHECK_EVERY_MS   || 60 * 1000);

if (!global.__hb_interval_started) {
  global.__hb_interval_started = true;
  setInterval(() => {
    const now = Date.now();
    for (const [dev, ts] of lastHeartbeat.entries()) {
      if (now - ts > HB_OFFLINE_AFTER_MS && !offlineFlag.has(dev)) {
        offlineFlag.add(dev);
        const mins = Math.floor((now - ts) / 60000);
        global.tgNotify(`🚨 Device offline: ${dev} seit ${mins} Minuten`);
      }
    }
  }, HB_CHECK_EVERY_MS);
}