# Aurelia Nights — Port Aurelia

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A top-down 2D open-world crime game set in **Port Aurelia**, a 3600×2600
harbour city where the sun never quite sets on trouble. Built for the
[make.fun **gta6-01** bounty](https://make.fun/bounty/gta6-01).
Static files only — no build step, no network calls, no third-party assets.
Everything on screen is drawn and synthesized by the game's own code.

You play Aurelia, a driver-for-hire who fell in with Rosa's crew. The
city is yours to roam: steal a car off any street, outrun the Port
Aurelia PD, take jobs from the board, and work your way from small-time
boosts to the biggest score the harbour has ever seen.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

**On foot:** WASD walk, Shift sprint, E enter / steal a car, mouse aim,
left click fire (pistol first, shotgun later). **Driving:** W accelerate,
S brake / reverse, A D steer, Space handbrake, E exit, H horn.
**M** job board, **P** pause, **F1** mute.

Screenshot staging: opening the game with `?shot=start|chase|docks|night`
stages a real in-game scene instead of the title screen — that is how the
four screenshots in `screenshots/` were captured.

## The city

- Six districts (Old Town, Downtown, Marina, Little Vesper, Midtown,
  The Docks), a harbour with a working pier, and a full road grid with
  16 traffic cars and 30 pedestrians who flee gunfire.
- A 5-star wanted system: stealing cars, shooting, and ramming police
  raise the heat; cruisers hunt you harder with every star. Lay low to
  cool off, or pay $100 at Lola's Spray Shop to wipe it clean and repair
  your car.
- Shops: Spray Shop, Gun Shop (Iron & Oak — pistol $150, shotgun $400,
  ammo $25), Diner (The Golden Gull), Hospital (St. Aurelia General),
  Safehouse (Rosa's Flat — save here).
- Street cash pickups ($25–$75), car damage with smoke and wrecks,
  day/night cycle with headlights, synthesized WebAudio (engine hum,
  two-tone sirens, gunfire, bass loop), HUD with minimap, localStorage
  save / continue.

## Six story jobs

1. **Grand Theft Aurelia** — steal a car, deliver it to Big Sal's Chop Shop. $400
2. **Heat Wave** — survive 60 seconds at 3 stars. $600
3. **Pier 9 Shootout** — clear 6 Vesper guards at the docks, grab the crate. $900
4. **The Vault Job** — hold the bank vault 20 seconds, escape to the safehouse. $1500
5. **Four-Star Run** — 3 checkpoints across the city at 4 stars, 150 seconds. $2000
6. **Lockdown** — survive 90 seconds at 5 stars, reach the north airfield. $3500

Finish all six to become King of Port Aurelia.

## Layout

- `game/index.html`, `game/style.css` — page, HUD, menus
- `game/src/main.js` — bootstrap, game loop, shops, interactions, screenshot staging
- `game/src/world.js` — city data, buildings, collision
- `game/src/player.js` — on-foot + driving, weapons table
- `game/src/traffic.js` — traffic cars, pedestrians, cash pickups
- `game/src/police.js` — wanted system, cruiser AI
- `game/src/combat.js` — bullets, guards
- `game/src/missions.js` — the six-job state machine
- `game/src/render.js` — canvas + minimap rendering, day/night
- `game/src/audio.js` — synthesized WebAudio
- `game/src/ui.js` — DOM menus and HUD
- `game/src/input.js` — keyboard / mouse
- `game/src/save.js` — localStorage save
- `game/src/util.js` — shared helpers
- `main.ts` — entry program (copies `game/` + `screenshots/` to `/output`, writes `dossier.json`)
- `screenshots/` — 4 real in-game screenshots (`?shot=start|chase|docks|night`)

## License

MIT — see [LICENSE](LICENSE).
