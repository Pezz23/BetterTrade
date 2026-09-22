import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { aggiornaBankroll } from '../lib/bankroll'

const AuthContext = createContext(null)

// Gli utenti non hanno un'email e non ne useranno mai una: fanno login con
// username e password. Supabase Auth però pretende un identificatore email,
// quindi ne costruiamo una interna e deterministica. Deve restare identica alla
// funzione emailDi() di scripts/migra-auth.js, altrimenti il login non trova
// l'account.
const DOMINIO = 'bettertrade.local'
export const emailDi = username =>
  `${String(username).toLowerCase().replace(/[^a-z0-9]/g, '')}@${DOMINIO}`

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [booting, setBooting]         = useState(true)  // ripristino sessione in corso
  const [pct, setPct]                 = useState(10)    // % bankroll da giocare
  const [numSlot, setNumSlot]         = useState(1)     // numero slot da giocare

  // La sessione la tiene supabase-js (con refresh automatico del token): non
  // salviamo più noi il record utente in sessionStorage — conteneva la password.
  useEffect(() => {
    async function caricaProfilo(session) {
      if (!session) { setCurrentUser(null); setBooting(false); return }
      const { data } = await supabase
        .from('users').select('*').eq('auth_id', session.user.id).single()
      // Account Auth senza riga in users: non è un utente dell'app.
      if (!data) await supabase.auth.signOut()
      setCurrentUser(data || null)
      setBooting(false)
    }

    supabase.auth.getSession().then(({ data }) => caricaProfilo(data.session))
    // Il callback di onAuthStateChange gira mentre la libreria tiene un lock
    // interno: interrogare il database qui dentro può bloccare la login stessa.
    // Si rimanda la lettura del profilo al giro successivo dell'event loop.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setTimeout(() => caricaProfilo(session), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Carica impostazioni globali da Supabase all'avvio
  useEffect(() => {
    async function loadImpostazioni() {
      const { data } = await supabase.from('impostazioni').select('percentuale_gioco, num_slot, stagione_corrente').eq('id', 1).single()
      if (data) {
        setPct(data.percentuale_gioco || 10)
        setNumSlot(data.num_slot || 1)
      }
    }
    if (currentUser) loadImpostazioni()
  }, [currentUser?.id])

  // Carica users appena il currentUser è disponibile
  // Necessario per calcoli bankroll aggregato (getTotalBankroll/getTotalBase)
  useEffect(() => {
    if (currentUser) fetchUsers()
  }, [currentUser?.id])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at')
    if (data) setUsers(data)
  }

  async function login(username, password) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailDi(username),
        password,
      })
      setLoading(false)
      // Messaggio unico: non riveliamo se è lo username o la password a essere
      // sbagliato, altrimenti si scopre chi esiste.
      if (error) return { ok: false, error: 'Username o password errati' }
      return { ok: true }  // il profilo lo carica onAuthStateChange
    } catch {
      setLoading(false)
      return { ok: false, error: 'Impossibile connettersi al server. Verifica la connessione.' }
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setUsers([])
  }

  // Cambia la password di CHI È LOGGATO. Quella di un altro la assegna il
  // superadmin con assegnaPassword(), più sotto.
  async function cambiaMiaPassword(nuova) {
    if (!nuova || nuova.length < 6) return { ok: false, error: 'Almeno 6 caratteri' }
    const { error } = await supabase.auth.updateUser({ password: nuova })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  // Chiede al database di ricalcolare il bankroll di un utente e ricarica quel
  // che sta in memoria. Non scrive un valore: lo scrive la funzione lato
  // database (vedi sql/04), perché con RLS un utente normale non può modificare
  // la propria riga in users e la scrittura falliva in silenzio.
  async function aggiornaSaldo(userId) {
    const nuovo = await aggiornaBankroll(userId)
    if (currentUser?.id === userId) setCurrentUser({ ...currentUser, bankroll: nuovo })
    await fetchUsers()
    return nuovo
  }

  // Creare un utente, assegnargli una password ed eliminarlo: le fa il
  // database (sql/16), in security definer. Servivano la chiave service_role
  // e il terminale; il controllo "solo superadmin" è dentro la funzione SQL,
  // non qui — qui si nascondono i bottoni, là si protegge.
  async function creaUtente({ username, password, ruolo = 'user', nome = '', bankroll = 0 }) {
    const { data, error } = await supabase.rpc('crea_utente', {
      p_username: username, p_password: password, p_ruolo: ruolo,
      p_nome: nome, p_bankroll: Number(bankroll) || 0,
    })
    if (error) return { ok: false, error: error.message }
    await fetchUsers()
    return { ok: true, id: data }
  }

  async function assegnaPassword(username, password) {
    const { error } = await supabase.rpc('assegna_password', { p_username: username, p_password: password })
    return error ? { ok: false, error: error.message } : { ok: true }
  }

  async function deleteUser(userId) {
    // Cancellava solo la riga in users: l'account Auth restava e bruciava
    // quello username per sempre. Ora li toglie entrambi la funzione SQL.
    const { error } = await supabase.rpc('elimina_utente', { p_user_id: userId })
    if (error) return { ok: false, error: error.message }
    await fetchUsers()
    return { ok: true }
  }

  async function savePct(val) {
    await supabase.from('impostazioni').update({ percentuale_gioco: val }).eq('id', 1)
    setPct(val)
  }

  async function saveNumSlot(val) {
    await supabase.from('impostazioni').update({ num_slot: val }).eq('id', 1)
    setNumSlot(val)
  }

  function getTotalBankroll() {
    return users.reduce((s, u) => s + (u.bankroll || 0), 0)
  }

  // Base di calcolo per utente corrente
  function getMyBase() {
    const bk = currentUser?.bankroll || 0
    return (bk * (pct / 100)) / numSlot
  }

  // Base di calcolo aggregata (SuperAdmin)
  function getTotalBase() {
    return (getTotalBankroll() * (pct / 100)) / numSlot
  }

  // Calcola puntate da una base
  function calcSchedule(base) {
    const tris     = Math.floor(base * 0.77 / 5)
    const quaterna = Math.floor(base * 0.20 / 2)
    const full     = Math.floor(base * 0.03)
    return { tris, quaterna, full, totale: tris * 5 + quaterna * 2 + full }
  }

  const isSuperAdmin = currentUser?.role === 'superadmin'
  const isAdmin      = currentUser?.role === 'admin' || currentUser?.role === 'superadmin'

  return (
    <AuthContext.Provider value={{
      currentUser, users, loading, booting,
      pct, numSlot, savePct, saveNumSlot,
      login, logout, fetchUsers, cambiaMiaPassword,
      aggiornaSaldo, deleteUser, creaUtente, assegnaPassword,
      getTotalBankroll, getMyBase, getTotalBase, calcSchedule,
      isSuperAdmin, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
