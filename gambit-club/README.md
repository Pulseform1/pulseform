# Gambit Club

Chess training app: rated bots with clocks, live move ratings from Stockfish 17,
game review, openings with game plans, puzzles, Puzzle Rush, endgame drills and insights.
Everything runs in the browser (Stockfish is WebAssembly); there is no server code.

## Deploy to Firebase Hosting

From this folder, with the Firebase CLI (`npm i -g firebase-tools`):

```sh
firebase login
# one-time: create a hosting site for the app, e.g. pulseform-chess -> https://pulseform-chess.web.app
firebase hosting:sites:create pulseform-chess --project <your-project-id>
firebase target:apply hosting chess pulseform-chess --project <your-project-id>
# every deploy
firebase deploy --only hosting:chess --project <your-project-id>
```

To serve it on your own subdomain (for example `chess.pulseform.win`), add the domain in the
Firebase console under Hosting > the site > Add custom domain, then create the DNS records it shows.

## Notes

- The "Explain this move" AI coach only appears when the app is opened inside claude.ai.
- Progress (games, puzzle rating, saved mistakes) is stored in the visitor's browser.
- Licenses: Stockfish is GPLv3 (`public/STOCKFISH-LICENSE.txt`). Piece sets come from lichess.org,
  each under its own license (shown in the app's Board panel); California, Maestro, Staunty,
  Tatiana and Alpha are for non-commercial use only. Puzzles are from the Lichess puzzle database (CC0).
