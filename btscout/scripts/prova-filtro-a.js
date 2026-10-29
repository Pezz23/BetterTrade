// IL FILTRO A E IL BANKROLL AL 10% — riproduzione e WALK-FORWARD (29/10/2026).
//
// Da un briefing di Mattia, costruito con ChatGPT sui CSV di Andamento:
// «Filtro A» = attendibilità ≥ 61%, VPM ≥ 7,5, Scelta > 61%, segno VPM uguale
// alla giocata, quota della gamba ≥ 1,30, schedina ≥ 1,90, al massimo 3 gambe;
// e il capitale al 10% del saldo, 100 € a stagione. ChatGPT riportava 230
// schedine, 55,65% vinte, quota media 2,05, **+13,64%** a puntata fissa.
//
// ⚠️⚠️ **Il Filtro A è stato trovato guardando gli stessi dati su cui si
// misura**: decine di combinazioni provate, tenuta la migliore. Su 230
// schedine il rumore vale circa ±7 punti di ROI, quindi un +13% può uscire
// anche da un vantaggio nullo. Per questo due prove:
//   TEST 1  il Filtro A **congelato**, su tutte le stagioni: riproduce i
//           numeri di ChatGPT con la logica dell'app (non è una validazione);
//   TEST 2  il **walk-forward vero**: per ogni stagione il filtro si sceglie
//           **solo sulle stagioni prima** (la griglia qui sotto, criterio: il
//           ROI a puntata fissa con almeno MIN_SCHEDINE schedine), e si misura
//           sulla stagione dopo, mai vista. È l'unico numero che conta.
//
// Le regole della schedina (il briefing le dava come «convenzioni», qui sono
// fisse e deterministiche — a parità di dati, le stesse schedine):
//   · si parte dalla prima partita che inizia quando si è liberi, e si
//     guardano quelle che iniziano entro FINESTRA_MIN minuti;
//   · si ordinano per VPM, poi Scelta, poi attendibilità, poi id — **mai**
//     per esito;
//   · si aggiungono finché il prodotto arriva a QUOTA_SCHEDINA, al massimo
//     MAX_GAMBE; se nella finestra non ci si arriva, niente schedina e si
//     passa alla partita dopo;
//   · una schedina per volta: la successiva solo ATTESA_MIN minuti dopo
//     l'inizio dell'ultima gamba della precedente.
// I dati sono quelli di Andamento (`ricostruisci`): attendibilità dal
// consenso di **apertura**, quota **Bet365 di apertura**, VPM camminando nel
// tempo — niente che venga dopo il calcio d'inizio. Le «+ over 1,5» non
// entrano: l'app le propone sotto quota 1,25, e la gamba deve fare ≥ 1,30.
//
// Non scrive niente e non spende crediti.
//   node --env-file=.env scripts/prova-filtro-a.js

import { ricostruisci } from '../lib/ricostruisci.js';

const FINESTRA_MIN = 60, ATTESA_MIN = 120, QUOTA_GAMBA = 1.30, QUOTA_SCHEDINA = 1.90, MAX_GAMBE = 3;
const CAPITALE = 100, FRAZIONI = [0.03, 0.05, 0.10];
const MIN_SCHEDINE = 50;   // sotto, un ROI di allenamento è rumore puro

// `--att=61 --vpm=6.5` prova una variante al posto del Filtro A nel TEST 1
// (Mattia, 29/10/2026). Il walk-forward non cambia: sceglie da solo.
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const FILTRO_A = { att: arg('att', 61) / 100, vpm: arg('vpm', 7.5), concorde: true, scelta: 0.61, nome: 'Filtro A' };
// La griglia del walk-forward: le stesse leve che il briefing ha esplorato.
const GRIGLIA = [];
for (const att of [0.54, 0.56, 0.58, 0.60, 0.61, 0.63, 0.65, 0.68])
  for (const vpm of [null, 6.5, 7, 7.5, 8, 8.5])
    for (const concorde of vpm == null ? [false, true] : [true])
      GRIGLIA.push({ att, vpm, concorde, nome: `att≥${Math.round(att * 100)}${vpm ? ` vpm≥${vpm}` : ''}${concorde ? ' concorde' : ''}` });

const { valutate, stagioni } = await ricostruisci({ stagioni: 8, daGiornata: 5 });
const istante = v => Date.parse(`${v.data}T${v.ora}:00`);
const tutte = valutate.filter(v => v.ora && v.quota >= QUOTA_GAMBA).map(v => ({ ...v, t: istante(v) }))
  .sort((a, b) => a.t - b.t || String(a.id).localeCompare(String(b.id)));
const senzaOra = valutate.filter(v => !v.ora).length;

const passa = (f, v) => v.att >= f.att && (f.vpm == null || (v.vpm != null && v.vpm >= f.vpm))
  && (!f.concorde || v.accordoVpm === true) && (f.scelta == null || (v.scelta != null && v.scelta > f.scelta));

const priorita = (a, b) => (b.vpm ?? -1) - (a.vpm ?? -1) || (b.scelta ?? -1) - (a.scelta ?? -1) || b.att - a.att
  || String(a.id).localeCompare(String(b.id));

/**
 * Le schedine di un filtro, in ordine di tempo, su tutte le stagioni.
 * `f.qs` e `f.mg` (quota minima della schedina, gambe massime) cambiano il
 * formato per il TEST 3; senza, valgono quelli del briefing (1,90 e 3).
 */
const memoria = new Map();
function schedine(f) {
  const chiave = JSON.stringify([f.att, f.vpm, f.concorde, f.scelta, f.qs, f.mg]);
  if (!memoria.has(chiave)) memoria.set(chiave, componi(f));
  return memoria.get(chiave);
}
function componi(f) {
  const QS = f.qs ?? QUOTA_SCHEDINA, MG = f.mg ?? MAX_GAMBE;
  const c = tutte.filter(v => passa(f, v));
  const out = [];
  let libero = -Infinity, i = 0;
  while (i < c.length) {
    while (i < c.length && c[i].t < libero) i++;
    if (i >= c.length) break;
    const T = c[i].t;
    const finestra = [];
    for (let j = i; j < c.length && c[j].t <= T + FINESTRA_MIN * 6e4; j++) finestra.push(c[j]);
    finestra.sort(priorita);
    const gambe = []; let q = 1;
    for (const g of finestra) { if (gambe.length >= MG || q >= QS) break; gambe.push(g); q *= g.quota; }
    if (q >= QS) {
      const ultimo = Math.max(...gambe.map(g => g.t));
      out.push({ stagione: gambe[0].stagione, t: T, quota: q, vinta: gambe.every(g => g.vinta), gambe });
      libero = ultimo + ATTESA_MIN * 6e4;
    } else {
      // niente schedina in questa finestra: si passa alla prossima ora d'inizio
      libero = T + 1;
    }
  }
  return out;
}

function riassunto(l) {
  const n = l.length; if (!n) return { n: 0 };
  const util = l.map(s => (s.vinta ? s.quota - 1 : -1));
  const roi = util.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(util.reduce((a, u) => a + (u - roi) ** 2, 0) / (n - 1 || 1));
  return { n, vinte: l.filter(s => s.vinta).length / n, quota: l.reduce((a, s) => a + s.quota, 0) / n, roi, ic: 1.96 * sd / Math.sqrt(n),
    doppie: l.filter(s => s.gambe.length === 2).length, triple: l.filter(s => s.gambe.length === 3).length };
}
function capitale(l, frazione) {
  let c = CAPITALE, picco = CAPITALE, peggio = 0;
  for (const s of l) {
    const posta = Math.round(c * frazione * 100) / 100;
    if (posta < 1) break;   // sotto 1 € non si gioca: capitale finito
    c = Math.round((c + (s.vinta ? posta * (s.quota - 1) : -posta)) * 100) / 100;
    picco = Math.max(picco, c); peggio = Math.min(peggio, c / picco - 1);
  }
  return { finale: c, drawdown: peggio };
}
const pc = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
const eur = x => `${x.toFixed(2)} €`;
const riga = (et, l) => {
  const r = riassunto(l);
  if (!r.n) return `${et.padEnd(10)} nessuna schedina`;
  const cap = FRAZIONI.map(f => capitale(l, f));
  return `${et.padEnd(10)} ${String(r.n).padStart(4)}  vinte ${(r.vinte * 100).toFixed(1).padStart(5)}%  quota ${r.quota.toFixed(2)}  ROI ${pc(r.roi).padStart(7)} ±${(r.ic * 100).toFixed(1).padStart(4)}` +
    `  │ ${cap.map(c => `${eur(c.finale).padStart(9)} (dd ${pc(c.drawdown)})`).join('  ')}`;
};
const intestazione = `${'stagione'.padEnd(10)} sched  vinte        quota   ROI puntata fissa (±IC95) │ capitale da 100 € al ${FRAZIONI.map(f => `${f * 100}%`).join(' · ')}`;

console.log(`stagioni ${stagioni.join(', ')} · partite valutate ${valutate.length} (senza ora ${senzaOra}, escluse) · con gamba ≥ ${QUOTA_GAMBA}: ${tutte.length}`);
console.log(`regole: finestra ${FINESTRA_MIN}′ · attesa ${ATTESA_MIN}′ · schedina ≥ ${QUOTA_SCHEDINA} · max ${MAX_GAMBE} gambe · una alla volta\n`);

// ── TEST 1: il Filtro A congelato ───────────────────────────────────────────
const A = schedine(FILTRO_A);
console.log(`══ TEST 1 — att ≥ ${FILTRO_A.att * 100}%, VPM ≥ ${FILTRO_A.vpm} concorde, congelato (riproduzione, NON validazione)`);
console.log(intestazione);
for (const st of stagioni) console.log(riga(st, A.filter(s => s.stagione === st)));
const complete = stagioni.slice(0, -1);
const Ac = A.filter(s => complete.includes(s.stagione)), rA = riassunto(A);
console.log(riga('TUTTE', A));
console.log(`doppie ${rA.doppie} · triple ${rA.triple} · singole ${rA.n - rA.doppie - rA.triple}   (ChatGPT: 230 schedine, 220 doppie, 10 triple, 55,65%, quota 2,05, +13,64%)`);
console.log(`al 10% stagione per stagione, somma degli utili sulle ${complete.length} complete: ` +
  `${eur(complete.reduce((a, st) => a + capitale(A.filter(s => s.stagione === st), 0.10).finale - CAPITALE, 0))}   (ChatGPT: +378,92 €)`);
// dove nasce il risultato: campionati
const perDiv = {};
for (const s of Ac) for (const g of s.gambe) (perDiv[g.div] ||= []).push(g);
console.log('gambe per campionato (azzeccate · resa della gamba da sola):  ' + Object.entries(perDiv).sort((a, b) => b[1].length - a[1].length)
  .map(([d, l]) => `${d} ${l.length} (${(l.filter(g => g.vinta).length / l.length * 100).toFixed(0)}% · ${(l.reduce((a, g) => a + (g.vinta ? g.quota : 0), 0) / l.length * 100).toFixed(0)}%)`).join('  '));
const singole = Ac.flatMap(s => s.gambe);
console.log(`le gambe da sole: ${singole.length}, azzeccate ${(singole.filter(g => g.vinta).length / singole.length * 100).toFixed(1)}%, resa ${(singole.reduce((a, g) => a + (g.vinta ? g.quota : 0), 0) / singole.length * 100).toFixed(1)}%`);

// ── TEST 2: il walk-forward ─────────────────────────────────────────────────
console.log(`\n══ TEST 2 — WALK-FORWARD: il filtro si sceglie SOLO sulle stagioni prima (${GRIGLIA.length} filtri, almeno ${MIN_SCHEDINE} schedine)`);
const perFiltro = GRIGLIA.map(f => ({ f, l: schedine(f) }));
const prove = stagioni.slice(3);   // allenamento: almeno tre stagioni
const fuori = [];
console.log(`${'prova'.padEnd(10)} ${'filtro scelto'.padEnd(28)} ROI allenamento → ` + intestazione.slice(11));
for (const st of prove) {
  const prima = stagioni.slice(0, stagioni.indexOf(st));
  let migliore = null;
  for (const { f, l } of perFiltro) {
    const r = riassunto(l.filter(s => prima.includes(s.stagione)));
    if (r.n >= MIN_SCHEDINE && (!migliore || r.roi > migliore.r.roi)) migliore = { f, l, r };
  }
  const test = migliore.l.filter(s => s.stagione === st);
  fuori.push(...test);
  console.log(`${st.padEnd(10)} ${migliore.f.nome.padEnd(28)} ${pc(migliore.r.roi).padStart(7)} → ${riga('', test).slice(11)}`);
}
const tutteFuori = fuori.filter(s => complete.includes(s.stagione));
console.log(riga('FUORI', tutteFuori) + '   ← le stagioni mai viste, complete');
console.log(`\nriferimento — solo attendibilità ≥ 61%, nessun altro filtro:`);
console.log(riga('TUTTE', schedine({ att: 0.61, vpm: null, concorde: false }).filter(s => complete.includes(s.stagione))));

// ── TEST 3: la puntata che fa crescere di più ───────────────────────────────
// Mattia, 29/10/2026: *"trova la soluzione per guadagnare il massimo, non mi
// interessa preservare il capitale"*.
// ⚠️⚠️ «Il massimo» ha due significati. Il **guadagno medio** cresce sempre
// con la puntata (al 100% è massimo) ma lo fanno pochissime strade fortunate:
// quasi tutte finiscono a zero. La **crescita del capitale** — quello che ti
// ritrovi davvero — ha un massimo preciso, la frazione di **Kelly**: oltre,
// si guadagna MENO e si rischia di più. Qui si cerca quella.
// ⚠️ Anche la puntata si sceglie **solo sulle stagioni prima**: una frazione
// scelta guardando le stagioni di prova sarebbe la stessa truffa del filtro.
const FORMATI = [
  { qs: 1.30, mg: 1, f: 'singola' },
  { qs: 1.90, mg: 2, f: 'doppia ≥1,90' },
  { qs: 1.90, mg: 3, f: 'fino a 3 ≥1,90' },
  { qs: 2.50, mg: 3, f: 'fino a 3 ≥2,50' },
  { qs: 3.00, mg: 4, f: 'fino a 4 ≥3,00' },
];
const utili = l => l.map(s => (s.vinta ? s.quota - 1 : -1));
const crescita = (u, fr) => u.reduce((a, x) => a + Math.log(Math.max(1e-9, 1 + fr * x)), 0) / u.length;
function kelly(u) {
  let migliore = { fr: 0, g: 0 };
  for (let fr = 0.005; fr <= 0.6; fr += 0.005) { const g = crescita(u, fr); if (g > migliore.g) migliore = { fr, g } }
  return migliore;
}
function percorso(l, fr) {
  let c = CAPITALE, picco = CAPITALE, peggio = 0;
  for (const s of l) {
    const posta = Math.round(c * fr * 100) / 100;
    if (posta < 0.01) break;
    c = Math.max(0, Math.round((c + (s.vinta ? posta * (s.quota - 1) : -posta)) * 100) / 100);
    picco = Math.max(picco, c); peggio = Math.min(peggio, c / picco - 1);
  }
  return { c, peggio };
}
const GRANDE = GRIGLIA.flatMap(g => FORMATI.map(x => ({ ...g, ...x, nome: `${g.nome} · ${x.f}` })));
console.log(`\n══ TEST 3 — LA CRESCITA MASSIMA: filtro, formato e puntata scelti SOLO sul passato (${GRANDE.length} combinazioni)`);
console.log(`criterio: la crescita a stagione alla frazione di Kelly delle stagioni prima (almeno ${MIN_SCHEDINE} schedine)`);
let capK = CAPITALE, capMezzo = CAPITALE;
const sequenza = [];
for (const st of prove) {
  const prima = stagioni.slice(0, stagioni.indexOf(st));
  let m = null;
  for (const f of GRANDE) {
    const l = schedine(f).filter(s => prima.includes(s.stagione));
    if (l.length < MIN_SCHEDINE) continue;
    const k = kelly(utili(l));
    const aStagione = k.g * l.length / prima.length;
    if (!m || aStagione > m.aStagione) m = { f, k, aStagione };
  }
  const test = schedine(m.f).filter(s => s.stagione === st);
  sequenza.push(...test.map(s => ({ ...s, fr: m.k.fr })));
  const a = percorso(test, m.k.fr), b = percorso(test, m.k.fr / 2);
  capK = capK * a.c / CAPITALE; capMezzo = capMezzo * b.c / CAPITALE;
  console.log(`${st}  ${m.f.nome.padEnd(42)} Kelly ${(m.k.fr * 100).toFixed(1).padStart(4)}% · ${String(test.length).padStart(3)} schedine` +
    ` · ROI ${pc(riassunto(test).roi ?? 0).padStart(7)} · Kelly: ${eur(capK).padStart(10)} · mezzo Kelly: ${eur(capMezzo).padStart(9)}`);
}
console.log('(capitale continuo da 100 € sulle stagioni di prova, senza rimettere niente)');

// La stessa sequenza fuori campione, a frazione FISSA: dove sta il massimo
const seqComplete = sequenza.filter(s => complete.includes(s.stagione));
console.log(`\nle ${seqComplete.length} schedine fuori campione (stagioni complete), giocate di fila da 100 € a frazione fissa:`);
for (const fr of [0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.20, 0.30, 0.50, 1.0]) {
  const r = percorso(seqComplete, fr);
  console.log(`  ${String(Math.round(fr * 100)).padStart(3)}%  → ${eur(r.c).padStart(12)}   drawdown ${pc(r.peggio)}`);
}

// ⚠️⚠️ E il futuro non sarà lo storico: tre ipotesi sul vantaggio vero, 100
// doppie a quota 2,09 (circa tre stagioni), 20.000 strade a caso.
console.log('\nil futuro, simulato: 100 doppie a quota 2,09, 20.000 strade a caso, da 100 €');
console.log('  vantaggio vero     frazione   mediana (quello che ti ritrovi)   media    sotto 10 €   sopra 100 €');
// ⚠️ Generatore con seme fisso (mulberry32), così le strade sono le stesse a
// ogni lancio. Il primo tentativo moltiplicava in virgola mobile oltre 2^53,
// perdeva precisione e dava estrazioni storte: con vantaggio zero la media
// usciva 129 € invece di 100. Il controllo che l'ha preso è proprio quello —
// **a vantaggio zero la media deve restare 100**.
let seme = 12345;
const caso = () => { seme = (seme + 0x6D2B79F5) | 0; let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
for (const [nome, roi] of [['nessuno (0%)', 0], ['realistico (+3,6%)', 0.036], ['come lo storico (+18%)', 0.18]]) {
  const p = (1 + roi) / 2.09;
  for (const fr of [0.03, 0.05, 0.10, 0.20, 0.50]) {
    const fini = [];
    for (let k = 0; k < 20000; k++) { let c = 100; for (let i = 0; i < 100; i++) c *= caso() < p ? 1 + fr * 1.09 : 1 - fr; fini.push(c); }
    fini.sort((a, b) => a - b);
    const media = fini.reduce((a, b) => a + b, 0) / fini.length;
    console.log(`  ${nome.padEnd(22)} ${String(fr * 100).padStart(3)}%   ${eur(fini[10000]).padStart(12)}             ${eur(media).padStart(10)}   ${(fini.filter(x => x < 10).length / 200).toFixed(0).padStart(3)}%        ${(fini.filter(x => x > 100).length / 200).toFixed(0).padStart(3)}%`);
  }
}
process.exit(0);
