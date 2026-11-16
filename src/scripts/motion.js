/* Motion and lightbox for davidhocko.com. Runs at the end of <body>, before first paint. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const main = document.querySelector('main');
  if (!main) return;

  /* ---------- 1. Reveal on scroll ---------- */

  // Split a heading into words, each inside a mask, so the words rise into view.
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const parts = n.textContent.split(/([ \t\n\r]+)/);
          if (parts.length === 1 && !parts[0]) return;
          const frag = document.createDocumentFragment();
          parts.forEach((p) => {
            if (!p) return;
            if (/^[ \t\n\r]+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const mask = document.createElement('span');
            mask.className = 'mw';
            const inner = document.createElement('span');
            inner.textContent = p;
            inner.style.setProperty('--i', String(Math.min(i++, 14)));
            mask.appendChild(inner);
            frag.appendChild(mask);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.querySelectorAll('.mw').forEach((m) => m.setAttribute('aria-hidden', 'true'));
  }

  const targets = [];
  const add = (el, kind) => { if (el && !el.dataset.rv) { el.dataset.rv = kind; targets.push(el); } };

  if (!reduce) {
    // Headings: words rise from a mask.
    document.querySelectorAll('main h1, main .t-section, main .t-card, main .t-h3, main .next-card__title, footer .t-h3').forEach((h) => {
      splitWords(h);
      add(h, 'words');
    });
    // Images: a short fade while rising a few pixels, started just before they enter the screen.
    document.querySelectorAll('main .img-frame').forEach((f) => add(f, 'img'));
  }

  const show = (el, delay = 0) => {
    el.style.setProperty('--d', `${delay}ms`);
    el.classList.add('is-in');
    // Once revealed, hand the element back to its normal hover transitions.
    if (el.dataset.rv === 'img') {
      setTimeout(() => { el.removeAttribute('data-rv'); el.style.removeProperty('--d'); }, 1000 + delay);
    }
  };

  let io, ioImg;
  const observe = () => {
    io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          show(e.target, Math.min(n++, 6) * 80);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    // Images start appearing just before they enter the screen, so fast scrolling never meets a blank frame.
    ioImg = new IntersectionObserver(
      (entries) => {
        let n = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          ioImg.unobserve(e.target);
          show(e.target, Math.min(n++, 2) * 60);
        });
      },
      { rootMargin: '0px 0px 25% 0px', threshold: 0 }
    );
    targets.forEach((t) => {
      if (t.classList.contains('is-in')) return;
      (t.dataset.rv === 'img' ? ioImg : io).observe(t);
    });
  };


  // A cross-page view transition morphs the project image itself, so that image must be visible at once.
  const start = (viaTransition) => {
    if (viaTransition) {
      document.querySelectorAll('main .img-frame[style*="view-transition-name"]').forEach((f) => {
        f.classList.add('no-anim', 'is-in');
        f.removeAttribute('data-rv');
        requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('no-anim')));
      });
    }
    observe();
  };

  if (targets.length) {
    root.classList.add('motion');
    if ('onpagereveal' in window) {
      addEventListener('pagereveal', (e) => start(!!e.viewTransition), { once: true });
    } else {
      requestAnimationFrame(() => start(false));
    }
  }
  addEventListener('pageshow', (e) => { if (e.persisted) targets.forEach((t) => t.classList.add('is-in')); });

  /* ---------- Roll on the name (header and footer) ----------
     The whole name slides up out of a mask while an identical copy slides in from below.
     On load it rolls in once; on hover it rolls over. The text is never split, so kerning stays intact. */
  const EASE_ROLL = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const roll = (el) => {
    const text = el.textContent;
    el.textContent = '';
    const mask = document.createElement('span');
    mask.className = 'rl';
    const a = document.createElement('span');
    a.className = 'rl-a';
    a.textContent = text;
    const b = document.createElement('span');
    b.className = 'rl-b';
    b.setAttribute('aria-hidden', 'true');
    b.textContent = text;
    mask.append(a, b);
    el.appendChild(mask);
    let running = false;
    const enter = () => {
      if (reduce) return;
      a.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 900, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' });
    };
    const over = () => {
      if (running || reduce) return;
      running = true;
      a.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 650, easing: EASE_ROLL });
      const anim = b.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE_ROLL });
      anim.onfinish = () => { running = false; };
    };
    el.addEventListener('mouseenter', over);
    return enter;
  };
  const headerName = document.querySelector('header .name-display');
  if (headerName) roll(headerName)();
  const footerName = document.querySelector('footer .name-fit .name-display');
  if (footerName) {
    const enter = roll(footerName);
    if (!reduce) {
      footerName.querySelector('.rl-a').style.transform = 'translateY(100%)';
      const fio = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return;
        fio.disconnect();
        footerName.querySelector('.rl-a').style.transform = '';
        enter();
      }), { rootMargin: '0px 0px -10% 0px' });
      fio.observe(footerName);
    }
  }

  /* ---------- 2. Lightbox gallery ---------- */

  // Photos of Dávid himself (img/about/…) are not part of the gallery.
  const imgs = [...main.querySelectorAll('.img-frame img')].filter((im) => !im.closest('a') && !/\/about\//.test(im.getAttribute('src') || ''));
  if (!imgs.length) return;

  const largest = (im) => {
    const set = (im.getAttribute('srcset') || '').split(',').map((s) => s.trim().split(/\s+/));
    let best = im.currentSrc || im.src, bw = 0;
    set.forEach(([u, w]) => { const n = parseInt(w, 10); if (n > bw) { bw = n; best = u; } });
    return best;
  };
  const captionOf = (im) => {
    const fig = im.closest('figure');
    const cap = fig && fig.querySelector(':scope > figcaption');
    if (cap && fig.querySelectorAll('img').length === 1) return cap.textContent.trim();
    return im.alt;
  };

  const svg = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Galéria obrázkov');
  lb.hidden = true;
  lb.innerHTML = `
    <div class="lb-bg"></div>
    <img class="lb-img" alt="" draggable="false">
    <div class="lb-bar"><span class="lb-count"></span><p class="lb-cap"></p></div>
    <button type="button" class="lb-btn lb-close" aria-label="Zavrieť">${svg('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
    <button type="button" class="lb-btn lb-prev" aria-label="Predchádzajúci obrázok">${svg('<path d="M19 12H5M11 6l-6 6 6 6"/>')}</button>
    <button type="button" class="lb-btn lb-next" aria-label="Ďalší obrázok">${svg('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>`;
  document.body.appendChild(lb);
  const big = lb.querySelector('.lb-img');
  const count = lb.querySelector('.lb-count');
  const cap = lb.querySelector('.lb-cap');
  const btnPrev = lb.querySelector('.lb-prev');
  const btnNext = lb.querySelector('.lb-next');
  const btnClose = lb.querySelector('.lb-close');
  if (imgs.length < 2) { btnPrev.hidden = true; btnNext.hidden = true; }

  let idx = 0, opener = null, busy = false;
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // Where the picture sits when open: as large as possible, never cropped.
  const fitRect = (im) => {
    const vw = innerWidth, vh = innerHeight, small = vw < 760;
    const padX = small ? 12 : 96, padTop = small ? 64 : 56, padBottom = small ? 96 : 88;
    const r = (im.naturalWidth || im.width) / (im.naturalHeight || im.height) || 1.6;
    let w = vw - padX * 2, h = w / r;
    if (h > vh - padTop - padBottom) { h = vh - padTop - padBottom; w = h * r; }
    return { left: (vw - w) / 2, top: padTop + (vh - padTop - padBottom - h) / 2, width: w, height: h };
  };
  const place = (rect) => Object.assign(big.style, {
    left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`,
  });
  const fromThumb = (thumb, rect) => {
    const t = thumb.getBoundingClientRect();
    return `translate(${t.left - rect.left}px, ${t.top - rect.top}px) scale(${t.width / rect.width}, ${t.height / rect.height})`;
  };
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

  const fill = (i) => {
    const im = imgs[i];
    count.textContent = `${i + 1} / ${imgs.length}`;
    cap.textContent = captionOf(im);
    big.alt = im.alt;
    big.src = im.currentSrc || im.src;
    const hi = largest(im);
    if (hi !== big.src) { const pre = new Image(); pre.onload = () => { if (idx === i) big.src = hi; }; pre.src = hi; }
    [i - 1, i + 1].forEach((j) => { const n = imgs[(j + imgs.length) % imgs.length]; if (n) new Image().src = largest(n); });
    place(fitRect(im));
  };

  const open = (i) => {
    idx = i; opener = document.activeElement;
    fill(i);
    lb.hidden = false;
    root.classList.add('lb-open');
    const thumb = imgs[i].parentElement;
    if (!reduce) {
      big.animate([{ transform: fromThumb(thumb, fitRect(imgs[i])) }, { transform: 'none' }], { duration: 650, easing: EASE });
    }
    lb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 120 : 300, easing: 'ease-out', fill: 'both' });
    thumb.style.visibility = 'hidden';
    btnClose.focus({ preventScroll: true });
  };

  const close = () => {
    if (lb.hidden || busy) return;
    busy = true;
    const thumb = imgs[idx].parentElement;
    if (!thumb.style.visibility) thumb.style.visibility = 'hidden';
    const done = () => {
      lb.hidden = true; busy = false;
      root.classList.remove('lb-open');
      imgs.forEach((im) => (im.parentElement.style.visibility = ''));
      big.style.transform = '';
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    };
    const fade = lb.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 120 : 380, easing: 'ease-in', fill: 'both' });
    if (!reduce && inView(thumb)) {
      lb.querySelector('.lb-bg').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'both' });
      fade.cancel();
      lb.querySelectorAll('.lb-bar, .lb-btn').forEach((b) => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'both' }));
      const a = big.animate([{ transform: 'none' }, { transform: fromThumb(thumb, fitRect(imgs[idx])) }], { duration: 550, easing: EASE, fill: 'both' });
      a.onfinish = () => { done(); a.cancel(); lb.getAnimations({ subtree: true }).forEach((x) => x.cancel()); };
    } else {
      fade.onfinish = () => { done(); fade.cancel(); };
    }
  };

  const go = (dir) => {
    if (busy || imgs.length < 2) return;
    busy = true;
    const prevThumb = imgs[idx].parentElement;
    const d = reduce ? 0 : 48 * dir;
    const out = big.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-d}px)` }], { duration: reduce ? 90 : 220, easing: 'ease-in', fill: 'both' });
    out.onfinish = () => {
      prevThumb.style.visibility = '';
      idx = (idx + dir + imgs.length) % imgs.length;
      imgs[idx].parentElement.style.visibility = 'hidden';
      fill(idx);
      out.cancel();
      big.animate([{ opacity: 0, transform: `translateX(${d}px)` }, { opacity: 1, transform: 'none' }], { duration: reduce ? 120 : 520, easing: EASE });
      busy = false;
    };
  };

  imgs.forEach((im, i) => {
    const f = im.parentElement;
    f.classList.add('lb-trigger');
    f.tabIndex = 0;
    f.setAttribute('role', 'button');
    f.setAttribute('aria-label', `Zväčšiť obrázok: ${im.alt}`);
    f.addEventListener('click', () => open(i));
    f.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => go(-1));
  btnNext.addEventListener('click', () => go(1));
  lb.querySelector('.lb-bg').addEventListener('click', close);
  big.addEventListener('click', () => { if (swiped) return; imgs.length > 1 ? go(1) : close(); });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      const f = [...lb.querySelectorAll('button:not([hidden])')];
      const k = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  addEventListener('resize', () => { if (!lb.hidden) place(fitRect(imgs[idx])); });

  // Swipe left/right to browse, down to close.
  let sx = 0, sy = 0, tracking = false, swiped = false;
  lb.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') return; tracking = true; sx = e.clientX; sy = e.clientY; });
  lb.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? 1 : -1); }
    else if (dy > 80) { swiped = true; close(); }
    setTimeout(() => (swiped = false), 400);
  });
  lb.addEventListener('pointercancel', () => (tracking = false));
})();
