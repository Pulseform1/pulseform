  /* ---------- 85 ui: menus, rooms, results, the bow shop and settings (page elements over the 3D view) ---------- */
  const UI = { open: null, el: null, joinErr: '', creating: false, shopSel: 'longbow', prev: null, from: 'main', previewing: false, mode: '1v1', oneShot: false };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CSS = `
  #aw{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;font-family:Nunito,system-ui,sans-serif;color:#fff;pointer-events:none}
  #aw.on{pointer-events:auto;background:radial-gradient(ellipse at center,rgba(10,30,70,.25),rgba(8,20,50,.7))}
  #aw .pn{pointer-events:auto;width:min(760px,94vw);max-height:92vh;overflow:auto;background:linear-gradient(180deg,rgba(28,72,150,.95),rgba(18,48,108,.97));border:3px solid rgba(255,255,255,.85);border-radius:22px;padding:22px 24px;box-shadow:0 8px 0 rgba(8,24,60,.6),0 24px 60px rgba(0,0,0,.45)}
  #aw h1{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;letter-spacing:.04em;font-size:clamp(44px,8vw,74px);margin:0;color:#ffd23a;-webkit-text-stroke:2px #5a3a00;text-shadow:0 5px 0 #b06a00,0 10px 24px rgba(0,0,0,.35)}
  #aw h2{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:28px;margin:0 0 12px;color:#ffd23a;letter-spacing:.03em;text-shadow:0 3px 0 rgba(0,0,0,.3)}
  #aw .awsub{color:rgba(255,255,255,.85);margin:6px 0 18px;font-size:15px;font-weight:700}
  #aw button{font:900 15px Nunito,system-ui;color:#fff;background:rgba(255,255,255,.16);border:0;border-radius:14px;padding:11px 16px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.28);transition:filter .15s,transform .08s;text-shadow:0 1px 0 rgba(0,0,0,.25)}
  #aw button:hover{filter:brightness(1.12)} #aw button:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.28)} #aw button:disabled{opacity:.45;cursor:default}
  #aw button.go{background:linear-gradient(180deg,#5fe06b,#2fae3d);color:#fff;box-shadow:0 5px 0 #1d7a29;text-shadow:0 2px 0 rgba(0,0,0,.25)}
  #aw button.sel{outline:3px solid #ffd23a;background:rgba(255,210,58,.22)}
  #aw .col{display:flex;flex-direction:column;gap:12px} #aw .awrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center} #aw .grow{flex:1}
  #aw .awbig{font-size:20px;padding:15px 20px;font-family:'Lilita One',Nunito,sans-serif;font-weight:400;letter-spacing:.03em} #aw .muted{color:rgba(255,255,255,.72);font-size:13px;font-weight:700} #aw .err{color:#ffb38a;font-weight:800;min-height:20px}
  #aw .awcard{background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.22);border-radius:16px;padding:12px 14px}
  #aw .code{font-family:'Lilita One',Nunito,sans-serif;font-size:48px;letter-spacing:.14em;color:#ffd23a;text-shadow:0 4px 0 rgba(0,0,0,.3)}
  #aw input,#aw select{font:800 16px Nunito;background:rgba(0,0,0,.25);color:#fff;border:2px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 12px}
  #aw .team{flex:1;min-width:200px} #aw .pl{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.2);margin-top:6px;font-weight:900}
  #aw .tag{font-size:11px;font-weight:900;padding:2px 8px;border-radius:8px;background:rgba(255,255,255,.18)} #aw .tag.ok{background:#2fae3d;color:#fff} #aw .tag.gold{background:#ffd23a;color:#3a2600}
  #aw .coins{font-weight:900;color:#ffd23a} #aw .bows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #aw .bow{cursor:pointer;text-align:left} #aw canvas.prev{width:100%;height:260px;border-radius:16px;background:radial-gradient(circle at 50% 40%,#8fd0ff,#2a6fc9);cursor:grab;display:block}
  #aw .top{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
  #aw .rules li{margin:3px 0} #aw .rules{margin:6px 0 0 18px;padding:0;color:rgba(255,255,255,.9);font-size:14px;font-weight:700}
  #aw .slider{width:100%} #aw .bar{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);pointer-events:auto}
  @media (max-width:640px){#aw .pn{padding:16px} #aw .bows{grid-template-columns:1fr}}`;
  function uiInit() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    UI.el = document.createElement('div'); UI.el.id = 'aw'; document.body.appendChild(UI.el);
    UI.el.addEventListener('click', e => { audioInit(); const b = e.target.closest('[data-a]'); if (b && !b.disabled) { if (AU.ready) S.click(); act(b.dataset.a, b.dataset.v, b); } });
    UI.el.addEventListener('input', e => { const t = e.target; if (t.dataset.set) setting(t.dataset.set, t.type === 'checkbox' ? t.checked : t.value); });
    UI.el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && e.target.id === 'awCode') act('doJoin'); if (e.key === 'Enter' && e.target.id === 'awName') e.target.blur(); if (e.key === 'Escape') act('back'); });
    UI.el.addEventListener('change', e => { if (e.target.id === 'awName') { CFG.name = (e.target.value || '').trim().slice(0, 16) || CFG.name; saveCfg(); sendRoom({ t: 'name', name: CFG.name }); } });
    on('ui', () => render()); on('profile', () => render());
    on('joined', m => { UI.creating = false; if (m.results) return; if (m.phase === 'lobby') openMenu('room'); else closeMenu(); });
    on('connErr', msg => { UI.creating = false; UI.joinErr = msg; openMenu(UI.from === 'create' ? 'create' : 'join'); });
    on('roundStart', () => { if (CL.src === 'online' && UI.open && UI.open !== 'settings') closeMenu(); });
    on('results', () => { unlockMouse(); setTimeout(() => { if (CL.phase === 'results') { openMenu('results'); loadProfile(); } }, CL.mode === 'ffa' ? 600 : 2400); });
  }
  function openMenu(name) { UI.open = name; if (name) { unlockMouse(); if (ME.drawing) cancelDraw(true); resetInput(); } render(); }
  function closeMenu() { UI.open = null; render(); if (CL.src) lockMouse(); }
  function setting(k, v) {
    if (k === 'sens' || k === 'touchSens' || k === 'vol') CFG[k] = +v; else if (k === 'fov') { CFG.fov = +v; if (X) { X.camera.fov = CFG.fov; X.camera.updateProjectionMatrix(); } } else if (k === 'invert') CFG.invert = !!v;
    else if (k === 'quality') { CFG.quality = v; if (X) applyQuality(); } else if (k === 'aimLine') CFG.aimLine = v; saveCfg();
  }
  const inviteLink = code => location.origin.startsWith('http') ? `${location.origin}${location.pathname}?room=${code}${QS.get('server') ? '&server=' + encodeURIComponent(QS.get('server')) : ''}` : `https://box.pulseform.org/games/arrowwood?room=${code}`;
  async function copy(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const i = document.createElement('input'); i.value = t; document.body.append(i); i.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (er) {} i.remove(); return ok; } }
  function act(a, v, el) {
    switch (a) {
      case 'friends': UI.from = 'create'; UI.joinErr = ''; openMenu('create'); break;
      case 'join': UI.from = 'join'; UI.joinErr = ''; openMenu('join'); setTimeout(() => { const i = document.getElementById('awCode'); i && i.focus(); }, 30); break;
      case 'mode': UI.mode = v; if (v === 'ffa') UI.oneShot = true; render(); break;
      case 'oneShot': UI.oneShot = !UI.oneShot; render(); break;
      case 'create': UI.creating = true; UI.joinErr = ''; render(); connect(newCode(), { mode: UI.mode, oneShot: UI.mode === 'ffa' || UI.oneShot }); break;
      case 'doJoin': { const c = (document.getElementById('awCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) { UI.joinErr = 'Room codes are 4 letters or numbers.'; render(); break; } UI.joinErr = ''; UI.creating = true; render(); connect(c, null); break; }
      case 'practice': stopPractice(); startPractice(); closeMenu(); break;
      case 'bots': UI.botMode = UI.botMode || '1v1'; UI.botLevel = UI.botLevel || 'normal'; openMenu('bots'); break;
      case 'botMode': UI.botMode = v; render(); break;
      case 'botLevel': UI.botLevel = v; render(); break;
      case 'botGo': startBotMatch(UI.botMode, UI.botLevel); closeMenu(); break;
      case 'botsAgain': leaveRoom(); act('bots'); break;
      case 'shop': UI.back = UI.open; openMenu('shop'); loadProfile(); break;
      case 'settings': UI.back = UI.open; openMenu('settings'); break;
      case 'howto': UI.back = UI.open; openMenu('howto'); break;
      case 'back': if (UI.open === 'shop' || UI.open === 'settings' || UI.open === 'howto') { openMenu(UI.back && UI.back !== UI.open ? UI.back : CL.conn && CL.ids.online ? 'room' : 'main'); } else if (UI.open === 'pause') closeMenu(); else if (UI.open === 'create' || UI.open === 'join' || UI.open === 'bots') openMenu('main'); break;
      case 'resume': closeMenu(); break;
      case 'leave': leaveRoom(); stopPractice(); openMenu('main'); break;
      case 'leavePractice': stopPractice(); openMenu(CL.conn && CL.ids.online ? 'room' : 'main'); break;
      case 'room': openMenu('room'); break;
      case 'team': sendRoom({ t: 'team', team: +v }); break;
      case 'move': sendRoom({ t: 'move', id: v }); break;
      case 'ready': { const me = CL.lobby.find(q => q.id === CL.ids.online); sendRoom({ t: 'ready', v: !(me && me.ready) }); break; }
      case 'rmode': sendRoom({ t: 'mode', mode: v, oneShot: CL.oneShot }); break;
      case 'roneShot': sendRoom({ t: 'mode', mode: CL.mode, oneShot: !CL.oneShot }); break;
      case 'start': sendRoom({ t: 'start' }); break;
      case 'warmup': startPractice(); closeMenu(); break;
      case 'copyCode': copy(CL.code).then(ok => { el.textContent = ok ? 'Copied!' : CL.code; setTimeout(render, 1400); }); break;
      case 'copyLink': copy(inviteLink(CL.code)).then(ok => { el.textContent = ok ? 'Link copied!' : 'Copy failed'; setTimeout(render, 1400); }); break;
      case 'share': if (navigator.share) navigator.share({ title: 'ARROWWOOD', text: `Join my ARROWWOOD room ${CL.code}`, url: inviteLink(CL.code) }).catch(() => {}); break;
      case 'rematch': sendRoom({ t: 'rematch' }); break;
      case 'toRoom': sendRoom({ t: 'lobby' }); openMenu('room'); break;
      case 'pickBow': UI.shopSel = v; render(); break;
      case 'buy': api('buy', { bow: UI.shopSel }).then(p => { if (p.error) { UI.shopErr = p.error; } else { UI.shopErr = ''; if (AU.ready) S.cashout([X.camera.position.x, X.camera.position.y, X.camera.position.z]); } Object.assign(PROFILE, p.coins != null ? p : {}); afterEquip(); render(); }).catch(() => { UI.shopErr = 'Could not reach the server.'; render(); }); break;
      case 'equip': if (TESTER) { PROFILE.equipped = UI.shopSel; try { localStorage.setItem('aw-tester-bow', UI.shopSel); } catch (e) {} afterEquip(); render(); break; } api('equip', { bow: UI.shopSel }).then(p => { if (p.error) UI.shopErr = p.error; else UI.shopErr = ''; Object.assign(PROFILE, p.coins != null ? p : {}); afterEquip(); render(); }).catch(() => { UI.shopErr = 'Could not reach the server.'; render(); }); break;
      case 'previewFin': previewFinisher(UI.shopSel); break;
      case 'retry': if (CL.conn) { CL.conn.tries = 1; CL.conn.state = 'lost'; CL.conn.open(); } break;
    }
  }
  function afterEquip() { sendRoom({ t: 'bow', bow: PROFILE.equipped }); if (X) buildViewModel(PROFILE.equipped, meP() ? teamCol(meP().team, meP().slot, CL.mode) : W.TEAMS[0].col); const me = meP(); if (me) me.bow = PROFILE.equipped; }
  const MODES = { '1v1': ['1v1 DUEL', 'Two archers. First to five round wins.'], '2v2': ['2v2 AMBUSH', 'Bring a teammate. First to five round wins.'], ffa: ['FREE FOR ALL', 'Up to 8. 2½ minutes. One shot, one kill.'] };
  const rulesFor = (mode, oneShot) => mode === 'ffa' ? ['Everyone for themselves, up to eight archers.', 'The match lasts 2½ minutes; most eliminations wins.', 'One shot, one kill: any hit takes someone out.', 'You come back a few seconds later somewhere new.', 'Six arrows each life; bundles come back every so often.'] :
    ['First to <b>five round wins</b>. The score shows between rounds, like 3–2.', 'One life each per round. At <b>4–4</b>, the next round wins the match.', oneShot ? '<b>One-shot rules:</b> any hit eliminates.' : 'A full-draw headshot eliminates; strong body hits take two; weak shots and limb hits only wound.', 'Six arrows each round. Bundles of three wait in the open; you can pull your own misses out of trees and walls.', 'After 80 seconds the Stone Bridge clearing opens for overtime: hold it to win the round.', mode === '2v2' ? 'If you go down, you watch your teammate until the round ends.' : 'Both archers down on the same instant: the round is replayed.'];
  function render() {
    if (!UI.el) return; const o = UI.open; UI.el.className = o ? 'on' : ''; if (!o) { UI.el.innerHTML = ''; stopShopPreview(); return; }
    const focus = document.activeElement && document.activeElement.id; if ((focus === 'awName' || focus === 'awCode') && UI.el.querySelector('#' + focus)) { if (o === 'room') renderRoomPlayers(); return; }
    const coins = `<span class="coins">◆ ${PROFILE.loaded ? PROFILE.coins : '…'}</span>`;
    let h = '';
    if (o === 'main') h = `<div class="pn" style="text-align:center"><h1>ARROWWOOD</h1><div class="awsub">Take cover in the King's Wood. Draw. Breathe. Land the last arrow.</div>
      <div class="col" style="max-width:420px;margin:0 auto"><button class="go awbig" data-a="bots">Play vs bots</button>${TESTER ? '' : '<button class="go awbig" data-a="friends">Play with friends</button><button class="awbig" data-a="join">Join a room</button>'}<button class="awbig" data-a="practice">Practice range</button>
      <div class="awrow"><button class="grow" data-a="shop">Bow shop ${coins}</button><button class="grow" data-a="settings">Settings</button><button class="grow" data-a="howto">How to play</button></div></div>
      ${TESTER ? '<p class="muted" style="margin-top:14px">Tester build: bot matches and the practice range work here. Online rooms and coins turn on once Arrowwood is live on Pulsebox. Every bow is unlocked so you can try its finisher.</p>' : PROFILE.err ? `<p class="muted" style="margin-top:14px">${esc(PROFILE.err)}</p>` : ''}</div>`;
    else if (o === 'create') h = `<div class="pn"><div class="top"><h2>Make a room</h2><button data-a="back">Back</button></div><div class="awsub">Pick how you want to play. You'll get a code and a link for your friends.</div>
      <div class="awrow">${Object.entries(MODES).map(([k, [n, d]]) => `<button class="grow ${UI.mode === k ? 'sel' : ''}" data-a="mode" data-v="${k}" style="min-width:180px;text-align:left"><b style="font-family:'Lilita One'">${n}</b><br><span class="muted">${d}</span></button>`).join('')}</div>
      ${UI.mode !== 'ffa' ? `<p><label class="awrow" style="cursor:pointer"><button data-a="oneShot" class="${UI.oneShot ? 'sel' : ''}">${UI.oneShot ? '✓ ' : ''}One-shot rules</button><span class="muted">any hit eliminates (off: realistic damage)</span></label></p>` : ''}
      <ul class="rules">${rulesFor(UI.mode, UI.oneShot).map(r => `<li>${r}</li>`).join('')}</ul>
      <p class="err">${esc(UI.joinErr)}</p><button class="go awbig" data-a="create" ${UI.creating ? 'disabled' : ''} style="width:100%">${UI.creating ? (CL.status || 'Making your room...') : 'Create room'}</button></div>`;
    else if (o === 'join') h = `<div class="pn" style="max-width:480px"><div class="top"><h2>Join a room</h2><button data-a="back">Back</button></div><div class="awsub">Type the 4-letter code your friend sees in their room.</div>
      <div class="awrow"><input id="awCode" class="grow" maxlength="4" placeholder="ABCD" style="font-size:28px;letter-spacing:.3em;text-transform:uppercase;text-align:center" value="${esc(UI.code || '')}"><button class="go awbig" data-a="doJoin" ${UI.creating ? 'disabled' : ''}>${UI.creating ? 'Joining...' : 'Join'}</button></div>
      <p class="err">${esc(UI.joinErr)}</p><p class="muted">Your name: <b>${esc(myName())}</b> (change it in the room)</p></div>`;
    else if (o === 'bots') h = `<div class="pn"><div class="top"><h2>Play vs bots</h2><button data-a="back">Back</button></div><div class="awsub">A full match against computer archers, right here (no room, no wait). Matches with bots don't pay coins.</div>
      <div class="awrow">${Object.entries({ '1v1': ['1v1 DUEL', 'You against one bot. First to five round wins.'], '2v2': ['2v2 AMBUSH', 'You and a bot partner against two bots.'], ffa: ['FREE FOR ALL', 'You and five bots, 2½ minutes, one shot one kill.'] }).map(([k, [n, d]]) => `<button class="grow ${UI.botMode === k ? 'sel' : ''}" data-a="botMode" data-v="${k}" style="min-width:180px;text-align:left"><b style="font-family:'Lilita One'">${n}</b><br><span class="muted">${d}</span></button>`).join('')}</div>
      <div class="awrow" style="margin:12px 0">${[['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']].map(([k, n]) => `<button class="grow ${UI.botLevel === k ? 'sel' : ''}" data-a="botLevel" data-v="${k}">${n}</button>`).join('')}</div>
      <ul class="rules">${rulesFor(UI.botMode, UI.botMode === 'ffa').map(r => `<li>${r}</li>`).join('')}</ul>
      <button class="go awbig" data-a="botGo" style="width:100%">Start the match</button></div>`;
    else if (o === 'room') h = roomHtml();
    else if (o === 'results') h = resultsHtml();
    else if (o === 'shop') h = shopHtml(coins);
    else if (o === 'settings') h = `<div class="pn" style="max-width:520px"><div class="top"><h2>Settings</h2><button data-a="back">Done</button></div><div class="col">
      <label>Graphics <select data-set="quality">${['auto', 'low', 'medium', 'high'].map(q => `<option ${CFG.quality === q ? 'selected' : ''}>${q}</option>`).join('')}</select> <span class="muted">now: ${X ? X.q : '…'} · low suits an iPad</span></label>
      <label>Aim line <select data-set="aimLine"><option value="full" ${CFG.aimLine !== 'short' ? 'selected' : ''}>Full: shows where the arrow lands</option><option value="short" ${CFG.aimLine === 'short' ? 'selected' : ''}>Short: just the first few metres</option></select></label>
      <label>Mouse sensitivity<input class="slider" type="range" min="0" max="1" step=".01" value="${CFG.sens}" data-set="sens"></label>
      <label>Touch aim sensitivity<input class="slider" type="range" min="0" max="1" step=".01" value="${CFG.touchSens}" data-set="touchSens"></label>
      <label>Field of view<input class="slider" type="range" min="60" max="95" step="1" value="${CFG.fov}" data-set="fov"></label>
      <label>Volume<input class="slider" type="range" min="0" max="1" step=".01" value="${CFG.vol}" data-set="vol"></label>
      <label class="awrow"><input type="checkbox" ${CFG.invert ? 'checked' : ''} data-set="invert"> Invert vertical aim</label></div></div>`;
    else if (o === 'howto') h = `<div class="pn"><div class="top"><h2>How to play</h2><button data-a="back">Back</button></div><ul class="rules">${GAME.how.map(t => `<li>${esc(t)}</li>`).join('')}
      <li>Your missed arrows stay where they land. Walk up to one of yours (if it's low enough to reach) to take it back.</li><li>Bundles of three arrows wait in the open: it's a risk to go and get them.</li><li>Your position is on the left: grid square, exact X and Z, and the way you're facing. F (or PING) marks a spot for your team.</li><li>Every bow plays the same. Skins change the look, the sound and the finisher.</li></ul></div>`;
    else if (o === 'pause') h = `<div class="pn" style="max-width:460px;text-align:center"><h2>${CL.src === 'practice' ? 'Practice range' : 'Match menu'}</h2><div class="awsub">${CL.src === 'online' ? 'The match keeps going while this is open.' : ''}</div><div class="col">
      <button class="go awbig" data-a="resume">Back to it</button>${CL.src === 'practice' ? `<button data-a="leavePractice">${CL.conn && CL.ids.online ? 'Back to the room' : 'Leave the range'}</button>` : botRoom() ? '' : `<button data-a="copyLink">Copy invite link (${esc(CL.code)})</button>`}
      <button data-a="settings">Settings</button><button data-a="shop">Bow shop</button>${CL.src === 'online' ? '<button data-a="leave">Leave the match</button>' : ''}</div></div>`;
    UI.el.innerHTML = h;
    if (o === 'shop') startShopPreview();
  }
  function roomPlayersHtml() {
    const me = CL.ids.online, host = CL.host === me, size = CL.lobby.length, ffa = CL.mode === 'ffa', need = { '1v1': 1, '2v2': 2 }[CL.mode];
    const pl = q => `<div class="pl"><span>${host && !ffa ? `<button data-a="move" data-v="${q.id}" title="Move to the other team" style="padding:2px 8px;margin-right:6px">⇄</button>` : ''}${esc(q.name)}${q.id === me ? ' <span class="tag">you</span>' : ''}${q.id === CL.host ? ' <span class="tag">host</span>' : ''}${q.on ? '' : ' <span class="tag">reconnecting</span>'}</span><span>${(q.ready || q.id === CL.host) ? '<span class="tag ok">ready</span>' : '<span class="tag">not ready</span>'}</span></div>`;
    if (ffa) return `<div class="awcard team"><b>Archers (${size}/8)</b>${CL.lobby.map(pl).join('')}</div>`;
    return [0, 1].map(t => { const list = CL.lobby.filter(q => q.team === t), mine = CL.lobby.find(q => q.id === me); return `<div class="awcard team"><div class="awrow" style="justify-content:space-between"><b style="color:${W.TEAMS[t].col}">${W.TEAMS[t].n.toUpperCase()} (${list.length}/${need})</b>${mine && mine.team !== t && list.length < need ? `<button data-a="team" data-v="${t}">Switch here</button>` : ''}</div>${list.map(pl).join('') || '<div class="muted" style="margin-top:8px">Waiting for an archer...</div>'}</div>`; }).join('');
  }
  function renderRoomPlayers() { const e = UI.el.querySelector('#awTeams'); if (e) e.innerHTML = roomPlayersHtml(); }
  function startReason() {
    const h = CL.lobby, need = { '1v1': 1, '2v2': 2 }[CL.mode];
    if (CL.mode === 'ffa') return h.length < 2 ? 'Need at least two archers' : h.some(q => !q.ready && q.id !== CL.host) ? 'Waiting for everyone to be ready' : '';
    for (const t of [0, 1]) { const n = h.filter(q => q.team === t).length; if (n !== need) return `${W.TEAMS[t].n} needs ${need} (has ${n})`; }
    return h.some(q => !q.ready && q.id !== CL.host) ? 'Waiting for everyone to be ready' : h.some(q => !q.on) ? 'Someone is reconnecting' : '';
  }
  function roomHtml() {
    if (!CL.ids.online) return `<div class="pn" style="text-align:center"><h2>${esc(CL.status || 'Connecting...')}</h2><button data-a="leave">Cancel</button></div>`;
    const me = CL.ids.online, host = CL.host === me, mine = CL.lobby.find(q => q.id === me), reason = startReason(), [mn] = MODES[CL.mode] || ['?'];
    return `<div class="pn"><div class="top"><div><div class="muted">ROOM CODE</div><div class="code">${esc(CL.code)}</div></div><div class="col" style="align-items:flex-end"><div class="awrow"><button data-a="copyCode">Copy code</button><button class="go" data-a="copyLink">Copy invite link</button>${navigator.share ? '<button data-a="share">Share</button>' : ''}</div><span class="muted">Friends open the link, or type the code under Join a room.</span></div></div>
      <div class="awcard" style="margin:10px 0"><div class="awrow" style="justify-content:space-between"><b style="font-family:'Lilita One';color:#e9c46a">${mn}${CL.mode !== 'ffa' && CL.oneShot ? ' · ONE-SHOT' : ''}</b>${host ? `<span class="awrow">${Object.keys(MODES).map(k => `<button class="${CL.mode === k ? 'sel' : ''}" data-a="rmode" data-v="${k}">${k.toUpperCase()}</button>`).join('')}${CL.mode !== 'ffa' ? `<button class="${CL.oneShot ? 'sel' : ''}" data-a="roneShot">One-shot ${CL.oneShot ? 'on' : 'off'}</button>` : ''}</span>` : '<span class="muted">The host picks the mode</span>'}</div><ul class="rules">${rulesFor(CL.mode, CL.oneShot).map(r => `<li>${r}</li>`).join('')}</ul></div>
      <div class="awrow" id="awTeams">${roomPlayersHtml()}</div>
      <div class="awrow" style="margin-top:14px"><label class="awrow muted">Your name <input id="awName" maxlength="16" value="${esc(myName())}"></label><span class="grow"></span>
      ${host ? `<button class="go awbig" data-a="start" ${reason ? 'disabled' : ''}>Start match</button>` : `<button class="${mine && mine.ready ? 'sel' : 'go'} awbig" data-a="ready">${mine && mine.ready ? '✓ Ready' : "I'm ready"}</button>`}</div>
      <p class="muted" style="text-align:right">${host ? esc(reason || 'Everyone is in. Start when you like.') : 'The host starts the match when everyone is ready.'}</p>
      <div class="awrow"><button data-a="warmup">Practice while you wait</button><button data-a="shop">Bow shop <span class="coins">◆ ${PROFILE.coins}</span></button><button data-a="settings">Settings</button><span class="grow"></span><button data-a="leave">Leave room</button></div>
      ${CL.status ? `<p class="err">${esc(CL.status)}</p>` : ''}</div>`;
  }
  function resultsHtml() {
    const r = CL.results; if (!r) return '<div class="pn">...</div>';
    const me = CL.ids.online, mine = CL.lobby.find(q => q.id === me), won = r.mode === 'ffa' ? r.winners.includes(me) : mine && r.winner === mine.team, coins = r.coins && r.coins[me];
    const votes = CL.votes.length, total = CL.lobby.filter(q => q.on).length;
    const head = r.reason === 'forfeit' ? 'The other side left' : r.mode === 'ffa' ? (won ? 'You topped the wood' : `${esc((r.board[0] || {}).name || '?')} wins`) : won ? 'Victory' : 'Defeat';
    return `<div class="pn" style="text-align:center"><h1 style="font-size:46px">${head}</h1>${botRoom() ? `<div class="muted">Against ${CL.conn.level} bots · no coins for bot matches</div>` : ''}
      ${r.mode !== 'ffa' ? `<div class="code" style="font-size:54px"><span style="color:${W.TEAMS[0].col}">${r.score[0]}</span> – <span style="color:${W.TEAMS[1].col}">${r.score[1]}</span></div><div class="muted">${W.TEAMS[0].n} vs ${W.TEAMS[1].n}</div>` : ''}
      <div class="awcard" style="margin:14px auto;max-width:460px;text-align:left">${r.board.map((b, i) => `<div class="pl"><span>${i + 1}. ${esc(b.name)}${b.id === me ? ' (you)' : ''}</span><span>${b.k} elims · ${b.d} outs</span></div>`).join('')}</div>
      ${coins ? `<p style="font-size:20px">+${coins} <span class="coins">◆</span> coins  <span class="muted">(balance ${PROFILE.coins})</span></p>` : ''}
      ${botRoom() ? `<div class="awrow" style="justify-content:center"><button class="go awbig" data-a="rematch">Play again</button><button data-a="botsAgain">Change match</button><button data-a="shop">Bow shop</button><button data-a="leave">Leave</button></div>` : `<div class="awrow" style="justify-content:center"><button class="go awbig" data-a="rematch" ${CL.votes.includes(me) ? 'disabled' : ''}>${CL.votes.includes(me) ? `Waiting for rematch (${votes}/${total})` : `Rematch${votes ? ` (${votes}/${total})` : ''}`}</button><button data-a="toRoom">Back to the room</button><button data-a="shop">Bow shop</button><button data-a="leave">Leave</button></div>`}</div>`;
  }
  function shopHtml(coins) {
    const sel = W.BOWS.find(b => b.id === UI.shopSel) || W.BOWS[0], own = PROFILE.owned.includes(sel.id), eq = PROFILE.equipped === sel.id;
    return `<div class="pn"><div class="top"><h2>Bow shop</h2><span>${coins}</span><button data-a="back">Back</button></div>
      <div class="awrow" style="align-items:stretch"><div style="flex:1.2;min-width:260px"><canvas class="prev" id="awPrev"></canvas><div class="muted" style="text-align:center;margin-top:4px">Drag to turn it</div></div>
      <div class="col" style="flex:1;min-width:240px"><b style="font-family:'Lilita One';font-size:20px;color:#e9c46a">${esc(sel.n)}</b><div class="muted">${esc(sel.d)}</div><div class="muted">Every bow shoots the same: skins change the look, the sound and the finisher.</div>
      <div class="awrow">${eq ? '<span class="tag gold">EQUIPPED</span>' : own ? `<button class="go" data-a="equip">Equip</button>` : `<button class="go" data-a="buy" ${PROFILE.coins < sel.price ? 'disabled' : ''}>Buy for ◆ ${sel.price}</button>`}<button data-a="previewFin">▶ Preview finisher</button></div>
      ${!own && PROFILE.coins < sel.price ? `<div class="muted">${sel.price - PROFILE.coins} more coins: finish matches (+40, +25 for a win).</div>` : ''}<div class="err">${esc(UI.shopErr || '')}</div></div></div>
      <div class="bows" style="margin-top:12px">${W.BOWS.map(b => `<button class="bow ${b.id === UI.shopSel ? 'sel' : ''}" data-a="pickBow" data-v="${b.id}"><b>${esc(b.n)}</b><br><span class="muted">${PROFILE.equipped === b.id ? 'Equipped' : PROFILE.owned.includes(b.id) ? 'Owned' : '◆ ' + b.price}</span></button>`).join('')}</div></div>`;
  }
  // a little turntable for the bow in the shop
  function startShopPreview() {
    const c = document.getElementById('awPrev'); if (!c || !window.THREE || !TEX.bark) return;
    if (!UI.prev) { const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, .05, 20); cam.position.set(0, 0, 2.6); sc.add(new THREE.HemisphereLight(LC('#e8eef2'), LC('#4a3f2a'), .9)); const d = new THREE.DirectionalLight(LC('#ffe2b6'), 1.6); d.position.set(1, 1.5, 2); sc.add(d); UI.prev = { r, sc, cam, rot: .6, drag: null, skin: '', bow: null }; }
    const P = UI.prev; c.replaceWith(P.r.domElement); P.r.domElement.className = 'prev'; P.r.domElement.id = 'awPrev'; const w = P.r.domElement.clientWidth || 360, h = 260; P.r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); P.r.setSize(w, h, false); P.cam.aspect = w / h; P.cam.updateProjectionMatrix();
    if (P.skin !== UI.shopSel) { if (P.bow) P.sc.remove(P.bow.g); P.bow = makeBow(UI.shopSel); P.bow.g.rotation.z = .12; P.sc.add(P.bow.g); P.skin = UI.shopSel; }
    const el = P.r.domElement; el.onpointerdown = e => { P.drag = e.clientX; el.setPointerCapture(e.pointerId); }; el.onpointermove = e => { if (P.drag != null) { P.rot += (e.clientX - P.drag) * .012; P.drag = e.clientX; } }; el.onpointerup = () => P.drag = null;
    if (!P.raf) { const loop = () => { if (UI.open !== 'shop') { P.raf = 0; return; } P.raf = requestAnimationFrame(loop); if (P.drag == null) P.rot += .008; P.bow.g.rotation.y = P.rot; P.bow.setDraw(.35 + Math.sin(performance.now() / 700) * .3, true); P.r.render(P.sc, P.cam); }; P.raf = requestAnimationFrame(loop); }
  }
  function stopShopPreview() { if (UI.prev && UI.prev.raf) { cancelAnimationFrame(UI.prev.raf); UI.prev.raf = 0; } }
  // preview a finisher on a stand-in archer in the wood, with the real finisher camera
  function previewFinisher(skin) {
    if (!X || UI.previewing) return; UI.previewing = true; const back = UI.open; UI.open = null; render();
    const id = 'preview', p = player(id); p.name = 'Volunteer'; p.team = 1; p.bow = 'longbow'; p.alive = false; ensureModel(p);
    const x = 70, z = 60, y = W.terrainH(x, z); p.model.root.position.set(x, y, z);
    ME.cam = 'fp'; X.camera.position.set(x, y + 1.6, z + 9); X.camera.lookAt(x, y + 1, z);
    startFinisher({ v: id, k: null, bow: skin, zone: 'body', p: [x, y, z], yaw: 0, d: [0, -.1, -1], kn: 'You', vn: 'Volunteer' });
    const f = FINS[FINS.length - 1]; if (f) { f.mine = true; ME.cam = 'finisher'; ME.fin = f; finisherCam(f); }
    setTimeout(() => { UI.previewing = false; const pp = CL.players.get(id); if (pp) { emit('playerGone', pp); CL.players.delete(id); } FINS.forEach(f => f.objs.forEach(o => o.parent && o.parent.remove(o))); FINS = []; if (BILLS) { BILLS.list = []; COINS3.list = []; } ME.cam = 'fp'; ME.fin = null; openMenu(back || 'shop'); }, 2900);
  }
