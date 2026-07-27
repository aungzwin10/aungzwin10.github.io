/* =========================================================================
   Aung Zaw Win — portfolio runtime
   No dependencies. No trackers. Nothing leaves the page except the
   contact form, and only when you press send.
   ========================================================================= */

/* ── EDIT ME ────────────────────────────────────────────────────────────
   Three values, then the site is fully live.

   1. formAccessKey — free key from https://web3forms.com (enter your email,
      they mail you the key). Until it's set, the form falls back to opening
      the visitor's mail client instead. No account, no password, no backend.
   2. github / linkedin — leave "" to hide that row in the contact list.
   ------------------------------------------------------------------------ */
const CONFIG = {
  formAccessKey: 'a1912018-89ec-4863-912c-2dd4907c1db1',
  github:        'https://github.com/aungzwin10',
  linkedin:      'https://www.linkedin.com/in/aungzwin10/',
};

/* The email address is assembled at runtime so scrapers reading the HTML
   source find nothing to harvest. No phone number is published anywhere on
   this site — deliberately. */
const CONTACT = { user: 'aungzwin10', host: 'gmail.com' };
const email = () => `${CONTACT.user}@${CONTACT.host}`;

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Opt in to the scroll-reveal styles. Everything below the hero is hidden by
   `.js .rv` until revealed, so this line is what makes hiding safe: if the
   module never runs, the class is never set and the page renders in full. */
document.documentElement.classList.add('js');

/**
 * Run `fn` once, when `el` first becomes visible — or after `after` ms
 * regardless. Browsers throttle IntersectionObserver in background tabs, so
 * anything that starts at zero (a bar width, a chart that grows from the
 * centre) would otherwise sit empty forever. Every entrance animation on this
 * page goes through here so none of them can strand content.
 */
function onceVisible(el, fn, { threshold = 0.2, after = 2500 } = {}) {
  // `t` and `io` are declared up front: observe() can invoke the callback
  // before the following statements have run, and a const in its temporal
  // dead zone would throw and take the whole module down with it.
  let done = false, t, io;
  const run = () => { if (done) return; done = true; clearTimeout(t); io?.disconnect(); fn(); };
  io = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold });
  io.observe(el);
  if (!done) t = setTimeout(run, after);
}

/* ══ theme ═══════════════════════════════════════════════════════════ */
(() => {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch { /* private mode */ }
  const system = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.theme = saved || system;

  $('#themeBtn')?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('themechange'));
  });
})();

/* ══ nav: stuck state, scroll progress, current section, mobile ══════ */
(() => {
  const nav = $('#nav'), bar = $('#progress'), links = $('#navLinks');
  if (!nav || !bar) return;          // 404.html ships without a nav bar

  /* Reading scrollHeight forces a layout, and the previous line has just
     written to one — so measuring inside the scroll handler thrashed on every
     event. Measure when the page actually changes height instead: the
     observer covers the initial render, the timeline and skill bars being
     injected below, and any resize. */
  let max = 0;
  const measure = () => { max = document.documentElement.scrollHeight - innerHeight; };
  new ResizeObserver(measure).observe(document.documentElement);

  const onScroll = () => {
    nav.toggleAttribute('data-stuck', scrollY > 12);
    bar.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  measure();
  onScroll();

  $('#navToggle')?.addEventListener('click', (e) => {
    const open = links.toggleAttribute('data-open');
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  links?.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.removeAttribute('data-open');
      $('#navToggle')?.setAttribute('aria-expanded', 'false');
    }
  });

  const sections = $$('main section[id]');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$('#navLinks a').forEach((a) =>
        a.toggleAttribute('aria-current', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
})();

/* ══ reveal on scroll ════════════════════════════════════════════════ */
(() => {
  const items = $$('.rv');
  if (reduced) return items.forEach((el) => el.classList.add('in'));

  const io = new IntersectionObserver((entries, obs) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      e.target.style.setProperty('--d', `${i * 70}ms`);
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((el) => io.observe(el));

  // Safety net: browsers throttle IntersectionObserver in background tabs, and
  // a very tall element can sit below the threshold. Anything already on screen
  // and still hidden after a beat gets revealed regardless — a missed animation
  // is fine, an invisible page is not.
  const sweep = () => items.forEach((el) => {
    if (el.classList.contains('in')) return;
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('in');
  });
  setTimeout(sweep, 2500);
  addEventListener('scroll', () => { clearTimeout(sweep.t); sweep.t = setTimeout(sweep, 900); }, { passive: true });
})();

/* ══ count-up stats ══════════════════════════════════════════════════ */
(() => {
  $$('[data-count]').forEach((target) => onceVisible(target, () => {
    const to = +target.dataset.count, suffix = target.dataset.suffix || '';
    if (reduced) { target.textContent = to + suffix; return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      target.textContent = Math.round(to * (1 - (1 - p) ** 3)) + (p === 1 ? suffix : '');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.5 }));
})();

/* ══ cursor spotlight on cards ═══════════════════════════════════════ */
(() => {
  if (matchMedia('(hover: none)').matches) return;
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest?.('.card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
})();

/* ══ career timeline ═════════════════════════════════════════════════ */
const ROLES = [
  {
    when: 'Aug 2020 — Present', role: 'Application Development Manager',
    org: 'Anzer IT Healthcare Asia',
    points: [
      'I own 11 products in parallel end to end — 6 cross-platform apps and 5 web apps.',
      'I run the whole lifecycle myself rather than delegating it: requirements and client meetings, estimation and sequencing, architecture, hands-on development, code review, release management.',
      'I still write the Spring Boot REST APIs the entire suite depends on — the management title did not take me off the keyboard.',
      'What I look after: Hospital E-book, Nursing E-book, Patient Portal, Consent Forms, Central Registration, Patient Charges, Anzer Accounting & ERP, Management Dashboard, Accounting Dashboard and the Patient Portal admin panel.',
      'Software I built is in use in 40+ hospitals across Myanmar, Cambodia, India, Pakistan and the Philippines.',
      'I keep 18 live store listings in step across Apple and Google Play, including seven separately branded hospital deployments of the Patient Portal from a single codebase.',
      'I took the clinical apps to four platforms from one Flutter codebase — iOS, Android, Windows and macOS.',
      'Fully remote for the whole of it.',
    ],
  },
  {
    when: 'Jan 2020 — Aug 2020', role: 'Senior Programmer',
    org: 'Anzer IT Healthcare Asia',
    points: [
      'Designed, built and tested the accounting and ERP web application on my own — Perl on PostgreSQL.',
      'Wrote the Spring Boot API layer for Hospital E-book from scratch. It became the flagship of the suite, and I still own it.',
    ],
  },
  {
    when: 'Dec 2017 — Jan 2020', role: 'Programmer',
    org: 'Anzer IT Healthcare Myanmar · Myanmar ISTD',
    points: [
      'Analysis, design, testing, maintenance, implementation and on-site training for the Electronic Medical Record system used by Myanmar hospitals — this is where I learned to watch clinicians work instead of reading their specs.',
      'Built an Attendance Management System for the Japanese market on Spring Boot and PostgreSQL, matching labour law exactly.',
      'Delivered an Integrated Database project spanning South-East Asia.',
    ],
  },
];

(() => {
  const host = $('#timeline');
  if (!host) return;

  ROLES.forEach((r, i) => {
    const item = document.createElement('article');
    item.className = 'tl-item';
    if (i === 0) item.setAttribute('data-open', '');

    const node = document.createElement('div');
    node.className = 'tl-node';

    const body = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', String(i === 0));
    btn.className = 'tl-trigger';

    const when = document.createElement('div'); when.className = 'tl-when'; when.textContent = r.when;
    const role = document.createElement('h3');  role.className = 'tl-role'; role.textContent = r.role;
    const org  = document.createElement('div'); org.className  = 'tl-org';  org.textContent  = r.org;
    btn.append(when, role, org);

    const wrap = document.createElement('div'); wrap.className = 'tl-body';
    const inner = document.createElement('div');
    const ul = document.createElement('ul');
    r.points.forEach((p) => { const li = document.createElement('li'); li.textContent = p; ul.append(li); });
    inner.append(ul); wrap.append(inner);

    body.append(btn, wrap);
    item.append(node, body);
    host.append(item);

    btn.addEventListener('click', () => {
      const open = item.toggleAttribute('data-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
})();

/* ══ skills: bars + filters + constellation ══════════════════════════ */
const SKILLS = [
  // level is out of 5, matching the CV's dot scale
  { n: 'Java',              lv: 5, cat: 'Backend'   },
  { n: 'Spring Framework',  lv: 5, cat: 'Backend'   },
  { n: 'REST API design',   lv: 5, cat: 'Backend'   },
  { n: 'Perl',              lv: 3, cat: 'Backend'   },
  { n: 'C#',                lv: 2, cat: 'Backend'   },
  { n: '.NET Core',         lv: 2, cat: 'Backend'   },

  { n: 'JavaScript',        lv: 4, cat: 'Frontend'  },
  { n: 'HTML5 & CSS3',      lv: 4, cat: 'Frontend'  },
  { n: 'Flutter',           lv: 3, cat: 'Frontend'  },
  { n: 'React',             lv: 2, cat: 'Frontend'  },

  { n: 'PostgreSQL',        lv: 4, cat: 'Data'      },
  { n: 'MS SQL Server',     lv: 4, cat: 'Data'      },
  { n: 'MySQL / MariaDB',   lv: 4, cat: 'Data'      },

  { n: 'Git',               lv: 5, cat: 'Platform'  },
  { n: 'Docker',            lv: 4, cat: 'Platform'  },
  { n: 'Linux',             lv: 3, cat: 'Platform'  },

  { n: 'Project management',  lv: 5, cat: 'Leadership'},
  { n: 'Requirements analysis', lv: 5, cat: 'Leadership'},
  { n: 'Client engagement',   lv: 4, cat: 'Leadership'},
  { n: 'Code review',         lv: 5, cat: 'Leadership'},
  { n: 'Release management',  lv: 4, cat: 'Leadership'},
  { n: 'Team leadership',     lv: 4, cat: 'Leadership'},
  { n: 'Healthcare domain',   lv: 5, cat: 'Leadership'},
];
const CATS = ['All', 'Backend', 'Frontend', 'Data', 'Platform', 'Leadership'];
const CAT_HUE = { Backend: 38, Frontend: 218, Data: 162, Platform: 280, Leadership: 12 };
const LABEL = { 1: 'Fundamental', 2: 'Novice', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' };

(() => {
  const bars = $('#skillBars'), filters = $('#skillFilters');
  if (!bars) return;

  SKILLS.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'bar-row'; row.dataset.cat = s.cat;
    const n = document.createElement('span'); n.className = 'n'; n.textContent = s.n;
    const v = document.createElement('span'); v.className = 'v'; v.textContent = LABEL[s.lv];
    const b = document.createElement('div');  b.className = 'bar';
    const i = document.createElement('i');    i.dataset.w = `${s.lv * 20}%`;
    b.append(i); row.append(n, v, b); bars.append(row);
  });

  // fill the bars once they scroll into view (or shortly after, regardless)
  onceVisible(bars, () => {
    $$('.bar i', bars).forEach((i, k) => setTimeout(() => { i.style.width = i.dataset.w; }, k * 45));
  }, { threshold: 0.15 });

  CATS.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'filter'; b.textContent = c;
    b.setAttribute('aria-pressed', String(i === 0));
    b.addEventListener('click', () => {
      $$('.filter', filters).forEach((f) => f.setAttribute('aria-pressed', String(f === b)));
      $$('.bar-row', bars).forEach((r) => { r.hidden = c !== 'All' && r.dataset.cat !== c; });
      window.dispatchEvent(new CustomEvent('skillfilter', { detail: c }));
    });
    filters.append(b);
  });
})();

/* ── capability radar ──
   Replaces an earlier free-floating constellation that looked good and
   communicated nothing. Five labelled axes, rings at 1–5, one filled polygon:
   readable in about a second, which is all the attention this gets. */
(() => {
  const cv = $('#radar');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const AXES = ['Backend', 'Frontend', 'Data', 'Platform', 'Leadership'];
  const avg = (c) => {
    const s = SKILLS.filter((x) => x.cat === c);
    return s.reduce((a, b) => a + b.lv, 0) / s.length;
  };
  const VALUES = AXES.map(avg);
  const TOP = AXES.map((c) =>
    SKILLS.filter((x) => x.cat === c).sort((a, b) => b.lv - a.lv).slice(0, 3).map((x) => x.n));

  let W = 0, H = 0, hover = -1, grow = 0, active = 'All';
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const resize = () => {
    const box = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(cv);
  resize();

  addEventListener('skillfilter', (e) => { active = e.detail; draw(); });

  const geom = () => {
    const cx = W / 2, cy = H / 2 + 6;
    const R = Math.min(W, H) * 0.34;
    const pt = (i, r) => {
      const a = -Math.PI / 2 + (i / AXES.length) * Math.PI * 2;
      return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r];
    };
    return { cx, cy, R, pt };
  };

  function draw() {
    const { cx, cy, R, pt } = geom();
    ctx.clearRect(0, 0, W, H);
    const line = css('--line'), soft = css('--line-soft');
    const gold = css('--gold'), gold2 = css('--gold-2'), fg = css('--fg'), fg3 = css('--fg-3');

    // rings
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= AXES.length; i++) {
        const [x, y] = pt(i % AXES.length, ring / 5);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = ring === 5 ? line : soft;
      ctx.lineWidth = 1; ctx.stroke();
    }
    // ring numbers
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.fillStyle = fg3; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let ring = 1; ring <= 5; ring++) ctx.fillText(ring, cx, cy - (R * ring) / 5);

    // spokes
    AXES.forEach((_, i) => {
      const [x, y] = pt(i, 1);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
      ctx.strokeStyle = soft; ctx.stroke();
    });

    // the shape
    const dim = (i) => (active !== 'All' && AXES[i] !== active ? 0.22 : 1);
    ctx.beginPath();
    VALUES.forEach((v, i) => {
      const [x, y] = pt(i, (v / 5) * grow);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    g.addColorStop(0, `${gold}44`); g.addColorStop(1, `${gold2}22`);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = gold; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

    // vertices + labels
    AXES.forEach((name, i) => {
      const v = VALUES[i];
      const [px, py] = pt(i, (v / 5) * grow);
      const on = hover === i;
      ctx.globalAlpha = dim(i);

      ctx.beginPath(); ctx.arc(px, py, on ? 6 : 4, 0, 7);
      ctx.fillStyle = on ? css('--gold-2') : gold; ctx.fill();
      ctx.strokeStyle = css('--bg'); ctx.lineWidth = 2; ctx.stroke();

      const [lx, ly] = pt(i, 1.30);
      ctx.textAlign = Math.abs(lx - cx) < 6 ? 'center' : (lx > cx ? 'left' : 'right');
      ctx.textBaseline = ly < cy - 4 ? 'bottom' : (ly > cy + 4 ? 'top' : 'middle');
      ctx.font = `${on ? 650 : 560} 13px -apple-system, "Segoe UI", system-ui, sans-serif`;
      ctx.fillStyle = on ? fg : css('--fg-2');
      ctx.fillText(name, lx, ly);
      ctx.font = '600 11px ui-monospace, Menlo, monospace';
      ctx.fillStyle = gold;
      ctx.fillText(v.toFixed(1), lx, ly + (ly < cy - 4 ? -15 : 15));
      ctx.globalAlpha = 1;
    });

    // tooltip for the hovered axis
    if (hover >= 0) {
      const text = TOP[hover].join(' · ');
      ctx.font = '11px ui-monospace, Menlo, monospace';
      const w = ctx.measureText(text).width + 22;
      const x = Math.max(8, Math.min(W - w - 8, cx - w / 2)), y = H - 30;
      ctx.fillStyle = css('--bg-2'); ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x, y, w, 24, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = css('--fg-2'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(text, x + 11, y + 12);
    }
  }

  cv.addEventListener('pointermove', (e) => {
    const b = cv.getBoundingClientRect();
    const mx = e.clientX - b.left, my = e.clientY - b.top;
    const { pt } = geom();
    let found = -1;
    AXES.forEach((_, i) => {
      const [x, y] = pt(i, (VALUES[i] / 5));
      const [lx, ly] = pt(i, 1.3);
      if (Math.hypot(x - mx, y - my) < 26 || Math.hypot(lx - mx, ly - my) < 42) found = i;
    });
    if (found !== hover) { hover = found; cv.style.cursor = found >= 0 ? 'pointer' : 'default'; draw(); }
  });
  cv.addEventListener('pointerleave', () => { hover = -1; draw(); });
  addEventListener('themechange', draw);
  // one repaint per frame — a drag-resize fires dozens of times a second, and
  // each pass re-reads every colour token off the root element
  let redraw = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(redraw);
    redraw = requestAnimationFrame(() => { resize(); draw(); });
  });

  // grow the polygon out from the centre the first time it scrolls into view
  onceVisible(cv, () => {
    if (reduced) { grow = 1; return draw(); }
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 900, 1);
      grow = 1 - (1 - p) ** 3;
      draw();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  draw();
})();

/* ══ playground tabs ═════════════════════════════════════════════════ */
(() => {
  const frame = $('#pgFrame'), url = $('#stageUrl'), open = $('#stageOpen');
  $$('.pg-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.pg-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      frame.src = tab.dataset.src;
      open.href = tab.dataset.src;
      url.textContent = tab.dataset.url;
    });
  });
})();

/* ══ contact: reveal-on-click details ════════════════════════════════ */
(() => {
  const wire = (line, text, value, href) => {
    if (!line) return;
    line.addEventListener('click', (e) => {
      if (line.dataset.revealed) return;          // second click follows the link
      e.preventDefault();
      line.dataset.revealed = '1';
      text.textContent = value;
      text.nextElementSibling.textContent = 'Click again to open';
      line.href = href;
      if (navigator.clipboard) navigator.clipboard.writeText(value).catch(() => {});
    });
  };
  wire($('#mailLine'), $('#mailText'), email(), `mailto:${email()}`);

  const show = (id, href) => {
    if (!href) return;
    const el = $(id); if (!el) return;
    el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer external'; el.hidden = false;
  };
  show('#ghLine', CONFIG.github);
  show('#liLine', CONFIG.linkedin);
})();

/* ══ contact form ════════════════════════════════════════════════════ */
(() => {
  const form = $('#contactForm');
  if (!form) return;
  const status = $('#formStatus'), btn = $('#submitBtn');
  const loadedAt = Date.now();

  const setErr = (id, msg) => { $(`[data-err="${id}"]`).textContent = msg || ''; return !msg; };
  const say = (state, msg) => { status.dataset.state = state; status.textContent = msg; };

  /* Be honest about what any of this can achieve. Every check below runs in the
     visitor's browser, so a bot that never loads the page and POSTs straight at
     the endpoint sees none of it. What these stop is the large middle of the
     spam distribution — headless crawlers that do drive a real browser — plus
     double-taps and honest mistakes. The check that genuinely holds is the
     server's, which is why `botcheck` is now forwarded instead of deleted:
     Web3Forms rejects a filled honeypot on their side, and that one a bot
     cannot opt out of. */

  const LIMITS = { name: 80, email: 120, message: 4000 };
  const KINDS = [...form.querySelectorAll('#f-kind option')].map((o) => o.textContent.trim());

  /* Control characters have no business in a name or a mail subject — they are
     how header injection is attempted. Newlines are legitimate in the message
     body only, so that field keeps them and nothing else. */
  const oneLine = (s, max) => s.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim().slice(0, max);
  const bodyText = (s, max) => s.replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ').trim().slice(0, max);

  /* Per-browser throttle. Trivially cleared, and meant to be: it exists to stop
     a stuck send button turning into forty emails, not to stop an attacker. */
  const HOUR = 3_600_000, GAP_MS = 30_000, HOURLY_CAP = 5;
  const readLog = () => {
    try { return JSON.parse(localStorage.getItem('az-sent') || '[]').filter((t) => Date.now() - t < HOUR); }
    catch { return []; }
  };
  const tooSoon = () => {
    const log = readLog();
    if (log.length >= HOURLY_CAP) return `That's ${HOURLY_CAP} messages in an hour — please email me directly instead.`;
    if (log.length && Date.now() - Math.max(...log) < GAP_MS) return 'That was quick. Give it a few seconds and try again.';
    return '';
  };
  const noteSent = () => {
    try { localStorage.setItem('az-sent', JSON.stringify([...readLog(), Date.now()])); } catch { /* private mode */ }
  };

  const validate = () => {
    const name = $('#f-name').value.trim();
    const mail = $('#f-email').value.trim();
    const msg  = $('#f-msg').value.trim();
    let ok = true;
    ok = setErr('f-name', name.length < 2 ? 'Please tell me your name.'
      : name.length > LIMITS.name ? 'That name is too long.' : '') && ok;
    ok = setErr('f-email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? 'That email doesn\'t look right.'
      : mail.length > LIMITS.email ? 'That email is too long.' : '') && ok;
    ok = setErr('f-msg', msg.length < 12 ? 'A little more detail, please — at least a sentence.'
      : msg.length > LIMITS.message ? 'That message is longer than I can accept.' : '') && ok;
    return ok;
  };
  ['#f-name', '#f-email', '#f-msg'].forEach((s) =>
    $(s).addEventListener('blur', validate));

  let sending = false;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;                                // re-entry guard
    if (!validate()) return say('err', 'Please fix the highlighted fields.');

    /* Bot traps. Answer as though it worked — telling a bot which check caught
       it is free tuning advice for whoever wrote it. */
    const trap = $('#f-company').value;
    if (trap || Date.now() - loadedAt < 3000) {
      return say('ok', 'Thanks — message received.');   // silent drop
    }

    const wait = tooSoon();
    if (wait) return say('err', wait);

    /* Read the fields individually rather than spreading FormData: it means a
       field added to the DOM by a tampering script is never forwarded, and the
       enquiry type can only ever be one of the options actually offered. */
    const kindRaw = $('#f-kind').value.trim();
    const kind = KINDS.includes(kindRaw) ? kindRaw : KINDS[0];
    const name = oneLine($('#f-name').value, LIMITS.name);
    const mail = oneLine($('#f-email').value, LIMITS.email);
    const message = bodyText($('#f-msg').value, LIMITS.message);

    if (!CONFIG.formAccessKey) {                        // no key yet → mail client
      const body = `${message}\n\n— ${name} <${mail}>`;
      location.href = `mailto:${email()}?subject=${encodeURIComponent(`[Portfolio] ${kind}`)}`
        + `&body=${encodeURIComponent(body)}`;
      noteSent();
      return say('ok', 'Opening your mail app — press send there and it reaches me.');
    }

    sending = true;
    btn.disabled = true;
    say('busy', 'Sending…');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: CONFIG.formAccessKey,
          subject: `[Portfolio] ${kind} — ${name}`,
          from_name: 'aungzwin10.github.io',
          name, email: mail, message, enquiry_type: kind,
          botcheck: trap,      // forwarded on purpose — this is the server-side check
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        form.reset();
        noteSent();
        say('ok', 'Sent. I\'ll reply within two working days — thank you.');
      } else {
        throw new Error(json.message || 'send failed');
      }
    } catch {
      say('err', `Something went wrong. Please email me directly at ${email()}.`);
    } finally {
      sending = false;
      btn.disabled = false;
    }
  });
})();

/* ══ small stuff ═════════════════════════════════════════════════════ */
/* Nothing on this page states a year or a duration as a literal. Both are
   derived at render time, so the site stays accurate with no edits — leave it
   untouched for two years and it will say "10 years", not "8+". */
const CAREER_START = '2017-12-01';   // first day at Anzer

(() => {
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // whole years elapsed, calendar-correct (no 365.25-day drift)
  const s = new Date(CAREER_START), now = new Date();
  let yrs = now.getFullYear() - s.getFullYear();
  const before = now.getMonth() < s.getMonth()
    || (now.getMonth() === s.getMonth() && now.getDate() < s.getDate());
  if (before) yrs -= 1;

  const badge = $('#yearsBadge'); if (badge) badge.textContent = `${yrs}+`;
  $$('[data-yrs]').forEach((el) => { el.textContent = String(yrs); });
  // Only elements explicitly marked data-auto-years become counters — matching
  // on [data-suffix="+"] would also hit the "40+ hospitals" stat.
  $$('[data-auto-years]').forEach((el) => { el.dataset.count = yrs; });
})();
