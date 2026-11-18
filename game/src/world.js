// Port Aurelia — the city. A fixed 3600 x 2600 map, hand-laid: a road
// grid, six districts, the harbour and pier down south, five shops and
// the landmarks the jobs need. Coordinates are plain data, so the city is
// identical on every load; buildings are generated from the grid with a
// deterministic hash, so no two blocks look the same twice.
import { hash2, rectsOverlap } from './util.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;

// Roads are 92 wide. Avenues run north-south, streets east-west.
export const AVENUES = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const STREETS = [300, 650, 1000, 1350, 1700, 2050, 2350];
export const ROAD_HALF = 46;
export const WATER_Y = 2450;
export const SHOP_RANGE = 80; // how close the player must stand to use a shop

export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1200, h: 800, tint: '#c9a06a' },
  { name: 'Downtown', x: 1200, y: 0, w: 1300, h: 1000, tint: '#7a8fd0' },
  { name: 'Marina', x: 2500, y: 0, w: 1100, h: 900, tint: '#6ac9b8' },
  { name: 'Little Vesper', x: 0, y: 800, w: 1400, h: 900, tint: '#d08a7a' },
  { name: 'Midtown', x: 1400, y: 1000, w: 1300, h: 900, tint: '#9a7ad0' },
  { name: 'The Docks', x: 0, y: 1900, w: 3600, h: 550, tint: '#8a94a8' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Port Aurelia';
}

export const SHOPS = [
  { id: 'spray', kind: 'spray', name: "Lola's Paint — Spray Shop", short: 'Spray Shop', x: 700, y: 560, price: 100,
    desc: 'Fresh paint, clean plates. Wanted level wiped, car repaired.' },
  { id: 'gun', kind: 'gun', name: 'Iron & Oak — Gun Shop', short: 'Gun Shop', x: 1900, y: 1260, price: 150,
    desc: 'Pistol $150, shotgun $400, ammo $25 / 12 rounds. Press E at the door.' },
  { id: 'diner', kind: 'diner', name: 'The Golden Gull — Diner', short: 'Diner', x: 1100, y: 1560, price: 20,
    desc: 'A hot meal heals 40 HP for $20.' },
  { id: 'hospital', kind: 'hospital', name: 'St. Aurelia General', short: 'Hospital', x: 2700, y: 910, price: 200,
    desc: 'Full heal $200. Busted? You wake up here.' },
  { id: 'safehouse', kind: 'safehouse', name: "Rosa's Flat — Safehouse", short: 'Safehouse', x: 700, y: 960, price: 0,
    desc: 'Your flat. Save the game here, free.' },
];

export const LANDMARKS = {
  bank: { x: 1500, y: 650, w: 170, h: 120, name: 'Aurelia National Bank' },
  chopShop: { x: 3100, y: 2050, w: 150, h: 110, name: "Big Sal's Chop Shop" },
  docks: { x: 1500, y: 2400, w: 700, h: 130, name: 'Pier 9 — The Docks' },
  vault: { x: 1480, y: 750, w: 200, h: 150, name: 'Bank Vault Door' },
  extraction: { x: 3300, y: 300, w: 120, h: 120, name: 'North Airfield' },
  hospitalSpawn: { x: 2700, y: 1010 },
  playerSpawn: { x: 700, y: 1000 },
};

const PALETTE = ['#a87f52', '#7d6ea8', '#6f97a8', '#a86f6f', '#8a8a72', '#5f7f6f', '#97895f', '#6f7fa8'];

function makeBuilding(x, y, w, h, ix, iy) {
  const r = hash2(ix * 5 + 3, iy * 11 + 7);
  return {
    x, y, w, h,
    color: PALETTE[Math.floor(r * PALETTE.length)],
    roof: '#00000022',
    tall: 1 + Math.floor(hash2(ix + 2, iy + 9) * 3),
    label: '',
    kind: 'block',
  };
}

// Drop every building that overlaps a rect (except ones whose kind is in
// keepKinds). Used to clear the bank lot, the vault plaza, and so on.
function carveOut(buildings, rect, keepKinds = []) {
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (keepKinds.includes(b.kind)) continue;
    if (rectsOverlap(b.x, b.y, b.w, b.h, rect.x, rect.y, rect.w, rect.h)) {
      buildings.splice(i, 1);
    }
  }
}

export function buildCity() {
  const buildings = [];
  for (let ix = 0; ix < AVENUES.length - 1; ix++) {
    for (let iy = 0; iy < STREETS.length - 1; iy++) {
      const x0 = AVENUES[ix] + ROAD_HALF + 14;
      const x1 = AVENUES[ix + 1] - ROAD_HALF - 14;
      const y0 = STREETS[iy] + ROAD_HALF + 14;
      const y1 = STREETS[iy + 1] - ROAD_HALF - 14;
      const bw = x1 - x0;
      const bh = y1 - y0;
      if (bw < 90 || bh < 90) continue;
      // Wide blocks get split in two; the split point varies per block.
      const roll = hash2(ix + 4, iy + 4);
      if (roll > 0.5 && bw > 260) {
        const cut = x0 + bw * (0.38 + hash2(ix + 13, iy + 3) * 0.24);
        buildings.push(makeBuilding(x0, y0, cut - x0 - 12, bh, ix, iy));
        buildings.push(makeBuilding(cut + 12, y0, x1 - cut - 12, bh, ix + 50, iy + 2));
      } else if (roll > 0.22 && bh > 220) {
        // Tall blocks split horizontally instead.
        const cut = y0 + bh * (0.4 + hash2(ix + 7, iy + 11) * 0.2);
        buildings.push(makeBuilding(x0, y0, bw, cut - y0 - 12, ix, iy));
        buildings.push(makeBuilding(x0, cut + 12, bw, y1 - cut - 12, ix + 3, iy + 40));
      } else {
        buildings.push(makeBuilding(x0, y0, bw, bh, ix, iy));
      }
    }
  }
  // The bank sits on its own lot.
  const bank = LANDMARKS.bank;
  carveOut(buildings, bank);
  buildings.push({ x: bank.x, y: bank.y, w: bank.w, h: bank.h, color: '#d8c27a', roof: '#8a7420', tall: 3, label: 'BANK', kind: 'bank' });
  // The vault zone is the bank's front plaza: it must stay walkable, or
  // the player could never stand inside the vault to hold it.
  carveOut(buildings, LANDMARKS.vault, ['bank']);
  // Dock warehouses along the pier.
  for (let i = 0; i < 5; i++) {
    buildings.push({ x: 350 + i * 620, y: 2260, w: 300, h: 120, color: '#7d8896', roof: '#4a5566', tall: 1, label: 'WAREHOUSE ' + (i + 1), kind: 'dock' });
  }
  return buildings;
}

export function isOnRoad(x, y) {
  if (y >= WATER_Y) return false;
  for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_HALF) return true;
  for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_HALF) return true;
  return false;
}

export function isWater(x, y) {
  return y >= WATER_Y;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bd = Infinity;
  for (const ax of AVENUES) {
    for (const sy of STREETS) {
      const d = Math.hypot(ax - x, sy - y);
      if (d < bd) {
        bd = d;
        best = { x: ax, y: sy };
      }
    }
  }
  return best;
}

// Push a circle out of every building rectangle it overlaps.
// Returns true when a collision happened.
export function pushOutOfBuildings(buildings, obj, radius) {
  let hit = false;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(obj.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(obj.y, b.y + b.h));
    const dx = obj.x - cx;
    const dy = obj.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) {
        // Dead centre of a building: shove straight up out of it.
        obj.y = b.y - radius;
      } else {
        const d = Math.sqrt(d2);
        obj.x = cx + (dx / d) * radius;
        obj.y = cy + (dy / d) * radius;
      }
      hit = true;
    }
  }
  return hit;
}

export function buildingAt(buildings, x, y) {
  for (const b of buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
