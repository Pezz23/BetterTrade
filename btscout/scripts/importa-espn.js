// IMPORTA DA ESPN: completa le partite che abbiamo e recupera quelle che
// football-data non ha ancora pubblicato.
//
//   node --env-file=.env scripts/importa-espn.js --campionati=I1 --giorni=30
//   ... --esegui              per scrivere davvero
//   ... --da=2026-09-01 --a=2026-10-12
//
// ⚠️ **Prova a vuoto di default**, come ogni script che tocca i dati.
//
// ⚠️⚠️ **LA REGOLA CHE TIENE PULITO L'ARCHIVIO: non si indovina mai.**
// Una riga si scrive solo quando esiste **una e una sola** partita nostra che
// combacia su campionato, data (±1 giorno) **e tutt'e due le squadre**. Zero
// candidati, due candidati, un nome mai visto → la riga finisce in
// `importazioni` e **aspetta una persona** (pagina Importazioni nell'app).
// Un risultato messo sulla partita sbagliata non si vede, non si corregge e
// sporca ogni misura che ci sta sopra.

import { sql } from '../lib/db.js';
import { CAMPIONATI, partiteDelGiorno, statistiche } from '../lib/espn.js';
import { nostroNome } from '../lib/nomi-espn.js';
import { giornoLocale } from '../lib/date.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const ESEGUI = process.argv.includes('--esegui');
const DIVS = arg('campionati', 'I1').split(',').filter(x => CAMPIONATI[x]);
const GIORNI = Number(arg('giorni', 30));
const A = arg('a', giornoLocale(new Date()));
const DA = arg('da', giornoLocale(new Date(Date.now() - GIORNI * 864e5)));

if (!DIVS.length) { console.error('✗ nessun campionato valido. Disponibili:', Object.keys(CAMPIONATI).join(' ')); process.exit(1) }
console.log(`ESPN → ${DIVS.join(', ')} · dal ${DA} al ${A}${ESEGUI ? '' : '  (prova a vuoto)'}\n`);

// ⚠️ `prossime_partite` **non ha** la colonna `stagione` (ha un `fonte`, ma è
// un'altra cosa: lì dice da quale book vengono le quote). La stagione si
// ricava dalla data, come fa football-data: da luglio in poi è l'anno nuovo.
const stagioneDi = (data) => {
  const d = new Date(data), a = d.getFullYear(), m = d.getMonth() + 1;
  const inizio = m >= 7 ? a : a - 1;
  return `${String(inizio).slice(2)}${String(inizio + 1).slice(2)}`;
};

// ⚠️ **I giorni si chiedono all'archivio, non al calendario.** La Serie A
// gioca in ~130 giorni l'anno: camminando sul calendario civile due richieste
// su tre cadono su giorni senza partite, e un recupero di otto stagioni passa
// da 890 chiamate a 2.660. Le date le sappiamo già — sono quelle delle partite
// che abbiamo (da completare) e quelle del calendario (da creare).
// ⚠️ Si tiene **un giorno prima e uno dopo** per ogni data nostra: ESPN ragiona
// in UTC e una partita può slittare di poche ore oltre la mezzanotte.
async function giorniDaGuardare(div) {
  const r = await sql`
    select distinct data from (
      select data from partite          where div = ${div} and data between ${DA} and ${A}
      union
      select data from prossime_partite where div = ${div} and data between ${DA} and ${A}
    ) t order by data`;
  const set = new Set();
  for (const { data } of r) for (const d of [-1, 0, 1]) {
    const x = new Date(data); x.setDate(x.getDate() + d);
    set.add(giornoLocale(x).replaceAll('-', ''));
  }
  return [...set].sort();
}

const conto = { viste: 0, completate: 0, create: 0, invariate: 0, dubbie: 0, saltate: 0 };
const saltate = [];

// ⚠️⚠️ **Un intoppo della fonte non deve uccidere il lavoro.** Il 12/10/2026 un
// singolo `502` su una partita del 2019 ha fatto cadere un recupero da
// mezz'ora dopo 246 partite già fatte. ESPN è un'API non documentata: che
// tossisca ogni tanto è normale, e la risposta giusta è **saltare quella
// partita e andare avanti**, non fermarsi. Le saltate si contano e si
// stampano: un recupero che perde pezzi in silenzio sarebbe peggio.
async function tollera(cosa, descrizione) {
  try { return await cosa() }
  catch (e) { conto.saltate++; saltate.push(`${descrizione} → ${e.message.split(' → ').pop()}`); return null }
}
const dubbie = [], create = [];

for (const div of DIVS) {
  // i nomi che usiamo noi in questo campionato, da tutto l'archivio
  const r = await sql`select distinct casa as s from partite where div = ${div}
                      union select distinct trasferta from partite where div = ${div}
                      union select distinct casa from prossime_partite where div = ${div}
                      union select distinct trasferta from prossime_partite where div = ${div}`;
  const nostri = new Set(r.map(x => x.s));
  // ⚠️ `partite.campionato` è obbligatoria e contiene il nome esteso ("Serie
  // A"): si prende da una riga che c'è già, non si inventa — due nomi diversi
  // per lo stesso `div` sarebbero un difetto silenzioso.
  const [{ campionato }] = await sql`select campionato from partite where div = ${div} limit 1`;
  const giorni = await giorniDaGuardare(div);
  console.log(`${div}: ${nostri.size} nomi nostri in archivio · ${giorni.length} giorni da guardare`);

  for (const g of giorni) {
    const eventi = await tollera(() => partiteDelGiorno(div, g), `${div} giorno ${g}`) || [];
    for (const e of eventi) {
      if (!e.finita) continue;
      conto.viste++;
      // ⚠️ **Anche il database può cadere a metà**, non solo ESPN: il
      // 12/10/2026 un `ECONNRESET` ha ucciso due recuperi lunghi insieme —
      // probabilmente per averli lanciati in parallelo sulla stessa
      // connessione. Una partita che fallisce si salta e si conta; il giro
      // continua, e postgres.js riapre la connessione da solo alla prossima.
      await tollera(() => unaPartita(e, div, nostri, campionato), `${div} ${e.data} ${e.casa}-${e.trasferta}`);
    }
  }
}

async function unaPartita(e, div, nostri, campionato) {
  {
    {
      const casa = nostroNome({ nomi: e.nomiCasa }, nostri);
      const trasferta = nostroNome({ nomi: e.nomiTrasferta }, nostri);
      const motivoNome = !casa ? `nome sconosciuto: ${e.casa}` : !trasferta ? `nome sconosciuto: ${e.trasferta}` : null;

      // ⚠️ La finestra di ±1 giorno: la data di ESPN è UTC e una partita può
      // slittare di poche ore. Il filtro vero sono le due squadre.
      const cand = motivoNome ? [] : await sql`
        select id, data::text, casa, trasferta, gol_casa, possesso_casa, tirip_casa
        from partite
        where div = ${div} and casa = ${casa} and trasferta = ${trasferta}
          and data between ${e.data}::date - 1 and ${e.data}::date + 1`;

      if (cand.length === 1) {
        const p = cand[0];
        // ⚠️ Non si tocca mai il risultato di football-data: ESPN completa i
        // buchi (possesso, e i tiri se mancano), non riscrive quello che c'è.
        const st = await tollera(() => statistiche(div, e.id), `${div} ${e.data} ${e.casa}-${e.trasferta}`);
        const serve = p.possesso_casa == null || p.tirip_casa == null;
        if (!st || !serve) { conto.invariate++; return }
        if (ESEGUI) await sql`
          update partite set
            possesso_casa  = coalesce(possesso_casa,  ${st.casa.possesso}),
            possesso_trasf = coalesce(possesso_trasf, ${st.trasferta.possesso}),
            tirip_casa     = coalesce(tirip_casa,     ${st.casa.tirip}),
            tirip_trasf    = coalesce(tirip_trasf,    ${st.trasferta.tirip}),
            tiri_casa      = coalesce(tiri_casa,      ${st.casa.tiri}),
            tiri_trasf     = coalesce(tiri_trasf,     ${st.trasferta.tiri})
          where id = ${p.id}`;
        conto.completate++;
        return;
      }

      // nessun candidato in `partite`: forse è una partita che football-data
      // non ha ancora pubblicato. Si guarda nel calendario, che è la stessa
      // certezza (campionato + data + le due squadre).
      const fut = (motivoNome || cand.length) ? [] : await sql`
        select id, data::text, casa, trasferta from prossime_partite
        where div = ${div} and casa = ${casa} and trasferta = ${trasferta}
          and data between ${e.data}::date - 1 and ${e.data}::date + 1`;

      if (cand.length === 0 && fut.length === 1) {
        const st = await tollera(() => statistiche(div, e.id), `${div} ${e.data} ${e.casa}-${e.trasferta}`);
        if (ESEGUI) {
          const [nuova] = await sql`
            insert into partite (div, campionato, data, casa, trasferta, gol_casa, gol_trasferta, esito,
                                 tirip_casa, tirip_trasf, tiri_casa, tiri_trasf,
                                 angoli_casa, angoli_trasf, possesso_casa, possesso_trasf,
                                 stagione, fonte)
            values (${div}, ${campionato}, ${fut[0].data}, ${casa}, ${trasferta}, ${e.golCasa}, ${e.golTrasferta},
                    ${e.golCasa > e.golTrasferta ? 'H' : e.golCasa < e.golTrasferta ? 'A' : 'D'},
                    ${st?.casa.tirip ?? null}, ${st?.trasferta.tirip ?? null},
                    ${st?.casa.tiri ?? null}, ${st?.trasferta.tiri ?? null},
                    ${st?.casa.angoli ?? null}, ${st?.trasferta.angoli ?? null},
                    ${st?.casa.possesso ?? null}, ${st?.trasferta.possesso ?? null},
                    ${stagioneDi(fut[0].data)}, 'espn')
            returning id`;
          await sql`update prossime_partite set partita_id = ${nuova.id} where id = ${fut[0].id}`;
        }
        conto.create++;
        // ⚠️ In prova a vuoto si stampa **cosa** verrebbe scritto: un conteggio
        // dice che ha funzionato, non che ha funzionato **bene**.
        create.push(`${div} ${fut[0].data}  ${casa} ${e.golCasa}-${e.golTrasferta} ${trasferta}` +
          `   tiri in porta ${st?.casa.tirip ?? '—'}-${st?.trasferta.tirip ?? '—'}` +
          ` · possesso ${st?.casa.possesso ?? '—'}-${st?.trasferta.possesso ?? '—'}`);
        return;
      }

      // tutto il resto aspetta una persona
      const motivo = motivoNome || (cand.length > 1 ? `${cand.length} partite nostre combaciano`
                   : fut.length > 1 ? `${fut.length} partite in calendario combaciano`
                   : 'nessuna partita nostra combacia');
      conto.dubbie++;
      const st = motivoNome ? null : await tollera(() => statistiche(div, e.id), `${div} ${e.data} ${e.casa}-${e.trasferta}`);
      dubbie.push({ div, data: e.data, casa: e.casa, trasferta: e.trasferta, motivo,
                    gol: `${e.golCasa}-${e.golTrasferta}`, candidati: [...cand, ...fut] });
      if (ESEGUI) await sql`
        insert into importazioni (fonte, motivo, div, data, casa_fonte, trasferta_fonte,
                                  gol_casa, gol_trasferta, tirip_casa, tirip_trasf,
                                  tiri_casa, tiri_trasf, angoli_casa, angoli_trasf,
                                  possesso_casa, possesso_trasf, candidati)
        values ('espn', ${motivo}, ${div}, ${e.data}, ${e.casa}, ${e.trasferta},
                ${e.golCasa}, ${e.golTrasferta}, ${st?.casa.tirip ?? null}, ${st?.trasferta.tirip ?? null},
                ${st?.casa.tiri ?? null}, ${st?.trasferta.tiri ?? null},
                ${st?.casa.angoli ?? null}, ${st?.trasferta.angoli ?? null},
                ${st?.casa.possesso ?? null}, ${st?.trasferta.possesso ?? null},
                ${JSON.stringify([...cand, ...fut])}::jsonb)
        on conflict (fonte, div, data, casa_fonte, trasferta_fonte) do nothing`;
    }
  }
}

console.log(`\n${conto.viste} partite finite viste su ESPN`);
console.log(`  completate (possesso/tiri aggiunti)  ${conto.completate}`);
console.log(`  create (football-data non le ha)     ${conto.create}`);
console.log(`  già a posto, niente da aggiungere    ${conto.invariate}`);
console.log(`  da verificare a mano                 ${conto.dubbie}`);
if (conto.saltate) {
  console.log(`  ⚠️ saltate per errore della fonte     ${conto.saltate}  (rilancia per riprenderle)`);
  saltate.slice(0, 8).forEach(x => console.log(`     ${x}`));
}
if (create.length) {
  console.log('\n── create ──');
  create.forEach(x => console.log('  ' + x));
}
if (dubbie.length) {
  console.log('\n── da verificare ──');
  for (const d of dubbie.slice(0, 20))
    console.log(`  ${d.div} ${d.data}  ${d.casa} ${d.gol} ${d.trasferta}   → ${d.motivo}`);
  if (dubbie.length > 20) console.log(`  … e altre ${dubbie.length - 20}`);
}
if (!ESEGUI) console.log('\nprova a vuoto: non ho scritto niente. Aggiungi --esegui.');
await sql.end();
