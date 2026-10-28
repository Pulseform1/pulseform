# ENCORE — five new 3D games for your website

This collection adds five new games to the existing AFTERHOURS library. The original five games and THE HOLLOW remain available.

| Game | Website URL | Direct solo HTML | Online mode |
| --- | --- | --- | --- |
| Prop Panic | `/arcade/?game=prop` | `playable-games/PROP-PANIC.html` | 1–4 cooperative hiders vs hunters |
| Midnight Heist | `/arcade/?game=heist` | `playable-games/MIDNIGHT-HEIST.html` | 1–4 cooperative thieves |
| Pocket Planet Golf | `/arcade/?game=golf` | `playable-games/POCKET-PLANET-GOLF.html` | 1–4 competitive golfers |
| Cosmic Café | `/arcade/?game=cafe` | `playable-games/COSMIC-CAFE.html` | 1–4 cooperative chefs |
| Rooftop Rush | `/arcade/?game=rooftop` | `playable-games/ROOFTOP-RUSH.html` | 1–4 cooperative runners |

## Play and download

On GitHub, **Code → Download ZIP** includes all editable sources, art, and built HTML. `ENCORE.html` and `AFTERHOURS.html` open the complete collection, with the five new games featured first. The **THE HOLLOW** link opens the original horror game. No external assets are fetched by the portable builds.

A smaller ready-to-play ZIP is committed at `downloads/ENCORE-five-games.zip`. Extract it and open `ENCORE/START-HERE.html` on a desktop, or one of the direct pages in its `games` folder. The portable collection also includes the earlier game library as a bonus. This ZIP contains solo browser builds, not an installed mobile app or a multiplayer server. For online play, get the complete source repository.

Phones/tablets should play from a hosted Safari/Chrome URL. iPhone/iPad Files/Quick Look is not a supported HTML launcher. Touch controls work in portrait and landscape. No keyboard or mouse is required. Physical iOS Safari remains untested; touch emulation was used for validation.

## Publish on your website

Use Node22+ (tested Node24). From the complete source repository:

```sh
npm ci
npm test
npm run package
npm start
```

Open `http://localhost:3000/arcade/`. The server binds to `0.0.0.0`, uses `PORT` when supplied, and serves `/health`. Production hosting needs HTTPS and WebSocket upgrades on `/arcade/socket`. One Node process hosts all games. Rooms are held in memory; restarting the process ends sessions. Use one server instance or sticky routing.

Host a room from a game, share the six-character code, and start once your friends join. Up to four players share server-owned simulation state. Each participant sends input controls, never trusted movement coordinates. Only the host starts/restarts; host responsibility transfers if they leave. Solo menus freeze gameplay; online menus stop your controls while the rest of the room continues.

For an existing site, add links to the game URLs above or embed one:

```html
<iframe src="https://YOUR-GAME-SERVER/arcade/?game=cafe"
  title="Cosmic Café" style="width:100%;height:85vh;border:0"
  allow="autoplay; fullscreen" allowfullscreen></iframe>
```

Static websites can host `ENCORE.html` or any individual HTML as `index.html` for solo play. Online multiplayer requires the Node service; static hosting alone cannot provide it.

## Controls and game loops

- **Prop Panic:** arrows/WASD move, USE collects tickets or disguises near a toy. Stay still to blend in; moving props attract attention. DECOY distracts hunters on cooldown. Collect six tickets and use checkout. Solo has three strikes; teammates can hold USE to rescue a captured hider. Hunters use visibility and obstacle-aware pursuit, after an opening grace period.
- **Midnight Heist:** hold USE at each gold panel to disable its security, tap USE to take/drop treasure, and USE by the van to bank it. SNEAK reduces detection. Sprint is noisy. Guard sightlines are blocked by walls. Hold USE to rescue detained teammates. Bank all three treasures before alarm lockdown/dawn.
- **Pocket Planet Golf:** left/right aims, forward/back fine-tunes. Hold SWING/E to charge and release to putt. Dragging the scene also adjusts aim. RESET/Space returns to the tee with a one-stroke penalty. Everyone completes the current hole before the next begins. Six holes, three themes, physical obstacles/water, lowest total wins. Scorecards appear at the end; local best is stored by strokes.
- **Cosmic Café:** pick an ingredient at the amber/green fridge, put it in an empty oven, wait for green, collect cooked food, then serve a matching order. USE is a tap, so release between steps. Clean spills, fix the blue power station, and use the trash if needed. Deliver nine meals across three shifts; four missed orders close the diner. Teammates share ovens and orders.
- **Rooftop Rush:** auto-runs; steer left/right, JUMP gaps/cyan vents, SLIDE amber beams. Forward/sprint speeds up; backward brakes. Shared checkpoints respawn falls with a time penalty. The collapse follows behind. One runner reaching the extraction gives the team a win; medals reflect performance.

Arrow keys and WASD both work. First-person original games also support J/L and I/K keyboard look. All audio starts after a player gesture, respects mute, and uses a master limiter. Best times/scores persist locally in the current browser.

## Developer map and validation

- `public/arcade/sim/{prop,heist,golf,cafe,rooftop}.js`: independent pure JSON simulations shared between server and solo browser.
- `public/arcade/games/{prop,heist,golf,cafe,rooftop}.js`: real Three.js geometry, animation, procedural textures, scene lighting.
- `public/arcade/art/encore-*.webp`: generated promotional cover illustrations, not gameplay screenshots.
- `public/arcade/app.js`, `catalog.js`, `index.html`, `style.css`: shared menus, touch input, HUD, scorecards, audio, records.
- `arcade-server.js`, `public/arcade/session.js`: room lifecycle, engine dispatch, input sanitization, authoritative snapshots.
- `scripts/build-arcade.mjs`: rebuilds self-contained HTML pages with all fonts, art, and code embedded.
- `scripts/package.py`: produces complete source ZIPs in `dist/` and the direct five-game portable ZIP in `downloads/`.
- `test/arcade-{prop,heist,golf,cafe,rooftop}.test.js`: missions/physics, failure conditions, complete win paths using interactions or input controllers. Network tests cover four-player rooms for all ten games, authority, room isolation, restart, and host migration.

Browser QA checks real WebGL gameplay and touch controls at390×844,844×390,820×1180. These are short, stylized 3D browser games, not AAA photorealistic releases. Cover art is more cinematic than procedural gameplay geometry. No public matchmaking, accounts, voice chat, reconnect recovery, or global leaderboard is included. Production hosting and testing on physical phones/remote networks are separate from the included local verification.
