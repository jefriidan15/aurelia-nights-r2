// Aurelia Nights — boot: wires input, menus, save and the screenshot hooks.
import { createGame } from './engine.js';
import { makeHud } from './hud.js';
import { makeSound } from './sound.js';
import { hasSave, writeSave, readSave, applySave, saveSummary } from './save.js';
import { SHOP, WEAPONS } from './combat.js';

const canvas = document.getElementById('world');
const hud = makeHud();
const sound = makeSound();
const game = createGame(canvas, hud, sound);
const state = game.state;

const params = new URLSearchParams(location.search);
const shotMode = params.get('shot');

// --- Input ---
const tracked = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'Space'];
window.addEventListener('keydown', (e) => {
  if (tracked.includes(e.code)) e.preventDefault();
  state.keys[e.code] = true;
  if (e.code === 'KeyE' && state.running && !state.paused) game.enterExitCar();
  if (e.code === 'KeyR' && state.running) state.player.weapon = state.player.weapon; // reload is instant for pistols; kept as a feel key
  if (e.code === 'KeyM') { const m = sound.toggleMute(); hud.toast(m ? 'Sound muted' : 'Sound on'); }
  if (e.code === 'KeyJ' && state.running && !state.paused) game.beginMission();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code.startsWith('Digit')) {
    const idx = Number(e.code.slice(5)) - 1;
    const owned = state.player.weaponsOwned;
    if (owned[idx]) { state.player.weapon = owned[idx]; hud.toast(WEAPONS[owned[idx]].name); }
  }
  if (e.code === 'KeyB') game.payOffWanted();
});
window.addEventListener('keyup', (e) => { state.keys[e.code] = false; });
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  state.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  state.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});
canvas.addEventListener('mousedown', (e) => { if (e.button === 0) state.mouse.down = true; });
window.addEventListener('mouseup', () => { state.mouse.down = false; });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function togglePause() {
  if (!state.running) return;
  if (document.getElementById('brief').classList.contains('hidden') === false) return;
  state.paused = !state.paused;
  game.pause(state.paused);
  if (state.paused) {
    const p = state.player;
    hud.showPause(`Cash $${p.cash} · REP ${p.respect} · Mission ${state.mission.index + 1}/8 · Wanted ${state.wanted}★ · Press B near a Fixer Booth to pay off heat · Side jobs: T taxi, C courier`);
  } else hud.hidePause();
}

window.addEventListener('keydown', (e) => {
  if (!state.running || state.paused) return;
  if (e.code === 'KeyT') game.startSideJob('taxi');
  if (e.code === 'KeyC') game.startSideJob('courier');
});

// --- Menus ---
function refreshContinue() {
  const btn = document.getElementById('btn-continue');
  const summary = saveSummary();
  btn.style.display = summary ? '' : 'none';
  if (summary) btn.textContent = `↻  CONTINUE — ${summary}`;
}
document.getElementById('btn-start').addEventListener('click', () => {
  sound.unlock(); sound.startMusic();
  hud.showGame();
  game.start(true);
  hud.toast('Welcome to Aurelia Bay — press J to start Vera\'s first job');
});
document.getElementById('btn-continue').addEventListener('click', () => {
  const data = readSave();
  if (!data) { hud.toast('No save found'); return; }
  sound.unlock(); sound.startMusic();
  hud.showGame();
  game.start(true);
  applySave(state, data);
  state.camera.x = state.player.x; state.camera.y = state.player.y;
  hud.toast('Save loaded — welcome back, Rook');
});
document.getElementById('btn-how').addEventListener('click', () => {
  document.getElementById('howto').classList.toggle('hidden');
});
document.getElementById('btn-resume').addEventListener('click', togglePause);
document.getElementById('btn-save-quit').addEventListener('click', () => {
  writeSave(state);
  game.stop();
  hud.showMenu();
  refreshContinue();
});
document.getElementById('btn-retry').addEventListener('click', () => {
  hud.hideEnd();
  hud.showGame();
  game.start(false);
});
document.getElementById('btn-brief-go').addEventListener('click', () => game.confirmBrief());

// Gun Locker: buy with G when near the locker (keeps the shop out of the HUD).
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyG' || !state.running) return;
  const p = state.player;
  const d = Math.hypot(p.x - 2650, p.y - 520);
  if (d > 90) { hud.toast('Gun Locker is in Market Row — look for the sign'); return; }
  const item = SHOP.find((s) => !p.weaponsOwned.includes(s.id) && s.id !== 'armor' && !s.id.startsWith('ammo')) || SHOP[5];
  if (p.cash < item.price) { hud.toast(`Need $${item.price} for ${item.name}`); return; }
  p.cash -= item.price;
  if (item.id === 'armor') p.armor = 100;
  else if (item.id.startsWith('ammo')) { /* ammo handled by its own key */ }
  else { p.weaponsOwned.push(item.id); p.weapon = item.id; }
  hud.toast(`Bought ${item.name} — $${item.price}`);
  sound.pickup();
});

// Auto-save every 30 seconds of play.
setInterval(() => { if (state.running && !state.paused) writeSave(state); }, 30000);

// --- Screenshot staging (used only by the maker's own captures) ---
// ?shot=cover  -> start screen
// ?shot=chase  -> driving a Falcon GT at 3 stars with police behind
// ?shot=docks  -> on foot at Dockside, mission 3 briefing done, rivals present
// ?shot=night  -> night drive through Market Row with the minimap lit
function stageShot(kind) {
  sound.unlock();
  hud.showGame();
  game.start(true);
  if (kind === 'cover') {
    game.stop();
    hud.showMenu();
    return;
  }
  if (kind === 'chase') {
    const car = state.parked.find((c) => c.model.id === 'falcon') || state.parked[0];
    if (car) {
      state.parked = state.parked.filter((c) => c !== car);
      state.player.inCar = car;
      state.player.x = car.x; state.player.y = car.y;
      car.x = 1100; car.y = 700; car.angle = 0; car.speed = 240;
    }
    game.raiseWanted(3);
    state.clockMinutes = 17 * 60 + 30;
    state.mission.active = true;
    state.mission.index = 4;
    state.mission.step = 0;
  }
  if (kind === 'docks') {
    state.player.x = 2900; state.player.y = 1650;
    state.player.weaponsOwned = ['fists', 'pistol', 'shotgun'];
    state.player.weapon = 'shotgun';
    state.player.ammo.shotgun = 24;
    state.camera.x = 2900; state.camera.y = 1650;
    state.mission.active = true;
    state.mission.index = 2;
    state.mission.step = 1;
    state.mission.killsNeeded = 4;
    game.state.spawnRivals(4, 3050, 1650);
    state.clockMinutes = 10 * 60;
    game.raiseWanted(2);
  }
  if (kind === 'night') {
    const car = state.parked.find((c) => c.model.id === 'falcon') || state.parked[0];
    if (car) {
      state.parked = state.parked.filter((c) => c !== car);
      state.player.inCar = car;
      state.player.x = car.x; state.player.y = car.y;
      car.x = 2500; car.y = 520; car.angle = Math.PI / 2; car.speed = 180;
    }
    state.clockMinutes = 22 * 60 + 15;
    state.player.cash = 2450;
    state.player.respect = 30;
    state.mission.active = true;
    state.mission.index = 3;
    state.mission.step = 1;
    game.raiseWanted(1);
  }
  // Let a few frames run so traffic, cops and the HUD settle before capture.
  setTimeout(() => { state.running = true; }, 50);
}

if (shotMode) stageShot(shotMode);
refreshContinue();

// Test handle: the maker's own playtest reads state, never the network.
window.__AURELIA__ = {
  state, game, hud, sound,
  ready: () => state.running || document.getElementById('menu').classList.contains('hidden') === false,
  errors: [],
};
window.addEventListener('error', (e) => window.__AURELIA__.errors.push(String(e.message)));
