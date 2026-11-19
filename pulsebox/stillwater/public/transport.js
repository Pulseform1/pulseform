// A connection owns its input sequence across every run and retry.
export class InputSequence {
  constructor(){this.value=0;}
  next(){return ++this.value;}
}
// Locally (npm start) one server holds every room at /ws. On Pulsebox the page sets globalThis.STILLWATER_ROOMS (the
// rooms address): each room runs on its own server instance, so the room code goes in the address (or create=1 for a new one).
export function socketURL(location,payload){
  const base=`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}`,rooms=globalThis.STILLWATER_ROOMS;
  if(rooms)return `${base}${rooms}?${payload?.type==='join'&&payload.code?'code='+encodeURIComponent(String(payload.code).trim().toUpperCase()):'create=1'}`;
  return `${base}/ws`;
}

// Bound network angles without limiting continuous physical mouse turns.
export function wrapYaw(value){return Number.isFinite(value)?((value+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI:0;}
