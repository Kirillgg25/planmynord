export const norwayCities = [
  "Oslo",
  "Drammen",
  "Kristiansand",
  "Stavanger",
  "Sandnes",
  "Haugesund",
  "Bergen",
  "Voss",
  "Flåm",
  "Geilo",
  "Gol",
  "Hemsedal",
  "Lillehammer",
  "Gjøvik",
  "Hamar",
  "Trondheim",
  "Oppdal",
  "Dombås",
  "Ålesund",
  "Molde",
  "Kristiansund",
  "Bodø",
  "Narvik",
  "Harstad",
  "Bardufoss",
  "Tromsø",
  "Alta",
  "Kirkenes"
];

export const routeRecommendations = {
  "Oslo-Tromsø": [
    {
      name: {
        no: "Raskeste hovedrute",
        en: "Fastest main route",
        ru: "Самый быстрый основной маршрут"
      },
      minDays: 4,
      idealDays: 5,
      estimatedKm: 1650,
      stops: ["Lillehammer", "Trondheim", "Mosjøen", "Narvik"],
      highlights: {
        no: ["Gudbrandsdalen", "Trøndelag", "nordlige fjellområder"],
        en: ["Gudbrandsdalen", "Trøndelag", "northern mountain areas"],
        ru: ["Гудбрандсдален", "Трёнделаг", "северные горные районы"]
      }
    },
    {
      name: {
        no: "Natur og fjord-omvei",
        en: "Nature and fjord detour",
        ru: "Объезд через природу и фьорды"
      },
      minDays: 6,
      idealDays: 8,
      estimatedKm: 2100,
      stops: ["Geilo", "Bergen", "Ålesund", "Trondheim", "Bodø", "Narvik"],
      highlights: {
        no: ["Hardangervidda", "Vestland", "fjorder", "kystlandskap"],
        en: ["Hardangervidda", "Western Norway", "fjords", "coastal landscapes"],
        ru: ["Хардангервидда", "Западная Норвегия", "фьорды", "побережье"]
      }
    },
    {
      name: {
        no: "Nord-Norge fokus",
        en: "Northern Norway focus",
        ru: "Акцент на Северной Норвегии"
      },
      minDays: 5,
      idealDays: 7,
      estimatedKm: 1800,
      stops: ["Dombås", "Trondheim", "Mo i Rana", "Bodø", "Narvik"],
      highlights: {
        no: ["Saltfjellet", "Nordland", "arktiske landskap"],
        en: ["Saltfjellet", "Nordland", "arctic landscapes"],
        ru: ["Салтфьеллет", "Нурланн", "арктические пейзажи"]
      }
    }
  ],

  "Oslo-Bergen": [
    {
      name: {
        no: "Kort og klassisk",
        en: "Short and classic",
        ru: "Коротко и классически"
      },
      minDays: 2,
      idealDays: 3,
      estimatedKm: 305,
      stops: ["Drammen", "Geilo", "Voss"],
      highlights: {
        no: ["fjellovergang", "Voss", "vestlandsnatur"],
        en: ["mountain pass", "Voss", "western Norway nature"],
        ru: ["горный перевал", "Восс", "природа Западной Норвегии"]
      }
    },
    {
      name: {
        no: "Turistvei med mer natur",
        en: "Scenic road with more nature",
        ru: "Туристическая дорога с природой"
      },
      minDays: 3,
      idealDays: 4,
      estimatedKm: 360,
      stops: ["Hønefoss", "Gol", "Flåm", "Voss"],
      highlights: {
        no: ["Flåm", "fjorder", "utsiktspunkter"],
        en: ["Flåm", "fjords", "viewpoints"],
        ru: ["Флом", "фьорды", "смотровые точки"]
      }
    }
  ],

  "Oslo-Trondheim": [
    {
      name: {
        no: "Direkte og rolig",
        en: "Direct and calm",
        ru: "Прямой и спокойный"
      },
      minDays: 2,
      idealDays: 3,
      estimatedKm: 500,
      stops: ["Hamar", "Lillehammer", "Oppdal"],
      highlights: {
        no: ["Mjøsa", "Gudbrandsdalen", "fjell"],
        en: ["Mjøsa", "Gudbrandsdalen", "mountains"],
        ru: ["Мьёса", "Гудбрандсдален", "горы"]
      }
    },
    {
      name: {
        no: "Mer opplevelse underveis",
        en: "More experiences on the way",
        ru: "Больше впечатлений по пути"
      },
      minDays: 3,
      idealDays: 4,
      estimatedKm: 620,
      stops: ["Gjøvik", "Lillehammer", "Dombås", "Oppdal"],
      highlights: {
        no: ["innlandsnatur", "fjelloverganger"],
        en: ["inland nature", "mountain passes"],
        ru: ["внутренняя природа", "горные перевалы"]
      }
    }
  ]
};

