// The six-mission story of Aurelia Nights. A pure state machine: it reads the
// player and the world through `ctx` and reports objectives, progress and
// completion through callbacks. No DOM, no rendering — unit-testable in Node.
import { dist } from './util.js';

export const MISSION_DEFS = [
  {
    title: 'Mission 1 — Hot Wheels',
    intro: 'Steal a parked car and deliver it to the Spray Shop.',
    reward: 500,
  },
  {
    title: 'Mission 2 — Heat Wave',
    intro: 'The syndicate wants you hot. Reach 3 stars, then lose the heat completely.',
    reward: 800,
  },
  {
    title: 'Mission 3 — Dockside Firefight',
    intro: 'The dock crew crossed the syndicate. Go to the docks and finish it.',
    reward: 1200,
  },
  {
    title: 'Mission 4 — Vault Job',
    intro: 'Hold the bank vault for 20 seconds, then get the cash to the safehouse.',
    reward: 2500,
  },
  {
    title: 'Mission 5 — Checkpoint Run',
    intro: 'Four stars on your tail. Hit all three checkpoints, then vanish at the safehouse.',
    reward: 2000,
  },
  {
    title: 'Mission 6 — Aurelia Lockdown',
    intro: 'Five stars. Survive 90 seconds, then reach Pier 9 and the boat out.',
    reward: 5000,
  },
];

// Mission 5 checkpoint markers (world coordinates).
export const CHECKPOINTS = [
  { x: 540, y: 540, name: 'Checkpoint 1 — North Gate' },
  { x: 3060, y: 1980, name: 'Checkpoint 2 — East Yard' },
  { x: 900, y: 1980, name: 'Checkpoint 3 — South Row' },
];

export function createMissions(ctx) {
  const engine = {
    index: 0,          // 0-based mission
    step: 'intro',     // per-mission step id
    timer: 0,          // hold / survive countdown
    cpIndex: 0,        // mission 5 checkpoint progress
    thugsRemaining: 0,
    done: false,       // all six complete
    failed: false,
    failReason: '',

    current() {
      return MISSION_DEFS[this.index];
    },

    start() {
      this.index = 0;
      this.done = false;
      this._beginMission();
    },

    // Begin (or re-begin) the mission at `index` after a failure.
    _beginMission() {
      this.failed = false;
      this.failReason = '';
      this.timer = 0;
      this.cpIndex = 0;
      this.thugsRemaining = 0;
      const i = this.index;
      if (i === 0) this.step = 'steal';
      else if (i === 1) this.step = 'heat';
      else if (i === 2) this.step = 'goto';
      else if (i === 3) this.step = 'goto';
      else if (i === 4) { this.step = 'cp'; ctx.setWanted(4); }
      else if (i === 5) { this.step = 'survive'; this.timer = 90; ctx.setWanted(5); }
      ctx.toast(MISSION_DEFS[i].title);
      ctx.objective(MISSION_DEFS[i].intro);
    },

    retry() {
      this._beginMission();
    },

    fail(reason) {
      if (this.done || this.failed) return;
      this.failed = true;
      this.failReason = reason;
      ctx.onFail(reason);
    },

    _complete() {
      const def = MISSION_DEFS[this.index];
      ctx.player.money += def.reward;
      ctx.onComplete(this.index, def.reward);
      this.index++;
      if (this.index >= MISSION_DEFS.length) {
        this.done = true;
        ctx.onWin();
        return;
      }
      this._beginMission();
    },

    // Called by the game when the player steals a car.
    onCarStolen() {
      if (this.index === 0 && this.step === 'steal') {
        this.step = 'deliver';
        ctx.objective('Car acquired. Deliver it to the Spray Shop — follow the yellow marker.');
      }
    },

    // Called by the game when a mission thug dies.
    onThugKilled() {
      if (this.index === 2 && this.step === 'fight') {
        this.thugsRemaining = Math.max(0, this.thugsRemaining - 1);
        if (this.thugsRemaining <= 0) this._complete();
      }
    },

    objectiveText() {
      const p = ctx.player;
      switch (this.index) {
        case 0:
          return this.step === 'steal'
            ? 'Steal a parked car (walk up and press F)'
            : 'Deliver the car to the Spray Shop';
        case 1:
          return this.step === 'heat'
            ? `Raise your wanted level to 3 stars (now ${p.wanted})`
            : 'Lose the heat — get to 0 stars. Hide, or reach the safehouse.';
        case 2:
          if (this.step === 'goto') return 'Go to the Harbour Docks';
          return `Eliminate the dock crew — ${this.thugsRemaining} left`;
        case 3:
          if (this.step === 'goto') return 'Get to Aurelia National Bank';
          if (this.step === 'hold') return `Hold the vault — ${Math.ceil(this.timer)}s (stay inside!)`;
          return 'Cash in hand. Escape to the safehouse.';
        case 4:
          if (this.step === 'cp') {
            const cp = CHECKPOINTS[this.cpIndex];
            return `${cp.name} (${this.cpIndex}/3 checkpoints)`;
          }
          return 'All checkpoints hit. Vanish at the safehouse.';
        case 5:
          if (this.step === 'survive') return `Survive the lockdown — ${Math.ceil(this.timer)}s left`;
          return 'Run for Pier 9. The boat is waiting.';
        default:
          return '';
      }
    },

    progressText() {
      if (this.done) return 'All missions complete';
      return `Mission ${this.index + 1} of 6`;
    },

    // The world position the yellow marker should point at, or null.
    marker() {
      const place = (kind) => ctx.world.placeAt(kind);
      switch (this.index) {
        case 0: return this.step === 'deliver' ? place('sprayShop') : null;
        case 1: return this.step === 'cool' ? place('safehouse') : null;
        case 2: return place('docks');
        case 3:
          if (this.step === 'escape') return place('safehouse');
          return place('bank');
        case 4:
          if (this.step === 'cp') return CHECKPOINTS[this.cpIndex];
          return place('safehouse');
        case 5:
          if (this.step === 'extract') return place('extraction');
          return null;
        default: return null;
      }
    },

    update(dt) {
      if (this.done || this.failed) return;
      const p = ctx.player;
      const place = (kind) => ctx.world.placeAt(kind);
      const near = (pt, r) => pt && dist(p.x, p.y, pt.x, pt.y) < r;

      switch (this.index) {
        case 0: {
          if (this.step === 'deliver' && near(place('sprayShop'), 100)) {
            if (p.inCar) {
              // Hand the car over: it leaves the player's hands.
              ctx.deliverCar();
            }
            this._complete();
          }
          break;
        }
        case 1: {
          if (this.step === 'heat' && p.wanted >= 3) {
            this.step = 'cool';
            ctx.objective('Three stars! Now lose them all — stay unseen, or hide at the safehouse.');
          } else if (this.step === 'cool' && p.wanted === 0) {
            this._complete();
          }
          break;
        }
        case 2: {
          if (this.step === 'goto' && near(place('docks'), 170)) {
            this.step = 'fight';
            this.thugsRemaining = ctx.spawnThugs(6, place('docks'));
            ctx.objective('Six of them. Drop them all.');
          }
          break;
        }
        case 3: {
          const bank = place('bank');
          if (this.step === 'goto' && near(bank, 130)) {
            this.step = 'hold';
            this.timer = 20;
            ctx.setWanted(Math.max(p.wanted, 3));
            ctx.objective('Vault drill running — hold the room for 20 seconds!');
          } else if (this.step === 'hold') {
            if (near(bank, 150)) {
              this.timer -= dt;
              ctx.setWanted(Math.max(p.wanted, 3));
              if (this.timer <= 0) {
                this.step = 'escape';
                ctx.objective('Vault cracked! Get the cash to the safehouse.');
              }
            }
          } else if (this.step === 'escape' && near(place('safehouse'), 110)) {
            this._complete();
          }
          break;
        }
        case 4: {
          if (this.step === 'cp') {
            const cp = CHECKPOINTS[this.cpIndex];
            if (near(cp, 95)) {
              this.cpIndex++;
              ctx.cashBlip();
              if (this.cpIndex >= CHECKPOINTS.length) {
                this.step = 'escape';
                ctx.objective('All checkpoints hit. Vanish at the safehouse.');
              }
            }
          } else if (this.step === 'escape' && near(place('safehouse'), 110)) {
            this._complete();
          }
          break;
        }
        case 5: {
          // Lockdown: the heat never drops below five stars.
          ctx.setWanted(5);
          if (this.step === 'survive') {
            this.timer -= dt;
            if (this.timer <= 0) {
              this.step = 'extract';
              ctx.objective('You outlasted them. Now run — Pier 9, the boat out.');
            }
          } else if (this.step === 'extract' && near(place('extraction'), 120)) {
            this._complete();
          }
          break;
        }
        default:
          break;
      }
    },

    saveState() {
      return { index: this.index, step: this.step, timer: this.timer, cpIndex: this.cpIndex, done: this.done };
    },

    loadState(s) {
      if (!s) return;
      this.index = Math.min(s.index || 0, MISSION_DEFS.length - 1);
      this.done = !!s.done;
      this.timer = s.timer || 0;
      this.cpIndex = s.cpIndex || 0;
      this.step = s.step || 'intro';
      this.failed = false;
      if (this.done) return;
      // Re-assert mission-start side effects that a load must restore.
      if (this.index === 4 && this.step === 'cp') ctx.setWanted(4);
      if (this.index === 5) ctx.setWanted(5);
    },
  };
  return engine;
}
