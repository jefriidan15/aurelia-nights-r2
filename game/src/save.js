// Aurelia Nights — save system: localStorage persistence for a campaign.
const SAVE_KEY = 'aurelia-nights-save-v1';

export function hasSave() {
  try { return !!window.localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function writeSave(state) {
  const p = state.player;
  const data = {
    version: 1,
    savedAt: new Date().toISOString(),
    cash: p.cash, respect: p.respect, health: p.health, armor: p.armor,
    weapon: p.weapon, weaponsOwned: p.weaponsOwned, ammo: p.ammo,
    missionIndex: state.mission.index,
    x: p.inCar ? p.inCar.x : p.x,
    y: p.inCar ? p.inCar.y : p.y,
    clockMinutes: state.clockMinutes,
  };
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (e) { return null; }
}

export function applySave(state, data) {
  const p = state.player;
  p.cash = data.cash; p.respect = data.respect;
  p.health = data.health; p.armor = data.armor;
  p.weapon = data.weapon; p.weaponsOwned = data.weaponsOwned; p.ammo = data.ammo;
  state.mission.index = data.missionIndex;
  state.mission.active = false; state.mission.step = 0;
  p.x = data.x; p.y = data.y; p.inCar = null;
  state.clockMinutes = data.clockMinutes;
  state.wanted = 0;
}

export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// A short human line for the continue button, or null when there is no save.
export function saveSummary() {
  const data = readSave();
  if (!data) return null;
  const date = new Date(data.savedAt);
  return `Mission ${data.missionIndex + 1}/8 · $${data.cash} · saved ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
