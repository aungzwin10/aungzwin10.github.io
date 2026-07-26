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
  formAccessKey: '',
  // Deliberately blank: all my work lives in my employer's self-hosted GitLab,
  // so a link here would send people to an empty profile. The work section says
  // so plainly instead. Fill this in if the profile ever has something on it.
  github:        '',
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

  const onScroll = () => {
    nav.toggleAttribute('data-stuck', scrollY > 12);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  };
  addEventListener('scroll', onScroll, { passive: true });
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
})();

/* ══ count-up stats ══════════════════════════════════════════════════ */
(() => {
  const io = new IntersectionObserver((entries, obs) => {
    entries.filter((e) => e.isIntersecting).forEach(({ target }) => {
      obs.unobserve(target);
      const to = +target.dataset.count, suffix = target.dataset.suffix || '';
      if (reduced) { target.textContent = to + suffix; return; }
      const t0 = performance.now(), dur = 1100;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        target.textContent = Math.round(to * (1 - (1 - p) ** 3)) + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => io.observe(el));
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

/* ══ tech marquee ════════════════════════════════════════════════════ */
(() => {
  const strip = $('#marquee');
  if (!strip) return;
  const tech = ['Java', 'Spring Boot', 'Flutter', 'PostgreSQL', 'MS SQL Server',
    'Docker', 'REST APIs', 'MySQL / MariaDB', 'JavaScript', 'Linux', 'Git',
    'Perl', 'HTML5 & CSS3', 'Electronic Health Records', 'Hospital Information Systems'];
  const row = () => {
    const f = document.createDocumentFragment();
    tech.forEach((t) => { const s = document.createElement('span'); s.textContent = t; f.append(s); });
    return f;
  };
  strip.append(row(), row());   // duplicated so the -50% loop is seamless
})();

/* ══ career timeline ═════════════════════════════════════════════════ */
const ROLES = [
  {
    when: 'Aug 2020 — Present', role: 'Application Development Manager',
    org: 'Anzer IT Healthcare Asia',
    points: [
      'Own 11 products in parallel — 6 mobile apps and 5 web apps — from roadmap through release.',
      'Still hands-on: design and build the Spring Boot REST APIs the whole suite depends on.',
      'Portfolio spans Hospital E-book, Nursing E-book, Patient Portal, Consent Forms, Central Registration, Patient Charges, Anzer Accounting & ERP, Management Dashboard, Accounting Dashboard and the Patient Portal admin panel.',
      'Products live in 40+ hospitals across Myanmar, Cambodia, India, Pakistan and the Philippines.',
      'Thirteen live store listings across Apple and Google Play, including seven separately branded hospital deployments of the Patient Portal from a single codebase.',
      'The clinical apps ship to four platforms from one Flutter codebase — iOS, Android, Windows and macOS.',
      'Worked fully remote throughout.',
    ],
  },
  {
    when: 'Jan 2020 — Aug 2020', role: 'Senior Programmer',
    org: 'Anzer IT Healthcare Asia',
    points: [
      'Designed, built and tested the accounting and ERP web application — written in Perl on PostgreSQL.',
      'Built the API layer for the Hospital E-book application with Spring Boot.',
    ],
  },
  {
    when: 'Dec 2017 — Jan 2020', role: 'Programmer',
    org: 'Anzer IT Healthcare Myanmar · Myanmar ISTD',
    points: [
      'Analysis, design, testing, maintenance, implementation and on-site training for the Electronic Medical Record system used by Myanmar hospitals.',
      'Built an Attendance Management System for the Japanese market on Spring Boot and PostgreSQL.',
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

  { n: 'Project management',lv: 4, cat: 'Leadership'},
  { n: 'Team leadership',   lv: 4, cat: 'Leadership'},
  { n: 'Clinical domain',   lv: 5, cat: 'Leadership'},
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

  // fill the bars only once they scroll into view
  const io = new IntersectionObserver((e, obs) => {
    if (!e[0].isIntersecting) return;
    obs.disconnect();
    $$('.bar i', bars).forEach((i, k) => setTimeout(() => { i.style.width = i.dataset.w; }, k * 45));
  }, { threshold: 0.15 });
  io.observe(bars);

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

/* ── constellation ── */
(() => {
  const cv = $('#constellation');
  if (!cv) return;
  const ctx = cv.getContext('2d', { alpha: true });
  let W = 0, H = 0, dpr = 1;

  const nodes = SKILLS.map((s, i) => {
    const ring = 5 - s.lv;                                  // stronger skills sit nearer the centre
    const a = (i / SKILLS.length) * Math.PI * 2 + ring * 0.7;
    return { ...s, a, ring, r: 0.16 + ring * 0.115, x: 0, y: 0, rad: 3 + s.lv * 2.1, on: 0 };
  });

  let spin = 0, drag = null, vel = 0.00035, hovered = null, active = 'All';

  const resize = () => {
    const box = cv.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(cv);
  resize();

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  let ink = css('--line'), fg = css('--fg'), fg3 = css('--fg-3');
  addEventListener('themechange', () => { ink = css('--line'); fg = css('--fg'); fg3 = css('--fg-3'); });

  addEventListener('skillfilter', (e) => { active = e.detail; });

  const place = (n) => {
    const R = Math.min(W, H) / 2;
    n.x = W / 2 + Math.cos(n.a + spin) * n.r * R * 1.72;
    n.y = H / 2 + Math.sin(n.a + spin) * n.r * R * 1.72;
  };

  cv.addEventListener('pointermove', (e) => {
    const b = cv.getBoundingClientRect(), mx = e.clientX - b.left, my = e.clientY - b.top;
    if (drag !== null) { vel = 0; spin += (mx - drag) * 0.005; drag = mx; }
    hovered = nodes.find((n) => Math.hypot(n.x - mx, n.y - my) < n.rad + 13) || null;
    cv.style.cursor = hovered ? 'pointer' : (drag !== null ? 'grabbing' : 'grab');
  });
  cv.addEventListener('pointerdown', (e) => {
    drag = e.clientX - cv.getBoundingClientRect().left;
    cv.setPointerCapture(e.pointerId);
  });
  const release = () => { if (drag !== null) { drag = null; vel = 0.00035; } };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('pointerleave', () => { release(); hovered = null; });

  const frame = () => {
    spin += vel;
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(place);

    // links between same-category neighbours
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a.cat !== b.cat) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > Math.min(W, H) * 0.42) continue;
        const dim = active !== 'All' && a.cat !== active ? 0.16 : 1;
        ctx.strokeStyle = `hsl(${CAT_HUE[a.cat]} 55% 60% / ${(0.20 * dim * (1 - d / (Math.min(W, H) * 0.42))).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // centre mark
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.055, 0, 7); ctx.stroke();

    nodes.forEach((n) => {
      const focus = hovered === n;
      n.on += ((focus ? 1 : 0) - n.on) * 0.18;
      const dim = active !== 'All' && n.cat !== active ? 0.18 : 1;
      const hue = CAT_HUE[n.cat];
      const rad = n.rad * (1 + n.on * 0.45);

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad * 4.5);
      g.addColorStop(0, `hsl(${hue} 70% 62% / ${(0.32 * dim).toFixed(3)})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(n.x, n.y, rad * 4.5, 0, 7); ctx.fill();

      ctx.fillStyle = `hsl(${hue} 72% ${58 + n.on * 18}% / ${dim})`;
      ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, 7); ctx.fill();

      if (n.on > 0.04 || n.lv === 5) {
        ctx.font = `${n.on > 0.5 ? 600 : 500} ${11 + n.on * 2}px -apple-system, "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = n.on > 0.04
          ? `rgb(from ${fg} r g b / ${Math.max(n.on, 0.35) * dim})`
          : `rgb(from ${fg3} r g b / ${0.55 * dim})`;
        ctx.fillText(n.n, n.x, n.y - rad - 7);
      }
    });

    if (hovered) {
      const t = `${hovered.cat} · ${LABEL[hovered.lv]}`;
      ctx.font = '500 10.5px ui-monospace, "SF Mono", Menlo, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = fg3;
      ctx.fillText(t, hovered.x, hovered.y + hovered.rad + 8);
    }

    requestAnimationFrame(frame);
  };

  // only animate while it's actually on screen
  let running = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    else if (!e.isIntersecting) { running = false; }
  }, { threshold: 0.05 }).observe(cv);
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

  const validate = () => {
    const name = $('#f-name').value.trim();
    const mail = $('#f-email').value.trim();
    const msg  = $('#f-msg').value.trim();
    let ok = true;
    ok = setErr('f-name', name.length < 2 ? 'Please tell me your name.' : '') && ok;
    ok = setErr('f-email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail) ? '' : 'That email doesn\'t look right.') && ok;
    ok = setErr('f-msg', msg.length < 12 ? 'A little more detail, please — at least a sentence.' : '') && ok;
    return ok;
  };
  ['#f-name', '#f-email', '#f-msg'].forEach((s) =>
    $(s).addEventListener('blur', validate));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return say('err', 'Please fix the highlighted fields.');

    // bot traps — a filled honeypot or a sub-3-second submit is not a human
    if ($('#f-company').value || Date.now() - loadedAt < 3000) {
      return say('ok', 'Thanks — message received.');   // silent drop
    }

    const data = Object.fromEntries(new FormData(form));
    delete data.botcheck;

    if (!CONFIG.formAccessKey) {                        // no key yet → mail client
      const body = `${data.message}\n\n— ${data.name} <${data.email}>`;
      location.href = `mailto:${email()}?subject=${encodeURIComponent('[Portfolio] ' + data.enquiry_type)}&body=${encodeURIComponent(body)}`;
      return say('ok', 'Opening your mail app — press send there and it reaches me.');
    }

    btn.disabled = true;
    say('busy', 'Sending…');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: CONFIG.formAccessKey,
          subject: `[Portfolio] ${data.enquiry_type} — ${data.name}`,
          from_name: 'aungzawwin.dev',
          ...data,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success) {
        form.reset();
        say('ok', 'Sent. I\'ll reply within two working days — thank you.');
      } else {
        throw new Error(json.message || 'send failed');
      }
    } catch {
      say('err', `Something went wrong. Please email me directly at ${email()}.`);
    } finally {
      btn.disabled = false;
    }
  });
})();

/* ══ small stuff ═════════════════════════════════════════════════════ */
(() => {
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // "8+ years" stays true without anyone editing it
  const started = new Date('2017-12-01');
  const yrs = Math.floor((Date.now() - started) / 31557600000);
  const badge = $('#yearsBadge'); if (badge) badge.textContent = `${yrs}+`;
  $$('[data-count][data-suffix="+"]').forEach((el) => { el.dataset.count = yrs; });
})();
