// Aurelia Nights — vehicles: car models, driving physics, traffic flow.
import { makeChance, clamp, angleDiff } from './rngkit.js';
import { nearestRoadPoint, pushOutOfSolid } from './city.js';

export const CAR_MODELS = [
  { id: 'kelp', name: 'Kelp Coupe', top: 330, accel: 210, grip: 3.4, color: '#c94f3d', len: 46, wid: 22 },
  { id: 'heron', name: 'Heron Sedan', top: 290, accel: 170, grip: 3.0, color: '#3d7ac9', len: 50, wid: 23 },
  { id: 'mule', name: 'Mule Van', top: 240, accel: 130, grip: 2.6, color: '#c9a13d', len: 56, wid: 26 },
  { id: 'falcon', name: 'Falcon GT', top: 400, accel: 260, grip: 3.8, color: '#8a3dc9', len: 48, wid: 22 },
  { id: 'tide', name: 'Tide Pickup', top: 270, accel: 160, grip: 2.9, color: '#3dc98a', len: 54, wid: 25 },
];
export const POLICE_MODEL = { id: 'abpd', name: 'ABPD Interceptor', top: 360, accel: 240, grip: 3.6, color: '#1c2f4a', len: 50, wid: 23 };

let nextCarId = 1;

export function spawnCar(city, model, x, y, angle, opts = {}) {
  return {
    id: nextCarId++, model, x, y, angle, speed: 0,
    police: !!opts.police, traffic: !!opts.traffic, parked: !!opts.parked,
    driver: opts.driver || null, health: 100, honk: 0,
    target: null, stuck: 0, siren: 0,
  };
}

export function seedTraffic(city, count) {
  const rnd = makeChance(77);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rnd.chance(0.5);
    const x = vertical ? rnd.pick(city.roadsV) + rnd.pick([-14, 14]) : rnd.range(200, 3400);
    const y = vertical ? rnd.range(200, 2600) : rnd.pick(city.roadsH) + rnd.pick([-14, 14]);
    const model = rnd.pick(CAR_MODELS);
    const angle = vertical ? (rnd.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rnd.chance(0.5) ? 0 : Math.PI);
    const car = spawnCar(city, model, x, y, angle, { traffic: true });
    car.speed = rnd.range(60, 140);
    cars.push(car);
  }
  return cars;
}

export function seedParked(city, count) {
  const rnd = makeChance(41);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rnd.chance(0.5);
    const x = vertical ? rnd.pick(city.roadsV) + rnd.pick([-34, 34]) : rnd.range(300, 3300);
    const y = vertical ? rnd.range(300, 2500) : rnd.pick(city.roadsH) + rnd.pick([-34, 34]);
    const angle = vertical ? (rnd.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rnd.chance(0.5) ? 0 : Math.PI);
    cars.push(spawnCar(city, rnd.pick(CAR_MODELS), x, y, angle, { parked: true }));
  }
  return cars;
}

// Player driving: arcade handling with drift on the handbrake.
export function driveCar(car, input, dt) {
  const m = car.model;
  const forward = input.up ? 1 : input.down ? -0.55 : 0;
  car.speed += forward * m.accel * dt;
  car.speed *= Math.pow(0.35, dt); // rolling drag
  car.speed = clamp(car.speed, -m.top * 0.45, m.top);
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const grip = input.handbrake ? m.grip * 0.45 : m.grip;
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * grip * dt * dir * clamp(Math.abs(car.speed) / 90, 0, 1.4);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  if (input.handbrake && Math.abs(car.speed) > 120) car.speed *= Math.pow(0.6, dt);
}

// Traffic: follow the road grid, turn at intersections, slow for cars ahead.
export function updateTraffic(city, cars, dt, playerPos) {
  for (const car of cars) {
    if (!car.traffic) continue;
    const ahead = car.x + Math.cos(car.angle) * 70;
    const aheadY = car.y + Math.sin(car.angle) * 70;
    let blocked = false;
    for (const other of cars) {
      if (other === car) continue;
      const dx = other.x - ahead, dy = other.y - aheadY;
      if (dx * dx + dy * dy < 55 * 55) { blocked = true; break; }
    }
    if (playerPos) {
      const dx = playerPos.x - ahead, dy = playerPos.y - aheadY;
      if (dx * dx + dy * dy < 50 * 50) blocked = true;
    }
    const target = blocked ? 0 : 120;
    car.speed += clamp(target - car.speed, -160 * dt, 90 * dt);
    // Snap gently back onto the road line and turn at intersections.
    const road = nearestRoadPoint(city, car.x, car.y);
    const onVertical = Math.abs(Math.cos(car.angle)) < 0.4;
    if (onVertical) car.x += (road.x - car.x) * 0.8 * dt;
    else car.y += (road.y - car.y) * 0.8 * dt;
    const atX = city.roadsH.some((ry) => Math.abs(car.y - ry) < 26);
    const atY = city.roadsV.some((rx) => Math.abs(car.x - rx) < 26);
    if ((atX || atY) && Math.random() < dt * 0.25) {
      const turns = [0, Math.PI / 2, -Math.PI / 2, Math.PI];
      car.angle = turns[Math.floor(Math.random() * turns.length)];
      // keep the turn legal: snap onto the nearest road line after turning
      const r2 = nearestRoadPoint(city, car.x, car.y);
      if (Math.abs(Math.cos(car.angle)) < 0.4) car.x = r2.x; else car.y = r2.y;
    }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    pushOutOfSolid(city, car, 20);
    car.x = clamp(car.x, 80, 3520);
    car.y = clamp(car.y, 80, 2720);
  }
}

export function carDistance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

// Steal check: nearest stealable car within reach of a point.
// Parked cars are fair game; moving traffic costs a wanted star on entry.
export function nearestStealable(cars, x, y, maxDist) {
  let best = null, bd = maxDist;
  for (const car of cars) {
    if (car.police) continue; // ABPD interceptors cannot be stolen
    const d = carDistance(car, { x, y });
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}
