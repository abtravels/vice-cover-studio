# vice-cover-studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/abtravels/vice-cover-studio/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/abtravels/vice-cover-studio/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Cover Studio turns your photo and caption into poster-style cover art — slanted multi-panel layouts, a Vice City sunset or neon colour grade, bold condensed lettering — and exports it as a PNG to share. It runs offline in a desktop browser from its own static files: your photos never leave your machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080.

## How it works

1. Add up to three photos, one per panel — or try a sample photo.
2. Crop each panel: pick a panel, then zoom and move the photo inside it. "Reset this panel's crop" puts it back to fit in one click.
3. Pick a layout (Triple Split, Duo, Solo) and a colour grade (Sunset, Neon, Gold, Noir).
4. Write and edit the caption and subline — the cover redraws live. A long caption wraps onto two lines instead of shrinking away, with a gold rule under the subline.
5. Choose a size (Square 1080 x 1080, Portrait 1080 x 1350, Wide 1920 x 1080) and export the PNG.

Everything is drawn on a canvas with original code. No Rockstar Games logo, artwork or font is used. The caption fonts are Noto Sans Condensed Black and Bold, bundled under `app/fonts/` under the SIL Open Font License (see `app/fonts/OFL.txt`). The two sample photos under `app/samples/` were made with an image model for make.fun and are free to use.

## Files

- `app/` — the offline web app: `index.html`, `style.css`, `src/cover.js` (the renderer), `src/main.js` (the editor), `src/shots.js` (screenshot scenes)
- `main.ts` — the program that hands the entry in: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`; it also checks every screenshot against the gate's limits first
- `serve.ts` — local static server for trying the app
- `screenshots/` — 4 screenshots: the exported cover first, then the editor at work, then covers in the other post sizes
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

## Build the output

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
