#!/usr/bin/env node
/**
 * Sync version.json → sw-config.js, scripts/version.js, index.html asset query strings.
 *
 * Usage:
 *   node scripts/sync-version.mjs           — sync from version.json
 *   node scripts/sync-version.mjs --bump    — increment version.json, then sync
 *   node scripts/sync-version.mjs --deploy  — unique CI version (GITHUB_RUN_NUMBER or timestamp)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const versionPath = join(root, "version.json");

/** @param {{ appVersion: string, cacheName: string }} v */
function writeSwConfig(v) {
  const content = `/**
 * Service worker config — synced from version.json (node scripts/sync-version.mjs).
 * Do not edit by hand.
 */
var VIBY_SW_CONFIG = {
  APP_VERSION: "${v.appVersion}",
  CACHE_NAME: "${v.cacheName}",
  PWA_DEBUG: false,
};
`;
  writeFileSync(join(root, "sw-config.js"), content, "utf8");
}

/** @param {{ appVersion: string, cacheName: string }} v */
function writeAppVersion(v) {
  const content = `/**
 * App version — synced from version.json (node scripts/sync-version.mjs).
 * Do not edit by hand.
 */

export const APP_VERSION = "${v.appVersion}";
export const CACHE_NAME = "${v.cacheName}";

/** Enable with ?pwa_debug=1 or on localhost. */
export const PWA_DEBUG =
  typeof location !== "undefined" &&
  (location.search.includes("pwa_debug=1") ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1");
`;
  writeFileSync(join(root, "scripts", "version.js"), content, "utf8");
}

/** @param {string} html @param {string} appVersion */
function stampIndexHtml(html, appVersion) {
  const q = `?v=${appVersion}`;
  let out = html;

  out = out.replace(/(\.\/styles\/[^"']+\.css)(\?v=[^"']*)?/g, `$1${q}`);
  out = out.replace(/(\.\/scripts\/app\.js)(\?v=[^"']*)?/g, `$1${q}`);
  out = out.replace(
    /(<link rel="modulepreload" href="\.\/scripts\/app\.js)(\?v=[^"']*)?(")/g,
    `$1${q}$3`
  );

  return out;
}

/** @param {{ appVersion: string, cacheName: string }} v */
function bumpVersion(v) {
  const next = String(Number(v.appVersion) + 1);
  return { appVersion: next, cacheName: `viby-v${next}` };
}

/** @returns {string} */
function resolveDeployId() {
  const arg = process.argv.find((a) => a.startsWith("--deploy="));
  if (arg) return arg.slice("--deploy=".length);

  const envId = process.env.GITHUB_RUN_NUMBER || process.env.DEPLOY_VERSION;
  if (envId) return String(envId);

  return String(Date.now());
}

const bump = process.argv.includes("--bump");
const deploy = process.argv.includes("--deploy");
let version = JSON.parse(readFileSync(versionPath, "utf8"));

if (deploy) {
  const deployId = resolveDeployId();
  version = { appVersion: deployId, cacheName: `viby-v${deployId}` };
  console.log(`Deploy version ${version.cacheName}`);
} else if (bump) {
  version = bumpVersion(version);
  writeFileSync(versionPath, `${JSON.stringify(version, null, 2)}\n`, "utf8");
  console.log(`Bumped to ${version.cacheName}`);
}

writeSwConfig(version);
writeAppVersion(version);

const indexPath = join(root, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
writeFileSync(indexPath, stampIndexHtml(indexHtml, version.appVersion), "utf8");

console.log(`Synced ${version.cacheName} (app v${version.appVersion})`);
