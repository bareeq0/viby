import { escapeHtml } from "./dom-utils.js";
import { formatPrice } from "../scripts/logic.js";
import { productDisplayName, productDescription } from "../catalogs/product.js";
import { getConfidenceLabel } from "../scripts/recommendation-engine.js";

const PLACEHOLDER_IMAGE = "assets/products/placeholder-product.webp";
let viewerEl = null;

function createViewer() {
  viewerEl = document.createElement("div");
  viewerEl.className = "product-viewer";
  viewerEl.setAttribute("role", "dialog");
  viewerEl.setAttribute("aria-modal", "true");
  viewerEl.innerHTML = `
    <div class="product-viewer__backdrop"></div>
    <div class="product-viewer__container">
      <button type="button" class="product-viewer__close" aria-label="إغلاق">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="product-viewer__image-wrapper">
        <img class="product-viewer__image" src="" alt="" />
      </div>
      <div class="product-viewer__details">
        <div class="product-viewer__header">
          <span class="product-viewer__badge"></span>
          <h2 class="product-viewer__title"></h2>
          <span class="product-viewer__price"></span>
        </div>
        <p class="product-viewer__desc"></p>
        <div class="product-viewer__reason-box">
          <span class="product-viewer__reason-label">ليه بنرشحهولك؟</span>
          <p class="product-viewer__reason-text"></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(viewerEl);

  // Close triggers
  viewerEl.querySelector(".product-viewer__close").addEventListener("click", closeViewer);
  viewerEl.querySelector(".product-viewer__backdrop").addEventListener("click", closeViewer);
  
  // Close if clicked outside the container
  viewerEl.addEventListener("click", (e) => {
    if (e.target === viewerEl) {
      closeViewer();
    }
  });
}

export function closeViewer() {
  if (!viewerEl || !viewerEl.classList.contains("product-viewer--open")) return;
  viewerEl.classList.remove("product-viewer--open");
  document.documentElement.classList.remove("body-scroll-lock");
  
  // Clean up key listener
  window.removeEventListener("keydown", handleKeyDown);
}

function handleKeyDown(e) {
  if (e.key === "Escape") {
    closeViewer();
  }
}

/**
 * @param {object} item
 * @param {{ reason?: string, currency?: string }} opts
 */
export function openProductViewer(item, { reason = "", currency = "EGP" } = {}) {
  if (!viewerEl) {
    createViewer();
  }

  const name = productDisplayName(item);
  const desc = productDescription(item);
  const priceFormatted = formatPrice(item.price, currency);
  const confVal = item.confidence ?? 90;
  const labelText = getConfidenceLabel(confVal);

  // Update image
  const imgEl = viewerEl.querySelector(".product-viewer__image");
  const hasImage = Boolean(item.image && String(item.image).trim());
  imgEl.src = hasImage ? item.image : PLACEHOLDER_IMAGE;
  imgEl.alt = name;

  // Title
  viewerEl.querySelector(".product-viewer__title").textContent = name;

  // Description
  viewerEl.querySelector(".product-viewer__desc").textContent = desc;

  // Price
  viewerEl.querySelector(".product-viewer__price").textContent = priceFormatted;

  // Badge
  const badgeEl = viewerEl.querySelector(".product-viewer__badge");
  badgeEl.textContent = `${labelText} (${confVal}%)`;

  // Reason
  const reasonBox = viewerEl.querySelector(".product-viewer__reason-box");
  if (reason && reason.trim()) {
    reasonBox.querySelector(".product-viewer__reason-text").textContent = reason;
    reasonBox.removeAttribute("hidden");
    reasonBox.style.display = "block";
  } else {
    reasonBox.setAttribute("hidden", "true");
    reasonBox.style.display = "none";
  }

  // Open modal
  viewerEl.classList.add("product-viewer--open");
  document.documentElement.classList.add("body-scroll-lock");

  // Esc key listener
  window.addEventListener("keydown", handleKeyDown);
}
