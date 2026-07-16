/**
 * Theme / dark mode — token overrides via data-theme; CSS loaded when needed.
 */

const DARK_STYLES = new URL("../../styles/theme-dark.css", import.meta.url).href;

/** @param {import('../../platform/bootstrap.js').CapabilityDeps} deps */
export function register(deps) {
  const apply = (theme) => {
    const darkAllowed = deps.context.features?.darkMode === true;
    let resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    if (!darkAllowed && resolved === "dark") resolved = "light";

  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved === "dark" ? "dark" : "light";
  if (resolved === "dark") ensureDarkStylesheet();
  };

  apply(deps.context.theme);

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (deps.context.theme === "system") apply("system");
  });

  deps.events.on("context:updated", (ctx) => {
    if (ctx && typeof ctx === "object" && "theme" in ctx) {
      apply(/** @type {import('../../platform/context.js').VibyTheme} */ (ctx.theme));
    }
  });
}

function ensureDarkStylesheet() {
  if (document.querySelector('link[data-viby-theme="dark"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = DARK_STYLES;
  link.dataset.vibyTheme = "dark";
  link.media = "all";
  document.head.appendChild(link);
}
