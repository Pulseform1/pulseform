import {CONFIG} from '../shared/simulation.js';
// Original synthesized sound. The default soundscape is silence with sparse drips;
// no continuous oscillators, noise beds, music, or threat drones are started.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : 0));
export const AUDIO_DEFAULTS = Object.freeze({ music: 0, effects: .65, scare: 1 });
export {CREATURE_ACOUSTICS} from './creature-audio.js';
import {CREATURE_ACOUSTICS,EXTRA_CREATURE_VOICES} from './creature-audio.js';
import {synthesizeCreatureVocal} from './creature-voice.js';

function random(state) {
  let x = state.seed; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  state.seed = x >>> 0; return state.seed / 4294967296;
}
export function createAcousticState(seed = 0x57a11) {
  return { seed: seed >>> 0 || 1, initialized: false, active: false, time: 0, nextDrip: 0, nextMusic: 0,
    nextStroke: 0, nextSignature: 0, sample: null, motionUntil: 0, motionSpeed: 0,
    pending: [], wasExposed: false, settleUntil: 0, monsterId: null, monsterUid:null, note: 0 };
}
export function spatialSound(listener, position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return { pan: 0, gain: 1, distance: 0 };
  const dx = position.x - (listener?.x || 0), dz = position.z - (listener?.z || 0);
  const distance = Math.hypot(dx, dz), yaw = listener?.yaw || 0;
  return { pan: distance > .1 ? clamp((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / distance, -1, 1) : 0,
    gain: 1 / (1 + distance * .11) ** 1.25, distance };
}
function resetSchedule(state, time, frame) {
  state.initialized = true; state.time = time;
  state.nextDrip = time + 5 + random(state) * 5;
  state.nextMusic = time + 16 + random(state) * 8;
  state.nextStroke = time + .25; state.nextSignature = time + 1.1 + random(state) * 1.5;
  state.sample = frame.monster ? { x: frame.monster.x, z: frame.monster.z, time } : null;
  state.motionUntil = 0; state.motionSpeed = 0; state.pending = [];
  state.wasExposed = !!frame.exposed; state.settleUntil = time;
  state.monsterId = frame.monsterId || 'dredge';
}
/** Pure scheduling policy, shared by the real audio engine and deterministic tests. */
export function planAcoustics(state, frame = {}, settings = AUDIO_DEFAULTS) {
  const time = Number.isFinite(frame.time) ? frame.time : state.time;
  const active = frame.playing !== false && !frame.paused;
  if (!active) { state.active = false; state.pending = []; state.sample = null; state.time = time; return []; }
  if (!state.initialized || !state.active || time < state.time - .25 || time - state.time > 2) resetSchedule(state, time, frame);
  state.active = true; state.time = time;
  const cues = [], listener = frame.listener || { x: 0, z: 0, yaw: 0 }, monster = frame.monster;
  const monsterId = frame.monsterId || 'dredge', profile = CREATURE_ACOUSTICS[monsterId] || CREATURE_ACOUSTICS.dredge;
  const effects = clamp(Number(settings.effects ?? AUDIO_DEFAULTS.effects));
  if (time >= state.nextDrip) {
    if (effects > 0) cues.push({ kind: 'drip', bus: 'effects', gain: .035 + random(state) * .016,
      pitch: 550 + random(state) * 400, position: { x: (listener.x || 0) + (random(state) - .5) * 13, z: (listener.z || 0) + (random(state) - .5) * 16 } });
    state.nextDrip = time + 7 + random(state) * 7;
  }
  if (time >= state.nextMusic) {
    if (Number(settings.music) > 0) cues.push({ kind: 'music', bus: 'music', gain: .018, pitch: [146.83, 220, 164.81, 196][state.note++ % 4] });
    state.nextMusic = time + 18 + random(state) * 10;
  }
  if (state.monsterId !== monsterId || state.monsterUid !== (monster?.uid||monsterId)) {
    state.monsterUid=monster?.uid||monsterId;
    state.monsterId = monsterId; state.sample = null; state.pending = [];
    state.nextStroke = time + .3; state.nextSignature = time + 1.1 + random(state) * 1.5;
  }
  if (monster && Number.isFinite(monster.x) && Number.isFinite(monster.z)) {
    if (state.sample) {
      const elapsed = time - state.sample.time, displacement = Math.hypot(monster.x - state.sample.x, monster.z - state.sample.z);
      if (displacement > .008 && elapsed > .001) {
        // Actual displacement is required: a stale pursuit/speed field makes no sound.
        const speed = displacement / elapsed;
        if (speed <= (CONFIG.maxMonsterSpeed||44)+1 && elapsed < .5) { state.motionSpeed = clamp(speed, 0, 9); state.motionUntil = time + .16; }
        else { state.motionUntil = 0; state.pending = []; }
        state.sample = { x: monster.x, z: monster.z, time };
      }
    } else state.sample = { x: monster.x, z: monster.z, time };
  } else { state.sample = null; state.motionUntil = 0; }
  if (state.wasExposed && !frame.exposed) {
    state.pending = []; state.settleUntil = time + (monster?.state==='shore'?.12:1); state.nextStroke = state.settleUntil;
  }
  state.wasExposed = !!frame.exposed;
  const distance = monster ? spatialSound(listener, monster).distance : Infinity;
  const chasing = monster && ['pursue', 'investigate', 'shore'].includes(monster.state) && (monster.targetId != null || monster.shorePlayerId != null || frame.exposed);
  const moving = chasing && state.motionUntil > time && state.motionSpeed > .18 && distance < 27 && time >= state.settleUntil;
  if (!moving || effects === 0) {
    state.pending = []; state.nextStroke = Math.max(state.nextStroke, time + .2);
    return cues;
  }
  // Safe friends can hear a creature pursuing someone else, but at a settled level.
  const localPressure = frame.exposed ? 1 : .38;
  const baseGain = (.075 + clamp(1 - distance / 20) * .085) * localPressure;
  if (time >= state.nextStroke) {
    state.pending = profile.beats.map((delay, beat) => ({ due: time + delay, beat }));
    const cadence = clamp(.75 + state.motionSpeed * .12 + clamp(1-distance/16)*.35, .8, 1.85);
    state.nextStroke = time + profile.interval / cadence;
  }
  while (state.pending.length && state.pending[0].due <= time) {
    const { beat } = state.pending.shift();
    cues.push({ kind: 'creature-stroke', variant: profile.variant, monsterId, beat, bus: 'effects', gain: baseGain * (beat ? .8 : 1), position: { x: monster.x, z: monster.z } });
  }
  if (time >= state.nextSignature) {
    cues.push({ kind: 'creature-signature', variant: profile.signature, monsterId, pitch: profile.tone, bus: 'effects', gain: .055 * localPressure, position: { x: monster.x, z: monster.z } });
    if(frame.exposed&&distance<12)cues.push({kind:'creature-voice',monsterId,bus:'effects',gain:.055+clamp(1-distance/12)*.035,position:{x:monster.x,z:monster.z}});
    state.nextSignature = time + 3.5 + random(state) * 3;
  }
  return cues;
}

export class GameAudio {
  constructor() {
    this.context = null; this.settings = { ...AUDIO_DEFAULTS };
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 }; this.monster = null; this.monsterId = 'dredge';
    this.voices = new Set(); this.running = false; this.active = false; this.lastFoot = -Infinity;
    this.lastEvent = 0; this.simulationTime = 0; this.planner = createAcousticState(); this.wasChasing = false;this.preparedVocal=null;
    this.echoNodes = [];
  }
  async unlock() {
    try {
      if (!this.context || this.context.state === 'closed') {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return false;
        const c = this.context = new AudioContext();
        this.master = c.createGain(); this.master.gain.value = .5;
        this.limiter = c.createDynamicsCompressor();
        this.limiter.threshold.value = -19; this.limiter.knee.value = 12; this.limiter.ratio.value = 4;
        this.limiter.attack.value = .008; this.limiter.release.value = .25;
        this.musicBus = c.createGain(); this.fxBus = c.createGain();
        this.musicBus.connect(this.master); this.fxBus.connect(this.master);
        this.master.connect(this.limiter); this.limiter.connect(c.destination);
        this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const samples = this.noise.getChannelData(0), rng = createAcousticState(0x127ace);
        for (let i = 0; i < samples.length; i++) samples[i] = random(rng) * 2 - 1;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (!this.running) {
        this.running = true; this.lastEvent = 0; this.planner = createAcousticState(); this.makeEcho();
      }
      this.setSettings(this.settings);
      return this.context.state === 'running';
    } catch { return false; }
  }
  makeEcho() {
    if (this.echoNodes.length || !this.context) return;
    const c = this.context, impulse = c.createBuffer(2, Math.ceil(c.sampleRate * 1.35), c.sampleRate);
    const rng = createAcousticState(0xec406);
    for (let channel = 0; channel < 2; channel++) {
      const samples = impulse.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) {
        const t = i / c.sampleRate;
        if (t > .075) samples[i] = (random(rng) * 2 - 1) * Math.exp(-t * 5.8) * .055;
      }
      for (const [delay, gain] of [[.12, .5], [.29, .25], [.48, .13], [.76, .07]]) samples[Math.floor((delay + channel * .009) * c.sampleRate)] += gain;
    }
    this.echoInput = c.createGain(); const convolution = c.createConvolver(), output = c.createGain();
    convolution.normalize = false; convolution.buffer = impulse; output.gain.value = .33;
    this.echoInput.connect(convolution); convolution.connect(output); output.connect(this.fxBus);
    this.echoNodes = [this.echoInput, convolution, output];
  }
  setSettings(values = {}) {
    const wasMusic = this.settings.music;
    if('heartbeat' in values){this.settings.heartbeat=!!values.heartbeat;if(!values.heartbeat)this.stopGroup('heartbeat');}
    for (const key of ['music', 'effects', 'scare']) if (key in values) this.settings[key] = clamp(Number(values[key]));
    if (!this.context) return;
    const t = this.context.currentTime;
    this.musicBus.gain.setTargetAtTime(this.settings.music, t, .08);
    this.fxBus.gain.setTargetAtTime(this.settings.effects, t, .08);
    if (wasMusic > 0 && this.settings.music === 0) this.stopGroup('music');
  }
  prepareCreature(id){if(!this.context?.createBuffer||this.preparedVocal?.id===id)return;const data=synthesizeCreatureVocal(id),buffer=this.context.createBuffer(1,data.samples.length,data.sampleRate);buffer.getChannelData(0).set(data.samples);this.preparedVocal={id,buffer};}
  spatial(position) { return spatialSound(this.listener, position); }
  voice({ frequency = 80, endFrequency = frequency, duration = .2, gain = .08, noise = false, buffer = null, type = 'sine', filter = 1200,
    filterType = 'lowpass', position = null, music = false, attack = .015, wet = .15, group = 'effect' } = {}) {
    const c = this.context;
    if (!c || !this.running || !this.active || c.state !== 'running' || this.voices.size >= 24) return;
    if (music ? this.settings.music === 0 : this.settings.effects === 0) return;
    const t = c.currentTime, source = noise || buffer ? c.createBufferSource() : c.createOscillator();
    duration = clamp(duration, .035, 3.5);
    if (noise || buffer) source.buffer = buffer || this.noise;
    else { source.type = type; source.frequency.setValueAtTime(Math.max(15, frequency), t); source.frequency.exponentialRampToValueAtTime(Math.max(15, endFrequency), t + duration); }
    const tone = c.createBiquadFilter(); tone.type = filterType; tone.frequency.value = filter; tone.Q.value = .65;
    const envelope = c.createGain(), panner = c.createStereoPanner(), spatial = this.spatial(position);
    panner.pan.value = spatial.pan;
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(clamp(gain * spatial.gain, 0, .32), t + Math.min(attack, duration * .4));
    envelope.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(tone); tone.connect(envelope); envelope.connect(panner); panner.connect(music ? this.musicBus : this.fxBus);
    const nodes = [source, tone, envelope, panner];
    if (!music && wet > 0 && this.echoInput) { const send = c.createGain(); send.gain.value = clamp(wet, 0, .5); panner.connect(send); send.connect(this.echoInput); nodes.push(send); }
    const record = { source, envelope, nodes, group }; this.voices.add(record);
    source.onended = () => { nodes.forEach(n => { try { n.disconnect(); } catch {} }); this.voices.delete(record); };
    source.start(t); source.stop(t + duration + .025);
  }
  renderCue(cue) {
    const common = { position: cue.position, gain: cue.gain, group: cue.kind.startsWith('creature') ? 'approach' : cue.kind === 'music' ? 'music' : 'ambience' };
    if(cue.kind==='creature-voice'){this.prepareCreature(cue.monsterId);if(this.preparedVocal)this.voice({...common,buffer:this.preparedVocal.buffer,duration:.62,gain:cue.gain,filter:1250,attack:.035,wet:.28});return;}
    const extra=cue.kind.startsWith('creature')&&EXTRA_CREATURE_VOICES[cue.variant];
    if(extra){for(const voice of extra)this.voice({...common,...voice,gain:cue.gain*(voice.gainScale??1)});return;}
    if (cue.kind === 'drip') {
      this.voice({ ...common, frequency: cue.pitch * 1.45, endFrequency: cue.pitch, duration: .14, filter: 1800, wet: .48, attack: .004 });
      this.voice({ ...common, noise: true, duration: .045, filter: 2200, gain: cue.gain * .35, wet: .25, attack: .003 });
    } else if (cue.kind === 'music') {
      this.voice({ ...common, frequency: cue.pitch, endFrequency: cue.pitch * .998, duration: 3.2, filter: 500, music: true, attack: 1.1, wet: 0 });
    } else if (cue.kind === 'creature-stroke') {
      const g = cue.gain;
      switch (cue.variant) {
        case 'blob':
          this.voice({ ...common, noise: true, duration: .6, filter: 520, attack: .11, wet: .22 });
          this.voice({ ...common, frequency: 125, endFrequency: 46, duration: .3, gain: g * .42, wet: .12, attack: .04 }); break;
        case 'crawler':
          this.voice({ ...common, noise: true, duration: .43, filter: cue.beat ? 950 : 700, attack: .09, wet: .22 }); break;
        case 'stalker':
          this.voice({ ...common, noise: true, duration: .25, filter: cue.beat ? 1300 : 950, attack: .025, wet: .2 });
          this.voice({ ...common, frequency: cue.beat ? 96 : 78, endFrequency: 45, duration: .15, gain: g * .28, wet: .12 }); break;
        case 'veil':
          this.voice({ ...common, frequency: 590, endFrequency: 360, duration: .17, gain: g * .48, filter: 1400, wet: .42, attack: .009 });
          this.voice({ ...common, noise: true, duration: .32, gain: g * .4, filter: 1350, attack: .10, wet: .18 }); break;
        case 'serpent':
          this.voice({ ...common, noise: true, duration: .72, filter: 1050, filterType: 'bandpass', attack: .20, wet: .16 }); break;
        case 'armored': this.voice({ ...common, noise:true,duration:.23,filter:950,gain:g*.75,attack:.035,wet:.23 }); break;
        case 'wing': this.voice({ ...common,noise:true,duration:.65,filter:480,gain:g*.75,attack:.19,wet:.30 }); break;
        case 'suction': this.voice({ ...common,frequency:130,endFrequency:37,duration:.32,filter:390,gain:g*.85,attack:.045,wet:.27 }); break;
        case 'heavy-step': this.voice({ ...common,noise:true,duration:.3,filter:720,gain:g,attack:.03,wet:.24 }); break;
        case 'shell-drag': this.voice({ ...common,noise:true,duration:.38,filter:1400,filterType:'bandpass',gain:g*.60,attack:.10,wet:.27 }); break;
        case 'radial':
          this.voice({ ...common, noise: true, duration: .17, filter: 1500 + cue.beat * 180, gain: g * .65, attack: .025, wet: .22 }); break;
      }
    } else if (cue.kind === 'creature-signature') {
      switch (cue.variant) {
        case 'bubbles': this.voice({ ...common, frequency: 170, endFrequency: 54, duration: .28, filter: 450, wet: .3 }); break;
        case 'creak': this.voice({ ...common, frequency: 126, endFrequency: 93, duration: .48, type: 'triangle', filter: 420, attack: .11, wet: .28 }); break;
        case 'double-drop': this.voice({ ...common, frequency: 230, endFrequency: 92, duration: .22, filter: 700, wet: .32 }); break;
        case 'resonance': this.voice({ ...common, frequency: 338, endFrequency: 331, duration: 1.1, filter: 600, attack: .23, wet: .42 }); break;
        case 'ripple': this.voice({ ...common, noise: true, duration: .43, filter: 550, filterType: 'bandpass', attack: .13, wet: .2 }); break;
        case 'shell-click': this.voice({ ...common,frequency:430,endFrequency:170,duration:.12,type:'triangle',filter:1100,wet:.36 }); break;
        case 'whistle': this.voice({ ...common,frequency:380,endFrequency:210,duration:.75,filter:700,attack:.20,wet:.38 }); break;
        case 'gulp': this.voice({ ...common,frequency:87,endFrequency:31,duration:.35,filter:260,attack:.035,wet:.30 }); break;
        case 'chuff': this.voice({ ...common,noise:true,duration:.39,filter:430,attack:.09,wet:.27 }); break;
        case 'hinge': this.voice({ ...common,frequency:258,endFrequency:189,duration:.58,type:'triangle',filter:580,attack:.14,wet:.38 }); break;
        case 'flutter': this.voice({ ...common, noise: true, duration: .26, filter: 1750, gain: cue.gain * .7, attack: .035, wet: .3 }); break;
      }
    }
  }
  update(frame = {}) {
    const { listener, monster, monsterId, exposed = false, time = 0 } = frame;
    if (time + .25 < this.simulationTime) { this.lastEvent = 0; this.stopGroup('approach'); }
    this.simulationTime = time;
    if (listener) this.listener = { ...this.listener, ...listener };
    this.monster = monster || null; if (monsterId) this.monsterId = monsterId;
    const active = frame.playing !== false && !frame.paused;
    if (this.active && !active) for (const group of ['approach', 'ambience', 'music', 'movement', 'warning', 'heartbeat']) this.stopGroup(group);
    const chasing = !!monster && ['pursue', 'investigate', 'shore'].includes(monster.state);
    if ((this.wasChasing && !chasing) || (this.planner.wasExposed && !exposed)) this.stopGroup('approach');
    this.wasChasing = chasing; this.active = active;
    const cues = planAcoustics(this.planner, { ...frame, listener: this.listener, monster: this.monster, monsterId: this.monsterId }, this.settings);
    if (!this.running || !this.context || this.context.state !== 'running') return;
    for (const cue of cues) this.renderCue(cue);
  }
  footstep(wet = false) {
    if (!this.context || !this.active || this.context.currentTime - this.lastFoot < .21) return;
    this.lastFoot = this.context.currentTime;
    if (wet) this.voice({ noise: true, duration: .19, gain: .075, filter: 1000, wet: .18, group: 'movement', attack: .025 });
    else { this.voice({ frequency: 105, endFrequency: 49, duration: .085, gain: .075, filter: 430, wet: .15, group: 'movement' }); this.voice({ noise: true, duration: .04, gain: .025, filter: 1500, wet: .16, group: 'movement' }); }
  }
  event(event, localId) {
    if (!event || !this.running) return;
    if (Number.isFinite(event.id)) { if (event.id <= this.lastEvent) return; this.lastEvent = event.id; }
    if (!this.active) return;
    const local = !event.playerId || event.playerId === localId, position = local ? null : event;
    if(['detected','windup','lunge'].includes(event.type)&&event.monsterUid&&event.monsterUid!==this.monster?.uid)return;
    const monsterPosition = event.monsterUid&&event.monsterUid!==this.monster?.uid?event:this.monster||event;
    const profile = CREATURE_ACOUSTICS[event.monsterId || this.monsterId] || CREATURE_ACOUSTICS.dredge;
    const scare = .55 + this.settings.scare * .45;
    switch (event.type) {
      case 'splash':
        this.voice({ noise: true, duration: .55, gain: .19, filter: 1450, position, attack: .03, wet: .2 });
        this.voice({ frequency: 105, endFrequency: 43, duration: .27, gain: .075, position, wet: .14 }); break;
      case 'safe':
        if (local) { this.stopGroup('approach'); this.stopGroup('warning'); this.voice({ noise: true, duration: .14, gain: .025, filter: 650, wet: .1 }); } break;
      case 'jump': if (local) this.voice({ noise: true, duration: .08, gain: .025, filter: 580, wet: .05, group: 'movement' }); break;
      case 'mantle': if (local) this.voice({ noise: true, duration: .24, gain: .055, filter: 580, wet: .12, group: 'movement' }); break;
      case 'land':
        this.voice({ frequency: 87, endFrequency: 38, duration: .14, gain: .11, position, wet: .18, group: 'movement' });
        this.voice({ noise: true, duration: .045, gain: .035, filter: 1100, position, wet: .14, group: 'movement' }); break;
      case 'detected': this.renderCue({ kind: 'creature-signature', variant: profile.signature, monsterId: event.monsterId||this.monsterId, gain: .065, position: monsterPosition }); break;
      case 'windup':
        this.stopGroup('approach');
        this.voice({ noise: true, duration: .48, gain: .10 * scare, filter: 800, position: monsterPosition, attack: .11, wet: .18, group: 'warning' });
        this.voice({ frequency: profile.tone * .8, endFrequency: profile.tone * 1.25, duration: .45, gain: .045 * scare, filter: 650, position: monsterPosition, attack: .1, wet: .2, group: 'warning' }); break;
      case 'lunge':
        this.voice({ noise: true, duration: .45, gain: .19 * scare, filter: 1650, position: monsterPosition, attack: .045, wet: .17, group: 'warning' });
        this.voice({ frequency: profile.tone * 1.2, endFrequency: Math.max(35, profile.tone * .6), duration: .32, gain: .07 * scare, filter: 750, position: monsterPosition, attack: .04, wet: .13, group: 'warning' }); break;
      case 'death':
        if (local) this.stopGroup('approach'); break; // Confirmed local transition owns the single scare sound.
    }
  }
  heartbeat(beat,intensity,reduced=false){
    if(!this.settings.heartbeat&&this.settings.heartbeat!==undefined)return;
    const gain=(.035+Math.max(0,Math.min(1,intensity))*.050)*beat*(reduced?.55:1);
    this.voice({frequency:beat===1?62:48,endFrequency:32,duration:.12,gain,filter:170,attack:.009,wet:.04,group:'heartbeat'});
  }
  jumpScare(monsterId, reduced = false, phase = 'impact') {
    if (!this.running || !this.context) return;
    const profile = CREATURE_ACOUSTICS[monsterId] || CREATURE_ACOUSTICS.dredge;
    this.stopGroup('approach'); this.stopGroup('warning');
    const wasActive = this.active; this.active = true;
    const soft = reduced || !this.settings.scare;
    if(soft){
      if(phase==='impact')this.voice({frequency:profile.tone,endFrequency:Math.max(29,profile.tone*.65),duration:.32,gain:.045,filter:650,attack:.08,wet:.20,group:'scare'});
    }else if(phase==='anticipation'){
      this.voice({noise:true,duration:.13,gain:.035,filter:480,attack:.025,wet:.20,group:'scare'});
      this.voice({frequency:profile.tone*.65,endFrequency:profile.tone*.95,duration:.17,gain:.040,filter:650,attack:.035,wet:.22,group:'scare'});
    }else if(phase==='breach'){
      this.voice({noise:true,duration:.24,gain:.065,filter:1100,filterType:'bandpass',attack:.035,wet:.24,group:'scare'});
      this.voice({frequency:profile.tone*.8,endFrequency:profile.tone*.45,duration:.20,gain:.035,filter:430,attack:.025,wet:.16,group:'scare'});
    }else if(phase==='impact'){
      this.prepareCreature(monsterId);
      if(this.preparedVocal?.id===monsterId)this.voice({buffer:this.preparedVocal.buffer,duration:.74,gain:.13,filter:2400,attack:.014,wet:.30,group:'scare'});
      this.voice({noise:true,duration:.055,gain:.09,filter:2900,filterType:'bandpass',attack:.005,wet:.13,group:'scare'});
      this.voice({noise:true,duration:.34,gain:.16,filter:1250,attack:.014,wet:.16,group:'scare'});
      this.voice({frequency:profile.tone*1.3,endFrequency:Math.max(29,profile.tone*.48),duration:.46,gain:.12,filter:700,attack:.015,wet:.20,group:'scare'});
      this.voice({frequency:49,endFrequency:30,duration:.17,gain:.065,filter:220,attack:.018,wet:.12,group:'scare'});
    }else if(phase==='recoil'){
      this.voice({noise:true,duration:.32,gain:.035,filter:520,attack:.06,wet:.32,group:'scare'});
    }
    this.active = wasActive;
  }
  stopGroup(group) {
    if (!this.context) return;
    const time = this.context.currentTime;
    for (const record of this.voices) if (record.group === group) {
      try { record.envelope.gain.cancelAndHoldAtTime(time); record.envelope.gain.setTargetAtTime(.0001, time, .015); record.source.stop(time + .07); }
      catch { try { record.source.stop(); } catch {} }
    }
  }
  stop() {
    this.running = this.active = false;
    for (const record of this.voices) { try { record.source.stop(); } catch {} record.nodes.forEach(n => { try { n.disconnect(); } catch {} }); }
    this.voices.clear();
    for (const node of this.echoNodes) { try { node.disconnect(); } catch {} }
    this.echoNodes = []; this.echoInput = null; this.monster = null; this.lastEvent = 0;
    this.planner = createAcousticState(); this.wasChasing = false;this.preparedVocal=null;
  }
  dispose() {
    this.stop();
    for (const node of [this.musicBus, this.fxBus, this.master, this.limiter]) { try { node?.disconnect(); } catch {} }
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
  }
}
