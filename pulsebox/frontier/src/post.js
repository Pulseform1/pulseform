// The picture after the scene is drawn (on low graphics only the first and last steps):
//   lone green specks out: a single pixel of green unlike every pixel round it (a far blade tip, a leaf edge breaking
//   up) takes on its neighbours' colour, before the glow could spread it into a sparkle and once more at the very end.
//   Anything bigger than a pixel is left exactly as it was, and so are stars, sparks and embers (they are not green);
//   bloom: the sun, the fire, the lantern and eyes in the dark glow;
//   sun shafts: bright sky behind the trees streams light toward you, the way morning light does in a pine forest;
//   tone mapping, then a grade: a touch more depth and colour, warm light and cool shade, a soft vignette and fine grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const SHAFTS = {
  uniforms: { tDiffuse: { value: null }, uSun: { value: new THREE.Vector2(.5, .5) }, uK: { value: 0 }, uCol: { value: new THREE.Color(1, .9, .75) }, uAspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uSun; uniform float uK; uniform vec3 uCol; uniform float uAspect; varying vec2 vUv;
  float bright( vec2 p ) { vec3 c = texture2D( tDiffuse, p ).rgb; float l = dot( c, vec3( 0.3, 0.55, 0.15 ) ); return smoothstep( 1.1, 3.5, l ); }
  void main() {
    vec4 base = texture2D( tDiffuse, vUv );
    if ( uK < 0.003 ) { gl_FragColor = base; return; }
    vec2 d = ( uSun - vUv ); float dist = length( d * vec2( uAspect, 1.0 ) );
    vec2 stp = d / float( SAMPLES ); vec2 p = vUv; float acc = 0.0, w = 1.0;
    float j = fract( sin( dot( vUv, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
    p += stp * j;
    for ( int i = 0; i < SAMPLES; i++ ) { acc += bright( p ) * w; w *= 0.93; p += stp; }
    acc /= 9.0 * float( SAMPLES ) / 22.0;
    float fall = exp( - dist * 2.2 );
    gl_FragColor = vec4( base.rgb + uCol * acc * fall * uK, base.a );
  }`,
};
const DESPECKLE = {
  uniforms: { tDiffuse: { value: null }, uPx: { value: new THREE.Vector2(1 / 1280, 1 / 720) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uPx; varying vec2 vUv;
  #ifdef LINEAR
  vec3 seen( vec3 c ) { return pow( c / ( 1.0 + c ), vec3( 0.4545 ) ); }   // roughly how it will look (still linear light here)
  #else
  vec3 seen( vec3 c ) { return c; }   // (the last pass: already what the screen shows)
  #endif
  #ifdef LINEAR
  #define SOLID( a ) a
  #else
  #define SOLID( a ) 1.0   // (the screen gets every pixel solid: a part see-through one can show up as a bright dot)
  #endif
  void main() {
    vec4 base = texture2D( tDiffuse, vUv ); vec3 c = seen( base.rgb );
    float green = smoothstep( 0.008, 0.03, c.g - max( c.r, c.b ) );
    if ( green <= 0.0 ) { gl_FragColor = vec4( base.rgb, SOLID( base.a ) ); return; }
    // each neighbour: how different it looks, and the two brightest of them (how bright they look, and their light as stored)
    vec3 sum = vec3( 0.0 ); float md = 9.0, s1 = 0.0, s2 = 0.0, r1 = 0.0, r2 = 0.0;
    for ( int j = -1; j <= 1; j++ ) for ( int i = -1; i <= 1; i++ ) {
      if ( i == 0 && j == 0 ) continue;
      vec3 n = texture2D( tDiffuse, vUv + vec2( float( i ), float( j ) ) * uPx ).rgb; sum += n;
      vec3 sn = seen( n ), d = abs( c - sn ); md = min( md, d.r + d.g + d.b );
      float sl = dot( sn, vec3( 0.3, 0.59, 0.11 ) ), rl = dot( n, vec3( 0.3, 0.59, 0.11 ) );
      if ( sl > s1 ) { s2 = s1; r2 = r1; s1 = sl; r1 = rl; } else if ( sl > s2 ) { s2 = sl; r2 = rl; }
    }
    float lone = smoothstep( 0.09, 0.17, md );   // unlike even the closest of its eight neighbours
    // a glint of one or two pixels: brighter than all but (at most) one neighbour. It is brought down to the second
    // brightest, so a thin blade or twig (two bright neighbours, along its length) keeps its look.
    float lc = dot( c, vec3( 0.3, 0.59, 0.11 ) ), rc = dot( base.rgb, vec3( 0.3, 0.59, 0.11 ) );
    float glint = smoothstep( 0.02, 0.06, lc - s2 ), f = min( 1.0, r2 / max( rc, 1e-5 ) );
    gl_FragColor = vec4( mix( base.rgb * mix( 1.0, f, green * glint ), sum / 8.0, green * lone ), SOLID( base.a ) );
  }`,
};
const GRADE = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uNight: { value: 0 }, uHurt: { value: 0 }, uGloom: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uNight; uniform float uGloom; varying vec2 vUv;
  void main() {
    vec3 c = texture2D( tDiffuse, vUv ).rgb;
    float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
    // a gentle S-curve, a little more colour, warm highlights and cool shade (less so at night, when it all goes blue)
    c = mix( c, c * c * ( 3.0 - 2.0 * c ), 0.32 );
    c = mix( vec3( l ), c, 1.14 - 0.25 * uNight );
    c += vec3( 0.022, 0.008, -0.018 ) * smoothstep( 0.45, 1.0, l ) * ( 1.0 - uNight ) - vec3( 0.006, -0.002, -0.014 ) * ( 1.0 - smoothstep( 0.0, 0.35, l ) );
    // deep in the timber: the colour drains to a cold grey-green and the edges close in
    c = mix( c, vec3( dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ) ) * vec3( 0.9, 1.0, 0.96 ), uGloom * 0.42 );
    // vignette and grain
    vec2 q = vUv - 0.5; c *= 1.0 - dot( q, q ) * ( 0.62 + 0.3 * uNight + 0.55 * uGloom );
    float g = fract( sin( dot( vUv * ( 1.0 + fract( uTime ) ), vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ) - 0.5;
    c += g * 0.018;
    gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
  }`,
};

// the glow is for the sun, fire, lanterns and sparks: a green pixel (a sunlit leaf or blade) is kept out of it, so it can never
// swell into a glowing green blot or square. Natural colours are untouched: this only decides what feeds the glow.
function noGreenGlow(bloom) {
  const m = bloom.materialHighPassFilter, o = 'float v = luminance( texel.xyz );';
  if (!m || !m.fragmentShader.includes(o)) return;
  m.fragmentShader = m.fragmentShader.replace(o, 'float v = luminance( texel.xyz ) * ( 1.0 - smoothstep( 0.04, 0.16, ( texel.g - max( texel.r, texel.b ) ) / max( texel.g, 1e-4 ) ) );'); m.needsUpdate = true;
}
export class Post {
  constructor(renderer, scene, camera, quality) {
    this.r = renderer; this.scene = scene; this.cam = camera; this.on = false; this._v = new THREE.Vector3();
    this.setQuality(quality);
  }
  setQuality(q) {
    this.q = q; this.on = true;
    const size = this.r.getSize(new THREE.Vector2()), pr = this.r.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: q === 'medium' ? 2 : 4 });
    if (this.comp) this.comp.dispose();
    const c = this.comp = new EffectComposer(this.r, rt);
    c.addPass(new RenderPass(this.scene, this.cam));
    this.despeckle = new ShaderPass({ ...DESPECKLE, defines: { LINEAR: 1 } }); c.addPass(this.despeckle);
    this.despeckle2 = new ShaderPass(DESPECKLE);
    // low graphics: both clean-ups, and nothing else (no glow, sun shafts or grade)
    if (q === 'low') { this.bloom = this.shafts = this.grade = null; c.addPass(new OutputPass()); c.addPass(this.despeckle2); this.resize(); return; }
    // Medium: the glow worked at half size and fewer steps for the sun's rays, which is most of the cost on built-in graphics
    const half = this.half = q === 'high' ? 1 : .5; this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x * half, size.y * half), q === 'high' ? .42 : .32, .55, .88); noGreenGlow(this.bloom); c.addPass(this.bloom);
    this.shafts = new ShaderPass({ ...SHAFTS, defines: { SAMPLES: q === 'high' ? 22 : 12 } }); c.addPass(this.shafts);
    c.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE); c.addPass(this.grade); c.addPass(this.despeckle2);
    this.resize();
  }
  resize() { if (!this.comp) return; const s = this.r.getSize(new THREE.Vector2()); this.comp.setPixelRatio(this.r.getPixelRatio()); this.comp.setSize(s.x, s.y); for (const d of [this.despeckle, this.despeckle2]) if (d) d.uniforms.uPx.value.set(1 / Math.max(1, s.x * this.r.getPixelRatio()), 1 / Math.max(1, s.y * this.r.getPixelRatio())); if (this.bloom && this.half < 1) { const pr = this.r.getPixelRatio(); this.bloom.setSize(Math.round(s.x * pr * this.half), Math.round(s.y * pr * this.half)); } if (this.shafts) this.shafts.uniforms.uAspect.value = s.x / Math.max(1, s.y); }
  // sunDir: toward the sun (world); k: how strong the shafts may be (daylight, clear sky)
  render(dt, sunDir, k, night, gloom = 0) {
    if (!this.on || !this.comp) { this.r.render(this.scene, this.cam); return; }
    if (!this.bloom) { this.comp.render(dt); return; }   // (low graphics)
    const v = this._v.copy(this.cam.position).addScaledVector(sunDir, 1000).project(this.cam), facing = v.z < 1 ? 1 : 0;
    const edge = Math.max(Math.abs(v.x), Math.abs(v.y)), vis = facing * (1 - THREE.MathUtils.smoothstep(edge, 1.1, 1.9));
    this.shafts.uniforms.uSun.value.set(v.x * .5 + .5, v.y * .5 + .5); this.shafts.uniforms.uK.value = k * vis * (this.q === 'high' ? .55 : .4);
    this.grade.uniforms.uTime.value += dt; this.grade.uniforms.uNight.value = night; this.grade.uniforms.uGloom.value = gloom;
    this.bloom.strength = (this.q === 'high' ? .42 : .32) * (1 + night * .6);
    this.comp.render(dt);
  }
}
