/**
 * VIBY companion — premium café spirit; calm Pixar-like reactions.
 * One emotional state at a time; always-on subtle idle life.
 * Structure unchanged — behavior, timing, and easing only.
 */

let root = null;
let companion = null;
let messageList = null;
let sleepTimer = null;
let idleTimer = null;
let tiltTimer = null;
let readingTimer = null;
let reducedMotion = false;

/** @type {"idle"|"thinking"|"listening"|"celebrating"|"sleepy"|"wave"|"confused"|"excited"} */
let activeState = "idle";
let idlePaused = false;

/** Bumps on every reaction so stale timers cannot overlap states. */
let reactionGen = 0;

let currentLookX = 0;
let currentLookY = 0;
let targetLookX = 0;
let targetLookY = 0;
let microX = 0;
let microY = 0;

let rAFId = null;
let isPageVisible = true;
let saccadeTimer = null;
let overrideTimer = null;
/** @type {ReturnType<typeof setTimeout>[]} */
let pendingTimers = [];

const SLEEP_TIMEOUT_MS = 15000;

/** Premium ease — shared timing language with CSS. */
const EASE_HOLD = {
  blink: 220,
  nod: 580,
  microBounce: 640,
  sway: 1400,
  tilt: 920,
  smile: 1200,
  eyeHold: 1000,
  celebrateBounce: 780,
  celebrateWave: 1100,
  celebrateTotal: 2100,
  recommendHold: 1000,
  recommendLead: 160,
  goodbyeWave: 720,
  goodbyeEyes: 900,
  goodbyeTotal: 2600,
  menuGlance: 780,
  quickReply: 900,
};

/** Micro idle pool — one at a time; cycle through all before any repeat. */
const IDLE_ACTIONS = ["blink", "eye_move", "head_tilt", "body_sway", "small_smile"];
/** @type {string[]} */
let idleQueue = [];
/** @type {string} */
let lastIdleAction = "";

export function mountVipMascot() {
  root = document.getElementById("vipMascot");
  companion = document.getElementById("vipCompanion");
  messageList = document.getElementById("messageList");
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!root || !companion) return;

  root.classList.add("vip-mascot--alive");
  transitionToState("idle");

  if (!reducedMotion) {
    scheduleIdleExpression();
    scheduleMicroSaccades();
    resetSleepTimer();
    wireCompanionEvents();
    wireNaturalInteractions();
    wireReadingMode();
    wirePageVisibility();
    wireMenuGlance();
    startAttentionLoop();
  }

  watchMessageList();
}

function wireMenuGlance() {
  const menuBtn = document.getElementById("btnExternalMenu");
  if (!menuBtn) return;
  menuBtn.addEventListener("click", () => glanceAtMenu(), { passive: true });
}

function pauseIdle() {
  idlePaused = true;
  clearTimeout(idleTimer);
}

function resumeIdle() {
  idlePaused = false;
  if (!reducedMotion) scheduleIdleExpression();
}

function later(fn, ms) {
  const id = setTimeout(fn, ms);
  pendingTimers.push(id);
  return id;
}

function clearSequenceTimers() {
  clearTimeout(overrideTimer);
  overrideTimer = null;
  for (const id of pendingTimers) clearTimeout(id);
  pendingTimers = [];
}

/** Begin a reaction — cancels prior sequences; returns a generation guard. */
function beginReaction() {
  reactionGen += 1;
  clearSequenceTimers();
  resetSleepTimer();
  pauseIdle();
  return reactionGen;
}

function isCurrentReaction(gen) {
  return gen === reactionGen;
}

function wireCompanionEvents() {
  if (!companion) return;

  companion.addEventListener("pointerenter", () => {
    resetSleepTimer();
    if (activeState === "sleepy") transitionToState("idle");
  });

  companion.addEventListener("click", () => {
    resetSleepTimer();
    giggleReaction();
  });
}

function giggleReaction() {
  if (!root || !companion || reducedMotion || idlePaused) return;
  if (activeState !== "idle") return;

  const gen = beginReaction();
  setExpression("surprised");
  root.classList.add("vip-mascot--giggle");
  pulseHeadTilt(800);

  later(() => {
    if (!isCurrentReaction(gen)) return;
    if (root?.classList.contains("vip-mascot--giggle")) setExpression("happy");
  }, 300);

  later(() => {
    if (!isCurrentReaction(gen)) return;
    root?.classList.remove("vip-mascot--giggle");
    transitionToState("idle");
  }, 1100);
}

function resetSleepTimer() {
  if (reducedMotion) return;
  clearTimeout(sleepTimer);

  if (activeState === "sleepy") transitionToState("idle");

  sleepTimer = setTimeout(() => {
    if (activeState === "thinking" || activeState === "listening" || activeState === "celebrating") {
      resetSleepTimer();
      return;
    }
    if (idlePaused) {
      resetSleepTimer();
      return;
    }
    transitionToState("sleepy");
  }, SLEEP_TIMEOUT_MS);
}

function pulseHeadTilt(ms = EASE_HOLD.tilt) {
  if (!root || reducedMotion) return;
  root.classList.add("vip-mascot--tilt");
  clearTimeout(tiltTimer);
  tiltTimer = setTimeout(() => root?.classList.remove("vip-mascot--tilt"), ms);
  pendingTimers.push(tiltTimer);
}

function pulseClass(cls, ms) {
  if (!root || reducedMotion) return;
  root.classList.add(cls);
  later(() => root?.classList.remove(cls), ms);
}

function blinkOnce(ms = EASE_HOLD.blink) {
  if (!root || reducedMotion) return;
  root.classList.add("vip-mascot--blink");
  later(() => root?.classList.remove("vip-mascot--blink"), ms);
}

function watchMessageList() {
  if (!messageList) return;
  const obs = new MutationObserver(() => startAttentionLoop());
  obs.observe(messageList, { childList: true, subtree: true });
}

function wireNaturalInteractions() {
  document.addEventListener("click", (e) => {
    if (reducedMotion || !root || !isMascotIdle() || idlePaused) return;
    if (companion?.contains(e.target)) return;
    if (e.target.closest?.(".reply-bubble, #btnExternalMenu, #btnRestart")) return;

    const gen = beginReaction();
    blinkOnce();
    pulseClass("vip-mascot--micro-bounce", EASE_HOLD.microBounce);
    setExpression("happy");

    later(() => {
      if (!isCurrentReaction(gen)) return;
      transitionToState("idle");
    }, 800);
  });
}

function wireReadingMode() {
  if (!messageList) return;

  const triggerReadingMode = () => {
    if (!root || idlePaused) return;
    root.classList.add("vip-mascot--reading");
    clearTimeout(readingTimer);
    readingTimer = setTimeout(() => root?.classList.remove("vip-mascot--reading"), 2500);
  };

  messageList.addEventListener("scroll", triggerReadingMode, { passive: true });
  messageList.addEventListener("pointermove", triggerReadingMode, { passive: true });
}

function wirePageVisibility() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isPageVisible = false;
      if (rAFId) {
        cancelAnimationFrame(rAFId);
        rAFId = null;
      }
    } else {
      isPageVisible = true;
      startAttentionLoop();
      resetSleepTimer();
    }
  });
}

function updateAttentionLoop() {
  if (reducedMotion || !root || !isPageVisible) {
    rAFId = null;
    return;
  }

  const targetX = targetLookX + microX;
  const targetY = targetLookY + microY;

  /* Soft pursuit — Apple-like lag, not snap. */
  currentLookX += (targetX - currentLookX) * 0.1;
  currentLookY += (targetY - currentLookY) * 0.1;

  root.style.setProperty("--vip-look-x", `${currentLookX.toFixed(3)}px`);
  root.style.setProperty("--vip-look-y", `${currentLookY.toFixed(3)}px`);

  const isNeutral = Math.abs(currentLookX - targetX) < 0.01 && Math.abs(currentLookY - targetY) < 0.01;
  if (!isNeutral) {
    rAFId = requestAnimationFrame(updateAttentionLoop);
  } else {
    currentLookX = targetX;
    currentLookY = targetY;
    root.style.setProperty("--vip-look-x", `${currentLookX.toFixed(3)}px`);
    root.style.setProperty("--vip-look-y", `${currentLookY.toFixed(3)}px`);
    rAFId = null;
  }
}

function startAttentionLoop() {
  if (!rAFId && !reducedMotion && root && isPageVisible) {
    rAFId = requestAnimationFrame(updateAttentionLoop);
  }
}

function lookAt(x, y, holdMs = 700) {
  targetLookX = x;
  targetLookY = y;
  startAttentionLoop();
  if (holdMs <= 0) return;
  clearTimeout(overrideTimer);
  overrideTimer = setTimeout(() => {
    targetLookX = 0;
    targetLookY = 0;
    startAttentionLoop();
  }, holdMs);
}

function centerGaze() {
  targetLookX = 0;
  targetLookY = 0;
  startAttentionLoop();
}

export function transitionToState(newState, onTransitionComplete = null) {
  if (activeState === newState) {
    /* Re-enter idle so pause from beginReaction always resumes. */
    if (newState === "idle") {
      setExpression("smile");
      resumeIdle();
    }
    onTransitionComplete?.();
    return;
  }

  const needsIntermediateSmile =
    (activeState === "thinking" || activeState === "listening") &&
    (newState === "celebrating" || newState === "excited" || newState === "confused");

  if (needsIntermediateSmile) {
    setExpression("smile");
    clearAllStateClasses();
    activeState = "idle";
    later(() => {
      applyStateAndExpression(newState);
      onTransitionComplete?.();
    }, 220);
  } else {
    applyStateAndExpression(newState);
    onTransitionComplete?.();
  }
}

function clearAllStateClasses() {
  if (!root) return;
  root.classList.remove(
    "vip-mascot--typing",
    "vip-mascot--thinking",
    "vip-mascot--curious",
    "vip-mascot--loading",
    "vip-mascot--listening",
    "vip-mascot--celebrate",
    "vip-mascot--thanks",
    "vip-mascot--sleepy",
    "vip-mascot--wave",
    "vip-mascot--confused",
    "vip-mascot--recommend",
    "vip-mascot--pointing",
    "vip-mascot--nod",
    "vip-mascot--sway",
    "vip-mascot--goodbye",
    "vip-mascot--giggle",
    "vip-mascot--blink",
    "vip-mascot--tilt",
    "vip-mascot--micro-bounce",
    "vip-mascot--listening-bounce",
    "vip-mascot--peek-left",
    "vip-mascot--peek-right"
  );
}

function applyStateAndExpression(state) {
  clearAllStateClasses();
  activeState = state;

  switch (state) {
    case "idle":
      setExpression("smile");
      resumeIdle();
      break;
    case "thinking":
      /* Curious: lean forward, wider eyes, blink, thinking glow. */
      pauseIdle();
      setExpression("smile");
      addStateClass("thinking");
      addStateClass("curious");
      later(() => {
        if (activeState !== "thinking") return;
        addStateClass("typing");
        setExpression("think");
        targetLookX = 0.4;
        targetLookY = -1.6;
        startAttentionLoop();
        blinkOnce(180);
      }, 100);
      break;
    case "listening":
      pauseIdle();
      addStateClass("listening");
      setExpression("listening");
      pulseStateClass("listening-bounce", 480);
      break;
    case "celebrating":
      pauseIdle();
      addStateClass("celebrate");
      setExpression("happy");
      break;
    case "excited":
      pauseIdle();
      addStateClass("recommend");
      addStateClass("pointing");
      setExpression("excited");
      break;
    case "sleepy":
      addStateClass("sleepy");
      setExpression("sleepy");
      break;
    case "wave":
      pauseIdle();
      addStateClass("wave");
      setExpression("smile");
      break;
    case "confused":
      pauseIdle();
      addStateClass("confused");
      setExpression("confused");
      break;
  }
}

function addStateClass(cls) {
  root?.classList.add(`vip-mascot--${cls}`);
}

function removeStateClass(cls) {
  root?.classList.remove(`vip-mascot--${cls}`);
}

function pulseStateClass(cls, ms) {
  if (!root) return;
  addStateClass(cls);
  later(() => removeStateClass(cls), ms);
}

function isMascotIdle() {
  return (
    activeState === "idle" &&
    !idlePaused &&
    !root?.classList.contains("vip-mascot--reading") &&
    !root?.classList.contains("vip-mascot--pointing")
  );
}

function scheduleMicroSaccades() {
  clearTimeout(saccadeTimer);
  const delay = 1600 + Math.random() * 2000;
  saccadeTimer = setTimeout(() => {
    if (isMascotIdle() && targetLookX === 0 && targetLookY === 0) {
      microX = (Math.random() - 0.5) * 0.7;
      microY = (Math.random() - 0.5) * 0.45;
      startAttentionLoop();
      setTimeout(() => {
        microX = 0;
        microY = 0;
        startAttentionLoop();
      }, 450 + Math.random() * 350);
    }
    scheduleMicroSaccades();
  }, delay);
}

/** Refill idle queue shuffled; never start with last played action. */
function refillIdleQueue() {
  const pool = IDLE_ACTIONS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  if (pool[0] === lastIdleAction && pool.length > 1) {
    const swap = pool.findIndex((a, idx) => idx > 0 && a !== lastIdleAction);
    if (swap > 0) [pool[0], pool[swap]] = [pool[swap], pool[0]];
  }
  idleQueue = pool;
}

function pickIdleAction() {
  if (!idleQueue.length) refillIdleQueue();
  const action = idleQueue.shift();
  lastIdleAction = action;
  return action;
}

function runIdleAction(action) {
  if (!root || !isMascotIdle()) return;

  switch (action) {
    case "blink":
      blinkOnce();
      break;
    case "eye_move": {
      const choices = [
        { x: -1.1, y: 0 },
        { x: 1.1, y: 0 },
        { x: 0, y: -0.9 },
        { x: 0.7, y: 0.4 },
        { x: -0.7, y: 0.4 },
      ];
      const choice = choices[Math.floor(Math.random() * choices.length)];
      targetLookX = choice.x;
      targetLookY = choice.y;
      startAttentionLoop();
      setTimeout(() => {
        if (isMascotIdle()) centerGaze();
      }, EASE_HOLD.eyeHold + Math.random() * 300);
      break;
    }
    case "head_tilt":
      pulseHeadTilt(EASE_HOLD.tilt);
      break;
    case "body_sway":
      pulseClass("vip-mascot--sway", EASE_HOLD.sway);
      break;
    case "small_smile":
      setExpression("happy");
      setTimeout(() => {
        if (isMascotIdle()) setExpression("smile");
      }, EASE_HOLD.smile);
      break;
  }
}

/** Calm idle life — one micro animation every 3–7 s; no consecutive repeats. */
function scheduleIdleExpression() {
  clearTimeout(idleTimer);
  const delayTime = 3000 + Math.random() * 4000;

  idleTimer = setTimeout(() => {
    if (!root || idlePaused || !isMascotIdle()) {
      if (!idlePaused) scheduleIdleExpression();
      return;
    }
    runIdleAction(pickIdleAction());
    scheduleIdleExpression();
  }, delayTime);
}

/** @param {'smile'|'think'|'surprised'|'happy'|'proud'|'confused'|'listening'|'sleepy'|'excited'} expression */
export function setExpression(expression) {
  companion?.setAttribute("data-expression", expression);
}

export function reactToUserMessage() {
  beginReaction();
  centerGaze();
  transitionToState("idle");
}

/**
 * Assistant finished typing — soft celebrate:
 * happy smile → tiny bounce → warm glow → wave → idle.
 */
export function reactToAssistantMessage() {
  const gen = beginReaction();

  transitionToState("celebrating");
  lookAt(2.6, 0.4, 0);
  blinkOnce(160);

  later(() => {
    if (!isCurrentReaction(gen) || activeState !== "celebrating") return;
    clearAllStateClasses();
    activeState = "wave";
    addStateClass("wave");
    setExpression("happy");
  }, EASE_HOLD.celebrateBounce);

  later(() => {
    if (!isCurrentReaction(gen)) return;
    centerGaze();
    transitionToState("idle");
  }, EASE_HOLD.celebrateTotal);
}

/** @deprecated use reactToAssistantMessage */
export function reactToCurious() {
  reactToAssistantMessage();
}

/** Assistant starts typing — curious lean, wider eyes, thinking glow. */
export function reactToTyping() {
  beginReaction();
  transitionToState("thinking");
}

export function clearTypingReact() {
  if (activeState === "thinking") {
    beginReaction();
    transitionToState("idle");
  }
}

/** User tapped a quick reply — look toward replies, nod, smile, tiny bounce. */
export function reactToQuickReply() {
  const gen = beginReaction();

  lookAt(3.0, 2.2, 0);
  setExpression("happy");
  pulseClass("vip-mascot--nod", EASE_HOLD.nod);
  pulseClass("vip-mascot--micro-bounce", EASE_HOLD.microBounce);
  blinkOnce(180);

  later(() => {
    if (!isCurrentReaction(gen)) return;
    centerGaze();
    if (activeState === "idle" || activeState === "listening") {
      setExpression(activeState === "listening" ? "listening" : "smile");
    }
    resumeIdle();
  }, EASE_HOLD.quickReply);
}

/**
 * Recommendation appears — look, point, proud smile, stronger glow,
 * hold ~1s, return to idle.
 */
export function reactToRecommendation(intensity = "normal") {
  const gen = beginReaction();

  addStateClass("recommend");
  setExpression(intensity === "high" ? "excited" : "proud");

  later(() => {
    if (!isCurrentReaction(gen)) return;
    lookAt(3.2, 0.9, 0);

    if (root && messageList && !reducedMotion) {
      const cards = messageList.querySelectorAll(".message--cards, .message--product");
      const last = /** @type {HTMLElement | undefined} */ (cards[cards.length - 1]);
      if (last) {
        const mascotBox = root.getBoundingClientRect();
        const targetBox = last.getBoundingClientRect();
        const mx = mascotBox.left + mascotBox.width / 2;
        const my = mascotBox.top + mascotBox.height * 0.42;
        const tx = targetBox.left + targetBox.width / 2;
        const ty = targetBox.top + targetBox.height / 2;
        const dx = tx - mx;
        const dy = ty - my;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        root.style.setProperty("--vip-point-x", `${(dx / dist) * 12}px`);
        root.style.setProperty("--vip-point-y", `${(dy / dist) * 7}px`);
        root.style.setProperty("--vip-point-tilt", `${(dx / dist) * 6}deg`);
        root.classList.add("vip-mascot--pointing");
      }
    }

    later(() => {
      if (!isCurrentReaction(gen)) return;
      centerGaze();
      root?.classList.remove("vip-mascot--pointing", "vip-mascot--recommend");
      root?.style.setProperty("--vip-point-x", "0px");
      root?.style.setProperty("--vip-point-y", "0px");
      root?.style.setProperty("--vip-point-tilt", "0deg");
      transitionToState("idle");
    }, EASE_HOLD.recommendHold);
  }, EASE_HOLD.recommendLead);
}

export function reactToRejectPrompt() {
  beginReaction();
  transitionToState("confused");
}

export function reactToRejectFeedback() {
  const gen = beginReaction();
  transitionToState("confused");
  later(() => {
    if (!isCurrentReaction(gen)) return;
    if (activeState === "confused") transitionToState("idle");
  }, 1400);
}

export function reactToThanks() {
  reactToGoodbye();
}

export function reactToCelebrate() {
  reactToAssistantMessage();
}

/**
 * Conversation goodbye — wave, brief eye close, warm smile, return to breathing.
 */
export function reactToGoodbye() {
  const gen = beginReaction();

  transitionToState("wave");
  setExpression("happy");

  later(() => {
    if (!isCurrentReaction(gen)) return;
    root?.classList.add("vip-mascot--goodbye");
    setExpression("happy");
  }, EASE_HOLD.goodbyeWave);

  later(() => {
    if (!isCurrentReaction(gen)) return;
    root?.classList.remove("vip-mascot--goodbye");
    setExpression("smile");
    transitionToState("idle");
  }, EASE_HOLD.goodbyeTotal);
}

export function reactToLoading(on) {
  resetSleepTimer();
  if (on) {
    beginReaction();
    transitionToState("thinking");
  } else if (activeState === "thinking") {
    beginReaction();
    transitionToState("idle");
  }
}

export function reactToListening(on) {
  resetSleepTimer();
  if (on) {
    beginReaction();
    transitionToState("listening");
  } else if (activeState === "listening") {
    beginReaction();
    transitionToState("idle");
  }
}

export function lookAtReplyDock() {
  lookAt(3.0, 2.0, 700);
}

/** Menu opens — glance toward menu, then return. */
export function glanceAtMenu() {
  if (reducedMotion || !root) return;
  resetSleepTimer();

  root.classList.add("vip-mascot--peek-left");
  lookAt(-3.0, 1.4, EASE_HOLD.menuGlance);

  /* Own timer — must not be cancelled by chat reaction sequences. */
  setTimeout(() => {
    root?.classList.remove("vip-mascot--peek-left");
  }, EASE_HOLD.menuGlance);
}
