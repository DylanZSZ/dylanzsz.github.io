/* HTML result plots: native buttons, visible numeric data, no chart dependency. */
(() => {
  'use strict';
  document.querySelectorAll('[data-result-plot]').forEach((figure) => {
    const buttons = Array.from(figure.querySelectorAll('[data-result-select]'));
    const panels = Array.from(figure.querySelectorAll('[data-result-panel]'));
    const status = figure.querySelector('.plot-status');
    if (!buttons.length || !panels.length) return;
    if (buttons.some((button) => !panels.some((panel) => panel.dataset.resultPanel === button.dataset.resultSelect))) return;

    const select = (key, announce) => {
      buttons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.resultSelect === key));
      });
      panels.forEach((panel) => { panel.hidden = panel.dataset.resultPanel !== key; });
      if (announce && status) {
        const selected = panels.find((panel) => panel.dataset.resultPanel === key);
        status.textContent = selected.dataset.announcement || selected.getAttribute('aria-label');
      }
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button.dataset.resultSelect, true));
      button.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        select(buttons[next].dataset.resultSelect, true);
      });
    });
    select(buttons[0].dataset.resultSelect, false);
    figure.classList.add('results-ready');
  });
})();
