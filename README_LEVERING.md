# TripPlanner - leveringsnotat

## Hva prosjektet er

TripPlanner er et webprosjekt for planlegging av reiser i Norge. Nettstedet har sider for ruteplanlegging, ferdige ruter, aktiviteter, flybilletter, profil og enkel administrasjon.

Prosjektet dekker faget Utvikling gjennom HTML, CSS, JavaScript og en Node/Express-server. Driftsstøtte-delen vises gjennom dokumentasjon, miljøfil, pakking av prosjektet og enkel kjøreinstruks.

## Hvordan kjøre prosjektet

1. Installer Node.js.
2. Åpne prosjektmappen i terminalen.
3. Kjør `npm install`.
4. Kopier `.env.example` til `.env` og fyll inn egne verdier ved behov.
5. Start prosjektet med `npm start`.
6. Åpne `http://localhost:3000` i nettleseren.

## Viktige filer

- `index.html` - startsiden.
- `planner.html` og `js/planner.js` - planlegging av ruter.
- `tickets.html` og `js/tickets-page.js` - søk og forslag for flybilletter.
- `server.js` - backend med innlogging, API-ruter og støttefunksjoner.
- `style.css` - felles design og responsiv layout.
- `.env.example` - eksempel på miljøvariabler.

## Dokumentasjon i kode

Koden er delt inn i egne filer etter funksjon, og flere sentrale deler har kommentarer eller beskrivende navn slik at det er mulig å forstå flyten. HTML-filene viser sidestrukturen, JavaScript-filene håndterer interaksjon, og serverfilen samler backend-funksjoner.

## Bruk av KI

KI er brukt minimalt som støtte til feilsøking, rydding og formulering av dokumentasjon. Selve prosjektideen, valg av funksjoner og prosjektets innhold er levert som eget skoleprosjekt.

## Innhold i ZIP

Leverings-ZIP-en skal inneholde kildekode, statiske filer, `package.json`, `package-lock.json`, `.env.example` og dokumentasjon. Lokale mapper og sensitive filer som `node_modules`, `.git`, `.env`, `.vs` og midlertidige filer er ikke tatt med.
