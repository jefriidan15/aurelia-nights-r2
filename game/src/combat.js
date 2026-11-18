// Combat: bullets, muzzle flashes, enemy guards, and shooting the player.
// The player fires with the mouse (pistol: one precise round; shotgun: a
// five-pellet spread). Guards stand their post and shoot back.
import { dist } from './util.js';
import { buildingAt } from './world.js';
import { damagePlayer, WEAPONS } from './player.js';
import { playGunshot, playShotgun } from './audio.js';

// Seconds a bullet flies before it fizzles out (900 speed -> ~990px range).
export const BULLET_LIFE = 1.1;

export function makeGuard(x, y, hp = 3) {
  return { x, y, hp, maxHp: hp, angle: 0, shootT: 1 + Math.random() * 2, dead: false, kind: 'guard' };
}

export function spawnBullet(G, x, y, angle, speed, owner) {
  G.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner, life: BULLET_LIFE });
  G.muzzle = { x, y, t: 0.06 };
}

// Player shooting: mouse aim, click or hold, consumes ammo.
export function updateShooting(G, dt) {
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
      const offset = w.pellets > 1
        ? (i - (w.pellets - 1) / 2) * spread
        : (Math.random() - 0.5) * spread;
      const a = p.aimAngle + offset;
      spawnBullet(G, p.x + Math.cos(p.aimAngle) * 20, p.y + Math.sin(p.aimAngle) * 20, a, w.speed, 'player');
    }
    if (p.weapon === 'shotgun') playShotgun();
    else playGunshot();
    G.gunfireTimer = 1.2;
    if (!G.mission.heatLock) G.addWanted(15, 'gunfire');
  }
}

// What a player-owned bullet hit, if anything. Returns true when the
// bullet is spent.
function playerBulletHit(G, b) {
  const p = G.player;
  for (const g of G.guards) {
    if (!g.dead && dist(b.x, b.y, g.x, g.y) < 16) {
      g.hp--;
      if (g.hp <= 0) {
        g.dead = true;
        G.onGuardKilled(g);
      }
      return true;
    }
  }
  for (const cop of G.cops) {
    if (dist(b.x, b.y, cop.x, cop.y) < 26) {
      cop.hp -= 12;
      if (cop.hp <= 0) G.onCopDestroyed(cop);
      return true;
    }
  }
  for (const c of G.cars) {
    if (!c.isCop && c !== p.car && !c.dead && dist(b.x, b.y, c.x, c.y) < 24) {
      c.hp -= 20;
      if (c.hp <= 0) {
        c.dead = true;
        c.traffic = false;
      }
      return true;
    }
  }
  for (const ped of G.peds) {
    if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 12) {
      ped.dead = true;
      G.addWanted(30, 'shot a pedestrian');
      return true;
    }
  }
  return false;
}

// What an enemy bullet hit. Returns true when the bullet is spent.
function enemyBulletHit(G, b) {
  const p = G.player;
  const target = p.onFoot ? p : p.car;
  const r = p.onFoot ? 13 : 26;
  if (target && dist(b.x, b.y, target.x, target.y) < r + 6) {
    if (p.onFoot) damagePlayer(G, b.owner === 'guard' ? 9 : 7, 'shot');
    else {
      p.car.hp -= 8;
      if (p.car.hp <= 0) G.carDestroyed(p.car);
    }
    return true;
  }
  return false;
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let spent = b.life <= 0;
    if (!spent && buildingAt(G.buildings, b.x, b.y)) spent = true;
    if (!spent && b.owner === 'player') spent = playerBulletHit(G, b);
    if (!spent && (b.owner === 'cop' || b.owner === 'guard')) spent = enemyBulletHit(G, b);
    if (spent) G.bullets.splice(i, 1);
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
        spawnBullet(G, g.x, g.y, g.angle + (Math.random() - 0.5) * 0.14, 620, 'guard');
        playGunshot();
      }
    }
  }
}
