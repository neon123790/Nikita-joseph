/* Dark mode. The choice is remembered, and a small script in each page's head applies it before anything paints.
   On the home page, switching plays the pull: she grabs the cord, tugs, and the room changes at the bottom of the tug.
   Then her arm comes back down to her usual pose, in both modes. */
(() => {
  if (window.njTheme) { window.njTheme.mount(); return; }
  const root = document.documentElement;
  const KEY = 'nj-theme';
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  const isDark = () => root.dataset.theme === 'dark';
  const ICON = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="#ffd65a" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    + '<path class="tg-moon" d="M26 19.5A11.5 11.5 0 0 1 12.5 6a11.5 11.5 0 1 0 13.5 13.5Z"/>'
    + '<g class="tg-sun"><circle cx="16" cy="16" r="6"/><path fill="none" d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1"/></g></svg>';

  const sync = () => {
    const label = isDark() ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelectorAll('[data-theme-toggle]').forEach((b) => {
      b.setAttribute('aria-label', label);
      b.title = label;
      b.setAttribute('aria-pressed', String(isDark()));
    });
  };
  const apply = (dark) => {
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* private window: it just won't be remembered */ }
    sync();
  };
  // the string runs exactly from the top of the hero down to her hand
  const measure = () => {
    const pull = document.querySelector('.me-pull');
    const hero = pull && pull.closest('.hero3');
    if (hero) pull.style.setProperty('--reach', `${Math.ceil(pull.getBoundingClientRect().top - hero.getBoundingClientRect().top)}px`);
  };
  addEventListener('resize', measure);
  addEventListener('load', measure);
  const mount = () => {
    if (!('CSSScopeRule' in window)) { // dark.css needs @scope; on older browsers simply stay in light mode
      delete root.dataset.theme;
      document.querySelectorAll('.me-cord, .me-cord-line').forEach((e) => e.remove());
      return;
    }
    const right = document.querySelector('.nav-right');
    if (right && !right.querySelector('.theme-toggle')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-toggle';
      b.setAttribute('data-theme-toggle', '');
      b.innerHTML = ICON;
      right.appendChild(b);
    }
    measure();
    sync();
  };

  // the modes melt into each other: a whole-page crossfade where the browser can, otherwise colours fade
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const flip = (dark) => {
    if (reduced()) { apply(dark); return; }
    if (document.startViewTransition) { document.startViewTransition(() => apply(dark)); return; }
    root.classList.add('theme-fade');
    apply(dark);
    setTimeout(() => root.classList.remove('theme-fade'), 900);
  };

  let busy = false;
  const toggle = async () => {
    if (busy) return;
    const dark = !isDark();
    const pull = document.querySelector('.me-pull');
    const box = pull && pull.getBoundingClientRect();
    if (!box || box.bottom < 0 || box.top > innerHeight || reduced()) { flip(dark); return; }
    busy = true;
    pull.classList.add('is-settled'); // the entrance animation is long over
    void pull.offsetWidth;
    pull.classList.add('is-pull');    // the whole movement is one timeline in style.css
    await wait(990);
    flip(dark);                       // the room changes at the bottom of the pull
    await wait(1230);
    pull.classList.remove('is-pull');
    busy = false;
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-theme-toggle]')) toggle();
  });
  window.njTheme = { mount, toggle };
  mount();
})();
