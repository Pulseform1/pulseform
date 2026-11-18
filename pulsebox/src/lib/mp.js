/* Shared by the online multiplayer games: the lobby (your name, play with bots, create or join a room by its 4-letter code,
   who is in, start) and the room connection (/api/room/CODE, relayed by the Rooms Durable Object in api.js).
   The first player in a room is the host: the host picks the seats and starts every match.
   A game fills in MP.opts and calls MP.show() from GAME.reset():
     { max, min, bots: seats to fill with bots (0 = none), solo: label of the offline button (false = none),
       config(): match settings the host sends, onStart(cfg, roster), onMsg(m), onLeave(id), onHost(id),
       onClose(): when set, a Back button (and Escape) closes the lobby, leaving any room, and this is called,
       custom: true for a game that draws its own lobby (no lobby box; it calls MP.create(), MP.join(code), MP.players()),
       onRoster(): someone joined, left or became host; onStatus(text): a connection message for the player,
       rejoin: true to get back into the same room by itself when the connection drops in the middle of a game (the game
         hears onDrop(true) when it drops, onRejoin(oldId, newId) when it is back, or onDrop(false) then onLeave(-1) when
         it gives up); everyone else hears the usual leave, then { t: 'mp-rejoin', old } from the new id }
   While a room is open the connection pings itself every 25 s, so a quiet lobby is never dropped as idle.
   A game with rejoin also keeps its own count of who is really there: everyone sends a heartbeat to the room every 2 s,
   anyone silent for 7 s is gone (a connection that died without closing stays listed on the server for minutes), and the
   host is the lowest id still there, which every device works out the same way.
   roster: [{ id, name, col, bot, seat }] in seat order, the same on every device. Bots are run by the host. */
const MP = (() => {
  const COLS = ['#ff4d6d', '#3ec5ff', '#ffd23f', '#5cf28a', '#c77dff', '#ff9f43', '#f2f2f2', '#ff7ad9'];
  const BOTS = ['Bot Blip', 'Bot Zap', 'Bot Mango', 'Bot Pixel', 'Bot Turbo', 'Bot Noodle', 'Bot Ziggy'];
  const WSHOST = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.host : 'box.pulseform.org';
  const opts = {};
  // ?room=CODE (from the hub's Play with friends): skip the title screen and walk straight into that room
  const AUTO = (() => { try { const q = new URLSearchParams(location.search).get('room') || ''; return /^[A-Za-z0-9]{4}$/.test(q) ? q.toUpperCase() : ''; } catch (e) { return ''; } })();
  let autoDone = false;
  let ws = null, me = 0, host = 0, code = '', pending = null, box = null, name = '', rejoin = null;   // rejoin: { old, n } while getting back in after a drop
  const players = new Map(), skinOf = new Map();
  const mySkin = () => (typeof K !== 'undefined' && K.save && K.save.skin) || 0;
  try { name = localStorage.getItem('pbx-mp-name') || ''; } catch (e) {}
  const $m = id => document.getElementById('mp-' + id), esc = s => String(s).replace(/[<>&"]/g, '');
  const online = () => !!(ws && ws.readyState === 1 && me);
  function build() {
    if (box) return;
    const st = document.createElement('style');
    st.textContent = `#mp-box .card{max-width:470px}#mp-box input{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--edge);background:rgba(0,0,0,.4);color:#fff;font:800 18px Nunito,sans-serif;margin:6px 0;text-align:center}#mp-box .code{font-family:var(--display);font-size:46px;letter-spacing:.18em;color:var(--accent)}#mp-box ul{list-style:none;padding:0;margin:8px 0;text-align:left}#mp-box li{padding:7px 12px;border-radius:12px;background:rgba(255,255,255,.07);margin:5px 0;font-weight:800}#mp-box .msg{min-height:20px;color:#ff9a9a;font-weight:800;font-size:14px;margin:6px 0 0}#mp-box .or{color:var(--muted);font-weight:800;font-size:13px;margin:12px 0 2px}`;
    document.head.appendChild(st);
    box = document.createElement('div'); box.className = 'scr'; box.id = 'mp-box'; box.hidden = true;
    box.innerHTML = `<div class="card"><h2 class="title" id="mp-title"></h2><p class="sub" id="mp-sub"></p>
      <input id="mp-name" maxlength="12" placeholder="Your name">
      <div id="mp-out"><button class="big" id="mp-solo"></button><p class="or">or play online with friends</p>
        <div class="row"><button id="mp-create">Create a room</button><button id="mp-joinb">Join a room</button></div>
        <div id="mp-joinbox" hidden><input id="mp-code" maxlength="4" placeholder="ROOM CODE" autocomplete="off"><button class="big" id="mp-joingo">Join</button></div></div>
      <div id="mp-in" hidden><p class="sub" style="margin:8px 0 0">Room code: tell your friends</p><div class="code" id="mp-codeshow"></div><ul id="mp-list"></ul>
        <button class="big" id="mp-start">Start</button><p class="hint" id="mp-wait"></p><div class="row"><button id="mp-leave">Leave the room</button></div></div>
      <p class="msg" id="mp-msg"></p><div class="row"><button id="mp-back">Back</button></div></div>`;
    document.body.appendChild(box);
    for (const id of ['name', 'code']) $m(id).onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && id === 'code') $m('joingo').click(); };
    $m('solo').onclick = () => { saveName(); leave(); K.audio && K.audio(); start(); };
    $m('create').onclick = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; connect(Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('')); };
    $m('joinb').onclick = () => { $m('joinbox').hidden = false; $m('code').focus(); };
    $m('joingo').onclick = () => { const c = ($m('code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return msg('Room codes are 4 letters.'); connect(c); };
    $m('start').onclick = () => { K.audio && K.audio(); start(); };
    $m('leave').onclick = () => { leave(); refresh(); };
    $m('back').onclick = () => close();
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && box && !box.hidden && opts.onClose) { e.stopPropagation(); close(); } }, true);
  }
  function saveName() { const el = $m('name'); if (!el) return name || 'Player'; name = (el.value || '').replace(/[^\w .'-]/g, '').trim().slice(0, 12) || 'Player'; try { localStorage.setItem('pbx-mp-name', name); } catch (e) {} return name; }
  function msg(s) { const el = $m('msg'); if (el) el.textContent = s || ''; if (opts.onStatus) opts.onStatus(s || ''); }
  function list() { return [...(online() ? [[me, { name }]] : []), ...[...players].filter(([id]) => !stale.has(id))].map(([id, p]) => ({ id, name: p.name })).sort((a, b) => a.id - b.id); }
  function refresh() {
    if (opts.onRoster) opts.onRoster();
    if (!box) return;
    const on = online();
    $m('title').textContent = GAME.title; $m('sub').textContent = opts.sub || GAME.tagline;
    $m('name').value = name; $m('out').hidden = on; $m('in').hidden = !on;
    $m('solo').hidden = opts.solo === false; $m('back').parentNode.hidden = !opts.onClose; $m('solo').textContent = opts.solo || 'Play with bots';
    if (!on) return;
    const ps = list();
    $m('codeshow').textContent = code;
    $m('list').innerHTML = ps.map((p, i) => `<li style="border-left:7px solid ${COLS[i % 8]}">${esc(p.name)}${p.id === me ? ' (you)' : ''}${p.id === host ? ' · host' : ''}</li>`).join('') + (opts.bots && ps.length < opts.max ? `<li style="opacity:.55">+ ${opts.max - ps.length} bots fill the empty seats</li>` : '');
    const enough = ps.length >= (opts.min || 1);
    $m('start').hidden = host !== me; $m('start').disabled = !enough; $m('start').style.opacity = enough ? 1 : .4;
    $m('wait').textContent = host !== me ? 'Waiting for the host to start.' : enough ? (ps.length > 1 ? 'Everyone in? Start when ready.' : 'Waiting for friends to join...') : `Needs at least ${opts.min} players.`;
  }
  // keep the connection busy: networks and proxies drop a socket that has been silent for a minute or two
  setInterval(() => { if (online() && !opts.rejoin) send({ t: 'mp-ping', to: me }); }, 25000);
  // who is really there (games with rejoin): heard from in the last few seconds, and the host is the lowest of them
  const seen = new Map(), STALE = 7000, stale = new Set();
  function elect() {
    if (!opts.rejoin || !online()) return; let h = me; for (const id of players.keys()) if (!stale.has(id) && id < h) h = id;
    if (h !== host) { host = h; refresh(); if (opts.onHost) opts.onHost(host); }
  }
  setInterval(() => {
    if (!opts.rejoin || !online()) return; send({ t: 'mp-hb' }); const now = performance.now();
    for (const id of players.keys()) if (!stale.has(id) && now - (seen.get(id) || now) > STALE) { stale.add(id); refresh(); if (opts.onLeave) opts.onLeave(id); }   // gone quiet: as good as gone
    elect();
  }, 2000);
  function connect(c, again) {
    if (!again) rejoin = null;
    saveName(); leave(); K.audio && K.audio(); msg(again ? 'Reconnecting...' : 'Connecting...');
    try { ws = new WebSocket(`wss://${WSHOST}/api/room/${c}?n=${encodeURIComponent(name)}&g=${encodeURIComponent(GAME.id)}`); } catch (e) { msg('Could not connect.'); return; }
    code = c; const my = ws;
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
    ws.onclose = () => {
      if (ws !== my) return; const old = me; ws = null; me = 0; players.clear();
      if (rejoin) return;   // a try at getting back in failed: the next one is already on its way
      if (opts.rejoin && old && code && typeof K !== 'undefined' && K.state === 'play') { rejoin = { old, n: 0 }; if (opts.onDrop) opts.onDrop(true); setTimeout(retry, 300); return; }
      lost();
    };
  }
  function lost() { if (opts.onLeave && K.state === 'play' && (opts.custom || (box && box.hidden))) opts.onLeave(-1); else { refresh(); msg('Disconnected from the room.'); } }
  // the connection dropped mid-game: try the same room again for about fifteen seconds before giving up
  function retry() {
    if (!rejoin) return; if (me) { rejoin = null; return; }
    if (rejoin.n++ >= 7) { rejoin = null; if (opts.onDrop) opts.onDrop(false); lost(); return; }
    connect(code, true); setTimeout(retry, 2200);
  }
  function onNet(m) {
    if (m.from != null && players.has(m.from)) { seen.set(m.from, performance.now()); if (stale.has(m.from)) { stale.delete(m.from); refresh(); elect(); } }   // heard from: still here (or back)
    switch (m.t) {
      case 'full': msg('That room is full.'); leave(); refresh(); return;
      case 'hello':
        me = m.id; host = m.host; players.clear(); stale.clear(); m.players.forEach(p => { if (p.id !== me) { players.set(p.id, { name: p.name }); seen.set(p.id, performance.now()); } });
        if (rejoin && opts.rejoin) { stale.add(rejoin.old); }   // our own old connection may still be listed: it is not anyone
        if (players.size + 1 > opts.max && !rejoin) { msg(`This game takes up to ${opts.max} players.`); leave(); }
        msg(''); refresh(); send({ t: 'mp-skin', s: mySkin() });
        if (opts.rejoin) { host = 0; elect(); }
        if (rejoin) { const old = rejoin.old; rejoin = null; send({ t: 'mp-rejoin', old }); if (opts.onRejoin) opts.onRejoin(old, me); if (opts.onDrop) opts.onDrop(false); }
        return;
      case 'mp-ping': case 'mp-hb': return;
      case 'mp-rejoin': if (players.has(m.old)) { stale.add(m.old); refresh(); } elect(); break;   // back under a new id: the old one is nobody now (the game hears this too)
      case 'mp-skin': skinOf.set(m.from, m.s | 0); return;
      case 'join': players.set(m.id, { name: m.name }); seen.set(m.id, performance.now()); send({ t: 'mp-skin', s: mySkin() }); refresh(); if (opts.onJoin) opts.onJoin(m.id, m.name); elect(); return;
      case 'leave': { const was = stale.has(m.id); players.delete(m.id); stale.delete(m.id); refresh(); if (opts.onLeave && !was) opts.onLeave(m.id); elect(); return; }
      case 'host': if (opts.rejoin) return; host = m.id; refresh(); if (opts.onHost) opts.onHost(m.id); return;   // games with rejoin pick their own host
      case 'mp-start': if (K.state !== 'play') pending = m; else begin(m); return;
    }
    if (opts.onMsg) opts.onMsg(m);
  }
  function begin(m) { if (box) box.hidden = true; opts.onStart(m.cfg || {}, m.roster); }
  function start() {
    const ps = online() ? list() : [{ id: 0, name: name || 'You' }];
    const nSk = (GAME.skins || []).length || 1;
    const roster = ps.slice(0, opts.max).map((p, i) => ({ id: p.id, name: p.name, col: COLS[i], seat: i, skin: p.id === (online() ? me : 0) ? mySkin() : (skinOf.get(p.id) || 0) }));
    const fill = online() ? (opts.bots ? opts.max : 0) : (opts.bots || opts.soloSeats || 1);
    let b = 0; while (roster.length < fill) roster.push({ id: 'b' + roster.length, name: BOTS[b++ % BOTS.length], col: COLS[roster.length], bot: true, seat: roster.length, skin: Math.floor(Math.random() * nSk) });
    const m = { t: 'mp-start', cfg: opts.config ? opts.config() : {}, roster };
    send(m); begin(m);
  }
  function send(m) { if (online()) ws.send(JSON.stringify(m)); }
  // back out of the lobby to the game's own menu (leaving any room); only for games that say where 'back' goes
  function close() { quit(); pending = null; if (box) box.hidden = true; msg(''); if (opts.onClose) opts.onClose(); }
  function leave() { const w = ws; ws = null; me = 0; host = 0; players.clear(); stale.clear(); if (w) try { w.close(); } catch (e) {} }
  function quit() { rejoin = null; leave(); }   // leaving on purpose: no getting back in
  function show() {
    if (opts.custom) { if (pending && online()) { const p = pending; pending = null; return begin(p); } if (AUTO && !autoDone && !online()) { autoDone = true; connect(AUTO); } return; }
    build();
    if (pending && online()) { const p = pending; pending = null; return begin(p); }
    box.hidden = false; refresh();
    if (AUTO && !autoDone && !online()) { autoDone = true; connect(AUTO); }
  }
  if (AUTO) { const go = () => { const b = document.getElementById('bPlay'); if (b && typeof K !== 'undefined' && K.state === 'title') b.click(); else setTimeout(go, 150); }; setTimeout(go, 250); }
  return {
    opts, show, start, send, leave: quit, close, online, colors: COLS,
    get rejoining() { return !!rejoin; }, _drop() { if (ws) ws.close(); },   // _drop: for tests, a connection that falls over
    // for games with their own lobby: make a room, join one by code, who is in (in join order), your name
    create() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; connect(Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('')); },
    join(c) { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return msg('Room codes are 4 letters.'); connect(c); },
    players: () => online() ? list() : [], setName(n) { name = String(n || '').replace(/[^\w .'-]/g, '').trim().slice(0, 12) || 'Player'; try { localStorage.setItem('pbx-mp-name', name); } catch (e) {} },
    get autoRoom() { return AUTO; },
    hide() { if (box) box.hidden = true; },
    to(id, m) { m.to = id; send(m); },
    isHost: () => !online() || host === me,
    get id() { return online() ? me : 0; }, get hostId() { return online() ? host : 0; }, get code() { return code; }, get name() { return name || 'You'; },
  };
})();
