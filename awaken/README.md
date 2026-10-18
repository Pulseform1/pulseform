# Awaken

A phone workout app that runs your training like a game System: a Daily Quest that must be cleared, a Penalty Zone when it isn't, gates to raid for extra workouts, and stats that grow as you train.

It is a standalone installable web app: a single `index.html` with no build step, no account and no server. Progress is saved on the device.

## What's in it

- **Awakening.** Accept the System, register a name, take a quick fitness assessment (max push-ups, sit-ups and squats in one set, and how far you can run) and pick a difficulty.
- **Daily Quest: Strength Training.** Push-ups, sit-ups, squats and a run, with a countdown to the daily reset. Targets start from your assessment and climb with your level toward 100 / 100 / 100 / 10 km. Hunter difficulty starts there on day one.
  - Log reps with quick chips, or use the full-screen **tap counter** (touch the phone with your chin or nose at the bottom of each push-up).
  - Clearing it gives Status Recovery, +3 ability points, a Random Box, XP and gold.
- **Penalty Quest.** Miss a day and you are sent to the Penalty Zone: burpees (or squats in low-impact mode) and a timed plank, HP damage, a broken streak, and a Weakened debuff that halves XP until you survive. A Penalty Ward blocks it. Rest days (up to 3 a week) and your first day carry no penalty.
- **Status window.** Level, job, title, rank, HP, MP, fatigue and five stats (STR, VIT, AGI, INT, PER). Stats rise on their own from training and can also be raised with ability points. Each stat has a real effect, such as bonus XP, max HP or gold.
- **Gates.** Three gates open every day, from E-Rank to S-Rank, with Red Gates now and then. Each one is a guided circuit with waves, a boss HP bar that drops as you finish sets, rest timers, and loot.
  - Hold exercises run on a countdown with a 3-2-1 start.
  - Low-impact and pull-up-bar options change the exercise pool.
- **Hunter rank and jobs.** Reassessment Trials unlock at levels 10, 20, 30, 45 and 60. The first one lets you choose a job: Berserker, Assassin, Guardian, Sage or Ranger.
- **Runs.** GPS tracking with distance, pace and a route sketch, plus manual entry for treadmills. Runs count toward the Daily Quest.
- **Optional quests.** Three small habits a day (water, stretching, meditation and so on) that train INT, PER and VIT.
- **Items, shop and skins.** Random Boxes, Recovery Potions, Instant Dungeon Keys, Penalty Wards, Elixirs, plus System Blue, Shadow Violet and Ruler Gold skins.
- **Titles, skills and records.** Titles unlock from achievements and give a bonus while equipped; passive skills unlock from milestones. The records tab has the streak, a 12-week quest calendar, lifetime totals and a log of System messages.
- **Settings.** Difficulty, which goals are in the Daily Quest, rest days, the time the day resets, km or miles, sound, vibration, backup export and restore, and a progress reset.

## Run it locally

Any static file server works. From this folder:

```sh
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed address. The service worker (offline support) only runs over `http://localhost` or `https://`.

## Live app

**https://awaken.philip-realivasquez.workers.dev**

It is hosted as a Cloudflare Worker named `awaken`. To publish changes, bump `VERSION` in `sw.js` so installed copies pick up the update, then from this folder run:

```sh
npx wrangler deploy
```

`wrangler.jsonc` serves this folder as static files; `.assetsignore` keeps the README and config out of the upload.

## Put it on a phone

Open the live app on the phone (or host the folder on any HTTPS static host), then:

- **iPhone:** Safari, then Share, then **Add to Home Screen**.
- **Android:** Chrome menu, then **Install app**, or use the **Install app** button in Settings.

It opens full screen like a native app and works offline after the first visit.

## Ship it to the app stores

The app is plain HTML, CSS and JavaScript, so it can be wrapped with [Capacitor](https://capacitorjs.com/) without changes. Point `webDir` at this folder, then add the iOS and Android platforms. Native plugins worth adding later:

- **Local notifications** for a daily reminder before reset.
- **Background geolocation** so runs keep tracking with the screen locked.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `manifest.webmanifest` | Install metadata (name, colors, icons) |
| `sw.js` | Offline cache. Bump `VERSION` when you change the app files |
| `icons/` | App icons (SVG source and rendered PNGs) |
| `wrangler.jsonc`, `.assetsignore` | Cloudflare hosting config |

## Data and privacy

Everything is stored in the browser's local storage on the device. Location is read only while a run is being tracked, and is used to measure distance on the device. Nothing is sent anywhere. Use **Settings → Save Data** to back up or move progress to another phone.
