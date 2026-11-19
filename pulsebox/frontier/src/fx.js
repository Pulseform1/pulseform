// Shader-wide patches shared by every material: fog that is brighter toward the sun and pools in low ground as mist,
// and a wind sway for anything instanced (trees, bushes, ferns). Uniforms here are shared objects, so one update per
// frame reaches every material.
import * as THREE from 'three';

export const U = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector4(1, 0.3, 0.5, 0.3) },   // dir.x, dir.z, strength, gustiness
  uFogSun: { value: new THREE.Color(1, .9, .8) },           // haze colour looking toward the sun (HDR, linear)
  uSunDirW: { value: new THREE.Vector3(0, 1, 0) },
  uFogP: { value: new THREE.Vector4(0.05, 0.0, 0, 1) },     // mist falloff, mist density, mist base height, max fog
  uSunCol: { value: new THREE.Color(1, 1, 1) },
};

THREE.ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG
varying float vFogDepth; varying vec3 vFogDir;
#endif`;
THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
vFogDepth = - mvPosition.z; vFogDir = ( vec4( mvPosition.xyz, 0.0 ) * viewMatrix ).xyz;
#endif`;
THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
uniform vec3 fogColor; uniform float fogDensity; varying float vFogDepth; varying vec3 vFogDir;
uniform vec3 uFogSun; uniform vec3 uSunDirW; uniform vec4 uFogP;
vec4 frontierFog() {
  float d = length( vFogDir ); vec3 dir = vFogDir / max( d, 1e-3 );
  float haze = 1.0 - exp( - pow( fogDensity * d, 1.4 ) );
  float b = uFogP.x, camH = max( cameraPosition.y - uFogP.z, -40.0 ), fy = dir.y;
  float mist = uFogP.y * exp( - b * camH ) * ( abs( fy * b * d ) > 1e-4 ? ( 1.0 - exp( - b * fy * d ) ) / ( b * fy ) : d );
  float f = clamp( 1.0 - ( 1.0 - haze ) * exp( - max( mist, 0.0 ) ), 0.0, uFogP.w );
  vec3 col = mix( fogColor, uFogSun, pow( max( dot( dir, uSunDirW ), 0.0 ), 6.0 ) );
  #ifdef TONE_MAPPING
  col = toneMapping( col );
  #endif
  col = linearToOutputTexel( vec4( col, 1.0 ) ).rgb;
  return vec4( col, f );
}
#endif`;
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
{ vec4 fg = frontierFog(); gl_FragColor.rgb = mix( gl_FragColor.rgb, fg.rgb, fg.a ); }
#endif`;

export function fogUniforms(sh) { sh.uniforms.uFogSun = U.uFogSun; sh.uniforms.uSunDirW = U.uSunDirW; sh.uniforms.uFogP = U.uFogP; }
THREE.Material.prototype.onBeforeCompile = function (sh) { fogUniforms(sh); };

// patch(material, key, fn): runs fn(shader) at compile time on top of the fog uniforms
export function patch(mat, key, fn) {
  mat.onBeforeCompile = (sh, r) => { fogUniforms(sh); fn(sh, r); };
  mat.customProgramCacheKey = () => key;
  return mat;
}

// Wind sway for instanced vegetation. k = [1/height (local units), sway metres at the top, leaf flutter metres]
export const WIND_VS = `
#ifdef USE_INSTANCING
  vec3 wIp = instanceMatrix[3].xyz; float wS2 = dot( instanceMatrix[0].xyz, instanceMatrix[0].xyz );
#else
  vec3 wIp = vec3( 0.0 ); float wS2 = 1.0;
#endif
{
  float ph = dot( wIp.xz, vec2( 0.071, 0.053 ) );
  float hN = clamp( position.y * uWindK.x, 0.0, 1.4 );
  float bend = hN * hN;
  float gust = 0.55 + 0.45 * sin( uTime * 0.31 + ph * 0.37 ) * sin( uTime * 0.17 + ph * 0.21 );
  float sway = uWind.z * ( 0.65 * gust + 0.35 * sin( uTime * 1.13 + ph ) * uWind.w + 0.18 * sin( uTime * 2.3 + ph * 1.7 ) );
  vec3 wW = vec3( uWind.x, 0.0, uWind.y ) * sway * bend * uWindK.y;
  float fl = sin( uTime * 6.3 + dot( position, vec3( 3.1, 2.3, 4.7 ) ) + ph ) * uWindK.z * uWind.z * hN * ( 0.4 + gust );
  wW += vec3( fl, fl * 0.6, -fl * 0.8 );
#ifdef USE_INSTANCING
  transformed += vec3( dot( instanceMatrix[0].xyz, wW ), dot( instanceMatrix[1].xyz, wW ), dot( instanceMatrix[2].xyz, wW ) ) / wS2;
#else
  transformed += wW;
#endif
}`;
export function windify(mat, key, k) {
  const uK = k.isVector3 ? { value: k } : k.value ? k : { value: new THREE.Vector3(...k) };
  const fn = sh => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind; sh.uniforms.uWindK = uK;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform vec4 uWind; uniform vec3 uWindK;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + WIND_VS);
  };
  patch(mat, 'wind-' + key, fn);
  return { mat, uK, fn };
}
// a depth material for shadows that sways and cuts out like its colour material
export function windDepth(key, uK, map) {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: map || null, alphaTest: map ? 0.5 : 0 });
  if (map) d.side = THREE.DoubleSide;
  windify(d, 'd-' + key, uK);
  return d;
}
