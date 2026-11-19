import {advancePredictionWorld,clonePlatformStates,stepPlayer} from '/shared/simulation.js';
/** One prediction timeline per authoritative snapshot, never a fresh frozen clock per tick. */
export function makePredictionWorld(snapshot,player){return {seed:snapshot.seed,difficulty:snapshot.difficulty,time:snapshot.time,events:null,monster:snapshot.monster,monsters:snapshot.monsters,platformEpoch:snapshot.platformEpoch||0,platformStates:clonePlatformStates(snapshot.platformStates),players:{...Object.fromEntries(snapshot.players.map(p=>[p.id,p])),[player.id]:player}};}
export function predictStep(world,player,input,dt){advancePredictionWorld(world,dt);stepPlayer(player,input,dt,world);}
