# aungzwin10.github.io

Portfolio of **Aung Zaw Win** — healthcare software engineer, Mandalay.

No framework, no build step, no dependencies. Plain HTML, CSS and ES modules.
It deploys by copying files, and it will still work in ten years.

---

## Go live in three steps

**1 — Create the repo.** On GitHub, make a new **public** repo named exactly:

```
aungzwin10.github.io
```

The name must match your username, or the site lands on a `/repo-name/`
sub-path instead of the root. (Replace `aungzwin10` with your real username
throughout if it differs.)

**2 — Push these files.** From inside this folder:

```bash
git init -b main
git add -A
git commit -m "Portfolio"
git remote add origin https://github.com/aungzwin10/aungzwin10.github.io.git
git push -u origin main
```

**3 — Turn on Pages.** Repo → **Settings** → **Pages** → *Build and deployment*
→ Source: **GitHub Actions**. That is it.

The included workflow runs the tests and publishes on every push to `main`.
First deploy takes about a minute; after that it is ~20 seconds.

Your site: **https://aungzwin10.github.io**

Cost: nothing, forever. Free hosting, free subdomain, free TLS certificate,
free global CDN, unlimited bandwidth for a static site.

### Optional: your own domain

If you ever want `aungzwin10.dev` (~$12/year — this is the only part that is
not free), add a file named `CNAME` containing just the domain, point your
registrar's DNS at GitHub, and tick *Enforce HTTPS*. Nothing else changes.

---

## Three things to fill in

All three live at the top of `assets/js/site.js`:

```js
const CONFIG = {
  formAccessKey: '',   // ← contact form
  github:        '',   // ← e.g. https://github.com/aungzwin10
  linkedin:      '',   // ← e.g. https://www.linkedin.com/in/aungzwin10/
};
```

**The contact form.** Go to [web3forms.com](https://web3forms.com), type in
your email, and they send you an access key. No account, no password, no card.
Paste it into `formAccessKey` and the form posts straight to your inbox.

Leave it empty and the form still works — it falls back to opening the
visitor's own mail client with the message pre-filled. Nothing breaks either
way, so this is not urgent.

**The two profile links.** Leave either blank and that row simply does not
appear in the contact list.

---

## Working on it

```bash
npm run serve      # → http://localhost:8080
npm test           # NEWS2 unit test + boots every page in jsdom
```

`npm test` needs `npm install` first (it pulls jsdom). The site itself needs
nothing — you can also just open `index.html` in a browser.

## What's inside

```
index.html            one-page portfolio
security.html         public security posture — how and why it's built this way
404.html
demos/
  ehr.html            Hospital E-book patient chart, live
  dashboard.html      Management Dashboard, live
  challenge.html      The Bug Hunt — eight real production bugs
assets/
  css/                site.css + one file per demo
  js/                 site.js, ehr.js, dashboard.js, challenge.js
                      news2.js  — real NEWS2 clinical scoring
                      bugs.js   — the challenge content, easy to add to
  img/                portraits, icons, social card
  Aung-Zaw-Win-CV.pdf
test/
  news2.test.mjs      13 assertions on the NEWS2 scoring table
  smoke.mjs           boots every page, fails on any runtime error
.github/workflows/    test, then deploy
```

## Editing content

Everything is in plain files, no CMS:

| What | Where |
|---|---|
| Headline, bio, projects, education | `index.html` |
| Job history | `ROLES` in `assets/js/site.js` |
| Skills and levels | `SKILLS` in `assets/js/site.js` |
| Bug Hunt questions | `assets/js/bugs.js` — add an object, it appears |
| Colours, spacing, type | the `:root` block at the top of `assets/css/site.css` |

To add a project, copy any `<article class="card card-lift rv">` block in the
work section and change the text.

## Security

Documented in full at `/security.html`. Summary: zero third-party code, a
strict CSP, no cookies, no analytics, no `innerHTML` anywhere, contact details
assembled at runtime so scrapers find nothing, and all demo data synthesised
in-browser with `connect-src 'none'`.

Everything on this site is verifiable from view-source. That is deliberate.
