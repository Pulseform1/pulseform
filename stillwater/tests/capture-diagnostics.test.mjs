import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeCaptureReport,createCaptureDiagnostics,isLocalCaptureRequest} from '../capture-diagnostics.mjs';
import {createCaptureReporter} from '../public/capture-report.js';
const record={version:'abyss-17',source:'game',event:'request',reason:'',errorName:'',errorMessage:'',visibility:'visible',supported:true,activation:true,hasActivation:true,actualLocked:false,controlsCaptured:false,embedded:true,focused:true,attempt:1,requestedAt:100,at:100};
test('capture records accept only bounded API/lifecycle fields and never arbitrary input data',()=>{
 assert.deepEqual(sanitizeCaptureReport(record),record);
 for(const change of [{x:24},{keys:['W']},{cookie:'secret'},{errorMessage:'x'.repeat(501)},{actualLocked:'true'},{event:'mousemove'},{at:Infinity}])assert.equal(sanitizeCaptureReport({...record,...change}),null);
 let time=100;const store=createCaptureDiagnostics({now:()=>time,capacity:3,lifetime:50});for(let i=0;i<6;i++)store.add({...record,attempt:i});assert.deepEqual(store.read().map(r=>r.attempt),[3,4,5]);store.read()[0].reason='mutated';assert.equal(store.read()[0].reason,'');time=151;assert.deepEqual(store.read(),[]);
});
test('capture inspection and reporting require loopback host/header plus same-origin writes',()=>{
 const req={socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:4173','x-stillwater-capture':'1',origin:'http://127.0.0.1:4173'}};
 assert.equal(isLocalCaptureRequest(req,4173,{write:true}),true);
 for(const mutate of [r=>r.socket.remoteAddress='192.168.1.3',r=>r.headers.host='evil.test:4173',r=>r.headers.origin='https://evil.test',r=>delete r.headers['x-stillwater-capture'],r=>delete r.headers.origin]){const r=structuredClone(req);mutate(r);assert.equal(isLocalCaptureRequest(r,4173,{write:true}),false);}
 const r=structuredClone(req);delete r.headers.origin;assert.equal(isLocalCaptureRequest(r,4173),true);
});
test('browser reporter remains local and omits credentials without recording movement or key state',async()=>{
 const calls=[],fetch=async(...args)=>{calls.push(args);};const local={protocol:'http:',hostname:'127.0.0.1'};
 createCaptureReporter('abyss-17','game',{location:local,fetch})(Object.fromEntries(Object.entries(record).filter(([k])=>!['version','source'].includes(k))));assert.equal(calls.length,1);assert.equal(calls[0][0],'/capture-diagnostics');assert.equal(calls[0][1].credentials,'omit');assert.deepEqual(JSON.parse(calls[0][1].body),record);
 createCaptureReporter('abyss-17','game',{location:{protocol:'https:',hostname:'example.com'},fetch})(record);assert.equal(calls.length,1);
});
