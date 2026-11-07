/* Shared by the horror games: draws a person from the shoulders up at (x, y), scaled by s.
   p = { skin, hair, style 0-3, eyes, shirt, glasses, beard, hat }. o: silhouette, reveal (0-1, the face splits open),
   glow (red eyes), smile, look (-1..1, where the eyes point). */
function drawPerson(gr, p, x, y, s, o = {}) {
  gr.save(); gr.translate(x, y); gr.scale(s, s);
  const dark = o.silhouette;
  gr.fillStyle = dark ? 'rgba(0,0,0,.85)' : p.shirt; gr.beginPath(); gr.moveTo(-120, 260); gr.quadraticCurveTo(-110, 110, -40, 95); gr.lineTo(40, 95); gr.quadraticCurveTo(110, 110, 120, 260); gr.fill();
  if (!dark) { gr.fillStyle = 'rgba(0,0,0,.25)'; gr.fillRect(-8, 100, 16, 160); }
  gr.fillStyle = dark ? 'rgba(0,0,0,.85)' : p.skin; gr.fillRect(-18, 70, 36, 34);
  const stretch = o.reveal ? 1 + o.reveal * .25 : 1;
  gr.beginPath(); gr.ellipse(0, 10, 58, 74 * stretch, 0, 0, 7); gr.fill();
  if (dark) { gr.restore(); return; }
  // hair
  gr.fillStyle = p.hair;
  if (p.style === 0) { gr.beginPath(); gr.ellipse(0, -30, 62, 42, 0, Math.PI, 0); gr.fill(); }
  else if (p.style === 1) { gr.beginPath(); gr.ellipse(0, -20, 66, 56, 0, Math.PI * .95, Math.PI * 2.05); gr.fill(); gr.fillRect(-66, -20, 16, 90); gr.fillRect(50, -20, 16, 90); }
  else if (p.style === 2) { gr.beginPath(); gr.ellipse(0, -38, 56, 30, 0, Math.PI, 0); gr.fill(); }
  else { gr.beginPath(); gr.ellipse(0, -26, 64, 48, 0, Math.PI, 0); gr.fill(); gr.beginPath(); gr.arc(0, -70, 22, 0, 7); gr.fill(); }
  if (p.hat) { gr.fillStyle = '#2a2420'; gr.fillRect(-70, -52, 140, 12); gr.fillRect(-46, -96, 92, 46); }
  if (p.beard) { gr.fillStyle = p.hair; gr.beginPath(); gr.ellipse(0, 52, 46, 34, 0, 0, Math.PI); gr.fill(); }
  // eyes
  const ey = 4, glow = o.glow;
  for (const k of [-1, 1]) {
    gr.fillStyle = o.reveal ? '#000' : '#f4efe6'; gr.beginPath(); gr.ellipse(k * 22, ey, 12 + (o.reveal || 0) * 6, 7 + (o.reveal || 0) * 8, 0, 0, 7); gr.fill();
    if (!o.reveal) { gr.fillStyle = glow ? '#ff2a2a' : p.eyes; gr.beginPath(); gr.arc(k * 22 + (o.look || 0) * 4, ey, 5, 0, 7); gr.fill(); gr.fillStyle = glow ? '#ffd0d0' : '#000'; gr.beginPath(); gr.arc(k * 22 + (o.look || 0) * 4, ey, 2.4, 0, 7); gr.fill(); }
    if (glow) { gr.shadowColor = '#ff2a2a'; gr.shadowBlur = 20; gr.fillStyle = '#ff5a5a'; gr.beginPath(); gr.arc(k * 22, ey, 3, 0, 7); gr.fill(); gr.shadowBlur = 0; }
  }
  gr.strokeStyle = 'rgba(0,0,0,.45)'; gr.lineWidth = 4; gr.beginPath(); gr.moveTo(-34, ey - 16); gr.lineTo(-12, ey - 18); gr.moveTo(12, ey - 18); gr.lineTo(34, ey - 16); gr.stroke();
  if (p.glasses) { gr.strokeStyle = '#111'; gr.lineWidth = 3.5; gr.strokeRect(-38, ey - 11, 30, 22); gr.strokeRect(8, ey - 11, 30, 22); gr.beginPath(); gr.moveTo(-8, ey); gr.lineTo(8, ey); gr.stroke(); }
  gr.fillStyle = 'rgba(0,0,0,.18)'; gr.beginPath(); gr.moveTo(0, 8); gr.lineTo(-7, 30); gr.lineTo(6, 30); gr.fill();
  // mouth
  gr.strokeStyle = '#5a2a22'; gr.lineWidth = 4;
  if (o.reveal) { gr.fillStyle = '#000'; gr.beginPath(); gr.ellipse(0, 50, 26 + o.reveal * 10, 10 + o.reveal * 40, 0, 0, 7); gr.fill(); gr.fillStyle = '#e8e2d0'; for (let i = -3; i <= 3; i++) { gr.beginPath(); gr.moveTo(i * 8 - 4, 42 - o.reveal * 20); gr.lineTo(i * 8, 54 - o.reveal * 10); gr.lineTo(i * 8 + 4, 42 - o.reveal * 20); gr.fill(); } }
  else if (o.smile) { gr.beginPath(); gr.arc(0, 30, 34, .25, Math.PI - .25); gr.stroke(); }
  else { gr.beginPath(); gr.moveTo(-16, 46); gr.quadraticCurveTo(0, 50, 16, 46); gr.stroke(); }
  gr.restore();
}
const PERSON_LOOKS = {
  skin: ['#f1c7a5', '#d9a07a', '#b97850', '#8a5636', '#5e3a24', '#f5d6c0'], hair: ['#1c1410', '#4a2e1a', '#8a5a2b', '#c9a35a', '#d8d2c8', '#7a1f1a', '#2e2e2e'],
  shirt: ['#3a4a6a', '#6a2a2a', '#2a5a3a', '#5a4a2a', '#4a3a5a', '#2a4a5a', '#6a6a6a'], eyes: ['#3a2a1a', '#2a4a7a', '#3a6a3a', '#5a4a2a'],
};
function randomPerson() {
  const L = PERSON_LOOKS, r = a => a[Math.floor(Math.random() * a.length)];
  return { skin: r(L.skin), hair: r(L.hair), style: Math.floor(Math.random() * 4), eyes: r(L.eyes), shirt: r(L.shirt), glasses: Math.random() < .3, beard: Math.random() < .25, hat: Math.random() < .15 };
}
