import { updateAuthNav } from "./auth.js?v=reliability-1";
import { initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { getLanguage, initLanguageSelector, t } from "./i18n.js?v=reliability-1";
import { createDateRangePicker } from "./date-picker.js?v=shared-ui-3";
import { createPopupController } from "./popup-controller.js?v=shared-ui-2";
import { escapeHtml } from "./html-utils.js?v=shared-ui-2";

const form = document.getElementById("ticketSearchForm");
const summary = document.getElementById("ticketSearchSummary");
const linksContainer = document.getElementById("ticketSearchLinks");
const departInput = document.getElementById("ticketDepart");
const returnInput = document.getElementById("ticketReturn");
const tripTypeInput = document.getElementById("ticketTripType");
const fromInput = document.getElementById("ticketFrom");
const toInput = document.getElementById("ticketTo");
const airportSuggestions = document.getElementById("ticketAirportSuggestions");
const destinationTrigger = document.getElementById("ticketToTrigger");
const destinationOptions = document.getElementById("ticketDestinationOptions");
const datePickers = Array.from(document.querySelectorAll("[data-date-picker]"));
const tripTypeTrigger = document.getElementById("ticketTripTypeTrigger");
const tripTypeOptions = document.getElementById("ticketTripTypeOptions");
let datePickerController;
let destinationPopup;
let tripTypePopup;

const departureAirports = [
  { code: "WAW", city: "Warsaw", name: "Chopin", country: "Poland" },
  { code: "KRK", city: "Krakow", name: "John Paul II", country: "Poland" },
  { code: "GDN", city: "Gdansk", name: "Lech Walesa", country: "Poland" },
  { code: "BER", city: "Berlin", name: "Brandenburg", country: "Germany" },
  { code: "MUC", city: "Munich", name: "Franz Josef Strauss", country: "Germany" },
  { code: "FRA", city: "Frankfurt", name: "Main", country: "Germany" },
  { code: "CPH", city: "Copenhagen", name: "Kastrup", country: "Denmark" },
  { code: "ARN", city: "Stockholm", name: "Arlanda", country: "Sweden" },
  { code: "HEL", city: "Helsinki", name: "Vantaa", country: "Finland" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands" },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France" },
  { code: "LHR", city: "London", name: "Heathrow", country: "United Kingdom" },
  { code: "STN", city: "London", name: "Stansted", country: "United Kingdom" },
  { code: "IST", city: "Istanbul", name: "Airport", country: "Turkey" },
  { code: "RIX", city: "Riga", name: "International", country: "Latvia" },
  { code: "VNO", city: "Vilnius", name: "International", country: "Lithuania" },
  { code: "TLL", city: "Tallinn", name: "Lennart Meri", country: "Estonia" },
  { code: "PRG", city: "Prague", name: "Vaclav Havel", country: "Czechia" },
  { code: "VIE", city: "Vienna", name: "International", country: "Austria" },
  { code: "ZRH", city: "Zurich", name: "Airport", country: "Switzerland" },
  { code: "BCN", city: "Barcelona", name: "El Prat", country: "Spain" },
  { code: "MAD", city: "Madrid", name: "Barajas", country: "Spain" },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy" },
  { code: "MXP", city: "Milan", name: "Malpensa", country: "Italy" },
  { code: "KBP", city: "Kyiv", name: "Boryspil", country: "Ukraine" },
  { code: "LWO", city: "Lviv", name: "Danylo Halytskyi", country: "Ukraine" }
];

initCurrencySelector();
initLanguageSelector();
initDestinationPicker();
setDefaultDates();
initDatePickers();
initTripTypePicker();
renderTicketLinks();
updateAuthNav();

document.addEventListener("languagechange", () => {
  renderTicketLinks();
  renderAllDatePickers();
  renderTripTypeOptions();
});
form?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderTicketLinks();
});

form?.addEventListener("input", renderTicketLinks);
toInput?.addEventListener("change", renderTicketLinks);
fromInput?.addEventListener("focus", () => renderAirportSuggestions(fromInput.value));
fromInput?.addEventListener("input", () => renderAirportSuggestions(fromInput.value));
fromInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideAirportSuggestions();
    fromInput.blur();
  }
});
airportSuggestions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-airport-code]");

  if (!button || !fromInput) {
    return;
  }

  fromInput.value = button.dataset.airportCode;
  airportSuggestions.hidden = true;
  fromInput.setAttribute("aria-expanded", "false");
  renderTicketLinks();
});
destinationOptions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-destination-index]");

  if (!button || !toInput) {
    return;
  }

  toInput.selectedIndex = Number(button.dataset.destinationIndex);
  syncDestinationTrigger();
  hideDestinationOptions();
  toInput.dispatchEvent(new Event("change", { bubbles: true }));
  destinationTrigger?.focus();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".ticket-airport-field")) {
    hideAirportSuggestions();
  }
});

tripTypeInput?.addEventListener("change", () => {
  syncTripTypeTrigger();
  returnInput.disabled = tripTypeInput.value === "oneway";
  const returnTrigger = document.getElementById("ticketReturnTrigger");
  if (returnTrigger) returnTrigger.disabled = returnInput.disabled;
  if (returnInput.disabled) hideDatePickers();
  renderTicketLinks();
});

function setDefaultDates() {
  const today = new Date();
  const depart = new Date(today);
  depart.setDate(today.getDate() + 30);
  const back = new Date(depart);
  back.setDate(depart.getDate() + 7);

  if (departInput && !departInput.value) departInput.value = toDateInputValue(depart);
  if (returnInput && !returnInput.value) returnInput.value = toDateInputValue(back);
}

function renderTicketLinks() {
  const rawFrom = fromInput?.value.trim() || "";
  const toSelect = toInput;
  const to = toSelect?.value || "Oslo";
  const airport = toSelect?.selectedOptions?.[0]?.dataset.airport || "OSL";
  const toLabel = toSelect?.selectedOptions?.[0]?.textContent?.trim() || `${to} (${airport})`;
  const depart = departInput?.value || "";
  const back = tripTypeInput?.value === "oneway" ? "" : returnInput?.value || "";
  const passengers = document.getElementById("ticketPassengers")?.value || "1";
  const from = rawFrom || t("tickets.fromFallback");
  const fromAirport = normalizeAirportInput(from);
  const queryParts = [from, airport, to, "Norway", depart, back, `${passengers} passenger`].filter(Boolean);
  const query = queryParts.join(" ");

  if (!rawFrom) {
    if (summary) {
      summary.textContent = t("tickets.empty");
    }

    if (linksContainer) {
      linksContainer.innerHTML = "";
    }

    return;
  }

  if (summary) {
    summary.innerHTML = renderTicketSummary({
      from,
      fromAirport,
      toLabel,
      airport,
      depart,
      back,
      passengers
    });
  }

  const links = [
    {
      title: "Google Flights",
      text: t("tickets.googleText"),
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`flights from ${query}`)}`
    },
    {
      title: "Kiwi",
      text: t("tickets.kiwiText"),
      url: `https://www.kiwi.com/en/search/results/${encodeURIComponent(fromAirport)}/${airport}/${depart || "anytime"}${back ? `/${back}` : ""}`
    },
    {
      title: "Skyscanner",
      text: t("tickets.skyscannerText"),
      url: `https://www.skyscanner.net/transport/flights/${encodeURIComponent(fromAirport.toLowerCase())}/${airport.toLowerCase()}/${compactDate(depart) || "anytime"}/${compactDate(back) || ""}`
    }
  ];

  if (linksContainer) {
    linksContainer.innerHTML = `
      <div class="ticket-output-card">
        <span>${t("tickets.outputKicker")}</span>
        <strong>${escapeHtml(fromAirport)} → ${escapeHtml(airport)}</strong>
        <p>${t("tickets.outputText")}</p>
      </div>
      ${links.map((link) => `
        <a class="ticket-provider-card" href="${link.url}" target="_blank" rel="noopener noreferrer">
          <span>${link.title}</span>
          <strong>${t("tickets.openProvider")}</strong>
          <p>${link.text}</p>
        </a>
      `).join("")}
    `;
  }
}

function renderTicketSummary({ from, fromAirport, toLabel, airport, depart, back, passengers }) {
  const details = [
    { label: t("tickets.fromShort"), value: `${from} (${fromAirport})` },
    { label: t("tickets.toShort"), value: toLabel },
    { label: t("tickets.departShort"), value: formatDateLabel(depart) },
    { label: t("tickets.returnShort"), value: back ? formatDateLabel(back) : t("tickets.noReturn") },
    { label: t("tickets.passengersShort"), value: passengers }
  ];

  return `
    <div class="ticket-summary-route">
      <div>
        <span>${escapeHtml(fromAirport)}</span>
        <small>${escapeHtml(from)}</small>
      </div>
      <strong>→</strong>
      <div>
        <span>${escapeHtml(airport)}</span>
        <small>${escapeHtml(toLabel)}</small>
      </div>
    </div>
    <div class="ticket-summary-details">
      ${details.map((item) => `
        <span><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.value)}</span>
      `).join("")}
    </div>
  `;
}

function renderAirportSuggestions(query = "") {
  if (!airportSuggestions || !fromInput) {
    return;
  }

  const normalizedQuery = normalizeAirportSearch(query);
  const matches = departureAirports
    .filter((airport) => {
      const haystack = normalizeAirportSearch(`${airport.code} ${airport.city} ${airport.name} ${airport.country}`);
      return !normalizedQuery || haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      const aStarts = normalizeAirportSearch(`${a.code} ${a.city}`).startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = normalizeAirportSearch(`${b.code} ${b.city}`).startsWith(normalizedQuery) ? 0 : 1;
      return aStarts - bStarts || a.city.localeCompare(b.city);
    })
    .slice(0, 8);

  if (!matches.length) {
    airportSuggestions.hidden = true;
    airportSuggestions.innerHTML = "";
    fromInput.setAttribute("aria-expanded", "false");
    return;
  }

  airportSuggestions.innerHTML = matches.map((airport) => `
    <button type="button" class="ticket-airport-option" data-airport-code="${airport.code}" role="option">
      <strong>${airport.code}</strong>
      <span>${airport.city} ${airport.name}</span>
      <small>${airport.country}</small>
    </button>
  `).join("");
  airportSuggestions.hidden = false;
  fromInput.setAttribute("aria-expanded", "true");
}

function initDestinationPicker() {
  if (!toInput || !destinationOptions || !destinationTrigger) {
    return;
  }

  destinationOptions.innerHTML = Array.from(toInput.options).map((option, index) => {
    const code = option.dataset.airport || "";
    const name = option.textContent.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const parts = name.split(" ");
    const city = parts.shift() || name;
    const airportName = parts.join(" ") || "Norway";

    return `
      <button type="button" class="ticket-airport-option ticket-destination-option" data-destination-index="${index}" role="option" aria-selected="${option.selected}">
        <strong>${escapeHtml(code)}</strong>
        <span>${escapeHtml(city)}</span>
        <small>${escapeHtml(airportName)}</small>
      </button>
    `;
  }).join("");

  destinationPopup = createPopupController({
    root: destinationTrigger.closest(".ticket-destination-field"),
    trigger: destinationTrigger,
    popup: destinationOptions,
    onOpen: () => {
      hideAirportSuggestions();
      hideDatePickers();
      hideTripTypeOptions();
    }
  });
  syncDestinationTrigger();
}

function hideDestinationOptions() {
  destinationPopup?.close();
}

function syncDestinationTrigger() {
  const option = toInput?.selectedOptions?.[0];

  if (!option || !destinationTrigger) {
    return;
  }

  const code = option.dataset.airport || "";
  const name = option.textContent.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const label = destinationTrigger.querySelector("span");
  const codeLabel = destinationTrigger.querySelector("strong");

  if (label) label.textContent = name;
  if (codeLabel) codeLabel.textContent = code;
  destinationOptions?.querySelectorAll("[data-destination-index]").forEach((button) => {
    button.setAttribute("aria-selected", String(Number(button.dataset.destinationIndex) === toInput.selectedIndex));
  });
}

function initTripTypePicker() {
  if (!tripTypeInput || !tripTypeTrigger || !tripTypeOptions) {
    return;
  }

  renderTripTypeOptions();

  tripTypePopup = createPopupController({
    root: tripTypeTrigger.closest(".ticket-trip-type-field"),
    trigger: tripTypeTrigger,
    popup: tripTypeOptions,
    onOpen: () => {
      hideAirportSuggestions();
      hideDestinationOptions();
      hideDatePickers();
    }
  });

  tripTypeOptions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trip-type]");

    if (!button) {
      return;
    }

    tripTypeInput.value = button.dataset.tripType;
    tripTypeInput.dispatchEvent(new Event("change", { bubbles: true }));
    hideTripTypeOptions();
    tripTypeTrigger.focus();
  });

  syncTripTypeTrigger();
}

function renderTripTypeOptions() {
  if (!tripTypeInput || !tripTypeOptions) {
    return;
  }

  tripTypeOptions.innerHTML = Array.from(tripTypeInput.options).map((option) => {
    const icon = option.value === "round" ? "↔" : "→";
    return `
      <button type="button" class="ticket-trip-type-option" data-trip-type="${option.value}" role="option" aria-selected="${option.selected}">
        <strong aria-hidden="true">${icon}</strong>
        <span>${escapeHtml(option.textContent.trim())}</span>
      </button>
    `;
  }).join("");

  syncTripTypeTrigger();
}

function syncTripTypeTrigger() {
  const option = tripTypeInput?.selectedOptions?.[0];

  if (!option || !tripTypeTrigger) {
    return;
  }

  const icon = tripTypeTrigger.querySelector("strong");
  const label = tripTypeTrigger.querySelector("span");
  if (icon) icon.textContent = option.value === "round" ? "↔" : "→";
  if (label) label.textContent = option.textContent.trim();

  tripTypeOptions?.querySelectorAll("[data-trip-type]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.tripType === option.value));
  });
}

function hideTripTypeOptions() {
  tripTypePopup?.close();
}

function initDatePickers() {
  const fields = datePickers.map((field) => {
    const key = field.dataset.datePicker;
    return {
      key,
      field,
      input: key === "depart" ? departInput : returnInput,
      trigger: field.querySelector(".ticket-date-trigger"),
      calendar: field.querySelector(".ticket-calendar")
    };
  });

  datePickerController = createDateRangePicker({
    fields,
    startKey: "depart",
    endKey: "return",
    endOffsetDays: 7,
    getLanguage,
    beforeOpen: () => {
      hideAirportSuggestions();
      hideDestinationOptions();
      hideTripTypeOptions();
    },
    onChange: renderTicketLinks
  });
}

function renderAllDatePickers() {
  datePickerController?.sync();
}

function hideDatePickers() {
  datePickerController?.close();
}

function hideAirportSuggestions() {
  if (airportSuggestions) {
    airportSuggestions.hidden = true;
  }
  fromInput?.setAttribute("aria-expanded", "false");
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function compactDate(value) {
  return value ? value.replaceAll("-", "").slice(2) : "";
}

function normalizeAirportInput(value) {
  const trimmed = String(value || "").trim();
  const iataMatch = trimmed.match(/\b[A-Za-z]{3}\b/);
  return iataMatch ? iataMatch[0].toUpperCase() : trimmed;
}

function normalizeAirportSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateLabel(value) {
  if (!value) return t("tickets.anyDate");
  return value.split("-").reverse().join(".");
}

