// Aurelia Nights — people.js
// Pedestrians: thirty locals who stroll the roads and scatter in panic
// when a gun goes off nearby. They keep to the roads so they never get
// stuck inside a building.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.updatePeds = function (dt) {
    var G = A.G;
    for (var i = 0; i < G.peds.length; i++) {
      var pd = G.peds[i];
      if (pd.hp <= 0) { continue; }
      pd.panic = Math.max(0, pd.panic - dt);

      var targetX, targetY, speed;
      if (pd.panic > 0) {
        // Flee directly away from the scare point, fast.
        targetX = pd.fleeX; targetY = pd.fleeY; speed = pd.speed * 2.6;
        var dx = pd.x - targetX, dy = pd.y - targetY;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        A.movePed(pd, pd.x + (dx / d) * speed * dt, pd.y + (dy / d) * speed * dt);
      } else {
        if (A.dist(pd.x, pd.y, pd.tx, pd.ty) < 24 || !A.walkable(pd.tx, pd.ty, 8)) {
          var np = A.randomRoadPoint();
          pd.tx = np.x; pd.ty = np.y;
        }
        var mdx = pd.tx - pd.x, mdy = pd.ty - pd.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
        speed = pd.speed;
        A.movePed(pd, pd.x + (mdx / md) * speed * dt, pd.y + (mdy / md) * speed * dt);
        pd.angle = Math.atan2(mdy, mdx);
      }

      // A speeding car ploughing through a crowd is a crime.
      var car = A.playerCar();
      if (car && Math.abs(car.speed) > 200 && A.dist(pd.x, pd.y, car.x, car.y) < 30) {
        A.killPed(pd, 'run over');
      }
    }
  };

  A.movePed = function (pd, nx, ny) {
    if (A.walkable(nx, pd.y, 10)) { pd.x = nx; }
    if (A.walkable(pd.x, ny, 10)) { pd.y = ny; }
    pd.x = A.clamp(pd.x, 20, A.CFG.WORLD_W - 20);
    pd.y = A.clamp(pd.y, 20, A.CFG.HARBOUR_Y - 20);
  };

  // Everyone within `radius` of a gunshot panics and runs.
  A.scarePeds = function (x, y, radius) {
    var G = A.G;
    for (var i = 0; i < G.peds.length; i++) {
      var pd = G.peds[i];
      if (pd.hp > 0 && A.dist(pd.x, pd.y, x, y) < radius) {
        pd.panic = 3;
        pd.fleeX = x; pd.fleeY = y;
      }
    }
  };

  A.killPed = function (pd, how) {
    if (pd.dead) { return; }
    pd.dead = true;
    pd.hp = 0;
    var G = A.G;
    G.stats.kills += 1;
    A.raiseWanted(1, 'Pedestrian ' + how);
    A.burst(pd.x, pd.y, '#c0392b', 14, 170);
    A.scarePeds(pd.x, pd.y, 420);
  };

  // Dead pedestrians are replaced so the streets always feel alive.
  A.replenishPeds = function (dt) {
    var G = A.G;
    G._pedTimer = (G._pedTimer || 0) + dt;
    if (G._pedTimer < 6) { return; }
    G._pedTimer = 0;
    var alive = 0;
    for (var i = 0; i < G.peds.length; i++) { if (G.peds[i].hp > 0) { alive++; } }
    if (alive < A.CFG.PED_COUNT) {
      var p = A.randomRoadPoint();
      G.peds.push({
        id: 1000 + Math.floor(A.rand() * 9000), x: p.x, y: p.y, tx: p.x, ty: p.y,
        hp: 50, speed: A.randRange(28, 55), state: 'walk',
        fleeX: 0, fleeY: 0, color: A.pick(['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6']),
        panic: 0, angle: 0
      });
    }
    // Sweep the long-dead so the array never grows without bound.
    if (G.peds.length > A.CFG.PED_COUNT + 6) {
      G.peds = G.peds.filter(function (pd) { return pd.hp > 0; });
    }
  };
})();
