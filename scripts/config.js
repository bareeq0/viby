/**
 * Café configuration — only these fields differ per partner.
 * Recommendation engine and chat logic stay identical across cafés.
 */

/** @typedef {{
 *   beige: string,
 *   pistachio: string,
 *   burgundy: string,
 *   warmWhite: string,
 *   coffeeBrown: string,
 * }} CafeTheme
 *
 * @typedef {{
 *   instagram?: string,
 *   facebook?: string,
 *   tiktok?: string,
 * }} SocialLinks
 *
 * @typedef {{
 *   id: string,
 *   displayName: string,
 *   logo: string | null,
 *   menuUrl: string,
 *   menuButtonLabel?: string,
 *   socialLinks: SocialLinks,
 *   catalog: string,
 *   theme: CafeTheme,
 *   currency?: string,
 *   locale?: string,
 *   greeting: string,
 * }} CafeConfig
 */

const DEFAULT_THEME = {
  beige: "#E6DCC8",
  pistachio: "#C5D4B8",
  burgundy: "#4A1F2E",
  warmWhite: "#FAF7F2",
  coffeeBrown: "#3D2E24",
};

/** @type {Record<string, CafeConfig>} */
const CAFES = {
  bareeq: {
    id: "bareeq",
    displayName: "Bareeq",
    logo: "assets/images/partners/bareeq.svg",
    menuUrl: "https://bareeq0.github.io/bareeq-menu/",
    menuButtonLabel: "افتح المنيو",
    socialLinks: {
      instagram: "https://instagram.com/",
    },
    catalog: "bareeq",
    theme: { ...DEFAULT_THEME },
    currency: "EGP",
    locale: "ar",
    greeting: "صباح الفل! أنا في Bareeq — تحت أمرك.",
  },
  demo: {
    id: "demo",
    displayName: "ديلي جريند",
    logo: null,
    menuUrl: "https://bareeq0.github.io/bareeq-menu/",
    menuButtonLabel: "المنيو",
    socialLinks: {
      instagram: "https://instagram.com/",
    },
    catalog: "demo",
    theme: { ...DEFAULT_THEME },
    currency: "EGP",
    locale: "ar",
    greeting: "صباح الفل! أنا في ديلي جريند — اتفضل.",
  },
  starbucks: {
    id: "starbucks",
    displayName: "ستاربكس",
    logo: "assets/images/partners/starbucks.svg",
    menuUrl: "https://bareeq0.github.io/bareeq-menu/",
    menuButtonLabel: "منيو ستاربكس",
    socialLinks: {
      instagram: "https://instagram.com/starbucks",
      facebook: "https://facebook.com/starbucks",
    },
    catalog: "starbucks",
    theme: {
      ...DEFAULT_THEME,
      pistachio: "#A8C4A2",
      burgundy: "#00704A",
    },
    currency: "EGP",
    locale: "ar",
    greeting: "أهلاً! أنا هنا في ستاربكس — نور.",
  },
  costa: {
    id: "costa",
    displayName: "كوستا",
    logo: "assets/images/partners/costa.svg",
    menuUrl: "https://bareeq0.github.io/bareeq-menu/",
    menuButtonLabel: "افتح المنيو",
    socialLinks: {
      instagram: "https://instagram.com/costa",
    },
    catalog: "costa",
    theme: {
      ...DEFAULT_THEME,
      burgundy: "#6F1D1B",
    },
    currency: "EGP",
    locale: "ar",
    greeting: "إزيك! كوستا — تحت أمرك.",
  },
  barico: {
    id: "barico",
    displayName: "باريكو",
    logo: "assets/images/partners/barico.svg",
    menuUrl: "https://barico.cafe/menu",
    menuButtonLabel: "منيو باريكو",
    socialLinks: {
      instagram: "https://instagram.com/barico",
    },
    catalog: "barico",
    theme: {
      ...DEFAULT_THEME,
      pistachio: "#B8C9A8",
      burgundy: "#2F4F41",
    },
    currency: "EGP",
    locale: "ar",
    greeting: "أهلاً في باريكو — اتفضل.",
  },
};

export const DEFAULT_PARTNER_ID = "bareeq";

export function resolvePartner() {
  const params = new URLSearchParams(window.location.search);
  const id = (params.get("partner") || params.get("cafe") || DEFAULT_PARTNER_ID).toLowerCase();
  return CAFES[id] ?? CAFES[DEFAULT_PARTNER_ID];
}

/** @param {CafeConfig} partner */
export function applyBranding(partner) {
  const root = document.documentElement;
  const t = partner.theme;
  root.style.setProperty("--cafe-beige", t.beige);
  root.style.setProperty("--cafe-pistachio", t.pistachio);
  root.style.setProperty("--cafe-burgundy", t.burgundy);
  root.style.setProperty("--cafe-burgundy-deep", t.burgundy);
  root.style.setProperty("--cafe-white", t.warmWhite);
  root.style.setProperty("--cafe-white-solid", t.warmWhite);
  root.style.setProperty("--cafe-coffee", t.coffeeBrown);
  root.style.setProperty("--accent", t.burgundy);
  root.style.setProperty("--accent-soft", `${t.burgundy}1a`);
  root.style.setProperty("--accent-forest", t.pistachio);
  root.dataset.partner = partner.id;

  document.title = `${partner.displayName} × VIBY`;

  const partnerName = document.getElementById("partnerName");
  if (partnerName) partnerName.textContent = partner.displayName;

  const splashLogo = document.getElementById("splashPartnerLogo");
  if (splashLogo) {
    if (partner.logo) {
      splashLogo.src = partner.logo;
      splashLogo.alt = partner.displayName;
      splashLogo.hidden = false;
    } else {
      splashLogo.hidden = true;
      splashLogo.removeAttribute("src");
    }
  }

  const splashWelcome = document.getElementById("splashWelcome");
  if (splashWelcome) {
    splashWelcome.textContent = `أهلاً بيك في ${partner.displayName}`;
  }

  const logo = document.getElementById("partnerLogo");
  if (logo && partner.logo) {
    logo.loading = "lazy";
    logo.decoding = "async";
    logo.src = partner.logo;
    logo.alt = `لوجو ${partner.displayName}`;
    logo.hidden = false;
  } else if (logo) {
    logo.hidden = true;
    logo.removeAttribute("src");
  }

  applyExternalMenuFab(partner);
  applySocialLinks(partner);
}

/** @param {CafeConfig} partner */
function applySocialLinks(partner) {
  const wrap = document.getElementById("socialLinks");
  if (!wrap) return;
  wrap.innerHTML = "";
  const links = partner.socialLinks ?? {};
  for (const [network, url] of Object.entries(links)) {
    if (!url) continue;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "footer__social";
    a.textContent = network;
    wrap.appendChild(a);
  }
}

/** @param {CafeConfig} partner */
export function applyExternalMenuFab(partner) {
  const link = document.getElementById("btnExternalMenu");
  if (!link) return;

  const url = partner.menuUrl?.trim();
  const label = partner.menuButtonLabel?.trim() || "المنيو";
  const labelEl = document.getElementById("btnExternalMenuLabel");
  if (labelEl) labelEl.textContent = label;

  link.setAttribute("aria-label", `${label} — ${partner.displayName}`);

  if (url) {
    link.href = url;
    link.hidden = false;
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.hidden = true;
    link.setAttribute("aria-disabled", "true");
  }
}
