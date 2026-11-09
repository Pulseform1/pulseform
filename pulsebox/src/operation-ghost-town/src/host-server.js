// The match server, run inside the host's browser for Pulsebox rooms.
// It is a port of server/index.js: the same room rules, the same Simulation and the same 30 Hz tick with 15 Hz snapshots.
// Players reach it through the Pulsebox room relay (see network.js); the host's own messages arrive directly.
import {Simulation} from '../shared/simulation.js';import {clamp} from '../shared/physics.js';import {normalizeProfile} from '../shared/progression.js';
import {ARENAS,arenaMissionIds} from '../shared/arenas.js';import {deploymentPoint} from '../shared/world.js';

// A worker keeps ticking at 30 Hz while the host's tab is in the background (page timers slow to once a second there).
function ticker(fn){try{const url=URL.createObjectURL(new Blob(['let t=setInterval(()=>postMessage(0),1000/30);onmessage=()=>clearInterval(t)'],{type:'text/javascript'}));const w=new Worker(url);w.onmessage=fn;return ()=>{w.postMessage(0);w.terminate();URL.revokeObjectURL(url)}}catch{const t=setInterval(fn,1000/30);return ()=>clearInterval(t)}}

export class HostServer{
constructor(code,deliver){this.code=code;this.deliver=deliver;this.clients=new Map();this.room=null;this.ticks=0;this.stopTick=ticker(()=>this.tick())}
send(c,type,data={}){this.deliver(c.id,{type,...data})}
broadcast(type,data){for(const c of this.room.members.values())this.send(c,type,data)}
info(){const room=this.room;return {code:room.code,host:room.host,mode:room.mode,arenaId:room.arenaId,playing:room.playing,players:[...room.members.values()].map(c=>({id:c.id,name:c.name,team:c.team,spawnId:c.spawnId,inMatch:c.inMatch}))}}
lobby(){this.broadcast('lobby',{room:this.info()})}
fail(c,message){this.send(c,'error',{message})}
connect(id){if(this.clients.has(id)||this.clients.size>=8)return;const c={id,name:'Ranger',team:'alpha',profile:normalizeProfile(),spawnId:'south',room:null,inMatch:false,input:{},inputTime:0,tokens:120,lastRate:Date.now()};this.clients.set(id,c);this.send(c,'welcome',{id})}
disconnect(id){const c=this.clients.get(id);if(!c)return;this.leave(c);this.clients.delete(id)}
leave(c){const room=this.room;if(!room||c.room!==room.code)return;room.members.delete(c.id);room.sim?.players.delete(c.id);c.room=null;c.inMatch=false;if(!room.members.size)return;if(room.host===c.id)room.host=room.members.keys().next().value;if(room.playing&&room.sim?.players.size===0){room.playing=false;room.sim=null;this.broadcast('returned',{})}this.lobby()}
receive(id,m){const c=this.clients.get(id);if(!c)return;const now=Date.now();c.tokens=Math.min(120,c.tokens+(now-c.lastRate)*.08);c.lastRate=now;if(--c.tokens<0)return;if(!m||typeof m!=='object'||typeof m.type!=='string')return;
let room=c.room&&this.room&&this.room.code===c.room?this.room:null;
if(m.type==='ping'){this.send(c,'pong',{time:typeof m.time==='number'?m.time:0});return}
if(m.type==='leave'){this.leave(c);this.send(c,'left');return}
if(m.type==='create'||m.type==='join'){if(room){this.fail(c,'Leave your current room first.');return}c.cinematic=m.cinematic===true;c.name=typeof m.name==='string'?m.name.replace(/[\x00-\x1F<>]/g,'').trim().slice(0,18)||'Ranger':'Ranger';
if(!this.room)this.room={code:this.code,host:c.id,mode:'tdm',arenaId:'town',playing:false,members:new Map(),sim:null};room=this.room;
if(room.members.size&&room.playing){this.fail(c,'This match has already started. Join after the host returns to the lobby.');return}if(room.members.size>=8){this.fail(c,'This room is full (8 players).');return}
c.room=room.code;c.team=[...room.members.values()].filter(x=>x.team==='alpha').length<=[...room.members.values()].filter(x=>x.team==='bravo').length?'alpha':'bravo';c.spawnId=c.team==='bravo'?'north':'south';room.members.set(c.id,c);this.lobby();return}
if(!room){this.fail(c,'Create or join a room first.');return}
if(m.type==='loadout'){if(room.playing){this.fail(c,'Change your armory loadout between matches.');return}c.profile=normalizeProfile(m.profile);this.send(c,'loadoutAccepted',{loadout:c.profile.loadout});return}
if(m.type==='spawn'){if(room.playing){this.fail(c,'Choose your deployment before the match starts.');return}if(!deploymentPoint(m.spawnId)){this.fail(c,'Choose one of the five marked deployment points.');return}c.spawnId=m.spawnId;this.lobby()}
if(m.type==='team'){if(room.playing){this.fail(c,'Teams cannot change during a match.');return}if(!['alpha','bravo'].includes(m.team))return;if([...room.members.values()].filter(x=>x.team===m.team&&x.id!==c.id).length>=4&&room.mode==='tdm'){this.fail(c,'That team already has four players.');return}c.team=m.team;this.lobby()}
if(m.type==='arena'){if(room.host!==c.id||room.playing)return;if(ARENAS.some(a=>a.id===m.arenaId)){room.arenaId=m.arenaId;this.lobby()}return}
if(m.type==='mode'){if(room.host!==c.id||room.playing)return;if(['tdm','ffa','coop'].includes(m.mode)){room.mode=m.mode;this.lobby()}}
if(m.type==='start'){if(room.host!==c.id){this.fail(c,'Only the host can start a match.');return}if(room.playing)return;if(room.mode!=='coop'&&room.members.size<2){this.fail(c,'At least two players are required for competitive modes. Try Cooperative Survival to play alone.');return}if(room.mode==='tdm'&&(![...room.members.values()].some(x=>x.team==='alpha')||![...room.members.values()].some(x=>x.team==='bravo'))){this.fail(c,'Team Deathmatch needs a player on each team.');return}if(room.mode==='tdm'&&['alpha','bravo'].some(t=>[...room.members.values()].filter(x=>x.team===t).length>4)){this.fail(c,'Team Deathmatch supports a maximum of four players per team.');return}
room.sim=new Simulation(room.mode,'normal',arenaMissionIds(room.arenaId)[0],room.arenaId);for(const member of room.members.values()){member.inMatch=true;member.input={};member.inputTime=now;const p=room.sim.addPlayer(member.id,member.name,room.mode==='coop'?'alpha':member.team,member.spawnId,member.profile);p.deploying=!!member.cinematic;if(p.deploying)p.invulnerable=1e9}room.sim.start();room.playing=true;this.broadcast('started',{mode:room.mode});this.lobby()}
if(m.type==='returnLobby'){if(room.host===c.id){room.playing=false;room.sim=null;for(const member of room.members.values())member.inMatch=false;this.broadcast('returned',{})}else{c.inMatch=false;room.sim?.players.delete(c.id);this.send(c,'returned',{})}this.lobby()}
if(m.type==='deployReady'&&room.playing&&c.inMatch){const p=room.sim.players.get(c.id);if(p?.deploying&&p.alive){p.deploying=false;p.invulnerable=room.sim.time+6;p.lastDamageAt=room.sim.time;c.input={};c.inputTime=now}return}
if(m.type==='input'&&room.playing&&c.inMatch){const i=m.input;if(!i||typeof i!=='object')return;if(!['x','z','yaw','pitch'].every(k=>typeof i[k]==='number'&&Number.isFinite(i[k])))return;c.input={x:clamp(i.x,-1,1),z:clamp(i.z,-1,1),yaw:i.yaw%(Math.PI*2),pitch:clamp(i.pitch,-1.48,1.48),sprint:!!i.sprint,crouch:!!i.crouch,jump:!!i.jump,slide:!!i.slide,aim:!!i.aim,fire:!!i.fire};c.inputTime=now}
if(m.type==='action'&&room.playing&&c.inMatch){const p=room.sim.players.get(c.id);if(!p||typeof m.action!=='string'||!['reload','interact','grenade','trap','melee','fire','weapon0','weapon1','weapon2','weapon3'].includes(m.action))return;if(Number.isFinite(m.yaw))p.yaw=m.yaw%(Math.PI*2);if(Number.isFinite(m.pitch))p.pitch=clamp(m.pitch,-1.48,1.48);if(m.action==='fire'&&typeof m.aim==='boolean')p.aim=m.aim&&!p.sprinting&&!p.slideTime;room.sim.action(p,m.action)}}
tick(){const room=this.room;if(!room||!room.playing||!room.sim)return;const now=Date.now(),inputs=new Map();for(const c of room.members.values())if(c.inMatch)inputs.set(c.id,now-c.inputTime<250?c.input:{});room.sim.update(1/30,inputs);const events=room.sim.drainEvents();if(events.length)this.broadcast('events',{events});if(this.ticks++%2===0)this.broadcast('snapshot',{state:room.sim.snapshot()})}
stop(){this.stopTick();this.room=null;this.clients.clear()}
}
