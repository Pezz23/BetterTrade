import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// I dati di VPM per tutte le squadre e tutti gli scontri diretti, in una
// chiamata sola (sql/20, `vpm_dati()`).
//
// Stessa strada di usaClassifiche: la chiamata si fa **una volta per sessione**
// e il risultato resta qui. Senza, servirebbero quattro finestre per squadra
// per partita — e in lista le partite sono duecento. Il payload è ~77 KB.

let memoria = null      // il risultato, una volta arrivato
let inCorso = null      // la richiesta, finché è in volo

function carica() {
  if (memoria) return Promise.resolve(memoria)
  if (!inCorso) {
    inCorso = supabase.rpc('vpm_dati').then(({ data, error }) => {
      inCorso = null
      if (error) throw error
      memoria = data || { squadre: {}, scontri: {} }
      return memoria
    })
  }
  return inCorso
}

export function usaVpm() {
  const [dati, setDati] = useState(memoria)
  useEffect(() => {
    if (memoria) return
    let vivo = true
    // Se la chiamata fallisce la lista deve funzionare comunque: VPM è un dato
    // in più, non il contenuto della pagina. Resta `null` e le caselle fanno —.
    carica().then(d => { if (vivo) setDati(d) }).catch(() => {})
    return () => { vivo = false }
  }, [])
  return dati
}
