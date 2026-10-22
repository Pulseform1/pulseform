(function () {
  'use strict';

  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var FILES = 'abcdefgh';
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('gc.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('gc.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  // ---------- Settings ----------
  var OPT = Object.assign({ sound: true, legal: true, coords: true, pieces: 'cburnett', board: 'green' }, store.get('opt', {}));
  function saveOpt() { store.set('opt', OPT); }

  // ---------- Move classification ----------
  var CLASSES = {
    brilliant:  { label: 'Brilliant',  glyph: '!!' },
    great:      { label: 'Great',      glyph: '!' },
    best:       { label: 'Best',       path: '<polygon points="10,3.4 12,7.6 16.5,8.1 13.1,11.1 14.1,15.6 10,13.3 5.9,15.6 6.9,11.1 3.5,8.1 8,7.6" fill="#fff"/>' },
    excellent:  { label: 'Excellent',  path: '<path d="M5 9.2h2.4v6.2H5zM8.4 9.2l2.3-4.4c.9 0 1.7.8 1.5 1.7l-.4 2.1h2.9c.9 0 1.5.8 1.3 1.6l-1 3.9c-.2.7-.8 1.1-1.4 1.1H8.4z" fill="#fff"/>' },
    good:       { label: 'Good',       path: '<path d="M5.6 10.3l3 3 5.8-6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' },
    book:       { label: 'Book',       path: '<path d="M4 6.1c2-.8 4-.6 5.3.6v8.1c-1.3-1.1-3.3-1.3-5.3-.6zM16 6.1c-2-.8-4-.6-5.3.6v8.1c1.3-1.1 3.3-1.3 5.3-.6z" fill="#fff"/>' },
    inaccuracy: { label: 'Inaccuracy', glyph: '?!' },
    mistake:    { label: 'Mistake',    glyph: '?' },
    miss:       { label: 'Miss',       path: '<path d="M6.6 6.6l6.8 6.8M13.4 6.6l-6.8 6.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' },
    blunder:    { label: 'Blunder',    glyph: '??' }
  };
  var CLASS_ORDER = ['brilliant', 'great', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'miss', 'blunder'];
  var BAD = ['inaccuracy', 'mistake', 'miss', 'blunder'];
  function clsColor(k) { return 'var(--c-' + (k === 'inaccuracy' ? 'inacc' : k) + ')'; }
  // Round move-quality icon, drawn here so it works at any size.
  function icon(k, size) {
    var c = CLASSES[k], inner = c.path || '<text x="10" y="14.1" text-anchor="middle" font-size="' + (c.glyph.length > 1 ? 9.5 : 11.5) + '" font-weight="800" fill="#fff" font-family="Atkinson Hyperlegible, system-ui, sans-serif">' + c.glyph + '</text>';
    return '<svg class="ci" viewBox="0 0 20 20" width="' + size + '" height="' + size + '" role="img" aria-label="' + c.label + '"><circle cx="10" cy="10" r="10" fill="' + clsColor(k) + '"/>' + inner + '</svg>';
  }
  function winPct(cp) { cp = Math.max(-1500, Math.min(1500, cp)); return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1); }
  function moveAccuracy(drop) { return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669)); }
  function fmtEval(e) {
    if (!e) return '…';
    if (e.mate != null) return (e.mate > 0 ? '' : '−') + 'M' + Math.abs(e.mate);
    var v = e.cp / 100;
    return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
  }

  // ---------- Opening book ----------
  var NAME_BY_KEY = {}, BOOK_NEXT = {};
  function addLine(moves) {
    var arr = moves.split(' ');
    for (var i = 0; i < arr.length; i++) {
      var key = arr.slice(0, i).join(' ');
      (BOOK_NEXT[key] = BOOK_NEXT[key] || {})[arr[i]] = 1;
    }
  }
  OPENINGS.NAMES.forEach(function (n) { NAME_BY_KEY[n[2]] = { eco: n[0], name: n[1] }; addLine(n[2]); });
  OPENINGS.COURSES.forEach(function (c) { addLine(c.moves); });
  function isBook(sans) { var k = sans.slice(0, -1).join(' '); return !!(BOOK_NEXT[k] && BOOK_NEXT[k][sans[sans.length - 1]]); }
  function bookNext(sans) { return Object.keys(BOOK_NEXT[sans.join(' ')] || {}); }
  function openingName(sans) {
    for (var k = sans.length; k > 0; k--) { var o = NAME_BY_KEY[sans.slice(0, k).join(' ')]; if (o) return o; }
    return null;
  }

  // ---------- Stockfish wrapper ----------
  function parseInfo(l) {
    var t = l.split(' ');
    var at = function (k) { var i = t.indexOf(k); return i < 0 ? null : t[i + 1]; };
    var si = t.indexOf('score'), pi = t.indexOf('pv');
    if (si < 0 || pi < 0) return null;
    if (t[si + 3] === 'lowerbound' || t[si + 3] === 'upperbound') return null;
    var type = t[si + 1], val = +t[si + 2];
    return { depth: +at('depth'), multipv: +(at('multipv') || 1), cp: type === 'cp' ? val : null, mate: type === 'mate' ? val : null, pv: t.slice(pi + 1) };
  }
  function Engine() {
    var self = this;
    this.listeners = [];
    this.chain = Promise.resolve();
    this.cur = null;
    this.failed = false;
    this.name = null;
    this.ready = this.boot('sf17.js', 'Stockfish 17', 20000)
      .catch(function () { return self.boot('stockfish.js', 'Stockfish 10', 45000); })
      .then(function (name) { self.name = name; }, function (e) { self.failed = true; throw e; });
    this.ready.catch(function () {});
  }
  // Start a worker and wait for the UCI handshake; reject if it never comes.
  Engine.prototype.boot = function (url, name, timeout) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var w, done = false;
      try { w = new Worker(url); } catch (e) { reject(e); return; }
      var fail = function (e) { if (done) return; done = true; clearTimeout(t); w.terminate(); reject(e || new Error('engine timeout')); };
      var t = setTimeout(fail, timeout);
      w.onerror = function (e) { fail(e); };
      w.onmessage = function (e) {
        if (done || String(e.data).trim() !== 'uciok') return;
        done = true; clearTimeout(t); self.w = w;
        w.onmessage = function (ev) { var l = String(ev.data); self.listeners.slice().forEach(function (f) { f(l); }); };
        w.onerror = function () { self.failed = true; engineOk = false; onEngineState(); };
        resolve(name);
      };
      w.postMessage('uci');
    });
  };
  Engine.prototype.post = function (c) { this.w.postMessage(c); };
  Engine.prototype.off = function (f) { var i = this.listeners.indexOf(f); if (i >= 0) this.listeners.splice(i, 1); };
  // Scores come back from the side-to-move's point of view.
  Engine.prototype.search = function (fen, opts, onInfo) {
    var self = this, job = { cancelled: false };
    opts = opts || {};
    job.promise = this.chain.then(function () {
      if (job.cancelled) return null;
      return self.ready.then(function () {
        if (job.cancelled) return null;
        self.cur = job;
        self.post('setoption name UCI_LimitStrength value ' + (opts.elo ? 'true' : 'false'));
        if (opts.elo) self.post('setoption name UCI_Elo value ' + opts.elo);
        self.post('setoption name Skill Level value ' + (opts.skill == null ? 20 : opts.skill));
        self.post('setoption name MultiPV value ' + (opts.multipv || 1));
        self.post('position fen ' + fen);
        return new Promise(function (resolve) {
          var lines = [];
          var f = function (l) {
            if (l.indexOf('info') === 0 && l.indexOf(' pv ') > 0) {
              var d = parseInfo(l);
              if (d) { lines[d.multipv - 1] = d; if (onInfo && !job.cancelled) onInfo(lines.slice(), d.depth); }
            } else if (l.indexOf('bestmove') === 0) {
              self.off(f); self.cur = null;
              resolve(job.cancelled ? null : { best: l.split(' ')[1], lines: lines });
            }
          };
          self.listeners.push(f);
          var go = 'go';
          if (opts.depth) go += ' depth ' + opts.depth;
          if (opts.movetime) go += ' movetime ' + opts.movetime;
          self.post(go);
        });
      });
    });
    this.chain = job.promise.catch(function () {});
    job.cancel = function () { job.cancelled = true; if (self.cur === job) self.post('stop'); };
    return job;
  };

  var analyser = new Engine();
  var botEngine = new Engine();
  var engineOk = null;
  analyser.ready.then(function () { engineOk = true; onEngineState(); }, function () { engineOk = false; onEngineState(); });
  function onEngineState() {
    if (analyser.failed) engineOk = false;
    var el = document.getElementById('engineSt');
    if (el) {
      el.className = 'engine-st' + (engineOk ? ' ok' : engineOk === false ? ' bad' : '');
      el.lastChild.textContent = engineOk ? (analyser.name || 'Stockfish') + ' ready' : engineOk === false ? 'Engine unavailable' : 'Loading Stockfish\u2026';
    }
    renderPanel();
  }

  // Eval cache keyed by FEN, scores from White's point of view.
  var evalCache = {}, evalPending = {};
  function lineToWhite(line, turn) {
    var cp, mate = null;
    if (line.mate != null) { mate = line.mate; cp = line.mate > 0 ? 10000 - line.mate : line.mate === 0 ? -10000 : -10000 - line.mate; }
    else cp = line.cp;
    if (line.mate === 0) mate = 0;
    if (turn === 'b') { cp = -cp; if (mate != null) mate = -mate; }
    return { cp: cp, mate: mate };
  }
  function terminalEval(c) {
    if (c.in_checkmate()) { var w = c.turn() === 'b'; return { cp: w ? 10000 : -10000, mate: 0, best: null, pv: [], depth: 99, over: true }; }
    if (c.game_over()) return { cp: 0, mate: null, best: null, pv: [], depth: 99, over: true };
    return null;
  }
  function evaluate(fen, quick) {
    if (evalCache[fen]) return Promise.resolve(evalCache[fen]);
    var c = new Chess(fen), t = terminalEval(c);
    if (t) { evalCache[fen] = t; return Promise.resolve(t); }
    if (engineOk === false) return Promise.resolve(null);
    if (evalPending[fen]) return evalPending[fen];
    var job = analyser.search(fen, quick ? { depth: 14, movetime: 180, multipv: 2 } : { depth: 18, movetime: 450, multipv: 2 });
    return evalPending[fen] = job.promise.then(function (r) {
      delete evalPending[fen];
      if (!r || !r.lines[0]) return null;
      var e = lineToWhite(r.lines[0], c.turn());
      e.best = r.best; e.pv = r.lines[0].pv; e.depth = r.lines[0].depth;
      if (r.lines[1]) e.second = lineToWhite(r.lines[1], c.turn()).cp;
      if (!evalCache[fen] || evalCache[fen].depth < e.depth) evalCache[fen] = e;
      return evalCache[fen];
    }).catch(function () { delete evalPending[fen]; return null; });
  }
  function uciToSan(fen, uci) {
    if (!uci || uci === '(none)') return null;
    var c = new Chess(fen), m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
    return m ? m.san : null;
  }
  function pvToSan(fen, pv, max) {
    var c = new Chess(fen), out = [];
    for (var i = 0; i < pv.length && i < max; i++) {
      var u = pv[i], m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' });
      if (!m) break;
      out.push({ san: m.san, color: m.color, num: c.history().length });
    }
    return out;
  }

  // ---------- State ----------
  var BOTS = [
    { id: 'pip', piece: 'p', color: '#6F9E48', tag: 'Beginner', name: 'Pip', init: 'Pi', rating: 400, skill: 0, depth: 1, rand: 0.35, time: 200, book: false, blurb: 'Just learned how the knight moves. Leaves pieces hanging and sometimes notices yours.' },
    { id: 'mara', piece: 'n', color: '#C9773E', tag: 'Casual', name: 'Mara', init: 'Ma', rating: 800, skill: 2, depth: 2, rand: 0.15, time: 300, book: true, blurb: 'Knows a few openings and loves an early queen raid. Misses quiet threats.' },
    { id: 'theo', piece: 'b', color: '#4C83B5', tag: 'Intermediate', name: 'Theo', init: 'Th', rating: 1200, skill: 6, depth: 4, rand: 0.05, time: 500, book: true, blurb: 'Club regular. Plays sound openings and punishes loose pieces.' },
    { id: 'iris', piece: 'r', color: '#8963B7', tag: 'Club player', name: 'Iris', init: 'Ir', rating: 1600, elo: 1600, skill: 10, depth: 12, rand: 0, time: 600, book: true, blurb: 'Patient and solid. Happy to grind a small edge into a won endgame.' },
    { id: 'viktor', piece: 'q', color: '#B4433B', tag: 'Advanced', name: 'Viktor', init: 'Vi', rating: 2000, elo: 2000, skill: 15, depth: 14, rand: 0, time: 700, book: true, blurb: 'Sharp tactician. Calculates deep and rarely gives anything away.' },
    { id: 'sf', piece: 'k', color: '#1E1D1B', tag: 'Engine', name: 'Stockfish', init: 'SF', rating: 3000, skill: 20, depth: 22, rand: 0, time: 900, book: true, blurb: 'The engine at full strength. Every mistake gets punished.' }
  ];

  var S = {
    mode: 'play',
    startFen: START,
    game: new Chess(),
    plies: [],          // {san, from, to, uci, color, fenBefore, fen, cls, drop, bestSan, bestUci, evalBefore, evalAfter}
    view: 0,
    orient: 'w',
    selected: null,
    hintArrow: null,
    gen: 0,             // bumps whenever the game is replaced, so stale async work is dropped
    // play
    bot: BOTS.find(function (b) { return b.id === store.get('bot', 'theo'); }) || BOTS[2],
    youPick: store.get('color', 'w'),
    you: 'w',
    playing: false,
    botThinking: false,
    botJob: null,
    showRatings: store.get('ratings', true),
    tc: store.get('tc', 'none'), clock: null, flagged: null, threatMsg: null,
    anTab: 'engine', opFilter: 'all', importDraft: '',
    resigned: false,
    // analyse
    liveJob: null, liveLines: [], liveDepth: 0, liveFen: null,
    review: null,       // {done, total}
    importErr: '',
    // learn
    course: null, courseMistakes: 0, courseMsg: null, courseDone: false
  };

  function curFen() { return S.view === 0 ? S.startFen : S.plies[S.view - 1].fen; }
  function sansTo(n) { return S.plies.slice(0, n).map(function (p) { return p.san; }); }
  function atEnd() { return S.view === S.plies.length; }

  function resetGame(fen) {
    S.gen++;
    if (S.botJob) S.botJob.cancel();
    stopLive();
    S.startFen = fen || START;
    S.game = new Chess(S.startFen);
    S.plies = []; S.view = 0; S.selected = null; S.hintArrow = null;
    S.botThinking = false; S.resigned = false; S.review = null; S.planCourse = null;
  }
  function rebuildGame() {
    S.game = new Chess(S.startFen);
    S.plies.forEach(function (p) { S.game.move(p.san); });
  }

  // ---------- Making moves ----------
  function pushMove(m) {
    var fenBefore = S.game.fen();
    var mv = S.game.move(m);
    if (!mv) return null;
    var rec = { san: mv.san, from: mv.from, to: mv.to, uci: mv.from + mv.to + (mv.promotion || ''), color: mv.color, fenBefore: fenBefore, fen: S.game.fen(), cls: null };
    S.plies.push(rec);
    S.view = S.plies.length;
    S.selected = null; S.hintArrow = null; S.threatMsg = null;
    return rec;
  }

  // Grade one move from the evals before and after it (both from White's view).
  function classify(rec, b, a, book, prev) {
    var sign = rec.color === 'w' ? 1 : -1;
    var wpB = winPct(sign * b.cp), wpA = winPct(sign * a.cp), drop = Math.max(0, wpB - wpA), cls;
    rec.evalBefore = b; rec.evalAfter = a; rec.drop = drop;
    rec.bestUci = b.best; rec.bestSan = uciToSan(rec.fenBefore, b.best);
    rec.replyUci = a.best || null; rec.replySan = a.best ? uciToSan(rec.fen, a.best) : null;
    if (book) cls = 'book';
    else if ((b.best && rec.uci === b.best) || (a.over && a.mate === 0)) cls = 'best';
    else if (drop < 2) cls = 'excellent';
    else if (drop < 5) cls = 'good';
    else if (drop < 10) cls = 'inaccuracy';
    else if (drop < 20) cls = 'mistake';
    else cls = 'blunder';
    if (!book && (cls === 'best' || cls === 'excellent') && wpA >= 50 && wpB <= 95 && isSacrifice(rec)) cls = 'brilliant';
    else if (!book && cls === 'best' && b.second != null && wpB - winPct(sign * b.second) >= 15 && wpA >= 40) cls = 'great';
    else if ((cls === 'mistake' || cls === 'blunder') && wpB >= 65 && prev && ['mistake', 'blunder', 'miss'].indexOf(prev.cls) >= 0) cls = 'miss';
    rec.cls = cls;
    rec.acc = ['book', 'best', 'brilliant', 'great'].indexOf(cls) >= 0 ? 100 : moveAccuracy(drop);
  }
  function rateMove(rec, gen) {
    var idx = S.plies.indexOf(rec), book = isBook(sansTo(idx + 1));
    return evaluate(rec.fenBefore).then(function (b) {
      if (gen !== S.gen) return;
      return evaluate(rec.fen).then(function (a) {
        if (gen !== S.gen || !b || !a) return;
        classify(rec, b, a, book, S.plies[idx - 1]);
        if (S.mode === 'play' && rec.color === S.you && ['mistake', 'blunder', 'miss'].indexOf(rec.cls) >= 0 && rec.bestUci) saveMistake(rec, S.bot.name);
        render();
      });
    });
  }

  // A move gives up material if the opponent can now win a piece (knight or bigger)
  // for less than it's worth, beyond whatever this move captured.
  var VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  function isSacrifice(rec) {
    var c = new Chess(rec.fen);
    if (c.game_over()) return false;
    var took = new Chess(rec.fenBefore).get(rec.to), gained = took ? VAL[took.type] : 0, worst = 0;
    c.moves({ verbose: true }).forEach(function (m) {
      if (!m.captured || VAL[m.captured] < 3) return;
      var c2 = new Chess(rec.fen); c2.move(m);
      var recapture = c2.moves({ verbose: true }).some(function (x) { return x.to === m.to; });
      worst = Math.max(worst, VAL[m.captured] - (recapture ? VAL[m.piece] : 0));
    });
    return worst - gained >= 2;
  }

  function afterMove(rec) {
    var gen = S.gen;
    render();
    var rated = S.mode !== 'learn' ? rateMove(rec, gen) : null;
    if (S.mode === 'play') {
      clockMove(rec.color);
      if (S.game.game_over()) { S.playing = false; if (S.clock) S.clock.on = false; finishGame(gameResult()); render(); return; }
      // Let the rating (and the better-move arrow after a slip) sit on screen before the bot replies.
      var gate = null;
      if (rec.color === S.you && S.showRatings && rated) {
        gate = Promise.race([rated, sleep(5000)]).then(function () { if (BAD.indexOf(rec.cls) >= 0) return sleep(2200); });
      }
      if (gate && S.clock) { clockPause(); gate.then(clockResume); }
      if (S.game.turn() !== S.you) botTurn(gate);
    }
    if (S.mode === 'analyse') startLive();
  }

  function tryUserMove(from, to) {
    var c = new Chess(curFen());
    var piece = c.get(from);
    if (!piece) return false;
    var legal = c.moves({ square: from, verbose: true }).filter(function (m) { return m.to === to; });
    if (!legal.length) return false;
    var promo = legal.some(function (m) { return m.promotion; });
    if (promo) { askPromotion(piece.color, function (p) { if (p) commitUserMove({ from: from, to: to, promotion: p }); else { S.selected = null; render(); } }); return true; }
    commitUserMove({ from: from, to: to });
    return true;
  }

  function commitUserMove(m) {
    if (S.mode === 'analyse' && !atEnd()) {
      S.gen++; S.plies = S.plies.slice(0, S.view); S.review = null; rebuildGame();
    }
    if (S.mode === 'learn') return learnMove(m);
    if (S.mode === 'train') return T.view === 'puzzle' || T.view === 'rush' ? puzzleMove(m) : T.view === 'endgame' ? egMove(m) : mistakeMove(m);
    var rec = pushMove(m);
    if (rec) { sfx(rec); afterMove(rec); }
  }

  function canInteract() {
    if (S.mode === 'play') return S.playing && atEnd() && !S.botThinking && S.game.turn() === S.you && !S.game.game_over();
    if (S.mode === 'learn') return !!S.course && !S.courseDone && atEnd() && S.game.turn() === S.course.side && !S.learnBusy;
    if (S.mode === 'train') {
      if (T.view === 'puzzle') return T.pz && (T.pz.status === 'you' || T.pz.status === 'retry') && atEnd();
      if (T.view === 'rush') return T.rush && T.rush.running && T.pz && T.pz.status === 'you' && atEnd();
      if (T.view === 'endgame') return T.eg && T.eg.status === 'you' && atEnd();
      if (T.view === 'mistakes') return T.mk && T.mk.status === 'you' && atEnd();
      return false;
    }
    return !new Chess(curFen()).game_over();
  }

  // ---------- Bot ----------
  function botTurn(gate) {
    var gen = S.gen, bot = S.bot, t0 = Date.now();
    S.botThinking = true; render();
    var fen = S.game.fen(), sans = sansTo(S.plies.length);
    var choose;
    var book = bookNext(sans);
    if (bot.book && book.length && Math.random() < 0.85) {
      choose = Promise.resolve({ san: book[Math.floor(Math.random() * book.length)] });
    } else if (Math.random() < bot.rand || engineOk === false) {
      var ms = S.game.moves({ verbose: true });
      var caps = ms.filter(function (m) { return m.captured; });
      var pool = caps.length && Math.random() < 0.5 ? caps : ms;
      var m = pool[Math.floor(Math.random() * pool.length)];
      choose = Promise.resolve({ from: m.from, to: m.to, promotion: m.promotion });
    } else {
      // Stockfish 17 has calibrated Elo limiting; the old fallback only knows Skill Level.
      var useElo = bot.elo && botEngine.name === 'Stockfish 17';
      S.botJob = botEngine.search(fen, { skill: bot.skill, elo: useElo ? bot.elo : null, depth: bot.depth, movetime: bot.time });
      choose = S.botJob.promise.then(function (r) {
        if (!r || !r.best || r.best === '(none)') return null;
        return { from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] };
      });
    }
    choose.then(function (m) {
      var wait = Math.max(0, 350 + Math.random() * 350 - (Date.now() - t0));
      return Promise.all([sleep(wait), gate]).then(function () { return m; });
    }).then(function (m) {
      if (gen !== S.gen) return;
      S.botThinking = false; S.botJob = null;
      if (!m) { render(); return; }
      var rec = pushMove(m.san || m);
      if (rec) { sfx(rec); afterMove(rec); } else render();
    });
  }

  function startPlay() {
    resetGame(); S.saved = false; S.clock = newClock(S.tc); S.flagged = null;
    S.you = S.youPick === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : S.youPick;
    S.orient = S.you; S.playing = true;
    evaluate(START);
    render();
    if (S.you === 'b') botTurn();
  }

  function takeback() {
    if (S.mode !== 'play' || !S.plies.length) return;
    S.gen++;
    if (S.botJob) S.botJob.cancel();
    S.botThinking = false;
    var turnAt = function (k) { return (k ? S.plies[k - 1].fen : S.startFen).split(' ')[1]; };
    S.plies = S.plies.slice(0, -1);
    while (S.plies.length && turnAt(S.plies.length) !== S.you) S.plies.pop();
    rebuildGame(); S.view = S.plies.length; S.playing = true; S.resigned = false;
    if (S.clock) { S.clock.turn = S.game.turn(); S.clock.stamp = Date.now(); S.clock.hold = false; S.clock.on = true; }
    // Re-rate anything left unrated by the cancelled work.
    S.plies.forEach(function (p) { if (!p.cls) rateMove(p, S.gen); });
    render();
    if (S.game.turn() !== S.you) botTurn();
  }

  // ---------- Hints ----------
  function showHint() {
    if (S.mode === 'train' && T.view === 'endgame') {
      var f = curFen(), g0 = S.gen;
      evaluate(f).then(function (e) { if (g0 === S.gen && e && e.best) { S.hintArrow = { from: e.best.slice(0, 2), to: e.best.slice(2, 4), tone: 'hint' }; render(); } });
      return;
    }
    if (S.mode === 'learn') {
      var exp = S.course.moves.split(' ')[S.plies.length];
      var m = new Chess(curFen()).move(exp);
      if (m) { S.hintArrow = { from: m.from, to: m.to, tone: 'hint' }; S.courseMistakes += 0; render(); }
      return;
    }
    var fen = curFen(), gen = S.gen;
    S.hintArrow = { loading: true }; render();
    evaluate(fen).then(function (e) {
      if (gen !== S.gen || curFen() !== fen) return;
      S.hintArrow = e && e.best ? { from: e.best.slice(0, 2), to: e.best.slice(2, 4), tone: 'hint' } : null;
      render();
    });
  }

  // ---------- Live analysis ----------
  function stopLive() { if (S.liveJob) { S.liveJob.cancel(); S.liveJob = null; } }
  function startLive() {
    stopLive();
    if (S.mode !== 'analyse' || engineOk === false || (S.imp && !S.imp.finished)) return;
    var fen = curFen(), c = new Chess(fen);
    S.liveFen = fen; S.liveLines = []; S.liveDepth = 0;
    if (c.game_over()) { renderPanel(); return; }
    var turn = c.turn();
    S.liveJob = analyser.search(fen, { depth: 26, multipv: 3 }, function (lines, depth) {
      if (S.liveFen !== fen) return;
      S.liveLines = lines.filter(Boolean).map(function (l) { var e = lineToWhite(l, turn); e.pv = l.pv; e.depth = l.depth; return e; });
      S.liveDepth = depth;
      var top = S.liveLines[0];
      if (top && top.depth >= 12 && (!evalCache[fen] || evalCache[fen].depth < top.depth)) {
        evalCache[fen] = { cp: top.cp, mate: top.mate, best: top.pv[0], pv: top.pv, depth: top.depth };
      }
      throttleLive();
    });
    renderPanel();
  }
  var liveTimer = null;
  function throttleLive() { if (liveTimer) return; liveTimer = setTimeout(function () { liveTimer = null; renderEval(); renderLines(); }, 250); }

  function runReview() {
    var gen = S.gen;
    var todo = S.plies.filter(function (p) { return !p.cls; });
    S.review = { done: S.plies.length - todo.length, total: S.plies.length };
    S.anTab = 'review';
    stopLive(); render();
    var chain = Promise.resolve();
    todo.forEach(function (p) {
      chain = chain.then(function () { if (gen !== S.gen) return; return rateMove(p, gen).then(function () { if (gen === S.gen) { S.review.done++; renderPanel(); } }); });
    });
    chain.then(function () { if (gen === S.gen) { S.review.done = S.review.total; render(); startLive(); } });
  }

  function loadImport(text) {
    text = (text || '').trim();
    S.importErr = '';
    if (!text) return;
    var many = splitPgns(text);
    if (many.length > 1) { importMany(many); return; }
    var c = new Chess();
    var fenTry = new Chess();
    if (/^[rnbqkpRNBQKP1-8]+(\/[rnbqkpRNBQKP1-8]+){7}\s[wb]/.test(text)) {
      if (!fenTry.load(text)) { S.importErr = 'That FEN isn\'t a legal position. Check the piece placement and side to move.'; render(); return; }
      resetGame(fenTry.fen()); S.orient = fenTry.turn(); S.anTab = 'engine'; render(); startLive(); return;
    }
    if (!c.load_pgn(text, { sloppy: true })) { S.importErr = 'Couldn\'t read that PGN. Paste the full game text, including the move numbers.'; render(); return; }
    var hdr = c.header(), moves = c.history();
    resetGame(hdr.FEN || START);
    moves.forEach(function (s) { pushMove(s); });
    var un = (store.get('username', '') || '').toLowerCase();
    S.view = 0; S.orient = un && (hdr.Black || '').toLowerCase() === un ? 'b' : 'w';
    render(); runReview();
  }

  // ---------- Openings trainer ----------
  function courseProgress() { return store.get('courses', {}); }
  function startCourse(c) {
    resetGame(); S.course = c; S.orient = c.side; S.courseMistakes = 0; S.courseDone = false; S.learnBusy = false;
    S.courseMsg = { tone: 'info', text: c.side === 'w' ? 'You have White. Play the first move of the line.' : 'You have Black. Watch White\'s move, then reply.' };
    render();
    if (c.side === 'b') learnOpponent();
  }
  function courseMoves() { return S.course.moves.split(' '); }
  function learnOpponent() {
    var gen = S.gen; S.learnBusy = true; render();
    sleep(550).then(function () {
      if (gen !== S.gen) return;
      var mv = courseMoves()[S.plies.length];
      var rec = pushMove(mv); if (rec) { rec.cls = 'book'; sfx(rec); }
      S.learnBusy = false;
      checkCourseEnd(); render();
    });
  }
  function learnMove(m) {
    var exp = courseMoves()[S.plies.length];
    var test = new Chess(S.game.fen()), mv = test.move(m);
    if (!mv) return;
    var gen = S.gen;
    if (mv.san === exp) {
      var rec = pushMove(m); rec.cls = 'book'; sfx(rec); flash('ok');
      var note = S.course.notes[S.plies.length - 1];
      S.courseMsg = { tone: 'ok', text: mv.san + ' is the book move.' + (note ? ' ' + note : '') };
      if (!checkCourseEnd()) learnOpponent(); else render();
    } else {
      S.courseMistakes++;
      var rec2 = pushMove(m); sfx(rec2); flash('no'); S.learnBusy = true;
      S.courseMsg = { tone: 'no', text: mv.san + ' isn\'t the move in this line. Try again, or tap Hint to see it.' };
      render();
      sleep(750).then(function () {
        if (gen !== S.gen) return;
        S.plies.pop(); rebuildGame(); S.view = S.plies.length; S.learnBusy = false; render();
      });
    }
  }
  function checkCourseEnd() {
    if (S.plies.length < courseMoves().length) return false;
    S.courseDone = true;
    var prog = courseProgress(), p = prog[S.course.id] || { runs: 0, best: null };
    p.runs++; p.best = p.best == null ? S.courseMistakes : Math.min(p.best, S.courseMistakes);
    prog[S.course.id] = p; store.set('courses', prog);
    S.courseMsg = { tone: 'ok', text: S.courseMistakes === 0 ? 'Line complete with no mistakes.' : 'Line complete with ' + S.courseMistakes + (S.courseMistakes === 1 ? ' mistake.' : ' mistakes.') };
    return true;
  }
  function playFromHere() {
    var plies = S.plies.slice(), start = S.startFen, side = S.course.side, course = S.course;
    S.course = null;
    switchMode('play', true);
    resetGame(start);
    plies.forEach(function (p) { var r = pushMove(p.san); r.cls = 'book'; r.acc = 100; });
    S.you = side; S.orient = side; S.playing = true; S.planCourse = course; S.saved = false; S.clock = null; S.flagged = null;
    S.plies.forEach(function (p) { evaluate(p.fen); });
    render();
    if (S.game.turn() !== S.you) botTurn();
  }

  // ---------- Sound ----------
  var actx = null;
  function sfx(rec) {
    if (!OPT.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var o = actx.createOscillator(), g = actx.createGain(), cap = rec.san.indexOf('x') >= 0;
      o.type = 'triangle'; o.frequency.value = cap ? 220 : 330;
      g.gain.setValueAtTime(0.0001, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, actx.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (cap ? 0.12 : 0.07));
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.15);
    } catch (e) {}
  }

  // ---------- Board rendering & input ----------
  var boardEl = $('#board');
  function sqName(r, f) { return FILES[f] + (8 - r); }
  function boardOrder() {
    var out = [];
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var rr = S.orient === 'w' ? r : 7 - r, ff = S.orient === 'w' ? f : 7 - f;
      out.push({ sq: sqName(rr, ff), light: (rr + ff) % 2 === 0, row: r, col: f });
    }
    return out;
  }
  function sqCenter(sq) {
    var f = FILES.indexOf(sq[0]), r = 8 - (+sq[1]);
    if (S.orient === 'b') { f = 7 - f; r = 7 - r; }
    return [f + 0.5, r + 0.5];
  }

  function renderBoard() {
    var fen = curFen(), c = new Chess(fen), ply = S.view ? S.plies[S.view - 1] : null;
    var dots = {};
    var blind = S.mode === 'train' && T.view === 'coords';
    if (S.selected && OPT.legal) c.moves({ square: S.selected, verbose: true }).forEach(function (m) { dots[m.to] = m.captured || m.flags.indexOf('e') >= 0 ? 'cap' : 'q'; });
    var checkSq = null;
    if (c.in_check()) {
      var b = c.board();
      for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) { var p = b[r][f]; if (p && p.type === 'k' && p.color === c.turn()) checkSq = sqName(r, f); }
    }
    var ratingsOn = S.showRatings || S.mode !== 'play' || !S.playing;
    var showBadge = ply && ply.cls && ratingsOn;
    var badged = {};
    if (ratingsOn) [S.view - 1, S.mode === 'play' ? S.view - 2 : -1].forEach(function (i) { var q = S.plies[i]; if (q && q.cls && !badged[q.to]) badged[q.to] = q; });
    var html = '';
    boardOrder().forEach(function (s) {
      var p = c.get(s.sq), cls = 'sq ' + (s.light ? 'l' : 'd');
      if (ply && (ply.from === s.sq || ply.to === s.sq)) cls += ' last';
      if (S.selected === s.sq) cls += ' sel';
      if (checkSq === s.sq) cls += ' check';
      html += '<div class="' + cls + '" data-sq="' + s.sq + '">';
      if (OPT.coords && !blind && s.col === 0) html += '<span class="co r">' + s.sq[1] + '</span>';
      if (OPT.coords && !blind && s.row === 7) html += '<span class="co f">' + s.sq[0] + '</span>';
      if (p && !blind) html += '<span class="pc ' + p.color + p.type + '"></span>';
      if (dots[s.sq]) html += '<span class="dot' + (dots[s.sq] === 'cap' ? ' cap' : '') + '"></span>';
      var bq = badged[s.sq];
      if (bq && c.get(s.sq)) html += '<span class="badge" title="' + CLASSES[bq.cls].label + '">' + icon(bq.cls, '100%') + '</span>';
      html += '</div>';
    });
    // Arrows: the hint, or the better move after a slip.
    var arrows = [];
    if (S.hintArrow && S.hintArrow.from) arrows.push(S.hintArrow);
    else if (showBadge && ply.bestUci && BAD.indexOf(ply.cls) >= 0 && (S.mode !== 'play' || ply.color === S.you)) {
      arrows.push({ from: ply.bestUci.slice(0, 2), to: ply.bestUci.slice(2, 4), tone: 'better' });
      if (ply.replyUci && ply.replyUci !== '(none)') arrows.push({ from: ply.replyUci.slice(0, 2), to: ply.replyUci.slice(2, 4), tone: 'threat' });
    }
    if (arrows.length) {
      html += '<svg class="arrows" viewBox="0 0 8 8" aria-hidden="true">';
      arrows.forEach(function (a) {
        var p1 = sqCenter(a.from), p2 = sqCenter(a.to), dx = p2[0] - p1[0], dy = p2[1] - p1[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
        var col = a.tone === 'better' ? 'var(--c-best)' : a.tone === 'threat' ? 'var(--c-blunder)' : 'var(--accent)';
        var ex = p2[0] - ux * 0.32, ey = p2[1] - uy * 0.32, sx = p1[0] + ux * 0.18, sy = p1[1] + uy * 0.18;
        var hx = p2[0] - ux * 0.08, hy = p2[1] - uy * 0.08, bx = ex - ux * 0.02, by = ey - uy * 0.02;
        html += '<g opacity=".82"><line x1="' + sx + '" y1="' + sy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + col + '" stroke-width=".17" stroke-linecap="round"/>' +
          '<polygon fill="' + col + '" points="' + hx + ',' + hy + ' ' + (bx - uy * 0.27) + ',' + (by + ux * 0.27) + ' ' + (bx + uy * 0.27) + ',' + (by - ux * 0.27) + '"/></g>';
      });
      html += '</svg>';
    }
    boardEl.innerHTML = html;
  }

  var drag = null;
  boardEl.addEventListener('pointerdown', function (e) {
    var sqEl = e.target.closest('.sq'); if (!sqEl) return;
    var sq = sqEl.dataset.sq;
    if (S.mode === 'train' && T.view === 'coords') { coordClick(sq); return; }
    if (!canInteract()) { if (S.mode === 'play' && !atEnd()) { S.view = S.plies.length; render(); } return; }
    var c = new Chess(curFen()), p = c.get(sq);
    if (S.selected && S.selected !== sq && !(p && p.color === c.turn())) {
      if (!tryUserMove(S.selected, sq)) { S.selected = null; renderBoard(); }
      return;
    }
    if (p && p.color === c.turn()) {
      var wasSel = S.selected === sq;
      S.selected = sq; S.hintArrow = null; renderBoard();
      var pcEl = boardEl.querySelector('[data-sq="' + sq + '"] .pc');
      if (!pcEl) return;
      var ghost = pcEl.cloneNode(true); ghost.classList.add('ghost');
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      drag = { from: sq, ghost: ghost, pcEl: pcEl, moved: false, wasSel: wasSel, x: e.clientX, y: e.clientY };
      e.preventDefault();
    } else if (S.selected) { S.selected = null; renderBoard(); }
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) {
      drag.moved = true; document.body.appendChild(drag.ghost); drag.pcEl.classList.add('dragging');
    }
    if (drag.moved) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; }
  });
  window.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.ghost.parentNode) d.ghost.remove();
    if (!d.moved) { if (d.wasSel) { S.selected = null; renderBoard(); } return; }
    var el = document.elementFromPoint(e.clientX, e.clientY), sqEl = el && el.closest && el.closest('#board .sq');
    if (sqEl && sqEl.dataset.sq !== d.from && tryUserMove(d.from, sqEl.dataset.sq)) return;
    renderBoard();
  });

  function askPromotion(color, cb) {
    var wrap = document.createElement('div'); wrap.className = 'promo';
    var inner = '<div role="dialog" aria-label="Promote pawn">';
    ['q', 'r', 'b', 'n'].forEach(function (t) { inner += '<button data-p="' + t + '" class="pc ' + color + t + '" aria-label="' + { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t] + '"></button>'; });
    wrap.innerHTML = inner + '</div>';
    wrap.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      var b = e.target.closest('button'); wrap.remove(); cb(b ? b.dataset.p : null);
    });
    boardEl.appendChild(wrap);
    wrap.querySelector('button').focus();
  }
  function flash(kind) { var f = document.createElement('div'); f.className = 'flash ' + kind; boardEl.appendChild(f); setTimeout(function () { f.remove(); }, 650); }

  // ---------- Eval bar & strips ----------
  function renderEval() {
    var fen = curFen(), e = evalCache[fen];
    if (S.mode === 'analyse' && S.liveFen === fen && S.liveLines[0]) e = S.liveLines[0];
    var bar = $('#evalbar'), w = $('#evalW'), num = $('#evalNum');
    bar.classList.toggle('flip', S.orient === 'b');
    var pct = e ? (e.mate != null ? (e.cp > 0 ? 100 : 0) : winPct(e.cp)) : 50;
    w.style.height = pct + '%';
    num.textContent = e ? fmtEval(e).replace('+', '') : '…';
    var whiteAhead = pct >= 50;
    num.className = 'num ' + ((whiteAhead !== (S.orient === 'b')) ? 'bottom' : 'top');
    num.style.color = whiteAhead ? 'var(--evb)' : 'var(--evw)';
  }

  var START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  // Pieces each side has captured, plus White's material lead in pawns.
  function material(fen) {
    var m = pieceMap(fen), have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } }, pts = { w: 0, b: 0 };
    Object.keys(m).forEach(function (sq) {
      var ch = m[sq], c = ch === ch.toUpperCase() ? 'w' : 'b', t = ch.toLowerCase();
      if (t !== 'k') { have[c][t]++; pts[c] += VAL[t]; }
    });
    var took = function (c) {
      var o = c === 'w' ? 'b' : 'w', out = '';
      ['p', 'n', 'b', 'r', 'q'].forEach(function (t) {
        var k = Math.max(0, START_COUNT[t] - have[o][t]);
        if (!k) return;
        out += '<span class="cg">';
        for (var i = 0; i < k; i++) out += '<span class="pc ' + o + t + '"></span>';
        out += '</span>';
      });
      return out;
    };
    return { w: took('w'), b: took('b'), diff: pts.w - pts.b };
  }
  function stripHtml(color) {
    var av, name, sub = '';
    if (S.mode === 'train' && T.view !== 'menu') {
      var mine = (T.view === 'puzzle' || T.view === 'rush') && T.pz ? T.pz.side : T.view === 'endgame' && T.eg ? T.eg.side : S.orient;
      av = sideAvatar(color, 36);
      name = color === mine ? 'You' : T.view === 'endgame' ? 'Stockfish' : (color === 'w' ? 'White' : 'Black');
    } else if (S.mode === 'play' && (S.playing || S.plies.length)) {
      if (color === S.you) { av = sideAvatar(color, 36); name = 'You'; }
      else { av = botAvatar(S.bot, 36); name = esc(S.bot.name); sub = '<small>' + S.bot.rating + '</small>' + (S.botThinking ? '<span class="thinking" aria-label="Thinking"><i></i><i></i><i></i></span>' : ''); }
    } else if (S.mode === 'learn' && S.course) {
      if (color === S.course.side) { av = sideAvatar(color, 36); name = 'You'; }
      else { av = '<span class="bav book" style="--s:36px">' + icon('book', 24) + '</span>'; name = 'Opening book'; }
    } else { av = sideAvatar(color, 36); name = color === 'w' ? 'White' : 'Black'; }
    var blind = S.mode === 'train' && T.view === 'coords', mat = blind ? { w: '', b: '', diff: 0 } : material(curFen()), lead = color === 'w' ? mat.diff : -mat.diff;
    var caps = '<span class="caps">' + mat[color] + (lead > 0 ? '<em>+' + lead + '</em>' : '') + '</span>';
    var clock = S.mode === 'play' && S.clock ? '<span class="clock' + (S.clock.turn === color && S.clock.on && !S.clock.hold ? ' run' : '') + '" data-c="' + color + '">' + fmtClock(clockLeft(color)) + '</span>' : '';
    return '<div class="who">' + av + '<div class="wn"><span class="nm"><b>' + name + '</b>' + sub + '</span>' + caps + '</div></div>' + clock;
  }
  function renderStrips() {
    var topColor = S.orient === 'w' ? 'b' : 'w';
    $('#topStrip').innerHTML = stripHtml(topColor);
    $('#botStrip').innerHTML = stripHtml(S.orient);
    $('#navStart').disabled = $('#navPrev').disabled = S.view === 0;
    $('#navNext').disabled = $('#navEnd').disabled = atEnd();
  }

  // ---------- Game plans ----------
  function pieceMap(fen) {
    var map = {}, rows = fen.split(' ')[0].split('/');
    rows.forEach(function (row, r) {
      var f = 0;
      for (var i = 0; i < row.length; i++) {
        var ch = row[i];
        if (/\d/.test(ch)) f += +ch; else { map[FILES[f] + (8 - r)] = ch; f++; }
      }
    });
    return map;
  }
  function goalHit(test, map) {
    var letter = test[0];
    return test.slice(2).split('|').some(function (sq) { return map[sq] === letter; });
  }
  // A goal stays ticked once any position in the game (up to the viewed move) reached it.
  function goalStatus(course) {
    var maps = S.plies.slice(0, S.view).map(function (p) { return pieceMap(p.fen); });
    return course.strategy.goals.map(function (g) { return maps.some(function (m) { return goalHit(g[1], m); }); });
  }
  // The course this game is following for your side: explicit after "play it out", else by shared moves.
  function planCourse(side) {
    if (S.planCourse) return S.planCourse;
    var sans = sansTo(S.plies.length), best = null, bestK = 5;
    OPENINGS.COURSES.forEach(function (c) {
      if (c.side !== side) return;
      var mv = c.moves.split(' '), k = 0;
      while (k < mv.length && k < sans.length && mv[k] === sans[k]) k++;
      if (k > bestK) { bestK = k; best = c; }
    });
    return best;
  }
  function goalsHtml(course) {
    var st = goalStatus(course);
    return '<ul class="goals">' + course.strategy.goals.map(function (g, i) {
      return '<li class="' + (st[i] ? 'met' : '') + '"><span class="box" aria-hidden="true">' + (st[i] ? '\u2713' : '') + '</span><span>' + esc(g[0]) + '</span></li>';
    }).join('') + '</ul>';
  }
  function listHtml(items, cls) { return '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'; }
  function strategyHtml(course, openPlans) {
    var st = course.strategy;
    return '<details class="strat"' + (openPlans ? ' open' : '') + '><summary>Middlegame plans</summary><div class="body"><p class="structure">' + esc(st.structure) + '</p>' + listHtml(st.plans) + '</div></details>' +
      '<details class="strat"><summary>Where your pieces belong</summary><div class="body">' + listHtml(st.pieces) + '</div></details>' +
      '<details class="strat"><summary>Watch out for</summary><div class="body">' + listHtml(st.watch, 'watch') + '</div></details>';
  }
  function planCardHtml(course) {
    return '<div class="sec"><div class="spread"><h3>Game plan</h3><span class="planhead"><span class="eco">' + course.eco + '</span><b>' + esc(course.name) + '</b></span></div>' +
      goalsHtml(course) + strategyHtml(course, false) + '</div>';
  }


  // ---------- AI coach: plain-language explanations (needs the viewer's consent) ----------
  var sampler = null;
  if (window.claude && window.claude.use) window.claude.use('sample').then(function (x) { sampler = x; if (x) renderPanel(); }, function () {});
  function explainMove(idx) {
    var p = S.plies[idx];
    if (!sampler || !p) return;
    var mover = p.color === 'w' ? 'White' : 'Black', o = openingName(sansTo(idx + 1));
    var bestLine = p.evalBefore && p.evalBefore.pv ? pvToSan(p.fenBefore, p.evalBefore.pv, 6).map(function (m) { return m.san; }).join(' ') : '';
    var replyLine = p.evalAfter && p.evalAfter.pv ? pvToSan(p.fen, p.evalAfter.pv, 6).map(function (m) { return m.san; }).join(' ') : '';
    var prompt = 'You are a friendly chess coach. In 2-3 short sentences, explain to a club player why the move below is rated "' + CLASSES[p.cls].label + '". ' +
      'Name concrete pieces and squares. Do not mention engines, centipawns or depth. If there was a better move, say what it achieves. Reply with the explanation only.\n\n' +
      'Position before the move (FEN): ' + p.fenBefore + '\nSide to move: ' + mover + '\nMove played: ' + p.san + '\n' +
      'Evaluation before: ' + fmtEval(p.evalBefore) + ', after: ' + fmtEval(p.evalAfter) + ' (positive is good for White)\n' +
      (p.bestSan && p.bestSan !== p.san ? 'Best move: ' + p.bestSan + (bestLine ? ', main line: ' + bestLine : '') + '\n' : 'This was the best move. Main line: ' + bestLine + '\n') +
      (replyLine ? 'Best continuation for the opponent after the move played: ' + replyLine + '\n' : '') +
      (o ? 'Opening: ' + o.name + '\n' : '');
    p.explain = 'Thinking\u2026'; renderPanel();
    sampler(prompt, { modelTier: 'quick', onText: function (ev) {
      p.explain = ev.text;
      var el = document.querySelector('[data-explain-out="' + idx + '"]');
      if (el) el.textContent = ev.text;
    } }).then(function (r) { p.explain = r.text; renderPanel(); }, function (e) {
      p.explain = e && e.code === 'not_granted' ? null : 'The coach couldn\u2019t answer just now. Try again in a moment.';
      if (e && e.code === 'not_granted') sampler = null;
      renderPanel();
    });
  }

  // ---------- Threats & retry ----------
  function showThreats() {
    var fen = curFen(), c = new Chess(fen), gen = S.gen;
    if (c.in_check()) { S.threatMsg = 'You\u2019re in check, so deal with that first.'; render(); return; }
    var parts = fen.split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
    var nf = parts.join(' '), test = new Chess();
    if (!test.load(nf)) { S.threatMsg = 'No threats to show here.'; render(); return; }
    S.threatMsg = 'Looking for threats\u2026'; render();
    evaluate(nf).then(function (e) {
      if (gen !== S.gen || curFen() !== fen) return;
      if (!e || !e.best) { S.threatMsg = 'No real threats right now.'; render(); return; }
      var san = uciToSan(nf, e.best), side = parts[1] === 'w' ? 'White' : 'Black';
      S.hintArrow = { from: e.best.slice(0, 2), to: e.best.slice(2, 4), tone: 'threat' };
      S.threatMsg = 'If it were their move, ' + side + ' would play ' + san + ' (red arrow).';
      render();
    });
  }
  function startRetry(idx) {
    var rec = S.plies[idx], back = S.mode;
    switchMode('train');
    resetGame(rec.fenBefore); S.orient = rec.color;
    T.view = 'mistakes';
    T.mk = { i: 0, temp: true, back: back, status: 'you', msg: null, m: { fen: rec.fenBefore, best: rec.bestUci, bestSan: rec.bestSan, played: rec.san, cls: rec.cls, bot: 'this game' } };
    render();
  }

  // ---------- Clocks ----------
  var TCS = [['none', 'Untimed'], ['3+2', '3 | 2'], ['5+0', '5 min'], ['10+0', '10 min'], ['15+10', '15 | 10']];
  function newClock(tc) {
    if (!tc || tc === 'none') return null;
    var p = tc.split('+'), base = +p[0] * 60000;
    return { w: base, b: base, inc: +p[1] * 1000, turn: 'w', stamp: Date.now(), hold: false, on: true };
  }
  function clockLeft(color) {
    var k = S.clock; if (!k) return 0;
    return k[color] - (k.on && !k.hold && k.turn === color ? Date.now() - k.stamp : 0);
  }
  function clockMove(color) {
    var k = S.clock; if (!k || !k.on) return;
    var now = Date.now();
    if (!k.hold) k[color] -= now - k.stamp;
    k[color] += k.inc; k.turn = color === 'w' ? 'b' : 'w'; k.stamp = now; k.hold = false;
  }
  function clockPause() { var k = S.clock; if (k && k.on && !k.hold) { k[k.turn] -= Date.now() - k.stamp; k.hold = true; } }
  function clockResume() { var k = S.clock; if (k && k.on && k.hold) { k.hold = false; k.stamp = Date.now(); } }
  function fmtClock(ms) {
    ms = Math.max(0, ms);
    if (ms < 10000) return (ms / 1000).toFixed(1);
    var t = Math.ceil(ms / 1000);
    return Math.floor(t / 60) + ':' + ('0' + t % 60).slice(-2);
  }
  setInterval(function () {
    var k = S.clock;
    if (S.mode !== 'play' || !k || !k.on) return;
    ['w', 'b'].forEach(function (c) {
      var el = document.querySelector('.clock[data-c="' + c + '"]'), left = clockLeft(c);
      if (el) { el.textContent = fmtClock(left); el.classList.toggle('run', k.turn === c && !k.hold); el.classList.toggle('low', left < 20000); }
    });
    if (S.playing && clockLeft(k.turn) <= 0) {
      k[k.turn] = 0; k.on = false; S.flagged = k.turn; S.playing = false;
      S.gen++; if (S.botJob) S.botJob.cancel(); S.botThinking = false;
      finishGame(gameResult()); render();
    }
  }, 100);

  // ---------- Progress: game history, bot records, mistakes ----------
  function accuracyOf(plies, color) {
    var xs = plies.filter(function (p) { return p.color === color && p.acc != null; });
    if (!xs.length) return null;
    // Blend of mean and harmonic mean so one blunder still shows.
    var mean = xs.reduce(function (a, p) { return a + p.acc; }, 0) / xs.length;
    var harm = xs.length / xs.reduce(function (a, p) { return a + 1 / Math.max(p.acc, 5); }, 0);
    return (mean + harm) / 2;
  }
  // Accuracy by game phase plus counts of each move grade, for one side.
  function phaseOf(i, fen) {
    if (i < 20) return 'o';
    var m = pieceMap(fen), v = { q: 9, r: 5, b: 3, n: 3 }, total = 0;
    Object.keys(m).forEach(function (sq) { total += v[m[sq].toLowerCase()] || 0; });
    return total <= 26 ? 'e' : 'm';
  }
  function gameStats(plies, color) {
    var ph = { o: [0, 0], m: [0, 0], e: [0, 0] }, counts = {};
    plies.forEach(function (p, i) {
      if (p.color !== color || p.acc == null) return;
      var k = phaseOf(i, p.fenBefore); ph[k][0] += p.acc; ph[k][1]++;
      counts[p.cls] = (counts[p.cls] || 0) + 1;
    });
    return { acc: accuracyOf(plies, color), phases: ph, counts: counts };
  }
  function finishGame(result) {
    if (S.saved) return;
    S.saved = true;
    var plies = S.plies, bot = S.bot, you = S.you, start = S.startFen;
    var rec = store.get('records', {}), r = rec[bot.id] || { w: 0, l: 0, d: 0 };
    r[result === 'win' ? 'w' : result === 'loss' ? 'l' : 'd']++;
    rec[bot.id] = r; store.set('records', rec);
    var o = openingName(plies.map(function (p) { return p.san; }));
    // Give the last moves a moment to finish rating before recording accuracy.
    setTimeout(function () {
      var hist = store.get('history', []);
      var gs = gameStats(plies, you);
      hist.unshift({ at: Date.now(), bot: bot.id, vs: bot.name, you: you, result: result, sans: plies.map(function (p) { return p.san; }), start: start, opening: o ? o.name : null, acc: gs.acc, phases: gs.phases, counts: gs.counts });
      store.set('history', hist.slice(0, 30));
      if (S.mode === 'play' && !S.playing && !S.plies.length) renderPanel();
    }, 2500);
  }
  function gameResult() {
    var c = S.game;
    if (S.flagged) return S.flagged === S.you ? 'loss' : 'win';
    if (S.resigned) return 'loss';
    if (c.in_checkmate()) return c.turn() !== S.you ? 'win' : 'loss';
    if (c.game_over()) return 'draw';
    return null;
  }
  function saveMistake(rec, vs) {
    var list = store.get('mistakes', []);
    if (list.some(function (m) { return m.fen === rec.fenBefore; })) return;
    list.unshift({ fen: rec.fenBefore, best: rec.bestUci, bestSan: rec.bestSan, played: rec.san, cls: rec.cls, bot: vs, at: Date.now() });
    store.set('mistakes', list.slice(0, 80));
  }
  function loadHistoryGame(h) {
    switchMode('analyse', true);
    resetGame(h.start || START);
    h.sans.forEach(function (san) { pushMove(san); });
    S.view = 0; S.orient = h.you;
    render(); runReview();
  }


  // ---------- Puzzle Rush ----------
  var rushTimer = null;
  function pickPuzzle(target, theme, exclude) {
    var pool = PUZZLES.filter(function (p) { return (theme === 'all' || p[4].split(' ').indexOf(theme) >= 0) && exclude.indexOf(p[0]) < 0; });
    var near = [];
    for (var w = 120; near.length < 5 && w <= 1800; w += 120) near = pool.filter(function (p) { return Math.abs(p[3] - target) <= w; });
    if (!near.length) near = pool.length ? pool : PUZZLES;
    return near[Math.floor(Math.random() * near.length)];
  }
  function loadPuzzle(pz, rush) {
    resetGame(pz[1]);
    T.pz = { data: pz, sol: pz[2].split(' '), step: 0, side: pz[1].split(' ')[1] === 'w' ? 'b' : 'w', status: 'opp', rated: false, msg: null, rush: rush };
    S.orient = T.pz.side;
    render();
    var gen = S.gen;
    sleep(rush ? 350 : 650).then(function () { if (gen === S.gen) pzOpponent(); });
  }
  function startRush() {
    T.view = 'rush';
    T.rush = { running: true, score: 0, strikes: 0, end: Date.now() + 180000, seen: [] };
    clearInterval(rushTimer);
    rushTimer = setInterval(function () {
      if (!T.rush || !T.rush.running) { clearInterval(rushTimer); return; }
      var left = T.rush.end - Date.now(), el = $('#rushTime');
      if (el) el.textContent = fmtClock(left);
      if (left <= 0) endRush('Time\u2019s up!');
    }, 200);
    nextRush();
  }
  function nextRush() {
    var r = T.rush, pz = pickPuzzle(Math.min(2600, 500 + r.score * 55), 'all', r.seen);
    r.seen.push(pz[0]);
    loadPuzzle(pz, true);
  }
  function endRush(why) {
    var r = T.rush; if (!r || !r.running) return;
    r.running = false; r.why = why; clearInterval(rushTimer);
    var best = store.get('rushBest', 0); r.newBest = r.score > best;
    if (r.newBest) store.set('rushBest', r.score);
    S.gen++; render();
  }
  function rushResult(ok) {
    var r = T.rush, gen = S.gen;
    if (ok) r.score++; else r.strikes++;
    render();
    sleep(ok ? 350 : 700).then(function () {
      if (gen !== S.gen || !r.running) return;
      if (r.strikes >= 3) endRush('Three strikes.'); else nextRush();
    });
  }

  // ---------- Endgame drills (against full-strength Stockfish) ----------
  var ENDGAMES = [
    { id: 'kq', name: 'Queen mate', sub: 'King and queen vs king', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', goal: 'mate', limit: 15, tip: 'Use the queen to box the king in from a knight\u2019s move away, shrinking the box each move. Once it\u2019s on the edge, walk your own king over to help. Always check for stalemate.' },
    { id: 'ladder', name: 'Ladder mate', sub: 'Two rooks vs king', fen: '8/8/8/3k4/8/8/8/R5RK w - - 0 1', goal: 'mate', limit: 12, tip: 'The rooks take turns cutting off one rank at a time, like climbing a ladder. If the king attacks a rook, move that rook to the far side of the board.' },
    { id: 'kr', name: 'Rook mate', sub: 'King and rook vs king', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', limit: 30, tip: 'Cut the king off with the rook, then bring your king up to face theirs. Check along the edge when the kings are opposite each other, and shrink the box one rank at a time.' },
    { id: 'kp', name: 'King in front', sub: 'King and pawn vs king', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', limit: 15, tip: 'With your king on the 6th rank in front of the pawn, it\u2019s always a win. Step to the side to push their king away, then advance the pawn.' },
    { id: 'opp', name: 'Hold the draw', sub: 'Defend with the opposition', side: 'b', fen: '4k3/8/8/4P3/4K3/8/8/8 b - - 0 1', goal: 'draw', limit: 25, tip: 'Stay in front of the pawn. When their king steps up, face it with one square between you (the opposition). Retreat straight back, never to the side.' },
    { id: 'qvp', name: 'Queen vs pawn', sub: 'Stop a pawn on the 2nd rank', fen: '8/1K6/8/8/8/8/1pk5/6Q1 w - - 0 1', goal: 'mate', limit: 30, tip: 'Check the king, or pin it in front of the pawn, to force it to block its own pawn. Each time it blocks, bring your king one step closer. Then win the pawn and mate.' },
    { id: 'lucena', name: 'Lucena position', sub: 'Rook endgame: build a bridge', fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1', goal: 'promote', limit: 20, tip: 'Check their king one more file away, put your rook on the 4th rank, then walk your king out. When the checks come, block with your rook. That block is the bridge.' },
    { id: 'philidor', name: 'Philidor defence', sub: 'Rook endgame: hold the draw', side: 'b', fen: '4k3/8/r7/3KP3/8/8/8/1R6 b - - 0 1', goal: 'draw', limit: 25, tip: 'Keep your rook on your 6th rank so their king can\u2019t advance. Once the pawn steps forward, swing your rook to the back and check from behind.' }
  ];
  function egGoal(d) { return d.goal === 'mate' ? 'Checkmate within ' + d.limit + ' moves' : d.goal === 'promote' ? 'Promote the pawn and keep it' : 'Hold the draw for ' + d.limit + ' moves'; }
  function startEndgame(d) {
    resetGame(d.fen); T.view = 'endgame';
    var side = d.side || 'w';
    T.eg = { d: d, side: side, moves: 0, status: 'you', msg: null };
    S.orient = side; render();
    if (S.game.turn() !== side) egBot();
  }
  function egEnd(won, msg) {
    T.eg.status = won ? 'won' : 'lost'; T.eg.msg = msg;
    if (won) { var done = store.get('egDone', {}); done[T.eg.d.id] = true; store.set('egDone', done); }
    render();
  }
  // Returns true if the drill continues.
  function egCheck(rec, byUser) {
    var eg = T.eg, d = eg.d, c = S.game, sign = eg.side === 'w' ? 1 : -1;
    if (c.in_checkmate()) { egEnd(byUser, byUser ? 'Checkmate in ' + eg.moves + ' moves.' : 'You got mated.'); return Promise.resolve(false); }
    if (c.game_over()) { var why = c.in_stalemate() ? 'Stalemate.' : 'Draw.'; egEnd(d.goal === 'draw', d.goal === 'draw' ? why + ' Draw held!' : why + ' The win slipped away.'); return Promise.resolve(false); }
    var gen = S.gen;
    return evaluate(c.fen()).then(function (e) {
      if (gen !== S.gen || !e) return gen === S.gen;
      var v = sign * e.cp;
      if (d.goal === 'promote' && byUser && rec.san.indexOf('=') >= 0) { egEnd(v >= 500, v >= 500 ? 'Promoted, and the new queen is safe. Winning!' : 'You promoted but can\u2019t keep the queen.'); return false; }
      if (d.goal !== 'draw' && byUser && v < 150) { egEnd(false, 'That let the win slip away. Restart and try another plan.'); return false; }
      if (d.goal === 'draw' && v <= -400) { egEnd(false, 'That position is lost now. Restart and keep the opposition.'); return false; }
      if (byUser && eg.moves >= d.limit) { egEnd(d.goal === 'draw', d.goal === 'draw' ? 'You held for ' + d.limit + ' moves. Draw!' : 'Out of moves. Find a faster plan.'); return false; }
      return true;
    });
  }
  function egMove(m) {
    var rec = pushMove(m); if (!rec) return;
    sfx(rec); T.eg.moves++; T.eg.status = 'checking'; render();
    egCheck(rec, true).then(function (go) { if (go) egBot(); });
  }
  function egBot() {
    var gen = S.gen; T.eg.status = 'bot'; render();
    var job = botEngine.search(S.game.fen(), { skill: 20, depth: 20, movetime: 500 });
    job.promise.then(function (r) {
      if (gen !== S.gen || !r || !r.best || r.best === '(none)') return;
      var rec = pushMove({ from: r.best.slice(0, 2), to: r.best.slice(2, 4), promotion: r.best[4] });
      if (rec) sfx(rec);
      egCheck(rec, false).then(function (go) { if (go && gen === S.gen) { T.eg.status = 'you'; render(); } });
    });
  }

  // ---------- Insights: patterns across your games ----------
  function insightsHtml() {
    var hist = store.get('history', []), g = hist.filter(function (x) { return x.phases; });
    var h = '<div class="sec">';
    if (g.length < 3) return h + '<p class="muted">Play or import at least 3 games and this page will show where you gain and lose the most: by game phase, by color, by opening, and by the kinds of mistakes you make.</p><p class="status">' + g.length + ' of 3 games so far.</p></div>';
    var ph = { o: [0, 0], m: [0, 0], e: [0, 0] }, cnt = {}, col = { w: [0, 0], b: [0, 0] }, ops = {};
    g.forEach(function (x) {
      ['o', 'm', 'e'].forEach(function (k) { ph[k][0] += x.phases[k][0]; ph[k][1] += x.phases[k][1]; });
      Object.keys(x.counts || {}).forEach(function (k) { cnt[k] = (cnt[k] || 0) + x.counts[k]; });
      var sc = x.result === 'win' ? 1 : x.result === 'draw' ? 0.5 : 0;
      col[x.you][0] += sc; col[x.you][1]++;
      if (x.opening) { var o = ops[x.opening] = ops[x.opening] || [0, 0]; o[0] += sc; o[1]++; }
    });
    var names = { o: 'Opening', m: 'Middlegame', e: 'Endgame' }, accs = {};
    ['o', 'm', 'e'].forEach(function (k) { if (ph[k][1] >= 3) accs[k] = ph[k][0] / ph[k][1]; });
    var weakest = Object.keys(accs).sort(function (a, b) { return accs[a] - accs[b]; })[0];
    h += '<p class="muted">Accuracy, results and mistake types from your games against the bots and your imports.</p></div>';
    h += '<div class="sec"><h3>Accuracy by phase</h3><div class="bars">' + ['o', 'm', 'e'].map(function (k) {
      var v = accs[k];
      return '<div class="bar' + (k === weakest ? ' weak' : '') + '"><span class="bl">' + names[k] + '</span><span class="bt"><i style="width:' + (v || 0) + '%"></i></span><b>' + (v == null ? '\u2014' : v.toFixed(0) + '%') + '</b></div>';
    }).join('') + '</div></div>';
    var per = function (k) { return (cnt[k] || 0) / g.length; };
    h += '<div class="sec"><h3>Per game, on average</h3><div class="stats">' +
      '<div><small>' + icon('blunder', 14) + ' Blunders</small><b>' + per('blunder').toFixed(1) + '</b></div>' +
      '<div><small>' + icon('mistake', 14) + ' Mistakes</small><b>' + per('mistake').toFixed(1) + '</b></div>' +
      '<div><small>' + icon('miss', 14) + ' Misses</small><b>' + per('miss').toFixed(1) + '</b></div></div>' +
      '<div class="stats"><div><small>Score as White</small><b>' + (col.w[1] ? Math.round(col.w[0] / col.w[1] * 100) + '%' : '\u2014') + '</b></div>' +
      '<div><small>Score as Black</small><b>' + (col.b[1] ? Math.round(col.b[0] / col.b[1] * 100) + '%' : '\u2014') + '</b></div>' +
      '<div><small>' + icon('brilliant', 14) + ' Brilliant</small><b>' + (cnt.brilliant || 0) + '</b></div></div></div>';
    var opList = Object.keys(ops).sort(function (a, b) { return ops[b][1] - ops[a][1]; }).slice(0, 5);
    if (opList.length) {
      h += '<div class="sec"><h3>Your openings</h3><table class="tally">' + opList.map(function (k) {
        return '<tr><td>' + esc(k) + '</td><td>' + ops[k][1] + '</td><td>' + Math.round(ops[k][0] / ops[k][1] * 100) + '%</td></tr>';
      }).join('') + '</table><p class="status">Games played, and your score in them.</p></div>';
    }
    var recs = [];
    if (weakest === 'e') recs.push(['Your endgame is your weakest phase. Work through the endgame drills until each one is done.', 'endgames', 'Endgame drills']);
    if (weakest === 'o') recs.push(['You lose the most accuracy in the opening. Drill a line for each color until it\u2019s mastered.', 'tab:learn', 'Openings']);
    if (weakest === 'm') recs.push(['The middlegame costs you the most. Tactics puzzles build the pattern recognition that fixes this.', 'theme:fork', 'Fork puzzles']);
    if (per('blunder') >= 1) recs.push(['You average ' + per('blunder').toFixed(1) + ' blunders a game. Before each move, ask what your opponent\u2019s last move attacks. The Threats button shows it.', 'theme:hangingPiece', 'Hanging-piece puzzles']);
    if (per('miss') >= 0.5) recs.push(['You often miss your opponent\u2019s mistakes. Puzzle Rush trains you to spot tactics quickly.', 'rush', 'Puzzle Rush']);
    if (col.w[1] >= 2 && col.b[1] >= 2 && Math.abs(col.w[0] / col.w[1] - col.b[0] / col.b[1]) >= 0.2) {
      var weakCol = col.w[0] / col.w[1] < col.b[0] / col.b[1] ? 'White' : 'Black';
      recs.push(['You score much lower with ' + weakCol + '. Learn a solid ' + (weakCol === 'White' ? 'system like the London' : 'defense like the Caro-Kann') + '.', 'tab:learn', 'Openings']);
    }
    if (store.get('mistakes', []).length >= 3) recs.push(['You have ' + store.get('mistakes', []).length + ' saved mistakes from your own games. Clearing them is the fastest way to stop repeating them.', 'mistakes', 'Fix mistakes']);
    if (!recs.length) recs.push(['No big weak spot right now. Try a stronger bot to find the next one.', 'tab:play', 'Play']);
    h += '<div class="sec"><h3>What to work on</h3><div class="recs">' + recs.map(function (r) {
      return '<div class="rec"><p>' + esc(r[0]) + '</p><button class="ib sm" data-act="' + r[1] + '">' + esc(r[2]) + '</button></div>';
    }).join('') + '</div></div>';
    return h;
  }
  function runAct(a) {
    if (a.indexOf('tab:') === 0) { switchMode(a.slice(4)); return; }
    if (S.mode !== 'train') switchMode('train');
    if (a === 'insights') { T.view = 'insights'; resetGame(); render(); }
    else if (a === 'endgames') { T.view = 'endgames'; resetGame(); render(); }
    else if (a === 'rush') startRush();
    else if (a === 'mistakes') startMistake(0);
    else if (a.indexOf('theme:') === 0) { T.theme = a.slice(6); store.set('pzTheme', T.theme); nextPuzzle(); }
  }

  // ---------- Importing games from Lichess / Chess.com exports ----------
  function splitPgns(text) {
    return text.replace(/\r/g, '').split(/\n\s*\n(?=\[Event\s)/).map(function (t) { return t.trim(); }).filter(Boolean);
  }
  function importMany(pgns) {
    var user = (store.get('username', '') || '').toLowerCase(), games = [];
    pgns.forEach(function (t) {
      var c = new Chess();
      if (!c.load_pgn(t, { sloppy: true })) return;
      var hd = c.header(), sans = c.history();
      if (sans.length < 6) return;
      var you = user && (hd.Black || '').toLowerCase() === user ? 'b' : 'w';
      var res = hd.Result === '1/2-1/2' ? 'draw' : hd.Result === (you === 'w' ? '1-0' : '0-1') ? 'win' : hd.Result === '*' ? 'draw' : 'loss';
      games.push({ start: hd.FEN || START, sans: sans, you: you, result: res, vs: (you === 'w' ? hd.Black : hd.White) || 'Opponent' });
    });
    games = games.slice(0, 10);
    if (!games.length) { S.importErr = 'Couldn\u2019t read any games in that file.'; render(); return; }
    S.imp = { done: 0, total: games.length }; S.anTab = 'import';
    stopLive(); render();
    var chain = Promise.resolve();
    games.forEach(function (g) {
      chain = chain.then(function () {
        var c = new Chess(g.start), recs = [];
        g.sans.forEach(function (san) {
          var before = c.fen(), mv = c.move(san);
          recs.push({ san: mv.san, from: mv.from, to: mv.to, uci: mv.from + mv.to + (mv.promotion || ''), color: mv.color, fenBefore: before, fen: c.fen() });
        });
        var step = Promise.resolve();
        recs.forEach(function (r, i) {
          step = step.then(function () {
            return evaluate(r.fenBefore, true).then(function (b) { return evaluate(r.fen, true).then(function (a) {
              if (b && a) classify(r, b, a, isBook(g.sans.slice(0, i + 1)), recs[i - 1]);
            }); });
          });
        });
        return step.then(function () {
          var gs = gameStats(recs, g.you), o = openingName(g.sans), hist = store.get('history', []);
          hist.unshift({ at: Date.now(), bot: null, vs: g.vs, source: 'import', you: g.you, result: g.result, sans: g.sans, start: g.start, opening: o ? o.name : null, acc: gs.acc, phases: gs.phases, counts: gs.counts });
          store.set('history', hist.slice(0, 40));
          recs.forEach(function (r) { if (r.color === g.you && ['mistake', 'blunder', 'miss'].indexOf(r.cls) >= 0 && r.bestUci) saveMistake(r, g.vs); });
          S.imp.done++; if (S.mode === 'analyse' || S.mode === 'play') renderPanel();
        });
      });
    });
    chain.then(function () { S.imp.finished = true; renderPanel(); });
  }

  // ---------- Train: puzzles, mistakes, coordinates ----------
  var PZ_THEMES = [['all', 'All'], ['mateIn1', 'Mate in 1'], ['mateIn2', 'Mate in 2'], ['mateIn3', 'Mate in 3'], ['fork', 'Forks'], ['pin', 'Pins'], ['skewer', 'Skewers'], ['hangingPiece', 'Hanging pieces'], ['discoveredAttack', 'Discovered attacks'], ['sacrifice', 'Sacrifices'], ['deflection', 'Deflection'], ['backRankMate', 'Back rank'], ['trappedPiece', 'Trapped pieces'], ['promotion', 'Promotion'], ['endgame', 'Endgames']];
  var T = { view: 'menu', theme: store.get('pzTheme', 'all'), pz: null, mk: null, co: null };
  function pzStats() { return store.get('pz', { rating: 1200, n: 0, solved: 0, streak: 0, best: 0, hist: [1200] }); }

  function nextPuzzle() {
    var seen = store.get('pzSeen', []), pz = pickPuzzle(pzStats().rating, T.theme, seen);
    seen.push(pz[0]); store.set('pzSeen', seen.slice(-400));
    T.view = 'puzzle';
    loadPuzzle(pz, false);
  }
  function pzOpponent() {
    var pz = T.pz, u = pz.sol[pz.step];
    var rec = pushMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    if (rec) sfx(rec);
    pz.step++; pz.status = 'you';
    render();
  }
  function pzRate(won) {
    var pz = T.pz;
    if (pz.rated) return;
    pz.rated = true;
    var st = pzStats(), exp = 1 / (1 + Math.pow(10, (pz.data[3] - st.rating) / 400)), k = st.n < 20 ? 40 : 20;
    var delta = Math.round(k * ((won ? 1 : 0) - exp));
    st.rating += delta; st.n++; if (won) { st.solved++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
    st.hist.push(st.rating); st.hist = st.hist.slice(-40);
    store.set('pz', st);
    pz.delta = delta;
  }
  function puzzleMove(m) {
    var pz = T.pz, exp = pz.sol[pz.step], test = new Chess(S.game.fen()), mv = test.move(m), gen = S.gen;
    if (!mv) return;
    var uci = mv.from + mv.to + (mv.promotion || '');
    if (uci === exp || test.in_checkmate()) {
      var rec = pushMove(m); sfx(rec); flash('ok'); pz.step++;
      if (pz.step >= pz.sol.length || test.in_checkmate()) { pz.status = 'solved'; if (pz.rush) { rushResult(true); return; } pzRate(true); render(); return; }
      pz.status = 'opp'; pz.msg = 'Best move! Keep going.'; render();
      sleep(pz.rush ? 400 : 1000).then(function () { if (gen === S.gen) pzOpponent(); });
    } else {
      var rec2 = pushMove(m); sfx(rec2); flash('no');
      if (pz.rush) { pz.status = 'wrong'; rushResult(false); return; }
      pzRate(false); pz.status = 'wrong'; pz.msg = mv.san + ' isn\'t it. Try again or see the solution.';
      render();
      sleep(700).then(function () { if (gen !== S.gen) return; S.plies.pop(); rebuildGame(); S.view = S.plies.length; pz.status = 'retry'; render(); });
    }
  }
  function showSolution() {
    var pz = T.pz, gen = S.gen;
    pzRate(false); pz.status = 'shown';
    (function step() {
      if (gen !== S.gen || pz.step >= pz.sol.length) { render(); return; }
      var u = pz.sol[pz.step++], rec = pushMove({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      if (rec) sfx(rec);
      render(); sleep(650).then(step);
    })();
  }

  function startMistake(i) {
    var list = store.get('mistakes', []);
    if (!list.length) { T.view = 'mistakes'; T.mk = null; resetGame(); render(); return; }
    i = ((i || 0) % list.length + list.length) % list.length;
    var m = list[i];
    resetGame(m.fen); S.orient = m.fen.split(' ')[1];
    T.mk = { i: i, m: m, status: 'you', msg: null }; T.view = 'mistakes';
    render();
  }
  function fixMistake() {
    if (T.mk.temp && !store.get('mistakes', []).some(function (x) { return x.fen === T.mk.m.fen; })) return;
    var list = store.get('mistakes', []).filter(function (x) { return x.fen !== T.mk.m.fen; });
    store.set('mistakes', list);
  }
  function mistakeMove(m) {
    var mk = T.mk, test = new Chess(S.game.fen()), mv = test.move(m), gen = S.gen;
    if (!mv) return;
    var uci = mv.from + mv.to + (mv.promotion || '');
    var rec = pushMove(m); sfx(rec);
    if (uci === mk.m.best) { flash('ok'); mk.status = 'fixed'; mk.msg = mv.san + ' is the move Stockfish wanted.'; fixMistake(); render(); return; }
    mk.status = 'checking'; render();
    Promise.all([evaluate(mk.m.fen), evaluate(rec.fen)]).then(function (r) {
      if (gen !== S.gen) return;
      var sign = mv.color === 'w' ? 1 : -1, drop = r[0] && r[1] ? winPct(sign * r[0].cp) - winPct(sign * r[1].cp) : 99;
      if (drop < 3) { flash('ok'); mk.status = 'fixed'; mk.msg = mv.san + ' works too. Stockfish rates it about as well as ' + mk.m.bestSan + '.'; fixMistake(); render(); return; }
      flash('no'); mk.status = 'you'; mk.msg = mv.san + ' isn\'t it either. Look for something stronger.';
      S.plies.pop(); rebuildGame(); S.view = S.plies.length; render();
    });
  }

  var coTimer = null;
  function startCoords() {
    resetGame(); T.view = 'coords';
    T.co = { target: randSq(), score: 0, misses: 0, end: Date.now() + 30000, running: true, color: T.co ? T.co.color : 'w' };
    S.orient = T.co.color;
    clearInterval(coTimer);
    coTimer = setInterval(function () {
      var el = $('#coTime');
      if (!T.co || !T.co.running) { clearInterval(coTimer); return; }
      var left = Math.max(0, T.co.end - Date.now());
      if (el) el.textContent = (left / 1000).toFixed(1) + 's';
      if (left <= 0) { T.co.running = false; clearInterval(coTimer); var b = store.get('coBest', 0); if (T.co.score > b) store.set('coBest', T.co.score); render(); }
    }, 100);
    render();
  }
  function randSq() { return FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8)); }
  function coordClick(sq) {
    var co = T.co;
    if (!co || !co.running) return;
    if (sq === co.target) { co.score++; flash('ok'); } else { co.misses++; flash('no'); }
    var next; do { next = randSq(); } while (next === co.target);
    co.target = next;
    var t = $('#coTarget'), sc = $('#coScore');
    if (t) t.textContent = next;
    if (sc) sc.textContent = co.score;
  }
  function stopTrain() {
    clearInterval(coTimer); if (T.co) T.co.running = false;
    if (T.rush && T.rush.running) { T.rush.running = false; clearInterval(rushTimer); }
  }

  function sparkline(vals) {
    if (vals.length < 2) return '';
    var W = 160, H = 36, lo = Math.min.apply(null, vals) - 10, hi = Math.max.apply(null, vals) + 10;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * W).toFixed(1) + ',' + (H - (v - lo) / (hi - lo) * H).toFixed(1); });
    var last = pts[pts.length - 1].split(',');
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="var(--accent)"/></svg>';
  }

  // Each panel view returns { key, head: { title, sub, back, right, tabs }, body, foot }.
  function renderTrain() {
    var st = pzStats(), mistakes = store.get('mistakes', []);
    var backTo = 'id="trainBack"';
    if (T.view === 'menu') {
      var egDone = Object.keys(store.get('egDone', {})).length, hist = store.get('history', []).length;
      var tile = function (id, ic, title, stat, desc, extra) {
        return '<button class="tile" data-train="' + id + '"><span class="tile-top">' + icon(ic, 30) + '<b>' + title + '</b></span><span class="tile-stat">' + stat + '</span>' + (extra || '') + '<span class="tile-d">' + desc + '</span></button>';
      };
      return {
        key: 'menu',
        head: { title: 'Train', sub: 'Short drills that make you stronger' },
        body: '<div class="sec"><button class="hero-tile" data-train="puzzle"><span class="ht-l"><small>Puzzle rating</small><b>' + st.rating + '</b>' +
          '<span class="muted">' + st.solved + ' solved · streak ' + st.streak + ' · best ' + st.best + '</span></span>' +
          '<span class="ht-r">' + (sparkline(st.hist) || '<span class="muted">Your rating graph appears after a few puzzles.</span>') + '</span>' +
          '<span class="ht-cta">Solve puzzles ' + svgIcon('next') + '</span></button></div>' +
          '<div class="sec"><div class="tiles">' +
          tile('rush', 'great', 'Puzzle Rush', 'Best ' + store.get('rushBest', 0), '3 minutes, 3 strikes, rising difficulty.') +
          tile('endgames', 'best', 'Endgames', egDone + ' of ' + ENDGAMES.length + ' done', 'Convert must-know endings vs Stockfish.', '<span class="meter"><i style="width:' + (egDone / ENDGAMES.length * 100) + '%"></i></span>') +
          tile('mistakes', 'miss', 'Fix mistakes', mistakes.length + ' saved', 'Positions from your own games.') +
          tile('insights', 'excellent', 'Insights', hist + ' game' + (hist === 1 ? '' : 's'), 'Where you lose points, and what to drill.') +
          '</div><button class="slim-tile" data-train="coords">' + icon('book', 26) + '<span><b>Coordinates</b><small>Click the named square as fast as you can</small></span><span class="tile-stat">Best ' + store.get('coBest', 0) + '</span></button></div>'
      };
    }
    if (T.view === 'insights') {
      var n = store.get('history', []).filter(function (x) { return x.phases; }).length;
      return { key: 'insights', head: { title: 'Insights', sub: n >= 3 ? 'Patterns across your last ' + n + ' games' : 'Needs 3 games to get started', back: backTo }, body: insightsHtml() };
    }
    if (T.view === 'rush' && T.rush) {
      var r = T.rush;
      if (!r.running) {
        return {
          key: 'rush-end',
          head: { title: 'Puzzle Rush', sub: 'Best run: ' + store.get('rushBest', 0), back: backTo },
          body: '<div class="sec"><div class="result big">' + icon(r.newBest ? 'brilliant' : 'great', 44) + '<div><b>' + r.score + ' solved</b><p class="muted">' + esc(r.why || '') + (r.newBest ? ' New personal best!' : '') + '</p></div></div></div>',
          foot: '<button class="ib primary big" data-train="rush">Play again</button>'
        };
      }
      var strikes = [0, 1, 2].map(function (i) { return '<span class="strike' + (i < r.strikes ? ' on' : '') + '">' + icon(i < r.strikes ? 'blunder' : 'miss', 22) + '</span>'; }).join('');
      return {
        key: 'rush',
        head: { title: 'Puzzle Rush', sub: 'Puzzle rated ' + (T.pz ? T.pz.data[3] : '—'), right: '<button class="ib sm" id="rushEnd">End run</button>' },
        body: '<div class="sec"><div class="stats"><div><small>Solved</small><b>' + r.score + '</b></div><div><small>Time</small><b id="rushTime">' + fmtClock(r.end - Date.now()) + '</b></div><div><small>Strikes</small><b class="strikes">' + strikes + '</b></div></div>' +
          '<div class="turnline"><span class="turn ' + (T.pz ? T.pz.side : 'w') + '"></span><b>' + (T.pz && T.pz.status === 'opp' ? 'Watch the opponent’s move…' : (T.pz && T.pz.side === 'w' ? 'White' : 'Black') + ' to move') + '</b></div></div>'
      };
    }
    if (T.view === 'endgames') {
      var done = store.get('egDone', {});
      return {
        key: 'endgames',
        head: { title: 'Endgame drills', sub: Object.keys(done).length + ' of ' + ENDGAMES.length + ' done', back: backTo },
        body: '<div class="sec"><p class="muted">Stockfish plays the other side at full strength, so it defends perfectly. Win the winning ones, hold the draws.</p><div class="list">' +
          ENDGAMES.map(function (d) {
            return '<button class="lrow" data-eg="' + d.id + '"><span class="pill ' + (d.side === 'b' ? 'def' : 'win') + '">' + (d.side === 'b' ? 'Hold' : 'Win') + '</span><span class="lt"><b>' + esc(d.name) + '</b><small>' + esc(d.sub) + '</small></span>' + (done[d.id] ? '<span class="ok">' + icon('good', 20) + '</span>' : '<span class="chev">' + svgIcon('next') + '</span>') + '</button>';
          }).join('') + '</div></div>'
      };
    }
    if (T.view === 'endgame' && T.eg) {
      var eg = T.eg, d = eg.d, over = eg.status === 'won' || eg.status === 'lost';
      var b = '<div class="sec"><div class="stats two"><div><small>Goal</small><b class="goaltext">' + egGoal(d) + '</b></div><div><small>Moves used</small><b>' + eg.moves + (d.goal === 'draw' ? '' : ' / ' + d.limit) + '</b></div></div>';
      if (over) b += '<div class="result">' + icon(eg.status === 'won' ? 'best' : 'blunder', 36) + '<div><b>' + (eg.status === 'won' ? 'Done!' : 'Not this time') + '</b><p class="muted">' + esc(eg.msg) + '</p></div></div>';
      else b += '<div class="turnline"><span class="turn ' + eg.side + '"></span><b>' + (eg.status === 'bot' ? 'Stockfish is thinking…' : eg.status === 'checking' ? 'Checking…' : 'Your move') + '</b></div>';
      b += '</div><div class="sec"><details class="strat"' + (over && eg.status === 'lost' ? ' open' : '') + '><summary>How to do it</summary><div class="body"><p class="structure">' + esc(d.tip) + '</p></div></details></div>';
      return {
        key: 'eg-' + d.id,
        head: { title: esc(d.name), sub: esc(d.sub), back: 'data-train="endgames"' },
        body: b,
        foot: (over ? '' : '<button class="ib" id="hintBtn">' + svgIcon('hint') + 'Hint</button>') + '<button class="ib' + (over ? ' primary big' : '') + '" data-eg="' + d.id + '">' + svgIcon('undo') + 'Restart</button>'
      };
    }
    if (T.view === 'puzzle' && T.pz) {
      var pz = T.pz, pd = pz.data, solved = pz.status === 'solved' || pz.status === 'shown';
      var line = { opp: 'Watch the opponent’s move…', you: (pz.side === 'w' ? 'White' : 'Black') + ' to move. Find the best move.', retry: 'Try again.', wrong: 'Not quite.', solved: 'Solved!', shown: 'Here’s the solution.', checking: '' }[pz.status];
      var pb = '<div class="sec"><div class="turnline' + (pz.status === 'solved' ? ' good' : pz.status === 'wrong' ? ' bad' : '') + '"><span class="turn ' + pz.side + '"></span><b>' + line + '</b></div>';
      if (pz.msg && !solved) pb += '<p class="muted">' + esc(pz.msg) + '</p>';
      if (pz.rated) pb += '<p class="delta ' + (pz.delta >= 0 ? 'up' : 'down') + '">' + (pz.delta >= 0 ? '+' : '−') + Math.abs(pz.delta) + ' → rating ' + st.rating + '</p>';
      if (solved) pb += '<p class="status">Themes: ' + esc(pd[4].split(' ').map(function (t) { var x = PZ_THEMES.find(function (q) { return q[0] === t; }); return x ? x[1] : t; }).join(', ') || 'mixed') + '. <a href="https://lichess.org/training/' + pd[0] + '" target="_blank" rel="noopener">View on Lichess</a></p>';
      pb += '</div><div class="sec"><div class="stats"><div><small>Rating</small><b>' + st.rating + '</b></div><div><small>Streak</small><b>' + st.streak + '</b></div><div><small>Best streak</small><b>' + st.best + '</b></div></div>' + sparkline(st.hist) + '</div>';
      pb += '<div class="sec"><h3>Theme</h3><div class="chips">' + PZ_THEMES.map(function (t) { return '<button data-theme="' + t[0] + '" aria-pressed="' + (T.theme === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
      return {
        key: 'puzzle',
        head: { title: 'Puzzle', sub: 'Rated ' + pd[3] + (T.theme !== 'all' ? ' · ' + (PZ_THEMES.find(function (q) { return q[0] === T.theme; }) || [0, ''])[1] : ''), back: backTo },
        body: pb,
        foot: solved ? '<button class="ib primary big" id="pzNext">Next puzzle</button>' :
          '<button class="ib" id="pzHint">' + svgIcon('hint') + 'Hint</button><button class="ib" id="pzShow">' + svgIcon('eye') + 'Solution</button><button class="ib" id="pzSkip">' + svgIcon('next') + 'Skip</button>'
      };
    }
    if (T.view === 'mistakes') {
      if (!T.mk) return { key: 'mk-empty', head: { title: 'Fix your mistakes', sub: 'Nothing saved yet', back: backTo }, body: '<div class="sec"><div class="empty-state">' + icon('miss', 40) + '<p>Play a few games against the bots. Every mistake, miss or blunder you make shows up here as a puzzle from your own game.</p></div></div>', foot: '<button class="ib primary big" data-act="tab:play">Play a game</button>' };
      var mk = T.mk, m = mk.m, list = store.get('mistakes', []);
      var mb = '<div class="sec"><div class="coach"><div class="ico">' + icon(m.cls, 38) + '</div><div><div class="t">You played ' + esc(m.played) + ' here</div><div class="d">' + CLASSES[m.cls].label + (mk.temp ? ' in this game' : ' against ' + esc(m.bot)) + '. Find the better move for ' + (m.fen.split(' ')[1] === 'w' ? 'White' : 'Black') + '.</div></div></div>';
      if (mk.msg) mb += '<div class="note" style="border-color:' + (mk.status === 'fixed' ? 'var(--c-best)' : 'var(--c-mistake)') + '">' + esc(mk.msg) + '</div>';
      mb += '</div>';
      return {
        key: 'mk-' + mk.i + (mk.temp ? 't' : ''),
        head: { title: mk.temp ? 'Retry' : 'Fix your mistakes', sub: mk.temp ? 'Find the move you missed' : 'Mistake ' + (mk.i + 1) + ' of ' + Math.max(list.length, mk.i + 1), back: mk.temp ? 'id="mkBack"' : backTo },
        body: mb,
        foot: mk.status === 'fixed' ? (mk.temp ? '<button class="ib primary big" id="mkBack">Back to game</button>' : '<button class="ib primary big" id="mkNext">Next mistake</button>') :
          '<button class="ib" id="mkHint">' + svgIcon('hint') + 'Hint</button><button class="ib" id="mkShow">' + svgIcon('eye') + 'Answer</button><button class="ib" id="mkSkip">' + svgIcon('next') + 'Skip</button>'
      };
    }
    if (T.view === 'coords') {
      var co = T.co, cb = '<div class="sec">';
      if (co.running) cb += '<div class="cobig"><span class="lab">Click</span><b id="coTarget">' + co.target + '</b></div><div class="stats"><div><small>Score</small><b id="coScore">' + co.score + '</b></div><div><small>Time</small><b id="coTime">30.0s</b></div><div><small>Best</small><b>' + store.get('coBest', 0) + '</b></div></div>';
      else cb += '<div class="result big">' + icon('book', 44) + '<div><b>' + co.score + ' correct</b><p class="muted">' + co.misses + ' missed. Best so far: ' + store.get('coBest', 0) + '.</p></div></div>';
      cb += '<div class="seg"><button data-co="w" aria-pressed="' + (co.color === 'w') + '">As White</button><button data-co="b" aria-pressed="' + (co.color === 'b') + '">As Black</button></div></div>';
      return { key: 'coords', head: { title: 'Coordinates', sub: 'Best: ' + store.get('coBest', 0) + ' in 30 seconds', back: backTo }, body: cb, foot: '<button class="ib primary big" id="coStart">' + (co.running ? 'Restart' : 'Go again') + '</button>' };
    }
    return { key: 'none', head: { title: 'Train' }, body: '' };
  }
  function trainHint() {
    var u = T.view === 'puzzle' ? T.pz.sol[T.pz.step] : T.mk.m.best;
    if (!u) return;
    S.selected = u.slice(0, 2); render();
  }
  function trainShowMistake() {
    var u = T.mk.m.best;
    S.hintArrow = { from: u.slice(0, 2), to: u.slice(2, 4), tone: 'better' };
    T.mk.msg = 'The move was ' + T.mk.m.bestSan + '. Play it on the board to lock it in.';
    render();
  }

  // ---------- Panel ----------
  var panel = $('#panel');
  var ICONS = {
    hint: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    threat: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4M12 17v.4"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    chart: '<path d="M4 4v16h16"/><path d="M7 15l4-5 3 3 5-7"/>',
    file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6M9 14l3 3 3-3"/>'
  };
  function svgIcon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }
  function botAvatar(b, size) { return '<span class="bav" style="--bc:' + b.color + ';--s:' + size + 'px"><span class="pc w' + b.piece + '"></span></span>'; }
  function sideAvatar(color, size) { return '<span class="bav as-' + color + '" style="--s:' + size + 'px"><span class="pc ' + color + 'k"></span></span>'; }
  function sym(cls) { return '<span class="s" title="' + CLASSES[cls].label + '">' + icon(cls, 16) + '</span>'; }

  // Small static board, e.g. for opening cards.
  var lineFens = {};
  function courseFen(c) {
    if (!lineFens[c.id]) { var g = new Chess(); c.moves.split(' ').forEach(function (m) { g.move(m); }); lineFens[c.id] = g.fen(); }
    return lineFens[c.id];
  }
  function miniBoard(fen, orient) {
    var m = pieceMap(fen), h = '<span class="mb" aria-hidden="true">';
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var rr = orient === 'w' ? r : 7 - r, ff = orient === 'w' ? f : 7 - f, p = m[FILES[ff] + (8 - rr)];
      h += '<i class="' + ((rr + ff) % 2 ? 'd' : 'l') + '">' + (p ? '<span class="pc ' + (p === p.toUpperCase() ? 'w' : 'b') + p.toLowerCase() + '"></span>' : '') + '</i>';
    }
    return h + '</span>';
  }

  function movesHtml() {
    if (!S.plies.length) return '<div class="moves"><p class="empty">' + (S.mode === 'analyse' ? 'Move pieces for both sides, or load a game from the Import tab.' : 'Moves will appear here.') + '</p></div>';
    var showCls = S.showRatings || S.mode !== 'play' || !S.playing;
    var num = +(S.startFen.split(' ')[5] || 1), rows = [], cur = null;
    S.plies.forEach(function (p, i) {
      if (p.color === 'w' || !cur) { cur = { n: num, w: null, b: null }; rows.push(cur); }
      if (p.color === 'w') cur.w = i; else { cur.b = i; num++; }
    });
    var cell = function (i, filler) {
      if (i == null) return '<span class="mv none">' + filler + '</span>';
      var p = S.plies[i];
      return '<button class="mv' + (S.view === i + 1 ? ' cur' : '') + '" data-ply="' + (i + 1) + '">' + (showCls && p.cls ? sym(p.cls) : '') + '<span>' + esc(p.san) + '</span></button>';
    };
    return '<div class="moves" id="moveList">' + rows.map(function (r) { return '<div class="mrow"><span class="n">' + r.n + '.</span>' + cell(r.w, '…') + cell(r.b, '') + '</div>'; }).join('') + '</div>';
  }

  function accuracy(color) { return accuracyOf(S.plies, color); }
  function accHtml(labels) {
    var aw = accuracy('w'), ab = accuracy('b');
    var box = function (lab, v, c) { return '<div class="accbox"><span class="dot-' + c + '"></span><small>' + lab + '</small><b>' + (v == null ? '—' : v.toFixed(1) + '%') + '</b></div>'; };
    return '<div class="acc">' + box(labels[0], aw, 'w') + box(labels[1], ab, 'b') + '</div>';
  }

  function coachHtml(p, whoLabel) {
    if (!p) return '<div class="coach"><div class="ico idle">' + icon('best', 38) + '</div><div><div class="t">Your coach is watching</div><div class="d">Every move gets graded by Stockfish the moment it’s played.</div></div></div>';
    if (!p.cls) return '<div class="coach"><div class="ico idle"><span class="thinking"><i></i><i></i><i></i></span></div><div><div class="t">Checking ' + esc(p.san) + '…</div><div class="d">Stockfish is looking at the position.</div></div></div>';
    var o = openingName(sansTo(S.plies.indexOf(p) + 1));
    var who = whoLabel ? whoLabel + ' ' : '';
    var t = esc(p.san) + ' is ' + ({ brilliant: 'brilliant', great: 'a great move', best: 'the best move', excellent: 'excellent', good: 'good', book: 'a book move', inaccuracy: 'an inaccuracy', mistake: 'a mistake', miss: 'a miss', blunder: 'a blunder' })[p.cls];
    var d;
    if (p.cls === 'book') d = o ? 'Theory: ' + esc(o.name) + '.' : 'Known opening theory.';
    else if (p.cls === 'brilliant') d = 'A sacrifice that works. You gave up material and Stockfish agrees it was the strongest choice.';
    else if (p.cls === 'great') d = 'The only good move here. Every alternative was clearly worse.';
    else if (p.cls === 'best') d = 'Exactly what Stockfish would play.';
    else if (p.cls === 'miss') d = 'Your opponent had just slipped, and this lets them off the hook.' + (p.bestSan ? ' <b>' + esc(p.bestSan) + '</b> punished it' + (S.plies[S.view - 1] === p ? ' (green arrow).' : '.') : '');
    else if (p.cls === 'excellent') d = 'Almost as strong as the top choice' + (p.bestSan ? ', ' + esc(p.bestSan) : '') + '.';
    else if (p.cls === 'good') d = 'Solid. ' + (p.bestSan ? esc(p.bestSan) + ' was a little stronger.' : '');
    else {
      var onBoard = S.plies[S.view - 1] === p;
      d = (p.bestSan ? 'Better was <b>' + esc(p.bestSan) + '</b>' + (onBoard ? ' (green arrow).' : '.') : '') +
        (p.replySan ? ' The problem: <b>' + esc(p.replySan) + '</b> is now strong for your opponent' + (onBoard ? ' (red arrow).' : '.') : '');
    }
    var ev = p.evalBefore && p.evalAfter ? '<span class="evchip">' + fmtEval(p.evalBefore) + ' → ' + fmtEval(p.evalAfter) + '</span>' : '';
    var idx = S.plies.indexOf(p), acts = '';
    if (sampler && p.cls !== 'book') acts += '<button class="ib sm" data-explain="' + idx + '">' + (p.explain ? 'Explain again' : 'Explain this move') + '</button>';
    if (BAD.indexOf(p.cls) >= 0 && p.bestUci && (S.mode !== 'play' || !S.playing)) acts += '<button class="ib sm" data-retry="' + idx + '">' + svgIcon('undo') + 'Retry this move</button>';
    var expl = p.explain != null ? '<p class="explain" data-explain-out="' + idx + '">' + esc(p.explain) + '</p>' : '';
    return '<div class="coach c-' + p.cls + '"><div class="ico">' + icon(p.cls, 38) + '</div><div><div class="t">' + who + t + '</div><div class="d">' + d + '</div>' + ev + expl + (acts ? '<div class="row acts">' + acts + '</div>' : '') + '</div></div>';
  }

  function resultText() {
    var c = S.game;
    if (S.flagged) return S.flagged === S.you ? { head: 'You ran out of time', sub: S.bot.name + ' wins on time.', won: false } : { head: S.bot.name + ' ran out of time', sub: 'You win on the clock.', won: true };
    if (S.resigned) return { head: 'You resigned', sub: S.bot.name + ' wins.', won: false };
    if (c.in_checkmate()) { var youWon = c.turn() !== S.you; return { head: youWon ? 'Checkmate. You win!' : 'Checkmate. ' + S.bot.name + ' wins.', sub: youWon ? 'Nice finish.' : 'Review the game to see where it turned.', won: youWon }; }
    if (c.in_stalemate()) return { head: 'Draw by stalemate', sub: 'The side to move has no legal moves.' };
    if (c.in_threefold_repetition()) return { head: 'Draw by repetition', sub: 'The same position came up three times.' };
    if (c.insufficient_material()) return { head: 'Draw', sub: 'Neither side has enough material to mate.' };
    if (c.in_draw()) return { head: 'Draw', sub: '50-move rule.' };
    return null;
  }

  function engineNote() {
    if (engineOk === null) return '<div class="loading"><span class="thinking"><i></i><i></i><i></i></span>Loading Stockfish 17…</div>';
    if (engineOk === false) return '<p class="err">Stockfish couldn\'t start in this browser, so ratings and analysis are off. Bots will play random moves.</p>';
    return '';
  }

  function progressHtml() {
    var hist = store.get('history', []), st = pzStats();
    if (!hist.length && !st.n) return '';
    var last = hist.slice(0, 10), accs = last.filter(function (g) { return g.acc != null; });
    var avg = accs.length ? accs.reduce(function (a, g) { return a + g.acc; }, 0) / accs.length : null;
    var wins = last.filter(function (g) { return g.result === 'win'; }).length;
    var h = '<div class="sec"><div class="spread"><h3>Your progress</h3><button class="link" data-act="insights">Insights ' + svgIcon('next') + '</button></div><div class="stats">' +
      '<div><small>Games</small><b>' + hist.length + '</b></div>' +
      '<div><small>Avg accuracy</small><b>' + (avg == null ? '—' : avg.toFixed(0) + '%') + '</b></div>' +
      '<div><small>Puzzles</small><b>' + st.rating + '</b></div></div>';
    if (accs.length >= 2) h += '<div class="spark-wrap"><small class="muted">Accuracy, last ' + accs.length + ' games · ' + wins + ' win' + (wins === 1 ? '' : 's') + '</small>' + sparkline(accs.slice().reverse().map(function (g) { return g.acc; })) + '</div>';
    h += '</div>';
    if (hist.length) {
      h += '<div class="sec"><h3>Recent games</h3><div class="hist">';
      hist.slice(0, 6).forEach(function (g, i) {
        var bot = BOTS.find(function (b) { return b.id === g.bot; });
        var av = bot ? botAvatar(bot, 34) : sideAvatar(g.you === 'w' ? 'b' : 'w', 34);
        h += '<button class="hrow" data-hist="' + i + '">' + av + '<span class="hmain"><b>' + esc(g.vs || (bot ? bot.name : 'Opponent')) + (g.source === 'import' ? ' <span class="tag">imported</span>' : '') + '</b><small>' + esc(g.opening || 'Unnamed opening') + ' · ' + Math.ceil(g.sans.length / 2) + ' moves</small></span>' +
          '<span class="hres"><span class="res ' + g.result + '">' + { win: 'Won', loss: 'Lost', draw: 'Draw' }[g.result] + '</span><span class="hacc">' + (g.acc != null ? g.acc.toFixed(0) + '%' : '') + '</span></span></button>';
      });
      h += '</div></div>';
    }
    return h;
  }

  function renderPlay() {
    if (!S.playing && !S.plies.length) {
      var b = S.bot, rec = (store.get('records', {}))[b.id];
      var h = (engineNote() ? '<div class="sec">' + engineNote() + '</div>' : '');
      h += '<div class="sec"><div class="opp">' + botAvatar(b, 76) + '<div class="opp-t"><div class="opp-n"><b>' + esc(b.name) + '</b><span class="chip">≈' + b.rating + '</span></div>' +
        '<span class="lvl">' + b.tag + (rec ? ' · your record ' + rec.w + 'W ' + rec.l + 'L' + (rec.d ? ' ' + rec.d + 'D' : '') : '') + '</span><p>' + esc(b.blurb) + '</p></div></div>' +
        '<div class="botrow" role="group" aria-label="Opponents">' + BOTS.map(function (x) {
          return '<button class="botpick" data-bot="' + x.id + '" aria-pressed="' + (b.id === x.id) + '" aria-label="' + esc(x.name) + ', about ' + x.rating + '">' + botAvatar(x, 44) + '<b>' + esc(x.name) + '</b><small>' + x.rating + '</small></button>';
        }).join('') + '</div></div>';
      h += '<div class="sec"><h3>Game settings</h3>' +
        '<div class="setrow"><span>Play as</span><div class="seg colors" role="group" aria-label="Your color">' +
        ['w', 'r', 'b'].map(function (c) { return '<button data-color="' + c + '" aria-pressed="' + (S.youPick === c) + '" aria-label="' + { w: 'White', r: 'Random', b: 'Black' }[c] + '">' + (c === 'r' ? '<span class="rnd"></span>' : '<span class="pc ' + c + 'k"></span>') + '</button>'; }).join('') + '</div></div>' +
        '<div class="setrow col"><span>Time control</span><div class="chips" role="group" aria-label="Time control">' +
        TCS.map(function (t) { return '<button data-tc="' + t[0] + '" aria-pressed="' + (S.tc === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
        '<label class="toggle" for="rateToggle"><span>Live move ratings<small>Grade every move as you play</small></span><input type="checkbox" id="rateToggle"' + (S.showRatings ? ' checked' : '') + '></label></div>';
      h += progressHtml();
      return { key: 'setup', head: { title: 'Play', sub: 'Choose an opponent and time control' }, body: h, foot: '<button class="ib primary big" id="startBtn">Play ' + esc(b.name) + '</button>' };
    }
    var mine = S.plies.filter(function (p) { return p.color === S.you; });
    var lastMine = mine[mine.length - 1], res = resultText(), o = openingName(sansTo(S.plies.length));
    var status = res ? res.head : S.botThinking ? S.bot.name + ' is thinking…' : S.game.turn() === S.you ? 'Your move' : S.bot.name + ' to move';
    var tcLabel = S.clock ? (TCS.find(function (t) { return t[0] === S.tc; }) || [0, ''])[1].replace(' | ', '+') : 'Untimed';
    var h2 = '';
    if (res) h2 += '<div class="sec"><div class="result big ' + (res.won ? 'won' : res.won === false ? 'lost' : 'drawn') + '">' + icon(res.won ? 'best' : res.won === false ? 'blunder' : 'good', 44) + '<div><b>' + res.head + '</b><p class="muted">' + res.sub + '</p></div></div><div class="row"><button class="ib primary" id="reviewBtn">' + svgIcon('chart') + 'Review game</button><button class="ib" id="newBtn">' + svgIcon('plus') + 'New game</button></div></div>';
    if (S.threatMsg) h2 += '<div class="sec"><p class="note threat">' + esc(S.threatMsg) + '</p></div>';
    h2 += '<div class="sec">' + (S.showRatings || res ? coachHtml(lastMine, null) : '<div class="coach"><div class="ico idle">' + icon('book', 38) + '</div><div><div class="t">Live ratings are hidden</div><div class="d">They’re still recorded. Review the game when it ends.</div></div></div>') + engineNote() + '</div>';
    var pc = S.plies.length >= 6 ? planCourse(S.you) : null;
    if (pc) h2 += planCardHtml(pc);
    h2 += '<div class="sec">' + (S.showRatings || res ? accHtml(S.you === 'w' ? ['You', S.bot.name] : [S.bot.name, 'You']) : '') + movesHtml() +
      '<label class="toggle" for="rateToggle"><span>Live move ratings</span><input type="checkbox" id="rateToggle"' + (S.showRatings ? ' checked' : '') + '></label></div>';
    var tool = function (id, ic, label, dis) { return '<button class="tool" id="' + id + '"' + (dis ? ' disabled' : '') + '>' + svgIcon(ic) + '<span>' + label + '</span></button>'; };
    var busy = !!res || S.botThinking;
    return {
      key: 'game',
      head: { title: status, sub: (o ? '<b class="eco">' + o.eco + '</b>' + esc(o.name) + ' · ' : '') + tcLabel },
      body: h2,
      foot: '<div class="tools">' + tool('hintBtn', 'hint', 'Hint', busy) + tool('threatBtn', 'threat', 'Threats', busy) +
        tool('undoBtn', 'undo', 'Takeback', !S.plies.some(function (p) { return p.color === S.you; })) +
        (res ? tool('newBtn2', 'plus', 'New game') : tool('resignBtn', 'flag', 'Resign')) + '</div>'
    };
  }

  function linesHtml() {
    if (engineOk === false) return engineNote();
    var fen = curFen(), c = new Chess(fen);
    if (c.game_over()) return '<p class="muted">Game over in this position.</p>';
    if (S.liveFen !== fen || !S.liveLines.length) return '<div class="loading"><span class="thinking"><i></i><i></i><i></i></span>Stockfish is thinking…</div>';
    return S.liveLines.slice(0, 3).map(function (l) {
      var sans = pvToSan(fen, l.pv, 10);
      var pv = sans.map(function (m, i) { var no = moveNo(fen, i); return (no ? '<span>' + no + '</span>' : '') + (i === 0 ? '<b>' + esc(m.san) + '</b>' : esc(m.san)); }).join(' ');
      return '<div class="line"><span class="e' + (l.cp < 0 ? ' neg' : '') + '">' + fmtEval(l) + '</span><span class="pv">' + pv + '</span></div>';
    }).join('');
  }
  function moveNo(fen, i) {
    var parts = fen.split(' '), n = +parts[5], black = parts[1] === 'b';
    var ply = i + (black ? 1 : 0);
    var mn = n + Math.floor(ply / 2);
    return ply % 2 === 0 ? mn + '.' : (i === 0 ? mn + '…' : '');
  }
  function renderLines() {
    var el = $('#lines'); if (el) el.innerHTML = linesHtml();
    var d = $('#liveDepth'); if (d) d.textContent = S.liveDepth ? 'depth ' + S.liveDepth : '';
  }

  function graphHtml() {
    var rated = S.plies.filter(function (p) { return p.evalAfter; });
    if (rated.length < 2) return '';
    var W = 360, H = 96, n = S.plies.length;
    var pts = [[0, H - winPct(evalCache[S.startFen] ? evalCache[S.startFen].cp : 20) / 100 * H]];
    S.plies.forEach(function (p, i) { if (p.evalAfter) pts.push([(i + 1) / n * W, H - (p.evalAfter.mate != null ? (p.evalAfter.cp > 0 ? 100 : 0) : winPct(p.evalAfter.cp)) / 100 * H]); });
    var path = 'M0,' + H + ' ' + pts.map(function (q) { return 'L' + q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + ' L' + pts[pts.length - 1][0].toFixed(1) + ',' + H + ' Z';
    var marks = '';
    S.plies.forEach(function (p, i) {
      if (p.evalAfter && (BAD.indexOf(p.cls) >= 0 || p.cls === 'brilliant' || p.cls === 'great')) {
        var x = (i + 1) / n * W, y = H - (p.evalAfter.mate != null ? (p.evalAfter.cp > 0 ? 100 : 0) : winPct(p.evalAfter.cp)) / 100 * H;
        marks += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + clsColor(p.cls) + '" stroke="var(--surface)" stroke-width="1"/>';
      }
    });
    var cx = S.view / n * W;
    return '<svg class="graph" id="graph" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Evaluation over the game">' +
      '<path d="' + path + '" fill="var(--evw)"/><line x1="0" x2="' + W + '" y1="' + H / 2 + '" y2="' + H / 2 + '" stroke="var(--muted)" stroke-width=".6" stroke-dasharray="3 3"/>' +
      '<line x1="' + cx + '" x2="' + cx + '" y1="0" y2="' + H + '" stroke="var(--accent)" stroke-width="1.5"/>' + marks + '</svg>';
  }
  // The biggest swings of the game, plus any brilliant or great moves.
  function keyMomentsHtml() {
    var picks = S.plies.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) {
      return (BAD.indexOf(x.p.cls) >= 0 && x.p.drop >= 10) || x.p.cls === 'brilliant' || x.p.cls === 'great';
    }).sort(function (a, b) { return (b.p.cls === 'brilliant' ? 99 : b.p.drop) - (a.p.cls === 'brilliant' ? 99 : a.p.drop); }).slice(0, 4).sort(function (a, b) { return a.i - b.i; });
    if (!picks.length) return '';
    return '<div class="moments"><h3>Key moments</h3>' + picks.map(function (x) {
      var p = x.p, label = Math.floor(x.i / 2 + 1) + (p.color === 'w' ? '. ' : '… ') + p.san;
      var detail = BAD.indexOf(p.cls) >= 0 ? CLASSES[p.cls].label + ' · ' + fmtEval(p.evalBefore) + ' → ' + fmtEval(p.evalAfter) : CLASSES[p.cls].label + ' move';
      return '<button class="moment" data-ply="' + (x.i + 1) + '">' + icon(p.cls, 24) + '<span><b>' + esc(label) + '</b><small>' + detail + '</small></span>' + svgIcon('next') + '</button>';
    }).join('') + '</div>';
  }
  function tallyHtml() {
    var rows = '';
    CLASS_ORDER.forEach(function (k) {
      var w = 0, b = 0; S.plies.forEach(function (p) { if (p.cls === k) { if (p.color === 'w') w++; else b++; } });
      rows += '<tr><td><span class="lab">' + sym(k) + CLASSES[k].label + '</span></td><td>' + w + '</td><td>' + b + '</td></tr>';
    });
    return '<table class="tally"><tr><td></td><td class="muted">White</td><td class="muted">Black</td></tr>' + rows + '</table>';
  }

  function renderAnalyse() {
    var tab = S.anTab, p = S.view ? S.plies[S.view - 1] : null;
    var reviewing = S.review && S.review.done < S.review.total, importing = S.imp && !S.imp.finished;
    var tabs = '<div class="ptabs" role="tablist" aria-label="Analysis views">' + [['engine', 'Engine'], ['review', 'Review'], ['import', 'Import']].map(function (t) {
      var busy = (t[0] === 'review' && reviewing) || (t[0] === 'import' && importing);
      return '<button role="tab" id="antab-' + t[0] + '" data-antab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + (busy ? '<span class="busy"></span>' : '') + '</button>';
    }).join('') + '</div>';
    var o = openingName(sansTo(S.view));
    var head = { title: 'Analysis', sub: esc(analyser.name || 'Stockfish') + ' · <span id="liveDepth">' + (S.liveDepth ? 'depth ' + S.liveDepth : '') + '</span>', tabs: tabs };
    var unrated = S.plies.some(function (q) { return !q.cls; });
    if (tab === 'review') {
      var h = '';
      if (reviewing) h += '<div class="sec"><div class="spread"><h3>Rating moves</h3><span class="muted mono">' + S.review.done + ' / ' + S.review.total + '</span></div><div class="prog"><i style="width:' + (S.review.done / Math.max(1, S.review.total) * 100) + '%"></i></div></div>';
      if (!S.plies.length) h += '<div class="sec"><div class="empty-state">' + icon('excellent', 40) + '<p>Load a game from the Import tab, or play moves in Engine, and the full review shows up here: accuracy, key moments and every move graded.</p></div></div>';
      else {
        h += '<div class="sec">' + (p ? coachHtml(p, p.color === 'w' ? 'White:' : 'Black:') : '<p class="muted">Step through the game with the arrows, or tap a key moment.</p>') + '</div>';
        h += '<div class="sec">' + graphHtml() + accHtml(['White', 'Black']) + keyMomentsHtml() + '</div>';
        h += '<div class="sec"><h3>Moves</h3>' + movesHtml() + '</div>';
        if (S.plies.some(function (q) { return q.cls; }) && S.plies.length > 3) h += '<div class="sec"><h3>Move summary</h3>' + tallyHtml() + '</div>';
      }
      return { key: 'review', head: head, body: h, foot: S.plies.length ? '<button class="ib' + (unrated && !reviewing ? ' primary' : '') + ' big" id="reviewRun"' + (!unrated || reviewing ? ' disabled' : '') + '>' + (unrated ? 'Rate all moves' : 'All moves rated') + '</button>' : '' };
    }
    if (tab === 'import') {
      var un = store.get('username', ''), enc = encodeURIComponent(un || 'USERNAME');
      var hi = '<div class="sec">';
      if (importing) hi += '<div class="spread"><span class="status">Analysing game ' + Math.min(S.imp.done + 1, S.imp.total) + ' of ' + S.imp.total + '…</span></div><div class="prog"><i style="width:' + (S.imp.done / S.imp.total * 100) + '%"></i></div>';
      else if (S.imp && S.imp.finished) hi += '<p class="note">Imported ' + S.imp.total + ' games. They’re in Recent games on the Play tab, your mistakes went to Train, and Insights is updated.</p>';
      hi += '<label class="fld" for="impUser">Your Lichess or Chess.com username<input type="text" id="impUser" value="' + esc(un) + '" placeholder="e.g. magnus" autocomplete="off"></label>' +
        '<ol class="steps"><li>Download your games: <a id="lnkLichess" href="https://lichess.org/api/games/user/' + enc + '?max=10&amp;evals=false&amp;clocks=false" target="_blank" rel="noopener">Lichess (last 10)</a> or <a id="lnkChesscom" href="https://www.chess.com/games/archive/' + enc + '" target="_blank" rel="noopener">Chess.com archive</a>.</li><li>Choose the file below, or paste its text. One game opens for review; several are analysed in the background.</li></ol>' +
        '<textarea id="importBox" rows="5" placeholder="Paste one or more games (PGN), or a FEN position">' + esc(S.importDraft || '') + '</textarea>' +
        (S.importErr ? '<p class="err">' + esc(S.importErr) + '</p>' : '') + '</div>';
      return { key: 'import', head: head, body: hi, foot: '<label class="ib" for="impFile">' + svgIcon('file') + 'Choose file</label><input type="file" id="impFile" accept=".pgn,.txt,application/x-chess-pgn,text/plain" hidden><button class="ib primary grow" id="importBtn">Load and review</button>' };
    }
    var he = '<div class="sec"><div class="enginecard"><div class="spread"><h3>Top lines</h3>' + (o ? '<span class="openlabel"><b class="eco">' + o.eco + '</b>' + esc(o.name) + '</span>' : '') + '</div><div class="lines" id="lines">' + linesHtml() + '</div></div>' +
      (S.threatMsg ? '<p class="note threat">' + esc(S.threatMsg) + '</p>' : '') + '</div>';
    he += '<div class="sec">' + (p ? coachHtml(p, p.color === 'w' ? 'White:' : 'Black:') : '<p class="muted">Play moves for both sides. Each one gets graded, with the better move drawn on the board when you slip.</p>') + '</div>';
    he += '<div class="sec"><h3>Moves</h3>' + movesHtml() + '</div>';
    var tool = function (id, ic, label, dis) { return '<button class="tool" id="' + id + '"' + (dis ? ' disabled' : '') + '>' + svgIcon(ic) + '<span>' + label + '</span></button>'; };
    return {
      key: 'engine', head: head, body: he,
      foot: '<div class="tools">' + tool('hintBtn', 'hint', 'Best move') + tool('threatBtn', 'threat', 'Threats') + tool('reviewRun', 'chart', 'Review', !S.plies.length) + tool('clearBtn', 'trash', 'Clear') + '</div>'
    };
  }

  function renderLearn() {
    var prog = courseProgress();
    if (!S.course) {
      var f = S.opFilter, mastered = OPENINGS.COURSES.filter(function (c) { return prog[c.id] && prog[c.id].best === 0; }).length;
      var tabs = '<div class="ptabs" role="tablist" aria-label="Filter openings">' + [['all', 'All'], ['w', 'For White'], ['b', 'For Black']].map(function (t) {
        return '<button role="tab" data-opf="' + t[0] + '" aria-selected="' + (f === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
      var list = OPENINGS.COURSES.filter(function (c) { return f === 'all' || c.side === f; }).map(function (c) {
        var p = prog[c.id], moves = Math.ceil(c.moves.split(' ').length / 2);
        var st = p ? (p.best === 0 ? '<span class="ostat ok">' + icon('best', 16) + 'Mastered</span>' : '<span class="ostat">Done ' + p.runs + '× · best ' + p.best + ' slip' + (p.best === 1 ? '' : 's') + '</span>') : '<span class="ostat">' + moves + ' moves · new</span>';
        return '<button class="ocard" data-course="' + c.id + '">' + miniBoard(courseFen(c), c.side) + '<span class="ot"><span class="ometa"><span class="eco">' + c.eco + '</span><span class="side side-' + c.side + '">' + (c.side === 'w' ? 'White' : 'Black') + '</span></span><b>' + esc(c.name) + '</b><small>' + esc(c.sub) + '</small>' + st + '</span></button>';
      }).join('');
      return { key: 'list-' + f, head: { title: 'Openings', sub: mastered + ' of ' + OPENINGS.COURSES.length + ' mastered', tabs: tabs }, body: '<div class="sec"><p class="muted">Pick a line. You play your side, the book plays the other, and every move comes with the idea behind it.</p><div class="olist">' + list + '</div></div>' };
    }
    var c = S.course, mv = courseMoves(), n = S.plies.length, mineIdx = c.side === 'w' ? 0 : 1;
    var prev = '';
    mv.forEach(function (m, i) {
      if (i % 2 === 0) prev += '<span class="no">' + (i / 2 + 1) + '.</span>';
      var cls = i < n ? 'done' : (i === n && i % 2 === mineIdx && !S.courseDone ? 'next' : 'todo');
      var txt = i < n ? esc(m) : (i === n && i % 2 === mineIdx && !S.courseDone ? 'your move' : '···');
      prev += '<span class="' + cls + '">' + txt + '</span> ';
    });
    var msg = S.courseMsg ? '<div class="note" style="border-color:var(--' + (S.courseMsg.tone === 'no' ? 'c-blunder' : S.courseMsg.tone === 'ok' ? 'c-best' : 'accent') + ')">' + esc(S.courseMsg.text) + '</div>' : '';
    var b = '<div class="sec"><p class="plan">' + esc(c.plan) + '</p></div>';
    b += '<div class="sec"><div class="spread"><h3>The line</h3><span class="muted mono">' + Math.min(n, mv.length) + ' / ' + mv.length + (S.courseMistakes ? ' · ' + S.courseMistakes + ' slip' + (S.courseMistakes === 1 ? '' : 's') : '') + '</span></div><p class="linepreview">' + prev + '</p><div class="prog"><i style="width:' + (n / mv.length * 100) + '%"></i></div>' + msg + '</div>';
    b += '<div class="sec"><h3>' + (S.courseDone ? 'Now you’re out of book' : 'After the opening') + '</h3>' + strategyHtml(c, S.courseDone) +
      '<details class="strat"' + (S.courseDone ? ' open' : '') + '><summary>Goals to aim for</summary><div class="body">' + goalsHtml(c) + '</div></details></div>';
    return {
      key: 'course-' + c.id,
      head: { title: esc(c.name), sub: '<b class="eco">' + c.eco + '</b>' + esc(c.sub) + ' · you play ' + (c.side === 'w' ? 'White' : 'Black'), back: 'id="backCourses"' },
      body: b,
      foot: S.courseDone ? '<button class="ib primary grow" id="playFrom">Play it out vs ' + esc(S.bot.name) + '</button><button class="ib" id="drillAgain">' + svgIcon('undo') + 'Again</button>' :
        '<button class="ib" id="hintBtn">' + svgIcon('hint') + 'Hint</button><button class="ib" id="drillAgain">' + svgIcon('undo') + 'Restart</button>'
    };
  }

  function renderPanel() {
    var pb = $('#pbody'), keep = pb ? pb.scrollTop : 0, prevKey = panel.getAttribute('data-key');
    var ml = $('#moveList'), keepMl = ml ? ml.scrollTop : 0;
    var ae = document.activeElement, focusId = ae && panel.contains(ae) && ae.id && /INPUT|TEXTAREA/.test(ae.tagName) ? ae.id : null;
    var sel = focusId ? [ae.selectionStart, ae.selectionEnd] : null;
    var v = S.mode === 'play' ? renderPlay() : S.mode === 'analyse' ? renderAnalyse() : S.mode === 'learn' ? renderLearn() : renderTrain();
    var hd = v.head, key = S.mode + ':' + v.key;
    panel.innerHTML = '<div class="pin"><header class="phead"><div class="ph-row">' +
      (hd.back ? '<button class="ib icon" ' + hd.back + ' aria-label="Back">' + svgIcon('back') + '</button>' : '') +
      '<div class="ph-t"><h2>' + hd.title + '</h2>' + (hd.sub ? '<p>' + hd.sub + '</p>' : '') + '</div>' + (hd.right || '') + '</div>' + (hd.tabs || '') + '</header>' +
      '<div class="pbody" id="pbody">' + v.body + '</div>' + (v.foot ? '<footer class="pfoot">' + v.foot + '</footer>' : '') + '</div>';
    panel.setAttribute('data-key', key);
    if (key === prevKey) { var nb = $('#pbody'); if (nb) nb.scrollTop = keep; }
    ml = $('#moveList');
    if (ml) { ml.scrollTop = keepMl; if (atEnd() && ml.querySelector('.cur')) ml.scrollTop = ml.scrollHeight; }
    if (focusId && document.getElementById(focusId)) { var fe = document.getElementById(focusId); fe.focus(); try { fe.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
  }

  function render() {
    document.body.setAttribute('data-mode', S.mode);
    renderBoard(); renderEval(); renderStrips(); renderPanel();
    var fen = curFen();
    if (!evalCache[fen] && (S.mode === 'play' || S.mode === 'learn') && engineOk) evaluate(fen).then(function () { if (curFen() === fen) renderEval(); });
  }

  // ---------- Panel events ----------
  panel.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.bot) { S.bot = BOTS.find(function (b) { return b.id === t.dataset.bot; }); store.set('bot', S.bot.id); renderPanel(); renderStrips(); return; }
    if (t.dataset.antab) { S.anTab = t.dataset.antab; renderPanel(); return; }
    if (t.dataset.opf) { S.opFilter = t.dataset.opf; renderPanel(); return; }
    if (t.dataset.tc) { S.tc = t.dataset.tc; store.set('tc', S.tc); renderPanel(); return; }
    if (t.dataset.explain != null) { explainMove(+t.dataset.explain); return; }
    if (t.dataset.retry != null) { startRetry(+t.dataset.retry); return; }
    if (t.dataset.color) { S.youPick = t.dataset.color; store.set('color', S.youPick); renderPanel(); return; }
    if (t.dataset.ply) { goto(+t.dataset.ply); return; }
    if (t.dataset.train) {
      var tr = t.dataset.train;
      if (tr === 'puzzle') nextPuzzle(); else if (tr === 'mistakes') startMistake(0); else if (tr === 'rush') startRush();
      else if (tr === 'endgames' || tr === 'insights') { T.view = tr; resetGame(); render(); } else startCoords();
      return;
    }
    if (t.dataset.eg) { startEndgame(ENDGAMES.find(function (d) { return d.id === t.dataset.eg; })); return; }
    if (t.dataset.act) { runAct(t.dataset.act); return; }
    if (t.dataset.theme) { T.theme = t.dataset.theme; store.set('pzTheme', T.theme); nextPuzzle(); return; }
    if (t.dataset.co) { T.co.color = t.dataset.co; startCoords(); return; }
    if (t.dataset.hist != null) { loadHistoryGame(store.get('history', [])[+t.dataset.hist]); return; }
    if (t.dataset.course) { startCourse(OPENINGS.COURSES.find(function (c) { return c.id === t.dataset.course; })); return; }
    switch (t.id) {
      case 'startBtn': startPlay(); break;
      case 'newBtn': case 'newBtn2': resetGame(); S.playing = false; render(); break;
      case 'resignBtn': S.resigned = true; S.playing = false; if (S.clock) S.clock.on = false; finishGame('loss'); S.gen++; S.botThinking = false; render(); break;
      case 'trainBack': stopTrain(); T.view = 'menu'; resetGame(); render(); break;
      case 'pzNext': case 'pzSkip': nextPuzzle(); break;
      case 'pzShow': showSolution(); break;
      case 'pzHint': case 'mkHint': trainHint(); break;
      case 'mkShow': trainShowMistake(); break;
      case 'mkNext': startMistake(T.mk.i); break;
      case 'mkBack': switchMode(T.mk.back); break;
      case 'rushEnd': endRush('Run ended.'); break;
      case 'mkSkip': if (T.mk.temp) switchMode(T.mk.back); else startMistake(T.mk.i + 1); break;
      case 'coStart': startCoords(); break;
      case 'undoBtn': takeback(); break;
      case 'hintBtn': showHint(); break;
      case 'threatBtn': showThreats(); break;
      case 'reviewBtn': toAnalyse(); break;
      case 'reviewRun': runReview(); break;
      case 'clearBtn': resetGame(); render(); startLive(); break;
      case 'importBtn': S.importDraft = $('#importBox').value; loadImport(S.importDraft); break;
      case 'backCourses': resetGame(); S.course = null; render(); break;
      case 'drillAgain': startCourse(S.course); break;
      case 'playFrom': playFromHere(); break;
    }
  });
  panel.addEventListener('input', function (e) {
    if (e.target.id === 'importBox') { S.importDraft = e.target.value; return; }
    if (e.target.id !== 'impUser') return;
    var v = e.target.value.trim(), enc = encodeURIComponent(v || 'USERNAME');
    store.set('username', v);
    $('#lnkLichess').href = 'https://lichess.org/api/games/user/' + enc + '?max=10&evals=false&clocks=false';
    $('#lnkChesscom').href = 'https://www.chess.com/games/archive/' + enc;
  });
  panel.addEventListener('change', function (e) {
    if (e.target.id === 'impFile' && e.target.files[0]) {
      var fr = new FileReader();
      fr.onload = function () { loadImport(String(fr.result)); };
      fr.readAsText(e.target.files[0]);
      return;
    }
    if (e.target.id === 'rateToggle') { S.showRatings = e.target.checked; store.set('ratings', S.showRatings); render(); }
  });
  $('#panel').addEventListener('click', function (e) {
    var g = e.target.closest('#graph'); if (!g) return;
    var r = g.getBoundingClientRect(); goto(Math.round((e.clientX - r.left) / r.width * S.plies.length));
  });

  function toAnalyse() {
    var plies = S.plies, start = S.startFen;
    switchMode('analyse', true);
    S.gen++; S.startFen = start; S.plies = plies; rebuildGame(); S.view = 0; S.playing = false;
    render(); runReview();
  }

  function goto(v) {
    S.view = Math.max(0, Math.min(S.plies.length, v)); S.selected = null; S.hintArrow = null; S.threatMsg = null;
    render();
    if (S.mode === 'analyse') startLive();
    else evaluate(curFen()).then(function () { renderEval(); });
  }
  $('#navStart').onclick = function () { goto(0); };
  $('#navPrev').onclick = function () { goto(S.view - 1); };
  $('#navNext').onclick = function () { goto(S.view + 1); };
  $('#navEnd').onclick = function () { goto(S.plies.length); };
  $('#flipBtn').onclick = function () { S.orient = S.orient === 'w' ? 'b' : 'w'; render(); };
  window.addEventListener('keydown', function (e) {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || !$('#sheet').hidden) return;
    if (e.key === 'ArrowLeft') { goto(S.view - 1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { goto(S.view + 1); e.preventDefault(); }
    else if (e.key === 'f') $('#flipBtn').click();
  });

  // ---------- Modes ----------
  var modeState = {};
  function switchMode(m, fresh) {
    if (S.mode === m) return;
    modeState[S.mode] = { plies: S.plies, startFen: S.startFen, view: S.view, orient: S.orient, playing: S.playing, you: S.you, course: S.course, courseMistakes: S.courseMistakes, courseDone: S.courseDone, courseMsg: S.courseMsg, resigned: S.resigned, planCourse: S.planCourse };
    if (S.botJob) S.botJob.cancel();
    if (S.mode === 'play') clockPause();
    stopLive(); stopTrain();
    S.gen++; S.botThinking = false; S.selected = null; S.hintArrow = null; S.learnBusy = false; S.threatMsg = null;
    if (m === 'train') { T.view = 'menu'; fresh = true; }
    S.mode = m;
    document.querySelectorAll('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.mode === m); });
    var saved = fresh ? null : modeState[m];
    if (saved) {
      Object.keys(saved).forEach(function (k) { S[k] = saved[k]; });
      rebuildGame();
      S.plies.forEach(function (p) { if (!p.cls && m !== 'learn') rateMove(p, S.gen); });
    } else {
      S.startFen = START; S.plies = []; S.view = 0; S.playing = false; S.course = m === 'learn' ? null : S.course; S.resigned = false;
      if (m === 'learn') S.course = null;
      rebuildGame();
    }
    render();
    if (m === 'analyse') startLive();
    if (m === 'play' && S.playing) clockResume();
    if (m === 'play' && S.playing && !S.game.game_over() && S.game.turn() !== S.you) botTurn();
  }
  document.querySelector('.tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (b) switchMode(b.dataset.mode);
  });

  // ---------- Board & pieces settings ----------
  var BOARDS = [['green', 'Green', '#EBECD0', '#739552'], ['brown', 'Brown', '#F0D9B5', '#B58863'], ['blue', 'Blue', '#DEE3E6', '#8CA2AD'], ['purple', 'Purple', '#EFEFEF', '#8877B7'], ['walnut', 'Walnut', '#E3C9A1', '#865E3C'], ['slate', 'Slate', '#D9D9D6', '#7B7F86']];
  var pieceStyle = document.createElement('style');
  document.body.appendChild(pieceStyle);
  function setPieces(key) {
    var set = window.PIECE_SETS && PIECE_SETS[key];
    if (!set) { key = 'cburnett'; set = window.PIECE_SETS && PIECE_SETS[key]; }
    OPT.pieces = key;
    pieceStyle.textContent = set ? Object.keys(set.img).map(function (k) { return '.pc.' + k + '{background-image:url("' + set.img[k] + '")}'; }).join('\n') : '';
  }
  function setBoard(name) {
    OPT.board = name;
    document.documentElement.setAttribute('data-board', name);
  }
  function renderSettings() {
    var sets = window.PIECE_SETS || {};
    var h = '<div class="sheet-card" role="dialog" aria-modal="true" aria-labelledby="setTitle"><div class="spread"><h2 id="setTitle">Board &amp; pieces</h2><button class="ib" id="setClose" aria-label="Close">Done</button></div>';
    h += '<h3>Board</h3><div class="boardgrid">' + BOARDS.map(function (b) {
      return '<button data-board="' + b[0] + '" aria-pressed="' + (OPT.board === b[0]) + '"><span class="mini"><i style="background:' + b[2] + '"></i><i style="background:' + b[3] + '"></i><i style="background:' + b[3] + '"></i><i style="background:' + b[2] + '"></i></span>' + b[1] + '</button>';
    }).join('') + '</div>';
    h += '<h3>Pieces</h3><div class="setgrid">' + Object.keys(sets).map(function (k) {
      var st = sets[k];
      return '<button data-set="' + k + '" aria-pressed="' + (OPT.pieces === k) + '" title="' + esc(st.label + ' (' + st.license + ')') + '"><span class="pv" style="background-image:url(&quot;' + st.img.wn + '&quot;),url(&quot;' + st.img.bq + '&quot;)"></span>' + esc(st.label) + '</button>';
    }).join('') + '</div>';
    h += '<h3>Options</h3><div class="opts">' +
      '<label class="toggle" for="optSound">Move sounds<input type="checkbox" id="optSound"' + (OPT.sound ? ' checked' : '') + '></label>' +
      '<label class="toggle" for="optLegal">Show legal moves<input type="checkbox" id="optLegal"' + (OPT.legal ? ' checked' : '') + '></label>' +
      '<label class="toggle" for="optCoords">Show coordinates<input type="checkbox" id="optCoords"' + (OPT.coords ? ' checked' : '') + '></label></div>';
    h += '<p class="status">Piece sets come from lichess.org; hover a set to see its license.</p></div>';
    $('#sheet').innerHTML = h;
  }
  function openSettings() { renderSettings(); $('#sheet').hidden = false; $('#setClose').focus(); }
  function closeSettings() { $('#sheet').hidden = true; $('#settingsBtn').focus(); }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#sheet').addEventListener('click', function (e) {
    if (e.target.id === 'sheet' || e.target.closest('#setClose')) { closeSettings(); return; }
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.board) setBoard(b.dataset.board);
    if (b.dataset.set) setPieces(b.dataset.set);
    saveOpt(); renderSettings(); renderBoard();
  });
  $('#sheet').addEventListener('change', function (e) {
    if (e.target.id === 'optSound') OPT.sound = e.target.checked;
    if (e.target.id === 'optLegal') OPT.legal = e.target.checked;
    if (e.target.id === 'optCoords') OPT.coords = e.target.checked;
    saveOpt(); renderBoard();
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#sheet').hidden) closeSettings(); });
  setBoard(OPT.board);
  setPieces(OPT.pieces);

  // Opening view: a sample position so the board isn't empty.
  evaluate(START).then(function () { renderEval(); });
  render();
})();
