// RENDICONTO — il criterio funziona? E quanto bene lo sappiamo?
//
// Due domande diverse, due fonti diverse:
//
//   A. LA CALIBRAZIONE, sull'archivio. Le proposte vere sono poche decine:
//      per sapere se "75%" vale davvero 75% servono migliaia di partite. Il
//      criterio si applica all'indietro su tutto l'archivio (avg_ap_* c'è
//      dalla stagione 19/20) e si guarda quante volte l'esito è uscito.
//      Qui non c'è sguardo al futuro: la selezione usa solo le quote di
//      APERTURA, che esistevano prima della partita.
//
//   B. IL VISSUTO, sulle partite che abbiamo davvero proposto
//      (prossime_partite riconciliate con lo storico). Poche ma reali:
//      dicono anche se le quote viste prima erano fedeli e se le stelline
//      degli admin aggiungono qualcosa.
//
// ⚠️ La parte B è RICOSTRUITA CON LE REGOLE DI OGGI, non è il registro di
//    quello che il gruppo ha giocato davvero (quello sta in `griglia`, non
//    ancora collegata alle partite). Se le regole cambiano, cambia anche il
//    passato di questo rapporto.
//
// Uso:  node --env-file=.env scripts/rendiconto.js
//       node --env-file=.env scripts/rendiconto.js --da=2223    (solo da quella stagione)

import { sql, chiudi } from '../lib/db.js';
import { valuta, categoria, SOGLIE_DEFAULT } from '../../app/src/lib/attendibilita.js';

const arg = n => (process.argv.find(a => a.startsWith(`--${n}=`)) || '').split('=')[1];
const DA = arg('da') || '1920';

const pct = (x, tot) => tot ? (100 * x / tot).toFixed(1).padStart(5) + '%' : '    —';
const riga = (etichetta, prese, tot, extra = '') =>
  console.log(`  ${etichetta.padEnd(28)} ${String(prese).padStart(5)}/${String(tot).padEnd(6)} ${pct(prese, tot)}  ${extra}`);

// Vinta o no: il segno secco, oppure il segno più l'over 1,5.
const vinta = (giocata, r) => {
  const atteso = giocata[0] === '1' ? 'H' : 'A';
  if (r.esito !== atteso) return false;
  return giocata.includes('over') ? r.gol_casa + r.gol_trasferta > 1.5 : true;
};

// ─────────────────────────────────────────────────────────────────────────────
// A. LA CALIBRAZIONE, sull'archivio
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(74)}`);
console.log(`A. CALIBRAZIONE DEL CRITERIO — archivio dalla stagione ${DA}`);
console.log('='.repeat(74));

const storiche = await sql`
  select div, stagione, esito, gol_casa, gol_trasferta,
         b365_1, b365_x, b365_2, avg_ap_1, avg_ap_x, avg_ap_2, max_ap_1, max_ap_x, max_ap_2
  from partite
  where stagione >= ${DA} and avg_ap_1 is not null and esito is not null
  order by stagione, data`;

// `valuta` si aspetta le colonne di prossime_partite: b365_* fa da book.
const valutate = storiche.map(valuta).filter(r => r.prob !== null);
console.log(`\nPartite con il consenso di apertura: ${valutate.length}`);

console.log(`\n— Quando diciamo X%, quante volte esce? (la riga chiave) —`);
console.log(`  fascia dichiarata            prese/totali  reale   atteso   scarto`);
const fasce = [[.50, .55], [.55, .60], [.60, .65], [.65, .70], [.70, .75], [.75, .80], [.80, .90], [.90, 1.01]];
for (const [da, a] of fasce) {
  const g = valutate.filter(r => r.probGiocata >= da && r.probGiocata < a);
  if (!g.length) continue;
  const prese = g.filter(r => vinta(r.giocata, r)).length;
  const atteso = g.reduce((s, r) => s + r.probGiocata, 0) / g.length;
  const reale = prese / g.length;
  const scarto = reale - atteso;
  const segno = scarto >= 0 ? '+' : '';
  riga(`${(da * 100).toFixed(0)}-${(a * 100).toFixed(0)}%`, prese, g.length,
    `atteso ${(atteso * 100).toFixed(1)}%   ${segno}${(scarto * 100).toFixed(1)} punti`);
}

console.log(`\n— Per categoria, con le soglie di oggi (${Object.entries(SOGLIE_DEFAULT).map(([k, v]) => k + ' ' + (v * 100).toFixed(0)).join(', ')}) —`);
const perCat = {};
for (const r of valutate) (perCat[categoria(r.probGiocata, SOGLIE_DEFAULT)] ??= []).push(r);
for (const cat of ['centro', 'giallo', 'blu']) {
  const g = perCat[cat] || [];
  const prese = g.filter(r => vinta(r.giocata, r)).length;
  const atteso = g.length ? g.reduce((s, r) => s + r.probGiocata, 0) / g.length : 0;
  riga(cat, prese, g.length, `atteso ${(atteso * 100).toFixed(1)}%`);
}

// Il segno secco e la combinata con l'over vanno separati: sulla combinata la
// percentuale dichiarata è solo la probabilità del SEGNO — un limite
// superiore, perché serve anche che si segnino due gol.
console.log(`\n— Segno secco contro "+ over 1,5" —`);
for (const [nome, lista] of [
  ['segno secco', valutate.filter(r => !r.giocata.includes('over'))],
  ['+ over 1,5', valutate.filter(r => r.giocata.includes('over'))],
]) {
  const prese = lista.filter(r => vinta(r.giocata, r)).length;
  const atteso = lista.reduce((s, r) => s + r.probGiocata, 0) / lista.length;
  riga(nome, prese, lista.length, `dichiarato ${(atteso * 100).toFixed(1)}%`);
}
{
  // Quanto costa l'over: fra le partite in cui il favorito ha VINTO, quante
  // volte i gol sono stati almeno due?
  const over = valutate.filter(r => r.giocata.includes('over'));
  const vinteSegno = over.filter(r => r.esito === (r.segno === '1' ? 'H' : 'A'));
  const anche15 = vinteSegno.filter(r => r.gol_casa + r.gol_trasferta > 1.5).length;
  riga('  il segno da solo', vinteSegno.length, over.length);
  riga('  di cui anche over 1,5', anche15, vinteSegno.length,
    `→ l'over toglie ${((1 - anche15 / vinteSegno.length) * 100).toFixed(1)} punti`);
}

console.log(`\n— E una spin? Nove caselle giuste tutte insieme —`);
// Le nove più attendibili di ogni giornata di campionato, come farebbe
// l'app: una spin per campionato e per settimana, quando ci sono almeno 9
// partite sopra soglia.
const perSettimana = new Map();
for (const r of valutate) {
  if (categoria(r.probGiocata, SOGLIE_DEFAULT) === 'no') continue;
  const k = `${r.div}|${r.stagione}`;
  (perSettimana.get(k) ?? perSettimana.set(k, []).get(k)).push(r);
}
let spin = 0, spinPiene = 0, caselle = 0, caselleGiuste = 0, attesaTotale = 0;
for (const lista of perSettimana.values()) {
  lista.sort((a, b) => b.probGiocata - a.probGiocata);
  for (let i = 0; i + 9 <= lista.length; i += 9) {
    const nove = lista.slice(i, i + 9);
    const giuste = nove.filter(r => vinta(r.giocata, r)).length;
    spin++; caselle += 9; caselleGiuste += giuste;
    if (giuste === 9) spinPiene++;
    attesaTotale += nove.reduce((s, r) => s * r.probGiocata, 1);
  }
}
riga('caselle indovinate', caselleGiuste, caselle);
riga('spin perfette (9 su 9)', spinPiene, spin, `attese ${attesaTotale.toFixed(1)}`);

// ─────────────────────────────────────────────────────────────────────────────
// B. IL VISSUTO, sulle partite davvero proposte
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(74)}`);
console.log('B. LE PARTITE CHE ABBIAMO DAVVERO PROPOSTO');
console.log('='.repeat(74));
console.log('  (ricostruite con le regole di oggi, non è il registro delle giocate)');

const nostre = await sql`
  select pp.*, to_char(pp.data,'YYYY-MM-DD') as data,
         p.esito, p.gol_casa, p.gol_trasferta,
         p.b365_1 as reale_b365_1, p.b365_2 as reale_b365_2,
         (select count(*)::int from voti_partite v where v.prossima_id = pp.id) as voti
  from prossime_partite pp join partite p on p.id = pp.partita_id
  order by pp.data`;

const mie = nostre.map(valuta).filter(r => r.prob !== null);
const sopra = mie.filter(r => categoria(r.probGiocata, SOGLIE_DEFAULT) !== 'no');
console.log(`\nFuture poi giocate: ${mie.length} · sopra soglia: ${sopra.length}`);
if (sopra.length) {
  console.log();
  riga('tutte le proposte', sopra.filter(r => vinta(r.giocata, r)).length, sopra.length,
    `atteso ${(100 * sopra.reduce((s, r) => s + r.probGiocata, 0) / sopra.length).toFixed(1)}%`);
  for (const cat of ['centro', 'giallo', 'blu']) {
    const g = sopra.filter(r => categoria(r.probGiocata, SOGLIE_DEFAULT) === cat);
    if (g.length) riga(`  ${cat}`, g.filter(r => vinta(r.giocata, r)).length, g.length);
  }
  const conOver = sopra.filter(r => r.giocata.includes('over'));
  if (conOver.length) riga('  di cui + over 1,5', conOver.filter(r => vinta(r.giocata, r)).length, conOver.length);

  // Le stelline: il giudizio del gruppo aggiunge qualcosa al mercato?
  const votate = sopra.filter(r => r.voti > 0), altre = sopra.filter(r => !r.voti);
  console.log(`\n— Le stelline —`);
  if (!votate.length) console.log('  nessuna partita votata fra quelle già giocate: niente da dire ancora');
  else {
    riga('votate', votate.filter(r => vinta(r.giocata, r)).length, votate.length,
      `atteso ${(100 * votate.reduce((s, r) => s + r.probGiocata, 0) / votate.length).toFixed(1)}%`);
    riga('non votate', altre.filter(r => vinta(r.giocata, r)).length, altre.length,
      `atteso ${(100 * altre.reduce((s, r) => s + r.probGiocata, 0) / altre.length).toFixed(1)}%`);
    console.log('  ⚠️ con pochi voti la differenza è rumore: serve tempo, non una lettura sola');
  }
}

// La fotografia era fedele? Quota vista prima contro quella registrata dopo.
const conEntrambe = mie.filter(r => r.quota && (r.segno === '1' ? r.reale_b365_1 : r.reale_b365_2));
if (conEntrambe.length) {
  const scarti = conEntrambe.map(r => r.quota / (r.segno === '1' ? r.reale_b365_1 : r.reale_b365_2) - 1);
  const medio = scarti.reduce((a, b) => a + b, 0) / scarti.length;
  console.log(`\n— Le quote viste prima erano fedeli? —`);
  console.log(`  ${conEntrambe.length} partite · scarto medio contro Bet365 registrata: ${(medio >= 0 ? '+' : '') + (medio * 100).toFixed(1)}%`);
  console.log(`  (positivo = la quota che avevamo mostrato era più alta di quella finita in archivio)`);
}

console.log();
await chiudi();
