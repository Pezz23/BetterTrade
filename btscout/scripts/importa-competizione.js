// IMPORTA UNA COMPETIZIONE INTERA DA ESPN — Champions, Europa, Olanda 2, J1.
//
//   node --env-file=.env scripts/importa-competizione.js --comp=UCL            (prova a vuoto)
//   node --env-file=.env scripts/importa-competizione.js --comp=UCL --esegui
//   pomelli: --da=2016 --a=2026 --comp=UCL,UEL,N2,JPN1
//
// ⚠️⚠️ **Qui ESPN non è la seconda fonte: è l'UNICA.** Negli altri quindici
// campionati football-data porta la riga e ESPN la arricchisce, quindi ogni
// numero ha un secondo parere; in Champions non c'è niente con cui
// confrontarlo. Per questo:
//   · si importano **solo le partite finite** — una riga senza risultato non è
//     una partita giocata, è un calendario;
//   · si scrive `fonte = 'espn'`, così una query potrà sempre dire da dove
//     viene un numero e quale parte dell'archivio ha un solo testimone;
//   · **niente quote**: ESPN non le ha. Vedi il blocco in fondo.
//
// ⚠️ **I nomi delle squadre sono quelli di ESPN**, non quelli di
// football-data: "Internazionale" e non "Inter", "Atlético Madrid" e non
// "Ath Madrid". Dentro la competizione sono coerenti — ed è quello che serve
// per le medie di squadra. ⚠️⚠️ Ma **non si agganciano da sé allo stesso club
// nel suo campionato**: unire Champions e Serie A per la stessa squadra vuole
// la tabella dei nomi (`lib/nomi-espn.js`), e non è questo script a farlo.

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, COMPETIZIONI } from '../lib/espn.js';
import { aggiornaCompetizione, mesiDi } from '../lib/risultati-espn.js';

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const ESEGUI = process.argv.includes('--esegui');
const COMPS = arg('comp', 'UCL').split(',').filter(c => COMPETIZIONI[c] && CAMPIONATI[c]);
const DA = Number(arg('da', 0));
const A = Number(arg('a', new Date().getFullYear()));

if (!COMPS.length) {
  console.error('✗ nessuna competizione valida. Disponibili:', Object.keys(COMPETIZIONI).join(' '));
  process.exit(1);
}

// ⚠️ La stagione (anno solare per il Giappone) e l'inserimento stanno in
// `lib/risultati-espn.js` dal 30/10/2026: li usa anche la funzione di Supabase
// del tasto «Aggiorna risultati».

const dormi = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Una scrittura che sopravvive alla connessione che cade.
 *
 * ⚠️⚠️ **Trovato sul campo la notte del 22/10/2026**: dopo un'ora di lavoro
 * continuo il pooler di Supabase ha chiuso la connessione (`ECONNRESET`) e il
 * recupero è **morto a metà Europa League**, con Conference e Olanda 2 mai
 * partite. Non era ESPN: era il database. Un recupero che dura ore deve
 * aspettarselo — un'eccezione non gestita butta via tutto il tempo rimasto,
 * non le righe già scritte.
 * ⚠️ Si può riprovare senza pensarci perché la scrittura è **idempotente**
 * (`on conflict do nothing`): nel dubbio, due volte la stessa riga non fa
 * danno.
 */
async function conRipetizione(fn, tentativi = 4) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tentativi) throw e;
      console.log(`   ⚠ scrittura fallita (${e.code || e.message}), riprovo fra ${i * 2}s`);
      await dormi(i * 2000);
    }
  }
}
async function unaCompetizione(comp) {
  const info = COMPETIZIONI[comp];
  const daAnno = Math.max(DA || info.da, info.da);
  console.log(`\n── ${comp} · ${info.nome} · ${daAnno}-${A} ${ESEGUI ? '' : '(prova a vuoto)'}`);
  // ⚠️ Un anno solare di mesi, non una stagione: una stagione europea sta a
  // cavallo di due anni, e chiedere i dodici mesi di ciascuno li copre
  // entrambi senza doverci ragionare.
  const mesi = [];
  for (let anno = daAnno; anno <= A; anno++) mesi.push(...mesiDi(anno));
  const r = await aggiornaCompetizione(sql, comp, {
    mesi, esegui: ESEGUI, ripeti: conRipetizione,
    avanza: (n) => process.stdout.write(`   ${n} nuove…\r`),
    avviso: (m) => console.log(`   ⚠ ${m}`),
  });
  console.log(`   già in archivio: ${r.giaInArchivio}`);
  console.log(`   ${ESEGUI ? 'scritte' : 'da scrivere'}: ${r.nuove} · già viste o non finite: ${r.saltate} · senza statistiche: ${r.senzaStat}`);
  return r.nuove;
}

let totale = 0;
for (const c of COMPS) totale += await unaCompetizione(c);

console.log(`\n${ESEGUI ? '✓ scritte' : '→ scriverebbe'} ${totale} partite`);
// ⚠️⚠️ **Nessuna quota, ed è un limite da sapere, non un difetto da correggere
// qui.** L'attendibilità di BetterTrade È il consenso dei bookmaker: senza
// quote queste partite hanno i gol, i tiri, gli angoli e i cartellini, ma
// **non hanno un'attendibilità** e non possono comparire nella lista delle
// consigliate. Le quote delle partite FUTURE di Champions esistono su The Odds
// API (`soccer_uefa_champs_league`, verificato il 22/10/2026); quelle storiche
// non le ha nessuno gratis.
if (!ESEGUI) console.log('  (niente è stato scritto: aggiungi --esegui)');
await chiudi();
