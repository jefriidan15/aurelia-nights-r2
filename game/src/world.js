// Port Aurelia: the city itself. A fixed grid of streets and blocks, a harbour
// with docks along the south-east water, and every named place the missions
// and shops need. All geometry is generated once, deterministically.
import { hashStr, randInt, pick } from './util.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const BLOCK = 360;      // block pitch
export const ROAD_W = 72;      // road band width

const PALETTES = [
  ['#8a7f6a', '#6f7d8c', '#a08a6a', '#7a6a8a', '#6a8a72'],
  ['#9c8a70', '#7d8a94', '#b09a7a', '#8a7a9c', '#7a9a82'],
];

// Named places. x/y are world coordinates, r is the interaction radius.
export const PLACES = {
  sprayShop:   { name: 'Spray Shop',      kind: 'spray',    x: 540,  y: 1116, r: 90,  blurb: 'New paint, clean plates. Heat gone.' },
  gunShop:     { name: 'Ironclad Arms',   kind: 'gun',      x: 1980, y: 396,  r: 90,  blurb: 'Pistols, SMGs, ammo. Cash only.' },
  diner:       { name: 'Gull Diner',      kind: 'diner',    x: 2700, y: 1476, r: 90,  blurb: 'Coffee, pie, and a patch-up.' },
  safehouse:   { name: 'Safehouse',       kind: 'safe',     x: 900,  y: 2196, r: 110, blurb: 'Nobody looks for you here.' },
  hospital:    { name: 'St. Marrow Hospital', kind: 'hospital', x: 3060, y: 756, r: 110, blurb: 'They stitch you up. They charge you too.' },
  bank:        { name: 'Aurelia National Bank', kind: 'bank', x: 1800, y: 900, r: 130, blurb: 'The vault. The big one.' },
  docks:       { name: 'Harbour Docks',   kind: 'docks',    x: 2880, y: 2340, r: 160, blurb: 'Crates, cranes, and men with guns.' },
  extraction:  { name: 'Pier 9 Extraction', kind: 'extract', x: 3420, y: 2340, r: 120, blurb: 'The boat out. Run.' },
  start:       { name: 'Rook\'s Flat',    kind: 'start',    x: 900,  y: 756,  r: 60,  blurb: '' },
};

export class World {
  constructor() {
    this.buildings = [];
    this.trees = [];
    this.crates = [];
    this.lamps = [];
    this._buildCity();
  }

  _buildCity() {
    // City blocks: for each grid cell, a building footprint inset from the road.
    for (let bx = 0; bx < 10; bx++) {
      for (let by = 0; by < 7; by++) {
        const cx = bx * BLOCK + BLOCK / 2;
        const cy = by * BLOCK + BLOCK / 2;
        // Harbour water occupies the far south-east corner; docks replace buildings there.
        if (bx >= 8 && by >= 6) continue;
        if (bx >= 9 && by >= 5) continue;
        const h = hashStr(`b${bx},${by}`);
        const pal = PALETTES[h % PALETTES.length];
        const w = 180 + (h % 36); // capped at 215: a wider block would jut into the road
        const hh = 130 + ((h >> 3) % 80);
        const color = pal[h % pal.length];
        const roof = (h >> 5) % 3;
        this.buildings.push({ x: cx - w / 2, y: cy - hh / 2, w, h: hh, color, roof, id: `b${bx},${by}` });
        // A couple of trees / props per block, kept off the roads.
        const nTrees = 1 + (h % 3);
        for (let t = 0; t < nTrees; t++) {
          const tx = cx + ((h >> (6 + t * 3)) % 220) - 110;
          const ty = cy + ((h >> (9 + t * 3)) % 160) - 80;
          if (Math.abs(tx - cx) < w / 2 + 14 && Math.abs(ty - cy) < hh / 2 + 14) continue;
          this.trees.push({ x: tx, y: ty });
        }
      }
    }
    // Dock crates in the harbour yard.
    for (let i = 0; i < 26; i++) {
      this.crates.push({
        x: 2620 + (i % 6) * 95 + randInt(-12, 12),
        y: 2180 + Math.floor(i / 6) * 80 + randInt(-10, 10),
        w: 62, h: 52,
        color: pick(['#a8763e', '#7a6a3e', '#5e7a8c', '#8c5e5e']),
      });
    }
    // Street lamps along the main avenues.
    for (let gx = 0; gx <= 10; gx++) {
      for (let gy = 0; gy <= 7; gy++) {
        if ((gx + gy) % 2 === 0) this.lamps.push({ x: gx * BLOCK + 46, y: gy * BLOCK + 46 });
      }
    }
  }

  isRoad(x, y) {
    if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) return false;
    const mx = ((x % BLOCK) + BLOCK) % BLOCK;
    const my = ((y % BLOCK) + BLOCK) % BLOCK;
    return mx < ROAD_W || my < ROAD_W;
  }

  isWater(x, y) {
    // The harbour: south-east water band below the docks.
    return x > 2500 && y > 2450;
  }

  // Solid for cars and on-foot movement: buildings, crates, water edge.
  collidesCircle(x, y, r) {
    for (const b of this.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
    }
    for (const c of this.crates) {
      if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return c;
    }
    if (this.isWater(x, y)) return { water: true };
    if (x < 20 || y < 20 || x > WORLD_W - 20 || y > WORLD_H - 20) return { edge: true };
    return null;
  }

  // Slide a circle along solids: try full move, then x-only, then y-only.
  moveCircle(x, y, dx, dy, r) {
    if (!this.collidesCircle(x + dx, y + dy, r)) return { x: x + dx, y: y + dy };
    if (!this.collidesCircle(x + dx, y, r)) return { x: x + dx, y };
    if (!this.collidesCircle(x, y + dy, r)) return { x, y: y + dy };
    return { x, y };
  }

  nearestRoadPoint(x, y) {
    // Snap to the centre of the nearest road band.
    const mx = ((x % BLOCK) + BLOCK) % BLOCK;
    const my = ((y % BLOCK) + BLOCK) % BLOCK;
    const cx = mx < ROAD_W ? x - mx + ROAD_W / 2 : x;
    const cy = my < ROAD_W ? y - my + ROAD_W / 2 : y;
    return { x: cx, y: cy };
  }

  // The angle a car parked/driving at a road point must face: along the road.
  roadAngle(x, y) {
    const my = ((y % BLOCK) + BLOCK) % BLOCK;
    const onHorizontal = my < ROAD_W;
    if (onHorizontal) return Math.random() < 0.5 ? 0 : Math.PI;
    return Math.random() < 0.5 ? Math.PI / 2 : (Math.PI * 3) / 2;
  }

  // A random point on a road, away from a given point.
  randomRoadPoint(minDistFrom) {
    for (let tries = 0; tries < 40; tries++) {
      const gx = randInt(0, 9), gy = randInt(0, 6);
      const horizontal = Math.random() < 0.5;
      const x = horizontal ? gx * BLOCK + randInt(40, BLOCK - 40) : gx * BLOCK + ROAD_W / 2;
      const y = horizontal ? gy * BLOCK + ROAD_W / 2 : gy * BLOCK + randInt(40, BLOCK - 40);
      if (minDistFrom && Math.hypot(x - minDistFrom.x, y - minDistFrom.y) < 500) continue;
      if (this.isWater(x, y)) continue;
      return { x, y };
    }
    return { x: 540, y: 36 };
  }

  placeAt(kind) {
    return PLACES[kind];
  }
}
