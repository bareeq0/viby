/**
 * Natural barista chat — bubble replies, adaptive flow (see flows.js).
 */

import { findItemByName } from "./logic.js";
import { recommend } from "./recommend-load.js";
import { stripMarkdown } from "../components/dom-utils.js";
import {
  applyFlowAnswer,
  applyRejectAnswer,
  getNextFlowStep,
  getOpeningFlowStep,
  getRejectionFlowStep,
  isFlowAnswer,
  isRejectAnswer,
  refreshRecommendations,
} from "./flows.js";
import { handleJourneyTurn } from "./recommendation-journey.js";

function assistantText(content) {
  return { role: "assistant", type: "text", content };
}

function assistantCards(items, primaryId = null, meta = {}) {
  return { role: "assistant", type: "cards", items, primaryId, ...meta };
}

function assistantProduct(item, reason, menuUrl) {
  return { role: "assistant", type: "product", item, reason, menuUrl };
}

const SERVED_QUICK_REPLIES = [
  { label: "تمام، شكراً", value: "action_thanks" },
  { label: "مش دي", value: "action_reject_prompt" },
];

export function getOpeningSequence(_partner) {
  const step = getOpeningFlowStep();
  return {
    messages: [assistantText(step.message)],
    quickReplies: step.quickReplies,
  };
}

function flowStepTurn(step) {
  return {
    messages: [assistantText(step.message)],
    quickReplies: step.quickReplies,
  };
}

function naturalRecommendationText(result) {
  return stripMarkdown(result.explanation);
}

async function recommendationMessages(session) {
  const bundle = session.lastRecommendation;
  if (!bundle) {
    await refreshRecommendations(session);
  }
  const result = session.lastRecommendation;
  const messages = [];
  const primary = result.primary?.item;
  const secondary = result.secondary?.item;
  if (primary) {
    messages.push(assistantText(naturalRecommendationText(result)));
    const primaryId = secondary ? [primary.id, secondary.id] : primary.id;
    messages.push(
      assistantCards(result.items, primaryId, {
        reason: stripMarkdown(result.explanation),
      })
    );
  } else {
    messages.push(assistantText(result.explanation));
  }
  return messages;
}

async function serveRecommendations(session) {
  await refreshRecommendations(session);
  session.step = "journey:decision";
  const messages = await recommendationMessages(session);
  messages.push(assistantText("✨ إيه رأيك؟"));
  return {
    messages,
    quickReplies: getJourneyDecisionReplies(session),
  };
}

async function advanceAfterFlowAnswer(session) {
  const next = getNextFlowStep(session);
  if (next) {
    session.step = next.id;
    return flowStepTurn(next);
  }
  return serveRecommendations(session);
}

async function originalProcessBubbleReply(value, session) {
  session.turn += 1;

  if (isFlowAnswer(value)) {
    await applyFlowAnswer(value, session);
    return advanceAfterFlowAnswer(session);
  }

  if (value === "action_thanks") {
    session.step = "done";
    return {
      messages: [
        assistantText("عاش! بالهنا والشفا ☕\n\nلو حبيت حاجة تانية، أنا هنا."),
      ],
      quickReplies: [
        { label: "حاجة تانية", value: "action_else" },
        { label: "نبدأ من الأول", value: "action_reset" },
      ],
    };
  }

  if (value === "action_reset") {
    return { reset: true };
  }

  if (value === "action_reject_prompt") {
    session.step = "reject_reason";
    const step = getRejectionFlowStep();
    return flowStepTurn(step);
  }

  if (isRejectAnswer(value)) {
    await applyRejectAnswer(value, session);
    session.step = "served";
    return {
      messages: [
        assistantText("تمام — جرب دي:"),
        ...(await recommendationMessages(session)),
      ],
      quickReplies: SERVED_QUICK_REPLIES,
    };
  }

  if (value === "action_else" || value === "action_cheaper") {
    const modifiers = value === "action_cheaper" ? ["budget"] : ["variety"];
    const result = await recommend(session, {
      excludeIds: session.lastRecommendations.map((i) => i.id),
      modifiers,
    });
    session.lastRecommendation = result;
    session.lastRecommendations = result.items;
    return {
      messages: await recommendationMessages(session),
      quickReplies: SERVED_QUICK_REPLIES,
    };
  }

  if (value === "action_redisplay") {
    if (!session.lastRecommendations.length) {
      return serveRecommendations(session);
    }
    return {
      messages: await recommendationMessages(session),
      quickReplies: SERVED_QUICK_REPLIES,
    };
  }

  if (value.startsWith("item:")) {
    const name = value.slice(5);
    const item = findItemByName(session.menu, name);
    if (item) {
      session.selectedItemId = item.id;
      const rec = session.lastRecommendation;
      const reason =
        (rec?.primary?.item?.id === item.id || rec?.secondary?.item?.id === item.id)
          ? stripMarkdown(rec.explanation)
          : "اختيار حلو — دي هتعجبك.";
      const messages = [assistantProduct(item, reason, session.partner.menuUrl)];

      const { complementaryForPrimary, buildPairingLine } = await import(
        "./recommendation-engine.js"
      );
      const pairingItem = complementaryForPrimary(session, item);
      if (pairingItem) {
        const pairingLine = stripMarkdown(
          buildPairingLine(item, pairingItem, session)
        );
        messages.push(assistantText(pairingLine));
        messages.push(
          assistantProduct(pairingItem, pairingLine, session.partner.menuUrl)
        );
      }

      return {
        messages,
        quickReplies: [
          { label: "حاجة شبهها", value: "action_else" },
          { label: "رجّع اللي كنت قايله", value: "action_redisplay" },
          { label: "تمام، شكراً", value: "action_thanks" },
        ],
      };
    }
  }

  if (session.lastRecommendation?.primary?.item) {
    return {
      messages: [
        assistantText("مش فاهم قصدك 😅\n\nلو مش دي — دوس «مش دي» وأظبطلك حاجة تانية."),
      ],
      quickReplies: SERVED_QUICK_REPLIES,
    };
  }

  return flowStepTurn(getOpeningFlowStep());
}

export async function processBubbleReply(value, session) {
  if (session.step && session.step.startsWith("journey:") && !value.startsWith("item:") && value !== "action_redisplay" && value !== "action_reset") {
    const journeyResult = await handleJourneyTurn(value, session);
    return handleJourneyResult(journeyResult, session);
  }

  const turn = await originalProcessBubbleReply(value, session);

  if (session.step && session.step.startsWith("journey:")) {
    if (turn && turn.quickReplies) {
      if (session.step === "journey:decision") {
        turn.quickReplies = getJourneyDecisionReplies(session);
      }
    }
  }

  return turn;
}

async function handleJourneyResult(journeyResult, session) {
  const messages = [];
  const quickReplies = [];

  const { messageKey, quickReplyKey, payload } = journeyResult;

  if (messageKey === "ask_decision") {
    messages.push(assistantText("✨ إيه رأيك؟"));
  } else if (messageKey === "ask_different_category") {
    messages.push(assistantText("تحب نجرب نوع مختلف؟"));
  } else if (messageKey === "ask_addon") {
    messages.push(assistantText("تحب تضيف حاجة معاه؟"));
  } else if (messageKey === "goodbye") {
    if (payload?.addonRecommendation) {
      const addonRec = payload.addonRecommendation;
      const addonMessages = await renderJourneyRecommendation(session, addonRec);
      messages.push(...addonMessages);
    }
    messages.push(assistantText("عاش! بالهنا والشفا ☕\n\nلو حبيت حاجة تانية، أنا هنا."));
  } else if (messageKey === "recommendation_intro") {
    if (payload?.recommendation) {
      const recMessages = await renderJourneyRecommendation(session, payload.recommendation);
      messages.push(...recMessages);
    }
    messages.push(assistantText("✨ إيه رأيك؟"));
  } else if (messageKey === "craving") {
    const step = getOpeningFlowStep();
    messages.push(assistantText(step.message));
  }

  if (quickReplyKey === "decision_buttons") {
    quickReplies.push(...getJourneyDecisionReplies(session));
  } else if (quickReplyKey === "category_picker_buttons") {
    quickReplies.push(
      { label: "☕ قهوة", value: "pick_coffee" },
      { label: "🍵 ماتشا", value: "pick_matcha" },
      { label: "🍰 حاجة حلوة", value: "pick_dessert" },
      { label: "🥐 حاجة تاكلها", value: "pick_food" },
      { label: "🍹 مشروب منعش", value: "pick_refresh" },
      { label: "🧊 حاجة ساقعة", value: "pick_cold" }
    );
  } else if (quickReplyKey === "addon_buttons") {
    if (payload?.addonType === "food") {
      quickReplies.push({ label: "🥐 أكل", value: "action_addon_food" });
    } else {
      quickReplies.push({ label: "🥤 مشروب", value: "action_addon_drink" });
    }
    quickReplies.push({ label: "لا شكراً", value: "action_addon_none" });
  } else if (quickReplyKey === "restart_buttons") {
    quickReplies.push(
      { label: "حاجة تانية", value: "action_else" },
      { label: "نبدأ من الأول", value: "action_reset" }
    );
  } else if (quickReplyKey === "craving") {
    const step = getOpeningFlowStep();
    quickReplies.push(...step.quickReplies);
  }

  return {
    messages,
    quickReplies,
  };
}

function getJourneyDecisionReplies(session) {
  return [
    { label: "✅ عجبني", value: "action_accept" },
    { label: "🔄 وريني اختيار تاني", value: "action_another" },
    { label: "💰 في حاجة أرخص", value: "action_cheaper" },
    { label: "🎯 عايز حاجة مختلفة", value: "action_different" }
  ];
}

async function renderJourneyRecommendation(session, result) {
  const messages = [];
  const primary = result.primary?.item;
  const secondary = result.secondary?.item;
  if (primary) {
    messages.push(assistantText(naturalRecommendationText(result)));
    const primaryId = secondary ? [primary.id, secondary.id] : primary.id;
    messages.push(
      assistantCards(result.items, primaryId, {
        reason: stripMarkdown(result.explanation),
      })
    );
  } else {
    messages.push(assistantText(result.explanation));
  }
  return messages;
}

export function replyValueForItem(item) {
  return `item:${item.name}`;
}

