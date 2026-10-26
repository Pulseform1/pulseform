/* Shared by the online multiplayer games: the lobby (your name, play with bots, create or join a room by its 4-letter code,
   who is in, start) and the room connection (/api/room/CODE, relayed by the Rooms Durable Object in api.js).
   The first player in a room is the host: the host picks the seats and starts every match.
   A game fills in MP.opts and calls MP.show() from GAME.reset():
     { max, min, bots: seats to fill with bots (0 = none), solo: label of the offline button (false = none),
       config(): match settings the host sends, onStart(cfg, roster), onMsg(m), onLeave(id), onHost(id) }
   roster: [{ id, name, col, bot, seat }] in seat order, the same on every device. Bots are run by the host. */
const MP = (() => {
  const COLS = ['#ff4d6d', '#3ec5ff', '#ffd23f', '#5cf28a', '#c77dff', '#ff9f43', '#f2f2f2', '#ff7ad9'];
  const BOTS = ['Bot Blip', 'Bot Zap', 'Bot Mango', 'Bot Pixel', 'Bot Turbo', 'Bot Noodle', 'Bot Ziggy'];
  const WSHOST = /^https?:/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname) ? location.host : 'box.pulseform.org';
  const opts = {};
  let ws = null, me = 0, host = 0, code = '', pending = null, box = null, name = '';
  const players = new Map();
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
      <p class="msg" id="mp-msg"></p></div>`;
    document.body.appendChild(box);
    for (const id of ['name', 'code']) $m(id).onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter' && id === 'code') $m('joingo').click(); };
    $m('solo').onclick = () => { saveName(); leave(); K.audio && K.audio(); start(); };
    $m('create').onclick = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; connect(Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('')); };
    $m('joinb').onclick = () => { $m('joinbox').hidden = false; $m('code').focus(); };
    $m('joingo').onclick = () => { const c = ($m('code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) return msg('Room codes are 4 letters.'); connect(c); };
    $m('start').onclick = () => { K.audio && K.audio(); start(); };
    $m('leave').onclick = () => { leave(); refresh(); };
  }
  function saveName() { name = ($m('name').value || '').replace(/[^\w .'-]/g, '').trim().slice(0, 12) || 'Player'; try { localStorage.setItem('pbx-mp-name', name); } catch (e) {} return name; }
  function msg(s) { $m('msg').textContent = s || ''; }
  function list() { return [...(online() ? [[me, { name }]] : []), ...players].map(([id, p]) => ({ id, name: p.name })).sort((a, b) => a.id - b.id); }
  function refresh() {
    if (!box) return;
    const on = online();
    $m('title').textContent = GAME.title; $m('sub').textContent = opts.sub || GAME.tagline;
    $m('name').value = name; $m('out').hidden = on; $m('in').hidden = !on;
    $m('solo').hidden = opts.solo === false; $m('solo').textContent = opts.solo || 'Play with bots';
    if (!on) return;
    const ps = list();
    $m('codeshow').textContent = code;
    $m('list').innerHTML = ps.map((p, i) => `<li style="border-left:7px solid ${COLS[i % 8]}">${esc(p.name)}${p.id === me ? ' (you)' : ''}${p.id === host ? ' · host' : ''}</li>`).join('') + (opts.bots && ps.length < opts.max ? `<li style="opacity:.55">+ ${opts.max - ps.length} bots fill the empty seats</li>` : '');
    const enough = ps.length >= (opts.min || 1);
    $m('start').hidden = host !== me; $m('start').disabled = !enough; $m('start').style.opacity = enough ? 1 : .4;
    $m('wait').textContent = host !== me ? 'Waiting for the host to start.' : enough ? (ps.length > 1 ? 'Everyone in? Start when ready.' : 'Waiting for friends to join...') : `Needs at least ${opts.min} players.`;
  }
  function connect(c) {
    saveName(); leave(); K.audio && K.audio(); msg('Connecting...');
    try { ws = new WebSocket(`wss://${WSHOST}/api/room/${c}?n=${encodeURIComponent(name)}`); } catch (e) { msg('Could not connect.'); return; }
    code = c; const my = ws;
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onNet(m); };
    ws.onclose = () => { if (ws !== my) return; ws = null; me = 0; players.clear(); if (opts.onLeave && K.state === 'play' && box && box.hidden) opts.onLeave(-1); else { refresh(); msg('Disconnected from the room.'); } };
  }
  function onNet(m) {
    switch (m.t) {
      case 'full': msg('That room is full.'); leave(); refresh(); return;
      case 'hello':
        me = m.id; host = m.host; players.clear(); m.players.forEach(p => { if (p.id !== me) players.set(p.id, { name: p.name }); });
        if (players.size + 1 > opts.max) { msg(`This game takes up to ${opts.max} players.`); leave(); }
        msg(''); refresh(); return;
      case 'join': players.set(m.id, { name: m.name }); refresh(); if (opts.onJoin) opts.onJoin(m.id, m.name); return;
      case 'leave': players.delete(m.id); refresh(); if (opts.onLeave) opts.onLeave(m.id); return;
      case 'host': host = m.id; refresh(); if (opts.onHost) opts.onHost(m.id); return;
      case 'mp-start': if (K.state !== 'play') pending = m; else begin(m); return;
    }
    if (opts.onMsg) opts.onMsg(m);
  }
  function begin(m) { if (box) box.hidden = true; opts.onStart(m.cfg || {}, m.roster); }
  function start() {
    const ps = online() ? list() : [{ id: 0, name: name || 'You' }];
    const roster = ps.slice(0, opts.max).map((p, i) => ({ id: p.id, name: p.name, col: COLS[i], seat: i }));
    const fill = online() ? (opts.bots ? opts.max : 0) : (opts.bots || opts.soloSeats || 1);
    let b = 0; while (roster.length < fill) roster.push({ id: 'b' + roster.length, name: BOTS[b++ % BOTS.length], col: COLS[roster.length], bot: true, seat: roster.length });
    const m = { t: 'mp-start', cfg: opts.config ? opts.config() : {}, roster };
    send(m); begin(m);
  }
  function send(m) { if (online()) ws.send(JSON.stringify(m)); }
  function leave() { const w = ws; ws = null; me = 0; host = 0; players.clear(); if (w) try { w.close(); } catch (e) {} }
  function show() {
    build();
    if (pending && online()) { const p = pending; pending = null; return begin(p); }
    box.hidden = false; refresh();
  }
  return {
    opts, show, start, send, leave, online, colors: COLS,
    hide() { if (box) box.hidden = true; },
    to(id, m) { m.to = id; send(m); },
    isHost: () => !online() || host === me,
    get id() { return online() ? me : 0; }, get hostId() { return online() ? host : 0; }, get code() { return code; }, get name() { return name || 'You'; },
  };
})();
