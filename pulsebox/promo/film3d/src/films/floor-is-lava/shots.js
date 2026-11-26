// The Floor Is Lava: every shot. A hundred players, a floor that drops away tile by tile, and two best friends with a
// deal: stick together. At the end there's one platform left with room for one. Maya has never won a round. Jay steps
// back into the lava... and unlocks an achievement almost nobody has: TRUE FRIEND.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createLava } from "../../sets/lava.js";
import { createCta } from "../../sets/cta.js";
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
function screenTex(draw) { const c = document.createElement("canvas"); c.width = 1024; c.height = 640; draw(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const NAMES = ["noodle_83", "xX_REX_Xx", "potatoKing", "lil_bean", "sk8r_moe", "ZoomZoom", "toast99", "MrWaffles", "pixel_pip", "jellyfish", "N1nja_Nate", "cocoBear"];

export function makeShots(renderer, tl) {
  const RES = [4, 5];   // Jay and Maya's tile (one in from the middle)
  const lv = createLava({ reserved: [RES, [4, 6], [3, 6], [5, 6], [3, 5]] }), bed = createBedroom({ headset: true, lamp: true }), bed2 = createBedroom({ headset: true, lamp: true }), cta = createCta();
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt, wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  bed.phone.visible = false; bed2.phone.visible = false;
  bed2.jay.root.visible = false; const maya2 = makeJay({ variant: "maya", headset: true }); maya2.root.scale.setScalar(0.78); bed2.scene.add(maya2.root);
  bed2.scene.traverse((o) => { if (o.isMesh && o.material?.color?.getHex?.() === 0x2b2446) { o.material = o.material.clone(); o.material.color.set(0x23394a); } });
  const J = lv.jay, M = lv.maya;
  const tag = (text, col) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, { w: 1024, h: 200, px: 130, color: col }), transparent: true, depthWrite: false, fog: false })); s.scale.set(1.3, 0.25, 1); s.position.y = 2.2; return s; };
  const jTag = tag("JAY", "#ff9a5a"), mTag = tag("MAYA", "#c9a2ff"); J.root.add(jTag); M.root.add(mTag);
  // ---- the game clock: their tile goes last; they hop onto the last platform just before it does
  const HOP = lv.lastDrop() + 0.5, RESDROP = HOP + 0.8; lv.setDrop(RES[0], RES[1], RESDROP);
  const [tx, tz] = lv.tileXZ(RES[0], RES[1]), JX0 = tx - 0.42, MX0 = tx + 0.42, JX1 = -0.42, MX1 = 0.42;
  const G10 = (() => { let g = 20; while (lv.alive(g) > 10 && g < 60) g += 0.02; return g; })(), G2 = lv.lastDrop() + 0.01;
  // where Jay and Maya are at G (before the end): idle on their tile, then the hop to the middle
  function pair(G, T, { fear = 0.2, faceEach = false, jp = {}, mp = {} } = {}) {
    const k = clamp((G - HOP) / 0.55), ty = lv.tileTop(RES[0], RES[1], G), y = k > 0 ? Math.sin(k * Math.PI) * 0.9 + lerp(ty, 0, k) : ty;
    J.root.position.set(lerp(JX0, JX1, ease(k)), y, 0); M.root.position.set(lerp(MX0, MX1, ease(k)), y, 0);
    J.root.rotation.set(0, faceEach ? Math.PI / 2 : 0, 0); M.root.rotation.set(0, faceEach ? -Math.PI / 2 : 0, 0);
    if (k > 0 && k < 1) { pose(J, "jump", T, { k: Math.sin(k * Math.PI) }); pose(M, "jump", T, { k: Math.sin(k * Math.PI) }); }
    else { pose(J, "stand", T, { fear, ...jp }); pose(M, "stand", T, { fear, ...mp }); }
  }
  // ---- the game on the monitors
  const gameRT = new THREE.WebGLRenderTarget(960, 600, { samples: 0 }); gameRT.texture.colorSpace = THREE.SRGBColorSpace;
  const gameCam = new THREE.PerspectiveCamera(50, 960 / 600, 0.05, 600);
  function renderGame(G, t, cam, opt = {}) { lv.update(G, { t, ...opt }); pair(G, t, opt.faceEach ? { faceEach: true } : {}); aim(gameCam, ...cam); const old = renderer.getRenderTarget(), ex = renderer.toneMappingExposure; renderer.setRenderTarget(gameRT); renderer.toneMappingExposure = 1; renderer.render(lv.scene, gameCam); renderer.setRenderTarget(old); renderer.toneMappingExposure = ex; }
  const banner = (text, sub, col) => screenTex((g) => { const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, "#14060a"); gr.addColorStop(1, "#050205"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 640);
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.font = "400 150px 'Luckiest Guy', sans-serif"; g.lineWidth = 18; g.strokeStyle = "#0b0d1a"; g.strokeText(text, 512, 280); g.fillStyle = col; g.fillText(text, 512, 280);
    g.font = "700 52px 'Chakra Petch', sans-serif"; g.fillStyle = "#ffffff"; g.fillText(sub, 512, 440); });
  const outTex = banner("ELIMINATED", "MAYA WINS THE ROUND", "#ff4a3a"), winTex = banner("YOU WIN!", "FIRST WIN EVER", "#ffd23d");
  const seat = (rig, lt, p = {}) => { rig.root.position.set(0, 0, -0.45); rig.root.rotation.set(0, Math.PI, 0); pose(rig, "sit", lt, p); };
  const slam = (text, t0, t1, color = "#ffffff", y = 300, px = 120) => ({ text, t: t0, until: t1, color, y, px });
  const headOf = (rig) => rig.J.head.getWorldPosition(V(0, 0, 0));
  // the fall: Jay steps back off the edge and falls in slow motion; where he is u seconds after he leaves the edge
  const FALLSLOW = 0.45;
  function jayFall(u, T) {
    J.root.rotation.set(0, Math.PI / 2, 0);
    if (u < 0) { const st = clamp((u + 0.9) / 0.9); J.root.position.set(lerp(JX1, -0.9, ease(st)), 0, 0); pose(J, st > 0 && st < 1 ? "walk" : "stand", T, { phase: -st * 6, smile: 0.35 }); return; }
    const f = u * FALLSLOW; J.root.position.set(-0.9 - f * 0.9, -4.9 * f * f, 0); J.root.rotateOnWorldAxis(V(0, 0, 1), Math.min(1.3, f * 1.6));
    pose(J, "stand", T, { smile: 0.4 }); for (const s of [-1, 1]) { J.J["shoulder" + s].rotation.z = 1.25 * s; J.J["shoulder" + s].rotation.x = -0.3; J.J["hip" + s].rotation.x = -0.3; J.J["knee" + s].rotation.x = 0.4; }
  }
  const SPLASH_U = Math.sqrt(2 * 6.4 / 9.8) / FALLSLOW;   // seconds after he leaves the edge that he reaches the lava

  // ---- hook timings
  const hk = shot("hook"), wFloor = wordT("h01", /^floor/i) - hk.t0 - 0.15, wAnd = wordT("h01", /^and/i) - hk.t0 - 0.1;
  const S = {
    "hook"(lt, s, t) {   // a hundred players... the floor is lava (the outer rings go)... only one of these best friends can win
      if (lt < wFloor) { const G = 1 + lt; lv.update(G, { t }); pair(G, t); const k = ease(clamp(lt / wFloor));
        place(lv.camera, V(15, 21, 23), V(11, 13, 17), k, V(0, 0, 0), V(-0.5, 0, 0), 52); hand(lv.camera, 0.03, t);
        return { set: lv, fx: { vignette: 0.6 }, state: { slams: [slam("100 PLAYERS", at("hook", 0.05), at("hook", wFloor), "#ffffff", 320, 130)] } }; }
      if (lt < wAnd) { const u = (lt - wFloor) / (wAnd - wFloor), G = lerp(4.6, 23.5, u * u * 0.4 + u * 0.6); lv.update(G, { t }); pair(G, t, { fear: 0.6 });
        place(lv.camera, V(11, 9, 15), V(9, 6.5, 12), u, V(-1, -1, -1), V(-1, -1.5, -1), 54); shake(lv.camera, 0.03, t);
        return { set: lv, fx: { vignette: 0.65, flash: clamp(1 - (lt - wFloor) / 0.15) * 0.25 }, state: { slams: [slam(String(lv.alive(G)), at("hook", wFloor), at("hook", wAnd), "#ff4a3a", 320, 190)] } }; }
      // flash-forward: the last platform, the two of them, the crown
      const G = HOP + 3.5 + (lt - wAnd), T = t; lv.update(G, { t, shrink: 0.62 }); pair(G, T, { faceEach: true, fear: 0.5 });
      const k = ease(clamp((lt - wAnd) / (s.dur - wAnd))); place(lv.camera, V(0.35, 1.0, 5.6), V(0.25, 1.15, 4.8), k, V(0, 1.75, 0), V(0, 1.85, 0), 52); hand(lv.camera, 0.004, t);
      return { set: lv, fx: { vignette: 0.6, flash: clamp(1 - (lt - wAnd) / 0.2) * 0.3 }, state: { slams: [slam("ONLY 1 CAN WIN", at("hook", wAnd + 0.05), at("hook", s.dur), "#ffd23d", 320, 120)] } };
    },
    "start"(lt, s, t) {   // every Friday night: Jay's room... Maya's room
      const mt = wordT("n01", /^maya/i) - s.t0 - 0.2;
      renderGame(0.5 + lt, t, [V(9, 8, 11), V(-1.5, 0, 0)]);
      if (lt < mt) { seat(bed.jay, lt, { lean: 0.3, smile: 0.5 }); bed.update(lt, { screenTex: gameRT.texture, lampOn: 0.8, led: 1 });
        const k = ease(clamp(lt / mt)); place(bed.camera, V(0.75, 1.55, 0.05), V(0.58, 1.47, -0.25), k, V(0, 1.15, -1.75), V(0, 1.2, -1.8), 46); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.55 } }; }
      seat(maya2, lt, { lean: 0.3, smile: 0.55 }); bed2.update(lt, { screenTex: gameRT.texture, lampOn: 0.8, led: 1 });
      const h = headOf(maya2), k = ease(clamp((lt - mt) / (s.dur - mt))); place(bed2.camera, V(h.x - 0.3, h.y - 0.02, h.z - 1.3), V(h.x - 0.22, h.y - 0.02, h.z - 1.05), k, V(h.x, h.y - 0.06, h.z), V(h.x, h.y - 0.05, h.z), 48); hand(bed2.camera, 0.003, t);
      return { set: bed2, fx: { vignette: 0.55 } };
    },
    "drop"(lt, s, t) {   // one tile at a time: a tile shakes red, drops, the player on it goes down; the kill feed
      const first = lv.beanDrops()[0], wd = wordT("n02", /^drops/i) - s.t0, G = first.drop + (lt - wd);
      lv.update(G, { t }); pair(G, t); const f = Math.max(0, G - first.drop), fy = -4.9 * f * f;
      const look = V(first.x, Math.max(lv.LAVA_Y + 0.5, fy + 0.3), first.z), k = ease(clamp(lt / s.dur));
      aim(lv.camera, V(first.x + lerp(4.2, 3.2, k), lerp(2.4, 3.6, k), first.z + lerp(4.6, 3.6, k)), look, 50); shake(lv.camera, G > first.drop - 0.9 && G < first.drop + 0.2 ? 0.012 : 0.003, t);
      const feed = lv.beanDrops().slice(0, 4).map((b, i) => ({ name: "☠ " + NAMES[i], text: "fell in", t: s.t0 + wd + (b.drop - first.drop), color: "#ff7a5a" })).filter((m) => m.t < s.t1);
      return { set: lv, fx: { vignette: 0.6 }, state: { world: "Floor Is Lava", worldColor: "#ff7a2a", worldT: s.t0 + 0.1, chat: { items: feed, y: 1000, title: "FLOOR IS LAVA  ·  ELIMINATED" } } };
    },
    "deal"(lt, s, t) {   // the deal: a fist bump, side by side ... who would you team up with?
      const e1 = s.L("e01") - 0.2, G = 15 + lt;
      if (lt < e1) { lv.update(G, { t }); const bump = clamp((lt - s.L("n03") - 0.6) / 0.5) * clamp((s.E("n03") + 0.3 - lt) / 0.4);
        pair(G, t, { fear: 0, jp: { smile: 0.5, yaw: 0.5 }, mp: { smile: 0.5, yaw: -0.5 } });
        if (bump > 0) { J.J["shoulder-1"].rotation.x = -1.4 * bump; J.J["elbow-1"].rotation.x = -0.3 * bump; M.J.shoulder1.rotation.x = -1.4 * bump; M.J.elbow1.rotation.x = -0.3 * bump; }
        const c = V(tx, 1.1, 0), k = ease(clamp(lt / e1)); place(lv.camera, V(tx + 0.3, 1.5, 3.8), V(tx + 0.15, 1.4, 3.1), k, c, V(tx, 1.15, 0), 44); hand(lv.camera, 0.004, t);
        return { set: lv, fx: { vignette: 0.55 } }; }
      lv.update(G, { t }); pair(G, t, { jp: { smile: 0.3 }, mp: { smile: 0.3 } }); const a = 0.6 + (lt - e1) * 0.18, r = 17;
      aim(lv.camera, V(Math.sin(a) * r, 11, Math.cos(a) * r), V(-1, 0, 0), 46);
      return { set: lv, fx: { vignette: 0.55 } };
    },
    "chaos"(lt, s, t) {   // ninety players gone... then ninety-eight
      const w90 = wordT("n04", /^ninety$|^90/i) - s.t0, w98 = wordT("n04", /ninety-eight|^98/i) - s.t0;
      const G = lt < w90 ? lerp(31, G10, lt / w90) : lt < w98 ? lerp(G10, G2, (lt - w90) / (w98 - w90)) : G2 + (lt - w98) * 0.9;
      lv.update(G, { t }); pair(G, t, { fear: 0.7, noBlink: true });
      const k = ease(clamp(lt / s.dur)), c = V(tx * (1 - clamp((G - HOP) / 0.55)), 0.9, 0);
      place(lv.camera, V(5.5, 3.2, 6.5), V(3.6, 2.4, 4.6), k, c, c, 52); shake(lv.camera, 0.02, t);
      return { set: lv, fx: { vignette: 0.65 }, state: { slams: [slam("90 GONE", at("chaos", w90), at("chaos", w98), "#ff4a3a", 320, 140), slam("98 GONE", at("chaos", w98), at("chaos", s.dur), "#ff4a3a", 320, 140)] } };
    },
    "last"(lt, s, t) {   // one platform left... room for one (the edge crumbles away)
      const G = HOP + 1.5 + lt, cr = wordT("n05", /^room/i) - s.t0 - 0.1, shrink = lerp(1, 0.62, ease(clamp((lt - cr) / 0.7)));
      lv.update(G, { t, shrink, crumble: lt - cr }); pair(G, t, { faceEach: true, fear: lt > cr ? 0.6 : 0.3 });
      const k = ease(clamp(lt / s.dur)); place(lv.camera, V(3.2, -1.6, 7.5), V(2.3, -0.6, 5.6), k, V(0, 1.2, 0), V(0, 1.5, 0), 46); shake(lv.camera, lt > cr && lt < cr + 0.5 ? 0.02 : 0.002, t);
      return { set: lv, fx: { vignette: 0.6 }, state: { slams: [slam("ROOM FOR 1", at("last", cr), at("last", s.dur), "#ffd23d", 320, 130)] } };
    },
    "look"(lt, s, t) {   // Maya has never won a round. Would you jump, or let her win?
      const G = HOP + 4 + lt, e2 = s.L("e02") - 0.2, nm = s.L("n06") + 0.6; lv.update(G, { t, shrink: 0.62 });
      if (lt < e2) { pair(G, t, { faceEach: true, mp: { yaw: 0.15, pitch: -0.35, fear: 0.2 }, jp: { fear: 0.2 } }); const h = headOf(M);
        aim(lv.camera, V(h.x - 1.25, h.y + 0.05, h.z + 1.95), V(h.x, h.y - 0.1, h.z), 40); hand(lv.camera, 0.003, t);
        return { set: lv, fx: { vignette: 0.6 }, state: { board: { t: at("look", nm), title: "MAYA_K · FLOOR IS LAVA", y: 300, rows: [["", "ROUNDS PLAYED", "212", false], ["", "ROUNDS WON", "0", true]] } } }; }
      // Jay, at his desk: his hand over the keys
      renderGame(G, t, [V(1.6, 1.4, 2.2), V(0, 1.0, 0)], { shrink: 0.62, faceEach: true });
      seat(bed.jay, lt, { lean: 0.45, pitch: 0.05, fear: 0.15, noBlink: true }); bed.update(lt, { screenTex: gameRT.texture, lampOn: 0.5, led: 1 });
      const h = headOf(bed.jay), k = ease(clamp((lt - e2) / (s.dur - e2))); place(bed.camera, V(0.98, 1.36, -1.25), V(0.82, 1.32, -1.12), k, V(h.x, h.y - 0.1, h.z), V(h.x, h.y - 0.08, h.z), 46); hand(bed.camera, 0.003, t);
      return { set: bed, fx: { vignette: 0.6 } };
    },
    "fall"(lt, s, t) {   // Jay stepped back... and let the floor take him
      const st = wordT("n07", /^stepped/i) - s.t0, u = lt - st - 0.9, G = HOP + 8 + lt; const splashAt = st + 0.9 + SPLASH_U;
      lv.update(G, { t, shrink: 0.62, splash: [{ x: -0.9 - SPLASH_U * FALLSLOW * 0.9, z: 0, t: G - (lt - splashAt) }], out: lt > splashAt ? 1 : 0 });
      pair(G, t, { faceEach: true }); jayFall(u, t); pose(M, "reach", t, { k: clamp((u + 0.2) / 0.4), fear: 0.7, noBlink: true }); M.root.rotation.set(0, -Math.PI / 2, 0);
      if (u < 0.2) { const h = headOf(J); aim(lv.camera, V(h.x + 1.5, h.y + 0.1, h.z + 1.6), V(h.x, h.y - 0.15, h.z), 42); }   // his face: a little smile
      else { const p = J.root.position; aim(lv.camera, V(0.7, 2.6, 1.0), V(p.x, Math.max(lv.LAVA_Y, p.y), p.z), lerp(50, 58, clamp(u / 2))); }   // over Maya's shoulder, down into the lava
      hand(lv.camera, 0.004, t);
      return { set: lv, fx: { vignette: 0.65, flash: lt > splashAt && lt < splashAt + 0.15 ? 0.2 : 0 } };
    },
    "unlock"(lt, s, t) {   // Maya wins (the crown); then Jay's screen... ACHIEVEMENT UNLOCKED
      const pop = wordT("n08", /^popped/i) - s.t0 - 0.1, e3 = s.L("e03") - 0.2, lead = s.lead - 0.1;
      const ach = { t: at("unlock", pop), title: "TRUE FRIEND", sub: "Let your best friend win.", pct: "0.01% OF PLAYERS HAVE THIS", y: 470 };
      if (lt < lead) { const G = HOP + 12 + lt; pair(G, t, { faceEach: true }); J.root.visible = false;
        M.root.rotation.set(0, 0.3, 0); pose(M, "stand", t, { smile: 0.8 }); M.J.shoulder1.rotation.x = -2.8; M.J["shoulder-1"].rotation.x = -2.8;
        const h = headOf(M), k = ease(clamp(lt / 1.0)); lv.crown.scale.setScalar(lerp(1, 0.5, k)); lv.update(G, { t, shrink: 0.62, out: 1, confetti: lt - 0.5, crownAt: V(lerp(0, h.x, k), lerp(3.5, h.y + 0.22, k), lerp(0, h.z, k)) });
        aim(lv.camera, V(h.x + 0.6, h.y + 0.2, h.z + 2.4), V(h.x, h.y - 0.1, h.z), 44); hand(lv.camera, 0.004, t);
        return { set: lv, fx: { vignette: 0.55 }, state: { slams: [slam("MAYA WINS!", at("unlock", 0.9), at("unlock", lead), "#ffd23d", 320, 150)] } }; }
      if (lt < e3) { seat(bed.jay, lt, { lean: 0.1, smile: lt > pop + 0.6 ? 0.55 : 0.2, pitch: 0.02 }); bed.jay.J.spine.rotation.x -= 0.12; bed.update(lt, { screenTex: outTex, lampOn: 0.5, led: 1, screenRed: true });
        const k = ease(clamp((lt - lead) / (e3 - lead))); place(bed.camera, V(1.25, 1.55, 0.35), V(0.95, 1.45, -0.1), k, V(0, 1.15, -1.6), V(0, 1.15, -1.5), 46); hand(bed.camera, 0.003, t);
        return { set: bed, fx: { vignette: 0.55 }, state: { achieve: ach } }; }
      seat(maya2, lt, { lean: 0.2, smile: 0.85, tilt: 0.12 }); bed2.update(lt, { screenTex: winTex, lampOn: 0.8, led: 1 });
      const h = headOf(maya2), k = ease(clamp((lt - e3) / (s.dur - e3))); place(bed2.camera, V(h.x - 0.3, h.y - 0.02, h.z - 1.3), V(h.x - 0.2, h.y - 0.02, h.z - 1.05), k, V(h.x, h.y - 0.06, h.z), V(h.x, h.y - 0.05, h.z), 48); hand(bed2.camera, 0.003, t);
      return { set: bed2, fx: { vignette: 0.55 }, state: { achieve: ach } };
    },
    "cta"(lt, s, t) {   // Pulsebox
      const L = s.L("n10"), pop = clamp((lt - L) / 0.35) * clamp((L + 0.7 - lt) / 0.35);
      cta.update(lt, { spin: lt * 0.32, pop, show78: 0 });
      const k = ease(clamp(lt / s.dur)), a = lerp(0.55, -0.45, k), r = lerp(8.2, 6.6, k);
      aim(cta.camera, V(Math.sin(a) * r, lerp(2.2, 2.7, k), Math.cos(a) * r), V(0, lerp(2.0, 2.4, k), 0), 42);
      return { set: cta, fx: { flash: clamp(1 - lt / 0.3) * 0.4, vignette: 0.45 }, state: { cta: ctaTimes() } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n09"), b = line("n10"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { freeText: "TONS OF FREE GAMES", t17: a.t, tFree: wt(a, /^tons|free/i), genres: [/racing/i, /heists/i, /horror/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: tl.duration + 10 });
  }
  const route = (sh, lt, t) => { J.root.visible = true; M.root.visible = true; lv.crown.scale.setScalar(1); return (S[sh.id] || S["start"])(lt, sh, t); };
  route.sets = { lv, bed, bed2, cta };
  return route;
}
