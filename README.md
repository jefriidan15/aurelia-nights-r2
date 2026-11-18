# Aurelia Nights

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/jefriidan15/aurelia-nights-r2/reward.svg)](https://make.fun/bounty/gta6-01)

**Aurelia Nights** is a top-down 2D open-world crime game set in Port Aurelia,
built for [make.fun's Make GTA 6 bounty](https://make.fun/bounty/gta6-01).
An original city, story, characters, vehicles and soundtrack — nothing taken
from any commercial game.

## The game

Rook Vane owes the harbour syndicate fifty grand. The only way to pay it back
is to run their six jobs: steal a car and deliver it, outrun a three-star
wanted level, clear the docks in a shootout, hold the bank vault, run a
four-star checkpoint gauntlet, and survive the five-star lockdown finale.

- **Open world on foot and by car** — a 3600×2600 port city with traffic,
  pedestrians, a harbour, docks, and a day/night cycle
- **5-star wanted system** — Port Aurelia PD cruisers hunt you, ram your car,
  and bust you on foot; hide, repaint at the spray shop, or lay low
- **Six story missions** with win/lose conditions, plus shops (spray shop,
  gun shop, diner, safehouse, hospital) and a save system (localStorage)
- **Combat** — pistol and SMG, armed dock thugs who shoot back
- **HUD + minimap** — money, health, ammo, wanted stars, clock, mission
  tracker, and a live minimap with the objective marker
- **Synthesized sound** — WebAudio engine hum, sirens, gunfire, and a moody
  bass loop. No audio files, no network.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `index.html`. Static
files only — no build step, no network requests.

**Controls:** WASD move/drive · E enter/exit car or use a shop · F steal a
parked car · mouse + click shoot · Q switch weapon · R reload · P pause ·
M mute.

## Entry

This repository is an entry in make.fun's Make GTA 6 competition (`gta6-01`).
`main.ts` copies `game/` and `screenshots/` to the output directory and
writes the dossier with the kit's `vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
