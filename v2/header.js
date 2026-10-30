/* On phones the header slides away while you scroll down and comes back as soon as you scroll up,
   so content gets the whole screen but navigation is always one flick away. */
(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const phone = window.matchMedia('(max-width: 760px)');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    const hide = phone.matches && y > 140 && y > lastY && !header.contains(document.activeElement);
    if (Math.abs(y - lastY) > 4 || y < 140) {
      header.classList.toggle('hdr-hide', hide);
      document.documentElement.classList.toggle('hdr-hidden', hide);
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  header.addEventListener('focusin', () => { header.classList.remove('hdr-hide'); document.documentElement.classList.remove('hdr-hidden'); });
})();
