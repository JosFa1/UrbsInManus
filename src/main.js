import { EventBus } from './core/events.js';
import { loadJson } from './core/data.js';
import { Store } from './core/store.js';
import { SceneManager } from './core/sceneManager.js';

import { createPrologueScene } from './scenes/prologueScene.js';
import { createCharterScene } from './scenes/charterScene.js';
import { createArrivalScene } from './scenes/arrivalScene.js';
import { createPetitionScene } from './scenes/petitionScene.js';

function createInitialState() {
  return {
    scenario: null,
    charter: null,
    // Canonical stat is now "order" (stability remains as a legacy alias).
    order: 55,
    stability: 55,
    stores: 50,
    labor: 50,
    favorInRome: 55,
    economy: {
      treasury: 5000,
      revenues: {
        rents: 0,
        marketActivity: 0,
        workshopOutput: 0,
        leasedPublicLand: 0,
        dues: 0
      },
      obligations: {
        upkeep: 0,
        publicWorks: 0,
        supplyCosts: 0,
        tribute: 0
      }
    },
    factions: {
      veterans: 55,
      settlers: 50,
      merchants: 50,
      council: 45,
      garrison: 50,
      locals: 50
    },
    traits: {
      legalism: 50,
      generosity: 50,
      harshness: 50,
      piety: 50,
      integrity: 50
    },
    flags: {},
    turn: 0,
    scheduledEffects: [],
    petitions: {
      queue: [],
      resolved: []
    },
    log: []
  };
}

function showFatal(root, err) {
  root.innerHTML = '';
  const pre = document.createElement('pre');
  pre.className = 'fatal';
  pre.textContent = String(err?.stack || err);
  root.appendChild(pre);
}

async function bootstrap() {
  const root = document.getElementById('app');
  if (!root) throw new Error('Missing #app root element');

  const store = new Store(createInitialState());
  const eventBus = new EventBus();

  // Load scenario early so prologue can reference it.
  const scenario = await loadJson('data/scenario.json');
  store.setState((s) => ({
    ...s,
    scenario,
    flags: {
      ...(s.flags || {}),
      ...(scenario?.initialFlagValues || {})
    }
  }));

  const sceneManager = new SceneManager(root, { store, eventBus });

  sceneManager.register('prologue', (ctx) => createPrologueScene({ ...ctx, sceneManager }));
  sceneManager.register('charter', (ctx) => createCharterScene({ ...ctx, sceneManager }));
  sceneManager.register('arrival', (ctx) => createArrivalScene({ ...ctx, sceneManager }));
  sceneManager.register('petitions', (ctx) => createPetitionScene({ ...ctx, sceneManager }));

  await sceneManager.goTo('prologue');
}

bootstrap().catch((err) => {
  console.error(err);
  const root = document.getElementById('app');
  if (root) showFatal(root, err);
});
