import { getLanguage, t } from "./i18n.js?v=reliability-1";
import { escapeHtml } from "./html-utils.js?v=shared-ui-2";

const STORAGE_KEY = "tripplannerSupportHistory";
const MAX_HISTORY = 8;

let root;
let messages;
let form;
let input;
let toggleButton;
let history = loadHistory();

function initSupportChat() {
  if (document.getElementById("aiSupportRoot")) {
    return;
  }

  root = document.createElement("div");
  root.id = "aiSupportRoot";
  root.className = "ai-support";
  root.innerHTML = `
    <button type="button" class="ai-support-toggle" aria-expanded="false" aria-controls="aiSupportPanel">
      <span>${t("support.toggle")}</span>
    </button>
    <section id="aiSupportPanel" class="ai-support-panel" aria-label="${t("support.title")}" hidden>
      <div class="ai-support-header">
        <div>
          <p>${t("support.kicker")}</p>
          <h2>${t("support.title")}</h2>
        </div>
        <button type="button" class="ai-support-close" aria-label="${t("support.close")}">×</button>
      </div>
      <div class="ai-support-messages" aria-live="polite"></div>
      <div class="ai-support-suggestions">
        <button type="button" data-support-suggestion="google">${t("support.suggestionGoogle")}</button>
        <button type="button" data-support-suggestion="route">${t("support.suggestionRoute")}</button>
        <button type="button" data-support-suggestion="traffic">${t("support.suggestionTraffic")}</button>
        <button type="button" data-support-suggestion="tickets">${t("support.suggestionTickets")}</button>
      </div>
      <form class="ai-support-form">
        <input type="text" autocomplete="off" maxlength="700" placeholder="${t("support.placeholder")}" />
        <button type="submit">${t("support.send")}</button>
      </form>
    </section>
  `;

  document.body.appendChild(root);
  messages = root.querySelector(".ai-support-messages");
  form = root.querySelector(".ai-support-form");
  input = root.querySelector(".ai-support-form input");
  toggleButton = root.querySelector(".ai-support-toggle");
  const compactScreen = window.matchMedia("(max-width: 760px)");
  const placeToggle = () => {
    const header = document.querySelector(".topbar");
    if (compactScreen.matches && header && document.body.dataset.titleKey !== "home.title") {
      header.appendChild(toggleButton);
    } else if (document.querySelector("#plannerApp .sidebar-header")) {
      document.querySelector("#plannerApp .sidebar-header").appendChild(toggleButton);
    } else {
      root.prepend(toggleButton);
    }
  };
  placeToggle();
  compactScreen.addEventListener("change", placeToggle);

  toggleButton.addEventListener("click", togglePanel);
  root.querySelector(".ai-support-close").addEventListener("click", closePanel);
  form.addEventListener("submit", handleSubmit);
  root.querySelector(".ai-support-suggestions").addEventListener("click", handleSuggestion);
  document.addEventListener("languagechange", rerenderSupportChat);
  document.addEventListener("click", handleLogoutClick);
  window.addEventListener("tripplanner:logout", resetSupportChat);

  renderMessages();
  initHomeSupportPosition();
}

function initHomeSupportPosition() {
  if (document.body?.dataset.titleKey !== "home.title") return;

  const updateVisibility = () => {
    root.classList.toggle("is-home-visible", window.scrollY > 120);
  };

  updateVisibility();
  window.addEventListener("scroll", updateVisibility, { passive: true });
}

function togglePanel() {
  const panel = root.querySelector(".ai-support-panel");
  const isOpening = panel.hidden;
  panel.hidden = !isOpening;
  toggleButton.setAttribute("aria-expanded", String(isOpening));

  if (isOpening && !history.length) {
    addMessage("assistant", t("support.welcome"));
  }

  if (isOpening) {
    input.focus();
  }
}

function closePanel() {
  root.querySelector(".ai-support-panel").hidden = true;
  toggleButton.setAttribute("aria-expanded", "false");
}

async function handleSubmit(event) {
  event.preventDefault();
  const message = input.value.trim();

  if (!message) {
    return;
  }

  input.value = "";
  addMessage("user", message);
  const loadingId = addMessage("assistant", t("support.thinking"), true);

  try {
    const response = await fetch("/api/support/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        language: getLanguage(),
        history: history.slice(-6)
      })
    });
    const data = await response.json().catch(() => ({}));

    replaceMessage(loadingId, response.ok ? data.reply || createOfflineReply(message) : createOfflineReply(message));
  } catch {
    replaceMessage(loadingId, createOfflineReply(message));
  }
}

function createOfflineReply(message) {
  const normalized = message.toLowerCase();
  const language = getLanguage();

  if (language === "ru") {
    if (normalized.includes("google") || normalized.includes("гугл")) {
      return "Если Google-вход не работает, проверь Redirect URI в Google Cloud и домен сайта. Для planmynord.com нужен redirect: https://planmynord.com/auth/google/callback";
    }

    if (normalized.includes("вход") || normalized.includes("аккаунт") || normalized.includes("регистра")) {
      return "Для обычного входа используй почту и пароль. Если вход не проходит, проверь пароль, потом попробуй создать новый аккаунт или войти через Google.";
    }

    if (normalized.includes("маршрут") || normalized.includes("route")) {
      return "Создай маршрут, потом можно добавить город через кнопку + или выбрать магазин и нажать «Добавить в маршрут».";
    }

    if (normalized.includes("билет") || normalized.includes("аэропорт") || normalized.includes("flight") || normalized.includes("ticket")) {
      return "Открой «Билеты», введи город или IATA-код вылета из любой страны, например WAW, BER или IST, выбери аэропорт в Норвегии с кодом OSL, BGO, TRD и нажми «Подготовить поиск».";
    }

    if (normalized.includes("светоф") || normalized.includes("traffic")) {
      return "Светофоры загружаются с сервера по текущему маршруту. Если их нет, значит сервер или внешний источник временно не ответил.";
    }

    return "Базовая помощь: маршрут создаётся в «Планировать», билеты ищутся в «Билеты» по городу или IATA-коду аэропорта, а остановки добавляются через кнопку +.";
  }

  if (language === "en") {
    if (normalized.includes("google")) {
      return "For Google login, check the authorized redirect URI. For planmynord.com it should be https://planmynord.com/auth/google/callback";
    }

    if (normalized.includes("login") || normalized.includes("account")) {
      return "Use email/password login first. If Google login fails, check the Google Cloud redirect URI and app publishing status.";
    }

    if (normalized.includes("flight") || normalized.includes("ticket") || normalized.includes("airport")) {
      return "Open Flights, enter a departure city or IATA airport code from any country, for example WAW, BER or IST, choose a Norwegian airport such as OSL, BGO or TRD, then prepare the search.";
    }

    return "Basic help: create a route in Plan yourself, search flights in Flights by city or IATA airport code, and add extra stops with +.";
  }

  if (normalized.includes("fly") || normalized.includes("billett") || normalized.includes("airport") || normalized.includes("lufthavn")) {
    return "Åpne Flybilletter, skriv avreiseby eller IATA-kode fra et annet land, for eksempel WAW, BER eller IST, velg norsk flyplass som OSL, BGO eller TRD, og lag søket.";
  }

  return "Grunnleggende hjelp: lag en rute i Planlegg selv, søk flybilletter etter by eller IATA-kode, og legg til ekstra stopp med +.";
}

function handleSuggestion(event) {
  const button = event.target.closest("[data-support-suggestion]");

  if (!button) {
    return;
  }

  input.value = t(`support.question.${button.dataset.supportSuggestion}`);
  form.requestSubmit();
}

function addMessage(role, content, temporary = false) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    temporary
  };
  history.push(item);
  trimHistory();
  saveHistory();
  renderMessages();
  return item.id;
}

function replaceMessage(id, content) {
  history = history.map((item) => item.id === id ? { ...item, content, temporary: false } : item);
  trimHistory();
  saveHistory();
  renderMessages();
}

function renderMessages() {
  if (!messages) {
    return;
  }

  messages.innerHTML = history.length
    ? history.map((item) => `
        <div class="ai-support-message ${item.role} ${item.temporary ? "temporary" : ""}">
          ${escapeHtml(normalizeMessageText(item.content))}
        </div>
      `).join("")
    : `<div class="ai-support-message assistant">${escapeHtml(normalizeMessageText(t("support.welcome")))}</div>`;
  messages.scrollTop = messages.scrollHeight;
}

function rerenderSupportChat() {
  if (!root) {
    return;
  }

  root.querySelector(".ai-support-panel").setAttribute("aria-label", t("support.title"));
  root.querySelector(".ai-support-header p").textContent = t("support.kicker");
  root.querySelector(".ai-support-header h2").textContent = t("support.title");
  root.querySelector(".ai-support-close").setAttribute("aria-label", t("support.close"));
  toggleButton.querySelector("span").textContent = t("support.toggle");
  root.querySelector('[data-support-suggestion="google"]').textContent = t("support.suggestionGoogle");
  root.querySelector('[data-support-suggestion="route"]').textContent = t("support.suggestionRoute");
  root.querySelector('[data-support-suggestion="traffic"]').textContent = t("support.suggestionTraffic");
  root.querySelector('[data-support-suggestion="tickets"]').textContent = t("support.suggestionTickets");
  input.placeholder = t("support.placeholder");
  form.querySelector("button").textContent = t("support.send");
}

function resetSupportChat() {
  history = [];
  localStorage.removeItem(STORAGE_KEY);
  closePanel();
  renderMessages();
}

function handleLogoutClick(event) {
  if (event.target.closest("#logoutBtn")) {
    resetSupportChat();
  }
}

function trimHistory() {
  history = history.slice(-MAX_HISTORY).filter((item) => !item.temporary || item.content);
}

function loadHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.filter((item) => !item.temporary)));
}

function normalizeMessageText(value) {
  return String(value || "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

initSupportChat();


