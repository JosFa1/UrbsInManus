import { loadJson } from '../core/data.js';
import { el, listen } from '../ui/dom.js';

export function createArrivalScene({ store, sceneManager, eventBus }) {
  let screen = null;
  let idx = 0;
  let unlistenKey = null;

  /** @type {any[]} */
  let frames = [];

  function render() {
    const state = store.getState();
    const scenario = state.scenario;

    const frame = frames[idx];
    if (!frame) {
      sceneManager.goTo('petitions');
      return;
    }

    const bgUrl = frame.backgroundUrl ? `./${String(frame.backgroundUrl).replace(/^\//, '')}` : null;
    const bgStyle = bgUrl ? { backgroundImage: `url('${bgUrl}')` } : {};

    screen.innerHTML = '';
    screen.appendChild(
      el('div', { class: 'arrival-bg', style: bgStyle })
    );
    screen.appendChild(
      el(
        'div',
        { class: 'arrival-box' },
        el('div', { class: 'arrival-title' }, frame.title || 'Arrival'),
        el('div', { class: 'arrival-text' }, frame.text || ''),
        el(
          'div',
          { class: 'arrival-meta muted' },
          `${scenario?.province || 'Provincia'} · ${scenario?.yearLabel || ''} · ${scenario?.name || ''}`
        ),
        el(
          'div',
          { class: 'arrival-controls' },
          el(
            'button',
            { class: 'btn primary', type: 'button', onclick: next },
            idx + 1 >= frames.length ? 'Proceed' : 'Continue'
          )
        )
      )
    );

    eventBus?.emit('arrival:frameEnter', { index: idx, frame });
  }

  function next() {
    const frame = frames[idx];
    if (frame) eventBus?.emit('arrival:frameExit', { index: idx, frame });
    idx += 1;
    render();
  }

  return {
    async mount(root) {
      const scenario = store.getState().scenario;
      const arrivals = await loadJson('data/arrivals.json');

      const key = scenario?.arrivalType === 'inland' ? 'inland' : 'coastal';
      frames = Array.isArray(arrivals?.[key]?.frames) ? arrivals[key].frames : [];
      idx = 0;

      screen = el('div', { class: 'screen arrival-screen' });
      root.appendChild(screen);

      unlistenKey = listen(window, 'keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          next();
        }
      });

      render();
    },

    unmount() {
      unlistenKey?.();
      unlistenKey = null;
      screen?.remove();
      screen = null;
      frames = [];
    }
  };
}
