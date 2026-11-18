// Builds THE HOLLOW for box.pulseform.org: public/games/the-hollow.html, one self-contained page with solo and online co-op.
// The game's own source lives untouched in the-hollow/ (run `npm ci` there first). This mirrors the-hollow/scripts/build.mjs,
// which makes the solo-only portable file, with two differences: the co-op buttons stay, and the game connects to
// wss://<this site>/api/hollow, where the HollowRooms Durable Object (hollow-rooms.js) runs the same engine as server.js.
// Run from anywhere: node tools/build-hollow.mjs
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..'), root = resolve(here, 'the-hollow');
const { build } = createRequire(resolve(root, 'package.json'))('esbuild');
const aliases = { '/world.js': 'world.js', '/levels.js': 'levels.js', '/player-mechanics.js': 'player-mechanics.js', '/engine.js': 'engine.js', '/horror-director.js': 'horror-director.js', '/vendor/three.module.js': 'node_modules/three/build/three.module.js' };
const WS_FROM = '://${location.host}`', WS_TO = '://${location.host}/api/hollow`';
const result = await build({
  absWorkingDir: root, entryPoints: ['public/game.js'], bundle: true, write: false, minify: true, format: 'iife', target: 'es2022',
  plugins: [{ name: 'hollow-site', setup(b) {
    b.onResolve({ filter: /^\// }, a => aliases[a.path] ? { path: resolve(root, aliases[a.path]) } : null);
    b.onLoad({ filter: /public[\\/]game\.js$/ }, async a => {
      const src = await readFile(a.path, 'utf8');
      if (!src.includes(WS_FROM)) throw new Error('game.js no longer opens its WebSocket the expected way; update build-hollow.mjs');
      return { contents: src.replace(WS_FROM, WS_TO), loader: 'js', resolveDir: resolve(root, 'public') };
    });
  } }],
});
let css = await readFile(resolve(root, 'public/style.css'), 'utf8');
for (const name of ['barlow-condensed-latin-800-normal.woff2', 'ibm-plex-mono-latin-400-normal.woff2', 'inter-latin-400-normal.woff2']) {
  const font = await readFile(resolve(root, 'public/fonts', name)); css = css.replace(`/fonts/${name}`, `data:font/woff2;base64,${font.toString('base64')}`);
}
const icon = await readFile(resolve(root, 'public/favicon.svg'));
// phones: the menu and the briefing overlays are taller than a phone screen, so let them scroll and shrink the title
css += '\n@media (max-width:900px),(max-height:700px){main{top:56px!important;bottom:0;left:0!important;right:0;padding:0 6% 24px;overflow-y:auto;-webkit-overflow-scrolling:touch}h1{font-size:min(84px,18vw)!important;margin:14px 0!important}.description{display:none}footer{display:none}.actions{width:auto!important;max-width:320px}.overlay{overflow-y:auto;place-items:start center!important;-webkit-overflow-scrolling:touch}.overlay>div{margin:auto;padding:24px 16px 40px!important}.overlay h2{font-size:36px!important}.overlay p{font-size:11px!important;line-height:1.5!important;margin-bottom:14px!important}}';
// three layout sizes: iPhone (narrow), iPad/tablet (touch, mid-size), laptop (the game's own desktop layout)
css += '\n@media (max-width:600px){#navigation canvas{width:132px!important;height:76px!important}#navigation{top:auto!important;bottom:300px}.mission{max-width:calc(100% - 28px)}.move-pad button{width:56px!important;height:56px!important}.touch-actions button,#playButtons button{padding:12px 10px!important;font-size:9px!important}}';
css += '\n@media (min-width:601px) and (max-width:1366px) and (pointer:coarse){.move-pad button{width:72px!important;height:72px!important;font-size:22px}.touch-actions button,#playButtons button{padding:20px 22px!important;font-size:12px!important}.touch-mode #touchControls{bottom:40px!important;left:36px!important;right:36px!important}#navigation canvas{width:240px!important;height:137px!important}main{left:7%!important}h1{font-size:120px!important}}';
// Roblox-style thumbstick: on touch screens the arrow pad is replaced by a floating joystick on the left of the screen.
// It presses the same WASD keys the arrows did (the game's look-drag already ignores the left 35% of the screen).
css += '\n.touch-mode .move-pad{display:none!important}#stickZone{display:none;position:fixed;left:0;bottom:0;width:35%;height:60%;z-index:5;touch-action:none;pointer-events:auto}.touch-mode #hud:not([hidden]) #stickZone{display:block}#stickBase{position:fixed;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(0,0,0,.25);pointer-events:none;opacity:.55}#stickKnob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.55)}@media (min-width:601px) and (pointer:coarse){#stickBase{width:170px;height:170px;margin:-85px 0 0 -85px}#stickKnob{width:72px;height:72px;margin:-36px 0 0 -36px}}';
// touch layout: actions in a right-hand column, HIDE/MAP/USE/MENU in a column beside it, stamina moved up out of the stick's way
css += '\n.touch-mode #touchControls .touch-actions{position:fixed!important;right:16px!important;bottom:16px!important;left:auto!important;top:auto!important;display:flex!important;flex-direction:column!important;gap:8px!important;margin:0!important}.touch-mode #touchControls>span{display:none}.touch-mode #playButtons{position:fixed!important;right:calc(16px + var(--colw,100px) + 8px)!important;bottom:16px!important;left:auto!important;top:auto!important;display:flex!important;flex-direction:column!important;gap:8px!important;margin:0!important}.touch-mode .touch-actions button,.touch-mode #playButtons button{width:var(--colw,100px)!important;margin:0!important;box-sizing:border-box}.touch-mode #staminaPanel{bottom:auto!important;top:calc(env(safe-area-inset-top) + 8px)!important;left:50%!important;transform:translateX(-50%) scale(.8);transform-origin:top center}.touch-mode #stickZone{z-index:20}@media (max-width:600px),(max-height:500px){.touch-mode{--colw:84px}.touch-mode .touch-actions button,.touch-mode #playButtons button{padding:10px 4px!important;font-size:10px!important}}@media (max-height:500px){.touch-mode #navigation canvas{width:150px!important;height:86px!important}.touch-mode #navigation{top:8px!important;bottom:auto!important}.touch-mode .mission{transform:scale(.75);transform-origin:top left}}@media (min-width:601px) and (min-height:501px) and (pointer:coarse){.touch-mode{--colw:130px}.touch-mode .touch-actions,.touch-mode #playButtons{bottom:36px!important}}';
// phones held upright during play get a "turn your phone sideways" screen until they rotate
css += '\n#rotateNote{display:none}@media (orientation:portrait) and (max-width:600px){.touch-mode #hud:not([hidden]) #rotateNote{display:grid;place-items:center;position:fixed;inset:0;z-index:50;background:rgba(5,8,7,.96);color:#e8eadf;text-align:center;font:600 22px/1.4 "Barlow Condensed",sans-serif;letter-spacing:.08em;padding:24px}#rotateNote b{display:block;font-size:64px;animation:rot 1.6s ease-in-out infinite}}@keyframes rot{0%,30%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}';
const stick = `<script>(()=>{const z=document.createElement('div');z.id='stickZone';z.innerHTML='<div id="stickBase"><div id="stickKnob"></div></div>';document.getElementById('hud').appendChild(z);const n=document.createElement('div');n.id='rotateNote';n.innerHTML='<div><b>📱</b>TURN YOUR PHONE SIDEWAYS<br><small>THE HOLLOW PLAYS IN LANDSCAPE</small></div>';document.getElementById('hud').appendChild(n);
const base=z.firstChild,knob=base.firstChild,down={};let id=null,ox=0,oy=0;
const rest=()=>{const r=z.getBoundingClientRect(),b=base.offsetWidth;base.style.left=(r.left+b*.5+30)+'px';base.style.top=(r.bottom-b*.5-30)+'px';base.style.opacity=.55;knob.style.transform=''};
const press=(k,on)=>{if(!!down[k]===on)return;down[k]=on;document.dispatchEvent(new KeyboardEvent(on?'keydown':'keyup',{code:k,key:k.slice(3).toLowerCase(),bubbles:true}))};
const set=(dx,dy)=>{const R=base.offsetWidth/2,d=Math.hypot(dx,dy),m=Math.min(d,R),a=Math.atan2(dy,dx);knob.style.transform='translate('+Math.cos(a)*m+'px,'+Math.sin(a)*m+'px)';const on=d>R*.25,c=Math.cos(a),s=Math.sin(a);press('KeyW',on&&s<-.38);press('KeyS',on&&s>.38);press('KeyA',on&&c<-.38);press('KeyD',on&&c>.38)};
const end=e=>{if(e.pointerId!==id)return;id=null;set(0,0);['KeyW','KeyA','KeyS','KeyD'].forEach(k=>press(k,false));rest()};
z.addEventListener('pointerdown',e=>{if(id!==null)return;e.preventDefault();id=e.pointerId;z.setPointerCapture(id);ox=e.clientX;oy=e.clientY;base.style.left=ox+'px';base.style.top=oy+'px';base.style.opacity=1;set(0,0)});
z.addEventListener('pointermove',e=>{if(e.pointerId===id)set(e.clientX-ox,e.clientY-oy)});
for(const t of['pointerup','pointercancel','lostpointercapture'])z.addEventListener(t,end);
addEventListener('resize',()=>{if(id===null)rest()});new MutationObserver(()=>id===null&&rest()).observe(document.getElementById('hud'),{attributes:true});rest()})()</script>`;
let html = await readFile(resolve(root, 'public/index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${css}</style>`)
  .replace('<link rel="icon" href="/favicon.svg">', `<link rel="icon" href="data:image/svg+xml;base64,${icon.toString('base64')}">`)
  .replace('<script type="module" src="/game.js"></script>', () => `<script>${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace('href="/"', 'href=""').replace('</body>', () => stick + '</body>');
for (const s of ['<style>', '<script>', 'stickZone']) if (!html.includes(s)) throw new Error('the-hollow/public/index.html changed shape; update build-hollow.mjs');
await writeFile(resolve(here, 'public/games/the-hollow.html'), html);
console.log(`public/games/the-hollow.html ${Math.round(Buffer.byteLength(html) / 1024)} KB (solo + online co-op via /api/hollow)`);
