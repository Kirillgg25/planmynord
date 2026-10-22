const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const express = require('express');
const bcrypt = require('bcryptjs');
const { installPasswordReset } = require('../lib/password-reset');

(async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT);
    CREATE TABLE sessions (sid TEXT PRIMARY KEY, data_json TEXT);`);
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run('owner', 'owner@example.com', await bcrypt.hash('old-password', 4));
  db.prepare('INSERT INTO sessions VALUES (?, ?)').run('old', JSON.stringify({ userId: 'owner' }));
  db.prepare('INSERT INTO sessions VALUES (?, ?)').run('other', JSON.stringify({ userId: 'other' }));
  const messages = [];
  const app = express();
  app.use(express.json());
  installPasswordReset(app, { openDatabase: () => db, mailTransport: { sendMail: async (mail) => messages.push(mail) }, baseUrl: 'https://example.com', from: 'noreply@example.com' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const post = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const known = await post('forgot-password', { email: 'owner@example.com', language: 'ru' });
    const unknown = await post('forgot-password', { email: 'unknown@example.com' });
    assert.deepEqual(known, unknown);
    assert.equal(messages.length, 1);
    const token = messages[0].text.match(/#reset=([a-f0-9]{64})/)[1];
    assert.notEqual(db.prepare('SELECT token_hash FROM password_resets').get().token_hash, token);
    await post('forgot-password', { email: 'owner@example.com' });
    assert.equal(messages.length, 1, 'email cooldown');
    assert.equal((await post('reset-password', { token, password: 'short' })).status, 400);
    assert.equal((await post('reset-password', { token: 'f'.repeat(64), password: 'new-password-123' })).status, 400);
    db.exec('UPDATE password_resets SET expires_at = 1');
    assert.equal((await post('reset-password', { token, password: 'new-password-123' })).status, 400);
    db.prepare('UPDATE password_resets SET expires_at = ?').run(Date.now() + 60000);
    const results = await Promise.all([1, 2].map(() => post('reset-password', { token, password: 'new-password-123' })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400], 'single use under concurrent requests');
    assert.ok(await bcrypt.compare('new-password-123', db.prepare('SELECT password_hash FROM users').get().password_hash));
    assert.equal(db.prepare('SELECT count(*) AS n FROM password_resets').get().n, 0);
    assert.deepEqual(db.prepare('SELECT sid FROM sessions').all().map(r => r.sid), ['other']);
    console.log('PASS: generic response, email cooldown, hashed tokens, expiry, validation, atomic single use, password change, session deletion.');
  } finally { await new Promise(resolve => server.close(resolve)); db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
