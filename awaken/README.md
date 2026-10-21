# Awaken

A phone workout app that runs your training like a game System: a Daily Quest that must be cleared, a Penalty Zone when it isn't, gates to raid for extra workouts, and stats that grow as you train.

It is an installable web app: a single `index.html` with no build step and no account. Progress is saved on the device. A small optional server (`server/`) adds encrypted cloud saves and daily reminders, and `native/` wraps the same app as an Android APK you can install without a store.

## What's in it

- **Awakening.** Accept the System, register a name, sign the Player Contract with your finger (the System seals it), take a quick fitness assessment (max push-ups, sit-ups and squats in one set, and how far you can run) and pick a difficulty.
- **Daily Quest: Strength Training.** Push-ups, sit-ups, squats and a run, with a countdown to the daily reset. Targets start from your assessment and climb with your level toward 100 / 100 / 100 / 10 km. Hunter difficulty starts there on day one.
  - Log reps with quick chips, or use the full-screen **tap counter** (touch the phone with your chin or nose at the bottom of each push-up).
  - Clearing it gives Status Recovery, +3 ability points, a Random Box, XP and gold.
- **Penalty Quest.** Miss a day and you are sent to the Penalty Zone: burpees (or squats in low-impact mode) and a timed plank, HP damage, a broken streak, and a Weakened debuff that halves XP until you survive. A Penalty Ward blocks it. Rest days (up to 3 a week) and your first day carry no penalty.
- **Status window.** Level, job, title, rank, HP, MP, fatigue and five stats (STR, VIT, AGI, INT, PER). Stats rise on their own from training and can also be raised with ability points. Each stat has a real effect, such as bonus XP, max HP or gold.
- **Gates.** Three gates open every day, from E-Rank to S-Rank, with Red Gates now and then. Each one is a guided circuit with waves, a boss HP bar that drops as you finish sets, rest timers, and loot.
  - Hold exercises run on a countdown with a 3-2-1 start.
  - Low-impact and pull-up-bar options change the exercise pool.
- **Gate battles.** Every round of a gate is a wave with its own enemy, minions first and then the boss, each with its own HP bar.
  - **Strikes:** every set you finish strikes the enemy. You see the damage number, slashes, sparks and your equipped weapon swinging. The last set of a wave always lands the finishing blow.
  - **Combos:** finishing sets at their target builds a combo.
  - **Rewards:** each cleared wave pays out on the spot with a celebration, and the payout grows wave by wave: wave *k* pays *k* × 12% of the gate's clear XP and gold, up to +50% more with a combo, plus a growing chance of a chest or gear.
  - **The boss:** the boss arrives with a warning, enrages at low HP, and plays a defeat before the clear rewards.
- **Hunter rank and jobs.** Reassessment Trials unlock at levels 10, 20, 30, 45 and 60. The first one lets you choose a job: Berserker, Assassin, Guardian, Sage or Ranger.
- **Runs.** GPS tracking with distance, pace and a route sketch, plus manual entry for treadmills. Runs count toward the Daily Quest.
- **Joint recovery (Recover tab).** A daily check-in for knees, shoulders, lower back, hips, ankles & feet, wrists & elbows and neck: OK, Sore or Hurts.
  - Gates and the Penalty Quest always avoid a flagged joint. The Daily Quest only changes if you allow it: each new flag asks "Adapt my Daily Quest?", and you can switch it later from the joint's row.
  - **Sore (if allowed):** Daily Quest goals that load the joint are swapped for joint-friendly versions (wall push-ups, dead bugs, glute bridges, a brisk walk timed at 10 minutes per km of the run goal). Gates and the Penalty Quest leave out exercises that load it.
  - **Hurts:** the joint's warning signs come up first. Once you confirm none apply, its recovery session becomes the day's main task and clears the Daily Quest; other goals turn optional, there is no penalty, and any Penalty Quest is paused.
  - Guided 8–12 minute recovery sessions for each joint and for the full body, recovery habits, and a "when to get help" section with red flags. Flags last 3 days, then the app asks again; long-running flags prompt a check by a physio or doctor.
- **Optional quests.** Five a day from a pool of 40 (water, stretching, meditation, daylight, journaling and so on) that train INT, PER, VIT, AGI and STR. Swap one per day; clearing all five pays a Full Discipline bonus.
- **Items, equipment and shop.** Random Boxes, Recovery Potions, Instant Dungeon Keys, Penalty Wards, Elixirs, XP Scrolls, Stamina Draughts, Gate Compasses and Joint Balms. Weapon, armor and accessory slots with 14 pieces of gear (from the shop, gate drops and boxes), a daily 30%-off deal, and six System skins.
- **Shadow Army.** After you defeat a gate boss you can try to extract its shadow (Arise, 20 MP). Each of the 29 shadows gives a small bonus that grows with duplicates, capped at +25% per bonus type.
- **Shadow summons.** Inside a gate, summon one shadow from your army (5 MP). It strikes the boss at once and raises that gate's clear XP and gold by 10–40%, depending on its grade and level.
- **Weekly and monthly quests.** Three of each, such as "Clear the Daily Quest 5 times" or "Do 400 push-ups (any kind)". Targets scale with your Daily Quest. Each one you claim pays XP and gold, and claiming all three pays a bonus (Random Boxes and a key each week; an Elixir and a Penalty Ward each month). Finished quests you forget to claim are paid when the period ends.
- **Streak Freezes.** Every 7-day streak earns one, up to 2. A Streak Freeze covers one missed day before a Penalty Ward is used.
- **Login rewards and events.** A 7-day login reward cycle. Red Gate Week runs on days 1–7 of each month: one gate a day is red, and red gates drop an extra box. Weekends are Double XP Weekends, which double gate clear XP.
- **Progress and re-tests.** The Records tab charts weekly volume over 8 weeks (push-ups, core, legs, distance) and lists personal bests (best set and best day). Every 4 weeks a Reassessment Test re-measures you, compares the results with earlier tests and updates your goals.
- **Calories burned.** The Quest window shows calories burned today, with a bar toward what the full Daily Quest burns. Every set you log adds to it, from the Daily Quest, gates, the penalty or recovery. Gate clears report their calories. Records adds a weekly calories chart and a lifetime total. The estimate is MET × body weight × time: each exercise has a MET value and seconds per rep, and running counts about 1 kcal per kg per km. Body weight is an optional setting; without it the app assumes 70 kg.
- **Titles, skills and records.** Titles unlock from achievements and give a bonus while equipped; passive skills unlock from milestones. The Records tab also has the streak, a 12-week quest calendar, lifetime totals and a log of System messages.
- **Reminders (optional).** A notification 1–8 hours before the reset when the Daily Quest isn't done. Nothing is sent on rest days, on recovery days, or once the quest is cleared. On the web this uses Web Push from the server; in the Android app the reminders are scheduled on the phone.
- **Cloud save (optional).** No account: Awaken gives you a private 24-character code. The save is encrypted on the device with that code (AES-GCM) before upload, so the server only ever holds data it can't read. Enter the code on another device, or on the first screen of a new phone, to load and keep syncing. If two devices both changed, you choose which to keep.
- **Settings.** Difficulty, which goals are in the Daily Quest, rest days, the time the day resets, km or miles, sound, vibration, reminders, cloud save, backup export and restore, and a progress reset.

## Installed-app extras

What an installed web app can get differs by platform. Everything below is feature-detected, so unsupported platforms simply skip it.

| Platform | Home-screen widget | Long-press / right-click shortcuts | Icon badge (goals left) |
| --- | --- | --- | --- |
| iPhone / iPad | Not possible for web apps (needs a native app) | No | Yes, after allowing notifications |
| Android (Chrome) | Not possible for web apps (needs a native app) | Yes | No |
| Windows 11 (Edge) | Yes: a Daily Quest card in the Widgets Board (Microsoft calls it experimental; the Microsoft Store build via PWABuilder is the reliable route) | Yes | Yes |
| Windows (Chrome), macOS, ChromeOS | No | Yes | Yes |

The page writes a small snapshot of today's quest to Cache Storage; the service worker renders the Windows widget from it and refreshes it after the daily reset with periodic background sync where available. Real iPhone and Android home-screen widgets need the Capacitor wrapper below plus a native widget (WidgetKit on iOS, App Widgets on Android).

## Recovery content

The recovery moves, habits, joint-friendly swaps and warning signs were drafted from current physiotherapy guidance (load management, the 0–10 pain-monitoring rule, isometrics and gentle mobility), then checked by a clinical-safety review and a usability review before going in. It is general guidance for everyday aches from training, not a diagnosis or treatment, and the app says so. The content lives in the `RECOVERY` constant in `index.html`.

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

`wrangler.jsonc` serves this folder as static files, sends `/api/*` to `server/worker.js`, and runs the reminder cron every 15 minutes. `.assetsignore` keeps the README, server code and Android project out of the upload.

### The server (`server/`)

`server/api.js` is about 200 lines. It has one SQLite-backed Durable Object, `Store`, that holds:

- **cloud saves:** keyed by a SHA-256 of the player's code, stored encrypted, with a revision number for conflict checks;
- **reminder subscriptions:** push endpoint, time zone, reset hour, hours before the reset, rest days, and the last sent or skipped day.

Endpoints:

| Method and path | What it does |
| --- | --- |
| `GET /api/push/key` | VAPID public key |
| `POST /api/push/subscribe`, `/state`, `/unsubscribe`, `/test` | Manage a reminder subscription |
| `GET` / `PUT` / `DELETE /api/sync/<id>` | Read, write (with `base` revision; `409` on conflict) or delete a cloud save |

Reminders are Web Push messages without a payload. The service worker writes the text from the app's own quest snapshot, so no workout data reaches the server or the push service.

Reminders need a VAPID key pair once:

```sh
node -e "const {subtle}=require('crypto').webcrypto;subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign']).then(async k=>{const j=await subtle.exportKey('jwk',k.privateKey);console.log('PUBLIC',Buffer.from(await subtle.exportKey('raw',k.publicKey)).toString('base64url'));console.log('PRIVATE',JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d}))})"
npx wrangler secret put VAPID_PRIVATE_JWK   # paste the PRIVATE line
```

Then put the PUBLIC value in `VAPID_PUBLIC` in `wrangler.jsonc`, and set `VAPID_SUBJECT` to a `mailto:` or `https:` contact. Changing the keys later signs out every existing reminder subscription; players just turn reminders on again.

### Custom domain

To serve Awaken from your own domain instead of `workers.dev`:

1. Add the domain to Cloudflare. It has to use Cloudflare's nameservers.
2. Add a route in `wrangler.jsonc`: `"routes": [{ "pattern": "awaken.example.com", "custom_domain": true }]`.
3. Run `npx wrangler deploy`. Cloudflare creates the DNS record and certificate.

Then:

- Change `API` in `index.html` (the line under "cloud save & reminders") to the new address. The Android app uses that address to reach the server.
- Rebuild the APK.

Installed web apps keep working from the old address. A new address is a separate app to the browser, so players install it again. Their progress moves over with a cloud save code or a backup.

## Put it on a phone

Open the live app on the phone (or host the folder on any HTTPS static host), then:

- **iPhone:** Safari, then Share, then **Add to Home Screen**.
- **Android:** Chrome menu, then **Install app**, or use the **Install app** button in Settings.

It opens full screen like a native app and works offline after the first visit.

## Android app without a store (`native/`)

`native/` wraps the same `index.html` with [Capacitor](https://capacitorjs.com/) into an Android APK that people install directly. Compared with the installed web app, it adds:

- **runs that keep tracking with the screen off:** background geolocation, with a "tracking your run" notification while a run is active;
- **reminders without a server:** local notifications scheduled on the phone, for the next 7 days, refreshed every time the app saves;
- **the Android back button:** it closes pop-ups and screens before leaving the app.

The web app checks `window.Capacitor` and uses these only inside the APK.

**Install it:** on the phone, open **https://awaken.philip-realivasquez.workers.dev/awaken.apk**, or tap **Download the Android app** in Settings when the web app is open in an Android browser. Open it, allow "Install unknown apps" for your browser when Android asks, and tap Install. Updates install over the old version, keeping progress, as long as they are signed with the same key.

**Build it** (needs Node, JDK 21 and the Android SDK with platform 36). Copy the result to `awaken.apk` in this folder before deploying, and it is served at `/awaken.apk` (git ignores it):

```sh
cd native
npm install
python3 make-res.py          # launcher icons and splash from ../icons
npm run apk                  # copies the web app into www/, syncs, builds
# -> android/app/build/outputs/apk/release/app-release.apk
```

**Signing:**

- Release builds are signed with the key named in `native/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`).
- Keep the keystore and that file out of git (`.gitignore` already does) and back them up.
- Android only installs an update when it is signed with the same key. Losing the key means everyone has to uninstall and reinstall.
- A new key: `keytool -genkeypair -keystore awaken-release.keystore -alias awaken -keyalg RSA -keysize 4096 -validity 10000`.

**iPhone without the App Store:** Apple doesn't allow a real one for most people. The home-screen web app is the way to go on iPhone, and reminders work there on iOS 16.4 and later. The alternatives:

- **AltStore or SideStore with a free Apple ID:** the app has to be re-signed every 7 days.
- **A paid developer account:** ad-hoc installs on up to 100 registered devices.
- **An alternative app marketplace:** EU only.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `manifest.webmanifest` | Install metadata (name, colors, icons, shortcuts, Windows widget) |
| `sw.js` | Offline cache and Windows widget. Bump `VERSION` when you change the app files |
| `icons/` | App icons (SVG source and rendered PNGs) and `shortcuts/` icons |
| `widgets/` | Windows widget: Adaptive Card template, default data and picker screenshot |
| `privacy.html` | Awaken's privacy page |
| `server/` | Optional API: cloud saves and reminders (`api.js`), wrangler entry (`worker.js`) |
| `native/` | Android app (Capacitor project, icon script, signing config template) |
| `wrangler.jsonc`, `.assetsignore` | Cloudflare hosting config |

## Data and privacy

Everything is stored on the device. Location is read only while a run or walk is being tracked, and is used to measure distance on the device. Nothing leaves the device unless the player turns on:

- **cloud save:** an encrypted save the server can't read;
- **reminders:** a push endpoint, time zone, reset hour, rest days, and whether today is done.

The full details are on the privacy page (`privacy.html`, linked from Settings → About). Use **Settings → Save Data** to back up or move progress to another phone.
