// Ricalcolo del bankroll — unica fonte di verità.
//
// Era duplicato identico in BilancioPage e ReportingPage: due copie della stessa
// formula significano due posti dove sbagliarla, e prima o poi divergono.
//
// Il bankroll non è un numero che si aggiorna a mano: è la somma di
//   saldo iniziale + depositi − prelievi + saldo delle giornate giocate.
// La colonna users.bankroll è solo una cache di questo calcolo.

import { supabase } from '../supabase'

export async function ricalcolaBankroll(userId) {
  const [{ data: u }, { data: movs }, { data: gio }] = await Promise.all([
    supabase.from('users').select('bankroll_iniziale').eq('id', userId).single(),
    supabase.from('movimenti').select('tipo, importo').eq('user_id', userId),
    supabase.from('giornate').select('tot_saldo').eq('user_id', userId),
  ])

  const iniziale = u?.bankroll_iniziale || 0
  const totMov   = (movs || []).reduce((s, m) => s + (m.tipo === 'deposito' ? m.importo : -m.importo), 0)
  const totGio   = (gio  || []).reduce((s, g) => s + (g.tot_saldo || 0), 0)

  return arrotonda(iniziale + totMov + totGio)
}

// Ricalcola e scrive la cache in un colpo solo.
export async function aggiornaBankroll(userId) {
  const nuovo = await ricalcolaBankroll(userId)
  await supabase.from('users').update({ bankroll: nuovo }).eq('id', userId)
  return nuovo
}

// I soldi si arrotondano ai centesimi: senza questo i decimali binari si
// accumulano e il totale non torna.
export const arrotonda = n => Math.round(n * 100) / 100
