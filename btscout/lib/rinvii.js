// Le partite RINVIATE in `prossime_partite`: si spostano, non si raddoppiano.
//
// ⚠️⚠️ **Perché esiste questo file** (29/10/2026). La chiave della tabella è
// `(div, data, casa, trasferta)`: quando una partita cambia giorno, l'upsert
// non trova la riga e ne **crea un'altra**, e quella con la data vecchia resta
// lì. Trovate il 24/10: Paris SG-Lyon (25 e 26/10), Toulouse-Troyes (24 e 25),
// Montpellier-Red Star (24 e 26). Finché tutt'e due le date sono future la
// stessa partita compare **due volte** in Partite, nelle spin e nel Builder —
// e la si poteva mettere due volte nella stessa schedina.
//
// La cura: **prima** dell'upsert, la riga vecchia si porta alla data nuova.
// Spostarla e non cancellarla tiene attaccato tutto quello che punta al suo
// `id` — stelline, flag, gambe della scalata e del Builder, caselle di Slot —
// e `prossime_partite` resta senza cancellazioni, come vuole `note/dati.md`.
//
// Una riga si sposta solo se:
//   · è della stessa partita — campionato, casa e trasferta — e **non giocata**
//     (`partita_id` nullo);
//   · la sua data è **ancora da venire** (da oggi in poi): una riga passata
//     non si vede nell'app, e la riconciliazione sa già riconoscerla;
//   · la data nuova dista **al massimo 21 giorni** — oltre, è un'altra
//     giornata e non un rinvio;
//   · la data vecchia **non è nel file appena scaricato**. ⚠️ È la guardia
//     che conta: in Scozia, dopo la divisione in due gironi, le stesse due
//     squadre possono rincontrarsi a due settimane di distanza nello stesso
//     campo. Se la fonte elenca **tutt'e due** le date, sono due partite vere;
//     se elenca solo quella nuova, la vecchia non esiste più;
//   · la data vecchia cade **dentro il periodo che il file copre** per quel
//     campionato. football-data pubblica solo il prossimo blocco: una data
//     oltre la sua ultima non è "sparita", è semplicemente fuori dal file;
//   · alla data nuova non c'è già una riga (altrimenti la chiave si
//     scontrerebbe: lo dice la riconciliazione, non questo passaggio).

const FINESTRA_GIORNI = 21;

/**
 * Trova le righe di `prossime_partite` da spostare alla data nuova, e con
 * `esegui` le sposta. Restituisce `[{ id, div, casa, trasferta, da, a, ora }]`.
 * `righe` sono quelle che lo script sta per scrivere: `data` come `aaaa-mm-gg`.
 */
export async function spostaRinviate(sql, righe, { esegui = false } = {}) {
  if (!righe.length) return [];
  const chiave = r => `${r.div}|${r.casa}|${r.trasferta}`;
  const nelFile = new Set(righe.map(r => `${chiave(r)}|${r.data}`));

  // Le non giocate, da oggi in poi, delle stesse coppie del file.
  const coppie = [...new Set(righe.map(chiave))];
  const esistenti = await sql`
    select id, div, casa, trasferta, to_char(data, 'YYYY-MM-DD') as data
    from prossime_partite
    where partita_id is null and data >= current_date
      and div || '|' || casa || '|' || trasferta in ${sql(coppie)}`;
  const giaQui = new Set(esistenti.map(e => `${chiave(e)}|${e.data}`));
  // Il periodo del file, campionato per campionato (le date `aaaa-mm-gg` si
  // confrontano come testo).
  const periodo = new Map();
  for (const r of righe) {
    const p = periodo.get(r.div);
    if (!p) periodo.set(r.div, { da: r.data, a: r.data });
    else { if (r.data < p.da) p.da = r.data; if (r.data > p.a) p.a = r.data; }
  }

  const spostamenti = [];
  for (const r of righe) {
    if (giaQui.has(`${chiave(r)}|${r.data}`)) continue;        // c'è già: niente da spostare
    const giorni = d => Date.parse(`${d}T12:00:00Z`) / 864e5;
    const vecchie = esistenti.filter(e => chiave(e) === chiave(r)
      && !nelFile.has(`${chiave(e)}|${e.data}`)
      && e.data >= periodo.get(e.div).da && e.data <= periodo.get(e.div).a
      && Math.abs(giorni(e.data) - giorni(r.data)) <= FINESTRA_GIORNI
      && !spostamenti.some(s => s.id === e.id));
    // Due candidate sono un caso che non si indovina: si lascia com'è.
    if (vecchie.length !== 1) continue;
    const [v] = vecchie;
    spostamenti.push({ id: v.id, div: r.div, casa: r.casa, trasferta: r.trasferta, da: v.data, a: r.data, ora: r.ora ?? null });
    giaQui.add(`${chiave(r)}|${r.data}`);
  }

  if (esegui) for (const s of spostamenti)
    await sql`update prossime_partite set data = ${s.a}, ora = ${s.ora} where id = ${s.id}`;
  return spostamenti;
}

/** Le righe da stampare, una per spostamento. */
export function descriviSpostamenti(spostamenti) {
  return spostamenti.map(s => `  ↻ ${s.div.padEnd(4)} ${(s.casa + ' - ' + s.trasferta).padEnd(34)} rinviata: ${s.da} → ${s.a}  (riga ${s.id})`);
}
