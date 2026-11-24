# Pulsebox promo shorts

Vertical (1080x1920, 30 fps) short videos for TikTok, Reels and Shorts. Every frame is hand-drawn 2D SVG
(ink outlines, flat colours, a little line "boil" like hand animation). The games on screen are 2D redraws of real
Pulsebox games, made from their screenshots in `public/media/`. The voice is Kokoro (free, Apache-2.0, runs
locally): a 50/50 blend of the `af_sky` and `bf_emma` voices. Music and sound effects are synthesized in `lib/mix.py`,
so there are no samples or licences to track.

| Video | Hook | Output |
|-------|------|--------|
| `secret-dev/` | "This kid has a secret." A kid secretly builds the games; mid-video reveal that Pulsebox is real | `secret-dev/out/pulsebox-secret-game-dev.mp4` |
| `one-more-game/` | "You said one more game. That was 8 hours ago." A night of Pulsebox games, 10 PM to sunrise | `one-more-game/out/pulsebox-one-more-game.mp4` |
| `tier-list/` | "I ranked the games on a free website. #1 shocked me." S/A/B tier list, comment bait | `tier-list/out/pulsebox-tier-list.mp4` |
| `guess-the-game/` | "Only real gamers can name all 5." Five clues, 3-2-1, reveal | `guess-the-game/out/pulsebox-guess-the-game.mp4` |
| `play-with-friends/` | "Send this to the friend who thinks they're better than you." Best of five multiplayer games, room code | `play-with-friends/out/pulsebox-play-with-friends.mp4` |
| `satisfying/` | "The most satisfying video you watch today." Slow-motion money shots, satisfaction meter | `satisfying/out/pulsebox-satisfying.mp4` |
| `rage-games/` | "Do NOT play these games if you rage easily." Facecam, rage meter, cracked screen | `rage-games/out/pulsebox-rage-games.mp4` |
| `pick-a-door/` | "Pick a door. 1, 2, or 3. No switching." Game show: doors and suitcases hide games | `pick-a-door/out/pulsebox-pick-a-door.mp4` |
| `pulsebox-secrets/` | "5 things nobody tells you about Pulsebox. #5 isn't even out yet." Real features as top-secret files | `pulsebox-secrets/out/pulsebox-pulsebox-secrets.mp4` |
| `night-rules/` | "If you find this note taped to your laptop at 3:07 AM... follow the rules." A creepypasta through all 9 horror games (art in `lib/horror.js`) | `night-rules/out/pulsebox-night-rules.mp4` |

### Stuck in Pulsebox (story series)

Milo (the developer) and his best friend Jay get pulled into one of his Pulsebox games each episode and escape using
how the game really works. Three voices: the narrator is the Sky + Emma blend, Milo is `am_puck`, Jay is `am_echo`
(`voices` and `who` in `video.json`; captions are coloured by speaker). The plan and scripts are in `stories/PLAN.md`;
the shared story art (running poses, the Hollow, the raft, the mansion...) is in `lib/story.js`.

| Episode | Hook | Output |
|---------|------|--------|
| `stuck-ep1-still-here/` | "Milo made a horror game. At 2 AM, it pulled him and his best friend inside." | `stuck-ep1-still-here/out/pulsebox-stuck-ep1-still-here.mp4` |
| `stuck-ep2-blackwater/` | "Four wooden planks. No land. No boat. Just a rope hook... and a fin." | `stuck-ep2-blackwater/out/pulsebox-stuck-ep2-blackwater.mp4` |
| `stuck-ep3-heist-crew/` | "Outside a mansion. In masks. Next to a getaway van." | `stuck-ep3-heist-crew/out/pulsebox-stuck-ep3-heist-crew.mp4` |

### 3D films (The 78th Game, One Life, Five Stars, Unknown Number)

`film3d/` has 2-minute 3D shorts made with Three.js instead of 2D SVG, with comment prompts throughout. **The 78th
Game**: Jay finds a 78th game on Pulsebox and has to take three keys from Hyperlane, Deep Signal and The Endless Halls.
**One Life**: a flash-forward hook, then three games and one life (Getaway Heat, Lights Out Motel, Rooftop Rush), a
thing that copies his best friend's voice, and a twist about who was on his headset; voiced with Chatterbox for natural
voices and a male narrator. **Five Stars**: one game (Getaway Heat), all action, from cruisers to two tanks. **Unknown
Number**: a horror short where an unknown number texts Jay photos as it gets closer (his town, his street, his porch),
then "I'm in your room", and the pale man from The Endless Halls is right behind him. See `film3d/README.md`. Outputs and thumbnails are in `film3d/out/`.

Thumbnails for every video (9:16 covers and 16:9) are in `thumbnails/out/`; `node thumbnails/thumbs.js [id ...]` remakes them
from `thumbnails/thumbs.html`.

## Make or change a video

Each video folder (except `secret-dev/`, the first one, which has its own scripts) has:

- `video.json`: the voice lines (`say` is spoken, `cap` is the caption text, `gap` is the pause before the line).
- `scenes.html`: the scenes. `SC` lists `[start time, draw function, caption y]`; `CUES` lists music sections and sound effects.

```bash
bash lib/make.sh one-more-game voice                 # voice + word timings only
bash lib/make.sh one-more-game sheet 0.5 3 10 20     # preview stills in one-more-game/preview/
python3 lib/sheet.py one-more-game 0.5 3 10 20       # ...as one contact sheet
bash lib/make.sh one-more-game                       # the whole video -> one-more-game/out/
bash lib/queue.sh tier-list satisfying               # several videos, one after another
```

`lib/art.js` has the characters, props, the first six games and the caption engine; `lib/more.js` and `lib/games3.js` have
25 more games (`GAMES` maps a game id to its title and draw function; `lib/gallery.html` shows the newest 16 at once). Scenes are keyed to the voice (`VO[i]`, `wordT(line, /word/)`),
so changing a line re-times the video by itself.

Needs ffmpeg, node with Playwright (Chromium), and Python 3. `make.sh` sets up a venv with `kokoro-onnx`,
`faster-whisper`, `soundfile` and `scipy`, and downloads the Kokoro model from Hugging Face on first run.
