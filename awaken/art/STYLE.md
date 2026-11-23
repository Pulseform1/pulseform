# Awaken sprite style guide

Awaken is a dark, glowing "System" workout game. The background is deep navy (#06142a) fading to near-black, and the UI is cyan/blue glass. Sprites show the enemy you're fighting in a gate battle, plus gear, shadows and rewards. They must read as **threatening and exciting** at a glance on a phone.

## Format (strict)

Each batch file in `art/sprites/` is JSON:

```json
{"sprites": [
  {"id": "goblinchieftain", "name": "Goblin Chieftain", "size": 32,
   "palette": {"o": "#0b0e17", "g": "#4f8a3a"},
   "rows": ["................................", "... exactly 32 rows of 32 chars ..."]}
]}
```

- `size` is 32 for enemies and 16 for gear and items. Use exactly `size` rows of exactly `size` characters.
- `.` is transparent. Every other character is a key in `palette`, and every value is `#rrggbb`. Use at most 18 colors; 10–16 is the sweet spot.
- **Check your work:** `python3 tools/render-sprites.py art/sprites/<batch>.json` (run from `awaken/`) prints OK or the exact errors and writes `art/previews/<batch>.png`. Open that PNG with the Read tool and look at it.
- **Rebuild the app's file:** `python3 tools/build-sprites.py` rebuilds `sprites.js` from every batch.

## Look

- **Pixel art with a clean silhouette.** Use a 1 px dark outline (`#0b0e17` or a darkened hue). Light comes from the top-left. Each material gets 3–4 tones (shadow, base, light, highlight). No pillow shading, no noise.
- **Pose:** enemies face the viewer in a three-quarter view turned slightly left, like a classic JRPG battle enemy. They stand on rows 29–31, centered.
- **Glowing eyes** (bright yellow, red, cyan or violet, 1–2 px) on anything with eyes.
- **Size:** bosses fill the frame (26–31 px tall). S-rank bosses feel colossal and may crop at the edges. Minions are smaller (18–24 px tall) on the same baseline.
- **Rank feel:**
  - **E/D:** scrappy and earthy.
  - **C/B:** armored and colder.
  - **A:** dark, demonic or undead.
  - **S:** legendary and saturated (gold, crimson, bioluminescence).
  - **Trial bosses:** System constructs with glowing cyan or gold runes.
- **Readable at 5× (160 px):** bold shapes, strong contrast, and one clear focal point (weapon, maw or eyes).
- **Gear and items (16×16):** one centered object, 1 px outline, 3-tone shading.
  - Weapons run diagonally, handle bottom-left to tip top-right.
  - Rank tint: E grey/iron, D bronze, C cyan steel, B violet, A crimson, S gold.
- **Original designs only.** Don't copy any existing game's sprites or characters.

## Process

1. Draft the batch.
2. Render it and fix any errors.
3. Look at the preview PNG. Does each sprite read as its creature at a glance? Is the silhouette clear, the light consistent, the eyes glowing, the figure centered on the baseline?
4. Revise. Do at least two look-and-revise passes.
