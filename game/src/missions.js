// The six story jobs of Aurelia Nights. Each job is a small state machine:
// stages advance on position, kills, or timers. Pure logic over the shared
// game state G — no DOM, no rendering. Finishing all six crowns the player
// King of Port Aurelia.
import { dist } from './util.js';
import { LANDMARKS } from './world.js';
import { makeGuard } from './combat.js';

export const MISSIONS = [
  {
    id: 1, name: 'Grand Theft Aurelia', reward: 400,
    desc: "Steal any car off the street and deliver it to Big Sal's Chop Shop on the east side. Cops hate car thieves.",
  },
  {
    id: 2, name: 'Heat Wave', reward: 600,
    desc: "Rosa needs a distraction. Hold 3 stars of heat for 60 seconds and stay free. Don't get busted.",
  },
  {
    id: 3, name: 'Pier 9 Shootout', reward: 900,
    desc: 'The Vesper crew guards a crate at the docks. Take out all 6 guards, then grab the crate.',
  },
  {
    id: 4, name: 'The Vault Job', reward: 1500,
    desc: 'Walk into Aurelia National Bank, hold the vault for 20 seconds while the alarm screams, then escape to the safehouse.',
  },
  {
    id: 5, name: 'Four-Star Run', reward: 2000,
    desc: 'Three checkpoints across the city at 4 stars. 150 seconds. No excuses.',
  },
  {
    id: 6, name: 'Lockdown', reward: 3500,
    desc: 'The whole city locks down. Survive 90 seconds at 5 stars, then reach the north airfield extraction. End it.',
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id);
}

// Every job id, in order — the win check is "all of these done".
export const ALL_MISSION_IDS = MISSIONS.map((m) => m.id);

export function freshMissionState() {
  return { id: 0, stage: 0, timer: 0, active: false, marker: null, kills: 0, checkpoints: 0, heatLock: false, data: {} };
}

export function startMission(G, id) {
  const def = missionById(id);
  if (!def || G.mission.active) return false;
  const M = G.mission;
  M.id = id;
  M.stage = 0;
  M.timer = 0;
  M.active = true;
  M.kills = 0;
  M.checkpoints = 0;
  M.heatLock = false;
  M.data = {};
  if (id === 1) {
    M.marker = { x: LANDMARKS.chopShop.x + 75, y: LANDMARKS.chopShop.y + 55, label: 'Chop Shop' };
    G.setObjective(def.name, 'Steal a car (E near any car), then deliver it to the Chop Shop marker.');
  } else if (id === 2) {
    G.setHeat(70, true); // force 3 stars, locked
    M.timer = 60;
    G.setObjective(def.name, 'Survive 60 seconds at 3 stars. Stay out of their hands.');
    G.centerMsg('3 STARS — SURVIVE 60 SECONDS', 3);
  } else if (id === 3) {
    const d = LANDMARKS.docks;
    G.guards = [];
    // Guards stand on the clear pier strip south of the warehouses
    // (y 2410, warehouses end at 2380) — never inside a building, so
    // bullets and the player can always reach them.
    const spots = [
      [700, 2410], [1100, 2410], [1500, 2410],
      [1900, 2410], [2300, 2410], [2700, 2410],
    ];
    for (const [x, y] of spots) G.guards.push(makeGuard(x, y, 3));
    M.marker = { x: d.x, y: d.y, label: 'Pier 9' };
    G.setObjective(def.name, 'Go to Pier 9 and eliminate all 6 Vesper guards.');
  } else if (id === 4) {
    M.marker = { x: 1580, y: 825, label: 'Bank Vault' };
    G.setObjective(def.name, 'Get inside the bank vault zone. The alarm will bring the heat.');
  } else if (id === 5) {
    G.setHeat(90, true); // force 4 stars, locked
    M.timer = 150;
    M.data.points = [
      { x: 700, y: 300, label: 'Checkpoint 1 — Old Town' },
      { x: 3100, y: 650, label: 'Checkpoint 2 — Marina' },
      { x: 1500, y: 2050, label: 'Checkpoint 3 — The Docks' },
    ];
    M.marker = { ...M.data.points[0] };
    G.setObjective(def.name, 'Hit all 3 checkpoints at 4 stars before the timer runs out.');
  } else if (id === 6) {
    G.setHeat(115, true); // force 5 stars, locked
    M.timer = 90;
    G.setObjective(def.name, 'LOCKDOWN: survive 90 seconds at 5 stars. Then run for the airfield.');
    G.centerMsg('5 STARS — LOCKDOWN', 3);
  }
  G.audio.playPickup();
  return true;
}

export function abortMission(G, reason) {
  const M = G.mission;
  if (!M.active) return;
  M.active = false;
  M.id = 0;
  M.stage = 0;
  M.marker = null;
  M.heatLock = false;
  G.guards = [];
  G.setObjective('FREE ROAM', 'Explore Port Aurelia. Press M for missions.');
  if (reason) G.toast(reason, '#ff9a3d');
}

export function completeMission(G) {
  const M = G.mission;
  const def = missionById(M.id);
  if (!def) return;
  G.player.money += def.reward;
  G.completed[M.id] = true;
  G.mission.active = false;
  G.mission.id = 0;
  G.mission.stage = 0;
  G.mission.marker = null;
  G.mission.heatLock = false;
  G.guards = [];
  G.heat = Math.max(0, G.heat - 40);
  G.audio.playMissionDone();
  G.centerMsg('JOB DONE  +$' + def.reward.toLocaleString('en-US'), 3.2);
  G.toast(def.name + ' complete — $' + def.reward.toLocaleString('en-US') + ' paid', '#7dff8a');
  G.setObjective('FREE ROAM', 'Explore Port Aurelia. Press M for missions.');
  if (ALL_MISSION_IDS.every((id) => G.completed[id])) {
    G.allDone = true;
    // The city is yours: the heat comes off so the win screen is not
    // yanked away by a busted a second later.
    G.heat = 0;
    G.wanted = 0;
    setTimeout(() => G.ui.showWin(), 2600);
  }
  G.save();
}

// ---- per-job tick functions ----

function tickChopShop(G, dt) {
  const M = G.mission;
  const p = G.player;
  if (M.stage === 0) {
    if (!p.onFoot && p.car && p.car.stolen) {
      M.stage = 1;
      G.setObjective('Grand Theft Aurelia', 'Car stolen. Deliver it to the Chop Shop marker, east side.');
    }
  } else if (M.stage === 1) {
    if (!p.onFoot && p.car && dist(p.x, p.y, M.marker.x, M.marker.y) < 130) {
      const delivered = p.car;
      const idx = G.cars.indexOf(delivered);
      if (idx >= 0) G.cars.splice(idx, 1);
      p.car = null;
      p.onFoot = true;
      p.x = M.marker.x;
      p.y = M.marker.y + 90;
      completeMission(G);
    }
  }
}

function tickHeatWave(G, dt) {
  const M = G.mission;
  M.timer -= dt;
  G.setObjective('Heat Wave', 'Survive at 3 stars — ' + Math.ceil(M.timer) + 's left. Stay free!');
  if (M.timer <= 0) completeMission(G);
}

function tickPierShootout(G, dt) {
  const M = G.mission;
  const p = G.player;
  if (M.stage === 0) {
    const left = G.guards.filter((g) => !g.dead).length;
    G.setObjective('Pier 9 Shootout', 'Eliminate the Vesper guards — ' + left + ' left.');
    if (left === 0) {
      M.stage = 1;
      M.marker = { x: 1800, y: 2400, label: 'The Crate' };
      G.setObjective('Pier 9 Shootout', 'All guards down. Grab the crate at the far end of the pier.');
    }
  } else if (M.stage === 1) {
    if (p.onFoot && dist(p.x, p.y, M.marker.x, M.marker.y) < 46) completeMission(G);
  }
}

function tickVaultJob(G, dt) {
  const M = G.mission;
  const p = G.player;
  const v = LANDMARKS.vault;
  const inside = p.onFoot && p.x > v.x && p.x < v.x + v.w && p.y > v.y && p.y < v.y + v.h;
  if (M.stage === 0) {
    if (inside) {
      M.stage = 1;
      M.timer = 20;
      G.setHeat(70, true);
      G.setObjective('The Vault Job', 'HOLD THE VAULT — ' + Math.ceil(M.timer) + 's. The alarm is screaming.');
      G.centerMsg('VAULT ALARM — HOLD 20 SECONDS', 2.5);
    }
  } else if (M.stage === 1) {
    M.timer -= dt;
    G.setObjective('The Vault Job', 'HOLD THE VAULT — ' + Math.ceil(Math.max(0, M.timer)) + 's' + (inside ? '' : ' (GET BACK INSIDE!)'));
    if (!inside) M.timer += dt * 0.5; // the hold stalls if you leave
    if (M.timer <= 0) {
      M.stage = 2;
      M.marker = { x: LANDMARKS.playerSpawn.x, y: LANDMARKS.playerSpawn.y, label: 'Safehouse' };
      G.setObjective('The Vault Job', "Vault cracked! Escape to the safehouse — Rosa's Flat.");
    }
  } else if (M.stage === 2) {
    if (dist(p.x, p.y, M.marker.x, M.marker.y) < 80) completeMission(G);
  }
}

function tickFourStarRun(G, dt) {
  const M = G.mission;
  const p = G.player;
  M.timer -= dt;
  const left = Math.max(0, Math.ceil(M.timer));
  G.setObjective('Four-Star Run', 'Checkpoint ' + (M.checkpoints + 1) + ' of 3 — ' + left + 's left.');
  if (M.timer <= 0) {
    abortMission(G, "Time's up — the run failed. Try again from the job board.");
    return;
  }
  if (M.marker && dist(p.x, p.y, M.marker.x, M.marker.y) < 110) {
    M.checkpoints++;
    G.audio.playPickup();
    if (M.checkpoints >= 3) {
      completeMission(G);
      return;
    }
    M.marker = { ...M.data.points[M.checkpoints] };
    G.toast('Checkpoint ' + M.checkpoints + ' of 3!', '#7dff8a');
  }
}

function tickLockdown(G, dt) {
  const M = G.mission;
  const p = G.player;
  if (M.stage === 0) {
    M.timer -= dt;
    G.setObjective('Lockdown', 'Survive the lockdown — ' + Math.ceil(Math.max(0, M.timer)) + 's at 5 stars.');
    if (M.timer <= 0) {
      M.stage = 1;
      M.marker = { x: LANDMARKS.extraction.x + 60, y: LANDMARKS.extraction.y + 60, label: 'Extraction' };
      G.setObjective('Lockdown', 'You survived! Get to the north airfield extraction — NOW.');
      G.centerMsg('EXTRACTION OPEN — GO NORTH', 3);
    }
  } else if (M.stage === 1) {
    if (dist(p.x, p.y, M.marker.x, M.marker.y) < 90) completeMission(G);
  }
}

// Called every frame while a mission is active.
export function updateMission(G, dt) {
  const M = G.mission;
  if (!M.active) return;
  if (M.id === 1) tickChopShop(G, dt);
  else if (M.id === 2) tickHeatWave(G, dt);
  else if (M.id === 3) tickPierShootout(G, dt);
  else if (M.id === 4) tickVaultJob(G, dt);
  else if (M.id === 5) tickFourStarRun(G, dt);
  else if (M.id === 6) tickLockdown(G, dt);
}
