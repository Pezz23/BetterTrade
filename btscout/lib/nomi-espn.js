// I nomi che ESPN scrive diversamente da noi, scritti A MANO.
//
// ⚠️⚠️ **Non si aggiungono con un automatismo di somiglianza.** Il 5/10/2026
// un abbinamento automatico mise il **PSG sul Paris FC**: due squadre diverse
// della stessa città, nomi vicinissimi, risultato sulla partita sbagliata. Un
// risultato sbagliato nell'archivio non si vede e non si corregge — sporca
// tutte le misure che ci stanno sopra.
//
// Chi aggiunge una riga qui **ha guardato le due squadre** e sa che sono la
// stessa. Tutto quello che non sta qui e non si aggancia da solo finisce nella
// tabella `importazioni`, e aspetta una persona.
//
// ⚠️ ESPN espone cinque nomi per squadra (`displayName`, `shortDisplayName`,
// `name`, `location`, `abbreviation`): l'aggancio automatico li prova tutti, e
// in Serie A come in Premier ne risolve **18 su 20**. Qui restano le eccezioni.
export const ALIAS = {
  // Serie A (I1) — verificati il 12/10/2026
  'AS Roma': 'Roma',
  'Internazionale': 'Inter',
  // ⚠️ Trovata dal recupero storico: ESPN scrive SPAL tutto maiuscolo, noi
  // "Spal". 114 partite in archivio, verificate il 12/10/2026.
  'SPAL': 'Spal',

  // Spagna (SP1, SP2) — verificati il 12/10/2026 contro i nomi in archivio
  'Atlético Madrid': 'Ath Madrid',
  'Real Sociedad': 'Sociedad',
  'Real Sociedad II': 'Sociedad B',
  'Celta Vigo': 'Celta',
  'RC Celta Fortuna': 'Celta B',
  'Espanyol': 'Espanol',
  'Real Oviedo': 'Oviedo',
  'Racing Santander': 'Santander',
  'Sporting Gijón': 'Sp Gijon',
  'CD Sabadell': 'Sabadell',
  'FC Andorra': 'Andorra',

  // Germania (D1)
  'Eintracht Frankfurt': 'Ein Frankfurt',
  'FC Cologne': 'FC Koln',

  'Deportivo': 'La Coruna',          // il Deportivo de La Coruña

  // Germania (D2)
  'Borussia Mönchengladbach': "M'gladbach",
  'TSV Eintracht Braunschweig': 'Braunschweig',
  'Dynamo Dresden': 'Dresden',
  '1. FC Nürnberg': 'Nurnberg',
  'St. Pauli': 'St Pauli',

  // Francia (F1, F2)
  // ⚠️⚠️ **Paris Saint-Germain va su `Paris SG`, NON su `Paris FC`.** Sono due
  // club diversi della stessa città, ed è esattamente l'abbinamento che il
  // 5/10/2026 un automatismo di somiglianza aveva sbagliato. Cercando "paris"
  // in archivio escono tutt'e due: per questo questa riga è scritta a mano.
  'Paris Saint-Germain': 'Paris SG',
  'Le Havre AC': 'Le Havre',
  'Clermont Foot': 'Clermont',
  'Pau': 'Pau FC',
  'Saint-Étienne': 'St Etienne',

  // Olanda (N1)
  'ADO Den Haag': 'Den Haag',
  'FC Groningen': 'Groningen',
  'FC Utrecht': 'Utrecht',
  'Fortuna Sittard': 'For Sittard',
  'NEC Nijmegen': 'Nijmegen',
  'PEC Zwolle': 'Zwolle',

  // Portogallo (P1)
  'Académico de Viseu': 'Academico Viseu',
  'Braga': 'Sp Braga',
  'FC Porto': 'Porto',
  'Vitória de Guimaraes': 'Guimaraes',

  // Turchia (T1)
  // ⚠️ `Buyuksehyr` è il vecchio nome del Başakşehir (İstanbul Büyükşehir
  // Belediyespor): football-data non l'ha mai aggiornato.
  'Istanbul Basaksehir': 'Buyuksehyr',
  'Amed SFK': 'Amedspor',
  'Caykur Rizespor': 'Rizespor',
  'Erzurum BB': 'Erzurumspor',

  // Germania (D2, seguito)
  'Karlsruher SC': 'Karlsruhe',

  // Francia (F2, seguito)
  'Stade Laval': 'Laval',
  'Red Star FC 93': 'Red Star',
  'Rodez Aveyron': 'Rodez',
  'Dijon FCO': 'Dijon',

  // Olanda (N1, seguito)
  'FC Twente': 'Twente',

  // Portogallo (P1, seguito)
  // ⚠️ `Sporting CP` è lo Sporting di **Lisbona**, non lo Sp Braga: in
  // archivio convivono `Sp Lisbon` e `Sp Braga`, e confonderli sarebbe lo
  // stesso errore del PSG.
  'Sporting CP': 'Sp Lisbon',

  // Turchia (T1, seguito)
  'Çorum FK': 'Corum',
  'Goztepe': 'Goztep',

  // Belgio (B1)
  // ⚠️ `Waasland-Beveren` è il vecchio nome dello SK Beveren: stesso club.
  'Waasland-Beveren': 'Beveren',
  'KV Kortrijk': 'Kortrijk',
  'KV Mechelen': 'Mechelen',
  'Standard Liege': 'Standard',
  // ⚠️ Sint-Truiden, il club di Sint-Truidense VV (STVV): in archivio è
  // `St Truiden`. Verificato il 15/10/2026 guardando **tutte** le 26 squadre
  // belghe dell'archivio, perché fra loro c'è anche `St. Gilloise` — che è
  // l'Union Saint-Gilloise di Bruxelles, un altro club. Due nomi che
  // cominciano per "St": è esattamente la trappola Paris FC / Paris SG, e si
  // evita guardando l'elenco invece della somiglianza.
  'Sint-Truidense': 'St Truiden',
  'Union St.-Gilloise': 'St. Gilloise',
  'Zulte-Waregem': 'Waregem',

  // Inghilterra (E0, E1)
  'Tottenham Hotspur': 'Tottenham',
  'Nottingham Forest': "Nott'm Forest",
  'Norwich City': 'Norwich',
  'Lincoln City': 'Lincoln',
};

/**
 * Il nostro nome per una squadra ESPN, o `null` se non lo sappiamo.
 * @param {{nomi: string[]}} squadra  la squadra come la dà ESPN
 * @param {Set<string>} nostri        i nomi che usiamo noi in quel campionato
 */
// ⚠️ **Togliere gli accenti non è indovinare, è normalizzare.** `Almería` e
// `Almeria` sono la stessa stringa scritta in due codifiche; `PSG` e `Paris FC`
// no. Per questo questo passaggio è automatico e gli alias restano a mano: due
// squadre diverse che differiscono **solo** per un accento non esistono.
const senzaAccenti = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function nostroNome(squadra, nostri) {
  // la stessa normalizzazione sui nostri nomi, calcolata una volta
  if (!nostri._piatti) {
    nostri._piatti = new Map();
    for (const x of nostri) nostri._piatti.set(senzaAccenti(x).toLowerCase(), x);
  }
  for (const n of squadra.nomi) {
    if (nostri.has(n)) return n;
    const a = ALIAS[n];
    if (a && nostri.has(a)) return a;
    const piatto = nostri._piatti.get(senzaAccenti(n).toLowerCase());
    if (piatto) return piatto;
  }
  return null;
}
