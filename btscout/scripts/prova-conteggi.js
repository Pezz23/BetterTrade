// QUANTO VALE LA PREVISIONE DI ANGOLI E CARTELLINI.
//
//   node --env-file=.env scripts/prova-conteggi.js
//   pomelli: --div=UCL,I1,E0 --mercato=angoli|cartellini --k=4,6,8,12 --finestra=10
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
const FINESTRA = Number(arg('finestra', 10));   // quante partite per lato si ricordano

const n2 = (x) => (x == null ? '—' : x.toFixed(2).replace('.', ','));
const pc = (x) => (x == null ? '—' : (x * 100).toFixed(1).replace('.', ',') + '%');

for (const div of DIVS) {
  const [cCasa, cTrasf] = COLONNE[MERCATI[0]];
  const partite = await sql`
    select data, casa, trasferta,
           angoli_casa, angoli_trasf, gialli_casa, gialli_trasf
    from partite where div = ${div} and angoli_casa is not null and gialli_casa is not null
    order by data, casa`;
  if (partite.length < 200) { console.log(`\n── ${div}: solo ${partite.length} partite con statistiche, salto`); continue; }

  for (const mercato of MERCATI) {
    const [kc, kt] = COLONNE[mercato];
    console.log(`\n── ${div} · ${NOMI[mercato]} · ${partite.length} partite`);

    for (const k of KAPPA) {
      // la storia di ogni squadra, e le medie della competizione: tutto
      // costruito camminando, mai dall'intero archivio
      const storie = new Map();
      const dammi = (s) => storie.get(s) || storie.set(s, { casaFatti: [], casaSubiti: [], fuoriFatti: [], fuoriSubiti: [] }).get(s);
      const spingi = (v, x) => { v.push(x); if (v.length > FINESTRA) v.shift(); };
      let sommaCasa = 0, sommaTrasf = 0, viste = 0;

      // per ogni soglia: quante volte il verso era giusto, la base, il Brier
      const conti = SOGLIE[mercato].map(() => ({ giuste: 0, over: 0, n: 0, brier: 0 }));

      for (const p of partite) {
        const fc = Number(p[kc]), ft = Number(p[kt]);
        const casa = dammi(p.casa), trasf = dammi(p.trasferta);
        // ⚠️ Si prevede solo quando **tutt'e due** hanno abbastanza storia: con
        // una squadra sconosciuta il moltiplicatore è 1 e la "previsione" è la
        // media della competizione travestita.
        if (viste > 50 && casa.casaFatti.length >= 3 && trasf.fuoriFatti.length >= 3) {
          // ⚠️ Lo stesso formato che il database consegna all'app (`{ m, n }`):
          // la misura deve passare dalla stessa funzione dello schermo, o
          // misura un modello che nessuno vedrà mai.
          const mn = (v) => ({ m: v.reduce((x, y) => x + y, 0) / v.length, n: v.length });
          const a = atteso({
            casa: { fatti: mn(casa.casaFatti), subiti: mn(casa.casaSubiti) },
            trasferta: { fatti: mn(trasf.fuoriFatti), subiti: mn(trasf.fuoriSubiti) },
            lega: { casa: sommaCasa / viste, trasferta: sommaTrasf / viste }, k });
          SOGLIE[mercato].forEach((s, i) => {
            const pOv = pOltre(s, a.totale);
            const vero = fc + ft > s;
            const c = conti[i];
            c.n++; c.over += vero ? 1 : 0;
            c.giuste += ((pOv > 0.5) === vero) ? 1 : 0;
            c.brier += (pOv - (vero ? 1 : 0)) ** 2;
          });
        }
        spingi(casa.casaFatti, fc); spingi(casa.casaSubiti, ft);
        spingi(trasf.fuoriFatti, ft); spingi(trasf.fuoriSubiti, fc);
        sommaCasa += fc; sommaTrasf += ft; viste++;
      }

      const righe = SOGLIE[mercato].map((s, i) => {
        const c = conti[i];
        if (!c.n) return `  ${s}: —`;
        const base = Math.max(c.over / c.n, 1 - c.over / c.n);
        const nostra = c.giuste / c.n;
        const segno = nostra > base ? '✓' : ' ';
        return `  over ${String(s).replace('.', ',')}  ${pc(nostra)} contro base ${pc(base)}  ${segno}  Brier ${n2(c.brier / c.n).replace('0,', ',')}  (${c.n})`;
      });
      console.log(` K=${k}`);
      righe.forEach(r => console.log(r));
    }
  }
}
await chiudi();
