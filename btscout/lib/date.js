// Le date dell'archivio, trattate nel modo giusto.
//
// ⚠️⚠️ **Perché esiste questo file.** Il driver postgres consegna oggetti
// `Date`, e in cinque script era scritto `String(r.data).slice(0, 10)`: su un
// Date quello **non** dà la data, dà `"Mon Oct 05"` — il testo inglese tagliato
// a dieci caratteri, **senza l'anno**.
//
// Non è un difetto estetico. Quella stringa veniva usata come **chiave del
// giorno** per prendere "le prime 9 di ogni giorno": su otto stagioni,
// `"Mon Oct 05"` è il 5 ottobre 2026 **e** il 5 ottobre 2020, quindi partite di
// stagioni diverse finivano nello stesso gruppo e la classifica del giorno
// pescava da un mucchio più grande del vero. Misurato: **952 chiavi su 2.072
// fondevano più anni** (12/10/2026, trovato dal controllo del codice).
//
// ⚠️ E non si usa nemmeno `toISOString().slice(0,10)`, che è la data **UTC**:
// fra mezzanotte e le due italiane restituisce ieri. Stessa trappola già
// pagata in `app/scripts/importa-partite.js` e in `oggiLocale()`.

/** La data come `aaaa-mm-gg`, dai componenti locali. */
export function giornoLocale(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

// ⚠️⚠️ **`weekendDi` NON vive più qui**: è la stessa regola che usa l'app per
// raggruppare le giornate, e il 22/10/2026 ne sono esistite due copie per
// mezz'ora. Si ri-esporta da `app/src/lib/attendibilita.js` — una copia che
// nessuno confronta non si accorge di essere sbagliata, ed è la regola del
// progetto (una misura e lo schermo devono eseguire lo stesso codice).
export { weekendDi } from '../../app/src/lib/attendibilita.js';

/**
 * ⚠️⚠️ **L'ORA DI UNA PARTITA È L'ORA ITALIANA, SEMPRE.**
 *
 * Trovato da Mattia il 23/10/2026: *"tutto il calendario è con il fuso
 * sbagliato, è indietro di un'ora — le partite delle 15 le segna alle 14"*.
 * Aveva ragione, e le due fonti sbagliavano per lo stesso motivo:
 *
 * - **The Odds API** dà un istante UTC, e `importa-prossime-odds.js` lo
 *   formattava in `Europe/London` *"come football-data"*;
 * - **football-data** pubblica la colonna `Time` **in ora inglese**, e la si
 *   copiava così com'era.
 *
 * Londra è un'ora indietro rispetto a Roma, **tutto l'anno**: Regno Unito e
 * Unione Europea cambiano l'ora negli stessi due giorni (ultima domenica di
 * marzo e di ottobre), quindi lo scarto è fisso a 60 minuti e non va mai
 * calcolato a mano sul periodo.
 *
 * ⚠️ Per questo esistono **due** funzioni e non una: da un istante si passa
 * per il fuso (giusto per costruzione), da un'ora inglese si somma l'ora
 * (l'unica cosa possibile, perché il fuso di partenza non è nel dato).
 */

/** Da un istante ISO all'ora italiana: `{ data: 'aaaa-mm-gg', ora: 'hh:mm' }`. */
export function dataOraItaliana(iso) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  // ⚠️ `hour12: false` può dare `24` a mezzanotte in alcune versioni di Node:
  // è la stessa riga che c'era prima, e resta perché il difetto resta.
  return { data: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

/**
 * Da data e ora **inglesi** (football-data) a data e ora italiane.
 * ⚠️ Il giorno cambia quando si passa la mezzanotte: una partita alle 23:30
 * inglesi è lo 00:30 del giorno dopo in Italia. Raro ma non impossibile, e un
 * giorno sbagliato è peggio di un'ora sbagliata.
 */
export function daInglese(data, ora) {
  if (!ora) return { data, ora };
  const [h, m] = ora.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return { data, ora };
  const d = new Date(`${data}T12:00:00`);
  let h2 = h + 1;
  if (h2 >= 24) { h2 -= 24; d.setDate(d.getDate() + 1); }
  return { data: giornoLocale(d), ora: `${String(h2).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}
