// Synthesized sound for Aurelia Nights: every sound is built with WebAudio
// oscillators and filtered noise. No audio files, no network.
import { clamp } from './util.js';

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenTimer = 0;
    this.musicTimer = null;
    this.musicStep = 0;
    this.started = false;
  }

  // Must be called from a user gesture (menu click / first key).
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.started = true;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  _noise(dur, vol, filterFreq, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type; filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t);
  }

  click() { this._tone(660, 0.07, 'square', 0.12); }
  pickup() { this._tone(880, 0.09, 'sine', 0.25); this._tone(1318, 0.14, 'sine', 0.22); }
  cash() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._tone(f, 0.16, 'triangle', 0.22), i * 70)); }
  gunshot() { this._noise(0.14, 0.5, 1800); this._tone(160, 0.1, 'square', 0.2, 60); }
  enemyShot() { this._noise(0.1, 0.22, 1200); }
  hit() { this._tone(220, 0.12, 'sawtooth', 0.25, 90); }
  hurt() { this._tone(140, 0.25, 'sawtooth', 0.3, 70); }
  bust() { this._tone(392, 0.2, 'square', 0.2); this._tone(311, 0.35, 'square', 0.2); }
  missionDone() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this._tone(f, 0.22, 'triangle', 0.25), i * 90)); }
  missionFail() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this._tone(f, 0.25, 'sawtooth', 0.18), i * 110)); }
  win() { [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => this._tone(f, 0.3, 'triangle', 0.25), i * 120)); }
  horn() { this._tone(370, 0.25, 'square', 0.15); this._tone(466, 0.25, 'square', 0.12); }
  door() { this._noise(0.12, 0.18, 900); }

  // Continuous engine hum; call every frame with speed 0..1 and whether driving.
  engine(speed, driving) {
    if (!this.ctx) return;
    if (!driving) {
      if (this.engineGain) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 700;
      this.engineOsc.connect(filter); filter.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    }
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + speed * 165, t, 0.08);
    this.engineGain.gain.setTargetAtTime(this.muted ? 0 : 0.05 + speed * 0.05, t, 0.1);
  }

  // Two-tone police siren while wanted > 0.
  siren(dt, wanted) {
    if (!this.ctx) return;
    if (wanted <= 0) {
      if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    if (!this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain); this.sirenGain.connect(this.master);
      this.sirenOsc.start();
    }
    this.sirenTimer += dt;
    const high = Math.floor(this.sirenTimer * 1.6) % 2 === 0;
    const t = this.ctx.currentTime;
    this.sirenOsc.frequency.setTargetAtTime(high ? 950 : 700, t, 0.05);
    this.sirenGain.gain.setTargetAtTime(this.muted ? 0 : 0.035, t, 0.2);
  }

  // A slow, moody bass-and-pad loop: Am – F – C – G, one bar per 2.4 s.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const roots = [110, 87.31, 130.81, 98];
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]];
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const bar = this.musicStep % 4;
      const root = roots[bar];
      this._tone(root, 0.55, 'triangle', 0.16);
      this._tone(root * 2, 0.3, 'sine', 0.07);
      if (this.musicStep % 2 === 0) {
        for (const f of chords[bar]) this._tone(f, 1.1, 'sine', 0.035);
      }
      if (this.musicStep % 8 === 6) this._tone(root * 4, 0.18, 'square', 0.03);
      this.musicStep++;
    }, 600);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
