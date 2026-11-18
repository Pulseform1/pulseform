# Verification — development build 0.12

## Passed
- `npm run build`: Vite production build succeeds.
- `npm test`: 77 automated tests pass.
- Controller: walking/sprinting speed, normalized diagonal movement, physical wall blocking, open door entry, jumping/landing, crouching, and ascending the hotel stairs onto the connected roof.
- Combat: authoritative ammunition, cooldown/reload, weapon switching, hitscan damage, elimination scores, teammate protection, grenade consumption/explosion, trap arming/triggering, respawn and temporary protection.
- Solo: proximity-gated intelligence collection, checkpoints, extraction victory, AI grid paths and finite movement updates.
- Rules: competitive score limits and all five co-op waves finish.
- WebSockets: independent Node ws clients on separate sockets create/join a room, start as host, receive authoritative snapshots, move, fire, migrate host on disconnect, enforce eight-player capacity, reject malformed messages, and return co-op to the lobby. These are actual protocol connections, not a mocked server, but run on loopback.
- Scene: full Three.js scene/material construction with a stubbed renderer and drawing context, valid geometry data, static geometry batching to fewer than 100 mesh objects, remote-avatar lifecycle. This is a scene-graph check, not a WebGL render or screenshot.

## Not verified
- Browser playthrough, pointer-lock/input feel, iron-sight alignment, audio playback, visual appearance and real FPS.
- Two actual browser clients on different computers/networks playing a live internet match.
- Public Node backend hosting, TLS/proxy behavior, provider deployment, Docker image, or mobile performance.

The managed environment does not expose the supported cua_repl browser-control tool. The Sites skill requires skipping browser QA rather than using another browser-control path when that tool is unavailable. No browser preview server or browser screenshot was substituted. Do not describe this as a fully tested or finished multiplayer release.

## Remaining acceptance work
Deploy the included Node service as described in README.md. Play the complete mission in a hardware-accelerated desktop browser. Test the lobby, movement prediction, damage, respawn, results and host migration from two browsers on different networks. Measure frame times at each quality level and tune sensitivity/weapon animation against actual play. Replace/refine procedural assets as needed before calling the art production-ready.

## Update 0.2 checks
Arrow/WASD equivalence, menu-focus recovery, browser-default prevention during captured movement, aim toggling, and bounded wheel zoom are covered by controller tests. All four weapons’ front sight tips and rear axes project to the center of the camera after their aiming transition; magnification uses the correct angular relationship. Damage warning onset/direction/expiry and reduced-motion behavior are checked. Ogg assets were validated with ffprobe and waveform files are bundled as a decoding fallback. Scene construction tests include the new bump maps and sky material, but do not compile shaders on a GPU. The tests do not establish perceptual audio quality or actual in-browser visual quality.

## Update 0.3 checks
Seven additional checks cover all five collision-free deployment locations and routes to the command post, exact spawn/respawn coordinates, initial hostile spacing, fixed-step Easy-mode survival at every insertion point, protection ending on a shot, delayed health recovery, bounded AI bursts, radio activation and pause/resume behavior, extraction gating, and server rejection of invalid/live-match spawn changes. The Easy-mode insertion check runs twelve simulated seconds at each location with no player movement; it verifies this deterministic opening rather than guaranteeing survival in every firefight. Full scene-construction tests include mission props. The production build succeeds. Browser map interaction, readability, human balance testing and internet multiplayer remain unverified because the supported browser-control tool is unavailable.

## Update 0.4 checks
The suite now includes unique elimination rewards and duplicate rejection, saved progression reload, purchase affordability and upgrade caps, new-gun loadouts and server-normalized magazine capacities, sprint exhaustion/recovery, frontal knife range/visibility/cooldown checks, complete objective sequences for all three missions (including charge explosions and two reinforcement groups), and graceful behavior when browser storage is blocked. Projection checks cover all seven weapon sights. Scene-graph tests switch all three sets of mission props and include the new contact shadows/posters. These checks do not replace browser/UI, perceptual sound, GPU shader or network playtesting.

## Update 0.5 checks
Nine more checks cover higher tiered prices while retaining ownership, bolt lift/retraction/ejection/return, authoritative shot timing and queued reload, slide momentum/cost/stance/expiry, slide collision, all six sentry posts and firing lanes in both directions, stationary sentry behavior and increased population, auto/pistol action closure, and authoritative network slide snapshots. All seven sights still project onto their calibrated aim axes when idle. Existing twelve-second Easy insertion survival tests still pass. Gun art, animation feel, audio synchronization, live window combat and FPS remain unverified in an actual browser.


## Version 0.6 — battlefield support
Added M tactical map, minimap, clickable map waypoints, squad markers and four-second nearby gunshot contacts (no hidden enemy tracking). Added six medical/ammunition stations: E interaction, 60-second shared cooldown, +60 capped health or three reserve magazines per equipped gun. Full supplies do not consume a station. Mission completion pays 150–200 coins once, with saved medal/time records and retry time/deaths included. Existing armory saves and prices remain compatible.
Validation: 51 automated checks pass, including authority, persistence, supply access/cooldowns, medal replay protection, and map visibility. Production Vite build passes. Browser play, visual presentation, pointer-lock/map interaction and audio remain unverified because this environment does not provide the supported browser QA tool. Internet multiplayer still requires separately hosting the included Node server.


## Version 0.7 verification
- Seven distinct arena collision signatures; all five landing zones clear and connected to all mission objectives. Stations are reachable on each biome. AI navigation rebuilds when the active arena changes.
- All fifteen missions complete through their own recovery, timed task, defense/sabotage and extraction sequences. New medal IDs survive storage normalization.
- All six biome scenes construct with mission and supply props. Instanced vegetation, finite helicopter geometry, animated rotor/rope, crew/hero models and complete camera trajectories are exercised with a stub renderer. Exterior/handoff cameras remain outside solid map geometry at all 35 landing zones. This does not compile shaders or establish perceptual quality.
- Training recognizes actual movement states and relevant combat events in order.
- Independent loopback WebSocket clients validate host-only arena selection, simultaneous jungle/Arctic rooms, and blocked movement/fire/damage until Take Control.
- GPU rendering, 23-second cinematic appearance, pointer lock, keyboard/mouse interaction, rotor sound, and tutorial usability still require browser acceptance. The supported browser tool remains unavailable; no alternative browser path was substituted.


## Version 0.8 verification
65 automated checks cover the new seat-rise/walk/grip/exit camera path, articulated knee and elbow motion, grounded landing boot placement, deterministic forest density, all landing-zone/mission paths, boundary-warning distance, and cover-capture state restoration on both success and failure. Scene tests cover all seven arenas and all 35 exterior/handoff camera paths; foliage detail correctly reduces at low quality.

The cover capture test uses a stub renderer and fake image output to verify lifecycle/state restoration; it does not prove real GPU capture. Real WebGL rendering of the leaf alpha textures, screenshot covers, first-person grip animation and audio presentation remain unverified. The supported Sites browser QA tool is unavailable in this environment; no alternate browser path was used.


## Version 0.9 verification
- All seventeen mission scripts complete and all forty landing points remain clear, with paths to objectives and accessible supplies. All eight maps have extra collision-backed cover.
- Long flight crosses both map axes, cabin camera rises/walks to the rear ramp, and the 70-second timeline finishes at the selected coordinates. Full models and exterior camera paths are exercised in scene-graph tests.
- Landing timing accepts only a green-window input, consumes misses, prevents rapid duplicate clicks, locks a successful flare, and fails on three misses or timeout.
- Independent loopback WebSocket clients verify that failed online drops count once, remain held/protected, and must retry before safe deployment. Timing itself remains client-reported.
- Green NVG render-pass lifecycle, target resizing and renderer-target restoration are exercised with a stub renderer; this does not compile the shader or establish actual visual quality.
- The gameplay tutorial/module was removed. Old training tests were removed or replaced with the cargo-cabin sequence checks.

GPU shader compilation, the red-lit cabin, actual-screen night-vision image, landing-bar usability and audiovisual/performance acceptance remain unverified because the supported Sites browser QA tool is not exposed in this environment. No alternate browser path or preview server was substituted.


## Version 0.10 verification
71 automated checks pass. New/updated checks establish a six-second collinear approach, preserved cabin/jump phase durations, first-person eye placement throughout parachute tapping, hidden exterior avatar, visible hands/risers/legs, hand pulls on successful taps and cleanup before returning to gameplay. Landing rules require four successful distinct passes, reject duplicate taps, preserve partial progress after a miss, and fail an incomplete sequence at touchdown.

These remain scene-graph and rule checks. The supported browser QA tool is not exposed in this environment; actual visual presentation, camera feel and clicking usability still need browser review.


## Version 0.11 verification
70 automated checks pass. Tests cover the 24-second phase sequence, cable/trolley attachment throughout descent, exact arrival at the selected spawn, automatic completion without input, first-person handle/legs, resource cleanup, all forty collision-free insertion camera paths, and protected online deployment without timing outcomes or insertion deaths. Obsolete parachute timing tests and failure/retry protocol checks were replaced with automatic zip-line checks.

Production build and ZIP verification pass. Actual GPU rendering, zip-line camera feel, sound and gameplay controls remain unverified because the supported Sites browser QA tool is unavailable.


## Version 0.12 verification
77 automated checks pass. Campaign checks require actual commander defeat, completion of all three destructible targets, friendly following with physical doorway navigation, both player and teammate reaching extraction, and restoration of rescued teammates after checkpoint retries. Hitscan and grenade tests exercise cache damage without awarding prop elimination coins; replayed damage cannot count twice. Extraction hold tests cover activation, pausing outside the zone, reinforcements, and final mission completion. The complete seventeen-mission contract test exercises every new objective type. Scene-graph checks cover cache-to-wreck transitions and the approaching extraction helicopter.

Browser controls, perceptual mission feedback, companion animation, extraction presentation and real-device performance remain unverified. No browser was substituted for the unavailable supported Sites browser QA tool.
