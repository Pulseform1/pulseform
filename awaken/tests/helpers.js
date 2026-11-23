// Shared Playwright helpers for the Awaken regression suites. Run with: node tests/run.js (from awaken/, server on :8765)
const { chromium, devices } = require('playwright');
const BASE = process.env.AWAKEN_URL || 'http://127.0.0.1:8765/index.html';
let failed = 0;
const assert = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) { failed++; process.exitCode = 1; } };
const quiet = p => p.evaluate(() => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } });
// accept the System, sign the contract with a drawn stroke, take the assessment
async function awaken(p, name = 'Tester') {
  await p.goto(BASE); await p.waitForTimeout(300);
  await p.click('[data-a=awAccept]'); await p.fill('#aw-name', name); await p.click('[data-a=awName]');
  const bx = await p.locator('#sig').boundingBox(); await p.mouse.move(bx.x + 20, bx.y + bx.height * .6); await p.mouse.down();
  for (let i = 1; i <= 30; i++) await p.mouse.move(bx.x + 20 + i * 9, bx.y + bx.height * (.6 + .25 * Math.sin(i / 3)));
  await p.mouse.up(); await p.click('[data-a=sigSeal]'); await p.waitForSelector('[data-a=awAssess]', { timeout: 8000 });
  await p.click('[data-a=awAssess]'); await p.click('[data-a=awBegin]'); await p.waitForTimeout(300);
}
// tap through every set of the open gate or recovery session, then wait for its screen to close
async function clearSession(p, n = 80) {
  for (let i = 0; i < n && await p.locator('.scr-gate').count(); i++) {
    if (await p.locator('[data-a=restSkip]').count()) await p.click('[data-a=restSkip]');
    else if (await p.locator('[data-a=setDone]').count()) await p.click('[data-a=setDone]');
    else if (await p.locator('[data-a=timeDone]').count()) await p.click('[data-a=timeDone]');
    else await p.waitForTimeout(100);
  }
  await p.waitForSelector('.scr-gate', { state: 'detached', timeout: 8000 }).catch(() => {});
}
async function page(device = 'iPhone 13', opts = {}) {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices[device], ...opts });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  return { b, ctx, p, errors };
}
module.exports = { BASE, assert, quiet, awaken, clearSession, page, devices, chromium };
