// Shared helpers for the negative-split viz workbench.
const CLS_COLOR = { negative: '#2ec4b6', even: '#f4c430', positive: '#8a97a8' };
// Band colours: 'even' is the project's formal +/-0.5% definition; 'near-even'
// is the viz-only widening up to +3% (see analysis/viz/build_viz.py). Distinct
// hue so a genuinely even split is never mistaken for a merely close one.
const BAND_COLOR = { negative: '#2ec4b6', even: '#f4c430', 'near-even': '#e08b4c', positive: '#8a97a8' };
const BAND_LABEL = { negative: 'negative', even: 'even', 'near-even': 'near-even', positive: 'positive' };
const PAGES = [
  ['index.html', 'Index'],
  ['scatter.html', 'Scatter'],
  ['foresight.html', 'Foresight'],
  ['hindsight.html', 'Hindsight'],
  ['shapes-adv.html', 'Shape Metrics'],
  ['aggregate.html', 'Aggregate'],
  ['relative.html', 'Relative Perf'],
  ['cohorts.html', 'Cohorts'],
  ['athletes.html', 'Athletes'],
  ['gallery.html', 'Gallery'],
  ['intent.html', 'Intent'],
  ['census.html', 'Census'],
  ['repeats.html', 'Repeats'],
  ['careers.html', 'Careers'],
  ['mirror.html', 'Mirror'],
  ['attempts.html', 'Attempts'],
  ['lenses.html', 'Lenses'],
  ['anatomy.html', 'Anatomy'],
  ['n1.html', 'N=1'],
  ['races.html', 'Every race'],
  ['training.html', 'Training'],
  ['engine.html', 'Engine'],
  ['agenda.html', 'Agenda'],
  ['facets.html', 'Facets'],
  ['fielddyn.html', 'Field Dynamics'],
  ['archetypes.html', 'Archetypes'],
  ['records.html', 'Records'],
  ['spotlight.html', 'Nick Spotlight'],
  ['builder.html', 'Build-a-cohort'],
];

// --- the four efforts ------------------------------------------------------
// Replaces the old two-way 24h/100mi toggle. "100 miles" was never one thing:
// reaching the mark and stopping is a 100-mile race, reaching it and running
// another twelve hours is a 24-hour race passing through. Definitions and
// counts come from meta.json so the pages, build_viz.py and
// analysis/intent_cohorts.py can never disagree. `cohort_kind()` gives the
// unit system (24h projects distance, 100mi projects time) - never infer units
// from the cohort name.
let COHORT_META = null;
function initCohorts(meta) { COHORT_META = meta; }
function cohort_kind(c) { return (COHORT_META.cohort_kind || {})[c] || '100mi'; }
function cohort_label(c) { return (COHORT_META.cohort_label || {})[c] || c; }

// THE DISCIPLINE TABLE COMES FROM meta.json TOO, for exactly the reason the
// cohorts do. Five pages carried their own `DISC_LABEL` / `DISC_ORDER`
// literals, so every new rung of the ladder was five hand edits — and a rung
// that reached the DB but not a page's selector looks precisely like a rung
// with no data. `meta.disciplines` is the ladder SHORTEST FIRST (the ordering
// is the argument on every page that draws it) and `disciplines_present` is
// the subset with rows, which is what a selector should offer: a discipline
// that is scaffolded but not ingested must not appear as an empty bar, since
// a zero would read as "measured, and the answer is none".
function discLabel(d) {
  const t = ((COHORT_META || {}).disciplines || []).find(x => x.key === d);
  return t ? t.label : d;
}
/** [[key, label], ...] shortest first — every discipline, or only those with
 *  rows when `presentOnly`. */
function discList(presentOnly = true) {
  const meta = COHORT_META || {};
  const keys = presentOnly ? (meta.disciplines_present || [])
                           : (meta.disciplines || []).map(x => x.key);
  return keys.map(k => [k, discLabel(k)]);
}
/** Fill a <select> with the disciplines that have rows. */
function fillDiscSelect(el, preferred) {
  const list = discList(true);
  el.innerHTML = list.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');
  el.value = list.some(([k]) => k === preferred) ? preferred : (list[0] || [''])[0];
  return el.value;
}

/** Fill a <select> with the cohorts that actually have shapes, newest counts
 *  inline. Empty cohorts are shown disabled rather than hidden, so a gap in
 *  the data (e.g. no lap-resolved standalone 100s) stays visible instead of
 *  looking like it was never considered. Returns the chosen value. */
function fillCohortSelect(el, meta, preferred) {
  const counts = meta.n_shapes_cohort || {};
  const order = meta.cohorts || Object.keys(counts);
  el.innerHTML = order.map(c => {
    const n = counts[c] || 0;
    return `<option value="${c}"${n ? '' : ' disabled'}>${cohort_label(c)} (${n})</option>`;
  }).join('');
  const pick = (counts[preferred] ? preferred : order.find(c => counts[c])) || order[0];
  el.value = pick;
  return pick;
}

/** Is this cohort drawn from a COARSE checkpoint series (marathon 5 km mats,
 *  ~10 points) rather than a lap list (100-400)? */
function isCoarse(cohort) {
  return ((COHORT_META || {}).coarse_cohorts || []).includes(cohort);
}

/** The caveat a coarse cohort must carry, or ''. Written once, here, because
 *  it is a claim about the DATA and every page that draws these shapes owes
 *  the reader the same claim.
 *
 *  It says what `analysis/cadence_calibration.py` measured, not what feels
 *  safe: resampling 3,457 lap-complete ultras down to a marathon's ten
 *  checkpoints leaves the seconds-of-intentionality integral intact (median
 *  error 0.63 s/mi) and flips its held-back / metronome / overcooked call on
 *  ZERO of them. So these curves are trustworthy for what this page is for.
 *  What a 5 km cadence genuinely cannot see is a STOP — 802 of the 804
 *  verdict flips in that study were `stop_recover` becoming `overcooked`,
 *  the detector going blind rather than the runner behaving differently —
 *  so `stop_recover` is never offered here at all. */
function coarseNote(cohort) {
  if (!isCoarse(cohort)) return '';
  return '<span class="todo" style="color:#e08b4c"> · coarse cadence: ' +
    '~10 checkpoints (5 km mats), not a lap list. The intentionality curve ' +
    'survives this resolution (0 verdict flips in 3,457 resampled ultras); ' +
    'a mid-race STOP does not — so no shape here can be called ' +
    '&ldquo;stopped &amp; recovered&rdquo;.</span>';
}

function nav(active) {
  // Minimal: just a link back to the index (use the browser Back button to navigate).
  if (active === 'index.html') return;
  const h = document.createElement('header');
  h.className = 'nav';
  h.innerHTML = '<a href="index.html">&larr; Index</a>';
  document.body.prepend(h);
}

async function loadData() {
  const [results, shapes, meta] = await Promise.all([
    fetch('data/results.json').then(r => r.json()),
    fetch('data/shapes.json').then(r => r.json()),
    fetch('data/meta.json').then(r => r.json()),
  ]);
  return { results, shapes, meta };
}

// Plotly base layout (dark theme)
const BASE_LAYOUT = {
  paper_bgcolor: '#171d26', plot_bgcolor: '#0f1419',
  font: { color: '#e6edf3', size: 12 },
  margin: { l: 60, r: 20, t: 30, b: 50 },
  xaxis: { gridcolor: '#263140', zerolinecolor: '#3a4655' },
  yaxis: { gridcolor: '#263140', zerolinecolor: '#3a4655' },
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 11 } },
  hovermode: 'closest',
};
const CFG = { responsive: true, displaylogo: false, scrollZoom: true,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'] };

// Reusable "Wide mode" toggle: makes a chart wider than the viewport inside a
// horizontally-scrollable wrapper (drag across + pinch-zoom), toggling back to
// fit-to-screen. Call attachWide('divId'). Adds a small button above the chart.
function attachWide(id, wideW = 1200) {
  const el = document.getElementById(id);
  const wrap = document.createElement('div');
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);
  const btn = document.createElement('button');
  btn.textContent = '↔ Wide mode';
  btn.style.cssText = 'margin:0 0 6px;background:#0d1219;color:#93a1b0;border:1px solid #263140;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:13px';
  wrap.parentNode.insertBefore(btn, wrap);
  let wide = false;
  btn.onclick = () => {
    wide = !wide;
    if (wide) { wrap.style.overflowX = 'auto'; el.style.width = wideW + 'px';
      Plotly.relayout(id, { width: wideW }); btn.textContent = '⤢ Fit to screen'; btn.style.color = '#5aa9e6'; }
    else { wrap.style.overflowX = ''; el.style.width = '';
      Plotly.relayout(id, { width: null, autosize: true }); Plotly.Plots.resize(id); btn.textContent = '↔ Wide mode'; btn.style.color = '#93a1b0'; }
  };
}

// --- phone layout ----------------------------------------------------------
// Every chart on every page builds its layout through layout(), which makes
// this the one place a viewport rule can reach all 28 of them.
//
// Plotly margins are PIXELS, and the pages were written at ~1100px wide. A
// category strip asks for margin.l = 230 to fit athlete names; on a 316px
// phone column that leaves 86px of plot - the chart becomes a label list with
// a stripe of data next to it. Same for legends, which sit beside the plot by
// default and eat a third of the width.
//
// The rules: clamp side margins to a fraction of the actual width, drop the
// font a point, and push legends above the plot horizontally. Axis TITLES are
// left alone - they are what makes a chart readable to someone who did not
// write it, and dropping them to buy pixels is the wrong trade.
//
// automargin beats an explicit margin, so a page with long category labels
// must also shorten them - see shortLabel().
const PHONE_W = 640;
function isPhone() { return window.innerWidth <= PHONE_W; }

function layout(overrides) {
  const lay = Object.assign({}, structuredClone(BASE_LAYOUT), overrides || {});
  if (!isPhone()) return lay;
  const w = window.innerWidth;
  const m = Object.assign({ l: 60, r: 20, t: 30, b: 50 }, lay.margin || {});
  // Never spend more than ~38% of the width on the left gutter. Horizontal bar
  // charts legitimately need a wide one for their category labels, so the cap
  // is a compromise, not a target - a page with labels that do not fit in it
  // must shorten them (shortLabels) or wrap them onto two lines.
  m.l = Math.min(m.l, Math.max(44, Math.round(w * 0.38)));
  // The right gutter is only safe to reclaim when nothing is drawn in it.
  // `textposition:'outside'` on a horizontal bar puts the value labels there,
  // and squeezing r to 16 clipped them mid-string on the marathon-mirror
  // charts - a fix for one chart that broke another. Pages that keep outside
  // text on a phone keep their right margin.
  m.r = lay.annotations && lay.annotations.length ? m.r : Math.min(m.r, 16);
  m.t = Math.min(m.t, 34);
  lay.margin = m;
  lay.font = Object.assign({}, lay.font, { size: 11 });
  if (lay.legend !== null) {
    lay.legend = Object.assign({}, lay.legend, {
      orientation: 'h', x: 0, xanchor: 'left',
      y: (lay.legend && lay.legend.y !== undefined && lay.legend.y > 1) ? lay.legend.y : 1.02,
      yanchor: 'bottom', font: { size: 10 },
    });
  }
  return lay;
}

/** Shorten category labels (athlete names, event names) for a phone's y axis,
 *  returning a full-label -> short-label map. Desktop gets identity.
 *
 *  automargin:true tells Plotly to widen the margin until the longest label
 *  fits, which silently defeats the clamp in layout() - on the repeat-splitter
 *  strip it took 245 of 336px, leaving a stripe of plot and pushing the legend
 *  off to the right. The only way to get the width back is to make the label
 *  itself shorter.
 *
 *  It TRUNCATES rather than extracting a surname, because this dataset has no
 *  reliable name order: "Coury Nick" and "HOSL Patrick" are surname-first,
 *  "Olivier Leblond" is not, and "Fatton, Julia" is comma-separated. Taking
 *  the last token would label Patrick Hosl "Patrick". Truncation is never
 *  wrong, and the hover text carries the full name.
 *
 *  Collisions would be worse than long labels - two athletes sharing a
 *  truncated label become ONE category row on a Plotly category axis, silently
 *  merging their races - so the cut only applies if it stays unique. */
function shortLabels(names, max = 14) {
  const map = new Map(names.map(n => [n, n]));
  if (!isPhone()) return map;
  const cut = n => n.length <= max ? n : n.slice(0, max - 1).trimEnd() + '…';
  const shortened = names.map(cut);
  if (new Set(shortened).size !== new Set(names).size) return map;   // collision: keep full
  names.forEach((n, i) => map.set(n, shortened[i]));
  return map;
}

// Refit on rotate/resize. Only the WIDTH is refitted: the margin clamp above
// runs when a chart is built, and Plotly keeps the computed layout, so a chart
// first drawn in portrait keeps its portrait gutter in landscape - tighter
// than it needs to be, never broken.
//
// Do NOT reach for a page-defined redraw hook here. `window.redraw` looks like
// the obvious convention and is already taken: races.html and training.html
// define their own `redraw(pickable)` at top level, so calling it with no
// argument threw on every resize of those two pages. Any future hook needs a
// namespaced name and pages that opt in explicitly.
let _rzTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_rzTimer);
  _rzTimer = setTimeout(() => {
    document.querySelectorAll('.js-plotly-plot').forEach(el => Plotly.Plots.resize(el));
  }, 200);
});
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function fmtHMS(h){const s=Math.round(h*3600);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
