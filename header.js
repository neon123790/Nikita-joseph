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
  const links = [...document.querySelectorAll('.nav-links a')];
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

/* Phones: name on the left; on the right the light/dark switch and a menu button.
   The menu opens full screen with every destination, Contact included, in large type. */
(() => {
  const header = document.querySelector('.site-header');
  const right = header && header.querySelector('.nav-right');
  const links = header ? [...header.querySelectorAll('.nav-links a')] : [];
  if (!right || !links.length) return;
  const RESUME = 'https://drive.google.com/file/d/1uXCm8E5I2xzbWDlHEQcuiTX9KQvNNh7n/view?usp=sharing';
  const byText = (t) => links.find((a) => a.textContent.trim() === t);
  const contact = byText('Contact');
  const brand = header.querySelector('.brand');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-menu-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'nav-sheet');
  btn.innerHTML = '<span class="sr-only">Menu</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg>';
  right.appendChild(btn);

  const items = [
    ['Work', byText('Work') && byText('Work').getAttribute('href')],
    ['Career', byText('Career') && byText('Career').getAttribute('href')],
    ['Contact', contact && contact.getAttribute('href')],
    ['Resume', RESUME, true],
  ].filter(([, href]) => href);

  const sheet = document.createElement('div');
  sheet.className = 'nav-sheet';
  sheet.id = 'nav-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Menu');
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="nav-sheet-top wrap">
      <a class="brand" href="${brand ? brand.getAttribute('href') : '#'}">Nikita Joseph</a>
      <button type="button" class="nav-close"><span class="sr-only">Close menu</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </div>
    <nav class="nav-sheet-links wrap" aria-label="Menu">
      <div><p class="nav-sheet-label" aria-hidden="true">Menu</p><ol>${items.map(([t, href, ext], i) => `<li style="--i:${i}"><a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}${links.some((l) => l.textContent.trim() === t && l.getAttribute('aria-current') === 'page') ? ' aria-current="page"' : ''}><span class="t">${t}</span><span class="go" aria-hidden="true">${ext ? '↗' : '→'}</span>${ext ? '<span class="sr-only"> (opens Google Drive in a new tab)</span>' : ''}</a></li>`).join('')}</ol></div>
    </nav>`;
  document.body.appendChild(sheet);
  const close = sheet.querySelector('.nav-close');
  let lastFocus = null;
  const open = () => {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    void sheet.offsetWidth;
    sheet.classList.add('is-open');
    document.documentElement.classList.add('menu-lock');
    header.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    close.focus();
  };
  const shut = (restore = true) => {
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    document.documentElement.classList.remove('menu-lock');
    header.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => { if (!sheet.classList.contains('is-open')) sheet.hidden = true; }, reduced ? 0 : 280);
    if (restore && lastFocus) lastFocus.focus();
  };
  btn.addEventListener('click', open);
  close.addEventListener('click', () => shut());
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) shut(false); });
  document.addEventListener('keydown', (e) => {
    if (sheet.hidden) return;
    if (e.key === 'Escape') { shut(); return; }
    if (e.key !== 'Tab') return;
    const f = [...sheet.querySelectorAll('a, button')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  matchMedia('(min-width: 761px)').addEventListener('change', (m) => { if (m.matches) shut(false); });
})();

/* copy email buttons */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]');
    if (!b) return;
    var text = b.getAttribute('data-copy');
    var done = function () {
      b.classList.add('is-copied');
      var label = b.getAttribute('aria-label');
      b.setAttribute('aria-label', 'Email address copied');
      clearTimeout(b._t);
      b._t = setTimeout(function () { b.classList.remove('is-copied'); b.setAttribute('aria-label', label === 'Email address copied' ? 'Copy email address' : label); }, 1800);
    };
    var fallback = function () {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (err) {} t.remove(); done();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  });
})();

/* In-page links ("See my work", "Get in touch", chapter lists in case studies, …):
   glide to the section, then check where it landed. Images and reveals above the target can
   change the page height mid-glide, so the browser's own anchor scroll lands short or overshoots. */
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a[href^="#"]:not([href="#"]):not(.skip-link)');
  if (!a) return;
  let target; try { target = document.querySelector(a.getAttribute('href')); } catch (err) { return; }
  if (!target) return;
  e.preventDefault();
  target.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  const anchor = target.matches('.cs-section') ? target : (target.querySelector('.section-head, .label, h2') || target);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const spot = () => {
    const header = document.querySelector('.site-header');
    const offset = (header ? header.getBoundingClientRect().height : 0) + 24;
    return Math.max(0, Math.round(anchor.getBoundingClientRect().top + window.scrollY - offset));
  };
  window.scrollTo({ top: spot(), behavior: reduce ? 'auto' : 'smooth' });
  // once the glide stops, correct for anything that moved underneath it
  let tries = 0;
  const settle = () => {
    const y = spot();
    if (Math.abs(window.scrollY - y) > 4 && tries++ < 3) window.scrollTo({ top: y, behavior: 'auto' });
  };
  let t = setTimeout(settle, 1200);
  window.addEventListener('scrollend', () => { clearTimeout(t); settle(); t = setTimeout(settle, 400); }, { once: true });
  history.replaceState(null, '', a.getAttribute('href'));
  target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
});
