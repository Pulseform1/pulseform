// A phone's screen drawn on a canvas (used as the texture of the 3D phone): a lock screen with a notification,
// and a dark-mode message thread with photo messages, a typed reply and "Delivered".
import * as THREE from "three";

const W = 720, H = 1560;
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const F = (w, px) => `${w} ${px}px 'Inter', sans-serif`;
function wrap(g, text, maxW) { const words = text.split(" "), lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur); return lines; }

export class PhoneUI {
  constructor() { this.c = document.createElement("canvas"); this.c.width = W; this.c.height = H; this.g = this.c.getContext("2d"); this.texture = new THREE.CanvasTexture(this.c); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 8; this.photos = {}; }
  // s: { mode: "off" | "lock" | "thread", clock, date, notif: { title, body, k }, messages: [{ me, text, photo, time, k }], typing: { text, k }, status, number, battery }
  draw(s) {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0);
    if (s.mode === "off") { g.fillStyle = "#020203"; g.fillRect(0, 0, W, H); this.texture.needsUpdate = true; return; }
    // status bar
    const bar = (light) => { g.fillStyle = light ? "#fff" : "#fff"; g.font = F(600, 30); g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(s.clock || "2:47", 56, 52);
      g.textAlign = "right"; g.fillText("LTE", W - 130, 52); rr(g, W - 112, 38, 58, 28, 8); g.strokeStyle = "#fff"; g.lineWidth = 3; g.stroke(); g.fillStyle = (s.battery ?? 0.18) < 0.2 ? "#ff453a" : "#fff"; rr(g, W - 108, 42, 50 * (s.battery ?? 0.18), 20, 5); g.fill(); };
    if (s.mode === "lock") {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0b1020"); gr.addColorStop(0.6, "#120a1c"); gr.addColorStop(1, "#05040a"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      bar(); g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.92)"; g.font = F(600, 34); g.fillText(s.date || "Tuesday, November 24", W / 2, 230);
      g.font = F(700, 190); g.fillText(s.clock || "2:47", W / 2, 380);
      if (s.notif && (s.notif.k ?? 1) > 0) {
        const k = Math.min(1, s.notif.k ?? 1), y = 560 + (1 - k) * -60; g.save(); g.globalAlpha = k;
        g.fillStyle = "rgba(40,40,48,.92)"; rr(g, 34, y, W - 68, 230, 40); g.fill();
        g.fillStyle = "#30d158"; rr(g, 64, y + 34, 70, 70, 18); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.ellipse(99, y + 66, 22, 18, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(86, y + 78); g.lineTo(80, y + 92); g.lineTo(96, y + 82); g.fill();
        g.textAlign = "left"; g.fillStyle = "#fff"; g.font = F(700, 32); g.fillText(s.notif.title || "Unknown Number", 156, y + 58); g.font = F(600, 26); g.fillStyle = "rgba(255,255,255,.55)"; g.textAlign = "right"; g.fillText("now", W - 70, y + 58);
        g.textAlign = "left"; g.fillStyle = "rgba(255,255,255,.88)"; g.font = F(600, 30); g.fillText(s.notif.body || "1 new message", 156, y + 108);
        if (s.notif.sub) { g.fillStyle = "rgba(255,255,255,.5)"; g.font = F(600, 26); g.fillText(s.notif.sub, 156, y + 152); }
        g.restore();
      }
      g.fillStyle = "rgba(255,255,255,.7)"; rr(g, W / 2 - 110, H - 40, 220, 10, 5); g.fill();
      this.texture.needsUpdate = true; return;
    }
    // ---- the thread
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H); bar();
    g.fillStyle = "#111114"; g.fillRect(0, 90, W, 190); g.fillStyle = "#2c2c30"; g.fillRect(0, 279, W, 2);
    g.fillStyle = "#0a84ff"; g.font = F(600, 52); g.textAlign = "left"; g.fillText("‹", 30, 140);
    g.fillStyle = "#5a5a64"; g.beginPath(); g.arc(W / 2, 160, 50, 0, 7); g.fill(); g.fillStyle = "#e8e8ee"; g.font = F(700, 52); g.textAlign = "center"; g.fillText("?", W / 2, 162);
    g.fillStyle = "#fff"; g.font = F(600, 28); g.fillText(s.number || "(318) 555-0147", W / 2, 246);
    // messages, bottom-up from above the input bar
    let y = H - 170; const items = [];
    const msgs = (s.messages || []).filter((m) => (m.k ?? 1) > 0);
    g.font = F(600, 36);
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i], maxW = 470, lines = m.text ? wrap(g, m.text, maxW) : [], tw = lines.length ? Math.max(...lines.map((l) => g.measureText(l).width)) : 0;
      const bh = lines.length ? lines.length * 46 + 34 : 0, ph = m.photo ? 430 : 0, bw = m.photo ? 380 : tw + 48;
      if (m.status) y -= 40;
      const top = y - bh - ph - (m.photo && lines.length ? 10 : 0);
      items.push({ m, lines, bw, bh, ph, top, k: Math.min(1, m.k ?? 1) });
      y = top - 22; if (m.time) y -= 64;
    }
    items.forEach(({ m, lines, bw, bh, ph, top, k }) => {
      const x = m.me ? W - 34 - bw : 34; g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 30);
      if (m.time) { g.fillStyle = "rgba(255,255,255,.45)"; g.font = F(600, 24); g.textAlign = "center"; g.fillText(m.time, W / 2, top - 40); }
      if (m.photo && this.photos[m.photo]) { g.save(); rr(g, x, top, bw, ph, 34); g.clip(); const im = this.photos[m.photo], sc = Math.max(bw / im.width, ph / im.height); g.drawImage(im, x + (bw - im.width * sc) / 2, top + (ph - im.height * sc) / 2, im.width * sc, im.height * sc); g.restore(); }
      if (lines.length) { const by = top + ph + (ph ? 10 : 0); g.fillStyle = m.me ? "#0a84ff" : "#2c2c30"; rr(g, x, by, bw, bh, 36); g.fill();
        g.fillStyle = "#fff"; g.font = F(600, 36); g.textAlign = "left"; lines.forEach((l, i) => g.fillText(l, x + 24, by + 40 + i * 46)); }
      if (m.status) { g.fillStyle = "rgba(255,255,255,.45)"; g.font = F(600, 24); g.textAlign = "right"; g.fillText(m.status, W - 40, top + ph + bh + 34); }
      g.restore();
    });
    // input bar (what he is typing)
    g.fillStyle = "#111114"; g.fillRect(0, H - 130, W, 130); g.strokeStyle = "#3a3a40"; g.lineWidth = 3; rr(g, 100, H - 112, W - 200, 70, 35); g.stroke();
    g.fillStyle = "#3a3a40"; g.beginPath(); g.arc(56, H - 77, 30, 0, 7); g.fill(); g.fillStyle = "#9a9aa4"; g.font = F(600, 44); g.textAlign = "center"; g.fillText("+", 56, H - 75);
    const typed = s.typing ? s.typing.text.slice(0, Math.round(s.typing.text.length * Math.min(1, s.typing.k))) : "";
    g.textAlign = "left"; g.font = F(600, 32); g.fillStyle = typed ? "#fff" : "#6a6a74"; g.fillText(typed || "Text Message", 128, H - 76);
    if (typed && Math.sin((s.t ?? 0) * 9) > -0.2) { const cw = g.measureText(typed).width; g.fillStyle = "#0a84ff"; g.fillRect(132 + cw, H - 96, 3, 40); }
    if (typed) { g.fillStyle = "#0a84ff"; g.beginPath(); g.arc(W - 64, H - 77, 30, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = F(700, 34); g.textAlign = "center"; g.fillText("↑", W - 64, H - 74); }
    g.fillStyle = "rgba(255,255,255,.7)"; rr(g, W / 2 - 110, H - 24, 220, 10, 5); g.fill();
    this.texture.needsUpdate = true;
  }
}

// the 3D phone: a dark slab with the screen, a camera bump, and a flashlight with a soft beam
export function makePhone(ui) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.158, 0.009), new THREE.MeshPhysicalMaterial({ color: 0x15151c, metalness: 0.6, roughness: 0.3, clearcoat: 1 })); g.add(body);
  const scrM = new THREE.MeshBasicMaterial({ map: ui.texture, color: 0xffffff });   // a screen lights itself: no reflections, no hot spot
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.0705, 0.1525), scrM); screen.position.z = 0.0047; g.add(screen);
  const glow = new THREE.PointLight(0xbfd0ff, 0, 1.6, 1.8); glow.position.set(0, 0, 0.1); g.add(glow);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.003, 12), new THREE.MeshStandardMaterial({ color: 0x050505 })); lens.rotation.x = Math.PI / 2; lens.position.set(-0.024, 0.065, -0.0055); g.add(lens);
  const torch = new THREE.SpotLight(0xf4f6ff, 0, 18, 0.42, 0.55, 1.3); torch.position.set(-0.024, 0.06, -0.008); torch.target.position.set(-0.024, 0.06, -1); g.add(torch, torch.target); torch.castShadow = true; torch.shadow.mapSize.set(512, 512);
  const bc = document.createElement("canvas"); bc.width = 4; bc.height = 256; { const x = bc.getContext("2d"); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "rgba(240,244,255,.12)"); gr.addColorStop(1, "rgba(240,244,255,.0)"); x.fillStyle = gr; x.fillRect(0, 0, 4, 256); }
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 24, 1, true), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.rotation.x = Math.PI / 2; beam.position.set(-0.024, 0.06, -2.5); beam.visible = false; g.add(beam);
  g.userData = { screen, scrM, glow, torch, beam,
    set({ bright = 1, torchOn = false } = {}) { scrM.color.setScalar(Math.min(1, 0.06 + bright * 0.86)); glow.intensity = bright * 0.35; torch.intensity = torchOn ? 60 : 0; beam.visible = torchOn; } };
  return g;
}
