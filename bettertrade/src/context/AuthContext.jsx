import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase'

const AuthContext = createContext(null)
const SESSION_KEY = 'bt_session'

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadSession)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [currentUser])

  // Carica tutti gli utenti (solo per admin/superadmin)
  async function fetchUsers() {
    const { data, error } = await supabase.from('users').select('*').order('created_at')
    if (!error && data) setUsers(data)
  }

  async function login(username, password) {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single()
    setLoading(false)
    if (error || !data) return { ok: false, error: 'Username o password errati' }
    setCurrentUser(data)
    return { ok: true }
  }

  function logout() {
    setCurrentUser(null)
    setUsers([])
  }

  async function createUser({ username, password, displayName, role, bankroll }) {
    if (!currentUser || currentUser.role === 'user') return { ok: false, error: 'Permessi insufficienti' }
    if (currentUser.role === 'admin' && role !== 'user') return { ok: false, error: 'Gli admin possono creare solo utenti User' }

    const { data, error } = await supabase.from('users').insert([{
      username,
      password,
      display_name: displayName || username,
      role,
      bankroll: parseFloat(bankroll) || 0,
      created_by: currentUser.id,
    }]).select().single()

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Username già esistente' }
      return { ok: false, error: error.message }
    }
    await fetchUsers()
    return { ok: true, user: data }
  }

  async function updateUserBankroll(userId, amount) {
    await supabase.from('users').update({ bankroll: parseFloat(amount) || 0 }).eq('id', userId)
    await fetchUsers()
    // Aggiorna anche currentUser se è lui stesso
    if (currentUser?.id === userId) {
      setCurrentUser(prev => ({ ...prev, bankroll: parseFloat(amount) || 0 }))
    }
  }

  async function deleteUser(userId) {
    if (!currentUser || currentUser.role !== 'superadmin') return { ok: false, error: 'Solo il SuperAdmin può eliminare utenti' }
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) return { ok: false, error: error.message }
    await fetchUsers()
    return { ok: true }
  }

  function getTotalBankroll() {
    return users.reduce((sum, u) => sum + (u.bankroll || 0), 0)
  }

  function calcSchedule(totalBankroll) {
    const tris77 = Math.floor(totalBankroll * 0.77 / 5)
    const quart19 = Math.floor(totalBankroll * 0.19 / 2)
    const full4 = Math.floor(totalBankroll * 0.04)
    return {
      tris: tris77,
      quaterna: quart19,
      full: full4,
      totaleImpegnato: (tris77 * 5) + (quart19 * 2) + full4,
    }
  }

  const value = {
    currentUser, users, loading,
    login, logout, createUser, updateUserBankroll, deleteUser,
    fetchUsers, getTotalBankroll, calcSchedule,
    isSuperAdmin: currentUser?.role === 'superadmin',
    isAdmin: currentUser?.role === 'admin' || currentUser?.role === 'superadmin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
