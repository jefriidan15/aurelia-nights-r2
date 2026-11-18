// Aurelia Nights — city.js
// Builds the harbour city: road grid, building blocks, pier, water,
// and the collision helpers everything else uses.
(function () {
  var AN = window.AN;

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  AN.buildCity = function () {
    var rng = AN.makeRng(99173);
    var city = {
      buildings: [],
      plazas: [],
      harbour: { x: 0, y: 2420, w: AN.WORLD_W, h: AN.WORLD_H - 2420 },
      pier: { x: 3220, y: 2100, w: 260, h: 330 },
      roadX: AN.ROAD_X.slice(),
      roadY: AN.ROAD_Y.slice()
    };

    // Keep-out zones around key places so markers stay reachable.
    var keepOut = [];
    Object.keys(AN.PLACES).forEach(function (k) {
      var p = AN.PLACES[k];
      keepOut.push({ x: p.x - 130, y: p.y - 130, w: 260, h: 260 });
    });
    // Pier approach and airfield strip stay clear.
    keepOut.push({ x: 3180, y: 2050, w: 340, h: 420 });
    keepOut.push({ x: 3050, y: 150, w: 550, h: 350 });

    var xs = [0].concat(AN.ROAD_X, [AN.WORLD_W]);
    var ys = [0].concat(AN.ROAD_Y, [2420]);
    var palette = AN.BUILDING_COLORS;

    for (var bi = 0; bi < xs.length - 1; bi++) {
      for (var bj = 0; bj < ys.length - 1; bj++) {
        var bx0 = xs[bi] + AN.ROAD_W / 2 + 14;
        var by0 = ys[bj] + AN.ROAD_W / 2 + 14;
        var bx1 = xs[bi + 1] - AN.ROAD_W / 2 - 14;
        var by1 = ys[bj + 1] - AN.ROAD_W / 2 - 14;
        if (bx1 - bx0 < 90 || by1 - by0 < 90) continue;
        var roll = rng();
        if (roll < 0.16) {
          city.plazas.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 });
          continue;
        }
        var count = 1 + Math.floor(rng() * 3);
        for (var n = 0; n < count; n++) {
          var w = 90 + rng() * 130;
          var h = 90 + rng() * 130;
          var x = bx0 + rng() * Math.max(1, (bx1 - bx0) - w);
          var y = by0 + rng() * Math.max(1, (by1 - by0) - h);
          var b = { x: x, y: y, w: w, h: h, color: palette[Math.floor(rng() * palette.length)], roof: rng() };
          var blocked = false;
          for (var k = 0; k < keepOut.length; k++) {
            if (rectsOverlap(b, keepOut[k])) { blocked = true; break; }
          }
          if (!blocked) city.buildings.push(b);
        }
      }
    }
    return city;
  };

  // True when the point sits on a road ribbon.
  AN.onRoad = function (x, y) {
    var hw = AN.ROAD_W / 2;
    for (var i = 0; i < AN.ROAD_X.length; i++) {
      if (Math.abs(x - AN.ROAD_X[i]) < hw && y < 2420) return true;
    }
    for (var j = 0; j < AN.ROAD_Y.length; j++) {
      if (Math.abs(y - AN.ROAD_Y[j]) < hw) return true;
    }
    return false;
  };

  // Nearest road centre point (used by traffic to snap back).
  AN.nearestRoadPoint = function (x, y) {
    var best = null, bestD = 1e9;
    var i, d;
    for (i = 0; i < AN.ROAD_X.length; i++) {
      d = Math.abs(x - AN.ROAD_X[i]);
      if (d < bestD) { bestD = d; best = { x: AN.ROAD_X[i], y: y }; }
    }
    for (i = 0; i < AN.ROAD_Y.length; i++) {
      d = Math.abs(y - AN.ROAD_Y[i]);
      if (d < bestD) { bestD = d; best = { x: x, y: AN.ROAD_Y[i] }; }
    }
    return best;
  };

  // Circle vs building rects: push the circle out, report hit.
  AN.collideCity = function (city, x, y, r) {
    var hit = false;
    for (var i = 0; i < city.buildings.length; i++) {
      var b = city.buildings[i];
      var cx = AN.clamp(x, b.x, b.x + b.w);
      var cy = AN.clamp(y, b.y, b.y + b.h);
      var dx = x - cx, dy = y - cy;
      var d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.01) {
          var d = Math.sqrt(d2);
          x = cx + (dx / d) * r;
          y = cy + (dy / d) * r;
        } else {
          y = b.y - r;
        }
      }
    }
    return { x: x, y: y, hit: hit };
  };

  AN.inWater = function (city, x, y) {
    if (y >= city.harbour.y) {
      // Pier deck is walkable.
      if (x >= city.pier.x && x <= city.pier.x + city.pier.w && y <= city.pier.y + city.pier.h) return false;
      return true;
    }
    return false;
  };

  AN.districtAt = function (x, y) {
    for (var i = 0; i < AN.DISTRICTS.length; i++) {
      var d = AN.DISTRICTS[i];
      if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
    }
    return "Harbour";
  };
})();
