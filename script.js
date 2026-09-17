(() => {
  const section = document.querySelector('.hero-scroll');
  const stage = section.querySelector('.hero');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let scheduled = false;

  function render() {
    scheduled = false;
    const travel = section.offsetHeight - stage.offsetHeight;
    const progress = clamp(-section.getBoundingClientRect().top / Math.max(1, travel));
    const movement = smooth((progress - .03) / .78);
    const reveal = smooth((progress - .12) / .32);
    const isReduced = reducedMotion.matches;
    stage.style.setProperty('--subject-y', `${isReduced ? 0 : movement * stage.offsetHeight * .8}px`);
    stage.style.setProperty('--subject-opacity', isReduced ? (progress > .1 ? 0 : 1) : 1 - smooth((progress - .65) / .22));
    stage.style.setProperty('--message-opacity', isReduced ? (progress > .1 ? 1 : 0) : reveal);
    stage.style.setProperty('--label-opacity', 1 - smooth(progress / .28));
  }

  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(render); }
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('pageshow', schedule);
  reducedMotion.addEventListener('change', schedule);
  render();
})();

// Hide on downward scrolling; reveal on upward scrolling or the top hit area.
(() => {
  const nav = document.querySelector('.hero-nav');
  if (!nav) return;
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'nav-reveal';
  reveal.setAttribute('aria-label', '상단 메뉴 나타내기');
  nav.id = 'main-navigation';
  reveal.setAttribute('aria-controls', nav.id);
  nav.after(reveal);
  let hidden = false;
  let anchor = Math.max(0, scrollY);
  function setHidden(value) {
    hidden = value;
    nav.classList.toggle('is-hidden', value);
    nav.inert = value;
    reveal.hidden = !value;
    reveal.setAttribute('aria-expanded', String(!value));
  }
  function measure() {
    const box = nav.getBoundingClientRect();
    reveal.style.left = box.left + 'px';
    reveal.style.width = box.width + 'px';
    reveal.style.height = (nav.offsetTop + nav.offsetHeight + 10) + 'px';
  }
  function scroll() {
    const y = Math.max(0, window.scrollY);
    nav.classList.toggle('is-scrolled', y > 100);
    if (y <= 30) { setHidden(false); anchor = y; return; }
    const delta = y - anchor;
    if (Math.abs(delta) < 8) return;
    if (delta < 0) setHidden(false);
    else if (!nav.contains(document.activeElement)) setHidden(true);
    anchor = y;
  }
  reveal.addEventListener('click', () => { setHidden(false); anchor = window.scrollY; });
  reveal.addEventListener('focus', () => { setHidden(false); nav.querySelector('a')?.focus(); });
  nav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (link) link.blur();
  });
  addEventListener('scroll', scroll, { passive: true });
  new ResizeObserver(measure).observe(nav);
  addEventListener('resize', measure);
  setHidden(false);
  measure();
  scroll();
})();

// Music starts only after an explicit click; pause preserves the play position.
(() => {
  const button = document.querySelector('button.hero__sound');
  const audio = document.querySelector('#hero-jazz');
  const status = document.querySelector('.music-status');
  if (!button || !audio) return;
  let requested = false;
  function update() {
    const playing = !audio.paused;
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? '재즈 음악 일시정지' : '재즈 음악 재생');
    button.title = playing ? '음악 일시정지' : '재즈 음악 재생';
  }
  button.addEventListener('click', async () => {
    requested = !requested;
    status.textContent = '';
    if (!requested) { audio.pause(); return; }
    try { await audio.play(); }
    catch (error) {
      if (error.name === 'AbortError') return;
      requested = false;
      status.textContent = '음악을 재생할 수 없습니다. assets/jazz.mp3 파일을 확인해 주세요.';
      update();
    }
  });
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  update();
})();

// Muted looping introduction; hovering does not interrupt playback.
(() => {
  const video = document.querySelector('.about__video');
  if (!video) return;
  let focused = false;
  function syncVideo() {
    if (focused || document.hidden) video.pause();
    else video.play().catch(() => {
      // Expose native controls if the browser refuses automatic playback.
      video.controls = true;
    });
  }
  video.muted = true;
  video.addEventListener('focus', () => { focused = true; syncVideo(); });
  video.addEventListener('blur', () => { focused = false; syncVideo(); });
  document.addEventListener('visibilitychange', syncVideo);
  syncVideo();
})();

// Disable native image ghosts and selection without blocking pointer gestures.
document.querySelectorAll('img').forEach(image => { image.draggable = false; });
document.addEventListener('dragstart', event => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

// Manual galleries: popup reads left-to-right, poster reads right-to-left.
document.querySelectorAll('.works--popup, .works--poster').forEach(section => {
  const reverse = section.classList.contains('works--poster');
  const label = reverse ? '포스터' : '팝업';
  const gallery = section.querySelector('.works__gallery');
  const slides = [...gallery.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = document.createElement('div');
  controls.className = 'popup-controls';
  const previous = document.createElement('button');
  const next = document.createElement('button');
  [previous, next].forEach((button, i) => {
    button.type = 'button';
    button.className = 'popup-arrow';
    button.setAttribute('aria-label', (i ? '오른쪽 ' : '왼쪽 ') + label + ' 보기');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      (i ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7') + '"/></svg>';
    controls.append(button);
  });
  gallery.after(controls);
  gallery.classList.add('popup-gallery');
  const limit = () => Math.max(0, gallery.scrollWidth - gallery.clientWidth);
  const currentPosition = () => reverse ? -gallery.scrollLeft : gallery.scrollLeft;
  const slidePosition = slide => Math.max(0, Math.min(limit(),
    reverse ? slides[0].offsetLeft - slide.offsetLeft : slide.offsetLeft - slides[0].offsetLeft));
  function stops() {
    return [...new Set([0, ...slides.map(slidePosition), limit()])];
  }
  function update() {
    previous.disabled = reverse ? currentPosition() >= limit() - 2 : currentPosition() <= 2;
    next.disabled = reverse ? currentPosition() <= 2 : currentPosition() >= limit() - 2;
  }
  function moveTo(left) {
    gallery.scrollTo({ left: reverse ? -left : left, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function step(direction) {
    if (reverse) direction *= -1;
    const points = stops();
    const current = currentPosition();
    moveTo(direction > 0 ? (points.find(p => p > current + 2) ?? limit())
      : (points.reverse().find(p => p < current - 2) ?? 0));
  }
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  gallery.addEventListener('scroll', update, { passive: true });
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  });
  let drag = null;
  let suppressClickUntil = 0;
  gallery.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) return;
    // Pointer capture can retarget a click to the gallery, so hit-test images.
    const slide = slides.find(image => {
      const box = image.getBoundingClientRect();
      return event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom;
    });
    if (!slide) return;
    const box = slide.getBoundingClientRect();
    const bounds = gallery.getBoundingClientRect();
    if (box.left >= bounds.left - 2 && box.right <= bounds.right + 2) return;
    moveTo(slidePosition(slide));
  });
  gallery.addEventListener('pointerdown', event => {
    // Touch uses native horizontal scrolling and snapping.
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, left: gallery.scrollLeft, moved: false };
    gallery.setPointerCapture(event.pointerId);
    gallery.classList.add('is-dragging');
  });
  gallery.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (Math.abs(event.clientX - drag.x) > 6) drag.moved = true;
    gallery.scrollLeft = drag.left + drag.x - event.clientX;
  });
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const current = currentPosition();
    const moved = drag.moved;
    if (moved) suppressClickUntil = performance.now() + 400;
    drag = null;
    gallery.classList.remove('is-dragging');
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    if (moved) moveTo(stops().reduce((best, p) => Math.abs(p - current) < Math.abs(best - current) ? p : best, 0));
  }
  gallery.addEventListener('pointerup', release);
  gallery.addEventListener('pointercancel', release);
  gallery.addEventListener('lostpointercapture', release);
  new ResizeObserver(update).observe(gallery);
  update();
});

// Banner carousel with centered, single-image snapping.
document.querySelectorAll('.works--banner').forEach(section => {
  const label = section.classList.contains('works--popup') ? '팝업' : '배너';
  const looping = !section.classList.contains('works--popup');
  const viewport = section.querySelector('.works__gallery');
  const slides = [...viewport.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  let index = 0, elapsed = 0, previous = 0, frame = 0;
  let visible = false, paused = reduced.matches, wrapping = false;
  let gesture = null;
  const track = document.createElement('div');
  track.className = 'banner-track';
  slides.forEach(slide => track.append(slide));
  const clone = slides[0].cloneNode(true);
  clone.alt = '';
  clone.setAttribute('aria-hidden', 'true');
  clone.loading = 'eager';
  if (looping) track.append(clone);
  const leadingClone = slides[slides.length - 1].cloneNode(true);
  leadingClone.alt = '';
  leadingClone.setAttribute('aria-hidden', 'true');
  leadingClone.loading = 'eager';
  if (looping) track.prepend(leadingClone);
  viewport.append(track);
  viewport.classList.add('banner-viewport');
  viewport.setAttribute('aria-label', label + ' 슬라이더');
  const controls = document.createElement('div');
  controls.className = 'banner-controls';
  const dots = document.createElement('div');
  dots.className = 'banner-dots';
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', label + ' 선택');
  const buttons = slides.map((slide, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'banner-dot';
    button.setAttribute('aria-label', `${i + 1}번 ${label}: ${slide.alt}`);
    button.innerHTML = '<span class="banner-dot__rail"><span></span></span>';
    button.addEventListener('click', () => { select(i); sync(); });
    dots.append(button);
    return button;
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'banner-toggle';
  controls.append(dots, toggle);
  viewport.after(controls);
  const atEnd = () => !looping && index === slides.length - 1;
  const nextIndex = step => looping
    ? (index + step + slides.length) % slides.length
    : Math.max(0, Math.min(slides.length - 1, index + step));
  function update() {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-current', String(i === index));
      button.style.setProperty('--progress', i === index ? elapsed / duration : 0);
    });
    toggle.disabled = atEnd();
    toggle.setAttribute('aria-label', atEnd() ? '마지막 팝업입니다. 이전 팝업을 선택하면 다시 재생할 수 있습니다.' : label + (paused ? ' 자동 재생' : ' 자동 재생 일시정지'));
    toggle.innerHTML = paused || atEnd()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  }
  function position(physicalIndex, animate = true) {
    const slide = track.children[physicalIndex + (looping ? 1 : 0)];
    const center = (viewport.clientWidth - slide.clientWidth) / 2;
    track.style.transition = animate && !reduced.matches ? 'transform 800ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = `translate3d(${center - slide.offsetLeft}px,0,0)`;
  }
  function select(next, automatic = false) {
    const loop = looping && automatic && index === slides.length - 1 && next === 0;
    const reverseLoop = looping && automatic === -1 && index === 0 && next === slides.length - 1;
    index = next;
    elapsed = atEnd() ? duration : 0;
    previous = 0;
    wrapping = (loop || reverseLoop) && !reduced.matches;
    position(wrapping ? (reverseLoop ? -1 : slides.length) : index);
    update();
  }
  track.addEventListener('transitionend', event => {
    if (event.propertyName === 'transform' && wrapping) {
      wrapping = false;
      position(index, false);
    }
  });
  function tick(now) {
    if (previous) elapsed += now - previous;
    previous = now;
    if (elapsed >= duration) select(nextIndex(1), true);
    buttons[index].style.setProperty('--progress', elapsed / duration);
    if (!atEnd()) frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (visible && !paused && !document.hidden && !gesture && !atEnd()) frame = requestAnimationFrame(tick);
  }
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    if (wrapping) { wrapping = false; position(index, false); }
    const transform = getComputedStyle(track).transform;
    const base = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, base, horizontal: false };
    track.style.transition = 'none';
    track.style.transform = `translate3d(${base}px,0,0)`;
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
    sync();
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.horizontal && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
      finishGesture(event, true);
      return;
    }
    if (Math.abs(dx) > 8) gesture.horizontal = true;
    if (!gesture.horizontal) return;
    gesture.dx = Math.max(-slides[index].clientWidth, Math.min(slides[index].clientWidth, dx));
    if (!looping && ((index === 0 && gesture.dx > 0) || (atEnd() && gesture.dx < 0))) gesture.dx = 0;
    track.style.transform = `translate3d(${gesture.base + gesture.dx}px,0,0)`;
  });
  function finishGesture(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const { id, dx, horizontal } = gesture;
    gesture = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    const threshold = Math.min(90, slides[index].clientWidth * .15);
    if (!cancelled && horizontal && Math.abs(dx) >= threshold) {
      const step = dx < 0 ? 1 : -1;
      select(nextIndex(step), step);
    } else {
      position(index);
    }
    sync();
  }
  viewport.addEventListener('pointerup', event => finishGesture(event));
  viewport.addEventListener('pointercancel', event => finishGesture(event, true));
  viewport.addEventListener('lostpointercapture', event => finishGesture(event, true));
  // A horizontal wheel/trackpad gesture advances one image, not a free scroll.
  let wheelTotal = 0, lastWheel = 0, wheelLockedUntil = 0;
  viewport.addEventListener('wheel', event => {
    const horizontal = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
    if (!horizontal || (!event.shiftKey && Math.abs(event.deltaY) > Math.abs(horizontal))) return;
    event.preventDefault();
    const now = performance.now();
    if (gesture || now < wheelLockedUntil) { lastWheel = now; return; }
    if (now - lastWheel > 180 || Math.sign(wheelTotal) !== Math.sign(horizontal)) wheelTotal = 0;
    lastWheel = now;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
    wheelTotal += horizontal * unit;
    if (Math.abs(wheelTotal) < 35) return;
    const step = wheelTotal > 0 ? 1 : -1;
    select(nextIndex(step), step);
    sync();
    wheelTotal = 0;
    wheelLockedUntil = now + 900;
  }, { passive: false });
  toggle.addEventListener('click', () => { paused = !paused; update(); sync(); });
  viewport.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    select(nextIndex(event.key === 'ArrowRight' ? 1 : -1));
    sync();
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .45;
    sync();
  }, { threshold: [0, .45] }).observe(viewport);
  new ResizeObserver(() => { wrapping = false; position(index, false); }).observe(viewport);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => { paused = reduced.matches; update(); sync(); });
  update();
  position(0, false);
});
