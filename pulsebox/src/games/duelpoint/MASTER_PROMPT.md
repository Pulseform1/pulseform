# Duelpoint: master prompt for the ground-up rebuild

You are rebuilding Duelpoint, the 1v1 tactical shooter on Pulsebox (box.pulseform.org), from an empty file. The
first version grew by accretion: a block map, then guns, then tactical gunplay bolted on, then a knife, each as a
patch on the last. It plays, but it was never designed as a whole, and it does not work on phones at all. This
document is the design it should have had. Build to it, test against it, and where it is silent, decide the way a
player would want and note the decision at the bottom.

## What the game is

Two players, one small map, one site. One attacks and tries to plant a charge on the site; the other defends, by
killing the attacker or defusing the charge. Rounds are short and lethal. Between rounds you spend the credits you
earned on guns and shields, so a match has pistol rounds, scraped-together cheap rounds and full buys. You pick one
of three operatives, each with two abilities, one use of each per round. First to five rounds wins; sides swap after
round four. You play a bot (three difficulties), a friend online through a room code, or the practice range.

The person who asked for this wants the feel of a competitive tactical shooter: precise, readable, punishing in a
fair way. It must stay an original game. The genre and its mechanics are free to use. No existing game's names,
characters, maps, weapon designs, colours or interface are, so Duelpoint has its own place (Saltworks, a sea-side
salt yard), its own operatives, its own sixteen guns and its own look. Do not use the red #ff4655.

## The four things that must be true

1. **The gunplay is exact.** Standing still, the first bullet goes where the crosshair is. Moving throws shots off;
   stopping brings accuracy back at once, and tapping the opposite key (a counter-strafe) stops you faster than
   letting go. Sprays climb, then sway, and settle when you let go. Head, body and legs take different damage and
   some guns lose damage with range. The crosshair shows the real error. These rules were asked for by name, so the
   tests measure them in numbers.
2. **It plays properly on a phone.** This is the part the first version failed, for two reasons to fix at the root.
   The hub shows every game in a small 16:9 strip (about 390 by 219 CSS pixels on a portrait phone, with no working
   fullscreen on iPhones), and the game drew its controls and text at desktop size inside that strip. So: the hub
   gets an immersive mode that gives a touch player the whole screen, turned sideways if they hold the phone
   upright; and the game lays its interface out for the screen it is on, with touch targets at least 44 CSS pixels
   and text at least 11. The touch scheme is designed for two thumbs, not ported from a mouse.
3. **You can always tell what is happening.** Where the rival was last seen or heard, how much time is left, what
   you are holding, why you died. A minimap, sounds that come from the right direction, a kill feed, round banners
   and a clear buy screen carry this, and nothing on screen is decoration.
4. **It is built to be changed.** Rules, bots and networking run without a renderer, so they can be tested in
   Node in a second. Every system lives in its own file with a comment at the top saying what it owns.

## Decisions already made (do not reopen these)

- Id stays `duelpoint` (same address, saves and hub entry). It stays a kit game with `// @use mp`, so the hub's
  scores, pause, sound switch and room invites keep working. Three.js r128 from cdnjs, loaded at run time, one
  script, no other dependencies.
- Weapon numbers carry over from the first version. They were tuned to the request and tested: 16 guns in
  sidearm, SMG, shotgun, rifle, sniper and heavy classes, plus the knife. The detailed gun models carry over too
  (they were rebuilt twice to the owner's taste). Everything else is written new.
- There are no bought smoke grenades; the owner said they are not needed. Vex's Veil ability, which is a smoke,
  stays, because operatives were not part of that remark.
- The knife is always carried: slash 50 (75 to the head), stab 75, or 150 into the back; faster running with it out.
- Economy: start 800; win 3000; loss 1900, 2400, then 2900; kill 200; plant 300; cap 9000. Round 5 is a second
  pistol round. A 4-4 decider gives both players 5000.
- Timings: buy 15 s (ends early when both players close the armory), round 80 s, plant 3.5 s, fuse 38 s,
  defuse 6 s, round end 4.5 s.
- Shooter-side hit detection online, as before: what you see is what you hit, your own damage is applied on your
  own device, the host runs the clock and calls the rounds.

## The map: Saltworks

One hand-authored map on a grid of 2 m cells, 32 by 22, because a grid keeps collision, bullets, sight lines and bot
paths cheap and exact. Unlike the first map it has shape:

- **Three ways in.** *Pier*, a long open lane on the sea side for rifles and snipers; *Yard*, the short middle
  through a doorway; *Tunnel*, a roofed lane for close fighting that comes up beside the site. The attacker needs
  7 to 12 seconds to reach the site, the defender about 3, so the defender sets up but cannot watch everything.
- **Height.** A raised loading dock in the corner of the site, reached by stairs from the defender's side or a jump
  from a crate. Low crates you can crouch behind and jump onto, tall containers you cannot see over.
- **A place.** White-washed walls with a painted band whose colour names the lane, corrugated containers, timber
  crates, a roofed tunnel with lamps, a low sea wall on the Pier side with open water and sky beyond it. The site is
  a painted ring on the ground.

Cells carry a height, and may be a ramp (height changes across the cell), roofed (bullets and sight stop above the
roof) or a fence (low to look at and shoot over, but you cannot leave the map across it). Rays, movement and
navigation all read the same cell data, and the world mesh is generated from it: only visible faces, textures
sized in world units, corners darkened in vertex colours.

## Rules of motion and fire

- Run 5.4 m/s, walk 2.7, crouch 2.3. Ground acceleration is linear and quick; braking against your motion is the
  fastest change of all. Jump apex about 1 m. You step up 0.42 m without jumping.
- Accuracy is an angle in degrees: first-shot error (zero for most guns when still), plus movement error (none
  below 28% of run speed, the walk figure at half speed, the run figure at full, the jump figure in the air), plus
  spray error that grows per shot after the free ones and decays in the gun's recovery time.
- Spray pattern: a climb per shot up to a ceiling, then a side-to-side sway whose phase is random per spray.
- Right click (or the aim button): aim down sights on SMGs, rifles and the machine gun; scope a sniper; the free
  pistol's three-round burst; the knife's stab.
- Bullets leave marks where they land. Tracers start at the muzzle.

## Phone controls

- Left half of the screen: a stick that appears under the thumb. How far you push is how fast you move, so half a
  push is a quiet, accurate walk.
- Right half: drag to look. The fire button also looks while held, so you can track a target while shooting.
- Fire repeats for every gun while held. Auto-fire (on by default, with a switch) shoots for you when the
  crosshair is on the rival and you are accurate enough. Aim assist (on by default, with a switch) slows the look
  near the rival and leans gently toward them. Neither exists with a mouse.
- Buttons: fire, aim, jump, crouch (a toggle), reload, weapon slots, the two abilities, and one large plant/defuse
  button that only appears when it can be used. In the buy phase a large ARMORY button.
- Upright phone, outside the hub: a full-screen "turn your phone sideways" card. In the hub the immersive mode
  turns the game instead.

## Interface

Drawn on the kit's 2D canvas over the 3D view, laid out from anchors with a scale factor so the same code serves a
27-inch monitor and a 6-inch phone.

- **In play:** score, clock and round pips at the top; minimap top left (you, your facing, the site, the charge,
  and the rival only while seen, heard or pinged); kill feed top right; health and shield bottom left; abilities
  bottom centre; weapon, ammo and the three slots bottom right; crosshair that opens with error; hit marks;
  damage direction; plant and defuse progress; banners for round start, plant, defuse and round end; after a death,
  who killed you with what and how much health they had left.
- **Armory:** tabs by weapon class, large cards with a rendered picture of each gun, price, and the numbers that
  matter (damage to head, body, legs; fire rate; magazine). Tap to buy; tap again to sell back this round.
- **Menu:** choose an operative; play a bot (three difficulties), play online, or the range; settings for look
  sensitivity, aim assist, auto-fire and picture quality.
- **Crosshair** (asked for during the build): the player designs their own. Shape (cross, dot, circle, tee),
  colour, arm length, gap, thickness, centre dot, outline, and whether it opens with error or stays fixed, with a
  live preview and a few presets. Saved with the other settings.
- **Match end:** result, score, and the match in numbers (kills, headshots, damage).

## Bots

A bot is a player with the same body and guns, the same accuracy rules and no knowledge it has not earned by
sight or sound. It buys for the round type. Attacking, it picks a lane, clears it, plants, and holds a spot that
watches the charge. Defending, it holds an authored angle, turns toward noise, and comes to defuse when it is safe
or when it must. In a fight it stops (or counter-strafes) to shoot, bursts at range, sprays close, pulls down
against the climb, and uses its abilities with a reason. Recruit is slow and misses; Elite is quick, goes for the
head and repositions. Paths are smoothed so bots do not walk the grid.

## How it is built

`src/games/duelpoint/` holds numbered parts that the build joins in order into one page:

| Part | Owns |
|---|---|
| `00-game.js` | The kit's GAME record and how-to-play text |
| `10-core.js` | Maths helpers, settings and saved stats, the hooks the simulation calls for pictures and sound |
| `20-data.js` | Guns, shields, operatives, difficulty levels, timings, economy |
| `30-map.js` | Saltworks: cells, heights, rays, movement queries, navigation, authored spots |
| `40-sim.js` | Fighters, movement, shooting, knife, abilities, the charge, rounds, money, the match clock |
| `50-bot.js` | Bot buying, planning, aiming and fighting |
| `60-net.js` | Online play over the room relay |
| `70-gfx.js` | Three.js setup, textures, sky and light, picture quality |
| `72-world.js` | The world mesh and props generated from the map |
| `74-agents.js` | Fighter models and their animation |
| `76-guns.js` | Gun models, first-person hands, casings (carried over) |
| `78-fx.js` | View model motion, tracers, impacts, marks, smoke, walls, the charge, the frame render |
| `80-audio.js` | Synthesised guns, steps and cues, placed in stereo by direction and distance |
| `90-input.js` | Keyboard and mouse, touch, aim assist, auto-fire |
| `92-hud.js` | Everything on screen during a round |
| `94-menus.js` | Menu, armory, settings, match end |
| `99-main.js` | The kit hooks, demo and cover-art modes, the test handle |

Parts 10 to 60 never touch the page or Three.js. `tools/duelpoint-sim-test.mjs` loads them in Node and checks the
map (every row the right width, all three lanes connect, the dock is reachable), the gunplay numbers above,
damage tables, the economy, the knife, and whole bot matches for errors, stuck bots and rounds that never end.

## Done means

- The Node tests pass, and twenty bot-versus-bot matches finish with no errors and no stuck fighter.
- In a desktop browser: a full match against a bot plays through; pictures of every screen have been looked at.
- On an emulated phone, through the hub: the game fills the screen, sideways when the phone is upright; stick,
  look, fire, aim, jump, crouch, reload, weapon swap, abilities, armory and plant all work by touch, and every
  touch target and line of text meets the sizes above.
- Two browsers play an online round through the live relay: both see the same score, the same plant and the
  same kill.
- New trailer, cover and screenshots; hub entry updated; committed, pushed, deployed and checked live.

## Decisions made while building

(Added as the work goes.)
