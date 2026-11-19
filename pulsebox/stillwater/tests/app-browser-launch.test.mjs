import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('actual browser-launch action requires a trusted user click and is never started by fallback alone',async()=>{
 let click,calls=0;const begin=source.indexOf("document.addEventListener('click',async e=>{"),end=source.indexOf("document.addEventListener('input'",begin);
 const c={document:{addEventListener:(name,fn)=>click=fn},openBrowser:async()=>calls++};vm.runInNewContext(source.slice(begin,end),c);
 const target={closest:selector=>selector==='[data-action]'?{dataset:{action:'open-browser'}}:null};
 await click({target,isTrusted:false});assert.equal(calls,0);await click({target,isTrusted:true});assert.equal(calls,1);
});
test('external-browser launch selects capture once without permanently overriding keyboard preference',()=>{
 const begin=source.indexOf('const launchURL='),end=source.indexOf('\nlet best=',begin);let replaced;
 const c={URL,location:{href:'http://127.0.0.1:4173/?v=16&look=capture'},settings:{lookMode:'keyboard'},storage:{set(){}},history:{replaceState:(_a,_b,url)=>replaced=url.href}};
 vm.runInNewContext(source.slice(begin,end),c);assert.equal(c.settings.lookMode,'capture');assert.equal(replaced,'http://127.0.0.1:4173/?v=16');
});
