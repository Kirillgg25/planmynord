import { getCurrentUser, updateAuthNav } from "./auth.js?v=reliability-1";
import { getPlaceLabel, placeGroups } from "./data.js";
import { getLanguage, initLanguageSelector, t } from "./i18n.js?v=author-1";
// Guide copy is translated separately from place IDs, map queries and URLs.
const phrases = {
  'Søk etter by': ['Search cities','Поиск города'],
  'Antall dager': ['Number of days','Количество дней'], 'Startdato': ['Start date','Дата начала'],
  'Budsjett': ['Budget','Бюджет'], 'Rimelig': ['Budget-friendly','Экономный'], 'Middels': ['Moderate','Средний'], 'Komfortabelt': ['Comfortable','Комфортный'],
  'Jeg har bil': ['I have a car','У меня есть машина'], 'Interesser': ['Interests','Интересы'],
  'Historie': ['History','История'], 'Natur': ['Nature','Природа'], 'Mat': ['Food','Еда'], 'Familie': ['Family','Семья'], 'Uteliv': ['Nightlife','Ночная жизнь'],
  'Legg denne byen til reisen': ['Add this city to the trip','Добавить город в поездку'],
  'Populære byer': ['Popular cities','Популярные города'], 'Andre byer': ['Other cities','Другие города'],
  'Tilpass turen': ['Customize your trip','Настройки поездки'], 'Plan dag for dag': ['Day-by-day plan','План по дням'],
  'Velg steder': ['Choose places','Выбери места'], 'Steder som passer interessene dine': ['Places matching your interests','Места по твоим интересам'],
  'Utenfor valgt by': ['Outside the selected city','За пределами выбранного города'],
  'Avstand': ['Distance','Расстояние'], 'Tid': ['Time','Время'], 'Pris': ['Price','Стоимость'], 'Passer i regn': ['Suitable in rain','Подходит в дождь'],
  'Vis på kartet': ['Show on map','Показать на карте'], 'Lagt til ✓': ['Added ✓','Добавлено ✓'], 'Legg til i ruten': ['Add to route','Добавить в маршрут'], 'Offisiell kilde': ['Official source','Официальный источник'],
  'Gratis': ['Free','Бесплатно'], 'Gratis ute': ['Free outdoors','Снаружи бесплатно'], 'Billett': ['Ticket required','Платный вход'], 'Billett inne': ['Ticket for indoor areas','Вход внутрь платный'], 'Transport': ['Transport costs','Расходы на транспорт'], 'Sjekk sesong': ['Check seasonal availability','Уточни сезон работы'],
  'Ja': ['Yes','Да'], 'Nei': ['No','Нет'], 'Delvis': ['Partly','Частично'],
  'Tilpasses underveis': ['Adjust as you go','Зависит от выбранного пути'], 'heldag': ['Full day','Весь день'],
  'Lunsj': ['Lunch','Обед'], 'Lunsj i sentrum': ['Lunch in the city centre','Обед в центре'], 'Tid til egne valg': ['Time for your own plans','Время для своих планов'], 'Rolig avslutning': ['A relaxed finish','Спокойное завершение дня'],
  'To rolige bydager der de fleste stoppene bindes sammen til fots eller med kort kollektivtur.': ['Two relaxed city days, mostly on foot with short public transport journeys.','Два спокойных дня в городе: между остановками можно ходить пешком или недолго ехать на общественном транспорте.'],
  'Bjørvika og havnepromenaden': ['Bjørvika and the waterfront','Бьёрвика и набережная'], 'Parker og vestkanten': ['Parks and the west side','Парки и западная часть города'],
  'Frokost i Bjørvika': ['Breakfast in Bjørvika','Завтрак в Бьёрвике'], 'Operahuset – gå på taket': ['Opera House roof walk','Прогулка по крыше Оперного театра'], 'Lunsj ved Barcode': ['Lunch near Barcode','Обед у квартала Barcode'], 'MUNCH eller Akershus festning': ['MUNCH or Akershus Fortress','Музей MUNCH или крепость Акерсхус'], 'Havnepromenaden til Aker Brygge': ['Waterfront walk to Aker Brygge','По набережной до Акер-Брюгге'], 'Lunsj på Majorstuen': ['Lunch in Majorstuen','Обед в Майорстюэне'], 'Frogner eller Bygdøy': ['Frogner or Bygdøy','Фрогнер или Бюгдёй'], 'Kaffe i sentrum': ['Coffee in the city centre','Кофе в центре'],
  'Arkitektur, fjordutsikt og en gratis tur på taket.': ['Architecture, fjord views and a free rooftop walk.','Архитектура, виды на фьорд и бесплатная прогулка по крыше.'], 'Kunstmuseum i Bjørvika; et godt valg når det regner.': ['An art museum in Bjørvika, ideal for a rainy day.','Художественный музей в Бьёрвике, хороший выбор в дождь.'], 'Stor skulpturpark som er åpen hele døgnet.': ['A large sculpture park open around the clock.','Большой парк скульптур, открытый круглосуточно.'],
  'En kompakt plan rundt Bryggen, havna og utsikten fra Fløyen, med et innendørs alternativ ved regn.': ['A compact route around Bryggen, the harbour and Fløyen, with an indoor option for rain.','Компактный маршрут по Брюггену, гавани и смотровым площадкам Флёйена с вариантом на случай дождя.'],
  'Bryggen og Fløyen': ['Bryggen and Fløyen','Брюгген и Флёйен'], 'KODE og Nordnes': ['KODE and Nordnes','KODE и Норднес'], 'Frokost ved Vågen': ['Breakfast by Vågen','Завтрак у гавани Воген'], 'Bryggen og de smale passasjene': ['Bryggen and its narrow passages','Брюгген и его узкие проходы'], 'Fløibanen og tur på Fløyen': ['Fløibanen and a walk on Fløyen','Фуникулёр Fløibanen и прогулка по Флёйену'], 'Tilbake til sentrum': ['Return to the city centre','Возвращение в центр'], 'KODE kunstmuseer': ['KODE art museums','Художественные музеи KODE'], 'Lunsj ved Lille Lungegårdsvann': ['Lunch by Lille Lungegårdsvann','Обед у озера Лилле-Лунгегордсванн'], 'Gå mot Nordnes': ['Walk towards Nordnes','Прогулка к Норднесу'], 'Kaffe ved Vågen': ['Coffee by Vågen','Кофе у гавани Воген'],
  'Det historiske havnekvartalet og Bergens mest særpregede byrom.': ['The historic harbour district, one of Bergen’s most distinctive areas.','Исторический портовый квартал, одно из самых характерных мест Бергена.'], 'Rask vei opp til utsikt og korte turstier over byen.': ['A quick ride up to viewpoints and short trails above the city.','Быстрый подъём к смотровым площадкам и коротким тропам над городом.'], 'Kunst, design og komponisthjem; egner seg særlig på regnværsdager.': ['Art, design and composers’ homes, particularly good on rainy days.','Искусство, дизайн и дома композиторов; особенно хорошо подходят для дождливых дней.'],
  'Sentrum kan oppleves til fots. Fjellheisen og Ishavskatedralen krever buss eller en lengre spasertur over brua.': ['Explore the centre on foot. Fjellheisen and the Arctic Cathedral need a bus ride or a longer walk across the bridge.','Центр удобно исследовать пешком. До Fjellheisen и Арктического собора нужен автобус или более долгая прогулка через мост.'],
  'Sentrum og polarhistorie': ['City centre and polar history','Центр и полярная история'], 'Tromsdalen og utsikten': ['Tromsdalen and the views','Тромсдален и панорамные виды'], 'Lunsj i Storgata': ['Lunch on Storgata','Обед на Сторгате'], 'Havnepromenaden': ['Waterfront promenade','Набережная'], 'Middag i sentrum': ['Dinner in the centre','Ужин в центре'], 'Buss til Ishavskatedralen': ['Bus to the Arctic Cathedral','Автобус до Арктического собора'], 'Retur til sentrum': ['Return to the centre','Возвращение в центр'],
  'Arktisk opplevelsessenter og akvarium, godt egnet for familier og regn.': ['An Arctic visitor centre and aquarium, suitable for families and rainy days.','Арктический познавательный центр и аквариум: для семей и дождливых дней.'], 'Kompakt museum om ekspedisjoner, fangst og livet i Arktis.': ['A compact museum about expeditions, hunting and Arctic life.','Небольшой музей об экспедициях, промысле и жизни в Арктике.'], 'Taubane til Storsteinen med vid utsikt over Tromsø og fjellene.': ['Cable car to Storsteinen with sweeping views of Tromsø and the mountains.','Канатная дорога на Сторстейнен с панорамой Тромсё и гор.'],
  'Første dag holder seg i sentrum. Preikestolen er en egen heldagstur utenfor Stavanger og krever værforbehold.': ['Spend day one in the centre. Preikestolen is a separate full-day excursion outside Stavanger, weather permitting.','Первый день проходит в центре. Прекестулен — отдельная поездка на весь день за пределы Ставангера, если позволит погода.'],
  'Gamle Stavanger og Vågen': ['Old Stavanger and Vågen','Старый Ставангер и Воген'], 'Utenfor byen – sjekk buss/ferje og vær før avreise.': ['Outside the city: check buses, ferries and weather before departure.','За пределами города: перед выездом проверь автобусы, паромы и погоду.'], 'Lunsj ved Vågen': ['Lunch by Vågen','Обед у гавани Воген'], 'Valbergtårnet og havna': ['Valbergtårnet and the harbour','Башня Вальберг и гавань'], 'Avreise fra Stavanger': ['Depart from Stavanger','Выезд из Ставангера'], 'Start fotturen': ['Start the hike','Начало пешего похода'], 'Retur fra startpunktet': ['Return from the trailhead','Отъезд от начала тропы'], 'Tilbake i Stavanger': ['Back in Stavanger','Возвращение в Ставангер'],
  'Hvite trehus og små gater vest for Vågen.': ['White wooden houses and small streets west of Vågen.','Белые деревянные дома и узкие улицы к западу от гавани Воген.'], 'Moderne museum om energi, teknologi og norsk oljehistorie.': ['A modern museum about energy, technology and Norway’s oil history.','Современный музей об энергетике, технологиях и истории нефтяной отрасли Норвегии.'], 'Fjelltur utenfor byen; krevende ved dårlig vær og ikke en sentrumsattraksjon.': ['A mountain hike outside the city, demanding in poor weather and not a city-centre attraction.','Горный поход за пределами города: в плохую погоду сложный, это не достопримечательность центра.'],
  'Den historiske kjernen er kompakt: Nidarosdomen, Gamle Bybro og Bakklandet fungerer godt som én sammenhengende tur.': ['The compact historic centre links Nidaros Cathedral, the Old Town Bridge and Bakklandet in one walk.','Компактный исторический центр: Нидаросский собор, Старый мост и Баккландет удобно объединить в одну прогулку.'], 'Det historiske Trondheim': ['Historic Trondheim','Исторический Тронхейм'], 'Havna og nyere historie': ['The harbour and recent history','Гавань и новая история'], 'Lunsj i Bakklandet': ['Lunch in Bakklandet','Обед в Баккландете'], 'Lunsj på Solsiden': ['Lunch at Solsiden','Обед в Сольсидене'],
  'Norges nasjonalhelligdom og byens viktigste historiske stopp.': ['Norway’s national sanctuary and a key historic stop in the city.','Национальная святыня Норвегии и важнейшая историческая достопримечательность города.'], 'Trehus, små kafeer og en rolig gate langs Nidelva.': ['Wooden houses, small cafés and a peaceful street along the Nidelva.','Деревянные дома, небольшие кафе и спокойная улица вдоль Нидэльвы.'], 'Interaktivt museum for norsk populærmusikk.': ['An interactive museum of Norwegian popular music.','Интерактивный музей норвежской популярной музыки.'],
  'Første dag foregår i Sarpsborg. Dag to er tydelig merket som en utflukt til nabobyen Fredrikstad.': ['Day one is in Sarpsborg; day two is an excursion to neighbouring Fredrikstad.','Первый день — в Сарпсборге, второй — поездка в соседний Фредрикстад.'], 'Sentrum i Sarpsborg': ['Sarpsborg city centre','Центр Сарпсборга'], 'Utflukt til Gamlebyen i Fredrikstad': ['Excursion to Fredrikstad’s Old Town','Поездка в Старый город Фредрикстада'], 'Frokost i sentrum': ['Breakfast in the centre','Завтрак в центре'], 'Utenfor Sarpsborg – omtrent 20 minutter med tog til Fredrikstad, deretter buss eller gange.': ['Outside Sarpsborg: about 20 minutes by train to Fredrikstad, then a bus or walk.','За пределами Сарпсборга: около 20 минут на поезде до Фредрикстада, затем автобус или пешком.'], 'Tog fra Sarpsborg': ['Train from Sarpsborg','Поезд из Сарпсборга'], 'Lunsj i Gamlebyen': ['Lunch in the Old Town','Обед в Старом городе'], 'Gratis byferge til Isegran': ['Free city ferry to Isegran','Бесплатный городской паром до Исеграна'], 'Retur til Sarpsborg': ['Return to Sarpsborg','Возвращение в Сарпсборг'],
  'Bymuseum med middelalderruiner og historie fra Østfold.': ['A city museum with medieval ruins and Østfold history.','Городской музей со средневековыми руинами и историей Эстфолла.'], 'Grønn park nær sentrum, egnet for en rolig pause eller piknik.': ['A green park near the centre for a quiet break or picnic.','Зелёный парк рядом с центром для спокойного отдыха или пикника.'], 'Festningsby i nabobyen Fredrikstad – dette er en utflukt, ikke et sted i Sarpsborg.': ['A fortified town in neighbouring Fredrikstad: an excursion, not a location in Sarpsborg.','Город-крепость в соседнем Фредрикстаде: это отдельная поездка, а не место в Сарпсборге.'],
  'En byplan rundt Gamlebyen, elva og den gratis byferga. De sentrale stoppene kan kombineres uten bil.': ['Explore the Old Town, river and free city ferry. The central stops do not require a car.','Маршрут по Старому городу, реке и бесплатному городскому парому. Основные остановки можно посетить без машины.'], 'Gamlebyen og Isegran': ['Old Town and Isegran','Старый город и Исегран'], 'Elva og sentrum': ['River and city centre','Река и центр города'], 'Gratis byferge': ['Free city ferry','Бесплатный городской паром'], 'Bryggepromenaden': ['Quayside promenade','Прогулка по набережной'], 'Ferge til sentrum': ['Ferry to the centre','Паром до центра'], 'Kråkerøy og elvepromenaden': ['Kråkerøy and the riverside','Крокерёй и речная набережная'],
  'En levende festningsby med voller, gallerier og små serveringssteder.': ['A lively fortified town with ramparts, galleries and small eateries.','Живой город-крепость с валами, галереями и небольшими кафе.'], 'Historisk øy med maritime miljøer, nådd med gratis byferge.': ['A historic island with maritime heritage, reached by the free city ferry.','Исторический остров с морским наследием, до которого идёт бесплатный городской паром.'], 'Lokalhistorie i Gamlebyen og et godt stopp i ustabilt vær.': ['Local history in the Old Town, a good stop in changeable weather.','Местная история в Старом городе, хороший вариант при переменчивой погоде.'],
  'utenfor Stavanger': ['outside Stavanger','за пределами Ставангера'], 'kort fergetur': ['short ferry ride','короткая поездка на пароме'], 'i Gamlebyen': ['in the Old Town','в Старом городе'],
  'En konkret plan med tider, transport og kostnader.': ['A plan with times, transport and costs.','План со временем посещения, транспортом и расходами.']
};

function guideText(text, language) {
  if (language === 'no' || typeof text !== 'string') return text;
  const column = language === 'ru' ? 1 : 0;
  if (phrases[text]) return phrases[text][column];
  // Only translate units in numeric metadata; proper names remain searchable.
  if (/^(ca\. )?\d/.test(text)) {
    text = text.replace(/(\d) t\b/g, language === 'ru' ? '$1 ч' : '$1 h')
      .replace(/(\d) m\b/g, language === 'ru' ? '$1 м' : '$1 m');
    const replacements = language === 'ru'
      ? [['ca. ','около '],['km','км'],[' min',' мин'],[' timer',' ч'],['til fots','пешком'],['fottur','пешком'],['trikk','трамвай'],['buss','автобус'],['ferge','паром'],['fra sentrum','от центра'],['fra stasjonen','от вокзала'],['med tog','на поезде']]
      : [['ca. ','approx. '],[' timer',' hours'],['til fots','on foot'],['fottur','hike'],['trikk','tram'],['buss','bus'],['ferge','ferry'],['fra sentrum','from the centre'],['fra stasjonen','from the station'],['med tog','by train']];
    // Longer phrases must be replaced before their shorter unit prefixes.
    return replacements.sort((a,b)=>b[0].length-a[0].length).reduce((s,[from,to])=>s.replaceAll(from,to),text);
  }
  return text;
}

function dayCount(days, language) {
  const category = new Intl.PluralRules(language === 'no' ? 'nb' : language).select(Number(days));
  const forms = language === 'ru' ? {one:'день',few:'дня',many:'дней',other:'дня'} : language === 'no' ? {one:'dag',other:'dager'} : {one:'day',other:'days'};
  return `${days} ${forms[category] || forms.other}`;
}
import { storePlannerDraft } from "./planner-transfer.js";
import { MAPBOX_ACCESS_TOKEN, getPlaceCenter } from "./mapbox-config.js";
import { escapeHtml } from "./html-utils.js?v=shared-ui-2";
import { enhanceSelectMenu } from "./select-menu.js?v=site-docs-selects-1";
import { createDateRangePicker } from "./date-picker.js?v=shared-ui-3";
import {
  createInteractiveMap,
  createLngLatBounds,
  createMapMarker,
  createNavigationControl,
  createPopup,
  isMapRendererAvailable
} from "./map-engine.js?v=map-engine-2";

const phraseTranslations = {
  ru: {
    "Opera House": "Оперный театр",
    "Akershus Fortress": "крепость Акерсхус",
    MUNCH: "музей MUNCH",
    "Vigeland Park": "парк Вигеланда",
    "Aker Brygge": "Aker Brygge",
    Mathallen: "Mathallen",
    "Barcode street food": "стритфуд в Barcode",
    "Aker Brygge cafes": "кафе на Aker Brygge",
    Sentrum: "центр",
    Grunerlokka: "Grunerlokka",
    Majorstuen: "Majorstuen",
    "comfortable shoes": "удобная обувь",
    "wind jacket": "ветровка",
    "power bank": "пауэрбанк",
    "water bottle": "бутылка воды",
    Bryggen: "Брюгген",
    "Fløyen": "Флёйен",
    "Fish Market": "рыбный рынок",
    Ulriken: "Ульрикен",
    "fjord cruise": "круиз по фьорду",
    "Bryggen restaurants": "рестораны у Брюггена",
    "local bakeries": "местные пекарни",
    "near Byparken": "рядом с Byparken",
    "rain jacket": "дождевик",
    "warm layer": "тёплый слой одежды",
    "waterproof shoes": "непромокаемая обувь",
    camera: "камера",
    "Arctic Cathedral": "Арктический собор",
    Fjellheisen: "Fjellheisen",
    Polaria: "Polaria",
    "harbour walk": "прогулка у гавани",
    "northern lights tour": "тур за северным сиянием",
    "harbour restaurants": "рестораны у гавани",
    "warm cafes": "уютные кафе",
    "local seafood": "местные морепродукты",
    "harbour area": "район гавани",
    "near Prostneset": "рядом с Prostneset",
    "warm jacket": "тёплая куртка",
    "hat and gloves": "шапка и перчатки",
    "thermal layer": "термобельё",
    tripod: "штатив",
    "Nidaros Cathedral": "Нидаросский собор",
    Bakklandet: "Bakklandet",
    "Old Town Bridge": "Старый городской мост",
    "Kristiansten Fortress": "крепость Kristiansten",
    Solsiden: "Solsiden",
    "Bakklandet cafes": "кафе в Bakklandet",
    "Solsiden restaurants": "рестораны в Solsiden",
    "local bakery": "местная пекарня",
    "walking shoes": "обувь для прогулок",
    "light jacket": "лёгкая куртка",
    umbrella: "зонт",
    charger: "зарядка",
    "Old Stavanger": "Старый Stavanger",
    "Norwegian Petroleum Museum": "Норвежский музей нефти",
    "Øvre Holmegate": "Øvre Holmegate",
    harbour: "гавань",
    "Preikestolen trip": "поездка к Preikestolen",
    "Øvre Holmegate cafes": "кафе на Øvre Holmegate",
    "street food": "стритфуд",
    "near harbour": "рядом с гаванью",
    "hiking shoes": "обувь для хайкинга",
    snacks: "перекус",
    "Aksla viewpoint": "смотровая Aksla",
    "Art Nouveau centre": "центр ар-нуво",
    "Atlantic Sea-Park": "Atlantic Sea-Park",
    "city walk": "прогулка по городу",
    "harbour seafood": "морепродукты у гавани",
    "city centre cafes": "кафе в центре",
    "bakery breakfast": "завтрак в пекарне",
    "near Brosundet": "рядом с Brosundet"
  },
  no: {
    "Opera House": "Operahuset",
    "Akershus Fortress": "Akershus festning",
    "Vigeland Park": "Vigelandsparken",
    "Barcode street food": "streetfood i Barcode",
    "Aker Brygge cafes": "kafeer på Aker Brygge",
    Grunerlokka: "Grünerløkka",
    "comfortable shoes": "komfortable sko",
    "wind jacket": "vindjakke",
    "power bank": "powerbank",
    "water bottle": "vannflaske",
    "Fish Market": "Fisketorget",
    "fjord cruise": "fjordcruise",
    "Bryggen restaurants": "restauranter på Bryggen",
    "local bakeries": "lokale bakerier",
    "near Byparken": "nær Byparken",
    "rain jacket": "regnjakke",
    "warm layer": "varmt mellomlag",
    "waterproof shoes": "vanntette sko",
    camera: "kamera",
    "Arctic Cathedral": "Ishavskatedralen",
    "harbour walk": "tur langs havna",
    "northern lights tour": "nordlystur",
    "harbour restaurants": "restauranter ved havna",
    "warm cafes": "hyggelige kafeer",
    "local seafood": "lokal sjømat",
    "harbour area": "havneområdet",
    "near Prostneset": "nær Prostneset",
    "warm jacket": "varm jakke",
    "hat and gloves": "lue og hansker",
    "thermal layer": "ullundertøy",
    tripod: "stativ",
    "Nidaros Cathedral": "Nidarosdomen",
    "Old Town Bridge": "Gamle Bybro",
    "Kristiansten Fortress": "Kristiansten festning",
    "Bakklandet cafes": "kafeer på Bakklandet",
    "Solsiden restaurants": "restauranter på Solsiden",
    "local bakery": "lokalt bakeri",
    "walking shoes": "gode gåsko",
    "light jacket": "lett jakke",
    umbrella: "paraply",
    charger: "lader",
    "Old Stavanger": "Gamle Stavanger",
    "Norwegian Petroleum Museum": "Norsk oljemuseum",
    harbour: "havna",
    "Preikestolen trip": "tur til Preikestolen",
    "Øvre Holmegate cafes": "kafeer i Øvre Holmegate",
    "street food": "streetfood",
    "near harbour": "nær havna",
    "hiking shoes": "tursko",
    snacks: "niste",
    "Aksla viewpoint": "Aksla utsiktspunkt",
    "Art Nouveau centre": "Jugendstilsenteret",
    "Atlantic Sea-Park": "Atlanterhavsparken",
    "city walk": "byvandring",
    "harbour seafood": "sjømat ved havna",
    "city centre cafes": "kafeer i sentrum",
    "bakery breakfast": "frokost på bakeri",
    "near Brosundet": "nær Brosundet"
  }
};

const knownPlaceCoordinates = {
  "oslo|opera house": { coordinates: [10.7531, 59.9075], label: "Opera House" },
  "oslo|akershus fortress": { coordinates: [10.7365, 59.9077], label: "Akershus Fortress" },
  "oslo|munch": { coordinates: [10.7557, 59.906], label: "MUNCH" },
  "oslo|vigeland park": { coordinates: [10.7008, 59.9268], label: "Vigeland Park" },
  "oslo|aker brygge": { coordinates: [10.7272, 59.9106], label: "Aker Brygge" },
  "oslo|mathallen": { coordinates: [10.7513, 59.922], label: "Mathallen" },
  "oslo|barcode street food": { coordinates: [10.7602, 59.9071], label: "Barcode street food" },
  "oslo|aker brygge cafes": { coordinates: [10.7272, 59.9106], label: "Aker Brygge cafes" },
  "bergen|bryggen": { coordinates: [5.3239, 60.3971], label: "Bryggen" },
  "bergen|floyen": { coordinates: [5.3454, 60.3944], label: "Fløyen" },
  "bergen|fish market": { coordinates: [5.3245, 60.395], label: "Fish Market" },
  "bergen|ulriken": { coordinates: [5.3872, 60.3778], label: "Ulriken" },
  "tromso|arctic cathedral": { coordinates: [18.9866, 69.6489], label: "Arctic Cathedral" },
  "tromso|fjellheisen": { coordinates: [18.9966, 69.6445], label: "Fjellheisen" },
  "tromso|polaria": { coordinates: [18.9489, 69.6441], label: "Polaria" },
  "trondheim|nidaros cathedral": { coordinates: [10.3969, 63.4269], label: "Nidaros Cathedral" },
  "trondheim|bakklandet": { coordinates: [10.4084, 63.4294], label: "Bakklandet" },
  "trondheim|old town bridge": { coordinates: [10.4029, 63.4286], label: "Old Town Bridge" },
  "stavanger|old stavanger": { coordinates: [5.7276, 58.9726], label: "Old Stavanger" },
  "stavanger|norwegian petroleum museum": { coordinates: [5.7356, 58.9745], label: "Norwegian Petroleum Museum" },
  "stavanger|ovre holmegate": { coordinates: [5.7336, 58.9706], label: "Øvre Holmegate" },
  "alesund|aksla viewpoint": { coordinates: [6.1686, 62.4742], label: "Aksla viewpoint" },
  "alesund|art nouveau centre": { coordinates: [6.1519, 62.4722], label: "Art Nouveau centre" },
  "alesund|atlantic sea-park": { coordinates: [6.1197, 62.4682], label: "Atlantic Sea-Park" }
};

Object.assign(knownPlaceCoordinates, {
  "sarpsborg|borgarsyssel museum": { coordinates: [11.1148, 59.2862], label: "Borgarsyssel Museum" },
  "sarpsborg|kulasparken": { coordinates: [11.1078, 59.2802], label: "Kulåsparken" },
  "sarpsborg|sarpefossen": { coordinates: [11.1342, 59.2798], label: "Sarpefossen" },
  "fredrikstad|gamlebyen i fredrikstad": { coordinates: [10.9547, 59.2035], label: "Gamlebyen i Fredrikstad" },
  "fredrikstad|isegran": { coordinates: [10.9425, 59.2053], label: "Isegran" },
  "trondheim|solsiden": { coordinates: [10.4129, 63.4354], label: "Solsiden" },
  "tromso|polarmuseet": { coordinates: [18.9637, 69.6529], label: "Polarmuseet" },
  "bergen|floibanen": { coordinates: [5.3285, 60.3961], label: "Fløibanen" }
});

const cityInsightText = {
  ru: {
    capital: {
      culture: "Осло спокойный, современный и очень пешеходный город. Здесь нормально проводить день без спешки: музей, кофе, прогулка у воды и парк часто ценятся выше плотного расписания.",
      habits: "Люди обычно держат дистанцию, говорят тихо в транспорте и уважают личное пространство. В кафе и магазинах почти везде удобно платить картой.",
      useful: "Погода может резко меняться даже летом, поэтому лучше иметь лёгкую куртку. В центре удобно ходить пешком, а для дальних районов использовать общественный транспорт."
    },
    fjord: {
      culture: "В городах у фьордов жизнь сильно связана с погодой, морем и видами. Лучшие впечатления часто не в одном музее, а в подъёме на смотровую, прогулке по старым улицам и паузе у воды.",
      habits: "Местные обычно спокойно относятся к дождю и не отменяют прогулки из-за лёгкой непогоды. Хороший темп здесь медленнее: лучше меньше точек, но больше времени на виды.",
      useful: "Бери непромокаемую обувь и одежду слоями. На смотровых может быть ветер, даже если в центре города тепло."
    },
    arctic: {
      culture: "Север Норвегии более суровый и открытый: природа здесь важнее расписания. Зимой день короткий, летом свет может держаться почти всю ночь.",
      habits: "Люди ценят практичность: тёплая одежда, точность по времени и уважение к погоде. Перед выездом за город лучше проверять прогноз и дорогу.",
      useful: "Планируй меньше активностей в день. Оставляй запас времени на погоду, транспорт и световой день."
    },
    historic: {
      culture: "Исторические города Норвегии лучше смотреть пешком: старые улицы, деревянные дома, соборы, крепости и маленькие кафе раскрываются без спешки.",
      habits: "В жилых районах принято вести себя тихо и не заходить в частные дворы. В музеях и церквях лучше говорить спокойнее и уважать местные правила.",
      useful: "Для короткого визита выбирай центр, набережную и одну главную достопримечательность. Так день будет насыщенным, но не утомительным."
    },
    coast: {
      culture: "Прибрежные города живут вокруг гавани, ветра и морской еды. Здесь хорошо работают прогулки без жёсткого плана: старый город, набережная, кафе и короткий выезд к природе.",
      habits: "К ветру и дождю относятся спокойно. В ресторанах у гавани лучше приходить чуть раньше вечером, особенно в сезон.",
      useful: "Даже в солнечный день пригодится ветровка. Для поездок к скалам или пляжам лучше брать воду и обувь с нормальной подошвой."
    }
  },
  en: {
    capital: {
      culture: "Oslo is calm, modern and easy to explore on foot. A good day here is often a museum, coffee, the waterfront and a park rather than a packed checklist.",
      habits: "People usually keep personal space, speak quietly on public transport and pay by card almost everywhere.",
      useful: "Weather can change quickly even in summer, so bring a light jacket. Walk in the centre and use public transport for outer districts."
    },
    fjord: {
      culture: "Fjord cities are shaped by weather, sea and viewpoints. The best moments are often a viewpoint, old streets and time near the water.",
      habits: "Light rain rarely stops local life. Keep the pace slower: fewer stops, more time for views.",
      useful: "Bring waterproof shoes and layers. Viewpoints can be windy even when the city centre feels warm."
    },
    arctic: {
      culture: "Northern Norway feels practical and nature-led. Winter days are short, while summer light can last almost all night.",
      habits: "People value practical clothing, being on time and respecting the weather. Check forecast and road conditions before leaving town.",
      useful: "Plan fewer activities per day and keep extra time for weather, transport and daylight."
    },
    historic: {
      culture: "Norwegian historic towns are best explored slowly on foot: old streets, wooden houses, churches, fortresses and small cafes.",
      habits: "In residential areas, keep quiet and avoid private courtyards. In museums and churches, follow local rules and keep the mood calm.",
      useful: "For a short visit, choose the centre, waterfront and one main sight. It keeps the day rich without becoming tiring."
    },
    coast: {
      culture: "Coastal towns revolve around the harbour, wind and seafood. They work well with a loose plan: old streets, waterfront, cafes and a short nature trip.",
      habits: "Wind and rain are treated as normal. Harbour restaurants are easier if you arrive a bit early in high season.",
      useful: "A wind jacket helps even on sunny days. For cliffs or beaches, bring water and proper shoes."
    }
  }
};

cityInsightText.no = {
  capital: {
    culture: "Oslo er en rolig og moderne by som er lett å oppleve til fots. Sett av tid til ett museum, en kaffepause, havnepromenaden og en park i stedet for å fylle dagen med for mange stopp.",
    habits: "Nordmenn setter pris på personlig rom og et rolig lydnivå på kollektivtransport. Du kan betale med kort eller mobil nesten overalt.",
    useful: "Været kan skifte raskt, også om sommeren. Ta med en lett jakke, gå mellom stedene i sentrum og bruk kollektivtransport når du skal lenger ut."
  },
  fjord: {
    culture: "I fjordbyene er været, sjøen og utsikten en viktig del av opplevelsen. Kombiner en tur til et utsiktspunkt med gamle gater og god tid ved vannet.",
    habits: "Litt regn stopper sjelden hverdagen. Planlegg heller færre stopp og bruk mer tid på utsikten enn å skynde deg gjennom en lang liste.",
    useful: "Ta med vanntette sko og klær som kan brukes lag på lag. Det kan blåse godt på utsiktspunktene selv når det er mildt i sentrum."
  },
  arctic: {
    culture: "I Nord-Norge setter naturen ofte premissene for dagen. Vinteren har få lyse timer, mens midnattssolen gir svært lange dager om sommeren.",
    habits: "Praktiske klær, punktlighet og respekt for været er viktig. Sjekk værmelding og veiforhold før du drar ut av byen.",
    useful: "Legg inn færre aktiviteter per dag og behold litt slingringsmonn til vær, transport og skiftende lysforhold."
  },
  historic: {
    culture: "Historiske norske byer oppleves best i rolig tempo til fots. Gamle gater, trehus, kirker, festninger og små kafeer ligger ofte nær hverandre.",
    habits: "Vis hensyn i boligområder og unngå private gårdsrom. Følg lokale regler og hold et rolig lydnivå i kirker og museer.",
    useful: "På et kort besøk holder det ofte med sentrum, havneområdet og én hovedattraksjon. Da blir dagen innholdsrik uten å bli slitsom."
  },
  coast: {
    culture: "Kystbyene er preget av havna, vinden og nærheten til sjøen. En god dag kan bestå av gamle gater, en tur langs vannet, en kafépause og en kort utflukt i naturen.",
    habits: "Vind og regn er en naturlig del av kystlivet. I høysesongen kan det lønne seg å komme litt tidlig til populære restauranter ved havna.",
    useful: "En vindtett jakke er nyttig selv på solrike dager. Ta med vann og sko med godt grep dersom du skal til svaberg, strender eller turstier."
  }
};

const cityProfiles = {
  Oslo: {
    days: "2-3",
    type: "capital",
    highlights: ["Opera House", "Akershus Fortress", "MUNCH", "Vigeland Park", "Aker Brygge"],
    food: ["Mathallen", "Barcode street food", "Aker Brygge cafes"],
    stay: ["Sentrum", "Grunerlokka", "Majorstuen"],
    pack: ["comfortable shoes", "wind jacket", "power bank", "water bottle"]
  },
  Bergen: {
    days: "2-3",
    type: "fjord",
    highlights: ["Bryggen", "Fløyen", "Fish Market", "Ulriken", "fjord cruise"],
    food: ["Fish Market", "Bryggen restaurants", "local bakeries"],
    stay: ["Sentrum", "Bryggen", "near Byparken"],
    pack: ["rain jacket", "warm layer", "waterproof shoes", "camera"]
  },
  Tromso: {
    days: "3-4",
    type: "arctic",
    highlights: ["Arctic Cathedral", "Fjellheisen", "Polaria", "harbour walk", "northern lights tour"],
    food: ["harbour restaurants", "warm cafes", "local seafood"],
    stay: ["Sentrum", "harbour area", "near Prostneset"],
    pack: ["warm jacket", "hat and gloves", "thermal layer", "tripod"]
  },
  Trondheim: {
    days: "2",
    type: "historic",
    highlights: ["Nidaros Cathedral", "Bakklandet", "Old Town Bridge", "Kristiansten Fortress", "Solsiden"],
    food: ["Bakklandet cafes", "Solsiden restaurants", "local bakery"],
    stay: ["Sentrum", "Bakklandet", "Solsiden"],
    pack: ["walking shoes", "light jacket", "umbrella", "charger"]
  },
  Stavanger: {
    days: "2-3",
    type: "coast",
    highlights: ["Old Stavanger", "Norwegian Petroleum Museum", "Øvre Holmegate", "harbour", "Preikestolen trip"],
    food: ["harbour restaurants", "Øvre Holmegate cafes", "street food"],
    stay: ["Sentrum", "near harbour", "Old Stavanger"],
    pack: ["wind jacket", "hiking shoes", "snacks", "water bottle"]
  },
  Alesund: {
    days: "2",
    type: "coast",
    highlights: ["Aksla viewpoint", "Art Nouveau centre", "harbour", "Atlantic Sea-Park", "city walk"],
    food: ["harbour seafood", "city centre cafes", "bakery breakfast"],
    stay: ["Sentrum", "harbour area", "near Brosundet"],
    pack: ["wind jacket", "camera", "comfortable shoes", "warm layer"]
  },
  Sarpsborg: {
    days: "1-2",
    type: "historic",
    highlights: {
      no: ["Sarpefossen", "Kulåsparken", "Borgarsyssel Museum", "Tunevannet", "Gamlebyen i Fredrikstad"],
      en: ["Sarpefossen waterfall", "Kulasparken", "Borgarsyssel Museum", "Tunevannet lake", "Old Town Fredrikstad"],
      ru: ["водопад Sarpefossen", "парк Kulåsparken", "музей Borgarsyssel", "озеро Tunevannet", "старый город Fredrikstad"]
    },
    food: {
      no: ["kafe i sentrum", "bakeri til frokost", "enkel lunsj ved torget"],
      en: ["city centre cafe", "bakery breakfast", "simple lunch near the square"],
      ru: ["кафе в центре", "завтрак в пекарне", "простой ланч рядом с площадью"]
    },
    stay: {
      no: ["sentrum", "nær Sarpsborg stasjon", "rolig hotellområde mot Tunevannet"],
      en: ["city centre", "near Sarpsborg station", "quiet hotel area toward Tunevannet"],
      ru: ["центр города", "рядом со станцией Sarpsborg", "спокойный район ближе к Tunevannet"]
    },
    pack: {
      no: ["komfortable sko", "lett jakke", "vannflaske", "telefonlader"],
      en: ["comfortable shoes", "light jacket", "water bottle", "phone charger"],
      ru: ["удобная обувь", "лёгкая куртка", "бутылка воды", "зарядка для телефона"]
    }
  },
  Fredrikstad: {
    days: "1-2",
    type: "historic",
    highlights: {
      no: ["Gamlebyen", "Isegran", "ferge på Glomma", "Kongsten fort", "elvepromenade"],
      en: ["Old Town", "Isegran", "Glomma ferry", "Kongsten Fort", "river promenade"],
      ru: ["Старый город", "Isegran", "паром по Glomma", "форт Kongsten", "променад у реки"]
    },
    food: {
      no: ["kafe i Gamlebyen", "bakeri", "enkel restaurant ved elven"],
      en: ["Old Town cafe", "bakery", "simple riverside restaurant"],
      ru: ["кафе в Старом городе", "пекарня", "простой ресторан у реки"]
    },
    stay: {
      no: ["sentrum", "Gamlebyen", "nær elvepromenaden"],
      en: ["city centre", "Old Town", "near the river promenade"],
      ru: ["центр", "Старый город", "рядом с променадом у реки"]
    },
    pack: {
      no: ["komfortable sko", "vindjakke", "kamera", "vannflaske"],
      en: ["comfortable shoes", "wind jacket", "camera", "water bottle"],
      ru: ["удобная обувь", "ветровка", "камера", "бутылка воды"]
    }
  }
};

const profileText = {
  ru: {
    capital: {
      morning: "Начни с центра и главной достопримечательности, потом иди пешком к набережной.",
      day: "Днём выбери музей или парк, чтобы не перегружать день.",
      evening: "Вечером лучше район с кафе и прогулкой у воды.",
      activity: "Городская прогулка, музеи, видовые точки и спокойный вечер."
    },
    fjord: {
      morning: "Начни рано: погода у фьордов меняется быстро.",
      day: "Днём поднимись на обзорную точку или возьми короткий fjord trip.",
      evening: "Вечером оставь время на центр и еду рядом с водой.",
      activity: "Фьорды, видовые площадки, старый город и прогулки."
    },
    arctic: {
      morning: "Утром лучше закрыть городские места, пока светло.",
      day: "Днём сделай видовую точку или тур за город.",
      evening: "Вечером проверь шанс северного сияния или выбери уютное кафе.",
      activity: "Арктический город, виды, природа и вечерние туры."
    },
    historic: {
      morning: "Начни с исторического центра и главного собора.",
      day: "Днём прогуляйся по старым улицам и зайди в кафе.",
      evening: "Вечером выбери район у воды или спокойный ресторан.",
      activity: "История, архитектура, кафе и короткие прогулки."
    },
    coast: {
      morning: "Начни с набережной и старой части города.",
      day: "Днём выбери прогулку, музей или короткий выезд на природу.",
      evening: "Вечером лучше еда у гавани и лёгкая прогулка.",
      activity: "Море, виды, городские прогулки и лёгкий хайкинг."
    }
  },
  en: {
    capital: {
      morning: "Start in the centre and walk toward the waterfront.",
      day: "Pick one museum or park so the day stays easy.",
      evening: "Spend the evening around cafes and the harbour.",
      activity: "City walks, museums, viewpoints and a relaxed evening."
    },
    fjord: {
      morning: "Start early because fjord weather can change fast.",
      day: "Go to a viewpoint or take a short fjord trip.",
      evening: "Keep the evening for the old town and food near the water.",
      activity: "Fjords, viewpoints, old streets and walking."
    },
    arctic: {
      morning: "Do city sights in the morning while the light is good.",
      day: "Use the afternoon for a viewpoint or a nature tour.",
      evening: "Check northern lights chances or choose a warm cafe.",
      activity: "Arctic city life, views, nature and evening tours."
    },
    historic: {
      morning: "Start with the historic centre and the main cathedral.",
      day: "Walk old streets and make a cafe stop.",
      evening: "Choose a waterfront area or a calm restaurant.",
      activity: "History, architecture, cafes and short walks."
    },
    coast: {
      morning: "Start by the harbour and the older streets.",
      day: "Choose a walk, museum or short nature trip.",
      evening: "Finish with harbour food and an easy walk.",
      activity: "Sea views, city walks and light hiking."
    }
  }
};

profileText.no = {
  capital: {
    morning: "Start i sentrum og gå videre mot havnepromenaden.",
    day: "Velg ett museum eller én park, slik at du får god tid på hvert sted.",
    evening: "Avslutt dagen med middag og en rolig tur langs vannet.",
    activity: "Byvandring, museer, utsiktspunkter og en rolig kveld."
  },
  fjord: {
    morning: "Start tidlig, siden været ved fjordene kan skifte raskt.",
    day: "Ta turen til et utsiktspunkt eller bli med på et kort fjordcruise.",
    evening: "Sett av kvelden til gamlebyen og et måltid nær vannet.",
    activity: "Fjorder, utsiktspunkter, historiske gater og fine gåturer."
  },
  arctic: {
    morning: "Besøk attraksjonene i byen mens dagslyset er best.",
    day: "Bruk ettermiddagen på et utsiktspunkt eller en tur ut i naturen.",
    evening: "Sjekk nordlysvarselet, eller finn en hyggelig kafé dersom været er dårlig.",
    activity: "Arktisk byliv, utsikt, natur og kveldsturer."
  },
  historic: {
    morning: "Begynn i det historiske sentrum og besøk byens viktigste kirke eller festning.",
    day: "Gå gjennom de gamle gatene og legg inn en pause på kafé.",
    evening: "Velg et område ved vannet eller en rolig restaurant.",
    activity: "Historie, arkitektur, kafeer og korte gåturer."
  },
  coast: {
    morning: "Start ved havna og utforsk den eldste delen av byen.",
    day: "Velg mellom en byvandring, et museum eller en kort tur ut i naturen.",
    evening: "Avslutt med sjømat ved havna og en rolig kveldstur.",
    activity: "Havutsikt, byvandring og en lett fottur."
  }
};

const fallbackProfile = {
  days: "1-2",
  type: "coast",
  highlights: {
    no: ["sentrum", "utsiktspunkt", "kort bytur", "lokalt museum", "park"],
    en: ["city centre", "viewpoint", "short city walk", "local museum", "park"],
    ru: ["центр города", "смотровая точка", "короткая прогулка", "местный музей", "парк"]
  },
  food: {
    no: ["lokal kafe", "lunsj fra matbutikk", "enkel restaurant"],
    en: ["local cafe", "grocery lunch", "simple restaurant"],
    ru: ["местное кафе", "ланч из магазина", "простой ресторан"]
  },
  stay: {
    no: ["sentrum", "nær stasjonen", "rolig hotellområde"],
    en: ["city centre", "near the station", "quiet hotel area"],
    ru: ["центр города", "рядом со станцией", "спокойный район с отелями"]
  },
  pack: {
    no: ["komfortable sko", "jakke", "vannflaske", "lader"],
    en: ["comfortable shoes", "jacket", "water bottle", "charger"],
    ru: ["удобная обувь", "куртка", "бутылка воды", "зарядка"]
  }
};

const weatherCodeText = {
  ru: {
    0: "ясно",
    1: "почти ясно",
    2: "переменная облачность",
    3: "облачно",
    45: "туман",
    48: "туман",
    51: "морось",
    61: "дождь",
    63: "дождь",
    65: "сильный дождь",
    71: "снег",
    73: "снег",
    75: "сильный снег",
    80: "ливни",
    95: "гроза"
  },
  en: {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "cloudy",
    45: "fog",
    48: "fog",
    51: "drizzle",
    61: "rain",
    63: "rain",
    65: "heavy rain",
    71: "snow",
    73: "snow",
    75: "heavy snow",
    80: "showers",
    95: "thunderstorm"
  }
};

weatherCodeText.no = {
  0: "klart",
  1: "for det meste klart",
  2: "delvis skyet",
  3: "overskyet",
  45: "tåke",
  48: "tåke",
  51: "yr",
  61: "regn",
  63: "regn",
  65: "kraftig regn",
  71: "snø",
  73: "snø",
  75: "kraftig snø",
  80: "regnbyger",
  95: "tordenvær"
};

const listTranslations = {
  ru: {
    morning: "Утро",
    day: "День",
    evening: "Вечер",
    activity: "Чем заняться",
    culture: "Культура и настроение",
    habits: "Местные привычки",
    useful: "Полезно знать",
    map: "Где это",
    mapAria: "Карта города {city}",
    openMap: "Открыть карту",
    mapHint: "Нажми на место или кафе, чтобы показать путь.",
    routeLoading: "Строим путь...",
    routeFromCurrent: "Путь от твоего положения.",
    routeFromCenter: "Путь от центра города.",
    routeFallback: "Точный маршрут недоступен, показываем направление.",
    routeError: "Не удалось найти это место сейчас.",
    mapExpand: "Развернуть карту",
    mapCollapse: "Свернуть карту",
    food: "Где поесть",
    pack: "Что взять",
    stay: "Где остановиться",
    places: "Куда сходить",
    days: "{days} дня",
    weatherLoading: "Загружаем погоду...",
    weatherError: "Погода сейчас недоступна, но план можно использовать.",
    weatherNoData: "Погода пока без точных данных.",
    today: "Сейчас",
    you: "Вы здесь",
    wind: "Ветер",
    rain: "Осадки"
  },
  en: {
    morning: "Morning",
    day: "Day",
    evening: "Evening",
    activity: "What to do",
    culture: "Culture and mood",
    habits: "Local habits",
    useful: "Good to know",
    map: "Where it is",
    mapAria: "Map of {city}",
    openMap: "Open map",
    mapHint: "Click a place or cafe to show the route.",
    routeLoading: "Building route...",
    routeFromCurrent: "Route from your position.",
    routeFromCenter: "Route from the city centre.",
    routeFallback: "Exact route is unavailable, showing direction.",
    routeError: "Could not find this place right now.",
    mapExpand: "Expand map",
    mapCollapse: "Collapse map",
    food: "Where to eat",
    pack: "What to bring",
    stay: "Where to stay",
    places: "Where to go",
    days: "{days} days",
    weatherLoading: "Loading weather...",
    weatherError: "Weather is unavailable right now, but the plan still works.",
    weatherNoData: "Weather data is incomplete right now.",
    today: "Now",
    you: "You are here",
    wind: "Wind",
    rain: "Rain"
  }
};

listTranslations.no = {
  morning: "Morgen",
  day: "På dagtid",
  evening: "Kveld",
  activity: "Dette kan du gjøre",
  culture: "Byliv og atmosfære",
  habits: "Lokale vaner",
  useful: "Greit å vite",
  map: "Finn frem",
  mapAria: "Kart over {city}",
  openMap: "Åpne kartet",
  mapHint: "Velg et sted eller en kafé for å vise veien.",
  routeLoading: "Finner veien …",
  routeFromCurrent: "Rute fra posisjonen din.",
  routeFromCenter: "Rute fra sentrum.",
  routeFallback: "Vi fant ikke en detaljert rute, men viser retningen.",
  routeError: "Vi finner ikke dette stedet akkurat nå.",
  mapExpand: "Vis større kart",
  mapCollapse: "Lukk stort kart",
  food: "Mat og drikke",
  pack: "Dette bør du ta med",
  stay: "Områder å bo i",
  places: "Steder å besøke",
  days: "{days} dager",
  weatherLoading: "Henter værmeldingen …",
  weatherError: "Værmeldingen er ikke tilgjengelig akkurat nå. Resten av guiden kan fortsatt brukes.",
  weatherNoData: "Værmeldingen mangler noen opplysninger akkurat nå.",
  today: "Nå",
  you: "Du er her",
  wind: "Vind",
  rain: "Nedbør"
};

const detailedGuides = {
  Oslo: {
    intro: "To rolige bydager der de fleste stoppene bindes sammen til fots eller med kort kollektivtur.",
    days: [
      { title: "Bjørvika og havnepromenaden", distance: "5,1 km til fots", duration: "ca. 7 timer", stops: [["09:30", "Frokost i Bjørvika"], ["10:30", "Operahuset – gå på taket"], ["11:30", "Deichman Bjørvika"], ["13:00", "Lunsj ved Barcode"], ["14:30", "MUNCH eller Akershus festning"], ["17:00", "Havnepromenaden til Aker Brygge"]] },
      { title: "Parker og vestkanten", distance: "4,4 km + trikk", duration: "ca. 6 timer", stops: [["10:00", "Vigelandsparken"], ["12:00", "Lunsj på Majorstuen"], ["13:30", "Frogner eller Bygdøy"], ["16:30", "Kaffe i sentrum"]] }
    ],
    places: [
      { name: "Operahuset", query: "Opera House", description: "Arkitektur, fjordutsikt og en gratis tur på taket.", distance: "1 km fra sentrum", duration: "45–75 min", price: "Gratis ute", rain: "Delvis", tags: ["history", "family"], source: "https://operaen.no/" },
      { name: "MUNCH", query: "MUNCH", description: "Kunstmuseum i Bjørvika; et godt valg når det regner.", distance: "1,2 km", duration: "2–3 t", price: "Billett", rain: "Ja", tags: ["history", "family"], source: "https://www.munchmuseet.no/" },
      { name: "Vigelandsparken", query: "Vigeland Park", description: "Stor skulpturpark som er åpen hele døgnet.", distance: "4 km", duration: "1,5–2 t", price: "Gratis", rain: "Nei", tags: ["nature", "family"], source: "https://www.visitoslo.com/no/attraksjon/vigelandsparken/" }
    ]
  },
  Bergen: {
    intro: "En kompakt plan rundt Bryggen, havna og utsikten fra Fløyen, med et innendørs alternativ ved regn.",
    days: [
      { title: "Bryggen og Fløyen", distance: "4,0 km til fots", duration: "ca. 7 timer", stops: [["09:30", "Frokost ved Vågen"], ["10:30", "Bryggen og de smale passasjene"], ["12:00", "Fisketorget"], ["13:30", "Lunsj"], ["15:00", "Fløibanen og tur på Fløyen"], ["18:00", "Tilbake til sentrum"]] },
      { title: "KODE og Nordnes", distance: "5,3 km til fots", duration: "ca. 6 timer", stops: [["10:00", "KODE kunstmuseer"], ["12:30", "Lunsj ved Lille Lungegårdsvann"], ["14:00", "Gå mot Nordnes"], ["16:30", "Kaffe ved Vågen"]] }
    ],
    places: [
      { name: "Bryggen", query: "Bryggen", description: "Det historiske havnekvartalet og Bergens mest særpregede byrom.", distance: "700 m", duration: "1–2 t", price: "Gratis ute", rain: "Delvis", tags: ["history", "food"], source: "https://en.visitbergen.com/things-to-do/bryggen-in-bergen-p878553" },
      { name: "Fløibanen", query: "Floibanen", description: "Rask vei opp til utsikt og korte turstier over byen.", distance: "850 m", duration: "1,5–3 t", price: "Billett", rain: "Delvis", tags: ["nature", "family"], source: "https://www.floyen.no/" },
      { name: "KODE", query: "KODE Bergen", description: "Kunst, design og komponisthjem; egner seg særlig på regnværsdager.", distance: "600 m", duration: "2–3 t", price: "Billett", rain: "Ja", tags: ["history", "family"], source: "https://www.kodebergen.no/" }
    ]
  },
  Tromso: {
    intro: "Sentrum kan oppleves til fots. Fjellheisen og Ishavskatedralen krever buss eller en lengre spasertur over brua.",
    days: [
      { title: "Sentrum og polarhistorie", distance: "3,6 km til fots", duration: "ca. 6 timer", stops: [["10:00", "Polarmuseet"], ["12:00", "Lunsj i Storgata"], ["13:30", "Havnepromenaden"], ["15:00", "Polaria"], ["17:30", "Middag i sentrum"]] },
      { title: "Tromsdalen og utsikten", distance: "2,8 km + buss", duration: "ca. 5 timer", stops: [["10:30", "Buss til Ishavskatedralen"], ["11:00", "Ishavskatedralen"], ["12:30", "Lunsj"], ["14:00", "Fjellheisen"], ["17:00", "Retur til sentrum"]] }
    ],
    places: [
      { name: "Polaria", query: "Polaria", description: "Arktisk opplevelsessenter og akvarium, godt egnet for familier og regn.", distance: "900 m", duration: "1,5–2 t", price: "Billett", rain: "Ja", tags: ["family", "nature"], source: "https://www.polaria.no/" },
      { name: "Polarmuseet", query: "Polarmuseet", description: "Kompakt museum om ekspedisjoner, fangst og livet i Arktis.", distance: "650 m", duration: "1–1,5 t", price: "Billett", rain: "Ja", tags: ["history", "family"], source: "https://uit.no/tmu/polarmuseet" },
      { name: "Fjellheisen", query: "Fjellheisen", description: "Taubane til Storsteinen med vid utsikt over Tromsø og fjellene.", distance: "4 km", duration: "2–3 t", price: "Billett", rain: "Nei", tags: ["nature", "family"], source: "https://www.fjellheisen.no/" }
    ]
  },
  Stavanger: {
    intro: "Første dag holder seg i sentrum. Preikestolen er en egen heldagstur utenfor Stavanger og krever værforbehold.",
    days: [
      { title: "Gamle Stavanger og Vågen", distance: "4,3 km til fots", duration: "ca. 7 timer", stops: [["09:30", "Gamle Stavanger"], ["11:00", "Norsk oljemuseum"], ["13:00", "Lunsj ved Vågen"], ["14:30", "Øvre Holmegate"], ["16:00", "Valbergtårnet og havna"]] },
      { title: "Preikestolen", distance: "ca. 8 km fottur", duration: "heldag", outside: "Utenfor byen – sjekk buss/ferje og vær før avreise.", stops: [["07:30", "Avreise fra Stavanger"], ["10:00", "Start fotturen"], ["12:00", "Preikestolen"], ["15:00", "Retur fra startpunktet"], ["18:00", "Tilbake i Stavanger"]] }
    ],
    places: [
      { name: "Gamle Stavanger", query: "Old Stavanger", description: "Hvite trehus og små gater vest for Vågen.", distance: "700 m", duration: "1–1,5 t", price: "Gratis", rain: "Nei", tags: ["history", "family"], source: "https://www.regionstavanger.com/" },
      { name: "Norsk oljemuseum", query: "Norwegian Petroleum Museum", description: "Moderne museum om energi, teknologi og norsk oljehistorie.", distance: "650 m", duration: "2 t", price: "Billett", rain: "Ja", tags: ["history", "family"], source: "https://www.norskolje.museum.no/" },
      { name: "Preikestolen", query: "Preikestolen", description: "Fjelltur utenfor byen; krevende ved dårlig vær og ikke en sentrumsattraksjon.", distance: "utenfor Stavanger", duration: "heldag", price: "Transport", rain: "Nei", tags: ["nature"], source: "https://www.visitnorway.com/places-to-go/fjord-norway/the-stavanger-region/listings-stavanger/preikestolen/185743/", outside: true }
    ]
  },
  Trondheim: {
    intro: "Den historiske kjernen er kompakt: Nidarosdomen, Gamle Bybro og Bakklandet fungerer godt som én sammenhengende tur.",
    days: [
      { title: "Det historiske Trondheim", distance: "4,5 km til fots", duration: "ca. 7 timer", stops: [["09:30", "Nidarosdomen"], ["11:30", "Erkebispegården"], ["13:00", "Lunsj i Bakklandet"], ["14:30", "Gamle Bybro"], ["15:30", "Kristiansten festning"], ["17:30", "Solsiden"]] },
      { title: "Havna og nyere historie", distance: "4 km til fots", duration: "ca. 5 timer", stops: [["10:00", "Rockheim"], ["12:30", "Lunsj på Solsiden"], ["14:00", "Havnepromenaden"], ["16:00", "Torvet"]] }
    ],
    places: [
      { name: "Nidarosdomen", query: "Nidaros Cathedral", description: "Norges nasjonalhelligdom og byens viktigste historiske stopp.", distance: "900 m", duration: "1–2 t", price: "Billett inne", rain: "Ja", tags: ["history"], source: "https://www.nidarosdomen.no/" },
      { name: "Bakklandet", query: "Bakklandet", description: "Trehus, små kafeer og en rolig gate langs Nidelva.", distance: "1 km", duration: "1–2 t", price: "Gratis", rain: "Delvis", tags: ["history", "food"], source: "https://visittrondheim.no/" },
      { name: "Rockheim", query: "Rockheim", description: "Interaktivt museum for norsk populærmusikk.", distance: "1,3 km", duration: "2 t", price: "Billett", rain: "Ja", tags: ["history", "family", "nightlife"], source: "https://rockheim.no/" }
    ]
  },
  Sarpsborg: {
    intro: "Første dag foregår i Sarpsborg. Dag to er tydelig merket som en utflukt til nabobyen Fredrikstad.",
    days: [
      { title: "Sentrum i Sarpsborg", distance: "4,2 km til fots", duration: "ca. 7 timer", stops: [["09:30", "Frokost i sentrum"], ["10:30", "Borgarsyssel Museum"], ["13:00", "Lunsj"], ["14:30", "Kulåsparken"], ["17:00", "Sarpefossen"]] },
      { title: "Utflukt til Gamlebyen i Fredrikstad", distance: "3,5 km til fots", duration: "ca. 6 timer", outside: "Utenfor Sarpsborg – omtrent 20 minutter med tog til Fredrikstad, deretter buss eller gange.", stops: [["09:30", "Tog fra Sarpsborg"], ["10:30", "Gamlebyen i Fredrikstad"], ["13:00", "Lunsj i Gamlebyen"], ["14:30", "Gratis byferge til Isegran"], ["16:30", "Retur til Sarpsborg"]] }
    ],
    places: [
      { name: "Borgarsyssel Museum", query: "Borgarsyssel Museum", description: "Bymuseum med middelalderruiner og historie fra Østfold.", distance: "1 km", duration: "1,5–2 t", price: "Sjekk sesong", rain: "Delvis", tags: ["history", "family"], source: "https://ostfoldmuseene.no/borgarsyssel/" },
      { name: "Kulåsparken", query: "Kulasparken", description: "Grønn park nær sentrum, egnet for en rolig pause eller piknik.", distance: "700 m", duration: "45–90 min", price: "Gratis", rain: "Nei", tags: ["nature", "family"], source: "https://www.sarpsborg.com/" },
      { name: "Gamlebyen i Fredrikstad", query: "Gamlebyen i Fredrikstad", description: "Festningsby i nabobyen Fredrikstad – dette er en utflukt, ikke et sted i Sarpsborg.", distance: "ca. 20 min med tog", duration: "4–6 t", price: "Gratis ute", rain: "Delvis", tags: ["history", "food", "family"], source: "https://www.visitfredrikstadhvaler.com/no/attraksjon/gamlebyen-i-fredrikstad", outside: true, routeCity: "Fredrikstad" }
    ]
  },
  Fredrikstad: {
    intro: "En byplan rundt Gamlebyen, elva og den gratis byferga. De sentrale stoppene kan kombineres uten bil.",
    days: [
      { title: "Gamlebyen og Isegran", distance: "4,0 km til fots + ferge", duration: "ca. 7 timer", stops: [["09:30", "Gamlebyen"], ["11:30", "Kongsten fort"], ["13:00", "Lunsj"], ["14:30", "Gratis byferge"], ["15:00", "Isegran"], ["17:00", "Bryggepromenaden"]] },
      { title: "Elva og sentrum", distance: "5 km til fots", duration: "ca. 6 timer", stops: [["10:00", "Fredrikstad Museum"], ["12:00", "Ferge til sentrum"], ["13:00", "Lunsj"], ["14:30", "Bibliotekparken"], ["16:00", "Kråkerøy og elvepromenaden"]] }
    ],
    places: [
      { name: "Gamlebyen i Fredrikstad", query: "Gamlebyen i Fredrikstad", description: "En levende festningsby med voller, gallerier og små serveringssteder.", distance: "2 km fra stasjonen", duration: "3–4 t", price: "Gratis ute", rain: "Delvis", tags: ["history", "food", "family"], source: "https://www.visitfredrikstadhvaler.com/no/attraksjon/gamlebyen-i-fredrikstad" },
      { name: "Isegran", query: "Isegran", description: "Historisk øy med maritime miljøer, nådd med gratis byferge.", distance: "kort fergetur", duration: "1–2 t", price: "Gratis", rain: "Nei", tags: ["history", "nature"], source: "https://www.visitfredrikstadhvaler.com/no/" },
      { name: "Fredrikstad Museum", query: "Fredrikstad Museum", description: "Lokalhistorie i Gamlebyen og et godt stopp i ustabilt vær.", distance: "i Gamlebyen", duration: "1–1,5 t", price: "Billett", rain: "Ja", tags: ["history", "family"], source: "https://ostfoldmuseene.no/fredrikstad/" }
    ]
  }
};

const featuredCities = ["Oslo", "Bergen", "Tromso", "Stavanger", "Trondheim", "Sarpsborg", "Fredrikstad"];
const selectedPlaces = new Set();
const citySelect = document.getElementById("thingsCitySelect");
const citySearch = document.getElementById("thingsCitySearch");
const daysInput = document.getElementById("thingsDays");
const dateInput = document.getElementById("thingsDate");
const dateField = document.querySelector(".things-date-field");
const dateTrigger = document.getElementById("thingsDateTrigger");
const dateCalendar = document.getElementById("thingsDateCalendar");
const budgetInput = document.getElementById("thingsBudget");
const carInput = document.getElementById("thingsCar");
const addToTripButton = document.getElementById("thingsAddToTrip");
const planSummary = document.getElementById("thingsPlanSummary");
const cityTitle = document.getElementById("thingsCityTitle");
const daysBadge = document.getElementById("thingsDaysBadge");
const content = document.getElementById("thingsContent");
const weather = document.getElementById("thingsWeather");
const weatherCache = new Map();
let miniMap = null;
let miniMapMarkers = [];
let activeCity = "Oslo";

function guideLabel(text) { return guideText(text, getLanguage()); }

function syncGuideControls() {
  document.querySelectorAll("#thingsDaysLabel, #thingsDateLabel, #thingsBudgetLabel, #thingsBudget option, .things-check span, .things-interests legend, .things-interests label span, #thingsAddToTrip").forEach(el => {
    el.dataset.guideOriginal ||= el.textContent;
    el.textContent = guideLabel(el.dataset.guideOriginal);
  });
  citySearch.placeholder = guideLabel("Søk etter by");
  citySearch.setAttribute("aria-label", citySearch.placeholder);
  document.querySelector(".things-trip-controls").setAttribute("aria-label", guideLabel("Tilpass turen"));
  Array.from(daysInput.options).forEach(option => { option.textContent = dayCount(option.value, getLanguage()); });
  citySelect.querySelectorAll("optgroup").forEach(group => {
    group.dataset.guideOriginal ||= group.label;
    group.label = guideLabel(group.dataset.guideOriginal);
  });
}

function localText(key, values = {}) {
  const language = getLanguage();
  const template = listTranslations[language]?.[key] || listTranslations.en[key] || key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function getProfile(city) {
  return cityProfiles[city] || fallbackProfile;
}

function getProfileCopy(type) {
  const language = getLanguage();
  return profileText[language]?.[type] || profileText.en[type] || profileText.en.coast;
}

function getCityInsightCopy(type) {
  const language = getLanguage();
  return cityInsightText[language]?.[type] || cityInsightText.en[type] || cityInsightText.en.coast;
}

function getLocalizedList(value) {
  const language = getLanguage();

  if (Array.isArray(value)) {
    return value.map((item) => phraseTranslations[language]?.[item] || item);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return value[language] || value.en || Object.values(value).find(Array.isArray) || [];
}

function getRoutableList(value) {
  const language = getLanguage();

  if (Array.isArray(value)) {
    return value.map((item) => ({
      label: phraseTranslations[language]?.[item] || item,
      query: item
    }));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const labels = value[language] || value.en || Object.values(value).find(Array.isArray) || [];
  const queries = value.en || labels;
  return labels.map((label, index) => ({ label, query: queries[index] || label }));
}

function fillCitySelect(query = "", preferredValue = citySelect.value || "Oslo") {
  const normalizedQuery = normalizeLookup(query);
  const cities = placeGroups.flatMap((group) => group.items);
  const matches = cities.filter((city) => normalizeLookup(city.label).includes(normalizedQuery));
  const popular = matches.filter((city) => featuredCities.includes(city.value));
  const others = matches.filter((city) => !featuredCities.includes(city.value));
  citySelect.innerHTML = [
    popular.length ? `<optgroup label="Populære byer">${popular.map(renderCityOption).join("")}</optgroup>` : "",
    others.length ? `<optgroup label="Andre byer">${others.map(renderCityOption).join("")}</optgroup>` : ""
  ].join("");
  if (matches.some((city) => city.value === preferredValue)) citySelect.value = preferredValue;
  else if (matches[0]) citySelect.value = matches[0].value;
}

function renderCityOption(city) {
  return `<option value="${escapeHtml(city.value)}">${escapeHtml(city.label)}</option>`;
}

function getCitiesWithoutWeatherCoordinates() {
  return placeGroups
    .flatMap((group) => group.items)
    .filter((city) => !getPlaceCenter(city.value));
}

function renderCityPlan(city) {
  const guide = detailedGuides[city];
  if (guide) {
    renderDetailedCityPlan(city, guide);
    return;
  }
  const profile = getProfile(city);
  const copy = getProfileCopy(profile.type);
  const insight = getCityInsightCopy(profile.type);
  activeCity = city;
  cityTitle.textContent = getPlaceLabel(city);
  daysBadge.textContent = dayCount(profile.days, getLanguage());
  planSummary.textContent = guideLabel("En konkret plan med tider, transport og kostnader.");
  content.innerHTML = `
    ${renderInfoCard(localText("morning"), copy.morning)}
    ${renderInfoCard(localText("day"), copy.day)}
    ${renderInfoCard(localText("evening"), copy.evening)}
    ${renderListCard(localText("activity"), [copy.activity])}
    ${renderInfoCard(localText("culture"), insight.culture)}
    ${renderInfoCard(localText("habits"), insight.habits)}
    ${renderInfoCard(localText("useful"), insight.useful)}
    ${renderListCard(localText("places"), getRoutableList(profile.highlights), "place")}
    ${renderListCard(localText("food"), getRoutableList(profile.food), "food")}
    ${renderListCard(localText("stay"), getLocalizedList(profile.stay))}
    ${renderListCard(localText("pack"), getLocalizedList(profile.pack))}
  `;
  renderMiniMap(city);
}

function renderDetailedCityPlan(city, guide) {
  const days = Number(daysInput.value || 2);
  const selectedInterests = getSelectedInterests();
  const orderedPlaces = [...guide.places].sort((a, b) => scorePlace(b, selectedInterests) - scorePlace(a, selectedInterests));
  const planDays = Array.from({ length: days }, (_, index) => guide.days[index] || createFlexibleDay(city, orderedPlaces, index));
  activeCity = city;
  cityTitle.textContent = getPlaceLabel(city);
  daysBadge.textContent = dayCount(days, getLanguage());
  planSummary.textContent = guideLabel(guide.intro);
  content.innerHTML = `
    <section class="things-itinerary" aria-label="Plan dag for dag">
      ${planDays.map((day, index) => renderItineraryDay(day, index)).join("")}
    </section>
    <section class="things-place-section">
      <div class="things-section-heading"><p class="things-section-label">${guideLabel("Velg steder")}</p><h3>${guideLabel("Steder som passer interessene dine")}</h3></div>
      <div class="things-place-grid">${orderedPlaces.map(renderPlaceCard).join("")}</div>
    </section>
  `;
  renderMiniMap(city);
  updateUrl(city);
}

function getSelectedInterests() {
  return [...document.querySelectorAll('[name="thingsInterest"]:checked')].map((input) => input.value);
}

function scorePlace(place, selectedInterests) {
  return place.tags.filter((tag) => selectedInterests.includes(tag)).length;
}

function createFlexibleDay(city, places, index) {
  const place = places[index % places.length];
  return {
    title: `${getLanguage() === "ru" ? "Свободный день:" : getLanguage() === "en" ? "Flexible day in" : "Fleksibel dag i"} ${getPlaceLabel(city)}`,
    distance: "Tilpasses underveis",
    duration: "4–6 timer",
    stops: [["10:00", place.name], ["12:30", "Lunsj i sentrum"], ["14:00", "Tid til egne valg"], ["16:00", "Rolig avslutning"]]
  };
}

function renderItineraryDay(day, index) {
  return `
    <article class="things-day-card">
      <div class="things-day-top"><div><span>${getLanguage() === "ru" ? "День" : getLanguage() === "en" ? "Day" : "Dag"} ${index + 1}</span><h3>${escapeHtml(guideLabel(day.title))}</h3></div></div>
      ${day.outside ? `<p class="things-outside-note"><strong>${guideLabel("Utenfor valgt by")}:</strong> ${escapeHtml(guideLabel(day.outside))}</p>` : ""}
      <ol class="things-timeline">${day.stops.map(([time, title]) => `<li><time>${escapeHtml(time)}</time><span>${escapeHtml(guideLabel(title))}</span></li>`).join("")}</ol>
      <div class="things-day-meta"><span>↗ ${escapeHtml(guideLabel(day.distance))}</span><span>◷ ${escapeHtml(guideLabel(day.duration))}</span></div>
    </article>`;
}

function renderPlaceCard(place) {
  const key = `${activeCity}|${place.name}`;
  const added = selectedPlaces.has(key);
  return `
    <article class="things-place-card${place.outside ? " is-outside" : ""}">
      <div class="things-place-visual" aria-hidden="true"><span>${place.tags.includes("nature") ? "⌁" : "⌂"}</span></div>
      <div class="things-place-body">
        ${place.outside ? `<span class="things-location-tag">${guideLabel("Utenfor valgt by")}</span>` : ""}
        <h4>${escapeHtml(place.name)}</h4><p>${escapeHtml(guideLabel(place.description))}</p>
        <dl><div><dt>${guideLabel("Avstand")}</dt><dd>${escapeHtml(guideLabel(place.distance))}</dd></div><div><dt>${guideLabel("Tid")}</dt><dd>${escapeHtml(guideLabel(place.duration))}</dd></div><div><dt>${guideLabel("Pris")}</dt><dd>${escapeHtml(guideLabel(place.price))}</dd></div><div><dt>${guideLabel("Passer i regn")}</dt><dd>${escapeHtml(guideLabel(place.rain))}</dd></div></dl>
        <div class="things-place-actions">
          <button type="button" class="secondary-btn" data-route-place="${escapeHtml(place.query)}" data-route-type="place" data-route-city="${escapeHtml(place.routeCity || activeCity)}">${guideLabel("Vis på kartet")}</button>
          <button type="button" class="primary-btn" data-add-place="${escapeHtml(place.name)}">${guideLabel(added ? "Lagt til ✓" : "Legg til i ruten")}</button>
          <a href="${escapeHtml(place.source)}" target="_blank" rel="noopener">${guideLabel("Offisiell kilde")} ↗</a>
        </div>
      </div>
    </article>`;
}

function renderMiniMap(city) {
  const center = getPlaceCenter(city);
  const label = getPlaceLabel(city);
  const existingMap = document.getElementById("thingsMiniMap");
  const weather = document.getElementById("thingsWeather");

  if (miniMap) {
    miniMap.remove();
    miniMap = null;
    miniMapMarkers = [];
  }

  document.body.classList.remove("things-map-open");

  if (existingMap) {
    existingMap.remove();
  }

  if (!center || !weather) {
    return;
  }

  weather.insertAdjacentHTML(
    "beforebegin",
    `
      <div id="thingsMiniMap" class="things-mini-map">
        <button id="thingsMiniMapToggle" type="button" class="things-mini-map-toggle" aria-expanded="false">
          ${localText("mapExpand")}
        </button>
        <div id="thingsMiniMapCanvas" class="things-mini-map-canvas" role="img" aria-label="${escapeHtml(localText("mapAria", { city: label }))}"></div>
        <div class="things-mini-map-caption">
          <strong>${escapeHtml(label)}</strong>
          <small id="thingsRouteStatus">${localText("mapHint")}</small>
        </div>
      </div>
    `
  );
  initMiniMap(center, label);
}

function renderInfoCard(title, text) {
  return `
    <article class="things-info-card">
      <h3>${escapeHtml(guideLabel(title))}</h3>
      <p>${escapeHtml(text)}</p>
    </article>
  `;
}

function renderListCard(title, items, routeType = "") {
  return `
    <article class="things-info-card">
      <h3>${escapeHtml(guideLabel(title))}</h3>
      <ul>
        ${items.map((item) => renderListItem(item, routeType)).join("")}
      </ul>
    </article>
  `;
}

function renderListItem(item, routeType) {
  const label = typeof item === "object" ? item.label : item;
  const query = typeof item === "object" ? item.query : item;

  if (!routeType) {
    return `<li>${escapeHtml(label)}</li>`;
  }

  return `
    <li>
      <button type="button" class="things-route-link" data-route-place="${escapeHtml(query)}" data-route-type="${routeType}">
        ${escapeHtml(label)}
      </button>
    </li>
  `;
}

function initMiniMap(center, label) {
  if (!isMapRendererAvailable()) {
    return;
  }

  miniMap = createInteractiveMap({
    container: "thingsMiniMapCanvas",
    styleKey: "streets",
    center,
    zoom: 11,
    attributionControl: false,
    interactive: true
  });
  miniMap.addControl(createNavigationControl({ showCompass: false }), "top-right");
  miniMap.on("load", () => {
    setMiniMapMarkers([{ coordinates: center, color: "#2563eb", title: label }]);
  });
}

function setMiniMapMarkers(markers) {
  miniMapMarkers.forEach((marker) => marker.remove());
  miniMapMarkers = [];

  if (!miniMap || !isMapRendererAvailable()) {
    return;
  }

  miniMapMarkers = markers.map((marker) =>
    createMapMarker({ color: marker.color })
      .setLngLat(marker.coordinates)
      .setPopup(createPopup({ offset: 18 }).setText(marker.title))
      .addTo(miniMap)
  );
}

function setRouteStatus(key) {
  const status = document.getElementById("thingsRouteStatus");
  if (status) {
    status.textContent = localText(key);
  }
}

function setMiniMapExpanded(isExpanded) {
  const mapWrap = document.getElementById("thingsMiniMap");
  const toggle = document.getElementById("thingsMiniMapToggle");

  if (!mapWrap || !toggle) {
    return;
  }

  mapWrap.classList.toggle("is-expanded", isExpanded);
  document.body.classList.toggle("things-map-open", isExpanded);
  toggle.setAttribute("aria-expanded", String(isExpanded));
  toggle.textContent = localText(isExpanded ? "mapCollapse" : "mapExpand");

  window.setTimeout(() => {
    miniMap?.resize();
  }, 80);
}

function toggleMiniMapExpanded() {
  const mapWrap = document.getElementById("thingsMiniMap");
  setMiniMapExpanded(!mapWrap?.classList.contains("is-expanded"));
}

async function showRouteToPlace(placeName, routeType, targetCity = activeCity) {
  const cityCenter = getPlaceCenter(activeCity);

  if (!miniMap || !cityCenter) {
    return;
  }

  setRouteStatus("routeLoading");
  setMiniMapExpanded(true);

  try {
    const destination = await geocodePlace(placeName, routeType, getPlaceCenter(targetCity) || cityCenter, targetCity);

    if (!destination) {
      setRouteStatus("routeError");
      return;
    }

    const { coordinates, label } = destination;
    const userPosition = await getNearbyUserCoordinates(cityCenter);
    const start = userPosition || cityCenter;
    const route = await fetchMapboxRoute(start, coordinates);
    await waitForMiniMapReady();

    if (!miniMap) {
      return;
    }

    if (route) {
      drawMiniMapRoute(route.geometry.coordinates);
      setRouteStatus(userPosition ? "routeFromCurrent" : "routeFromCenter");
    } else {
      drawMiniMapRoute([start, coordinates]);
      setRouteStatus("routeFallback");
    }

    setMiniMapMarkers([
      { coordinates: start, color: userPosition ? "#16a34a" : "#2563eb", title: userPosition ? localText("you") : getPlaceLabel(activeCity) },
      { coordinates, color: "#dc2626", title: phraseTranslations[getLanguage()]?.[label] || label }
    ]);
    fitMiniMapToCoordinates(route?.geometry?.coordinates || [start, coordinates]);
  } catch {
    setRouteStatus("routeError");
  }
}

async function geocodePlace(placeName, routeType, cityCenter, targetCity = activeCity) {
  const knownPlace = getKnownPlace(targetCity, placeName);

  if (knownPlace) {
    return knownPlace;
  }

  const categoryHint = routeType === "food" ? "food cafe restaurant" : "attraction";
  const query = `${placeName} ${categoryHint} ${getPlaceLabel(targetCity)} Norway`;
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("country", "no");
  url.searchParams.set("limit", "1");
  url.searchParams.set("proximity", cityCenter.join(","));
  url.searchParams.set("bbox", createSearchBbox(cityCenter).join(","));
  url.searchParams.set("types", "poi,address");

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  const feature = data.features?.[0];

  if (!response.ok || !feature?.center) {
    return null;
  }

  return {
    coordinates: feature.center,
    label: feature.text || placeName
  };
}

function createSearchBbox(center) {
  const [lng, lat] = center;
  const offset = 0.18;
  return [lng - offset, lat - offset, lng + offset, lat + offset];
}

function getKnownPlace(city, placeName) {
  return knownPlaceCoordinates[`${normalizeLookup(city)}|${normalizeLookup(placeName)}`] || null;
}

function normalizeLookup(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

async function getNearbyUserCoordinates(cityCenter) {
  const coordinates = await getUserCoordinates();

  if (!coordinates) {
    return null;
  }

  return getDistanceKm(coordinates, cityCenter) <= 35 ? coordinates : null;
}

function getDistanceKm(from, to) {
  const earthRadiusKm = 6371;
  const fromLat = toRadians(from[1]);
  const toLat = toRadians(to[1]);
  const latDelta = toRadians(to[1] - from[1]);
  const lngDelta = toRadians(to[0] - from[0]);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
  return Number(value) * Math.PI / 180;
}

function getUserCoordinates() {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.longitude, position.coords.latitude]),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 4500, maximumAge: 60000 }
    );
  });
}

function waitForMiniMapReady() {
  if (!miniMap) {
    return Promise.resolve();
  }

  if (miniMap.loaded()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    miniMap.once("load", resolve);
  });
}

async function fetchMapboxRoute(start, destination) {
  const coordinates = `${start.join(",")};${destination.join(",")}`;
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}`);
  url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.routes?.[0]?.geometry?.coordinates?.length) {
    return null;
  }

  return data.routes[0];
}

function drawMiniMapRoute(coordinates) {
  const routeData = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates
    },
    properties: {}
  };

  if (miniMap.getSource("things-route")) {
    miniMap.getSource("things-route").setData(routeData);
    return;
  }

  miniMap.addSource("things-route", {
    type: "geojson",
    data: routeData
  });
  miniMap.addLayer({
    id: "things-route-line",
    type: "line",
    source: "things-route",
    layout: {
      "line-cap": "round",
      "line-join": "round"
    },
    paint: {
      "line-color": "#2563eb",
      "line-width": 4,
      "line-opacity": 0.9
    }
  });
}

function fitMiniMapToCoordinates(coordinates) {
  const bounds = coordinates.reduce(
    (box, coordinate) => box.extend(coordinate),
    createLngLatBounds(coordinates[0], coordinates[0])
  );

  miniMap.fitBounds(bounds, { padding: 34, maxZoom: 14, duration: 600 });
}

async function loadWeather(city) {
  const center = getPlaceCenter(city);

  if (!center) {
    weather.innerHTML = `<p class="things-muted">${localText("weatherError")}</p>`;
    return;
  }

  if (weatherCache.has(city)) {
    renderWeather(weatherCache.get(city));
    return;
  }

  weather.innerHTML = `<p class="things-muted">${localText("weatherLoading")}</p>`;

  try {
    const [lng, lat] = center;
    const data = await fetchWeatherData(lat, lng);

    weatherCache.set(city, data);
    renderWeather(data);
  } catch (error) {
    weather.innerHTML = `<p class="things-muted">${localText("weatherError")}</p>`;
  }
}

async function fetchWeatherData(lat, lng) {
  try {
    const response = await fetch(`/api/weather?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, {
      headers: { Accept: "application/json" }
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok && hasWeatherData(data)) {
      return data;
    }
  } catch {
    // Fall back to Open-Meteo when the hosted API is not available.
  }

  const directUrl = createOpenMeteoUrl(lat, lng);
  const response = await fetch(directUrl.toString(), { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !hasWeatherData(data)) {
    throw new Error(data.reason || "Weather failed");
  }

  return data;
}

function createOpenMeteoUrl(lat, lng) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "5");
  return url;
}

function hasWeatherData(data) {
  return Boolean(data?.current || data?.daily);
}

function renderWeather(data) {
  const current = data.current || {};
  const daily = data.daily || {};
  const code = Number(current.weather_code ?? daily.weather_code?.[0]);
  const description = Number.isFinite(code)
    ? weatherCodeText[getLanguage()]?.[code] || weatherCodeText.en[code] || localText("weatherNoData")
    : localText("weatherNoData");
  const temp = Number(current.temperature_2m);
  const wind = Number(current.wind_speed_10m);
  const days = Array.isArray(daily.time) ? daily.time.slice(0, 5) : [];

  if (!Number.isFinite(temp) && !days.length) {
    weather.innerHTML = `<p class="things-muted">${localText("weatherNoData")}</p>`;
    return;
  }

  weather.innerHTML = `
    <div class="things-current-weather">
      <span>${localText("today")}</span>
      <strong>${Number.isFinite(temp) ? `${Math.round(temp)}°C` : "-"}</strong>
      <p>${description}</p>
      <small>${localText("wind")}: ${Number.isFinite(wind) ? `${Math.round(wind)} km/h` : "-"}</small>
    </div>
    <div class="things-weather-days">
      ${days.map((day, index) => renderWeatherDay(day, daily, index)).join("")}
    </div>
  `;
}

function renderWeatherDay(day, daily, index) {
  const min = Math.round(Number(daily.temperature_2m_min?.[index]));
  const max = Math.round(Number(daily.temperature_2m_max?.[index]));
  const rain = Number(daily.precipitation_sum?.[index]);
  const code = Number(daily.weather_code?.[index]);
  const description = weatherCodeText[getLanguage()]?.[code] || weatherCodeText.en[code] || "";

  return `
    <div class="things-weather-day">
      <strong>${formatDay(day)}</strong>
      <span>${Number.isFinite(min) && Number.isFinite(max) ? `${min} / ${max}°C` : "-"}</span>
      <small>${description}</small>
      <small>${localText("rain")}: ${Number.isFinite(rain) ? `${rain.toFixed(1)} mm` : "-"}</small>
    </div>
  `;
}

function formatDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const locale = getLanguage() === "ru" ? "ru-RU" : getLanguage() === "no" ? "nb-NO" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

async function renderPage() {
  syncGuideControls();
  const city = citySelect.value || "Oslo";
  document.title = t("things.pageTitle");
  renderCityPlan(city);
  await loadWeather(city);
}

function updateUrl(city) {
  const url = new URL(window.location.href);
  url.searchParams.set("city", city);
  url.searchParams.set("days", daysInput.value);
  url.searchParams.set("date", dateInput.value);
  url.searchParams.set("car", carInput.checked ? "1" : "0");
  url.searchParams.set("budget", budgetInput.value);
  const interests = getSelectedInterests();
  if (interests.length) url.searchParams.set("interests", interests.join(","));
  else url.searchParams.delete("interests");
  history.replaceState({}, "", url);
}

function initializePreferences() {
  const params = new URLSearchParams(window.location.search);
  const city = params.get("city") || "Oslo";
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateInput.min = localToday;
  dateInput.value = params.get("date") || localToday;
  daysInput.value = ["1", "2", "3"].includes(params.get("days")) ? params.get("days") : "2";
  budgetInput.value = ["low", "medium", "comfortable"].includes(params.get("budget")) ? params.get("budget") : "medium";
  carInput.checked = params.get("car") === "1";
  const interests = (params.get("interests") || "history,nature").split(",");
  document.querySelectorAll('[name="thingsInterest"]').forEach((input) => { input.checked = interests.includes(input.value); });
  fillCitySelect("", city);
}

function openSelectedCityInPlanner() {
  const city = citySelect.value || "Oslo";
  const days = Number(daysInput.value || 2);
  const startDate = dateInput.value;
  const end = new Date(`${startDate}T12:00:00`);
  end.setDate(end.getDate() + Math.max(0, days - 1));
  const endDate = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const budgetByLevel = { low: 3000, medium: 6000, comfortable: 11000 };
  storePlannerDraft({
    start: city === "Oslo" ? "Bergen" : "Oslo",
    end: city,
    startDate,
    endDate,
    budget: budgetByLevel[budgetInput.value] || 6000,
    people: 1,
    carRentalEnabled: carInput.checked,
    manualStops: []
  });
  window.location.href = `planner.html?city=${encodeURIComponent(city)}&days=${days}`;
}

initializePreferences();
enhanceSelectMenu(citySelect);
enhanceSelectMenu(daysInput);
enhanceSelectMenu(budgetInput);
const thingsDatePicker = createDateRangePicker({
  fields: [{
    key: "date",
    field: dateField,
    input: dateInput,
    trigger: dateTrigger,
    calendar: dateCalendar,
    layerRoot: document.querySelector(".things-trip-controls")
  }],
  startKey: "date",
  endKey: "dateEnd",
  getLanguage,
  onChange: renderPage
});
initLanguageSelector();
await updateAuthNav();
await getCurrentUser();
const citiesWithoutWeather = getCitiesWithoutWeatherCoordinates();
if (citiesWithoutWeather.length) {
  console.warn(
    "Cities without weather coordinates:",
    citiesWithoutWeather.map((city) => `${city.label} (${city.value})`).join(", ")
  );
}
await renderPage();

citySelect.addEventListener("change", renderPage);
citySearch.addEventListener("input", () => {
  fillCitySelect(citySearch.value, citySelect.value);
  if (citySelect.value) renderPage();
});
[daysInput, dateInput, budgetInput, carInput, ...document.querySelectorAll('[name="thingsInterest"]')]
  .forEach((control) => control.addEventListener("change", renderPage));
addToTripButton.addEventListener("click", openSelectedCityInPlanner);
document.addEventListener("languagechange", renderPage);
document.addEventListener("languagechange", () => thingsDatePicker.sync());
content.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-place]");
  if (addButton) {
    const key = `${activeCity}|${addButton.dataset.addPlace}`;
    if (selectedPlaces.has(key)) selectedPlaces.delete(key);
    else selectedPlaces.add(key);
    renderCityPlan(activeCity);
    return;
  }
  const routeButton = event.target.closest("[data-route-place]");

  if (!routeButton) {
    return;
  }

  showRouteToPlace(routeButton.dataset.routePlace, routeButton.dataset.routeType, routeButton.dataset.routeCity || activeCity);
});
document.addEventListener("click", (event) => {
  const toggle = event.target.closest("#thingsMiniMapToggle");
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();
    toggleMiniMapExpanded();
    return;
  }

  const mapWrap = event.target.closest("#thingsMiniMap");
  if (mapWrap && !mapWrap.classList.contains("is-expanded")) {
    setMiniMapExpanded(true);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMiniMapExpanded(false);
  }
});

