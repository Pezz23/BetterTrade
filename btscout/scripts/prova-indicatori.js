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
import { ricostruisci } from '../lib/ricostruisci.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 3);
const DA_GIORNATA = arg('giornata', 5);
const PRIME = 15, EVIDENZIATE = 9, PRIME_WEEKEND = 30;

// ⚠️ La ricostruzione camminando nel tempo **non è più qui**: stava anche in
// `calcola-andamento.js` e due copie dello stesso calcolo divergono. È in
// `lib/ricostruisci.js`, e il 12/10/2026 le due copie **erano già divergute**:
// questa usava `String(r.data).slice(0,10)` come chiave del giorno, che su un
// oggetto Date dà `"Mon Oct 05"` — senza anno. Risultato: le partite del 5
// ottobre di stagioni diverse finivano nello stesso "giorno", e le prime 9 del
// giorno pescavano da un mucchio più grande del vero.
const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: DA_GIORNATA });

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
    { label: 'over 0,5',      val: x => x.over?.[0], esito: x => x.golTotali > 0,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.90, 0.92, 0.93, 0.94, 0.95], nota: 'arriva almeno 1 gol' },
    { label: 'over 1,5',      val: x => x.over?.[1], esito: x => x.golTotali > 1,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.70, 0.75, 0.78, 0.79, 0.80, 0.82, 0.84], nota: 'arrivano almeno 2 gol' },
    { label: 'over 2,5',      val: x => x.over?.[2], esito: x => x.golTotali > 2,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.45, 0.50, 0.55, 0.58, 0.60, 0.62, 0.65], nota: 'arrivano almeno 3 gol' },
    { label: 'over 3,5',      val: x => x.over?.[3], esito: x => x.golTotali > 3,  fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.25, 0.30, 0.35, 0.40, 0.45], nota: 'arrivano almeno 4 gol' },
    // ⚠️ IL LATO UNDER, mai misurato prima. Non è il complemento gratuito:
    // "l'over 2,5 è improbabile" e "l'under 2,5 è affidabile" sono la stessa
    // probabilità ma due soglie diverse, perché le basi sono diverse (49% e
    // 51%) e il modello può essere bravo da un lato e no dall'altro.
    { label: 'under 1,5',     val: x => x.over?.[1] == null ? null : 1 - x.over[1], esito: x => !(x.golTotali > 1), fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.20, 0.24, 0.26, 0.28, 0.30], nota: 'meno di 2 gol' },
    { label: 'under 2,5',     val: x => x.over?.[2] == null ? null : 1 - x.over[2], esito: x => !(x.golTotali > 2), fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.45, 0.50, 0.52, 0.55, 0.58], nota: 'meno di 3 gol' },
    { label: 'under 0,5',     val: x => x.over?.[0] == null ? null : 1 - x.over[0], esito: x => !(x.golTotali > 0), fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.06, 0.08, 0.10, 0.12], nota: 'zero gol (0-0)' },
    { label: 'under 3,5',     val: x => x.over?.[3] == null ? null : 1 - x.over[3], esito: x => !(x.golTotali > 3), fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.65, 0.70, 0.72, 0.75, 0.78], nota: 'meno di 4 gol' },
    { label: 'Goal',          val: x => x.gg,     esito: x => x.ggVero,      fmt: v => `${(v * 100).toFixed(0)}%`,
      liv: [0.52, 0.55, 0.57, 0.58, 0.60, 0.62], nota: 'segnano entrambe' },
    { label: 'NoGoal',        val: x => x.gg == null ? null : 1 - x.gg, esito: x => !x.ggVero, fmt: v => `${(v * 100).toFixed(0)}%`,
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
  // ── LA SOGLIA PER ARRIVARE A UN TASSO, non per battere la base ────────────
  // ⚠️ Due domande diverse, e Mattia vuole la seconda (12/10/2026):
  //   a) "sopra questa soglia l'esito arriva più spesso del suo solito?" —
  //      statistica, ed è quella che l'over 3,5 supera al 35% pur arrivando
  //      solo il 37,9% delle volte: vero e inutile da giocare.
  //   b) "da che valore in su la giocata ha dato esiti positivi?" — pratica.
  // Qui si risponde a (b): la soglia più bassa da cui l'esito arriva almeno
  // il tot% delle volte. Vuota = non ci arriva mai, a nessuna soglia.
  console.log(`\n══ DA CHE VALORE IN SU LA GIOCATA HA FUNZIONATO ══`);
  console.log(`   (la soglia più bassa che porta l'esito al tasso richiesto, e quante partite dà a giornata)\n`);
  const TASSI = [0.60, 0.65, 0.70, 0.75, 0.80];
  console.log(`   ${'indicatore'.padEnd(12)} ${TASSI.map(t => `${(t * 100).toFixed(0)}%`.padStart(14)).join('')}`);
  for (const S of SOGLIE) {
    const tutte = valutate.filter(x => S.val(x) != null);
    if (!tutte.length) continue;
    // ⚠️ Le soglie si cercano sui VALORI VERI dell'indicatore, non su una
    // griglia da 0 a 1: VPM va da 5,5 a 10 e il voto sta attorno a 1, quindi
    // una griglia di percentuali li saltava del tutto e stampava "—" su righe
    // che invece funzionano (VPM ≥8,5 porta la giocata al 71,4%).
    const ordinati = tutte.map(S.val).sort((a, b) => a - b);
    const candidate = [];
    for (let q = 0; q < 100; q++) candidate.push(ordinati[Math.floor(ordinati.length * q / 100)]);
    const celle = TASSI.map(T => {
      for (const t of candidate) {
        const l = tutte.filter(x => S.val(x) >= t);
        if (l.length < 300) break;                       // sotto 300 è rumore
        if (l.filter(S.esito).length / l.length >= T) return `${S.fmt(t)}→${(l.length / giorni).toFixed(1)}`.padStart(14);
      }
      return '—'.padStart(14);
    });
    console.log(`   ${S.label.padEnd(12)} ${celle.join('')}`);
  }
  // ── Il dettaglio delle righe che superano il pavimento di Mattia ──────────
  // ⚠️ Pavimento: 70% per over/under, 65% per Goal/NoGoal (deciso il
  // 12/10/2026). ⚠️ E la soglia deve SELEZIONARE: una riga che passa il
  // pavimento già a partire dal suo valore più basso non dipende dalla
  // partita, quindi sarebbe una cella sempre accesa — cioè nessuna
  // informazione. Qui si cerca il punto in cui fa tutt'e due le cose.
  console.log(`\n── dove si accendono, riga per riga ──`);
  for (const S of SOGLIE) {
    const tutte = valutate.filter(x => S.val(x) != null);
    if (!tutte.length) continue;
    const ordinati = tutte.map(S.val).sort((a, b) => a - b);
    const righeOk = [];
    for (let q = 10; q < 100; q += 5) {
      const t = ordinati[Math.floor(ordinati.length * q / 100)];
      const l = tutte.filter(x => S.val(x) >= t);
      if (l.length < 300) break;
      const tasso = l.filter(S.esito).length / l.length;
      righeOk.push(`${S.fmt(t)}:${(tasso * 100).toFixed(0)}%/${(l.length / giorni).toFixed(1)}`);
    }
    console.log(`   ${S.label.padEnd(12)} ${righeOk.join('  ')}`);
  }
  console.log(`   (soglia : tasso / partite al giorno — si cerca il tasso alto con partite ancora a sufficienza)`);

  console.log(`\n   si legge "62%→2,0" = da quel valore in su l'esito arriva al tasso della colonna,`);
  console.log(`   e sono 2,0 partite al giorno. "—" = non ci arriva a nessuna soglia utilizzabile.`);

  // ── IL GRADIENTE A QUATTRO FASCE ──────────────────────────────────────────
  // ⚠️ Regola ricavata dall'esempio di Mattia (12/10/2026): *"con over 2,5
  // abbiamo il 64%: 0-40 rosso, 40-54 giallo, 54-60 verdino, 60 in su verde
  // brillante"*. Quei tre tagli, sulla base del 51%, sono esattamente:
  //    giallo  = base − 20% dello spazio sotto la base
  //    verdino = base +  6% dello spazio sopra la base
  //    verde   = base + 20% dello spazio sopra la base
  // ⚠️ Gli scarti sono **in proporzione allo spazio disponibile**, non in punti
  // fissi: l'over 0,5 ha base 92,9% e sopra gli restano 7 punti, quindi
  // "base + 10 punti" non esisterebbe. In proporzione invece la scala vale per
  // tutte e dieci le righe.
  // Qui si verifica che le fasce vogliano dire qualcosa: dentro ognuna, quante
  // volte l'esito è arrivato davvero.
  const taglia4 = (base) => ({
    giallo: base - 0.20 * base,
    verdino: base + 0.06 * (1 - base),
    verde: base + 0.20 * (1 - base),
  });
  console.log(`\n══ IL GRADIENTE: quanto vale ogni fascia ══\n`);
  console.log(`   ${'riga'.padEnd(11)} ${'base'.padStart(5)}  ${'tagli'.padStart(16)}   rosso · giallo · verdino · verde  (tasso vero, % delle partite)`);
  for (const S of SOGLIE) {
    const tutte = valutate.filter(x => S.val(x) != null);
    // ⚠️ Solo le righe dei gol: attendibilità, VPM, voto e resa non hanno un
    // gradiente a schermo, e voto/resa stanno attorno a 1 — finivano tutti
    // nella fascia verde per sbaglio.
    if (!tutte.length || !/^(over|under|Goal|NoGoal)/.test(S.label)) continue;
    const base = tutte.filter(S.esito).length / tutte.length;
    const t = taglia4(base);
    const fascia = (v) => v >= t.verde ? 3 : v >= t.verdino ? 2 : v >= t.giallo ? 1 : 0;
    const out = [0, 1, 2, 3].map(i => {
      const l = tutte.filter(x => fascia(S.val(x)) === i);
      if (!l.length) return '—'.padStart(13);
      return `${(l.filter(S.esito).length / l.length * 100).toFixed(0)}% (${(l.length / tutte.length * 100).toFixed(0)}%)`.padStart(13);
    });
    console.log(`   ${S.label.padEnd(11)} ${(base * 100).toFixed(1).padStart(5)}  ${`${(t.giallo * 100).toFixed(0)}·${(t.verdino * 100).toFixed(0)}·${(t.verde * 100).toFixed(0)}`.padStart(16)}  ${out.join('')}`);
  }

  console.log(`\n   ✓ = sopra quella soglia l'esito arriva più spesso che in generale, e lo scarto`);
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
