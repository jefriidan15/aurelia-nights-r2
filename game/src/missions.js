// Aurelia Nights — missions.js
// The six story jobs. Each job is a short chain of steps — go somewhere,
// steal something, hold a zone, survive the heat — and pays out the exact
// amount from the spec when the last step lands.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.startMission = function (idx) {
    var G = A.G;
    if (idx >= A.MISSIONS.length) { return; }
    var def = A.MISSIONS[idx];
    G.missionIdx = idx;
    G.mission = {
      idx: idx, step: 0, t: 0,
      kills: 0, stolenAt: G.stats.stolen,
      hostilesSpawned: false, holdT: 0, surviveT: 0,
      startedWanted: G.wanted
    };
    G.vaultCopsSpawned = false;
    A.showBanner('JOB ' + (idx + 1) + ' — ' + def.name + '  ($' + def.pay + ')', 4);
    A.sfx('mission');
  };

  A.currentStep = function () {
    var G = A.G;
    if (!G.mission) { return null; }
    return A.MISSIONS[G.mission.idx].steps[G.mission.step] || null;
  };

  A.objectiveText = function () {
    var G = A.G;
    if (!G.mission) { return 'No active job — press M for the job board'; }
    var def = A.MISSIONS[G.mission.idx];
    var step = A.currentStep();
    var label = step ? step.label : 'Done';
    if (step && step.kind === 'clear') {
      label += ' (' + G.mission.kills + '/' + step.count + ')';
    }
    if (step && step.kind === 'hold') {
      label += ' (' + Math.ceil(step.secs - G.mission.holdT) + 's)';
    }
    if (step && step.kind === 'survive') {
      label += ' (' + Math.ceil(step.secs - G.mission.surviveT) + 's left)';
    }
    return 'JOB ' + (G.mission.idx + 1) + '/6 ' + def.name + ' — ' + label;
  };

  A.advanceStep = function () {
    var G = A.G;
    var m = G.mission;
    m.step += 1;
    m.t = 0;
    m.holdT = 0;
    m.surviveT = 0;
    m.hostilesSpawned = false;
    A.sfx('pickup');
    if (m.step >= A.MISSIONS[m.idx].steps.length) {
      A.completeMission();
    }
  };

  A.completeMission = function () {
    var G = A.G;
    var def = A.MISSIONS[G.mission.idx];
    G.player.cash += def.pay;
    G.stats.earned += def.pay;
    A.showBanner(def.name + ' complete — +$' + def.pay, 4);
    A.sfx('cash');
    A.saveGame();
    if (G.mission.idx + 1 >= A.MISSIONS.length) {
      A.winGame();
      return;
    }
    A.startMission(G.mission.idx + 1);
  };

  A.winGame = function () {
    var G = A.G;
    G.over = true;
    G.mode = 'win';
    A.sfx('win');
    A.saveGame();
  };

  A.updateMissions = function (dt) {
    var G = A.G;
    if (!G.mission || G.over || G.mode !== 'playing') { return; }
    var m = G.mission;
    var step = A.currentStep();
    if (!step) { return; }
    var p = G.player;
    m.t += dt;

    switch (step.kind) {
      case 'steal':
        if (G.stats.stolen > m.stolenAt) { A.advanceStep(); }
        break;
      case 'goto':
      case 'deliver':
        if (A.dist(p.x, p.y, step.x, step.y) < step.r) {
          if (step.kind === 'deliver') {
            // Handing over hot goods draws the law.
            A.raiseWanted(1, 'Hot delivery');
          }
          A.advanceStep();
        }
        break;
      case 'drive':
        if (p.inCar && A.dist(p.x, p.y, step.x, step.y) < step.r) { A.advanceStep(); }
        break;
      case 'wanted':
        if (G.wanted >= step.n) { A.advanceStep(); }
        break;
      case 'clear':
        if (!m.hostilesSpawned) {
          m.hostilesSpawned = true;
          A.spawnHostiles(step.count, step.cx, step.cy, step.r);
        }
        if (m.kills >= step.count) { A.advanceStep(); }
        break;
      case 'hold':
        if (A.dist(p.x, p.y, step.x, step.y) < step.r) {
          m.holdT += dt;
          if (!G.vaultCopsSpawned && m.holdT > 2) {
            G.vaultCopsSpawned = true;
            A.raiseWanted(2, 'Silent alarm');
            A.flash('Silent alarm — cops incoming', 2.5);
          }
          if (m.holdT >= step.secs) { A.advanceStep(); }
        } else {
          m.holdT = Math.max(0, m.holdT - dt);
        }
        break;
      case 'survive':
        if (G.wanted < A.CFG.MAX_WANTED) { G.wanted = A.CFG.MAX_WANTED; G.quietTimer = 0; }
        if (A.dist(p.x, p.y, step.cx, step.cy) < step.r) {
          m.surviveT += dt;
          if (m.surviveT >= step.secs) { A.advanceStep(); }
        }
        break;
      default:
        break;
    }
  };

  A.spawnHostiles = function (count, cx, cy, r) {
    var G = A.G;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2;
      var rr = A.randRange(r * 0.3, r * 0.85);
      var x = A.clamp(cx + Math.cos(a) * rr, 40, A.CFG.WORLD_W - 40);
      var y = A.clamp(cy + Math.sin(a) * rr, 40, A.CFG.HARBOUR_Y - 40);
      if (!A.walkable(x, y, 10)) { x = cx; y = cy; }
      G.hostiles.push({
        x: x, y: y, hp: 60, angle: 0,
        shootTimer: A.randRange(0.8, 2.0), strafe: A.randRange(0, Math.PI * 2)
      });
    }
    A.flash('Hostiles on the pier — take them out', 3);
    A.sfx('siren');
  };

  A.updateHostiles = function (dt) {
    var G = A.G;
    var p = G.player;
    for (var i = G.hostiles.length - 1; i >= 0; i--) {
      var h = G.hostiles[i];
      if (h.hp <= 0) { G.hostiles.splice(i, 1); continue; }
      var d = A.dist(h.x, h.y, p.x, p.y);
      h.angle = Math.atan2(p.y - h.y, p.x - h.x);
      // Sidestep slowly so they are not standing targets.
      h.strafe += dt;
      var sx = h.x + Math.cos(h.strafe) * 14 * dt;
      var sy = h.y + Math.sin(h.strafe) * 14 * dt;
      if (A.walkable(sx, h.y, 10)) { h.x = sx; }
      if (A.walkable(h.x, sy, 10)) { h.y = sy; }
      if (d < 520 && d > 40) {
        h.shootTimer -= dt;
        if (h.shootTimer <= 0) {
          h.shootTimer = A.randRange(1.4, 2.4);
          var aim = Math.atan2(p.y - h.y, p.x - h.x) + A.randRange(-0.12, 0.12);
          G.bullets.push({
            x: h.x + Math.cos(aim) * 20, y: h.y + Math.sin(aim) * 20,
            angle: aim, speed: 720, life: 0.9, dmg: 8,
            from: 'hostile', range: 520, travelled: 0
          });
          A.sfx('copshot');
        }
      }
    }
  };

  A.hostileDown = function (h) {
    var G = A.G;
    G.stats.kills += 1;
    if (G.mission) { G.mission.kills += 1; }
    A.raiseWanted(1, 'Pier crew down');
    A.burst(h.x, h.y, '#e74c3c', 14, 170);
  };

  // Job-board data for the M screen: name, pay, state.
  A.jobList = function () {
    var G = A.G;
    return A.MISSIONS.map(function (def, i) {
      var state = 'locked';
      if (i < G.missionIdx) { state = 'done'; }
      else if (i === G.missionIdx) { state = 'active'; }
      else if (i === G.missionIdx + 1) { state = 'next'; }
      return { name: def.name, pay: def.pay, blurb: def.blurb, state: state };
    });
  };
})();
