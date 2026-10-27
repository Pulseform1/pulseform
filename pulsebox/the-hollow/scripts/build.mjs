import {build} from 'esbuild';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const result=await build({absWorkingDir:root,entryPoints:['public/game.js'],bundle:true,write:false,minify:true,format:'iife',target:'es2022',plugins:[{name:'local-browser-modules',setup(b){const aliases={'/world.js':resolve(root,'world.js'),'/levels.js':resolve(root,'levels.js'),'/player-mechanics.js':resolve(root,'player-mechanics.js'),'/engine.js':resolve(root,'engine.js'),'/vendor/three.module.js':resolve(root,'node_modules/three/build/three.module.js')};b.onResolve({filter:/^\//},args=>aliases[args.path]?{path:aliases[args.path]}:null)}}]});
let css=await readFile(resolve(root,'public/style.css'),'utf8');
for(const name of ['barlow-condensed-latin-800-normal.woff2','ibm-plex-mono-latin-400-normal.woff2','inter-latin-400-normal.woff2']){const font=await readFile(resolve(root,'public/fonts',name));css=css.replace(`/fonts/${name}`,`data:font/woff2;base64,${font.toString('base64')}`)}
css+='\n#hostCoop,#join{display:none!important}';
let html=await readFile(resolve(root,'public/index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="/style.css">',`<style>${css}</style>`)
.replace('<link rel="icon" href="/favicon.svg">','<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 fill=%22%23101b13%22/%3E%3Ctext x=%2215%22 y=%2249%22 font-size=%2246%22 fill=%22%23e75c31%22%3EH%3C/text%3E%3C/svg%3E">')
.replace('<script type="module" src="/game.js"></script>',()=>`<script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`)
.replace('href="/"','href=""').replace('ONLINE CO-OP','PORTABLE SOLO EDITION')
.replace('3D MONSTER BUILD 7.0','3D MONSTER BUILD 7.0 · SOLO');
await mkdir(resolve(root,'dist'),{recursive:true});
await writeFile(resolve(root,'dist/THE-HOLLOW.html'),html);
await writeFile(resolve(root,'THE-HOLLOW.html'),html);
await writeFile(resolve(root,'dist/THE-HOLLOW-3D-BUILD-7.html'),html);
console.log(`Built dist/THE-HOLLOW.html (${Math.round(Buffer.byteLength(html)/1024)} KB). Open directly in a browser; no install or network required.`);
