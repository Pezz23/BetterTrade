// La scrittura della griglia: l'unico pezzo delle spin che tocca il database.
//
// Sta fuori da `lib/spin.js` apposta — quello è solo calcolo e così Node lo può
// eseguire da terminale per provarlo sui dati veri (convenzione in CLAUDE.md).

import { supabase } from '../supabase.js'
import { cellaDa } from './spin.js'

/**
 * Scrive una spin composta nella griglia (griglia.spins[indice], 0-based) e
 * toglie le spunte delle schedine di quella spin: appartenevano alla spin
 * vecchia. Restituisce un messaggio d'errore o null.
 */
export async function compilaSpin(indice, celle) {
  const { data, error } = await supabase.from('griglia').select('spins').eq('id', 1).single()
  if (error) return error.message
  const spins = [0, 1, 2, 3].map(i => data?.spins?.[i] ?? [])
  spins[indice] = celle.map(c => cellaDa(c.pos, c.partita))
  const { error: e2 } = await supabase.from('griglia').update({ spins, updated_at: new Date().toISOString() }).eq('id', 1)
  if (e2) return e2.message
  const { error: e3 } = await supabase.from('inserite').delete().eq('spin_idx', indice)
  return e3 ? `spin scritta, ma le spunte vecchie non si sono cancellate: ${e3.message}` : null
}
