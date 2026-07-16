/**
 * Asset URLs resolved from site root (works with /index.html QR entry).
 */

/** @param {string} pathFromRoot e.g. "assets/icons/favicon.svg" */
export function assetUrl(pathFromRoot) {
  return new URL(`../${pathFromRoot.replace(/^\//, "")}`, import.meta.url).href;
}

export const PRODUCT_PLACEHOLDER = assetUrl("assets/products/placeholder.svg");

/** @param {string} partnerId @param {string} productId */
export function productImageUrl(partnerId, productId) {
  return assetUrl(`assets/products/${partnerId}/${productId}.svg`);
}

/** @param {string} pathFromRoot */
export function lazyImageAttrs(pathFromRoot) {
  return {
    src: assetUrl(pathFromRoot),
    loading: "lazy",
    decoding: "async",
    fetchPriority: "low",
  };
}
