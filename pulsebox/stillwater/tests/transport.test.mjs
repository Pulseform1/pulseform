import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapYaw} from '../public/transport.js';
test('network yaw preserves arbitrary full turns without a clamp or nonfinite value',()=>{for(const turns of [-100000,-1600,0,4,1600,100000])for(const angle of [-2.7,0,.72,3.1]){const a=wrapYaw(turns*2*Math.PI+angle);assert.ok(Math.abs(a-angle)<1e-9);assert.ok(a>=-Math.PI&&a<Math.PI);}assert.equal(wrapYaw(Infinity),0);assert.equal(wrapYaw(NaN),0);});
