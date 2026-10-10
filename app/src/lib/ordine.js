import { C } from '../theme.js'

// I modi di ordinare la lista delle partite: uno per ogni colonna della barra.
// Stanno in `lib/` e non nella pagina perché Node li può eseguire sui dati veri
// (`scripts/prova-ordine.js`): l'ordinamento è pieno di casi limite — il valore
// che manca, il pari merito — e dentro un componente non si provano.

/**
 * ⚠️ Il valore che manca va **in fondo**, non in cima, **in entrambi i versi**:
 * `null` dentro una sottrazione dà `NaN`, e un confronto che restituisce `NaN`
 * lascia l'array in un ordine qualunque. Non è un dettaglio di stile: senza
 * questo, una lista con tre valori assenti si disordina tutta.
 */
export const fondo = (a, b) => (a == null ? 1 : b == null ? -1 : 0)

// Una chiave per colonna. Quelle che dipendono da VPM arrivano dalla mappa che
// la pagina costruisce una volta sola.
export const ORDINI = [
  { id: 'quota',  label: 'quota',         colore: C.oro,     chiave: r => r.quotaGiocata ?? r.quota },
  { id: 'att',    label: 'attendibilità', colore: C.menta,   chiave: r => r.probGiocata },
  { id: 'vpm',    label: 'VPM',           colore: C.celeste, chiave: (r, v) => v?.get(r.id)?.punti },
  { id: 'resa',   label: 'resa',          colore: C.testo,   chiave: r => r.resa },
  { id: 'voto',   label: 'voto',          colore: C.verde,   chiave: (r, v) => v?.get(r.id)?.voto },
]

export const ORDINE_DEFAULT = 'voto'

/**
 * Il confronto di un criterio, con i pari merito già risolti.
 *
 * ⚠️ Ogni criterio ha **due criteri di riserva** (l'attendibilità, poi la
 * data): senza, due partite con lo stesso voto si scambiano di posto a ogni
 * ridisegno e la lista balla sotto le dita.
 */
export function confronto(id, vpmDi, crescente = false) {
  const o = ORDINI.find(x => x.id === id) ?? ORDINI[0]
  const verso = crescente ? -1 : 1
  return (a, b) => {
    const x = o.chiave(a, vpmDi), y = o.chiave(b, vpmDi)
    return fondo(x, y) || verso * ((y ?? 0) - (x ?? 0))
      || b.probGiocata - a.probGiocata || a.data.localeCompare(b.data)
  }
}
