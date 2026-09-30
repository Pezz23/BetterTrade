import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Il quadro di forma di una partita: lo calcola il database in una chiamata
// (forma_partita, sql/15). Lo usano il pannello vecchio e il dettaglio nuovo:
// la query sta qui una volta sola.

export function usaForma(div, casa, trasferta) {
  const [forma, setForma] = useState(null)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    let vivo = true
    setForma(null); setErrore(null)
    supabase.rpc('forma_partita', { p_div: div, p_casa: casa, p_trasferta: trasferta })
      .then(({ data, error }) => { if (!vivo) return; if (error) setErrore(error.message); else setForma(data) })
    return () => { vivo = false }
  }, [div, casa, trasferta])

  return { forma, errore }
}
