import { initLanguageSelector, applyTranslations, getLanguage } from './i18n.js?v=author-1';
import { getCurrentUser, updateAuthNav } from './auth.js?v=ticket-wallet-1';

const copy = {
  en: {title:'Support PlanMyNord',intro:'Your support helps me develop PlanMyNord and maintain the project server. Thank you for being part of it.',amount:'Choose an amount',custom:'Your amount, NOK (10–10,000)',once:'One-time support, no automatic renewal. This is not a VPN purchase. Planning features remain available to everyone.',consent:'I accept the terms and privacy policy and understand this contribution is voluntary.',pay:'Pay by card',login:'Sign in to support the project',unavailable:'Payments are not available yet.',failed:'Could not start payment. Please try again.',busy:'Opening secure checkout…'},
  no: {title:'Støtt PlanMyNord',intro:'Din støtte hjelper meg å videreutvikle PlanMyNord og holde prosjektets server i drift. Takk for at du bidrar.',amount:'Velg beløp',custom:'Eget beløp, NOK (10–10 000)',once:'Engangsstøtte, ingen automatisk fornyelse. Dette er ikke et VPN-kjøp. Planleggingsfunksjonene er tilgjengelige for alle.',consent:'Jeg godtar vilkårene og personvernerklæringen og forstår at støtten er frivillig.',pay:'Betal med kort',login:'Logg inn for å støtte prosjektet',unavailable:'Betaling er ikke tilgjengelig ennå.',failed:'Kunne ikke starte betalingen. Prøv igjen.',busy:'Åpner sikker betaling…'},
  ru: {title:'Поддержать PlanMyNord',intro:'Твоя поддержка помогает мне развивать PlanMyNord и содержать сервер проекта. Спасибо за участие.',amount:'Выбери сумму',custom:'Своя сумма, NOK (10–10 000)',once:'Разовая поддержка без автопродления. Это не покупка VPN. Планирование поездок остаётся доступным всем.',consent:'Я принимаю условия и политику конфиденциальности и понимаю, что поддержка добровольная.',pay:'Оплатить картой',login:'Войти, чтобы поддержать проект',unavailable:'Приём платежей пока недоступен.',failed:'Не удалось начать оплату. Попробуй ещё раз.',busy:'Открываем безопасную оплату…'}
};
const form = document.getElementById('supportForm');
const amount = document.getElementById('supportAmount');
const pay = document.getElementById('supportPay');
const status = document.getElementById('supportStatus');
let ready = false;
let busy = false;
let statusKey = '';
function render() {
  const strings = copy[getLanguage()] || copy.en;
  document.querySelectorAll('[data-copy]').forEach(el => { el.textContent = strings[el.dataset.copy]; });
  document.title = strings.title;
  status.textContent = strings[statusKey] || '';
  pay.disabled = !ready || busy;
}
form.querySelectorAll('[name=preset]').forEach(input => input.addEventListener('change', () => { amount.value = input.value; }));
amount.addEventListener('input', () => form.querySelectorAll('[name=preset]').forEach(input => { input.checked = input.value === amount.value; }));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!ready || busy || !form.reportValidity()) return;
  busy = true; statusKey = 'busy'; render();
  try {
    const response = await fetch('/api/support/payment', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountNok:Number(amount.value),consent:document.getElementById('supportConsent').checked})});
    const result = await response.json();
    if (!response.ok) throw new Error('Payment failed');
    const url = new URL(result.url);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Invalid checkout');
    window.location.assign(url.href);
  } catch { statusKey = 'failed'; }
  finally { busy = false; render(); }
});
initLanguageSelector(); applyTranslations(); render();
document.addEventListener('languagechange', render);
updateAuthNav().catch(() => {});
try {
  const user = await getCurrentUser();
  document.getElementById('supportLogin').hidden = Boolean(user);
  const response = await fetch('/api/support/product', {cache:'no-store'});
  if (!response.ok) throw new Error('Unavailable');
  const product = await response.json();
  ready = Boolean(user && product.providers?.stripe);
  if (!product.providers?.stripe) statusKey = 'unavailable';
} catch { statusKey = 'unavailable'; }
render();
