// The player: on-foot movement, car entry / theft, driving physics, health.
import { clamp, dist, angleDiff, rand, pick } from './util.js';
import { WORLD_W, WORLD_H, isOnRoad, isWater, collideBuildings } from './world.js';
import { playCrash } from './audio.js';

export const CAR_COLORS = ['#d23b3b', '#3b7dd2', '#d2a93b', '#3bd2a0', '#8a3bd2', '#d2d2d2', '#2b2b2b', '#e07b39'];
export const CAR_NAMES = ['Vesper', 'Comet', 'Stallion', 'Bison', 'Falcon', 'Courier', 'Sultan', 'Dune'];

export function makeCar(x, y, angle, opts = {}) {
  return {
    kind: 'car',
    x, y, angle, speed: 0,
    color: opts.color || pick(CAR_COLORS),
    name: opts.name || pick(CAR_NAMES),
    len: 46, wid: 22,
    stolen: !!opts.stolen,
    traffic: !!opts.traffic,
    hp: 100,
    dead: false,
  };
}

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: null,
    health: 100, money: 250,
    hasGun: false, ammo: 0,
    aimAngle: -Math.PI / 2,
    fireCooldown: 0,
    invuln: 0,
    moving: false,
  };
}

// Spawn a parked car on a road near a point (used for theft targets).
export function spawnParkedCar(buildings, x, y) {
  const angle = Math.random() < 0.5 ? 0 : Math.PI / 2;
  const car = makeCar(x, y, angle + (Math.random() < 0.5 ? 0 : Math.PI));
  return car;
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.moving = false;

  if (p.onFoot) {
    let mx = (input.keys.right ? 1 : 0) - (input.keys.left ? 1 : 0);
    let my = (input.keys.down ? 1 : 0) - (input.keys.up ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      const spd = input.keys.run ? 265 : 165;
      p.x += mx * spd * dt; p.y += my * spd * dt;
      p.angle = Math.atan2(my, mx);
      p.moving = true;
    }
    p.x = clamp(p.x, 20, WORLD_W - 20);
    p.y = clamp(p.y, 20, WORLD_H - 20);
    if (isWater(p.x, p.y)) p.y = 2440;
    collideBuildings(G.buildings, p, 13);
    // Aim follows the mouse.
    const cam = G.camera;
    const wx = cam.x + (input.mouse.x - G.view.w / 2) / cam.zoom;
    const wy = cam.y + (input.mouse.y - G.view.h / 2) / cam.zoom;
    p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
  } else if (p.car) {
    const car = p.car;
    const topSpeed = isOnRoad(car.x, car.y) ? 560 : 300;
    if (input.keys.up) car.speed += 620 * dt;
    if (input.keys.down) car.speed -= 700 * dt;
    if (!input.keys.up && !input.keys.down) car.speed -= Math.sign(car.speed) * 240 * dt;
    if (input.keys.brake) car.speed -= Math.sign(car.speed) * 900 * dt;
    car.speed = clamp(car.speed, -190, topSpeed);
    if (Math.abs(car.speed) < 6 && !input.keys.up && !input.keys.down) car.speed = 0;
    const steer = (input.keys.left ? -1 : 0) + (input.keys.right ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * 2.35 * dt * dir * clamp(Math.abs(car.speed) / 120, 0, 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.x = clamp(nx, 24, WORLD_W - 24);
    car.y = clamp(ny, 24, WORLD_H - 24);
    if (isWater(car.x, car.y)) { car.y = 2440; car.speed *= 0.4; }
    const before = { x: car.x, y: car.y };
    if (collideBuildings(G.buildings, car, 24)) {
      if (Math.abs(car.speed) > 240) playCrash();
      car.speed *= 0.35;
    }
    // Nudge other cars.
    for (const other of G.cars) {
      if (other === car || other.dead) continue;
      const d = dist(car.x, car.y, other.x, other.y);
      if (d < 48 && d > 0.01) {
        const push = (48 - d) / 2;
        const ux = (other.x - car.x) / d, uy = (other.y - car.y) / d;
        other.x += ux * push; other.y += uy * push;
        car.x -= ux * push * 0.5; car.y -= uy * push * 0.5;
        if (Math.abs(car.speed) > 200) { playCrash(); car.speed *= 0.6; }
        void before;
      }
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    p.moving = Math.abs(car.speed) > 10;
  }
}

export function enterCar(G, car) {
  const p = G.player;
  p.onFoot = false; p.car = car;
  car.traffic = false;
  if (!car.stolen && !car.owned) {
    car.stolen = true;
    G.addWanted(20, 'stole a car'); // 20 heat = 1 star
    G.toast('Car stolen! +1 star', '#ff9a3d');
  }
  G.audio.playPickup();
}

export function exitCar(G) {
  const p = G.player;
  if (!p.car) return;
  const car = p.car;
  p.onFoot = true;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  p.x = clamp(p.x, 20, WORLD_W - 20);
  p.y = clamp(p.y, 20, WORLD_H - 20);
  p.car = null;
}

export function damagePlayer(G, amount, cause) {
  const p = G.player;
  if (p.invuln > 0 || G.state !== 'playing') return;
  p.health -= amount;
  p.invuln = 0.35;
  if (p.health <= 0) {
    p.health = 0;
    G.busted(cause || 'wasted');
  }
}

// Find the nearest enterable car within reach of the player.
export function nearestCar(G, range) {
  let best = null, bd = range;
  for (const c of G.cars) {
    if (c.dead) continue;
    const d = dist(G.player.x, G.player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
