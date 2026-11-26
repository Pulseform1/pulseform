// The Vault: every shot. Nobody has ever opened the vault in Safecracker. Jay goes in, Maya runs the cameras from her
// house: the guard, the lasers, the cameras, the dial, the gold, every alarm at once, and two doors. It pauses on the choice.
import * as THREE from "three";
import { createBedroom } from "../../sets/bedroom.js";
import { createBank } from "../../sets/bank.js";
import { makeJay, pose } from "../../jay.js";

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function aim(cam, pos, look, fov) { cam.position.copy(pos); cam.lookAt(look); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function place(cam, from, to, k, look, lookTo = look, fov = null) { cam.position.lerpVectors(from, to, k); cam.lookAt(new THREE.Vector3().lerpVectors(look, lookTo, k)); if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); } }
function hand(cam, amt, t) { cam.position.x += Math.sin(t * 1.7) * amt + Math.sin(t * 4.3) * amt * 0.4; cam.position.y += Math.cos(t * 1.3) * amt; cam.rotation.z += Math.sin(t * 1.1) * amt * 0.5; }

// Jay's monitor: the Safecracker title screen
function safecrackerScreen() {
  const c = document.createElement("canvas"); c.width = 1280; c.height = 800; const g = c.getContext("2d"), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, draw(t, { joined = 0, loading = 0 } = {}) {
    const gr = g.createLinearGradient(0, 0, 0, 800); gr.addColorStop(0, "#14100a"); gr.addColorStop(1, "#050403"); g.fillStyle = gr; g.fillRect(0, 0, 1280, 800);
    g.save(); g.translate(640, 300); g.strokeStyle = "#c9a24a"; g.lineWidth = 10; g.beginPath(); g.arc(0, 0, 150, 0, 7); g.stroke(); g.lineWidth = 4;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 0.2; g.beginPath(); g.moveTo(Math.cos(a) * 118, Math.sin(a) * 118); g.lineTo(Math.cos(a) * 150, Math.sin(a) * 150); g.stroke(); }
    g.beginPath(); g.arc(0, 0, 46, 0, 7); g.stroke(); g.restore();
    g.textAlign = "center"; g.fillStyle = "#e8c77a"; g.font = "700 118px 'Chakra Petch', sans-serif"; g.shadowColor = "#c9a24a"; g.shadowBlur = 24; g.fillText("SAFECRACKER", 640, 560); g.shadowBlur = 0;
    g.font = "700 34px 'Chakra Petch', sans-serif"; g.fillStyle = "#9a8a6a"; g.fillText("THE VAULT   ·   ATTEMPTS 1,284,907   ·   OPENED 0", 640, 625);
    g.fillStyle = joined ? "#5dff8a" : "#6a6a6a"; g.fillText(joined ? "PLAYER 2: MAYA  ●  CONNECTED" : "WAITING FOR PLAYER 2...", 640, 700);
    if (loading) { g.fillStyle = "rgba(255,255,255,.15)"; g.fillRect(440, 735, 400, 10); g.fillStyle = "#e8c77a"; g.fillRect(440, 735, 400 * loading, 10); }
    tex.needsUpdate = true;
  } };
}

export function makeShots(renderer, tl) {
  const bank = createBank(), bed = createBedroom({ headset: true, lamp: true }), bed2 = createBedroom({ headset: true, lamp: true });
  const shot = (id) => tl.shots.find((s) => s.id === id), line = (id) => tl.lines.find((l) => l.id === id);
  const at = (id, lt = 0) => shot(id).t0 + lt, wordT = (id, re) => { const l = line(id); return (l.words.find((w) => re.test(w.w)) || l.words[l.words.length - 1]).t; };
  const title = safecrackerScreen();
  bed.phone.visible = false; bed2.phone.visible = false;
  // Maya, at her desk across town
  bed2.jay.root.visible = false; const maya = makeJay({ variant: "maya", headset: true }); bed2.scene.add(maya.root);
  // Maya's monitor: four live security feeds from inside the bank
  const feedRT = new THREE.WebGLRenderTarget(800, 500, { samples: 0 }); feedRT.texture.colorSpace = THREE.SRGBColorSpace;
  const feedCam = new THREE.PerspectiveCamera(70, 800 / 500, 0.05, 80);
  const FEEDS = [[V(5.8, 5.4, 2.4), V(0, 0.5, -6)], [V(0, 3.0, -11.8), V(0, 0.6, -20)], [V(4.6, 4.6, -21.8), V(-1, 0.5, -28)], [V(-5.6, 5.4, -10.5), V(2, 0, -2)]];
  function renderFeeds(t) { const old = renderer.getRenderTarget(), ex = renderer.toneMappingExposure, vp = renderer.getViewport(new THREE.Vector4()), sc = renderer.getScissor(new THREE.Vector4()); renderer.setRenderTarget(feedRT); renderer.toneMappingExposure = 1.6; renderer.setScissorTest(true);
    FEEDS.forEach(([p, l], i) => { const x = (i % 2) * 400, y = Math.floor(i / 2) * 250; renderer.setViewport(x, y, 398, 248); renderer.setScissor(x, y, 398, 248); feedCam.aspect = 398 / 248; feedCam.updateProjectionMatrix(); feedCam.position.copy(p); feedCam.lookAt(l); renderer.render(bank.scene, feedCam); });
    renderer.setScissorTest(false); renderer.setRenderTarget(old); renderer.setViewport(vp); renderer.setScissor(sc); renderer.toneMappingExposure = ex; }   // (put the screen's viewport back)
  const J = bank.jay, G = bank.guard;
  const seat = (rig, lt, p = {}) => { rig.root.position.set(0, 0, -0.45); rig.root.rotation.set(0, Math.PI, 0); pose(rig, "sit", lt, p); };
  const sneak = (rig, lt, ph) => { pose(rig, "walk", lt, { phase: ph }); rig.J.hips.position.y -= 0.22; rig.J.spine.rotation.x += 0.45; for (const s of [-1, 1]) { rig.J["knee" + s].rotation.x += 0.7; rig.J["hip" + s].rotation.x -= 0.35; rig.J["shoulder" + s].rotation.x -= 0.3; } };
  const slide = (rig) => { pose(rig, "stand", 0); const j = rig.J; j.hips.position.y = 0.3; j.spine.rotation.x = -0.75; j.hip1.rotation.x = -1.45; j.knee1.rotation.x = 0.1; j["hip-1"].rotation.x = -0.9; j["knee-1"].rotation.x = 1.6; j.shoulder1.rotation.x = -0.5; j["shoulder-1"].rotation.x = -0.4; j.head.rotation.x = 0.45; };
  const guardWalk = (lt, x, ry) => { G.root.position.set(x, 0, -5.6); G.root.rotation.set(0, ry, 0); pose(G, "torch", lt, { walk: lt * 4.2 }); const hp = G.J.hand1.getWorldPosition(V(0, 0, 0)); bank.torch.position.copy(hp).add(V(0, 0.05, 0)); bank.torch.quaternion.copy(G.root.quaternion); bank.torch.rotateX(0.18 + Math.sin(lt * 1.3) * 0.08); bank.torch.rotateY(Math.sin(lt * 0.9) * 0.25); };
  // the heist clock: 90 seconds, running a little fast so the whole break-in fits; it reads 0:12 as the door opens, then 10 seconds for the doors
  const lobby0 = () => at("lobby"), open0 = () => at("open"), alarm0 = () => at("alarm"), F = () => line("n11").t + line("n11").edur + 0.35;
  const timer = (t) => t < alarm0() ? { now: Math.max(12, 90 - (t - lobby0()) * (78 / (open0() - lobby0()))), record: 90, label: "VAULT TIMER" } : { now: Math.max(3, 10 - (t - alarm0()) * (7 / (F() - alarm0()))), record: 10, label: "GET OUT" };
  const DIAL = [17, 42, 8];   // right, left, right

  const S = {
    "hook"(lt, s, t) {   // down the laser corridor toward the vault nobody has ever opened
      bank.update(t, { laserT: lt + 1.5 }); J.root.visible = false; G.root.visible = false;
      const k = ease(clamp(lt / s.dur)); place(bank.camera, V(0.35, 0.95, -11.0), V(0.1, 1.1, -14.2), k, V(0, 1.7, -31), V(0, 2.0, -31), lerp(46, 38, k)); hand(bank.camera, 0.004, t);
      return { set: bank, fx: { vignette: 0.75 }, state: { slams: [{ text: "1,284,907 ATTEMPTS", t: at("hook", 0.35), until: at("hook", s.dur), color: "#ffffff", y: 480, px: 90 }, { text: "0 OPENED", t: at("hook", 1.7), until: at("hook", s.dur), color: "#ff3d5e", y: 620, px: 130 }] } };
    },
    "desk"(lt, s, t) {   // Jay at his desk, headset on, the title screen
      title.draw(t, { joined: lt > s.dur * 0.55 ? 1 : 0 }); seat(bed.jay, lt, { lean: 0.3, smile: 0.35 }); bed.update(lt, { screenTex: title.tex, lampOn: 0.5, led: 1 });
      const k = ease(clamp(lt / s.dur)); place(bed.camera, V(1.25, 1.7, 1.3), V(0.7, 1.45, 0.35), k, V(0, 1.1, -1.4), V(0, 1.15, -1.6), 44); hand(bed.camera, 0.004, t);
      return { set: bed, fx: { vignette: 0.65 } };
    },
    "maya"(lt, s, t) {   // "Jay would go inside" (his screen loads in) ... "Maya would run the cameras" (her screen: four feeds)
      const mt = wordT("n02", /^maya/i) - s.t0 - 0.15;
      if (lt < mt) { title.draw(t, { joined: 1, loading: clamp(lt / mt) }); seat(bed.jay, lt, { lean: 0.35 }); bed.update(lt, { screenTex: title.tex, lampOn: 0.5, led: 1 });
        aim(bed.camera, V(0.25, 1.32, -0.95), V(0, 1.2, -1.8), 50); hand(bed.camera, 0.003, t); return { set: bed, fx: { vignette: 0.6 } }; }
      renderFeeds(t); bank.update(t, { laserT: t }); guardWalk(t, Math.sin(t * 0.3) * 2, Math.PI / 2);
      seat(maya, lt, { lean: 0.3, smile: 0.3, yaw: 0.15 }); bed2.update(lt, { screenTex: feedRT.texture, lampOn: 0.6, led: 1, screenBright: 1.1 });
      const k = ease(clamp((lt - mt) / (s.dur - mt))); place(bed2.camera, V(1.0, 1.55, 0.55), V(0.72, 1.5, 0.2), k, V(-0.15, 1.15, -1.6), V(-0.15, 1.15, -1.7), 46);   // over her right shoulder: the four feeds hand(bed2.camera, 0.004, t);
      return { set: bed2, fx: { vignette: 0.65 } };
    },
    "lobby"(lt, s, t) {   // the guard and his flashlight; Jay behind a pillar; then behind the guard's back, to the corridor
      bank.update(t, { laserT: t }); J.root.visible = true; G.root.visible = true; const E1 = s.L("e01") - 0.4;
      const gk = clamp(lt / (s.dur * 0.8)), gx = lerp(3.0, -2.6, ease(gk)); guardWalk(lt, gx, -Math.PI / 2 + Math.sin(lt * 0.6) * 0.15);
      if (lt < E1) {   // over his shoulder from behind the pillar
        J.root.position.set(-2.85, 0, -2.95); J.root.rotation.set(0, Math.PI + 0.35, 0); pose(J, "crouch", lt, { k: 0.8 }); J.J.head.rotation.y = 0.6;
        const k = clamp(lt / E1); aim(bank.camera, V(-2.0, 1.35, -1.6), V(lerp(1.5, -0.5, k), 1.1, -5.6), 50); hand(bank.camera, 0.004, t);
      } else {   // high and wide: Jay creeps behind him to the corridor
        const k = clamp((lt - E1) / (s.dur - E1)); J.root.position.set(lerp(-2.6, -0.2, ease(k)), 0, lerp(-3.2, -10.4, k)); J.root.rotation.set(0, Math.PI - 0.15, 0); sneak(J, lt, lt * 4.5);
        aim(bank.camera, V(5.2, 5.2, 1.6), V(-0.6, 0.6, -6.5), 46); hand(bank.camera, 0.002, t);
      }
      return { set: bank, fx: { vignette: 0.75 }, state: { timer: timer(t) } };
    },
    "lasers"(lt, s, t) {   // the lasers change every three seconds; on "go" he slides under, jumps, ducks
      G.root.visible = false; const go = wordT("n05", /^go/i) - s.t0, run = 2.6;
      const lT = lt < go ? lt : go + Math.max(0, lt - go) * 0.0;   // (the pattern holds while he runs)
      bank.update(t, { laserT: lT, torchOn: 0 }); J.root.visible = true;
      if (lt < go) { J.root.position.set(0, 0, -11.55); J.root.rotation.set(0, Math.PI, 0); pose(J, "crouch", lt, { k: 0.9 }); J.J.head.rotation.x = -0.3; J.J.head.rotation.y = Math.sin(lt * 0.8) * 0.25;
        const k = clamp(lt / go); place(bank.camera, V(0.95, 0.42, -13.6), V(0.85, 0.5, -13.2), k, V(0, 0.7, -11.6), V(0, 0.75, -11.6), 52); hand(bank.camera, 0.003, t); }
      else { const k = clamp((lt - go) / run), z = lerp(-11.55, -20.3, k), ph = k * 7; J.root.position.set(Math.sin(k * 9) * 0.25, 0, z); J.root.rotation.set(0, Math.PI, 0);
        if (ph % 2 < 0.9) slide(J); else if (ph % 2 < 1.4) pose(J, "jump", lt); else pose(J, "run", lt, { phase: lt * 13 });
        aim(bank.camera, V(0.9, 0.55, z - 1.8), V(J.root.position.x, 0.5, z), 60); hand(bank.camera, 0.01, t); }
      return { set: bank, fx: { vignette: 0.78 }, state: { timer: timer(t) } };
    },
    "cams"(lt, s, t) {   // the camera sweeps... freezes (Maya); he slips into the vault room
      const RUN = 2.6, fz = wordT("n06", /^froze/i) - s.t0, m0 = fz + 0.15, m1 = m0 + 1.3, frozen = clamp((lt - fz) / 0.2);
      G.root.visible = false;
      if (lt < RUN) {   // (right after "go!") under, over, through
        bank.update(t, { laserT: wordT("n05", /^go/i) - at("lasers"), torchOn: 0 }); J.root.visible = true; const k = clamp(lt / RUN), z = lerp(-11.55, -20.3, k), ph = k * 7;
        J.root.position.set(Math.sin(k * 9) * 0.25, 0, z); J.root.rotation.set(0, Math.PI, 0);
        if (ph % 2 < 0.9) slide(J); else if (ph % 2 < 1.4) pose(J, "jump", lt); else pose(J, "run", lt, { phase: lt * 13 });
        aim(bank.camera, V(0.9, 0.55, z - 1.8), V(J.root.position.x, 0.5, z), 60); hand(bank.camera, 0.01, t);
        return { set: bank, fx: { vignette: 0.78 }, state: { timer: timer(t) } };
      }
      if (lt < m0) { bank.update(t, { laserT: t, camFrozen: frozen, torchOn: 0 }); J.root.visible = false; const c = bank.cams[0].pivot.position; aim(bank.camera, V(c.x + 0.7, c.y - 0.3, c.z + 1.1), V(c.x, c.y, c.z), 40); hand(bank.camera, 0.002, t);
        return { set: bank, fx: { vignette: 0.75, chroma: lt > fz && lt < fz + 0.25 ? 0.8 : 0 }, state: { timer: timer(t) } }; }
      if (lt < m1) { if (lt < m0 + 0.05) renderFeeds(t); seat(maya, lt, { lean: 0.45, smile: 0.25, click: lt * 6 }); bed2.update(lt, { screenTex: feedRT.texture, lampOn: 0.6, led: 1 });
        aim(bed2.camera, V(0.35, 1.25, -1.0), V(-0.1, 1.15, -1.8), 48); hand(bed2.camera, 0.003, t);
        return { set: bed2, fx: { vignette: 0.6, chroma: lt < m0 + 0.2 ? 0.6 : 0 }, state: { timer: timer(t), slams: [{ text: "CAMERAS FROZEN", t: at("cams", m0 + 0.05), until: at("cams", m1), color: "#4ad8ff", y: 620, px: 110 }] } }; }
      bank.update(t, { laserT: t, camFrozen: 1, lasersOn: 0, torchOn: 0 }); J.root.visible = true; const k = clamp((lt - m1) / (s.dur - m1));
      J.root.position.set(0, 0, lerp(-20.5, -27.5, ease(k))); J.root.rotation.set(0, Math.PI, 0); pose(J, "run", lt, { phase: lt * 10 });
      aim(bank.camera, V(3.6, 3.8, -29.5), V(0, 1.2, lerp(-21.5, -27, k)), 48); hand(bank.camera, 0.003, t);
      return { set: bank, fx: { vignette: 0.75 }, state: { timer: timer(t) } };
    },
    "vault"(lt, s, t) {   // ear to the door, hand on the dial: right to 17, left to 42, right to 8
      J.root.visible = true; G.root.visible = false; const e = s.L("e02"), c0 = Math.max(0.6, e - 2.0), c1 = s.dur - 0.25;
      const u = clamp((lt - c0) / (c1 - c0)), seg = Math.min(2, Math.floor(u * 3)), su = u * 3 - seg, turns = [DIAL[0] / 100 + 1, -(1 + (100 - DIAL[1] + DIAL[0]) / 100), (DIAL[2] + 100 - DIAL[1]) / 100];
      let a = 0; for (let i = 0; i < seg; i++) a += turns[i]; a += turns[seg] * ease(clamp(su / 0.85)); const dialA = lt < c0 ? Math.sin(lt * 2) * 0.1 : -a * Math.PI * 2;
      bank.update(t, { laserT: t, camFrozen: 1, lasersOn: 0, dial: dialA, torchOn: 0 });
      J.root.position.set(0.35, 0, -29.95); J.root.rotation.set(0, Math.PI, 0); pose(J, "reach", lt, { k: 0.9, yaw: -0.7, pitch: 0.1 }); J.J.spine.rotation.z = 0.12;
      const hit = [0, 1, 2].map((i) => c0 + (c1 - c0) * (i + 0.85) / 3);
      if (lt < c0) { const k = ease(clamp(lt / c0)); place(bank.camera, V(2.6, 2.0, -24.5), V(1.6, 1.9, -26.5), k, V(0, 2.2, -30.8), V(0.2, 2.4, -30.8), 46); }
      else if (u < 0.5) { const dp = bank.dial.getWorldPosition(V(0, 0, 0)); aim(bank.camera, dp.clone().add(V(0.25, 0.05, 0.9)), dp, 40); }   // the dial
      else { const h = J.J.head.getWorldPosition(V(0, 0, 0)); aim(bank.camera, V(h.x + 1.0, h.y + 0.05, h.z + 0.7), V(h.x - 0.1, h.y, h.z), 42); }   // his face, listening
      hand(bank.camera, 0.002, t);
      const slams = hit.map((ht, i) => ({ text: String(DIAL[i]).padStart(2, "0"), t: at("vault", ht), until: at("vault", s.dur), color: i === 2 ? "#5dff8a" : "#ffffff", y: 560 + i * 0, px: 0 })).filter((sl) => t >= sl.t);
      const shown = slams.length ? [{ text: slams.map((sl) => sl.text).join(" · "), t: slams[slams.length - 1].t, until: at("vault", s.dur), color: slams.length === 3 ? "#5dff8a" : "#ffffff", y: 600, px: 120 }] : [];
      return { set: bank, fx: { vignette: 0.75 }, state: { timer: timer(t), slams: shown } };
    },
    "open"(lt, s, t) {   // the bolts draw in, the door swings out, the gold
      const bk = ease(clamp(lt / 0.9)), dk = ease(clamp((lt - 0.8) / 2.2)), gk = clamp((lt - 1.1) / 1.2);
      bank.update(t, { laserT: t, camFrozen: 1, lasersOn: 0, dial: -Math.PI * 2 * 0.08, bolts: bk, doorOpen: dk, gold: gk, torchOn: 0 }); J.root.visible = true; G.root.visible = false;
      J.root.position.set(lerp(0.35, 0.9, dk), 0, lerp(-29.95, -29.2, dk)); J.root.rotation.set(0, Math.PI - 0.2 * dk, 0); pose(J, "stand", lt, { fear: 0.35 * gk, smile: gk > 0.5 ? 0.45 : 0, pitch: 0.1 });
      if (lt < 1.0) { const dp = bank.wheel.getWorldPosition(V(0, 0, 0)); aim(bank.camera, dp.clone().add(V(-0.6, 0.3, 1.6)), dp, 44); }
      else if (lt < s.dur * 0.6) { const k = ease(clamp((lt - 1.0) / (s.dur * 0.6 - 1.0))); place(bank.camera, V(0.4, 1.5, -26.5), V(0.6, 1.6, -27.6), k, V(0, 2.0, -31.5), V(0, 1.9, -33), 52); }
      else { const h = J.J.head.getWorldPosition(V(0, 0, 0)); aim(bank.camera, V(h.x - 0.2, h.y + 0.05, h.z - 1.2), V(h.x, h.y - 0.05, h.z), 44); }   // his face in the gold light
      hand(bank.camera, 0.003, t);
      return { set: bank, fx: { vignette: 0.7 }, state: { timer: timer(t) } };
    },
    "alarm"(lt, s, t) {   // every alarm at once; the gate slams down behind him; two doors light up
      const al = clamp(lt / 0.15), gate = clamp((lt - 0.2) / 0.35), lit = clamp((lt - s.L("n10")) / 0.4), D = s.L("n10");
      bank.update(t, { laserT: t, camFrozen: 1, lasersOn: 0, bolts: 1, doorOpen: 1, gold: 1, alarm: al, gate, doorsLit: lit, torchOn: 0 }); J.root.visible = true; G.root.visible = false;
      J.root.position.set(lerp(0.6, 0.15, clamp((lt - 0.5) / 1.2)), 0, lerp(-29.0, -26.0, clamp((lt - 0.5) / 1.2))); J.root.rotation.set(0, lt < 0.5 ? Math.PI : lt < D ? lerp(Math.PI, 0, ease(clamp((lt - 0.5) / 0.6))) : Math.sin((lt - D) * 2.2) * 0.6, 0);
      if (lt < 0.5 || (lt > 1.3 && lt < D)) pose(J, "recoil", lt); else pose(J, lt < D ? "run" : "stand", lt, { phase: lt * 10, fear: 0.9, noBlink: true });
      if (lt < D) { aim(bank.camera, V(-3.4, 1.6, -23.0), V(0.4, 1.4, -28.0), 50); bank.camera.position.x += Math.sin(t * 40) * 0.03 * clamp(1 - lt); }
      else { const side = Math.sin((lt - D) * 1.6) > 0 ? 1 : -1, ex = bank.exits[side > 0 ? 1 : 0].g.position; aim(bank.camera, V(-side * 0.8, 1.7, -25.0), V(ex.x, 1.4, ex.z), 50); }   // whip between the doors
      hand(bank.camera, 0.006, t);
      return { set: bank, fx: { vignette: 0.8, red: al * 0.12 * (0.5 + 0.5 * Math.sin(t * 12)), flash: lt > 0.55 && lt < 0.62 ? 0.25 : 0 }, state: { timer: timer(t) } };
    },
    "freeze"(lt, s, t) {   // between the red door and the blue door; he reaches... pause
      const Fl = F() - s.t0, tt = Math.min(lt, Fl), frozen = lt >= Fl;
      bank.update(frozen ? s.t0 + Fl : t, { laserT: t, camFrozen: 1, lasersOn: 0, bolts: 1, doorOpen: 1, alarm: 1, gate: 1, doorsLit: 1, torchOn: 0, haze: 0, gold: 0.6 }); J.root.visible = true; G.root.visible = false;
      const look = Math.sin(tt * 2.4); J.root.position.set(0.15, 0, -26.0); J.root.rotation.set(0, look * 0.35, 0); pose(J, "reach", tt, { k: clamp(tt / 1.2) * 0.8, fear: 0.9, noBlink: true, yaw: look * 0.5 });
      const k = ease(clamp(tt / Fl)); place(bank.camera, V(0.05, 1.75, -33.6), V(0.05, 1.8, -32.6), k, V(0, 1.5, -21.5), V(0, 1.45, -21.5), lerp(68, 64, k)); if (!frozen) hand(bank.camera, 0.004, t);
      return { set: bank, fx: { vignette: 0.85, red: frozen ? 0.05 : 0.08 * (0.5 + 0.5 * Math.sin(t * 12)), paused: frozen ? clamp((lt - Fl) / 0.15) : 0, gray: frozen ? 0.45 : 0 }, state: frozen ? { cta: ctaTimes() } : { timer: timer(t) } };
    },
  };
  let ctaCache = null;
  function ctaTimes() {
    if (ctaCache) return ctaCache;
    const a = line("n12"), b = line("n13"), wt = (l, re) => (l.words.find((w) => re.test(w.w)) || l.words[0]).t;
    return (ctaCache = { freeText: "TONS OF FREE GAMES", t17: a.t, tFree: wt(a, /^tons|free/i), genres: [/racing/i, /horror/i, /heists/i, /sports/i].map((re) => wt(a, re)), t18: b.t + 0.2, tPc: wt(b, /^play/i), t19: tl.duration + 10 });
  }
  const route = (sh, lt, t) => { J.root.visible = true; G.root.visible = true; return (S[sh.id] || S["desk"])(lt, sh, t); };
  route.sets = { bank, bed, bed2 };
  return route;
}
