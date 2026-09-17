import { cityConfig, MAPBOX_ACCESS_TOKEN, isMapboxConfigured } from "./mapbox-config.js";
import { addManualBuildingOverrides, getBuildingExtrusionPaint } from "./building-style.js";
import { enhanceSelectMenu } from "./select-menu.js?v=site-docs-selects-1";

let map;
let popup;
let markers = [];
let currentResults = [];

function showStatus(message, type = "success") {
  const status = document.getElementById("mapboxStatus");
  status.textContent = message;
  status.className = `auth-message ${type}`;
}

function initMap() {
  if (!isMapboxConfigured()) {
    showStatus("Sett inn Mapbox public token i js/mapbox-config.js forst.", "error");
    return;
  }

  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
  map = new mapboxgl.Map({
    container: "mapboxMap",
    style: "mapbox://styles/mapbox/streets-v12",
    center: cityConfig.Oslo.center,
    zoom: 5.6,
    pitch: 58,
    bearing: -20,
    antialias: true
  });

  map.addControl(new mapboxgl.NavigationControl(), "top-right");
  popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  map.on("load", () => {
    addThreeDimensionalBuildings();
  });
}

async function searchStores() {
  const city = document.getElementById("mapboxCity").value;
  const config = cityConfig[city];

  if (!map || !config) {
    return;
  }

  showStatus("Søker med Mapbox...", "success");
  clearMarkers();
  renderResults([]);

  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", config.searchQuery);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "NO");
  url.searchParams.set("types", "poi");
  url.searchParams.set("proximity", config.center.join(","));

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Mapbox search feilet.");
    }

    const features = Array.isArray(data.features) ? data.features : [];
    const stores = features
      .filter((feature) => feature.properties?.feature_type === "poi")
      .map((feature, index) => ({
        id: feature.properties?.mapbox_id || `${city}-${index}`,
        name: feature.properties?.name || "Butikk",
        address: buildAddress(feature),
        category: feature.properties?.poi_category?.join(", ") || "",
        coordinates: feature.geometry?.coordinates || config.center
      }));

    currentResults = stores;
    renderResults(stores);
    renderMarkers(stores);

    if (stores.length) {
      map.flyTo({
        center: stores[0].coordinates,
        zoom: 13.5,
        pitch: 60,
        bearing: -18
      });
      showStatus(`Fant ${stores.length} butikker i eller nær ${city}.`, "success");
    } else {
      showStatus(`Fant ingen butikker med Mapbox for ${city}.`, "error");
    }
  } catch (error) {
    console.error(error);
    showStatus(error.message || "Mapbox search feilet.", "error");
  }
}

function addThreeDimensionalBuildings() {
  const labelLayerId = map
    .getStyle()
    .layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;

  map.addLayer(
    {
      id: "mapbox-lab-3d-buildings",
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 13,
      paint: getBuildingExtrusionPaint("streets")
    },
    labelLayerId
  );

  addManualBuildingOverrides(map, {
    sourceId: "mapbox-lab-manual-building-overrides",
    layerId: "mapbox-lab-manual-building-overrides-layer"
  });
}

function buildAddress(feature) {
  const parts = [
    feature.properties?.address,
    feature.properties?.place_formatted,
    feature.properties?.full_address
  ].filter(Boolean);

  return parts[0] || "Adresse ikke funnet";
}

function renderResults(stores) {
  const container = document.getElementById("mapboxResults");

  if (!stores.length) {
    container.innerHTML = `
      <div class="store-card">
        <p class="store-label">Resultater</p>
        <p>Velg en by og test Mapbox-søket.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stores
    .map(
      (store, index) => `
        <button type="button" class="mapbox-store-item" data-store-index="${index}">
          <div class="mapbox-store-photo">
            <span>${getInitials(store.name)}</span>
          </div>
          <div class="mapbox-store-copy">
            <strong>${store.name}</strong>
            <span>${store.address}</span>
            ${store.category ? `<small>${store.category}</small>` : ""}
          </div>
        </button>
      `
    )
    .join("");
}

function renderMarkers(stores) {
  stores.forEach((store, index) => {
    const marker = new mapboxgl.Marker({ color: "#2563eb" })
      .setLngLat(store.coordinates)
      .addTo(map);

    marker.getElement().addEventListener("click", () => {
      openStore(store, index);
    });

    markers.push(marker);
  });
}

function clearMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
}

function openStore(store, index) {
  map.flyTo({
    center: store.coordinates,
    zoom: 15.5,
    pitch: 62,
    bearing: -22
  });

  popup
    .setLngLat(store.coordinates)
    .setHTML(`
      <div class="mapbox-popup">
        <strong>${store.name}</strong>
        <div>${store.address}</div>
      </div>
    `)
    .addTo(map);

  document.querySelectorAll(".mapbox-store-item").forEach((item, itemIndex) => {
    item.classList.toggle("active", itemIndex === index);
  });
}

function getInitials(text) {
  return String(text || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  enhanceSelectMenu(document.getElementById("mapboxCity"));
  initMap();

  document.getElementById("mapboxSearchBtn").addEventListener("click", searchStores);
  document.getElementById("mapboxResults").addEventListener("click", (event) => {
    const item = event.target.closest(".mapbox-store-item");
    if (!item) {
      return;
    }

    const index = Number(item.dataset.storeIndex);
    const store = currentResults[index];
    if (!store) {
      return;
    }

    openStore(store, index);
  });
});
