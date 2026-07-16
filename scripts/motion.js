/**
 * Subtle motion helpers — CSS-driven springs; minimal JS for stagger only.
 * Targets compositor-friendly properties (transform, opacity) for ~60 FPS.
 */

/** @returns {boolean} */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Stagger enter classes after layout (one rAF).
 * @param {HTMLElement[]} elements
 * @param {{ className?: string, baseDelay?: number, step?: number }} [options]
 */
export function staggerEnter(elements, options = {}) {
  const {
    className = "motion-enter",
    baseDelay = 0,
    step = 42,
  } = options;

  if (!elements.length) return;

  const reduced = prefersReducedMotion();

  const apply = () => {
    elements.forEach((el, i) => {
      if (!reduced) {
        el.style.setProperty("--motion-delay", `${baseDelay + i * step}ms`);
      } else {
        el.style.removeProperty("--motion-delay");
      }
      el.classList.add(className);
    });
  };

  requestAnimationFrame(apply);
}

/** @param {HTMLElement | null} root @param {string} selector @param {object} [options] */
export function staggerChildren(root, selector, options = {}) {
  if (!root) return;
  staggerEnter([...root.querySelectorAll(selector)], options);
}
