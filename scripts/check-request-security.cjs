const assert = require('node:assert/strict');
const { apiOriginGuard, validNewPassword } = require('../lib/request-security');
const guard = apiOriginGuard('https://planmynord.com');
function check(headers = {}, type = true, path = '/trips', method = 'POST') {
  let status = 0;
  guard({ path, method, get: name => headers[name], is: () => type },
    { status: code => {status = code; return {json() {}};} }, () => {status = 200;});
  return status;
}
assert.equal(check({ Origin: 'https://planmynord.com' }), 200);
assert.equal(check({ Origin: 'https://evil.example' }), 403);
assert.equal(check({ Origin: 'https://planmynord.com.evil.example' }), 403);
assert.equal(check({ Origin: 'null' }), 403);
assert.equal(check({ 'Sec-Fetch-Site': 'cross-site' }), 403);
assert.equal(check({}, false), 403);
assert.equal(check({}), 200, 'native JSON clients');
assert.equal(check({}, false, '/trips', 'GET'), 200);
assert.equal(check({}, false, '/webhooks/vipps'), 200, 'provider callback separately authenticated');
assert.equal(validNewPassword('a'.repeat(8)), false);
assert.equal(validNewPassword('a'.repeat(9)), true);
assert.equal(validNewPassword('a'.repeat(72)), true);
assert.equal(validNewPassword('a'.repeat(73)), false);
assert.equal(validNewPassword('\u044f'.repeat(37)), false);
console.log('PASS: exact Origin, hostile/null origins, browser metadata, native JSON, password bounds.');
