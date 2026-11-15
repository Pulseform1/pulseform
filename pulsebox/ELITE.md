# Pulsebox Elite

Invite 3 friends → Elite games unlocked on your account, for good.

## Switches — `elite.config.json`

| setting | what it does |
|---|---|
| `"live": false` | The homepage section and the Elite page say **Elite games are coming soon**. No invite links, no referral counting. (Today.) |
| `"live": true` | Releases everything: personal invite links, sharing, referral counting, the progress dashboard and the unlock. |
| `"emailLink": true` | Makes **"Email me a sign-in link"** the main way to sign in (no password). Turn this on only after enabling it in Firebase (below). Password and Google sign-in keep working either way. |

After changing a setting: build and deploy as usual (`python3 build-worker.py`, then deploy).

To look at the full experience before release, open `https://box.pulseform.org/?elite=preview`. It shows your real code and progress; nothing counts until `live` is true.

## Making a game Elite

Add `elite: true` to the game's entry in the `GAMES` list in `public/index.html`:

```js
  {
    id: "my-new-game",
    elite: true,
    title: "My New Game",
    ...
  },
```

That's all. On the next build the game:
- leaves the normal library and appears in the Elite library (and as a blurred, locked preview for everyone else);
- is served from `/elite/my-new-game`, which the Worker only hands to signed-in Elite members with a signed pass. Its old public address (`/games/my-new-game`) no longer exists, so it cannot be opened by URL.

Remove the line to make a game public again.

## Before releasing (`live: true`)

1. **Firebase → Authentication → Sign-in method → Email/Password → turn on "Email link (passwordless sign-in)".** `box.pulseform.org` is already an authorised domain. Then set `"emailLink": true`.
2. Optional: Firebase → Authentication → Templates → customise the sign-in email (sender name "Pulsebox").
3. Add at least one Elite game (above), or the library shows "coming soon" cards.

No new secrets or environment variables are needed. The pass-signing key is created inside the Elite Durable Object on first use and never leaves it.

## How a referral counts

1. A friend opens `https://box.pulseform.org/?ref=CODE`. The browser remembers the code (30 days). Opening the link counts for nothing.
2. They make an account (email link, Google, or password). The hub tells the server who invited them.
3. The server records the referral only if: the code is someone else's; the account is new (made in the last 7 days) and has never been referred; its email inbox has never been used for a referral (Gmail dots and `+tags` don't make a new inbox); the email domain isn't a throwaway one; their network hasn't claimed more than 3 referrals today.
4. It is credited once they have **played a game for 45 seconds** (timed by the server) **and** their email is verified (email-link and Google sign-ins are verified automatically).
5. At 3 credited friends the inviter's account gets an Elite timestamp, which nothing ever clears.

All of this lives in one Durable Object (`Elite`, SQLite) in `elite.js`: a referred account is the primary key and an email can be used once, so the same friend can never be credited twice; counts are always computed from the referral rows, never sent by the browser.

## Files

- `elite.js` — the API (`/api/elite/me`, `claim`, `play`, `ticket`), the `/elite/*` gate and the `Elite` Durable Object.
- `api.js` — routes `/api/elite/*`, exposes the Firebase token check with its claims.
- `build-worker.py` — reads `elite.config.json`, finds `elite: true` games, moves their pages to `elite/`, adds the gate to the Worker.
- `wrangler.toml` — the `ELITE` Durable Object binding (migration `v7`) and `/elite/*` in `run_worker_first`.
- `public/index.html` — the homepage section, the Elite page (coming soon / locked / dashboard / library), the unlock moment, invite-link capture, passwordless sign-in, Switch account.

## Testing locally

```
python3 build-worker.py
npx wrangler dev --local --var ELITE_DEV:1
```
With `ELITE_DEV=1` (command line only, never in `wrangler.toml`) the local Worker accepts stand-in "dev." tokens, and on `localhost` the hub signs in from `localStorage['pbx-dev-user'] = '{"uid":"a1","email":"a1@gmail.com"}'`, so the whole flow can be run without real Firebase accounts.
