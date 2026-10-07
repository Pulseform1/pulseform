// Tests for the payments Worker:  node --test app/api/worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign, createHmac } from 'node:crypto';
import api, { CATALOG, verifyFirebaseToken, verifyStripe, grant, _resetKeys } from './worker.js';

const PROJECT = 'pulseform-d8282', now = () => Math.floor(Date.now() / 1000);
const b64u = b => Buffer.from(b).toString('base64url');
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
function idToken(claims, kid = 'k1', key = privateKey) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid })), t = now();
  const p = b64u(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'uidABC123', iat: t - 10, exp: t + 3600, email: 'a@b.c', ...claims }));
  return `${h}.${p}.${createSign('RSA-SHA256').update(`${h}.${p}`).sign(key).toString('base64url')}`;
}
const stripeSig = (raw, secret, t = now()) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex')}`;

// a pretend internet: Google's keys, Stripe and Firestore
function mockNet() {
  const docs = new Map(), calls = [];
  const res = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  const f = async (url, opt = {}) => {
    calls.push({ url: String(url), opt });
    const u = new URL(url);
    if (u.hostname === 'www.googleapis.com') return res({ keys: [jwk] });
    if (u.hostname === 'api.stripe.com') return res({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    if (u.hostname === 'fs.test') {
      const path = decodeURIComponent(u.pathname.replace(/^\/docs\//, ''));
      if ((opt.method || 'GET') === 'GET') return docs.has(path) ? res({ name: path }) : res({ error: 'nf' }, 404);
      const full = `${path}/${u.searchParams.get('documentId')}`;
      if (docs.has(full)) return res({ error: 'exists' }, 409);
      if (f.failOn && full.startsWith(f.failOn)) { f.failOn = ''; return res('boom', 500); }
      docs.set(full, JSON.parse(opt.body).fields); return res({ name: full });
    }
    return res({ error: 'unexpected ' + url }, 500);
  };
  f.docs = docs; f.calls = calls; return f;
}
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', GOOGLE_SERVICE_ACCOUNT: '{}', FIRESTORE_BASE: 'https://fs.test/docs', FIRESTORE_AUTH: 'Bearer owner' };
const post = (path, body, headers = {}) => new Request('https://api.pulseform.org' + path, { method: 'POST', headers: { origin: 'https://pulseform.org', 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('the price list matches the game', async () => {
  const fs = await import('node:fs');
  const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const [id, it] of Object.entries(CATALOG)) {
    let price = (html.match(new RegExp(`\\{id:'${id}'[^}]*price:'\\$([\\d.]+)'`)) || [])[1];
    if (!price && id.startsWith('pf_skin_')) price = (html.match(new RegExp(`sk_${id.slice(8)}:'\\$([\\d.]+)'`)) || [])[1];
    assert.ok(price, `${id} is in the game`);
    assert.equal(Math.round(+price * 100), it.cents, id);
  }
});

test('Firebase sign-in tokens', async () => {
  const net = mockNet(); _resetKeys();
  assert.deepEqual(await verifyFirebaseToken(idToken({}), undefined, net), { uid: 'uidABC123', email: 'a@b.c' });
  await assert.rejects(verifyFirebaseToken(idToken({ aud: 'other-project' }), undefined, net));
  await assert.rejects(verifyFirebaseToken(idToken({ exp: now() - 5 }), undefined, net));
  await assert.rejects(verifyFirebaseToken(idToken({}, 'k2'), undefined, net));
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  await assert.rejects(verifyFirebaseToken(idToken({}, 'k1', other), undefined, net), /signature/);
  const [h, , s] = idToken({}).split('.');
  await assert.rejects(verifyFirebaseToken(`${h}.${b64u(JSON.stringify({ aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'someoneElse', iat: now(), exp: now() + 99 }))}.${s}`, undefined, net));
  await assert.rejects(verifyFirebaseToken('junk', undefined, net));
});

test('Stripe signatures', async () => {
  const raw = '{"a":1}';
  assert.equal(await verifyStripe(raw, stripeSig(raw, 'whsec_test'), 'whsec_test'), true);
  assert.equal(await verifyStripe(raw, `t=${now()},v1=deadbeef,` + stripeSig(raw, 'whsec_test').split(',')[1], 'whsec_test'), true);
  assert.equal(await verifyStripe(raw, stripeSig(raw, 'whsec_other'), 'whsec_test'), false);
  assert.equal(await verifyStripe(raw + ' ', stripeSig(raw, 'whsec_test'), 'whsec_test'), false);
  assert.equal(await verifyStripe(raw, stripeSig(raw, 'whsec_test', now() - 600), 'whsec_test'), false);
  assert.equal(await verifyStripe(raw, '', 'whsec_test'), false);
});

test('checkout: server prices, signed-in players only', async () => {
  const net = mockNet(); _resetKeys();
  let r = await api.fetch(post('/checkout', { product: 'pf_skin_prism', idToken: idToken({}) }), ENV, {}, net);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://pulseform.org');
  assert.equal((await r.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_1');
  const call = net.calls.find(c => c.url.includes('stripe.com'));
  const form = new URLSearchParams(call.opt.body);
  assert.equal(call.opt.headers.authorization, 'Bearer sk_test_x');
  assert.equal(form.get('line_items[0][price_data][unit_amount]'), '499');
  assert.equal(form.get('metadata[uid]'), 'uidABC123');
  assert.equal(form.get('metadata[product]'), 'pf_skin_prism');
  assert.equal(form.get('success_url'), 'https://pulseform.org/?paid={CHECKOUT_SESSION_ID}');
  assert.equal(form.get('customer_email'), 'a@b.c');

  // a price sent by the page is ignored; unknown items, bad tokens and other sites are refused
  r = await api.fetch(post('/checkout', { product: 'pf_notes_13000', idToken: idToken({}), cents: 1 }), ENV, {}, net);
  assert.equal(new URLSearchParams(net.calls.filter(c => c.url.includes('stripe.com')).at(-1).opt.body).get('line_items[0][price_data][unit_amount]'), '999');
  assert.equal((await api.fetch(post('/checkout', { product: 'pf_free_stuff', idToken: idToken({}) }), ENV, {}, net)).status, 400);
  assert.equal((await api.fetch(post('/checkout', { product: 'pf_no_ads', idToken: 'nope' }), ENV, {}, net)).status, 401);
  assert.equal((await api.fetch(post('/checkout', 'not json'), ENV, {}, net)).status, 400);
  r = await api.fetch(post('/checkout', { product: 'pf_no_ads', idToken: idToken({}) }, { origin: 'https://evil.example' }), ENV, {}, net);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
  // payments off until the Stripe key is added
  assert.equal((await api.fetch(post('/checkout', { product: 'pf_no_ads', idToken: idToken({}) }), {}, {}, net)).status, 503);
  const pre = await api.fetch(new Request('https://api.pulseform.org/checkout', { method: 'OPTIONS', headers: { origin: 'https://pulseform.win' } }), ENV, {}, net);
  assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'https://pulseform.win');
});

test('status: buying is on only when every secret is set', async () => {
  const get = () => new Request('https://api.pulseform.org/status', { headers: { origin: 'https://pulseform.org' } });
  assert.deepEqual(await (await api.fetch(get(), ENV, {}, mockNet())).json(), { pay: true });
  assert.deepEqual(await (await api.fetch(get(), { STRIPE_SECRET_KEY: 'sk' }, {}, mockNet())).json(), { pay: false });
  assert.equal((await api.fetch(get(), ENV, {}, mockNet())).headers.get('access-control-allow-origin'), 'https://pulseform.org');
  assert.equal((await api.fetch(new Request('https://api.pulseform.org/nope'), ENV, {}, mockNet())).status, 404);
});

const paidEvent = (over = {}) => JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_live_42', payment_status: 'paid', amount_total: 299, currency: 'usd', client_reference_id: 'uidABC123', metadata: { uid: 'uidABC123', product: 'pf_no_ads' }, ...over } } });
const hook = (raw, secret = 'whsec_test') => post('/stripe-webhook', raw, { 'stripe-signature': stripeSig(raw, secret) });

test('webhook: a paid order is delivered exactly once', async () => {
  const net = mockNet();
  let r = await api.fetch(hook(paidEvent()), ENV, {}, net);
  assert.equal(r.status, 200);
  const gift = net.docs.get('gifts/uidABC123/items/stripe_cs_live_42'), receipt = net.docs.get('purchases/uidABC123/items/cs_live_42');
  assert.deepEqual([gift.kind.stringValue, gift.id.stringValue, gift.tx.stringValue, gift.by.stringValue], ['iap', 'pf_no_ads', 'cs_live_42', 'stripe']);
  assert.deepEqual([receipt.product.stringValue, receipt.cents.integerValue], ['pf_no_ads', '299']);
  // Stripe sends it again after the game already took the gift: nothing new is sent
  net.docs.delete('gifts/uidABC123/items/stripe_cs_live_42');
  r = await api.fetch(hook(paidEvent()), ENV, {}, net);
  assert.equal(r.status, 200);
  assert.equal(net.docs.has('gifts/uidABC123/items/stripe_cs_live_42'), false);
});

test('webhook: a failure part-way makes Stripe retry, and the retry finishes the job', async () => {
  const net = mockNet(); net.failOn = 'purchases/';
  await assert.rejects(api.fetch(hook(paidEvent()), ENV, {}, net));   // the Worker errors, so Stripe tries again later
  assert.equal(net.docs.has('gifts/uidABC123/items/stripe_cs_live_42'), true);
  assert.equal((await api.fetch(hook(paidEvent()), ENV, {}, net)).status, 200);
  assert.equal(net.docs.has('purchases/uidABC123/items/cs_live_42'), true);
});

test('webhook: forged, unpaid and odd notices deliver nothing', async () => {
  const net = mockNet();
  assert.equal((await api.fetch(hook(paidEvent(), 'whsec_guess'), ENV, {}, net)).status, 400);
  assert.equal((await api.fetch(post('/stripe-webhook', paidEvent()), ENV, {}, net)).status, 400);
  await api.fetch(hook(paidEvent({ payment_status: 'unpaid' })), ENV, {}, net);
  await api.fetch(hook(paidEvent({ metadata: { uid: 'uidABC123', product: 'pf_made_up' } })), ENV, {}, net);
  await api.fetch(hook(paidEvent({ metadata: { uid: '../admins/x', product: 'pf_no_ads' } })), ENV, {}, net);
  await api.fetch(hook(JSON.stringify({ type: 'charge.refunded', data: { object: {} } })), ENV, {}, net);
  assert.equal(net.docs.size, 0);
  assert.equal((await api.fetch(hook(paidEvent()), { STRIPE_WEBHOOK_SECRET: 'whsec_test' }, {}, net)).status, 503);
});

test('grant() signs in to Google with the service account', async () => {
  const sa = { client_email: 'svc@pulseform-d8282.iam.gserviceaccount.com', private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }) };
  const net = mockNet(), base = net;
  const f = async (url, opt) => {
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) {
      const jwt = new URLSearchParams(opt.body).get('assertion').split('.');
      const claims = JSON.parse(Buffer.from(jwt[1], 'base64url'));
      assert.equal(claims.iss, sa.client_email); assert.equal(claims.scope, 'https://www.googleapis.com/auth/datastore');
      const { createVerify } = await import('node:crypto');
      assert.ok(createVerify('RSA-SHA256').update(`${jwt[0]}.${jwt[1]}`).verify(publicKey, Buffer.from(jwt[2], 'base64url')));
      return new Response(JSON.stringify({ access_token: 'ya29.test' }));
    }
    if (String(url).startsWith('https://firestore.googleapis.com/')) { assert.equal(opt.headers.authorization, 'Bearer ya29.test'); return base(String(url).replace(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/pulseform-d8282\/databases\/\(default\)\/documents/, 'https://fs.test/docs'), opt); }
    return base(url, opt);
  };
  assert.equal(await grant({ GOOGLE_SERVICE_ACCOUNT: JSON.stringify(sa) }, 'uidABC123', 'pf_pass_s1', { id: 'cs_9', amount_total: 499 }, f), true);
  assert.equal(net.docs.has('purchases/uidABC123/items/cs_9'), true);
});
