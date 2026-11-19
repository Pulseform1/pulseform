// A local stand-in for box.pulseform.org for STILLWATER: serves public/ and runs the rooms with the real StillwaterRoom
// class (stillwater-rooms.js), one instance per room code, as the Worker and Durable Objects do.
//   node tools/stillwater-site-server.mjs [port]     then open http://localhost:<port>/games/stillwater.html
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { resolve, extname } from 'node:path'; import { createRequire } from 'node:module';
import { StillwaterRoom, newRoomCode } from '../stillwater-rooms.js';
const here = resolve(import.meta.dirname, '..'), pub = resolve(here, 'public'), PORT = +(process.argv[2] || 8795);
const { WebSocketServer } = createRequire(resolve(here, 'stillwater/package.json'))('ws');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp4': 'video/mp4' };
const rooms = new Map();
const server = http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname), file = resolve(pub, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(pub)) { res.writeHead(403); return res.end(); }
  try { const body = await readFile(file); res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body); } catch (e) { res.writeHead(404); res.end('not found'); }
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x'); if (url.pathname !== '/api/stillwater/ws') return socket.destroy();
  let code = (url.searchParams.get('code') || '').toUpperCase(); const create = url.searchParams.has('create');
  if (!create && !/^[A-F0-9]{6}$/.test(code)) return socket.destroy();
  if (create) do code = newRoomCode(); while (rooms.has(code));
  if (!rooms.has(code)) rooms.set(code, new StillwaterRoom({}, {}));
  wss.handleUpgrade(req, socket, head, ws => rooms.get(code).connect(ws, { code, create }));
});
server.listen(PORT, () => console.log(`STILLWATER site stand-in on http://localhost:${PORT}/games/stillwater.html`));
