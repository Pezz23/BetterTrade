// QUANTO VALE LA PREVISIONE DI ANGOLI E CARTELLINI.
//
//   node --env-file=.env scripts/prova-conteggi.js
//   pomelli: --div=UCL,I1,E0 --mercato=angoli|cartellini --k=4,6,8,12 --finestra=10
//            --base=angoli|tiri|tirip|falli|misto|misto-falli|misto-tirip  --riassunto
//
// ⚠️⚠️ **Cammina nel tempo e non guarda mai avanti**: ogni partita si prevede
// con le partite *precedenti* e basta. È l'unico modo di sapere se il modello
// avrebbe funzionato, invece di scoprire che sa spiegare il passato.
//
// ⚠️ Il metro non è *"quante volte indovina"* da solo, ma **quante ne indovina
// più della base**: su una soglia dove l'over esce il 60% delle volte, dire
// sempre "over" ne indovina il 60%. Un modello che fa 60,5% non serve a
// niente. La stessa regola con cui il 12/10 si è bocciato il GG (54,0% contro
// una base di 53,2%).
//
// ⚠️ E il **Brier**, che misura quanto sono tarate le probabilità e non solo
// il verso: più basso è meglio. Una previsione che dice sempre 50% ha un
// Brier di 0,25.

import { sql, chiudi } from '../lib/db.js';
import { atteso, pOltre, SOGLIE, COLONNE, NOMI } from '../../app/src/lib/conteggi.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const DIVS = arg('div', 'UCL,I1,E0,SP1,JPN1').split(',');
const MERCATI = arg('mercato', 'angoli,cartellini').split(',');
const KAPPA = arg('k', '4,6,8,12').split(',').map(Number);
// ⚠️⚠️ **Da cosa si prevede.** La letteratura (Wheatcroft & Sienkiewicz, e lo
// studio sulla previsione delle statistiche di partita) dice due cose: i
// **tiri** portano informazione oltre il risultato, e gli angoli ne aggiungono
// ancora **dopo** i tiri. Qui si provano tutt'e tre le strade, perché su
// questo archivio ha già vinto una volta l'inatteso: il modello dei gol
// (`lib/gol.js`) usa `BASE_DEFAULT = 'tiri'`, non i gol.
//   angoli → la forza di squadra si misura sugli angoli stessi
//   tiri   → si misura sui tiri, e si riporta alla media angoli della lega
//   misto  → la media delle due forze
const BASE = arg('base', 'angoli');
// ⚠️ `angoli` vuol dire **"il mercato stesso"** (anche sui cartellini: il nome
// è quello del 22/10, quando la prova era solo sugli angoli). Le altre basi
// sono la statistica d'appoggio da cui si misura la FORZA; la SCALA resta
// sempre quella del mercato. `misto-X` è la media fra mercato e X.
// ⚠️⚠️ **I falli dal 29/10/2026** (`sql/47`): sono il meccanismo che produce
// il giallo, e la domanda è se prevedano i cartellini meglio dei cartellini.
const APPOGGIO = {
  tiri: ['tiri_casa', 'tiri_trasf'], tirip: ['tirip_casa', 'tirip_trasf'], falli: ['falli_casa', 'falli_trasf'],
};
const PROXY = BASE === 'misto' ? 'tiri' : BASE.startsWith('misto-') ? BASE.slice(6) : APPOGGIO[BASE] ? BASE : 'tiri';
if (!APPOGGIO[PROXY] || !(BASE === 'angoli' || BASE === PROXY || BASE.startsWith('misto'))) {
  console.error(`✗ --base sconosciuta: ${BASE}`); process.exit(1);
}
const MISTO = BASE.startsWith('misto');
// ⚠️ `--riassunto` stampa **una riga per competizione**: la soglia con la
// base più vicina al 50% (come `--tabella`) e, a parte, le sole partite dove
// il modello **si sbilancia** (≥ 60% o ≤ 40%) — quelle che leggerebbe chi
// gioca. Si usa la prima K della lista.
const RIASSUNTO = process.argv.includes('--riassunto');
const riassunto = [];
const FINESTRA = Number(arg('finestra', 10));   // quante partite per lato si ricordano
// ⚠️⚠️ **`--tabella` stampa il risultato nella forma che la libreria vuole**,
// pronto da incollare in `app/src/lib/conteggi.js`. Serve a non ricopiare
// vent'anni di percentuali a mano: un numero misurato e poi trascritto è un
// numero che può sbagliarsi in silenzio, e questo lo si legge a schermo.
// ⚠️ La soglia scelta è quella con la **base più vicina al 50%**: è la sola
// dove un modello può aggiungere qualcosa — dove l'over esce il 70% delle
// volte, dire sempre over fa 70% e nessuno lo batte.
const TABELLA = process.argv.includes('--tabella');

const n2 = (x) => (x == null ? '—' : x.toFixed(2).replace('.', ','));
const tabella = [];
const pc = (x) => (x == null ? '—' : (x * 100).toFixed(1).replace('.', ',') + '%');

for (const div of DIVS) {
  const [cCasa, cTrasf] = COLONNE[MERCATI[0]];
  const partite = await sql`
    select data, casa, trasferta,
           angoli_casa, angoli_trasf, gialli_casa, gialli_trasf,
           -- I tiri servono alla base alternativa: senza, la prova sui tiri
           -- ripiegava in silenzio sugli angoli e le tre varianti davano lo
           -- stesso identico numero. Un interruttore che non morde e' peggio
           -- di uno che manca: fa credere di aver misurato.
           tiri_casa, tiri_trasf, tirip_casa, tirip_trasf, falli_casa, falli_trasf
    from partite where div = ${div} and angoli_casa is not null and gialli_casa is not null
    order by data, casa`;
  if (partite.length < 200) { console.log(`\n── ${div}: solo ${partite.length} partite con statistiche, salto`); continue; }

  for (const mercato of MERCATI) {
    const [kc, kt] = COLONNE[mercato];
    console.log(`\n── ${div} · ${NOMI[mercato]} · ${partite.length} partite`);

    for (const k of (RIASSUNTO ? KAPPA.slice(0, 1) : KAPPA)) {
      // la storia di ogni squadra, e le medie della competizione: tutto
      // costruito camminando, mai dall'intero archivio
      const storie = new Map();
      const dammi = (s) => storie.get(s) || storie.set(s, { casaFatti: [], casaSubiti: [], fuoriFatti: [], fuoriSubiti: [],
        tCasaFatti: [], tCasaSubiti: [], tFuoriFatti: [], tFuoriSubiti: [] }).get(s);
      const spingi = (v, x) => { v.push(x); if (v.length > FINESTRA) v.shift(); };
      let sommaCasa = 0, sommaTrasf = 0, viste = 0;
      let tSommaCasa = 0, tSommaTrasf = 0;   // i tiri della lega, per la base alternativa

      // per ogni soglia: quante volte il verso era giusto, la base, il Brier
      const conti = SOGLIE[mercato].map(() => ({ giuste: 0, over: 0, n: 0, brier: 0, decise: 0, giusteDecise: 0, overDecise: 0 }));

      for (const p of partite) {
        const fc = Number(p[kc]), ft = Number(p[kt]);
        // la statistica d'appoggio (i nomi `t*` vengono da quando erano solo i tiri)
        const tc = p[APPOGGIO[PROXY][0]] == null ? NaN : Number(p[APPOGGIO[PROXY][0]]);
        const tt = p[APPOGGIO[PROXY][1]] == null ? NaN : Number(p[APPOGGIO[PROXY][1]]);
        const senzaTiri = !Number.isFinite(tc) || !Number.isFinite(tt);
        const casa = dammi(p.casa), trasf = dammi(p.trasferta);
        // ⚠️ Si prevede solo quando **tutt'e due** hanno abbastanza storia: con
        // una squadra sconosciuta il moltiplicatore è 1 e la "previsione" è la
        // media della competizione travestita.
        if (viste > 50 && casa.casaFatti.length >= 3 && trasf.fuoriFatti.length >= 3) {
          // ⚠️ Lo stesso formato che il database consegna all'app (`{ m, n }`):
          // la misura deve passare dalla stessa funzione dello schermo, o
          // misura un modello che nessuno vedrà mai.
          const mn = (v) => ({ m: v.reduce((x, y) => x + y, 0) / v.length, n: v.length });
          const lega = { casa: sommaCasa / viste, trasferta: sommaTrasf / viste };
          // ⚠️ Con la base «tiri» la **forza** si misura sui tiri, ma la
          // **scala** resta quella degli angoli: un moltiplicatore è un
          // rapporto, quindi è trasportabile; una media no.
          const legaTiri = { casa: tSommaCasa / viste, trasferta: tSommaTrasf / viste };
          const suAngoli = () => atteso({
            casa: { fatti: mn(casa.casaFatti), subiti: mn(casa.casaSubiti) },
            trasferta: { fatti: mn(trasf.fuoriFatti), subiti: mn(trasf.fuoriSubiti) }, lega, k });
          const suTiri = () => {
            const f = atteso({
              casa: { fatti: mn(casa.tCasaFatti), subiti: mn(casa.tCasaSubiti) },
              trasferta: { fatti: mn(trasf.tFuoriFatti), subiti: mn(trasf.tFuoriSubiti) }, lega: legaTiri, k });
            // dai tiri attesi agli angoli attesi, col rapporto della lega
            return { casa: f.casa / legaTiri.casa * lega.casa, trasferta: f.trasferta / legaTiri.trasferta * lega.trasferta,
              totale: f.casa / legaTiri.casa * lega.casa + f.trasferta / legaTiri.trasferta * lega.trasferta };
          };
          const a = BASE === 'angoli' || senzaTiri || !casa.tCasaFatti.length || !trasf.tFuoriFatti.length
            ? suAngoli()
            : !MISTO ? suTiri()
            : (() => { const x = suAngoli(), y = suTiri(); return { totale: (x.totale + y.totale) / 2 }; })();
          SOGLIE[mercato].forEach((s, i) => {
            const pOv = pOltre(s, a.totale);
            const vero = fc + ft > s;
            const c = conti[i];
            c.n++; c.over += vero ? 1 : 0;
            c.giuste += ((pOv > 0.5) === vero) ? 1 : 0;
            c.brier += (pOv - (vero ? 1 : 0)) ** 2;
            if (pOv >= 0.6 || pOv <= 0.4) { c.decise++; c.giusteDecise += ((pOv > 0.5) === vero) ? 1 : 0; c.overDecise += vero ? 1 : 0; }
          });
        }
        spingi(casa.casaFatti, fc); spingi(casa.casaSubiti, ft);
        spingi(trasf.fuoriFatti, ft); spingi(trasf.fuoriSubiti, fc);
        if (!senzaTiri) {
          spingi(casa.tCasaFatti, tc); spingi(casa.tCasaSubiti, tt);
          spingi(trasf.tFuoriFatti, tt); spingi(trasf.tFuoriSubiti, tc);
          tSommaCasa += tc; tSommaTrasf += tt;
        }
        sommaCasa += fc; sommaTrasf += ft; viste++;
      }

      if (RIASSUNTO) {
        let sc = null;
        SOGLIE[mercato].forEach((sg, i) => {
          const c = conti[i]; if (!c.n) return;
          const base = Math.max(c.over / c.n, 1 - c.over / c.n);
          if (!sc || Math.abs(base - 0.5) < Math.abs(sc.base - 0.5)) sc = { sg, base, c };
        });
        // le decise si contano su TUTTE le soglie: chi gioca guarda quella dove il modello parla.
        // ⚠️⚠️ **Con la loro base accanto**: su una soglia estrema il modello è
        // «deciso» solo perché quel risultato capita quasi sempre, e il 74% di
        // giuste lì è la frequenza, non merito. La base delle decise è «dico
        // sempre il più frequente **su quella soglia**», sulle stesse partite.
        const dec = conti.reduce((a, c) => ({ n: a.n + c.decise, ok: a.ok + c.giusteDecise,
          base: a.base + (c.over * 2 >= c.n ? c.overDecise : c.decise - c.overDecise) }), { n: 0, ok: 0, base: 0 });
        if (sc) riassunto.push({ div, mercato, soglia: sc.sg, base: sc.base, nostra: sc.c.giuste / sc.c.n, n: sc.c.n,
          brier: sc.c.brier / sc.c.n, decise: dec.n, giusteDecise: dec.ok, baseDecise: dec.base });
        continue;
      }
      if (TABELLA) {
        let scelta = null
        SOGLIE[mercato].forEach((sg, i) => {
          const c = conti[i]; if (!c.n) return
          const base = Math.max(c.over / c.n, 1 - c.over / c.n)
          if (!scelta || Math.abs(base - 0.5) < Math.abs(scelta.base - 0.5)) scelta = { sg, base, nostra: c.giuste / c.n, n: c.n }
        })
        if (scelta) tabella.push({ div, mercato, ...scelta })
        continue
      }
      const righe = SOGLIE[mercato].map((s, i) => {
        const c = conti[i];
        if (!c.n) return `  ${s}: —`;
        const base = Math.max(c.over / c.n, 1 - c.over / c.n);
        const nostra = c.giuste / c.n;
        const segno = nostra > base ? '✓' : ' ';
        return `  over ${String(s).replace('.', ',')}  ${pc(nostra)} contro base ${pc(base)}  ${segno}  Brier ${n2(c.brier / c.n).replace('0,', ',')}  (${c.n})`;
      });
      console.log(` K=${k} · base ${BASE}`);
      righe.forEach(r => console.log(r));
    }
  }
}
if (RIASSUNTO) {
  console.log(`\n── RIASSUNTO · base ${BASE} · K=${KAPPA[0]} · finestra ${FINESTRA}`);
  console.log(`${'comp'.padEnd(5)} ${'mercato'.padEnd(11)} soglia  ${'nostra'.padStart(7)} ${'base'.padStart(7)} ${'scarto'.padStart(7)}  Brier   decise (≥60/≤40%, tutte le soglie) contro la loro base`);
  let sN = 0, sOk = 0, sDec = 0, sDecOk = 0, sDecBase = 0, sScarto = 0;
  for (const r of riassunto) {
    console.log(`${r.div.padEnd(5)} ${r.mercato.padEnd(11)} ${String(r.soglia).padStart(5)}  ${pc(r.nostra).padStart(7)} ${pc(r.base).padStart(7)} ${((r.nostra - r.base) * 100).toFixed(1).padStart(6)}   ${n2(r.brier)}   ${r.decise ? `${pc(r.giusteDecise / r.decise)} contro ${pc(r.baseDecise / r.decise)}` : '—'} su ${r.decise}`);
    sN += r.n; sOk += r.nostra * r.n; sScarto += (r.nostra - r.base) * r.n; sDec += r.decise; sDecOk += r.giusteDecise; sDecBase += r.baseDecise;
  }
  if (riassunto.length) console.log(`TUTTE              nostra ${pc(sOk / sN)} · scarto medio ${(sScarto / sN * 100).toFixed(2)} punti · decise ${sDec ? `${pc(sDecOk / sDec)} contro base ${pc(sDecBase / sDec)} (${((sDecOk - sDecBase) / sDec * 100).toFixed(1)} punti)` : '—'} su ${sDec}`);
}
if (TABELLA) {
  const per = {};
  for (const r of tabella) (per[r.div] ||= {})[r.mercato] = r;
  console.log('\nexport const MISURA = {');
  for (const [div, m] of Object.entries(per)) {
    const pezzi = Object.entries(m).map(([k, r]) =>
      `${k}: { soglia: ${r.sg}, nostra: ${r.nostra.toFixed(3)}, base: ${r.base.toFixed(3)}, n: ${r.n} }`);
    console.log(`  ${div}: { ${pezzi.join(', ')} },`);
  }
  console.log('}');
}
await chiudi();
