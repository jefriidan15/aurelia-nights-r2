// Screenshot / demo scene staging. `?scene=<name>` puts the game into a
// composed state for screenshots and playtests — the same code paths the
// player uses, just with the setup done for them.
import { PLACES } from './world.js';

const SCENES = ['title', 'drive', 'chase', 'docks', 'night', 'vault'];

export function sceneFromURL() {
  try {
    const s = new URLSearchParams(window.location.search).get('scene');
    return SCENES.includes(s) ? s : null;
  } catch {
    return null;
  }
}

// Stage a scene on a running game. Called after a new game starts.
export function stageScene(game, name) {
  const p = game.player;
  const world = game.world;
  const setAt = (x, y) => {
    p.x = x; p.y = y;
    if (p.inCar) { p.inCar.x = x; p.inCar.y = y; }
    game.renderer.snapTo(x, y);
  };
  switch (name) {
    case 'drive': {
      const car = game.traffic.spawnParkedCar(p);
      car.x = 900; car.y = 396; car.angle = 0;
      p.enterCar(car);
      car.speed = 260;
      game.timeOfDay = 16.5; // golden hour
      setAt(900, 396);
      break;
    }
    case 'chase': {
      const car = game.traffic.spawnParkedCar(p);
      car.x = 1260; car.y = 756; car.angle = 0;
      p.enterCar(car);
      car.speed = 300;
      p.wanted = 3;
      game.timeOfDay = 17.5;
      setAt(1260, 756);
      break;
    }
    case 'docks': {
      game.missions.index = 2;
      game.missions.step = 'fight';
      game.missions.thugsRemaining = game.combat.spawnThugs(6, PLACES.docks);
      p.buyWeapon('pistol');
      p.weapons.pistol.ammo = 12;
      p.weapon = 'pistol';
      game.timeOfDay = 15.0;
      setAt(PLACES.docks.x - 180, 2196);
      break;
    }
    case 'night': {
      const car = game.traffic.spawnParkedCar(p);
      car.x = 1800; car.y = 1116; car.angle = 0;
      p.enterCar(car);
      car.speed = 200;
      p.wanted = 2;
      game.timeOfDay = 22.5;
      setAt(1800, 1116);
      break;
    }
    case 'vault': {
      game.missions.index = 3;
      game.missions.step = 'hold';
      game.missions.timer = 20;
      p.wanted = 3;
      p.buyWeapon('smg');
      p.weapon = 'smg';
      game.timeOfDay = 13.0;
      setAt(1836, 900);
      break;
    }
    default:
      break;
  }
}
