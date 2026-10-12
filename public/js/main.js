import { initMap, drawRoute, redrawRouteFromCurrentLocation, findCitiesAlongCurrentRoute, findStoresForCity, findStoresAlongRoute, findHotelsForCity, focusStoreOnMap, clearActiveMapFocus, setMapStyle, findPlaceInCity, updateUserLocationOnMap, getRouteNavigationSnapshot, findTrafficSignalsAlongCurrentRoute, resizePlannerMap } from "./map.js?v=traffic-signals-3";
import { getPublicRoutes, saveTrip, updateAuthNav } from "./auth.js?v=reliability-1";
import { formatCurrencyFromNok, initCurrencySelector } from "./currency.js?v=planner-errors-1";
import { getLanguage, initLanguageSelector, t } from "./i18n.js?v=author-1";
import { GOOGLE_MAPS_STATIC_API_KEY, getPlaceCenter } from "./mapbox-config.js";
import { createTripPlan } from "./planner.js?v=reliability-1";
import { extraReadyRoutes } from "./ready-routes-data.js";
import { getRouteRecommendations } from "./recommendations.js?v=doc-fixes-1";
import { consumePlannerDraft, routeToPlannerDraft } from "./planner-transfer.js";
import { initPlannerDatePickers, syncPlannerDatePickers } from "./planner-date-picker.js?v=shared-ui-3";
import {
  applyFormValues,
  getFormValues,
  renderSummary,
  renderError,
  renderTripPlan,
  setDefaultDates,
  renderRecommendations,
  syncBudgetInputCurrency,
  initPlacePickers,
  updateBudgetLabel
} from "./ui.js?v=reliability-1";

const CAR_RENTAL_URL = "https://www.hyre.no/en/flesland/";
const mealTexts = {
  tourSandwich: {
    no: { name: "Sandwich for tur", ingredients: ["brod", "skinke eller ost", "smor", "tomat", "vann"] },
    en: { name: "Trip sandwich", ingredients: ["bread", "ham or cheese", "butter", "tomato", "water"] },
    ru: { name: "Сэндвич в дорогу", ingredients: ["хлеб", "ветчина или сыр", "масло", "помидор", "вода"] }
  },
  yoghurtFruit: {
    no: { name: "Yoghurt og frukt", ingredients: ["yoghurt", "banan", "eple", "musli"] },
    en: { name: "Yoghurt and fruit", ingredients: ["yoghurt", "banana", "apple", "muesli"] },
    ru: { name: "Йогурт и фрукты", ingredients: ["йогурт", "банан", "яблоко", "мюсли"] }
  },
  hotelDinner: {
    no: { name: "Kveldsmat pa hotell", ingredients: ["salatmix", "kokte egg", "brod", "juice"] },
    en: { name: "Light hotel dinner", ingredients: ["salad mix", "boiled eggs", "bread", "juice"] },
    ru: { name: "Лёгкий ужин в отеле", ingredients: ["салатная смесь", "варёные яйца", "хлеб", "сок"] }
  },
  oatmeal: {
    no: { name: "Varm havregrot", ingredients: ["havregryn", "melk", "banan", "honning"] },
    en: { name: "Warm oatmeal", ingredients: ["oats", "milk", "banana", "honey"] },
    ru: { name: "Тёплая овсянка", ingredients: ["овсянка", "молоко", "банан", "мёд"] }
  },
  wrap: {
    no: { name: "Wrap pa farten", ingredients: ["tortillalefser", "kylling", "salat", "ost"] },
    en: { name: "Wrap on the go", ingredients: ["tortillas", "chicken", "salad", "cheese"] },
    ru: { name: "Ролл с собой", ingredients: ["тортилья", "курица", "салат", "сыр"] }
  },
  thermosMeal: {
    no: { name: "Termos-mat", ingredients: ["suppekopp", "brod", "frukt", "varm drikke"] },
    en: { name: "Thermos meal", ingredients: ["cup soup", "bread", "fruit", "hot drink"] },
    ru: { name: "Еда в термос", ingredients: ["суп в стакане", "хлеб", "фрукты", "горячий напиток"] }
  },
  pastaSalad: {
    no: { name: "Enkel pastasalat", ingredients: ["ferdig pasta", "kylling", "mais", "paprika"] },
    en: { name: "Simple pasta salad", ingredients: ["ready pasta", "chicken", "corn", "pepper"] },
    ru: { name: "Простой салат с пастой", ingredients: ["готовая паста", "курица", "кукуруза", "перец"] }
  },
  hotelBreakfast: {
    no: { name: "Frokost pa hotell", ingredients: ["yoghurt", "brod", "palegg", "appelsinjuice"] },
    en: { name: "Hotel breakfast", ingredients: ["yoghurt", "bread", "spread", "orange juice"] },
    ru: { name: "Завтрак в отеле", ingredients: ["йогурт", "хлеб", "намазка", "апельсиновый сок"] }
  },
  carSnacks: {
    no: { name: "Snacks til bilen", ingredients: ["notter", "banan", "vann", "proteinbar"] },
    en: { name: "Car snacks", ingredients: ["nuts", "banana", "water", "protein bar"] },
    ru: { name: "Перекус в машину", ingredients: ["орехи", "банан", "вода", "протеиновый батончик"] }
  },
  toastFruit: {
    no: { name: "Toast og frukt", ingredients: ["brod", "ost", "skinke", "eple"] },
    en: { name: "Toast and fruit", ingredients: ["bread", "cheese", "ham", "apple"] },
    ru: { name: "Тост и фрукты", ingredients: ["хлеб", "сыр", "ветчина", "яблоко"] }
  },
  saladBox: {
    no: { name: "Enkel salatboks", ingredients: ["salat", "tunfisk", "mais", "agurk"] },
    en: { name: "Simple salad box", ingredients: ["salad", "tuna", "corn", "cucumber"] },
    ru: { name: "Простой салат-бокс", ingredients: ["салат", "тунец", "кукуруза", "огурец"] }
  },
  yoghurtEvening: {
    no: { name: "Kvelds med yoghurt", ingredients: ["yoghurt", "musli", "baer", "vann"] },
    en: { name: "Evening yoghurt", ingredients: ["yoghurt", "muesli", "berries", "water"] },
    ru: { name: "Йогурт на вечер", ingredients: ["йогурт", "мюсли", "ягоды", "вода"] }
  },
  roadSandwich: {
    no: { name: "Sandwich pa veien", ingredients: ["brod", "ost eller skinke", "smor", "frukt"] },
    en: { name: "Road sandwich", ingredients: ["bread", "cheese or ham", "butter", "fruit"] },
    ru: { name: "Сэндвич в пути", ingredients: ["хлеб", "сыр или ветчина", "масло", "фрукты"] }
  },
  lightHotelBreakfast: {
    no: { name: "Lett hotellfrokost", ingredients: ["yoghurt", "banan", "musli", "juice"] },
    en: { name: "Light hotel breakfast", ingredients: ["yoghurt", "banana", "muesli", "juice"] },
    ru: { name: "Лёгкий завтрак в отеле", ingredients: ["йогурт", "банан", "мюсли", "сок"] }
  },
  easySnacks: {
    no: { name: "Enkle snacks", ingredients: ["notter", "proteinbar", "vann", "eple"] },
    en: { name: "Simple snacks", ingredients: ["nuts", "protein bar", "water", "apple"] },
    ru: { name: "Простые перекусы", ingredients: ["орехи", "протеиновый батончик", "вода", "яблоко"] }
  }
};

const grocerySuggestions = {
  Bergen: ["tourSandwich", "yoghurtFruit", "hotelDinner"],
  Tromso: ["oatmeal", "wrap", "thermosMeal"],
  "Tromsø": ["oatmeal", "wrap", "thermosMeal"],
  Stavanger: ["pastaSalad", "hotelBreakfast", "carSnacks"],
  Trondheim: ["toastFruit", "saladBox", "yoghurtEvening"],
  default: ["roadSandwich", "lightHotelBreakfast", "easySnacks"]
};

const readyRouteTemplates = [
  {
    title: "Oslo → Bergen",
    days: 5,
    budget: "12000-18000 NOK",
    stops: ["Drammen", "Geilo", "Voss"],
    info: {
      no: "Klassisk fjellrute med stopp jevnt fordelt mellom Oslo og Bergen.",
      en: "Classic mountain route with stops evenly spread between Oslo and Bergen.",
      ru: "Классический горный маршрут с равномерными остановками между Осло и Бергеном."
    },
    plannerData: { start: "Oslo", end: "Bergen", budget: 15000 }
  },
  {
    title: "Oslo → Bergen",
    days: 10,
    budget: "22000-32000 NOK",
    stops: ["Drammen", "Notodden", "Geilo", "Voss"],
    info: {
      no: "Lengre variant med mer tid til fjell, daler og små avstikkere.",
      en: "Longer version with more time for mountains, valleys and small detours.",
      ru: "Более длинный вариант: горы, долины и небольшие отклонения от пути."
    },
    plannerData: { start: "Oslo", end: "Bergen", budget: 26000 }
  },
  {
    title: "Fredrikstad → Bergen",
    days: 7,
    budget: "17000-26000 NOK",
    stops: ["Tønsberg", "Notodden", "Odda"],
    info: {
      no: "Starter i Østfold, følger sør- og innlandsveier, og går videre mot vestlandsnatur.",
      en: "Starts in Østfold, follows southern and inland roads, then moves toward western nature.",
      ru: "Старт из Østfold, южные и внутренние дороги, затем западная природа."
    },
    plannerData: { start: "Fredrikstad", end: "Bergen", budget: 21000 }
  },
  {
    title: "Oslo → Trondheim",
    days: 5,
    budget: "12000-19000 NOK",
    stops: ["Hamar", "Lillehammer", "Oppdal"],
    info: {
      no: "Rolig innlandsrute med bystopp, dalfører og fjell før Trondheim.",
      en: "Calm inland route with city stops, valleys and mountains before Trondheim.",
      ru: "Спокойный внутренний маршрут: города, долины и горы перед Trondheim."
    },
    plannerData: { start: "Oslo", end: "Trondheim", budget: 15000 }
  },
  {
    title: "Kristiansand → Stavanger",
    days: 4,
    budget: "10000-16000 NOK",
    stops: ["Flekkefjord", "Egersund"],
    info: {
      no: "Kort sørvest-rute med kystbyer og passe avstand mellom stoppene.",
      en: "Short southwest route with coastal towns and comfortable spacing.",
      ru: "Короткий маршрут на юго-запад с прибрежными городами и удобными расстояниями."
    },
    plannerData: { start: "Kristiansand", end: "Stavanger", budget: 13000 }
  },
  {
    title: "Bergen → Trondheim",
    days: 6,
    budget: "16000-24000 NOK",
    stops: ["Førde", "Ålesund", "Molde"],
    info: {
      no: "Vestlandsrute med fjordfølelse, kystbyer og rolige etapper.",
      en: "Western Norway route with fjord feeling, coastal towns and relaxed stages.",
      ru: "Маршрут по западной Норвегии: фьорды, прибрежные города и спокойные этапы."
    },
    plannerData: { start: "Bergen", end: "Trondheim", budget: 19000 }
  },
  {
    title: "Bodø → Tromsø",
    days: 6,
    budget: "16000-25000 NOK",
    stops: ["Svolvær", "Narvik", "Harstad"],
    info: {
      no: "Nordnorsk rute med Lofoten-stemning, fjell og byer fordelt gjennom turen.",
      en: "Northern route with Lofoten mood, mountains and cities spread through the trip.",
      ru: "Северный маршрут: настроение Lofoten, горы и города по всей поездке."
    },
    plannerData: { start: "Bodo", end: "Tromso", budget: 20000 }
  },
  {
    title: "Oslo → Tromsø",
    days: 10,
    budget: "28000-42000 NOK",
    stops: ["Lillehammer", "Trondheim", "Mosjøen", "Narvik"],
    info: {
      no: "Lang roadtrip gjennom store deler av Norge, med stopp fordelt gjennom hele reisen.",
      en: "Long road trip through much of Norway, with stops spread across the whole journey.",
      ru: "Большой roadtrip через значительную часть Норвегии с остановками по всей дороге."
    },
    plannerData: { start: "Oslo", end: "Tromso", budget: 34000 }
  }
];
const cityGuides = {
  Oslo: {
    intro: "Storby med fjord, museer og korte turmuligheter.",
    places: [
      { name: "Operahuset", text: "Gå opp på taket og se byen og fjorden." },
      { name: "Vigelandsparken", text: "Stor park med skulpturer og rolig spasertur." },
      { name: "Bygdøy", text: "Fint område for museum eller en rolig ettermiddag." }
    ]
  },
  Drammen: {
    intro: "Kort stopp med elv, utsikt og enkel byvandring.",
    places: [
      { name: "Spiralen", text: "Kjør eller gå opp for utsikt over byen." },
      { name: "Elvepromenaden", text: "Fin og enkel tur langs vannet." },
      { name: "Drammensbadet-området", text: "Rolig område om du vil strekke på beina." }
    ]
  },
  Bergen: {
    intro: "Klassisk vestlandsby med fjell, havn og smågater.",
    places: [
      { name: "Bryggen", text: "Historisk område som er raskt og fint å se." },
      { name: "Fløibanen", text: "Kort tur opp for utsikt og frisk luft." },
      { name: "Fisketorget", text: "Bra for en kort pause midt i sentrum." }
    ]
  },
  Voss: {
    intro: "Liten fjellby med natur, vann og rolig sentrum.",
    places: [
      { name: "Vangsvatnet", text: "Fin spasertur nær vannet og enkel pause." },
      { name: "Voss Gondol", text: "Rask vei til utsikt om været er bra." },
      { name: "Sentrum", text: "Kort stopp for kaffe, bakeri og lokal stemning." }
    ]
  },
  Stavanger: {
    intro: "By med gamle gater, havn og korte utsiktsturer.",
    places: [
      { name: "Gamle Stavanger", text: "Små hvite hus og en rask fotopause." },
      { name: "Vaagen", text: "Enkel promenade ved havnen." },
      { name: "Sverd i fjell", text: "Kort stopp ved et kjent landemerke." }
    ]
  },
  Trondheim: {
    intro: "Studentby med elv, kirke og hyggelig sentrum.",
    places: [
      { name: "Nidarosdomen", text: "Den mest kjente bygningen i byen." },
      { name: "Gamle Bybro", text: "Kort og fin fotopause ved elven." },
      { name: "Bakklandet", text: "Koselig område for en rolig spasertur." }
    ]
  },
  Tromso: {
    intro: "Nordlig by med utsikt, natur og arktisk stemning.",
    places: [
      { name: "Fjellheisen", text: "Bra utsiktspunkt når været er klart." },
      { name: "Ishavskatedralen", text: "Kjent stopp som er raskt å besøke utenfra." },
      { name: "Polaria", text: "Fint kort stopp for familie og innendørs pause." }
    ]
  },
  "Tromsø": {
    intro: "Nordlig by med utsikt, natur og arktisk stemning.",
    places: [
      { name: "Fjellheisen", text: "Bra utsiktspunkt når været er klart." },
      { name: "Ishavskatedralen", text: "Kjent stopp som er raskt å besøke utenfra." },
      { name: "Polaria", text: "Fint kort stopp for familie og innendørs pause." }
    ]
  },
  Geilo: {
    intro: "Lite fjellsted som passer godt for en kort pause.",
    places: [
      { name: "Geilo sentrum", text: "Enkel stopp for mat og luft." },
      { name: "Geilojordet", text: "Rolig område for en kort spasertur." },
      { name: "Ustaoset-retning", text: "Fin natur om du bare vil se landskapet." }
    ]
  },
  Kongsberg: {
    intro: "Historisk by som passer godt til en kort pause på veien.",
    places: [
      { name: "Kirkebakken", text: "Rolig område midt i byen." },
      { name: "Laga", text: "Kort stopp langs vannet." },
      { name: "Sølvverk-området", text: "Litt lokal historie uten lang omvei." }
    ]
  },
  default: {
    intro: "Kort stopp med litt lokal stemning og enkel bevegelse.",
    places: [
      { name: "Sentrum", text: "Ta en kort runde og se hovedgata." },
      { name: "Utsiktspunkt", text: "Finn et rolig sted for bilder og luft." },
      { name: "Lokal kafé eller park", text: "Bra for en rask pause før neste etappe." }
    ]
  }
};

const cityGuideDetails = {
  Oslo: {
    history: "Oslo ble grunnlagt i middelalderen, ble flyttet og bygget opp igjen etter branner, og er i dag landets politiske og kulturelle sentrum.",
    culture: "Byen er preget av museer, arkitektur ved fjorden, konserter, design og et aktivt hverdagsliv mellom sentrum og bydelene.",
    activities: "Du kan kombinere korte stopp ved Operaen, Karl Johan, Aker Brygge eller et museum på Bygdøy uten at dagen blir tung.",
    nature: "Oslo er spesiell fordi fjorden, parkene og marka ligger så tett på byen at natur alltid føles nær."
  },
  Drammen: {
    history: "Drammen vokste som elveby med handel, trelast og industri, og byen har lenge vært et viktig knutepunkt inn og ut av Oslo-området.",
    culture: "I dag er stemningen roligere, med promenader, lokale arrangementer og et sentrum som er lett å bruke til korte stopp.",
    activities: "Et kort besøk passer godt til Spiralen, elvepromenaden eller en liten pause i sentrum med kaffe og utsikt.",
    nature: "Høydene rundt byen og elverommet gir mer naturfølelse enn mange forventer så nært hovedstaden."
  },
  Bergen: {
    history: "Bergen var en av Norges viktigste middelalderbyer og et sentralt handelssted i Hansatiden, noe som fortsatt merkes i Bryggen og havnemiljøet.",
    culture: "Byen er kjent for trehus, regn, kunst, musikk og en egen vestlandsk rytme som skiller seg tydelig fra Oslo.",
    activities: "Selv med kort tid rekker du ofte Bryggen, havnen, en liten matpause eller tur med Fløibanen for utsikt.",
    nature: "Byfjellet, sjølukten og nærheten til fjordlandskapet gjør Bergen til en by der naturen nesten alltid er med i opplevelsen."
  },
  Voss: {
    history: "Voss har lenge vært et naturlig stopp mellom fjord og fjell, og stedet er kjent som et tradisjonelt bygde- og aktivitetsknutepunkt.",
    culture: "Her merkes norsk friluftsliv, folkemusikk og en mer lokal rytme enn i storbyene, med sterk tilknytning til dal og fjell.",
    activities: "Byen passer godt for rolige stopp ved vannet, en kort tur i sentrum eller gondol dersom du vil ha utsikt uten lang tidsbruk.",
    nature: "Natur er hovedgrunnen til å stoppe her: vann, dal, fjell og store utsyn ligger tett og gir mye selv på kort besøk."
  },
  Stavanger: {
    history: "Stavanger utviklet seg fra fiskeri og hermetikk til energihovedstad, og den kontrasten preger byen fortsatt.",
    culture: "Gamle Stavanger, havnen, matmiljøet og moderne kunst gir byen en kombinasjon av historie og internasjonalt preg.",
    activities: "Korte besøk fungerer fint med gamlebyen, sentrumshavnen eller et raskt stopp ved Sverd i fjell.",
    nature: "Kyst, vind, lys og nærhet til strender og utsiktspunkter gjør byen luftig selv ved korte opphold."
  },
  Trondheim: {
    history: "Trondheim var tidlig konge- og kirkesenter i Norge, og Nidarosdomen gjør den historiske rollen synlig med en gang du kommer inn i byen.",
    culture: "Byen er også formet av studentliv, teknologi og et sentrum som fortsatt har varme trehusmiljøer og rolig byrytme.",
    activities: "Det er lett å fylle et kort stopp med Nidarosdomen, Bakklandet, broen og en enkel matpause ved elven.",
    nature: "Elvelopet og hoydene rundt byen gir en rolig overgang mellom by og landskap."
  },
  Tromso: {
    history: "Tromso ble et arktisk knutepunkt for fiske, handel, forskning og polarekspedisjoner, og den identiteten sitter fortsatt sterkt i byen.",
    culture: "Her er nordnorsk tone, vinterliv, musikk og arktisk selvforstaelse en tydelig del av opplevelsen.",
    activities: "Korte stopp fungerer godt med Fjellheisen, Ishavskatedralen eller et raskt innendors stopp pa Polaria.",
    nature: "Hav, fjell, broer og skiftende lys gir Tromso en stemning som er annerledes enn resten av landet."
  },
  "TromsÃ¸": {
    history: "Tromso ble et arktisk knutepunkt for fiske, handel, forskning og polarekspedisjoner, og den identiteten sitter fortsatt sterkt i byen.",
    culture: "Her er nordnorsk tone, vinterliv, musikk og arktisk selvforstaelse en tydelig del av opplevelsen.",
    activities: "Korte stopp fungerer godt med Fjellheisen, Ishavskatedralen eller et raskt innendors stopp pa Polaria.",
    nature: "Hav, fjell, broer og skiftende lys gir Tromso en stemning som er annerledes enn resten av landet."
  },
  Geilo: {
    history: "Geilo vokste fram rundt jernbane, fjelltrafikk og senere vintersport, og stedet er fortsatt preget av reisende og fjellferie.",
    culture: "Tempoet er rolig, med hotelltradisjon, hytteliv og tydelig kobling til friluft mer enn klassisk bykultur.",
    activities: "Enkel matpause, en kort runde i sentrum eller en liten luftetur passer fint her uten mye planlegging.",
    nature: "Hoyfjell, vidder, frisk luft og utsyn er selve kjernen i hvorfor Geilo oppleves verdt et stopp."
  },
  Kongsberg: {
    history: "Kongsberg ble bygget opp rundt solvverket og har en tydelig teknisk og industrihistorisk identitet som skiller den fra mange andre byer.",
    culture: "Byen kombinerer eldre bygninger, lokal historie og moderne teknologimiljø på en ganske egen måte.",
    activities: "Et kort stopp kan brukes til sentrum, elverommet og sma glimt av den historiske bystrukturen.",
    nature: "Skog og høydedrag rundt byen gjør at overgangen fra vei til rolig stopp er kort."
  },
  default: {
    history: "Mange norske steder vokste fram rundt handel, havn, jordbruk eller transport, og det merkes ofte i sentrum og gatebildet.",
    culture: "Selv mindre steder har gjerne lokal mat, sma kafeer og en tydelig regional rytme som er lett a kjenne igjen.",
    activities: "Korte stopp fungerer ofte best med sentrum, et utsiktspunkt eller en enkel pause med noe lokalt a spise eller se.",
    nature: "I Norge er naturen nesten alltid nær, enten som vann, skog, fjell eller kyst, og det gir nesten alle steder litt ekstra verdi."
  }
};

const cityGuideTranslations = {
  ru: {
    default: {
      intro: "Короткая остановка с местной атмосферой, прогулкой и простой паузой перед дорогой.",
      history: "Многие норвежские города выросли вокруг торговли, дорог, воды или гор, поэтому их характер хорошо виден даже за короткую остановку.",
      culture: "Обрати внимание на центр, маленькие кафе, местную архитектуру и спокойный ритм города.",
      activities: "Лучше всего выбрать одну-две точки рядом с маршрутом, немного пройтись и не перегружать день.",
      nature: "В Норвегии природа почти всегда рядом: вода, лес, горы или побережье быстро добавляют остановке смысла."
    },
    Oslo: {
      intro: "Большой город у фьорда с музеями, набережной и короткими прогулками.",
      history: "Осло вырос из средневекового города и сегодня является политическим и культурным центром Норвегии.",
      culture: "Здесь много музеев, современной архитектуры у воды, концертов и городских районов с разным настроением.",
      activities: "За короткое время можно посмотреть Оперу, Карл-Юхан, Акер-Брюгге или один музей.",
      nature: "Фьорд, парки и лесные зоны находятся очень близко к центру, поэтому природа ощущается прямо в городе."
    },
    Drammen: {
      intro: "Удобная остановка с рекой, обзорной точкой и простой прогулкой по центру.",
      history: "Драммен развивался как речной торговый и промышленный город рядом с районом Осло.",
      culture: "Сейчас это спокойный город для короткой паузы: набережные, кафе и удобный центр.",
      activities: "Хорошо подойдут Спирален, прогулка вдоль реки или быстрая остановка на кофе.",
      nature: "Река и холмы вокруг города дают больше ощущения природы, чем ожидаешь рядом со столицей."
    },
    Bergen: {
      intro: "Классический город западной Норвегии с горами, гаванью и узкими улицами.",
      history: "Берген был важным торговым городом средневековья, и это до сих пор заметно в районе Брюгген и у гавани.",
      culture: "Город известен деревянными домами, дождём, музыкой, искусством и особым западнонорвежским ритмом.",
      activities: "Даже за короткую остановку можно успеть Брюгген, гавань, Фискоторгет или подъём на Флёйен.",
      nature: "Горы, запах моря и близость фьордов делают Берген городом, где природа всегда рядом."
    },
    Voss: {
      intro: "Небольшой горный город с водой, видами и спокойным центром.",
      history: "Восс давно был удобной точкой между фьордами и горами, поэтому здесь сильна дорожная и туристическая роль.",
      culture: "Чувствуется местная жизнь, активный отдых и связь с долинами и горами.",
      activities: "Подойдёт прогулка у озера, короткий круг по центру или подъём на гондоле ради вида.",
      nature: "Озеро, горы и открытые виды являются главной причиной сделать здесь остановку."
    },
    Stavanger: {
      intro: "Город с гаванью, старым кварталом и быстрыми точками для прогулки.",
      history: "Ставангер прошёл путь от рыболовства и консервной промышленности до нефтяной столицы.",
      culture: "Старый город, гавань, еда и современное искусство смешивают историю с международным настроением.",
      activities: "Для короткого визита подойдут Старый Ставангер, набережная или памятник Sverd i fjell.",
      nature: "Побережье, ветер, свет и близость пляжей делают город открытым и воздушным."
    },
    Trondheim: {
      intro: "Студенческий город с рекой, собором и приятным центром.",
      history: "Тронхейм был важным королевским и церковным центром, что сразу видно по Нидаросскому собору.",
      culture: "Город соединяет студенческую жизнь, технологии, деревянные кварталы и спокойный городской ритм.",
      activities: "Можно быстро посмотреть Нидаросский собор, Баккланнет, Старый мост и сделать паузу у реки.",
      nature: "Река и холмы вокруг дают мягкий переход от города к природе."
    },
    Tromso: {
      intro: "Северный город с арктической атмосферой, видами и близкой природой.",
      history: "Тромсё вырос как арктический центр рыболовства, торговли, науки и полярных экспедиций.",
      culture: "Здесь заметны севернонорвежский характер, зимняя жизнь, музыка и арктическая идентичность.",
      activities: "Хорошо подойдут Фьельхейсен, Арктический собор или короткая indoor-пауза в Polaria.",
      nature: "Море, горы, мосты и меняющийся свет создают совсем другое ощущение, чем на юге страны."
    },
    Geilo: {
      intro: "Горное место для короткой паузы, свежего воздуха и простого отдыха.",
      history: "Гейло вырос вокруг железной дороги, горного туризма и зимнего спорта.",
      culture: "Здесь больше атмосферы отдыха, отелей и природы, чем классической городской культуры.",
      activities: "Подойдут еда, короткий круг по центру или небольшая прогулка без долгого планирования.",
      nature: "Высокогорье, простор и свежий воздух являются главной ценностью остановки."
    },
    Kongsberg: {
      intro: "Исторический город с рекой, старым центром и спокойной остановкой.",
      history: "Конгсберг вырос вокруг серебряных рудников и сохранил сильный промышленно-исторический характер.",
      culture: "Здесь смешаны старые здания, местная история и современные технологические предприятия.",
      activities: "Короткую паузу можно провести в центре, у реки или рядом с историческими местами.",
      nature: "Лес и холмы вокруг города быстро дают ощущение спокойствия после дороги."
    }
  },
  en: {
    default: {
      intro: "A short stop with local atmosphere, an easy walk, and a simple break before the next drive.",
      history: "Many Norwegian places grew around trade, roads, water, or mountains, so their character is visible even on a short stop.",
      culture: "Look for the centre, small cafes, local architecture, and the calm rhythm of the place.",
      activities: "Pick one or two nearby points, walk a little, and keep the day light.",
      nature: "In Norway, nature is usually close: water, forest, mountains, or coast often add value to a stop."
    },
    Bergen: {
      intro: "A classic west-coast city with mountains, harbour life, and narrow streets.",
      history: "Bergen was one of Norway's key medieval trading cities, still visible around Bryggen and the harbour.",
      culture: "The city is known for wooden houses, rain, music, art, and a distinct west-Norwegian rhythm.",
      activities: "With limited time, Bryggen, the harbour, Fisketorget, or Fløibanen are good quick choices.",
      nature: "Mountains, sea air, and nearby fjord landscapes make nature part of the city experience."
    }
  }
};

const guidePlaceTextByLanguage = {
  ru: [
    "Главная точка для короткой остановки, фото и первого впечатления.",
    "Хорошее место для прогулки, вида или спокойной паузы.",
    "Удобная точка перед продолжением маршрута."
  ],
  en: [
    "A good main stop for photos and a first impression.",
    "A useful place for a walk, a view, or a calm break.",
    "An easy point before continuing the route."
  ]
};

let currentTripToSave = null;
let currentRenderState = null;
let currentRecommendations = null;
let currentStoreDrawerState = null;
let currentGuideDrawerState = null;
let currentHotelDrawerState = null;
let publicReadyRoutes = [];
let readyRoutesLoaded = false;
let readySuggestionsCollapsed = false;
let navigationWatchId = null;
let lastNavigationRouteAt = 0;
let lastNavigationRoutePosition = null;

function showPlannerStatus(message, type = "success") {
  const status = document.getElementById("plannerStatus");
  status.textContent = message;
  status.className = `auth-message ${type}`;
}

function readySuggestionText(key, values = {}) {
  const language = getLanguage();
  const dictionary = {
    no: {
      title: "Ferdige ruter som passer",
      loading: "Søker i ferdige ruter...",
      empty: "Ingen ferdige ruter passer helt ennå.",
      intro: "Oppdateres mens du velger start, stopp og mål.",
      compactIntro: "Siste passende forslag vises kompakt.",
      days: "dager",
      stops: "Stopp",
      budget: "Budsjett",
      use: "Bruk rute",
      expand: "Vis mer",
      ready: "Klar",
      published: "Publisert"
    },
    en: {
      title: "Ready routes that match",
      loading: "Searching ready routes...",
      empty: "No ready routes match yet.",
      intro: "Updates while you choose start, stops and destination.",
      compactIntro: "Latest matching ideas stay compact.",
      days: "days",
      stops: "Stops",
      budget: "Budget",
      use: "Use route",
      expand: "Show more",
      ready: "Ready",
      published: "Published"
    },
    ru: {
      title: "Готовые маршруты по твоему вводу",
      loading: "Ищу среди готовых маршрутов...",
      empty: "Пока нет похожих готовых маршрутов.",
      intro: "Обновляется сразу, когда меняешь старт, остановки или финиш.",
      compactIntro: "После создания оставляю 2 последних подходящих варианта.",
      days: "дней",
      stops: "Остановки",
      budget: "Бюджет",
      use: "Использовать",
      expand: "Показать",
      ready: "Готовый",
      published: "Опубликован"
    }
  };
  const text = (dictionary[language] || dictionary.en)[key] || key;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replace(`{${name}}`, value),
    text
  );
}

function normalizeRouteText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getReadyRouteInfo(route) {
  return route.info?.[getLanguage()] || route.info?.en || route.info || "";
}

function getReadyRouteEndpoints(route) {
  if (route.plannerData?.start || route.plannerData?.end) {
    return {
      start: route.plannerData?.start || "",
      end: route.plannerData?.end || ""
    };
  }

  const [start = "", end = ""] = String(route.title || "")
    .split("→")
    .map((part) => part.trim());
  return { start, end };
}

function getReadyRouteBudgetValue(route) {
  const budget = route.plannerData?.budget || route.budget || "";

  if (typeof budget === "number") {
    return budget;
  }

  const values = String(budget).match(/\d+/g);
  if (!values?.length) {
    return 0;
  }

  const numbers = values.map((value) => Number(value));
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function getRenderableReadyRoutes() {
  return [
    ...readyRouteTemplates.concat(extraReadyRoutes).map((route, index) => ({
      ...route,
      id: route.id || `ready-suggestion-${index}`,
      source: "ready"
    })),
    ...publicReadyRoutes.map((route) => ({
      ...route,
      source: "published"
    }))
  ];
}

function scoreReadyRoute(route, formData) {
  const endpoints = getReadyRouteEndpoints(route);
  const start = normalizeRouteText(formData.start);
  const end = normalizeRouteText(formData.end);
  const routeStart = normalizeRouteText(endpoints.start);
  const routeEnd = normalizeRouteText(endpoints.end);
  const routeStops = (route.stops || []).map(normalizeRouteText);
  const manualStops = (formData.manualStops || []).map(normalizeRouteText).filter(Boolean);
  let score = 0;

  if (start && routeStart === start) {
    score += 45;
  } else if (start && [routeStart, ...routeStops].some((item) => item.includes(start) || start.includes(item))) {
    score += 18;
  }

  if (end && routeEnd === end) {
    score += 45;
  } else if (end && [routeEnd, ...routeStops].some((item) => item.includes(end) || end.includes(item))) {
    score += 18;
  }

  manualStops.forEach((stop) => {
    if (routeStops.some((item) => item === stop || item.includes(stop) || stop.includes(item))) {
      score += 14;
    }
  });

  const budget = Number(formData.budget) || 0;
  const routeBudget = getReadyRouteBudgetValue(route);
  if (budget && routeBudget) {
    const difference = Math.abs(routeBudget - budget) / Math.max(routeBudget, budget);
    score += Math.max(0, 18 - Math.round(difference * 30));
  }

  if (route.source === "published") {
    score += 4;
  }

  return score;
}

function getReadyRouteMatches() {
  const formData = getFormValues();
  return getRenderableReadyRoutes()
    .map((route) => ({ route, score: scoreReadyRoute(route, formData) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return String(second.route.publishedAt || "").localeCompare(String(first.route.publishedAt || ""));
    })
    .slice(0, 2)
    .map((item) => item.route);
}

function renderReadyRouteSuggestions() {
  const container = document.getElementById("readyRouteSuggestions");
  if (!container) {
    return;
  }

  positionReadyRouteSuggestions();

  if (!readyRoutesLoaded) {
    container.className = "ready-route-suggestions is-loading";
    container.innerHTML = `<p>${readySuggestionText("loading")}</p>`;
    return;
  }

  const routes = getReadyRouteMatches();
  container.className = `ready-route-suggestions${readySuggestionsCollapsed ? " is-collapsed" : ""}`;

  if (!routes.length) {
    container.innerHTML = `
      <div class="ready-suggestions-header">
        <div>
          <h3>${readySuggestionText("title")}</h3>
          <p>${readySuggestionText("empty")}</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="ready-suggestions-header">
      <div>
        <h3>${readySuggestionText("title")}</h3>
        <p>${readySuggestionsCollapsed ? readySuggestionText("compactIntro") : readySuggestionText("intro")}</p>
      </div>
      ${
        readySuggestionsCollapsed
          ? `<button type="button" class="secondary-button ready-suggestions-expand">${readySuggestionText("expand")}</button>`
          : ""
      }
    </div>
    <div class="ready-suggestions-list">
      ${routes
        .map((route) => {
          const sourceLabel = route.source === "published"
            ? readySuggestionText("published")
            : readySuggestionText("ready");
          return `
            <article class="ready-suggestion-card">
              <div class="ready-suggestion-main">
                <div class="route-card-header">
                  <h4>${route.title}</h4>
                  <span class="route-source-pill">${sourceLabel}</span>
                </div>
                <p class="ready-suggestion-info">${getReadyRouteInfo(route)}</p>
                <p class="ready-suggestion-meta">
                  <strong>${route.days} ${readySuggestionText("days")}</strong>
                  <span>${readySuggestionText("budget")}: ${route.budget}</span>
                </p>
                <p class="ready-suggestion-stops">${readySuggestionText("stops")}: ${(route.stops || []).join(" → ")}</p>
              </div>
              <button type="button" class="ready-suggestion-use" data-ready-route-id="${route.id}">
                ${readySuggestionText("use")}
              </button>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function positionReadyRouteSuggestions() {
  const container = document.getElementById("readyRouteSuggestions");
  const summary = document.getElementById("summary");
  const planActions = document.getElementById("planActions");
  const resultSection = container?.closest(".result-section");

  if (!container || !summary || !planActions || !resultSection) {
    return;
  }

  if (currentRenderState) {
    resultSection.appendChild(container);
    return;
  }

  resultSection.insertBefore(container, summary);
}

async function loadReadyRouteSuggestions() {
  renderReadyRouteSuggestions();

  try {
    const result = await getPublicRoutes();
    publicReadyRoutes = Array.isArray(result.routes) ? result.routes : [];
  } catch (error) {
    console.error(error);
    publicReadyRoutes = [];
  }

  readyRoutesLoaded = true;
  renderReadyRouteSuggestions();
}

async function useReadyRouteSuggestion(routeId) {
  const route = getRenderableReadyRoutes().find((item) => String(item.id) === String(routeId));
  if (!route) {
    return;
  }

  applyFormValues(routeToPlannerDraft(route));
  syncPlannerDatePickers();
  readySuggestionsCollapsed = true;
  renderReadyRouteSuggestions();
  await generatePlan();
}

function handlePlannerFormChanged() {
  readySuggestionsCollapsed = Boolean(currentRenderState);
  renderReadyRouteSuggestions();
}

function setNavigationStatus(message, type = "info") {
  const status = document.getElementById("navigationStatus");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `navigation-status ${type}`;
}

function setTrafficSignalsStatus(message, type = "info") {
  const status = document.getElementById("trafficSignalsStatus");

  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `navigation-note ${type}`;
}

async function loadTrafficSignals() {
  const button = document.getElementById("loadTrafficSignalsBtn");

  if (!currentRenderState?.result) {
    setTrafficSignalsStatus(t("navigation.noRoute"), "error");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = t("navigation.loadingSignals");
  }

  setTrafficSignalsStatus(t("navigation.loadingSignals"), "info");

  try {
    const signals = await findTrafficSignalsAlongCurrentRoute();
    setTrafficSignalsStatus(
      signals.length
        ? t("navigation.signalsFound", { count: signals.length })
        : t("navigation.signalsEmpty"),
      signals.length ? "success" : "warning"
    );
  } catch (error) {
    console.error(error);
    setTrafficSignalsStatus(t("navigation.signalsError"), "warning");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = t("navigation.loadSignals");
    }
  }
}

function formatNavigationDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "-";
  }

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function getNavigationDistanceBetween(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second)) {
    return Number.POSITIVE_INFINITY;
  }

  const [firstLng, firstLat] = first;
  const [secondLng, secondLat] = second;
  const earthRadiusMeters = 6371000;
  const latDelta = (secondLat - firstLat) * Math.PI / 180;
  const lngDelta = (secondLng - firstLng) * Math.PI / 180;
  const firstLatRadians = firstLat * Math.PI / 180;
  const secondLatRadians = secondLat * Math.PI / 180;
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(firstLatRadians) * Math.cos(secondLatRadians) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNavigationWaypoints() {
  const result = currentRenderState?.result;
  if (!result) {
    return [];
  }

  return [
    ...(Array.isArray(result.routeStops) ? result.routeStops : []),
    ...(Array.isArray(result.selectedStops) ? result.selectedStops : []),
    ...(Array.isArray(result.storeStops) ? result.storeStops : []),
    result.end
  ].filter((city, index, cities) => {
    const key = getWaypointKey(city);
    return key && cities.findIndex((item) => getWaypointKey(item) === key) === index;
  });
}

function getWaypointKey(waypoint) {
  if (waypoint && typeof waypoint === "object") {
    return waypoint.id || `${waypoint.name || ""}-${waypoint.address || ""}`;
  }

  return String(waypoint || "").trim();
}

function getWaypointLabel(waypoint) {
  if (waypoint && typeof waypoint === "object") {
    return waypoint.name || waypoint.address || "Stop";
  }

  return String(waypoint || "");
}

function normalizeStoreStop(store, city) {
  return {
    id: store.id || `${store.name}-${store.address}`,
    city,
    name: store.name,
    address: store.address,
    category: store.category || "",
    location: store.location
  };
}

function getRouteWaypointsForMap(result) {
  const routeStops = [...(Array.isArray(result.selectedStops) ? result.selectedStops : [])];
  const storeStops = Array.isArray(result.storeStops) ? result.storeStops : [];

  storeStops.forEach((storeStop) => {
    const cityIndex = routeStops.findIndex((stop) => stop === storeStop.city);
    const insertIndex = cityIndex >= 0 ? cityIndex + 1 : routeStops.length;
    routeStops.splice(insertIndex, 0, storeStop);
  });

  return routeStops.filter((waypoint, index, waypoints) => {
    const key = getWaypointKey(waypoint);
    return key && waypoints.findIndex((item) => getWaypointKey(item) === key) === index;
  });
}

async function redrawCurrentRoute() {
  const result = currentRenderState?.result;
  if (!result) {
    return;
  }

  await drawRoute(result.start, result.end, getRouteWaypointsForMap(result));
}

async function addSelectedStoreStop() {
  if (!currentRenderState?.result || !currentStoreDrawerState) {
    showPlannerStatus(t("status.createFirst"), "error");
    return;
  }

  const selectedStore = currentStoreDrawerState.stores[currentStoreDrawerState.selectedIndex];
  if (!selectedStore?.location) {
    showPlannerStatus(t("store.stopError"), "error");
    return;
  }

  const result = currentRenderState.result;
  const storeStop = normalizeStoreStop(selectedStore, currentStoreDrawerState.city);
  const existingStops = Array.isArray(result.storeStops) ? result.storeStops : [];

  if (!existingStops.some((stop) => getWaypointKey(stop) === getWaypointKey(storeStop))) {
    result.storeStops = [...existingStops, storeStop];
  }

  try {
    await redrawCurrentRoute();
    currentTripToSave = buildTripPayload(result, currentRenderState.formData);
    renderCurrentPlan(result, currentRenderState.formData);
    renderStoreDrawer(
      currentStoreDrawerState.city,
      currentStoreDrawerState.stores,
      currentStoreDrawerState.selectedIndex,
      currentStoreDrawerState.isRouteSearch
    );
    showPlannerStatus(t("store.stopAdded"), "success");
  } catch (error) {
    console.error(error);
    showPlannerStatus(t("store.stopError"), "error");
  }
}

async function removeStoreStop(stopId) {
  const result = currentRenderState?.result;
  if (!result) {
    return;
  }

  result.storeStops = (Array.isArray(result.storeStops) ? result.storeStops : [])
    .filter((stop) => getWaypointKey(stop) !== stopId);

  try {
    await redrawCurrentRoute();
    currentTripToSave = buildTripPayload(result, currentRenderState.formData);
    renderCurrentPlan(result, currentRenderState.formData);
    showPlannerStatus(t("store.stopRemoved"), "success");
  } catch (error) {
    console.error(error);
    showPlannerStatus(t("store.stopError"), "error");
  }
}

function renderNavigationSnapshot(snapshot, accuracy) {
  const stats = document.getElementById("navigationStats");
  const routeDistance = document.getElementById("navigationRouteDistance");
  const nextStop = document.getElementById("navigationNextStop");
  const accuracyText = document.getElementById("navigationAccuracy");

  if (!stats || !routeDistance || !nextStop || !accuracyText) {
    return;
  }

  stats.hidden = false;
  routeDistance.textContent = formatNavigationDistance(snapshot.distanceFromRoute);
  nextStop.textContent = snapshot.nextWaypoint
    ? `${snapshot.nextWaypoint.name} (${formatNavigationDistance(snapshot.nextWaypoint.distance)})`
    : t("navigation.destination");
  accuracyText.textContent = formatNavigationDistance(accuracy);

  setNavigationStatus(
    snapshot.distanceFromRoute <= 200
      ? t("navigation.onRoute")
      : t("navigation.offRoute", { distance: formatNavigationDistance(snapshot.distanceFromRoute) }),
    snapshot.distanceFromRoute <= 200 ? "success" : "warning"
  );
}

function openNavigationWindow() {
  const windowElement = document.getElementById("vipNavigationWindow");
  if (!windowElement) {
    return;
  }

  windowElement.hidden = false;
}

function closeNavigationWindow() {
  const windowElement = document.getElementById("vipNavigationWindow");
  if (!windowElement) {
    return;
  }

  windowElement.hidden = true;
}

function shouldRedrawNavigationRoute(coordinates, snapshot) {
  const now = Date.now();
  const moved = getNavigationDistanceBetween(lastNavigationRoutePosition, coordinates);

  return (
    !lastNavigationRoutePosition
    || now - lastNavigationRouteAt > 25000
    || moved > 250
    || snapshot.distanceFromRoute > 500
  );
}

async function redrawNavigationRouteIfNeeded(coordinates, snapshot) {
  const remainingWaypoints = snapshot.remainingWaypoints?.length
    ? snapshot.remainingWaypoints
    : getNavigationWaypoints();

  if (!remainingWaypoints.length || !shouldRedrawNavigationRoute(coordinates, snapshot)) {
    return snapshot;
  }

  try {
    await redrawRouteFromCurrentLocation(coordinates, remainingWaypoints);
    lastNavigationRouteAt = Date.now();
    lastNavigationRoutePosition = coordinates;
    return getRouteNavigationSnapshot(coordinates, remainingWaypoints) || snapshot;
  } catch (error) {
    console.error(error);
    setNavigationStatus(t("navigation.rerouteError"), "warning");
    return snapshot;
  }
}

function stopVipNavigation(showMessage = true) {
  if (navigationWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(navigationWatchId);
  }

  navigationWatchId = null;
  lastNavigationRouteAt = 0;
  lastNavigationRoutePosition = null;
  const startButton = document.getElementById("startNavigationBtn");
  const stopButton = document.getElementById("stopNavigationBtn");

  if (startButton) startButton.disabled = false;
  if (stopButton) stopButton.hidden = true;

  if (showMessage) {
    setNavigationStatus(t("navigation.stopped"), "info");
  }
}

function toggleMapPreview() {
  const app = document.getElementById("plannerApp");
  const button = document.getElementById("mapPreviewToggle");

  if (!app || !button) {
    return;
  }

  const shouldExpand = app.classList.contains("map-peek");
  app.classList.toggle("map-peek", !shouldExpand);
  app.classList.toggle("map-expanded", shouldExpand);
  button.setAttribute("aria-expanded", String(shouldExpand));
  const label = button.querySelector("[data-i18n]");
  if (label) {
    const key = shouldExpand ? "map.collapsePreview" : "map.preview";
    label.dataset.i18n = key;
    label.textContent = t(key);
  }

  window.setTimeout(resizePlannerMap, 80);
  window.setTimeout(resizePlannerMap, 260);
}

function expandMapFromPeek(event) {
  const app = document.getElementById("plannerApp");
  if (app?.classList.contains("map-peek")) {
    event.preventDefault();
    toggleMapPreview();
  }
}

async function startVipNavigation() {
  if (!currentRenderState?.result) {
    setNavigationStatus(t("navigation.noRoute"), "error");
    return;
  }

  if (!navigator.geolocation) {
    setNavigationStatus(t("navigation.unsupported"), "error");
    return;
  }

  if (navigationWatchId !== null) {
    stopVipNavigation(false);
  }

  openNavigationWindow();
  const startButton = document.getElementById("startNavigationBtn");
  const stopButton = document.getElementById("stopNavigationBtn");
  if (startButton) startButton.disabled = true;
  if (stopButton) stopButton.hidden = false;

  setNavigationStatus(t("navigation.askPermission"), "info");

  navigationWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const coordinates = [position.coords.longitude, position.coords.latitude];
      await updateUserLocationOnMap(coordinates, true);
      let snapshot = getRouteNavigationSnapshot(coordinates, getNavigationWaypoints());

      if (!snapshot) {
        setNavigationStatus(t("navigation.noRoute"), "error");
        return;
      }

      snapshot = await redrawNavigationRouteIfNeeded(coordinates, snapshot);
      renderNavigationSnapshot(snapshot, position.coords.accuracy);
    },
    (error) => {
      console.error(error);
      stopVipNavigation(false);
      setNavigationStatus(t("navigation.error"), "error");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  );
}

function buildTripPayload(result, formData) {
  const storeStops = Array.isArray(result.storeStops) ? result.storeStops : [];
  const selectedStops = Array.isArray(result.selectedStops) ? result.selectedStops : [];

  return {
    title: `${result.start} -> ${result.end}`,
    days: result.days,
    budget: `${result.budget} NOK`,
    stops: [...selectedStops, ...storeStops.map((stop) => getWaypointLabel(stop))],
    routeStops: result.routeStops,
    routeEstimate: result.routeEstimate,
    info: `${result.startDate} -> ${result.endDate}`,
    kind: "planner",
    plannerData: {
      start: result.start,
      end: result.end,
      startDate: result.startDate,
      endDate: result.endDate,
      budget: result.budget,
      people: result.people,
      manualStops: result.manualStops || formData.manualStops || [],
      storeStops,
      routeStops: result.routeStops,
      carRentalEnabled: formData.carRentalEnabled
    }
  };
}

function renderCurrentPlan(result, formData) {
  currentRenderState = { result, formData };
  positionReadyRouteSuggestions();

  renderSummary({
    ...result,
    carRentalEnabled: formData.carRentalEnabled
  });
  renderTripPlan({
    start: result.start,
    stops: result.selectedStops,
    storeStops: result.storeStops || [],
    routeStops: result.routeStops,
    routeEstimate: result.routeEstimate,
    end: result.end,
    days: result.days,
    accommodation: result.accommodation,
    accommodationKey: result.accommodationKey,
    food: result.food,
    foodKey: result.foodKey,
    dailyBudget: result.dailyBudget,
    bookingLink: result.booking.link,
    fullBudget: result.fullBudget,
    moneyLeft: result.moneyLeft,
    people: result.people,
    enoughMoney: result.enoughMoney,
    carRentalEnabled: formData.carRentalEnabled
  });
}

async function generatePlan() {
  stopVipNavigation(false);
  const formData = getFormValues();
  const result = createTripPlan(formData);

  if (result.error) {
    currentTripToSave = null;
    currentRenderState = null;
    currentRecommendations = null;
    readySuggestionsCollapsed = false;
    renderReadyRouteSuggestions();

    if (result.errorCode === "budgetTooLow") {
      renderError(
        t("planner.error.budgetTooLow", {
          amount: formatCurrencyFromNok(result.minimumBudget)
        })
      );
      return;
    }

    renderError(result.errorKey ? t(result.errorKey) : result.error);
    return;
  }

  currentTripToSave = buildTripPayload(result, formData);
  readySuggestionsCollapsed = true;
  renderReadyRouteSuggestions();
  renderCurrentPlan(result, formData);

  const recommendations = getRouteRecommendations(
    formData.start,
    formData.end,
    formData.startDate,
    formData.endDate
  );

  currentRecommendations = recommendations;
  renderRecommendations(recommendations);

  try {
    await drawRoute(result.start, result.end, getRouteWaypointsForMap(result));
    result.routeStops = findCitiesAlongCurrentRoute(result.start, result.end, result.selectedStops);
    currentTripToSave = buildTripPayload(result, formData);
    renderCurrentPlan(result, formData);
    showPlannerStatus(t("status.created"), "success");
  } catch (error) {
    console.error(error);
    showPlannerStatus(t("status.mapError"), "error");
  }
}

async function saveCurrentPlan() {
  if (!currentTripToSave) {
    showPlannerStatus(t("status.createFirst"), "error");
    return;
  }

  const button = document.getElementById("savePlanBtn");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = t("status.saving");

  const result = await saveTrip(currentTripToSave);

  if (result.error) {
    showPlannerStatus(result.error, "error");
    button.disabled = false;
    button.textContent = originalText;
    return;
  }

  showPlannerStatus(t("status.saved"), "success");
  button.disabled = false;
  button.textContent = originalText;
}

function openCarRental() {
  window.open(CAR_RENTAL_URL, "_blank");
}

function getSuggestionsForCity(city) {
  const language = getLanguage();
  const keys = grocerySuggestions[city] || grocerySuggestions.default;

  return keys.map((key) => mealTexts[key]?.[language] || mealTexts[key]?.en || mealTexts[key]?.no);
}

function getGuideForCity(city) {
  const baseGuide = cityGuides[city] || cityGuides.default;
  const details = cityGuideDetails[city] || cityGuideDetails.default;
  const language = getLanguage();
  const localizedText = cityGuideTranslations[language]?.[city]
    || cityGuideTranslations[language]?.default;
  const localizedPlaceTexts = guidePlaceTextByLanguage[language];

  if (localizedText) {
    return {
      ...baseGuide,
      ...details,
      ...localizedText,
      places: baseGuide.places.map((place, index) => ({
        ...place,
        text: localizedPlaceTexts?.[index] || localizedText.intro || place.text
      }))
    };
  }

  return {
    ...baseGuide,
    ...details
  };
}

function buildCityPhotoUrl(city) {
  if (!GOOGLE_MAPS_STATIC_API_KEY) {
    return "";
  }

  const coordinates = getPlaceCenter(city);
  if (!coordinates) {
    return "";
  }

  const [lng, lat] = coordinates;
  const url = new URL("https://maps.googleapis.com/maps/api/streetview");
  url.searchParams.set("size", "800x450");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("fov", "95");
  url.searchParams.set("source", "outdoor");
  url.searchParams.set("key", GOOGLE_MAPS_STATIC_API_KEY);
  return url.toString();
}

function setStoreDrawerHeading(kickerKey, titleText) {
  const kicker = document.getElementById("storeDrawerKicker");
  const title = document.getElementById("storeDrawerTitle");

  if (kicker) {
    kicker.textContent = t(kickerKey);
  }

  title.textContent = titleText;
}

function setDetailsPanelOpen(isOpen) {
  const app = document.getElementById("plannerApp");
  const drawer = document.getElementById("storeDrawer");

  drawer.hidden = !isOpen;
  app?.classList.toggle("details-open", isOpen);
  window.setTimeout(resizePlannerMap, 80);
  window.setTimeout(resizePlannerMap, 280);
}

function openStoreDrawerLoading(city, isRouteSearch = false) {
  const drawer = document.getElementById("storeDrawer");
  const body = document.getElementById("storeDrawerBody");

  setStoreDrawerHeading(isRouteSearch ? "store.routeKicker" : "store.kicker", city);
  body.innerHTML = `
    <div class="store-card">
      <p class="store-label">${t("store.nearest")}</p>
      <p>${t("store.loading")}</p>
    </div>
  `;
  setDetailsPanelOpen(true);
}

function renderStoreDrawer(city, stores, selectedIndex = 0, isRouteSearch = false) {
  const drawer = document.getElementById("storeDrawer");
  const body = document.getElementById("storeDrawerBody");
  const selectedStore = stores[selectedIndex] || stores[0];
  const selectedStoreStop = selectedStore ? normalizeStoreStop(selectedStore, city) : null;
  const selectedStoreIsStop = Boolean(
    selectedStoreStop
    && currentRenderState?.result?.storeStops?.some((stop) => getWaypointKey(stop) === getWaypointKey(selectedStoreStop))
  );

  if (!stores.length) {
    clearActiveMapFocus();
    setStoreDrawerHeading(isRouteSearch ? "store.routeKicker" : "store.kicker", city);
    body.innerHTML = `
      <div class="store-card">
        <p class="store-label">${t("store.nearest")}</p>
        <p>${t("store.noStores")}</p>
      </div>
    `;
    setDetailsPanelOpen(true);
    currentStoreDrawerState = { city, stores, selectedIndex: 0, isRouteSearch };
    currentGuideDrawerState = null;
    currentHotelDrawerState = null;
    return;
  }
  // Правая колонка переиспользуется: здесь она показывает не только магазины,
  // но и конкретную выбранную карточку с фокусом на карте.
  const suggestions = getSuggestionsForCity(city)
    .map(
      (meal) => `
        <div class="meal-card">
          <h4>${meal.name}</h4>
          <ul class="store-list">
            ${meal.ingredients.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      `
    )
    .join("");

  const storeList = stores
    .map(
      (store, index) => `
        <button
          type="button"
          class="store-choice-btn ${index === selectedIndex ? "active" : ""}"
          data-store-index="${index}"
        >
          <span class="store-choice-name">${store.name}</span>
          <span class="store-choice-address">${store.address}</span>
        </button>
      `
    )
    .join("");

  setStoreDrawerHeading(isRouteSearch ? "store.routeKicker" : "store.kicker", city);
  body.innerHTML = `
    <div class="store-card">
      <p class="store-label">${t("store.nearest")}</p>
      <div class="store-choice-list">${storeList}</div>
    </div>
    <div class="store-card">
      <p class="store-label">${t("store.selected")}</p>
      ${
        selectedStore.photoUrl
          ? `<img src="${selectedStore.photoUrl}" alt="${selectedStore.name}" class="store-photo" />`
          : `<div class="store-photo store-photo-fallback">${selectedStore.name}</div>`
      }
      <h3>${selectedStore.name}</h3>
      <p>${selectedStore.address}</p>
      ${selectedStore.category ? `<p><strong>${t("store.category")}</strong> ${selectedStore.category}</p>` : ""}
      <button
        type="button"
        class="secondary-button add-store-stop-btn"
        ${selectedStoreIsStop ? "disabled" : ""}
      >
        ${selectedStoreIsStop ? t("store.stopAddedShort") : t("store.addStop")}
      </button>
    </div>
    <div class="store-card">
      <p class="store-label">${t("store.meals")}</p>
      <div class="meal-list">${suggestions}</div>
    </div>
  `;

  setDetailsPanelOpen(true);
  currentStoreDrawerState = { city, stores, selectedIndex, isRouteSearch };
  currentGuideDrawerState = null;
  currentHotelDrawerState = null;
  focusStoreOnMap(selectedStore);
}

function closeStoreDrawer() {
  setDetailsPanelOpen(false);
}

function openCityGuideDrawer(city) {
  renderCityGuideDrawer(city);
}

async function renderCityGuideDrawer(city, selectedPlace = null) {
  const drawer = document.getElementById("storeDrawer");
  const body = document.getElementById("storeDrawerBody");
  const guide = getGuideForCity(city);
  const photoUrl = buildCityPhotoUrl(city);
  await clearActiveMapFocus();
  // Блок "Steder" держим компактным: краткая справка о городе сверху,
  // ниже быстрые места и, при выборе, точная карточка конкретной точки.
  const placesHtml = guide.places
    .map(
      (place) => `
        <div class="meal-card">
          <h4>${place.name}</h4>
          <p>${place.text}</p>
          <button type="button" class="guide-place-btn" data-city="${city}" data-place-name="${place.name}">
            ${t("guide.showPlace")}
          </button>
        </div>
      `
    )
    .join("");

  setStoreDrawerHeading("guide.kicker", city);
  body.innerHTML = `
    <div class="store-card">
      <p class="store-label">${t("guide.about")}</p>
      ${photoUrl ? `<img src="${photoUrl}" alt="${city}" class="city-guide-photo" />` : ""}
      <p>${guide.intro}</p>
    </div>
    <div class="guide-grid">
      <div class="meal-card">
        <h4>${t("guide.history")}</h4>
        <p>${guide.history}</p>
      </div>
      <div class="meal-card">
        <h4>${t("guide.culture")}</h4>
        <p>${guide.culture}</p>
      </div>
      <div class="meal-card">
        <h4>${t("guide.activities")}</h4>
        <p>${guide.activities}</p>
      </div>
      <div class="meal-card">
        <h4>${t("guide.nature")}</h4>
        <p>${guide.nature}</p>
      </div>
    </div>
    <div class="store-card">
      <p class="store-label">${t("guide.quickPlaces")}</p>
      <div class="meal-list">${placesHtml}</div>
    </div>
    ${
      selectedPlace
        ? `
          <div class="store-card">
            <p class="store-label">${t("guide.selectedPlace")}</p>
            ${
              selectedPlace.photoUrl
                ? `<img src="${selectedPlace.photoUrl}" alt="${selectedPlace.name}" class="store-photo" />`
                : ""
            }
            <h3>${selectedPlace.name}</h3>
            <p>${selectedPlace.address}</p>
            ${selectedPlace.category ? `<p><strong>${t("guide.type")}</strong> ${selectedPlace.category}</p>` : ""}
          </div>
        `
        : ""
    }
  `;
  setDetailsPanelOpen(true);
  currentGuideDrawerState = { city, selectedPlace };
  currentStoreDrawerState = null;
  currentHotelDrawerState = null;
}

async function handleGuidePlaceClick(city, placeName) {
  try {
    // После клика по месту ищем более точную геометрию и сразу показываем её в drawer и на карте.
    const place = await findPlaceInCity(city, placeName);
    await renderCityGuideDrawer(city, place);
    await focusStoreOnMap(place);
  } catch (error) {
    console.error(error);
    showPlannerStatus(t("guide.positionError"), "error");
  }
}

function renderHotelDrawer(city, hotels, selectedIndex = 0) {
  const drawer = document.getElementById("storeDrawer");
  const body = document.getElementById("storeDrawerBody");
  const selectedHotel = hotels[selectedIndex] || hotels[0];

  setStoreDrawerHeading("hotel.kicker", city);
  if (!selectedHotel) {
    body.innerHTML = `<div class="store-card"><p class="store-label">${t("hotel.nearest")}</p><p>${t("hotel.noHotels")}</p></div>`;
    setDetailsPanelOpen(true);
    currentHotelDrawerState = { city, hotels: [], selectedIndex: 0 };
    currentStoreDrawerState = null;
    currentGuideDrawerState = null;
    return;
  }

  const hotelStop = normalizeStoreStop({ ...selectedHotel, kind: "hotel" }, city);
  const isAdded = currentRenderState?.result?.storeStops?.some(
    (stop) => getWaypointKey(stop) === getWaypointKey(hotelStop)
  );
  const hotelList = hotels.map((hotel, index) => `
    <button type="button" class="store-choice-btn hotel-choice-btn ${index === selectedIndex ? "active" : ""}" data-hotel-index="${index}">
      <span class="store-choice-name">${hotel.name}</span>
      <span class="store-choice-address">${hotel.address}</span>
    </button>
  `).join("");
  const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`;

  body.innerHTML = `
    <div class="store-card">
      <p class="store-label">${t("hotel.nearest")}</p>
      <div class="store-choice-list">${hotelList}</div>
    </div>
    <div class="store-card">
      <p class="store-label">${t("hotel.selected")}</p>
      ${selectedHotel.photoUrl ? `<img src="${selectedHotel.photoUrl}" alt="${selectedHotel.name}" class="store-photo" />` : `<div class="store-photo store-photo-fallback">${selectedHotel.name}</div>`}
      <h3>${selectedHotel.name}</h3>
      <p>${selectedHotel.address}</p>
      ${selectedHotel.category ? `<p><strong>${t("store.category")}</strong> ${selectedHotel.category}</p>` : ""}
      <div class="hotel-drawer-actions">
        <button type="button" class="secondary-button add-hotel-stop-btn" ${isAdded ? "disabled" : ""}>${isAdded ? t("hotel.added") : t("hotel.addRoute")}</button>
        <a class="booking-link-btn" href="${bookingUrl}" target="_blank" rel="noopener">${t("trip.openBooking")}</a>
      </div>
    </div>
    <div class="store-card hotel-note"><p>${t("hotel.priceNote")}</p></div>
  `;
  setDetailsPanelOpen(true);
  currentHotelDrawerState = { city, hotels, selectedIndex };
  currentStoreDrawerState = null;
  currentGuideDrawerState = null;
  focusStoreOnMap(selectedHotel);
}

async function handleHotelButtonClick(city) {
  const drawer = document.getElementById("storeDrawer");
  const body = document.getElementById("storeDrawerBody");
  setStoreDrawerHeading("hotel.kicker", city);
  body.innerHTML = `<div class="store-card"><p class="store-label">${t("hotel.nearest")}</p><p>${t("hotel.loading")}</p></div>`;
  setDetailsPanelOpen(true);
  try {
    const hotels = await findHotelsForCity(city);
    renderHotelDrawer(city, hotels);
  } catch (error) {
    console.error(error);
    await clearActiveMapFocus();
    renderHotelDrawer(city, []);
  }
}

async function addSelectedHotelStop() {
  if (!currentRenderState?.result || !currentHotelDrawerState) {
    showPlannerStatus(t("status.createFirst"), "error");
    return;
  }
  const hotel = currentHotelDrawerState.hotels[currentHotelDrawerState.selectedIndex];
  if (!hotel?.location) return;
  const result = currentRenderState.result;
  const hotelStop = normalizeStoreStop({ ...hotel, kind: "hotel" }, currentHotelDrawerState.city);
  hotelStop.kind = "hotel";
  const stops = Array.isArray(result.storeStops) ? result.storeStops : [];
  if (!stops.some((stop) => getWaypointKey(stop) === getWaypointKey(hotelStop))) {
    result.storeStops = [...stops, hotelStop];
  }
  try {
    await redrawCurrentRoute();
    currentTripToSave = buildTripPayload(result, currentRenderState.formData);
    renderCurrentPlan(result, currentRenderState.formData);
    renderHotelDrawer(currentHotelDrawerState.city, currentHotelDrawerState.hotels, currentHotelDrawerState.selectedIndex);
    showPlannerStatus(t("hotel.addedMessage"), "success");
  } catch (error) {
    console.error(error);
    showPlannerStatus(t("store.stopError"), "error");
  }
}

async function handleStoreButtonClick(city, routeFrom = "", routeTo = "") {
  try {
    const title = routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : city;
    const isRouteSearch = Boolean(routeFrom && routeTo);
    openStoreDrawerLoading(title, isRouteSearch);
    const stores = routeFrom && routeTo
      ? await findStoresAlongRoute(routeFrom, routeTo)
      : await findStoresForCity(city);
    renderStoreDrawer(title, stores, 0, isRouteSearch);
  } catch (error) {
    console.error(error);
    const drawer = document.getElementById("storeDrawer");
    const body = document.getElementById("storeDrawerBody");

    await clearActiveMapFocus();
    setStoreDrawerHeading(routeFrom && routeTo ? "store.routeKicker" : "store.kicker", routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : city);
    body.innerHTML = `
      <div class="store-card">
        <p class="store-label">${t("store.nearest")}</p>
        <p>${t("store.noStores")}</p>
      </div>
    `;
    setDetailsPanelOpen(true);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  setDefaultDates();
  initPlacePickers();
  initCurrencySelector();
  initLanguageSelector();
  updateBudgetLabel();
  await updateAuthNav();

  const draft = consumePlannerDraft();
  if (draft) {
    applyFormValues(draft);
  }
  initPlannerDatePickers();

  try {
    await initMap();
  } catch (error) {
    console.error(error);
    document.getElementById("summary").innerHTML =
      "<strong>Mapbox kunne ikke lastes inn. Sjekk token og nettverk.</strong>";
  }

  document.getElementById("planBtn").addEventListener("click", generatePlan);
  document.querySelector(".sidebar .panel")?.addEventListener("input", handlePlannerFormChanged);
  document.querySelector(".sidebar .panel")?.addEventListener("change", handlePlannerFormChanged);
  document.addEventListener("plannerformchange", handlePlannerFormChanged);
  document.getElementById("readyRouteSuggestions")?.addEventListener("click", async (event) => {
    const expandButton = event.target.closest(".ready-suggestions-expand");
    if (expandButton) {
      readySuggestionsCollapsed = false;
      renderReadyRouteSuggestions();
      return;
    }

    const useButton = event.target.closest(".ready-suggestion-use");
    if (!useButton) {
      return;
    }

    await useReadyRouteSuggestion(useButton.dataset.readyRouteId);
  });
  await loadReadyRouteSuggestions();
  document.addEventListener("languagechange", () => {
    renderReadyRouteSuggestions();

    if (currentRecommendations) {
      renderRecommendations(currentRecommendations);
    }

    if (currentStoreDrawerState && !document.getElementById("storeDrawer").hidden) {
      renderStoreDrawer(
        currentStoreDrawerState.city,
        currentStoreDrawerState.stores,
        currentStoreDrawerState.selectedIndex,
        currentStoreDrawerState.isRouteSearch
      );
    } else if (currentHotelDrawerState && !document.getElementById("storeDrawer").hidden) {
      renderHotelDrawer(
        currentHotelDrawerState.city,
        currentHotelDrawerState.hotels,
        currentHotelDrawerState.selectedIndex
      );
    } else if (currentGuideDrawerState && !document.getElementById("storeDrawer").hidden) {
      renderCityGuideDrawer(currentGuideDrawerState.city, currentGuideDrawerState.selectedPlace);
    }
  });
  document.getElementById("savePlanBtn").addEventListener("click", saveCurrentPlan);
  document.getElementById("carRentalBtn").addEventListener("click", openCarRental);
  document.getElementById("mapPreviewToggle")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMapPreview();
  });
  document.querySelector(".map-area")?.addEventListener("click", expandMapFromPeek);
  document.getElementById("closeStoreDrawer").addEventListener("click", closeStoreDrawer);
  document.getElementById("tripPlan").addEventListener("click", async (event) => {
    const openNavigationButton = event.target.closest("#openNavigationWindowBtn");
    if (openNavigationButton) {
      openNavigationWindow();
      return;
    }

    const loadTrafficSignalsButton = event.target.closest("#loadTrafficSignalsBtn");
    if (loadTrafficSignalsButton) {
      await loadTrafficSignals();
      return;
    }

    const closeNavigationButton = event.target.closest("#closeNavigationWindowBtn");
    if (closeNavigationButton) {
      closeNavigationWindow();
      return;
    }

    const startNavigationButton = event.target.closest("#startNavigationBtn");
    if (startNavigationButton) {
      await startVipNavigation();
      return;
    }

    const stopNavigationButton = event.target.closest("#stopNavigationBtn");
    if (stopNavigationButton) {
      stopVipNavigation(true);
      return;
    }

    const bookingButton = event.target.closest(".booking-link-btn");
    if (bookingButton) {
      window.open(bookingButton.dataset.bookingLink, "_blank");
      return;
    }

    const removeStoreStopButton = event.target.closest(".remove-store-stop-btn");
    if (removeStoreStopButton) {
      await removeStoreStop(removeStoreStopButton.dataset.storeStopId);
      return;
    }

    const guideButton = event.target.closest(".mini-guide-btn");
    if (guideButton) {
      openCityGuideDrawer(guideButton.dataset.city);
      return;
    }

    const hotelButton = event.target.closest(".mini-hotel-btn");
    if (hotelButton) {
      await handleHotelButtonClick(hotelButton.dataset.city);
      return;
    }

    const button = event.target.closest(".mini-store-btn");
    if (!button) {
      return;
    }

    await handleStoreButtonClick(
      button.dataset.city,
      button.dataset.storeMode === "route" ? button.dataset.routeFrom : "",
      button.dataset.storeMode === "route" ? button.dataset.routeTo : ""
    );
  });
  document.getElementById("storeDrawerBody").addEventListener("click", async (event) => {
    const addHotelButton = event.target.closest(".add-hotel-stop-btn");
    if (addHotelButton) {
      await addSelectedHotelStop();
      return;
    }

    const hotelChoiceButton = event.target.closest(".hotel-choice-btn");
    if (hotelChoiceButton && currentHotelDrawerState) {
      renderHotelDrawer(
        currentHotelDrawerState.city,
        currentHotelDrawerState.hotels,
        Number(hotelChoiceButton.dataset.hotelIndex)
      );
      return;
    }

    const addStoreStopButton = event.target.closest(".add-store-stop-btn");
    if (addStoreStopButton) {
      await addSelectedStoreStop();
      return;
    }

    const button = event.target.closest(".store-choice-btn");
    if (button && currentStoreDrawerState) {
      const selectedIndex = Number(button.dataset.storeIndex);
      renderStoreDrawer(
        currentStoreDrawerState.city,
        currentStoreDrawerState.stores,
        selectedIndex,
        currentStoreDrawerState.isRouteSearch
      );
      return;
    }

    const guidePlaceButton = event.target.closest(".guide-place-btn");
    if (guidePlaceButton) {
      handleGuidePlaceClick(guidePlaceButton.dataset.city, guidePlaceButton.dataset.placeName);
    }
  });
  document.querySelector(".map-style-switcher").addEventListener("click", async (event) => {
    const button = event.target.closest(".map-style-btn");
    if (!button) {
      return;
    }

    document.querySelectorAll(".map-style-btn").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    await setMapStyle(button.dataset.mapStyle);
  });
  document.addEventListener("currencychange", (event) => {
    syncBudgetInputCurrency(event.detail.oldCurrency, event.detail.newCurrency);
    renderReadyRouteSuggestions();

    if (!currentRenderState) {
      return;
    }

    renderCurrentPlan(currentRenderState.result, currentRenderState.formData);
  });
  document.addEventListener("languagechange", () => {
    updateBudgetLabel();
    renderReadyRouteSuggestions();

    if (currentRenderState) {
      renderCurrentPlan(currentRenderState.result, currentRenderState.formData);
    }
  });

  if (draft) {
    await generatePlan();
    showPlannerStatus("Route loaded in the planner.", "success");
  }
});

