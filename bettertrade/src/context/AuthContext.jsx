import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)
const SESSION_KEY = 'bt_session'

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadSession)
  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [pct, setPct]                 = useState(10)   // % bankroll da giocare
  const [numSlot, setNumSlot]         = useState(1)    // numero slot da giocare

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [currentUser])

  // Carica impostazioni globali da Supabase all'avvio
  useEffect(() => {
    async function loadImpostazioni() {
      const { data } = await supabase.from('impostazioni').select('percentuale_gioco, num_slot, stagione_corrente').eq('id', 1).single()
      if (data) {
        setPct(data.percentuale_gioco || 10)
        setNumSlot(data.num_slot || 1)
      }
    }
    loadImpostazioni()
  }, [])

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
      const { data, error } = await supabase
        .from('users').select('*')
        .eq('username', username).eq('password', password).single()
      setLoading(false)
      if (error || !data) return { ok: false, error: 'Username o password errati' }
      setCurrentUser(data)
      return { ok: true }
    } catch (err) {
      setLoading(false)
      return { ok: false, error: 'Impossibile connettersi al server. Verifica la connessione.' }
    }
  }

  function logout() { setCurrentUser(null); setUsers([]) }

  async function createUser({ username, password, displayName, role, bankroll }) {
    if (!currentUser || currentUser.role === 'user') return { ok: false, error: 'Permessi insufficienti' }
    if (currentUser.role === 'admin' && role !== 'user') return { ok: false, error: 'Gli admin possono creare solo User' }

    const bk = parseFloat(bankroll) || 0
    const { data, error } = await supabase.from('users').insert([{
      username,
      password,
      display_name: displayName || username,
      role,
      bankroll: bk,
      bankroll_iniziale: bk,
      created_by: currentUser.id,
    }]).select().single()

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Username già esistente' }
      return { ok: false, error: error.message }
    }
    await fetchUsers()
    return { ok: true }
  }

  async function updateBankroll(userId, amount) {
    const val = parseFloat(amount) || 0
    await supabase.from('users').update({ bankroll: val }).eq('id', userId)
    // Aggiorna currentUser in sessione E sessionStorage
    if (currentUser?.id === userId) {
      const updated = { ...currentUser, bankroll: val }
      setCurrentUser(updated)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated))
    }
    await fetchUsers()
  }

  async function deleteUser(userId) {
    if (currentUser?.role !== 'superadmin') return { ok: false, error: 'Solo SuperAdmin' }
    await supabase.from('users').delete().eq('id', userId)
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
      currentUser, users, loading,
      pct, numSlot, savePct, saveNumSlot,
      login, logout, fetchUsers,
      createUser, updateBankroll, deleteUser,
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
