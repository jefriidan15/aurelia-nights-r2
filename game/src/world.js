// Aurelia Nights — world.js
// The static map of Port Aurelia. Buildings are packed into the blocks
// between the avenues and streets, containers crowd the Docks, lamps sit
// at the crossings — and every moving thing asks the helpers at the
// bottom whether a point is road, water, blocked or free. The map is
// rebuilt from the seed on every new game, so it is the same city
// every run of the same seed.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var ROOF_TONES = ['#5a5f6e', '#4f5462', '#666b7a', '#565b68', '#6b6257', '#5d6a72'];
  var CRATE_TONES = ['#b3543f', '#3f7ab3', '#7a8a3f', '#a3863f', '#6b4a8a'];

  A.buildWorld = function (seed) {
    A.seedRandom(seed);
    var W = { buildings: [], containers: [], lamps: [] };

    // A block is the rectangle between two neighbouring road lines.
    // Buildings sit inside it, inset by the road half-width plus a margin,
    // so no wall ever touches a road.
    var xs = [0].concat(A.AVENUES, [A.CFG.WORLD_W]);
    var ys = [0].concat(A.STREETS.slice(0, 4), [A.CFG.HARBOUR_Y]);
    for (var bi = 0; bi < xs.length - 1; bi++) {
      for (var bj = 0; bj < ys.length - 1; bj++) {
        var x0 = xs[bi] + A.CFG.ROAD_HALF + 14;
        var x1 = xs[bi + 1] - A.CFG.ROAD_HALF - 14;
        var y0 = ys[bj] + A.CFG.ROAD_HALF + 14;
        var y1 = ys[bj + 1] - A.CFG.ROAD_HALF - 14;
        if (x1 - x0 < 90 || y1 - y0 < 90) { continue; }
        var count = A.randInt(1, 2);
        for (var k = 0; k < count; k++) {
          var w = A.randRange(90, Math.min(220, x1 - x0));
          var h = A.randRange(80, Math.min(190, y1 - y0));
          var x = A.randRange(x0, x1 - w);
          var y = A.randRange(y0, y1 - h);
          W.buildings.push({
            x: x, y: y, w: w, h: h,
            color: A.pick(ROOF_TONES), roof: A.chance(0.5),
            district: A.districtAt(x + w / 2, y + h / 2)
          });
        }
      }
    }

    // Crates / shipping containers around the Docks and the pier approach.
    for (var c = 0; c < 26; c++) {
      W.containers.push({
        x: A.randRange(2500, 3450), y: A.randRange(1000, 1650),
        w: A.randRange(70, 120), h: 34, color: A.pick(CRATE_TONES)
      });
    }

    // One lamp at each avenue/street crossing, offset to the corner.
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
    return y >= A.CFG.HARBOUR_Y ? 'Harbour' : 'Port Aurelia';
  };

  A.onRoad = function (x, y) {
    var i;
    for (i = 0; i < A.AVENUES.length; i++) {
      if (Math.abs(x - A.AVENUES[i]) <= A.CFG.ROAD_HALF) { return true; }
    }
    for (i = 0; i < A.STREETS.length; i++) {
      if (Math.abs(y - A.STREETS[i]) <= A.CFG.ROAD_HALF) { return true; }
    }
    return false;
  };

  A.inWater = function (x, y) {
    if (y < A.CFG.HARBOUR_Y) { return false; }
    var p = A.PIER;
    return !(x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h);
  };

  function rectHit(list, x, y, pad) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) {
        return true;
      }
    }
    return false;
  }

  A.hitsBuilding = function (x, y, pad) {
    var W = A.G && A.G.world;
    if (!W) { return false; }
    pad = pad || 0;
    return rectHit(W.buildings, x, y, pad) || rectHit(W.containers, x, y, pad);
  };

  // Can a body of `pad` radius stand or drive at (x, y)?
  A.walkable = function (x, y, pad) {
    if (x < 20 || y < 20) { return false; }
    if (x > A.CFG.WORLD_W - 20 || y > A.CFG.WORLD_H - 20) { return false; }
    if (A.inWater(x, y)) { return false; }
    return !A.hitsBuilding(x, y, pad);
  };

  // A random road point, optionally restricted to one district name.
  // Falls back to a fixed spot near the start if nothing fits in 60 tries.
  A.randomRoadPoint = function (districtName) {
    var streets = A.STREETS.filter(function (s) { return s < A.CFG.HARBOUR_Y; });
    for (var tries = 0; tries < 60; tries++) {
      var x, y;
      if (A.chance(0.5)) {
        x = A.pick(A.AVENUES) + A.randRange(-25, 25);
        y = A.randRange(80, A.CFG.HARBOUR_Y - 80);
      } else {
        x = A.randRange(80, A.CFG.WORLD_W - 80);
        y = A.pick(streets) + A.randRange(-25, 25);
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
