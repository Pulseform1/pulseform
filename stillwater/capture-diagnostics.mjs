/** Small local-only diagnostic buffer. Never stores input, identities or headers. */
const EVENTS=new Set(['request','guarded','grant','active','rejected','timeout','unsupported','released','release-requested','cancelled','late-grant','resolved-unconfirmed']);
const STRINGS={version:40,source:24,event:24,reason:64,errorName:80,errorMessage:500,visibility:16};
const BOOLEANS=['supported','activation','hasActivation','actualLocked','controlsCaptured','embedded','focused'];
const NUMBERS=['attempt','requestedAt','at'];
export function sanitizeCaptureReport(value){
  if(!value||Array.isArray(value)||typeof value!=='object')return null;
  const allowed=new Set([...Object.keys(STRINGS),...BOOLEANS,...NUMBERS]);
  if(Object.keys(value).some(key=>!allowed.has(key))||!EVENTS.has(value.event))return null;
  const out={};
  for(const [key,max]of Object.entries(STRINGS)){if(typeof value[key]!=='string'||value[key].length>max)return null;out[key]=value[key];}
  for(const key of BOOLEANS){if(value[key]!==null&&typeof value[key]!=='boolean')return null;out[key]=value[key];}
  for(const key of NUMBERS){if(!Number.isFinite(value[key])||value[key]<0||value[key]>Number.MAX_SAFE_INTEGER)return null;out[key]=value[key];}
  return out;
}
export function createCaptureDiagnostics({now=Date.now,capacity=64,lifetime=15*60*1000}={}){
  let records=[],sequence=0;
  const prune=()=>{const cutoff=now()-lifetime;records=records.filter(record=>record.receivedAt>=cutoff);};
  return{add(value){const clean=sanitizeCaptureReport(value);if(!clean)return false;prune();records.push({...clean,sequence:++sequence,receivedAt:now()});if(records.length>capacity)records.splice(0,records.length-capacity);return true;},read(){prune();return records.map(r=>({...r}));}};
}
export function isLocalCaptureRequest(req,port,{write=false}={}){
  const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`]);
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!hosts.has(req.headers.host)||req.headers['x-stillwater-capture']!=='1')return false;
  if(!req.headers.origin)return !write;
  try{const origin=new URL(req.headers.origin);return origin.protocol==='http:'&&origin.host===req.headers.host;}catch{return false;}
}
