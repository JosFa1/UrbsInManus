function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function toInt(n) {
  return Math.floor(num(n));
}

function pickIntInclusive(rng, min, max) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const span = hi - lo + 1;
  const r = rng();
  if (!Number.isFinite(r)) return lo;
  return lo + Math.floor(clamp(r, 0, 0.999999) * span);
}

const GROUP_ALIASES = {
  elites: 'council',
  priests: 'council'
};

function getOrder(state) {
  return num(state?.order ?? state?.stability);
}

function getStat(state, key) {
  switch (key) {
    case 'order':
      return getOrder(state);
    case 'stores':
      return num(state?.stores);
    case 'labor':
      return num(state?.labor);
    case 'favorInRome':
      return num(state?.favorInRome);
    case 'treasury':
      return num(state?.economy?.treasury);
    case 'locals':
    case 'localRelations':
      return num(state?.factions?.locals);
    default:
      return 0;
  }
}

function getFaction(state, factionId) {
  if (factionId === 'rome') return num(state?.favorInRome);
  if (factionId === 'localRelations') return num(state?.factions?.locals);
  return num(state?.factions?.[factionId]);
}

function getTrait(state, traitId) {
  const raw = state?.traits?.[traitId];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return 50;
}

function hasFlag(state, flagName) {
  return Boolean(state?.flags && state.flags[flagName]);
}

function compare(value, op, target) {
  switch (op) {
    case '>':
      return value > target;
    case '>=':
      return value >= target;
    case '<':
      return value < target;
    case '<=':
      return value <= target;
    case '==':
      return value === target;
    case '!=':
      return value !== target;
    default:
      return false;
  }
}

function evalCheck(state, check) {
  const kind = String(check?.kind || '');
  const op = String(check?.op || '>=');
  const target = num(check?.value);
  const weightIfTrue = num(check?.weight ?? check?.weightIfTrue);
  const weightIfFalse = num(check?.weightIfFalse);

  let ok = false;
  if (kind === 'stat') {
    ok = compare(getStat(state, String(check?.key || '')), op, target);
  } else if (kind === 'faction') {
    ok = compare(getFaction(state, String(check?.id || '')), op, target);
  } else if (kind === 'trait') {
    ok = compare(getTrait(state, String(check?.id || '')), op, target);
  } else if (kind === 'flag') {
    const exists = hasFlag(state, String(check?.id || ''));
    const desired = check?.value === undefined ? true : Boolean(check.value);
    ok = exists === desired;
  } else if (kind === 'treasury') {
    ok = compare(getStat(state, 'treasury'), op, target);
  }

  return ok ? weightIfTrue : weightIfFalse;
}

function biasFromMeter(value, weight) {
  // Center meters at 50; treat 10 points as ~1 score unit.
  return ((value - 50) / 10) * weight;
}

function mergeDeltaObjects(a, b) {
  const out = {};
  if (isObject(a)) {
    for (const [k, v] of Object.entries(a)) out[k] = num(v);
  }
  if (isObject(b)) {
    for (const [k, v] of Object.entries(b)) out[k] = num(out[k]) + num(v);
  }
  return out;
}

function mergeFlagValues(a, b) {
  const out = {};
  if (isObject(a)) {
    for (const [k, v] of Object.entries(a)) out[k] = v;
  }
  if (isObject(b)) {
    for (const [k, v] of Object.entries(b)) out[k] = v;
  }
  return out;
}

function mergeStringArrays(a, b) {
  const out = [];
  const seen = new Set();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const s = String(item || '').trim();
      if (!s) continue;
      if (seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function mergeScheduledEffects(a, b) {
  const out = [];
  if (Array.isArray(a)) out.push(...a);
  if (Array.isArray(b)) out.push(...b);
  return out;
}

function mergeObjectArrays(a, b) {
  const out = [];
  if (Array.isArray(a)) out.push(...a);
  if (Array.isArray(b)) out.push(...b);
  return out;
}

function mergeEffects(baseEffects, extraEffects) {
  const base = baseEffects || {};
  const extra = extraEffects || {};

  const merged = {
    treasuryDelta: num(base.treasuryDelta) + num(extra.treasuryDelta),
    orderDelta: num(base.orderDelta) + num(extra.orderDelta),
    // Support legacy stabilityDelta at call-sites by letting applyEffects add it.
    stabilityDelta: num(base.stabilityDelta) + num(extra.stabilityDelta),
    storesDelta: num(base.storesDelta) + num(extra.storesDelta),
    laborDelta: num(base.laborDelta) + num(extra.laborDelta),
    favorInRomeDelta: num(base.favorInRomeDelta) + num(extra.favorInRomeDelta),
    localRelationsDelta: num(base.localRelationsDelta) + num(extra.localRelationsDelta),
    factionDeltas: mergeDeltaObjects(base.factionDeltas, extra.factionDeltas),
    traitDeltas: mergeDeltaObjects(base.traitDeltas, extra.traitDeltas),
    setFlags: mergeStringArrays(base.setFlags, extra.setFlags),
    clearFlags: mergeStringArrays(base.clearFlags, extra.clearFlags),
    flagValues: mergeFlagValues(base.flagValues, extra.flagValues),
    scheduledEffects: mergeScheduledEffects(base.scheduledEffects, extra.scheduledEffects),
    enqueuePetitions: mergeStringArrays(base.enqueuePetitions, extra.enqueuePetitions),
    schedulePetitions: mergeObjectArrays(base.schedulePetitions, extra.schedulePetitions)
  };

  const logTexts = mergeStringArrays(base.logTexts, extra.logTexts);
  if (base.logText) logTexts.push(String(base.logText));
  if (extra.logText) logTexts.push(String(extra.logText));
  if (logTexts.length > 0) merged.logTexts = logTexts;

  return merged;
}

function resolveBand(score, thresholds) {
  // Defaults are tuned so banded outcomes are reachable
  // with typical early-game meters and a small luck roll.
  const strong = num(thresholds?.strong ?? 2.5);
  const mixed = num(thresholds?.mixed ?? -0.5);

  if (score >= strong) return 'strong';
  if (score >= mixed) return 'mixed';
  return 'bad';
}

export function resolvePetitionOption({ state, petition, option, rng = Math.random }) {
  const roll = option?.roll || petition?.roll || {};

  const luckMin = toInt(roll.luckMin ?? -2);
  const luckMax = toInt(roll.luckMax ?? 2);
  const luck = pickIntInclusive(rng, luckMin, luckMax);

  const groupId = GROUP_ALIASES[petition?.group] || petition?.group;
  const groupMeter = groupId === 'rome' ? getStat(state, 'favorInRome') : getFaction(state, String(groupId || ''));

  const scoreParts = {
    base: num(roll.base),
    order: biasFromMeter(getOrder(state), num(roll.orderWeight ?? 0.6)),
    group: biasFromMeter(groupMeter, num(roll.groupWeight ?? 0.8)),
    bias: 0,
    checks: 0,
    luck
  };

  if (isObject(roll.statBias)) {
    for (const [key, weight] of Object.entries(roll.statBias)) {
      scoreParts.bias += biasFromMeter(getStat(state, key), num(weight));
    }
  }

  if (isObject(roll.factionBias)) {
    for (const [factionId, weight] of Object.entries(roll.factionBias)) {
      scoreParts.bias += biasFromMeter(getFaction(state, factionId), num(weight));
    }
  }

  if (isObject(roll.traitBias)) {
    for (const [traitId, weight] of Object.entries(roll.traitBias)) {
      scoreParts.bias += biasFromMeter(getTrait(state, traitId), num(weight));
    }
  }

  if (Array.isArray(roll.checks)) {
    for (const check of roll.checks) scoreParts.checks += evalCheck(state, check);
  }

  const rawScore =
    scoreParts.base +
    scoreParts.order +
    scoreParts.group +
    scoreParts.bias +
    scoreParts.checks +
    scoreParts.luck;

  const band = resolveBand(rawScore, roll.thresholds);

  const outcomes = option?.outcomes;
  const bandOutcome = outcomes && (outcomes[band] || outcomes.mixed || outcomes.default);

  const mergedEffects = mergeEffects(option?.effects, bandOutcome?.effects);

  const resultText = bandOutcome?.resultText || bandOutcome?.result || null;

  return {
    band,
    score: rawScore,
    luck,
    effects: mergedEffects,
    resultText
  };
}

function meetsMinimums(currentValue, minValue) {
  if (minValue === undefined || minValue === null) return true;
  return num(currentValue) >= num(minValue);
}

function meetsMaximums(currentValue, maxValue) {
  if (maxValue === undefined || maxValue === null) return true;
  return num(currentValue) <= num(maxValue);
}

export function isPetitionEligible(state, petition) {
  if (!petition) return false;

  if (Array.isArray(petition.requiresFlags)) {
    for (const flag of petition.requiresFlags) {
      if (!hasFlag(state, String(flag))) return false;
    }
  }

  if (Array.isArray(petition.requiresAnyFlags) && petition.requiresAnyFlags.length > 0) {
    let ok = false;
    for (const flag of petition.requiresAnyFlags) {
      if (hasFlag(state, String(flag))) {
        ok = true;
        break;
      }
    }
    if (!ok) return false;
  }

  if (Array.isArray(petition.forbidsFlags)) {
    for (const flag of petition.forbidsFlags) {
      if (hasFlag(state, String(flag))) return false;
    }
  }

  if (Array.isArray(petition.forbidsAnyFlags) && petition.forbidsAnyFlags.length > 0) {
    for (const flag of petition.forbidsAnyFlags) {
      if (hasFlag(state, String(flag))) return false;
    }
  }

  if (isObject(petition.minStats)) {
    for (const [key, minValue] of Object.entries(petition.minStats)) {
      if (!meetsMinimums(getStat(state, key), minValue)) return false;
    }
  }

  if (isObject(petition.maxStats)) {
    for (const [key, maxValue] of Object.entries(petition.maxStats)) {
      if (!meetsMaximums(getStat(state, key), maxValue)) return false;
    }
  }

  if (isObject(petition.minFactions)) {
    for (const [factionId, minValue] of Object.entries(petition.minFactions)) {
      if (!meetsMinimums(getFaction(state, factionId), minValue)) return false;
    }
  }

  if (isObject(petition.maxFactions)) {
    for (const [factionId, maxValue] of Object.entries(petition.maxFactions)) {
      if (!meetsMaximums(getFaction(state, factionId), maxValue)) return false;
    }
  }

  if (isObject(petition.minTraits)) {
    for (const [traitId, minValue] of Object.entries(petition.minTraits)) {
      if (!meetsMinimums(getTrait(state, traitId), minValue)) return false;
    }
  }

  if (isObject(petition.maxTraits)) {
    for (const [traitId, maxValue] of Object.entries(petition.maxTraits)) {
      if (!meetsMaximums(getTrait(state, traitId), maxValue)) return false;
    }
  }

  return true;
}
