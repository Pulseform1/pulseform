// Builds FRONTIER HUNTER for box.pulseform.org: public/games/frontier-hunter.html, one self-contained page with the
// game, three.js and the generation worker inlined. Source lives in frontier/ (run `npm ci` there first).
// Run from anywhere: node tools/build-frontier.mjs [--dev]   (--dev skips minifying, for debugging)
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..'), root = resolve(here, 'frontier'), dev = process.argv.includes('--dev');
const { build } = createRequire(resolve(root, 'package.json'))('esbuild');
const common = { absWorkingDir: root, bundle: true, write: false, minify: !dev, target: 'es2022', legalComments: 'none' };
const worker = await build({ ...common, entryPoints: ['src/worker.js'], format: 'iife' });
const game = await build({ ...common, entryPoints: ['src/main.js'], format: 'esm', define: { __WORKER__: JSON.stringify(worker.outputFiles[0].text) } });
const css = await readFile(resolve(root, 'public/style.css'), 'utf8');
let html = await readFile(resolve(root, 'public/index.html'), 'utf8');
const from = ['<link rel="stylesheet" href="style.css">', '<script type="module" src="main.js"></script>'];
for (const s of from) if (!html.includes(s)) throw new Error('frontier/public/index.html changed shape; update tools/build-frontier.mjs (' + s + ')');
html = html.replace(from[0], () => `<style>${css}</style>`).replace(from[1], () => `<script type="module">${game.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')}</script>`);
await writeFile(resolve(here, 'public/games/frontier-hunter.html'), html);
console.log(`public/games/frontier-hunter.html ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
