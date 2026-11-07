import {randomBytes} from 'node:crypto';
import {createSession,addPlayer,removePlayer,setInput,advance} from './public/arcade/session.js';
const send=(ws,m)=>{if(ws?.readyState===1)ws.send(JSON.stringify(m))};
export function createArcadeService(){
 const rooms=new Map();let frame=0;
 const publish=(r,m)=>{for(const ws of r.sockets.values())send(ws,m)};
 const snapshot=r=>({type:'state',state:r.session.state,game:r.session.game,host:r.host,started:r.started,players:r.sockets.size});
 function connect(ws){let room,id;
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
   if(m.type==='join'){
    if(room)return;let code=String(m.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    if(code&&!rooms.has(code))return send(ws,{type:'error',message:'Room not found. Check the six-character code.'});
    if(!code){let session;try{session=createSession(m.game,Math.floor(Math.random()*1000000))}catch{return send(ws,{type:'error',message:'Choose a game first.'})}do{code=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));rooms.set(code,{session,sockets:new Map(),host:null,started:false})}
    const r=rooms.get(code);if(r.sockets.size>=4)return send(ws,{type:'error',message:'This room already has four players.'});
    if(r.session.state.status!=='playing')return send(ws,{type:'error',message:'This run has ended. Ask the host to start a new run.'});
    id=randomBytes(6).toString('hex');room=r;addPlayer(r.session,id);r.sockets.set(id,ws);r.host??=id;
    send(ws,{type:'joined',id,code,game:r.session.game,host:r.host,started:r.started,state:r.session.state});publish(r,snapshot(r));return;
   }
   if(!room)return;
   if(m.type==='input'&&room.started)setInput(room.session,id,m.input);
   if(m.type==='start'&&room.host===id){room.started=true;publish(room,snapshot(room))}
   if(m.type==='restart'&&room.host===id){const session=createSession(room.session.game,room.session.seed);for(const key of room.sockets.keys())addPlayer(session,key);room.session=session;room.started=true;publish(room,{type:'reset'});publish(room,snapshot(room))}
  });
  ws.on('close',()=>{if(!room)return;removePlayer(room.session,id);room.sockets.delete(id);if(!room.sockets.size){for(const [code,r] of rooms)if(r===room)rooms.delete(code)}else{if(room.host===id)room.host=room.sockets.keys().next().value;publish(room,snapshot(room))}});
 }
 function tick(dt=1/30){frame++;for(const r of rooms.values()){if(r.started)advance(r.session,dt);if(frame%2===0)publish(r,snapshot(r))}}
 return {connect,tick,rooms};
}
