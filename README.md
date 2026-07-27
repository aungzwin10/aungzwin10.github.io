# aungzwin10.github.io

The personal site of **Aung Zaw Win** — Application Development Manager, Mandalay, Myanmar.

Plain HTML, CSS and ES modules. No framework, no build step, no runtime dependencies,
no third-party code of any kind. What is in this repository is exactly what a browser
receives, which means everything the site claims about itself can be checked from
view-source.

---

## What it is

A one-page portfolio, plus three working demos and a public security page.

The demos are not screenshots. They are functioning reconstructions of products from the
day job, rewritten from scratch for this repository so they can be shown without exposing
anything proprietary, because patient-facing healthcare code does not belong on a public remote.

| Page | What it is |
|---|---|
| `index.html` | The portfolio. Work, playground, career timeline, skills, about, contact. |
| `demos/ehr.html` | Patient chart — a synthetic seven-patient ward with live vitals, medication administration, labs and notes. |
| `demos/dashboard.html` | Management dashboard — occupancy, admissions, revenue by department, drawn on canvas. |
| `demos/challenge.html` | *The Bug Hunt* — eight production bugs, twenty seconds each, find the broken line. |
| `security.html` | Public security posture, written to be verifiable rather than reassuring. |
| `404.html` | Served by GitHub Pages for any unmatched path. Ships without a nav, so the shared runtime null-guards for it. |

## How it is built

```
index.html               the portfolio
security.html  404.html
demos/                   ehr · dashboard · challenge
assets/
  css/                   site.css, then one file per demo
  js/
    site.js              the whole main-page runtime
    news2.js             real NEWS2 clinical scoring — the only pure logic here
    ehr.js  dashboard.js  challenge.js  bugs.js
    demo-theme.js        shared by the demos, keeps them on the site's theme
  img/                   portraits, icons, social card
  Aung-Zaw-Win-CV.pdf
test/                    news2 · form · smoke · counters
.github/workflows/       test, then publish
```

**Content lives in JavaScript, not markup.** The career timeline is a `ROLES` array in
`site.js`; the skill bars and the radar chart are both generated from one `SKILLS` array,
so they cannot disagree with each other. The Bug Hunt reads from `bugs.js` — adding an
object adds a round.

**`site.js` is a series of independent IIFEs**, each null-guarded, so the same file can be
loaded by pages that have almost none of the elements it looks for.

**Demo data is synthesised in the browser** from a seeded mulberry32 RNG. The ward looks
identical on every visit and has never been near a real record.

**Colour, spacing and type come from custom properties** in a single `:root` block, with a
light theme as an override. Canvases read the same tokens at paint time and repaint on
theme change, so the charts follow the rest of the page.

## Constraints this repository holds itself to

These are not aspirations; most of them are enforced by the test suite or by the Content
Security Policy, and several exist because breaking them once already caused a bug.

- **No build step.** Deployment is a file copy. Nothing here needs compiling, so nothing
  here can fail to compile.
- **No dependencies at runtime.** `jsdom` is a dev dependency for the smoke test and never
  reaches a browser.
- **No `innerHTML`, anywhere.** DOM is built with `createElement` and `textContent`. The
  Bug Hunt tokenises and colours source code without ever parsing a string as markup.
- **A strict CSP on every page**, set per-page via `<meta http-equiv>`: `script-src 'self'`,
  no inline scripts or styles, `object-src 'none'`, `base-uri 'none'`. The demos additionally
  run under `connect-src 'none'` — they are incapable of making a network request.
- **No cookies, no analytics, no trackers, no fonts fetched.** `localStorage` holds a theme
  preference and a submission timestamp, and nothing else.
- **No email address in the HTML source.** It is assembled at runtime, so scrapers reading
  the markup find nothing. No phone number is published anywhere.
- **No duration stated as a literal.** Years of experience derive from a single
  `CAREER_START` constant, and the `<head>` says "since 2017" rather than a count — so
  nothing goes stale on its own.

## Tests

Four suites, run on every push. Two of them need no dependencies at all and so run in CI
directly.

| Suite | Guards |
|---|---|
| `news2.test.mjs` | The NEWS2 scoring table — 13 assertions on boundary values, both sides of every band, plus the single-parameter-3 escalation rule. Clinical scoring is the one place here where a wrong number would matter. |
| `form.mjs` | Contact-form sanitising and its spam checks — 10 assertions. Lifts the cleaners out of the shipped source rather than copying them, and fails if the honeypot forwarding is ever removed. |
| `smoke.mjs` | Boots all six pages in jsdom with their real modules and fails on any runtime error — the class of bug a linter cannot see: a selector matching nothing, a null dereference on load, a handler wired to a missing element. |
| `counters.mjs` | The headline numbers and the claims attached to them — 27 checks. Store listings must match the count in the copy, badge labels must match their kind, and things deleted on purpose must stay deleted. |

`counters.mjs` exists because of a real regression: a helper meant to keep the years
current matched `[data-count][data-suffix="+"]`, which also matched the "40+ hospitals"
stat and quietly rewrote it.

## Weight

The home page is 159 KB of source that compresses to roughly **41 KB** over the wire —
markup, all styles, and the entire runtime. There is no framework payload underneath that
number because there is no framework.

## Licence

Source is published for inspection, not for reuse. The photographs, CV and written content
are not licensed for redistribution.
