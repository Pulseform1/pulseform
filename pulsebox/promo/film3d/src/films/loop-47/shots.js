// Loop 47: every shot. Every time Jay misses the last jump in Rooftop Rush, the night starts over at 9:00 PM and nobody
// remembers. Loop 1, loop 12, loop 30... on loop 46 there's another player on the last roof: Maya, stuck in the same
// night. On loop 47 they jump at the exact same time, and the film freezes with them in mid-air.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createBedroom } from "../../sets/bedroom.js";
import { createRooftops, runnerAt, ROOFS } from "../../sets/rooftops.js";
import { makeJay, pose } from "../../jay.js";
import { labelTexture } from "../../textures.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function place(cam, from, to, k, look, lookTo = look, fov = null) { cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k)); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function hand(cam, amt, t) { cam.position.x += Math.sin(t * 1.7) * amt + Math.sin(t * 4.3) * amt * 0.4; cam.position.y += Math.cos(t * 1.3) * amt; cam.rotation.z += Math.sin(t * 1.1) * amt * 0.5; }
function shake(cam, amt, t) { if (!amt) return; cam.position.x += Math.sin(t * 71) * amt; cam.position.y += Math.cos(t * 53) * amt; cam.rotation.z += Math.sin(t * 37) * amt * 0.3; }
const flashAt = (t, seeds) => seeds.reduce((m, s) => Math.max(m, clamp(1 - Math.abs(t - s) / 0.09) * (Math.sin(t * 90) > -0.3 ? 1 : 0.4)), 0);

// a little canvas texture we can redraw (the desk clock, the tally sheet, the monitor)
function canvasTex(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; let last = null;
  return { tex, draw: (...a) => { const key = JSON.stringify(a); if (key === last) return; last = key; g.clearRect(0, 0, w, h); draw(g, ...a); tex.needsUpdate = true; } }; }
function deskClock(scene, pos, rotY) {
  const face = canvasTex(256, 96, (g, text) => { g.fillStyle = "#050304"; g.fillRect(0, 0, 256, 96); g.font = "700 70px 'Chakra Petch', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(255,40,40,.12)"; g.fillText("88:88", 112, 50); g.shadowColor = "#ff2a2a"; g.shadowBlur = 12; g.fillStyle = "#ff3a3a"; g.fillText(text, 112, 50); g.shadowBlur = 0; g.font = "700 22px 'Chakra Petch', sans-serif"; g.fillText("PM", 228, 66); });
  const grp = new THREE.Group(); grp.position.copy(pos); grp.rotation.y = rotY; scene.add(grp);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.1, 0.08, 2, 0.015), new THREE.MeshStandardMaterial({ color: 0x15131a, roughness: 0.4 })); body.castShadow = true; grp.add(body);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.079), new THREE.MeshBasicMaterial({ map: face.tex })); scr.position.z = 0.041; grp.add(scr);
  const glow = new THREE.PointLight(0xff3030, 0.12, 0.6, 2); glow.position.z = 0.1; grp.add(glow);
  return { grp, set: (text) => face.draw(text) };
}

export function makeShots(renderer, tl) {
  const rf = createRooftops(), bed = createBedroom({ headset: true, lamp: true }), bed2 = createBedroom({ headset: true, lamp: true });
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt, wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  bed.phone.visible = false; bed2.phone.visible = false;
  rf.crawler.root.visible = false; rf.drone.root.visible = false;   // tonight it's just the jump
  // ---- the runners: Jay, and Maya (in the game), each with a name tag
  const J = rf.jay, M = makeJay({ variant: "maya" }); M.root.scale.setScalar(0.78); rf.scene.add(M.root);
  const tag = (text, col) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, { w: 1024, h: 200, px: 130, color: col }), transparent: true, depthWrite: false, fog: false })); s.scale.set(1.5, 0.29, 1); s.position.y = 2.25; return s; };
  J.root.add(tag("JAY", "#ff9a5a")); const mayaTag = tag("MAYA", "#c9a2ff"), unknownTag = tag("???", "#ffffff"); M.root.add(mayaTag, unknownTag);
  const [, e4, y4] = ROOFS[4], [a5, , y5] = ROOFS[5], SPEED = 8, TAKEOFF = 12 - e4, AIR = (e4 - a5) / SPEED;   // the big gap: from z=-96 to z=-102.5
  function run(rig, x, s, T, fear = 0.5) {   // running (or jumping a small gap) at distance s
    const R = runnerAt(s, { catchIt: false }); rig.root.position.set(x, R.y, R.z); rig.root.rotation.set(0, Math.PI, 0);
    if (R.roof >= 0) pose(rig, "run", T, { phase: s * 1.35, fear }); else pose(rig, "jump", T, { k: clamp(Math.sin(R.air * Math.PI) * 1.6) }); return R;
  }
  // the miss: u seconds after takeoff he's short; he hits the wall, hangs for a breath, his fingers slip and he drops
  const HIT = AIR, SLIP = AIR + 0.34;
  function miss(rig, x, u, T) {
    const r = rig.root; r.rotation.set(0, Math.PI, 0);
    if (u < 0) return run(rig, x, TAKEOFF + u * SPEED, T, 0.8);
    if (u < HIT) { const R = runnerAt(TAKEOFF + u * SPEED, { catchIt: true }); r.position.set(x, R.y, R.z); pose(rig, "jump", T, { k: clamp(Math.sin(R.air * Math.PI) * 1.6) }); return R; }
    if (u < SLIP) { r.position.set(x, y5 - 1.18 - (u - HIT) * 0.25, a5 + 0.32); pose(rig, "hang", T, { fear: 1, noBlink: true }); return { y: r.position.y, z: r.position.z }; }
    const f = u - SLIP; r.position.set(x, y5 - 1.27 - 4.9 * f * f, a5 + 0.32 + f * 0.9); pose(rig, "recoil", T, { fear: 1, noBlink: true });
    for (const s of [-1, 1]) { rig.J["hip" + s].rotation.x = -0.4 + Math.sin(T * 9 + s) * 0.5; rig.J["knee" + s].rotation.x = 0.6; }
    r.rotation.x = -Math.min(1.2, f * 0.9); return { y: r.position.y, z: r.position.z };
  }
  function stand(rig, x, z, T, p = {}) { rig.root.position.set(x, runnerAt(12 - z).y, z); rig.root.rotation.set(0, p.face ?? Math.PI, 0); pose(rig, p.crouch ? "crouch" : "stand", T, { ...p, k: p.crouch }); }
  // ---- the game on Jay's monitor
  const gameRT = new THREE.WebGLRenderTarget(960, 600, { samples: 0 }); gameRT.texture.colorSpace = THREE.SRGBColorSpace;
  const gameCam = new THREE.PerspectiveCamera(55, 960 / 600, 0.05, 800);
  function renderGame(set) { set(); const old = renderer.getRenderTarget(), ex = renderer.toneMappingExposure; renderer.setRenderTarget(gameRT); renderer.toneMappingExposure = 1.05; renderer.render(rf.scene, gameCam); renderer.setRenderTarget(old); renderer.toneMappingExposure = ex; }
  const gameChase = (T, u) => renderGame(() => { const R = miss(J, 0, u, T); M.root.visible = false; rf.update(T, { lightning: flashAt(T, [2.1, 7.4]), center: J.root.position });
    const y = Math.max(R.y, y4); aim(gameCam, V(1.3, y + 1.6, J.root.position.z + 4.2), V(0, y + 0.4, J.root.position.z - 5)); });
  // "PLAY AGAIN?" (the game turning itself back on)
  const again = canvasTex(1024, 640, (g, on) => { const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, "#1a0a22"); gr.addColorStop(1, "#05030a"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 640);
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.font = "400 120px 'Luckiest Guy', sans-serif"; g.lineWidth = 16; g.strokeStyle = "#0b0d1a"; g.strokeText("ROOFTOP RUSH", 512, 250); g.fillStyle = "#ffb23f"; g.fillText("ROOFTOP RUSH", 512, 250);
    if (on) { g.font = "700 64px 'Chakra Petch', sans-serif"; g.fillStyle = "#ffffff"; g.fillText("PLAY AGAIN?", 512, 420); } g.font = "700 34px 'Chakra Petch', sans-serif"; g.fillStyle = "#ff3a4a"; g.fillText("9:00 PM", 512, 540); });
  // ---- the desk clocks, Maya's room (teal walls), the tally sheet on her wall
  const clock = deskClock(bed.scene, V(0.66, 0.84, -1.55), -0.45), clock2 = deskClock(bed2.scene, V(0.66, 0.84, -1.55), -0.45);
  bed2.jay.root.visible = false; const maya = makeJay({ variant: "maya", headset: true }); maya.root.scale.setScalar(0.78); bed2.scene.add(maya.root);
  bed2.scene.traverse((o) => { if (o.isMesh && o.material?.color?.getHex?.() === 0x2b2446) { o.material = o.material.clone(); o.material.color.set(0x23394a); } });
  const tally = canvasTex(256, 384, (g) => { g.fillStyle = "#efe6cf"; g.fillRect(0, 0, 256, 384); g.fillStyle = "#c33"; g.font = "400 34px 'Luckiest Guy', sans-serif"; g.textAlign = "center"; g.fillText("9:00 AGAIN", 128, 40);
    g.strokeStyle = "#1a1a22"; g.lineWidth = 4; g.lineCap = "round"; let n = 0;
    for (let row = 0; row < 5 && n < 46; row++) for (let grp = 0; grp < 2 && n < 46; grp++) { const x0 = 22 + grp * 116, y0 = 72 + row * 62; for (let k = 0; k < 4 && n < 46; k++, n++) { g.beginPath(); g.moveTo(x0 + k * 18 + Math.sin(n) * 2, y0); g.lineTo(x0 + k * 18 - Math.sin(n * 3) * 2, y0 + 44); g.stroke(); }
      if (n < 46) { g.beginPath(); g.moveTo(x0 - 8, y0 + 36); g.lineTo(x0 + 66, y0 + 8); g.stroke(); n++; } } });
  tally.draw(); bed2.scene.traverse((o) => { if (o.isMesh && Math.abs(o.position.x - 1.2) < 0.01 && Math.abs(o.position.z + 2.09) < 0.01) { o.material = new THREE.MeshStandardMaterial({ map: tally.tex, roughness: 0.9 }); o.rotation.z = -0.04; } });   // her poster becomes the tally sheet
  // ---- loop 12: every route on the map (twelve coloured trails, every one of them ending in the gap)
  const routes = new THREE.Group(); routes.visible = false; rf.scene.add(routes);
  for (let i = 0; i < 12; i++) { const pts = [], off = (i - 5.5) * 0.9, w = 0.6 + (i % 4) * 0.35, ph = i * 1.7;
    for (let s = 2; s <= TAKEOFF + 5.2; s += 1.5) { const R = runnerAt(s, { catchIt: true }), past = s > TAKEOFF; pts.push(V(past ? off * 0.4 : off + Math.sin(s * 0.09 * w + ph) * 2.2, R.y + 0.2 - (past ? (s - TAKEOFF) * 1.6 : 0), R.z)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.38, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 12, 0.85, 0.6), fog: false })); routes.add(m); }
  const routeX = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: labelTexture("✕", { w: 256, h: 256, px: 230, color: "#ff2a3a" }), transparent: true, depthWrite: false, fog: false })); routeX.rotation.x = -Math.PI / 2; routeX.position.set(0, y4 + 0.4, (e4 + a5) / 2); routes.add(routeX);

  const seat = (rig, lt, p = {}) => { rig.root.position.set(0, 0, -0.45); rig.root.rotation.set(0, Math.PI, 0); pose(rig, "sit", lt, p); };
  const loopTag = (n, t0, t1, color = "#ffd23d", px = 120) => ({ text: `LOOP ${n}`, t: t0, until: t1, color, y: 300, px });
  const face = (cam, rig, d = V(0.16, 0.0, -1.2), fov = 48) => { const h = rig.J.head.getWorldPosition(V(0, 0, 0)); aim(cam, h.clone().add(d), V(h.x, h.y - 0.06, h.z), fov); };

  // ---- the hook: a montage of falls, faster and faster, the loop counter racing up to 47
  const hk = shot("hook"), t47 = Math.max(1.2, wordT("h01", /^forty|^47/i) - hk.t0), cuts = [];
  { let c = 0, i = 0; const U = [0.55, 1.25, 0.2, 0.95, 1.6, 0.4, 1.1, 0.7, 1.45, 0.3, 1.0, 1.3, 0.6, 1.5];
    while (c < t47 - 0.05) { const len = Math.max(0.12, lerp(0.55, 0.12, Math.pow(c / t47, 0.7))); cuts.push({ t0: c, len, ang: [0, 2, 1, 3, 4][i % 5], u0: U[i % U.length] }); c += len; i++; } }
  function fallCam(cam, ang, x, p) {   // five ways to watch the same fall
    const y = p.y, z = p.z;
    if (ang === 0) aim(cam, V(x + 5.2, y + 0.6, z + 0.2), V(x, y - 0.3, z - 0.6), 50);   // side on, the drop below
    else if (ang === 1) aim(cam, V(x + 1.2, y - 4.5, z - 1.6), V(x, y, z), 60);   // from the gap, looking up
    else if (ang === 2) aim(cam, V(x + 0.7, y5 + 0.9, a5 - 1.4), V(x, y + 0.1, z + 0.6), 52);   // from the far ledge, he comes up short
    else if (ang === 3) aim(cam, V(x + 1.3, Math.max(y, y4) + 1.6, z + 4.0), V(x, y - 1.2, z - 4), 54);   // behind him
    else aim(cam, V(x + 0.4, y5 + 2.6, a5 - 0.4), V(x, y - 1.5, z + 0.4), 56);   // from above, down the wall
  }

  const S = {
    "hook"(lt, s, t) {
      if (lt < t47) {
        const ci = cuts.findIndex((c) => lt >= c.t0 && lt < c.t0 + c.len), c = cuts[Math.max(0, ci)], u = c.u0 + (lt - c.t0) * 0.7, into = lt - c.t0;
        const p = miss(J, 0, u, 30 + lt); M.root.visible = false; rf.update(30 + lt, { lightning: (ci % 3 === 0 ? flashAt(into, [0.05]) : 0), center: J.root.position });
        fallCam(rf.camera, c.ang, 0, p); shake(rf.camera, 0.02, lt);
        const n = Math.min(46, Math.floor(1 + 46 * Math.pow(lt / t47, 1.35)));
        return { set: rf, fx: { vignette: 0.7, rewind: into < 0.07 && ci > 0 ? 0.9 : 0, rewindText: "", chroma: into < 0.06 && ci > 0 ? 0.8 : 0 }, state: { slams: [loopTag(n, at("hook", 0), at("hook", t47), "#ffffff", 120)] } };
      }
      // 47: from the top of the wall, watching him fall away toward the city
      const u = SLIP + 0.1 + (lt - t47) * 0.55, p = miss(J, 0, u, 30 + lt); M.root.visible = false; rf.update(30 + lt, { lightning: flashAt(lt, [t47 + 0.04]), center: V(0, y5, a5) });
      aim(rf.camera, V(0.7, y5 + 1.4, a5 + 2.2), V(0, p.y - 1.5, a5 + 0.5), 58); shake(rf.camera, lt - t47 < 0.3 ? 0.05 : 0.008, lt);
      return { set: rf, fx: { vignette: 0.75, red: 0.06, flash: clamp(1 - (lt - t47) / 0.2) * 0.35 }, state: { slams: [loopTag(47, at("hook", t47), at("hook", s.dur), "#ff3a4a", 170)] } };
    },
    "fail"(lt, s, t) {   // the game on his monitor: he misses... the clock rewinds to 9:00... nobody else remembers
      const mT = wordT("n01", /^misses/i) - s.t0, cT = wordT("n01", /^clock/i) - s.t0 - 0.15, nT = wordT("n01", /^9/i) - s.t0 - 0.4, wT = nT + 1.1;
      if (lt < cT) { gameChase(40 + lt, lt - mT - 0.1); seat(bed.jay, lt, { lean: 0.45, click: lt * 5, fear: lt > mT + 1.2 ? 0.4 : 0 }); bed.update(lt, { screenTex: gameRT.texture, lampOn: 0.5, led: 1 }); clock.set("9:47");
        const k = ease(clamp(lt / cT)); place(bed.camera, V(0.78, 1.62, -0.12), V(0.58, 1.55, -0.48), k, V(0, 1.2, -1.8), V(0, 1.2, -1.8), 44); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.6 } }; }
      if (lt < wT) {   // the clock: 9:47 ... rewinds ... 9:00
        const r = clamp((lt - nT) / 0.45), mins = r <= 0 ? 47 : Math.max(0, Math.round(47 * (1 - r))); clock.set(`9:${String(mins).padStart(2, "0")}`);
        seat(bed.jay, lt, { lean: 0.3 }); bed.update(lt, { screenTex: again.tex, lampOn: 0.5, led: 1, screenBright: 0.7 }); again.draw(false);
        bed.jay.root.visible = false; const k = ease(clamp((lt - cT) / (wT - cT))); place(bed.camera, V(0.3, 0.97, -0.82), V(0.38, 0.94, -0.98), k, V(0.66, 0.84, -1.55), V(0.66, 0.84, -1.55), 42);
        return { set: bed, fx: { vignette: 0.6, rewind: r > 0 && r < 1 ? 1 : 0, rewindText: "", chroma: r > 0 && r < 1 ? 0.5 : 0, flash: r >= 1 ? clamp(1 - (lt - nT - 0.45) / 0.25) * 0.3 : 0 } };
      }
      // nobody else remembers: the room, exactly as it was at nine
      clock.set("9:00"); seat(bed.jay, lt, { lean: 0.2, yaw: 0.35, pitch: 0.1, fear: 0.2 }); again.draw(true); bed.update(lt, { screenTex: again.tex, lampOn: 0.6, led: 1 });
      const k = ease(clamp((lt - wT) / (s.dur - wT))); place(bed.camera, V(-1.5, 1.85, 1.6), V(-1.15, 1.7, 1.15), k, V(0.2, 0.95, -1.2), V(0.2, 1.0, -1.3), 44); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.6 } };
    },
    "loop1"(lt, s, t) {   // loop one: a glitch. A shrug, a little laugh.
      gameChase(lt, -1.2 + lt * 0.3); clock.set("9:00"); seat(bed.jay, lt, { lean: 0.25, smile: lt > 0.6 ? 0.45 : 0, tilt: lt > 0.6 ? 0.15 : 0, pitch: 0.02 }); bed.update(lt, { screenTex: gameRT.texture, lampOn: 0.6, led: 1 });
      const h = bed.jay.J.head.getWorldPosition(V(0, 0, 0)), k = ease(clamp(lt / s.dur)); place(bed.camera, V(0.22, 1.06, -1.68), V(0.16, 1.07, -1.58), k, V(h.x, h.y - 0.08, h.z), V(h.x, h.y - 0.06, h.z), 50); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.55, chroma: lt < 0.12 ? 0.5 : 0 }, state: { slams: [loopTag(1, at("loop1", 0.05), at("loop1", s.dur))] } };
    },
    "loop12"(lt, s, t) {   // loop twelve: every route on the map, every one ends in the gap
      routes.visible = true; rf.scene.fog.density = 0.0035; J.root.visible = false; M.root.visible = false; const k = clamp(lt / (s.dur * 0.8));
      routes.children.forEach((m, i) => { if (m === routeX) return; const idx = m.geometry.index.count, q = clamp(k * 1.6 - i * 0.05); m.geometry.setDrawRange(0, Math.floor(idx * q / 6) * 6); });
      routeX.visible = k > 0.55; routeX.scale.setScalar(routeX.visible ? 1 + 0.12 * Math.sin(t * 9) : 1);
      rf.update(50 + lt, { lightning: flashAt(lt, [s.dur * 0.62]), center: V(0, 0, -50) });
      const c = ease(clamp(lt / s.dur)); place(rf.camera, V(0, 28, 18), V(0, 22, 4), c, V(0, -2, -70), V(0, -2, -84), 56);
      return { set: rf, fx: { vignette: 0.6 }, state: { slams: [loopTag(12, at("loop12", 0.05), at("loop12", s.dur))] } };
    },
    "loop30"(lt, s, t) {   // loop thirty: he switches it off and walks away... it turns itself back on
      const off = wordT("n04", /^stop/i) - s.t0 + 0.1, on = wordT("n04", /^turned/i) - s.t0 - 0.15, e1 = s.L("e01") - 0.2; clock.set("9:00");
      if (lt < off + 0.4) { seat(bed.jay, lt, { lean: 0.2 }); const r = clamp((lt - off + 0.5) / 0.4); bed.jay.J.shoulder1.rotation.x = lerp(-0.95, -1.5, r); bed.jay.J.elbow1.rotation.x = lerp(-0.75, -0.2, r);
        const dark = lt > off; if (!dark) gameChase(90 + lt, -1.6 + lt * 0.3); bed.update(lt, { screenTex: dark ? again.tex : gameRT.texture, screenBright: dark ? 0 : 0.9, lampOn: 0, led: 1, room: 0.7 });
        aim(bed.camera, V(1.05, 1.5, -0.35), V(0.05, 1.12, -1.6), 46); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.65 }, state: { slams: [loopTag(30, at("loop30", 0.05), at("loop30", off + 0.4))] } }; }
      if (lt < e1) {   // the dark room; he walks to the door... the screen blinks on behind him; he turns
        const w = clamp((lt - off - 0.4) / (on - off - 0.4)), turn = ease(clamp((lt - on - 0.25) / 0.5)), lit = lt > on, blink = lit && lt < on + 0.35 ? (Math.sin(lt * 60) > 0 ? 1 : 0.1) : lit ? 1 : 0;
        const r = bed.jay.root; r.position.set(lerp(0.35, 1.55, w), 0, lerp(-0.35, -0.95, w)); r.rotation.set(0, lerp(1.97, 4.21, turn), 0);
        pose(bed.jay, turn > 0 ? "stand" : "walk", lt, { phase: lt * 5, fear: turn * 0.85, noBlink: turn > 0 }); again.draw(Math.sin(lt * 5) > 0);
        bed.update(lt, { screenTex: again.tex, screenBright: blink * 1.05, screenRed: true, lampOn: 0, led: 1, room: 0.55 });
        const k = ease(clamp((lt - off - 0.4) / (e1 - off - 0.4))); place(bed.camera, V(-0.75, 1.45, -1.3), V(-0.6, 1.4, -1.15), k, V(1.3, 1.0, -0.8), V(1.4, 1.05, -0.85), 50); hand(bed.camera, 0.004, t);
        return { set: bed, fx: { vignette: 0.7, chroma: lit && lt < on + 0.3 ? 0.5 : 0 } }; }
      // what would you try? the screen, waiting
      bed.jay.root.position.set(1.55, 0, -0.95); bed.jay.root.rotation.set(0, 4.21, 0); pose(bed.jay, "stand", lt, { fear: 0.8, noBlink: true }); again.draw(Math.sin(lt * 5) > 0);
      bed.update(lt, { screenTex: again.tex, screenBright: 1.05, screenRed: true, lampOn: 0, led: 1, room: 0.55 });
      const k = ease(clamp((lt - e1) / (s.dur - e1))); place(bed.camera, V(0.8, 1.42, 0.6), V(0.62, 1.36, 0.25), k, V(0, 1.2, -1.8), V(0, 1.2, -1.8), 46); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.7 } };
    },
    "loop46"(lt, s, t) {   // loop forty-six: someone on the last roof
      const T = 60 + lt, rv = wordT("n05", /^another/i) - s.t0 - 0.1, stop = clamp(lt / 1.6);
      stand(J, 0, lerp(-89, -95.2, ease(stop)), T); if (stop < 1) pose(J, "run", T, { phase: lt * 11 * (1 - stop), fear: 0.4 });
      M.root.visible = true; stand(M, 0.6, -106.5, T, { face: 0.15 }); mayaTag.visible = false; unknownTag.visible = lt > rv;
      rf.update(T, { lightning: flashAt(lt, [rv, rv + 0.25]), center: V(0, y4, -98) });
      if (lt < rv) { const j = J.root.position; aim(rf.camera, V(1.3, j.y + 1.7, j.z + 3.6), V(0, j.y + 0.6, j.z - 8), 52); hand(rf.camera, 0.008, t); }
      else { const k = ease(clamp((lt - rv) / (s.dur - rv))); place(rf.camera, V(0.9, y4 + 1.45, -94.2), V(0.7, y4 + 1.6, -96.6), k, V(0.6, y5 + 1.0, -106.5), V(0.6, y5 + 1.2, -106.5), lerp(40, 13, k)); hand(rf.camera, 0.004, t); }
      return { set: rf, fx: { vignette: 0.7 }, state: { slams: [loopTag(46, at("loop46", 0.05), at("loop46", s.dur))] } };
    },
    "maya"(lt, s, t) {   // it was Maya... and she's been stuck in the same night: her room, her clock, her tally sheet
      const nm = wordT("n06", /^maya/i) - s.t0 - 0.1, rm = wordT("n06", /^she/i) - s.t0 - 0.15, ev = wordT("n06", /^every/i) - s.t0 - 0.3;
      if (lt < rm) { const T = 64 + lt; M.root.visible = true; stand(M, 0.6, -106.5, T, { face: 0.15, smile: lt > nm + 0.3 ? 0.25 : 0 }); stand(J, 0, -95.2, T); mayaTag.visible = lt > nm; unknownTag.visible = !mayaTag.visible;
        rf.update(T, { lightning: flashAt(lt, [nm]), center: V(0, y5, -104) }); const h = M.J.head.getWorldPosition(V(0, 0, 0));
        aim(rf.camera, V(h.x + 0.35, h.y + 0.12, h.z + 1.6), V(h.x, h.y + 0.05, h.z), 40); hand(rf.camera, 0.003, t);
        return { set: rf, fx: { vignette: 0.65, flash: flashAt(lt, [nm]) * 0.15 } }; }
      clock2.set("9:00"); renderGame(() => { stand(J, 0, -95.2, 64 + lt); M.root.visible = true; stand(M, 0.6, -106.5, 64 + lt, { face: 0.15 }); rf.update(64 + lt, { center: V(0, y5, -104) }); aim(gameCam, V(1.2, y5 + 1.7, -110.5), V(0, y4 + 0.6, -96)); });
      seat(maya, lt, { lean: 0.3, pitch: 0.05 }); bed2.update(lt, { screenTex: gameRT.texture, lampOn: 0.7, led: 1 });
      if (lt < ev) { const h = maya.J.head.getWorldPosition(V(0, 0, 0)), k = ease(clamp((lt - rm) / (ev - rm))); place(bed2.camera, V(h.x + 0.3, h.y - 0.05, h.z - 1.25), V(h.x + 0.22, h.y - 0.03, h.z - 1.0), k, V(h.x, h.y - 0.06, h.z), V(h.x, h.y - 0.05, h.z), 48); }
      else { const k = ease(clamp((lt - ev) / (s.dur - ev))); place(bed2.camera, V(0.6, 1.7, -0.5), V(1.1, 2.05, -0.75), k, V(0.7, 1.6, -2.1), V(1.2, 2.12, -2.09), 44); }   // up to the tally sheet: 46 nights
      hand(bed2.camera, 0.003, t);
      return { set: bed2, fx: { vignette: 0.6 } };
    },
    "plan"(lt, s, t) {   // one idea left: jump at the exact same time
      const T = 70 + lt, ex = wordT("n07", /^jump/i) - s.t0 - 0.2; M.root.visible = true; mayaTag.visible = true; unknownTag.visible = false;
      stand(J, -0.48, -86, T, { yaw: lt < ex ? -0.5 : 0, smile: 0 }); stand(M, 0.48, -86, T, { yaw: lt < ex ? 0.5 : 0, smile: lt < ex ? 0.2 : 0 });
      rf.update(T, { lightning: flashAt(lt, [ex + 0.1]), center: V(0, y4, -88) });
      if (lt < ex) { const k = ease(clamp(lt / ex)); place(rf.camera, V(0, y4 + 1.2, -90.4), V(0, y4 + 1.25, -89.6), k, V(0, y4 + 1.05, -86), V(0, y4 + 1.1, -86), 46); }   // their faces: a nod
      else { const k = ease(clamp((lt - ex) / (s.dur - ex))); place(rf.camera, V(0.3, y4 + 2.6, -81.4), V(0.2, y4 + 2.4, -82.4), k, V(0, y4 - 0.6, -100), V(0, y4 - 0.2, -104), 50); }   // behind them: the gap, the finish
      hand(rf.camera, 0.004, t);
      return { set: rf, fx: { vignette: 0.65 }, state: { slams: [loopTag(47, at("plan", 0.05), at("plan", s.dur), "#ff3a4a")] } };
    },
    "jump"(lt, s, t) {   // three, two, one... they run, they leap together, and time stops in mid-air
      const w3 = wordT("n08", /^three/i) - s.t0, w2 = wordT("n08", /^two/i) - s.t0, w1 = wordT("n08", /^one/i) - s.t0, go = w1 + 0.25, start = go - (TAKEOFF - (12 + 86)) / SPEED;
      const FZ = go + 0.95, frozen = lt >= FZ, tt = Math.min(lt, FZ), T = 80 + tt; M.root.visible = true; mayaTag.visible = true; unknownTag.visible = false;
      const sAt = (u) => u < go ? 98 + Math.max(0, u - start) * SPEED : TAKEOFF + (u - go) * SPEED * 0.42;   // slow motion once they leave the edge
      if (tt < start) { stand(J, -0.5, -86, T, { crouch: 0.5 }); stand(M, 0.5, -86, T, { crouch: 0.5 }); } else { run(J, -0.5, sAt(tt), T, 0.3); run(M, 0.5, sAt(tt) + 0.15, T, 0.3); }
      rf.update(T, { lightning: flashAt(tt, [go]), center: J.root.position });
      const slams = [["3", w3], ["2", w2], ["1", w1]].map(([x, wt], i, a) => ({ text: x, t: at("jump", wt), until: at("jump", i < 2 ? a[i + 1][1] : go), color: i === 2 ? "#ff3a4a" : "#ffffff", y: 760, px: 300 }));
      const c = V((J.root.position.x + M.root.position.x) / 2, J.root.position.y + 0.6, J.root.position.z);
      if (tt < go) { const j = J.root.position; aim(rf.camera, V(0.15, Math.max(j.y, y4) + 1.35, j.z + 3.8), V(0, y4 + 0.4, j.z - 8), 54); shake(rf.camera, tt > start ? 0.012 : 0.004, lt); }
      else if (!frozen) { aim(rf.camera, V(c.x + 4.8, c.y + 0.2, c.z + 1.6), c, 50); }   // side on: the leap
      else { const a = 1.25 - (lt - FZ) * 0.12, r = 5.0; aim(rf.camera, V(c.x + Math.sin(a) * r, c.y + 0.25 + Math.sin((lt - FZ) * 0.3) * 0.4, c.z + Math.cos(a) * r), c, 50); }   // bullet time: around them, frozen
      const fl = frozen ? clamp(1 - (lt - FZ) / 0.25) : 0;
      return { set: rf, fx: { vignette: 0.7, gray: frozen ? 0.35 : 0, flash: fl * 0.3, chroma: frozen && lt - FZ < 0.15 ? 0.7 : 0 },
        state: frozen ? { slams: [{ text: Math.sin(lt * 7) > 0.6 ? "LOOP 48?" : "LOOP 47", t: at("jump", FZ), until: at("jump", s.L("n09") - 0.3), color: "#ff3a4a", y: 300, px: 120 }], ...(lt > s.L("n09") + 0.1 ? { cta: ctaTimes() } : {}) } : { slams } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n09"), b = line("n10"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { freeText: "TONS OF FREE GAMES", t17: a.t, tFree: wt(a, /^tons|free/i), genres: [/racing/i, /heists/i, /horror/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: tl.duration + 10 });
  }
  const route = (sh, lt, t) => {
    J.root.visible = true; M.root.visible = true; routes.visible = false; rf.scene.fog.density = 0.012; bed.jay.root.visible = true; mayaTag.visible = true; unknownTag.visible = false; J.root.rotation.set(0, Math.PI, 0);
    bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI, 0);
    return (S[sh.id] || S["fail"])(lt, sh, t);
  };
  route.sets = { rf, bed, bed2 };
  return route;
}
