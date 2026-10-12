const { generateKeyPairSync, randomBytes } = require('node:crypto');

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 0x10001,
});
const jwk = privateKey.export({ format: 'jwk' });
jwk.kid = randomBytes(16).toString('base64url');
jwk.alg = 'RS256';
jwk.use = 'sig';

process.stdout.write(JSON.stringify({ keys: [jwk] }));
