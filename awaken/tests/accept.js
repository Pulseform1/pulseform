// UI revamp acceptance checklist (art/UI-SPEC.md section 8) as a Playwright script. Not part of run.js.
// usage (from awaken/, static server on :8765): NODE_PATH=/opt/node22/lib/node_modules node tests/accept.js [baseRev]
// Prints one PASS/FAIL line per checklist item (with the offenders) and exits non-zero on any FAIL.
// baseRev (default: HEAD~7, plus the pre-revamp "Add the UI revamp spec" commit) is the index.html the data-a/x/c hooks are compared against.
const { chromium, devices } = require('playwright');
const { execSync } = require('child_process'), path = require('path');
const URL = process.env.AWAKEN_URL || 'http://127.0.0.1:8765/index.html';
const ROOT = path.join(__dirname, '..');
let fails = 0;
const res = (ok, name, detail = []) => {
  const d = Array.isArray(detail) ? detail : [detail];
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${d.length ? (ok ? ' · ' : '\n       ') + [...new Set(d)].slice(0, ok ? 3 : 14).join(ok ? ' · ' : '\n       ') : ''}`);
  if (!ok) { fails++; process.exitCode = 1; }
};
const info = (name, d) => console.log(`INFO ${name}${d ? ' · ' + d : ''}`);
const VIEWPORTS = [[320, 640], [360, 740], [390, 844], [430, 932], [1280, 800]];
const STATES = ['tab:quest', 'tab:status', 'tab:gates', 'tab:recover', 'tab:items', 'tab:records',
  'items:inv', 'items:gear', 'items:shop', 'items:army', 'sheet:gate', 'battle', 'settings', 'ntf'];
const NEED = { '.scr-gate': ['battle'], '.goal': ['tab:quest'], '.side-q': ['tab:quest'], '.tab': ['tab:quest'], '.win': ['tab:quest'],
  '.sheet': ['sheet:gate'], '.ntf': ['ntf'], '.lv': ['tab:quest'], '.xpbar': ['tab:quest'], '.coin': ['tab:quest'], '.gate': ['tab:gates'],
  '.portal': ['tab:gates'], '.waves': ['sheet:gate'], '.burn': ['tab:quest'], '.burn-t': ['tab:quest'], '.pts': ['tab:status'],
  '.summon-b': ['battle'], '.rewards': ['ntf'], 'svg.chart .ch-b': ['tab:records'], '.toast': ['battle+toast'], '.dmg': ['battle+strike'] };

// ---------- page set-up ----------
const SEED = () => {
  S.awakened = true; S.created = Date.now() - 20 * 864e5; S.player.name = 'Jin-Woo the Unrelenting Shadow Hunter'; S.player.level = 14; S.player.xp = 900; S.player.gold = 3420;
  S.player.rank = 1; S.player.points = 2; S.player.title = 'ironwill'; S.titles.push('firststep', 'ironwill');
  S.stats.str.t = 9; S.stats.vit.t = 6; S.stats.agi.t = 7; S.stats.int.t = 4; S.stats.per.t = 5;
  S.streak = { cur: 12, best: 12, freeze: 1 }; S.inv.box = 2; S.inv.potion = 1; S.inv.key = 1;
  S.gear.owned = ['knuckle', 'vest', 'ring']; S.gear.eq = { weapon: 'knuckle', armor: 'vest', acc: 'ring' };
  S.shadows = { goblinchieftain: { lv: 2 }, direwolf: { lv: 1 } };
  newDay(dayKey(), true); S.daily.grace = false; S.daily.announced = true; logDaily('pushup', 20, true); logDaily('situp', 15, true);
  S.tests = [{ date: addDays(dayKey(), -20), pushup: 10, situp: 15, squat: 20, run: 1 }];
  for (let i = 20; i > 0; i--) { const k = addDays(dayKey(), -i); S.history[k] = { s: i % 6 ? 'clear' : 'rest' }; S.days[k] = { pushup: 15 + i % 5, situp: 20, squat: 25, run: 1.2 }; }
  // a gate whose first set is reps, so the battle shows the stepper and "Done · Strike"
  const g = { ...S.gates.list[0], id: 'acc' }; g.sets = g.sets.map(s => ({ ...s })); g.sets[0] = { ...g.sets[0], ex: 'pushup', target: 12 }; S.gates.list.unshift(g);
  UI.screen = null; saveNow(); refresh();
};
const QUIET = () => { while (curN || NQ.length) { NQ.length = 0; closeNotify(); } };
async function open(b, { w = 390, h = 844, reduced = false, noSprites = false, hideWebdriver = false } = {}) {
  const mobile = w <= 430;
  const ctx = await b.newContext({ ...(mobile ? devices['iPhone 13'] : {}), viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  if (hideWebdriver) await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  if (noSprites) await ctx.route('**/sprites.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.SPRITES={};' }));
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.evaluate(SEED); await p.evaluate(QUIET);
  return { ctx, p, errors };
}
async function go(p, st, wait = 450) {
  await p.evaluate(QUIET);
  await p.evaluate(st => {
    const [k, x] = st.split(':');
    if (S.session) S.session = null;
    UI.sheet = null; UI.screen = null; S.player.mp = maxMP(); S.player.hp = maxHP();
    if (k === 'tab') UI.tab = x;
    else if (k === 'items') { UI.tab = 'items'; UI.itemsTab = x; }
    else if (k === 'sheet') { UI.tab = 'gates'; UI.sheet = { kind: 'gate', id: 'acc' }; }
    else if (k === 'settings') UI.screen = { kind: 'settings' };
    if (k === 'battle') enterGate('acc'); else refresh();
    window.scrollTo(0, 0);
  }, st);
  if (st === 'battle') await p.evaluate(QUIET);
  if (st === 'ntf') {
    await p.evaluate(() => { UI.tab = 'quest'; refresh(); notify({ kind: 'quest', head: 'Quest Complete', lines: ['[You have completed the Daily Quest: Strength Training.]', 'Rewards have been distributed.'], rewards: [['XP', '+152'], ['Gold', '+72'], ['Random Box', '×1']] }); });
    wait = 2600;
  }
  await p.waitForTimeout(wait);
}

// ---------- in-page probes ----------
const VIS = `const vis=el=>{if(!el||!el.getClientRects().length)return false;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return false;const r=el.getBoundingClientRect();return r.width>1&&r.height>1&&!(cs.clip&&cs.clip!=='auto'&&/rect\\(0/.test(cs.clip))};
  const sel=el=>{if(!el||el.nodeType!==1)return '?';const c=[...el.classList].slice(0,3).join('.');const a=el.dataset&&el.dataset.a?'[data-a='+el.dataset.a+(el.dataset.x?' x='+el.dataset.x:'')+']':'';return el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(c?'.'+c:'')+a};
  const path=el=>{const out=[];while(el&&el.nodeType===1&&out.length<3){out.unshift(sel(el));el=el.parentElement}return out.join('>')};`;
const probe = (p, body, arg) => p.evaluate(new Function('arg', VIS + body), arg);
const overflow = p => probe(p, `
  const W=innerWidth,out=[],doc=document.documentElement.scrollWidth;
  if(doc>W) out.push('document scrollWidth '+doc+' > '+W);
  for(const el of document.querySelectorAll('.screen,.sheet,.ntf-layer,.ntf,#toasts,#tabs .tabs-in,#top')){const cs=getComputedStyle(el);
    if(vis(el)&&el.scrollWidth>el.clientWidth+1&&cs.overflowX!=='hidden'&&cs.overflowX!=='clip') out.push(sel(el)+' scrolls sideways '+el.scrollWidth+'>'+el.clientWidth)}
  if(out.length){ // name the elements that stick out of the viewport and are not clipped by an ancestor
    for(const el of document.querySelectorAll('body *')){if(!vis(el))continue;const r=el.getBoundingClientRect();if(r.right<=W+1&&r.left>=-1)continue;
      let a=el.parentElement,clipped=false;while(a&&a!==document.body){const o=getComputedStyle(a).overflowX;if(o!=='visible'){const ar=a.getBoundingClientRect();if(ar.right<=W+1){clipped=true;break}}a=a.parentElement}
      if(!clipped&&!el.closest('.sr'))out.push('  '+path(el)+' right='+Math.round(r.right)+' left='+Math.round(r.left))}}
  return out;`);
const smallText = p => probe(p, `
  const out=[],tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=tw.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(!vis(el)||el.closest('.sr,noscript,[aria-hidden=true] .ghost'))continue;
    let fs=parseFloat(getComputedStyle(el).fontSize);
    if(el instanceof SVGElement&&el.ownerSVGElement){const m=el.getScreenCTM();if(m)fs*=Math.hypot(m.a,m.b)}
    const rg=document.createRange();rg.selectNodeContents(n);const rr=rg.getBoundingClientRect();if(rr.width<1||rr.height<1)continue;
    if(fs<11.95)out.push(path(el)+' '+fs.toFixed(1)+'px "'+n.textContent.trim().slice(0,24)+'"')}
  return out;`);
const hitBoxes = p => probe(p, `
  const out=[];
  for(const el of document.querySelectorAll('button,[data-a],a,input,summary,select,textarea')){
    if(!vis(el)||el.matches('.ntf-layer,[type=hidden]'))continue;
    const r=el.getBoundingClientRect();let L=r.left,T=r.top,R=r.right,B=r.bottom;
    for(const ps of ['::after','::before']){const c=getComputedStyle(el,ps);if(c.content==='none'||c.position!=='absolute')continue;
      const px=v=>v==='auto'?null:parseFloat(v),t=px(c.top),l=px(c.left),ri=px(c.right),bo=px(c.bottom);
      if(t!=null&&l!=null&&ri!=null&&bo!=null){L=Math.min(L,r.left+l);T=Math.min(T,r.top+t);R=Math.max(R,r.right-ri);B=Math.max(B,r.bottom-bo)}}
    const w=R-L,h=B-T;
    if(w<43.5||h<43.5)out.push(path(el)+' '+Math.round(w)+'x'+Math.round(h)+(el.matches('.plus')?' (.plus incl. extender)':''))}
  return out;`);
const sprites = p => probe(p, `
  const out=[],S2=window.SPRITES||{};let n=0;
  for(const el of document.querySelectorAll('.spr')){if(!el.getClientRects().length)continue;n++;
    const cs=getComputedStyle(el),w=parseFloat(cs.width),h=parseFloat(cs.height),nat=el.naturalWidth||0;
    if(!nat){out.push(path(el)+' has no image');continue}
    const kw=w/nat,kh=h/(el.naturalHeight||nat);
    if(Math.abs(kw-Math.round(kw))>.01||Math.abs(kh-Math.round(kh))>.01||kw<1)out.push(path(el)+' '+w+'x'+h+' for '+nat+'px art (x'+kw.toFixed(2)+')');
    if(cs.imageRendering!=='pixelated')out.push(path(el)+' image-rendering:'+cs.imageRendering)}
  return {n,out};`);
const classesHere = p => probe(p, `return {cls:arg.filter(s=>document.querySelector(s)),top:document.querySelectorAll('#top img').length,
  hooks:[...document.querySelectorAll('[data-a],[data-x],[data-c]')].flatMap(el=>['a','x','c'].filter(k=>el.dataset[k]!=null).map(k=>'data-'+k+'="'+el.dataset[k]+'"'))}`, Object.keys(NEED));
const lowOpacityText = p => probe(p, `
  const out=[],tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=tw.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(!vis(el)||el.closest('.sr,.toast,.ghost,[aria-hidden=true]'))continue;
    let o=1,a=el;while(a&&a.nodeType===1){o*=+getComputedStyle(a).opacity;a=a.parentElement}
    if(o<.7)out.push(path(el)+' opacity '+o.toFixed(2)+' "'+n.textContent.trim().slice(0,20)+'"')}
  return out;`);
// WCAG contrast of visible text against the first opaque background behind it (gradients and images count as --deep)
const contrast = p => probe(p, `
  const parse=c=>{const m=c.match(/[\\d.]+/g);return m?m.map(Number):[0,0,0,0]};
  const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
  const mix=(f,b,a)=>f.map((v,i)=>v*a+b[i]*(1-a));
  const deep=[6,20,42],out=[],tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while(n=tw.nextNode()){if(!n.textContent.trim())continue;const el=n.parentElement;if(!vis(el)||el.closest('.sr,.ghost,[aria-hidden=true],svg,.toast'))continue;
    const cs=getComputedStyle(el);let fg=parse(cs.color);
    let bg=null,a=el;const layers=[];
    while(a&&a.nodeType===1){const s=getComputedStyle(a),c=parse(s.backgroundColor),al=c.length>3?c[3]:1;
      if(s.backgroundImage!=='none'&&!/^url/.test(s.backgroundImage)&&al<.5){bg=deep;break}
      if(al>0)layers.push([c.slice(0,3),al]);if(al>=.99){bg=c.slice(0,3);layers.pop();break}a=a.parentElement}
    bg=bg||deep;for(const [c,al] of layers.reverse())bg=mix(c,bg,al);
    const fa=fg.length>3?fg[3]:1;fg=mix(fg.slice(0,3),bg,fa);
    const L1=lum(fg),L2=lum(bg),cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05),fs=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700;
    const need=fs>=18||(fs>=14&&bold)?3:4.5;
    if(cr<need-.05)out.push(path(el)+' '+cr.toFixed(2)+':1 (need '+need+') "'+n.textContent.trim().slice(0,18)+'" '+cs.color)}
  return out;`);
const infinite = p => p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity)
  .map(a => { const t = a.effect.target; return (a.animationName || 'anim') + '@' + (t ? t.tagName.toLowerCase() + '.' + [...t.classList].slice(0, 2).join('.') : '?') + (a.effect.pseudoElement || ''); }));
const rect = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right, w: r.width, h: r.height }; }, s);
const inView = (r, H) => r && r.t >= -1 && r.b <= H + 1;

(async () => {
  const b = await chromium.launch();
  const agg = { overflow: [], text: [], hits: [], spr: [], sprN: 0, top: [], cls: {}, hooks: new Set(), opa: [], errors: [] };
  // ---------- 1. every viewport x every state ----------
  for (const [w, h] of VIEWPORTS) {
    const { ctx, p, errors } = await open(b, { w, h });
    for (const st of STATES) {
      await go(p, st);
      for (const o of await overflow(p)) agg.overflow.push(`${w}px ${st}: ${o}`);
      for (const o of await smallText(p)) agg.text.push(`${w}px ${st}: ${o}`);
      for (const o of await hitBoxes(p)) agg.hits.push(`${w}px ${st}: ${o}`);
      const s = await sprites(p); agg.sprN += s.n; for (const o of s.out) agg.spr.push(`${w}px ${st}: ${o}`);
      const c = await classesHere(p); if (c.top) agg.top.push(`${w}px ${st}: ${c.top} img`); c.hooks.forEach(x => agg.hooks.add(x));
      if (w === 390) { for (const k of c.cls) (agg.cls[k] = agg.cls[k] || new Set()).add(st); for (const o of await lowOpacityText(p)) agg.opa.push(`${st}: ${o}`); }
      if (st === 'sheet:gate' && w !== 1280) {
        const cta = await rect(p, '#sheet [data-a=enterGate]');
        if (w === 390) res(inView(cta, h), `gate sheet at 390x844: "Enter gate · 10 MP" visible at scroll 0 (sticky)`, cta ? `bottom ${Math.round(cta.b)} / ${h}` : 'no CTA');
        const waves = await p.evaluate(() => ({ li: document.querySelectorAll('#sheet .waves li').length, rounds: S.gates.list.find(g => g.id === 'acc').rounds }));
        if (w === 390) res(waves.li >= waves.rounds, '#sheet .waves li count >= rounds', `${waves.li} li, ${waves.rounds} rounds`);
      }
      if (st === 'battle' && (w === 390 || w === 360)) {
        const parts = { stage: '.foe-stage', 'enemy HP bar': '.foe-win .hpbar', stepper: '.stepper', 'Done · Strike': '[data-a=setDone]' }, bad = [];
        for (const [n, s] of Object.entries(parts)) { const r = await rect(p, s); if (!inView(r, h)) bad.push(`${n} ${r ? `${Math.round(r.t)}-${Math.round(r.b)}` : 'missing'} (viewport ${h})`); }
        await p.evaluate(() => toast('New personal best: 20 push-ups in one set', 'stat')); await p.waitForTimeout(350);
        const ov = await p.evaluate(() => { const ws = document.querySelector('.foe-win .boss-top'); if (!ws) return 'no wave strip'; const a = ws.getBoundingClientRect();
          return [...document.querySelectorAll('.toast')].map(t => t.getBoundingClientRect()).some(r => r.left < a.right && r.right > a.left && r.top < a.bottom && r.bottom > a.top) ? `toast covers the wave strip (${Math.round(a.top)}-${Math.round(a.bottom)})` : ''; });
        if (ov) bad.push(ov);
        res(!bad.length, `battle at ${w}x${h}: stage, enemy HP, stepper and "Done · Strike" above the fold, no toast over the wave strip`, bad);
        if (w === 390) {
          const c2 = await classesHere(p); for (const k of c2.cls) (agg.cls[k] = agg.cls[k] || new Set()).add('battle+toast');
          await p.click('[data-a=setDone]'); await p.waitForTimeout(150);
          const c3 = await classesHere(p); for (const k of c3.cls) (agg.cls[k] = agg.cls[k] || new Set()).add('battle+strike');
          for (const o of await overflow(p)) agg.overflow.push(`${w}px battle after a strike: ${o}`);
          await p.evaluate(() => { S.session = null; UI.screen = null; refresh(); });
        }
      }
    }
    if (w === 320) {
      await go(p, 'tab:quest');
      await p.evaluate(() => { S.penalty = makePenalty(); refresh(); }); await p.evaluate(QUIET); await p.evaluate(() => { UI.screen = null; UI.tab = 'quest'; refresh(); });
      const hud = await p.evaluate(() => {
        const b = s => { const e = document.querySelector(s); return e && e.getBoundingClientRect(); }, out = [];
        const kids = [...document.querySelectorAll('#top > *')].filter(e => e.getClientRects().length && !e.matches('.xpbar'));
        const tops = kids.map(e => e.getBoundingClientRect()), lv = b('#top .lv');
        if (tops.some(r => r.top >= lv.bottom - 2)) out.push('top bar wraps: ' + kids.filter((e, i) => tops[i].top >= lv.bottom - 2).map(e => e.className).join(','));
        const nm = document.querySelector('#top .nm'), ns = nm && getComputedStyle(nm);
        if (!nm || ns.textOverflow !== 'ellipsis' || ns.overflow === 'visible' || nm.scrollWidth <= nm.clientWidth) out.push('long name does not truncate with an ellipsis');
        const tag = document.querySelector('#top .hud-tag'); if (!tag) out.push('no status tag rendered (weakened)'); else if (tag.getBoundingClientRect().width > 1) out.push('status tag is visible, not screen-reader-only');
        const coin = b('#top .coin'), set = b('#top [data-a=settings]');
        if (!coin || coin.right > innerWidth || coin.width < 20) out.push('coin not fully visible'); if (!set || set.right > innerWidth + 1 || set.left < 0) out.push('settings button not visible');
        if (coin && set && coin.right > set.left + 1) out.push('coin overlaps settings');
        return out;
      });
      res(!hud.length, '320px: top bar on one row, name ellipsis, status tag screen-reader-only, coin and settings visible', hud);
      await p.evaluate(() => { S.penalty = null; refresh(); });
      const tabs = await p.evaluate(() => {
        const out = [], labels = [...document.querySelectorAll('#tabs .tab-l')];
        if (labels.length !== 6) out.push(labels.length + ' labels');
        labels.forEach(l => { if (l.scrollWidth > l.clientWidth) out.push(`"${l.textContent}" clipped ${l.scrollWidth}>${l.clientWidth}`); if (l.getBoundingClientRect().right > innerWidth) out.push(`"${l.textContent}" off-screen`); });
        const tabs = [...document.querySelectorAll('#tabs .tab')], gi = tabs.findIndex(t => t.dataset.x === 'gates');
        const icon = tabs[gi] && tabs[gi].querySelector('.tab-i'), ir = icon && icon.getBoundingClientRect();
        for (const j of [gi - 1, gi + 1]) { const l = tabs[j] && tabs[j].querySelector('.tab-l'); if (!l || !ir) continue; const lr = l.getBoundingClientRect();
          if (ir.left < lr.right - 1 && ir.right > lr.left + 1 && ir.top < lr.bottom && ir.bottom > lr.top) out.push(`Gates portal overlaps "${l.textContent}"`); }
        return out;
      });
      res(!tabs.length, '320px: all six .tab-l labels fit and the raised Gates portal does not overlap its neighbours', tabs);
    }
    if (w === 1280) {
      const bad = [];
      for (const st of ['tab:quest', 'sheet:gate', 'ntf']) {
        await go(p, st);
        for (const s of st === 'tab:quest' ? ['#view'] : st === 'ntf' ? ['#ntf .ntf'] : ['#sheet .sheet']) {
          const r = await rect(p, s); if (!r) { bad.push(`${s} missing`); continue; }
          if (s === '#view' && r.w > 521) bad.push(`#view is ${Math.round(r.w)}px wide (max 520)`);
          if (Math.abs(r.l - (1280 - r.r)) > 2) bad.push(`${s} off-centre (left ${Math.round(r.l)}, right gap ${Math.round(1280 - r.r)})`);
        }
      }
      res(!bad.length, '1280px: content centred at max 520px; sheet and notification centred', bad);
    }
    agg.errors.push(...errors.map(e => `${w}px: ${e}`));
    await ctx.close();
  }
  res(!agg.overflow.length, 'no sideways scroll at 320/360/390/430/1280 on every tab, Items segment, gate sheet, battle, settings and a notification', agg.overflow);
  res(!agg.text.length, 'no visible text below 12px (SVG text measured at its rendered scale)', agg.text);
  res(!agg.hits.length, 'every button, [data-a], a, input and summary has a hit box >= 44x44 (::after/::before extenders counted)', agg.hits);
  res(agg.sprN > 0 && !agg.spr.length, `every .spr is an integer multiple of its art and image-rendering:pixelated (${agg.sprN} checked)`, agg.spr);
  res(!agg.top.length, '#top has no <img> in any state', agg.top);
  const missCls = Object.entries(NEED).filter(([k, sts]) => !sts.some(s => agg.cls[k] && agg.cls[k].has(s))).map(([k, sts]) => `${k} not found in ${sts.join('/')}`);
  res(!missCls.length, 'required classes still render where they were (' + Object.keys(NEED).length + ')', missCls);
  res(!agg.opa.length, 'no text inside an element whose computed opacity is below .7 (390px)', agg.opa);
  res(!agg.errors.length, 'no page or console errors in the viewport sweep', agg.errors);

  // ---------- 2. hooks: data-a / data-x / data-c superset ----------
  const lits = src => new Set(src.match(/data-[axc]="[^"]*"/g) || []);
  const now = require('fs').readFileSync(path.join(ROOT, 'index.html'), 'utf8'), nowL = lits(now);
  const bases = process.argv[2] ? [process.argv[2]] : ['HEAD~7', ...(() => { try { return [execSync(`git log --format=%h --grep="Add the UI revamp spec" -1`, { cwd: ROOT }).toString().trim()].filter(Boolean); } catch { return []; } })()];
  for (const rev of bases) {
    let old; try { old = execSync(`git show ${rev}:awaken/index.html`, { cwd: ROOT, maxBuffer: 64e6 }).toString(); } catch (e) { res(false, `data-a/x/c superset vs ${rev}`, 'git show failed'); continue; }
    const gone = [...lits(old)].filter(x => !nowL.has(x));
    // a value that is no longer a literal may now come from a helper: accept it if it renders, or is a quoted handler name in the source
    const really = gone.filter(x => { const v = x.replace(/^data-.="|"$/g, ''); if (agg.hooks.has(x)) return false;
      if (x.startsWith('data-a=') && new RegExp(`['"\`]${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).test(now) && new RegExp(`\\n\\s+${v}\\(`).test(now)) return false; return true; });
    if (gone.length && !really.length) info(`literal hooks now built by a helper vs ${rev}`, gone.join(' '));
    res(!really.length, `data-a/x/c values are a superset of ${rev} (${lits(old).size} before, ${nowL.size} now)`, really);
  }

  // ---------- 3. reduced motion (webdriver hidden so the reward engine would run if it ignored the setting) ----------
  {
    const { ctx, p, errors } = await open(b, { reduced: true, hideWebdriver: true });
    const bad = [];
    for (const st of STATES) { await go(p, st); for (const a of await infinite(p)) bad.push(`${st}: ${a}`); }
    res(!bad.length, 'reduced motion: no running infinite animation on any screen', bad);
    await go(p, 'tab:quest');
    const fin = await p.evaluate(async () => {
      const out = []; S.player.gold += 777; S.player.xp += 50; refresh();
      const g = document.querySelector('#top [data-cu=gold]'); if (g && g.textContent.replace(/\D/g, '') !== String(S.player.gold)) out.push(`gold shows ${g.textContent}, expected ${S.player.gold}`);
      if (document.querySelector('.grew,.fell,.gain,.lag')) out.push('fill animation classes present: ' + [...document.querySelectorAll('.grew,.fell')].map(e => e.dataset.k).join(','));
      return out;
    });
    await go(p, 'ntf', 0); await p.waitForTimeout(700);
    const loot = await p.evaluate(() => [...document.querySelectorAll('.ntf .rewards li')].filter(li => +getComputedStyle(li).opacity < .99 || li.getBoundingClientRect().height < 1).length);
    if (loot) fin.push(`${loot} loot rows not visible 700ms after the notification opened`);
    await go(p, 'tab:status');
    const pts = await p.evaluate(() => { const e = document.querySelector('#view .pts'); if (!e) return 'no .pts row'; const cs = getComputedStyle(e); return cs.display === 'none' || +cs.opacity < .99 || !e.getBoundingClientRect().height ? 'Status .pts row hidden' : ''; });
    if (pts) fin.push(pts);
    res(!fin.length, 'reduced motion: count-ups and fills show final values, loot rows and the Status points row are visible', fin);
    res(!errors.length, 'reduced motion: no page errors', errors);
    await ctx.close();
  }

  // ---------- 4. motion on: materialise once, goal taps, infinite animation budget ----------
  {
    const { ctx, p, errors } = await open(b, { hideWebdriver: true });
    const over = [];
    for (const st of STATES) { await go(p, st, 800); const a = await infinite(p); if (a.length > 4) over.push(`${st}: ${a.length} (${a.join(', ')})`); }
    res(!over.length, 'at most 4 infinite animations run at once', over);
    await p.evaluate(QUIET); await p.evaluate(() => { UI.screen = null; UI.sheet = null; UI.tab = 'status'; refresh(); }); await p.waitForTimeout(900);
    await p.click('#tabs [data-a=tab][data-x=quest]'); await p.waitForTimeout(60);
    const m1 = await p.evaluate(() => ({ enter: document.querySelector('#view').classList.contains('enter'), anims: document.getAnimations().filter(a => a.animationName === 'materialise').length }));
    await p.waitForTimeout(900);
    const m2 = await p.evaluate(() => ({ enter: document.querySelector('#view').classList.contains('enter'), anims: document.getAnimations().filter(a => a.animationName === 'materialise' && a.playState === 'running').length }));
    res(m1.enter && m1.anims > 0 && !m2.enter && !m2.anims, 'switching tabs plays materialise once', `during: .enter=${m1.enter} ${m1.anims} anims; after 900ms: .enter=${m2.enter} ${m2.anims} running`);
    const scan0 = await p.evaluate(() => { const a = document.getAnimations().find(a => a.animationName === 'scan'); return a ? a.startTime : null; });
    const taps = [];
    for (let i = 0; i < 5; i++) {
      await p.click('#view .side-q >> nth=0'); await p.waitForTimeout(120);
      taps.push(await p.evaluate(() => ({ enter: document.querySelector('#view').classList.contains('enter'), mat: document.getAnimations().filter(a => a.animationName === 'materialise' && a.playState === 'running').length,
        moved: [...document.querySelectorAll('#view .grew,#view .fell')].map(e => e.dataset.k || e.className) })));
    }
    const scan1 = await p.evaluate(() => { const a = document.getAnimations().find(a => a.animationName === 'scan'); return a ? { st: a.startTime, ct: a.currentTime } : null; });
    const replay = taps.filter(t => t.enter || t.mat), many = taps.filter(t => t.moved.length > 1);
    const scanOk = scan1 && scan1.ct > 2000; // the sweep keeps its wall-clock phase (negative delay), it does not restart at 0
    res(!replay.length && !many.length && scanOk, 'tapping an optional-quest checkbox 5 times does not replay materialise or restart the scan; only the changed bar animates',
      [...replay.map((t, i) => `tap ${i + 1} replays materialise`), ...many.map(t => `several bars animate: ${t.moved.join(',')}`), ...(scanOk ? [] : [`scan sweep at ${scan1 && Math.round(scan1.ct)}ms after the taps`])]);
    // body.locked: no blur behind sheets
    await p.evaluate(() => { UI.sheet = { kind: 'gate', id: 'acc' }; refresh(); }); await p.waitForTimeout(200);
    const blur = await p.evaluate(() => [...document.querySelectorAll('#app .win,#app,#view,#top,#tabs')].filter(e => { const c = getComputedStyle(e); return /blur/.test(c.backdropFilter + c.webkitBackdropFilter + c.filter); }).map(e => e.id || e.className.split(' ')[0]));
    res(!blur.length, 'body.locked removes blur from background windows', blur);
    // scrolling Records and Items at 4x CPU throttle
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const fps = [];
    for (const t of ['records', 'items']) {
      await p.evaluate(t => { UI.sheet = null; UI.tab = t; refresh(); scrollTo(0, 0); }, t); await p.waitForTimeout(900);
      fps.push([t, await p.evaluate(() => new Promise(r => { let f = 0; const t0 = performance.now(), H = document.documentElement.scrollHeight - innerHeight;
        const step = now => { f++; const k = (now - t0) / 2000; scrollTo(0, H * (k < .5 ? k * 2 : 2 - k * 2)); if (now - t0 < 2000) requestAnimationFrame(step); else r(Math.round(f / ((now - t0) / 1000))); }; requestAnimationFrame(step); }))]);
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    res(fps.every(([, f]) => f >= 50), 'scrolling Records and Items holds >= 50fps at 4x CPU throttle (headless rAF estimate)', fps.map(([t, f]) => `${t} ${f}fps`));
    res(!errors.length, 'motion pass: no page errors', errors);
    await ctx.close();
  }

  // ---------- 5. skins, tones and contrast ----------
  {
    const { ctx, p, errors } = await open(b, {});
    const tok = await p.evaluate(() => {
      const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
      const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
      const out = [], pairs = [['--ink', '--deep', 4.5], ['--ink', '--void', 4.5], ['--dim', '--deep', 4.5], ['--dim', '--void', 4.5], ['--gold', '--deep', 4.5], ['--void', '--gold', 4.5],
        ...['e', 'd', 'c', 'b', 'a', 's'].map(r => [`--rank-${r}`, '--deep', 4.5])];
      for (const [a, b, need] of pairs) { const A = v(a), B = v(b); if (!/^#[0-9a-f]{6}$/i.test(A) || !/^#[0-9a-f]{6}$/i.test(B)) continue; const r = cr(A, B); if (r < need) out.push(`${a} on ${b} ${r.toFixed(2)}:1`); }
      return out;
    });
    res(!tok.length, 'WCAG AA token pairs: ink/dim on deep/void, gold on deep, void on gold, rank colours on deep', tok);
    const skins = ['blue', 'shadow', 'ruler', 'crimson', 'frost', 'verdant'], look = {}, cbad = [];
    for (const sk of skins) {
      await p.evaluate(sk => { S.settings.skin = sk; applySkin(); }, sk);
      for (const st of ['tab:quest', 'tab:status', 'tab:gates', 'items:shop', 'tab:records', 'sheet:gate', 'battle', 'settings']) {
        await go(p, st, 300);
        if (st === 'tab:gates') look[sk] = await p.evaluate(() => { const c = (s, pr) => { const e = document.querySelector(s); return e ? getComputedStyle(e)[pr] : 'missing'; };
          return { win: c('#view .win', 'borderTopColor'), tab: c('#tabs .tab.on', 'color'), mp: c('#top .hb.mp i', 'backgroundImage') + c('#top .hb.mp i', 'backgroundColor'), btn: c('#view .btn.pri,#view .btn', 'borderTopColor'),
            rk: [...document.querySelectorAll('.rk')].map(e => getComputedStyle(e).color + e.textContent).join('|'), chips: [...document.querySelectorAll('#view .gate .rk,#view .portal .rk,#view .rk')].every(e => /^[EDCBAS]$/.test(e.textContent.trim())) }; });
        for (const o of await contrast(p)) cbad.push(`${sk} ${st}: ${o}`);
      }
    }
    await p.evaluate(() => { S.settings.skin = 'blue'; applySkin(); });
    const same = [];
    for (const sk of skins.slice(1)) for (const k of ['win', 'tab', 'mp', 'btn']) if (look[sk][k] === look.blue[k]) same.push(`${sk}: ${k} not recoloured (${look[sk][k].slice(0, 40)})`);
    for (const sk of skins.slice(1)) if (look[sk].rk !== look.blue.rk) same.push(`${sk}: rank chip colours changed`);
    for (const sk of skins) if (!look[sk].chips) same.push(`${sk}: a .rk chip without its rank letter`);
    res(!same.length, 'each skin recolours chrome, tab dock, HUD MP bar and buttons; rank colours stay fixed and every rank chip has its letter', same);
    const tones = await p.evaluate(() => { const out = [], root = getComputedStyle(document.documentElement).getPropertyValue('--line-a');
      for (const t of ['tone-red', 'tone-ok', 'tone-violet']) { const d = document.createElement('section'); d.className = 'win ' + t; document.body.append(d); const v = getComputedStyle(d).getPropertyValue('--line-a'); if (!v || v === root) out.push(`.${t} does not redeclare --line-a`); d.remove(); }
      return out; });
    res(!tones.length, '.tone-red, .tone-ok and .tone-violet windows recolour their brackets (derived tokens redeclared)', tones);
    res(!cbad.length, 'WCAG AA contrast of rendered text under all 6 skins (fg vs first opaque background; gradients treated as --deep)', cbad);
    res(!errors.length, 'skin pass: no page errors', errors);
    await ctx.close();
  }

  // ---------- 6. all art missing: window.SPRITES={} ----------
  {
    const { ctx, p, errors } = await open(b, { noSprites: true });
    const empty = [];
    for (const st of [...STATES, 'tab:status']) {
      await go(p, st);
      empty.push(...(await p.evaluate(st => {
        const out = [], has = el => el.querySelector('img,svg,canvas') || el.textContent.trim() || [el, ...el.querySelectorAll('*')].some(e => /url\(/.test(getComputedStyle(e).backgroundImage));
        for (const el of document.querySelectorAll('.rf,.portal,.foe-stage,.hud-port,.ntf-art,.doll,.wfx-r .loot,.w-foe,[class*=-spr-],[class*=slot]')) if (el.getClientRects().length && !has(el)) out.push(`${st}: empty ${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
        if (st === 'battle' && !document.querySelector('.foe-stage .foe,.foe-stage .foe-ph')) out.push('battle: no foe or fallback on the stage');
        if (!document.querySelector('#top .hud-init,#top .hud-face')) out.push(`${st}: no HUD initial`);
        if (document.querySelector('img.spr')) out.push(`${st}: an img.spr rendered with no art`);
        return out;
      }, st)));
    }
    res(!empty.length && !errors.length, 'window.SPRITES={}: every screen renders with fallbacks, no empty frames and no console errors', [...empty, ...errors]);
    await ctx.close();
  }

  // ---------- 7. hooks that the suite also covers ----------
  {
    const { ctx, p, errors } = await open(b, {});
    await go(p, 'battle');
    await p.click('[data-a=summonOpen]'); await p.click('#sheet [data-a=summon]'); await p.waitForTimeout(200);
    res(await p.locator('[data-a=summonOpen]').count() === 0, '[data-a=summonOpen] is absent after summoning');
    await p.evaluate(() => { S.session = null; UI.screen = null; refresh(); S.pb = {}; S.days = {}; logDaily('pushup', 10, true); logDaily('pushup', 15, true); });
    await p.waitForTimeout(900);
    res(await p.evaluate(() => [...document.querySelectorAll('.toast')].some(t => /personal best/.test(t.textContent))), 'the personal-best .toast still appears');
    res(!errors.length, 'hook pass: no page errors', errors);
    await ctx.close();
  }
  await b.close();
  console.log(`\n${fails ? fails + ' checklist item(s) FAILED' : 'all checklist items PASS'}`);
})().catch(e => { console.log('FAIL accept.js crashed: ' + (e.stack || e)); process.exitCode = 1; });
