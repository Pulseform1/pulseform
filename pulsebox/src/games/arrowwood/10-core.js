(() => {
  'use strict';
  /* ---------- 10 core: the shared world and engine, small helpers, settings, the player key, the server address ---------- */
// @share arrowwood/shared/world.js as W
// @share arrowwood/server/engine.js as ENG
  const TAU = Math.PI * 2, cl = (v, a, b) => v < a ? a : v > b ? b : v, lp = (a, b, t) => a + (b - a) * t, sm = x => x * x * (3 - 2 * x);
  const ease = (cur, to, rate, dt) => cur + (to - cur) * (1 - Math.exp(-rate * dt));
  const angD = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
  const now = () => performance.now() / 1000;
  const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const QS = new URLSearchParams(location.search), DEV = QS.has('dev');
  // a tester copy (opened anywhere but Pulsebox or a local server): bots and the range work, online rooms and coins are off, every bow is unlocked to try
  const TESTER = QS.has('tester') || (typeof window !== 'undefined' && !!window.AW_TESTER) || !/(^|\.)pulseform\.org$|^localhost$|^127\.0\.0\.1$/.test(location.hostname);
  const BUS = {}; const on = (n, f) => (BUS[n] || (BUS[n] = [])).push(f); const emit = (n, a, b, c) => { for (const f of BUS[n] || []) f(a, b, c); };
  // FFA colours (team modes use Moss green and Russet)
  const FFA_COLS = ['#7fae5a', '#c7743e', '#5b8fc7', '#c9a23f', '#9b6fc2', '#4fb3a4', '#c2627d', '#e0e0d8'];
  const teamCol = (team, slot, mode) => mode === 'ffa' ? FFA_COLS[(slot | 0) % 8] : W.TEAMS[team | 0].col;

  // settings (kept in the kit's save for this game)
  const CFG = { quality: 'auto', sens: .5, touchSens: .5, invert: false, vol: .8, fov: 75, name: '', fps: false };
  const loadCfg = () => { try { Object.assign(CFG, (K.save.aw || {}).cfg || {}); } catch (e) {} };
  const saveCfg = () => { try { K.save.aw = Object.assign(K.save.aw || {}, { cfg: CFG }); K.persist(); } catch (e) {} };
  const quality = () => QS.get('quality') || (CFG.quality !== 'auto' ? CFG.quality : (isTouch() || /iPad|iPhone|Android/.test(navigator.userAgent)) ? 'low' : (navigator.hardwareConcurrency || 4) >= 8 ? 'high' : 'medium');

  // the private player key: made once in this browser; the server keeps only a hash of it with your coins and bows
  const KEY = (() => { let k = ''; try { k = localStorage.getItem('aw-key') || ''; } catch (e) {} if (!/^[a-f0-9]{32}$/.test(k)) { k = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('aw-key', k); } catch (e) {} } return k; })();
  // where the multiplayer server is: ?server=wss://host overrides; else the site this page came from (box.pulseform.org)
  const SERVER = (() => {
    let s = QS.get('server') || (typeof window !== 'undefined' && window.ARROWWOOD_SERVER) || '';
    if (!s) s = location.protocol === 'file:' ? 'https://box.pulseform.org' : location.origin;
    s = s.replace(/\/+$/, ''); const http = s.replace(/^ws/, 'http'); return { http, ws: http.replace(/^http/, 'ws') };
  })();
  const api = async (path, body) => {
    const r = await fetch(SERVER.http + '/api/arrowwood/' + path, { method: body ? 'POST' : 'GET', headers: { 'x-aw-key': KEY, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return r.json();
  };
  const PROFILE = { coins: 0, owned: ['longbow'], equipped: 'longbow', loaded: false, err: '' };
  async function loadProfile() { if (TESTER) { Object.assign(PROFILE, { coins: 0, owned: W.BOW_IDS.slice(), loaded: true, err: '' }); try { const e = localStorage.getItem('aw-tester-bow'); if (W.BOW_IDS.includes(e)) PROFILE.equipped = e; } catch (er) {} emit('profile'); return PROFILE; }
    try { const p = await api('profile'); if (p && !p.error) { Object.assign(PROFILE, p, { loaded: true, err: '' }); emit('profile'); } else PROFILE.err = (p && p.error) || 'offline'; } catch (e) { PROFILE.err = 'Could not reach the server for your coins.'; } return PROFILE; }
  const myName = () => CFG.name || (CFG.name = 'Archer ' + (100 + Math.floor(Math.random() * 900)), saveCfg(), CFG.name);
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const heading = yaw => { const d = ((-yaw * 180 / Math.PI) % 360 + 360) % 360; return { deg: Math.round(d), name: COMPASS[Math.round(d / 45) % 8] }; };   // yaw 0 faces north (-Z), turning right is clockwise
