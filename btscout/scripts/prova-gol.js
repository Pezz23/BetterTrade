// Il modello dei GOL ATTESI messo alla prova sui risultati veri.
//
//   node --env-file=.env scripts/prova-gol.js [--stagioni=3]
//
// Cammina nel tempo: per ogni partita giocata ricostruisce le finestre delle
// due squadre **con le sole partite precedenti**, stima i gol attesi, e poi
// guarda com'è finita. Niente dati che allora non c'erano.
//
// ⚠️ È la prova che decide se il modello va a schermo. Un modello sui gol si
// misura, non si crede: se le partite con 3,1 gol attesi non ne segnano più di
// quelle con 2,2, l'indicatore non serve a niente.

import { sql } from '../lib/db.js';
import { golAttesi, SOGLIE_OVER, K_STRETTA, BASE_DEFAULT , intervalloGol } from '../../app/src/lib/gol.js';
import { MIN_PARTITE, PARTITE_FINESTRA } from '../../app/src/lib/vpm.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 3);
const K = arg('k', K_STRETTA);   // la stretta verso la media: --k=0 la spegne
const BASE = (process.argv.find(x => x.startsWith('--base=')) || `--base=${BASE_DEFAULT}`).split('=')[1];

const righe = await sql`
  select data, stagione, div, casa, trasferta, gol_casa, gol_trasferta,
         coalesce(tirip_casa,0) as tfc, coalesce(tirip_trasf,0) as tft,
         avg_ap_over25, avg_ap_under25, b365_over25, b365_under25
  from partite
  where gol_casa is not null and gol_trasferta is not null
  order by data, div, casa`;

const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-STAGIONI);
console.log(`stagioni: ${stagioni.join(', ')} · stretta K = ${K} · base = ${BASE}\n`);

const storia = new Map();                    // "stagione|div|squadra" → partite viste
const totali = new Map();                    // "stagione|div" → { gol, partite }
const k = (s, d, sq) => `${s}|${d}|${sq}`;
const somme = l => (l.length ? {
  n: l.length, v: 0,
  gf: l.reduce((a, x) => a + x.gf, 0), gs: l.reduce((a, x) => a + x.gs, 0),
  tf: l.reduce((a, x) => a + x.tf, 0), tc: l.reduce((a, x) => a + x.tc, 0),
} : null);

const prove = [];
for (const r of righe) {
  const kd = `${r.stagione}|${r.div}`;
  const med = totali.get(kd);

  if (stagioni.includes(r.stagione) && med && med.partite > 0) {
    const finestre = sq => {
      const l = storia.get(k(r.stagione, r.div, sq));
      if (!l) return null;
      return {
        stagione: somme(l),
        forma: somme(l.slice(-PARTITE_FINESTRA)),
        casa: somme(l.filter(x => x.dove === 'casa').slice(-PARTITE_FINESTRA)),
        fuori: somme(l.filter(x => x.dove === 'fuori').slice(-PARTITE_FINESTRA)),
      };
    };
    const squadre = { [r.casa]: finestre(r.casa), [r.trasferta]: finestre(r.trasferta) };
    const g = golAttesi(squadre, r.casa, r.trasferta, med.gol / med.partite, K, BASE,
      med.tiri ? med.tiri / med.partite : null);
    if (g) prove.push({
      ...g, data: String(r.data).slice(0, 10), golVeri: r.gol_casa + r.gol_trasferta,
      quotaOver25: r.b365_over25 ? Number(r.b365_over25) : null,
      quotaUnder25: r.b365_under25 ? Number(r.b365_under25) : null,
      ggVero: r.gol_casa > 0 && r.gol_trasferta > 0,
      over25Mercato: r.avg_ap_over25 && r.avg_ap_under25
        ? (1 / Number(r.avg_ap_over25)) / (1 / Number(r.avg_ap_over25) + 1 / Number(r.avg_ap_under25)) : null,
    });
  }

  // la partita è giocata: ora entra nella storia
  for (const [sq, gf, gs, tf, tc, dove] of [
    [r.casa, r.gol_casa, r.gol_trasferta, Number(r.tfc), Number(r.tft), 'casa'],
    [r.trasferta, r.gol_trasferta, r.gol_casa, Number(r.tft), Number(r.tfc), 'fuori'],
  ]) {
    const key = k(r.stagione, r.div, sq);
    if (!storia.has(key)) storia.set(key, []);
    storia.get(key).push({ gf, gs, tf, tc, dove });
  }
  if (!totali.has(kd)) totali.set(kd, { gol: 0, tiri: 0, partite: 0 });
  const t = totali.get(kd);
  t.gol += r.gol_casa + r.gol_trasferta;
  t.tiri += Number(r.tfc) + Number(r.tft); t.partite += 2;
}

console.log(`${prove.length} partite stimate (almeno ${MIN_PARTITE} partite per squadra)\n`);

// ── 1. I gol attesi predicono i gol veri? ───────────────────────────────────
console.log('── gol attesi contro gol veri ──');
const FASCE = [[0, 2.2], [2.2, 2.5], [2.5, 2.8], [2.8, 3.1], [3.1, 9]];
for (const [lo, hi] of FASCE) {
  const l = prove.filter(p => p.totale >= lo && p.totale < hi);
  if (l.length < 30) continue;
  const attesi = l.reduce((a, p) => a + p.totale, 0) / l.length;
  const veri = l.reduce((a, p) => a + p.golVeri, 0) / l.length;
  console.log(`  attesi ${lo.toFixed(1)}-${hi === 9 ? 'oltre' : hi.toFixed(1)}  ${String(l.length).padStart(5)} partite` +
    `  ·  media attesa ${attesi.toFixed(2)}  ·  media vera ${veri.toFixed(2)}  ·  scarto ${(veri - attesi >= 0 ? '+' : '')}${(veri - attesi).toFixed(2)}`);
}

// ── 2. Le probabilità sono calibrate? ───────────────────────────────────────
function calibra(nome, pDi, esitoDi) {
  console.log(`\n── ${nome}: probabilità prevista contro frequenza vera ──`);
  for (const [lo, hi] of [[0, .4], [.4, .5], [.5, .6], [.6, .7], [.7, 1]]) {
    const l = prove.filter(p => pDi(p) >= lo && pDi(p) < hi);
    if (l.length < 30) continue;
    const prev = l.reduce((a, p) => a + pDi(p), 0) / l.length;
    const vera = l.filter(esitoDi).length / l.length;
    const seg = vera - prev >= 0 ? '+' : '';
    console.log(`  previsto ${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}%  ${String(l.length).padStart(5)} partite` +
      `  ·  previsto ${(prev * 100).toFixed(1)}%  ·  vero ${(vera * 100).toFixed(1)}%  ·  scarto ${seg}${((vera - prev) * 100).toFixed(1)}`);
  }
}
calibra('OVER 2,5', p => p.over[2], p => p.golVeri > 2);
calibra('GOAL (entrambe segnano)', p => p.gg, p => p.ggVero);

// ── 3. Il confronto onesto: il mercato fa meglio? ───────────────────────────
// ⚠️ Mattia ha detto che non gli interessa il confronto con le quote per
// *giocare*. Ma per sapere se il modello vale qualcosa il mercato è il metro:
// se sbaglia più di lui, è un numero in più che non aggiunge niente.
const conMercato = prove.filter(p => p.over25Mercato != null);
if (conMercato.length > 100) {
  const brier = (f) => conMercato.reduce((a, p) => a + Math.pow(f(p) - (p.golVeri > 2 ? 1 : 0), 2), 0) / conMercato.length;
  const bModello = brier(p => p.over[2]), bMercato = brier(p => p.over25Mercato);
  console.log(`\n── over 2,5: modello contro mercato, su ${conMercato.length} partite ──`);
  console.log(`  errore del modello  ${bModello.toFixed(4)}`);
  console.log(`  errore del mercato  ${bMercato.toFixed(4)}`);
  // ⚠️ Il metro vero non è il mercato, è **la costante**: prevedere sempre la
  // frequenza media. Un modello che non batte quella non sta dicendo niente
  // sulla singola partita, sta solo ripetendo la media del campionato.
  const base = conMercato.filter(p => p.golVeri > 2).length / conMercato.length;
  const bCostante = brier(() => base);
  console.log(`  prevedere sempre ${(base * 100).toFixed(1)}%  ${bCostante.toFixed(4)}   ← il metro vero`);
  console.log(`  ${bModello < bMercato ? '✓ il modello fa meglio' : '✗ il mercato fa meglio'} di ${(Math.abs(bModello - bMercato)).toFixed(4)}` +
    `  (più basso = meglio; è l'errore quadratico medio)`);
  const guadagno = bCostante - bModello, guadagnoMkt = bCostante - bMercato;
  console.log(`  quanto aggiunge il modello alla costante: ${guadagno >= 0 ? '+' : ''}${guadagno.toFixed(4)}` +
    `   ·  quanto ne aggiunge il mercato: +${guadagnoMkt.toFixed(4)}`);
}

// ── 4. Le soglie, a colpo d'occhio ──────────────────────────────────────────
// ── L'INTERVALLO DEI GOL, quello scritto nella scheda ───────────────────────
// ⚠️ A schermo c'è "da X a Y gol, N% delle volte": quel N è calcolato da
// Poisson, quindi va **verificato sui risultati veri** prima di stamparlo.
// Se la copertura dichiarata e quella reale divergono, l'intervallo è una
// promessa che il modello non mantiene.
{
  let somma = 0, dentro = 0, largh = 0;
  for (const p of prove) {
    const i = intervalloGol(p.totale);
    somma += i.copertura;
    if (p.golVeri >= i.da && p.golVeri <= i.a) dentro++;
    largh += i.a - i.da + 1;
  }
  const d = dentro / prove.length, dich = somma / prove.length;
  const es = Math.sqrt(d * (1 - d) / prove.length);
  console.log(`\n── l'intervallo dei gol (quello della scheda) ──`);
  console.log(`  dichiarato ${(dich * 100).toFixed(1)}%  ·  avverato ${(d * 100).toFixed(1)}% ±${(1.96 * es * 100).toFixed(1)}` +
    `  ·  largo ${(largh / prove.length).toFixed(1)} risultati su ${prove.length} partite`);
  console.log(`  ${Math.abs(d - dich) < 1.96 * es ? '✓ mantiene quello che promette' : '✗ promette ' + (dich > d ? 'più' : 'meno') + ' di quanto mantiene'}`);
}

console.log('\n── quanto spesso si avvera ogni soglia ──');
for (const s of SOGLIE_OVER) {
  const prev = prove.reduce((a, p) => a + p.over[s], 0) / prove.length;
  const vera = prove.filter(p => p.golVeri > s).length / prove.length;
  console.log(`  over ${s},5   previsto ${(prev * 100).toFixed(1)}%   vero ${(vera * 100).toFixed(1)}%`);
}
const ggP = prove.reduce((a, p) => a + p.gg, 0) / prove.length;
console.log(`  GG       previsto ${(ggP * 100).toFixed(1)}%   vero ${(prove.filter(p => p.ggVero).length / prove.length * 100).toFixed(1)}%`);

// ── SE LO AVESSI GIOCATO — il risultato pratico ─────────────────────────────
// ⚠️ È la domanda vera, e non è "è calibrato": è *prendendo ogni giorno le
// partite che il modello mette in cima, quante volte l'over si è avverato, e
// quanto sarebbe tornato in tasca*.
const perGiorno = new Map();
for (const p of prove) {
  if (!perGiorno.has(p.data)) perGiorno.set(p.data, []);
  perGiorno.get(p.data).push(p);
}
const prime = (lista, val, n) => [...lista].sort((a, b) => val(b) - val(a)).slice(0, n);
const ultime = (lista, val, n) => [...lista].sort((a, b) => val(a) - val(b)).slice(0, n);

console.log('\n══ SE LO AVESSI GIOCATO ══');
for (const sg of SOGLIE_OVER) {
  const base = prove.filter(p => p.golVeri > sg).length / prove.length;
  console.log(`\n── OVER ${sg},5 · si avvera nel ${(base * 100).toFixed(1)}% di tutte le partite ──`);
  for (const n of [9, 15]) {
    let scelte = [];
    for (const l of perGiorno.values()) scelte = scelte.concat(prime(l, p => p.over[sg], n));
    const ok = scelte.filter(p => p.golVeri > sg).length / scelte.length;
    console.log(`  le prime ${String(n).padStart(2)} del giorno  ${String(scelte.length).padStart(5)} giocate · avverato ${(ok * 100).toFixed(1)}%  (${ok >= base ? '+' : ''}${((ok - base) * 100).toFixed(1)} sulla base)`);
  }
  // e dall'altra parte: le ultime sono le partite da UNDER
  let basse = [];
  for (const l of perGiorno.values()) basse = basse.concat(ultime(l, p => p.over[sg], 9));
  const okU = basse.filter(p => p.golVeri <= sg).length / basse.length;
  console.log(`  le ultime  9 (under)  ${String(basse.length).padStart(5)} giocate · under avverato ${(okU * 100).toFixed(1)}%  (base ${((1 - base) * 100).toFixed(1)}%)`);
}

// ── E in soldi, dove la quota c'è: solo over 2,5 ────────────────────────────
const conQ = prove.filter(p => p.quotaOver25);
if (conQ.length > 500) {
  const perG = new Map();
  for (const p of conQ) { if (!perG.has(p.data)) perG.set(p.data, []); perG.get(p.data).push(p); }
  console.log(`\n── over 2,5 in soldi, alla quota Bet365 di apertura · ${conQ.length} partite con quota ──`);
  const resa = l => l.reduce((a, p) => a + (p.golVeri > 2 ? p.quotaOver25 : 0), 0) / l.length;
  console.log(`  tutte le partite       ${String(conQ.length).padStart(5)} giocate · resa ${(resa(conQ) * 100).toFixed(1)}%   ← la base`);
  for (const n of [9, 15]) {
    let scelte = [];
    for (const l of perG.values()) scelte = scelte.concat(prime(l, p => p.over[2], n));
    console.log(`  le prime ${String(n).padStart(2)} del giorno  ${String(scelte.length).padStart(5)} giocate · resa ${(resa(scelte) * 100).toFixed(1)}%`);
  }
  // ⚠️ La quota under è quella VERA del book. Il primo giro la stimava
  // dall'over come se l'under fosse senza margine, e usciva 106%: un numero
  // inventato. Una quota stimata togliendo il margine non è una quota.
  const conU = basse => basse.filter(p => p.quotaUnder25);
  let basse = [];
  for (const l of perG.values()) basse = basse.concat(ultime(l, p => p.over[2], 9));
  const bu = conU(basse);
  if (bu.length > 200) {
    const resaU = bu.reduce((a, p) => a + (p.golVeri <= 2 ? p.quotaUnder25 : 0), 0) / bu.length;
    const tutteU = conU(conQ);
    const baseU = tutteU.reduce((a, p) => a + (p.golVeri <= 2 ? p.quotaUnder25 : 0), 0) / tutteU.length;
    console.log(`  tutte, giocando under  ${String(tutteU.length).padStart(5)} giocate · resa ${(baseU * 100).toFixed(1)}%   ← la base under`);
    console.log(`  le ultime  9 (under)   ${String(bu.length).padStart(5)} giocate · resa ${(resaU * 100).toFixed(1)}%`);
  }
}

await sql.end();
