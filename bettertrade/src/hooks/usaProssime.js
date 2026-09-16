import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'
import { valuta } from '../lib/attendibilita'

// Le partite future valutate, con i voti degli admin. Lo usano la pagina
// Partite e le Spin provvisorie: stessa lista, stesse stelline, un solo posto
// dove si carica.

export function usaProssime() {
  const { currentUser, isAdmin } = useAuth()
  const [righe, setRighe] = useState([])
  const [voti, setVoti] = useState([])     // [{ prossima_id, user_id }]
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    async function carica() {
      const oggi = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('prossime_partite')
        .select('id, div, campionato, data, ora, casa, trasferta, scaricato_il, fonte, book, book_1, book_x, book_2, b365_1, b365_x, b365_2, b365_over25, avg_ap_1, avg_ap_x, avg_ap_2, max_ap_1, max_ap_x, max_ap_2')
        .gte('data', oggi).order('data').order('ora')
      if (error) setErrore(error.message)
      else setRighe((data || []).map(valuta).filter(r => r.prob !== null))
      // I voti: se la tabella non c'è ancora, la lista resta senza stelle attive.
      const { data: v } = await supabase.from('voti_partite').select('prossima_id, user_id')
      setVoti(v || [])
      setCaricamento(false)
    }
    carica()
  }, [])

  // Voto: una riga per admin per partita. Si scrive prima in memoria — la
  // risposta del database arriva dopo — e se fallisce si torna indietro.
  async function vota(prossimaId) {
    if (!isAdmin || !currentUser) return
    const mio = voti.some(v => v.prossima_id === prossimaId && v.user_id === currentUser.id)
    const prima = voti
    setVoti(mio ? voti.filter(v => !(v.prossima_id === prossimaId && v.user_id === currentUser.id))
                : [...voti, { prossima_id: prossimaId, user_id: currentUser.id }])
    const { error } = mio
      ? await supabase.from('voti_partite').delete().eq('prossima_id', prossimaId).eq('user_id', currentUser.id)
      : await supabase.from('voti_partite').insert({ prossima_id: prossimaId, user_id: currentUser.id })
    if (error) { setVoti(prima); setErrore(`Voto non salvato: ${error.message}`) }
  }
  const votiDi = id => voti.filter(v => v.prossima_id === id).length
  const mioVoto = id => !!currentUser && voti.some(v => v.prossima_id === id && v.user_id === currentUser.id)

  return { righe, voti, vota, votiDi, mioVoto, caricamento, errore }
}
