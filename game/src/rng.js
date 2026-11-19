// Aurelia Nights — rng.js
// A tiny seeded generator (sfc32) so the world build and the screenshot
// scenes come out the same way for a given seed. Seeding once at world
// build time keeps every spawn deterministic; callers only ever use the
// small helpers below. sfc32 is chosen for speed and a long period,
// not for cryptography — nothing here needs a secure random.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  // Four 32-bit lanes; the generator rotates them each draw.
  var lane0 = 1, lane1 = 2, lane2 = 3, lane3 = 4;

  function rotLeft(x, k) { return (x << k) | (x >>> (32 - k)); }

  A.seedRandom = function (seed) {
    var n = (seed >>> 0) || 1;
    lane0 = n;
    lane1 = n ^ 0x9e3779b9;
    lane2 = Math.imul(n, 2654435761) >>> 0;
    lane3 = (n ^ 0x85ebca6b) >>> 0;
    if (!(lane0 || lane1 || lane2 || lane3)) { lane0 = 1; }
    // Discard the first draws: they still carry the seed's shape.
    for (var i = 0; i < 16; i++) { A.rand(); }
  };

  A.rand = function () {
    var t = (lane0 + lane1 + lane3) >>> 0;
    lane3 = lane2; lane2 = lane1; lane1 = rotLeft(lane0, 11); lane0 = t;
    return (t >>> 0) / 4294967296;
  };

  A.randRange = function (lo, hi) { return lo + A.rand() * (hi - lo); };

  A.randInt = function (lo, hi) {
    return Math.floor(lo + A.rand() * (hi - lo + 1));
  };

  A.pick = function (arr) { return arr[Math.floor(A.rand() * arr.length)]; };

  A.chance = function (p) { return A.rand() < p; };

  // FNV-1a over a string, for stable per-entity seeds.
  A.hashStr = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
})();
