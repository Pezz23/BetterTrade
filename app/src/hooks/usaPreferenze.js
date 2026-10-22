import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

// LE PREFERENZE SALVATE — i filtri (e la situazione) che restano.
//
// ⚠️⚠️ **Due regole diverse per i due ruoli** (Mattia, 22/10/2026): *"vorrei
// che gli admin vedano tutti la stessa schermata, gli utenti invece devono
// essere liberi di avere i loro filtri"*. Nel database (`sql/35`) è **una
// tabella sola**: la riga con `user_id` nullo **è** quella condivisa degli
// admin, le altre sono personali. Due tabelle per la stessa cosa sarebbero due
// posti da tenere d'accordo.
//
// ⚠️ **La catena di lettura: la mia riga → quella degli admin → niente** (e
// allora decide chi chiama, coi suoi valori di partenza). Così chi non ha mai
// salvato eredita la selezione degli admin invece di partire dai valori di
// fabbrica. Un admin legge **sempre** la condivisa, anche se per caso ha una
// riga sua: è il senso di *"vediamo tutti la stessa schermata"*.
//
// ⚠️⚠️ **Non è in tempo reale, ed è una scelta** (confermata da Mattia): se un
// altro admin salva mentre hai la pagina aperta, lo vedi al prossimo
// caricamento. Il tempo reale è un altro meccanismo, e qui si cambiano quattro
// soglie, non si gioca in due sulla stessa schedina.

export function usaPreferenze(ambito) {
  const { currentUser, isAdmin, users } = useAuth()
  const [righe, setRighe] = useState(null)      // null = non ancora lette
  const [errore, setErrore] = useState(null)
  const [occupato, setOccupato] = useState(false)

  const leggi = useCallback(async () => {
    if (!currentUser) return
    // ⚠️ La policy consegna **al massimo due righe**: la propria e la
    // condivisa. Non serve filtrare per utente qui — e non si deve, o un admin
    // non vedrebbe quella condivisa.
    const { data, error } = await supabase.from('preferenze')
      .select('user_id, dati, aggiornato_il, aggiornato_da').eq('ambito', ambito)
    // ⚠️ L'errore si **tiene**, non si scarta: `const { data } = await …` su
    // un rifiuto di RLS torna un elenco vuoto, cioè *"non hai mai salvato"*
    // detto al posto di *"non riesco a leggere"*. Sono due cose diverse.
    if (error) { setErrore(error.message); setRighe([]); return }
    setErrore(null)
    setRighe(data || [])
  }, [ambito, currentUser])

  useEffect(() => { leggi() }, [leggi])

  const condivisa = (righe || []).find(r => r.user_id === null) || null
  const mia = (righe || []).find(r => r.user_id === currentUser?.id) || null
  const riga = isAdmin ? condivisa : (mia || condivisa)

  /**
   * Salva **a nome del ruolo**: un admin scrive la riga condivisa, un utente
   * la propria. Non è il chiamante a decidere dove va — così non può andarci
   * per sbaglio, e la policy rifiuterebbe comunque.
   *
   * ⚠️ **Update e poi insert, non `upsert`**: gli indici che garantiscono
   * l'unicità sono **parziali** (uno per `user_id is null`, uno per le righe
   * personali) e PostgREST non sa esprimere un `on conflict … where`. Un
   * upsert senza il bersaglio giusto creerebbe una seconda riga, e la lettura
   * ne prenderebbe una a caso.
   */
  const salva = useCallback(async (dati) => {
    if (!currentUser) return { errore: 'non sei entrato' }
    setOccupato(true)
    const chi = isAdmin ? null : currentUser.id
    const campi = { dati, aggiornato_il: new Date().toISOString(), aggiornato_da: currentUser.id }
    const base = supabase.from('preferenze').update(campi).eq('ambito', ambito)
    const { data, error } = await (chi === null ? base.is('user_id', null) : base.eq('user_id', chi)).select('user_id')
    let err = error?.message
    // ⚠️ Zero righe toccate vuol dire **che non c'era**, non che è fallita:
    // RLS rifiuta in silenzio e una `update` che non trova niente si comporta
    // allo stesso modo. Qui la differenza la fa l'`insert` subito dopo, che
    // invece l'errore lo dà.
    if (!err && !(data || []).length) {
      const r = await supabase.from('preferenze').insert({ ambito, user_id: chi, ...campi })
      err = r.error?.message
    }
    setOccupato(false)
    if (err) { setErrore(`Preferenze non salvate: ${err}`); return { errore: err } }
    await leggi()
    return {}
  }, [ambito, currentUser, isAdmin, leggi])

  return {
    // ⚠️ `pronte` e non `dati !== null`: *"non ho ancora letto"* e *"ho letto e
    // non c'è niente"* portano a due comportamenti opposti — aspettare, o
    // partire dai valori di fabbrica.
    pronte: righe !== null,
    dati: riga?.dati ?? null,
    info: riga ? {
      quando: riga.aggiornato_il,
      // il nome si risolve dalla lista che `AuthContext` ha già in mano: una
      // richiesta in meno, e con sei admin sulla stessa riga sapere **chi** ha
      // mosso le soglie è l'unica cosa che rende leggibile un numero cambiato
      // da solo fra ieri e oggi.
      chi: users?.find(u => u.id === riga.aggiornato_da)?.username ?? null,
      condivisa: riga.user_id === null,
    } : null,
    salva, occupato, errore,
  }
}
