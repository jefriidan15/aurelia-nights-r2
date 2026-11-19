// Aurelia Nights — entrypoint for the make.fun gta6-01 dossier build.
//
// Running `node main.ts` assembles the submission in /output:
//   /output/game/          a copy of this repo's game/
//   /output/screenshots/   a copy of this repo's screenshots/
//   /output/dossier.json   the dossier for those two trees, written by
//                           buildDossier from vendor/makefun-game.ts
//
// The caps below are the bounty's gate caps, so a dossier built here is
// the same one the scorer would build from the same /output.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outRoot = '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

function copyTree(name) {
  const from = join(repoRoot, name);
  const to = join(outRoot, name);
  if (!existsSync(from)) {
    throw new Error(`main.ts: ${name}/ is missing from the repo, nothing to hand in`);
  }
  cpSync(from, to, { recursive: true });
  return to;
}

// Start from a clean /output so a stale file can never ride along.
// The dossier is then built from exactly what was just copied, which
// is what the scorer will see.
rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

copyTree('game');
copyTree('screenshots');

const dossier = buildDossier(outRoot, caps);
writeFileSync(join(outRoot, 'dossier.json'), dossier);

console.log(`dossier written: ${join(outRoot, 'dossier.json')} (${dossier.length} bytes)`);
