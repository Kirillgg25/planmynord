import { initCurrencySelector } from "./currency.js?v=js-recovery-1";
import { initLanguageSelector } from "./i18n.js?v=perf-1";

const legacyCleanRoute = {
  "/planner": "/planner.html",
  "/routes": "/routes.html",
  "/things": "/things.html",
  "/tickets": "/tickets.html",
  "/account": "/account.html",
  "/profile": "/profile.html",
  "/terms": "/terms.html",
  "/privacy": "/privacy.html",
  "/cookies": "/cookies.html",
  "/refund": "/refund.html"
}[window.location.pathname.replace(/\/$/, "")];

if (legacyCleanRoute) {
  window.location.replace(`${legacyCleanRoute}${window.location.search}${window.location.hash}`);
}

initCurrencySelector();
initLanguageSelector();
initHomeHeader();

const scheduleWhenIdle = (callback) => {
  if ("requestIdleCallback" in window) window.requestIdleCallback(callback, { timeout: 1800 });
  else window.setTimeout(callback, 900);
};

// Authentication status is useful in the header, but it is not needed to paint the page.
window.addEventListener("load", () => scheduleWhenIdle(async () => {
  const { updateAuthNav } = await import("./auth.js?v=js-recovery-1");
  await updateAuthNav();
}), { once: true });

// The help widget is secondary UI; load it after the initial page resources settle.
window.addEventListener("load", () => scheduleWhenIdle(() => import("./support-chat.js?v=js-recovery-1")), { once: true });

function initHomeHeader() {
  const header = document.querySelector(".topbar");
  const nav = document.getElementById("homeNavigation");
  const toggle = document.getElementById("homeNavToggle");
  const language = nav?.querySelector(".language-switcher");

  if (!header || !nav || !toggle) return;
  if (language) header.insertBefore(language, toggle);

  const closeMenu = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Åpne meny");
  };

  toggle.addEventListener("click", () => {
    const willOpen = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
    toggle.setAttribute("aria-label", willOpen ? "Lukk meny" : "Åpne meny");
  });

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu();
  });
}

