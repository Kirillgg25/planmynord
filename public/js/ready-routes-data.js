export const extraReadyRoutes = [
  {
    title: "Oslo → Stavanger",
    days: 6,
    budget: "16000-24000 NOK",
    stops: ["Drammen", "Kristiansand", "Egersund"],
    info: {
      no: "Sørlandsrute med bystopp, kyst, små pauser og en rolig vei mot Stavanger.",
      en: "Southern Norway route with towns, coastline, easy breaks and a calm drive toward Stavanger.",
      ru: "Южный маршрут: города, побережье, спокойные остановки и дорога к Stavanger."
    },
    plannerData: { start: "Oslo", end: "Stavanger", budget: 20000, manualStops: ["Drammen", "Kristiansand", "Egersund"] }
  },
  {
    title: "Oslo → Kristiansand",
    days: 3,
    budget: "8000-13000 NOK",
    stops: ["Drammen", "Tonsberg", "Arendal"],
    info: {
      no: "Kort sørlandstur for helg eller skoleferie med lett kjøring og fine bystopp.",
      en: "Short southern trip for a weekend or school break with easy driving and pleasant town stops.",
      ru: "Короткая поездка на юг для выходных или каникул: лёгкая дорога и приятные города."
    },
    plannerData: { start: "Oslo", end: "Kristiansand", budget: 10500, manualStops: ["Drammen", "Tonsberg", "Arendal"] }
  },
  {
    title: "Kristiansand → Bergen",
    days: 7,
    budget: "18000-27000 NOK",
    stops: ["Stavanger", "Haugesund", "Voss"],
    info: {
      no: "Kyst og vestlandsnatur i samme reise, med passe lange etapper og gode stopp.",
      en: "Coast and western Norway scenery in one trip, with comfortable stages and useful stops.",
      ru: "Побережье и западная природа Норвегии в одной поездке с удобными этапами."
    },
    plannerData: { start: "Kristiansand", end: "Bergen", budget: 22500, manualStops: ["Stavanger", "Haugesund", "Voss"] }
  },
  {
    title: "Bergen → Stavanger",
    days: 4,
    budget: "11000-17000 NOK",
    stops: ["Haugesund", "Sandnes"],
    info: {
      no: "Kompakt vestlandsrute med fjordfølelse, korte bystopp og lite stress.",
      en: "Compact western route with fjord atmosphere, short city stops and low stress.",
      ru: "Компактный западный маршрут: фьорды, короткие остановки и без спешки."
    },
    plannerData: { start: "Bergen", end: "Stavanger", budget: 14000, manualStops: ["Haugesund", "Sandnes"] }
  },
  {
    title: "Bergen → Ålesund",
    days: 5,
    budget: "14000-22000 NOK",
    stops: ["Forde", "Volda"],
    info: {
      no: "Vestlandsreise med fjordlandskap, småbyer og en fin avslutning i Ålesund.",
      en: "Western Norway journey with fjord landscapes, small towns and a strong finish in Alesund.",
      ru: "Западная Норвегия: фьорды, маленькие города и красивый финиш в Ålesund."
    },
    plannerData: { start: "Bergen", end: "Alesund", budget: 18000, manualStops: ["Forde", "Volda"] }
  },
  {
    title: "Ålesund → Trondheim",
    days: 4,
    budget: "11000-17000 NOK",
    stops: ["Molde", "Kristiansund", "Oppdal"],
    info: {
      no: "Fin rute fra kyst til Trøndelag med korte stopp og variert landskap.",
      en: "A good route from coast to Trondelag with short stops and varied scenery.",
      ru: "Маршрут от побережья к Trøndelag: короткие остановки и разная природа."
    },
    plannerData: { start: "Alesund", end: "Trondheim", budget: 14000, manualStops: ["Molde", "Kristiansund", "Oppdal"] }
  },
  {
    title: "Oslo → Ålesund",
    days: 6,
    budget: "16000-25000 NOK",
    stops: ["Lillehammer", "Dombas", "Molde"],
    info: {
      no: "Innlandsvei mot fjord og kyst, god for de som vil se fjell før Ålesund.",
      en: "Inland road toward fjords and coast, good for seeing mountains before Alesund.",
      ru: "Внутренняя дорога к фьордам и побережью: горы перед Ålesund."
    },
    plannerData: { start: "Oslo", end: "Alesund", budget: 20500, manualStops: ["Lillehammer", "Dombas", "Molde"] }
  },
  {
    title: "Stavanger → Trondheim",
    days: 8,
    budget: "22000-34000 NOK",
    stops: ["Haugesund", "Bergen", "Alesund", "Molde"],
    info: {
      no: "Lang vestlandsrute med mange klassiske stopp fra sørvest til Midt-Norge.",
      en: "Long western route with classic stops from the southwest to central Norway.",
      ru: "Длинный западный маршрут с классическими остановками от юго-запада до центра Норвегии."
    },
    plannerData: { start: "Stavanger", end: "Trondheim", budget: 28000, manualStops: ["Haugesund", "Bergen", "Alesund", "Molde"] }
  },
  {
    title: "Trondheim → Bodø",
    days: 5,
    budget: "15000-23000 NOK",
    stops: ["Mosjoen", "Mo i Rana"],
    info: {
      no: "Nordover fra Trondheim med rolige etapper, fjell og gode stopp før Bodø.",
      en: "North from Trondheim with calm stages, mountain scenery and good stops before Bodo.",
      ru: "На север от Trondheim: спокойные этапы, горы и хорошие остановки перед Bodø."
    },
    plannerData: { start: "Trondheim", end: "Bodo", budget: 19000, manualStops: ["Mosjoen", "Mo i Rana"] }
  },
  {
    title: "Bodø → Svolvær",
    days: 4,
    budget: "12000-19000 NOK",
    stops: ["Narvik"],
    info: {
      no: "Kort nordnorsk tur med Lofoten-følelse og tid til utsikt underveis.",
      en: "Short northern trip with a Lofoten feeling and time for viewpoints on the way.",
      ru: "Короткая северная поездка с атмосферой Lofoten и временем на виды."
    },
    plannerData: { start: "Bodo", end: "Svolvaer", budget: 15500, manualStops: ["Narvik"] }
  },
  {
    title: "Narvik → Tromsø",
    days: 3,
    budget: "9000-15000 NOK",
    stops: ["Bardufoss"],
    info: {
      no: "En kort og tydelig nordrute med fjell, daler og Tromsø som mål.",
      en: "A short northern route with mountains, valleys and Tromso as the destination.",
      ru: "Короткий северный маршрут: горы, долины и финиш в Tromsø."
    },
    plannerData: { start: "Narvik", end: "Tromso", budget: 12000, manualStops: ["Bardufoss"] }
  },
  {
    title: "Tromsø → Alta",
    days: 4,
    budget: "12000-18000 NOK",
    stops: ["Bardufoss", "Hammerfest"],
    info: {
      no: "Nordlig rute for arktisk natur, lange lysdager eller vinterstemning.",
      en: "Northern route for arctic nature, long bright days or winter atmosphere.",
      ru: "Северный маршрут для арктической природы, длинных светлых дней или зимней атмосферы."
    },
    plannerData: { start: "Tromso", end: "Alta", budget: 15000, manualStops: ["Bardufoss", "Hammerfest"] }
  },
  {
    title: "Oslo → Fredrikstad",
    days: 2,
    budget: "5000-9000 NOK",
    stops: ["Sarpsborg"],
    info: {
      no: "Veldig kort Østfold-tur for en billig helg med by, vann og enkel logistikk.",
      en: "Very short Ostfold trip for a low-cost weekend with towns, water and easy logistics.",
      ru: "Очень короткая поездка в Østfold на недорогие выходные: город, вода и простая логистика."
    },
    plannerData: { start: "Oslo", end: "Fredrikstad", budget: 7000, manualStops: ["Sarpsborg"] }
  },
  {
    title: "Fredrikstad → Trondheim",
    days: 6,
    budget: "16000-25000 NOK",
    stops: ["Oslo", "Hamar", "Lillehammer", "Oppdal"],
    info: {
      no: "Fra Østfold til Trøndelag med klassiske innlandsstopp og jevn kjøring.",
      en: "From Ostfold to Trondelag with classic inland stops and steady driving.",
      ru: "Из Østfold в Trøndelag через классические внутренние остановки."
    },
    plannerData: { start: "Fredrikstad", end: "Trondheim", budget: 20500, manualStops: ["Oslo", "Hamar", "Lillehammer", "Oppdal"] }
  },
  {
    title: "Lillehammer → Geilo",
    days: 3,
    budget: "8000-13000 NOK",
    stops: ["Gol", "Hemsedal"],
    info: {
      no: "Liten fjelltur for natur, frisk luft og korte dagsetapper.",
      en: "Small mountain trip for nature, fresh air and short daily stages.",
      ru: "Небольшой горный маршрут: природа, свежий воздух и короткие дневные этапы."
    },
    plannerData: { start: "Lillehammer", end: "Geilo", budget: 10500, manualStops: ["Gol", "Hemsedal"] }
  },
  {
    title: "Oslo → Geilo",
    days: 3,
    budget: "8000-14000 NOK",
    stops: ["Drammen", "Kongsberg", "Gol"],
    info: {
      no: "Enkel fjellhelg fra Oslo med stopp som passer godt for nybegynnere.",
      en: "Easy mountain weekend from Oslo with stops that work well for first-time planners.",
      ru: "Лёгкий горный уикенд из Oslo с остановками, удобными для первого планирования."
    },
    plannerData: { start: "Oslo", end: "Geilo", budget: 11000, manualStops: ["Drammen", "Kongsberg", "Gol"] }
  }
];

