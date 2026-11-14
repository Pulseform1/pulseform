# Operation Ghost Town on Pulsebox

The page `public/games/operation-ghost-town.html` is built from this folder:

```
cd src/operation-ghost-town
npm ci
npm test
npx vite build
python3 ../../tools/pack-vite-game.py dist ../../public/games/operation-ghost-town.html
```

`pack-vite-game.py` inlines the Vite build (JS and CSS) into one page, like every other Pulsebox game.

Changes made for Pulsebox:
- Online rooms run over the Pulsebox room relay (`/api/room/CODE`). The first player in a room is the host and their browser
  runs the match server (`src/host-server.js`, a port of `server/index.js`). Room codes are four characters.
  `?room=CODE` (the site's Play with friends) opens the multiplayer screen with the code filled in.
  The standalone Node server in `server/` still works with the original client protocol.
- Touch controls for iPad and tablets (`src/input.js`): left-thumb stick, drag to look, on-screen buttons.
  Touch devices default to Medium graphics.
- Sounds are embedded as MP3 (`src/audio-data.js`, generated from the recordings credited in `public/audio/CREDITS.md`)
  so they play on Safari as well. The menu's Audio credits link opens an in-game credits panel.
- The title menu fits shorter screens.
