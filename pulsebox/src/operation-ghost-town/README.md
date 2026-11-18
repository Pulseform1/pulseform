# Operation Ghost Town — development build 0.21

A desktop, WWII-inspired browser shooter built with Three.js, Vite, Node.js, and WebSockets. The factions and weapons are fictional. Eight procedural arenas include the original European town, six daytime biomes, and Blackwood Nightfall. Collision geometry, tree trunks, cover, AI navigation, mission objectives and five landing zones are shared between client and server.

This is a playable development foundation, not a finished professional release. Read VALIDATION.md before relying on multiplayer or performance claims. The hosted static version can play all seventeen solo missions; online play requires the included Node server on a public HTTPS host.

## Run the complete game locally
Requires Node.js 22 or newer.

```
npm ci
npm run build
npm start
```

Visit http://localhost:8080. The same server hosts the client, /ws WebSocket endpoint, and /health check. No paid assets, database, or external service is required. For source development, run `npm start` in one terminal and `npm run dev` in another; Vite proxies /ws to localhost:8080. The development command and production Node server serve different ports.

## Play
Use a desktop browser with WebGL 2, hardware acceleration, keyboard, and mouse. Click Single Player, choose an arena, one of its missions, one of five marked landing zones, and a difficulty, then Deploy. The 24-second insertion uses a three-second helicopter approach, a faster stand-and-walk through the red-lit cabin, a harness clip at the rear ramp, and an automatic first-person zip-line descent to your chosen landing zone. After touchdown, click Take Control. Click Resume if mouse capture is blocked. Escape releases the mouse. Browsers or embedded iframes that disallow pointer lock cannot play this PC controller; open the game directly in its own tab.

- WASD or arrow keys: move; mouse: look.
- Left click: fire; hold for automatic fire with the Wren 28.
- Hold right click or tap Q: aim down aligned iron sights. Scroll the mouse wheel while aiming to adjust zoom (about 1.2×–2.6× depending on weapon).
- Shift: sprint; Ctrl: crouch; Space: jump. While sprinting, press C or Ctrl to slide.
- R: reload; E: recover intelligence/extract.
- 1–4: bolt-action, semi-automatic, SMG, pistol.
- G: grenade; V or middle mouse button: close-range knife strike; T: proximity trap.
- M: tactical map and clickable waypoint; Tab: scoreboard; Escape: pause/settings.
- Space during flyover: skip the opening shot and continue from the cabin. The zip-line descent is automatic.
- N: toggle green night vision. Night operations enable goggles automatically during zip-line descent and when taking control.
- E near supply stations: restore 60 health or three reserve magazines per equipped gun. Stations refresh after 60 seconds.

The original Ghost Town operation has a three-stage objective: recover the dossier in the western command post (E), activate the eastern field radio (E) and remain nearby for an eight-second transmission, then reach the southern truck and press E to extract. Checkpoints last for the current page session. Recovering intelligence replenishes supplies. After defeat, choose any of the five spawn points and retry with completed objectives preserved. A partially transmitted radio restarts after defeat. Easy, Normal, and Hard adjust enemy reaction, accuracy, and damage. Enemies patrol, investigate gunfire, pursue reachable targets, and try nearby cover when wounded. AI pathfinding runs on a shared 2D grid and does not navigate rooftops.


## Biome operations and insertion

| Arena | Biome | Operations |
| --- | --- | --- |
| Emerald Basin | Jungle ruins | Canopy Cipher / Broken Idol |
| Sirocco Frontier | Desert outpost | Oasis Lifeline / Sandstorm Blackout |
| Rio Perdido | Amazon river basin | River Witness / Floodgate |
| Pinefall Ridge | Alpine forest | Mountain Echo / Timberline Siege |
| Frostline Station | Arctic ice shelf | Cold Current / Whiteout Rescue |
| Cinder Reach | Volcanic badlands | Ashfall Protocol / Core Shutdown |
| Blackwood Nightfall | Night forest / NVG | Silent Lantern / Midnight Watch |

The original town and its three operations remain available. Each new arena has its own outpost geometry, physical cover layout, vegetation or rock formations, weather particles, light/sky palette, and two three-stage mission scripts. Missions combine freeing and escorting teammates, commander fights with bodyguards, destructible supply caches, recovery, terminal transmissions, sabotage, radio defense and helicopter extraction holds. Amazon waterways are shallow and traversable; bridges mark crossings. The volcanic lava ring is outside the playable boundary.

The 24-second real-time insertion uses the large red-lit tandem-rotor transport, with a three-second direct approach, two-second rise, four-second walk, one-second harness clip, ten-second zip-line slide, and four-second landing/handoff. The rider attaches to a physical cable trolley; a hanging sling supports the harness. First-person gloves grip a metal handle during descent, then lower as the harness releases. The cable path finishes exactly above the selected deployment point. Reduced-motion preferences reduce camera shake.

The parachute, canopy, timing bar, green-tap rules, fatal landing and retry screen have been removed. Insertion is automatic and cannot add a death. Combat and the solo mission clock start only after the Take Control click.

The interactive gameplay tutorial, checkbox, menu item, training overlay and training module have been removed. The optional Field Manual remains available in menus. Solo checkpoint retries preserve operation time/deaths; flight time is excluded. Medals and 150–200 coin mission rewards retain existing armory-save compatibility.

Online arenas use the same collision data. Each simulation restores its arena context before processing actions/ticks, so different rooms can play on different maps. The current browser client opts into server-enforced insertion protection and sends deployReady after insertion when Take Control is clicked. No landing/timing outcome is required; obsolete failed-drop/retry commands no longer alter deployment state. Respawns during a match retain the existing four-second respawn system. The hosted frontend still requires a separate public Node WebSocket backend for online play.

## Real internet multiplayer deployment
Local tabs alone do not establish cross-network multiplayer. Deploy the Node server on a publicly reachable host that supports long-lived WebSockets. Static hosting alone cannot run it.

### One-server deployment (simplest)
1. Put this project into a Git repository.
2. Create a Node web service on a provider supporting persistent WebSocket connections, such as Render, Railway, or Fly.io. Hosting availability and pricing depend on the provider.
3. Build command: `npm ci && npm run build`. Start command: `npm start`. Use Node 22+ and the platform's PORT variable. The server binds 0.0.0.0 and uses PORT (8080 by default).
4. Enable HTTPS/TLS on the service. Route both normal HTTPS requests and /ws upgrades to this same Node process. A CDN must pass WebSocket upgrades. A reverse proxy must preserve Upgrade and Connection headers and allow long-lived connections.
5. Set ALLOWED_ORIGINS to your game page's exact HTTPS origin, for example `https://your-game.example`. Multiple origins are comma-separated. Leaving it empty accepts origins; room codes are invitations, not accounts or strong authentication.
6. Open the public game URL. In Multiplayer, enter `wss://your-game.example/ws`, choose a callsign, and Create Room.
7. A friend opens the same game URL on a different computer/network, enters the same WebSocket server URL, and joins your eight-character code (for example GHOST482). Choose teams and one of the five marked deployment points. The host chooses the arena and mode, then starts the match. Each player watches or skips insertion, then clicks Take Control. Players cannot shoot or take damage during insertion; the match clock continues.
8. Verify movement, damage, elimination, respawn, lobby return, and host disconnection from those two computers. This verification has not been performed in this environment.

`render.yaml` is an optional service blueprint. `Dockerfile` builds and serves the same project; no container was built in this environment. Configure a public domain, TLS, and any firewall rules in your hosting platform. Avoid putting a secure HTTPS frontend in front of an insecure ws:// server: browsers block mixed-content connections.

### Separate static frontend
Upload dist/ to your static host, including the built JS/CSS. Run the Node server separately using the same build and start commands. Set ALLOWED_ORIGINS to the static frontend origin. In the Multiplayer menu, enter the backend's public `wss://.../ws` URL. The privately hosted Sites preview does not host a Node WebSocket server; it intentionally asks for a backend address.

### Server architecture
The server creates private codes, limits rooms to eight human players, validates input, runs fixed 30 Hz simulation, sends 15 Hz snapshots, and owns ammunition, cooldowns, damage, health, respawns, scores, and match results. Clients render local predicted movement and interpolate remote avatars. The client predicts weapon feedback; hits and damage remain server-confirmed. Invalid commands, non-finite movement, packet size, and message rates are bounded. Disconnected hosts migrate to a remaining player. Rooms are in memory and are lost when the process restarts. Run one instance initially; horizontal scaling needs persistent room routing and shared state. There is no lag compensation, ranked matchmaking, account system, or comprehensive anti-cheat.

Game modes: Team Deathmatch (up to 4v4, 25 eliminations), Free-for-All (15 eliminations), Cooperative Survival (five AI waves). Competitive matches require at least two players; co-op can start with one. Every match has a timer. The host returning to the lobby resets the whole room; other players can return individually. Team changes are locked while a match is active. Joining in progress is disabled. Competitive friendly fire is off. Defeated online players respawn after four seconds at their selected point with brief protection. Deployment selection is locked during a live match.

## Project layout
- src/world.js: procedural materials, map renderer, avatars, lighting, effects.
- src/input.js: pointer-lock keyboard/mouse controller.
- src/weapon-view.js: first-person models, aiming and animation.
- src/audio.js: recorded firearm samples, browser synthesis for foley, footsteps and spatial audio.
- src/network.js: WebSocket client lifecycle and messages.
- src/main.js and src/style.css: game loop, mission HUD, menus, lobby, settings.
- shared/world.js: map data and colliders shared by rendering and authority.
- shared/physics.js: movement/collision and hitscan primitives.
- shared/weapons.js: firearm tuning.
- shared/ai.js: grid pathfinding, perception, patrol and cover behavior.
- shared/simulation.js: combat, objectives, equipment, match rules.
- server/index.js: HTTP/WebSocket rooms and authoritative fixed-step server.
- test/: movement, combat, progression, and independent WebSocket client tests.

## Graphics and limits
Low/Medium/High change pixel ratio, shadow resolution, and dust. Materials and textures are generated locally; there are no remote fonts or downloaded models. Debris and vegetation are instanced. The menu shows the live map. Weapon handling is procedural animation, with no motion-capture or photoreal asset pack. This build is a starting point for further art and feel tuning. Frame rate shown in settings is the current local render measurement, not an independently verified benchmark. No claim of professional visual fidelity or stable performance on untested hardware is made.

## License
The included source and original procedural artwork may be used, modified, and hosted for your project. The firearm recordings are by Vincent Sevedge (tabasco); this distribution preserves the original CC BY 3.0 attribution and notice; their source credit and original notice are included under public/audio/. Three.js, Vite, ws, and their dependencies retain their respective open-source licenses in the npm packages/lockfile.

## Update 0.2 — movement, audio, damage and sights
Arrow keys now work alongside WASD; pointer capture explicitly restores keyboard focus. Gunshots use edited real recordings rather than the previous synthesized sound, with distance filtering and quiet reflection tails. Taking damage produces a stronger red vignette, direction indicator, health-loss label and impact audio. Low health retains a warning pulse; reduced-motion preferences suppress camera roll and pulsing. Iron sights now align their front tip with the actual aim axis, use per-weapon angular magnification, and allow wheel zoom. Reloading and sprinting lower the sights. Procedural bump maps, finer cobblestones, wood grain, clearer haze, cooler skylight and a sky gradient improve surface detail without a heavy post-processing pass. High quality renders up to device pixel ratio 2; Medium/Low remain available.

## Update 0.3 — survival, deployment map and mission
Solo now starts with 150 health, six seconds of protection (ends when firing), and recovery at 10 HP/second after five seconds without damage. Easy is the default. AI now has longer reaction times, short bursts with pauses, lower damage, limited simultaneous attackers and a brief guard against stacked AI hits. New campaign deployments move nearby hostiles away from the chosen insertion point. Normal and Hard remain available; staying exposed can still be lethal. PvP weapon damage and maximum health remain unchanged. Co-op also gains slower AI, recovery and five seconds of spawn protection.

The map offers exactly five deployment choices: South checkpoint, Western lane, Eastern lane, North gate, Market courtyard. Points and objective locations are drawn from the same world coordinates as gameplay. Use the numbered map buttons or location list. The solo map appears before deployment and after defeat; the lobby map sends a validated point ID to the Node server for initial spawn and later respawns. The map is a deployment choice, not a live teleport ability.

Mission props mark the dossier, field radio and truck extraction zone. The HUD shows the three-step checklist, destination distance, progress bar, radio countdown, spawn shield countdown and recovery status. Radio progress pauses outside its range and resumes on return. Completion and defeat screens are retained.

## Update 0.4 — coins, armory, stamina and distinct missions
Every confirmed enemy elimination awards 10 coins, including knife and equipment eliminations. Rewards have unique kill IDs and duplicate delivery is ignored. Coins, gun unlocks, magazine levels, four equipment slots and completed missions save in browser localStorage. When storage is blocked the session remains playable, but its progress cannot persist. No account, real-money currency or cross-device synchronization is included.

Open Armory from the main menu, deployment screen or multiplayer lobby. The original four weapons remain available. Three earnable weapons are added: Brenwick L36 light machine gun (900 coins), Harrier C18 carbine (550), and Alder D6 heavy revolver (350). Magazine upgrades cost 30 then 60 coins and provide approximately +25% then +50% capacity. Select a slot beside an owned weapon and press Equip. All gear changes apply on the next deployment. Keys 1–4 refer to your four slots, not fixed gun IDs.

Solo and server combat calculate capacities from the bounded magazine level. Multiplayer receives the browser's loadout between matches, normalizes weapon IDs and magazine levels, and refuses live loadout changes. Elimination events and damage/ammunition remain server-generated. Progression ownership is a casual browser save, not a tamper-proof ranked economy; a trusted account/database service would be required for secure ownership across devices. Use the same updated client and Node server build.

Sprint stamina lasts about five seconds at full capacity. Sprinting drains 20 points/second; resting restores 22/second after a short delay. Exhaustion requires recovering 28 points before sprint can resume. Standing still, aiming and crouching do not drain sprint stamina. The HUD displays the bar and exhaustion state. Movement/stamina are simulated by the server in online matches.

The knife uses V or middle click, has a visible first-person swipe, and deals 125 damage only to an enemy in front within 1.85 meters, on approximately the same level and not behind a wall. It has a separate 0.65-second cooldown; a rifle shot does not lock out the knife.

Three selectable missions use the same Saint-Clair map with different objectives and world props:
1. Operation Ghost Town: recover the dossier, transmit for eight seconds, then extract south.
2. Operation Iron Silence: secure timed charges on two military trucks, then escape through the western lane. Charges create explosion effects on completion; trucks are disabled objectives rather than fully destructible vehicle models.
3. Operation Last Signal: recover supplies at the bakery, hold a courtyard radio for thirty seconds against two reinforcement groups, then evacuate north.

All three retain the five-point deployment map and checkpoint retries. Difficulty is an independent setting. Magazine animations, new-gun silhouettes, contact shadows, town posters and a subtle sky halo were added without a full-screen post-processing pipeline. Actual rendering, audio perception, frame-rate measurements and full browser playthroughs remain unverified.

## Update 0.5 — weapon mechanisms, slides and window sentries
Unlock prices now scale from the Alder revolver (350 coins) through the Harrier carbine (550) to the Brenwick light machine gun (900). Existing unlocks, coins and magazine upgrades are preserved. Starter gear remains available and elimination rewards remain 10 coins.

First-person gun models were rebuilt with contoured beveled stocks, rounded receivers, hollow trigger guards, muzzle bores, port and screw details, folding SMG furniture, LMG hardware and a revolver cylinder. Wood and steel use procedural surface textures. The bolt-action rifle now visibly lifts its handle, retracts the carrier, ejects a case, pushes forward and locks after each shot. The right glove follows the operation and mechanical clacks are scheduled to its phases. Semi/automatic firearms reciprocate their actions, the pistol slide cycles, and the revolver cylinder indexes. Ammunition and fire timing remain authoritative. Reload requested while a bolt is open waits until it closes.

Slide by building sprint momentum, then pressing C or Ctrl. A slide costs 25 stamina, lasts up to 0.75 seconds, lowers the collision capsule, follows its initial direction, decelerates and stops on a wall. A cooldown and stamina check prevent repeated boosts. Jump cancels it. The shared controller and server snapshots use the same state. Remote avatars lower their stance, and the first-person camera/weapon follow the slide.

Solo missions now start with twelve street patrols plus up to six upstairs window sentries, filtered away from insertion points. Co-op waves also add window sentries. Posts are on physical upper floors behind actual facade openings; walls still block their shots, and players can hit them through the windows. Sentries stay at their posts, scan the street, aim their guns and produce visible muzzle flashes. Limited simultaneous attackers, slower bursts and lower window-sentry damage retain the more forgiving opening. Increased density and new rendering detail need real-device performance testing.


## Version 0.6 — battlefield support
Added M tactical map, minimap, clickable map waypoints, squad markers and four-second nearby gunshot contacts (no hidden enemy tracking). Added six medical/ammunition stations: E interaction, 60-second shared cooldown, +60 capped health or three reserve magazines per equipped gun. Full supplies do not consume a station. Mission completion pays 150–200 coins once, with saved medal/time records and retry time/deaths included. Existing armory saves and prices remain compatible.
Validation: 51 automated checks pass, including authority, persistence, supply access/cooldowns, medal replay protection, and map visibility. Production Vite build passes. Browser play, visual presentation, pointer-lock/map interaction and audio remain unverified because this environment does not provide the supported browser QA tool. Internet multiplayer still requires separately hosting the included Node server.


## Version 0.8 — forest, insertion and map presentation
The jungle, Amazon and alpine arenas now contain 289, 299 and 297 deterministic trees respectively. Trunks are thicker and share their collision dimensions with the server. Detailed bark, branch geometry, layered alpha-cutout leaf cards, roots and fern undergrowth replace the former spherical/conical crowns. Low quality retains trunks and primary canopies while disabling fine foliage and undergrowth. Landing-zone clearings, camera approach corridors, stations and mission routes stay open.

All seven map covers are actual 768×432 game-scene captures made by the browser's existing Three.js renderer when the briefing opens. They use the same buildings, foliage, terrain and lighting as gameplay, and are cached in memory. Captures are generated one at a time during idle periods; no external image-generation service or stock photograph is used. If capture is unavailable, the card explicitly shows Preview Unavailable. Each capture restores the active arena and renderer state before returning to the game.

A dashed amber line and striped perimeter stakes mark the playable boundary on every arena. The deployment and tactical maps repeat this border; the HUD warns within four metres of the edge. Existing collision bounds remain authoritative.


## Version 0.9 — long flight, parachutes and night operations
Added Blackwood Nightfall with Silent Lantern and Midnight Watch operations, bringing the total to eight arenas and seventeen missions. Green night vision uses a low-light amplification pass with a goggle vignette, grain and scanlines, plus physical dual-lens goggles on the nighttime insertion character. N toggles the view. The helicopter cabin remains red-lit before the night-vision parachute view begins.

Each arena now has additional physical crates, sandbags, barriers, fallen logs and boulders: 25 extra cover objects in the town and 42 in each biome. These objects share collision data with AI and the server, stop bullets and preserve deployment/objective access. Playable forests contain 406 jungle, 427 Amazon, 414 alpine and 419 nighttime trees. Larger ground coverage and 1,500 decorative distant trees in forest/snow/town horizons create continuity beyond the marked playable boundary; the world remains finite. Desert and volcanic horizons use matching distant terrain formations. Night and other covers are still rendered directly from game scenes.

69 automated checks and the production build pass. Supported browser QA is unavailable in this environment; GPU night-vision rendering, cinematic appearance, timing usability, sounds and performance still require in-browser acceptance.


## Version 0.10 — first-person repeated landing checks
The opening exterior helicopter clip is now a six-second straight approach. Cabin seat-rise, rear-ramp walk and jump retain their previous relative durations and movement. The full insertion is 46 seconds.

The complete parachute timing section now uses the player's eye position and hides the exterior avatar. Camera-attached gloves, risers and legs show the first-person suspension; each successful tap briefly pulls the straps. Four distinct green-zone passes are required, with four visible progress markers. One tap cannot finish the landing, and rapid repeated clicks in one pass cannot award extra progress. The three-mistake limit, 18-second descent window, night vision, fatal landing and protected retry remain.

71 automated checks pass, including first-person camera placement, hand-pull feedback, repeated-pass requirements and the direct flight path. Browser visual/audio/interaction acceptance remains unverified because the supported browser QA tool is unavailable.


## Version 0.11 — faster zip-line insertion
Replaced the entire parachute/tapping system with an automatic 24-second helicopter-to-ground zip-line sequence. The first-person descent uses a metal handle, visible cable, wheeled trolley and harness sling, ending at the selected deployment point. The cabin sequence and landing/handoff are faster. Timing UI, timing code, insertion deaths and retry endpoints/screens were removed; normal combat deaths and respawns remain.

70 automated checks and the production build pass. All forty insertion paths stay outside solid geometry, the rider remains attached beneath the trolley, and online deployments enter combat without a timing result. Browser visual/audio/interaction acceptance remains unverified because the supported browser QA tool is unavailable.


## Version 0.12 — varied mission mechanics
Reworked the existing seventeen operations while keeping their mission IDs and saved completion records. There are fifteen distinct three-objective combinations. The original dossier mission remains a reconnaissance operation; Iron Silence now requires destroying three supply caches before sabotaging the north truck, and Last Signal rescues and escorts a captured operator after defending their radio. Biome operations mix these mechanics:

- Rescue / escort: press E at the captive, then lead the released teammate along ground routes. The teammate follows with shared collision/pathfinding, catches up when distant, and must reach extraction before E can finish. They are protected from combat damage so escorting does not require repeatedly restarting over companion deaths. Checkpoint retries restore previously rescued teammates.
- Commander hunt: defeat a marked 175-health officer protected by two guards. E cannot bypass the fight; defeating ordinary enemies does not count. The normal shared shooter limit and forgiving player health remain.
- Cache destruction: shoot, grenade or knife three physical supply targets. Their hit volumes match the displayed crates; destroyed crates become wrecks. Prop destruction does not award elimination coins or kills.
- Helicopter pickup: call Raven One with E, then hold within the landing area for fourteen seconds. Progress pauses outside the zone; a reinforcement group approaches midway. A transport helicopter visibly approaches the landing point.

Field-radio messages, mission-card mechanic labels, live cache/commander progress, a rescued-teammate map marker, and an active-target waypoint explain each phase. Existing coins, upgrades, checkpoint behavior, eight maps, night vision and the 24-second zip-line insertion remain. These are solo campaign mission changes; online competitive/co-op modes retain their existing rules.

77 automated checks and the production build pass. Added checks cover commander gating, real hitscan/grenade damage to caches, no prop-kill farming, teammate following through a doorway, escort proximity, checkpoint restoration, extraction hold/pause/reinforcements, all seventeen mission completions, and mission prop/helicopter rendering lifecycle. Browser visual/audio/game-feel acceptance remains unverified because the supported browser QA tool is unavailable.


## Version 0.13 — cinematic insertion and eight new operations

Campaign now has 25 operations across eight arenas. Each new Spearhead operation combines two field objectives with escort or helicopter extraction. Existing progression saves remain valid.

The 24-second zip-line insertion now uses articulated seated crew with subtle head/bracing motion, weathered transport panels and rounded hull details, a closer tracking shot, rotor-wash dust, and timed ramp/harness/pulley effects. Medium/high quality uses an optional floating-point cinematic grading pass with restrained glow, vignette and grain; low quality and unsupported GPUs use the normal renderer. Night vision keeps its green image. No parachute or timing minigame is included. Original procedural assets; no Call of Duty assets or claimed production parity.

Automated mission, scene and lifecycle checks plus production build verified. Browser visual/audio acceptance is unverified because the supported browser QA tool is unavailable.


## Version 0.14 — continuous patrols and fortified arenas

All 25 campaign operations receive recurring hostile squads (every 12/9/7 seconds on easy/normal/hard after the initial ten seconds). Replacements continue after kills and while moving between objectives, up to 18 living hostiles. Objective assaults share the cap. Reinforcements appear at least 24 meters from active players, out of direct line of sight, with clear collision volumes and a ground route into combat. Unsafe spawns wait for the next interval. Deployment, death, completion and competitive modes do not generate patrols. Co-op retains its existing five-wave format. Twenty-second corpse retention bounds the campaign snapshot; unique enemy IDs preserve kill rewards.

Every map has more solid crates, rocks, logs, barriers and sandbags (48 extra objects in town, 90 per biome, in addition to existing cover). Saint-Clair has three fighting trenches; each biome has five. These are earth-banked lanes at ground level, with timber revetments, duckboards, stacked rounded burlap sandbags and coiled barbed wire. Parapets stop bullets; wire blocks walking and can be jumped, while bullets pass through it. Tactical maps mark the trenches. Forest placement is denser with fuller fern understory; spawn areas, objectives, stairs and resupply access remain protected. Static fieldwork geometry is batched and bags are instanced.

Validation covers recurring patrols on all eight maps, concealed collision-free reachable spawns, active caps, corpse cleanup, deployment/completion gating, accessible trench lanes, wire movement versus bullet collision, and existing mission/network/scene regressions. Browser visual and audio acceptance remains unverified: the supported Sites browser QA runtime is unavailable in this environment.


## Version 0.15 — thermal night vision and automatic landing handoff

Night vision now combines green low-light scenery with bright pale-green heat signatures on living characters. Body materials carry the thermal marker; weapons and scenery retain their normal image. Standard depth testing still hides targets behind walls, so this is not through-wall vision. Turning goggles off restores original material emission, and newly arriving patrols receive the effect automatically. N toggles the combined mode.

Every map has more barriers (65 extra cover objects in town, 115 per biome). Biome compounds now stand 6.5–9.5 meters high, with upper facade windows and parapets. Most town buildings are three meters taller, while the hotel's accessible roof and stairs retain their original height. Forest maps have roughly 460–490 trees, more canopy overlap, and fuller fern understory. Spawn areas and objective routes remain clear.

The post-insertion Take control screen is removed. Deployment captures mouse control from the original click and retains it through the cinematic, then clears held input and enters combat automatically at the end of the descent. Online handoff sends deployReady once. Browser restrictions still apply if the user releases pointer lock or denies mouse capture; the existing Resume fallback can recapture the mouse.

Validation includes thermal emission/restoration and depth settings, direct solo/online handoff without an extra button, denser map layouts and building heights, and full mission, collision, scene, network and progression regressions. Browser visual/audio acceptance remains unverified because the supported browser QA runtime is unavailable.


## Version 0.16 — Dead City / ten-day zombie survival

Choose **Dead City · zombie survival** from the main menu. This separate solo mode starts in Civic Square, surrounded by sixteen ruined buildings and a distant city skyline. Four 24-meter towers have exterior stairs and rooftop access. Stair entrances are marked with arrows on the tactical map.

Survive ten full day/night cycles without dying. Days last exactly 120 seconds and nights exactly 120 seconds, totaling 2,400 active simulation seconds (40 minutes). Solo pause stops the clock. Death ends the run permanently; retry starts from day one. A day/phase countdown and total progress appear in the HUD. Dawn replenishes reserve ammunition and resets plaza supplies; E uses medicine/ammunition stations.

The issued loadout is key 1: Sentinel S7, a bolt-action sniper with a true 6× scoped view and adjustable magnification; key 2: AK-47, a 30-round automatic rifle fired by holding the trigger; key 3: pistol; key 4: survival knife, with left-click stabbing. V/middle-click still stabs while holding any firearm. These weapons are issued for this mode and do not alter the campaign armory.

Crawlers, runners and leapers continuously enter from the city perimeter. Crawlers stay low, runners pursue, and leapers jump toward nearby survivors. They use melee attacks instead of guns. Zombies can follow tower stair routes to roof-level players. Nights increase spawn pressure and later days increase zombie durability, with at most 38 living infected and ten-second corpse cleanup. Removed avatar meshes/materials are disposed to keep long sessions bounded.

At dusk the scene becomes dark and thermal night vision activates automatically; visible infected glow pale green while walls and buildings still occlude them. At dawn normal vision and daytime lighting return.

Automated checks cover exact phase boundaries and 40-minute victory gating, irreversible death, weapon switching/AK fire/reloading/stabbing, zombie variety/replenishment/caps, dawn resupply, player stair ascent on all four towers, zombie pursuit onto a roof, campaign weapon isolation, and city scene/thermal/scoped rendering lifecycle. Production build verified. Browser visual/audio acceptance and a real-time 40-minute playthrough remain unverified because the supported Sites browser QA runtime is unavailable.


## Version 0.17 — scoped trigger and first-person crash opening

The sniper accepts left-click while right-button aim or Q-toggle aim remains held. Trigger input is handled on the locked document so the scope layer cannot intercept it; all scope descendants explicitly pass pointer events through. The latest aim state is applied at trigger time, and recoil/bolt cycling retain aim. A subtle flash inside the scope supplies feedback while the world remains visible through the optic.

Dead City now begins with a 21-second first-person plane crash: shaking cockpit and propeller-engine descent, impact at eight seconds, a blackout with muffled sound and a decaying tinnitus tone, then a low crawl through the broken right-side hatch and a rise to your feet. Reduced-motion mode softens shaking. Input and the survival simulation stay inactive until the automatic handoff; the forty-minute survival clock and zombies start only after the crawl-out.

The aircraft remains as a persistent broken wreck at Civic Square. Fuselage panels, wings and tail provide physical cover and block bullets, while the side hatch, spawn and tower approaches remain clear. The persistent model is batched; the temporary airborne plane and hands are disposed. Engine loops, muffling and tinnitus are stopped/restored when canceling or completing the intro, and ringing respects volume/mute settings. Retrying repeats the intro with daytime lighting reset.

Automated validation covers repeated shots through right-held and Q-toggle scope aim, crash phases and final eye position, hatch/camera clearance, wreck collision and reachable towers, persistent wreck lifecycle, audio loop/filter cleanup, mute control, and a single automatic handoff before any survival time elapses. Browser visual/audio acceptance is still unverified because the supported Sites browser QA runtime is unavailable.


## Version 0.18 — uncontrolled crash with continuous impact

The plane now accelerates into the ground while banking both ways, pitching unevenly, yawing and drifting sideways. Terrain-warning alarms sound over the failing engines, and red cabin lights and warning indicators pulse. Reduced-motion mode reduces rotations and keeps warning lamps steady.

There is no blackout pause or camera teleport at impact. The cockpit camera rides the impact, bouncing ground skid and fuselage collapse before moving into the crawl-out. A moving wreck replaces the intact aircraft during the skid, with a short overlapping material blend. Sparks, tumbling fragments, soft dust and growing ground scars show contact with the street. The wreck and skid marks remain after the cinematic.

Scraping/impact sounds follow the skid; warning alarms stop at impact, engine and alarm loops stop on cancellation/handoff, and the existing muffled hearing/tinnitus recovers during the crawl-out. Camera position and view direction are continuous at the impact, transfer and crawl boundaries; the final field of view returns smoothly to the player's setting. Temporary geometry, particle textures and materials are disposed without destroying the persistent wreck.

Checks cover accelerating descent, banks in both directions, moving camera continuity without blackouts, red-light variation, alarm lifecycle, retained wreck/ground marks, safe crawl-out and existing gameplay regressions. Browser visual/audio acceptance remains unverified because the supported Sites browser QA runtime is unavailable.


## Version 0.19 — blackout, exterior aftermath and injured cockpit escape

The Dead City opening now lasts 29 seconds. The uncontrolled descent remains first-person. Impact briefly blacks out the survivor's view, then cuts to a moving exterior view of the wreck with two small wing-engine ruptures at 9.9 and 11.4 seconds. These are cosmetic effects away from the cockpit, with no player damage or destruction of the surviving fuselage. A short dark transition returns to first person before the escape.

The survivor now crawls only about 2.4 meters through the cockpit hatch over eleven seconds, using hesitant arm pulls, head dips, hand tremors, and one arm held in a bracing posture. A slow four-second rise follows. Synthesized nonverbal grunts and ragged breathing accompany the effort; these are generated audio effects, not recorded voice acting. Cues stop and release their audio nodes when canceling or finishing. Existing ringing and muffled hearing recover during the sequence.

The player spawns just outside the cockpit at x=2.55, z=5.3. The hatch, spawn and routes to all four towers remain collision-free. Automatic handoff starts the 40-minute survival clock and zombies only after the survivor stands. Persistent wreckage and ground scars remain.

Validation covers blackout-masked shot changes, exterior/hands visibility, bounded engine bursts, slow short crawl motion, spawn/camera collision clearance, tower access, cue cleanup and automatic handoff. Full automated regression suite and production build checked; browser visual/audio acceptance remains unverified because the supported Sites browser QA runtime is unavailable.


## Version 0.20 — human effort recordings and aerodynamic cargo plane

Replaced the synthesized vocal growl with four actual male effort/pain recordings by qubodup, from the CC0 pack “15 vocal male strain/hurt/pain/jump sounds.” The clips stay at their recorded pitch, with light filtering and pitch-preserving time stretch; breath noise is quieter. If a recording is unavailable, playback falls back to breathing rather than a synthesized growl. Samples use the volume/mute control and are stopped/released on cancellation. Credits and license provenance are bundled in public/audio.

Both the intact aircraft and persistent wreck now use an original aerodynamic cargo-plane model: rounded oval fuselage, tapered nose and rear body, curved cockpit glazing, high tapered airfoil wings, streamlined turboprop nacelles, raised swept tail surfaces, rear loading ramp, cargo-floor rollers, structural ribs, sparse cargo portholes and weathered metal panels. The wings span 24 meters. The exterior shot is wider to show the full silhouette. The wreck uses matching collapsed geometry, with larger wing/tail cover and the right cockpit hatch left physically and visually clear.

Validation includes recorded sample playback at natural pitch without a vocal oscillator, audio file/credit checks, rounded/tapered hull and high-wing geometry, finite scene data, visible hatch ray clearance, wreck collision, tower routes and existing gameplay regressions. Browser visual/audio acceptance remains unverified because the supported Sites browser QA runtime is unavailable.


## Version 0.21 — release-to-fire controls and rounded transport helicopter

Hold the right mouse button to aim; release it to fire one aimed shot. The scope remains up for a short 240 ms follow-through, so the shot uses the scoped aim state before lowering. Left-click firing and Q-toggle aiming still work. Repeated mouse-up events cannot fire extra shots, and blur, lost pointer lock, reloads, and weapon switches cancel a held release trigger. Knife mode ignores release-to-fire. Weapon fire rates, reloads and ammunition limits still apply.

The online action packet now includes the current aim state, fixing shots that previously used the older input snapshot's aim value. Predicted shot feedback respects bolt/action cooldowns. Combat actions are gated to the playing state, avoiding input during menus and cinematics.

The insertion and extraction helicopter now has a rounded, tapered transport fuselage, curved cockpit glazing and framing, arched cabin ribs, a clear open rear ramp, smooth raised rotor pylons, two turbine pods/exhausts, and landing gear. The existing tandem-rotor layout, spacious cabin, seated crew, red lighting, and 24-second automatic zip-line insertion remain intact.

Release checks cover the real input-to-game-action firing path, one aimed hit on release without left-clicking, follow-through aim, release cancellation, current aim over a live WebSocket connection, finite helicopter geometry, safe cabin/ramp paths, and the full campaign, city, progression, physics, cinematic, audio and network regression suite. Production build and downloadable archive checked. Browser visual/audio acceptance remains unverified because the supported Sites browser QA runtime is unavailable. Multiplayer still requires the existing separately hosted WebSocket server endpoint.
