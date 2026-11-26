# Pulsebox 3D films

Vertical 3D short films (about 1:30 to 2:00) for TikTok, Reels and Shorts (1080x1920, 30 fps), built with Three.js and rendered
in headless Chromium. Each ends on Pulsebox (77 free games, box.pulseform.org, play it on a computer) and stop for
comment prompts ("COMMENT BELOW") along the way.

| Film | Output | Thumbnails |
|------|--------|------------|
| **The 78th Game** (1:59.6) | `out/pulsebox-the-78th-game.mp4` | `out/the-78th-game-9x16.png`, `out/the-78th-game-16x9.png` |
| **One Life** (1:58.0) | `out/pulsebox-one-life.mp4` | `out/one-life-9x16.png`, `out/one-life-16x9.png` |
| **Five Stars** | `out/pulsebox-five-stars.mp4` | `out/five-stars-9x16.png`, `out/five-stars-16x9.png` |
| **Unknown Number** (2:00) | `out/pulsebox-unknown-number.mp4` | `out/unknown-number-9x16.png`, `out/unknown-number-16x9.png` |
| **The Vault** | `out/pulsebox-the-vault.mp4` | `out/the-vault-9x16.png`, `out/the-vault-16x9.png` |
| **Iron Gramps** | `out/pulsebox-iron-gramps.mp4` | `out/iron-gramps-9x16.png`, `out/iron-gramps-16x9.png` |

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

**Five Stars.** One game, start to finish: Getaway Heat, where the longer you survive the more stars you get. The
hook opens on a tank barrel aimed at Jay's car and the shell hitting ("He's seventeen seconds from the record... and
that's a tank."), then cuts back two minutes. A live timer counts toward his best friend Maya's record (4:57) for the
whole film while the game escalates the way it really does: cruisers, a near miss with a bus, SWAT trucks that ram
(he grabs a shield), a roadblock with spike strips (nitro off a ramp, over all of them), a police helicopter at five
stars (an EMP takes it down), an army tank, the record, and then a second tank. A police dispatcher on the radio calls
each escalation.

**Unknown Number.** A horror short. At 2:47 AM Jay is playing The Endless Halls when a number he doesn't know texts
him a photo of his town's sign: "I'm in your town." He laughs it off ("Okay... very funny"), texts back "lol nice try",
puts the phone face down and goes back to the game: it's probably his friend Maya. Five minutes later, a photo of his
street sign. The laugh doesn't last. Then ten minutes of nothing, and he can't sit still: he texts again (nothing),
checks the street through the blinds, calls the number (it just rings), sits on the bed with his knee bouncing while
the clock creeps to 3:01. At 3:02, his own front porch with the house number on it. He wedges a chair under the door
handle, locks it, kills the lights, grabs a bat and hides behind the bed. "I'm in your house." The pans crash down in
the kitchen. He creeps down the stairs one step at a time and finds nothing. "I'm in your room." He creeps back up,
eases his door shut, leans on it and breathes. Something breathes in behind him. He turns, and his flashlight
flickers: the tall pale man from The Endless Halls is in the corner; off; on, and it's closer, head tilted; off; on, and
it lunges into the lens with its jaw torn open, shrieking. The video pauses on the jump scare ("What happens next? Comment it."). The number (555), the town
(Cedar Hollow) and the address (1407) are made up.

**The Vault.** A heist, told by the narrator. Nobody has ever opened the vault in Safecracker (1,284,907 attempts, 0
opened). Jay goes in; his best friend Maya runs the security cameras from her house. Ninety seconds on the clock:
past a guard with a flashlight, through a corridor of lasers that change every three seconds, the cameras frozen for
twenty seconds, then the dial (17, 42, 8). The door swings open on a room full of gold... and every alarm in the
building goes off. A steel gate slams down behind him: ten seconds, a red door and a blue door, one way out and one
trap. The video pauses on the choice ("Red door, or blue door? Comment it.").

**Iron Gramps.** A feel-good mystery. Every night at nine, a player called IronGramps beats Jay at Hyperlane, always by
inches. Jay practices every day after school; IronGramps keeps winning, and starts sending weirdly nice messages ("nice
try kiddo", "eat your vegetables", "bedtime soon"). One night, right as Jay loses, someone cheers downstairs. It's
Grandpa: 71 years old, giant headset, doing a victory dance, with a notebook of Hyperlane notes ("the kid brakes too
early"). He'd been practicing for months so Jay would play with him. That night they race side by side, Jay finally
wins, and Grandpa winks ("Did Grandpa let him win? Comment it.").

## Layout

- `src/main.js`: timeline, renderer, exporter. Pick a film with `?film=<id>` (default `the-78th-game`).
- `src/films/<id>/shots.js` (every shot: set, camera, animation, overlay state) and `score.js` (music and sound effects).
- `public/films/<id>/script.json` (the voice lines: `text` is spoken, `cap` is the caption, `gap` the pause before it,
  `shot` the shot it plays over, `prompt` a comment card) and `public/films/<id>/vo/` (the recorded lines).
- `src/sets/`: bedroom, the bank in Safecracker (`bank.js`: lobby, guard, lasers, cameras, vault, gold, alarm, two doors),
  Grandpa's living room (`livingroom.js`), the night street and Jay's house from outside (`outside.js`), the kitchen, stairs and
  landing (`house.js`), hub + tunnel, Hyperlane, Deep Signal, The Endless Halls, the Getaway Heat street (plus
  `getaway.js`: SWAT trucks, a roadblock and ramp, a helicopter, tanks, traffic, power-ups, explosions), the Lights
  Out Motel booth, the Rooftop Rush roofs, and the Pulsebox ending. `src/jay.js` (Jay, Maya, the copy; poses),
  `src/creatures.js` (the crawler, the drone, the pale man), `src/phoneui.js` (a phone with a lock screen and a
  message thread, drawn live as a texture), `src/overlay.js` (captions, comment cards, HUDs, ending text),
  `src/audio.js` (instruments, voice treatment, the mix).

## Voices

- **The 78th Game**: Kokoro (`af_heart` narrator, `am_fenrir` Jay; the game and the copy are slowed and ring-modulated).
  `node tools/voices.mjs the-78th-game` regenerates them through the Story Studio TTS server.
- **One Life** and **Five Stars**: [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT), which sounds like real people talking.
  Each speaker is steered by a short reference clip in `voices/refs/` made with Kokoro's built-in voices (deep male
  narrator from `am_onyx`, Jay from `am_eric`, Maya from `af_heart`, the dispatcher from `af_bella`), so no real person's voice is copied. Every take
  is transcribed and checked against the script; a take that doesn't match is redone. Chatterbox marks everything
  it generates with its inaudible Perth watermark. No pitch effects: Maya's lines get a light headset tone, the phone
  call a phone tone, the thing outside the motel is heard through the glass, and the dispatcher is on a police radio.

```bash
uv venv -p 3.11 .venv-tts && . .venv-tts/bin/activate
uv pip install torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install chatterbox-tts==0.1.7 faster-whisper "setuptools<81"
python tools/voices_chatterbox.py one-life            # about 15 minutes on 4 CPU cores
```

- **Unknown Number**, **The Vault** and **Iron Gramps**: [Dia](https://github.com/nari-labs/dia) (Apache-2.0), which performs lines like a person would,
  with real breaths, nervous laughs and gasps. Jay's voice prompt (`voices/refs/jay-dia.wav`) was generated by Dia from
  a random seed; the narrator's (`voices/refs/narrator-dia.wav`) is two of his earlier Chatterbox lines, so he keeps the
  same deep voice with a more human delivery. Neither is a real person's voice. `python tools/voices_dia.py
  unknown-number` re-voices every line (about 20x real time on 4 CPU cores).

## Recorded sound effects

Unknown Number's kitchen crash (`public/films/unknown-number/sfx/pans.wav`) is layered from real recordings of metal
pots, pans and lids falling and clattering, all CC0 (public domain) clips from [FSD50K](https://zenodo.org/record/4060432)
/ Freesound: 113208, 12833, 321643, 146335, 51105, 321203, 336521. A film lists its recorded effects in script.json
(`"sfx": ["pans"]`) and its score plays them with `sample(name, time, { gain, pan })`.

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
