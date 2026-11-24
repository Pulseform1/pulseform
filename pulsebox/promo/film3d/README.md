# The 78th Game (3D)

A 2-minute (1:59.6) vertical 3D short film for TikTok, Reels and Shorts, 1080x1920 at 30 fps. Output:
`out/pulsebox-the-78th-game.mp4`. Thumbnails: `out/the-78th-game-9x16.png` and `out/the-78th-game-16x9.png`.

**Story.** Pulsebox has 77 free games. At 3:07 AM a 78th tile appears: "PLAYER ONE. WE'VE BEEN WAITING." Jay clicks it
and falls into a coliseum of 77 glowing game doors. The game gives him three keys to find in three real Pulsebox games:
**Hyperlane** (a neon sky highway, a rival, Overdrive, and the road ends), **Deep Signal** (sonar in the dark and an eye
the size of a house) and **The Endless Halls** (the Watcher moves when the lights flicker). Back in the hub every door
has gone dark except the EXIT, and a copy of Jay is waiting there: "The last player who clicked." He escapes, wakes
at his desk at dawn, and that night the tile comes back for **PLAYER TWO**. Ends on Pulsebox: 77 free games, racing,
horror, heists, sports, free at box.pulseform.org, play it on a computer.

**Comment bait.** Five prompts with a "COMMENT BELOW" card: would you click it (yes/no), which game would you run into
first, would you ping again, how long could you go without blinking, who is the copy (your theory), and "tag a friend
who'd click it" at the end. A key counter and world title cards keep score while he's inside.

## How it's made

- **3D**: Three.js, rendered in headless Chromium (WebGL through SwiftShader). Sets are in `src/sets/`: the bedroom
  (moonlight through blinds, the Pulsebox site on the monitor), the hub (77 doors with each game's tile, a mirror floor,
  the hologram "78"), Hyperlane, Deep Signal, The Endless Halls, and the ending (a Pulsebox cube with orbiting game
  tiles). Jay and the copy are rigged from primitives in `src/jay.js`. Every camera move is in `src/shots.js`.
- **Overlay** (`src/overlay.js`): pop captions, comment cards, the key HUD, the ending text, grain and vignette.
- **Voices**: Kokoro (free, runs locally). Narrator `af_heart`, Jay `am_fenrir`, the 78th game `am_onyx` and the copy
  `am_fenrir`, both slowed and ring-modulated. Lines are in `public/script.json` (`text` is spoken, `cap` is the
  caption, `gap` is the pause before the line, `shot` is the shot it plays over).
- **Sound** (`src/audio.js`): the score (piano and drones, a braam, 140 bpm synthwave for Hyperlane, an upbeat ending)
  and every sound effect are synthesized, so there is nothing to license.

## Make it

```bash
npm install
node tools/voices.mjs                 # only if you change the lines (needs the Story Studio TTS server on :8787)
npx vite --port 5300                  # live preview at http://localhost:5300 (window.film.frame(t) draws time t)
npx vite build && npx vite preview --port 5301 --strictPort &
node tools/render.mjs http://localhost:5301/ out/pulsebox-the-78th-game.mp4   # about an hour on CPU
node thumb.mjs                        # thumbnails
```

`tools/render.mjs` renders the soundtrack and all 3,587 frames in the page (WebCodecs H.264) in 10-second pieces
(`out/seg/`), then joins them and re-encodes with x264 and AAC at -14 LUFS. If a render is interrupted, run the same
command again: finished pieces are kept (randomness is seeded, so every page load draws the same world). Delete
`out/seg/` and `out/*.wav` after changing the film. Render from the built page (`vite preview`), not the dev server, so a file change
can't reload the page halfway through.
