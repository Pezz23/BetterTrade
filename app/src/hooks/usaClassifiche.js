import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Le classifiche di tutti i campionati, in una chiamata sola (sql/18).
//
// La chiamata si fa **una volta per sessione** e il risultato resta qui: la
// lista, la scheda e le spin provvisorie chiedono tutte la stessa cosa, e
// un'altra richiesta a ogni pagina sarebbe sprecata.

let memoria = null      // il risultato, una volta arrivato
let inCorso = null      // la richiesta, finché è in volo

function carica() {
  if (memoria) return Promise.resolve(memoria)
  if (!inCorso) {
    inCorso = supabase.rpc('classifiche').then(({ data, error }) => {
      inCorso = null
      if (error) throw error
      memoria = data || {}
      return memoria
    })
  }
  return inCorso
}

export function usaClassifiche() {
  const [classifiche, setClassifiche] = useState(memoria)
  useEffect(() => {
    if (memoria) return
    let vivo = true
    carica().then(c => { if (vivo) setClassifiche(c) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  return classifiche
}

/**
 * Il posto in classifica di una squadra: { posizione, punti, squadre } oppure
 * null se non la conosciamo (nome nuovo, campionato senza partite giocate).
 */
export const postoDi = (classifiche, div, squadra) => classifiche?.[div]?.[squadra] || null

/**
 * Verde il primo terzo, giallo il secondo, rosso l'ultimo.
 *
 * ⚠️ A terzi e non a soglie fisse (7 e 12): i campionati vanno da 12 squadre
 * (Scozia) a 24 (Championship). Con le soglie fisse in Scozia nessuno sarebbe
 * mai rosso e l'ultima risulterebbe gialla; in Championship metà campionato
 * sarebbe rosso. Su 20 squadre i terzi danno 1-7, 8-13, 14-20: gli stessi
 * numeri che aveva in mente Mattia, ma che reggono ovunque.
 */
export function fasciaDi(posto) {
  if (!posto) return null
  const terzo = posto.squadre / 3
  return posto.posizione <= terzo ? 'alta' : posto.posizione <= terzo * 2 ? 'media' : 'bassa'
}
