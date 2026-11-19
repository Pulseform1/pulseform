import test from 'node:test';
import assert from 'node:assert/strict';
import {DeathSequence,attackVariant} from '../public/death-sequence.js';
const alive={id:'me',alive:true},dead={id:'me',alive:false};
test('one authoritative local death triggers once and expires quickly',()=>{const d=new DeathSequence();d.reset(alive);assert.equal(d.observe(dead,100,{monsterId:'hush'}),true);assert.equal(d.frame(200).monsterId,'hush');assert.equal(d.observe(dead,300),false);assert.equal(d.frame(1340),null);assert.equal(d.observe(dead,1400),false);});
test('safe landings, other identities and reconnecting dead do not cause a scare',()=>{const d=new DeathSequence();d.reset(alive);assert.equal(d.observe({...alive,safe:true},1),false);assert.equal(d.observe({id:'other',alive:false},2),false);d.reset(dead);assert.equal(d.observe(dead,3),false);});
test('reduced scare is shorter and skip leaves the normal flow immediately available',()=>{const d=new DeathSequence();d.reset(alive);d.observe(dead,10,{reduced:true});assert.equal(d.frame(400).reduced,true);assert.equal(d.frame(450),null);d.reset(alive);d.observe(dead,500);d.skip();assert.equal(d.frame(501),null);});

test('restart cancels prior presentation and a new local life can trigger once again',()=>{const d=new DeathSequence();d.reset(alive);d.observe(dead,100,{monsterId:'crown'});d.reset(alive);assert.equal(d.frame(200),null);assert.equal(d.observe(dead,300,{monsterId:'gloomfin'}),true);assert.equal(d.frame(301).monsterId,'gloomfin');assert.equal(d.observe(dead,400),false);});

test('checkpoint life boundaries reject stale deaths and allow one new confirmed death',()=>{
 const d=new DeathSequence();d.reset({...alive,lifeId:2});assert.equal(d.observe({...dead,lifeId:2},0,{monsterId:'leech'}),true);
 assert.equal(d.observe({...alive,lifeId:3},1),false);assert.equal(d.frame(1),null);
 assert.equal(d.observe({...dead,lifeId:2},2),false);assert.equal(d.observe({...dead,lifeId:3},3,{monsterId:'wader'}),true);assert.equal(d.frame(4).monsterId,'wader');assert.equal(d.observe({...dead,lifeId:3},5),false);
});

test('attack routes vary by actual killer instance and life without replaying snapshot deaths',()=>{const player={id:'me',alive:true,lifeId:4,killerMonsterUid:'m:0:3'},seen=new Set();for(let lifeId=0;lifeId<3;lifeId++)seen.add(attackVariant({...player,lifeId},'raker'));assert.equal(seen.size,3);assert.equal(attackVariant(player,'raker'),attackVariant({...player},'raker'));const d=new DeathSequence();d.reset(player);assert.equal(d.observe({...player,alive:false},0,{monsterId:'raker'}),true);const variant=d.current.variant;assert.equal(d.observe({...player,alive:false},1,{monsterId:'raker'}),false);assert.equal(d.current.variant,variant);assert.equal(d.current.lifeId,4);});
