/* Boots each page's real HTML in jsdom, runs its real module, and fails on any
   error. Catches the class of bug a linter cannot: a selector that matches
   nothing, a null dereference on load, a handler wired to a missing element.

   Dev-only — the site itself has no dependencies.
     npm i jsdom && node test/smoke.mjs                                        */

import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PAGES = [
  ['index.html',           ['site.js']],
  ['security.html',        ['site.js']],
  ['404.html',             ['site.js']],
  ['demos/ehr.html',       ['ehr.js']],
  ['demos/dashboard.html', ['dashboard.js']],
  ['demos/challenge.html', ['challenge.js']],
];

/* ── stubs for the browser APIs jsdom lacks ─────────────────────────── */
function stub(win) {
  class Obs {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, target: el, contentRect: { width: 600, height: 400 } }], this); }
    unobserve() {} disconnect() {}
  }
  win.IntersectionObserver = Obs;
  win.ResizeObserver = Obs;
  win.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  win.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
  win.cancelAnimationFrame = clearTimeout;
  win.scrollTo = () => {};
  win.confirm = () => true;
  Object.defineProperty(win, 'devicePixelRatio', { value: 1, configurable: true });

  // 2-D context: record calls, assert nothing throws
  const noop = new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
  win.HTMLCanvasElement.prototype.getContext = () => new Proxy({
    canvas: { width: 600, height: 400 },
    setTransform() {}, clearRect() {}, beginPath() {}, closePath() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (t, k) => (k in t ? t[k] : (typeof noop[k] === 'function' ? noop[k] : () => {})) });
  Object.defineProperty(win.HTMLElement.prototype, 'clientWidth', { get: () => 600, configurable: true });
  win.Element.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 600, bottom: 400, width: 600, height: 400 });
  win.Element.prototype.setPointerCapture = () => {};
  win.HTMLElement.prototype.focus = () => {};
}

/* NB: never copy setTimeout/setInterval across — jsdom's implementations call
   the global ones internally, so re-exporting them recurses until the stack
   dies. Node's own timers work fine for everything here. */
const GLOBALS = ['window', 'document', 'navigator', 'location', 'HTMLElement', 'Element', 'Node',
  'CustomEvent', 'Event', 'MouseEvent', 'KeyboardEvent', 'IntersectionObserver', 'ResizeObserver',
  'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'localStorage',
  'devicePixelRatio', 'FormData', 'confirm', 'HTMLCanvasElement', 'addEventListener',
  'removeEventListener', 'dispatchEvent', 'scrollY', 'innerHeight'];

let failures = 0, ran = 0;

for (const [page, modules] of PAGES) {
  const vc = new VirtualConsole();
  const noise = [];
  vc.on('jsdomError', (e) => noise.push(e.message));

  const dom = new JSDOM(readFileSync(join(ROOT, page), 'utf8'), {
    url: 'https://aungzawwin.github.io/' + page,
    pretendToBeVisual: true, virtualConsole: vc,
  });
  stub(dom.window);

  for (const g of GLOBALS) {
    try { globalThis[g] = dom.window[g]?.bind?.(dom.window) ?? dom.window[g]; } catch { /* readonly */ }
  }
  // performance is the same trap as setTimeout: jsdom's now() delegates to the
  // global one, so re-exporting it recurses. Leave Node's in place, and give
  // the page Node's too.
  Object.defineProperty(dom.window, 'performance',
    { value: globalThis.performance, configurable: true });

  const errors = [];
  dom.window.addEventListener('error', (e) => errors.push(String(e.error || e.message)));
  process.on('unhandledRejection', (r) => errors.push(`unhandled rejection: ${r}`));

  for (const m of modules) {
    ran++;
    const url = pathToFileURL(join(ROOT, 'assets/js', m)).href + `?p=${encodeURIComponent(page)}`;
    try {
      await import(url);
    } catch (e) {
      errors.push(`${m}: ${e.message}`);
    }
  }

  await new Promise((r) => setTimeout(r, 60));   // let rAF / observers flush

  // the modules should have populated their containers
  const filled = {
    'index.html': ['#timeline', '#skillBars', '#skillFilters', '#marquee'],
    'demos/ehr.html': ['#ptList', '#vitals', '#meds', '#notes'],
    'demos/dashboard.html': ['#kpis', '#wards', '#donutKey', '#deptTable tbody'],
  }[page] ?? [];
  for (const sel of filled) {
    const el = dom.window.document.querySelector(sel);
    if (!el) errors.push(`missing container ${sel}`);
    else if (!el.children.length) errors.push(`${sel} rendered empty`);
  }

  const bad = [...errors, ...noise];
  if (bad.length) { failures++; console.log(`✗ ${page}`); bad.forEach((b) => console.log(`    ${b}`)); }
  else console.log(`✓ ${page}  (${modules.join(', ')})`);

  dom.window.close();
}

console.log(`\n${PAGES.length} pages, ${ran} modules — ${failures ? `${failures} FAILED` : 'all clean'}`);
process.exit(failures ? 1 : 0);
