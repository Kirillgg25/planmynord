import { updateAuthNav } from "./auth.js?v=reliability-1";
import { initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { applyTranslations, initLanguageSelector } from "./i18n.js?v=reliability-1";

initCurrencySelector();
initLanguageSelector();
applyTranslations();
updateAuthNav();



