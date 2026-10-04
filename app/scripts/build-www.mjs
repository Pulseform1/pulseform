// Builds app/www from the game: index.html with the PeerJS library built in (no extra file to load),
// the privacy policy, and the icons. Run from app/:  node scripts/build-www.mjs
// For the website without Google/Apple sign-in (email only):  node scripts/build-www.mjs --email-only
// (that copy goes to app/web-email-only/ instead, so the app's www/ is never built without its sign-in buttons)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const emailOnly = process.argv.includes('--email-only');
const www = path.resolve(here, '..', emailOnly ? 'web-email-only' : 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

const marker = "<script>\n(()=>{\n'use strict';";
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes(marker)) throw new Error('index.html: game script marker not found');
const peer = fs.readFileSync(path.join(root, 'vendor', 'peerjs.min.js'), 'utf8');
html = html.replace(marker, () => `<script>${peer}</script>\n${marker}`);
if (emailOnly) html = html.replace(marker, () => `<script>window.PF_EMAIL_ONLY=true;</script>\n${marker}`);
fs.writeFileSync(path.join(www, 'index.html'), html);

fs.copyFileSync(path.join(root, 'privacy.html'), path.join(www, 'privacy.html'));
fs.cpSync(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });
fs.mkdirSync(path.join(www, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(root, 'vendor', 'peerjs.min.js'), path.join(www, 'vendor', 'peerjs.min.js'));

console.log(`${emailOnly ? 'web-email-only' : 'www'} built: ${(html.length / 1024).toFixed(0)} KB index.html`);
