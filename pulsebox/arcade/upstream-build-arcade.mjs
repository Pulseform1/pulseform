import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const result=await build({absWorkingDir:root,entryPoints:['public/arcade/app.js'],bundle:true,write:false,minify:true,format:'iife',target:'es2022',plugins:[{name:'local-three',setup(b){b.onResolve({filter:/^\/vendor\/three.module.js$/},()=>({path:resolve(root,'node_modules/three/build/three.module.js')}))}}]});
let css=await readFile(resolve(root,'public/arcade/style.css'),'utf8');
for(const name of ['barlow-condensed-latin-800-normal.woff2','ibm-plex-mono-latin-400-normal.woff2','inter-latin-400-normal.woff2']){const font=await readFile(resolve(root,'public/fonts',name));css=css.replaceAll(`/fonts/${name}`,`data:font/woff2;base64,${font.toString('base64')}`)}
for(const [name,key] of [['covers.webp','cover-sheet'],['neon-hero.webp','hero-art']]){const art=await readFile(resolve(root,'public/arcade/art',name));css=css.replaceAll(`url('/arcade/art/${name}')`,`var(--${key})`);css+=`\n:root{--${key}:url(\"data:image/webp;base64,${art.toString('base64')}\")}`}
let html=await readFile(resolve(root,'public/arcade/index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="/arcade/style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="/arcade/app.js"></script>',()=>`<script>${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`).replace('href="/favicon.svg"','href="data:,"').replaceAll('href="/arcade/"','href=""').replaceAll('href="/"','href="THE-HOLLOW.html"');
// Trim whitespace emitted inside bundled shader source for clean generated diffs.
html=html.replace(/[ \t]+$/gm,'');
await writeFile(resolve(root,'AFTERHOURS.html'),html);
await mkdir(resolve(root,'playable-games'),{recursive:true});
const titles={neon:'NEON-OVERDRIVE',deep:'DEEP-SIGNAL',ash:'ASHFALL-ARENA',sky:'SKYBOUND',chamber:'CHAMBER-ZERO'};
for(const [id,title] of Object.entries(titles))await writeFile(resolve(root,'playable-games',title+'.html'),html.replace('<body>',`<body data-start-game="${id}">`).replace('href="THE-HOLLOW.html"','href="../THE-HOLLOW.html"').replace('<title>AFTERHOURS — Five worlds. One crew.</title>',`<title>${title.replaceAll('-',' ')} — AFTERHOURS</title>`));
console.log(`Built AFTERHOURS.html and five portable game pages (${Math.round(Buffer.byteLength(html)/1024)} KB each). Solo works offline; co-op uses the Node server.`);
