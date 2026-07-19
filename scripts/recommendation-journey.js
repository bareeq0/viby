import { recommend } from "./recommend-load.js";
import { resetJourney } from "./logic.js";

// The state machine decides WHERE to go.
export const JOURNEY_STATES = {
  "journey:decision": {
    actions: {
      accept: "journey:addon",
      another: "journey:recommendation",
      cheaper: "journey:recommendation",
      different: "journey:category"
    }
  },
  "journey:addon": {
    actions: {
      add_food: "journey:finish",
      add_drink: "journey:finish",
      skip: "journey:finish"
    }
  },
  "journey:category": {
    actions: {
      pick_category: "journey:recommendation"
    }
  },
  "journey:finish": {
    actions: {}
  }
};

// Handlers decide WHAT to do.

export function showDecision(session) {
  session.step = "journey:decision";
  return {
    state: "journey:decision",
    action: "show_decision",
    messageKey: "ask_decision",
    quickReplyKey: "decision_buttons",
    payload: {}
  };
}

export async function anotherRecommendation(session) {
  if (!session.journeyShownIds) {
    session.journeyShownIds = [];
  }
  for (const item of session.lastRecommendations || []) {
    if (!session.journeyShownIds.includes(item.id)) {
      session.journeyShownIds.push(item.id);
    }
  }

  const result = await recommend(session, {
    excludeIds: [...session.journeyShownIds]
  });
  session.lastRecommendation = result;
  session.lastRecommendations = result.items;

  return result;
}

export async function cheaperRecommendation(session) {
  const result = await recommend(session, {
    modifiers: ["budget"]
  });
  session.lastRecommendation = result;
  session.lastRecommendations = result.items;

  return result;
}

export function differentCategory(session) {
  session.step = "journey:category";
  return {
    state: "journey:category",
    action: "different",
    messageKey: "ask_different_category",
    quickReplyKey: "category_picker_buttons",
    payload: {}
  };
}

export function startAddonJourney(session) {
  session.step = "journey:addon";
  const primaryItem = session.lastRecommendation?.primary?.item;
  const addonType = (primaryItem?.category === "dessert" || primaryItem?.category === "food") ? "drink" : "food";
  return {
    state: "journey:addon",
    action: "accept",
    messageKey: "ask_addon",
    quickReplyKey: "addon_buttons",
    payload: {
      primaryItem,
      addonType
    }
  };
}

export function finishJourney(session) {
  session.step = "journey:finish";
  return {
    state: "journey:finish",
    action: "finish",
    messageKey: "goodbye",
    quickReplyKey: "restart_buttons",
    payload: {}
  };
}

/**
 * Transition engine (State Machine runner)
 * Processes a value based on the current journey state and returns a structured response.
 */
export async function handleJourneyTurn(value, session) {
  const currentStep = session.step;

  if (currentStep === "journey:decision") {
    if (value === "action_accept") {
      return startAddonJourney(session);
    }
    if (value === "action_another") {
      await anotherRecommendation(session);
      session.step = "journey:decision";
      return {
        state: "journey:decision",
        action: "another",
        messageKey: "recommendation_intro",
        quickReplyKey: "decision_buttons",
        payload: {
          recommendation: session.lastRecommendation
        }
      };
    }
    if (value === "action_cheaper") {
      await cheaperRecommendation(session);
      session.step = "journey:decision";
      return {
        state: "journey:decision",
        action: "cheaper",
        messageKey: "recommendation_intro",
        quickReplyKey: "decision_buttons",
        payload: {
          recommendation: session.lastRecommendation
        }
      };
    }
    if (value === "action_different") {
      return differentCategory(session);
    }
  }

  if (currentStep === "journey:category") {
    // Configure session slots for new category and reset flow answers
    session.slots = {
      craving: value,
      branch: value
    };
    session.flowFilterAnswers = [value];
    session.flowQuestionCount = 0;
    session.journeyShownIds = [];

    const result = await recommend(session);
    session.lastRecommendation = result;
    session.lastRecommendations = result.items;

    session.step = "journey:decision";
    return {
      state: "journey:decision",
      action: "recommend_category",
      messageKey: "recommendation_intro",
      quickReplyKey: "decision_buttons",
      payload: {
        recommendation: session.lastRecommendation
      }
    };
  }

  if (currentStep === "journey:addon") {
    if (value === "action_addon_none") {
      return finishJourney(session);
    }

    let targetCraving = "pick_food";
    if (value === "action_addon_drink") {
      targetCraving = "pick_coffee";
    }

    const tempSession = {
      ...session,
      slots: { ...session.slots, craving: targetCraving },
      flowFilterAnswers: []
    };

    const result = await recommend(tempSession);

    session.step = "journey:finish";
    return {
      state: "journey:finish",
      action: "finish",
      messageKey: "goodbye",
      quickReplyKey: "restart_buttons",
      payload: {
        addonRecommendation: result
      }
    };
  }

  if (currentStep === "journey:finish") {
    if (value === "action_else") {
      resetJourney(session);
      session.step = "craving";
      return {
        state: "craving",
        action: "restart_journey",
        messageKey: "craving",
        quickReplyKey: "craving",
        payload: {}
      };
    }
  }

  return finishJourney(session);
}
