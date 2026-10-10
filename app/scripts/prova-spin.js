// Mostra da terminale cosa scriverebbe il tasto "Compila spin" delle Spin
// provvisorie, senza toccare la griglia. Usa le stesse librerie dell'app
// (`src/lib/spin.js`, `src/lib/attendibilita.js`): se qui e nell'app i numeri
// differiscono, la differenza sta nella pagina, non nel criterio.
//
//   node --env-file=.env scripts/prova-spin.js [--spin=2]
//
// È nato il 8/10/2026 per decidere se riempire le spin 1 e 2 (voce 5): la
// griglia è un dato condiviso da sei persone, e si guarda prima di scriverlo.

import { admin } from './_admin.js';
import { valuta, categoria, SOGLIE_DEFAULT, martediChiusura } from '../src/lib/attendibilita.js';
import { candidate, componi, conStelline, cellaDa, votateOltreIlLimite } from '../src/lib/spin.js';

const quante = Number((process.argv.find(a => a.startsWith('--spin=')) || '--spin=2').split('=')[1]);

const oggi = new Date().toISOString().slice(0, 10);
const { data: righeGrezze, error } = await admin.from('prossime_partite')
  .select('id, div, campionato, data, ora, casa, trasferta, b365_1,b365_x,b365_2,b365_over25, avg_ap_1,avg_ap_x,avg_ap_2, max_ap_1,max_ap_x,max_ap_2')
  .gte('data', oggi).order('data').order('ora');
if (error) { console.error('✗', error.message); process.exit(1); }

const { data: voti } = await admin.from('voti_partite').select('prossima_id');
const votiDi = id => (voti || []).filter(v => v.prossima_id === id).length;

const righe = (righeGrezze || []).map(valuta).filter(r => r.prob !== null);
const limite = martediChiusura();
const ordinate = conStelline(candidate(righe, { votiDi }), votiDi);

console.log(`${righe.length} future valutate · ${(voti || []).length} voti · limite ${limite} (martedì) · ${ordinate.length} candidate`);

const oltre = votateOltreIlLimite(righe, votiDi);
if (oltre.length) {
  console.log(`\n⛔ ${oltre.length} votate restano fuori, giocano dopo il ${limite}:`);
  oltre.forEach(p => console.log(`   ${p.data}  ${p.casa} - ${p.trasferta}  ${'*'.repeat(votiDi(p.id))}`));
}

const ruolo = pos => (pos === 9 ? 'centro' : pos <= 4 ? 'giallo' : 'blu   ');
for (const [i, celle] of componi(ordinate, quante).entries()) {
  console.log(`\n=== SPIN ${i + 1} ===`);
  for (const { pos, partita: p } of celle) {
    if (!p) { console.log(` ${pos} ${ruolo(pos)}  — vuota`); continue; }
    const c = cellaDa(pos, p);
    const stelle = votiDi(p.id) ? '*'.repeat(votiDi(p.id)) : '';
    console.log(
      ` ${pos} ${ruolo(pos)}  ${`${c.casa} - ${c.ospite}`.padEnd(34)}` +
      ` ${c.pronostico.padEnd(8)} q=${(c.quota || '—').padEnd(5)} ${c.data}` +
      `  att=${(p.probGiocata * 100).toFixed(1)}%  resa=${p.resa ? (p.resa * 100).toFixed(0) + '%' : '—'}` +
      `  ${categoria(p.probGiocata, SOGLIE_DEFAULT).padEnd(6)} ${stelle}`
    );
  }
}
console.log('\nNiente è stato scritto: la griglia si riempie dall\'app, da "Spin provvisorie".');
