/* Doodle Guess: one player draws a secret word, everyone else races to type it. Fast guesses score more, and the
   artist scores for everyone who gets it. Two rounds, everyone draws in each. Online rooms through the shared MP lobby:
   the host only decides whose turn it is; the artist's game picks the word, runs the clock and judges the guesses,
   so guessers never receive the word until the turn ends. Practice mode: a bot draws, you guess. */
// @use mp
const GAME = {
  id: 'doodle-guess', title: 'Doodle Guess', tagline: 'Draw it. Guess it. Laugh at it.',
  font: 'Patrick Hand', accent: '#ff7a59', accent2: '#3ec5ff', bg: '#f4efe4', noSkins: true, noHud: true, scoreLabel: 'Points',
  how: ['When it is your turn, pick one of three words and draw it. No letters or numbers!', 'Everyone else types guesses in the box. The faster you guess, the more points you get.', 'The artist scores for every player who gets it. Two rounds, everyone draws in each.', 'Practice alone: the bot draws and you guess.'],
  skins: [{ name: 'Default', price: 0, c: ['#fff'] }],
};
(() => {
  const WORDS = ('apple banana pizza cake cookie donut ice-cream sandwich burger taco carrot pumpkin cheese egg popcorn lollipop cat dog fish bird horse rabbit snake turtle frog lion elephant giraffe monkey penguin octopus shark spider bee butterfly dinosaur unicorn dragon owl duck ' +
    'house castle tent bridge lighthouse school igloo tower car bus train plane rocket boat bicycle helicopter tractor submarine skateboard sun moon star cloud rain rainbow snowman tree flower cactus mushroom mountain volcano island beach wave fire tornado ' +
    'phone laptop camera guitar drum piano clock lamp key lock umbrella glasses hat crown shoe sock backpack scissors pencil book candle balloon gift kite robot ghost alien pirate ninja wizard mermaid zombie vampire superhero ' +
    'football basketball trophy medal rollercoaster swing slide treasure map compass anchor magnet battery lightbulb rocket telescope microscope tooth heart brain eye hand footprint skeleton spaceship planet comet snowflake').split(' ').map(w => w.replace('-', ' '));
  const PAL = ['#1a1a1a', '#ffffff', '#e8343a', '#ff9f1c', '#ffd23f', '#3ddc84', '#1fa84a', '#3ec5ff', '#2a5bd7', '#c77dff', '#ff7ad9', '#8a5a2b'];
  const PX = 270, PY = 112, PW = 760, PH = 500, TURN = 80;
  const paper = document.createElement('canvas'); paper.width = PW; paper.height = PH; const pg = paper.getContext('2d');
  let mode = 'lobby', roster = [], scores = {}, solo = false, turn = null, chat = [], strokes = [], cur = null, outbox = [], sendT = 0, tool = { c: '#1a1a1a', w: 6 }, turnNo = 0, totalTurns = 0, botDraw = null, guessed = new Set(), mine = 0, choice = null, endT = 0, pend = null;
  const me = () => MP.id, isDrawer = () => turn && turn.d === me(), nameOf = id => (roster.find(r => r.id === id) || { name: '?' }).name, colOf = id => (roster.find(r => r.id === id) || { col: '#888' }).col;
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  Object.assign(MP.opts, {
    max: 8, min: 2, bots: 0, solo: 'Practice: guess the bot\'s doodles', sub: '2 to 8 players. Take turns drawing.',
    onStart: (cfg, ros) => startMatch(ros),
    onMsg: onMsg,
    onLeave: id => { if (mode !== 'play') return; if (id === -1 || !MP.online()) return finish('Lost the connection to the room.'); roster = roster.filter(r => r.id !== id); say(`${nameOf(id)} left.`, '#999'); if (roster.length < 2) return finish('Everyone else left.'); if (turn && turn.d === id && MP.isHost()) endTurn('left'); },
  });
  /* ---------- flow ---------- */
  function startMatch(ros) {
    roster = ros.filter(r => !r.bot); solo = !MP.online(); mode = 'play'; scores = {}; roster.forEach(r => { scores[r.id] = 0; }); chat = []; turnNo = 0; mine = me(); K.score = 0;
    if (solo) { roster = [{ id: 0, name: MP.name, col: MP.colors[0] }, { id: 'bot', name: 'Doodle Bot', col: MP.colors[1] }]; scores = { 0: 0, bot: 0 }; totalTurns = 8; }
    else totalTurns = roster.length * 2;
    say(solo ? 'Practice: the bot draws, you guess. 8 doodles.' : `${roster.length} players · ${totalTurns} turns`, '#888');
    if (MP.isHost()) setTimeout(() => nextTurn(), 800);
    showInput(true);
  }
  function nextTurn() {
    if (mode !== 'play') return;
    if (turnNo >= totalTurns) { MP.send({ t: 'final' }); return finish(); }
    const d = solo ? 'bot' : roster[turnNo % roster.length].id;
    const m = { t: 'turn', d, n: turnNo }; MP.send(m); onMsg(m);
  }
  function onMsg(m) {
    if (mode !== 'play' && m.t !== 'final') return;
    switch (m.t) {
      case 'turn':
        turnNo = m.n + 1; turn = { d: m.d, n: m.n, mask: '', left: TURN, word: null, picking: true }; guessed = new Set(); strokes = []; redraw(); choice = null;
        if (m.d === me() && !solo) { const pool = WORDS.slice(); choice = Array.from({ length: 3 }, () => pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); turn.pickT = 12; }
        else if (m.d === 'bot') startBot();
        say(`${m.d === me() ? 'Your' : nameOf(m.d) + "'s"} turn to draw.`, colOf(m.d));
        K.sfx(660, .12, 'triangle', .08);
        break;
      case 'go': if (!turn) break; turn.picking = false; turn.mask = m.mask; turn.left = m.time; break;
      case 'hint': if (turn) turn.mask = m.mask; break;
      case 'tick': if (turn && !isDrawer()) turn.left = m.left; break;
      case 'd': for (const s of m.s) addPts(s); break;
      case 'clr': strokes = []; redraw(); break;
      case 'undo': strokes = strokes.filter(s => s.id !== m.id); redraw(); break;
      case 'g': if (isDrawer() && turn && !turn.picking) judge(m.from, m.text); break;
      case 'close': say(`"${m.text}" is close!`, '#ff9f1c'); break;
      case 'chat': if (m.id !== me()) say(`${nameOf(m.id)}: ${m.text}`, '#333', m.id); break;
      case 'ok': guessed.add(m.id); scores[m.id] = (scores[m.id] || 0) + m.p; scores[turn.d] = (scores[turn.d] || 0) + m.dp; say(`${m.id === me() ? 'You' : nameOf(m.id)} guessed it! +${m.p}`, '#1fa84a'); K.chime(m.id === me() ? 784 : 523, [0, 4, 7, 12]); if (m.id === me()) K.coin(1); break;
      case 'end': if (!turn) break; turn.word = m.word; turn.over = true; turn.left = 0; say(`The word was "${m.word}".`, '#2a5bd7'); K.sfx(440, .3, 'triangle', .08, -100); if (MP.isHost()) setTimeout(nextTurn, 4200); break;
      case 'final': finish(); break;
    }
  }
  function pick(w) {
    if (!turn || !turn.picking) return;
    turn.word = w; turn.picking = false; turn.mask = w.replace(/[a-z]/gi, '_'); turn.left = TURN; turn.t0 = 0; choice = null;
    const m = { t: 'go', mask: turn.mask, time: TURN }; MP.send(m);
  }
  function judge(id, text) {
    if (guessed.has(id) || id === turn.d) return;
    const g = norm(text), w = norm(turn.word);
    if (!g) return;
    if (g === w) {
      const p = 50 + Math.round(250 * turn.left / TURN) - guessed.size * 10, m = { t: 'ok', id, p, dp: 40 };
      MP.send(m); onMsg(m);
      const guessers = solo ? 1 : roster.length - 1; if (guessed.size >= guessers) endTurn();
    } else {
      if (lev(g, w) <= 1 && w.length > 3) { if (id === me()) say(`"${text}" is close!`, '#ff9f1c'); else MP.to(id, { t: 'close', text }); }
      const m = { t: 'chat', id, text: text.slice(0, 40) }; MP.send(m); say(`${nameOf(id)}: ${text.slice(0, 40)}`, '#333', id);
    }
  }
  function endTurn() { if (!turn || turn.over) return; const m = { t: 'end', word: turn.word || '?' }; MP.send(m); onMsg(m); }
  function finish(why) {
    if (mode !== 'play') return; mode = 'over'; showInput(false);
    const rank = Object.entries(scores).sort((a, b) => b[1] - a[1]), myS = scores[me()] || 0, top = rank[0];
    K.score = myS; if (top && String(top[0]) === String(me())) K.coin(10);
    K.over({ title: why ? 'Game over' : top && String(top[0]) === String(me()) ? 'You win!' : `${nameOf(isNaN(top[0]) ? top[0] : +top[0])} wins!`, text: why || rank.map(([id, s]) => `${nameOf(isNaN(id) ? id : +id)} ${s}`).join(' · '), delay: 300 });
  }
  function say(s, c = '#333', who) { chat.push({ s, c, who }); if (chat.length > 14) chat.shift(); }
  /* ---------- drawing ---------- */
  function addPts(s) {
    let st = strokes.find(x => x.id === s.id);
    if (!st) { st = { id: s.id, c: s.c, w: s.w, p: [] }; strokes.push(st); }
    const from = st.p.length; st.p.push(...s.p); drawStroke(st, Math.max(0, from - 2));
  }
  function drawStroke(st, from = 0) {
    pg.strokeStyle = st.c; pg.fillStyle = st.c; pg.lineWidth = st.w; pg.lineCap = 'round'; pg.lineJoin = 'round';
    const p = st.p; if (p.length === 2) { pg.beginPath(); pg.arc(p[0], p[1], st.w / 2, 0, 7); pg.fill(); return; }
    pg.beginPath(); pg.moveTo(p[from], p[from + 1]); for (let i = from + 2; i < p.length; i += 2) pg.lineTo(p[i], p[i + 1]); pg.stroke();
  }
  function redraw() { pg.fillStyle = '#fff'; pg.fillRect(0, 0, PW, PH); for (const s of strokes) drawStroke(s); }
  const inPaper = (x, y) => x >= PX && y >= PY && x <= PX + PW && y <= PY + PH;
  function emit(s) { outbox.push(s); }
  /* the bot's doodles: each word is a list of strokes (points in a 100x100 box) */
  const C = (cx, cy, r, n = 28, a0 = 0, a1 = 6.283) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const DOODLES = {
    sun: [['#ffd23f', C(50, 50, 18)], ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * 6.283; return ['#ff9f1c', [[50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26], [50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40]]]; })],
    house: [['#8a5a2b', [[25, 85], [25, 45], [75, 45], [75, 85], [25, 85]]], ['#e8343a', [[18, 48], [50, 18], [82, 48]]], ['#2a5bd7', [[44, 85], [44, 65], [56, 65], [56, 85]]], ['#3ec5ff', [[30, 52], [40, 52], [40, 60], [30, 60], [30, 52]]]],
    tree: [['#8a5a2b', [[45, 90], [45, 55], [55, 55], [55, 90]]], ['#1fa84a', C(50, 40, 22)], ['#3ddc84', C(42, 34, 9)]],
    fish: [['#ff9f1c', [[20, 50], [30, 38], [55, 34], [72, 50], [55, 66], [30, 62], [20, 50]]], ['#ff9f1c', [[72, 50], [88, 36], [88, 64], [72, 50]]], ['#1a1a1a', C(32, 47, 2, 8)]],
    cat: [['#1a1a1a', C(50, 55, 22)], ['#1a1a1a', [[32, 40], [34, 22], [44, 34]]], ['#1a1a1a', [[56, 34], [66, 22], [68, 40]]], ['#1a1a1a', C(42, 52, 2, 6)], ['#1a1a1a', C(58, 52, 2, 6)], ['#ff7ad9', [[48, 60], [52, 60], [50, 63], [48, 60]]], ['#1a1a1a', [[30, 62], [16, 60]]], ['#1a1a1a', [[70, 62], [84, 60]]]],
    car: [['#e8343a', [[15, 65], [15, 52], [30, 50], [38, 38], [64, 38], [72, 50], [86, 52], [86, 65], [15, 65]]], ['#1a1a1a', C(30, 67, 7)], ['#1a1a1a', C(70, 67, 7)], ['#3ec5ff', [[42, 42], [60, 42], [65, 50], [40, 50], [42, 42]]]],
    star: [['#ffd23f', Array.from({ length: 11 }, (_, i) => { const a = -1.571 + i / 10 * 6.283, r = i % 2 ? 16 : 38; return [50 + Math.cos(a) * r, 52 + Math.sin(a) * r]; })]],
    heart: [['#e8343a', [[50, 80], [22, 52], [20, 36], [30, 26], [42, 28], [50, 38], [58, 28], [70, 26], [80, 36], [78, 52], [50, 80]]]],
    flower: [['#1fa84a', [[50, 50], [50, 92]]], ['#1fa84a', [[50, 75], [64, 66], [56, 80]]], ...Array.from({ length: 6 }, (_, i) => ['#ff7ad9', C(50 + Math.cos(i * 1.047) * 13, 40 + Math.sin(i * 1.047) * 13, 9, 14)]), ['#ffd23f', C(50, 40, 7, 12)]],
    moon: [['#ffd23f', [...C(50, 50, 30, 30, -1.2, 4.4), ...C(62, 46, 24, 26, 4.2, -.9)]]],
    umbrella: [['#c77dff', [...C(50, 50, 34, 26, 3.1416, 6.283), [16, 50]]], ['#1a1a1a', [[50, 50], [50, 84], [44, 88], [40, 84]]]],
    snowman: [['#1a1a1a', C(50, 70, 20)], ['#1a1a1a', C(50, 36, 14)], ['#ff9f1c', [[50, 38], [62, 40], [50, 41]]], ['#1a1a1a', C(45, 33, 1.5, 6)], ['#1a1a1a', C(55, 33, 1.5, 6)], ['#8a5a2b', [[30, 62], [14, 50]]], ['#8a5a2b', [[70, 62], [86, 50]]]],
    apple: [['#e8343a', C(50, 58, 26)], ['#8a5a2b', [[50, 34], [52, 22]]], ['#1fa84a', [[52, 26], [64, 20], [60, 30], [52, 26]]]],
    boat: [['#8a5a2b', [[15, 62], [85, 62], [72, 80], [28, 80], [15, 62]]], ['#1a1a1a', [[50, 62], [50, 18]]], ['#ffffff', [[50, 20], [76, 56], [50, 56]]], ['#1a1a1a', [[50, 20], [76, 56], [50, 56]]], ['#3ec5ff', [[5, 88], [20, 84], [35, 88], [50, 84], [65, 88], [80, 84], [95, 88]]]],
    ghost: [['#1a1a1a', [[28, 85], [28, 45], ...C(50, 45, 22, 20, 3.1416, 6.283), [72, 85], [65, 78], [58, 85], [50, 78], [42, 85], [35, 78], [28, 85]]], ['#1a1a1a', C(42, 46, 4, 8)], ['#1a1a1a', C(58, 46, 4, 8)], ['#1a1a1a', C(50, 62, 5, 10)]],
    rocket: [['#2a5bd7', [[50, 12], [62, 30], [62, 72], [38, 72], [38, 30], [50, 12]]], ['#e8343a', [[38, 60], [28, 78], [38, 72]]], ['#e8343a', [[62, 60], [72, 78], [62, 72]]], ['#3ec5ff', C(50, 40, 6, 12)], ['#ff9f1c', [[42, 74], [50, 92], [58, 74]]]],
    mushroom: [['#e8343a', [...C(50, 50, 30, 24, 3.1416, 6.283), [20, 50]]], ['#e8dcc0', [[42, 50], [42, 82], [58, 82], [58, 50]]], ['#ffffff', C(40, 38, 4, 8)], ['#ffffff', C(60, 36, 5, 8)]],
    'ice cream': [['#c99a5a', [[34, 50], [50, 92], [66, 50]]], ['#ff7ad9', C(50, 40, 17)], ['#8a5a2b', [[44, 30], [46, 34]]]],
    cloud: [['#3ec5ff', [...C(35, 55, 14, 12, 1.6, 4.7), ...C(52, 42, 18, 14, 3.4, 6.1), ...C(70, 55, 14, 12, 4.6, 7.8), [35, 69]]], ['#2a5bd7', [[35, 75], [32, 85]]], ['#2a5bd7', [[52, 75], [49, 85]]], ['#2a5bd7', [[68, 75], [65, 85]]]],
    key: [['#ffd23f', C(28, 50, 12)], ['#ffd23f', [[40, 50], [86, 50], [86, 60]]], ['#ffd23f', [[74, 50], [74, 58]]]],
  };
  function startBot() {
    const words = Object.keys(DOODLES), w = words[(turnNo * 7 + Math.floor(Math.random() * 3)) % words.length];
    const flat = []; for (const [c, pts] of DOODLES[w]) flat.push({ c, pts: pts.map(([x, y]) => [x * 4.6 + 150 + (Math.random() - .5) * 2, y * 4.6 + 20 + (Math.random() - .5) * 2]) });
    botDraw = { flat, si: 0, pi: 0, t: 0, id: 0 };
    turn.word = w; turn.picking = false; turn.mask = w.replace(/[a-z]/gi, '_'); turn.left = TURN; botDraw.fake = 0;
  }
  function stepBot(dt) {
    if (!botDraw || !turn || turn.over) return;
    botDraw.t += dt;
    let n = Math.floor(botDraw.t * 26); botDraw.t -= n / 26;
    while (n-- > 0 && botDraw.si < botDraw.flat.length) {
      const s = botDraw.flat[botDraw.si], p = s.pts[botDraw.pi];
      addPts({ id: 'b' + botDraw.si, c: s.c, w: 7, p: [p[0], p[1]] });
      if (++botDraw.pi >= s.pts.length) { botDraw.si++; botDraw.pi = 0; }
    }
    if (K.bot) { botDraw.fake -= dt; if (botDraw.fake <= 0) { botDraw.fake = 1.4 + Math.random() * 2; const done = botDraw.si >= botDraw.flat.length * .6; if (done && Math.random() < .5) { say(`${K.pick(['Ava', 'Ben', 'Mia', 'Leo'])} guessed it!`, '#1fa84a'); } else say(`${K.pick(['Ava', 'Ben', 'Mia', 'Leo'])}: ${K.pick(WORDS)}`, '#333'); } }
  }
  /* ---------- guess box ---------- */
  let box = null;
  function showInput(on) {
    if (!box) {
      box = document.createElement('input'); box.id = 'dgGuess'; box.placeholder = 'Type your guess and press Enter'; box.maxLength = 40; box.autocomplete = 'off';
      box.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:min(440px,86vw);padding:12px 16px;border-radius:14px;border:3px solid #2a2a2a;font:700 20px "Patrick Hand",Nunito,sans-serif;background:#fffdf6;color:#222;z-index:5;box-shadow:0 6px 18px rgba(0,0,0,.25)';
      box.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const v = box.value.trim(); box.value = ''; if (v) guess(v); } };
      document.body.appendChild(box);
    }
    box.hidden = !on;
  }
  function guess(text) {
    if (!turn || turn.over) return say(text, '#333', me());
    if (isDrawer()) return;
    if (guessed.has(me())) return say('You already got it. Shh!', '#888');
    if (solo) { if (norm(text) === norm(turn.word)) { onMsg({ t: 'ok', id: me(), p: 50 + Math.round(250 * turn.left / TURN), dp: 0 }); endTurn(); } else { say(`You: ${text}`, '#333', me()); if (lev(norm(text), norm(turn.word)) <= 1 && turn.word.length > 3) say(`"${text}" is close!`, '#ff9f1c'); } return; }
    say(`You: ${text}`, '#333', me()); MP.to(turn.d, { t: 'g', text });
  }
  /* ---------- input ---------- */
  const tools = () => { const b = []; PAL.forEach((c, i) => b.push({ x: PX + i * 42, y: PY + PH + 14, w: 36, h: 36, c })); [4, 8, 16, 30].forEach((w, i) => b.push({ x: PX + 520 + i * 42, y: PY + PH + 14, w: 36, h: 36, size: w })); b.push({ x: PX + 690, y: PY + PH + 14, w: 34, h: 36, act: 'undo' }, { x: PX + 728, y: PY + PH + 14, w: 34, h: 36, act: 'clear' }); return b; };
  GAME.down = (x, y) => {
    if (mode !== 'play' || !turn) return;
    if (choice) { choice.forEach((w, i) => { if (x > 420 && x < 860 && y > 230 + i * 80 && y < 290 + i * 80) pick(w); }); return; }
    if (!isDrawer() || turn.picking || turn.over) return;
    for (const b of tools()) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
      if (b.c) tool.c = b.c; if (b.size) tool.w = b.size;
      if (b.act === 'undo') { const last = strokes[strokes.length - 1]; if (last) { strokes.pop(); redraw(); MP.send({ t: 'undo', id: last.id }); } }
      if (b.act === 'clear') { strokes = []; redraw(); MP.send({ t: 'clr' }); }
      K.sfx(700, .04, 'square', .04); return;
    }
    if (!inPaper(x, y)) return;
    cur = { id: me() + '-' + Date.now() % 1e6 + '-' + strokes.length, c: tool.c, w: tool.w };
    const p = [Math.round(x - PX), Math.round(y - PY)]; addPts({ ...cur, p }); emit({ ...cur, p });
  };
  GAME.move = (x, y) => { if (!cur) return; const p = [Math.round(Math.max(0, Math.min(PW, x - PX))), Math.round(Math.max(0, Math.min(PH, y - PY)))]; const st = strokes.find(s => s.id === cur.id); if (st && Math.hypot(st.p[st.p.length - 2] - p[0], st.p[st.p.length - 1] - p[1]) < 2) return; addPts({ ...cur, p }); emit({ ...cur, p }); };
  GAME.up = () => { cur = null; };
  GAME.key = () => {};
  /* ---------- kit hooks ---------- */
  GAME.reset = () => {
    cur = null; outbox = []; botDraw = null; redraw();
    if (K.bot) { roster = [{ id: 0, name: 'You', col: MP.colors[0] }, { id: 'bot', name: 'Doodle Bot', col: MP.colors[1] }, { id: 7, name: 'Ava', col: MP.colors[2] }, { id: 8, name: 'Ben', col: MP.colors[3] }]; scores = { 0: 120, bot: 80, 7: 210, 8: 90 }; solo = true; mode = 'play'; chat = []; totalTurns = 99; turnNo = 3; onMsg({ t: 'turn', d: 'bot', n: 3 }); return; }
    mode = 'lobby'; turn = null; showInput(false); MP.show();
  };
  GAME.update = dt => {
    if (mode !== 'play' || !turn) return;
    if (turn.picking && choice) { turn.pickT -= dt; if (turn.pickT <= 0) pick(choice[0]); }
    if (!turn.picking && !turn.over) {
      turn.left = Math.max(0, turn.left - dt);
      const drv = isDrawer() || (turn.d === 'bot' && (solo || K.bot));
      if (drv) {
        const n = turn.word.replace(/ /g, '').length, want = Math.floor(n * (turn.left < TURN * .3 ? .5 : turn.left < TURN * .6 ? .25 : 0));
        if ((turn.mask.match(/[a-z]/gi) || []).length < want) { const hid = [...turn.word].map((ch, i) => turn.mask[i] === '_' ? i : -1).filter(i => i >= 0); const i = K.pick(hid); turn.mask = turn.mask.slice(0, i) + turn.word[i] + turn.mask.slice(i + 1); MP.send({ t: 'hint', mask: turn.mask }); }
        turn.tickT = (turn.tickT || 0) - dt; if (turn.tickT <= 0) { turn.tickT = 2; MP.send({ t: 'tick', left: Math.round(turn.left) }); }
        if (turn.left <= 0) { if (K.bot) { turn.left = TURN; strokes = []; redraw(); onMsg({ t: 'turn', d: 'bot', n: turnNo }); } else endTurn(); }
      }
    }
    if (turn.d === 'bot') stepBot(dt);
    if (outbox.length) { sendT -= dt; if (sendT <= 0) { sendT = .05; MP.send({ t: 'd', s: outbox.splice(0) }); } }
  };
  /* ---------- drawing ---------- */
  GAME.draw = g => {
    const v = K.view, t = K.t;
    g.fillStyle = '#f4efe4'; g.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    g.strokeStyle = 'rgba(80,120,200,.12)'; g.lineWidth = 1; for (let y = 0; y < 720; y += 28) { g.beginPath(); g.moveTo(v.x0, y); g.lineTo(v.x1, y); g.stroke(); }
    // paper
    g.save(); g.translate(PX, PY); g.rotate(-.004); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(8, 10, PW, PH); g.drawImage(paper, 0, 0); g.strokeStyle = '#2a2a2a'; g.lineWidth = 4; g.strokeRect(0, 0, PW, PH); g.restore();
    g.fillStyle = '#ffd23f'; g.globalAlpha = .7; g.fillRect(PX + PW / 2 - 50, PY - 14, 100, 26); g.globalAlpha = 1;
    g.textBaseline = 'middle';
    if (mode !== 'play' || !turn) {
      g.font = '64px "Patrick Hand"'; g.textAlign = 'center'; g.fillStyle = '#2a2a2a'; g.fillText('Doodle Guess', PX + PW / 2, PY + PH / 2); return;
    }
    // word / hint bar
    g.fillStyle = '#fffdf6'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.roundRect(PX, 18, PW, 72, 14); g.fill(); g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#2a2a2a';
    if (turn.picking) { g.font = '30px "Patrick Hand"'; g.fillText(isDrawer() ? 'Pick a word to draw' : `${nameOf(turn.d)} is picking a word...`, PX + PW / 2, 54); }
    else if (turn.over || isDrawer() || (turn.d === 'bot' && guessed.has(me()))) { g.font = '40px "Patrick Hand"'; g.fillText(turn.word || '', PX + PW / 2, 52); if (isDrawer() && !turn.over) { g.font = '18px "Patrick Hand"'; g.fillStyle = '#888'; g.fillText('your word: draw it!', PX + PW / 2, 80); } }
    else { g.font = '42px "Patrick Hand"'; g.fillText(turn.mask.split('').join(' ').replace(/   /g, '    '), PX + PW / 2, 50); g.font = '17px "Patrick Hand"'; g.fillStyle = '#888'; g.fillText(`${turn.word ? turn.word.length : turn.mask.length} letters`, PX + PW / 2, 80); }
    // timer
    const tl = turn.picking ? (turn.pickT || 12) / 12 : turn.left / TURN;
    g.fillStyle = '#fffdf6'; g.beginPath(); g.arc(PX + PW - 36, 54, 30, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = turn.left < 15 && !turn.picking ? '#e8343a' : '#3ddc84'; g.lineWidth = 7; g.beginPath(); g.arc(PX + PW - 36, 54, 24, -1.571, -1.571 + 6.283 * tl); g.stroke();
    g.fillStyle = '#2a2a2a'; g.font = '22px "Patrick Hand"'; g.fillText(turn.picking ? '' : Math.ceil(turn.left), PX + PW - 36, 55);
    g.font = '22px "Patrick Hand"'; g.textAlign = 'left'; g.fillText(`Turn ${Math.min(turnNo, totalTurns)}/${totalTurns > 50 ? '∞' : totalTurns}`, PX + 16, 54);
    // players
    const rank = roster.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    g.font = '24px "Patrick Hand"'; g.fillStyle = '#2a2a2a'; g.textAlign = 'left'; g.fillText('Players', 22, 120);
    rank.forEach((r, i) => {
      const y = 150 + i * 56; g.fillStyle = guessed.has(r.id) ? '#d9f7e2' : r.id === turn.d ? '#fff1c2' : '#fffdf6'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(18, y, 232, 48, 12); g.fill(); g.stroke();
      g.fillStyle = r.col; g.beginPath(); g.arc(42, y + 24, 13, 0, 7); g.fill(); g.strokeStyle = '#2a2a2a'; g.stroke();
      g.fillStyle = '#2a2a2a'; g.font = '22px "Patrick Hand"'; g.fillText((r.id === me() && !K.bot ? 'You' : r.name).slice(0, 12) + (r.id === turn.d ? ' ✏️' : ''), 62, y + 18); g.font = '17px "Patrick Hand"'; g.fillStyle = '#666'; g.fillText(`${scores[r.id] || 0} pts`, 62, y + 37);
      if (guessed.has(r.id)) { g.fillStyle = '#1fa84a'; g.font = '22px "Patrick Hand"'; g.textAlign = 'right'; g.fillText('✓', 240, y + 25); g.textAlign = 'left'; }
    });
    // chat
    g.fillStyle = '#fffdf6'; g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.roundRect(1048, 112, 214, 500, 14); g.fill(); g.stroke();
    g.font = '18px "Patrick Hand"'; let y = 600;
    for (let i = chat.length - 1; i >= 0 && y > 130; i--) { const c = chat[i], lines = wrap(g, c.s, 196); for (let k = lines.length - 1; k >= 0 && y > 130; k--) { g.fillStyle = c.c; g.fillText(lines[k], 1058, y); y -= 22; } y -= 4; }
    // tools for the artist, word choice
    if (isDrawer() && !turn.picking && !turn.over) for (const b of tools()) {
      g.strokeStyle = '#2a2a2a'; g.lineWidth = (b.c && b.c === tool.c) || (b.size && b.size === tool.w) ? 4 : 2;
      if (b.c) { g.fillStyle = b.c; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 8); g.fill(); g.stroke(); }
      else { g.fillStyle = '#fffdf6'; g.beginPath(); g.roundRect(b.x, b.y, b.w, b.h, 8); g.fill(); g.stroke(); g.fillStyle = '#2a2a2a'; if (b.size) { g.beginPath(); g.arc(b.x + 18, b.y + 18, Math.min(14, b.size / 2), 0, 7); g.fill(); } else { g.font = '22px "Patrick Hand"'; g.textAlign = 'center'; g.fillText(b.act === 'undo' ? '↶' : '🗑', b.x + 17, b.y + 19); g.textAlign = 'left'; } }
    }
    if (choice) {
      g.fillStyle = 'rgba(244,239,228,.92)'; g.fillRect(PX, PY, PW, PH);
      g.textAlign = 'center'; g.fillStyle = '#2a2a2a'; g.font = '34px "Patrick Hand"'; g.fillText('Choose a word to draw', PX + PW / 2, 190);
      choice.forEach((w, i) => { g.fillStyle = ['#ffd23f', '#3ec5ff', '#ff9fb2'][i]; g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.beginPath(); g.roundRect(420, 230 + i * 80, 440, 60, 16); g.fill(); g.stroke(); g.fillStyle = '#2a2a2a'; g.font = '32px "Patrick Hand"'; g.fillText(w, 640, 261 + i * 80); });
    }
    if (turn.over) { g.textAlign = 'center'; g.font = '30px "Patrick Hand"'; g.fillStyle = '#2a5bd7'; g.fillText(`It was: ${turn.word}`, PX + PW / 2, PY + PH - 26); }
    if (!isDrawer() && !turn.over && !turn.picking && !K.bot) { g.textAlign = 'center'; g.font = '18px "Patrick Hand"'; g.fillStyle = '#888'; g.fillText('Type your guess in the box below', PX + PW / 2, PY + PH + 34); }
  };
  function wrap(g, s, w) { const out = []; let line = ''; for (const word of s.split(' ')) { const tt = line ? line + ' ' + word : word; if (g.measureText(tt).width > w && line) { out.push(line); line = word; } else line = tt; } if (line) out.push(line); return out; }
  // cover art: a rocket mid-sketch with the room shouting guesses
  GAME.pose = () => {
    strokes = []; redraw(); turn.left = 23; turn.mask = 'r _ c _ _ t'.replace(/ /g, '');
    const w = 'rocket'; botDraw = { flat: DOODLES[w].map(([c, pts]) => ({ c, pts: pts.map(([x, y]) => [x * 4.6 + 150, y * 4.6 + 20]) })), si: 0, pi: 0, t: 0 }; turn.word = w;
    for (let k = 0; k < 400; k++) stepBot(1 / 26);
    for (const [x, y, r] of [[170, 120, 4], [600, 90, 5], [640, 400, 3], [130, 380, 4]]) addPts({ id: 'st' + x, c: '#ffd23f', w: 6, p: [x - r * 3, y, x + r * 3, y, x, y, x, y - r * 3, x, y + r * 3] });
    chat = []; say('Ben: fireworks', '#333'); say('Mia: pencil?!', '#333'); say('Ava guessed it! +241', '#1fa84a'); say('Leo: is it a ROCKET', '#333'); say('Leo guessed it! +198', '#1fa84a'); guessed = new Set([7]);
  };
  if (/[?&]test/.test(location.search)) window.DG = { get turn() { return turn; }, get scores() { return scores; }, get strokes() { return strokes; }, get chat() { return chat; }, get mode() { return mode; }, pick };
})();
