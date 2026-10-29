// ROAD TO WEEKEND: quale PIANO DI PRELIEVI rende di più (26/10/2026).
//
// Mattia, dopo una serie di 7 passi vinti giocata prelevando "a sentimento":
// *"vorrei un piano prelievi che avrebbe ottimizzato guadagno e rischio; lo
// scopo era incassare senza rallentare la scalata"*. Due regole a confronto,
// sulle stesse partite:
//
//   proposta  passo 1 la PUNTATA, poi il 50% dell'utile a ogni passo, senza stop
//   variante  passo 1 la PUNTATA, passo 2 il 30%, passi 3-6 il 50%, poi 60 · 70 ·
//             80 · 90 e al passo 11 il 100%: STOP
//
// Le percentuali sono **sull'utile** del passo (incassato − puntata), come nel
// metodo dell'app. Al primo passo perso, o dopo lo STOP, si riparte con il 10%
// del bankroll; il bankroll comprende quello che si è prelevato.
//
// ⚠️ **Un passo = un GIORNO**: `partite` non ha l'orario, quindi le fasce del
// pomeriggio e della sera non si separano. Ogni giorno si prendono **fino a 4
// partite**, le più attendibili fra quelle con attendibilità ≥ 61% e quota ≥
// 1,30, **tutte insieme** (Mattia: *"se in una fascia ci sono 3 max 4 partite,
// giocale insieme, la quota può essere anche 3 o 4"*). Se il loro prodotto
// non arriva a 1,90 quel giorno non c'è passo. Con l'orario, nell'app un
// giorno può avere più passi: questi numeri sono **prudenti**.
// ⚠️ La scalata **attraversa i giorni e i weekend** finché non perde: è come
// una scalata aperta nell'app.
// ⚠️ Quando la puntata scenderebbe sotto 1 € si **ricarica** 100 €, e la
// ricarica entra nel versato: il risultato è `conto − versato`, come nella
// pagina (`contoDi`).
//
// Non scrive niente e non spende crediti.
//
//   node --env-file=.env scripts/prova-prelievi.js [--stagioni=8] [--bankroll=100] [--passo=quattro|taglio]
//
// ⚠️ `--passo` dice **come si compone il passo**, ed è risultato la leva vera
// (26/10/2026): `quattro` (di partenza) gioca fino a 4 partite tutte insieme,
// e la quota media sale a 3,24 — vince un passo su tre e quasi nessuna scalata
// supera il secondo. `taglio` è il metodo dell'app: si prendono le più
// attendibili **finché il prodotto supera 1,90** e lì ci si ferma
// (`componiPasso`, la stessa funzione della pagina).

import { ricostruisci } from '../lib/ricostruisci.js';
import { postaDi, componiPasso, percentualeConsigliata, applicaIncasso, METODO_META as METODO } from '../../app/src/lib/scalata.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8), BANKROLL = arg('bankroll', 100);
const SOGLIA = 0.61, GAMBA = 1.30, SCHEDINA = 1.90, MAX_GAMBE = 4;
const PASSO = (process.argv.find(x => x.startsWith('--passo=')) || '--passo=quattro').split('=')[1];

// Quanto si preleva al passo `k` (1, 2, …): `null` vuol dire «la puntata».
// `stop` è il passo dopo il quale la scalata si chiude e si incassa tutto.
const REGOLE = {
  // ⚠️ Dal 26/10/2026 è il metodo dell'app, e si misura **con le sue funzioni**
  // (`percentualeConsigliata` + `applicaIncasso`): la regola misurata e quella
  // a schermo sono lo stesso codice, arrotondamento all'euro compreso.
  proposta: { nome: METODO.nome, app: true, stop: Infinity },
  variante: {
    nome: 'puntata, 30, 50×4, 60…100 STOP',
    perc: k => (k === 1 ? null : k === 2 ? 0.3 : k <= 6 ? 0.5 : [0.6, 0.7, 0.8, 0.9, 1][k - 7]),
    stop: 11,
  },
};

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });

// ── I passi, uno per giorno ──────────────────────────────────────────────────
const perGiorno = new Map();
for (const v of valutate) {
  if (!(v.att >= SOGLIA) || !(v.quota >= GAMBA)) continue;
  if (!perGiorno.has(v.data)) perGiorno.set(v.data, []);
  perGiorno.get(v.data).push(v);
}
const passi = [];
for (const g of [...perGiorno.keys()].sort()) {
  let gambe, quota;
  if (PASSO === 'taglio') {
    const c = componiPasso(perGiorno.get(g), { quotaMinima: SCHEDINA, maxGambe: MAX_GAMBE, pavimento: GAMBA });
    if (!c.gambe) continue;
    ({ gambe, quota } = c);
  } else {
    gambe = perGiorno.get(g).sort((a, b) => b.att - a.att).slice(0, MAX_GAMBE);
    quota = gambe.reduce((a, x) => a * x.quota, 1);
    if (quota < SCHEDINA) continue;
  }
  passi.push({ giorno: g, stagione: gambe[0].stagione, quota, vinto: gambe.every(x => x.vinta), gambe: gambe.length });
}
const vintiTot = passi.filter(p => p.vinto).length;
const qMed = passi.reduce((a, p) => a + p.quota, 0) / passi.length;
console.log(`stagioni ${stagioni.join(', ')} · attendibilità ≥ ${SOGLIA * 100}% · gamba ≥ ${GAMBA} · schedina ≥ ${SCHEDINA} · fino a ${MAX_GAMBE} gambe · passo: ${PASSO === 'taglio' ? 'taglio a ' + SCHEDINA : 'tutte insieme'}`);
console.log(`${passi.length} passi (giorni giocabili) · vinti ${(vintiTot / passi.length * 100).toFixed(1)}% · quota media ${qMed.toFixed(2)}` +
  ` · resa del passo da solo ${(passi.reduce((a, p) => a + (p.vinto ? p.quota : 0), 0) / passi.length * 100).toFixed(1)}%\n`);

// ── La simulazione ───────────────────────────────────────────────────────────
function simula(regola, lista, bankroll0 = BANKROLL) {
  let conto = bankroll0, versato = bankroll0, ricariche = 0;
  let puntata = 0, k = 0, giro = null;
  let minimo = conto, giocato = 0, ritornato = 0;
  const arrivi = {};                 // passi vinti per giro → quanti giri
  const chiudi = (n) => { arrivi[n] = (arrivi[n] || 0) + 1; giro = null };
  for (const p of lista) {
    if (!giro) {
      let posta = postaDi(conto);
      if (posta < 1) { conto += BANKROLL; versato += BANKROLL; ricariche++; posta = postaDi(conto) }
      conto -= posta; puntata = posta; k = 0; giro = true;
    }
    giocato += puntata;
    if (!p.vinto) { chiudi(k); puntata = 0; minimo = Math.min(minimo, conto); continue }
    k++;
    const montante = puntata * p.quota;
    ritornato += montante;
    let prel;
    if (regola.app) prel = applicaIncasso(montante, percentualeConsigliata({ numero: k, montante, puntata }), puntata).via;
    else {
      const perc = regola.perc(k);
      prel = perc === null ? Math.min(puntata, montante) : perc * (montante - puntata);
    }
    if (k >= regola.stop) prel = montante;
    conto += prel;
    puntata = montante - prel;
    if (k >= regola.stop || puntata < 0.01) { conto += puntata; puntata = 0; chiudi(k) }
  }
  if (giro) { conto += puntata; arrivi[k] = (arrivi[k] || 0) + 1 }   // l'ultimo giro aperto si incassa
  return { conto, versato, ricariche, risultato: conto - versato, minimo, arrivi, resa: ritornato / giocato };
}

const pct = x => `${(x * 100).toFixed(1)}%`;
const eur = x => `${x >= 0 ? '' : '−'}${Math.abs(x).toFixed(0)} €`;
const quanti = (arrivi, da) => Object.entries(arrivi).filter(([n]) => Number(n) >= da).reduce((a, [, c]) => a + c, 0);

console.log('── tutte le stagioni di fila, partendo da', BANKROLL, '€ ──');
console.log(`${'regola'.padEnd(34)} ${'conto'.padStart(9)} ${'versato'.padStart(8)} ${'risultato'.padStart(10)} ${'ricariche'.padStart(9)} ${'minimo'.padStart(7)} ${'resa'.padStart(7)}  giri che arrivano a 3 · 5 · 7 · 11 passi vinti`);
for (const [id, r] of Object.entries(REGOLE)) {
  const s = simula(r, passi);
  const giri = Object.values(s.arrivi).reduce((a, b) => a + b, 0);
  console.log(`${(id + ' · ' + r.nome).padEnd(34)} ${eur(s.conto).padStart(9)} ${eur(s.versato).padStart(8)} ${eur(s.risultato).padStart(10)} ${String(s.ricariche).padStart(9)} ${eur(s.minimo).padStart(7)} ${pct(s.resa).padStart(7)}  ` +
    `${giri} giri: ${[3, 5, 7, 11].map(n => quanti(s.arrivi, n)).join(' · ')}`);
}

// ⚠️ Una sola corsa su otto stagioni dipende dall'ordine in cui sono capitate
// le serie: si guarda anche **stagione per stagione**, ognuna da 100 €, e la
// MEDIANA (con otto stagioni la media la decide una sola annata buona).
console.log('\n── stagione per stagione, ognuna da', BANKROLL, '€ (risultato) ──');
// ⚠️ Solo le stagioni **con almeno un passo**: quelle ad anno solare del
// Giappone non hanno quote, finivano a 0 € e alzavano la mediana (26/10/2026).
const conPassi = stagioni.filter(st => passi.some(p => p.stagione === st));
const perStagione = {};
for (const [id, r] of Object.entries(REGOLE)) perStagione[id] = conPassi.map(st => simula(r, passi.filter(p => p.stagione === st)).risultato);
console.log(`${'stagione'.padEnd(10)} ${Object.keys(REGOLE).map(id => id.padStart(10)).join(' ')}`);
conPassi.forEach((st, i) => console.log(`${String(st).padEnd(10)} ${Object.keys(REGOLE).map(id => eur(perStagione[id][i]).padStart(10)).join(' ')}`));
const mediana = l => { const s = [...l].sort((a, b) => a - b); const m = s.length / 2; return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2 };
console.log(`${'MEDIANA'.padEnd(10)} ${Object.keys(REGOLE).map(id => eur(mediana(perStagione[id])).padStart(10)).join(' ')}`);
console.log(`${'in utile'.padEnd(10)} ${Object.keys(REGOLE).map(id => `${perStagione[id].filter(x => x > 0).length}/${conPassi.length}`.padStart(10)).join(' ')}`);
process.exit(0);
