/** Tappable reply bubbles — the only way users respond (no forms). */

import { syncScrollAfterDockChange } from "./messages.js";
import { staggerChildren } from "../scripts/motion.js";
import { bindTap } from "../scripts/touch.js";
import { refreshReplyDockHeight } from "../scripts/viewport.js";

let containerEl = null;
let pickHandler = null;

const REPLY_ICONS = {
  mood_hot: "steam",
  mood_cold: "ice",
  mood_sweet: "sweet",
  mood_fresh: "leaf",
  mood_any: "spark",
  energy_boost: "bolt",
  energy_balanced: "balance",
  energy_calm: "moon",
  wellness_healthy: "leaf",
  wellness_indulgent: "heart",
  wellness_any: "spark",
  budget_yes: "coin",
  budget_no: "spark",
  action_else: "refresh",
  action_cheaper: "coin",
  action_thanks: "check",
  action_reset: "refresh",
  default: "arrow",
};

function iconClassForReply(reply) {
  const prefix = reply.value.split("_")[0];
  if (reply.value.startsWith("occasion_")) return "reply-bubble__icon--cup";
  const key = REPLY_ICONS[reply.value] ?? REPLY_ICONS[`${prefix}_any`] ?? REPLY_ICONS.default;
  return `reply-bubble__icon--${key}`;
}

export function mountQuickReplies(container) {
  containerEl = container;
}

export function setQuickReplies(replies, onPick) {
  pickHandler = onPick;
  if (!containerEl) return;
  containerEl.innerHTML = "";

  if (!replies?.length) {
    containerEl.classList.add("reply-dock--hidden");
    refreshReplyDockHeight();
    return;
  }

  containerEl.classList.remove("reply-dock--hidden");

  const label = document.createElement("p");
  label.className = "reply-dock__hint";
  label.textContent = "دوس واختار";
  containerEl.appendChild(label);

  const row = document.createElement("div");
  row.className = "reply-bubbles";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "اختيارات الرد");

  for (const reply of replies) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "reply-bubble";
    const icon = document.createElement("span");
    icon.className = `reply-bubble__icon ${iconClassForReply(reply)}`;
    icon.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "reply-bubble__label";
    text.textContent = reply.label;
    btn.appendChild(icon);
    btn.appendChild(text);
    bindTap(btn, () => {
      if (pickHandler) pickHandler(reply.value, reply.label);
    });
    row.appendChild(btn);
  }

  containerEl.appendChild(row);
  staggerChildren(row, ".reply-bubble", { className: "motion-enter", step: 38 });
  syncScrollAfterDockChange();
}

export function setRepliesEnabled(enabled) {
  if (!containerEl) return;
  containerEl.classList.toggle("reply-dock--disabled", !enabled);
  containerEl.querySelectorAll(".reply-bubble").forEach((btn) => {
    btn.disabled = !enabled;
  });
}
