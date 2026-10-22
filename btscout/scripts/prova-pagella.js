// IL VOTO PAGELLA — un riassunto solo dei tre indicatori, coi pesi misurati.
//
// ⚠️⚠️ **Nasce da una richiesta precisa di Mattia (22/10/2026)**: *"voglio un
// riassunto dei 3 voti, non un quarto indicatore"*, e *"a pari ATT e VPM, ma
// con quota più alta, il voto deve essere maggiore"*. Serve a **ordinare e
// filtrare**, non a promettere una percentuale.
//
// ⚠️ **Perché i pesi si misurano invece di fare la media.** `scelta` È già
// `att + 0,10 × (VPM−5,5)/4,5`: in una media dei tre, l'attendibilità
// conterebbe due volte e VPM due volte. E una media di indici **non è
// monotòna nella probabilità di vincere** — stesso numero, rischi diversi.
//
// ⚠️⚠️ **E la quota entra come BONUS LIMITATO, non come moltiplicatore.**
// `resa = quota × att` è il peggior selettore misurato (51,2% di azzeccate
// contro il 60,3% dell'attendibilità) perché lascia che la quota **compensi**
// una probabilità più bassa. Qui la quota può solo **spostare di poco** due
// partite già quasi pari: è il tie-break che Mattia descrive, con un tetto.
// ⚠️ E il bonus guarda `resa − 1`, cioè **quanto il prezzo giocato paga sopra
// la probabilità del consenso**: a pari attendibilità, una quota più alta
// vuol dire che il book paga più di quanto il mercato implica. È il ruolo
// della resa scritto da sempre — *dice se il prezzo conviene, non cosa
// giocare*.
//
//   node --env-file=.env scripts/prova-pagella.js [--stagioni=8]

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';
import { giornoLocale } from '../lib/date.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });
const dati = valutate.filter(v => v.att != null && v.quota > 1 && v.vinta != null);
console.log(`stagioni ${stagioni.join(', ')} · ${dati.length} partite\n`);

// ── 1. quanto vale ciascuno da solo ─────────────────────────────────────────
const fasce = (nome, val, tagli) => {
  console.log(`── ${nome}: quando dice tot, quante volte arriva`);
  for (let i = 0; i < tagli.length - 1; i++) {
    const g = dati.filter(v => { const x = val(v); return x != null && x >= tagli[i] && x < tagli[i + 1] });
    if (g.length < 50) continue;
    const vinte = g.filter(v => v.vinta).length;
    console.log(`   ${tagli[i]}–${tagli[i + 1]}  ${String(g.length).padStart(6)} partite   arriva ${(vinte / g.length * 100).toFixed(1)}%`);
  }
  console.log('');
};
fasce('ATTENDIBILITÀ', v => v.att * 100, [40, 50, 55, 60, 65, 70, 75, 100]);
fasce('VPM', v => v.vpm, [5.5, 6, 6.5, 7, 7.5, 8, 8.5, 11]);
fasce('SCELTA', v => v.scelta == null ? null : v.scelta * 100, [40, 50, 55, 60, 65, 70, 75, 100]);

// ⚠️ Il disaccordo (scelta nulla) non si nasconde: nella pagella deve pesare,
// perché un valore nullo **non si può ordinare** e Mattia la userà per
// ordinare. Qui si misura quanto vale davvero.
{
  const d = dati.filter(v => v.vpm != null && v.scelta == null);
  const a = dati.filter(v => v.scelta != null);
  const r = (g) => g.length ? `${(g.filter(v => v.vinta).length / g.length * 100).toFixed(1)}% · resa ${(g.reduce((s, v) => s + (v.vinta ? v.quota : 0), 0) / g.length * 100).toFixed(1)}%` : '—';
  console.log(`── il DISACCORDO campo/mercato (scelta nulla)`);
  console.log(`   ${d.length} partite: ${r(d)}`);
  console.log(`   le altre ${a.length}: ${r(a)}\n`);
}

// ── 2. i pesi, tarati sulle PRIME stagioni e giudicati sulle ULTIME ──────────
// ⚠️⚠️ Tarare e giudicare sugli stessi dati è il modo di scoprire un guadagno
// che non esiste: è già successo con `scelta` (+0,9 diventato +0,5).
const taglio = stagioni[Math.max(0, stagioni.length - 2)];
const dentro = dati.filter(v => v.stagione < taglio);
const fuori = dati.filter(v => v.stagione >= taglio);
console.log(`taratura su ${dentro.length} partite (fino alla ${taglio}) · verifica su ${fuori.length} mai viste\n`);

// VPM → probabilità, con una retta imparata dai risultati (minimi quadrati).
const conVpm = dentro.filter(v => v.vpm != null);
const mx = conVpm.reduce((s, v) => s + v.vpm, 0) / conVpm.length;
const my = conVpm.reduce((s, v) => s + (v.vinta ? 1 : 0), 0) / conVpm.length;
const b = conVpm.reduce((s, v) => s + (v.vpm - mx) * ((v.vinta ? 1 : 0) - my), 0)
        / conVpm.reduce((s, v) => s + (v.vpm - mx) ** 2, 0);
const a0 = my - b * mx;
const pVpm = (v) => v.vpm == null ? null : Math.min(0.95, Math.max(0.05, a0 + b * v.vpm));
console.log(`VPM → probabilità:  p = ${a0.toFixed(3)} + ${b.toFixed(4)} × vpm   (a 6,0 → ${(pVpm({vpm:6})*100).toFixed(1)}%, a 8,5 → ${(pVpm({vpm:8.5})*100).toFixed(1)}%)\n`);

const brier = (g, p) => g.reduce((s, v) => s + (p(v) - (v.vinta ? 1 : 0)) ** 2, 0) / g.length;
console.log('── quanto pesa il campo (w) — Brier più basso = sbaglia meno');
let migliore = { w: 0, b: Infinity };
for (const w of [0, 0.05, 0.10, 0.15, 0.20, 0.30, 0.40, 0.50]) {
  const p = (v) => (1 - w) * v.att + w * (pVpm(v) ?? v.att);
  const bd = brier(dentro, p), bf = brier(fuori, p);
  if (bd < migliore.b) migliore = { w, b: bd };
  console.log(`   w=${w.toFixed(2)}   taratura ${bd.toFixed(5)}   verifica ${bf.toFixed(5)}`);
}
const W = migliore.w;
console.log(`   → scelto w = ${W.toFixed(2)}\n`);

// ── 3. la pagella, e il bonus della quota ───────────────────────────────────
const base = (v) => (1 - W) * v.att + W * (pVpm(v) ?? v.att);
// ⚠️ Penalità sul disaccordo: non un `null`, che non si ordina.
const PEN = 0.06;
const pagella = (k, cap) => (v) => {
  const p = base(v) - (v.vpm != null && v.scelta == null ? PEN : 0);
  const bonus = Math.max(-cap, Math.min(cap, k * (v.att * v.quota - 1)));
  return p * 10 + bonus;
};

const perGiorno = new Map();
for (const v of dati) {
  const g = giornoLocale(v.data);
  if (!perGiorno.has(g)) perGiorno.set(g, []);
  perGiorno.get(g).push(v);
}
const primeN = (ordina, n, insieme) => {
  let tot = 0, vinte = 0, ritorno = 0;
  for (const [g, lista] of perGiorno) {
    const l = lista.filter(insieme);
    if (!l.length) continue;
    for (const v of [...l].sort((x, y) => ordina(y) - ordina(x)).slice(0, n)) {
      tot++; if (v.vinta) { vinte++; ritorno += v.quota }
    }
  }
  return { tot, az: vinte / tot * 100, resa: ritorno / tot * 100 };
};
const prova = (nome, ordina) => {
  const d9 = primeN(ordina, 9, v => v.stagione < taglio);
  const f9 = primeN(ordina, 9, v => v.stagione >= taglio);
  console.log(`   ${nome.padEnd(26)} taratura ${d9.az.toFixed(1)}% / resa ${d9.resa.toFixed(1)}%   ·   verifica ${f9.az.toFixed(1)}% / resa ${f9.resa.toFixed(1)}%`);
};
console.log('── ordinando le PRIME 9 di ogni giorno');
prova('attendibilità', v => v.att);
prova('scelta', v => v.scelta ?? -1);
prova('resa (il voto di oggi)', v => v.resa ?? 0);
prova('pagella senza quota', pagella(0, 0));
for (const k of [1, 2, 4, 8]) prova(`pagella bonus k=${k}`, pagella(k, 1.0));
console.log('');

// ── 3b. il confronto schematico fra SCELTA e VOTO ───────────────────────────
// ⚠️ Due domande diverse e due metri diversi: *chi arriva primo* (le prime N
// del giorno) e *chi sta sopra la soglia* (quello che Mattia userà per
// filtrare). Il progetto ha già visto queste due dare risposte opposte.
{
  const voto = pagella(2, 1.0);
  console.log('── le PRIME 15 di ogni giorno (verifica, 2 stagioni mai viste)');
  for (const [n, f] of [['attendibilità', v => v.att], ['scelta', v => v.scelta ?? -1], ['voto', voto]]) {
    const r = primeN(f, 15, v => v.stagione >= taglio);
    console.log(`   ${n.padEnd(16)} ${r.az.toFixed(1)}% · resa ${r.resa.toFixed(1)}%`);
  }
  console.log('');
  console.log('── SOPRA SOGLIA (tutte le stagioni) — quello che serve per filtrare');
  console.log(`   ${'soglia'.padStart(7)} ${'scelta: partite  arriva    resa'.padStart(34)}      ${'voto: partite  arriva    resa'.padStart(32)}`);
  for (const s of [55, 60, 62, 65, 70]) {
    const riga = (g) => g.length < 30 ? '      —' :
      `${String(g.length).padStart(7)}  ${(g.filter(v => v.vinta).length / g.length * 100).toFixed(1)}%  ${(g.reduce((t, v) => t + (v.vinta ? v.quota : 0), 0) / g.length * 100).toFixed(1)}%`;
    const gs = dati.filter(v => v.scelta != null && v.scelta * 100 >= s);
    const gv = dati.filter(v => voto(v) * 10 >= s);
    console.log(`   ${String(s).padStart(6)}% ${riga(gs).padStart(30)}      ${riga(gv).padStart(28)}`);
  }
  const senza = dati.filter(v => v.scelta == null).length;
  console.log(`\n   ⚠️ partite che «scelta» NON sa ordinare (valore nullo): ${senza} su ${dati.length} = ${(senza / dati.length * 100).toFixed(0)}%`);
  console.log(`   ⚠️ partite che il voto non sa ordinare: 0\n`);
}

// ── 4. la pagella assomiglia a «scelta»? ────────────────────────────────────
{
  const g = dati.filter(v => v.scelta != null);
  const pg = g.map(pagella(4, 1.0)), sc = g.map(v => v.scelta * 10);
  const m = (l) => l.reduce((s, x) => s + x, 0) / l.length;
  const [mp, ms] = [m(pg), m(sc)];
  const cov = pg.reduce((s, x, i) => s + (x - mp) * (sc[i] - ms), 0);
  const r = cov / Math.sqrt(pg.reduce((s, x) => s + (x - mp) ** 2, 0) * sc.reduce((s, x) => s + (x - ms) ** 2, 0));
  console.log(`── pagella contro «scelta»: correlazione ${r.toFixed(3)}  (1,00 = la stessa colonna due volte)\n`);
}
await sql.end();
