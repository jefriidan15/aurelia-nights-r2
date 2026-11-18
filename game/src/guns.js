// Aurelia Nights — guns.js
// Pistol and shotgun combat: fire rates, ammo, bullet travel, hit tests
// against pedestrians, cops and mission hostiles, plus particles.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.fireTimer = 0;

  A.updateGuns = function (dt) {
    var G = A.G;
    A.fireTimer = Math.max(0, A.fireTimer - dt);
    var p = G.player;

    // Mouse held (or Space on foot) fires the current weapon.
    if (G.mode === 'playing' && (A.mouse.down || A.down('Space')) && !p.inCar) {
      A.tryFire();
    }
    // Switch weapon with Q or the number keys.
    if (A.hit('KeyQ') || A.hit('Digit1') || A.hit('Digit2')) { A.cycleWeapon(); }

    // Move bullets and resolve hits.
    for (var i = G.bullets.length - 1; i >= 0; i--) {
      var b = G.bullets[i];
      b.travelled += b.speed * dt;
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      var dead = b.life <= 0 || b.travelled > b.range;
      if (!dead && A.hitsBuilding(b.x, b.y, 0)) {
        A.burst(b.x, b.y, '#bdc3c7', 5, 90);
        dead = true;
      }
      if (!dead) { dead = A.bulletHits(b); }
      if (dead) { G.bullets.splice(i, 1); }
    }

    // Particles.
    for (var j = G.parts.length - 1; j >= 0; j--) {
      var pt = G.parts[j];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
      if (pt.life <= 0) { G.parts.splice(j, 1); }
    }
  };

  A.cycleWeapon = function () {
    var p = A.G.player;
    if (p.weapons.shotgun && p.weapon === 'pistol') { p.weapon = 'shotgun'; }
    else { p.weapon = 'pistol'; }
    A.sfx('click');
  };

  A.tryFire = function () {
    var G = A.G;
    var p = G.player;
    if (A.fireTimer > 0 || G.over) { return; }
    if (!p.weapons[p.weapon]) { return; }
    if (p.ammo[p.weapon] <= 0) {
      A.flash('Out of ammo — visit Iron & Oak', 1.8);
      A.sfx('click');
      A.fireTimer = 0.3;
      return;
    }
    var c = A.CFG;
    p.ammo[p.weapon] -= 1;
    G.stats.shots += 1;
    var aim = A.aimAngle();
    p.angle = aim;

    if (p.weapon === 'pistol') {
      A.fireTimer = c.PISTOL_RATE;
      A.spawnBullet(p.x, p.y, aim, c.PISTOL_BULLET_SPEED, c.PISTOL_RANGE, c.PISTOL_DMG, 'player');
      A.sfx('shot');
    } else {
      A.fireTimer = c.SHOTGUN_RATE;
      for (var k = 0; k < c.SHOTGUN_PELLETS; k++) {
        var spread = aim + A.randRange(-c.SHOTGUN_SPREAD, c.SHOTGUN_SPREAD);
        A.spawnBullet(p.x, p.y, spread, c.SHOTGUN_BULLET_SPEED, c.SHOTGUN_RANGE, c.SHOTGUN_DMG, 'player');
      }
      A.sfx('shotgun');
    }
    A.burst(p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24, '#f39c12', 6, 160);
    A.scarePeds(p.x, p.y, 520);
    A.raiseWanted(0); // firing keeps the heat clock fresh without adding stars
    G.quietTimer = 0;
  };

  A.spawnBullet = function (x, y, angle, speed, range, dmg, from) {
    A.G.bullets.push({
      x: x + Math.cos(angle) * 22, y: y + Math.sin(angle) * 22,
      angle: angle, speed: speed, life: 1.4, dmg: dmg,
      from: from, range: range, travelled: 0
    });
  };

  // Returns true when the bullet hit something.
  A.bulletHits = function (b) {
    var G = A.G;
    var p = G.player;
    if (b.from === 'player') {
      for (var i = 0; i < G.peds.length; i++) {
        var pd = G.peds[i];
        if (pd.hp > 0 && A.dist(b.x, b.y, pd.x, pd.y) < 15) {
          pd.hp -= b.dmg;
          A.burst(b.x, b.y, '#c0392b', 8, 150);
          if (pd.hp <= 0) { A.killPed(pd, 'shot'); }
          return true;
        }
      }
      for (var j = 0; j < G.cops.length; j++) {
        var cop = G.cops[j];
        if (cop.hp > 0 && A.dist(b.x, b.y, cop.x, cop.y) < 15) {
          cop.hp -= b.dmg;
          A.burst(b.x, b.y, '#3498db', 8, 150);
          if (cop.hp <= 0) { A.killCop(cop); }
          return true;
        }
      }
      for (var k = 0; k < G.hostiles.length; k++) {
        var h = G.hostiles[k];
        if (h.hp > 0 && A.dist(b.x, b.y, h.x, h.y) < 16) {
          h.hp -= b.dmg;
          A.burst(b.x, b.y, '#e74c3c', 8, 150);
          if (h.hp <= 0) { A.hostileDown(h); }
          return true;
        }
      }
    } else {
      // Enemy fire can only hurt the player (on foot or in the car).
      if (A.dist(b.x, b.y, p.x, p.y) < (p.inCar ? 24 : 14)) {
        A.damagePlayer(b.dmg, 'Shot down in the street.');
        return true;
      }
    }
    return false;
  };

  A.burst = function (x, y, color, n, speed) {
    var G = A.G;
    for (var i = 0; i < n; i++) {
      var a = A.randRange(0, Math.PI * 2);
      var v = A.randRange(speed * 0.3, speed);
      G.parts.push({
        x: x, y: y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: A.randRange(0.25, 0.7), color: color, size: A.randRange(2, 5)
      });
    }
    if (G.parts.length > 400) { G.parts.splice(0, G.parts.length - 400); }
  };
})();
