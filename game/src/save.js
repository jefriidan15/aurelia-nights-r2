// localStorage save / load. One slot, versioned, plain JSON.
export const SAVE_KEY = 'aurelia-nights-save-v1';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      v: 1,
      savedAt: Date.now(),
      money: p.money,
      health: p.health,
      hasGun: p.hasGun,
      ammo: p.ammo,
      x: p.x, y: p.y,
      wanted: G.wanted,
      heat: G.heat,
      clock: G.clock,
      completed: G.completed,
      playSeconds: Math.round(G.time),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch (e) { return null; }
}

export function applySave(G, d) {
  const p = G.player;
  p.money = d.money ?? 250;
  p.health = d.health ?? 100;
  p.hasGun = !!d.hasGun;
  p.ammo = d.ammo ?? 0;
  p.x = d.x ?? 700; p.y = d.y ?? 1000;
  p.onFoot = true; p.car = null;
  G.wanted = d.wanted ?? 0;
  G.heat = d.heat ?? 0;
  G.clock = d.clock ?? 8 * 3600;
  G.completed = d.completed || {};
  G.time = d.playSeconds ?? 0;
}

export function hasSave() { return loadSave() !== null; }
