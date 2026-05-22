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

  useEffect(() => {
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [currentUser])

  async function fetchUsers() {
    const { data } = await supabase.from('users').select('*').order('created_at')
    if (data) setUsers(data)
  }

  async function login(username, password) {
    setLoading(true)
    const { data, error } = await supabase
      .from('users').select('*')
      .eq('username', username).eq('password', password).single()
    setLoading(false)
    if (error || !data) return { ok: false, error: 'Username o password errati' }
    setCurrentUser(data)
    return { ok: true }
  }

  function logout() { setCurrentUser(null); setUsers([]) }

  async function createUser({ username, password, displayName, role, bankroll }) {
    if (!currentUser || currentUser.role === 'user')
      return { ok: false, error: 'Permessi insufficienti' }
    if (currentUser.role === 'admin' && role !== 'user')
      return { ok: false, error: 'Gli admin possono creare solo User' }

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
    return { ok: true }
  }

  async function updateBankroll(userId, amount) {
    await supabase.from('users').update({ bankroll: parseFloat(amount) || 0 }).eq('id', userId)
    if (currentUser?.id === userId)
      setCurrentUser(p => ({ ...p, bankroll: parseFloat(amount) || 0 }))
    await fetchUsers()
  }

  async function deleteUser(userId) {
    if (currentUser?.role !== 'superadmin') return { ok: false, error: 'Solo SuperAdmin' }
    await supabase.from('users').delete().eq('id', userId)
    await fetchUsers()
    return { ok: true }
  }

  function getTotalBankroll() {
    return users.reduce((s, u) => s + (u.bankroll || 0), 0)
  }

  function calcSchedule(total) {
    const tris     = Math.floor(total * 0.77 / 5)
    const quaterna = Math.floor(total * 0.19 / 2)
    const full     = Math.floor(total * 0.04)
    return { tris, quaterna, full, totale: tris * 5 + quaterna * 2 + full }
  }

  const isSuperAdmin = currentUser?.role === 'superadmin'
  const isAdmin      = currentUser?.role === 'admin' || currentUser?.role === 'superadmin'

  return (
    <AuthContext.Provider value={{
      currentUser, users, loading,
      login, logout, fetchUsers,
      createUser, updateBankroll, deleteUser,
      getTotalBankroll, calcSchedule,
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
