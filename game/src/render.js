// Rendering: the camera, the city, every entity, the day/night light and
// the effects. All drawing is plain Canvas 2D, no images.
import { WORLD_W, WORLD_H, BLOCK, ROAD_W, PLACES } from './world.js';
import { clamp, lerp } from './util.js';

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.cam = { x: 0, y: 0 };
    this.shake = 0;
  }

  // Night factor 0 (noon) .. 1 (midnight) from the hour of day.
  static nightFactor(hours) {
    const h = ((hours % 24) + 24) % 24;
    if (h >= 7 && h < 17) return 0;
    if (h >= 17 && h < 20) return (h - 17) / 3;
    if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
    return 1;
  }

  // Sky tint colour for the hour, as [r,g,b] of the overlay.
  static skyTint(hours) {
    const n = Renderer.nightFactor(hours);
    if (n <= 0) {
      const h = hours % 24;
      if (h >= 16 && h < 17) return [255, 150, 60, 0.18]; // golden hour
      return [0, 0, 0, 0];
    }
    return [8, 12, 40, 0.42 * n];
  }

  follow(x, y, dt) {
    const w = this.canvas.width, h = this.canvas.height;
    const tx = clamp(x - w / 2, 0, Math.max(0, WORLD_W - w));
    const ty = clamp(y - h / 2, 0, Math.max(0, WORLD_H - h));
    const k = 1 - Math.pow(0.001, dt);
    this.cam.x = lerp(this.cam.x, tx, k);
    this.cam.y = lerp(this.cam.y, ty, k);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2);
  }

  snapTo(x, y) {
    const w = this.canvas.width, h = this.canvas.height;
    this.cam.x = clamp(x - w / 2, 0, Math.max(0, WORLD_W - w));
    this.cam.y = clamp(y - h / 2, 0, Math.max(0, WORLD_H - h));
  }

  render(game, time) {
    const ctx = this.ctx;
    const { width: W, height: H } = this.canvas;
    const camX = this.cam.x + (this.shake > 0 ? (Math.random() - 0.5) * this.shake * 14 : 0);
    const camY = this.cam.y + (this.shake > 0 ? (Math.random() - 0.5) * this.shake * 14 : 0);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate(-camX, -camY);

    this._drawGround(ctx, camX, camY, W, H);
    this._drawWater(ctx);
    this._drawPlaces(ctx, game);
    this._drawBuildings(ctx, camX, camY, W, H);
    this._drawCrates(ctx);
    this._drawMarker(ctx, game, time);
    this._drawCars(ctx, game);
    this._drawPeds(ctx, game);
    this._drawThugs(ctx, game);
    this._drawPlayer(ctx, game);
    this._drawBullets(ctx, game);
    this._drawParticles(ctx, game);
    this._drawLamps(ctx, game, camX, camY, W, H);

    // Day / night overlay.
    const tint = Renderer.skyTint(game.timeOfDay);
    if (tint[3] > 0) {
      ctx.fillStyle = `rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`;
      ctx.fillRect(camX, camY, W, H);
    }
    // Headlight cone at night when driving.
    const night = Renderer.nightFactor(game.timeOfDay);
    if (night > 0.4 && game.player.inCar) {
      const p = game.player;
      const gx = ctx.createRadialGradient(p.x, p.y, 20, p.x + Math.cos(p.angle) * 160, p.y + Math.sin(p.angle) * 160, 260);
      gx.addColorStop(0, `rgba(255, 240, 180, ${0.20 * night})`);
      gx.addColorStop(1, 'rgba(255, 240, 180, 0)');
      ctx.fillStyle = gx;
      ctx.fillRect(camX, camY, W, H);
    }
    // Hurt flash.
    if (game.player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(200, 20, 20, ${game.player.hurtFlash * 0.5})`;
      ctx.fillRect(camX, camY, W, H);
    }
    ctx.restore();
  }

  _drawGround(ctx, camX, camY, W, H) {
    // Grass / dirt base.
    ctx.fillStyle = '#5d6b46';
    ctx.fillRect(camX, camY, W, H);
    // City ground: paved blocks.
    ctx.fillStyle = '#7d7a6e';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    // Roads: vertical and horizontal bands.
    ctx.fillStyle = '#2e3138';
    for (let gx = 0; gx <= 10; gx++) ctx.fillRect(gx * BLOCK, 0, ROAD_W, WORLD_H);
    for (let gy = 0; gy <= 7; gy++) ctx.fillRect(0, gy * BLOCK, WORLD_W, ROAD_W);
    // Lane dashes.
    ctx.fillStyle = '#c8b95a';
    for (let gx = 0; gx <= 10; gx++) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(gx * BLOCK + ROAD_W / 2 - 2, y + 14, 4, 30);
    }
    for (let gy = 0; gy <= 7; gy++) {
      for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x + 14, gy * BLOCK + ROAD_W / 2 - 2, 30, 4);
    }
    // Sidewalk edges.
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    for (let gx = 0; gx <= 10; gx++) {
      ctx.beginPath(); ctx.moveTo(gx * BLOCK + ROAD_W, 0); ctx.lineTo(gx * BLOCK + ROAD_W, WORLD_H); ctx.stroke();
    }
    for (let gy = 0; gy <= 7; gy++) {
      ctx.beginPath(); ctx.moveTo(0, gy * BLOCK + ROAD_W); ctx.lineTo(WORLD_W, gy * BLOCK + ROAD_W); ctx.stroke();
    }
  }

  _drawWater(ctx) {
    ctx.fillStyle = '#1d4e6b';
    ctx.fillRect(2500, 2450, WORLD_W - 2500, WORLD_H - 2450);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const y = 2480 + i * 22;
      for (let x = 2520; x < WORLD_W - 20; x += 40) {
        ctx.moveTo(x, y + Math.sin(x * 0.02 + i) * 3);
        ctx.lineTo(x + 22, y + Math.sin(x * 0.02 + i) * 3);
      }
      ctx.stroke();
    }
    // The pier.
    ctx.fillStyle = '#6a5232';
    ctx.fillRect(3360, 2300, 120, 160);
    ctx.fillStyle = '#8a6a42';
    for (let x = 3368; x < 3480; x += 16) ctx.fillRect(x, 2304, 8, 152);
  }

  _drawPlaces(ctx, game) {
    for (const key of Object.keys(PLACES)) {
      const pl = PLACES[key];
      if (pl.kind === 'start' || pl.kind === 'extract') continue;
      const colors = {
        spray: '#3fae6a', gun: '#c23b2e', diner: '#d8a13a', safe: '#2e6fc2',
        hospital: '#e8e8e8', bank: '#ffd75e', docks: '#8a6a42',
      };
      const c = colors[pl.kind] || '#888';
      // Shop pad + sign.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pl.name.toUpperCase(), pl.x, pl.y - pl.r - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '11px sans-serif';
      if (game.player && Math.hypot(game.player.x - pl.x, game.player.y - pl.y) < 220) {
        ctx.fillText(pl.blurb, pl.x, pl.y + pl.r + 16);
      }
    }
    // Bank vault door.
    const bank = PLACES.bank;
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(bank.x - 40, bank.y - 26, 80, 52);
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath(); ctx.arc(bank.x, bank.y, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a3f4a';
    ctx.beginPath(); ctx.arc(bank.x, bank.y, 9, 0, Math.PI * 2); ctx.fill();
  }

  _drawBuildings(ctx, camX, camY, W, H) {
    for (const b of this.world.buildings) {
      if (b.x > camX + W + 60 || b.x + b.w < camX - 60 || b.y > camY + H + 60 || b.y + b.h < camY - 60) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      // Roof detail.
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      if (b.roof === 0) ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);
      else if (b.roof === 1) { ctx.fillRect(b.x + b.w / 2 - 16, b.y + 12, 32, b.h - 24); }
      else { ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) / 4, 0, Math.PI * 2); ctx.fill(); }
      // Windows on the south face.
      ctx.fillStyle = 'rgba(255, 230, 140, 0.75)';
      const nWin = Math.floor(b.w / 34);
      for (let i = 0; i < nWin; i++) {
        ctx.fillRect(b.x + 12 + i * 34, b.y + b.h - 18, 14, 10);
      }
    }
    // Trees.
    for (const t of this.world.trees) {
      if (t.x < camX - 40 || t.x > camX + W + 40 || t.y < camY - 40 || t.y > camY + H + 40) continue;
      ctx.fillStyle = '#2e5d33';
      ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7a44';
      ctx.beginPath(); ctx.arc(t.x - 4, t.y - 4, 8, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawCrates(ctx) {
    for (const c of this.world.crates) {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
      ctx.stroke();
    }
  }

  _drawMarker(ctx, game, time) {
    const m = game.missions && !game.missions.done ? game.missions.marker() : null;
    if (!m) return;
    const pulse = 1 + Math.sin(time * 4) * 0.12;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 215, 94, 0.25)';
    ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2); ctx.fill();
    // Bouncing arrow above the marker.
    const bob = Math.sin(time * 4) * 6;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.moveTo(0, -58 + bob);
    ctx.lineTo(-12, -78 + bob);
    ctx.lineTo(12, -78 + bob);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Edge-of-screen arrow when the marker is off camera.
    const W = this.canvas.width, H = this.canvas.height;
    const sx = m.x - this.cam.x, sy = m.y - this.cam.y;
    if (sx < 0 || sx > W || sy < 0 || sy > H) {
      const cx = clamp(sx, 50, W - 50), cy = clamp(sy, 50, H - 50);
      const a = Math.atan2(sy - cy, sx - cx);
      ctx.save();
      ctx.translate(this.cam.x + cx, this.cam.y + cy);
      ctx.rotate(a);
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  _drawCarShape(ctx, x, y, angle, color, len, police) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-len / 2 + 3, -10 + 3, len, 22);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -11, len, 22, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.85)';
    ctx.beginPath();
    ctx.roundRect(-len / 2 + 8, -9, len * 0.32, 18, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(len / 2 - 14, -9, 8, 18, 3);
    ctx.fill();
    // Headlights.
    ctx.fillStyle = '#fff6c0';
    ctx.fillRect(len / 2 - 2, -9, 3, 4);
    ctx.fillRect(len / 2 - 2, 5, 3, 4);
    if (police) {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-4, -11, 10, 22);
      ctx.fillStyle = '#c23b2e';
      ctx.fillRect(-4, -11, 10, 5);
      ctx.fillStyle = '#2e6fc2';
      ctx.fillRect(-4, 6, 10, 5);
    }
    ctx.restore();
  }

  _drawCars(ctx, game) {
    for (const car of game.traffic.cars) {
      this._drawCarShape(ctx, car.x, car.y, car.angle, car.color, car.len, car.police);
      if (car.health < 60) {
        // Smoke from a wrecked car.
        ctx.fillStyle = `rgba(120,120,120,${0.5 * (1 - car.health / 60)})`;
        ctx.beginPath(); ctx.arc(car.x - Math.cos(car.angle) * 10, car.y - Math.sin(car.angle) * 10, 10, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (const c of game.police.cruisers) {
      this._drawCarShape(ctx, c.x, c.y, c.angle, c.color, c.len, true);
      // Flashing light bar.
      const on = Math.floor(game.time * 6) % 2 === 0;
      ctx.fillStyle = on ? '#ff2e2e' : '#2e6fff';
      ctx.beginPath(); ctx.arc(c.x, c.y - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = on ? '#2e6fff' : '#ff2e2e';
      ctx.beginPath(); ctx.arc(c.x, c.y + 4, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawPeds(ctx, game) {
    for (const p of game.traffic.peds) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.shirt;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  _drawThugs(ctx, game) {
    for (const th of game.combat.thugs) {
      ctx.save();
      ctx.translate(th.x, th.y);
      ctx.rotate(th.angle);
      ctx.fillStyle = '#3a2a2a';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c9a06a';
      ctx.beginPath(); ctx.arc(5, 0, 5.5, 0, Math.PI * 2); ctx.fill();
      // Gun barrel.
      ctx.fillStyle = '#111';
      ctx.fillRect(8, -2, 14, 4);
      ctx.restore();
      // Health bar.
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(th.x - 14, th.y - 24, 28, 5);
      ctx.fillStyle = '#ff5a4e';
      ctx.fillRect(th.x - 14, th.y - 24, 28 * Math.max(0, th.health / 70), 5);
    }
  }

  _drawPlayer(ctx, game) {
    const p = game.player;
    if (p.dead) return;
    if (p.inCar) return; // the car shape already draws the driver
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 3, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Rook: dark jacket, pale skin, red bandana.
    ctx.fillStyle = '#222831';
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c39e';
    ctx.beginPath(); ctx.arc(5, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c23b2e';
    ctx.fillRect(-2, -6, 5, 12);
    if (p.armed) {
      ctx.fillStyle = '#111';
      ctx.fillRect(8, -2, 14, 4);
    }
    ctx.restore();
  }

  _drawBullets(ctx, game) {
    ctx.fillStyle = '#ffe9a0';
    for (const b of game.combat.bullets) {
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  _drawParticles(ctx, game) {
    for (const pt of game.combat.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawLamps(ctx, game, camX, camY, W, H) {
    const night = Renderer.nightFactor(game.timeOfDay);
    if (night < 0.4) return;
    for (const l of this.world.lamps) {
      if (l.x < camX - 60 || l.x > camX + W + 60 || l.y < camY - 60 || l.y > camY + H + 60) continue;
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 70);
      g.addColorStop(0, `rgba(255, 220, 130, ${0.5 * night})`);
      g.addColorStop(1, 'rgba(255, 220, 130, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(l.x, l.y, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath(); ctx.arc(l.x, l.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}
