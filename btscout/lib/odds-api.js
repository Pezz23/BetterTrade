// The Odds API: le partite in programma con le quote di decine di bookmaker,
// tre-quattro settimane in anticipo. Seconda fonte accanto a football-data,
// che pubblica solo il prossimo blocco.
//
// Piano gratuito: 500 crediti al mese. /events non costa niente; /odds costa
// 1 credito per regione. Con eu+uk sono 2 crediti per campionato, 30 per giro,
// ~260 al mese con due giri a settimana.
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
