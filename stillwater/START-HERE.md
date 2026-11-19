# Play the downloaded game

1. Unzip the archive. Keep everything inside the `stillwater` folder together.
2. Install **Node.js22 or newer** if it is not already installed. This ZIP contains the complete game source and assets; its two npm dependencies are installed on first setup. **Internet access is needed for this first setup to obtain Node.js and download those dependencies; neither is bundled in the ZIP.**
3. **Mac:** double-click `start.command`. It installs the locked dependencies when needed, then starts the local game. If opening the file does not start it, open Terminal in this folder and run `zsh start.command`.
4. Open **http://127.0.0.1:4173/?v=18** in your browser. Keep the server's Terminal window open while playing.

For Windows, Linux or manual setup, open a terminal in the extracted folder and run:

```sh
npm ci
npm start
```

WASD moves, Space jumps/climbs, Shift sprints and F toggles the torch. Click the play area to request real mouse capture; Escape releases it. Keyboard-only mode supports arrows to look and Q/E to turn. Browser capture can fail at the browser/OS level; the game shows its actual status. The latest tested user's Chromium sessions returned an internal capture error, so mouse confinement is not claimed as fixed.

If port4173 is already in use by another copy, stop that copy first, or on Mac/Linux run `PORT=4174 npm start` and open `http://127.0.0.1:4174`.

Stop the server with Control-C. The ZIP does not publish anything or change the existing website. See `README.md` for friends/private-room setup and settings, and `VALIDATION.md` for verified behavior and remaining limits.
