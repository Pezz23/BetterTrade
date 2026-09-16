// Controllo completo dell'archivio. Cerca gli errori che la verifica ordinaria
// non vede: partite nello stesso posto due volte sotto etichette diverse, squadre
// nel paese sbagliato, date fuori dalla loro stagione, quote assurde.
//
// Nato il 16/09/2026 dopo l'errore del P2 — 4.675 partite spagnole etichettate
// portoghesi, entrate con un HTTP 200 e scoperte solo dai nomi delle squadre.
//
// Uso:  node --env-file=.env scripts/audit-archivio.js

import { sql, chiudi } from '../lib/db.js';

let problemi = 0;
const ok = (cond, testo, dettaglio = '') => {
  if (!cond) problemi++;
  console.log(`  ${cond ? '✓' : '✗'} ${testo.padEnd(58)}${dettaglio}`);
};

const [{ tot }] = await sql`select count(*)::int as tot from partite`;
console.log(`\nARCHIVIO: ${tot} partite\n`);

// ── 1. Stessa partita sotto due etichette (il caso P2) ─────────────────────
console.log('1. Duplicati sotto etichette diverse');
const dup = await sql`
  select a.div as div_a, b.div as div_b, count(*)::int as n
  from partite a join partite b
    on a.data=b.data and a.casa=b.casa and a.trasferta=b.trasferta and a.div < b.div
  group by a.div, b.div order by n desc`;
ok(dup.length === 0, 'stessa data+squadre in due campionati diversi', dup.length ? dup.map(d=>`${d.div_a}/${d.div_b}:${d.n}`).join(' ') : 'nessuno');

const dupSt = await sql`
  select count(*)::int as n from partite a join partite b
    on a.data=b.data and a.casa=b.casa and a.trasferta=b.trasferta and a.div=b.div and a.stagione < b.stagione`;
ok(dupSt[0].n === 0, 'stessa partita attribuita a due stagioni', String(dupSt[0].n));

// ── 2. Squadre nel paese sbagliato ─────────────────────────────────────────
console.log('\n2. Squadre fuori posto');
const PAESE = { E0:'ING',E1:'ING', I1:'ITA',I2:'ITA', SP1:'SPA',SP2:'SPA', D1:'GER',D2:'GER', F1:'FRA',F2:'FRA', P1:'POR', N1:'OLA', T1:'TUR', B1:'BEL', SC0:'SCO' };
const squadreDiv = await sql`select casa as squadra, array_agg(distinct div) as divs from partite group by casa`;
const fuoriPosto = squadreDiv.filter(r => new Set(r.divs.map(d => PAESE[d])).size > 1);
ok(fuoriPosto.length === 0, 'squadre che compaiono in paesi diversi', fuoriPosto.length ? fuoriPosto.slice(0,5).map(r=>`${r.squadra}(${r.divs})`).join(' ') : 'nessuna');

const divIgnoti = await sql`select distinct div from partite`;
const ignoti = divIgnoti.map(r=>r.div).filter(d => !PAESE[d]);
ok(ignoti.length === 0, 'codici campionato non riconosciuti', ignoti.join(' ') || 'nessuno');

// ── 3. Date coerenti con la stagione ───────────────────────────────────────
console.log('\n3. Date');
const fuoriStagione = await sql`
  select stagione, count(*)::int as n from partite
  where data < make_date(2000 + substr(stagione,1,2)::int, 6, 1)
     or data > make_date(2000 + substr(stagione,3,2)::int, 8, 15)
  group by stagione`;
ok(fuoriStagione.length === 0, 'partite con data fuori dalla propria stagione', fuoriStagione.length ? fuoriStagione.map(r=>`${r.stagione}:${r.n}`).join(' ') : 'nessuna');

const [{ futuro }] = await sql`select count(*)::int as futuro from partite where data > current_date`;
ok(futuro === 0, 'partite con data futura (lo storico ha solo partite giocate)', String(futuro));

// ── 4. Campi obbligatori e coerenza ────────────────────────────────────────
console.log('\n4. Campi');
const [{ nulli }] = await sql`select count(*)::int as nulli from partite where gol_casa is null or gol_trasferta is null or esito is null or casa is null or trasferta is null or casa = '' or trasferta = ''`;
ok(nulli === 0, 'campi obbligatori vuoti', String(nulli));
const [{ stessa }] = await sql`select count(*)::int as stessa from partite where casa = trasferta`;
ok(stessa === 0, 'squadra che gioca contro se stessa', String(stessa));
const [{ inco }] = await sql`select count(*)::int as inco from partite where esito <> case when gol_casa>gol_trasferta then 'H' when gol_casa<gol_trasferta then 'A' else 'D' end`;
ok(inco === 0, 'esito incoerente con i gol', String(inco));
// Soglia 15: VVV Venlo-Ajax 0-13 (Eredivisie, 24/10/2020) è vero, è il record.
const [{ golAssurdi }] = await sql`select count(*)::int as "golAssurdi" from partite where gol_casa > 15 or gol_trasferta > 15 or gol_casa < 0 or gol_trasferta < 0`;
ok(golAssurdi === 0, 'punteggi assurdi (>15 gol o negativi)', String(golAssurdi));

// ── 5. Quote: tutte le colonne, non solo Pinnacle ──────────────────────────
console.log('\n5. Quote');
const COLQ = ['ps_1','ps_x','ps_2','bfe_ap_1','bfe_ap_x','bfe_ap_2','bfe_ch_1','bfe_ch_x','bfe_ch_2','avg_1','avg_x','avg_2','max_1','max_x','max_2','b365_1','b365_x','b365_2','avg_over25','avg_under25','bfe_ap_over25','bfe_ap_under25','bfe_ch_over25','bfe_ch_under25','b365_over25','b365_under25'];
// Soglia 500: max_2 = 251 su Celtic-Hearts (16/05/2026) è un dato della fonte,
// un book con la quota rimasta appesa a fine stagione. Non si corregge, si sa.
const fuoriScala = [];
for (const c of COLQ) {
  const [{ n }] = await sql`select count(*)::int as n from partite where ${sql(c)} is not null and (${sql(c)} <= 1 or ${sql(c)} > 500)`;
  if (n) fuoriScala.push(`${c}:${n}`);
}
ok(fuoriScala.length === 0, 'quote fuori scala (≤1 o >500) in qualsiasi colonna', fuoriScala.join(' ') || 'nessuna');

// Margine implicito di Bet365 fuori scala = una colonna letta male. Deve essere zero.
const [{ b365Ass }] = await sql`select count(*)::int as "b365Ass" from partite where b365_1 is not null and (1/b365_1+1/b365_x+1/b365_2) not between 0.98 and 1.25`;
ok(b365Ass === 0, 'terne Bet365 con margine implicito assurdo', String(b365Ass));

// ⚠️ L'exchange di APERTURA ha mercati vuoti: quando nessuno ha ancora offerto,
// mostra segnaposto tipo 1.02/1.01/1.01 (somma ~2.9). NON sono prezzi. Vanno
// esclusi da ogni confronto con Bet365, o il "valore" trovato è un artefatto —
// il famoso +163% del 11/09 era esattamente questo. Qui si contano, non si
// falliscono: sono dati della fonte, e la colonna bfe_ap_valido li marca.
const [{ exVuoti, exTot }] = await sql`
  select count(*) filter (where (1/bfe_ap_1+1/bfe_ap_x+1/bfe_ap_2) not between 0.90 and 1.30)::int as "exVuoti",
         count(*)::int as "exTot"
  from partite where bfe_ap_1 is not null`;
console.log(`  · exchange apertura senza mercato reale (da escludere): ${exVuoti} su ${exTot} (${(100*exVuoti/exTot).toFixed(1)}%)`);

// La media di mercato ha qualche terna incoerente nella fonte (somma < 1, cioè un
// arbitraggio impossibile). Poche, note, non correggibili: si elencano.
const avgAss = await sql`select div, stagione, casa, trasferta, (1/avg_1+1/avg_x+1/avg_2)::numeric(5,3) as s from partite where avg_1 is not null and (1/avg_1+1/avg_x+1/avg_2) not between 0.98 and 1.25`;
console.log(`  · terne avg_* incoerenti nella fonte (note, non correggibili): ${avgAss.length}`);
for (const r of avgAss) console.log(`      ${r.div} ${r.stagione} ${r.casa}-${r.trasferta} (somma ${r.s})`);

// ── 6. Struttura dei campionati ────────────────────────────────────────────
console.log('\n6. Struttura');
const struttura = await sql`
  select div, stagione, count(*)::int as partite, count(distinct casa)::int as squadre
  from partite where stagione <> (select max(stagione) from partite)
  group by div, stagione`;
const strane = struttura.filter(r => r.squadre < 10 || r.squadre > 24 || r.partite < r.squadre*(r.squadre-1)*0.6);
ok(strane.length === 0, 'stagioni chiuse con numero di squadre o partite anomalo', strane.length ? strane.slice(0,6).map(r=>`${r.div}/${r.stagione}: ${r.squadre}sq ${r.partite}p`).join(' · ') : 'tutte plausibili');

// squadre che nella stessa stagione giocano un numero di partite in casa molto diverso dalle altre
const sbilanciate = await sql`
  with c as (select div, stagione, casa as sq, count(*)::int as n from partite where stagione <> (select max(stagione) from partite) group by 1,2,3),
  m as (select div, stagione, percentile_cont(0.5) within group (order by n) as med from c group by 1,2)
  select c.div, c.stagione, c.sq, c.n, m.med from c join m using (div, stagione) where abs(c.n - m.med) > 4`;
ok(sbilanciate.length === 0, 'squadre con partite in casa molto diverse dalla mediana', sbilanciate.length ? sbilanciate.slice(0,5).map(r=>`${r.div}/${r.stagione} ${r.sq}:${r.n} (med ${r.med})`).join(' · ') : 'nessuna');

console.log(problemi ? `\n✗ ${problemi} controlli falliti\n` : '\n✓ archivio pulito: nessun errore trovato\n');
await chiudi();
process.exit(problemi ? 1 : 0);
