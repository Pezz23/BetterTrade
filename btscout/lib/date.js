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

/** Il lunedì che chiude il weekend di una data, come nelle spin. */
export function weekendDi(d) {
  const x = new Date(d); x.setHours(12, 0, 0, 0);
  x.setDate(x.getDate() + ((8 - x.getDay()) % 7));
  return giornoLocale(x);
}
