// Online play over the Pulsebox room relay (/api/room/CODE).
// The first player in a room is the host: their browser runs the match server (host-server.js) and every other player
// talks to it through the relay. The messages are the same ones the standalone Node server (server/index.js) uses.
import {HostServer} from './host-server.js';
const WSHOST=/^https?:/.test(location.protocol)&&!/^(localhost|127\.)/.test(location.hostname)?location.host:'box.pulseform.org';
const LIMIT=15000,ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const pack=m=>JSON.stringify(m,(k,v)=>typeof v==='number'&&!Number.isInteger(v)?Math.round(v*1000)/1000:v);
const pid=n=>'p'+n;
export class Network{
constructor(onMessage,onError){this.socket=null;this.onMessage=onMessage;this.onError=onError;this.id=null;this.room=null;this.snap=null;this.rtt=0;this.lastSend=0;this.lastSnapshot=0;this.closing=false;this.server=null;this.me=0;this.host=0;this.code='';this.peers=new Set();this.parts=new Map();this.seq=0}
isHost(){return !!this.server}
// code: a friend's 4-letter room code to join, or nothing to create a new room
async connect(code){if(this.socket?.readyState===WebSocket.OPEN)return;const create=!code;if(!create&&!/^[A-Z0-9]{4}$/.test(code))throw Error('Room codes are 4 letters or numbers.');
for(let attempt=0;attempt<4;attempt++){const c=create?Array.from({length:4},()=>ALPHA[Math.floor(Math.random()*ALPHA.length)]).join(''):code;const hello=await this.open(c);
if(create&&hello.players.length>1){this.drop();continue}
if(!create&&hello.host===hello.id){this.drop();throw Error('Room '+code+' was not found. Check the code with your friend.')}
this.code=c;this.me=hello.id;this.host=hello.host;for(const p of hello.players)if(p.id!==this.me)this.peers.add(p.id);
if(this.host===this.me){this.server=new HostServer(c,(to,m)=>this.fromServer(to,m));this.server.connect(pid(this.me))}
return}throw Error('Could not open a room. Try again.')}
open(code){return new Promise((resolve,reject)=>{this.closing=false;let settled=false;const name=encodeURIComponent((document.getElementById('playerName')?.value||'Ranger').slice(0,12));
try{this.socket=new WebSocket(`wss://${WSHOST}/api/room/${code}?n=${name}&g=operation-ghost-town`)}catch{reject(Error('Could not connect to Pulsebox rooms.'));return}
const timeout=setTimeout(()=>{if(!settled){settled=true;this.socket?.close();reject(Error('Connection timed out. Check your internet connection.'))}},8000);
this.socket.onerror=()=>{if(!settled){settled=true;clearTimeout(timeout);reject(Error('Cannot reach Pulsebox rooms right now. Try again shortly.'))}};
this.socket.onclose=()=>{clearTimeout(timeout);if(!settled){settled=true;reject(Error('The room closed the connection.'))}if(!this.closing)this.lost('Disconnected from the room. Return to the multiplayer menu to reconnect.')};
this.socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.t==='hello'&&!settled){settled=true;clearTimeout(timeout);resolve(m);return}if(m.t==='full'&&!settled){settled=true;clearTimeout(timeout);reject(Error('That room is full (8 players).'));return}this.relay(m)}})}
drop(){this.closing=true;try{this.socket?.close()}catch{}this.socket=null}
lost(why){const was=this.room;this.server?.stop();this.server=null;this.room=null;this.peers.clear();if(was!==undefined)this.onError(why)}
// a message from the relay
relay(m){if(m.t==='join'){this.peers.add(m.id);this.server?.connect(pid(m.id));return}
if(m.t==='leave'){this.peers.delete(m.id);this.server?.disconnect(pid(m.id));return}
if(m.t==='host'){if(!this.server&&m.id!==this.host){this.closing=true;try{this.socket?.close()}catch{}this.socket=null;this.lost('The host left, so the room has closed. Create a new room to keep playing.')}return}
if(m.gp){const p=m.gp,k=m.from+':'+p.k;let a=this.parts.get(k);if(!a){a=[];this.parts.set(k,a)}a[p.i]=p.d;if(a.filter(x=>x!==undefined).length<p.n)return;this.parts.delete(k);try{m={g:JSON.parse(a.join('')),from:m.from}}catch{return}}
if(!m.g||typeof m.g!=='object')return;
if(this.server){if(this.peers.has(m.from))this.server.receive(pid(m.from),m.g);return}
if(m.from===this.host)this.deliver(m.g)}
raw(o,to){if(this.socket?.readyState!==WebSocket.OPEN)return;const s=pack(o);if(s.length<=LIMIT){this.socket.send(to?s.slice(0,-1)+',"to":'+to+'}':s);return}
const body=pack(o.g),k=++this.seq,n=Math.ceil(body.length/LIMIT);for(let i=0;i<n;i++)this.socket.send(JSON.stringify(to?{gp:{k,i,n,d:body.slice(i*LIMIT,(i+1)*LIMIT)},to}:{gp:{k,i,n,d:body.slice(i*LIMIT,(i+1)*LIMIT)}}))}
// the host's match server talking to one player (or, for the host, to itself)
fromServer(to,m){const n=+to.slice(1);if(n===this.me){queueMicrotask(()=>this.deliver(m));return}this.raw({g:m},n)}
deliver(m){if(m.type==='welcome')this.id=m.id;if(m.type==='lobby'){this.room=m.room;if(this.room)this.room.code=this.code}if(m.type==='snapshot'){this.snap=m.state;this.lastSnapshot=performance.now()}if(m.type==='pong')this.rtt=Math.round(performance.now()-m.time);this.onMessage(m)}
send(type,data={}){const m={type,...data};if(this.server){this.server.receive(pid(this.me),m);return}if(this.host)this.raw({g:m},this.host)}
close(){this.closing=true;this.server?.stop();this.server=null;try{this.socket?.close()}catch{}this.socket=null;this.room=null;this.snap=null;this.peers.clear();this.host=0;this.me=0;this.id=null}
}
