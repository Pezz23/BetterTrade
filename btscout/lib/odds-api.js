// The Odds API: le partite in programma con le quote di decine di bookmaker,
// tre-quattro settimane in anticipo. Seconda fonte accanto a football-data,
// che pubblica solo il prossimo blocco.
//
// Piano gratuito: 500 crediti al mese. /events non costa niente; /odds costa
// 1 credito **per mercato per regione**. Il giro costa 45 crediti: 30 per l'1X2
// (eu+uk × h2h) e 15 per l'over/under (eu × totals), cioè ~360 al mese con due
// giri a settimana.
//
// ⚠️ Bet365 NON c'è (verificato 16/09/2026, né in eu né in uk). Il consenso si
// calcola dai bookmaker presenti; la quota Bet365 la porta football-data.

export const SPORT = {
  E0: 'soccer_epl',                   E1: 'soccer_efl_champ',
  I1: 'soccer_italy_serie_a',         I2: 'soccer_italy_serie_b',
  SP1: 'soccer_spain_la_liga',        SP2: 'soccer_spain_segunda_division',
  D1: 'soccer_germany_bundesliga',    D2: 'soccer_germany_bundesliga2',
  F1: 'soccer_france_ligue_one',      F2: 'soccer_france_ligue_two',
  N1: 'soccer_netherlands_eredivisie', P1: 'soccer_portugal_primeira_liga',
  B1: 'soccer_belgium_first_div',     T1: 'soccer_turkey_super_league',
  SC0: 'soccer_spl',
  // ⚠️⚠️ **Le competizioni che football-data non copre** (22/10/2026). Lo
  // storico di queste arriva da ESPN, che però **non ha le quote**: senza
  // quote non c'è consenso, e senza consenso non c'è attendibilità — cioè la
  // partita entrerebbe in archivio ma non potrebbe mai comparire fra le
  // consigliate. Qui si chiude il cerchio: The Odds API le copre
  // (verificato il 22/10), quindi le partite **future** di Champions hanno
  // il consenso come tutte le altre.
  // ⚠️ Costano crediti come gli altri campionati: ~2 a giro ciascuno su 500
  // al mese.
  // ── Le competizioni che football-data non copre (22/10/2026) ──────────────
  // ⚠️⚠️ **Qui si chiude il cerchio.** Lo storico di queste arriva da ESPN,
  // che non ha le quote: senza quote non c'è consenso, senza consenso non c'è
  // attendibilità, e la partita resterebbe in archivio senza poter comparire
  // fra le consigliate. The Odds API le copre, quindi le partite **future**
  // hanno il consenso come tutte le altre.
  // ⚠️ Il ponte fra i nomi sta in `lib/nomi-squadre.js`, ed è l'unica cosa che
  // le teneva spente: in archivio le squadre si chiamano come le chiama ESPN
  // ("Internazionale"), su The Odds API no ("Inter Milan").
  // ⚠️ Costano ~3 crediti a giro ciascuna, su 500 al mese.
  UCL: 'soccer_uefa_champs_league',
  JPN1: 'soccer_japan_j_league',
  // ⚠️ Europa e Conference **restano spente**: il 22/10 The Odds API non aveva
  // nemmeno una partita futura per loro, quindi accenderle costerebbe crediti
  // per zero righe. Si accendono quando il torneo riparte.
  // UEL: 'soccer_uefa_europa_league',
};

const BASE = 'https://api.the-odds-api.com/v4';

function chiave() {
  if (!process.env.ODDS_API_KEY) {
    console.error('✗ ODDS_API_KEY mancante in btscout/.env — chiave gratuita su the-odds-api.com');
    process.exit(1);
  }
  return process.env.ODDS_API_KEY;
}

// Come lib/rete.js: il DNS singhiozza, e una chiamata fallita per rete non
// costa crediti — si può riprovare senza rimorsi. Un errore HTTP invece (chiave
// sbagliata, crediti finiti) si propaga subito.
export async function chiama(percorso, parametri = {}, tentativi = 4) {
  const url = new URL(BASE + percorso);
  url.searchParams.set('apiKey', chiave());
  for (const [k, v] of Object.entries(parametri)) url.searchParams.set(k, v);
  let ultimo;
  for (let t = 1; t <= tentativi; t++) {
    try {
      const res = await fetch(url);
      const crediti = { usati: Number(res.headers.get('x-requests-last') || 0), rimasti: Number(res.headers.get('x-requests-remaining') || 0) };
      if (!res.ok) throw Object.assign(new Error(`${percorso} → HTTP ${res.status}: ${await res.text()}`), { http: true });
      return { dati: await res.json(), crediti };
    } catch (e) {
      if (e.http) throw e;
      ultimo = e;
      if (t < tentativi) await new Promise(r => setTimeout(r, t * 4000));
    }
  }
  throw new Error(`${percorso} → rete: ${ultimo.cause?.code || ultimo.message} dopo ${tentativi} tentativi`);
}

/** Le partite in programma di un campionato, senza quote. Gratis. */
export const eventi = div => chiama(`/sports/${SPORT[div]}/events/`);

/** Le partite con le quote 1X2 di tutti i bookmaker eu+uk. 2 crediti. */
export const quote = div => chiama(`/sports/${SPORT[div]}/odds/`, { regions: 'eu,uk', markets: 'h2h', oddsFormat: 'decimal' });

/**
 * Le partite col mercato over/under. **1 credito** (una regione sola).
 *
 * ⚠️ **Una regione e non due**: il costo è mercati × regioni, e con `eu` i
 * bookmaker sono già 11-15 per partita — verificato il 15/10/2026 su 172
 * partite di 14 campionati, **copertura 172 su 172**. Raddoppiare la spesa per
 * qualche book in più non cambia una media.
 * ⚠️ **Ogni bookmaker quota la SUA linea principale**, non la 2,5: su 2.227
 * quote la linea era 2,5 nel 67% dei casi, 3,5 nel 23%, il resto sparso. Chi
 * legge questi dati deve filtrare sul `point`, **non** dare per scontato il 2,5.
 * ⚠️ La linea 2,5 esatta per tutti i book esisterebbe (`alternate_totals`) ma
 * **solo sull'endpoint per singolo evento, a 1 credito per partita**: 170
 * crediti per weekend, fuori dal piano gratuito. Stessa cosa per il
 * **Goal/NoGoal** (`btts`), che esiste e costa uguale — ed è la risposta al
 * "punto C" di STATO.md: il mercato c'è, non è accessibile.
 */
export const totali = div => chiama(`/sports/${SPORT[div]}/odds/`, { regions: 'eu', markets: 'totals', oddsFormat: 'decimal' });
