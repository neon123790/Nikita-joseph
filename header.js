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
