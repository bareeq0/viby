/**
 * Mobile viewport — dynamic height, keyboard adaptation, dock measurement.
 * Passive listeners only; updates batched via rAF to avoid layout thrashing.
 */

let rafId = 0;
let replyDockObs = null;

function supportsDvh() {
  return typeof CSS !== "undefined" && CSS.supports?.("height", "100dvh");
}

function supportsSvh() {
  return typeof CSS !== "undefined" && CSS.supports?.("height", "100svh");
}

function setAppHeight() {
  const root = document.documentElement;
  const vv = window.visualViewport;

  if (vv) {
    root.style.setProperty("--app-height", `${Math.round(vv.height)}px`);
    root.style.setProperty("--keyboard-offset", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
  } else {
    root.style.removeProperty("--app-height");
    root.style.removeProperty("--keyboard-offset");
  }
}

function scheduleHeightUpdate() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    setAppHeight();
  });
}

function measureReplyDock() {
  const dock = document.getElementById("replyDock");
  if (!dock) return;

  const hidden = dock.classList.contains("reply-dock--hidden");
  const height = hidden ? 0 : dock.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--reply-dock-height", `${Math.ceil(height)}px`);
}

function observeReplyDock() {
  const dock = document.getElementById("replyDock");
  if (!dock || typeof ResizeObserver === "undefined") {
    measureReplyDock();
    return;
  }

  replyDockObs?.disconnect();
  replyDockObs = new ResizeObserver(() => {
    requestAnimationFrame(measureReplyDock);
  });
  replyDockObs.observe(dock);
}

/** Apply static viewport-unit fallbacks before first paint path runs. */
function applyViewportFallbacks() {
  const root = document.documentElement;
  if (!supportsDvh()) {
    if (supportsSvh()) {
      root.style.setProperty("--viewport-height", "100svh");
    } else {
      root.style.setProperty("--viewport-height", "100vh");
    }
  }
}

/** Lock page scroll; only the messages pane scrolls. */
function lockPageScroll() {
  document.documentElement.classList.add("viewport-ready");
}

export function initViewport() {
  applyViewportFallbacks();
  lockPageScroll();
  setAppHeight();
  measureReplyDock();
  observeReplyDock();

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener("resize", scheduleHeightUpdate, { passive: true });
    vv.addEventListener("scroll", scheduleHeightUpdate, { passive: true });
  }

  window.addEventListener("resize", scheduleHeightUpdate, { passive: true });
  window.addEventListener("orientationchange", scheduleHeightUpdate, { passive: true });
}

/** Re-measure reply dock after content changes (e.g. quick replies shown). */
export function refreshReplyDockHeight() {
  requestAnimationFrame(measureReplyDock);
}
