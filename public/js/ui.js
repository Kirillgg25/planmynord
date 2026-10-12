import {
  convertAmountFromNok,
  convertAmountToNok,
  formatCurrencyFromNok,
  getCurrencyCode
} from "./currency.js";
import { getPlaceLabel, placeGroups } from "./data.js";
import { distributeRouteDays } from "./itinerary.js";
import { getLanguage, t } from "./i18n.js?v=author-1";

let activePlaceTarget = null;
let activeFylkeId = null;
let manualRouteStops = [];
let nextManualRouteStopId = 1;

const recommendationLabels = {
  no: {
    availableDays: "Tilgjengelige dager:",
    noDates: "Velg startdato og sluttdato.",
    noFound: "Ingen anbefalinger funnet.",
    noRoutes: "Ingen anbefalinger ennå for denne ruten.",
    status: "Status:",
    minDays: "Minste anbefalte dager:",
    idealDays: "Ideelle dager:",
    distance: "Ca. lengde:",
    stops: "Stopp:",
    highlights: "Kan sees underveis:",
    statusGood: "Anbefalt",
    statusTight: "Advarsel: mulig, men ganske stramt",
    statusTooShort: "Advarsel: for få dager for denne ruten"
  },
  en: {
    availableDays: "Available days:",
    noDates: "Choose a start date and end date.",
    noFound: "No recommendations found.",
    noRoutes: "No recommendations for this route yet.",
    status: "Status:",
    minDays: "Minimum recommended days:",
    idealDays: "Ideal days:",
    distance: "Approx. distance:",
    stops: "Stops:",
    highlights: "Can be seen on the way:",
    statusGood: "Recommended",
    statusTight: "Warning: possible, but quite tight",
    statusTooShort: "Warning: too few days for this route"
  },
  ru: {
    availableDays: "Доступно дней:",
    noDates: "Выбери дату старта и дату конца.",
    noFound: "Рекомендации не найдены.",
    noRoutes: "Для этого маршрута пока нет рекомендаций.",
    status: "Статус:",
    minDays: "Минимум рекомендуемых дней:",
    idealDays: "Идеально дней:",
    distance: "Примерная длина:",
    stops: "Остановки:",
    highlights: "Что можно увидеть по пути:",
    statusGood: "Рекомендуется",
    statusTight: "Предупреждение: возможно, но довольно плотно",
    statusTooShort: "Предупреждение: слишком мало дней для этого маршрута"
  }
};

function recommendationText(key) {
  const language = getLanguage();
  return recommendationLabels[language]?.[key] || recommendationLabels.en[key] || key;
}

function localizedValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const language = getLanguage();
    return value[language] || value.en || value.no || Object.values(value)[0] || "";
  }

  return value;
}

export function getFormValues() {
  const currencyCode = getCurrencyCode();
  const rawBudget = parseInt(document.getElementById("budget").value, 10);
  const rawPeople = Number(document.getElementById("people").value);

  return {
    start: document.getElementById("start").value,
    end: document.getElementById("end").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    budget: Number.isFinite(rawBudget)
      ? Math.round(convertAmountToNok(rawBudget, currencyCode))
      : NaN,
    people: Number.isFinite(rawPeople) ? rawPeople : NaN,
    carRentalEnabled: document.getElementById("carRentalEnabled").checked,
    manualStops: manualRouteStops.map((stop) => stop.value).filter(Boolean)
  };
}

export function applyFormValues({ start, end, startDate, endDate, budget, people, carRentalEnabled, manualStops }) {
  if (start) {
    document.getElementById("start").value = start;
    updatePlaceButton("start", start);
  }

  if (end) {
    document.getElementById("end").value = end;
    updatePlaceButton("end", end);
  }

  if (startDate) {
    document.getElementById("startDate").value = startDate;
  }

  if (endDate) {
    document.getElementById("endDate").value = endDate;
  }

  if (budget) {
    document.getElementById("budget").value = Math.max(
      1,
      Math.round(convertAmountFromNok(Number(budget), getCurrencyCode()))
    );
  }

  if (people) {
    document.getElementById("people").value = Math.max(1, Number(people));
  }

  document.getElementById("carRentalEnabled").checked = Boolean(carRentalEnabled);
  if (Array.isArray(manualStops)) {
    manualRouteStops = manualStops
      .filter(Boolean)
      .map((value) => ({ id: createManualRouteStopId(), value }));
    renderManualRouteStops();
  }
  updateBudgetLabel();
}

export function initPlacePickers() {
  const overlay = document.getElementById("placePickerOverlay");
  const searchInput = document.getElementById("placeSearchInput");
  const closeButton = document.getElementById("closePlacePicker");
  const results = document.getElementById("placePickerResults");

  if (!overlay || !searchInput || !closeButton || !results) {
    return;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".place-picker-trigger");
    if (!button) {
      return;
    }

    activePlaceTarget = button.dataset.placeTarget;
    openPlacePicker();
  });

  const addRouteStopButton = document.getElementById("addRouteStopBtn");
  if (addRouteStopButton) {
    addRouteStopButton.addEventListener("click", () => {
      const stop = { id: createManualRouteStopId(), value: "" };
      manualRouteStops.push(stop);
      renderManualRouteStops();
      activePlaceTarget = stop.id;
      openPlacePicker();
    });
  }

  const routeStopList = document.getElementById("routeStopList");
  if (routeStopList) {
    routeStopList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-route-stop]");
      if (!removeButton) {
        return;
      }

      manualRouteStops = manualRouteStops.filter((stop) => stop.id !== removeButton.dataset.removeRouteStop);
      renderManualRouteStops();
    });
  }

  document.addEventListener("languagechange", () => {
    renderManualRouteStops();
  });

  closeButton.addEventListener("click", closePlacePicker);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePlacePicker();
    }
  });
  searchInput.addEventListener("input", () => renderPlacePickerResults(searchInput.value));
  results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-place-action]");
    if (!button) {
      return;
    }

    if (button.dataset.placeAction === "back") {
      activeFylkeId = null;
      renderPlacePickerResults(searchInput.value);
      return;
    }

    if (button.dataset.placeAction === "fylke") {
      activeFylkeId = button.dataset.fylkeId;
      searchInput.value = "";
      renderPlacePickerResults("");
      return;
    }

    if (button.dataset.placeAction === "city" && activePlaceTarget) {
      setPlaceTargetValue(activePlaceTarget, button.dataset.placeValue, button.dataset.placeLabel);
      closePlacePicker();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      closePlacePicker();
    }
  });

  updatePlaceButton("start", document.getElementById("start").value);
  updatePlaceButton("end", document.getElementById("end").value);
  renderManualRouteStops();
}

function openPlacePicker() {
  const overlay = document.getElementById("placePickerOverlay");
  const searchInput = document.getElementById("placeSearchInput");
  const title = document.getElementById("placePickerTitle");

  title.textContent = activePlaceTarget === "end"
    ? t("picker.end")
    : activePlaceTarget?.startsWith("route-stop-")
      ? t("picker.via")
      : t("picker.start");
  activeFylkeId = null;
  searchInput.value = "";
  renderPlacePickerResults("");
  overlay.hidden = false;
  searchInput.focus();
}

function closePlacePicker() {
  document.getElementById("placePickerOverlay").hidden = true;
  activePlaceTarget = null;
  activeFylkeId = null;
}

function renderPlacePickerResults(query) {
  const results = document.getElementById("placePickerResults");
  const normalizedQuery = normalizeSearch(query);

  if (activeFylkeId) {
    const group = placeGroups.find((item) => item.id === activeFylkeId);
    const items = (group?.items || []).filter((place) => {
      const haystack = normalizeSearch(`${place.label} ${place.value}`);
      return !normalizedQuery || haystack.includes(normalizedQuery);
    });

    results.innerHTML = `
      <button type="button" class="place-back-btn" data-place-action="back">${t("picker.back")}</button>
      <section class="place-picker-section">
        <h3>${group?.title || "Fylke"}</h3>
        <div class="place-choice-list">
          ${
            items.length
              ? items.map((place) => renderCityButton(place, group.title)).join("")
              : `<p class="place-empty">${t("picker.noPlaces")}</p>`
          }
        </div>
      </section>
    `;
    return;
  }

  const directCitySection = normalizedQuery ? renderDirectCityMatches(normalizedQuery) : "";
  const fylkeButtons = placeGroups
    .filter((group) => {
      if (!normalizedQuery) {
        return true;
      }

      const groupMatch = normalizeSearch(group.title).includes(normalizedQuery);
      const cityMatch = group.items.some((place) =>
        normalizeSearch(`${place.label} ${place.value}`).includes(normalizedQuery)
      );
      return groupMatch || cityMatch;
    })
    .map((group) => {
      const matchingCities = normalizedQuery
        ? group.items.filter((place) =>
            normalizeSearch(`${place.label} ${place.value}`).includes(normalizedQuery)
          ).length
        : group.items.length;

      return `
        <button
          type="button"
          class="place-choice-btn place-fylke-btn"
          data-place-action="fylke"
          data-fylke-id="${group.id}"
        >
          <span>${group.title}</span>
          <small>${t("picker.places", { count: matchingCities })}</small>
        </button>
      `;
    })
    .join("");

  results.innerHTML = `
    ${directCitySection}
    <section class="place-picker-section">
      <h3>${t("picker.counties")}</h3>
      <div class="place-choice-list">
        ${fylkeButtons || `<p class="place-empty">${t("picker.noCounty")}</p>`}
      </div>
    </section>
  `;
}

function renderDirectCityMatches(normalizedQuery) {
  const allCities = placeGroups.flatMap((group) =>
    group.items.map((place) => ({ ...place, fylkeTitle: group.title }))
  );
  const cityMatches = allCities
    .filter((place) => normalizeSearch(`${place.label} ${place.value}`).includes(normalizedQuery))
    .sort((a, b) => {
      const aLabel = normalizeSearch(a.label);
      const bLabel = normalizeSearch(b.label);
      const aStarts = aLabel.startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = bLabel.startsWith(normalizedQuery) ? 0 : 1;

      return aStarts - bStarts || aLabel.localeCompare(bLabel);
    })
    .slice(0, 12);

  if (!cityMatches.length) {
    return "";
  }

  return `
    <section class="place-picker-section">
      <h3>${t("picker.cityMatches")}</h3>
      <div class="place-choice-list place-city-match-list">
        ${cityMatches.map((place) => renderCityButton(place, place.fylkeTitle)).join("")}
      </div>
    </section>
  `;
}

function renderCityButton(place, fylkeTitle) {
  return `
    <button
      type="button"
      class="place-choice-btn"
      data-place-action="city"
      data-place-value="${place.value}"
      data-place-label="${place.label}"
    >
      <span>${place.label}</span>
      <small>${fylkeTitle}</small>
    </button>
  `;
}

function updatePlaceButton(targetId, value, label = getPlaceLabel(value)) {
  const button = document.querySelector(`.place-picker-trigger[data-place-target="${targetId}"]`);
  if (button) {
    button.textContent = label;
  }
}

function setPlaceTargetValue(targetId, value, label) {
  const routeStop = manualRouteStops.find((stop) => stop.id === targetId);
  if (routeStop) {
    routeStop.value = value;
    renderManualRouteStops();
    document.dispatchEvent(new CustomEvent("plannerformchange"));
    return;
  }

  const input = document.getElementById(targetId);
  if (!input) {
    return;
  }

  input.value = value;
  updatePlaceButton(targetId, value, label);
  input.dispatchEvent(new Event("change", { bubbles: true }));
  document.dispatchEvent(new CustomEvent("plannerformchange"));
}

function createManualRouteStopId() {
  const id = `route-stop-${nextManualRouteStopId}`;
  nextManualRouteStopId += 1;
  return id;
}

function renderManualRouteStops() {
  const list = document.getElementById("routeStopList");
  if (!list) {
    return;
  }

  if (!manualRouteStops.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = manualRouteStops
    .map((stop, index) => {
      const label = stop.value ? getPlaceLabel(stop.value) : t("planner.chooseViaCity");
      return `
        <div class="route-stop-item">
          <span class="route-stop-index">${index + 1}</span>
          <button
            type="button"
            class="place-picker-trigger route-stop-picker"
            data-place-target="${stop.id}"
          >
            ${label}
          </button>
          <button
            type="button"
            class="icon-remove-button"
            data-remove-route-stop="${stop.id}"
            aria-label="${t("planner.removeViaCity")}"
            title="${t("planner.removeViaCity")}"
          >
            ×
          </button>
        </div>
      `;
    })
    .join("");
}

function normalizeSearch(value) {
  const rawValue = String(value || "")
    .toLowerCase()
    .trim();
  const transliteratedValue = transliterateRussianSearch(rawValue);

  return transliteratedValue
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/æ/g, "ae");
}

function transliterateRussianSearch(value) {
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sh",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya"
  };

  return value.replace(/[а-яё]/g, (letter) => map[letter] || letter);
}

export function setDefaultDates() {
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(today);
  const tomorrowStr = formatDate(tomorrow);

  if (!startDateInput.value) {
    startDateInput.value = todayStr;
  }
  startDateInput.min = todayStr;

  if (!endDateInput.value) {
    endDateInput.value = tomorrowStr;
  }
  endDateInput.min = todayStr;

  updateBudgetLabel();
}

export function renderSummary({
  start,
  end,
  startDate,
  endDate,
  days,
  budget,
  people,
  dailyBudget,
  accommodation,
  accommodationKey,
  food,
  foodKey,
  carRentalEnabled,
  manualStops = []
}) {
  const accommodationText = accommodationKey ? t(accommodationKey) : accommodation;
  const foodText = foodKey ? t(foodKey) : food;

  document.getElementById("summary").innerHTML = `
    <strong>${t("summary.trip")}:</strong> ${start} → ${end}<br>
    ${
      Array.isArray(manualStops) && manualStops.length
        ? `<strong>${t("summary.via")}:</strong> ${manualStops.join(", ")}<br>`
        : ""
    }
    <strong>${t("summary.startDate")}:</strong> ${startDate}<br>
    <strong>${t("summary.endDate")}:</strong> ${endDate}<br>
    <strong>${t("summary.days")}:</strong> ${days}<br>
    <strong>${t("summary.people")}:</strong> ${people}<br>
    <strong>${t("summary.budget")}:</strong> ${formatCurrencyFromNok(budget)}<br>
    <strong>${t("summary.daily")}:</strong> ${formatCurrencyFromNok(dailyBudget)}<br>
    <strong>${t("summary.hotel")}:</strong> ${accommodationText}<br>
    <strong>${t("summary.food")}:</strong> ${foodText}<br>
    <strong>${t("summary.car")}:</strong> ${carRentalEnabled ? t("summary.active") : t("summary.notSelected")}
  `;
  document.getElementById("summary").className = "summary-box";
}

export function renderError(message) {
  const summary = document.getElementById("summary");
  summary.textContent = message;
  summary.className = "summary-box error";
  document.getElementById("tripPlan").innerHTML = "";
  document.getElementById("recommendations").innerHTML = "";
  const actions = document.getElementById("planActions");
  if (actions) {
    actions.hidden = true;
  }
  const rentalButton = document.getElementById("carRentalBtn");
  if (rentalButton) {
    rentalButton.hidden = true;
  }
}

export function renderTripPlan({
  start,
  stops,
  storeStops = [],
  routeStops,
  routeEstimate,
  end,
  days,
  accommodation,
  accommodationKey,
  food,
  foodKey,
  dailyBudget,
  bookingLink,
  fullBudget,
  moneyLeft,
  people,
  carRentalEnabled
}) {
  const accommodationText = accommodationKey ? t(accommodationKey) : accommodation;
  const foodText = foodKey ? t(foodKey) : food;
  const formatDuration = (minutes) => {
    const rounded = Math.ceil(minutes / 30) * 30;
    const hours = Math.floor(rounded / 60);
    const rest = rounded % 60;
    const units = { ru: ["ч", "мин"], en: ["h", "min"], no: ["t", "min"] }[getLanguage()] || ["h", "min"];
    return `≈ ${hours} ${units[0]}${rest ? ` ${rest} ${units[1]}` : ""}`;
  };
  const estimateHtml = routeEstimate
    ? `
      <div class="route-confidence-card">
        <div class="route-confidence-heading">
          <div>
            <span>${t("trip.estimateLabel")}</span>
            <h3>${t("trip.routeOverview")}</h3>
          </div>
          <span class="route-updated">${t("trip.updatedNow")}</span>
        </div>
        <div class="route-metric-grid">
          <div><strong>≈ ${Math.ceil(routeEstimate.distanceKm / 10) * 10} km</strong><span>${t("trip.estimatedDistance")}</span></div>
          <div><strong>${formatDuration(routeEstimate.driveMinutes)}</strong><span>${t("trip.drivingTime")}</span></div>
          <div><strong>${formatDuration(routeEstimate.maxDailyMinutes)}</strong><span>${t("trip.longestDay")}</span></div>
        </div>
        ${routeEstimate.warning ? `<p class="route-reality-warning">${t("trip.longDriveWarning", { hours: Math.ceil(routeEstimate.maxDailyMinutes / 60) })}</p>` : ""}
        <p class="route-methodology">${t("trip.methodText")}</p>
        <details class="route-methodology">
          <summary>${t("trip.howCalculated")}</summary>
          <p>${t("trip.methodText")}</p>
          <p><strong>${t("trip.sources")}:</strong> ${t("trip.sourceText")}</p>
        </details>
      </div>
    `
    : "";
  let planHtml = `
    ${estimateHtml}
    <div class="stop-card">
      <h3>${t("trip.budget")}</h3>
      <p><strong>${t("summary.people")}:</strong> ${people}</p>
      <p><strong>${t("trip.rooms")}:</strong> ${fullBudget.rooms}</p>
      <p><strong>${t("trip.hotelLevel")}:</strong> ${formatCurrencyFromNok(fullBudget.hotelMinNightly)} - ${formatCurrencyFromNok(fullBudget.hotelMaxNightly)}</p>
      <p><strong>${t("trip.hotelNight")}:</strong> ${formatCurrencyFromNok(fullBudget.hotelNightly)}</p>
      <p><strong>${t("trip.hotelTotal")}:</strong> ${formatCurrencyFromNok(fullBudget.hotelTotal)}</p>
      ${carRentalEnabled ? `<p><strong>${t("trip.carTotal")}:</strong> ${formatCurrencyFromNok(fullBudget.carTotal)}</p>` : ""}
      <p><strong>${t("trip.foodDay")}:</strong> ${formatCurrencyFromNok(fullBudget.foodPerDay)}</p>
      <p><strong>${t("trip.foodTotal")}:</strong> ${formatCurrencyFromNok(fullBudget.foodTotal)}</p>
      <p><strong>${t("trip.other")}:</strong> ${formatCurrencyFromNok(fullBudget.otherMin)}</p>
      <p><strong>${t("trip.total")}:</strong> ${formatCurrencyFromNok(fullBudget.total)}</p>
      <p class="budget-leftover">${t("trip.left", { amount: formatCurrencyFromNok(moneyLeft) })}</p>
    </div>
  `;

  const dayPlan = buildBalancedDayPlan(start, stops, routeStops, end, days);

  if (Array.isArray(storeStops) && storeStops.length) {
    planHtml += `
      <div class="stop-card custom-route-stops-card">
        <h3>${t("trip.addedStops")}</h3>
        <div class="custom-route-stop-list">
          ${storeStops
            .map(
              (stop) => `
                <div class="custom-route-stop-row">
                  <div>
                    <strong>${stop.name || t("trip.store")}</strong>
                    <span>${stop.address || stop.city || ""}</span>
                  </div>
                  <button
                    type="button"
                    class="icon-remove-button remove-store-stop-btn"
                    data-store-stop-id="${stop.id || `${stop.name || ""}-${stop.address || ""}`}"
                    aria-label="${t("trip.removeStop")}"
                    title="${t("trip.removeStop")}"
                  >
                    ×
                  </button>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  for (let i = 0; i < dayPlan.length; i++) {
    const { title, description, cityForStore, routeFrom, routeTo, storeMode, routeCities = [] } = dayPlan[i];
    const routeAttributes =
      storeMode === "route" && routeFrom && routeTo
        ? ` data-store-mode="route" data-route-from="${routeFrom}" data-route-to="${routeTo}"`
        : "";
    const cityActions = routeCities.length
      ? `
        <div class="route-city-list">
          <p class="route-city-label">${t("trip.stopsOnWay")}</p>
          ${routeCities
            .map(
              (city) => `
                <div class="route-city-row">
                  <button type="button" class="route-city-link mini-guide-btn" data-city="${city}">${city}</button>
                  <div class="route-city-actions">
                    <button type="button" class="mini-hotel-btn" data-city="${city}">${t("trip.hotels")}</button>
                    <button type="button" class="mini-store-btn" data-city="${city}">${t("trip.store")}</button>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      `
      : `
        <div class="day-card-actions">
          <button type="button" class="route-city-link mini-guide-btn" data-city="${cityForStore}">${cityForStore}</button>
          <button type="button" class="mini-hotel-btn" data-city="${cityForStore}">${t("trip.hotels")}</button>
          <button type="button" class="mini-store-btn" data-city="${cityForStore}"${routeAttributes}>${t("trip.store")}</button>
        </div>
      `;

    planHtml += `
      <div class="stop-card day-card">
        <div class="day-card-header">
          <h3>${t("trip.day")} ${i + 1}: ${title}</h3>
        </div>
        <div class="day-card-body">
          <p><strong>${t("trip.what")}:</strong> ${description}</p>
          ${i < fullBudget.nights ? `<p><strong>${t("trip.stay")}:</strong> ${accommodationText}</p>` : ""}
          <p><strong>${t("summary.food")}:</strong> ${foodText}</p>
          <p><strong>${t("trip.cost")}:</strong> ${formatCurrencyFromNok(fullBudget.foodPerDay + fullBudget.carDaily + (i < fullBudget.nights ? fullBudget.hotelNightly : 0) + (i === 0 ? fullBudget.otherMin : 0))}</p>
        </div>
        ${cityActions}
      </div>
    `;
  }

  planHtml += `
    <div class="stop-card vip-navigation-card">
      <div>
        <p class="vip-navigation-kicker">${t("navigation.kicker")}</p>
        <h3>${t("navigation.title")}</h3>
        <p>${t("navigation.cardDescription")}</p>
      </div>
      <button type="button" id="openNavigationWindowBtn">${t("navigation.openWindow")}</button>
      <div class="traffic-signals-panel">
        <button type="button" id="loadTrafficSignalsBtn" class="secondary-button">${t("navigation.loadSignals")}</button>
        <p id="trafficSignalsStatus" class="navigation-note">${t("navigation.trafficNote")}</p>
      </div>
    </div>

    <div class="navigation-window" id="vipNavigationWindow" hidden>
      <div class="navigation-window-panel">
        <div class="navigation-window-header">
          <div>
            <p class="vip-navigation-kicker">${t("navigation.kicker")}</p>
            <h3>${t("navigation.windowTitle")}</h3>
          </div>
          <button type="button" id="closeNavigationWindowBtn" class="navigation-close-btn" aria-label="${t("navigation.close")}">×</button>
        </div>
        <p>${t("navigation.description")}</p>
        <div class="navigation-actions">
          <button type="button" id="startNavigationBtn">${t("navigation.start")}</button>
          <button type="button" id="stopNavigationBtn" class="secondary-button" hidden>${t("navigation.stop")}</button>
        </div>
        <p id="navigationStatus" class="navigation-status info">${t("navigation.ready")}</p>
        <div id="navigationStats" class="navigation-stats" hidden>
          <div>
            <span>${t("navigation.routeDistance")}</span>
            <strong id="navigationRouteDistance">-</strong>
          </div>
          <div>
            <span>${t("navigation.nextStop")}</span>
            <strong id="navigationNextStop">-</strong>
          </div>
          <div>
            <span>${t("navigation.accuracy")}</span>
            <strong id="navigationAccuracy">-</strong>
          </div>
        </div>
        <p class="navigation-note">${t("navigation.rerouteNote")}</p>
      </div>
    </div>

    <div class="stop-card">
      <h3>${t("trip.findStay")}</h3>
      <button type="button" class="booking-link-btn" data-booking-link="${bookingLink}">${t("trip.openBooking")}</button>
    </div>
  `;

  document.getElementById("tripPlan").innerHTML = planHtml;
  const actions = document.getElementById("planActions");
  if (actions) {
    actions.hidden = false;
  }
  const rentalButton = document.getElementById("carRentalBtn");
  if (rentalButton) {
    rentalButton.hidden = !carRentalEnabled;
  }
}

function buildBalancedDayPlan(start, stops, routeStops, end, days) {
  return distributeRouteDays(start, Array.isArray(stops) ? stops : [], end, days)
    .map(({ from, to, visits }) => ({
      title: visits.length ? `${from} → ${to}` : to,
      description: visits.length ? t("trip.transport", { city: to }) : t("trip.cityPause"),
      cityForStore: to,
      routeFrom: from,
      routeTo: to,
      storeMode: visits.length ? "route" : "city",
      routeCities: visits
    }));
}

export function renderRecommendations(data) {
  const container = document.getElementById("recommendations");

  if (data.error) {
    container.innerHTML = `<p>${data.errorKey ? recommendationText(data.errorKey) : data.error}</p>`;
    return;
  }

  const seasonAdviceHtml = renderSeasonAdvice(data.seasonAdvice);

  if (!data.routes || data.routes.length === 0) {
    container.innerHTML = `
      ${seasonAdviceHtml}
      <p>${data.messageKey ? recommendationText(data.messageKey) : data.message || recommendationText("noFound")}</p>
    `;
    return;
  }

  let html = seasonAdviceHtml;
  html += `<p><strong>${recommendationText("availableDays")}</strong> ${data.days}</p>`;

  data.routes.forEach((route) => {
    let statusText = "";
    if (route.status === "tooShort") {
      statusText = recommendationText("statusTooShort");
    } else if (route.status === "tight") {
      statusText = recommendationText("statusTight");
    } else {
      statusText = recommendationText("statusGood");
    }

    html += `
      <div class="stop-card">
        <h3>${localizedValue(route.name)}</h3>
        <p><strong>${recommendationText("status")}</strong> ${statusText}</p>
        <p><strong>${recommendationText("minDays")}</strong> ${route.minDays}</p>
        <p><strong>${recommendationText("idealDays")}</strong> ${route.idealDays}</p>
        <p><strong>${recommendationText("distance")}</strong> ${route.estimatedKm} km</p>
        <p><strong>${recommendationText("stops")}</strong> ${route.stops.join(" → ")}</p>
        <p><strong>${recommendationText("highlights")}</strong> ${localizedValue(route.highlights).join(", ")}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderSeasonAdvice(seasonAdvice) {
  if (!seasonAdvice?.season) {
    return "";
  }

  return `
    <div class="season-advice-card">
      <p class="season-advice-kicker">${t("season.kicker")}</p>
      <h3>${t(`season.${seasonAdvice.season}.title`)}</h3>
      <p>${t(`season.${seasonAdvice.season}.text`)}</p>
      <ul>
        <li>${t(`season.${seasonAdvice.season}.clothes`)}</li>
        <li>${t(`season.${seasonAdvice.season}.activity`)}</li>
      </ul>
    </div>
  `;
}

export function syncBudgetInputCurrency(oldCurrency, newCurrency) {
  const input = document.getElementById("budget");
  if (!input) {
    return;
  }

  const currentValue = parseInt(input.value, 10);
  if (Number.isFinite(currentValue)) {
    const budgetInNok = convertAmountToNok(currentValue, oldCurrency);
    input.value = Math.max(1, Math.round(convertAmountFromNok(budgetInNok, newCurrency)));
  }

  updateBudgetLabel();
}

export function updateBudgetLabel() {
  const label = document.querySelector('label[for="budget"]');
  if (!label) {
    return;
  }

  label.textContent = `${t("planner.budget")} (${getCurrencyCode()})`;
}


