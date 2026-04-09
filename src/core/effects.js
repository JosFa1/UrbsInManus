function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function uniqStrings(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const v = typeof item === 'string' ? item.trim() : '';
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

const FACTION_ALIASES = {
  elites: 'council',
  priests: 'council'
};

/**
 * Applies a simple effects object to the game state.
 * 
 * Supported:
 * - effects.treasuryDelta
 * - effects.orderDelta
 * - effects.stabilityDelta (legacy alias for orderDelta)
 * - effects.storesDelta
 * - effects.laborDelta
 * - effects.favorInRomeDelta
 * - effects.factionDeltas: { [factionId]: number }
 * - effects.traitDeltas: { [traitId]: number }
 * - effects.setFlags: string[]
 * - effects.clearFlags: string[]
 * - effects.flagValues: { [flagName]: any }
 * - effects.scheduledEffects: Array<{ afterTurns:number, effects:any, logText?:string }>
 * - effects.logText
 * - effects.logTexts: string[]
 *
 * @param {any} state
 * @param {any} effects
 */
export function applyEffects(state, effects) {
  const next = {
    ...state,
    economy: { ...state.economy },
    factions: { ...state.factions },
    traits: { ...(state.traits || {}) },
    flags: { ...(state.flags || {}) },
    scheduledEffects: Array.isArray(state.scheduledEffects) ? [...state.scheduledEffects] : [],
    log: Array.isArray(state.log) ? [...state.log] : [],
    petitions: {
      ...(state.petitions || {}),
      queue: Array.isArray(state.petitions?.queue) ? [...state.petitions.queue] : [],
      resolved: Array.isArray(state.petitions?.resolved) ? [...state.petitions.resolved] : []
    }
  };

  const treasuryDelta = num(effects?.treasuryDelta);
  next.economy.treasury = num(next.economy.treasury) + treasuryDelta;

  const orderDelta = num(effects?.orderDelta) + num(effects?.stabilityDelta);
  const nextOrder = clamp(num(next.order ?? next.stability) + orderDelta, 0, 100);
  next.order = nextOrder;
  // Keep legacy alias in sync so older UI/data doesn't explode.
  next.stability = nextOrder;

  const storesDelta = num(effects?.storesDelta);
  if (storesDelta !== 0) next.stores = clamp(num(next.stores) + storesDelta, 0, 100);

  const laborDelta = num(effects?.laborDelta);
  if (laborDelta !== 0) next.labor = clamp(num(next.labor) + laborDelta, 0, 100);

  const favorInRomeDelta = num(effects?.favorInRomeDelta);
  if (favorInRomeDelta !== 0) next.favorInRome = clamp(num(next.favorInRome) + favorInRomeDelta, 0, 100);

  const factionDeltas = effects?.factionDeltas || {};
  for (const [factionId, delta] of Object.entries(factionDeltas)) {
    if (factionId === 'rome') {
      next.favorInRome = clamp(num(next.favorInRome) + num(delta), 0, 100);
      continue;
    }

    const mappedId = FACTION_ALIASES[factionId] || factionId;
    if (!(mappedId in next.factions)) continue;
    next.factions[mappedId] = clamp(num(next.factions[mappedId]) + num(delta), 0, 100);
  }

  const localRelationsDelta = num(effects?.localRelationsDelta);
  if (localRelationsDelta !== 0 && 'locals' in next.factions) {
    next.factions.locals = clamp(num(next.factions.locals) + localRelationsDelta, 0, 100);
  }

  const traitDeltas = effects?.traitDeltas || {};
  for (const [traitId, delta] of Object.entries(traitDeltas)) {
    if (!(traitId in next.traits)) next.traits[traitId] = 50;
    next.traits[traitId] = clamp(num(next.traits[traitId]) + num(delta), 0, 100);
  }

  if (Array.isArray(effects?.setFlags)) {
    for (const flag of effects.setFlags) {
      if (!flag) continue;
      next.flags[String(flag)] = true;
    }
  }

  if (Array.isArray(effects?.clearFlags)) {
    for (const flag of effects.clearFlags) {
      if (!flag) continue;
      delete next.flags[String(flag)];
    }
  }

  if (isObject(effects?.flagValues)) {
    for (const [flag, value] of Object.entries(effects.flagValues)) {
      if (!flag) continue;
      next.flags[String(flag)] = value;
    }
  }

  if (Array.isArray(effects?.scheduledEffects)) {
    const baseTurn = num(next.turn);
    for (const item of effects.scheduledEffects) {
      const afterTurns = Math.max(0, Math.floor(num(item?.afterTurns)));
      const dueTurn = baseTurn + afterTurns;
      const scheduled = {
        dueTurn,
        effects: item?.effects || {},
        logText: item?.logText ? String(item.logText) : null
      };
      next.scheduledEffects.push(scheduled);
    }
  }

  const enqueuePetitions = uniqStrings(Array.isArray(effects?.enqueuePetitions) ? effects.enqueuePetitions : []);
  if (enqueuePetitions.length) {
    const existing = new Set(next.petitions.queue);
    for (const r of next.petitions.resolved) {
      const id = typeof r?.id === 'string' ? r.id : null;
      if (id) existing.add(id);
    }
    for (const id of enqueuePetitions) {
      if (existing.has(id)) continue;
      next.petitions.queue.push(id);
      existing.add(id);
    }
  }

  if (Array.isArray(effects?.schedulePetitions)) {
    const baseTurn = num(next.turn);
    for (const item of effects.schedulePetitions) {
      const afterTurns = Math.max(0, Math.floor(num(item?.afterTurns)));
      const dueTurn = baseTurn + afterTurns;
      const ids = uniqStrings(Array.isArray(item?.ids) ? item.ids : []);
      if (!ids.length) continue;
      next.scheduledEffects.push({
        dueTurn,
        effects: { enqueuePetitions: ids },
        logText: item?.logText ? String(item.logText) : null
      });
    }
  }

  if (Array.isArray(effects?.logTexts)) {
    for (const line of effects.logTexts) {
      if (!line) continue;
      next.log.push({
        t: Date.now(),
        text: String(line)
      });
    }
  } else if (effects?.logText) {
    next.log.push({
      t: Date.now(),
      text: String(effects.logText)
    });
  }

  return next;
}
