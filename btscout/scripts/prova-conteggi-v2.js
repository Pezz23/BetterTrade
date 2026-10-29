// ANGOLI E CARTELLINI, VERSIONE 2: il mercato dei gol e la binomiale negativa
// (29/10/2026). Il metodo e il perché stanno in `app/src/lib/conteggi.js`.
//
//   node --env-file=.env scripts/prova-conteggi-v2.js
//   node --env-file=.env scripts/prova-conteggi-v2.js --tabella    # stampa COEFFICIENTI per la libreria
//   pomelli: --div=E0,I1 --mercato=angoli|cartellini
//
// Quattro modelli sulle STESSE partite:
//   L   NESSUN modello: la frequenza dell'over nella competizione, stagioni
//       prima — il riferimento, senza il quale un log score non dice niente
//   v1  il modello di oggi (storico delle squadre, Poisson) — quello a schermo
//   A   lo storico RICALIBRATO (log μ = b0 + b1·log v1) + binomiale negativa:
//       quanto vale la sola dispersione, senza mercato
//   B   A + il mercato dei gol (`tg`, `sbil` da `ingressiMercato`)
//   C   B + il DERBY (`lib/derby.js`), solo sui cartellini: nei derby i
//       gialli sono il **20% in più** (29/10/2026, quindici campionati), ma
//       una parte può già stare nelle quote — partite equilibrate — e va
//       misurato dentro il modello, non da solo
//
// ⚠️⚠️ **Cammina nel tempo e non guarda mai avanti**, due volte: lo storico
// delle squadre si costruisce con le partite precedenti (come `prova-conteggi`),
// e i coefficienti di A e B si stimano **solo sulle stagioni prima** di quella
// che si prevede. La prima stagione con le quote (2019/20) serve solo a stimare.
//
// ⚠️ Tre metri, perché uno solo inganna:
//   · log score (più basso è meglio): quanto erano giuste le PROBABILITÀ, su
//     tutte le soglie — è il metro dell'articolo, e il più sensibile;
//   · verso giusto sulla soglia con la base più vicina al 50%, contro la base;
//   · le «decise» (≥60% o ≤40%) **contro la loro base sulle stesse partite**:
//     senza, il numero è la frequenza travestita (lezione del 29/10).
//
// Non scrive niente.

import { sql, chiudi } from '../lib/db.js';
import { eDerby } from '../../app/src/lib/derby.js';
import { atteso, pOltre, pOltreNB, ingressiMercato, SOGLIE, COLONNE, K_STRETTA } from '../../app/src/lib/conteggi.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const DIVS = arg('div', 'E0,E1,I1,I2,SP1,SP2,D1,D2,F1,F2,P1,N1,T1,B1,SC0').split(',');
const MERCATI = arg('mercato', 'angoli,cartellini').split(',');
const TABELLA = process.argv.includes('--tabella');
const FINESTRA = 10;

// ── Il modello lineare generalizzato di Poisson, minimi quadrati iterati ────
function risolvi(A, b) {               // Gauss con pivot, sistemi 2×2 o 4×4
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function glmPoisson(X, y) {
  const n = X[0].length;
  let b = Array(n).fill(0); b[1] = 1;  // parte da «lo storico così com'è»
  for (let it = 0; it < 25; it++) {
    const A = Array.from({ length: n }, () => Array(n).fill(0)), v = Array(n).fill(0);
    for (let i = 0; i < X.length; i++) {
      const eta = X[i].reduce((a, x, j) => a + x * b[j], 0), mu = Math.exp(eta), z = eta + (y[i] - mu) / mu;
      for (let j = 0; j < n; j++) { v[j] += X[i][j] * mu * z; for (let k = 0; k < n; k++) A[j][k] += X[i][j] * mu * X[i][k]; }
    }
    // ⚠️ Una regolarizzazione minima sulla diagonale: dove nel passato non
    // c'è nessun derby (la Ligue 2 ne ha due in tutto) la colonna è di soli
    // zeri, il sistema non si risolve e tutto diventa NaN. Così quel
    // coefficiente resta a zero, e gli altri non se ne accorgono.
    for (let j = 1; j < n; j++) A[j][j] += 1e-3;
    const nb = risolvi(A, v);
    const fermo = nb.every((x, j) => Math.abs(x - b[j]) < 1e-8); b = nb; if (fermo) break;
  }
  return b;
}
// La dispersione della binomiale negativa, coi momenti: var = μ + μ²/k.
function dispersione(mu, y) {
  let s = 0, d = 0; for (let i = 0; i < y.length; i++) { s += (y[i] - mu[i]) ** 2 - mu[i]; d += mu[i] ** 2; }
  return s > 0 ? d / s : Infinity;
}
const prevedi = (b, x) => Math.exp(x.reduce((a, v, j) => a + v * b[j], 0));
const xA = r => [1, Math.log(r.v1)], xB = r => [1, Math.log(r.v1), r.m.tg, r.m.sbil];
const xC = r => [...xB(r), r.derby ? 1 : 0];

const pc = x => (x * 100).toFixed(1).replace('.', ',') + '%';
const tabella = {};
const totali = {};

for (const div of DIVS) {
  const partite = await sql`
    select data, stagione, casa, trasferta, angoli_casa, angoli_trasf, gialli_casa, gialli_trasf,
           avg_ap_1, avg_ap_x, avg_ap_2, avg_ap_over25, avg_ap_under25
    from partite where div = ${div} and angoli_casa is not null and gialli_casa is not null
    order by data, casa`;

  for (const mercato of MERCATI) {
    const [kc, kt] = COLONNE[mercato];
    // 1) lo storico, camminando, con **le regole dello schermo** (`sql/39`,
    // `conteggi_dati`): per squadra le ultime 10 in casa e 10 fuori **degli
    // ultimi tre anni**, per la competizione la media **degli ultimi due**.
    // ⚠️ Non quelle di `prova-conteggi`, che ricorda tutto: i coefficienti
    // stimati qui correggono il numero che lo schermo calcola, e devono
    // correggere **quello**, non un parente.
    const GIORNO = 864e5;
    const storie = new Map();
    const dammi = s => storie.get(s) || storie.set(s, { casa: [], fuori: [] }).get(s);
    const recenti = (v, d) => v.filter(x => d - x.d <= 1095 * GIORNO).slice(-FINESTRA);
    const mn = (v, k) => ({ m: v.reduce((a, x) => a + x[k], 0) / v.length, n: v.length });
    const lega = [];                      // (data, casa, trasferta) della competizione
    let inizioLega = 0;
    const righe = [];
    for (const p of partite) {
      const fc = Number(p[kc]), ft = Number(p[kt]), d = p.data.getTime();
      const hc = recenti(dammi(p.casa).casa, d), hf = recenti(dammi(p.trasferta).fuori, d);
      while (inizioLega < lega.length && d - lega[inizioLega].d > 730 * GIORNO) inizioLega++;
      const finestra = lega.length - inizioLega;
      if (finestra > 50 && hc.length >= 3 && hf.length >= 3) {
        let sc = 0, st = 0; for (let i = inizioLega; i < lega.length; i++) { sc += lega[i].c; st += lega[i].t; }
        const a = atteso({ casa: { fatti: mn(hc, 'fatti'), subiti: mn(hc, 'subiti') }, trasferta: { fatti: mn(hf, 'fatti'), subiti: mn(hf, 'subiti') },
          lega: { casa: sc / finestra, trasferta: st / finestra }, k: K_STRETTA });
        const m = ingressiMercato(p);
        if (m && a.totale > 0) righe.push({ stagione: p.stagione, y: fc + ft, v1: a.totale, m, derby: eDerby({ div, casa: p.casa, trasferta: p.trasferta }) });
      }
      dammi(p.casa).casa.push({ d, fatti: fc, subiti: ft });
      dammi(p.trasferta).fuori.push({ d, fatti: ft, subiti: fc });
      lega.push({ d, c: fc, t: ft });
    }

    // 2) i coefficienti, stagione per stagione, solo dal passato
    const stagioni = [...new Set(righe.map(r => r.stagione))].sort();
    const valutate = [];
    for (const sg of stagioni.slice(1)) {
      const prima = righe.filter(r => r.stagione < sg), ora = righe.filter(r => r.stagione === sg);
      const y = prima.map(r => r.y);
      const bA = glmPoisson(prima.map(xA), y), bB = glmPoisson(prima.map(xB), y);
      const kA = dispersione(prima.map(r => prevedi(bA, xA(r))), y), kB = dispersione(prima.map(r => prevedi(bB, xB(r))), y);
      const bC = glmPoisson(prima.map(xC), y), kC = dispersione(prima.map(r => prevedi(bC, xC(r))), y);
      const freq = SOGLIE[mercato].map(s => prima.filter(r => r.y > s).length / prima.length);
      for (const r of ora) valutate.push({ ...r, muA: prevedi(bA, xA(r)), kA, muB: prevedi(bB, xB(r)), kB, muC: prevedi(bC, xC(r)), kC, freq });
    }

    // 3) i tre metri, sulle stesse partite
    const MOD = {
      L: (r, s) => r.freq[SOGLIE[mercato].indexOf(s)],
      v1: (r, s) => pOltre(s, r.v1),
      A: (r, s) => pOltreNB(s, r.muA, r.kA),
      B: (r, s) => pOltreNB(s, r.muB, r.kB),
      C: (r, s) => pOltreNB(s, r.muC, r.kC),
    };
    const ris = {};
    for (const [nome, f] of Object.entries(MOD)) {
      let log = 0, brier = 0, nTot = 0, dec = 0, decOk = 0, decBase = 0;
      const perSoglia = SOGLIE[mercato].map(s => {
        let over = 0, giuste = 0, n = 0, oD = 0, dN = 0, dOk = 0;
        for (const r of valutate) {
          const p = Math.min(Math.max(f(r, s), 1e-6), 1 - 1e-6), vero = r.y > s;
          n++; over += vero; giuste += (p > 0.5) === vero;
          log += -Math.log(vero ? p : 1 - p); brier += (p - vero) ** 2; nTot++;
          if (p >= 0.6 || p <= 0.4) { dN++; dOk += (p > 0.5) === vero; oD += vero; }
        }
        dec += dN; decOk += dOk; decBase += over * 2 >= n ? oD : dN - oD;
        return { s, base: Math.max(over, n - over) / n, nostra: giuste / n, n };
      });
      const centrale = perSoglia.reduce((a, b) => (Math.abs(b.base - 0.5) < Math.abs(a.base - 0.5) ? b : a));
      ris[nome] = { log: log / nTot, brier: brier / nTot, centrale, dec, decOk, decBase };
    }
    if (TABELLA) {
      // i coefficienti per lo schermo, stimati su TUTTO quello che c'è; il
      // voto di fiducia (`MISURA_V2`) invece viene dalla camminata, cioè da
      // partite che il modello non aveva visto.
      // ⚠️ Sui cartellini il modello C (col derby), sugli angoli B: nei derby
      // gli angoli non cambiano (×0,98), e un coefficiente che non serve è
      // solo rumore stimato.
      const x = mercato === 'cartellini' ? xC : xB;
      const b = glmPoisson(righe.map(x), righe.map(r => r.y));
      const k = dispersione(righe.map(r => prevedi(b, x(r))), righe.map(r => r.y));
      const c = (mercato === 'cartellini' ? ris.C : ris.B).centrale;
      (tabella[div] ||= {})[mercato] = { b, k, n: righe.length, soglia: c.s, nostra: c.nostra, base: c.base, nv: c.n };
    }
    const t = (totali[mercato] ||= { n: 0, C: { log: 0, sc: 0 }, L: { log: 0, sc: 0 }, v1: { log: 0, sc: 0 }, A: { log: 0, sc: 0 }, B: { log: 0, sc: 0 } });
    t.n += valutate.length;
    for (const nome of ['L', 'v1', 'A', 'B', 'C']) {
      t[nome].log += ris[nome].log * valutate.length;
      t[nome].sc += (ris[nome].centrale.nostra - ris[nome].centrale.base) * valutate.length;
    }
    const riga = nome => {
      const r = ris[nome], c = r.centrale;
      return `${nome.padEnd(2)} log ${r.log.toFixed(4)} · ${String(c.s).padStart(4)}: ${pc(c.nostra)} vs ${pc(c.base)} (${((c.nostra - c.base) * 100).toFixed(1).padStart(4)})` +
        ` · decise ${r.dec ? `${((r.decOk - r.decBase) / r.dec * 100).toFixed(1)} su ${r.dec}` : '—'}`;
    };
    console.log(`\n${div} ${mercato} · ${valutate.length} partite valutate (${stagioni.slice(1).join(',')})`);
    for (const nome of ['L', 'v1', 'A', 'B', 'C']) console.log('  ' + riga(nome));
  }
}

if (TABELLA) {
  console.log('\nexport const COEFFICIENTI = {');
  for (const [div, m] of Object.entries(tabella)) {
    const pezzi = Object.entries(m).map(([k, r]) =>
      `${k}: { b: [${r.b.map(x => x.toFixed(4)).join(', ')}], k: ${Number.isFinite(r.k) ? r.k.toFixed(1) : 'Infinity'}, n: ${r.n} }`);
    console.log(`  ${div}: { ${pezzi.join(', ')} },`);
  }
  console.log('}');
  console.log('\nexport const MISURA_V2 = {');
  for (const [div, m] of Object.entries(tabella)) {
    const pezzi = Object.entries(m).map(([k, r]) =>
      `${k}: { soglia: ${r.soglia}, nostra: ${r.nostra.toFixed(3)}, base: ${r.base.toFixed(3)}, n: ${r.nv} }`);
    console.log(`  ${div}: { ${pezzi.join(', ')} },`);
  }
  console.log('}');
}
{
  console.log('\n── TUTTE (media pesata sulle partite)');
  for (const [m, t] of Object.entries(totali))
    for (const nome of ['L', 'v1', 'A', 'B', 'C'])
      console.log(`  ${m.padEnd(11)} ${nome.padEnd(2)} log score ${(t[nome].log / t.n).toFixed(4)} (${((1 - t[nome].log / t.L.log) * 100).toFixed(2)}% meglio di L) · scarto sulla soglia centrale ${(t[nome].sc / t.n * 100).toFixed(2)} punti  (${t.n} partite)`);
}
await chiudi();
