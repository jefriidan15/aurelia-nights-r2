// Aurelia Nights — the entry program for make.fun's Make GTA 6 bounty.
//
// Copies this repository's game/ and screenshots/ into the output directory
// and writes the dossier there, using the kit's buildDossier. It runs on
// Node 22 with the standard library only: no install, no build step, no
// network. The output directory is $MAKEFUN_OUTPUT_DIR, or /output.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = import.meta.dirname;
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// A fresh output directory every run, so the two grading runs agree byte
// for byte: whatever was there before is removed first.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const dir of ['game', 'screenshots']) {
  cpSync(join(repoRoot, dir), join(outDir, dir), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`aurelia-nights: wrote ${outDir}/dossier.json (${dossier.length} bytes)`);
