// Aurelia Nights — synthesized sound. No audio files are loaded: every
// sound is built from oscillators and filtered noise through one master gain.
// AudioContext is created lazily on the first user gesture (browser policy),
// so constructing the game on the title screen stays silent.
let ctx = null;
let master = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let engineFilter = null;
let sirenOsc = null;
let sirenGain = null;
let bassTimer = null;
let bassStep = 0;
let hornOsc = null;

export function initAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    // Engine: sawtooth through a lowpass; pitch follows speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();

    // Siren: triangle wave wobbling between two tones on a square LFO.
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 720;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 0.55;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(sirenOsc.frequency);
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain);
    sirenGain.connect(master);
    sirenOsc.start();
    lfo.start();

    startBassLoop();
  } catch (e) {
    ctx = null;
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

// speed: 0..1 of top speed. driving: whether the player is in a car.
export function setEngine(speed, driving) {
  if (!ctx || !engineOsc) return;
  const t = ctx.currentTime;
  engineOsc.frequency.setTargetAtTime(48 + speed * 165, t, 0.08);
  engineGain.gain.setTargetAtTime(driving ? 0.05 + speed * 0.075 : 0.018, t, 0.1);
  engineFilter.frequency.setTargetAtTime(380 + speed * 900, t, 0.1);
}

export function setSiren(on) {
  if (!ctx || !sirenGain) return;
  sirenGain.gain.setTargetAtTime(on ? 0.035 : 0.0, ctx.currentTime, 0.2);
}

function noiseBuffer(dur) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  return buf;
}

function blip(freq0, freq1, dur, type, vol) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq0, t);
  if (freq1 !== freq0) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol || 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playGunshot() {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.14);
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = 0.5;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
  blip(160, 45, 0.12, 'square', 0.28);
}

export function playShotgun() {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.28);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const g = ctx.createGain();
  g.gain.value = 0.7;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
  blip(120, 35, 0.22, 'square', 0.35);
}

export function playCrash() {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.22);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.value = 0.55;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

export function playPickup() {
  blip(660, 990, 0.22, 'sine', 0.22);
}

export function playCash() {
  blip(880, 1320, 0.18, 'triangle', 0.2);
}

export function playHorn() {
  if (!ctx || muted || hornOsc) return;
  hornOsc = ctx.createOscillator();
  hornOsc.type = 'square';
  hornOsc.frequency.value = 370;
  const g = ctx.createGain();
  g.gain.value = 0.12;
  hornOsc.connect(g);
  g.connect(master);
  hornOsc.start();
  setTimeout(() => {
    try { hornOsc.stop(); } catch (e) { /* already stopped */ }
    hornOsc = null;
  }, 260);
}

export function playMissionDone() {
  if (!ctx || muted) return;
  const notes = [523, 659, 784, 1046];
  notes.forEach((freq, i) => {
    const t0 = ctx.currentTime + i * 0.11;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + 0.32);
  });
}

export function playBusted() {
  blip(392, 196, 0.7, 'sawtooth', 0.18);
}

// Lo-fi bass loop: an A-minor walking line, one note every 0.42 s.
function startBassLoop() {
  const notes = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  bassTimer = setInterval(() => {
    if (!ctx || muted || ctx.state !== 'running') return;
    const f = notes[bassStep % notes.length];
    bassStep++;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.42);
  }, 420);
}
