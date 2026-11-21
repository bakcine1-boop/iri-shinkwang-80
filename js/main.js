(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection && navigator.connection.saveData;

  /* ---------- voices grid ---------- */
  const grid = $('#vgrid');
  if (grid && window.VOICES) {
    grid.innerHTML = VOICES.map((v, i) => `
      <button class="vc rv d${i % 3}" data-v="${v.id}" aria-haspopup="dialog" aria-label="${v.name} ${v.role} 인터뷰 더 보기">
        <span class="ph" style="display:block"><img src="img/${v.img}-480.webp" alt="${v.name} ${v.role}" loading="lazy"></span>
        <span><span class="who"><b>${v.name} ${v.role}</b><span class="r">${v.sub}</span></span><q>${v.short}</q><span class="more">인터뷰 더 읽기 →</span></span>
      </button>`).join('');
  }

  /* ---------- nav / progress / active ---------- */
  const nav = $('#nav'), bar = $('.progress');
  const darkSecs = $$('.hero, .dark, .doc, .epi');
  const links = $$('.nav ul a');
  const secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  let ticking = false;
  function onScroll() {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    const probe = 70;
    const overDark = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; });
    const inHero = $('.hero').getBoundingClientRect().bottom > probe;
    nav.classList.toggle('solid', !overDark);
    nav.classList.toggle('dark', overDark && !inHero);
    let cur = null;
    secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * 0.35) cur = s; });
    links.forEach(a => a.classList.toggle('on', cur && a.getAttribute('href') === '#' + cur.id));
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* mobile menu */
  const btn = $('.menu-btn'), sheet = $('#sheet');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open); btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    sheet.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', sheet).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- reveal ---------- */
  const rvs = $$('.rv');
  if (reduce || !('IntersectionObserver' in window)) rvs.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(el => io.observe(el));
  }
  requestAnimationFrame(() => $$('.hero .rv').forEach(el => el.classList.add('in')));

  /* ---------- background videos ---------- */
  function lazyVideo(v, pickSrc) {
    if (!v || reduce || saveData) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) {
        if (!v.src) { v.src = pickSrc(); v.load(); v.addEventListener('playing', () => v.previousElementSibling && v.parentElement.classList.add('vid-on'), { once: true }); }
        v.play().catch(() => {});
      } else v.pause();
    }), { threshold: 0.05 });
    io.observe(v);
  }
  const hv = $('#heroVideo');
  lazyVideo(hv, () => innerWidth < 760 ? hv.dataset.srcM : hv.dataset.src);
  const nv = $('#nightVideo');
  lazyVideo(nv, () => nv.dataset.src);

  /* ---------- youtube facade ---------- */
  const ytSrc = (id, start) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1${start ? '&start=' + start : ''}`;
  function playYT(box, start) {
    const id = box.dataset.yt;
    let f = box.querySelector('iframe');
    if (!f) {
      f = document.createElement('iframe');
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.allowFullscreen = true; f.title = box.getAttribute('aria-label') || 'YouTube';
      box.innerHTML = ''; box.appendChild(f);
    }
    f.src = ytSrc(id, start);
  }
  $$('.yt').forEach(b => {
    const go = () => { if (!b.querySelector('iframe')) playYT(b); };
    b.addEventListener('click', go);
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    $$('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on');
    const box = $('#liveBox'); playYT(box, c.dataset.t);
    const r = box.getBoundingClientRect(); if (r.top < 60 || r.top > innerHeight * .5) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  }));

  /* ---------- voice dialog ---------- */
  const vd = $('#vdlg');
  function openVoice(id) {
    const v = VOICES.find(x => x.id === id); if (!v) return;
    $('#vdlg-img').src = `img/${v.img}-800.webp`; $('#vdlg-img').alt = `${v.name} ${v.role}`;
    $('#vdlg-name').textContent = `${v.name} ${v.role}`;
    $('#vdlg-role').textContent = v.sub;
    $('#vdlg-text').innerHTML = v.long.map(p => `<p>“${p.replace(/</g, '&lt;')}”</p>`).join('');
    vd.showModal(); document.body.style.overflow = 'hidden';
    vd.querySelector('.dlg').scrollTop = 0;
  }
  grid && grid.addEventListener('click', e => { const b = e.target.closest('.vc'); if (b) openVoice(b.dataset.v); });
  [vd, $('#lb')].forEach(d => {
    d.addEventListener('close', () => document.body.style.overflow = '');
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('#lb-img'), lbCap = $('#lb-cap');
  let group = [], idx = 0;
  function show(i) {
    idx = (i + group.length) % group.length; const el = group[idx];
    lbImg.src = el.dataset.lb; lbImg.alt = el.querySelector('img')?.alt || ''; lbCap.textContent = el.dataset.cap || '';
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-lb]'); if (!el) return;
    const scope = el.closest('.mosaic, .gallery') || document;
    group = $$('[data-lb]', scope); show(group.indexOf(el));
    lb.showModal(); document.body.style.overflow = 'hidden';
  });
  $('.prev', lb).addEventListener('click', e => { e.stopPropagation(); show(idx - 1); });
  $('.next', lb).addEventListener('click', e => { e.stopPropagation(); show(idx + 1); });
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  let sx = null;
  lb.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  lb.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  $$('[data-lb]').forEach(el => { el.setAttribute('role', 'button'); el.tabIndex = 0; el.addEventListener('keydown', e => { if (e.key === 'Enter') el.click(); }); });
})();
