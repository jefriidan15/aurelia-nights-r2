// Aurelia Nights — shared math and formatting helpers. No dependencies,
// no DOM, no state: every other module imports from here.
export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

// Shortest signed turn from angle a toward angle b, in (-PI, PI].
export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= TAU;
  while (d <= -Math.PI) d += TAU;
  return d;
}

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function randi(a, b) {
  return Math.floor(rand(a, b + 1));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function choiceWeighted(pairs) {
  // pairs: [[value, weight], ...]; returns a value.
  let total = 0;
  for (const [, w] of pairs) total += w;
  let roll = Math.random() * total;
  for (const [v, w] of pairs) {
    roll -= w;
    if (roll <= 0) return v;
  }
  return pairs[pairs.length - 1][0];
}

export function fmtMoney(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function fmtClock(seconds) {
  const s = ((Math.floor(seconds) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// Deterministic 0..1 hash of integer grid coords — stable building colours
// and per-block variation that never changes between loads.
export function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 1000) / 1000;
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
