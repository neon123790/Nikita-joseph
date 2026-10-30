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
      swap(); return; // v2: no page turn, keep it simple
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
     Career: a car drives through the city as you scroll
     ========================================================== */
  const mapSvg = document.getElementById('map');
  const initDrive = () => {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const card = document.getElementById('map-card');
    const planned = mapSvg.querySelector('.route-planned');
    const casing = mapSvg.querySelector('.route-casing');
    const done = mapSvg.querySelector('.route-done');
    const pinsLayer = mapSvg.querySelector('.pins');
    const car = mapSvg.querySelector('.car');
    const stops = [...document.querySelectorAll('.j-stop')];
    const dirStep = document.getElementById('dir-step');
    const dirTitle = document.getElementById('dir-title');
    const dirMeta = document.getElementById('dir-meta');
    const bar = document.getElementById('map-progress');
    const dirIcon = document.getElementById('dir-icon');
    const dirThen = document.getElementById('dir-then');

    // A drive through the city: along the streets, with rounded corners at each turn
    const way = [[70,510],[70,400],[190,400],[190,290],[310,290],[310,400],[430,400],[430,180],[310,180],[190,180],[190,80],[530,80],[530,290]];
    const R = 18;
    let path = `M ${way[0][0]} ${way[0][1]}`;
    for (let i = 1; i < way.length - 1; i++) {
      const [px, py] = way[i - 1], [cx, cy] = way[i], [nx, ny] = way[i + 1];
      const inX = cx - Math.sign(cx - px) * R, inY = cy - Math.sign(cy - py) * R;
      const outX = cx + Math.sign(nx - cx) * R, outY = cy + Math.sign(ny - cy) * R;
      path += ` L ${inX} ${inY} Q ${cx} ${cy} ${outX} ${outY}`;
    }
    path += ` L ${way[way.length - 1][0]} ${way[way.length - 1][1]}`;
    [planned, casing, done].forEach((p) => p.setAttribute('d', path));
    const total = done.getTotalLength();
    [casing, done].forEach((p) => { p.style.strokeDasharray = `${total} ${total}`; p.style.strokeDashoffset = `${total}`; });

    // pins evenly spaced along the route; the last one is the destination
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
        // like turn-by-turn directions: this manoeuvre, then the next one
        dirStep.textContent = `${active + 1} / ${N}`;
        dirTitle.textContent = stops[active].querySelector('h3').textContent;
        dirMeta.textContent = stops[active].querySelector('.stamp').textContent;
        const turn = stops[active].querySelector('.turn svg');
        if (dirIcon && turn) dirIcon.innerHTML = turn.outerHTML;
        if (dirThen) {
          const next = stops[active + 1];
          dirThen.innerHTML = next ? `Then <b>${next.querySelector('h3').textContent}</b>` : 'You have arrived ♥';
        }
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
  };
  // the drive is optional: it sets itself up only once someone chooses to take it
  if (mapSvg) {
    const journey = document.getElementById('journey');
    if (journey && journey.hidden) document.addEventListener('drive:open', initDrive, { once: true });
    else initDrive();
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

/* Kind words: a sideways carousel with arrow buttons */
(() => {
  const track = document.querySelector('.kind3 .quotes');
  if (!track) return;
  const btns = document.querySelectorAll('.kind3 .car-btn');
  const step = () => (track.querySelector('.quote')?.offsetWidth || 320) + 24;
  btns.forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: step() * Number(b.dataset.dir), behavior: 'smooth' })));
  const update = () => {
    btns[0].disabled = track.scrollLeft < 4;
    btns[1].disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
  };
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();


/* Journal: show the sketch or the final screen — a button, so it works by tap, click and keyboard */
document.querySelectorAll('.flip-btn').forEach((btn) => {
  const print = btn.closest('.page').querySelector('.print');
  btn.addEventListener('click', () => {
    const on = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(on));
    print.classList.toggle('show-ui', on);
    btn.textContent = on ? 'Show the first sketch' : 'Show the final screen';
  });
});

/* Hero: the sticker loop can be paused (WCAG 2.2.2) */
(() => {
  const btn = document.querySelector('.motion-btn');
  const hero = document.querySelector('.hero3');
  if (!btn || !hero) return;
  btn.addEventListener('click', () => {
    const paused = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(paused));
    hero.classList.toggle('paused', paused);
    btn.textContent = paused ? 'Play animation' : 'Pause animation';
  });
})();

/* Hero: a messy scribble slowly combs itself into a clear upward line — messy money moments, making sense.
   Move the pointer (or drag a finger) across it to untangle the part behind you. */
(() => {
  const svg = document.querySelector('.untangle');
  const hero = document.querySelector('.hero3');
  if (!svg || !hero) return;
  const line = svg.querySelector('.ut-line'), dot = svg.querySelector('.ut-dot');
  const N = 120, W = 1000;
  // seeded randomness so the scribble looks the same on every visit
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const messy = [], clean = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const loop = Math.sin(t * 38 + rnd() * .6);
    messy.push([t * W + loop * 46 + (rnd() - .5) * 30, 100 + Math.cos(t * 41) * 62 * (0.5 + rnd() * .6) + (rnd() - .5) * 28]);
    clean.push([t * W, 168 - 128 * (t * t * (3 - 2 * t)) + Math.sin(t * Math.PI * 3) * 8]);
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = new Float32Array(N).fill(reduce ? 1 : 0);   // how untangled each point is (0 messy → 1 clean)
  let pointerX = -1, start = performance.now();
  const ease = (x) => x * x * (3 - 2 * x);
  const auto = (now) => {           // slow loop: hold messy, untangle, hold clean, tangle back (16s)
    const c = ((now - start) / 16000) % 1;
    if (c < .18) return 0;
    if (c < .48) return ease((c - .18) / .3);
    if (c < .82) return 1;
    return 1 - ease((c - .82) / .18);
  };
  const draw = () => {
    let d = '';
    for (let i = 0; i < N; i++) {
      const x = messy[i][0] + (clean[i][0] - messy[i][0]) * f[i];
      const y = messy[i][1] + (clean[i][1] - messy[i][1]) * f[i];
      d += (i ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      if (i === N - 1) { dot.setAttribute('cx', x); dot.setAttribute('cy', y); }
    }
    line.setAttribute('d', d);
    const avg = f.reduce((a, b) => a + b, 0) / N;
    svg.style.setProperty('--clean', avg.toFixed(3));
  };
  if (reduce) { draw(); return; }
  const tick = (now) => {
    const paused = hero.classList.contains('paused');
    if (paused) start += 16;        // freeze the loop while paused
    const a = auto(now);
    for (let i = 0; i < N; i++) {
      const px = i / (N - 1) * W;
      const byPointer = pointerX < 0 ? 0 : ease(Math.min(1, Math.max(0, (pointerX - px) / 140 + .5)));
      const target = Math.max(a, byPointer);
      if (!paused) f[i] += (target - f[i]) * .035;   // slow, calm easing
    }
    draw();
    requestAnimationFrame(tick);
  };
  const toLocal = (clientX) => { const r = svg.getBoundingClientRect(); return (clientX - r.left) / r.width * W; };
  hero.addEventListener('pointermove', (e) => { pointerX = toLocal(e.clientX); });
  hero.addEventListener('pointerleave', () => { pointerX = -1; });
  hero.addEventListener('touchend', () => { setTimeout(() => { pointerX = -1; }, 1200); });
  requestAnimationFrame(tick);
})();

/* Career: "Take the drive" reveals the road trip and scrolls to it */
(() => {
  const btn = document.querySelector('.drive-cta');
  const journey = document.getElementById('journey');
  if (!btn || !journey) return;
  btn.addEventListener('click', () => {
    const open = journey.hidden;
    journey.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.drive-text b').textContent = open ? 'Hide the drive' : 'Prefer a story? Take the drive';
    if (open) {
      document.dispatchEvent(new Event('drive:open'));
      requestAnimationFrame(() => {
        journey.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        window.dispatchEvent(new Event('scroll'));
      });
    }
  });
})();

/* Hero: a quiet field of dots. Near the pointer (or a finger) they swell and warm up,
   then fade back slowly — a soft trail. When nobody is interacting, a slow wave drifts across. */
(() => {
  const cv = document.querySelector('.dotfield');
  const hero = document.querySelector('.hero3');
  if (!cv || !hero) return;
  const ctx = cv.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, dots = [], gap = 26;
  const build = () => {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    gap = W < 600 ? 22 : 26;
    dots = [];
    for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) dots.push({ x, y, e: 0 });
  };
  let px = -999, py = -999, lastMove = 0;
  const setP = (cx, cy) => { const r = cv.getBoundingClientRect(); px = cx - r.left; py = cy - r.top; lastMove = performance.now(); };
  hero.addEventListener('pointermove', (e) => setP(e.clientX, e.clientY));
  hero.addEventListener('pointerdown', (e) => setP(e.clientX, e.clientY));
  hero.addEventListener('pointerleave', () => { px = py = -999; });
  let draw = (now) => {
    const paused = hero.classList.contains('paused');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const idle = true; // the slow wave always passes; the pointer adds to it
    const wave = ((now / 9000) % 1) * (W + H) - H * .3;   // slow diagonal wave position
    for (const d of dots) {
      let t = 0;
      const dist = Math.hypot(d.x - px, d.y - py);
      if (dist < 130) t = Math.max(t, 1 - dist / 130);
      if (idle && !reduce && !paused) { const w = Math.abs((d.x + d.y * .6) - wave); if (w < 90) t = Math.max(t, (1 - w / 90) * .45); }
      // rise quickly, fade back slowly
      d.e += (t - d.e) * (t > d.e ? .25 : .035);
      const e = d.e;
      // dots near the pointer drift gently away from it, then settle back
      let ox = 0, oy = 0;
      if (dist < 130 && dist > 0.1) { const push = (1 - dist / 130) * 14; ox = (d.x - px) / dist * push; oy = (d.y - py) / dist * push; }
      // a slow, gentle float so the field is never completely still
      if (!reduce && !paused) { const ph = (d.x * .013 + d.y * .017); ox += Math.sin(now / 2600 + ph) * 1.6; oy += Math.cos(now / 3100 + ph) * 1.6; }
      d.ox = (d.ox || 0) + (ox - (d.ox || 0)) * .12; d.oy = (d.oy || 0) + (oy - (d.oy || 0)) * .12;
      const r = 1.3 + e * 2.4;
      ctx.fillStyle = e > .02 ? `rgba(${Math.round(20 + 211 * e)}, ${Math.round(17 + 55 * e)}, ${Math.round(28 - 13 * e)}, ${.18 + e * .6})` : 'rgba(20, 17, 28, .18)';
      ctx.beginPath(); ctx.arc(d.x + d.ox, d.y + d.oy, r, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduce) requestAnimationFrame(draw);
  };
  // stop drawing while the hero is off screen, so the rest of the page stays smooth
  let visible = true;
  new IntersectionObserver((es) => { const was = visible; visible = es[0].isIntersecting; if (visible && !was && !reduce) requestAnimationFrame(draw); }).observe(hero);
  const _draw = draw;
  draw = (now) => { if (visible) _draw(now); };
  build();
  window.addEventListener('resize', build);
  requestAnimationFrame(draw);
})();

/* In-page links ("See my work", "Get in touch", …): glide to the section's heading, already visible */
document.querySelectorAll('a[href^="#"]:not([href="#"]):not(.skip-link)').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target || target.closest('.cs-toc')) return;
    e.preventDefault();
    target.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
    const anchor = target.querySelector('.section-head, .label, h2') || target;
    const header = document.querySelector('.site-header');
    const offset = (header ? header.getBoundingClientRect().height : 0) + 24;
    const y = anchor.getBoundingClientRect().top + window.scrollY - offset;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
  });
});

/* Hero: a faint maze behind the words. A soft line finds its way from the entrance to the exit,
   rests, fades, and a new maze appears — "lost in a maze of clicks? let's find you a way out." */
(() => {
  const svg = document.querySelector('.maze');
  const hero = document.querySelector('.hero3');
  if (!svg || !hero) return;
  const walls = svg.querySelector('.maze-walls'), path = svg.querySelector('.maze-path'), dot = svg.querySelector('.maze-dot');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, cell, cols, rows, len = 0, t0 = 0, visible = true;
  const make = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    cell = W < 600 ? 56 : 76;   // big, calm cells
    cols = Math.floor(W / cell); rows = Math.floor(H / cell);
    const ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // recursive-backtracker maze
    const N = cols * rows, seen = new Uint8Array(N), right = new Uint8Array(N).fill(1), down = new Uint8Array(N).fill(1);
    const stack = [0]; seen[0] = 1;
    while (stack.length) {
      const c = stack[stack.length - 1], x = c % cols, y = (c / cols) | 0;
      const n = [];
      if (x > 0 && !seen[c - 1]) n.push(c - 1);
      if (x < cols - 1 && !seen[c + 1]) n.push(c + 1);
      if (y > 0 && !seen[c - cols]) n.push(c - cols);
      if (y < rows - 1 && !seen[c + cols]) n.push(c + cols);
      if (!n.length) { stack.pop(); continue; }
      const k = n[(Math.random() * n.length) | 0];
      if (k === c + 1) right[c] = 0; else if (k === c - 1) right[k] = 0; else if (k === c + cols) down[c] = 0; else down[k] = 0;
      seen[k] = 1; stack.push(k);
    }
    let d = `M${ox} ${oy}H${ox + cols * cell}M${ox} ${oy}V${oy + rows * cell}`;
    for (let c = 0; c < N; c++) {
      const x = ox + (c % cols) * cell, y = oy + ((c / cols) | 0) * cell;
      if (right[c]) d += `M${x + cell} ${y}V${y + cell}`;
      if (down[c]) d += `M${x} ${y + cell}H${x + cell}`;
    }
    walls.setAttribute('d', d);
    // solve from a left entrance to a right exit (breadth-first search)
    const s = ((rows / 2) | 0) * cols, e = (((rows / 2) | 0) + 1) * cols - 1;
    const prev = new Int32Array(N).fill(-1), q = [s]; prev[s] = s;
    while (q.length) {
      const c = q.shift(); if (c === e) break;
      const x = c % cols;
      const go = (k) => { if (prev[k] === -1) { prev[k] = c; q.push(k); } };
      if (x < cols - 1 && !right[c]) go(c + 1);
      if (x > 0 && !right[c - 1]) go(c - 1);
      if (c + cols < N && !down[c]) go(c + cols);
      if (c - cols >= 0 && !down[c - cols]) go(c - cols);
    }
    const pts = []; for (let c = e; ; c = prev[c]) { pts.push(c); if (c === s) break; }
    pts.reverse();
    const cx = (c) => ox + (c % cols) * cell + cell / 2, cy = (c) => oy + ((c / cols) | 0) * cell + cell / 2;
    path.setAttribute('d', `M${ox - 10} ${cy(s)}` + pts.map((c) => `L${cx(c)} ${cy(c)}`).join('') + `L${ox + cols * cell + 10} ${cy(e)}`);
    len = path.getTotalLength();
    path.style.strokeDasharray = `${len} ${len}`;
    t0 = performance.now();
  };
  const step = (now) => {
    if (!visible) return;
    const T = 14000, HOLD = 2500, OUT = 1800, k = (now - t0);
    if (k > T + HOLD + OUT) { make(); svg.style.opacity = 0; requestAnimationFrame(() => { svg.style.opacity = 1; }); }
    const p = Math.min(1, k / T), ease = p * p * (3 - 2 * p);
    const fade = k > T + HOLD ? Math.max(0, 1 - (k - T - HOLD) / OUT) : 1;
    path.style.strokeDashoffset = len * (1 - ease);
    path.style.opacity = fade; dot.style.opacity = fade; walls.style.opacity = .4 + fade * .6;
    const pt = path.getPointAtLength(len * ease);
    dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
    requestAnimationFrame(step);
  };
  make();
  if (reduce) { path.style.strokeDashoffset = 0; const pt = path.getPointAtLength(len); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); return; }
  new IntersectionObserver((es) => { const was = visible; visible = es[0].isIntersecting; if (visible && !was) requestAnimationFrame(step); }).observe(hero);
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(make, 200); });
  requestAnimationFrame(step);
})();


/* Noticeboard pockets: tap a pocket to see the photos tucked inside */
(() => {
  const dlg = document.querySelector('.pocket-view');
  if (!dlg) return;
  const grid = dlg.querySelector('.pv-grid'), title = dlg.querySelector('#pv-title');
  let opener = null;
  document.querySelectorAll('.pocket').forEach((p) => p.addEventListener('click', () => {
    opener = p;
    title.textContent = p.dataset.title.replace('&amp;', '&');
    grid.innerHTML = JSON.parse(p.dataset.photos).map((ph, i) =>
      `<li style="--r:${[-2, 1.5, -1, 2, -1.5][i % 5]}deg"><img src="${ph.src}" alt="${ph.cap}"><span>${ph.cap}</span></li>`).join('');
    dlg.showModal();
    dlg.querySelector('.pv-close').focus();
  }));
  dlg.querySelector('.pv-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => opener && opener.focus());
})();
