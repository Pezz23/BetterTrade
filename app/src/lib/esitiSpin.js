import { giocataArrivata } from './esito.js'
import { giocataDa } from './spin.js'

// GLI ESITI AUTOMATICI DELLE SPIN (30/10/2026, Mattia: *"metti esiti
// automatici, confermare è noioso"* — il giorno prima erano proposti).
//
// Una casella collegata al calendario (`prossima_id`), **senza esito**, con la
// partita finita, prende ✓ o ✗ da sola: `giocataArrivata`, la stessa regola
// di Road to weekend e dell'archivio, dal pronostico tradotto con `giocataDa`.
// ⚠️⚠️ **Mai sopra un esito già scelto**: una correzione a mano resta.
// ⚠️ Una giocata che la regola non legge (X, 1X, GG) resta vuota: a mano.
// ⚠️ Vale anche sulle spin non spuntate GIOCATA; la Dashboard conta comunque
// solo le spuntate.
// Pura: torna le spin nuove e quante caselle ha scritto (0 = niente da salvare).

export function completaEsiti(spins, risultatoDi) {
  let scritti = 0
  const nuove = (spins || []).map(spin => (spin || []).map(t => {
    if (!t?.prossima_id || t.result) return t
    const ris = risultatoDi(t.prossima_id)
    if (!ris) return t
    const ok = giocataArrivata(giocataDa(t.pronostico), ris.casa, ris.trasferta)
    if (ok == null) return t
    scritti++
    return { ...t, result: ok ? 'win' : 'loss' }
  }))
  return { spins: nuove, scritti }
}
