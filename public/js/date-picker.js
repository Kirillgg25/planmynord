import { escapeHtml } from "./html-utils.js?v=shared-ui-2";

export function createDateRangePicker({
  fields,
  startKey,
  endKey,
  endOffsetDays = 1,
  getLanguage = () => document.documentElement.lang || "no",
  beforeOpen = () => {},
  onChange = () => {}
}) {
  const validFields = fields.filter(({ field, input, trigger, calendar }) => field && input && trigger && calendar);
  const fieldByKey = new Map(validFields.map((item) => [item.key, item]));
  const views = new Map();

  validFields.forEach((item) => {
    item.trigger.addEventListener("click", () => {
      if (!item.calendar.hidden) {
        close();
        return;
      }

      beforeOpen(item.key);
      close();
      views.set(item.key, parseDate(item.input.value) || new Date());
      render(item);
      item.calendar.hidden = false;
      item.field.classList.add("is-open");
      item.layerRoot?.classList.add("has-open-date-picker");
      item.trigger.setAttribute("aria-expanded", "true");
    });

    item.calendar.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-calendar-move]");
      const day = event.target.closest("[data-calendar-date]");
      const action = event.target.closest("[data-calendar-action]");

      if (nav) {
        const current = views.get(item.key) || new Date();
        views.set(item.key, new Date(current.getFullYear(), current.getMonth() + Number(nav.dataset.calendarMove), 1));
        render(item);
        return;
      }

      if (day && !day.disabled) {
        select(item, day.dataset.calendarDate);
        close();
        item.trigger.focus();
        return;
      }

      if (action?.dataset.calendarAction === "today" && !action.disabled) {
        select(item, toDateValue(new Date()));
        close();
        item.trigger.focus();
      } else if (action?.dataset.calendarAction === "clear") {
        item.input.value = "";
        sync();
        close();
        onChange({ key: item.key, input: item.input, changedInputs: [item.input] });
        item.trigger.focus();
      }
    });

    item.calendar.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        item.trigger.focus();
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!validFields.some(({ field }) => field.contains(event.target))) close();
  });
  document.addEventListener("languagechange", sync);

  function select(item, value) {
    const startItem = fieldByKey.get(startKey);
    const endItem = fieldByKey.get(endKey);
    const changedInputs = [item.input];
    item.input.value = value;

    if (item.key === startKey && endItem?.input.value && endItem.input.value < value) {
      const nextEnd = parseDate(value);
      nextEnd.setDate(nextEnd.getDate() + endOffsetDays);
      endItem.input.value = toDateValue(nextEnd);
      changedInputs.push(endItem.input);
    }

    if (startItem?.input.value && endItem?.input) endItem.input.min = startItem.input.value;
    sync();
    onChange({ key: item.key, input: item.input, changedInputs });
  }

  function render(item) {
    const language = getLanguage();
    const locale = getLocale(language);
    const labels = getLabels(language);
    const view = views.get(item.key) || parseDate(item.input.value) || new Date();
    const monthStart = new Date(view.getFullYear(), view.getMonth(), 1);
    const gridStart = new Date(view.getFullYear(), view.getMonth(), 1 - ((monthStart.getDay() + 6) % 7));
    const today = toDateValue(new Date());
    const startValue = fieldByKey.get(startKey)?.input.value || "";
    const endValue = fieldByKey.get(endKey)?.input.value || "";
    const selectedValue = item.input.value || "";
    const minimumValue = item.key === endKey && startValue > today ? startValue : today;
    const weekdays = Array.from({ length: 7 }, (_, index) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + index)).replace(".", "")
    );
    const leadingDays = (monthStart.getDay() + 6) % 7;
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const visibleDayCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
    const days = Array.from({ length: visibleDayCount }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      const value = toDateValue(date);
      const classes = ["ticket-calendar-day"];
      if (date.getMonth() !== monthStart.getMonth()) classes.push("is-outside");
      if (value === today) classes.push("is-today");
      if (value === selectedValue) classes.push("is-selected");
      if (startValue && endValue && value > startValue && value < endValue) classes.push("is-in-range");
      const disabled = value < minimumValue;
      const ariaLabel = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(date);
      return `<button type="button" class="${classes.join(" ")}" data-calendar-date="${value}" aria-label="${escapeHtml(ariaLabel)}"${disabled ? " disabled" : ""}>${date.getDate()}</button>`;
    }).join("");
    const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(monthStart);

    item.calendar.innerHTML = `
      <div class="ticket-calendar-header">
        <button type="button" class="ticket-calendar-nav" data-calendar-move="-1" aria-label="${escapeHtml(labels.previous)}">‹</button>
        <strong>${escapeHtml(monthLabel)}</strong>
        <button type="button" class="ticket-calendar-nav" data-calendar-move="1" aria-label="${escapeHtml(labels.next)}">›</button>
      </div>
      <div class="ticket-calendar-weekdays">${weekdays.map((day) => `<span>${escapeHtml(day)}</span>`).join("")}</div>
      <div class="ticket-calendar-days">${days}</div>
      <div class="ticket-calendar-footer">
        <button type="button" class="ticket-calendar-action" data-calendar-action="clear">${escapeHtml(labels.clear)}</button>
        <button type="button" class="ticket-calendar-action" data-calendar-action="today"${today < minimumValue ? " disabled" : ""}>${escapeHtml(labels.today)}</button>
      </div>
    `;
  }

  function sync() {
    const today = toDateValue(new Date());
    const startValue = fieldByKey.get(startKey)?.input.value || "";
    const endInput = fieldByKey.get(endKey)?.input;
    if (endInput) endInput.min = startValue > today ? startValue : today;

    validFields.forEach((item) => {
      const label = item.trigger.querySelector("span");
      const date = parseDate(item.input.value);
      if (label) label.textContent = date ? formatDate(date, getLanguage()) : "—";
      if (!item.calendar.hidden) render(item);
    });
  }

  function close() {
    validFields.forEach((item) => {
      item.calendar.hidden = true;
      item.field.classList.remove("is-open");
      item.layerRoot?.classList.remove("has-open-date-picker");
      item.trigger.setAttribute("aria-expanded", "false");
    });
  }

  sync();
  return { sync, close };
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(date, language) {
  return new Intl.DateTimeFormat(getLocale(language), { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function getLocale(language) {
  return { no: "nb-NO", en: "en-GB", ru: "ru-RU" }[language] || "nb-NO";
}

function getLabels(language) {
  return {
    no: { previous: "Forrige måned", next: "Neste måned", clear: "Tøm", today: "I dag" },
    en: { previous: "Previous month", next: "Next month", clear: "Clear", today: "Today" },
    ru: { previous: "Предыдущий месяц", next: "Следующий месяц", clear: "Очистить", today: "Сегодня" }
  }[language] || { previous: "Forrige måned", next: "Neste måned", clear: "Tøm", today: "I dag" };
}
