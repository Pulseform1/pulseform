// Weather: clear spells, cloudy spells and rain, with mist on many mornings. Values ease toward targets so changes
// roll in over a few minutes. Rain is drawn as streaks around the camera that stop at the tent roof.
import * as THREE from 'three';
import { U } from './fx.js';

const RAIN_VS = `attribute vec4 rnd; uniform float uT; uniform float uRain; uniform vec4 uWind; uniform mat4 uTentInv; uniform vec3 uTentH;
varying float vA;
void main() {
  float B = 34.0, top = 16.0;
  vec2 cam = cameraPosition.xz;
  vec2 xz = cam + mod( rnd.xz * B - cam + B * 0.5, B ) - B * 0.5;
  float fall = mod( uT * 10.5 + rnd.y * 40.0, top * 2.0 );
  float y = cameraPosition.y + top - fall;
  vec2 slant = uWind.xy * uWind.z * 1.4;
  vec3 p = vec3( xz.x, y, xz.y );
  p.xz += slant * ( y - cameraPosition.y ) * 0.12;
  // the bottom end of each streak trails behind its motion
  p += vec3( slant.x * 0.04, 0.42, slant.y * 0.04 ) * position.y;
  vec3 tl = ( uTentInv * vec4( p, 1.0 ) ).xyz;
  float inTent = step( abs( tl.x ), uTentH.x ) * step( abs( tl.z ), uTentH.z ) * step( tl.y, uTentH.y );
  vA = step( rnd.w, uRain ) * ( 1.0 - inTent ) * ( 0.35 + 0.65 * position.y );
  vec4 mv = viewMatrix * vec4( p, 1.0 ); gl_Position = projectionMatrix * mv;
  vA *= smoothstep( 0.3, 2.0, - mv.z );
}`;
const RAIN_FS = `varying float vA; uniform vec3 uRainCol; void main() { if ( vA < 0.01 ) discard; gl_FragColor = vec4( uRainCol, vA * 0.32 ); }`;

export class Weather {
  constructor(scene, sky, camp) {
    this.sky = sky; this.camp = camp;
    this.cur = { cover: .35, storm: 0, rain: 0, mist: 0, wind: .45 };
    this.tgt = { ...this.cur }; this.state = 'clear'; this.nextChange = 3; this.dayRolled = -1; this.morningMist = false;
    const N = 9000, pos = new Float32Array(N * 2 * 3), rnd = new Float32Array(N * 2 * 4);
    for (let i = 0; i < N; i++) {
      const r = [Math.random(), Math.random(), Math.random(), Math.random()];
      for (let k = 0; k < 2; k++) { pos[(i * 2 + k) * 3 + 1] = k; rnd.set(r, (i * 2 + k) * 4); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
    this.u = { uT: U.uTime, uRain: { value: 0 }, uWind: U.uWind, uTentInv: { value: new THREE.Matrix4() }, uTentH: { value: new THREE.Vector3() }, uRainCol: { value: new THREE.Color(.7, .74, .8) } };
    this.mesh = new THREE.LineSegments(g, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false, fog: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; scene.add(this.mesh);
    if (camp) {
      const t = camp.tent; t.updateMatrixWorld(); this.u.uTentInv.value.copy(t.matrixWorld).invert();
      this.u.uTentH.value.set(camp.tentBounds.hw + .3, 2.95, camp.tentBounds.hl + .45);
    }
  }
  // pick what the sky does next
  roll(hours) {
    const r = Math.random();
    if (this.state === 'rain') this.state = r < .55 ? 'cloudy' : 'clear';
    else if (this.state === 'cloudy') this.state = r < .4 ? 'rain' : r < .75 ? 'clear' : 'cloudy';
    else this.state = r < .28 ? 'cloudy' : r < .38 ? 'rain' : 'clear';
    const T = { clear: { cover: .2 + Math.random() * .3, storm: 0, rain: 0, wind: .3 + Math.random() * .3 }, cloudy: { cover: .65 + Math.random() * .2, storm: .25, rain: 0, wind: .5 + Math.random() * .3 }, rain: { cover: .95, storm: .75, rain: .55 + Math.random() * .45, wind: .7 + Math.random() * .3 } }[this.state];
    Object.assign(this.tgt, T);
    this.nextChange = (this.state === 'rain' ? 1 + Math.random() * 2 : 2.5 + Math.random() * 4);
  }
  set(state) { this.state = state === 'rain' ? 'cloudy' : state === 'cloudy' ? 'clear' : 'rain'; this.roll(); if (state === 'fog') { this.morningMist = true; this.tgt.mist = 1; } }
  update(dt, gameDt, hours, day) {
    this.nextChange -= gameDt / 3600;
    if (this.nextChange <= 0) this.roll(hours);
    if (day !== this.dayRolled && hours > 3 && hours < 4.5) { this.dayRolled = day; this.morningMist = Math.random() < .55; }
    const mistT = this.morningMist && hours > 3.5 && hours < 10 ? Math.min(1, (hours - 3.5) * 2) * (1 - Math.max(0, Math.min(1, (hours - 8.2) / 1.6))) : 0;
    this.tgt.mist = Math.max(mistT, this.tgt.rain * .35);
    const k = Math.min(1, dt * 0.06 + gameDt / 3600 * 0.9);
    for (const key of Object.keys(this.cur)) this.cur[key] += (this.tgt[key] - this.cur[key]) * k;
    const c = this.cur, s = this.sky;
    s.cloudCover = c.cover; s.weatherFog = c.storm; s.mist = c.mist;
    U.uWind.value.z += (c.wind - U.uWind.value.z) * Math.min(1, dt * .5);
    this.u.uRain.value = c.rain;
    this.u.uRainCol.value.setRGB(.55, .58, .62).multiplyScalar(.35 + .65 * s.daylight);
    this.mesh.visible = c.rain > .02;
    U.uWet.value += ((c.rain > .1 ? 1 : 0) - U.uWet.value) * Math.min(1, dt * (c.rain > .1 ? .05 : .01));
  }
}
