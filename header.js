/* On phones the header slides away while you scroll down and comes back as soon as you scroll up,
   so content gets the whole screen but navigation is always one flick away. */
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const phone = window.matchMedia('(max-width: 760px)');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const hide = phone.matches && y > 140 && y > lastY && !header.contains(document.activeElement) && !header.classList.contains('menu-open');
    if (Math.abs(y - lastY) > 4 || y < 140) {
      header.classList.toggle('hdr-hide', hide);
      document.documentElement.classList.toggle('hdr-hidden', hide);
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => { header.classList.remove('hdr-hide'); document.documentElement.classList.remove('hdr-hidden'); });
})();

/* On phones the nav links fold into a hamburger menu. The button is added here so every page gets it,
   and without JavaScript the links simply stay visible. */
(() => {
  const header = document.querySelector('.site-header');
  const links = header && header.querySelector('.nav-links');
  const right = header && header.querySelector('.nav-right');
  if (!links || !right) return;
  links.id = links.id || 'site-menu';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-burger';
  btn.setAttribute('aria-controls', links.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Open menu');
  btn.innerHTML = '<span></span><span></span><span></span>';
  right.appendChild(btn);
  header.classList.add('has-burger');
  requestAnimationFrame(() => requestAnimationFrame(() => header.classList.add('burger-ready')));

  const set = (open) => {
    header.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn.addEventListener('click', () => set(!header.classList.contains('menu-open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { set(false); btn.focus(); }
  });
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) set(false); });
  window.matchMedia('(max-width: 760px)').addEventListener('change', () => set(false));
})();

/* Highlighter marks draw themselves in when they scroll into view */
(() => {
  const marks = document.querySelectorAll('mark.hl');
  if (!marks.length) return;
  if (!('IntersectionObserver' in window)) { marks.forEach((m) => m.classList.add('on')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  marks.forEach((m) => io.observe(m));
})();

/* Show where you are in the header: Career on the career page, Work on project pages,
   and on the home page whichever of Work / Contact you're scrolled to. */
(() => {
  const links = [...document.querySelectorAll('.nav-links a')];
  if (!links.length) return;
  const byText = (t) => links.find((a) => a.textContent.trim() === t);
  const mark = (a) => links.forEach((l) => (l === a ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current')));
  if (/\/work\//.test(location.pathname)) { mark(byText('Work')); return; }
  if (links.some((l) => l.getAttribute('aria-current') === 'page')) return; // set in the page already (Career)
  const sections = [['work', byText('Work')], ['contact', byText('Contact')]]
    .map(([id, a]) => [document.getElementById(id), a]).filter(([s, a]) => s && a);
  if (!sections.length || !('IntersectionObserver' in window)) return;
  const visible = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => visible.set(e.target, e.isIntersecting));
    // the lowest section on screen wins, so Contact takes over once you reach it
    const on = sections.filter(([s]) => visible.get(s)).pop();
    mark(on ? on[1] : null);
  }, { rootMargin: '-35% 0px -45% 0px' });
  sections.forEach(([s]) => io.observe(s));
})();
