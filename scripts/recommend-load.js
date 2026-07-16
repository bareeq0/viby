/**
 * Lazy entry to the recommendation engine — not on the first-paint module graph.
 */

/** @type {typeof import('./recommendation-engine.js').recommend | null} */
let recommendFn = null;

/** @param {import('./logic.js').Session} session @param {object} [options] */
export async function recommend(session, options) {
  if (!recommendFn) {
    ({ recommend: recommendFn } = await import("./recommendation-engine.js"));
  }
  return recommendFn(session, options);
}
