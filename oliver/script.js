/* Progressive enhancement: the complete article is readable without JavaScript. */
(() => {
  'use strict';

  document.querySelectorAll('.method-demo').forEach((demo) => {
    const buttons = Array.from(demo.querySelectorAll('.demo-controls [data-step]'));
    const stages = Array.from(demo.querySelectorAll('[data-stage]'));
    const details = Array.from(demo.querySelectorAll('.demo-detail [data-detail]'));
    if (!buttons.length || !details.length) return;

    const selectStep = (step) => {
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.step === step));
      });
      stages.forEach((stage) => {
        stage.classList.toggle('is-active', stage.dataset.stage === step);
      });
      details.forEach((detail) => { detail.hidden = detail.dataset.detail !== step; });
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => selectStep(button.dataset.step));
      button.addEventListener('keydown', (event) => {
        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[nextIndex].focus();
        selectStep(buttons[nextIndex].dataset.step);
      });
    });

    const detailRegion = demo.querySelector('.demo-detail');
    if (detailRegion) detailRegion.setAttribute('aria-live', 'polite');
    selectStep(buttons[0].dataset.step);
    demo.classList.add('is-interactive');
  });

  const progress = document.querySelector('.reading-progress');
  const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  const sections = tocLinks.map((link) => ({
    link,
    section: document.getElementById(link.getAttribute('href').slice(1)),
  })).filter((item) => item.section);
  let scheduled = false;

  const updateReading = () => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = maximum > 0 ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0;
    if (progress) progress.style.transform = `scaleX(${fraction})`;
    let current = null;
    sections.forEach((item) => {
      if (item.section.getBoundingClientRect().top <= 150) current = item;
    });
    sections.forEach((item) => {
      if (item === current) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
    scheduled = false;
  };
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateReading);
  };

  if (progress || sections.length) {
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('load', scheduleUpdate, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleUpdate);
    updateReading();
  }
})();
