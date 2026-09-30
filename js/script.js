(() => {
  const section = document.querySelector('.hero-scroll');
  if (!section) return;
  const stage = section.querySelector('.hero');
  const foreground = stage.querySelector('.hero__foreground');
  const message = stage.querySelector('.hero__message');
  const labels = stage.querySelectorAll('.hero__title, .hero__sound, .hero__scroll-hint');
  const about = document.querySelector('.about');
  const aboutVisual = about?.querySelector('.about__visual');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const smooth = (value) => { const t = clamp(value); return t * t * (3 - 2 * t); };
  let scheduled = false;
  let needsMeasure = true;
  let sectionTop = 0;
  let stageHeight = 0;
  let travel = 1;
  let aboutTop = 0;
  let aboutTravel = 1;

  // Only update the element that consumes a value; avoid invalidating the whole hero subtree.
  function setProperty(element, name, value) {
    const next = String(value);
    if (element.style.getPropertyValue(name) !== next) element.style.setProperty(name, next);
  }

  function render() {
    scheduled = false;
    if (needsMeasure) {
      stageHeight = stage.offsetHeight;
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, section.offsetHeight - stageHeight);
      if (about) {
        aboutTop = about.getBoundingClientRect().top + window.scrollY;
        aboutTravel = Math.max(1, about.offsetHeight - stageHeight);
      }
      needsMeasure = false;
    }
    const progress = clamp((window.scrollY - sectionTop) / travel);
    const movement = smooth((progress - .03) / .78);
    const reveal = smooth((progress - .12) / .32);
    const isReduced = reducedMotion.matches;
    // Dynamic scroll values use the existing CSS hooks; layout stays in CSS.
    setProperty(foreground, '--subject-y', `${isReduced ? 0 : movement * stageHeight * .8}px`);
    setProperty(foreground, '--subject-opacity', isReduced ? (progress > .1 ? 0 : 1) : 1 - smooth((progress - .65) / .22));
    setProperty(message, '--message-opacity', isReduced ? (progress > .1 ? 1 : 0) : reveal);
    const labelOpacity = 1 - smooth(progress / .28);
    labels.forEach(label => setProperty(label, '--label-opacity', labelOpacity));
    if (aboutVisual) {
      const aboutProgress = clamp((window.scrollY - aboutTop) / aboutTravel);
      const videoProgress = smooth((aboutProgress - .12) / .58);
      setProperty(aboutVisual, '--about-video-y', `${(1 - (isReduced ? 1 : videoProgress)) * 100}%`);
    }
  }

  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(render); }
  }
  function invalidateSize() {
    needsMeasure = true;
    schedule();
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', invalidateSize);
  addEventListener('pageshow', invalidateSize);
  const resizeObserver = new ResizeObserver(invalidateSize);
  resizeObserver.observe(section);
  resizeObserver.observe(stage);
  if (about) resizeObserver.observe(about);
  reducedMotion.addEventListener('change', schedule);
  render();
})();

// Hide on downward scrolling; reveal on upward scrolling or the top hit area.
(() => {
  const nav = document.querySelector('.hero-nav');
  if (!nav) return;
  const reveal = document.querySelector('.nav-reveal');
  const toggle = document.querySelector('.nav-toggle');
  const mobileNavigation = matchMedia('(max-width: 1024px)');
  const teamprojectActions = [...document.querySelectorAll('.teamproject__actions')];
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = [...document.querySelectorAll('main > section, main > footer')];
  const items = sections.map(section => ({
    section,
    link: links.find(link => {
      const target = document.getElementById(link.hash.slice(1));
      return link.hash === '#top' ? section.classList.contains('hero-scroll')
        : target && (target === section || section.contains(target));
    }),
    top: 0
  }));
  let currentLink = null;
  let activationOffset = 0;
  let headerOffset = 0;
  let pageHeight = 0;

  function updateCurrent(y) {
    // Follow the section near the top; allow the short footer at the page end.
    const atBottom = y > 0 && y + window.innerHeight >= pageHeight - 1;
    const current = atBottom ? items[items.length - 1]
      : items.findLast(item => item.top <= y + activationOffset);
    const backgroundSection = items.findLast(item => item.top <= y + headerOffset);
    nav.classList.toggle('is-light', backgroundSection?.section.id === 'shoppingmall');
    const link = current?.link || null;
    if (link === currentLink) return;
    currentLink?.removeAttribute('aria-current');
    link?.setAttribute('aria-current', 'location');
    currentLink = link;
  }

  let hidden = false;
  let anchor = Math.max(0, scrollY);
  function updateActionOffset() {
    teamprojectActions.forEach(actions => {
      if (hidden || mobileNavigation.matches) {
        actions.style.removeProperty('--teamproject-actions-top');
        return;
      }
      actions.style.setProperty('--teamproject-actions-top', `calc(${nav.offsetTop + nav.offsetHeight}px + var(--space-normal))`);
    });
  }
  function setHidden(value) {
    hidden = value;
    if (mobileNavigation.matches) {
      nav.classList.remove('is-hidden');
      nav.inert = !nav.classList.contains('is-menu-open');
      reveal.hidden = true;
      updateActionOffset();
      return;
    }
    nav.classList.toggle('is-hidden', value);
    nav.inert = value;
    reveal.hidden = !value;
    reveal.setAttribute('aria-expanded', String(!value));
    updateActionOffset();
  }
  function measure() {
    const box = nav.getBoundingClientRect();
    items.forEach(item => { item.top = item.section.getBoundingClientRect().top + window.scrollY; });
    headerOffset = nav.offsetTop + nav.offsetHeight / 2;
    activationOffset = Math.max(nav.offsetTop + nav.offsetHeight, window.innerHeight * .25);
    pageHeight = document.documentElement.scrollHeight;
    updateCurrent(Math.max(0, window.scrollY));
    updateActionOffset();
    reveal.style.left = box.left + 'px';
    reveal.style.width = box.width + 'px';
    reveal.style.height = (nav.offsetTop + nav.offsetHeight + 10) + 'px';
  }
  function scroll() {
    const y = Math.max(0, window.scrollY);
    nav.classList.toggle('is-scrolled', y > 100);
    updateCurrent(y);
    if (mobileNavigation.matches) { setHidden(false); anchor = y; return; }
    if (y <= 30) { setHidden(false); anchor = y; return; }
    const delta = y - anchor;
    if (Math.abs(delta) < 8) return;
    if (delta < 0) setHidden(false);
    else if (!nav.contains(document.activeElement)) setHidden(true);
    anchor = y;
  }
  function setMobileMenu(open) {
    nav.classList.toggle('is-menu-open', open);
    nav.inert = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '주요 메뉴 닫기' : '주요 메뉴 열기');
  }
  function syncNavigationMode() {
    if (mobileNavigation.matches) {
      hidden = false;
      nav.classList.remove('is-hidden');
      setMobileMenu(false);
      reveal.hidden = true;
    } else {
      nav.classList.remove('is-menu-open');
      nav.inert = false;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '주요 메뉴 열기');
      setHidden(false);
    }
    measure();
  }
  reveal.addEventListener('click', () => { setHidden(false); anchor = window.scrollY; });
  reveal.addEventListener('focus', () => { setHidden(false); nav.querySelector('a')?.focus(); });
  toggle.addEventListener('click', () => {
    if (!mobileNavigation.matches) return;
    const open = !nav.classList.contains('is-menu-open');
    setMobileMenu(open);
    if (open) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    if (mobileNavigation.matches) setMobileMenu(false);
    else link.blur();
  });
  addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !mobileNavigation.matches || !nav.classList.contains('is-menu-open')) return;
    setMobileMenu(false);
    toggle.focus();
  });
  addEventListener('scroll', scroll, { passive: true });
  const observer = new ResizeObserver(measure);
  observer.observe(nav);
  sections.forEach(section => observer.observe(section));
  addEventListener('resize', measure);
  addEventListener('pageshow', measure);
  addEventListener('load', measure);
  mobileNavigation.addEventListener('change', syncNavigationMode);
  syncNavigationMode();
  scroll();
})();

// Music starts only after an explicit click; pause preserves the play position.
(() => {
  const button = document.querySelector('button.hero__sound');
  const audio = document.querySelector('#hero-jazz');
  const status = document.querySelector('.music-status');
  if (!button || !audio) return;
  const icon = button.querySelector('image');
  const errorMessage = status.querySelector('span');
  let requested = false;
  function update() {
    const playing = !audio.paused && !audio.ended;
    icon.setAttribute('href', playing ? icon.dataset.playSrc : icon.dataset.pauseSrc);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? button.dataset.pauseLabel : button.dataset.playLabel);
    button.title = playing ? button.dataset.pauseTitle : button.dataset.playTitle;
  }
  button.addEventListener('click', async () => {
    requested = !requested;
    errorMessage.hidden = true;
    if (!requested) { audio.pause(); return; }
    try { await audio.play(); }
    catch (error) {
      if (error.name === 'AbortError') return;
      requested = false;
      errorMessage.hidden = false;
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

// POPUP and POSTER galleries share the same left-to-right controls and card activation.
document.querySelectorAll('.works--popup, .works--poster').forEach(section => {
  const gallery = section.querySelector('.works__gallery');
  const slides = [...gallery.children];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const previous = section.querySelector('[data-direction="previous"]');
  const next = section.querySelector('[data-direction="next"]');
  const limit = () => Math.max(0, gallery.scrollWidth - gallery.clientWidth);
  const currentPosition = () => gallery.scrollLeft;
  const slidePosition = slide => Math.max(0, Math.min(limit(), slide.offsetLeft - slides[0].offsetLeft));
  function stops() {
    return [...new Set([0, ...slides.map(slidePosition), limit()])];
  }
  function update() {
    previous.disabled = currentPosition() <= 2;
    next.disabled = currentPosition() >= limit() - 2;
  }
  function moveTo(left) {
    gallery.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  function step(direction) {
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
    if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
    const slide = event.target.closest('.popup-card, .poster-card') ?? slides.find(card => {
      const box = card.getBoundingClientRect();
      return event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom;
    });
    if (!slide || !gallery.contains(slide)) return;
    slide.dispatchEvent(new Event('gallerycardactivate'));
  });
  gallery.addEventListener('pointerdown', event => {
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
    const moved = drag.moved;
    if (moved) suppressClickUntil = performance.now() + 400;
    drag = null;
    gallery.classList.remove('is-dragging');
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
  }
  gallery.addEventListener('pointerup', release);
  gallery.addEventListener('pointercancel', release);
  gallery.addEventListener('lostpointercapture', release);
  new ResizeObserver(update).observe(gallery);
  update();
});

// Keep dialog content and scroll locking in place until the exit motion finishes.
async function closeProjectDetail(dialog) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  dialog.classList.add('is-closing');
  await Promise.allSettled(dialog.getAnimations().map(animation => animation.finished));
  dialog.close();
  dialog.classList.remove('is-closing');
}

// One shared modal presents the details for every POPUP card.
(() => {
  const dialog = document.querySelector('#popup-detail');
  const details = [...dialog.querySelectorAll('[data-popup-detail]')];
  const triggers = [...document.querySelectorAll('.popup-card')];
  let closing = false;
  let activeTrigger = null;
  let activeCard = null;
  let restoreFocus = true;
  let previousOverflow = '';
  triggers.forEach(trigger => trigger.addEventListener('gallerycardactivate', () => {
    if (closing || dialog.open) return;
    const detail = details.find(item => item.dataset.popupDetail === trigger.dataset.project);
    if (!detail) return;
    activeTrigger = trigger.querySelector('.popup-card__more');
    activeCard = trigger;
    restoreFocus = true;
    details.forEach(item => { item.hidden = item !== detail; });
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.scrollTop = 0;
    detail.querySelector('.project-detail__copy').scrollTop = 0;
  }));
  async function closeDetail({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true;
    restoreFocus = focusTrigger;
    await closeProjectDetail(dialog);
    closing = false;
  }
  dialog.querySelector('.project-detail__close').addEventListener('click', () => closeDetail({ focusTrigger: false }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDetail(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDetail();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    details.forEach(item => { item.hidden = true; });
    if (restoreFocus) activeTrigger?.focus({ preventScroll: true });
    else activeCard?.closest('.works__gallery')?.focus({ preventScroll: true });
  });
})();

// Poster cards use the same detail treatment as the POPUP work.
(() => {
  const dialog = document.querySelector('#poster-detail');
  const details = [...dialog.querySelectorAll('[data-poster-detail]')];
  let activeCard, activeTrigger, closing = false, restoreFocus = true, previousOverflow = '';
  document.querySelectorAll('.poster-card').forEach(trigger => trigger.addEventListener('gallerycardactivate', () => {
    if (dialog.open || closing) return;
    const detail = details.find(item => item.dataset.posterDetail === trigger.dataset.poster);
    if (!detail) return;
    activeCard = trigger; activeTrigger = trigger.querySelector('.poster-card__more'); restoreFocus = true;
    details.forEach(item => { item.hidden = item !== detail; });
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); dialog.scrollTop = 0;
    detail.querySelector('.project-detail__copy').scrollTop = 0;
  }));
  async function close({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true; restoreFocus = focusTrigger;
    await closeProjectDetail(dialog); closing = false;
  }
  dialog.querySelector('.project-detail__close').addEventListener('click', () => close({ focusTrigger: false }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; details.forEach(item => { item.hidden = true; }); if (restoreFocus) activeTrigger?.focus({ preventScroll: true }); else activeCard?.closest('.works__gallery')?.focus({ preventScroll: true }); });
})();

// Banner carousel with centered, single-image snapping.
document.querySelectorAll('.works--banner').forEach(section => {
  const looping = true;
  const viewport = section.querySelector('.works__gallery');
  const slides = [...viewport.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  const detailDialog = document.querySelector('#banner-detail');
  const bannerDetails = [...detailDialog.querySelectorAll('[data-banner-detail]')];
  let index = 0, elapsed = 0, previous = 0, frame = 0;
  let visible = false, paused = reduced.matches, wrapping = false;
  let gesture = null;
  let suppressClickUntil = 0;
  const track = section.querySelector('.banner-track');
  const loopOffset = looping ? slides.length : 0;
  const cloneSlide = slide => {
    const clone = slide.cloneNode(true);
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    clone.loading = 'eager';
    return clone;
  };
  if (looping) {
    track.prepend(...slides.map(cloneSlide));
    track.append(...slides.map(cloneSlide));
  }
  const buttons = [...section.querySelectorAll('.banner-dot')];
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => { select(i); sync(); });
  });
  const toggle = section.querySelector('.banner-toggle');
  const toggleIcon = toggle.querySelector('img');
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
    const stopped = paused || atEnd();
    toggle.setAttribute('aria-label', stopped ? toggle.dataset.playLabel : toggle.dataset.pauseLabel);
    toggleIcon.src = stopped ? toggleIcon.dataset.playSrc : toggleIcon.dataset.pauseSrc;
  }
  function show(physicalIndex, animate = true) {
    const slide = track.children[physicalIndex];
    const center = (viewport.clientWidth - slide.clientWidth) / 2;
    track.style.transition = animate && !reduced.matches ? 'transform 800ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = `translate3d(${center - slide.offsetLeft}px,0,0)`;
  }
  const position = (slideIndex, animate = true) => show(loopOffset + slideIndex, animate);
  function select(next, automatic = false) {
    const loop = looping && automatic && index === slides.length - 1 && next === 0;
    const reverseLoop = looping && automatic === -1 && index === 0 && next === slides.length - 1;
    index = next;
    elapsed = atEnd() ? duration : 0;
    previous = 0;
    wrapping = (loop || reverseLoop) && !reduced.matches;
    show(wrapping ? (reverseLoop ? loopOffset - 1 : loopOffset + slides.length) : loopOffset + index);
    update();
  }
  function bannerAt(x, y) {
    const physicalIndex = [...track.children].findIndex(slide => {
      const rect = slide.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
    if (physicalIndex < 0) return null;
    const slide = track.children[physicalIndex];
    const next = Number(slide.dataset.bannerIndex);
    return Number.isInteger(next) ? { next, slide, physicalIndex } : null;
  }
  let bannerClosing = false, bannerOverflow = '';
  function openBannerDetail(target) {
    const detail = bannerDetails.find(item => item.dataset.bannerDetail === target.slide.dataset.bannerIndex);
    if (!detail || detailDialog.open) return;
    bannerDetails.forEach(item => { item.hidden = item !== detail; });
    detailDialog.setAttribute('aria-labelledby', detail.querySelector('h2').id);
    bannerOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; detailDialog.showModal(); detailDialog.scrollTop = 0; sync();
  }
  function handleBannerTap(target) {
    if (!target) return false;
    if (target.next === index) {
      openBannerDetail(target);
    } else {
      select(target.next, target.physicalIndex < index + 1 ? -1 : 1);
      sync();
    }
    return true;
  }
  async function closeBannerDetail() {
    if (bannerClosing || !detailDialog.open) return;
    bannerClosing = true;
    await closeProjectDetail(detailDialog); bannerClosing = false;
  }
  detailDialog.querySelector('.project-detail__close').addEventListener('click', closeBannerDetail);
  detailDialog.addEventListener('cancel', event => { event.preventDefault(); closeBannerDetail(); });
  detailDialog.addEventListener('click', event => { if (event.target === detailDialog) closeBannerDetail(); });
  detailDialog.addEventListener('close', () => { document.body.style.overflow = bannerOverflow; viewport.focus({ preventScroll: true }); sync(); });
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
    if (!atEnd() && !detailDialog.open) frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (visible && !paused && !document.hidden && !gesture && !atEnd() && !detailDialog.open) frame = requestAnimationFrame(tick);
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
    const threshold = Math.min(64, slides[index].clientWidth * .1);
    if (horizontal) suppressClickUntil = performance.now() + 350;
    if (!cancelled && horizontal && Math.abs(dx) >= threshold) {
      const step = dx < 0 ? 1 : -1;
      select(nextIndex(step), step);
    } else if (!cancelled && !horizontal) {
      const target = bannerAt(event.clientX, event.clientY);
      if (handleBannerTap(target)) suppressClickUntil = performance.now() + 350;
      else position(index);
    } else {
      position(index);
    }
    sync();
  }
  viewport.addEventListener('pointerup', event => finishGesture(event));
  viewport.addEventListener('pointercancel', event => finishGesture(event, true));
  viewport.addEventListener('lostpointercapture', event => finishGesture(event, true));
  // Click a partially visible neighboring banner to bring it to the center.
  viewport.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) return;
    const target = bannerAt(event.clientX, event.clientY);
    handleBannerTap(target);
  });
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

// Detail-page cards open their long-form design images in a scrollable dialog.
(() => {
  const dialog = document.querySelector('#detail-page-detail');
  const pages = [...dialog.querySelectorAll('[data-detail-image]')];
  let activeCard;
  let previousOverflow = '';
  function close() {
    if (!dialog.open) return;
    closeProjectDetail(dialog);
  }
  document.querySelectorAll('.detail-card').forEach(card => card.addEventListener('click', () => {
    const page = pages.find(item => item.dataset.detailImage === card.dataset.detailPage);
    if (!page || dialog.open) return;
    activeCard = card;
    pages.forEach(item => { item.hidden = item !== page; });
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.scrollTop = 0;
  }));
  dialog.querySelector('.project-detail__close').addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    activeCard?.focus({ preventScroll: true });
  });
})();
