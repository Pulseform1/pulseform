# Gambit Club

Chess training app: rated bots with clocks, live move ratings from Stockfish 17,
game review, openings with game plans, puzzles, Puzzle Rush, endgame drills and insights.
Everything runs in the browser (Stockfish is WebAssembly); there is no server code.

## Deploy (Cloudflare Workers)

Live at https://chess.pulseform.win, served by the `gambit-club` Worker.

```sh
python3 build-worker.py      # bundles public/ into worker.js
npx wrangler deploy          # uploads it and keeps chess.pulseform.win attached
```

`worker.js` embeds the app files. The two large engine files (`sf17.wasm`, `stockfish.js`) are
fetched from unpkg and jsDelivr (byte-identical to the copies in `public/`) and cached at the edge,
which keeps the Worker small. `public/` also runs as a plain static site for local testing:
`cd public && python3 -m http.server`.

## Notes

- The "Explain this move" AI coach only appears when the app is opened inside claude.ai.
- Progress (games, puzzle rating, saved mistakes) is stored in the visitor's browser.
- Licenses: Stockfish is GPLv3 (`public/STOCKFISH-LICENSE.txt`). Piece sets come from lichess.org,
  each under its own license (shown in the app's Board panel); California, Maestro, Staunty,
  Tatiana and Alpha are for non-commercial use only. Puzzles are from the Lichess puzzle database (CC0).
