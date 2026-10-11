# Master prompt: Pulseform Classrooms (homework, live class games, question packs)

Build **Pulseform Classrooms**: a teacher-and-student mode in the spirit of Blooket and Gimkit, but built around Pulseform's rhythm gameplay. It has three parts:

1. **Teachers** make a class, get a join code, and see their students' progress.
2. **Homework:** the teacher assigns a set of levels. Each level has **2 questions** the student must answer to finish it.
3. **Live class games:** the teacher hosts a game on the projector, students join on their own devices with a PIN, and the whole class plays at once. Each mode has an **Easy** and a **Normal** setting.

Teachers can **make their own question packs**, and the game comes with ready-made music packs.

The classroom code is already listed under "Coming soon" in the What's new popup (`NEWS_SOON`). Move it to `NEWS_ADDED` when this ships.

---

## The codebase (read this first)

- **The game is one file**, `index.html`, in Pulseform1/pulseform. Work on the branch you're given and push there. Build and publish the same way as every other update:
  - `node app/scripts/build-www.mjs` (and `--email-only`, `--crazygames`), then `node app/scripts/build-cf-worker.mjs`;
  - publish the bundled worker to Cloudflare, then check the live script contains the new code.
- **Accounts:** Firebase Auth + Firestore, compat SDK 10.14.1, loaded by `fbLoad()`. Use `ACCT.user` and `ACCT.db`.
  - There is also a **Realtime Database** with its own rules in `database.rules.json`. Use it for live games (it is faster for many small updates).
- **Rules:**
  - Firestore rules live in `firestore.rules`, Realtime Database rules in `database.rules.json`.
  - Keep every existing rule.
  - Test every new rule in the Firebase emulators before handing over. The emulator jar is at `~/.cache/firebase/emulators/`, and earlier sessions used port 8089 with `@firebase/rules-unit-testing`.
  - The owner publishes rules by hand: send them the updated files and say so.
- **Levels and runs:**
  - Worlds are `THEMES` (`WORLDS` of them), with `LEVELS_PER_WORLD` = 8 levels each plus a boss.
  - Runs start with `startRun(modeFor(type, …))`.
  - Every run ends in `awardRun(o)`, which is the place to hook "level finished" for homework.
  - Rooms come from `genRoom(cfg)` with a seeded `rng`, so the same seed always gives the same room. Live games should use seeded rooms so every student plays the same map.
- **Timing:** relaxed timing (`SAVE.relaxed`) widens the hit windows by 30% and makes skipped beats free. Easy settings should switch it on for the session only, without changing the student's own setting.
- **Players and names:**
  - Every player name goes through `showName()` (it filters bad words). Use it everywhere a student name appears.
  - Friend codes are 6 letters or numbers in the `codes` collection. Reuse that code generator for class codes.
- **Saves** sync through `mergeSaves()`. Any new save field (for example `SAVE.classes`, homework progress) needs merge handling: union lists, keep the max of counters, and let the newest choice win for settings.
- **Screens:**
  - Overlays are `<section class="overlay">` elements listed in `OVS`, shown with `showOv(id)`, with phone tab mapping in `TAB_OF`.
  - Add menu buttons to the menu and to `MORE_ITEMS`.
  - Match the existing look (`.panel`, `.tabs`, `.btn`, `.item`, `.lbl`, `.eyebrow`).
- **The admin panel** (`ADM`, `admins` collection) can be used to verify teacher accounts.

---

## Safety and privacy (these are firm requirements)

Many students will be under 13. Build for that from the start.

- **Students never need an email.** A student joins with the class code and a display name. Use Firebase anonymous sign-in, or a teacher-made roster with simple PIN logins.
- **Names:**
  - filter every display name through `showName()`;
  - a teacher can rename or remove any student;
  - in live games the teacher can kick a player and turn on "first names only" or "random fun names" (for example "Purple Metronome").
- **No chat** between students anywhere in Classrooms. Reactions are limited to a few fixed emotes at most.
- **Teacher accounts** need a real sign-in (email or Google). "I'm a teacher" is self-declared, but anything public (shared question packs) needs a verified teacher. The admin verifies them from the admin panel.
- **Students' work is visible only to that student and their teacher.** Students can't read other students' answers. Firestore rules must enforce this; hiding it in the game is not enough.
- **Shared question packs** need a Report button. A reported pack is hidden until an admin reviews it.
- Keep the Notes and Shop economy **out** of class time:
  - no spending, packs or trading inside a live game or a homework run;
  - class rewards are cosmetic only (see Rewards below).
- Update `privacy.html` with what Classrooms stores and who can see it.

---

## 1. Classes

- **Teacher screen → "My classes":** create a class (name, grade, subject) and get a 6-character join code plus a share link `?class=CODE`.
- **Students:** a "Join a class" button (on the menu and in More). They enter the code, pick a display name, and they're in. A student can be in several classes.
- **Teacher dashboard for each class:**
  - the roster: rename, remove, reset a student's PIN;
  - each student's homework status, scores, accuracy on questions, and time played;
  - a "needs help" list: students below 60% on a question set.
  - an export to CSV.
- **The class code:**
  - can be regenerated;
  - can be locked ("no new students");
  - expires after a teacher-chosen date (default: end of school year).

**Suggested Firestore shape** (adjust as needed, but keep reads cheap):

- `classes/{classId}`: `{teacher, name, code, locked, createdAt, settings}`
- `classCodes/{code}`: `{classId}` (lookup, claimed once, like `codes`)
- `classes/{classId}/students/{uid}`: `{name, joinedAt}`. The student writes their own record on join; the teacher can update or delete it.
- `classes/{classId}/assignments/{aId}`: `{title, levels:[…], packId, due, settings}`
- `classes/{classId}/assignments/{aId}/work/{uid}`: per-student progress. The student writes it; the teacher reads all.
- `packs/{packId}`: question packs (see section 4)

---

## 2. Homework (2 questions per level)

- **Making an assignment.** The teacher picks:
  - **Levels:** a world, specific levels, or "any N levels".
  - **A question pack.**
  - **A due date.**
  - **Difficulty: Easy or Normal**
    - Easy: relaxed timing, no harmony loss, unlimited retries.
    - Normal: the usual rules.
  - **Question order:** in order or shuffled.
- **Each assigned level asks 2 questions:**
  - **Question 1** before the level starts, on a "warm-up" card.
  - **Question 2** after the level is cleared, before the result screen.
  - A wrong answer shows the correct one with the teacher's explanation, if given, and the student still continues. Homework should teach, not block.
  - Scoring: on Easy, a second try at a wrong answer counts for half; on Normal, one try.
- **Progress:**
  - The student sees the assignment on the menu ("Homework: 3 of 6 levels · due Friday") with a progress bar.
  - The same assignment can't be farmed: repeated levels count once, and the best run counts.
- **What the teacher gets per student:** levels finished, stars, each question right or wrong, time spent, and when it was done.
- **Offline:**
  - Answers made offline queue up and sync later.
  - Work done after the due date is marked "late", not refused.

---

## 3. Live class games (whole class, Easy and Normal)

**Hosting:**
- The teacher hosts from a laptop and projector: pick a pack, a mode, Easy or Normal, and a length (time or number of questions).
- A 6-digit game PIN plus a QR code shows on screen. Students join at pulseform.org with the PIN; no account is needed for a quick game.

**How every mode works:**
- **Questions on the student's device:**
  - The student answers a question, then plays a short rhythm burst (one seeded room, around 8–16 beats).
  - A correct answer powers up the burst; perfect hits add to it.
  - The projector shows the big picture (race track, tower, leaderboard), never anyone's wrong answers.
- **Easy vs Normal:**
  - **Easy:** no timer on questions, relaxed timing, nobody loses points, wrong answers give a gentle retry.
  - **Normal:** a question timer with a speed bonus, regular timing, streak bonuses.
- **Real-time sync:**
  - Use the Realtime Database for game state: `live/{pin}` holds settings and phase, `live/{pin}/players/{uid}` holds name and score.
  - Players write their own score only, and the host writes the phase.
  - Rate-limit and range-check scores in the rules.
  - Clean up live games after 3 hours.

**Modes to build (at least these four):**
1. **Beat Race** (individual)
   - Each correct answer plus a good rhythm burst moves your block along a track on the projector.
   - The first to the finish wins, or the furthest when time runs out.
   - Easy version: everyone who finishes gets a medal.
2. **Tempo Tower** (whole class works together)
   - Every correct answer adds a floor to one shared tower.
   - The class tries to reach a target height before the song ends.
   - Easy version: a lower target.
   - Good for warm-ups and for classes that don't want competition.
3. **Team Jam** (2–4 teams)
   - The host puts students into colour teams (automatically or by hand).
   - Correct answers add instruments to the team's song layer.
   - The team with the fullest song wins.
   - The projector plays the combined music: reuse the game's stem system (`A.stems`, `setStemTier`).
4. **Last Note Standing** (Normal only; not available on Easy)
   - Everyone starts with 3 hearts, and a wrong answer or a missed burst costs one.
   - Students who are out keep answering to earn "revive notes" for the others, so nobody sits idle.

**End of a game:**
- The projector shows the top 5 (or the class tower or winning team) with a podium.
- The teacher gets a report: accuracy per question, the hardest questions, and per-student results (saved to the class if it was hosted from a class).

---

## 4. Question packs

- **Pack editor** (teachers; students can't publish):
  - title, subject, grade, description;
  - questions of these types:
    - multiple choice (2–4 answers, one or more correct);
    - true/false;
    - type-the-answer (accepts a list of answers, ignores case and spacing);
    - **"listen" questions:** play a rhythm or interval with the game's audio, then pick the answer. Pulseform is a music game; this is its edge over Blooket.
  - an optional explanation and an optional image (a URL from an allowed list, or an upload capped in size; skip uploads for the first version if storage isn't set up);
  - import from CSV or pasted text (`question, correct, wrong1, wrong2, wrong3, explanation`), and export to CSV;
  - duplicate a pack, reorder questions, preview it as a student.
- **Who can see a pack:** private (only you), class (your classes), or public (needs a verified teacher; others can find and copy it).
- **Ready-made packs** that ship with the game:
  - note values and rests;
  - time signatures;
  - tempo words (largo, andante, allegro…);
  - dynamics;
  - rhythm counting ("which rhythm did you hear?");
  - instrument families;
  - plus one non-music sample pack (multiplication facts) so teachers see it works for any subject.
- **Limits:** up to 100 questions per pack, a size cap enforced in rules, and text filtered on publish.
- **Pack browser:** search by subject and grade, sort by most used, with a Report button.

---

## Rewards (cosmetic only)

- Students earn **class stars** for homework and live games. They show on a class page, never on the global leaderboards.
- Milestones unlock a few **classroom-only cosmetics**:
  - a "Class Act" banner;
  - a chalkboard trail;
  - titles such as "Homework Hero" and "Quiz Whiz", using the existing title system in the Locker (`TITLES`).
- No Notes, no packs, nothing that can be bought.

---

## Testing and hand-over

- **Rules tests in the emulators.** Cover at least:
  - a student can't read another student's work;
  - a student can't edit an assignment;
  - a teacher can read only their own classes;
  - a removed student loses access;
  - live scores are range-checked and rate-limited;
  - public packs need a verified teacher;
  - a reported pack is hidden.
- **Browser tests with Playwright** (Chromium is installed): one teacher page plus 4 student pages, at phone and desktop sizes.
  - Live games: join with a PIN, play each mode on Easy and Normal, reach the end screen with no errors.
  - Homework: join a class, do a homework level with both questions, and check the teacher dashboard updates.
- **Run the existing test suites** and make sure nothing else breaks.
- **Keep the code consistent:**
  - Keep the code in one clearly marked section of `index.html`, in the same style as the code around it.
  - Use plain language in every message students see (short words, no jargon).
  - Update `NEWS_ADDED`, the Help screen and `about.html`, which has a page for educators.
- **Hand over:**
  - send the owner the updated `firestore.rules` and `database.rules.json` to publish;
  - list exactly what changed and what was tested.

## Build order

1. Classes, join codes, the teacher dashboard and the rules.
2. Question packs: the editor, CSV import and the ready-made packs.
3. Homework with 2 questions per level.
4. Live games: Tempo Tower first (the simplest), then Beat Race, Team Jam and Last Note Standing.
5. Rewards, polish and the Help and About pages.

Commit and test after each step. Don't start the next step while the previous one has failing tests.
