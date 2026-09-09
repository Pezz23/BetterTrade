// BACKTEST — il cancello del progetto (STATO.md punto 4).
//
// Fa girare il modello sulle stagioni storiche contro le quote reali e misura,
// in modo onesto, se batte il mercato. Regola d'oro: NIENTE sguardo al futuro.
// Per predire la partita del giorno t il modello è ri-stimato SOLO sulle partite
// prima di t (walk-forward). Stimare su tutto e poi "predire" il passato sarebbe
// barare: le forze saprebbero già come è finita.
//
// Il verdetto viene in due tempi, come deciso:
//   1) IL MODELLO BATTE IL MERCATO A PREDIRE?  log-loss e calibrazione, fuori
//      campione. Se no, ci si ferma: un ROI positivo sarebbe fortuna.
//   2) SOLO ALLORA, IL ROI.  puntata fissa contro le quote di chiusura, con
//      intervallo di confidenza e confronto coi baseline stupidi.
//
// Uso:  node --env-file=.env scripts/backtest.js [DIV]
//         [--modello=gol|tiri]                  quale modello testare
//         [--quote=pinnacle|media|max|bet365]   contro quali quote 1X2
//         [--mercato=proporzionale|shin]        come togliere il margine
//         [--emivita=200]                        decadimento temporale (giorni)
//         [--taglio=0]                           sconto di sicurezza sulle vincite
//
// Note sulle fonti quota: `pinnacle` (chiusura, il più affilato — per il metro
// "il modello è buono?"); `bet365` (apertura, book reale, 10 stagioni — per il
// P&L realistico); `max` (migliore di ~40 book, chiusura, dal 2019/20 — prezzo
// ottimistico); `media` (media di mercato). `--taglio=0.05` toglie il 5% dalle
// vincite nette per simulare un'esecuzione pessimista (non prendi il prezzo top).

import { writeSync, readFileSync, existsSync } from 'node:fs';
import { sql as db, chiudi } from '../lib/db.js';
import { togliMargine, edge } from '../lib/mercato.js';
import { MODELLI, modelloMisto } from '../lib/modelli.js';
import { CAMPIONATI } from './import-storico.js';

// Avanzamento sincrono su stderr: bypassa il buffer di Node, così si vede in
// tempo reale a che campionato è arrivato (e quanto ci mette).
const prog = m => writeSync(2, m + '\n');

// Dati: dalla cache locale se c'è (veloce, niente rete — vedi scripts/dump-locale.js),
// altrimenti da Neon. La cache rende l'esplorazione immune ai cali di connessione.
const cacheFile = new URL('../.cache/partite.json', import.meta.url);
let perDivCache = null;
if (existsSync(cacheFile)) {
  perDivCache = new Map();
  for (const r of JSON.parse(readFileSync(cacheFile, 'utf8'))) {
    if (!perDivCache.has(r.div)) perDivCache.set(r.div, []);
    perDivCache.get(r.div).push(r);
  }
}
// Con la cache locale non serve nessuna connessione: il backtest gira offline.
const sql = perDivCache ? null : db;

// Data come stringa-giorno 'YYYY-MM-DD', sia che venga da Neon (Date) o dalla
// cache (stringa ISO). Così il raggruppamento per giornata è coerente e le
// partite dello stesso giorno finiscono nello stesso gruppo (una ri-stima al
// giorno, niente fuga di dati fra partite dello stesso giorno).
const giorno = d => (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);

// ---- argomenti ----
const args = process.argv.slice(2);
const opt = (nome, def) => {
  const a = args.find(x => x.startsWith(`--${nome}=`));
  return a ? a.split('=')[1] : def;
};
// Un campionato, una lista separata da virgole (I1,E0,D1) per esplorare in
// fretta, o niente = tutti.
const argDiv = args.find(a => !a.startsWith('--'));
const soloDiv = argDiv && !argDiv.includes(',') ? argDiv : null;
const listaDiv = argDiv ? argDiv.split(',') : null;
const nomeModello = opt('modello', 'gol');
const peso = Number(opt('peso', 0.5));   // per il modello misto: quanto pesano i gol
const modello = nomeModello === 'misto' ? modelloMisto(peso) : MODELLI[nomeModello];
if (!modello) { console.error(`Modello sconosciuto: ${nomeModello}. Disponibili: ${Object.keys(MODELLI).join(', ')}, misto`); process.exit(1); }
const fonteQuote = opt('quote', 'pinnacle');
const metodoMercato = opt('mercato', 'proporzionale');
const emivita = Number(opt('emivita', 200));
const taglio = Number(opt('taglio', 0));   // sconto proporzionale sulle vincite
const maxIter = Number(opt('maxiter', 300)); // tetto iterazioni fit (abbassa = più veloce)
const xi = Math.log(2) / emivita;

const divs = listaDiv ?? Object.keys(CAMPIONATI);
const SOGLIE = [0, 0.02, 0.05, 0.10];   // margine minimo per scommettere
const MIN_STORICO = 300;                // partite minime nella lega prima di scommettere
const MIN_PARTITE_SQ = 8;               // partite minime di UNA squadra per predirla
                                        // (con meno dati il rating non è affidabile)

// Sceglie le tre quote 1X2 di una partita secondo la fonte richiesta.
function quote1x2(r) {
  switch (fonteQuote) {
    case 'media':   return [r.avg_1, r.avg_x, r.avg_2];
    case 'max':     return [r.max_1, r.max_x, r.max_2];
    case 'bet365':  return [r.b365_1, r.b365_x, r.b365_2];
    default:        return [r.ps_1, r.ps_x, r.ps_2]; // pinnacle
  }
}
// Over/Under: Bet365 apertura se la fonte è bet365, altrimenti media di mercato.
function quoteOU(r) {
  return fonteQuote === 'bet365' ? [r.b365_over25, r.b365_under25] : [r.avg_over25, r.avg_under25];
}
// Applica lo sconto di sicurezza: riduce le vincite nette (quota−1) della frazione
// `taglio`, in modo uniforme su tutte le quote (a differenza di uno sconto fisso).
const quotaEff = q => 1 + (q - 1) * (1 - taglio);

// ---- accumulatori ----
function nuovoAcc() {
  return {
    // qualità predittiva (fuori campione, tutte le partite valutabili)
    n: 0,
    logMod1x2: 0, logMkt1x2: 0, logBase1x2: 0,
    logModOU: 0, logMktOU: 0, nOU: 0,
    calib: Array.from({ length: 10 }, () => ({ somma: 0, colpiti: 0, n: 0 })), // secchielli 0-10%,...
    // ROI per soglia e mercato
    roi1x2: SOGLIE.map(() => ({ stake: 0, profitto: 0, n: 0, profitti: [] })),
    roiOU: SOGLIE.map(() => ({ stake: 0, profitto: 0, n: 0, profitti: [] })),
    // baseline 1X2
    baseFav: { stake: 0, profitto: 0, n: 0 },
    baseCaso: { stake: 0, profitto: 0, n: 0 },
    baseCasa: { stake: 0, profitto: 0, n: 0 },
  };
}

function logLoss(prob) { return -Math.log(Math.max(prob, 1e-12)); }

// Registra una scommessa a puntata fissa (1 unità) su un esito con quota data.
function scommetti(acc, colpito, quota) {
  acc.stake += 1;
  acc.n += 1;
  const p = colpito ? quota - 1 : -1;
  acc.profitto += p;
  if (acc.profitti) acc.profitti.push(p);
}

// Intervallo di confidenza ~95% del ROI (errore standard della media dei profitti).
function icRoi(acc) {
  if (acc.n < 2) return null;
  const media = acc.profitto / acc.n;
  let v = 0;
  for (const p of acc.profitti) v += (p - media) ** 2;
  const se = Math.sqrt(v / (acc.n - 1) / acc.n);
  return { roi: media, lo: media - 1.96 * se, hi: media + 1.96 * se };
}

const globale = nuovoAcc();

for (const div of divs) {
  const t0 = Date.now();
  prog(`  ${div}: inizio…`);
  const righe = perDivCache
    ? (perDivCache.get(div) ?? [])
    : await sql`
        SELECT data, stagione, casa, trasferta, gol_casa, gol_trasferta,
               tirip_casa, tirip_trasf,
               ps_1, ps_x, ps_2, avg_1, avg_x, avg_2, max_1, max_x, max_2,
               b365_1, b365_x, b365_2, avg_over25, avg_under25, b365_over25, b365_under25
        FROM partite WHERE div = ${div} ORDER BY data, casa
      `;
  const partite = righe.map(r => {
    const [q1, qx, q2] = quote1x2(r);
    const [qov, qun] = quoteOU(r);
    return {
      data: giorno(r.data), stagione: r.stagione, casa: r.casa, trasferta: r.trasferta,
      gc: r.gol_casa, gt: r.gol_trasferta,
      tiripCasa: r.tirip_casa, tiripTrasf: r.tirip_trasf,
      q1, qx, q2, qov, qun,
    };
  });

  // Frequenze base della lega (per il baseline "prevedi sempre le frequenze medie").
  let fc = 0, fx = 0, fo = 0;
  for (const p of partite) {
    if (p.gc > p.gt) fc++; else if (p.gc === p.gt) fx++; else fo++;
  }
  const base1x2 = [fc / partite.length, fx / partite.length, fo / partite.length];

  const acc = nuovoAcc();

  // Raggruppa per data: le partite dello stesso giorno condividono lo stesso
  // taglio informativo, quindi si ri-stima una volta per giorno.
  const perData = [];
  let corrente = null;
  for (const p of partite) {
    if (!corrente || corrente.data !== p.data) { corrente = { data: p.data, ps: [] }; perData.push(corrente); }
    corrente.ps.push(p);
  }

  let stato = null;     // le forze stimate dal modello (warm-start fra giornate)
  let prefissoFine = 0; // quante partite (in ordine) sono già "passato"
  const partiteSq = new Map(); // partite pregresse per squadra (aggiornato camminando)
  const conta = sq => partiteSq.get(sq) || 0;

  for (const giornata of perData) {
    // Training = tutte le partite prima di questa data. prefissoFine punta alla
    // prima partita di oggi. Passa al modello gol E tiri: sceglie lui cosa usare.
    const training = partite.slice(0, prefissoFine).map(p => ({
      casa: p.casa, trasferta: p.trasferta,
      golCasa: p.gc, golTrasferta: p.gt,
      tiripCasa: p.tiripCasa, tiripTrasf: p.tiripTrasf, data: p.data,
    }));

    // Si scommette solo con abbastanza storico alle spalle.
    const puoScommettere = training.length >= MIN_STORICO;

    if (puoScommettere) {
      stato = modello.fit(training, {
        xi, iniziale: stato, dataRiferimento: new Date(giornata.data),
        tol: 1e-7, maxIter,
      });

      for (const p of giornata.ps) {
        // Niente scommesse/valutazioni se una delle due ha troppo pochi dati: il
        // rating non è affidabile (es. neopromossa alla prima giornata).
        if (conta(p.casa) < MIN_PARTITE_SQ || conta(p.trasferta) < MIN_PARTITE_SQ) continue;
        const pr = modello.prevedi(stato, p.casa, p.trasferta);
        if (!pr) continue; // il modello non sa predire questa partita

        // esito reale 1X2: 0=casa 1=pareggio 2=ospite
        const esito = p.gc > p.gt ? 0 : p.gc === p.gt ? 1 : 2;

        // ---- 1X2: qualità predittiva + valore ----
        if (p.q1 && p.qx && p.q2) {
          const pMod = [pr.pCasa, pr.pPareggio, pr.pOspite];
          const pMkt = togliMargine([p.q1, p.qx, p.q2], metodoMercato);
          const quote = [p.q1, p.qx, p.q2];

          acc.n++; globale.n++;
          acc.logMod1x2 += logLoss(pMod[esito]);  globale.logMod1x2 += logLoss(pMod[esito]);
          acc.logMkt1x2 += logLoss(pMkt[esito]);  globale.logMkt1x2 += logLoss(pMkt[esito]);
          acc.logBase1x2 += logLoss(base1x2[esito]); globale.logBase1x2 += logLoss(base1x2[esito]);

          // calibrazione: ogni esito è una previsione con il suo colpito 0/1
          for (let i = 0; i < 3; i++) {
            const b = Math.min(9, Math.floor(pMod[i] * 10));
            for (const A of [acc, globale]) {
              A.calib[b].somma += pMod[i]; A.calib[b].colpiti += (i === esito ? 1 : 0); A.calib[b].n++;
            }
          }

          // Quote effettive per le MIE giocate (con lo sconto di sicurezza); il
          // mercato sopra è già letto sulle quote grezze.
          const qEff = quote.map(quotaEff);

          // valore: per ogni esito con edge sopra soglia (all'effettiva), scommetti
          for (let s = 0; s < SOGLIE.length; s++) {
            for (let i = 0; i < 3; i++) {
              if (edge(pMod[i], qEff[i]) > SOGLIE[s]) {
                scommetti(acc.roi1x2[s], i === esito, qEff[i]);
                scommetti(globale.roi1x2[s], i === esito, qEff[i]);
              }
            }
          }

          // baseline (una scommessa per partita, alle stesse quote effettive)
          const favIdx = quote.indexOf(Math.min(...quote));
          scommetti(acc.baseFav, favIdx === esito, qEff[favIdx]);
          scommetti(globale.baseFav, favIdx === esito, qEff[favIdx]);
          scommetti(acc.baseCasa, esito === 0, qEff[0]);
          scommetti(globale.baseCasa, esito === 0, qEff[0]);
          // "a caso": valore atteso analitico (niente RNG) = (quota_vincente − k)/k
          const casoProfitto = (qEff[esito] - 3) / 3;
          acc.baseCaso.stake += 1; acc.baseCaso.n += 1; acc.baseCaso.profitto += casoProfitto;
          globale.baseCaso.stake += 1; globale.baseCaso.n += 1; globale.baseCaso.profitto += casoProfitto;
        }

        // ---- Over/Under 2.5: qualità predittiva + valore ----
        if (p.qov && p.qun) {
          const over = (p.gc + p.gt) >= 3 ? 0 : 1; // 0=over 1=under
          const pMod = [pr.pOver25, pr.pUnder25];
          const pMkt = togliMargine([p.qov, p.qun], metodoMercato);
          const quote = [p.qov, p.qun];

          acc.nOU++; globale.nOU++;
          acc.logModOU += logLoss(pMod[over]); globale.logModOU += logLoss(pMod[over]);
          acc.logMktOU += logLoss(pMkt[over]); globale.logMktOU += logLoss(pMkt[over]);

          const qEff = quote.map(quotaEff);
          for (let s = 0; s < SOGLIE.length; s++) {
            for (let i = 0; i < 2; i++) {
              if (edge(pMod[i], qEff[i]) > SOGLIE[s]) {
                scommetti(acc.roiOU[s], i === over, qEff[i]);
                scommetti(globale.roiOU[s], i === over, qEff[i]);
              }
            }
          }
        }
      }
    }

    // Le partite di oggi entrano nel "passato": aggiorna i conteggi per domani.
    for (const p of giornata.ps) {
      partiteSq.set(p.casa, conta(p.casa) + 1);
      partiteSq.set(p.trasferta, conta(p.trasferta) + 1);
    }
    prefissoFine += giornata.ps.length;
  }

  prog(`  ${div}: fatto in ${((Date.now() - t0) / 1000).toFixed(1)}s (${acc.n} partite 1X2)`);
  stampaLega(div, acc);
}

if (!soloDiv) { console.log(`\n${'#'.repeat(64)}`); console.log('# COMPLESSIVO (tutti i campionati)'); console.log('#'.repeat(64)); stampaLega(null, globale); }

// ---- stampa ----
function pct(x) { return (x * 100).toFixed(1) + '%'; }
function roiPct(acc) { return acc.n ? ((acc.profitto / acc.stake) * 100).toFixed(2) + '%' : '—'; }

function stampaLega(div, acc) {
  const nome = div ? `${div} — ${CAMPIONATI[div]}` : 'COMPLESSIVO';
  console.log(`\n${'='.repeat(64)}`);
  console.log(nome);
  console.log(`modello: ${nomeModello} · quote: ${fonteQuote}${taglio ? ` (−${(taglio*100).toFixed(0)}% sicurezza)` : ''} · mercato: ${metodoMercato} · emivita: ${emivita} gg`);
  console.log(`partite valutate (fuori campione): ${acc.n} (1X2), ${acc.nOU} (O/U)`);
  if (!acc.n) { console.log('(storico insufficiente per scommettere)'); return; }

  console.log('\n--- 1) IL MODELLO BATTE IL MERCATO A PREDIRE? (log-loss, più basso = meglio) ---');
  const lMod = acc.logMod1x2 / acc.n, lMkt = acc.logMkt1x2 / acc.n, lBase = acc.logBase1x2 / acc.n;
  console.log(`  1X2:  modello ${lMod.toFixed(4)}   mercato ${lMkt.toFixed(4)}   (frequenze base ${lBase.toFixed(4)})`);
  console.log(`        → il modello predice ${lMod < lMkt ? 'MEGLIO' : 'PEGGIO'} del mercato ` +
              `(${lMod < lMkt ? '−' : '+'}${(Math.abs(lMod - lMkt)).toFixed(4)})`);
  if (acc.nOU) {
    const oMod = acc.logModOU / acc.nOU, oMkt = acc.logMktOU / acc.nOU;
    console.log(`  O/U:  modello ${oMod.toFixed(4)}   mercato ${oMkt.toFixed(4)}   ` +
                `→ ${oMod < oMkt ? 'MEGLIO' : 'PEGGIO'}`);
  }

  console.log('\n  Calibrazione 1X2 (quando dice X%, succede davvero?):');
  console.log('    prob.dichiarata  osservata   n');
  for (let b = 0; b < 10; b++) {
    const c = acc.calib[b];
    if (c.n < 20) continue;
    console.log(`    ${(b*10).toString().padStart(2)}-${b*10+10}%        ` +
                `${pct(c.colpiti / c.n).padStart(6)}   ${String(c.n).padStart(6)}   ` +
                `(media modello ${pct(c.somma / c.n)})`);
  }

  console.log('\n--- 2) ROI a puntata fissa (solo se il punto 1 regge) ---');
  console.log('    soglia edge   1X2: n / ROI [IC 95%]              O/U: n / ROI');
  for (let s = 0; s < SOGLIE.length; s++) {
    const a = acc.roi1x2[s], o = acc.roiOU[s];
    const ic = icRoi(a);
    const icStr = ic ? `[${pct(ic.lo)}, ${pct(ic.hi)}]` : '';
    console.log(`    ≥${(SOGLIE[s]*100).toFixed(0).padStart(2)}%         ` +
                `${String(a.n).padStart(6)} / ${roiPct(a).padStart(8)} ${icStr.padEnd(22)}` +
                `   ${String(o.n).padStart(6)} / ${roiPct(o).padStart(8)}`);
  }

  console.log('\n  Baseline 1X2 (stessi incontri, una scommessa a partita):');
  console.log(`    segui il favorito: ${roiPct(acc.baseFav)}   sempre in casa: ${roiPct(acc.baseCasa)}   a caso: ${roiPct(acc.baseCaso)}`);
}

console.log();
