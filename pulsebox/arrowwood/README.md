# ARROWWOOD

First-person archery for Pulsebox in a bright, toy-like style. Two to eight friends (or bots) take cover in the King's
Wood (rolling hills, groves of tall trees whose crowns meet overhead, open meadows, bushes, a creek, the Stone Bridge,
Split Oak and the Old Tower), draw, and land the last arrow.

A full draw (the ring turns gold) flies dead straight along your line of sight, with no drop, so it lands exactly on the
crosshair; anything less arcs under gravity. While you draw, a dotted aim line shows the whole flight (it leaves from the bow and eases onto the arrow's true path)
and a ring marks where the arrow will land; leaves let arrows through, so the line passes through them too. Settings can
cut it back to a short arc.

- **1v1 and 2v2**: first to three round wins. One life per round, six arrows per round, an overtime capture zone at
  the Stone Bridge clearing after 80 seconds. A host can switch on **one-shot rules** for a room.
- **Free for All**: up to 8 archers, 2 minutes 30, most eliminations wins. One shot, one kill. You respawn
  somewhere new.
- **Play vs bots**: 1v1, 2v2 (with a bot partner) or a six-archer free for all against computer archers, on Easy,
  Normal or Hard. It runs the server's engine inside the page, so it needs no server and plays exactly like a room.
  Bots use the same body, draw timing and arrows as everyone; they see only what a straight line from the eye reaches
  and hear roughly where you are when nobody is in sight. Bot matches pay no coins.
- **Practice range**: straw dummies at 10, 20, 35 and 50 m (one walks), endless arrows. It runs the server's engine
  inside the page, so it plays exactly like a match. It also works while you wait in a room.
- **Bows**: 34 of them, from the Forester's Longbow (free) through Commons, Rares, Epics and Legendaries to Mythics at
  up to 10,000 coins. Every bow has identical stats; a bow changes the look, the arrow trail and the elimination
  finisher (each bow has its own: in 48-fx for the first four, 49-finishers for the rest). Coins come from online
  matches: 25 for playing, 15 per elimination, 10 per round your side wins, 50 for a win (or for topping a free for
  all). New players start with 150. The shop is a grid, five to a row, cheapest first; tap a bow for its detail page.

Damage in rounds (unless one-shot rules are on) depends on where an arrow lands and how fast it was still flying. A
full-draw headshot eliminates; strong body hits take two; weak shots and leg hits only wound. Arrows that hit someone
stay in them until they are out of the round or respawn.

## How it is built

```
arrowwood/
  shared/world.js        the map, movement, arrow flight, swept collision, hitboxes, damage, bows, coin prices
  server/engine.js       the authoritative match: rooms, teams, rounds, overtime, free for all, practice, rewards
  server/bank.js         coins, owned bows and the equipped bow (keyed to a hash of the player's private key)
  server/node-server.js  a local/standalone server: static pages + the same API and engine
arrowwood-rooms.js       the same engine on Cloudflare: one Durable Object per room code, one "bank" Durable Object
src/games/arrowwood/     the browser client (Three.js r128): 10-core ... 99-main, built into public/games/arrowwood.html
tools/arrowwood-*.mjs    browser checks and Node tests (see "Checks" below)
```

The client never decides anything that matters:

- It moves your body at once and reports it about twenty times a second. The server checks every move against what a
  body could have done (speed, walls, ground) and sends a correction when it couldn't have.
- Drawing and releasing are immediate on screen. The server times the draw itself, spawns the real arrow, flies it,
  and decides hits, health, ammo, eliminations, timers, scores and rewards.
- Remote players are drawn a little in the past and interpolated between snapshots: 0.1 s on a steady connection, growing
  to at most 0.25 s when snapshots arrive unevenly; if one is late they carry on their way for up to 0.12 s rather than
  freeze. Arrows are flown on every screen from the server's launch data with the same gravity.
- The servers step the room on the wall clock (`due()` in engine.js): a timer that fires late catches up next time,
  so the room's clock never falls behind real time.
- Collision is swept: each server tick an arrow is tested as three segments against trunks, boxes, the ground and
  every body, so a fast arrow cannot skip through a thin wall or a moving archer.

Graphics settings (Low, Medium, High, or Auto) change only pixel ratio, shadows, foliage density and texture size.
Physics and hit detection are the same at every setting. Auto picks Low on iPads and phones.

The look: bright sky with puffy clouds, grassy hills coloured by height and slope, round trees and bushes, clean bricks
and planks, chunky toy-figure archers (rounded blocks, painted faces, hats and hair, quivers), detailed bows, and
realistic first-person hands (jointed fingers, knuckles, nails, a shooting glove and a bracer). Effects: arrow trails
in each bow's colour, chunky block bursts on hits, floating damage numbers, and archers bursting into their blocks
when the Forester's Longbow lands the last arrow (the other bows keep their own finishers).

A **tester copy** (the page opened anywhere but Pulsebox or a local server, or with `?tester`) offers bot matches and
the range only, turns coins off and unlocks every bow so its finisher can be tried.

Everything you see and hear is made in code at load time: the textures are painted on canvases and the sounds are
synthesized with Web Audio. The only outside files are Three.js r128 (MIT, from cdnjs) and the Cinzel and Nunito
fonts (SIL Open Font License, from Google Fonts).

## Run it on your computer

```
cd pulsebox
python3 tools/build-games.py arrowwood     # builds public/games/arrowwood.html
cd arrowwood && npm install && npm start    # http://localhost:8790
```

Open `http://localhost:8790/games/arrowwood.html` in two browser windows. One window makes a room; the other
opens the invite link. Coins and bows are saved in `arrowwood/.data/profiles.json`.

`npm run dev` (`--dev`) shortens every timer and allows test teleports. Use it for the automated checks only.

## Put it on Pulsebox (Cloudflare)

The room and bank Durable Objects are already wired in:

- `wrangler.toml`: `ARROWWOOD_ROOM` and `ARROWWOOD_BANK`, migration `v9`.
- `build-worker.py`: exports both classes from `worker.js`.
- `api.js`: routes `/api/arrowwood/*`.

```
cd pulsebox
python3 tools/build-games.py arrowwood
python3 build-worker.py
npx wrangler deploy                          # or the embedded build: python3 build-worker.py --embedded && npx wrangler deploy -c wrangler.embedded.toml
```

The game is then at `https://box.pulseform.org/games/arrowwood`, and it appears in the hub (Action, NEW, and under
Play with friends).

## Share a room with friends

1. Open Arrowwood, choose **Play with friends**, pick 1v1, 2v2 or Free for All (and one-shot rules if you like), and
   choose **Create room**.
2. Choose **Copy invite link** (on an iPad, **Share**). Friends who open the link land in your room. They can also type
   the 4-letter code under **Join a room** in the game, or in the hub's Join box.
3. In 2v2 the host can move people between teams with ⇄. When everyone shows **ready**, the host chooses **Start match**.
   **Practice while you wait** keeps you on the range until the match starts.
4. After the results, **Rematch** starts again with the same teams once everyone has chosen it.

If a connection drops, the game reconnects to the same seat on its own (a seat is held for 45 seconds during a
match). A full room, a wrong code and a lost connection each get a plain message.

## Run the server somewhere else

The client is one static file, so it works from any folder on any host. Copy `public/games/arrowwood.html` wherever
you like (it still needs the internet for Three.js and the fonts) and point it at a server in either of two ways:

- add `?server=https://your-host:8790` to its URL, or
- set `window.ARROWWOOD_SERVER = 'https://your-host:8790'` before the script runs.

With neither, it uses the site it was loaded from. `server/node-server.js` runs on Node 18 or newer, and its API sends
CORS headers. Put it behind HTTPS (any reverse proxy) so browsers can use `wss://`. Invite links made by a copy keep
its `?server=` setting.

## Tuning

- `shared/world.js`
  - `BOW`: launch speeds, full-draw time, nock time, arrows per round, bundle size.
  - `ZONES` / `damageFor`: damage by hit zone and arrow speed.
  - `COINS` and the `price` of each bow.
- `server/engine.js`
  - `NORMAL`: intro, round length, overtime length, capture time, free-for-all length, respawn delay, reconnect grace.
  - `WIN_ROUNDS`: round wins needed for the match.

## Checks

Start a server first. The local one is `node arrowwood/server/node-server.js --dev`. For the Durable Objects run
`npx wrangler dev --local --var ARROWWOOD_DEV:1` (port 8787), then:

```
node tools/arrowwood-1v1-check.mjs   http://localhost:8790   # two browsers: room, invite link, a full match to three, finishers, coins once, refresh on results, rematch
node tools/arrowwood-2v2-check.mjs   http://localhost:8790   # four browsers: teams, spectate your teammate, survivors keep playing
node tools/arrowwood-shot-check.mjs  http://localhost:8790   # quick vs full draw, the dotted arc vs the real flight, walls and trees stop arrows
node tools/arrowwood-bows-check.mjs  http://localhost:8790   # buy and equip, reload keeps them, Cashout and Yardstick finishers in a 2v2
node tools/arrowwood-net-check.mjs   http://localhost:8790   # full room, wrong code, drop and reconnect, free for all, a copy in another folder with ?server=
node tools/arrowwood-touch-check.mjs http://localhost:8790   # iPad emulation with two fingers at once: walk + draw + drag-aim, release, LOWER
node tools/arrowwood-media.mjs                               # hub cover, screenshots and trailer
node tools/arrowwood-rules-test.mjs                          # (no server) round rules, damage, overtime, pickups
node tools/arrowwood-bots-test.mjs                           # (no server) bots fill seats, find and shoot people, no coins offline, rematch
```
