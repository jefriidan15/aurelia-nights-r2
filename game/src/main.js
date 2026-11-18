// Aurelia Nights — bootstrap, game loop, state, interactions, shops.
// All systems live in their own modules; this file wires them together.
//
// ?shot=start|play|chase|docks|night stages a real in-game scene instead of
// the loop and sets window.__shotReady once it is painted (screenshots).
import { clamp, dist, rand } from './util.js';
import { buildCity, SHOPS, LANDMARKS, SHOP_RANGE } from './world.js';
import { keys, pressed, mouse, initInput, endFrame, setKey, setMouse } from './input.js';
import * as audio from './audio.js';
import { makePlayer, makeCar, spawnParkedCar, updatePlayer, enterCar, exitCar, closestCar } from './player.js';
import { spawnTrafficCars, spawnWalkers, spawnCash, updateCars, updateWalkers, updateCash } from './traffic.js';
import { updateCops, updateWanted, starsForHeat } from './police.js';
import { updateShooting, updateBullets, updateGuards, BULLET_LIFE } from './combat.js';
import { freshMissionState, startMission as missionStart, abortMission, updateMission } from './missions.js';
import { saveGame, loadSave, applySave } from './save.js';
import { render } from './render.js';
import { initUI, updateHUD } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// ---- state ----

function createGame() {
  const G = {
    ctx, minimapCtx,
    view: { w: 1280, h: 720 },
    camera: { x: 700, y: 1000, zoom: 1 },
    input: { keys, pressed, mouse },
    audio,
    state: 'title', // title | playing | paused | missions | busted | win
    time: 0,
    clock: 8 * 3600,
    heat: 0,
    wanted: 0,
    lastCrimeT: -999,
    copSpawnT: 0,
    gunfireTimer: 0,
    buildings: buildCity(),
    cars: [],
    peds: [],
    cops: [],
    guards: [],
    bullets: [],
    particles: [],
    pickups: [],
    pickupsTaken: 0,
    muzzle: null,
    mission: freshMissionState(),
    completed: {},
    allDone: false,
    player: makePlayer(LANDMARKS.playerSpawn.x, LANDMARKS.playerSpawn.y),
    fps: 0,
    frames: 0,
    fpsT: 0,
  };
  attachHelpers(G);
  return G;
}

function attachHelpers(G) {
  G.setObjective = (t, x) => { if (G.ui) G.ui.setObjective(t, x); };
  G.toast = (m, c) => { if (G.ui) G.ui.toast(m, c); };
  G.centerMsg = (m, s) => { if (G.ui) G.ui.centerMsg(m, s); };
  G.addWanted = (heat, why) => {
    G.heat = clamp(G.heat + heat, 0, 130);
    G.lastCrimeT = G.time;
    G.wanted = starsForHeat(G.heat);
    void why;
  };
  G.setHeat = (heat, lock) => {
    G.heat = heat;
    G.wanted = starsForHeat(heat);
    G.mission.heatLock = !!lock;
    G.lastCrimeT = G.time;
  };
  G.fireBullet = (x, y, angle, speed, owner) => {
    G.bullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, owner, life: BULLET_LIFE });
    G.muzzle = { x, y, t: 0.06 };
  };
  G.onGuardKilled = (g) => {
    G.mission.kills++;
    G.addWanted(25, 'killed a guard');
    burst(G, g.x, g.y, '#ff3b3b', 14);
    G.toast('Guard down.', '#ff9a3d');
  };
  G.onCopDestroyed = (cop) => {
    G.cops.splice(G.cops.indexOf(cop), 1);
    const ci = G.cars.indexOf(cop);
    if (ci >= 0) G.cars.splice(ci, 1);
    cop.dead = true;
    burst(G, cop.x, cop.y, '#ffb52e', 26);
    G.addWanted(40, 'destroyed a cruiser');
    G.toast('Cruiser destroyed! +heat', '#ff5b5b');
  };
  G.carDestroyed = (car) => {
    car.dead = true;
    burst(G, car.x, car.y, '#ff7b39', 30);
    audio.playCrash();
    if (G.player.car === car) {
      G.player.car = null;
      G.player.onFoot = true;
      G.player.health = Math.max(10, G.player.health - 25);
    }
    G.toast('Your car is wrecked!', '#ff5b5b');
  };
  G.save = () => saveGame(G);
  G.startMission = (id) => missionStart(G, id);
  G.closeMissions = () => {
    G.state = 'playing';
    G.ui.hideScreens();
  };
  G.newGame = () => {
    resetWorld(G);
    G.state = 'playing';
    G.ui.hideScreens();
    G.setObjective('FREE ROAM', 'Explore Port Aurelia. Press M for missions.');
    G.centerMsg('WELCOME TO PORT AURELIA', 3);
  };
  G.continueGame = () => {
    const d = loadSave();
    resetWorld(G);
    if (d) applySave(G, d);
    G.state = 'playing';
    G.ui.hideScreens();
    G.setObjective('FREE ROAM', 'Welcome back. Press M for missions.');
    G.centerMsg('WELCOME BACK, AURELIA', 2.5);
  };
  G.quitToTitle = () => {
    G.state = 'title';
    G.ui.showTitle();
  };
  G.resume = () => {
    if (G.state === 'paused' || G.state === 'missions' || G.state === 'win') {
      G.state = 'playing';
      G.ui.hideScreens();
    }
  };
  G.busted = (cause) => {
    if (G.state !== 'playing') return;
    abortMission(G);
    G.state = 'busted';
    const fine = Math.min(G.player.money, 150);
    G.player.money -= fine;
    audio.playBusted();
    G.ui.showEnd('BUSTED', 'The Port Aurelia PD picked you up (' + cause + '). Fine: $' + fine + '. You wake up at St. Aurelia General.');
  };
  G.respawn = () => {
    const p = G.player;
    p.health = 100;
    p.x = LANDMARKS.hospitalSpawn.x;
    p.y = LANDMARKS.hospitalSpawn.y;
    p.onFoot = true;
    p.car = null;
    G.heat = 0;
    G.wanted = 0;
    G.cops = [];
    G.cars = G.cars.filter((c) => !c.isCop);
    G.state = 'playing';
    G.ui.hideScreens();
    G.setObjective('FREE ROAM', 'Back on your feet. Press M for missions.');
  };
}

const G = createGame();

function burst(G, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(40, 220);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.8), max: 0.8, color, size: rand(2, 5) });
  }
}

function resetWorld(G) {
  G.cars = [];
  G.peds = [];
  G.cops = [];
  G.guards = [];
  G.bullets = [];
  G.particles = [];
  G.pickups = [];
  G.pickupsTaken = 0;
  G.mission = freshMissionState();
  G.completed = {};
  G.allDone = false;
  G.heat = 0;
  G.wanted = 0;
  G.lastCrimeT = -999;
  G.gunfireTimer = 0;
  G.time = 0;
  G.clock = 8 * 3600;
  G.player = makePlayer(LANDMARKS.playerSpawn.x, LANDMARKS.playerSpawn.y);
  spawnTrafficCars(G, 16);
  spawnWalkers(G, 30);
  spawnCash(G, 14);
  // Parked cars worth stealing, scattered on the grid.
  const spots = [
    [700, 300], [1100, 650], [1500, 1000], [2300, 650], [2700, 1350],
    [1100, 1700], [1900, 300], [3100, 1000], [700, 2050], [2300, 2050],
  ];
  for (const [x, y] of spots) {
    G.cars.push(spawnParkedCar(G.buildings, x + rand(-30, 30), y + rand(-30, 30)));
  }
}

// ---- shops ----

function nearestShop(G) {
  let best = null;
  let bd = SHOP_RANGE;
  for (const s of SHOPS) {
    const d = dist(G.player.x, G.player.y, s.x, s.y);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

function useShop(G, shop) {
  const p = G.player;
  if (shop.kind === 'spray') {
    if (p.money < shop.price) { G.toast('Need $100 for a paint job.', '#ff9a3d'); return; }
    if (G.wanted === 0 && (!p.car || p.car.hp >= p.car.maxHp)) { G.toast("You're already clean.", '#7dff8a'); return; }
    p.money -= shop.price;
    G.heat = 0;
    G.wanted = 0;
    if (p.car) p.car.hp = p.car.maxHp;
    G.toast('Fresh paint — wanted level wiped, car repaired.', '#7dff8a');
  } else if (shop.kind === 'gun') {
    if (p.weapon === 'none') {
      if (p.money < 150) { G.toast('A pistol costs $150.', '#ff9a3d'); return; }
      p.money -= 150;
      p.weapon = 'pistol';
      p.hasGun = true;
      p.ammo = 24;
      G.toast('Pistol bought — 24 rounds in the mag.', '#7dff8a');
    } else if (p.weapon === 'pistol') {
      if (p.money < 400) { G.toast('A shotgun costs $400 (or $25 for ammo).', '#ff9a3d'); return; }
      p.money -= 400;
      p.weapon = 'shotgun';
      p.ammo = 12;
      G.toast('Shotgun bought — 12 shells. Close range, big mess.', '#7dff8a');
    } else {
      if (p.money < 25) { G.toast('Ammo is $25 a box.', '#ff9a3d'); return; }
      p.money -= 25;
      p.ammo += 12;
      G.toast('+12 shells. Stay dangerous.', '#7dff8a');
    }
  } else if (shop.kind === 'diner') {
    if (p.health >= 100) { G.toast("You're full up.", '#7dff8a'); return; }
    if (p.money < 20) { G.toast('A meal costs $20.', '#ff9a3d'); return; }
    p.money -= 20;
    p.health = clamp(p.health + 40, 0, 100);
    G.toast('Hot meal — +40 HP.', '#7dff8a');
  } else if (shop.kind === 'hospital') {
    if (p.health >= 100) { G.toast("You're already at full health.", '#7dff8a'); return; }
    if (p.money < 200) { G.toast('Full treatment costs $200.', '#ff9a3d'); return; }
    p.money -= 200;
    p.health = 100;
    G.toast('Patched up — full health.', '#7dff8a');
  } else if (shop.kind === 'safehouse') {
    if (G.save()) G.toast('Game saved at the safehouse.', '#7dff8a');
    else G.toast('Save failed.', '#ff5b5b');
  }
  audio.playPickup();
}

// ---- interaction ----

function handleInteract(G) {
  const p = G.player;
  if (!p.onFoot) {
    exitCar(G);
    return;
  }
  const shop = nearestShop(G);
  if (shop) {
    useShop(G, shop);
    return;
  }
  const car = closestCar(G, 64);
  if (car) enterCar(G, car);
}

function interactionPrompt(G) {
  const p = G.player;
  if (!p.onFoot) return '[E] Exit car';
  const shop = nearestShop(G);
  if (shop) return '[E] ' + shop.name + ' — ' + shop.desc;
  const car = closestCar(G, 64);
  if (car) return '[E] Steal the ' + car.name + ' (' + car.color + ')';
  return '';
}

// ---- one simulation step (shared by the live loop and shot staging) ----

function stepWorld(G, dt) {
  G.time += dt;
  G.clock += dt * 60; // 1 real second = 1 game minute
  G.gunfireTimer = Math.max(0, G.gunfireTimer - dt);
  if (G.muzzle) {
    G.muzzle.t -= dt;
    if (G.muzzle.t <= 0) G.muzzle = null;
  }
  updatePlayer(G, dt);
  updateShooting(G, dt);
  updateCars(G, dt);
  updateWalkers(G, dt);
  updateCash(G, dt);
  updateCops(G, dt);
  updateWanted(G, dt);
  updateBullets(G, dt);
  updateGuards(G, dt);
  updateMission(G, dt);
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  // Camera follows the player.
  const p = G.player;
  const targetZoom = p.onFoot ? 1.0 : 0.82;
  G.camera.zoom += (targetZoom - G.camera.zoom) * Math.min(1, dt * 3);
  G.camera.x += (p.x - G.camera.x) * Math.min(1, dt * 6);
  G.camera.y += (p.y - G.camera.y) * Math.min(1, dt * 6);
}

function stepFrame(G, dt) {
  stepWorld(G, dt);
  const p = G.player;
  const driving = !p.onFoot && p.car;
  audio.setEngine(driving ? Math.abs(p.speed || 0) / 560 : 0, !!driving);
  audio.setSiren(G.wanted > 0 && G.cops.length > 0);
  G.ui.setPrompt(interactionPrompt(G));
  updateHUD(G);
}

// ---- main loop ----

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.frames++;
  G.fpsT += dt;
  if (G.fpsT >= 1) {
    G.fps = Math.round(G.frames / G.fpsT);
    G.frames = 0;
    G.fpsT = 0;
  }

  if (pressed.mute) {
    const m = audio.toggleMute();
    G.toast(m ? 'Muted' : 'Sound on', '#d7e2ff');
  }
  if (G.state === 'playing') {
    if (pressed.pause) {
      G.state = 'paused';
      G.ui.showPause();
    } else if (pressed.missions) {
      G.state = 'missions';
      G.ui.showMissions(G);
    } else if (pressed.interact) {
      handleInteract(G);
    } else {
      stepFrame(G, dt);
    }
  } else if (G.state === 'paused' && pressed.pause) {
    G.resume();
  } else if (G.state === 'missions' && pressed.missions) {
    G.closeMissions();
  }
  if (G.state === 'playing' || G.state === 'paused' || G.state === 'missions' || G.state === 'busted') {
    render(G);
  }
  endFrame();
}

// ---- screenshot staging (?shot=...) ----

function stageShot(name) {
  const STEP = 1 / 60;
  const driveFor = (seconds) => {
    setKey('up', true);
    for (let i = 0; i < seconds / STEP; i++) stepWorld(G, STEP);
    setKey('up', false);
  };
  const putInCar = (x, y) => {
    const car = makeCar(x, y, 0, { color: '#d23b3b', name: 'Vesper', owned: true });
    G.cars.push(car);
    G.player.x = x;
    G.player.y = y;
    enterCar(G, car);
  };
  if (name === 'start') {
    // Title screen over the live city at dawn.
    G.clock = 8 * 3600;
    G.state = 'title';
    G.ui.showTitle();
    render(G);
  } else if (name === 'play') {
    G.newGame();
    putInCar(700, 1000);
    G.player.car.angle = Math.PI / 2;
    driveFor(5);
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    render(G);
  } else if (name === 'chase') {
    G.newGame();
    G.setHeat(70, false);
    putInCar(1500, 1000);
    G.player.car.angle = 0;
    driveFor(4);
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    render(G);
  } else if (name === 'docks') {
    G.newGame();
    G.player.weapon = 'pistol';
    G.player.hasGun = true;
    G.player.ammo = 24;
    G.startMission(3);
    G.player.x = LANDMARKS.docks.x - 200;
    G.player.y = LANDMARKS.docks.y - 120;
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    for (let i = 0; i < 2 / STEP; i++) stepWorld(G, STEP);
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    render(G);
  } else if (name === 'night') {
    G.newGame();
    G.clock = 22 * 3600;
    putInCar(1900, 650);
    G.player.car.angle = Math.PI / 2;
    driveFor(3);
    G.camera.x = G.player.x;
    G.camera.y = G.player.y;
    render(G);
  } else {
    G.state = 'title';
    G.ui.showTitle();
    render(G);
  }
  // The staged scenes drive the simulation directly (stepWorld), which
  // never runs the HUD update — refresh it once so the DOM matches G.
  // Clear the new-game banner too, so the shot shows the city, not the title card.
  if (G.state === 'playing') {
    updateHUD(G);
    G.centerMsg('', 0.01);
  }
  window.__shotReady = true;
}

// ---- boot ----

resetWorld(G);
initInput(canvas);
initUI(G);
G.ui.showTitle();

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  // Stage the scene, paint it twice, then signal the screenshot tool.
  stageShot(shot);
  requestAnimationFrame(() => {
    render(G);
    requestAnimationFrame(() => {
      render(G);
      window.__shotReady = true;
    });
  });
} else {
  requestAnimationFrame(frame);
}

// Test / debug hooks (harmless in normal play, used by automated playtests).
window.AURELIA = {
  G,
  version: '5.0.0-round5',
  newGame: () => G.newGame(),
  startMission: (id) => G.startMission(id),
  step: (dt) => { if (G.state === 'playing') stepFrame(G, dt || 1 / 60); },
  teleport: (x, y) => {
    G.player.x = x;
    G.player.y = y;
    if (G.player.car) {
      G.player.car.x = x;
      G.player.car.y = y;
    }
    G.camera.x = x;
    G.camera.y = y;
  },
  setWanted: (stars) => { G.setHeat([0, 20, 45, 70, 90, 115][stars] || 0, false); },
  setClock: (hours) => { G.clock = hours * 3600; },
  giveMoney: (n) => { G.player.money += n; },
  giveGun: () => { G.player.weapon = 'pistol'; G.player.hasGun = true; G.player.ammo = 999; },
  giveShotgun: () => { G.player.weapon = 'shotgun'; G.player.hasGun = true; G.player.ammo = 999; },
  setKey,
  setMouse,
  state: () => ({
    state: G.state,
    money: G.player.money,
    health: G.player.health,
    weapon: G.player.weapon,
    ammo: G.player.ammo,
    wanted: G.wanted,
    heat: Math.round(G.heat),
    x: Math.round(G.player.x),
    y: Math.round(G.player.y),
    onFoot: G.player.onFoot,
    speed: Math.round(G.player.speed || 0),
    mission: G.mission.id,
    missionStage: G.mission.stage,
    missionActive: G.mission.active,
    completed: G.completed,
    fps: G.fps,
    cars: G.cars.length,
    cops: G.cops.length,
    guards: G.guards.filter((g) => !g.dead).length,
    bullets: G.bullets.length,
    clock: G.clock,
    pickups: (G.pickups || []).filter((p) => !p.taken).length,
  }),
};
