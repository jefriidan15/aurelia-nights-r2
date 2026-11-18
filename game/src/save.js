// Aurelia Nights — localStorage save. One slot, versioned, plain JSON.
// Nothing here ever touches the network; blocked storage just fails soft
// and the game carries on without a save.
export const SAVE_KEY = 'aurelia-nights-save-v3';
export const SAVE_VERSION = 3;

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      v: SAVE_VERSION,
      savedAt: Date.now(),
      money: p.money,
      health: p.health,
      weapon: p.weapon,
      ammo: p.ammo,
      x: p.x,
      y: p.y,
      wanted: G.wanted,
      heat: G.heat,
      clock: G.clock,
      completed: G.completed,
      playSeconds: Math.round(G.time),
      pickups: G.pickupsTaken || 0,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    if (d.v !== SAVE_VERSION && d.v !== 2 && d.v !== 1) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function applySave(G, d) {
  const p = G.player;
  p.money = d.money ?? 250;
  // A save written at 0 HP (saved right after being busted) must not
  // respawn the player dead.
  p.health = Math.max(10, d.health ?? 100);
  p.weapon = d.weapon || (d.hasGun ? 'pistol' : 'none');
  p.hasGun = p.weapon !== 'none';
  p.ammo = d.ammo ?? 0;
  p.x = d.x ?? 700;
  p.y = d.y ?? 1000;
  p.onFoot = true;
  p.car = null;
  G.wanted = d.wanted ?? 0;
  G.heat = d.heat ?? 0;
  G.clock = d.clock ?? 8 * 3600;
  G.completed = d.completed || {};
  G.time = d.playSeconds ?? 0;
  G.pickupsTaken = d.pickups || 0;
}

export function hasSave() {
  return loadSave() !== null;
}

// Small summary for the title screen ("$250, 2/6 jobs done, saved ...").
export function saveSummary() {
  const d = loadSave();
  if (!d) return null;
  return {
    money: d.money ?? 0,
    jobs: Object.values(d.completed || {}).filter(Boolean).length,
    savedAt: d.savedAt,
  };
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
