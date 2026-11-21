// @use mp
/* Duelpoint: a first-person 1v1 tactical shooter. One attacks and plants a charge on the site, one defends or defuses.
   Buy guns and shields between rounds, pick an operative with two abilities, first to five rounds.
   Built from the numbered parts in this folder (see MASTER_PROMPT.md for the design and what each part owns).
   This part: the record the kit reads. Everything after it runs inside one function, closed in 99-main.js. */
const GAME = {
  id: 'duelpoint', title: 'Duelpoint', tagline: 'Tactical rounds, 1v1 up to 5v5. Plant, hold, clutch.',
  font: 'Chakra Petch', accent: '#ff8a3d', accent2: '#35e0c8', bg: '#0c1016', noSkins: true, noHud: true, scoreLabel: 'Match score',
  how: [
    'Mouse and keys: WASD moves, mouse aims, click shoots, right click aims or scopes. Shift walks, Ctrl crouches, Space jumps, R reloads, 1 2 3 swap weapons. C, Q, E and X ready your abilities: click to use one. G throws a smoke, F plants and defuses, B opens the armory, Y inspects, J pings a spot. Every key can be changed in Settings.',
    'Phone: left thumb moves, right thumb looks. Auto-fire shoots when your crosshair is on a rival; the buttons do the rest.',
    'Stand still to shoot straight: your first shot lands on the crosshair, moving throws it off. Sprays climb, so pull down.',
    'Attack: carry the charge to a site and plant it. Defend: set up on your half in the buy phase, stop them, or defuse it. Rounds pay credits for better guns; sides swap at the half.',
  ],
  skins: [{ name: 'Default', price: 0 }],
};
(() => {
  'use strict';
