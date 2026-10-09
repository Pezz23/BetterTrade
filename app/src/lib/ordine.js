import { C } from '../theme.js'

// I modi di ordinare la lista delle partite. Stanno in `lib/` e non nella
// pagina perché Node li può eseguire sui dati veri (`scripts/prova-ordine.js`):
// l'ordinamento è pieno di casi limite — il valore che manca, il pari merito —
// e dentro un componente non si provano.

/**
 * ⚠️ Il valore che manca va **in fondo**, non in cima: `null` dentro una
 * sottrazione dà `NaN`, e un confronto che restituisce `NaN` lascia l'array in
 * un ordine qualunque. Non è un dettaglio di stile: senza questo, una lista con
 * tre Gradi assenti si disordina tutta.
 */
export const fondo = (a, b) => (a == null ? 1 : b == null ? -1 : 0)

export const ORDINI = [
  {
    id: 'attendibilita', label: 'attendibilità', colore: C.oro,
    cmp: (a, b) => b.probGiocata - a.probGiocata,
  },
  {
    id: 'grado', label: 'Grado', colore: C.menta,
    cmp: (a, b) => fondo(a.grado, b.grado) || (b.grado ?? 0) - (a.grado ?? 0),
  },
  {
    // Prima i campi più netti, a prescindere da chi gli danno ragione: il
    // disaccordo col mercato si isola col filtro, non con l'ordine.
    id: 'vpm', label: 'VPM', colore: C.celeste,
    cmp: (a, b, vpmDi) => {
      const x = vpmDi?.get(a.id)?.punti, y = vpmDi?.get(b.id)?.punti
      return fondo(x, y) || (y ?? 0) - (x ?? 0)
    },
  },
]

export const ORDINE_DEFAULT = ORDINI[0].id

/**
 * Il confronto completo di un criterio, con i pari merito già risolti.
 *
 * ⚠️ Ogni criterio ha **due criteri di riserva** (l'attendibilità, poi la
 * data): senza, due partite con lo stesso Grado si scambiano di posto a ogni
 * ridisegno e la lista balla sotto le dita. È lo stesso motivo per cui una
 * query paginata vuole un ordine univoco.
 */
export function confronto(id, vpmDi) {
  const o = ORDINI.find(x => x.id === id) ?? ORDINI[0]
  return (a, b) => o.cmp(a, b, vpmDi) || b.probGiocata - a.probGiocata || a.data.localeCompare(b.data)
}
