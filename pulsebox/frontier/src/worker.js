// The generation worker: terrain chunks, plant placement, grass fields and map tiles, built off the main thread.
// (The game bundles this file into the page as a string and starts it from a blob: see jobs.js.)
import { World } from './world.js';
import { terrainChunk, flora, mapTile, grassField } from './gen.js';

let world = null;
self.onmessage = e => {
  const m = e.data;
  if (m.t === 'init') { world = new World(m.seed); if (m.camp) world.setCamp(m.camp.x, m.camp.z, m.camp.region); return; }
  if (!world) return;
  if (m.t === 'terrain') { const r = terrainChunk(world, m.x0, m.z0, m.size, m.res, m.skirt); self.postMessage({ id: m.id, r }, [r.pos.buffer, r.nrm.buffer, r.sp.buffer, r.sp2.buffer]); }
  else if (m.t === 'flora') { const r = flora(world, m.cx, m.cz, m.C); self.postMessage({ id: m.id, r }, [r.trees.buffer, r.props.buffer]); }
  else if (m.t === 'map') { const r = mapTile(world, m.x0, m.z0, m.size, m.n); self.postMessage({ id: m.id, r }, [r.buffer]); }
  else if (m.t === 'grass') { const r = grassField(world, m.x0, m.z0, m.n, m.step, m.h0); self.postMessage({ id: m.id, r }, [r.buffer]); }
};
