export const cityData = {
  Oslo: {
    stops: ["Drammen", "Geilo", "Voss","Kongsberg"],
    hotel: "Budsjett-hotell / hostel",
    food: "Dagligvare + enkel kafé"
  },
  Drammen: {
    stops: ["Hønefoss", "Gol"],
    hotel: "Rimelig overnatting",
    food: "Butikkmat + takeaway"
  },
  Kristiansand: {
    stops: ["Arendal", "Porsgrunn"],
    hotel: "Camping eller hostel",
    food: "Butikkmat + kafé"
  },
  Stavanger: {
    stops: ["Sandnes", "Haugesund"],
    hotel: "Hostel / småhotell",
    food: "Dagligvare + enkel middag"
  },
  Bergen: {
    stops: ["Voss", "Flåm"],
    hotel: "Hostel / budsjett-hotell",
    food: "Butikkmat + bakeri"
  },
  Trondheim: {
    stops: ["Oppdal", "Dombås"],
    hotel: "Rimelig hotell",
    food: "Butikk + kafé"
  },
  Tromsø: {
    stops: ["Narvik", "Bardufoss"],
    hotel: "Hostel / gjestehus",
    food: "Butikkmat + varm mat"
  },
  Tromso: {
    stops: ["Narvik", "Bardufoss"],
    hotel: "Hostel / gjestehus",
    food: "Butikkmat + varm mat"
  }
};

export const placeGroups = [
  {
    id: "ostfold",
    title: "Østfold",
    items: [
      { label: "Fredrikstad", value: "Fredrikstad" },
      { label: "Sarpsborg", value: "Sarpsborg" },
      { label: "Moss", value: "Moss" },
      { label: "Halden", value: "Halden" },
      { label: "Askim", value: "Askim" },
      { label: "Mysen", value: "Mysen" }
    ]
  },
  {
    id: "akershus",
    title: "Akershus",
    items: [
      { label: "Lillestrøm", value: "Lillestrom" },
      { label: "Sandvika", value: "Sandvika" },
      { label: "Ski", value: "Ski" },
      { label: "Jessheim", value: "Jessheim" },
      { label: "Drøbak", value: "Drobak" },
      { label: "Ås", value: "As" }
    ]
  },
  {
    id: "oslo",
    title: "Oslo",
    items: [{ label: "Oslo", value: "Oslo" }]
  },
  {
    id: "innlandet",
    title: "Innlandet",
    items: [
      { label: "Hamar", value: "Hamar" },
      { label: "Lillehammer", value: "Lillehammer" },
      { label: "Gjøvik", value: "Gjovik" },
      { label: "Elverum", value: "Elverum" },
      { label: "Kongsvinger", value: "Kongsvinger" },
      { label: "Otta", value: "Otta" }
    ]
  },
  {
    id: "buskerud",
    title: "Buskerud",
    items: [
      { label: "Drammen", value: "Drammen" },
      { label: "Kongsberg", value: "Kongsberg" },
      { label: "Hønefoss", value: "Honefoss" },
      { label: "Gol", value: "Gol" },
      { label: "Geilo", value: "Geilo" },
      { label: "Hokksund", value: "Hokksund" }
    ]
  },
  {
    id: "vestfold",
    title: "Vestfold",
    items: [
      { label: "Tønsberg", value: "Tonsberg" },
      { label: "Sandefjord", value: "Sandefjord" },
      { label: "Larvik", value: "Larvik" },
      { label: "Horten", value: "Horten" },
      { label: "Holmestrand", value: "Holmestrand" }
    ]
  },
  {
    id: "telemark",
    title: "Telemark",
    items: [
      { label: "Skien", value: "Skien" },
      { label: "Porsgrunn", value: "Porsgrunn" },
      { label: "Notodden", value: "Notodden" },
      { label: "Kragerø", value: "Kragero" },
      { label: "Rjukan", value: "Rjukan" }
    ]
  },
  {
    id: "agder",
    title: "Agder",
    items: [
      { label: "Kristiansand", value: "Kristiansand" },
      { label: "Arendal", value: "Arendal" },
      { label: "Grimstad", value: "Grimstad" },
      { label: "Mandal", value: "Mandal" },
      { label: "Flekkefjord", value: "Flekkefjord" }
    ]
  },
  {
    id: "rogaland",
    title: "Rogaland",
    items: [
      { label: "Stavanger", value: "Stavanger" },
      { label: "Sandnes", value: "Sandnes" },
      { label: "Haugesund", value: "Haugesund" },
      { label: "Egersund", value: "Egersund" },
      { label: "Bryne", value: "Bryne" },
      { label: "Jørpeland", value: "Jorpeland" }
    ]
  },
  {
    id: "vestland",
    title: "Vestland",
    items: [
      { label: "Bergen", value: "Bergen" },
      { label: "Voss", value: "Voss" },
      { label: "Flåm", value: "Flam" },
      { label: "Førde", value: "Forde" },
      { label: "Leikanger", value: "Leikanger" },
      { label: "Odda", value: "Odda" }
    ]
  },
  {
    id: "more-og-romsdal",
    title: "Møre og Romsdal",
    items: [
      { label: "Ålesund", value: "Alesund" },
      { label: "Molde", value: "Molde" },
      { label: "Kristiansund", value: "Kristiansund" },
      { label: "Volda", value: "Volda" },
      { label: "Åndalsnes", value: "Andalsnes" }
    ]
  },
  {
    id: "trondelag",
    title: "Trøndelag",
    items: [
      { label: "Trondheim", value: "Trondheim" },
      { label: "Steinkjer", value: "Steinkjer" },
      { label: "Stjørdal", value: "Stjordal" },
      { label: "Levanger", value: "Levanger" },
      { label: "Oppdal", value: "Oppdal" },
      { label: "Røros", value: "Roros" }
    ]
  },
  {
    id: "nordland",
    title: "Nordland",
    items: [
      { label: "Bodø", value: "Bodo" },
      { label: "Narvik", value: "Narvik" },
      { label: "Mo i Rana", value: "Mo i Rana" },
      { label: "Svolvær", value: "Svolvaer" },
      { label: "Mosjøen", value: "Mosjoen" }
    ]
  },
  {
    id: "troms",
    title: "Troms",
    items: [
      { label: "Tromsø", value: "Tromso" },
      { label: "Harstad", value: "Harstad" },
      { label: "Finnsnes", value: "Finnsnes" },
      { label: "Bardufoss", value: "Bardufoss" },
      { label: "Storslett", value: "Storslett" }
    ]
  },
  {
    id: "finnmark",
    title: "Finnmark",
    items: [
      { label: "Alta", value: "Alta" },
      { label: "Hammerfest", value: "Hammerfest" },
      { label: "Kirkenes", value: "Kirkenes" },
      { label: "Vadsø", value: "Vadso" },
      { label: "Vardø", value: "Vardo" },
      { label: "Karasjok", value: "Karasjok" }
    ]
  }
];

export function getPlaceLabel(value) {
  const normalizedValue = String(value || "").trim();
  const allPlaces = placeGroups.flatMap((group) => group.items);
  return allPlaces.find((place) => place.value === normalizedValue)?.label || normalizedValue;
}

