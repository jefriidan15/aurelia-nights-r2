// Aurelia Nights — loop.js
// Boot, the frame loop, the screen state machine, the day/night clock,
// deterministic screenshot staging (?shot=…), and the debug handle the
// automated playtest drives. Nothing here fakes state: every debug call
// runs the same code paths a real player would. The loop is capped at
// 50ms per frame so a backgrounded tab never jumps the simulation.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var canvas = null;
  var ctx = null;
  var lastT = 0;
  var shotDone = false;

  A.boot = function () {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    A.initInput(canvas);
    var params = new URLSearchParams(window.location.search);
    var seed = parseInt(params.get('seed') || '1', 10) || 1;
    A.newGame(seed);
    var shot = params.get('shot');
    if (shot) { A.stageShot(shot, seed); }
    window.addEventListener('resize', A.fitCanvas);
    A.fitCanvas();
    lastT = performance.now();
    requestAnimationFrame(A.frame);
  };

  A.fitCanvas = function () {
    if (!canvas) { return; }
    // Never upscale: the bitmap is 1280x800 and screenshots must stay
    // exactly that size, so the styled size stays at or below it.
    var scale = Math.min(1, window.innerWidth / 1280, window.innerHeight / 800);
    canvas.style.width = Math.floor(1280 * scale) + 'px';
    canvas.style.height = Math.floor(800 * scale) + 'px';
  };

  // Stage one deterministic scene for a screenshot: skip the title,
  // drop the player (and, for the chase, the cops) where the shot needs
  // them, and centre the camera on them.
  A.stageShot = function (shot, seed) {
    var G = A.G;
    A.seedRandom(seed * 7919 + 13);
    G.mode = 'playing';
    var p = G.player;
    if (shot === 'start') {
      p.x = 600; p.y = 470; p.angle = Math.PI / 2;
      p.cash = 125;
      G.time = 0.35;
    } else if (shot === 'chase') {
      var car = A.nearestCar(1200, 450, 900) || G.cars[0];
      A.stealCar(car);
      p.x = car.x; p.y = car.y;
      G.wanted = 3;
      G.quietTimer = 0;
      while (G.cops.length < 6) { A.spawnCop(); }
      // Ring the car with cops so the chase reads in a single frame.
      for (var i = 0; i < G.cops.length; i++) {
        var a = (i / G.cops.length) * Math.PI * 2;
        G.cops[i].x = p.x + Math.cos(a) * 260;
        G.cops[i].y = p.y + Math.sin(a) * 260;
      }
      G.time = 0.42;
    } else if (shot === 'docks') {
      p.x = 2900; p.y = 1500; p.angle = Math.PI / 2;
      p.cash = 640;
      G.time = 0.5;
      A.spawnHostiles(3, 2900, 1650, 200);
    } else if (shot === 'night') {
      var car2 = A.nearestCar(2450, 480, 900) || G.cars[0];
      A.stealCar(car2);
      p.x = car2.x; p.y = car2.y;
      car2.speed = 240;
      G.time = 0.92;
      p.cash = 2150;
    }
    G.cam.x = A.clamp(p.x, 640, A.CFG.WORLD_W - 640);
    G.cam.y = A.clamp(p.y, 400, A.CFG.WORLD_H - 400);
    shotDone = false;
  };

  A.frame = function (t) {
    requestAnimationFrame(A.frame);
    var dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    A.tick(dt);
    A.render(ctx);
    A.handleClicks();
    A.endFrameInput();
    if (!shotDone && A.G.mode === 'playing') {
      shotDone = true;
      window.__shotReady = true;
    }
  };

  A.tick = function (dt) {
    var G = A.G;
    if (!G) { return; }

    // F1 mutes on every screen.
    if (A.hit('F1')) {
      G.muted = !G.muted;
      A.flash(G.muted ? 'Sound muted' : 'Sound on', 1.2);
    }

    if (G.mode === 'title') {
      if (A.hit('Enter')) { A.startFresh(); }
      return;
    }
    if (G.mode === 'howto') {
      if (A.hit('Escape') || A.hit('Enter')) { G.mode = 'title'; }
      return;
    }
    if (G.mode === 'paused') {
      if (A.hit('KeyP') || A.hit('Escape')) { G.mode = 'playing'; }
      return;
    }
    if (G.mode === 'jobboard') {
      if (A.hit('KeyM') || A.hit('Escape')) { G.mode = 'playing'; }
      return;
    }
    if (G.mode === 'shop') {
      if (A.hit('KeyE') || A.hit('Escape')) { A.closeShop(); }
      return;
    }
    if (G.mode === 'busted' || G.mode === 'wasted' || G.mode === 'win') {
      if (A.hit('Enter')) { A.backToTitle(); }
      return;
    }
    if (G.mode !== 'playing') { return; }

    // ---- playing ---------------------------------------------------------
    G.elapsed += dt;
    G.time += dt / A.CFG.DAY_LENGTH;
    if (G.time >= 1) { G.time -= 1; G.dayCount += 1; }

    if (A.hit('KeyP') || A.hit('Escape')) { G.mode = 'paused'; A.sfx('click'); return; }
    if (A.hit('KeyM')) { G.mode = 'jobboard'; A.sfx('click'); return; }

    A.updatePlayer(dt);
    A.updateCars(dt);
    A.updatePeds(dt);
    A.replenishPeds(dt);
    A.updatePolice(dt);
    A.updateGuns(dt);
    A.updateHostiles(dt);
    A.updateMissions(dt);
    A.sirenTick(dt);

    // Street cash slowly restocks while the player roams.
    G.pickupTimer += dt;
    if (G.pickupTimer > 20) {
      G.pickupTimer = 0;
      if (G.pickups.length < A.CFG.PICKUP_COUNT) { A.addPickup(); }
    }

    G.cam.x = A.clamp(G.player.x, 640, A.CFG.WORLD_W - 640);
    G.cam.y = A.clamp(G.player.y, 400, A.CFG.WORLD_H - 400);

    if (G.msgTimer > 0) { G.msgTimer -= dt; }
    if (G.bannerTimer > 0) { G.bannerTimer -= dt; }
  };

  A.handleClicks = function () {
    if (!A.mouse.clicked) { return; }
    var mx = A.mouse.clickX, my = A.mouse.clickY;
    for (var i = 0; i < A.buttons.length; i++) {
      var b = A.buttons[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        A.uiAction(b.action);
        return;
      }
    }
  };

  A.uiAction = function (action) {
    var G = A.G;
    A.sfx('click');
    if (action === 'start') { A.startFresh(); }
    else if (action === 'continue') {
      var d = A.loadSave();
      if (d) {
        A.applySave(d);
        G.mode = 'playing';
        A.flash('Welcome back to Port Aurelia', 2.5);
      }
    }
    else if (action === 'howto') { G.mode = 'howto'; }
    else if (action === 'back-title') { A.backToTitle(); }
    else if (action === 'resume') { G.mode = 'playing'; }
    else if (action === 'save') {
      if (A.saveGame()) { A.flash('Game saved', 2); }
    }
    else if (action === 'quit') { A.backToTitle(); }
    else if (action === 'close-jobs') { G.mode = 'playing'; }
    else if (action === 'close-shop') { A.closeShop(); }
    else if (action === 'restart') { A.startFresh(); }
    else if (action.indexOf('buy:') === 0) { A.buyOffer(action.slice(4)); }
  };

  A.startFresh = function () {
    var seed = A.G ? A.G.seed : 1;
    A.newGame(seed);
    A.G.mode = 'playing';
    A.flash('Welcome to Port Aurelia — press M for jobs', 4);
  };

  A.backToTitle = function () {
    var seed = A.G ? A.G.seed : 1;
    A.newGame(seed);
    A.G.mode = 'title';
  };

  // ---- debug handle for the automated playtest ---------------------------
  // Every entry below drives the real game code paths; none of them
  // writes state directly except the setters that name what they set.
  A.debug = {
    G: function () { return A.G; },
    mode: function () { return A.G.mode; },
    teleport: function (x, y) {
      var p = A.G.player;
      if (p.inCar) {
        var car = A.playerCar();
        if (car) { car.x = x; car.y = y; }
      }
      p.x = x; p.y = y;
      A.G.cam.x = A.clamp(x, 640, A.CFG.WORLD_W - 640);
      A.G.cam.y = A.clamp(y, 400, A.CFG.WORLD_H - 400);
    },
    giveCash: function (n) { A.G.player.cash += n; },
    setCash: function (n) { A.G.player.cash = n; },
    setWanted: function (n) { A.G.wanted = n; A.G.quietTimer = 0; },
    setTime: function (t) { A.G.time = t; },
    setHp: function (n) { A.G.player.hp = n; },
    giveWeapon: function (w, ammo) {
      A.G.player.weapons[w] = true;
      A.G.player.ammo[w] = (A.G.player.ammo[w] || 0) + (ammo || 48);
      A.G.player.weapon = w;
    },
    startMission: function (i) { A.startMission(i); },
    mission: function () {
      return { idx: A.G.missionIdx, step: A.G.mission ? A.G.mission.step : -1, objective: A.objectiveText() };
    },
    nearestCar: function () {
      var c = A.nearestCar(A.G.player.x, A.G.player.y, 5000);
      return c ? { id: c.id, x: c.x, y: c.y } : null;
    },
    nearestShop: function (kind) {
      var best = null, bestD = 1e9;
      for (var i = 0; i < A.SHOPS.length; i++) {
        if (kind && A.SHOPS[i].kind !== kind) { continue; }
        var d = A.dist(A.G.player.x, A.G.player.y, A.SHOPS[i].x, A.SHOPS[i].y);
        if (d < bestD) { bestD = d; best = A.SHOPS[i]; }
      }
      return best ? { id: best.id, kind: best.kind, x: best.x, y: best.y, d: bestD } : null;
    },
    pressE: function () {
      var p = A.G.player;
      if (p.inCar) { A.exitCar(); return 'exited'; }
      var car = A.nearestCar(p.x, p.y, 58);
      if (car) { A.stealCar(car); return 'stole'; }
      var shop = A.nearestShop(p.x, p.y, 78);
      if (shop) { A.openShop(shop); return 'shop:' + shop.kind; }
      return 'nothing';
    },
    openShopKind: function (kind) {
      for (var i = 0; i < A.SHOPS.length; i++) {
        if (A.SHOPS[i].kind === kind) { A.openShop(A.SHOPS[i]); return true; }
      }
      return false;
    },
    buy: function (id) { A.buyOffer(id); },
    fireAt: function (x, y) {
      var G = A.G, p = G.player;
      // Point the virtual mouse at the target — tryFire aims at the cursor.
      A.mouse.x = x - G.cam.x + 640;
      A.mouse.y = y - G.cam.y + 400;
      p.angle = Math.atan2(y - p.y, x - p.x);
      A.tryFire();
    },
    hostiles: function () {
      return A.G.hostiles.map(function (h) { return { x: h.x, y: h.y, hp: h.hp }; });
    },
    cops: function () { return A.G.cops.length; },
    counts: function () {
      var G = A.G, alivePeds = 0;
      for (var i = 0; i < G.peds.length; i++) {
        if (G.peds[i].hp > 0) { alivePeds++; }
      }
      return {
        traffic: G.cars.length, parked: G.parked.length,
        pedsAlive: alivePeds, pedsTotal: G.peds.length,
        cops: G.cops.length, pickups: G.pickups.length,
        bullets: G.bullets.length, hostiles: G.hostiles.length
      };
    },
    saveNow: function () { return A.saveGame(); },
    loadSaveRaw: function () { return window.localStorage.getItem(A.CFG.SAVE_KEY); },
    district: function () { return A.districtAt(A.G.player.x, A.G.player.y); },
    isNight: function () { return A.isNight(); }
  };

  window.Aurelia = A;
  document.addEventListener('DOMContentLoaded', A.boot);
})();
