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
check('store listings', counters[3], '13');

// the "13 listings" claim and the actual links must not drift apart
const storeLinks = [...d.querySelectorAll('.store')]
  .filter((a) => /play\.google\.com|apps\.apple\.com/.test(a.getAttribute('href') || ''));
check('store links in markup', storeLinks.length, 13);
check('portrait badge suffix', /^\d+\+$/.test(d.querySelector('#yearsBadge').textContent), true);
check('platform rows', d.querySelectorAll('.platforms').length, 8);
check('source note present', !!d.querySelector('.src-note'), true);

console.log(bad ? `\n${bad} FAILED` : '\nall good');
process.exit(bad ? 1 : 0);   // the constellation's rAF loop would otherwise hang node
