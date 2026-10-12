import { MAPBOX_ACCESS_TOKEN, MAP_RENDERER } from "./mapbox-config.js";

const MAPBOX_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11"
};

const MAPLIBRE_STYLES = {
  streets: "https://demotiles.maplibre.org/style.json",
  satellite: "https://demotiles.maplibre.org/style.json",
  dark: "https://demotiles.maplibre.org/style.json"
};

export function getMapRendererName() {
  if (MAP_RENDERER === "maplibre" && window.maplibregl) {
    return "maplibre";
  }

  return "mapbox";
}

export function isMapRendererAvailable() {
  return Boolean(getMapLibrary());
}

export function getMapStyleUrl(styleKey) {
  const styles = getMapRendererName() === "maplibre" ? MAPLIBRE_STYLES : MAPBOX_STYLES;
  return styles[styleKey] || styles.streets;
}

export function hasMapStyle(styleKey) {
  return Boolean(MAPBOX_STYLES[styleKey]);
}

export function createInteractiveMap(options) {
  const library = getMapLibrary();

  if (!library) {
    throw new Error("Kartbiblioteket kunne ikke lastes.");
  }

  if (getMapRendererName() === "mapbox") {
    library.accessToken = MAPBOX_ACCESS_TOKEN;
  }

  const { styleKey, ...mapOptions } = options;

  return new library.Map({
    ...mapOptions,
    style: getMapStyleUrl(styleKey)
  });
}

export function createNavigationControl(options) {
  const library = getMapLibrary();
  return new library.NavigationControl(options);
}

export function createPopup(options) {
  const library = getMapLibrary();
  return new library.Popup(options);
}

export function createMapMarker(options) {
  const library = getMapLibrary();
  return new library.Marker(options);
}

export function createLngLatBounds(...args) {
  const library = getMapLibrary();
  return new library.LngLatBounds(...args);
}

function getMapLibrary() {
  if (MAP_RENDERER === "maplibre" && window.maplibregl) {
    return window.maplibregl;
  }

  return window.mapboxgl || null;
}
