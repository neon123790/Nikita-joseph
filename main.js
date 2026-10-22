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
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .milestone').forEach((el) => revealIO.observe(el));

  /* ==========================================================
     Hero wall: messy → clear
     Clear when hovered, when the page has scrolled a little,
     or when the visitor pins it with the toggle.
     ========================================================== */
  const wall = document.getElementById('wall');
  const toggle = document.querySelector('.wall-toggle');
  const hint = document.querySelector('.hand-hint');
  let hovered = false;
  let scrolled = false;
  let override = null; // null = automatic, true/false = visitor's choice

  if (!canHover && hint) hint.textContent = 'Scroll a little, or';

  const renderWall = () => {
    const clear = override !== null ? override : (hovered || scrolled);
    wall.classList.toggle('is-clear', clear);
    toggle.setAttribute('aria-pressed', String(clear));
    toggle.textContent = clear ? 'Mess it up' : 'Tidy it up';
  };

  if (canHover) {
    wall.addEventListener('pointerenter', () => { hovered = true; renderWall(); });
    wall.addEventListener('pointerleave', () => { hovered = false; renderWall(); });
  }
  window.addEventListener('scroll', () => {
    const next = window.scrollY > 140;
    if (next !== scrolled) { scrolled = next; renderWall(); }
  }, { passive: true });
  toggle.addEventListener('click', () => {
    const current = wall.classList.contains('is-clear');
    override = !current;
    renderWall();
  });

  /* ---------- Sticky notes flip to proof points every 4s ---------- */
  const proofs = [
    ['4+ years', 'in fintech UX'],
    ['10+', 'products shipped'],
    ['2', 'promotions at FYERS'],
    ['3–4', 'designers & researchers hired'],
    ['CXO', 'Innovation Lab'],
    ['3 months', 'to build a working Android app'],
  ];
  const flipNotes = [...wall.querySelectorAll('[data-flip]')];
  let tick = 0;
  let flipped = null;

  const flipNext = () => {
    if (document.hidden) return;
    if (flipped) flipped.classList.remove('is-flipped');
    const note = flipNotes[tick % flipNotes.length];
    const [big, small] = proofs[tick % proofs.length];
    const back = note.querySelector('.back');
    back.querySelector('strong').textContent = big;
    back.querySelector('span').textContent = small;
    // let the previous note turn back first, then flip this one
    setTimeout(() => note.classList.add('is-flipped'), flipped ? 350 : 0);
    flipped = note;
    tick++;
  };
  setTimeout(() => { flipNext(); setInterval(flipNext, 4000); }, 2500);

  /* ---------- Faint pencil trail over the wall ---------- */
  const canvas = wall.querySelector('.trail');
  if (canHover && !reduceMotion && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const pts = [];
    let raf = null;
    const size = () => {
      const r = wall.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener('resize', size);

    const draw = () => {
      const now = performance.now();
      while (pts.length && now - pts[0].t > 650) pts.shift();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const life = 1 - (now - b.t) / 650;
        ctx.strokeStyle = `rgba(58, 52, 48, ${0.28 * life})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      raf = pts.length ? requestAnimationFrame(draw) : null;
    };

    wall.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = wall.getBoundingClientRect();
      pts.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
      if (!raf) raf = requestAnimationFrame(draw);
    });
  }

  /* ==========================================================
     Career timeline: the line draws itself as you scroll
     ========================================================== */
  const timeline = document.getElementById('timeline');
  const spine = timeline.querySelector('.spine');
  const updateSpine = () => {
    const r = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / r.height));
    spine.style.setProperty('--progress', String(1 - p));
  };
  updateSpine();
  window.addEventListener('scroll', updateSpine, { passive: true });
  window.addEventListener('resize', updateSpine);

  /* ==========================================================
     Process stepper: Ask → Map → Simplify → Ship
     ========================================================== */
  const tabs = [...document.querySelectorAll('.step-tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

  const select = (i, focus = false) => {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = panels[j];
      if (on) {
        panel.hidden = false;
        // next frame so the entrance transitions run
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
    if (canHover) t.addEventListener('mouseenter', () => {
      if (t.getAttribute('aria-selected') !== 'true') select(i);
    });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') select((i + 1) % tabs.length, true);
      if (e.key === 'ArrowLeft') select((i - 1 + tabs.length) % tabs.length, true);
      if (e.key === 'Home') select(0, true);
      if (e.key === 'End') select(tabs.length - 1, true);
    });
  });

  /* ==========================================================
     Moodboard cards: hover / focus (or scroll into view on touch)
     ========================================================== */
  const countUp = (el) => {
    const target = Number(el.dataset.target);
    if (reduceMotion) { el.textContent = target; return; }
    const start = performance.now();
    const dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(el._raf);
    el._raf = requestAnimationFrame(step);
  };

  const setActive = (card, on) => {
    card.classList.toggle('is-active', on);
    const count = card.querySelector('.count');
    if (count) {
      if (on) countUp(count);
      else { cancelAnimationFrame(count._raf); count.textContent = '0'; }
    }
  };

  const moodCards = document.querySelectorAll('.mood-card');
  if (canHover) {
    moodCards.forEach((card) => {
      card.addEventListener('mouseenter', () => setActive(card, true));
      card.addEventListener('mouseleave', () => setActive(card, false));
      card.addEventListener('focus', () => setActive(card, true));
      card.addEventListener('blur', () => setActive(card, false));
    });
  } else {
    const moodIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => setActive(e.target, e.isIntersecting));
    }, { threshold: 0.6 });
    moodCards.forEach((c) => moodIO.observe(c));
  }
})();
