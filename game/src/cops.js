// Aurelia Nights — cops.js
// The 5-star wanted system and the cruisers that hunt Aurelia.
(function () {
  var AN = window.AN;

  AN.addWanted = function (G, n, reason) {
    var before = G.wanted;
    G.wanted = AN.clamp(G.wanted + n, 0, 5);
    G.coolTimer = 0;
    G.calmTimer = 0;
    if (G.wanted > before) {
      G.floaters.push({
        x: G.player.x, y: G.player.y - 44,
        text: "+" + (G.wanted - before) + " STAR  (" + reason + ")", t: 2, color: "#ff6b6b"
      });
      if (G.sound) G.sound.sirenBlip();
    }
    AN.syncCruisers(G);
  };

  AN.clearWanted = function (G, reason) {
    G.wanted = 0;
    G.coolTimer = 0;
    G.calmTimer = 0;
    G.cops = [];
    G.floaters.push({ x: G.player.x, y: G.player.y - 44, text: "HEAT GONE — " + reason, t: 2, color: "#2ed573" });
  };

  // Keep cruiser count in step with stars: stars + 1, capped at 6.
  AN.syncCruisers = function (G) {
    var want = G.wanted === 0 ? 0 : Math.min(6, G.wanted + 1);
    while (G.cops.length < want) {
      var a = AN.rand(0, Math.PI * 2);
      var sx = AN.clamp(G.player.x + Math.cos(a) * AN.rand(500, 800), 100, AN.WORLD_W - 100);
      var sy = AN.clamp(G.player.y + Math.sin(a) * AN.rand(500, 800), 100, 2350);
      var near = AN.nearestRoadPoint(sx, sy);
      var car = AN.makeCar(near.x, near.y, AN.angTo(near.x, near.y, G.player.x, G.player.y), "#1e3799", { isCop: true });
      car.speed = 120;
      G.cops.push({ car: car, stuck: 0, ramCooldown: 0 });
    }
    while (G.cops.length > want) G.cops.pop();
  };

  AN.updateCops = function (G, dt) {
    var p = G.player;
    // Cooling off: stay clean and the heat fades one star at a time.
    if (G.wanted > 0) {
      G.calmTimer += dt;
      if (G.calmTimer > 20) {
        G.calmTimer = 0;
        G.wanted -= 1;
        AN.syncCruisers(G);
        if (G.wanted === 0) G.floaters.push({ x: p.x, y: p.y - 44, text: "You laid low. Heat's gone.", t: 2, color: "#2ed573" });
      }
    }
    for (var i = 0; i < G.cops.length; i++) {
      var cop = G.cops[i], car = cop.car;
      var target = AN.angTo(car.x, car.y, p.x, p.y);
      var diff = AN.wrapAngle(target - car.angle);
      car.angle += AN.clamp(diff, -2.6 * dt, 2.6 * dt);
      var wantSpeed = 150 + G.wanted * 32;
      car.speed += (wantSpeed - car.speed) * dt * 0.7;
      var ox = car.x, oy = car.y;
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      var col = AN.collideCity(G.city, car.x, car.y, 20);
      if (col.hit) { car.x = col.x; car.y = col.y; car.speed *= 0.4; cop.stuck += dt; }
      if (Math.abs(car.x - ox) + Math.abs(car.y - oy) < 2 * dt) cop.stuck += dt; else cop.stuck = 0;
      if (cop.stuck > 2.5) { car.angle += Math.PI * 0.75; cop.stuck = 0; }
      if (AN.inWater(G.city, car.x, car.y)) { car.x = ox; car.y = oy; car.angle += Math.PI / 2; }
      // Ram the player's car.
      if (p.car && cop.ramCooldown <= 0 && AN.dist(car.x, car.y, p.car.x, p.car.y) < 52) {
        cop.ramCooldown = 1.2;
        AN.damageCar(G, p.car, 9);
        AN.burst(G.particles, p.car.x, p.car.y, 10, "#f5f6fa", 150, 0.5);
        if (G.sound) G.sound.thud();
      }
      cop.ramCooldown -= dt;
      // Busted on foot: a cruiser catches Aurelia.
      if (p.onFoot && AN.dist(car.x, car.y, p.x, p.y) < 34) {
        AN.getBusted(G);
        return;
      }
    }
  };

  AN.getBusted = function (G) {
    var p = G.player;
    var fine = Math.min(p.money, 100);
    p.money -= fine;
    p.health = 100;
    AN.clearWanted(G, "busted");
    p.x = AN.PLACES.hospital.x;
    p.y = AN.PLACES.hospital.y + 60;
    if (p.car) { G.traffic.push(p.car); p.car.isPlayer = false; p.car.isTraffic = true; p.car = null; }
    p.onFoot = true;
    G.mode = "busted";
    G.bustedT = 0;
    AN.refreshScreens(G);
    if (G.sound) G.sound.busted();
  };
})();
