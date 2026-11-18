// Aurelia Nights — rng.js
// Seeded random helpers. The whole world build and every screenshot scene
// derive from one seed so a run can be reproduced exactly.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  var s0 = 1, s1 = 2, s2 = 3, s3 = 4;

  function rotl(x, k) { return (x << k) | (x >>> (32 - k)); }

  A.seedRandom = function (seed) {
    var n = (seed >>> 0) || 1;
    s0 = n; s1 = n ^ 0x9e3779b9; s2 = (n * 2654435761) >>> 0; s3 = (n ^ 0x85ebca6b) >>> 0;
    if (!s0 && !s1 && !s2 && !s3) { s0 = 1; }
    // Warm up so the first draws are not correlated with the seed.
    for (var i = 0; i < 16; i++) { A.rand(); }
  };

  // sfc32 — small, fast, good enough for world generation.
  A.rand = function () {
    var t = (s0 + s1 + s3) >>> 0;
    s3 = s2; s2 = s1; s1 = rotl(s0, 11); s0 = t;
    return (t >>> 0) / 4294967296;
  };

  A.randRange = function (lo, hi) { return lo + A.rand() * (hi - lo); };
  A.randInt = function (lo, hi) { return Math.floor(A.randRange(lo, hi + 1)); };
  A.pick = function (arr) { return arr[Math.floor(A.rand() * arr.length)]; };
  A.chance = function (p) { return A.rand() < p; };

  // Deterministic hash of a string, for per-entity seeds.
  A.hashStr = function (str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
})();
