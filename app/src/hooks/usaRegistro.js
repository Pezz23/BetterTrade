import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Il registro dei soldi (`registro_soldi()`, `sql/65`), letto una volta per pagina:
// in Bilancio lo usano la card del totale, il Settore ospiti, i grafici e l'elenco.
export function usaRegistro(userId) {
  const [dati, setDati] = useState(null)
  const [errore, setErrore] = useState(null)
  const leggi = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.rpc('registro_soldi')
    if (error) setErrore(error.message); else { setDati(data); setErrore(null) }
  }, [userId])
  useEffect(() => { leggi() }, [leggi])
  return { dati, errore, leggi }
}
