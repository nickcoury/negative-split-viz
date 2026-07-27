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
  ['facets.html', 'Facets'],
  ['fielddyn.html', 'Field Dynamics'],
  ['archetypes.html', 'Archetypes'],
  ['records.html', 'Records'],
  ['spotlight.html', 'Nick Spotlight'],
  ['builder.html', 'Build-a-cohort'],
];

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

function layout(overrides) { return Object.assign({}, structuredClone(BASE_LAYOUT), overrides || {}); }
function mean(a) { return a.reduce((s, x) => s + x, 0) / a.length; }
function fmtHMS(h){const s=Math.round(h*3600);return `${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
