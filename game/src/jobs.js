// Aurelia Nights — jobs: Vera Solano's eight story missions plus side work.
import { makeChance } from './rngkit.js';

export const STORY = [
  {
    id: 'm1', title: 'First Shift', giver: 'Vera Solano',
    brief: 'Vera needs a driver she can trust. Get to her office in Old Town and pick up the package — no questions, no detours.\n\nReward: $300',
    steps: [
      { type: 'goto', label: 'Go to Vera\'s office', x: 1500, y: 520 },
      { type: 'goto', label: 'Deliver the package to the Marina Pier', x: 520, y: 1750 },
    ],
    reward: 300,
  },
  {
    id: 'm2', title: 'Borrowed Wheels', giver: 'Vera Solano',
    brief: 'A client wants a Falcon GT, and he wants it tonight. Steal one — any Falcon GT on the street will do — and bring it to the Dockside Gate.\n\nReward: $450',
    steps: [
      { type: 'steal', label: 'Steal a Falcon GT', model: 'falcon' },
      { type: 'deliverCar', label: 'Deliver the Falcon to the Dockside Gate', x: 3050, y: 1650 },
    ],
    reward: 450,
  },
  {
    id: 'm3', title: 'Harbour Gulls', giver: 'Vera Solano',
    brief: 'The Harbour Gulls crew jumped one of our couriers at the docks. Go to the Dockside Gate and teach them the price of touching Vera\'s people.\n\nReward: $600',
    steps: [
      { type: 'goto', label: 'Reach the Dockside Gate', x: 3050, y: 1650 },
      { type: 'clear', label: 'Deal with the Gulls (4)', count: 4 },
      { type: 'goto', label: 'Report back to Vera\'s office', x: 1500, y: 520 },
    ],
    reward: 600,
  },
  {
    id: 'm4', title: 'Night Courier', giver: 'Vera Solano',
    brief: 'Three parcels, three drops, one night. Marina Pier, the Fixer Booth, then the Gun Locker. The police are watching the bridges — keep it quiet.\n\nReward: $700',
    steps: [
      { type: 'goto', label: 'Drop 1: Marina Pier', x: 520, y: 1750 },
      { type: 'goto', label: 'Drop 2: Fixer Booth', x: 520, y: 1300 },
      { type: 'goto', label: 'Drop 3: Gun Locker', x: 2650, y: 520 },
    ],
    reward: 700,
  },
  {
    id: 'm5', title: 'Beach Sprint', giver: 'Vera Solano',
    brief: 'The South Beach crowd runs a street race at midnight and the purse is fat. Beat the course: start at the beach, hit every checkpoint, finish where you began.\n\nReward: $900',
    steps: [
      { type: 'goto', label: 'Reach the race start on South Beach', x: 1800, y: 2400 },
      { type: 'race', label: 'Hit all 4 checkpoints', checkpoints: [
        { x: 900, y: 2400 }, { x: 900, y: 1200 }, { x: 2700, y: 1200 }, { x: 2700, y: 2400 },
      ]},
    ],
    reward: 900,
  },
  {
    id: 'm6', title: 'The Informant', giver: 'Vera Solano',
    brief: 'An ABPD informant is talking. He is hiding near the hospital with two Gulls guarding him. Bring him to Vera — alive. The police will not like it.\n\nReward: $1,100',
    steps: [
      { type: 'goto', label: 'Reach St. Anselm Hospital', x: 1500, y: 1300 },
      { type: 'clear', label: 'Deal with the guards (2)', count: 2 },
      { type: 'goto', label: 'Escort the informant to Vera\'s office', x: 1500, y: 520 },
    ],
    reward: 1100,
  },
  {
    id: 'm7', title: 'Dockside Firefight', giver: 'Vera Solano',
    brief: 'The Gulls are moving a shipment through Dockside at dawn. Hit the gate, hold the yard, and take the ledger from their lieutenant. Bring a gun.\n\nReward: $1,500',
    steps: [
      { type: 'goto', label: 'Reach the Dockside Gate', x: 3050, y: 1650 },
      { type: 'clear', label: 'Clear the dockyard (6)', count: 6 },
      { type: 'goto', label: 'Take the ledger to Vera\'s office', x: 1500, y: 520 },
    ],
    reward: 1500,
  },
  {
    id: 'm8', title: 'Aurelia Nights', giver: 'Vera Solano',
    brief: 'One last job. The whole ABPD is on the street tonight, and Vera\'s ledger has to reach the Marina Pier by boat. Get there, lose the heat, and the city is yours.\n\nReward: $2,500',
    steps: [
      { type: 'goto', label: 'Reach the Marina Pier', x: 520, y: 1750 },
      { type: 'escape', label: 'Lose the wanted level', },
      { type: 'goto', label: 'Board the boat at the Marina Pier', x: 520, y: 1750 },
    ],
    reward: 2500,
  },
];

// A one-line label for the pause menu's side-job list.
export function sideJobLabel(job) {
  if (!job) return 'No side job running';
  if (job.kind === 'taxi') return `Taxi — ${job.stage === 'pickup' ? 'pick up the passenger' : 'drive to the drop-off'} ($${job.fare})`;
  return `Courier — deliver the parcel ($${job.fare})`;
}

export function missionState() {
  return { index: 0, step: 0, active: false, killsNeeded: 0, killsDone: 0, raceHits: 0, done: false };
}

// Side work the player can start from the pause menu / by driving to a marker.
export function makeTaxiJob(rnd, city) {
  const px = rnd.pick(city.roadsV), py = rnd.pick(city.roadsH);
  const dx = rnd.pick(city.roadsV), dy = rnd.pick(city.roadsH);
  return { kind: 'taxi', pickup: { x: px, y: py }, dropoff: { x: dx, y: dy }, fare: rnd.int(80, 220), stage: 'pickup' };
}

export function makeCourierJob(rnd, city) {
  const dx = rnd.pick(city.roadsV), dy = rnd.pick(city.roadsH);
  return { kind: 'courier', dropoff: { x: dx, y: dy }, fare: rnd.int(100, 260), stage: 'deliver' };
}

// Advance the active story step; returns an event string or null.
export function advanceStory(state) {
  const m = STORY[state.mission.index];
  if (!m || !state.mission.active) return null;
  const step = m.steps[state.mission.step];
  const p = state.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  const near = (x, y, r = 70) => (px - x) ** 2 + (py - y) ** 2 < r * r;
  if (step.type === 'goto' && near(step.x, step.y)) return completeStep(state, m);
  if (step.type === 'deliverCar' && p.inCar && near(step.x, step.y)) return completeStep(state, m);
  if (step.type === 'steal' && p.inCar && p.inCar.model.id === step.model) return completeStep(state, m);
  if (step.type === 'clear' && state.mission.killsDone >= state.mission.killsNeeded) return completeStep(state, m);
  if (step.type === 'escape' && state.wanted === 0) return completeStep(state, m);
  if (step.type === 'race') {
    const cp = step.checkpoints[state.mission.raceHits];
    if (cp && near(cp.x, cp.y, 90)) {
      state.mission.raceHits++;
      state.toast(`Checkpoint ${state.mission.raceHits}/${step.checkpoints.length}`);
      if (state.mission.raceHits >= step.checkpoints.length) return completeStep(state, m);
    }
  }
  return null;
}

function completeStep(state, m) {
  state.mission.step++;
  state.mission.killsDone = 0;
  state.mission.raceHits = 0;
  if (state.mission.step >= m.steps.length) {
    state.player.cash += m.reward;
    state.player.respect += 10;
    state.mission.active = false;
    state.mission.done = true;
    state.mission.index++;
    state.mission.step = 0;
    return `mission-complete:${m.title}:${m.reward}`;
  }
  return `step:${m.steps[state.mission.step].label}`;
}

export function currentObjective(state) {
  if (!state.mission.active) {
    if (state.mission.index >= STORY.length) return 'Story complete — free roam. Take side jobs from the pause menu.';
    return `Talk to Vera — next mission: ${STORY[state.mission.index].title} (press J to start)`;
  }
  const m = STORY[state.mission.index];
  const step = m.steps[state.mission.step];
  if (step.type === 'clear') return `${step.label} — ${state.mission.killsDone}/${state.mission.killsNeeded} down`;
  if (step.type === 'race') return `${step.label} — ${state.mission.raceHits}/${step.checkpoints.length}`;
  return step.label;
}

export function startMission(state) {
  const m = STORY[state.mission.index];
  if (!m) return false;
  state.mission.active = true;
  state.mission.step = 0;
  state.mission.killsDone = 0;
  state.mission.raceHits = 0;
  const step = m.steps[0];
  if (step.type === 'clear') {
    state.mission.killsNeeded = step.count;
    state.spawnRivals(step.count, step.x ?? 3050, step.y ?? 1650);
  }
  return true;
}
