// Aurelia Nights — vehicles.js
// Traffic cars, the player's stolen rides, driving physics and damage.
(function () {
  var AN = window.AN;

  AN.makeCar = function (x, y, angle, color, opts) {
    opts = opts || {};
    return {
      x: x, y: y, angle: angle || 0, speed: 0,
      color: color || AN.pick(AN.CAR_COLORS),
      hp: 100, wrecked: false, isPlayer: !!opts.isPlayer,
      isCop: !!opts.isCop, isTraffic: !!opts.isTraffic,
      dir: opts.dir || 0, // traffic: 0 east, 1 south, 2 west, 3 north
      road: opts.road || "x", // traffic follows a road line
      line: opts.line || 0,
      wait: 0, stolen: false, smoke: 0
    };
  };

  AN.spawnTraffic = function (city) {
    var cars = [];
    for (var i = 0; i < 16; i++) {
      var vertical = AN.rng() < 0.5;
      var car;
      if (vertical) {
        var rx = AN.pick(AN.ROAD_X);
        car = AN.makeCar(rx + AN.rand(-18, 18), AN.rand(80, 2050), AN.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2, null,
          { isTraffic: true, road: "x", line: rx, dir: AN.rng() < 0.5 ? 1 : 3 });
      } else {
        var ry = AN.pick(AN.ROAD_Y);
        car = AN.makeCar(AN.rand(80, 3450), ry + AN.rand(-18, 18), AN.rng() < 0.5 ? 0 : Math.PI, null,
          { isTraffic: true, road: "y", line: ry, dir: AN.rng() < 0.5 ? 0 : 2 });
      }
      car.speed = AN.rand(55, 95);
      cars.push(car);
    }
    return cars;
  };

  // Simple road-following traffic: cruise along its road, turn at junctions.
  AN.updateTraffic = function (cars, dt, G) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.wrecked) continue;
      if (c.wait > 0) { c.wait -= dt; continue; }
      var fleeing = G.lastShotAt && G.lastShotAt.t > G.time - 2 &&
        AN.dist(c.x, c.y, G.lastShotAt.x, G.lastShotAt.y) < 320;
      var target = fleeing ? 150 : AN.rand(55, 95);
      c.speed += (target - c.speed) * dt * 0.8;
      var nx = c.x + Math.cos(c.angle) * c.speed * dt;
      var ny = c.y + Math.sin(c.angle) * c.speed * dt;
      // Car ahead? slow down.
      for (var j = 0; j < cars.length; j++) {
        if (j === i) continue;
        var o = cars[j];
        if (AN.dist(nx, ny, o.x, o.y) < 52) { c.speed *= 0.5; nx = c.x; ny = c.y; }
      }
      var nearPlayerCar = G.player.car && AN.dist(nx, ny, G.player.car.x, G.player.car.y) < 56;
      if (nearPlayerCar) { c.speed *= 0.4; nx = c.x; ny = c.y; }
      c.x = nx; c.y = ny;
      // Turn at a junction sometimes, stay inside the city.
      var onJunction = false, jx = 0, jy = 0;
      for (var k = 0; k < AN.ROAD_X.length; k++) {
        if (Math.abs(c.x - AN.ROAD_X[k]) < 12) { jx = AN.ROAD_X[k]; onJunction = true; }
      }
      for (var m = 0; m < AN.ROAD_Y.length; m++) {
        if (Math.abs(c.y - AN.ROAD_Y[m]) < 12) { jy = AN.ROAD_Y[m]; onJunction = true; }
      }
      if (onJunction && AN.rng() < dt * 0.55) {
        var dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        var nd = AN.pick(dirs);
        if (Math.abs(AN.wrapAngle(nd - c.angle)) > 0.5) {
          c.angle = nd;
          c.x = jx || c.x; c.y = jy || c.y;
        }
      }
      if (c.x < 60 || c.x > AN.WORLD_W - 60 || c.y < 60 || c.y > 2380) {
        c.angle += Math.PI;
        c.x = AN.clamp(c.x, 80, AN.WORLD_W - 80);
        c.y = AN.clamp(c.y, 80, 2380);
      }
      var col = AN.collideCity(G.city, c.x, c.y, 20);
      c.x = col.x; c.y = col.y;
    }
  };

  // Player driving: W/S accelerate & brake, A/D steer, Space handbrake.
  AN.drivePlayerCar = function (G, dt, input) {
    var p = G.player, car = p.car;
    if (!car) return;
    var accel = 0;
    if (input.up) accel = 260;
    if (input.down) accel = car.speed > 8 ? -340 : -150;
    car.speed += accel * dt;
    if (!input.up && !input.down) car.speed *= Math.pow(0.35, dt);
    var grip = input.handbrake ? 0.25 : 1;
    car.speed *= Math.pow(grip, dt * 2);
    car.speed = AN.clamp(car.speed, -90, 300);
    var steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    var steerPower = 2.4 * AN.clamp(Math.abs(car.speed) / 90, 0.25, 1) * (input.handbrake ? 1.6 : 1);
    car.angle += steer * steerPower * dt * (car.speed >= 0 ? 1 : -1);
    var px = car.x, py = car.y;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    var col = AN.collideCity(G.city, car.x, car.y, 20);
    if (col.hit) {
      var impact = Math.abs(car.speed);
      car.x = col.x; car.y = col.y;
      car.speed *= -0.25;
      if (impact > 120) AN.damageCar(G, car, impact * 0.08);
    }
    if (AN.inWater(G.city, car.x, car.y)) { car.x = px; car.y = py; car.speed *= -0.3; }
    car.x = AN.clamp(car.x, 30, AN.WORLD_W - 30);
    car.y = AN.clamp(car.y, 30, AN.WORLD_H - 30);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    if (car.hp < 45 && AN.rng() < dt * 6) AN.smokePuff(G.particles, car.x, car.y - 6);
    if (car.hp <= 0 && !car.wrecked) {
      car.wrecked = true;
      car.speed = 0;
      AN.burst(G.particles, car.x, car.y, 26, "#ff9f43", 190, 0.9);
      AN.burst(G.particles, car.x, car.y, 14, "#2f3542", 90, 1.4);
      G.floaters.push({ x: car.x, y: car.y - 30, text: "WRECKED!", t: 2, color: "#ff6b6b" });
      if (G.sound) G.sound.boom();
    }
  };

  AN.damageCar = function (G, car, amount) {
    if (car.wrecked) return;
    car.hp -= amount;
    AN.burst(G.particles, car.x, car.y, 8, "#f5f6fa", 140, 0.5);
    if (car.hp <= 0) car.hp = 0;
  };

  // Nearest stealable car within reach of the player on foot.
  AN.nearestCar = function (G) {
    var best = null, bestD = 78;
    var all = G.traffic.concat(G.cops.map(function (c) { return c.car; }));
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (!c || c.wrecked) continue;
      var d = AN.dist(G.player.x, G.player.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  AN.stealCar = function (G, car) {
    var p = G.player;
    if (car.isCop) {
      G.floaters.push({ x: p.x, y: p.y - 30, text: "Can't steal a cruiser!", t: 1.6, color: "#ff6b6b" });
      return false;
    }
    if (car.isTraffic) {
      var idx = G.traffic.indexOf(car);
      if (idx >= 0) G.traffic.splice(idx, 1);
    }
    car.isPlayer = true;
    car.isTraffic = false;
    p.car = car;
    p.onFoot = false;
    if (!car.stolen) {
      car.stolen = true;
      AN.addWanted(G, 1, "car theft");
    }
    if (G.sound) G.sound.horn();
    return true;
  };

  AN.exitCar = function (G) {
    var p = G.player;
    if (!p.car) return;
    var car = p.car;
    p.car = null;
    p.onFoot = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    var col = AN.collideCity(G.city, p.x, p.y, 14);
    p.x = col.x; p.y = col.y;
    G.traffic.push(car);
    car.isPlayer = false;
    car.isTraffic = true;
    car.speed = 0;
  };
})();
