import { updateAuthNav } from "./auth.js?v=js-recovery-1";
import { initCurrencySelector } from "./currency.js?v=js-recovery-1";
import { applyTranslations, initLanguageSelector } from "./i18n.js?v=perf-1";

initCurrencySelector();
initLanguageSelector();
applyTranslations();
updateAuthNav();



