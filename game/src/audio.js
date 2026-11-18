// Aurelia Nights — audio.js
// Synthesised WebAudio effects. No audio files are shipped or fetched;
// every sound is built from oscillators and filtered noise at runtime.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var ctx = null;
  var master = null;

  A.sfxUnlock = function () {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') { ctx.resume(); }
    } catch (e) { /* audio is best-effort */ }
  };

  function tone(freq0, freq1, dur, type, vol, when) {
    if (!ctx || !master || (A.G && A.G.muted)) { return; }
    try {
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq0, t);
      if (freq1 && freq1 !== freq0) { o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur); }
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  function noise(dur, vol, filterFreq, when) {
    if (!ctx || !master || (A.G && A.G.muted)) { return; }
    try {
      var t = ctx.currentTime + (when || 0);
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq || 1200;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t);
    } catch (e) { /* ignore */ }
  }

  A.sfx = function (name) {
    if (!ctx) { return; }
    switch (name) {
      case 'shot': noise(0.12, 0.5, 2600); tone(220, 60, 0.1, 'square', 0.18); break;
      case 'shotgun': noise(0.28, 0.65, 1500); tone(140, 45, 0.22, 'sawtooth', 0.22); break;
      case 'copshot': noise(0.1, 0.28, 2000); break;
      case 'horn': tone(370, 370, 0.28, 'sawtooth', 0.2); tone(466, 466, 0.28, 'sawtooth', 0.14); break;
      case 'pickup': tone(660, 990, 0.12, 'sine', 0.22); tone(990, 1320, 0.14, 'sine', 0.18, 0.09); break;
      case 'cash': tone(880, 880, 0.1, 'sine', 0.2); tone(1174, 1174, 0.12, 'sine', 0.2, 0.08); tone(1568, 1568, 0.18, 'sine', 0.2, 0.16); break;
      case 'hurt': tone(160, 70, 0.25, 'sawtooth', 0.25); break;
      case 'crash': noise(0.3, 0.5, 700); tone(90, 40, 0.3, 'sawtooth', 0.25); break;
      case 'siren': tone(700, 950, 0.32, 'sine', 0.07); tone(950, 700, 0.32, 'sine', 0.07, 0.34); break;
      case 'busted': tone(392, 392, 0.22, 'square', 0.2); tone(311, 311, 0.22, 'square', 0.2, 0.22); tone(233, 233, 0.5, 'square', 0.2, 0.44); break;
      case 'win': tone(523, 523, 0.16, 'sine', 0.22); tone(659, 659, 0.16, 'sine', 0.22, 0.14); tone(784, 784, 0.16, 'sine', 0.22, 0.28); tone(1046, 1046, 0.4, 'sine', 0.24, 0.42); break;
      case 'click': tone(900, 700, 0.05, 'square', 0.12); break;
      case 'mission': tone(523, 523, 0.14, 'triangle', 0.22); tone(784, 784, 0.3, 'triangle', 0.22, 0.12); break;
      case 'heal': tone(440, 660, 0.2, 'sine', 0.18); tone(660, 880, 0.25, 'sine', 0.18, 0.15); break;
      case 'steal': tone(300, 520, 0.16, 'square', 0.16); break;
      default: break;
    }
  };

  // Short siren wail while the player is wanted; called from the main loop.
  A.sirenTick = function (dt) {
    var G = A.G;
    if (!G || G.wanted <= 0 || G.mode !== 'playing') { return; }
    G.sirenTimer -= dt;
    if (G.sirenTimer <= 0) {
      G.sirenTimer = 2.6;
      A.sfx('siren');
    }
  };
})();
