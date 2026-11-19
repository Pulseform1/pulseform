// Endless terrain: 64 m chunks around the player at four levels of detail, and 512 m low-detail tiles out to the
// horizon. The ground shader blends six painted layers (grass, needle litter, dirt, rock, sand/mud, snow) by height so
// rocks poke through grass and litter gathers between, with large-scale colour variation and wet, dark shorelines.
import * as THREE from 'three';
import { patch } from './fx.js';

export const CHUNK = 64;
const FAR = 512, COVER_N = 40;

const indexCache = new Map();
function gridIndex(res) {
  if (indexCache.has(res)) return indexCache.get(res);
  const n = res + 1, idx = [];
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
  const base = n * n, quad = (g0, g1, s0, s1) => idx.push(g0, s0, g1, g1, s0, s1, g0, g1, s0, g1, s1, s0);
  for (let i = 0; i < res; i++) { quad(i, i + 1, base + i, base + i + 1); quad((n - 1) * n + i, (n - 1) * n + i + 1, base + n + i, base + n + i + 1); quad(i * n, (i + 1) * n, base + 2 * n + i, base + 2 * n + i + 1); quad(i * n + n - 1, (i + 1) * n + n - 1, base + 3 * n + i, base + 3 * n + i + 1); }
  const a = new THREE.BufferAttribute(n * n + 4 * n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1);
  indexCache.set(res, a); return a;
}

const COMMON_VS = `#include <common>
attribute vec4 splat; attribute vec4 splat2;
varying vec4 vSplat; varying vec4 vSplat2; varying vec3 vWP; varying vec3 vWN;`;
const COMMON_FS = `#include <common>
uniform sampler2DArray uAlb; uniform sampler2DArray uNrm; uniform sampler2D uMacro; uniform sampler2D uCover; uniform vec3 uCoverO;
varying vec4 vSplat; varying vec4 vSplat2; varying vec3 vWP; varying vec3 vWN;
const float TSC[6] = float[6]( 0.29, 0.33, 0.3, 0.12, 0.23, 0.15 );`;
const SAMPLE_FS = `
vec4 mac = texture2D( uMacro, vWP.xz / 640.0 ), mac2 = texture2D( uMacro, vWP.xz / 71.0 + 0.37 );
float W[6];
W[1] = vSplat.x; W[3] = vSplat.y; W[4] = vSplat.z; W[5] = vSplat.w; W[2] = vSplat2.x;
W[0] = max( 0.0, 1.0 - W[1] - W[2] - W[3] - W[4] - W[5] );
float bare = W[0] * smoothstep( 0.66, 0.82, mac2.b ) * 0.6; W[2] += bare; W[0] -= bare;
vec3 tA = vec3( 0.0 ); vec2 tN = vec2( 0.0 ); float tot = 0.0, ma = 0.0;
float B[6]; vec4 A6[6]; vec4 N6[6];
vec3 tw = normalize( vWN );
for ( int i = 0; i < 6; i++ ) {
  A6[i] = vec4( 0.0 ); N6[i] = vec4( 0.5, 0.5, 1.0, 0.0 ); B[i] = -1.0;
  if ( W[i] > 0.004 ) {
    vec2 uv = vWP.xz * TSC[i];
    A6[i] = texture( uAlb, vec3( uv, float( i ) ) );
    N6[i] = texture( uNrm, vec3( uv, float( i ) ) );
    if ( i < 2 ) {
      vec2 uv2 = mat2( 0.8, -0.6, 0.6, 0.8 ) * vWP.xz * TSC[i] * 0.31 + 0.5;
      A6[i] = mix( A6[i], texture( uAlb, vec3( uv2, float( i ) ) ), 0.25 + 0.45 * mac2.r );
    }
    if ( i == 3 && tw.y < 0.9 ) {
      vec3 bw = pow( abs( tw ), vec3( 4.0 ) ); bw /= ( bw.x + bw.y + bw.z );
      vec4 ax = texture( uAlb, vec3( vWP.zy * TSC[3], 3.0 ) ), az = texture( uAlb, vec3( vWP.xy * TSC[3], 3.0 ) );
      A6[3] = A6[3] * bw.y + ax * bw.x + az * bw.z;
    }
    B[i] = W[i] + N6[i].a * 0.55 * min( 1.0, W[i] * 3.0 );
    ma = max( ma, B[i] );
  }
}
ma -= 0.2;
for ( int i = 0; i < 6; i++ ) { float b = max( B[i] - ma, 0.0 ); tA += A6[i].rgb * b; tN += ( N6[i].xy * 2.0 - 1.0 ) * b; tot += b; }
tA /= max( tot, 1e-4 ); tN /= max( tot, 1e-4 );
float camD = distance( vWP, cameraPosition );
tN *= 1.0 - 0.65 * smoothstep( 50.0, 260.0, camD );
tA *= 0.8 + 0.4 * mac.r;
tA = mix( tA, tA * vec3( 1.14, 1.03, 0.74 ), W[0] * smoothstep( 0.42, 0.78, mac.g ) * 0.85 );
tA = mix( tA, tA * vec3( 0.86, 1.0, 0.86 ), W[0] * smoothstep( 0.55, 0.3, mac.g ) * 0.5 );
float wet = vSplat2.z;
tA *= 1.0 - 0.4 * wet;
tA = mix( tA, tA * vec3( 0.42, 0.55, 0.52 ), smoothstep( 0.0, -2.6, vWP.y ) );
diffuseColor.rgb = tA;
float tRough = clamp( mix( 0.97, 0.45, wet ) - 0.32 * W[5] - 0.08 * W[3], 0.3, 1.0 );`;

function terrainMaterial(tex, far, cover) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
  const uni = { uAlb: { value: tex.albedo }, uNrm: { value: tex.normal }, uMacro: { value: tex.macro }, uCover: { value: cover.tex }, uCoverO: cover.o };
  patch(m, far ? 'terrain-far' : 'terrain', sh => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', COMMON_VS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vSplat2 = splat2; vWP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz; vWN = normalize( mat3( modelMatrix ) * objectNormal );');
    sh.fragmentShader = (far ? '#define FAR_TERRAIN\n' : '') + sh.fragmentShader.replace('#include <common>', COMMON_FS)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
#ifdef FAR_TERRAIN
{ vec2 cu = ( vWP.xz - uCoverO.xy ) / uCoverO.z; if ( cu.x > 0.0 && cu.y > 0.0 && cu.x < 1.0 && cu.y < 1.0 && texture2D( uCover, cu ).r > 0.5 ) discard; }
#endif`)
      .replace('#include <map_fragment>', SAMPLE_FS)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', `{ vec3 pn = normalize( vec3( tw.x + tN.x, tw.y, tw.z + tN.y ) ); normal = normalize( ( viewMatrix * vec4( pn, 0.0 ) ).xyz ); }`)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= vSplat2.y; reflectedLight.indirectSpecular *= vSplat2.y;');
  });
  return m;
}

export class Terrain {
  constructor(scene, jobs, tex, opts = {}) {
    this.scene = scene; this.jobs = jobs; this.near = new Map(); this.far = new Map();
    this.nearR = opts.nearR || 420; this.farR = opts.farR || 3600;
    const data = new Uint8Array(COVER_N * COVER_N), ctex = new THREE.DataTexture(data, COVER_N, COVER_N, THREE.RedFormat);
    ctex.magFilter = ctex.minFilter = THREE.NearestFilter; ctex.needsUpdate = true;
    this.cover = { tex: ctex, data, o: { value: new THREE.Vector3(0, 0, COVER_N * CHUNK) }, ox: 1e9, oz: 1e9, dirty: true };
    this.mat = terrainMaterial(tex, false, this.cover); this.farMat = terrainMaterial(tex, true, this.cover);
    this.last = new THREE.Vector2(1e9, 1e9); this.timer = 0; this.ready = false;
  }
  setRadius(nearR, farR) { this.nearR = nearR; this.farR = farR; this.last.set(1e9, 1e9); }
  lodFor(d) { return d < 120 ? 64 : d < 230 ? 32 : d < 360 ? 16 : 8; }
  update(cam, dt) {
    this.timer -= dt;
    if (this.timer > 0 && this.last.distanceToSquared(new THREE.Vector2(cam.x, cam.z)) < 36) return;
    this.timer = 0.3; this.last.set(cam.x, cam.z);
    const pcx = Math.floor(cam.x / CHUNK), pcz = Math.floor(cam.z / CHUNK), R = this.nearR, rc = Math.ceil(R / CHUNK) + 1, seen = new Set();
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const cx = pcx + dx, cz = pcz + dz, mx = (cx + .5) * CHUNK, mz = (cz + .5) * CHUNK, d = Math.hypot(mx - cam.x, mz - cam.z);
      if (d > R) continue;
      const key = cx + ',' + cz, res = this.lodFor(Math.max(0, d - 32)); seen.add(key);
      let ch = this.near.get(key);
      if (!ch) { ch = { cx, cz, res: 0, want: 0, mesh: null, job: null }; this.near.set(key, ch); }
      if (ch.want !== res) this.request(ch, res, d, false);
      else if (ch.job) ch.job.prio = d;
    }
    for (const [key, ch] of this.near) if (!seen.has(key)) { this.drop(ch); this.near.delete(key); this.cover.dirty = true; }
    // far tiles
    const fcx = Math.floor(cam.x / FAR), fcz = Math.floor(cam.z / FAR), fr = Math.ceil(this.farR / FAR) + 1, fseen = new Set(), inner = R - CHUNK * 0.75;
    for (let dz = -fr; dz <= fr; dz++) for (let dx = -fr; dx <= fr; dx++) {
      const cx = fcx + dx, cz = fcz + dz, x0 = cx * FAR, z0 = cz * FAR;
      const nx = Math.max(x0, Math.min(cam.x, x0 + FAR)), nz = Math.max(z0, Math.min(cam.z, z0 + FAR)), dmin = Math.hypot(nx - cam.x, nz - cam.z);
      if (dmin > this.farR) continue;
      let dmax = 0; for (const [px, pz] of [[x0, z0], [x0 + FAR, z0], [x0, z0 + FAR], [x0 + FAR, z0 + FAR]]) dmax = Math.max(dmax, Math.hypot(px - cam.x, pz - cam.z));
      if (dmax < inner) continue;
      const key = cx + ',' + cz, res = dmin < 1400 ? 32 : 16; fseen.add(key);
      let ch = this.far.get(key);
      if (!ch) { ch = { cx, cz, res: 0, want: 0, mesh: null, job: null }; this.far.set(key, ch); }
      if (ch.want !== res) this.request(ch, res, 300 + dmin, true);
    }
    for (const [key, ch] of this.far) if (!fseen.has(key)) { this.drop(ch); this.far.delete(key); }
    // which far ground is hidden under near chunks
    const ox = (pcx - COVER_N / 2) * CHUNK, oz = (pcz - COVER_N / 2) * CHUNK;
    if (ox !== this.cover.ox || oz !== this.cover.oz) { this.cover.ox = ox; this.cover.oz = oz; this.cover.dirty = true; }
    this.jobs.resort();
  }
  request(ch, res, prio, far) {
    if (ch.job) ch.job.cancel();
    ch.want = res;
    const size = far ? FAR : CHUNK, skirt = far ? 14 : res >= 64 ? 1.2 : res >= 32 ? 2.5 : res >= 16 ? 5 : 9;
    const job = this.jobs.run({ t: 'terrain', x0: ch.cx * size, z0: ch.cz * size, size, res, skirt }, prio); ch.job = job;
    job.promise.then(r => {
      if (ch.job !== job || ch.dead) return; ch.job = null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3));
      g.setAttribute('splat', new THREE.BufferAttribute(r.sp, 4, true)); g.setAttribute('splat2', new THREE.BufferAttribute(r.sp2, 4, true));
      g.setIndex(gridIndex(res));
      g.boundingBox = new THREE.Box3(new THREE.Vector3(0, r.lo, 0), new THREE.Vector3(size, r.hi, size)); g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
      const mesh = new THREE.Mesh(g, far ? this.farMat : this.mat);
      mesh.position.set(ch.cx * size, far ? -0.6 : 0, ch.cz * size); mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.receiveShadow = !far; mesh.castShadow = !far && res >= 32;
      if (ch.mesh) this.disposeMesh(ch.mesh);
      ch.mesh = mesh; ch.res = res; this.scene.add(mesh);
      if (!far) this.cover.dirty = true;
    });
  }
  drop(ch) { ch.dead = true; if (ch.job) ch.job.cancel(); if (ch.mesh) this.disposeMesh(ch.mesh); ch.mesh = null; }
  disposeMesh(m) { this.scene.remove(m); m.geometry.setIndex(null); m.geometry.dispose(); }
  // call once a frame after update: refresh which far texels are covered
  sync() {
    const c = this.cover; if (!c.dirty) return; c.dirty = false;
    c.data.fill(0);
    const bx = Math.round(c.ox / CHUNK), bz = Math.round(c.oz / CHUNK);
    for (const ch of this.near.values()) { if (!ch.mesh) continue; const i = ch.cx - bx, j = ch.cz - bz; if (i >= 0 && j >= 0 && i < COVER_N && j < COVER_N) c.data[j * COVER_N + i] = 255; }
    c.tex.needsUpdate = true; c.o.value.set(c.ox, c.oz, COVER_N * CHUNK);
  }
  // how much of the near ground around (x,z) is built, 0..1 (for the loading screen)
  progress(cam, r = 200) {
    let want = 0, have = 0;
    for (const ch of this.near.values()) { const d = Math.hypot((ch.cx + .5) * CHUNK - cam.x, (ch.cz + .5) * CHUNK - cam.z); if (d < r) { want++; if (ch.mesh) have++; } }
    return want ? have / want : 0;
  }
  dispose() { for (const ch of this.near.values()) this.drop(ch); for (const ch of this.far.values()) this.drop(ch); this.near.clear(); this.far.clear(); }
}
