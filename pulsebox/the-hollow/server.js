import express from 'express';
import {WebSocketServer} from 'ws';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {MAP} from './world.js';
import {createSession,addPlayer,applyMessage,tick,snapshot} from './engine.js';
const root=fileURLToPath(new URL('.',import.meta.url)),app=express();
app.use(express.static(root+'public'));app.use('/vendor',express.static(root+'node_modules/three/build'));
for(const file of ['world.js','engine.js','horror-director.js','levels.js','player-mechanics.js'])app.get('/'+file,(_,r)=>r.sendFile(root+file));
app.get('/health',(_,r)=>r.json({ok:true}));
const server=app.listen(process.env.PORT||3000,'0.0.0.0');const wss=new WebSocketServer({server,maxPayload:4096}),rooms=new Map();
function send(ws,m){if(ws?.readyState===1)ws.send(JSON.stringify(m))}
function emit(r,id,m){if(id)send(r.sockets.get(id),m);else for(const ws of r.sockets.values())send(ws,m)}
wss.on('connection',ws=>{
  let room,id;
  ws.on('message',raw=>{
    let m;try{m=JSON.parse(raw)}catch{return}if(!m||typeof m!=='object')return;
    if(m.type==='join'){
      if(room)return;let code=String(m.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
      if(code&&!rooms.has(code))return send(ws,{type:'error',message:'Room not found. Ask your partner for their current code.'});
      if(!code){do{code=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));rooms.set(code,{...createSession(),sockets:new Map()})}
      const r=rooms.get(code);if(r.ended)return send(ws,{type:'error',message:'This expedition has ended. Create a new room.'});
      if(r.players.size>=4)return send(ws,{type:'error',message:'This expedition already has four survivors.'});
      room=r;id=randomBytes(4).toString('hex');addPlayer(r,id);r.sockets.set(id,ws);send(ws,{type:'joined',id,code,map:MAP});return;
    }
    if(room)applyMessage(room,id,m,(to,event)=>emit(room,to,event));
  });
  ws.on('close',()=>{if(!room)return;room.players.delete(id);room.sockets.delete(id);if(!room.players.size){for(const [k,v] of rooms)if(v===room)rooms.delete(k)}else if([...room.players.values()].every(p=>p.down)){room.ended=true;emit(room,null,{type:'lost'})}});
});
setInterval(()=>{for(const r of rooms.values()){tick(r,(id,m)=>emit(r,id,m));emit(r,null,snapshot(r))}},100);
