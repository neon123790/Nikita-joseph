(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header border on scroll ---------- */
  const header = document.querySelector('.site-header');
  const onHeaderScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onHeaderScroll();
  window.addEventListener('scroll', onHeaderScroll, { passive: true });

  /* ---------- Scroll reveal ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealIO.observe(el));

  /* pause looping animations in sections that aren't on screen */
  const pauseIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('offscreen', !e.isIntersecting));
  }, { rootMargin: '100px 0px' });
  document.querySelectorAll('main > section').forEach((s) => pauseIO.observe(s));

  /* ==========================================================
     Tabs: journal bookmarks and the How I work process
     ========================================================== */
  const makeTabs = (tabs, { hoverSelect = false, transition = null } = {}) => {
    if (!tabs.length) return;
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    let current = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    const select = (i, focus = false) => {
      if (i === current) { if (focus) tabs[i].focus(); return; }
      const from = current;
      current = i;
      // mark the tab straight away; swap the panel now or partway through a transition
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; });
      if (focus) tabs[i].focus();
      if (transition) transition(from, i, () => swap(i));
      else swap(i);
    };
    const swap = (i) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        const panel = panels[j];
        if (on) {
          panel.hidden = false;
          requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-active')));
        } else {
          panel.classList.remove('is-active');
          panel.hidden = true;
        }
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      if (hoverSelect && canHover) t.addEventListener('mouseenter', () => {
        if (t.getAttribute('aria-selected') !== 'true') select(i);
      });
      t.addEventListener('keydown', (e) => {
        const n = tabs.length;
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % n, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + n) % n, true); }
        if (e.key === 'Home') { e.preventDefault(); select(0, true); }
        if (e.key === 'End') { e.preventDefault(); select(n - 1, true); }
      });
    });
  };
  // the journal turns a page: forwards for a later bookmark, backwards for an earlier one
  const book = document.querySelector('.book');
  const narrow = () => window.matchMedia('(max-width: 860px)').matches;
  makeTabs([...document.querySelectorAll('.bookmark')], {
    transition: (from, to, swap) => {
      if (!book || reduceMotion || narrow()) { swap(); return; }
      const forward = to > from;
      const turner = book.querySelector('.turner');
      const oldPage = book.querySelector(`.entry:not([hidden]) .page.${forward ? 'right' : 'left'}`);
      turner.innerHTML = '';
      if (oldPage) turner.appendChild(oldPage.cloneNode(true));
      book.classList.remove('turn-next', 'turn-prev');
      void book.offsetWidth; // restart the animation
      swap(); // the new pages sit underneath while the old one turns over
      book.classList.add(forward ? 'turn-next' : 'turn-prev');
      clearTimeout(book._turnDone);
      book._turnDone = setTimeout(() => { book.classList.remove('turn-next', 'turn-prev'); turner.innerHTML = ''; }, 720);
    },
  });
  makeTabs([...document.querySelectorAll('.process-tab')]);

  /* ==========================================================
     Career: a car drives a heart-shaped route as you scroll
     ========================================================== */
  const mapSvg = document.getElementById('map');
  if (mapSvg) {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const card = document.getElementById('map-card');
    const planned = mapSvg.querySelector('.route-planned');
    const casing = mapSvg.querySelector('.route-casing');
    const done = mapSvg.querySelector('.route-done');
    const heart = mapSvg.querySelector('.heart-fill');
    const pinsLayer = mapSvg.querySelector('.pins');
    const car = mapSvg.querySelector('.car');
    const stops = [...document.querySelectorAll('.j-stop')];
    const dirStep = document.getElementById('dir-step');
    const dirTitle = document.getElementById('dir-title');
    const dirMeta = document.getElementById('dir-meta');
    const bar = document.getElementById('map-progress');

    // The classic heart curve, starting at the bottom tip and going clockwise
    const pts = [];
    for (let t = -Math.PI; t <= Math.PI + 0.0001; t += 0.01) {
      const x = 300 + 15 * 16 * Math.pow(Math.sin(t), 3);
      const y = 282 - 15 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const d = `M ${pts.join(' L ')}`;
    [planned, casing, done, heart].forEach((p) => p.setAttribute('d', d));
    const total = done.getTotalLength();
    [casing, done].forEach((p) => { p.style.strokeDasharray = `${total} ${total}`; p.style.strokeDashoffset = `${total}`; });

    // pins evenly spaced along the heart; the last stop closes the heart
    const N = stops.length;
    const stopLen = stops.map((_, i) => (total * i) / (N - 1));
    const pins = stopLen.map((len, i) => {
      const p = done.getPointAtLength(Math.min(len, total - 0.01));
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', i === N - 1 ? 'pin final' : 'pin');
      g.setAttribute('transform', `translate(${p.x} ${p.y})`);
      g.innerHTML = `<circle class="ring" r="11"/><circle class="dot" r="11"/><text>${i === N - 1 ? '♥' : i + 1}</text>`;
      pinsLayer.appendChild(g);
      return g;
    });

    let target = 0;   // where the scroll says the car should be (in stop units)
    let current = 0;  // where the car is now; eased towards target every frame
    let raf = null;
    let lastActive = -1;

    const measure = () => {
      // on phones the map sits on top, so read the stop in the space below it
      const mapBox = card.getBoundingClientRect();
      const stacked = window.matchMedia('(max-width: 860px)').matches;
      const focus = stacked ? mapBox.bottom + (window.innerHeight - mapBox.bottom) * 0.4 : window.innerHeight * 0.48;
      const centers = stops.map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      if (focus <= centers[0]) return 0;
      if (focus >= centers[N - 1]) return N - 1;
      for (let i = 0; i < N - 1; i++) {
        if (focus >= centers[i] && focus < centers[i + 1]) {
          return i + (focus - centers[i]) / (centers[i + 1] - centers[i]);
        }
      }
      return 0;
    };

    const render = () => {
      const i0 = Math.floor(current);
      const f = current - i0;
      const L = i0 >= N - 1 ? total : stopLen[i0] + (stopLen[i0 + 1] - stopLen[i0]) * f;
      const a = done.getPointAtLength(Math.min(L, total - 0.5));
      const b = done.getPointAtLength(Math.min(L + 0.5, total));
      const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      car.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${angle})`);
      [casing, done].forEach((p) => { p.style.strokeDashoffset = `${total - L}`; });
      bar.style.width = `${(L / total) * 100}%`;

      const active = Math.min(N - 1, Math.round(current));
      card.classList.toggle('complete', current > N - 1.05);
      if (active !== lastActive) {
        lastActive = active;
        pins.forEach((p, i) => {
          p.classList.toggle('past', i < active);
          p.classList.toggle('current', i === active);
        });
        stops.forEach((s, i) => {
          s.classList.toggle('is-current', i === active);
          s.classList.toggle('is-past', i < active);
        });
        dirStep.textContent = active === N - 1 ? 'Arrived' : `Stop ${active + 1} of ${N}`;
        dirTitle.textContent = stops[active].querySelector('h3').textContent;
        dirMeta.textContent = stops[active].querySelector('.stamp').textContent;
      }
    };

    const tick = () => {
      // ease towards the target so the drive feels smooth, never jumpy
      current += (target - current) * (reduceMotion ? 1 : 0.09);
      if (Math.abs(target - current) < 0.001) current = target;
      render();
      raf = current === target ? null : requestAnimationFrame(tick);
    };

    const onScroll = () => {
      target = measure();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    target = current = measure();
    render();
  }

  /* ==========================================================
     Noticeboard: gentle drag that snaps back, tap/Enter to open
     ========================================================== */
  const board = document.getElementById('board');
  if (board) {
    board.querySelectorAll('.pin-card').forEach((card) => {
      let startX = 0, startY = 0, moved = false, dragging = false, id = null;
      card.addEventListener('dragstart', (e) => e.preventDefault());
      card.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('a')) return;
        e.preventDefault(); // no text selection or image ghost while dragging
        dragging = true; moved = false; id = e.pointerId;
        startX = e.clientX; startY = e.clientY;
        try { card.setPointerCapture(id); } catch (err) { /* synthetic pointer */ }
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== id) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && Math.hypot(dx, dy) > 4) { moved = true; card.classList.add('dragging'); }
        if (moved) {
          card.style.setProperty('--dx', `${dx * 0.85}px`);
          card.style.setProperty('--dy', `${dy * 0.85}px`);
        }
      });
      const end = (e) => {
        if (!dragging || e.pointerId !== id) return;
        dragging = false;
        card.classList.remove('dragging');
        card.style.setProperty('--dx', '0px');
        card.style.setProperty('--dy', '0px');
        if (!moved && !canHover) card.classList.toggle('is-open');
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('is-open'); }
        if (e.key === 'Escape') card.classList.remove('is-open');
      });
      card.addEventListener('blur', () => card.classList.remove('is-open'));
    });
  }
})();
