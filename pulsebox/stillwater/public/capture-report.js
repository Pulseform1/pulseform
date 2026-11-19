/** Reports browser capture outcomes only to this computer's local game server. */
export function createCaptureReporter(version,source='game',{location=globalThis.location,fetch=globalThis.fetch}={}){
  const enabled=location?.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  return detail=>{if(!enabled||typeof fetch!=='function')return;
    const record={version:String(version).slice(0,40),source:String(source).slice(0,24),...detail};
    try{void fetch('/capture-diagnostics',{method:'POST',headers:{'Content-Type':'application/json','X-Stillwater-Capture':'1'},body:JSON.stringify(record),credentials:'omit',cache:'no-store',keepalive:true}).catch(()=>{});}catch{}
  };
}
