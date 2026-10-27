// Builds THE HOLLOW for box.pulseform.org: public/games/the-hollow.html, one self-contained page with solo and online co-op.
// The game's own source lives untouched in the-hollow/ (run `npm ci` there first). This mirrors the-hollow/scripts/build.mjs,
// which makes the solo-only portable file, with two differences: the co-op buttons stay, and the game connects to
// wss://<this site>/api/hollow, where the HollowRooms Durable Object (hollow-rooms.js) runs the same engine as server.js.
// Run from anywhere: node tools/build-hollow.mjs
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..'), root = resolve(here, 'the-hollow');
const { build } = createRequire(resolve(root, 'package.json'))('esbuild');
const aliases = { '/world.js': 'world.js', '/levels.js': 'levels.js', '/player-mechanics.js': 'player-mechanics.js', '/engine.js': 'engine.js', '/horror-director.js': 'horror-director.js', '/vendor/three.module.js': 'node_modules/three/build/three.module.js' };
const WS_FROM = '://${location.host}`', WS_TO = '://${location.host}/api/hollow`';
const result = await build({
  absWorkingDir: root, entryPoints: ['public/game.js'], bundle: true, write: false, minify: true, format: 'iife', target: 'es2022',
  plugins: [{ name: 'hollow-site', setup(b) {
    b.onResolve({ filter: /^\// }, a => aliases[a.path] ? { path: resolve(root, aliases[a.path]) } : null);
    b.onLoad({ filter: /public[\\/]game\.js$/ }, async a => {
      const src = await readFile(a.path, 'utf8');
      if (!src.includes(WS_FROM)) throw new Error('game.js no longer opens its WebSocket the expected way; update build-hollow.mjs');
      return { contents: src.replace(WS_FROM, WS_TO), loader: 'js', resolveDir: resolve(root, 'public') };
    });
  } }],
});
let css = await readFile(resolve(root, 'public/style.css'), 'utf8');
for (const name of ['barlow-condensed-latin-800-normal.woff2', 'ibm-plex-mono-latin-400-normal.woff2', 'inter-latin-400-normal.woff2']) {
  const font = await readFile(resolve(root, 'public/fonts', name)); css = css.replace(`/fonts/${name}`, `data:font/woff2;base64,${font.toString('base64')}`);
}
const icon = await readFile(resolve(root, 'public/favicon.svg'));
let html = await readFile(resolve(root, 'public/index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="/style.css">', `<style>${css}</style>`)
  .replace('<link rel="icon" href="/favicon.svg">', `<link rel="icon" href="data:image/svg+xml;base64,${icon.toString('base64')}">`)
  .replace('<script type="module" src="/game.js"></script>', () => `<script>${result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace('href="/"', 'href=""');
for (const s of ['<style>', '<script>']) if (!html.includes(s)) throw new Error('the-hollow/public/index.html changed shape; update build-hollow.mjs');
await writeFile(resolve(here, 'public/games/the-hollow.html'), html);
console.log(`public/games/the-hollow.html ${Math.round(Buffer.byteLength(html) / 1024)} KB (solo + online co-op via /api/hollow)`);
