import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { valuta, oggiLocale } from '../lib/attendibilita'
import { COLONNE } from './usaProssime'
import { completaEsiti } from '../lib/esitiSpin'

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

/**
 * I risultati di alcune partite del calendario (`prossime_partite.id`), dal
 * collegamento all'archivio: `Map(id → { casa, trasferta })`, solo quelle che
 * il risultato ce l'hanno. La usano anche le spin (30/10/2026).
 */
export async function risultatiDi(ids) {
  const risultati = new Map()
  const tutti = [...new Set((ids || []).filter(x => x != null))]
  if (!tutti.length) return risultati
  const { data: c, error } = await supabase.from('prossime_partite').select('id, partita_id')
    .in('id', tutti).not('partita_id', 'is', null)
  if (error || !c?.length) return risultati
  const { data: g, error: e2 } = await supabase.from('partite').select('id, gol_casa, gol_trasferta')
    .in('id', c.map(x => x.partita_id))
  if (e2) return risultati
  const perId = new Map((g || []).map(x => [x.id, x]))
  for (const x of c) {
    const r = perId.get(x.partita_id)
    if (r?.gol_casa != null) risultati.set(x.id, { casa: r.gol_casa, trasferta: r.gol_trasferta })
  }
  return risultati
}

/**
 * Scrive nella griglia gli esiti automatici delle spin (`completaEsiti`) e
 * torna quanti ne ha scritti. La chiama «Scarica risultati» alla fine del
 * giro: la Dashboard è aggiornata senza aprire la Slot.
 * ⚠️ La griglia la scrivono solo gli admin (la policy): per gli altri torna 0.
 */
export async function aggiornaEsitiGriglia() {
  const { data, error } = await supabase.from('griglia').select('spins').eq('id', 1).single()
  if (error || !data) return 0
  const spins = typeof data.spins === 'string' ? JSON.parse(data.spins) : data.spins
  const risultati = await risultatiDi((spins || []).flat().map(t => t?.prossima_id))
  const r = completaEsiti(spins, (id) => risultati.get(id) ?? null)
  if (!r.scritti) return 0
  const { error: e2 } = await supabase.from('griglia')
    .update({ spins: r.spins, updated_at: new Date().toISOString() }).eq('id', 1)
  return e2 ? 0 : r.scritti
}

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
      supabase.from('prossime_partite').select('id')
        .gte('data', ieri).lte('data', oggi).not('partita_id', 'is', null),
    ])
    // ⚠️ `Promise.all` su supabase-js non lancia: l'errore va letto (trappola nota).
    if (p.error || c.error) return
    const risultati = await risultatiDi((c.data || []).map(x => x.id))
    setStato({ ieri: (p.data || []).map(valuta).filter(r => r.prob !== null), risultati })
  }, [])

  useEffect(() => { ricarica() }, [ricarica])
  const risultatoDi = useCallback((id) => stato.risultati.get(id) ?? null, [stato.risultati])
  return { ieri: stato.ieri, risultatoDi, ricarica }
}
