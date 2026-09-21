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
      status.textContent = '음악을 재생할 수 없습니다. audio/jazz.mp3 파일을 확인해 주세요.';
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
  const slides = [...gallery.children];
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
    if (performance.now() < suppressClickUntil) { event.preventDefault(); return; }
    if (event.target.closest('button, a')) return;
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
    if (event.target.closest('button, a')) return;
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
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
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
  }));
  function closeDetail({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true;
    restoreFocus = focusTrigger;
    dialog.close();
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
  document.querySelectorAll('.poster-card').forEach(trigger => trigger.addEventListener('click', () => {
    if (dialog.open || closing) return;
    const detail = details.find(item => item.dataset.posterDetail === trigger.dataset.poster);
    if (!detail) return;
    activeCard = trigger; activeTrigger = trigger.querySelector('.poster-card__more'); restoreFocus = true;
    details.forEach(item => { item.hidden = item !== detail; });
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); dialog.scrollTop = 0;
  }));
  function close({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true; restoreFocus = focusTrigger;
    dialog.close(); closing = false;
  }
  dialog.querySelector('.project-detail__close').addEventListener('click', () => close({ focusTrigger: false }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; details.forEach(item => { item.hidden = true; }); if (restoreFocus) activeTrigger?.focus({ preventScroll: true }); else activeCard?.closest('.works__gallery')?.focus({ preventScroll: true }); });
})();

// Banner carousel with centered, single-image snapping.
document.querySelectorAll('.works--banner').forEach(section => {
  const label = section.classList.contains('works--popup') ? '팝업' : '배너';
  const looping = !section.classList.contains('works--popup');
  const viewport = section.querySelector('.works__gallery');
  const slides = [...viewport.querySelectorAll('img')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 5000;
  const detailDialog = document.querySelector('#banner-detail');
  const bannerProjects = [
    { title: 'Burger King Plant-Based Whopper 프로모션 배너 디자인', image: 'img/banner-burgerking.jpg', tool: 'Figma', summary: ['Burger King의 기존 브랜드 이미지를 바탕으로, 식물성 패티를 사용한 Plant-Based Whopper를 소개하는 프로모션 배너를 제작했습니다.', '제품의 신선한 이미지를 직관적으로 전달하기 위해 그린 컬러를 메인으로 사용하고, 햄버거를 화면 중심에 크게 배치해 제품 자체가 가장 먼저 눈에 들어오도록 디자인했습니다.'], process: ['Burger King의 광고와 프로모션 배너를 살펴보며 브랜드에서 사용하는 컬러와 굵은 타이포그래피를 참고했습니다. 기존 브랜드의 친근하고 캐주얼한 분위기를 유지하면서도 식물성 제품이라는 특징이 자연스럽게 드러나는 방향으로 작업했습니다.', '전체 배경에는 짙은 그린 컬러를 사용하고 중앙에는 햄버거 이미지를 크게 배치했습니다. 토마토와 양상추 등 재료의 색상이 배경과 대비되도록 하여 제품의 신선함이 잘 드러나도록 구성했습니다.', '상단의 Plant-Based Whopper 문구는 크고 굵은 서체를 사용하고, 제품 옆에는 0% BEEF를 원형 그래픽으로 강조했습니다. 제품명과 핵심 특징만 남겨 짧은 시간에도 내용을 파악할 수 있는 배너를 목표로 했습니다.'] },
    { title: 'UNIQLO 감사제 프로모션 배너 디자인', image: 'img/banner-uniqlo.jpg', tool: 'Figma', summary: ['UNIQLO의 겨울 시즌 감사제를 주제로, 시즌 분위기와 행사 정보를 함께 전달할 수 있는 프로모션 배너를 제작했습니다.', '겨울이라는 계절감을 명확하게 보여주면서도 UNIQLO의 브랜드 컬러인 레드가 자연스럽게 강조될 수 있도록 블루와 화이트를 중심으로 화면을 구성했습니다.'], process: ['UNIQLO의 시즌 프로모션과 감사제 광고를 참고하여 브랜드 특유의 단순하고 명확한 정보 전달 방식을 배너에 적용했습니다.', '배경은 눈이 쌓인 겨울 풍경과 매장을 중심으로 구성했습니다. 블루 하늘과 화이트 건물로 겨울의 차가운 분위기를 표현하고, 매장 왼쪽의 레드 오브젝트와 상단의 UNIQLO 로고가 자연스럽게 포인트가 되도록 했습니다.', '행사명인 감사제는 중앙에 크게, 상단에는 행사 성격을 설명하는 문구, 하단에는 기간을 배치했습니다. 넓은 공간과 강한 색상 대비로 브랜드와 프로모션 내용이 명확하게 전달되도록 구성했습니다.'] },
    { title: 'AIR MAX 스포츠 프로모션 배너 디자인', image: 'img/banner-nike.jpg', tool: 'Photoshop', summary: ['스포츠 브랜드의 신발 프로모션을 주제로 AIR MAX 제품과 할인 정보를 함께 보여주는 배너를 제작했습니다.', '제품 이미지와 프로모션 문구가 각각 명확하게 보이도록 화면을 좌우로 나누고, 오렌지와 베이지의 강한 색상 대비를 활용해 활동적이고 캐주얼한 분위기를 표현했습니다.'], process: ['스포츠 브랜드의 온라인 프로모션 배너를 참고하여 제품과 할인 정보가 짧은 시간 안에 전달될 수 있도록 디자인했습니다.', '화면 왼쪽에는 AIR MAX, UP TO 50% SALE과 같은 주요 정보를 큰 타이포그래피로, 오른쪽에는 운동화 이미지를 크게 배치했습니다. 텍스트와 제품 영역을 나눠 자연스럽게 시선이 이동하도록 구성했습니다.', '베이지와 오렌지 컬러의 큰 원형 그래픽과 낮은 대비의 AIR MAX 영문 그래픽으로 화면에 리듬감을 더했습니다. SHOP NOW 버튼으로 제품명에서 할인 정보, 구매 버튼으로 이어지는 순서를 만들었습니다.'] },
    { title: 'Baskin-Robbins Mint Brownie 신제품 배너 디자인', image: 'img/banner-baskinrobbins.jpg', tool: 'Figma', summary: ['Baskin-Robbins의 시즌 신제품을 가정하여 Mint Brownie라는 아이스크림을 중심으로 한 프로모션 배너를 제작했습니다.', '민트와 브라우니라는 두 가지 맛을 색상과 재료 이미지로 직접 보여주어, 별도의 긴 설명 없이도 제품의 특징을 쉽게 이해할 수 있도록 디자인했습니다.'], process: ['Baskin-Robbins의 신제품 프로모션에서 볼 수 있는 밝고 경쾌한 분위기를 참고하면서, 민트와 브라우니가 가장 잘 드러나는 방향으로 화면을 구성했습니다.', '중앙에는 민트 아이스크림과 브라우니가 섞인 제품을 크게 배치하고 주변에는 브라우니 조각과 민트 잎을 흩어지듯 배치했습니다. 실제 재료를 함께 노출해 맛을 시각적으로 전달하고 화면에 움직임을 더했습니다.', '배경에는 채도가 낮은 연한 민트 컬러를 적용하고, Mint에는 그린, Brownie에는 브라운 컬러를 사용했습니다. 제품 이미지와 제품명을 중앙에 집중시키고 충분한 여백으로 밝고 가벼운 분위기를 표현했습니다.'] }
  ];
  let index = 0, elapsed = 0, previous = 0, frame = 0;
  let visible = false, paused = reduced.matches, wrapping = false;
  let gesture = null;
  let suppressClickUntil = 0;
  const track = document.createElement('div');
  const loopOffset = looping ? slides.length : 0;
  track.className = 'banner-track';
  slides.forEach((slide, index) => {
    slide.dataset.bannerIndex = index;
    track.append(slide);
  });
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
      ? '<img src="img/icon-play.svg" alt="" aria-hidden="true">'
      : '<img src="img/icon-pause.svg" alt="" aria-hidden="true">';
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
  const bannerTitle = detailDialog.querySelector('h2');
  const bannerImage = detailDialog.querySelector('.project-detail__visual img');
  const bannerContent = detailDialog.querySelector('.project-detail__content');
  const bannerSpecs = detailDialog.querySelector('.project-detail__specs');
  function openBannerDetail(target) {
    const project = bannerProjects[target.next];
    if (!project || detailDialog.open) return;
    bannerTitle.textContent = project.title; bannerImage.src = project.image; bannerImage.alt = `${project.title} 전체 디자인`;
    const summaryHeading = document.createElement('h3'); summaryHeading.textContent = '간략한 텍스트';
    const processHeading = document.createElement('h3'); processHeading.textContent = '제작 과정';
    bannerContent.replaceChildren(summaryHeading, ...project.summary.map(text => { const p = document.createElement('p'); p.className = 'project-detail__summary'; p.textContent = text; return p; }), processHeading, ...project.process.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    bannerSpecs.replaceChildren(...['제작 규격', '크기 : 1920 × 970px', '비율 : 2 : 1', `툴 : ${project.tool}`].map((text, i) => { const el = document.createElement(i ? 'dd' : 'dt'); el.textContent = text; return el; }));
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
  function closeBannerDetail() {
    if (bannerClosing || !detailDialog.open) return;
    bannerClosing = true;
    detailDialog.close(); bannerClosing = false;
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
  const image = dialog.querySelector('.project-detail__visual img');
  const pages = {
    headset: { image: 'img/detail-headset.jpg', alt: '헤드셋 상세 페이지 디자인', height: 10000 },
    lotion: { image: 'img/detail-lotion.jpg', alt: '로션 상세 페이지 디자인', height: 10000 },
    candy: { image: 'img/detail-candy-thumb.jpg', alt: '캔디 상세 페이지 디자인', height: 1800 }
  };
  let activeCard;
  let previousOverflow = '';
  function close() {
    if (!dialog.open) return;
    dialog.close();
  }
  document.querySelectorAll('.detail-card').forEach(card => card.addEventListener('click', () => {
    const page = pages[card.dataset.detailPage];
    if (!page || dialog.open) return;
    activeCard = card;
    image.src = page.image;
    image.alt = page.alt;
    image.height = page.height;
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
