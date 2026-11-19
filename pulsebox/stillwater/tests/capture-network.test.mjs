import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../server.mjs';
const record={version:'abyss-17',source:'test',event:'request',reason:'',errorName:'',errorMessage:'',visibility:'visible',supported:true,activation:true,hasActivation:true,actualLocked:false,controlsCaptured:false,embedded:true,focused:true,attempt:1,requestedAt:100,at:100};
test('actual local HTTP capture buffer rejects foreign origins, arbitrary fields and oversized bodies',async t=>{
 const server=createGameServer(),address=await server.start(0);t.after(()=>server.close());const base=`http://127.0.0.1:${address.port}`,url=base+'/capture-diagnostics',headers={Origin:base,'X-Stillwater-Capture':'1','Content-Type':'application/json'};
 assert.equal((await fetch(url)).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{...headers,Origin:'http://attacker.invalid'},body:JSON.stringify(record)})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers:{...headers,Host:`evil.invalid:${address.port}`,Origin:`http://evil.invalid:${address.port}`},body:JSON.stringify(record)})).status,403);
 assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({...record,keys:['W']})})).status,400);
 assert.equal((await fetch(url,{method:'POST',headers,body:'x'.repeat(2049)})).status,413);
 assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(record)})).status,202);
 const response=await fetch(url,{headers:{'X-Stillwater-Capture':'1'}}),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(body.records.length,1);assert.equal(body.records[0].event,'request');assert.equal(body.records[0].source,'test');assert.ok(body.records[0].receivedAt);assert.equal(body.records[0].address,undefined);
});
