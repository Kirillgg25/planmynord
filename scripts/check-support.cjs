const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');

async function main() {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../server.js'), 'utf8');
  const app = express();
  app.use(express.json());
  const payments = [];
  const context = { app, console, Number,
    STRIPE_SECRET_KEY: 'test', STRIPE_WEBHOOK_SECRET: 'test',
    requireAuth(req, res, next) { if (!req.headers['x-test-user']) return res.sendStatus(401); req.currentUser = { id: 'test' }; next(); },
    writeLimiter(req,res,next) { next(); },
    createPaymentRecord(input) { payments.push(input); return input; },
    async createStripeCheckoutSession(user, payment) { return 'https://checkout.stripe.com/test'; }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('app.get("/api/support/product"'), source.indexOf('app.get("/api/vip/product"')), context);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function send(amountNok, consent = true, auth = true) {
    return fetch(base + '/api/support/payment', {method:'POST',headers:{'Content-Type':'application/json',...(auth ? {'x-test-user':'yes'} : {})},body:JSON.stringify({amountNok,consent})});
  }
  try {
    for (const value of [10,50,100,200,500,1000,123]) assert.equal((await send(value)).status,201);
    for (const value of [0,-10,9,10001,10.5,'100',null]) assert.equal((await send(value)).status,400);
    assert.equal((await send(100,false)).status,400);
    assert.equal((await send(100,true,false)).status,401);
    assert.equal(payments.length,7);
    assert(payments.every(p => p.plan === 'support' && p.provider === 'stripe'));
    console.log('PASS: support amounts, consent, authentication and payment category');
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
