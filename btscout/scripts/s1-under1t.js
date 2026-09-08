// S1 — Under 1,5 primo tempo su "difese forti vs attacchi deboli".
//
// Stima un Dixon-Coles sui GOL DEL PRIMO TEMPO (walk-forward, niente sguardo al
// futuro) e per ogni partita calcola P(≤1 gol nel 1° tempo). Le partite con
// questa probabilità alta sono quelle con difese forti / attacchi deboli.
//
// Senza quote HT reali nei dati, misura la cosa che decide: il TASSO DI SUCCESSO
// reale delle partite selezionate e la QUOTA DI PAREGGIO (1/tasso). Da confrontare
// con quello che offre davvero il mercato. La progressione (staking) si simula
// dopo, con una quota media che fissa Mattia.
//
// Uso:  node scripts/s1-under1t.js      (legge dalla cache locale)

import { readFileSync } from 'node:fs';
import { fit, mediaAttesa, matriceDaMedie } from '../lib/dixon-coles.js';

const cache = JSON.parse(readFileSync(new URL('../.cache/partite.json', import.meta.url), 'utf8'));

const giorno = d => (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);
const xi = Math.log(2) / 200;
const MIN_STORICO = 300;   // partite prima di iniziare a valutare
const MIN_SQ = 8;          // partite minime di una squadra per fidarsi del rating

// P(gol totali nel 1° tempo ≤ 1) dalla matrice dei punteggi del primo tempo.
function pUnder15HT(lambda, mu, rho) {
  const { M } = matriceDaMedie(lambda, mu, rho, 6);
  let p = 0;
  for (let x = 0; x <= 6; x++) for (let y = 0; y <= 6; y++) if (x + y <= 1) p += M[x][y];
  return p;
}

// Solo partite con i gol del primo tempo, raggruppate per campionato.
const perDiv = new Map();
for (const r of cache) {
  if (r.gol1t_casa == null || r.gol1t_trasf == null) continue;
  if (!perDiv.has(r.div)) perDiv.set(r.div, []);
  perDiv.get(r.div).push(r);
}

// Walk-forward per campionato: raccoglie (prob prevista, esito reale).
const registro = [];
for (const [, righe] of perDiv) {
  righe.sort((a, b) => (giorno(a.data) < giorno(b.data) ? -1 : giorno(a.data) > giorno(b.data) ? 1 : 0));

  const perData = [];
  let cur = null;
  for (const r of righe) {
    const g = giorno(r.data);
    if (!cur || cur.g !== g) { cur = { g, rs: [] }; perData.push(cur); }
    cur.rs.push(r);
  }

  let stato = null, fine = 0;
  const partiteSq = new Map();
  const conta = s => partiteSq.get(s) || 0;

  for (const gg of perData) {
    const training = righe.slice(0, fine).map(r => ({
      casa: r.casa, trasferta: r.trasferta,
      golCasa: r.gol1t_casa, golTrasferta: r.gol1t_trasf, data: r.data,
    }));
    if (training.length >= MIN_STORICO) {
      stato = fit(training, { xi, iniziale: stato, dataRiferimento: new Date(gg.g), tol: 1e-7, maxIter: 80 });
      for (const r of gg.rs) {
        if (!(r.casa in stato.attacco) || !(r.trasferta in stato.attacco)) continue;
        if (conta(r.casa) < MIN_SQ || conta(r.trasferta) < MIN_SQ) continue;
        const { lambda, mu } = mediaAttesa(stato, r.casa, r.trasferta);
        const p = pUnder15HT(lambda, mu, stato.rho);
        const hit = (r.gol1t_casa + r.gol1t_trasf) <= 1 ? 1 : 0;
        registro.push({ p, hit });
      }
    }
    for (const r of gg.rs) {
      partiteSq.set(r.casa, conta(r.casa) + 1);
      partiteSq.set(r.trasferta, conta(r.trasferta) + 1);
    }
    fine += gg.rs.length;
  }
}

// ---- report ----
console.log(`S1 — Under 1,5 primo tempo · partite valutate (fuori campione): ${registro.length}`);

const baseRate = registro.filter(r => r.hit).length / registro.length;
console.log(`Tasso base (tutte le partite fanno Under 1,5 HT): ${(baseRate * 100).toFixed(1)}%  → pareggi a quota ${(1 / baseRate).toFixed(3)}\n`);

console.log('Calibrazione: quando il modello dice X%, l\'Under 1,5 HT succede?');
console.log('  prob. prevista   osservato    n');
for (let b = 5; b < 10; b++) {
  const sel = registro.filter(r => Math.floor(r.p * 10) === b);
  if (!sel.length) continue;
  const oss = sel.filter(r => r.hit).length / sel.length;
  const media = sel.reduce((s, r) => s + r.p, 0) / sel.length;
  console.log(`  ${b * 10}-${b * 10 + 10}%          ${(oss * 100).toFixed(1)}%    ${String(sel.length).padStart(6)}   (media modello ${(media * 100).toFixed(1)}%)`);
}

console.log('\nSelezione per soglia: prendo le partite con P(Under 1,5 HT) ≥ soglia');
console.log('  soglia   n scelte   tasso reale   quota di pareggio (1/tasso)');
for (const soglia of [0.55, 0.60, 0.65, 0.70, 0.75, 0.80]) {
  const sel = registro.filter(r => r.p >= soglia);
  if (!sel.length) { console.log(`  ≥${(soglia * 100).toFixed(0)}%      —`); continue; }
  const tasso = sel.filter(r => r.hit).length / sel.length;
  console.log(`  ≥${(soglia * 100).toFixed(0)}%     ${String(sel.length).padStart(6)}      ${(tasso * 100).toFixed(1)}%         ${(1 / tasso).toFixed(3)}`);
}

console.log('\nNota: "quota di pareggio" = la quota minima a cui questa selezione andrebbe');
console.log('in pari. Se il mercato offre di più, c\'è valore; se meno, si perde.');
