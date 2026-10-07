// Publishes the website (app/web-email-only, built with: node scripts/build-www.mjs --email-only) to Cloudflare as
// Workers static assets. Static asset requests are free and unlimited on every Cloudflare plan and never run any
// code, so a flood of bot requests can't use up the daily Workers request allowance or take the site down.
//
//   node scripts/deploy-cf.mjs                         the live site (Worker "pulseform": pulseform.org, pulseform.win)
//   node scripts/deploy-cf.mjs --script pulseform-beta  a test copy under another Worker name
//   node scripts/deploy-cf.mjs --www                   the tiny Worker that sends www.* to the bare domain
//   node scripts/deploy-cf.mjs --api                   the payments Worker (app/api/worker.js, "pulseform-api" at api.pulseform.org)
//
// Needs curl, plus CLOUDFLARE_API_TOKEN (Workers Scripts: Edit) in the environment, unless a proxy adds it.
// Pages are served as /about and /privacy; /about.html redirects there. Unknown paths get 404.html.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { blake3 } from '@noble/hashes/blake3';

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '5bc70055125c3d8b33c79d12be0f1505';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const here = path.dirname(fileURLToPath(import.meta.url));
const api = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-deploy-'));

// curl does the requests, so a system proxy and its certificates are honoured
function curl(args, auth = process.env.CLOUDFLARE_API_TOKEN && `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`) {
  const out = execFileSync('curl', ['-sS', ...(auth ? ['-H', `Authorization: ${auth}`] : []), ...args], { maxBuffer: 64 << 20 }).toString();
  const j = JSON.parse(out);
  if (!j.success && j.success !== undefined) throw new Error(JSON.stringify(j.errors));
  return j;
}
const putScript = (name, metadata, files = []) => curl(['-X', 'PUT', `${api}/workers/scripts/${name}`,
  '-F', `metadata=${JSON.stringify(metadata)};type=application/json`, ...files.flatMap(f => ['-F', f])]);

if (process.argv.includes('--www')) {
  // www.pulseform.org and www.pulseform.win: a permanent redirect to the same path on the bare domain
  const js = path.join(tmp, 'www.js');
  fs.writeFileSync(js, `export default { fetch(request) { const u = new URL(request.url); u.hostname = u.hostname.replace(/^www\\./, ''); return Response.redirect(u.toString(), 301); } };\n`);
  putScript(arg('--script', 'pulseform-www'), { main_module: 'www.js', compatibility_date: '2026-09-01' }, [`www.js=@${js};type=application/javascript+module`]);
  console.log('www redirect Worker published');
  process.exit(0);
}

if (process.argv.includes('--api')) {
  // the payments Worker. keep_bindings: the Stripe and Google secrets added in the Cloudflare dashboard stay put.
  const name = arg('--script', 'pulseform-api');
  putScript(name, { main_module: 'worker.js', compatibility_date: '2026-09-01', keep_bindings: ['secret_text', 'plain_text'] },
    [`worker.js=@${path.resolve(here, '..', 'api', 'worker.js')};type=application/javascript+module`]);
  // its address, api.pulseform.org (does nothing if it's already attached)
  const zone = curl(['https://api.cloudflare.com/client/v4/zones?name=pulseform.org']).result[0];
  if (zone) curl(['-X', 'PUT', `${api}/workers/domains`, '-H', 'content-type: application/json',
    '--data', JSON.stringify({ hostname: 'api.pulseform.org', service: name, zone_id: zone.id, environment: 'production' })]);
  console.log(`Payments Worker "${name}" published${zone ? ' at https://api.pulseform.org' : ''}`);
  process.exit(0);
}

const script = arg('--script', 'pulseform');
const src = path.resolve(here, '..', 'web-email-only');
if (!fs.existsSync(path.join(src, 'index.html'))) throw new Error('Build the website first: node scripts/build-www.mjs --email-only');

// the files to publish: the website minus the party library (it's built into index.html) and notes for developers
const files = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f), rel = '/' + path.relative(src, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) { if (rel !== '/vendor') walk(full); continue; }
    if (f.toLowerCase().endsWith('.md')) continue;
    files[rel] = fs.readFileSync(full);
  }
})(src);
files['/404.html'] = fs.readFileSync(path.resolve(here, '..', '..', '404.html'));
// security headers on every response
files['/_headers'] = Buffer.from(`/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), geolocation=(), payment=()
`);

// the manifest Cloudflare asks for: each file's size and a hash of its contents (as wrangler computes it)
const TYPES = { html: 'text/html', txt: 'text/plain', xml: 'application/xml', png: 'image/png', svg: 'image/svg+xml', json: 'application/json', ico: 'image/x-icon' };
const manifest = {}, byHash = {};
for (const [rel, data] of Object.entries(files)) {
  const ext = path.extname(rel).slice(1), b64 = data.toString('base64');
  const hash = Buffer.from(blake3(b64 + ext)).toString('hex').slice(0, 32);
  manifest[rel] = { hash, size: data.length }; byHash[hash] = { b64, type: TYPES[ext] || 'application/octet-stream' };
}
const session = curl(['-X', 'POST', `${api}/workers/scripts/${script}/assets-upload-session`, '-H', 'content-type: application/json', '--data', JSON.stringify({ manifest })]).result;
let done = session.jwt;
for (const bucket of session.buckets || []) {
  const parts = bucket.flatMap(h => { const f = path.join(tmp, h); fs.writeFileSync(f, byHash[h].b64); return ['-F', `${h}=@${f};filename=${h};type=${byHash[h].type}`]; });
  const r = curl(['-X', 'POST', `${api}/workers/assets/upload?base64=true`, ...parts], `Bearer ${session.jwt}`);
  if (r.result && r.result.jwt) done = r.result.jwt;
}
console.log(`${Object.keys(files).length} files, ${(session.buckets || []).flat().length} uploaded (the rest were already there)`);

// an assets-only Worker: no code runs for any request. If Cloudflare insists on some code, a one-line Worker hands every
// request straight to the assets (only requests that match no file would reach it, and they get the 404 page).
const assets = { jwt: done, config: { html_handling: 'auto-trailing-slash', not_found_handling: '404-page' } };
try { putScript(script, { compatibility_date: '2026-09-01', assets }); }
catch (e) {
  console.log('Assets-only upload refused, adding a one-line Worker:', e.message);
  const js = path.join(tmp, 'assets.js');
  fs.writeFileSync(js, 'export default { fetch(request, env) { return env.ASSETS.fetch(request); } };\n');
  putScript(script, { main_module: 'assets.js', compatibility_date: '2026-09-01', assets, bindings: [{ type: 'assets', name: 'ASSETS' }] }, [`assets.js=@${js};type=application/javascript+module`]);
}
console.log(`Published "${script}" as static assets`);
