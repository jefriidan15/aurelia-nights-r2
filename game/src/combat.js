// Combat: bullets, armed dock thugs, muzzle flashes and particles.
// Thugs are the mission-3 (and vault-hold) enemies; they take cover behind
// crates and shoot back when the player is in range.
import { clamp, dist, rand, pick } from './util.js';

export class Combat {
  constructor(world, player, traffic) {
    this.world = world;
    this.player = player;
    this.traffic = traffic;
    this.bullets = [];   // {x,y,angle,speed,from,damage,life}
    this.thugs = [];     // {x,y,health,cooldown,angle}
    this.particles = []; // {x,y,vx,vy,life,maxLife,color,size}
    this.blood = [];
  }

  reset() {
    this.bullets = [];
    this.thugs = [];
    this.particles = [];
    this.blood = [];
  }

  spawnThugs(n, at) {
    this.thugs = [];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(60, 150);
      let x = at.x + Math.cos(a) * r;
      let y = at.y + Math.sin(a) * r;
      // Keep them out of the water and out of buildings.
      if (this.world.isWater(x, y)) { x = at.x - 60; y = at.y - 60; }
      this.thugs.push({ x, y, health: 70, cooldown: rand(0.5, 1.5), angle: 0 });
    }
    return this.thugs.length;
  }

  playerShoot(tx, ty, sound) {
    const p = this.player;
    if (p.dead || p.cooldown > 0) return false;
    const def = p.weaponDef();
    const w = p.weapons[p.weapon];
    if (w && w.ammo <= 0) return false;
    if (w) w.ammo--;
    p.cooldown = def.rate;
    const base = Math.atan2(ty - p.y, tx - p.x);
    const angle = base + rand(-def.spread, def.spread);
    this.bullets.push({
      x: p.x + Math.cos(base) * 22, y: p.y + Math.sin(base) * 22,
      angle, speed: 900, from: 'player', damage: def.damage, life: def.range / 900,
    });
    this._muzzle(p.x + Math.cos(base) * 26, p.y + Math.sin(base) * 26, base);
    if (sound) sound.gunshot();
    return true;
  }

  _muzzle(x, y, angle) {
    for (let i = 0; i < 6; i++) {
      const a = angle + rand(-0.5, 0.5);
      this.particles.push({
        x, y, vx: Math.cos(a) * rand(120, 320), vy: Math.sin(a) * rand(120, 320),
        life: 0.18, maxLife: 0.18, color: '#ffcf4d', size: 3,
      });
    }
  }

  _blood(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      this.particles.push({
        x, y, vx: Math.cos(a) * rand(40, 160), vy: Math.sin(a) * rand(40, 160),
        life: 0.5, maxLife: 0.5, color: '#a01818', size: 3,
      });
    }
  }

  _hitWall(x, y) {
    return !!this.world.collidesCircle(x, y, 2);
  }

  update(dt, onThugKilled, onPlayerHit, sound) {
    const p = this.player;
    // Bullets fly, hit walls, cars, thugs, peds and the player.
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= dt;
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      let dead = b.life <= 0 || this._hitWall(b.x, b.y);
      if (!dead && b.from === 'player') {
        for (let t = 0; t < this.thugs.length; t++) {
          const th = this.thugs[t];
          if (dist(b.x, b.y, th.x, th.y) < 16) {
            th.health -= b.damage;
            this._blood(b.x, b.y);
            if (th.health <= 0) {
              this.thugs.splice(t, 1);
              onThugKilled();
            }
            dead = true;
            break;
          }
        }
        if (!dead) {
          for (const ped of this.traffic.peds) {
            if (dist(b.x, b.y, ped.x, ped.y) < 13) {
              this._blood(b.x, b.y);
              ped.flee = 4;
              this.traffic.scarePeds(b.x, b.y, 200);
              p.addWanted(1);
              dead = true;
              break;
            }
          }
        }
      } else if (!dead && b.from === 'thug') {
        const pr = p.inCar ? 24 : 13;
        if (dist(b.x, b.y, p.x, p.y) < pr) {
          p.hurt(b.damage);
          onPlayerHit();
          dead = true;
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }
    // Thugs: strafe toward cover range, shoot when the player is visible.
    for (const th of this.thugs) {
      const d = dist(th.x, th.y, p.x, p.y);
      th.angle = Math.atan2(p.y - th.y, p.x - th.x);
      th.cooldown -= dt;
      if (d > 320) {
        const np = this.world.moveCircle(th.x, th.y, Math.cos(th.angle) * 85 * dt, Math.sin(th.angle) * 85 * dt, 12);
        th.x = np.x; th.y = np.y;
      } else if (d < 130) {
        const np = this.world.moveCircle(th.x, th.y, -Math.cos(th.angle) * 60 * dt, -Math.sin(th.angle) * 60 * dt, 12);
        th.x = np.x; th.y = np.y;
      }
      if (d < 380 && th.cooldown <= 0 && !p.dead) {
        th.cooldown = rand(0.7, 1.4);
        const a = th.angle + rand(-0.06, 0.06);
        this.bullets.push({
          x: th.x + Math.cos(a) * 20, y: th.y + Math.sin(a) * 20,
          angle: a, speed: 700, from: 'thug', damage: 9, life: 0.8,
        });
        this._muzzle(th.x + Math.cos(a) * 22, th.y + Math.sin(a) * 22, a);
        if (sound) sound.enemyShot();
      }
    }
    // Particles fade.
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.92; pt.vy *= 0.92;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }
}
