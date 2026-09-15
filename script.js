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
