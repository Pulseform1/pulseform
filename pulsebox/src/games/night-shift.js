// @use person
/* Night Shift: run the register at a gas station from 11 PM to 5 AM, for five nights, and follow the manager's rules.
   Each night adds a rule. Breaking a rule is a strike; three strikes and the night shift claims another clerk.
   How many strikes you finish with decides the ending. */
const GAME = {
  id: 'night-shift', title: 'Night Shift', tagline: 'Gas station. 11 PM to 5 AM. Follow the rules.',
  font: 'Special Elite', accent: '#ffd23f', accent2: '#ff4d4d', bg: '#06070a', noSkins: true, noHud: true, scoreLabel: 'Shift score',
  how: ['Ring up customers by clicking each item on the counter.', 'Read the RULES on the wall. A new one is added every night.', 'Three broken rules and you won\'t clock out. Wear headphones.'],
  skins: [{ name: 'Clerk', price: 0 }],
};
(() => {
  const DUR = 150, HOUR = DUR / 6, DOOR = { x: 830, y: 66, w: 300, h: 394 }, CX = 470;
  const RULES = [
    'If a customer has NO REFLECTION in the door glass, press LOOK DOWN and keep your eyes down until they leave. Never serve them.',
    'If the lights flicker three times, LOCK THE DOOR right away. Unlock it only after the knocking stops.',
    'Never answer the phone between 2:00 and 3:00 AM.',
    'Pump 4 is broken. Never turn it on, no matter who asks. If anyone asks what time it is, tell them it is closing time.',
    'If the security camera shows someone you cannot see in the store, press the ALARM.',
  ];
  const ITEMS = [['Chips', 2.49, '#e8b23a'], ['Soda', 1.99, '#d23a3a'], ['Gum', .99, '#3ad2a0'], ['Coffee', 1.49, '#6a3a1a'], ['Jerky', 5.99, '#8a4a2a'], ['Candy', 1.29, '#c23ad2'], ['Water', 1.19, '#3a8ad2'], ['Batteries', 6.49, '#4a4a4a'], ['Hot dog', 2.99, '#d2703a'], ['Energy', 3.29, '#7ad23a']];
  let night, t, events, cust, queue, strikes, lookDown, locked, flick, phone, pump, cctv, view, dlg, scareT, deadT, ended, msg, msgT, served, hover, amb, buzzT, knockT, noteOpen;

  function sched(n) {
    const ev = [];
    for (let s = 4; s < DUR - 10; s += K.rand(11, 16) - n * .6) {
      const r = Math.random(); let kind = 'normal';
      if (r < .22) kind = 'noreflect'; else if (n >= 4 && r < .34) kind = 'time';
      ev.push({ at: s, type: 'cust', kind });
    }
    if (n >= 2) for (let i = 0; i < (n >= 4 ? 2 : 1); i++) ev.push({ at: K.rand(25, DUR - 30), type: 'flicker' });
    if (n >= 3) { ev.push({ at: K.rand(3 * HOUR + 2, 4 * HOUR - 8), type: 'phone' }); ev.push({ at: K.rand(10, 2 * HOUR), type: 'phone' }); if (n >= 4) ev.push({ at: K.rand(4 * HOUR + 2, DUR - 15), type: 'phone' }); }
    if (n >= 4) ev.push({ at: K.rand(30, DUR - 25), type: 'pump' });
    if (n >= 5) { ev.push({ at: K.rand(20, 70), type: 'cctv' }); ev.push({ at: K.rand(80, DUR - 20), type: 'cctv' }); }
    if (!ev.some(e => e.kind === 'noreflect')) { const c = ev.find(e => e.type === 'cust' && e.at > 15); if (c) c.kind = 'noreflect'; }
    return ev.sort((a, b) => a.at - b.at);
  }
  function startNight(n) {
    night = n; t = 0; events = sched(n); cust = null; queue = []; lookDown = false; locked = false; flick = null; phone = null; pump = null; cctv = null; view = null; dlg = null; knockT = 0;
    noteOpen = !K.bot; msg = ''; msgT = 0;
  }
  GAME.reset = () => { GAME._dl = null; strikes = 0; scareT = 0; deadT = 0; ended = 0; served = 0; buzzT = 0; hover = null; startNight(K.bot ? K.irand(1, 5) : (K.save.night || 1)); sound(); };
  const clock = () => { const h = 11 + Math.floor(t / HOUR), m = Math.floor((t % HOUR) / HOUR * 60); const hh = h > 12 ? h - 12 : h; return `${hh}:${String(m).padStart(2, '0')} ${h >= 12 && h < 24 ? 'AM' : 'PM'}`; };
  const forbidden = () => t >= 3 * HOUR && t < 4 * HOUR;
  const say = (s, d = 3.5) => { msg = s; msgT = d; };

  /* ---------- sound ---------- */
  function sound() {
    if (amb || !K.ac || K.bot) return;
    const ac = K.ac, o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 240; f.Q.value = 4; const gn = ac.createGain(); gn.gain.value = .03;
    o.connect(f).connect(gn).connect(K.master); o.start();
    const fr = ac.createOscillator(); fr.type = 'sine'; fr.frequency.value = 52; const fg = ac.createGain(); fg.gain.value = .05; fr.connect(fg).connect(K.master); fr.start();
    amb = { gn, fg };
  }
  const beep = () => K.sfx(1850, .07, 'square', .07);
  const ring = () => { K.sfx(880, .35, 'square', .07); K.sfx(1100, .35, 'square', .05, 0, .02); };
  function scare() { if (K.bot) return; K.noise(1.1, .5, 700); K.sfx(700, 1, 'sawtooth', .22, -560); K.sfx(1300, .7, 'square', .08, -1000); }
  function strike(why) {
    strikes++; K.shake(22); K.flash('#600', .6); scare(); scareT = K.t; say('RULE BROKEN: ' + why, 4);
    if (strikes >= 3) { deadT = K.t; if (K.bot) K.over(); else K.over({ title: 'Clocked out', text: `Three rules broken. ${why}. The night shift is looking for a new clerk.`, delay: 2400 }); }
  }

  /* ---------- people ---------- */
  function newCust(kind) {
    const items = Array.from({ length: K.irand(2, 4) }, () => { const [n, p, c] = K.pick(ITEMS); return { n, p, c, scanned: false }; });
    items.forEach((it, i) => { it.x = 330 + i * 92 + K.rand(-8, 8); it.y = 560 + K.rand(-8, 8); });
    return { look: randomPerson(), kind, items, walk: 0, phase: 'in', pt: 0, patience: Math.max(14, 24 - night), lookT: 0, asked: false, answered: false };
  }
  const ITEM_HIT = (it, x, y) => x > it.x - 38 && x < it.x + 38 && y > it.y - 34 && y < it.y + 34;

  /* ---------- input ---------- */
  const B = { look: { x: 30, y: 640, w: 190, h: 64, t: 'Look down' }, lock: { x: 232, y: 640, w: 190, h: 64, t: 'Lock door' }, alarm: { x: 1060, y: 640, w: 190, h: 64, t: 'Alarm' }, rules: { x: 40, y: 330, w: 150, h: 150 }, phone: { x: 60, y: 150, w: 110, h: 130 } };
  const inB = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function act(k, arg) {
    if (deadT || ended) return;
    if (noteOpen) { if (k === 'note') { noteOpen = false; K.sfx(400, .05, 'triangle', .05); } return; }
    if (dlg) { if (k === 'opt') { const d = dlg; dlg = null; d.pick(arg); } return; }
    if (k === 'rules') { view = view === 'rules' ? null : 'rules'; return; }
    if (view) { view = null; return; }
    if (k === 'look') { lookDown = !lookDown; K.sfx(lookDown ? 300 : 500, .06, 'triangle', .05); }
    if (k === 'lock') { locked = !locked; K.sfx(locked ? 200 : 260, .12, 'square', .1); K.noise(.1, .2, 1200); if (!locked && flick && flick.state === 'knock') strike('You unlocked the door while it was still knocking'); }
    if (k === 'alarm') { K.sfx(600, .4, 'square', .1); K.sfx(800, .4, 'square', .1, 0, .4); if (cctv && cctv.state === 'on') { cctv = null; K.add(2); say('The alarm blares. When you check the camera again, the aisle is empty.'); } else { K.add(-1); say('False alarm. The manager won\'t like that.'); } }
    if (k === 'phone' && phone && phone.state === 'ring') {
      phone.state = 'done';
      if (forbidden()) { strike('You answered the phone between 2 and 3'); say('"...I can see you. You\'re holding the phone right now."', 4); }
      else { K.add(1); say(K.pick(['"Manager here. Just checking you\'re reading the rules. All of them."', '"It\'s me. Don\'t let anyone in after the lights go funny, okay?"', '"Hey. If someone asks for pump four... you know what to do."'])); }
    }
    if (k === 'item' && cust && cust.phase === 'at' && !lookDown) {
      const it = arg; if (it.scanned) return; it.scanned = true; beep();
      if (cust.kind === 'noreflect') { strike('You served a customer with no reflection'); cust.phase = 'out'; cust.pt = 0; return; }
      if (cust.items.every(i => i.scanned)) { const tot = cust.items.reduce((a, i) => a + i.p, 0); K.add(1); served++; if (served % 3 === 0) K.coin(1); say(`Total $${tot.toFixed(2)}. "Thanks. Have a good one."`, 2.4); K.sfx(1200, .1, 'triangle', .06, 0, .1); cust.phase = 'out'; cust.pt = 0; }
    }
  }
  GAME.down = (x, y) => {
    if (noteOpen) return act('note');
    if (dlg) { dlg.opts.forEach((o, i) => { if (inB(dlgBtn(i), x, y)) act('opt', i); }); return; }
    if (view) return act('close');
    for (const k of ['look', 'lock', 'alarm', 'rules', 'phone']) if (inB(B[k], x, y)) return act(k);
    if (cust) for (const it of cust.items) if (ITEM_HIT(it, x, y)) return act('item', it);
  };
  GAME.move = (x, y) => { hover = null; for (const k of ['look', 'lock', 'alarm', 'rules', 'phone']) if (inB(B[k], x, y)) hover = k; if (cust && !hover) for (const it of cust.items) if (ITEM_HIT(it, x, y)) hover = it; };
  GAME.key = (c, d) => {
    if (!d) return;
    if (c === 'Space' || c === 'Enter') { if (noteOpen) return act('note'); if (ended && night >= 5) return; if (ended) return nextNight(); if (cust && cust.phase === 'at') { const it = cust.items.find(i => !i.scanned); if (it) act('item', it); } }
    if (c === 'KeyL') act('look'); if (c === 'KeyD') act('lock'); if (c === 'KeyA') act('alarm'); if (c === 'KeyR') act('rules'); if (c === 'KeyP') act('phone');
    if (dlg && (c === 'Digit1' || c === 'Digit2')) act('opt', c === 'Digit1' ? 0 : 1);
  };
  const dlgBtn = i => ({ x: 340 + i * 310, y: 380, w: 290, h: 64 });
  function nextNight() { if (night < 5) { ended = 0; startNight(night + 1); } }

  let botT = 0;
  GAME.bot = dt => {
    if (ended) { botT += dt; if (botT > 2) { botT = 0; ended = 0; startNight(night % 5 + 1); } return; }
    botT += dt; if (botT < .5) return; botT = 0;
    const smart = Math.random() < .9;
    if (dlg) return act('opt', smart ? dlg.right : 1 - dlg.right);
    if (flick && flick.state === 'window' && !locked && smart) return act('lock');
    if (flick && flick.state === 'gone' && locked) return act('lock');
    if (!flick && locked) return act('lock');
    if (phone && phone.state === 'ring' && !forbidden() && Math.random() < .3) return act('phone');
    if (cctv && cctv.state === 'on' && smart) return act('alarm');
    if (cust && cust.phase === 'at') {
      if (cust.kind === 'noreflect') { if (!lookDown && smart) act('look'); return; }
      if (lookDown) return act('look');
      const it = cust.items.find(i => !i.scanned); if (it) act('item', it);
    } else if (lookDown && (!cust || cust.phase === 'gone')) act('look');
  };

  /* ---------- update ---------- */
  GAME.update = dt => {
    if (deadT) return;
    if (noteOpen) return;
    if (ended) { ended += dt; return; }
    t += dt; msgT -= dt; buzzT += dt;
    while (events.length && events[0].at <= t) {
      const e = events.shift();
      if (e.type === 'cust') queue.push(e.kind);
      if (e.type === 'flicker' && !flick) { flick = { state: 'flicker', t: 0 }; }
      if (e.type === 'phone' && (!phone || phone.state !== 'ring')) { phone = { state: 'ring', t: 0 }; }
      if (e.type === 'pump' && !pump) { pump = { t: 0 }; K.noise(.3, .08, 2000); dlg = { who: 'Intercom, pump 4', text: '"Hey... hey. Can you turn on pump four? I really need pump four."', opts: ['Turn on pump 4', 'Sorry, it\'s out of order'], right: 1, pick: i => { if (i === 0) strike('You turned on pump 4'); else { K.add(2); say('The figure at pump 4 doesn\'t move. Then it\'s just... gone.'); } pump.done = true; } }; }
      if (e.type === 'cctv' && !cctv) { cctv = { state: 'on', t: 0 }; K.sfx(60, 1.2, 'sine', .1); }
    }
    // customers
    if (!cust && queue.length && !(locked)) { cust = newCust(queue.shift()); K.sfx(1568, .5, 'sine', .07); K.sfx(1318, .6, 'sine', .07, 0, .25); }
    if (cust) {
      cust.pt += dt;
      if (cust.phase === 'in') { cust.walk = Math.min(1, cust.pt / 1.8); if (cust.pt > 1.8) { cust.phase = 'at'; cust.pt = 0; if (cust.kind === 'time') dlg = { who: 'Customer', text: '"Hey, quick question. What time is it?"', opts: [`"It's ${clock()}."`, '"It\'s closing time."'], right: 1, pick: i => { if (i === 0) strike('You told them the real time'); else { K.add(2); say('"...Right. Closing time." They smile with too many teeth, and leave.', 3); cust.phase = 'out'; cust.pt = 0; } } }; } }
      else if (cust.phase === 'at') {
        if (cust.kind === 'noreflect') {
          if (!lookDown && cust.pt > 2.6) { cust.lookT += dt; if (cust.lookT > 2.2) { strike('You looked at a customer with no reflection'); cust.phase = 'out'; cust.pt = 0; } }
          if (lookDown && Math.random() < dt * .4 && !K.bot) say(K.pick(['"Look at me."', '"Why won\'t you look at me?"', '"I know you can hear me."']), 1.8);
          if (cust.pt > 9) { cust.phase = 'out'; cust.pt = 0; if (strikes < 3) { K.add(2); K.coin(1); } }
        } else if (!dlg) { cust.patience -= dt; if (cust.patience <= 0) { say('"Forget it."', 1.8); cust.phase = 'out'; cust.pt = 0; } }
      } else if (cust.phase === 'out') { cust.walk = Math.max(0, 1 - cust.pt / 1.5); if (cust.pt > 1.6) cust = null; }
    }
    // lights flicker, then something knocks
    if (flick) {
      flick.t += dt;
      if (flick.state === 'flicker' && flick.t > 2.2) { flick.state = 'window'; flick.t = 0; }
      else if (flick.state === 'window') { if (locked) { flick.state = 'knock'; flick.t = 0; K.add(2); } else if (flick.t > 9) { strike('You didn\'t lock the door when the lights flickered'); flick.state = 'gone'; flick.t = 0; } }
      else if (flick.state === 'knock') { knockT -= dt; if (knockT <= 0) { knockT = K.rand(.6, 1.2); [0, .18, .36].forEach(d => K.sfx(85, .1, 'square', .25, -20, d)); K.noise(.1, .2, 200); } if (flick.t > 7) { flick.state = 'gone'; flick.t = 0; say('The knocking stops. You can unlock the door now.', 3); } }
      else if (flick.state === 'gone' && (!locked || flick.t > 12)) flick = null;
    }
    if (phone && phone.state === 'ring') { phone.t += dt; if (Math.floor(phone.t / .9) !== Math.floor((phone.t - dt) / .9) && Math.floor(phone.t / .9) % 2 === 0) ring(); if (phone.t > 8) phone.state = 'done'; }
    if (cctv && cctv.state === 'on') { cctv.t += dt; if (cctv.t > 10) { cctv = null; strike('Something was in the store and you didn\'t raise the alarm'); } }
    if (t >= DUR && !ended) {
      ended = .001; dlg = null; cust = null; lookDown = false;
      if (!K.bot) { K.save.night = Math.max(K.save.night || 1, Math.min(5, night + 1)); K.persist(); K.add(3); K.coin(5); K.chime(392, [0, 4, 7, 12]); }
      if (night >= 5 && !K.bot) setTimeout(() => { if (K.state !== 'play') return; K.save.night = 1; K.persist(); if (strikes === 0) { K.save.perfect = true; K.persist(); K.over({ title: 'Employee of the month', text: 'Five nights, every rule followed. At 5 AM the phone rings and the manager says: "You\'re perfect for this place. You never have to leave." Behind you, the door locks itself.' }); } else K.over({ title: 'Shift over', text: `The sun comes up. You broke ${strikes} rule${strikes > 1 ? 's' : ''} and lived anyway. You hang up the apron and never come back.` }); }, 3000);
    }
  };

  /* ---------- draw ---------- */
  function lights() { if (flick && flick.state === 'flicker') { const k = flick.t; return (k > .2 && k < .45) || (k > .9 && k < 1.1) || (k > 1.6 && k < 1.9) ? .08 : 1; } if (flick && flick.state === 'window') return .55 + .1 * Math.sin(K.t * 40); return Math.random() < .002 ? .6 : 1; }
  function button(gr, b, label, on, hot) { gr.fillStyle = on ? '#6a5a1a' : hot ? '#3a3a44' : '#22222a'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 12); gr.fill(); gr.strokeStyle = on ? '#ffd23f' : 'rgba(255,255,255,.15)'; gr.lineWidth = 2; gr.stroke(); gr.fillStyle = on ? '#ffe68a' : '#e6e0d0'; gr.font = '24px "Special Elite", monospace'; gr.textAlign = 'center'; gr.textBaseline = 'middle'; gr.fillText(label, b.x + b.w / 2, b.y + b.h / 2); }
  function wrap(gr, text, x, y, w, lh) { const words = text.split(' '); let line = ''; for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (gr.measureText(tt).width > w) { gr.fillText(line, x, y); y += lh; line = wd; } else line = tt; } gr.fillText(line, x, y); return y; }
  GAME.draw = gr => {
    const v = K.view, L = lights();
    gr.fillStyle = '#0b0c10'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    if (deadT && K.t - deadT > .2) { const k = Math.min(1, (K.t - deadT) * 2); gr.fillStyle = '#000'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); drawPerson(gr, GAME._dl || (GAME._dl = (cust && cust.look) || randomPerson()), W / 2, 260, 1.4 + k * 1.6, { reveal: 1 }); gr.fillStyle = `rgba(150,0,0,${.25 * k})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); return; }
    // the store
    gr.fillStyle = `rgb(${Math.round(46 * L)},${Math.round(50 * L)},${Math.round(44 * L)})`; gr.fillRect(v.x0, 0, v.x1 - v.x0, 520);
    for (const side of [0]) { const x0 = 230; for (let r = 0; r < 4; r++) { gr.fillStyle = `rgba(30,30,34,${L})`; gr.fillRect(x0, 120 + r * 92, 260, 10); for (let i = 0; i < 9; i++) { gr.fillStyle = `hsla(${(i * 47 + r * 90 + side * 30) % 360},55%,${45 * L}%,1)`; gr.fillRect(x0 + 8 + i * 28, 120 + r * 92 - 44 + (i % 2) * 6, 22, 44 - (i % 2) * 6); } } }
    // outside through the door
    gr.save(); gr.beginPath(); gr.rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); gr.clip();
    gr.fillStyle = '#05060a'; gr.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h);
    gr.fillStyle = 'rgba(255,240,200,.12)'; gr.fillRect(DOOR.x, DOOR.y + 40, DOOR.w, 30);
    for (let i = 0; i < 4; i++) { const x = DOOR.x + 22 + i * 70, y = DOOR.y + 200; gr.fillStyle = '#2a2a30'; gr.fillRect(x, y, 34, 70); gr.fillStyle = i === 3 ? '#7a2020' : '#3a6a3a'; gr.fillRect(x + 6, y + 8, 22, 14); gr.fillStyle = '#ccc'; gr.font = '12px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(i + 1, x + 17, y + 46); }
    if (pump && !pump.done) { gr.fillStyle = '#000'; gr.fillRect(DOOR.x + 240, DOOR.y + 110, 22, 160); gr.beginPath(); gr.ellipse(DOOR.x + 251, DOOR.y + 112, 13, 18, 0, 0, 7); gr.fill(); }
    if (flick && flick.state === 'knock') drawPerson(gr, { skin: '#111', hair: '#000', style: 1, eyes: '#000', shirt: '#000' }, DOOR.x + DOOR.w / 2, DOOR.y + 160, 1.15, { silhouette: true });
    if (flick && flick.state === 'knock') { gr.fillStyle = 'rgba(255,255,255,.12)'; for (const [dx, dy] of [[-60, 120], [70, 110]]) { gr.beginPath(); gr.ellipse(DOOR.x + DOOR.w / 2 + dx, DOOR.y + dy, 22, 30, 0, 0, 7); gr.fill(); } }
    // reflection in the glass: the counter and whoever is standing at it
    gr.globalAlpha = .38 * L; gr.fillStyle = '#6a5a40'; gr.fillRect(DOOR.x, DOOR.y + DOOR.h - 70, DOOR.w, 70);
    if (cust && cust.kind !== 'noreflect' && cust.phase !== 'gone') { gr.save(); gr.translate(DOOR.x + DOOR.w / 2, 0); gr.scale(-1, 1); drawPerson(gr, cust.look, 40, DOOR.y + 190, .62 * Math.max(.3, cust.walk), {}); gr.restore(); }
    gr.globalAlpha = 1; gr.restore();
    gr.strokeStyle = '#3a3a3a'; gr.lineWidth = 14; gr.strokeRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h); gr.fillStyle = '#9a9a9a'; gr.fillRect(DOOR.x + DOOR.w - 40, DOOR.y + 200, 8, 50);
    gr.fillStyle = locked ? '#ff4d4d' : '#3aff7a'; gr.font = '16px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(locked ? 'LOCKED' : 'OPEN', DOOR.x + DOOR.w / 2, DOOR.y - 12);
    // lights
    for (const x of [300, 980]) { gr.fillStyle = L > .5 ? '#f4fff0' : '#3a3a3a'; gr.fillRect(x - 120, 8, 240, 12); if (L > .5) { const lg = gr.createRadialGradient(x, 14, 10, x, 14, 340); lg.addColorStop(0, `rgba(230,255,230,${.18 * L})`); lg.addColorStop(1, 'rgba(0,0,0,0)'); gr.fillStyle = lg; gr.fillRect(x - 340, 0, 680, 400); } }
    // the customer
    if (cust) {
      const s = .7 + .3 * cust.walk, y = 200 + (1 - cust.walk) * 40;
      gr.globalAlpha = Math.min(1, cust.walk * 1.4);
      drawPerson(gr, cust.look, CX, y, s * 1.05, { look: Math.sin(K.t), smile: cust.kind === 'noreflect' && cust.pt > 5 });
      gr.globalAlpha = 1;
    }
    // phone, rules, camera
    const ph = phone && phone.state === 'ring', shake = ph ? Math.sin(K.t * 60) * 3 : 0;
    gr.fillStyle = hover === 'phone' ? '#3a3a40' : '#2a2a2e'; gr.fillRect(B.phone.x + shake, B.phone.y, B.phone.w, B.phone.h); gr.fillStyle = ph ? '#ffd23f' : '#1a1a1a'; gr.fillRect(B.phone.x + 14 + shake, B.phone.y + 14, 82, 34); gr.fillStyle = '#e6e0d0'; gr.font = '16px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(ph ? 'RING' : 'PHONE', B.phone.x + 55 + shake, B.phone.y + 36);
    for (let i = 0; i < 9; i++) { gr.fillStyle = '#444'; gr.fillRect(B.phone.x + 18 + (i % 3) * 26, B.phone.y + 60 + Math.floor(i / 3) * 20, 18, 14); }
    gr.fillStyle = hover === 'rules' ? '#fff8e0' : '#ece4cc'; gr.save(); gr.translate(B.rules.x + 75, B.rules.y + 75); gr.rotate(-.04); gr.fillRect(-75, -75, 150, 150); gr.fillStyle = '#7a1f1a'; gr.font = '26px "Special Elite"'; gr.fillText('RULES', 0, -42); gr.fillStyle = '#333'; for (let i = 0; i < night; i++) gr.fillRect(-55, -16 + i * 18, 110 - (i % 2) * 20, 6); gr.restore();
    if (night >= 5) {
      gr.save(); gr.translate(-230, 430); gr.fillStyle = '#111'; gr.fillRect(1080, 40, 180, 130); gr.fillStyle = '#0d1a10'; gr.fillRect(1088, 48, 164, 104);
      gr.strokeStyle = 'rgba(120,255,140,.3)'; gr.strokeRect(1100, 60, 140, 80); gr.fillStyle = 'rgba(120,255,140,.6)'; gr.fillRect(1160, 120, 12, 12);
      if (cust) { gr.fillRect(1166, 96, 10, 10); }
      if (cctv && cctv.state === 'on') { gr.fillStyle = Math.sin(K.t * 8) > 0 ? 'rgba(255,90,90,.9)' : 'rgba(120,255,140,.6)'; gr.fillRect(1205, 125, 10, 14); }
      gr.fillStyle = '#ff4d4d'; gr.font = '11px "Special Elite"'; gr.textAlign = 'left'; gr.fillText('● CAM 2  STORE', 1092, 62); gr.restore();
    }
    // counter and items
    gr.fillStyle = '#4a3a2a'; gr.fillRect(v.x0, 520, v.x1 - v.x0, 200); gr.fillStyle = '#5a4632'; gr.fillRect(v.x0, 516, v.x1 - v.x0, 12);
    gr.fillStyle = '#222'; gr.fillRect(660, 470, 160, 110); gr.fillStyle = '#0a1a0a'; gr.fillRect(674, 484, 132, 44); gr.fillStyle = '#3aff7a'; gr.font = '24px "Courier New", monospace'; gr.textAlign = 'right';
    const tot = cust ? cust.items.filter(i => i.scanned).reduce((a, i) => a + i.p, 0) : 0; gr.fillText('$' + tot.toFixed(2), 798, 514);
    if (cust && cust.phase === 'at') for (const it of cust.items) if (!it.scanned) { gr.fillStyle = it.c; gr.beginPath(); gr.roundRect(it.x - 34, it.y - 30, 68, 60, 8); gr.fill(); if (hover === it) { gr.strokeStyle = '#ffd23f'; gr.lineWidth = 3; gr.stroke(); } gr.fillStyle = '#fff'; gr.font = '15px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(it.n, it.x, it.y + 5); }
    // looking down: only the counter is visible
    if (lookDown) { const lg = gr.createLinearGradient(0, 300, 0, 560); lg.addColorStop(0, '#000'); lg.addColorStop(1, 'rgba(0,0,0,.2)'); gr.fillStyle = lg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, 560 - v.y0); gr.fillStyle = '#c9c0a8'; gr.font = '22px "Special Elite"'; gr.textAlign = 'center'; gr.fillText('(eyes on the counter)', CX, 470); }
    // darkness when the lights go
    if (L < 1) { gr.fillStyle = `rgba(0,0,0,${1 - L})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); }
    // buttons and clock
    button(gr, B.look, 'Look down [L]', lookDown, hover === 'look'); button(gr, B.lock, (locked ? 'Unlock' : 'Lock door') + ' [D]', locked, hover === 'lock'); button(gr, B.alarm, 'Alarm [A]', false, hover === 'alarm');
    gr.fillStyle = '#100808'; gr.fillRect(560, 650, 160, 50); gr.fillStyle = forbidden() ? '#ff4d4d' : '#ff6a3a'; gr.font = '30px "Courier New", monospace'; gr.textAlign = 'center'; gr.fillText(clock(), 640, 676);
    gr.fillStyle = '#e6e0d0'; gr.font = '20px "Special Elite"'; gr.textAlign = 'left'; gr.fillText(`NIGHT ${night}`, 760, 668); gr.fillStyle = '#ff6a6a'; gr.fillText('✕ '.repeat(strikes) + '· '.repeat(3 - strikes), 760, 694);
    if (msgT > 0) { gr.font = '22px "Special Elite"'; gr.textAlign = 'center'; const w = Math.min(1000, gr.measureText(msg).width + 40); gr.fillStyle = 'rgba(0,0,0,.75)'; gr.fillRect(640 - w / 2, 590 - 22, w, 40); gr.fillStyle = msg.startsWith('RULE') ? '#ff6a6a' : '#f0e8d8'; gr.fillText(msg, 640, 592); }
    // vignette and grain
    const vg = gr.createRadialGradient(640, 330, 280, 640, 360, 900); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); gr.fillStyle = vg; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    for (let i = 0; i < 220; i++) { gr.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.1)'; gr.fillRect(v.x0 + Math.random() * (v.x1 - v.x0), v.y0 + Math.random() * (v.y1 - v.y0), 2, 2); }
    if (scareT && K.t - scareT < .35 && !deadT) { gr.fillStyle = 'rgba(0,0,0,.6)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); drawPerson(gr, randomPerson(), 640, 240, 2.4, { reveal: 1 }); }
    // overlays: rules, dialog, manager's note, end of night
    if (view === 'rules' || noteOpen) {
      gr.fillStyle = 'rgba(0,0,0,.7)'; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#ece4cc'; gr.fillRect(300, 50, 680, 560); gr.fillStyle = '#7a1f1a'; gr.font = '38px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(noteOpen ? `Night ${night}: a note from the manager` : 'RULES (read them)', 640, 104);
      gr.font = '20px "Special Elite"'; gr.textAlign = 'left'; let y = 160;
      for (let i = 0; i < night; i++) { gr.fillStyle = noteOpen && i === night - 1 ? '#7a1f1a' : '#2a2420'; y = wrap(gr, `${i + 1}. ${RULES[i]}`, 330, y, 620, 28) + 44; }
      gr.fillStyle = '#5a5040'; gr.textAlign = 'center'; gr.fillText(noteOpen ? (night === 1 ? 'Click each item on the counter to ring it up. Tap to start your shift.' : 'Tap to start your shift.') : 'Tap anywhere to close.', 640, 584);
    }
    if (dlg) {
      gr.fillStyle = 'rgba(0,0,0,.6)'; gr.fillRect(v.x0, 230, v.x1 - v.x0, 240);
      gr.fillStyle = '#ffd23f'; gr.font = '20px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(dlg.who, 640, 272); gr.fillStyle = '#f0e8d8'; gr.font = '26px "Special Elite"'; gr.fillText(dlg.text, 640, 320);
      dlg.opts.forEach((o, i) => { const b = dlgBtn(i); gr.fillStyle = '#2a2a32'; gr.beginPath(); gr.roundRect(b.x, b.y, b.w, b.h, 12); gr.fill(); gr.strokeStyle = 'rgba(255,255,255,.25)'; gr.stroke(); gr.fillStyle = '#fff'; gr.font = '19px "Special Elite"'; gr.fillText(`[${i + 1}] ${o}`, b.x + b.w / 2, b.y + 38); });
    }
    if (ended) {
      gr.fillStyle = `rgba(0,0,0,${Math.min(.85, ended)})`; gr.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
      gr.fillStyle = '#ffd8a8'; gr.font = '54px "Special Elite"'; gr.textAlign = 'center'; gr.fillText(`5:00 AM · Night ${night} done`, 640, 300);
      gr.font = '24px "Special Elite"'; gr.fillStyle = '#efe6d8'; gr.fillText(night >= 5 ? 'The sun is coming up...' : `Strikes: ${strikes}/3. Tap or press Space for night ${night + 1}.`, 640, 360);
    }
  };
  // tap anywhere on the end-of-night card to go on
  const down0 = GAME.down; GAME.down = (x, y) => { if (ended && night < 5 && ended > .8) return nextNight(); if (ended) return; down0(x, y); };
})();
