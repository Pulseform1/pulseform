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

## Store checklist

- **Privacy policy URL**: host `privacy.html` (it sits next to `index.html` in the repo) and paste its link in App Store
  Connect and the Play Console. Replace `CONTACT_EMAIL` in it with your support email first.
- **App privacy ("nutrition label")**: Contact info → email (app functionality, linked to the user); Identifiers → user
  ID; User content → gameplay content and player name; no tracking, no ads.
- **Account deletion**: in the game, Sign in → Delete account. Mention it in the review notes.
- **Report and block**: the ⋯ button on leaderboard rows and "Report or block" on a friend's card. Reports land in the
  Firestore `reports` collection; check it in the Firebase console.
- **Age rating**: answer the questionnaire; user-generated content (names, shared levels) and online play are the items
  to declare.
- **Review notes**: give Apple a test account (email + password) so the reviewer can try leaderboards and friends.
- **Screenshots**: 6.9" and 6.5" iPhone, 13" iPad (if you ship iPad), and phone screenshots for Play.
