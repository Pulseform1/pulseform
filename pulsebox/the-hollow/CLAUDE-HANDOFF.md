# THE HOLLOW — Genuine 3D Build 7

Use THE-HOLLOW-3D-BUILD-7.html for solo, or npm ci / npm run dev for four-player co-op. The old image-based creature renderer was removed following user feedback. The user no longer wants a decapitation cutscene: death is now a short close-up 3D jump scare. Preserve this change.

## Architecture

- public/creature-rig.js builds actual volumetric geometry into an opaque SkinnedMesh. A 14-bone skeleton controls the hips, spine, head, jaw, upper/lower arms, hands, upper/lower legs. Parts include modeled skull openings, teeth, ribs, eyes, claws and back surfaces. Five levels select different solid geometry variants. Animation uses opposing strides, knee bends, counter-swinging arms, head tracking and jaw motion.
- public/game.js integrates the same model factory into gameplay, apparitions and the short jump scare. Creature facing follows travel, rather than always facing the camera. No creature PNG or sprite loader exists in runtime. Procedural material textures are generated in canvas.
- public/controls.js: Space + arrows looks around while leaving WASD movement active. Normal arrows move when Space is released. J/L, I/K and R also work. The Play button never captures the pointer; mouse look is opt-in.
- levels.js: five maps, objectives, codes, atmosphere and AI profiles. world.js: collision, sight and pathfinding with per-room maps.
- engine.js: authoritative shared solo/server simulation. One survivor reaching an exit advances the team and respawns every dead teammate. All dead means failure. All levels randomly spawn the monster away from the entrance and out of sight where possible. Do not restore the earlier scripted encounter in front of the player. Proximity warning text, pulsing screen edges and heartbeat intensify within 18 meters and become urgent within 8 meters.
- server.js: four-player WebSocket rooms. public/local-session.js runs the same engine in solo. Public co-op needs one reachable HTTPS server with WebSocket upgrades.
- horror-director.js handles recovery pacing, blackouts, false alarms and visions.
- scripts/build.mjs creates the new uniquely named 3D HTML build and a legacy alias. scripts/package.py creates a source ZIP with the new HTML, then a matching uniquely named ZIP alias.

npm test covers five-level/four-client progression, respawns, solid model front/back/side raycasts, mesh depth, animation, controls and scare pacing. npm run package rebuilds the portable file and ZIP (Python 3 required). The HTML contains no creature image or remote assets.

## Limits

The monsters are genuinely 3D and animated, but procedural models are not scanned AAA character assets. There is no long death movie, decapitation animation, or native engine character export in this version. Preserve 4-player capacity, 5-level progression, dead teammate respawns, keyboard-only controls, optional volume-only microphone detection, and solo pause behavior. Rooms are ephemeral; no reconnection recovery, production matchmaking, persistence or voice chat. Ask for the destination game's engine/source before choosing integration boundaries.

## Chase/hiding/stamina update
player-mechanics.js is shared by client prediction and authoritative simulation. Shift toggles sprint, stamina drains at 18/s while sprinting, regenerates at 12/s after a 1s delay, and exhaustion forces sprint off until 20% recovery. New sector restores 100 points. levels.js exports deterministic getHidingSpots with blue lockers near walls. engine.js validates hide proximity and occupancy, protects hidden players, and retains chaseTarget through lost sight until the target hides, dies or disconnects. A blind Listener acquires by noise. The client uses H/E to exit lockers, turns off light, shows a vent view, and draws lockers on the map. Keep the compact objective in the top-left corner.
