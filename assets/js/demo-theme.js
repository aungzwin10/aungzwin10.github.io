/* Shared by the three demos. They render inside a same-origin iframe on the
   home page, so they can read the very key site.js writes — no postMessage
   handshake, no query string. Standalone, it falls back to the OS preference
   exactly like the main page does.

   `storage` fires in *other* same-origin documents, never the one that wrote,
   which is precisely the direction needed here: parent toggles, iframe hears.

   Canvases are painted with colours read from CSS custom properties, so a
   theme change has to repaint them. Each demo listens for `themechange` —
   same event name site.js uses, so the two pages stay idiomatic. */

const apply = () => {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch { /* private mode, file:// */ }
  const next = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  if (next === document.documentElement.dataset.theme) return;
  document.documentElement.dataset.theme = next;
  dispatchEvent(new CustomEvent('themechange'));
};

addEventListener('storage', (e) => { if (e.key === 'theme') apply(); });
apply();
