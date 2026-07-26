/* Guards the headline numbers. These are the claims a recruiter reads first,
   so a silent regression here is the most expensive kind.

   Exists because of a real bug: the "keep 8+ years current" helper matched
   [data-count][data-suffix="+"], which also matched the "40+ hospitals"
   counter and quietly rewrote it to "8+".

   Dev-only.  node test/counters.mjs                                          */

import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const dom = new JSDOM(readFileSync(join(ROOT, 'index.html'), 'utf8'),
  { url: 'https://aungzwin10.github.io/' });
const w = dom.window;

class Obs {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
  unobserve() {} disconnect() {}
}
w.IntersectionObserver = Obs;
w.ResizeObserver = Obs;
// report reduced-motion so the count-up writes its final value synchronously
w.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addEventListener() {}, removeEventListener() {} });
w.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
w.cancelAnimationFrame = clearTimeout;
w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
w.Element.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, width: 600, height: 400, right: 600, bottom: 400 });
Object.defineProperty(w, 'performance', { value: globalThis.performance, configurable: true });

for (const g of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'CustomEvent',
  'Event', 'MouseEvent', 'KeyboardEvent', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame',
  'addEventListener', 'removeEventListener', 'dispatchEvent', 'IntersectionObserver', 'ResizeObserver',
  'getComputedStyle', 'localStorage', 'HTMLCanvasElement', 'FormData', 'scrollY', 'innerHeight',
  'scrollTo', 'devicePixelRatio']) {
  try { globalThis[g] = w[g]?.bind?.(w) ?? w[g]; } catch { /* getter-only, fine */ }
}

await import(pathToFileURL(join(ROOT, 'assets/js/site.js')).href + `?t=${Date.now()}`);
await new Promise((r) => setTimeout(r, 250));

const d = w.document;
let bad = 0;
const check = (label, got, want) => {
  const ok = String(got) === String(want);
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}: ${got}${ok ? '' : `  (expected ${want})`}`);
  if (!ok) bad++;
};

console.log('headline numbers');
const counters = [...d.querySelectorAll('.stat b')].map((b) => b.textContent.trim());
check('hospitals',      counters[0], '40+');
check('countries',      counters[1], '5');
check('products',       counters[2], '11');
check('store listings', counters[3], '18');

// the "18 listings" claim and the actual links must not drift apart
const storeLinks = [...d.querySelectorAll('.store')]
  .filter((a) => /play\.google\.com|apps\.apple\.com/.test(a.getAttribute('href') || ''));
check('store links in markup', storeLinks.length, 18);
check('portrait badge suffix', /^\d+\+$/.test(d.querySelector('#yearsBadge').textContent), true);
check('platform rows', d.querySelectorAll('.platforms').length, 8);
check('source note present', !!d.querySelector('.src-note'), true);

// every Patient Portal deployment needs both stores and a country
const deploys = [...d.querySelectorAll('.deploy')];
check('hospital deployments', deploys.length, 7);
check('each has 2 store links', deploys.every((x) => x.querySelectorAll('.store').length === 2), true);
check('each has a country', deploys.every((x) => /Myanmar|Cambodia/.test(x.querySelector('em')?.textContent || '')), true);

// the off-the-clock section
check('fun cards', d.querySelectorAll('.fun').length, 4);
check('lifecycle steps', d.querySelectorAll('.arc li').length, 6);

/* Store badges are one reusable component: identical label per kind, and always
   ordered Play Store → App Store → anything else. */
const LABEL = { play: 'Play Store', apple: 'App Store', demo: 'Live demo' };
const RANK  = { play: 0, apple: 1, demo: 2 };
const badges = [...d.querySelectorAll('.store')];
check('every badge is tagged', badges.every((a) => a.dataset.store in LABEL), true);
check('labels match their kind',
  badges.every((a) => a.textContent.replace(/\s+/g, ' ').trim() === LABEL[a.dataset.store]), true);
const groups = [...new Set(badges.map((a) => a.closest('.stores, .deploy')))].filter(Boolean);
check('badge groups', groups.length, 11);   // 7 deployment tiles + 4 store rows
check('order is Play → App Store → rest', groups.every((g) => {
  const r = [...g.querySelectorAll('.store')].map((a) => RANK[a.dataset.store]);
  return r.every((v, i) => i === 0 || r[i - 1] <= v);
}), true);

/* The three off-duty scenes must stay the same size: one shared frame class and
   one shared viewBox, so the cards can't drift apart again. */
const art = [...d.querySelectorAll('.fun-art')];
check('off-duty scenes framed alike', art.length, 3);
check('one shared viewBox',
  new Set(art.map((a) => a.querySelector('svg')?.getAttribute('viewBox'))).size, 1);
check('no leftover moon cut-out', d.querySelector('.moon-cut'), null);
check('daylight has unlit logs', !!d.querySelector('.camp .coldlogs'), true);
check('beer tap removed', d.querySelector('.beer .tap'), null);

// no literal experience figure anywhere — it must be derived
check('years are derived, not hard-coded', d.querySelectorAll('[data-yrs]').length >= 4, true);
check('years filled in', [...d.querySelectorAll('[data-yrs]')].every((e) => /^\d+$/.test(e.textContent)), true);
check('copyright year is current', d.querySelector('#year').textContent, String(new Date().getFullYear()));

console.log(bad ? `\n${bad} FAILED` : '\nall good');
process.exit(bad ? 1 : 0);   // the constellation's rAF loop would otherwise hang node
