// Aurelia Nights — engine.js
// Boot, main loop, on-foot movement, camera, day/night clock,
// ?shot= staging for screenshots, and the test hook.
(function () {
  var AN = window.AN;

  AN.newGame = function (canvas) {
    var G = {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      view: { w: canvas.width, h: canvas.height },
      camera: { x: AN.PLACES.playerStart.x, y: AN.PLACES.playerStart.y, zoom: 1 },
      time: 0,
      timeOfDay: 0.3, // 0..1, morning start
      mode: "title",
      city: AN.buildCity(),
      player: {
        x: AN.PLACES.playerStart.x, y: AN.PLACES.playerStart.y,
        angle: 0, aimAngle: 0, health: 100, money: 200,
        onFoot: true, car: null,
        weapon: "pistol", pistolAmmo: 48, shotgunAmmo: 0, hasShotgun: false,
        fireCooldown: 0, hurtFlash: 0, walkSpeed: 165
      },
      input: AN.makeInput(),
      traffic: [],
      walkers: [],
      cops: [],
      guards: [],
      bullets: [],
      cash: [],
      checkpoints: [],
      particles: AN.makeParticles(),
      floaters: [],
      wanted: 0,
      calmTimer: 0,
      coolTimer: 0,
      lastShotAt: null,
      muzzle: 0,
      shopOpen: null,
      job: AN.makeJobState(),
      sound: AN.makeSound(),
      bustedT: 0,
      wastedT: 0,
      winT: 0,
      shot: null,
      seed: 1
    };
    G.traffic = AN.spawnTraffic(G.city);
    G.walkers = AN.spawnWalkers();
    AN.spawnCash(G);
    return G;
  };

  AN.parseShot = function (G) {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get("shot");
    var seed = parseInt(q.get("seed") || "1", 10);
    if (!shot) return;
    G.shot = shot;
    G.seed = isNaN(seed) ? 1 : seed;
    G.mode = "playing";
    if (shot === "start") {
      // City overview on foot in Old Town.
      G.player.x = 900; G.player.y = 900;
      G.camera.zoom = 0.62;
      G.timeOfDay = 0.3;
    } else if (shot === "chase") {
      G.player.x = 1800; G.player.y = 1200;
      var car = AN.makeCar(1800, 1200, 0, "#e84118", { isPlayer: true });
      G.player.car = car;
      G.player.onFoot = false;
      car.speed = 220;
      G.wanted = 3;
      AN.syncCruisers(G);
      G.camera.zoom = 0.85;
      G.timeOfDay = 0.35;
    } else if (shot === "docks") {
      G.player.x = 3300; G.player.y = 2260;
      G.player.weapon = "shotgun";
      G.player.hasShotgun = true;
      G.player.shotgunAmmo = 12;
      G.player.aimAngle = Math.PI / 2;
      AN.spawnGuards(G);
      AN.startJob(G, 2);
      // startJob re-spawns the guards, so hold their fire AFTER it:
      // the capture should show the standoff, not a hospital trip.
      G.guards.forEach(function (g) { g.shootT = 2.5; });
      G.camera.zoom = 0.9;
      G.timeOfDay = 0.4;
    } else if (shot === "night") {
      G.player.x = 1300; G.player.y = 750;
      var nightCar = AN.makeCar(1300, 750, 0, "#8e44ad", { isPlayer: true });
      G.player.car = nightCar;
      G.player.onFoot = false;
      nightCar.speed = 180;
      G.timeOfDay = 0.85;
      G.camera.zoom = 0.85;
    }
    AN.refreshScreens(G);
  };

  AN.updatePlayerOnFoot = function (G, dt) {
    var p = G.player, input = G.input;
    if (!p.onFoot) return;
    var mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    var my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx !== 0 || my !== 0) {
      var len = Math.sqrt(mx * mx + my * my);
      var sp = p.walkSpeed * (input.sprint ? 1.7 : 1);
      p.x += (mx / len) * sp * dt;
      p.y += (my / len) * sp * dt;
    }
    var col = AN.collideCity(G.city, p.x, p.y, 13);
    p.x = col.x; p.y = col.y;
    if (AN.inWater(G.city, p.x, p.y)) {
      p.x = AN.clamp(p.x, 40, AN.WORLD_W - 40);
      p.y = Math.min(p.y, 2410);
    }
    p.x = AN.clamp(p.x, 30, AN.WORLD_W - 30);
    p.y = AN.clamp(p.y, 30, AN.WORLD_H - 30);
    if (input.mouseDown) AN.fireWeapon(G);
  };

  AN.updateCamera = function (G, dt) {
    var p = G.player;
    var tx = p.x, ty = p.y;
    if (G.shot === "start") { tx = 1100; ty = 1050; }
    G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
    G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
  };

  AN.updateFloaters = function (G, dt) {
    for (var i = G.floaters.length - 1; i >= 0; i--) {
      var f = G.floaters[i];
      f.t -= dt;
      f.y -= 22 * dt;
      if (f.t <= 0) G.floaters.splice(i, 1);
    }
  };

  AN.tick = function (G, dt) {
    G.time += dt;
    G.timeOfDay = (G.timeOfDay + dt / 240) % 1;
    if (G.muzzle > 0) G.muzzle -= dt;
    if (G.player.hurtFlash > 0) G.player.hurtFlash -= dt;
    if (G.player.fireCooldown > 0) G.player.fireCooldown -= dt;
    AN.updateAim(G);
    AN.updatePlayerOnFoot(G, dt);
    if (G.player.car) AN.drivePlayerCar(G, dt, G.input);
    AN.updateTraffic(G.traffic, dt, G);
    AN.updateWalkers(G.walkers, dt, G);
    AN.updateCops(G, dt);
    AN.updateGuards(G, dt);
    AN.updateBullets(G, dt);
    AN.updateCash(G, dt);
    AN.updateJobs(G, dt);
    AN.updateParticles(G.particles, dt);
    AN.updateFloaters(G, dt);
    AN.updateCamera(G, dt);
    if (G.sound) {
      G.sound.setEngine(G.player.car ? G.player.car.speed : 0, !!G.player.car);
      G.sound.setSiren(G.cops.length > 0);
    }
    if (G.mode === "busted") {
      G.bustedT += dt;
      if (G.bustedT > 2.2) { G.mode = "playing"; AN.refreshScreens(G); }
    }
    if (G.mode === "wasted") {
      G.wastedT += dt;
      if (G.wastedT > 2.2) { G.mode = "playing"; AN.refreshScreens(G); }
    }
  };

  AN.resize = function (G) {
    var canvas = G.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    G.view.w = canvas.width;
    G.view.h = canvas.height;
  };

  AN.boot = function () {
    var canvas = document.getElementById("game-canvas");
    if (!canvas) return null;
    var G = AN.newGame(canvas);
    window.__AURELIA = G;
    window.AN = AN;
    AN.resize(G);
    window.addEventListener("resize", function () { AN.resize(G); });
    AN.bindControls(G, canvas);
    AN.bindScreens(G);
    AN.parseShot(G);
    AN.refreshScreens(G);
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (G.mode === "playing" || G.mode === "jobboard") {
        AN.tick(G, dt);
      } else if (G.mode === "busted") {
        G.bustedT += dt;
        AN.updateParticles(G.particles, dt);
        if (G.bustedT > 2.2) { G.mode = "playing"; AN.refreshScreens(G); }
      } else if (G.mode === "wasted") {
        G.wastedT += dt;
        AN.updateParticles(G.particles, dt);
        if (G.wastedT > 2.2) { G.mode = "playing"; AN.refreshScreens(G); }
      }
      AN.drawGame(G);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return G;
  };

  document.addEventListener("DOMContentLoaded", function () {
    AN.boot();
  });
})();
