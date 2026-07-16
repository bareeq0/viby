/**
 * Store-style menu narrowing — every flow answer must shrink the candidate set.
 */

/** @typedef {import('../catalogs/product.js').CatalogProduct} CatalogProduct */
/** @typedef {import('./logic.js').Session} Session */

/** @param {CatalogProduct} item */
export function isCoffee(item) {
  return item.category === "coffee" || item.tags.includes("coffee");
}

/** @param {CatalogProduct} item */
export function isMatcha(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""} ${item.descriptionAr ?? ""}`;
  return item.tags.includes("matcha") || /matcha|ماتشا/i.test(label);
}

/** @param {CatalogProduct} item */
export function isRefreshDrink(item) {
  if (["food", "dessert", "retail", "extra"].includes(item.category)) return false;
  if (isCoffee(item) || isMatcha(item)) return false;
  return ["drink", "blended", "tea"].includes(item.category);
}

/** @param {CatalogProduct} item */
function isFlavoredMatcha(item) {
  if (!isMatcha(item)) return false;
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""} ${item.descriptionAr ?? ""}`;
  if (/blueberry|توت|caramel|كراميل|chocolate|شوكولات|salted|فستق|pistachio|vanilla|فانيل|cream|كريم/i.test(label)) {
    return true;
  }
  return item.sweetness === "high" || item.sweetness === "medium";
}

/** @param {CatalogProduct} item */
function isClassicMatcha(item) {
  return isMatcha(item) && !isFlavoredMatcha(item);
}

/** @param {CatalogProduct} item */
function isChocolateDessert(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""} ${item.descriptionAr ?? ""}`;
  return (
    item.tags.includes("chocolate") ||
    /chocolate|شوكولات|براوني|brownie|cocoa/i.test(label)
  );
}

/** @param {CatalogProduct} item */
function isFruitDessert(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""} ${item.descriptionAr ?? ""}`;
  return (
    item.tags.includes("fruit") ||
    item.tags.includes("berry") ||
    /fruit|tut|توت|blueberry|فراولة|strawberry|lemon|ليمون|carrot|جزر|passion/i.test(label)
  );
}

/** @param {CatalogProduct} item */
function isCheesecakeDessert(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""} ${item.descriptionAr ?? ""}`;
  return (
    item.tags.includes("cheesecake") ||
    /cheese.?cake|cheesecake|تشيز|cheese cake/i.test(label)
  );
}

/** @param {CatalogProduct} item */
function isCroissantFood(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""}`;
  return (
    item.tags.includes("croissant") ||
    item.tags.includes("pastry") ||
    /croissant|كرواس|كروissant|danish|دونات|donut|cinnamon|قرفة/i.test(label)
  );
}

/** @param {CatalogProduct} item */
function isSandwichFood(item) {
  const label = `${item.nameEn ?? ""} ${item.nameAr ?? ""}`;
  return /sandwich|ساندوت|tuna|تونة|melt|toast|توست/i.test(label) && !isCroissantFood(item);
}

/** @param {CatalogProduct} item */
function isLightSnackFood(item) {
  if (item.category !== "food") return false;
  if (isCroissantFood(item) || isSandwichFood(item)) return false;
  return item.heaviness === "low" || item.tags.includes("light-meal") || item.tags.includes("healthy");
}

export function getBudgetThresholds(session) {
  if (session._budgetThresholds) return session._budgetThresholds;
  const menu = session.menu || [];
  const prices = menu
    .map(item => item.price)
    .filter(p => typeof p === 'number' && !isNaN(p))
    .sort((a, b) => a - b);
  
  if (prices.length === 0) {
    return { low: 100, flexible: 130 };
  }
  const p33 = prices[Math.floor(prices.length * 0.33)] ?? prices[0];
  const p66 = prices[Math.floor(prices.length * 0.66)] ?? prices[prices.length - 1];
  session._budgetThresholds = { low: p33, flexible: p66 };
  return session._budgetThresholds;
}

/** @type {Record<string, (item: CatalogProduct, session?: Session) => boolean>} */
export const ANSWER_FILTERS = {
  pick_coffee: (item) => isCoffee(item),
  pick_matcha: (item) => isMatcha(item),
  pick_cold: (item) => item.temperature === "iced",
  pick_refresh: (item) => isRefreshDrink(item),
  pick_dessert: (item) => item.category === "dessert",
  pick_food: (item) => item.category === "food",
  pick_surprise: () => true,

  temp_hot: (item) => item.temperature === "hot" || item.temperature === "room",
  temp_iced: (item) => item.temperature === "iced",

  milk_yes: (item) => item.milk !== "none",
  milk_no: (item) => item.milk === "none",

  strength_strong: (item) => item.caffeine === "high" || item.energy === "high",
  strength_smooth: (item) =>
    item.caffeine === "low" ||
    item.caffeine === "none" ||
    item.caffeine === "medium" ||
    item.energy === "low" ||
    item.energy === "medium",

  matcha_classic: (item) => isClassicMatcha(item),
  matcha_flavored: (item) => isFlavoredMatcha(item),

  dessert_chocolate: (item) => item.category === "dessert" && isChocolateDessert(item),
  dessert_fruit: (item) => item.category === "dessert" && isFruitDessert(item),
  dessert_cheese: (item) => item.category === "dessert" && isCheesecakeDessert(item),

  food_croissant: (item) => item.category === "food" && isCroissantFood(item),
  food_sandwich: (item) => item.category === "food" && isSandwichFood(item),
  food_snack: (item) => item.category === "food" && isLightSnackFood(item),

  sweet_yes: (item) => item.sweetness === "high" || item.sweetness === "medium",
  sweet_no: (item) => item.sweetness === "none" || item.sweetness === "low",
  sweet_maybe: (item) => item.sweetness === "medium" || item.sweetness === "low",

  budget_low: (item, session) => {
    const thresholds = session ? getBudgetThresholds(session) : { low: 100 };
    return item.price <= thresholds.low;
  },
  budget_flexible: (item, session) => {
    const thresholds = session ? getBudgetThresholds(session) : { flexible: 130 };
    return item.price <= thresholds.flexible;
  },
  budget_no: () => true,

  surp_coffee: (item) => isCoffee(item),
  surp_matcha: (item) => isMatcha(item),
  surp_cold: (item) => item.temperature === "iced",
  surp_refresh: (item) => isRefreshDrink(item),
  surp_any: () => true,
  
  surp_cold_coffee: (item) => isCoffee(item) && item.temperature === "iced",
  surp_cold_matcha: (item) => isMatcha(item) && item.temperature === "iced",
  surp_cold_refresh: (item) => isRefreshDrink(item),
  surp_cold_any: (item) => item.temperature === "iced",
};

/** Branch → ordered question ids */
export const BRANCH_PLANS = {
  pick_coffee: ["coffee_temp", "coffee_milk", "coffee_strength"],
  pick_iced_coffee: ["coffee_milk", "coffee_strength"],
  pick_matcha: ["matcha_temp", "matcha_style"],
  pick_dessert: ["dessert_type"],
  pick_food: ["food_type"],
  pick_refresh: [],
  pick_surprise: [],
};

export const CATEGORY_CONFIGS = {
  pick_coffee: {
    filter: (item) => isCoffee(item),
    attributes: ["temperature", "milk", "strength", "sweetness", "budget"],
    priorities: {
      temperature: 100,
      milk: 90,
      strength: 80,
      sweetness: 20,
      budget: 10,
    },
  },
  pick_matcha: {
    filter: (item) => isMatcha(item),
    attributes: ["temperature", "style", "budget"],
    priorities: {
      temperature: 100,
      style: 90,
      budget: 10,
    },
  },
  pick_dessert: {
    filter: (item) => item.category === "dessert",
    attributes: ["dessert_type", "sweetness", "budget"],
    priorities: {
      dessert_type: 100,
      sweetness: 20,
      budget: 10,
    },
  },
  pick_food: {
    filter: (item) => item.category === "food",
    attributes: ["food_type", "budget"],
    priorities: {
      food_type: 100,
      budget: 10,
    },
  },
  pick_refresh: {
    filter: (item) => isRefreshDrink(item),
    attributes: ["sweetness", "budget"],
    priorities: {
      sweetness: 20,
      budget: 10,
    },
  },
  pick_cold: {
    filter: (item) => item.temperature === "iced",
    attributes: ["budget", "sweetness"],
    priorities: {
      sweetness: 20,
      budget: 10,
    },
  },
  pick_surprise: {
    filter: (item) => true,
    attributes: ["budget", "sweetness"],
    priorities: {
      sweetness: 20,
      budget: 10,
    },
  },
};

/** @param {Session} session */
export function getActiveCategoryConfigKey(session) {
  if (!session || !session.slots) return null;
  const craving = session.slots.craving;
  const surpDir = session.slots.surprise_direction;
  const coldDir = session.slots.cold_direction;

  if (craving === "pick_matcha" || surpDir === "surp_matcha" || coldDir === "surp_cold_matcha") {
    return "pick_matcha";
  }
  if (craving === "pick_coffee" || craving === "pick_iced_coffee" || surpDir === "surp_coffee" || coldDir === "surp_cold_coffee") {
    return "pick_coffee";
  }
  if (craving === "pick_refresh" || surpDir === "surp_refresh" || coldDir === "surp_cold_refresh") {
    return "pick_refresh";
  }
  if (craving === "pick_dessert") {
    return "pick_dessert";
  }
  if (craving === "pick_food") {
    return "pick_food";
  }
  if (craving === "pick_cold") {
    return "pick_cold";
  }
  if (craving === "pick_surprise") {
    return "pick_surprise";
  }
  return null;
}

/** @param {Session} session */
export function getActiveCategoryConfig(session) {
  const key = getActiveCategoryConfigKey(session);
  return CATEGORY_CONFIGS[key] ?? null;
}

/**
 * @param {Session} session
 * @param {CatalogProduct[]} [source]
 */
export function getFlowFilteredMenu(session, source) {
  let baseMenu =
    source ??
    session.menu.filter(
      (item) => item?.availability === true && item.recommendable !== false
    );

  const config = getActiveCategoryConfig(session);
  if (config && config.filter) {
    baseMenu = baseMenu.filter((item) => config.filter(item, session));
  }

  const answers = session.flowFilterAnswers ?? [];
  
  const getFilterPriority = (ans) => {
    if (ans.startsWith("budget_")) return 1;
    if (ans.startsWith("sweet_")) return 2;
    if (ans.startsWith("strength_")) return 3;
    if (ans.startsWith("milk_")) return 4;
    if (ans.startsWith("temp_")) return 5;
    return 6;
  };

  let currentAnswers = [...answers];

  while (true) {
    let filtered = baseMenu;
    for (const answerId of currentAnswers) {
      const fn = ANSWER_FILTERS[answerId];
      if (fn) filtered = filtered.filter((item) => fn(item, session));
    }
    
    if (filtered.length > 0 || currentAnswers.length === 0) {
      return filtered;
    }

    let lowestPriorityIndex = -1;
    let lowestPriority = Infinity;

    for (let i = currentAnswers.length - 1; i >= 0; i--) {
      const p = getFilterPriority(currentAnswers[i]);
      if (p < lowestPriority) {
        lowestPriority = p;
        lowestPriorityIndex = i;
      }
    }

    if (lowestPriorityIndex !== -1) {
      currentAnswers.splice(lowestPriorityIndex, 1);
    } else {
      currentAnswers.pop();
    }
  }
}

/**
 * @param {CatalogProduct[]} menu
 * @param {string} answerId
 * @param {Session} [session]
 */
export function filterMenuByAnswer(menu, answerId, session) {
  const fn = ANSWER_FILTERS[answerId];
  if (!fn) return menu;
  return menu.filter((item) => fn(item, session));
}

/**
 * @param {CatalogProduct[]} menu
 * @param {{ quickReplies: { value: string }[] }} step
 * @param {Session} [session]
 */
export function stepNarrowsMenu(menu, step, session) {
  if (!menu.length || !step.quickReplies.length) return false;

  /** @type {Set<string>} */
  const signatures = new Set();
  let anyStrictlySmaller = false;

  for (const reply of step.quickReplies) {
    const next = filterMenuByAnswer(menu, reply.value, session);
    if (next.length < menu.length) anyStrictlySmaller = true;
    signatures.add(next.map((i) => i.id).sort().join("|"));
  }

  if (signatures.size <= 1) return false;
  return anyStrictlySmaller || signatures.size > 1;
}

/** @param {Session} session @param {string} answerId */
export function registerFlowFilterAnswer(session, answerId) {
  if (!session.flowFilterAnswers) session.flowFilterAnswers = [];
  if (!session.flowFilterAnswers.includes(answerId)) {
    session.flowFilterAnswers.push(answerId);
  }
}

