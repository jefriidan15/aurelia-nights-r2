// The player: Rook Vane, on foot and behind the wheel. Arcade car physics,
// on-foot movement, health, money, weapons and the steal/enter interactions.
import { clamp, dist, angleDiff, TAU } from './util.js';

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.45, range: 46, spread: 0, auto: false, ammo: Infinity },
  pistol: { name: 'Pistol', damage: 34, rate: 0.32, range: 420, spread: 0.03, auto: false, ammo: 12, mag: 12 },
  smg: { name: 'SMG', damage: 18, rate: 0.09, range: 360, spread: 0.09, auto: true, ammo: 30, mag: 30 },
};

export class Player {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    const s = this.world.placeAt('start');
    this.x = s.x; this.y = s.y;
    this.angle = -Math.PI / 2;
    this.speed = 0;
    this.health = 100;
    this.money = 250;
    this.wanted = 0;
    this.inCar = null;      // the Car object when driving
    this.weapon = 'fists';
    this.weapons = { fists: { ammo: Infinity }, pistol: null, smg: null };
    this.cooldown = 0;
    this.hurtFlash = 0;
    this.bustedTimer = 0;
    this.dead = false;
  }

  get armed() {
    return this.weapon !== 'fists';
  }

  weaponDef() {
    return WEAPONS[this.weapon];
  }

  buyWeapon(kind) {
    const price = kind === 'pistol' ? 150 : 400;
    if (this.money < price) return { ok: false, reason: 'Not enough cash.' };
    if (this.weapons[kind]) return { ok: false, reason: 'You already own that.' };
    this.money -= price;
    this.weapons[kind] = { ammo: WEAPONS[kind].mag };
    this.weapon = kind;
    return { ok: true, reason: `${WEAPONS[kind].name} bought. Press Q to switch.` };
  }

  buyAmmo() {
    if (!this.weapons[this.weapon] || this.weapon === 'fists') return { ok: false, reason: 'No gun equipped.' };
    if (this.money < 40) return { ok: false, reason: 'Not enough cash.' };
    this.money -= 40;
    this.weapons[this.weapon].ammo += WEAPONS[this.weapon].mag;
    return { ok: true, reason: 'Ammo restocked.' };
  }

  cycleWeapon() {
    const owned = ['fists', 'pistol', 'smg'].filter((w) => this.weapons[w]);
    const i = owned.indexOf(this.weapon);
    this.weapon = owned[(i + 1) % owned.length];
    return WEAPONS[this.weapon].name;
  }

  reload() {
    const w = this.weapons[this.weapon];
    if (!w || this.weapon === 'fists') return;
    w.ammo = WEAPONS[this.weapon].mag;
  }

  hurt(amount) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.hurtFlash = 0.35;
    if (this.health <= 0) this.dead = true;
  }

  heal(amount) {
    this.health = Math.min(100, this.health + amount);
  }

  addWanted(n) {
    this.wanted = clamp(this.wanted + n, 0, 5);
  }

  update(dt, input, cars) {
    if (this.dead) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);

    if (this.inCar) {
      this._drive(dt, input);
    } else {
      this._walk(dt, input);
    }
  }

  _walk(dt, input) {
    const v = input.moveVector();
    const speed = 175;
    const len = Math.hypot(v.x, v.y);
    if (len > 0) {
      const nx = (v.x / len) * speed * dt;
      const ny = (v.y / len) * speed * dt;
      const p = this.world.moveCircle(this.x, this.y, nx, ny, 14);
      this.x = p.x; this.y = p.y;
      this.angle = Math.atan2(v.y, v.x);
    }
  }

  _drive(dt, input) {
    const car = this.inCar;
    const v = input.moveVector();
    const forward = v.y < 0 ? 1 : v.y > 0 ? -0.55 : 0;
    const steer = v.x;
    // Arcade handling: speed builds with throttle, steering scales with speed.
    const topSpeed = car.topSpeed;
    car.speed += forward * 620 * dt;
    car.speed -= car.speed * 0.9 * dt; // drag + rolling resistance
    if (forward === 0) car.speed -= Math.sign(car.speed) * 90 * dt;
    if (Math.abs(car.speed) < 4 && forward === 0) car.speed = 0;
    car.speed = clamp(car.speed, -topSpeed * 0.45, topSpeed);
    const turnRate = 2.4 * clamp(Math.abs(car.speed) / 120, 0, 1) * Math.sign(car.speed || 1);
    car.angle += steer * turnRate * dt;
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    const p = this.world.moveCircle(car.x, car.y, dx, dy, 16);
    const hitWall = (p.x === car.x && dx !== 0) || (p.y === car.y && dy !== 0);
    if (hitWall) {
      car.speed *= 0.35;
      if (Math.abs(car.speed) > 240) { this.hurt(4); car.health -= 6; }
    }
    car.x = p.x; car.y = p.y;
    this.x = car.x; this.y = car.y;
    this.angle = car.angle;
    this.speed = car.speed;
  }

  // Step out of the car to the side.
  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    car.driver = null;
    car.speed = 0;
    this.inCar = null;
    const side = car.angle + Math.PI / 2;
    const p = this.world.moveCircle(car.x, car.y, Math.cos(side) * 26, Math.sin(side) * 26, 14);
    this.x = p.x; this.y = p.y;
    this.speed = 0;
  }

  enterCar(car) {
    this.inCar = car;
    car.driver = 'player';
    this.x = car.x; this.y = car.y;
  }

  // Can the player reach this car to enter / steal it?
  nearCar(car, range = 46) {
    return dist(this.x, this.y, car.x, car.y) < range;
  }
}
