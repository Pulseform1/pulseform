// A small job queue over a pool of generation workers, nearest work first. Falls back to the main thread (with a
// per-frame time budget) if workers are unavailable.
/* global __WORKER__ */
import * as gen from './gen.js';
import { World } from './world.js';

export class Jobs {
  constructor(seed, camp) {
    this.world = new World(seed); if (camp) this.world.setCamp(camp.x, camp.z);
    this.queue = []; this.wait = new Map(); this.nextId = 1; this.workers = []; this.inflight = [];
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4, n = Math.max(1, Math.min(4, cores - 2));
    try {
      if (typeof Worker === 'undefined' || typeof __WORKER__ === 'undefined') throw 0;
      const url = URL.createObjectURL(new Blob([__WORKER__], { type: 'text/javascript' }));
      for (let i = 0; i < n; i++) {
        const w = new Worker(url); w.onmessage = e => this.finish(i, e.data); w.onerror = () => { this.workers = []; };
        w.postMessage({ t: 'init', seed, camp }); this.workers.push(w); this.inflight.push(0);
      }
    } catch { this.workers = []; }
  }
  // queue a job; returns { promise, cancel(), prio }
  run(msg, prio = 0) {
    const job = { id: this.nextId++, msg, prio, dead: false };
    job.promise = new Promise(res => { job.res = res; });
    job.cancel = () => { job.dead = true; };
    this.queue.push(job); this.sorted = false; this.pump();
    return job;
  }
  pump() {
    if (!this.workers.length) return;
    if (!this.sorted) { this.queue.sort((a, b) => a.prio - b.prio); this.sorted = true; }
    for (let i = 0; i < this.workers.length; i++) {
      while (this.inflight[i] < 2 && this.queue.length) {
        const job = this.queue.shift(); if (job.dead) continue;
        this.inflight[i]++; this.wait.set(job.id, job); this.workers[i].postMessage({ ...job.msg, id: job.id });
      }
    }
  }
  finish(i, data) { this.inflight[i]--; const job = this.wait.get(data.id); this.wait.delete(data.id); if (job && !job.dead) job.res(data.r); this.pump(); }
  // main-thread fallback, called every frame
  tick(budgetMs = 6) {
    if (this.workers.length) { this.pump(); return; }
    if (!this.sorted) { this.queue.sort((a, b) => a.prio - b.prio); this.sorted = true; }
    const t0 = performance.now();
    while (this.queue.length && performance.now() - t0 < budgetMs) {
      const job = this.queue.shift(); if (job.dead) continue; const m = job.msg, w = this.world;
      const r = m.t === 'terrain' ? gen.terrainChunk(w, m.x0, m.z0, m.size, m.res, m.skirt) : m.t === 'flora' ? gen.flora(w, m.cx, m.cz, m.C) : m.t === 'map' ? gen.mapTile(w, m.x0, m.z0, m.size, m.n) : gen.grassField(w, m.x0, m.z0, m.n, m.step, m.h0);
      job.res(r);
    }
  }
  resort() { this.sorted = false; }
  get pending() { return this.queue.length + this.wait.size; }
  dispose() { for (const w of this.workers) w.terminate(); this.workers = []; this.queue = []; }
}
