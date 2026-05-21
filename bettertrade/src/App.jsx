import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import UtentiPage from './pages/UtentiPage'
import SchedinePage from './pages/SchedinePage'
import { DashboardPage, SlotPage, ReportingPage, BilancioPage } from './pages/PlaceholderPages'

function AppShell() {
  const { currentUser, logout, isSuperAdmin, isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')
  // Partite condivise tra Slot e Schedine
  // Array di 9 oggetti: { pos, pronostico, casa, ospite, quota, data, campionato }
  const [partite, setPartite] = useState(Array(9).fill(null))

  if (!currentUser) return <LoginPage />

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '◈' },
    { id: 'slot',      label: 'Slot',       icon: '⊞' },
    { id: 'schedine',  label: 'Schedine',   icon: '◧' },
    { id: 'reporting', label: 'Reporting',  icon: '◫' },
    { id: 'bilancio',  label: 'Bilancio',   icon: '◉' },
    ...(isAdmin ? [{ id: 'utenti', label: 'Utenti', icon: '◎' }] : []),
  ]

  const roleColor = { superadmin: '#c9a84c', admin: '#60a5fa', user: '#4ade80' }
  const roleLabel = { superadmin: 'SuperAdmin', admin: 'Admin', user: 'User' }

  function renderPage() {
    switch (tab) {
      case 'dashboard': return <DashboardPage />
      case 'slot':      return <SlotPage partite={partite} setPartite={setPartite} />
      case 'schedine':  return <SchedinePage partite={partite} />
      case 'reporting': return <ReportingPage />
      case 'bilancio':  return <BilancioPage />
      case 'utenti':    return <UtentiPage />
      default:          return <DashboardPage />
    }
  }

  return (
    <div style={L.root}>
      {/* Sidebar */}
      <nav style={L.sidebar}>
        {/* Logo */}
        <div style={L.logoWrap}>
          <div style={L.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
              <rect x="16" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="2" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.5"/>
              <rect x="16" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity="0.9"/>
            </svg>
          </div>
          <span style={L.logoText}>BetterTrade</span>
        </div>

        {/* Nav items */}
        <div style={L.navList}>
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...L.navItem, ...(tab === t.id ? L.navActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              <span style={L.navIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* User info */}
        <div style={L.userBox}>
          <div style={{ ...L.userAvatar, color: roleColor[currentUser.role] || '#e0d9d0',
            background: `${roleColor[currentUser.role]}18` }}>
            {(currentUser.displayName || currentUser.username).substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={L.userName}>{currentUser.displayName || currentUser.username}</p>
            <p style={{ ...L.userRole, color: roleColor[currentUser.role] || '#888' }}>
              {roleLabel[currentUser.role]}
            </p>
          </div>
          <button style={L.logoutBtn} onClick={logout} title="Esci">⏻</button>
        </div>
      </nav>

      {/* Main */}
      <main style={L.main}>
        {renderPage()}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

const L = {
  root: { display: 'flex', minHeight: '100vh', background: '#090909' },
  sidebar: {
    width: '220px', flexShrink: 0,
    background: '#0d0d0d',
    borderRight: '1px solid #1a1a1a',
    display: 'flex', flexDirection: 'column',
    padding: '20px 14px',
    position: 'sticky', top: 0, height: '100vh',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px', marginBottom: '28px' },
  logoIcon: { width: '34px', height: '34px', background: 'rgba(201,168,76,0.10)',
    border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText: { fontFamily: "'Sora',sans-serif", fontSize: '15px', fontWeight: '600',
    color: '#e0d9d0', letterSpacing: '-0.3px' },
  navList: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'transparent', border: 'none', borderRadius: '7px',
    padding: '10px 12px', color: '#555', fontSize: '14px',
    fontFamily: "'Sora',sans-serif", fontWeight: '400',
    cursor: 'pointer', textAlign: 'left', width: '100%',
    transition: 'color 0.15s, background 0.15s',
  },
  navActive: { background: 'rgba(201,168,76,0.08)', color: '#c9a84c', fontWeight: '500' },
  navIcon: { fontSize: '16px', width: '20px', textAlign: 'center', flexShrink: 0 },
  userBox: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#111', border: '1px solid #1a1a1a',
    borderRadius: '9px', padding: '10px 12px', marginTop: '16px',
  },
  userAvatar: { width: '32px', height: '32px', borderRadius: '7px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '600', fontFamily: "'DM Mono',monospace", flexShrink: 0 },
  userName: { fontSize: '13px', fontWeight: '500', color: '#e0d9d0',
    fontFamily: "'Sora',sans-serif", marginBottom: '1px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: '11px', fontFamily: "'DM Mono',monospace" },
  logoutBtn: { background: 'none', border: 'none', color: '#444', cursor: 'pointer',
    fontSize: '16px', padding: '4px', flexShrink: 0, transition: 'color 0.15s' },
  main: { flex: 1, overflowY: 'auto', minHeight: '100vh' },
}
