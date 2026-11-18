import {PROMPTS} from './prompts.mjs';

const ROUND_NAMES=['Warm-up','Plot Twist','Last Word'];
const VOTE_POINTS=[500,750,1000];
const FALLBACKS=[
 'A raccoon wearing the manager badge.',
 'Emergency confetti. Extremely non-refundable.',
 'A tiny committee of disappointed pigeons.',
 'The Wi-Fi password, but sung dramatically.',
 'Three suspicious ducks in a trench coat.',
 'A motivational speech from a broken toaster.',
 'A coupon for one deeply awkward silence.',
 'The moon called. It wants its casserole back.',
 'An emotional support traffic cone.',
 'A completely unlicensed wizard.',
];
const success=()=>({ok:true});
const failure=error=>({ok:false,error});
const own=(object,key)=>Object.hasOwn(object,key);
const connected=g=>g.playerOrder.filter(id=>g.players[id]?.connected);
const bump=g=>{g.revision++;};
const ms=(now,fallback)=>Number.isFinite(now)?now:fallback;
function rng(g){g.rng=(Math.imul(g.rng,1664525)+1013904223)>>>0;return g.rng/4294967296;}
function shuffle(g,values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function token(g,prefix){return prefix+(++g.sequence).toString(36)+'-'+Math.floor(rng(g)*0xffffffff).toString(36);}
function usableName(name){return typeof name==='string'?name.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim():'';}
function settings(input){return {writeSeconds:Math.min(900,Math.max(5,Number(input.writeSeconds)||90)),voteSeconds:Math.min(900,Math.max(5,Number(input.voteSeconds)||25)),revealSeconds:7,minPlayers:3,maxPlayers:10};}

export function createGame({code='LOCAL',hostId='host',seed=1,now=Date.now(),writeSeconds=90,voteSeconds=25}={}){
 return {code:String(code),hostId:String(hostId),hostConnected:true,seed:Number(seed)||1,rng:(Number(seed)||1)>>>0,sequence:0,phase:'lobby',round:1,deadline:null,revision:0,players:{},playerOrder:[],roster:[],tasks:[],current:0,votes:{},boldUsed:{},usedPrompts:[],roundPoints:{},summary:null,history:[],createdAt:ms(now,Date.now()),settings:settings({writeSeconds,voteSeconds})};
}

export function addPlayer(g,{id,name}={},now=Date.now()){
 if(typeof id!=='string'||!id||id.length>100||(id in Object.prototype||id==='prototype'))return failure('Invalid player identity.');
 const normalized=usableName(name);if(!normalized||Array.from(normalized).length>20)return failure('Choose a name from 1 to 20 characters.');
 if(own(g.players,id))return failure('That player has already joined. Reconnect instead.');
 if(g.phase!=='lobby')return failure('The game has started. Join the next game.');
 if(g.playerOrder.length>=10)return failure('This room already has ten players.');
 if(g.playerOrder.some(pid=>g.players[pid].name.toLocaleLowerCase()===normalized.toLocaleLowerCase()))return failure('That name is already taken.');
 g.players[id]={id,name:normalized,score:0,connected:true,joinedAt:ms(now,g.createdAt)};g.playerOrder.push(id);
 if(!g.hostConnected){g.hostId=id;g.hostConnected=true;}bump(g);return success();
}

function migrateHost(g){const next=connected(g).find(id=>id!==g.hostId);if(next){g.hostId=next;g.hostConnected=true;}else g.hostConnected=false;}
export function setConnected(g,id,value,now=Date.now()){
 const player=g.players[id],isHost=id===g.hostId;if(!player&&!isHost)return failure('Unknown player.');
 const active=!!value;if(player&&player.connected!==active){player.connected=active;bump(g);}
 if(isHost){g.hostConnected=active;if(!active)migrateHost(g);bump(g);}
 if(!active&&g.phase==='writing'&&player){fillMissing(g,id);bump(g);}
 if(active&&!g.hostConnected){g.hostId=id;g.hostConnected=true;bump(g);}
 advance(g,now);return success();
}

function drawPrompts(g,count){const key=['warmup','twist','finale'][g.round-1],pool=PROMPTS[key]||[];if(!pool.length)throw Error('The prompt deck is empty.');let available=pool.filter(p=>!g.usedPrompts.includes(p.id));if(available.length<count){available=[...available,...pool.filter(p=>g.usedPrompts.includes(p.id))];}const chosen=shuffle(g,available).slice(0,count);while(chosen.length<count)chosen.push(pool[chosen.length%pool.length]);for(const p of chosen)if(!g.usedPrompts.includes(p.id))g.usedPrompts.push(p.id);return chosen;}
function beginRound(g,round,now){
 g.round=round;g.phase='writing';g.deadline=now+g.settings.writeSeconds*1000;g.current=0;g.votes={};g.boldUsed={};g.roundPoints=Object.fromEntries(g.playerOrder.map(id=>[id,0]));g.summary=null;
 const count=round===3?1:g.roster.length,prompts=drawPrompts(g,count);
 g.tasks=prompts.map((p,i)=>({id:token(g,'p'),sourceId:p.id,text:p.text,tag:p.tag||ROUND_NAMES[round-1],authors:round===3?[...g.roster]:[g.roster[i],g.roster[(i+1)%g.roster.length]],answers:{},order:[],scored:false,reveal:null}));
 for(const id of g.roster)if(!g.players[id]?.connected)fillMissing(g,id);bump(g);
}
function makeAnswer(g,task,id,text,fallback=false){task.answers[id]={id:token(g,'a'),text,authorId:id,fallback};}
function fillMissing(g,onlyId){for(const t of g.tasks)for(const id of t.authors)if((!onlyId||onlyId===id)&&!own(t.answers,id)){const index=(g.sequence+Math.floor(rng(g)*FALLBACKS.length))%FALLBACKS.length;makeAnswer(g,t,id,'House answer: '+FALLBACKS[index],true);}}
function allAnswered(g){return g.tasks.every(t=>t.authors.every(id=>own(t.answers,id)));}
function currentTask(g){return g.tasks[g.current]||null;}
function beginVoting(g,now){fillMissing(g);g.current=0;for(const t of g.tasks)t.order=shuffle(g,Object.values(t.answers).map(a=>a.id));openBallot(g,now);}
function openBallot(g,now){g.phase='voting';g.deadline=now+g.settings.voteSeconds*1000;const t=currentTask(g);g.votes[t.id]={};bump(g);}
function eligibleIds(g,task){if(!task)return [];const votes=g.votes[task.id]||{};return g.roster.filter(id=>g.players[id]&&(g.players[id].connected||own(votes,id))&&(g.round===3||!task.authors.includes(id)));}
function eligible(g,id,task){return !!g.players[id]?.connected&&eligibleIds(g,task).includes(id);}
function points(g,id,n){if(!g.players[id])return;g.players[id].score+=n;g.roundPoints[id]=(g.roundPoints[id]||0)+n;}
function reveal(g,now){
 const t=currentTask(g);if(!t)return;if(t.scored){g.phase='reveal';return;}
 const votes=g.votes[t.id]||{},answers=Object.values(t.answers),counts=Object.fromEntries(answers.map(a=>[a.id,0]));for(const v of Object.values(votes))if(own(counts,v.answerId))counts[v.answerId]++;
 const total=Object.values(counts).reduce((a,b)=>a+b,0),highest=Math.max(0,...Object.values(counts)),winnerIds=highest>0?answers.filter(a=>counts[a.id]===highest).map(a=>a.id):[];
 const sole=winnerIds.length===1,winner=sole?answers.find(a=>a.id===winnerIds[0]):null,sweepVoters=winner?eligibleIds(g,t).filter(id=>g.round!==3||id!==winner.authorId):[];
 const unanimous=sole&&sweepVoters.length>0&&sweepVoters.every(id=>votes[id]?.answerId===winnerIds[0]);
 const results=t.order.map(id=>{const a=answers.find(a=>a.id===id),value=a.fallback?0:counts[id]*VOTE_POINTS[g.round-1]+(unanimous&&winnerIds[0]===id?300:0);points(g,a.authorId,value);return {id:a.id,text:a.text,authorId:a.fallback?null:a.authorId,votes:counts[id],points:value,house:!!a.fallback};});
 const boldBonuses=[];for(const [id,v]of Object.entries(votes))if(v.bold&&sole&&v.answerId===winnerIds[0]){points(g,id,200);boldBonuses.push({playerId:id,points:200});}
 t.scored=true;t.reveal={promptId:t.id,text:t.text,tag:t.tag,answers:results,winnerIds,tie:!sole,totalVotes:total,boldBonuses,sweep:unanimous};g.phase='reveal';g.deadline=now+7000;bump(g);
}
function endRound(g){const reveals=g.tasks.map(t=>t.reveal).filter(Boolean),totalVotes=reveals.reduce((n,r)=>n+r.totalVotes,0);g.summary={round:g.round,roundName:ROUND_NAMES[g.round-1],totalVotes,pointsAwarded:Object.values(g.roundPoints).reduce((a,b)=>a+b,0),roundScores:g.playerOrder.map(id=>({id,name:g.players[id].name,points:g.roundPoints[id]||0})).sort((a,b)=>b.points-a.points),ballots:reveals.length};g.history.push(structuredClone(g.summary));g.phase='scoreboard';g.deadline=null;bump(g);}
function nextReveal(g,now){if(g.current+1<g.tasks.length){g.current++;openBallot(g,now);}else endRound(g);}

export function advance(g,now=Date.now()){
 now=ms(now,g.createdAt);let changed=true,guard=0;
 while(changed&&guard++<30){changed=false;
  if(g.phase==='writing'&&(allAnswered(g)||now>=g.deadline)){beginVoting(g,now);changed=true;}
  else if(g.phase==='voting'){const t=currentTask(g),ids=eligibleIds(g,t),votes=g.votes[t.id]||{};if(ids.every(id=>own(votes,id))||now>=g.deadline){reveal(g,now);changed=true;}}
  else if(g.phase==='reveal'&&now>=g.deadline){nextReveal(g,now);changed=true;}
 }
 return g;
}

export function dispatch(g,actorId,action={},now=Date.now()){
 now=ms(now,g.createdAt);const beforePhase=g.phase,beforeDeadline=g.deadline;advance(g,now);if(!action||typeof action!=='object')return failure('Choose an action.');const host=actorId===g.hostId&&g.hostConnected,player=g.players[actorId];
 if(['start','next','restart'].includes(action.type)){
  if(!host)return failure('Only the host can do that.');
  if(action.type==='start'){if(g.phase!=='lobby')return failure('The game has already started.');if(connected(g).length<3)return failure('At least three connected players are needed.');g.roster=shuffle(g,connected(g));beginRound(g,1,now);advance(g,now);return success();}
  if(action.type==='restart'){if(g.phase!=='finished')return failure('Finish this game before restarting.');g.phase='lobby';g.round=1;g.deadline=null;g.roster=[];g.tasks=[];g.votes={};g.boldUsed={};g.usedPrompts=[];g.history=[];g.summary=null;for(const p of Object.values(g.players))p.score=0;bump(g);return success();}
  if(['writing','voting','reveal'].includes(beforePhase)&&beforeDeadline!==null&&now>=beforeDeadline)return success();
  if(g.phase==='reveal'){nextReveal(g,now);advance(g,now);return success();}
  if(g.phase==='scoreboard'){if(g.round===3){g.phase='finished';g.deadline=null;bump(g);}else{beginRound(g,g.round+1,now);advance(g,now);}return success();}
  if(g.phase==='writing'||g.phase==='voting')return failure('The timer must finish before skipping this phase.');return failure('There is nothing to advance yet.');
 }
 if(!player||!player.connected)return failure('Reconnect before playing.');if(!g.roster.includes(actorId))return failure('You are watching this game. Join the next one.');
 if(action.type==='answer'){
  if(g.phase!=='writing')return failure('Answers are closed for this round.');const task=g.tasks.find(t=>t.id===action.promptId);if(!task||!task.authors.includes(actorId))return failure('That prompt is not assigned to you.');if(own(task.answers,actorId))return failure('Your answer is locked.');if(typeof action.text!=='string')return failure('Write an answer first.');const text=action.text.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim(),limit=g.round===3?80:100;if(!text)return failure('Write an answer first.');if(Array.from(text).length>limit)return failure(`Keep your answer to ${limit} characters.`);makeAnswer(g,task,actorId,text);bump(g);advance(g,now);return success();
 }
 if(action.type==='vote'){
  if(g.phase!=='voting')return failure('Voting is closed.');const task=currentTask(g);if(!eligible(g,actorId,task))return failure('You cannot vote on your own matchup.');const votes=g.votes[task.id];if(own(votes,actorId))return failure('Your vote is locked.');const answer=Object.values(task.answers).find(a=>a.id===action.answerId);if(!answer)return failure('Choose an answer on this ballot.');if(answer.authorId===actorId)return failure('You cannot vote for yourself.');if(action.bold&&g.boldUsed[actorId])return failure('Your BOLD prediction has already been used this round.');votes[actorId]={answerId:answer.id,bold:action.bold===true};if(action.bold===true)g.boldUsed[actorId]=true;bump(g);advance(g,now);return success();
 }
 return failure('Unknown action.');
}

export function viewFor(g,viewerId){
 const task=currentTask(g),player=g.players[viewerId],voteMap=task?g.votes[task.id]||{}:{},isWriting=g.phase==='writing',assignments=g.tasks.filter(t=>t.authors.includes(viewerId)).map(t=>({id:t.id,text:t.text,tag:t.tag,answered:own(t.answers,viewerId),ownText:t.answers[viewerId]?.text||''}));
 const leaderboard=g.playerOrder.map(id=>({id,name:g.players[id].name,score:g.players[id].score,connected:g.players[id].connected})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));for(let i=0;i<leaderboard.length;i++)leaderboard[i].rank=i&&leaderboard[i-1].score===leaderboard[i].score?leaderboard[i-1].rank:i+1;
 // Construct this projection explicitly: private task authors, answer maps, vote
 // maps, RNG and the chosen future deck must never cross the transport boundary.
 const view={code:g.code,hostId:g.hostId,phase:g.phase,round:g.round,roundName:ROUND_NAMES[g.round-1],revision:g.revision,ballotIndex:g.tasks.length?g.current+1:0,ballotCount:g.tasks.length,players:g.playerOrder.map(id=>({id,name:g.players[id].name,score:g.players[id].score,connected:g.players[id].connected,answered:g.tasks.filter(t=>t.authors.includes(id)&&own(t.answers,id)).length,totalAssignments:g.tasks.filter(t=>t.authors.includes(id)).length,voted:g.phase==='voting'?own(voteMap,id):false,boldAvailable:!g.boldUsed[id]})),deadline:g.deadline,assignments,ballot:null,reveal:null,leaderboard,summary:g.summary?structuredClone(g.summary):null,canStart:g.phase==='lobby'&&connected(g).length>=3,settings:{...g.settings},voted:g.phase==='voting'&&own(voteMap,viewerId)};
 if(g.phase==='voting'&&task){view.ballot={promptId:task.id,text:task.text,tag:task.tag,answers:task.order.map(id=>Object.values(task.answers).find(a=>a.id===id)).filter(a=>g.round!==3||a.authorId!==viewerId).map(a=>({id:a.id,text:a.text})),eligible:eligible(g,viewerId,task)};}
 if(g.phase==='reveal'&&task?.reveal)view.reveal=structuredClone(task.reveal);
 return view;
}
