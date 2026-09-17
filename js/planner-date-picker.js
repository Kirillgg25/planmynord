import { createDateRangePicker } from "./date-picker.js?v=shared-ui-3";
import { getLanguage } from "./i18n.js?v=reliability-1";

let pickerController;

export function initPlannerDatePickers() {
  if (pickerController) {
    syncPlannerDatePickers();
    return;
  }

  const fields = getFields().map((field) => {
    const key = field.dataset.plannerDate;
    return {
      key,
      field,
      input: getInput(key),
      trigger: field.querySelector(".planner-date-trigger"),
      calendar: field.querySelector(".planner-calendar"),
      layerRoot: field.closest(".panel")
    };
  });

  pickerController = createDateRangePicker({
    fields,
    startKey: "start",
    endKey: "end",
    endOffsetDays: 1,
    getLanguage,
    onChange: ({ changedInputs }) => changedInputs.forEach(notifyChange)
  });
}

export function syncPlannerDatePickers() {
  pickerController?.sync();
}

function getFields() {
  return Array.from(document.querySelectorAll("[data-planner-date]"));
}

function getInput(type) {
  return document.getElementById(type === "start" ? "startDate" : "endDate");
}

function notifyChange(input) {
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
