# Pulsebox

A hub of 21 browser games, each a single HTML file in `public/games/`, with covers, trailers and screenshots in `public/media/`.
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
