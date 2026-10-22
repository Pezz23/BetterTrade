import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// 🎟️ LE SCHEDINE DEL BET BUILDER — il registro di chi le fa.
//
// ⚠️⚠️ **Sono private** (richiesta di Mattia, 22/10/2026: *"ogni utente ha il
// suo bet builder, nessuna condivisione"*), ed è l'opposto della scalata, dove
// dal 22/10 la lettura è aperta a tutti: quella è la road map del weekend del
// gruppo, questa è il foglio di una persona. La protezione sta nelle policy di
// `sql/36`, verificate per ruolo — **nemmeno un admin vede le schedine di un
// altro**; qui non si filtra nemmeno per `user_id`, perché lo fa il database.
//
// ⚠️ **Le gambe arrivano annidate** (`select('*, schedina_gambe(*)')`), che
// PostgREST risolve seguendo la chiave esterna: una richiesta invece di due. È
// la stessa cura che il 18/10 ha tolto i secondi all'apertura della scalata —
// **il costo non sono i dati, sono i giri**.

const primoErrore = (risposte) => risposte.find(r => r?.error)?.error?.message ?? null

export function usaSchedine(userId) {
  const [schedine, setSchedine] = useState(null)   // null = non ancora lette
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)

  const ricarica = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('schedine')
      .select('*, schedina_gambe(*)').order('creata_il', { ascending: false })
    if (error) { setErrore(error.message); return }
    setErrore(null)
    // ⚠️ L'ordine delle righe annidate si rifà **in JS**: il nome dell'opzione
    // per ordinarle è cambiato fra le versioni di supabase-js, e un
    // ordinamento che non viene applicato **non dà errore**.
    setSchedine((data || []).map(s => ({
      ...s, gambe: [...(s.schedina_gambe || [])].sort((a, b) => a.id - b.id),
    })))
  }, [userId])

  useEffect(() => { ricarica() }, [ricarica])

  /**
   * Salva una schedina nuova con le sue gambe.
   * ⚠️ Due scritture e non una per gamba: prima la schedina (serve il suo id),
   * poi **tutte** le gambe insieme.
   * ⚠️ E se le gambe falliscono, la schedina si cancella: una schedina senza
   * gambe è una riga che non vuol dire niente, e resterebbe lì a confondere.
   */
  const crea = useCallback(async ({ quotaObiettivo, criterio, gambe }) => {
    if (!userId) return { errore: 'non sei entrato' }
    if (!gambe?.length) return { errore: 'non c’è nessuna gamba da salvare' }
    setOccupato(true)
    const { data: s, error } = await supabase.from('schedine')
      .insert({ user_id: userId, quota_obiettivo: quotaObiettivo, criterio })
      .select('id').single()
    if (error) { setOccupato(false); setErrore(error.message); return { errore: error.message } }
    const { error: e2 } = await supabase.from('schedina_gambe').insert(
      gambe.map(g => ({
        schedina_id: s.id, prossima_id: g.id, div: g.div, data: g.data, ora: g.ora,
        casa: g.casa, trasferta: g.trasferta, giocata: g.giocata,
        quota: Number(g.quota), att: g.att, scelta: g.scelta, vpm: g.vpm,
      })))
    if (e2) {
      await supabase.from('schedine').delete().eq('id', s.id)
      setOccupato(false); setErrore(e2.message); return { errore: e2.message }
    }
    await ricarica()
    setOccupato(false)
    return { id: s.id }
  }, [userId, ricarica])

  /** La spunta «giocata»: compilare non è giocare. Si può anche annullare. */
  const segnaGiocata = useCallback(async (id, giocata) => {
    const { error } = await supabase.from('schedine')
      .update({ stato: giocata ? 'giocata' : 'bozza', giocata_il: giocata ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) { setErrore(error.message); return { errore: error.message } }
    await ricarica()
    return {}
  }, [ricarica])

  /** ⚠️ Le gambe se ne vanno con la `on delete cascade`: una sola scrittura. */
  const cancella = useCallback(async (id) => {
    const { error } = await supabase.from('schedine').delete().eq('id', id)
    if (error) { setErrore(error.message); return { errore: error.message } }
    await ricarica()
    return {}
  }, [ricarica])

  // ⚠️⚠️ **Le partite già usate**, per non giocarle due volte (richiesta di
  // Mattia): valgono **tutte** le schedine vive, bozze comprese — una bozza è
  // una schedina che stai per giocare, non un ripensamento. Si cancella, se
  // non la vuoi più.
  const usate = new Set((schedine || []).flatMap(s => s.gambe.map(g => g.prossima_id)))

  return { schedine, usate, crea, segnaGiocata, cancella, occupato, errore, ricarica,
    primoErrore }
}
