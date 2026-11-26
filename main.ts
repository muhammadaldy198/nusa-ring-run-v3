// NUSA RING RUN — main.ts (v3, Node 22, stdlib saja)
// Entrypoint penyerahan: salin game/ + screenshots/ dari repo ke direktori
// keluaran, lalu tulis dossier.json dari buildDossier (vendor/makefun-game.ts).
// Di luar container grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Dossier ditulis dua kali pun byte-identik: salinan + build deterministik.
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Batas scorer untuk bounty ini (reference/gate.json): teks 160 KiB,
// maksimal 4 screenshot @ 256 KiB, game maksimal 993 file / 48 MiB,
// dan tidak ada path game lebih panjang dari 1000 byte.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const entryHome = resolve(dirname(fileURLToPath(import.meta.url)));
const outputHome = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function handIn(): void {
  mkdirSync(outputHome, { recursive: true });
  cpSync(join(entryHome, 'game'), join(outputHome, 'game'), { recursive: true });
  const shotsInRepo = join(entryHome, 'screenshots');
  const shotsInOut = join(outputHome, 'screenshots');
  mkdirSync(shotsInOut, { recursive: true });
  if (existsSync(shotsInRepo)) {
    cpSync(shotsInRepo, shotsInOut, { recursive: true });
  }
  const dossierBytes = buildDossier(outputHome, GATE);
  const dossierTarget = join(outputHome, 'dossier.json');
  writeFileSync(dossierTarget, dossierBytes);
  chmodSync(dossierTarget, 0o644);
  console.log(`dossier.json ${dossierBytes.length} bytes sha256=${sha256Hex(dossierBytes)}`);
}

// v3: dossier ditulis dengan batas scorer yang sama seperti v2 —
// tidak ada yang berubah di sisi penyerahan, hanya isi gamenya.
// chmod 0o644 di atas menjaga file bisa dibaca grader sebagai user 65534.
handIn();
