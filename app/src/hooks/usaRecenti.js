import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { valuta, oggiLocale } from '../lib/attendibilita'
import { COLONNE } from './usaProssime'

// LE PARTITE DI IERI E I RISULTATI, per Road to weekend (30/10/2026).
//
// ⚠️⚠️ **Perché un gancio a parte.** `usaProssime` carica da OGGI in poi, e lo
// usano sei pagine: allargarlo a ieri metterebbe le partite di ieri anche in
// Partite, Spin e Slot. Ma in Road to weekend una partita cominciata resta
// **12 ore** (`ORE_VISIBILI`), e quella delle 21 di ieri, all'una di notte,
// spariva lo stesso: questo gancio la riporta, solo qui.
// ⚠️ E i **risultati** (Mattia: *"voglio vedere i risultati in Road to
// weekend"*): si leggono dal collegamento all'archivio (`partita_id`), come fa
// la scheda di una partita passata. Arrivano col tasto «Scarica risultati» o
// con gli aggiornamenti del Mac.
// Torna `{ ieri, risultatoDi(prossimaId) → { casa, trasferta } | null, ricarica }`.

const ieriLocale = () => {
  const d = new Date(`${oggiLocale()}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function usaRecenti() {
  const [stato, setStato] = useState({ ieri: [], risultati: new Map() })

  const ricarica = useCallback(async () => {
    const ieri = ieriLocale(), oggi = oggiLocale()
    const [p, c] = await Promise.all([
      supabase.from('prossime_partite').select(COLONNE).eq('data', ieri).order('ora'),
      supabase.from('prossime_partite').select('id, partita_id')
        .gte('data', ieri).lte('data', oggi).not('partita_id', 'is', null),
    ])
    // ⚠️ `Promise.all` su supabase-js non lancia: l'errore va letto (trappola nota).
    if (p.error || c.error) return
    const collegate = c.data || []
    const risultati = new Map()
    if (collegate.length) {
      const { data: g, error } = await supabase.from('partite').select('id, gol_casa, gol_trasferta')
        .in('id', collegate.map(x => x.partita_id))
      if (!error) {
        const perId = new Map((g || []).map(x => [x.id, x]))
        for (const x of collegate) {
          const r = perId.get(x.partita_id)
          if (r?.gol_casa != null) risultati.set(x.id, { casa: r.gol_casa, trasferta: r.gol_trasferta })
        }
      }
    }
    setStato({ ieri: (p.data || []).map(valuta).filter(r => r.prob !== null), risultati })
  }, [])

  useEffect(() => { ricarica() }, [ricarica])
  const risultatoDi = useCallback((id) => stato.risultati.get(id) ?? null, [stato.risultati])
  return { ieri: stato.ieri, risultatoDi, ricarica }
}
