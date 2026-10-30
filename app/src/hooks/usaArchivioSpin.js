import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { COMBOS, statoSchedina, resaInUnita } from '../lib/spin'
import { risultatiDi } from './usaRecenti'

// L'ARCHIVIO DELLE SPIN, senza soldi (30/10/2026, `sql/53`).
//
// Mattia: *"tracciare le spin senza toccare il conto reale, un archivio dei
// risultati"*. Una riga per spin: la fotografia delle caselle con i
// risultati, le schedine uscite, se era giocata, la resa in unità.
// ⚠️ Si archivia a «↺ Nuova spin» (prima che la griglia si svuoti) o col
// tasto «salva in archivio»; la stessa spin (stessa `firma`) **aggiorna** la
// sua riga invece di raddoppiarla.
// ⚠️ Non tocca giornate né bankroll: la Dashboard resta quella di prima.

/** Quale spin è: le partite collegate, o per la Fun le squadre scritte a mano. */
const firmaDi = (tiles) => (tiles || [])
  .map(t => (t?.prossima_id ? `p${t.prossima_id}` : `${t?.casa || ''}-${t?.ospite || ''}`)).join('|')

export function usaArchivioSpin() {
  const [righe, setRighe] = useState(null)
  const [errore, setErrore] = useState(null)

  const carica = useCallback(async () => {
    const { data, error } = await supabase.from('spin_archivio').select('*')
      .order('archiviata_il', { ascending: false }).limit(500)
    if (error) { setErrore(error.message); return }
    setErrore(null); setRighe(data || [])
  }, [])
  useEffect(() => { carica() }, [carica])

  /**
   * Archivia una spin. Torna `{}` o `{ errore }`.
   * ⚠️ Una spin vuota non si archivia: non c'è niente da misurare.
   */
  const archivia = useCallback(async (spinIdx, tiles, giocata, userId) => {
    if (!(tiles || []).some(t => t?.casa || t?.ospite)) return { errore: 'la spin è vuota' }
    const ids = tiles.map(t => t?.prossima_id).filter(Boolean)
    const [risultati, date] = await Promise.all([
      risultatiDi(ids),
      ids.length ? supabase.from('prossime_partite').select('id, data').in('id', ids) : Promise.resolve({ data: [] }),
    ])
    const giorni = (date.data || []).map(x => String(x.data).slice(0, 10)).sort()
    const caselle = tiles.map(t => {
      const r = t?.prossima_id ? risultati.get(t.prossima_id) : null
      return { id: t.id, casa: t.casa, ospite: t.ospite, pronostico: t.pronostico, quota: t.quota, data: t.data,
        result: t.result || '', prossima_id: t.prossima_id ?? null, gol: r ? `${r.casa}-${r.trasferta}` : null }
    })
    const r = resaInUnita(tiles)
    const { error } = await supabase.from('spin_archivio').upsert({
      spin_idx: spinIdx, firma: firmaDi(tiles), giocata: !!giocata,
      dal: giorni[0] ?? null, al: giorni[giorni.length - 1] ?? null,
      caselle, schedine: COMBOS.map(c => ({ id: c.id, nome: c.nome, tipo: c.tipo, stato: statoSchedina(tiles, c) })),
      incasso: r?.incasso ?? null, resa: r?.resa ?? null,
      archiviata_il: new Date().toISOString(), archiviata_da: userId ?? null,
    }, { onConflict: 'spin_idx,firma' })
    if (error) return { errore: error.message }
    await carica()
    return {}
  }, [carica])

  return { righe, errore, carica, archivia }
}
