import {test} from 'node:test';import assert from 'node:assert/strict';import {walkable,pathTo,objectives,clearSight} from '../world.js';
test('all objectives can be reached from the spawn',()=>{for(const o of objectives){let p={x:2,z:1};for(let n=0;n<200&&Math.hypot(p.x-o.x,p.z-o.z)>0;n++){const [x,z]=pathTo(p,o);assert.ok(walkable(x,z));p={x,z}}assert.deepEqual(p,{x:o.x,z:o.z})}});
test('walls and bounds block movement',()=>{assert.equal(walkable(0,0),false);assert.equal(walkable(-1,2),false);assert.equal(walkable(2,1),true)});

test('flashlight visibility is blocked by facility walls',()=>{assert.equal(clearSight({x:1,z:1},{x:5,z:1}),true);assert.equal(clearSight({x:1,z:1},{x:8,z:1}),false)});
