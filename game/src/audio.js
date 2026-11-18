// Synthesized WebAudio: engine hum, two-tone sirens, gunfire, bass loop.
// Nothing is loaded from disk — every sound is built from oscillators and noise.
let ctx = null, master = null, muted = false;
let engineOsc = null, engineGain = null, engineFilter = null;
let sirenOsc = null, sirenGain = null, sirenLfo = null;
let bassTimer = null, bassStep = 0;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    // Engine: sawtooth through a lowpass, pitch follows speed.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass'; engineFilter.frequency.value = 420;
    engineGain = ctx.createGain(); engineGain.gain.value = 0.0;
    engineOsc.connect(engineFilter); engineFilter.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
    // Siren: triangle wave wobbling between two tones.
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 720;
    sirenLfo = ctx.createOscillator(); sirenLfo.type = 'square'; sirenLfo.frequency.value = 0.55;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
    sirenLfo.connect(lfoGain); lfoGain.connect(sirenOsc.frequency);
    sirenGain = ctx.createGain(); sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master);
    sirenOsc.start(); sirenLfo.start();
    startBassLoop();
  } catch (e) { ctx = null; }
}

export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export function isMuted() { return muted; }

// speed: 0..1 of top speed. driving: bool.
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

export function playGunshot() {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.14);
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
  const g = ctx.createGain(); g.gain.value = 0.5;
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
  const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(160, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.1);
  const og = ctx.createGain(); og.gain.setValueAtTime(0.28, ctx.currentTime);
  og.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  o.connect(og); og.connect(master); o.start(); o.stop(ctx.currentTime + 0.13);
}

export function playCrash() {
  if (!ctx || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(0.22);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const g = ctx.createGain(); g.gain.value = 0.55;
  src.connect(f); f.connect(g); g.connect(master); src.start();
}

export function playPickup() {
  if (!ctx || muted) return;
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(660, ctx.currentTime);
  o.frequency.setValueAtTime(990, ctx.currentTime + 0.09);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.22, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + 0.24);
}

export function playMissionDone() {
  if (!ctx || muted) return;
  [523, 659, 784, 1046].forEach((f, i) => {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + i * 0.11;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.32);
  });
}

// Lo-fi bass loop: A minor walking line, one note every 0.42 s.
function startBassLoop() {
  const notes = [55, 55, 65.41, 49, 55, 55, 82.41, 73.42];
  bassTimer = setInterval(() => {
    if (!ctx || muted || ctx.state !== 'running') return;
    const f = notes[bassStep % notes.length]; bassStep++;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.42);
  }, 420);
}
