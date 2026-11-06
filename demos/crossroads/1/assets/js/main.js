/* CrossRoads Decorative Pavement — site script (no dependencies) */
(() => {
  document.documentElement.classList.remove('no-js');

  // Footer year
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  }

  // Before / after sliders
  document.querySelectorAll('.ba').forEach(ba => {
    const input = ba.querySelector('input[type="range"]');
    const set = v => ba.style.setProperty('--pos', v + '%');
    input.addEventListener('input', () => set(input.value));
    set(input.value);
  });

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  // Gallery filters
  const filterBar = document.querySelector('.filters');
  const tiles = [...document.querySelectorAll('.work .tile')];
  if (filterBar) {
    filterBar.querySelectorAll('button').forEach(btn => {
      const f = btn.dataset.filter;
      const n = f === 'all' ? tiles.length : tiles.filter(t => t.dataset.cat.split(' ').includes(f)).length;
      btn.insertAdjacentHTML('beforeend', `<span class="count">${n}</span>`);
    });
    filterBar.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      filterBar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      const f = btn.dataset.filter;
      tiles.forEach(t => { t.hidden = !(f === 'all' || t.dataset.cat.split(' ').includes(f)); });
      if (history.replaceState) history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
    });
    const initial = location.hash.slice(1);
    const btn = initial && filterBar.querySelector(`[data-filter="${CSS.escape(initial)}"]`);
    if (btn) btn.click();
  }

  // Lightbox
  const lb = document.getElementById('lightbox');
  if (lb && tiles.length) {
    const img = lb.querySelector('img');
    const title = lb.querySelector('.lb-cap b');
    const sub = lb.querySelector('.lb-cap span');
    const count = lb.querySelector('.lb-count');
    let list = [], i = 0;

    const show = n => {
      i = (n + list.length) % list.length;
      const t = list[i], b = t.querySelector('button');
      img.src = b.dataset.full;
      img.alt = t.querySelector('img').alt;
      title.textContent = t.querySelector('figcaption b').textContent;
      sub.textContent = t.querySelector('figcaption span')?.textContent || '';
      count.textContent = `${i + 1} / ${list.length}`;
      // Preload neighbours
      [i + 1, i - 1].forEach(k => { const nb = list[(k + list.length) % list.length]; if (nb) new Image().src = nb.querySelector('button').dataset.full; });
    };

    tiles.forEach(t => t.querySelector('button').addEventListener('click', () => {
      list = tiles.filter(x => !x.hidden);
      show(list.indexOf(t));
      lb.showModal();
    }));
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev').addEventListener('click', () => show(i - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(i + 1));
    lb.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') show(i + 1);
      if (e.key === 'ArrowLeft') show(i - 1);
    });
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) lb.close(); });
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(dx < 0 ? i + 1 : i - 1);
      x0 = null;
    });
  }
})();
