// I CONTROLLI DOPO L'AGGIORNAMENTO: quello che può essere sbagliato senza che
// nessuno se ne accorga.
//
//   node --env-file=.env scripts/controlla-dati.js
//
// ⚠️ Non scrive niente. Esce con codice 1 se trova qualcosa, così la routine
// se ne accorge.
//
// ⚠️⚠️ **Perché esiste.** Il 12/10/2026 due difetti sono passati in silenzio:
// football-data è rimasto **tre settimane indietro** rispondendo 200 a ogni
// richiesta, e una partita aveva **Bet365 e il consenso che descrivevano due
// partite diverse** — a schermo un voto del 200%, trovato a occhio da Mattia.
// Nessuno dei due era un errore: erano dati plausibili e sbagliati.

import { sql } from '../lib/db.js';

let problemi = 0;
const titolo = (t) => console.log(`\n── ${t} ──`);

// ── 1. Risultati che non arrivano ───────────────────────────────────────────
// ⚠️⚠️ **Non tutte le righe scadute sono risultati mancanti: alcune sono
// partite RINVIATE**, e confonderle è costato un falso allarme il 21/10/2026.
// Il controllo diceva *"2 partite giocate da più di 2 giorni sono ancora senza
// risultato → football-data è indietro"* e mandava a lanciare il recupero da
// ESPN. Erano **Levante-Ath Bilbao del 16/09** e **Vallecano-Ath Bilbao del
// 10/10**: nessuna delle due si era giocata, e la prima è ricomparsa in
// calendario il 21/10. Un recupero per partite che non esistono.
//
// Il segnale che distingue i due casi è nei nostri dati, e non è "la giornata
// manca":
//   · se in archivio **quel giorno quel campionato non ha NESSUNA partita**,
//     la fonte non ha ancora pubblicato → è davvero indietro;
//   · se invece **le altre partite di quel giorno ci sono e questa no**, la
//     fonte ha pubblicato e questa non si è giocata → rinviata o spostata.
// Verificato sui due casi veri: il 16/09 e il 10/10 la Liga aveva 3 partite in
// archivio per ciascun giorno, e quelle due non erano fra loro.
//
// ⚠️ Una rinviata **non è un problema** e non alza il contatore: si stampa
// perché resti visibile, non perché vada fatto qualcosa.
titolo('partite giocate ancora senza risultato');
{
  const r = await sql`
    with aperte as (
      select div, data, casa, trasferta
      from prossime_partite
      where data < current_date - 2 and partita_id is null
    )
    select a.div, a.data::text as data, a.casa, a.trasferta,
      exists (select 1 from partite m where m.div = a.div and m.data = a.data) as giornata_pubblicata,
      exists (select 1 from prossime_partite q
              where q.div = a.div and q.casa = a.casa and q.trasferta = a.trasferta
                and q.data > a.data) as ricompare
    from aperte a
    order by a.data`;

  const buchi = r.filter(x => !x.giornata_pubblicata);
  const spostate = r.filter(x => x.giornata_pubblicata);

  if (!buchi.length) console.log('  ✓ nessun risultato mancante');
  else {
    problemi++;
    const per = new Map();
    for (const x of buchi) per.set(x.div, [...(per.get(x.div) || []), x.data]);
    console.log(`  ⚠️ ${buchi.length} partite senza risultato, e quel giorno in archivio non c'è niente di quel campionato:`);
    for (const [div, date] of per) console.log(`     ${div.padEnd(4)} ${date.length} · dal ${date[0]} al ${date[date.length - 1]}`);
    console.log('     → la fonte è indietro per davvero. Recupera con:');
    console.log('       node --env-file=.env scripts/importa-espn.js --campionati=… --giorni=30 --esegui');
  }

  if (spostate.length) {
    console.log(`  ℹ️ ${spostate.length} rinviate o spostate (le altre partite di quel giorno sono in archivio):`);
    for (const x of spostate) {
      console.log(`     ${x.div.padEnd(4)} ${x.data}  ${x.casa} - ${x.trasferta}${x.ricompare ? '   → già in calendario a una data successiva' : ''}`);
    }
    console.log('     Non c\'è niente da recuperare: quelle partite non si sono giocate.');
  }
}

// ── 2. Le due fonti che si contraddicono ────────────────────────────────────
// ⚠️ Si confronta la probabilità del segno 1 **fra 1 e 2** (la X si esclude da
// entrambe le parti), così il margine diverso dei due prezzi non conta. La
// soglia è la stessa dell'app: `SCARTO_FONTI` in `lib/attendibilita.js`.
titolo('Bet365 e il consenso dicono la stessa partita?');
{
  const { SCARTO_FONTI, scartoFonti } = await import('../../app/src/lib/attendibilita.js');
  const r = await sql`
    select div, data::text, casa, trasferta, b365_1, b365_2, avg_ap_1, avg_ap_2
    from prossime_partite
    where b365_1 is not null and avg_ap_1 is not null and data >= current_date - 7
    order by data`;
  const male = r.map(x => ({ ...x, s: scartoFonti(x) })).filter(x => x.s > SCARTO_FONTI);
  if (!male.length) console.log(`  ✓ tutte d'accordo entro ${(SCARTO_FONTI * 100).toFixed(0)} punti (${r.length} partite)`);
  else {
    problemi++;
    console.log(`  ⚠️ ${male.length} su ${r.length} oltre i ${(SCARTO_FONTI * 100).toFixed(0)} punti di scarto:`);
    for (const x of male) console.log(`     ${x.div} ${x.data} ${x.casa} - ${x.trasferta}` +
      `   b365 ${x.b365_1}/${x.b365_2} · consenso ${Number(x.avg_ap_1).toFixed(2)}/${Number(x.avg_ap_2).toFixed(2)}` +
      `   (${(x.s * 100).toFixed(0)} punti)`);
    console.log('     → una delle due fonti sbaglia. L\'app le esclude già dalle spin e lo scrive a schermo.');
  }
}

// ── 3. Importazioni in attesa di una persona ────────────────────────────────
titolo('importazioni da verificare');
{
  const [x] = await sql`select count(*)::int as n from importazioni where stato = 'da_verificare'`;
  if (!x.n) console.log('  ✓ nessuna');
  else { problemi++; console.log(`  ⚠️ ${x.n} in attesa → pagina Importazioni nell'app`); }
}

// ── 4. Doppioni nell'archivio ───────────────────────────────────────────────
// ⚠️ Due fonti che scrivono sulla stessa tabella possono creare la stessa
// partita due volte. Qui si vede subito, invece che fra sei mesi in una media.
titolo('doppioni in archivio');
{
  const r = await sql`select div, data::text, casa, trasferta, count(*)::int as n
                      from partite group by 1,2,3,4 having count(*) > 1 limit 10`;
  if (!r.length) console.log('  ✓ nessuno');
  else { problemi++; console.log(`  ⚠️ ${r.length} doppioni:`); r.forEach(x => console.log(`     ${x.div} ${x.data} ${x.casa} - ${x.trasferta} ×${x.n}`)); }
}

console.log(problemi ? `\n✗ ${problemi} controlli su 4 hanno trovato qualcosa\n` : '\n✓ tutto a posto\n');
await sql.end();
process.exit(problemi ? 1 : 0);
