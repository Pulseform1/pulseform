import * as neon from './sim/neon.js';
import * as deep from './sim/deep.js';
import * as ash from './sim/ash.js';
import * as sky from './sim/sky.js';
import * as chamber from './sim/chamber.js';
export const engines={neon,deep,ash,sky,chamber};
export function createSession(game,seed=1){if(!engines[game])throw new Error('Unknown game');return {game,seed,state:engines[game].initial(seed),inputs:{}}}
export function addPlayer(session,id){if(session.state.players[id])return true;if(Object.keys(session.state.players).length>=4)return false;engines[session.game].join(session.state,id,Object.keys(session.state.players).length);return true}
export function removePlayer(session,id){delete session.state.players[id];delete session.inputs[id]}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
export function setInput(session,id,input){if(!session.state.players[id]||!input||typeof input!=='object')return;session.inputs[id]={x:clamp(input.x,-1,1),z:clamp(input.z,-1,1),yaw:clamp(input.yaw,-100000,100000),pitch:clamp(input.pitch,-1.35,1.35),jump:input.jump===true,action:input.action===true,sprint:input.sprint===true}}
export function advance(session,dt=1/30){if(session.state.status==='playing'&&Object.keys(session.state.players).length)engines[session.game].step(session.state,session.inputs,Math.max(0,Math.min(dt,.1)))}
