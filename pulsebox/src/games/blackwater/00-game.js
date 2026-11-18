// @use mp
/* Blackwater Drift: first-person ocean survival. You wake on a tiny raft with a rope hook and an unlit torch.
   Haul in wreckage, build the raft out, fish, cook, and keep it together through storms, sharks and whirlpools.
   On very rare nights something vast rises out of the sea.
   Built from the numbered parts in this folder. 10-60 are the simulation (no page, no Three.js: they run in Node for
   tools/blackwater-sim-test.mjs); 70+ draw it, play its sound and read the controls. README.md says how to ship it. */
const GAME = {
  id: 'blackwater', title: 'Blackwater Drift', tagline: 'No land in sight. Haul in the wreckage. Outlast the sea.',
  font: 'Barlow Condensed', accent: '#e8b45a', accent2: '#6fd2de', bg: '#04101a', noSkins: true, noHud: true, scoreLabel: 'Days survived',
  how: [
    'Mouse and keys: WASD walks, mouse looks. Hold the left button to charge a throw, let go to cast; hold it again to reel in. Right button cancels. E grabs and uses things, 1-7 pick a tool, B builds (with the hammer), C crafts, Shift braces, Space jumps or swims up, O settings.',
    'Touch: left thumb moves, drag anywhere on the right to look. Hold USE to charge and cast, hold it again to reel; keep dragging while you hold it to aim.',
    'Hook planks, barrels and crates as they drift past. Build foundations to grow the raft, a fishing rod to eat, a spear for sharks, an oar for currents.',
  ],
  skins: [{ name: 'Default', price: 0 }],
};
(() => {
  'use strict';
