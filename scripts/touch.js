/**
 * Touch helpers — double-tap guard, passive-friendly tap binding.
 */

const DEFAULT_COOLDOWN_MS = 400;

/**
 * @param {HTMLElement} el
 * @param {(ev: Event) => void} handler
 * @param {{ cooldown?: number }} [opts]
 */
export function bindTap(el, handler, opts = {}) {
  const cooldown = opts.cooldown ?? DEFAULT_COOLDOWN_MS;
  let lastTap = 0;

  el.addEventListener(
    "click",
    (ev) => {
      const now = performance.now();
      if (now - lastTap < cooldown) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      lastTap = now;
      handler(ev);
    },
    { passive: false }
  );
}
