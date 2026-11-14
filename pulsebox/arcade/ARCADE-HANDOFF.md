# AFTERHOURS — website integration and Claude handoff

Five original, playable 3D games, alongside THE HOLLOW. All five support solo and online co-op for up to four players using the exact same shared simulation.

| Game | Website URL | Standalone file | Objective |
| --- | --- | --- | --- |
| Neon Overdrive | `/arcade/?game=neon` | `playable-games/NEON-OVERDRIVE.html` | All drivers finish three laps before lockdown |
| Deep Signal | `/arcade/?game=deep` | `playable-games/DEEP-SIGNAL.html` | Repair three systems, manage oxygen, extract together |
| Ashfall Arena | `/arcade/?game=ash` | `playable-games/ASHFALL-ARENA.html` | Survive five waves, upgrade, defeat the boss |
| Skybound | `/arcade/?game=sky` | `playable-games/SKYBOUND.html` | Jump/dash across 19 islands, light three beacons, reach summit |
| Chamber Zero | `/arcade/?game=chamber` | `playable-games/CHAMBER-ZERO.html` | Solve mass, laser, and magnetic gravity chambers |

## Run the full website

Use Node 22+ (tested on Node24):

```sh
npm ci
npm test
npm run package
npm start
```

Open `http://localhost:3000/arcade/`. `PORT` is configurable; the server binds to `0.0.0.0`. The original THE HOLLOW remains at `/`. `/games` redirects to the collection.

For production, host this Node service on a provider with persistent WebSocket support, HTTPS, and a reverse proxy that forwards upgrade requests. Co-op connections use `/arcade/socket` on the same origin and automatically select WSS on HTTPS. No database, accounts, external API keys, CDN, or paid game assets are required. Rooms are ephemeral in memory: deploy a single instance, or use sticky routing. Restarting the server ends rooms.

Host a co-op room from any game, share its six-character code, have friends click **JOIN A FRIEND**, and start when ready. Any player can join a running session until it ends or fills. If the host leaves, the next player becomes host. Only the host starts/restarts. The server owns movement and game state; clients send bounded controls, not coordinates. Solo pause freezes the game; online pause stops your controls while teammates continue.

## Static website / downloadable play

`AFTERHOURS.html` is the complete self-contained collection. The five files in `playable-games/` open their respective game details immediately and include all five simulations and embedded assets. Double-click on desktop for offline solo play. Host one as `index.html` on a static website for solo play on mobile Safari. Static hosting cannot run the co-op server; co-op requires the Node deployment above. Root standalone home links return to the collection; THE HOLLOW link expects the included `THE-HOLLOW.html` one level above standalone game pages.

For iPhone/iPad, use a hosted Safari URL, not Files/Quick Look. Use landscape or portrait touch controls. Hold movement arrows with one thumb and drag the right-side scene with the other. Hold the USE/FIRE button where instructed. Sprint/boost is held. Desktop keyboard supports WASD/arrows and J/L,I/K looking without a mouse; drag-to-look also works. All audio starts after a user gesture, with a mute button and a limiter.

To embed an individual hosted game on an existing page:

```html
<iframe src="https://YOUR-GAME-SERVER/arcade/?game=deep"
  title="Deep Signal" style="width:100%;height:85vh;border:0"
  allow="autoplay; fullscreen" allowfullscreen></iframe>
```

Replace the host and game ID. The player chooses solo or co-op from game details. Focus the iframe before using keyboard controls. Keep navigation, scrolling, and game server on HTTPS.

## Code map

- `public/arcade/index.html`, `style.css`, `catalog.js`: collection, covers, details, menus, touch HUD.
- `public/arcade/app.js`: fixed-step solo loop, network transport, shared input, rendering lifecycle, audio, local best-time records.
- `public/arcade/session.js`: shared engine routing and input sanitization.
- `public/arcade/sim/*.js`: five independent pure JSON simulations used in browser and Node.
- `public/arcade/games/*.js`: genuine Three.js scene geometry and animation; no creature/vehicle photo sprites.
- `public/arcade/art/`: generated cinematic cover artwork (promotional illustrations, not gameplay screenshots).
- `arcade-server.js`: four-player room lifecycle, authoritative simulation, snapshots.
- `scripts/build-arcade.mjs`: embeds scripts/fonts/art in the portable HTML files.
- `test/arcade-*.test.js`: real gameplay progression and WebSocket integration.

`npm run package` builds both THE HOLLOW and the arcade collection. Generated root HTML and individual game pages are committed so GitHub Code → Download ZIP includes playable files. `dist/` and installed dependencies remain untracked; rebuild them with the commands above.

## Validation and limits

Automated tests cover complete win paths, failure/revival, physics, puzzle actions, room capacity, host migration, server-side movement, and shared four-player state for each game. Browser checks cover every 3D scene and touch controls at phone portrait390×844, phone landscape844×390, and tablet820×1180. Physical iPhone/iPad Safari and real remote internet latency remain unverified. These are short, replayable browser games using stylized procedural 3D graphics. Cover illustrations are more cinematic than runtime geometry. There is no persistent account system, public matchmaking, built-in voice chat, reconnect recovery, or globally shared leaderboard. Best times are saved locally per browser.
