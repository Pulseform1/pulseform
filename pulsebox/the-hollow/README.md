## Download and transfer the game

On GitHub, choose **Code → Download ZIP**, then extract the archive. The root **THE-HOLLOW.html** is a ready-to-play solo build: open it in a desktop browser without installing anything. All editable source files are included for Claude or another developer.

For iPhone/iPad play, host THE-HOLLOW.html on a website and open its URL in Safari. Online four-player co-op requires the included Node/WebSocket server (`npm ci`, then `npm start`); the standalone HTML runs solo.

`npm run package` refreshes the root playable HTML and generates additional packages in `dist/`. Dependencies (`node_modules/`) are installed with `npm ci` and are not stored in GitHub.

# THE HOLLOW — Five-sector campaign

A first-person horror game for solo play or up to **four online co-op players**. One shared simulation runs locally for solo and on the WebSocket server for co-op.

## Play without installing

Open **`THE-HOLLOW-3D-BUILD-7.html`** in Chrome, Edge or Firefox, select Play Solo, then Play / Continue (or press Enter twice). The portable build includes all five levels, creatures, fonts and audio. It requires WebGL, but no network requests or server. The new version is clearly labeled **3D MONSTER BUILD 7.0** in the menu. Use the new filename rather than a previously downloaded copy. The repository build is `dist/THE-HOLLOW-3D-BUILD-7.html`; the source ZIP also includes it at its top level.

## Co-op / source development

Node.js 22+:

```sh
npm ci
npm run dev
```

The server listens on port 3000 (override with PORT). Host Co-op creates a six-character room code. Up to three friends can join that same code. Both the page and WebSocket connections must reach the same server. Public hosting requires HTTPS and WebSocket upgrade support; hosting is not included. No credentials, accounts, database, or external asset services are required.

## Campaign

| Sector | Creature | Main behavior |
| --- | --- | --- |
| Intake Laboratories | The Hollow | Hears footsteps and sees flashlights |
| The Surgical Wing | The Listener | Blind; heightened noise sensitivity |
| Flooded Maintenance | The Crawler | Faster pursuit, low silhouette |
| Organic Containment | The Maw | Especially sensitive to flashlights |
| The Core | The Warden | Strong hearing, sight, and faster pursuit |

Each level has a different connected layout, atmosphere, monster artwork, calibration code, and objectives. Restore a system, solve the terminal using its note, release the lift, and reach the exit. **One living survivor can advance the entire team. All dead teammates respawn at the next level's entrance.** You no longer revive decapitated teammates with E. If everyone dies before reaching an exit, the expedition ends. Reaching the fifth exit wins the campaign for the team.

## Controls

- Arrow keys or WASD: forward/backward and strafe. **Hold Space + arrow keys to look in any direction without a mouse pad.** J/L also turn; I/K look up/down; R centers the view. WASD movement still works while Space is held.
- Play defaults to keyboard controls. Optional mouse capture has its own Use Mouse Look button.
- Enter: start solo, resume, submit a puzzle, or restart after the expedition ends.
- Shift: toggle sprint on/off. Running drains a 100-point stamina bar at 18 points/second. After a one-second rest delay, it recharges at 12 points/second. Exhaustion turns sprint off; recover to 20% before re-enabling. H: enter or leave a blue hiding locker. Ctrl/C: crouch. F: flashlight. E: interact. Tab/MAP: facility map.
- Terminal: left/right arrows select a channel; up/down arrows or digits change its number. Enter submits. Escape leaves.
- Mouse look and drag-to-look remain available but are optional.
- Touchscreens have move, look, run, crouch, flashlight and interact controls.
- After dying, spectate living teammates; left/right arrows cycle survivors. Advancing brings you back.
- M: optional local microphone volume detection. Audio is never recorded or transmitted; only a noise scalar is shared. Voice chat is not implemented.

Solo menus pause the simulation. Co-op continues while any survivor is active. Each sector pauses idle patrol for the first 25 seconds, but seeing or hearing a survivor immediately starts pursuit, even during that opening period. Terminal use does not pause it. A scare director creates blackouts, sounds, false alarms, silhouettes and close-up lunges without moving the actual creature or causing arbitrary damage.

## Chases, hiding and stamina

Once a seeing monster has line of sight, it locks onto a survivor and keeps pursuing even after they turn corners or switch off their flashlight. Noise can also trigger pursuit, including for the blind Listener. Chase speed is faster than walking but slower than sprinting. Entering a marked blue locker with H breaks the chase. Lockers are single-occupant, turn off your flashlight, protect you from capture, and stop movement; H or E exits. Blue squares on the map mark lockers. Hiding spots are valid reachable places in every level. In co-op, the monster can detect another exposed survivor after you hide.

Shift or the on-screen Sprint button toggles sprint. Stamina drains only when actually moving at sprint speed. It recharges while walking, standing or hiding, after a short delay. Running out disables sprint; recovery does not automatically turn it on. Pause and level changes turn sprint off; each new level restores full stamina.

## Genuine 3D creatures and jump scare

Build 2 removes the former flat creature artwork renderer. Every creature is now an opaque **volumetric SkinnedMesh** with front, back and side surfaces, a 14-bone skeleton, jointed limbs, a moving jaw, modeled teeth, eyes, ribs, claws and back anatomy. Five variants have different geometry, proportions, material colors and movement. The Warden has modeled metal plates; the Crawler uses a lower bent-limb pose. The meshes receive flashlight lighting, cast shadows, face their travel direction, and have a slower idle/search animation.

There is no creature PNG, sprite, camera-facing plane or cutout rig in the runtime. Skin texture is generated locally. These are procedural 3D models, not scanned photoreal assets. The prior illustrations remain only as development reference, outside the runtime source package.

Every level selects a random monster floor position at least seven grid cells from the entrance, outside line of sight where possible. The opening encounter in front of the player is removed. After a capture, respawning also avoids living players; if no distant cell exists, the engine chooses the farthest available cell. The hunt begins after 25 active seconds.

A compact top-left objective card shows the task, stage count and distance. As the creature comes within 18 meters, a pulsing screen edge, a proximity message and a heartbeat warn the player; within 8 meters the message becomes urgent and the pulse/heartbeat accelerate. These effects stop during pause, death and spectating.

**The long decapitation cutscene has been removed.** Capture now triggers a roughly 1.25-second close-up lunge using the same 3D creature, then the death screen or co-op spectator view. False-alarm lunges remain non-damaging. Dead teammates respawn when a survivor advances.

## Build / verify / share

```sh
npm test
npm run build        # dist/THE-HOLLOW-3D-BUILD-7.html
npm run package      # also dist/THE-HOLLOW-3D-BUILD-7-source.zip; Python 3 required
```

Tests cover all five routes, sector-specific puzzle codes, four-player WebSocket synchronization, fifth-player rejection, dead teammate respawns, room isolation, movement, scare pacing, and death events. `CLAUDE-HANDOFF.md` describes integration. The portable build contains the creature geometry code and makes no external asset requests. Font licenses are included under public/fonts.

Rooms are ephemeral. Disconnects cannot reclaim old avatars. Production matchmaking, persistence, anti-cheat, voice chat, deployment, and scanned photoreal character assets are not included.

## Mobile play (Build 7)

Touch controls support phones and tablets in portrait or landscape: hold left arrows to move, drag the scene on the right to look, and tap USE, HIDE, LIGHT, or SPRINT. Backgrounding the browser pauses solo play. Touch devices use a lower rendering resolution.

For iPhone/iPad, serve the game over HTTP/HTTPS and open its URL in Safari. Files/Quick Look is not a supported way to run a downloaded HTML game. You can upload the standalone HTML as index.html to a static host for solo play; online co-op needs the included Node/WebSocket server. Safari Share → Add to Home Screen provides a launcher. This is a browser game, not an iOS app or a guaranteed offline home-screen install.

Mobile layout and button input were checked in Chromium touch emulation at 390×844, 844×390, and 820×1180. Physical iPhone/iPad Safari testing remains outstanding.
