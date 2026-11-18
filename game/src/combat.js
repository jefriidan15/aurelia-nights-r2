// Combat: bullets, muzzle flashes, enemy guards, and shooting the player.
// The player fires with the mouse (pistol: one precise round; shotgun: a
// five-pellet spread). Guards stand their post and shoot back.
import { dist } from './util.js';
import { pointInBuilding } from './world.js';
import { damagePlayer, WEAPONS } from './player.js';
import { playGunshot, playShotgun } from './audio.js';

export function makeGuard(x, y, hp = 3) {
  return { x, y, hp, maxHp: hp, angle: 0, shootT: 1 + Math.random() * 2, dead: false, kind: 'guard' };
}

export function fireBulletFrom(G, x, y, angle, speed, owner) {
  G.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner, life: 1.1 });
  G.muzzle = { x, y, t: 0.06 };
}

// Player shooting: mouse aim, click or hold, consumes ammo.
export function updatePlayerShooting(G, dt) {
  const p = G.player;
  const input = G.input;
  if (!p.onFoot || p.weapon === 'none') return;
  const w = WEAPONS[p.weapon];
  if (p.ammo <= 0) {
    if (input.mouse.clicked) G.toast('Out of ammo — visit Iron & Oak', '#ff9a3d');
    return;
  }
  if (input.mouse.down && p.fireCooldown <= 0) {
    p.fireCooldown = w.cooldown;
    p.ammo--;
    const spread = p.weapon === 'shotgun' ? 0.16 : 0.02;
    for (let i = 0; i < w.pellets; i++) {
      const a = p.aimAngle + (w.pellets > 1 ? (i - (w.pellets - 1) / 2) * spread : (Math.random() - 0.5) * spread);
      fireBulletFrom(G, p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20, a, w.speed, 'player');
    }
    if (p.weapon === 'shotgun') playShotgun();
    else playGunshot();
    G.gunfireTimer = 1.2;
    if (!G.mission.heatLock) G.addWanted(15, 'gunfire');
  }
}

export function updateBullets(G, dt) {
  const p = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && pointInBuilding(G.buildings, b.x, b.y)) dead = true;
    if (!dead && b.owner === 'player') {
      // Hit a guard.
      for (const g of G.guards) {
        if (!g.dead && dist(b.x, b.y, g.x, g.y) < 16) {
          g.hp--;
          dead = true;
          if (g.hp <= 0) {
            g.dead = true;
            G.onGuardKilled(g);
          }
          break;
        }
      }
      // Hit a cop car.
      if (!dead) {
        for (const cop of G.cops) {
          if (dist(b.x, b.y, cop.x, cop.y) < 26) {
            cop.hp -= 12;
            dead = true;
            if (cop.hp <= 0) G.onCopDestroyed(cop);
            break;
          }
        }
      }
      // Hit a traffic car (it becomes a wreck).
      if (!dead) {
        for (const c of G.cars) {
          if (!c.isCop && c !== p.car && !c.dead && dist(b.x, b.y, c.x, c.y) < 24) {
            c.hp -= 20;
            dead = true;
            if (c.hp <= 0) {
              c.dead = true;
              c.traffic = false;
            }
            break;
          }
        }
      }
      // Hit a pedestrian (counts as a crime).
      if (!dead) {
        for (const ped of G.peds) {
          if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 12) {
            ped.dead = true;
            dead = true;
            G.addWanted(30, 'shot a pedestrian');
            break;
          }
        }
      }
    }
    if (!dead && (b.owner === 'cop' || b.owner === 'guard')) {
      const target = p.onFoot ? p : p.car;
      const r = p.onFoot ? 13 : 26;
      if (target && dist(b.x, b.y, target.x, target.y) < r + 6) {
        dead = true;
        if (p.onFoot) damagePlayer(G, b.owner === 'guard' ? 9 : 7, 'shot');
        else {
          p.car.hp -= 8;
          if (p.car.hp <= 0) G.carDestroyed(p.car);
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

// Guards stand their post and shoot at the player when close.
export function updateGuards(G, dt) {
  const p = G.player;
  for (const g of G.guards) {
    if (g.dead) continue;
    const d = dist(g.x, g.y, p.x, p.y);
    g.angle = Math.atan2(p.y - g.y, p.x - g.x);
    if (d < 460) {
      g.shootT -= dt;
      if (g.shootT <= 0) {
        g.shootT = 1.1 + Math.random() * 0.9;
        fireBulletFrom(G, g.x, g.y, g.angle + (Math.random() - 0.5) * 0.14, 620, 'guard');
        playGunshot();
      }
    }
  }
}
