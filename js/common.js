// Shared helpers for the negative-split viz workbench.
const CLS_COLOR = { negative: '#2ec4b6', even: '#f4c430', positive: '#8a97a8' };
// Band colours: 'even' is the project's formal +/-0.5% definition; 'near-even'
// is the viz-only widening up to +3% (see analysis/viz/build_viz.py). Distinct
// hue so a genuinely even split is never mistaken for a merely close one.
const BAND_COLOR = { negative: '#2ec4b6', even: '#f4c430', 'near-even': '#e08b4c', positive: '#8a97a8' };
const BAND_LABEL = { negative: 'negative', even: 'even', 'near-even': 'near-even', positive: 'positive' };
const PAGES = [
  ['index.html', 'Index'],
  ['ladder.html', 'The Ladder'],
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
  ['deepdive.html', 'One discipline'],
  ['across.html', 'Across the ladder'],
  ['smooth.html', 'Smoothness'],
  ['steady.html', 'Steadiness'],
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
  ['coverage.html', 'Coverage'],
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

// --- THE LADDER RUNG: a shape's race DISTANCE, not its pacing cohort -------
// `cohort` splits the 100-mile rung three ways (stopped there, ran through it,
// a standalone race), which is the right unit for a pacing question and the
// wrong one for a selector whose label is a distance. `rung` is stamped on
// every shape by `build_viz.rung_of` and puts the embedded hundreds where a
// reader looking for "100 miles" expects them. Ordering is always the
// ladder's — SHORTEST FIRST — because on these pages the ordering IS the
// argument.

/** [[key, label, nShapes], ...] shortest first: the rungs shapes.json holds. */
function rungList(meta) {
  const order = (meta.disciplines || []).map(d => d.key);
  const have = meta.rungs_present_shapes || [];
  const n = meta.n_shapes_rung || {};
  return order.filter(k => have.includes(k)).map(k => [k, discLabel(k), n[k] || 0]);
}

/** Fill a <select> with those rungs, counts inline. Returns the chosen value. */
function fillRungSelect(el, meta, preferred) {
  const list = rungList(meta);
  el.innerHTML = list.map(([k, l, n]) => `<option value="${k}">${l} (${n})</option>`).join('');
  el.value = list.some(([k]) => k === preferred) ? preferred : (list[0] || [''])[0];
  return el.value;
}

// ONE COLOUR PER RUNG, SHARED BY EVERY PAGE THAT DRAWS THE LADDER. A
// sequential ramp rather than a categorical palette, because the rungs are
// ORDERED and a categorical scheme would throw that away — the whole point of
// these pages is that a quantity moves monotonically along the ladder, and the
// eye should get that for free. Cool = short, warm = long; the two ends are
// the site's existing accent and fade hues so the ramp does not read as a
// different design system from the band colours it sits beside.
const RUNG_RAMP = ['#5aa9e6', '#4fb8d8', '#2ec4b6', '#5cc48a', '#93c460',
                   '#c9be4a', '#e0a24c', '#d9834f', '#c96a6a', '#b05673'];
function rungColor(rung) {
  const order = ((COHORT_META || {}).disciplines || []).map(d => d.key);
  const i = order.indexOf(rung);
  return i < 0 ? '#8a97a8' : RUNG_RAMP[Math.round(i * (RUNG_RAMP.length - 1)
                                                  / Math.max(1, order.length - 1))];
}

// --- WHAT A SMOOTHNESS NUMBER MAY BE COMPARED WITH -------------------------
// `analysis/cadence_calibration.py` STUDY D resampled 4,004 lap-complete
// ultras to each rung's real publishing cadence and recomputed the decile
// metrics against the row's own full-resolution answer. Two results decide how
// these pages may be read, and both are measured rather than argued:
//
//   * `prog` and `quad_r2` survive. Median absolute error 0.024 and 0.057 at
//     EIGHT checkpoints, and 0.024 / 0.039 at a marathon's real mats. They are
//     the cross-rung statistics.
//   * `rough` and `curv` do NOT. A decile grid is exact when the feed's marks
//     land on the decile boundaries (an even 10 or 50 give error 0.000 to
//     three decimals) and blurs across them when they do not — a marathon's
//     5 km mats on a 42.195 km course line up with nothing and under-report
//     `rough` by 1.81 pp. That is larger than the gap between most rungs, so a
//     `rough` league table across the ladder would be ranking the timing mats.
//
// Written once, here, because it is a claim about the DATA and every page that
// draws these numbers owes the reader the same claim.
const SMOOTH_ALIGNED = { '10_km': true, '100_km': true, '100_mile': true, '24_hour': true };
function smoothNote(meta, rung) {
  const cc = ((meta.smooth || {}).cadence_cost || {}).by_cadence || {};
  const mm = cc['marathon_mats'] || {};
  const bias = mm.rough_bias != null ? mm.rough_bias.toFixed(2) : '1.81';
  const base = '<span class="todo"> · <b>rough</b> and <b>curv</b> are only '
    + 'comparable between series of the same cadence: an uneven mat layout '
    + 'blurs across the decile boundaries and under-reports roughness (a '
    + 'marathon’s mats by ' + bias + '&nbsp;pp, measured). '
    + '<b>prog</b> and <b>quad_r2</b> survive that (median error 0.024 / 0.057 '
    + 'at eight checkpoints) and are the cross-rung statistics.</span>';
  if (!rung) return base;
  const n = (((meta.smooth || {}).n_rung_resolved) || {})[rung];
  const tot = (meta.n_shapes_rung || {})[rung];
  if (n === 0) return '<span class="todo" style="color:#e08b4c"> · this rung is '
    + 'timed at fewer marks than the decile grid has bins, so its deciles are '
    + 'interpolated and its roughness is biased toward zero. Read '
    + '<b>prog</b> and <b>curv</b> here and not <b>rough</b>.</span>' + base;
  if (n != null && tot && n < tot) return '<span class="todo"> · ' + n
    + ' of ' + tot + ' shapes on this rung carry at least as many checkpoints '
    + 'as the decile grid has bins.</span>' + base;
  return base;
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

// --- THE LOADING STATE -----------------------------------------------------
// EVERY PAGE HERE FETCHES ITS DATA AFTER LOAD, AND UNTIL 2026-08-23 EXACTLY
// ONE OF THEM SAID SO. The rest rendered an empty frame for as long as the
// download took, which reads as broken rather than as slow — and the feed is
// tens of megabytes, so the wait is real. `loadJSON()` is the one fetch path:
// it shows a banner while the bytes come in, removes it when they land, and
// leaves a VISIBLE ERROR (not a blank page) if they do not. Pages call it
// instead of `fetch(...).then(r => r.json())`; `loadData()` is built on it.
//
// It also re-throws after showing the error, so a page that never wrote a
// `.catch` still tells the reader what happened.
let _loadN = 0;                 // outstanding loadJSON() calls (refcount)
let _loadBytes = 0, _loadTotal = 0, _loadTotalKnown = true;

function _loadEl() {
  let el = document.getElementById('loadbar');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadbar';
    el.className = 'loadbar';
    document.body.appendChild(el);
  }
  return el;
}

const _mb = b => (b / 1e6).toFixed(1) + ' MB';

function _loadPaint() {
  // The percentage is only offered when it can be trusted. `Content-Length`
  // is the ENCODED length, and GitHub Pages serves these files gzipped while
  // `Response.body` hands back decoded bytes — so the ratio can sail past
  // 100%. When it does, or when a response omits the header, the bar drops to
  // a byte counter rather than lying about progress.
  const el = _loadEl();
  if (el.classList.contains('err')) return;   // a failure outranks progress
  const pct = (_loadTotalKnown && _loadTotal && _loadBytes <= _loadTotal)
    ? Math.max(2, Math.round(100 * _loadBytes / _loadTotal)) : null;
  el.innerHTML =
    '<span class="msg">loading data<span class="dots"></span></span>'
    + '<span class="num">' + _mb(_loadBytes)
    + (pct === null ? '' : ' · ' + pct + '%') + '</span>'
    + '<i style="width:' + (pct === null ? 100 : pct) + '%"'
    + (pct === null ? ' class="indet"' : '') + '></i>';
}

function _loadFail(url, err) {
  const el = _loadEl();
  el.className = 'loadbar err';
  el.innerHTML = '<span class="msg">could not load <code>' + url
    + '</code> — ' + String(err && err.message || err)
    + '. Run <code>make viz-data</code>, or reload.</span>';
}

/** fetch + parse JSON with a visible loading state and a visible failure.
 *  Pass one url (resolves to the value) or an array (resolves to an array),
 *  exactly like the `fetch().then(r => r.json())` it replaces. */
async function loadJSON(urls) {
  const many = Array.isArray(urls);
  const list = many ? urls : [urls];
  if (_loadN === 0) { _loadBytes = 0; _loadTotal = 0; _loadTotalKnown = true; }
  _loadN += list.length;
  _loadPaint();
  const one = async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const len = +r.headers.get('content-length');
    if (len) _loadTotal += len; else _loadTotalKnown = false;
    if (!r.body) return r.json();          // no streams: fall back, no progress
    const reader = r.body.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      _loadBytes += value.length;
      _loadPaint();
    }
    return JSON.parse(new TextDecoder().decode(
      chunks.length === 1 ? chunks[0] : _concat(chunks)));
  };
  try {
    const out = await Promise.all(list.map(u => one(u).catch(e => {
      _loadFail(u, e); throw e;
    })));
    return many ? out : out[0];
  } finally {
    _loadN -= list.length;
    const el = document.getElementById('loadbar');
    if (_loadN <= 0 && el && !el.classList.contains('err')) el.remove();
  }
}

function _concat(chunks) {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(n);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

/** `shapes.json` as the flat array every page expects.
 *
 *  The file INTERNS its numeric series: the x grids are identical across
 *  shapes and several y series alias each other, so each list is written once
 *  into `pool` and the shape holds an index (`analysis/viz/build_viz.py`,
 *  `pooled_shapes` — 49 MB of array text, 24 MB of distinct arrays). This
 *  undoes it in one pass. A bare array is the pre-interning format and is
 *  passed through, so an older export still draws.
 *
 *  The expanded series are SHARED between shapes — the same JS array object
 *  appears in many. Read them; copy before mutating one. */
function expandShapes(payload) {
  if (Array.isArray(payload)) return payload;
  const { pool, pooled, shapes } = payload;
  for (const s of shapes) {
    for (const k of pooled) {
      if (typeof s[k] === 'number') s[k] = pool[s[k]];
    }
  }
  return shapes;
}

async function loadData() {
  const [results, shapes, meta] = await loadJSON([
    'data/results.json', 'data/shapes.json', 'data/meta.json']);
  return { results, shapes: expandShapes(shapes), meta };
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

// --- small statistics, shared by the three intentionality pages ------------
// Written here rather than three times, because a median that is computed one
// way in a chart and another way in the sentence above it is how a page ends
// up disagreeing with itself.

/** Linear-interpolated percentile, p in [0,1]. Null on an empty array. */
function pctl(a, p) {
  const s = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y);
  if (!s.length) return null;
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const median = a => pctl(a, 0.5);

/** Spearman rank correlation, ties averaged. Null under 3 pairs. */
function spearman(a, b) {
  const n = a.length;
  if (n < 3 || b.length !== n) return null;
  const rank = v => {
    const o = [...v.keys()].sort((i, j) => v[i] - v[j]);
    const r = new Array(n);
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && v[o[j + 1]] === v[o[i]]) j++;
      for (let k = i; k <= j; k++) r[o[k]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a), rb = rank(b);
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** Bootstrap CI for the median, with a FIXED seed so the same data always
 *  draws the same whiskers. A page that jitters its own error bars on every
 *  reload teaches the reader to distrust them.
 *
 *  IT RESAMPLES ATHLETES, NOT PERFORMANCES, WHEN GIVEN A CLUSTER KEY. The
 *  independent unit on these pages is not the row: `analysis/rate_fragility.py`
 *  measured an intra-class correlation of 0.117 by EDITION on the 10 km rung,
 *  a design effect of 4.16, so a naive interval is about half as wide as it
 *  should be. Pass `keys` (edition, athlete — whatever the clustering is) and
 *  whole clusters are drawn together. */
function bootMedianCI(vals, keys, iters = 400, seed = 7) {
  const v = vals.filter(x => x != null && isFinite(x));
  if (v.length < 8) return [null, null];
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  let groups;
  if (keys && keys.length === vals.length) {
    const m = new Map();
    vals.forEach((x, i) => {
      if (x == null || !isFinite(x)) return;
      const k = keys[i];
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    });
    groups = [...m.values()];
  } else groups = v.map(x => [x]);
  const out = [];
  for (let b = 0; b < iters; b++) {
    const draw = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[Math.floor(rnd() * groups.length)];
      for (const x of g) draw.push(x);
    }
    const m = median(draw);
    if (m != null) out.push(m);
  }
  out.sort((x, y) => x - y);
  return out.length ? [pctl(out, 0.025), pctl(out, 0.975)] : [null, null];
}

/** Resample a (x, y) series onto a shared 0..100 grid by linear interpolation.
 *
 *  The foresight/seconds curves do NOT share an x grid: `profile` starts each
 *  one at that athlete's first real checkpoint (`shapes_start_at_a_real_
 *  checkpoint` — the alternative is drawing pure model in the same ink as the
 *  data), so a marathon's opens at 11.9% and a lap ultra's at 0.1%. Averaging
 *  them index-by-index would average the 11.9% mark of one race against the
 *  0.1% mark of another. Outside a curve's own range this returns null, so a
 *  cohort mean is taken only over the curves that actually reach that x. */
function onGrid(xs, ys, grid) {
  const out = new Array(grid.length).fill(null);
  if (!xs || xs.length < 2) return out;
  let j = 1;
  for (let i = 0; i < grid.length; i++) {
    const g = grid[i];
    if (g < xs[0] || g > xs[xs.length - 1]) continue;
    while (j < xs.length - 1 && xs[j] < g) j++;
    const x0 = xs[j - 1], x1 = xs[j];
    out[i] = x1 === x0 ? ys[j] : ys[j - 1] + (ys[j] - ys[j - 1]) * (g - x0) / (x1 - x0);
  }
  return out;
}

/** Column-wise percentile of many equal-length series, nulls skipped. */
function bandOf(series, p) {
  if (!series.length) return [];
  return series[0].map((_, i) => pctl(series.map(s => s[i]), p));
}
function fmtHMS(h){const s=Math.round(h*3600);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
