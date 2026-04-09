import { loadJson } from '../core/data.js';
import { applyEffects } from '../core/effects.js';
import { createDialoguePlayer } from '../ui/dialoguePlayer.js';

function expandDialoguePools(dialogue) {
  const pools = dialogue?.pools || {};
  const lines = Array.isArray(dialogue?.lines) ? dialogue.lines : [];

  const expanded = [];
  for (const line of lines) {
    const poolId = line?.pickOneFromPool;
    if (poolId && Array.isArray(pools?.[poolId]) && pools[poolId].length > 0) {
      const pool = pools[poolId];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      if (picked) expanded.push(picked);
      continue;
    }

    expanded.push(line);
  }

  return {
    ...dialogue,
    lines: expanded
  };
}

export function createPrologueScene({ store, eventBus, sceneManager }) {
  /** @type {ReturnType<typeof createDialoguePlayer> | null} */
  let player = null;

  return {
    async mount(root) {
      const scenario = store.getState().scenario;
      const dialogue = expandDialoguePools(await loadJson('data/prologue.json'));

      player = createDialoguePlayer({
        dialogue: {
          ...dialogue,
          // Allow data to reference scenario values later.
          meta: { scenario }
        },
        eventBus,
        onChoice: ({ choice }) => {
          if (!choice?.effects) return;
          store.setState((s) => applyEffects(s, choice.effects));
        },
        onDone: () => sceneManager.goTo('charter')
      });

      root.appendChild(player.el);
    },

    unmount() {
      player?.destroy();
      player = null;
    }
  };
}
