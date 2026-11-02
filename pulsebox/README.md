# Pulsebox

A hub of browser games (48 so far), each a single HTML file in `public/games/`, with covers, trailers and screenshots in `public/media/`.
The game list lives in `GAMES` at the top of the script in `public/index.html`; its comment says how to add a game.

## Deploy (Cloudflare Workers)

Live at https://box.pulseform.org, served by the `pulsebox` Worker.

```sh
python3 build-worker.py      # writes dist/ (pages, games, media as static assets) and a small worker.js for /api/
npx wrangler deploy          # uploads both and keeps box.pulseform.org attached
```

**Flood protection.** Everything in `dist/` is a Cloudflare static asset: it's served from the edge without running
the Worker, so those requests are free, unlimited and never count toward the Workers daily request limit. Only
`/api/` runs `worker.js`, and there each IP gets 300 requests a minute (`API_LIMIT` in `wrangler.toml`) before
a cheap 429. For the zone-level shield (a per-IP rate-limit rule, Bot Fight Mode, Under Attack Mode on demand) run
`CF_SHIELD_TOKEN=... bash tools/cloudflare-shield.sh` once; see the top of that script for the token permissions.

**Deploying from Cloudflare (Workers Builds).** Connect this repo in the dashboard (Workers & Pages > pulsebox >
Settings > Build): root directory `pulsebox`, build command `python3 build-worker.py`, deploy command
`npx wrangler deploy`. Every push to the chosen branch then builds and deploys from Cloudflare's side.

**Emergency mode.** `python3 build-worker.py --embedded` then `npx wrangler deploy -c wrangler.embedded.toml`
builds the old all-in-one Worker (pages embedded, media via jsDelivr, so commit and push media first). Use it only
when static assets can't be uploaded: every page view counts toward the request limit again in that mode.

For local testing: `cd public && python3 -m http.server`.

## Accounts and cloud saves

The **Sign in** button uses the same Firebase accounts as Pulseform (email and password, or Google).
Every game saves to this site's `localStorage`; when someone is signed in, the hub copies all of it to
`/api/save` and back, so progress follows them to any device. `api.js` checks the Firebase ID token
against Google's public keys and keeps one save per account in a Durable Object (`Saves`).

Google sign-in needs `box.pulseform.org` in Firebase console → Authentication → Settings → Authorized domains.
Email and password work without it.

## Multiplayer rooms

`/api/room/CODE` is a WebSocket relay (the `Rooms` Durable Object in `api.js`): up to 4 players per 4-character code; the first player in is the host. Still Here and the rest of the Co-op shelf (Bumper Brawl, Paint Wars, Turbo Laps, Doodle Guess, Sea Battle) use it. The shared lobby is `src/lib/mp.js`.

## THE HOLLOW

THE HOLLOW's own source is kept as delivered in `the-hollow/` (its README covers the game; `npm ci && npm test` there).
`node tools/build-hollow.mjs` (after `npm ci` in `the-hollow/`) builds `public/games/the-hollow.html`: the same bundle as the
game's portable build, but with the co-op buttons kept and the WebSocket pointed at `/api/hollow`. There, the `HollowRooms`
Durable Object (`hollow-rooms.js`) is the game's `server.js` ported to Cloudflare, running the game's own `engine.js`.
