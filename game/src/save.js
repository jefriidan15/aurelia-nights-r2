// Save / load through localStorage. One slot, versioned, plain JSON.
export const SAVE_KEY = 'aurelia-nights-save-v1';

export function writeSave(game) {
  try {
    const p = game.player;
    const data = {
      v: 1,
      savedAt: Date.now(),
      money: Math.floor(p.money),
      health: Math.floor(p.health),
      x: Math.round(p.x),
      y: Math.round(p.y),
      wanted: p.wanted,
      weapon: p.weapon,
      weapons: p.weapons,
      timeOfDay: game.timeOfDay,
      missions: game.missions.saveState(),
      stats: game.stats,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err && err.message ? err.message : err) };
  }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return readSave() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* storage unavailable */ }
}
