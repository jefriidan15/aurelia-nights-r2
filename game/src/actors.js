// Aurelia Nights — people: the player on foot, pedestrians, police, rival crew.
import { makeChance, clamp, angleTo, angleDiff, dist2 } from './rngkit.js';
import { pushOutOfSolid, WORLD_W, WORLD_H } from './city.js';

const FIRST = ['Mara', 'Jules', 'Tomas', 'Priya', 'Otto', 'Lena', 'Kofi', 'Ines', 'Bram', 'Sofia', 'Rafi', 'Nadia'];
const SHIRTS = ['#e8e0c8', '#c94f3d', '#3d7ac9', '#3dc98a', '#c9a13d', '#8a3dc9', '#e07a3d', '#5f8a8a'];

export function makePlayer(x, y) {
  return {
    x, y, angle: 0, speed: 0, health: 100, armor: 0, cash: 250, respect: 0,
    inCar: null, weapon: 'fists', ammo: { pistol: 24, shotgun: 8, smg: 60 },
    weaponsOwned: ['fists', 'pistol'], moving: false, sprinting: false,
    lastHurt: 0, alive: true,
  };
}

export function makePedestrian(city, rnd) {
  const vertical = rnd.chance(0.5);
  const x = vertical ? rnd.pick(city.roadsV) + rnd.pick([-46, 46]) : rnd.range(200, 3400);
  const y = vertical ? rnd.range(200, 2600) : rnd.pick(city.roadsH) + rnd.pick([-46, 46]);
  return {
    kind: 'ped', name: rnd.pick(FIRST), x, y, angle: rnd.range(0, Math.PI * 2),
    speed: rnd.range(28, 52), shirt: rnd.pick(SHIRTS), panic: 0,
    tx: x, ty: y, retarget: rnd.range(2, 6),
  };
}

export function makeCop(x, y) {
  return { kind: 'cop', x, y, angle: 0, speed: 95, health: 100, shirt: '#1c2f4a', cooldown: 0, panic: 0 };
}

export function makeRival(x, y) {
  return { kind: 'rival', x, y, angle: 0, speed: 78, health: 60, shirt: '#5f1f2a', cooldown: 0, panic: 0 };
}

export function seedCrowd(city, count) {
  const rnd = makeChance(123);
  const crowd = [];
  for (let i = 0; i < count; i++) crowd.push(makePedestrian(city, rnd));
  return crowd;
}

export function walkPlayer(player, input, dt, city) {
  const sprint = input.sprint ? 1.55 : 1;
  const top = 165 * sprint;
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  player.sprinting = input.sprint && len > 0;
  if (len > 0) { mx /= len; my /= len; }
  player.x += mx * top * dt;
  player.y += my * top * dt;
  player.x = clamp(player.x, 40, WORLD_W - 40);
  player.y = clamp(player.y, 40, WORLD_H - 40);
  pushOutOfSolid(city, player, 14);
  player.angle = input.aimAngle;
}

export function updateCrowd(city, crowd, dt, danger) {
  const rnd = Math.random;
  for (const p of crowd) {
    p.retarget -= dt;
    if (danger && dist2(p.x, p.y, danger.x, danger.y) < 260 * 260) {
      p.panic = 2.5;
      p.fleeAngle = angleTo(danger.x, danger.y, p.x, p.y);
    }
    if (p.panic > 0) {
      p.panic -= dt;
      const away = p.fleeAngle ?? 0;
      p.x += Math.cos(away) * 150 * dt;
      p.y += Math.sin(away) * 150 * dt;
    } else if (p.retarget <= 0) {
      p.tx = clamp(p.x + (rnd() - 0.5) * 500, 60, WORLD_W - 60);
      p.ty = clamp(p.y + (rnd() - 0.5) * 500, 60, WORLD_H - 60);
      p.retarget = rnd() * 5 + 3;
    } else {
      const a = angleTo(p.x, p.y, p.tx, p.ty);
      const d = Math.hypot(p.tx - p.x, p.ty - p.y);
      if (d > 12) {
        p.angle = a;
        p.x += Math.cos(a) * p.speed * dt;
        p.y += Math.sin(a) * p.speed * dt;
      }
    }
    pushOutOfSolid(city, p, 12);
  }
}

// Foot police chase the player and try to arrest (touch) or shoot at range.
export function updateCops(city, cops, player, dt, wanted) {
  for (const cop of cops) {
    const d = Math.hypot(player.x - cop.x, player.y - cop.y);
    cop.cooldown -= dt;
    if (d > 420 || wanted === 0) { cop.speed = 0; continue; }
    const a = angleTo(cop.x, cop.y, player.x, player.y);
    cop.angle = a;
    cop.x += Math.cos(a) * cop.speed * dt;
    cop.y += Math.sin(a) * cop.speed * dt;
    pushOutOfSolid(city, cop, 12);
    if (d < 26 && cop.cooldown <= 0 && !player.inCar) {
      cop.cooldown = 0.9;
      return { kind: 'busted', by: cop };
    }
    if (d < 300 && wanted >= 3 && !player.inCar && cop.cooldown <= 0) {
      cop.cooldown = 1.4;
      return { kind: 'shot', by: cop, damage: 7 };
    }
  }
  return null;
}

export function updateRivals(city, rivals, player, dt) {
  const events = [];
  for (const r of rivals) {
    const d = Math.hypot(player.x - r.x, player.y - r.y);
    r.cooldown -= dt;
    if (d > 520) continue;
    const a = angleTo(r.x, r.y, player.x, player.y);
    r.angle = a;
    if (d > 190) {
      r.x += Math.cos(a) * r.speed * dt;
      r.y += Math.sin(a) * r.speed * dt;
      pushOutOfSolid(city, r, 12);
    } else if (r.cooldown <= 0) {
      r.cooldown = 1.1;
      events.push({ kind: 'shot', by: r, damage: 6 });
    }
  }
  return events;
}

export function damagePlayer(player, amount, now) {
  if (!player.alive) return;
  let left = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, left);
    player.armor -= absorbed;
    left -= absorbed;
  }
  player.health -= left;
  player.lastHurt = now;
  if (player.health <= 0) { player.health = 0; player.alive = false; }
}
