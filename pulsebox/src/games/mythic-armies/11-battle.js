/* ---------- campaign map, the squad auto-battler (simulation + 3D view) and battle rewards ---------- */

/* ===== campaign map ===== */
RENDER.map = () => {
  const s = $('#s-map');
  s.innerHTML = '';
  const bar = el('div', 'bar');
  const cleared = Object.keys(S.campaign.cleared).length;
  bar.append(backBtn(), el('h2', 'title', 'Campaign'), el('span', 'sub', `${cleared} / ${STAGES.length} stages cleared · Army power ${fmt(armyPower())}`), el('div', 'grow'));
  const ab = el('button', 'btn small', 'Edit army'); ab.onclick = () => go('army');
  bar.appendChild(ab);
  s.appendChild(bar);
  const wrap = el('div', 'map-wrap'), sc = el('div', 'map-scroll'), cvw = el('div', 'map-canvas');
  sc.appendChild(cvw); wrap.appendChild(sc); s.appendChild(wrap);
  requestAnimationFrame(() => {
    const W = sc.clientWidth, step = 96, H = 70 + STAGES.length * step + 30;
    const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d'); x.scale(dpr, dpr);
    const pts = STAGES.map((st, i) => [W / 2 + Math.sin(i * 0.95) * Math.min(W * 0.3, 260), 60 + i * step]);
    for (let r = 0; r < 6; r++) {
      const y0 = r === 0 ? 0 : (pts[r * 4][1] + pts[r * 4 - 1][1]) / 2, y1 = r === 5 ? H : (pts[r * 4 + 4][1] + pts[r * 4 + 3][1]) / 2, fid = REGION_ORDER[r];
      x.drawImage(factionBg(fid), 0, y0, W, y1 - y0);
      x.fillStyle = 'rgba(8,6,20,0.35)'; x.fillRect(0, y0, W, y1 - y0);
      x.fillStyle = hexA(FAC[fid].light, 0.85); x.font = `900 ${W < 500 ? 15 : 20}px ${FONT_D}`;
      x.fillText(FAC[fid].region.replace('the ', 'The '), 14, y0 + 28);
      x.font = `700 12px ${FONT_U}`; x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillText(FAC[fid].name + ' lands', 14, y0 + 46);
      const gl = x.createLinearGradient(0, y1 - 20, 0, y1 + 20); gl.addColorStop(0, 'rgba(0,0,0,0)'); gl.addColorStop(0.5, 'rgba(0,0,0,0.5)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gl; x.fillRect(0, y1 - 20, W, 40);
    }
    x.setLineDash([2, 10]); x.lineCap = 'round'; x.lineWidth = 6; x.strokeStyle = 'rgba(255,236,190,0.8)';
    x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.stroke();
    cvw.appendChild(cv);
    let nextEl = null;
    STAGES.forEach((st, i) => {
      const un = stageUnlocked(st.n), cl = S.campaign.cleared[st.n];
      const nd = el('button', 'node' + (st.boss ? ' boss' : '') + (un ? '' : ' locked') + (cl ? ' cleared' : '') + (un && !cl ? ' next' : ''), `${st.n}<span class="nm">${esc(st.name)}${st.boss ? ' (Boss)' : ''}</span>`);
      nd.style.left = pts[i][0] + 'px'; nd.style.top = pts[i][1] + 'px';
      nd.onclick = () => { if (!un) { SFX.error(); toast('Clear the previous stage first'); return; } SFX.click(); stageModal(st); };
      cvw.appendChild(nd);
      if (un && !cl && !nextEl) nextEl = nd;
    });
    if (nextEl) sc.scrollTop = Math.max(0, parseFloat(nextEl.style.top) - sc.clientHeight / 2);
    else sc.scrollTop = H;
  });
};
function stagePower(st) { return st.slots.filter(Boolean).reduce((a, u) => { const c = CHAR[u.id]; return a + powerOf(statsFor(c, u.lvl, 0, u.boss), c); }, 0); }
function stageModal(st) {
  const first = !S.campaign.cleared[st.n], rw = first ? st.reward : st.repeat;
  const foes = st.slots.filter(Boolean);
  const html = `<p class="sub">${FAC[st.fac].region.replace('the ', 'The ')} · Stage ${st.n}${st.boss ? ' · BOSS' : ''}</p>
    <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:10px 0" id="foeRow"></div>
    <p>Enemy power <b>${fmt(stagePower(st))}</b> · your army <b style="color:${armyPower() >= stagePower(st) ? 'var(--good)' : 'var(--bad)'}">${fmt(armyPower())}</b></p>
    <p>${first ? 'First clear' : 'Repeat'} reward: <b>${fmt(rw.coins)} coins</b> · ${rw.essence} Essence${first && rw.pack ? ` · <b style="color:var(--gold)">${FAMILY[rw.pack.family].name} ${TIER[rw.pack.tier].name} pack</b>` : ''}</p>`;
  const can = S.army.filter(Boolean).length > 0;
  showModal({ title: esc(st.name), html, buttons: [{ t: 'Cancel' }, can ? { t: 'Fight!', cls: 'gold', fn: () => startBattle(st) } : { t: 'Build an army', cls: 'gold', fn: () => go('army') }] });
  const row = $('#foeRow');
  for (const u of foes) {
    const c = CHAR[u.id], im = el('img');
    im.style.cssText = `width:${u.boss ? 74 : 56}px;border-radius:5px;${u.boss ? 'box-shadow:0 0 0 2px #ff9ae6' : ''}`;
    im.title = `${c.name} Lv${u.lvl}`;
    cardThumb(c.id, 'std', !S.seen[c.id]).then(x => { im.src = x; });
    row.appendChild(im);
  }
}

/* ===== simulation (deterministic, fixed step; runs headless for skip-to-result) ===== */
const STEP = 1 / 30;
function makeSide(list, side) {
  const ids = list.filter(Boolean).map(u => u.id);
  const syn = synergies(ids);
  return list.map((u, slot) => {
    if (!u) return null;
    const c = CHAR[u.id], st = statsFor(c, u.lvl, u.star || 0, u.boss);
    const sy = syn.find(x => x.f.id === c.fac), tier = sy ? sy.tier : 0, k = c.fac;
    const synv = tier ? (tier === 2 ? FAC[k].syn.b : FAC[k].syn.a) : 0;
    const col = slot % 3, row = slot < 3 ? 0 : 1, sgn = side === 0 ? 1 : -1;
    const U = {
      side, slot, c, uid: u.uid, boss: !!u.boss, lvl: u.lvl,
      maxHp: Math.round(st.hp * (k === 'tide' ? 1 + synv : 1)), atk: st.atk * (k === 'ember' ? 1 + synv : 1), def: st.def * (k === 'stone' ? 1 + synv : 1),
      aspd: 0.55 + c.spd * 0.07, move: 1.3 + c.spd * 0.16, rng: c.rng < 2 ? 1.25 : c.rng * 0.95, melee: c.rng < 2,
      regen: k === 'wild' ? synv : 0, steal: k === 'gloom' ? synv : 0, emul: k === 'star' ? 1 + synv : 1,
      x: (col - 1) * 2.4 * sgn, z: sgn * (row ? 4.6 : 2.2), energy: 0, cd: 0.3 + Math.random() * 0.4, tgt: null, alive: true,
      shield: 0, stun: 0, slow: 0, taunt: 0, tauntBy: null, buff: 0, buffT: 0, dr: 0, drT: 0, dots: [], dmg: 0, heal: 0, anim: 'idle', animT: 0, animD: 1, rad: u.boss ? 0.9 : 0.55
    };
    U.hp = U.maxHp;
    const P = c.pas;
    if (P) {
      if (P.k === 'swift') U.energy = P.m * 100;
      if (P.k === 'bulwark') U.shield = U.maxHp * P.m;
    }
    return U;
  }).filter(Boolean);
}
function newBattle(stage) {
  const mine = S.army.map(uid => { if (!uid) return null; const inst = cardByUid(uid); if (!inst) return null; const u = unitOf(uid); return { id: inst.charId, lvl: u.lvl, star: u.star, uid }; });
  const B = { stage, t: 0, units: [], projs: [], fx: [], over: false, winner: -1, pend: [] };
  B.units = makeSide(mine, 0).concat(makeSide(stage.slots, 1));
  return B;
}
const alive = (B, side) => B.units.filter(u => u.alive && (side == null || u.side === side));
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
function nearest(B, u, side, pred) { let best = null, bd = 1e9; for (const o of B.units) if (o.alive && o.side === side && (!pred || pred(o))) { const d = dist(u, o) + (o.side !== u.side && o.slot >= 3 ? 0.8 : 0); if (d < bd) { bd = d; best = o; } } return best; }
function emit(B, e) { if (B.fx) B.fx.push(e); }
function hurt(B, src, tgt, amt, o) {
  if (!tgt.alive) return 0;
  o = o || {};
  if (!o.dot && tgt.c.pas && tgt.c.pas.k === 'dodge' && Math.random() < tgt.c.pas.m) { emit(B, { t: 'txt', u: tgt, s: 'Dodge', cls: 'sh' }); return 0; }
  let crit = false;
  if (!o.dot && src && src.c.pas && src.c.pas.k === 'crit' && Math.random() < src.c.pas.m) { amt *= 1.9; crit = true; }
  amt *= 100 / (100 + tgt.def * 1.4);
  if (tgt.drT > 0) amt *= 1 - tgt.dr;
  amt = Math.max(1, Math.round(amt * (0.92 + Math.random() * 0.16)));
  let rest = amt;
  if (tgt.shield > 0) { const a = Math.min(tgt.shield, rest); tgt.shield -= a; rest -= a; }
  tgt.hp -= rest;
  tgt.energy = Math.min(100, tgt.energy + 4 * tgt.emul);
  if (src) {
    src.dmg += amt;
    const ls = (src.c.pas && src.c.pas.k === 'lifesteal' ? src.c.pas.m : 0) + src.steal;
    if (ls > 0 && src.alive) healUnit(B, src, src, amt * ls, true);
    if (o.melee && tgt.c.pas && tgt.c.pas.k === 'thorns' && src.alive) { src.hp -= amt * tgt.c.pas.m; tgt.dmg += amt * tgt.c.pas.m; if (src.hp <= 0) kill(B, src); }
  }
  emit(B, { t: 'dmg', u: tgt, n: amt, crit, dot: o.dot });
  if (tgt.hp <= 0) kill(B, tgt);
  return amt;
}
function healUnit(B, src, tgt, amt, quiet) {
  if (!tgt.alive) return;
  const a = Math.round(Math.min(tgt.maxHp - tgt.hp, amt));
  if (a <= 0) return;
  tgt.hp += a; src.heal += a;
  if (!quiet || a > 20) emit(B, { t: 'heal', u: tgt, n: a });
}
function kill(B, u) { if (!u.alive) return; u.alive = false; u.hp = 0; emit(B, { t: 'die', u }); }
function setAnim(u, a, d) { u.anim = a; u.animT = 0; u.animD = d; }
function cast(B, u) {
  const A = u.c.act, m = A.m, foes = alive(B, 1 - u.side), pals = alive(B, u.side);
  if (!foes.length) return false;
  let tgt = u.tgt && u.tgt.alive ? u.tgt : nearest(B, u, 1 - u.side);
  const atk = u.atk * (1 + u.buff);
  emit(B, { t: 'cast', u, name: A.name, k: A.k });
  setAnim(u, 'cast', 0.6);
  const area = (cx, cz, r, fn) => { for (const f of foes) if (Math.hypot(f.x - cx, f.z - cz) <= r + f.rad) fn(f); };
  switch (A.k) {
    case 'strike': hurt(B, u, tgt, atk * m, { melee: u.melee }); emit(B, { t: 'slash', u: tgt, big: true }); break;
    case 'cleave': area(u.x, u.z, 2.3, f => hurt(B, u, f, atk * m, { melee: true })); emit(B, { t: 'ring', x: u.x, z: u.z, r: 2.3 }); break;
    case 'blast': B.projs.push({ from: u, to: tgt, x: u.x, z: u.z, y: 1, sp: 9, k: 'blast', dmg: atk * m, big: true }); break;
    case 'volley': for (let i = 0; i < 4; i++) { const f = foes[Math.floor(Math.random() * foes.length)]; B.projs.push({ from: u, to: f, x: u.x, z: u.z, y: 1, sp: 13 + i, k: 'shot', dmg: atk * m, delay: i * 0.12 }); } break;
    case 'snipe': { const w = foes.reduce((a, b) => (b.hp < a.hp ? b : a)); B.projs.push({ from: u, to: w, x: u.x, z: u.z, y: 1, sp: 20, k: 'shot', dmg: atk * m, big: true }); break; }
    case 'heal': { const w = pals.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); healUnit(B, u, w, atk * m); emit(B, { t: 'glow', u: w, col: '#8affb0' }); break; }
    case 'mend': for (const p of pals) { healUnit(B, u, p, atk * m); emit(B, { t: 'glow', u: p, col: '#8affb0' }); } break;
    case 'shield': { const w = pals.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a)); w.shield += atk * m; emit(B, { t: 'shield', u: w }); break; }
    case 'ward': for (const p of pals) { p.shield += atk * m; emit(B, { t: 'shield', u: p }); } break;
    case 'rally': for (const p of pals) { p.buff = m; p.buffT = 6; emit(B, { t: 'glow', u: p, col: '#ffd070' }); } break;
    case 'taunt': for (const f of foes) if (dist(f, u) < 4.5) { f.tauntBy = u; f.taunt = 4; f.tgt = u; } u.dr = m; u.drT = 4; emit(B, { t: 'ring', x: u.x, z: u.z, r: 4.5, col: '#ffb060' }); emit(B, { t: 'shield', u }); break;
    case 'stun': hurt(B, u, tgt, atk * m, { melee: u.melee }); tgt.stun = 1.6; emit(B, { t: 'slash', u: tgt, big: true }); emit(B, { t: 'txt', u: tgt, s: 'Stunned', cls: 'sh' }); break;
    case 'quake': area(u.x, u.z, 2.6, f => { hurt(B, u, f, atk * m, { melee: true }); f.stun = 1.0; }); emit(B, { t: 'ring', x: u.x, z: u.z, r: 2.6, col: '#d8b080' }); break;
    case 'drain': { const d = hurt(B, u, tgt, atk * m, {}); healUnit(B, u, u, d * 0.6); emit(B, { t: 'beam', a: u, b: tgt, col: '#c08aff' }); break; }
    case 'leap': { const w = foes.reduce((a, b) => (b.hp < a.hp ? b : a)); const a2 = Math.atan2(u.x - w.x, u.z - w.z); u.x = w.x + Math.sin(a2) * 1.1; u.z = w.z + Math.cos(a2) * 1.1; u.tgt = w; emit(B, { t: 'leap', u }); hurt(B, u, w, atk * m, { melee: true }); emit(B, { t: 'slash', u: w, big: true }); break; }
    case 'dot': tgt.dots.push({ dps: atk * m / 5, t: 5, src: u }); B.projs.push({ from: u, to: tgt, x: u.x, z: u.z, y: 1, sp: 14, k: 'shot', dmg: 0 }); emit(B, { t: 'txt', u: tgt, s: 'Afflicted', cls: '' }); break;
    case 'burn': B.projs.push({ from: u, to: tgt, x: u.x, z: u.z, y: 1, sp: 9, k: 'burn', dmg: atk * m, big: true }); break;
    case 'slow': B.projs.push({ from: u, to: tgt, x: u.x, z: u.z, y: 1, sp: 10, k: 'slow', dmg: atk * m, big: true }); break;
  }
  return true;
}
function landProj(B, p) {
  const t = p.to, foes = alive(B, 1 - p.from.side);
  if (p.k === 'blast' || p.k === 'burn' || p.k === 'slow') {
    const r = p.k === 'burn' ? 2 : 1.9;
    for (const f of foes) if (Math.hypot(f.x - p.x, f.z - p.z) <= r + f.rad) {
      if (p.k === 'burn') f.dots.push({ dps: p.dmg / 4, t: 4, src: p.from });
      else { hurt(B, p.from, f, p.dmg, {}); if (p.k === 'slow') f.slow = 3; }
    }
    emit(B, { t: 'ring', x: p.x, z: p.z, r, col: p.k === 'slow' ? '#8ae0ff' : p.k === 'burn' ? '#ff9a3a' : null, src: p.from });
  } else if (p.dmg > 0 && t.alive) hurt(B, p.from, t, p.dmg, {});
}
function stepBattle(B) {
  const dt = STEP;
  B.t += dt;
  for (const u of B.units) {
    if (!u.alive) continue;
    u.animT += dt;
    if (u.animT > u.animD && u.anim !== 'walk') u.anim = 'idle';
    for (let i = u.dots.length - 1; i >= 0; i--) { const d = u.dots[i]; d.t -= dt; hurt(B, d.src, u, d.dps * dt, { dot: true }); if (d.t <= 0 || !u.alive) u.dots.splice(i, 1); }
    if (!u.alive) continue;
    const rg = u.regen + (u.c.pas && u.c.pas.k === 'regen' ? u.c.pas.m : 0);
    if (rg) healUnit(B, u, u, u.maxHp * rg * dt, true);
    u.buffT -= dt; if (u.buffT <= 0) u.buff = 0;
    u.drT -= dt; u.taunt -= dt; u.slow -= dt;
    if (u.stun > 0) { u.stun -= dt; continue; }
    u.energy = Math.min(100, u.energy + dt * 5 * u.emul);
    if (u.energy >= 100) { if (cast(B, u)) { u.energy = 0; continue; } }
    if (u.taunt > 0 && u.tauntBy && u.tauntBy.alive) u.tgt = u.tauntBy;
    if (!u.tgt || !u.tgt.alive || (B.t % 1.5 < dt && !u.melee)) u.tgt = nearest(B, u, 1 - u.side);
    const t = u.tgt;
    if (!t) continue;
    const d = dist(u, t), reach = u.rng + u.rad + t.rad;
    if (d > reach) {
      const sp = u.move * (u.slow > 0 ? 0.6 : 1) * dt;
      let vx = (t.x - u.x) / d, vz = (t.z - u.z) / d;
      for (const o of B.units) if (o !== u && o.alive) { const dd = dist(u, o); if (dd < u.rad + o.rad + 0.3 && dd > 0.001) { vx += (u.x - o.x) / dd * 0.8; vz += (u.z - o.z) / dd * 0.8; } }
      const l = Math.hypot(vx, vz) || 1;
      u.x += vx / l * sp; u.z += vz / l * sp;
      if (u.anim === 'idle') u.anim = 'walk';
    } else {
      if (u.anim === 'walk') u.anim = 'idle';
      u.cd -= dt * (u.c.pas && u.c.pas.k === 'fury' && u.hp < u.maxHp / 2 ? 1 + u.c.pas.m : 1);
      if (u.cd <= 0) {
        u.cd = 1 / u.aspd;
        setAnim(u, 'atk', Math.min(0.55, u.cd * 0.8));
        u.energy = Math.min(100, u.energy + 16 * u.emul);
        const dmg = u.atk * (1 + u.buff);
        if (u.melee) B.pend.push({ at: B.t + 0.22, u, t, dmg });
        else B.projs.push({ from: u, to: t, x: u.x, z: u.z, y: 1, sp: 12, k: 'shot', dmg });
      }
    }
    u.x = clamp(u.x, -9, 9); u.z = clamp(u.z, -8, 8);
  }
  for (let i = B.pend.length - 1; i >= 0; i--) { const p = B.pend[i]; if (B.t >= p.at) { B.pend.splice(i, 1); if (p.u.alive && p.t.alive) { hurt(B, p.u, p.t, p.dmg, { melee: true }); emit(B, { t: 'slash', u: p.t }); } } }
  for (let i = B.projs.length - 1; i >= 0; i--) {
    const p = B.projs[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    const tx = p.to.x, tz = p.to.z, d = Math.hypot(tx - p.x, tz - p.z), st = p.sp * dt;
    if (d <= st + 0.2) { p.x = tx; p.z = tz; B.projs.splice(i, 1); landProj(B, p); }
    else { p.x += (tx - p.x) / d * st; p.z += (tz - p.z) / d * st; }
  }
  const a0 = alive(B, 0).length, a1 = alive(B, 1).length;
  if (!a0 || !a1 || B.t > 100) {
    B.over = true;
    if (!a1 && a0) B.winner = 0; else if (!a0) B.winner = 1;
    else { const hp = s => alive(B, s).reduce((a, u) => a + u.hp / u.maxHp, 0); B.winner = hp(0) > hp(1) ? 0 : 1; }
  }
}

/* ===== battle view ===== */
const BT = { B: null, speed: 1, acc: 0, done: false, leave: null };
const ARENA_THEME = {
  ember: { sky: ['#14040a', '#4a1208', '#a03a10'], fog: 0x3a1008, g1: '#2a1a18', g2: '#4a2a20', line: '#ff6a1a', prop: 'rock', pc: ['#3a2a28', '#5a3a30'], glow: '#ff7a2a' },
  wild: { sky: ['#06180e', '#1a5a32', '#7ab85a'], fog: 0x1a4a2a, g1: '#2e5a2a', g2: '#4a7a36', line: '#d8ff6a', prop: 'tree', pc: ['#2a5a2a', '#3a7a3a'], glow: '#d8ff6a' },
  stone: { sky: ['#14121e', '#4a3a4a', '#c89a6a'], fog: 0x3a3040, g1: '#4a4448', g2: '#6a625e', line: '#7fe0ff', prop: 'crystal', pc: ['#5a545a', '#7a7068'], glow: '#7fe0ff' },
  tide: { sky: ['#021428', '#0a4a7a', '#3ac0d0'], fog: 0x0a3a5a, g1: '#b8a070', g2: '#d8c090', line: '#ff8a8a', prop: 'coral', pc: ['#e07a6a', '#ff9a8a'], glow: '#7affff' },
  star: { sky: ['#04041a', '#1a1a5a', '#5a4aa8'], fog: 0x1a1a4a, g1: '#2a2a5a', g2: '#3a3a7a', line: '#fff2a8', prop: 'crystal', pc: ['#8a8ad8', '#c8c8ff'], glow: '#fff2a8' },
  gloom: { sky: ['#060410', '#20123a', '#3a5a4a'], fog: 0x1a1428, g1: '#26202e', g2: '#3a3044', line: '#7dffb8', prop: 'grave', pc: ['#5a5466', '#3a3444'], glow: '#7dffb8' }
};
function groundTexture(th) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const x = cv.getContext('2d'), R = rng(hashStr(th.g1));
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); g.addColorStop(0, th.g2); g.addColorStop(1, th.g1);
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + R() * 0.05})`; x.beginPath(); x.arc(R() * 512, R() * 512, 2 + R() * 10, 0, 7); x.fill(); }
  x.strokeStyle = hexA(th.line, 0.35); x.lineWidth = 3;
  for (let i = 0; i < 9; i++) { x.beginPath(); let px = R() * 512, py = R() * 512; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 80; py += (R() - 0.5) * 80; x.lineTo(px, py); } x.stroke(); }
  x.strokeStyle = 'rgba(255,240,200,0.25)'; x.lineWidth = 4; x.setLineDash([12, 10]);
  x.beginPath(); x.moveTo(40, 256); x.lineTo(472, 256); x.stroke();
  x.setLineDash([]); x.beginPath(); x.arc(256, 256, 236, 0, 7); x.stroke();
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return t;
}
function makeBattleScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 120);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x302030, 0.85);
  const key = new THREE.DirectionalLight(0xfff0d8, 1.3); key.position.set(-6, 12, 8);
  const rim = new THREE.DirectionalLight(0x8af0ff, 0.9); rim.position.set(6, 5, -10);
  scene.add(hemi, key, rim);
  const V = { scene, camera, live: true, hemi, rim, arena: null, models: new Map(), hp: new Map(), shields: new Map(), projM: [], rings: [], slashes: [], labels: [], P: null };
  const shadowTex = glowTexture();
  V.shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false });
  V.shadowGeo = new THREE.PlaneGeometry(1, 1); V.shadowGeo.rotateX(-Math.PI / 2);
  V.projGeo = new THREE.SphereGeometry(0.16, 8, 6);
  V.glowGeo = new THREE.PlaneGeometry(1, 1);
  V.ringGeo = new THREE.RingGeometry(0.85, 1, 40); V.ringGeo.rotateX(-Math.PI / 2);
  V.slashGeo = new THREE.TorusGeometry(0.6, 0.05, 4, 16, Math.PI * 0.9);
  V.bubbleGeo = new THREE.SphereGeometry(1, 16, 12);
  V.matCache = {};
  V.mat = (col, add) => { const k = col + (add ? 'a' : ''); return V.matCache[k] || (V.matCache[k] = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); };
  V.resize = (w, h) => { camera.aspect = w / h; camera.fov = h > w ? 62 : 42; camera.updateProjectionMatrix(); };
  return V;
}
function buildArena(V, fac) {
  if (V.arena) { V.scene.remove(V.arena.g); V.arena.dispose(); }
  const th = ARENA_THEME[fac], g = new THREE.Group(), disp = [];
  V.scene.background = gradientTexture(th.sky); disp.push(V.scene.background);
  V.scene.fog = new THREE.Fog(th.fog, 18, 46);
  const gt = groundTexture(th); disp.push(gt);
  const gm = new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95, metalness: 0 }); disp.push(gm);
  const gg = new THREE.CircleGeometry(13, 48); gg.rotateX(-Math.PI / 2); disp.push(gg);
  g.add(new THREE.Mesh(gg, gm));
  const K = new Kit(), R = rng(hashStr(fac) + 3);
  K.add('root', 'cyl', th.g1, [0, -0.6, 0], [26.5, 1.1, 26.5]);
  for (let i = 0; i < 38; i++) {
    const a = Math.PI * (1.05 + R() * 0.9) + (R() < 0.3 ? (R() < 0.5 ? -0.5 : 0.5) : 0), r = 13.5 + R() * 9, px = Math.cos(a) * r, pz = Math.sin(a) * r * 0.9 - 1, s = 0.7 + R() * 1.4;
    const c = pick(R, th.pc);
    if (th.prop === 'tree') { K.add('root', 'cyl', '#5a3a22', [px, s * 0.8, pz], [0.4 * s, 1.6 * s, 0.4 * s]); K.add('root', 'cone', c, [px, s * 2.4, pz], [2.2 * s, 2.8 * s, 2.2 * s]); K.add('root', 'cone', pick(R, th.pc), [px, s * 3.6, pz], [1.6 * s, 2 * s, 1.6 * s]); }
    else if (th.prop === 'coral') { for (let k = 0; k < 3; k++) K.add('root', 'cyl', c, [px + (k - 1) * 0.3 * s, s * 0.9, pz], [0.25 * s, 1.8 * s, 0.25 * s], [0, 0, (k - 1) * 0.5]); K.add('root', 'sph', '#e8d8b0', [px + s, 0.3, pz], [0.8 * s, 0.4 * s, 0.6 * s]); }
    else if (th.prop === 'grave') { if (R() < 0.5) { K.add('root', 'box', c, [px, 0.6 * s, pz], [0.9 * s, 1.3 * s, 0.25 * s], [0, a, (R() - 0.5) * 0.3]); } else { K.add('root', 'cyl', '#2a2030', [px, s * 1.2, pz], [0.2 * s, 2.6 * s, 0.2 * s], [0, 0, (R() - 0.5) * 0.4]); K.add('root', 'cyl', '#2a2030', [px + 0.4 * s, s * 2.1, pz], [0.1 * s, 1.2 * s, 0.1 * s], [0, 0, -0.9]); } }
    else if (th.prop === 'crystal' && R() < 0.4) K.add('root', 'oct', th.glow, [px, s * 0.9, pz], [0.6 * s, 2.4 * s, 0.6 * s], [0, a, (R() - 0.5) * 0.3], 'g');
    else K.add('root', 'dod', c, [px, s * 0.3, pz], [1.6 * s, 1.2 * s, 1.5 * s], [R(), R(), R()]);
  }
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.add('root', 'oct', th.glow, [Math.cos(a) * 12.2, 0.3, Math.sin(a) * 12.2], [0.3, 0.7, 0.3], [0, a, 0], 'g'); }
  const def = kitToDef(K);
  for (const p of def.parts) for (const k in p.geos) g.add(new THREE.Mesh(p.geos[k], k === 'l' ? MAT.lit : MAT.glow));
  const stars = fac === 'star' || fac === 'gloom' ? starField(250, 40, 0.3, ['#ffffff', th.glow]) : null;
  if (stars) { g.add(stars); disp.push(stars.geometry, stars.material); }
  V.rim.color.set(th.glow);
  V.scene.add(g);
  V.arena = { g, dispose() { disposeDef(def); disp.forEach(d => d.dispose()); } };
}
function startBattle(stage) {
  if (BT.B) BT.leave();
  cleanArmy();
  if (!S.army.some(Boolean)) { go('army'); return; }
  BT.B = newBattle(stage);
  BT.stage = stage; BT.done = false; BT.acc = 0; BT.resultShown = false;
  go('battle');
  const V = SC.all.battle;
  buildArena(V, stage.fac);
  for (const u of BT.B.units) {
    const m = makeModel(u.c.id, { scale: u.boss ? 1.55 : 1 });
    const fit = Math.min(1, 2.3 / m.userData.h) * (u.boss ? 1.4 : 1);
    m.scale.setScalar(fit);
    m.userData.fit = fit;
    m.position.set(u.x, 0, u.z);
    m.rotation.y = u.side === 0 ? Math.PI : 0;
    const sh = new THREE.Mesh(V.shadowGeo, V.shadowMat); sh.scale.setScalar(Math.max(1.2, m.userData.w * fit * 1.1)); sh.position.y = 0.02; m.add(sh);
    V.scene.add(m);
    V.models.set(u, m);
    const hb = el('div', 'hp' + (u.side ? ' foe' : ''), '<s></s><i></i><u></u>');
    if (u.boss) hb.style.width = '96px';
    $('#labels').appendChild(hb);
    V.hp.set(u, hb);
  }
  V.P = new Particles(260, 'motes'); V.P.k = 2.4; V.scene.add(V.P.pts);
  const s = $('#s-battle');
  const mine = synergies(BT.B.units.filter(u => u.side === 0).map(u => u.c.id)).filter(x => x.tier);
  s.innerHTML = `<div class="b-hud"><button class="back" id="btQuit" aria-label="Leave battle">‹</button><div class="vs">Stage ${stage.n} · ${esc(stage.name)}${stage.boss ? ' · BOSS' : ''}<div class="sub" style="font:700 11px var(--fu)">${mine.map(x => x.f.name + ' ' + synText(x)).join(' · ') || 'No faction bonus active'}</div></div><button class="btn small" id="btSpeed">1x</button><button class="btn small" id="btSkip">Skip ›</button></div>`;
  $('#btQuit').onclick = () => showModal({ title: 'Leave the battle?', html: '<p>Leaving counts as a defeat.</p>', buttons: [{ t: 'Keep fighting' }, { t: 'Leave', fn: () => { if (!BT.done) { BT.B.over = true; BT.B.winner = 1; finishBattle(); } } }] });
  $('#btSpeed').onclick = () => { BT.speed = BT.speed === 1 ? 2 : 1; $('#btSpeed').textContent = BT.speed + 'x'; SFX.soft(); };
  $('#btSpeed').textContent = BT.speed + 'x';
  $('#btSkip').onclick = () => { SFX.whoosh(); skipBattle(); };
  SFX.whoosh();
  BT.intro = 1.2;
}
function skipBattle() {
  const B = BT.B;
  if (!B || BT.done) return;
  const fx = B.fx; B.fx = null;
  let n = 0;
  while (!B.over && n++ < 9000) stepBattle(B);
  B.fx = fx; B.fx.length = 0;
  finishBattle();
}
BT.leave = () => {
  const V = SC.all.battle;
  if (!V) return;
  for (const m of V.models.values()) releaseModel(m);
  V.models.clear();
  for (const h of V.hp.values()) h.remove();
  V.hp.clear();
  for (const b of V.shields.values()) { V.scene.remove(b); b.material.dispose(); }
  V.shields.clear();
  for (const p of V.projM) V.scene.remove(p);
  V.projM = [];
  for (const r of V.rings) { V.scene.remove(r.m); r.m.material.dispose(); }
  V.rings = [];
  for (const sl of V.slashes) { V.scene.remove(sl.m); sl.m.material.dispose(); }
  V.slashes = [];
  for (const l of V.labels) l.el.remove();
  V.labels = [];
  if (V.P) { V.scene.remove(V.P.pts); V.P.dispose(); V.P = null; }
  if (V.arena) { V.scene.remove(V.arena.g); V.arena.dispose(); V.arena = null; }
  BT.B = null;
};
const _p = new THREE.Vector3();
function toScreen(x, y, z, cam) { _p.set(x, y, z).project(cam); return [(_p.x + 1) / 2 * GFX.w, (1 - _p.y) / 2 * GFX.h, _p.z < 1]; }
function battleLabel(V, u, txt, cls, yOff) {
  const e = el('div', cls, txt);
  $('#labels').appendChild(e);
  V.labels.push({ el: e, u, x: u.x + (Math.random() - 0.5) * 0.5, z: u.z, y: (V.models.get(u) ? V.models.get(u).userData.h * V.models.get(u).userData.fit : 2) + (yOff || 0.3), t: 0, d: cls.includes('castlbl') ? 1.3 : 0.9 });
  if (V.labels.length > 40) { const o = V.labels.shift(); o.el.remove(); }
}
function battleFx(V, e) {
  const B = BT.B, P = V.P;
  const mh = u => { const m = V.models.get(u); return m ? m.userData.h * m.userData.fit : 2; };
  const fcol = u => FAC[u.c.fac].glow;
  switch (e.t) {
    case 'dmg': if (!e.dot || e.n >= 8) battleLabel(V, e.u, e.n, 'dmg' + (e.crit ? ' crit' : '')); { const m = V.models.get(e.u); if (m && !e.dot) m.userData.hitT = 0.18; } if (!e.dot && Math.random() < 0.5) SFX.hit(); break;
    case 'heal': battleLabel(V, e.u, '+' + e.n, 'dmg heal'); for (let i = 0; i < 6; i++) P.emit(e.u.x + (Math.random() - 0.5), Math.random() * mh(e.u), e.u.z + (Math.random() - 0.5), 0, 1.5, 0, '#8affb0', 30, 0.9, 0); SFX.heal(); break;
    case 'txt': battleLabel(V, e.u, e.s, 'dmg ' + (e.cls || ''), 0.6); break;
    case 'cast': battleLabel(V, e.u, '◆ ' + e.name, 'castlbl', 0.9); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; P.emit(e.u.x + Math.cos(a) * 0.8, 0.2, e.u.z + Math.sin(a) * 0.8, 0, 2.2, 0, fcol(e.u), 34, 0.7, 0); } SFX.magic(); break;
    case 'die': { const m = V.models.get(e.u); if (m) m.userData.dieT = 0; for (let i = 0; i < 20; i++) P.emit(e.u.x, 0.5 + Math.random(), e.u.z, (Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3, fcol(e.u), 30, 1, -2); SFX.death(); const hb = V.hp.get(e.u); if (hb) hb.style.display = 'none'; break; }
    case 'ring': { const col = e.col || (e.src ? fcol(e.src) : '#ffffff'); const m = new THREE.Mesh(V.ringGeo, V.mat(col).clone()); m.position.set(e.x, 0.08, e.z); V.scene.add(m); V.rings.push({ m, r: e.r, t: 0 }); SFX.aoe(); break; }
    case 'slash': { const m = new THREE.Mesh(V.slashGeo, V.mat(e.big ? '#fff2a8' : '#ffffff').clone()); const h = mh(e.u); m.position.set(e.u.x, h * 0.55, e.u.z); m.rotation.set(Math.random() * 0.6, Math.random() * 3, Math.random() * 3); m.scale.setScalar(e.big ? 1.6 : 1); V.scene.add(m); V.slashes.push({ m, t: 0 }); if (Math.random() < 0.6) SFX.slash(); break; }
    case 'shield': { V.shields.has(e.u) || (() => { const b = new THREE.Mesh(V.bubbleGeo, V.mat('#5ac8ff').clone()); b.material.opacity = 0.22; V.scene.add(b); V.shields.set(e.u, b); })(); SFX.shield(); break; }
    case 'glow': for (let i = 0; i < 10; i++) P.emit(e.u.x + (Math.random() - 0.5) * 0.8, Math.random() * mh(e.u), e.u.z + (Math.random() - 0.5) * 0.8, 0, 1.2, 0, e.col, 34, 1, 0); break;
    case 'beam': for (let i = 0; i < 12; i++) { const k = i / 12; P.emit(lerp(e.b.x, e.a.x, k), 1 + Math.sin(k * 3) * 0.4, lerp(e.b.z, e.a.z, k), 0, 0.5, 0, e.col, 30, 0.6, 0); } break;
    case 'leap': for (let i = 0; i < 12; i++) P.emit(e.u.x, 0.3, e.u.z, (Math.random() - 0.5) * 4, 2, (Math.random() - 0.5) * 4, '#ffffff', 26, 0.5, -3); SFX.whoosh(); break;
  }
}
function battleView(dt, t) {
  const V = SC.all.battle, B = BT.B;
  if (!B) return;
  const cam = V.camera, portrait = GFX.h > GFX.w;
  const intro = BT.intro > 0 ? BT.intro : 0;
  if (intro) BT.intro -= dt;
  cam.position.set(Math.sin(t * 0.1) * 1.0, (portrait ? 15 : 8.6) + intro * 4, (portrait ? 13 : 12.2) + intro * 6);
  cam.lookAt(0, 0.6, portrait ? 0.8 : 1.0);
  if (!BT.done && !intro) {
    BT.acc += dt * BT.speed;
    let n = 0;
    while (BT.acc >= STEP && n < 8) { stepBattle(B); BT.acc -= STEP; n++; }
    if (B.over) finishBattle();
  }
  if (B.fx) { for (const e of B.fx) battleFx(V, e); B.fx.length = 0; }
  for (const u of B.units) {
    const m = V.models.get(u);
    if (!m) continue;
    const U = m.userData;
    if (u.alive || U.dieT != null) {
      m.position.x += (u.x - m.position.x) * Math.min(1, dt * 12);
      m.position.z += (u.z - m.position.z) * Math.min(1, dt * 12);
      const tg = u.tgt && u.tgt.alive ? u.tgt : null;
      if (tg && u.alive) { const want = Math.atan2(tg.x - u.x, tg.z - u.z); let d = want - m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); m.rotation.y += d * Math.min(1, dt * 8); }
    }
    const st = u.alive ? (u.stun > 0 ? 'idle' : u.anim) : 'idle';
    animModel(m, t * (BT.speed === 2 ? 1.5 : 1), st, u.animD ? clamp(u.animT / u.animD, 0, 1) : 0);
    if (U.hitT > 0) { U.hitT -= dt; U.inner.scale.set(1 + U.hitT * 0.8, 1 - U.hitT * 0.6, 1 + U.hitT * 0.8); } else U.inner.scale.set(1, 1, 1);
    if (U.dieT != null) {
      U.dieT += dt;
      U.inner.rotation.z = Math.min(1.4, U.dieT * 3);
      m.position.y = -Math.max(0, U.dieT - 0.5) * 1.2;
      if (U.dieT > 1.6) { m.visible = false; }
    }
    const hb = V.hp.get(u);
    if (hb && u.alive && !BT.resultShown) {
      const [sx, sy, vis] = toScreen(m.position.x, U.h * U.fit + 0.35, m.position.z, cam);
      hb.style.transform = `translate(${sx}px,${sy}px)`;
      hb.style.display = vis ? '' : 'none';
      hb.children[1].style.width = (u.hp / u.maxHp * 100) + '%';
      hb.children[0].style.width = Math.min(100, u.shield / u.maxHp * 100) + '%';
      hb.children[2].style.width = u.energy + '%';
    }
    const bub = V.shields.get(u);
    if (bub) { if (u.shield > 1 && u.alive) { bub.visible = true; const r = Math.max(0.8, U.w * U.fit * 0.6); bub.scale.set(r, U.h * U.fit * 0.6, r); bub.position.set(m.position.x, U.h * U.fit * 0.45, m.position.z); } else bub.visible = false; }
  }
  let pi = 0;
  for (const p of B.projs) {
    if (p.delay > 0) continue;
    let m = V.projM[pi];
    if (!m) { m = new THREE.Mesh(V.projGeo, V.mat('#ffffff')); V.scene.add(m); V.projM.push(m); }
    m.visible = true;
    m.material = V.mat(p.k === 'slow' ? '#8ae0ff' : p.k === 'burn' ? '#ff9a3a' : FAC[p.from.c.fac].glow);
    m.position.set(p.x, 1.1, p.z); m.scale.setScalar(p.big ? 2 : 1);
    if (Math.random() < 0.5) V.P.emit(p.x, 1.1, p.z, 0, 0, 0, FAC[p.from.c.fac].glow, p.big ? 40 : 20, 0.3, 0);
    pi++;
  }
  for (; pi < V.projM.length; pi++) V.projM[pi].visible = false;
  for (let i = V.rings.length - 1; i >= 0; i--) { const r = V.rings[i]; r.t += dt; const k = r.t / 0.5; r.m.scale.setScalar(r.r * easeOut(Math.min(1, k))); r.m.material.opacity = 1 - k; if (k >= 1) { V.scene.remove(r.m); r.m.material.dispose(); V.rings.splice(i, 1); } }
  for (let i = V.slashes.length - 1; i >= 0; i--) { const s2 = V.slashes[i]; s2.t += dt; s2.m.rotation.z += dt * 14; s2.m.material.opacity = 1 - s2.t / 0.25; if (s2.t > 0.25) { V.scene.remove(s2.m); s2.m.material.dispose(); V.slashes.splice(i, 1); } }
  for (let i = V.labels.length - 1; i >= 0; i--) {
    const l = V.labels[i]; l.t += dt;
    const [sx, sy] = toScreen(l.x, l.y + l.t * 1.2, l.z, cam);
    l.el.style.transform = `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(${l.t < 0.1 ? 0.6 + l.t * 4 : 1})`;
    l.el.style.opacity = l.t > l.d * 0.6 ? 1 - (l.t - l.d * 0.6) / (l.d * 0.4) : 1;
    if (l.t > l.d) { l.el.remove(); V.labels.splice(i, 1); }
  }
  V.P.update(dt);
}
function finishBattle() {
  if (BT.done) return;
  BT.done = true;
  const B = BT.B, st = BT.stage, win = B.winner === 0;
  const mine = B.units.filter(u => u.side === 0);
  const first = win && !S.campaign.cleared[st.n];
  const rw = win ? (first ? st.reward : st.repeat) : { coins: 10, essence: 3 };
  S.stats.battles++; if (win) S.stats.wins++;
  const dmg = mine.reduce((a, u) => a + u.dmg, 0);
  S.stats.damage += dmg;
  questEvent('battle', 1); questEvent('dmg', Math.round(dmg));
  if (win) { questEvent('win', 1); const cnt = {}; for (const u of mine) cnt[u.c.fac] = (cnt[u.c.fac] || 0) + 1; if (Object.values(cnt).some(n => n >= 3)) questEvent('facwin', 1); }
  S.coins += rw.coins; S.essence += rw.essence;
  let packMsg = '';
  if (first) { S.campaign.cleared[st.n] = Date.now(); if (rw.pack) { addPack(rw.pack.family, rw.pack.tier, 'reward'); packMsg = `${FAMILY[rw.pack.family].name} ${TIER[rw.pack.tier].name} pack`; } }
  const xp = win ? 30 + st.n * 3 : 12 + st.n;
  const ups = [];
  for (const u of mine) { const before = unitOf(u.uid).lvl, n = addXp(u.uid, xp); if (n) ups.push(`${u.c.short} Lv ${before} → ${before + n}`); }
  saveNow();
  refreshCurrency();
  const mvp = mine.slice().sort((a, b) => (b.dmg + b.heal * 0.8) - (a.dmg + a.heal * 0.8))[0];
  setTimeout(() => {
    if (UI.screen !== 'battle') return;
    const V = SC.all.battle;
    BT.resultShown = true;
    for (const h of V.hp.values()) h.style.display = 'none';
    for (const l of V.labels) l.el.remove();
    V.labels = [];
    win ? SFX.win() : SFX.lose();
    const s = $('#s-battle');
    const box = el('div', 'result');
    box.innerHTML = `<div class="res-box panel"><div class="res-title ${win ? 'win' : 'lose'}">${win ? 'VICTORY' : 'DEFEAT'}</div>
      <div class="sub">Stage ${st.n} · ${esc(st.name)}${first ? ' · First clear!' : ''}</div>
      ${mvp ? `<div class="mvp"><img id="mvpImg" alt=""><div style="text-align:left"><span class="tag" style="color:var(--gold)">MVP</span><div style="font:900 18px var(--fd)">${esc(mvp.c.name)}</div><div class="sub">${fmt(mvp.dmg)} damage${mvp.heal ? ' · ' + fmt(mvp.heal) + ' healing' : ''}</div></div></div>` : ''}
      <div class="rew"><span class="chip coin"><i class="ico-coin"></i>+${fmt(rw.coins)}</span><span class="chip ess"><i class="ico-ess"></i>+${rw.essence}</span>${packMsg ? `<span class="chip" style="color:var(--gold)">+ ${packMsg}</span>` : ''}</div>
      <div class="xp-list"><span class="tag">+${xp} XP to each unit</span>${ups.map(u => `<span class="tag" style="color:var(--good)">${esc(u)}</span>`).join('')}</div>
      ${win ? '' : '<p class="sub" style="margin-top:8px">Tip: train units with Essence, open more packs, or put sturdier units in the front row.</p>'}
      <div class="bar" style="justify-content:center;margin-top:14px" id="resBtns"></div></div>`;
    s.appendChild(box);
    if (mvp) cardThumb(mvp.c.id, 'std', false).then(u => { const i = $('#mvpImg'); if (i) i.src = u; });
    const bb = box.querySelector('#resBtns');
    const nx = STAGES[st.n];
    if (win && nx) { const b = el('button', 'btn gold', 'Next stage ›'); b.onclick = () => { SFX.click(); stageModal(nx); }; bb.appendChild(b); }
    const rb = el('button', 'btn' + (win ? '' : ' gold'), win ? 'Fight again' : 'Retry'); rb.onclick = () => { SFX.click(); startBattle(st); };
    const mb = el('button', 'btn', 'Campaign'); mb.onclick = () => { SFX.click(); go('map'); };
    const ab = el('button', 'btn', 'Army'); ab.onclick = () => { SFX.click(); go('army'); };
    bb.append(rb, mb, ab);
    if (packMsg) { const pb = el('button', 'btn teal', 'Open pack'); pb.onclick = () => { SFX.click(); go('packs'); }; bb.appendChild(pb); }
    checkAchToasts();
    guideCheck();
  }, win ? 700 : 500);
}
