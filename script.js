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
  const title = dialog.querySelector('.project-detail__copy h2');
  const visual = dialog.querySelector('.project-detail__visual img');
  const content = dialog.querySelector('.project-detail__content');
  const specs = dialog.querySelector('.project-detail__specs');
  const projects = {
    twosome: {
      title: '투썸플레이스 신메뉴 출시 팝업 디자인', image: 'assets/img/popup-twosome.jpg',
      paragraphs: [
        '실제 브랜드인 투썸플레이스를 분석하고, 신메뉴 출시를 홍보하는 팝업을 디자인했습니다.',
        '먼저, 투썸플레이스의 브랜드 아이덴티티 및 디자인 스타일을 실제 가까운 지점의 포스터와 투썸플레이스 홈페이지 이벤트 페이지를 통해 조사했습니다.',
        '그런 다음 AI를 이용해 가상의 투썸 메뉴를 텍스트 형태로 뽑았습니다.',
        '이후 Pinterest에서 관련 디저트 키워드로 메뉴 레퍼런스 이미지를 찾고, 이를 참고해 가상의 메뉴 이미지를 제작했습니다.',
        '시각적 계층 구조를 고려하여 배치와 타이포그래피 간의 위계를 만들고 높은 가독성을 유지했습니다.',
        '팝업 디자인인 만큼 사용자의 행동을 유도하는 CTA 버튼을 배경에 어우러지면서도 눈에 띄는 컬러로 배치해 목적이 명확하게 전달되도록 구성했습니다.',
        '주요 디자인 포인트는 선반 위에 올라간 케이크에 중점을 두면서도 텍스트 자체의 포인트가 들어가게 하여 전반적으로 고급스럽고 심플한 느낌을 냈습니다.',
        '전체 제작 시간은 약 1시간입니다.'
      ]
    },
    nike: {
      title: '나이키 시즌 세일 팝업 디자인', image: 'assets/img/popup-nike.jpg',
      paragraphs: [
        '나이키 브랜드를 분석하고, 시즌 할인 이벤트를 홍보하는 팝업을 디자인했습니다.',
        '먼저, 나이키의 브랜드 아이덴티티 및 디자인 스타일을 조사했습니다. 나이키 브랜드 아이덴티티는 JUST DO IT이라는 문구에서 나오는 강렬한 스포츠성이라고 생각했습니다.',
        '브랜드 아이덴티티를 유지하면서 세일 분위기를 표현하기 위해 문구에 어울리는 나이키 폰트를 찾는 데에서 출발했으며, 나이키의 할인 이벤트 및 프로모션 사례는 나이키 공식 페이지를 통해 조사했습니다.',
        '이후 Pinterest에서 관련 이미지를 찾았습니다. 달리는 인물을 중심 이미지로 활용하려고 하다가, 프로모션 페이지인 만큼 인물보다 신발 오브젝트에 초점을 맞추는 것이 할인 이벤트를 직관적으로 홍보한다고 판단하여 강렬한 녹색의 러닝화 이미지를 중심에 배치했습니다.',
        '팝업 상에서는 할인 정보가 가장 먼저 보이도록 하이어라키(시각적 위계)를 구성하는 데에 초점을 맞췄으며, 강한 시각적 대비를 위해 세일을 강조하는 폰트를 키우고 자간과 행간을 조정했습니다.'
      ]
    },
    oliveyoung: {
      title: '올리브영 뷰티 아이템 할인 이벤트 팝업 디자인', image: 'assets/img/popup-oliveyoung.jpg',
      paragraphs: [
        '실제 브랜드인 올리브영을 분석하고, 뷰티 제품 할인 이벤트를 홍보하는 팝업을 디자인하여 포트폴리오 프로젝트를 제작했습니다.',
        '올리브영 홈페이지와 Pinterest에서 각종 프로모션 레퍼런스를 수집했습니다. 명확한 브랜드 아이덴티티가 존재하지 않아 MIMZ와 콜라보한 팝업을 벤치마킹하여 디자인했습니다.',
        '할인 혜택이 가장 먼저 보이도록 구성했으며, 뷰티 브랜드 특유의 깔끔하고 세련된 분위기를 표현하기 위해 라이트하고 가벼운 느낌을 구현했습니다.'
      ]
    },
    netflix: {
      title: '넷플릭스 신규 콘텐츠 공개 팝업 디자인', image: 'assets/img/popup-netflix.jpg',
      paragraphs: [
        '실제 브랜드인 넷플릭스를 분석하고, 신규 영화 또는 드라마 공개를 홍보하는 팝업을 디자인하여 포트폴리오 프로젝트를 제작했습니다.',
        '넷플릭스의 브랜드 아이덴티티 및 디자인 스타일을 실제 넷플릭스 팝업 디자인 서너 개를 분석하며 조사했습니다. 로고와 타이포그래피를 참고해 적절한 간격을 배치하고, 전반적인 이미지 대비를 조정해 강렬한 느낌을 강조했습니다.',
        '콘텐츠 이미지가 가장 돋보이도록 구성했으며, 넷플릭스 브랜드 컬러를 적절히 활용하여 영화 및 드라마 포스터와 같은 몰입감 있는 분위기를 표현했습니다.'
      ]
    }
  };
  const specification = ['제작 규격', '크기 : 500 × 750px', '비율 : 2 : 3', '툴 : Photoshop', '제작 시간 : 1시간'];
  const triggers = [...document.querySelectorAll('.popup-card__more')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let opening = false;
  let closing = false;
  let detailAnimation = null;
  let activeTrigger = null;
  let activeCard = null;
  let restoreFocus = true;
  const cardFrames = [
    { transform: 'perspective(1200px) rotateY(0deg)', opacity: 1 },
    { transform: 'perspective(1200px) rotateY(-82deg) scale(.96)', opacity: .15 }
  ];
  const fullDetail = { transform: 'perspective(1400px) translate(0, 0) rotateY(0deg) scale(1)', opacity: 1 };
  function foldedDetail() {
    const origin = activeCard.getBoundingClientRect();
    const destination = dialog.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - destination.left - destination.width / 2;
    const y = origin.top + origin.height / 2 - destination.top - destination.height / 2;
    return { transform: `perspective(1400px) translate(${x}px, ${y}px) rotateY(82deg) scale(${origin.width / destination.width}, ${origin.height / destination.height})`, opacity: .15 };
  }
  function renderProject(project) {
    title.textContent = project.title;
    visual.src = project.image;
    visual.alt = `${project.title} 전체 디자인`;
    const summaryHeading = document.createElement('h3');
    summaryHeading.textContent = '간략한 텍스트';
    const summary = document.createElement('p');
    summary.className = 'project-detail__summary';
    summary.textContent = project.paragraphs[0];
    const processHeading = document.createElement('h3');
    processHeading.textContent = '제작 과정';
    const paragraphs = project.paragraphs.slice(1).map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    });
    content.replaceChildren(summaryHeading, summary, processHeading, ...paragraphs);
    specs.replaceChildren(...specification.map((text, index) => {
      const element = document.createElement(index ? 'dd' : 'dt');
      element.textContent = text;
      return element;
    }));
  }
  let previousOverflow = '';
  triggers.forEach(trigger => trigger.addEventListener('click', () => {
    if (opening || closing || dialog.open) return;
    const project = projects[trigger.closest('.popup-card').dataset.project];
    if (!project) return;
    opening = true;
    activeTrigger = trigger;
    activeCard = trigger.closest('.popup-card');
    restoreFocus = true;
    renderProject(project);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.scrollTop = 0;
    if (!reduced.matches) {
      const cardAnimation = activeCard.animate(cardFrames, { duration: 720, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
      cardAnimation.finished.finally(() => cardAnimation.cancel());
      detailAnimation = dialog.animate([foldedDetail(), fullDetail], { duration: 720, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
    }
    opening = false;
  }));
  async function closeDetail({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true;
    restoreFocus = focusTrigger;
    if (!reduced.matches) {
      dialog.classList.add('is-closing');
      if (detailAnimation) {
        detailAnimation.reverse();
        await detailAnimation.finished.catch(() => {});
      } else {
        detailAnimation = dialog.animate([fullDetail, foldedDetail()], { duration: 720, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' });
        await detailAnimation.finished.catch(() => {});
      }
      dialog.close();
    } else dialog.close();
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
    detailAnimation?.cancel();
    detailAnimation = null;
    dialog.classList.remove('is-closing');
    document.body.style.overflow = previousOverflow;
    if (restoreFocus) activeTrigger?.focus({ preventScroll: true });
    else activeCard?.closest('.works__gallery')?.focus({ preventScroll: true });
  });
})();

// Poster cards use the same detail treatment as the POPUP work.
(() => {
  const dialog = document.querySelector('#poster-detail');
  const title = dialog.querySelector('h2');
  const image = dialog.querySelector('.project-detail__visual img');
  const content = dialog.querySelector('.project-detail__content');
  const specs = dialog.querySelector('.project-detail__specs');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const projects = {
    mac: { title: 'MAC 러스터글라스 립스틱 신제품 광고 포스터 디자인', image: 'assets/img/poster-maclipstick.jpg', paragraphs: [
      '실제 코스메틱 브랜드 MAC을 기반으로, 러스터글라스 립스틱 신제품을 홍보하는 광고 포스터를 디자인하여 포트폴리오 프로젝트를 제작했습니다. 립스틱의 선명한 레드 컬러와 촉촉한 광택감을 핵심 비주얼로 표현하고, MAC 특유의 시크하고 강렬한 브랜드 이미지를 강조했습니다.',
      'MAC의 브랜드 아이덴티티와 기존 코스메틱 광고 디자인을 분석하고, 러스터글라스 립스틱의 특징인 수분감과 투명한 글로우 컬러가 효과적으로 전달될 수 있도록 전체적인 콘셉트를 구성했습니다.',
      '제품이 가장 먼저 시선에 들어오도록 여러 형태의 립 제품을 중앙 하단에 배치하고, 레드 계열의 단색 배경과 입체적인 기하학 구조물을 활용해 제품에 자연스럽게 시선이 집중되도록 디자인했습니다.',
      '배경과 오브젝트에는 서로 다른 명도와 질감의 레드 컬러를 적용하여 깊이감을 표현했습니다. 블랙과 실버 컬러의 제품 패키지가 강한 대비를 이루도록 구성해 MAC 특유의 세련되고 시크한 분위기를 강조했습니다.',
      '상단에는 영문 제품명을 크게 배치하고 제품 이미지와 충분한 여백을 두어 정보의 위계를 명확하게 구성했습니다. 또한 “즉각적으로 녹아드는 수분감과 투명한 글로우 컬러”라는 핵심 메시지를 함께 배치해 제품의 특징을 짧고 직관적으로 전달했습니다.'
    ] },
    iphone: { title: 'iPhone Fold 신제품 출시 포스터 디자인', image: 'assets/img/poster-iphonefold.jpg', paragraphs: [
      '실제 전자제품 브랜드인 Apple의 디자인 아이덴티티를 바탕으로, 가상의 신제품 iPhone Fold 출시를 홍보하는 포스터를 디자인하여 포트폴리오 프로젝트를 제작했습니다. 폴더블 스마트폰의 형태적 특징과 와이드 스크린의 사용성을 직관적으로 보여주는 동시에 Apple 특유의 미니멀하고 정돈된 브랜드 이미지를 표현하는 데 중점을 두었습니다.',
      'Apple의 제품 광고와 디자인 스타일을 분석하고, 불필요한 장식 요소를 최소화하면서 제품 자체가 중심이 되는 미니멀한 테크 광고 콘셉트로 구성했습니다. 제품 중심의 레이아웃, 기능 정보의 시각화, 미니멀한 테크 무드를 포스터 전반에 반영했습니다.',
      '중앙에는 접힌 상태의 iPhone Fold를 크게 배치하여 폴더블 구조와 전면·후면 디자인을 한눈에 확인할 수 있도록 했습니다. 전체적인 블루 컬러와 제품 색상을 통일하여 차분하면서도 미래지향적인 분위기를 표현했습니다.',
      '상단에는 “새로운 세상을 펼치다”라는 메인 카피와 제품명을 큰 타이포그래피로 배치했습니다. 하단에는 “4:3 비율의 압도적 와이드 스크린”이라는 기능 메시지를 강조해 폴더블 디스플레이의 특징이 짧고 명확하게 전달되도록 구성했습니다.',
      '배경에는 제품명과 연결되는 대형 FOLD 타이포그래피를 낮은 대비로 배치해 화면에 깊이감을 더했습니다. 충분한 여백과 중앙 정렬로 정보 위계를 구분하고 Apple의 절제된 디자인 언어와 신제품의 기술적인 이미지를 함께 표현했습니다.'
    ] },
    adidas: { title: 'adidas Adione 운동화 캠페인 포스터 디자인', image: 'assets/img/poster-adidas.jpg', paragraphs: [
      '실제 스포츠 브랜드 adidas의 브랜드 아이덴티티를 분석하고, 가상의 신제품 운동화 Adione을 중심으로 한 캠페인 포스터를 디자인하여 포트폴리오 프로젝트를 제작했습니다. 특수 방수 처리와 기능성 에어리즘 소재라는 제품의 기능적 특징을 전달하면서 운동화의 속도감과 역동적인 이미지를 강하게 표현했습니다.',
      'adidas의 기존 스포츠 캠페인과 운동화 광고 비주얼을 분석하고, 제품의 기능성과 브랜드 특유의 역동적인 이미지를 동시에 보여줄 수 있도록 전체적인 디자인 방향을 설정했습니다.',
      '운동화를 화면 중앙에 사선으로 크게 배치하고 공중으로 튀어 오르는 듯한 구도를 적용했습니다. 제품 주변의 검은색 잉크 파편 효과와 바닥 입자 표현으로 운동 시 발생하는 강한 충격과 에너지를 시각적으로 표현했습니다.',
      '전체적인 컬러는 블랙·화이트·그레이의 모노톤으로 제한하여 제품의 형태와 adidas의 시그니처 스트라이프가 명확하게 드러나도록 구성했습니다. 강한 명암 대비와 질감 표현으로 스포티하면서도 묵직한 분위기를 강조했습니다.',
      '상단에는 adidas 로고와 Adione 제품명을 크게 배치하고, 그 아래에 “특수 방수 처리, 기능성 에어리즘 소재”라는 핵심 기능을 간결하게 표현했습니다. 충분한 여백으로 정보가 이미지의 역동성을 방해하지 않으면서도 자연스럽게 읽히도록 구성했습니다.'
    ] },
    console: { title: 'CONSOLES 수납가구 인테리어 광고 포스터 디자인', image: 'assets/img/poster-console.jpg', paragraphs: [
      '가구·인테리어 브랜드의 카탈로그와 공간 연출 방식을 분석하고, 원목 수납가구 CONSOLES를 중심으로 한 라이프스타일 광고 포스터를 디자인하여 포트폴리오 프로젝트를 제작했습니다. 제품의 원목 소재와 따뜻한 공간 분위기를 연결해 편안하고 여유로운 생활 공간을 전달하는 데 중점을 두었습니다.',
      '가구 브랜드의 카탈로그와 인테리어 공간 연출 사례를 조사하고, 제품과 공간이 자연스럽게 어우러지는 미니멀한 라이프스타일 광고를 콘셉트로 설정했습니다. 실제 공간에서 사용하는 모습을 통해 제품의 소재와 분위기가 함께 전달되도록 구성했습니다.',
      '포스터 중앙 하단에는 원목 콘솔 수납장을 크게 배치하고 주변 오브젝트를 최소화했습니다. 수직적인 원목 패턴과 라탄 소재 도어처럼 서로 다른 질감이 드러나도록 표현해 수납가구의 따뜻하고 자연스러운 소재감을 강조했습니다.',
      '공간은 베이지와 우드 컬러 중심의 뉴트럴 톤으로 구성하고, 왼쪽에서 들어오는 자연광과 부드러운 그림자로 편안하고 차분한 분위기를 연출했습니다. 조명과 그림자가 자연스럽게 연결되도록 하여 실제 인테리어 공간에 가구가 놓여 있는 듯한 현실감을 표현했습니다.',
      '상단에는 “all in · live simple.”이라는 라이프스타일 메시지와 CONSOLES 제품명을 여백감 있게 배치했습니다. 얇고 절제된 영문 타이포그래피와 간결한 오브젝트 배치로 자연스럽고 정돈된 라이프스타일을 표현했습니다.'
    ] }
  };
  const specification = ['제작 규격', '크기 : 500 × 750px', '비율 : 2 : 3', '툴 : Photoshop', '제작 시간 : 약 1시간'];
  let activeCard, activeTrigger, animation, closing = false, restoreFocus = true, previousOverflow = '';
  const full = { transform: 'perspective(1400px) translate(0, 0) rotateY(0deg) scale(1)', opacity: 1 };
  function folded() {
    const origin = activeCard.getBoundingClientRect(), target = dialog.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - target.left - target.width / 2;
    const y = origin.top + origin.height / 2 - target.top - target.height / 2;
    return { transform: `perspective(1400px) translate(${x}px, ${y}px) rotateY(82deg) scale(${origin.width / target.width}, ${origin.height / target.height})`, opacity: .15 };
  }
  function render(project) {
    title.textContent = project.title; image.src = project.image; image.alt = `${project.title} 전체 디자인`;
    const summaryHeading = document.createElement('h3'); summaryHeading.textContent = '간략한 텍스트';
    const summary = document.createElement('p'); summary.className = 'project-detail__summary'; summary.textContent = project.paragraphs[0];
    const heading = document.createElement('h3'); heading.textContent = '제작 과정';
    content.replaceChildren(summaryHeading, summary, heading, ...project.paragraphs.slice(1).map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    specs.replaceChildren(...specification.map((text, index) => { const element = document.createElement(index ? 'dd' : 'dt'); element.textContent = text; return element; }));
  }
  document.querySelectorAll('.poster-card__more').forEach(trigger => trigger.addEventListener('click', () => {
    if (dialog.open || closing) return;
    activeTrigger = trigger; activeCard = trigger.closest('.poster-card'); restoreFocus = true;
    render(projects[activeCard.dataset.poster]); previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal(); dialog.scrollTop = 0;
    if (!reduced.matches) animation = dialog.animate([folded(), full], { duration: 720, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
  }));
  async function close({ focusTrigger = true } = {}) {
    if (closing || !dialog.open) return;
    closing = true; restoreFocus = focusTrigger; dialog.classList.add('is-closing');
    if (!reduced.matches && animation) { animation.reverse(); await animation.finished.catch(() => {}); }
    dialog.close(); closing = false;
  }
  dialog.querySelector('.project-detail__close').addEventListener('click', () => close({ focusTrigger: false }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { animation?.cancel(); animation = null; dialog.classList.remove('is-closing'); document.body.style.overflow = previousOverflow; if (restoreFocus) activeTrigger?.focus({ preventScroll: true }); else activeCard?.closest('.works__gallery')?.focus({ preventScroll: true }); });
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
    { title: 'Burger King Plant-Based Whopper 프로모션 배너 디자인', image: 'assets/img/banner-burgerking.jpg', tool: 'Figma', summary: ['Burger King의 기존 브랜드 이미지를 바탕으로, 식물성 패티를 사용한 Plant-Based Whopper를 소개하는 프로모션 배너를 제작했습니다.', '제품의 신선한 이미지를 직관적으로 전달하기 위해 그린 컬러를 메인으로 사용하고, 햄버거를 화면 중심에 크게 배치해 제품 자체가 가장 먼저 눈에 들어오도록 디자인했습니다.'], process: ['Burger King의 광고와 프로모션 배너를 살펴보며 브랜드에서 사용하는 컬러와 굵은 타이포그래피를 참고했습니다. 기존 브랜드의 친근하고 캐주얼한 분위기를 유지하면서도 식물성 제품이라는 특징이 자연스럽게 드러나는 방향으로 작업했습니다.', '전체 배경에는 짙은 그린 컬러를 사용하고 중앙에는 햄버거 이미지를 크게 배치했습니다. 토마토와 양상추 등 재료의 색상이 배경과 대비되도록 하여 제품의 신선함이 잘 드러나도록 구성했습니다.', '상단의 Plant-Based Whopper 문구는 크고 굵은 서체를 사용하고, 제품 옆에는 0% BEEF를 원형 그래픽으로 강조했습니다. 제품명과 핵심 특징만 남겨 짧은 시간에도 내용을 파악할 수 있는 배너를 목표로 했습니다.'] },
    { title: 'UNIQLO 감사제 프로모션 배너 디자인', image: 'assets/img/banner-uniqlo.jpg', tool: 'Figma', summary: ['UNIQLO의 겨울 시즌 감사제를 주제로, 시즌 분위기와 행사 정보를 함께 전달할 수 있는 프로모션 배너를 제작했습니다.', '겨울이라는 계절감을 명확하게 보여주면서도 UNIQLO의 브랜드 컬러인 레드가 자연스럽게 강조될 수 있도록 블루와 화이트를 중심으로 화면을 구성했습니다.'], process: ['UNIQLO의 시즌 프로모션과 감사제 광고를 참고하여 브랜드 특유의 단순하고 명확한 정보 전달 방식을 배너에 적용했습니다.', '배경은 눈이 쌓인 겨울 풍경과 매장을 중심으로 구성했습니다. 블루 하늘과 화이트 건물로 겨울의 차가운 분위기를 표현하고, 매장 왼쪽의 레드 오브젝트와 상단의 UNIQLO 로고가 자연스럽게 포인트가 되도록 했습니다.', '행사명인 감사제는 중앙에 크게, 상단에는 행사 성격을 설명하는 문구, 하단에는 기간을 배치했습니다. 넓은 공간과 강한 색상 대비로 브랜드와 프로모션 내용이 명확하게 전달되도록 구성했습니다.'] },
    { title: 'AIR MAX 스포츠 프로모션 배너 디자인', image: 'assets/img/banner-nike.jpg', tool: 'Photoshop', summary: ['스포츠 브랜드의 신발 프로모션을 주제로 AIR MAX 제품과 할인 정보를 함께 보여주는 배너를 제작했습니다.', '제품 이미지와 프로모션 문구가 각각 명확하게 보이도록 화면을 좌우로 나누고, 오렌지와 베이지의 강한 색상 대비를 활용해 활동적이고 캐주얼한 분위기를 표현했습니다.'], process: ['스포츠 브랜드의 온라인 프로모션 배너를 참고하여 제품과 할인 정보가 짧은 시간 안에 전달될 수 있도록 디자인했습니다.', '화면 왼쪽에는 AIR MAX, UP TO 50% SALE과 같은 주요 정보를 큰 타이포그래피로, 오른쪽에는 운동화 이미지를 크게 배치했습니다. 텍스트와 제품 영역을 나눠 자연스럽게 시선이 이동하도록 구성했습니다.', '베이지와 오렌지 컬러의 큰 원형 그래픽과 낮은 대비의 AIR MAX 영문 그래픽으로 화면에 리듬감을 더했습니다. SHOP NOW 버튼으로 제품명에서 할인 정보, 구매 버튼으로 이어지는 순서를 만들었습니다.'] },
    { title: 'Baskin-Robbins Mint Brownie 신제품 배너 디자인', image: 'assets/img/banner-baskinrobbins.jpg', tool: 'Figma', summary: ['Baskin-Robbins의 시즌 신제품을 가정하여 Mint Brownie라는 아이스크림을 중심으로 한 프로모션 배너를 제작했습니다.', '민트와 브라우니라는 두 가지 맛을 색상과 재료 이미지로 직접 보여주어, 별도의 긴 설명 없이도 제품의 특징을 쉽게 이해할 수 있도록 디자인했습니다.'], process: ['Baskin-Robbins의 신제품 프로모션에서 볼 수 있는 밝고 경쾌한 분위기를 참고하면서, 민트와 브라우니가 가장 잘 드러나는 방향으로 화면을 구성했습니다.', '중앙에는 민트 아이스크림과 브라우니가 섞인 제품을 크게 배치하고 주변에는 브라우니 조각과 민트 잎을 흩어지듯 배치했습니다. 실제 재료를 함께 노출해 맛을 시각적으로 전달하고 화면에 움직임을 더했습니다.', '배경에는 채도가 낮은 연한 민트 컬러를 적용하고, Mint에는 그린, Brownie에는 브라운 컬러를 사용했습니다. 제품 이미지와 제품명을 중앙에 집중시키고 충분한 여백으로 밝고 가벼운 분위기를 표현했습니다.'] }
  ];
  let index = 0, elapsed = 0, previous = 0, frame = 0;
  let visible = false, paused = reduced.matches, wrapping = false;
  let gesture = null;
  let suppressClickUntil = 0;
  const track = document.createElement('div');
  track.className = 'banner-track';
  slides.forEach((slide, index) => {
    slide.dataset.bannerIndex = index;
    track.append(slide);
  });
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
  let activeBanner, bannerAnimation, bannerClosing = false, bannerOverflow = '';
  const bannerTitle = detailDialog.querySelector('h2');
  const bannerImage = detailDialog.querySelector('.project-detail__visual img');
  const bannerContent = detailDialog.querySelector('.project-detail__content');
  const bannerSpecs = detailDialog.querySelector('.project-detail__specs');
  const bannerFull = { transform: 'perspective(1400px) translate(0, 0) rotateY(0deg) scale(1)', opacity: 1 };
  function openBannerDetail(target) {
    const project = bannerProjects[target.next];
    if (!project || detailDialog.open) return;
    activeBanner = target.slide; bannerTitle.textContent = project.title; bannerImage.src = project.image; bannerImage.alt = `${project.title} 전체 디자인`;
    const summaryHeading = document.createElement('h3'); summaryHeading.textContent = '간략한 텍스트';
    const processHeading = document.createElement('h3'); processHeading.textContent = '제작 과정';
    bannerContent.replaceChildren(summaryHeading, ...project.summary.map(text => { const p = document.createElement('p'); p.className = 'project-detail__summary'; p.textContent = text; return p; }), processHeading, ...project.process.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    bannerSpecs.replaceChildren(...['제작 규격', '크기 : 1920 × 970px', '비율 : 2 : 1', `툴 : ${project.tool}`].map((text, i) => { const el = document.createElement(i ? 'dd' : 'dt'); el.textContent = text; return el; }));
    bannerOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; detailDialog.showModal(); detailDialog.scrollTop = 0; sync();
    if (!reduced.matches) { const from = (() => { const origin = activeBanner.getBoundingClientRect(), destination = detailDialog.getBoundingClientRect(); return { transform: `perspective(1400px) translate(${origin.left + origin.width / 2 - destination.left - destination.width / 2}px, ${origin.top + origin.height / 2 - destination.top - destination.height / 2}px) rotateY(82deg) scale(${origin.width / destination.width}, ${origin.height / destination.height})`, opacity: .15 }; })(); bannerAnimation = detailDialog.animate([from, bannerFull], { duration: 720, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }); }
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
    bannerClosing = true; detailDialog.classList.add('is-closing');
    if (!reduced.matches && bannerAnimation) { bannerAnimation.reverse(); await bannerAnimation.finished.catch(() => {}); }
    detailDialog.close(); bannerClosing = false;
  }
  detailDialog.querySelector('.project-detail__close').addEventListener('click', closeBannerDetail);
  detailDialog.addEventListener('cancel', event => { event.preventDefault(); closeBannerDetail(); });
  detailDialog.addEventListener('click', event => { if (event.target === detailDialog) closeBannerDetail(); });
  detailDialog.addEventListener('close', () => { bannerAnimation?.cancel(); bannerAnimation = null; detailDialog.classList.remove('is-closing'); document.body.style.overflow = bannerOverflow; viewport.focus({ preventScroll: true }); sync(); });
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
