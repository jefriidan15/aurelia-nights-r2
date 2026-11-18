// Aurelia Nights — particles.js
// Sparks, smoke puffs, muzzle flashes and cash glints.
(function () {
  var AN = window.AN;

  AN.makeParticles = function () {
    return { list: [] };
  };

  AN.spawnParticle = function (store, x, y, opts) {
    opts = opts || {};
    store.list.push({
      x: x, y: y,
      vx: opts.vx || 0, vy: opts.vy || 0,
      life: opts.life || 0.6, maxLife: opts.life || 0.6,
      size: opts.size || 4, color: opts.color || "#f39c12",
      grow: opts.grow || 0, fade: opts.fade !== false
    });
    if (store.list.length > 400) store.list.splice(0, store.list.length - 400);
  };

  AN.burst = function (store, x, y, n, color, speed, life) {
    for (var i = 0; i < n; i++) {
      var a = AN.rand(0, Math.PI * 2);
      var s = AN.rand(speed * 0.3, speed);
      AN.spawnParticle(store, x, y, {
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: AN.rand(life * 0.5, life), size: AN.rand(2, 5), color: color
      });
    }
  };

  AN.smokePuff = function (store, x, y) {
    AN.spawnParticle(store, x + AN.rand(-8, 8), y + AN.rand(-8, 8), {
      vx: AN.rand(-12, 12), vy: AN.rand(-30, -12),
      life: AN.rand(0.8, 1.4), size: AN.rand(6, 12), color: "#555555", grow: 14
    });
  };

  AN.updateParticles = function (store, dt) {
    for (var i = store.list.length - 1; i >= 0; i--) {
      var p = store.list[i];
      p.life -= dt;
      if (p.life <= 0) { store.list.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.grow) p.size += p.grow * dt;
    }
  };
})();
