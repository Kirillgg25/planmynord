const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const source = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE users (id TEXT PRIMARY KEY);
  INSERT INTO users VALUES ('recipient');
  CREATE TABLE vpn_subscriptions (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, plan TEXT, status TEXT,
    device_limit INTEGER, starts_at TEXT, ends_at TEXT, updated_at TEXT);
  INSERT INTO vpn_subscriptions VALUES ('s','recipient','free','active',3,'','','');`);
const context = {
  openDatabase: () => db, VPN_DEVICE_LIMIT: 5,
  ensureVpnSubscription: id => db.prepare('SELECT * FROM vpn_subscriptions WHERE user_id = ?').get(id)
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function canPreviewVpn('), source.indexOf('function publicUser(')), context);
assert.equal(context.canPreviewVpn({id:'recipient'}), false);
const first = context.grantVpnAccess('recipient', 30);
assert.equal(first.active, true);
assert.equal(first.deviceLimit, 5);
assert.equal(context.canPreviewVpn({id:'recipient'}), true);
const next = context.grantVpnAccess('recipient', 90);
assert.equal(Date.parse(next.until) - Date.parse(first.until), 90 * 86400000);
for (const days of [-1, 0.5, '30', null, 3651]) {
  assert.throws(() => context.grantVpnAccess('recipient', days), e => e.status === 400);
}
assert.throws(() => context.grantVpnAccess('missing', 30), e => e.status === 404);
assert.equal(context.grantVpnAccess('recipient', 0).active, false);
assert.equal(context.canPreviewVpn({id:'recipient'}), false);
assert.equal(context.canPreviewVpn({id:'b22e3c94-63ec-4d85-945f-05ec16aad38a'}), true);
assert(source.includes('"/api/admin/users/:id/vpn", requireAdmin, writeLimiter'));
db.close();
console.log('PASS: VPN grant, extension, revocation, validation and preview visibility');
