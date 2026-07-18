import { escapeHtml } from "./dom-utils.js";

let viewerRoot = null;
let viewerImage = null;
let viewerDetails = null;
let closeListener = null;
let keydownListener = null;
let pinchStartDistance = null;
let pinchStartScale = 1;
let swipeStartY = null;
let swipeStartX = null;
let lastTapTime = 0;
let lastTapX = 0;
let lastTapY = 0;
let currentScale = 1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(touchA, touchB) {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.hypot(dx, dy);
}

function setZoom(scale) {
  currentScale = clamp(scale, 1, 2.6);
  if (viewerImage) {
    viewerImage.style.transform = `scale(${currentScale})`;
    viewerImage.classList.toggle("is-zoomed", currentScale > 1);
  }
}

function resetZoom() {
  setZoom(1);
}

function handleTouchStart(event) {
  if (!viewerImage) return;

  if (event.touches.length === 2) {
    pinchStartDistance = getDistance(event.touches[0], event.touches[1]);
    pinchStartScale = currentScale;
    swipeStartY = null;
    swipeStartX = null;
    return;
  }

  if (event.touches.length === 1) {
    const touch = event.touches[0];
    swipeStartY = touch.clientY;
    swipeStartX = touch.clientX;
  }
}

function handleTouchMove(event) {
  if (!viewerImage) return;

  if (event.touches.length === 2 && pinchStartDistance) {
    event.preventDefault();
    const distance = getDistance(event.touches[0], event.touches[1]);
    const ratio = distance / pinchStartDistance;
    setZoom(pinchStartScale * ratio);
    return;
  }

  if (event.touches.length === 1 && currentScale > 1) {
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  if (!viewerImage) return;

  if (event.touches.length === 0) {
    const touch = event.changedTouches[0];
    const now = Date.now();
    const tapGap = now - lastTapTime;
    const moved = Math.abs(touch.clientX - lastTapX) > 24 || Math.abs(touch.clientY - lastTapY) > 24;

    if (tapGap < 280 && !moved) {
      if (currentScale > 1) {
        resetZoom();
      } else {
        setZoom(1.85);
      }
    }

    lastTapTime = now;
    lastTapX = touch.clientX;
    lastTapY = touch.clientY;

    if (swipeStartY !== null && swipeStartX !== null) {
      const deltaY = touch.clientY - swipeStartY;
      const deltaX = touch.clientX - swipeStartX;
      if (deltaY > 90 && Math.abs(deltaY) > Math.abs(deltaX)) {
        closeProductImageViewer();
      }
    }
  }

  pinchStartDistance = null;
  swipeStartY = null;
  swipeStartX = null;
}

function bindViewerEvents() {
  if (!viewerRoot) return;

  const backdrop = viewerRoot.querySelector(".product-image-viewer__backdrop");
  const panel = viewerRoot.querySelector(".product-image-viewer__panel");
  const closeButton = viewerRoot.querySelector(".product-image-viewer__close");

  closeButton?.addEventListener("click", closeProductImageViewer);
  backdrop?.addEventListener("click", closeProductImageViewer);
  panel?.addEventListener("click", (event) => event.stopPropagation());

  viewerImage = viewerRoot.querySelector(".product-image-viewer__image");
  viewerDetails = viewerRoot.querySelector(".product-image-viewer__details");

  viewerImage?.addEventListener("dblclick", () => {
    if (currentScale > 1) {
      resetZoom();
    } else {
      setZoom(1.85);
    }
  });

  viewerImage?.addEventListener("touchstart", handleTouchStart, { passive: false });
  viewerImage?.addEventListener("touchmove", handleTouchMove, { passive: false });
  viewerImage?.addEventListener("touchend", handleTouchEnd);
}

function ensureViewer() {
  if (viewerRoot) return viewerRoot;

  viewerRoot = document.createElement("div");
  viewerRoot.className = "product-image-viewer";
  viewerRoot.innerHTML = `
    <div class="product-image-viewer__backdrop" aria-hidden="true"></div>
    <div class="product-image-viewer__panel" role="dialog" aria-modal="true" aria-label="Product image viewer">
      <button class="product-image-viewer__close" type="button" aria-label="إغلاق">×</button>
      <div class="product-image-viewer__media">
        <img class="product-image-viewer__image" alt="" />
      </div>
      <div class="product-image-viewer__details"></div>
    </div>
  `;

  document.body.appendChild(viewerRoot);
  bindViewerEvents();
  return viewerRoot;
}

function lockBodyScroll() {
  document.body.classList.add("product-image-viewer-open");
  document.documentElement.classList.add("product-image-viewer-open");
}

function unlockBodyScroll() {
  document.body.classList.remove("product-image-viewer-open");
  document.documentElement.classList.remove("product-image-viewer-open");
}

export function closeProductImageViewer() {
  if (!viewerRoot) return;
  viewerRoot.classList.remove("is-open");
  unlockBodyScroll();
  document.removeEventListener("keydown", keydownListener);
  keydownListener = null;
  closeListener = null;
  resetZoom();
  window.setTimeout(() => {
    if (viewerRoot?.parentNode) {
      viewerRoot.parentNode.removeChild(viewerRoot);
    }
    viewerRoot = null;
    viewerImage = null;
    viewerDetails = null;
  }, 320);
}

export function openProductImageViewer({ src, name, confidence, confidenceLabel, price, description, reason }) {
  const root = ensureViewer();
  const image = root.querySelector(".product-image-viewer__image");
  const details = root.querySelector(".product-image-viewer__details");

  if (!image || !details) return;

  image.src = src;
  image.alt = name || "Product image";

  const parts = [];
  if (name) parts.push(`<h3 class="product-image-viewer__name">${escapeHtml(name)}</h3>`);
  if (confidence !== null && confidence !== undefined && confidenceLabel) {
    parts.push(`<p class="product-image-viewer__meta">${escapeHtml(`Recommendation confidence: ${confidenceLabel} (${confidence}%)`)}</p>`);
  }
  if (price) parts.push(`<p class="product-image-viewer__price">${escapeHtml(price)}</p>`);
  if (description) parts.push(`<p class="product-image-viewer__description">${escapeHtml(description)}</p>`);
  if (reason) parts.push(`<p class="product-image-viewer__reason">${escapeHtml(reason)}</p>`);

  details.innerHTML = parts.join("");

  if (keydownListener) document.removeEventListener("keydown", keydownListener);
  keydownListener = (event) => {
    if (event.key === "Escape") {
      closeProductImageViewer();
    }
  };
  document.addEventListener("keydown", keydownListener);

  if (closeListener) window.clearTimeout(closeListener);
  resetZoom();
  lockBodyScroll();
  requestAnimationFrame(() => {
    root.classList.add("is-open");
  });
}
