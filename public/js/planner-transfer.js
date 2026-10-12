const PLANNER_DRAFT_KEY = "tripplanner_planner_draft";

export function storePlannerDraft(data) {
  sessionStorage.setItem(PLANNER_DRAFT_KEY, JSON.stringify(data));
}

export function consumePlannerDraft() {
  const raw = sessionStorage.getItem(PLANNER_DRAFT_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(PLANNER_DRAFT_KEY);

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function routeToPlannerDraft(route) {
  const [start = "Oslo", end = "Bergen"] = String(route.title || "Oslo → Bergen")
    .split("→")
    .map((part) => part.trim());

  const days = Math.max(Number(route.days) || 2, 1);
  const today = new Date();
  const defaultStartDate = formatDate(today);
  const defaultEndDate = formatDate(addDays(today, Math.max(days - 1, 0)));
  const baseDraft = {
    start,
    end,
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    budget: getBudgetNumber(route.budget)
  };

  if (!route.plannerData || typeof route.plannerData !== "object") {
    return baseDraft;
  }

  return {
    ...baseDraft,
    ...route.plannerData,
    start: route.plannerData.start || baseDraft.start,
    end: route.plannerData.end || baseDraft.end,
    startDate: route.plannerData.startDate || baseDraft.startDate,
    endDate: route.plannerData.endDate || baseDraft.endDate,
    budget: route.plannerData.budget || baseDraft.budget
  };
}

function getBudgetNumber(value) {
  const match = String(value || "5000").match(/\d+/);
  return match ? Number(match[0]) : 5000;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

