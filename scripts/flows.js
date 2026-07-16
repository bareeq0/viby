/**
 * Digital barista flow — menu narrowing only (no mood / occasion questions).
 */

import { recommend } from "./recommendation-engine.js";
import { applyAnswerScoring } from "./scoring.js";
import { applyRejectFeedback } from "./recommendation-filters.js";
import {
  ANSWER_FILTERS,
  BRANCH_PLANS,
  filterMenuByAnswer,
  getFlowFilteredMenu,
  registerFlowFilterAnswer,
  stepNarrowsMenu,
  getActiveCategoryConfig,
} from "./menu-filter.js";

/** @typedef {{ id: string, message: string, quickReplies: { label: string, value: string }[] }} FlowStep */

export const ROOT_CRAVING_VALUES = new Set([
  "pick_coffee",
  "pick_matcha",
  "pick_cold",
  "pick_refresh",
  "pick_dessert",
  "pick_food",
  "pick_surprise",
]);

const REJECT_VALUES = new Set([
  "reject_expensive",
  "reject_sweet",
  "reject_stronger_coffee",
  "reject_colder",
  "reject_different",
]);


export const ATTRIBUTE_QUESTIONS = {
  temperature: {
    id: "temperature",
    message: "سخنة ولا ساقعة؟",
    quickReplies: [
      { label: "سخنة", value: "temp_hot" },
      { label: "ساقعة", value: "temp_iced" },
    ],
  },
  milk: {
    id: "milk",
    message: "باللبن ولا سادة؟",
    quickReplies: [
      { label: "باللبن", value: "milk_yes" },
      { label: "سادة", value: "milk_no" },
    ],
  },
  strength: {
    id: "strength",
    message: "قوية ولا ناعمة؟",
    quickReplies: [
      { label: "قوية", value: "strength_strong" },
      { label: "ناعمة", value: "strength_smooth" },
    ],
  },
  style: {
    id: "style",
    message: "كلاسيك ولا بنكهة؟",
    quickReplies: [
      { label: "كلاسيك", value: "matcha_classic" },
      { label: "بنكهة", value: "matcha_flavored" },
    ],
  },
  dessert_type: {
    id: "dessert_type",
    message: "إيه نوع التحلية؟",
    quickReplies: [
      { label: "شوكولاتة", value: "dessert_chocolate" },
      { label: "فواكه", value: "dessert_fruit" },
      { label: "تشيز كيك", value: "dessert_cheese" },
    ],
  },
  food_type: {
    id: "food_type",
    message: "إيه اللي في بالك؟",
    quickReplies: [
      { label: "كرواسون", value: "food_croissant" },
      { label: "ساندوتش", value: "food_sandwich" },
      { label: "سناك خفيف", value: "food_snack" },
    ],
  },
  sweetness: {
    id: "sweetness",
    message: "بتحب الحاجه مسكرة؟ 🍭",
    quickReplies: [
      { label: "🍭 مسكر", value: "sweet_yes" },
      { label: "🥛 هادي / سادة", value: "sweet_no" },
      { label: "⚖️ وسط", value: "sweet_maybe" },
    ],
  },
  budget: {
    id: "budget",
    message: "ميزانيتك إيه؟ 💸",
    quickReplies: [
      { label: "💸 اقتصادي", value: "budget_low" },
      { label: "💳 متوسط", value: "budget_flexible" },
      { label: "🤷 مش فارقة كتير", value: "budget_no" },
    ],
  },
};

const STEP_DEFS = {
  craving: {
    id: "craving",
    message: "إيه نفسك فيه النهارده؟ ☕",
    quickReplies: [
      { label: "☕ قهوة", value: "pick_coffee" },
      { label: "🍵 ماتشا", value: "pick_matcha" },
      { label: "🧊 حاجة ساقعة", value: "pick_cold" },
      { label: "🍹 مشروب منعش", value: "pick_refresh" },
      { label: "🍰 حاجة حلوة", value: "pick_dessert" },
      { label: "🥐 حاجة تاكلها", value: "pick_food" },
      { label: "✨ اختارلي", value: "pick_surprise" },
    ],
  },
  cold_direction: {
    id: "cold_direction",
    message: "حابب إيه في الساقع؟ 🧊",
    quickReplies: [
      { label: "☕ قهوة ساقعة", value: "surp_cold_coffee" },
      { label: "🍵 ماتشا ساقعة", value: "surp_cold_matcha" },
      { label: "🍹 مشروب منعش", value: "surp_cold_refresh" },
      { label: "✨ اختارلي", value: "surp_cold_any" },
    ],
  },
  surprise_direction: {
    id: "surprise_direction",
    message: "حابب تشرب إيه؟ 🍹",
    quickReplies: [
      { label: "☕ قهوة", value: "surp_coffee" },
      { label: "🍵 ماتشا", value: "surp_matcha" },
      { label: "🧊 مشروب ساقع", value: "surp_cold" },
      { label: "🥤 ريفريشر منعش", value: "surp_refresh" },
      { label: "🤷 مش فارقة", value: "surp_any" },
    ],
  },
  ...ATTRIBUTE_QUESTIONS,
};

const REJECT_STEP = {
  id: "reject_reason",
  message: "ولا يهمك 😄\n\nقولّي بس — إيه اللي ما عجبكش؟\n\nهظبطلك حاجة تانية.",
  quickReplies: [
    { label: "غالي شوية", value: "reject_expensive" },
    { label: "مسكّر أوي", value: "reject_sweet" },
    { label: "عايز قهوة أقوى", value: "reject_stronger_coffee" },
    { label: "عايز حاجة أبرد", value: "reject_colder" },
    { label: "حاجة تانية خالص", value: "reject_different" },
  ],
};

function slotKeyForValue(value) {
  if (ROOT_CRAVING_VALUES.has(value)) return "craving";
  if (REJECT_VALUES.has(value)) return "reject_reason";
  if (value.startsWith("surp_cold_")) return "cold_direction";
  if (value.startsWith("surp_")) return "surprise_direction";
  if (value.startsWith("sweet_")) return "sweetness";
  if (value.startsWith("budget_")) return "budget";
  for (const step of Object.values(STEP_DEFS)) {
    if (step.quickReplies.some((r) => r.value === value)) return step.id;
  }
  return "flow_answer";
}

/** @param {import('./logic.js').Session} session @param {FlowStep} def */
function presentStep(_session, def) {
  return {
    id: def.id,
    message: def.message,
    quickReplies: def.quickReplies,
  };
}

/** @param {import('./logic.js').Session} session */
function cloneForSimulation(session) {
  return {
    ...session,
    scoring: JSON.parse(JSON.stringify(session.scoring)),
    slots: { ...session.slots },
    flowFilterAnswers: [...(session.flowFilterAnswers ?? [])],
    recommendationConstraints: { ...(session.recommendationConstraints ?? {}) },
    rejectReasons: [...(session.rejectReasons ?? [])],
  };
}

/** @param {import('./logic.js').Session} session @param {string} value */
function applyAnswerToClone(session, value) {
  registerFlowFilterAnswer(session, value);
  applyAnswerScoring(session, value);
}

/** @param {import('./logic.js').Session} session */
function primaryPickId(session) {
  const result = recommend(session);
  return result.primary?.item?.id ?? null;
}

/** @param {import('./logic.js').Session} session @param {FlowStep} step */
function stepChangesRecommendation(session, step) {
  const menu = getFlowFilteredMenu(session);
  if (!stepNarrowsMenu(menu, step, session)) return false;

  /** @type {Set<string | null>} */
  const outcomes = new Set();
  for (const reply of step.quickReplies) {
    const sim = cloneForSimulation(session);
    applyAnswerToClone(sim, reply.value);
    outcomes.add(primaryPickId(sim));
  }
  if (outcomes.size <= 1) return false;
  return true;
}

/** @param {import('./logic.js').Session} session */
export async function applyFlowAnswer(value, session) {
  const key = slotKeyForValue(value);

  if (ROOT_CRAVING_VALUES.has(value)) {
    session.slots.craving = value;
    session.slots.branch = value;
    session.flowPlan = BRANCH_PLANS[value] ?? [];
    session.flowQuestionCount = 0;
  } else if (key === "reject_reason") {
    session.slots.reject_reason = value;
  } else if (key !== "flow_answer") {
    session.slots[key] = value;
    session.flowQuestionCount += 1;
  }

  if (ANSWER_FILTERS[value]) registerFlowFilterAnswer(session, value);
  applyAnswerScoring(session, value);
  await refreshRecommendations(session);
}

/** @param {import('./logic.js').Session} session */
export async function applyRejectAnswer(value, session) {
  session.slots.reject_reason = value;
  applyAnswerScoring(session, value);
  applyRejectFeedback(session, value);

  if (!session.rejectedProductIds) {
    session.rejectedProductIds = [];
  }
  const excludeIds = session.lastRecommendations.map((i) => i.id);
  for (const id of excludeIds) {
    if (!session.rejectedProductIds.includes(id)) {
      session.rejectedProductIds.push(id);
    }
  }
  const modifiers = [];
  if (value === "reject_different") modifiers.push("variety");

  const { recommend: recommendLazy } = await import("./recommend-load.js");
  const result = await recommendLazy(session, { excludeIds, modifiers });
  session.lastRecommendation = result;
  session.lastRecommendations = result.items;
}

/** @param {import('./logic.js').Session} session */
export async function refreshRecommendations(session) {
  const { recommend: recommendLazy } = await import("./recommend-load.js");
  const result = await recommendLazy(session);
  session.lastRecommendation = result;
  session.lastRecommendations = result.items;
}

/** @param {import('./logic.js').Session} session @returns {FlowStep | null} */
export function getNextFlowStep(session) {
  if (!session.slots.branch && !session.slots.craving) {
    return presentStep(session, STEP_DEFS.craving);
  }

  const craving = session.slots.craving;

  if (craving === "pick_surprise" && !session.slots.surprise_direction) {
    return presentStep(session, STEP_DEFS.surprise_direction);
  }
  
  if (craving === "pick_cold" && !session.slots.cold_direction) {
    return presentStep(session, STEP_DEFS.cold_direction);
  }

  const menu = getFlowFilteredMenu(session);

  // Stop Condition 1: Only one candidate remains
  if (menu.length <= 1) return null;

  // Stop Condition 2: Max 4 questions
  if (session.flowQuestionCount >= 4) return null;

  // Stop Condition 3: Recommendation confidence is high enough after 2+ questions
  if (session.flowQuestionCount >= 2 && session.lastRecommendation?.primary?.item) {
    const topConf = session.lastRecommendation.primary.item.confidence ?? 0;
    if (topConf >= 85) {
      return null;
    }
  }

  const config = getActiveCategoryConfig(session);
  if (!config) return null;

  if (!session.askedQuestions) {
    session.askedQuestions = [];
  }

  const unanswered = config.attributes.filter(
    (attrId) => !session.slots[attrId] && !session.askedQuestions.includes(attrId)
  );

  const usefulQuestions = unanswered
    .map((attrId) => {
      const def = ATTRIBUTE_QUESTIONS[attrId];
      if (!def) return null;

      const counts = def.quickReplies.map((reply) => {
        const next = filterMenuByAnswer(menu, reply.value, session);
        return next.length;
      });

      const validCounts = counts.filter((c) => c > 0);
      const validOutcomes = validCounts.length;

      // Question must reduce candidates (i.e. at least one option leaves less than total, and not all options leave 0 or same)
      const reducesCandidates = counts.some((c) => c < menu.length && c > 0);

      if (validOutcomes < 2 || !reducesCandidates) {
        return null;
      }

      // Calculate reduction in product candidates
      // Average remaining = Sum(c * c) / Sum(c)
      // Reduction = menu.length - Average remaining
      const total = counts.reduce((sum, c) => sum + c, 0);
      let expectedRemaining = menu.length;
      if (total > 0) {
        const sumSq = counts.reduce((sum, c) => sum + c * c, 0);
        expectedRemaining = sumSq / total;
      }
      const reduction = menu.length - expectedRemaining;

      const priority = config.priorities?.[attrId] ?? 10;

      return {
        id: attrId,
        def,
        reduction,
        priority,
      };
    })
    .filter(Boolean);

  // Stop Condition 4: No remaining useful questions exist
  if (usefulQuestions.length === 0) {
    return null;
  }

  // Sort: First by largest candidate reduction, second by config priority as tie-breaker
  usefulQuestions.sort((a, b) => {
    if (Math.abs(b.reduction - a.reduction) > 0.001) {
      return b.reduction - a.reduction;
    }
    return b.priority - a.priority;
  });

  const selectedStep = usefulQuestions[0];
  if (!session.askedQuestions.includes(selectedStep.id)) {
    session.askedQuestions.push(selectedStep.id);
  }

  return presentStep(session, selectedStep.def);
}

export function getRejectionFlowStep() {
  return REJECT_STEP;
}

export function isFlowAnswer(value) {
  if (ROOT_CRAVING_VALUES.has(value)) return true;
  if (REJECT_VALUES.has(value)) return false;
  if (value.startsWith("surp_") || value.startsWith("sweet_") || value.startsWith("budget_")) return true;
  for (const def of Object.values(STEP_DEFS)) {
    if (def.quickReplies.some((r) => r.value === value)) return true;
  }
  return false;
}

export function isRejectAnswer(value) {
  return REJECT_VALUES.has(value);
}

export function getOpeningFlowStep() {
  return STEP_DEFS.craving;
}
