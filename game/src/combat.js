// Aurelia Nights — combat: weapons, bullets, pickups, health and armour.
import { clamp } from './rngkit.js';

export const WEAPONS = {
  fists: { name: 'Fists', damage: 12, rate: 0.45, range: 46, auto: false, ammo: Infinity, spread: 0, speed: 0 },
  pistol: { name: 'Pistol', damage: 22, rate: 0.28, range: 420, auto: false, ammo: 'pistol', spread: 0.03, speed: 900 },
  shotgun: { name: 'Pump Shotgun', damage: 16, rate: 0.85, range: 260, auto: false, ammo: 'shotgun', spread: 0.16, speed: 780, pellets: 5 },
  smg: { name: 'SMG', damage: 13, rate: 0.09, range: 380, auto: true, ammo: 'smg', spread: 0.07, speed: 950 },
};

export const SHOP = [
  { id: 'shotgun', name: 'Pump Shotgun', price: 400 },
  { id: 'smg', name: 'SMG', price: 900 },
  { id: 'ammo-pistol', name: 'Pistol ammo ×24', price: 60 },
  { id: 'ammo-shotgun', name: 'Shotgun shells ×8', price: 80 },
  { id: 'ammo-smg', name: 'SMG ammo ×60', price: 120 },
  { id: 'armor', name: 'Body armour', price: 250 },
];

// The order weapons cycle through with the number keys.
export const WEAPON_ORDER = ['fists', 'pistol', 'shotgun', 'smg'];

export function makeBullet(x, y, angle, damage, owner, range) {
  return { x, y, angle, damage, owner, range, traveled: 0, speed: 900 };
}

export function fireWeapon(state, shooter, angle) {
  const w = WEAPONS[shooter.weapon];
  if (!w) return [];
  if (w.ammo !== Infinity) {
    const pool = shooter.ammo[w.ammo];
    if (!pool || pool <= 0) return [{ kind: 'dry' }];
    shooter.ammo[w.ammo] = pool - 1;
  }
  const pellets = w.pellets || 1;
  const out = [];
  for (let i = 0; i < pellets; i++) {
    const a = angle + (Math.random() - 0.5) * w.spread * 2;
    out.push(makeBullet(shooter.x + Math.cos(a) * 22, shooter.y + Math.sin(a) * 22, a, w.damage, shooter, w.range));
  }
  return out;
}

export function updateBullets(state, bullets, dt) {
  const dead = [];
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const step = b.speed * dt;
    b.x += Math.cos(b.angle) * step;
    b.y += Math.sin(b.angle) * step;
    b.traveled += step;
    if (b.traveled > b.range) { dead.push(i); continue; }
    // Hit a building?
    if (state.city && state.city.buildings) {
      let blocked = false;
      for (const bd of state.city.buildings) {
        if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) { blocked = true; break; }
      }
      if (blocked) { state.sparks.push({ x: b.x, y: b.y, life: 0.25, max: 0.25, color: '#ffd23e' }); dead.push(i); continue; }
    }
    // Hit an enemy / cop / rival?
    let hit = null;
    for (const list of [state.rivals, state.cops]) {
      for (const e of list) {
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy < 20 * 20) { hit = e; break; }
      }
      if (hit) break;
    }
    if (hit && b.owner === state.player) {
      hit.health -= b.damage;
      state.sparks.push({ x: b.x, y: b.y, life: 0.3, max: 0.3, color: '#ff5f4d' });
      if (hit.health <= 0) state.onKill(hit);
      dead.push(i);
      continue;
    }
    // Enemy bullet hits the player?
    if (b.owner !== state.player) {
      const p = state.player;
      const dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy < 18 * 18) {
        state.hurtPlayer(b.damage, b.owner);
        dead.push(i);
      }
    }
  }
  for (const i of dead.sort((a, b) => b - a)) bullets.splice(i, 1);
}

export function seedPickups(city) {
  return [
    { kind: 'health', x: 1500, y: 560, taken: false },
    { kind: 'health', x: 2650, y: 1340, taken: false },
    { kind: 'armor', x: 520, y: 1340, taken: false },
    { kind: 'ammo', x: 3050, y: 1690, taken: false },
    { kind: 'cash', x: 900, y: 2100, taken: false, amount: 150 },
    { kind: 'cash', x: 2100, y: 900, taken: false, amount: 150 },
    { kind: 'cash', x: 3300, y: 2400, taken: false, amount: 300 },
    { kind: 'cash', x: 600, y: 600, taken: false, amount: 200 },
  ];
}

export function collectPickups(state) {
  const p = state.player;
  for (const pk of state.pickups) {
    if (pk.taken) continue;
    const dx = pk.x - p.x, dy = pk.y - p.y;
    if (dx * dx + dy * dy < 34 * 34) {
      pk.taken = true;
      if (pk.kind === 'health') p.health = clamp(p.health + 40, 0, 100);
      if (pk.kind === 'armor') p.armor = clamp(p.armor + 50, 0, 100);
      if (pk.kind === 'ammo') { p.ammo.pistol += 24; p.ammo.shotgun += 8; p.ammo.smg += 60; }
      if (pk.kind === 'cash') { p.cash += pk.amount; state.toast(`Found a stash: $${pk.amount}`); }
      if (pk.kind !== 'cash') state.toast(pk.kind === 'health' ? '+40 health' : pk.kind === 'armor' ? '+50 armour' : '+ammo');
    }
  }
}
