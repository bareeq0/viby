/**
 * VIBY companion — magical coffee spirit; reacts to every conversation stage.
 */

let root = null;
let companion = null;
let messageList = null;
let sleepTimer = null;
let idleTimer = null;
let tiltTimer = null;
let pointingResetTimer = null;
let readingTimer = null;
let reducedMotion = false;

// State Machine
let activeState = "idle"; // idle, thinking, listening, celebrating, sleepy, wave, confused

// Cursor tracking
let mouseX = 0;
let mouseY = 0;
let mouseActive = false;
let mouseTimeout = null;

// Eyes interpolation
let currentLookX = 0;
let currentLookY = 0;
let rAFId = null;
let isPageVisible = true;
let overrideTarget = null;
let overrideTimer = null;

// Micro Expressions
let lastIdleAction = "";
const IDLE_ACTIONS = ["blink", "smile", "look_left", "look_right", "look_up", "tiny_bounce", "head_tilt"];

const SLEEP_TIMEOUT_MS = 15000; // 15 seconds of inactivity triggers Sleepy state

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
    resetSleepTimer();
    wireCompanionEvents();
    wireCursorTracking();
    wireReadingMode();
    wirePageVisibility();
    startAttentionLoop();
  }

  watchMessageList();
  wireReplyDock();
}

function wireCompanionEvents() {
  if (!companion) return;

  companion.addEventListener("pointerenter", () => {
    resetSleepTimer();
    // Wake up to smile
    if (activeState === "sleepy") {
      transitionToState("idle");
    }
  });

  companion.addEventListener("click", () => {
    resetSleepTimer();
    giggleReaction();
  });
}

function giggleReaction() {
  if (!root || !companion || reducedMotion) return;
  
  // Gasp surprise then happy giggle
  setExpression("surprised");
  root.classList.add("vip-mascot--giggle");
  pulseHeadTilt(800);
  
  setTimeout(() => {
    if (root.classList.contains("vip-mascot--giggle")) {
      setExpression("happy");
    }
  }, 300);

  setTimeout(() => {
    root.classList.remove("vip-mascot--giggle");
    if (activeState === "idle") {
      setExpression("smile");
    } else {
      applyStateAndExpression(activeState);
    }
  }, 1200);
}

function resetSleepTimer() {
  if (reducedMotion) return;
  clearTimeout(sleepTimer);
  
  // If we were sleepy, wake up
  if (activeState === "sleepy") {
    transitionToState("idle");
  }

  sleepTimer = setTimeout(() => {
    if (activeState === "thinking" || activeState === "listening") {
      // Don't fall asleep while busy
      resetSleepTimer();
      return;
    }
    // Fall asleep
    transitionToState("sleepy");
  }, SLEEP_TIMEOUT_MS);
}

function wireReplyDock() {
  const dock = document.getElementById("replyDock");
  if (!dock) return;

  dock.addEventListener(
    "pointerenter",
    (event) => {
      const btn = bubbleFromEvent(event);
      if (btn) focusReplyOption(btn);
    },
    true
  );

  dock.addEventListener("click", (event) => {
    const btn = bubbleFromEvent(event);
    if (btn) focusReplyOption(btn);
  });
}

/** @param {Event} event */
function bubbleFromEvent(event) {
  return /** @type {HTMLElement | null} */ (
    event.target instanceof Element ? event.target.closest(".reply-bubble") : null
  );
}

/** @param {HTMLElement} btn */
function focusReplyOption(btn) {
  resetSleepTimer();
  
  // Calculate relative target offset for btn immediately
  const mascotBox = root.getBoundingClientRect();
  const targetBox = btn.getBoundingClientRect();
  const mx = mascotBox.left + mascotBox.width / 2;
  const my = mascotBox.top + mascotBox.height * 0.42;
  const tx = targetBox.left + targetBox.width / 2;
  const ty = targetBox.top + targetBox.height / 2;
  const dx = tx - mx;
  const dy = ty - my;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const clampDist = Math.min(8, dist * 0.045);
  const lookX = (dx / dist) * clampDist;
  const lookY = (dy / dist) * clampDist;

  // Look at button for 400ms
  setOverrideTarget(lookX, lookY, 400);
  pulseHeadTilt(680);

  // Then look back at the user (center) for 800ms
  setTimeout(() => {
    setOverrideTarget(0, 0, 800);
  }, 400);
}

function pulseHeadTilt(ms = 680) {
  if (!root || reducedMotion) return;
  root.classList.add("vip-mascot--tilt");
  clearTimeout(tiltTimer);
  tiltTimer = setTimeout(() => root.classList.remove("vip-mascot--tilt"), ms);
}

function watchMessageList() {
  if (!messageList) return;
  const obs = new MutationObserver(() => startAttentionLoop());
  obs.observe(messageList, { childList: true, subtree: true });
}

// Cursor tracking
function wireCursorTracking() {
  document.addEventListener("pointermove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    mouseActive = true;
    
    clearTimeout(mouseTimeout);
    startAttentionLoop();

    // Return to neutral after 1.5 seconds of no mouse movement
    mouseTimeout = setTimeout(() => {
      mouseActive = false;
    }, 1500);
  });

  // When user clicks -> look toward cursor for 1s
  document.addEventListener("click", (e) => {
    if (reducedMotion || !root) return;
    if (companion && companion.contains(e.target)) return; // giggling handled separately
    
    const mascotBox = root.getBoundingClientRect();
    const mx = mascotBox.left + mascotBox.width / 2;
    const my = mascotBox.top + mascotBox.height * 0.42;
    const dx = e.clientX - mx;
    const dy = e.clientY - my;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clampDist = Math.min(8, dist * 0.05);
    const lookX = (dx / dist) * clampDist;
    const lookY = (dy / dist) * clampDist;

    setOverrideTarget(lookX, lookY, 1000);
  });
}

// Reading mode detection
function wireReadingMode() {
  if (!messageList) return;
  
  const triggerReadingMode = () => {
    if (!root) return;
    root.classList.add("vip-mascot--reading");
    clearTimeout(readingTimer);
    readingTimer = setTimeout(() => {
      root?.classList.remove("vip-mascot--reading");
    }, 2500);
  };

  messageList.addEventListener("scroll", triggerReadingMode, { passive: true });
  messageList.addEventListener("pointermove", triggerReadingMode, { passive: true });
}

// Page visibility events
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

export function setOverrideTarget(x, y, duration) {
  overrideTarget = { x, y };
  clearTimeout(overrideTimer);
  startAttentionLoop();
  
  overrideTimer = setTimeout(() => {
    overrideTarget = null;
  }, duration);
}

// Visual attention priority target finder
function getAttentionTarget() {
  if (reducedMotion) return null;

  if (overrideTarget) {
    return "override";
  }

  // 1. Active quick replies
  const dock = document.getElementById("replyDock");
  if (dock && !dock.classList.contains("reply-dock--hidden")) {
    const bubbles = dock.querySelectorAll(".reply-bubble");
    if (bubbles.length > 0) {
      return dock;
    }
  }

  // 2. Recommendation card
  if (messageList) {
    const cards = messageList.querySelectorAll(".message--cards, .message--product");
    if (cards.length > 0) {
      return cards[cards.length - 1];
    }
  }

  // 3. Latest assistant message bubble
  if (messageList) {
    const assistantMsgs = messageList.querySelectorAll(".message--assistant:not(.message--typing)");
    if (assistantMsgs.length > 0) {
      const lastMsg = assistantMsgs[assistantMsgs.length - 1];
      return lastMsg.querySelector(".message__bubble") || lastMsg;
    }
  }

  // 4. Menu button
  const menuBtn = document.getElementById("btnExternalMenu");
  if (menuBtn && !menuBtn.hidden) {
    return menuBtn;
  }

  // 5. Mouse cursor
  if (mouseActive) {
    return "cursor";
  }

  // 6. Default (user)
  return null;
}

// Attention system loop with smooth interpolation (lerp)
function updateAttentionLoop() {
  if (reducedMotion || !root || !isPageVisible) {
    rAFId = null;
    return;
  }

  const target = getAttentionTarget();
  let targetX = 0;
  let targetY = 0;

  if (target === "override" && overrideTarget) {
    targetX = overrideTarget.x;
    targetY = overrideTarget.y;
  } else if (target === "cursor") {
    const mascotBox = root.getBoundingClientRect();
    const mx = mascotBox.left + mascotBox.width / 2;
    const my = mascotBox.top + mascotBox.height * 0.42;
    const dx = mouseX - mx;
    const dy = mouseY - my;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clampDist = Math.min(8, dist * 0.05);
    targetX = (dx / dist) * clampDist;
    targetY = (dy / dist) * clampDist;
  } else if (target instanceof HTMLElement) {
    const mascotBox = root.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    const mx = mascotBox.left + mascotBox.width / 2;
    const my = mascotBox.top + mascotBox.height * 0.42;
    const tx = targetBox.left + targetBox.width / 2;
    const ty = targetBox.top + targetBox.height / 2;
    const dx = tx - mx;
    const dy = ty - my;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const clampDist = Math.min(8, dist * 0.045);
    targetX = (dx / dist) * clampDist;
    targetY = (dy / dist) * clampDist;
  }

  // Easing lerp (0.1 represents soft premium follow)
  currentLookX += (targetX - currentLookX) * 0.1;
  currentLookY += (targetY - currentLookY) * 0.1;

  root.style.setProperty("--vip-look-x", `${currentLookX.toFixed(3)}px`);
  root.style.setProperty("--vip-look-y", `${currentLookY.toFixed(3)}px`);

  const isNeutral = Math.abs(currentLookX) < 0.01 && Math.abs(currentLookY) < 0.01;
  if (target !== null || !isNeutral) {
    rAFId = requestAnimationFrame(updateAttentionLoop);
  } else {
    currentLookX = 0;
    currentLookY = 0;
    root.style.setProperty("--vip-look-x", "0px");
    root.style.setProperty("--vip-look-y", "0px");
    rAFId = null;
  }
}

function startAttentionLoop() {
  if (!rAFId && !reducedMotion && root && isPageVisible) {
    rAFId = requestAnimationFrame(updateAttentionLoop);
  }
}

// State Machine transitions
export function transitionToState(newState, onTransitionComplete = null) {
  if (activeState === newState) {
    if (onTransitionComplete) onTransitionComplete();
    return;
  }

  // Emotional Continuity: Never jump directly between unrelated emotions.
  // Transition through a natural intermediate smile state first if coming from typing/listening
  // directly to high-excitement states.
  const needsIntermediateSmile = 
    (activeState === "thinking" || activeState === "listening") && 
    (newState === "celebrating" || newState === "excited" || newState === "confused");

  if (needsIntermediateSmile) {
    setExpression("smile");
    clearAllStateClasses();
    activeState = "idle";
    
    setTimeout(() => {
      applyStateAndExpression(newState);
      if (onTransitionComplete) onTransitionComplete();
    }, 300);
  } else {
    applyStateAndExpression(newState);
    if (onTransitionComplete) onTransitionComplete();
  }
}

function clearAllStateClasses() {
  if (!root) return;
  root.classList.remove(
    "vip-mascot--typing",
    "vip-mascot--thinking",
    "vip-mascot--loading",
    "vip-mascot--listening",
    "vip-mascot--celebrate",
    "vip-mascot--thanks",
    "vip-mascot--sleepy",
    "vip-mascot--wave",
    "vip-mascot--confused",
    "vip-mascot--recommend",
    "vip-mascot--pointing"
  );
}

function applyStateAndExpression(state) {
  clearAllStateClasses();
  activeState = state;

  switch (state) {
    case "idle":
      setExpression("smile");
      break;
    case "thinking":
      addStateClass("typing");
      setExpression("think");
      break;
    case "listening":
      addStateClass("listening");
      setExpression("listening");
      pulseStateClass("listening-bounce", 500);
      break;
    case "celebrating":
      addStateClass("celebrate");
      setExpression("happy");
      break;
    case "excited":
      addStateClass("recommend");
      addStateClass("pointing");
      setExpression("excited");
      break;
    case "sleepy":
      addStateClass("sleepy");
      setExpression("sleepy");
      break;
    case "wave":
      addStateClass("wave");
      setExpression("smile");
      break;
    case "confused":
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
  setTimeout(() => removeStateClass(cls), ms);
}

// Micro Expressions
function scheduleIdleExpression() {
  clearTimeout(idleTimer);
  const delayTime = 3000 + Math.random() * 5000;
  idleTimer = setTimeout(() => {
    if (!root || activeState !== "idle") {
      scheduleIdleExpression();
      return;
    }

    let available = IDLE_ACTIONS.filter(act => act !== lastIdleAction);
    const action = available[Math.floor(Math.random() * available.length)];
    lastIdleAction = action;

    playMicroExpression(action);
    scheduleIdleExpression();
  }, delayTime);
}

function playMicroExpression(action) {
  root.classList.remove("vip-mascot--peek-left", "vip-mascot--peek-right", "vip-mascot--peek-up", "vip-mascot--micro-bounce");
  
  if (action === "blink") {
    root.classList.add("vip-mascot--blink");
    setTimeout(() => root?.classList.remove("vip-mascot--blink"), 240);
  } else if (action === "smile") {
    setExpression("happy");
    setTimeout(() => {
      if (activeState === "idle") setExpression("smile");
    }, 1000);
  } else if (action === "look_left") {
    root.classList.add("vip-mascot--peek-left");
    setTimeout(() => root?.classList.remove("vip-mascot--peek-left"), 1200);
  } else if (action === "look_right") {
    root.classList.add("vip-mascot--peek-right");
    setTimeout(() => root?.classList.remove("vip-mascot--peek-right"), 1200);
  } else if (action === "look_up") {
    root.classList.add("vip-mascot--peek-up");
    setTimeout(() => root?.classList.remove("vip-mascot--peek-up"), 1200);
  } else if (action === "tiny_bounce") {
    root.classList.add("vip-mascot--micro-bounce");
    setTimeout(() => root?.classList.remove("vip-mascot--micro-bounce"), 800);
  } else if (action === "head_tilt") {
    pulseHeadTilt(1000);
  }
}

/** @param {'smile'|'think'|'surprised'|'happy'|'proud'|'confused'|'listening'|'sleepy'|'excited'} expression */
export function setExpression(expression) {
  companion?.setAttribute("data-expression", expression);
}

// Reactions
export function reactToUserMessage() {
  resetSleepTimer();
  transitionToState("idle");
}

export function reactToAssistantMessage() {
  resetSleepTimer();
  transitionToState("wave");
  
  // Natural Eye Contact: Look at the user for 300ms first, then look at message
  setOverrideTarget(0, 0, 300);
  
  setTimeout(() => {
    startAttentionLoop();
  }, 300);
}

/** @deprecated use reactToAssistantMessage */
export function reactToCurious() {
  reactToAssistantMessage();
}

export function reactToTyping() {
  resetSleepTimer();
  transitionToState("thinking");
}

export function clearTypingReact() {
  if (activeState === "thinking") {
    transitionToState("idle");
  }
}

export function reactToRecommendation(intensity = "normal") {
  resetSleepTimer();
  
  if (intensity === "high") {
    transitionToState("excited");
  } else {
    transitionToState("idle"); // Normal recommendation: calm small smile (idle expression is smile)
  }

  // Handle pointing vector calculation
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
      
      // Lean/translate 14px and tilt 7 degrees towards the card
      const pointX = (dx / dist) * 14;
      const pointY = (dy / dist) * 8;
      const pointTilt = (dx / dist) * 7;
      
      root.style.setProperty("--vip-point-x", `${pointX}px`);
      root.style.setProperty("--vip-point-y", `${pointY}px`);
      root.style.setProperty("--vip-point-tilt", `${pointTilt}deg`);
      root.classList.add("vip-mascot--pointing");
      
      clearTimeout(pointingResetTimer);
      pointingResetTimer = setTimeout(() => {
        root?.classList.remove("vip-mascot--pointing");
        root?.style.setProperty("--vip-point-x", "0px");
        root?.style.setProperty("--vip-point-y", "0px");
        root?.style.setProperty("--vip-point-tilt", "0deg");
      }, 2200);
    }
  }
}

export function reactToRejectPrompt() {
  resetSleepTimer();
  transitionToState("confused");
}

export function reactToRejectFeedback() {
  resetSleepTimer();
  transitionToState("confused");
  setTimeout(() => {
    if (activeState === "confused") transitionToState("idle");
  }, 1500);
}

export function reactToThanks() {
  resetSleepTimer();
  transitionToState("celebrating");
}

export function reactToCelebrate() {
  resetSleepTimer();
  transitionToState("celebrating");
  setTimeout(() => {
    if (activeState === "celebrating") transitionToState("idle");
  }, 2200);
}

export function reactToLoading(on) {
  resetSleepTimer();
  if (on) {
    transitionToState("thinking");
  } else if (activeState === "thinking") {
    transitionToState("idle");
  }
}

export function reactToListening(on) {
  resetSleepTimer();
  if (on) {
    transitionToState("listening");
  } else if (activeState === "listening") {
    transitionToState("idle");
  }
}

export function lookAtReplyDock() {
  const dock = document.getElementById("replyDock");
  if (dock && !dock.classList.contains("reply-dock--hidden")) {
    startAttentionLoop();
  }
}

export function glanceAtMenu() {
  const menuBtn = document.getElementById("btnExternalMenu");
  if (menuBtn && !menuBtn.hidden) {
    startAttentionLoop();
  }
}
