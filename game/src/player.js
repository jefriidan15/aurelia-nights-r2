// Aurelia Nights — player.js
// The on-foot player: walking, sprinting, stealing and exiting cars,
// collecting street cash, taking damage and healing.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.updatePlayer = function (dt) {
    var G = A.G;
    var p = G.player;
    if (p.inCar) { return; }

    var mv = A.moveVector();
    var sprint = A.down('ShiftLeft') || A.down('ShiftRight');
    var speed = sprint ? A.CFG.SPRINT_SPEED : A.CFG.WALK_SPEED;
    p.moving = (mv.x !== 0 || mv.y !== 0);
    p.speed = p.moving ? speed : 0;

    var nx = p.x + mv.x * speed * dt;
    var ny = p.y + mv.y * speed * dt;
    // Slide along walls: try each axis separately.
    if (A.walkable(nx, p.y, 12)) { p.x = nx; }
    if (A.walkable(p.x, ny, 12)) { p.y = ny; }
    p.x = A.clamp(p.x, 20, A.CFG.WORLD_W - 20);
    p.y = A.clamp(p.y, 20, A.CFG.WORLD_H - 20);

    // Face the mouse while on foot.
    p.angle = A.aimAngle();

    // Street cash.
    for (var i = G.pickups.length - 1; i >= 0; i--) {
      var pk = G.pickups[i];
      if (A.dist(p.x, p.y, pk.x, pk.y) < 26) {
        p.cash += pk.amount;
        A.flash('+$' + pk.amount + ' street cash', 1.6);
        A.sfx('pickup');
        A.burst(pk.x, pk.y, '#2ecc71', 10, 120);
        G.pickups.splice(i, 1);
      }
    }

    // Context action: E near a car steals it, E near a shop opens it.
    if (A.hit('KeyE')) {
      var car = A.nearestCar(p.x, p.y, 58);
      if (car) {
        A.stealCar(car);
      } else {
        var shop = A.nearestShop(p.x, p.y, 78);
        if (shop) { A.openShop(shop); }
      }
    }
  };

  A.nearestCar = function (x, y, maxD) {
    var G = A.G;
    var best = null, bestD = maxD;
    var all = G.cars.concat(G.parked);
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (c.driven) { continue; }
      var d = A.dist(x, y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  };

  A.nearestShop = function (x, y, maxD) {
    var best = null, bestD = maxD;
    for (var i = 0; i < A.SHOPS.length; i++) {
      var s = A.SHOPS[i];
      var d = A.dist(x, y, s.x, s.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  };

  A.stealCar = function (car) {
    var G = A.G;
    var p = G.player;
    car.driven = true;
    car.traffic = false;
    car.parked = false;
    p.inCar = true;
    p.carId = car.id;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    G.stats.stolen += 1;
    A.raiseWanted(1, 'Grand theft auto');
    A.sfx('steal');
    A.flash('Car stolen — the law is watching', 2.5);
    A.burst(car.x, car.y, '#f1c40f', 8, 100);
  };

  A.exitCar = function () {
    var G = A.G;
    var p = G.player;
    var car = A.playerCar();
    if (!car) { p.inCar = false; p.carId = -1; return; }
    car.driven = false;
    car.speed = 0;
    // Step out to the side of the car.
    var sx = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    var sy = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    if (!A.walkable(sx, sy, 12)) {
      sx = car.x - Math.cos(car.angle + Math.PI / 2) * 34;
      sy = car.y - Math.sin(car.angle + Math.PI / 2) * 34;
    }
    p.x = sx; p.y = sy;
    p.inCar = false;
    p.carId = -1;
    p.angle = car.angle;
    A.sfx('click');
  };

  A.playerCar = function () {
    var G = A.G;
    if (!G.player.inCar) { return null; }
    var all = G.cars.concat(G.parked);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === G.player.carId) { return all[i]; }
    }
    return null;
  };

  A.damagePlayer = function (amount, cause) {
    var G = A.G;
    var p = G.player;
    if (G.mode !== 'playing' || G.over) { return; }
    p.hp -= amount;
    A.sfx('hurt');
    A.burst(p.x, p.y, '#e74c3c', 8, 140);
    if (p.hp <= 0) {
      p.hp = 0;
      A.wasted(cause || 'You got wasted.');
    }
  };

  A.healPlayer = function (amount) {
    var p = A.G.player;
    p.hp = Math.min(p.maxHp, p.hp + amount);
  };

  A.raiseWanted = function (n, why) {
    var G = A.G;
    var before = G.wanted;
    G.wanted = Math.min(A.CFG.MAX_WANTED, G.wanted + n);
    G.quietTimer = 0;
    G.decayTimer = 0;
    if (G.wanted > before) {
      A.flash('Wanted level ' + G.wanted + ' — ' + (why || 'heat'), 2.2);
    }
  };

  A.wasted = function (text) {
    var G = A.G;
    G.over = true;
    G.mode = 'wasted';
    G.overText = text;
    A.sfx('busted');
    A.saveGame();
  };

  A.busted = function () {
    var G = A.G;
    G.over = true;
    G.mode = 'busted';
    G.stats.busted += 1;
    G.player.cash = Math.max(0, G.player.cash - 100);
    G.overText = 'Busted. The cops took $100 and your ride.';
    A.sfx('busted');
    if (G.player.inCar) { A.exitCar(); }
    G.wanted = 0;
    G.cops = [];
    A.saveGame();
  };
})();
