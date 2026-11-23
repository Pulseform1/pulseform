# AWAKEN UI revamp: final build spec ("Inside the System", v1)

Owner: design lead. Target: `/home/user/pulseform/awaken/index.html` (one file, vanilla HTML/CSS/JS) plus new art in `sprites.js`.
User request this serves: **keep adding the sprites, and revamp the UI.**

## 0. Decisions

**Base:** Proposal 1, "Inside the System" (judge score 29). It builds on the System identity and gives every sprite a lit stage at whole-number scale.

**Grafted in:**

| From | Idea | Why |
|---|---|---|
| P2 | Rename the **battle particle** `.pts` to `.fx-pts`. Scope `.big` to `.ntf .big`. | This fixes the Status points row, including the reduced-motion `display:none` bug, and stops `.big` leaking into `.portal.big`. |
| P2 | Battle fits above the fold, with a sticky action panel. | In 4-battle.png the stepper and "Done · Strike" are below the fold. |
| P2 | Spacing and type scale tokens, 12px floor, 44px touch-target sweep. | Hard constraints. |
| P2 | Gate sheet order: hero, rewards, waves. Fix `.w-foe` with grid/flex. Sticky CTA on sheets. | Visible defects in 3-gate-sheet.png. |
| P2 | Featured first gate card, MP meter in "Gates Detected", Recover compaction, Records hero tiles, empty states with an action. | Clarity wins that keep the System look. |
| P2 | Fix the capture script before taking any after-shots. | Most "before" tab shots show the Awaken screen on top. |
| P3 | Diff-keyed reward engine: `data-k` fills from `--p0` with a gain ghost, and `data-cu` count-ups. Skipped under reduced motion and `navigator.webdriver`. | It is the only animation model that survives `refresh()` rebuilding innerHTML. |
| P3 | `.rf` rarity frame on `--rank-*`, merged with P1's `--rk` tone into **one** rank system. Integer sprite scales only. | Gives a consistent loot slot for items, gear, shadows and rewards. |
| P3 | Loot reveal after the typewriter, 400ms confirm guard, skill-unlock progress, weekly/monthly ready state, shop affordability bar, shadow completion ring, streak flame and freeze pips. | Payoff moments. |

**Dropped:**
- P2: the "System Directive" dock (looks generic, duplicates `data-a`), sentence-case tabs as the default, flat/no-glow windows, deleting `.quick`, and hiding skills or totals behind `<details>`.
- P1: hiding inactive tab labels below 380px, a taller battle stage, the full hunter strip as an extra row (it merges into the existing summon row), hex lattice, drifting motes, `mix-blend-mode` scan lines, the onboarding glyph-scramble and rune circles, and the rotating portal rim.
- P3: `flyTo` coin flights, tap ripples, infinite sheens and rotating A/S borders, 3-column inventory grids, `title`-only descriptions, and `transition` on custom properties. `transition` cannot fire on elements rebuilt by innerHTML; use keyframes from `--p0`/`--from`.

**Non-negotiables, checked in section 8:**
- Every `data-a`, `data-x` and `data-c` stays.
- These classes stay: `.scr-gate .goal .side-q .tab .win .sheet .ntf .lv .xpbar .coin .gate .portal .waves .burn .burn-t .toast .dmg .pts` (the Status row keeps `.pts`), `.summon-b`, `.rewards`.
- `#top` must contain **no `<img>`**, because tests/core.test.js:37 checks this. Any sprite in `#top` is a CSS `background-image`.
- The six skins keep driving the chrome through `--line`/`--glow`. `--rk` only adds rank meaning.
- `prefers-reduced-motion` is honoured.

---

## 1. Phase P0: before any visual work (half a day)

1. **Capture script** (`scratchpad/ui/tour.js`): in the seeding `p.evaluate`, add `UI.screen = null;` before `saveNow(); refresh();`. Also assert `!document.querySelector('.scr-awaken')` before each tab shot. Re-take the `before/` set so the after-shots compare fairly. Separately, check that the app clears `UI.screen` when `S.awakened` becomes true on a load or import. If it does not, fix that in `importText`/load (one line).
2. **`.pts` collision** (CSS line 197 vs 386, reduced motion line 552):
   - CSS line 386 `.pts{position:absolute…}` becomes `.fx-pts{…}`. Line 388 `.pts.big .pt` becomes `.fx-pts.big .pt`. Line 552: `.pts` becomes `.fx-pts` in the `display:none` list.
   - In `battleWin`, `<div class="pts">${parts(…)}</div>` becomes `class="fx-pts"`. In the defeat overlay, `pts big` becomes `fx-pts big`.
   - The Status `<div class="pts">` in `vStatus` is **unchanged**.
3. **`.big` leak:** line 501 `.big{…}` becomes `.ntf .big{…}`.
4. **Grep the tests** for any changed selector (`.pts`, `.combo`, `.wpips`, `.hp-n`, `.boss-n`, `.quick`) before you start. Today none are queried; keep it that way.

---

## 2. Global tokens (P1)

Add these to the first `:root{}` block. Tokens that derive from `--line` or `--rk` **must be redeclared on every scope that can change their source**. This is the same rule as `--line-a/b/c` on line 57. A `var()` inside a custom property resolves where it is declared, not where it is used.

```css
:root{
  /* spacing */
  --s1:4px;--s2:8px;--s3:12px;--s4:16px;--s5:24px;--s6:32px;
  /* type scale: nothing renders below --t-cap */
  --t-cap:12px;--t-sm:14px;--t-md:16px;--t-lg:18px;--t-xl:22px;--t-num:28px;--t-hero:44px;
  /* radii: the System is sharp */
  --r1:2px;--r2:3px;--r-pill:999px;
  /* motion */
  --ease-sys:cubic-bezier(.2,.9,.25,1);--ease-pop:cubic-bezier(.2,1.6,.4,1);
  --t-fast:.12s;--t-mid:.24s;--t-win:.42s;--t-fill:.6s;
  /* rank tone default = skin colour */
  --rk:var(--line);
  /* hunter bars */
  --hp1:#d32b47;--hp2:var(--red);
}
/* derived tints: extend the existing line-57 rule */
:root,.tone-red,.tone-ok,.tone-violet{
  --line-a:color-mix(in srgb,var(--line) 72%,transparent);
  --line-b:color-mix(in srgb,var(--line) 30%,transparent);
  --line-c:color-mix(in srgb,var(--line) 12%,transparent);
  --glow-1:0 0 8px var(--line-b);--glow-2:0 0 16px var(--line-b);--glow-3:0 0 24px var(--line-b);
}
/* rank tone (one system for HUD, gates, battle, gear, items, shadows, rewards) */
.rk-tone-E{--rk:var(--rank-e)}.rk-tone-D{--rk:var(--rank-d)}.rk-tone-C{--rk:var(--rank-c)}
.rk-tone-B{--rk:var(--rank-b)}.rk-tone-A{--rk:var(--rank-a)}.rk-tone-S{--rk:var(--rank-s)}
.rk-tone-X{--rk:var(--red)}  /* red gate / boss wave */
:root,[class*="rk-tone-"]{
  --rk-a:color-mix(in srgb,var(--rk) 60%,transparent);
  --rk-b:color-mix(in srgb,var(--rk) 30%,transparent);
  --rk-c:color-mix(in srgb,var(--rk) 12%,transparent);
}
```

If `.tone-violet` does not exist yet, add `.tone-violet{--line:var(--violet);--glow:#d6c6ff}`. Use it for summon buttons and the shadow army.

Helpers:
- `.num{font-variant-numeric:tabular-nums lining-nums}`
- `.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`

Rank colour against `--deep #06142a` is at least 6:1 for every rank. Still, **`--rk` is never used for body copy.** Allowed uses: borders, glows, fills, the rank letter in `.rk` chips (700 weight, 12px+), and 18px+ numbers. All other text stays `--ink` or `--dim`.

### 2.1 Type remap (P1, mandatory)
Any size below 12px becomes 12px, with letter-spacing ≤ .14em:

| Selector | Change |
|---|---|
| `.lv small` (9px) | 12px |
| `.tag` (10px) | 12px, letter-spacing `.08em` |
| `.tab` (10px, 9px at ≤360) | 12px (see 3.3) |
| `.eyebrow` (11px) | 12px, `.16em` |
| `.cal-d`, `.chart .ch-ax`, `.legend`, `.streak-n span` (10px) | 12px |
| `.run-stats small` (10.5px) | 12px |
| `.sh small`, `.ladder li`, `.seal small` (11px) | 12px |
| `.tri button` (11.5px) | 12px |

Snap odd sizes to the nearest token: 12.5 and 13 → 12 or 14, 13.5 → 14, 14.5 → 14, 15.5 → 16. The only exceptions are display numbers (`.timer`, `.stepper output`, `.run-d b`). Remove the `@media (max-width:360px){.tab{font-size:9px…}}` override.

### 2.2 Touch targets (P1, mandatory)
- `.btn.sm`: 38 → **44px** min-height, min-width 72px.
- `.chip`: 38 → 44px.
- `.icon-btn`: 42 → 44px.
- `.seg-b`: 42 → 44px.
- `.tri button`: min-height 44, min-width 56 (48 at ≤360px).
- `.plus`: keeps its 30px look (32px in the new Status) but gets a 44px hit area with `.plus{position:relative}.plus::after{content:"";position:absolute;inset:-7px}`.
- `.link` inside notes: `padding:10px 0;margin:-10px 0`.
- The Awaken "Load your cloud save" link: min-height 44px.
- The adapt chip in Recover: min-height 44px.

### 2.3 Opacity → colour (P1, AA)
Replace whole-element opacity on text with colour:
- `.sh:not(.got)`: `opacity:1;color:var(--dim);border-color:var(--line-c)`. Only `.sh-spr` gets `filter:brightness(.35)`.
- `.ladder li.past`: `color:var(--dim)`.
- `.pq.claimed`: `color:var(--dim)`, and the bar turns `--ok`.
- Disabled `.btn[disabled]`: `color:var(--dim);border-color:var(--line-c);background:none`. No opacity below .7.

---

## 3. Components

### 3.1 System window chrome v2 (P1)

**Injection.** Add `chrome(root)` and call it at the end of `refresh()`, after `renderSheet()/renderScreen()`, and at the end of the notification render:

```js
function chrome(root=document){root.querySelectorAll('.win').forEach(w=>{if(!w.querySelector(':scope>.win-fx'))w.insertAdjacentHTML('afterbegin','<span class="win-fx" aria-hidden="true"></span>')})}
```

This one place reaches every window, including sheets (`.sheet` is a `.win`), screens, battle and notifications. Leave `winHead()` as is.

**Brackets on all four corners.** The existing `.win::before` (top-left) and `::after` (bottom-right) stay. `.win-fx` paints the top-right and bottom-left corners:

```css
.win-fx{position:absolute;inset:-2px;pointer-events:none;border-radius:inherit;overflow:hidden;z-index:0;
  background:
   linear-gradient(var(--glow),var(--glow)) right top/14px 2px no-repeat,
   linear-gradient(var(--glow),var(--glow)) right top/2px 14px no-repeat,
   linear-gradient(var(--glow),var(--glow)) left bottom/14px 2px no-repeat,
   linear-gradient(var(--glow),var(--glow)) left bottom/2px 14px no-repeat;
  filter:drop-shadow(0 0 4px var(--line))}
/* static scan texture: a background paint, no blend mode */
.win-fx::before{content:"";position:absolute;inset:2px;background:repeating-linear-gradient(0deg,transparent 0 3px,color-mix(in srgb,var(--line) 4%,transparent) 3px 4px)}
.win>*:not(.win-fx){position:relative;z-index:1}
```

Check that `.win>*` positioning does not break absolutely positioned children such as `.foe-stage` internals, `.stamp` or `.wfx`. If it does, scope the `z-index` rule to `.win>:is(h2,h3,p,ul,ol,div,section,button,label)` and exclude `.wfx,.dfx,.stamp`.

**Moving sweep.** Only on the first window of a view, `.ntf` and `.foe-win`. It is compositor-only (transform):

```css
.view>.win:first-child .win-fx::after,.ntf .win-fx::after,.foe-win .win-fx::after{
  content:"";position:absolute;left:2px;right:2px;top:0;height:40%;
  background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--glow) 8%,transparent) 50%,transparent);
  transform:translateY(-100%);will-change:transform;
  animation:scan 9s linear infinite;animation-delay:var(--scan-d,0s)}
.ntf .win-fx::after{animation:scan 1.2s var(--ease-sys) 1}
@keyframes scan{to{transform:translateY(260%)}}
body.bg-hidden .win-fx::after{animation-play-state:paused}
```

In `refresh()`, set the phase so re-renders do not restart the sweep:

```js
const d=`-${Date.now()%9000}ms`;$('#view').style.setProperty('--scan-d',d);$('#screen').style.setProperty('--scan-d',d)
```

Add `document.addEventListener('visibilitychange',()=>document.body.classList.toggle('bg-hidden',document.hidden))`.

**Title plate.** Hairline rules with an inner diamond, so the header reads `──◆ [ QUEST INFO ] ◆──`:

```css
.win-head::before,.win-head::after{content:"";flex:1 1 0;min-width:0;max-width:56px;height:5px;
  background:linear-gradient(var(--line-a),var(--line-a)) left 50%/calc(100% - 7px) 1px no-repeat,
             linear-gradient(45deg,transparent 30%,var(--glow) 30% 70%,transparent 70%) right center/5px 5px no-repeat}
.win-head::after{transform:scaleX(-1)}
```

**Material.** Append `inset 0 1px 0 color-mix(in srgb,var(--glow) 18%,transparent)` to `.win` box-shadow.

**Performance.** `body.locked #app .win{-webkit-backdrop-filter:none;backdrop-filter:none}`. Windows behind an open sheet or screen do not need blur.

### 3.2 Hunter Card HUD (top bar, P1)

Keep `#top`, `.lv` (still `<button data-a="tab" data-x="status">`), `.who`, `.who-n`, `.rk`, `.nm`, `.xpbar`, `.coin` and `.icon-btn`.

Markup from `renderTop()`:

```html
<header id="top" class="top hud rk-tone-${R.id}${weakened()?' weak':''}">
<button class="lv hud-port" data-a="tab" data-x="status" style="--xp:${xp/need}"
        aria-label="Level ${lv}, ${pct}% to level ${lv+1}. Open status">
  <span class="hud-ring" aria-hidden="true"></span>
  ${face ? `<i class="hud-face" style="background-image:url('${face}')"></i>` : `<b class="hud-init">${esc(name[0]||'?')}</b>`}
  <b class="hud-lv num">${lv}</b>
</button>
<div class="who">
  <div class="who-n"><span class="rk rk-${R.id}">${R.id}</span><span class="nm">${esc(name)}</span>${tag?`<span class="tag ${tone} hud-tag">${tag}</span>`:''}</div>
  <div class="hud-bars">
    <div class="hb hp" role="meter" aria-label="HP" aria-valuemin="0" aria-valuemax="${maxHP()}" aria-valuenow="${p.hp}" style="--v:${p.hp/maxHP()}"><span>HP</span><i data-k="hud-hp"></i></div>
    <div class="hb mp" role="meter" aria-label="MP" aria-valuemin="0" aria-valuemax="${maxMP()}" aria-valuenow="${p.mp}" style="--v:${p.mp/maxMP()}"><span>MP</span><i data-k="hud-mp"></i></div>
  </div>
</div>
<div class="coin" aria-label="${fmt(gold)} gold">${ico('coin')}<b class="num" data-cu="gold">${fmt(gold)}</b></div>
<button class="icon-btn" data-a="settings" aria-label="Settings">${ico('gear')}</button>
<div class="xpbar" role="progressbar" …existing aria…><i data-k="xp" style="width:${pct}%"></i></div>
```

`face = sprURL('hunter', S.settings.skin==='shadow'?'shadow':'')`. It is a data URL drawn on canvas from our own palette, so it is safe in `style`. **No `<img>` in `#top`.**

```css
.top{min-height:72px;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 0 14px}
.top::after{content:"";position:absolute;left:-16px;right:-16px;bottom:8px;height:1px;background:linear-gradient(90deg,transparent,var(--line-a) 18%,var(--line-a) 82%,transparent)}
.lv.hud-port{position:relative;width:56px;height:56px;padding:0;border:0;border-radius:50%;
  background:radial-gradient(circle at 50% 38%,var(--rk-b),var(--void) 70%);box-shadow:0 0 16px var(--rk-b)}
.hud-ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--rk) calc(var(--xp)*1turn),var(--line-c) 0);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3.5px));mask:radial-gradient(farthest-side,transparent calc(100% - 4px),#000 calc(100% - 3.5px));
  filter:drop-shadow(0 0 4px var(--rk))}
.hud-face{position:absolute;left:4px;top:4px;width:48px;height:48px;border-radius:50%;background-size:48px 48px;image-rendering:pixelated}
.hud-init{font:700 22px/1 var(--f-disp);color:var(--ink)}
.hud-lv{position:absolute;right:-6px;bottom:-4px;min-width:28px;height:22px;padding:0 5px;display:grid;place-items:center;background:var(--void);border:1px solid var(--rk);color:var(--ink);font:700 14px/1 var(--f-disp)}
.hud-bars{display:grid;gap:4px;margin-top:6px}
.hb{display:grid;grid-template-columns:22px 1fr;gap:6px;align-items:center;font:700 12px/1 var(--f-disp);letter-spacing:.06em}
.hb span{color:var(--dim)} .hb.hp span{color:var(--red-glow)} .hb.mp span{color:var(--glow)}
.hb i{position:relative;height:6px;background:var(--line-c);overflow:hidden}
.hb i::before{content:"";position:absolute;inset:0;transform-origin:left;transform:scaleX(var(--v));background:linear-gradient(90deg,var(--c1),var(--c2));animation:fill var(--t-fill) var(--ease-sys) both}
.hb i::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(10% - 1px),rgba(3,6,13,.85) calc(10% - 1px) 10%)}
.hb.hp{--c1:var(--hp1);--c2:var(--hp2)} .hb.mp{--c1:var(--line);--c2:var(--glow)}
.hud .xpbar{position:absolute;left:0;right:0;bottom:6px;height:3px}
.hud.weak .hb.hp i{animation:weak 1.6s ease-in-out infinite}  @keyframes weak{50%{box-shadow:0 0 10px var(--red)}}
@media (max-width:359px){.hud-tag{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)} .hud.weak .hb.hp span::after{content:"!"}}
```

The `.lv` small "LV" label goes, because the chip shows the number. Width at 320px is about 288 = 56 + 10 + who (about 107) + 10 + coin (about 61) + 10 + 44.

### 3.3 Tab dock (P1)

Keep `.tab`, `data-a="tab"`, `data-x`, `.on`, `aria-current`, and the six tabs in this order. In `renderTabs()`:
- Wrap the label in `<span class="tab-l">${l}</span>`.
- Add `rk-tone-${rankOf().id}` to the gates tab.
- Use a count pill for gates.

```css
.tabs{background:color-mix(in srgb,var(--void) 90%,transparent);border-top:0}
.tabs::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,var(--line-a) 15%,var(--line-a) 85%,transparent)}
.tab{min-height:56px;gap:4px;font:600 12px/1 var(--f-disp);letter-spacing:.02em;text-transform:uppercase}
.tab .i{position:relative;width:24px;height:24px}
.tab.on .i::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:28px;margin:-14px 0 0 -22px;z-index:-1;background:var(--line-b);
  clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,8px 100%,0 50%)}
.tab.on::before{left:30%;right:30%}  /* keep the existing top glow bar */
@media (max-width:359px){.tab{letter-spacing:0;text-transform:none}}  /* only fallback that guarantees fit at 320 */
/* raised Gates portal */
.tab[data-x=gates] .i{width:48px;height:48px;margin-top:-18px;display:grid;place-items:center;border-radius:50%;
  border:1.5px solid var(--rk);background:radial-gradient(circle,var(--rk-b),var(--void) 72%);box-shadow:0 0 14px var(--rk-b)}
.tab[data-x=gates].on .i::before{display:none} .tab[data-x=gates].on .i{box-shadow:0 0 22px var(--rk-a)}
/* attention markers */
.tab .dot{width:8px;height:8px;border-radius:0;transform:rotate(45deg);outline:1px solid var(--void)}
.tab .cnt{position:absolute;top:-14px;left:calc(50% + 12px);min-width:18px;height:18px;padding:0 4px;border-radius:var(--r-pill);
  background:var(--gold);color:var(--void);font:700 12px/18px var(--f-disp);text-align:center}
```

The gates count is the number of open gates in `S.gates.list`. Show it only when it is above 0. It replaces the `.dot` for gates, and the trial still shows as the dot.

The portal rim is static: no rotation.

**Fit rule:** at 320px every `.tab-l` must have `scrollWidth ≤ clientWidth`. See the checklist.

### 3.4 Buttons (P1)
- `.btn:active{transform:scale(.97)}` over `var(--t-fast)`, replacing `translateY(1px)`.
- `.btn.pri` gets an extra `inset 0 1px 0 rgba(255,255,255,.45)`, plus two 6px bracket corners: `.btn.pri::before` (top-left) and `::after` (bottom-right), border 2px `var(--ink)`, offset -3px. **No `clip-path` on buttons**, because it clips the glow.
- `.btn.violet` (= `.tone-violet` styling) is for Summon.
- Cost chip: `<span class="cost">5 MP</span>` with `font:700 12px/1 var(--f-disp);padding:3px 6px;border:1px solid currentColor;border-radius:var(--r1)`.

### 3.5 Bars and rings (P1 base, P2 engine)

**Bar sizes** (the existing `.bar`/`.xpbar` stay):
- `.bar.xs` 3px, `.bar.sm` 4px, `.bar.md` 6px, `.bar.lg` 10px, `.hpbar` 18px.
- Optional `.bar.ticks::after` gives 10% ticks. `.bar.q` gives 25/50/75% ticks.
- Every fill gets a leading glint: `i::after{content:"";position:absolute;right:0;top:-2px;bottom:-2px;width:2px;background:#fff;box-shadow:0 0 8px var(--glow)}`. Hide it when the value is 0.

**Ring** `.ring` uses `style="--v:.42;--sz:120px"`. It is the same conic-plus-mask technique as `.hud-ring`, at 4px thickness (6px at 120px and above). Uses:
- HUD (56)
- Status hero (152)
- level-up notification (120)
- shadow army completion (56, violet)

**Reward engine (P2).** About 30 lines, run from `afterRender()` at the end of `refresh()` and of the notification render:
- `UI.prev={}`.
- For each `[data-k]`:
  - Read the target value `v`: from `--v`/`--p` on itself or its parent, or the `width` percentage for legacy bars.
  - If `UI.prev[k]` exists and differs from `v`, set `style.setProperty('--p0',prev)` and add `.grew` if it went up, `.fell` if it went down.
  - Store `UI.prev[k]=v`.
- CSS: `@keyframes fill{from{transform:scaleX(var(--p0,var(--v)))}}`. For width-based bars, `@keyframes fillw{from{width:calc(var(--p0)*100%)}}`.
- Gain ghost: `.grew>.gain{position:absolute;top:0;bottom:0;left:calc(var(--p0)*100%);width:calc((var(--v) - var(--p0))*100%);background:#fff;opacity:0;animation:gain 1.1s ease-out}`, with `@keyframes gain{0%,30%{opacity:.85}to{opacity:0}}`. Inject the `<b class="gain">` from JS only when `.grew`.
- Loss lag (HP): `.fell>.lag` is white at 55%, from `--p0` to `--v`, width shrinking after a .25s delay over .5s.
- For each `[data-cu]`: if the numeric value changed, call `countUp(el,from,to,700)`, using rAF and easeOutCubic, writing `fmt()`, then add `.bump` (`@keyframes bump{40%{transform:scale(1.18);text-shadow:0 0 16px var(--glow)}}`, .35s `--ease-pop`).
- **Skip all of it** (write final values, no classes) on first render, when `reduceMotion`, or when `navigator.webdriver`.
- The HTML always contains the final number, and aria attributes always hold final values.

Keys to assign:
- `xp`, `hud-hp`, `hud-mp`, `gold`
- `g-${id}` (goals), `pq-${kind}-${i}`, `st-${stat}`
- `foe-hp` (battle; key it per wave: `foe-hp-${w}`)
- `army`, `streak`, totals

### 3.6 Rarity frame `.rf` (P1, needed by gear, items, shadows, rewards and battle)

A frame reads `--rk` from `.rk-tone-*` on itself. For pixel art, the inner sprite size must be an **integer multiple** of the art size. Item and gear art is 16px. Enemy, shadow and hunter-full art is 32px. The hunter bust is 24px.

```css
.rf{position:relative;display:grid;place-items:center;flex:none;width:var(--fs,56px);height:var(--fs,56px);border-radius:var(--r2);
  border:1px solid var(--rk-a);
  background:radial-gradient(70% 70% at 50% 38%,var(--rk-b),transparent 72%),color-mix(in srgb,var(--deep) 88%,transparent);
  box-shadow:inset 0 0 0 1px var(--rk-c),inset 0 -12px 18px -10px var(--rk-a)}
.rf::before{content:"";position:absolute;left:-2px;top:-2px;width:8px;height:8px;border:2px solid var(--rk);border-right:0;border-bottom:0}
.rf .spr{width:var(--ss,48px);height:var(--ss,48px);image-rendering:pixelated}
.rf .i{width:24px;height:24px;color:var(--glow)}            /* ico() fallback */
.rf.s40{--fs:40px;--ss:32px}.rf.s56{--fs:56px;--ss:48px}.rf.s72{--fs:72px;--ss:48px}.rf.s80{--fs:80px;--ss:64px}.rf.s96{--fs:96px;--ss:64px}
.rf.big32.s72{--ss:64px}  /* 32px art in a 72 frame */
/* static tiers: no infinite animation */
.rk-tone-C.rf{box-shadow:inset 0 0 0 1px var(--rk-c),inset 0 -12px 18px -10px var(--rk-a),0 0 10px var(--rk-b)}
.rk-tone-B.rf{box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 25%,transparent),inset 0 -12px 18px -10px var(--rk-a),0 0 10px var(--rk-b)}
.rk-tone-A.rf,.rk-tone-S.rf{outline:1px solid var(--rk-b);outline-offset:2px;box-shadow:inset 0 -12px 18px -10px var(--rk-a),0 0 14px var(--rk-b)}
.rk-tone-S.rf::after{content:"";position:absolute;left:50%;bottom:-4px;width:7px;height:7px;margin-left:-3.5px;transform:rotate(45deg);background:var(--rank-s);box-shadow:0 0 6px var(--rank-s)}
.rf.new{animation:rf-new .9s var(--ease-sys) 1}  @keyframes rf-new{0%{filter:brightness(2.5)}100%{filter:none}}
.rf .cnt{position:absolute;right:-6px;bottom:-6px;min-width:22px;height:20px;padding:0 4px;background:var(--void);border:1px solid var(--rk-a);font:700 12px/18px var(--f-disp);text-align:center}
.rf .rk-corner{position:absolute;left:-6px;top:-6px}
```

Helper: `slot(spriteId, rankIdx, size, {variant, icon, count})` returns `<div class="rf s${size} rk-tone-${RANKS[r].id}">${sprImg(id,'',variant)||ico(icon)}${count!=null?`<span class="cnt num">×${count}</span>`:''}</div>`. Items with no rank use `E`.

### 3.7 Sheets (P1)
- `.sheet` gets a decorative drag handle: `.sheet::before` is 36x4, `--line-b`, centred 8px from the top. It replaces the existing top-left bracket on sheets. Keep the `::after` bottom-right bracket hidden on sheets.
- Window chrome comes from `chrome()`.
- **Sticky CTA:**
  - Applies to the last `.row2` or `.btn.block` that is a direct child of `.sheet`, plus explicit `.sheet-cta`. Add `class="sheet-cta"` in SHEETS.gate, rec, task, pen and summon.
  - CSS: `position:sticky;bottom:calc(-20px - env(safe-area-inset-bottom,0px));z-index:3;margin:14px -18px calc(-20px - env(safe-area-inset-bottom,0px));padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--deep) 28%)`.
  - Verify there is no double safe-area padding on iOS.

### 3.8 Notifications (P2)
Keep `.ntf`, `role=alertdialog`, the typewriter, `data-a=ntfOk`, `data-a=ntfSkip` and the `notify()` data shape. Add `kind-${n.kind}` to `.win.ntf`.

1. **Open.** The existing `unfold`, plus a 1-frame border flash: `@keyframes ntf-flash{0%{box-shadow:0 0 0 1px #fff,0 0 40px var(--glow)}}` at .5s. The scan sweep runs once over 1.2s. The `!` icon box blinks twice: `steps(2)` opacity over .4s, 2 iterations.
2. **Loot rows.** `.rewards` stays as a `<ul>`, and gets class `loot`. Each `li`:
   - `<span class="lk">${slot}</span><span class="ll">${label}</span><b class="lv-v num">${value}</b>`, with `display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;min-height:44px`.
   - The slot is `.rf.s40`:
     - If the reward has a sprite (`sp`), show it at 32px.
     - Otherwise use an icon from the label: XP → `ico('star')` or the closest existing XP glyph in ICONS; Gold → `ico('coin')` with `rk-tone-S`; Random Box → `ico('box')`; HP → heart or potion; anything else → `ico('shadow')`.
   - Value is 18px: gold for XP/gold, `--red-glow` when it starts with `−`, `--ink` otherwise.
   - Label is 14px `--dim`.
3. **Stagger.** Rows have `opacity:0` until `.ntf.done`, then `animation:rpop .4s var(--ease-pop) both;animation-delay:calc(var(--i)*80ms)`, with `style="--i:${i}"` on each li. `typewrite` completion and `twFinish` (skip) add `.done` to `.ntf`. Under reduced motion, `.done` is set immediately and rows are visible at once.
4. **Confirm guard.** `[data-a=ntfOk]` gets `.wait` (pointer-events none, `color:var(--dim)`) for 400ms after `.done`. Skip this under `navigator.webdriver`.
5. **Per kind:**
   - `kind-level`: `.big` sits inside `.ring` (120px, `--v` animates 0→1 over .9s through `@keyframes ring-fill`). If `@property --v` is unsupported the ring shows full, which is acceptable. Add a "LEVEL UP" kicker above it (12px, `.2em`, `--glow`).
   - `kind-quest` whose head is "Quest Complete" or "Full Discipline": a 26px `CLEAR` stamp (`.stamp` plus the `stampin` keyframe, `tone-ok`) after the last loot row.
   - `kind-penalty`: `tone-red` (as now) plus a 6px hazard band on top: `repeating-linear-gradient(-45deg,var(--red) 0 8px,transparent 8px 16px)`.
   - `.ntf-art .spr`: 120 → **128px** (4x) on a 120x20 floor ellipse in `--line-b`.
6. **CONFIRM** uses the `.btn.pri` brackets (3.4).

### 3.9 Toasts (P1)
- While a screen is open, dock toasts to the top as a strip that overlays only the screen's static title:
  ```css
  body.locked #toasts{top:calc(env(safe-area-inset-top,0px) + 6px)}
  body.locked .toast{width:100%;max-width:488px;text-align:left;padding:10px 14px;background:color-mix(in srgb,var(--deep) 97%,transparent);border-left:3px solid var(--glow)}
  ```
  `pointer-events:none` stays, so Retreat still works.
- **Gate entry:** replace `toast(g.trial?'The trial has begun.':'You have entered the gate.')` (line 1584) with `S.session.enteredAt=Date.now()`. `battleWin` then renders `<div class="bwarn sys" style="animation-delay:-${now-enteredAt}ms">${trial?'Trial begun':'Gate entered'}</div>` while `now-enteredAt<1600`. `.bwarn.sys` uses `--glow` instead of red.
- All other `toast()` calls are unchanged. A test asserts the personal-best toast text.

### 3.10 Empty states (P2)
- `.empty{display:grid;justify-items:center;gap:8px;padding:24px 12px;border:1px dashed var(--line-b);border-radius:var(--r2);text-align:center;font-size:14px;color:var(--dim)}`, with a 32px icon on top and an optional `.btn.sm.ghost`.
- Uses:
  - All gates cleared: keep the live `data-live="reset"` span, and add a "Start a run" button with `data-a="runOpen" data-x="gps"`.
  - No gear: "Visit the Shop" with `data-a="itemsTab" data-x="shop"`, if that action exists. Otherwise text only.
  - No shadows: "Defeat a gate boss, then choose Arise".
  - Empty log: "No messages yet".
- Use only **existing** `data-a` values.

---

## 4. Screens (priority order)

### 4.1 Battle: `SCREENS.gate` and `battleWin` (P1)
**Goal:** at 390x844 (and at 360x740) the stage, enemy HP, stepper and "Done · Strike" are all visible without scrolling.

1. **Stage** (inside `.foe-stage`, behind the sprite): `<i class="foe-rift"></i><i class="foe-floor"></i>`. Add `rk-tone-${R.id}` to `.foe-win`; boss waves use `rk-tone-X`.
   - `.foe-stage{height:200px;margin:4px -16px 0;background:radial-gradient(55% 50% at 50% 62%,var(--rk-b),transparent 72%)}`
   - `@media (max-height:760px){.foe-stage{height:168px}}`
   - `@media (min-height:900px){.foe-stage{height:232px}}`
   - `.foe-floor{position:absolute;left:-25%;right:-25%;bottom:0;height:46%;transform:perspective(240px) rotateX(60deg);transform-origin:50% 100%;background:repeating-linear-gradient(90deg,var(--rk-b) 0 1px,transparent 1px 32px),repeating-linear-gradient(0deg,var(--rk-b) 0 1px,transparent 1px 32px);-webkit-mask:linear-gradient(transparent,#000 35%,#000 70%,transparent);mask:linear-gradient(transparent,#000 35%,#000 70%,transparent)}`. This is static.
   - `.foe-rift{position:absolute;left:50%;top:6%;width:150px;height:190px;margin-left:-75px;border-radius:50%;background:conic-gradient(var(--rk),transparent 25%,var(--rk) 50%,transparent 75%,var(--rk));filter:blur(16px);opacity:.3;animation:rift 20s linear infinite;animation-delay:var(--scan-d)}` with `@keyframes rift{to{transform:rotate(1turn)}}`. Boss waves use opacity .45.
2. **Integer sprite scale:**
   - `.foe` 168 → **160px** (5x), `.foe.boss` 188 → **192px** (6x).
   - At `max-height:760px`: `.foe` **128px** (4x), boss **160px**.
   - `image-rendering:pixelated`.
   - `.foe-aura` becomes the contact shadow: width 70% of the sprite, `radial-gradient(closest-side,rgba(0,0,0,.55),transparent)` with a `--rk-b` rim.
3. **Top HUD strip** (`.boss-top`, kept): "WAVE 1 / 2" · pips (`.wpips`) · timer `#sess-el`, all 12px. It replaces nothing.
4. **Nameplate** replaces the standalone `h3.boss-n`. Keep the class on the name:

   ```html
   <div class="foe-plate"><span class="rk rk-${R.id}">${R.id}</span><b class="boss-n">${name}</b><span class="tag${boss?' red':''}">${boss?'Boss':'Minion'}</span></div>
   ```

   CSS: `display:flex;align-items:center;gap:8px;margin:8px 0`, with `.boss-n` at 20px and ellipsis.
5. **HP bar:**
   - 18px tall, with the numbers inside: `<span class="hp-n hp-in num">240 / 240</span>` (12px, `text-shadow:0 1px 0 #000`, right-aligned, padding 0 6px). Remove the `p.hp-n` line under the bar.
   - 10% tick overlay.
   - `<i data-k="foe-hp-${w}" style="width:${pct}%">` plus `<b class="lag">`, driven by the reward engine. A white chunk drains .25s after the red.
   - Remove the CSS `transition:width` (useless on rebuild).
   - `role=progressbar` and aria stay.
6. **Hunter skill row** replaces the summon row, with the same height budget, about 52px:

   ```html
   <div class="hunter-strip">${slot('hunter-full',rank,40,{icon:'shadow'})}<div class="hud-bars">…hp/mp .hb…</div>
     ${combo>=2?`<span class="combo num${hitNow?' pop':''}">×${combo}</span>`:''}
     ${summonBtn}</div>
   ```

   - `summonBtn` keeps `class="btn sm summon-b violet" data-a="summonOpen"` with `${ico('shadow')}Summon <span class="cost">5 MP</span>`. When MP is under 5 it is `disabled` with a 12px "Not enough MP" caption. The `.summoned` state text stays as is.
   - Strip CSS: `display:grid;grid-template-columns:40px 1fr auto auto;gap:10px;align-items:center;margin:12px -4px 0;padding:8px;border-top:1px solid var(--line-b)`.
   - `.combo` is no longer absolutely positioned. It previously collided with the wave label.
7. **Set window: sticky action panel.**
   - Wrap the stepper and the `setDone` row (and the timer `.row2` for timed sets) in `<div class="act">`.
   - `.scr-gate .act{position:sticky;bottom:0;z-index:3;margin:12px -16px -16px;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--deep) 24%)}`.
   - The "Done · Strike" button is `.btn.pri.xl` at 58px.
   - `.cue` gets `display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden`. Tapping `.cue` toggles `.open`, which removes the clamp. This is JS-only and has no `data-a`, so add a delegated listener on `.cue`.
   - `.ex-n` 30 → 26px.
8. **Missing sprite fallback** (`.foe-ph`): if `sprURL(foe.id)` is null, try `sprImg('riftling', cls, 'rk:'+rankHex)`. Only if that is also missing, show the ghost `ico('shadow')` inside a `.rf` silhouette with the caption "Unidentified" (12px `--dim`).
9. **Gate screen bg:** `.screen.scr-gate` gets `rk-tone-${R.id}`, and its top radial uses `--rk-b`.

### 4.2 Window chrome, HUD and tab dock
See 3.1–3.3. These are P1 because they are on every screen.

### 4.3 Gate sheet: `SHEETS.gate` (P1)
Order: **head → hero → (red warn) → rewards tiles → waves → one-line combo note → sticky CTA.**

1. **Hero:** `<div class="g-hero rk-tone-${R.id}">`, 140px tall, `margin:0 -18px`.
   - Uses the battle floor and rift (static, no rift rotation in the sheet).
   - `.portal.big` sprite `.p-foe` 84 → **96px** (3x), standing on the floor at the centre.
   - Rank diamond badge at the top-left.
   - Bottom gradient to `--deep`, with the nameplate "Boss · Cave Rat King" and meta "About 6 min · 45 s rest" (14px `--dim`).
2. **Rewards:** keep `<ul class="rewards">` but add `class="rewards tiles"`, styled `grid-template-columns:repeat(3,1fr);gap:8px`. Each li is a stacked tile: label 12px caps `--dim`, value 20px tabular (XP `--glow`, gold `--gold`). Drops tile shows `.rf.s40` box icon.
3. **Waves:** keep one `li` per wave (a test counts `#sheet .waves li`). Each `h4` becomes:
   - `display:grid;grid-template-columns:40px 1fr auto;gap:10px;align-items:center;min-height:44px;line-height:1.2`
   - sprite in `.rf.s40` (32px, 1x) for **every** wave, minions included, falling back to `riftling`, then to the icon
   - title 12px caps
   - XP chip right-aligned
   - Delete `.w-foe` negative margins.
4. **Combo explanation:** one `.note` line, "Clear every set at target for a combo, up to +50%."
5. **CTA:** the `.row2` with `data-a` for enter gets `sheet-cta` (sticky). Its label shows the MP cost chip.

### 4.4 Quest tab: `vQuest` (P2)
1. **Summary row** `.q-sum` is the first thing under the sys line. Left: `<b class="num">2</b><span>/4 goals</span>` (28px / 14px). Right: `.clock` moved up (keep `.clock`, the `ico('clock')` and `<span data-live="reset">`) at 18px tabular. When under 2h the clock turns `--red` and adds `.urgent` (slow 2s glow pulse; static red under reduced motion).
2. **Quest meter:** a 6px segmented bar `.qmeter{display:grid;grid-auto-flow:column;gap:3px}` with one cell per goal. Each cell is `transform:skewX(-12deg)`, filled with the `--line → --glow` gradient, and turns `--ok` when its goal is done.
3. **Goal rows** (`.goal`, the same `data-a`/`data-x`):
   - `min-height:56px`.
   - Value `[<b class="num">12</b><span class="dim">/40</span>]` with the current number at 18px.
   - 4px track plus `.g-bar` at 4px with `data-k="g-${id}"`, scaleX, and the glint.
   - `.chk` 26px.
   - `.goal.done.just` plays for one render (set `UI.just=id` on completion): row flash `--ok` 18% → transparent .8s, then `.chk` pop.
4. **Warning** `.warn` becomes a hazard strip: `padding:10px 12px;border:1px solid color-mix(in srgb,var(--red) 55%,transparent);background:repeating-linear-gradient(-45deg,color-mix(in srgb,var(--red) 9%,transparent) 0 10px,transparent 10px 20px)`. Text stays `--ink`, with the bold label in `--red-glow`.
5. **`.burn`:** keep the `.burn` and `.burn-t b` structure. Restyle it as a single row: flame icon, kcal value 16px, and a 4px bar. The "set your weight" hint shows only when weight is unset.
6. **COMPLETE stamp** becomes `CLEAR`: 26px, `tone-ok`, using the existing stamp keyframe.
7. **Optional quests** (`.side-q`):
   - min-height 48px, box 24px.
   - Count shown as 5 diamond pips (`.sets li` style, 10px) in a `.win-meta` on the right of the header.
   - Reward as a chip, e.g. `+15 XP · INT` in `--glow`.
   - The swap button (existing `data-a`) is a `.btn.sm`.
8. **Weekly / Monthly** (`.pq`):
   - name left, `15 / 300` right (16px tabular), with a `%` label in 12px `--dim`
   - 6px bar with 25/50/75 ticks and `data-k`
   - days-left `.tag` in the window header's right corner: `--gold` under 3 days, `--red` on the last day
   - `.pq.ready` (done and not claimed): 3px gold left rule, gold bar, and the Claim button glows (`ready` keyframe 1.4s × **3 iterations**, then static glow)
   - Bonus row: 3 pips plus `.rf.s40` thumbnails of the bonus items.
9. **Quick actions** (`.quick`, kept): two 64px tiles with a 24px icon over a 14px label. The Gates tile has a `--rk-b` radial and the open-gate count pill.

### 4.5 Gates tab: `vGates`, `gateCard` (P2)
1. **"Gates Detected"** window: put the MP meter above the list (`meter('mp','MP',mp,maxMP())`) with "10 MP per gate · enough for N" (14px `--dim`). The Use Key button sits beside it (existing `data-a`).
2. **Rift poster card.** Keep `.gate`, `.portal`, `.g-info`, `.red`, `.trial`, the tags, and the `data-a="gateInfo"` button.

   ```html
   <article class="gate rk-tone-${R.id}${feat?' feat':''}${red?' red':''}${trial?' trial':''}">
     <div class="g-stage"><div class="portal rk-${R.id}…" aria-hidden="true"><span class="g-rank">${R.id}</span></div>${sprImg(slug(boss),'p-foe')}</div>
     <div class="g-info"><h3>…</h3><p class="g-meta">chips</p><p class="g-ex">…</p><p class="g-rw">reward chips</p><button class="btn ${feat?'pri':''} block" data-a="gateInfo" data-x="…">Inspect gate</button></div>
   </article>
   ```

   - `.gate{grid-template-columns:1fr;padding:0;overflow:hidden;border-left:3px solid var(--rk)}`
   - `.g-stage` is 96px tall (`.feat` 128px), with a horizon line (`linear-gradient(transparent 78%,var(--rk-b) 78% 79%,transparent 79%)`).
   - The portal ellipse is 72x92 (`.feat` 84x108), recoloured from `--rk`.
   - The boss sprite stands **in front of** the portal, not clipped: 64px (2x), or **96px** (3x) on `.feat`.
   - `.g-rank` is a 28px diamond at the top-left.
3. **Info block:**
   - 16px padding.
   - Name 18px.
   - Meta chips: rank, "about N min", "10 MP".
   - Exercises as flex-wrap chips: 12px, 26px tall, visual only.
   - Reward row: XP chip (`--glow`) and gold chip (`--gold`), plus "Rank up" for trials.
   - The Inspect button is full width with min-height 48px. It is `.pri` on `.feat`, ghost elsewhere.
4. **Variants:**
   - `.red`: 6px hazard stripe along the top, rift in `rk-tone-X`, and "RED GATE · NO ESCAPE" in 12px.
   - `.trial`: dashed gold ring around the portal (`repeating-conic-gradient` mask, static) and a "Rank-up Trial" ribbon at the top-right.
5. **Feature rule:** the first non-trial open gate gets `.feat`.
6. **Hunter Rank ladder:**
   - Six chips joined by a 2px rail, filled in `--rk` up to the current rank.
   - The current chip is `scale(1.15)` with glow.
   - Under it, a 4px track from the current rank's min level to the next, labelled "Lv 14 → 20" (12px).
   - `li.past` uses colour, not opacity.
   - At ≤360px: `repeat(3,1fr)` in two rows, with no rail.

### 4.6 Items: `vItems` (P2)
1. **Equipment paper doll:**
   - `.doll{display:grid;grid-template-columns:72px 1fr 72px;grid-template-rows:auto auto;gap:8px 12px;align-items:center;justify-items:center}`.
   - Weapon slot on the left, hunter-full at 96px (3x of 32) in the centre on a 120x20 `--rk-b` ellipse pedestal, Armor on the right, Accessory centred below (`grid-column:2`).
   - Each slot is `.rf.s72` in the equipped gear's rank, with the sprite at 48px (3x16), and a 12px label below (slot name, then item name with ellipsis).
   - Empty slot: dashed `--line-b` border, slot icon at 40% opacity (decorative), and the label in `--dim`.
   - Under the doll, the summed bonus line (`data-cu` where numeric).
   - Fallback when `hunter-full` is missing: a 96px `.rf` holding the initial.
   - Equipping plays `.rf.new` on that slot for one render.
2. **Owned Gear:** the list rows stay with the existing `equip2` buttons. `.it-ico` becomes `slot(id,rank,56)` with the `.rk-corner` badge. The equipped row gets an "EQUIPPED" `.tag` in `--ok`.
3. **Inventory:**
   - List rows stay; behaviour is unchanged.
   - `.it-ico` becomes `.rf.s56` with the count badge `.cnt` (×3) instead of `<span>×N</span>` in the title.
   - Sort owned items first. Unowned rows stay visible, using `--dim` text and the `dark` sprite variant. No `<details>`.
   - Remove the duplicate `.gold-big` from Inventory and keep it only in Shop, sticky under `.seg` (`position:sticky;top:72px`).
   - A Random Box row with `inv.box>0` gets a static gold glow. It does not breathe.
4. **Shop:**
   - **Daily Deal** hero: `.rf.s96` plus the name. The old price is struck through in `--dim` (`text-decoration-thickness:2px`). The new price is a `.price-tag` gold pill (`padding:4px 10px;border:1px solid var(--gold);background:color-mix(in srgb,var(--gold) 12%,transparent);font:700 14px var(--f-disp)`) next to the live reset span.
   - Rows: `.rf.s56`, and Buy buttons labelled with the price pill. `data-a="buy"/"buyGear"` and `data-x` are unchanged.
   - **Can't afford:** a 3px gold `.bar` with `--v:gold/price` under the price, plus "230 more" in 12px `--dim`. The button is `disabled` (styled per 2.3).
5. **Shadow army:**
   - Header: a 56px violet `.ring` with the count in the centre (`data-cu`, `data-k="army"`), next to the existing army-bonus chips.
   - Grid `.army{grid-template-columns:repeat(auto-fill,minmax(100px,1fr))}`, grouped by rank with a 12px label row, e.g. "E-RANK · 2/3".
   - Cell `.sh`:
     - an `.rf.s80` in the shadow's rank, plus `box-shadow:inset 0 0 18px color-mix(in srgb,var(--violet) 35%,transparent)`
     - sprite at **64px** (2x), `shadow` variant
     - name 13px
     - level as 5 diamonds (filled = Lv)
   - Locked: `dark` variant, "???" in `--dim`, full opacity, no glow.
   - A newly extracted shadow (`UI.newShadow`) gets `.rf.new` and a "NEW" tag for one render.
6. **Skins:** the 44px swatch becomes a 56x40 mini window: 1px border in `c[0]`, two 6px bracket corners in `c[1]`, and a 6px title bar in `c[0]` at 30%. Buttons and `data-a` are unchanged.

### 4.7 Status: `vStatus` (P3)
1. **Hero** replaces `.st-top`:
   - A 152px `.ring` (XP, `rk-tone`) around hunter-full at **128px** (4x) on a 140x24 pedestal ellipse.
   - Level 44px under it.
   - Name, Job, Title and Rank as plates: a 12px dim label over 16px ink text. Rank is shown as a large `.rk` chip plus "Hunter".
   - Two columns at ≥360px (ring left, plates right), one column below that. Keep every existing `data-a` (title picker etc.).
2. **Vitals:** HP and MP use the `.hb` component at 10px height, with numbers inside the bar (12px). Fatigue is a 5-pip gauge.
3. **Points banner:** the existing `.pts` row (fixed in P0) becomes a gold banner when `points>0`: `border:1px solid var(--gold);background:color-mix(in srgb,var(--gold) 8%,transparent);padding:12px`, with the number at 28px. It sits **above** the stat grid. When there are no points, it is a dim single line.
4. **Stats:**
   - A 2x3 grid of tiles (`.stat` kept, plus `.stat.tile`).
   - Key 14px, value 26-28px tabular (`data-cu`), and a 3px progress bar at the tile bottom (`data-k="st-${k}"`, 12px % label).
   - `.plus`: 32px visual and 44px hit. Gold border plus a `pulse` box-shadow (1.6s × 3 iterations) while points are above 0.
   - Tapping `+` bumps the value and floats a gold `+1` (`.float`, .9s), which is hidden under reduced motion.
5. **Radar:** an `aria-hidden` inline SVG pentagon (STR AGI VIT INT PER), 180px, above the tiles. `--line` strokes at 30%, and a polygon fill at 25% `--glow`, scaled to the max stat.
6. **Skills:**
   - Unlocked ones first, as rows with a 3px `--ok` left rule, a "Passive" tag and the effect text.
   - Locked ones show a lock glyph and, when `SKILLS[id].prog` exists (a new optional `prog:()=>[cur,need]`), a 4px bar plus "120/500". Otherwise they show the requirement text.
   - No `<details>`.
7. The 3-line explainer note shrinks to one 14px line.

### 4.8 Records: `vRecords` (P3)
1. **Streak:**
   - `.flame` tier via `data-tier`: 0 grey, 1-6 `--glow`, 7-29 `--gold`, 30+ violet core with a gold edge.
   - CSS-stacked radial ellipses. `flick` 1.6s infinite is allowed (a single element) and is static under reduced motion.
   - Number 40px with `data-cu`.
   - Under it, 7 freeze pips (`cur%7`) with "3 more days for a Streak Freeze", and a 6px `cur/best` bar labelled "Best 21".
   - The floating Streak Freeze `p.note` moves inside the Streak window.
2. **Totals:** lead with a 2x2 `.tiles` grid (Push-ups, Squats, Gates cleared, Quests cleared): 12px caps label and 28px tabular value with `data-cu`. **All other rows stay visible below** (no `<details>`).
3. **Chart and calendar:** axis 12px, y axis shows 0 and max only. Today's cell gets a static 2px `--glow` outline (no breathing), and the legend is 12px. `svg.chart .ch-b` is unchanged (tested).

### 4.9 Recover: `vRecover` (P3)
1. **Session cards:**
   - The overview `p` is clamped to 2 lines (the full text is in the rec sheet).
   - Name 16px, then a chip row ("9 min", "7 moves", "Done today").
   - View button min-height 44px.
   - Sore joints keep `.rec.hot` and get a "Recommended" tag.
   - At ≥360px, non-sore joints use a 2-column grid of compact tiles (name plus minutes plus the same View `data-a`).
2. **Joint Check-in:** `.tri button` per 2.2. The rules note becomes `<details class="help"><summary>How flags work</summary>`. This is the only new `details`. Check that the tests' `#sheet details.help` still targets the sheet only.
3. **When to Get Help:** a 0-10 pain strip (`repeating 11 cells`: 0-3 `--ok`, 4-6 `--gold`, 7-10 `--red`; the numbers are 12px `--void` on the fill, AA checked) plus one line of text. The existing details are kept.

### 4.10 Onboarding: `SCREENS.awaken`
- Only the 44px link and `chrome()`.
- The brand is shown as a 28px logotype with letter-spacing .5em. It is static.
- No scramble and no rune circles.

### 4.11 Settings
- `chrome()` and the type and target sweeps only.

---

## 5. Motion list

All animations rebuilt by innerHTML must use one of three patterns:
- **(a)** a negative delay from `Date.now()`
- **(b)** a gate on change: `UI.lastTab`, `.grew/.fell` from the engine, `UI.just`, or `.new`
- **(c)** one-shot on an element that exists once (`.ntf`)

| # | What | Trigger / pattern | Duration, easing | Reduced motion |
|---|---|---|---|---|
| M1 | Window materialise `.view.enter>.win` (scaleY .03→1.015→1, brightness 2.2→1, stagger 0/.05/.1/.14s) | tab change: `enter=UI.tab!==UI.lastTab`, then remove `.enter` after 700ms (b) | `--t-win` .42s `--ease-sys` | `animation:none` |
| M2 | Scan sweep (first window, foe-win) | negative delay `--scan-d` (a) | 9s linear infinite; paused when hidden | `display:none` |
| M3 | Scan sweep on notification | once (c) | 1.2s | none |
| M4 | Notification unfold + border flash + `!` blink | once (c) | .5s / .5s / .4s×2 | unfold kept at .01ms (global rule); flash and blink none |
| M5 | Loot rows `rpop` stagger | `.ntf.done` (c) | .4s `--ease-pop`, 80ms step | rows shown at once |
| M6 | Level-up ring fill | once (c) | .9s `--ease-sys` | full ring static |
| M7 | CLEAR stamp `stampin` | once (c) | .45s | shown static |
| M8 | Bar fill from `--p0`, gain ghost, HP lag | engine `.grew/.fell` (b) | .6s fill, 1.1s ghost, lag .25s delay + .5s | engine off: final value, no ghost |
| M9 | Count-up + `bump` | engine (b) | 700ms easeOutCubic + .35s pop | final text immediately |
| M10 | Foe idle/hit/crit/enter/die (existing) | existing negative-delay code | unchanged | unchanged (existing rule) |
| M11 | Rift rotation (battle only) | negative delay (a) | 20s linear infinite | static frame (opacity .3 conic still looks intentional) |
| M12 | Gate entered banner `.bwarn.sys` | negative delay from `enteredAt` (a) | 1.6s | static text for 1.6s, then gone |
| M13 | Weakened HP pulse (HUD) | class `.weak` | 1.6s infinite | static red glow `box-shadow:0 0 8px var(--red)` |
| M14 | Reset clock urgent pulse | `.urgent` | 2s infinite | static `--red` |
| M15 | Goal done `.just` flash + chk pop | `UI.just` one render (b) | .8s / .4s | static `--ok` tint for one render |
| M16 | `.pq.ready` claim glow | class | 1.4s × 3 then static | static glow |
| M17 | Stat `+` pulse | `points>0` | 1.6s × 3 then static | static gold border |
| M18 | `.rf.new` brightness flash | one render (b) | .9s | none |
| M19 | `.btn:active` scale .97 | `:active` | .12s | no transform |
| M20 | Streak flame flicker | class | 1.6s infinite | static |
| M21 | Toast (existing) | per element | 2.3s | unchanged |

Add these to the existing `@media (prefers-reduced-motion:reduce)` block:
```css
.view.enter>.win,.win-fx::after,.foe-rift,.hud.weak .hb.hp i,.clock.urgent,.flame,.rf.new,.ntf .win-head .win-ico{animation:none!important}
.win-fx::after,.float,.gain,.lag{display:none}
.ntf .rewards li{opacity:1;animation:none}
.btn:active{transform:none}
```
`.fx-pts` replaces `.pts` in the existing `display:none` list (P0).

**No infinite animation** runs outside the visible view. Limit: at most 4 infinite animations on screen at once (sweep, rift, one pulse, flame).

---

## 6. Sprites (`sprites.js`), in priority order

The format matches the existing batches: `{n, p, r}`, 1px `#0b0e17` outline, light from the top-left, glowing eyes where relevant. Everything is original art.

| Prio | id | Size | Used by | Fallback |
|---|---|---|---|---|
| P1 | `hunter` (hooded bust) | 24 | HUD face (CSS bg, 2x=48) | initial letter |
| P1 | `riftling` (System construct) | 32 | any minion without art; rank tint via variant | ghost icon in `.rf` + "Unidentified" |
| P1 | minions: `goblingrunt giantrat greenslime hobgoblin cavebat skeletonsoldier` (E/D first), then `orcraider icewolf venomspider ghoul darkelfarcher stonegolem hellhound wraith imp drake soldierant abysswatcher` | 32 | battle, gate sheet waves | riftling |
| P2 | `hunter-full` | 32 | doll (3x), Status (4x), battle strip (1x in s40) | `.rf` with initial |
| P2 | gear: `knuckle dagger fang swift breaker storm vest leather plate mantle ring` + remaining GEAR ids | 16 | gear rows, doll, shop, battle `.wpn` | `ico(slot)` |
| P2 | items: `box potion key ward elixir scroll draught compass balm` + rest | 16 | inventory, shop, loot | `ico(it.icon)` |
| P2 | `chest`, `coin16`, `xp16` | 16 | wave clear, loot rows | ico |
| P3 | remaining bosses (to complete SHADOWS) | 32 | gates, army | portal letter |

**New `sprURL` variant `rk:#rrggbb`:** replace palette key `c` (the cloak/body accent; document this per sprite) with that hex. The cache key already includes the variant. Resolve rank hex from the `RANKS`/`--rank-*` constants in JS. Do not call `getComputedStyle` per render.

Only integer sizes are allowed in CSS:
- 16px art: 32, 48, 64
- 24px art: 48
- 32px art: 32, 64, 96, 128, 160, 192

Replace the off-scale sizes: `.gear-spr` 40→48, `.sh-spr` 56→64, `.rw-spr` 26→32, `.w-foe` 30→32, `.ntf-art` 120→128, `.foe` 168→160, `.foe.boss` 188→192, `.portal.big .p-foe` 84→96. Every `.spr` gets `image-rendering:pixelated`.

---

## 7. Implementation phases

### P1: must-have (identity + defects), about 3 days
1. P0 items: capture fix, `.fx-pts`, `.ntf .big`, test grep.
2. Tokens (section 2), type remap 2.1, targets 2.2, opacity → colour 2.3.
3. Window chrome v2 with `chrome()` (3.1).
4. Hunter Card HUD (3.2) and the `hunter` sprite.
5. Tab dock (3.3).
6. Buttons (3.4) and the `.rf` frame and rank tones (3.6).
7. Battle (4.1): stage, integer scale, nameplate, HP bar inside numbers, skill row, sticky `.act`, gate-entered banner, riftling fallback. HP drain uses the engine's `.fell` path, or a local `--from` keyframe until P2 lands.
8. Toast docking (3.9).
9. Gate sheet (4.3) and sticky sheet CTA (3.7).
10. Sprites: `hunter`, `riftling`, and the six E/D minions.

### P2: reward loop and collections, about 3 days
1. Reward engine (3.5) with keys wired to HUD, goals, pq, battle and gold.
2. Materialise entry M1.
3. Quest tab (4.4).
4. Gate cards with feature and MP meter, plus the rank ladder (4.5).
5. Notifications: loot, guard, per-kind (3.8).
6. Items: doll, slots, inventory, shop hero and affordability, army trophy case, skins (4.6).
7. Empty states (3.10).
8. Sprites: `hunter-full`, gear, items, chest, and the remaining minions.

### P3: depth, about 2 days
1. Status character sheet with radar and skill progress (4.7).
2. Records streak flame, freeze pips and tiles (4.8).
3. Recover compaction and pain strip (4.9).
4. Level-up ring animation polish.
5. Remaining boss sprites.

Each phase ends with the full checklist below, the test suite (`node tests/run.js`, or as configured), and a fresh `tour.js` capture into `scratchpad/ui/after-P{n}/`.

---

## 8. Acceptance checklist

**Layout and size**
- [ ] At 320, 360, 390, 430 and 1280px wide, `document.documentElement.scrollWidth <= innerWidth` on every tab, every Items segment, the gate sheet, battle, settings and a notification. Script it in `tour.js` by looping viewports.
- [ ] At 320px: the top bar does not wrap, the name truncates with ellipsis, the status tag goes screen-reader-only, and the coin and settings stay visible.
- [ ] At 320px: every `.tab-l` has `scrollWidth <= clientWidth` (6 labels, including "RECORDS"/"Records"), and the raised Gates portal does not overlap the labels of the tabs next to it.
- [ ] Battle at 390x844 and at 360x740: the stage, enemy HP bar, stepper and "Done · Strike" are fully visible at scroll 0, with no toast over the wave strip.
- [ ] Gate sheet at 390x844: "Enter gate · 10 MP" is visible without scrolling (sticky).
- [ ] Desktop (1280): content stays centred at max 520px, and sheets and notifications stay centred.

**Text and targets**
- [ ] No computed `font-size` below 12px on any visible text node. Script it: walk text nodes and read `getComputedStyle(parent).fontSize`.
- [ ] Every `button, [data-a], a, input, summary` has a hit box of at least 44x44, counting `::after` hit extenders. Script it: check `getBoundingClientRect` for elements without a known extender, and keep an allowlist of `.plus`.
- [ ] WCAG AA: text contrast ≥ 4.5:1 (≥ 3:1 for 18px+ or 14px bold+) for `--ink`/`--dim` on `--deep`/`--void`, gold on deep, rank colours in `.rk` chips, `--void` text on gold pills and the pain strip, disabled buttons, and locked shadows/ladder/claimed rows. Run the check under **all 6 skins**.
- [ ] No text sits inside an element whose computed opacity is below .7.

**Hooks and tests**
- [ ] `git diff` shows no removed `data-a=`, `data-x=` or `data-c=` value. Script it: the sorted unique lists before and after are a superset.
- [ ] These classes are still present in the rendered DOM where they were: `.scr-gate .goal .side-q .tab .win .sheet .ntf .lv .xpbar .coin .gate .portal .waves .burn .burn-t .toast .dmg .pts .summon-b .rewards`, and `svg.chart .ch-b`.
- [ ] `#top img` count is 0.
- [ ] `#sheet .waves li` count ≥ rounds.
- [ ] `[data-a=summonOpen]` is absent after summoning.
- [ ] The personal-best `.toast` still appears.
- [ ] The full test suite passes, with no edits to tests other than an approved, documented one.

**Skins and tones**
- [ ] Each of `blue shadow ruler crimson frost verdant` recolours the window chrome, brackets, scan, tab dock, HUD MP bar and buttons, while rank colours stay fixed.
- [ ] Ruler (gold skin) next to S-rank gold, and Verdant next to D-rank green, both stay distinguishable. The rank letter chip is always present, so colour is never the only cue.
- [ ] `.tone-red`, `.tone-ok` and `.tone-violet` windows still recolour their brackets (the derived tokens are redeclared).

**Motion**
- [ ] Emulate `prefers-reduced-motion: reduce`: no element has a running infinite animation (`document.getAnimations().filter(a=>a.effect.getTiming().iterations===Infinity)` is empty). Count-ups and fills show final values, loot rows are visible, and the Status points row is **visible**.
- [ ] Tapping a goal checkbox 5 times does not replay window materialise or restart the scan sweep, and only the changed bar animates.
- [ ] Switching tabs plays materialise once.

**Sprites**
- [ ] With `window.SPRITES={}` (all art missing), every screen renders with no empty frames: initials, icons, riftling or ghost fallbacks, and no console errors.
- [ ] Every `.spr` has an integer-multiple CSS size of its art (`naturalWidth`, or `n` from SPRITES) and `image-rendering:pixelated`.

**Performance**
- [ ] On a 4x CPU-throttled Chrome profile, scrolling Records and Items holds at least 50fps. No more than 4 infinite animations run at once, and `body.locked` removes blur from background windows.
