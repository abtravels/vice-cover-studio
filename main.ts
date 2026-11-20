// Vice Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library
// only). The app is this directory's app/ folder: plain static files a
// desktop browser loads offline (app/index.html and its ES modules, two
// bundled OFL fonts, two sample photos, no library and no network request).
// The program hands the entry in: it copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Read a PNG's pixel size from its IHDR chunk (no dependency). */
function pngSize(buf) {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** Read a JPEG's pixel size from its first SOF marker (no dependency). */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

/**
 * The gate's screenshot limits, checked here before anything is handed in:
 * 3 or 4 images, each at most 256 KiB, long side at most 1280, short side
 * at least 480. A screenshot outside the limits is refused by the scorer,
 * so fail loudly here instead of writing a broken /output.
 */
function checkScreenshots(dir) {
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile())
    : [];
  if (files.length < 3 || files.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${files.length}`);
  }
  for (const name of files) {
    const file = join(dir, name);
    const bytes = statSync(file).size;
    if (bytes > 262144) throw new Error(`screenshot ${name} is ${bytes} bytes, over the 256 KiB cap`);
    const buf = readFileSync(file);
    const size = name.endsWith('.png') ? pngSize(buf) : jpegSize(buf);
    if (!size) throw new Error(`screenshot ${name}: could not read its pixel size`);
    const [w, h] = size;
    if (Math.max(w, h) > 1280) throw new Error(`screenshot ${name} is ${w}x${h}, long side over 1280`);
    if (Math.min(w, h) < 480) throw new Error(`screenshot ${name} is ${w}x${h}, short side under 480`);
  }
  return files;
}

// Pre-flight: the entry is not worth handing in without its app and its
// screenshots, so fail loudly here instead of writing a broken /output.
const appIndex = join(here, 'app', 'index.html');
if (!existsSync(appIndex)) throw new Error('missing app/index.html');
if (statSync(appIndex).size > 1048576) throw new Error('app/index.html is over the 1 MiB cap');
const shotDir = join(here, 'screenshots');
const shots = checkScreenshots(shotDir);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotDir)) cpSync(shotDir, join(out, 'screenshots'), { recursive: true });
console.log(`Vice Cover Studio: copied app/ and ${shots.length} screenshots to ${out}`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
