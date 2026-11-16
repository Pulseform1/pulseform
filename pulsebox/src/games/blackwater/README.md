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

## Testing tricks

- `blackwater.html?dev` shows a **DEV: call the thing from below** button in Settings and enables **F8**: it skips to tonight if needed and starts the Cthulhu encounter.
- In normal play Cthulhu can only come after sunset, from the fourth night on, with a 2% chance per night and a six-night wait after it has been.
- `GAME.test` in the console gives the live state (`S`, `RAFT`, `PL`, `SH`, `CT`...) and helpers (`spawnGiant`, `spawnPool`, `summon`, `give`, `tick(seconds)`).

## Settings

Volume, graphics quality (auto / low / medium / high: ocean mesh density, ripple detail, rain rings, shadows, spray, pixel ratio; the waves and buoyancy are identical on every setting), look speed, reduced camera motion (the raft still moves; the view barely rolls). Progress saves on the device every 30 seconds, on Save now, and when you go to the menu; Pulsebox copies it to the player's account.
