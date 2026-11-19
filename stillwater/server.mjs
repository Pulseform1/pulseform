import http from 'node:http';
import {execFile} from 'node:child_process';
import {wrapYaw} from './public/transport.js';
import {createCaptureDiagnostics,isLocalCaptureRequest} from './capture-diagnostics.mjs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createSimulation, addPlayer, stepSimulation, serializeSimulation, respawnPlayer, MONSTERS, WORLD_VERSION } from './shared/simulation.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.woff2':'font/woff2', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.ogg':'audio/ogg' };
const IDS = MONSTERS.map(m => m.id);
const idleInput = (seq = -1) => ({ forward:0, strafe:0, yaw:0, pitch:0, jump:false, sprint:false, seq });
const shuffle = a => { a=[...a]; for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; };
const send = (ws, payload) => { if(ws?.readyState === WebSocket.OPEN) {if(ws.bufferedAmount>1024*1024){ws.close(1013,'Connection too slow');return;}ws.send(JSON.stringify(payload));} };
const cleanName = name => typeof name === 'string' ? name.replace(/[\p{C}<>]/gu,'').trim().slice(0,20) || 'Explorer' : 'Explorer';
const validDifficulty = value => ['chill','normal','nightmare'].includes(value) ? value : 'normal';
const finite = (value, fallback=0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

async function launchDesktopBrowser(url){
  if(process.platform!=='darwin')throw new Error('Automatic browser launch is available on this Mac only.');
  const candidates=[['Google Chrome','/Applications/Google Chrome.app'],['Safari','/Applications/Safari.app']];
  for(const [browser,app]of candidates){try{await stat(app);}catch{continue;}
    await new Promise((resolve,reject)=>execFile('/usr/bin/open',['-a',app,url],{timeout:5000},error=>error?reject(error):resolve()));return {browser};
  }
  throw new Error('Chrome or Safari was not found.');
}

/** Server-authoritative local/private game service. No client positions are accepted. */
export function createGameServer(options = {}) {
  const rooms = new Map();
  const peers = new Set();
  const rateByAddress = new Map();
  const maxRooms = options.maxRooms ?? 128;
  const voteDuration = options.voteDuration ?? 25_000;
  const reconnectGrace = options.reconnectGrace ?? 120_000;
  const emptyGrace = options.emptyGrace ?? 30_000;
  let stopped = false, browserOpening = false, lastBrowserLaunch = 0;
  const captureDiagnostics=createCaptureDiagnostics();

  const server = http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Cache-Control','no-cache');
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { res.writeHead(400);res.end('Invalid path');return; }
    if(pathname==='/capture-diagnostics'){
      const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
      if(!['GET','POST'].includes(req.method)){req.resume();reply(405,{error:'Method not allowed'});return;}
      if(new URL(req.url,'http://localhost').search||!isLocalCaptureRequest(req,server.address()?.port,{write:req.method==='POST'})){req.resume();reply(403,{error:'Local capture diagnostics only'});return;}
      if(req.method==='GET'){reply(200,{records:captureDiagnostics.read()});return;}
      if(!permit(req.socket.remoteAddress,'capture',60,60_000)){req.resume();reply(429,{error:'Diagnostic rate limit'});return;}
      if(!String(req.headers['content-type']||'').startsWith('application/json')||Number(req.headers['content-length']||0)>2048){req.resume();reply(413,{error:'Invalid diagnostic body'});return;}
      let body='',bytes=0;try{for await(const chunk of req){bytes+=chunk.length;if(bytes>2048){reply(413,{error:'Diagnostic body too large'});req.resume();return;}body+=chunk.toString();}const valid=captureDiagnostics.add(JSON.parse(body));reply(valid?202:400,{accepted:valid});}catch{if(!res.headersSent)reply(400,{error:'Invalid diagnostic body'});}return;
    }
    if(pathname==='/open-browser'){
      const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
      const port=server.address()?.port,hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`,`[::1]:${port}`]);
      let origin=null;try{origin=new URL(req.headers.origin);}catch{}
      if(req.method!=='POST'){reply(405,{message:'Use the Open in Chrome button in the game.'});return;}
      if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!hosts.has(req.headers.host)||origin?.protocol!=='http:'||origin.host!==req.headers.host||req.headers['x-stillwater-launch']!=='1'){
        reply(403,{message:'Automatic launch is available only from this computer’s local game page.'});return;
      }
      if(new URL(req.url,'http://localhost').search||req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0){req.resume();reply(400,{message:'The launch action does not accept a URL or command.'});return;}
      if(browserOpening||Date.now()-lastBrowserLaunch<1500){reply(429,{message:'A browser launch is already in progress. Please wait a moment.'});return;}
      browserOpening=true;
      try{const url=`http://127.0.0.1:${port}/?v=18&look=capture`,result=await (options.launchBrowser||launchDesktopBrowser)(url);lastBrowserLaunch=Date.now();reply(200,{ok:true,browser:result.browser||'Browser',url});}
      catch{reply(503,{message:'The browser could not be opened automatically. Copy the game link and open it in Chrome or Safari.'});}
      finally{browserOpening=false;}return;
    }
    if(req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405);res.end('Method not allowed');return; }
    if(pathname === '/health') { res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,rooms:rooms.size}));return; }
    let base = path.join(ROOT,'public');
    if(pathname.startsWith('/shared/')) {base=path.join(ROOT,'shared');pathname=pathname.slice(7);}
    else if(pathname==='/vendor/RoundedBoxGeometry.js') {base=path.join(ROOT,'node_modules/three/examples/jsm/geometries');pathname='/RoundedBoxGeometry.js';}
    else if(pathname.startsWith('/vendor/')) {base=path.join(ROOT,'node_modules/three/build');pathname=pathname.slice(7);}
    if(pathname === '/') pathname = '/index.html';
    if(pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) { res.writeHead(403);res.end('Forbidden');return; }
    const requested = path.resolve(base,'.'+pathname);
    if(!requested.startsWith(base+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
    try {
      const info=await stat(requested);
      if(!info.isFile()) throw new Error('not a file');
      const body=await readFile(requested);
      res.writeHead(200,{'Content-Type':MIME[path.extname(requested)] || 'application/octet-stream','Content-Length':body.length});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
  });
  const wss = new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});

  function permit(address, key, limit, duration) {
    const now=Date.now(); let bucket=rateByAddress.get(address);
    if(!bucket){bucket={touched:now};rateByAddress.set(address,bucket);}
    bucket.touched=now;
    if(!bucket[key] || now-bucket[key].since>duration) bucket[key]={since:now,count:0};
    return ++bucket[key].count<=limit;
  }
  server.on('upgrade',(req,socket,head)=>{
    const address=req.socket.remoteAddress || 'local';
    let url;try{url=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}
    if(url.pathname !== '/ws' || !permit(address,'connection',40,60_000) || [...peers].filter(p=>p.address===address).length>=20) {socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n');return;}
    // Browser clients must originate from the serving host. No wildcard credentialed socket access.
    if(req.headers.origin){try{if(new URL(req.headers.origin).host !== req.headers.host){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}}catch{socket.destroy();return;}}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });

  function roomView(room) {
    return {code:room.code,mode:room.mode,phase:room.phase,paused:room.paused,hostId:room.hostId,difficulty:room.difficulty,
      players:[...room.members.values()].map(m=>({id:m.id,name:m.name,ready:m.ready,connected:!!m.ws,
        alive:room.sim?.players[m.id]?.alive ?? true,spectator:room.sim?.players[m.id]?.spectator ?? false})),
      cards:[...room.cards],votes:{...room.votes},faced:[...room.faced],offered:[...room.offered],
      round:room.round,deadline:room.deadline,seed:room.seed,monsterId:room.monsterId,restartVotes:[...room.restartVotes]};
  }
  const broadcast = (room,payload) => {for(const m of room.members.values()) send(m.ws,payload);};
  const lobby = room => broadcast(room,{type:'lobby',room:roomView(room)});
  const connected = room => [...room.members.values()].filter(m=>m.ws);
  function freshCards(room) {
    const cards=[];
    while(cards.length<3){
      if(!room.deck.length){const mixed=shuffle(IDS);room.deck=[...mixed.filter(id=>!room.faced.has(id)),...mixed.filter(id=>room.faced.has(id))];}
      // Fill from the fair roster bag without duplicates inside a hand;
      // retain skipped entries if a future roster size crosses a hand boundary.
      const index=room.deck.findIndex(id=>!cards.includes(id));
      if(index<0)throw new Error('Creature roster must contain at least three unique IDs');
      cards.push(room.deck.splice(index,1)[0]);
    }
    room.cards=cards;cards.forEach(id=>room.offered.add(id));
  }
  function prepareRound(room) {
    room.sim=null;room.paused=false;room.inputs={};room.events=[];room.lastEventId=0;room.votes={};room.restartVotes.clear();room.monsterId=null;
    room.seed=randomInt(1,2**31-1);room.deadline=null;freshCards(room);
    for(const m of room.members.values()) m.ready=m.id===room.hostId || room.mode==='solo';
    room.phase=room.mode==='solo'?'voting':'lobby';lobby(room);
  }
  function newCode(){let code;do{code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(rooms.has(code));return code;}
  function createRoom(mode,difficulty) {
    const room={code:newCode(),mode,difficulty,phase:'lobby',paused:false,hostId:null,members:new Map(),deck:[],cards:[],votes:{},
      faced:new Set(),offered:new Set(),round:0,deadline:null,seed:1,monsterId:null,sim:null,inputs:{},events:[],lastEventId:0,
      restartVotes:new Set(),emptySince:null,lastActivity:Date.now()};rooms.set(room.code,room);return room;
  }
  function attach(peer,room,member) {
    if(member.ws && member.ws!==peer.ws){member.ws.close(4001,'Reconnected elsewhere');}
    member.ws=peer.ws;member.disconnectedAt=null;peer.room=room;peer.member=member;peer.lastSeq=-1;
    room.emptySince=null;room.lastActivity=Date.now();
    const p=room.sim?.players[member.id];if(p){p.connected=true;p.ackSeq=-1;room.sim.finished=false;room.phase='playing';room.paused=false;if(!p.alive&&!Number.isFinite(p.respawnReadyAt))p.respawnReadyAt=room.sim.time;}
    send(peer.ws,{type:'welcome',id:member.id,token:member.token,code:room.code});
    lobby(room);
    if(room.sim) send(peer.ws,{type:'start',seed:room.seed,difficulty:room.difficulty,monsterId:room.monsterId,
      players:serializeSimulation(room.sim).players,state:serializeSimulation(room.sim)});
  }
  function detach(peer,explicit=false) {
    const room=peer.room,member=peer.member;peer.room=null;peer.member=null;
    if(!room || !member || member.ws!==peer.ws)return;
    member.ws=null;member.disconnectedAt=Date.now();room.inputs[member.id]=idleInput();
    const p=room.sim?.players[member.id];if(p){p.connected=false;p.alive=false;p.spectator=true;if(!Number.isFinite(p.respawnReadyAt))p.respawnReadyAt=room.sim.time;}
    delete room.votes[member.id];room.restartVotes.delete(member.id);
    if(explicit || !room.sim){room.members.delete(member.id);if(room.sim)delete room.sim.players[member.id];}
    if(room.hostId===member.id) room.hostId=connected(room)[0]?.id || room.members.keys().next().value || null;
    if(!connected(room).length)room.emptySince=Date.now();
    if(room.phase==='voting' && connected(room).length && connected(room).every(m=>room.votes[m.id]))startRun(room);
    else lobby(room);
  }
  function pickMonster(room) {
    const counts=Object.fromEntries(room.cards.map(id=>[id,0]));
    for(const m of connected(room))if(room.cards.includes(room.votes[m.id]))counts[room.votes[m.id]]++;
    const max=Math.max(...Object.values(counts)),tied=room.cards.filter(id=>counts[id]===max);
    return tied.includes(room.votes[room.hostId])?room.votes[room.hostId]:tied[randomInt(tied.length)];
  }
  function startRun(room) {
    if(room.phase!=='voting' || !connected(room).length)return;
    room.monsterId=pickMonster(room);room.faced.add(room.monsterId);room.round++;
    room.phase='playing';room.paused=false;room.deadline=null;room.inputs={};room.events=[];room.lastEventId=0;
    room.sim=createSimulation({seed:room.seed,difficulty:room.difficulty,monsterId:room.monsterId});
    let slot=0;for(const m of room.members.values()){
      const p=addPlayer(room.sim,m.id,m.name,slot++);if(p){p.connected=!!m.ws;p.alive=!!m.ws;p.spectator=!m.ws;}
    }
    const state=serializeSimulation(room.sim);
    broadcast(room,{type:'start',seed:room.seed,difficulty:room.difficulty,monsterId:room.monsterId,players:state.players,state});lobby(room);
  }
  function error(peer,message){send(peer.ws,{type:'error',message});}

  wss.on('connection',(ws,req)=>{
    const peer={ws,address:req.socket.remoteAddress || 'local',room:null,member:null,lastSeq:-1,messageWindow:Date.now(),messageCount:0,lastInput:0,alive:true};
    peers.add(peer);
    ws.on('pong',()=>peer.alive=true);
    ws.on('error',()=>{});
    ws.on('message',raw=>{
      const now=Date.now();
      if(now-peer.messageWindow>=1000){peer.messageWindow=now;peer.messageCount=0;}
      if(++peer.messageCount>120){error(peer,'Too many messages. Please reconnect.');ws.close(1008,'Rate limit');return;}
      let msg;try{msg=JSON.parse(raw.toString());}catch{error(peer,'Invalid message.');return;}
      if(!msg || Array.isArray(msg) || typeof msg.type!=='string'){error(peer,'Invalid message.');return;}
      if(msg.type==='ping'){send(ws,{type:'pong',time:Date.now()});return;}
      if(msg.type==='leave'){detach(peer,true);send(ws,{type:'left'});return;}
      if((msg.type==='create'||msg.type==='join')&&msg.worldVersion!==WORLD_VERSION){error(peer,'The course has been updated. Refresh this page before starting or reconnecting.');return;}
      if(msg.type==='create'){
        if(peer.room){error(peer,'Leave your current room first.');return;}
        if(!permit(peer.address,'create',20,60_000) || rooms.size>=maxRooms){error(peer,'Room creation is busy. Try again shortly.');return;}
        const room=createRoom(msg.mode==='solo'?'solo':'party',validDifficulty(msg.difficulty));
        const member={id:randomUUID(),token:randomBytes(24).toString('hex'),name:cleanName(msg.name),ready:true,ws:null,disconnectedAt:null};
        room.members.set(member.id,member);room.hostId=member.id;
        freshCards(room);room.seed=randomInt(1,2**31-1);room.phase=room.mode==='solo'?'voting':'lobby';attach(peer,room,member);return;
      }
      if(msg.type==='join'){
        if(peer.room){error(peer,'Leave your current room first.');return;}
        if(!permit(peer.address,'join',40,60_000)){error(peer,'Too many join attempts. Try again shortly.');return;}
        const code=typeof msg.code==='string'?msg.code.trim().toUpperCase():'';
        if(!/^[A-F0-9]{6}$/.test(code)){error(peer,'Enter the six-character room code.');return;}
        const room=rooms.get(code);if(!room){error(peer,'That room was not found. Check the code or create a new room.');return;}
        let member=typeof msg.token==='string'?[...room.members.values()].find(m=>m.token===msg.token):undefined;
        if(member){attach(peer,room,member);return;}
        if(room.mode==='solo'){error(peer,'This is a solo run. Create a friends room to play together.');return;}
        if(room.members.size>=4){error(peer,'This room is full (four players maximum).');return;}
        member={id:randomUUID(),token:randomBytes(24).toString('hex'),name:cleanName(msg.name),ready:false,ws:null,disconnectedAt:null};room.members.set(member.id,member);
        if(room.sim){const wasFinished=room.sim.finished;const p=addPlayer(room.sim,member.id,member.name,room.members.size-1);if(p){p.alive=false;p.spectator=true;p.connected=true;p.respawnReadyAt=room.sim.time;}room.sim.finished=wasFinished;}
        attach(peer,room,member);return;
      }
      const room=peer.room,member=peer.member;
      if(!room || !member){error(peer,'Create or join a room first.');return;}
      room.lastActivity=now;
      if(msg.type==='input'){
        if(room.phase!=='playing' || !room.sim?.players[member.id]?.alive || msg.lifeId!==room.sim.players[member.id].lifeId)return;
        if(!Number.isSafeInteger(msg.seq) || msg.seq<0 || msg.seq<=peer.lastSeq)return;
        peer.lastSeq=msg.seq;peer.lastInput=now;
        room.inputs[member.id]={forward:clamp(finite(msg.forward),-1,1),strafe:clamp(finite(msg.strafe),-1,1),
          yaw:wrapYaw(finite(msg.yaw)),pitch:clamp(finite(msg.pitch),-1.5,1.5),jump:msg.jump===true,sprint:msg.sprint===true,seq:msg.seq};return;
      }
      if(msg.type==='respawn'){
        const p=room.sim?.players[member.id];if(room.phase!=='playing'||!p||p.alive||msg.lifeId!==p.lifeId)return;
        if(respawnPlayer(room.sim,member.id)){room.paused=false;room.inputs[member.id]=idleInput(peer.lastSeq);p.ackSeq=peer.lastSeq;broadcast(room,{...serializeSimulation(room.sim),type:'state',events:[]});lobby(room);}return;
      }
      if(msg.type==='ready'){
        if(room.phase!=='lobby')return;member.ready=msg.ready===true;lobby(room);return;
      }
      if(msg.type==='pause'){
        if(room.mode!=='solo' || room.phase!=='playing')return;
        room.paused=msg.paused===true;
        room.inputs[member.id]=idleInput(peer.lastSeq);
        lobby(room);send(peer.ws,{...serializeSimulation(room.sim),type:'state',paused:room.paused,events:[]});return;
      }
      if(msg.type==='difficulty'){
        if(member.id!==room.hostId || room.phase!=='lobby')return;room.difficulty=validDifficulty(msg.difficulty);lobby(room);return;
      }
      if(msg.type==='begin'){
        if(member.id!==room.hostId){error(peer,'Only the host can open monster voting.');return;}
        if(room.phase!=='lobby')return;
        if(!connected(room).every(m=>m.ready)){error(peer,'Everyone needs to be ready first.');return;}
        room.phase='voting';room.deadline=Date.now()+voteDuration;lobby(room);return;
      }
      if(msg.type==='vote'){
        if(room.phase!=='voting' || !room.cards.includes(msg.monsterId)){error(peer,'Choose one of the three current creatures.');return;}
        room.votes[member.id]=msg.monsterId;lobby(room);
        if(room.mode!=='solo' && connected(room).every(m=>room.votes[m.id]))startRun(room);return;
      }
      if(msg.type==='start'){
        if(room.mode==='solo' && room.phase==='voting' && room.cards.includes(room.votes[member.id]))startRun(room);
        else error(peer,'Select a creature first. Friends rooms start when voting finishes.');return;
      }
      if(msg.type==='restart'){
        if(!['playing','results'].includes(room.phase))return;
        room.restartVotes.add(member.id);
        if((room.phase==='results' && member.id===room.hostId) || connected(room).every(m=>room.restartVotes.has(m.id)))prepareRound(room);
        else lobby(room);return;
      }
      error(peer,'Unknown action.');
    });
    ws.on('close',()=>{detach(peer);peers.delete(peer);});
  });

  let tick=0,lastTime=performance.now(),accumulator=0;
  function advance(){
    const now=performance.now();accumulator+=Math.min((now-lastTime)/1000,.1);lastTime=now;
    while(accumulator>=1/60){
      accumulator-=1/60;tick++;
      for(const room of rooms.values()){
        if(room.phase==='voting' && room.deadline && Date.now()>=room.deadline)startRun(room);
        if(room.phase!=='playing' || !room.sim || room.paused)continue;
        for(const m of room.members.values()){
          const peer=[...peers].find(p=>p.member===m && p.ws===m.ws);
          if(!peer || Date.now()-peer.lastInput>400){const old=room.inputs[m.id] || idleInput();room.inputs[m.id]={...old,forward:0,strafe:0,jump:false,sprint:false};}
        }
        stepSimulation(room.sim,room.inputs,1/60);
        if(Array.isArray(room.sim.events))for(const event of room.sim.events)if(event.id>room.lastEventId){room.events.push(event);room.lastEventId=event.id;}
        if(room.sim.finished){room.phase='results';lobby(room);}
        if(tick%3===0 || room.phase==='results'){
          const state=serializeSimulation(room.sim);state.events=room.events.splice(0);broadcast(room,{...state,type:'state'});
        }
      }
    }
  }
  const interval=setInterval(advance,1000/60);
  interval.unref();
  const cleanup=setInterval(()=>{
    const now=Date.now();
    for(const room of rooms.values()){
      for(const m of room.members.values())if(!m.ws && m.disconnectedAt && now-m.disconnectedAt>reconnectGrace){room.members.delete(m.id);if(room.sim)delete room.sim.players[m.id];}
      if((room.emptySince && now-room.emptySince>emptyGrace) || (!room.members.size && now-room.lastActivity>emptyGrace))rooms.delete(room.code);
    }
    for(const [address,bucket] of rateByAddress)if(now-bucket.touched>120_000)rateByAddress.delete(address);
  },1000);cleanup.unref();
  const heartbeat=setInterval(()=>{for(const peer of peers){if(!peer.alive){peer.ws.terminate();continue;}peer.alive=false;peer.ws.ping();}},15_000);heartbeat.unref();

  return {server,wss,rooms,
    start(port=Number(process.env.PORT)||4173,host=process.env.HOST||'127.0.0.1'){
      return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve(server.address());});});
    },
    close(){
      if(stopped)return Promise.resolve();stopped=true;
      clearInterval(interval);clearInterval(cleanup);clearInterval(heartbeat);
      for(const peer of peers)peer.ws.terminate();rooms.clear();rateByAddress.clear();
      return new Promise(resolve=>wss.close(()=>{if(server.listening)server.close(()=>resolve());else resolve();}));
    }
  };
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const game=createGameServer();
  game.start().then(address=>console.log(`STILLWATER ready at http://${address.address}:${address.port}`)).catch(error=>{console.error(`Unable to start STILLWATER: ${error.message}`);process.exitCode=1;});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>game.close().then(()=>process.exit(0)));
}
