// Aurelia Nights — render.js
// Everything on the canvas: the city, the cars, the people, the HUD, the
// minimap, and every screen (title, how-to, job board, shop, pause, end).
// Buttons drawn here are registered in A.buttons for the loop to click.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.buttons = [];

  function text(ctx, str, x, y, size, color, align, bold) {
    ctx.font = (bold ? 'bold ' : '') + size + 'px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function panel(ctx, x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill || 'rgba(8,10,16,0.82)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke || 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  A.uiButton = function (ctx, x, y, w, h, label, action, enabled) {
    var on = enabled !== false;
    ctx.fillStyle = on ? '#c9a227' : '#3a3f4a';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f5d76e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    text(ctx, label, x + w / 2, y + h / 2, 16, on ? '#14100a' : '#9aa3b2', 'center', true);
    if (on) { A.buttons.push({ x: x, y: y, w: w, h: h, action: action }); }
  };

  A.render = function (ctx) {
    var G = A.G;
    A.buttons = [];
    ctx.clearRect(0, 0, 1280, 800);
    if (G.mode === 'title' || G.mode === 'howto') {
      A.drawTitle(ctx);
      return;
    }
    A.drawWorld(ctx);
    A.drawEntities(ctx);
    A.drawNight(ctx);
    A.drawHUD(ctx);
    A.drawMinimap(ctx);
    if (G.mode === 'jobboard') { A.drawJobs(ctx); }
    else if (G.mode === 'shop') { A.drawShop(ctx); }
    else if (G.mode === 'paused') { A.drawPaused(ctx); }
    else if (G.mode === 'busted' || G.mode === 'wasted') { A.drawOver(ctx); }
    else if (G.mode === 'win') { A.drawWin(ctx); }
  };

  // ---- world -------------------------------------------------------------
  A.drawWorld = function (ctx) {
    var G = A.G;
    var cam = G.cam;
    ctx.save();
    ctx.translate(-cam.x + 640, -cam.y + 400);

    // Districts.
    for (var i = 0; i < A.DISTRICTS.length; i++) {
      var d = A.DISTRICTS[i];
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      text(ctx, d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2, 34, 'rgba(255,255,255,0.10)', 'center', true);
    }

    // Harbour water.
    ctx.fillStyle = '#16324a';
    ctx.fillRect(0, A.CFG.HARBOUR_Y, A.CFG.WORLD_W, A.CFG.WORLD_H - A.CFG.HARBOUR_Y);
    ctx.strokeStyle = 'rgba(120,190,255,0.25)';
    ctx.lineWidth = 2;
    for (var w = 0; w < 40; w++) {
      var wx = ((w * 173) % 3500) + 40;
      var wy = A.CFG.HARBOUR_Y + 60 + ((w * 97) % 800);
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + 46, wy);
      ctx.stroke();
    }

    // Pier.
    var pier = A.PIER;
    ctx.fillStyle = '#6b5a44';
    ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
    ctx.fillStyle = '#7d6b52';
    for (var p = 0; p < 8; p++) { ctx.fillRect(pier.x, pier.y + 60 + p * 60, pier.w, 4); }
    text(ctx, 'PIER 9', pier.x + pier.w / 2, pier.y + pier.h - 24, 20, '#d8c9a3', 'center', true);

    // Roads.
    ctx.fillStyle = '#23262e';
    A.AVENUES.forEach(function (x) { ctx.fillRect(x - A.CFG.ROAD_HALF, 0, A.CFG.ROAD_HALF * 2, A.CFG.HARBOUR_Y); });
    A.STREETS.forEach(function (y) {
      if (y < A.CFG.HARBOUR_Y) { ctx.fillRect(0, y - A.CFG.ROAD_HALF, A.CFG.WORLD_W, A.CFG.ROAD_HALF * 2); }
    });
    // Centre dashes.
    ctx.strokeStyle = 'rgba(240,200,60,0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    A.AVENUES.forEach(function (x) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, A.CFG.HARBOUR_Y); ctx.stroke();
    });
    A.STREETS.forEach(function (y) {
      if (y < A.CFG.HARBOUR_Y) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(A.CFG.WORLD_W, y); ctx.stroke(); }
    });
    ctx.setLineDash([]);

    // Buildings.
    var W = G.world;
    for (var b = 0; b < W.buildings.length; b++) {
      var bd = W.buildings[b];
      ctx.fillStyle = bd.color;
      ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(bd.x + 0.5, bd.y + 0.5, bd.w, bd.h);
      if (bd.roof) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(bd.x + 8, bd.y + 8, bd.w - 16, bd.h - 16);
      }
    }
    // Containers.
    for (var c = 0; c < W.containers.length; c++) {
      var cn = W.containers[c];
      ctx.fillStyle = cn.color;
      ctx.fillRect(cn.x, cn.y, cn.w, cn.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(cn.x + 0.5, cn.y + 0.5, cn.w, cn.h);
    }
    // Lamps.
    ctx.fillStyle = '#ffd76a';
    for (var l = 0; l < W.lamps.length; l++) {
      ctx.beginPath(); ctx.arc(W.lamps[l].x, W.lamps[l].y, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Shops.
    for (var s = 0; s < A.SHOPS.length; s++) {
      var sh = A.SHOPS[s];
      ctx.fillStyle = sh.color;
      ctx.beginPath(); ctx.arc(sh.x, sh.y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0b0d12';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, sh.name, sh.x, sh.y - 30, 13, '#ffffff', 'center', true);
    }

    // Street cash.
    for (var k = 0; k < G.pickups.length; k++) {
      var pk = G.pickups[k];
      var bob = Math.sin((G.elapsed * 2 + pk.bob)) * 2;
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0b3d1e';
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, '$', pk.x, pk.y + bob, 12, '#062b14', 'center', true);
    }

    // Mission marker.
    var step = A.currentStep();
    if (step && step.x !== undefined && G.mode === 'playing') {
      var pulse = 1 + Math.sin(G.elapsed * 5) * 0.15;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(step.x, step.y, (step.r || 60) * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,215,0,0.18)';
      ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(step.x, step.y, 7, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  };

  // ---- entities ----------------------------------------------------------
  function drawCarShape(ctx, car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-22, -11, 44, 24);
    ctx.fillStyle = car.color;
    ctx.fillRect(-21, -10, 42, 20);
    ctx.fillStyle = '#1b2a3a';
    ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(18, -8, 3, 5);
    ctx.fillRect(18, 3, 3, 5);
    ctx.restore();
  }

  A.drawEntities = function (ctx) {
    var G = A.G;
    ctx.save();
    ctx.translate(-G.cam.x + 640, -G.cam.y + 400);

    var all = G.cars.concat(G.parked);
    for (var i = 0; i < all.length; i++) { drawCarShape(ctx, all[i]); }

    // Pedestrians.
    for (var j = 0; j < G.peds.length; j++) {
      var pd = G.peds[j];
      if (pd.hp <= 0) { continue; }
      ctx.fillStyle = pd.color;
      ctx.beginPath(); ctx.arc(pd.x, pd.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (pd.panic > 0) {
        text(ctx, '!', pd.x, pd.y - 16, 16, '#ff4757', 'center', true);
      }
    }

    // Cops.
    for (var k = 0; k < G.cops.length; k++) {
      var cop = G.cops[k];
      ctx.fillStyle = '#1e5fd6';
      ctx.beginPath(); ctx.arc(cop.x, cop.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a2a6b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cop.x - 6, cop.y - 2, 12, 4);
      // HP bar.
      ctx.fillStyle = '#111';
      ctx.fillRect(cop.x - 12, cop.y - 20, 24, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(cop.x - 12, cop.y - 20, 24 * (cop.hp / A.CFG.COP_HP), 4);
    }

    // Hostiles.
    for (var h = 0; h < G.hostiles.length; h++) {
      var hs = G.hostiles[h];
      ctx.fillStyle = '#8e1616';
      ctx.beginPath(); ctx.arc(hs.x, hs.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.fillRect(hs.x - 13, hs.y - 22, 26, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(hs.x - 13, hs.y - 22, 26 * (hs.hp / 60), 4);
    }

    // Player.
    var p = G.player;
    if (!p.inCar) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#f5d76e';
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(8, -3, 14, 6);
      ctx.restore();
    }

    // Bullets.
    ctx.strokeStyle = '#ffe14d';
    ctx.lineWidth = 3;
    for (var b = 0; b < G.bullets.length; b++) {
      var bl = G.bullets[b];
      ctx.beginPath();
      ctx.moveTo(bl.x - Math.cos(bl.angle) * 12, bl.y - Math.sin(bl.angle) * 12);
      ctx.lineTo(bl.x, bl.y);
      ctx.stroke();
    }

    // Particles.
    for (var q = 0; q < G.parts.length; q++) {
      var pt = G.parts[q];
      ctx.globalAlpha = Math.max(0, pt.life * 1.6);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  // ---- night ---------------------------------------------------------------
  A.isNight = function () {
    var t = A.G.time;
    return t >= A.CFG.NIGHT_START || t < A.CFG.NIGHT_END;
  };

  A.drawNight = function (ctx) {
    var G = A.G;
    if (!A.isNight()) { return; }
    ctx.fillStyle = 'rgba(4,8,28,0.5)';
    ctx.fillRect(0, 0, 1280, 800);
    // Headlights when driving at night.
    var p = G.player;
    if (p.inCar) {
      var car = A.playerCar();
      if (car) {
        var sx = p.x - G.cam.x + 640;
        var sy = p.y - G.cam.y + 400;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(car.angle);
        // Gradient in car-local space so the cone points where the car points.
        var grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 340);
        grad.addColorStop(0, 'rgba(255,230,150,0.34)');
        grad.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(340, -110);
        ctx.lineTo(340, 110);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    // Lamp glow.
    ctx.fillStyle = 'rgba(255,215,106,0.10)';
    var W = G.world;
    for (var i = 0; i < W.lamps.length; i++) {
      var lx = W.lamps[i].x - G.cam.x + 640;
      var ly = W.lamps[i].y - G.cam.y + 400;
      if (lx > -40 && lx < 1320 && ly > -40 && ly < 840) {
        ctx.beginPath(); ctx.arc(lx, ly, 26, 0, Math.PI * 2); ctx.fill();
      }
    }
  };

  // ---- HUD -----------------------------------------------------------------
  A.drawHUD = function (ctx) {
    var G = A.G;
    var p = G.player;

    panel(ctx, 12, 12, 250, 108);
    text(ctx, '$' + p.cash, 26, 34, 24, '#2ecc71', 'left', true);
    text(ctx, 'HP', 26, 62, 13, '#ffffff', 'left', true);
    ctx.fillStyle = '#222';
    ctx.fillRect(58, 54, 180, 14);
    ctx.fillStyle = p.hp > 40 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(58, 54, 180 * (p.hp / p.maxHp), 14);
    var stars = '';
    for (var s = 0; s < 5; s++) { stars += s < G.wanted ? '\u2605' : '\u2606'; }
    text(ctx, stars, 26, 90, 20, '#ffd700', 'left', true);
    var ammoTxt = p.weapons[p.weapon] ? (p.weapon.toUpperCase() + '  ' + p.ammo[p.weapon] + ' rds') : 'UNARMED';
    text(ctx, ammoTxt, 26, 110, 13, '#f5d76e', 'left', true);

    // Objective.
    var obj = A.objectiveText();
    var w = ctx.measureText(obj).width;
    panel(ctx, 640 - 330, 12, 660, 30);
    text(ctx, obj, 640, 28, 14, '#ffe14d', 'center', true);

    // Clock + day.
    var hours = Math.floor(G.time * 24);
    var mins = Math.floor((G.time * 24 - hours) * 60);
    var clock = (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins;
    text(ctx, (A.isNight() ? 'NIGHT' : 'DAY') + ' ' + clock + '  ·  Day ' + G.dayCount, 1268, 28, 14, '#ffffff', 'right', true);

    // District.
    text(ctx, A.districtAt(p.x, p.y), 1268, 52, 14, '#9fb4d8', 'right', true);

    // Arrest meter.
    if (G.arrestMeter > 0) {
      panel(ctx, 490, 60, 300, 26);
      text(ctx, 'ARRESTED IN ' + Math.max(0, (A.CFG.COP_ARREST_TIME - G.arrestMeter)).toFixed(1) + 's — RUN', 640, 74, 15, '#ff4757', 'center', true);
    }

    // Banner.
    if (G.bannerTimer > 0) {
      ctx.globalAlpha = Math.min(1, G.bannerTimer);
      text(ctx, G.banner, 640, 120, 26, '#ffd700', 'center', true);
      ctx.globalAlpha = 1;
    }

    // Toast.
    if (G.msgTimer > 0) {
      ctx.globalAlpha = Math.min(1, G.msgTimer);
      text(ctx, G.msg, 640, 760, 16, '#ffffff', 'center', true);
      ctx.globalAlpha = 1;
    }

    // Context prompt.
    if (G.mode === 'playing' && !p.inCar) {
      var car = A.nearestCar(p.x, p.y, 58);
      var shop = car ? null : A.nearestShop(p.x, p.y, 78);
      if (car) { text(ctx, '[E] Steal car', 640, 724, 16, '#ffe14d', 'center', true); }
      else if (shop) { text(ctx, '[E] Enter ' + shop.name, 640, 724, 16, '#ffe14d', 'center', true); }
    }
    if (G.mode === 'playing' && p.inCar) {
      text(ctx, '[E] Exit car   [H] Horn   [Space] Handbrake', 640, 724, 14, '#c8d2e0', 'center');
    }
    if (G.mode === 'playing') {
      text(ctx, '[M] Jobs   [P] Pause   [F1] Mute', 640, 788, 12, '#7c8aa0', 'center');
    }
  };

  A.drawMinimap = function (ctx) {
    var G = A.G;
    var mx = 1090, my = 66, mw = 178, mh = 128;
    var sx = mw / A.CFG.WORLD_W, sy = mh / A.CFG.WORLD_H;
    panel(ctx, mx, my, mw, mh, 'rgba(8,10,16,0.85)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    ctx.fillStyle = '#16324a';
    ctx.fillRect(mx, my + A.CFG.HARBOUR_Y * sy, mw, mh - A.CFG.HARBOUR_Y * sy);
    for (var s = 0; s < A.SHOPS.length; s++) {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(mx + A.SHOPS[s].x * sx - 2, my + A.SHOPS[s].y * sy - 2, 4, 4);
    }
    var step = A.currentStep();
    if (step && step.x !== undefined) {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(mx + step.x * sx, my + step.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (var c = 0; c < G.cops.length; c++) {
      ctx.fillStyle = '#ff4757';
      ctx.fillRect(mx + G.cops[c].x * sx - 1, my + G.cops[c].y * sy - 1, 3, 3);
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + G.player.x * sx, my + G.player.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    text(ctx, 'PORT AURELIA', mx + mw / 2, my + mh + 12, 11, '#9fb4d8', 'center', true);
  };

  // ---- screens ---------------------------------------------------------------
  A.drawTitle = function (ctx) {
    var G = A.G;
    var grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, '#0d1526');
    grad.addColorStop(0.6, '#1a2340');
    grad.addColorStop(1, '#3a1f3d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 800);
    // Skyline.
    ctx.fillStyle = '#0a0f1e';
    for (var i = 0; i < 26; i++) {
      var bx = i * 52;
      var bh = 120 + ((i * 53) % 180);
      ctx.fillRect(bx, 560 - bh, 44, bh);
      ctx.fillStyle = 'rgba(255,215,106,0.5)';
      for (var wnd = 0; wnd < 6; wnd++) {
        if ((i * 7 + wnd * 3) % 4 === 0) { ctx.fillRect(bx + 6 + (wnd % 3) * 14, 560 - bh + 14 + Math.floor(wnd / 3) * 22, 6, 8); }
      }
      ctx.fillStyle = '#0a0f1e';
    }
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 560, 1280, 240);
    text(ctx, 'AURELIA NIGHTS', 640, 220, 64, '#ffd700', 'center', true);
    text(ctx, 'A top-down open-world crime story in Port Aurelia', 640, 280, 20, '#e8ecf4', 'center');
    text(ctx, 'Steal cars. Dodge the law. Run six jobs. Take the city.', 640, 312, 16, '#9fb4d8', 'center');
    A.uiButton(ctx, 490, 380, 300, 52, 'START NEW GAME', 'start');
    if (A.hasSave()) {
      A.uiButton(ctx, 490, 444, 300, 52, 'CONTINUE', 'continue');
    }
    A.uiButton(ctx, 490, 508, 300, 52, 'HOW TO PLAY', 'howto');
    text(ctx, 'make.fun bounty gta6-01  ·  best played loud', 640, 620, 13, '#7c8aa0', 'center');
    text(ctx, 'M — jobs   P — pause   F1 — mute', 640, 650, 13, '#7c8aa0', 'center');
  };

  A.drawHowTo = function (ctx) {
    panel(ctx, 240, 90, 800, 620, 'rgba(8,10,16,0.94)');
    text(ctx, 'HOW TO PLAY', 640, 130, 30, '#ffd700', 'center', true);
    var lines = [
      'WASD / Arrows — walk        Shift — sprint',
      'Mouse — aim        Click / Space — fire',
      'E — steal a car / enter a shop / exit a car',
      'Driving: W accelerate, S brake, A/D steer',
      'Space — handbrake        H — horn',
      'Q — switch weapon        M — job board',
      'P — pause        F1 — mute sound',
      '',
      'Steal cars, grab street cash and run jobs to earn.',
      'Crimes raise your wanted level — 5 stars is lockdown.',
      'Cops chase, ram and arrest. Spray shops wipe heat.',
      'Finish all six jobs to own Port Aurelia.'
    ];
    for (var i = 0; i < lines.length; i++) {
      text(ctx, lines[i], 640, 180 + i * 30, 16, '#e8ecf4', 'center');
    }
    A.uiButton(ctx, 540, 640, 200, 48, 'BACK', 'back-title');
  };

  A.drawJobs = function (ctx) {
    ctx.fillStyle = 'rgba(4,6,12,0.72)';
    ctx.fillRect(0, 0, 1280, 800);
    panel(ctx, 290, 80, 700, 600, 'rgba(8,10,16,0.96)');
    text(ctx, 'JOB BOARD', 640, 120, 30, '#ffd700', 'center', true);
    var jobs = A.jobList();
    for (var i = 0; i < jobs.length; i++) {
      var j = jobs[i];
      var y = 160 + i * 68;
      ctx.fillStyle = j.state === 'active' ? 'rgba(201,162,39,0.25)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(320, y, 640, 58);
      var tag = j.state === 'done' ? 'DONE' : (j.state === 'active' ? 'ACTIVE' : (j.state === 'next' ? 'NEXT' : 'LOCKED'));
      text(ctx, (i + 1) + '. ' + j.name, 336, y + 18, 17, '#ffffff', 'left', true);
      text(ctx, j.blurb, 336, y + 42, 13, '#9fb4d8', 'left');
      text(ctx, '$' + j.pay + '  ·  ' + tag, 944, y + 18, 15, j.state === 'done' ? '#2ecc71' : '#ffd700', 'right', true);
    }
    text(ctx, A.objectiveText(), 640, 600, 15, '#ffe14d', 'center');
    A.uiButton(ctx, 540, 626, 200, 40, 'CLOSE  [M]', 'close-jobs');
  };

  A.drawShop = function (ctx) {
    var G = A.G;
    var shop = G.shop;
    if (!shop) { return; }
    ctx.fillStyle = 'rgba(4,6,12,0.72)';
    ctx.fillRect(0, 0, 1280, 800);
    panel(ctx, 340, 150, 600, 460, 'rgba(8,10,16,0.96)');
    text(ctx, shop.name.toUpperCase(), 640, 190, 28, shop.color, 'center', true);
    text(ctx, shop.desc, 640, 224, 14, '#9fb4d8', 'center');
    text(ctx, 'Your cash: $' + G.player.cash, 640, 254, 16, '#2ecc71', 'center', true);
    var offers = A.shopOffers(shop);
    for (var i = 0; i < offers.length; i++) {
      var o = offers[i];
      var y = 290 + i * 76;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(370, y, 540, 62);
      text(ctx, o.label, 386, y + 20, 15, '#ffffff', 'left', true);
      if (o.note) { text(ctx, o.note, 386, y + 44, 12, '#9fb4d8', 'left'); }
      if (o.price > 0) {
        A.uiButton(ctx, 800, y + 12, 96, 38, '$' + o.price, 'buy:' + o.id, o.can);
      } else {
        A.uiButton(ctx, 800, y + 12, 96, 38, 'FREE', 'buy:' + o.id, o.can);
      }
    }
    A.uiButton(ctx, 540, 540, 200, 44, 'LEAVE  [E]', 'close-shop');
  };

  A.drawPaused = function (ctx) {
    ctx.fillStyle = 'rgba(4,6,12,0.7)';
    ctx.fillRect(0, 0, 1280, 800);
    panel(ctx, 440, 240, 400, 320, 'rgba(8,10,16,0.95)');
    text(ctx, 'PAUSED', 640, 290, 34, '#ffd700', 'center', true);
    A.uiButton(ctx, 490, 330, 300, 48, 'RESUME  [P]', 'resume');
    A.uiButton(ctx, 490, 390, 300, 48, 'SAVE GAME', 'save');
    A.uiButton(ctx, 490, 450, 300, 48, 'QUIT TO TITLE', 'quit');
  };

  A.drawOver = function (ctx) {
    var G = A.G;
    ctx.fillStyle = G.mode === 'busted' ? 'rgba(10,20,60,0.78)' : 'rgba(50,8,8,0.78)';
    ctx.fillRect(0, 0, 1280, 800);
    text(ctx, G.mode === 'busted' ? 'BUSTED' : 'WASTED', 640, 300, 64, G.mode === 'busted' ? '#5aa2ff' : '#ff4757', 'center', true);
    text(ctx, G.overText || '', 640, 370, 20, '#ffffff', 'center');
    text(ctx, 'Cash: $' + G.player.cash + '   ·   Jobs done: ' + G.missionIdx + '/6   ·   Kills: ' + G.stats.kills, 640, 410, 16, '#9fb4d8', 'center');
    A.uiButton(ctx, 490, 460, 300, 52, 'BACK TO TITLE', 'back-title');
    text(ctx, 'or press Enter', 640, 540, 13, '#7c8aa0', 'center');
  };

  A.drawWin = function (ctx) {
    var G = A.G;
    var grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, '#1a2a12');
    grad.addColorStop(1, '#0d1526');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 800);
    text(ctx, 'PORT AURELIA IS YOURS', 640, 260, 48, '#ffd700', 'center', true);
    text(ctx, 'All six jobs complete. The city never stood a chance.', 640, 320, 20, '#e8ecf4', 'center');
    text(ctx, 'Total earned: $' + G.stats.earned + '   ·   Cars stolen: ' + G.stats.stolen + '   ·   Kills: ' + G.stats.kills, 640, 370, 17, '#9fb4d8', 'center');
    A.uiButton(ctx, 490, 430, 300, 52, 'PLAY AGAIN', 'restart');
    text(ctx, 'or press Enter', 640, 510, 13, '#7c8aa0', 'center');
  };
})();
