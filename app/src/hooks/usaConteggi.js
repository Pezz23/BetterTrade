import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Angoli e cartellini di una competizione (sql/39, `conteggi_dati()`).
//
// ⚠️⚠️ **Per competizione e a richiesta**, al contrario di `usaVpm` che carica
// tutto una volta per sessione. Quella serve alla **lista** di duecento
// partite, quindi tanto vale prendere tutto subito; questa serve alla
// **scheda di una partita**, che si apre una volta su venti. Caricare 54.000
// righe di conteggi per mostrarne due sarebbe pagare mille volte il bisogno.
//
// ⚠️ La memoria è **per competizione**, non una sola: aprire una partita di
// Champions non deve buttare via i conteggi della Serie A appena caricati.

const memoria = new Map()   // div → risultato
const inCorso = new Map()   // div → richiesta in volo

function carica(div) {
  if (memoria.has(div)) return Promise.resolve(memoria.get(div))
  if (!inCorso.has(div)) {
    inCorso.set(div, supabase.rpc('conteggi_dati', { p_div: div }).then(({ data, error }) => {
      inCorso.delete(div)
      if (error) throw error
      const d = data || { lega: null, squadre: {} }
      memoria.set(div, d)
      return d
    }))
  }
  return inCorso.get(div)
}

export function usaConteggi(div) {
  const [dati, setDati] = useState(() => (div ? memoria.get(div) ?? null : null))
  useEffect(() => {
    if (!div) return
    const gia = memoria.get(div)
    if (gia) { setDati(gia); return }
    let vivo = true
    // ⚠️ Se fallisce, la scheda deve restare leggibile: questi sono un dato in
    // più, non il contenuto della pagina. Resta `null` e il blocco non compare.
    setDati(null)
    carica(div).then(d => { if (vivo) setDati(d) }).catch(() => {})
    return () => { vivo = false }
  }, [div])
  return dati
}
