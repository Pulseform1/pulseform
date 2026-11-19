/* ARROWWOOD local server: serves the Pulsebox pages (../public) and runs the multiplayer API with the same engine and bank
   the Cloudflare Durable Objects use. Profiles are kept in a JSON file.
     cd arrowwood && npm install && node server/node-server.js [--port 8790] [--dev] [--public ../public] [--data .data]
   Then open http://localhost:8790/games/arrowwood.html  (or point any copy of the client at it with ?server=ws://HOST:8790).
   --dev shortens the timers and allows test teleports (for the automated checks only). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createRoom, join, message, drop, step, drain, due, TICK } from './engine.js';
import * as Bank from './bank.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const PORT = +arg('port', process.env.PORT || 8790), DEV = process.argv.includes('--dev');
const PUB = path.resolve(HERE, arg('public', '../../public')), DATA = path.resolve(HERE, arg('data', '../.data'));
fs.mkdirSync(DATA, { recursive: true });
const FILE = path.join(DATA, 'profiles.json');
let db = {}; try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) {}
let saveT = null;
const store = { get: async k => db[k], put: async (k, v) => { db[k] = v; clearTimeout(saveT); saveT = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(db)), 200); } };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
const json = (res, b, s = 200) => { res.writeHead(s, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'x-aw-key, content-type' }); res.end(JSON.stringify(b)); };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return json(res, {});
  const peek = /^\/api\/arrowwood\/room\/([A-Za-z0-9]{4,6})$/.exec(url.pathname);
  if (peek) { const r = rooms.get(peek[1].toUpperCase()); return json(res, { game: 'arrowwood', players: r ? [...r.room.players.values()].filter(p => !p.dummy && p.connected).length : 0, mode: r && r.room.mode, phase: r && r.room.phase }); }
  if (url.pathname.startsWith('/api/arrowwood/')) {
    const sub = url.pathname.slice(15), id = await Bank.profileId(req.headers['x-aw-key'] || '');
    if (!id) return json(res, { error: 'missing player key' }, 400);
    if (sub === 'profile') return json(res, await Bank.profile(store, id));
    if (sub === 'devgrant' && DEV) return json(res, await Bank.grant(store, id, 'dev-' + Date.now() + Math.random(), 1000, false));   // test coins, --dev only
    if (sub === 'earn') { let body = ''; for await (const c of req) { body += c; if (body.length > 200) break; } let b = {}; try { b = JSON.parse(body); } catch (e) {} return json(res, await Bank.earn(store, id, String(b.kind || ''), b.n | 0, String(b.match || ''))); }
    if (sub === 'buy' || sub === 'equip') { let body = ''; for await (const c of req) { body += c; if (body.length > 200) break; } let b = {}; try { b = JSON.parse(body); } catch (e) {} return json(res, await Bank[sub](store, id, String(b.bow || ''))); }
    return json(res, { error: 'not found' }, 404);
  }
  if (url.pathname.startsWith('/api/')) return json(res, { ok: true });   // the hub's stats calls: nothing to do locally
  let f = path.join(PUB, decodeURIComponent(url.pathname)); if (!f.startsWith(PUB)) return json(res, { error: 'no' }, 403);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(res);
});

// rooms: one engine per code, ticking while anyone is in it
const rooms = new Map();
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on('upgrade', (req, sock, head) => {
  const m = /^\/api\/arrowwood\/room\/([A-Za-z0-9]{4,6})$/.exec(new URL(req.url, 'http://x').pathname);
  if (!m) return sock.destroy();
  wss.handleUpgrade(req, sock, head, ws => onSocket(ws, m[1].toUpperCase()));
});
function onSocket(ws, code) {
  let id = null, R = null;
  const out = m => { try { ws.send(JSON.stringify(m)); } catch (e) {} };
  ws.on('message', async data => {
    let m; try { m = JSON.parse(String(data)); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (!id) {
      if (m.t !== 'hello') return;
      const pid = await Bank.profileId(m.key || ''), prof = pid ? await Bank.profile(store, pid) : null;
      let r = rooms.get(code); const active = r && [...r.room.players.values()].some(p => !p.dummy);
      if (m.create && active) return out({ t: 'err', code: 'taken', msg: 'That code is taken. Making another...' });
      if (!m.create && !active) return out({ t: 'err', code: 'nocode', msg: 'No room with that code. Check it with your friend.' });
      if (m.create || !r) { if (r) clearInterval(r.timer); r = { room: createRoom({ code, mode: (m.create && m.create.mode) || '1v1', oneShot: m.create && m.create.oneShot, map: (m.create && m.create.map) || (DEV ? 'kingswood' : 'random'), dev: DEV, grant: (p, match, coins, won) => Bank.grant(store, p, match, coins, won) }), socks: new Map(), idle: 0 }; rooms.set(code, r); r.timer = setInterval(() => loop(code), TICK * 1000); }
      const j = join(r.room, { name: m.name, profile: pid, bow: prof && prof.equipped, token: m.token }, Date.now());
      if (j.err) return out({ t: 'err', code: 'full', msg: j.err });
      id = j.id; R = r; r.socks.set(id, ws); flush(r); return;
    }
    if (m.t === 'bow') { const p = R.room.players.get(id), prof = p && p.profile ? await Bank.profile(store, p.profile) : null; message(R.room, id, { t: 'bow', bow: m.bow, ok: !!(prof && prof.owned.includes(m.bow)) }); flush(R); return; }
    message(R.room, id, m, Date.now());
  });
  ws.on('close', () => { if (R && R.socks.get(id) === ws) { R.socks.delete(id); drop(R.room, id, Date.now()); flush(R); } });
}
function loop(code) {
  const r = rooms.get(code); if (!r) return;
  const now = Date.now(); for (let n = due(r.room, now); n > 0; n--) step(r.room, now); flush(r);
  if (!r.socks.size) { r.idle += TICK; if (r.idle > 60 || ![...r.room.players.values()].some(p => !p.dummy)) { clearInterval(r.timer); rooms.delete(code); } } else r.idle = 0;
}
function flush(r) {
  for (const { to, m } of drain(r.room)) {
    const s = JSON.stringify(m);
    if (to === '*') { for (const ws of r.socks.values()) if (ws.readyState === 1) ws.send(s); }
    else { const ws = r.socks.get(to); if (ws && ws.readyState === 1) ws.send(s); }
  }
}
server.listen(PORT, () => console.log(`ARROWWOOD server on http://localhost:${PORT}  (pages from ${PUB}${DEV ? ', dev timers' : ''})`));
