  /* ---------- 97 the start screen ----------
     The kit's title card (a box with the name, a Play button and a paragraph of controls) is rebuilt for Duelpoint once
     the page has made it: the map flies by behind, a dark wash on the left carries the name, a line on what the game is,
     an angled PLAY (LOADING with a bar under it until the 3D world is ready), and the operatives' names running along the
     bottom in their colours. (The controls are in Settings, where every key can be changed.) The kit's own Play button is
     moved in, not copied, so it still starts the game; the kit's other pieces are kept, hidden, for its own bookkeeping. */
  function startScreen() {
    const S = document.getElementById('sTitle'), play = document.getElementById('bPlay'); if (!S || !play || S.dataset.dp) return; S.dataset.dp = '1';
    const keep = ['tBest', 'tCoins', 'bSkins'].map(id => document.getElementById(id)).filter(Boolean), nOps = Object.keys(OPS).length, nMaps = MAPS.filter(m => !m.hidden).length;
    const css = document.createElement('style'); css.textContent = `
      #sTitle.dp-start { place-items: stretch; padding: 0; overflow: hidden; background: linear-gradient(90deg, rgba(7,9,13,.95) 0%, rgba(7,9,13,.82) 34%, rgba(7,9,13,.25) 66%, rgba(7,9,13,.45) 100%), linear-gradient(0deg, rgba(7,9,13,.9) 0%, rgba(7,9,13,0) 32%); }
      .dp-wrap { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 4vh clamp(28px, 8vw, 110px) 54px; font-family: 'Chakra Petch', system-ui, sans-serif; color: #efe9dc; max-width: 820px; box-sizing: border-box; animation: dpIn .7s ease-out both; }
      .dp-eyebrow { display: flex; align-items: center; gap: 12px; font-weight: 700; letter-spacing: .34em; font-size: clamp(10px, 1.7vh, 13px); color: #35e0c8; text-transform: uppercase; }
      .dp-eyebrow::before { content: ''; width: 34px; height: 2px; background: #35e0c8; }
      .dp-title { font-family: 'Chakra Petch', system-ui, sans-serif; font-weight: 700; font-size: clamp(46px, 14.5vh, 138px); line-height: .88; letter-spacing: -.015em; margin: clamp(6px, 1.4vh, 14px) 0 clamp(8px, 1.6vh, 14px); text-transform: uppercase; color: #efe9dc; text-shadow: 0 6px 30px rgba(0,0,0,.45); }
      .dp-title span { color: #f43f3f; }
      .dp-tag { color: #b8c0cc; font-size: clamp(13px, 2.2vh, 18px); font-weight: 600; line-height: 1.4; margin: 0 0 clamp(16px, 4.2vh, 38px); max-width: 540px; }
      .dp-act { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
      #sTitle.dp-start #bPlay { all: unset; box-sizing: border-box; cursor: pointer; position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 16px; font-family: 'Chakra Petch', system-ui, sans-serif; font-weight: 700;
        font-size: clamp(22px, 4.6vh, 38px); letter-spacing: .14em; color: #0c1016; background: #f43f3f; padding: clamp(10px, 2.2vh, 18px) clamp(40px, 6vw, 70px) clamp(10px, 2.2vh, 18px) clamp(30px, 4.5vw, 52px);
        clip-path: polygon(0 0, 100% 0, calc(100% - 24px) 100%, 0 100%); transition: transform .12s ease, filter .12s ease, background .3s; }
      #sTitle.dp-start #bPlay:hover { transform: translateX(5px); filter: brightness(1.08); }
      #sTitle.dp-start #bPlay:active { transform: translateX(2px) scale(.99); }
      #sTitle.dp-start #bPlay::after { content: ''; position: absolute; top: 0; bottom: 0; width: 70px; left: -90px; background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.32), rgba(255,255,255,0)); animation: dpSheen 3.2s ease-in-out infinite; }
      #sTitle.dp-start #bPlay.dp-wait { background: #2b313b; color: #aab2bf; }
      #sTitle.dp-start #bPlay.dp-wait::after { display: none; }
      #sTitle.dp-start #bPlay b { font-weight: 700; font-size: .8em; }
      .dp-side { display: flex; flex-direction: column; gap: 7px; }
      .dp-status { font-size: 11px; letter-spacing: .24em; color: #8d97a6; font-weight: 700; text-transform: uppercase; }
      .dp-bar { width: 170px; height: 3px; background: rgba(239,233,220,.1); overflow: hidden; }
      .dp-bar i { display: block; height: 100%; width: 40%; background: #35e0c8; animation: dpLoad 1.1s ease-in-out infinite; }
      .dp-bar.dp-done i { width: 100%; animation: none; background: #35e0c8; }
      .dp-modes { margin-top: clamp(14px, 3.4vh, 30px); display: flex; gap: 8px; flex-wrap: wrap; }
      .dp-modes span { font-size: 11px; font-weight: 700; letter-spacing: .16em; color: #c9cfd8; padding: 6px 11px; border: 1px solid rgba(239,233,220,.16); background: rgba(12,16,22,.55); }
        backdrop-filter: blur(8px); font-family: 'Chakra Petch', system-ui, sans-serif; font-size: 12.5px; font-weight: 600; color: #b8c0cc; animation: dpIn .9s .15s ease-out both; }
      .dp-ops { position: absolute; left: 0; right: 0; bottom: 0; height: 34px; overflow: hidden; border-top: 1px solid rgba(239,233,220,.08); background: rgba(7,9,13,.72); }
      .dp-ops div { display: inline-block; white-space: nowrap; line-height: 34px; animation: dpTick 46s linear infinite; font-family: 'Chakra Petch', system-ui, sans-serif; font-weight: 700; font-size: 12px; letter-spacing: .32em; }
      .dp-ops span { margin-right: 46px; } .dp-ops em { font-style: normal; color: #5f6876; letter-spacing: .2em; margin-left: 10px; font-weight: 600; }
      @keyframes dpTick { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes dpSheen { 0%, 55% { left: -90px; } 100% { left: 110%; } }
      @keyframes dpLoad { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
      @keyframes dpIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
      @media (max-height: 520px) { .dp-wrap { padding-bottom: 44px; } .dp-modes { display: none; } .dp-ops { height: 28px; } .dp-ops div { line-height: 28px; font-size: 10.5px; } }
      @media (max-height: 420px) { .dp-tag { display: none; } }`;
    document.head.appendChild(css);
    S.classList.add('dp-start'); S.innerHTML = '';
    const ops = Object.values(OPS).map(O => `<span style="color:${O.col}">${O.n}<em>${String(O.role || '').toUpperCase()}</em></span>`).join('');
    S.insertAdjacentHTML('beforeend', `<div class="dp-wrap"><div class="dp-eyebrow">Tactical shooter · 1v1 to 5v5</div><h1 class="dp-title">Duel<span>point</span></h1>
      <p class="dp-tag">${nOps} agents, ${nMaps} maps, one charge. Buy your guns, plant on the site or hold it, and win the round.</p>
      <div class="dp-act"><span id="dpPlaySlot"></span><div class="dp-side"><div class="dp-status" id="dpStatus">Loading the world</div><div class="dp-bar" id="dpBar"><i></i></div></div></div>
      <div class="dp-modes"><span>STANDARD</span><span>SWIFT</span><span>RANKED</span><span>ONLINE</span><span>PRACTICE</span></div></div>
      <div class="dp-ops"><div>${ops}${ops}</div></div><div id="dpKeep" hidden></div>`);
    document.getElementById('dpPlaySlot').replaceWith(play); const hold = document.getElementById('dpKeep'); for (const k of keep) hold.appendChild(k);
    // PLAY says LOADING (and the bar runs) until the 3D world is up
    const st = document.getElementById('dpStatus'), bar = document.getElementById('dpBar');
    const tick = () => { const on = ready, bad = failed; play.classList.toggle('dp-wait', !on); play.innerHTML = on ? 'PLAY <b>›</b>' : bad ? 'PLAY' : 'LOADING';
      st.textContent = on ? 'Ready' : bad ? 'The 3D could not load: check your connection' : 'Loading the world'; bar.classList.toggle('dp-done', on); if (!on && !bad) setTimeout(tick, 200); };
    tick();
  }
  if (typeof document !== 'undefined' && typeof window !== 'undefined') setTimeout(startScreen, 0);
