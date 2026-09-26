/* Inspect plotted points without depending on hover or a chart library. */
(() => {
  'use strict';
  document.querySelectorAll('.learning-panel').forEach((panel) => {
    const buttons = Array.from(panel.querySelectorAll('[data-curve-x]'));
    const readout = panel.querySelector('.curve-readout');
    if (!buttons.length || !readout) return;
    const select = (button) => {
      buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      const values = readout.querySelectorAll('strong');
      values[0].textContent = `≈${button.dataset.olive}%`;
      values[1].textContent = `≈${button.dataset.offline}%`;
      panel.querySelectorAll('.curve-dot').forEach((dot) => {
        dot.classList.toggle('is-selected', dot.dataset.x === button.dataset.curveX);
      });
    };
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', (event) => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next].focus();
        select(buttons[next]);
      });
    });
    select(buttons.find((button) => button.getAttribute('aria-pressed') === 'true') || buttons[0]);
    panel.classList.add('curves-ready');
  });
})();
