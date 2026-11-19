[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Aurelia Nights

A top-down open-world crime game in the fictional city of **Port Aurelia** — a 3600×2600 map with six districts (Old Town, Downtown, Marina, Little Vesper, Midtown, The Docks), a harbour, and Pier 9.

You arrive with nothing. Boost cars, dodge a five-star police force, scoop up street cash, and work through six story jobs until the city is yours.

## Play

Just open `game/index.html` in a desktop browser — the game is plain static files, no build step, no network requests. Or serve the `game/` folder:

```
node serve.ts
```

then open `http://localhost:8080`.

## Controls

| Input | Action |
| --- | --- |
| WASD / Arrows | Walk |
| Shift | Sprint |
| Mouse | Aim |
| Click / Space | Fire |
| E | Steal a car / enter a shop / exit a car |
| W/S/A/D (driving) | Accelerate / brake / steer |
| Space (driving) | Handbrake |
| H (driving) | Horn |
| Q | Switch weapon |
| M | Job board |
| P | Pause |
| F1 | Mute |

## The six jobs

1. **Grand Theft Aurelia** — $400: boost a ride and drop it at the Marina.
2. **Heat Wave** — $600: pick up a package at Pier 9 and deliver it hot.
3. **Pier 9 Shootout** — $900: clear the Docks crew, then take the stash.
4. **The Vault Job** — $1,500: crack the Downtown bank vault, escape to Rosa's Flat.
5. **Four-Star Run** — $2,000: hit four stars and outrun the law to the Marina.
6. **Lockdown** — $3,500: survive ninety seconds at five stars, then reach the harbour boat.

Finish all six and Port Aurelia is yours.

## What's in the city

- **16 traffic cars** and **8 parked cars** to steal; **30 pedestrians** who scatter when shots are fired.
- **Five-star wanted system**: cops chase on foot, ram your car, shoot at 3+ stars, and arrest you if they hold you close for two seconds. Heat fades after a quiet spell.
- **Five shops**: Lola's Spray Shop ($100 — wipe wanted + repair), Iron & Oak (pistol $150, shotgun $400, ammo $25), The Golden Gull diner, St. Aurelia General hospital, and Rosa's Flat safehouse (sleep to save + heal).
- **Street cash** pickups ($25–$75), a day/night cycle with headlights and lamp glow, synthesized WebAudio sound (no audio files), a HUD with wanted stars and a minimap, and localStorage saves.

## Screenshots

The four dossier screenshots are staged renders from the live game (`?shot=start|chase|docks|night`, seed 2).

## Build the dossier

```
node main.ts
```

That copies `game/` and `screenshots/` into `/output` and writes `/output/dossier.json` via the vendored `vendor/makefun-game.ts` library. The build needs nothing installed — Node 22 runs the TypeScript entrypoint directly.
