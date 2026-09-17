import { getPublicRoutes, getRouteRatings, rateRoute, saveTrip, updateAuthNav } from "./auth.js?v=reliability-1";
import { formatBudgetText, initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { getLanguage, initLanguageSelector, t } from "./i18n.js?v=reliability-1";
import { routeToPlannerDraft, storePlannerDraft } from "./planner-transfer.js";
import { extraReadyRoutes } from "./ready-routes-data.js";
import { enhanceSelectMenu } from "./select-menu.js?v=route-filter-menu-1";

const readyRoutes = [
  {
    title: "Oslo → Bergen",
    days: 5,
    budget: "12000-18000 NOK",
    stops: ["Drammen", "Geilo", "Voss"],
    info: {
      no: "Klassisk fjellrute med stopp jevnt fordelt mellom Oslo og Bergen.",
      en: "Classic mountain route with stops evenly spread between Oslo and Bergen.",
      ru: "Классический горный маршрут с равномерными остановками между Осло и Бергеном."
    },
    plannerData: {
      start: "Oslo",
      end: "Bergen",
      budget: 15000
    }
  },
  {
    title: "Oslo → Bergen",
    days: 10,
    budget: "22000-32000 NOK",
    stops: ["Drammen", "Notodden", "Geilo", "Voss"],
    info: {
      no: "Lengre variant med mer tid til fjell, daler og små avstikkere.",
      en: "Longer version with more time for mountains, valleys and small detours.",
      ru: "Более длинный вариант: горы, долины и небольшие отклонения от пути."
    },
    plannerData: {
      start: "Oslo",
      end: "Bergen",
      budget: 26000
    }
  },
  {
    title: "Fredrikstad → Bergen",
    days: 7,
    budget: "17000-26000 NOK",
    stops: ["Tønsberg", "Notodden", "Odda"],
    info: {
      no: "Starter i Østfold, følger sør- og innlandsveier, og går videre mot vestlandsnatur.",
      en: "Starts in Østfold, follows southern and inland roads, then moves toward western nature.",
      ru: "Старт из Østfold, южные и внутренние дороги, затем западная природа."
    },
    plannerData: {
      start: "Fredrikstad",
      end: "Bergen",
      budget: 21000
    }
  },
  {
    title: "Oslo → Trondheim",
    days: 5,
    budget: "12000-19000 NOK",
    stops: ["Hamar", "Lillehammer", "Oppdal"],
    info: {
      no: "Rolig innlandsrute med bystopp, dalfører og fjell før Trondheim.",
      en: "Calm inland route with city stops, valleys and mountains before Trondheim.",
      ru: "Спокойный внутренний маршрут: города, долины и горы перед Trondheim."
    },
    plannerData: {
      start: "Oslo",
      end: "Trondheim",
      budget: 15000
    }
  },
  {
    title: "Kristiansand → Stavanger",
    days: 4,
    budget: "10000-16000 NOK",
    stops: ["Flekkefjord", "Egersund"],
    info: {
      no: "Kort sørvest-rute med kystbyer og passe avstand mellom stoppene.",
      en: "Short southwest route with coastal towns and comfortable spacing.",
      ru: "Короткий маршрут на юго-запад с прибрежными городами и удобными расстояниями."
    },
    plannerData: {
      start: "Kristiansand",
      end: "Stavanger",
      budget: 13000
    }
  },
  {
    title: "Bergen → Trondheim",
    days: 6,
    budget: "16000-24000 NOK",
    stops: ["Førde", "Ålesund", "Molde"],
    info: {
      no: "Vestlandsrute med fjordfølelse, kystbyer og rolige etapper.",
      en: "Western Norway route with fjord feeling, coastal towns and relaxed stages.",
      ru: "Маршрут по западной Норвегии: фьорды, прибрежные города и спокойные этапы."
    },
    plannerData: {
      start: "Bergen",
      end: "Trondheim",
      budget: 19000
    }
  },
  {
    title: "Bodø → Tromsø",
    days: 6,
    budget: "16000-25000 NOK",
    stops: ["Svolvær", "Narvik", "Harstad"],
    info: {
      no: "Nordnorsk rute med Lofoten-stemning, fjell og byer fordelt gjennom turen.",
      en: "Northern route with Lofoten mood, mountains and cities spread through the trip.",
      ru: "Северный маршрут: настроение Lofoten, горы и города по всей поездке."
    },
    plannerData: {
      start: "Bodo",
      end: "Tromso",
      budget: 20000
    }
  },
  {
    title: "Oslo → Tromsø",
    days: 10,
    budget: "28000-42000 NOK",
    stops: ["Lillehammer", "Trondheim", "Mosjøen", "Narvik"],
    info: {
      no: "Lang roadtrip gjennom store deler av Norge, med stopp fordelt gjennom hele reisen.",
      en: "Long road trip through much of Norway, with stops spread across the whole journey.",
      ru: "Большой roadtrip через значительную часть Норвегии с остановками по всей дороге."
    },
    plannerData: {
      start: "Oslo",
      end: "Tromso",
      budget: 34000
    }
  }
];

const container = document.getElementById("readyRoutes");
const filtersContainer = document.getElementById("routeFilters");
let publicRoutes = [];
let routeRatings = {};
let filters = {
  query: "",
  days: "all",
  source: "all",
  sort: "recommended"
};
let routeFilterMenus = [];

function showSaveMessage(message, type = "success") {
  let status = document.getElementById("routeStatus");

  if (!status) {
    status = document.createElement("p");
    status.id = "routeStatus";
    status.className = "auth-message";
    container.parentElement.insertBefore(status, container);
  }

  status.textContent = message;
  status.className = `auth-message ${type}`;
}

function getReadyRouteId(route, index) {
  return `ready-${index}-${route.days}`;
}

function getRenderableRoutes() {
  return [
    ...readyRoutes.concat(extraReadyRoutes).map((route, index) => ({
      ...route,
      id: route.id || getReadyRouteId(route, index),
      routeCode: `READY-${String(index + 1).padStart(3, "0")}`,
      source: "ready"
    })),
    ...publicRoutes.map((route) => ({
      ...route,
      routeCode: `PUB-${route.id}`,
      source: "published"
    }))
  ];
}

function getRouteRating(route) {
  return routeRatings[route.id] || route.rating || { average: 0, count: 0, myRating: 0 };
}

function getRouteBudgetValue(route) {
  const budget = route.plannerData?.budget || route.budget || "";

  if (typeof budget === "number") {
    return budget;
  }

  const values = String(budget).match(/\d+/g);

  if (!values?.length) {
    return 0;
  }

  const numbers = values.map((value) => Number(value));
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function getRouteSearchText(route) {
  return [
    route.id,
    route.routeCode,
    route.title,
    route.ownerName,
    route.days,
    route.source,
    route.stops?.join(" "),
    getRouteInfo(route),
    route.info?.no,
    route.info?.en,
    route.info?.ru
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesDays(route) {
  if (filters.days === "all") {
    return true;
  }

  const days = Number(route.days) || 0;

  if (filters.days === "short") {
    return days <= 5;
  }

  if (filters.days === "medium") {
    return days >= 6 && days <= 8;
  }

  return days >= 9;
}

function getFilteredRoutes() {
  const query = filters.query.trim().toLowerCase();

  return getRenderableRoutes()
    .filter((route) => {
      const sourceMatches = filters.source === "all" || route.source === filters.source;
      const queryMatches = !query || getRouteSearchText(route).includes(query);
      return sourceMatches && queryMatches && matchesDays(route);
    })
    .sort((first, second) => {
      if (filters.sort === "rating") {
        return (Number(getRouteRating(second).average) || 0) - (Number(getRouteRating(first).average) || 0);
      }

      if (filters.sort === "daysAsc") {
        return (Number(first.days) || 0) - (Number(second.days) || 0);
      }

      if (filters.sort === "daysDesc") {
        return (Number(second.days) || 0) - (Number(first.days) || 0);
      }

      if (filters.sort === "budgetAsc") {
        return getRouteBudgetValue(first) - getRouteBudgetValue(second);
      }

      return 0;
    });
}

function getRouteById(routeId) {
  return getRenderableRoutes().find((route) => String(route.id) === String(routeId));
}

function renderFilters() {
  routeFilterMenus.forEach((menu) => menu?.destroy());
  routeFilterMenus = [];

  filtersContainer.innerHTML = `
    <div class="route-filters" aria-label="${t("routes.filters")}">
      <label class="route-filter-search">
        <span>${t("routes.search")}</span>
        <input id="routeSearch" type="search" value="${filters.query}" placeholder="${t("routes.searchPlaceholder")}" autocomplete="off" />
      </label>
      <div class="route-filter-field">
        <span id="routeDaysFilterLabel">${t("routes.filterDays")}</span>
        <select id="routeDaysFilter" data-select-label="routeDaysFilterLabel">
          <option value="all" ${filters.days === "all" ? "selected" : ""}>${t("routes.daysAll")}</option>
          <option value="short" ${filters.days === "short" ? "selected" : ""}>${t("routes.daysShort")}</option>
          <option value="medium" ${filters.days === "medium" ? "selected" : ""}>${t("routes.daysMedium")}</option>
          <option value="long" ${filters.days === "long" ? "selected" : ""}>${t("routes.daysLong")}</option>
        </select>
      </div>
      <div class="route-filter-field">
        <span id="routeSourceFilterLabel">${t("routes.filterSource")}</span>
        <select id="routeSourceFilter" data-select-label="routeSourceFilterLabel">
          <option value="all" ${filters.source === "all" ? "selected" : ""}>${t("routes.sourceAll")}</option>
          <option value="ready" ${filters.source === "ready" ? "selected" : ""}>${t("routes.sourceReady")}</option>
          <option value="published" ${filters.source === "published" ? "selected" : ""}>${t("routes.sourcePublished")}</option>
        </select>
      </div>
      <div class="route-filter-field">
        <span id="routeSortLabel">${t("routes.sort")}</span>
        <select id="routeSort" data-select-label="routeSortLabel">
          <option value="recommended" ${filters.sort === "recommended" ? "selected" : ""}>${t("routes.sortRecommended")}</option>
          <option value="rating" ${filters.sort === "rating" ? "selected" : ""}>${t("routes.sortRating")}</option>
          <option value="daysAsc" ${filters.sort === "daysAsc" ? "selected" : ""}>${t("routes.sortDaysAsc")}</option>
          <option value="daysDesc" ${filters.sort === "daysDesc" ? "selected" : ""}>${t("routes.sortDaysDesc")}</option>
          <option value="budgetAsc" ${filters.sort === "budgetAsc" ? "selected" : ""}>${t("routes.sortBudgetAsc")}</option>
        </select>
      </div>
    </div>
  `;

  routeFilterMenus = ["routeDaysFilter", "routeSourceFilter", "routeSort"]
    .map((id) => enhanceSelectMenu(document.getElementById(id)))
    .filter(Boolean);
}

function renderRating(route) {
  const rating = getRouteRating(route);
  const average = Number(rating.average) || 0;
  const myRating = Number(rating.myRating) || 0;

  return `
    <div class="route-rating">
      <div>
        <strong>${t("routes.rating")}:</strong>
        <span>${average ? average.toFixed(1) : "-"}</span>
        <small>(${Number(rating.count) || 0})</small>
      </div>
      <div class="route-stars" aria-label="${t("routes.rate")}">
        ${[1, 2, 3, 4, 5]
          .map((value) => `
            <button type="button" class="${value <= myRating ? "active" : ""}" data-rate-route="${route.id}" data-rating="${value}">
              ★
            </button>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function renderRoutes() {
  let html = "";
  const routes = getFilteredRoutes();

  routes.forEach((route) => {
    html += `
      <div class="stop-card">
        <div class="route-card-header">
          <h3>${route.title}</h3>
          ${route.source === "published" ? `<span class="route-source-pill">${t("routes.published")}</span>` : ""}
        </div>
        <p class="route-id"><strong>${t("routes.id")}:</strong> ${route.routeCode}</p>
        ${route.ownerName ? `<p class="route-owner">${t("routes.author")}: ${route.ownerName}</p>` : ""}
        <p><strong>${t("routes.days")}:</strong> ${route.days}</p>
        <p><strong>${t("routes.budget")}:</strong> ${formatBudgetText(route.budget)}</p>
        <p><strong>${t("routes.stops")}:</strong> ${route.stops.join(" → ")}</p>
        <p><strong>${t("routes.info")}:</strong> ${getRouteInfo(route)}</p>
        ${renderRating(route)}
        <div class="action-row compact-actions">
          <button type="button" class="load-route-btn" data-route-id="${route.id}">${t("routes.open")}</button>
          <button type="button" class="save-route-btn" data-route-id="${route.id}">${t("routes.save")}</button>
        </div>
      </div>
    `;
  });

  container.className = routes.length ? "routes-grid" : "";
  container.innerHTML = html || `<p class="routes-empty">${t("routes.empty")}</p>`;
}

filtersContainer.addEventListener("input", (event) => {
  if (event.target.id !== "routeSearch") {
    return;
  }

  filters.query = event.target.value;
  renderRoutes();
});

filtersContainer.addEventListener("change", (event) => {
  if (event.target.id === "routeDaysFilter") {
    filters.days = event.target.value;
  }

  if (event.target.id === "routeSourceFilter") {
    filters.source = event.target.value;
  }

  if (event.target.id === "routeSort") {
    filters.sort = event.target.value;
  }

  renderRoutes();
});

container.addEventListener("click", async (event) => {
  const loadButton = event.target.closest(".load-route-btn");
  if (loadButton) {
    const route = getRouteById(loadButton.dataset.routeId);

    if (!route) {
      return;
    }

    storePlannerDraft(routeToPlannerDraft(route));
    window.location.href = "planner.html";
    return;
  }

  const ratingButton = event.target.closest("[data-rate-route]");
  if (ratingButton) {
    const result = await rateRoute(ratingButton.dataset.rateRoute, Number(ratingButton.dataset.rating));

    if (result.error) {
      showSaveMessage(result.error, "error");
      return;
    }

    routeRatings[ratingButton.dataset.rateRoute] = result.rating;
    renderRoutes();
    showSaveMessage(t("routes.ratingSaved"), "success");
    return;
  }

  const saveButton = event.target.closest(".save-route-btn");
  if (!saveButton) {
    return;
  }

  const selectedRoute = getRouteById(saveButton.dataset.routeId);

  if (!selectedRoute) {
    return;
  }

  const route = { ...selectedRoute, info: getRouteInfo(selectedRoute), kind: selectedRoute.source };
  const originalText = saveButton.textContent;

  saveButton.disabled = true;
  saveButton.textContent = t("status.saving");

  const result = await saveTrip(route);

  if (result.error) {
    showSaveMessage(result.error, "error");
    saveButton.disabled = false;
    saveButton.textContent = originalText;
    return;
  }

  showSaveMessage(t("routes.savedMessage"), "success");
  saveButton.textContent = t("routes.saved");
});

document.addEventListener("currencychange", renderRoutes);
document.addEventListener("languagechange", () => {
  renderFilters();
  renderRoutes();
});

initCurrencySelector();
initLanguageSelector();
renderFilters();
loadRoutes();
updateAuthNav();

function getRouteInfo(route) {
  return route.info?.[getLanguage()] || route.info?.en || route.info || "";
}

async function loadRoutes() {
  const publicResult = await getPublicRoutes();
  publicRoutes = Array.isArray(publicResult.routes) ? publicResult.routes : [];

  const routeIds = getRenderableRoutes().map((route) => route.id);
  const ratingResult = await getRouteRatings(routeIds);
  routeRatings = ratingResult.ratings || {};

  publicRoutes.forEach((route) => {
    if (route.rating && !routeRatings[route.id]) {
      routeRatings[route.id] = route.rating;
    }
  });

  renderRoutes();
}


