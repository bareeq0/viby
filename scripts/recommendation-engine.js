/**
 * Rule-based recommender — hard filters first, then catalog scoring only.
 * Every item returned must exist on session.menu (from catalog.js).
 */

import {
  getProductScores,
  pickComplementaryItem,
  productDisplayName,
  productExplainName,
} from "../catalogs/product.js";
import {
  activeConstraints,
  applyHardFilters,
  catalogEligibleMenu,
  constraintExplanationSnippet,
  hardFilterRejectReason,
  isFoodOrBakery,
} from "./recommendation-filters.js";
import {
  createEmptyScoring,
  SCORE_DIMENSIONS,
} from "./scoring.js";
import { getActiveCategoryConfig } from "./menu-filter.js";

/** @typedef {import('../catalogs/product.js').CatalogProduct} CatalogProduct */
/** @typedef {import('./logic.js').Session} Session */

/** @typedef {{
 *   primary: { item: CatalogProduct, score: number },
 *   secondary: { item: CatalogProduct, score: number } | null,
 *   pairing: { item: CatalogProduct } | null,
 *   alternatives: { item: CatalogProduct, score: number }[],
 *   items: CatalogProduct[],
 *   explanation: string,
 *   pairingLine: string,
 *   alternativesLine: string,
 *   compareLine: string,
 *   filterNotes: string[],
 *   scoreReasons: string[],
 * }} RecommendationResult */



/** @param {Session} session */
function ensureScoring(session) {
  if (!session.scoring) session.scoring = createEmptyScoring();
}

/**
 * Extra score weight when user wants sweet (flow or feedback).
 * @param {Session} session
 * @param {CatalogProduct} item
 */
function sweetPreferenceBonus(session, item) {
  const constraints = activeConstraints(session);
  if (!constraints.preferSweet) return 0;
  let bonus = 0;
  if (item.category === "dessert") bonus += 14;
  if (item.sweetness === "high") bonus += 10;
  else if (item.sweetness === "medium") bonus += 6;
  if (item.tags.includes("sweet") || item.tags.includes("dessert")) bonus += 4;
  return bonus;
}

/**
 * @param {CatalogProduct} item
 * @param {import('./scoring.js').ScoringState} scoring
 * @param {Session} session
 * @returns {{ total: number, parts: { dimension: string, key: string, contribution: number }[] }}
 */
function scoreProduct(item, scoring, session) {
  const weights = getProductScores(item);
  let total = 0;

  /** @type {{ dimension: string, key: string, contribution: number }[]} */
  const parts = [];

  for (const dimension of SCORE_DIMENSIONS) {
    const prefs = scoring[dimension];
    const productDim = weights[dimension];
    if (!prefs || !productDim) continue;
    const dimScale = dimension === "behavior" ? 0.16 : 0.1;
    for (const [key, prefWeight] of Object.entries(prefs)) {
      const affinity = productDim[key] ?? 0;
      const contribution = prefWeight * affinity * dimScale;
      if (contribution > 0) {
        total += contribution;
        parts.push({ dimension, key, contribution });
      }
    }
  }

  total += sweetPreferenceBonus(session, item);

  if (session.rejectedProductIds && session.rejectedProductIds.includes(item.id)) {
    total -= 1000;
  }

  parts.sort((a, b) => b.contribution - a.contribution);
  return { total, parts: parts.slice(0, 4) };
}

/** @param {CatalogProduct} item */
function productPitch(item) {
  const parts = [];
  if (item.caffeine === "high") parts.push("تصحّيك من غير ما تبقى تقيلة");
  else if (item.caffeine === "low" || item.caffeine === "none") parts.push("هادية على المعدة");
  if (item.temperature === "hot") parts.push("سخنة ومريحة");
  if (item.temperature === "iced") parts.push("ساقعة ومنعشة");
  if (item.category === "food") parts.push("تسد جوعك");
  if (item.category === "dessert") parts.push("تحليّة على قدّها");
  const desc = item.descriptionAr || item.description;
  if (parts.length === 0 && desc) return desc;
  return parts.filter(Boolean).join(" — ") || desc;
}



/** @param {{ dimension: string, key: string, contribution: number }[]} parts */
function scoreReasonPhrases(parts) {
  /** @type {string[]} */
  const phrases = [];
  for (const p of parts) {
    if (p.dimension === "temperature" && p.key === "iced") phrases.push("ساقعة زي ما قلت");
    if (p.dimension === "temperature" && p.key === "hot") phrases.push("سخنة");
    if (p.dimension === "caffeine" && p.key === "high") phrases.push("تفوقك");
    if (p.dimension === "budget" && p.key === "low") phrases.push("أخف على الجيب");
    if (p.dimension === "foodPairing" && p.key === "sweet") phrases.push("تحلية في محلها");
  }
  return [...new Set(phrases)].slice(0, 3);
}

/**
 * @param {Session} session
 * @param {CatalogProduct} primary
 * @param {string[]} filterNotes
 * @param {string[]} scoreReasons
 */
export function buildExplanation(session, primary, filterNotes, scoreReasons) {
  const name = productExplainName(primary);
  const pitch = productPitch(primary);

  /** @type {string[]} */
  const why = [...filterNotes, ...scoreReasons];
  const whyText =
    why.length > 0 ? ` لأن ${why.slice(0, 2).join(" و")}` : "";

  if (pitch) {
    return `هظبطلك **${name}**${whyText}. ${pitch}.`;
  }
  return `هظبطلك **${name}**${whyText}.`;
}

/** @param {CatalogProduct} drink @param {CatalogProduct} pairing @param {Session} [session] */
export function buildPairingLine(drink, pairing, session) {
  const p = productDisplayName(pairing);
  if (pairing.category === "dessert" || pairing.category === "food") {
    return `**${p}** من المنيو كمان يظبط معاه.`;
  }
  const d = productDisplayName(drink);
  return `**${p}** يكمّل **${d}** حلو.`;
}

/** @param {{ item: CatalogProduct, score: number }[]} rows */
export function buildAlternativesLine(rows) {
  const alts = rows.slice(1, 3);
  if (alts.length === 0) return "";
  const n0 = productDisplayName(alts[0].item);
  if (alts.length === 1) {
    return `لو حابب غيرها، **${n0}** كمان قريبة من اللي في بالك.`;
  }
  const n1 = productDisplayName(alts[1].item);
  return `لو حابب غيرها: **${n0}** أو **${n1}** من المنيو.`;
}

/**
 * Pick pairing from catalog menu with the same hard filters.
 * @param {CatalogProduct} primary
 * @param {CatalogProduct[]} filteredMenu
 * @param {Set<string>} excludeIds
 * @param {Session} session
 */
function pickPairingFromCatalog(primary, filteredMenu, excludeIds, session) {
  const constraints = activeConstraints(session);
  if (constraints.drinksOnly) return null;
  if ((session.scoring.foodPairing?.none ?? 0) >= 10) return null;

  const pairing = pickComplementaryItem(primary, filteredMenu, excludeIds);
  if (!pairing) return null;
  if (hardFilterRejectReason(pairing, constraints)) return null;
  return pairing;
}

/**
 * Complementary food/dessert for a drink the user picked (catalog pairings only).
 * @param {Session} session
 * @param {CatalogProduct} primaryItem
 * @returns {CatalogProduct | null}
 */
export function complementaryForPrimary(session, primaryItem) {
  if (!primaryItem || isFoodOrBakery(primaryItem)) return null;
  ensureScoring(session);

  const baseMenu = catalogEligibleMenu(session, { excludeIds: new Set() });
  let { items: filteredMenu } = applyHardFilters(
    baseMenu,
    activeConstraints(session)
  );
  if (filteredMenu.length === 0 && baseMenu.length > 0) filteredMenu = baseMenu;

  return pickPairingFromCatalog(
    primaryItem,
    filteredMenu,
    new Set([primaryItem.id]),
    session
  );
}

/**
 * @param {Session} session
 * @param {{ excludeIds?: string[], modifiers?: string[] }} [options]
 * @returns {RecommendationResult}
 */
function getTheoreticalMaxScore(session) {
  let maxScore = 0;
  for (const dimension of SCORE_DIMENSIONS) {
    const prefs = session.scoring[dimension];
    if (!prefs || Object.keys(prefs).length === 0) continue;
    const dimScale = dimension === "behavior" ? 0.16 : 0.1;
    let maxDimContrib = 0;
    for (const [key, prefWeight] of Object.entries(prefs)) {
      if (prefWeight > 0) {
        const contribution = prefWeight * 10 * dimScale;
        maxDimContrib += contribution;
      }
    }
    maxScore += maxDimContrib;
  }
  const constraints = activeConstraints(session);
  if (constraints.preferSweet) {
    maxScore += 28;
  }
  return maxScore > 0 ? maxScore : 10;
}

export function getConfidenceLabel(confidence) {
  if (confidence >= 95) return "🎯 مرشح بقوة";
  if (confidence >= 90) return "✅ مرشح لك";
  if (confidence >= 75) return "💡 يستحق التجربة";
  return "🤔 خيارات كتيرة ممتازة";
}

export function buildExplanationTwo(session, primary, secondary, filterNotes, scoreReasons) {
  const name1 = productExplainName(primary);
  const name2 = productExplainName(secondary);

  const why = [...filterNotes, ...scoreReasons];
  const whyText =
    why.length > 0 ? ` لأنهم ${why.slice(0, 2).join(" و")}` : "";

  return `لقيتلك ترشيحين حلوين يظبطوا معاك${whyText}: **${name1}** أو **${name2}**.`;
}

/**
 * @param {Session} session
 * @param {{ excludeIds?: string[], modifiers?: string[] }} [options]
 * @returns {RecommendationResult}
 */
export function recommend(session, options = {}) {
  ensureScoring(session);

  const excludeIds = new Set(options.excludeIds ?? []);
  if (options.modifiers?.includes("budget")) {
    session.scoring.budget.low = (session.scoring.budget.low ?? 0) + 8;
  }

  const constraints = activeConstraints(session);
  let baseMenu = catalogEligibleMenu(session, { excludeIds });
  const config = getActiveCategoryConfig(session);
  if (config && config.filter) {
    baseMenu = baseMenu.filter((item) => config.filter(item, session));
  }
  let { items: filteredMenu, applied } = applyHardFilters(baseMenu, constraints);

  /** @type {string[]} */
  const filterNotes = [];
  for (const flag of applied) {
    if (flag === "maxPrice") {
      filterNotes.push(
        constraintExplanationSnippet(constraints, "price_ceiling") || ""
      );
    }
    if (flag === "noHotOnly") {
      filterNotes.push(constraintExplanationSnippet(constraints, "hot_only") || "");
    }
    if (flag === "drinksOnly") {
      filterNotes.push(constraintExplanationSnippet(constraints, "drinks_only") || "");
    }
    if (flag === "avoidSweet") {
      filterNotes.push(constraintExplanationSnippet(constraints, "avoid_sweet") || "");
    }
  }

  if (filteredMenu.length === 0 && baseMenu.length > 0) {
    filteredMenu = baseMenu;
    filterNotes.push("مفيش حاجة تعدّي كل اللي قلته — دي أقرب حاجة على المنيو");
  }

  const maxScore = getTheoreticalMaxScore(session);
  const getConfidence = (score) => Math.min(100, Math.max(10, Math.round((score / maxScore) * 100)));

  const ranked = filteredMenu
    .map((item) => {
      const scored = scoreProduct(item, session.scoring, session);
      const conf = getConfidence(scored.total);
      const clonedItem = { ...item, confidence: conf };
      return {
        item: clonedItem,
        score: scored.total,
        parts: scored.parts,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.price - b.item.price ||
        a.item.id.localeCompare(b.item.id)
    );

  const primary = ranked[0] ?? null;
  const primaryItem = primary?.item ?? null;

  const second = ranked[1] ?? null;
  const secondItem = second?.item ?? null;

  const showSecondary = primaryItem && secondItem && Math.abs(primaryItem.confidence - secondItem.confidence) <= 5;

  const mainIds = new Set([primaryItem?.id, showSecondary ? secondItem?.id : null].filter(Boolean));
  const pairingItem =
    primaryItem && !isFoodOrBakery(primaryItem)
      ? pickPairingFromCatalog(
          primaryItem,
          filteredMenu,
          new Set([...excludeIds, ...mainIds]),
          session
        )
      : null;

  /** @type {CatalogProduct[]} */
  const items = [];
  if (primaryItem) items.push(primaryItem);
  if (showSecondary && secondItem) items.push(secondItem);

  const scoreReasons = primary ? scoreReasonPhrases(primary.parts) : [];

  let explanation = "";
  if (primaryItem) {
    if (showSecondary && secondItem) {
      explanation = buildExplanationTwo(
        session,
        primaryItem,
        secondItem,
        filterNotes.filter(Boolean),
        scoreReasons
      );
    } else {
      explanation = buildExplanation(
        session,
        primaryItem,
        filterNotes.filter(Boolean),
        scoreReasons
      );
    }
  } else {
    explanation = "مش لاقي حاجة على المنيو تمشي مع اللي قلته — دوس «مش دي» وقولّي تاني.";
  }

  const pairingLine =
    pairingItem && primaryItem
      ? buildPairingLine(primaryItem, pairingItem, session)
      : "";

  return {
    primary: { item: primaryItem, score: primary?.score ?? 0 },
    secondary: showSecondary ? { item: secondItem, score: second?.score ?? 0 } : null,
    pairing: pairingItem ? { item: pairingItem } : null,
    alternatives: showSecondary ? ranked.slice(2, 5) : ranked.slice(1, 4),
    items,
    explanation,
    pairingLine,
    alternativesLine: buildAlternativesLine(ranked, showSecondary),
    compareLine: "",
    filterNotes: filterNotes.filter(Boolean),
    scoreReasons,
  };
}

export function collectAttributePrefs(session) {
  ensureScoring(session);
  return session.scoring;
}
