# Pulsebox

A hub of browser games (41 so far), each a single HTML file in `public/games/`, with covers, trailers and screenshots in `public/media/`.
The game list lives in `GAMES` at the top of the script in `public/index.html`; its comment says how to add a game.

## Deploy (Cloudflare Workers)

Live at https://box.pulseform.org, served by the `pulsebox` Worker.

```sh
python3 build-worker.py      # bundles the pages into worker.js
npx wrangler deploy          # uploads it and keeps box.pulseform.org attached
```

`worker.js` embeds the pages. The files in `public/media/` are fetched from jsDelivr, pinned to the last
commit that changed them, so commit and push media changes before running `build-worker.py`.

For local testing: `cd public && python3 -m http.server`.

## Accounts and cloud saves

The **Sign in** button uses the same Firebase accounts as Pulseform (email and password, or Google).
Every game saves to this site's `localStorage`; when someone is signed in, the hub copies all of it to
`/api/save` and back, so progress follows them to any device. `api.js` checks the Firebase ID token
against Google's public keys and keeps one save per account in a Durable Object (`Saves`).

Google sign-in needs `box.pulseform.org` in Firebase console → Authentication → Settings → Authorized domains.
Email and password work without it.
