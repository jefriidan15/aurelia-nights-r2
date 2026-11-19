// Aurelia Nights — cars.js
// Traffic and arcade driving. Traffic cars cruise their avenue or street
// and wrap around the world edge. The player's car uses simple
// acceleration / steering physics, slides off buildings with a crash,
// and can shove traffic cars out of the way at speed. Wrecking the
// car at 0 HP dumps the player out on foot.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.updateCars = function (dt) {
    var G = A.G, c = A.CFG;
    for (var i = 0; i < G.cars.length; i++) {
      var car = G.cars[i];
      if (car.driven) { continue; }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // Wrap: a car leaving one edge re-enters from the opposite side.
      if (car.x < -60) { car.x = c.WORLD_W + 50; }
      else if (car.x > c.WORLD_W + 60) { car.x = -50; }
      if (car.y < -60) { car.y = c.HARBOUR_Y + 50; }
      else if (car.y > c.HARBOUR_Y + 60) { car.y = -50; }
    }
    // A stolen parked car leaves the parked list and joins traffic.
    for (var j = G.parked.length - 1; j >= 0; j--) {
      if (G.parked[j].driven) { G.cars.push(G.parked.splice(j, 1)[0]); }
    }
    A.updateDriving(dt);
  };

  A.updateDriving = function (dt) {
    var G = A.G, p = G.player;
    if (!p.inCar) { return; }
    var car = A.playerCar();
    if (!car) { p.inCar = false; return; }
    var c = A.CFG;

    var gas = A.down('KeyW') || A.down('ArrowUp');
    var brake = A.down('KeyS') || A.down('ArrowDown');
    var steer = 0;
    if (A.down('KeyA') || A.down('ArrowLeft')) { steer -= 1; }
    if (A.down('KeyD') || A.down('ArrowRight')) { steer += 1; }
    var handbrake = A.down('Space');

    if (gas) { car.speed += c.CAR_ACCEL * dt; }
    if (brake) {
      car.speed -= (car.speed > 10 ? c.CAR_BRAKE : c.CAR_ACCEL * 0.6) * dt;
    }
    if (!gas && !brake) {
      car.speed -= Math.sign(car.speed) * 130 * dt;
      if (Math.abs(car.speed) < 6) { car.speed = 0; }
    }
    if (handbrake) {
      car.speed -= Math.sign(car.speed) * 700 * dt;
      if (Math.abs(car.speed) < 12) { car.speed = 0; }
    }
    car.speed = A.clamp(car.speed, -c.CAR_REVERSE_MAX, c.CAR_MAX_SPEED);

    // Steering only bites while moving, and reverses when reversing.
    var dir = car.speed >= 0 ? 1 : -1;
    var grip = Math.min(1, Math.abs(car.speed) / 90);
    car.angle += steer * c.CAR_TURN * dt * dir * grip;

    var nx = car.x + Math.cos(car.angle) * car.speed * dt;
    var ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (A.walkable(nx, car.y, 16)) { car.x = nx; }
    else if (Math.abs(car.speed) > 60) { A.carCrash(car); }
    if (A.walkable(car.x, ny, 16)) { car.y = ny; }
    else if (Math.abs(car.speed) > 60) { A.carCrash(car); }
    car.x = A.clamp(car.x, 24, c.WORLD_W - 24);
    car.y = A.clamp(car.y, 24, c.WORLD_H - 24);

    p.x = car.x; p.y = car.y; p.angle = car.angle;
    p.speed = Math.abs(car.speed);

    // Ram traffic cars out of the way at speed.
    for (var i = 0; i < G.cars.length; i++) {
      var other = G.cars[i];
      if (other === car || other.driven) { continue; }
      if (A.dist(car.x, car.y, other.x, other.y) < 34 && Math.abs(car.speed) > 120) {
        other.x += Math.cos(car.angle) * 26;
        other.y += Math.sin(car.angle) * 26;
        other.speed = Math.max(40, other.speed * 0.6);
        A.sfx('crash');
        A.burst(other.x, other.y, '#f39c12', 8, 130);
      }
    }

    if (A.hit('KeyE')) { A.exitCar(); }
    if (A.hit('KeyH')) { A.sfx('horn'); }
  };

  A.carCrash = function (car) {
    car.speed *= -0.25;
    car.hp -= 8;
    A.sfx('crash');
    A.burst(car.x, car.y, '#95a5a6', 10, 150);
    if (car.hp <= 0 && car.driven) {
      A.flash('Your ride is wrecked', 2.5);
      A.exitCar();
      car.hp = 1;
    }
  };

  A.repairCar = function (car) {
    if (car) { car.hp = A.CFG.CAR_HP; }
  };
})();
