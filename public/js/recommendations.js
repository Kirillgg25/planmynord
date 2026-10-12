import { routeRecommendations } from "./routes.js?v=recommend-i18n-1";

function diffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getRouteRecommendations(start, end, startDate, endDate) {
  const key = `${start}-${end}`;
  const reverseKey = `${end}-${start}`;
  const routes = routeRecommendations[key] || routeRecommendations[reverseKey] || [];

  if (!startDate || !endDate) {
    return {
      errorKey: "noDates"
    };
  }

  const days = diffDays(startDate, endDate);
  const seasonAdvice = getSeasonAdvice(startDate, endDate);

  if (!routes.length) {
    return {
      days,
      seasonAdvice,
      routes: [],
      messageKey: "noRoutes"
    };
  }

  const evaluatedRoutes = routes.map(route => {
    let status = "good";

    if (days < route.minDays) {
      status = "tooShort";
    } else if (days < route.idealDays) {
      status = "tight";
    }

    return {
      ...route,
      status
    };
  });

  return {
    days,
    seasonAdvice,
    routes: evaluatedRoutes
  };
}

function getSeasonAdvice(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const middle = new Date((start.getTime() + end.getTime()) / 2);
  const month = middle.getMonth() + 1;

  if (month === 12 || month <= 2) {
    return { season: "winter" };
  }

  if (month >= 3 && month <= 5) {
    return { season: "spring" };
  }

  if (month >= 6 && month <= 8) {
    return { season: "summer" };
  }

  return { season: "autumn" };
}
