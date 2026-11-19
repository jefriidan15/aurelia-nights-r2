// Aurelia Nights — the city of Aurelia Bay: districts, roads, buildings, docks.
import { makeChance, clamp } from './rngkit.js';

export const WORLD_W = 3600;
export const WORLD_H = 2800;

const DISTRICTS = [
  { name: 'Harbour', x: 0, y: 0, w: 1200, h: 900, tint: '#2e5f7a' },
  { name: 'Old Town', x: 1200, y: 0, w: 1200, h: 900, tint: '#8a6d4b' },
  { name: 'Market Row', x: 2400, y: 0, w: 1200, h: 900, tint: '#7a4b6d' },
  { name: 'Marina', x: 0, y: 900, w: 1200, h: 950, tint: '#3e7a6d' },
  { name: 'North Hills', x: 1200, y: 900, w: 1200, h: 950, tint: '#4b6d3e' },
  { name: 'Dockside', x: 2400, y: 900, w: 1200, h: 950, tint: '#5f5f6d' },
  { name: 'South Beach', x: 0, y: 1850, w: 3600, h: 950, tint: '#a8834f' },
];

const ROOFS = ['#b0563a', '#7a4b3a', '#5f6d8a', '#8a7a4b', '#4b6d5f', '#9a5f7a', '#6d5f8a', '#c08a3e'];
const WALLS = ['#d8c9a8', '#c9b8a0', '#b8a898', '#d0c0b0', '#a89888'];

export function buildCity(seed) {
  const rnd = makeChance(seed);
  const buildings = [];
  const trees = [];
  const lamps = [];
  const roadsV = [];
  const roadsH = [];
  for (let x = 300; x < WORLD_W; x += 400) roadsV.push(x);
  for (let y = 300; y < WORLD_H; y += 400) roadsH.push(y);

  // City blocks between roads; each block holds 1-4 buildings with a yard.
  for (let gx = 0; gx < 8; gx++) {
    for (let gy = 0; gy < 6; gy++) {
      const bx = 340 + gx * 400, by = 340 + gy * 400;
      if (gx === 0 && gy === 5) continue; // beach park stays open
      if (gx >= 6 && gy === 2) continue; // dockyard plaza stays open
      const n = rnd.int(1, 3);
      for (let i = 0; i < n; i++) {
        const w = rnd.range(90, 170), h = rnd.range(80, 150);
        const x = bx + rnd.range(0, 320 - w), y = by + rnd.range(0, 300 - h);
        buildings.push({
          x, y, w, h, roof: rnd.pick(ROOFS), wall: rnd.pick(WALLS),
          tall: rnd.chance(0.22), windows: rnd.int(2, 5),
        });
      }
      if (rnd.chance(0.6)) trees.push({ x: bx + rnd.range(20, 300), y: by + rnd.range(20, 280), r: rnd.range(10, 18) });
    }
  }
  // Dockside cranes + containers along the east edge.
  const docks = [];
  for (let i = 0; i < 6; i++) docks.push({ x: 3300, y: 1000 + i * 130, w: 180, h: 70, kind: i % 2 ? 'container' : 'crane' });
  // Beach strip along the south edge.
  const beach = { x: 0, y: 2620, w: WORLD_W, h: 180 };
  // Landmarks the missions use.
  const landmarks = {
    veraOffice: { x: 1500, y: 520, label: "Vera's Office" },
    gunLocker: { x: 2650, y: 520, label: 'Gun Locker' },
    hospital: { x: 1500, y: 1300, label: 'St. Anselm Hospital' },
    policeHQ: { x: 2650, y: 1300, label: 'ABPD Headquarters' },
    fixerBooth: { x: 520, y: 1300, label: 'Fixer Booth' },
    docksGate: { x: 3050, y: 1650, label: 'Dockside Gate' },
    marinaPier: { x: 520, y: 1750, label: 'Marina Pier' },
    raceStart: { x: 1800, y: 2400, label: 'Beach Race Start' },
  };
  for (let x = 300; x < WORLD_W; x += 400) {
    for (let y = 300; y < WORLD_H; y += 400) lamps.push({ x: x + 24, y: y + 24 });
  }
  return { districts: DISTRICTS, buildings, trees, lamps, docks, beach, landmarks, roadsV, roadsH };
}

export function districtAt(city, x, y) {
  for (const d of city.districts) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Aurelia Bay';
}

export function hitsSolid(city, x, y, pad) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  for (const d of city.docks) {
    if (x > d.x - pad && x < d.x + d.w + pad && y > d.y - pad && y < d.y + d.h + pad) return d;
  }
  return null;
}

export function pushOutOfSolid(city, ent, radius) {
  const hit = hitsSolid(city, ent.x, ent.y, radius);
  if (!hit) return false;
  const cx = clamp(ent.x, hit.x, hit.x + hit.w);
  const cy = clamp(ent.y, hit.y, hit.y + hit.h);
  const dx = ent.x - cx, dy = ent.y - cy;
  const d = Math.hypot(dx, dy) || 1;
  const push = radius - d + 1;
  if (d < 0.01) { ent.y = hit.y - radius - 1; return true; }
  ent.x += (dx / d) * push;
  ent.y += (dy / d) * push;
  return true;
}

export function nearestRoadPoint(city, x, y) {
  let best = null, bd = Infinity;
  for (const rx of city.roadsV) { const d = Math.abs(x - rx); if (d < bd) { bd = d; best = { x: rx, y }; } }
  for (const ry of city.roadsH) { const d = Math.abs(y - ry); if (d < bd) { bd = d; best = { x, y: ry }; } }
  return best;
}

// A random point on a road, for spawning traffic and side-job markers.
export function randomRoadPoint(city, rnd) {
  if (rnd.chance(0.5)) return { x: rnd.pick(city.roadsV), y: rnd.range(200, 2600) };
  return { x: rnd.range(200, 3400), y: rnd.pick(city.roadsH) };
}
