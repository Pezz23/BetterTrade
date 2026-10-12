// ESPN — la seconda fonte dei risultati.
//
// ⚠️ **API non documentata**: è quella che alimenta il loro sito. Nessun
// contratto, nessun avviso se cambia. Per questo ESPN **affianca** e non
// sostituisce football-data, e per questo si va piano con le richieste.
//
// Cosa dà che football-data non dà: i risultati **in giornata** (il 12/10/2026
// football-data era tre settimane indietro) e il **possesso palla**.
// Cosa non dà: le quote.

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** I nostri codici campionato → gli slug di ESPN. Provati uno per uno. */
export const CAMPIONATI = {
  E0: 'eng.1', E1: 'eng.2', I1: 'ita.1', I2: 'ita.2', SP1: 'esp.1', SP2: 'esp.2',
  D1: 'ger.1', D2: 'ger.2', F1: 'fra.1', F2: 'fra.2', P1: 'por.1', N1: 'ned.1',
  T1: 'tur.1', B1: 'bel.1', SC0: 'sco.1',
};

// ⚠️ Una pausa fra le chiamate, di proposito. Non c'è un limite dichiarato, e
// proprio per questo non si corre: una fonte non documentata si tiene buona.
export const PAUSA_MS = 350;
const dormi = (ms) => new Promise(r => setTimeout(r, ms));

async function prendi(url, tentativi = 3) {
  for (let i = 1; i <= tentativi; i++) {
    try {
      const r = await fetch(url, { headers: { 'accept-encoding': 'gzip' } });
      if (r.ok) return await r.json();
      // 404 su una data senza partite è normale, non è un errore da ritentare
      if (r.status === 404) return null;
      throw new Error(`http ${r.status}`);
    } catch (e) {
      if (i === tentativi) throw new Error(`${url} → ${e.message}`);
      await dormi(PAUSA_MS * i * 3);
    }
  }
}

/** Le squadre di un campionato, con tutti i nomi che ESPN usa per ciascuna. */
export async function squadre(div) {
  const d = await prendi(`${BASE}/${CAMPIONATI[div]}/teams`);
  return (d?.sports?.[0]?.leagues?.[0]?.teams || []).map(x => x.team).map(t => ({
    id: t.id,
    // ⚠️ Cinque nomi per squadra, e servono tutti: football-data scrive
    // "Man City", ESPN lo chiama "Manchester City" ma espone anche
    // `shortDisplayName` = "Man City". Misurato sulla Premier: 18 su 20 si
    // agganciano senza scrivere un alias a mano.
    nomi: [t.displayName, t.shortDisplayName, t.name, t.location, t.abbreviation].filter(Boolean),
  }));
}

/** Tutti i nomi che ESPN usa per una squadra, dal più lungo al più corto. */
const nomiDi = (t) => t ? [t.displayName, t.shortDisplayName, t.name, t.location, t.abbreviation].filter(Boolean) : [];

/** Le partite di un giorno (`aaaammgg`), coi soli dati dello scoreboard. */
export async function partiteDelGiorno(div, giorno) {
  const d = await prendi(`${BASE}/${CAMPIONATI[div]}/scoreboard?dates=${giorno}`);
  await dormi(PAUSA_MS);
  return (d?.events || []).map(e => {
    const c = e.competitions[0];
    const casa = c.competitors.find(x => x.homeAway === 'home');
    const osp = c.competitors.find(x => x.homeAway === 'away');
    return {
      id: e.id,
      // ⚠️ La data di ESPN è UTC. Per gli orari europei non cambia giorno, ma
      // l'aggancio si fa comunque con una finestra di ±1: costa niente e
      // copre le partite spostate di poche ore.
      data: e.date.slice(0, 10),
      finita: c.status?.type?.completed === true,
      casa: casa?.team?.displayName, trasferta: osp?.team?.displayName,
      // ⚠️ I nomi si leggono **dalla partita**, non dalla rosa attuale del
      // campionato: con `/teams` si conoscono solo le squadre di quest'anno, e
      // tutto lo storico diventa "nome sconosciuto" — Empoli e Hellas Verona
      // non sono più in Serie A, ma nel 2024 ci giocavano (trovato il
      // 12/10/2026 provando il recupero storico).
      nomiCasa: nomiDi(casa?.team), nomiTrasferta: nomiDi(osp?.team),
      golCasa: casa?.score == null ? null : Number(casa.score),
      golTrasferta: osp?.score == null ? null : Number(osp.score),
    };
  });
}

/** Le statistiche di una partita: tiri, tiri in porta, possesso, angoli. */
export async function statistiche(div, idEvento) {
  const d = await prendi(`${BASE}/${CAMPIONATI[div]}/summary?event=${idEvento}`);
  await dormi(PAUSA_MS);
  const squadre = d?.boxscore?.teams;
  if (!squadre || squadre.length < 2) return null;
  const leggi = (t) => {
    const s = Object.fromEntries((t.statistics || []).map(x => [x.name, x.displayValue]));
    const num = (k) => s[k] == null || s[k] === '' ? null : Number(String(s[k]).replace('%', ''));
    return { tiri: num('totalShots'), tirip: num('shotsOnTarget'), possesso: num('possessionPct'), angoli: num('wonCorners') };
  };
  // ⚠️ L'ordine in `boxscore.teams` è casa poi trasferta, ma non è documentato:
  // si controlla con `homeAway` quando c'è, altrimenti si rinuncia invece di
  // indovinare — statistiche scambiate fra le due squadre sarebbero peggio che
  // non averle.
  const casa = squadre.find(t => t.homeAway === 'home') || squadre[0];
  const osp = squadre.find(t => t.homeAway === 'away') || squadre[1];
  if (!casa || !osp || casa === osp) return null;
  return { casa: leggi(casa), trasferta: leggi(osp) };
}
