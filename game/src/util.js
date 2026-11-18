// Aurelia Nights — small shared helpers for the whole game.
// Pure functions only: no DOM, no game state, no imports. Every other
// module builds on these for angles, randomness and formatting.
export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Blend two headings along the shortest arc.
export function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * t;
}

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Signed turn from a toward b, always in (-PI, PI].
export function angleDiff(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

// Wrap any angle into (-PI, PI].
export function clampAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}

export function randSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

// pairs: [[value, weight], ...] — roll once, return a value.
export function weightedPick(pairs) {
  let total = 0;
  for (const pair of pairs) total += pair[1];
  let roll = Math.random() * total;
  for (const pair of pairs) {
    roll -= pair[1];
    if (roll <= 0) return pair[0];
  }
  return pairs[pairs.length - 1][0];
}

export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

// Seconds of game time -> "HH:MM" on a 24h clock.
export function fmtClock(seconds) {
  const s = ((Math.floor(seconds) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// Seconds -> "M:SS" countdown.
export function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Deterministic 0..1 hash of a pair of integers — stable per-block variety
// (building colours, trees, lit windows) that never changes between loads.
export function hash2(x, y) {
  let h = (Math.imul(x | 0, 2246822519) ^ Math.imul(y | 0, 3266489917)) | 0;
  h = Math.imul(h ^ (h >>> 15), 3266489917);
  h ^= h >>> 13;
  return ((h >>> 0) % 1000) / 1000;
}

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw);
  const ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}
