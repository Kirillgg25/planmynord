import {
  GOOGLE_MAPS_STATIC_API_KEY,
  MAPBOX_ACCESS_TOKEN,
  cityConfig,
  getCityConfig,
  getPlaceCenter,
  isMapboxConfigured
} from "./mapbox-config.js";
import {
  createInteractiveMap,
  createLngLatBounds,
  createMapMarker,
  createNavigationControl,
  createPopup,
  getMapStyleUrl,
  hasMapStyle,
  isMapRendererAvailable
} from "./map-engine.js?v=map-engine-2";
import { addManualBuildingOverrides, getBuildingExtrusionPaint } from "./building-style.js?v=flat-map-1";

const ROUTE_SOURCE_ID = "planner-route";
const ROUTE_LINE_ID = "planner-route-line";
const ROUTE_OUTLINE_ID = "planner-route-outline";
const TRAFFIC_SIGNALS_SOURCE_ID = "traffic-signals";
const TRAFFIC_SIGNALS_LAYER_ID = "traffic-signals-layer";
const TREES_SOURCE_ID = "route-trees";
const TREES_LAYER_ID = "route-trees-layer";
const TREES_STROKE_LAYER_ID = "route-trees-stroke-layer";
const BUILDINGS_LAYER_ID = "mapbox-3d-buildings";
const MANUAL_BUILDINGS_SOURCE_ID = "manual-building-overrides";
const MANUAL_BUILDINGS_LAYER_ID = "manual-building-overrides-layer";
let map;
let popup;
let routeMarkers = [];
let activeStoreMarker = null;
let userLocationMarker = null;
let initialLoadPromise = null;
let currentRouteFeature = null;
let currentMapStyle = "streets";
let currentTrafficSignals = [];
let currentRouteTrees = [];
const MAX_STORE_DISTANCE_FROM_ROUTE_METERS = 3500;
const MAX_CITY_DISTANCE_FROM_ROUTE_METERS = 6000;
const MAX_TRAFFIC_SIGNAL_DISTANCE_FROM_ROUTE_METERS = 45;
const MAX_TRAFFIC_SIGNALS = 120;
const MAX_TRAFFIC_SIGNAL_BOUNDS_AREA = 0.035;
const MAX_TRAFFIC_SIGNAL_BOUNDS_REQUESTS = 12;
const TRAFFIC_SIGNAL_REQUEST_BATCH_SIZE = 2;
const TRAFFIC_SIGNAL_REQUEST_TIMEOUT_MS = 14000;
const MAX_TREE_DISTANCE_FROM_ROUTE_METERS = 220;
const MAX_ROUTE_TREES = 360;
const MAX_TREE_BOUNDS_AREA = 0.42;
const MAX_TREE_BOUNDS_REQUESTS = 14;
const FALLBACK_ROUTE_TREES = 120;
const STORE_BRAND_PATTERN = /\b(kiwi|rema|coop|extra|spar|joker|bunnpris|meny|oda|matkroken|europris)\b/i;
const NON_STORE_PATTERN = /\b(hotel|cabin|traveller|bungalow|waterfall|medical|clinic|lege|apotek|pharmacy|restaurant|cafe|parking)\b/i;
const HOTEL_PATTERN = /\b(hotel|hostel|motel|guesthouse|gjestehus|overnatting|accommodation|lodging|resort|lodge|inn)\b/i;
const MAX_HOTEL_DISTANCE_FROM_CITY_METERS = 30000;
const SEARCH_CITY_NAMES = {
  Alesund: "Ålesund",
  Andalsnes: "Åndalsnes",
  Bodo: "Bodø",
  Dombas: "Dombås",
  Drobak: "Drøbak",
  Flam: "Flåm",
  Forde: "Førde",
  Gjovik: "Gjøvik",
  Honefoss: "Hønefoss",
  Jorpeland: "Jørpeland",
  Kragero: "Kragerø",
  Mosjoen: "Mosjøen",
  Roros: "Røros",
  Stjordal: "Stjørdal",
  Svolvaer: "Svolvær",
  Tonsberg: "Tønsberg",
  Tromso: "Tromsø",
  Vadso: "Vadsø",
  Vardo: "Vardø"
};

export function initMap() {
  if (initialLoadPromise) {
    return initialLoadPromise;
  }

  if (!isMapboxConfigured()) {
    return Promise.reject(new Error("Mapbox token mangler eller er ugyldig."));
  }

  if (!isMapRendererAvailable()) {
    return Promise.reject(new Error("Kartbiblioteket kunne ikke lastes."));
  }

  const mapElement = document.getElementById("map");
  if (!mapElement) {
    return Promise.reject(new Error("Fant ikke kartcontaineren."));
  }

  map = createInteractiveMap({
    container: mapElement,
    styleKey: currentMapStyle,
    center: cityConfig.Oslo.center,
    zoom: 5.4,
    pitch: 0,
    bearing: 0,
    antialias: true
  });

  map.addControl(createNavigationControl(), "top-right");
  popup = createPopup({ closeButton: false, closeOnClick: false, offset: 16 });

  initialLoadPromise = new Promise((resolve, reject) => {
    let lastLoadError = null;
    const loadTimeout = window.setTimeout(() => {
      reject(lastLoadError || new Error("Mapbox kunne ikke lastes."));
    }, 12000);

    map.once("load", () => {
      window.clearTimeout(loadTimeout);
      syncThreeDimensionalBuildings();
      resolve(map);
    });

    map.on("error", (event) => {
      lastLoadError = event.error || lastLoadError;
      console.warn("Map provider warning:", event.error || event);
    });
  });

  return initialLoadPromise;
}

export async function drawRoute(start, end, stops) {
  await initMap();

  // Собираем весь маршрут как цепочку точек: старт, промежуточные остановки, финиш.
  const orderedPlaces = [start, ...stops, end];
  const coordinates = await Promise.all(orderedPlaces.map((place) => getCoordinatesForPlace(place)));
  const route = await fetchDirections(coordinates);

  drawRouteGeometry(route.geometry);
  renderRouteMarkers(orderedPlaces, coordinates);
  fitMapToRoute(route.geometry.coordinates);
  loadTreesAlongCurrentRoute().catch((error) => {
    console.warn("Could not load route trees:", error);
  });

  return route;
}

export async function redrawRouteFromCurrentLocation(location, waypoints = []) {
  await initMap();
  const startCoordinates = normalizeCoordinates(location);

  if (!startCoordinates || !waypoints.length) {
    return null;
  }

  const remainingPlaces = waypoints.filter(Boolean).slice(0, 24);
  const coordinates = [
    startCoordinates,
    ...(await Promise.all(remainingPlaces.map((place) => getCoordinatesForPlace(place))))
  ];
  const route = await fetchDirections(coordinates);

  drawRouteGeometry(route.geometry);
  renderRouteMarkers(["GPS", ...remainingPlaces], coordinates);

  return route;
}

export function findCitiesAlongCurrentRoute(start, end, excludedCities = []) {
  const routeCoordinates = currentRouteFeature?.geometry?.coordinates || [];
  const excluded = new Set([start, end, ...excludedCities].filter(Boolean));

  if (!routeCoordinates.length) {
    return [];
  }

  return Object.keys(cityConfig)
    .filter((city) => !excluded.has(city))
    .map((city) => {
      const center = getPlaceCenter(city);
      return {
        city,
        distance: getDistanceToRouteMeters(center, routeCoordinates),
        progress: getProgressOnRoute(center, routeCoordinates)
      };
    })
    .filter((candidate) => (
      Number.isFinite(candidate.distance)
      && candidate.distance <= MAX_CITY_DISTANCE_FROM_ROUTE_METERS
      && candidate.progress > 0.03
      && candidate.progress < 0.97
    ))
    .sort((first, second) => first.progress - second.progress)
    .filter((candidate, index, candidates) => {
      const previous = candidates[index - 1];
      return !previous || Math.abs(candidate.progress - previous.progress) > 0.025;
    })
    .slice(0, 8)
    .map((candidate) => getSearchCityName(candidate.city));
}

export async function updateUserLocationOnMap(location, shouldCenter = true) {
  await initMap();
  const coordinates = normalizeCoordinates(location);

  if (!coordinates) {
    return;
  }

  if (!userLocationMarker) {
    const markerElement = document.createElement("div");
    markerElement.className = "user-location-marker";
    markerElement.innerHTML = "<span></span>";
    userLocationMarker = createMapMarker({ element: markerElement })
      .setLngLat(coordinates)
      .addTo(map);
  } else {
    userLocationMarker.setLngLat(coordinates);
  }

  if (shouldCenter) {
    map.easeTo({
      center: coordinates,
      zoom: Math.max(map.getZoom(), 12),
      pitch: 0,
      duration: 650
    });
  }
}

export function getRouteNavigationSnapshot(location, waypoints = []) {
  const routeCoordinates = currentRouteFeature?.geometry?.coordinates || [];
  const coordinates = normalizeCoordinates(location);

  if (!coordinates || !routeCoordinates.length) {
    return null;
  }

  const progress = getProgressOnRoute(coordinates, routeCoordinates);
  const remainingWaypoints = waypoints
    .map((waypoint) => {
      let center;
      try {
        center = normalizeWaypointCoordinates(waypoint) || getPlaceCenter(waypoint);
      } catch {
        return null;
      }

      return {
        name: getWaypointName(waypoint),
        center,
        progress: getProgressOnRoute(center, routeCoordinates),
        distance: getDistanceMeters(coordinates, center)
      };
    })
    .filter(Boolean)
    .filter((waypoint) => waypoint.progress >= progress - 0.015)
    .sort((first, second) => first.progress - second.progress);

  return {
    progress,
    distanceFromRoute: getDistanceToRouteMeters(coordinates, routeCoordinates),
    nextWaypoint: remainingWaypoints[0] || null,
    remainingWaypoints: remainingWaypoints.map((waypoint) => waypoint.name)
  };
}

export async function setMapStyle(styleKey) {
  await initMap();

  if (!hasMapStyle(styleKey) || styleKey === currentMapStyle) {
    return;
  }

  currentMapStyle = styleKey;
  map.setStyle(getMapStyleUrl(styleKey));
  map.once("style.load", () => {
    // После смены стиля нужно заново вернуть 3D-слой и линию маршрута.
    syncThreeDimensionalBuildings();
    if (currentRouteFeature) {
      drawRouteGeometry(currentRouteFeature.geometry);
    }
    renderTrafficSignals(currentTrafficSignals);
    renderRouteTrees(currentRouteTrees);
  });
}

export function resizePlannerMap() {
  if (map) {
    map.resize();
  }
}

async function loadTreesAlongCurrentRoute() {
  await initMap();
  const routeCoordinates = currentRouteFeature?.geometry?.coordinates || [];

  if (!routeCoordinates.length) {
    renderRouteTrees([]);
    return [];
  }

  const elements = [];
  const searchBounds = getRouteSearchBounds(routeCoordinates, MAX_TREE_BOUNDS_AREA, MAX_TREE_BOUNDS_REQUESTS);

  for (const bounds of searchBounds) {
    const params = new URLSearchParams({
      south: String(bounds.south),
      west: String(bounds.west),
      north: String(bounds.north),
      east: String(bounds.east)
    });
    const response = await fetch(`/api/map-trees?${params.toString()}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn("Could not load trees for route segment:", data.error || response.statusText);
      continue;
    }

    elements.push(...(Array.isArray(data.elements) ? data.elements : []));
  }

  const seen = new Set();
  const trees = elements
    .filter((element) => Number.isFinite(element.lon) && Number.isFinite(element.lat))
    .map((element) => {
      const location = [element.lon, element.lat];
      return {
        id: `tree-${element.id}`,
        location,
        distanceFromRoute: getDistanceToRouteMeters(location, routeCoordinates),
        progress: getProgressOnRoute(location, routeCoordinates)
      };
    })
    .filter((tree) => tree.distanceFromRoute <= MAX_TREE_DISTANCE_FROM_ROUTE_METERS)
    .sort((first, second) => first.progress - second.progress)
    .filter((tree) => {
      const key = tree.location.map((part) => part.toFixed(5)).join(",");
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_ROUTE_TREES);

  const visibleTrees = trees.length ? trees : createFallbackRouteTrees(routeCoordinates);
  renderRouteTrees(visibleTrees);
  return visibleTrees;
}

export async function findTrafficSignalsAlongCurrentRoute() {
  await initMap();
  const routeCoordinates = currentRouteFeature?.geometry?.coordinates || [];

  if (!routeCoordinates.length) {
    return [];
  }

  const elements = [];
  const searchBounds = getTrafficSignalSearchBounds(routeCoordinates);
  let failedRequests = 0;

  for (let index = 0; index < searchBounds.length; index += TRAFFIC_SIGNAL_REQUEST_BATCH_SIZE) {
    const batch = searchBounds.slice(index, index + TRAFFIC_SIGNAL_REQUEST_BATCH_SIZE);
    const results = await Promise.all(batch.map(fetchTrafficSignalsForBounds));

    results.forEach((result) => {
      if (!result.ok) {
        failedRequests += 1;
        console.warn("Could not load traffic signals for route segment:", result.error);
        return;
      }

      elements.push(...result.elements);
    });
  }

  if (!elements.length && failedRequests === searchBounds.length) {
    console.warn("Traffic signal lookup failed for every route segment.");
    renderTrafficSignals([]);
    throw new Error("Overpass kunne ikke hente trafikklys.");
  }

  const seen = new Set();
  const signals = elements
    .filter((element) => Number.isFinite(element.lon) && Number.isFinite(element.lat))
    .map((element) => {
      const location = [element.lon, element.lat];
      return {
        id: `signal-${element.id}`,
        name: element.tags?.name || "",
        location,
        distanceFromRoute: getDistanceToRouteMeters(location, routeCoordinates),
        progress: getProgressOnRoute(location, routeCoordinates)
      };
    })
    .filter((signal) => signal.distanceFromRoute <= MAX_TRAFFIC_SIGNAL_DISTANCE_FROM_ROUTE_METERS)
    .sort((first, second) => first.progress - second.progress)
    .filter((signal) => {
      const key = signal.location.map((part) => part.toFixed(5)).join(",");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TRAFFIC_SIGNALS);

  renderTrafficSignals(signals);
  return signals;
}

async function fetchTrafficSignalsForBounds(bounds) {
  const params = new URLSearchParams({
    south: String(bounds.south),
    west: String(bounds.west),
    north: String(bounds.north),
    east: String(bounds.east)
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TRAFFIC_SIGNAL_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/traffic-signals?${params.toString()}`, {
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { ok: false, error: data.error || response.statusText, elements: [] };
    }

    return {
      ok: true,
      elements: Array.isArray(data.elements) ? data.elements : []
    };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "Traffic signal request timed out." : error, elements: [] };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function findStoresForCity(city) {
  await initMap();

  // Ищем магазины через Mapbox рядом с центром выбранного города,
  // чтобы список был релевантен именно этому остановочному пункту.
  const citySettings = getCityConfig(city);
  const cityCenter = citySettings?.center || cityConfig.Oslo.center;
  const searchCity = getSearchCityName(city);
  const queries = [
    citySettings?.searchQuery,
    `supermarket in ${searchCity}, Norway`,
    `grocery store in ${searchCity}, Norway`,
    `KIWI ${searchCity}`,
    `REMA 1000 ${searchCity}`,
    `Coop Extra ${searchCity}`,
    `SPAR ${searchCity}`
  ].filter(Boolean);
  const seen = new Set();
  const stores = [];

  for (const query of queries) {
    const foundStores = await searchStoresNear(cityCenter, query, city, city);

    foundStores.forEach((store) => {
      const key = store.id || `${store.name}-${store.address}`;
      const distance = getDistanceMeters(store.location, cityCenter);

      if (!seen.has(key) && distance <= 12000) {
        seen.add(key);
        stores.push({ ...store, distance });
      }
    });

    if (stores.length >= 8) {
      break;
    }
  }

  if (!stores.length) {
    throw new Error(`Fant ingen butikker i ${city}.`);
  }

  const limitedStores = stores
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 8);
  focusStoreOnMap(limitedStores[0]);
  return limitedStores;
}

export async function findHotelsForCity(city) {
  await initMap();

  const citySettings = getCityConfig(city);
  const cityCenter = citySettings?.center || cityConfig.Oslo.center;
  const searchCity = getSearchCityName(city);
  const queries = [
    "hotel",
    "hostel",
    "lodging",
    `hotel in ${searchCity}, Norway`,
    `overnatting ${searchCity}`
  ];
  const seen = new Set();
  const hotels = [];
  let failedRequests = 0;

  for (const query of queries) {
    let foundHotels = [];
    try {
      foundHotels = await searchHotelsNear(cityCenter, query, city);
    } catch (error) {
      failedRequests += 1;
      console.warn(`Could not search hotels near ${city} with query "${query}".`, error);
      continue;
    }

    foundHotels.forEach((hotel) => {
      const key = hotel.id || `${hotel.name}-${hotel.address}`;
      const distance = getDistanceMeters(hotel.location, cityCenter);
      if (!seen.has(key) && distance <= MAX_HOTEL_DISTANCE_FROM_CITY_METERS) {
        seen.add(key);
        hotels.push({ ...hotel, distance });
      }
    });
    if (hotels.length >= 8) break;
  }

  if (!hotels.length) {
    if (failedRequests === queries.length) {
      throw new Error(`Hotellsøket er midlertidig utilgjengelig for ${city}.`);
    }
    throw new Error(`Fant ingen hoteller i ${city}.`);
  }

  const limitedHotels = hotels
    .sort((first, second) => first.distance - second.distance)
    .slice(0, 8);
  focusStoreOnMap(limitedHotels[0]);
  return limitedHotels;
}

async function searchHotelsNear(center, query, city) {
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", query);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "NO");
  url.searchParams.set("types", "poi");
  url.searchParams.set("proximity", center.join(","));

  const response = await fetch(url.toString());
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Mapbox hotel search failed for ${city}.`);

  return (Array.isArray(data.features) ? data.features : [])
    .filter((feature) => {
      const name = feature.properties?.name || "";
      const categories = feature.properties?.poi_category?.join(" ") || "";
      return feature.properties?.feature_type === "poi" && HOTEL_PATTERN.test(`${name} ${categories}`);
    })
    .map((feature, index) => ({
      id: feature.properties?.mapbox_id || `${city}-hotel-${index}`,
      city,
      kind: "hotel",
      name: feature.properties?.name || "Hotell",
      address: buildAddress(feature),
      photoUrl: buildGoogleStorePhotoUrl(feature.geometry?.coordinates || center),
      category: feature.properties?.poi_category?.join(", ") || "Hotel",
      location: feature.geometry?.coordinates || center
    }));
}

export async function findStoresAlongRoute(fromCity, toCity) {
  await initMap();

  const fromCenter = getPlaceCenter(fromCity);
  const toCenter = getPlaceCenter(toCity);

  if (!fromCenter || !toCenter) {
    return findStoresForCity(toCity || fromCity);
  }

  const routeSearch = await getRouteSearchData(fromCenter, toCenter);
  const routeLabel = `${fromCity} → ${toCity}`;
  const queries = ["supermarket", "grocery store", "KIWI", "REMA 1000", "Coop Extra"];
  const seen = new Set();
  const stores = [];

  for (const center of routeSearch.centers) {
    const centerStores = [];

    for (const query of queries) {
      const foundStores = await searchStoresNear(center, query, routeLabel, `${fromCity}-${toCity}`);

      foundStores.forEach((store) => {
        const key = store.id || `${store.name}-${store.address}`;
        const routeDistance = getDistanceToRouteMeters(store.location, routeSearch.routeCoordinates);
        if (!seen.has(key) && routeDistance <= MAX_STORE_DISTANCE_FROM_ROUTE_METERS) {
          seen.add(key);
          centerStores.push({ ...store, routeDistance });
        }
      });

      if (centerStores.length >= 3) {
        break;
      }
    }

    stores.push(
      ...centerStores
        .sort((first, second) => first.routeDistance - second.routeDistance)
        .slice(0, 3)
    );
  }

  if (!stores.length) {
    throw new Error(`Fant ingen butikker mellom ${fromCity} og ${toCity}.`);
  }

  const limitedStores = stores
    .sort((first, second) => first.routeDistance - second.routeDistance)
    .slice(0, 8);
  focusStoreOnMap(limitedStores[0]);
  return limitedStores;
}

async function searchStoresNear(center, query, label, idPrefix) {
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");

  url.searchParams.set("q", query);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "NO");
  url.searchParams.set("types", "poi");
  url.searchParams.set("proximity", center.join(","));

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Mapbox search feilet for ${label}.`);
  }

  return (Array.isArray(data.features) ? data.features : [])
    .filter((feature) => feature.properties?.feature_type === "poi" && isLikelyGroceryStore(feature))
    .map((feature, index) => ({
      id: feature.properties?.mapbox_id || `${idPrefix}-${query}-${index}`,
      city: label,
      name: feature.properties?.name || "Butikk",
      address: buildAddress(feature),
      photoUrl: buildGoogleStorePhotoUrl(feature.geometry?.coordinates || center),
      rating: null,
      category: feature.properties?.poi_category?.join(", ") || "",
      location: feature.geometry?.coordinates || center
    }));
}

function isLikelyGroceryStore(feature) {
  const name = feature.properties?.name || "";
  const categories = feature.properties?.poi_category?.join(" ") || "";
  const haystack = `${name} ${categories}`;

  if (NON_STORE_PATTERN.test(haystack)) {
    return false;
  }

  return STORE_BRAND_PATTERN.test(haystack)
    || /\b(grocery|supermarket|convenience|food store)\b/i.test(haystack);
}

function getSearchCityName(city) {
  return SEARCH_CITY_NAMES[city] || city;
}

async function getRouteSearchData(fromCenter, toCenter) {
  try {
    const route = await fetchDirections([fromCenter, toCenter]);
    const coordinates = route.geometry?.coordinates || [];
    const fractions = [0.12, 0.5, 0.88];
    const centers = fractions
      .map((fraction) => coordinates[Math.floor((coordinates.length - 1) * fraction)])
      .filter(Boolean);

    return {
      centers: centers.length ? centers : [getCoordinateMidpoint(fromCenter, toCenter)],
      routeCoordinates: coordinates.length ? coordinates : [fromCenter, toCenter]
    };
  } catch (error) {
    console.warn("Could not calculate route search points, using coordinate midpoint.", error);
    return {
      centers: [getCoordinateMidpoint(fromCenter, toCenter)],
      routeCoordinates: [fromCenter, toCenter]
    };
  }
}

function getDistanceToRouteMeters(point, routeCoordinates) {
  return getClosestRoutePosition(point, routeCoordinates).distance;
}

function getProgressOnRoute(point, routeCoordinates) {
  return getClosestRoutePosition(point, routeCoordinates).progress;
}

function getClosestRoutePosition(point, routeCoordinates) {
  const coordinates = normalizeCoordinates(point);

  if (!coordinates || !routeCoordinates?.length) {
    return { distance: Number.POSITIVE_INFINITY, progress: 0 };
  }

  if (routeCoordinates.length === 1) {
    return {
      distance: getDistanceMeters(coordinates, routeCoordinates[0]),
      progress: 0
    };
  }

  const segmentLengths = [];
  const cumulativeLengths = [0];
  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const length = getDistanceMeters(routeCoordinates[index], routeCoordinates[index + 1]);
    segmentLengths.push(length);
    cumulativeLengths.push(cumulativeLengths[index] + length);
  }

  const totalLength = cumulativeLengths[cumulativeLengths.length - 1] || 1;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestAlongRoute = 0;

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const projection = getPointToSegmentDistanceMeters(
      coordinates,
      routeCoordinates[index],
      routeCoordinates[index + 1]
    );

    if (projection.distance < closestDistance) {
      closestDistance = projection.distance;
      closestAlongRoute = cumulativeLengths[index] + (segmentLengths[index] * projection.fraction);
    }
  }

  return {
    distance: closestDistance,
    progress: Math.min(1, Math.max(0, closestAlongRoute / totalLength))
  };
}

function getPointToSegmentDistanceMeters(point, segmentStart, segmentEnd) {
  const originLat = point[1];
  const start = projectLngLatToLocalMeters(segmentStart, point, originLat);
  const end = projectLngLatToLocalMeters(segmentEnd, point, originLat);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const segmentLengthSquared = dx * dx + dy * dy;
  const fraction = segmentLengthSquared
    ? Math.min(1, Math.max(0, -(start.x * dx + start.y * dy) / segmentLengthSquared))
    : 0;
  const closestX = start.x + dx * fraction;
  const closestY = start.y + dy * fraction;

  return {
    distance: Math.hypot(closestX, closestY),
    fraction
  };
}

function projectLngLatToLocalMeters(coordinate, origin, originLat) {
  const earthRadiusMeters = 6371000;
  const latScale = Math.PI * earthRadiusMeters / 180;
  const lngScale = latScale * Math.cos(degreesToRadians(originLat));

  return {
    x: (coordinate[0] - origin[0]) * lngScale,
    y: (coordinate[1] - origin[1]) * latScale
  };
}

function getDistanceMeters(firstPoint, secondPoint) {
  const [firstLng, firstLat] = firstPoint;
  const [secondLng, secondLat] = secondPoint;
  const earthRadiusMeters = 6371000;
  const latDelta = degreesToRadians(secondLat - firstLat);
  const lngDelta = degreesToRadians(secondLng - firstLng);
  const firstLatRadians = degreesToRadians(firstLat);
  const secondLatRadians = degreesToRadians(secondLat);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(firstLatRadians) * Math.cos(secondLatRadians) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function getCoordinateMidpoint(fromCenter, toCenter) {
  return [
    (fromCenter[0] + toCenter[0]) / 2,
    (fromCenter[1] + toCenter[1]) / 2
  ];
}

export async function focusStoreOnMap(store) {
  await initMap();
  const coordinates = normalizeCoordinates(store?.location);

  if (!coordinates) {
    return;
  }

  if (activeStoreMarker) {
    activeStoreMarker.remove();
  }

  activeStoreMarker = createMapMarker({ color: "#dc2626" })
    .setLngLat(coordinates)
    .addTo(map);

  // Перелетаем ближе к точке и открываем pop-up, чтобы пользователь сразу понял,
  // куда именно мы его привели.
  map.flyTo({
    center: coordinates,
    zoom: 15.4,
    pitch: 0,
    bearing: 0,
    essential: true
  });

  popup
    .setLngLat(coordinates)
    .setHTML(`
      <div class="mapbox-popup">
        <strong>${store.name}</strong>
        <div>${store.address}</div>
        ${store.category ? `<small>${store.category}</small>` : ""}
      </div>
    `)
    .addTo(map);
}

export async function clearActiveMapFocus() {
  await initMap();

  if (activeStoreMarker) {
    activeStoreMarker.remove();
    activeStoreMarker = null;
  }

  if (popup) {
    popup.remove();
  }
}

export async function findPlaceInCity(city, placeName) {
  await initMap();

  // Для кнопки "Vis sted" ищем уже не магазин, а конкретное место внутри города.
  const cityCenter = getPlaceCenter(city) || cityConfig.Oslo.center;
  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", `${placeName}, ${city}, Norway`);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("country", "NO");
  url.searchParams.set("proximity", cityCenter.join(","));

  const response = await fetch(url.toString());
  const data = await response.json();
  const feature = Array.isArray(data.features) ? data.features[0] : null;

  if (!response.ok || !feature?.geometry?.coordinates) {
    throw new Error(`Fant ikke sted for ${placeName} i ${city}.`);
  }

  return {
    name: feature.properties?.name || placeName,
    address: buildAddress(feature),
    category: feature.properties?.feature_type || "",
    location: feature.geometry.coordinates,
    photoUrl: buildGoogleStorePhotoUrl(feature.geometry.coordinates)
  };
}

async function getCoordinatesForPlace(place) {
  const directCoordinates = normalizeWaypointCoordinates(place);
  if (directCoordinates) {
    return directCoordinates;
  }

  const known = getPlaceCenter(place);
  if (known) {
    return known;
  }

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", `${place}, Norway`);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString());
  const data = await response.json();
  const feature = Array.isArray(data.features) ? data.features[0] : null;

  if (!response.ok || !feature?.geometry?.coordinates) {
    throw new Error(`Fant ikke koordinater for ${place}.`);
  }

  return feature.geometry.coordinates;
}

function normalizeWaypointCoordinates(place) {
  if (Array.isArray(place)) {
    return normalizeCoordinates(place);
  }

  if (place && typeof place === "object") {
    return normalizeCoordinates(place.location || place.center || place.coordinates);
  }

  return null;
}

function getWaypointName(place) {
  if (place && typeof place === "object") {
    return place.name || place.label || place.address || "Stop";
  }

  return String(place || "");
}

async function fetchDirections(coordinates) {
  const joinedCoordinates = coordinates.map((pair) => pair.join(",")).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${joinedCoordinates}`);

  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("steps", "false");

  const response = await fetch(url.toString());
  const data = await response.json();
  const route = Array.isArray(data.routes) ? data.routes[0] : null;

  if (!response.ok || !route?.geometry?.coordinates?.length) {
    throw new Error("Mapbox Directions fant ingen rute.");
  }

  return route;
}

function drawRouteGeometry(geometry) {
  const routeFeature = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: geometry.coordinates
    }
  };
  currentRouteFeature = routeFeature;

  if (map.getSource(ROUTE_SOURCE_ID)) {
    map.getSource(ROUTE_SOURCE_ID).setData(routeFeature);
    return;
  }

  map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    data: routeFeature
  });

  map.addLayer({
    id: ROUTE_OUTLINE_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": "#0f172a",
      "line-width": 9,
      "line-opacity": 0.26
    }
  });

  map.addLayer({
    id: ROUTE_LINE_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": "#2563eb",
      "line-width": 5.5
    }
  });
}

function renderRouteMarkers(placeNames, coordinates) {
  routeMarkers.forEach((marker) => marker.remove());
  routeMarkers = [];

  placeNames.forEach((place, index) => {
    const placeName = getWaypointName(place);
    const markerElement = document.createElement("div");
    markerElement.className = "route-marker";
    markerElement.textContent = index === 0 ? "A" : index === placeNames.length - 1 ? "B" : String(index);

    const marker = createMapMarker({ element: markerElement })
      .setLngLat(coordinates[index])
      .setPopup(
        createPopup({ offset: 16 }).setHTML(
          `<div class="mapbox-popup"><strong>${placeName}</strong></div>`
        )
      )
      .addTo(map);

    routeMarkers.push(marker);
  });
}

function fitMapToRoute(routeCoordinates) {
  const bounds = createLngLatBounds();
  routeCoordinates.forEach((coordinate) => bounds.extend(coordinate));

  map.fitBounds(bounds, {
    padding: { top: 70, right: 90, bottom: 70, left: 90 },
    pitch: 0,
    bearing: 0,
    duration: 900
  });
}

function renderTrafficSignals(signals = []) {
  currentTrafficSignals = signals;

  if (!map?.isStyleLoaded()) {
    return;
  }

  const featureCollection = {
    type: "FeatureCollection",
    features: signals.map((signal) => ({
      type: "Feature",
      properties: {
        id: signal.id,
        title: signal.name || "Traffic signal"
      },
      geometry: {
        type: "Point",
        coordinates: signal.location
      }
    }))
  };

  if (map.getSource(TRAFFIC_SIGNALS_SOURCE_ID)) {
    map.getSource(TRAFFIC_SIGNALS_SOURCE_ID).setData(featureCollection);
    return;
  }

  map.addSource(TRAFFIC_SIGNALS_SOURCE_ID, {
    type: "geojson",
    data: featureCollection
  });

  map.addLayer({
    id: TRAFFIC_SIGNALS_LAYER_ID,
    type: "circle",
    source: TRAFFIC_SIGNALS_SOURCE_ID,
    paint: {
      "circle-radius": 6,
      "circle-color": "#f59e0b",
      "circle-stroke-color": "#111827",
      "circle-stroke-width": 2
    }
  });
}

function renderRouteTrees(trees = []) {
  currentRouteTrees = trees;

  if (!map?.isStyleLoaded()) {
    return;
  }

  const featureCollection = {
    type: "FeatureCollection",
    features: trees.map((tree) => ({
      type: "Feature",
      properties: {
        id: tree.id
      },
      geometry: {
        type: "Point",
        coordinates: tree.location
      }
    }))
  };

  if (map.getSource(TREES_SOURCE_ID)) {
    map.getSource(TREES_SOURCE_ID).setData(featureCollection);
    return;
  }

  map.addSource(TREES_SOURCE_ID, {
    type: "geojson",
    data: featureCollection
  });

  const beforeRouteLayer = map.getLayer(ROUTE_OUTLINE_ID) ? ROUTE_OUTLINE_ID : undefined;

  map.addLayer(
    {
      id: TREES_STROKE_LAYER_ID,
      type: "circle",
      source: TREES_SOURCE_ID,
      minzoom: 11.5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11.5, 2, 16, 7],
        "circle-color": "#166534",
        "circle-opacity": 0.16,
        "circle-blur": 0.35
      }
    },
    beforeRouteLayer
  );

  map.addLayer(
    {
      id: TREES_LAYER_ID,
      type: "circle",
      source: TREES_SOURCE_ID,
      minzoom: 11.5,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 11.5, 1.4, 16, 5],
        "circle-color": "#22c55e",
        "circle-stroke-color": "#14532d",
        "circle-stroke-width": 1,
        "circle-opacity": 0.74
      }
    },
    beforeRouteLayer
  );
}

function createFallbackRouteTrees(routeCoordinates) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 3) {
    return [];
  }

  const step = Math.max(4, Math.floor(routeCoordinates.length / FALLBACK_ROUTE_TREES));
  const trees = [];

  for (let index = step; index < routeCoordinates.length - step; index += step) {
    const point = routeCoordinates[index];
    const previousPoint = routeCoordinates[Math.max(0, index - 2)];
    const nextPoint = routeCoordinates[Math.min(routeCoordinates.length - 1, index + 2)];
    const lngDelta = nextPoint[0] - previousPoint[0];
    const latDelta = nextPoint[1] - previousPoint[1];
    const length = Math.hypot(lngDelta, latDelta) || 1;
    const side = trees.length % 2 === 0 ? 1 : -1;
    const offset = 0.00032 + (trees.length % 4) * 0.00008;

    trees.push({
      id: `fallback-tree-${index}`,
      location: [
        point[0] + side * (-latDelta / length) * offset,
        point[1] + side * (lngDelta / length) * offset
      ],
      fallback: true
    });

    if (trees.length >= FALLBACK_ROUTE_TREES) {
      break;
    }
  }

  return trees;
}

function getCoordinateBounds(coordinates) {
  const lngs = coordinates.map((coordinate) => coordinate[0]);
  const lats = coordinates.map((coordinate) => coordinate[1]);
  const padding = 0.015;

  return {
    west: Math.min(...lngs) - padding,
    south: Math.min(...lats) - padding,
    east: Math.max(...lngs) + padding,
    north: Math.max(...lats) + padding
  };
}

function getTrafficSignalSearchBounds(routeCoordinates) {
  return getRouteSearchBounds(
    routeCoordinates,
    MAX_TRAFFIC_SIGNAL_BOUNDS_AREA,
    MAX_TRAFFIC_SIGNAL_BOUNDS_REQUESTS
  );
}

function getRouteSearchBounds(routeCoordinates, maxArea, maxRequests) {
  const sampledCoordinates = routeCoordinates
    .filter((_, index) => index % Math.max(1, Math.floor(routeCoordinates.length / 140)) === 0);
  const bounds = [];
  let segment = [];

  sampledCoordinates.forEach((coordinate) => {
    const nextSegment = [...segment, coordinate];
    const nextBounds = getCoordinateBounds(nextSegment);

    if (
      segment.length >= 2 &&
      getBoundsArea(nextBounds) > maxArea
    ) {
      bounds.push(getCoordinateBounds(segment));
      segment = [segment[segment.length - 1], coordinate];
      return;
    }

    segment = nextSegment;
  });

  if (segment.length) {
    bounds.push(getCoordinateBounds(segment));
  }

  return bounds.slice(0, maxRequests);
}

function getBoundsArea(bounds) {
  return Math.max(0, bounds.north - bounds.south) * Math.max(0, bounds.east - bounds.west);
}

function syncThreeDimensionalBuildings() {
  addThreeDimensionalBuildings();
  addManualBuildingOverrides(map, {
    sourceId: MANUAL_BUILDINGS_SOURCE_ID,
    layerId: MANUAL_BUILDINGS_LAYER_ID
  });
}

function addThreeDimensionalBuildings() {
  if (map.getLayer(BUILDINGS_LAYER_ID)) {
    const paint = getBuildingExtrusionPaint(currentMapStyle);
    Object.entries(paint).forEach(([property, value]) => {
      map.setPaintProperty(BUILDINGS_LAYER_ID, property, value);
    });
    return;
  }

  const labelLayerId = map
    .getStyle()
    .layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-field"])?.id;

  map.addLayer(
    {
      id: BUILDINGS_LAYER_ID,
      source: "composite",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      type: "fill-extrusion",
      minzoom: 16.5,
      paint: getBuildingExtrusionPaint(currentMapStyle)
    },
    labelLayerId
  );
}

function buildAddress(feature) {
  const parts = [
    feature.properties?.address,
    feature.properties?.place_formatted,
    feature.properties?.full_address
  ].filter(Boolean);

  return parts[0] || "Adresse ikke funnet";
}

function normalizeCoordinates(value) {
  if (Array.isArray(value) && value.length >= 2) {
    return value;
  }

  return null;
}

function buildGoogleStorePhotoUrl(coordinates) {
  if (!GOOGLE_MAPS_STATIC_API_KEY || !Array.isArray(coordinates) || coordinates.length < 2) {
    return "";
  }

  const [lng, lat] = coordinates;
  const url = new URL("https://maps.googleapis.com/maps/api/streetview");
  url.searchParams.set("size", "640x360");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("fov", "95");
  url.searchParams.set("source", "outdoor");
  url.searchParams.set("key", GOOGLE_MAPS_STATIC_API_KEY);
  return url.toString();
}
