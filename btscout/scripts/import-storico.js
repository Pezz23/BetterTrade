// Importa lo storico di football-data.co.uk in Neon.
//
// Uso:  DATABASE_URL='postgres://...' node scripts/import-storico.js
//
// È idempotente: rilanciarlo non duplica nulla e aggiorna le partite già
// presenti. Serve per la stagione in corso, che cambia ogni settimana.

import { neon } from '@neondatabase/serverless';
import { pathToFileURL } from 'node:url';

export const CAMPIONATI = {
  E0: 'Premier League', E1: 'Championship',
  I1: 'Serie A', I2: 'Serie B',
  SP1: 'Liga', SP2: 'Liga 2',
  D1: 'Bundesliga', D2: '2. Bundesliga',
  F1: 'Ligue 1', F2: 'Ligue 2',
};

export const STAGIONI = ['1617', '1718', '1819', '1920', '2021', '2122', '2223', '2324', '2425', '2526'];

// Quote di chiusura. Pinnacle (PSC*) è il riferimento più severo — margine
// basso — ma dal 2025/26 copre solo metà partite. La media di mercato (AvgC*)
// è completa ma più larga. Si salvano entrambe: quale usare lo decide il
// backtest, e rifare l'import per scoprirlo costerebbe un'ora.
//
// Attenzione: fino al 2018/19 le colonne AvgC*/AvgC>2.5 non esistono (c'erano
// le Betbrain BbAv*, che NON sono quote di chiusura e quindi non si usano:
// mescolarle falserebbe il backtest). Per quelle stagioni restano le PSC*, e
// l'Over/Under non ha quote di chiusura affatto.
const COLONNE = {
  // 1X2 di chiusura
  ps_1: 'PSCH', ps_x: 'PSCD', ps_2: 'PSCA',          // Pinnacle (il più affilato)
  avg_1: 'AvgCH', avg_x: 'AvgCD', avg_2: 'AvgCA',    // media di mercato
  max_1: 'MaxCH', max_x: 'MaxCD', max_2: 'MaxCA',    // migliore di ~40 book
  // 1X2 di apertura Bet365 (book reale, quota che prendi davvero; 10 stagioni)
  b365_1: 'B365H', b365_x: 'B365D', b365_2: 'B365A',
  // Over/Under 2.5
  avg_over25: 'AvgC>2.5', avg_under25: 'AvgC<2.5',           // media chiusura
  b365_over25: 'B365>2.5', b365_under25: 'B365<2.5',         // Bet365 apertura
};

// Statistiche di gioco (interi). Materia prima per i modelli: i tiri in porta
// sono un "xG del povero"; angoli e cartellini catturano dominio e aggressività;
// i gol del primo tempo separano com'è iniziata la partita da com'è finita.
const STAT = {
  tiri_casa: 'HS', tiri_trasf: 'AS',          // tiri totali
  tirip_casa: 'HST', tirip_trasf: 'AST',      // tiri in porta
  angoli_casa: 'HC', angoli_trasf: 'AC',      // calci d'angolo
  gialli_casa: 'HY', gialli_trasf: 'AY',      // cartellini gialli
  rossi_casa: 'HR', rossi_trasf: 'AR',        // cartellini rossi
  gol1t_casa: 'HTHG', gol1t_trasf: 'HTAG',    // gol del primo tempo
};

// Stesso club, nome diverso a seconda della stagione: senza questa mappa il
// modello lo vede come due squadre e dimezza lo storico di entrambe.
// La lista viene da un confronto di tutti i nomi delle 10 stagioni; l'unico
// caso vero emerso è la Cultural Leonesa. Va ricontrollata quando si aggiunge
// una stagione — vedi scripts/verifica-storico.js.
const ALIAS = {
  SP2: { 'Leonesa': 'Cultural Leonesa' },
};

function normalizzaSquadra(nome, div) {
  return ALIAS[div]?.[nome] ?? nome;
}

async function creaSchema(sql) {
  // La tabella è interamente ricostruibile dai CSV: a ogni import la si rifà da
  // zero. Semplifica i cambi di schema (aggiungere colonne non richiede ALTER) e
  // il rebuild costa un paio di minuti. NB: tocca solo `partite`, mai la chat.
  await sql`DROP TABLE IF EXISTS partite`;
  await sql`
    CREATE TABLE partite (
      id SERIAL PRIMARY KEY,
      div TEXT NOT NULL,
      campionato TEXT NOT NULL,
      stagione TEXT NOT NULL,
      data DATE NOT NULL,
      casa TEXT NOT NULL,
      trasferta TEXT NOT NULL,
      gol_casa INT NOT NULL,
      gol_trasferta INT NOT NULL,
      esito CHAR(1) NOT NULL,
      tiri_casa INT, tiri_trasf INT,
      tirip_casa INT, tirip_trasf INT,
      angoli_casa INT, angoli_trasf INT,
      gialli_casa INT, gialli_trasf INT,
      rossi_casa INT, rossi_trasf INT,
      gol1t_casa INT, gol1t_trasf INT,
      ps_1 REAL, ps_x REAL, ps_2 REAL,
      avg_1 REAL, avg_x REAL, avg_2 REAL,
      max_1 REAL, max_x REAL, max_2 REAL,
      b365_1 REAL, b365_x REAL, b365_2 REAL,
      avg_over25 REAL, avg_under25 REAL,
      b365_over25 REAL, b365_under25 REAL,
      UNIQUE (div, stagione, data, casa, trasferta)
    )
  `;
  await sql`CREATE INDEX partite_data_idx ON partite (data)`;
  await sql`CREATE INDEX partite_squadre_idx ON partite (div, casa, trasferta)`;
}

// I CSV usano dd/mm/yy sulle stagioni vecchie e dd/mm/yyyy su quelle recenti.
// Interpretare "17/08/24" come 1924 passerebbe inosservato fino al backtest.
export function parseData(s) {
  const m = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec((s || '').trim());
  if (!m) return null;
  const [, gg, mm, aa] = m;
  const anno = aa.length === 4 ? aa : `20${aa}`;
  return `${anno}-${mm}-${gg}`;
}

function parseQuota(v) {
  const n = parseFloat((v || '').trim());
  return Number.isFinite(n) && n > 1 ? n : null;
}

function parseIntero(v) {
  const n = parseInt((v || '').trim(), 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

// Parser CSV minimale: football-data non usa virgolette né virgole nei campi.
function parseCsv(testo) {
  const righe = testo.replace(/^﻿/, '').split(/\r?\n/).filter(r => r.trim());
  const intestazione = righe[0].split(',').map(c => c.trim());
  return righe.slice(1).map(riga => {
    const celle = riga.split(',');
    return Object.fromEntries(intestazione.map((c, i) => [c, celle[i]]));
  });
}

export async function scarica(stagione, div) {
  const url = `https://www.football-data.co.uk/mmz4281/${stagione}/${div}.csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return parseCsv(await res.text());
}

export function estrai(righe, stagione, div) {
  const partite = [];
  let scartate = 0;

  for (const r of righe) {
    const data = parseData(r.Date);
    const golCasa = parseInt(r.FTHG, 10);
    const golTrasferta = parseInt(r.FTAG, 10);
    const casa = normalizzaSquadra((r.HomeTeam || '').trim(), div);
    const trasferta = normalizzaSquadra((r.AwayTeam || '').trim(), div);

    // I CSV hanno righe di coda vuote e, raramente, partite senza risultato
    // (rinviate). Una partita senza gol non è un 0-0: è un dato che non c'è.
    if (!data || !casa || !trasferta || !Number.isInteger(golCasa) || !Number.isInteger(golTrasferta)) {
      scartate++;
      continue;
    }

    const quote = {};
    for (const [campo, colonna] of Object.entries(COLONNE)) {
      quote[campo] = parseQuota(r[colonna]);
    }
    const stat = {};
    for (const [campo, colonna] of Object.entries(STAT)) {
      stat[campo] = parseIntero(r[colonna]);
    }

    partite.push({
      div, campionato: CAMPIONATI[div], stagione, data, casa, trasferta,
      gol_casa: golCasa, gol_trasferta: golTrasferta,
      esito: golCasa > golTrasferta ? 'H' : golCasa < golTrasferta ? 'A' : 'D',
      ...stat, ...quote,
    });
  }
  return { partite, scartate };
}

async function salva(sql, partite) {
  // Un INSERT per partita sarebbe ~35.000 round-trip HTTP verso Neon. A blocchi
  // di 200 l'import sta in qualche minuto invece che in un'ora.
  const BLOCCO = 200;
  for (let i = 0; i < partite.length; i += BLOCCO) {
    const blocco = partite.slice(i, i + BLOCCO);
    await sql.transaction(blocco.map(p => sql`
      INSERT INTO partite (
        div, campionato, stagione, data, casa, trasferta,
        gol_casa, gol_trasferta, esito,
        tiri_casa, tiri_trasf, tirip_casa, tirip_trasf,
        angoli_casa, angoli_trasf, gialli_casa, gialli_trasf,
        rossi_casa, rossi_trasf, gol1t_casa, gol1t_trasf,
        ps_1, ps_x, ps_2, avg_1, avg_x, avg_2, max_1, max_x, max_2,
        b365_1, b365_x, b365_2, avg_over25, avg_under25, b365_over25, b365_under25
      ) VALUES (
        ${p.div}, ${p.campionato}, ${p.stagione}, ${p.data}, ${p.casa}, ${p.trasferta},
        ${p.gol_casa}, ${p.gol_trasferta}, ${p.esito},
        ${p.tiri_casa}, ${p.tiri_trasf}, ${p.tirip_casa}, ${p.tirip_trasf},
        ${p.angoli_casa}, ${p.angoli_trasf}, ${p.gialli_casa}, ${p.gialli_trasf},
        ${p.rossi_casa}, ${p.rossi_trasf}, ${p.gol1t_casa}, ${p.gol1t_trasf},
        ${p.ps_1}, ${p.ps_x}, ${p.ps_2}, ${p.avg_1}, ${p.avg_x}, ${p.avg_2},
        ${p.max_1}, ${p.max_x}, ${p.max_2}, ${p.b365_1}, ${p.b365_x}, ${p.b365_2},
        ${p.avg_over25}, ${p.avg_under25}, ${p.b365_over25}, ${p.b365_under25}
      )
    `));
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL mancante.');
    process.exit(1);
  }

  // FASE 1 — scarica e analizza TUTTI i CSV in memoria. Se anche uno fallisce
  // (rete instabile), si annulla senza toccare il database: niente `DROP TABLE`
  // se non abbiamo già tutti i dati in mano. Così un calo di rete non lascia mai
  // la tabella vuota o a metà.
  const tutte = [];
  const problemi = [];
  for (const stagione of STAGIONI) {
    const conteggi = [];
    for (const div of Object.keys(CAMPIONATI)) {
      const righe = await scarica(stagione, div); // se la rete cade, lancia e abortisce
      const { partite, scartate } = estrai(righe, stagione, div);
      tutte.push(...partite);
      conteggi.push(`${div}:${partite.length}`);
      if (scartate > 2) problemi.push(`${stagione}/${div}: ${scartate} righe scartate`);
    }
    console.log(`scaricato ${stagione}  ${conteggi.join('  ')}`);
  }

  // FASE 2 — solo ora tocca il database: ricrea la tabella e inserisce tutto.
  const sql = neon(databaseUrl);
  await creaSchema(sql);
  await salva(sql, tutte);

  console.log(`\nImportate ${tutte.length} partite.`);
  if (problemi.length) {
    console.log('\nDa guardare:');
    for (const p of problemi) console.log(`  - ${p}`);
  }
}

// Solo se eseguito direttamente: così le funzioni sopra restano importabili da
// uno script di verifica senza far partire l'import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
