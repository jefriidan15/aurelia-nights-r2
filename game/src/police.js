// The 5-star wanted system and police cruiser AI. Heat rises with crime and
// cools when the player behaves; cops scale in count, speed and aggression.
import { clamp, dist, angleDiff, rand, pick } from './util.js';
import { WORLD_W, WORLD_H, AVENUES, STREETS } from './world.js';
import { makeCar } from './player.js';
import { damagePlayer } from './player.js';

// Heat thresholds for each star.
export const STAR_HEAT = [0, 20, 45, 70, 90, 115];
export function wantedFromHeat(heat) {
  let w = 0;
  for (let i = 1; i <= 5; i++) if (heat >= STAR_HEAT[i]) w = i;
  return w;
}
export function copsForStars(stars) { return [0, 2, 3, 5, 7, 10][stars]; }

export function makeCop(x, y) {
  const car = makeCar(x, y, 0, { color: '#1c1c22', name: 'Interceptor' });
  car.traffic = false;
  car.isCop = true;
  car.hp = 120;
  car.onFoot = false;
  return car;
}

export function spawnCop(G) {
  const p = G.player;
  // Spawn on a road just outside the camera view.
  const angle = rand(0, Math.PI * 2);
  const r = rand(700, 900);
  let x = clamp(p.x + Math.cos(angle) * r, 120, WORLD_W - 120);
  let y = clamp(p.y + Math.sin(angle) * r, 120, WORLD_H - 120);
  // Snap to the nearest road.
  let best = null, bd = Infinity;
  for (const a of AVENUES) for (const s of STREETS) {
    const d = Math.hypot(a - x, s - y);
    if (d < bd) { bd = d; best = { x: a, y: s }; }
  }
  if (best && bd < 320) { x = best.x; y = best.y; }
  const cop = makeCop(x, y);
  cop.angle = Math.atan2(p.y - y, p.x - x);
  cop.speed = 120;
  G.cops.push(cop);
  G.cars.push(cop);
}

export function updatePolice(G, dt) {
  const p = G.player;
  const stars = G.wanted;
  // Maintain the right number of cruisers.
  const want = copsForStars(stars);
  if (G.cops.length < want && G.copSpawnT <= 0) {
    spawnCop(G);
    G.copSpawnT = stars >= 4 ? 0.9 : 1.6;
  }
  G.copSpawnT -= dt;
  if (stars === 0 && G.cops.length > 0) {
    // Cops give up and drive off once the heat is gone.
    for (const cop of G.cops) cop.givingUp = true;
  }
  for (let i = G.cops.length - 1; i >= 0; i--) {
    const cop = G.cops[i];
    const d = dist(cop.x, cop.y, p.x, p.y);
    if (cop.givingUp) {
      cop.speed = Math.min(cop.speed + 200 * dt, 320);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      if (d > 1500 || cop.x < 40 || cop.x > WORLD_W - 40 || cop.y < 40 || cop.y > WORLD_H - 40) {
        G.cops.splice(i, 1);
        const ci = G.cars.indexOf(cop);
        if (ci >= 0) G.cars.splice(ci, 1);
      }
      continue;
    }
    // Pursuit: steer toward the player, faster and more reckless at higher stars.
    const desired = Math.atan2(p.y - cop.y, p.x - cop.x);
    const top = 300 + stars * 55 + (G.mission.id === 6 ? 40 : 0);
    cop.angle += clamp(angleDiff(cop.angle, desired), -2.6 * dt, 2.6 * dt);
    cop.speed += ((d > 90 ? top : top * 0.4) - cop.speed) * Math.min(1, dt * 1.4);
    // Ram the player when close.
    if (d < 58) {
      if (!p.onFoot && p.car) {
        p.car.speed *= 0.82;
        cop.speed *= 0.7;
        if (Math.abs(cop.speed) > 120) damagePlayer(G, 6, 'rammed by police');
      } else {
        damagePlayer(G, 8, 'beaten by police');
        // Shove the player away so the cop doesn't stick.
        p.x += Math.cos(desired) * 26; p.y += Math.sin(desired) * 26;
      }
      if (Math.random() < dt * 2) G.audio.playCrash();
    }
    // Cops shoot at 3+ stars when the player is on foot and near.
    if (stars >= 3 && p.onFoot && d < 420 && Math.random() < dt * (0.5 + stars * 0.22)) {
      G.fireBullet(cop.x, cop.y, Math.atan2(p.y - cop.y, p.x - cop.x), 640, 'cop');
      G.audio.playGunshot();
    }
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
    cop.x = clamp(cop.x, 24, WORLD_W - 24);
    cop.y = clamp(cop.y, 24, WORLD_H - 24);
    // Cops plough through buildings slowly (they are the law, not the physics).
    // Keep them out of buildings with a soft push.
    for (const b of G.buildings) {
      if (cop.x > b.x - 20 && cop.x < b.x + b.w + 20 && cop.y > b.y - 20 && cop.y < b.y + b.h + 20) {
        cop.angle += 1.4 * dt;
        cop.speed *= 0.985;
      }
    }
  }
}

// Heat: crimes add, time cools. Called every frame.
export function updateHeat(G, dt) {
  const now = G.time;
  if (G.wanted > 0 && now - G.lastCrimeT > 9 && !G.mission.heatLock) {
    G.heat = Math.max(0, G.heat - dt * 2.2);
  }
  const w = wantedFromHeat(G.heat);
  if (w !== G.wanted) {
    G.wanted = w;
    if (w === 0) G.toast('You lost the cops. Heat is off.', '#7dff8a');
  }
}
