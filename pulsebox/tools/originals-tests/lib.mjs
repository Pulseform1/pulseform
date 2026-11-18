import { chromium } from 'playwright';
export const B = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
export const issues = [];
export function note(game, msg) { issues.push(game + ': ' + msg); console.log('  ⚠ ' + msg); }
export async function open(id, opt = { viewport: { width: 1280, height: 800 } }) {
  const ctx = await B.newContext(opt), p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('console: ' + m.text()); });
  await p.goto(`file:///home/user/pulseform/pulsebox/public/games/${id}.html`); await p.waitForTimeout(400);
  await p.locator('#play').click(); await p.waitForTimeout(150);
  return p;
}
// click a point given in game coordinates (960x600)
export async function tap(p, x, y) { const r = await p.locator('#game').boundingBox(); await p.mouse.click(r.x + x * r.width / 960, r.y + y * r.height / 600); }
export async function ctl(p, name) { await p.locator(`#controls [data-action="${name}"]`).click(); }
// run the game's own update for t seconds of game time, quickly
export const sim = (p, t, dt = 1 / 60) => p.evaluate(([t, dt]) => { for (let s = 0; s < t; s += dt) { GAMES[ID].update?.(dt); } render(); }, [t, dt]);
// any NaN / Infinity anywhere in the state?
export const badNumbers = p => p.evaluate(() => { const out = []; const walk = (v, path, d) => { if (d > 6) return; if (typeof v === 'number' && !Number.isFinite(v)) out.push(path); else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], path + '.' + k, d + 1); }; walk(state, 'state', 0); return out; });
// random input for n steps: taps, drags, keys and control buttons
export async function fuzz(p, n, keys = []) {
  const r = await p.locator('#game').boundingBox();
  for (let i = 0; i < n; i++) {
    const k = Math.random();
    if (k < .45) await p.mouse.click(r.x + Math.random() * r.width, r.y + Math.random() * r.height);
    else if (k < .6) { await p.mouse.move(r.x + Math.random() * r.width, r.y + Math.random() * r.height); await p.mouse.down(); await p.mouse.move(r.x + Math.random() * r.width, r.y + Math.random() * r.height, { steps: 4 }); await p.mouse.up(); }
    else if (k < .75 && keys.length) await p.keyboard.press(keys[Math.floor(Math.random() * keys.length)]);
    else { const bs = p.locator('#controls button'), c = await bs.count(); if (c) await bs.nth(Math.floor(Math.random() * c)).click(); }
    if (i % 10 === 0) await p.evaluate(() => { for (let s = 0; s < 2; s += 1 / 30) GAMES[ID].update?.(1 / 30); });
  }
}
export async function finish(p, game) {
  const bad = await badNumbers(p); if (bad.length) note(game, 'non-finite numbers in state: ' + bad.join(', '));
  if (p.errs.length) note(game, 'page errors: ' + [...new Set(p.errs)].slice(0, 4).join(' | '));
  await p.context().close();
}
