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

/* On phones the links float in a dock at the bottom of the screen, with Resume as the one highlighted action. */
(() => {
  const links = document.querySelector('.site-header .nav-links');
  if (!links || document.querySelector('.nav-dock')) return;
  const dock = document.createElement('nav');
  dock.className = 'nav-dock';
  dock.setAttribute('aria-label', 'Quick navigation');
  links.querySelectorAll('a').forEach((a) => dock.appendChild(a.cloneNode(true)));
  const resume = document.createElement('a');
  resume.className = 'nav-cta';
  resume.href = 'https://drive.google.com/file/d/1uXCm8E5I2xzbWDlHEQcuiTX9KQvNNh7n/view?usp=sharing';
  resume.target = '_blank';
  resume.rel = 'noopener';
  resume.innerHTML = 'Resume <span aria-hidden="true">↗</span><span class="sr-only"> (opens Google Drive in a new tab)</span>';
  dock.appendChild(resume);
  document.body.appendChild(dock);
})();

/* The header turns frosted once the page has moved under it */
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-stuck', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
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
  const links = [...document.querySelectorAll('.nav-links a, .nav-dock a')];
  if (!links.length) return;
  const byText = (t) => links.find((a) => a.textContent.trim() === t);
  const mark = (a) => links.forEach((l) => (a && l.textContent.trim() === a.textContent.trim() ? l.setAttribute('aria-current', 'page') : l.removeAttribute('aria-current')));
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
