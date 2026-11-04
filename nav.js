/* Seamless page changes while the music plays.
   A normal link click reloads the page, which stops any audio. So while the record is spinning,
   links to other pages on this site swap the page content in place (and update the address bar),
   and the music carries on uninterrupted. With the music off, links behave exactly as usual.
   If anything goes wrong, it falls back to a normal page load. */
(() => {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  const SKIP = /(?:^|\/)(?:music|nav)\.js/;
  const isPage = (u) => u.origin === location.origin && (/\.html$/.test(u.pathname) || u.pathname.endsWith('/'));
  const musicOn = () => !!(window.njMusic && window.njMusic.playing());

  // run the new page's scripts in order; inline ones get their own block so their consts don't clash
  const runScripts = async (root) => {
    for (const old of [...root.querySelectorAll('script')]) {
      const src = old.getAttribute('src');
      if (src && SKIP.test(src)) { old.remove(); continue; }
      const s = document.createElement('script');
      if (src) {
        s.src = old.src;
        await new Promise((done) => { s.onload = s.onerror = done; old.replaceWith(s); });
      } else {
        s.textContent = '{\n' + old.textContent + '\n}';
        old.replaceWith(s);
      }
    }
  };

  let busy = false;
  const go = async (url, push) => {
    if (busy) return;
    busy = true;
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) throw new Error('not a page');
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      // a page that redirects itself (meta refresh) gets a real load
      if (doc.querySelector('meta[http-equiv="refresh"]')) throw new Error('redirect page');
      if (push) history.pushState({ nj: 1 }, '', url);
      document.title = doc.title;
      // keep the stylesheet in step if its version differs
      const css = doc.querySelector('link[rel="stylesheet"][href*="style.css"]'), cur = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
      if (css && cur && css.href !== cur.href) cur.href = css.href;
      document.documentElement.className = doc.documentElement.className;
      document.body.className = doc.body.className;
      document.body.replaceChildren(...doc.body.childNodes);
      const hash = new URL(url).hash;
      const target = hash && document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) target.scrollIntoView(); else window.scrollTo(0, 0);
      await runScripts(document.body);
      document.dispatchEvent(new Event('nj:page'));
    } catch (e) {
      location.href = url;
    }
    busy = false;
  };

  document.addEventListener('click', (e) => {
    if (!musicOn() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (!isPage(u)) return;
    if (u.pathname === location.pathname && u.search === location.search) return; // a jump within this page
    e.preventDefault();
    go(u.href, true);
  });
  addEventListener('popstate', () => { if (history.state && history.state.nj || musicOn()) go(location.href, false); });
  // mark the first page so going back to it also swaps in place
  if (!history.state) history.replaceState({ nj: 1 }, '', location.href);
})();
