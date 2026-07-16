/**
 * Product knowledge base — rich metadata + behavior scores for the recommender.
 */

export const IMAGE_PLACEHOLDER = "assets/products/placeholder.svg";

/** @typedef {'hot' | 'iced' | 'room'} ProductTemperature */
/** @typedef {'none' | 'low' | 'medium' | 'high'} ProductLevel */
/** @typedef {'low' | 'medium' | 'high'} ProductEnergy */
/** @typedef {'none' | 'dairy' | 'oat' | 'coconut' | 'mixed'} ProductMilk */
/** @typedef {'low' | 'medium' | 'high'} ProductHeaviness */

/** @typedef {'study' | 'work' | 'friends' | 'date' | 'relaxing' | 'instagram' | 'morning' | 'evening' | 'quickVisit' | 'longStay'} BehaviorKey */

export const BEHAVIOR_KEYS = /** @type {const} */ ([
  "study",
  "work",
  "friends",
  "date",
  "relaxing",
  "instagram",
  "morning",
  "evening",
  "quickVisit",
  "longStay",
]);

/**
 * @typedef {Record<BehaviorKey, number>} BehaviorScores
 *
 * @typedef {Object} ProductEngineScores
 * @property {BehaviorScores} behavior
 * @property {Record<string, number>} budget
 * @property {Record<string, number>} caffeine
 * @property {Record<string, number>} sweetness
 * @property {Record<string, number>} temperature
 * @property {Record<string, number>} heaviness
 * @property {Record<string, number>} foodPairing
 * @property {Record<string, number>} healthy
 *
 * @typedef {Object} CatalogProduct
 * @property {string} id
 * @property {string} name — display name (Arabic preferred)
 * @property {string} nameAr
 * @property {string} nameEn
 * @property {string} category
 * @property {number} price
 * @property {string} currency
 * @property {string} image
 * @property {boolean} availability
 * @property {string} description — short Arabic description
 * @property {string} descriptionAr
 * @property {ProductLevel} caffeine
 * @property {ProductLevel} sweetness
 * @property {ProductTemperature} temperature
 * @property {ProductMilk} milk
 * @property {ProductEnergy} energy
 * @property {ProductHeaviness} heaviness
 * @property {number} healthyScore — 0 (indulgent) … 10 (very light/healthy)
 * @property {BehaviorScores} behavior
 * @property {string[]} dessertPairing — product ids and/or shared tags
 * @property {string[]} drinkPairing
 * @property {string[]} tags
 * @property {ProductEngineScores} scores
 * @property {boolean} [recommendable]
 * @property {string[]} [recommendedFor] — legacy; merged into behavior on import
 * @property {boolean} [healthy] — legacy
 */

/** @returns {BehaviorScores} */
export function defaultBehaviorScores() {
  return {
    study: 3,
    work: 3,
    friends: 3,
    date: 3,
    relaxing: 3,
    instagram: 3,
    morning: 3,
    evening: 3,
    quickVisit: 3,
    longStay: 3,
  };
}

/** @param {string} text */
function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

/** @param {ProductLevel} level */
function levelProfile(level) {
  const order = ["none", "low", "medium", "high"];
  const idx = order.indexOf(level);
  /** @type {Record<string, number>} */
  const profile = {};
  for (let i = 0; i < order.length; i += 1) {
    const dist = Math.abs(i - idx);
    profile[order[i]] = Math.max(0, 10 - dist * 4);
  }
  return profile;
}

/** @param {ProductHeaviness} heaviness */
function heavinessProfile(heaviness) {
  return levelProfile(
    heaviness === "low" ? "low" : heaviness === "high" ? "high" : "medium"
  );
}

/** @param {number} price */
function budgetProfile(price) {
  if (price <= 70) return { low: 10, mid: 4, high: 1 };
  if (price <= 100) return { low: 8, mid: 7, high: 3 };
  if (price <= 130) return { low: 4, mid: 9, high: 5 };
  return { low: 2, mid: 5, high: 9 };
}

/** @param {ProductTemperature} temp */
function temperatureScores(temp) {
  const map = { hot: 0, iced: 0, room: 0 };
  map[temp] = 10;
  if (temp === "hot") map.room = 4;
  if (temp === "iced") map.room = 3;
  if (temp === "room") {
    map.hot = 4;
    map.iced = 4;
  }
  return map;
}

/** @param {CatalogProduct} product */
function foodPairingProfile(product) {
  if (product.category === "food") return { savory: 10, light: 6 };
  if (product.category === "dessert") return { sweet: 10, light: 4 };
  if (["coffee", "tea"].includes(product.category))
    return { none: 8, light: 5, sweet: 3 };
  if (product.category === "blended") return { none: 6, sweet: 7 };
  return { none: 7, light: 4 };
}

/** @param {number} healthyScore */
function healthyProfile(healthyScore) {
  if (healthyScore >= 8) return { high: 10, mid: 4, low: 0 };
  if (healthyScore >= 5) return { high: 6, mid: 9, low: 3 };
  return { high: 2, mid: 5, low: 9 };
}

/**
 * Infer behavior scores (0–10) from product traits when not authored manually.
 * @param {CatalogProduct} product
 * @returns {BehaviorScores}
 */
export function deriveBehaviorScores(product) {
  const b = defaultBehaviorScores();
  const { category, caffeine, sweetness, temperature, heaviness, price } = product;
  const n = `${product.nameEn} ${product.nameAr} ${product.tags.join(" ")}`.toLowerCase();

  if (category === "coffee" || category === "tea") {
    b.study += caffeine === "high" ? 2 : caffeine === "medium" ? 5 : 3;
    b.work += caffeine === "high" ? 6 : 4;
    b.quickVisit += price <= 85 ? 5 : 2;
    b.longStay += heaviness === "low" ? 5 : heaviness === "medium" ? 3 : 0;
    b.relaxing += heaviness === "low" && caffeine !== "high" ? 5 : 2;
    b.evening += caffeine === "high" ? -2 : 3;
    b.morning += 4;
  }

  if (category === "blended" || sweetness === "high") {
    b.friends += 5;
    b.date += 4;
    b.instagram += 6;
    b.evening += 3;
  }

  if (category === "dessert" || category === "food") {
    b.friends += 4;
    b.date += category === "dessert" ? 5 : 2;
    b.instagram += category === "dessert" ? 5 : 3;
    b.morning += category === "food" ? 5 : 2;
  }

  if (temperature === "iced") {
    b.instagram += 3;
    b.quickVisit += 2;
  }

  if (n.includes("matcha")) {
    b.study += 4;
    b.relaxing += 4;
    b.instagram += 3;
  }

  if (n.includes("flat white") || n.includes("cortado") || n.includes("macchiato")) {
    b.study += 5;
    b.relaxing += 4;
    b.longStay += 3;
  }

  if (n.includes("pistachio") || n.includes("rose") || n.includes("kunafa")) {
    b.instagram += 4;
    b.date += 3;
  }

  for (const legacy of product.recommendedFor ?? []) {
    const map = {
      studying: "study",
      working: "work",
      friends: "friends",
      date: "date",
      relaxing: "relaxing",
      quickCoffee: "quickVisit",
      breakfast: "morning",
      dinner: "evening",
      firstVisit: "instagram",
      celebration: "friends",
      meeting: "work",
    };
    const key = map[legacy];
    if (key) b[key] = Math.min(10, b[key] + 4);
  }

  for (const key of BEHAVIOR_KEYS) {
    b[key] = Math.max(0, Math.min(10, Math.round(b[key])));
  }

  if (product.behavior) {
    const authored = product.behavior;
    const hasCustom = BEHAVIOR_KEYS.some(
      (key) => authored[key] != null && authored[key] !== 3
    );
    if (hasCustom) {
      for (const key of BEHAVIOR_KEYS) {
        if (authored[key] != null) b[key] = authored[key];
      }
    }
  }

  return b;
}

/**
 * @param {CatalogProduct} product
 * @returns {ProductEngineScores}
 */
export function deriveEngineScores(product) {
  const behavior = deriveBehaviorScores(product);
  return {
    behavior,
    budget: budgetProfile(product.price),
    caffeine: levelProfile(product.caffeine),
    sweetness: levelProfile(product.sweetness),
    temperature: temperatureScores(product.temperature),
    heaviness: heavinessProfile(product.heaviness),
    foodPairing: foodPairingProfile(product),
    healthy: healthyProfile(product.healthyScore),
  };
}

/** @param {ProductEngineScores} base @param {Partial<ProductEngineScores>} override */
function mergeScoreObjects(base, override) {
  const out = { ...base };
  for (const dim of Object.keys(base)) {
    out[dim] = { ...base[dim], ...(override[dim] ?? {}) };
  }
  return out;
}

/**
 * @param {Partial<CatalogProduct> & Pick<CatalogProduct, 'id' | 'category' | 'price'> & ({ name: string } | { nameAr: string, nameEn: string })} p
 * @returns {CatalogProduct}
 */
export function defineProduct(p) {
  const rawName = p.name ?? p.nameAr ?? p.nameEn ?? "Product";
  const nameAr = p.nameAr ?? (hasArabic(rawName) ? rawName : p.nameEn ?? rawName);
  const nameEn = p.nameEn ?? (hasArabic(rawName) ? rawName : rawName);
  const descriptionAr =
    p.descriptionAr ?? p.description ?? (hasArabic(rawName) ? "" : "") ?? "";

  /** @type {CatalogProduct} */
  const base = {
    name: nameAr,
    nameAr,
    nameEn,
    currency: "EGP",
    image: IMAGE_PLACEHOLDER,
    temperature: "room",
    sweetness: "none",
    caffeine: "none",
    milk: "none",
    energy: "low",
    heaviness: "medium",
    healthyScore: 5,
    behavior: defaultBehaviorScores(),
    dessertPairing: [],
    drinkPairing: [],
    tags: [],
    recommendedFor: [],
    scores: /** @type {ProductEngineScores} */ ({}),
    availability: true,
    recommendable: true,
    description: descriptionAr,
    descriptionAr,
    ...p,
    name: nameAr,
    nameAr,
    nameEn,
    description: descriptionAr,
    descriptionAr,
  };

  if (base.healthy === true && base.healthyScore < 6) base.healthyScore = 7;
  if (base.healthy === false && base.healthyScore > 4 && !p.healthyScore)
    base.healthyScore = 4;

  const scores = deriveEngineScores(base);
  base.scores = p.scores ? mergeScoreObjects(scores, p.scores) : scores;
  base.behavior = base.scores.behavior;

  return base;
}

/** @param {CatalogProduct} product */
export function getProductScores(product) {
  if (product.scores?.behavior) return product.scores;
  return deriveEngineScores(product);
}

/** @param {CatalogProduct} product */
export function productDisplayName(product) {
  return product.nameAr || product.name || product.nameEn;
}

/** Brand / English menu names in Egyptian Arabic explanations. */
export function productExplainName(product) {
  const en = product.nameEn?.trim() ?? "";
  const ar = (product.nameAr || product.name || "").trim();
  if (en && /^[\x20-\x7E]+$/.test(en)) return en;
  if (en && (!hasArabic(ar) || ar === en)) return en;
  return ar || en;
}

/** @param {CatalogProduct} product */
export function productDescription(product) {
  return product.descriptionAr || product.description || "";
}

/** @param {CatalogProduct} product */
function inferProductTraits(product) {
  const n = `${product.nameEn} ${product.nameAr} ${product.tags.join(" ")}`.toLowerCase();
  const out = { ...product };

  if (out.milk === "none") {
    if (/\boat\b|شوفان/.test(n)) out.milk = "oat";
    else if (/coconut|جوز الهند/.test(n)) out.milk = "coconut";
    else if (
      /latte|cappuccino|flat white|macchiato|mocha|موكا|لاتيه|كابتشينو|فلات/.test(n)
    )
      out.milk = "dairy";
  }

  if (out.heaviness === "medium") {
    if (/blended|frapp|milkshake|موكا|شوكولاتة ساخنة/.test(n) || out.category === "blended")
      out.heaviness = "high";
    if (
      /americano|filter|cold brew|v60|aero|espresso single|كولد برو|إسبريسو/.test(n) ||
      (out.category === "coffee" && out.milk === "none")
    )
      out.heaviness = "low";
    if (/flat white|cortado|macchiato|فلات/.test(n)) out.heaviness = "low";
  }

  if (out.energy === "low" && out.caffeine === "high") out.energy = "high";
  if (out.energy === "low" && out.caffeine === "medium") out.energy = "medium";

  if (out.healthyScore === 5 && out.healthy === true) out.healthyScore = 7;
  if (out.healthyScore === 5 && out.healthy === false && out.category === "dessert")
    out.healthyScore = 2;

  return out;
}

/** @param {CatalogProduct} product */
export function inferProductTags(product) {
  const tags = new Set(product.tags ?? []);
  const n = `${product.nameEn} ${product.nameAr}`.toLowerCase();

  tags.add(product.category);
  if (product.temperature === "iced") {
    tags.add("cold");
    tags.add("refreshing");
  }
  if (product.temperature === "hot") tags.add("warm");
  if (product.caffeine === "none" || product.caffeine === "low") tags.add("low-caffeine");
  if (product.caffeine === "high") tags.add("energy");
  if (product.sweetness === "high" || product.sweetness === "medium") tags.add("sweet");
  if (product.healthyScore >= 7) tags.add("healthy");
  if (product.milk === "oat" || /\bvegan\b|plant/.test(n)) tags.add("vegan");

  if (/chocolate|شوكولاتة|كاكاو/.test(n)) tags.add("chocolate");
  if (/caramel|كراميل/.test(n)) tags.add("caramel");
  if (/pistachio|فستق/.test(n)) tags.add("pistachio");
  if (/matcha|ماتشا/.test(n)) tags.add("matcha");
  if (/croissant|كرواسون|muffin|مافن|cake|كيك|brownie|براوني/.test(n)) tags.add("pastry");
  if (/sandwich|ساندوتش|toast|توست|bagel/.test(n)) tags.add("savory");
  if (/salad|سلطة|bowl|بول/.test(n)) tags.add("light-meal");

  const behavior = product.behavior ?? product.scores?.behavior ?? deriveBehaviorScores(product);
  if (behavior.study >= 7) tags.add("study");
  if (behavior.instagram >= 7) tags.add("instagram");
  if (behavior.date >= 7) tags.add("date-night");

  return [...tags];
}

/**
 * Turn a café menu module into a fully linked knowledge base (tags, pairings, scores).
 * @param {CatalogProduct[]} products
 * @returns {CatalogProduct[]}
 */
export function finalizeCatalogKnowledge(products) {
  /** @type {CatalogProduct[]} */
  const normalized = products.map((raw) => {
    let item = defineProduct(/** @type {any} */ (raw));
    item = inferProductTraits(item);
    item.tags = inferProductTags(item);
    return item;
  });

  const desserts = normalized.filter((p) => p.category === "dessert" && p.availability);
  const foods = normalized.filter((p) => p.category === "food" && p.availability);

  for (const item of normalized) {
    if (!["coffee", "tea", "blended", "drink"].includes(item.category)) continue;

    const dessertPairing = [...item.dessertPairing];
    if (dessertPairing.length === 0) {
      if (item.sweetness === "high" || item.sweetness === "medium") dessertPairing.push("tag:sweet");
      if (item.tags.includes("chocolate")) dessertPairing.push("tag:chocolate");
      if (item.tags.includes("caramel")) dessertPairing.push("tag:caramel");
      for (const d of desserts.slice(0, 4)) dessertPairing.push(d.id);
    }

    item.dessertPairing = [...new Set(dessertPairing)];

    const scores = deriveEngineScores(item);
    item.scores = item.scores ? mergeScoreObjects(scores, item.scores) : scores;
    item.behavior = item.scores.behavior;
  }

  const drinks = normalized.filter((p) =>
    ["coffee", "tea", "blended", "drink"].includes(p.category)
  );

  for (const dessert of desserts) {
    const drinkPairing = [...dessert.drinkPairing];
    if (drinkPairing.length === 0) {
      for (const drink of drinks.slice(0, 5)) drinkPairing.push(drink.id);
    }
    dessert.drinkPairing = [...new Set(drinkPairing)];
    const scores = deriveEngineScores(dessert);
    dessert.scores = dessert.scores ? mergeScoreObjects(scores, dessert.scores) : scores;
    dessert.behavior = dessert.scores.behavior;
  }

  for (const food of foods) {
    const drinkPairing = [...food.drinkPairing];
    if (drinkPairing.length === 0) {
      const lightDrink =
        drinks.find((d) => d.heaviness === "low") ?? drinks[0];
      if (lightDrink) drinkPairing.push(lightDrink.id);
      drinkPairing.push("tag:coffee");
    }
    food.drinkPairing = [...new Set(drinkPairing)];
    const scores = deriveEngineScores(food);
    food.scores = food.scores ? mergeScoreObjects(scores, food.scores) : scores;
    food.behavior = food.scores.behavior;
  }

  return normalized;
}

/** @param {CatalogProduct[]} products */
export function indexCatalog(products) {
  /** @type {Record<string, CatalogProduct>} */
  const byId = {};
  for (const item of products) byId[item.id] = item;
  return { products, byId, count: products.length };
}

/** @param {string} tag */
export function isPairingTag(ref) {
  return ref.startsWith("tag:");
}

/** @param {string} ref */
export function pairingTagName(ref) {
  return ref.startsWith("tag:") ? ref.slice(4) : ref;
}

/**
 * @param {CatalogProduct} primary
 * @param {CatalogProduct[]} menu
 * @param {Set<string>} excludeIds
 */
export function pickComplementaryItem(primary, menu, excludeIds = new Set()) {
  if (!["coffee", "tea", "drink", "blended"].includes(primary.category)) return null;

  const refs = [...primary.dessertPairing, ...primary.drinkPairing];
  const explicitIds = refs.filter((ref) => !isPairingTag(ref));
  if (explicitIds.length > 0) {
    const byId = new Map(menu.map((p) => [p.id, p]));
    for (const id of explicitIds) {
      const candidate = byId.get(id);
      if (
        candidate &&
        candidate.availability &&
        candidate.recommendable !== false &&
        candidate.id !== primary.id &&
        !excludeIds.has(candidate.id) &&
        ["dessert", "food"].includes(candidate.category)
      ) {
        return candidate;
      }
    }
  }

  const wantSweet = primary.sweetness === "high" || primary.sweetness === "medium";

  /** @type {{ item: CatalogProduct, score: number }[]} */
  const ranked = [];

  for (const candidate of menu) {
    if (!candidate.availability || candidate.recommendable === false) continue;
    if (candidate.id === primary.id || excludeIds.has(candidate.id)) continue;
    if (!["dessert", "food"].includes(candidate.category)) continue;

    let score = 0;
    for (const ref of refs) {
      if (isPairingTag(ref)) {
        if (candidate.tags.includes(pairingTagName(ref))) score += 12;
      } else if (ref === candidate.id) score += 20;
    }
    for (const ref of candidate.drinkPairing) {
      if (ref === primary.id) score += 15;
      if (isPairingTag(ref) && primary.tags.includes(pairingTagName(ref))) score += 8;
    }

    for (const tag of primary.tags) {
      if (candidate.tags.includes(tag)) score += 4;
    }

    if (wantSweet && candidate.category === "dessert") score += 5;
    if (!wantSweet && candidate.category === "food") score += 4;

    if (primary.tags.includes("pairs-savory") && candidate.category === "food") score += 6;

    if (score > 0) ranked.push({ item: candidate, score });
  }

  ranked.sort((a, b) => b.score - a.score || a.item.price - b.item.price);
  return ranked[0]?.item ?? null;
}
