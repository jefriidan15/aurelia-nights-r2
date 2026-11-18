// The player: walking, car theft and entry, driving physics, health and
// damage. Cars are plain objects shared with traffic and police, so a car
// the player steals is the same object the traffic system used to drive.
import { clamp, dist, pick } from './util.js';
import { WORLD_W, WORLD_H, isOnRoad, isWater, pushOutOfBuildings } from './world.js';
import { playCrash } from './audio.js';

export const CAR_COLORS = ['#d23b3b', '#3b7dd2', '#d2a93b', '#3bd2a0', '#8a3bd2', '#d2d2d2', '#2b2b2b', '#e07b39'];
export const CAR_NAMES = ['Vesper', 'Comet', 'Stallion', 'Bison', 'Falcon', 'Courier', 'Sultan', 'Dune'];

// Weapon table: fire rate, bullet speed, pellets per shot. Damage is
// applied by the bullet's owner in combat.js.
export const WEAPONS = {
  none: { name: 'Unarmed', cooldown: 0, speed: 0, pellets: 0, price: 0 },
  pistol: { name: 'Pistol', cooldown: 0.22, speed: 900, pellets: 1, price: 150 },
  shotgun: { name: 'Shotgun', cooldown: 0.75, speed: 760, pellets: 5, price: 400 },
};

export function makeCar(x, y, angle, opts = {}) {
  return {
    kind: 'car',
    x, y, angle,
    speed: 0,
    color: opts.color || pick(CAR_COLORS),
    name: opts.name || pick(CAR_NAMES),
    len: 46,
    wid: 22,
    stolen: !!opts.stolen,
    owned: !!opts.owned,
    traffic: !!opts.traffic,
    isCop: false,
    hp: 100,
    maxHp: 100,
    dead: false,
    vertical: false,
  };
}

export function makePlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    speed: 0,
    onFoot: true,
    car: null,
    health: 100,
    money: 250,
    weapon: 'none',
    hasGun: false,
    ammo: 0,
    aimAngle: -Math.PI / 2,
    fireCooldown: 0,
    invuln: 0,
    moving: false,
  };
}

export function spawnParkedCar(buildings, x, y) {
  const angle = Math.random() < 0.5 ? 0 : Math.PI / 2;
  return makeCar(x, y, angle + (Math.random() < 0.5 ? 0 : Math.PI));
}

function walkPlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.speed = 0;
  let mx = (input.keys.right ? 1 : 0) - (input.keys.left ? 1 : 0);
  let my = (input.keys.down ? 1 : 0) - (input.keys.up ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
    const spd = input.keys.run ? 265 : 165;
    p.x += mx * spd * dt;
    p.y += my * spd * dt;
    p.angle = Math.atan2(my, mx);
    p.moving = true;
  }
  p.x = clamp(p.x, 20, WORLD_W - 20);
  p.y = clamp(p.y, 20, WORLD_H - 20);
  if (isWater(p.x, p.y)) p.y = 2440;
  pushOutOfBuildings(G.buildings, p, 13);
  // Aim follows the mouse in world space.
  const cam = G.camera;
  const wx = cam.x + (input.mouse.x - G.view.w / 2) / cam.zoom;
  const wy = cam.y + (input.mouse.y - G.view.h / 2) / cam.zoom;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);
}

function driveCar(G, dt) {
  const p = G.player;
  const input = G.input;
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
  car.x = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 24, WORLD_W - 24);
  car.y = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 24, WORLD_H - 24);
  if (isWater(car.x, car.y)) {
    car.y = 2440;
    car.speed *= 0.4;
  }
  if (pushOutOfBuildings(G.buildings, car, 24)) {
    if (Math.abs(car.speed) > 240) playCrash();
    // Only a hard impact damages the car; scraping a wall just slows it.
    if (Math.abs(car.speed) > 300) {
      car.hp = Math.max(0, car.hp - 5);
      if (car.hp <= 0 && !car.dead) G.carDestroyed(car);
    }
    car.speed *= 0.35;
  }
  // Shove other cars out of the way.
  shoveCars(G, car);
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = car.speed;
  p.moving = Math.abs(car.speed) > 10;
}

function shoveCars(G, car) {
  for (const other of G.cars) {
    if (other === car || other.dead) continue;
    const d = dist(car.x, car.y, other.x, other.y);
    if (d < 48 && d > 0.01) {
      const push = (48 - d) / 2;
      const ux = (other.x - car.x) / d;
      const uy = (other.y - car.y) / d;
      other.x += ux * push;
      other.y += uy * push;
      car.x -= ux * push * 0.5;
      car.y -= uy * push * 0.5;
      if (Math.abs(car.speed) > 200) {
        playCrash();
        car.speed *= 0.6;
        if (other.isCop) G.addWanted(25, 'rammed a police cruiser');
      }
    }
  }
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.moving = false;

  if (p.onFoot) walkPlayer(G, dt);
  else if (p.car) driveCar(G, dt);

  if (input.keys.horn && p.car) {
    G.audio.playHorn();
  }
}

export function enterCar(G, car) {
  const p = G.player;
  p.onFoot = false;
  p.car = car;
  car.traffic = false;
  if (!car.stolen && !car.owned && !car.isCop) {
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

// Nearest enterable car within reach of the player.
export function closestCar(G, range) {
  let best = null;
  let bd = range;
  for (const c of G.cars) {
    if (c.dead || c.isCop) continue;
    const d = dist(G.player.x, G.player.y, c.x, c.y);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}
