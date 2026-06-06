// CausaLab interactive write-up — light interactivity.

(function () {
  // -------- regime / schedule toggle --------
  const buttons = document.querySelectorAll('.schedule-btn');
  const readouts = document.querySelectorAll('.schedule-readout');

  function activate(key) {
    buttons.forEach(b => {
      const on = b.dataset.schedule === key;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    readouts.forEach(r => { r.hidden = r.dataset.for !== key; });
    const panel = document.getElementById('schedule-panel');
    if (panel) panel.dataset.active = key;
  }
  buttons.forEach(b => b.addEventListener('click', () => activate(b.dataset.schedule)));

  // -------- tab browsers --------
  document.querySelectorAll('.tab-browser').forEach(group => {
    const btns   = group.querySelectorAll('.tab-btn');
    const panels = group.querySelectorAll('.tab-panel');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        btns.forEach(b => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(p => {
          const on = p.dataset.tabPanel === target;
          p.classList.toggle('is-active', on);
          p.hidden = !on;
        });
      });
    });
  });

  // -------- citation tooltips --------
  const tip = document.getElementById('tooltip');
  const cites = document.querySelectorAll('.cite');
  function showTip(el) {
    if (!tip) return;
    const text = el.dataset.tip;
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tw = Math.min(320, tip.offsetWidth);
    const left = window.scrollX + r.left + r.width / 2 - tw / 2;
    const top  = window.scrollY + r.top - tip.offsetHeight - 10;
    tip.style.left = Math.max(12, left) + 'px';
    tip.style.top  = Math.max(12, top) + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  cites.forEach(el => {
    el.addEventListener('mouseenter', () => showTip(el));
    el.addEventListener('mouseleave', hideTip);
    el.addEventListener('focus', () => showTip(el));
    el.addEventListener('blur', hideTip);
  });

  // -------- nav active highlight on scroll --------
  const navLinks = document.querySelectorAll('.topnav-links a[href^="#"]');
  const sections = Array.from(navLinks)
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  const linkBySection = new Map();
  navLinks.forEach((a, i) => linkBySection.set(sections[i], a));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const link = linkBySection.get(e.target);
      if (!link) return;
      if (e.isIntersecting) {
        navLinks.forEach(l => l.classList.remove('is-active'));
        link.classList.add('is-active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
  sections.forEach(s => obs.observe(s));

  // -------- reveal-on-scroll for figures --------
  const figures = document.querySelectorAll('figure');
  const figObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); figObs.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  figures.forEach(f => figObs.observe(f));
})();
