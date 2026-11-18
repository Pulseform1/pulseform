# Blackwater Drift

First-person ocean survival for Pulsebox. You wake alone on a 2 × 2 raft with a rope hook and an unlit torch.

## Files

| part | what it does |
|---|---|
| `00-game.js` | the record the Pulsebox kit reads (title, how to play) |
| `10-core.js` | maths, the event bus, items, fish, tools, raft pieces, settings |
| `20-sea.js` | **the wave model**: eight Gerstner waves plus giant swells, whirlpools, Cthulhu's rings and waterspouts; `waterH()` in JavaScript and `SEA_GLSL` for the GPU read the same per-frame arrays; weather and day/night |
| `30-raft.js` | the raft grid, buoyancy (samples every cell's four corners and fits a plane), building rules, damage, detached pieces drifting away |
| `40-life.js` | you, salvage, hook, rod, food, fire, torch, sharks, giant-wave/whirlpool/spout effects, Cthulhu, saving |
| `70-gfx.js` | Three.js setup, the sky and the ocean shaders, the underwater waterline pass |
| `72-models.js` · `76-fx.js` · `78-frame.js` | models, rain/spray/funnel, everything drawn each frame |
| `80-audio.js` | all sound, synthesised; underwater muffling |
| `90-input.js` · `92-hud.js` · `99-main.js` | mouse/keys/touch, the HUD and menus, the kit hooks |

Parts 10-40 never touch the page, so `node tools/blackwater-sim-test.mjs` plays the whole survival checklist in Node.

## Build and add to Pulsebox

```
python3 tools/build-games.py blackwater     # -> public/games/blackwater.html (one self-contained page)
node tools/blackwater-sim-test.mjs          # the simulation checks
```

The page is the whole game: it needs nothing beside it except Three.js r128, which it loads from cdnjs (falling back to jsDelivr). Drop `blackwater.html` in any folder of the site and open it. The hub entry is the `blackwater` record in `public/index.html` (cover, trailer and screenshots in `public/media/blackwater-*`).

## Play with friends (2 to 4)

PLAY WITH FRIENDS on the menu opens the Pulsebox room lobby: create a room, send the 4-letter code, start when everyone is in.
The host runs the sea (weather, waves, raft, wreckage, shark, events) and saves the raft; friends run their own body, hunger,
thirst and tools, and see each other as figures with name tags. Materials are shared. A friend's grabs, builds, fires, logs,
sunken crates and spear hits go to the host as requests (`60-net.js`), so the one raft never splits. If the host leaves,
friends go back to the menu. `node tools/blackwater-mp-check.mjs <folder>` plays a host and a friend through the live relay.

## Survival additions

- **Thirst** drains faster than hunger (about 16 minutes, worse in the midday sun). Q drinks fresh water; coconuts help too. Salvage barrels and crates sometimes hold water.
- **Rain catcher** (fills while it rains), **water still** (works while the sun is up) and **fish trap** (hangs off an open edge, catches small fish): each holds a few until you press E at it.
- **Sunken crates**: every few minutes bubbles rise near the raft. Swim over, hold Shift to dive, and press E beside the crate. Diving uses your breath (AIR bar).
- **Logs**: a log you haul in goes into your items (I or Tab). Press PLACE, aim at the deck (the see-through log slides to the nearest spot where it fits), rotate with R or the wheel, click to set it down, then click again to SOLIDIFY. Solid logs brace the cells under them (they take about a third less damage); E pries one loose again. `node tools/blackwater-log-check.mjs <folder>` plays it through.
- **Key panel**: the keys for what you can do right now sit at the top left; H hides or shows it.
- The ocean's vertex shader keeps the water surface below the logs inside every raft cell (a 32 × 32 map of the cells), so waves never show through the deck.

`node tools/blackwater-new-check.mjs <folder>` checks all of these in a real browser.

## Steering (a little, never a lot)

The raft always drifts with the wind's current. On top of that (`sailing()` in `40-life.js`):

- **Oar**: paddles the way you face at about 0.8 m/s on a 2 × 2 raft, less on a bigger one (÷ √(cells/4)). Your arms tire in about 9 s of paddling down to a quarter of that and rest in about 7 s (ARMS bar). In a whirlpool's or a waterspout's pull you dig in at full strength without tiring, so you can still escape them.
- **Sail** (up to 2): E raises or lowers it. It pushes the way the raft points (its bow is local −z) with 0.25 + 0.035 × wind m/s (capped at 0.9, ×1.3 with two sails), full running before the wind, about a third across it, nothing pointing into it. A storm (wind over 15) can tear it down.
- **Steering oar** (one, on an open edge): E takes the helm; A and D turn the raft about 3°/s, faster when it is moving; your view turns with the raft; E, W, S or Space let go. A compass shows the wind against the bow and how well the sail draws.
- **Anchor**: E drops or raises it. Down, the raft keeps about an eighth of its drift, but it drags in a whirlpool or waterspout.
- The raft's swirl is now measured about the middle of its cells against their average current, so a steady drift no longer spins it.

## More to build and craft

- **Platform (2 × 2)**: four foundations (with decking) at once, cheaper than one by one. It fills the 2 × 2 block that holds the aimed spot and touches the raft most.
- **Debris net**: hangs off an open edge and catches up to four pieces of wreckage that drift into it; E empties it.
- **Lantern** (up to 6): lights itself after dark; a shark won't pick an edge within one cell of a lit lantern.
- **Metal hook** (upgrade): longer rope (34 m), wider snag, faster reel. **Iron spear** (upgrade): two hits drive a shark off. Upgrades need the tool first and take no hotbar slot.
- The build list has two pages on a keyboard (B opens it, B again for page 2, B closes); a touch screen shows all of it in two columns.

## Testing tricks

- `blackwater.html?dev` shows a **DEV: call the thing from below** button in Settings and enables **F8**: it skips to tonight if needed and starts the Cthulhu encounter.
- In normal play Cthulhu can only come after sunset, from the fourth night on, with a 2% chance per night and a six-night wait after it has been.
- `GAME.test` in the console gives the live state (`S`, `RAFT`, `PL`, `SH`, `CT`...) and helpers (`spawnGiant`, `spawnPool`, `summon`, `give`, `tick(seconds)`).

## Settings

Volume, graphics quality (auto / low / medium / high: ocean mesh density, ripple detail, rain rings, shadows, spray, pixel ratio; the waves and buoyancy are identical on every setting), look speed, reduced camera motion (the raft still moves; the view barely rolls). Progress saves on the device every 30 seconds, on Save now, and when you go to the menu; Pulsebox copies it to the player's account.
