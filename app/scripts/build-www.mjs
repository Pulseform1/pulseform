// Builds app/www from the game: index.html with the PeerJS library built in (no extra file to load),
// the privacy policy, and the icons. Run from app/:  node scripts/build-www.mjs
// For the website without Google/Apple sign-in (email only):  node scripts/build-www.mjs --email-only
// (that copy goes to app/web-email-only/ instead, so the app's www/ is never built without its sign-in buttons)
// For CrazyGames:  node scripts/build-www.mjs --crazygames   (goes to app/web-crazygames/; upload its index.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const emailOnly = process.argv.includes('--email-only');
const crazy = process.argv.includes('--crazygames');
const outName = crazy ? 'web-crazygames' : emailOnly ? 'web-email-only' : 'www';
const www = path.resolve(here, '..', outName);

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

const marker = "<script>\n(()=>{\n'use strict';";
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes(marker)) throw new Error('index.html: game script marker not found');
const peer = fs.readFileSync(path.join(root, 'vendor', 'peerjs.min.js'), 'utf8');
html = html.replace(marker, () => `<script>${peer}</script>\n${marker}`);
if (emailOnly) html = html.replace(marker, () => `<script>window.PF_EMAIL_ONLY=true;</script>\n${marker}`);
if (crazy) {
  // CrazyGames: load their SDK, start it, and only then run the game with window.PF_CG set, because the game picks its
  // save storage (the CrazyGames Data module) the moment it starts. The game's script is held as text until then.
  html = html.replace(marker, () => marker.replace('<script>', '<script type="text/plain" id="pfGameSrc">'));
  const loader = `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
<script>
(function(){ var started=false;
  function run(){ if(started) return; started=true; var src=document.getElementById('pfGameSrc'), s=document.createElement('script'); s.textContent=src.textContent; document.body.appendChild(s); }
  try{ var S=window.CrazyGames&&window.CrazyGames.SDK; if(!S){ run(); return; }
    S.init().then(function(){ if(S.environment&&S.environment!=='disabled'){ window.PF_CG=true; try{ S.game.loadingStart(); }catch(e){} } run(); }, run);
    setTimeout(run,8000);   // never leave a player on a blank screen if the SDK hangs
  }catch(e){ run(); } })();
</script>
`;
  html = html.replace('</body>', () => loader + '</body>');
}
fs.writeFileSync(path.join(www, 'index.html'), html);

fs.copyFileSync(path.join(root, 'privacy.html'), path.join(www, 'privacy.html'));
fs.cpSync(path.join(root, 'icons'), path.join(www, 'icons'), { recursive: true });
fs.mkdirSync(path.join(www, 'vendor'), { recursive: true });
fs.copyFileSync(path.join(root, 'vendor', 'peerjs.min.js'), path.join(www, 'vendor', 'peerjs.min.js'));

console.log(`${outName} built: ${(html.length / 1024).toFixed(0)} KB index.html`);
