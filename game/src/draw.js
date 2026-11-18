// Aurelia Nights — draw.js
// Canvas renderer: city, cars, people, cops, bullets, night lighting,
// headlights, HUD and the minimap.
(function () {
  var AN = window.AN;

  function worldToScreen(G, x, y) {
    return {
      x: (x - G.camera.x) * G.camera.zoom + G.view.w / 2,
      y: (y - G.camera.y) * G.camera.zoom + G.view.h / 2
    };
  }

  AN.drawGame = function (G) {
    var ctx = G.ctx;
    var W = G.view.w, H = G.view.h;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1b2a3a";
    ctx.fillRect(0, 0, W, H);
    var cam = G.camera;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    AN.drawWorld(G, ctx);
    AN.drawCash(G, ctx);
    AN.drawMarkers(G, ctx);
    AN.drawTraffic(G, ctx);
    AN.drawCops(G, ctx);
    AN.drawGuards(G, ctx);
    AN.drawWalkers(G, ctx);
    AN.drawPlayer(G, ctx);
    AN.drawBullets(G, ctx);
    AN.drawParticles(G, ctx);
    AN.drawFloaters(G, ctx);
    ctx.restore();
    if (AN.isNight(G)) AN.drawNight(G, ctx);
    if (G.mode === "playing" || G.mode === "jobboard" || G.mode === "paused") {
      AN.drawHud(G, ctx);
      AN.drawMinimap(G, ctx);
    }
  };

  AN.drawWorld = function (G, ctx) {
    var city = G.city;
    // District ground.
    AN.DISTRICTS.forEach(function (d) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.fillStyle = d.label;
      ctx.font = "bold 34px sans-serif";
      ctx.globalAlpha = 0.5;
      ctx.fillText(d.name.toUpperCase(), d.x + 24, d.y + 52);
      ctx.globalAlpha = 1;
    });
    // Harbour water.
    ctx.fillStyle = "#164e63";
    ctx.fillRect(city.harbour.x, city.harbour.y, city.harbour.w, city.harbour.h);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    for (var w = 0; w < 24; w++) {
      var wx = 120 + w * 150 + Math.sin(G.time * 0.7 + w) * 20;
      ctx.beginPath();
      ctx.moveTo(wx, 2470 + (w % 3) * 30);
      ctx.lineTo(wx + 60, 2470 + (w % 3) * 30);
      ctx.stroke();
    }
    // Pier deck.
    ctx.fillStyle = "#7a5c3e";
    ctx.fillRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
    ctx.strokeStyle = "#5d4630";
    ctx.lineWidth = 3;
    ctx.strokeRect(city.pier.x, city.pier.y, city.pier.w, city.pier.h);
    ctx.fillStyle = "#f5f6fa";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("PIER 9", city.pier.x + 84, city.pier.y + 30);
    // Roads.
    ctx.fillStyle = "#23262d";
    AN.ROAD_X.forEach(function (x) { ctx.fillRect(x - AN.ROAD_W / 2, 0, AN.ROAD_W, 2420); });
    AN.ROAD_Y.forEach(function (y) { ctx.fillRect(0, y - AN.ROAD_W / 2, AN.WORLD_W, AN.ROAD_W); });
    // Lane dashes.
    ctx.strokeStyle = "#f5f6fa";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    AN.ROAD_X.forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 2420); ctx.stroke();
    });
    AN.ROAD_Y.forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(AN.WORLD_W, y); ctx.stroke();
    });
    ctx.setLineDash([]);
    // Plazas.
    ctx.fillStyle = "#2f6b4f";
    city.plazas.forEach(function (pl) { ctx.fillRect(pl.x, pl.y, pl.w, pl.h); });
    // Buildings.
    city.buildings.forEach(function (b) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      var cols = Math.max(1, Math.floor(b.w / 42));
      var rows = Math.max(1, Math.floor(b.h / 42));
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          if ((i * 7 + j * 3 + Math.floor(b.roof * 10)) % 3 === 0) {
            ctx.fillStyle = AN.isNight(G) ? "#ffd166" : "rgba(0,0,0,0.35)";
            ctx.fillRect(b.x + 12 + i * 42, b.y + 12 + j * 42, 16, 14);
          }
        }
      }
    });
    // Shop fronts.
    AN.SHOP_LIST.forEach(function (s) {
      var pl = AN.PLACES[s.place];
      ctx.fillStyle = "#111318";
      ctx.fillRect(pl.x - 52, pl.y - 34, 104, 68);
      ctx.fillStyle = "#f5f6fa";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pl.name, pl.x, pl.y + 4);
      ctx.textAlign = "left";
    });
    // Bank + airfield markings.
    ctx.strokeStyle = "#f9ca24";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(AN.PLACES.bank.x, AN.PLACES.bank.y, 80, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(249,202,36,0.12)";
    ctx.fillRect(AN.PLACES.airfield.x - 90, AN.PLACES.airfield.y - 60, 180, 120);
    ctx.fillStyle = "#f5f6fa";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("AIRFIELD", AN.PLACES.airfield.x - 44, AN.PLACES.airfield.y + 6);
  };

  AN.drawCash = function (G, ctx) {
    G.cash.forEach(function (c) {
      if (c.taken) return;
      var bob = Math.sin(c.bob) * 3;
      ctx.fillStyle = "#2ed573";
      ctx.beginPath();
      ctx.arc(c.x, c.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("$", c.x, c.y + bob + 4);
      ctx.textAlign = "left";
    });
  };

  AN.drawMarkers = function (G, ctx) {
    var job = AN.currentJob(G);
    function ring(x, y, color, label) {
      var pulse = 1 + Math.sin(G.time * 4) * 0.12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 46 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, x, y - 56);
      ctx.textAlign = "left";
    }
    if (job && G.job.phase === "active") {
      if (job.id === 1) ring(AN.PLACES.chopShop.x, AN.PLACES.chopShop.y, "#f9ca24", "CHOP SHOP");
      if (job.id === 3) {
        ring(AN.PLACES.pier.x + 130, AN.PLACES.pier.y + 150, "#ff6b6b", "PIER 9");
        if (AN.guardsLeft(G) === 0) ring(AN.PLACES.crateSpot.x, AN.PLACES.crateSpot.y, "#2ed573", "CRATE");
      }
      if (job.id === 4) {
        if (!G.job.jobFlags.vaultHeld) ring(AN.PLACES.vault.x, AN.PLACES.vault.y, "#f9ca24", "VAULT");
        else ring(AN.PLACES.safehouse.x, AN.PLACES.safehouse.y, "#2ed573", "SAFEHOUSE");
      }
      if (job.id === 5) {
        G.checkpoints.forEach(function (cp, i) {
          if (i === G.job.checkpointIdx) ring(cp.x, cp.y, "#f9ca24", "CHECKPOINT " + (i + 1));
        });
      }
      if (job.id === 6 && G.job.jobFlags.lockdownDone) ring(AN.PLACES.airfield.x, AN.PLACES.airfield.y, "#2ed573", "AIRFIELD");
    }
    // Always mark the safehouse faintly.
    ctx.strokeStyle = "rgba(46,213,115,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(AN.PLACES.safehouse.x, AN.PLACES.safehouse.y, 40, 0, Math.PI * 2);
    ctx.stroke();
  };

  AN.drawCarShape = function (ctx, car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = car.wrecked ? "#2f3542" : car.color;
    ctx.fillRect(-22, -11, 44, 22);
    ctx.fillStyle = car.wrecked ? "#1e272e" : "rgba(255,255,255,0.25)";
    ctx.fillRect(-6, -9, 14, 18);
    ctx.fillStyle = "#111318";
    ctx.fillRect(-20, -13, 8, 4);
    ctx.fillRect(-20, 9, 8, 4);
    ctx.fillRect(12, -13, 8, 4);
    ctx.fillRect(12, 9, 8, 4);
    if (car.isCop) {
      ctx.fillStyle = "#f5f6fa";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PD", 0, 3);
      ctx.textAlign = "left";
    }
    ctx.restore();
    if (car.hp < 45 && !car.wrecked) {
      ctx.fillStyle = "rgba(80,80,80,0.6)";
      ctx.beginPath();
      ctx.arc(car.x - 10, car.y - 8, 8 + Math.sin(Date.now() / 90) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  AN.drawTraffic = function (G, ctx) {
    G.traffic.forEach(function (c) { AN.drawCarShape(ctx, c); });
  };

  AN.drawCops = function (G, ctx) {
    G.cops.forEach(function (cop) {
      AN.drawCarShape(ctx, cop.car);
      var flash = Math.floor(G.time * 4) % 2 === 0;
      ctx.fillStyle = flash ? "#ff4757" : "#3742fa";
      ctx.beginPath();
      ctx.arc(cop.car.x - Math.cos(cop.car.angle) * 14, cop.car.y - Math.sin(cop.car.angle) * 14, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  AN.drawGuards = function (G, ctx) {
    G.guards.forEach(function (g) {
      if (g.hp <= 0) return;
      ctx.fillStyle = "#8e44ad";
      ctx.beginPath();
      ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2c2c54";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * 22, g.y + Math.sin(g.angle) * 22);
      ctx.stroke();
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(g.x - 14, g.y - 24, 28 * Math.max(0, g.hp / 70), 4);
    });
  };

  AN.drawWalkers = function (G, ctx) {
    G.walkers.forEach(function (p) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5f6fa";
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  AN.drawPlayer = function (G, ctx) {
    var p = G.player;
    if (p.car) {
      AN.drawCarShape(ctx, p.car);
      if (AN.isNight(G)) {
        ctx.fillStyle = "#ffeaa7";
        ctx.beginPath();
        ctx.arc(p.car.x + Math.cos(p.car.angle) * 26, p.car.y + Math.sin(p.car.angle) * 26, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    // On foot: body + aim line.
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.aimAngle) * 34, p.y + Math.sin(p.aimAngle) * 34);
    ctx.stroke();
    ctx.fillStyle = "#e84118";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f5f6fa";
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.aimAngle) * 5, p.y + Math.sin(p.aimAngle) * 5, 4, 0, Math.PI * 2);
    ctx.fill();
    if (G.muzzle > 0) {
      ctx.fillStyle = "#f9ca24";
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(p.aimAngle) * 26, p.y + Math.sin(p.aimAngle) * 26, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    if (p.hurtFlash > 0) {
      ctx.fillStyle = "rgba(255,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  AN.drawBullets = function (G, ctx) {
    ctx.fillStyle = "#f9ca24";
    G.bullets.forEach(function (b) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  AN.drawParticles = function (G, ctx) {
    G.particles.list.forEach(function (pt) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  };

  AN.drawFloaters = function (G, ctx) {
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    G.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.min(1, f.t);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  };

  AN.isNight = function (G) {
    return G.timeOfDay > 0.62 || G.timeOfDay < 0.08;
  };

  AN.drawNight = function (G, ctx) {
    var W = G.view.w, H = G.view.h;
    ctx.fillStyle = "rgba(8,12,38,0.42)";
    ctx.fillRect(0, 0, W, H);
    var p = G.player;
    var sp = worldToScreen(G, p.x, p.y);
    // Headlight cone when driving at night.
    if (p.car) {
      var grad = ctx.createRadialGradient(sp.x, sp.y, 10, sp.x, sp.y, 260);
      grad.addColorStop(0, "rgba(255,240,180,0.5)");
      grad.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 260, 0, Math.PI * 2);
      ctx.fill();
    } else {
      var glow = ctx.createRadialGradient(sp.x, sp.y, 10, sp.x, sp.y, 130);
      glow.addColorStop(0, "rgba(255,240,180,0.35)");
      glow.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 130, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  AN.drawHud = function (G, ctx) {
    var p = G.player;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(10, 10, 250, 108);
    ctx.fillStyle = "#2ed573";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("$" + p.money, 22, 38);
    ctx.fillStyle = "#f5f6fa";
    ctx.font = "16px sans-serif";
    ctx.fillText("HP " + Math.ceil(p.health) + "/100", 22, 62);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(22, 70, 120 * (p.health / 100), 10);
    ctx.strokeStyle = "#f5f6fa";
    ctx.strokeRect(22, 70, 120, 10);
    var wname = AN.WEAPONS[p.weapon].name;
    var ammo = p.weapon === "pistol" ? p.pistolAmmo : p.shotgunAmmo;
    ctx.fillStyle = "#f5f6fa";
    ctx.fillText(wname + "  " + ammo + " rds" + (p.car ? "   |   CAR HP " + Math.ceil(p.car.hp) : ""), 22, 102);
    // Wanted stars.
    for (var i = 0; i < 5; i++) {
      ctx.fillStyle = i < G.wanted ? "#f9ca24" : "rgba(255,255,255,0.25)";
      var sx = G.view.w - 190 + i * 34;
      AN.star(ctx, sx, 34, 13);
    }
    ctx.fillStyle = "#f5f6fa";
    ctx.font = "14px sans-serif";
    ctx.fillText(AN.districtAt(p.x, p.y) + "  ·  " + (AN.isNight(G) ? "Night" : "Day"), G.view.w - 190, 62);
    // Objective + messages.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(10, G.view.h - 66, Math.min(760, G.view.w - 20), 56);
    ctx.fillStyle = "#f9ca24";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(AN.jobObjective(G), 22, G.view.h - 42);
    if (G.job.messageT > 0) {
      ctx.fillStyle = "#f5f6fa";
      ctx.font = "14px sans-serif";
      ctx.fillText(G.job.message, 22, G.view.h - 20);
    }
    // Nearby shop prompt.
    var shop = AN.nearestShop(G);
    if (shop) {
      ctx.fillStyle = "#2ed573";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText(shop.label + " — " + shop.action, 22, G.view.h - 84);
    } else if (!p.onFoot && AN.nearestCar(G)) {
      // nothing
    } else if (p.onFoot && AN.nearestCar(G)) {
      ctx.fillStyle = "#2ed573";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Press E to steal this car", 22, G.view.h - 84);
    } else if (!p.onFoot) {
      ctx.fillStyle = "#dfe4ea";
      ctx.font = "14px sans-serif";
      ctx.fillText("E exit car · Space handbrake · H horn", 22, G.view.h - 84);
    }
    // Gun shop panel.
    if (G.shopOpen === "gun") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(G.view.w / 2 - 220, G.view.h / 2 - 110, 440, 200);
      ctx.fillStyle = "#f9ca24";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("IRON & OAK — GUN SHOP", G.view.w / 2 - 200, G.view.h / 2 - 76);
      ctx.fillStyle = "#f5f6fa";
      ctx.font = "16px sans-serif";
      ctx.fillText("1 — Pistol +24 rounds ....... $150", G.view.w / 2 - 200, G.view.h / 2 - 40);
      ctx.fillText("2 — Shotgun +12 shells ...... $400", G.view.w / 2 - 200, G.view.h / 2 - 12);
      ctx.fillText("3 — Ammo restock ............ $25", G.view.w / 2 - 200, G.view.h / 2 + 16);
      ctx.fillText("Press 1 / 2 / 3 to buy · E to close", G.view.w / 2 - 200, G.view.h / 2 + 52);
    }
  };

  AN.star = function (ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 === 0 ? r : r * 0.45;
      var px = x + Math.cos(ang) * rad;
      var py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  AN.drawMinimap = function (G, ctx) {
    var mw = 190, mh = 138;
    var mx = G.view.w - mw - 12, my = G.view.h - mh - 12;
    var sx = mw / AN.WORLD_W, sy = mh / AN.WORLD_H;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = "#164e63";
    ctx.fillRect(mx, my + 2420 * sy, mw, mh - 2420 * sy);
    ctx.strokeStyle = "#57606f";
    ctx.lineWidth = 1;
    AN.ROAD_X.forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(mx + x * sx, my); ctx.lineTo(mx + x * sx, my + 2420 * sy); ctx.stroke();
    });
    AN.ROAD_Y.forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(mx, my + y * sy); ctx.lineTo(mx + mw, my + y * sy); ctx.stroke();
    });
    ctx.fillStyle = "#f9ca24";
    ctx.beginPath();
    ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4757";
    G.cops.forEach(function (cop) {
      ctx.beginPath();
      ctx.arc(mx + cop.car.x * sx, my + cop.car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    var job = AN.currentJob(G);
    if (job && G.job.phase === "active") {
      ctx.fillStyle = "#2ed573";
      var tx = 0, ty = 0;
      if (job.id === 1) { tx = AN.PLACES.chopShop.x; ty = AN.PLACES.chopShop.y; }
      else if (job.id === 3) { tx = AN.PLACES.pier.x; ty = AN.PLACES.pier.y; }
      else if (job.id === 4) { tx = G.job.jobFlags.vaultHeld ? AN.PLACES.safehouse.x : AN.PLACES.vault.x; ty = G.job.jobFlags.vaultHeld ? AN.PLACES.safehouse.y : AN.PLACES.vault.y; }
      else if (job.id === 6 && G.job.jobFlags.lockdownDone) { tx = AN.PLACES.airfield.x; ty = AN.PLACES.airfield.y; }
      if (tx) {
        ctx.beginPath();
        ctx.arc(mx + tx * sx, my + ty * sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
})();
