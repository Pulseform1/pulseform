// ARROWWOOD hub media: cover (600x600), two screenshots (1280x720) and a short trailer, rendered from the game itself
// on a stepped clock. Needs the local server (node arrowwood/server/node-server.js --dev) and ffmpeg.
//   node tools/arrowwood-media.mjs [frames dir]
import { createRequire } from 'module'; import { execSync } from 'node:child_process'; import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const OUT = new URL('../public/media/', import.meta.url).pathname, TMP = process.argv[2] || '/tmp/aw-frames', ONLY_COVER = process.argv.includes('--cover');
fs.mkdirSync(TMP, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript(() => { let now = 0, q = []; performance.now = () => now; window.requestAnimationFrame = cb => { q.push(cb); return q.length; }; window.__step = (n, ms) => { for (let i = 0; i < n; i++) { now += ms; const run = q; q = []; run.forEach(cb => cb(now)); } }; setInterval(() => { if (!window.__manual) window.__step(1, 33); }, 30); });
await p.goto('http://localhost:8790/games/arrowwood.html?dev&nolock&quality=medium'); p.setDefaultTimeout(300000); await p.waitForTimeout(800); await p.click('#bPlay');
for (let i = 0; i < 100 && !(await p.evaluate(() => GAME.test.ready)); i++) await p.waitForTimeout(300);
const st = (n, ms = 1000 / 24) => p.evaluate(([n, ms]) => window.__step(n, ms), [n, ms]);
const hideUi = () => p.evaluate(() => { document.getElementById('aw').style.display = 'none'; document.getElementById('cv').style.opacity = '0'; });
const showHud = () => p.evaluate(() => { document.getElementById('cv').style.opacity = '1'; });
await p.evaluate(() => { window.__manual = true; GAME.test.act('practice'); }); await st(30, 50);
await p.evaluate(() => { const room = GAME.test.CL.local.room; for (const q of room.players.values()) if (q.dummy) { q.home = [300, 300]; q.st.x = 300; q.st.z = 300; q.dummy = 'still'; } });   // the straw dummies step out of the picture
// a squad in the wood, bows up
const stageSquad = () => p.evaluate(() => { const T = GAME.test; T.stage({ id: 'a1', x: 66.4, z: 104.5, yaw: Math.PI * .82, team: 1, draw: 1, pitch: .08 }); T.stage({ id: 'a2', x: 73.6, z: 103.2, yaw: Math.PI * 1.18, team: 1, draw: .7, bow: 'cupid' }); T.stage({ id: 'a3', x: 69.3, z: 99.4, yaw: Math.PI * 1.02, team: 1, crouch: true, draw: 1, bow: 'cashout', pitch: .05 }); });
await stageSquad(); await p.evaluate(() => GAME.test.tp(70, 113.5, 0, -.04)); await st(30, 50);
await hideUi(); if (!ONLY_COVER) await p.screenshot({ path: OUT + 'arrowwood-shot1.jpg', type: 'jpeg', quality: 86 });
// full draw at the squad, HUD on
await showHud(); await p.evaluate(() => { GAME.test.tp(70.6, 112, .03, .01); GAME.test.startDraw(); }); await st(28, 50); await p.evaluate(() => document.getElementById('aw').style.display = 'none');
if (!ONLY_COVER) await p.screenshot({ path: OUT + 'arrowwood-shot2.jpg', type: 'jpeg', quality: 86 }); await p.evaluate(() => GAME.test.cancelDraw());
// cover: the Cashout finisher mid-burst (bills and coins in the air), framed square, with the title painted on
await hideUi(); await p.evaluate(() => { const T = GAME.test; T.tp(70, 113, 0, 0); T.stage({ id: 'cv', x: 70, z: 106, yaw: Math.PI, team: 1 }); T.finish('cv', 'cashout'); }); await st(17, 1000 / 24);
await p.screenshot({ path: TMP + '/cover-src.png', clip: { x: 280, y: 0, width: 720, height: 720 } });
await p.evaluate(() => { const T = GAME.test; T.ME.cam = 'fp'; T.ME.fin = null; });
if (ONLY_COVER) { await b.close(); }
// the trailer: the wood, a full draw, three finishers
if (!ONLY_COVER) {
await p.setViewportSize({ width: 960, height: 540 });
let f = 0; const rec = async (n, fn) => { for (let k = 0; k < n; k++) { if (fn) await p.evaluate(fn, k); await st(1); await p.screenshot({ path: `${TMP}/f${String(f++).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 82 }); } };
await p.evaluate(() => { GAME.test.tp(70, 113.5, -.2, -.02); }); await stageSquad();
await rec(40, k => { GAME.test.ME.st.yaw = -.25 + k * .012; });
await showHud(); await p.evaluate(() => { GAME.test.ME.st.yaw = .03; GAME.test.ME.st.pitch = .02; GAME.test.startDraw(); }); await rec(26); await p.evaluate(() => GAME.test.release()); await rec(14);
await hideUi();
for (const [bow, n] of [['yardstick', 40], ['cashout', 40], ['longbow', 36]]) { await p.evaluate(b => { const T = GAME.test; T.tp(70, 113.5, 0, 0); T.stage({ id: 'v' + b, x: 70, z: 106, yaw: Math.PI, team: 1 }); T.finish('v' + b, b); }, bow); await rec(n); await p.evaluate(() => { GAME.test.ME.cam = 'fp'; GAME.test.ME.fin = null; }); }
await b.close();
}
if (!ONLY_COVER) execSync(`ffmpeg -y -loglevel error -framerate 24 -i ${TMP}/f%04d.jpg -vf "scale=960:540,format=yuv420p" -c:v libx264 -preset slow -crf 27 -movflags +faststart ${OUT}arrowwood-trailer.mp4`);
// the cover: crop, title and a strap line
execSync(`ffmpeg -y -loglevel error -i ${TMP}/cover-src.png -vf "scale=600:600" ${TMP}/cover-sq.png`);
const py = `
from PIL import Image, ImageDraw, ImageFont, ImageFilter
im = Image.open('${TMP}/cover-sq.png').convert('RGB')
g = Image.new('L', im.size, 0); d = ImageDraw.Draw(g)
for y in range(600):
    a = max(0, int(200 * (y - 380) / 220)) if y > 380 else max(0, int(150 * (110 - y) / 110))
    d.line([(0, y), (600, y)], fill=a)
im = Image.composite(Image.new('RGB', im.size, (8, 12, 8)), im, g)
dr = ImageDraw.Draw(im)
def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf']:
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()
t = 'ARROWWOOD'; f = font(70); w = dr.textlength(t, font=f)
for dx, dy in [(3, 3), (2, 2)]: dr.text(((600 - w) / 2 + dx, 470 + dy), t, font=f, fill=(40, 28, 10))
dr.text(((600 - w) / 2, 470), t, font=f, fill=(233, 196, 106))
s = 'FOREST ARCHERY · 1v1 · 2v2 · FREE FOR ALL'; f2 = font(20); w2 = dr.textlength(s, font=f2); dr.text(((600 - w2) / 2, 552), s, font=f2, fill=(241, 234, 216))
im.save('${OUT}arrowwood-cover.jpg', quality=88)
`;
fs.writeFileSync(TMP + '/cover.py', py); execSync(`python3 ${TMP}/cover.py`);
console.log('media written:', fs.readdirSync(OUT).filter(n => n.startsWith('arrowwood')).join(', '));
