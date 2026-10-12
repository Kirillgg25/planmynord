import { cityData } from "./data.js";
import { cityConfig, getPlaceCenter } from "./mapbox-config.js";
import { distributeRouteDays } from "./itinerary.js";

export function createTripPlan({
  start,
  end,
  startDate,
  endDate,
  budget,
  people,
  carRentalEnabled,
  manualStops = []
}) {
  if (!start || !end) {
    return {
      errorKey: "planner.error.places",
      error: "Velg både startsted og sluttsted."
    };
  }

  if (start === end) {
    return {
      errorKey: "planner.error.samePlace",
      error: "Startsted og sluttsted kan ikke være det samme."
    };
  }

  if (!startDate || !endDate) {
    return {
      errorKey: "planner.error.dates",
      error: "Velg både startdato og sluttdato."
    };
  }

  const numericBudget = Number(budget);

  if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
    return {
      errorKey: "planner.error.budget",
      error: "Skriv inn et gyldig budsjett."
    };
  }

  const numericPeople = Number(people);

  if (!Number.isInteger(numericPeople) || numericPeople < 1) {
    return {
      errorKey: "planner.error.people",
      error: "Velg minst 1 person."
    };
  }

  const startObj = new Date(startDate);
  const endObj = new Date(endDate);

  if (Number.isNaN(startObj.getTime()) || Number.isNaN(endObj.getTime())) {
    return {
      errorKey: "planner.error.invalidDate",
      error: "Ugyldig dato."
    };
  }

  const days = getTripDays(startObj, endObj);

  if (days < 1) {
    return {
      errorKey: "planner.error.endBeforeStart",
      error: "Sluttdato kan ikke være før startdato."
    };
  }

  // Считаем базовый финансовый сценарий поездки до построения итогового плана.
  const budgetPlan = calculateBudgetPlan(days, numericBudget, {
    people: numericPeople,
    carRentalEnabled
  });

  if (!budgetPlan.possible) {
    return {
      errorCode: "budgetTooLow",
      minimumBudget: budgetPlan.minimumTotal,
      error: "Budsjettet er for lite."
    };
  }

  const dailyBudget = Math.round(budgetPlan.total / days);
  const pinnedStops = getUniqueStops(manualStops, start, end);
  const selectedStops = getUniqueStops([
    ...pinnedStops,
    ...(pinnedStops.length ? [] : pickRelevantStops(start, end, days))
  ], start, end);
  const routeStops = pickRouteStops(start, end);
  const routeEstimate = estimateRoadTrip([start, ...selectedStops, end], days);

  return {
    start,
    end,
    startDate,
    endDate,
    days,
    budget: numericBudget,
    people: numericPeople,
    dailyBudget,
    accommodation: budgetPlan.accommodation,
    accommodationKey: budgetPlan.accommodationKey,
    food: budgetPlan.food,
    foodKey: budgetPlan.foodKey,
    selectedStops,
    manualStops: pinnedStops,
    routeStops,
    routeEstimate,

    fullBudget: {
      nights: budgetPlan.nights,
      rooms: budgetPlan.rooms,
      hotelMinNightly: budgetPlan.hotelMinNightly,
      hotelMaxNightly: budgetPlan.hotelMaxNightly,
      hotelNightly: budgetPlan.hotelNightly,
      hotelTotal: budgetPlan.hotelTotal,
      carDaily: budgetPlan.carDaily,
      carTotal: budgetPlan.carTotal,
      foodPerDay: budgetPlan.foodPerDay,
      foodTotal: budgetPlan.foodTotal,
      otherMin: budgetPlan.otherMin,
      total: budgetPlan.total
    },

    moneyLeft: budgetPlan.moneyLeft,
    enoughMoney: true,

    booking: {
      city: end,
      link: getBookingLink(end, startDate, endDate)
    }
  };
}

function estimateRoadTrip(places, days) {
  const centers = places.map((place) => getPlaceCenter(place)).filter(Boolean);
  let directKm = 0;

  for (let index = 1; index < centers.length; index += 1) {
    directKm += getDistanceKm(centers[index - 1], centers[index]);
  }

  // Norway's roads rarely follow a straight line. This is deliberately labelled
  // as an estimate until a live routing response replaces it on the map.
  const distanceKm = Math.max(1, Math.round(directKm * 1.28));
  const driveMinutes = Math.round((distanceKm / 58) * 60);
  const dailyDistances = distributeRouteDays(places[0], places.slice(1, -1), places.at(-1), days)
    .map(({ from, visits }) => {
      const points = [from, ...visits].map(getPlaceCenter);
      return points.slice(1).reduce((sum, point, index) =>
        sum + (point && points[index] ? getDistanceKm(points[index], point) * 1.28 : 0), 0);
    });
  const maxDailyMinutes = Math.ceil(Math.max(...dailyDistances) / 58 * 60);

  return {
    distanceKm,
    driveMinutes,
    maxDailyMinutes,
    warning: maxDailyMinutes > 9 * 60
  };
}

function getUniqueStops(stops, start, end) {
  const seen = new Set([start, end].filter(Boolean));

  return (Array.isArray(stops) ? stops : [])
    .filter(Boolean)
    .filter((stop) => {
      const key = String(stop).trim();
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function pickRelevantStops(start, end, days) {
  if (days <= 2) {
    return [];
  }

  const startCenter = getPlaceCenter(start);
  const endCenter = getPlaceCenter(end);
  const fallbackStops = Array.isArray(cityData[start]?.stops) ? cityData[start].stops : [];

  if (!startCenter || !endCenter) {
    return fallbackStops.slice(0, getStopLimit(days));
  }

  const directDistance = Math.max(getDistanceKm(startCenter, endCenter), 1);
  const stopLimit = getStopLimit(days);
  const allowedDeviation = getAllowedRouteDeviation(days);
  const curatedStops = new Set(fallbackStops);
  const candidates = Object.keys(cityConfig)
    .filter((place) => place !== start && place !== end)
    .map((place) => {
      const center = getPlaceCenter(place);
      const routeDistance = getDistanceKm(startCenter, center) + getDistanceKm(center, endCenter);
      const deviation = (routeDistance - directDistance) / directDistance;
      const progress = getProgressAlongRoute(startCenter, endCenter, center);
      const sideDistance = getDistanceFromRouteKm(startCenter, endCenter, center);
      const curatedBoost = curatedStops.has(place) ? -0.18 : 0;

      return {
        place,
        progress,
        deviation,
        sideDistance,
        score: deviation + sideDistance / Math.max(directDistance, 80) + curatedBoost
      };
    })
    .filter((candidate) => {
      const progressSlack = days >= 8 ? 0.25 : 0.08;
      return (
        candidate.progress >= -progressSlack &&
        candidate.progress <= 1 + progressSlack &&
        candidate.deviation <= allowedDeviation
      );
    })
    .sort((a, b) => a.score - b.score);

  const selected = [];
  const minProgressGap = stopLimit <= 2 ? 0.24 : 0.15;

  for (const candidate of candidates) {
    const tooCloseToAnotherStop = selected.some(
      (stop) => Math.abs(stop.progress - candidate.progress) < minProgressGap
    );

    if (tooCloseToAnotherStop) {
      continue;
    }

    selected.push(candidate);

    if (selected.length >= stopLimit) {
      break;
    }
  }

  return selected
    .sort((a, b) => a.progress - b.progress)
    .map((candidate) => candidate.place);
}

function pickRouteStops(start, end) {
  const startCenter = getPlaceCenter(start);
  const endCenter = getPlaceCenter(end);
  const fallbackStops = Array.isArray(cityData[start]?.stops) ? cityData[start].stops : [];

  if (!startCenter || !endCenter) {
    return fallbackStops.slice(0, 5);
  }

  const directDistance = Math.max(getDistanceKm(startCenter, endCenter), 1);
  const curatedStops = new Set(fallbackStops);
  const stopLimit = Math.min(6, Math.max(2, Math.ceil(directDistance / 160)));
  const candidates = Object.keys(cityConfig)
    .filter((place) => place !== start && place !== end)
    .map((place) => {
      const center = getPlaceCenter(place);
      const routeDistance = getDistanceKm(startCenter, center) + getDistanceKm(center, endCenter);
      const deviation = (routeDistance - directDistance) / directDistance;
      const progress = getProgressAlongRoute(startCenter, endCenter, center);
      const sideDistance = getDistanceFromRouteKm(startCenter, endCenter, center);
      const curatedBoost = curatedStops.has(place) ? -0.35 : 0;

      return {
        place,
        progress,
        deviation,
        sideDistance,
        score: deviation + sideDistance / Math.max(directDistance, 80) + curatedBoost
      };
    })
    .filter((candidate) => {
      const closeEnoughToRoute = candidate.deviation <= 0.34 || curatedStops.has(candidate.place);
      return candidate.progress >= 0.03 && candidate.progress <= 0.97 && closeEnoughToRoute;
    })
    .sort((a, b) => a.score - b.score);

  const selected = [];

  for (const candidate of candidates) {
    const tooCloseToAnotherStop = selected.some(
      (stop) => Math.abs(stop.progress - candidate.progress) < 0.08
    );

    if (tooCloseToAnotherStop) {
      continue;
    }

    selected.push(candidate);

    if (selected.length >= stopLimit) {
      break;
    }
  }

  return selected
    .sort((a, b) => a.progress - b.progress)
    .map((candidate) => candidate.place);
}

function getStopLimit(days) {
  if (days <= 2) {
    return 0;
  }

  if (days <= 4) {
    return 1;
  }

  if (days <= 6) {
    return 2;
  }

  if (days <= 9) {
    return 3;
  }

  return 4;
}

function getAllowedRouteDeviation(days) {
  if (days <= 4) {
    return 0.18;
  }

  if (days <= 6) {
    return 0.32;
  }

  if (days <= 9) {
    return 0.52;
  }

  return 0.78;
}

function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const deltaLat = toRadians(to[1] - from[1]);
  const deltaLng = toRadians(to[0] - from[0]);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getProgressAlongRoute(start, end, point) {
  const projected = projectRoutePoints(start, end, point);
  const routeLengthSquared = projected.routeX * projected.routeX + projected.routeY * projected.routeY;

  if (routeLengthSquared === 0) {
    return 0;
  }

  return (projected.pointX * projected.routeX + projected.pointY * projected.routeY) / routeLengthSquared;
}

function getDistanceFromRouteKm(start, end, point) {
  const progress = Math.max(0, Math.min(1, getProgressAlongRoute(start, end, point)));
  const projectedPoint = [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress
  ];

  return getDistanceKm(projectedPoint, point);
}

function projectRoutePoints(start, end, point) {
  const meanLat = toRadians((start[1] + end[1]) / 2);
  const lngScale = Math.cos(meanLat);

  return {
    routeX: (end[0] - start[0]) * lngScale,
    routeY: end[1] - start[1],
    pointX: (point[0] - start[0]) * lngScale,
    pointY: point[1] - start[1]
  };
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getTripDays(startObj, endObj) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffTime = endObj.getTime() - startObj.getTime();
  return Math.floor(diffTime / msPerDay) + 1;
}

function getBookingLink(city, checkin, checkout) {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}`;
}

function calculateBudgetPlan(days, budget, { people, carRentalEnabled }) {
  // Бюджет строится от количества людей: комнаты, еда и машина меняются вместе с группой.
  const nights = Math.max(days - 1, 0);
  const rooms = Math.max(Math.ceil(people / 2), 1);
  const hotelRange = getHotelRangeForPeople(people);
  const carDaily = carRentalEnabled ? getCarDailyForPeople(people) : 0;
  const storeFoodPerDay = 500 * people;
  const restaurantFoodPerDay = 1200 * people;
  const carTotal = carDaily * days;
  const otherMin = Math.max(500, 150 * people);
  const minimumFoodTotal = storeFoodPerDay * days;
  const minimumHotelTotal = hotelRange.min * nights;
  const minimumTotal = minimumFoodTotal + minimumHotelTotal + carTotal + otherMin;

  if (budget < minimumTotal) {
    return {
      possible: false,
      nights,
      rooms,
      hotelMinNightly: hotelRange.min,
      hotelMaxNightly: hotelRange.max,
      hotelNightly: hotelRange.min,
      foodPerDay: storeFoodPerDay,
      foodTotal: minimumFoodTotal,
      hotelTotal: minimumHotelTotal,
      carDaily,
      carTotal,
      otherMin,
      minimumTotal,
      accommodation: "Rimelig hotell",
      accommodationKey: "trip.accommodationAffordable",
      food: "Mat fra butikk",
      foodKey: "trip.foodStore"
    };
  }

  let foodPerDay = storeFoodPerDay;
  let food = "Mat fra butikk";
  let foodKey = "trip.foodStore";

  // Use the restaurant scenario only when it really fits the total budget.
  const restaurantCandidateTotal = restaurantFoodPerDay * days + minimumHotelTotal + carTotal + otherMin;
  if (budget >= restaurantCandidateTotal) {
    foodPerDay = restaurantFoodPerDay;
    food = "Butikk + restaurant";
    foodKey = "trip.foodRestaurant";
  }

  const foodTotal = foodPerDay * days;
  // После еды, машины и обязательных расходов смотрим,
  // какой уровень отеля пользователь ещё может себе позволить.
  const hotelBudgetLeft = budget - (foodTotal + carTotal + otherMin);
  const affordableNightly = nights ? Math.floor(hotelBudgetLeft / nights) : 0;
  const hotelNightly = nights ? clampPrice(affordableNightly, hotelRange.min, hotelRange.min, hotelRange.max) : 0;
  const hotelTotal = hotelNightly * nights;
  const total = foodTotal + hotelTotal + carTotal + otherMin;
  const moneyLeft = budget - total;

  let accommodation = "Rimelig hotell";
  let accommodationKey = "trip.accommodationAffordable";
  if (hotelNightly >= hotelRange.max * 0.8) {
    accommodation = "Komfort-hotell";
    accommodationKey = "trip.accommodationComfort";
  } else if (hotelNightly >= hotelRange.min * 1.4) {
    accommodation = "Budsjett-hotell";
    accommodationKey = "trip.accommodationBudget";
  }

  return {
    possible: true,
    nights,
    rooms,
    hotelMinNightly: hotelRange.min,
    hotelMaxNightly: hotelRange.max,
    hotelNightly,
    foodPerDay,
    foodTotal,
    hotelTotal,
    carDaily,
    carTotal,
    otherMin,
    minimumTotal,
    moneyLeft,
    total,
    accommodation,
    accommodationKey,
    food,
    foodKey
  };
}

function clampPrice(value, fallback, min, max) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(numericValue)));
}

function getHotelRangeForPeople(people) {
  if (people <= 1) {
    return { min: 400, max: 2000 };
  }

  if (people === 2) {
    return { min: 800, max: 3000 };
  }

  const rooms = Math.ceil(people / 2);
  return { min: 800 * rooms, max: 3000 * rooms };
}

function getCarDailyForPeople(people) {
  if (people <= 1) {
    return 399;
  }

  if (people === 2) {
    return 599;
  }

  return 799;
}
