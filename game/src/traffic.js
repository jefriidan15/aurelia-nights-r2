// Traffic, parked cars and pedestrians. Cars drive the road grid on simple
// lane waypoints; pedestrians stroll the sidewalks and flee gunfire.
import { clamp, dist, rand, randInt, pick, angleDiff } from './util.js';
import { WORLD_W, WORLD_H, BLOCK, ROAD_W } from './world.js';

export const CAR_COLORS = ['#c23b2e', '#2e6fc2', '#d8a13a', '#3fae6a', '#7a4a9e', '#c2c2c2', '#e07a2e', '#2ea8a0'];
export const CAR_MODELS = [
  { name: 'Vesper', topSpeed: 430, len: 46 },
  { name: 'Heron', topSpeed: 380, len: 42 },
  { name: 'Mule', topSpeed: 330, len: 52 },
  { name: 'Comet', topSpeed: 520, len: 44 },
];

export class Car {
  constructor(x, y, angle, opts = {}) {
    this.x = x; this.y = y; this.angle = angle;
    this.speed = 0;
    this.color = opts.color || pick(CAR_COLORS);
    this.model = opts.model || pick(CAR_MODELS);
    this.topSpeed = opts.topSpeed || this.model.topSpeed;
    this.len = this.model.len;
    this.parked = !!opts.parked;
    this.police = !!opts.police;
    this.driver = opts.driver || null; // 'player' | 'traffic' | null
    this.health = 100;
    this.stolen = false;
    this.waypoint = null;
    this.wait = 0;
  }
}

export class Traffic {
  constructor(world) {
    this.world = world;
    this.cars = [];
    this.peds = [];
    this._seed();
  }

  _seed() {
    // Parked cars along the avenues, facing along their road.
    for (let i = 0; i < 26; i++) {
      const p = this.world.randomRoadPoint(null);
      this.cars.push(new Car(p.x, p.y, this.world.roadAngle(p.x, p.y), { parked: true }));
    }
    // Moving traffic.
    for (let i = 0; i < 14; i++) this.spawnTrafficCar(null);
    // Pedestrians on the sidewalks.
    for (let i = 0; i < 30; i++) {
      const p = this.world.randomRoadPoint(null);
      this.peds.push(this._makePed(p.x, p.y));
    }
  }

  _makePed(x, y) {
    return {
      x, y, angle: rand(0, Math.PI * 2), speed: rand(28, 55),
      color: pick(['#e8c39e', '#c98d5f', '#8a5a3b', '#f0d0b0']),
      shirt: pick(['#c23b2e', '#2e6fc2', '#d8a13a', '#3fae6a', '#e8e8e8', '#222831']),
      flee: 0, tx: x, ty: y, wait: rand(0, 3),
    };
  }

  spawnTrafficCar(near) {
    const p = this.world.randomRoadPoint(near);
    const car = new Car(p.x, p.y, this.world.roadAngle(p.x, p.y), { driver: 'traffic' });
    car.speed = rand(120, 200);
    car.waypoint = this._nextWaypoint(car);
    this.cars.push(car);
    return car;
  }

  spawnParkedCar(near) {
    const p = this.world.randomRoadPoint(near);
    const car = new Car(p.x, p.y, this.world.roadAngle(p.x, p.y), { parked: true });
    this.cars.push(car);
    return car;
  }

  _nextWaypoint(car) {
    // Pick a point further along the current road, then turn at the next junction.
    const along = Math.random() < 0.5;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const gx = Math.round(car.x / BLOCK), gy = Math.round(car.y / BLOCK);
    if (along) {
      return { x: clamp(car.x + dir * rand(200, 500), 40, WORLD_W - 40), y: gy * BLOCK + ROAD_W / 2 };
    }
    return { x: gx * BLOCK + ROAD_W / 2, y: clamp(car.y + dir * rand(200, 500), 40, WORLD_H - 40) };
  }

  scarePeds(x, y, radius = 260) {
    for (const p of this.peds) {
      if (dist(p.x, p.y, x, y) < radius) {
        p.flee = 3;
        const a = Math.atan2(p.y - y, p.x - x);
        p.tx = p.x + Math.cos(a) * 320;
        p.ty = p.y + Math.sin(a) * 320;
      }
    }
  }

  update(dt, player) {
    // Traffic cars follow waypoints; slow for the car ahead.
    for (const car of this.cars) {
      if (car.driver !== 'traffic' || car.parked) continue;
      if (!car.waypoint) car.waypoint = this._nextWaypoint(car);
      const d = dist(car.x, car.y, car.waypoint.x, car.waypoint.y);
      if (d < 30) { car.waypoint = this._nextWaypoint(car); continue; }
      const want = Math.atan2(car.waypoint.y - car.y, car.waypoint.x - car.x);
      car.angle += clamp(angleDiff(car.angle, want), -1.8 * dt, 1.8 * dt);
      // Brake if something is right ahead.
      let blocked = false;
      for (const other of this.cars) {
        if (other === car) continue;
        const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
        const side = Math.abs((other.x - car.x) * -Math.sin(car.angle) + (other.y - car.y) * Math.cos(car.angle));
        if (ahead > 0 && ahead < 70 && side < 26) { blocked = true; break; }
      }
      const target = blocked ? 0 : randInt(130, 190);
      car.speed += clamp(target - car.speed, -300 * dt, 200 * dt);
      const dx = Math.cos(car.angle) * car.speed * dt;
      const dy = Math.sin(car.angle) * car.speed * dt;
      const p = this.world.moveCircle(car.x, car.y, dx, dy, 15);
      if (p.x === car.x && p.y === car.y) { car.waypoint = this._nextWaypoint(car); car.speed = 0; }
      car.x = p.x; car.y = p.y;
    }
    // Keep traffic density up near the player; recycle far cars.
    const nearTraffic = this.cars.filter((c) => c.driver === 'traffic' && dist(c.x, c.y, player.x, player.y) < 900).length;
    if (nearTraffic < 8) this.spawnTrafficCar(player);
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      if (c.driver === 'traffic' && dist(c.x, c.y, player.x, player.y) > 1600) {
        this.cars.splice(i, 1);
      }
    }
    // Pedestrians wander; fleeing ones run from the scare point.
    for (const p of this.peds) {
      if (p.flee > 0) {
        p.flee -= dt;
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        const sp = 150;
        const np = this.world.moveCircle(p.x, p.y, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt, 10);
        p.x = np.x; p.y = np.y; p.angle = a;
        continue;
      }
      p.wait -= dt;
      if (p.wait <= 0) {
        const t = this.world.randomRoadPoint(p);
        p.tx = t.x; p.ty = t.y;
        p.wait = rand(2, 6);
      }
      const d = dist(p.x, p.y, p.tx, p.ty);
      if (d > 12) {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        const np = this.world.moveCircle(p.x, p.y, Math.cos(a) * p.speed * dt, Math.sin(a) * p.speed * dt, 10);
        p.x = np.x; p.y = np.y; p.angle = a;
      }
    }
    // Repopulate pedestrians that wandered too far.
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      if (dist(p.x, p.y, player.x, player.y) > 1500) {
        const t = this.world.randomRoadPoint(player);
        this.peds[i] = this._makePed(t.x, t.y);
      }
    }
  }
}
