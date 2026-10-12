const BUILDING_OVERRIDES_URL = "/data/building-overrides.json";

const buildingColorExpressions = {
  dark: [
    "match",
    ["coalesce", ["get", "type"], ["get", "class"], ["get", "building"]],
    ["hotel", "commercial", "retail"],
    "#d79a2b",
    ["train_station", "transportation", "public"],
    "#f0b84a",
    ["school", "university", "college"],
    "#7aa2f7",
    ["hospital", "clinic"],
    "#ef6f6c",
    ["church", "cathedral", "museum"],
    "#c7a15a",
    ["apartments", "residential", "house", "detached"],
    "#394557",
    "#2a3442"
  ],
  light: [
    "match",
    ["coalesce", ["get", "type"], ["get", "class"], ["get", "building"]],
    ["hotel", "commercial", "retail"],
    "#d69a2d",
    ["train_station", "transportation", "public"],
    "#bf7d16",
    ["school", "university", "college"],
    "#5b7fd6",
    ["hospital", "clinic"],
    "#dc6461",
    ["church", "cathedral", "museum"],
    "#a98238",
    ["apartments", "residential", "house", "detached"],
    "#94a3b8",
    "#cbd5e1"
  ],
  satellite: [
    "match",
    ["coalesce", ["get", "type"], ["get", "class"], ["get", "building"]],
    ["hotel", "commercial", "retail"],
    "#b78942",
    ["train_station", "transportation", "public"],
    "#c7a15a",
    ["school", "university", "college"],
    "#6d7f91",
    ["hospital", "clinic"],
    "#9a6b63",
    ["church", "cathedral", "museum"],
    "#a68a52",
    ["apartments", "residential", "house", "detached"],
    "#6f776f",
    "#747b73"
  ]
};

export function getBuildingExtrusionPaint(styleKey = "streets") {
  const isDark = styleKey === "dark";
  const isSatellite = styleKey === "satellite";
  const colorExpression = isSatellite
    ? buildingColorExpressions.satellite
    : isDark
      ? buildingColorExpressions.dark
      : buildingColorExpressions.light;

  return {
    "fill-extrusion-color": colorExpression,
    "fill-extrusion-height": [
      "interpolate",
      ["linear"],
      ["zoom"],
      16.5,
      0,
      17.5,
      ["*", ["coalesce", ["get", "height"], 18], 0.35]
    ],
    "fill-extrusion-base": [
      "interpolate",
      ["linear"],
      ["zoom"],
      16.5,
      0,
      17.5,
      ["coalesce", ["get", "min_height"], 0]
    ],
    "fill-extrusion-opacity": isSatellite ? 0.28 : isDark ? 0.46 : 0.26,
    "fill-extrusion-vertical-gradient": true
  };
}

export async function addManualBuildingOverrides(map, { sourceId, layerId }) {
  if (map.getLayer(layerId) || map.getSource(sourceId)) {
    return;
  }

  const features = await loadManualBuildingFeatures();

  if (!features.length) {
    return;
  }

  map.addSource(sourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features
    }
  });

  map.addLayer({
    id: layerId,
    source: sourceId,
    type: "fill-extrusion",
    minzoom: 16.5,
    paint: {
      "fill-extrusion-color": ["coalesce", ["get", "color"], "#f59e0b"],
      "fill-extrusion-height": ["*", ["coalesce", ["get", "height"], 24], 0.35],
      "fill-extrusion-base": ["coalesce", ["get", "base"], 0],
      "fill-extrusion-opacity": 0.32,
      "fill-extrusion-vertical-gradient": true
    }
  });
}

async function loadManualBuildingFeatures() {
  try {
    const response = await fetch(BUILDING_OVERRIDES_URL, { cache: "no-store" });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const buildings = Array.isArray(data.buildings) ? data.buildings : [];

    return buildings
      .filter((building) => Array.isArray(building.coordinates))
      .map((building) => ({
        type: "Feature",
        properties: {
          id: building.id || "",
          name: building.name || "",
          type: building.type || "custom",
          color: building.color || "#f59e0b",
          height: Number(building.height) || 24,
          base: Number(building.base) || 0,
          textureHint: building.textureHint || ""
        },
        geometry: {
          type: "Polygon",
          coordinates: building.coordinates
        }
      }));
  } catch {
    return [];
  }
}

