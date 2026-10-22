const { randomBytes, createHash } = require('node:crypto');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const hashToken = (token) => createHash('sha256').update(token).digest('hex');

function installPasswordReset(app, { openDatabase, mailTransport, baseUrl, from }) {
  function database() {
    const db = openDatabase();
    // No cascading FK: legacy saveUsers replaces user rows during ordinary edits.
    db.exec(`CREATE TABLE IF NOT EXISTS password_resets (
      user_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    )`);
    return db;
  }
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
    standardHeaders: true, legacyHeaders: false, message: { error: 'resetLimited' } });

  app.post('/api/forgot-password', limiter, (req, res) => {
    if (!mailTransport) return res.status(503).json({ error: 'resetUnavailable' });
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'resetEmail' });
    }
    const db = database();
    const now = Date.now();
    db.prepare('DELETE FROM password_resets WHERE expires_at <= ?').run(now);
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE lower(email) = ?').get(email);
    const previous = user && db.prepare('SELECT created_at FROM password_resets WHERE user_id = ?').get(user.id);
    // Respond before SMTP work, with identical output for known and unknown addresses.
    res.json({ message: 'resetSent' });
    if (!user || (previous && now - previous.created_at < 60000)) return;
    const token = randomBytes(32).toString('hex');
    const digest = hashToken(token);
    db.prepare(`INSERT OR REPLACE INTO password_resets
      (user_id, token_hash, password_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(user.id, digest, user.password_hash, now + 30 * 60 * 1000, now);
    const language = ['no', 'en', 'ru'].includes(req.body.language) ? req.body.language : 'no';
    const messages = {
      no: ['Tilbakestill passordet ditt', 'Velg et nytt passord via lenken nedenfor. Lenken er gyldig i 30 minutter og kan brukes en gang. Hvis du ikke ba om dette, kan du ignorere denne e-posten.'],
      en: ['Reset your password', 'Choose a new password using the link below. This single-use link expires in 30 minutes. If you did not request this, ignore this email.'],
      ru: ['Сброс пароля', 'Перейди по ссылке, чтобы задать новый пароль. Одноразовая ссылка действует 30 минут. Если ты не запрашивал смену пароля, просто проигнорируй это письмо.']
    };
    const [subject, text] = messages[language];
    // Fragment is not sent in HTTP requests, access logs or Referer headers.
    const url = `${baseUrl.replace(/\/$/, '')}/account.html#reset=${token}&lang=${language}`;
    Promise.resolve().then(() => mailTransport.sendMail({ from, to: user.email,
      subject: `PlanMyNord: ${subject}`, text: `${text}\n\n${url}` }))
      .catch(() => {
        db.prepare('DELETE FROM password_resets WHERE token_hash = ?').run(digest);
        console.error('Password reset email delivery failed. Check SMTP configuration.');
      });
  });

  app.post('/api/reset-password', limiter, async (req, res) => {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ error: 'resetInvalid' });
    }
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'resetPassword' });
    }
    const db = database();
    const digest = hashToken(token);
    const find = () => db.prepare(`SELECT r.user_id FROM password_resets r
      JOIN users u ON u.id = r.user_id AND u.password_hash = r.password_hash
      WHERE r.token_hash = ? AND r.expires_at > ?`).get(digest, Date.now());
    if (!find()) return res.status(400).json({ error: 'resetInvalid' });
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      db.exec('BEGIN IMMEDIATE');
      try {
        const reset = find();
        if (!reset) {
          db.exec('ROLLBACK');
          return res.status(400).json({ error: 'resetInvalid' });
        }
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, reset.user_id);
        db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(reset.user_id);
        const remove = db.prepare('DELETE FROM sessions WHERE sid = ?');
        for (const session of db.prepare('SELECT sid, data_json FROM sessions').all()) {
          try { if (JSON.parse(session.data_json).userId === reset.user_id) remove.run(session.sid); } catch {}
        }
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      res.json({ message: 'resetDone' });
    } catch {
      res.status(503).json({ error: 'resetUnavailable' });
    }
  });
}

module.exports = { installPasswordReset };
