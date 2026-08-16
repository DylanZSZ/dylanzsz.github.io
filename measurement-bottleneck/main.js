(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal long-form sections as they enter the viewport. Content remains visible
  // without JavaScript and when reduced motion is requested.
  const revealItems = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px" });

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Accessible readiness-tier tabs.
  document.querySelectorAll("[data-tier-browser]").forEach((browser) => {
    const tabs = Array.from(browser.querySelectorAll("[data-tier]"));
    const panels = Array.from(browser.querySelectorAll("[data-tier-panel]"));

    function selectTier(tier, focusTab) {
      tabs.forEach((tab) => {
        const selected = tab.dataset.tier === tier;
        tab.classList.toggle("is-active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focusTab) tab.focus();
      });

      panels.forEach((panel) => {
        const selected = panel.dataset.tierPanel === tier;
        panel.classList.toggle("is-active", selected);
        panel.hidden = !selected;
      });
    }

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectTier(tab.dataset.tier, false));
      tab.addEventListener("keydown", (event) => {
        let next = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;

        event.preventDefault();
        selectTier(tabs[next].dataset.tier, true);
      });
    });

    const initiallySelected = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
    selectTier(initiallySelected.dataset.tier, false);
  });

  // Reflect the current reading section in the sticky navigation.
  const navLinks = Array.from(document.querySelectorAll(".topnav-links a[href^='#']"));
  const navTargets = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window && navTargets.length) {
    const visibleSections = new Map();
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visibleSections.set(entry.target.id, entry.intersectionRatio));
      let activeId = "";
      let activeRatio = 0;
      visibleSections.forEach((ratio, id) => {
        if (ratio > activeRatio) {
          activeId = id;
          activeRatio = ratio;
        }
      });
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${activeId}`;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -64%", threshold: [0, 0.2, 0.5, 0.8] });

    navTargets.forEach((section) => navObserver.observe(section));
  }

  // A quiet orientation cue for a long article, especially when the compact
  // mobile nav hides section links.
  const progressBar = document.querySelector(".reading-progress span");
  if (progressBar) {
    let progressFrame = 0;
    const updateProgress = () => {
      progressFrame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.transform = `scaleX(${progress})`;
    };
    const requestProgressUpdate = () => {
      if (progressFrame) return;
      progressFrame = window.requestAnimationFrame(updateProgress);
    };
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);
    updateProgress();
  }
})();
