// ROAD TO WEEKEND: la scalata misurata sulle partite vere, otto stagioni.
//
// ⚠️ **Un passo = un GIORNO**, e non è una scelta: `partite` non ha la colonna
// `ora` (solo `prossime_partite`), quindi nell'archivio non si può ordinare per
// calcio d'inizio. È la lettura **conservativa**: nella pagina, dove l'orario
// c'è, un giorno con più fasce potrà ospitare più passi — quindi i numeri qui
// sono un pavimento, non un tetto.
//
// ⚠️ Il bankroll **evolve**: ogni weekend la posta è il 10% di quello che c'è
// in quel momento. È la regola a frazione fissa, e il suo pregio è che il
// bankroll non può andare a zero — decade piano, e il tasso di decadimento *è*
// il deficit di resa.
//
//   node --env-file=.env scripts/prova-scalata.js --stagioni=8 --quota=1.7
//   ... --soglia=0.60 --bankroll=100

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';
import { weekendDi } from '../lib/date.js';
import { componiPasso, simula, REGOLE, QUOTA_MINIMA_GAMBA } from '../../app/src/lib/scalata.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8), QUOTA = arg('quota', 1.7);
const SOGLIA = arg('soglia', 0.60), BANKROLL = arg('bankroll', 100);

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });
console.log(`stagioni ${stagioni.join(', ')} · quota minima ${QUOTA.toFixed(2)} · attendibilità ≥ ${(SOGLIA * 100).toFixed(0)}% · gamba ≥ ${QUOTA_MINIMA_GAMBA}\n`);

// le candidate di ogni giorno, raggruppate per weekend
const perWeekend = new Map();
for (const v of valutate) {
  if (v.att < SOGLIA || v.quota < QUOTA_MINIMA_GAMBA) continue;
  const wk = weekendDi(v.data);
  if (!perWeekend.has(wk)) perWeekend.set(wk, new Map());
  const g = perWeekend.get(wk);
  if (!g.has(v.data)) g.set(v.data, []);
  g.get(v.data).push(v);
}
const weekend = [...perWeekend.keys()].sort();
console.log(`${weekend.length} weekend con almeno una candidata\n`);

const mediana = (l) => { const s = [...l].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 };

// ── Com'è fatto un PASSO, prima di guardare le scalate ──────────────────────
// ⚠️ È il numero che spiega tutto il resto: se il passo rende meno di 100
// nessuna regola di incasso può salvare la scalata. Si misura **senza** la
// progressione, un passo alla volta, come se ognuno fosse una giocata a sé.
{
  console.log('── com\'è fatto un passo, per quota minima richiesta ──');
  console.log(`   ${'quota'.padEnd(7)} ${'passi'.padStart(6)} ${'gambe'.padStart(6)} ${'quota media'.padStart(12)} ${'vince'.padStart(7)} ${'RESA'.padStart(7)}`);
  for (const qm of [1.30, 1.50, 1.70, 2.00, 2.50]) {
    let n = 0, vinti = 0, sq = 0, sg = 0, ritorno = 0;
    for (const wk of weekend) for (const [, cands] of perWeekend.get(wk)) {
      const c = componiPasso(cands, { quotaMinima: qm });
      if (!c.gambe) continue;
      n++; sq += c.quota; sg += c.gambe.length;
      const ok = c.gambe.every(x => x.vinta);
      if (ok) { vinti++; ritorno += c.quota }
    }
    if (!n) { console.log(`   ${qm.toFixed(2).padEnd(7)} nessun passo costruibile`); continue }
    console.log(`   ${qm.toFixed(2).padEnd(7)} ${String(n).padStart(6)} ${(sg/n).toFixed(2).padStart(6)} ${(sq/n).toFixed(3).padStart(12)} ${(vinti/n*100).toFixed(1).padStart(6)}% ${(ritorno/n*100).toFixed(1).padStart(6)}%`);
  }
  console.log('');
}

// ── Il margine d'errore della resa di un passo ──────────────────────────────
// ⚠️ Senza di questo la tabella sopra inganna: a quota 2,50 la resa sembra
// **102,2%**, cioè in guadagno, ma con 591 passi a quota 3 l'errore è di dieci
// punti. Tutte quelle righe dicono la stessa cosa — circa 98% — e le
// differenze fra loro sono rumore.
{
  console.log('── e quanto vale quel numero (margine al 95%) ──');
  for (const qm of [1.30, 1.70, 2.50]) {
    let n = 0, vinti = 0, sq = 0, ritorno = 0;
    for (const wk of weekend) for (const [, cands] of perWeekend.get(wk)) {
      const c = componiPasso(cands, { quotaMinima: qm });
      if (!c.gambe) continue;
      n++; sq += c.quota;
      if (c.gambe.every(x => x.vinta)) { vinti++; ritorno += c.quota }
    }
    const p = vinti / n, q = sq / n;
    const err = 1.96 * Math.sqrt(p * (1 - p) / n) * q * 100;
    console.log(`   quota ${qm.toFixed(2)}: resa ${(ritorno / n * 100).toFixed(1)}% ±${err.toFixed(1)}  su ${n} passi`);
  }
  console.log('');
}

for (const regola of Object.keys(REGOLE)) {
  let bankroll = BANKROLL, scalate = 0, rientrate = 0, saltati = 0, morti1 = 0;
  const risultati = [], perPasso = [0, 0, 0, 0, 0];   // quanti passi vinti di fila
  let minimo = BANKROLL, massimo = BANKROLL;

  for (const wk of weekend) {
    const giorni = [...perWeekend.get(wk).keys()].sort();
    // ⚠️ I passi si compongono **in ordine di giorno**: la posta di uno è
    // quello che il precedente ha rigiocato, quindi l'ordine non è un dettaglio.
    const passi = [];
    for (const g of giorni) {
      const c = componiPasso(perWeekend.get(wk).get(g), { quotaMinima: QUOTA });
      if (!c.gambe) continue;                      // quel giorno non regge un passo
      passi.push({ quota: c.quota, vinto: c.gambe.every(x => x.vinta), giorno: g });
    }
    if (!passi.length) { saltati++; continue }

    const s = simula(passi, { bankroll, regola });
    scalate++;
    if (s.rientrata) rientrate++;
    if (s.registro[0]?.esito === 'perso') morti1++;
    perPasso[s.registro.filter(x => x.esito === 'vinto').length]++;
    risultati.push(s.risultato);
    bankroll += s.risultato;
    minimo = Math.min(minimo, bankroll); massimo = Math.max(massimo, bankroll);
    if (bankroll < 10) break;                      // sotto i 10 la posta è 1: si chiude
  }

  const R = REGOLE[regola];
  const tot = risultati.reduce((a, x) => a + x, 0);
  console.log(`── ${R.nome} — ${R.desc}`);
  console.log(`   ${scalate} scalate · ${saltati} weekend saltati (nessun passo costruibile)`);
  console.log(`   rientra la posta  ${(rientrate / scalate * 100).toFixed(0)}%   ·   muore al 1° passo  ${(morti1 / scalate * 100).toFixed(0)}%`);
  console.log(`   passi vinti di fila: ${perPasso.map((n, i) => `${i}→${n}`).join(' · ')}`);
  console.log(`   risultato  mediana ${mediana(risultati).toFixed(2)} · media ${(tot / scalate).toFixed(2)} · migliore ${Math.max(...risultati).toFixed(2)} · peggiore ${Math.min(...risultati).toFixed(2)}`);
  console.log(`   BANKROLL   ${BANKROLL} → ${bankroll.toFixed(2)}  (minimo toccato ${minimo.toFixed(2)} · massimo ${massimo.toFixed(2)})\n`);
}

// ── OTTO PERCORSI, non uno ──────────────────────────────────────────────────
// ⚠️⚠️ **La regola di questo progetto**: con pochi cicli ad alta varianza si
// guarda la **mediana** e il dettaglio per stagione, mai la media di un solo
// percorso. Il 15/10 il percorso unico su otto stagioni ha dato 100 → 10, che
// sembra una condanna: ma è **una pescata**, e la riga sotto dice quanto sono
// diverse fra loro.
console.log('── il bankroll stagione per stagione (parte da 100 ogni volta) ──');
for (const regola of Object.keys(REGOLE)) {
  const finali = [];
  for (const st of stagioni) {
    let bankroll = 100;
    for (const wk of weekend) {
      const giorni = [...perWeekend.get(wk).keys()].sort();
      const dellaStagione = perWeekend.get(wk).get(giorni[0])?.[0]?.stagione;
      if (dellaStagione !== st) continue;
      const passi = [];
      for (const g of giorni) {
        const c = componiPasso(perWeekend.get(wk).get(g), { quotaMinima: QUOTA });
        if (c.gambe) passi.push({ quota: c.quota, vinto: c.gambe.every(x => x.vinta) });
      }
      if (!passi.length) continue;
      bankroll += simula(passi, { bankroll, regola }).risultato;
      if (bankroll < 10) break;
    }
    finali.push(bankroll);
  }
  const ord = [...finali].sort((a, b) => a - b);
  console.log(`   ${REGOLE[regola].nome.padEnd(20)} ${finali.map(x => x.toFixed(0)).join(' · ')}`);
  console.log(`   ${''.padEnd(20)} mediana ${ord[Math.floor(ord.length / 2)].toFixed(0)} · in utile ${finali.filter(x => x > 100).length} stagioni su ${finali.length}`);
}

await sql.end();
