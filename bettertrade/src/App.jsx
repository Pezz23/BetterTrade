import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import UtentiPage from './pages/UtentiPage'

function Placeholder({ icon, title }) {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#e0d9d0', marginBottom: 8 }}>{title}</h2>
      <span style={{ background: 'rgba(201,168,76,0.10)', color: '#c9a84c', fontSize: 11, padding: '3px 12px', borderRadius: 20, fontFamily: 'monospace' }}>In sviluppo</span>
    </div>
  )
}

function AppShell() {
  const { currentUser, logout, isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')

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
      case 'utenti': return <UtentiPage />
      case 'slot':   return <Placeholder icon="🎰" title="Slot" />
      case 'schedine': return <Placeholder icon="📋" title="Schedine" />
      case 'reporting': return <Placeholder icon="📈" title="Reporting" />
      case 'bilancio': return <Placeholder icon="💶" title="Bilancio" />
      default: return <Placeholder icon="◈" title="Dashboard" />
    }
  }

  return (
    <div style={L.root}>
      <nav style={L.sidebar}>
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

        <div style={L.navList}>
          {tabs.map(t => (
            <button key={t.id} style={{ ...L.navItem, ...(tab === t.id ? L.navActive : {}) }} onClick={() => setTab(t.id)}>
              <span style={L.navIcon}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div style={L.userBox}>
          <div style={{ ...L.userAvatar, color: roleColor[currentUser.role], background: `${roleColor[currentUser.role]}18` }}>
            {(currentUser.display_name || currentUser.username).substring(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={L.userName}>{currentUser.display_name || currentUser.username}</p>
            <p style={{ ...L.userRole, color: roleColor[currentUser.role] }}>{roleLabel[currentUser.role]}</p>
          </div>
          <button style={L.logoutBtn} onClick={logout} title="Esci">⏻</button>
        </div>
      </nav>

      <main style={L.main}>{renderPage()}</main>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}

const L = {
  root: { display: 'flex', minHeight: '100vh', background: '#090909' },
  sidebar: { width: 220, flexShrink: 0, background: '#0d0d0d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', padding: '20px 14px', position: 'sticky', top: 0, height: '100vh' },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 28 },
  logoIcon: { width: 34, height: 34, background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logoText: { fontSize: 15, fontWeight: 600, color: '#e0d9d0', letterSpacing: '-0.3px' },
  navList: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 'none', borderRadius: 7, padding: '10px 12px', color: '#555', fontSize: 14, cursor: 'pointer', textAlign: 'left', width: '100%' },
  navActive: { background: 'rgba(201,168,76,0.08)', color: '#c9a84c', fontWeight: 500 },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  userBox: { display: 'flex', alignItems: 'center', gap: 10, background: '#111', border: '1px solid #1a1a1a', borderRadius: 9, padding: '10px 12px', marginTop: 16 },
  userAvatar: { width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 500, color: '#e0d9d0', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: 11, fontFamily: 'monospace' },
  logoutBtn: { background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 16, padding: 4, flexShrink: 0 },
  main: { flex: 1, overflowY: 'auto', minHeight: '100vh' },
}
