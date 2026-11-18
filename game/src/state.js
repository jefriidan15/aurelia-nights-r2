// Aurelia Nights — state.js
// The single game-state object plus new-game setup, population spawns and
// the localStorage save / load used by the safehouse and the title screen.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};
  var CFG = null;

  function cfg() { if (!CFG) { CFG = A.CFG; } return CFG; }

  A.G = null;

  A.newGame = function (seed) {
    var c = cfg();
    var world = A.buildWorld(seed);
    A.G = {
      seed: seed,
      world: world,
      mode: 'title',
      prevMode: 'title',
      time: 0.35,            // morning
      dayCount: 1,
      elapsed: 0,
      player: {
        x: 600, y: 500, angle: -Math.PI / 2,
        hp: c.PLAYER_HP, maxHp: c.PLAYER_HP,
        cash: 0, inCar: false, carId: -1,
        weapon: 'pistol',
        weapons: { pistol: true, shotgun: false },
        ammo: { pistol: 48, shotgun: 0 },
        speed: 0, moving: false
      },
      wanted: 0,
      quietTimer: 0,
      decayTimer: 0,
      cars: [],
      parked: [],
      peds: [],
      cops: [],
      hostiles: [],
      bullets: [],
      parts: [],
      pickups: [],
      pickupTimer: 0,
      missionIdx: 0,
      mission: null,
      stats: { kills: 0, stolen: 0, shots: 0, earned: 0, busted: 0 },
      shop: null,
      msg: '',
      msgTimer: 0,
      banner: '',
      bannerTimer: 0,
      cam: { x: 600, y: 500 },
      muted: false,
      sirenTimer: 0,
      arrestMeter: 0,
      vaultCopsSpawned: false,
      over: false
    };
    A.spawnTraffic();
    A.spawnParked();
    A.spawnPeds();
    A.spawnPickups();
    A.startMission(0);
    return A.G;
  };

  A.carColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#dfe6e9', '#2c3e50', '#e67e22', '#7f8c8d'];

  A.spawnTraffic = function () {
    var c = cfg();
    var G = A.G;
    G.cars = [];
    for (var i = 0; i < c.TRAFFIC_COUNT; i++) {
      var vertical = A.chance(0.5);
      var car;
      if (vertical) {
        car = {
          id: i, x: A.pick(A.AVENUES) + A.randRange(-18, 18),
          y: A.randRange(60, c.HARBOUR_Y - 60),
          angle: A.chance(0.5) ? Math.PI / 2 : -Math.PI / 2,
          speed: A.randRange(60, 115), traffic: true, parked: false,
          hp: c.CAR_HP, color: A.pick(A.carColors)
        };
      } else {
        car = {
          id: i, x: A.randRange(60, c.WORLD_W - 60),
          y: A.pick(A.STREETS.filter(function (s) { return s < c.HARBOUR_Y; })) + A.randRange(-18, 18),
          angle: A.chance(0.5) ? 0 : Math.PI,
          speed: A.randRange(60, 115), traffic: true, parked: false,
          hp: c.CAR_HP, color: A.pick(A.carColors)
        };
      }
      G.cars.push(car);
    }
  };

  A.spawnParked = function () {
    var c = cfg();
    var G = A.G;
    G.parked = [];
    for (var i = 0; i < c.PARKED_COUNT; i++) {
      var p = A.randomRoadPoint();
      G.parked.push({
        id: 100 + i, x: p.x, y: p.y,
        angle: A.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]),
        speed: 0, traffic: false, parked: true,
        hp: c.CAR_HP, color: A.pick(A.carColors)
      });
    }
  };

  A.spawnPeds = function () {
    var c = cfg();
    var G = A.G;
    G.peds = [];
    var skins = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1'];
    for (var i = 0; i < c.PED_COUNT; i++) {
      var p = A.randomRoadPoint();
      G.peds.push({
        id: i, x: p.x, y: p.y, tx: p.x, ty: p.y,
        hp: 50, speed: A.randRange(28, 55),
        state: 'walk', fleeX: 0, fleeY: 0,
        color: A.pick(skins), panic: 0
      });
    }
  };

  A.spawnPickups = function () {
    var c = cfg();
    var G = A.G;
    G.pickups = [];
    for (var i = 0; i < c.PICKUP_COUNT; i++) {
      var p = A.randomRoadPoint();
      G.pickups.push({ x: p.x, y: p.y, amount: A.randInt(c.PICKUP_MIN, c.PICKUP_MAX), bob: A.randRange(0, 6) });
    }
  };

  A.addPickup = function () {
    var c = cfg();
    var p = A.randomRoadPoint();
    A.G.pickups.push({ x: p.x, y: p.y, amount: A.randInt(c.PICKUP_MIN, c.PICKUP_MAX), bob: 0 });
  };

  A.flash = function (text, secs) {
    A.G.msg = text;
    A.G.msgTimer = secs || 3;
  };

  A.showBanner = function (text, secs) {
    A.G.banner = text;
    A.G.bannerTimer = secs || 3.5;
  };

  // ---- save / load -------------------------------------------------------
  A.saveGame = function () {
    var G = A.G;
    if (!G) { return false; }
    try {
      var data = {
        v: 7, cash: G.player.cash, hp: G.player.hp,
        x: G.player.x, y: G.player.y,
        weapons: G.player.weapons, ammo: G.player.ammo,
        missionIdx: G.missionIdx, wanted: G.wanted,
        time: G.time, dayCount: G.dayCount,
        stats: G.stats
      };
      window.localStorage.setItem(A.CFG.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };

  A.loadSave = function () {
    try {
      var raw = window.localStorage.getItem(A.CFG.SAVE_KEY);
      if (!raw) { return null; }
      var d = JSON.parse(raw);
      if (!d || d.v !== 7) { return null; }
      return d;
    } catch (e) { return null; }
  };

  A.hasSave = function () { return !!A.loadSave(); };

  A.applySave = function (d) {
    var G = A.G;
    G.player.cash = d.cash;
    G.player.hp = d.hp;
    G.player.x = d.x;
    G.player.y = d.y;
    G.player.weapons = d.weapons;
    G.player.ammo = d.ammo;
    G.player.weapon = d.weapons.shotgun && d.ammo.shotgun > 0 ? G.player.weapon : 'pistol';
    G.missionIdx = d.missionIdx;
    G.wanted = d.wanted;
    G.time = d.time;
    G.dayCount = d.dayCount;
    G.stats = d.stats;
    A.startMission(d.missionIdx);
  };
})();
