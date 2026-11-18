// Port Aurelia — the city itself. A fixed 3600 x 2600 hand-laid map: a road
// grid, six districts, the harbour and pier to the south, five shops and the
// mission landmarks. Coordinates are plain data, so the city is identical
// on every load; buildings are generated deterministically from the grid.
import { hash2 } from './util.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;

// Vertical roads (x) and horizontal roads (y). Roads are 92 wide.
export const AVENUES = [300, 700, 1100, 1500, 1900, 2300, 2700, 3100];
export const STREETS = [300, 650, 1000, 1350, 1700, 2050, 2350];
export const ROAD_HALF = 46;
export const WATER_Y = 2450;

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
    desc: 'Pistol $150, shotgun $400, ammo $25 / 24 rounds. Press E at the door.' },
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

const PALETTE = ['#b98d5f', '#8f7fb8', '#7fa8b8', '#b87f7f', '#9a9a8a', '#6f8f7f', '#a8a06f', '#7f8fb8'];

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
      // Wide blocks get two buildings; narrow ones get a single block.
      if (hash2(ix, iy) > 0.55 && bw > 260) {
        const cut = x0 + bw * (0.42 + hash2(ix + 9, iy) * 0.16);
        buildings.push(makeBuilding(x0, y0, cut - x0 - 12, bh, ix, iy));
        buildings.push(makeBuilding(cut + 12, y0, x1 - cut - 12, bh, ix + 40, iy));
      } else {
        buildings.push(makeBuilding(x0, y0, bw, bh, ix, iy));
      }
    }
  }
  // The bank replaces whatever block stood on its lot.
  const bank = LANDMARKS.bank;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.x < bank.x + bank.w && b.x + b.w > bank.x && b.y < bank.y + bank.h && b.y + b.h > bank.y) {
      buildings.splice(i, 1);
    }
  }
  buildings.push({ x: bank.x, y: bank.y, w: bank.w, h: bank.h, color: '#d8c27a', roof: '#8a7420', tall: 3, label: 'BANK', kind: 'bank' });
  // The vault zone is the bank's front plaza: no building may cover it, or
  // the player could never stand inside the vault to hold it.
  const vault = LANDMARKS.vault;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (b.kind !== 'bank' && b.x < vault.x + vault.w && b.x + b.w > vault.x && b.y < vault.y + vault.h && b.y + b.h > vault.y) {
      buildings.splice(i, 1);
    }
  }
  // Dock warehouses along the pier.
  for (let i = 0; i < 5; i++) {
    buildings.push({ x: 350 + i * 620, y: 2260, w: 300, h: 120, color: '#7d8896', roof: '#4a5566', tall: 1, label: 'WAREHOUSE ' + (i + 1), kind: 'dock' });
  }
  return buildings;
}

function makeBuilding(x, y, w, h, ix, iy) {
  const r = hash2(ix * 3 + 1, iy * 7 + 2);
  return {
    x, y, w, h,
    color: PALETTE[Math.floor(r * PALETTE.length)],
    roof: '#00000022',
    tall: 1 + Math.floor(hash2(ix, iy + 5) * 3),
    label: '',
    kind: 'block',
  };
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
export function collideBuildings(buildings, obj, radius) {
  let hit = false;
  for (const b of buildings) {
    const cx = Math.max(b.x, Math.min(obj.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(obj.y, b.y + b.h));
    const dx = obj.x - cx;
    const dy = obj.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 0.0001) {
        // Dead centre of a building: push straight up out of it.
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

export function pointInBuilding(buildings, x, y) {
  for (const b of buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
