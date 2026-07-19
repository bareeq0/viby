/**
 * Domain logic — menu matching, scoring, session state, formatting.
 * Stable across cafés; does not contain partner copy or catalog data.
 */

import { createEmptyScoring } from "./scoring.js";

/** @typedef {import('./catalog.js').CatalogProduct} MenuItem */

/** @typedef {{ menu: MenuItem[], partner: object, turn: number, step: string, slots: object, flowPlan: string[] | null, flowQuestionCount: number, scoring: import('./scoring.js').ScoringState, lastRecommendations: MenuItem[], lastRecommendation: object | null, selectedItemId: string | null, rejectReasons: string[], recommendationConstraints: object }} Session */



export function resetJourney(session) {
  session.flowQuestionCount = 0;
  session.flowPlan = null;
  session.flowFilterAnswers = [];
  session.scoring = createEmptyScoring();
  session.slots = {
    craving: null,
    branch: null,
  };
  session.lastRecommendations = [];
  session.lastRecommendation = null;
  session.selectedItemId = null;
  session.rejectReasons = [];
  session.recommendationConstraints = {};
  session.journeyShownIds = [];
  session.rejectedProductIds = [];
  session.askedQuestions = [];
}

export function createSession(menu, partner) {
  const session = {
    menu,
    partner,
    turn: 0,
    step: "craving",
  };
  resetJourney(session);
  return session;
}

export function formatPrice(amount, currency = "EGP") {
  const locale = currency === "EGP" ? "ar-EG" : undefined;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function findItemByName(menu, name) {
  const query = name.trim().toLowerCase();
  return menu.find((item) => item.name.toLowerCase() === query) ?? null;
}

function scoreItem(item, signals) {
  let score = 0;
  for (const tag of signals) {
    if (item.tags.includes(tag)) score += 2;
  }
  if (signals.includes("vegan") && item.tags.includes("vegan")) score += 3;
  if (signals.includes("budget") && item.price <= 4) score += 2;
  if (signals.includes("premium") && item.price >= 5.5) score += 2;
  return score;
}

export function pickRecommendations(menu, signals, excludeIds = [], limit = 3) {
  const ranked = menu
    .map((item) => ({ item, score: scoreItem(item, signals) }))
    .filter((row) => row.score > 0 && !excludeIds.includes(row.item.id))
    .sort((a, b) => b.score - a.score || a.item.price - b.item.price);

  if (ranked.length === 0) return [];

  return ranked.slice(0, limit).map((row) => row.item);
}

/** Tags merged into the scorer for each flow bubble value. */
export const FLOW_ANSWER_SIGNALS = {
  budget_yes: ["budget"],
  budget_no: [],
};


/**
 * Build scorer tags from flow slots (see flows.js).
 * @param {Session} session
 * @returns {string[]}
 */
export function signalsFromFlowSession(session) {
  const signals = new Set();

  for (const slot of Object.values(session.slots)) {
    if (!slot || slot === "_skipped") continue;
    const tags = FLOW_ANSWER_SIGNALS[slot];
    if (tags) tags.forEach((t) => signals.add(t));
  }

  return [...signals];
}

/**
 * Derives match tags from user text and updates session slots.
 * @param {string} text
 * @param {Session} session
 * @returns {string[]}
 */
export function deriveSignals(text, session) {
  const normalized = text.toLowerCase();
  const signals = new Set();

  if (/\b(cold|iced|ice|chill|refresh)\b/.test(normalized)) {
    signals.add("cold");
    signals.add("refreshing");
    session.slots.temperature = "cold";
  }
  if (/\b(hot|warm|cozy|steamed)\b/.test(normalized)) {
    signals.add("warm");
    signals.add("comfort");
    session.slots.temperature = "warm";
  }

  if (/\b(vegan|plant|dairy.?free)\b/.test(normalized)) signals.add("vegan");
  if (/\b(veg|vegetarian)\b/.test(normalized)) signals.add("vegetarian");
  if (/\b(sweet|dessert|sugar|chocolate)\b/.test(normalized)) {
    signals.add("sweet");
    signals.add("treat");
  }
  if (/\b(savory|salty|lunch|dinner|food|eat|hungry|meal)\b/.test(normalized)) {
    signals.add("savory");
    signals.add("filling");
  }
  if (/\b(cheap|budget|affordable|under \$?5)\b/.test(normalized)) signals.add("budget");
  if (/\b(splurge|premium|fancy|special)\b/.test(normalized)) signals.add("premium");
  if (/\b(surprise|random|pick for me|you choose)\b/.test(normalized)) {
    signals.add("unique");
    signals.add("comfort");
  }
  if (/\b(coffee|espresso|caffeine)\b/.test(normalized)) signals.add("energy");
  if (/\b(tea|calm|relax)\b/.test(normalized)) {
    signals.add("light");
    signals.add("low-caffeine");
  }

  return [...signals];
}

export function applyFollowUpModifiers(text, session, signals) {
  const normalized = text.toLowerCase();
  if (/\bcheaper\b/.test(normalized)) signals.push("budget");
  if (/\b(colder|iced)\b/.test(normalized)) {
    signals.push("cold");
    session.slots.temperature = "cold";
  }
  if (/\bwarmer\b/.test(normalized)) signals.push("warm");
  return signals;
}

export function shouldExcludeLastPicks(text, followUpContext) {
  const normalized = text.toLowerCase();
  return (
    followUpContext &&
    /\b(another|different|else|again|similar)\b/.test(normalized)
  );
}

export function isResetCommand(text) {
  return /\b(restart|new chat|start over|reset)\b/i.test(text);
}

export function isThanksClosing(text, session) {
  return (
    /\b(thanks|thank you|ty|perfect|got it)\b/i.test(text) &&
    session.lastRecommendations.length > 0
  );
}

export function parseItemDetailRequest(text) {
  const match = text.match(/tell me more about (.+)/i);
  return match ? match[1].trim() : null;
}
