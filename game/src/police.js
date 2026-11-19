// Aurelia Nights — police.js
// The five-star wanted system. Heat decays after a quiet spell; the
// street presence is two cops per star (ten at most). Cops chase on
// foot, ram the player's car, open fire at three stars and up, and a
// slow player who lets one stay close gets arrested. Killing a cop
// only raises the heat further — there is no quiet way out of that.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.updatePolice = function (dt) {
    var G = A.G, p = G.player;

    // Decay: twelve quiet seconds, then one star every eight seconds.
    if (G.wanted > 0) {
      G.quietTimer += dt;
      if (G.quietTimer > A.CFG.WANTED_DECAY_QUIET) {
        G.decayTimer += dt;
        if (G.decayTimer > A.CFG.WANTED_DECAY_STEP) {
          G.decayTimer = 0;
          G.wanted -= 1;
          if (G.wanted === 0) { A.flash('You lost the heat', 2); }
        }
      }
    }

    var want = Math.min(10, G.wanted * 2);
    while (G.cops.length < want) { A.spawnCop(); }
    while (G.cops.length > want) { G.cops.pop(); }

    var closingIn = false;
    for (var i = G.cops.length - 1; i >= 0; i--) {
      var cop = G.cops[i];
      if (cop.hp <= 0) { G.cops.splice(i, 1); continue; }
      A.updateCop(cop, dt);
      if (!p.inCar && A.dist(cop.x, cop.y, p.x, p.y) < 26) { closingIn = true; }
    }

    if (closingIn) {
      G.arrestMeter += dt;
      if (G.arrestMeter > A.CFG.COP_ARREST_TIME) {
        G.arrestMeter = 0;
        A.busted();
      }
    } else {
      G.arrestMeter = Math.max(0, G.arrestMeter - dt * 4);
    }
  };

  A.spawnCop = function () {
    var G = A.G, p = G.player;
    var ang = A.randRange(0, Math.PI * 2);
    var r = A.randRange(480, 720);
    var x = A.clamp(p.x + Math.cos(ang) * r, 40, A.CFG.WORLD_W - 40);
    var y = A.clamp(p.y + Math.sin(ang) * r, 40, A.CFG.HARBOUR_Y - 40);
    if (!A.walkable(x, y, 10)) {
      var rp = A.randomRoadPoint();
      x = rp.x; y = rp.y;
    }
    G.cops.push({
      x: x, y: y, hp: A.CFG.COP_HP, angle: 0,
      speed: A.CFG.COP_FOOT_SPEED + G.wanted * 10,
      shootTimer: A.randRange(0.5, 1.8), ramTimer: 0
    });
  };

  A.updateCop = function (cop, dt) {
    var G = A.G, p = G.player;
    var dx = p.x - cop.x, dy = p.y - cop.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    cop.angle = Math.atan2(dy, dx);

    var car = A.playerCar();
    if (car) {
      cop.ramTimer -= dt;
      if (d < 40 && cop.ramTimer <= 0) {
        // Ram: damage the car and the driver, knock the car sideways.
        cop.ramTimer = 1.1;
        car.hp -= 4;
        A.damagePlayer(3, 'Ram by the law');
        car.speed *= 0.55;
        A.sfx('crash');
        A.burst(car.x, car.y, '#3498db', 8, 130);
        cop.x -= Math.cos(cop.angle) * 45;
        cop.y -= Math.sin(cop.angle) * 45;
        if (car.hp <= 0) {
          A.flash('Your ride is wrecked', 2.5);
          A.exitCar();
          car.hp = 1;
        }
        return;
      }
    }

    // Run the player down, sliding along walls like everyone else.
    var step = cop.speed * dt;
    var nx = cop.x + (dx / d) * step;
    var ny = cop.y + (dy / d) * step;
    if (A.walkable(nx, cop.y, 10)) { cop.x = nx; }
    if (A.walkable(cop.x, ny, 10)) { cop.y = ny; }

    if (G.wanted >= 3 && d < 460 && d > 60) {
      cop.shootTimer -= dt;
      if (cop.shootTimer <= 0) {
        cop.shootTimer = A.randRange(1.2, 2.2);
        A.copFire(cop);
      }
    }
  };

  A.copFire = function (cop) {
    var G = A.G, p = G.player;
    var aim = Math.atan2(p.y - cop.y, p.x - cop.x) + A.randRange(-0.14, 0.14);
    G.bullets.push({
      x: cop.x + Math.cos(aim) * 20, y: cop.y + Math.sin(aim) * 20,
      angle: aim, speed: 780, life: 0.8, dmg: A.CFG.COP_SHOT_DMG,
      from: 'cop', range: 520, travelled: 0
    });
    A.sfx('copshot');
    A.burst(cop.x + Math.cos(aim) * 22, cop.y + Math.sin(aim) * 22, '#f1c40f', 4, 90);
  };

  A.killCop = function (cop) {
    if (cop.dead) { return; }
    cop.dead = true;
    cop.hp = 0;
    var G = A.G;
    G.stats.kills += 1;
    A.raiseWanted(1, 'Cop down');
    A.burst(cop.x, cop.y, '#2c3e50', 14, 170);
  };
})();
