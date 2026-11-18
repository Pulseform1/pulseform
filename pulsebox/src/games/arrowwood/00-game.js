/* ARROWWOOD: first-person forest archery for two to eight friends. Take cover behind oaks and ruined walls in the
   King's Wood, draw, and land the last arrow. 1v1 and 2v2 are first to five round wins; Free for All is two and a half
   minutes of one-shot eliminations. Every elimination ends in a finisher picked by the bow that landed the shot.
   The match itself runs on the server (arrowwood/server/engine.js, shared with the practice range here); this page
   draws it, plays its sound and reads the controls. arrowwood/README.md says how to run and ship it. */
const GAME = {
  id: 'arrowwood', title: 'ARROWWOOD', tagline: 'Draw. Breathe. Land the last arrow.',
  font: 'Lilita One', accent: '#ffd23a', accent2: '#4fd15f', bg: '#2a6fc9', noSkins: true, noHud: true, noPause: true, scoreLabel: 'Matches won',
  how: [
    'Mouse and keys: WASD moves, mouse aims. Hold the left button to draw, let go to shoot; right button or Q lowers the bow without losing the arrow. Shift sprints, C crouches, Space jumps, F pings a spot for your team.',
    'Touch: left thumb moves; drag on the right to aim. Hold DRAW to pull the string and keep dragging (even from the button) to adjust; let go to shoot.',
    'A quick tap lobs a short arrow; a full draw flies far and flat. The faint dots show only the start of the flight. Headshots at full draw end it.',
  ],
  skins: [{ name: 'Default', price: 0 }],
};
