/** Sequences assistant turns with typing delay and mascot reactions. */

import {
  showTyping,
  hideTyping,
  renderAssistantText,
  appendAssistantNode,
} from "./messages.js";
import { renderMenuCards, renderProductShowcase } from "./menu-cards.js";
import {
  reactToTyping,
  clearTypingReact,
  reactToAssistantMessage,
  reactToRecommendation,
} from "./vip-mascot.js";

const TYPING_DELAY_MS = 720;
const STAGGER_MS = 120;
const BETWEEN_BEATS_MS = 480;

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playOneMessage(messageList, msg, onCardSelect, currency, menuUrl) {
  showTyping();
  reactToTyping();
  await delay(TYPING_DELAY_MS);
  hideTyping();
  clearTypingReact();

  if (msg.type === "text") {
    renderAssistantText(msg.content);
    reactToAssistantMessage();
  } else if (msg.type === "cards") {
    appendAssistantNode(
      renderMenuCards(
        msg.items,
        onCardSelect,
        currency,
        msg.primaryId ?? null,
        msg.reason ?? ""
      )
    );
    reactToRecommendation(msg.primaryId ? "high" : "normal");
  } else if (msg.type === "product") {
    appendAssistantNode(
      renderProductShowcase(msg.item, {
        reason: msg.reason ?? "",
        menuUrl: msg.menuUrl ?? menuUrl ?? "",
        currency,
      })
    );
    reactToRecommendation("high");
  }
}

/**
 * @param {HTMLElement} messageList
 * @param {object[]} messages
 * @param {(item: object) => void} onCardSelect
 * @param {string} [currency]
 * @param {string} [menuUrl]
 */
export async function playAssistantSequence(
  messageList,
  messages,
  onCardSelect,
  currency = "USD",
  menuUrl = ""
) {
  for (let i = 0; i < messages.length; i++) {
    await playOneMessage(messageList, messages[i], onCardSelect, currency, menuUrl);
    if (i < messages.length - 1) {
      await delay(STAGGER_MS);
    }
  }
}

/**
 * Opening: first barista question only.
 */
export async function playOpeningSequence(opening, messageList, onCardSelect, currency, menuUrl = "") {
  await playAssistantSequence(messageList, opening.messages, onCardSelect, currency, menuUrl);
  return opening.quickReplies ?? [];
}
