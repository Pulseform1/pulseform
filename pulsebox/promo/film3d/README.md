# Pulsebox 3D films

Two-minute vertical 3D short films for TikTok, Reels and Shorts (1080x1920, 30 fps), built with Three.js and rendered
in headless Chromium. Both end on Pulsebox (77 free games, box.pulseform.org, play it on a computer) and stop for
comment prompts ("COMMENT BELOW") along the way.

| Film | Output | Thumbnails |
|------|--------|------------|
| **The 78th Game** (1:59.6) | `out/pulsebox-the-78th-game.mp4` | `out/the-78th-game-9x16.png`, `out/the-78th-game-16x9.png` |
| **One Life** (1:58.0) | `out/pulsebox-one-life.mp4` | `out/one-life-9x16.png`, `out/one-life-16x9.png` |

**The 78th Game.** At 3:07 AM a 78th tile appears on Pulsebox: "PLAYER ONE. WE'VE BEEN WAITING." Jay clicks it, falls
into a coliseum of 77 game doors, and has to take three keys from Hyperlane, Deep Signal and The Endless Halls. A copy
of him is waiting at the exit. He wakes at dawn; that night the tile comes back for PLAYER TWO.

**One Life.** Opens on a flash-forward (Jay sprinting across a rooftop in a storm, something crawling right behind
him: "He has one life left... and it's right behind him."), then rewinds two hours. A hidden Pulsebox mode, *three
games, one life, no saves*, while his friend Maya is on his headset. **Getaway Heat**: a three-star chase where the
cruisers have no drivers, ending under a jackknifed truck. **Lights Out Motel**: Jay is the night clerk and the rule
is only give keys to humans; at 3 AM "Maya" knocks on the glass while the real Maya says on the headset "that's not
me", and the smile keeps getting wider. **Rooftop Rush**: the drone, the crawler, the biggest gap in the game. At
sunrise Maya calls: she was asleep all night and never on. So who was on his headset? Then a knock on his bedroom door.

## Layout

- `src/main.js`: timeline, renderer, exporter. Pick a film with `?film=<id>` (default `the-78th-game`).
- `src/films/<id>/shots.js` (every shot: set, camera, animation, overlay state) and `score.js` (music and sound effects).
- `public/films/<id>/script.json` (the voice lines: `text` is spoken, `cap` is the caption, `gap` the pause before it,
  `shot` the shot it plays over, `prompt` a comment card) and `public/films/<id>/vo/` (the recorded lines).
- `src/sets/`: bedroom, hub + tunnel, Hyperlane, Deep Signal, The Endless Halls, the Getaway Heat street, the Lights
  Out Motel booth, the Rooftop Rush roofs, and the Pulsebox ending. `src/jay.js` (Jay, Maya, the copy; poses),
  `src/creatures.js` (the crawler, the drone), `src/overlay.js` (captions, comment cards, HUDs, ending text),
  `src/audio.js` (instruments, voice treatment, the mix).

## Voices

- **The 78th Game**: Kokoro (`af_heart` narrator, `am_fenrir` Jay; the game and the copy are slowed and ring-modulated).
  `node tools/voices.mjs the-78th-game` regenerates them through the Story Studio TTS server.
- **One Life**: [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT), which sounds like real people talking.
  Each speaker is steered by a short reference clip in `voices/refs/` made with Kokoro's built-in voices (deep male
  narrator from `am_onyx`, Jay from `am_eric`, Maya from `af_heart`), so no real person's voice is copied. Every take
  is transcribed and checked against the script; a take that doesn't match is redone. Chatterbox marks everything
  it generates with its inaudible Perth watermark. No pitch effects: Maya's lines get a light headset tone, the phone
  call a phone tone, and the thing outside the motel is heard through the glass.

```bash
uv venv -p 3.11 .venv-tts && . .venv-tts/bin/activate
uv pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install chatterbox-tts==0.1.7 faster-whisper "setuptools<81"
python tools/voices_chatterbox.py one-life            # about 15 minutes on 4 CPU cores
```

## Make a film

```bash
npm install
npx vite --port 5300                                   # live preview: http://localhost:5300/?film=one-life
npx vite build && npx vite preview --port 5301 --strictPort &
node tools/render.mjs one-life                         # about an hour on CPU -> out/pulsebox-one-life.mp4
node thumbs/thumb.mjs one-life                         # thumbnails from thumbs/one-life.html
```

`tools/render.mjs` renders the soundtrack and every frame in the page (WebCodecs H.264) in 10-second pieces
(`out/seg/<film>/`), then joins them and re-encodes with x264 and AAC at -14 LUFS. If a render is interrupted, run
the same command again: finished pieces are kept (randomness is seeded, so every page load draws the same world).
Delete `out/seg/<film>/` and `out/pulsebox-<film>.wav` after changing a film. If the MP4 comes out over 100 MB
(GitHub's file limit), re-encode the raw file with two-pass x264 at about 5.8 Mbps.
