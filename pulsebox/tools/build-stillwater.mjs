// Builds STILLWATER for box.pulseform.org: public/games/stillwater.html, one self-contained page (the game and three.js).
// The game's own source lives in stillwater/ (run `npm ci` there first) and still runs on its own with `npm start`.
// On the site the page sets STILLWATER_ROOMS, so the game connects to wss://<this site>/api/stillwater/ws, where each
// room is its own StillwaterRoom Durable Object (stillwater-rooms.js) running the same simulation as server.mjs.
// Run from anywhere: node tools/build-stillwater.mjs
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..'), root = resolve(here, 'stillwater');
const { build } = createRequire(resolve(root, 'package.json'))('esbuild');
const three = resolve(root, 'node_modules/three/build/three.module.js');
const aliases = { 'three': three, '/vendor/three.module.js': three, '/vendor/RoundedBoxGeometry.js': resolve(root, 'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'), '/shared/simulation.js': resolve(root, 'shared/simulation.js') };
const result = await build({
  absWorkingDir: root, entryPoints: ['public/app.js'], bundle: true, write: false, minify: true, format: 'esm', target: 'es2022', legalComments: 'none',
  plugins: [{ name: 'stillwater-site', setup(b) { b.onResolve({ filter: /^(three|\/.*)$/ }, a => aliases[a.path] ? { path: aliases[a.path] } : null); } }],
});
let css = await readFile(resolve(root, 'public/style.css'), 'utf8');
// on the site there is no local server to open another browser with
css += '\n[data-action="open-browser"]{display:none!important}';
let html = await readFile(resolve(root, 'public/index.html'), 'utf8');
const from = ['<link rel="stylesheet" href="/style.css">', '<script type="importmap">{"imports":{"three":"/vendor/three.module.js"}}</script>', '<script type="module" src="/app.js"></script>'];
for (const s of from) if (!html.includes(s)) throw new Error('stillwater/public/index.html changed shape; update tools/build-stillwater.mjs (' + s + ')');
html = html.replace(from[0], () => `<style>${css}</style>`).replace(from[1], '')
  .replace(from[2], () => `<script>globalThis.STILLWATER_ROOMS='/api/stillwater/ws';</script><script type="module">${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
await writeFile(resolve(here, 'public/games/stillwater.html'), html);
console.log(`public/games/stillwater.html ${Math.round(Buffer.byteLength(html) / 1024)} KB (solo + friends rooms via /api/stillwater/ws)`);
