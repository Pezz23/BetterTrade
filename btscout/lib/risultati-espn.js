// I RISULTATI DA ESPN — il lavoro di un campionato o di una competizione.
//
// ⚠️⚠️ **Un posto solo, due chiamanti** (30/10/2026). Lo usano gli script del
// Mac (`importa-espn.js`, `importa-competizione.js`) **e** la funzione di
// Supabase `aggiorna-risultati`, che l'app lancia col tasto degli admin. Prima
// stava dentro i due script: copiato nella funzione, il primo ritocco avrebbe
// fatto dire due cose diverse alle due strade — la regola del progetto è che
// una misura e lo schermo eseguano lo stesso codice.
// ⚠️ Per questo qui **non c'è niente di Node**: niente `process`, niente
// `node:`. `sql` è il tag di postgres.js, che esiste uguale in Node e in Deno,
// e lo passa chi chiama.
//
// ⚠️⚠️ **LA REGOLA CHE TIENE PULITO L'ARCHIVIO: non si indovina mai.**
// Una riga si scrive solo quando esiste **una e una sola** partita nostra che
// combacia su campionato, data (±1 giorno) **e tutt'e due le squadre**. Zero
// candidati, due candidati, un nome mai visto → la riga finisce in
// `importazioni` e **aspetta una persona** (pagina Importazioni nell'app).

import { COMPETIZIONI, partiteDelGiorno, partiteDelMese, statistiche } from './espn.js';
import { nostroNome } from './nomi-espn.js';
import { giornoLocale } from './date.js';

// ⚠️ `prossime_partite` **non ha** la colonna `stagione`: si ricava dalla
// data, come fa football-data — da luglio in poi è l'anno nuovo. Il Giappone
// ha giocato ad anno solare **fino a giugno 2026** (`annoSolareFino` in
// lib/espn.js): fino a quella data la stagione è l'anno, poi come in Europa.
export const stagioneDi = (data, annoSolareFino = null) => {
  const d = new Date(data), a = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (annoSolareFino && d.toISOString().slice(0, 10) <= annoSolareFino) return String(a);
  const inizio = m >= 7 ? a : a - 1;
  return `${String(inizio).slice(2)}${String(inizio + 1).slice(2)}`;
};
const esitoDi = (gc, gt) => (gc > gt ? 'H' : gc < gt ? 'A' : 'D');

// ⚠️ **I giorni si chiedono all'archivio, non al calendario.** La Serie A
// gioca in ~130 giorni l'anno: camminando sul calendario civile due richieste
// su tre cadono su giorni senza partite. Le date le sappiamo già — sono quelle
// delle partite che abbiamo (da completare) e quelle del calendario (da creare).
// ⚠️ Si tiene **un giorno prima e uno dopo** per ogni data nostra: ESPN ragiona
// in UTC e una partita può slittare di poche ore oltre la mezzanotte.
export async function giorniDaGuardare(sql, div, da, a) {
  const r = await sql`
    select distinct data from (
      select data from partite          where div = ${div} and data between ${da} and ${a}
      union
      select data from prossime_partite where div = ${div} and data between ${da} and ${a}
    ) t order by data`;
  const set = new Set();
  for (const { data } of r) for (const d of [-1, 0, 1]) {
    const x = new Date(data); x.setDate(x.getDate() + d);
    set.add(giornoLocale(x).replaceAll('-', ''));
  }
  return [...set].sort();
}

/**
 * Uno dei quindici campionati: ESPN **completa** le partite che abbiamo
 * (possesso, tiri) e **crea** quelle che football-data non ha ancora
 * pubblicato, se il calendario le conosce. Torna il conto, e l'elenco di cosa
 * ha creato e di cosa aspetta una persona.
 * `da` e `a` sono `AAAA-MM-GG`; senza `esegui` non scrive niente.
 * ⚠️ `fonte` (30/10/2026) è da dove arrivano le partite e le statistiche: di
 * default ESPN, chiesta da qui. La funzione di Supabase la sostituisce con le
 * partite che il **telefono** ha scaricato — ESPN rifiuta i server di
 * Supabase — e con le statistiche che il telefono ha scaricato: nessuna per
 * i 15 campionati (le porta football-data), quelle vere per il Giappone.
 */
export async function aggiornaCampionato(sql, div, { da, a, esegui = false, fonte = { partiteDelGiorno, statistiche } }) {
  const conto = { viste: 0, completate: 0, create: 0, invariate: 0, collegate: 0, dubbie: 0, saltate: 0, giorni: 0, nomi: 0 };
  // ⚠️ Il Giappone: anno solare fino a giugno 2026, poi come in Europa.
  const annoSolareFino = COMPETIZIONI[div]?.annoSolareFino ?? null;
  const saltate = [], dubbie = [], create = [];

  // ⚠️⚠️ **Un intoppo della fonte non deve uccidere il lavoro.** ESPN è
  // un'API non documentata e tossisce ogni tanto (un `502` il 12/10/2026 ha
  // fatto cadere un recupero da mezz'ora): si salta quella partita, si conta,
  // e si va avanti. Anche il database può cadere a metà: stessa regola.
  const tollera = async (cosa, descrizione) => {
    try { return await cosa() }
    catch (e) { conto.saltate++; saltate.push(`${descrizione} → ${String(e.message).split(' → ').pop()}`); return null }
  };

  // i nomi che usiamo noi in questo campionato, da tutto l'archivio
  const r = await sql`select distinct casa as s from partite where div = ${div}
                      union select distinct trasferta from partite where div = ${div}
                      union select distinct casa from prossime_partite where div = ${div}
                      union select distinct trasferta from prossime_partite where div = ${div}`;
  const nostri = new Set(r.map(x => x.s));
  conto.nomi = nostri.size;
  // ⚠️ `partite.campionato` è obbligatoria e contiene il nome esteso ("Serie
  // A"): si prende da una riga che c'è già, non si inventa.
  const [{ campionato }] = await sql`select campionato from partite where div = ${div} limit 1`;
  const giorni = await giorniDaGuardare(sql, div, da, a);
  conto.giorni = giorni.length;

  const unaPartita = async (e) => {
    const casa = nostroNome({ nomi: e.nomiCasa }, nostri);
    const trasferta = nostroNome({ nomi: e.nomiTrasferta }, nostri);
    const motivoNome = !casa ? `nome sconosciuto: ${e.casa}` : !trasferta ? `nome sconosciuto: ${e.trasferta}` : null;
    const quale = `${div} ${e.data} ${e.casa}-${e.trasferta}`;

    // ⚠️ La finestra di ±1 giorno: la data di ESPN è UTC e una partita può
    // slittare di poche ore. Il filtro vero sono le due squadre.
    const cand = motivoNome ? [] : await sql`
      select id, data::text, casa, trasferta, gol_casa, possesso_casa, tirip_casa
      from partite
      where div = ${div} and casa = ${casa} and trasferta = ${trasferta}
        and data between ${e.data}::date - 1 and ${e.data}::date + 1`;

    if (cand.length === 1) {
      const p = cand[0];
      // ⚠️⚠️ **E si collega al calendario, se non lo è** (31/10/2026). Una
      // partita già in archivio — portata da football-data o, per il
      // Giappone, dallo script del Mac — restava senza `partita_id` finché la
      // riconciliazione della routine non girava: in Road to weekend e nelle
      // spin il risultato non compariva. Stessa regola di tutto il resto:
      // **una e una sola** riga di calendario combacia, ed è ancora libera.
      const cal = await sql`
        select id, partita_id from prossime_partite
        where div = ${div} and casa = ${casa} and trasferta = ${trasferta}
          and data between ${e.data}::date - 1 and ${e.data}::date + 1`;
      if (cal.length === 1 && cal[0].partita_id == null) {
        if (esegui) await sql`update prossime_partite set partita_id = ${p.id} where id = ${cal[0].id} and partita_id is null`;
        conto.collegate++;
      }
      // ⚠️ Non si tocca mai il risultato di football-data: ESPN completa i
      // buchi (possesso, e i tiri se mancano), non riscrive quello che c'è.
      // ⚠️ E le statistiche si chiedono **solo se servono** (30/10/2026):
      // prima si chiedevano anche per le partite già complete, una chiamata a
      // ESPN buttata per ciascuna.
      if (p.possesso_casa != null && p.tirip_casa != null) { conto.invariate++; return }
      const st = await tollera(() => fonte.statistiche(div, e.id), quale);
      if (!st) { conto.invariate++; return }
      if (esegui) await sql`
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
      const st = await tollera(() => fonte.statistiche(div, e.id), quale);
      if (esegui) {
        const [nuova] = await sql`
          insert into partite (div, campionato, data, casa, trasferta, gol_casa, gol_trasferta, esito,
                               tirip_casa, tirip_trasf, tiri_casa, tiri_trasf,
                               angoli_casa, angoli_trasf, falli_casa, falli_trasf,
                               gialli_casa, gialli_trasf, rossi_casa, rossi_trasf,
                               possesso_casa, possesso_trasf,
                               stagione, fonte)
          values (${div}, ${campionato}, ${fut[0].data}, ${casa}, ${trasferta}, ${e.golCasa}, ${e.golTrasferta},
                  ${esitoDi(e.golCasa, e.golTrasferta)},
                  ${st?.casa.tirip ?? null}, ${st?.trasferta.tirip ?? null},
                  ${st?.casa.tiri ?? null}, ${st?.trasferta.tiri ?? null},
                  ${st?.casa.angoli ?? null}, ${st?.trasferta.angoli ?? null},
                  ${st?.casa.falli ?? null}, ${st?.trasferta.falli ?? null},
                  ${st?.casa.gialli ?? null}, ${st?.trasferta.gialli ?? null},
                  ${st?.casa.rossi ?? null}, ${st?.trasferta.rossi ?? null},
                  ${st?.casa.possesso ?? null}, ${st?.trasferta.possesso ?? null},
                  ${stagioneDi(fut[0].data, annoSolareFino)}, 'espn')
          returning id`;
        await sql`update prossime_partite set partita_id = ${nuova.id} where id = ${fut[0].id}`;
      }
      conto.create++;
      // ⚠️ In prova a vuoto si dice **cosa** verrebbe scritto: un conteggio
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
    const st = motivoNome ? null : await tollera(() => fonte.statistiche(div, e.id), quale);
    dubbie.push({ div, data: e.data, casa: e.casa, trasferta: e.trasferta, motivo,
                  gol: `${e.golCasa}-${e.golTrasferta}`, candidati: [...cand, ...fut] });
    if (esegui) await sql`
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
  };

  for (const g of giorni) {
    const eventi = await tollera(() => fonte.partiteDelGiorno(div, g), `${div} giorno ${g}`) || [];
    for (const e of eventi) {
      if (!e.finita) continue;
      conto.viste++;
      await tollera(() => unaPartita(e), `${div} ${e.data} ${e.casa}-${e.trasferta}`);
    }
  }
  return { conto, create, dubbie, saltate };
}

/** I mesi (`aaaamm`) di un anno. */
export const mesiDi = (anno) => Array.from({ length: 12 }, (_, i) => `${anno}${String(i + 1).padStart(2, '0')}`);

/**
 * Una competizione che **solo ESPN** copre (Champions, Europa, Conference,
 * Olanda 2, J1): qui ESPN non completa, **crea** la riga, e solo per le partite
 * finite, con `fonte = 'espn'`. Niente quote: ESPN non le ha.
 * `mesi` è l'elenco dei mesi `aaaamm` da guardare; `ripeti` avvolge le
 * scritture (lo script del recupero lungo ci mette i tentativi, perché in
 * un'ora di lavoro il pooler può chiudere la connessione), `avanza` riceve il
 * numero di partite nuove ogni cinquanta.
 * ⚠️ Le statistiche costano una chiamata a partita: si chiedono **solo** per
 * le partite che si stanno per scrivere, e **solo quando si scrive davvero**.
 */
export async function aggiornaCompetizione(sql, comp, { mesi, esegui = false, ripeti = (fn) => fn(), avanza = () => {}, avviso = () => {} }) {
  const info = COMPETIZIONI[comp];
  // ⚠️ Quello che c'è già si chiede **una volta**, non una query per partita:
  // la chiave è la stessa dell'indice unico della tabella.
  const viste = new Set((await ripeti(() => sql`
    select data, casa, trasferta from partite where div = ${comp}
  `)).map(r => `${new Date(r.data).toISOString().slice(0, 10)}|${r.casa}|${r.trasferta}`));
  const giaInArchivio = viste.size;

  let nuove = 0, saltate = 0, senzaStat = 0;
  for (const mese of mesi) {
    let partite;
    try { partite = await partiteDelMese(comp, mese); }
    catch (e) { avviso(`${mese}: ${e.message}`); continue; }

    for (const p of partite) {
      if (!p.finita || p.golCasa == null || p.golTrasferta == null) { saltate++; continue; }
      if (viste.has(`${p.data}|${p.casa}|${p.trasferta}`)) { saltate++; continue; }

      let st = null;
      if (esegui) {
        // ⚠️ **Un tentativo solo**: ESPN non ha il riepilogo delle partite
        // vecchie, e insistere tre volte su un buco che è un buco e basta
        // moltiplicava per cinque il tempo di tutto il recupero.
        try { st = await statistiche(comp, p.id, 1); } catch { /* si scrive lo stesso */ }
        if (!st) senzaStat++;
        await ripeti(() => sql`
          insert into partite (div, campionato, stagione, data, casa, trasferta,
                               gol_casa, gol_trasferta, esito,
                               tiri_casa, tiri_trasf, tirip_casa, tirip_trasf,
                               angoli_casa, angoli_trasf, gialli_casa, gialli_trasf,
                               rossi_casa, rossi_trasf, falli_casa, falli_trasf,
                               possesso_casa, possesso_trasf, fonte)
          values (${comp}, ${info.nome}, ${stagioneDi(p.data, info.annoSolareFino)}, ${p.data},
                  ${p.casa}, ${p.trasferta}, ${p.golCasa}, ${p.golTrasferta},
                  ${esitoDi(p.golCasa, p.golTrasferta)},
                  ${st?.casa.tiri ?? null}, ${st?.trasferta.tiri ?? null},
                  ${st?.casa.tirip ?? null}, ${st?.trasferta.tirip ?? null},
                  ${st?.casa.angoli ?? null}, ${st?.trasferta.angoli ?? null},
                  ${st?.casa.gialli ?? null}, ${st?.trasferta.gialli ?? null},
                  ${st?.casa.rossi ?? null}, ${st?.trasferta.rossi ?? null},
                  ${st?.casa.falli ?? null}, ${st?.trasferta.falli ?? null},
                  ${st?.casa.possesso ?? null}, ${st?.trasferta.possesso ?? null}, 'espn')
          on conflict (div, stagione, data, casa, trasferta) do nothing`);
      }
      viste.add(`${p.data}|${p.casa}|${p.trasferta}`);
      nuove++;
      if (nuove % 50 === 0) avanza(nuove);
    }
  }
  return { giaInArchivio, nuove, saltate, senzaStat };
}
