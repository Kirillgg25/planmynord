import { initLanguageSelector, applyTranslations, getLanguage } from './i18n.js?v=author-1';
import { updateAuthNav } from './auth.js?v=ticket-wallet-1';

const copy = {
  ru: { preview:'Закрытое тестирование', devices:'Мои устройства', intro:'Приложения PlanMyNord VPN для компьютера и телефона. Здесь доступны тестовые сборки для участников закрытого тестирования.', period:'/ 30 дней',limit:'До 5 устройств · без автопродления',downloads:'Скачать приложение',warning:'Это предварительные сборки. Работа VPN зависит от доступного профиля подключения. Установка приложения сама по себе не активирует подписку.',windows:'Установщик для Windows x64. VPN-клиент запрашивает права администратора для настройки сетевого подключения.',android:'Тестовый APK для Android. Это debug-сборка, а не подписанный production-релиз. Android запросит разрешение на установку из выбранного источника.',downloadExe:'Скачать установщик .exe',downloadApk:'Скачать тестовый .apk',pending:'Сборка пока недоступна',other:'Версии для iPhone, macOS и Linux пока не опубликованы.',connection:'Подключение и устройства',connectionText:'Управление устройствами находится в профиле. Индивидуальный VPN-профиль выдаётся отдельно: наличие установщика не означает, что доступ к серверу уже настроен. Не передавай свою ссылку подключения другим людям.',loading:'Проверяем доступные сборки…',error:'Не удалось загрузить список файлов. Обнови страницу или войди в аккаунт с доступом к VPN.'},
  en: {preview:'Closed testing',devices:'My devices',intro:'PlanMyNord VPN apps for desktop and mobile. Preview builds are available here for closed-test participants.',period:'/ 30 days',limit:'Up to 5 devices · no automatic renewal',downloads:'Download the app',warning:'These are preview builds. VPN connectivity requires an available connection profile. Installing the app does not activate a subscription.',windows:'Installer for Windows x64. The VPN client requests administrator privileges to configure networking.',android:'Test APK for Android. This is a debug build, not a production-signed release. Android will request installation permission for the selected source.',downloadExe:'Download .exe installer',downloadApk:'Download preview .apk',pending:'Build not available yet',other:'iPhone, macOS and Linux versions have not been published.',connection:'Connection and devices',connectionText:'Manage your devices in your profile. Your individual VPN profile is issued separately; an available installer does not mean server access is configured. Keep your connection link private.',loading:'Checking available builds…',error:'Could not load downloads. Refresh the page or sign in with VPN access.'},
  no: {preview:'Lukket testing',devices:'Mine enheter',intro:'PlanMyNord VPN for datamaskin og mobil. Her finner deltakere i den lukkede testen forhåndsversjoner av appene.',period:'/ 30 dager',limit:'Opptil 5 enheter · ingen automatisk fornyelse',downloads:'Last ned appen',warning:'Dette er testversjoner. VPN krever en tilgjengelig tilkoblingsprofil. Installasjon av appen aktiverer ikke et abonnement.',windows:'Installasjonsprogram for Windows x64. VPN-klienten ber om administratorrettigheter for å konfigurere nettverket.',android:'Test-APK for Android. Dette er en debug-versjon, ikke en produksjonssignert utgave. Android ber om installasjonstillatelse for den valgte kilden.',downloadExe:'Last ned .exe',downloadApk:'Last ned test-APK',pending:'Bygget er ikke tilgjengelig ennå',other:'Versjoner for iPhone, macOS og Linux er ikke publisert.',connection:'Tilkobling og enheter',connectionText:'Administrer enheter i profilen din. En individuell VPN-profil utstedes separat. En tilgjengelig installasjonsfil betyr ikke at servertilgang er konfigurert. Ikke del tilkoblingslenken din.',loading:'Sjekker tilgjengelige bygg…',error:'Kunne ikke laste nedlastingslisten. Last siden på nytt eller logg inn med VPN-tilgang.'}
};
let status = 'loading';
copy.ru.unsigned = 'Установщик Windows без цифровой подписи издателя. Windows может показать предупреждение. Не отключай антивирус и не устанавливай файл, если сомневаешься в его происхождении.';
copy.en.unsigned = 'The Windows installer has no publisher signature. Windows may display a warning. Do not disable antivirus or install files of uncertain origin.';
copy.no.unsigned = 'Windows-installasjonsfilen har ingen utgiversignatur. Windows kan vise en advarsel. Ikke deaktiver antivirus eller installer filer av usikker opprinnelse.';
function render() {
  const text = copy[getLanguage()] || copy.en;
  document.querySelectorAll('[data-copy]').forEach(el => {el.textContent = text[el.dataset.copy] || '';});
  document.getElementById('downloadStatus').textContent = text[status] || '';
}
initLanguageSelector(); applyTranslations(); render();
document.addEventListener('languagechange',render);
updateAuthNav().catch(()=>{});
try {
  const response = await fetch('/api/vpn/downloads', {cache:'no-store'});
  if (!response.ok) throw new Error('unavailable');
  const data = await response.json();
  for (const release of data.downloads) {
    if (!['windows','android'].includes(release.platform)) continue;
    const card = document.querySelector(`[data-platform="${release.platform}"]`);
    if (release.available && release.url === `/api/vpn/downloads/${release.platform}`) {
      const link = card.querySelector('a');
      link.href = release.url; link.hidden = false;
      card.querySelector('.vpn-unavailable').hidden = true;
      card.querySelector('.vpn-file-meta').textContent = `v${release.version} · ${(release.bytes / 1048576).toFixed(1)} MB`;
    }
  }
  status = '';
} catch { status = 'error'; }
render();
