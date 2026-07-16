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

// Eye positions and interpolation
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

// Micro Expressions
let lastIdleAction = "";

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
    scheduleMicroSaccades();
    resetSleepTimer();
    wireCompanionEvents();
    wireNaturalInteractions();
    wireReadingMode();
    wirePageVisibility();
    startAttentionLoop();
  }

  watchMessageList();
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

// Natural click interactions (no pointer follow, just click reactions)
function wireNaturalInteractions() {
  document.addEventListener("click", (e) => {
    if (reducedMotion || !root || !isMascotIdle()) return;
    if (companion && companion.contains(e.target)) return; // Giggle reaction handled separately
    
    // Happy click reaction: blink, smile, tiny bounce
    root.classList.add("vip-mascot--blink");
    root.classList.add("vip-mascot--micro-bounce");
    
    const prevExpr = companion.getAttribute("data-expression") || "smile";
    setExpression("happy");
    
    setTimeout(() => root?.classList.remove("vip-mascot--blink"), 240);
    setTimeout(() => {
      root?.classList.remove("vip-mascot--micro-bounce");
      if (isMascotIdle()) {
        setExpression(prevExpr);
      }
    }, 800);
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

// Attention system loop with smooth interpolation (lerp)
function updateAttentionLoop() {
  if (reducedMotion || !root || !isPageVisible) {
    rAFId = null;
    return;
  }

  // Look target uses targetLookX/Y + random tiny microX/Y saccades during idle
  const targetX = targetLookX + microX;
  const targetY = targetLookY + microY;

  // Easing lerp (0.12 represents soft premium follow)
  currentLookX += (targetX - currentLookX) * 0.12;
  currentLookY += (targetY - currentLookY) * 0.12;

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
      // Set to soft smile first
      setExpression("smile");
      
      // Premium Timing: wait 120ms -> eyes up -> bulb glow
      clearTimeout(overrideTimer);
      overrideTimer = setTimeout(() => {
        if (activeState === "thinking") {
          addStateClass("typing"); // Bulb glows
          setExpression("smile");  // Tiny smile
          targetLookX = 0;
          targetLookY = -2; // Eyes move slightly upward
          startAttentionLoop();

          // Small blink
          root.classList.add("vip-mascot--blink");
          setTimeout(() => root?.classList.remove("vip-mascot--blink"), 180);
        }
      }, 120);
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

function isMascotIdle() {
  return activeState === "idle" && !root?.classList.contains("vip-mascot--reading") && !root?.classList.contains("vip-mascot--pointing");
}

function scheduleMicroSaccades() {
  clearTimeout(saccadeTimer);
  
  // Saccades only occur during idle and when look targets are at neutral center
  const delay = 1200 + Math.random() * 2000;
  saccadeTimer = setTimeout(() => {
    if (isMascotIdle() && targetLookX === 0 && targetLookY === 0) {
      // Tiny saccade (0.3px to 0.5px maximum deviation)
      microX = (Math.random() - 0.5) * 0.8;
      microY = (Math.random() - 0.5) * 0.5;
      startAttentionLoop();
    } else {
      microX = 0;
      microY = 0;
    }
    scheduleMicroSaccades();
  }, delay);
}

// Idle Random Life Scheduler (Calm Café Companion, every 4-8 seconds)
function scheduleIdleExpression() {
  clearTimeout(idleTimer);
  const delayTime = 4000 + Math.random() * 4000;
  
  idleTimer = setTimeout(() => {
    if (!root || !isMascotIdle()) {
      scheduleIdleExpression();
      return;
    }

    // Weighted Probabilities:
    // 70% Breathe and Blink
    // 20% Tiny Eye Movement
    // 10% Micro Expression
    const rand = Math.random();
    
    if (rand < 0.70) {
      // 70% Blink (breathe is continuous via CSS)
      root.classList.add("vip-mascot--blink");
      setTimeout(() => root?.classList.remove("vip-mascot--blink"), 240);
    } else if (rand < 0.90) {
      // 20% Tiny Eye Movement
      const choices = [
        { x: -1.2, y: 0 },
        { x: 1.2, y: 0 },
        { x: 0, y: -1.0 },
        { x: 0.8, y: 0.5 },
        { x: -0.8, y: 0.5 }
      ];
      const choice = choices[Math.floor(Math.random() * choices.length)];
      targetLookX = choice.x;
      targetLookY = choice.y;
      startAttentionLoop();

      setTimeout(() => {
        if (isMascotIdle() && targetLookX === choice.x && targetLookY === choice.y) {
          targetLookX = 0;
          targetLookY = 0;
          startAttentionLoop();
        }
      }, 1000 + Math.random() * 800);
    } else {
      // 10% Micro Expression
      const expressions = ["smile", "head_tilt", "look_left", "look_right", "look_up"];
      const available = expressions.filter(e => e !== lastIdleAction);
      const action = available[Math.floor(Math.random() * available.length)];
      lastIdleAction = action;

      if (action === "smile") {
        setExpression("happy");
        setTimeout(() => {
          if (isMascotIdle()) setExpression("smile");
        }, 1200);
      } else if (action === "head_tilt") {
        pulseHeadTilt(1000);
      } else if (action === "look_left") {
        targetLookX = -3.0;
        targetLookY = 0;
        startAttentionLoop();
        setTimeout(() => {
          if (isMascotIdle() && targetLookX === -3.0) {
            targetLookX = 0;
            targetLookY = 0;
            startAttentionLoop();
          }
        }, 1500);
      } else if (action === "look_right") {
        targetLookX = 3.0;
        targetLookY = 0;
        startAttentionLoop();
        setTimeout(() => {
          if (isMascotIdle() && targetLookX === 3.0) {
            targetLookX = 0;
            targetLookY = 0;
            startAttentionLoop();
          }
        }, 1500);
      } else if (action === "look_up") {
        targetLookX = 0;
        targetLookY = -2.0;
        startAttentionLoop();
        setTimeout(() => {
          if (isMascotIdle() && targetLookY === -2.0) {
            targetLookX = 0;
            targetLookY = 0;
            startAttentionLoop();
          }
        }, 1500);
      }
    }

    scheduleIdleExpression();
  }, delayTime);
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
  clearTimeout(overrideTimer);
  
  transitionToState("wave");

  // Premium Timing: wait 150ms -> look toward message
  overrideTimer = setTimeout(() => {
    targetLookX = 3.5;
    targetLookY = 0.5;
    startAttentionLoop();

    // Look for 1 second, then return to neutral
    overrideTimer = setTimeout(() => {
      targetLookX = 0;
      targetLookY = 0;
      startAttentionLoop();
      if (activeState === "wave") {
        transitionToState("idle");
      }
    }, 1000);
  }, 150);
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
  clearTimeout(overrideTimer);
  clearTimeout(pointingResetTimer);

  if (intensity === "high") {
    transitionToState("excited");
  } else {
    transitionToState("idle");
  }

  // Premium Timing: wait 200ms -> smile & lean & look
  overrideTimer = setTimeout(() => {
    if (intensity === "high") {
      setExpression("excited");
    } else {
      setExpression("happy");
    }

    targetLookX = 3.5;
    targetLookY = 1.0;
    startAttentionLoop();

    // Body Lean/Tilt pointing vector calculation
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
        
        const pointX = (dx / dist) * 14;
        const pointY = (dy / dist) * 8;
        const pointTilt = (dx / dist) * 7;
        
        root.style.setProperty("--vip-point-x", `${pointX}px`);
        root.style.setProperty("--vip-point-y", `${pointY}px`);
        root.style.setProperty("--vip-point-tilt", `${pointTilt}deg`);
        root.classList.add("vip-mascot--pointing");
      }
    }

    // Hold for 1 second, then return to neutral
    overrideTimer = setTimeout(() => {
      targetLookX = 0;
      targetLookY = 0;
      startAttentionLoop();
      
      if (activeState === "excited" || activeState === "idle") {
        transitionToState("idle");
      }
      root?.classList.remove("vip-mascot--pointing");
      root?.style.setProperty("--vip-point-x", "0px");
      root?.style.setProperty("--vip-point-y", "0px");
      root?.style.setProperty("--vip-point-tilt", "0deg");
    }, 1000);
  }, 200);
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
  resetSleepTimer();
  clearTimeout(overrideTimer);

  // Glance down-right at replies
  targetLookX = 3.0;
  targetLookY = 2.0;
  startAttentionLoop();

  overrideTimer = setTimeout(() => {
    targetLookX = 0;
    targetLookY = 0;
    startAttentionLoop();
  }, 700);
}

export function glanceAtMenu() {
  resetSleepTimer();
  clearTimeout(overrideTimer);

  // Glance down-left at menu button
  targetLookX = -3.0;
  targetLookY = 1.5;
  startAttentionLoop();

  overrideTimer = setTimeout(() => {
    targetLookX = 0;
    targetLookY = 0;
    startAttentionLoop();
  }, 700);
}
