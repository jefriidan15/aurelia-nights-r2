// Aurelia Nights — walkers.js
// The 30 pedestrians of Port Aurelia: strolling, chatting, fleeing gunfire.
(function () {
  var AN = window.AN;

  AN.spawnWalkers = function () {
    var peds = [];
    for (var i = 0; i < 30; i++) {
      var vertical = AN.rng() < 0.5;
      var x, y;
      if (vertical) {
        x = AN.pick(AN.ROAD_X) + AN.rand(-70, 70);
        y = AN.rand(100, 2050);
      } else {
        x = AN.rand(100, 3400);
        y = AN.pick(AN.ROAD_Y) + AN.rand(-70, 70);
      }
      peds.push({
        x: x, y: y, angle: AN.rand(0, Math.PI * 2),
        speed: AN.rand(28, 52), color: AN.pick(AN.PED_COLORS),
        panic: 0, pauseT: AN.rand(0, 3), seed: AN.rand(0, 100)
      });
    }
    return peds;
  };

  AN.updateWalkers = function (peds, dt, G) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      var shotNear = G.lastShotAt && G.lastShotAt.t > G.time - 1.5 &&
        AN.dist(p.x, p.y, G.lastShotAt.x, G.lastShotAt.y) < 300;
      var carNear = G.player.car && AN.dist(p.x, p.y, G.player.car.x, G.player.car.y) < 46 &&
        Math.abs(G.player.car.speed) > 60;
      if (shotNear || carNear) p.panic = 2.5;
      if (p.panic > 0) {
        p.panic -= dt;
        var fx = G.player.x, fy = G.player.y;
        if (shotNear) { fx = G.lastShotAt.x; fy = G.lastShotAt.y; }
        else if (G.player.car) { fx = G.player.car.x; fy = G.player.car.y; }
        p.angle = AN.angTo(fx, fy, p.x, p.y);
        p.x += Math.cos(p.angle) * 150 * dt;
        p.y += Math.sin(p.angle) * 150 * dt;
      } else {
        if (p.pauseT > 0) { p.pauseT -= dt; continue; }
        p.x += Math.cos(p.angle) * p.speed * dt;
        p.y += Math.sin(p.angle) * p.speed * dt;
        if (AN.rng() < dt * 0.25) p.angle += AN.rand(-1.2, 1.2);
        if (AN.rng() < dt * 0.08) p.pauseT = AN.rand(1, 4);
      }
      if (p.x < 40 || p.x > AN.WORLD_W - 40 || p.y < 40 || p.y > 2400) {
        p.angle += Math.PI;
        p.x = AN.clamp(p.x, 50, AN.WORLD_W - 50);
        p.y = AN.clamp(p.y, 50, 2400);
      }
      var col = AN.collideCity(G.city, p.x, p.y, 10);
      if (col.hit) { p.x = col.x; p.y = col.y; p.angle += Math.PI / 2; }
      if (AN.inWater(G.city, p.x, p.y)) { p.angle += Math.PI; }
    }
  };
})();
