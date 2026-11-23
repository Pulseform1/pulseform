# Pulse Stories Studio

Pulse Stories Studio makes animated text-message story videos.

1. Pick a genre and a length, or press **Generate Random Story**.
2. Edit anything in the story.
3. Watch it play on an animated phone held in two hands.
4. Export a vertical **1080 × 1920 MP4** for TikTok, Reels or Shorts.

Everything runs on your own computer, and the core features are free. The only optional paid feature is AI story writing with Claude, which needs your own Anthropic API key. Without a key, the built-in story writer works offline.

## Quick start

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
cd story-studio
npm install
npm run dev
```

Then open **http://localhost:5173**.

`npm run dev` starts two things:

- **the editor** (Vite + React) on port 5173;
- **the Studio server** on port 8787, which runs the voices, MP4 conversion and the optional AI writer.

The first time someone hears a voice, the server downloads the Kokoro voice model (about 90 MB, from Hugging Face). After that it works offline.

To serve a production build instead:

```bash
npm run build
npm start
```

The app is then at http://localhost:8787.

## What runs where (and what it costs)

| Feature | How it works | Cost / needs |
|---|---|---|
| Story writing (built-in) | 27 hand-written plots across 9 genres. Each run picks random names, details, scenes and endings, then fits the story to the length you chose. | Free, offline |
| Story writing (AI) | Claude writes a brand-new story to a strict JSON format that the editor loads. You can give it an idea. | Needs `ANTHROPIC_API_KEY`. Billed by Anthropic per story. |
| Character voices | [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M) text-to-speech running on your computer through the Studio server. 28 voices; each character gets its own. | Free, local |
| Music and sound effects | Synthesized in the browser (Web Audio): 8 music styles plus message pops, typing, stingers, glitches and heartbeats. Everything is original, with no samples, so there's nothing to license. | Free, local |
| Captions | Automatic, from the message text, with word-by-word timing and highlighted words. | Free, local |
| Video rendering | The browser draws every frame with the same renderer as the preview, encodes it with WebCodecs, and builds the MP4. | Free, local |
| MP4 audio conversion | Some browsers can't make AAC audio, so the server converts the audio with ffmpeg. The video isn't re-encoded. | Free, local (bundled `ffmpeg-static`, or your own ffmpeg) |

### Turning on AI writing (optional)

Get an API key at https://console.anthropic.com. Then start the server with the key set, on macOS or Linux:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

On Windows PowerShell:

```powershell
$env:ANTHROPIC_API_KEY="sk-ant-..."
npm run dev
```

The top bar then shows **AI writer on**, and **Write with AI (Claude)** in the Create panel works. If the key is missing, wrong or out of credit, the app says so and the built-in writer keeps working. The key stays on the server and is never sent to the browser.

## Using the dashboard

- **Create** (left):
  - choose one of 10 categories (Horror, Mystery, Comedy, Drama, Plot Twist, Suspense, School, Sci-Fi, Adventure, Random) and a length (15s, 30s, 45s, 1 min, 1:30, 2 min, 3 min);
  - generate, or press **Generate Random Story**;
  - **My stories** saves stories in this browser and imports or exports `.story.json` files. The story you're editing is autosaved.
- **Preview** (centre): the animated phone, with play/pause (Space), a scrubber marked with every message (effects in lime), mute and fullscreen.
- **Messages:**
  - edit the hook headline, the ending card and every message;
  - change a message's sender, type (text, image, deleted, missed call, system note), effect (shake, zoom, glitch, flash, lights out, heartbeat), reaction, extra pause and typing indicator;
  - reorder, duplicate, insert or delete messages; clicking a message jumps the preview to it;
  - wrap a word in `*asterisks*` to highlight it in the captions;
  - picture messages can use one of 32 built-in illustrations, or a picture you upload;
  - **🎬 Scene + narrator** messages cut away from the phone to a full-screen illustrated place while the narrator speaks: bedroom (with Pulsebox on the computer), hallway, kitchen, basement stairs, living room, front door, or Pulsebox on a computer screen. The phone dips to black and drops away, the scene plays (flickering lights, a swaying flashlight or bulb, door knocks), then the chat comes back. Tick **shadow figure** to have something appear partway through. **Say it as…** changes how the narrator pronounces a line without changing the captions (for example, "box dot pulseform dot org").
- **Cast:**
  - rename characters and set their pictures (17 built-in avatars, or upload a photo), bubble colours and voices (**Hear** plays a sample);
  - add characters to turn the story into a group chat;
  - set the chat name, status line and phone clock.
- **Style:**
  - background (9 animated scenes) and chat theme (including light mode);
  - skin tone of the hands;
  - whether the hook headline shows briefly, all the time or not at all;
  - caption style (pop, karaoke, clean subtitle, off), font, size, height and highlight colour.
- **Audio:**
  - narration on or off, narration speed, and regenerating the voices;
  - the narrator's voice (with a Hear button), speed, the **creepy narrator** effect (deeper, with a dark room echo), and whether the narrator also reads system notes;
  - music style and volume, and sound-effects volume;
  - pacing: fit to the chosen length, plus extra speed.
- **Export:** renders the MP4 with a progress bar, time remaining and a cancel button, then shows the result with a download button.

Undo and redo use Ctrl+Z and Ctrl+Y (⌘ on Mac).

## Export details

- Output: MP4, H.264 video at 1080 × 1920 and 30 fps (about 9 Mbps), with AAC audio at 48 kHz, normalised to roughly the loudness TikTok, Reels and Shorts play at.
- **Chrome / Edge on Windows or macOS, and Safari:** H.264 and AAC are encoded directly in the browser.
- **Chromium on Linux** has no AAC encoder. The browser writes Opus audio and the Studio server converts it to AAC; the video is copied, not re-encoded. Without the server you still get an MP4, but with Opus audio, and the app warns you.
- **Browsers without an H.264 encoder** (some Firefox builds) export WebM, which the server converts to MP4.
- **Speed:** in testing, a 15-second video rendered in about 22 seconds in headless Chromium on a modest cloud machine. Expect roughly 1–3× the video's length, depending on your computer.

## Honest limitations

- **AI writing hasn't been tested against the live API here.** This build environment had no Anthropic key. The server code follows the official SDK, uses structured JSON output, and handles errors (bad key, rate limit, refusal), but the first real test will be yours. If it fails, the error appears in the Create panel and the built-in writer still works.
- **Built-in stories have a natural length.** For 15 seconds to 2 minutes they fit the target closely (15s stories land at about 15–23s, 30s at about 27–31s). For **3 minutes**, some plots run out of material at about 2:20–3:00. Add messages or use AI writing for full-length stories. The preview shows target and actual length, so nothing is hidden.
- **The voices are good, but not actors.** Kokoro sounds natural, but it doesn't act out emotions like shouting or whispering on command. Changing a voice, the speed or the text regenerates that line in about a second.
- **System notes are not read aloud by default.** They're on-screen stage directions, like "The hallway light flickers". Turn on "Narrator also reads system notes" in the Audio tab to have the narrator say them. Image captions are read only if you turn that on too.
- **Scenes are a fixed set of places.** The 7 scenes are drawn in code and can't be swapped for your own pictures yet.
- **Uploaded pictures are stored in your browser.** They're shrunk to save space, but browser storage is limited (about 5 MB). If it fills up, the top bar shows **Not autosaved**; download the story with the My stories download button to keep it.
- **Narration needs the Studio server.** Opening only the Vite page, or the server being offline, means preview and export have music, sound effects and captions but no voices. The app shows this clearly.

## Tests

With `npm run dev` running:

```bash
npm run test:e2e
```

This drives the real app in a headless browser:

1. generates a story in every category plus Random;
2. edits, adds and deletes messages;
3. renames a character and uploads a profile picture and a photo attachment;
4. changes the style, plays the preview;
5. renders and downloads an MP4;
6. checks the file with ffprobe: 1080 × 1920, H.264, AAC and the expected duration, plus that narration was included and there were no browser errors.

To run it:

- It needs Playwright (`npm i -D playwright && npx playwright install chromium`).
- Set `BASE=http://localhost:5173`, or another address if you changed the port.

Other checks:

- `node tests/gen-check.mjs` tries every built-in plot at every length and reports how close each lands to its target.

## Project layout

```
src/
  App.jsx                  state, undo/redo, autosave, voices, preview mix
  components/              Create panel, Preview, and the five editor tabs
  engine/
    timeline.js            turns a story into timed events (typing, messages, captions, effects, sounds)
    renderer.js, art.js    draws a frame: background, hands, phone, chat UI, captions, effects
    scenes.js              the full-screen scene cutaways (rooms of a house, Pulsebox on a computer)
    audio.js               music + sound effects synthesis, narration mix, loudness
    voices.js              talks to the Studio server for Kokoro voices (cached)
    exporter.js            WebCodecs encoding + MP4/WebM muxing
  story/
    model.js               the story format and all option lists
    generator.js, plots/   the built-in story writer
server/
  index.js                 voices (/api/tts), MP4 conversion (/api/remux, /api/transcode), static hosting
  ai.js                    Claude story writer (/api/story)
```

## Credits and licences

- The fonts are bundled in `public/fonts`:
  - Inter: SIL Open Font License;
  - Creepster: SIL Open Font License;
  - Luckiest Guy: Apache License 2.0;
  - Permanent Marker: Apache License 2.0.
- Voices: Kokoro-82M (Apache 2.0), run with `kokoro-js`.
- The artwork (backgrounds, hands, phone, avatars, picture attachments), music and sound effects are all generated by this project's code.
