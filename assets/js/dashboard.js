/* Management Dashboard — interactive reconstruction.
   Deterministic synthetic data, drawn with plain canvas. No libraries. */

import './demo-theme.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const RANGES = { '7d': 7, '30d': 30, '90d': 90, '12m': 12 };
let range = '30d';

/* ── data ───────────────────────────────────────────────────────────── */
const DEPTS = [
  ['Inpatient',        162, '--gold'],
  ['Outpatient',       138, '--azure'],
  ['Emergency',         96, '--rose'],
  ['Surgery & theatre', 84, '--jade'],
  ['Diagnostics',       61, '--violet'],
  ['Pharmacy',          44, '--amber'],
];

const WARDS = [
  ['3B Medical', 28], ['4A Surgical', 24], ['ICU', 12],
  ['Maternity', 20], ['Paediatrics', 18], ['Day surgery', 16],
];

function series(n, seed, base, amp, trend) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const weekly = Math.sin((i / (n > 20 ? 7 : 3)) * Math.PI * 2) * amp * 0.45;
    return Math.max(0, Math.round(base + trend * i + weekly + (r() - 0.5) * amp));
  });
}

function dataFor(key) {
  const n = RANGES[key];
  const seed = key.length * 977;
  const adm = series(n, seed, key === '12m' ? 1180 : 42, key === '12m' ? 190 : 13, key === '12m' ? 9 : 0.22);
  const dis = adm.map((v, i) => Math.max(0, Math.round(v * 0.94 + Math.sin(i / 3) * (key === '12m' ? 40 : 3))));

  const r = rng(seed + 17);
  const depts = DEPTS.map(([name, weight, colour]) => {
    const visits = Math.round(weight * (key === '12m' ? 62 : n) * (0.8 + r() * 0.45));
    return {
      name, colour,
      visits,
      los: +(1.6 + r() * 4.6).toFixed(1),
      wait: Math.round(9 + r() * 68),
      rev: Math.round(visits * (38 + r() * 120)),
      delta: +((r() - 0.42) * 22).toFixed(1),
    };
  });

  const wards = WARDS.map(([name, beds], i) => {
    const rr = rng(seed + i * 31);
    const used = Math.min(beds + 2, Math.round(beds * (0.62 + rr() * 0.46)));
    return { name, beds, used };
  });

  return { adm, dis, depts, wards, n };
}

const money = (v) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v);
const sum = (a) => a.reduce((x, y) => x + y, 0);

/* ── KPI tiles ──────────────────────────────────────────────────────── */
function renderKpis(d) {
  const host = $('#kpis');
  host.replaceChildren();

  const beds = sum(d.wards.map((w) => w.beds));
  const used = sum(d.wards.map((w) => w.used));
  const rev = sum(d.depts.map((x) => x.rev));
  const los = (sum(d.depts.map((x) => x.los * x.visits)) / sum(d.depts.map((x) => x.visits))).toFixed(1);
  const wait = Math.round(sum(d.depts.map((x) => x.wait * x.visits)) / sum(d.depts.map((x) => x.visits)));

  const tiles = [
    ['Bed occupancy', `${Math.round((used / beds) * 100)}`, '%', +2.4, '--gold'],
    ['Admissions', String(sum(d.adm)), range === '12m' ? 'this year' : `last ${range}`, +5.1, '--azure'],
    ['Avg length of stay', los, 'days', -3.2, '--jade'],
    ['Avg wait to be seen', String(wait), 'min', -8.6, '--violet'],
    ['Revenue', money(rev), 'MMK ×10³', +6.8, '--amber'],
  ];

  tiles.forEach(([label, value, unit, delta, accent]) => {
    const dl = document.createElement('dl');
    dl.className = 'kpi'; dl.style.setProperty('--accent', css(accent));
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    const u = document.createElement('u'); u.textContent = unit; dd.append(u);
    const del = document.createElement('div');
    const good = label.includes('wait') || label.includes('stay') ? delta < 0 : delta > 0;
    del.className = `delta ${delta === 0 ? 'flat' : good ? 'up' : 'down'}`;
    del.textContent = `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs. previous`;
    dl.append(dt, dd, del); host.append(dl);
  });
}

/* ── flow chart (admissions vs discharges) ──────────────────────────── */
function drawFlow(d) {
  const cv = $('#flowChart'), ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = 230;
  cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const hi = Math.max(...d.adm, ...d.dis) * 1.12;
  const X = (i) => pad.l + (i / (d.n - 1)) * (w - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - v / hi) * (h - pad.t - pad.b);

  ctx.strokeStyle = css('--line-soft'); ctx.fillStyle = css('--fg-3');
  ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const v = (hi * k) / 4, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText(v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v), pad.l - 6, y + 3);
  }

  ctx.textAlign = 'center';
  const step = Math.max(1, Math.ceil(d.n / 7));
  for (let i = 0; i < d.n; i += step) {
    const label = range === '12m'
      ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i % 12]
      : `${d.n - i}d`;
    ctx.fillText(label, X(i), h - 8);
  }

  const line = (data, colour, fill) => {
    ctx.beginPath();
    data.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
    ctx.strokeStyle = colour; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    if (!fill) return;
    ctx.lineTo(X(d.n - 1), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.closePath();
    const g = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
    g.addColorStop(0, `${colour}30`); g.addColorStop(1, `${colour}00`);
    ctx.fillStyle = g; ctx.fill();
  };
  line(d.adm, css('--gold'), true);
  line(d.dis, css('--azure'), false);
}

/* ── donut ──────────────────────────────────────────────────────────── */
let muted = new Set();
function drawDonut(d) {
  const cv = $('#donut'), ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const s = 170;
  cv.width = s * dpr; cv.height = s * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, s, s);

  const live = d.depts.filter((x) => !muted.has(x.name));
  const total = sum(live.map((x) => x.rev)) || 1;
  let a = -Math.PI / 2;
  const cx = s / 2, cy = s / 2, R = s / 2 - 6, r = R * 0.62;

  live.forEach((x) => {
    const sweep = (x.rev / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, a, a + sweep);
    ctx.arc(cx, cy, r, a + sweep, a, true);
    ctx.closePath();
    ctx.fillStyle = css(x.colour); ctx.fill();
    ctx.strokeStyle = css('--bg-1'); ctx.lineWidth = 2; ctx.stroke();
    a += sweep;
  });

  ctx.fillStyle = css('--fg');
  ctx.font = '600 17px -apple-system, "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(money(total), cx, cy - 6);
  ctx.fillStyle = css('--fg-3');
  ctx.font = '9px ui-monospace, Menlo, monospace';
  ctx.fillText('TOTAL REVENUE', cx, cy + 11);
}

function renderDonutKey(d) {
  const host = $('#donutKey');
  host.replaceChildren();
  const total = sum(d.depts.map((x) => x.rev));
  d.depts.forEach((x) => {
    const li = document.createElement('li');
    li.classList.toggle('mute', muted.has(x.name));
    li.title = 'Click to include or exclude';
    const i = document.createElement('i'); i.style.background = css(x.colour);
    const n = document.createElement('span'); n.textContent = x.name;
    const b = document.createElement('b'); b.textContent = `${Math.round((x.rev / total) * 100)}%`;
    li.append(i, n, b);
    li.addEventListener('click', () => {
      muted.has(x.name) ? muted.delete(x.name) : muted.add(x.name);
      if (muted.size === d.depts.length) muted.delete(x.name);   // never empty
      renderDonutKey(d); drawDonut(d);
    });
    host.append(li);
  });
}

/* ── wards ──────────────────────────────────────────────────────────── */
function renderWards(d) {
  const host = $('#wards');
  host.replaceChildren();
  const beds = sum(d.wards.map((w) => w.beds)), used = sum(d.wards.map((w) => w.used));
  $('#occTotal').textContent = `${used} / ${beds} beds`;

  d.wards.forEach((w, k) => {
    const pct = (w.used / w.beds) * 100;
    const li = document.createElement('li');
    li.className = `ward-row ${pct >= 100 ? 'over' : pct >= 85 ? 'high' : 'ok'}`;
    const n = document.createElement('span'); n.textContent = w.name;
    const c = document.createElement('span'); c.className = 'cap';
    c.textContent = `${w.used}/${w.beds} · ${Math.round(pct)}%`;
    const bar = document.createElement('div'); bar.className = 'ward-bar';
    const i = document.createElement('i');
    bar.append(i); li.append(n, c, bar); host.append(li);
    requestAnimationFrame(() => setTimeout(() => { i.style.width = `${Math.min(pct, 100)}%`; }, k * 60));
  });
}

/* ── department table ───────────────────────────────────────────────── */
let sortKey = 'rev', sortDir = -1;
function renderTable(d) {
  const body = $('#deptTable tbody');
  body.replaceChildren();

  const rows = [...d.depts].sort((a, b) => {
    const x = a[sortKey], y = b[sortKey];
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sortDir;
  });

  $$('#deptTable th').forEach((th) => {
    if (th.dataset.sort === sortKey) th.setAttribute('aria-sort', sortDir === 1 ? 'ascending' : 'descending');
    else th.removeAttribute('aria-sort');
  });

  rows.forEach((x) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = x.name;
    tr.append(th);
    [[x.visits.toLocaleString()], [`${x.los} d`], [`${x.wait} min`], [money(x.rev)]].forEach(([v]) => {
      const td = document.createElement('td'); td.className = 'num'; td.textContent = v; tr.append(td);
    });
    const td = document.createElement('td');
    td.className = `num ${x.delta >= 0 ? 'up' : 'down'}`;
    td.textContent = `${x.delta >= 0 ? '+' : ''}${x.delta}%`;
    tr.append(td); body.append(tr);
  });
}

$$('#deptTable th').forEach((th) => th.addEventListener('click', () => {
  const k = th.dataset.sort;
  sortDir = sortKey === k ? -sortDir : (k === 'name' ? 1 : -1);
  sortKey = k;
  renderTable(dataFor(range));
}));

/* ── range switch ───────────────────────────────────────────────────── */
function renderRangeSeg() {
  const seg = $('#rangeSeg');
  seg.replaceChildren();
  Object.keys(RANGES).forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = k;
    b.setAttribute('aria-pressed', String(k === range));
    b.addEventListener('click', () => { range = k; renderRangeSeg(); renderAll(); });
    seg.append(b);
  });
}

/* ── boot ───────────────────────────────────────────────────────────── */
function renderAll() {
  const d = dataFor(range);
  renderKpis(d); drawFlow(d); drawDonut(d); renderDonutKey(d); renderWards(d); renderTable(d);
}
renderRangeSeg();
renderAll();

/* One repaint per frame rather than one per event — a drag-resize fires dozens
   of times a second. A theme flip needs the full pass: both canvases and the
   donut key paint from the same CSS custom properties. */
let redraw = 0;
const schedule = (fn) => { cancelAnimationFrame(redraw); redraw = requestAnimationFrame(fn); };
addEventListener('resize', () => schedule(() => drawFlow(dataFor(range))));
addEventListener('themechange', () => schedule(renderAll));

const clock = () => {
  $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
};
clock();
// no point repainting a clock nobody is looking at
setInterval(() => { if (!document.hidden) clock(); }, 1000);
