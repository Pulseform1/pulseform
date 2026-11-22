# Pulsebox Educational Games

Twenty small 2D learning games. Each is one page in `public/games/` (`learn-<id>.html`), plus the category page
`public/games/learn.html`. They are built from this folder by `python3 tools/build-learn.py [id ...]` and checked in a
real browser by `node tools/learn-check.mjs [id ...]` (`SHOTS=dir` also saves screenshots).

Shared, written once and put into every page by the build:
- `edu.css`: the look (dark Pulsebox base, the game's accent colours `--c` and `--c2`), buttons, HUD, answer buttons, end card.
- `catalog.js`: every game's title, subject, colours, icon, what it teaches (`CATALOG`, `SUBJECTS`).
- `edu.js`: the framework (`Edu`). It draws the start screen, the HUD and the end screen, keeps best scores, and runs the game.
- `data/<name>.js`: shared facts (a game asks for them with a line `// @data name` anywhere in its file).

`hub.js` and `hub.css` are the category page.

## Writing a game: `games/<id>.js`

```js
(() => {
  const { h, rnd, pick, shuffle, sample, near, clamp, gcd, sfx } = Edu;
  Edu.game({
    id: 'my-game',                                  // must be in catalog.js
    levels: [{ name: 'Easy', desc: '...' }, { name: 'Medium', desc: '...' }, { name: 'Hard', desc: '...' }],
    how: ['How to play, one line each.', '...'],
    start(c) { /* build the round in c.el for c.level (0, 1, 2 ...) */ },
    bot(c) { /* make ONE correct move (the checks call it until the round ends) */ },
    miss(c) { /* optional: make one wrong move */ },
    stop(c) { /* optional: clean up anything not made through c */ }
  });
})();
```

`c` (one per round; everything made through it stops when the round ends, restarts or goes to the menu):
- `c.el` the play area (a flex column, centred). `c.level`, `c.L` (the level object), `c.alive`, `c.score`.
- `c.right(points, x, y)` a correct answer: adds points with a streak bonus (+50% every 3 in a row), sound, green flash,
  floating "+n" at (x, y) inside `c.el`. `c.wrong(x, y, text)` a wrong one: streak reset, sound, red flash.
  `c.add(n, x, y)` plain points. Correct/wrong counts, accuracy and best streak go on the end screen by themselves.
- `c.hud({ label: value, ... })` extra HUD chips (null removes one). `c.lives(n)`, `c.lose()` returns lives left.
- `c.timer(seconds, onEnd)` a countdown bar; returns `{ left(), add(s), set(s), paused }`.
- `c.after(ms, fn)`, `c.every(ms, fn)`, `c.loop((dt, t) => ...)` (requestAnimationFrame, dt in seconds),
  `c.on(target, event, fn)`, `c.key(e => ...)` (keydown, not while typing in an input unless it has `data-own="1"`).
- `c.choices(parent, items, (i, button) => ..., { cols })` big answer buttons (text or DOM nodes), keys 1-9 pick them.
  Returns `{ el, btns, lock(), unlock(), mark(i, ok) }`.
- `c.canvas()` a sharp canvas filling the stage: `{ cv, g, w, h, fit(), xy(event) -> [x, y], onfit }`. Draw in CSS pixels.
- `c.pop(text, x, y, colour)` floating text; `Edu.confetti()`; `Edu.sfx.good() / bad() / click() / pop() / win()`.
- `c.end({ won, title, msg, stats: { label: value }, learnt: ['fact', ...], emoji })` ends the round and shows the end card
  (score, best for this level, stats, Next level if won, Play again, Menu).

Helpers: `Edu.h(tag, props, ...children)` builds DOM (`class`, `text`, `html`, `style: {}`, `onclick`, `--var`),
`rnd(a, b)` integer inclusive, `pick`, `shuffle`, `sample(arr, n)`, `near(answer, n, spread, ok)` wrong answers near a
number, `gcd`, `clamp`, `Edu.store.get/set(key)` (localStorage under `pbx-learn-`).

Rules: 2D only, no image/audio/font files, no libraries. Draw with DOM/CSS, inline SVG or canvas. Mouse, keyboard and touch
all work. Phone screens (390 px wide) fit without sideways scrolling. Facts must be correct. Keep a game file small
(aim for well under 30 KB). The page passes `node tools/learn-check.mjs <id>`.
