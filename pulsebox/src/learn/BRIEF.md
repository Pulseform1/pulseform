# Brief for building Pulsebox educational games

You are building lightweight 2D educational mini-games for Pulsebox, inside `/home/user/pulseform/pulsebox`.

First read: `src/learn/README.md` (the framework API), `src/learn/edu.js`, `src/learn/edu.css`, `src/learn/catalog.js`, and
the reference game `src/learn/games/math-rush.js`.

## What you may touch
- Write `src/learn/games/<id>.js` for each of your games, and new data files `src/learn/data/<name>.js` that only your games use.
- The build writes `public/games/learn-<id>.html` for you.
- Do NOT edit `edu.js`, `edu.css`, `catalog.js`, `hub.*`, `README.md`, `tools/build-learn.py`, `tools/learn-check.mjs`, other
  games' files, or anything else in the repo. If the framework lacks something, solve it inside your game file (you can add
  CSS with a `<style>` element your game creates) and say so in your report.
- Do not run git commit, push or any git command that changes state. Other helpers are building other games at the same
  time in the same folder.

## Build and check
- Build: `python3 tools/build-learn.py <id> [<id> ...]`
- Check: `node tools/learn-check.mjs <id> [<id> ...]`. It must end with `all checks passed`. It opens each page on a desktop
  and a phone (390 px wide). It plays every level to its end screen by calling `EDU.bot()` every 60 ms, with clocks at
  12× speed (`?speed=12`). It checks that `EDU.miss()` does not score, and that restart and menu work.
- Look at your games: run the check with `SHOTS=<a scratch folder>` and open the PNGs (menu, play, end, phone) with
  the Read tool. Fix anything that looks broken, cramped, overlapping, unreadable or plain.

## Every game must have
- The framework's start screen (it is automatic) with clear `how` instructions (3 to 5 short lines).
- At least 3 levels (`levels`), with difficulty that genuinely rises (content and pace).
- Score (through `c.right`, `c.add`), plus progress, lives or a timer as fits.
- Restart and menu (both automatic), and a real end. Call `c.end({ won, title, msg, stats, learnt })`. `won: true` means
  the level was cleared. `learnt` is a short list of facts from the round worth remembering.
- Random challenges every round, so replays differ.
- Smooth, light 2D animation and juicy feedback, so it feels like a game and not a worksheet. That means a goal and
  stakes (a timer, lives, enemies or a race), motion, and pops, flashes and streaks.
- Mouse, keyboard and touch all fully working. On touch, every target is at least 44 px.
- It fits a 390 px wide phone with no sideways scrolling, and also works on a desktop and a Chromebook.

## Accuracy
These are real educational games. Every fact, answer, spelling and definition must be correct. Double-check each one.
Prefer fewer facts you are certain of over many you are not. Avoid facts that change over time (such as the number of
moons a planet has) or that are disputed (such as countries with more than one capital).

## Limits
- 2D only. No image, audio or font files. No libraries or CDNs.
- Draw with DOM and CSS, inline SVG, or canvas.
- Aim for each game file under ~30 KB. Data files may be a little larger, but keep them lean.
- A round lasts 1 to 4 minutes for a person.

## bot and miss
- `bot(c)` makes exactly one correct move each time it is called (click the right button, place the right tile, take one
  step on the solution path...). Called every 60 ms, it must reach the end screen of every level within about 90 s.
  Game delays made with `c.after` run in real time, so keep them under about 0.8 s.
- `miss(c)` makes one wrong move that scores nothing. Include it whenever the game has wrong moves.
- Both are only for the automated checks. A person must also be able to finish every level.

## Report back
For each game, give 2 or 3 lines on how it plays and what the levels are, its file size, and the result of the check.
Also list any fact you were unsure of and what you did about it (verified it or left it out).
