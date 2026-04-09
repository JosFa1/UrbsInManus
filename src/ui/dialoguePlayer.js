import { el, listen } from './dom.js';

/**
 * @param {{
 *  dialogue: any,
 *  eventBus: any,
 *  onDone: ()=>void,
 *  onChoice?: (payload:{ index:number, line:any, choice:any })=>void
 * }} params
 */
export function createDialoguePlayer({ dialogue, eventBus, onDone, onChoice }) {
  const speakers = dialogue?.speakers || {};
  const backgrounds = dialogue?.backgrounds || {};
  const lines = Array.isArray(dialogue?.lines) ? dialogue.lines : [];

  let idx = 0;

  const bg = el('div', { class: 'dialogue-bg' });

  const portraitImg = el('img', {
    class: 'dialogue-portrait-img',
    alt: ''
  });
  const portraitFallback = el('div', { class: 'dialogue-portrait-fallback' }, 'Portrait');
  const portraitWrap = el('div', { class: 'dialogue-portrait' }, portraitImg, portraitFallback);

  const nameEl = el('div', { class: 'dialogue-name' });
  const textEl = el('div', { class: 'dialogue-text' });
  const choicesEl = el('div', { class: 'dialogue-choices' });

  const nextBtn = el('button', { class: 'btn primary', type: 'button' }, 'Continue');
  const controls = el('div', { class: 'dialogue-controls' }, nextBtn);

  const box = el(
    'div',
    { class: 'dialogue-box' },
    portraitWrap,
    el(
      'div',
      { class: 'dialogue-content' },
      nameEl,
      textEl,
      choicesEl,
      controls
    )
  );

  const root = el('div', { class: 'screen dialogue-screen' }, bg, box);

  function resolveUrl(value, map) {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value;
      // Treat as relative to site root.
      return `./${value.replace(/^\//, '')}`;
    }
    if (typeof value === 'object' && value.id && map[value.id]) {
      return resolveUrl(map[value.id], map);
    }
    return null;
  }

  function currentLine() {
    return lines[idx] || null;
  }

  function clearChoices() {
    choicesEl.innerHTML = '';
  }

  function setChoices(choices) {
    clearChoices();
    for (const choice of choices) {
      const btn = el(
        'button',
        { class: 'btn', type: 'button' },
        choice?.label || choice?.text || choice?.id || 'Choose'
      );
      btn.addEventListener('click', () => {
        // Prevent double-activations.
        for (const child of Array.from(choicesEl.querySelectorAll('button'))) {
          child.disabled = true;
        }

        const line = currentLine();
        if (line) eventBus?.emit('dialogue:choice', { index: idx, line, choice });
        if (typeof onChoice === 'function') {
          try {
            onChoice({ index: idx, line, choice });
          } catch (err) {
            console.error(err);
          }
        }
        advance();
      });
      choicesEl.appendChild(btn);
    }
  }

  function render() {
    const line = currentLine();
    if (!line) {
      onDone();
      return;
    }

    const speaker = line.speakerId ? speakers[line.speakerId] : null;

    const bgUrl = resolveUrl(line.backgroundId ? backgrounds[line.backgroundId] : line.backgroundUrl, backgrounds);
    if (bgUrl) {
      bg.style.backgroundImage = `url('${bgUrl}')`;
    } else {
      bg.style.backgroundImage = '';
    }

    const portraitUrl = resolveUrl(speaker?.portraitUrl || line.portraitUrl, speakers);
    if (portraitUrl) {
      portraitImg.src = portraitUrl;
      portraitImg.style.display = 'block';
      portraitFallback.style.display = 'none';
    } else {
      portraitImg.removeAttribute('src');
      portraitImg.style.display = 'none';
      portraitFallback.style.display = 'flex';
    }

    nameEl.textContent = speaker?.name || line.speakerName || '-';
    textEl.textContent = line.text || '';

    const choices = Array.isArray(line.choices) ? line.choices : null;
    if (choices && choices.length > 0) {
      nextBtn.disabled = true;
      controls.style.display = 'none';
      setChoices(choices);
    } else {
      clearChoices();
      nextBtn.disabled = false;
      controls.style.display = 'flex';
    }

    eventBus?.emit('dialogue:lineEnter', { index: idx, line });
  }

  function advance() {
    const line = currentLine();
    if (line) eventBus?.emit('dialogue:lineExit', { index: idx, line });

    if (idx + 1 >= lines.length) {
      onDone();
      return;
    }

    idx += 1;
    render();
  }

  nextBtn.addEventListener('click', advance);

  const unlistenKey = listen(window, 'keydown', (ev) => {
    const line = currentLine();
    if (line?.choices?.length) return;
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      advance();
    }
  });

  render();

  return {
    el: root,
    destroy() {
      unlistenKey();
    }
  };
}
