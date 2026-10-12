# Ninth Bell

A Persona-style RPG that runs in the browser. `index.html` is the 3D version; `classic.html` is the original 2D menu version (same save file).

## Running it

The 3D version loads model files, so it must be served over HTTP. Opening `index.html` straight from disk won't work. To run it locally:

```sh
cd game
python3 -m http.server 8000
# open http://localhost:8000
```

## Swapping in your own characters

Export each character from VRoid Studio as **VRM** (VRM 1.0 or 0.x both work). Keep each file under about 15 MB and put it in `assets/characters/` with these exact names:

| File | Character |
|---|---|
| `mc.vrm` | You (the hero) |
| `rin.vrm` | Rin |
| `kaito.vrm` | Kaito |
| `mira.vrm` | Mira (optional; she only appears in dialogue scenes) |

Any character without a file uses `placeholder.vrm`, the pixiv VRM 1.0 sample model ("VRM1_Constraint_Twist_Sample"). Its license allows redistribution, modification and commercial use. The game picks up new files automatically, with no code changes.

## Animations

`assets/anims/` holds Mixamo animations downloaded as FBX Binary, 30 fps, "Without Skin". They're retargeted onto every VRM at load time (`js/mixamo.js`). To replace one, download a new animation with the same settings and save it under the same name:

`idle` · `battle_idle` · `walk` · `run` (walk and run "In Place") · `attack` · `cast` · `hit` · `knockdown` · `victory`

## Code layout

- `js/data.js`: skills, Personas, social links, enemies and items, plus how each Shadow looks
- `js/main.js`: calendar, social links, battle rules and the menus
- `js/world.js`: the 3D side (rendering, characters, Shadows, the Tower maze, the battle stage and effects)
- `vendor/`: Three.js r169 and @pixiv/three-vrm 3.5 (MIT), so the game has no CDN dependency
