import { loadJson } from '../core/data.js';
import { applyEffects } from '../core/effects.js';
import { isPetitionEligible, resolvePetitionOption } from '../core/petitionResolution.js';
import { el } from '../ui/dom.js';

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function shuffleInPlace(list, rng = Math.random) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(clamp(rng(), 0, 0.999999) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function pickFromArray(list, rng = Math.random) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const i = Math.floor(clamp(rng(), 0, 0.999999) * list.length);
  return list[i] ?? null;
}

const FACTION_ORDER = ['veterans', 'settlers', 'merchants', 'council', 'garrison', 'locals'];

function factionLabel(id) {
  switch (id) {
    case 'veterans': return 'Veterans';
    case 'settlers': return 'Settlers';
    case 'merchants': return 'Merchants';
    case 'council': return 'Council';
    case 'garrison': return 'Garrison';
    case 'locals': return 'Locals';
    default: return id;
  }
}

function petitionGroupLabel(petition) {
  const group = petition?.group;
  if (petition?.groupLabel) return petition.groupLabel;
  if (group === 'rome') return 'Rome';
  if (group === 'elites' || group === 'priests') return 'Council';
  return group ? factionLabel(group) : '';
}

function getLocalRelations(state) {
  return num(state?.factions?.locals);
}

function getOrder(state) {
  return num(state?.order ?? state?.stability);
}

function toastFallback(option) {
  const id = String(option?.id || '').toLowerCase();
  const isDelay = option?.action === 'delay' || id === 'delay';
  const isDeny = id === 'deny' || option?.tone === 'danger';

  if (isDelay) {
    return Math.random() < 0.5 ? 'Come back with figures.' : 'Delay reads as weakness.';
  }

  if (isDeny) {
    return Math.random() < 0.5 ? 'No. And the room turns cold.' : 'The clerk pretends not to have heard you.';
  }

  return Math.random() < 0.5 ? 'You may proceed. Quietly.' : 'The chamber exhales. For now.';
}

function normalizeAssetUrl(path) {
  if (!path) return null;
  const cleaned = String(path).replace(/^\//, '');
  return `./${cleaned}`;
}

const PETITION_BACKGROUND_BY_GROUP = {
  merchants: 'assets/backgrounds/market-row.svg',
  locals: 'assets/backgrounds/shrine-crossing.svg',
  council: 'assets/backgrounds/records-office.svg',
  rome: 'assets/backgrounds/records-office.svg'
};

function resolvePetitionBackgroundUrl(petition) {
  const byGroup = petition?.group ? PETITION_BACKGROUND_BY_GROUP[petition.group] : null;
  const chosen = byGroup || 'assets/backgrounds/survey-camp.svg';
  return normalizeAssetUrl(chosen);
}

export function createPetitionScene({ store, sceneManager }) {
  let screen = null;
  let unsubscribe = null;

  /** @type {Record<string, any>} */
  let petitionById = {};

  /** @type {any[]} */
  let allPetitions = [];

  /** @type {any} */
  let flavor = null;

  /** @type {{ petitionId: string, option: any, resolution: any, confirmationLine: string|null, flavorLine: string|null, isDelay: boolean } | null} */
  let pendingResult = null;

  let lastPetitionId = null;
  let lastArrivalLine = null;

  let lastHudSnapshot = null;

  function applyScheduledDueEffects(state) {
    const currentTurn = Math.floor(num(state.turn));
    const scheduled = Array.isArray(state.scheduledEffects) ? state.scheduledEffects : [];
    const due = scheduled.filter((s) => num(s?.dueTurn) <= currentTurn);
    const remaining = scheduled.filter((s) => num(s?.dueTurn) > currentTurn);

    let next = { ...state, scheduledEffects: remaining };
    for (const item of due) {
      next = applyEffects(next, {
        ...(item?.effects || {}),
        logText: item?.logText ? String(item.logText) : undefined
      });
    }
    return next;
  }

  function buildDocket(state) {
    const scenario = state.scenario;
    const charter = state.charter;
    const fallbackSize = Array.isArray(scenario?.initialPetitionIds) ? scenario.initialPetitionIds.length : 6;
    const docketSize = Math.max(1, Math.floor(num(charter?.petitionDocketSize ?? scenario?.petitionDocketSize ?? fallbackSize)));

    const poolIds = Array.isArray(scenario?.petitionPoolIds)
      ? scenario.petitionPoolIds
      : allPetitions.map((p) => p.id);

    const recentWindow = Math.max(3, Math.min(10, docketSize));
    const recentResolved = (Array.isArray(state.petitions?.resolved) ? state.petitions.resolved : [])
      .slice(-recentWindow)
      .map((r) => r.id);
    const recentSet = new Set(recentResolved);

    const eligible = [];
    for (const id of poolIds) {
      const petition = petitionById[id];
      if (!petition) continue;
      if (!isPetitionEligible(state, petition)) continue;
      if (recentSet.has(id)) continue;
      eligible.push(id);
    }

    // If the pool is small, allow repeats rather than ending the petition loop.
    if (eligible.length === 0) {
      for (const id of poolIds) {
        const petition = petitionById[id];
        if (!petition) continue;
        if (!isPetitionEligible(state, petition)) continue;
        eligible.push(id);
      }
    }

    shuffleInPlace(eligible);
    return eligible.slice(0, docketSize);
  }

  function ensureQueue() {
    const state = store.getState();
    if (state.petitions?.queue?.length) return;

    const scenario = state.scenario;
    const isFirstDocket = !(state.petitions?.resolved?.length);
    const ids = isFirstDocket && Array.isArray(scenario?.initialPetitionIds)
      ? scenario.initialPetitionIds
      : buildDocket(state);

    store.setState((s) => ({
      ...s,
      petitions: {
        ...s.petitions,
        queue: ids.slice(),
        resolved: isFirstDocket ? [] : (s.petitions?.resolved || [])
      }
    }));
  }

  function currentPetition(stateOverride) {
    const state = stateOverride || store.getState();
    const id = state.petitions?.queue?.[0];
    return id ? petitionById[id] : null;
  }

  function pickFlavorLine(poolName, fallback = null) {
    const line = pickFromArray(flavor?.[poolName]);
    if (typeof line === 'string' && line.trim()) return line.trim();
    return fallback;
  }

  function bandFlavorLine(band) {
    if (band === 'strong') return pickFlavorLine('successFlavorLines', null);
    if (band === 'mixed') return pickFlavorLine('mixedFlavorLines', null);
    return pickFlavorLine('badFlavorLines', null);
  }

  function showToast(text) {
    if (!screen) return;
    const toast = el('div', { class: 'toast' }, text);
    screen.appendChild(toast);
    // Next tick to ensure transition.
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 200);
    }, 1900);
  }

  function chooseOption(petitionId, option) {
    if (pendingResult) return;

    const before = store.getState();
    const petition = petitionById[petitionId];
    if (!petition) return;

    const resolution = resolvePetitionOption({ state: before, petition, option });
    const confirmationLine = pickFlavorLine('optionConfirmationLines', toastFallback(option));
    const flavorLine = bandFlavorLine(resolution?.band);
    const isDelay = option?.action === 'delay';

    pendingResult = {
      petitionId,
      option,
      resolution,
      confirmationLine,
      flavorLine,
      isDelay
    };

    store.setState((s) => {
      const baseLog = `${petitionById[petitionId]?.title || petitionId}: ${option?.label || option?.id}`;
      const effectsToApply = resolution?.effects || option?.effects || {};
      const afterEffects = applyEffects(s, {
        ...effectsToApply,
        logText: effectsToApply?.logText || baseLog
      });

      let nextState = {
        ...afterEffects,
        turn: Math.floor(num(afterEffects.turn)) + 1
      };

      nextState = applyScheduledDueEffects(nextState);
      return nextState;
    });
  }

  function continueAfterResult() {
    if (!pendingResult) return;

    const { petitionId, option, resolution, isDelay } = pendingResult;
    pendingResult = null;

    store.setState((s) => {
      const queue = Array.isArray(s.petitions?.queue) ? [...s.petitions.queue] : [];
      const resolved = Array.isArray(s.petitions?.resolved) ? [...s.petitions.resolved] : [];

      const current = queue.shift();
      if (current && current !== petitionId) {
        // If something unexpected happened, keep the queue stable.
        queue.unshift(current);
      } else if (current) {
        if (isDelay) {
          queue.push(current);
        } else {
          resolved.push({
            id: current,
            choice: option?.id || 'unknown',
            band: resolution?.band || null,
            t: Date.now()
          });
        }
      }

      let nextState = {
        ...s,
        petitions: {
          ...(s.petitions || {}),
          queue,
          resolved
        }
      };

      // If queue empties, convene a new docket from eligible petitions.
      if (!nextState.petitions?.queue?.length) {
        const docket = buildDocket(nextState);
        nextState = {
          ...nextState,
          petitions: {
            ...nextState.petitions,
            queue: docket
          }
        };
      }

      return nextState;
    });
  }

  function render(state) {
    screen.innerHTML = '';

    const petition = currentPetition(state);
    const bgUrl = resolvePetitionBackgroundUrl(petition);
    const bgStyle = bgUrl ? { backgroundImage: `url('${bgUrl}')` } : {};
    screen.appendChild(el('div', { class: 'petition-bg', style: bgStyle }));

    const charterName = state.charter?.name || '-';
    const scenarioName = state.scenario?.name || '-';

    const currentSnapshot = {
      treasury: num(state.economy?.treasury),
      order: getOrder(state),
      stores: num(state.stores),
      labor: num(state.labor),
      favorInRome: num(state.favorInRome),
      locals: getLocalRelations(state)
    };
    const prevSnapshot = lastHudSnapshot;
    lastHudSnapshot = currentSnapshot;
    const changed = (key) => prevSnapshot && num(prevSnapshot[key]) !== num(currentSnapshot[key]);

    const hud = el(
      'div',
      { class: 'hud' },
      el('div', { class: 'hud-left' },
        el('div', { class: 'hud-title' }, scenarioName),
        el('div', { class: 'hud-sub muted' }, `Charter: ${charterName}`)
      ),
      el('div', { class: 'hud-right' },
        el('div', { class: changed('treasury') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Treasury'), el('div', { class: 'v' }, `${state.economy?.treasury ?? 0} denarii`)),
        el('div', { class: changed('order') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Order'), el('div', { class: 'v' }, `${getOrder(state)}/100`)),
        el('div', { class: changed('stores') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Stores'), el('div', { class: 'v' }, `${state.stores ?? 0}/100`)),
        el('div', { class: changed('labor') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Labor'), el('div', { class: 'v' }, `${state.labor ?? 0}/100`)),
        el('div', { class: changed('favorInRome') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Favor in Rome'), el('div', { class: 'v' }, `${state.favorInRome ?? 0}/100`)),
        el('div', { class: changed('locals') ? 'hud-stat pulse' : 'hud-stat' }, el('div', { class: 'k' }, 'Local Relations'), el('div', { class: 'v' }, `${getLocalRelations(state)}/100`))
      )
    );

    const factions = el(
      'div',
      { class: 'factions panel' },
      el('div', { class: 'panel-title' }, 'Approvals'),
      el(
        'div',
        { class: 'faction-grid' },
        FACTION_ORDER.map((id) =>
          el('div', { class: 'faction' },
            el('div', { class: 'k' }, factionLabel(id)),
            el('div', { class: 'v' }, `${state.factions?.[id] ?? 0}/100`)
          )
        )
      )
    );

    let petitionCard;
    if (!petition) {
      petitionCard = el(
        'div',
        { class: 'petition panel' },
        el('div', { class: 'panel-title' }, 'Petitions'),
        el('div', {}, 'No petition is currently queued.'),
        el(
          'div',
          { class: 'petition-controls' },
          el('button', { class: 'btn', type: 'button', onclick: () => sceneManager.goTo('prologue') }, 'Restart MVP')
        )
      );
    } else if (pendingResult && pendingResult.petitionId === petition.id) {
      const band = pendingResult.resolution?.band || 'mixed';
      const bandLabel = band === 'strong' ? 'Strong' : band === 'bad' ? 'Bad' : 'Mixed';
      const resultText = pendingResult.resolution?.resultText || '';
      const outcomeFlavor = pendingResult.flavorLine || '';
      const confirmationLine = pendingResult.confirmationLine || '';

      petitionCard = el(
        'div',
        { class: 'petition panel result' },
        el('div', { class: 'petition-group muted' }, petitionGroupLabel(petition)),
        el('div', { class: 'petition-title' }, petition.title || ''),
        confirmationLine ? el('div', { class: 'petition-confirmation muted' }, confirmationLine) : null,
        el('div', { class: 'petition-result-band muted' }, bandLabel),
        el('div', { class: 'petition-body' }, resultText),
        outcomeFlavor ? el('div', { class: 'petition-flavor muted' }, outcomeFlavor) : null,
        el(
          'div',
          { class: 'petition-controls' },
          el(
            'button',
            {
              class: 'btn primary',
              type: 'button',
              onclick: () => continueAfterResult()
            },
            'Continue'
          )
        )
      );
    } else {
      const petitionId = petition.id;
      if (petitionId !== lastPetitionId) {
        lastPetitionId = petitionId;
        lastArrivalLine = pickFlavorLine('petitionArrivalLines', null);
      }

      const isFirstPetition = (state.petitions?.resolved?.length || 0) === 0;
      const firstIntro = isFirstPetition ? pickFlavorLine('firstPetitionIntroLines', null) : null;

      const petitionerPortraitUrl = normalizeAssetUrl(petition?.petitionerPortraitUrl || petition?.portraitUrl);
      const petitionerName = petition?.petitionerName ? String(petition.petitionerName) : '';
      const petitionerTitle = petition?.petitionerTitle ? String(petition.petitionerTitle) : '';
      const petitionerHeader = (petitionerName || petitionerTitle || petitionerPortraitUrl)
        ? el(
          'div',
          { class: 'petition-petitioner' },
          petitionerPortraitUrl
            ? el(
              'div',
              { class: 'petition-portrait' },
              el('img', { class: 'petition-portrait-img', src: petitionerPortraitUrl, alt: '' })
            )
            : null,
          el(
            'div',
            { class: 'petition-petitioner-meta' },
            petitionerName ? el('div', { class: 'petition-petitioner-name' }, petitionerName) : null,
            petitionerTitle ? el('div', { class: 'petition-petitioner-title muted' }, petitionerTitle) : null
          )
        )
        : null;

      petitionCard = el(
        'div',
        { class: 'petition panel' },
        firstIntro ? el('div', { class: 'petition-intro muted' }, firstIntro) : null,
        lastArrivalLine ? el('div', { class: 'petition-arrival muted' }, lastArrivalLine) : null,
        el('div', { class: 'petition-group muted' }, petitionGroupLabel(petition)),
        petitionerHeader,
        el('div', { class: 'petition-title' }, petition.title || ''),
        el('div', { class: 'petition-body' }, petition.body || ''),
        el(
          'div',
          { class: 'petition-controls' },
          (petition.options || []).map((opt) =>
            el(
              'button',
              {
                class: opt.tone === 'danger' ? 'btn danger' : opt.tone === 'secondary' ? 'btn' : 'btn primary',
                type: 'button',
                onclick: () => chooseOption(petition.id, opt)
              },
              opt.label || opt.id
            )
          )
        )
      );
    }

    screen.appendChild(hud);
    screen.appendChild(
      el(
        'div',
        { class: 'petition-layout' },
        el('div', { class: 'petition-main' }, petitionCard),
        el('div', { class: 'petition-side' }, factions)
      )
    );
  }

  return {
    async mount(root) {
      const data = await loadJson('data/petitions.json');
      flavor = await loadJson('data/flavor.json');
      petitionById = {};
      allPetitions = Array.isArray(data?.petitions) ? data.petitions : [];
      for (const p of allPetitions) petitionById[p.id] = p;

      ensureQueue();

      screen = el('div', { class: 'screen petition-screen' });
      root.appendChild(screen);

      unsubscribe = store.subscribe(render);
      render(store.getState());
    },

    unmount() {
      unsubscribe?.();
      unsubscribe = null;
      screen?.remove();
      screen = null;
      petitionById = {};
      pendingResult = null;
      lastPetitionId = null;
      lastArrivalLine = null;
      lastHudSnapshot = null;
    }
  };
}
