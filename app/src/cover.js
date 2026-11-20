// Vice Cover Studio — cover renderer.
//
// Draws GTA-poster-style cover art onto a canvas: slanted multi-panel
// layouts, a sunset / neon colour grade, film grain, and bold condensed
// caption lettering. Everything drawn here is original vector and canvas
// work — no Rockstar logo, artwork or font is used anywhere.

/** Colour grades: a canvas filter plus a tint gradient over each panel. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.5) contrast(1.12) hue-rotate(-8deg)',
    stops: [
      [0, 'rgba(255, 180, 100, 0)'],
      [0.5, 'rgba(255, 120, 55, 0.38)'],
      [0.78, 'rgba(230, 60, 110, 0.5)'],
      [1, 'rgba(160, 25, 110, 0.72)'],
    ],
    sun: true,
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.5) contrast(1.1)',
    stops: [
      [0, 'rgba(0, 229, 255, 0.28)'],
      [0.5, 'rgba(120, 60, 220, 0.18)'],
      [1, 'rgba(255, 45, 150, 0.6)'],
    ],
    sun: true,
  },
  gold: {
    label: 'Gold',
    filter: 'saturate(1.2) contrast(1.05) sepia(0.3)',
    stops: [
      [0, 'rgba(255, 220, 120, 0.05)'],
      [0.6, 'rgba(230, 150, 40, 0.22)'],
      [1, 'rgba(120, 60, 0, 0.55)'],
    ],
    sun: false,
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(0.75) contrast(1.18) brightness(0.95)',
    stops: [
      [0, 'rgba(0, 180, 190, 0.1)'],
      [0.6, 'rgba(10, 40, 60, 0.2)'],
      [1, 'rgba(0, 10, 20, 0.55)'],
    ],
    sun: false,
  },
};

/** Panel layouts: each panel is a polygon (array of [x, y] corners, 0..1). */
export const LAYOUTS = {
  triple: {
    label: 'Triple Split',
    panels: [
      // Hero panel, left, with a slanted right edge.
      [[0, 0], [0.6, 0], [0.56, 1], [0, 1]],
      // Top-right panel.
      [[0.62, 0], [1, 0], [1, 0.49], [0.58, 0.49]],
      // Bottom-right panel.
      [[0.58, 0.51], [1, 0.51], [1, 1], [0.56, 1]],
    ],
  },
  duo: {
    label: 'Duo',
    panels: [
      [[0, 0], [0.52, 0], [0.48, 1], [0, 1]],
      [[0.54, 0], [1, 0], [1, 1], [0.5, 1]],
    ],
  },
  solo: {
    label: 'Solo',
    panels: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
  },
};

/** Sizes the app exports, in pixels. */
export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** A tiny deterministic pseudo-random generator, so the grain is stable. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** One reusable grain tile, drawn over the cover at low alpha. */
let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  const rand = seededRandom(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = tile;
  return tile;
}

/** Trace a polygon (fractions of the canvas) as the current path. */
function tracePolygon(ctx, w, h, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0] * w, points[0][1] * h);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0] * w, points[i][1] * h);
  ctx.closePath();
}

/**
 * Draw one photo into one panel, cover-fit, with the panel's zoom and
 * position, then the grade tint, a soft sun disc and a vignette.
 * `panel` is { photo, zoom, ox, oy } — ox/oy are -1..1 offsets of the
 * leftover crop; zoom is 1 (fit) and up.
 */
function drawPanel(ctx, w, h, points, panel, grade, isHero) {
  ctx.save();
  tracePolygon(ctx, w, h, points);
  ctx.clip();

  // Panel bounds, for the cover-fit math.
  const xs = points.map((p) => p[0] * w);
  const ys = points.map((p) => p[1] * h);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const pw = x1 - x0;
  const ph = y1 - y0;

  if (panel.photo) {
    const iw = panel.photo.naturalWidth;
    const ih = panel.photo.naturalHeight;
    const base = Math.max(pw / iw, ph / ih);
    const scale = base * (panel.zoom || 1);
    const dw = iw * scale;
    const dh = ih * scale;
    const spareX = (dw - pw) / 2;
    const spareY = (dh - ph) / 2;
    const dx = x0 + (pw - dw) / 2 + (panel.ox || 0) * spareX;
    const dy = y0 + (ph - dh) / 2 + (panel.oy || 0) * spareY;
    ctx.filter = grade.filter;
    ctx.drawImage(panel.photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // Empty panel: a deep dusk gradient so the layout still reads.
    const empty = ctx.createLinearGradient(0, y0, 0, y1);
    empty.addColorStop(0, '#3a1c5e');
    empty.addColorStop(1, '#12081f');
    ctx.fillStyle = empty;
    ctx.fillRect(x0, y0, pw, ph);
  }

  // Grade tint, top to bottom.
  const tint = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [stop, color] of grade.stops) tint.addColorStop(stop, color);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = tint;
  ctx.fillRect(x0, y0, pw, ph);
  ctx.globalCompositeOperation = 'source-over';

  // Soft sun disc in the hero panel's sky, for the warm grades: a bright
  // core, a wide halo, and a warm horizon glow across the panel. It sits
  // up in the sky at the panel's right, clear of the photo's subject.
  if (grade.sun && isHero) {
    const cx = x0 + pw * 0.68;
    const cy = y0 + ph * 0.12;
    const r = Math.min(pw, ph) * 0.24;
    const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2);
    halo.addColorStop(0, 'rgba(255, 170, 80, 0.28)');
    halo.addColorStop(1, 'rgba(255, 170, 80, 0)');
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = halo;
    ctx.fillRect(x0, y0, pw, ph);
    const sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    sun.addColorStop(0, 'rgba(255, 224, 150, 0.98)');
    sun.addColorStop(0.55, 'rgba(255, 130, 60, 0.65)');
    sun.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    const horizon = ctx.createLinearGradient(0, y0 + ph * 0.3, 0, y0 + ph * 0.55);
    horizon.addColorStop(0, 'rgba(255, 140, 70, 0)');
    horizon.addColorStop(0.5, 'rgba(255, 140, 70, 0.22)');
    horizon.addColorStop(1, 'rgba(255, 140, 70, 0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(x0, y0, pw, ph);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Vignette: darkened corners so the panels feel printed.
  const vig = ctx.createRadialGradient(
    x0 + pw / 2, y0 + ph / 2, Math.min(pw, ph) * 0.35,
    x0 + pw / 2, y0 + ph / 2, Math.max(pw, ph) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(x0, y0, pw, ph);
  ctx.restore();

  // Crisp white seam around the panel.
  ctx.save();
  tracePolygon(ctx, w, h, points);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.stroke();
  ctx.restore();
}

/**
 * Split a caption into at most two lines that fit the cover width at
 * `size`, shrinking the type only if even two lines are too wide.
 * Returns { lines, size } — the lines to draw, bottom line last.
 */
function wrapCaption(ctx, text, w, size) {
  const maxW = w * 0.9;
  const setFont = (s) => { ctx.font = `${s}px "ViceCondensedBlack", sans-serif`; };
  let s = size;
  setFont(s);
  if (ctx.measureText(text).width <= maxW) return { lines: [text], size: s };
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    while (ctx.measureText(text).width > maxW && s > 14) { s -= 2; setFont(s); }
    return { lines: [text], size: s };
  }
  // Greedy two-line wrap: fill the first line, the rest goes on line two.
  for (;;) {
    setFont(s);
    const first = [];
    let rest = [...words];
    while (rest.length > 1) {
      const trial = [...first, rest[0]].join(' ');
      if (ctx.measureText(trial).width > maxW) break;
      first.push(rest.shift());
    }
    if (rest.length === 0) return { lines: [text], size: s };
    const second = rest.join(' ');
    if (ctx.measureText(second).width <= maxW && first.length > 0) {
      return { lines: [first.join(' '), second], size: s };
    }
    if (s <= 14) return { lines: [first.join(' ') || text, second], size: s };
    s -= 2;
  }
}

/** Draw the caption block: subline above, big condensed main line below. */
function drawCaption(ctx, w, h, caption, subline) {
  const pad = w * 0.05;
  // Legibility band across the foot of the cover.
  const band = ctx.createLinearGradient(0, h * 0.58, 0, h);
  band.addColorStop(0, 'rgba(8, 4, 18, 0)');
  band.addColorStop(1, 'rgba(8, 4, 18, 0.62)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  // Fit the caption: wrap to two lines before shrinking, so a long
  // caption stays big and readable instead of collapsing to one thin line.
  const text = (caption || '').trim().toUpperCase() || 'SUNSET HEIST';
  const baseSize = h * 0.115;
  const { lines, size } = wrapCaption(ctx, text, w, baseSize);
  const lineGap = size * 1.02;
  // Baselines: the last caption line sits near the foot, earlier lines
  // stack above it, and the subline sits above the first caption line.
  // The caption's cap height reaches about 0.72 * size above its own
  // baseline, so the subline's baseline must clear that plus its own
  // descender, or the caption paints straight over the subline.
  const capBaseline = h * 0.93;
  const firstBaseline = capBaseline - (lines.length - 1) * lineGap;
  const subBaseline = firstBaseline - size * 0.95;
  const ruleY = firstBaseline - size * 0.78;

  ctx.save();
  ctx.translate(pad, 0);
  ctx.rotate(-0.026); // a slight poster tilt, pivoted on the caption block

  const sub = (subline || '').trim().toUpperCase();
  if (sub) {
    ctx.font = `700 ${Math.round(h * 0.028)}px "ViceCondensedBold", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(h * 0.004)}px`; } catch { /* older canvas */ }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffd166';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = h * 0.006;
    ctx.fillText(sub, 0, subBaseline);
    ctx.shadowBlur = 0;
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    // Thin gold rule between the subline and the caption.
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, ruleY, Math.min(w * 0.22, 220), Math.max(2, h * 0.003));
  }

  // Caption lines, bottom line last, with a dark outline for legibility.
  ctx.font = `${size}px "ViceCondensedBlack", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
  ctx.lineWidth = Math.max(4, size * 0.09);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.04;
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => {
    const y = firstBaseline + i * lineGap;
    ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

/**
 * Draw the whole cover onto `canvas` at the canvas's own size.
 * `state` is { panels, layout, grade, caption, subline } where panels is
 * an array of { photo, zoom, ox, oy } matching the layout's panel count.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const layout = LAYOUTS[state.layout] || LAYOUTS.triple;
  const grade = GRADES[state.grade] || GRADES.sunset;

  // Deep dusk base, then the panels.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((points, i) => {
    drawPanel(ctx, w, h, points, state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 }, grade, i === 0);
  });

  // White outer frame with a thin dark keyline, poster style.
  const frame = Math.max(6, w * 0.008);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(2, w * 0.0015);
  ctx.strokeRect(frame * 1.5, frame * 1.5, w - frame * 3, h - frame * 3);

  // Film grain over everything, then the caption on top.
  const tile = getGrainTile();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawCaption(ctx, w, h, state.caption, state.subline);
}
