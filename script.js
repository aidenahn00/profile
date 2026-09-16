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

// Disable native image ghosts and selection without blocking pointer gestures.
document.querySelectorAll('img').forEach(image => { image.draggable = false; });
document.addEventListener('dragstart', event => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

// Banner carousel: standalone local-file compatible, with a continuous loop.
(() => {
  const section = document.querySelector('.works--banner');
  if (!section) return;
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
  track.append(clone);
  const leadingClone = slides[slides.length - 1].cloneNode(true);
  leadingClone.alt = '';
  leadingClone.setAttribute('aria-hidden', 'true');
  leadingClone.loading = 'eager';
  track.prepend(leadingClone);
  viewport.append(track);
  viewport.classList.add('banner-viewport');
  viewport.setAttribute('aria-label', '배너 슬라이더');
  const controls = document.createElement('div');
  controls.className = 'banner-controls';
  const dots = document.createElement('div');
  dots.className = 'banner-dots';
  dots.setAttribute('role', 'group');
  dots.setAttribute('aria-label', '배너 선택');
  const buttons = slides.map((slide, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'banner-dot';
    button.setAttribute('aria-label', `${i + 1}번 배너: ${slide.alt}`);
    button.innerHTML = '<span class="banner-dot__rail"><span></span></span>';
    button.addEventListener('click', () => select(i));
    dots.append(button);
    return button;
  });
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'banner-toggle';
  controls.append(dots, toggle);
  viewport.after(controls);
  function update() {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-current', String(i === index));
      button.style.setProperty('--progress', i === index ? elapsed / duration : 0);
    });
    toggle.setAttribute('aria-label', paused ? '배너 자동 재생' : '배너 자동 재생 일시정지');
    toggle.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  }
  function position(physicalIndex, animate = true) {
    const slide = track.children[physicalIndex + 1];
    const center = (viewport.clientWidth - slide.clientWidth) / 2;
    track.style.transition = animate && !reduced.matches ? 'transform 800ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = `translate3d(${center - slide.offsetLeft}px,0,0)`;
  }
  function select(next, automatic = false) {
    const loop = automatic && index === slides.length - 1 && next === 0;
    const reverseLoop = automatic === -1 && index === 0 && next === slides.length - 1;
    index = next;
    elapsed = 0;
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
    if (elapsed >= duration) select((index + 1) % slides.length, true);
    buttons[index].style.setProperty('--progress', elapsed / duration);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (visible && !paused && !document.hidden && !gesture) frame = requestAnimationFrame(tick);
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
      select((index + step + slides.length) % slides.length, step);
    } else {
      position(index);
    }
    sync();
  }
  viewport.addEventListener('pointerup', event => finishGesture(event));
  viewport.addEventListener('pointercancel', event => finishGesture(event, true));
  viewport.addEventListener('lostpointercapture', event => finishGesture(event, true));
  toggle.addEventListener('click', () => { paused = !paused; update(); sync(); });
  viewport.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    select((index + (event.key === 'ArrowRight' ? 1 : slides.length - 1)) % slides.length);
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
})();
