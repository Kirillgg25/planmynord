import { getLanguage } from './i18n.js?v=author-1';
import { getCurrentUser } from './auth.js?v=ticket-wallet-1';

const labels = {
  ru: ['99 NOK / 30 дней', 'До 5 устройств. Разовая оплата, без автопродления.', 'Оплата пока недоступна', 'Ссылка для ручного подключения появится после настройки 3x-ui. VPN пока недоступен.'],
  en: ['99 NOK / 30 days', 'Up to 5 devices. One-time payment, no automatic renewal.', 'Payment not available yet', 'A manual connection link will appear after 3x-ui is configured. VPN is not available yet.'],
  no: ['99 NOK / 30 dager', 'Opptil 5 enheter. Engangsbetaling, ingen automatisk fornyelse.', 'Betaling er ikke tilgjengelig ennå', 'En lenke for manuell tilkobling blir tilgjengelig når 3x-ui er konfigurert. VPN er ikke tilgjengelig ennå.']
};
function render() {
  const text = labels[getLanguage()] || labels.en;
  ['vpnOfferPrice','vpnOfferNote','vpnBuy','vpnConnectionNote'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text[i];
  });
}
render();
document.addEventListener('languagechange', render);
try {
  const user = await getCurrentUser();
  const block = document.querySelector('.vpn-account-block');
  if (block) block.hidden = !user?.vpnPreview;
} catch { /* Keep the preview hidden when authorization is unavailable. */ }
