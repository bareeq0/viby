/**
 * Hard filters applied before scoring — catalog products only.
 */

/** @typedef {import('../catalogs/product.js').CatalogProduct} CatalogProduct */
/** @typedef {import('./logic.js').Session} Session */

/** @typedef {{
 *   maxPrice?: number,
 *   noHotOnly?: boolean,
 *   drinksOnly?: boolean,
 *   avoidSweet?: boolean,
 *   preferSweet?: boolean,
 * }} RecommendationConstraints */

/** @param {CatalogProduct} item */
export function isFoodOrBakery(item) {
  return item.category === "dessert" || item.category === "food";
}

/** @param {CatalogProduct} item */
export function isHotOnly(item) {
  return item.temperature === "hot";
}

/** @param {CatalogProduct} item */
export function isSweetItem(item) {
  if (item.category === "dessert") return true;
  return item.sweetness === "high" || item.sweetness === "medium";
}

/** @param {Session} session */
export function ensureRecommendationConstraints(session) {
  if (!session.recommendationConstraints) {
    session.recommendationConstraints = /** @type {RecommendationConstraints} */ ({});
  }
  if (!session.rejectReasons) session.rejectReasons = [];
}

/** @param {Session} session */
function inferDrinksOnlyFromFlow(session) {
  const craving = session.slots.friends_craving;
  if (craving === "friends_drinks") return true;

  const datePref = session.slots.date_preference;
  if (datePref === "date_coffee" || datePref === "date_cold_drink") return true;

  const relax = session.slots.relax_mood;
  if (relax === "relax_coffee_calm" || relax === "relax_matcha") return true;

  if (session.slots.quick_mood) return true;

  const gym = session.slots.gym_want;
  if (gym === "gym_protein" || gym === "gym_refresh") return true;

  const none = session.scoring?.foodPairing?.none ?? 0;
  const sweet = session.scoring?.foodPairing?.sweet ?? 0;
  const savory = session.scoring?.foodPairing?.savory ?? 0;
  if (none >= 10 && sweet < 8 && savory < 8) return true;

  return false;
}

/** @param {Session} session */
function inferPreferSweetFromFlow(session) {
  const craving = session.slots.friends_craving;
  if (craving === "friends_dessert" || craving === "friends_both") return true;
  if (session.slots.date_preference === "date_sweet") return true;
  if (session.slots.relax_mood === "relax_dessert") return true;
  if (session.slots.firstvisit_pick === "first_sweet") return true;

  const sweetFp = session.scoring?.foodPairing?.sweet ?? 0;
  const sweetPref = session.scoring?.sweetness?.high ?? 0;
  return sweetFp >= 8 || sweetPref >= 8;
}

/**
 * Record user feedback and tighten constraints before the next recommend pass.
 * @param {Session} session
 * @param {string} rejectValue
 */
export function applyRejectFeedback(session, rejectValue) {
  ensureRecommendationConstraints(session);
  session.rejectReasons.push(rejectValue);

  const constraints = session.recommendationConstraints;
  const anchorPrice = session.lastRecommendation?.primary?.item?.price;

  if (rejectValue === "reject_expensive" && typeof anchorPrice === "number") {
    constraints.maxPrice =
      constraints.maxPrice == null
        ? anchorPrice
        : Math.min(constraints.maxPrice, anchorPrice);
  }

  if (rejectValue === "reject_colder") {
    constraints.noHotOnly = true;
  }

  if (rejectValue === "reject_sweet") {
    constraints.avoidSweet = true;
  }

  if (rejectValue === "reject_not_hungry") {
    constraints.drinksOnly = true;
  }
}

/**
 * @param {Session} session
 * @returns {RecommendationConstraints}
 */
export function activeConstraints(session) {
  ensureRecommendationConstraints(session);
  const c = { ...session.recommendationConstraints };

  if (c.drinksOnly !== true && inferDrinksOnlyFromFlow(session)) {
    c.drinksOnly = true;
  }
  if (inferPreferSweetFromFlow(session)) {
    c.preferSweet = true;
  }

  return c;
}

/**
 * @param {CatalogProduct} item
 * @param {RecommendationConstraints} constraints
 * @returns {string | null} reason if excluded
 */
export function hardFilterRejectReason(item, constraints) {
  if (constraints.maxPrice != null && item.price >= constraints.maxPrice) {
    return "price_ceiling";
  }
  if (constraints.noHotOnly && isHotOnly(item)) {
    return "hot_only";
  }
  if (constraints.drinksOnly && isFoodOrBakery(item)) {
    return "drinks_only";
  }
  if (constraints.avoidSweet && isSweetItem(item)) {
    return "avoid_sweet";
  }
  return null;
}

/**
 * Catalog menu only — available, recommendable products.
 * @param {Session} session
 * @param {{ excludeIds?: Set<string> }} [options]
 * @returns {CatalogProduct[]}
 */
export function catalogEligibleMenu(session, options = {}) {
  const excludeIds = options.excludeIds ?? new Set();
  return session.menu.filter(
    (item) =>
      item &&
      typeof item.id === "string" &&
      item.availability === true &&
      item.recommendable !== false &&
      !excludeIds.has(item.id)
  );
}

/**
 * @param {CatalogProduct[]} menu
 * @param {RecommendationConstraints} constraints
 * @returns {{ items: CatalogProduct[], applied: string[] }}
 */
export function applyHardFilters(menu, constraints) {
  /** @type {string[]} */
  const applied = [];
  if (constraints.maxPrice != null) applied.push("maxPrice");
  if (constraints.noHotOnly) applied.push("noHotOnly");
  if (constraints.drinksOnly) applied.push("drinksOnly");
  if (constraints.avoidSweet) applied.push("avoidSweet");

  const items = menu.filter((item) => !hardFilterRejectReason(item, constraints));
  return { items, applied };
}

/** @param {RecommendationConstraints} constraints @param {string} code */
export function constraintExplanationSnippet(constraints, code) {
  if (code === "price_ceiling" && constraints.maxPrice != null) {
    return "شيلنا اللي أغلى من اللي كان غالي عليك";
  }
  if (code === "hot_only") {
    return "سيبنا اللي ساقعة — زي ما قلت";
  }
  if (code === "drinks_only") {
    return "مشوار مشروب بس — من غير حلو";
  }
  if (code === "avoid_sweet") {
    return "شيلنا الحاجات المسكرة";
  }
  return "";
}
