// @use mp
/* Duelpoint: a first-person 1v1 tactical shooter. One attacks and plants a charge on the site, one defends or defuses.
   Buy guns and shields between rounds, pick an operative with two abilities, first to five rounds.
   Built from the numbered parts in this folder (see MASTER_PROMPT.md for the design and what each part owns).
   This part: the record the kit reads. Everything after it runs inside one function, closed in 99-main.js. */
const GAME = {
  id: 'duelpoint', title: 'Duelpoint', tagline: 'One map. One rival. Every round counts.',
  font: 'Chakra Petch', accent: '#ff8a3d', accent2: '#35e0c8', bg: '#0c1016', noSkins: true, noHud: true, scoreLabel: 'Match score',
  how: [
    'Mouse and keys: WASD moves, mouse aims, click shoots, right click aims or scopes. Shift walks, Ctrl crouches, Space jumps, R reloads, 1 2 3 swap weapons, Q and E are your abilities, F plants and defuses, B opens the armory.',
    'Phone: left thumb moves, right thumb looks. Auto-fire shoots when your crosshair is on your rival; the buttons do the rest.',
    'Stand still to shoot straight. Your first shot lands exactly on the crosshair; moving throws it off. Tap the opposite direction to stop dead. Tap or burst at range: sprays climb, then sway.',
    'Attack: carry the charge to the ring and plant it. Defend: stop them, or defuse it. First to 5 rounds; sides swap after round 4.',
  ],
  skins: [{ name: 'Default', price: 0 }],
};
(() => {
  'use strict';
