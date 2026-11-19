// Aurelia Nights — audio.js
// Every sound is synthesised with WebAudio at runtime: oscillators for
// tones and filtered noise for impacts. No audio files ship with the
// game and nothing is fetched. All of it is best-effort — if the audio
// context cannot start, the game simply stays silent. The context is
// only created after a key or click, so browsers never block it.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var actx = null;
  var masterBus = null;

  A.sfxUnlock = function () {
    try {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return; }
        actx = new AC();
        masterBus = actx.createGain();
        masterBus.gain.value = 0.35;
        masterBus.connect(actx.destination);
      }
      if (actx.state === 'suspended') { actx.resume(); }
    } catch (e) { /* audio is best-effort */ }
  };

  function audible() { return actx && masterBus && !(A.G && A.G.muted); }

  function playTone(f0, f1, dur, type, vol, delay) {
    if (!audible()) { return; }
    try {
      var t = actx.currentTime + (delay || 0);
      var osc = actx.createOscillator();
      var gain = actx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      }
      gain.gain.setValueAtTime(vol || 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain); gain.connect(masterBus);
      osc.start(t); osc.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }

  function playNoise(dur, vol, cutoff, delay) {
    if (!audible()) { return; }
    try {
      var t = actx.currentTime + (delay || 0);
      var len = Math.max(1, Math.floor(actx.sampleRate * dur));
      var buf = actx.createBuffer(1, len, actx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      var src = actx.createBufferSource();
      src.buffer = buf;
      var filt = actx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = cutoff || 1200;
      var gain = actx.createGain();
      gain.gain.setValueAtTime(vol || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filt); filt.connect(gain); gain.connect(masterBus);
      src.start(t);
    } catch (e) { /* ignore */ }
  }

  // Named effects; each is a short stack of tones and/or noise bursts.
  var EFFECTS = {
    shot: function () { playNoise(0.12, 0.5, 2600); playTone(220, 60, 0.1, 'square', 0.18); },
    shotgun: function () { playNoise(0.28, 0.65, 1500); playTone(140, 45, 0.22, 'sawtooth', 0.22); },
    copshot: function () { playNoise(0.1, 0.28, 2000); },
    horn: function () { playTone(370, 370, 0.28, 'sawtooth', 0.2); playTone(466, 466, 0.28, 'sawtooth', 0.14); },
    pickup: function () { playTone(660, 990, 0.12, 'sine', 0.22); playTone(990, 1320, 0.14, 'sine', 0.18, 0.09); },
    cash: function () { playTone(880, 880, 0.1, 'sine', 0.2); playTone(1174, 1174, 0.12, 'sine', 0.2, 0.08); playTone(1568, 1568, 0.18, 'sine', 0.2, 0.16); },
    hurt: function () { playTone(160, 70, 0.25, 'sawtooth', 0.25); },
    crash: function () { playNoise(0.3, 0.5, 700); playTone(90, 40, 0.3, 'sawtooth', 0.25); },
    siren: function () { playTone(700, 950, 0.32, 'sine', 0.07); playTone(950, 700, 0.32, 'sine', 0.07, 0.34); },
    busted: function () { playTone(392, 392, 0.22, 'square', 0.2); playTone(311, 311, 0.22, 'square', 0.2, 0.22); playTone(233, 233, 0.5, 'square', 0.2, 0.44); },
    win: function () { playTone(523, 523, 0.16, 'sine', 0.22); playTone(659, 659, 0.16, 'sine', 0.22, 0.14); playTone(784, 784, 0.16, 'sine', 0.22, 0.28); playTone(1046, 1046, 0.4, 'sine', 0.24, 0.42); },
    click: function () { playTone(900, 700, 0.05, 'square', 0.12); },
    mission: function () { playTone(523, 523, 0.14, 'triangle', 0.22); playTone(784, 784, 0.3, 'triangle', 0.22, 0.12); },
    heal: function () { playTone(440, 660, 0.2, 'sine', 0.18); playTone(660, 880, 0.25, 'sine', 0.18, 0.15); },
    steal: function () { playTone(300, 520, 0.16, 'square', 0.16); }
  };

  A.sfx = function (name) {
    if (!actx) { return; }
    var fx = EFFECTS[name];
    if (fx) { fx(); }
  };

  // A short siren wail while the player is wanted; driven by the loop.
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
