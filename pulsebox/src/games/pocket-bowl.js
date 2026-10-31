/* Pocket Bowl: retro arcade football with a team to run between games. On the field you only play offense: call PASS or
   RUN, then drag back to aim a throw (or just tap a receiver), steer whoever has the ball and tap to juke. The other
   team's drives are simulated against your defense. Between games, spend coaching credits on your roster. Ten-game
   season, then the top four play off for the Pocket Bowl. The team and roster carry over from season to season. */
const GAME = {
  id: 'pocket-bowl', title: 'Pocket Bowl', tagline: 'Retro football. Run the team, win the Bowl.',
  font: 'Press Start 2P', accent: '#ffd23f', accent2: '#3ddc84', bg: '#0b2a16', noSkins: true, noHud: true, scoreLabel: 'Season score',
  how: ['PASS: drag back from anywhere and release to throw, or tap a receiver. Keys 1, 2, 3 throw to WR1, WR2 and the running back.', 'With the ball: steer with your finger, mouse or the up/down arrows. Tap or press Space to juke.', 'Between games, spend coaching credits to upgrade players. Win your division and take the Pocket Bowl.'],
  skins: [{ name: 'Classic', price: 0 }],
};
(() => {
  const PX = '"Press Start 2P", monospace', BODY = '800 17px Nunito, system-ui, sans-serif';
  const TEAMS = [
    ['Pixel City', 'Pilots', '#ff6a1a', '#1a1a2a'], ['Neon Bay', 'Sharks', '#29e0ff', '#0a1a2a'], ['Route 9', 'Rattlers', '#9cff3a', '#14240a'], ['Starlite', 'Comets', '#ffd23f', '#2a1a0a'],
    ['Pinewood', 'Owls', '#a56bff', '#1a0a2a'], ['Harbor', 'Hammers', '#e8e8e8', '#2a2a30'], ['Desert', 'Dusters', '#e0a060', '#2a160a'], ['Midnight', 'Moose', '#4a7aff', '#0a0e24'],
  ].map(([city, nick, c, c2], i) => ({ i, city, nick, c, c2, ab: (city[0] + nick[0] + nick[1]).toUpperCase() }));
  const POS = [['QB', 'Arm & accuracy'], ['RB', 'Speed & power'], ['WR1', 'Speed & hands'], ['WR2', 'Speed & hands'], ['OL', 'Time to throw'], ['DEF', 'Stops their drives'], ['K', 'Kicking']];
  const FN = ['Ace', 'Buck', 'Cash', 'Dex', 'Eli', 'Flash', 'Gus', 'Hank', 'Ike', 'Jett', 'Kip', 'Lou', 'Max', 'Nate', 'Odie', 'Pete', 'Quinn', 'Rex', 'Sam', 'Tex', 'Vic', 'Wes', 'Zeke', 'Bo', 'Cy', 'Duke'];
  const LN = ['Blaze', 'Stone', 'Rivers', 'Hart', 'Cobb', 'Dash', 'Fox', 'Gale', 'Hawk', 'Irons', 'Jackson', 'King', 'Lane', 'Moon', 'Nash', 'Orr', 'Pike', 'Rush', 'Steel', 'Tate', 'Vance', 'Wolfe', 'York', 'Booker'];
  const NEWS = ['Fans line up at dawn for tickets.', 'Local diner names a burger after your QB.', 'Rival coach calls your offense "cute". Prove him wrong.', 'Your kicker has been practicing in the parking lot.', 'The marching band learned a new song. It is the same song, louder.', 'Sports radio: "This team is for real."', 'Your running back ate eleven pancakes. Coach approves.'];
  // field: x is yards from your own goal line (0) to theirs (100), y is yards across (0..53)
  const YX = 24, YY = 8.6, FY = 132, FW = 53.3;
  const sx = x => (x - cam) * YX, sy = y => FY + y * YY;
  const ROUTES = {
    go: [[30, 0]], slant: [[4, 0], [18, -9]], out: [[9, 0], [9, 9]], curl: [[12, 0], [9, 0]], post: [[11, 0], [26, -11]], corner: [[11, 0], [24, 11]], drag: [[3, 0], [5, -22]],
  };
  const RBR = { flat: [[1, 6], [9, 12]], swing: [[-2, 5], [6, 12]], wheel: [[1, 6], [7, 9], [26, 10]] };
  let S, cam = 0, P, mode, ptr = null, keys = {}, msg = null, kick = null, anim = 0, hover = null, botT = 0, posed = false, oppAnim = null, endCard = null;
  const R = Math.random, rnd = (a, b) => a + R() * (b - a), pick = a => a[Math.floor(R() * a.length)], clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const pname = () => pick(FN) + ' ' + pick(LN);

  /* ---------- the franchise: saved between sessions ---------- */
  function newRoster() { return POS.map(([p], i) => ({ p, name: pname(), st: i === 0 || i === 5 ? 2 : 1 + (R() < .4 ? 1 : 0), num: [12, 28, 81, 17, 66, 54, 3][i] })); }
  function newSeason(F) {
    F.week = 0; F.season = (F.season || 0) + 1; F.games = []; F.playoff = 0;
    F.rec = TEAMS.map(() => ({ w: 0, l: 0 }));
    F.opp = TEAMS.map((t, i) => i === F.team ? 0 : clamp(1.6 + ((i * 7 + F.season * 3) % 8) * .38 + F.season * .15, 1.5, 5));
    const others = TEAMS.map(t => t.i).filter(i => i !== F.team); F.sched = [];
    for (let w = 0; w < 10; w++) F.sched.push(others[(w + F.season) % others.length]);
    F.news = pick(NEWS);
  }
  // the demo behind the title screen and the cover pose play with a throwaway team, never the player's saved one
  function tempF() { const F = { team: 0, roster: newRoster(), credits: 3, season: 0, picked: true, titles: 0 }; newSeason(F); return F; }
  function franchise() {
    let F = K.save.pb;
    if (!F || !F.roster) { F = K.save.pb = { team: 0, roster: newRoster(), credits: 3, season: 0, picked: false, titles: 0 }; newSeason(F); }
    return F;
  }
  const star = p => S.F.roster.find(r => r.p === p).st;
  const oppTeam = () => TEAMS[S.oppI];
  const myTeam = () => TEAMS[S.F.team];

  /* ---------- sound ---------- */
  const whistle = () => { K.sfx(2400, .18, 'sine', .07, 120); K.sfx(2600, .12, 'sine', .05, 0, .2); };
  const thud = () => { K.sfx(90, .18, 'triangle', .2, -40); K.sfx(160, .06, 'square', .05); };
  const crowd = (d = 1.6, v = .08) => { if (!K.ac || K.bot || K.save.mute) return; const ac = K.ac, n = ac.sampleRate * d, b = ac.createBuffer(1, n, ac.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = (R() * 2 - 1) * Math.sin(Math.PI * i / n); const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = .6; g.gain.value = v; s.buffer = b; s.connect(f).connect(g).connect(K.master); s.start(); };

  /* ---------- a game ---------- */
  function startGame() {
    const F = S.F; S.oppI = F.playoff ? S.oppI : F.sched[F.week];
    S.g = { us: 0, them: 0, poss: 0, maxPoss: 8, ot: false, stats: { pass: 0, rush: 0, td: 0, int: 0 } };
    mode = 'field'; msg = null; kick = null; oppAnim = null; endCard = null;
    driveStart(25); crowd(1.2, .05);
  }
  function driveStart(at) { S.d = { ball: at, down: 1, togo: 10, first: Math.min(100, at + 10) }; presnap(); }
  function quarter() { const g = S.g; return g.ot ? 'OT' : 'Q' + Math.min(4, 1 + Math.floor(g.poss / 2)); }
  function mk(team, role, x, y, o = {}) { return { team, role, x, y, vx: 0, vy: 0, ...o }; }
  function presnap() {
    mode = 'field'; const d = S.d, L = d.ball, mid = FW / 2;
    const combos = [['go', 'slant'], ['post', 'curl'], ['out', 'go'], ['slant', 'corner'], ['curl', 'drag'], ['corner', 'post'], ['drag', 'go']], cmb = pick(combos);
    const ws1 = 6.3 + star('WR1') * .45, ws2 = 6.2 + star('WR2') * .45, def = S.F.opp[S.oppI] || 2;
    P = {
      phase: 'call', t: 0, L, ball: null, carrier: null, thrown: false, play: null, gain: 0, result: null,
      off: [mk('o', 'QB', L - 1.5, mid), mk('o', 'WR1', L - .5, mid - 19, { route: ROUTES[cmb[0]], rname: cmb[0], sp: ws1, side: -1 }), mk('o', 'WR2', L - .5, mid + 19, { route: ROUTES[cmb[1]], rname: cmb[1], sp: ws2, side: 1 }),
        mk('o', 'RB', L - 6, mid + 1.5, { route: RBR[pick(Object.keys(RBR))], sp: 5.6 + star('RB') * .45, side: 1 }), mk('o', 'OL', L - .4, mid - 2.4), mk('o', 'OL', L - .4, mid), mk('o', 'OL', L - .4, mid + 2.4)],
      def: [mk('d', 'CB', L + 6, mid - 19, { cover: 1 }), mk('d', 'CB', L + 6, mid + 19, { cover: 2 }), mk('d', 'S', L + 15, mid, {}), mk('d', 'LB', L + 5, mid + 3, { cover: 3 }),
        mk('d', 'DL', L + .6, mid - 1.6), mk('d', 'DL', L + .6, mid + 1.6)],
      hold: 2.3 + star('OL') * .5 - def * .2, dsp: 5.1 + def * .33, react: .7 - def * .06,
    };
    P.def.forEach(p => p.sp = P.dsp * (p.role === 'DL' ? .78 : p.role === 'S' ? 1.02 : 1));
    P.off.forEach(p => { p.x0 = p.x; p.y0 = p.y; p.wi = 0; });
    cam = L - 14;
  }
  const qb = () => P.off[0];
  function snap(kind) {
    if (!P || P.phase !== 'call') return;
    P.play = kind; P.phase = 'live'; P.t = 0; whistle();
    if (kind === 'run') { P.off[3].route = [[3, -1.5], [30, -1.5]]; }
  }
  // a throw: target point, flight time from distance, a little error from the QB's accuracy
  function throwAt(tx, ty) {
    if (!P || P.phase !== 'live' || P.play !== 'pass' || P.thrown || P.carrier) return;
    const q = qb(), arm = 22 + star('QB') * 6, dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy);
    if (d < 3) return;
    const k = Math.min(1, arm / d); tx = q.x + dx * k; ty = q.y + dy * k;
    const err = (1.25 - star('QB') * .17) * Math.min(d, arm) * .045;
    tx += rnd(-err, err); ty = clamp(ty + rnd(-err, err), .5, FW - .5);
    const dist = Math.hypot(tx - q.x, ty - q.y);
    P.ball = { x0: q.x, y0: q.y, tx, ty, t: 0, T: .32 + dist / (20 + star('QB') * 2.2) }; P.thrown = true; P.throwFrom = q.x;
    K.sfx(500, .08, 'square', .06, 300);
  }
  // tap a receiver: lead them by where they will be when the ball arrives
  function throwTo(p) {
    const q = qb(), d = Math.hypot(p.x - q.x, p.y - q.y), T = .32 + d / (20 + star('QB') * 2.2);
    throwAt(p.x + p.vx * T * 1.05, p.y + p.vy * T * 1.05);
  }
  const near = (list, x, y) => list.reduce((b, p) => { const d = Math.hypot(p.x - x, p.y - y); return d < b.d ? { p, d } : b; }, { p: null, d: 1e9 });
  function land() {
    const b = P.ball, rec = near(P.off.slice(1, 4), b.tx, b.ty), df = near(P.def, b.tx, b.ty), hands = rec.p ? star(rec.p.role === 'RB' ? 'RB' : rec.p.role) : 1;
    P.ball = null;
    if (df.d < 1 && (!rec.p || df.d < rec.d - .3) && R() < .4) { S.g.stats.int++; return endPlay('INTERCEPTED!', 'int'); }
    if (rec.p && rec.d < 1.6 + hands * .16) {
      if (df.d < .9 && R() < .26 - hands * .04) return endPlay('BROKEN UP', 'inc');
      rec.p.x = b.tx; rec.p.y = b.ty; P.carrier = rec.p; P.caught = true; K.sfx(880, .07, 'square', .06); K.sfx(1320, .07, 'square', .05, 0, .07);
      say(pick(['CAUGHT!', 'GOT IT!', 'NICE GRAB!']), 1); return;
    }
    endPlay('INCOMPLETE', 'inc');
  }
  function say(t, d = 1.4, c = '#fff') { msg = { t, d, k: 0, c }; }
  function endPlay(text, kind) {
    if (P.phase === 'over') return;
    P.phase = 'over'; P.t = 0; P.result = { text, kind };
    const d = S.d, spot = P.carrier ? P.carrier.x : kind === 'sack' ? qb().x : d.ball;
    if (kind === 'td') { S.g.stats.td++; K.add(70, 640, 300, '#ffd23f'); K.coin(2); K.chime(523, [0, 4, 7, 12, 16]); crowd(2.4, .1); K.shake(10); K.burst(sx(100), sy(FW / 2), ['#ffd23f', '#fff', myTeam().c], 40, 520); }
    else if (kind === 'int') { K.sfx(140, .5, 'sawtooth', .08, -60); K.shake(6); }
    else if (kind === 'tackle' || kind === 'sack' || kind === 'out') { const g = Math.round(spot - d.ball); P.gain = g; if (P.caught || P.play === 'run') S.g.stats[P.play === 'run' && !P.caught ? 'rush' : 'pass'] += g; thud(); }
    if (kind === 'tackle' || kind === 'out' || kind === 'sack') {
      d.ball = clamp(spot, 1, 99); d.togo = d.first - d.ball;
      if (d.ball >= d.first) { P.result.text += '  ·  FIRST DOWN!'; P.result.first = true; }
    }
  }
  // after the result card: next down, a kick, or the end of the drive
  function afterPlay() {
    const d = S.d, r = P.result;
    if (r.kind === 'td') return startKick('xp', 2);
    if (r.kind === 'int') return driveOver('int', d.ball);
    if (r.first) { d.down = 1; d.first = Math.min(100, d.ball + 10); d.togo = d.first - d.ball; return presnap(); }
    if (r.kind === 'inc') d.togo = d.first - d.ball;
    if (d.down >= 4) return driveOver('downs', d.ball);
    d.down++; presnap();
  }
  function fgRange() { return 100 - S.d.ball + 17 <= 54; }
  function fourth(choice) {
    if (choice === 'punt') return driveOver('punt', S.d.ball);
    if (choice === 'fg') return startKick('fg', 100 - S.d.ball + 17);
  }
  // kicking: a needle sweeps across the bar; stop it in the green
  function startKick(kind, yards) {
    const ks = star('K'), w = kind === 'xp' ? .3 + ks * .03 : clamp(.32 - (yards - 20) * .006 + ks * .035, .07, .34);
    mode = 'kick'; kick = { kind, yards, w, c: rnd(.35, .65), n: 0, dir: 1, sp: .9 + yards * .012, done: false, t: 0 };
  }
  function kickNow() {
    if (!kick || kick.done) return;
    kick.done = true; kick.t = 0; kick.good = Math.abs(kick.n - kick.c) <= kick.w / 2;
    K.sfx(180, .1, 'square', .12); if (kick.good) { K.chime(659, [0, 7, 12]); crowd(1.4, .07); } else K.sfx(220, .4, 'triangle', .08, -120);
  }
  function kickDone() {
    const k = kick; kick = null;
    if (k.kind === 'xp') { S.g.us += 6 + (k.good ? 1 : 0); return driveOver('score', 0); }
    if (k.good) { S.g.us += 3; K.add(30); return driveOver('score', 0); }
    driveOver('fgmiss', S.d.ball);
  }
  // their drive, simulated against your defense; where it starts depends on how yours ended
  function driveOver(how, spot) {
    const g = S.g; g.poss++;
    const def = star('DEF'), opp = S.F.opp[S.oppI] || 2, give = how === 'int' || how === 'downs' ? clamp((100 - spot) / 100, .1, .9) : how === 'punt' ? .15 : how === 'fgmiss' ? .3 : 0;
    const pTD = clamp(.24 + (opp - def) * .07 + give * .3, .05, .8), pFG = .2;
    const r = R(), res = r < pTD ? 'td' : r < pTD + pFG ? 'fg' : R() < .7 ? 'punt' : 'turnover';
    const pts = res === 'td' ? 7 : res === 'fg' ? 3 : 0, start = how === 'int' || how === 'downs' ? 100 - spot : res === 'turnover' ? rnd(40, 60) : res === 'punt' ? rnd(18, 34) : 25;
    g.poss++;
    oppAnim = { res, pts, t: 0, from: how, start: Math.round(clamp(start, 5, 60)), after: Math.round(clamp(start, 5, 60)) };
    mode = 'opp';
  }
  function oppDone() {
    const a = oppAnim; oppAnim = null; S.g.them += a.pts;
    const g = S.g;
    if (g.poss >= g.maxPoss) {
      if (g.us === g.them) { g.ot = true; g.maxPoss += 2; say('OVERTIME!', 1.6, '#ffd23f'); }
      else return finishGame();
    }
    driveStart(a.res === 'td' || a.res === 'fg' ? 25 : a.after);
  }
  function finishGame() {
    const F = S.F, g = S.g, win = g.us > g.them, earn = (win ? 2 : 1) + Math.min(3, g.stats.td);
    F.credits += earn; K.coin(win ? 4 : 1);
    if (win) { K.add(200, 640, 300, '#3ddc84'); K.chime(523, [0, 4, 7, 12]); } else K.sfx(200, .6, 'triangle', .08, -100);
    endCard = { win, earn, us: g.us, them: g.them, opp: S.oppI, stats: g.stats, playoff: F.playoff };
    if (!F.playoff) {
      F.rec[F.team][win ? 'w' : 'l']++; F.rec[S.oppI][win ? 'l' : 'w']++;
      // the rest of the league plays too
      const rest = TEAMS.map(t => t.i).filter(i => i !== F.team && i !== S.oppI).sort(() => R() - .5);
      for (let i = 0; i + 1 < rest.length; i += 2) { const a = rest[i], b = rest[i + 1], pa = .5 + (F.opp[a] - F.opp[b]) * .12; if (R() < pa) { F.rec[a].w++; F.rec[b].l++; } else { F.rec[b].w++; F.rec[a].l++; } }
      F.games.push({ opp: S.oppI, us: g.us, them: g.them }); F.week++;
    }
    mode = 'result'; K.persist();
  }
  function standings() { const F = S.F; return TEAMS.map(t => ({ t, ...F.rec[t.i] })).sort((a, b) => b.w - a.w || a.l - b.l || (b.t.i === F.team) - (a.t.i === F.team)); }
  // back to the team screen, or on to the playoffs, or the end of the season
  function fromResult() {
    const F = S.F, c = endCard;
    if (F.playoff) {
      if (!c.win) return seasonOver(false, F.playoff === 1 ? 'Out in the semifinal' : 'Lost the Pocket Bowl');
      if (F.playoff === 2) { F.titles = (F.titles || 0) + 1; K.add(1000); return seasonOver(true, 'Pocket Bowl champions!'); }
      F.playoff = 2; S.oppI = standings().filter(x => x.t.i !== F.team)[0].t.i; mode = 'hub'; K.persist(); return;
    }
    if (F.week >= 10) {
      const top = standings().slice(0, 4).map(x => x.t.i);
      if (!top.includes(F.team)) return seasonOver(false, 'Missed the playoffs');
      F.playoff = 1; S.oppI = top.filter(i => i !== F.team)[top.length - 2] ?? top.find(i => i !== F.team);
    }
    mode = 'hub'; K.persist();
  }
  function seasonOver(champ, title) {
    const F = S.F, r = F.rec[F.team];
    const text = `${myTeam().city} ${myTeam().nick} went ${r.w}-${r.l}${champ ? ' and lifted the Pocket Bowl' : ''}. Season ${F.season} is over: your roster and credits carry into the next one.${F.titles ? ' Titles: ' + F.titles + '.' : ''}`;
    F.credits += 2; newSeason(F); K.persist();
    K.over({ title, text, delay: 300 });
  }
  function upgrade(i) {
    const F = S.F, p = F.roster[i], cost = p.st + 1;
    if (p.st >= 5) return say('Already a superstar', 1.2);
    if (F.credits < cost) { K.sfx(160, .15, 'square', .06); return say(`Need ${cost} credits`, 1.2, '#ff8a8a'); }
    F.credits -= cost; p.st++; K.chime(659, [0, 4, 7]); K.persist(); say(`${p.name} is now ${'★'.repeat(p.st)}`, 1.4, '#ffd23f');
  }

  /* ---------- simulation of a live play ---------- */
  function stepTo(p, tx, ty, sp, dt) { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1, v = Math.min(sp, d / dt); p.vx = dx / d * v; p.vy = dy / d * v; p.x += p.vx * dt; p.y = clamp(p.y + p.vy * dt, .3, FW - .3); }
  function runRoute(p, dt) {
    const r = p.route; if (!r) return;
    if (p.wi < r.length) { const [ax, ay] = r[p.wi], tx = p.x0 + ax, ty = p.y0 + ay * (p.side || 1); stepTo(p, tx, ty, p.sp, dt); if (Math.hypot(tx - p.x, ty - p.y) < .3) p.wi++; }
    else stepTo(p, p.x + (p.vx || p.sp), p.y + (p.vy || 0) * .2, p.sp, dt);
  }
  function update(dt) {
    if (msg && (msg.k += dt) > msg.d) msg = null;
    if (mode === 'kick') { const k = kick; if (!k.done) { k.n += k.dir * k.sp * dt; if (k.n > 1) { k.n = 1; k.dir = -1; } if (k.n < 0) { k.n = 0; k.dir = 1; } } else if ((k.t += dt) > 1.6) kickDone(); return; }
    if (mode === 'opp') { if ((oppAnim.t += dt) > 3) oppDone(); return; }
    if (mode !== 'field' || !P) return;
    P.t += dt;
    const q = qb(), mid = FW / 2;
    if (P.phase === 'over') { if (P.t > 1.7) afterPlay(); return; }
    if (P.phase === 'live') {
      // offense
      if (!P.carrier) {
        if (P.play === 'run' && P.t > .45) { P.carrier = P.off[3]; P.off[3].route = null; }
        stepTo(q, P.L - (P.play === 'run' ? 1.5 : 4.5), q.y, 3.4, dt);
        for (const p of P.off.slice(1, 4)) if (p !== P.carrier) runRoute(p, dt);
        if (P.ball) { const b = P.ball; for (const p of P.off.slice(1, 4)) { const dd = Math.hypot(b.tx - p.x, b.ty - p.y); if (dd < 7) stepTo(p, b.tx, b.ty, p.sp * 1.05, dt); } }
      } else {
        const c = P.carrier, sp = (c.sp || 5.6) * (c.juke > 0 ? 1.35 : 1);
        let ty = c.y; if (keys.up) ty -= 6; if (keys.down) ty += 6; if (ptr && ptr.steer) ty = clamp((ptr.y - FY) / YY, .5, FW - .5);
        if (c.juke > 0) { c.juke -= dt; ty = c.jy; }
        stepTo(c, c.x + sp, ty, sp, dt); if (c.jcd > 0) c.jcd -= dt;
        for (const p of P.off) if (p !== c && p.role !== 'QB') { const tg = near(P.def, p.x, p.y); if (tg.p && tg.d < 6) stepTo(p, tg.p.x, tg.p.y, 5.5, dt); else stepTo(p, c.x + 2, p.y, 5, dt); }
      }
      // line play: blockers hold the rush, then it gets home
      const ol = P.off.slice(4);
      for (const [i, dl] of P.def.filter(p => p.role === 'DL').entries()) { if (P.t < P.hold && !P.carrier) { dl.x = Math.max(dl.x, ol[i * 2].x + .9); dl.y += (ol[i * 2].y - dl.y) * .05; } }
      for (const o of ol) { const tg = near(P.def.filter(p => p.role === 'DL'), o.x, o.y); if (tg.p && P.t < P.hold) stepTo(o, tg.p.x - .9, tg.p.y, 2.5, dt); }
      // defense
      const tgt = P.carrier || (P.ball ? null : q);
      for (const d of P.def) {
        if (d.stun > 0) { d.stun -= dt; continue; }
        if (P.t < P.react && d.role !== 'DL') continue;
        if (P.carrier) { const c = P.carrier, lead = Math.min(1, Math.hypot(c.x - d.x, c.y - d.y) / 10); stepTo(d, c.x + c.vx * lead * .4, c.y + c.vy * lead * .4, d.sp * .96, dt); }
        else if (P.ball && d.role !== 'DL') { const b = P.ball, dd = Math.hypot(b.tx - d.x, b.ty - d.y); if (dd < 9) stepTo(d, b.tx, b.ty, d.sp * .95, dt); else stepTo(d, d.x + .5, d.y, d.sp * .5, dt); }
        else if (d.role === 'DL') { if (P.t > P.hold) stepTo(d, q.x, q.y, d.sp, dt); }
        else if (d.cover) { const m = P.off[d.cover], back = d.role === 'LB' ? 1.8 : 2.6; stepTo(d, m.x + back - Math.min(1.6, P.t * .35), m.y + (mid - m.y) * .06, d.sp * .97, dt); }
        else { const deep = P.off.slice(1, 3).reduce((a, b) => a.x > b.x ? a : b); stepTo(d, Math.max(P.L + 14, deep.x + 5), d.y + (deep.y - d.y) * .3, d.sp * .9, dt); }
      }
      // the ball in the air
      if (P.ball) { P.ball.t += dt; if (P.ball.t >= P.ball.T) land(); }
      // sacks, tackles, touchdowns, sidelines
      if (!P.carrier && !P.thrown && P.play === 'pass') { for (const d of P.def) if (d.role === 'DL' && Math.hypot(d.x - q.x, d.y - q.y) < .9) { P.carrier = null; return endPlay('SACKED!', 'sack'); } }
      if (P.carrier) {
        const c = P.carrier;
        if (c.x >= 100) { c.x = 100.5; return endPlay('TOUCHDOWN!', 'td'); }
        if (c.y <= .35 || c.y >= FW - .35) return endPlay(`OUT OF BOUNDS  ${fmtGain(c.x - S.d.ball)}`, 'out');
        for (const d of P.def) {
          if (d.stun > 0 || Math.hypot(d.x - c.x, d.y - c.y) > .78) continue;
          if (c.juke > 0) { d.stun = .5; continue; }
          const brk = .2 + star(c.role === 'RB' ? 'RB' : c.role) * .05 - (S.F.opp[S.oppI] || 2) * .025;
          if (!d.tried && R() < brk) { d.tried = 1; d.stun = .8; say('BROKE A TACKLE!', .9, '#9cff3a'); K.sfx(300, .08, 'square', .06); continue; }
          return endPlay(`TACKLED  ${fmtGain(c.x - S.d.ball)}`, 'tackle');
        }
      }
      cam += ((P.carrier ? P.carrier.x - 18 : P.ball ? Math.max(P.L - 14, P.ball.tx - 30) : P.L - 14) - cam) * Math.min(1, dt * 3);
    }
  }
  const fmtGain = g => (g >= 0 ? '+' : '') + Math.round(g) + ' YDS';
  function juke() {
    const c = P && P.carrier; if (!c || P.phase !== 'live' || c.jcd > 0) return;
    const tg = near(P.def, c.x, c.y), away = tg.p ? (c.y < tg.p.y ? -1 : 1) : 1;
    c.juke = .38; c.jcd = 1.3; c.jy = clamp(c.y + away * 3.2, .6, FW - .6); K.sfx(700, .07, 'square', .05, -300);
  }

  /* ---------- drawing ---------- */
  function rr(g, x, y, w, h, r, f, s) { g.beginPath(); g.roundRect(x, y, w, h, r); if (f) { g.fillStyle = f; g.fill(); } if (s) { g.strokeStyle = s; g.lineWidth = 3; g.stroke(); } }
  function txt(g, t, x, y, f, c, al = 'center') { g.font = f; g.fillStyle = c; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(t, x, y); }
  function drawField(g) {
    g.fillStyle = '#123a1e'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720);
    // crowd stands top and bottom
    for (const [y0, h] of [[46, 82], [596, 40]]) { g.fillStyle = '#1c1c28'; g.fillRect(K.view.x0, y0, K.view.x1 - K.view.x0, h); for (let i = 0; i < 160; i++) { const x = ((i * 47.3 - cam * 6) % 1400 + 1400) % 1400 - 60, yy = y0 + 8 + (i * 13) % (h - 14); g.fillStyle = ['#ff6a1a', '#29e0ff', '#ffd23f', '#e8e8e8', '#a56bff', myTeam().c][i % 6]; g.fillRect(x, yy + (anim > 0 && i % 3 === 0 ? -Math.abs(Math.sin(anim * 20 + i)) * 5 : 0), 6, 6); } }
    for (let x = Math.floor(cam / 5) * 5 - 5; x < cam + 60; x += 5) {
      const x0 = sx(x); g.fillStyle = (Math.floor(x / 5) % 2 ? '#2f8a3e' : '#2a7d38'); g.fillRect(x0, FY, 5 * YX + 1, FW * YY);
      if (x >= 0 && x <= 100) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x0 - 1, FY, 3, FW * YY); if (x % 10 === 0 && x > 0 && x < 100) { const n = String(x <= 50 ? x : 100 - x); txt(g, n, x0, FY + 34, `20px ${PX}`, 'rgba(255,255,255,.55)'); txt(g, n, x0, FY + FW * YY - 34, `20px ${PX}`, 'rgba(255,255,255,.55)'); } }
      for (let k = 1; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(sx(x + k) - 1, sy(FW / 2 - 3.2), 2, 6); g.fillRect(sx(x + k) - 1, sy(FW / 2 + 3.2), 2, 6); }
    }
    // end zones
    for (const [a, t] of [[-10, myTeam()], [100, oppTeam()]]) { const x0 = sx(a); g.fillStyle = t.c2; g.fillRect(x0, FY, 10 * YX, FW * YY); g.save(); g.translate(x0 + 5 * YX, FY + FW * YY / 2); g.rotate(a < 0 ? -Math.PI / 2 : Math.PI / 2); txt(g, t.nick.toUpperCase(), 0, 0, `34px ${PX}`, t.c); g.restore(); }
    g.fillStyle = '#fff'; g.fillRect(sx(-10) - 3, FY - 3, 3, FW * YY + 6); g.fillRect(sx(110), FY - 3, 3, FW * YY + 6);
    g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(sx(-10), FY, 120 * YX, FW * YY);
    // goal posts at the back of each end zone
    for (const a of [-10, 110]) { g.fillStyle = '#ffd23f'; g.fillRect(sx(a) - 3, sy(FW / 2 - 3), 6, 3 * 2 * YY); g.fillRect(sx(a) - 6, sy(FW / 2) - 3, 12, 6); }
  }
  // chunky retro footballers: helmet, facemask, jersey number
  function player(g, p, col, col2, sel) {
    const x = sx(p.x), y = sy(p.y), run = Math.hypot(p.vx, p.vy) > .5, ph = run ? Math.sin(anim * 18 + p.x) * 3 : 0, face = p.team === 'o' ? 1 : -1;
    g.save(); g.translate(x, y); g.scale(1.45, 1.45);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 4, 11, 4, 0, 0, 7); g.fill();
    if (sel) { g.strokeStyle = '#ffd23f'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 4, 15, 6, 0, 0, 7); g.stroke(); }
    g.fillStyle = '#e8e8e8'; g.fillRect(-6, -2 + ph * .3, 5, 6 - ph * .4); g.fillRect(1, -2 - ph * .3, 5, 6 + ph * .4);
    g.fillStyle = '#1a1a1a'; g.fillRect(-6, 3 + ph * .3, 5, 2); g.fillRect(1, 3 - ph * .3, 5, 2);
    g.fillStyle = col; g.fillRect(-8, -18, 16, 16); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(4, -18, 4, 16); g.fillStyle = col2; g.fillRect(-8, -6, 16, 4);
    g.fillRect(-10, -18, 3, 9); g.fillRect(7, -18, 3, 9);
    g.fillStyle = col2; g.font = `7px ${PX}`; g.textAlign = 'center'; g.textBaseline = 'middle'; if (p.num) g.fillText(String(p.num % 100), 0, -11);
    g.fillStyle = col; g.fillRect(-7, -30, 14, 12); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-5, -29, 4, 3); g.fillStyle = col2; g.fillRect(-1, -30, 2, 12);
    g.fillStyle = '#d0d0d0'; g.fillRect(face > 0 ? 4 : -8, -26, 4, 6);
    g.restore();
  }
  function drawPlay(g) {
    const d = S.d, me = myTeam(), op = oppTeam();
    g.fillStyle = '#29a8ff'; g.fillRect(sx(d.ball) - 2, FY, 4, FW * YY);
    if (d.first < 100) { g.fillStyle = '#ffd23f'; g.fillRect(sx(d.first) - 2, FY, 4, FW * YY); }
    if (P.phase === 'call') {
      // routes drawn like a playbook before the snap
      for (const p of P.off.slice(1, 4)) { if (!p.route) continue; g.strokeStyle = p.role === 'RB' ? 'rgba(255,255,255,.4)' : 'rgba(255,230,120,.75)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(sx(p.x), sy(p.y)); let cx = p.x, cy = p.y; for (const [ax, ay] of p.route) { cx = p.x0 + ax; cy = p.y0 + ay * (p.side || 1); g.lineTo(sx(cx), sy(cy)); } g.stroke(); g.setLineDash([]); }
    }
    const all = [...P.off.map(p => [p, me.c, me.c2]), ...P.def.map(p => [p, op.c, op.c2])].sort((a, b) => a[0].y - b[0].y);
    const num = { QB: S.F.roster[0].num, RB: S.F.roster[1].num, WR1: S.F.roster[2].num, WR2: S.F.roster[3].num, OL: 66, CB: 24, S: 31, LB: 52, DL: 90 };
    for (const [p, c, c2] of all) { p.num = num[p.role]; player(g, p, c, c2, p === P.carrier || (P.phase === 'live' && !P.thrown && P.play === 'pass' && hover === p)); }
    // the ball: held, carried or in the air with its shadow
    const b = P.ball, hold = P.carrier || (P.phase !== 'over' && !P.thrown ? qb() : null);
    if (b) { const k = b.t / b.T, x = b.x0 + (b.tx - b.x0) * k, y = b.y0 + (b.ty - b.y0) * k, h = Math.sin(k * Math.PI) * (12 + b.T * 22); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(sx(x), sy(y) + 2, 6, 3, 0, 0, 7); g.fill(); ballSprite(g, sx(x), sy(y) - 22 - h * 4, k * 9); g.strokeStyle = 'rgba(255,210,63,.6)'; g.lineWidth = 2; g.beginPath(); g.ellipse(sx(b.tx), sy(b.ty), 14, 6, 0, 0, 7); g.stroke(); }
    else if (hold) ballSprite(g, sx(hold.x) + 13, sy(hold.y) - 20, 0);
    // aiming: the drag-back line and where the ball will come down
    if (P.phase === 'live' && P.play === 'pass' && !P.thrown && ptr && ptr.aim) {
      const t = aimTarget(); if (t) { const q = qb(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(sx(q.x), sy(q.y) - 14); g.quadraticCurveTo((sx(q.x) + sx(t.x)) / 2, Math.min(sy(q.y), sy(t.y)) - 80, sx(t.x), sy(t.y)); g.stroke(); g.setLineDash([]); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx(t.x), sy(t.y), 18, 8, 0, 0, 7); g.stroke(); }
    }
  }
  function ballSprite(g, x, y, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(1.3, 1.3); g.fillStyle = '#8a4a1e'; g.beginPath(); g.ellipse(0, 0, 8, 5, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(-3, -1, 6, 2); g.restore(); }
  function aimTarget() {
    if (!ptr || !ptr.aim) return null; const q = qb(), dx = ptr.x0 - ptr.x, dy = ptr.y0 - ptr.y, L = Math.hypot(dx, dy);
    if (L < 18) return null; const arm = 22 + star('QB') * 6, dist = Math.min(arm, L * .16 + 4);
    return { x: q.x + dx / L * dist, y: clamp(q.y + dy / L * dist * (YX / YY) * .55, .5, FW - .5) };
  }
  function scoreboard(g) {
    const me = myTeam(), op = oppTeam(), d = S.d;
    rr(g, 340, 6, 600, 40, 8, 'rgba(8,8,12,.92)', 'rgba(255,255,255,.15)');
    rr(g, 344, 10, 150, 32, 6, me.c); txt(g, me.ab, 380, 27, `14px ${PX}`, me.c2); txt(g, String(S.g.us), 462, 27, `16px ${PX}`, me.c2);
    rr(g, 786, 10, 150, 32, 6, op.c); txt(g, op.ab, 822, 27, `14px ${PX}`, op.c2); txt(g, String(S.g.them), 904, 27, `16px ${PX}`, op.c2);
    const dn = ['1ST', '2ND', '3RD', '4TH'][d.down - 1], togo = d.first >= 100 ? 'GOAL' : Math.max(1, Math.round(d.togo));
    txt(g, `${quarter()}  ${dn} & ${togo}`, 640, 21, `12px ${PX}`, '#ffd23f'); txt(g, `BALL ON ${d.ball <= 50 ? 'OWN ' + Math.round(d.ball) : 'OPP ' + Math.round(100 - d.ball)}`, 640, 36, `9px ${PX}`, '#cfd8e0');
  }
  const BTN = { pass: { x: 380, y: 640, w: 250, h: 66 }, run: { x: 650, y: 640, w: 250, h: 66 }, punt: { x: 250, y: 640, w: 240, h: 66 }, fg: { x: 520, y: 640, w: 240, h: 66 }, go: { x: 790, y: 640, w: 240, h: 66 },
    play: { x: 812, y: 560, w: 420, h: 104 }, cont: { x: 490, y: 600, w: 300, h: 70 }, prev: { x: 812, y: 104, w: 52, h: 52 }, next: { x: 1180, y: 104, w: 52, h: 52 } };
  const hit = (b, x, y) => b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function btn(g, b, label, c, c2 = '#141414', sub) {
    const hv = hover === b; g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(b.x, b.y + 6, b.w, b.h, 12); g.fill();
    rr(g, b.x, b.y + (hv ? 2 : 0), b.w, b.h, 12, c); txt(g, label, b.x + b.w / 2, b.y + b.h / 2 + (sub ? -9 : 1) + (hv ? 2 : 0), `${b.h > 90 ? 34 : 18}px ${PX}`, c2);
    if (sub) txt(g, sub, b.x + b.w / 2, b.y + b.h / 2 + 18 + (hv ? 2 : 0), BODY, c2);
  }
  function fieldUI(g) {
    if (P.phase === 'call') {
      if (S.d.down === 4 && !P.go4) { btn(g, BTN.punt, 'PUNT', '#e8e8e8'); btn(g, BTN.fg, 'FIELD GOAL', fgRange() ? '#3ddc84' : '#555', fgRange() ? '#141414' : '#999'); btn(g, BTN.go, 'GO FOR IT', '#ffd23f'); }
      else { btn(g, BTN.pass, 'PASS', '#ffd23f'); btn(g, BTN.run, 'RUN', '#3ddc84'); }
      txt(g, S.d.down === 4 && !P.go4 ? '4th down: kick it or go for it?' : 'Call the play. The yellow lines are your receivers\' routes.', 640, 616, BODY, '#fff');
    } else if (P.phase === 'live') {
      const t = P.carrier ? 'Steer with your finger or the arrow keys. Tap or press Space to juke!' : P.play === 'pass' && !P.thrown ? 'Drag back and release to throw, or tap a receiver (keys 1, 2, 3)' : '';
      txt(g, t, 640, 664, BODY, '#fff');
    }
    if (P.phase === 'over' && P.result) { const r = P.result, big = r.kind === 'td'; rr(g, 340, 290, 600, big ? 120 : 80, 14, 'rgba(8,8,12,.86)', big ? '#ffd23f' : 'rgba(255,255,255,.25)'); txt(g, r.text, 640, big ? 350 : 330, `${big ? 34 : 18}px ${PX}`, big ? '#ffd23f' : r.kind === 'int' ? '#ff6a6a' : '#fff'); }
  }
  function drawKick(g) {
    const k = kick; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720);
    rr(g, 290, 140, 700, 400, 18, '#14141c', '#ffd23f');
    txt(g, k.kind === 'xp' ? 'EXTRA POINT' : `${Math.round(k.yards)} YARD FIELD GOAL`, 640, 190, `22px ${PX}`, '#ffd23f');
    // the uprights and the ball's flight once kicked
    g.fillStyle = '#ffd23f'; g.fillRect(630, 300, 20, 90); g.fillRect(560, 296, 160, 10); g.fillRect(556, 230, 10, 76); g.fillRect(714, 230, 10, 76);
    if (k.done) { const t = Math.min(1, k.t / 1), off = (k.n - k.c) * 520; ballSprite(g, 640 + off * t, 470 - t * 230, t * 12); if (t >= 1) txt(g, k.good ? 'IT\'S GOOD!' : 'NO GOOD', 640, 410, `28px ${PX}`, k.good ? '#3ddc84' : '#ff6a6a'); }
    else ballSprite(g, 640, 470, 0);
    const bx = 360, bw = 560, by = 486; rr(g, bx, by, bw, 26, 6, '#2a2a34'); rr(g, bx + (k.c - k.w / 2) * bw, by, k.w * bw, 26, 6, '#3ddc84');
    g.fillStyle = '#fff'; g.fillRect(bx + k.n * bw - 3, by - 8, 6, 42);
    if (!k.done) txt(g, 'Tap or press Space when the line is in the green', 640, 530, BODY, '#fff');
  }
  function drawOpp(g) {
    const a = oppAnim, op = oppTeam(), k = Math.min(1, a.t / 2.2);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(K.view.x0, 0, K.view.x1 - K.view.x0, 720);
    rr(g, 240, 190, 800, 300, 18, '#14141c', op.c);
    txt(g, `${op.city.toUpperCase()} ${op.nick.toUpperCase()} HAVE THE BALL`, 640, 236, `16px ${PX}`, op.c);
    txt(g, a.from === 'int' ? 'After your interception...' : a.from === 'downs' ? 'After you turned it over on downs...' : a.from === 'punt' ? 'After your punt...' : a.from === 'fgmiss' ? 'After your missed kick...' : 'Your defense takes the field...', 640, 272, BODY, '#cfd8e0');
    // a drive chart: their march across a mini field
    const fx = 300, fw = 680, fy = 320; rr(g, fx, fy, fw, 50, 6, '#2a7d38'); for (let i = 1; i < 10; i++) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(fx + fw * i / 10, fy, 2, 50); }
    const end = a.res === 'td' ? 100 : a.res === 'fg' ? 72 : a.res === 'punt' ? 45 : 38, from = a.from === 'int' || a.from === 'downs' ? 100 - S.d.ball : 25, cur = from + (end - from) * k;
    g.fillStyle = op.c; g.fillRect(fx + fw * from / 100, fy + 20, fw * (cur - from) / 100, 10); ballSprite(g, fx + fw * cur / 100, fy + 25, 0);
    if (a.t > 2.2) { const t = { td: 'TOUCHDOWN ' + op.nick.toUpperCase(), fg: 'FIELD GOAL, +3', punt: 'DEFENSE HOLDS! THEY PUNT', turnover: 'TURNOVER! YOUR BALL' }[a.res]; txt(g, t, 640, 420, `20px ${PX}`, a.pts ? '#ff8a6a' : '#3ddc84'); }
    txt(g, `${myTeam().ab} ${S.g.us}  -  ${S.g.them + (a.t > 2.2 ? a.pts : 0)} ${op.ab}`, 640, 462, `14px ${PX}`, '#fff');
  }
  function drawHub(g) {
    const F = S.F, me = myTeam(), v = K.view;
    g.fillStyle = '#0d1a12'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.fillStyle = 'rgba(255,255,255,.03)'; for (let x = 0; x < 1280; x += 64) g.fillRect(x, 0, 2, 720);
    // team header
    rr(g, 30, 20, 1220, 70, 14, me.c2, me.c);
    rr(g, 44, 30, 50, 50, 10, me.c); txt(g, me.ab, 69, 56, `14px ${PX}`, me.c2);
    txt(g, `${me.city.toUpperCase()} ${me.nick.toUpperCase()}`, 110, 48, `20px ${PX}`, me.c, 'left');
    const r = F.rec[F.team]; txt(g, F.playoff ? (F.playoff === 1 ? 'PLAYOFFS: SEMIFINAL' : 'THE POCKET BOWL') : `SEASON ${F.season}  ·  WEEK ${F.week + 1} OF 10  ·  ${r.w}-${r.l}`, 110, 74, `11px ${PX}`, '#cfd8e0', 'left');
    txt(g, `🪙 ${F.credits}`, 1230, 48, `20px ${PX}`, '#ffd23f', 'right'); txt(g, 'COACHING CREDITS', 1230, 74, `9px ${PX}`, '#cfd8e0', 'right');
    // roster
    txt(g, 'YOUR ROSTER', 40, 118, `13px ${PX}`, '#ffd23f', 'left'); txt(g, 'Upgrade players with credits. You earn them by winning and scoring.', 250, 118, BODY, '#9aa8a0', 'left');
    F.roster.forEach((p, i) => {
      const y = 140 + i * 66, b = { x: 600, y: y + 8, w: 150, h: 46 }; BTN['up' + i] = b;
      rr(g, 30, y, 740, 58, 10, i % 2 ? '#14261a' : '#172c1e');
      rr(g, 40, y + 9, 70, 40, 8, me.c); txt(g, p.p, 75, y + 30, `13px ${PX}`, me.c2);
      txt(g, p.name, 124, y + 22, '800 20px Nunito, system-ui', '#fff', 'left'); txt(g, POS[i][1], 124, y + 44, '700 15px Nunito, system-ui', '#9aa8a0', 'left');
      txt(g, '★'.repeat(p.st) + '☆'.repeat(5 - p.st), 470, y + 30, '26px system-ui', '#ffd23f');
      const max = p.st >= 5, can = !max && F.credits >= p.st + 1;
      rr(g, b.x, b.y + (hover === b ? 2 : 0), b.w, b.h, 8, max ? '#2a3a2e' : can ? '#3ddc84' : '#3a4a3e'); txt(g, max ? 'MAXED' : `+1 ★  for ${p.st + 1} 🪙`, b.x + b.w / 2, b.y + 24 + (hover === b ? 2 : 0), '900 16px Nunito, system-ui', can ? '#0b2a16' : '#9aa8a0');
    });
    // next game
    const op = oppTeam(), opr = F.opp[S.oppI] || 2;
    rr(g, 800, 104, 450, 440, 14, '#14141c', 'rgba(255,255,255,.12)');
    txt(g, F.playoff ? (F.playoff === 1 ? 'SEMIFINAL' : 'POCKET BOWL FINAL') : 'NEXT GAME', 1025, 134, `14px ${PX}`, '#ffd23f');
    if (!F.picked && F.week === 0 && F.season === 1) { rr(g, BTN.prev.x, BTN.prev.y, 52, 52, 10, '#2a2a34'); txt(g, '◀', BTN.prev.x + 26, BTN.prev.y + 27, '24px system-ui', '#fff'); rr(g, BTN.next.x, BTN.next.y, 52, 52, 10, '#2a2a34'); txt(g, '▶', BTN.next.x + 26, BTN.next.y + 27, '24px system-ui', '#fff'); txt(g, 'pick your team', 1025, 160, BODY, '#9aa8a0'); }
    rr(g, 845, 180, 160, 160, 16, me.c); txt(g, me.ab, 925, 260, `30px ${PX}`, me.c2);
    txt(g, 'VS', 1025, 260, `20px ${PX}`, '#fff');
    rr(g, 1045, 180, 160, 160, 16, op.c); txt(g, op.ab, 1125, 260, `30px ${PX}`, op.c2);
    txt(g, `${op.city} ${op.nick}`, 1125, 362, '800 18px Nunito, system-ui', '#fff'); txt(g, '★'.repeat(Math.round(opr)) + '☆'.repeat(5 - Math.round(opr)), 1125, 388, '20px system-ui', op.c);
    txt(g, `${me.city} ${me.nick}`, 925, 362, '800 18px Nunito, system-ui', '#fff');
    const rr2 = F.rec[S.oppI]; if (!F.playoff) txt(g, `Their record: ${rr2.w}-${rr2.l}`, 1025, 420, BODY, '#9aa8a0');
    txt(g, '📰 ' + F.news, 1025, 456, '700 15px Nunito, system-ui', '#cfd8e0');
    btn(g, BTN.play, 'PLAY', '#ffd23f', '#141414', 'Kick off');
    // standings
    if (!F.playoff) { const sd = standings().slice(0, 8); txt(g, 'STANDINGS', 40, 618, `11px ${PX}`, '#ffd23f', 'left'); sd.forEach((x, i) => { const cx = 40 + (i % 4) * 190, cy = 646 + Math.floor(i / 4) * 30; txt(g, `${i + 1}. ${x.t.ab} ${x.w}-${x.l}`, cx, cy, `11px ${PX}`, x.t.i === F.team ? '#ffd23f' : i < 4 ? '#e8e8e8' : '#7a8a80', 'left'); }); txt(g, 'Top 4 make the playoffs', 800, 690, '700 14px Nunito, system-ui', '#7a8a80', 'left'); }
    if (msg) { rr(g, 340, 560, 440, 44, 10, 'rgba(8,8,12,.92)'); txt(g, msg.t, 560, 582, '800 18px Nunito, system-ui', msg.c); }
  }
  function drawResult(g) {
    const c = endCard, me = myTeam(), op = TEAMS[c.opp], v = K.view;
    g.fillStyle = 'rgba(0,0,0,.72)'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    rr(g, 290, 110, 700, 470, 18, '#14141c', c.win ? '#3ddc84' : '#ff6a6a');
    txt(g, c.win ? 'VICTORY!' : 'DEFEAT', 640, 168, `40px ${PX}`, c.win ? '#3ddc84' : '#ff6a6a');
    txt(g, `${me.ab}  ${c.us}  -  ${c.them}  ${op.ab}`, 640, 236, `28px ${PX}`, '#fff');
    const s = c.stats; [['Passing yards', s.pass], ['Rushing yards', s.rush], ['Touchdowns', s.td], ['Interceptions thrown', s.int]].forEach(([k, n], i) => { txt(g, k, 440, 300 + i * 38, '700 20px Nunito, system-ui', '#cfd8e0', 'left'); txt(g, String(n), 840, 300 + i * 38, `16px ${PX}`, '#fff', 'right'); });
    txt(g, `+${c.earn} coaching credits`, 640, 470, `16px ${PX}`, '#ffd23f');
    btn(g, BTN.cont, 'CONTINUE', '#ffd23f');
  }

  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    S = { F: K.bot ? tempF() : franchise() }; posed = false; ptr = null; keys = {}; msg = null; kick = null; oppAnim = null; endCard = null;
    if (S.F.playoff) S.oppI = standings().filter(x => x.t.i !== S.F.team)[S.F.playoff === 2 ? 0 : 2].t.i; else S.oppI = S.F.sched[S.F.week];
    mode = 'hub';
    if (K.bot) { startGame(); }
  };
  GAME.update = dt => { anim += dt; update(dt); };
  GAME.draw = g => {
    if (mode === 'hub') return drawHub(g);
    drawField(g); if (P) drawPlay(g); scoreboard(g); if (mode === 'field' && P) fieldUI(g);
    if (mode === 'kick') drawKick(g); if (mode === 'opp') drawOpp(g); if (mode === 'result') drawResult(g);
    if (msg && mode === 'field') { const a = Math.min(1, msg.k * 6, (msg.d - msg.k) * 4); g.globalAlpha = Math.max(0, a); txt(g, msg.t, 640, 112, `18px ${PX}`, msg.c); g.globalAlpha = 1; }
  };
  const playerAt = (x, y) => P && P.off.slice(1, 4).find(p => Math.hypot(sx(p.x) - x, sy(p.y) - 20 - y) < 40);
  GAME.down = (x, y) => {
    K.audio && K.audio();
    if (mode === 'hub') {
      const F = S.F;
      if (hit(BTN.play, x, y)) { F.picked = true; K.persist(); return startGame(); }
      if (!F.picked && F.week === 0 && F.season === 1 && (hit(BTN.prev, x, y) || hit(BTN.next, x, y))) { F.team = (F.team + (hit(BTN.next, x, y) ? 1 : 7)) % 8; newSeason(F); F.season = 1; S.oppI = F.sched[0]; K.sfx(600, .06, 'square', .05); return; }
      for (let i = 0; i < 7; i++) if (hit(BTN['up' + i], x, y)) return upgrade(i);
      return;
    }
    if (mode === 'result') { if (hit(BTN.cont, x, y)) fromResult(); return; }
    if (mode === 'kick') return kickNow();
    if (mode !== 'field' || !P) return;
    if (P.phase === 'call') {
      if (S.d.down === 4 && !P.go4) { if (hit(BTN.punt, x, y)) return fourth('punt'); if (hit(BTN.fg, x, y) && fgRange()) return fourth('fg'); if (hit(BTN.go, x, y)) return fourthGo(); return; }
      if (hit(BTN.pass, x, y)) return snap('pass'); if (hit(BTN.run, x, y)) return snap('run'); return;
    }
    if (P.phase !== 'live') return;
    if (P.carrier) { ptr = { x, y, x0: x, y0: y, t: 0, steer: true, at: anim }; return; }
    if (P.play === 'pass' && !P.thrown) ptr = { x, y, x0: x, y0: y, aim: true, at: anim, tap: playerAt(x, y) };
  };
  // "go for it" on 4th down: swap the kicking buttons back for a play call
  function fourthGo() { P.go4 = true; K.sfx(600, .06, 'square', .05); }
  GAME.move = (x, y) => {
    if (ptr) { ptr.x = x; ptr.y = y; }
    hover = null;
    if (mode === 'hub') { for (const k of ['play', 'prev', 'next', 'up0', 'up1', 'up2', 'up3', 'up4', 'up5', 'up6']) if (hit(BTN[k], x, y)) hover = BTN[k]; }
    else if (mode === 'result') { if (hit(BTN.cont, x, y)) hover = BTN.cont; }
    else if (P && P.phase === 'call') { for (const k of S.d.down === 4 && !P.go4 ? ['punt', 'fg', 'go'] : ['pass', 'run']) if (hit(BTN[k], x, y)) hover = BTN[k]; }
    else if (P && P.phase === 'live' && !P.thrown) hover = playerAt(x, y) || null;
    const c = document.getElementById('cv'); if (c) c.style.cursor = hover ? 'pointer' : 'default';
  };
  GAME.up = (x, y) => {
    if (!ptr) return; const p = ptr; ptr = null;
    if (p.aim) { const moved = Math.hypot(p.x0 - x, p.y0 - y); if (moved < 18 && p.tap) return throwTo(p.tap); p.x = x; p.y = y; ptr = p; const t = aimTarget(); ptr = null; if (t) throwAt(t.x, t.y); }
    else if (p.steer && anim - p.at < .22 && Math.hypot(p.x0 - x, p.y0 - y) < 14) juke();
  };
  GAME.key = (c, d) => {
    if (c === 'ArrowUp' || c === 'KeyW') keys.up = d; if (c === 'ArrowDown' || c === 'KeyS') keys.down = d;
    if (!d) return;
    if (mode === 'kick' && (c === 'Space' || c === 'Enter')) return kickNow();
    if (mode === 'result' && (c === 'Space' || c === 'Enter')) return fromResult();
    if (mode === 'hub' && (c === 'Space' || c === 'Enter')) { S.F.picked = true; return startGame(); }
    if (mode !== 'field' || !P) return;
    if (P.phase === 'call') { if (S.d.down === 4 && !P.go4) { if (c === 'KeyP') fourth('punt'); if (c === 'KeyF' && fgRange()) fourth('fg'); if (c === 'KeyG') fourthGo(); return; } if (c === 'Space' || c === 'Enter' || c === 'KeyQ') snap('pass'); if (c === 'KeyE') snap('run'); return; }
    if (P.phase === 'live') { if (c === 'Space') juke(); const i = { Digit1: 1, Digit2: 2, Digit3: 3 }[c]; if (i && P.play === 'pass' && !P.thrown) throwTo(P.off[i]); }
  };
  GAME.bot = dt => {
    if ((botT -= dt) > 0) return; botT = .25;
    if (mode === 'hub') return startGame();
    if (mode === 'result') return fromResult();
    if (mode === 'kick') { if (kick && !kick.done && Math.abs(kick.n - kick.c) < kick.w * .3) kickNow(); botT = .02; return; }
    if (mode !== 'field' || !P) return;
    if (P.phase === 'call') { if (S.d.down === 4 && !P.go4) { if (fgRange()) fourth('fg'); else if (S.d.ball < 50) fourth('punt'); else fourthGo(); return; } snap(R() < .65 ? 'pass' : 'run'); return; }
    if (P.phase !== 'live') return;
    if (P.play === 'pass' && !P.thrown && P.t > 1.1 + R() * .8) { const best = P.off.slice(1, 4).map(p => [p, near(P.def, p.x, p.y).d + (p.x - P.L) * .08]).sort((a, b) => b[1] - a[1])[0][0]; throwTo(best); return; }
    if (P.carrier) { const c = P.carrier, n = near(P.def, c.x + 2, c.y); keys.up = n.p && n.p.y > c.y && n.d < 7; keys.down = n.p && n.p.y <= c.y && n.d < 7; if (n.d < 2.4) juke(); }
  };
  GAME.pose = () => {
    posed = true; S = { F: tempF() }; S.oppI = S.F.sched[0]; startGame(); S.g.us = 21; S.g.them = 17;
    S.d.ball = 78; S.d.first = 88; presnap(); P.phase = 'live'; P.play = 'pass'; P.thrown = true;
    const w = P.off[1]; w.x = 96; w.y = 18; w.vx = 6; P.off[2].x = 92; P.off[2].y = 40; P.off[3].x = 80; P.def[0].x = 97.5; P.def[0].y = 20; P.def[2].x = 94; P.def[2].y = 24; P.def[1].x = 93; P.def[1].y = 38;
    P.ball = { x0: 74, y0: 26, tx: 97, ty: 18, t: .8, T: 1 }; cam = 70;
  };
  GAME.test = { res: () => P && P.result && P.result.text, sim: (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) { GAME.bot(dt); GAME.update(dt); } }, st: () => ({ mode, phase: P && P.phase, d: S.d, g: S.g, F: { week: S.F.week, credits: S.F.credits, rec: S.F.rec[S.F.team] } }), start: startGame, snap, throwTo: i => throwTo(P.off[i]), juke, fourth, fourthGo, kickNow };
})();
