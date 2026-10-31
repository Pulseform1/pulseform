/* Legend Maker: build an athlete out of other people's best bits, then watch the career play out. Pick a sport, spin the
   reel of (fictional) pros, and draft one of each pro's ratings into an empty attribute slot. Six slots, two rerolls.
   Then the career simulates season by season: stats, awards, titles, injuries, retirement and a Hall of Fame verdict.
   The daily challenge deals everyone the same reel. Your best legends go in your own Hall of Fame. */
const GAME = {
  id: 'legend-maker', title: 'Legend Maker', tagline: 'Spin the pros. Build a legend. Sim the career.',
  font: 'Bebas Neue', accent: '#ffb02e', accent2: '#29e0ff', bg: '#101626', noSkins: true, noHud: true, scoreLabel: 'Legacy',
  how: ['Spin the reel to get a pro, then tap the attribute slot you want their rating in. Each slot only takes one pick.', 'Two rerolls per build if you hate a spin. Big ratings in the right slots matter most.', 'Then sim the whole career and see if you made the Hall of Fame. Daily: same reel for everyone today.'],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  const FD = '"Bebas Neue", Impact, sans-serif', FB = 'Nunito, system-ui, sans-serif', f = (px, w = 800) => `${w} ${px}px ${FB}`, d = px => `${px}px ${FD}`;
  const SPORTS = {
    hoops: { name: 'HOOPS', role: 'hooper', c: '#ff8a2e', at: ['Shooting', 'Finishing', 'Passing', 'Defense', 'Rebounding', 'Athleticism'], w: [1.3, 1.1, 1, 1, .9, 1.2],
      stat: ['PPG', 'RPG', 'APG'], champ: 'title', league: 'pro league', mvp: 'MVP', star: 'All-Star', dpoy: 'Defensive Player of the Year' },
    gridiron: { name: 'GRIDIRON', role: 'quarterback', c: '#3ddc84', at: ['Arm', 'Accuracy', 'Vision', 'Mobility', 'Poise', 'Durability'], w: [1.2, 1.3, 1.2, .9, 1.1, .8],
      stat: ['Pass YDS', 'TD', 'INT'], champ: 'championship ring', league: 'league', mvp: 'MVP', star: 'Pro Bowl', dpoy: 'Offensive Player of the Year' },
    soccer: { name: 'SOCCER', role: 'striker', c: '#29e0ff', at: ['Finishing', 'Pace', 'Dribbling', 'Heading', 'Vision', 'Stamina'], w: [1.4, 1.2, 1.1, .8, 1, .9],
      stat: ['Goals', 'Assists', 'Apps'], champ: 'league title', league: 'top flight', mvp: 'Player of the Year', star: 'Team of the Year', dpoy: 'Golden Boot' },
  };
  const FN = ['Marcus', 'Theo', 'Andre', 'Kofi', 'Luca', 'Mateo', 'Jalen', 'Dmitri', 'Ravi', 'Omar', 'Hugo', 'Keanu', 'Diego', 'Elijah', 'Tariq', 'Sven', 'Ivo', 'Malik', 'Nico', 'Rafe', 'Tobias', 'Xavi', 'Yusuf', 'Zane', 'Bruno', 'Caleb', 'Dante', 'Emil', 'Felix', 'Gio'];
  const LN = ['Okafor', 'Varga', 'Delacroix', 'Hollis', 'Mbeki', 'Santos', 'Lindqvist', 'Brennan', 'Kowalski', 'Achebe', 'Moreau', 'Tanaka', 'Reyes', 'Fairbanks', 'Osei', 'Petrov', 'Castillo', 'Whitfield', 'Nakamura', 'Duval', 'Ferraro', 'Grant', 'Haddad', 'Iverson', 'Jovic', 'Kessler', 'Lombardi', 'Monroe', 'Nwosu', 'Quill'];
  const CLUBS = ['Harbor City', 'Silver Lake', 'Ironwood', 'Port Royal', 'Granite Bay', 'Sun Valley', 'North Ridge', 'Bayside', 'Redwood', 'Capital', 'Lakeshore', 'Summit'];
  const TIERS = [[0, 'Journeyman', '#8a95ab'], [140, 'Solid Starter', '#cfd8e0'], [260, 'All-Star', '#29e0ff'], [420, 'Hall of Famer', '#ffb02e'], [620, 'Legend', '#ff5fa2'], [820, 'THE GOAT', '#ffd23f']];
  const R0 = Math.random;
  let mode = 'home', sport = 'hoops', daily = false, rng = R0, build = null, reel = null, career = null, hover = null, msg = null, t = 0, posed = false, botT = 0, hof = 'view';
  const rnd = (a, b) => a + rng() * (b - a), pick = a => a[Math.floor(rng() * a.length)], clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const seeded = s => () => (s = s * 16807 % 2147483647) / 2147483647;
  const dayNo = () => Math.floor(Date.now() / 864e5);
  const SAVE = () => K.save.lm || (K.save.lm = { hof: [], best: {}, daily: {}, quests: { day: 0, done: [] }, builds: 0 });

  /* ---------- the pros on the reel: made-up players with one or two things they are great at ---------- */
  function makePro(sp) {
    const S = SPORTS[sp], peak = [pick([0, 1, 2, 3, 4, 5])]; if (rng() < .55) peak.push(pick([0, 1, 2, 3, 4, 5]));
    const base = rnd(52, 74), r = S.at.map((_, i) => Math.round(clamp(base + rnd(-14, 12) + (peak.includes(i) ? rnd(14, 28) : 0), 35, 99)));
    if (rng() < .06) r[pick([0, 1, 2, 3, 4, 5])] = 99;
    return { name: pick(FN) + ' ' + pick(LN), club: pick(CLUBS), year: 1975 + Math.floor(rng() * 50), r };
  }
  function newBuild(sp, dly) {
    sport = sp; daily = dly; rng = dly ? seeded(dayNo() * 31 + Object.keys(SPORTS).indexOf(sp) + 7) : R0;
    build = { slots: Array(6).fill(null), rerolls: 2, spins: 0, pro: null, name: pick(FN) + ' ' + pick(LN) };
    mode = 'build'; spin();
  }
  function spin() {
    if (build.slots.every(Boolean)) return;
    build.pro = null; reel = { t: 0, T: 1.15, names: Array.from({ length: 14 }, () => pick(FN) + ' ' + pick(LN)), pro: makePro(sport) };
    K.sfx(300, .05, 'square', .04);
  }
  function reroll() { if (!build.pro || build.rerolls <= 0) return; build.rerolls--; spin(); }
  function place(i) {
    if (!build.pro || build.slots[i]) return;
    build.slots[i] = { v: build.pro.r[i], who: build.pro.name }; build.spins++; build.pro = null;
    K.chime(523 + build.slots[i].v * 3, [0, 7]);
    if (build.slots.every(Boolean)) { mode = 'ready'; K.sfx(880, .2, 'triangle', .06); } else spin();
  }
  const ovr = () => { const S = SPORTS[sport]; let a = 0, w = 0; build.slots.forEach((s, i) => { a += (s ? s.v : 0) * S.w[i]; w += S.w[i]; }); return Math.round(a / w); };

  /* ---------- the career ---------- */
  function simCareer() {
    const S = SPORTS[sport], O = ovr(), v = build.slots.map(s => s.v), dur = sport === 'gridiron' ? v[5] : sport === 'soccer' ? v[5] : v[5] * .6 + v[3] * .4;
    const crng = daily ? seeded(dayNo() * 97 + O) : R0, cr = (a, b) => a + crng() * (b - a);
    const seasons = [], aw = { mvp: 0, star: 0, champ: 0, dpoy: 0 }; let age = 21, legacy = 0, injuries = 0, fit = 1;
    const maxS = Math.round(clamp(8 + (dur - 60) / 5 + cr(-2, 3), 6, 19));
    for (let i = 0; i < maxS; i++, age++) {
      const curve = age < 27 ? .82 + (age - 21) * .03 : age <= 30 ? 1 : 1 - (age - 30) * .045;
      if (crng() < .1 + (99 - dur) * .003) { injuries++; fit = cr(.35, .75); } else fit = Math.min(1, fit + .3);
      const r = clamp((O + cr(-5, 5)) * curve * (.7 + fit * .3), 30, 104), s = {};
      if (sport === 'hoops') { s.a = (r - 48) * .62 + v[0] * .05; s.b = 3 + v[4] * .07 * (r / 85); s.c = 1.5 + v[2] * .075 * (r / 85); }
      else if (sport === 'gridiron') { s.a = Math.round((r - 45) * 95 + v[0] * 9); s.b = Math.round((r - 50) * .82 + v[2] * .08); s.c = Math.round(clamp(22 - v[4] * .17 - (r - 70) * .12 + cr(-3, 3), 3, 25)); }
      else { s.a = Math.round((r - 52) * .72 + v[0] * .1); s.b = Math.round((r - 55) * .4 + v[4] * .08); s.c = Math.round(26 + fit * 12); }
      for (const k of ['a', 'b', 'c']) s[k] = Math.max(0, s[k]);
      const team = clamp((r - 70) / 30 + cr(-.25, .3), 0, 1), A = [], before = legacy;
      if (r > 86 && crng() < (r - 84) * .06) { aw.mvp++; A.push(S.mvp); legacy += 60; }
      if (r > 78 && crng() < (r - 74) * .07) { aw.star++; A.push(S.star); legacy += 14; }
      if (crng() < team * .32) { aw.champ++; A.push(S.champ[0].toUpperCase() + S.champ.slice(1)); legacy += 45; }
      if (crng() < (sport === 'hoops' ? v[3] - 80 : r - 86) * .025) { aw.dpoy++; A.push(S.dpoy); legacy += 25; }
      if (fit < .8) A.push('Injury: played hurt');
      legacy += Math.max(0, r - 60) * 1.4;
      seasons.push({ L: legacy - before, age, r: Math.round(r), s, A, club: i < 4 ? build.club || (build.club = pick(CLUBS)) : seasons[i - 1].club });
      if (i >= 3 && crng() < .12) seasons[i].club = pick(CLUBS);
    }
    legacy = Math.round(legacy + O * 2);
    const tier = TIERS.filter(x => legacy >= x[0]).pop();
    career = { seasons, aw, injuries, legacy, tier, O, shown: 0, t: 0, done: false };
    mode = 'career';
  }
  const fmtStat = (s, k) => sport === 'hoops' ? s[k].toFixed(1) : String(s[k]);
  function finishCareer() {
    const L = SAVE(), c = career, rec = { name: build.name, sport, O: c.O, legacy: c.legacy, tier: c.tier[1], aw: c.aw, daily, day: dayNo() };
    L.builds = (L.builds || 0) + 1; L.hof.push(rec); L.hof.sort((a, b) => b.legacy - a.legacy); L.hof = L.hof.slice(0, 12);
    L.best[sport] = Math.max(L.best[sport] || 0, c.legacy); if (daily) L.daily[sport + dayNo()] = Math.max(L.daily[sport + dayNo()] || 0, c.legacy);
    questCheck(rec); K.add(c.legacy); K.coin(Math.round(c.legacy / 80)); K.persist();
    mode = 'verdict'; career.vt = 0;
    if (c.legacy >= 420) { K.chime(523, [0, 4, 7, 12, 16]); K.burst(640, 260, ['#ffd23f', '#ffb02e', '#fff'], 50, 520); K.shake(10); } else K.chime(440, [0, 4, 7]);
  }
  // three small goals a day, like GoatLab's quests
  const QUESTS = [['ovr85', 'Build an 85+ overall'], ['champ', 'Win a title'], ['hof', 'Reach the Hall of Fame'], ['daily', 'Play the daily challenge'], ['three', 'Try all three sports']];
  function quests() { const L = SAVE(); if (L.quests.day !== dayNo()) { const r = seeded(dayNo()); L.quests = { day: dayNo(), list: [...QUESTS].sort(() => r() - .5).slice(0, 3).map(q => q[0]), done: [], sports: [] }; } return L.quests; }
  function questCheck(rec) {
    const Q = quests(), hit = k => { if (Q.list.includes(k) && !Q.done.includes(k)) { Q.done.push(k); K.coin(10); msg = { t: 'Quest done: ' + QUESTS.find(q => q[0] === k)[1] + '  +10 coins', k: 0 }; } };
    Q.sports = [...new Set([...(Q.sports || []), rec.sport])];
    if (rec.O >= 85) hit('ovr85'); if (rec.aw.champ) hit('champ'); if (rec.legacy >= 420) hit('hof'); if (rec.daily) hit('daily'); if (Q.sports.length >= 3) hit('three');
  }

  /* ---------- drawing ---------- */
  const hitR = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function rr(g, x, y, w, h, r, fill, stroke, lw = 3) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function tx(g, s, x, y, font, c, al = 'center') { g.font = font; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  function bg(g) {
    const v = K.view, gr = g.createLinearGradient(0, 0, 0, 720); gr.addColorStop(0, '#16203a'); gr.addColorStop(1, '#0a0e1a'); g.fillStyle = gr; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,255,255,.025)'; for (let x = -40; x < 1320; x += 48) { g.save(); g.translate(x + (t * 6) % 48, 0); g.rotate(.25); g.fillRect(0, -100, 10, 1000); g.restore(); }
  }
  // the athlete: a bold two-tone silhouette in action, one per sport
  function athlete(g, sp, x, y, s, c) {
    g.save(); g.translate(x, y); g.scale(s, s); const c2 = '#1a2440', skin = '#c88a5a';
    const limb = (x1, y1, x2, y2, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    if (sp === 'hoops') {
      limb(-8, 40, -26, 86, 14, skin); limb(10, 40, 28, 80, 14, skin); limb(-26, 86, -30, 112, 12, skin); limb(28, 80, 40, 104, 12, skin);
      g.fillStyle = c; g.beginPath(); g.roundRect(-20, -10, 40, 54, 8); g.fill(); g.fillStyle = c2; g.fillRect(-20, 30, 40, 16);
      limb(-16, -4, -34, -46, 12, skin); limb(16, -4, 30, -50, 12, skin);
      g.fillStyle = '#e8701a'; g.beginPath(); g.arc(34, -64, 15, 0, 7); g.fill(); g.strokeStyle = '#7a3a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(19, -64); g.lineTo(49, -64); g.moveTo(34, -79); g.lineTo(34, -49); g.stroke();
      g.fillStyle = skin; g.beginPath(); g.arc(0, -24, 14, 0, 7); g.fill(); g.fillStyle = '#1a1210'; g.beginPath(); g.arc(0, -29, 14, Math.PI, 0); g.fill();
    } else if (sp === 'gridiron') {
      limb(-8, 44, -22, 92, 16, '#e8e8e8'); limb(10, 44, 26, 88, 16, '#e8e8e8'); limb(-22, 92, -26, 116, 12, '#1a1a1a'); limb(26, 88, 38, 110, 12, '#1a1a1a');
      g.fillStyle = c; g.beginPath(); g.roundRect(-26, -12, 52, 58, 12); g.fill(); g.fillStyle = '#fff'; g.font = d(30); g.textAlign = 'center'; g.fillText('12', 0, 24);
      limb(18, -2, 44, -36, 13, c); limb(44, -36, 40, -62, 11, skin); limb(-18, 2, -34, 26, 13, c);
      g.fillStyle = '#8a4a1e'; g.beginPath(); g.ellipse(42, -70, 14, 9, -.6, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(36, -72, 12, 2);
      g.fillStyle = c; g.beginPath(); g.arc(0, -30, 19, 0, 7); g.fill(); g.fillStyle = '#ccc'; g.fillRect(6, -32, 16, 4); g.fillRect(6, -24, 16, 4);
    } else {
      limb(-6, 40, -30, 70, 14, skin); limb(-30, 70, -22, 104, 12, skin); limb(8, 40, 40, 58, 14, skin); limb(40, 58, 64, 46, 12, skin);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(78, 50, 13, 0, 7); g.fill(); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(78, 50, 5, 0, 7); g.fill();
      g.fillStyle = c; g.beginPath(); g.roundRect(-20, -8, 40, 50, 8); g.fill(); g.fillStyle = c2; g.fillRect(-20, 30, 40, 14);
      limb(-16, 0, -44, -22, 11, skin); limb(16, 0, 40, 16, 11, skin);
      g.fillStyle = skin; g.beginPath(); g.arc(0, -22, 14, 0, 7); g.fill(); g.fillStyle = '#3a2210'; g.beginPath(); g.arc(-2, -27, 14, Math.PI * .9, Math.PI * 2.1); g.fill();
    }
    g.restore();
  }
  const B = {};
  function button(g, k, b, label, c, sub, tc = '#141414') {
    B[k] = b; const hv = hover === k;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(b.x, b.y + 6, b.w, b.h, 14); g.fill();
    rr(g, b.x, b.y + (hv ? 2 : 0), b.w, b.h, 14, c);
    tx(g, label, b.x + b.w / 2, b.y + b.h / 2 + (sub ? -10 : 2) + (hv ? 2 : 0), d(b.h > 80 ? 54 : 30), tc);
    if (sub) tx(g, sub, b.x + b.w / 2, b.y + b.h / 2 + 22 + (hv ? 2 : 0), f(16), tc);
  }
  function drawHome(g) {
    const L = SAVE(), Q = quests();
    tx(g, 'LEGEND', 520, 70, d(86), '#eef1f8'); tx(g, 'MAKER', 770, 70, d(86), '#ffb02e');
    tx(g, 'Spin the pros. Build a legend. Sim the career.', 640, 122, f(20, 700), '#9fb0d0');
    Object.keys(SPORTS).forEach((k, i) => {
      const S = SPORTS[k], b = { x: 250 + i * 270, y: 150, w: 250, h: 230 }, on = sport === k; B['sp' + k] = b;
      rr(g, b.x, b.y, b.w, b.h, 18, on ? S.c : '#1a2238', on ? '#fff' : (hover === 'sp' + k ? S.c : 'rgba(255,255,255,.12)'), on ? 4 : 2);
      g.save(); g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h - 52, 18); g.clip(); athlete(g, k, b.x + b.w / 2 - 6, b.y + 92, 1.05, on ? '#1a2440' : S.c); g.restore();
      rr(g, b.x, b.y + b.h - 52, b.w, 52, [0, 0, 18, 18], on ? '#ffd23f' : '#121a2e'); tx(g, S.name, b.x + b.w / 2, b.y + b.h - 25, d(32), on ? '#141414' : '#eef1f8');
    });
    button(g, 'play', { x: 250, y: 400, w: 790, h: 100 }, 'PLAY', '#ffd23f', `Spin real-looking pros. Build a ${SPORTS[sport].role}. Sim the career.`);
    button(g, 'daily', { x: 250, y: 518, w: 385, h: 84 }, 'DAILY', '#1f2a46', `Same reel for everyone · ${SPORTS[sport].name}`, '#eef1f8');
    button(g, 'hof', { x: 655, y: 518, w: 385, h: 84 }, 'HALL OF FAME', '#1f2a46', `${L.hof.length} legends saved`, '#eef1f8');
    // quests and best
    rr(g, 1060, 150, 200, 452, 16, '#121a2e', 'rgba(255,255,255,.12)', 2);
    tx(g, 'QUESTS', 1160, 182, d(28), '#ffb02e'); tx(g, `${Q.done.length}/3 today`, 1160, 206, f(14), '#9fb0d0');
    Q.list.forEach((k, i) => { const done = Q.done.includes(k), y = 240 + i * 74; rr(g, 1074, y, 172, 62, 10, done ? '#1f4a34' : '#1a2238'); tx(g, done ? '✓' : '○', 1092, y + 31, f(22, 900), done ? '#3ddc84' : '#9fb0d0'); g.font = f(14); wrap(g, QUESTS.find(q => q[0] === k)[1], 1108, y + 22, 128, 17, done ? '#bff5d6' : '#eef1f8'); });
    tx(g, 'BEST LEGACY', 1160, 478, d(22), '#ffb02e'); Object.keys(SPORTS).forEach((k, i) => tx(g, `${SPORTS[k].name}  ${L.best[k] || '-'}`, 1160, 510 + i * 26, f(15), '#eef1f8'));
    tx(g, 'Every player and team here is made up.', 640, 640, f(14, 700), '#5a6a8a');
  }
  function wrap(g, s, x, y, w, lh, c) { g.fillStyle = c; g.textAlign = 'left'; g.textBaseline = 'middle'; let line = '', yy = y; for (const wd of s.split(' ')) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = tt; } g.fillText(line, x, yy); return yy; }
  function drawBuild(g) {
    const S = SPORTS[sport];
    tx(g, `${daily ? 'DAILY · ' : ''}BUILD YOUR ${S.role.toUpperCase()}`, 640, 40, d(40), S.c);
    // the slots
    S.at.forEach((a, i) => {
      const s = build.slots[i], b = { x: 40, y: 80 + i * 86, w: 360, h: 74 }, can = build.pro && !s; B['slot' + i] = b;
      rr(g, b.x, b.y, b.w, b.h, 14, s ? '#1f2a46' : can ? (hover === 'slot' + i ? '#3a4a20' : '#26301e') : '#161e34', can ? (hover === 'slot' + i ? '#ffd23f' : 'rgba(255,210,63,.5)') : 'rgba(255,255,255,.1)', 2);
      tx(g, a.toUpperCase(), b.x + 20, b.y + 26, d(26), '#eef1f8', 'left');
      if (s) { tx(g, 'from ' + s.who, b.x + 20, b.y + 52, f(14, 700), '#9fb0d0', 'left'); tx(g, String(s.v), b.x + b.w - 24, b.y + 38, d(46), ratingC(s.v), 'right'); }
      else if (can) { tx(g, `tap to take ${build.pro.r[i]}`, b.x + 20, b.y + 52, f(14, 800), '#ffd23f', 'left'); tx(g, String(build.pro.r[i]), b.x + b.w - 24, b.y + 38, d(46), 'rgba(255,255,255,.35)', 'right'); }
      else tx(g, 'empty', b.x + 20, b.y + 52, f(14, 700), '#5a6a8a', 'left');
    });
    // the reel / the pro card: one wide card to the right of the slots
    const cx0 = 430, cw = 810, cy = 80, ch = 500, px = cx0 + cw / 2;
    rr(g, cx0, cy, cw, ch, 18, '#121a2e', S.c, 3);
    if (reel) {
      const k = reel.t / reel.T; g.save(); g.beginPath(); g.rect(cx0 + 10, cy + 160, cw - 20, 150); g.clip();
      const off = (1 - Math.pow(1 - Math.min(1, k), 3)) * reel.names.length * 54;
      reel.names.forEach((n, j) => { const y = cy + 235 + j * 54 - off; tx(g, n.toUpperCase(), px, y, d(46), '#eef1f8'); });
      g.restore(); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.strokeRect(cx0 + 40, cy + 207, cw - 80, 56);
      tx(g, 'SPINNING THE REEL...', px, cy + 70, d(36), '#ffd23f');
    } else if (build.pro) {
      const p = build.pro, lx = cx0 + 170;
      g.save(); g.beginPath(); g.roundRect(cx0 + 20, cy + 20, 300, ch - 40, 14); g.clip(); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(cx0 + 20, cy + 20, 300, ch - 40); athlete(g, sport, lx, cy + 220, 1.35, S.c); g.restore();
      tx(g, p.name.toUpperCase(), lx, cy + 400, d(36), '#fff'); tx(g, `${p.club} · ${p.year}`, lx, cy + 432, f(16, 700), '#9fb0d0');
      const rx = cx0 + 350; tx(g, 'THIS PRO\'S RATINGS', rx, cy + 44, d(26), '#ffb02e', 'left');
      S.at.forEach((a, i) => { const y = cy + 94 + i * 58, free = !build.slots[i]; tx(g, a, rx, y - 12, f(18, 800), free ? '#eef1f8' : '#5a6a8a', 'left'); rr(g, rx, y + 4, 330, 14, 7, '#1f2a46'); rr(g, rx, y + 4, 330 * p.r[i] / 100, 14, 7, free ? ratingC(p.r[i]) : '#3a4660'); tx(g, free ? String(p.r[i]) : 'taken', rx + 420, y + 2, d(free ? 40 : 22), free ? ratingC(p.r[i]) : '#5a6a8a', 'right'); });
      tx(g, '◀  Tap an empty slot to draft one of these', px + 140, cy + ch - 26, f(16, 800), '#ffd23f');
    } else if (mode === 'ready') {
      g.save(); g.beginPath(); g.roundRect(cx0 + 20, cy + 20, cw - 40, ch - 40, 14); g.clip(); athlete(g, sport, px - 200, cy + 230, 1.6, S.c); g.restore();
      tx(g, 'READY', px + 150, cy + 150, d(40), '#9fb0d0'); tx(g, build.name.toUpperCase(), px + 150, cy + 210, d(54), '#fff');
      tx(g, String(ovr()), px + 150, cy + 300, d(130), ratingC(ovr())); tx(g, 'OVERALL', px + 150, cy + 380, d(30), '#9fb0d0');
    }
    // overall so far, rerolls
    rr(g, 40, 606, 360, 92, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    tx(g, 'OVERALL', 64, 636, d(24), '#9fb0d0', 'left'); const filled = build.slots.filter(Boolean).length;
    tx(g, filled ? String(ovr()) : '--', 380, 652, d(64), filled ? ratingC(ovr()) : '#5a6a8a', 'right'); tx(g, `${filled}/6 slots`, 64, 670, f(15), '#9fb0d0', 'left');
    if (mode === 'build') button(g, 'reroll', { x: 625, y: 600, w: 420, h: 84 }, `REROLL  (${build.rerolls} left)`, build.rerolls && build.pro ? '#1f2a46' : '#141a2a', 'Skip this pro, spin again', build.rerolls && build.pro ? '#eef1f8' : '#5a6a8a');
    else button(g, 'sim', { x: 625, y: 590, w: 420, h: 104 }, 'SIM CAREER', '#ffd23f', `${build.name}, ${ovr()} overall`);
  }
  const ratingC = v => v >= 95 ? '#ffd23f' : v >= 88 ? '#ff5fa2' : v >= 80 ? '#3ddc84' : v >= 70 ? '#29e0ff' : v >= 60 ? '#cfd8e0' : '#8a95ab';
  function drawCareer(g) {
    const S = SPORTS[sport], c = career;
    tx(g, build.name.toUpperCase(), 640, 36, d(44), '#fff'); tx(g, `${S.role} · ${c.O} overall · ${c.seasons.length} seasons`, 640, 70, f(17, 700), '#9fb0d0');
    // season table
    const x0 = 60, w = 760, y0 = 96; rr(g, x0, y0, w, 520, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    const cols = ['YR', 'AGE', 'CLUB', ...S.stat, 'AWARDS'], cx = [90, 140, 210, 380, 460, 540, 610];
    cols.forEach((h, i) => tx(g, h, cx[i], y0 + 22, d(20), '#ffb02e', i === 2 || i === 6 ? 'left' : 'center'));
    const n = c.shown, list = c.seasons.slice(Math.max(0, n - 13), n);
    list.forEach((s, j) => {
      const i = Math.max(0, n - 13) + j, y = y0 + 54 + j * 36, fresh = i === n - 1 && c.t < .5;
      if (fresh) rr(g, x0 + 6, y - 16, w - 12, 32, 6, 'rgba(255,210,63,.14)');
      tx(g, String(i + 1), cx[0], y, f(16), '#eef1f8'); tx(g, String(s.age), cx[1], y, f(16), '#9fb0d0'); tx(g, s.club, cx[2], y, f(15, 700), '#cfd8e0', 'left');
      ['a', 'b', 'c'].forEach((k, q) => tx(g, fmtStat(s.s, k), cx[3 + q], y, f(16), '#eef1f8'));
      g.font = f(14, 800); const aw = s.A.join(' · '); tx(g, aw.length > 30 ? aw.slice(0, 29) + '…' : aw, cx[6], y, f(14, 800), s.A.some(a => /Injury/.test(a)) && s.A.length === 1 ? '#ff8a8a' : '#ffd23f', 'left');
    });
    // trophy case
    rr(g, 850, 96, 380, 520, 14, '#121a2e', 'rgba(255,255,255,.1)', 2);
    tx(g, 'TROPHY CASE', 1040, 126, d(30), '#ffb02e');
    const seen = c.seasons.slice(0, n), tally = k => seen.filter(s => s.A.some(a => a.startsWith(k))).length;
    [[S.mvp, '🏆', tally(S.mvp)], [S.champ, '💍', tally(S.champ[0].toUpperCase())], [S.star, '⭐', tally(S.star)], [S.dpoy, '🥇', tally(S.dpoy)]].forEach(([k, em, v], i) => {
      const y = 180 + i * 82; tx(g, em, 890, y, '40px system-ui', '#fff'); tx(g, k[0].toUpperCase() + k.slice(1), 930, y - 10, f(18), '#eef1f8', 'left'); tx(g, `× ${v}`, 930, y + 16, d(28), v ? '#ffd23f' : '#5a6a8a', 'left');
    });
    const run = c.O * 2 + seen.reduce((a, s) => a + s.L, 0);
    tx(g, 'LEGACY', 1040, 528, d(24), '#9fb0d0'); tx(g, String(Math.round(run)), 1040, 572, d(54), '#ffd23f');
    if (c.done) button(g, 'verdict', { x: 360, y: 630, w: 560, h: 76 }, 'HALL OF FAME VERDICT', '#ffd23f');
    else tx(g, n < c.seasons.length ? `Season ${n + 1}...` : 'Retired.', 440, 660, d(30), '#9fb0d0');
  }
  function drawVerdict(g) {
    const c = career, [, name, col] = c.tier, k = Math.min(1, c.vt / .8);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720);
    g.save(); g.translate(640, 300); g.scale(.6 + k * .4, .6 + k * .4); g.globalAlpha = k;
    rr(g, -400, -230, 800, 440, 22, '#121a2e', col, 5);
    athlete(g, sport, -250, -10, 1.2, SPORTS[sport].c);
    tx(g, 'THE VERDICT', 90, -180, d(30), '#9fb0d0'); tx(g, name.toUpperCase(), 90, -120, d(name.length > 12 ? 60 : 76), col);
    tx(g, build.name, 90, -58, f(24), '#fff'); tx(g, `${c.O} OVR · ${c.seasons.length} seasons · legacy ${c.legacy}`, 90, -26, f(18, 700), '#9fb0d0');
    const S = SPORTS[sport]; tx(g, `${c.aw.mvp} ${S.mvp} · ${c.aw.champ} ${S.champ}${c.aw.champ === 1 ? '' : 's'} · ${c.aw.star} ${S.star}`, 90, 12, f(17, 800), '#eef1f8');
    const nxt = TIERS.find(x => x[0] > c.legacy); tx(g, nxt ? `${nxt[0] - c.legacy} legacy short of ${nxt[1]}` : 'Nobody has ever done better.', 90, 48, f(16, 700), '#ffb02e');
    g.restore(); g.globalAlpha = 1;
    if (c.vt > 1) { button(g, 'again', { x: 300, y: 560, w: 330, h: 80 }, 'BUILD ANOTHER', '#ffd23f'); button(g, 'home', { x: 650, y: 560, w: 330, h: 80 }, 'MENU', '#1f2a46', null, '#eef1f8'); }
  }
  function drawHof(g) {
    const L = SAVE();
    tx(g, 'YOUR HALL OF FAME', 640, 54, d(56), '#ffb02e'); tx(g, 'Your best legends, by legacy', 640, 94, f(18, 700), '#9fb0d0');
    rr(g, 190, 120, 900, 470, 16, '#121a2e', 'rgba(255,255,255,.1)', 2);
    if (!L.hof.length) tx(g, 'Nobody yet. Go build someone.', 640, 340, f(22), '#9fb0d0');
    L.hof.slice(0, 11).forEach((r, i) => { const y = 154 + i * 40, T = TIERS.find(x => x[1] === r.tier) || TIERS[0]; tx(g, `${i + 1}.`, 230, y, d(26), '#9fb0d0', 'left'); tx(g, r.name, 280, y, f(19), '#fff', 'left'); tx(g, SPORTS[r.sport].name + (r.daily ? ' · daily' : ''), 560, y, f(15, 700), SPORTS[r.sport].c, 'left'); tx(g, r.tier, 860, y, d(24), T[2], 'right'); tx(g, String(r.legacy), 1060, y, d(28), '#ffd23f', 'right'); });
    button(g, 'home', { x: 490, y: 610, w: 300, h: 76 }, 'BACK', '#ffd23f');
  }

  /* ---------- kit hooks ---------- */
  GAME.reset = () => { mode = 'home'; build = null; career = null; reel = null; msg = null; posed = false; rng = R0; quests(); if (K.bot) newBuild(pick(Object.keys(SPORTS)), false); };
  GAME.update = dt => {
    t += dt; if (msg && (msg.k += dt) > 3.5) msg = null;
    if (reel) { const before = Math.floor(reel.t * 12); reel.t += dt; if (Math.floor(reel.t * 12) > before && reel.t < reel.T) K.sfx(900 - reel.t * 300, .03, 'square', .03); if (reel.t >= reel.T) { build.pro = reel.pro; reel = null; K.sfx(660, .1, 'triangle', .07); } }
    if (mode === 'career' && career && !career.done) { career.t += dt; if (career.t > .55) { career.t = 0; career.shown++; const s = career.seasons[career.shown - 1]; if (s && s.A.some(a => !/Injury/.test(a))) K.chime(659, [0, 7]); else K.sfx(420, .05, 'square', .03); if (career.shown >= career.seasons.length) career.done = true; } }
    if (mode === 'verdict') career.vt += dt;
  };
  GAME.draw = g => {
    for (const k in B) delete B[k];   // only what is on screen this frame can be clicked
    bg(g);
    if (mode === 'home') drawHome(g); else if (mode === 'build' || mode === 'ready') drawBuild(g); else if (mode === 'career') drawCareer(g); else if (mode === 'verdict') { drawCareer(g); drawVerdict(g); } else if (mode === 'hof') drawHof(g);
    if (msg) { const a = Math.min(1, msg.k * 4, (3.5 - msg.k) * 2); g.globalAlpha = Math.max(0, a); rr(g, 340, 664, 600, 44, 12, '#1f4a34', '#3ddc84', 2); tx(g, msg.t, 640, 686, f(18), '#bff5d6'); g.globalAlpha = 1; }
  };
  const live = () => mode === 'home' ? ['play', 'daily', 'hof', ...Object.keys(SPORTS).map(k => 'sp' + k)] : mode === 'build' || mode === 'ready' ? ['reroll', 'sim', 'slot0', 'slot1', 'slot2', 'slot3', 'slot4', 'slot5'] : mode === 'career' ? ['verdict'] : mode === 'verdict' ? (career.vt > 1 ? ['again', 'home'] : []) : mode === 'hof' ? ['home'] : [];
  function click(k) {
    if (!k) return;
    if (k.startsWith('sp')) { sport = k.slice(2); K.sfx(600, .05, 'square', .05); return; }
    if (k === 'play') return newBuild(sport, false);
    if (k === 'daily') return newBuild(sport, true);
    if (k === 'hof') { mode = 'hof'; return; }
    if (k.startsWith('slot') && mode === 'build') return place(+k.slice(4));
    if (k === 'reroll' && mode === 'build') return reroll();
    if (k === 'sim' && mode === 'ready') return simCareer();
    if (k === 'verdict' && career.done) return finishCareer();
    if (k === 'again') { const c = career, s = sport; return K.over({ title: c.tier[1], text: `${build.name}, ${c.O} overall: ${c.seasons.length} seasons and a legacy of ${c.legacy}. ${c.legacy >= 420 ? 'Welcome to the Hall of Fame.' : 'Spin again, build better.'}`, delay: 50 }); }
    if (k === 'home') { mode = 'home'; build = null; career = null; return; }
  }
  GAME.down = (x, y) => { K.audio && K.audio(); click(live().find(k => hitR(B[k], x, y))); };
  GAME.move = (x, y) => { hover = live().find(k => hitR(B[k], x, y)) || null; const c = document.getElementById('cv'); if (c) c.style.cursor = hover ? 'pointer' : 'default'; };
  GAME.key = (c, dn) => {
    if (!dn) return; const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 }[c];
    if (n != null && mode === 'build') return place(n);
    if (c === 'KeyR' && mode === 'build') return reroll();
    if (c === 'Space' || c === 'Enter') { if (mode === 'home') return click('play'); if (mode === 'ready') return click('sim'); if (mode === 'career' && career.done) return click('verdict'); if (mode === 'verdict' && career.vt > 1) return click('again'); }
    if (mode === 'home' && (c === 'ArrowLeft' || c === 'ArrowRight')) { const ks = Object.keys(SPORTS); sport = ks[(ks.indexOf(sport) + (c === 'ArrowRight' ? 1 : 2)) % 3]; }
  };
  // the demo drafts each pro into whichever open slot gets the most out of them
  GAME.bot = dt => {
    if ((botT -= dt) > 0) return; botT = .6;
    if (mode === 'home') return newBuild(pick(Object.keys(SPORTS)), false);
    if (mode === 'build' && build.pro) { const S = SPORTS[sport], open = build.slots.map((s, i) => s ? -1 : build.pro.r[i] * S.w[i]); const best = open.indexOf(Math.max(...open)); if (build.rerolls && Math.max(...build.pro.r.filter((_, i) => !build.slots[i])) < 70 && R0() < .7) return reroll(); return place(best); }
    if (mode === 'ready') return simCareer();
    if (mode === 'career' && career.done) { botT = 1.5; return finishCareer(); }
    if (mode === 'verdict' && career.vt > 2.5) { mode = 'home'; build = null; career = null; }
  };
  GAME.pose = () => { posed = true; newBuild('hoops', false); reel = null; build.pro = { name: 'Marcus Okafor', club: 'Harbor City', year: 1996, r: [97, 88, 74, 81, 69, 92] }; build.slots[0] = { v: 99, who: 'Theo Varga' }; build.slots[5] = { v: 94, who: 'Kofi Santos' }; };
  GAME.test = { st: () => ({ mode, sport, slots: build && build.slots.map(s => s && s.v), pro: build && build.pro && build.pro.r, ovr: build && ovr(), career: career && { n: career.seasons.length, legacy: career.legacy, tier: career.tier[1], aw: career.aw } }), click, place, newBuild, ff: () => { if (reel) { build.pro = reel.pro; reel = null; } if (career) { career.shown = career.seasons.length; career.done = true; } } };
})();
