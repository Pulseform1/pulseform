/* ---------- collection binder and the card viewer ---------- */

const BD = { page: 0, f: { rar: 'all', fac: 'all', role: 'all', set: 'all', own: 'all' }, sort: 'num', per: 12 };
function binderList() {
  const o = ownedCounts(), F = BD.f;
  let list = CHARS.filter(c => (F.rar === 'all' || c.r === +F.rar) && (F.fac === 'all' || c.fac === F.fac) && (F.role === 'all' || c.role === F.role)
    && (F.set === 'all' || FAMILY[F.set].fac === c.fac) && (F.own === 'all' || (F.own === 'owned' ? o[c.id] : F.own === 'missing' ? !o[c.id] : F.own === 'new' ? S.fresh[c.id] : F.own === 'dups' ? o[c.id] > 1 : S.wish[c.id])));
  const last = {};
  for (const x of S.cards) last[x.charId] = Math.max(last[x.charId] || 0, x.obtainedAt);
  const by = { num: (a, b) => a.num - b.num, rarity: (a, b) => b.r - a.r || a.num - b.num, name: (a, b) => a.name.localeCompare(b.name), faction: (a, b) => a.fac.localeCompare(b.fac) || b.r - a.r,
    newest: (a, b) => (last[b.id] || 0) - (last[a.id] || 0) || a.num - b.num, power: (a, b) => powerOf(statsFor(b, 1, 0), b) - powerOf(statsFor(a, 1, 0), a) };
  return list.sort(by[BD.sort]);
}
function setProgressBox(inModal) {
  const pbox = el('div', 'b-sidebox panel prog-box' + (inModal ? ' in-modal' : ''));
  pbox.innerHTML = `<b style="font:800 14px var(--fd)">Set progress</b><div class="sub" style="font-size:11.5px;margin-bottom:4px">Collect 10 / 20 / 30 of a realm's set for rewards.</div>`;
  for (const f of FACTIONS) {
    const n = setProgress(f.id), fam = FAMILIES.find(x => x.fac === f.id);
    const d = el('div', 'prog', `<div class="pt"><img src="${iconURL('crest', f.id, 18)}" alt="">${f.name} <span class="sub" style="font-weight:700">(${fam.name})</span><em>${n}/30</em></div><div class="pbar"><i style="width:${n / 30 * 100}%;background:${f.col}"></i></div>`);
    const steps = el('div', 'steps');
    SET_STEPS.forEach((stp, i) => {
      const stt = setStepState(f.id, i);
      const b = el('button', stt, stt === 'claimed' ? '✓ ' + stp.n : stp.n);
      b.title = stp.text;
      b.onclick = () => { if (claimSet(f.id, i)) { SFX.buy(); toast(`${f.name} set reward: ${stp.text}`); $('#modal').hidden = true; RENDER.binder(); refreshBadges(); } else toast(`Collect ${stp.n} ${f.name} characters for ${stp.text}`); };
      steps.appendChild(b);
    });
    d.appendChild(steps);
    d.style.marginTop = '6px';
    pbox.appendChild(d);
  }
  return pbox;
}
RENDER.binder = () => {
  const s = $('#s-binder');
  s.innerHTML = '';
  const o = ownedCounts(), found = Object.keys(o).length;
  const bar = el('div', 'bar');
  bar.append(backBtn(), el('h2', 'title', 'Collection'), el('span', 'sub', `${found} / ${CHARS.length} discovered · prototype set of ${PLANNED_TOTAL} planned`), el('div', 'grow'));
  const clr = el('button', 'btn small', 'Clear NEW marks'); clr.onclick = () => { S.fresh = {}; save(); RENDER.binder(); refreshBadges(); };
  if (Object.keys(S.fresh).length) bar.appendChild(clr);
  const sets = el('button', 'btn small sets-btn', 'Set rewards');
  sets.onclick = () => { SFX.click(); showModal({ title: 'Set progress', html: '', buttons: [{ t: 'Close' }] }); const b = $('#modal .mbox'); b.insertBefore(setProgressBox(true), b.lastChild); };
  bar.appendChild(sets);
  s.appendChild(bar);
  const wrap = el('div', 'binder');
  const side = el('div', 'b-side scroll');
  const fbox = el('div', 'b-sidebox panel filters');
  const mk = (key, opts) => {
    const sel = el('select', 'sel');
    sel.setAttribute('aria-label', key);
    for (const [v, t] of opts) { const op = el('option', '', t); op.value = v; if (String(BD.f[key] != null ? BD.f[key] : BD.sort) === String(v)) op.selected = true; sel.appendChild(op); }
    sel.onchange = () => { if (key === 'sort') BD.sort = sel.value; else BD.f[key] = sel.value; BD.page = 0; SFX.soft(); RENDER.binder(); };
    return sel;
  };
  fbox.append(
    mk('own', [['all', 'All cards'], ['owned', 'Owned'], ['missing', 'Missing'], ['new', 'New'], ['dups', 'Duplicates'], ['wish', 'Wishlist']]),
    mk('rar', [['all', 'Any rarity']].concat(RAR.map((r, i) => [i, r.name]))),
    mk('fac', [['all', 'Any faction']].concat(FACTIONS.map(f => [f.id, f.name]))),
    mk('role', [['all', 'Any role']].concat(Object.keys(ROLES).map(k => [k, ROLES[k].name]))),
    mk('set', [['all', 'Any set (pack family)']].concat(FAMILIES.map(f => [f.id, f.name + ' set']))),
    mk('sort', [['num', 'Sort: number'], ['rarity', 'Sort: rarity'], ['name', 'Sort: name'], ['faction', 'Sort: faction'], ['newest', 'Sort: newest'], ['power', 'Sort: power']])
  );
  BD.f.sort = undefined;
  side.appendChild(fbox);
  side.appendChild(setProgressBox());
  const main = el('div', 'b-main');
  const page = el('div', 'b-page');
  const grid = el('div', 'b-grid');
  page.appendChild(grid);
  const pager = el('div', 'pager');
  main.append(page, pager);
  wrap.append(side, main);
  s.appendChild(wrap);
  requestAnimationFrame(() => fillBinder(grid, pager, page));
};
function fillBinder(grid, pager, page) {
  const list = binderList(), o = ownedCounts();
  const w = page.clientWidth - 28, h = page.clientHeight - 28, gap = 10;
  let best = null;
  for (let cols = 2; cols <= 10; cols++) {
    const cw = Math.min(190, (w - gap * (cols - 1)) / cols), ch = cw * 1.4, rows = Math.floor((h + gap) / (ch + gap));
    if (rows < 1 || cw < 64) continue;
    const n = cols * rows, score = n >= 8 ? cw * 10 + n : cw * n / 8;
    if (!best || score > best.score) best = { cols, rows, cw, score };
  }
  if (!best) best = { cols: 3, rows: 1, cw: 80 };
  BD.per = best.cols * best.rows;
  grid.style.gridTemplateColumns = `repeat(${best.cols}, ${best.cw}px)`;
  const pages = Math.max(1, Math.ceil(list.length / BD.per));
  BD.page = clamp(BD.page, 0, pages - 1);
  grid.innerHTML = '';
  const slice = list.slice(BD.page * BD.per, BD.page * BD.per + BD.per);
  if (!slice.length) grid.innerHTML = '<div class="sub" style="grid-column:1/-1;text-align:center;padding:30px">No cards match these filters.</div>';
  for (const c of slice) {
    const own = o[c.id] || 0;
    const sl = el('button', 'slot' + (own ? '' : ' missing'));
    sl.setAttribute('aria-label', own ? c.name : 'Undiscovered ' + RAR[c.r].name);
    const img = el('img'); img.alt = ''; sl.appendChild(img);
    cardThumb(c.id, bestVariant(c.id), !own).then(u => { img.src = u; });
    if (own && (c.r >= 2 || bestVariant(c.id) === 'radiant')) sl.appendChild(el('span', 'holo'));
    if (own > 1) sl.appendChild(el('span', 'cnt', 'x' + own));
    if (S.fresh[c.id]) sl.appendChild(el('span', 'nb', 'NEW'));
    if (S.wish[c.id]) sl.appendChild(el('span', 'wl', '♥'));
    sl.onclick = () => { SFX.soft(); openViewer(c.id); };
    grid.appendChild(sl);
  }
  pager.innerHTML = '';
  const prev = el('button', 'btn small', '‹ Prev'), next = el('button', 'btn small', 'Next ›');
  prev.disabled = BD.page === 0; next.disabled = BD.page >= pages - 1;
  prev.onclick = () => { BD.page--; SFX.whoosh(); fillBinder(grid, pager, page); };
  next.onclick = () => { BD.page++; SFX.whoosh(); fillBinder(grid, pager, page); };
  pager.append(prev, el('span', '', `Page ${BD.page + 1} / ${pages}`), next);
  let sx = null;
  page.onpointerdown = e => { sx = e.clientX; };
  page.onpointerup = e => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 60) { if (d < 0 && BD.page < pages - 1) next.onclick(); else if (d > 0 && BD.page > 0) prev.onclick(); } };
  for (let i = 0; i < 2; i++) { const nx = list.slice((BD.page + 1) * BD.per, (BD.page + 2) * BD.per); for (const c of nx) if (o[c.id] || true) cardThumb(c.id, bestVariant(c.id), !o[c.id]); }
}
function bestVariant(id) { return S.cards.some(x => x.charId === id && x.variant === 'radiant') ? 'radiant' : 'std'; }
window.addEventListener('keydown', e => {
  if (UI.screen !== 'binder' || !$('#viewer').hidden) return;
  if (e.key === 'ArrowRight') { const b = $$('.pager .btn')[1]; if (b && !b.disabled) b.click(); }
  if (e.key === 'ArrowLeft') { const b = $$('.pager .btn')[0]; if (b && !b.disabled) b.click(); }
});

/* ---------- viewer ---------- */
const VW = { scene: null, camera: null, model: null, id: null, yaw: 0.4, pitch: 0.15, auto: true };
let FOIL_MASK = null;
function foilMask() {
  if (FOIL_MASK) return FOIL_MASK;
  const cv = document.createElement('canvas'); cv.width = 100; cv.height = 140;
  const x = cv.getContext('2d'), k = 100 / CARD_W;
  x.fillStyle = '#fff'; x.fillRect(0, 0, 100, 140);
  x.clearRect(ART_RECT[0] * k, ART_RECT[1] * k, ART_RECT[2] * k, ART_RECT[3] * k);
  x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(ART_RECT[0] * k, ART_RECT[1] * k, ART_RECT[2] * k, ART_RECT[3] * k);
  x.clearRect(TEXT_RECT[0] * k, TEXT_RECT[1] * k, TEXT_RECT[2] * k, TEXT_RECT[3] * k);
  x.clearRect(30 * k, 632 * k, 440 * k, 46 * k);
  return (FOIL_MASK = cv.toDataURL());
}
function initViewerScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x302040, 0.9));
  const key = new THREE.DirectionalLight(0xfff0dd, 1.4); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9af0ff, 1.3); rim.position.set(4, 3, -5); scene.add(rim);
  VW.rim = rim;
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.18, 32), new THREE.MeshStandardMaterial({ color: 0x3a2e5a, roughness: 0.5, metalness: 0.3 }));
  ped.position.y = -0.09; scene.add(ped);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.2, 48), new THREE.MeshBasicMaterial({ color: 0xffd070, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.005; scene.add(ring);
  VW.ring = ring;
  VW.scene = scene; VW.camera = camera;
}
function openViewer(id) {
  const c = CHAR[id], o = ownedCounts(), own = o[id] || 0, f = FAC[c.fac];
  const v = $('#viewer');
  v.hidden = false;
  if (own) { delete S.fresh[id]; questEvent('inspect', 1); save(); }
  const variant = bestVariant(id);
  const holo = own ? holoFor(c.r, variant) : 0;
  v.innerHTML = `<button class="back x-close" id="vwClose" aria-label="Close">✕</button>
  <div class="vw"><div class="vw-card"><div class="vw-inner" id="vwInner"><div class="vw-face" id="vwFace"><div class="foil" id="vwFoil"></div></div><div class="vw-back" id="vwBack"></div></div>
  <div class="vw-actions" style="justify-content:center;margin-top:10px"><button class="btn small" id="vwFlip">Flip card</button><button class="btn small" id="vwZoom">Zoom</button><button class="btn small" id="vwWish">${S.wish[id] ? '♥ On wishlist' : '♡ Wishlist'}</button></div></div>
  <div class="vw-info" id="vwInfo"></div></div>`;
  const face = $('#vwFace');
  let cv;
  if (own) cv = cardCanvas(id, 600, variant);
  else { cv = document.createElement('canvas'); cv.width = 600; cv.height = 840; cardThumb(id, 'std', true).then(u => { const im = new Image(); im.onload = () => cv.getContext('2d').drawImage(im, 0, 0, 600, 840); im.src = u; }); }
  face.insertBefore(cv, face.firstChild);
  const foil = $('#vwFoil');
  if (holo) {
    foil.style.cssText = `opacity:${0.35 + holo * 0.45};-webkit-mask-image:url(${foilMask()});mask-image:url(${foilMask()});-webkit-mask-size:100% 100%;mask-size:100% 100%;background:linear-gradient(115deg,transparent 20%,rgba(255,120,220,.7) 35%,rgba(120,255,255,.7) 45%,rgba(255,255,140,.7) 55%,rgba(140,140,255,.7) 65%,transparent 80%);background-size:300% 300%`;
  }
  const inner = $('#vwInner');
  let zoom = false, flipped = false;
  const tilt = e => {
    if (zoom) return;
    const r = inner.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    inner.style.transform = `${flipped ? 'rotateY(180deg) ' : ''}rotateY(${clamp(px, -0.6, 0.6) * 22}deg) rotateX(${clamp(-py, -0.6, 0.6) * 16}deg)`;
    foil.style.backgroundPosition = `${50 + px * 120}% ${50 + py * 120}%`;
  };
  v.onpointermove = e => { if (e.target.closest('.vw-card')) tilt(e); };
  const onOrient = e => { if (e.gamma == null || zoom) return; tilt({ clientX: inner.getBoundingClientRect().left + inner.clientWidth * (0.5 + clamp(e.gamma / 60, -0.5, 0.5)), clientY: inner.getBoundingClientRect().top + inner.clientHeight * (0.5 + clamp((e.beta - 45) / 60, -0.5, 0.5)) }); };
  window.addEventListener('deviceorientation', onOrient);
  $('#vwFlip').onclick = () => { SFX.flip(1); flipped = !flipped; inner.style.transform = flipped ? 'rotateY(180deg)' : ''; };
  const doZoom = () => { zoom = !zoom; SFX.soft(); inner.style.transform = zoom ? 'scale(1.55)' : ''; inner.style.zIndex = zoom ? 5 : ''; face.classList.toggle('zoom', zoom); };
  $('#vwZoom').onclick = doZoom;
  face.onclick = () => { if (zoom) doZoom(); };
  $('#vwWish').onclick = () => { if (S.wish[id]) delete S.wish[id]; else S.wish[id] = 1; save(); SFX.soft(); $('#vwWish').textContent = S.wish[id] ? '♥ On wishlist' : '♡ Wishlist'; };
  const close = () => {
    SFX.back(); v.hidden = true; v.innerHTML = ''; window.removeEventListener('deviceorientation', onOrient);
    if (VW.model) { releaseModel(VW.model); VW.model = null; }
    if (ART.r.domElement.parentNode) ART.r.domElement.remove();
    ART.r.setSize(ART.W, ART.H, false);
    SC.overlay = null; SC.needs = true;
    if (UI.screen === 'binder') { const g = $('.b-grid'); if (g) fillBinder(g, $('.pager'), $('.b-page')); refreshBadges(); }
    if (UI.screen === 'army') RENDER.army();
  };
  $('#vwClose').onclick = close;
  v.onkeydown = null;
  VW.close = close;
  const back = $('#vwBack');
  back.innerHTML = own ? `<b style="font:900 18px var(--fd)">${esc(c.name)}</b><p class="sub" style="margin:4px 0 10px">${RAR[c.r].name} ${ROLES[c.role].name} of ${f.name}, from ${f.region}.</p>
    <p style="margin-bottom:8px"><i>"${esc(c.flavour)}"</i></p><p style="margin-bottom:8px">${ROLES[c.role].tip} ${f.blurb}</p>
    <p class="sub">Faction bonus: with 2 or 4 ${f.name} units in an army, all of them gain ${f.syn.k === 'regen' ? (f.syn.a * 100).toFixed(1) + '% / ' + (f.syn.b * 100).toFixed(1) + '%' : Math.round(f.syn.a * 100) + '% / ' + Math.round(f.syn.b * 100) + '%'} ${f.syn.text}.</p>
    <p class="sub" style="margin-top:8px">Card #${c.num} of the prototype set. Body: ${c.body}. Found in ${FAMILIES.find(x => x.fac === c.fac).name} packs most often.</p>`
    : `<b style="font:900 18px var(--fd)">Undiscovered</b><p class="sub">A ${RAR[c.r].name} ${f.name} character. Open ${FAMILIES.find(x => x.fac === c.fac).name} packs to find it.</p>`;
  const info = $('#vwInfo');
  if (!own) {
    info.innerHTML = `<div class="vw-name" style="color:${RAR[c.r].col}">Unknown ${RAR[c.r].name}</div><div class="sub"><img src="${iconURL('crest', c.fac, 12)}" style="width:16px;vertical-align:-3px"> ${f.name} · ${ROLES[c.role].name} · #${c.num}</div>
      <div class="lockbox">Not discovered yet. ${FAMILIES.find(x => x.fac === c.fac).name} packs hold the most ${f.name} characters. Pack odds always give you characters you have not found yet first.</div>`;
    SC.overlay = null;
    return;
  }
  const st = statsFor(c, 1, 0);
  info.innerHTML = `<div><div class="vw-name">${esc(c.name)}</div><div class="sub" style="margin-top:2px"><b style="color:${RAR[c.r].col}">${RAR[c.r].name}</b> · <img src="${iconURL('crest', c.fac, 12)}" style="width:16px;vertical-align:-3px"> ${f.name} · <img src="${iconURL('role', c.role, 10)}" style="width:14px;vertical-align:-2px"> ${ROLES[c.role].name}</div></div>
    <div class="vw-3d" id="vw3d"></div>
    <div class="statgrid">${['hp', 'atk', 'def', 'spd', 'rng'].map(k => `<div class="stat"><img src="${iconURL('stat', k, 12)}" alt="">${k === 'rng' ? (c.rng < 2 ? 'Melee' : c.rng) : st[k]}<small>${{ hp: 'HP', atk: 'ATTACK', def: 'DEFENCE', spd: 'SPEED', rng: 'RANGE' }[k]}</small></div>`).join('')}</div>
    <div class="ab"><b style="color:${mix(RAR[c.r].col, '#ffffff', 0.3)}">◆ ${esc(c.act.name)} <span class="tag">Ability</span></b><span>${actDesc(c.act)}</span></div>
    ${c.pas ? `<div class="ab"><b style="color:${mix(RAR[c.r].col, '#ffffff', 0.3)}">◇ ${esc(c.pas.name)} <span class="tag">Passive</span></b><span>${pasDesc(c.pas)}</span></div>` : ''}
    <div><b style="font:800 14px var(--fd)">Your copies (${own})</b> <span class="sub">· Essence ${fmt(S.essence)}</span><div class="copies" id="vwCopies" style="margin-top:6px"></div></div>`;
  fillCopies(id);
  if (!VW.scene) initViewerScene();
  VW.model = makeModel(id);
  VW.scene.add(VW.model);
  VW.rim.color.set(f.glow);
  VW.ring.material.color.set(RAR[c.r].col);
  const h = VW.model.userData.h, w = VW.model.userData.w;
  VW.fit = Math.max(h, w * 0.8);
  VW.yaw = 0.5; VW.pitch = 0.12; VW.auto = true;
  const box = $('#vw3d');
  let drag = null;
  box.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY }; VW.auto = false; try { box.setPointerCapture(e.pointerId); } catch (er) {} };
  box.onpointermove = e => { if (!drag) return; VW.yaw += (e.clientX - drag.x) * 0.012; VW.pitch = clamp(VW.pitch + (e.clientY - drag.y) * 0.006, -0.2, 0.7); drag = { x: e.clientX, y: e.clientY }; };
  box.onpointerup = box.onpointercancel = () => { drag = null; };
  box.onwheel = e => { e.preventDefault(); VW.fit = clamp(VW.fit * (1 + Math.sign(e.deltaY) * 0.1), h * 0.5, h * 2.5); };
  const cvs = ART.r.domElement;
  cvs.style.cssText = 'width:100%;height:100%;display:block;border-radius:18px';
  box.appendChild(cvs);
  SC.overlay = { draw: drawViewer3D };
}
function drawViewer3D(dt, t) {
  const box = $('#vw3d');
  if (!box || !VW.model) return;
  const r = box.getBoundingClientRect();
  if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > GFX.h) return;
  const k = Math.min(1.5, devicePixelRatio || 1), w = Math.round(r.width * k), h = Math.round(r.height * k);
  const g = ART.r, sz = g.getSize(new THREE.Vector2());
  if (sz.x !== w || sz.y !== h) g.setSize(w, h, false);
  if (VW.auto) VW.yaw += dt * 0.4;
  animModel(VW.model, t, Math.floor(t / 4) % 3 === 2 ? 'atk' : 'idle', (t % 4) / 1.2 % 1);
  const cam = VW.camera, m = VW.model, H = m.userData.h;
  cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  const d = VW.fit / 2 / Math.tan(cam.fov * Math.PI / 360) * 1.15 + m.userData.w * 0.35;
  cam.position.set(Math.sin(VW.yaw) * Math.cos(VW.pitch) * d, H * 0.5 + Math.sin(VW.pitch) * d, Math.cos(VW.yaw) * Math.cos(VW.pitch) * d);
  cam.lookAt(0, H * 0.46, 0);
  setRim(FAC[m.userData.c.fac].glow, 0.35);
  g.setClearColor(0x000000, 0);
  g.render(VW.scene, cam);
  setRim('#000000', 0);
}
function fillCopies(id) {
  const box = $('#vwCopies');
  if (!box) return;
  const c = CHAR[id], list = S.cards.filter(x => x.charId === id), many = list.length > 1;
  box.innerHTML = '';
  list.forEach((inst, i) => {
    const u = unitOf(inst.uid), inArmy = S.army.includes(inst.uid);
    const d = el('div', 'copy', `<b>Copy ${i + 1}${inst.variant === 'radiant' ? ' ✦ Radiant' : ''}</b><span>Lv ${u.lvl}${'★'.repeat(u.star)}</span><span class="sub">${u.lvl < MAX_LVL ? `XP ${u.xp}/${xpNeed(u.lvl)}` : 'Max level'}</span>${inArmy ? '<span class="tag" style="color:var(--teal)">In army</span>' : ''}<span style="flex:1"></span>`);
    const tr = el('button', 'btn small' + (u.lvl >= MAX_LVL || S.essence < trainCost(u.lvl) ? ' dis' : ''), `Train ${trainCost(u.lvl)}<i class="ico-ess" style="width:12px;height:12px;display:inline-block"></i>`);
    tr.title = 'Spend Essence to gain a level';
    tr.onclick = () => { if (trainUnit(inst.uid)) { SFX.levelUp(); toast(`${c.short} reached level ${unitOf(inst.uid).lvl}`); refreshCurrency(); fillCopies(id); checkAchToasts(); } };
    d.appendChild(tr);
    if (u.star < 3) {
      const ok = u.lvl >= STAR_REQ[u.star] && S.essence >= STAR_COST[u.star];
      const as = el('button', 'btn small' + (ok ? ' teal' : ' dis'), `★ Ascend ${STAR_COST[u.star]}`);
      as.title = `Needs level ${STAR_REQ[u.star]}. Each star adds 10% to all stats.`;
      as.onclick = () => { if (ascendUnit(inst.uid)) { SFX.reveal(2); toast(`${c.short} ascended to ${unitOf(inst.uid).star} stars!`); refreshCurrency(); fillCopies(id); } };
      d.appendChild(as);
    }
    if (many && !inArmy) {
      const ds = el('button', 'btn small', `Dissolve +${dissolveValue(c)}`);
      ds.title = 'Turn this spare copy into Essence';
      ds.onclick = () => showModal({ title: 'Dissolve a copy?', html: `<p>This spare copy of ${esc(c.name)} becomes ${dissolveValue(c)} Essence. You keep your other copies.</p>`, buttons: [{ t: 'Cancel' }, { t: 'Dissolve', cls: 'gold', fn: () => { const n = dissolveCard(inst.uid); if (n) { SFX.coin(); toast(`+${n} Essence`); refreshCurrency(); openViewer(id); } } }] });
      d.appendChild(ds);
    }
    box.appendChild(d);
  });
}
