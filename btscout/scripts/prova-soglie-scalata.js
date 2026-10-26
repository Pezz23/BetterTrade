// LE SOGLIE DELLA SCALATA — cosa succede al variare del filtro della pagina.
//
// ⚠️⚠️ **Esiste perché il tasto `✓ CONSIGLIATO` porta la sua misura scritta
// addosso** (`CONSIGLIATO.perche` in `app/src/lib/scalata.js`): *"resa 98,3% su
// 5.517 partite, 3,4 al giorno"*. Quella frase era stata prodotta da un giro di
// misura che **non era stato conservato**, quindi spostando la soglia non si
// poteva più dire la verità sul tasto — e un'app che consiglia deve poter dire
// perché, o quella parola non va scritta (Mattia, 15/10/2026).
//
// ⚠️ Misura il **filtro vero della pagina**: attendibilità ≥ s **e** scelta ≥ s
// (le due si muovono insieme col tasto), più il pavimento di quota per gamba.
// Non è il filtro delle spin e non è la tabella delle soglie di
// `prova-indicatori.js`, che risponde a un'altra domanda.
//
//   node --env-file=.env scripts/prova-soglie-scalata.js
//   ... --stagioni=8 --quota=1.30 --soglie=50,54,58,61,65,68,72
//
// ⚠️⚠️ **I backtest si chiedono a Mattia prima di lanciarli** (21/10/2026).

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';
import { giornoLocale, weekendDi } from '../lib/date.js';
import { QUOTA_MINIMA_GAMBA, QUOTA_MINIMA_SCHEDINA, componiPasso } from '../../app/src/lib/scalata.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const STAGIONI = Number(arg('stagioni', 8));
const QUOTA = Number(arg('quota', QUOTA_MINIMA_GAMBA));
const SOGLIE = String(arg('soglie', '50,54,58,61,62,65,68,70,72')).split(',').map(Number);
// la soglia di cui si vuole il dettaglio stagione per stagione
const DETTAGLIO = Number(arg('dettaglio', 61));
// ⚠️ `--solo-att` (26/10/2026): dal metodo «Metà utile» il consigliato della
// pagina è **solo l'attendibilità** (Mattia), senza la scelta. Senza
// l'opzione resta il filtro di prima, attendibilità **e** scelta.
const SOLO_ATT = process.argv.includes('--solo-att');
const passa = (v, soglia) => v.att >= soglia && (SOLO_ATT || (v.scelta != null && v.scelta >= soglia));

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });

// ⚠️ Il denominatore di "a giornata" sono **tutti i giorni di gioco**, non i
// giorni in cui la soglia trova qualcosa: una soglia che dà 4 partite in due
// giorni su mille non ne dà 2 al giorno.
const giorniTotali = new Set(valutate.map(v => giornoLocale(v.data))).size;

// il materiale: solo le partite che la pagina potrebbe mettere in una gamba
const base = valutate.filter(v => Number(v.quota) >= QUOTA);

console.log(`stagioni ${stagioni.join(', ')} · gamba ≥ ${QUOTA.toFixed(2)} · ${giorniTotali} giorni di gioco`);
console.log(`${base.length} partite sopra il pavimento di quota, su ${valutate.length}\n`);
// ⚠️⚠️ **La colonna che decide davvero è l'ultima.** Una soglia alta azzecca di
// più e rende di più, ma la scalata non gioca partite singole: gioca una
// SCHEDINA da quota 2,00, cioè due o tre gambe nello stesso blocco. Se la
// soglia lascia una partita al giorno, il passo non si compone e la resa più
// alta è la resa di una giocata che non esiste.
// ⚠️ Qui un passo = **un giorno**, perché `partite` non ha l'ora: è la lettura
// conservativa, nella pagina un giorno con più fasce ospita più passi.
console.log(`   ${'soglia'.padStart(6)} ${'partite'.padStart(8)} ${'giorni'.padStart(7)} ${'a giornata'.padStart(11)} ${'azzeccate'.padStart(10)} ${'RESA'.padStart(8)}  ${'giorni con un passo ≥'.padStart(22)} ${QUOTA_MINIMA_SCHEDINA.toFixed(2)}`);

for (const s of SOGLIE) {
  const soglia = s / 100;
  // il filtro della card SELEZIONE: attendibilità **e** scelta sopra la soglia.
  // ⚠️ `scelta` è null quando il campo contraddice il mercato, e quelle restano
  // fuori da sole — è il motivo per cui la soglia sulla scelta non è un doppione.
  const dentro = base.filter(v => passa(v, soglia));
  if (!dentro.length) { console.log(`   ${String(s).padStart(5)}% nessuna partita`); continue }
  const vinte = dentro.filter(v => v.vinta).length;
  const ritorno = dentro.reduce((a, v) => a + (v.vinta ? Number(v.quota) : 0), 0);
  const n = dentro.length;
  const resa = ritorno / n;
  // margine al 95% sulla resa: la deviazione di una singola scommessa è
  // quota × √(p(1−p)), e senza di lui due righe diverse sembrano due risultati.
  const p = vinte / n;
  const qMedia = dentro.reduce((a, v) => a + Number(v.quota), 0) / n;
  const err = 1.96 * Math.sqrt(p * (1 - p) / n) * qMedia * 100;
  const perGiorno = new Map();
  for (const v of dentro) {
    const g = giornoLocale(v.data);
    if (!perGiorno.has(g)) perGiorno.set(g, []);
    perGiorno.get(g).push(v);
  }
  const giorni = perGiorno.size;
  let componibili = 0;
  for (const [, cands] of perGiorno) {
    if (componiPasso(cands, { quotaMinima: QUOTA_MINIMA_SCHEDINA, pavimento: QUOTA }).gambe) componibili++;
  }
  console.log(`   ${String(s).padStart(5)}% ${String(n).padStart(8)} ${String(giorni).padStart(7)} ${(n / giorniTotali).toFixed(1).padStart(11)} ${(p * 100).toFixed(1).padStart(9)}% ${(resa * 100).toFixed(1).padStart(7)}% ±${String(err.toFixed(1)).padEnd(4)} ${String(componibili).padStart(10)} su ${giorniTotali} giorni (${(componibili / giorniTotali * 100).toFixed(0)}%)`);
}
// ── E adesso la domanda vera: quanti WEEKEND reggono una scalata ────────────
// ⚠️⚠️ **La scalata non vive in un giorno, vive in un weekend**, e il vincolo
// di Mattia è *"in due giornate devo recuperare il capitale"*: servono **due
// passi componibili nello stesso weekend**, non due partite buone in due mesi.
// È il metro che una tabella per giorno non mostra.
const weekendTotali = new Set(valutate.map(v => weekendDi(v.data))).size;
console.log(`── e per WEEKEND (${weekendTotali} in otto stagioni) ──`);
console.log(`   ${'soglia'.padStart(6)} ${'con 1 passo'.padStart(12)} ${'con 2 passi'.padStart(12)} ${'con 4 passi'.padStart(12)}`);
for (const s of SOGLIE) {
  const soglia = s / 100;
  const dentro = base.filter(v => passa(v, soglia));
  const perWk = new Map();
  for (const v of dentro) {
    const wk = weekendDi(v.data), g = giornoLocale(v.data);
    if (!perWk.has(wk)) perWk.set(wk, new Map());
    const giorni = perWk.get(wk);
    if (!giorni.has(g)) giorni.set(g, []);
    giorni.get(g).push(v);
  }
  let uno = 0, due = 0, quattro = 0;
  for (const [, giorni] of perWk) {
    let passi = 0;
    for (const [, cands] of giorni) {
      if (componiPasso(cands, { quotaMinima: QUOTA_MINIMA_SCHEDINA, pavimento: QUOTA }).gambe) passi++;
    }
    if (passi >= 1) uno++;
    if (passi >= 2) due++;
    if (passi >= 4) quattro++;
  }
  const q = (x) => `${String(x).padStart(4)} (${(x / weekendTotali * 100).toFixed(0)}%)`;
  console.log(`   ${String(s).padStart(5)}% ${q(uno).padStart(12)} ${q(due).padStart(12)} ${q(quattro).padStart(12)}`);
}
// ── Stagione per stagione, alla soglia scelta ───────────────────────────────
// ⚠️⚠️ **La regola di questo progetto: media PIÙ dettaglio per stagione, mai
// un percorso solo** (pagata il 10/10/2026, quando una fascia sembrava rendere
// 1.158 € ed erano sei stagioni in perdita più una fortunata).
// ⚠️ E qui le due colonne vanno lette con metri diversi: **la resa di una
// stagione sola non dice niente** (il margine è il triplo), mentre **il
// materiale sì** — quante partite e quanti weekend giocabili dipendono da
// quanti campionati e quante quote abbiamo, e quello cambia negli anni.
{
  const soglia = DETTAGLIO / 100;
  console.log(`── stagione per stagione, con soglia ${DETTAGLIO}% ──`);
  console.log(`   ${'stag.'.padStart(6)} ${'partite'.padStart(8)} ${'a giornata'.padStart(11)} ${'azzeccate'.padStart(10)} ${'RESA'.padStart(8)}  ${'weekend: 1 passo'.padStart(17)} ${'2 passi'.padStart(9)}`);
  for (const st of stagioni) {
    const della = base.filter(v => v.stagione === st);
    const giorniSt = new Set(della.map(v => giornoLocale(v.data))).size;
    const dentro = della.filter(v => passa(v, soglia));
    if (!dentro.length) { console.log(`   ${String(st).padStart(6)} nessuna partita`); continue }
    const n = dentro.length;
    const vinte = dentro.filter(v => v.vinta).length, p = vinte / n;
    const resa = dentro.reduce((a, v) => a + (v.vinta ? Number(v.quota) : 0), 0) / n;
    const qMedia = dentro.reduce((a, v) => a + Number(v.quota), 0) / n;
    const err = 1.96 * Math.sqrt(p * (1 - p) / n) * qMedia * 100;
    const perWk = new Map();
    for (const v of dentro) {
      const wk = weekendDi(v.data), g = giornoLocale(v.data);
      if (!perWk.has(wk)) perWk.set(wk, new Map());
      const gg = perWk.get(wk);
      if (!gg.has(g)) gg.set(g, []);
      gg.get(g).push(v);
    }
    const wkTot = new Set(della.map(v => weekendDi(v.data))).size;
    let uno = 0, due = 0;
    for (const [, giorni] of perWk) {
      let passi = 0;
      for (const [, cands] of giorni) {
        if (componiPasso(cands, { quotaMinima: QUOTA_MINIMA_SCHEDINA, pavimento: QUOTA }).gambe) passi++;
      }
      if (passi >= 1) uno++;
      if (passi >= 2) due++;
    }
    console.log(`   ${String(st).padStart(6)} ${String(n).padStart(8)} ${(n / giorniSt).toFixed(1).padStart(11)} ${(p * 100).toFixed(1).padStart(9)}% ${(resa * 100).toFixed(1).padStart(7)}% ±${String(err.toFixed(1)).padEnd(4)} ${`${uno}/${wkTot} (${(uno / wkTot * 100).toFixed(0)}%)`.padStart(16)} ${`${due} (${(due / wkTot * 100).toFixed(0)}%)`.padStart(10)}`);
  }
  console.log('');
}
await sql.end();
