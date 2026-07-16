/**
 * Session scoring — every bubble answer merges into this object.
 * Product weights use the same keys (see catalogs/product.js).
 */

/** @typedef {Record<string, Record<string, number>>} ScoringState */

export const SCORE_DIMENSIONS = [
  "budget",
  "caffeine",
  "sweetness",
  "temperature",
  "heaviness",
  "foodPairing",
  "healthy",
];

/** @returns {ScoringState} */
export function createEmptyScoring() {
  return {
    budget: {},
    caffeine: {},
    sweetness: {},
    temperature: {},
    heaviness: {},
    foodPairing: {},
    healthy: {},
  };
}

/**
 * @param {ScoringState} scoring
 * @param {string} dimension
 * @param {Record<string, number>} deltas
 */
export function mergeScoring(scoring, dimension, deltas) {
  if (!deltas || typeof deltas !== "object") return;
  const bucket = scoring[dimension] ?? (scoring[dimension] = {});
  for (const [key, weight] of Object.entries(deltas)) {
    bucket[key] = (bucket[key] ?? 0) + weight;
  }
}

/**
 * @param {ScoringState} scoring
 * @param {Partial<Record<string, Record<string, number>>>} block
 */
export function mergeScoringBlock(scoring, block) {
  for (const [dimension, deltas] of Object.entries(block)) {
    mergeScoring(scoring, dimension, deltas);
  }
}

/** @type {Record<string, Partial<Record<string, Record<string, number>>>>} */
export const ANSWER_SCORING = {

  temp_hot: { temperature: { hot: 10, room: 2, iced: -6 } },
  temp_iced: { temperature: { iced: 10, room: 3, hot: -6 } },
  temp_any: { temperature: { hot: 2, iced: 2, room: 2 } },

  sweet_yes: { sweetness: { high: 9, medium: 6, low: -2, none: -4 } },
  sweet_no: { sweetness: { none: 6, low: 5, high: -4 } },
  sweet_maybe: { sweetness: { medium: 6, low: 3 } },

  caffeine_high: { caffeine: { high: 10, medium: 2, low: -4, none: -6 } },
  caffeine_medium: { caffeine: { medium: 10, high: 2, low: 4, none: 0 } },
  caffeine_low: { caffeine: { low: 10, none: 6, medium: 4, high: -5 } },
  caffeine_none: { caffeine: { none: 10, low: 5, medium: -3, high: -6 } },

  pair_none: { foodPairing: { none: 10, light: 2 } },
  pair_sweet: { foodPairing: { sweet: 10 } },
  pair_savory: { foodPairing: { savory: 10 } },

  budget_low: { budget: { low: 8, mid: 2, high: -4 } },
  budget_flexible: { budget: { mid: 6, high: 4, low: 2 } },
  budget_no: { budget: { high: 4, mid: 3 } },
};

/** @param {import('./logic.js').Session} session @param {string} answerId */
export function applyAnswerScoring(session, answerId) {
  const block = ANSWER_SCORING[answerId];
  if (block) mergeScoringBlock(session.scoring, block);
}

