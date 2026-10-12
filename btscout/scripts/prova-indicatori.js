// QUALE INDICATORE CI AZZECCA — la misura che sta dietro alla pagina Andamento.
//
//   node --env-file=.env scripts/prova-indicatori.js [--stagioni=3] [--giornata=5]
//
// Per ogni giorno di gioco prende le **prime 15 partite** secondo ogni
// indicatore (le prime 9 sono quelle che Mattia vuole evidenziate) e le
// **prime 30 del weekend intero**, poi guarda quante giocate sono andate bene.
//
// ⚠️ "Azzeccata" = **la giocata proposta per intero** (scelta di Mattia):
// il segno secco, e per le combinate **anche l'over 1,5**.
// ⚠️ Tutto ricostruito camminando nel tempo, con le sole partite precedenti:
// VPM, i gol attesi, l'attendibilità dal consenso di **apertura** e la quota
// Bet365 di **apertura**, che è quella che si sarebbe giocata.
//
// Il metro è la **base**: quante ne azzecchi prendendo tutte le partite del
// giorno. Un indicatore che non batte quella non sta scegliendo, sta pescando.

import { sql } from '../lib/db.js';
import { parametri, forza, vpm, voto, PARTITE_FINESTRA, MIN_PARTITE, VPM_NETTO } from '../../app/src/lib/vpm.js';
import { golAttesi } from '../../app/src/lib/gol.js';
import { REGOLA_OVER, FATTORE_OVER } from '../../app/src/lib/attendibilita.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 3);
const DA_GIORNATA = arg('giornata', 5);
const PRIME = 15, EVIDENZIATE = 9, PRIME_WEEKEND = 30;

const righe = await sql`
  select data, stagione, div, casa, trasferta, esito, gol_casa, gol_trasferta,
         coalesce(tirip_casa,0) as tfc, coalesce(tirip_trasf,0) as tft,
         b365_1, b365_2, avg_ap_1, avg_ap_x, avg_ap_2
  from partite
  where esito is not null and gol_casa is not null
  order by data, div, casa`;

const stagioni = [...new Set(righe.map(r => r.stagione))].sort().slice(-STAGIONI);

// Il weekend che chiude una data (il lunedì), come nelle spin.
function weekend(d) {
  const x = new Date(d); x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + ((8 - x.getDay()) % 7));
  return x.toISOString().slice(0, 10);
}

const storia = new Map(), totali = new Map(), giornate = new Map();
const k = (s, d, sq) => `${s}|${d}|${sq}`;
const somme = l => (l.length ? {
  n: l.length, v: l.reduce((a, x) => a + x.v, 0),
  gf: l.reduce((a, x) => a + x.gf, 0), gs: l.reduce((a, x) => a + x.gs, 0),
  tf: l.reduce((a, x) => a + x.tf, 0), tc: l.reduce((a, x) => a + x.tc, 0),
} : null);
const finestreDi = (s, d, sq) => {
  const l = storia.get(k(s, d, sq));
  if (!l) return null;
  return { stagione: somme(l), forma: somme(l.slice(-PARTITE_FINESTRA)),
           casa: somme(l.filter(x => x.dove === 'casa').slice(-PARTITE_FINESTRA)),
           fuori: somme(l.filter(x => x.dove === 'fuori').slice(-PARTITE_FINESTRA)) };
};

const valutate = [];
for (const r of righe) {
  const kd = `${r.stagione}|${r.div}`;
  const giornata = giornate.get(kd) || 0;
  const med = totali.get(kd);

  if (stagioni.includes(r.stagione) && giornata >= DA_GIORNATA && med?.partite
      && r.avg_ap_1 && r.avg_ap_x && r.avg_ap_2 && r.b365_1 && r.b365_2) {
    const S = 1 / Number(r.avg_ap_1) + 1 / Number(r.avg_ap_x) + 1 / Number(r.avg_ap_2);
    const p1 = (1 / Number(r.avg_ap_1)) / S, p2 = (1 / Number(r.avg_ap_2)) / S;
    const segno = p1 >= p2 ? 'H' : 'A';
    const prob = segno === 'H' ? p1 : p2;
    const quota = Number(segno === 'H' ? r.b365_1 : r.b365_2);

    // la giocata, con la regola del progetto: sotto 1,25 si aggiunge l'over 1,5
    const combinata = quota < REGOLA_OVER;
    const probGiocata = combinata ? prob * FATTORE_OVER : prob;
    const quotaResa = combinata ? quota / FATTORE_OVER : quota;
    const resa = quotaResa * probGiocata;

    const fc = finestreDi(r.stagione, r.div, r.casa), ff = finestreDi(r.stagione, r.div, r.trasferta);
    const v = vpm(forza({ stagione: parametri(fc?.stagione), forma: parametri(fc?.forma), ruolo: parametri(fc?.casa) }, 'casa'),
                  forza({ stagione: parametri(ff?.stagione), forma: parametri(ff?.forma), ruolo: parametri(ff?.fuori) }, 'fuori'));
    const gol = golAttesi({ [r.casa]: fc, [r.trasferta]: ff }, r.casa, r.trasferta, med.gol / med.partite, undefined, undefined, med.tiri / med.partite);

    // ⚠️ azzeccata = la giocata PER INTERO: il segno, e se è combinata anche l'over 1,5
    const segnoGiusto = r.esito === segno;
    const vinta = segnoGiusto && (!combinata || r.gol_casa + r.gol_trasferta >= 2);

    valutate.push({
      data: String(r.data).slice(0, 10), weekend: weekend(r.data), stagione: r.stagione,
      casa: r.casa, trasferta: r.trasferta, combinata, vinta, segnoGiusto,
      att: probGiocata, vpm: v?.punti ?? null, resa, quotaResa,
      voto: voto(resa, v?.punti ?? null), golAttesi: gol?.totale ?? null,
      // gli indicatori dei gol, con il loro esito vero accanto
      pOver05: gol?.over?.[0] ?? null, pOver15: gol?.over?.[1] ?? null,
      pOver25: gol?.over?.[2] ?? null, pOver35: gol?.over?.[3] ?? null, pGg: gol?.gg ?? null,
      over05: r.gol_casa + r.gol_trasferta > 0, over15: r.gol_casa + r.gol_trasferta > 1,
      over25: r.gol_casa + r.gol_trasferta > 2, over35: r.gol_casa + r.gol_trasferta > 3,
      gg: r.gol_casa > 0 && r.gol_trasferta > 0,
      accordoVpm: v ? (v.segno === '1' ? 'H' : 'A') === segno : null,
    });
  }

  for (const [sq, gf, gs, tf, tc, dove] of [
    [r.casa, r.gol_casa, r.gol_trasferta, Number(r.tfc), Number(r.tft), 'casa'],
    [r.trasferta, r.gol_trasferta, r.gol_casa, Number(r.tft), Number(r.tfc), 'fuori'],
  ]) {
    const key = k(r.stagione, r.div, sq);
    if (!storia.has(key)) storia.set(key, []);
    storia.get(key).push({ gf, gs, tf, tc, dove, v: gf > gs ? 1 : 0 });
  }
  if (!totali.has(kd)) totali.set(kd, { gol: 0, tiri: 0, partite: 0 });
  const t = totali.get(kd);
  t.gol += r.gol_casa + r.gol_trasferta; t.tiri += Number(r.tfc) + Number(r.tft); t.partite += 2;
  giornate.set(kd, Math.min(storia.get(k(r.stagione, r.div, r.casa)).length,
                            storia.get(k(r.stagione, r.div, r.trasferta)).length));
}

console.log(`stagioni ${stagioni.join(', ')} · dalla ${DA_GIORNATA}ª giornata`);
console.log(`${valutate.length} partite valutate, di cui ${valutate.filter(v => v.vpm != null).length} con VPM\n`);

const INDICATORI = [
  { id: 'att',   label: 'attendibilità', val: x => x.att },
  { id: 'vpm',   label: 'VPM',           val: x => x.vpm },
  { id: 'resa',  label: 'resa',          val: x => x.resa },
  { id: 'voto',  label: 'voto',          val: x => x.voto },
];

// Le prime N di un gruppo secondo un indicatore, ordine deterministico.
const primeN = (lista, val, n) => [...lista]
  .filter(x => val(x) != null)
  .sort((a, b) => val(b) - val(a) || a.data.localeCompare(b.data) || a.casa.localeCompare(b.casa))
  .slice(0, n);

// ⚠️ Due metri, non uno. **Azzeccate** dice quante ne indovini: è il metro
// dell'attendibilità, e di chi gioca una schedina da nove. **Resa realizzata**
// dice quanto torna per ogni euro: è il metro della resa e del voto, che non
// servono a indovinare ma a rendere. Giudicare la resa sulle azzeccate è come
// giudicare un difensore sui gol fatti.
const soldi = l => l.reduce((a, x) => a + (x.vinta ? x.quotaResa : 0), 0) / l.length;

function riassunto(etichetta, gruppi, n) {
  console.log(`\n── ${etichetta} ──`);
  const base = valutate.filter(x => x.vpm != null);
  const pBase = base.filter(x => x.vinta).length / base.length, sBase = soldi(base);
  console.log(`  ${'tutte le partite'.padEnd(16)} ${String(base.length).padStart(5)} giocate · azzeccate ${(pBase * 100).toFixed(1)}% · resa realizzata ${(sBase * 100).toFixed(1)}%   ← la base`);
  for (const ind of INDICATORI) {
    let scelte = [];
    for (const g of gruppi.values()) scelte = scelte.concat(primeN(g, ind.val, n));
    if (!scelte.length) continue;
    const ok = scelte.filter(x => x.vinta).length / scelte.length, sl = soldi(scelte);
    console.log(`  ${ind.label.padEnd(16)} ${String(scelte.length).padStart(5)} giocate · azzeccate ${(ok * 100).toFixed(1)}%` +
      ` (${ok >= pBase ? '+' : ''}${((ok - pBase) * 100).toFixed(1)})` +
      ` · resa realizzata ${(sl * 100).toFixed(1)}% (${sl >= sBase ? '+' : ''}${((sl - sBase) * 100).toFixed(1)})`);
  }
}

const perGiorno = new Map(), perWeekend = new Map();
for (const x of valutate.filter(x => x.vpm != null)) {
  if (!perGiorno.has(x.data)) perGiorno.set(x.data, []);
  perGiorno.get(x.data).push(x);
  if (!perWeekend.has(x.weekend)) perWeekend.set(x.weekend, []);
  perWeekend.get(x.weekend).push(x);
}

riassunto(`le prime ${EVIDENZIATE} di ogni giorno (le evidenziate)`, perGiorno, EVIDENZIATE);
riassunto(`le prime ${PRIME} di ogni giorno`, perGiorno, PRIME);
riassunto(`le prime ${PRIME_WEEKEND} di ogni weekend`, perWeekend, PRIME_WEEKEND);

// ── LA TABELLA DELLE SOGLIE ─────────────────────────────────────────────────
// ⚠️ **Questo è il metro di Mattia**, chiarito il 12/10/2026: *"non voglio una
// sfera di cristallo che indovina tutte. Voglio indicatori che mi aiutano a
// leggere la partita, e sapere se sopra una certa soglia ha senso giocarlo:
// se l'indicatore è sopra al tot%, succede X volte."*
// Quindi niente confronti col mercato e niente soldi: per ogni indicatore,
// **sopra ogni soglia, quante volte l'esito arriva** e su quante partite.
// ⚠️ La colonna BASE resta, ed è l'unica cosa che rende leggibile il resto:
// senza, non si distingue "la soglia seleziona" da "quell'esito è frequente".
// ⚠️ La colonna A GIORNATA dice se la soglia è **usabile**: una soglia che dà
// mezza partita a weekend ha ragione e non serve a niente.
{
  const giorni = new Set(valutate.map(x => x.data)).size;
  const SOGLIE = [
    { label: 'attendibilità', val: x => x.att,     esito: x => x.vinta,   fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.60, 0.65, 0.70, 0.75, 0.80, 0.85], nota: 'la giocata proposta (segno, e over 1,5 se combinata)' },
    { label: 'VPM',           val: x => x.vpm,     esito: x => x.vinta,   fmt: v => v.toFixed(1).replace('.', ','),
      liv: [6, 6.5, 7, 7.5, 8, 8.5], nota: 'la giocata proposta' },
    { label: 'voto',          val: x => x.voto,    esito: x => x.vinta,   fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.90, 0.95, 1.00, 1.05, 1.10], nota: 'la giocata proposta' },
    { label: 'resa',          val: x => x.resa,    esito: x => x.vinta,   fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.90, 0.95, 1.00, 1.05, 1.10], nota: 'la giocata proposta' },
    // ⚠️ OGNI RIGA HA LA SUA SCALA, e non si possono colorare con la stessa:
    // l'over 0,5 sta quasi sempre sopra il 90%, quindi lì un 82% è un numero
    // BASSO, mentre sull'over 1,5 è il massimo che il modello arriva a dire.
    { label: 'over 0,5',      val: x => x.pOver05, esito: x => x.over05,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.90, 0.92, 0.93, 0.94, 0.95], nota: 'arriva almeno 1 gol' },
    { label: 'over 1,5',      val: x => x.pOver15, esito: x => x.over15,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.70, 0.75, 0.78, 0.79, 0.80, 0.82, 0.84], nota: 'arrivano almeno 2 gol' },
    { label: 'over 2,5',      val: x => x.pOver25, esito: x => x.over25,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.45, 0.50, 0.55, 0.58, 0.60, 0.62, 0.65], nota: 'arrivano almeno 3 gol' },
    { label: 'over 3,5',      val: x => x.pOver35, esito: x => x.over35,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.25, 0.30, 0.35, 0.40, 0.45], nota: 'arrivano almeno 4 gol' },
    // ⚠️ IL LATO UNDER, mai misurato prima. Non è il complemento gratuito:
    // "l'over 2,5 è improbabile" e "l'under 2,5 è affidabile" sono la stessa
    // probabilità ma due soglie diverse, perché le basi sono diverse (49% e
    // 51%) e il modello può essere bravo da un lato e no dall'altro.
    { label: 'under 1,5',     val: x => x.pOver15 == null ? null : 1 - x.pOver15, esito: x => !x.over15, fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.20, 0.24, 0.26, 0.28, 0.30], nota: 'meno di 2 gol' },
    { label: 'under 2,5',     val: x => x.pOver25 == null ? null : 1 - x.pOver25, esito: x => !x.over25, fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.45, 0.50, 0.52, 0.55, 0.58], nota: 'meno di 3 gol' },
    { label: 'under 0,5',     val: x => x.pOver05 == null ? null : 1 - x.pOver05, esito: x => !x.over05, fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.06, 0.08, 0.10, 0.12], nota: 'zero gol (0-0)' },
    { label: 'under 3,5',     val: x => x.pOver35 == null ? null : 1 - x.pOver35, esito: x => !x.over35, fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.65, 0.70, 0.72, 0.75, 0.78], nota: 'meno di 4 gol' },
    { label: 'Goal',          val: x => x.pGg,     esito: x => x.gg,      fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.52, 0.55, 0.57, 0.58, 0.60, 0.62], nota: 'segnano entrambe' },
    { label: 'NoGoal',        val: x => x.pGg == null ? null : 1 - x.pGg, esito: x => !x.gg, fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.46, 0.48, 0.50, 0.52, 0.55], nota: 'almeno una non segna' },
  ];
  console.log(`\n\n══ LA TABELLA DELLE SOGLIE ══  ${valutate.length} partite in ${giorni} giorni di gioco\n`);
  for (const S of SOGLIE) {
    const tutte = valutate.filter(x => S.val(x) != null);
    if (!tutte.length) continue;
    const base = tutte.filter(S.esito).length / tutte.length;
    console.log(`── ${S.label} → ${S.nota}`);
    console.log(`   ${'soglia'.padStart(7)}  ${'partite'.padStart(7)}  ${'a giornata'.padStart(10)}  ${'succede'.padStart(8)}   contro la base ${(base * 100).toFixed(1)}%`);
    for (const t of S.liv) {
      const l = tutte.filter(x => S.val(x) >= t);
      if (l.length < 100) { console.log(`   ${S.fmt(t).padStart(7)}  ${String(l.length).padStart(7)}  troppo poche per dire qualcosa`); continue }
      const q = l.filter(S.esito).length / l.length;
      // l'intervallo: con poche partite una soglia "migliore" può essere rumore
      const es = Math.sqrt(q * (1 - q) / l.length);
      const d = (q - base) * 100;
      const utile = d - 1.96 * es * 100 > 0;
      console.log(`   ${S.fmt(t).padStart(7)}  ${String(l.length).padStart(7)}  ${(l.length / giorni).toFixed(1).padStart(10)}  ${(q * 100).toFixed(1).padStart(7)}%` +
        `   ${(d >= 0 ? '+' : '')}${d.toFixed(1)} ±${(1.96 * es * 100).toFixed(1)}  ${utile ? '✓' : '·'}`);
    }
    console.log('');
  }
  console.log(`   ✓ = sopra quella soglia l'esito arriva più spesso che in generale, e lo scarto`);
  console.log(`       è più grande del margine d'errore. · = lo scarto sta dentro il rumore.`);
}

// ── Il punto in comune: quando sono tutti d'accordo ─────────────────────────
console.log(`\n── quando TUTTI E QUATTRO mettono la partita fra le prime ${EVIDENZIATE} del giorno ──`);
const inTesta = new Map();
for (const [giorno, lista] of perGiorno) {
  for (const ind of INDICATORI) {
    for (const x of primeN(lista, ind.val, EVIDENZIATE)) {
      const key = `${giorno}|${x.casa}|${x.trasferta}`;
      if (!inTesta.has(key)) inTesta.set(key, { x, quanti: 0 });
      inTesta.get(key).quanti++;
    }
  }
}
for (let q = 1; q <= 4; q++) {
  const l = [...inTesta.values()].filter(e => e.quanti === q).map(e => e.x);
  if (l.length < 20) continue;
  console.log(`  d'accordo in ${q}  ${String(l.length).padStart(5)} giocate · azzeccate ${(l.filter(x => x.vinta).length / l.length * 100).toFixed(1)}%`);
}
const tutti = [...inTesta.values()].filter(e => e.quanti === 4).map(e => e.x);
if (tutti.length >= 20) {
  const comb = tutti.filter(x => x.combinata).length;
  console.log(`\n  le ${tutti.length} con tutti e quattro d'accordo: ${comb} erano combinate con l'over 1,5`);
  console.log(`  solo il segno (senza chiedere l'over): ${(tutti.filter(x => x.segnoGiusto).length / tutti.length * 100).toFixed(1)}%`);
}

// ── Quale COMBINAZIONE di indicatori sceglie meglio ────────────────────────
// ⚠️ "Tutti e quattro d'accordo" non è detto che sia il meglio: basta che uno
// dei quattro scelga male e trascina giù anche gli altri. Qui si provano tutti
// i sottoinsiemi: l'intersezione delle prime 9 di ciascuno.
console.log(`\n── ogni combinazione: le partite nelle prime ${EVIDENZIATE} di TUTTI gli indicatori scelti ──`);
const combi = [];
for (let m = 1; m < 16; m++) {
  const scelti = INDICATORI.filter((_, i) => m & (1 << i));
  let dentro = [];
  for (const [, lista] of perGiorno) {
    let insieme = null;
    for (const ind of scelti) {
      const top = new Set(primeN(lista, ind.val, EVIDENZIATE).map(x => `${x.casa}|${x.trasferta}`));
      insieme = insieme === null ? top : new Set([...insieme].filter(x => top.has(x)));
    }
    dentro = dentro.concat(lista.filter(x => insieme.has(`${x.casa}|${x.trasferta}`)));
  }
  if (dentro.length < 200) continue;
  combi.push({ nomi: scelti.map(s => s.label).join(' + '), n: dentro.length,
               ok: dentro.filter(x => x.vinta).length / dentro.length, soldi: soldi(dentro) });
}
const base = valutate.filter(x => x.vpm != null);
const pBase = base.filter(x => x.vinta).length / base.length;
for (const c of combi.sort((a, b) => b.ok - a.ok)) {
  console.log(`  ${c.nomi.padEnd(38)} ${String(c.n).padStart(5)} giocate · azzeccate ${(c.ok * 100).toFixed(1)}%` +
    ` (${c.ok >= pBase ? '+' : ''}${((c.ok - pBase) * 100).toFixed(1)}) · resa ${(c.soldi * 100).toFixed(1)}%`);
}

await sql.end();
