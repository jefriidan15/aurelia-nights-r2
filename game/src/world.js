// Aurelia Nights — world.js
// Builds the static map of Port Aurelia: buildings packed into the blocks
// between avenues and streets, plus road helpers, spawn points and the
// collision test every moving thing uses.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var PALETTE = ['#5a5f6e', '#4f5462', '#666b7a', '#565b68', '#6b6257', '#5d6a72'];

  A.buildWorld = function (seed) {
    A.seedRandom(seed);
    var W = {
      buildings: [],
      containers: [],
      lamps: []
    };

    // Blocks are the gaps between road centrelines. Buildings live inside
    // them, inset so they never touch a road.
    var xs = [0].concat(A.AVENUES, [A.CFG.WORLD_W]);
    var ys = [0].concat(A.STREETS.slice(0, 4), [A.CFG.HARBOUR_Y]);
    for (var bi = 0; bi < xs.length - 1; bi++) {
      for (var bj = 0; bj < ys.length - 1; bj++) {
        var bx0 = xs[bi] + A.CFG.ROAD_HALF + 14;
        var bx1 = xs[bi + 1] - A.CFG.ROAD_HALF - 14;
        var by0 = ys[bj] + A.CFG.ROAD_HALF + 14;
        var by1 = ys[bj + 1] - A.CFG.ROAD_HALF - 14;
        if (bx1 - bx0 < 90 || by1 - by0 < 90) { continue; }
        var n = A.randInt(1, 2);
        for (var k = 0; k < n; k++) {
          var w = A.randRange(90, Math.min(220, bx1 - bx0));
          var h = A.randRange(80, Math.min(190, by1 - by0));
          var x = A.randRange(bx0, bx1 - w);
          var y = A.randRange(by0, by1 - h);
          W.buildings.push({
            x: x, y: y, w: w, h: h,
            color: A.pick(PALETTE),
            roof: A.chance(0.5),
            district: A.districtAt(x + w / 2, y + h / 2)
          });
        }
      }
    }

    // Shipping containers stacked around The Docks and the pier approach.
    for (var c = 0; c < 26; c++) {
      W.containers.push({
        x: A.randRange(2500, 3450),
        y: A.randRange(1000, 1650),
        w: A.randRange(70, 120),
        h: 34,
        color: A.pick(['#b3543f', '#3f7ab3', '#7a8a3f', '#a3863f', '#6b4a8a'])
      });
    }

    // Street lamps along every avenue / street crossing.
    A.AVENUES.forEach(function (x) {
      A.STREETS.forEach(function (y) {
        if (y < A.CFG.HARBOUR_Y) { W.lamps.push({ x: x + 52, y: y - 52 }); }
      });
    });
    return W;
  };

  A.districtAt = function (x, y) {
    for (var i = 0; i < A.DISTRICTS.length; i++) {
      var d = A.DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) { return d.name; }
    }
    if (y >= A.CFG.HARBOUR_Y) { return 'Harbour'; }
    return 'Port Aurelia';
  };

  A.onRoad = function (x, y) {
    for (var i = 0; i < A.AVENUES.length; i++) {
      if (Math.abs(x - A.AVENUES[i]) <= A.CFG.ROAD_HALF) { return true; }
    }
    for (var j = 0; j < A.STREETS.length; j++) {
      if (Math.abs(y - A.STREETS[j]) <= A.CFG.ROAD_HALF) { return true; }
    }
    return false;
  };

  A.inWater = function (x, y) {
    if (y < A.CFG.HARBOUR_Y) { return false; }
    var p = A.PIER;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) { return false; }
    return true;
  };

  A.hitsBuilding = function (x, y, pad) {
    pad = pad || 0;
    var W = A.G && A.G.world;
    if (!W) { return false; }
    for (var i = 0; i < W.buildings.length; i++) {
      var b = W.buildings[i];
      if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) { return true; }
    }
    for (var j = 0; j < W.containers.length; j++) {
      var c = W.containers[j];
      if (x > c.x - pad && x < c.x + c.w + pad && y > c.y - pad && y < c.y + c.h + pad) { return true; }
    }
    return false;
  };

  // True when a point is walkable / drivable for a body of `pad` radius.
  A.walkable = function (x, y, pad) {
    if (x < 20 || y < 20 || x > A.CFG.WORLD_W - 20 || y > A.CFG.WORLD_H - 20) { return false; }
    if (A.inWater(x, y)) { return false; }
    return !A.hitsBuilding(x, y, pad);
  };

  // A random point on a road, optionally inside one district.
  A.randomRoadPoint = function (districtName) {
    for (var tries = 0; tries < 60; tries++) {
      var x, y;
      if (A.chance(0.5)) {
        x = A.pick(A.AVENUES) + A.randRange(-25, 25);
        y = A.randRange(80, A.CFG.HARBOUR_Y - 80);
      } else {
        x = A.randRange(80, A.CFG.WORLD_W - 80);
        y = A.pick(A.STREETS.filter(function (s) { return s < A.CFG.HARBOUR_Y; })) + A.randRange(-25, 25);
      }
      if (districtName && A.districtAt(x, y) !== districtName) { continue; }
      if (A.walkable(x, y, 8)) { return { x: x, y: y }; }
    }
    return { x: 600, y: 450 };
  };

  A.dist = function (ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  };

  A.clamp = function (v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); };
})();
