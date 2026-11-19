# STILLWATER on Pulsebox

This folder is the game's own source, and it still runs on its own (`npm ci`, then `npm start`, then
http://127.0.0.1:4173). The same source is also the Pulsebox game at box.pulseform.org.

How the site version is made:

- **The page:** `node tools/build-stillwater.mjs` (from `pulsebox/`) bundles `public/app.js`, everything it imports and
  three.js into one file, `public/games/stillwater.html`, with `style.css` inlined. The page sets
  `globalThis.STILLWATER_ROOMS`, so the game connects to the site's rooms instead of a local server, and the
  "Open in Chrome" button (a local-only helper) is hidden.
- **The rooms:** `pulsebox/stillwater-rooms.js` is the room code of `server.mjs` (create, join with a code, ready, vote,
  pause, respawn, restart, reconnect) as a Cloudflare Durable Object, one per room, running `shared/simulation.js` 60
  times a second. If you change the room rules in `server.mjs`, make the same change there.
- **Only two small source changes** were needed for this: `public/transport.js` `socketURL()` puts the room code in the
  address when `STILLWATER_ROOMS` is set, and `public/app.js` passes the message to it (and words the "could not
  connect" message for the site). Locally nothing changes.

Checks: `npm test` here (the game's own tests); from `pulsebox/`, `node tools/stillwater-site-server.mjs 8795 &` then
`node tools/stillwater-site-check.mjs` plays a solo run and a two-browser friends room on the built page.
