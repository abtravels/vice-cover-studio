// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, at the requested size.
// `photo` picks the sample (samples/<photo>.jpg), `caption` the words,
// `layout`, `grade` and `size` the look. `zoom` zooms the hero panel.
// window.__shotReady is set once the cover has been painted.
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const photo = query.get('photo') ?? 'pier';
  const second = query.get('photo2') ?? 'boulevard';
  const heroZoom = Number(query.get('zoom') ?? 1) || 1;

  // A missing sample must not kill the scene: an empty panel still shows
  // the layout, grade and caption, so the shot stays usable.
  try { await api.loadSample(photo, 0); } catch { /* empty hero panel */ }
  if (query.get('photo2')) {
    try { await api.loadSample(second, 1); } catch { /* empty panel */ }
  }
  if (query.get('photo3')) {
    try { await api.loadSample(query.get('photo3'), 2); } catch { /* empty panel */ }
  }

  api.apply({
    layout: query.get('layout') ?? 'triple',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? 'wide',
    caption: query.get('caption') ?? 'Sunset Heist',
    subline: query.get('subline') ?? 'Neon Nights',
    panels: [
      { photo: 0, zoom: heroZoom, ox: 0, oy: 0 },
      { photo: query.get('photo2') ? 1 : 0, zoom: 1.15, ox: 0, oy: 0.1 },
      { photo: query.get('photo3') ? 2 : 0, zoom: 1.15, ox: 0, oy: -0.1 },
    ],
  });

  await document.fonts.ready;
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
