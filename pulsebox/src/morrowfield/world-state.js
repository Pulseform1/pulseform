import {isFenceType} from './placement-types.js';
/* Morrowfield's deterministic, renderer-independent world model. */
export const WORLD_FORMAT = 'morrowfield-world';
export const WORLD_VERSION = 1;
export const MATERIALS = ['grass', 'soil', 'sand', 'rock', 'snow', 'jungle'];
export const WORLD_SIZES = Object.freeze([128, 192, 256, 384, 512, 768, 1024]);
export const DEFAULT_REGION_SIZE = 1024;
export const WORLD_PRESETS = Object.freeze([
  Object.freeze({ id: 'grassland', name: 'Open grassland', description: 'A completely flat, empty meadow with room for anything.', biome: 'grassland', color: '#9eb768' }),
  Object.freeze({ id: 'desert', name: 'Quiet desert', description: 'A flat stretch of warm sand, ready for an oasis or a town.', biome: 'desert', color: '#d8c794' }),
  Object.freeze({ id: 'pond', name: 'Pond meadow', description: 'An open meadow with one small, contained pond.', biome: 'grassland', color: '#78b5a2' }),
  Object.freeze({ id: 'highlands', name: 'Rolling highlands', description: 'Gentle grassland backed by distant hills, without buildings or water.', biome: 'grassland', color: '#899a73' }),
  Object.freeze({ id: 'jungle', name: 'Rainforest floor', description: 'Rich, deep-green ground for a tropical world.', biome: 'jungle', color: '#4d8054' }),
  Object.freeze({ id: 'sand', name: 'Coastal sands', description: 'A flat expanse of pale sand, ready for a coastal settlement.', biome: 'sand', color: '#e2cf9b' }),
  Object.freeze({ id: 'ocean', name: 'Open ocean', description: 'Clear water above a sandy seabed. Raise land to make your own islands.', biome: 'ocean', color: '#4e9da9' })
]);
export const REGION_DEFS = Object.freeze([
  { id: 'meadow', name: 'Meadowlands', preset: 'grassland', lat: 48, lon: -105, color: '#9eb768', description: 'Open, level grassland for a village, city, or wild reserve.' },
  { id: 'sahara', name: 'Sahara', preset: 'desert', lat: 24, lon: 18, color: '#cfad75', description: 'Warm desert sand with room to shape dunes and oases.' },
  { id: 'rainforest', name: 'Emerald rainforest', preset: 'jungle', lat: -8, lon: -58, color: '#4d8054', description: 'A tropical region with a rich green forest floor.' },
  { id: 'ocean', name: 'Azure ocean', preset: 'ocean', lat: 3, lon: -150, color: '#4e9da9', description: 'A broad ocean building region. Raise islands from the seabed.' },
  { id: 'alpine', name: 'Alpine highlands', preset: 'highlands', lat: 47, lon: 75, color: '#b5c0ad', description: 'Green uplands and sculptable hills for mountain settlements.' },
  { id: 'savanna', name: 'Golden savanna', preset: 'grassland', lat: -15, lon: 26, color: '#b4b875', description: 'An open region for wildlife habitats and wide landscapes.' },
  { id: 'islands', name: 'Island sea', preset: 'ocean', lat: -9, lon: 148, color: '#70b8b0', description: 'A second ocean region for a connected chain of handmade islands.' },
  { id: 'dunes', name: 'Sunlit sands', preset: 'sand', lat: -27, lon: 129, color: '#e2cf9b', description: 'Pale sand for beaches, dune gardens, and relaxed towns.' }
].map(region => Object.freeze({ ...region, defaultSize: DEFAULT_REGION_SIZE })));
const PRESET_IDS = new Set(WORLD_PRESETS.map(preset => preset.id));
const BIOME_MATERIAL = Object.freeze({ grassland: 0, desert: 2, sand: 2, ocean: 2, snow: 4, jungle: 5 });
const LIMIT = 1024;
// Packed terrain is about 7 MB at 1024 m; large basin cell lists need room too.
const MAX_WORLD_BYTES = 24 * 1024 * 1024;
const MAX_HISTORY_BYTES = 64 * 1024 * 1024;
const MIN_HEIGHT = -12;
const MAX_HEIGHT = 40;
const MAX_OBJECTS = 3000;
const MAX_WATERS = 64;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const finite = n => typeof n === 'number' && Number.isFinite(n);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(message); };
const waterCellSets = new WeakMap();
let nextId = 1;
const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${(nextId++).toString(36)}`;

export class WorldState {
  constructor(size = 128, { empty = false } = {}) {
    if (!WORLD_SIZES.includes(size)) fail(`World size must be one of: ${WORLD_SIZES.join(', ')}.`);
    this.size = size;
    this.resolution = size + 1;
    this.heights = new Float32Array(this.resolution * this.resolution);
    this.paint = new Uint8Array(this.heights.length);
    this.objects = [];
    this.waters = [];
    this.settings = { quality: 'high', sun: 0.75, preset: 'grassland', biome: 'grassland', paused: false, grid: false, seaLevel: null };
    this.name = 'My Morrowfield';
    this._undo = [];
    this._redo = [];
    if (!empty) this._seedTerrain();
  }

  static createPreset(id = 'grassland', size = DEFAULT_REGION_SIZE) {
    const preset = WORLD_PRESETS.find(item => item.id === id);
    if (!preset) fail('Choose a supported world preset.');
    const world = new WorldState(size, { empty: true });
    world.settings.preset = preset.id;
    world.settings.biome = preset.biome;
    world.settings.seaLevel = id === 'ocean' ? 0 : null;
    world.name = preset.name;
    world._seedPresetTerrain();
    if (id === 'pond') {
      const result = world.stampPond(16, 0, { radius: 10, depth: 4, level: -0.3 });
      if (!result.ok) fail('The pond preset could not form a contained basin.');
      // Stable IDs make a preset a reproducible starting world, including exports.
      world.waters[0].id = 'preset-pond';
    }
    return world;
  }

  _seedHeight(x, z, includePond = true) {
    const hills = 13.5 * Math.exp(-((x + 42) ** 2 / 190 + (z + 40) ** 2 / 145))
      + 8.8 * Math.exp(-((x - 37) ** 2 / 210 + (z + 43) ** 2 / 140))
      + 4.3 * Math.exp(-((x + 20) ** 2 / 175 + (z + 48) ** 2 / 90));
    const meadow = 0.7 + 0.13 * Math.sin(x * 0.12) * Math.cos(z * 0.15);
    const pond = 4 * Math.exp(-((x - 16) ** 2 / 55 + z ** 2 / 35));
    return meadow + hills - (includePond ? pond : 0);
  }

  _seedTerrain() {
    const half = this.size / 2;
    for (let iz = 0; iz < this.resolution; iz++) {
      for (let ix = 0; ix < this.resolution; ix++) {
        const index = iz * this.resolution + ix;
        this.heights[index] = this._seedHeight(ix - half, iz - half);
      }
    }
  }

  _seedPresetTerrain() {
    this.heights.fill(this.settings.preset === 'ocean' ? -4 : 0.7);
    this.paint.fill(BIOME_MATERIAL[this.settings.biome] ?? 0);
    if (this.settings.preset !== 'highlands') return;
    const half = this.size / 2;
    for (let iz = 0; iz < this.resolution; iz++) {
      for (let ix = 0; ix < this.resolution; ix++) {
        this.heights[iz * this.resolution + ix] = this._seedHeight(ix - half, iz - half, false);
      }
    }
  }

  contains(x, z, margin = 0) {
    const edge = this.size / 2 - margin;
    return finite(x) && finite(z) && Math.abs(x) <= edge && Math.abs(z) <= edge;
  }

  heightAt(x, z) {
    if (!finite(x) || !finite(z)) return 0;
    const u = clamp(x + this.size / 2, 0, this.size);
    const v = clamp(z + this.size / 2, 0, this.size);
    const ix = Math.min(this.size - 1, Math.floor(u));
    const iz = Math.min(this.size - 1, Math.floor(v));
    const tx = u - ix;
    const tz = v - iz;
    const i = iz * this.resolution + ix;
    const a = this.heights[i] * (1 - tx) + this.heights[i + 1] * tx;
    const b = this.heights[i + this.resolution] * (1 - tx) + this.heights[i + this.resolution + 1] * tx;
    return a * (1 - tz) + b * tz;
  }

  slopeAt(x, z, distance = 1) {
    const dx = (this.heightAt(x + distance, z) - this.heightAt(x - distance, z)) / (distance * 2);
    const dz = (this.heightAt(x, z + distance) - this.heightAt(x, z - distance)) / (distance * 2);
    return Math.hypot(dx, dz);
  }

  sculpt(x, z, { mode = 'raise', radius = 5, strength = 0.6, material = 0, targetHeight } = {}, dt = 1 / 30) {
    if (!this.contains(x, z) || !['raise', 'lower', 'smooth', 'flatten', 'paint'].includes(mode)) return false;
    radius = clamp(Number(radius) || 5, 0.5, 32);
    strength = clamp(Number(strength) || 0, 0, 2);
    dt = clamp(Number(dt) || 0, 0, 0.15);
    if (strength === 0 || dt === 0) return false;
    if (typeof material === 'string') material = MATERIALS.indexOf(material);
    material = clamp(Math.round(Number(material) || 0), 0, MATERIALS.length - 1);
    const u = x + this.size / 2;
    const v = z + this.size / 2;
    const minX = Math.max(0, Math.floor(u - radius));
    const maxX = Math.min(this.size, Math.ceil(u + radius));
    const minZ = Math.max(0, Math.floor(v - radius));
    const maxZ = Math.min(this.size, Math.ceil(v + radius));
    const referenceMinX = Math.max(0, minX - 1), referenceMinZ = Math.max(0, minZ - 1);
    const referenceWidth = Math.min(this.size, maxX + 1) - referenceMinX + 1;
    const referenceHeight = Math.min(this.size, maxZ + 1) - referenceMinZ + 1;
    let reference;
    if (mode === 'smooth') {
      // Smoothing needs an immutable one-vertex border, not a full-world copy.
      reference = new Float32Array(referenceWidth * referenceHeight);
      for (let row = 0; row < referenceHeight; row++) {
        const start = (referenceMinZ + row) * this.resolution + referenceMinX;
        reference.set(this.heights.subarray(start, start + referenceWidth), row * referenceWidth);
      }
    }
    const flattenHeight = finite(targetHeight) ? clamp(targetHeight, MIN_HEIGHT, MAX_HEIGHT) : this.heightAt(x, z);
    let changed = false;
    for (let iz = minZ; iz <= maxZ; iz++) {
      for (let ix = minX; ix <= maxX; ix++) {
        const distance = Math.hypot(ix - u, iz - v);
        if (distance >= radius) continue;
        const index = iz * this.resolution + ix;
        const t = 1 - distance / radius;
        const falloff = t * t * (3 - 2 * t);
        if (mode === 'paint') {
          if (falloff > 0.08 && this.paint[index] !== material) {
            this.paint[index] = material;
            changed = true;
          }
          continue;
        }
        const old = this.heights[index];
        let value = old;
        if (mode === 'raise' || mode === 'lower') value += (mode === 'raise' ? 1 : -1) * strength * dt * 8 * falloff;
        else if (mode === 'flatten') value += (flattenHeight - old) * Math.min(1, strength * dt * 12 * falloff);
        else {
          let sum = 0, count = 0;
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = ix + dx, nz = iz + dz;
              if (nx >= 0 && nz >= 0 && nx <= this.size && nz <= this.size) {
                sum += reference[(nz - referenceMinZ) * referenceWidth + nx - referenceMinX];
                count++;
              }
            }
          }
          value += (sum / count - old) * Math.min(1, strength * dt * 16 * falloff);
        }
        value = clamp(value, MIN_HEIGHT, MAX_HEIGHT);
        if (Math.abs(value - old) > 1e-7) {
          this.heights[index] = value;
          changed = true;
        }
      }
    }
    return changed;
  }

  /** Paint a local biome without changing the world's expansion theme or heights. */
  biomeBrush(x, z, { biome = 'grassland', radius = 8 } = {}) {
    if (!Object.hasOwn(BIOME_MATERIAL, biome) || !finite(radius) || radius <= 0) return false;
    return this.sculpt(x, z, { mode: 'paint', radius, material: BIOME_MATERIAL[biome], strength: 1 });
  }

  /** Carve and fill one bowl. Failure is atomic; the caller owns the undo checkpoint. */
  stampPond(x, z, { radius = 8, depth = 3, level } = {}) {
    if (!finite(radius) || radius < 2 || radius > 32 || !finite(depth) || depth < 0.5 || depth > 12) {
      return { ok: false, message: 'Choose a pond radius from 2–32 m and depth from 0.5–12 m.' };
    }
    if (!this.contains(x, z, radius + 1)) return { ok: false, message: 'Leave a little land around the pond, inside the world boundary.' };
    const rim = this.heightAt(x, z);
    const waterLevel = level === undefined ? rim - Math.min(0.5, depth * 0.25) : level;
    if (!finite(waterLevel) || waterLevel <= MIN_HEIGHT || waterLevel > MAX_HEIGHT) {
      return { ok: false, message: 'Choose a water level above −12 m and no higher than 40 m.' };
    }
    if (this.waters.length >= MAX_WATERS) return { ok: false, message: 'This world already has 64 water bodies. Remove one before adding another.' };
    const before = this.heights.slice();
    const half = this.size / 2;
    for (let iz = Math.floor(z + half - radius); iz <= Math.ceil(z + half + radius); iz++) {
      for (let ix = Math.floor(x + half - radius); ix <= Math.ceil(x + half + radius); ix++) {
        const distance = Math.hypot(ix - half - x, iz - half - z);
        if (distance >= radius) continue;
        const shape = (1 - (distance / radius) ** 2) ** 2;
        const i = iz * this.resolution + ix;
        this.heights[i] = Math.max(MIN_HEIGHT, Math.min(this.heights[i], rim - depth * shape));
      }
    }
    const result = this.floodWater(x, z, waterLevel);
    if (!result.ok) {
      this.heights.set(before);
      return result;
    }
    this.rebuildWater();
    return { ok: true, message: 'A new pond is ready for life.', water: this.waters.find(water => water.id === result.water.id) };
  }

  /** Flatten a circular building pad exactly; caller owns the undo checkpoint. */
  flattenPad(x, z, radius, targetHeight = this.heightAt(x, z)) {
    if (!this.contains(x, z, radius) || !finite(targetHeight)) return false;
    const half = this.size / 2;
    for (let iz = Math.max(0, Math.floor(z + half - radius - 2)); iz <= Math.min(this.size, Math.ceil(z + half + radius + 2)); iz++) {
      for (let ix = Math.max(0, Math.floor(x + half - radius - 2)); ix <= Math.min(this.size, Math.ceil(x + half + radius + 2)); ix++) {
        const d = Math.hypot(ix - half - x, iz - half - z);
        if (d > radius + 2) continue;
        const mix = d <= radius ? 1 : (radius + 2 - d) / 2;
        const i = iz * this.resolution + ix;
        this.heights[i] += (clamp(targetHeight, MIN_HEIGHT, MAX_HEIGHT) - this.heights[i]) * mix;
      }
    }
    return true;
  }

  cellHeights(index) {
    const ix = index % this.size;
    const iz = Math.floor(index / this.size);
    const i = iz * this.resolution + ix;
    return [this.heights[i], this.heights[i + 1], this.heights[i + this.resolution + 1], this.heights[i + this.resolution]];
  }

  _basinAt(x, z, level) {
    if (!this.contains(x, z, 0.001) || !finite(level) || level < MIN_HEIGHT || level > MAX_HEIGHT) {
      return { ok: false, message: 'Choose a point inside the world and a water level between −12 and 40.' };
    }
    if (this.heightAt(x, z) >= level - 0.01) return { ok: false, message: 'Choose a carved basin below this water level.' };
    const startX = Math.floor(x + this.size / 2);
    const startZ = Math.floor(z + this.size / 2);
    const seen = new Uint8Array(this.size * this.size);
    const queue = new Int32Array(seen.length);
    let head = 0, tail = 0;
    queue[tail++] = startZ * this.size + startX;
    seen[queue[0]] = 1;
    const cells = [];
    while (head < tail) {
      const index = queue[head++];
      const ix = index % this.size;
      const iz = Math.floor(index / this.size);
      const heights = this.cellHeights(index);
      if (Math.min(...heights) >= level - 0.001) continue;
      cells.push(index);
      // Water may cross a shared edge only where that edge is below its surface.
      const edges = [
        [ix - 1, iz, Math.min(heights[0], heights[3])],
        [ix + 1, iz, Math.min(heights[1], heights[2])],
        [ix, iz - 1, Math.min(heights[0], heights[1])],
        [ix, iz + 1, Math.min(heights[3], heights[2])]
      ];
      for (const [nx, nz, edgeHeight] of edges) {
        if (edgeHeight >= level - 0.001) continue;
        if (nx < 0 || nz < 0 || nx >= this.size || nz >= this.size) {
          return { ok: false, message: 'That water level spills beyond the world. Lower it or raise the basin walls.' };
        }
        const neighbor = nz * this.size + nx;
        if (!seen[neighbor]) { seen[neighbor] = 1; queue[tail++] = neighbor; }
      }
    }
    return cells.length ? { ok: true, cells } : { ok: false, message: 'Carve a deeper basin before adding water.' };
  }

  floodWater(x, z, level) {
    if (this.waters.length >= MAX_WATERS) return { ok: false, message: 'This world already has 64 water bodies. Remove one before adding another.' };
    const result = this._basinAt(x, z, level);
    if (!result.ok) return result;
    const cells = new Set(result.cells);
    // Replacing intersecting bodies prevents overlapping surfaces at different heights.
    this.waters = this.waters.filter(water => !water.cells.some(cell => cells.has(cell)));
    const water = { id: makeId('water'), x, z, level, cells: result.cells };
    this.waters.push(water);
    return { ok: true, message: 'Basin filled.', water };
  }

  rebuildWater() {
    const retained = [];
    let drained = 0;
    for (const water of this.waters) {
      // Find a submerged seed in the original footprint if its original seed was raised.
      let x = water.x, z = water.z;
      if (this.heightAt(x, z) >= water.level - 0.01) {
        const seed = water.cells.find(cell => {
          const cx = cell % this.size - this.size / 2 + 0.5;
          const cz = Math.floor(cell / this.size) - this.size / 2 + 0.5;
          return this.heightAt(cx, cz) < water.level - 0.01;
        });
        if (seed === undefined) { drained++; continue; }
        x = seed % this.size - this.size / 2 + 0.5;
        z = Math.floor(seed / this.size) - this.size / 2 + 0.5;
      }
      const result = this._basinAt(x, z, water.level);
      if (!result.ok) { drained++; continue; }
      retained.push({ ...water, x, z, cells: result.cells });
    }
    this.waters = retained;
    return { drained, count: retained.length };
  }

  waterAt(x, z) {
    if (!this.contains(x, z, 0.001)) return null;
    const cell = Math.floor(z + this.size / 2) * this.size + Math.floor(x + this.size / 2);
    const ground = this.heightAt(x, z);
    const basin = this.waters.find(water => {
      if (ground >= water.level) return false;
      let footprint = waterCellSets.get(water);
      if (!footprint || footprint.cells !== water.cells) {
        footprint = { cells: water.cells, set: new Set(water.cells) };
        waterCellSets.set(water, footprint);
      }
      return footprint.set.has(cell);
    });
    const seaLevel = this.settings.seaLevel;
    if (finite(seaLevel) && ground < seaLevel && (!basin || seaLevel >= basin.level)) {
      if (!this._seaWater || this._seaWater.level !== seaLevel) this._seaWater = { id: 'sea', level: seaLevel, sea: true };
      return this._seaWater;
    }
    return basin || null;
  }

  addObject(record) {
    if (this.objects.length >= MAX_OBJECTS) fail('This world has reached its 3,000-object limit.');
    const object = validateObject({ ...record, id: record.id || makeId('object') }, this.size);
    if (this.objects.some(item => item.id === object.id)) fail('An object with that ID already exists.');
    this.objects.push(object);
    return object;
  }

  removeObject(id) {
    const index = this.objects.findIndex(object => object.id === id);
    if (index < 0) return false;
    this.objects.splice(index, 1);
    return true;
  }

  isPositionSafe(x, z, { radius = 0.6, maxSlope = 0.85, aquatic = false, ignoreId, obstacleRadius = object => object.radius || 1.5 } = {}) {
    if (!this.contains(x, z, radius) || this.slopeAt(x, z) > maxSlope) return false;
    if (Boolean(this.waterAt(x, z)) !== aquatic) return false;
    for (const object of this.objects) {
      if (object.id === ignoreId) continue;
      const obstacle = obstacleRadius(object);
      if (obstacle > 0 && Math.hypot(object.x - x, object.z - z) < obstacle + radius) return false;
    }
    return true;
  }

  _snapshot() {
    return { size: this.size, heights: this.heights.slice(), paint: this.paint.slice(),
      objects: this.objects.map(item => ({ ...item })),
      waters: this.waters.map(item => ({ ...item, cells: item.cells.slice() })),
      settings: { ...this.settings }, name: this.name };
  }

  _restore(snapshot) {
    this.size = snapshot.size;
    this.resolution = this.size + 1;
    this.heights = snapshot.heights.slice();
    this.paint = snapshot.paint.slice();
    this.objects = snapshot.objects.map(item => ({ ...item }));
    this.waters = snapshot.waters.map(item => ({ ...item, cells: item.cells.slice() }));
    this.settings = { ...snapshot.settings };
    this.name = snapshot.name;
  }

  checkpoint() {
    this._undo.push(this._snapshot());
    this._redo.length = 0;
    this._trimHistory('undo');
  }

  _trimHistory(preferred) {
    const bytes = snapshot => snapshot.heights.byteLength + snapshot.paint.byteLength;
    let total = [...this._undo, ...this._redo].reduce((sum, snapshot) => sum + bytes(snapshot), 0);
    // Keep the nearest steps in the active direction; discard farthest history
    // first. Small worlds retain 32 steps, while 1024 m worlds retain 12.
    const order = preferred === 'redo' ? [this._undo, this._redo] : [this._redo, this._undo];
    while (this._undo.length + this._redo.length > 1 &&
      (this._undo.length + this._redo.length > 32 || total > MAX_HISTORY_BYTES)) {
      const stack = order.find(items => items.length);
      total -= bytes(stack.shift());
    }
  }

  get canUndo() { return this._undo.length > 0; }
  get canRedo() { return this._redo.length > 0; }
  undo() {
    if (!this.canUndo) return false;
    this._redo.push(this._snapshot());
    this._restore(this._undo.pop());
    this._trimHistory('redo');
    return true;
  }
  redo() {
    if (!this.canRedo) return false;
    this._undo.push(this._snapshot());
    this._restore(this._redo.pop());
    this._trimHistory('undo');
    return true;
  }

  expand() {
    if (this.size >= LIMIT) return false;
    const previousSize = this.size;
    const previousRes = this.resolution;
    const heights = this.heights;
    const paint = this.paint;
    this.size = WORLD_SIZES[WORLD_SIZES.indexOf(previousSize) + 1];
    this.resolution = this.size + 1;
    this.heights = new Float32Array(this.resolution * this.resolution);
    this.paint = new Uint8Array(this.heights.length);
    this._seedPresetTerrain();
    const offset = (this.size - previousSize) / 2;
    for (let iz = 0; iz <= previousSize; iz++) {
      const oldStart = iz * previousRes;
      const newStart = (iz + offset) * this.resolution + offset;
      this.heights.set(heights.subarray(oldStart, oldStart + previousRes), newStart);
      this.paint.set(paint.subarray(oldStart, oldStart + previousRes), newStart);
    }
    this.waters = this.waters.map(water => ({ ...water, cells: water.cells.map(cell =>
      (Math.floor(cell / previousSize) + offset) * this.size + cell % previousSize + offset) }));
    return true;
  }

  serialize() {
    return JSON.stringify({ format: WORLD_FORMAT, version: WORLD_VERSION, name: this.name,
      size: this.size, heights: Array.from(this.heights), paint: Array.from(this.paint),
      objects: this.objects, waters: this.waters, settings: this.settings });
  }

  /** Lossless compact JSON for project storage; legacy array exports stay supported. */
  serializePacked() {
    const bytes = new Uint8Array(this.heights.length * 4);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < this.heights.length; i++) view.setFloat32(i * 4, this.heights[i], true);
    return JSON.stringify({ format: WORLD_FORMAT, version: WORLD_VERSION, encoding: 'f32-u8-base64', name: this.name,
      size: this.size, heights: encodeBase64(bytes), paint: encodeBase64(this.paint),
      objects: this.objects, waters: this.waters, settings: this.settings });
  }

  static deserialize(text, validCatalogIds) {
    if (typeof text !== 'string' || text.length > MAX_WORLD_BYTES) fail('The world file is missing or too large (24 MB maximum).');
    let data;
    try { data = JSON.parse(text); } catch { fail('That file is not valid JSON. Your current world has not changed.'); }
    if (!plain(data) || data.format !== WORLD_FORMAT || data.version !== WORLD_VERSION) fail('This is not a supported Morrowfield world file.');
    if (!WORLD_SIZES.includes(data.size)) fail('The saved world has an invalid size.');
    const count = (data.size + 1) ** 2;
    const world = new WorldState(data.size, { empty: true });
    if (data.encoding !== undefined) {
      if (data.encoding !== 'f32-u8-base64') fail('The saved world uses an unsupported terrain encoding.');
      const heightBytes = decodeBase64(data.heights, count * 4, 'terrain');
      const view = new DataView(heightBytes.buffer, heightBytes.byteOffset, heightBytes.byteLength);
      for (let i = 0; i < count; i++) {
        const height = view.getFloat32(i * 4, true);
        if (!finite(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) fail('The saved terrain is invalid.');
        world.heights[i] = height;
      }
      decodeBase64(data.paint, count, 'terrain materials', world.paint);
      if (world.paint.some(n => n >= MATERIALS.length)) fail('The saved terrain materials are invalid.');
    } else {
      if (!Array.isArray(data.heights) || data.heights.length !== count || data.heights.some(n => !finite(n) || n < MIN_HEIGHT || n > MAX_HEIGHT)) fail('The saved terrain is invalid.');
      if (!Array.isArray(data.paint) || data.paint.length !== count || data.paint.some(n => !Number.isInteger(n) || n < 0 || n >= MATERIALS.length)) fail('The saved terrain materials are invalid.');
      world.heights.set(data.heights);
      world.paint.set(data.paint);
    }
    if (!Array.isArray(data.objects) || data.objects.length > MAX_OBJECTS) fail('The saved object collection is invalid.');
    const valid = validCatalogIds ? new Set(validCatalogIds) : null;
    const objects = data.objects.map(object => validateObject(object, data.size, valid));
    if (new Set(objects.map(object => object.id)).size !== objects.length) fail('The saved world contains duplicate object IDs.');
    if (!Array.isArray(data.waters) || data.waters.length > MAX_WATERS) fail('The saved water collection is invalid.');
    const waters = data.waters.map(water => {
      if (!plain(water) || typeof water.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(water.id) || !finite(water.level) || water.level < MIN_HEIGHT || water.level > MAX_HEIGHT || !finite(water.x) || !finite(water.z) || Math.abs(water.x) >= data.size / 2 || Math.abs(water.z) >= data.size / 2) fail('A saved water body is invalid.');
      if (!Array.isArray(water.cells) || water.cells.length > data.size ** 2 || water.cells.some(cell => !Number.isInteger(cell) || cell < 0 || cell >= data.size ** 2) || new Set(water.cells).size !== water.cells.length) fail('A saved water footprint is invalid.');
      return { id: water.id, x: water.x, z: water.z, level: water.level, cells: [...water.cells] };
    });
    if (new Set(waters.map(water => water.id)).size !== waters.length) fail('The saved world contains duplicate water IDs.');
    const quality = data.settings?.quality;
    const sun = data.settings?.sun;
    if (!plain(data.settings) || !['low', 'medium', 'high'].includes(quality) || !finite(sun) || sun < 0 || sun > 1) fail('The saved world settings are invalid.');
    const preset = data.settings.preset === undefined ? 'grassland' : data.settings.preset;
    const biome = data.settings.biome === undefined ? 'grassland' : data.settings.biome;
    const paused = data.settings.paused === undefined ? false : data.settings.paused;
    const grid = data.settings.grid === undefined ? false : data.settings.grid;
    const seaLevel = data.settings.seaLevel === undefined ? null : data.settings.seaLevel;
    if (!PRESET_IDS.has(preset) || !Object.hasOwn(BIOME_MATERIAL, biome) || typeof paused !== 'boolean' || typeof grid !== 'boolean' || (seaLevel !== null && (!finite(seaLevel) || seaLevel < MIN_HEIGHT || seaLevel > MAX_HEIGHT))) fail('The saved biome or view settings are invalid.');
    if (data.name !== undefined && (typeof data.name !== 'string' || data.name.length > 80)) fail('The saved world name is invalid.');
    world.name = data.name || 'My Morrowfield';
    world.objects = objects;
    world.waters = waters;
    world.settings = { quality, sun, preset, biome, paused, grid, seaLevel };
    // Recompute footprints rather than trusting arbitrary file-supplied water cells.
    for (const water of world.waters) {
      const basin = world._basinAt(water.x, water.z, water.level);
      if (!basin.ok) fail('A saved water body is not contained by its terrain.');
      const supplied = new Set(water.cells);
      if (basin.cells.length !== supplied.size || basin.cells.some(cell => !supplied.has(cell))) fail('A saved water footprint does not match its basin.');
    }
    return world;
  }
}

function encodeBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return btoa(binary);
}

function decodeBase64(text, expectedBytes, label, bytes = new Uint8Array(expectedBytes)) {
  if (typeof text !== 'string' || text.length !== Math.ceil(expectedBytes / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) fail(`The packed ${label} byte length or encoding is invalid.`);
  let binary;
  try { binary = atob(text); } catch { fail(`The packed ${label} encoding is invalid.`); }
  if (binary.length !== expectedBytes) fail(`The packed ${label} byte length is invalid.`);
  for (let i = 0; i < expectedBytes; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Deterministic disk sampling for scatter brushes; may return fewer crowded points. */
export function scatterPositions(seed, x, z, radius, count, minDistance = 2) {
  if (![x, z, radius, count, minDistance].every(finite) || radius <= 0 || count <= 0 || minDistance < 0) return [];
  count = Math.min(500, Math.floor(count));
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const points = [];
  for (let attempt = 0; attempt < count * 60 && points.length < count; attempt++) {
    const angle = random() * Math.PI * 2, distance = Math.sqrt(random()) * radius;
    const point = { x: x + Math.cos(angle) * distance, z: z + Math.sin(angle) * distance };
    if (points.every(existing => Math.hypot(existing.x - point.x, existing.z - point.z) >= minDistance)) points.push(point);
  }
  return points;
}

function validateObject(object, size, valid) {
  if (!plain(object)) fail('A saved object is invalid.');
  if (typeof object.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(object.id)) fail('A saved object ID is invalid.');
  if (typeof object.type !== 'string' || !/^[a-z0-9-]{1,60}$/.test(object.type) || (valid && !valid.has(object.type))) fail(`Unknown object type: ${String(object.type).slice(0,60)}.`);
  if (!finite(object.x) || !finite(object.z) || Math.abs(object.x) > size / 2 || Math.abs(object.z) > size / 2) fail('An object is outside the saved world.');
  const rotation = object.rotation ?? 0;
  const scale = object.scale ?? 1;
  if (!finite(rotation) || Math.abs(rotation) > Math.PI * 200 || !finite(scale) || scale < 0.2 || scale > 5) fail('An object has an invalid transform.');
  const result = { id: object.id, type: object.type, x: object.x, z: object.z, rotation, scale };
  if (object.length !== undefined) {
    // Length is local-space meters before the object's uniform scale is applied.
    if (!isFenceType(object.type) || !finite(object.length) || object.length < 0.25 || object.length > 8) fail('A fence or gate has an invalid length.');
    result.length = object.length;
  }
  if (object.y !== undefined) {
    if (!finite(object.y) || object.y < MIN_HEIGHT || object.y > MAX_HEIGHT + 20) fail('An object has an invalid elevation.');
    result.y = object.y;
  }
  if (object.radius !== undefined) {
    if (!finite(object.radius) || object.radius < 0 || object.radius > 32) fail('An object has an invalid footprint.');
    result.radius = object.radius;
  }
  if (object.enclosureId !== undefined && object.enclosureId !== null) {
    if (typeof object.enclosureId !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(object.enclosureId)) fail('An animal has an invalid enclosure.');
    result.enclosureId = object.enclosureId;
  }
  return result;
}
