/** Menu recommendation cards inside the chat stream. */

import { escapeHtml } from "./dom-utils.js";
import { formatPrice } from "../scripts/logic.js";
import { productDisplayName, productDescription } from "../catalogs/product.js";
import { formatMessageTime } from "./messages.js";
import { staggerEnter } from "../scripts/motion.js";
import { bindTap } from "../scripts/touch.js";
import { getConfidenceLabel } from "../scripts/recommendation-engine.js";
import { openProductViewer } from "./product-viewer.js";


const PLACEHOLDER_IMAGE = "assets/products/placeholder-product.webp";

function productThumb(item) {
  const hasImage = Boolean(item.image && String(item.image).trim());
  if (hasImage) {
    return `<img class="menu-card__thumb menu-card__thumb--hero" src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" width="120" height="120" />`;
  }
  return `<img class="menu-card__thumb menu-card__thumb--hero menu-card__thumb--placeholder" src="${PLACEHOLDER_IMAGE}" alt="" loading="lazy" decoding="async" width="120" height="120" />`;
}

/**
 * @param {object} item
 * @param {{ reason: string, menuUrl: string, currency?: string }} opts
 */
export function renderProductShowcase(item, { reason, menuUrl, currency = "EGP" }) {
  const wrap = document.createElement("div");
  wrap.className = "message message--assistant message--product";

  const stack = document.createElement("div");
  stack.className = "message__stack";

  const confVal = item.confidence ?? 90;
  const labelText = getConfidenceLabel(confVal);

  const card = document.createElement("article");
  card.className = "product-showcase";
  card.innerHTML = `
    ${productThumb(item)}
    <div class="product-showcase__body">
      <p class="product-showcase__eyebrow">${labelText} (${confVal}%)</p>
      <h3 class="product-showcase__name">${escapeHtml(productDisplayName(item))}</h3>
      <p class="product-showcase__desc">${escapeHtml(productDescription(item))}</p>
      <p class="product-showcase__reason">${escapeHtml(reason)}</p>
      <p class="product-showcase__price">${formatPrice(item.price, currency)}</p>
    </div>`;

  const menuBtn = document.createElement("a");
  menuBtn.className = "product-showcase__menu";
  menuBtn.href = menuUrl || "#";
  menuBtn.target = "_blank";
  menuBtn.rel = "noopener noreferrer";
  menuBtn.innerHTML = `<span class="product-showcase__menu-icon" aria-hidden="true"></span><span>افتح المنيو</span>`;
  if (!menuUrl?.trim()) {
    menuBtn.hidden = true;
  }

  const thumbImg = card.querySelector(".menu-card__thumb");
  if (thumbImg) {
    thumbImg.style.cursor = "pointer";
    thumbImg.addEventListener("click", (e) => {
      e.stopPropagation();
      openProductViewer(item, { reason, currency });
    });
  }

  card.appendChild(menuBtn);

  stack.appendChild(card);

  const time = document.createElement("time");
  time.className = "message__time";
  time.dateTime = new Date().toISOString();
  time.textContent = formatMessageTime();

  stack.appendChild(time);
  wrap.appendChild(stack);
  wrap.classList.add("motion-enter");
  return wrap;
}

export function renderMenuCards(items, onSelect, currency = "EGP", primaryId = null, reason = "") {
  const wrap = document.createElement("div");
  wrap.className = "message message--assistant message--cards";

  const stack = document.createElement("div");
  stack.className = "message__stack";

  const row = document.createElement("div");
  row.className = "menu-cards";
  row.setAttribute("role", "list");

  const cards = [];

  for (const item of items) {
    const card = document.createElement("button");
    card.type = "button";
    const isPrimary = primaryId && (
      Array.isArray(primaryId) ? primaryId.includes(item.id) :
      (primaryId instanceof Set ? primaryId.has(item.id) : item.id === primaryId)
    );
    card.className = isPrimary ? "menu-card menu-card--primary menu-card--hero" : "menu-card";
    card.setAttribute("role", "listitem");
    const confVal = item.confidence ?? 90;
    const labelText = getConfidenceLabel(confVal);
    const badge = isPrimary
      ? `<span class="menu-card__badge">${labelText} (${confVal}%)</span>`
      : `<span class="menu-card__badge menu-card__badge--alt">بديل (${confVal}%)</span>`;
    const hasImage = Boolean(item.image && String(item.image).trim());
    const thumb = hasImage
      ? `<img class="menu-card__thumb${isPrimary ? " menu-card__thumb--hero" : ""}" src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async" width="${isPrimary ? 120 : 64}" height="${isPrimary ? 120 : 64}" />`
      : `<img class="menu-card__thumb menu-card__thumb--placeholder${isPrimary ? " menu-card__thumb--hero" : ""}" src="${PLACEHOLDER_IMAGE}" alt="" loading="lazy" decoding="async" width="${isPrimary ? 120 : 64}" height="${isPrimary ? 120 : 64}" />`;
    const reasonBlock =
      isPrimary && reason
        ? `<p class="menu-card__reason">${escapeHtml(reason)}</p>`
        : "";
    card.innerHTML = `
      ${thumb}
      <span class="menu-card__body">
        ${badge}
        <span class="menu-card__name">${escapeHtml(productDisplayName(item))}</span>
        <span class="menu-card__desc">${escapeHtml(item.description)}</span>
        ${reasonBlock}
        <span class="menu-card__price">${formatPrice(item.price, currency)}</span>
      </span>`;

    const thumbImg = card.querySelector(".menu-card__thumb");
    if (thumbImg) {
      thumbImg.style.cursor = "pointer";
      thumbImg.addEventListener("click", (e) => {
        e.stopPropagation();
        openProductViewer(item, { reason: isPrimary ? reason : "", currency });
      });
    }

    bindTap(card, () => onSelect(item));

    row.appendChild(card);
    cards.push(card);
  }

  staggerEnter(cards, { className: "motion-enter", step: 55 });

  const time = document.createElement("time");
  time.className = "message__time";
  time.dateTime = new Date().toISOString();
  time.textContent = formatMessageTime();

  stack.appendChild(row);
  stack.appendChild(time);
  wrap.appendChild(stack);
  return wrap;
}
