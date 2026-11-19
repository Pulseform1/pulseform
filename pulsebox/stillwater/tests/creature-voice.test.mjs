import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {synthesizeCreatureVocal} from '../public/creature-voice.js';
import {CREATURE_ACOUSTICS} from '../public/creature-audio.js';
test('all21 original nonverbal vocal buffers are finite, bounded, distinct and short',()=>{const hashes=new Set();for(const id of Object.keys(CREATURE_ACOUSTICS)){const a=synthesizeCreatureVocal(id);assert.equal(a.samples.length,17760);assert.equal(a.duration,.74);let peak=0,rms=0;for(const v of a.samples){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));rms+=v*v;}assert.ok(peak<=.821&&peak>.8);assert.ok(Math.sqrt(rms/a.samples.length)>.08);hashes.add(createHash('sha256').update(Buffer.from(a.samples.buffer)).digest('hex'));}assert.equal(hashes.size,21);});
test('vocal preparation is deterministic and contains changing voiced/rough energy, not a pure tone',()=>{const a=synthesizeCreatureVocal('dredge'),b=synthesizeCreatureVocal('dredge');assert.deepEqual(a.samples,b.samples);let changes=0;for(let i=1;i<a.samples.length;i++)if(a.samples[i]*a.samples[i-1]<0)changes++;assert.ok(changes>100&&changes<6000);let early=0,late=0;for(let i=3000;i<6000;i++)early+=a.samples[i]**2;for(let i=14000;i<17000;i++)late+=a.samples[i]**2;assert.ok(early>late*2);});
