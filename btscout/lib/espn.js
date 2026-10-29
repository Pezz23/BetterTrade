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
  // ── Le competizioni che football-data NON copre (22/10/2026) ───────────────
  // ⚠️⚠️ Per questi ESPN non è la seconda fonte: **è l'unica**. Nei quindici
  // campionati sopra ESPN arricchisce righe che football-data ha già portato
  // (e in caso di dubbio la riga aspetta una persona); qui invece crea la
  // riga, e non c'è niente con cui confrontarla. È il motivo per cui
  // `importa-competizione.js` scrive `fonte = 'espn'` e si rifiuta di
  // indovinare.
  UCL: 'uefa.champions',   // Champions League — storico fino al 2016
  UEL: 'uefa.europa',      // Europa League
  UECL: 'uefa.europa.conf',// Conference League
  N2: 'ned.2',             // Olanda 2 (Keuken Kampioen Divisie)
  JPN1: 'jpn.1',           // Giappone J1 — ⚠️ stagione ad anno solare
};

/**
 * I nomi estesi e il calendario delle competizioni nuove.
 *
 * ⚠️ `partite.campionato` è **obbligatoria**, e per i quindici campionati
 * vecchi si legge da una riga già in archivio (`importa-espn.js` fa così).
 * Qui la riga in archivio non c'è ancora: il nome va scritto, una volta.
 * ⚠️⚠️ `annoSolare` per il Giappone: la J1 va da febbraio a dicembre, quindi
 * la stagione **è l'anno**. Infilarla nello schema agosto-luglio
 * significherebbe spezzare ogni campionato giapponese in due stagioni nostre,
 * e `calcola-andamento` conterebbe mezze stagioni.
 */
export const COMPETIZIONI = {
  UCL:  { nome: 'UEFA Champions League', da: 2016 },
  UEL:  { nome: 'UEFA Europa League', da: 2016 },
  UECL: { nome: 'UEFA Conference League', da: 2021 },
  N2:   { nome: 'Eerste Divisie', da: 2016 },
  JPN1: { nome: 'J1 League', da: 2016, annoSolare: true },
};

/**
 * Le partite di un **mese** (`aaaamm`), in una chiamata sola.
 *
 * ⚠️⚠️ È la differenza fra un'ora e un minuto. Lo scoreboard di ESPN accetta
 * anche un mese intero, e **non** un intervallo `da-a` (provato il 22/10/2026:
 * `dates=20251001-20251031` torna zero, `dates=202510` torna 27 partite).
 * Camminando giorno per giorno una stagione di Champions sono ~330 chiamate,
 * a mesi sono **12**.
 * ⚠️ Non si usa per i quindici campionati vecchi, dove le date si chiedono
 * all'archivio: lì le partite le conosciamo già.
 */
export async function partiteDelMese(div, mese) {
  const d = await prendi(`${BASE}/${CAMPIONATI[div]}/scoreboard?dates=${mese}&limit=500`);
  await dormi(PAUSA_MS);
  return (d?.events || []).map(leggiEvento).filter(Boolean);
}

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
  return (d?.events || []).map(leggiEvento).filter(Boolean);
}

/**
 * Un evento dello scoreboard nella forma che usiamo noi.
 *
 * ⚠️ **Una funzione sola per il giorno e per il mese**: è la stessa risposta di
 * ESPN, e due letture della stessa risposta prima o poi leggono due cose
 * diverse — il difetto che questo progetto ha già pagato con `emailDi()` in
 * tre copie e `iniziaDopo` in due.
 */
function leggiEvento(e) {
    const c = e.competitions?.[0];
    if (!c) return null;
    const casa = c.competitors.find(x => x.homeAway === 'home');
    const osp = c.competitors.find(x => x.homeAway === 'away');
    if (!casa || !osp) return null;
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
}

/**
 * Le statistiche di una partita: tiri, tiri in porta, possesso, angoli,
 * cartellini, falli.
 *
 * ⚠️⚠️ **`tentativi` esiste per il recupero storico** (22/10/2026). ESPN non
 * ha il riepilogo delle partite vecchie, e ogni tentativo a vuoto costa la
 * sua attesa crescente: misurato sul recupero della Champions, una riga
 * passava da 0,84 a **4,5 secondi**, cioè da venti minuti a un'ora e mezza.
 * Per una partita di ieri tre tentativi sono giusti — lì un buco è un
 * problema di rete; per una del 2016 è una risposta, e si accetta.
 */
export async function statistiche(div, idEvento, tentativi = 3) {
  const d = await prendi(`${BASE}/${CAMPIONATI[div]}/summary?event=${idEvento}`, tentativi);
  await dormi(PAUSA_MS);
  const squadre = d?.boxscore?.teams;
  if (!squadre || squadre.length < 2) return null;
  const leggi = (t) => {
    const s = Object.fromEntries((t.statistics || []).map(x => [x.name, x.displayValue]));
    const num = (k) => s[k] == null || s[k] === '' ? null : Number(String(s[k]).replace('%', ''));
    // ⚠️⚠️ **I cartellini c'erano e si buttavano via** (trovato il 22/10/2026):
    // ESPN li espone come `yellowCards` e `redCards` in ogni riepilogo, e la
    // tabella ha `gialli_*` e `rossi_*` da sempre. Nessuno li leggeva.
    return { tiri: num('totalShots'), tirip: num('shotsOnTarget'), possesso: num('possessionPct'),
      angoli: num('wonCorners'), gialli: num('yellowCards'), rossi: num('redCards'),
      // ⚠️ Anche i falli si buttavano via, allo stesso modo (29/10/2026).
      falli: num('foulsCommitted') };
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
