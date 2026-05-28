import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import UtentiPage from './pages/UtentiPage'
import SlotPage from './pages/SlotPage'
import DashboardPage from './pages/DashboardPage'
import ReportingPage from './pages/ReportingPage'
import BilancioPage from './pages/BilancioPage'

// ── Tab bar bottom ────────────────────────────────────────────────────────────
const TABS_BASE = [
  { id:'dashboard', label:'Dashboard', icon:'◈' },
  { id:'slot',      label:'Slot',      icon:'⊞' },
  { id:'reporting', label:'Reporting', icon:'◫' },
  { id:'bilancio',  label:'Bilancio',  icon:'◉' },
]
const TAB_ADMIN = { id:'utenti', label:'Utenti', icon:'◎' }

function TabBar({ active, onChange, isAdmin }) {
  const tabs = isAdmin ? [...TABS_BASE, TAB_ADMIN] : TABS_BASE
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:100,
      display:'flex',
      background:'#0d0d0d',
      borderTop:'1px solid #1a1a1a',
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(t => {
        const on = t.id === active
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            flex:1, padding:'10px 2px 8px', background:'transparent', border:'none',
            borderTop:`2px solid ${on?'#c9a84c':'transparent'}`,
            color: on?'#c9a84c':'#4a4540',
            fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:1,
            cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:3,
            transition:'all .15s',
          }}>
            <span style={{ fontSize:17 }}>{t.icon}</span>
            {t.label.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ currentUser, onLogout }) {
  const roleColor = { superadmin:'#c9a84c', admin:'#60a5fa', user:'#4ade80' }
  const roleLabel = { superadmin:'SuperAdmin', admin:'Admin', user:'User' }
  const rc = roleColor[currentUser?.role] || '#888'
  return (
    <div style={{ background:'#0d0d0d', borderBottom:'1px solid #1a1a1a', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity=".9"/>
          <rect x="16" y="2" width="10" height="10" rx="2" fill="#c9a84c" opacity=".5"/>
          <rect x="2" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity=".5"/>
          <rect x="16" y="16" width="10" height="10" rx="2" fill="#c9a84c" opacity=".9"/>
        </svg>
        <span style={{ fontSize:14, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", letterSpacing:'-0.3px' }}>BetterTrade</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:28, height:28, borderRadius:7, background:`${rc}18`, border:`1px solid ${rc}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:rc, fontFamily:"'DM Mono',monospace" }}>
            {(currentUser?.display_name||currentUser?.username||'?').substring(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", lineHeight:1.2 }}>{currentUser?.display_name||currentUser?.username}</div>
            <div style={{ fontSize:9, color:rc, fontFamily:"'DM Mono',monospace" }}>{roleLabel[currentUser?.role]}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background:'transparent', border:'1px solid #1e1e1e', borderRadius:6, color:'#444', cursor:'pointer', fontSize:12, padding:'4px 8px', fontFamily:"'DM Mono',monospace" }}>⏻</button>
      </div>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, logout, isAdmin } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [tiles, setTiles] = useState(() => Array.from({length:9},(_,i)=>({
    id:i+1, casa:'', ospite:'', pronostico:'', quota:'', campionato:'', data:'', result:null
  })))

  if (!currentUser) return <LoginPage />

  function renderPage() {
    switch(tab) {
      case 'dashboard': return <DashboardPage />
      case 'slot':      return <SlotPage tiles={tiles} setTiles={setTiles} />
      case 'reporting': return <ReportingPage />
      case 'bilancio':  return <BilancioPage />
      case 'utenti':    return <UtentiPage />
      default:          return <DashboardPage />
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#090909', color:'#e0d9d0' }}>
      <Header currentUser={currentUser} onLogout={logout} />
      <div style={{ maxWidth:720, margin:'0 auto' }}>
        {renderPage()}
      </div>
      <TabBar active={tab} onChange={setTab} isAdmin={isAdmin} />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
