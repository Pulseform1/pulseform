import {createSession,addPlayer,applyMessage,tick,snapshot} from '/engine.js';
// WebSocket-compatible local transport. Solo uses the exact same simulation as co-op.
export class LocalSession {
  constructor(){this.readyState=0;this.id='solo';this.room=createSession();setTimeout(()=>{this.readyState=1;this.onopen?.()},0)}
  deliver(m){if(this.readyState===1)this.onmessage?.({data:JSON.stringify(m)})}
  send(raw){const m=JSON.parse(raw);if(m.type==='join'){addPlayer(this.room,this.id);this.deliver({type:'joined',id:this.id,code:'SOLO'});this.timer=setInterval(()=>{tick(this.room,(_,event)=>this.deliver(event));this.deliver(snapshot(this.room))},100)}else applyMessage(this.room,this.id,m,(_,event)=>this.deliver(event))}
  close(){clearInterval(this.timer);this.readyState=3;this.onclose?.()}
}
