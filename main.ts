// Aurelia Nights — entrypoint for make.fun gta6-01.
// Packs the finished game and its screenshots into the output directory
// and writes the dossier the scorer compares byte for byte.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function packTree(name) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  if (!existsSync(from)) throw new Error(`missing ${name}/ in the repository`);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
  const entries = readdirSync(to);
  if (entries.length === 0) throw new Error(`${name}/ is empty`);
}

mkdirSync(outDir, { recursive: true });
packTree('game');
packTree('screenshots');

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
if (dossier.length === 0) throw new Error('buildDossier wrote an empty dossier');
writeFileSync(join(outDir, 'dossier.json'), dossier);
const gameEntries = readdirSync(join(outDir, 'game'), { recursive: true });
console.log(`aurelia-nights packed: ${gameEntries.length} game entries, dossier ${dossier.length} bytes -> ${outDir}`);
