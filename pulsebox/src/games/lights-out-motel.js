/* Lights Out Motel: the night clerk decides who gets a room. Some guests aren't human, and each night the tells get subtler.
   Night 1: they aren't in the guest book. Night 2: their ID photo doesn't match. Night 3: no shadow under the lamp.
   Night 4: they don't know their room. Night 5: anything goes, and guests lose patience faster.
   Let one in and the lights go out at dawn. Turn away two real guests in one night and you're fired. */
// @use person
const GAME = {
  id: 'lights-out-motel', title: 'Lights Out Motel', tagline: 'Five nights at the front desk. Not every guest is human.',
  font: 'Creepster', accent: '#ff4f7b', accent2: '#4ff0c8', bg: '#05040a', noSkins: true, noHud: true, scoreLabel: 'Guests handled right',
  how: ['Check the guest book, their ID, the lamp and their answers.', 'Hand over a key if they\'re human. Pull the shutter if they\'re not.', 'Let one of them in and the lights go out. Wear headphones.'],
  skins: [{ name: 'Clerk', price: 0 }],
};
(() => {
  const WX = 230, WY = 34, WW = 820, WH = 400, GX = 640;
  const FIRST = ['Mara', 'Dale', 'Ruth', 'Ellis', 'June', 'Otis', 'Vera', 'Hank', 'Iris', 'Lloyd', 'Nina', 'Walt', 'Opal', 'Gus', 'Edie', 'Floyd', 'Hazel', 'Earl', 'Doris', 'Clyde', 'Lena', 'Abe', 'Faye', 'Roy'];
  const LAST = ['Pike', 'Hollow', 'Crane', 'Mercer', 'Vance', 'Doyle', 'Ashby', 'Reyes', 'Kowal', 'Burke', 'Lund', 'Pratt', 'Sato', 'Greer', 'Moss', 'Okafor', 'Banks', 'Fenn'];
  const SKIN = ['#f1c7a5', '#d9a07a', '#b97850', '#8a5636', '#5e3a24', '#f5d6c0'], HAIR = ['#1c1410', '#4a2e1a', '#8a5a2b', '#c9a35a', '#d8d2c8', '#7a1f1a', '#2e2e2e'];
  const SHIRT = ['#3a4a6a', '#6a2a2a', '#2a5a3a', '#5a4a2a', '#4a3a5a', '#2a4a5a', '#6a6a6a'], EYES = ['#3a2a1a', '#2a4a7a', '#3a6a3a', '#5a4a2a'];
  const NIGHT_TELLS = [null, ['list'], ['list', 'id'], ['id', 'shadow'], ['shadow', 'room', 'id'], ['list', 'id', 'shadow', 'room']];
  const CALLS = [null,
    'Manager here. Rule one: only give keys to people in the guest book. Nobody else. I mean it. If they\'re not in the book, pull the shutter.',
    'Night two. Some of them have figured out the names. Check every ID. If the photo doesn\'t match the face, shutter.',
    'They\'ve started faking IDs. But they can\'t fake a shadow. Turn on the lamp and look behind them.',
    'Last night one of them had a shadow. Ask which room they booked. Real guests know. The book has the rooms.',
    'This is the last night. They know all our tricks now. Check everything. And whatever you do... keep the lights on.'];
  let night, guests, gi, g, phase, phaseT, lamp, view, strikes, complaints, admittedOther, bubble, bubbleT, flash, nextFlash, rain, drops, rooms, callOpen, deathT, scareT, hover, best0, amb, patience, asked, lastNight;

  /* ---------- people ---------- */
  function person() {
    return { skin: K.pick(SKIN), hair: K.pick(HAIR), style: K.irand(0, 3), eyes: K.pick(EYES), shirt: K.pick(SHIRT), glasses: Math.random() < .3, beard: Math.random() < .25, hat: Math.random() < .15 };
  }
  function makeNight(n) {
    const count = 6, list = [], used = new Set(), others = n === 1 ? 2 : K.irand(2, 3);
    const roomsLeft = K.pick([[1, 2, 3, 4, 5, 6, 7, 8]]).sort(() => Math.random() - .5);
    for (let i = 0; i < count + 2; i++) { let nm; do { nm = K.pick(FIRST) + ' ' + K.pick(LAST); } while (used.has(nm)); used.add(nm); list.push({ name: nm, room: roomsLeft[i % 8], done: false }); }
    const order = Array.from({ length: count }, (_, i) => i < others).sort(() => Math.random() - .5);
    return { list, queue: order.map((other, i) => {
      const booking = list[i], look = person(), tells = NIGHT_TELLS[n];
      const q = { other, look, name: booking.name, room: booking.room, id: { ...look }, tell: null, booking };
      if (other) {
        q.tell = K.pick(tells);
        if (q.tell === 'list') { let nm; do { nm = K.pick(FIRST) + ' ' + K.pick(LAST); } while (used.has(nm)); q.name = nm; q.booking = null; }
        if (q.tell === 'id') { const k = K.pick(['hair', 'glasses', 'eyes', 'beard']); if (k === 'hair') { let h; do { h = K.pick(HAIR); } while (h === look.hair); q.id.hair = h; } else if (k === 'eyes') { q.id.glasses = !look.glasses; } else q.id[k] = !look[k]; }
        if (q.tell === 'room') { let r; do { r = K.irand(1, 8); } while (r === q.room); q.saysRoom = r; }
      }
      q.saysRoom = q.saysRoom || q.room;
      return q;
    }) };
  }
  /* ---------- sound ---------- */
  function ambience() {
    if (amb || !K.ac || K.bot) return;
    const ac = K.ac, n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; const rg = ac.createGain(); rg.gain.value = .07;
    src.connect(lp).connect(rg).connect(K.master); src.start();
    const hum = ac.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 60; const hf = ac.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 180; const hg = ac.createGain(); hg.gain.value = .025;
    hum.connect(hf).connect(hg).connect(K.master); hum.start();
    const drone = ac.createOscillator(); drone.type = 'sine'; drone.frequency.value = 43; const dg = ac.createGain(); dg.gain.value = 0; drone.connect(dg).connect(K.master); drone.start();
    amb = { rg, hg, dg };
  }
  const thunder = () => { if (!K.ac || K.bot) return; K.noise(2.2, .35, 40); setTimeout(() => K.noise(1.2, .2, 30), 300); };
  const bell = () => { K.sfx(1318, .9, 'sine', .12); K.sfx(1046, 1.1, 'sine', .1, 0, .18); };
  function scream() { if (!K.ac || K.bot) return; K.noise(1.2, .5, 900); K.sfx(900, 1.1, 'sawtooth', .22, -700); K.sfx(1400, .9, 'square', .1, -1100); }
  const say = (t, d = 4.5) => { bubble = t; bubbleT = d; if (!K.bot) K.sfx(220 + Math.random() * 80, .05, 'triangle', .04); };

  /* ---------- flow ---------- */
  function startNight(n) {
    night = n; const nn = makeNight(n); guests = nn.queue; GAME.list = nn.list; gi = -1; strikes = 0; complaints = 0; admittedOther = false;
    rooms = Array.from({ length: 8 }, () => ({ on: false, other: false }));
    phase = 'call'; phaseT = 0; callOpen = !K.bot; view = null; g = null; lamp = false; bubble = ''; asked = false;
    if (K.bot) { phase = 'gap'; phaseT = 1; }
  }
  GAME.reset = () => {
    best0 = K.save.night || 1; lastNight = K.bot ? K.irand(1, 5) : best0;
    flash = 0; nextFlash = 6; deathT = 0; scareT = 0; hover = null;
    rain = Array.from({ length: 130 }, () => ({ x: WX + Math.random() * WW, y: WY + Math.random() * WH, v: K.rand(700, 1000) }));
    drops = Array.from({ length: 26 }, () => ({ x: WX + Math.random() * WW, y: WY + Math.random() * WH, r: K.rand(2, 5) }));
    ambience(); startNight(lastNight);
  };
  function nextGuest() {
    gi++; asked = false; lamp = false; view = null;
    if (gi >= guests.length) { endNight(); return; }
    g = guests[gi]; g.x = GX + K.rand(-60, 60); g.walk = 0; phase = 'arrive'; phaseT = 0; patience = Math.max(18, 42 - night * 5);
    if (!K.bot) K.sfx(80, .2, 'sine', .08);
  }
  function decide(admit) {
    if (phase !== 'wait') return;
    view = null; phase = 'leave'; phaseT = 0;
    if (admit) {
      bell(); rooms[g.room - 1].on = true;
      if (g.other) { admittedOther = true; rooms[g.room - 1].other = true; say('Thank you. I\'ll be in room ' + g.room + '.', 3); g.smile = true; }
      else { K.add(1); say(K.pick(['Thanks. Long drive.', 'Finally. Thank you.', 'Appreciate it. Quiet night?', 'Great, thanks.']), 2.5); }
      if (g.booking) g.booking.done = true;
    } else {
      K.noise(.5, .25, 200); K.sfx(70, .4, 'square', .12, -30);
      if (g.other) { K.add(1); phase = 'reveal'; phaseT = 0; K.shake(18); K.flash('#300', .5); scream(); }
      else { complaints++; say(K.pick(['Are you serious? I booked this!', 'Unbelievable. I\'m leaving a review.', 'I have a reservation! Hello?']), 2.5); K.sfx(160, .3, 'sawtooth', .06); if (complaints >= 2) { phase = 'fired'; phaseT = 0; } }
    }
  }
  function endNight() {
    phase = admittedOther ? 'lightsout' : 'dawn'; phaseT = 0; g = null;
    if (!admittedOther && !K.bot) { K.save.night = Math.max(K.save.night || 1, Math.min(5, night + 1)); K.persist(); K.chime(392, [0, 3, 7, 12]); }
  }
  /* ---------- input ---------- */
  const BTN = {
    book: { x: 40, y: 600, w: 150, h: 92, t: 'Guest book', k: '1' }, id: { x: 205, y: 600, w: 150, h: 92, t: 'Check ID', k: '2' },
    lamp: { x: 370, y: 600, w: 150, h: 92, t: 'Lamp', k: '3' }, ask: { x: 535, y: 600, w: 150, h: 92, t: 'Ask room', k: '4' },
    admit: { x: 830, y: 596, w: 200, h: 100, t: 'Give key', k: 'K' }, refuse: { x: 1045, y: 596, w: 200, h: 100, t: 'Shutter', k: 'X' },
  };
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function act(k) {
    if (callOpen) { if (k === 'answer') { callOpen = false; phase = 'gap'; phaseT = 0; } return; }
    if (phase === 'dawn' && k === 'next') { startNight(night + 1 > 5 ? 5 : night + 1); return; }
    if (phase !== 'wait') return;
    if (k === 'book' || k === 'id') { view = view === k ? null : k; K.sfx(500, .05, 'triangle', .05); if (k === 'id' && !g.idShown) { g.idShown = true; say(g.other ? 'Here.' : 'Sure, here you go.', 1.6); } }
    if (k === 'lamp') { lamp = !lamp; K.sfx(lamp ? 900 : 500, .04, 'square', .06); }
    if (k === 'ask' && night >= 4) { asked = true; say(`Room ${g.saysRoom}. I booked room ${g.saysRoom}.`, 3.5); }
    if (k === 'admit') decide(true); if (k === 'refuse') decide(false);
  }
  GAME.down = (x, y) => {
    if (callOpen) { if (inB({ x: 490, y: 470, w: 300, h: 70 }, x, y)) act('answer'); return; }
    if (phase === 'dawn') { if (inB({ x: 490, y: 470, w: 300, h: 70 }, x, y) && night < 5) act('next'); else if (night >= 5 && phaseT > 2) win(); return; }
    if (view && !Object.values(BTN).some(b => inB(b, x, y))) { view = null; return; }
    for (const [k, b] of Object.entries(BTN)) if (inB(b, x, y)) act(k);
  };
  GAME.move = (x, y) => { hover = null; for (const [k, b] of Object.entries(BTN)) if (inB(b, x, y)) hover = k; };
  GAME.key = (c, d) => {
    if (!d) return;
    const m = { Digit1: 'book', Digit2: 'id', Digit3: 'lamp', Digit4: 'ask', KeyK: 'admit', KeyX: 'refuse', Space: callOpen ? 'answer' : phase === 'dawn' ? 'next' : null, Enter: callOpen ? 'answer' : phase === 'dawn' ? 'next' : null }[c];
    if (m) { if (m === 'next' && night >= 5) { if (phaseT > 2) win(); } else act(m); }
  };
  function win() { if (K.state !== 'play') return; K.coin(25); K.over({ title: 'Checkout time', text: 'You kept the lights on for five nights. The sun is up, and the motel is quiet. For now.' }); }
  let botT = 0;
  GAME.bot = dt => {
    if (phase === 'dawn') { if (phaseT > 2.5) startNight(night % 5 + 1); return; }
    if (phase !== 'wait') return; botT += dt;
    if (botT > 1 && !view && !g.idShown) act('id'); if (botT > 2.4 && view) view = null; if (botT > 3 && !lamp && night >= 3) act('lamp'); if (botT > 3.6 && night >= 4 && !asked) act('ask');
    if (botT > 5) { botT = 0; const right = Math.random() < .85; decide(right ? !g.other : g.other); }
  };

  GAME.update = dt => {
    phaseT += dt; bubbleT -= dt; if (bubbleT <= 0) bubble = '';
    if (g) g.lean = K.clamp((g.lean || 0) + (g.other && view && phase === 'wait' ? dt * .35 : -dt * 2), 0, 1);
    if (phase === 'gap' && !K.bot && !GAME.ev && Math.random() < dt * .25) { GAME.ev = K.pick(['figure', 'knock', 'knock', 'figure']); if (GAME.ev === 'knock') { [0, .35, .7].forEach(d => K.sfx(90, .12, 'square', .2, -20, d)); K.noise(.08, .2, 300); } else nextFlash = Math.min(nextFlash, .6); }
    if (phase !== 'gap') GAME.ev = null;
    for (const r of rain) { r.y += r.v * dt; r.x -= r.v * .08 * dt; if (r.y > WY + WH) { r.y = WY - 10; r.x = WX + Math.random() * WW; } }
    nextFlash -= dt; if (nextFlash <= 0) { flash = 1; nextFlash = K.rand(9, 20); setTimeout(thunder, K.rand(300, 1400)); } flash = Math.max(0, flash - dt * 2.2);
    if (amb) amb.dg.gain.setTargetAtTime(phase === 'lightsout' ? .18 : (g && g.other && phase === 'wait') ? .04 : 0, K.ac.currentTime, .5);
    if (phase === 'gap' && phaseT > (gi < 0 ? 1.5 : K.rand(1.5, 2.5))) nextGuest();
    else if (phase === 'arrive') { g.walk = Math.min(1, phaseT / 2.2); if (phaseT > 2.2) { phase = 'wait'; phaseT = 0; say(`Evening. I've got a reservation. ${g.name}.`); bell(); } }
    else if (phase === 'wait' && !K.bot) { patience -= dt; if (patience <= 0) { if (g.other) { phase = 'leave'; phaseT = 0; say('...', 1); } else { complaints++; say('Forget it. I\'ll sleep in my car.', 2.5); phase = complaints >= 2 ? 'fired' : 'leave'; phaseT = 0; } } }
    else if (phase === 'leave') { g.walk = Math.max(0, 1 - phaseT / 1.6); if (phaseT > 1.8) { phase = 'gap'; phaseT = 0; } }
    else if (phase === 'reveal' && phaseT > 1.6) { phase = 'leave'; phaseT = .8; }
    else if (phase === 'fired' && phaseT > 2.8 && K.bot) K.over();
    else if (phase === 'fired' && phaseT > 2.8 && K.state === 'play') K.over({ title: 'You\'re fired', text: 'Two real guests turned away in one night. The manager\'s voice on the phone was very calm. That was worse.' });
    else if (phase === 'lightsout') {
      if (phaseT > 1 && phaseT < 4.2) rooms.forEach((r, i) => { if (phaseT > 1 + i * .35) r.on = false; });
      if (phaseT > 4.2 && !scareT) { scareT = K.t; scream(); K.shake(30); if (K.bot) K.over(); else K.over({ title: 'Lights out', text: `You gave room ${rooms.findIndex(r => r.other) + 1} to something that wasn't a guest. It came back for the clerk.`, delay: 1800 }); }
    }
  };
  /* ---------- drawing ---------- */
  function btn(gr, k, b, label, enabled = true) {
    const hot = hover === k && enabled;
    gr.fillStyle = k === 'admit' ? (hot ? '#3a8a5a' : '#2a6a44') : k === 'refuse' ? (hot ? '#9a2a3a' : '#7a1f2c') : hot ? '#3a3448' : '#24202e';
    if (k === 'lamp' && lamp) gr.fillStyle = '#6a5a2a';
    if (view === k) gr.fillStyle = '#4a3a6a';
    gr.globalAlpha = enabled ? 1 : .35; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 14); gr.fill();
    gr.strokeStyle = 'rgba(255,255,255,.12)'; gr.lineWidth = 2; gr.stroke();
    gr.fillStyle = '#eee6f0'; gr.font = '22px Creepster, Impact'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(label, b.x + b.w / 2, b.y + b.h / 2 - 8);
    gr.font = '13px Nunito, sans-serif'; gr.fillStyle = 'rgba(255,255,255,.45)'; gr.fillText(`[${b.k}]`, b.x + b.w / 2, b.y + b.h - 16); gr.globalAlpha = 1;
  }
  function paper(gr, x, y, w, h) { gr.fillStyle = '#e9e2cf'; gr.shadowColor = 'rgba(0,0,0,.6)'; gr.shadowBlur = 30; gr.fillRect(x, y, w, h); gr.shadowBlur = 0; }
  GAME.draw = gr => {
    const v = K.view, dark = phase === 'lightsout' && phaseT > 4;
    gr.fillStyle = '#07060b'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (dark) { if (scareT) { const k = Math.min(1, (K.t - scareT) * 3); drawPerson(gr, g0(), GX, 300 - k * 60, 1.3 + k * 1.8, { reveal: 1 }); gr.fillStyle = `rgba(120,0,0,${.3 * k})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); } return; }
    // outside
    gr.save(); gr.beginPath(); gr.rect(WX, WY, WW, WH); gr.clip();
    const sky = gr.createLinearGradient(0, WY, 0, WY + WH); sky.addColorStop(0, '#0a0d1a'); sky.addColorStop(1, '#141020'); gr.fillStyle = sky; gr.fillRect(WX, WY, WW, WH);
    gr.fillStyle = '#05060c'; for (let i = 0; i < 14; i++) { const x = WX + i * 64; gr.beginPath(); gr.moveTo(x - 30, WY + 250); gr.lineTo(x, WY + 150 + (i * 37) % 60); gr.lineTo(x + 34, WY + 250); gr.fill(); }
    gr.fillStyle = '#121018'; gr.fillRect(WX, WY + 250, WW, 200);
    gr.strokeStyle = 'rgba(255,255,255,.08)'; gr.lineWidth = 4; for (let i = 0; i < 7; i++) { gr.beginPath(); gr.moveTo(WX + 60 + i * 120, WY + 300); gr.lineTo(WX + 20 + i * 140, WY + WH); gr.stroke(); }
    // neon sign
    const fl = Math.sin(K.t * 37) > .2 || Math.sin(K.t * 3.1) > -.6;
    gr.font = '46px Creepster, Impact'; gr.textAlign = 'left'; gr.textBaseline = 'alphabetic'; gr.shadowBlur = 24;
    gr.fillStyle = '#ff4f7b'; gr.shadowColor = '#ff4f7b'; gr.fillText('MOTEL', WX + 26, WY + 70);
    gr.font = '26px Creepster, Impact'; gr.fillStyle = fl ? '#4ff0c8' : '#123a30'; gr.shadowColor = fl ? '#4ff0c8' : 'transparent'; gr.fillText(night >= 5 ? 'NO VACANCY' : 'VACANCY', WX + 30, WY + 104); gr.shadowBlur = 0;
    // the guest, and their shadow if the lamp is on
    if (g && (phase === 'arrive' || phase === 'wait' || phase === 'leave' || phase === 'reveal')) {
      const s = (.45 + .55 * g.walk) * (1 + (g.lean || 0) * .22), y = WY + 140 + (1 - g.walk) * 70 + (g.lean || 0) * 30;
      gr.globalAlpha = Math.min(1, g.walk * 1.5);
      if (lamp && !(g.other && g.tell === 'shadow')) { gr.globalAlpha *= .9; drawPerson(gr, g.look, g.x - 120 * s, y + 10, s * 1.18, { silhouette: true }); gr.globalAlpha = Math.min(1, g.walk * 1.5); }
      const reveal = phase === 'reveal' ? Math.min(1, phaseT * 3) : 0;
      drawPerson(gr, g.look, g.x, y + reveal * 20, s * (1 + reveal * .35), { glow: g.other && flash > .3, reveal, smile: g.smile && phase === 'leave', look: Math.sin(K.t * .7) });
      gr.globalAlpha = 1;
      if (!lamp) { const sh = gr.createRadialGradient(g.x, y + 40, 60, g.x, y + 40, 360); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.55)'); gr.fillStyle = sh; gr.fillRect(WX, WY, WW, WH); }
      else { const lg = gr.createRadialGradient(g.x + 160, WY + WH, 40, g.x + 160, WY + WH, 520); lg.addColorStop(0, 'rgba(255,214,140,.25)'); lg.addColorStop(1, 'rgba(255,214,140,0)'); gr.fillStyle = lg; gr.fillRect(WX, WY, WW, WH); }
    }
    if (GAME.ev === 'figure' && flash > .15) { gr.globalAlpha = flash; drawPerson(gr, guests[0].look, WX + 140, WY + 250, .32, { silhouette: true }); gr.globalAlpha = 1; }
    gr.strokeStyle = 'rgba(170,190,255,.35)'; gr.lineWidth = 1.5; for (const r of rain) { gr.beginPath(); gr.moveTo(r.x, r.y); gr.lineTo(r.x - 3, r.y + 16); gr.stroke(); }
    if (flash > 0) { gr.fillStyle = `rgba(210,220,255,${flash * .55})`; gr.fillRect(WX, WY, WW, WH); }
    gr.fillStyle = 'rgba(255,255,255,.04)'; gr.beginPath(); gr.moveTo(WX + 100, WY); gr.lineTo(WX + 260, WY); gr.lineTo(WX + 60, WY + WH); gr.lineTo(WX - 100, WY + WH); gr.fill();
    gr.fillStyle = 'rgba(200,220,255,.25)'; for (const d of drops) { gr.beginPath(); gr.arc(d.x, d.y, d.r, 0, 7); gr.fill(); }
    gr.restore();
    // window frame and the shutter
    gr.strokeStyle = '#2a2230'; gr.lineWidth = 18; gr.strokeRect(WX, WY, WW, WH); gr.lineWidth = 8; gr.beginPath(); gr.moveTo(GX, WY); gr.lineTo(GX, WY + 60); gr.stroke();
    const shut = phase === 'reveal' || (phase === 'leave' && g && !rooms[g.room - 1].on && gi >= 0 && phaseT < 1.2) ? 1 : 0;
    if (shut) { gr.fillStyle = '#3a3440'; for (let i = 0; i < 12; i++) { gr.fillRect(WX, WY + i * 34, WW, 30); } if (phase === 'reveal') { gr.fillStyle = 'rgba(120,0,0,.6)'; for (let i = 0; i < 5; i++) { gr.beginPath(); gr.ellipse(GX - 120 + i * 60, WY + 180 + (i % 2) * 30, 16, 44, .2 * i, 0, 7); gr.fill(); } } }
    // speech
    if (bubble) {
      gr.font = '22px Nunito, sans-serif'; const w = Math.min(760, gr.measureText(bubble).width + 44);
      gr.fillStyle = 'rgba(10,8,16,.86)'; gr.beginPath(); gr.roundRect(GX - w / 2, WY + WH - 84, w, 56, 14); gr.fill();
      gr.fillStyle = '#f2ecdf'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(bubble, GX, WY + WH - 56);
    }
    // desk
    const desk = gr.createLinearGradient(0, 470, 0, H); desk.addColorStop(0, '#3a2618'); desk.addColorStop(1, '#1a100a'); gr.fillStyle = desk; gr.fillRect(v.x0, WY + WH + 20, v.x1 - v.x0, H);
    gr.fillStyle = '#4a3020'; gr.fillRect(v.x0, WY + WH + 20, v.x1 - v.x0, 10);
    // ID tray, clock and room board
    gr.fillStyle = '#15100c'; gr.fillRect(GX - 110, WY + WH + 2, 220, 20);
    const hr = 12 + Math.max(0, gi), clock = `${hr > 12 ? hr - 12 : hr}:${gi >= 0 && phase !== 'gap' ? '30' : '00'} AM`;
    gr.fillStyle = '#100808'; gr.fillRect(40, WY, 160, 70); gr.fillStyle = '#ff3a3a'; gr.shadowColor = '#ff3a3a'; gr.shadowBlur = 12; gr.font = '34px "Courier New", monospace'; gr.textAlign = 'center'; gr.fillText(clock, 120, WY + 46); gr.shadowBlur = 0;
    gr.fillStyle = '#c9bca8'; gr.font = '20px Creepster, Impact'; gr.fillText(`NIGHT ${night}`, 120, WY + 110);
    gr.fillStyle = '#1a1418'; gr.fillRect(1080, WY, 160, 300); gr.fillStyle = '#c9bca8'; gr.font = '18px Creepster, Impact'; gr.fillText('ROOMS', 1160, WY + 26);
    rooms.forEach((r, i) => { const x = 1100 + (i % 2) * 70, y = WY + 50 + Math.floor(i / 2) * 60, on = r.on && !(r.other && Math.sin(K.t * 23 + i) > .6); gr.fillStyle = on ? (r.other ? '#ffd88a' : '#ffe6a8') : '#2a2228'; if (on) { gr.shadowColor = '#ffd88a'; gr.shadowBlur = 14; } gr.fillRect(x, y, 50, 40); gr.shadowBlur = 0; gr.fillStyle = on ? '#3a2a10' : '#776a70'; gr.font = '20px Nunito, sans-serif'; gr.fillText(i + 1, x + 25, y + 21); });
    gr.fillStyle = '#c9bca8'; gr.font = '15px Nunito, sans-serif'; gr.fillText(`Complaints: ${complaints}/2`, 1160, WY + 286);
    // lamp
    gr.fillStyle = '#2a2a2a'; gr.fillRect(790, 520, 14, 60); gr.fillStyle = lamp ? '#ffd27a' : '#4a4038'; gr.beginPath(); gr.moveTo(760, 530); gr.lineTo(835, 530); gr.lineTo(815, 488); gr.lineTo(780, 488); gr.fill();
    if (lamp) { const lg = gr.createRadialGradient(797, 540, 10, 797, 540, 260); lg.addColorStop(0, 'rgba(255,210,120,.35)'); lg.addColorStop(1, 'rgba(255,210,120,0)'); gr.fillStyle = lg; gr.fillRect(540, 300, 520, 420); }
    // buttons
    const waiting = phase === 'wait';
    btn(gr, 'book', BTN.book, 'Guest book', waiting); btn(gr, 'id', BTN.id, 'Check ID', waiting); btn(gr, 'lamp', BTN.lamp, lamp ? 'Lamp: on' : 'Lamp: off', waiting);
    btn(gr, 'ask', BTN.ask, 'Ask room', waiting && night >= 4); btn(gr, 'admit', BTN.admit, 'Give key', waiting); btn(gr, 'refuse', BTN.refuse, 'Shutter', waiting);
    if (waiting && !K.bot) { gr.fillStyle = 'rgba(255,255,255,.12)'; gr.fillRect(830, 580, 415, 6); gr.fillStyle = patience < 8 ? '#ff4f7b' : '#c9bca8'; gr.fillRect(830, 580, 415 * Math.max(0, patience / Math.max(18, 42 - night * 5)), 6); }
    gr.fillStyle = 'rgba(255,60,120,.05)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    const vg = gr.createRadialGradient(640, 330, 260, 640, 360, 900); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.75)'); gr.fillStyle = vg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (let i = 0; i < 260; i++) { gr.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; gr.fillRect(v.x0 + Math.random() * (v.x1 - v.x0), v.y0 + Math.random() * (v.y1 - v.y0), 2, 2); }
    if (Math.random() < .004) { gr.fillStyle = 'rgba(0,0,0,.55)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    // book and ID views
    if (view === 'book') {
      paper(gr, 300, 60, 680, 500); gr.fillStyle = '#3a2a1a'; gr.font = '34px Creepster, Impact'; gr.textAlign = 'center'; gr.fillText(`Guest book · Night ${night}`, 640, 110);
      gr.font = '24px "Courier New", monospace'; gr.textAlign = 'left';
      GAME.list.forEach((b, i) => { const y = 160 + i * 46; gr.fillStyle = '#2a1a10'; gr.fillText(b.name, 360, y); gr.fillText('Room ' + b.room, 780, y); if (b.done) { gr.strokeStyle = '#7a1f1a'; gr.lineWidth = 3; gr.beginPath(); gr.moveTo(350, y - 7); gr.lineTo(920, y - 7); gr.stroke(); } gr.fillStyle = 'rgba(0,0,0,.12)'; gr.fillRect(350, y + 14, 580, 1); });
    }
    if (view === 'id' && g) {
      paper(gr, 370, 140, 540, 320); gr.fillStyle = '#d8e2ea'; gr.fillRect(370, 140, 540, 320); gr.fillStyle = '#2a4a7a'; gr.fillRect(370, 140, 540, 54);
      gr.fillStyle = '#fff'; gr.font = '28px Creepster, Impact'; gr.textAlign = 'left'; gr.fillText('DRIVER LICENSE', 392, 178);
      gr.save(); gr.beginPath(); gr.rect(392, 214, 180, 220); gr.clip(); gr.fillStyle = '#b8c4cc'; gr.fillRect(392, 214, 180, 220); drawPerson(gr, g.id, 482, 300, .62, {}); gr.restore();
      gr.fillStyle = '#1a2a3a'; gr.font = '24px "Courier New", monospace'; gr.fillText(g.name.toUpperCase(), 596, 250);
      gr.font = '18px "Courier New", monospace'; const hsh = [...g.name].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); gr.fillText(`DOB ${String(hsh % 12 + 1).padStart(2, '0')}/${String(hsh % 28 + 1).padStart(2, '0')}/19${60 + hsh % 39}`, 596, 290); gr.fillText(`EYES ${g.id.eyes === EYES[1] ? 'BLU' : g.id.eyes === EYES[2] ? 'GRN' : 'BRN'}`, 596, 322); gr.fillText(`ID ${(g.name.length * 7919) % 900000 + 100000}`, 596, 354);
    }
    // manager call, dawn card
    if (callOpen) {
      gr.fillStyle = 'rgba(0,0,0,.75)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#c9bca8'; gr.font = '40px Creepster, Impact'; gr.textAlign = 'center'; gr.fillText(`Night ${night} · The phone is ringing`, 640, 150);
      wrap(gr, CALLS[night], 640, 230, 760, 30, '22px Nunito, sans-serif', '#efe6d8');
      gr.fillStyle = '#2a6a44'; gr.beginPath(); gr.roundRect(490, 470, 300, 70, 16); gr.fill(); gr.fillStyle = '#fff'; gr.font = '28px Creepster, Impact'; gr.fillText('Hang up and open', 640, 507);
    }
    if (phase === 'dawn') {
      const k = Math.min(1, phaseT / 1.5); gr.fillStyle = `rgba(255,170,110,${.35 * k})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = `rgba(0,0,0,${.7 * k})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#ffd8a8'; gr.font = '64px Creepster, Impact'; gr.textAlign = 'center'; gr.fillText(night >= 5 ? 'You made it to morning' : `6:00 AM · Night ${night} survived`, 640, 300);
      gr.font = '24px Nunito, sans-serif'; gr.fillStyle = '#efe6d8'; gr.fillText(night >= 5 ? 'Tap to check out.' : 'Every room is still lit. Nobody wrong got in.', 640, 360);
      if (night < 5) { gr.fillStyle = '#2a6a44'; gr.beginPath(); gr.roundRect(490, 470, 300, 70, 16); gr.fill(); gr.fillStyle = '#fff'; gr.font = '28px Creepster, Impact'; gr.fillText(`Start night ${night + 1}`, 640, 507); }
    }
    if (phase === 'lightsout' && phaseT > 2.6) { gr.fillStyle = `rgba(0,0,0,${Math.min(1, (phaseT - 2.6) / 1.4)})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
  };
  const g0 = () => (guests.find(q => q.other && rooms[q.room - 1].other) || guests[0]).look;
  function wrap(gr, text, x, y, w, lh, font, color) {
    gr.font = font; gr.fillStyle = color; gr.textAlign = 'center'; const words = text.split(' '); let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (gr.measureText(t).width > w) { gr.fillText(line, x, y); y += lh; line = wd; } else line = t; }
    gr.fillText(line, x, y);
  }
})();
