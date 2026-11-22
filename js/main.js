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
        <span class="ph" style="display:block"><img src="img/${v.img}-480.webp?v=6" alt="${v.name} ${v.role}" loading="lazy"></span>
        <span><span class="who"><b>${v.name} ${v.role}</b><span class="r">${v.sub}</span></span><q>${v.short}</q><span class="more">인터뷰 · 목소리 듣기 →</span></span>
      </button>`).join('');
  }

  /* ---------- nav / progress / active ---------- */
  const nav = $('#nav'), bar = $('.progress');
  const darkSecs = $$('.hero, .dark, .doc, .epi, .scene');
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

  /* ---------- youtube (자막 끄기, 재생 제어) ---------- */
  let ytReady = null;
  const players = [];
  function loadYT() {
    if (ytReady) return ytReady;
    ytReady = new Promise((res, rej) => {
      if (window.YT && window.YT.Player) return res();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = rej; document.head.appendChild(s);
      setTimeout(() => rej(new Error('yt timeout')), 8000);
    });
    return ytReady;
  }
  const noCC = p => { try { p.setOption('captions', 'track', {}); } catch (_) {} try { p.unloadModule('captions'); } catch (_) {} try { p.unloadModule('cc'); } catch (_) {} };
  const fmtT = t => { t = Math.floor(+t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
  async function playYT(box, start) {
    if (box._player && box._player.seekTo) { if (start != null) box._player.seekTo(+start, true); box._player.playVideo(); return; }
    box.classList.add('on'); box.removeAttribute('role'); box.removeAttribute('tabindex');
    const holder = document.createElement('div'); box.innerHTML = ''; box.appendChild(holder);
    try {
      await loadYT();
      box._player = new YT.Player(holder, {
        host: 'https://www.youtube-nocookie.com', videoId: box.dataset.yt, width: '100%', height: '100%',
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3, hl: 'ko', start: start ? Math.floor(+start) : 0 },
        events: {
          onReady: e => { noCC(e.target); if (start) e.target.seekTo(+start, true); e.target.playVideo(); },
          onApiChange: e => noCC(e.target),
          onStateChange: e => { if (e.data === 1) { noCC(e.target); players.forEach(p => { if (p !== e.target && p.pauseVideo) p.pauseVideo(); }); } }
        }
      });
      players.push(box._player);
    } catch (err) {
      const f = document.createElement('iframe');
      f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      f.src = `https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0&playsinline=1&cc_load_policy=0&iv_load_policy=3${start ? '&start=' + Math.floor(+start) : ''}`;
      box.innerHTML = ''; box.appendChild(f);
    }
  }
  $$('.yt').forEach(b => {
    const go = () => { if (!b.classList.contains('on')) playYT(b); };
    b.addEventListener('click', go);
    b.addEventListener('keydown', e => { if (!b.classList.contains('on') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } });
  });
  /* 장면 바로가기: 각 묶음(data-for)이 자기 플레이어만 제어 */
  $$('[data-for]').forEach(g => {
    const box = $('#' + g.dataset.for); if (!box) return;
    const btns = $$('button[data-t]', g);
    btns.forEach(c => c.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('on')); c.classList.add('on');
      playYT(box, c.dataset.t);
      const r = box.getBoundingClientRect(); if (r.top < 60 || r.bottom > innerHeight) box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }));
  });
  /* 다큐멘터리: 재생 중인 장 표시 */
  const docBox = $('#docBox'), chapBtns = $$('#docChapters button[data-t]');
  if (docBox && chapBtns.length) setInterval(() => {
    const p = docBox._player; if (!p || !p.getCurrentTime || !p.getPlayerState || p.getPlayerState() !== 1) return;
    const t = p.getCurrentTime(); let cur = null;
    chapBtns.forEach(b => { if (t >= +b.dataset.t - 0.6) cur = b; });
    chapBtns.forEach(b => b.classList.toggle('on', b === cur));
  }, 1000);

  /* ---------- story scenes ---------- */
  const scenes = $$('.scene');
  $$('.scene .bgv').forEach(v => lazyVideo(v, () => v.dataset.src));
  const rail = $('.rail'), railLinks = rail ? $$('a', rail) : [];
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('inview'); railLinks.forEach(a => a.classList.toggle('on', a.dataset.r === e.target.id)); }
    }), { threshold: 0.45 });
    scenes.forEach(s => so.observe(s));
  } else scenes.forEach(s => s.classList.add('inview'));
  if (rail) addEventListener('scroll', () => {
    const mid = innerHeight * .5;
    rail.classList.toggle('show', scenes.some(s => { const r = s.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }));
  }, { passive: true });

  /* ---------- quiz ---------- */
  const Q = [
    { q: '1946년 6월 2일, 이리신광교회가 첫 예배를 드린 곳은 어디일까요?', o: ['신흥동 YMCA 회관', '창인동 석조 예배당', '마동 성전'], a: 0, e: '고현교회에서 분립한 성도들이 신흥동 YMCA 회관에서 첫 예배를 드렸습니다.' },
    { q: '교회가 1950년에 세운 다음 세대 기관은 무엇일까요?', o: ['새빛도서관', '신광유치원', '뉴젠스쿨'], a: 1, e: '신광유치원은 1950년 6월 5일 문을 열어 76년째 아이들을 키우고 있습니다.' },
    { q: '1977년 11월 11일, 교회당과 사택이 피해를 입은 사고는?', o: ['이리역 폭발사고', '대홍수', '화재'], a: 0, e: '이리역 폭발사고 때 본 교회당, 교육관, 목사 사택이 피해를 입었습니다.' },
    { q: '교회가 마동 새 성전에 입당한 해는?', o: ['1996년', '2008년', '2018년'], a: 1, e: '2008년 10월 5일 마동 성전 입당예배를 드렸습니다.' },
    { q: '창립 80주년을 맞은 교회의 표어는?', o: ['은혜 80년, 선교 100년', '믿음 80년, 소망 100년', '감사 80년, 축복 100년'], a: 0, e: '은혜로 걸어온 80년을 감사하며, 선교의 100년을 바라봅니다.' }
  ];
  const qz = $('#quiz');
  if (qz) {
    let qi = 0, score = 0;
    const qQ = $('#quizQ'), qO = $('#quizOpts'), qF = $('#quizFb'), qN = $('#quizNext'), qS = $('#quizStep');
    function render() {
      const it = Q[qi]; qS.textContent = `${qi + 1} / ${Q.length}`; qQ.textContent = it.q; qF.textContent = ''; qN.hidden = true;
      qO.innerHTML = it.o.map((o, i) => `<button data-i="${i}">${o}</button>`).join('');
    }
    qO.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      const it = Q[qi], i = +b.dataset.i;
      $$('button', qO).forEach((x, k) => { x.disabled = true; if (k === it.a) x.classList.add('ok'); });
      if (i === it.a) { score++; qF.textContent = '정답입니다. ' + it.e; } else { b.classList.add('no'); qF.textContent = '아쉬워요. ' + it.e; }
      qN.hidden = false; qN.textContent = qi < Q.length - 1 ? '다음 문제 →' : '결과 보기 →';
    });
    qN.addEventListener('click', () => {
      if (qi < Q.length - 1) { qi++; render(); return; }
      qS.textContent = '완료'; qQ.textContent = `${Q.length}문제 중 ${score}문제를 맞혔습니다.`;
      qO.innerHTML = ''; qF.textContent = score === Q.length ? '여든 해의 이야기를 잘 알고 있네요. 이제 다음 100년의 이야기를 함께 써 갈 차례입니다.' : '위로 올라가 80년의 이야기를 다시 읽어 보세요. 다음 100년의 이야기는 우리가 함께 써 갑니다.';
      qN.textContent = '다시 풀기'; qN.onclick = () => { qi = 0; score = 0; qN.onclick = null; render(); };
    });
    render();
  }

  /* ---------- voice dialog ---------- */
  const vd = $('#vdlg');
  const DOC_ID = docBox ? docBox.dataset.yt : 'EQgJvQBJ_qs';
  const vMedia = $('#vdlg .ph'), vImg = $('#vdlg-img'), vListen = $('#vdlg-listen'), vTime = $('#vdlg-time');
  let vPlayer = null, curVoice = null;
  function stopVoice() {
    if (vPlayer) { try { vPlayer.destroy(); } catch (_) {} const k = players.indexOf(vPlayer); if (k >= 0) players.splice(k, 1); vPlayer = null; }
    vMedia.classList.remove('playing');
    if (!vMedia.contains(vImg)) { vMedia.innerHTML = ''; vMedia.appendChild(vImg); }
  }
  vListen && vListen.addEventListener('click', async () => {
    const v = curVoice; if (!v || v.t == null) return;
    vListen.hidden = true; vMedia.classList.add('playing'); vMedia.innerHTML = '';
    const holder = document.createElement('div'); vMedia.appendChild(holder);
    vd.querySelector('.dlg').scrollTop = 0;
    try {
      await loadYT();
      vPlayer = new YT.Player(holder, {
        host: 'https://www.youtube-nocookie.com', videoId: DOC_ID, width: '100%', height: '100%',
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, cc_load_policy: 0, iv_load_policy: 3, hl: 'ko', start: Math.floor(v.t) },
        events: {
          onReady: e => { noCC(e.target); e.target.seekTo(v.t, true); e.target.playVideo(); },
          onApiChange: e => noCC(e.target),
          onStateChange: e => { if (e.data === 1) { noCC(e.target); players.forEach(p => { if (p !== e.target && p.pauseVideo) p.pauseVideo(); }); } }
        }
      });
      players.push(vPlayer);
    } catch (err) {
      const f = document.createElement('iframe');
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      f.src = `https://www.youtube-nocookie.com/embed/${DOC_ID}?autoplay=1&rel=0&playsinline=1&cc_load_policy=0&iv_load_policy=3&start=${Math.floor(v.t)}`;
      vMedia.innerHTML = ''; vMedia.appendChild(f);
    }
  });
  function openVoice(id) {
    const v = VOICES.find(x => x.id === id); if (!v) return;
    stopVoice(); curVoice = v;
    if (vListen) { vListen.hidden = v.t == null; if (v.t != null) { vTime.textContent = fmtT(v.t); vListen.setAttribute('aria-label', `${v.name} ${v.role}의 목소리를 다큐멘터리 ${fmtT(v.t)}부터 듣기`); } }
    $('#vdlg-img').src = `img/${v.img}-wide.webp?v=6`; $('#vdlg-img').alt = `${v.name} ${v.role}`;
    $('#vdlg-name').textContent = `${v.name} ${v.role}`;
    $('#vdlg-role').textContent = v.sub;
    $('#vdlg-text').innerHTML = v.long.map(p => `<p>“${p.replace(/</g, '&lt;')}”</p>`).join('');
    vd.showModal(); document.body.style.overflow = 'hidden';
    vd.querySelector('.dlg').scrollTop = 0;
  }
  grid && grid.addEventListener('click', e => { const b = e.target.closest('.vc'); if (b) openVoice(b.dataset.v); });
  vd.addEventListener('close', stopVoice);
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
