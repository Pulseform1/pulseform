import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {increasedMouseSensitivity} from '../public/control-settings.js';
import {captureMessage} from '../public/controls.js';
test('requested60% mouse increase reaches existing profiles once and leaves keyboard settings unchanged',()=>{const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),a=source.indexOf("if(!storage.get('stillwater.turning-v18'))"),b=source.indexOf("if(!storage.get('stillwater.quiet-audio'))",a);for(const [old,next]of [[1,1.6],[.5,.8],[2.5,4]]){const saved=new Map(),settings={sensitivity:old,keyboardSpeed:1};const context={settings,increasedMouseSensitivity,storage:{get:k=>saved.get(k),set:(k,v)=>saved.set(k,v)}};vm.runInNewContext(source.slice(a,b),context);assert.equal(settings.sensitivity,next);assert.equal(settings.keyboardSpeed,1);settings.sensitivity=.7;vm.runInNewContext(source.slice(a,b),context);assert.equal(settings.sensitivity,.7);}});
test('actual observed Chromium failure is explained without pretending capture succeeded',()=>{const text=captureMessage({actualLocked:false,reason:'rejected',errorName:'UnknownError',errorMessage:'If you see this error we have a bug. Please report this bug to chromium.'});assert.match(text,/internal mouse-capture error/);assert.match(text,/regular Chrome or Safari/);assert.doesNotMatch(text,/Mouse locked/);});
