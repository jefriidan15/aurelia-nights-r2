// The Port Aurelia PD: wanted-level staging, police cruisers that hunt the
// player, and the busted / heat-decay rules.
import { clamp, dist, rand, angleDiff } from './util.js';
import { Car } from './traffic.js';

// How many cruisers hunt at each star level.
const CRUISERS_PER_STAR = [0, 1, 2, 3, 4, 6];
// Seconds the player must stay unseen before heat drops one star.
const DECAY_TIME = [0, 26, 24, 22, 20, 18];

export class Police {
  constructor(world, traffic) {
    this.world = world;
    this.traffic = traffic;
    this.cruisers = [];
    this.decayTimer = 0;
    this.spawnTimer = 0;
  }

  reset() {
    this.cruisers = [];
    this.decayTimer = 0;
    this.spawnTimer = 0;
  }

  _spawnCruiser(player) {
    // Appear on a road at the edge of the player's view.
    const a = rand(0, Math.PI * 2);
    const d = rand(620, 820);
    let x = player.x + Math.cos(a) * d;
    let y = player.y + Math.sin(a) * d;
    x = clamp(x, 60, 3540); y = clamp(y, 60, 2540);
    const p = this.world.nearestRoadPoint(x, y);
    const car = new Car(p.x, p.y, Math.atan2(player.y - p.y, player.x - p.x), {
      police: true, driver: 'police', color: '#1c2f4a', topSpeed: 560,
    });
    car.speed = 200;
    this.cruisers.push(car);
    return car;
  }

  update(dt, player, onBusted) {
    const wanted = player.wanted;
    const wantCount = CRUISERS_PER_STAR[wanted] || 0;

    // Spawn up to the wanted count.
    this.spawnTimer -= dt;
    if (this.cruisers.length < wantCount && this.spawnTimer <= 0) {
      this._spawnCruiser(player);
      this.spawnTimer = 1.2;
    }
    // Stand down cruisers when heat falls.
    while (this.cruisers.length > wantCount) this.cruisers.pop();

    let nearest = Infinity;
    for (const c of this.cruisers) {
      const d = dist(c.x, c.y, player.x, player.y);
      nearest = Math.min(nearest, d);
      // Chase: steer toward the player, faster than traffic, ramming speed.
      const want = Math.atan2(player.y - c.y, player.x - c.x);
      c.angle += clamp(angleDiff(c.angle, want), -2.6 * dt, 2.6 * dt);
      const target = d > 90 ? 470 : 300;
      c.speed += clamp(target - c.speed, -500 * dt, 420 * dt);
      const dx = Math.cos(c.angle) * c.speed * dt;
      const dy = Math.sin(c.angle) * c.speed * dt;
      const p = this.world.moveCircle(c.x, c.y, dx, dy, 15);
      c.x = p.x; c.y = p.y;
      // Ram the player's car: a shove with a cooldown, never a pin — a cruiser
      // that sits on the player would otherwise multiply the speed away.
      c.ramCd = Math.max(0, (c.ramCd || 0) - dt);
      if (player.inCar && d < 44 && c.ramCd <= 0) {
        player.inCar.health -= 6;
        player.inCar.speed *= 0.55;
        c.ramCd = 0.9;
        // Shove the cruiser back so it has to chase again.
        c.x -= Math.cos(c.angle) * 26;
        c.y -= Math.sin(c.angle) * 26;
        if (player.inCar.health <= 0) {
          player.hurt(10);
          player.inCar.health = 40; // the car limps on, smoking
        }
      }
      // On foot, a cruiser that sits on the player busts them.
      if (!player.inCar && d < 34 && wanted > 0) {
        player.bustedTimer += dt;
        if (player.bustedTimer > 1.4) {
          player.bustedTimer = 0;
          onBusted();
        }
      }
    }
    if (nearest > 60) player.bustedTimer = Math.max(0, player.bustedTimer - dt * 2);

    // Heat decay: stay out of every cruiser's sight and the stars fall.
    if (wanted > 0) {
      if (nearest > 520) {
        this.decayTimer += dt;
        if (this.decayTimer >= DECAY_TIME[wanted]) {
          player.wanted -= 1;
          this.decayTimer = 0;
        }
      } else {
        this.decayTimer = 0;
      }
    } else {
      this.decayTimer = 0;
    }
  }

  clearHeat() {
    this.cruisers = [];
    this.decayTimer = 0;
  }
}
