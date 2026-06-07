// Dylan Zhang — homepage interactions (fade-in + nav highlight)
(function () {
  // reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade').forEach(el => io.observe(el));

  // nav active highlight
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  const map = new Map();
  const targets = [];
  links.forEach(a => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (sec) { map.set(sec, a); targets.push(sec); }
  });
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const a = map.get(e.target);
      if (a && e.isIntersecting) { links.forEach(l => l.classList.remove('active')); a.classList.add('active'); }
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  targets.forEach(t => navObs.observe(t));
})();
