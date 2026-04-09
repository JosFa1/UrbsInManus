import { loadJson } from '../core/data.js';
import { el } from '../ui/dom.js';

export function createCharterScene({ store, sceneManager }) {
  let screen = null;

  function selectCharter(charter) {
    store.setState((s) => {
      const nextEconomy = { ...s.economy };
      // Tiny MVP tuning: bigger charters start with more funds, but higher implied obligations.
      const seedFunds = charter?.startingTreasury ?? s.economy.treasury;
      nextEconomy.treasury = seedFunds;

      const starting = charter?.startingMeters || {};
      const nextOrder = starting.order ?? s.order ?? s.stability;
      const nextStores = starting.stores ?? s.stores;
      const nextLabor = starting.labor ?? s.labor;
      const nextFavor = starting.favorInRome ?? s.favorInRome;

      const nextScenario = s.scenario
        ? {
          ...s.scenario,
          petitionDocketSize: charter?.petitionDocketSize ?? s.scenario.petitionDocketSize
        }
        : s.scenario;

      return {
        ...s,
        charter,
        scenario: nextScenario,
        economy: nextEconomy,
        order: nextOrder,
        stability: nextOrder,
        stores: nextStores,
        labor: nextLabor,
        favorInRome: nextFavor,
        log: [
          ...s.log,
          { t: Date.now(), text: `Charter accepted: ${charter?.name || charter?.id}` }
        ]
      };
    });

    sceneManager.goTo('arrival');
  }

  return {
    async mount(root) {
      const data = await loadJson('data/charters.json');
      const charters = Array.isArray(data?.charters) ? data.charters : [];

      screen = el(
        'div',
        { class: 'screen charter-screen' },
        el('div', { class: 'panel' },
          el('h2', {}, 'The Colony Charter'),
          el(
            'p',
            { class: 'muted' },
            'Rome has authorized your colony under a formal charter. The scope you accept defines the political expectations placed upon you-land allotments, public works, and the pace of Romanization.'
          ),
          el(
            'div',
            { class: 'charter-grid' },
            charters.map((c) =>
              el(
                'div',
                { class: 'charter-card' },
                el('div', { class: 'charter-name' }, c.name),
                el('div', { class: 'charter-legal' }, c.legalStyleLabel || ''),
                el('div', { class: 'charter-desc' }, c.description || ''),
                Array.isArray(c.gameplayFeel) && c.gameplayFeel.length
                  ? el(
                    'div',
                    { class: 'charter-feel muted' },
                    c.gameplayFeel.map((item) => el('div', { class: 'charter-feel-item' }, `• ${item}`))
                  )
                  : null,
                el(
                  'div',
                  { class: 'charter-metrics' },
                  el('div', {}, `Map: ${c.params?.mapSize?.[0]}×${c.params?.mapSize?.[1]}`),
                  el('div', {}, `Target pop.: ${c.params?.targetPopulation}`),
                  el('div', {}, `Objectives: ${c.params?.objectives}`),
                  el('div', {}, `Expected term: ${c.params?.expectedYears} years`)
                ),
                el(
                  'button',
                  {
                    class: 'btn primary',
                    type: 'button',
                    onclick: () => selectCharter(c)
                  },
                  'Accept Charter'
                )
              )
            )
          )
        )
      );

      root.appendChild(screen);
    },

    unmount() {
      screen?.remove();
      screen = null;
    }
  };
}
