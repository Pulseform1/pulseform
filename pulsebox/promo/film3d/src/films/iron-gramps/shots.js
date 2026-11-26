// Iron Gramps: every shot. Every night at nine, a player called IronGramps beats Jay at Hyperlane by inches. Jay
// practices; IronGramps sends weirdly nice messages; one night someone cheers downstairs. It's Grandpa. They race together.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createHyperlane } from "../../sets/hyperlane.js";
import { createLivingroom } from "../../sets/livingroom.js";
import { createCta } from "../../sets/cta.js";
import { pose } from "../../jay.js";
import { labelTexture } from "../../textures.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function place(cam, from, to, k, look, lookTo = look, fov = null) { cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k)); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function hand(cam, amt, t) { cam.position.x += Math.sin(t * 1.7) * amt + Math.sin(t * 4.3) * amt * 0.4; cam.position.y += Math.cos(t * 1.3) * amt; cam.rotation.z += Math.sin(t * 1.1) * amt * 0.5; }

export function makeShots(renderer, tl) {
  const hl = createHyperlane(), bed = createBedroom({ headset: true, lamp: true }), room = createLivingroom(), cta = createCta();
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt, wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  bed.phone.visible = false; hl.key.visible = false;
  // IronGramps' car is silver; name tags over both cars; a checkered finish banner
  hl.rival.traverse((o) => { if (o.isMesh && o.material.isMeshPhysicalMaterial) { o.material = o.material.clone(); o.material.color.set(0xc9ced8); o.material.metalness = 0.85; o.material.roughness = 0.22; } });
  const tag = (text, col) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, { w: 1024, h: 200, px: 120, color: col }), transparent: true, depthWrite: false })); s.scale.set(3.2, 0.62, 1); s.position.y = 1.9; return s; };
  hl.jayCar.add(tag("JAY", "#ff9a5a")); hl.rival.add(tag("IRONGRAMPS", "#e6ecff"));
  const finish = new THREE.Group(); hl.scene.add(finish);
  { const c = document.createElement("canvas"); c.width = 512; c.height = 64; const g = c.getContext("2d"); for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#111" : "#f4f4f4"; g.fillRect(i * 16, j * 16, 16, 16); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const banner = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide })); banner.position.y = 4.6; finish.add(banner);
    const line0 = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.6), new THREE.MeshBasicMaterial({ map: tx })); line0.rotation.x = -Math.PI / 2; line0.position.y = 0.03; finish.add(line0);
    for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 12), new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.6 })); post.position.set(4.6 * s, 2.6, 0); finish.add(post); } }
  // the race, live, for the monitor and the laptop
  const raceRT = new THREE.WebGLRenderTarget(960, 600, { samples: 0 }); raceRT.texture.colorSpace = THREE.SRGBColorSpace;
  const raceCam = new THREE.PerspectiveCamera(60, 960 / 600, 0.1, 900);
  // race(t, { dist, jz, rz, finishAt }): the cars a little apart on the road; jz/rz how far each is ahead (-z is ahead)
  function race(t, { dist, jz = 0, rz = 0, jx = -1.5, rx = 1.5, finishAt = null }) {
    hl.update(t, { dist, rainSpeed: 1 }); hl.jayCar.position.set(jx + Math.sin(t * 1.3) * 0.15, 0.55 + Math.sin(t * 3) * 0.04, jz); hl.rival.position.set(rx + Math.sin(t * 1.1 + 1) * 0.12, 0.55 + Math.sin(t * 3.4) * 0.04, rz);
    hl.jayCar.rotation.set(0, Math.sin(t * 1.3) * 0.04, Math.sin(t * 1.3) * 0.05); hl.rival.rotation.set(0, Math.sin(t * 1.1 + 1) * 0.04, Math.sin(t * 1.1 + 1) * 0.05);
    hl.jayCar.setBoost?.(0.6, t); hl.rival.setBoost?.(0.6, t);
    finish.visible = finishAt !== null; if (finishAt !== null) finish.position.set(0, 0, finishAt + dist);
  }
  function renderRace(t, opt) { race(t, opt); const old = renderer.getRenderTarget(), ex = renderer.toneMappingExposure; raceCam.position.set(0, 3.2, 9); raceCam.lookAt(0, 0.5, -12); renderer.setRenderTarget(raceRT); renderer.toneMappingExposure = 1; renderer.render(hl.scene, raceCam); renderer.setRenderTarget(old); renderer.toneMappingExposure = ex; }
  const seat = (lt, p = {}) => { bed.jay.root.position.set(0, 0, -0.45); bed.jay.root.rotation.set(0, Math.PI, 0); pose(bed.jay, "sit", lt, p); };
  const G = room.gramps, Jr = room.jay;
  const grampsSit = (lt, p = {}) => { G.root.position.set(1.4, 0.02, -1.35); G.root.rotation.set(0, -0.45 + Math.PI, 0); G.root.rotation.y = Math.PI - 0.45 - Math.PI; pose(G, "sit", lt, p); };
  const dance = (rig, lt, k) => { const j = rig.J, b = Math.sin(lt * 9); j.shoulder1.rotation.x = -2.5 + b * 0.35; j["shoulder-1"].rotation.x = -2.5 - b * 0.35; j.elbow1.rotation.x = -0.6; j["elbow-1"].rotation.x = -0.6; j.spine.rotation.z = Math.sin(lt * 4.5) * 0.12 * k; j.head.rotation.z = Math.sin(lt * 4.5 + 1) * 0.15 * k; j.hips.position.y += Math.abs(b) * 0.03 * k; };
  const wins = (text, when, until, color = "#e6ecff", y = 560, px = 110) => ({ text, t: when, until, color, y, px });
  const flipSigns = (on) => hl.gates.forEach((g) => g.children.forEach((c) => { if (c.isMesh && c.geometry.type === "PlaneGeometry" && c.material.map) c.scale.x = on ? -1 : 1; }));   // the gate signs read right when we look back down the road

  const S = {
    "hook"(lt, s, t) {   // 9:00 PM: the finish line, the silver car takes it by inches (slow motion)
      const cross = s.dur * 0.62, slow = (u) => u < cross - 0.5 ? u * 55 : (cross - 0.5) * 55 + (u - cross + 0.5) * 9, dist = slow(lt);
      race(t, { dist, jz: 0.0, rz: -0.55, finishAt: -((cross - 0.5) * 55 + 0.5 * 9) }); flipSigns(true);
      const k = ease(clamp(lt / s.dur)); aim(hl.camera, V(lerp(0.6, 0.3, k), lerp(1.7, 1.45, k), lerp(-10.5, -9.0, k)), V(0, 0.75, -1.3), 36); hand(hl.camera, 0.006, t);   // on the road past the line, looking back at them
      return { set: hl, fx: { vignette: 0.6, flash: lt > cross && lt < cross + 0.06 ? 0.25 : 0 }, state: { slams: [wins("9:00 PM", at("hook", 0.15), at("hook", cross), "#ffffff", 300, 90), wins("IRONGRAMPS WINS", at("hook", cross), at("hook", s.dur), "#e6ecff", 560, 100)] } };
    },
    "desk"(lt, s, t) {   // Jay at his desk, beaten again; the leaderboard
      renderRace(t, { dist: t * 50, jz: 0.2, rz: -0.4 }); seat(lt, { lean: 0.1, pitch: 0.15 }); bed.jay.J.spine.rotation.x -= 0.15; bed.update(lt, { screenTex: raceRT.texture, lampOn: 0.8, led: 1 });
      const k = ease(clamp(lt / s.dur)); place(bed.camera, V(0.95, 1.35, -1.2), V(0.75, 1.32, -1.05), k, V(0, 1.2, -0.55), V(0, 1.2, -0.55), 46); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.6 }, state: { board: { t: at("desk", 0.4), title: "HYPERLANE · TONIGHT", y: 300, rows: [["#1", "IRONGRAMPS", "1:58.32", true], ["#2", "JAY", "1:58.35", false], ["#3", "MAYA_K", "2:03.10", false]] } } };
    },
    "practice"(lt, s, t) {   // after school, every day (sunlight, his car alone through the gates)... and every night at nine, by inches
      const n3 = s.L("n03") - 0.15, e1 = s.L("e01") - 0.2;
      if (lt < n3) { const seg = Math.floor(lt / 1.25) % 2;
        if (seg === 0) { renderRace(t, { dist: t * 55, jz: 0, rz: 40 }); seat(lt, { lean: 0.35, click: lt * 4 }); bed.update(lt, { screenTex: raceRT.texture, dawn: 0.85, lampOn: 0, led: 1 });
          aim(bed.camera, V(1.1, 1.55, 0.9), V(0, 1.1, -1.3), 48); hand(bed.camera, 0.004, t); return { set: bed, fx: { vignette: 0.5 } }; }
        race(t, { dist: t * 60, jz: 0, rz: 40, jx: Math.sin(t * 1.6) * 2.2 }); aim(hl.camera, V(hl.jayCar.position.x * 0.6, 2.4, 6.5), V(hl.jayCar.position.x, 0.6, -6), 52); hand(hl.camera, 0.01, t);
        return { set: hl, fx: { vignette: 0.55 } }; }
      if (lt < e1) {   // 9:00 PM, the photo finish: by inches
        const u = lt - n3, d = e1 - n3, cross = d * 0.55, dist = u < cross ? u * 50 : cross * 50 + (u - cross) * 4;
        race(t, { dist, jz: 0, rz: -0.25, finishAt: -cross * 50 }); aim(hl.camera, V(0.4, 13, 0.2), V(0, 0, -1.0), 34);
        return { set: hl, fx: { vignette: 0.55, gray: u > cross ? 0.35 : 0, flash: u > cross && u < cross + 0.06 ? 0.2 : 0 }, state: { slams: [wins("9:00 PM", at("practice", n3 + 0.05), at("practice", n3 + cross), "#ffffff", 300, 90), wins("BY 0.02 SECONDS", at("practice", n3 + cross), at("practice", e1), "#ffd23d", 560, 100)] } }; }
      // "Who do you think IronGramps is?": his face in the monitor light
      renderRace(t, { dist: t * 50, jz: 0, rz: -0.5 }); seat(lt, { lean: 0.3, pitch: 0.05, fear: 0.25 }); bed.update(lt, { screenTex: raceRT.texture, lampOn: 0.6, led: 1 });
      const h = bed.jay.J.head.getWorldPosition(V(0, 0, 0)), k = ease(clamp((lt - e1) / (s.dur - e1))); place(bed.camera, V(0.16, 1.05, -1.7), V(0.12, 1.07, -1.58), k, V(h.x, h.y - 0.08, h.z), V(h.x, h.y - 0.06, h.z), 50); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.6 } };
    },
    "chat"(lt, s, t) {   // the messages: "nice try kiddo" ... "eat your vegetables" ... "bedtime soon"
      renderRace(t, { dist: t * 50, jz: 0.3, rz: -1.2 }); const n5 = s.L("n05");
      const items = [["nice try kiddo", /^\W*nice/i], ["eat your vegetables", /^\W*eat/i], ["bedtime soon :)", /^\W*bedtime/i]].map(([text, re]) => ({ name: "IRONGRAMPS", text, t: wordT("n05", re) - 0.1, color: "#e6ecff" }));
      seat(lt, { lean: 0.3, pitch: 0.05, fear: lt > n5 + 1.2 ? 0.35 : 0, smile: 0 }); bed.jay.J.head.rotation.z = lt > n5 + 1.5 ? 0.18 : 0; bed.update(lt, { screenTex: raceRT.texture, lampOn: 0.6, led: 1 });
      if (lt < n5 + 0.6) { aim(bed.camera, V(0.05, 1.22, -1.05), V(0, 1.2, -1.8), 46); hand(bed.camera, 0.002, t); }   // the screen
      else { const h = bed.jay.J.head.getWorldPosition(V(0, 0, 0)); aim(bed.camera, V(0.16, 1.05, -1.65), V(h.x, h.y - 0.08, h.z), 50); hand(bed.camera, 0.003, t); }   // his face: what?
      return { set: bed, fx: { vignette: 0.6 }, state: { chat: { items, y: 1080 } } };
    },
    "cheer"(lt, s, t) {   // he loses again... then a cheer from downstairs: headset off, he turns to the door
      const c = s.L("n06") + 1.6;
      if (lt < 1.3) { const dist = lt * 50; race(t, { dist, jz: 0, rz: -0.3, finishAt: -50 }); flipSigns(true); aim(hl.camera, V(0.4, 1.55, -9.8), V(0, 0.75, -1.3), 36); hand(hl.camera, 0.006, t);
        return { set: hl, fx: { vignette: 0.6 }, state: { slams: [wins("IRONGRAMPS WINS", at("cheer", 1.0), at("cheer", 1.3), "#e6ecff", 560, 100)] } }; }
      renderRace(t, { dist: 200, jz: 0, rz: -2 }); const turn = ease(clamp((lt - c) / 0.5));
      seat(lt, { lean: 0.2 * (1 - turn), yaw: -turn * 1.1, pitch: 0, fear: turn * 0.45, noBlink: turn > 0 }); bed.jay.J.headset.visible = !(lt > c + 0.5);
      bed.update(lt, { screenTex: raceRT.texture, lampOn: 0.6, led: 1, doorGap: 0.7 });
      const h = bed.jay.J.head.getWorldPosition(V(0, 0, 0)); if (lt < c + 0.9) aim(bed.camera, V(0.95, 1.3, -1.3), V(h.x, h.y - 0.08, h.z), 46); else aim(bed.camera, V(1.2, 1.25, 0.9), V(2.55, 0.55, -1.3), 46);   // his face; then what he's looking at: the door, light under it
      hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.6 } };
    },
    "stairs"(lt, s, t) {   // down the last few stairs, to the light in the doorway
      room.update(t, { screen: raceRT.texture }); renderRace(t, { dist: t * 50, jz: 0, rz: -1 }); grampsSit(lt, { lean: 0.3 }); const k = clamp(lt / s.dur);
      Jr.root.position.set(-4.6, Math.max(0, lerp(0.75, 0, clamp(k * 1.6))), lerp(-1.9, 0.1, ease(k))); Jr.root.rotation.set(0, lerp(0, Math.PI / 2 - 0.2, clamp((k - 0.55) / 0.3)), 0); pose(Jr, "walk", lt, { phase: lt * 3.2 }); Jr.J.spine.rotation.x += 0.2; Jr.J.hips.position.y -= 0.1;
      aim(room.camera, V(-4.9, 2.1, lerp(-3.0, -1.6, k)), V(-3.6, 0.9, 0.2), 52); hand(room.camera, 0.004, t);
      return { set: room, fx: { vignette: 0.6 } };
    },
    "reveal"(lt, s, t) {   // over his shoulder: Grandpa, headset on, laptop glowing... a victory dance. Jay's face.
      room.update(t, { screen: raceRT.texture }); renderRace(t, { dist: 300 + t * 20, jz: 2, rz: -2 }); const n9 = s.L("n09") - 0.2;
      grampsSit(lt, { lean: 0.15, smile: 0.6 }); dance(G, lt, 1); Jr.root.position.set(-3.05, 0, 0.15); Jr.root.rotation.set(0, Math.PI / 2 - 0.25, 0); pose(Jr, "stand", lt, { fear: 0.7, noBlink: true }); Jr.J.spine.rotation.z = -0.12;
      if (lt < n9) { const k = ease(clamp(lt / n9)); place(room.camera, V(-4.0, 2.15, 1.25), V(-3.7, 2.05, 1.05), k, V(1.3, 1.0, -1.35), V(1.35, 1.1, -1.35), 40); }
      else if (lt < n9 + (s.dur - n9) * 0.6) { const h = G.J.head.getWorldPosition(V(0, 0, 0)); aim(room.camera, V(h.x - 1.0, h.y + 0.1, h.z + 1.4), V(h.x, h.y - 0.25, h.z), 46); }   // Grandpa, dancing
      else { const h = Jr.J.head.getWorldPosition(V(0, 0, 0)); aim(room.camera, V(h.x + 1.1, h.y + 0.02, h.z + 0.5), V(h.x, h.y - 0.05, h.z), 42); }   // Jay: no way
      hand(room.camera, 0.004, t);
      return { set: room, fx: { vignette: 0.55 }, state: { slams: lt > n9 ? [wins("71 YEARS OLD", at("reveal", n9 + 0.1), at("reveal", n9 + 1.4), "#ffd23d", 420, 100)] : [] } };
    },
    "why"(lt, s, t) {   // he sees Jay, takes the headset off, smiles; the notebook of notes
      room.update(t, { screen: raceRT.texture }); renderRace(t, { dist: 400, jz: 2, rz: -2 }); const off = 0.6;
      grampsSit(lt, { lean: 0.05, smile: 0.7, yaw: -0.35 }); G.J.headset.visible = lt < off; Jr.root.position.set(-1.6, 0, 0.2); Jr.root.rotation.set(0, Math.PI / 2 + 0.3, 0); pose(Jr, "stand", lt, { smile: lt > s.dur * 0.5 ? 0.4 : 0 });
      const mid = s.dur * 0.5;
      if (lt < mid) { const h = G.J.head.getWorldPosition(V(0, 0, 0)); aim(room.camera, V(h.x - 0.85, h.y + 0.05, h.z + 1.05), V(h.x, h.y - 0.05, h.z), 40); }
      else { const nb = room.tray.localToWorld(V(0.24, 0.69, 0.16)); aim(room.camera, nb.clone().add(V(-0.15, 0.42, 0.25)), nb, 40); }   // "HYPERLANE NOTES ... the kid brakes too early"
      hand(room.camera, 0.003, t);
      return { set: room, fx: { vignette: 0.55 } };
    },
    "race2"(lt, s, t) {   // that night, side by side: the race... Jay by a nose. Grandpa winks.
      const r1 = s.dur * 0.45;
      if (lt < r1) { const cross = r1 * 0.7, dist = lt < cross ? lt * 50 : cross * 50 + (lt - cross) * 6; race(t, { dist, jz: -0.35, rz: 0, finishAt: -cross * 50 }); flipSigns(true);
        aim(hl.camera, V(-0.4, 1.55, -9.8), V(0, 0.75, -1.3), 36); hand(hl.camera, 0.006, t);
        return { set: hl, fx: { vignette: 0.55, flash: lt > cross && lt < cross + 0.06 ? 0.25 : 0 }, state: { slams: lt > cross ? [wins("JAY WINS!", at("race2", cross), at("race2", r1), "#ffd23d", 560, 130)] : [] } }; }
      room.update(t, { screen: raceRT.texture, lampOn: 0.8 }); renderRace(t, { dist: 600, jz: -2, rz: 0 });
      G.root.position.set(-0.55, 0.02, -2.25); G.root.rotation.set(0, 0, 0); pose(G, "sit", lt, { smile: 0.7, yaw: -0.3 }); G.J.headset.visible = false;
      Jr.root.position.set(-1.45, 0.02, -2.25); Jr.root.rotation.set(0, 0, 0); pose(Jr, "sit", lt, { smile: 0.6, yaw: 0.25 }); dance(Jr, lt, 0.6);
      const wink = lt > r1 + 1.2 && lt < r1 + 1.9; G.J.eye1.scale.y = wink ? 0.12 : G.J.eye1.scale.y; G.J.pupil1.visible = !wink;
      const k = ease(clamp((lt - r1) / (s.dur - r1))); place(room.camera, V(-1.0, 1.25, 0.6), V(-0.9, 1.2, 0.2), k, V(-1.0, 1.05, -2.2), V(-0.85, 1.1, -2.2), 44); hand(room.camera, 0.003, t);
      return { set: room, fx: { vignette: 0.5 } };
    },
    "cta"(lt, s, t) {   // Pulsebox
      const L = s.L("n12"), pop = clamp((lt - L) / 0.35) * clamp((L + 0.7 - lt) / 0.35);
      cta.update(lt, { spin: lt * 0.32, pop, show78: 0 });
      const k = ease(clamp(lt / s.dur)), a = lerp(0.55, -0.45, k), r = lerp(8.2, 6.6, k);
      aim(cta.camera, V(Math.sin(a) * r, lerp(2.2, 2.7, k), Math.cos(a) * r), V(0, lerp(2.0, 2.4, k), 0), 42);
      return { set: cta, fx: { flash: clamp(1 - lt / 0.3) * 0.4, vignette: 0.45 }, state: { cta: ctaTimes() } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n12"), b = line("n13"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { freeText: "TONS OF FREE GAMES", t17: a.t, tFree: wt(a, /^tons|free/i), genres: [/racing/i, /horror/i, /heists/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: tl.duration + 10 });
  }
  const route = (sh, lt, t) => {
    bed.jay.J.headset.visible = true; G.J.headset.visible = true; G.J.pupil1.visible = true; finish.visible = false; flipSigns(false);
    return (S[sh.id] || S["desk"])(lt, sh, t);
  };
  route.sets = { hl, bed, room, cta };
  return route;
}
