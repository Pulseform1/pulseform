// Cuts the Duelpoint trailer: lays the shots from shoot.mjs on a timeline, grades them, adds captions, the agent
// roll-call, flash cuts and the closing title card (all HTML/CSS, drawn frame by frame), and encodes the MP4.
//   node cut.mjs <shots-dir> <out.mp4> [preview]     (preview: every 3rd frame, for a quick look)
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execFileSync } from 'child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const [SHOTS, OUT, MODE] = process.argv.slice(2), FPS = 30, W = 1280, H = 720;
const AG = [['VANTA', 'Duelist', '#e25cff'], ['NOVA', 'Striker', '#ffe14d'], ['BASTION', 'Warden', '#ffb347'], ['TESSEL', 'Architect', '#ff9ec7'], ['EMBER', 'Pyre', '#ff7a2f'],
  ['AXIOM', 'Engineer', '#5aa0ff'], ['WRAITH', 'Phantom', '#a9b8ff'], ['IRIS', 'Seer', '#35e0c8'], ['TALON', 'Tracker', '#7bd65a'], ['VEX', 'Shade', '#8f6bff']];
// the timeline: [shot folder, first frame, frames used, kind, caption...]
const T = [
  { s: 'hero', a: 4, n: 62, k: 'open' },
  { s: 'map0', a: 3, n: 24, k: 'map', name: 'DUNEWATCH', i: 1 }, { s: 'map1', a: 3, n: 24, k: 'map', name: 'OVERGROWTH', i: 2 }, { s: 'map2', a: 3, n: 24, k: 'map', name: 'FOUNDRY', i: 3 },
  { s: 'map3', a: 3, n: 24, k: 'map', name: 'ORBITAL', i: 4 }, { s: 'map4', a: 3, n: 24, k: 'map', name: 'FROSTLINE', i: 5 },
  { s: 'lineup', a: 0, n: 124, k: 'agents' },
  { s: 'fight', a: 6, n: 56, k: 'hud', kick: 'FIRST PERSON · TACTICAL', title: 'EVERY BULLET COUNTS' },
  { s: 'sniper', a: 8, n: 50, k: 'hud', kick: '17 WEAPONS', title: 'ONE SHOT. ONE ROUND.' },
  { s: 'rampart', a: 2, n: 40, k: 'ab', who: 'BASTION', title: 'RAMPART', col: '#ffb347' }, { s: 'sentry', a: 2, n: 40, k: 'ab', who: 'AXIOM', title: 'SENTRY', col: '#5aa0ff' },
  { s: 'glass', a: 6, n: 46, k: 'ab', who: 'TESSEL · ULTIMATE', title: 'GLASSHOUSE', col: '#ff9ec7' }, { s: 'fire', a: 4, n: 42, k: 'ab', who: 'EMBER', title: 'IGNITE', col: '#ff7a2f' },
  { s: 'boom', a: 4, n: 54, k: 'cap', kick: 'PLANT · DEFEND · DEFUSE', title: 'HOLD THE SITE' },
  { s: 'clash', a: 4, n: 62, k: 'cap', kick: 'PLAY WITH FRIENDS · RANKED', title: '1v1 TO 5v5' },
  { s: 'title', a: 0, n: 132, k: 'title' }
];
let at = 0; for (const c of T) { c.t0 = at; at += c.n; } const TOTAL = at;
console.log('timeline', (TOTAL / FPS).toFixed(1) + ' s,', TOTAL, 'frames');
const frames = path.join(SHOTS, '_cut'); fs.rmSync(frames, { recursive: true, force: true }); fs.mkdirSync(frames, { recursive: true });
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&display=block"><style>
  html,body{margin:0;background:#000;overflow:hidden} #st{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#05060a;font-family:'Chakra Petch',sans-serif;color:#efe9dc}
  #f{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%}
  .vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 52%,rgba(4,5,12,.55) 100%)} .tint{position:absolute;inset:0;mix-blend-mode:soft-light;background:linear-gradient(180deg,rgba(60,90,255,.16),rgba(255,120,40,.12))}
  .bar{position:absolute;left:0;right:0;background:#04050a} #fl{position:absolute;inset:0;background:#fff;opacity:0} #dk{position:absolute;inset:0;background:#04050a;opacity:0}
  .cap{position:absolute;left:64px;bottom:70px} .kick{font-weight:700;font-size:21px;letter-spacing:.3em;color:#ff8a3d;text-shadow:0 0 14px rgba(0,0,0,.95),0 2px 4px rgba(0,0,0,.9)}
  .big{font-weight:700;font-size:64px;line-height:1;letter-spacing:.02em;text-shadow:0 4px 0 rgba(0,0,0,.35),0 8px 30px rgba(0,0,0,.6);margin-top:6px;white-space:nowrap}
  .rule{height:4px;background:#ff8a3d;margin-top:12px;box-shadow:0 0 16px rgba(255,138,61,.7)}
  .tag{position:absolute;top:58px;left:60px;display:flex;align-items:center;gap:11px;font-weight:700;font-size:23px;letter-spacing:.14em;text-shadow:0 2px 8px rgba(0,0,0,.7)} .tag i{width:6px;height:25px;background:#ff8a3d;display:block}
  .cnt{position:absolute;top:54px;right:60px;text-align:right;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,.7)} .cnt b{font-size:62px;line-height:.9;display:block} .cnt span{font-size:20px;letter-spacing:.3em;color:#ff8a3d;text-shadow:0 0 14px rgba(0,0,0,.95),0 2px 4px rgba(0,0,0,.9)}
  .scrim{position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(180deg,transparent,rgba(4,5,12,.78))}
  #logo{position:absolute;left:0;right:0;top:214px;text-align:center} #logo .w{display:inline-flex;align-items:center;gap:22px;font-weight:700;font-size:136px;letter-spacing:.04em;line-height:1;text-shadow:0 6px 0 rgba(0,0,0,.4),0 0 60px rgba(255,138,61,.25)}
  #logo .w i{width:18px;height:112px;background:#ff8a3d;display:block;box-shadow:0 0 30px rgba(255,138,61,.8)} #logo .w span{display:inline-block}
  #sub{position:absolute;left:0;right:0;top:372px;text-align:center;font-weight:600;font-size:25px;letter-spacing:.42em;color:#efe9dc}
  #chips{position:absolute;left:0;right:0;top:446px;display:flex;justify-content:center;gap:14px} #chips div{padding:10px 20px;border:2px solid rgba(239,233,220,.4);border-radius:10px;font-weight:700;font-size:22px;letter-spacing:.16em;background:rgba(10,12,22,.55)}
  #cta{position:absolute;left:0;right:0;top:548px;text-align:center} #cta b{display:inline-block;padding:15px 34px;border-radius:14px;background:#c6ff3d;color:#0a0c12;font-weight:700;font-size:27px;letter-spacing:.14em;box-shadow:0 0 44px rgba(198,255,61,.5)}
  #url{position:absolute;left:0;right:0;top:632px;text-align:center;font-weight:600;font-size:17px;letter-spacing:.3em;color:#9aa3b8}
</style></head><body><div id="st"><img id="f"><div class="tint"></div><div class="vig"></div><div class="scrim" id="scrim"></div>
  <div class="bar" id="b1" style="top:0"></div><div class="bar" id="b2" style="bottom:0"></div>
  <div class="tag" id="tag"><i></i>DUELPOINT</div><div class="cnt" id="cnt"><b></b><span></span></div>
  <div class="cap" id="cap"><div class="kick"></div><div class="big"></div><div class="rule"></div></div>
  <div id="dk"></div><div id="tl" style="position:absolute;inset:0"><div id="logo"><div class="w"><i></i>${'DUELPOINT'.split('').map(c => `<span>${c}</span>`).join('')}</div></div><div id="sub">THE TACTICAL SHOOTER IN YOUR BROWSER</div>
  <div id="chips"><div>10 AGENTS</div><div>14 MAPS</div><div>1v1 TO 5v5</div><div>RANKED</div></div><div id="cta"><b>PLAY FREE ON PULSEBOX</b></div><div id="url">BOX.PULSEFORM.ORG</div></div>
  <div id="fl"></div></div>
<script>
const T = ${JSON.stringify(T)}, AG = ${JSON.stringify(AG)}, SHOTS = ${JSON.stringify('file://' + path.resolve(SHOTS))}, $ = id => document.getElementById(id);
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), ease = t => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); }, out3 = t => 1 - Math.pow(1 - cl(t, 0, 1), 3), pad = n => String(n).padStart(4, '0');
window.draw = async n => {
  const c = T.find(c => n >= c.t0 && n < c.t0 + c.n), k = n - c.t0, t = k / 30, left = c.n - k, img = $('f');
  img.src = SHOTS + '/' + c.s + '/' + pad(c.a + k) + '.jpg'; await img.decode();
  const cine = c.k !== 'hud', punch = c.k === 'title' ? 1.04 - .04 * ease(t / 4) : 1 + .05 * (1 - out3(k / 7));
  img.style.transform = 'scale(' + punch + ')'; img.style.filter = c.k === 'title' ? 'brightness(.42) saturate(1.25) blur(2px)' : c.k === 'hud' ? 'contrast(1.05) saturate(1.08)' : 'contrast(1.1) saturate(1.16) brightness(1.02)';
  const bh = c.k === 'hud' || c.k === 'title' ? 0 : c.k === 'open' ? 62 : 44; $('b1').style.height = $('b2').style.height = bh + 'px';
  $('fl').style.opacity = c.k === 'open' && k < 2 ? 0 : k < 4 && n > 0 ? [.4, .24, .12, .05][k] : 0;
  $('dk').style.opacity = c.k === 'open' ? 1 - ease(t / .55) : 0;
  $('tag').style.opacity = c.k === 'title' || c.k === 'open' || c.k === 'hud' ? 0 : .85; $('scrim').style.opacity = c.k === 'hud' || c.k === 'title' || c.k === 'open' ? 0 : 1;
  // captions: a kicker, a big line that slides in, a rule that draws
  const cap = $('cap'), kick = cap.children[0], big = cap.children[1], rule = cap.children[2], cnt = $('cnt'); let K = '', B = '', col = '#ff8a3d', show = true; cnt.style.opacity = 0;
  if (c.k === 'open') { K = 'PULSEBOX PRESENTS'; B = ''; show = t > .5; }
  else if (c.k === 'map') { K = 'MAP ' + String(c.i).padStart(2, '0') + ' / 14'; B = c.name; cnt.style.opacity = 1; cnt.children[0].textContent = '14'; cnt.children[1].textContent = 'MAPS'; }
  else if (c.k === 'agents') { const x = -.7 + (12.68 + .7) * ease(t / 4.2) + .5, i = cl(Math.round(x / 1.42), 0, 9); K = AG[i][1].toUpperCase(); B = AG[i][0]; col = AG[i][2]; cnt.style.opacity = 1; cnt.children[0].textContent = '10'; cnt.children[1].textContent = 'AGENTS';
    c._i = i; }
  else if (c.k === 'ab') { K = c.who; B = c.title; col = c.col; cnt.style.opacity = 1; cnt.children[0].textContent = ''; cnt.children[1].textContent = 'ABILITIES & ULTIMATES'; }
  else if (c.k === 'hud' || c.k === 'cap') { K = c.kick; B = c.title; }
  else show = false;
  cap.style.display = show ? '' : 'none'; kick.textContent = K; big.textContent = B; kick.style.color = col; rule.style.background = col; rule.style.boxShadow = '0 0 16px ' + col;
  // (the agents' names change with the camera: each slides in afresh)
  let kk = k; if (c.k === 'agents') { if (window.__ai !== c._i) { window.__ai = c._i; window.__ak = k; } kk = k - window.__ak; } else if (c.k === 'open') kk = k - 15;
  const sl = out3(kk / (c.k === 'agents' ? 5 : 9)); cap.style.transform = 'translateX(' + (-40 * (1 - sl)) + 'px)'; cap.style.opacity = sl * (c.k === 'open' ? cl(left / 8, 0, 1) : 1);
  rule.style.width = (c.k === 'open' ? 0 : 120 + 200 * out3(kk / 16)) + 'px'; big.style.fontSize = c.k === 'hud' ? '52px' : c.k === 'cap' ? '66px' : c.k === 'agents' ? '88px' : '74px';
  cap.style.bottom = c.k === 'hud' ? 'auto' : c.k === 'open' ? '96px' : '74px'; cap.style.top = c.k === 'hud' ? '128px' : 'auto'; cap.style.padding = c.k === 'hud' ? '14px 30px 16px' : '0'; cap.style.background = c.k === 'hud' ? 'rgba(6,8,16,.72)' : 'none'; cap.style.borderRadius = '16px'; cap.style.left = c.k === 'hud' ? '50%' : '64px'; if (c.k === 'hud') { cap.style.transform += ' translateX(-50%)'; cap.style.textAlign = 'center'; rule.style.margin = '12px auto 0'; } else { cap.style.textAlign = 'left'; rule.style.margin = '12px 0 0'; }
  if (c.k === 'open') { kick.style.fontSize = '26px'; kick.style.color = '#efe9dc'; } else kick.style.fontSize = '21px';
  // the title card: the wordmark's letters land one by one, then the lines under it
  const tl = $('tl'); tl.style.display = c.k === 'title' ? '' : 'none';
  if (c.k === 'title') { const L = document.querySelectorAll('#logo .w span'), bar = document.querySelector('#logo .w i'); bar.style.transform = 'scaleY(' + out3(k / 8) + ')';
    L.forEach((s, i) => { const u = out3((k - 4 - i * 1.6) / 9); s.style.opacity = u; s.style.transform = 'translateY(' + (26 * (1 - u)) + 'px) scale(' + (1.25 - .25 * u) + ')'; });
    const up = (id, f0) => { const u = out3((k - f0) / 12); $(id).style.opacity = u; $(id).style.transform = 'translateY(' + (16 * (1 - u)) + 'px)'; }; up('sub', 24); up('url', 62);
    [...$('chips').children].forEach((d, i) => { const u = out3((k - 34 - i * 4) / 10); d.style.opacity = u; d.style.transform = 'translateY(' + (14 * (1 - u)) + 'px)'; });
    const u = out3((k - 54) / 12), pulse = 1 + .025 * Math.sin(Math.max(0, k - 66) / 30 * 6.283 * 1.1); $('cta').style.opacity = u; $('cta').style.transform = 'scale(' + ((.9 + .1 * u) * pulse) + ')';
    $('dk').style.opacity = k < 6 ? .5 * (1 - k / 6) : left < 10 ? 1 - left / 10 : 0; }
};
</script></body></html>`;
fs.writeFileSync(path.join(SHOTS, 'cut.html'), html);
const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage(); p.on('pageerror', e => console.log('PAGE ERROR', String(e)));
await p.goto('file://' + path.resolve(SHOTS, 'cut.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
const step = MODE === 'preview' ? 3 : 1, t0 = Date.now(); let m = 0;
for (let n = 0; n < TOTAL; n += step) { await p.evaluate(n => window.draw(n), n); await p.screenshot({ path: path.join(frames, String(m++).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: W, height: H } }); }
await b.close(); console.log(m, 'frames composed in', ((Date.now() - t0) / 1000).toFixed(0), 's');
if (MODE === 'frames') process.exit(0);
const rate = MODE === 'preview' ? 10 : FPS, KB = +(process.env.KBPS || 950), base = ['-v', 'error', '-y', '-framerate', String(rate), '-i', path.join(frames, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'veryslow', '-b:v', KB + 'k', '-maxrate', Math.round(KB * 1.9) + 'k', '-bufsize', KB * 3 + 'k', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '60', '-passlogfile', path.join(SHOTS, 'x264pass')];
execFileSync('ffmpeg', [...base, '-pass', '1', '-an', '-f', 'null', '/dev/null'], { stdio: 'inherit' });
execFileSync('ffmpeg', [...base, '-pass', '2', '-movflags', '+faststart', '-an', OUT], { stdio: 'inherit' }); console.log(OUT, (fs.statSync(OUT).size / 1048576).toFixed(2), 'MB');
