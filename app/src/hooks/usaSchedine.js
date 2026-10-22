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
  const crea = useCallback(async ({ quotaObiettivo, criterio, gambe, importo, filtri }) => {
    if (!userId) return { errore: 'non sei entrato' }
    if (!gambe?.length) return { errore: 'non c’è nessuna gamba da salvare' }
    setOccupato(true)
    const { data: s, error } = await supabase.from('schedine')
      .insert({ user_id: userId, quota_obiettivo: quotaObiettivo, criterio,
        importo: Number(importo) > 0 ? Number(importo) : null,
        // ⚠️ I filtri di quel momento: `criterio` dice *come* si ordinava,
        // questi dicono *da quali partite* si pescava. Senza, due schedine
        // «per voto» sarebbero indistinguibili pur essendo due esperimenti
        // diversi.
        filtri: filtri ?? null })
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

  /**
   * L'esito, a mano (22/10/2026). ⚠️ Si può **annullare** passando `null`: un
   * esito segnato per sbaglio e non più togliibile è un registro che mente, e
   * qui il registro serve proprio a dire com'è andata davvero.
   * ⚠️ Un domani si riempirà da sé — ogni gamba ha `prossima_id` e l'archivio
   * ha il risultato — ma la regola che dice *se quella giocata è arrivata*
   * vive nel motore (`btscout/lib/ricostruisci.js`): per usarla dall'app va
   * **spostata** in `src/lib/`, non copiata.
   */
  const segnaEsito = useCallback(async (id, esito) => {
    const { error } = await supabase.from('schedine')
      .update({ esito, chiusa_il: esito ? new Date().toISOString() : null }).eq('id', id)
    if (error) { setErrore(error.message); return { errore: error.message } }
    await ricarica()
    return {}
  }, [ricarica])

  /** L'importo giocato, facoltativo. ⚠️ Vuoto vuol dire **non lo dico**, non
   *  zero: `null` e `0` sono due cose diverse, e un saldo costruito su uno
   *  zero finto sarebbe falso. */
  const scriviImporto = useCallback(async (id, importo) => {
    const n = Number(String(importo).replace(',', '.'))
    const { error } = await supabase.from('schedine')
      .update({ importo: Number.isFinite(n) && n > 0 ? n : null }).eq('id', id)
    if (error) { setErrore(error.message); return { errore: error.message } }
    await ricarica()
    return {}
  }, [ricarica])

  /**
   * La quota di una gamba, **modificabile dopo il salvataggio** (Mattia,
   * 22/10/2026: *"devo poter cambiare la quota salvata, la quota potrebbe
   * essere diversa dalla media trovata da noi"*).
   *
   * ⚠️⚠️ È la stessa ragione per cui nella scalata le quote si toccano: la
   * nostra viene da **Bet365 o dalla media di mercato**, e lui gioca su book
   * diversi e con i bonus. Una schedina che mostra la quota del consenso
   * racconta una giocata che non è la sua — e siccome qui c'è l'**importo**,
   * racconterebbe anche una **vincita sbagliata**.
   * ⚠️ Non si tocca `prossime_partite`: quella è la fotografia di cosa si
   * vedeva prima, e il confronto fra le due quote è un dato, non un errore.
   */
  const cambiaQuota = useCallback(async (gambaId, quota) => {
    const n = Number(String(quota).replace(',', '.'))
    if (!(n > 1)) return { errore: 'la quota deve essere maggiore di 1' }
    const { error } = await supabase.from('schedina_gambe').update({ quota: n }).eq('id', gambaId)
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

  return { schedine, usate, crea, segnaGiocata, segnaEsito, scriviImporto, cambiaQuota, cancella,
    occupato, errore, ricarica }
}
