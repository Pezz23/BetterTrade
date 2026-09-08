// Stima il modello Dixon-Coles su ogni campionato dai dati di Neon e stampa i
// controlli di sanità. NON scrive niente e NON è il backtest: serve a vedere se
// le forze stimate hanno senso (le squadre forti risultano forti? il fattore
// campo è plausibile? ρ è la piccola correzione negativa attesa?) prima di
// costruirci sopra il backtest, che è il vero cancello del progetto.
//
// Uso:  node --env-file=.env scripts/fit-modello.js
//       node --env-file=.env scripts/fit-modello.js I1   (un solo campionato)

import { neon } from '@neondatabase/serverless';
import { fit, prevedi } from '../lib/dixon-coles.js';
import { CAMPIONATI } from './import-storico.js';

const sql = neon(process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL mancante.'); process.exit(1); }

const soloDiv = process.argv[2];
const divs = soloDiv ? [soloDiv] : Object.keys(CAMPIONATI);

for (const div of divs) {
  const righe = await sql`
    SELECT data, casa, trasferta, gol_casa, gol_trasferta
    FROM partite WHERE div = ${div} ORDER BY data
  `;
  const partite = righe.map(r => ({
    casa: r.casa, trasferta: r.trasferta,
    golCasa: r.gol_casa, golTrasferta: r.gol_trasferta, data: r.data,
  }));

  const m = fit(partite);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`${div} — ${CAMPIONATI[div]}`);
  console.log(`${partite.length} partite, ${m.squadre.length} squadre, ${m.iterazioni} iterazioni`);
  console.log(`riferimento: ${new Date(m.dataRiferimento).toISOString().slice(0,10)}  ` +
              `emivita decadimento: ${Math.round(Math.log(2)/m.xi)} giorni`);
  console.log(`fattore campo: ${m.fattoreCampo.toFixed(3)}   rho: ${m.rho.toFixed(4)}`);

  // Solo le squadre della stagione più recente: le altre hanno peso quasi nullo
  // e forze poco significative (retrocesse anni fa).
  const ultima = await sql`SELECT MAX(stagione) AS s FROM partite WHERE div = ${div}`;
  const attuali = await sql`
    SELECT DISTINCT casa AS sq FROM partite WHERE div = ${div} AND stagione = ${ultima[0].s}
  `;
  const insieme = new Set(attuali.map(r => r.sq));
  const ordina = (chiave, cresc) => m.squadre
    .filter(s => insieme.has(s))
    .sort((a, b) => cresc ? m[chiave][a] - m[chiave][b] : m[chiave][b] - m[chiave][a])
    .slice(0, 6);

  console.log('\nAttacco più forte:');
  for (const s of ordina('attacco', false)) console.log(`  ${s.padEnd(18)} ${m.attacco[s].toFixed(3)}`);
  console.log('Difesa più solida (valore basso = subisce meno):');
  for (const s of ordina('difesa', true)) console.log(`  ${s.padEnd(18)} ${m.difesa[s].toFixed(3)}`);

  // Smell test di calibrazione, in-sample: la media dei gol predetti deve essere
  // vicina a quella reale, e la quota di vittorie casalinghe predetta vicina a
  // quella osservata. Non è il backtest (stessi dati del fit), ma un errore
  // grosso qui vorrebbe dire un bug.
  let golRealiTot = 0, golPrevTot = 0, casaPrev = 0, casaReale = 0, usate = 0;
  for (const p of partite) {
    if (!(p.casa in m.attacco) || !(p.trasferta in m.attacco)) continue;
    const pr = prevedi(m, p.casa, p.trasferta);
    golPrevTot += pr.lambda + pr.mu;
    golRealiTot += p.golCasa + p.golTrasferta;
    casaPrev += pr.pCasa;
    casaReale += p.golCasa > p.golTrasferta ? 1 : 0;
    usate++;
  }
  console.log('\nCalibrazione in-sample (smell test, non il backtest):');
  console.log(`  gol/partita — reali ${(golRealiTot/usate).toFixed(2)}  predetti ${(golPrevTot/usate).toFixed(2)}`);
  console.log(`  vittorie in casa — reali ${(100*casaReale/usate).toFixed(1)}%  predette ${(100*casaPrev/usate).toFixed(1)}%`);
}

console.log();
