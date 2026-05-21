import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

// SuperAdmin hardcoded
const SUPER_ADMIN = {
  id: 'superadmin',
  username: 'Admin',
  password: 'B0ll4t3!',
  role: 'superadmin',
  displayName: 'Super Admin',
  bankroll: 0,
  createdAt: '2024-01-01',
}

const STORAGE_KEY = 'bt_users'
const SESSION_KEY = 'bt_session'

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(loadUsers)
  const [currentUser, setCurrentUser] = useState(loadSession)

  useEffect(() => { saveUsers(users) }, [users])
  useEffect(() => {
    if (currentUser) sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentUser))
    else sessionStorage.removeItem(SESSION_KEY)
  }, [currentUser])

  // Ricarica currentUser aggiornato quando cambia la lista utenti
  useEffect(() => {
    if (currentUser && currentUser.id !== 'superadmin') {
      const updated = users.find(u => u.id === currentUser.id)
      if (updated) setCurrentUser(updated)
    }
  }, [users])

  function login(username, password) {
    // Controlla superadmin
    if (username === SUPER_ADMIN.username && password === SUPER_ADMIN.password) {
      setCurrentUser(SUPER_ADMIN)
      return { ok: true }
    }
    // Controlla utenti creati
    const user = users.find(u => u.username === username && u.password === password)
    if (user) {
      setCurrentUser(user)
      return { ok: true }
    }
    return { ok: false, error: 'Username o password errati' }
  }

  function logout() {
    setCurrentUser(null)
  }

  function createUser({ username, password, displayName, role, bankroll }) {
    // Solo superadmin e admin possono creare utenti
    if (!currentUser || currentUser.role === 'user') {
      return { ok: false, error: 'Permessi insufficienti' }
    }
    // Admin può creare solo user, non altri admin
    if (currentUser.role === 'admin' && role !== 'user') {
      return { ok: false, error: 'Gli admin possono creare solo utenti User' }
    }
    // Controlla username duplicato
    const allUsernames = [SUPER_ADMIN.username, ...users.map(u => u.username)]
    if (allUsernames.includes(username)) {
      return { ok: false, error: 'Username già esistente' }
    }

    const newUser = {
      id: `user_${Date.now()}`,
      username,
      password,
      displayName: displayName || username,
      role, // 'admin' o 'user'
      bankroll: parseFloat(bankroll) || 0,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.id,
    }
    setUsers(prev => [...prev, newUser])
    return { ok: true, user: newUser }
  }

  function updateUserBankroll(userId, amount) {
    if (userId === 'superadmin') {
      // Aggiorna il superadmin locale (non persiste tra sessioni, gestito a parte)
      setCurrentUser(prev => ({ ...prev, bankroll: amount }))
      return
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, bankroll: parseFloat(amount) || 0 } : u))
  }

  function deleteUser(userId) {
    if (!currentUser || currentUser.role !== 'superadmin') {
      return { ok: false, error: 'Solo il SuperAdmin può eliminare utenti' }
    }
    setUsers(prev => prev.filter(u => u.id !== userId))
    return { ok: true }
  }

  function getAllUsers() {
    return [SUPER_ADMIN, ...users]
  }

  function getTotalBankroll() {
    const saBank = currentUser?.id === 'superadmin' ? currentUser.bankroll : SUPER_ADMIN.bankroll
    return users.reduce((sum, u) => sum + (u.bankroll || 0), saBank)
  }

  // Calcola le puntate per le schedine in base al bankroll totale
  function calcSchedule(totalBankroll) {
    const tris77 = Math.floor(totalBankroll * 0.77 / 5)
    const quart19 = Math.floor(totalBankroll * 0.19 / 2)
    const full4 = Math.floor(totalBankroll * 0.04)
    return {
      tris: tris77,       // puntata singola per ciascuno dei 5 tris
      quaterna: quart19,  // puntata singola per ciascuna delle 2 quaterne
      full: full4,        // puntata per il full
      totaleImpegnato: (tris77 * 5) + (quart19 * 2) + full4,
    }
  }

  const value = {
    currentUser,
    users,
    login,
    logout,
    createUser,
    updateUserBankroll,
    deleteUser,
    getAllUsers,
    getTotalBankroll,
    calcSchedule,
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
