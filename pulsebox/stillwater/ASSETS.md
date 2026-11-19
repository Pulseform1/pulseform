# Asset provenance

No downloaded monster models, third-party artwork, music recordings, fonts, or game-brand assets are used.

| Asset | Source |
| --- | --- |
| Eighteen distinct articulated quadrupeds plus a deforming blob, serpent and suction worm | Original runtime geometry and per-form animation in `public/creatures.js` and `public/extra-creatures.js`; v17 replaces former limb plans with substantial four-leg shoulder/haunch rigs while retaining species faces/shells/membranes |
| Continuous death scene | Original per-creature articulation/camera trajectories drawn from the selected actual rig by the game’s existing renderer; real death-location poolroom retained from the existing scene behind the creature, with no downloaded imagery |
| Creature portraits | Rendered in the browser from those same twenty-one models in a revealed pose; camera fits each full model |
| Skin detail and tile textures | Original deterministic DataTexture skin detail and canvas tile textures |
| Water shader, pooled chase spray and surface ripples | Original code in `public/scene.js` and `public/creature-wake.js` |
| Environment and avatar geometry | Original runtime geometry in `public/scene.js` |
| Logo wave mark and interface | Original SVG/CSS/HTML; platform system fonts |
| Quiet drips, bounded room echoes, twenty-one movement-driven creature signatures and selected-creature death stingers, proximity heartbeat and footsteps, optional music | Original Web Audio synthesis in `public/audio.js`, original deterministic nonverbal formant/noise vocals in `public/creature-voice.js`, and per-form profiles in `public/creature-audio.js`; no recorded or cloned human voices; music defaults off |

Third-party software: Three.js 0.180.0 (MIT), including its RoundedBoxGeometry helper and the copied `public/lib/BufferGeometryUtils.js` utility (upstream MIT notice retained), and ws 8.18.3 (MIT). Their license notices are reproduced in `THIRD_PARTY_NOTICES.md` and remain in their installed packages.

The visual direction takes broad inspiration from poolrooms and approachable social horror games. No Roblox characters, logos, textures, or extracted assets are included. No official age rating is claimed.

The v16 handheld torch geometry, checkpoint/rotating/sinking-platform labels and warning materials are original code-generated assets. No new external models, texture packs, audio downloads or credentials were added. The 21 native creature meshes are unchanged in provenance; authoritative world profiles enlarge their scale and collision envelopes together.

The v17 breach plume, four-leg tendons/pads, continuous jaw-rush trajectories and synchronized short water-breach sound are original procedural assets. The actual poolroom remains behind the attack.

The v18 cinematic-only recessed mouth/throat surfaces, irregular hooked teeth and direct/lateral/rising attack paths are original geometry and animation. They use the actual selected rig and retained poolroom backdrop; native world silhouettes and collision profiles remain unchanged.
