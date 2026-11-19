# STILLWATER

A local, first-person 3D poolrooms parkour game with solo play and private rooms for up to four friends.

## Start

Node.js 22 or newer is required. First setup needs internet access to obtain Node.js and download the locked npm dependencies; neither is bundled in the ZIP. Dependencies are installed in the working project folder; the downloadable ZIP excludes them. Its Mac launcher installs the locked dependencies on first setup, or run `npm ci` yourself. See `START-HERE.md`.

On this Mac, double-click `start.command`, or run it from Terminal. Keep that Terminal window open. Visit **http://127.0.0.1:4173/?v=18** in a desktop browser with hardware acceleration, keyboard, and mouse.

Portable commands from this folder:

```sh
npm ci
npm start
```

Stop the server with Control-C. If port 4173 is occupied, use `PORT=4174 npm start` in macOS/Linux shells, or `$env:PORT="4174"; npm start` in Windows PowerShell, and open the printed address. This is an actual Node/WebSocket service, not a file that can be opened directly with `file://`.

## Play

**No mouse required:** use Tab or arrow keys to focus a menu control and Enter/Space to activate it. Choose **Play solo · keyboard only** on the title screen. Enter your name, choose a difficulty, press 1/2/3 to select a creature, then Tab to **Enter the pools** and press Enter. Keyboard mode enters the run automatically without requesting mouse capture. From the normal gameplay entry overlay, Enter also starts keyboard-only mode. Settings and the pause screen can switch modes later.

Choose **Enter alone**, enter a name and difficulty, select one of the three creatures, and enter the pools. **Click the game canvas or “Click to lock mouse” once** to request captured FPS mouse look; do not hold a button. Escape releases capture and opens the menu. Escape in that menu never requests capture; use Resume or click the exposed play area to capture again. Tab also opens the menu and retains ordinary focus navigation in menus. Clicking again retries capture even if a fallback mode is already active.

If the browser declines Pointer Lock, mouse look remains latched with no button hold. Move the pointer to look, or keep it near a screen edge to keep turning; leaving the game area stops edge turning. The HUD shows **MOUSE LOCKED** only while the browser actually owns the canvas pointer. Otherwise it says **CURSOR NOT LOCKED**. A physical canvas click retries real capture even after a saved keyboard/drag preference. If capture is unavailable or refused, a persistent panel offers **Retry capture**, **Open in Chrome** and **Keyboard only**. **Open in Chrome** attempts to open a fresh game in the installed normal Chrome browser (Safari if Chrome is absent) through a local-only, explicit launch action; start a run there and click the game to capture. Automatic OS launch previously failed in this environment with macOS Launch Services error−10822; use Copy browser link and paste it into a manually opened normal browser if launch fails. The latest two actual v17 clicks reached the browser with API support, trusted activation, visible/focused state, but both were rejected with Chromium `UnknownError` stating an internal bug. No actual canvas capture was granted. This is an observed browser failure; the game cannot override it. Five subsequent standalone diagnostic attempts failed with the same internal error, and the user reported the test also failed in separate Chrome. No successful external-browser result has been confirmed; a different browser such as Safari is an optional isolated test, not a promised fix. Pause also provides **Copy browser link** and **Copy mouse-capture details**. The latter preserves the last capture attempt even after pausing; a selectable text fallback works when clipboard access is unavailable. The independent `/mouse-check.html` page can test the browser capability without loading game modules. It reports only capture capability, attempts, outcomes and releases to a local-only in-memory buffer (64 records, expiring after15 minutes); it records no keys, pointer positions, cookies or browsing history. The game reports the same allowlisted capture results automatically, so a click can be diagnosed without copying a report. No data is uploaded outside this computer. No ordinary web page can force a browser to provide Pointer Lock. Keyboard-only play remains available. With the server running, double-click `play-in-browser.command` as an additional Mac launch route. Captured yaw uses relative movement and wraps network angles without limiting full turns. Arrow keys also look. Explicit no-capture and optional drag modes remain in Settings.

| Control | Action |
| --- | --- |
| WASD | Move |
| Mouse | Click once to capture; otherwise latched movement and edge turning |
| Arrow keys | Smooth accelerated look; adjustable speed in Settings |
| Q / E | Turn left / right 45° |
| C | Level the view for the next jump |
| Tab | Navigate menus; open pause while playing |
| 1 / 2 / 3 | Select a creature card |
| Space | Jump; when beside a ledge in water, climb out |
| Shift | Sprint |
| Escape | Menu / release mouse |
| F | Toggle the warm handheld torch |

Normal difficulty now targets a very fast physical rush: a representative clear-water stationary catch measured about **0.97 seconds**, versus 1.48s on Chill and 0.82s on Nightmare. These are measured simulation cases, not guarantees for every position. The creature still must travel along collision-clear paths and perform a visible windup/lunge; obstacles and competing targets can take longer.

The white-tiled platforms are safe. Water entry creates a disturbance and exposes you to a nearby resident creature. Jumping briefly above the water does not end exposure. A supported landing or completed mantle cancels even a pending attack. The hunter continues a nonlethal shore approach to the edge of your exit platform, then settles; stepping back into water exposes you again. Release and press Space again for another jump or mantle. The giant creature seeks a physically reachable attack position even beside platforms. Authored water openings and precise collision-checked approach endpoints keep between-platform gaps dangerous. A few non-route bank slivers are visibly tiled dry connections; intentional main and optional jumps retain wet gaps. Visible connections use the same support/collision bounds as their surfaces.

There are **100 actual resident monsters** across ten selected streamed rooms, arranged in five transverse columns and two longitudinal rows per room. The chosen archetype is featured near the start; the 21 archetypes populate the rest. Current/checkpoint rooms remain covered, distant residents sleep, and only nearby hunters navigate. Low/Medium/High render at most 4/6/8 nearby rigs, with independent histories and lower distant animation cadence. All 21 fixed monster scales and collision envelopes are 35% larger than v15.

Some long beams rotate horizontally: their collision, rider carry and takeoff momentum use the same shared transform as their visible surface. Ochre/amber tiles warn after first touch, then descend and lose support as they reach the water; they reset on a shared occupancy-safe schedule. Checkpoints never rotate or sink.

Every new run and retry receives a fresh shared seed; friends see the same course. Each room has two checkpoint intervals, and **three real routes connect every checkpoint to the next**. Blue **WIDE WAY** offers broad landings, amber **SHIFTING WAY** uses rotating beams and warned sinking tiles, and lavender **HIGH WAY** has longer, higher hops. Their separate platforms fan across the wide room and rejoin at the stable checkpoint; fork signs and colored arrows show the choices. Sinking tiles also carry their own warning label so an amber route stripe does not imply that every platform will collapse.

Nine shuffled physical architectures include divided galleries, pier colonnades, deep alcove baths, high ribbed vaults, staggered chambers, terraces and open basins. Wall and column placement, room width/height, platform arrangements, ceiling fixtures and restrained cool/warm/sickly palettes vary. Early hops remain approachable, with stable checkpoint and run-up decks between demanding sections. Hold Shift to build speed, then press Space near the edge. Walking remains4.6m/s and sprinting8.1m/s. Jump launch speed is now11.4m/s: the actual60Hz controller reaches a **3.00m apex** above takeoff, about42% higher than v17, with1.067s same-height airtime. Later HIGH WAY gaps reach about7.1m in the tested sample. These are actual gaps and routes, not decorative platforms. All three routes obey the same safe-platform and checkpoint rules.

A confirmed local death now switches the existing game renderer to a **continuous1.12-second creature attack**: the actual killing creature makes a rapid physical approach to impact at0.22s, then recoils. Three attack paths—direct, lateral and rising—vary by the actual killer instance and player life; repeated deaths do not replay the identical path. The lens stays fixed while the rig itself moves toward it. Articulated forelegs reach with the species-specific head, jaw and eyes. Cinematic-only recessed throats and correctly scaled hooked teeth replace the flat inserts while the world creature remains unchanged. A small pooled water plume and clipped underwater body establish the emergence rather than a portrait zoom. This replaces the earlier still-image presentation. The actual death-location poolroom is now visible behind it. A level view toward the creature retains tiled walls, water and room perspective as a single capped720p HDR capture, held for the short attack while the selected rig moves continuously in front. This uses the existing renderer, one backdrop quad and no second live context. If HDR capture is unavailable, the same renderer draws the actual room directly behind the rig. Background exposure stays at the gameplay brightness, separately from the creature; reduced intensity also keeps the room visible. Hidden world actors, cameras and rendering settings are restored and the capture is released on skip/exit. A short inhale and synchronized breach splash lead into a species-specific synthesized scream/growl, sharp attack transient, water impact and body thud, then a short echo/recoil tail. These layers follow the actual live phases; missed phases after a frame hitch do not burst later. Face/mouth anchors and foreground limbs are fitted per species, including large non-humanoid forms. Space, Enter, Escape or Continue skips immediately; blur, disconnect or a new round cancels it. Reduced intensity/reduced-motion uses a gentle 440ms portrait. There is no strobe or volume blast, and other players dying or a canceled safe-platform attack cannot trigger your scare.

Solo menus pause the authoritative simulation. In friend rooms, the world continues while one person opens a menu. Teal stable checkpoint decks save progress per player. A death plays the short scare, then automatically returns that player to their checkpoint; Continue skips the presentation but still respects the short respawn delay. A Return to checkpoint button also remains available. Surviving friends keep playing, and an all-dead party can resume without a new run. Reconnection preserves identity and checkpoint within the room retention window. Escape, focus loss, death, and disconnection release controls; delayed mouse-capture events cannot restart a paused run.

Graphics now start on **Low** for a lighter default; existing settings migrate once. Medium and High remain available. Static scenery is batched by material, all qualities avoid shadow maps and PointLights, one unshadowed handheld SpotLight is used, and rendering resolution is capped. These are resource reductions; actual browser FPS has not been measured.

Rooms are now about **95–129m wide and 72m long**, roughly 10× the former floor area per room, with intermediate parkour islands rather than impossible stretched jumps. Darker ambient light and short green haze limit distant visibility; the warm handheld torch follows your aim. Localized fluorescent shading and lit route/checkpoint markings keep nearby landings readable. The slightly murkier green/cyan water preserves surface highlights and ripples. Route arrows, long-jump signs and ledge trim remain visible. **Scene visibility** in Settings adjusts brightness from 0.75 to 1.4 without rebuilding rooms.

Mouse turning is now60% faster for existing saved profiles through a one-time migration, capped at4×. The adjustable mouse-sensitivity slider remains available; keyboard look speed is unchanged.

Settings include the torch, keyboard/mouse-look mode, keyboard look speed, scene visibility, mouse sensitivity, field of view, quality, music/effects volume, invert look, camera bob/shake, reduced scare intensity, and center dot. Best distance and preferences are stored only in your browser when storage is available.

The title screen now uses a darker water-level view, one partially revealed in-game creature, restrained horror typography and readable keyboard-accessible buttons.

A locally targeted player in water gets a synchronized **heartbeat, edge pulse and restrained camera tremor** as the creature physically closes in. Rate and intensity increase with real distance; distant teammates, safe platforms, pause, death and menus do not drive this feedback. The camera offset never alters movement or aim, and it clears on safety. Turn off Camera shake or Proximity heartbeat sound separately, or use reduced scare intensity and effects volume. Heartbeat defaults on for older saved settings; deliberate shake-off/mute choices remain respected.

The revised soundscape defaults to **music off**. Existing saved settings migrate once to that quiet default. Sparse drips and short room echoes use the effects volume; creature paddles, wading, sloshes, and other signatures respond to real movement, direction, and distance. Near an approaching creature, strokes accelerate and intermittent vocal cues become clearer with distance. A patrolling creature leaves only a faint occasional ring; genuine pursuit throws a bounded upward/backward spray, with droplets remaining in world space through turns. The particles and rings are pooled. There is no continuous threat drone or background noise bed. Optional music remains available in Settings.

## Twenty-one different forms

The roster now contains **18 articulated quadrupeds and three signature exceptions**: Dredge remains a visibly deforming blob, Gloomfin a serpent, and Sinkmaw a suction worm. Four-legged species retain different tall, squat, shell-backed, ring-backed, membrane-covered and heavy-forelimb anatomies. Selection portraits are rendered from the actual revealed models with individually fitted cameras.

| Creature | Body plan | Approach sound |
| --- | --- | --- |
| Dredge | Enormous asymmetrical blob with delayed wobbling tissue | Heavy slosh and bubbles |
| The Wader | Very thin four-legged crawler that unfolds on emergence | Long paired paddles and sparse creaks |
| Mirewalker | Long-faced four-legged stalker | Alternating paired wading steps |
| Glassjaw | Four-legged bell-backed hunter with hanging veils | Droplets and an intermittent soft resonance |
| Gloomfin | Long continuous serpent with sinuous movement | Sweeping water swishes |
| The Hush | Disk-backed hunter on four splayed articulated legs | Paired light strokes and flutter |
| Lockjaw | Low armored hunter with a hinged jaw and plated tail | Wet plated strokes and shell clicks |
| The Lantern | Four-legged mantle with broad membranes and an inverted face | Slow water pushes and a distant whistle |
| Sinkmaw | Upright telescoping suction worm | Gulping suction pulses |
| Knuckleback | Heavy forearms and small hind legs | Alternating heavy splashes and a breathy chuff |
| The Crown | Four-legged opening bivalve shell | Shell drag and sparse hinge creaks |
| The Siphon | Four-legged throat/pitcher | Paired wet steps and throat bubbles |
| Sawtooth | Hammerheaded quadruped with a dorsal blade | Slicing wakes and an edge chime |
| Guttercrawl | Segmented four-legged crawler | Rapid skittering and leg ticks |
| The Cradle | Hollow walking rib arch | Hollow steps and a low cavity hum |
| The Raker | Four weight-bearing finger-legs and a curled thumb | Dragging fingers and a hollow knock |
| The Knot | Ring-backed quadruped | Paired strokes and a resonant pulse |
| The Drifter | Sail-backed four-legged eye carrier | Membrane wash and soft resonance |
| The Drain | Four-legged conch shell and pincer | Shell steps and a conch-like call |
| Thornback | Spined four-legged split-shell hunter | Brushing water and sparse prickles |
| Shear | Four-legged mantis with blade forelegs | Paired strokes and a short clack |

Creatures keep fixed, larger world dimensions: the original eleven collision cores now have 2.025–2.43m radii, while the ten other forms have 2.7m cores and 2.8m navigation clearance. World scale and collision envelopes increased together by 35%; whole-body shrinking is not used. Limbs, wings and tails use authored folds/curls, and ceilings are at least 10m high. Surface offsets increase with model scale to preserve floor contact. Portraits show each native full form. Only visible choices and the actual killing creature are prepared for portraits/scares; the title animates one creature. These are procedural meshes, not downloaded photorealistic scans.

Soft masses deform locally with delayed folds/face motion; worm waves travel through segments, and articulated feet hold their world position during stance before swinging to the next step. These changes respond to actual motion rather than an untrusted speed label. Offline geometry previews show actual deformed vertices; they are not gameplay screenshots.

Every form still follows the same trusted water navigation and safe-platform rules. Different anatomy does not give a creature permission to attack a safe player.

## Friends

Create a friends room, share the code or invite link, ready up, and let the host open voting. Everyone sees the same three creatures. Most votes wins; the host breaks a tie when their choice is tied. A shuffle bag keeps exactly three distinct cards in each hand and offers all twenty-one creatures over seven rounds. Unfaced creatures are prioritized when a new bag is shuffled; offered and actually faced remain separate records.

**A localhost link works only on this computer.** For friends on the same trusted network, launch in a macOS/Linux shell with:

```sh
HOST=0.0.0.0 npm start
```

In Windows PowerShell, use `$env:HOST="0.0.0.0"; npm start`.

Friends then use this computer's LAN address and port 4173, with the server reachable through the local firewall. For internet play, deploy the supplied server behind an HTTPS/WebSocket-capable host and share that address. No public server or live website deployment was performed.

See [README-network.md](README-network.md) for the protocol and server deployment details.

## Included implementation

- First-person controller with buffered jumps, coyote time, air control, obstacle collision, and water-to-platform mantling.
- Shared deterministic physics and server-authoritative movement, exposure, creature targeting, attacks, and death.
- Twenty-one original procedural creature models with different anatomy and locomotion, with full-form portraits rendered from the same models.
- Three-card selection, votes, twenty-one-creature shuffle-bag rotation, and separate offered/faced tracking.
- Nine physical room families with seeded/mirrored routes, internal doglegs and switchbacks, optional challenge branches that rejoin the main path, streamed rendering, side recovery ledges, and bounded caches.
- Chill/Normal/Nightmare and bounded progression pressure.
- Per-player checkpoints, synchronized spinning/sinking platforms, 100 streamed residents and a handheld torch.
- Private rooms, ready flow, shared run state, spectator switching, restart agreement, reconnect identity, host transfer, and solo pause.
- Quiet synthesized spatial drips/echoes and individual movement-driven creature sounds, water ripples, wet tile materials, animated surface shader, rounded architecture, lighting, and game menus.
- Validated/rate-limited network messages; clients send controls, never authoritative positions.

## Verification and remaining limits

The automated suite and actual WebSocket tests run locally. See [VALIDATION.md](VALIDATION.md) for exact evidence.

**The user confirmed that refreshing and choosing Play with drag-to-look lets them enter and move with WASD.** After the rendering reductions they also reported that it was “Much smoother.” The user also confirmed that actual **Mouse locked** capture works in the in-app browser. These confirmations apply to preceding revisions; the user subsequently played v14 and requested a visible room backdrop plus another cursor-escape correction. The v15 backdrop and normal-browser route have CPU/HTTP checks, but actual in-app capture remains unconfirmed; its cause cannot be inferred without browser status/error evidence. No measured FPS is claimed. Agent-controlled rendered playtesting remains unavailable: both computer-use startup and an isolated installed Chrome launch aborted before rendering a page. There are no verified game screenshots or measured rendering FPS. Visual quality, input feel, shader behavior, and audio balance still need a full browser playthrough.

The twenty-one creatures are original procedural 3D art with sculpted continuous surfaces and articulated appendages. They are not scanned, professionally sculpted photorealistic assets. The world streams forward globally; its rooms contain genuinely turning main paths and optional split/rejoin routes, but it is not a globally maze-like network of rooms. Water has a custom animated lighting shader, not true ray-traced or screen-space reflections. Room fog is atmospheric distance fog rather than volumetric mist.

Online infrastructure, internet-latency tuning, mobile/touch play, controller support, and production load testing are not included. The supplied local server implements real multiplayer, but running two actual browser clients remains part of the unverified visual playtest.

## Website integration

The existing `box.pulseform.org` source and security configuration were not accessed or changed. Preserve its bot protection.

The simplest integration is a dedicated game subdomain backed by this Node server, with HTTPS and WebSocket upgrades for `/ws`. Link to it from the existing game catalog. The server uses root-relative asset URLs, so placing it under a nested path requires adapting the asset/import/socket paths or using an appropriate reverse proxy.

Deploy `public/`, `shared/`, `server.mjs`, `capture-diagnostics.mjs`, `package.json`, and `package-lock.json`; install the locked dependencies with `npm ci`. Keep the Node process running under your host's process manager. The game itself requires no API keys, database, or OpenAI runtime connection. Rooms are held in memory and disappear when the server restarts.

## Development

```sh
npm test
```

`shared/simulation.js` exposes the matching world-version identifier and fixed creature physics profiles, and owns tuning, deterministic rooms, player movement, and creature AI. `public/scene.js` renders it, `public/creatures.js` owns creature geometry, `public/audio.js` synthesizes sound, `public/keyboard.js` owns keyboard camera/focus helpers, `public/scare-presentation.js` defines continuous attack trajectories, `public/live-scare.js` uses the existing renderer for the selected rig, and `public/threat.js` owns the local heartbeat/pulse clock, `public/app.js` owns menus/input/prediction, and `server.mjs` owns private sessions and trusted simulation.

The browser's read-only `window.stillwater` diagnostics expose state, current player, and `stats()` for a future rendered playtest. Rendering FPS uses actual frame durations, not capped simulation steps.

See [ASSETS.md](ASSETS.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for asset provenance and dependency notices.
