// Sky and light over the wilderness: a physically based atmosphere (Preetham scattering), drifting clouds, the sun
// and moon, stars at night, the haze colour the fog uses, the sun's shadow that follows the player, and an
// environment map rendered from this same sky so everything is lit by the sky above it.
import * as THREE from 'three';
import { U } from './fx.js';

const SKY_VS = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  gl_Position = p.xyww;
}`;
const SKY_FS = `
varying vec3 vDir;
uniform vec3 uSun; uniform vec3 uMoon; uniform float uTurb; uniform float uRay; uniform float uMie; uniform float uMieG;
uniform float uTime; uniform float uNight; uniform float uEnv; uniform float uCloudCover; uniform vec2 uCloudOff;
uniform vec3 uCloudLit; uniform vec3 uCloudDark; uniform vec3 uFogAway; uniform vec3 uFogSunC; uniform float uHorizon; uniform float uMoonLight;
const float pi = 3.141592653589793;
const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );
const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );
float hash13( vec3 p ) { p = fract( p * 0.1031 ); p += dot( p, p.zyx + 31.32 ); return fract( ( p.x + p.y ) * p.z ); }
vec3 hash33( vec3 p ) { p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yxz + 33.33 ); return fract( ( p.xxy + p.yxx ) * p.zyx ); }
float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  float a = hash13( vec3( i, 1.0 ) ), b = hash13( vec3( i + vec2( 1, 0 ), 1.0 ) ), c = hash13( vec3( i + vec2( 0, 1 ), 1.0 ) ), d = hash13( vec3( i + 1.0, 1.0 ) );
  return mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y ); }
float cfbm( vec2 p ) { float s = 0.0, a = 0.5; mat2 m = mat2( 1.6, 1.2, -1.2, 1.6 ); for ( int i = 0; i < 6; i++ ) { s += a * vnoise( p ); p = m * p; a *= 0.5; } return s; }
vec3 atmosphere( vec3 dir, vec3 sunDir ) {
  float sunE = 1000.0 * max( 0.0, 1.0 - exp( - ( ( 1.6110731556870734 - acos( clamp( sunDir.y, -1.0, 1.0 ) ) ) / 1.5 ) ) );
  float sunfade = sunDir.y > 0.0 ? 1.0 : exp( sunDir.y );
  vec3 betaR = totalRayleigh * ( uRay - ( 1.0 - sunfade ) );
  vec3 betaM = 0.434 * ( 0.2 * uTurb * 10E-18 ) * MieConst * uMie;
  float za = acos( max( 0.0, dir.y ) );
  float inv = 1.0 / ( cos( za ) + 0.15 * pow( 93.885 - ( za * 180.0 / pi ), -1.253 ) );
  vec3 Fex = exp( - ( betaR * 8.4E3 * inv + betaM * 1.25E3 * inv ) );
  float ct = dot( dir, sunDir );
  float rPhase = 0.05968310365946075 * ( 1.0 + pow( ct * 0.5 + 0.5, 2.0 ) );
  float g2 = uMieG * uMieG; float mPhase = 0.07957747154594767 * ( 1.0 - g2 ) / pow( 1.0 - 2.0 * uMieG * ct + g2, 1.5 );
  vec3 bt = ( betaR * rPhase + betaM * mPhase ) / ( betaR + betaM );
  vec3 Lin = pow( sunE * bt * ( 1.0 - Fex ), vec3( 1.5 ) );
  Lin *= mix( vec3( 1.0 ), pow( sunE * bt * Fex, vec3( 0.5 ) ), clamp( pow( 1.0 - sunDir.y, 5.0 ), 0.0, 1.0 ) );
  vec3 L0 = vec3( 0.1 ) * Fex;
  if ( uEnv < 0.5 ) L0 += sunE * 19000.0 * Fex * smoothstep( 0.99995, 0.99997, ct );
  vec3 c = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );
  return pow( c, vec3( 1.0 / ( 1.2 + 1.2 * sunfade ) ) );
}
void main() {
  vec3 dir = normalize( vDir );
  vec3 d = vec3( dir.x, max( dir.y, 0.0 ), dir.z );
  vec3 col = atmosphere( normalize( d + vec3( 0.0, 0.002, 0.0 ) ), uSun );
  // night sky: deep blue, a faint band of the galaxy and the moon's glow
  float up = max( dir.y, 0.0 );
  vec3 night = vec3( 0.0035, 0.0055, 0.012 ) * ( 1.6 - up ) ;
  float mc = max( dot( dir, uMoon ), 0.0 );
  night += vec3( 0.03, 0.04, 0.06 ) * pow( mc, 24.0 ) * uMoonLight + vec3( 0.006, 0.008, 0.013 ) * pow( mc, 4.0 ) * uMoonLight;
  if ( uEnv < 0.5 ) {
    vec3 gp = normalize( vec3( 0.55, 0.25, -0.8 ) );
    float band = exp( - pow( dot( dir, gp ) * 4.5, 2.0 ) ) * ( 0.5 + 0.5 * cfbm( dir.xz * 6.0 / ( 0.4 + up ) ) );
    night += vec3( 0.010, 0.010, 0.014 ) * band;
    // stars, twinkling
    for ( int k = 0; k < 2; k++ ) {
      float sc = k == 0 ? 160.0 : 330.0;
      vec3 p = dir * sc, c = floor( p ), f = fract( p );
      float h = hash13( c + float( k ) * 17.0 );
      if ( h > 0.982 ) {
        vec3 sp = hash33( c ) * 0.6 + 0.2;
        float s = smoothstep( 0.32, 0.0, length( f - sp ) ) * ( h - 0.982 ) / 0.018;
        float tw = 0.65 + 0.35 * sin( uTime * ( 2.0 + h * 9.0 ) + h * 300.0 );
        vec3 tint = mix( vec3( 1.0, 0.85, 0.7 ), vec3( 0.75, 0.85, 1.0 ), hash13( c * 1.7 ) );
        night += tint * s * tw * ( k == 0 ? 1.4 : 0.6 ) * smoothstep( 0.0, 0.12, up );
      }
    }
    // the moon, with darker seas
    float md = acos( clamp( dot( dir, uMoon ), -1.0, 1.0 ) );
    if ( md < 0.035 ) {
      vec3 mx = normalize( cross( uMoon, vec3( 0.0, 1.0, 0.0 ) ) ), my = cross( mx, uMoon );
      vec2 q = vec2( dot( dir, mx ), dot( dir, my ) ) / 0.024;
      float disc = smoothstep( 1.0, 0.94, length( q ) );
      float seas = cfbm( q * 2.2 + 4.0 );
      night += vec3( 0.9, 0.92, 1.0 ) * disc * ( 0.55 + 0.45 * smoothstep( 0.35, 0.65, seas ) ) * 1.4 * uMoonLight;
    }
  }
  col = mix( col, night + col * 0.3, uNight );
  // clouds on a flat layer high above
  if ( dir.y > 0.0 ) {
    vec2 p = dir.xz / ( dir.y + 0.08 ) * 1.4 + uCloudOff;
    float dn = cfbm( p );
    float cov = smoothstep( 1.0 - uCloudCover, 1.0 - uCloudCover + 0.32, dn );
    float dl = cfbm( p + uSun.xz * 0.06 );
    float lit = clamp( 1.0 - ( dl - dn ) * 4.0, 0.25, 1.2 );
    float ct = max( dot( dir, uSun ), 0.0 );
    vec3 cc = mix( uCloudDark, uCloudLit, lit * ( 1.0 - cov * 0.35 ) ) + uCloudLit * pow( ct, 12.0 ) * ( 1.0 - cov ) * 1.4;
    cov *= smoothstep( 0.0, 0.18, dir.y );
    col = mix( col, cc, cov * 0.95 );
  }
  // fade into the same haze the fog uses, so far hills and sky meet without a seam
  vec3 fd = normalize( vec3( dir.x, 0.0, dir.z ) );
  vec3 haze = mix( uFogAway, uFogSunC, pow( max( dot( fd, normalize( vec3( uSun.x, 0.0, uSun.z ) + 1e-4 ) ) * ( 1.0 - abs( uSun.y ) ), 0.0 ), 6.0 ) );
  col = mix( col, haze, smoothstep( 0.16, -0.03, dir.y ) * uHorizon );
  gl_FragColor = vec4( col, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// the same atmosphere in JS, to pick fog and light colours that match the sky
const TR = [5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5], MC = [1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14];
function atmosphereJS(dir, sun, P, out) {
  const sunE = 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(Math.max(-1, Math.min(1, sun.y)))) / 1.5)));
  const sunfade = sun.y > 0 ? 1 : Math.exp(sun.y), rc = P.ray - (1 - sunfade), za = Math.acos(Math.max(0, dir.y));
  const inv = 1 / (Math.cos(za) + 0.15 * Math.pow(93.885 - za * 180 / Math.PI, -1.253)), ct = dir.x * sun.x + dir.y * sun.y + dir.z * sun.z;
  const rPhase = 0.05968310365946075 * (1 + Math.pow(ct * .5 + .5, 2)), g2 = P.mieG * P.mieG, mPhase = 0.07957747154594767 * (1 - g2) / Math.pow(1 - 2 * P.mieG * ct + g2, 1.5);
  const k = Math.pow(1 - sun.y, 5), mixK = Math.max(0, Math.min(1, k));
  for (let i = 0; i < 3; i++) {
    const bR = TR[i] * rc, bM = 0.434 * (0.2 * P.turb * 10E-18) * MC[i] * P.mie, Fex = Math.exp(-(bR * 8.4E3 * inv + bM * 1.25E3 * inv)), bt = (bR * rPhase + bM * mPhase) / (bR + bM);
    let Lin = Math.pow(Math.max(0, sunE * bt * (1 - Fex)), 1.5); Lin *= 1 + (Math.pow(Math.max(0, sunE * bt * Fex), .5) - 1) * mixK;
    const c = (Lin + 0.1 * Fex) * 0.04 + [0, .0003, .00075][i];
    out[i] = Math.pow(c, 1 / (1.2 + 1.2 * sunfade));
  }
  return out;
}
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class Sky {
  constructor(renderer, scene, opts = {}) {
    this.renderer = renderer; this.scene = scene; this.hours = 16.5; this.day = 0;
    this.P = { turb: 3.2, ray: 1.4, mie: 0.0045, mieG: 0.82 };
    this.cloudCover = 0.42; this.cloudOff = new THREE.Vector2(); this.weatherFog = 0; this.mist = 0;
    const uniforms = {
      uSun: { value: new THREE.Vector3(0, 1, 0) }, uMoon: { value: new THREE.Vector3(0, -1, 0) }, uTurb: { value: this.P.turb }, uRay: { value: this.P.ray }, uMie: { value: this.P.mie }, uMieG: { value: this.P.mieG },
      uTime: U.uTime, uNight: { value: 0 }, uEnv: { value: 0 }, uCloudCover: { value: this.cloudCover }, uCloudOff: { value: this.cloudOff },
      uCloudLit: { value: new THREE.Color(1, 1, 1) }, uCloudDark: { value: new THREE.Color(.5, .55, .6) }, uFogAway: { value: new THREE.Color() }, uFogSunC: { value: new THREE.Color() }, uHorizon: { value: 1 }, uMoonLight: { value: 1 },
    };
    this.uniforms = uniforms;
    this.mat = new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.mat); this.dome.frustumCulled = false; this.dome.renderOrder = -10; this.dome.scale.setScalar(1000);
    scene.add(this.dome);
    // a copy without the sun disc and stars renders the environment map
    const envU = { ...uniforms, uEnv: { value: 1 }, uHorizon: { value: 1 } };
    this.envScene = new THREE.Scene(); this.envMat = new THREE.ShaderMaterial({ uniforms: envU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false });
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.envMat); envDome.scale.setScalar(100); this.envScene.add(envDome);
    // ground bounce under the env dome: a dark disc so the environment's lower half isn't sky
    this.envGround = new THREE.Mesh(new THREE.CircleGeometry(400, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a2a1e })); this.envGround.position.y = -2; this.envScene.add(this.envGround);
    this.pmrem = new THREE.PMREMGenerator(renderer); this.envRT = null; this.envTimer = 0; this.lastEnvSun = new THREE.Vector3(9, 9, 9);

    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    const sh = this.sun.shadow; sh.mapSize.set(opts.shadowSize || 2048, opts.shadowSize || 2048); this.shadowSpan = opts.shadowSpan || 60;
    sh.camera.left = -this.shadowSpan; sh.camera.right = this.shadowSpan; sh.camera.top = this.shadowSpan; sh.camera.bottom = -this.shadowSpan; sh.camera.near = 1; sh.camera.far = 900;
    sh.bias = -0.0004; sh.normalBias = 0.045; sh.radius = 2.5; sh.camera.updateProjectionMatrix();
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0x8899bb, 0x3a3020, 0.3); scene.add(this.hemi);
    scene.fog = new THREE.FogExp2(0x9aa8b8, 0.0007);
    this.sunDir = new THREE.Vector3(); this.moonDir = new THREE.Vector3(); this.daylight = 1; this.night = 0;
    this._c = [0, 0, 0]; this._v = new THREE.Vector3();
  }
  setShadowQuality(size, span) {
    const sh = this.sun.shadow; this.shadowSpan = span;
    sh.camera.left = -span; sh.camera.right = span; sh.camera.top = span; sh.camera.bottom = -span; sh.camera.updateProjectionMatrix();
    if (sh.mapSize.x !== size) { sh.mapSize.set(size, size); if (sh.map) { sh.map.dispose(); sh.map = null; } }
  }
  // where the sun is at a given hour: rises in the east around 6, sets in the west around 19:30, low in the south
  static sunAt(hours, out) {
    const a = (hours - 6.6) / 12.6 * Math.PI, lat = 0.68;
    return out.set(Math.cos(a), Math.sin(a) * Math.cos(lat * .78), -Math.sin(a) * Math.sin(lat) * .9 - 0.22).normalize();
  }
  update(dt, camPos, gameDt) {
    this.hours = (this.hours + gameDt / 3600 + 24) % 24;
    const s = Sky.sunAt(this.hours, this.sunDir), m = this.moonDir.set(-s.x * .9, -s.y, -s.z * .7 + .25).normalize();
    const sunUp = s.y, day = sstep(-0.12, 0.08, sunUp); this.daylight = day; this.night = 1 - sstep(-0.2, 0.02, sunUp);
    const u = this.uniforms; u.uSun.value.copy(s); u.uMoon.value.copy(m); u.uNight.value = this.night;
    u.uMoonLight.value = 1;
    this.cloudOff.x += dt * 0.004 * U.uWind.value.x * (0.6 + U.uWind.value.z); this.cloudOff.y += dt * 0.004 * U.uWind.value.y * (0.6 + U.uWind.value.z);
    u.uCloudCover.value = this.cloudCover;
    // haze colours from the atmosphere just above the horizon, toward and away from the sun
    const flat = this._v.set(s.x, 0, s.z).normalize(); const toward = [0, 0, 0], away = [0, 0, 0];
    atmosphereJS({ x: flat.x * .996, y: 0.09, z: flat.z * .996 }, s, this.P, toward);
    atmosphereJS({ x: -flat.x * .996, y: 0.09, z: -flat.z * .996 }, s, this.P, away);
    const nightCol = [0.006, 0.009, 0.017], storm = this.weatherFog;
    const grey = (c, k) => { const l = (c[0] + c[1] + c[2]) / 3; return c.map(v => v + (l * 1.05 - v) * k); };
    let fa = away.map((v, i) => v + (nightCol[i] - v) * this.night), ft = toward.map((v, i) => v + (nightCol[i] * 1.2 - v) * this.night);
    fa = grey(fa, .25 + .5 * storm).map(v => v * (1 - .35 * storm)); ft = grey(ft, .15 + .5 * storm).map(v => v * (1 - .3 * storm));
    this.scene.fog.color.setRGB(fa[0], fa[1], fa[2]); U.uFogSun.value.setRGB(ft[0], ft[1], ft[2]); U.uSunDirW.value.copy(s);
    u.uFogAway.value.copy(this.scene.fog.color); u.uFogSunC.value.copy(U.uFogSun.value);
    this.scene.fog.density = 0.00042 + 0.0011 * storm + 0.0001 * this.night;
    U.uFogP.value.set(0.05, this.mist * 0.035, -2 + 0 * camPos.y, 1);
    // sun or moon light
    const low = 1 - sstep(0.0, 0.42, sunUp), sunCol = new THREE.Color().setRGB(1, 0.96 - 0.38 * low, 0.9 - 0.62 * low);
    const sunI = 3.6 * sstep(-0.02, 0.12, sunUp) * (1 - 0.6 * storm) * (1 - 0.35 * this.cloudCover * this.cloudCover);
    const moonI = 0.32 * this.night * (1 - 0.6 * storm);
    const useSun = sunUp > -0.04, L = useSun ? s : m;
    this.sun.color.copy(useSun ? sunCol : new THREE.Color(0.62, 0.72, 1.0)); this.sun.intensity = useSun ? sunI : moonI; U.uSunCol.value.copy(this.sun.color).multiplyScalar(this.sun.intensity);
    // keep the shadow camera snapped to its own texels so shadows do not shimmer as you walk
    const span = this.shadowSpan, dist = 400;
    this.sun.target.position.copy(camPos);
    this.sun.position.copy(camPos).addScaledVector(L, dist);
    this.sun.updateMatrixWorld(); this.sun.target.updateMatrixWorld();
    const shc = this.sun.shadow.camera; shc.position.copy(this.sun.position); shc.lookAt(this.sun.target.position); shc.updateMatrixWorld();
    const texel = (span * 2) / this.sun.shadow.mapSize.x, inv = shc.matrixWorldInverse, p = this._v.copy(camPos).applyMatrix4(inv);
    const sx = Math.round(p.x / texel) * texel - p.x, sy = Math.round(p.y / texel) * texel - p.y;
    const ax = new THREE.Vector3().setFromMatrixColumn(shc.matrixWorld, 0), ay = new THREE.Vector3().setFromMatrixColumn(shc.matrixWorld, 1);
    this.sun.position.addScaledVector(ax, sx).addScaledVector(ay, sy); this.sun.target.position.addScaledVector(ax, sx).addScaledVector(ay, sy);
    this.sun.updateMatrixWorld(); this.sun.target.updateMatrixWorld();
    // sky light
    const skyAmb = new THREE.Color().setRGB(fa[0], fa[1], fa[2]);
    this.hemi.color.setRGB(0.32 + 0.4 * day, 0.38 + 0.42 * day, 0.62 + 0.38 * day); this.hemi.groundColor.setRGB(0.10 + 0.12 * day, 0.09 + 0.1 * day, 0.07 + 0.06 * day);
    this.hemi.intensity = 0.14 + 0.1 * day + 0.14 * this.night;
    this.scene.environmentIntensity = 0.82 + 0.25 * storm;
    // cloud colours
    const cl = sunCol.clone().multiplyScalar(0.55 * day + 0.04).lerp(new THREE.Color(.04, .05, .08), this.night * .8);
    u.uCloudLit.value.copy(cl).multiplyScalar(1 - 0.5 * storm); u.uCloudDark.value.copy(skyAmb).multiplyScalar(0.75 - 0.2 * storm);
    this.dome.position.copy(camPos);
    // re-render the environment when the light has changed enough
    this.envTimer -= dt;
    if (!this.envRT || (this.envTimer <= 0 && this.lastEnvSun.distanceToSquared(s) > 2e-5)) this.renderEnv();
  }
  renderEnv() {
    this.envTimer = 1.2; this.lastEnvSun.copy(this.sunDir);
    const day = this.daylight;
    this.envGround.material.color.setRGB(0.05 + 0.13 * day, 0.05 + 0.12 * day, 0.04 + 0.08 * day);
    const rt = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 500);
    if (this.envRT) this.envRT.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
  }
}
