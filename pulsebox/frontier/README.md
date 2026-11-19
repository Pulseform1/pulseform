# Frontier Hunter

A first-person 1800s hunting game in an endless procedural wilderness, built on three.js. Everything (terrain,
trees, animals, textures, sound) is generated in code; there are no asset files.

Build the site page (`public/games/frontier-hunter.html`, one self-contained file):

    cd frontier && npm ci && cd .. && node tools/build-frontier.mjs        # add --dev for an unminified build

Handy URL parameters while working: `?spawn=forest|valley|lake` starts straight away, `&seed=1234` fixes the
world, `&t=18.5` sets the hour, `&q=low|medium|high` sets graphics, `&debug=1` shows frame stats.
In the console, `__fh` exposes the game (`__fh.G`), `__fh.setTime(h)`, `__fh.weather('rain'|'fog'|'clear')`.

## Where things live (`src/`)

| File | What it does |
| --- | --- |
| `main.js` | Start-up, menus, the frame loop, interaction, shooting glue, saving, touch, settings |
| `noise.js`, `world.js` | Seeded noise; heights, lakes, rivers, mountains, forests, camp levelling, spawn search |
| `gen.js`, `worker.js`, `jobs.js` | Terrain chunks, plant placement, grass fields and map tiles, built in web workers |
| `terrain.js` | Chunked terrain with levels of detail and the six-layer ground shader |
| `plants.js`, `flora.js` | Procedural trees (near, mid, impostor), bushes, ferns, rocks, logs; instancing and collisions |
| `grass.js`, `water.js`, `sky.js`, `fx.js` | GPU grass, water, sky/sun/moon/stars/clouds/shadows, fog and wind shader patches |
| `weather.js`, `audio.js` | Rain, clouds, morning mist; all synthesised sound |
| `camp.js`, `fire.js`, `lantern.js` | The tent and camp props, the campfire, the lantern |
| `animals.js`, `wildlife.js` | Skinned animal models and poses; herds, behaviour, spawning, hit testing, harvesting |
| `weapons.js` | Rifle and shotgun models, aiming, recoil, reloading, ammunition |
| `camplife.js`, `ui.js` | Pack, firewood, fire lighting, cooking spit, meat box, drying rack, chest; the panels |
| `map.js` | The survey map (M) and the compass strip |
| `input.js`, `player.js` | Keyboard, mouse and touch; walking, swimming and collisions |
