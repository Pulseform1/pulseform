/* ---------- boot, first-time guide, test hooks ---------- */

const GUIDE = [
  { at: ['hub'], t: 'Welcome to Mythic Armies!', d: 'A free Starter Box is waiting for you. Tap <b>Open Packs</b> to begin.', hl: '#tPacks' },
  { at: ['packs'], t: 'Your Starter Box', d: 'Tap the box to open it. It holds four packs of five cards each.', hl: '.invi' },
  { at: ['open'], t: 'Rip it open!', d: 'Drag across the shiny top seam of the pack to tear it, or press and hold. Then tap each card to flip it. Better cards glow before they flip!', hl: null },
  { at: ['hub', 'packs', 'binder'], t: 'Your collection', d: 'Open <b>Collection</b> to browse your cards, tilt the shiny ones and look at their 3D models.', hl: '#tBinder' },
  { at: ['hub', 'army'], t: 'Build an army', d: 'Go to <b>Army</b> and press <b>Auto-fill</b>, or tap cards to place up to six units. Melee units go in front.', hl: '#tArmy' },
  { at: ['hub', 'army', 'map'], t: 'To battle!', d: 'Open the <b>Campaign</b> and fight stage 1. Your units fight on their own. Wins earn coins for more packs.', hl: '#tMap' }
];
function guideCheck() {
  const g = $('#guide');
  $$('.pulse-hl').forEach(e => e.classList.remove('pulse-hl'));
  if (!S || S.guide >= GUIDE.length) { g.hidden = true; return; }
  if (S.guide === 0 && !S.items.length && S.stats.packs > 0) S.guide = 3;
  if (S.guide === 1 && !S.items.some(i => i.type === 'box')) S.guide = 2;
  if (S.guide === 2 && S.stats.packs > 0 && UI.screen !== 'open') S.guide = 3;
  if (S.guide === 3 && UI.screen === 'binder') S.guide = 4;
  if (S.guide === 4 && S.army.some(Boolean)) S.guide = 5;
  if (S.guide === 5 && S.stats.battles > 0) { S.guide = GUIDE.length; save(); g.hidden = true; toast('Guide complete! Win battles, buy packs and finish quests.', 'quest'); return; }
  const st = GUIDE[S.guide];
  const where = UI.screen;
  if (!st.at.includes(where) || (where === 'open' && SC.all.open.state !== 'idle' && S.guide === 2)) { g.hidden = true; return; }
  let hl = st.hl, txt = st.d;
  if (S.guide === 4 && where === 'army') { hl = '.bar .btn.small'; txt = 'Press <b>Auto-fill</b> to place your strongest units, or tap cards on the right.'; }
  if (S.guide === 5 && where === 'army') { hl = '#armyFight'; txt = 'Your army is ready. Press <b>Battle</b>!'; }
  if (S.guide === 5 && where === 'map') { hl = '.node.next'; txt = 'Tap stage 1, then <b>Fight!</b>'; }
  g.innerHTML = `<b>${st.t}</b>${txt}<div class="gbtns"><button class="btn small" id="gSkip">Skip guide</button></div>`;
  g.hidden = false;
  $('#gSkip').onclick = () => { S.guide = GUIDE.length; save(); guideCheck(); };
  if (hl) setTimeout(() => { const e = $(hl); if (e) e.classList.add('pulse-hl'); }, 60);
  save();
}

async function boot() {
  const bar = $('.ld-bar i'), step = p => { bar.style.width = p + '%'; };
  let fresh = false;
  try { fresh = !localStorage.getItem(SAVE_KEY); } catch (e) { fresh = true; }
  loadSave();
  if (fresh) {
    addBox('Starter Box', [{ family: 'dragonfire', tier: 'standard' }, { family: 'wildheart', tier: 'standard' }, { family: 'deeptide', tier: 'standard' }, { family: 'starfall', tier: 'greater' }], 'starter');
    saveNow();
  }
  step(10);
  $('.ld-sigil').style.backgroundImage = `url(${iconURL('sigil', 0, 60)})`;
  $('.brand-sigil').style.backgroundImage = `url(${iconURL('sigil', 0, 40)})`;
  if (typeof THREE === 'undefined') { $('.ld-msg').textContent = 'Could not load the 3D engine. Check your connection and reload.'; return; }
  initMaterials();
  initMain();
  initArt();
  step(30);
  SC.all.hub = makeHubScene();
  SC.all.open = makeOpenScene();
  SC.all.army = makeArmyScene();
  SC.all.battle = makeBattleScene();
  SC.all.battle.update = battleView;
  openPointer(SC.all.open);
  onResize();
  ensureQuests(); dailyOffers();
  step(50);
  setToggles();
  $('#btnSfx').onclick = () => { setSfx(!S.settings.sfx); setToggles(); SFX.click(); };
  $('#btnMusic').onclick = () => { setMusic(!S.settings.music); setToggles(); };
  $('#btnHome').onclick = () => { if (UI.screen === 'battle' && !BT.done) return; SFX.back(); go('hub'); };
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#viewer').hidden && VW.close) VW.close();
    else if (!$('#modal').hidden) $('#modal').hidden = true;
  });
  try { await Promise.race([document.fonts ? Promise.all([document.fonts.load(`700 30px Cinzel`), document.fonts.load(`900 30px Cinzel`), document.fonts.load(`800 20px Nunito`)]) : 0, wait(2500)]); } catch (e) {}
  step(70);
  const best = S.cards.map(c => CHAR[c.charId]).sort((a, b) => b.r - a.r)[0];
  await getArt(best ? best.id : 'em27');
  step(100);
  refreshCurrency();
  go('hub');
  setTimeout(() => { $('#loading').style.transition = 'opacity .4s'; $('#loading').style.opacity = 0; setTimeout(() => $('#loading').remove(), 450); }, 150);
}

/* hooks for automated tests: the page's own pack logic, run on a scratch inventory */
window.MA = {
  get S() { return S; }, SC, CHARS, RAR, TIERS, FAMILIES, STAGES, go, openPack, openBox, startBattle, skipBattle, rollPack, buyPacks, claimQuest, openViewer,
  frames(on) { if (on) SC.frameLog = []; else { const f = SC.frameLog || []; SC.frameLog = null; return f; } },
  simulate(n, fam, tier) {
    const owned = {}, counts = [0, 0, 0, 0, 0, 0], seen = new Set();
    let pity = 0, firstDup = 0, dupInPack = 0, cards = 0, pityHits = 0, firstDupCards = 0;
    for (let i = 0; i < n; i++) {
      const f = fam || FAMILIES[i % FAMILIES.length].id;
      const res = rollPack(f, tier || 'standard', owned, pity);
      pity = res.pity; if (res.pityHit) pityHits++;
      const ids = new Set(res.cards.map(c => c.id));
      if (ids.size !== 5) dupInPack++;
      for (const c of res.cards) {
        cards++;
        counts[c.r]++;
        if (owned[c.id] && !firstDup) { firstDup = i + 1; firstDupCards = cards; }
        owned[c.id] = (owned[c.id] || 0) + 1;
        seen.add(c.id);
      }
    }
    return { packs: n, cards, counts, pct: counts.map(x => +(x / cards * 100).toFixed(2)), dupInPack, firstDupPack: firstDup, firstDupCard: firstDupCards, distinct: seen.size, pityHits };
  },
  openHeadless(n, tier) { const out = []; for (let i = 0; i < n; i++) { const it = addPack(FAMILIES[i % 6].id, tier || 'standard', 'test'); out.push(openPackItem(it).reveal.map(r => r.c.id)); } refreshCurrency(); return out; },
  testReveal(ids, fam) { const reveal = ids.map(id => ({ c: CHAR[id], r: CHAR[id].r, isNew: true, ess: 0, variant: 'std' })); openPack({ iid: 'test', family: fam || 'starfall', tier: 'grand' }, { reveal, pityHit: false }); },
  autoArmy() { autoArmy(); },
  simBattle(n) { const B = newBattle(STAGES[n]); B.fx = null; let k = 0; while (!B.over && k++ < 9000) stepBattle(B); return { w: B.winner, t: Math.round(B.t), alive: B.units.filter(u => u.alive && u.side === 0).length }; },
  wipe() { NO_SAVE = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} },
  manual(on) { SC.manual = !!on; },
  tick(dt) { frame(dt, dt * 1000); },
  state() { return { screen: UI.screen, open: SC.all.open && SC.all.open.state, battle: BT.B ? { over: BT.B.over, t: BT.B.t, winner: BT.B.winner } : null, dpr: GFX.dpr, frameMs: GFX.frameMs }; }
};
boot().catch(e => { console.error(e); const m = $('.ld-msg'); if (m) m.textContent = 'Something went wrong while loading: ' + e.message; });
