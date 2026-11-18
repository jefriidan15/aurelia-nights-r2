// Canvas rendering: the city, cars, people, effects, and the minimap.
// Day/night is a tint over the whole scene driven by the in-game clock.
import { clamp, lerp, dist, fmtClock, fmtMoney, hash2 } from './util.js';
import { WORLD_W, WORLD_H, AVENUES, STREETS, ROAD_HALF, WATER_Y, DISTRICTS, SHOPS, LANDMARKS } from './world.js';

export function dayNightTint(clock) {
  const h = (clock / 3600) % 24;
  // 0 = deep night, 1 = full day.
  let day = 0;
  if (h >= 6 && h < 9) day = (h - 6) / 3;
  else if (h >= 9 && h < 17) day = 1;
  else if (h >= 17 && h < 20) day = 1 - (h - 17) / 3;
  else day = 0;
  return { day, h };
}

export function render(G) {
  const ctx = G.ctx, view = G.view, cam = G.camera;
  const { day, h } = dayNightTint(G.clock);
  const night = 1 - day;
  // Sky-tinted ground.
  ctx.fillStyle = day > 0.5 ? '#3f6b3a' : '#1d3320';
  ctx.fillRect(0, 0, view.w, view.h);

  ctx.save();
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + view.w / 2 / cam.zoom, -cam.y + view.h / 2 / cam.zoom);

  drawGround(G, ctx, day);
  drawWater(G, ctx);
  drawRoads(G, ctx);
  drawBuildings(G, ctx, day);
  drawLandmarks(G, ctx);
  drawShops(G, ctx);
  drawMissionMarker(G, ctx);
  drawPeds(G, ctx);
  drawCars(G, ctx, day);
  drawGuards(G, ctx);
  drawPlayer(G, ctx);
  drawBullets(G, ctx);
  drawEffects(G, ctx);
  ctx.restore();

  // Night overlay + vignette.
  if (night > 0.05) {
    ctx.fillStyle = `rgba(8, 12, 42, ${night * 0.42})`;
    ctx.fillRect(0, 0, view.w, view.h);
  }
  const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.42, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, view.w, view.h);

  drawMinimap(G);
}

function drawGround(G, ctx, day) {
  ctx.fillStyle = day > 0.5 ? '#4a7a44' : '#243d24';
  ctx.fillRect(0, 0, WORLD_W, WATER_Y);
  // District labels on the grass.
  ctx.font = 'bold 44px Arial';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
  }
}

function drawWater(G, ctx) {
  const t = G.time;
  ctx.fillStyle = '#14486b';
  ctx.fillRect(0, WATER_Y, WORLD_W, WORLD_H - WATER_Y);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let x = 0; x < WORLD_W; x += 140) {
    ctx.beginPath();
    ctx.moveTo(x, WATER_Y + 40 + Math.sin(t * 1.2 + x * 0.01) * 6);
    ctx.lineTo(x + 70, WATER_Y + 40 + Math.sin(t * 1.2 + x * 0.01 + 1) * 6);
    ctx.stroke();
  }
  // Pier deck.
  ctx.fillStyle = '#6b5a44';
  ctx.fillRect(LANDMARKS.docks.x - 350, LANDMARKS.docks.y - 90, 700, 110);
  ctx.fillStyle = '#57493a';
  for (let x = LANDMARKS.docks.x - 350; x < LANDMARKS.docks.x + 350; x += 46) ctx.fillRect(x, LANDMARKS.docks.y - 90, 3, 110);
}

function drawRoads(G, ctx) {
  ctx.fillStyle = '#33363d';
  for (const a of AVENUES) ctx.fillRect(a - ROAD_HALF, 0, ROAD_HALF * 2, WATER_Y);
  for (const s of STREETS) ctx.fillRect(0, s - ROAD_HALF, WORLD_W, ROAD_HALF * 2);
  // Centre dashes.
  ctx.fillStyle = '#e8c93a';
  for (const a of AVENUES) {
    for (let y = 0; y < WATER_Y; y += 64) ctx.fillRect(a - 2, y, 4, 30);
  }
  for (const s of STREETS) {
    for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x, s - 2, 30, 4);
  }
  // Sidewalk edges.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  for (const a of AVENUES) {
    ctx.beginPath(); ctx.moveTo(a - ROAD_HALF, 0); ctx.lineTo(a - ROAD_HALF, WATER_Y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a + ROAD_HALF, 0); ctx.lineTo(a + ROAD_HALF, WATER_Y); ctx.stroke();
  }
}

function drawBuildings(G, ctx, day) {
  for (const b of G.buildings) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Roof inset + fake height shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
    // Windows.
    const cols = Math.max(1, Math.floor(b.w / 34));
    const rows = Math.max(1, Math.floor(b.h / 34));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = day < 0.5 ? hash2(i * 7 + b.x, j * 13 + b.y) > 0.45 : hash2(i, j + b.x) > 0.82;
        ctx.fillStyle = lit ? '#ffe9a0' : 'rgba(20,30,60,0.55)';
        ctx.fillRect(b.x + 14 + i * 34, b.y + 14 + j * 34, 16, 14);
      }
    }
    if (b.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5);
    }
  }
}

function drawLandmarks(G, ctx) {
  const bank = LANDMARKS.bank;
  // Bank columns + sign.
  ctx.fillStyle = '#e8d9a0';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('AURELIA NATIONAL BANK', bank.x + bank.w / 2, bank.y - 10);
  // Vault door mat in front of the bank.
  const v = LANDMARKS.vault;
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(v.x - 6, v.y - 6, v.w + 12, v.h + 12);
  ctx.fillStyle = '#c9a227';
  ctx.fillRect(v.x, v.y, v.w, v.h);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('VAULT', v.x + v.w / 2, v.y + v.h / 2 + 6);
  // Chop shop.
  const cs = LANDMARKS.chopShop;
  ctx.fillStyle = '#ff5b8f';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('BIG SAL\'S CHOP SHOP', cs.x + cs.w / 2, cs.y - 8);
  // Extraction helipad.
  const ex = LANDMARKS.extraction;
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(ex.x + 60, ex.y + 60, 52, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(ex.x + 60, ex.y + 60, 44, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('H', ex.x + 60, ex.y + 72);
}

function drawShops(G, ctx) {
  for (const s of SHOPS) {
    const colors = { spray: '#ff5b8f', gun: '#c9a227', diner: '#3bd2a0', hospital: '#e8e8e8', safehouse: '#8a3bd2' };
    ctx.fillStyle = colors[s.kind] || '#fff';
    ctx.beginPath(); ctx.arc(s.x, s.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText({ spray: 'S', gun: 'G', diner: 'D', hospital: '+', safehouse: 'H' }[s.kind], s.x, s.y + 5);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(s.name.split(' — ')[0], s.x, s.y - 26);
  }
}

function drawMissionMarker(G, ctx) {
  const M = G.mission;
  if (!M.active || !M.marker) return;
  const m = M.marker;
  const pulse = 1 + Math.sin(G.time * 5) * 0.15;
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,62,0.25)';
  ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.moveTo(0, -52); ctx.lineTo(12, -28); ctx.lineTo(-12, -28); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
  ctx.fillText(m.label, m.x, m.y - 64);
  // Off-screen direction arrow at the screen edge.
  const p = G.player;
  const cam = G.camera, view = G.view;
  const sx = (m.x - cam.x) * cam.zoom + view.w / 2;
  const sy = (m.y - cam.y) * cam.zoom + view.h / 2;
  if (sx < 0 || sx > view.w || sy < 0 || sy > view.h) {
    const cx = clamp(sx, 40, view.w - 40), cy = clamp(sy, 40, view.h - 40);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(sy - view.h / 2, sx - view.w / 2));
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(Math.round(dist(p.x, p.y, m.x, m.y)) + 'm', cx, cy + 30);
  }
}

function drawPeds(G, ctx) {
  for (const ped of G.peds) {
    if (ped.dead) continue;
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(0, -2, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawCarShape(ctx, car, headlights) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(2, 4, car.len / 2, car.wid / 2 + 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -car.len / 2, -car.wid / 2, car.len, car.wid, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,50,0.85)';
  roundRect(ctx, -8, -car.wid / 2 + 3, 18, car.wid - 6, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(car.len / 2 - 4, -car.wid / 2 + 2, 3, 4);
  ctx.fillRect(car.len / 2 - 4, car.wid / 2 - 6, 3, 4);
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(-car.len / 2 + 1, -car.wid / 2 + 2, 3, 4);
  ctx.fillRect(-car.len / 2 + 1, car.wid / 2 - 6, 3, 4);
  if (car.isCop) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 4);
    const blink = Math.floor(G_time() * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff2b2b' : '#2b6bff';
    ctx.beginPath(); ctx.arc(-2, -car.wid / 2 - 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#2b6bff' : '#ff2b2b';
    ctx.beginPath(); ctx.arc(8, -car.wid / 2 - 2, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (headlights) {
    const g = ctx.createRadialGradient(car.len / 2, 0, 4, car.len / 2, 0, 90);
    g.addColorStop(0, 'rgba(255,240,180,0.5)');
    g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(car.len / 2, -8); ctx.lineTo(car.len / 2 + 90, -26); ctx.lineTo(car.len / 2 + 90, 26); ctx.lineTo(car.len / 2, 8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
let _t = 0;
function G_time() { return _t; }

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCars(G, ctx, day) {
  _t = G.time;
  const night = day < 0.5;
  for (const car of G.cars) {
    if (car.dead) {
      // Wreck: dark, tilted, smoking.
      ctx.save();
      ctx.translate(car.x, car.y); ctx.rotate(car.angle + 0.12);
      ctx.fillStyle = '#1a1a1a';
      roundRect(ctx, -23, -11, 46, 22, 7); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.1) G.particles.push({ x: car.x, y: car.y - 8, vx: 0, vy: -30, life: 0.7, max: 0.7, color: '#888', size: 5 });
      continue;
    }
    drawCarShape(ctx, car, night);
  }
}

function drawGuards(G, ctx) {
  for (const g of G.guards) {
    if (g.dead) continue;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a1f1f';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
    // Gun barrel toward the player.
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(g.angle) * 20, Math.sin(g.angle) * 20); ctx.stroke();
    // HP bar.
    ctx.fillStyle = '#000';
    ctx.fillRect(-14, -22, 28, 5);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(-14, -22, 28 * (g.hp / g.maxHp), 5);
    ctx.restore();
  }
}

function drawPlayer(G, ctx) {
  const p = G.player;
  if (p.onFoot) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 9, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Body: Rosa's jacket, teal.
    ctx.fillStyle = '#0f7a6a';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath(); ctx.arc(0, -2, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(0, -4, 6.5, Math.PI, Math.PI * 2); ctx.fill();
    // Aim line + gun.
    if (p.hasGun) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(p.aimAngle) * 30, Math.sin(p.aimAngle) * 30); ctx.stroke();
    }
    ctx.restore();
    // Muzzle flash.
    if (G.muzzle && G.muzzle.t > 0) {
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath(); ctx.arc(G.muzzle.x, G.muzzle.y, 12, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Player marker ring so the eye always finds them.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.onFoot ? 18 : 32, 0, Math.PI * 2); ctx.stroke();
}

function drawBullets(G, ctx) {
  ctx.fillStyle = '#ffe9a0';
  for (const b of G.bullets) {
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEffects(G, ctx) {
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawMinimap(G) {
  const mm = G.minimapCtx;
  if (!mm) return;
  const mw = 220, mh = 160;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  mm.fillStyle = '#10131f';
  mm.fillRect(0, 0, mw, mh);
  mm.fillStyle = '#2c4a2a';
  mm.fillRect(0, 0, mw, WATER_Y * sy);
  mm.fillStyle = '#14486b';
  mm.fillRect(0, WATER_Y * sy, mw, mh - WATER_Y * sy);
  mm.fillStyle = '#555a63';
  for (const a of AVENUES) mm.fillRect(a * sx - 1, 0, 2, WATER_Y * sy);
  for (const s of STREETS) mm.fillRect(0, s * sy - 1, mw, 2);
  // Shops.
  for (const s of SHOPS) {
    mm.fillStyle = '#ffd23e';
    mm.fillRect(s.x * sx - 2, s.y * sy - 2, 4, 4);
  }
  // Mission marker.
  if (G.mission.active && G.mission.marker) {
    mm.fillStyle = '#ff5b8f';
    mm.beginPath(); mm.arc(G.mission.marker.x * sx, G.mission.marker.y * sy, 5, 0, Math.PI * 2); mm.fill();
  }
  // Cops.
  mm.fillStyle = '#3b7dd2';
  for (const c of G.cops) mm.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4);
  // Player.
  const p = G.player;
  mm.fillStyle = '#fff';
  mm.beginPath(); mm.arc(p.x * sx, p.y * sy, 4, 0, Math.PI * 2); mm.fill();
  mm.strokeStyle = '#0f7a6a'; mm.lineWidth = 2; mm.stroke();
  // Viewport box.
  mm.strokeStyle = 'rgba(255,255,255,0.5)'; mm.lineWidth = 1;
  const cam = G.camera, view = G.view;
  mm.strokeRect((cam.x - view.w / 2 / cam.zoom) * sx, (cam.y - view.h / 2 / cam.zoom) * sy, (view.w / cam.zoom) * sx, (view.h / cam.zoom) * sy);
}
