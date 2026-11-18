// Aurelia Nights — sound.js
// Synthesized WebAudio: engine hum, two-tone sirens, gunfire, bass loop.
// No audio files, no network — everything is generated in code.
(function () {
  var AN = window.AN;

  AN.makeSound = function () {
    var S = {
      ctx: null, muted: false, master: null,
      engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
      bassTimer: null, started: false
    };

    S.ensure = function () {
      if (S.ctx) {
        if (S.ctx.state === "suspended") S.ctx.resume();
        return true;
      }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        S.ctx = new AC();
        S.master = S.ctx.createGain();
        S.master.gain.value = 0.5;
        S.master.connect(S.ctx.destination);
        return true;
      } catch (e) { return false; }
    };

    S.startAmbience = function () {
      if (!S.ensure() || S.started) return;
      S.started = true;
      // Engine hum: low sawtooth through a lowpass, pitch follows speed.
      S.engineOsc = S.ctx.createOscillator();
      S.engineOsc.type = "sawtooth";
      S.engineOsc.frequency.value = 55;
      var filt = S.ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = 320;
      S.engineGain = S.ctx.createGain();
      S.engineGain.gain.value = 0.0;
      S.engineOsc.connect(filt);
      filt.connect(S.engineGain);
      S.engineGain.connect(S.master);
      S.engineOsc.start();
      // Two-tone siren: square wave flipping between two notes.
      S.sirenOsc = S.ctx.createOscillator();
      S.sirenOsc.type = "square";
      S.sirenOsc.frequency.value = 720;
      S.sirenGain = S.ctx.createGain();
      S.sirenGain.gain.value = 0.0;
      S.sirenOsc.connect(S.sirenGain);
      S.sirenGain.connect(S.master);
      S.sirenOsc.start();
      var high = true;
      S.sirenTimer = setInterval(function () {
        if (!S.ctx) return;
        high = !high;
        S.sirenOsc.frequency.value = high ? 720 : 960;
      }, 420);
      // Bass loop: a slow four-note walk, scheduled on a timer.
      var notes = [55, 55, 65.41, 49];
      var step = 0;
      S.bassTimer = setInterval(function () {
        if (!S.ctx || S.muted) return;
        var f = notes[step % notes.length];
        step++;
        var o = S.ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = f;
        var g = S.ctx.createGain();
        g.gain.setValueAtTime(0.16, S.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, S.ctx.currentTime + 0.55);
        o.connect(g);
        g.connect(S.master);
        o.start();
        o.stop(S.ctx.currentTime + 0.6);
      }, 620);
    };

    S.setEngine = function (speed, driving) {
      if (!S.ctx || !S.engineOsc) return;
      var target = driving ? 0.05 + Math.min(0.09, Math.abs(speed) / 3000) : 0.0;
      S.engineGain.gain.setTargetAtTime(S.muted ? 0 : target, S.ctx.currentTime, 0.1);
      S.engineOsc.frequency.setTargetAtTime(50 + Math.abs(speed) * 0.55, S.ctx.currentTime, 0.1);
    };

    S.setSiren = function (on) {
      if (!S.ctx || !S.sirenGain) return;
      S.sirenGain.gain.setTargetAtTime(on && !S.muted ? 0.035 : 0.0, S.ctx.currentTime, 0.15);
    };

    S.toggleMute = function () {
      S.muted = !S.muted;
      if (S.master) S.master.gain.value = S.muted ? 0 : 0.5;
      return S.muted;
    };

    S.blip = function (freq, dur, type, vol) {
      if (!S.ensure() || S.muted) return;
      var t = S.ctx.currentTime;
      var o = S.ctx.createOscillator();
      o.type = type || "square";
      o.frequency.value = freq;
      var g = S.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(S.master);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    S.noiseBurst = function (dur, vol, low) {
      if (!S.ensure() || S.muted) return;
      var t = S.ctx.currentTime;
      var len = Math.floor(S.ctx.sampleRate * dur);
      var buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = S.ctx.createBufferSource();
      src.buffer = buf;
      var f = S.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = low || 2400;
      var g = S.ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(S.master);
      src.start(t);
    };

    S.shot = function (kind) {
      if (kind === "shotgun") { S.noiseBurst(0.22, 0.5, 1400); S.blip(90, 0.18, "sine", 0.3); }
      else { S.noiseBurst(0.12, 0.4, 3200); S.blip(160, 0.08, "square", 0.12); }
    };
    S.sirenBlip = function () { S.blip(880, 0.16, "square", 0.12); setTimeout(function () { S.blip(660, 0.16, "square", 0.12); }, 170); };
    S.pickup = function () { S.blip(1320, 0.1, "sine", 0.2); setTimeout(function () { S.blip(1760, 0.14, "sine", 0.2); }, 90); };
    S.horn = function () { S.blip(370, 0.28, "sawtooth", 0.16); };
    S.thud = function () { S.noiseBurst(0.16, 0.35, 500); };
    S.boom = function () { S.noiseBurst(0.5, 0.5, 700); S.blip(60, 0.4, "sine", 0.35); };
    S.spray = function () { S.noiseBurst(0.5, 0.2, 5000); };
    S.checkpoint = function () { S.blip(1046, 0.12, "sine", 0.2); setTimeout(function () { S.blip(1568, 0.2, "sine", 0.2); }, 110); };
    S.jobStart = function () { S.blip(523, 0.14, "square", 0.14); setTimeout(function () { S.blip(784, 0.2, "square", 0.14); }, 140); };
    S.jobDone = function () { [523, 659, 784, 1046].forEach(function (f, i) { setTimeout(function () { S.blip(f, 0.18, "sine", 0.2); }, i * 120); }); };
    S.fail = function () { S.blip(392, 0.2, "sawtooth", 0.15); setTimeout(function () { S.blip(311, 0.35, "sawtooth", 0.15); }, 200); };
    S.busted = function () { S.blip(440, 0.25, "square", 0.15); setTimeout(function () { S.blip(330, 0.4, "square", 0.15); }, 240); };
    S.win = function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { setTimeout(function () { S.blip(f, 0.25, "triangle", 0.22); }, i * 150); }); };
    return S;
  };
})();
