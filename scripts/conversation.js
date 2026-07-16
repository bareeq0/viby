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
  session.step = "served";
  return {
    messages: await recommendationMessages(session),
    quickReplies: SERVED_QUICK_REPLIES,
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

export async function processBubbleReply(value, session) {
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

export function replyValueForItem(item) {
  return `item:${item.name}`;
}
