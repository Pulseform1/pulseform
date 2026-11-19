import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer} from '../server.mjs';

test('explicit local launch opens only a fixed local game URL and rejects untrusted or parameterized requests',async t=>{
 const calls=[],server=createGameServer({launchBrowser:async url=>(calls.push(url),{browser:'Google Chrome'})}),address=await server.start(0);t.after(()=>server.close());const origin=`http://127.0.0.1:${address.port}`,headers={Origin:origin,'X-Stillwater-Launch':'1'};
 for(const [path,options,status]of [
  ['/open-browser',{},405],['/open-browser',{method:'POST'},403],['/open-browser',{method:'POST',headers:{...headers,Origin:'http://attacker.invalid'}},403],
  ['/open-browser',{method:'POST',headers:{...headers,Host:`evil.invalid:${address.port}`,Origin:`http://evil.invalid:${address.port}`}},403],
  ['/open-browser?url=https://attacker.invalid',{method:'POST',headers},400],['/open-browser',{method:'POST',headers,body:'command=open'},400]
 ]){const r=await fetch(origin+path,options);assert.equal(r.status,status,path);}
 assert.equal(calls.length,0);const response=await fetch(origin+'/open-browser',{method:'POST',headers}),body=await response.json();assert.equal(response.status,200);assert.equal(body.browser,'Google Chrome');assert.deepEqual(calls,[origin+'/?v=18&look=capture']);assert.equal((await fetch(origin+'/open-browser',{method:'POST',headers})).status,429);assert.equal(calls.length,1);
});
test('OS opener failure returns actionable failure and never claims the browser opened',async t=>{
 const server=createGameServer({launchBrowser:async()=>{throw Error('OS launch denied');}}),address=await server.start(0);t.after(()=>server.close());const origin=`http://127.0.0.1:${address.port}`;
 const response=await fetch(origin+'/open-browser',{method:'POST',headers:{Origin:origin,'X-Stillwater-Launch':'1'}}),body=await response.json();assert.equal(response.status,503);assert.match(body.message,/Copy the game link/);assert.notEqual(body.ok,true);
});
