/* Hospital E-book — interactive reconstruction of the patient chart.
   Every value here is synthesised in-browser from a fixed seed, so the ward
   looks the same on every visit but has never been anywhere near a real
   record.  No network, no storage. */

import { news2 } from './news2.js';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── deterministic RNG (mulberry32) ─────────────────────────────────── */
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b, dp = 0) => +(a + r() * (b - a)).toFixed(dp);

/* ── synthetic ward ─────────────────────────────────────────────────── */
const GIVEN = ['Thiri', 'Kyaw', 'Moe', 'Aye', 'Zin', 'Hnin', 'Nay', 'Su', 'Thet', 'Myat',
  'Elena', 'Rafael', 'Amara', 'Jonas', 'Priya', 'Tomás', 'Nadia', 'Ibrahim'];
const FAMILY = ['Aung', 'Htun', 'Win', 'Lwin', 'Oo', 'Myint', 'Soe', 'Hlaing',
  'Duarte', 'Okafor', 'Novak', 'Reyes', 'Haddad', 'Lindqvist'];
const DX = ['Community-acquired pneumonia', 'Decompensated heart failure', 'Cellulitis, left leg',
  'Acute pyelonephritis', 'COPD exacerbation', 'Post-op day 2, cholecystectomy',
  'Diabetic ketoacidosis, resolving', 'Upper GI bleed, stable', 'Acute pancreatitis'];
const ALLERGY = ['Penicillin', 'Sulfonamides', 'Aspirin', 'Iodinated contrast', 'Morphine', 'Latex'];
const HUES = [38, 218, 162, 280, 12, 195];

const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function makePatient(i) {
  const r = rng(9001 + i * 7919);
  const name = `${pick(r, GIVEN)} ${pick(r, FAMILY)}`;
  const acuity = 1 + Math.floor(r() * 3);
  const onOxygen = acuity === 3 && r() > 0.35;

  // vitals drift around a per-patient baseline; sicker patients drift worse
  const base = {
    pulse: between(r, 62, 78) + (acuity - 1) * 16,
    sbp:   between(r, 108, 132) - (acuity - 1) * 12,
    dbp:   between(r, 64, 82),
    resp:  between(r, 13, 17) + (acuity - 1) * 4,
    spo2:  between(r, 96, 99) - (acuity - 1) * 3,
    temp:  between(r, 36.3, 36.9, 1) + (acuity - 1) * 0.6,
  };

  const history = [];                     // 12h @ 15-min resolution
  const now = Date.now();
  for (let t = 48; t >= 0; t--) {
    const w = rng(i * 131 + t);
    history.push({
      at: now - t * 15 * 60 * 1000,
      pulse: Math.round(base.pulse + Math.sin(t / 5) * 5 + (w() - 0.5) * 7),
      sbp:   Math.round(base.sbp + Math.sin(t / 8 + 1) * 6 + (w() - 0.5) * 8),
      resp:  Math.round(base.resp + Math.sin(t / 6) * 1.6 + (w() - 0.5) * 2),
      spo2:  Math.min(100, Math.round(base.spo2 + Math.sin(t / 9) * 1.1 + (w() - 0.5) * 1.6)),
      temp:  +(base.temp + Math.sin(t / 11) * 0.25 + (w() - 0.5) * 0.2).toFixed(1),
    });
  }

  const allergies = r() > 0.45 ? [pick(r, ALLERGY)] : [];
  if (r() > 0.85) allergies.push(pick(r, ALLERGY));

  return {
    id: i, name, initials: initials(name), hue: HUES[i % HUES.length],
    mrn: `MRN-${String(480000 + Math.floor(r() * 90000))}`,
    age: 24 + Math.floor(r() * 58),
    sex: r() > 0.5 ? 'M' : 'F',
    bed: `3B-${String(i + 1).padStart(2, '0')}`,
    dx: pick(r, DX), acuity, onOxygen,
    alert: !(acuity === 3 && r() > 0.8),
    allergies: [...new Set(allergies)],
    dnacpr: r() > 0.88,
    los: 1 + Math.floor(r() * 9),
    history,
    meds: makeMeds(rng(i * 373 + 11), allergies),
    labs: makeLabs(rng(i * 577 + 3)),
    notes: makeNotes(rng(i * 811 + 5), name),
  };
}

const MEDS = [
  ['Amoxicillin-clavulanate', '1.2 g', 'IV', 8, 'Penicillin'],
  ['Paracetamol', '1 g', 'PO', 6, null],
  ['Enoxaparin', '40 mg', 'SC', 24, null],
  ['Furosemide', '40 mg', 'IV', 12, 'Sulfonamides'],
  ['Salbutamol neb', '5 mg', 'NEB', 4, null],
  ['Omeprazole', '40 mg', 'PO', 24, null],
  ['Metformin', '500 mg', 'PO', 12, null],
  ['Insulin aspart', 'sliding scale', 'SC', 6, null],
  ['Ceftriaxone', '2 g', 'IV', 24, null],
];

function makeMeds(r, allergies) {
  const n = 4 + Math.floor(r() * 3);
  const chosen = [...MEDS].sort(() => r() - 0.5).slice(0, n);
  const now = Date.now();
  return chosen.map(([name, dose, route, freq, clash], k) => {
    const offset = Math.round((r() - 0.55) * 5) * 30 * 60 * 1000;    // ±2.5 h
    const due = now + offset;
    let state = 'soon';
    if (due < now - 30 * 60 * 1000) state = 'late';
    else if (Math.abs(due - now) <= 30 * 60 * 1000) state = 'due';
    if (r() > 0.72 && due < now) state = 'done';
    return {
      id: k, name, dose, route, freq, due, state,
      givenAt: state === 'done' ? due + Math.round(r() * 12) * 60000 : null,
      conflict: clash && allergies.includes(clash) ? clash : null,
    };
  }).sort((a, b) => a.due - b.due);
}

const LAB_PANEL = [
  ['Haemoglobin',      'g/dL',   13.0, 17.0, 9.5,  18.5],
  ['White cell count', '×10⁹/L',  4.0, 11.0,  2.8, 22.0],
  ['Platelets',        '×10⁹/L', 150,  400,   90,  520],
  ['Sodium',           'mmol/L', 135,  145,  126,  152],
  ['Potassium',        'mmol/L',  3.5,  5.1,  2.8,  6.2],
  ['Creatinine',       'µmol/L',  60,   110,   52,  280],
  ['CRP',              'mg/L',     0,     5,    0,  190],
  ['Lactate',          'mmol/L',   0.5,  2.0,  0.4,  4.8],
];

function makeLabs(r) {
  return LAB_PANEL.map(([name, unit, lo, hi, min, max]) => {
    const abnormal = r() > 0.62;
    const dp = hi < 20 ? 1 : 0;
    const value = abnormal
      ? (r() > 0.5 ? between(r, hi, max, dp) : between(r, min, lo, dp))
      : between(r, lo, hi, dp);
    return { name, unit, lo, hi, value, flag: value > hi ? 'H' : value < lo ? 'L' : 'N' };
  });
}

function makeNotes(r, name) {
  const who = ['Dr. K. Hlaing', 'Dr. M. Thein', 'Dr. S. Aung', 'Dr. P. Nandar'];
  const S = ['Feels a little better this morning. Cough is looser. Slept through the night.',
    'Reports mild breathlessness on exertion to the bathroom. No chest pain.',
    'No new complaints overnight. Appetite improving.',
    'Pain over the wound 3/10, settled after regular analgesia.'];
  const O = ['Chest clearer at the bases. No new crackles. Abdomen soft, non-tender.',
    'Obs stable, afebrile past 24 h. Calves soft.',
    'Wound clean and dry, no surrounding erythema. Drain output 30 mL.',
    'Mildly tachycardic, otherwise unremarkable examination.'];
  const A = ['Responding to treatment. No evidence of deterioration.',
    'Slow but steady improvement. Continue current plan.',
    'Clinically stable, ready to step down to oral therapy.',
    'Recovery on track for day 2 post-op.'];
  const P = ['Continue IV antibiotics, review switch to oral in 24 h. Repeat bloods in the morning.',
    'Mobilise with physio today. Reduce oxygen as tolerated.',
    'Discharge planning to begin. Pharmacy to prepare TTOs.',
    'Repeat CRP and FBC tomorrow. Keep on 4-hourly obs.'];
  const n = 2 + Math.floor(r() * 2);
  return Array.from({ length: n }, (_, k) => ({
    at: Date.now() - (k * 22 + 3) * 3600 * 1000,
    who: pick(r, who), kind: k === 0 ? 'Ward round' : 'Progress note',
    s: pick(r, S), o: pick(r, O), a: pick(r, A), p: pick(r, P),
  }));
}

const WARD = Array.from({ length: 7 }, (_, i) => makePatient(i));

/* ── formatting ─────────────────────────────────────────────────────── */
const hhmm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
const rel = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (Math.abs(m) < 60) return m >= 0 ? `${m} min ago` : `in ${-m} min`;
  const h = Math.round(m / 60);
  return h >= 0 ? `${h} h ago` : `in ${-h} h`;
};

/* ── state ──────────────────────────────────────────────────────────── */
let current = WARD[0];
let trendKey = 'pulse';
const TRENDS = { pulse: 'Pulse', sbp: 'Systolic BP', resp: 'Resp rate', spo2: 'SpO₂', temp: 'Temp' };

const latest = (p) => p.history.at(-1);

/* ── ward list ──────────────────────────────────────────────────────── */
function renderWard() {
  const list = $('#ptList');
  list.replaceChildren();
  $('#wardCount').textContent = `${WARD.length} beds`;

  WARD.forEach((p) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ptrow'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(p === current));

    const av = document.createElement('span');
    av.className = 'av'; av.textContent = p.initials;
    av.style.background = `linear-gradient(150deg, hsl(${p.hue} 62% 72%), hsl(${p.hue} 55% 48%))`;

    const box = document.createElement('span');
    const nm = document.createElement('b'); nm.textContent = p.name;
    const meta = document.createElement('small'); meta.textContent = `${p.bed} · ${p.age}${p.sex}`;
    box.append(nm, meta);

    const ac = document.createElement('span');
    ac.className = `acuity a${p.acuity}`;
    ac.title = ['', 'Stable', 'Needs watching', 'Unwell'][p.acuity];

    b.append(av, box, ac);
    b.addEventListener('click', () => { current = p; renderAll(); });
    li.append(b); list.append(li);
  });
}

/* ── header ─────────────────────────────────────────────────────────── */
function renderHead() {
  const p = current;
  const av = $('#ptAvatar');
  av.textContent = p.initials;
  av.style.background = `linear-gradient(150deg, hsl(${p.hue} 62% 74%), hsl(${p.hue} 55% 46%))`;

  $('#ptName').textContent = p.name;
  $('#ptMeta').textContent = `${p.mrn} · ${p.age}${p.sex} · Bed ${p.bed} · Day ${p.los} · ${p.dx}`;

  const flags = $('#ptFlags');
  flags.replaceChildren();
  const add = (cls, text) => {
    const s = document.createElement('span'); s.className = `flag ${cls}`; s.textContent = text; flags.append(s);
  };
  if (p.allergies.length) add('allergy', `Allergy: ${p.allergies.join(', ')}`);
  else add('info', 'No known allergies');
  if (p.onOxygen) add('alert', 'On oxygen');
  if (p.dnacpr) add('alert', 'DNACPR');
  if (!p.alert) add('alert', 'Reduced consciousness');
}

/* ── vitals ─────────────────────────────────────────────────────────── */
const RANGES = {
  pulse: [51, 90], sbp: [111, 219], resp: [12, 20], spo2: [96, 100], temp: [36.1, 38.0],
};
function severity(key, v) {
  const [lo, hi] = RANGES[key];
  if (v >= lo && v <= hi) return '';
  const span = hi - lo;
  return (v < lo - span * 0.22 || v > hi + span * 0.22) ? 'crit' : 'warn';
}

function renderVitals() {
  const p = current, v = latest(p);
  const host = $('#vitals');
  host.replaceChildren();

  const rows = [
    ['Pulse', v.pulse, 'bpm', 'pulse'],
    ['Blood pressure', `${v.sbp}/${Math.round(v.sbp * 0.62)}`, 'mmHg', 'sbp'],
    ['Resp rate', v.resp, '/min', 'resp'],
    ['SpO₂', v.spo2, '%', 'spo2'],
    ['Temperature', v.temp.toFixed(1), '°C', 'temp'],
  ];

  rows.forEach(([label, value, unit, key]) => {
    const d = document.createElement('dl');
    d.className = `vital ${severity(key, key === 'sbp' ? v.sbp : v[key])}`.trim();
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    const u = document.createElement('u'); u.textContent = unit; dd.append(u);
    const spark = document.createElement('canvas');
    spark.className = 'spark'; spark.width = 220; spark.height = 40;
    d.append(dt, dd, spark);
    host.append(d);
    drawSpark(spark, p.history.slice(-24).map((h) => (key === 'sbp' ? h.sbp : h[key])), p.hue);
  });

  const score = news2({
    resp: v.resp, spo2: v.spo2, onOxygen: p.onOxygen,
    sbp: v.sbp, pulse: v.pulse, alert: p.alert, temp: v.temp,
  });
  const n = $('#news');
  n.dataset.risk = score.risk === 'low-medium' ? 'medium' : score.risk;
  n.replaceChildren();
  const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = 'NEWS2';
  const b = document.createElement('b'); b.textContent = score.total;
  const risk = document.createElement('span'); risk.textContent = `${score.risk} risk`;
  const act = document.createElement('span'); act.className = 'act'; act.textContent = score.action;
  n.append(lbl, b, risk, act);
}

function drawSpark(cv, data, hue) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth || 220, h = 40;
  cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - 4 - ((d - lo) / span) * (h - 12);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = `hsl(${hue} 60% 60% / .8)`; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
  ctx.fillStyle = `hsl(${hue} 60% 60% / .12)`; ctx.fill();
}

/* ── trend chart ────────────────────────────────────────────────────── */
function renderTrendSeg() {
  const seg = $('#trendSeg');
  seg.replaceChildren();
  Object.entries(TRENDS).forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.setAttribute('aria-pressed', String(k === trendKey));
    b.addEventListener('click', () => { trendKey = k; renderTrendSeg(); drawTrend(); });
    seg.append(b);
  });
}

function drawTrend() {
  const cv = $('#trendCanvas'), ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = cv.clientWidth, h = 190;
  cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const data = current.history.map((p) => p[trendKey]);
  const pad = { l: 38, r: 10, t: 12, b: 22 };
  const [rlo, rhi] = RANGES[trendKey];
  const lo = Math.min(...data, rlo) - 2, hi = Math.max(...data, rhi) + 2, span = hi - lo || 1;
  const X = (i) => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const Y = (v) => pad.t + (1 - (v - lo) / span) * (h - pad.t - pad.b);

  // normal band
  ctx.fillStyle = `${css('--jade')}14`;
  ctx.fillRect(pad.l, Y(Math.min(rhi, hi)), w - pad.l - pad.r, Y(Math.max(rlo, lo)) - Y(Math.min(rhi, hi)));

  // grid + axis
  ctx.strokeStyle = css('--line-soft'); ctx.lineWidth = 1;
  ctx.fillStyle = css('--fg-3'); ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right';
  for (let k = 0; k <= 4; k++) {
    const v = lo + (span * k) / 4, y = Y(v);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillText(trendKey === 'temp' ? v.toFixed(1) : Math.round(v), pad.l - 6, y + 3);
  }
  ctx.textAlign = 'center';
  [0, 12, 24, 36, 48].forEach((i) => {
    if (i < data.length) ctx.fillText(hhmm(current.history[i].at), X(i), h - 6);
  });

  // series
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b);
  grad.addColorStop(0, css('--gold-2')); grad.addColorStop(1, css('--gold-dim'));
  ctx.beginPath();
  data.forEach((d, i) => (i ? ctx.lineTo(X(i), Y(d)) : ctx.moveTo(X(i), Y(d))));
  ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  ctx.lineTo(X(data.length - 1), h - pad.b); ctx.lineTo(X(0), h - pad.b); ctx.closePath();
  ctx.fillStyle = `${css('--gold')}18`; ctx.fill();

  // latest point
  const lx = X(data.length - 1), ly = Y(data.at(-1));
  ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 7); ctx.fillStyle = css('--gold-2'); ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 8, 0, 7); ctx.strokeStyle = `${css('--gold')}55`; ctx.lineWidth = 1.5; ctx.stroke();
}

/* ── medications ────────────────────────────────────────────────────── */
function renderMeds() {
  const host = $('#meds');
  host.replaceChildren();
  const outstanding = current.meds.filter((m) => m.state === 'due' || m.state === 'late').length;
  $('#medPip').textContent = outstanding || '';

  current.meds.forEach((m) => {
    const li = document.createElement('li');
    li.className = 'med'; li.dataset.s = m.state;

    const stripe = document.createElement('span'); stripe.className = 'stripe';

    const box = document.createElement('div');
    const b = document.createElement('b'); b.textContent = `${m.name} ${m.dose}`;
    const s = document.createElement('small');
    s.textContent = `${m.route} · every ${m.freq} h · due ${hhmm(m.due)} (${rel(m.due)})`;
    box.append(b, s);
    if (m.conflict) {
      const warn = document.createElement('small');
      warn.className = 'warn-inline';
      warn.textContent = `⚠ Documented allergy to ${m.conflict} — confirm before administering`;
      box.append(warn);
    }

    let action;
    if (m.state === 'done') {
      action = document.createElement('span');
      action.className = 'given-at'; action.textContent = `✓ ${hhmm(m.givenAt)}`;
    } else {
      action = document.createElement('button');
      action.type = 'button'; action.className = 'give';
      action.textContent = m.conflict ? 'Review & give' : 'Administer';
      action.addEventListener('click', () => {
        if (m.conflict && !confirm(
          `${current.name} has a documented allergy to ${m.conflict}.\n\n` +
          `${m.name} ${m.dose} belongs to that class.\n\nAdminister anyway?`)) return;
        m.state = 'done'; m.givenAt = Date.now();
        renderMeds();
      });
    }

    li.append(stripe, box, action);
    host.append(li);
  });
}

/* ── labs ───────────────────────────────────────────────────────────── */
function renderLabs() {
  const body = $('#labs tbody');
  body.replaceChildren();
  current.labs.forEach((l) => {
    const tr = document.createElement('tr');
    const cells = [
      l.name,
      `${l.value} ${l.unit}`,
      `${l.lo}–${l.hi}`,
    ];
    cells.forEach((c, i) => {
      const td = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) td.scope = 'row';
      td.textContent = c; tr.append(td);
    });
    const td = document.createElement('td');
    const f = document.createElement('span');
    f.className = `lf ${l.flag}`;
    f.textContent = l.flag === 'N' ? 'normal' : l.flag === 'H' ? 'HIGH' : 'LOW';
    td.append(f); tr.append(td);
    body.append(tr);
  });
}

/* ── notes ──────────────────────────────────────────────────────────── */
function renderNotes() {
  const host = $('#notes');
  host.replaceChildren();
  current.notes.forEach((n) => {
    const li = document.createElement('li');
    li.className = 'note';
    const head = document.createElement('header');
    const h = document.createElement('h4'); h.textContent = n.kind;
    const who = document.createElement('span'); who.className = 'who'; who.textContent = n.who;
    const t = document.createElement('time');
    t.dateTime = new Date(n.at).toISOString();
    t.textContent = `${new Date(n.at).toLocaleDateString([], { day: '2-digit', month: 'short' })} ${hhmm(n.at)}`;
    head.append(h, who, t);

    const dl = document.createElement('dl');
    [['S', n.s], ['O', n.o], ['A', n.a], ['P', n.p]].forEach(([k, v]) => {
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = v;
      dl.append(dt, dd);
    });

    li.append(head, dl); host.append(li);
  });
}

/* ── tabs ───────────────────────────────────────────────────────────── */
$$('.tabs button').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tabs button').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    $$('.pane').forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
    if (tab.dataset.tab === 'vitals') drawTrend();
  });
});

/* ── live vitals ────────────────────────────────────────────────────── */
function tick() {
  WARD.forEach((p) => {
    const last = p.history.at(-1);
    const j = (v, amt, dp = 0) => +(v + (Math.random() - 0.5) * amt).toFixed(dp);
    p.history.push({
      at: Date.now(),
      pulse: Math.round(j(last.pulse, 4)),
      sbp:   Math.round(j(last.sbp, 5)),
      resp:  Math.max(6, Math.round(j(last.resp, 1.6))),
      spo2:  Math.min(100, Math.round(j(last.spo2, 1.2))),
      temp:  j(last.temp, 0.16, 1),
    });
    if (p.history.length > 49) p.history.shift();
  });
  renderVitals();
  if (!$('[data-pane="vitals"]').hidden) drawTrend();
}

/* ── boot ───────────────────────────────────────────────────────────── */
function renderAll() {
  renderWard(); renderHead(); renderVitals(); renderMeds(); renderLabs(); renderNotes(); drawTrend();
}
renderTrendSeg();
renderAll();
addEventListener('resize', () => { drawTrend(); renderVitals(); });
if (!reduced) setInterval(tick, 4000);
