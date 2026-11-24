/* ---------- army builder: six slots on a front and back row, faction synergies, 3D line-up ---------- */

const AR = { sel: -1, sort: 'power' };
function cardByUid(uid) { return S.cards.find(c => c.uid === uid); }
function cleanArmy() { S.army = S.army.map(u => (u && cardByUid(u) ? u : null)); }
function synergies(ids) {
  const cnt = {};
  for (const id of ids) { const f = CHAR[id].fac; cnt[f] = (cnt[f] || 0) + 1; }
  return FACTIONS.map(f => ({ f, n: cnt[f.id] || 0, tier: (cnt[f.id] || 0) >= 4 ? 2 : (cnt[f.id] || 0) >= 2 ? 1 : 0 })).filter(x => x.n);
}
function synText(s) { const v = s.tier === 2 ? s.f.syn.b : s.f.syn.a; return s.f.syn.k === 'regen' ? `${(v * 100).toFixed(1)}% ${s.f.syn.text}` : `+${Math.round(v * 100)}% ${s.f.syn.text}`; }
function unitPower(uid) { const inst = cardByUid(uid), u = unitOf(uid), c = CHAR[inst.charId]; return powerOf(statsFor(c, u.lvl, u.star), c); }
function armyPower() { return S.army.filter(Boolean).reduce((a, u) => a + unitPower(u), 0); }
function autoArmy() {
  const by = {};
  for (const inst of S.cards) { const p = unitPower(inst.uid); if (!by[inst.charId] || p > by[inst.charId].p) by[inst.charId] = { uid: inst.uid, p }; }
  const best = Object.values(by).sort((a, b) => b.p - a.p).slice(0, 6).map(x => x.uid);
  S.army = [null, null, null, null, null, null];
  const melee = best.filter(u => CHAR[cardByUid(u).charId].rng < 2), ranged = best.filter(u => CHAR[cardByUid(u).charId].rng >= 2);
  const front = [1, 0, 2], back = [4, 3, 5];
  for (const u of melee) { const s = front.find(i => !S.army[i]) ?? back.find(i => !S.army[i]); S.army[s] = u; }
  for (const u of ranged) { const s = back.find(i => !S.army[i]) ?? front.find(i => !S.army[i]); S.army[s] = u; }
  save();
}
RENDER.army = () => {
  cleanArmy();
  const s = $('#s-army');
  s.innerHTML = '';
  const bar = el('div', 'bar');
  bar.append(backBtn(), el('h2', 'title', 'Army'), el('span', 'sub', `Power ${fmt(armyPower())}`), el('div', 'grow'));
  const auto = el('button', 'btn small', 'Auto-fill'); auto.onclick = () => { SFX.click(); autoArmy(); AR.sel = -1; RENDER.army(); };
  const clr = el('button', 'btn small', 'Clear'); clr.onclick = () => { SFX.back(); S.army = [null, null, null, null, null, null]; save(); AR.sel = -1; RENDER.army(); };
  const fight = el('button', 'btn gold', 'Battle ›'); fight.id = 'armyFight'; fight.onclick = () => { SFX.click(); go('map'); };
  bar.append(auto, clr, fight);
  s.appendChild(bar);
  const wrap = el('div', 'army');
  const L = el('div', 'army-l'), stage = el('div', 'army-stage'), form = el('div', 'formation');
  stage.id = 'armyStage';
  const order = [3, 4, 5, 0, 1, 2];
  for (const i of order) {
    const uid = S.army[i], inst = uid && cardByUid(uid), c = inst && CHAR[inst.charId];
    const d = el('button', 'fslot' + (uid ? ' filled' : '') + (AR.sel === i ? ' sel' : ''), `<span class="rowlbl">${i < 3 ? 'FRONT' : 'BACK'}</span>${c ? `<span class="lv">Lv${unitOf(uid).lvl}</span>${esc(c.short)}` : 'Empty'}`);
    d.onclick = () => {
      SFX.soft();
      if (AR.sel >= 0 && AR.sel !== i && (S.army[AR.sel] || S.army[i])) { const t = S.army[AR.sel]; S.army[AR.sel] = S.army[i]; S.army[i] = t; AR.sel = -1; save(); }
      else AR.sel = AR.sel === i ? -1 : i;
      RENDER.army();
    };
    form.appendChild(d);
  }
  stage.appendChild(form);
  const ids = S.army.filter(Boolean).map(u => cardByUid(u).charId);
  const syn = el('div', 'syn');
  for (const x of synergies(ids)) syn.appendChild(el('span', 'pill' + (x.tier ? ' on act' : ''), `<img src="${iconURL('crest', x.f.id, 10)}" alt="">${x.f.name} ${x.n}/${x.n >= 2 ? 4 : 2}${x.tier ? ': ' + synText(x) : ''}`));
  if (!ids.length) syn.appendChild(el('span', 'sub', 'Tap a card on the right to add it. Two or four units of one faction unlock a bonus.'));
  L.append(stage, syn);
  const R = el('div', 'army-r');
  const info = el('div', 'panel unitbox');
  if (AR.sel >= 0 && S.army[AR.sel]) {
    const uid = S.army[AR.sel], inst = cardByUid(uid), c = CHAR[inst.charId], u = unitOf(uid), st = statsFor(c, u.lvl, u.star);
    info.innerHTML = `<b style="font:800 15px var(--fd);color:${RAR[c.r].col}">${esc(c.name)}</b> <span class="sub">Lv ${u.lvl}${'★'.repeat(u.star)} · ${ROLES[c.role].name}</span>
      <div class="sub" style="margin:3px 0">HP ${st.hp} · ATK ${st.atk} · DEF ${st.def} · SPD ${c.spd} · ${c.rng < 2 ? 'Melee' : 'Range ' + c.rng}</div><div style="font-size:12.5px">◆ <b>${esc(c.act.name)}</b>: ${actDesc(c.act)}</div>
      <div class="bar" style="margin:8px 0 0"><button class="btn small" id="auView">Card & upgrades</button><button class="btn small" id="auRemove">Remove</button></div>`;
  } else info.innerHTML = `<b style="font:800 14px var(--fd)">${AR.sel >= 0 ? 'Choose a unit for this slot' : 'Your roster'}</b><div class="sub">${AR.sel >= 0 ? 'Tap a card below, or tap another slot to swap.' : 'Front row units are attacked first. Ranged units, mages and supports are safest at the back.'}</div>`;
  R.appendChild(info);
  const sorter = el('div', 'pill-row');
  for (const [k, t] of [['power', 'Power'], ['rarity', 'Rarity'], ['faction', 'Faction'], ['role', 'Role']]) { const b = el('button', 'pill' + (AR.sort === k ? ' on' : ''), t); b.onclick = () => { AR.sort = k; RENDER.army(); }; sorter.appendChild(b); }
  R.appendChild(sorter);
  const roster = el('div', 'roster scroll');
  const list = S.cards.slice().sort((a, b) => {
    const ca = CHAR[a.charId], cb = CHAR[b.charId];
    if (AR.sort === 'rarity') return cb.r - ca.r || ca.num - cb.num;
    if (AR.sort === 'faction') return ca.fac.localeCompare(cb.fac) || cb.r - ca.r;
    if (AR.sort === 'role') return ca.role.localeCompare(cb.role) || cb.r - ca.r;
    return unitPower(b.uid) - unitPower(a.uid);
  });
  if (!list.length) roster.innerHTML = '<div class="sub">No cards yet. Open some packs first!</div>';
  for (const inst of list) {
    const c = CHAR[inst.charId], inA = S.army.includes(inst.uid), u = unitOf(inst.uid);
    const d = el('button', 'ru' + (inA ? ' in' : ''), `<img alt=""><span class="lv">${u.lvl}${u.star ? '★' + u.star : ''}</span>`);
    d.title = `${c.name} · ${RAR[c.r].name} ${ROLES[c.role].name} · power ${unitPower(inst.uid)}`;
    cardThumb(c.id, inst.variant, false).then(url => { d.querySelector('img').src = url; });
    d.onclick = () => {
      if (inA) { const i = S.army.indexOf(inst.uid); AR.sel = i; SFX.soft(); RENDER.army(); return; }
      let slot = AR.sel;
      if (slot < 0) { const pref = c.rng < 2 ? [1, 0, 2, 4, 3, 5] : [4, 3, 5, 1, 0, 2]; slot = pref.find(i => !S.army[i]); }
      if (slot == null || slot < 0) { SFX.error(); toast('Your army is full. Tap a slot to choose one to replace.'); return; }
      S.army[slot] = inst.uid; AR.sel = -1; SFX.click(); save(); checkAchToasts(); RENDER.army();
    };
    roster.appendChild(d);
  }
  R.appendChild(roster);
  wrap.append(L, R);
  s.appendChild(wrap);
  if ($('#auView')) $('#auView').onclick = () => openViewer(cardByUid(S.army[AR.sel]).charId);
  if ($('#auRemove')) $('#auRemove').onclick = () => { S.army[AR.sel] = null; AR.sel = -1; save(); SFX.back(); RENDER.army(); };
  SC.all.army.sync();
};

function makeArmyScene() {
  const scene = new THREE.Scene();
  scene.background = gradientTexture(['#0a0820', '#22184a', '#3a2450']);
  scene.fog = new THREE.Fog(0x22184a, 12, 30);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xd8c8ff, 0x2a1830, 0.9));
  const key = new THREE.DirectionalLight(0xffe8c8, 1.4); key.position.set(-4, 8, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8af0ff, 1.0); rim.position.set(5, 4, -6); scene.add(rim);
  const K = new Kit();
  K.add('root', 'cyl', '#3a2e58', [0, -0.15, 0], [9, 0.3, 6.5]);
  K.add('root', 'cyl', '#2a2244', [0, -0.45, 0], [8.6, 0.4, 6.2]);
  const pads = [];
  for (let i = 0; i < 6; i++) { const x = (i % 3 - 1) * 2.2, z = i < 3 ? 1.3 : -1.0; pads.push([x, z]); K.add('root', 'cyl', i < 3 ? '#6a5a9a' : '#5a4a7a', [x, 0.02, z], [1.5, 0.08, 1.5]); K.add('root', 'tor', '#ffd070', [x, 0.07, z], [0.72, 0.72, 0.72], [Math.PI / 2, 0, 0], 'g'); }
  const def = kitToDef(K);
  for (const p of def.parts) for (const k in p.geos) scene.add(new THREE.Mesh(p.geos[k], k === 'l' ? MAT.lit : MAT.glow));
  scene.add(starField(200, 25, 0.2, ['#ffffff', '#c8e0ff']));
  const A = { scene, camera, live: true, models: [null, null, null, null, null, null], uids: [] };
  A.sync = () => {
    for (let i = 0; i < 6; i++) {
      const uid = S.army[i], inst = uid && cardByUid(uid), id = inst && inst.charId;
      const m = A.models[i];
      if (m && m.userData.id === id) continue;
      if (m) releaseModel(m);
      A.models[i] = null;
      if (id) { const nm = makeModel(id); const sc = Math.min(1, 1.9 / nm.userData.h, 1.7 / Math.max(0.5, nm.userData.w)); nm.scale.setScalar(sc); nm.position.set(pads[i][0], 0.08, pads[i][1]); scene.add(nm); A.models[i] = nm; }
    }
    SC.needs = true;
    A.resize(GFX.w, GFX.h);
  };
  A.resize = (w, h) => {
    camera.aspect = w / h;
    const st = $('#armyStage');
    camera.clearViewOffset();
    if (st) { const r = st.getBoundingClientRect(); if (r.width > 10) camera.setViewOffset(w, h, (w / 2 - (r.left + r.width / 2)), (h / 2 - (r.top + r.height * 0.36)), w, h); A.stageW = r.width; A.stageH = r.height; }
    const portrait = h > w;
    camera.fov = portrait ? 46 : 34;
    camera.updateProjectionMatrix();
  };
  A.enter = () => setTimeout(() => A.resize(GFX.w, GFX.h), 30);
  A.update = (dt, t) => {
    const vfov = camera.fov * Math.PI / 180, sw = A.stageW || GFX.w, sh = A.stageH || GFX.h;
    const fracW = sw / GFX.w, fracH = sh * 0.62 / GFX.h;
    const dW = 9.5 / 2 / (Math.tan(vfov / 2) * camera.aspect * fracW), dH = 4.2 / 2 / (Math.tan(vfov / 2) * fracH);
    const d = clamp(Math.max(dW, dH), 8, 40);
    camera.position.set(Math.sin(t * 0.15) * 0.8, d * 0.42, d);
    camera.lookAt(0, 0.9, 0);
    A.models.forEach((m, i) => { if (m) { animModel(m, t, 'idle', 0); m.rotation.y = Math.sin(t * 0.5 + i) * 0.15; } });
  };
  return A;
}
