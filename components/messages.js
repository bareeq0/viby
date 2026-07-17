/** Chat message list: bubbles, timestamps, typing indicator. */

import { parseBoldMarkdown } from "./dom-utils.js";
import { prefersReducedMotion } from "../scripts/motion.js";
import { refreshReplyDockHeight } from "../scripts/viewport.js";

let listEl = null;
let typingEl = null;
let contentObs = null;

const BOTTOM_THRESHOLD = 96;

const timeFormatter = new Intl.DateTimeFormat("ar-EG", {
  hour: "numeric",
  minute: "2-digit",
});

export function mountMessages(container) {
  listEl = container;
  if (!listEl) return;

  listEl.addEventListener("scroll", onMessagesScroll, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    contentObs = new ResizeObserver(() => {
      if (pinnedToBottom) scrollToBottom(false);
    });
    contentObs.observe(listEl);
  }
}

let pinnedToBottom = true;

function onMessagesScroll() {
  if (!listEl) return;
  const dist = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
  pinnedToBottom = dist <= BOTTOM_THRESHOLD;
}

export function clearMessages() {
  if (listEl) listEl.innerHTML = "";
  hideTyping();
  pinnedToBottom = true;
}

export function formatMessageTime(date = new Date()) {
  return timeFormatter.format(date);
}

export function scrollMessagesToEnd() {
  scrollToBottom(true);
}

function scrollBehavior() {
  return prefersReducedMotion() ? "auto" : "smooth";
}

function scrollToBottom(force = true) {
  if (!listEl) return;
  if (!force && !pinnedToBottom) return;

  requestAnimationFrame(() => {
    const top = listEl.scrollHeight - listEl.clientHeight;
    if (prefersReducedMotion()) {
      listEl.scrollTop = top;
    } else {
      listEl.scrollTo({ top, behavior: scrollBehavior() });
    }
  });
}

function buildMessageStack(role, bodyNodes, timeText) {
  const wrap = document.createElement("div");
  wrap.className = `message message--${role}`;

  const stack = document.createElement("div");
  stack.className = "message__stack";

  const bubble = document.createElement("div");
  bubble.className = "message__bubble";
  for (const node of bodyNodes) {
    bubble.appendChild(node);
  }

  const time = document.createElement("time");
  time.className = "message__time";
  time.dateTime = new Date().toISOString();
  time.textContent = timeText;

  stack.appendChild(bubble);
  stack.appendChild(time);
  wrap.appendChild(stack);
  return wrap;
}

function append(node) {
  listEl.appendChild(node);
  scrollToBottom(true);
}

export function showTyping() {
  hideTyping();
  const wrap = document.createElement("div");
  wrap.className = "message message--assistant message--typing message--enter";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `
    <div class="message__stack">
      <div class="message__bubble message__bubble--typing">
        <span class="typing"><span></span><span></span><span></span></span>
      </div>
    </div>`;
  listEl.appendChild(wrap);
  typingEl = wrap;
  scrollToBottom(true);
}

export function hideTyping() {
  typingEl?.remove();
  typingEl = null;
}

export function renderUserMessage(text) {
  const wrap = buildMessageStack("user", [document.createTextNode(text)], formatMessageTime());
  wrap.classList.add("message--enter");
  append(wrap);
}

export function renderAssistantText(content) {
  const frag = document.createDocumentFragment();
  frag.appendChild(parseBoldMarkdown(content));
  const wrap = buildMessageStack("assistant", [frag], formatMessageTime());
  wrap.classList.add("message--enter");
  append(wrap);
}

export function appendAssistantNode(node) {
  node.classList.add("message--enter");
  listEl.appendChild(node);
  scrollToBottom(true);
}

/** After reply dock resizes, keep the latest messages visible. */
export function syncScrollAfterDockChange() {
  refreshReplyDockHeight();
  requestAnimationFrame(() => scrollToBottom(true));
}
