import { updateAuthNav } from "./auth.js";
import { initCurrencySelector } from "./currency.js?v=currency-menu-1";
import { applyTranslations, getLanguage, initLanguageSelector } from "./i18n.js?v=reliability-1";

const CONTACT_LINK = '<a href="mailto:kyrylojobb@gmail.com">kyrylojobb@gmail.com</a>';

const legalPages = {
  "terms.html": {
    no: {
      kicker: "Juridisk",
      title: "Vilkår for bruk og kjøp",
      updated: "Sist oppdatert: 24. juni 2026",
      sections: [
        ["1. Hvem vi er", `PlanMyNord drives av <strong>Kyrylo Hladuntsov / PlanMyNord</strong>, organisasjonsnummer <strong>ikke registrert</strong>, adresse <strong>Norge</strong>. Kontakt: ${CONTACT_LINK}.`],
        ["2. Tjenesten", "PlanMyNord hjelper brukere med å planlegge reiseruter i Norge. Forslag til ruter, kostnader, stopp, overnatting og kartinformasjon er veiledende og kan være unøyaktige. Brukeren må selv kontrollere priser, åpningstider, veiforhold, vær og tilgjengelighet før reisen."],
        ["3. Konto", "Du må oppgi riktige opplysninger når du registrerer konto. Du er ansvarlig for å holde innloggingsinformasjon trygg. Vi kan stenge kontoer som misbruker tjenesten, forsøker uautorisert tilgang eller bryter disse vilkårene."],
        ["4. Frivillig støtte", "Støtte er en frivillig betaling for å hjelpe PlanMyNord videre. Alle hovedfunksjoner er åpne for alle brukere. Prisen vises i norske kroner før betaling. Betaling med kort behandles av Stripe. PlanMyNord lagrer ikke kortnummer eller CVC."],
        ["5. Angrerett og refusjon", `Forbrukere kan normalt ha 14 dagers angrerett ved fjernsalg. Støttebetalingen behandles etter gjeldende regler og disse vilkårene. Hvis du mener du har krav på refusjon, kontakt oss på ${CONTACT_LINK}.`],
        ["6. Ansvar", "Tjenesten leveres slik den er. Vi forsøker å holde tjenesten tilgjengelig og korrekt, men garanterer ikke feilfri drift eller at alle reiseopplysninger er oppdaterte. Vi er ikke ansvarlige for tap som skyldes valg brukeren tar basert på veiledende reiseplaner."],
        ["7. Endringer", "Vi kan endre tjenesten og vilkårene ved behov. Vesentlige endringer publiseres på denne siden."]
      ]
    },
    en: {
      kicker: "Legal",
      title: "Terms of use and purchase",
      updated: "Last updated: 24 June 2026",
      sections: [
        ["1. Who we are", `PlanMyNord is operated by <strong>Kyrylo Hladuntsov / PlanMyNord</strong>, organisation number <strong>not registered</strong>, address <strong>Norway</strong>. Contact: ${CONTACT_LINK}.`],
        ["2. The service", "PlanMyNord helps users plan travel routes in Norway. Route, cost, stop, accommodation and map suggestions are guidance only and may be inaccurate. Users must check prices, opening hours, road conditions, weather and availability before travelling."],
        ["3. Account", "You must provide correct information when registering an account. You are responsible for keeping login information secure. We may close accounts that misuse the service, attempt unauthorised access or breach these terms."],
        ["4. Optional support", "Support is an optional payment to help PlanMyNord keep improving. Core features are open to all users. The price is shown in Norwegian kroner before payment. Card payments are processed by Stripe. PlanMyNord does not store card numbers or CVC."],
        ["5. Right of withdrawal and refunds", `Consumers may normally have a 14-day right of withdrawal for distance sales. Support payments are handled according to applicable rules and these terms. If you believe you are entitled to a refund, contact us at ${CONTACT_LINK}.`],
        ["6. Liability", "The service is provided as is. We try to keep it available and correct, but do not guarantee error-free operation or fully updated travel information. We are not liable for losses caused by choices users make based on guiding travel plans."],
        ["7. Changes", "We may change the service and these terms when needed. Material changes will be published on this page."]
      ]
    },
    ru: {
      kicker: "Юридическая информация",
      title: "Условия использования и покупки",
      updated: "Последнее обновление: 24 июня 2026",
      sections: [
        ["1. Кто мы", `PlanMyNord управляется <strong>Kyrylo Hladuntsov / PlanMyNord</strong>, регистрационный номер <strong>не зарегистрирован</strong>, адрес <strong>Норвегия</strong>. Контакт: ${CONTACT_LINK}.`],
        ["2. Сервис", "PlanMyNord помогает пользователям планировать маршруты по Норвегии. Предложения по маршрутам, расходам, остановкам, ночёвкам и картам являются ориентировочными и могут быть неточными. Пользователь сам должен проверить цены, часы работы, дорожные условия, погоду и доступность перед поездкой."],
        ["3. Аккаунт", "При регистрации нужно указывать корректные данные. Вы отвечаете за безопасность данных входа. Мы можем закрыть аккаунт, если он используется с нарушениями, для несанкционированного доступа или с нарушением этих условий."],
        ["4. Добровольная поддержка", "Поддержка — это добровольный платёж, который помогает развивать PlanMyNord. Основные функции открыты для всех пользователей. Цена показывается в норвежских кронах перед оплатой. Оплата картой обрабатывается Stripe. PlanMyNord не хранит номер карты или CVC."],
        ["5. Право отказа и возврат", `Обычно у потребителя есть 14 дней на отказ при дистанционной покупке. Платежи поддержки рассматриваются по действующим правилам и этим условиям. Если вы считаете, что имеете право на возврат, свяжитесь с нами: ${CONTACT_LINK}.`],
        ["6. Ответственность", "Сервис предоставляется как есть. Мы стараемся поддерживать доступность и корректность, но не гарантируем работу без ошибок или полную актуальность всей туристической информации. Мы не отвечаем за потери, вызванные решениями пользователя на основе ориентировочных планов поездки."],
        ["7. Изменения", "Мы можем изменять сервис и условия при необходимости. Существенные изменения публикуются на этой странице."]
      ]
    }
  },
  "privacy.html": {
    no: {
      kicker: "Personvern",
      title: "Personvernerklæring",
      updated: "Sist oppdatert: 10. september 2026",
      sections: [
        ["1. Behandlingsansvarlig", `<strong>Kyrylo Hladuntsov / PlanMyNord</strong>, org.nr. <strong>ikke registrert</strong>, er behandlingsansvarlig for personopplysninger i PlanMyNord. Kontakt: ${CONTACT_LINK}.`],
        ["2. Hvilke opplysninger vi behandler", "Kontoopplysninger, lagrede reiseruter, billetter og reisedokumenter du selv laster opp, betalingsstatus og nødvendige tekniske opplysninger behandles for å levere tjenesten."],
        ["3. Formål og rettslig grunnlag", "Vi bruker opplysninger for konto, reiseplaner, støttebetaling, sikkerhet, feilretting og nødvendig kommunikasjon."],
        ["4. Deling med tredjeparter", "Vi bruker leverandører som Stripe, Mapbox, Google Maps, e-postleverandør og hosting. De skal bare behandle data som er nødvendig for tjenesten."],
        ["5. Lagringstid", "Konto, ruter og opplastede billetter lagres så lenge kontoen er aktiv eller til du sletter dem. Betalings- og regnskapsdata lagres så lenge loven krever det."],
        ["6. Dine rettigheter", "Du kan be om innsyn, retting, sletting, begrensning, dataportabilitet og protest der loven gir rett til det. Du kan også klage til Datatilsynet."],
        ["7. Sikkerhet", "Passord lagres som hash, betaling håndteres av Stripe, og session-cookies er satt til HTTP-only."]
      ]
    },
    en: {
      kicker: "Privacy",
      title: "Privacy policy",
      updated: "Last updated: 10 September 2026",
      sections: [
        ["1. Controller", `<strong>Kyrylo Hladuntsov / PlanMyNord</strong>, org. no. <strong>not registered</strong>, is the controller for personal data in PlanMyNord. Contact: ${CONTACT_LINK}.`],
        ["2. Data we process", "We process account data, saved travel routes, tickets and travel documents you upload, payment status and necessary technical data to provide the service."],
        ["3. Purpose and legal basis", "We use data for accounts, travel plans, support payments, security, error correction and necessary communication."],
        ["4. Sharing with third parties", "We use providers such as Stripe, Mapbox, Google Maps, email and hosting providers. They should only process data needed for the service."],
        ["5. Retention", "Account data, routes and uploaded tickets are stored while the account is active or until you delete them. Payment and accounting data is stored for as long as required by law."],
        ["6. Your rights", "You may request access, correction, deletion, restriction, portability and object where the law gives you that right. You may also complain to Datatilsynet."],
        ["7. Security", "Passwords are stored as hashes, payments are handled by Stripe, and session cookies are HTTP-only."]
      ]
    },
    ru: {
      kicker: "Конфиденциальность",
      title: "Политика конфиденциальности",
      updated: "Последнее обновление: 10 сентября 2026",
      sections: [
        ["1. Ответственный за данные", `<strong>Kyrylo Hladuntsov / PlanMyNord</strong>, рег. номер <strong>не зарегистрирован</strong>, отвечает за обработку персональных данных в PlanMyNord. Контакт: ${CONTACT_LINK}.`],
        ["2. Какие данные мы обрабатываем", "Мы обрабатываем данные аккаунта, сохранённые маршруты, загруженные пользователем билеты и документы поездки, статус оплаты и необходимые технические данные для работы сервиса."],
        ["3. Цели и правовое основание", "Данные используются для аккаунта, маршрутов, платежей поддержки, безопасности, исправления ошибок и необходимой коммуникации."],
        ["4. Передача третьим сторонам", "Мы используем поставщиков вроде Stripe, Mapbox, Google Maps, почтового сервиса и хостинга. Они должны обрабатывать только данные, необходимые для сервиса."],
        ["5. Срок хранения", "Данные аккаунта, маршруты и загруженные билеты хранятся, пока аккаунт активен или пока пользователь их не удалит. Платёжные и бухгалтерские данные хранятся столько, сколько требует закон."],
        ["6. Ваши права", "Вы можете запросить доступ, исправление, удаление, ограничение обработки, перенос данных и возражение, если это предусмотрено законом. Также можно пожаловаться в Datatilsynet."],
        ["7. Безопасность", "Пароли хранятся как хэш, платежи обрабатывает Stripe, session-cookie настроены как HTTP-only."]
      ]
    }
  },
  "cookies.html": {
    no: {
      kicker: "Cookies",
      title: "Informasjonskapsler",
      updated: "Sist oppdatert: 24. juni 2026",
      sections: [
        ["Nødvendige informasjonskapsler", "PlanMyNord bruker nødvendige informasjonskapsler for innlogging og sikkerhet. Disse trengs for at kontoen og tjenesten skal fungere."],
        ["Tredjepartstjenester", "Kart og betaling kan laste inn innhold fra Mapbox, Google Maps og Stripe. Disse leverandørene kan behandle tekniske data når du bruker kart eller betaler."],
        ["Analyse og markedsføring", "PlanMyNord bruker ikke analyse- eller markedsføringscookies i denne versjonen. Hvis dette legges til senere, må brukeren få tydelig informasjon og mulighet til samtykke der det kreves."]
      ]
    },
    en: {
      kicker: "Cookies",
      title: "Cookies",
      updated: "Last updated: 24 June 2026",
      sections: [
        ["Necessary cookies", "PlanMyNord uses necessary cookies for login and security. They are required for the account and service to work."],
        ["Third-party services", "Maps and payments may load content from Mapbox, Google Maps and Stripe. These providers may process technical data when you use maps or pay."],
        ["Analytics and marketing", "PlanMyNord does not use analytics or marketing cookies in this version. If added later, users must receive clear information and a consent option where required."]
      ]
    },
    ru: {
      kicker: "Cookies",
      title: "Файлы cookie",
      updated: "Последнее обновление: 24 июня 2026",
      sections: [
        ["Необходимые cookie", "PlanMyNord использует необходимые cookie для входа и безопасности. Они нужны, чтобы аккаунт и сервис работали."],
        ["Сторонние сервисы", "Карты и платежи могут загружать контент от Mapbox, Google Maps и Stripe. Эти поставщики могут обрабатывать технические данные при использовании карт или оплате."],
        ["Аналитика и маркетинг", "В этой версии PlanMyNord не использует аналитические или маркетинговые cookie. Если они будут добавлены позже, пользователь получит понятную информацию и возможность согласия там, где это требуется."]
      ]
    }
  },
  "refund.html": {
    no: {
      kicker: "Kjøp",
      title: "Angrerett og refusjon",
      updated: "Sist oppdatert: 24. juni 2026",
      sections: [
        ["Støtte er frivillig", "Støtte hjelper PlanMyNord videre, men alle hovedfunksjoner er åpne for alle. Betalingen gir ikke en lukket VIP-funksjon."],
        ["Angrerett", "Forbrukere kan normalt ha 14 dagers angrerett ved kjøp på nett. Støttebetalinger behandles etter gjeldende regler og disse vilkårene."],
        ["Refusjonsforespørsler", `Send e-post til ${CONTACT_LINK} med kontoen din, betalingsdato og årsak. Vi vurderer forespørsler i tråd med gjeldende regler og disse vilkårene.`],
        ["Feil betaling", "Hvis du mener du er belastet feil, kontakt oss så snart som mulig. Kortbetalinger behandles av Stripe, og tilbakebetalinger kan ta noen bankdager."]
      ]
    },
    en: {
      kicker: "Purchase",
      title: "Right of withdrawal and refunds",
      updated: "Last updated: 24 June 2026",
      sections: [
        ["Support is optional", "Support helps PlanMyNord keep improving, but core features are open to everyone. The payment does not unlock a closed paid feature."],
        ["Right of withdrawal", "Consumers may normally have a 14-day right of withdrawal for online purchases. Support payments are handled according to applicable rules and these terms."],
        ["Refund requests", `Email ${CONTACT_LINK} with your account, payment date and reason. We review requests according to applicable rules and these terms.`],
        ["Incorrect payment", "If you believe you were charged incorrectly, contact us as soon as possible. Card payments are processed by Stripe, and refunds may take a few banking days."]
      ]
    },
    ru: {
      kicker: "Покупка",
      title: "Право отказа и возврат",
      updated: "Последнее обновление: 24 июня 2026",
      sections: [
        ["Поддержка добровольная", "Поддержка помогает развивать PlanMyNord, но основные функции открыты для всех. Платёж не открывает закрытую VIP-функцию."],
        ["Право отказа", "Обычно у потребителя есть 14 дней на отказ при онлайн-покупке. Платежи поддержки рассматриваются по действующим правилам и этим условиям."],
        ["Запросы на возврат", `Напишите на ${CONTACT_LINK}, указав аккаунт, дату оплаты и причину. Мы рассматриваем запросы по действующим правилам и этим условиям.`],
        ["Ошибочная оплата", "Если вы считаете, что списание было ошибочным, свяжитесь с нами как можно скорее. Платежи картой обрабатывает Stripe, возврат может занять несколько банковских дней."]
      ]
    }
  }
};

function renderLegalPage() {
  const shell = document.querySelector(".legal-shell");
  if (!shell) return;

  const pathName = window.location.pathname.split("/").pop() || "terms";
  const pageName = pathName.endsWith(".html") ? pathName : `${pathName}.html`;
  const page = legalPages[pageName];
  if (!page) return;

  const content = page[getLanguage()] || page.no;
  document.title = `${content.title} | PlanMyNord`;
  shell.innerHTML = `
    <p class="store-kicker">${content.kicker}</p>
    <h1>${content.title}</h1>
    <p>${content.updated}</p>
    ${content.sections.map(([title, body]) => `<h2>${title}</h2><p>${body}</p>`).join("")}
  `;
}

initCurrencySelector();
initLanguageSelector();
renderLegalPage();
applyTranslations();
updateAuthNav();

document.addEventListener("languagechange", () => {
  renderLegalPage();
  applyTranslations();
});


