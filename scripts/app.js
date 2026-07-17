/**
 * Application entry — messaging-style chat, bubble-only replies.
 */

import { deferNonCriticalStyles, loadWebFontsWhenIdle } from "./perf.js";
import { initViewport } from "./viewport.js";
import { bindTap } from "./touch.js";
import { resolvePartner, applyBranding } from "./config.js";
import { createSession } from "./logic.js";
import {
  getOpeningSequence,
  processBubbleReply,
  replyValueForItem,
} from "./conversation.js";
import { mountMessages, clearMessages, renderUserMessage } from "../components/messages.js";
import { mountQuickReplies, setQuickReplies, setRepliesEnabled } from "../components/quick-replies.js";
import {
  playAssistantSequence,
  playOpeningSequence,
  delay,
} from "../components/chat-sequence.js";
import { setSplashCafeName, runSplash } from "../components/splash.js";
import { mountVipMascot, reactToUserMessage, reactToCelebrate, reactToLoading, reactToRejectFeedback, reactToRejectPrompt, reactToListening, glanceAtMenu, lookAtReplyDock } from "../components/vip-mascot.js";
import { isRejectAnswer } from "./flows.js";
import { registerServiceWorker } from "./pwa.js";
import { initPlatform, refreshPlatformContext, getPlatformDeps } from "../platform/bootstrap.js";
import { emit } from "../platform/events.js";
import * as platformApi from "../platform/api.js";

deferNonCriticalStyles();
initViewport();

let partner;
/** @type {import('./logic.js').Session | null} */
let session = null;
let isBusy = false;

function getMessageList() {
  return document.getElementById("messageList");
}

async function initSession() {
  partner = resolvePartner();
  refreshPlatformContext(partner);
  applyBranding(partner);
  const ctx = getPlatformDeps()?.context;
  const menu = await platformApi.getMenu(
    { partnerId: partner.id, userId: ctx?.userId ?? "" },
    partner.catalog ?? partner.id
  );
  session = createSession(menu, partner);
  emit("session:started", { partnerId: partner.id, menuSize: menu.length });
}

async function deliverTurn(turn) {
  const messageList = getMessageList();
  if (!messageList || !turn) return;

  await playAssistantSequence(
    messageList,
    turn.messages,
    handleCardSelect,
    partner.currency,
    partner.menuUrl
  );
  const cardTurn = turn.messages?.find((m) => m.type === "cards");
  if (cardTurn?.items) {
    emit("recommendation:shown", {
      itemIds: cardTurn.items.map((i) => i.id),
      primaryId: cardTurn.primaryId ?? null,
    });
  }
  setQuickReplies(turn.quickReplies, handleBubbleReply);
  if (turn.quickReplies?.length > 0) {
    lookAtReplyDock();
  }
  reactToListening(true);
}

async function startConversation() {
  if (!session) return;

  isBusy = true;
  setRepliesEnabled(false);
  clearMessages();

  const opening = getOpeningSequence(partner);
  const messageList = getMessageList();
  const quickReplies = await playOpeningSequence(
    opening,
    messageList,
    handleCardSelect,
    partner.currency,
    partner.menuUrl
  );

  setQuickReplies(quickReplies, handleBubbleReply);
  if (quickReplies?.length > 0) {
    lookAtReplyDock();
  }
  setRepliesEnabled(true);
  reactToListening(true);
  isBusy = false;
}

async function handleBubbleReply(value, label) {
  if (isBusy || !session) return;

  isBusy = true;
  setRepliesEnabled(false);
  setQuickReplies([], () => {});
  reactToListening(false);

  renderUserMessage(label);
  reactToUserMessage();
  emit("user:reply", { value, label });

  if (value === "action_reject_prompt") reactToRejectPrompt();
  if (isRejectAnswer(value)) reactToRejectFeedback();

  reactToLoading(true);
  await delay(420);

  const turn = await processBubbleReply(value, session);
  reactToLoading(false);

  const thanked = value === "action_thanks";

  if (turn.reset) {
    emit("session:reset", { partnerId: partner.id });
    await initSession();
    await delay(280);
    await startConversation();
    return;
  }

  await deliverTurn(turn);

  if (thanked) reactToCelebrate();

  setRepliesEnabled(true);
  isBusy = false;
}

function handleCardSelect(item) {
  emit("item:selected", { id: item.id, name: item.name, price: item.price });
  handleBubbleReply(replyValueForItem(item), item.name);
}

function wireEvents() {
  const restart = document.getElementById("btnRestart");
  if (restart) {
    bindTap(restart, () => {
      if (isBusy) return;
      initSession().then(() => startConversation());
    });
  }
}

function mountUi() {
  mountMessages(getMessageList());
  mountQuickReplies(document.getElementById("replyDock"));
  mountVipMascot();
}

async function boot() {
  registerServiceWorker();
  loadWebFontsWhenIdle();
  mountUi();
  wireEvents();

  partner = resolvePartner();
  await initPlatform(partner);

  await initSession();
  setSplashCafeName(partner.displayName);

  const splashDone = runSplash();
  startConversation();
  await splashDone;
  glanceAtMenu();
}

boot();

window.VIBY = {
  restart: async () => {
    await initSession();
    return startConversation();
  },
  getPartner: () => partner,
  platform: {
    getContext: () => getPlatformDeps()?.context ?? null,
    setLocale: (locale) => import("../platform/bootstrap.js").then((m) => m.setPlatformLocale(locale)),
    setTheme: (theme) => import("../platform/bootstrap.js").then((m) => m.setPlatformTheme(theme)),
    configureApi: (baseUrl) => import("../platform/api.js").then((m) => m.configureApiBase(baseUrl)),
  },
};
