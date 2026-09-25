// Aggiornamento del bankroll.
//
// Il bankroll non è un numero che si scrive: è la somma di
//   saldo iniziale + depositi − prelievi + saldo delle giornate giocate.
// La colonna users.bankroll è solo una cache di quel calcolo.
//
// La formula sta **nel database** (`ricalcola_bankroll`, sql/04) e non qui: una
// seconda copia in JavaScript sarebbe il problema che questo file era nato per
// risolvere — la formula era duplicata in BilancioPage e ReportingPage, e due
// copie prima o poi divergono.

import { supabase } from '../supabase'

// Ricalcola e scrive la cache in un colpo solo.
//
// Passa dal database (`ricalcola_bankroll`, vedi sql/04) invece di scrivere
// users.bankroll dal browser: con RLS un utente normale non può modificare la
// propria riga in users, e la scrittura falliva in silenzio lasciando il
// movimento registrato e il saldo fermo. La funzione ricalcola dalle fonti e
// scrive lei: nessuno può imporre un numero, solo chiederne il ricalcolo.
export async function aggiornaBankroll(userId) {
  const { data, error } = await supabase.rpc('ricalcola_bankroll', { p_user_id: userId })
  if (error) throw new Error(`Ricalcolo bankroll fallito: ${error.message}`)
  return data
}

// I soldi si arrotondano ai centesimi: senza questo i decimali binari si
// accumulano e il totale non torna.
export const arrotonda = n => Math.round(n * 100) / 100
