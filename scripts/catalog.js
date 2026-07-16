/**
 * Catalog knowledge base — load café menus, normalize metadata, index for the recommender.
 */

import {
  finalizeCatalogKnowledge,
  indexCatalog,
} from "../catalogs/product.js";

/** @typedef {import('../catalogs/product.js').CatalogProduct} CatalogProduct */
/** @typedef {ReturnType<typeof indexCatalog> & { catalogKey: string }} CatalogKnowledge */

const LOADERS = {
  demo: () => import("../catalogs/demo.js"),
  starbucks: () => import("../catalogs/starbucks.js"),
  costa: () => import("../catalogs/costa.js"),
  barico: () => import("../catalogs/barico.js"),
  bareeq: () => import("../catalogs/bareeq.js"),
};

export const DEFAULT_CATALOG_KEY = "demo";

/** @type {Map<string, Promise<CatalogKnowledge>>} */
const knowledgeCache = new Map();

/** @param {string} catalogKey */
async function loadRawProducts(catalogKey) {
  const key = catalogKey in LOADERS ? catalogKey : DEFAULT_CATALOG_KEY;
  const mod = await LOADERS[key]();
  return mod.products;
}

/**
 * Full knowledge base for a café (normalized products + id index).
 * @param {string} catalogKey
 * @returns {Promise<CatalogKnowledge>}
 */
export async function getCatalogKnowledge(catalogKey) {
  const key = catalogKey in LOADERS ? catalogKey : DEFAULT_CATALOG_KEY;
  let pending = knowledgeCache.get(key);
  if (!pending) {
    pending = (async () => {
      const raw = await loadRawProducts(key);
      const products = finalizeCatalogKnowledge(raw);
      return { catalogKey: key, ...indexCatalog(products) };
    })();
    knowledgeCache.set(key, pending);
  }
  return pending;
}

/** @param {string} catalogKey @returns {Promise<CatalogProduct[]>} */
export async function getCatalog(catalogKey) {
  const kb = await getCatalogKnowledge(catalogKey);
  return kb.products;
}

/** Available items only — used by the recommender. */
/** @param {string} catalogKey @returns {Promise<CatalogProduct[]>} */
export async function getAvailableMenu(catalogKey) {
  const kb = await getCatalogKnowledge(catalogKey);
  return kb.products.filter((item) => item.availability === true);
}

/** @param {string} catalogKey @param {string} productId */
export async function getProductById(catalogKey, productId) {
  const kb = await getCatalogKnowledge(catalogKey);
  return kb.byId[productId] ?? null;
}
