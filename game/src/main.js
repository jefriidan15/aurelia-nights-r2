// Aurelia Nights — game orchestration: the loop, the state machine, the
// interactions (steal, enter, shops, shooting), and the debug hooks the
// playtests drive through window.AURELIA.
import { World, PLACES } from './world.js';
import { Player } from './player.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { createMissions } from './missions.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { writeSave, readSave, hasSave, clearSave } from './save.js';
import { sceneFromURL, stageScene } from './shots.js';
import { dist, clamp } from './util.js';

export const VERSION = '1.0.0';

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.world = new World();
    this.player = new Player(this.world);
    this.traffic = new Traffic(this.world);
    this.police = new Police(this.world, this.traffic);
    this.combat = new Combat(this.world, this.player, this.traffic);
    this.renderer = new Renderer(this.canvas, this.world);
    this.input = new Input(this.canvas);
    this.sound = new SoundBank();
    this.ui = new UI(this);
    this.state = 'title'; // title | playing | paused | ended | failed
    this.endMode = null;  // 'won' | 'fail'
    this.time = 0;
    this.timeOfDay = 8.0; // 08:00
    this.stats = { moneyEarned: 0, carsStolen: 0, thugsDown: 0, shotsFired: 0 };
    this.fps = 0;
    this._fpsAcc = 0;
    this._fpsN = 0;
    this._last = 0;
    this._shopCooldown = 0;
    this._saveFlash = 0;

    this.missions = createMissions({
      player: this.player,
      world: this.world,
      toast: (t) => this.ui.toast(t),
      objective: (t) => this.ui.toast(t, 3600),
      setWanted: (n) => { this.player.wanted = n; },
      spawnThugs: (n, at) => this.combat.spawnThugs(n, at),
      deliverCar: () => this._deliverCar(),
      cashBlip: () => this.sound.cash(),
      onComplete: (i, reward) => this._onMissionComplete(i, reward),
      onFail: (reason) => this._onMissionFailed(reason),
      onWin: () => this._onWin(),
    });

    this._wireButtons();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ------------------------------------------------------------ menus

  _wireButtons() {
    const on = (id, fn) => document.getElementById(id).addEventListener('click', () => { this.sound.ensure(); this.sound.click(); fn(); });
    on('btn-new', () => this.newGame());
    on('btn-continue', () => this.continueGame());
    on('btn-how', () => { this.ui.hide('title-screen'); this.ui.show('how-screen'); });
    on('btn-how-back', () => { this.ui.hide('how-screen'); this.ui.showTitle(hasSave()); });
    on('btn-resume', () => this.resume());
    on('btn-save', () => {
      const r = writeSave(this);
      document.getElementById('save-status').textContent = r.ok ? 'Saved.' : `Save failed: ${r.reason}`;
    });
    on('btn-quit', () => { this.state = 'title'; this.ui.showTitle(hasSave()); });
    on('btn-again', () => {
      if (this.endMode === 'fail') {
        this.missions.retry();
        this.player.health = Math.max(this.player.health, 60);
        this.player.dead = false;
        this.state = 'playing';
        this.ui.showGame();
      } else {
        this.newGame();
      }
    });
    on('btn-end-title', () => { this.state = 'title'; this.ui.showTitle(hasSave()); });
  }

  newGame() {
    this.player.reset();
    this.traffic = new Traffic(this.world);
    this.combat = new Combat(this.world, this.player, this.traffic);
    this.police.reset();
    this.timeOfDay = 8.0;
    this.stats = { moneyEarned: 0, carsStolen: 0, thugsDown: 0, shotsFired: 0 };
    this.missions.start();
    this.state = 'playing';
    this.ui.showGame();
    this.renderer.snapTo(this.player.x, this.player.y);
    this.sound.startMusic();
    const scene = sceneFromURL();
    if (scene && scene !== 'title') stageScene(this, scene);
    this.ui.toast('Welcome to Port Aurelia', 3000);
  }

  continueGame() {
    const s = readSave();
    if (!s) { this.newGame(); return; }
    this.player.reset();
    this.player.money = s.money;
    this.player.health = s.health;
    this.player.x = s.x; this.player.y = s.y;
    this.player.wanted = s.wanted;
    this.player.weapon = s.weapon || 'fists';
    this.player.weapons = s.weapons || this.player.weapons;
    this.timeOfDay = s.timeOfDay || 8.0;
    this.stats = s.stats || this.stats;
    this.traffic = new Traffic(this.world);
    this.combat = new Combat(this.world, this.player, this.traffic);
    this.police.reset();
    this.missions.loadState(s.missions);
    this.state = 'playing';
    this.ui.showGame();
    this.renderer.snapTo(this.player.x, this.player.y);
    this.sound.startMusic();
    this.ui.toast('Save loaded — welcome back, Rook', 3000);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    document.getElementById('save-status').textContent = '';
    this.ui.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.hidePause();
  }

  // ------------------------------------------------------------ mission events

  _onMissionComplete(i, reward) {
    this.stats.moneyEarned += reward;
    this.sound.missionDone();
    this.sound.cash();
    this.ui.toast(`MISSION COMPLETE  +$${reward}`, 3200);
    writeSave(this);
  }

  _onMissionFailed(reason) {
    this.sound.missionFail();
    this.endMode = 'fail';
    this.state = 'failed';
    document.getElementById('end-title').textContent = 'MISSION FAILED';
    document.getElementById('end-text').textContent = `${reason} — the job is blown, but the syndicate gives you one more run at it.`;
    document.getElementById('btn-again').textContent = 'RETRY MISSION';
    this.ui.hide('hud');
    this.ui.show('end-screen');
  }

  _onWin() {
    this.sound.win();
    this.endMode = 'won';
    this.state = 'ended';
    document.getElementById('btn-again').textContent = 'PLAY AGAIN';
    this.ui.showEnd(true, this.stats);
    clearSave();
  }

  _onWasted() {
    this.player.money = Math.max(0, this.player.money - 200);
    const hospital = PLACES.hospital;
    this.player.x = hospital.x; this.player.y = hospital.y;
    this.player.health = 100;
    this.player.dead = false;
    this.player.wanted = 0;
    this.police.clearHeat();
    if (this.player.inCar) { this.player.inCar.driver = null; this.player.inCar = null; }
    this.renderer.snapTo(this.player.x, this.player.y);
    this.missions.fail('Wasted — St. Marrow patched you up for $200.');
  }

  _deliverCar() {
    const car = this.player.inCar;
    if (!car) return;
    this.player.exitCar();
    // The spray shop takes the car off the street.
    const i = this.traffic.cars.indexOf(car);
    if (i >= 0) this.traffic.cars.splice(i, 1);
    this.sound.door();
  }

  // ------------------------------------------------------------ shops

  _nearestPlace() {
    let best = null, bestD = Infinity;
    for (const key of Object.keys(PLACES)) {
      const pl = PLACES[key];
      if (pl.kind === 'start' || pl.kind === 'bank' || pl.kind === 'docks' || pl.kind === 'extract') continue;
      const d = dist(this.player.x, this.player.y, pl.x, pl.y);
      if (d < pl.r && d < bestD) { best = pl; bestD = d; }
    }
    return best;
  }

  _useShop(pl) {
    const p = this.player;
    let msg;
    if (pl.kind === 'spray') {
      if (!p.inCar) { msg = 'Bring a car to the spray shop.'; }
      else if (p.money < 100) { msg = 'Respray costs $100.'; }
      else {
        p.money -= 100;
        p.wanted = 0;
        this.police.clearHeat();
        p.inCar.color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
        msg = 'Fresh paint, clean plates. Heat gone.';
      }
    } else if (pl.kind === 'gun') {
      if (!p.weapons.pistol) msg = this._buy('pistol');
      else if (!p.weapons.smg) msg = this._buy('smg');
      else msg = this._buyAmmo();
    } else if (pl.kind === 'diner') {
      if (p.money < 50) msg = 'A meal and a patch-up costs $50.';
      else if (p.health >= 100) msg = 'You feel fine already.';
      else { p.money -= 50; p.heal(100); msg = 'Patched up. Good as new.'; }
    } else if (pl.kind === 'safe') {
      p.wanted = 0;
      this.police.clearHeat();
      p.heal(40);
      const r = writeSave(this);
      msg = r.ok ? 'Safehouse: heat cleared, game saved.' : 'Safehouse: heat cleared, but the save failed.';
    } else if (pl.kind === 'hospital') {
      if (p.money < 100) msg = 'Treatment costs $100.';
      else if (p.health >= 100) msg = 'No treatment needed.';
      else { p.money -= 100; p.heal(100); msg = 'St. Marrow stitches you up. $100.'; }
    }
    this.ui.toast(msg, 2600);
    this.sound.pickup();
  }

  _buy(kind) {
    const r = this.player.buyWeapon(kind);
    if (r.ok) this.sound.cash();
    return r.reason;
  }

  _buyAmmo() {
    const r = this.player.buyAmmo();
    if (r.ok) this.sound.cash();
    return r.reason;
  }

  // ------------------------------------------------------------ interactions

  _nearestStealableCar() {
    let best = null, bestD = Infinity;
    for (const car of this.traffic.cars) {
      if (!car.parked || car.driver) continue;
      const d = dist(this.player.x, this.player.y, car.x, car.y);
      if (d < 52 && d < bestD) { best = car; bestD = d; }
    }
    return best;
  }

  _nearestEnterableCar() {
    let best = null, bestD = Infinity;
    for (const car of this.traffic.cars) {
      if (car.driver === 'traffic' || car.police) continue;
      if (car.driver === 'player') continue;
      const d = dist(this.player.x, this.player.y, car.x, car.y);
      if (d < 52 && d < bestD) { best = car; bestD = d; }
    }
    return best;
  }

  _handleInteract() {
    const p = this.player;
    if (p.inCar) { p.exitCar(); this.sound.door(); return; }
    const car = this._nearestEnterableCar();
    if (car) {
      p.enterCar(car);
      car.parked = false;
      this.sound.door();
      return;
    }
    const shop = this._nearestPlace();
    if (shop) { this._useShop(shop); return; }
  }

  _handleSteal() {
    const p = this.player;
    if (p.inCar) return;
    const car = this._nearestStealableCar();
    if (!car) { this.ui.toast('No parked car in reach.', 1600); return; }
    car.parked = false;
    car.stolen = true;
    p.enterCar(car);
    p.addWanted(1);
    this.stats.carsStolen++;
    this.sound.horn();
    this.traffic.scarePeds(car.x, car.y, 180);
    this.missions.onCarStolen();
    this.ui.toast('Car stolen! The PD noticed. (+1 star)', 2600);
  }

  _handleShoot() {
    const p = this.player;
    if (!p.armed) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const wx = this.renderer.cam.x + this.input.mouse.x;
    const wy = this.renderer.cam.y + this.input.mouse.y;
    void scaleX; void scaleY;
    if (this.combat.playerShoot(wx, wy, this.sound)) {
      this.stats.shotsFired++;
      this.renderer.shake = Math.max(this.renderer.shake, 0.25);
      // Firing a gun in public draws heat.
      if (Math.random() < 0.5) p.addWanted(1);
    }
  }

  // ------------------------------------------------------------ loop

  _loop(t) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, this._last ? (t - this._last) / 1000 : 0.016);
    this._last = t;
    this.time += dt;
    // FPS EMA over the last second.
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc >= 1) { this.fps = Math.round(this._fpsN / this._fpsAcc); this._fpsAcc = 0; this._fpsN = 0; }

    if (this.state === 'playing') this._update(dt);
    this.renderer.render(this, this.time);
    if (this.state === 'playing' || this.state === 'paused') {
      this.ui.updateHUD();
      this.ui.drawMinimap();
    }
    this.input.endFrame();
  }

  _update(dt) {
    const p = this.player;
    const input = this.input;

    // Global keys.
    if (input.hit('p', 'Escape')) { this.pause(); return; }
    if (input.hit('m')) {
      this.sound.setMuted(!this.sound.muted);
      this.ui.toast(this.sound.muted ? 'Sound muted' : 'Sound on', 1200);
    }
    if (input.hit('e')) this._handleInteract();
    if (input.hit('f')) this._handleSteal();
    if (input.hit('q')) {
      const name = p.cycleWeapon();
      this.ui.toast(name, 1200);
      this.sound.click();
    }
    if (input.hit('r')) p.reload();

    // Shooting: click, or hold for automatic weapons.
    const def = p.weaponDef();
    if (p.armed && (input.mouse.clicked || (def.auto && input.mouse.down))) this._handleShoot();

    p.update(dt, input, this.traffic.cars);
    this.traffic.update(dt, p);
    this.police.update(dt, p, () => this.missions.fail('Busted by the Port Aurelia PD.'));
    this.combat.update(dt,
      () => { this.missions.onThugKilled(); this.stats.thugsDown++; },
      () => { this.sound.hurt(); this.renderer.shake = Math.max(this.renderer.shake, 0.4); },
      this.sound);
    this.missions.update(dt);

    // Day/night: one game hour every 45 real seconds.
    this.timeOfDay = (this.timeOfDay + dt / 45) % 24;

    // Slow health regen out of combat.
    if (this.combat.thugs.length === 0 && p.wanted === 0 && !p.dead) p.heal(1.2 * dt);

    // Context hint.
    let hint = '';
    if (!p.inCar) {
      const car = this._nearestEnterableCar() || this._nearestStealableCar();
      const shop = this._nearestPlace();
      if (car) hint = '[E] get in    [F] steal it (+1 star)';
      else if (shop) hint = `[E] ${shop.name} — ${shop.blurb}`;
    } else {
      hint = 'Drive with WASD — follow the yellow marker';
    }
    this.ui.hint(hint);

    // Engine + siren follow the driving state.
    this.sound.engine(p.inCar ? Math.abs(p.inCar.speed) / p.inCar.topSpeed : 0, !!p.inCar);
    this.sound.siren(dt, p.wanted);

    // Camera follows the player.
    this.renderer.follow(p.x, p.y, dt);

    // Wasted: respawn at the hospital, mission failed.
    if (p.dead) this._onWasted();
  }
}

// ------------------------------------------------------------ boot

const game = new Game();
window.AURELIA = {
  version: VERSION,
  game,
  state() {
    const g = game;
    return {
      state: g.state,
      fps: g.fps,
      mission: g.missions.index + 1,
      missionStep: g.missions.step,
      missionDone: g.missions.done,
      money: Math.floor(g.player.money),
      health: Math.floor(g.player.health),
      wanted: g.player.wanted,
      x: Math.round(g.player.x),
      y: Math.round(g.player.y),
      inCar: !!g.player.inCar,
      thugs: g.combat.thugs.length,
      cruisers: g.police.cruisers.length,
      timeOfDay: g.timeOfDay,
      cars: g.traffic.cars.length,
      peds: g.traffic.peds.length,
    };
  },
  startMission(i) {
    game.missions.index = Math.max(0, Math.min(5, i - 1));
    game.missions._beginMission();
  },
  setWanted(n) { game.player.wanted = n; },
  teleport(x, y) {
    game.player.x = x; game.player.y = y;
    if (game.player.inCar) { game.player.inCar.x = x; game.player.inCar.y = y; }
    game.renderer.snapTo(x, y);
  },
  save() { return writeSave(game); },
  load() { return readSave(); },
};

game.ui.showTitle(hasSave());
