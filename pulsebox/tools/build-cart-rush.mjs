// Builds public/games/cart-rush.html from src/cart-rush/ (one self-contained page: Three.js, code, styles).
// Needs three@0.180.0 and esbuild. Point CART_TOOLS at a folder whose node_modules has them:
//   mkdir /tmp/crt && cd /tmp/crt && npm i three@0.180.0 esbuild && CART_TOOLS=/tmp/crt node tools/build-cart-rush.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), src = path.join(root, 'src/cart-rush');
const tools = process.env.CART_TOOLS || root, req = createRequire(path.join(tools, 'package.json'));
const { build } = await import(req.resolve('esbuild'));
const threeDir = path.dirname(req.resolve('three'));
const out = await build({ entryPoints: [path.join(src, 'main.js')], bundle: true, write: false, minify: true, format: 'iife', target: ['es2022'], legalComments: 'inline',
  alias: { three: path.join(threeDir, 'three.module.js'), 'three/addons': path.resolve(threeDir, '../examples/jsm') } });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let html = await readFile(path.join(src, 'index.html'), 'utf8');
const css = await readFile(path.join(src, 'main.css'), 'utf8');
html = html.replace(/<script\b[^>]*type=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi, '');
const a = html.replace(/<link\b[^>]*href=["'](?:\.\/)?styles\/main\.css["'][^>]*>/i, () => `<style>${css}</style>`);
const b = a.replace(/<script\b[^>]*src=["'](?:\.\/)?src\/main\.js["'][^>]*>\s*<\/script>/i, () => `<script>${js}</script>`);
if (a === html || b === a) throw Error('could not inline styles or script');
const license = (await readFile(path.join(src, 'LICENSE.txt'), 'utf8')).replace(/--/g, '- -');
await writeFile(path.join(root, 'public/games/cart-rush.html'), b.replace('<!doctype html>', '<!doctype html>\n<!-- CART RUSH: Security Showdown, polished for Pulsebox.\n' + license + '-->'));
console.log('built public/games/cart-rush.html', b.length, 'bytes');
