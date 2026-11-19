// A connection owns its input sequence across every run and retry.
export class InputSequence {
  constructor(){this.value=0;}
  next(){return ++this.value;}
}
export function socketURL(location){
  return `${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws`;
}

// Bound network angles without limiting continuous physical mouse turns.
export function wrapYaw(value){return Number.isFinite(value)?((value+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI:0;}
