// A campfire you can feed: crossed flame sheets drawn with scrolling noise, glowing coals, rising embers, drifting
// smoke and a flickering warm light. `fuel` (0..1) drives how big and bright it burns; at 0 only smoke and coals stay.
import * as THREE from 'three';
import { U } from './fx.js';
import { puffTexture } from './texgen.js';

const NOISE = `
float h21( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float vn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( h21( i ), h21( i + vec2( 1, 0 ) ), f.x ), mix( h21( i + vec2( 0, 1 ) ), h21( i + 1.0 ), f.x ), f.y ); }
float fb( vec2 p ) { float s = 0.0, a = 0.5; for ( int i = 0; i < 4; i++ ) { s += a * vn( p ); p *= 2.07; a *= 0.5; } return s; }`;

const FLAME_VS = `varying vec2 vUv; varying float vSeed; attribute float seed;
void main() { vUv = uv; vSeed = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`;
const FLAME_FS = `varying vec2 vUv; varying float vSeed; uniform float uT; uniform float uFuel;
${NOISE}
void main() {
  vec2 uv = vUv; float t = uT * 1.6 + vSeed * 7.0;
  float n = fb( vec2( uv.x * 3.0 + vSeed * 3.0, uv.y * 2.2 - t * 1.9 ) );
  float n2 = fb( vec2( uv.x * 6.0 - vSeed, uv.y * 4.0 - t * 3.1 ) );
  float x = ( uv.x - 0.5 ) * 2.0;
  float shape = 1.0 - smoothstep( 0.0, 1.0, abs( x + ( n - 0.5 ) * 0.7 * uv.y ) / ( 0.75 * ( 1.0 - uv.y * 0.85 ) + 0.06 ) );
  float body = shape * smoothstep( 1.0, 0.15, uv.y + ( n2 - 0.5 ) * 0.45 ) * smoothstep( 0.0, 0.08, uv.y );
  float h = clamp( body * ( 0.55 + n * 0.9 ) * 1.3, 0.0, 1.5 );
  float a = smoothstep( 0.18, 0.55, h ) * clamp( uFuel * 1.4, 0.0, 1.0 );
  vec3 col = mix( vec3( 0.9, 0.18, 0.02 ), vec3( 1.0, 0.55, 0.12 ), smoothstep( 0.3, 0.75, h ) );
  col = mix( col, vec3( 1.0, 0.9, 0.62 ), smoothstep( 0.8, 1.25, h ) );
  gl_FragColor = vec4( col * a * 0.95, a );
}`;
const COAL_FS = `varying vec2 vUv; varying float vSeed; uniform float uT; uniform float uFuel; uniform float uHeat;
${NOISE}
void main() {
  vec2 p = vUv * 2.0 - 1.0; float r = length( p ); if ( r > 1.0 ) discard;
  float n = fb( p * 4.0 + vec2( uT * 0.15, - uT * 0.1 ) ), cracks = smoothstep( 0.42, 0.62, fb( p * 9.0 ) );
  float glow = ( 1.0 - smoothstep( 0.1, 0.85, r ) ) * ( 0.35 + 0.65 * n ) * cracks * uHeat * ( 0.75 + 0.25 * sin( uT * 2.3 + n * 9.0 ) );
  vec3 ash = vec3( 0.06, 0.055, 0.05 ) * ( 0.6 + n * 0.6 );
  vec3 col = ash + vec3( 1.0, 0.32, 0.06 ) * glow * 2.2;
  gl_FragColor = vec4( col, smoothstep( 1.0, 0.75, r ) );
}`;
const EMBER_VS = `attribute vec4 rnd; uniform float uT; uniform float uFuel; varying float vA;
void main() {
  float life = 2.2 + rnd.x * 1.8, t = mod( uT + rnd.y * life, life ), k = t / life;
  vec3 p = vec3( ( rnd.z - 0.5 ) * 0.5, 0.15, ( rnd.w - 0.5 ) * 0.5 );
  p.y += t * ( 0.9 + rnd.x * 0.8 ); p.x += sin( t * 3.0 + rnd.z * 10.0 ) * 0.18 * k; p.z += cos( t * 2.6 + rnd.w * 9.0 ) * 0.18 * k;
  vA = ( 1.0 - k ) * smoothstep( 0.0, 0.08, k ) * step( rnd.x, uFuel * 1.2 );
  vec4 mv = modelViewMatrix * vec4( p, 1.0 ); gl_Position = projectionMatrix * mv; gl_PointSize = ( 1.2 + rnd.z * 1.6 ) * ( 9.0 / - mv.z ) * vA + 1.0;
}`;
const EMBER_FS = `varying float vA; void main() { vec2 c = gl_PointCoord - 0.5; float d = length( c ); if ( d > 0.5 ) discard; gl_FragColor = vec4( vec3( 1.0, 0.55, 0.15 ) * 3.0 * vA * ( 1.0 - d * 2.0 ), vA ); }`;

export class Campfire {
  constructor(parent) {
    this.group = new THREE.Group(); parent.add(this.group);
    this.fuel = 0.75; this.lit = true; this.heat = 1; this.t = 0;
    this.u = { uT: { value: 0 }, uFuel: { value: 1 }, uHeat: { value: 1 } };
    // flame sheets
    const fg = new THREE.BufferGeometry(), pos = [], uv = [], seed = [], idx = [];
    const sheets = 4;
    for (let s = 0; s < sheets; s++) {
      const a = s / sheets * Math.PI, w = .62 + (s % 2) * .18, h = 1.05 + (s % 2) * .25, cx = Math.cos(a) * w / 2, cz = Math.sin(a) * w / 2, b = pos.length / 3;
      pos.push(-cx, 0, -cz, cx, 0, cz, cx, h, cz, -cx, h, -cz); uv.push(0, 0, 1, 0, 1, 1, 0, 1); seed.push(s * .37, s * .37, s * .37, s * .37);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); fg.setAttribute('seed', new THREE.Float32BufferAttribute(seed, 1)); fg.setIndex(idx);
    this.flameMat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.flames = new THREE.Mesh(fg, this.flameMat); this.flames.position.y = 0.12; this.flames.renderOrder = 5; this.group.add(this.flames);
    // coal bed
    const cg = new THREE.CircleGeometry(.62, 24).rotateX(-Math.PI / 2); cg.setAttribute('seed', new THREE.Float32BufferAttribute(new Array(cg.attributes.position.count).fill(0), 1));
    this.coals = new THREE.Mesh(cg, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: FLAME_VS, fragmentShader: COAL_FS, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, fog: false }));
    this.coals.position.y = .035; this.coals.renderOrder = 1; this.group.add(this.coals);
    // embers
    const N = 70, eg = new THREE.BufferGeometry(), r = new Float32Array(N * 4); for (let i = 0; i < r.length; i++) r[i] = Math.random();
    eg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3)); eg.setAttribute('rnd', new THREE.BufferAttribute(r, 4));
    this.embers = new THREE.Points(eg, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: EMBER_VS, fragmentShader: EMBER_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.embers.frustumCulled = false; this.group.add(this.embers);
    // smoke
    const puff = puffTexture(); this.smoke = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.SpriteMaterial({ map: puff, color: 0x8a8a88, transparent: true, depthWrite: false, opacity: 0 }); const s = new THREE.Sprite(m);
      s.userData = { t: i / 14 * 6, life: 6 + Math.random() * 2, dx: (Math.random() - .5) * .3, dz: (Math.random() - .5) * .3, rot: Math.random() * 6 }; this.smoke.push(s); this.group.add(s);
    }
    // light
    this.light = new THREE.PointLight(0xff8838, 30, 30, 2); this.light.position.y = 1.25; this.group.add(this.light);
    this.glow = new THREE.PointLight(0xff5a1a, 4, 8, 2); this.glow.position.y = .15; this.group.add(this.glow);
  }
  update(dt, night, windVec) {
    this.t += dt; const u = this.u;
    if (this.lit) this.fuel = Math.max(0, this.fuel - dt / 900); // a full fire burns about 15 minutes of play
    if (this.fuel <= 0) this.lit = false;
    const target = this.lit ? Math.min(1, .25 + this.fuel) : 0;
    u.uFuel.value += (target - u.uFuel.value) * Math.min(1, dt * 1.5);
    this.heat += ((this.lit ? 1 : .25) - this.heat) * Math.min(1, dt * .2);
    u.uHeat.value = this.heat; u.uT.value = this.t;
    const f = u.uFuel.value, fl = 0.82 + 0.1 * Math.sin(this.t * 13.1) * Math.sin(this.t * 7.3) + 0.08 * Math.sin(this.t * 23.7 + Math.sin(this.t * 3.1) * 2);
    this.light.intensity = (5 + 26 * f) * fl * (0.22 + 0.78 * night) + 1.5 * this.heat;
    this.light.position.x = Math.sin(this.t * 5.3) * .06; this.light.position.z = Math.cos(this.t * 4.7) * .06; this.light.position.y = 1.2 + Math.sin(this.t * 7.1) * .05;
    this.glow.intensity = 2 + 5 * this.heat * fl;
    this.flames.scale.set(.55 + .35 * f, .38 + .62 * f, .55 + .35 * f); this.flames.visible = f > 0.02;
    for (const s of this.smoke) {
      const d = s.userData; d.t += dt; if (d.t > d.life) { d.t = 0; d.dx = (Math.random() - .5) * .3; d.dz = (Math.random() - .5) * .3; }
      const k = d.t / d.life;
      s.position.set(d.dx * (1 + k * 3) + windVec.x * k * k * 3.5, 0.8 + k * 5.5, d.dz * (1 + k * 3) + windVec.z * k * k * 3.5);
      s.scale.setScalar(.6 + k * 3.4);
      const amt = (this.lit ? .16 + .12 * f : .1 * this.heat);
      s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.1)) * Math.min(1, k * 4) * amt * (night > .5 ? .6 : 1);
      s.material.color.setScalar(night > .5 ? .16 : .42); s.material.rotation = d.rot + k;
    }
  }
  addFuel(a = 0.35) { this.fuel = Math.min(1, this.fuel + a); this.lit = true; }
}
