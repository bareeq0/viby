/**
 * Animated intro overlay — timing and teardown only.
 */

export const SPLASH_DURATION_MS = 10000;

export function setSplashCafeName(displayName) {
  const welcome = document.getElementById("splashWelcome");
  if (welcome) welcome.textContent = `أهلاً بيك في ${displayName}`;
}

export function runSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return Promise.resolve();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.remove();
    document.body.classList.add("app-ready");
    return Promise.resolve();
  }

  document.body.classList.add("splash-playing");

  return new Promise((resolve) => {
    const finish = () => {
      splash.remove();
      document.body.classList.remove("splash-playing");
      document.body.classList.add("app-ready");
      resolve();
    };

    splash.addEventListener("animationend", finish, { once: true });
    setTimeout(finish, SPLASH_DURATION_MS + 120);
  });
}
