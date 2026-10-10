// Builds app/web-cf/worker.js: the whole website (game, privacy policy, icons) as one Cloudflare Worker.
// Run from app/:  node scripts/build-www.mjs --email-only && node scripts/build-cf-worker.mjs
// Deploy (needs a Cloudflare API token with Workers Scripts: Edit on the account that owns pulseform.win):
//   PUT https://api.cloudflare.com/client/v4/accounts/<account id>/workers/scripts/pulseform
//   multipart: metadata={"main_module":"worker.js","compatibility_date":"2026-09-01"}, worker.js (application/javascript+module)
// pulseform.org, pulseform.win and their www. names are attached to the "pulseform" Worker as custom domains.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '..', 'web-email-only');
const out = path.resolve(here, '..', 'web-cf');
if (!fs.existsSync(path.join(src, 'index.html'))) throw new Error('Build the website first: node scripts/build-www.mjs --email-only');

const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown', '.json': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json' };
const files = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f), rel = '/' + path.relative(src, full).split(path.sep).join('/');
    if (fs.statSync(full).isDirectory()) { if (rel !== '/vendor') walk(full); continue; }   // PeerJS is already built into index.html
    const ext = path.extname(f).toLowerCase(), t = TYPES[ext] || 'application/octet-stream', data = fs.readFileSync(full);
    const text = t.startsWith('text/') || t === 'image/svg+xml' || t.startsWith('application/json') || t.startsWith('application/xml') || t.startsWith('application/manifest');
    files[rel] = { t, s: text ? data.toString('utf8') : null, b: text ? null : data.toString('base64') };
  }
})(src);

const js = `// Pulseform website: serves the game, the privacy policy and the icons from this one Worker.
const FILES = ${JSON.stringify(files)};
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('www.')) { url.hostname = url.hostname.slice(4); return Response.redirect(url.toString(), 301); }
    let p = decodeURIComponent(url.pathname);
    if (p === '/' || p === '') p = '/index.html';
    if (!FILES[p] && FILES[p + '.html']) p = p + '.html';
    const f = FILES[p];
    if (!f) return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    const html = f.t.startsWith('text/html') || p === '/sw.js';   // pages and the service worker are always checked for a newer version
    return new Response(f.s !== null ? f.s : b64(f.b), { headers: {
      'content-type': f.t,
      'cache-control': html ? 'no-cache' : 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
    } });
  },
};
`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'worker.js'), js);
console.log(`web-cf/worker.js built: ${(js.length / 1024).toFixed(0)} KB, ${Object.keys(files).length} files`);
