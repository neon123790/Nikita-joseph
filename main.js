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
     Hero character: her eyes follow the cursor, just a little
     ========================================================== */
  const look = document.querySelector('.girl .look');
  if (look && canHover && !reduceMotion) {
    const girl = document.querySelector('.girl');
    window.addEventListener('pointermove', (e) => {
      const r = girl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.5;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      look.style.transform = `translate(${(dx / d) * 2.2 * k}px, ${(dy / d) * 1.6 * k}px)`;
    }, { passive: true });
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
