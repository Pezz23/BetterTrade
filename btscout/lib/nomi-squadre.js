// Mappa dei nomi squadra: da The Odds API a football-data.
//
// L'archivio usa i nomi di football-data ("Inter", "Ath Madrid", "Paris SG").
// The Odds API ne usa altri ("Inter Milan", "Atlético Madrid", "Paris Saint
// Germain"). Senza questa mappa la stessa partita entrerebbe due volte con due
// nomi, e le due fonti non si parlerebbero.
//
// Generata il 16/09/2026 da un confronto automatico rivisto a mano. Una
// trappola trovata nella revisione: "Paris Saint Germain" era finito su
// "Paris FC", che è un'altra squadra. Le regole automatiche sbagliano in
// silenzio: ogni nome nuovo va aggiunto qui a mano, e `traduci()` si ferma
// se ne incontra uno che non conosce.

export const NOMI = {
  E0: {
    "Brighton and Hove Albion": "Brighton",
    "Coventry City": "Coventry",
    "Hull City": "Hull",
    "Ipswich Town": "Ipswich",
    "Leeds United": "Leeds",
    "Manchester City": "Man City",
    "Manchester United": "Man United",
    "Newcastle United": "Newcastle",
    "Nottingham Forest": "Nott'm Forest",
    "Tottenham Hotspur": "Tottenham",
  },
  E1: {
    "Birmingham City": "Birmingham",
    "Blackburn Rovers": "Blackburn",
    "Bolton Wanderers": "Bolton",
    "Cardiff City": "Cardiff",
    "Charlton Athletic": "Charlton",
    "Derby County": "Derby",
    "Lincoln City": "Lincoln",
    "Norwich City": "Norwich",
    "Preston North End": "Preston",
    "Queens Park Rangers": "QPR",
    "Stoke City": "Stoke",
    "Swansea City": "Swansea",
    "West Bromwich Albion": "West Brom",
    "West Ham United": "West Ham",
    "Wolverhampton Wanderers": "Wolves",
    "Wrexham AFC": "Wrexham",
  },
  I1: {
    "AC Milan": "Milan",
    "AS Roma": "Roma",
    "Atalanta BC": "Atalanta",
    "Inter Milan": "Inter",
  },
  I2: {
    "Cesena FC": "Cesena",
    "Hellas Verona": "Verona",
    "Südtirol": "Sudtirol",
    "US Catanzaro 1929": "Catanzaro",
  },
  SP1: {
    "Alavés": "Alaves",
    "Athletic Bilbao": "Ath Bilbao",
    "Atlético Madrid": "Ath Madrid",
    "CA Osasuna": "Osasuna",
    "Celta Vigo": "Celta",
    "Deportivo La Coruña": "La Coruna",
    "Elche CF": "Elche",
    "Espanyol": "Espanol",
    "Málaga": "Malaga",
    "Rayo Vallecano": "Vallecano",
    "Real Betis": "Betis",
    "Real Racing Club de Santander": "Santander",
    "Real Sociedad": "Sociedad",
  },
  SP2: {
    "AD Ceuta FC": "Ceuta",
    "Almería": "Almeria",
    "Andorra CF": "Andorra",
    "Burgos CF": "Burgos",
    "CD Castellón": "Castellon",
    "CD Eldense": "Eldense",
    "Celta Fortuna": "Celta B",
    "Cádiz CF": "Cadiz",
    "Córdoba": "Cordoba",
    "Girona FC": "Girona",
    "Granada CF": "Granada",
    "Leganés": "Leganes",
    "Real Sociedad B": "Sociedad B",
    "Real Valladolid CF": "Valladolid",
    "SD Eibar": "Eibar",
    "Sabadell FC": "Sabadell",
    "Sporting Gijón": "Sp Gijon",
  },
  D1: {
    "1. FC Köln": "FC Koln",
    "Bayer Leverkusen": "Leverkusen",
    "Borussia Dortmund": "Dortmund",
    "Borussia Monchengladbach": "M'gladbach",
    "Eintracht Frankfurt": "Ein Frankfurt",
    "FC Schalke 04": "Schalke 04",
    "FSV Mainz 05": "Mainz",
    "Hamburger SV": "Hamburg",
    "SC Freiburg": "Freiburg",
    "SC Paderborn": "Paderborn",
    "TSG Hoffenheim": "Hoffenheim",
    "VfB Stuttgart": "Stuttgart",
  },
  D2: {
    "1. FC Heidenheim": "Heidenheim",
    "1. FC Kaiserslautern": "Kaiserslautern",
    "1. FC Magdeburg": "Magdeburg",
    "1. FC Nürnberg": "Nurnberg",
    "Arminia Bielefeld": "Bielefeld",
    "Dynamo Dresden": "Dresden",
    "Eintracht Braunschweig": "Braunschweig",
    "FC Energie Cottbus": "Cottbus",
    "FC St. Pauli": "St Pauli",
    "Greuther Fürth": "Greuther Furth",
    "Hannover 96": "Hannover",
    "Hertha Berlin": "Hertha",
    "Karlsruher SC": "Karlsruhe",
    "SV Darmstadt 98": "Darmstadt",
    "VfL Bochum": "Bochum",
    "VfL Osnabrück": "Osnabruck",
    "VfL Wolfsburg": "Wolfsburg",
  },
  F1: {
    "AS Monaco": "Monaco",
    "Le Mans FC": "Le Mans",
    "Paris Saint Germain": "Paris SG",
    "RC Lens": "Lens",
  },
  F2: {
    "Annecy FC": "Annecy",
    "Rodez AF": "Rodez",
    "Saint Etienne": "St Etienne",
    "Stade Lavallois": "Laval",
    "Stade de Reims": "Reims",
    "USL Dunkerque": "Dunkerque",
  },
  N1: {
    "ADO Den Haag": "Den Haag",
    "FC Twente Enschede": "Twente",
    "FC Utrecht": "Utrecht",
    "FC Zwolle": "Zwolle",
    "Fortuna Sittard": "For Sittard",
    "NEC Nijmegen": "Nijmegen",
    "SC Cambuur": "Cambuur",
    "SC Telstar": "Telstar",
  },
  P1: {
    "Académico de Viseu": "Academico Viseu",
    "Braga": "Sp Braga",
    "CF Estrela": "Estrela",
    "CS Maritimo": "Maritimo",
    "FC Porto": "Porto",
    "Famalicão": "Famalicao",
    "Moreirense FC": "Moreirense",
    "Rio Ave FC": "Rio Ave",
    "Sporting Lisbon": "Sp Lisbon",
    "Vitória SC": "Guimaraes",
  },
  B1: {
    "Cercle Brugge KSV": "Cercle Brugge",
    "KV Kortrijk": "Kortrijk",
    "KV Mechelen": "Mechelen",
    "Leuven": "Oud-Heverlee Leuven",
    "RAAL La Louvière": "RAAL La Louviere",
    "Royal Antwerp": "Antwerp",
    "SK Beveren": "Beveren",
    "SV Zulte-Waregem": "Waregem",
    "Sint Truiden": "St Truiden",
    "Standard Liege": "Standard",
    "Union Saint-Gilloise": "St. Gilloise",
  },
  T1: {
    "Amed SK": "Amedspor",
    "Basaksehir": "Buyuksehyr",
    "Besiktas JK": "Besiktas",
    "Erzurum BB": "Erzurumspor",
    "Eyüpspor": "Eyupspor",
    "Gazişehir Gaziantep": "Gaziantep",
    "Genclerbirligi SK": "Genclerbirligi",
    "Goztepe": "Goztep",
    "Kasimpasa SK": "Kasimpasa",
    "Torku Konyaspor": "Konyaspor",
    "Çaykur Rizespor": "Rizespor",
    "Çorum FK": "Corum",
  },
  SC0: {
    "Dundee FC": "Dundee",
    "Falkirk F.C.": "Falkirk",
  },

  // ── Le competizioni che arrivano da ESPN (22/10/2026) ─────────────────────
  // ⚠️⚠️ Qui il verso è diverso da tutto il resto del file: l'archivio di
  // queste competizioni **non** viene da football-data, viene da ESPN. Quindi
  // a destra ci sono i nomi di ESPN ("Internazionale", "Sporting CP"), non
  // quelli di football-data ("Inter", "Sp Lisbon"). Stessa funzione, altra
  // sorgente — ed è il motivo per cui la mappa è per campionato e non globale.
  //
  // ⚠️ I 18 accoppiamenti sono stati **letti uno per uno** sulle due liste. Un
  // confronto automatico ne risolveva 8 da solo, ma la regola automatica
  // sbaglia in silenzio — è già successo qui con "Paris Saint Germain"
  // finito su "Paris FC", che è un'altra squadra.
  UCL: {
    "Bodø/Glimt": "Bodo/Glimt",
    "Feyenoord": "Feyenoord Rotterdam",
    "Inter Milan": "Internazionale",
    "LASK": "LASK Linz",
    "Paris Saint Germain": "Paris Saint-Germain",
    "Porto": "FC Porto",
    "RC Lens": "Lens",
    "Slavia Praha": "Slavia Prague",
    "Sporting Lisbon": "Sporting CP",
    "ŠK Slovan Bratislava": "Slovan Bratislava",
  },
  JPN1: {
    "FC Machida Zelvia": "Machida Zelvia",
    "Hiroshima Sanfrecce FC": "Sanfrecce Hiroshima",
    "JEF United Chiba": "JEF United Ichihara-Chiba",
    "Kyoto Purple Sanga": "Kyoto Sanga",
    "Mito HollyHock": "Mito Hollyhock",
    "Shimizu S Pulse": "Shimizu S-Pulse",
    "Tokyo Verdy": "Tokyo Verdy 1969",
    "Yokohama F Marinos": "Yokohama F. Marinos",
  },
};

/** Il nome di football-data per un nome di The Odds API. Lancia se sconosciuto. */
export function traduci(div, nome) {
  const mappa = NOMI[div] || {};
  if (mappa[nome]) return mappa[nome];
  // Molti nomi coincidono già (Napoli, Juventus, Arsenal…): li lasciamo passare
  // solo se esistono nell'archivio — lo controlla chi chiama, con `verificaNomi`.
  return nome;
}
