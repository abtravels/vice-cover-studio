// Vice Cover Studio — editor wiring.
//
// Loads the user's photos (never uploaded — read on this machine only),
// keeps the live preview in step with the controls, and exports the cover
// as a PNG in the chosen post size. A `?shot=` query sets up a fixed scene
// for a screenshot instead (see shots.js).
import { drawCover, GRADES, LAYOUTS, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const sublineInput = document.getElementById('subline');
const status = document.getElementById('status');
const sizeSelect = document.getElementById('size');
const layoutButtons = [...document.querySelectorAll('[data-layout]')];
const gradeButtons = [...document.querySelectorAll('[data-grade]')];
const exportButton = document.getElementById('export');
const resetButton = document.getElementById('reset-panel');

/** The editor's state: three photo slots, one panel each in Triple Split. */
const state = {
  photos: [null, null, null],
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 2, zoom: 1, ox: 0, oy: 0 },
  ],
  layout: 'triple',
  grade: 'sunset',
  size: 'square',
  caption: 'Sunset Heist',
  subline: 'Neon Nights',
};

/** The panel the crop sliders currently edit (0, 1 or 2). */
let activePanel = 0;

/** Load an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The panels the current layout needs, with their photo objects resolved. */
function resolvedPanels() {
  const layout = LAYOUTS[state.layout];
  return layout.panels.map((_, i) => {
    const p = state.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    return { photo: state.photos[p.photo] || null, zoom: p.zoom, ox: p.ox, oy: p.oy };
  });
}

/** Resize the canvas to the chosen export size and redraw the cover. */
function redraw() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, {
    panels: resolvedPanels(),
    layout: state.layout,
    grade: state.grade,
    caption: state.caption,
    subline: state.subline,
  });
  const loaded = state.photos.filter(Boolean).length;
  status.textContent = `${size.label} · ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label} grade · ${loaded} photo${loaded === 1 ? '' : 's'} loaded`;
}

/** Fill the size, layout and grade controls from the cover module. */
function buildControls() {
  for (const [key, size] of Object.entries(SIZES)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = size.label;
    sizeSelect.appendChild(opt);
  }
  sizeSelect.value = state.size;
}

/** Highlight the active layout and grade buttons. */
function markActive() {
  layoutButtons.forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  gradeButtons.forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-panel-tab]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panelTab) === activePanel);
  });
}

/** Wire a file input to one photo slot. */
function wirePhotoInput(slot) {
  const input = document.getElementById(`photo-${slot}`);
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[slot] = await loadImage(URL.createObjectURL(file));
    redraw();
  });
}

/** Wire the crop sliders to the active panel, plus the reset button. */
function wireCrop() {
  const zoom = document.getElementById('zoom');
  const posX = document.getElementById('pos-x');
  const posY = document.getElementById('pos-y');
  const sync = () => {
    const p = state.panels[activePanel];
    zoom.value = p.zoom;
    posX.value = p.ox * 100;
    posY.value = p.oy * 100;
    document.getElementById('zoom-value').textContent = `${Math.round(p.zoom * 100)}%`;
  };
  zoom.addEventListener('input', () => { state.panels[activePanel].zoom = Number(zoom.value); sync(); redraw(); });
  posX.addEventListener('input', () => { state.panels[activePanel].ox = Number(posX.value) / 100; redraw(); });
  posY.addEventListener('input', () => { state.panels[activePanel].oy = Number(posY.value) / 100; redraw(); });
  document.querySelectorAll('[data-panel-tab]').forEach((b) => {
    b.addEventListener('click', () => { activePanel = Number(b.dataset.panelTab); markActive(); sync(); });
  });
  // One click puts the active panel's crop back to fit, so a bad crop
  // never strands the photo — the fastest way back to a good cover.
  resetButton.addEventListener('click', () => {
    state.panels[activePanel] = { photo: state.panels[activePanel].photo, zoom: 1, ox: 0, oy: 0 };
    sync();
    redraw();
  });
  sync();
}

/** Wire the "use sample" buttons: the kit's two free sample photos. */
function wireSamples() {
  document.querySelectorAll('[data-sample]').forEach((b) => {
    b.addEventListener('click', async () => {
      const slot = Number(b.dataset.sampleSlot || 0);
      state.photos[slot] = await loadImage(`samples/${b.dataset.sample}.jpg`);
      redraw();
    });
  });
}

buildControls();
[0, 1, 2].forEach(wirePhotoInput);
wireCrop();
wireSamples();

layoutButtons.forEach((b) => {
  b.addEventListener('click', () => { state.layout = b.dataset.layout; markActive(); redraw(); });
});
gradeButtons.forEach((b) => {
  b.addEventListener('click', () => { state.grade = b.dataset.grade; markActive(); redraw(); });
});
sizeSelect.addEventListener('change', () => { state.size = sizeSelect.value; redraw(); });
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
sublineInput.addEventListener('input', () => { state.subline = sublineInput.value; redraw(); });

exportButton.addEventListener('click', () => {
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    status.textContent = `Saved vice-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

// Screenshot mode: ?shot=cover shows the cover alone, ?shot=editor the page
// with a sample photo loaded. window.__shotReady is set once painted.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: async (name, slot) => {
      state.photos[slot] = await loadImage(`samples/${name}.jpg`);
    },
    apply: (patch) => {
      Object.assign(state, patch);
      captionInput.value = state.caption;
      sublineInput.value = state.subline;
      sizeSelect.value = state.size;
      markActive();
      redraw();
    },
    redraw,
  });
} else {
  markActive();
  redraw();
  // The bundled caption fonts load after the first paint; redraw once they
  // arrive so the live preview uses them, not the fallback.
  document.fonts.ready.then(redraw);
}
