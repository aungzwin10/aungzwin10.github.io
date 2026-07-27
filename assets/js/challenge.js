/* The Bug Hunt — click the line that breaks in production.
   All state is in memory. Nothing is stored, nothing is sent. */

import './demo-theme.js';
import { BUGS } from './bugs.js';

const $ = (s, r = document) => r.querySelector(s);
const ROUND_MS = 20000;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── minimal tokeniser ──────────────────────────────────────────────
   Builds DOM nodes with textContent only — no innerHTML anywhere, so a
   snippet can never inject markup. */
const KEYWORDS = new Set(('public private protected static final class void return new if else for while '
  + 'import package extends implements try catch throw throws int long double boolean String List Map '
  + 'select from where left join on order by and or as distinct null true false '
  + 'await async final var const override future void this').split(' '));

function tokenise(line) {
  const frag = document.createDocumentFragment();
  const re = /(\/\/.*$|--.*$|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|(@\w+)|(\b\d[\d._]*\b)|(\b[A-Za-z_]\w*\b)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const [txt, com, str, ann, num, word, ws] = m;
    let cls = null;
    if (com) cls = 't-com';
    else if (str) cls = 't-str';
    else if (ann) cls = 't-ann';
    else if (num) cls = 't-num';
    else if (word) {
      const lower = word.toLowerCase();
      if (KEYWORDS.has(word) || KEYWORDS.has(lower)) cls = 't-key';
      else if (/^[A-Z]/.test(word)) cls = 't-typ';
      else if (line[re.lastIndex] === '(') cls = 't-fn';
    } else if (ws) cls = null;

    if (cls) {
      const s = document.createElement('span');
      s.className = cls; s.textContent = txt; frag.append(s);
    } else {
      frag.append(document.createTextNode(txt));
    }
  }
  return frag;
}

/* ── state ──────────────────────────────────────────────────────────── */
let deck = [], idx = 0, score = 0, found = 0, streak = 0, bestStreak = 0;
let times = [], startedAt = 0, raf = 0, locked = false;

const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(([, v]) => v);
const show = (id) => ['intro', 'round', 'result'].forEach((s) => { $(`#${s}`).hidden = s !== id; });

/* ── round ──────────────────────────────────────────────────────────── */
function renderRound() {
  const b = deck[idx];
  locked = false;

  $('#roundBadge').textContent = `Bug ${idx + 1} / ${deck.length}`;
  $('#scoreBadge').textContent = `${score} pts`;
  $('#lang').textContent = b.lang;
  $('#file').textContent = b.file;
  $('#brief').textContent = b.brief;
  $('#streak').textContent = streak >= 2 ? `🔥 ${streak} streak` : '';
  $('#verdict').hidden = true;

  const ol = $('#code');
  ol.replaceChildren();
  ol.removeAttribute('data-locked');

  b.lines.forEach((line, i) => {
    const li = document.createElement('li');
    if (line.trim() === '') li.classList.add('blank');
    // the tokens must live inside ONE element: the <li> is a grid
    // (line-number column + code column), so loose spans would each
    // become their own grid item and the line would fall apart.
    const code = document.createElement('code');
    code.append(tokenise(line || ' '));
    li.append(code);
    li.addEventListener('click', () => answer(i));
    ol.append(li);
  });

  startedAt = performance.now();
  runClock();
}

function runClock() {
  cancelAnimationFrame(raf);
  const bar = $('#timerBar'), out = $('#clock');
  const step = () => {
    const left = Math.max(0, ROUND_MS - (performance.now() - startedAt));
    bar.style.transform = `scaleX(${left / ROUND_MS})`;
    out.textContent = `${(left / 1000).toFixed(1)}s`;
    if (left <= 0) return answer(-1);
    if (!locked) raf = requestAnimationFrame(step);
  };
  if (reduced) { bar.style.transform = 'scaleX(1)'; out.textContent = '—'; return; }
  raf = requestAnimationFrame(step);
}

function answer(picked) {
  if (locked) return;
  locked = true;
  cancelAnimationFrame(raf);

  const b = deck[idx];
  const elapsed = Math.min(performance.now() - startedAt, ROUND_MS);
  const ok = picked === b.bug;
  times.push(elapsed);

  const ol = $('#code');
  ol.setAttribute('data-locked', '');
  [...ol.children][b.bug].classList.add('right');
  if (picked >= 0 && !ok) [...ol.children][picked].classList.add('wrong');

  let gained = 0;
  if (ok) {
    found++; streak++; bestStreak = Math.max(bestStreak, streak);
    const speed = Math.round(120 * (1 - elapsed / ROUND_MS));   // 0–120
    gained = Math.round((100 + speed) * (1 + (streak - 1) * 0.25));
    score += gained;
  } else {
    streak = 0;
  }

  const v = $('#verdict');
  v.hidden = false;
  v.dataset.ok = ok ? '1' : '0';
  $('#mark').textContent = ok ? '✓' : '✕';
  $('#verdictTitle').textContent = ok
    ? b.title
    : picked === -1 ? `Out of time — ${b.title}` : `Not quite — ${b.title}`;
  $('#gained').textContent = gained ? `+${gained}` : '';
  $('#why').textContent = b.why;
  $('#fix').textContent = b.fix;
  $('#scoreBadge').textContent = `${score} pts`;
  $('#nextBtn').textContent = idx === deck.length - 1 ? 'See your score →' : 'Next bug →';
  $('#nextBtn').focus();
}

/* ── result ─────────────────────────────────────────────────────────── */
const RANKS = [
  [0.00, 'Fresh eyes', 'Every one of these has bitten a real team. Now you know eight of them.'],
  [0.40, 'Code reviewer', 'You would have caught most of these before they merged. That is the job.'],
  [0.65, 'Senior engineer', 'Solid instincts. You have clearly debugged something painful before.'],
  [0.88, 'On-call veteran', 'You have been paged for these. I am sorry, and also: respect.'],
];

function renderResult() {
  show('result');
  const ratio = found / deck.length;
  const [, title, line] = [...RANKS].reverse().find(([t]) => ratio >= t);

  $('#rank').textContent = `${found} of ${deck.length} found`;
  $('#resultTitle').textContent = title;
  $('#resultLine').textContent = line;
  $('#tFound').textContent = `${found}/${deck.length}`;
  $('#tStreak').textContent = bestStreak;
  $('#tTime').textContent = `${(times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1)}s`;
  $('#tScore').textContent = score.toLocaleString();
}

/* ── flow ───────────────────────────────────────────────────────────── */
function start() {
  deck = shuffle([...BUGS]);
  idx = 0; score = 0; found = 0; streak = 0; bestStreak = 0; times = [];
  show('round');
  renderRound();
}

$('#startBtn').addEventListener('click', start);
$('#againBtn').addEventListener('click', start);
$('#nextBtn').addEventListener('click', () => {
  if (idx === deck.length - 1) return renderResult();
  idx++; renderRound();
});

/* keyboard: number keys pick a line, Enter advances */
addEventListener('keydown', (e) => {
  if ($('#round').hidden) return;
  if (e.key === 'Enter' && locked) { $('#nextBtn').click(); return; }
  const n = parseInt(e.key, 10);
  if (!locked && n >= 1 && n <= 9) answer(n - 1);
});
