[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
# Aurelia Nights — Port Aurelia

A top-down 2D open-world crime game set in Port Aurelia, a 3600×2600 harbour
city of six districts, a working pier, and a full road grid. You play Aurelia,
a driver-for-hire in Rosa's crew, climbing from street thefts to the crown of
the city across six story jobs. Everything in this build — city, names, story,
art and sound — is original.

## The city

Six districts — Old Town, Downtown, Marina, Little Vesper, Midtown, The Docks —
plus a harbour with a working pier and a full road grid. 16 traffic cars cruise
the streets and 30 pedestrians stroll the sidewalks (and flee when shots ring
out). A day/night cycle changes the mood, and at night your headlights cut
through the dark.

## Wanted system

Stealing cars, shooting, and ramming police cruisers raise your heat across
5 stars. Cruisers hunt harder with every star. Lay low to cool off, or pay
$100 at Lola's Spray Shop to wipe the heat and repair your car. Get caught on
foot and you are busted; get shot down and you wake up at St. Aurelia General.

## Controls

| Action | Key |
| --- | --- |
| Walk | WASD |
| Sprint | Shift |
| Steal / enter / exit car | E |
| Aim | Mouse |
| Fire | Click |
| Switch weapon | 1 pistol / 2 shotgun |
| Accelerate / brake / reverse | W / S |
| Steer | A / D |
| Handbrake | Space |
| Horn | H |
| Job board | M |
| Pause | P |
| Mute sound | F1 |

## Missions

1. **Grand Theft Aurelia** — steal a car, deliver it to Big Sal's Chop Shop. $400
2. **Heat Wave** — survive 60 seconds at 3 stars. $600
3. **Pier 9 Shootout** — clear 6 Vesper guards at the docks, grab the crate. $900
4. **The Vault Job** — hold the bank vault 20 seconds, escape to the safehouse. $1500
5. **Four-Star Run** — 3 checkpoints across the city at 4 stars within 150 seconds. $2000
6. **Lockdown** — survive 90 seconds at 5 stars, reach the north airfield. $3500

Finish all six to become King of Port Aurelia.

## Shops

- **Lola's Spray Shop** — $100 respray: clears wanted level, repairs your car.
- **Iron & Oak Gun Shop** — pistol $150, shotgun $400, ammo $25.
- **The Golden Gull Diner** — $20 meal, restores 50 health.
- **St. Aurelia General** — $50 treatment, full health.
- **Rosa's Flat (Safehouse)** — save your game here.

Street cash pickups ($25–$75) are scattered around the city and respawn.

## Sound

All audio is synthesized live with WebAudio — engine hum, two-tone sirens,
gunfire, and a bass loop. No audio files. Press F1 to mute.

## Layout

```
game/
  index.html        entry point, screens + canvas
  style.css         screen and panel styling
  src/
    config.js       constants, RNG, districts, jobs, prices
    city.js         road grid, buildings, pier, harbour, collisions
    particles.js    sparks, smoke, muzzle flashes
    vehicles.js     traffic, driving physics, stealing, damage
    walkers.js      pedestrians and fleeing
    cops.js         wanted stars, cruiser AI, busted
    weapons.js      guns, bullets, Pier 9 guards, crate
    jobs.js         the six story jobs
    shops.js        shops and street cash
    sound.js        synthesized WebAudio
    controls.js     keyboard, mouse, hotkeys
    savegame.js     localStorage save / continue
    hud.js          DOM screens and job board
    draw.js         canvas renderer, HUD, minimap, night lighting
    engine.js       boot, main loop, camera, ?shot= staging
main.ts             build entry (copies game/ + screenshots/ to output)
serve.ts            local dev server
vendor/
  makefun-game.ts   dossier builder (competition kit file)
screenshots/        in-game captures used by the dossier
shots.json          the four staged screenshot shots
```

## Run it

```sh
npx tsc main.ts --module commonjs --target es2020 --outDir /tmp/an-build
# or simply serve the game/ folder with any static server:
npx serve game
```

Open `game/index.html` in a browser. Screenshots can be staged with
`?shot=start|chase|docks|night&seed=1`.

## License

MIT — see `LICENSE`.
