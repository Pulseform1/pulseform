# Pulseform for the App Store and Google Play

This folder turns the game into real iPhone/iPad and Android apps with **Capacitor**: a native app shell that runs
`../index.html` inside the phone's own web engine. The game code stays the same file you already upload; this folder
only packages it.

```
app/
  capacitor.config.json   app name, app ID, sign-in plugin settings
  scripts/build-www.mjs   copies the game into www/ (with the multiplayer library built in)
  ios/                    the Xcode project (open this on a Mac)
  android/                the Android Studio project
  resources/              the app icon and splash screen the store icons are made from
```

## What you need

| | iPhone / iPad | Android |
|---|---|---|
| Developer account | Apple Developer Program, $99 a year | Google Play Console, $25 once |
| Computer | A Mac with Xcode (free from the Mac App Store) | Any computer with Android Studio |
| Also | Node.js 20 or newer | Node.js 20 or newer |

No Mac? A cloud build service (for example Codemagic or Ionic Appflow) can build and upload the iOS app for you.

## Every time the game changes

From this `app` folder:

```
npm install          # first time only
npm run sync         # copies the latest index.html into both apps
npm run ios          # opens Xcode      (Mac only)
npm run android      # opens Android Studio
```

## One-time setup

### 1. Choose the app ID

`capacitor.config.json` uses `com.pulseform.game`. App IDs are permanent once published, so change it now if you want
another (reverse-domain style, e.g. `com.yourname.pulseform`), then run `npx cap sync`. Also set the same ID:

- iOS: Xcode → App target → General → Bundle Identifier
- Android: `android/app/build.gradle` → `applicationId` and `namespace`

### 2. Firebase: register the apps

In the Firebase console → Project settings → **Add app**:

- **iOS app** with your bundle ID. Download `GoogleService-Info.plist` and drag it into Xcode under `App/App`
  (tick "Copy items if needed").
- **Android app** with your app ID. Add your signing key's SHA-1 (Android Studio → Gradle → signingReport, and later the
  Play Console's "App signing" SHA-1 too). Download `google-services.json` into `android/app/`.

### 3. Sign in with Apple (required by Apple because the game offers Google sign-in)

1. Apple Developer → Certificates, IDs & Profiles → your App ID → enable **Sign in with Apple**.
2. Xcode → App target → **Signing & Capabilities** → **+ Capability** → **Sign in with Apple**.
3. Firebase console → Authentication → Sign-in method → **Apple** → enable.
   For Apple sign-in on the website too, follow Firebase's "Apple" setup page (a Services ID and a key).

### 4. Google sign-in inside the app

- iOS: in Xcode → App target → Info → URL Types, add one whose **URL Schemes** is the `REVERSED_CLIENT_ID` value from
  `GoogleService-Info.plist`.
- Android: nothing more once `google-services.json` and the SHA-1 are in place.

Inside the app, sign-in uses the phone's native sign-in sheet (the `@capacitor-firebase/authentication` plugin); the game
detects this automatically. On the website it keeps using the normal popup.

### 5. Firestore rules

Publish the repo's `firestore.rules` (it adds account deletion and player reports) before the app goes live.

## Ads and purchases

The game code is ready; it only needs your account IDs. Everything is set in `index.html` in the `MONEY` block
(search for `const MONEY=`), then run `npm run sync`.

### AdMob (rewarded ads for boss revives)

1. AdMob → **Apps** → add the iOS app and the Android app.
2. For each app, create a **Rewarded** ad unit.
3. Put the ad unit IDs in `MONEY.admob.ios` / `MONEY.admob.android` and set `test:false`.
4. Put the **app IDs** (they contain a `~`) in:
   - iOS: `ios/App/App/Info.plist` → `GADApplicationIdentifier`
   - Android: `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID`
   (Both currently hold Google's test IDs, which only ever show test ads.)
5. AdMob → **Privacy & messaging**: create a GDPR message (the game shows it automatically where required).
6. App Store privacy label: add "Device ID" / "Advertising data" used for **third-party advertising**, not linked to
   the user, not used for tracking.

### RevenueCat (in-app purchases)

1. Create these products (17 in all) in **App Store Connect** (In-App Purchases) and **Google Play Console** (In-app products):

   | Product ID | Type | Price | Gives |
   |---|---|---|---|
   | `pf_notes_1000` | Consumable | $0.99 | ♪1,000 |
   | `pf_notes_3300` | Consumable | $2.99 | ♪3,300 |
   | `pf_notes_6000` | Consumable | $4.99 | ♪6,000 |
   | `pf_notes_13000` | Consumable | $9.99 | ♪13,000 |
   | `pf_starter` | Non-consumable | $1.99 | ♪2,500 + 5 revive tokens, once |
   | `pf_no_ads` | Non-consumable | $2.99 | Revives without ads |
   | `pf_skin_clock` | Non-consumable | $1.99 | Astral Clockwork premium block |
   | `pf_skin_magma` | Non-consumable | $2.99 | Volcanic Titan premium block |
   | `pf_skin_core` | Non-consumable | $2.99 | Fusion Core premium block |
   | `pf_skin_aurora` | Non-consumable | $2.99 | Aurora Warden premium block |
   | `pf_skin_kitsune` | Non-consumable | $3.99 | Nine-Tail Kitsune premium block |
   | `pf_skin_pharaoh` | Non-consumable | $3.99 | Sun Pharaoh premium block |
   | `pf_skin_paladin` | Non-consumable | $3.99 | Radiant Paladin premium block |
   | `pf_skin_prism` | Non-consumable | $4.99 | Prism Dragon premium block |
   | `pf_skin_lich` | Non-consumable | $4.99 | Lich King premium block |
   | `pf_skin_horizon` | Non-consumable | $4.99 | Event Horizon premium block |
   | `pf_pass_s1` | Non-consumable | $4.99 | Pulse Pass+ for Season 1 (the paid reward row) |

2. RevenueCat → new project → add the App Store app and the Play Store app (follow its steps to connect each store).
3. Import all the products into RevenueCat (no entitlements or offerings are needed; the game asks for the products by ID).
4. Copy the **public SDK keys** (Project → API keys; one starts with `appl_`, one with `goog_`) into
   `MONEY.rcKeys.ios` / `MONEY.rcKeys.android`.
5. Test with a Sandbox tester (iOS) or a license tester (Android) before release.

Until the keys are filled in, the shop shows the packs but buying is switched off in the app. On the website, the
packs say they're available in the app. When you run the game from your computer (or add `?testads=1` to the
address), ads and purchases are pretend and free, so you can try the flow.

## Store checklist

- **Privacy policy URL**: host `privacy.html` (it sits next to `index.html` in the repo) and paste its link in App Store
  Connect and the Play Console. Replace `CONTACT_EMAIL` in it with your support email first.
- **App privacy ("nutrition label")**: Contact info → email (app functionality, linked to the user); Identifiers → user
  ID; User content → gameplay content and player name; no tracking, no ads.
- **Account deletion**: in the game, Settings → (bottom) Delete account, confirmed with the password (or Apple/Google sign-in). Mention it in the review notes.
- **Report and block**: the ⋯ button on leaderboard rows and "Report or block" on a friend's card. Reports land in the
  Firestore `reports` collection; check it in the Firebase console.
- **Age rating**: answer the questionnaire; user-generated content (names, shared levels) and online play are the items
  to declare.
- **Review notes**: give Apple a test account (email + password) so the reviewer can try leaderboards and friends.
- **Screenshots**: 6.9" and 6.5" iPhone, 13" iPad (if you ship iPad), and phone screenshots for Play.

## The website (pulseform.win on Cloudflare)

pulseform.win is served by a Cloudflare Worker called `pulseform`, in the Cloudflare account that owns the domain.
To update it:

```
node scripts/build-www.mjs --email-only     # the website version (email sign-in only)
node scripts/build-cf-worker.mjs            # packs it into web-cf/worker.js
```

Then upload `web-cf/worker.js` to the `pulseform` Worker (Cloudflare API, or the dashboard's "Edit code" → paste →
Deploy). pulseform.win and www.pulseform.win are attached to it as custom domains; www redirects to pulseform.win.

## Unlock codes and the admin panel

The game keeps only salted SHA-256 fingerprints of these codes; the codes themselves are kept privately by the owner.

- **Unlock codes** (one per premium block, one for Pulse Pass+): typed into the Email box on the Account screen. They unlock on that device straight away and sync to the account. A code works any number of times, so treat each one like a gift card.
- **Admin code**: while signed out, type it into the Email box, then sign in. `firestore.rules` checks the code against its fingerprint and stores `admins/{uid}`; after that, **Settings → Admin panel** appears on that account on every device. From the panel you can:
  - set your own rank (or go back to the earned one), add Notes, unlock every level, get Pulse Pass+, own every item;
  - find a player by exact name or friend code and send them Notes, a block, banner, tile theme, Pulse Pass+, a rank, or a message (`gifts/{uid}/items`; applied the next time they open the game signed in);
  - run one site-wide event (`live/event`): title, message, XP and Notes boosts (up to 3×), start time, length, and an optional gift everyone can claim once from the banner on the main menu.
- All admin powers are enforced by `firestore.rules`, so **publish the latest rules** in the Firebase console (Firestore Database → Rules) before using the panel. To remove an admin, delete their `admins/{uid}` document in the console.
- CrazyGames builds have no Firebase, so the admin panel and live events don't appear there.

## Limited event: Erlaf the Giant Duck

A boss challenge against a giant white mallard cube on the World 3 arena: 24 HP, 20% faster than the World 3 boss, throwing 2 ducklings at a time (3 once he's enraged at half health). **Only an admin can summon him**: in the admin panel's Events tab, tick **Summon Erlaf the Giant Duck**, set **Lasts** in minutes or hours (from 1 minute; optionally **Starts in**), and start the event. He's on the main menu for exactly that long (the live event's `mode: 'erlaf'`; publish the latest `firestore.rules` first), then disappears. His fight plays the **Quack Symphony**: every melodic instrument is played by a synthesized quack, while the drums stay normal so the beat is clear. Beating him once unlocks the **Erlaf** block and its Quack landing effect (`SAVE.erlafWin`). It doesn't count toward world progress and has no challenge links.

## Bot protection

- **Firestore rules** (`firestore.rules`): leaderboard scores only go up, stay under a ceiling (20,000,000; Ascent 2,000,000,000), and each new best is stamped with the server's clock at least 5 seconds after the last, so scores can't be posted in bursts or with faked times. Ranks must be real (0–26). Saves are capped at 900,000 characters, player cards at 40 fields and 24 built levels, and each player can report another player only once. Publish the rules in the Firebase console after the game that writes server timestamps is live (it is, and it falls back to the older format if the old rules are still published).
- **The website as static files** (`app/scripts/deploy-cf.mjs`, run by `.github/workflows/deploy-site.yml`): Cloudflare serves static assets free and unlimited, without running code, so floods can't use up the Workers allowance. Add the repository secret `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit). Every push publishes the test copy (`pulseform-beta`); a commit with `[deploy-live]` in its message publishes the live site and the www redirect.
- Leave Cloudflare's Bot Fight Mode, "I'm Under Attack" and AI-bot blocking off: they would challenge the school-filter crawlers too.
