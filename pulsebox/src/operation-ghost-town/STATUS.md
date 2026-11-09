# Implementation status

The user asked to begin with a core playable foundation and develop in stages. This build implements the foundation and the first versions of the remaining systems. Implementation is separate from release acceptance.

1. Core gameplay: town, physical movement, camera, collisions, doorways, roof access and shooting implemented. Physics and scene-graph checks pass. Browser feel/graphics acceptance pending.
2. Combat: four firearms, distinct tuning, sights, recoil, reload animation, synthesized spatial audio, hit effects, grenades, knife and traps implemented. Simulation checks pass. Browser animation and audio acceptance pending.
3. Multiplayer: Node/WebSocket authority, codes, lobby, teams, prediction/interpolation and disconnect handling implemented. Independent Node clients pass protocol checks. Two-browser and cross-network tests pending; hosted static build needs its separate Node service.
4. Modes: Team Deathmatch, Free-for-All, Cooperative Survival implemented. Rule tests pass. Live multiplayer acceptance pending.
5. Mission: two intelligence pickups, checkpoints, extraction, patrol AI, difficulty and results implemented. Progression/pathfinding checks pass. Human playthrough pending.
6. Polish: procedural map detail, batched static geometry, instanced debris/vegetation, pixel-ratio/shadow settings, live FPS display and menus implemented. Final visual review, benchmarks, content tuning and two-browser QA pending.

No Quick Match option is shown because matchmaking is not implemented. Accounts, server-backed account persistence, lag compensation, advanced anti-cheat, rooftop AI navigation, controller/mobile controls and photoreal imported asset packs are outside this foundation.

## Update 0.2
Added arrow-key movement and focus recovery, attributed recorded gunshots, stronger damage feedback, aligned iron sights with adjustable zoom, and more detailed procedural materials/lighting. Automated checks now total 21. Browser playtesting and cross-network multiplayer verification remain pending.

## Update 0.3
Added a five-point deployment map for solo and multiplayer lobbies, checkpoint retries from a chosen location, 150 solo health, spawn protection, delayed regeneration, safer enemy placement and less punishing AI bursts. Expanded the mission into dossier recovery, an eight-second radio transmission and truck extraction, with physical props and visible HUD progress. The suite now has 28 checks. Full browser/UI and cross-network acceptance remains pending.

## Update 0.4
Added ten-coin elimination rewards, browser-saved armory progression, three unlockable guns, two magazine levels, four equipment slots, stamina and exhaustion, and a dedicated frontal knife strike with animation. Added three actual mission rule sets: intelligence recovery, truck sabotage and radio defense with reinforcements. Added contact shadows, posters and new weapon detail. The suite has 38 checks; actual browser playthrough, perceptual graphics/audio review and cross-network acceptance remain pending.

## Update 0.5
Raised unlock prices to 350/550/900, rebuilt the seven gun models, added a complete manual bolt cycle with case ejection and timed foley, added shared/server-validated sprint slides, and expanded patrol density with physical upper-window posts. Co-op waves also include window sentries. The suite now has 47 checks. Actual browser visuals/control feel, cross-network play and hardware performance acceptance are still pending.


## Version 0.6 — battlefield support
Added M tactical map, minimap, clickable map waypoints, squad markers and four-second nearby gunshot contacts (no hidden enemy tracking). Added six medical/ammunition stations: E interaction, 60-second shared cooldown, +60 capped health or three reserve magazines per equipped gun. Full supplies do not consume a station. Mission completion pays 150–200 coins once, with saved medal/time records and retry time/deaths included. Existing armory saves and prices remain compatible.
Validation: 51 automated checks pass, including authority, persistence, supply access/cooldowns, medal replay protection, and map visibility. Production Vite build passes. Browser play, visual presentation, pointer-lock/map interaction and audio remain unverified because this environment does not provide the supported browser QA tool. Internet multiplayer still requires separately hosting the included Node server.


## Update 0.7
Six additional biome arenas (jungle, desert, Amazon, alpine, Arctic, volcanic), twelve additional solo operations, shared collision/AI data, biome lobby selection, a 23-second first-person/exterior helicopter rappel insertion and optional ten-step interactive field training are implemented. Existing town missions, armory saves, forgiving health and checkpoint retries remain. Online insertion blocks combat until Take Control. 60 automated checks and production build pass; browser audiovisual and cross-network acceptance remain pending.


## Update 0.8
Expanded insertion into first-person seat rise, walk to door, rope grasp and controlled exit; replaced the exterior hero with an articulated rig and a braced landing/recovery/harness-release sequence. Added thicker, denser forests with detailed instanced foliage and low-quality detail reduction. Added marked boundaries in the world/maps plus an edge warning. Replaced silhouette cards with browser-generated captures from the actual arena scenes. 65 automated checks and the production build pass; browser visual/audio acceptance remains pending.


## Update 0.9
Removed the interactive tutorial. Added extra solid cover throughout all maps, denser forests and extended distant scenery. Added Blackwood Nightfall and two night operations with green NVG rendering and N toggle. Replaced the rope insertion with a 70-second map flyover, a larger red-lit tandem-rotor cargo helicopter, first-person rear-ramp exit, parachute deployment and a timing-based landing flare. Failure causes death and supports a direct parachute retry. Server state protects deploying players and owns failed-drop deaths/retries; the timing result is client-reported. 69 automated checks and the production build pass; browser audiovisual, NVG, performance and real-network acceptance remain pending.


## Update 0.10
Shortened the exterior helicopter approach to six seconds on a straight path, while preserving the cabin walk and rear-ramp jump. Parachute tapping now uses first-person eye placement with riser hands and pull feedback, and requires four successful taps on distinct green passes. Four HUD markers show progress. Total insertion duration is 46 seconds. Three mistakes or timeout still cause a failed landing with protected retry. 71 checks and the production build pass; browser acceptance remains pending.


## Update 0.11
Cut insertion from 46 to 24 seconds and replaced the parachute with an automatic cable/trolley zip line to the selected spawn. Accelerated the approach, cabin movement and handoff. Removed the canopy, green timing bar, multi-tap rules, insertion failure/death logic and retry endpoints/screens. Retained first-person descent, night vision and deployment protection. 70 checks and the production build pass; browser acceptance remains pending.


## Update 0.12
Reworked campaign missions with real rescue/escort teammates, protected checkpoint-restored companions, commander/guard fights, three-target cache destruction and defended helicopter pickup. Added mechanic labels, radio messages, live objective progress, friendly map markers, wrecks and an approaching extraction helicopter. Existing mission IDs, armory saves, health/shooter balance and 24-second zip-line insertion remain. 77 checks and the production build pass; browser acceptance remains pending.
