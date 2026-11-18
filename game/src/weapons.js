// Aurelia Nights — weapons.js
// Guns, bullets, the Pier 9 Vesper guards and the crate.
(function () {
  var AN = window.AN;

  AN.WEAPONS = {
    pistol: { name: "Pistol", damage: 34, rate: 0.28, spread: 0.05, speed: 720, pellets: 1, range: 520 },
    shotgun: { name: "Shotgun", damage: 22, rate: 0.85, spread: 0.22, speed: 640, pellets: 5, range: 380 }
  };

  AN.fireWeapon = function (G) {
    var p = G.player;
    var key = p.weapon;
    var def = AN.WEAPONS[key];
    if (!def) return;
    if (p.fireCooldown > 0) return;
    if (key === "pistol" && p.pistolAmmo <= 0) {
      G.floaters.push({ x: p.x, y: p.y - 30, text: "Out of ammo — buy more at Iron & Oak", t: 1.8, color: "#ffa502" });
      p.fireCooldown = 0.3;
      return;
    }
    if (key === "shotgun" && p.shotgunAmmo <= 0) {
      G.floaters.push({ x: p.x, y: p.y - 30, text: "Shotgun dry — buy shells at Iron & Oak", t: 1.8, color: "#ffa502" });
      p.fireCooldown = 0.3;
      return;
    }
    p.fireCooldown = def.rate;
    if (key === "pistol") p.pistolAmmo -= 1; else p.shotgunAmmo -= 1;
    var base = p.aimAngle;
    for (var i = 0; i < def.pellets; i++) {
      var a = base + AN.rand(-def.spread, def.spread);
      G.bullets.push({
        x: p.x + Math.cos(base) * 22, y: p.y + Math.sin(base) * 22,
        vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed,
        damage: def.damage, travelled: 0, range: def.range, fromPlayer: true
      });
    }
    G.lastShotAt = { x: p.x, y: p.y, t: G.time };
    AN.addWanted(G, 0, ""); // refresh calm timer without adding stars
    if (G.wanted < 1) AN.addWanted(G, 1, "gunfire");
    G.muzzle = 0.08;
    AN.burst(G.particles, p.x + Math.cos(base) * 26, p.y + Math.sin(base) * 26, 4, "#f9ca24", 120, 0.25);
    if (G.sound) G.sound.shot(key);
  };

  AN.updateBullets = function (G, dt) {
    for (var i = G.bullets.length - 1; i >= 0; i--) {
      var b = G.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.travelled += Math.abs(b.vx * dt) + Math.abs(b.vy * dt);
      var dead = b.travelled > b.range;
      if (!dead) {
        var col = AN.collideCity(G.city, b.x, b.y, 2);
        if (col.hit) dead = true;
      }
      if (!dead && b.fromPlayer) {
        dead = AN.bulletHits(G, b, dt);
      } else if (!dead && !b.fromPlayer) {
        var p = G.player;
        if (AN.dist(b.x, b.y, p.x, p.y) < 16) {
          AN.hurtPlayer(G, b.damage * 0.5);
          dead = true;
        }
        if (p.car && AN.dist(b.x, b.y, p.car.x, p.car.y) < 24) {
          AN.damageCar(G, p.car, b.damage * 0.4);
          dead = true;
        }
      }
      if (dead) {
        AN.burst(G.particles, b.x, b.y, 3, "#dfe4ea", 90, 0.3);
        G.bullets.splice(i, 1);
      }
    }
  };

  // Player bullets vs guards, cops, traffic and pedestrians.
  AN.bulletHits = function (G, b) {
    var i, t;
    for (i = 0; i < G.guards.length; i++) {
      t = G.guards[i];
      if (t.hp > 0 && AN.dist(b.x, b.y, t.x, t.y) < 17) {
        t.hp -= b.damage;
        AN.burst(G.particles, t.x, t.y, 6, "#ff6b6b", 130, 0.4);
        if (t.hp <= 0) AN.guardDown(G, t);
        return true;
      }
    }
    for (i = 0; i < G.cops.length; i++) {
      t = G.cops[i].car;
      if (AN.dist(b.x, b.y, t.x, t.y) < 24) {
        AN.damageCar(G, t, b.damage);
        if (t.hp <= 0 && !t.wrecked) {
          t.wrecked = true;
          AN.addWanted(G, 1, "wrecking a cruiser");
          AN.burst(G.particles, t.x, t.y, 22, "#ff9f43", 180, 0.9);
        }
        return true;
      }
    }
    for (i = 0; i < G.traffic.length; i++) {
      t = G.traffic[i];
      if (AN.dist(b.x, b.y, t.x, t.y) < 24) {
        AN.damageCar(G, t, b.damage);
        return true;
      }
    }
    return false;
  };

  AN.hurtPlayer = function (G, amount) {
    var p = G.player;
    p.health -= amount;
    p.hurtFlash = 0.25;
    if (p.health <= 0) {
      p.health = 0;
      AN.wasted(G);
    }
  };

  AN.wasted = function (G) {
    var p = G.player;
    p.health = 100;
    p.money = Math.max(0, p.money - 50);
    AN.clearWanted(G, "wasted");
    p.x = AN.PLACES.hospital.x;
    p.y = AN.PLACES.hospital.y + 60;
    if (p.car) { G.traffic.push(p.car); p.car.isPlayer = false; p.car.isTraffic = true; p.car = null; }
    p.onFoot = true;
    G.mode = "wasted";
    G.wastedT = 0;
    AN.refreshScreens(G);
    if (G.sound) G.sound.busted();
  };

  // ---- Pier 9 guards (job 3) ----
  AN.spawnGuards = function (G) {
    G.guards = [];
    var spots = [
      { x: 3280, y: 2220 }, { x: 3420, y: 2260 }, { x: 3300, y: 2360 },
      { x: 3440, y: 2400 }, { x: 3260, y: 2440 }, { x: 3380, y: 2320 }
    ];
    for (var i = 0; i < 6; i++) {
      G.guards.push({
        x: spots[i].x, y: spots[i].y, hp: 70, angle: 0,
        shootT: AN.rand(0.5, 2), state: "guard"
      });
    }
    G.crateTaken = false;
  };

  AN.updateGuards = function (G, dt) {
    var p = G.player;
    for (var i = 0; i < G.guards.length; i++) {
      var g = G.guards[i];
      if (g.hp <= 0) continue;
      var d = AN.dist(g.x, g.y, p.x, p.y);
      if (d < 460) {
        g.state = "fight";
        g.angle = AN.angTo(g.x, g.y, p.x, p.y);
        if (d > 130) {
          g.x += Math.cos(g.angle) * 62 * dt;
          g.y += Math.sin(g.angle) * 62 * dt;
        }
        g.shootT -= dt;
        if (g.shootT <= 0 && d < 420) {
          g.shootT = AN.rand(1.1, 2.1);
          var a = g.angle + AN.rand(-0.14, 0.14);
          G.bullets.push({
            x: g.x + Math.cos(a) * 20, y: g.y + Math.sin(a) * 20,
            vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
            damage: 12, travelled: 0, range: 420, fromPlayer: false
          });
          if (G.sound) G.sound.shot("pistol");
        }
      } else {
        g.state = "guard";
      }
    }
  };

  AN.guardDown = function (G, guard) {
    AN.burst(G.particles, guard.x, guard.y, 14, "#ff6b6b", 150, 0.7);
    G.floaters.push({ x: guard.x, y: guard.y - 26, text: "Guard down", t: 1.4, color: "#2ed573" });
    if (G.sound) G.sound.pickup();
  };

  AN.guardsLeft = function (G) {
    var n = 0;
    for (var i = 0; i < G.guards.length; i++) if (G.guards[i].hp > 0) n++;
    return n;
  };
})();
