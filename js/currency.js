import { createPopupController } from "./popup-controller.js?v=shared-ui-2";

const STORAGE_KEY = "tripplannerCurrency";

const currencies = {
  NOK: { code: "NOK", label: "Norsk krone", rate: 1, locale: "nb-NO" },
  EUR: { code: "EUR", label: "Euro", rate: 0.086, locale: "de-DE" },
  USD: { code: "USD", label: "US Dollar", rate: 0.094, locale: "en-US" },
  GBP: { code: "GBP", label: "British Pound", rate: 0.074, locale: "en-GB" },
  UAH: { code: "UAH", label: "Ukrainian Hryvnia", rate: 3.91, locale: "uk-UA" }
};

export function getCurrentCurrency() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return currencies[stored] ? stored : "NOK";
}

export function initCurrencySelector() {
  const nav = document.querySelector(".topnav");
  if (!nav || nav.querySelector(".currency-switcher")) {
    return;
  }

  const currentCurrency = getCurrentCurrency();
  const wrapper = document.createElement("div");
  wrapper.className = "currency-switcher";
  wrapper.innerHTML = `
    <span data-i18n="nav.currency">Currency</span>
    <div class="currency-menu">
      <button id="currencySelect" type="button" class="currency-menu-button" aria-haspopup="listbox" aria-expanded="false">
        <span>${currentCurrency}</span>
        <span class="currency-menu-chevron">⌄</span>
      </button>
      <div class="currency-menu-list" role="listbox" aria-label="Velg valuta" hidden>
      ${Object.values(currencies)
        .map(
          (currency) =>
            `<button type="button" class="currency-menu-option ${currency.code === currentCurrency ? "active" : ""}" role="option" aria-selected="${currency.code === currentCurrency}" data-currency="${currency.code}">
              <span>${currency.code}</span>
              <small>${currency.label}</small>
            </button>`
        )
        .join("")}
      </div>
    </div>
  `;

  const button = wrapper.querySelector(".currency-menu-button");
  const buttonLabel = button.querySelector("span");
  const list = wrapper.querySelector(".currency-menu-list");
  const popup = createPopupController({ root: wrapper, trigger: button, popup: list, blurOnEscape: true });

  list.addEventListener("click", (event) => {
    const option = event.target.closest(".currency-menu-option");
    if (!option) {
      return;
    }

    const oldCurrency = getCurrentCurrency();
    const newCurrency = option.dataset.currency;
    if (oldCurrency === newCurrency) {
      popup.close();
      return;
    }

    localStorage.setItem(STORAGE_KEY, newCurrency);
    buttonLabel.textContent = newCurrency;
    list.querySelectorAll(".currency-menu-option").forEach((item) => {
      const isActive = item.dataset.currency === newCurrency;
      item.classList.toggle("active", isActive);
      item.setAttribute("aria-selected", String(isActive));
    });
    popup.close();

    document.dispatchEvent(
      new CustomEvent("currencychange", {
        detail: { oldCurrency, newCurrency }
      })
    );
  });

  nav.appendChild(wrapper);
}

export function convertAmountFromNok(amount, currencyCode = getCurrentCurrency()) {
  const currency = currencies[currencyCode] || currencies.NOK;
  return amount * currency.rate;
}

export function convertAmountToNok(amount, currencyCode = getCurrentCurrency()) {
  const currency = currencies[currencyCode] || currencies.NOK;
  return amount / currency.rate;
}

export function formatCurrencyFromNok(amount, options = {}) {
  const currencyCode = options.currencyCode || getCurrentCurrency();
  const currency = currencies[currencyCode] || currencies.NOK;
  const convertedAmount = convertAmountFromNok(amount, currencyCode);
  const formattedAmount = formatNumber(convertedAmount, currencyCode);
  const prefix = currencyCode === "NOK" || options.approximate === false ? "" : "~";
  return `${prefix}${formattedAmount} ${currency.code}`;
}

export function formatBudgetText(value) {
  const text = String(value || "").trim();
  const numbers = text.match(/\d+/g)?.map(Number) || [];

  if (!numbers.length) {
    return text;
  }

  if (numbers.length >= 2) {
    return formatCurrencyRangeFromNok(numbers[0], numbers[1]);
  }

  return formatCurrencyFromNok(numbers[0]);
}

export function formatCurrencyRangeFromNok(minAmount, maxAmount, currencyCode = getCurrentCurrency()) {
  const currency = currencies[currencyCode] || currencies.NOK;
  const min = formatNumber(convertAmountFromNok(minAmount, currencyCode), currencyCode);
  const max = formatNumber(convertAmountFromNok(maxAmount, currencyCode), currencyCode);
  const prefix = currencyCode === "NOK" ? "" : "~";
  return `${prefix}${min}-${max} ${currency.code}`;
}

export function getCurrencyCode() {
  return getCurrentCurrency();
}

function formatNumber(amount, currencyCode) {
  const currency = currencies[currencyCode] || currencies.NOK;
  return new Intl.NumberFormat(currency.locale, {
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}
