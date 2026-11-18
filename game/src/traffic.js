// Traffic cars that cruise the road grid, pedestrians who stroll the
// sidewalks and flee gunfire, and the cash pickups scattered around the
// city (dropped money, $25–$75 each — free-roam income between jobs).
import { clamp, dist, rand, pick } from './util.js';
import { AVENUES, STREETS, ROAD_HALF, WORLD_W, WORLD_H, isWater, collideBuildings } from './world.js';
import { makeCar } from './player.js';

const PED_SKINS = ['#e8c39a', '#c98d5f', '#8a5a3b', '#f0d0b0', '#6b4a2f', '#d9a06a'];
const PED_SHIRTS = ['#d23b3b', '#3b7dd2', '#3bd2a0', '#d2a93b', '#e8e8e8', '#7a4a9a', '#2b8a6a', '#c96a2b'];

export function spawnTraffic(G, n) {
  for (let i = 0; i < n; i++) {
    const car = makeTrafficCar();
    G.cars.push(car);
  }
}

export function makeTrafficCar() {
  const vertical = Math.random() < 0.5;
  const road = vertical ? pick(AVENUES) : pick(STREETS);
  const along = rand(150, (vertical ? WORLD_H : WORLD_W) - 150);
  const lane = (Math.random() < 0.5 ? -1 : 1) * 22;
  const car = makeCar(
    vertical ? road + lane : along,
    vertical ? along : road + lane,
    vertical ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI),
    { traffic: true },
  );
  car.speed = rand(90, 170);
  car.vertical = vertical;
  return car;
}

export function spawnPedestrians(G, n) {
  for (let i = 0; i < n; i++) {
    const vertical = Math.random() < 0.5;
    const road = vertical ? pick(AVENUES) : pick(STREETS);
    const along = rand(120, (vertical ? WORLD_H : WORLD_W) - 120);
    const side = (Math.random() < 0.5 ? -1 : 1) * (ROAD_HALF + 14);
    G.peds.push({
      x: vertical ? road + side : along,
      y: vertical ? along : road + side,
      angle: rand(0, Math.PI * 2),
      speed: rand(28, 52),
      skin: pick(PED_SKINS),
      shirt: pick(PED_SHIRTS),
      flee: 0,
      wanderT: rand(1, 4),
      dead: false,
    });
  }
}

export function spawnPickups(G, n) {
  G.pickups = [];
  for (let i = 0; i < n; i++) {
    const vertical = Math.random() < 0.5;
    const road = vertical ? pick(AVENUES) : pick(STREETS);
    const along = rand(150, (vertical ? WORLD_H : WORLD_W) - 150);
    const side = (Math.random() < 0.5 ? -1 : 1) * (ROAD_HALF + 30);
    G.pickups.push({
      x: vertical ? road + side : along,
      y: vertical ? along : road + side,
      value: 25 + Math.floor(Math.random() * 3) * 25,
      taken: false,
      bob: rand(0, Math.PI * 2),
    });
  }
}

function nearestCross(x, y, vertical) {
  if (vertical) {
    let best = STREETS[0];
    let bd = Infinity;
    for (const s of STREETS) {
      const d = Math.abs(s - y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  let best = AVENUES[0];
  let bd = Infinity;
  for (const a of AVENUES) {
    const d = Math.abs(a - x);
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

export function updateTraffic(G, dt) {
  const p = G.player;
  for (const car of G.cars) {
    if (car.dead || car === p.car || !car.traffic) continue;
    const d = dist(car.x, car.y, p.x, p.y);
    if (d > 1400) {
      // Recycle far cars onto a road near the player.
      const fresh = makeTrafficCar();
      fresh.x = clamp(p.x + rand(-600, 600), 150, WORLD_W - 150);
      fresh.y = clamp(p.y + rand(-500, 500), 150, WORLD_H - 150);
      car.x = fresh.x;
      car.y = fresh.y;
      car.angle = fresh.angle;
      car.vertical = fresh.vertical;
      car.speed = fresh.speed;
      continue;
    }
    // At an intersection, sometimes turn onto the cross road.
    const cross = nearestCross(car.x, car.y, car.vertical);
    const onCross = car.vertical ? Math.abs(car.y - cross) < 14 : Math.abs(car.x - cross) < 14;
    if (onCross && Math.random() < dt * 0.25) {
      car.vertical = !car.vertical;
      const lane = (Math.random() < 0.5 ? -1 : 1) * 22;
      car.angle = car.vertical ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? 0 : Math.PI);
    }
    // Slow down for the car ahead on the same lane.
    let target = car.speed;
    for (const o of G.cars) {
      if (o === car || o.dead) continue;
      const dx = o.x - car.x;
      const dy = o.y - car.y;
      const ahead = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
      const side = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
      if (ahead > 0 && ahead < 70 && side < 26) {
        target = Math.min(target, 40);
        break;
      }
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.x < 60 || car.x > WORLD_W - 60 || car.y < 60 || car.y > WORLD_H - 60) {
      car.angle += Math.PI; // turn around at the map edge
    }
    collideBuildings(G.buildings, car, 24);
  }
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  const gunfire = G.gunfireTimer > 0;
  for (const ped of G.peds) {
    if (ped.dead) continue;
    const d = dist(ped.x, ped.y, p.x, p.y);
    if (gunfire && d < 420) ped.flee = 2.5;
    if (d > 1300) {
      // Recycle far pedestrians near the player.
      ped.x = clamp(p.x + rand(-700, 700), 40, WORLD_W - 40);
      ped.y = clamp(p.y + rand(-500, 500), 40, WORLD_H - 40);
      ped.flee = 0;
    }
    ped.flee = Math.max(0, ped.flee - dt);
    ped.wanderT -= dt;
    if (ped.wanderT <= 0) {
      ped.wanderT = rand(2, 6);
      if (ped.flee <= 0) ped.angle = rand(0, Math.PI * 2);
    }
    let spd = ped.speed;
    if (ped.flee > 0) {
      ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
      spd = 150;
    }
    ped.x += Math.cos(ped.angle) * spd * dt;
    ped.y += Math.sin(ped.angle) * spd * dt;
    ped.x = clamp(ped.x, 30, WORLD_W - 30);
    ped.y = clamp(ped.y, 30, WORLD_H - 30);
    if (isWater(ped.x, ped.y)) ped.y = 2430;
    collideBuildings(G.buildings, ped, 10);
  }
}

export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    pk.bob += dt * 3;
    if (dist(pk.x, pk.y, p.x, p.y) < 34) {
      pk.taken = true;
      p.money += pk.value;
      G.pickupsTaken = (G.pickupsTaken || 0) + 1;
      G.audio.playCash();
      G.toast('Found $' + pk.value + ' on the street.', '#7dff8a');
    }
  }
}
