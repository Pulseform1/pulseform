// Builds MYTHIC ARMIES for box.pulseform.org: public/games/mythic-armies.html, one self-contained page.
// Source lives in src/games/mythic-armies/ (shell.html, style.css and numbered NN-name.js files, joined in order).
// three.js r128 is loaded from cdnjs like the other three.js games. Run from anywhere: node tools/build-mythic-armies.mjs
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const here = resolve(import.meta.dirname, '..'), dir = resolve(here, 'src/games/mythic-armies');
const files = (await readdir(dir)).filter(f => /^\d\d-[\w-]+\.js$/.test(f)).sort();
let js = '';
const problems = [];
for (const f of files) {
  const src = await readFile(resolve(dir, f), 'utf8');
  src.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (!t.startsWith('//') && /[;{}),\]]\s*\/\/(\s|$)/.test(line)) problems.push(`${f}:${i + 1} has a // comment after code`);
  });
  js += `\n/* ===== ${f} ===== */\n` + src;
}
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const css = await readFile(resolve(dir, 'style.css'), 'utf8');
let html = await readFile(resolve(dir, 'shell.html'), 'utf8');
for (const k of ['<!--STYLE-->', '<!--SCRIPT-->']) if (!html.includes(k)) throw new Error('shell.html is missing ' + k);
html = html.replace('<!--STYLE-->', () => `<style>\n${css}</style>`)
  .replace('<!--SCRIPT-->', () => `<script>\n(function () {\n${js.replace(/<\/script/gi, '<\\/script')}\n})();\n</script>`);
if (/#ff4655/i.test(html)) throw new Error('forbidden colour #ff4655 found');
await writeFile(resolve(here, 'public/games/mythic-armies.html'), html);
console.log(`public/games/mythic-armies.html ${Math.round(Buffer.byteLength(html) / 1024)} KB from ${files.length} scripts`);
