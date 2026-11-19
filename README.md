# Aurelia Nights

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Aurelia Nights** is a complete top-down open-world crime game that runs
entirely offline in a desktop browser. You are Rook Marlowe, a getaway driver
fresh out of a bad deal, working your way back up the ladder in Aurelia Bay —
a sun-soaked coastal city of harbours, neon market streets, hilltop villas and
industrial docks. Steal cars, outrun the Aurelia Bay Police Department, take
jobs from fixer Vera Solano, and build a reputation the whole city knows.

## What is in the game

- **A living city** — six districts (Harbour, Old Town, Market Row, Marina,
  North Hills, Dockside) with roads, traffic, pedestrians, parks, a beach
  front and a working day/night cycle.
- **Driving and car theft** — five car models with their own speed, grip and
  handling. Walk up to any parked or moving car and take it. Traffic cars
  follow the road grid, brake for jams and honk.
- **Wanted system** — one to five stars. Patrol cars and foot officers chase,
  ram and arrest you; lay low and the heat fades, or pay it off at a
  Fixer phone booth.
- **Story missions** — eight missions for Vera Solano, from a simple pickup to
  a dockside shootout and a five-star escape, with cutscene-style briefings,
  objectives on the minimap and cash rewards.
- **Side work** — taxi fares, courier parcels, street races and hidden cash
  stashes scattered around the city.
- **Combat** — fists, pistol, pump shotgun and submachine gun, with ammo,
  reloads, health and armour pickups, rival crew shooters and police fire.
- **HUD and minimap** — health, armour, cash, wanted stars, weapon and ammo,
  speed, clock, mission objective and a live minimap with blips.
- **Save and continue** — progress (cash, mission, weapons, position) saves
  to the browser and can be continued from the start screen.
- **Sound** — fully synthesised WebAudio music, engine hum, sirens, gunshots
  and city ambience. No audio files, nothing downloaded.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk / drive |
| Mouse | Aim (on foot) |
| Left click | Shoot / punch |
| E | Enter / exit car, steal car |
| Space | Handbrake (in car) / sprint (on foot) |
| Shift | Sprint |
| R | Reload |
| 1–4 | Switch weapon |
| J | Start Vera's next mission |
| T / C | Start a taxi / courier side job |
| G | Buy at the Gun Locker (Market Row) |
| B | Pay off wanted level at a Fixer Booth |
| M | Mute music and sound |
| P / Esc | Pause |

## How to play

Open `game/index.html` through any static file server (for example
`node serve.ts`, then visit http://localhost:8080) and press **Start**.
Follow the gold objective marker: finish missions to unlock the next one,
earn cash, buy weapons at the Gun Locker, and keep your wanted level low
between jobs. Getting busted or wasted costs cash and drops you at the
nearest hospital or police station.

## Development

Everything under `game/` is plain static files — no build step, no network
requests. The entry point is `game/index.html`; the game code lives in
`game/src/` as small modules, one job each. `main.ts` (Node 22) copies
`game/` and `screenshots/` into the output directory and writes
`dossier.json` with the make.fun library in `vendor/makefun-game.ts`.

## Licence

MIT — see `LICENSE`.
