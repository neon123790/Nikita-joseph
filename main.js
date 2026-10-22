(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;

  document.getElementById('year').textContent = new Date().getFullYear();

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

  /* ==========================================================
     Hero: the wall tidies into Ask → Map → Simplify → Ship on hover
     ========================================================== */
  const stage = document.getElementById('stage');
  if (canHover) {
    stage.addEventListener('pointerenter', () => stage.classList.add('is-clear'));
    stage.addEventListener('pointerleave', () => stage.classList.remove('is-clear'));
  }

  /* one sticky note flips every few seconds to show a proof point */
  const proofs = [
    ['4+ years', 'in fintech UX'],
    ['10+', 'products shipped'],
    ['2', 'promotions at FYERS'],
    ['CXO', 'Innovation Lab'],
    ['FYERS Force', 'Award · best launched project'],
  ];
  const flipNotes = [...stage.querySelectorAll('[data-flip]')];
  let tick = 0;
  let flipped = null;
  const flipNext = () => {
    if (document.hidden) return;
    if (flipped) flipped.classList.remove('is-flipped');
    const note = flipNotes[tick % flipNotes.length];
    const [big, small] = proofs[tick % proofs.length];
    note.querySelector('.back strong').textContent = big;
    note.querySelector('.back span').textContent = small;
    setTimeout(() => note.classList.add('is-flipped'), flipped ? 350 : 0);
    flipped = note;
    tick++;
  };
  setTimeout(() => { flipNext(); setInterval(flipNext, 4000); }, 2500);

  /* her eyes follow the cursor, just a little */
  const look = document.querySelector('.girl .look');
  if (look && canHover && !reduceMotion) {
    const girl = document.querySelector('.girl');
    window.addEventListener('pointermove', (e) => {
      const r = girl.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      look.style.transform = `translate(${(dx / d) * 2.2 * k}px, ${(dy / d) * 1.6 * k}px)`;
    }, { passive: true });
  }

  /* ==========================================================
     Tabs helper: bookmarks (journal) and the process stepper
     ========================================================== */
  const makeTabs = (tabs, { hoverSelect = false } = {}) => {
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const select = (i, focus = false) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = panels[j];
        if (on) {
          panel.hidden = false;
          requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('is-active')));
        } else {
          panel.classList.remove('is-active');
          panel.hidden = true;
        }
      });
      if (focus) tabs[i].focus();
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
  makeTabs([...document.querySelectorAll('.bookmark')]);
  makeTabs([...document.querySelectorAll('.step-tab')], { hoverSelect: true });

  /* ==========================================================
     Career: a road through the stops, with a car that drives as you scroll
     ========================================================== */
  const road = document.getElementById('road');
  const svg = road.querySelector('.road-svg');
  const base = svg.querySelector('.road-base');
  const dash = svg.querySelector('.road-dash');
  const done = svg.querySelector('.road-done');
  const stopsLayer = svg.querySelector('.stops-layer');
  const car = svg.querySelector('.car');
  const dest = svg.querySelector('.dest-marker');
  const cards = [...road.querySelectorAll('.stop-card')];
  let total = 0;
  let stopLens = [];
  let stopDots = [];

  const buildRoad = () => {
    const rr = road.getBoundingClientRect();
    const W = rr.width;
    const H = rr.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const narrow = W < 700;
    const cx = narrow ? 22 : W / 2;
    const amp = narrow ? 8 : 34;

    const pts = cards.map((c, i) => {
      const r = c.getBoundingClientRect();
      return { x: cx + (i % 2 ? amp : -amp), y: r.top - rr.top + Math.min(44, r.height / 2) };
    });
    let d = `M ${cx} 0`;
    let prev = { x: cx, y: 0 };
    pts.forEach((p) => {
      const my = (prev.y + p.y) / 2;
      d += ` C ${prev.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
      prev = p;
    });
    [base, dash, done].forEach((p) => p.setAttribute('d', d));
    total = base.getTotalLength();
    done.style.strokeDasharray = `${total} ${total}`;

    // find how far along the road each stop is (y increases along the path)
    stopLens = pts.map((p) => {
      let lo = 0, hi = total;
      for (let k = 0; k < 24; k++) {
        const mid = (lo + hi) / 2;
        if (base.getPointAtLength(mid).y < p.y) lo = mid; else hi = mid;
      }
      return hi;
    });

    stopsLayer.innerHTML = '';
    stopDots = pts.map((p) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', narrow ? 6 : 8);
      c.setAttribute('class', 'stop');
      stopsLayer.appendChild(c);
      return c;
    });
    const last = pts[pts.length - 1];
    dest.setAttribute('transform', `translate(${last.x + (narrow ? 0 : 0)} ${last.y - 10})`);
    updateCar();
  };

  const updateCar = () => {
    if (!total) return;
    const r = road.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / r.height));
    // never drive past the destination
    const L = Math.min(total * p, stopLens[stopLens.length - 1] || total);
    const a = base.getPointAtLength(L);
    const b = base.getPointAtLength(Math.min(total, L + 1));
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    car.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${angle})`);
    done.style.strokeDashoffset = String(total - L);
    stopLens.forEach((len, i) => {
      const reached = L >= len - 2;
      stopDots[i] && stopDots[i].classList.toggle('reached', reached);
      cards[i].classList.toggle('reached', reached);
    });
  };

  // build after fonts and layout settle
  const rebuild = () => requestAnimationFrame(buildRoad);
  window.addEventListener('load', rebuild);
  window.addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(road);
  window.addEventListener('scroll', updateCar, { passive: true });

  /* ==========================================================
     Noticeboard: gentle drag that snaps back, tap/Enter to open
     ========================================================== */
  const board = document.getElementById('board');
  board.querySelectorAll('.pin-card').forEach((card) => {
    let startX = 0, startY = 0, moved = false, dragging = false, id = null;

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('a')) return;
      dragging = true; moved = false; id = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      card.setPointerCapture(id);
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== id) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!moved && Math.hypot(dx, dy) > 4) { moved = true; card.classList.add('dragging'); }
      if (moved) {
        // a gentle drag: the card follows, but with some resistance
        card.style.setProperty('--dx', `${dx * 0.85}px`);
        card.style.setProperty('--dy', `${dy * 0.85}px`);
      }
    });
    const end = (e) => {
      if (!dragging || e.pointerId !== id) return;
      dragging = false;
      card.classList.remove('dragging');
      // snap back neatly
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
})();
