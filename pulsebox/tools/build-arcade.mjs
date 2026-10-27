// Builds the AFTERHOURS arcade (five 3D co-op games) for box.pulseform.org: public/media/arcade.html.
// The source is the user's own portable build, arcade/AFTERHOURS.html, used as is apart from a joystick for touch screens and two links: co-op connects to
// wss://<this site>/api/arcade (the ArcadeRooms Durable Object, arcade-rooms.js) and THE HOLLOW link points at our copy.
// It is 2 MB of embedded art, too big for the worker script, so it lives in media/ and is served from jsDelivr like the trailers.
// public/games/<id>.html are small pages that open one game: media/arcade.html?game=<sim id>.
// Run from anywhere: node tools/build-arcade.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..');
let html = await readFile(resolve(here, 'arcade/AFTERHOURS.html'), 'utf8');
const swaps = [['location.host}/arcade/socket`', 'location.host}/api/arcade`'], ['href="THE-HOLLOW.html"', 'href="/games/the-hollow.html" target="_top"']];
for (const [from, to] of swaps) { if (!html.includes(from)) throw new Error(`AFTERHOURS.html changed shape (${from}); update build-arcade.mjs`); html = html.replace(from, to); }
// Roblox-style thumbstick, as in THE HOLLOW: the arrow pad is replaced by a floating joystick on the left of the screen that
// presses the same WASD keys (the games' look-drag already ignores the left 35% of the screen)
const stick = `<style>#touchControls .move-pad{display:none!important}#stickZone{position:fixed;left:0;bottom:0;width:35%;height:60%;z-index:5;touch-action:none;pointer-events:auto}#stickBase{position:fixed;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.25);pointer-events:none;opacity:.55}#stickKnob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.55)}@media (min-width:601px) and (pointer:coarse){#stickBase{width:170px;height:170px;margin:-85px 0 0 -85px}#stickKnob{width:72px;height:72px;margin:-36px 0 0 -36px}}</style><script>(()=>{const z=document.createElement('div');z.id='stickZone';z.innerHTML='<div id="stickBase"><div id="stickKnob"></div></div>';document.getElementById('touchControls').appendChild(z);
const base=z.firstChild,knob=base.firstChild,down={};let id=null,ox=0,oy=0;
const rest=()=>{const r=z.getBoundingClientRect(),b=base.offsetWidth;base.style.left=(r.left+b*.5+30)+'px';base.style.top=(r.bottom-b*.5-30)+'px';base.style.opacity=.55;knob.style.transform=''};
const press=(k,on)=>{if(!!down[k]===on)return;down[k]=on;window.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:k,key:k.slice(3).toLowerCase(),bubbles:true}))};
const set=(dx,dy)=>{const R=base.offsetWidth/2,d=Math.hypot(dx,dy),m=Math.min(d,R),a=Math.atan2(dy,dx);knob.style.transform='translate('+Math.cos(a)*m+'px,'+Math.sin(a)*m+'px)';const on=d>R*.25,c=Math.cos(a),s=Math.sin(a);press('KeyW',on&&s<-.38);press('KeyS',on&&s>.38);press('KeyA',on&&c<-.38);press('KeyD',on&&c>.38)};
const end=e=>{if(e.pointerId!==id)return;id=null;set(0,0);['KeyW','KeyA','KeyS','KeyD'].forEach(k=>press(k,false));rest()};
z.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;z.setPointerCapture(id);ox=e.clientX;oy=e.clientY;base.style.left=ox+'px';base.style.top=oy+'px';base.style.opacity=1;set(0,0)});
z.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX-ox,e.clientY-oy)});
for(const t of['pointerup','pointercancel','lostpointercapture'])z.addEventListener(t,end);
addEventListener('resize',()=>{if(id===null)rest()});new MutationObserver(()=>id===null&&rest()).observe(document.getElementById('playScreen'),{attributes:true});rest()})()</script>`;
if (!html.includes('<div class="move-pad">') || !html.includes('</body>')) throw new Error('AFTERHOURS.html touch controls changed shape; update build-arcade.mjs');
html = html.replace('</body>', () => stick + '</body>');
await writeFile(resolve(here, 'public/media/arcade.html'), html);
const GAMES = { 'neon-overdrive': ['neon', 'Neon Overdrive'], 'deep-signal-coop': ['deep', 'Deep Signal Co-op'], 'ashfall-arena': ['ash', 'Ashfall Arena'], 'skybound': ['sky', 'Skybound'], 'chamber-zero': ['chamber', 'Chamber Zero'] };
for (const [id, [sim, title]] of Object.entries(GAMES)) {
  const url = `../media/arcade.html?game=${sim}`;
  await writeFile(resolve(here, `public/games/${id}.html`), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><script>location.replace('${url}')</script></head>
<body style="background:#05070a;color:#fff;font-family:sans-serif"><a href="${url}" style="color:#7df">Play ${title}</a></body></html>
`);
}
console.log(`public/media/arcade.html ${Math.round(Buffer.byteLength(html) / 1024)} KB, ${Object.keys(GAMES).length} game pages`);
