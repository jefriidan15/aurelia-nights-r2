// Aurelia Nights — sound: fully synthesised WebAudio music and effects.
export function makeSound() {
  let ctx = null, master = null, musicGain = null, muted = false;
  let musicTimer = null, beat = 0;
  const bassLine = [55, 0, 55, 65.4, 55, 0, 49, 58.3];
  const chordTones = [220, 261.6, 329.6, 392];

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      return true;
    } catch (e) { return false; }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = lowpass;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0);
  }

  function scheduleBeat() {
    if (!ctx || muted) return;
    const step = beat % 16;
    if (step % 4 === 0) tone(130, 0.12, 'sine', 0.5); // kick
    if (step % 4 === 2) noise(0.05, 0.12, 6000); // hat
    if (step === 4 || step === 12) noise(0.18, 0.2, 1800); // snare
    const bass = bassLine[step % 8];
    if (bass) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = bass;
      g.gain.setValueAtTime(0.14, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.connect(g); g.connect(musicGain);
      osc.start(); osc.stop(ctx.currentTime + 0.24);
    }
    if (step === 0) {
      const chord = chordTones[beat / 16 % 4 | 0];
      tone(chord, 1.4, 'triangle', 0.05, 0, chord * 1.01);
    }
    beat++;
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = setInterval(scheduleBeat, 150);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    get muted() { return muted; },
    shoot(kind) {
      if (kind === 'shotgun') { noise(0.22, 0.5, 1200); tone(120, 0.18, 'square', 0.25, 0, 40); }
      else if (kind === 'smg') { noise(0.08, 0.3, 2400); }
      else { noise(0.12, 0.35, 1800); tone(180, 0.1, 'square', 0.2, 0, 60); }
    },
    dry() { tone(900, 0.05, 'square', 0.12); },
    punch() { noise(0.08, 0.3, 900); },
    crash() { noise(0.3, 0.5, 700); tone(70, 0.3, 'sawtooth', 0.25, 0, 30); },
    siren() { tone(720, 0.5, 'sine', 0.07, 0, 980); },
    pickup() { tone(660, 0.1, 'sine', 0.2); tone(990, 0.16, 'sine', 0.2, 0.09); },
    horn() { tone(370, 0.18, 'square', 0.14); tone(370, 0.18, 'square', 0.14, 0.22); },
    mission() { [523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.11)); },
    busted() { [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.2, i * 0.2)); },
    engine(on) { if (!ctx) return; /* engine hum is folded into the music bed */ },
  };
}
