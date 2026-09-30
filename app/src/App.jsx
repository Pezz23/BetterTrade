import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SpinProvvisoriePage from './pages/SpinProvvisoriePage'
import StoricoPage from './pages/StoricoPage'
import UtentiPage from './pages/UtentiPage'
import SlotPage from './pages/SlotPage'
import DashboardPage from './pages/DashboardPage'
import ReportingPage from './pages/ReportingPage'
import BilancioPage from './pages/BilancioPage'
import PartitePage from './pages/PartitePage'
import { C, F, alpha } from './theme'

// ── Tab bar bottom ────────────────────────────────────────────────────────────
const TABS_BASE = [
  { id:'dashboard', label:'Dashboard', icon:'◈' },
  { id:'slot',      label:'Slot',      icon:'⊞' },
  { id:'reporting', label:'Reporting', icon:'◫' },
  { id:'bilancio',  label:'Bilancio',  icon:'◉' },
]
// Il menu ad hamburger: tutto quello che non sta nei 4 tasti in basso.
// `soloAdmin` nasconde la voce, ma la protezione vera è la policy RLS.
const VOCI_MENU = [
  { id:'partite', label:'Partite',  icon:'⚽', desc:'Le prossime partite con l\'indice di attendibilità' },
  { id:'provvisorie', label:'Spin provvisorie', icon:'🎰', desc:'Le spin compilate da sole, in anteprima', soloAdmin:true },
  { id:'storico',     label:'Storico',          icon:'📚', desc:'L\'archivio e come stanno andando le proposte' },
  { id:'utenti',  label:'Utenti',   icon:'◎',  desc:'Gestione utenti e password', soloAdmin:true },
]

function TabBar({ active, onChange }) {
  const tabs = TABS_BASE
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:100,
      display:'flex',
      background:C.barra,
      borderTop:`1px solid ${C.bordoRiga}`,
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(t => {
        const on = t.id === active
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} style={{
            flex:1, padding:'10px 2px 8px', background:'transparent', border:'none',
            borderTop:`2px solid ${on?C.oro:'transparent'}`,
            color: on?C.oro:C.inattivo,
            fontFamily:F.mono, fontSize:9, letterSpacing:1,
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
function Menu({ aperto, onChiudi, onVai, attivo, isAdmin }) {
  if (!aperto) return null
  const voci = VOCI_MENU.filter(v => !v.soloAdmin || isAdmin)
  return (
    <>
      {/* lo sfondo chiude il menu al tocco */}
      <div onClick={onChiudi} style={{ position:'fixed', inset:0, zIndex:60, background:alpha(C.fondo, 0.7) }} />
      {/* Il pannello prende tutta l'altezza dello schermo: prima era un
          riquadro sotto il tasto, e l'ultima voce finiva tagliata. */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, zIndex:70,
        width:'min(320px, 86vw)', display:'flex', flexDirection:'column',
        background:C.pannello, borderLeft:`1px solid ${C.bordo}`,
        boxShadow:`-12px 0 32px ${alpha(C.fondo, 0.8)}`,
      }}>
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 16px', borderBottom:`1px solid ${C.bordoRiga}`, flexShrink:0,
        }}>
          <span style={{ fontSize:10, color:C.spento, fontFamily:F.mono, letterSpacing:3, textTransform:'uppercase' }}>Menu</span>
          <button onClick={onChiudi} aria-label="Chiudi" style={{
            background:'transparent', border:`1px solid ${C.bordo}`, borderRadius:6,
            color:C.spento, cursor:'pointer', fontSize:14, padding:'2px 9px', lineHeight:1.4, fontFamily:F.mono,
          }}>✕</button>
        </div>

        {/* le voci scorrono se un giorno saranno tante; il pannello no */}
        <div style={{ flex:1, overflowY:'auto', padding:8 }}>
          {voci.map(v => {
            const on = v.id === attivo
            return (
              <button key={v.id} onClick={() => { onVai(v.id); onChiudi() }} style={{
                display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left',
                padding:'12px 12px', borderRadius:8, cursor:'pointer', border:'none', marginBottom:2,
                background: on ? alpha(C.oro, 0.1) : 'transparent',
                borderLeft:`3px solid ${on ? C.oro : 'transparent'}`,
              }}>
                <span style={{ fontSize:18, width:24, textAlign:'center' }}>{v.icon}</span>
                <span style={{ minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color: on ? C.oro : C.testo, fontFamily:F.sans }}>{v.label}</div>
                  <div style={{ fontSize:10, color:C.spento, fontFamily:F.sans, lineHeight:1.4 }}>{v.desc}</div>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function Header({ currentUser, onLogout, onMenu, menuAperto }) {
  const roleColor = { superadmin:C.oro, admin:C.blu, user:C.menta }
  const roleLabel = { superadmin:'SuperAdmin', admin:'Admin', user:'User' }
  const rc = roleColor[currentUser?.role] || C.grigio
  return (
    <div style={{ background:C.barra, borderBottom:`1px solid ${C.bordoRiga}`, padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
          <rect x="16" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
          <rect x="2" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
          <rect x="16" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
        </svg>
        <span style={{ fontSize:14, fontWeight:700, color:C.testo, fontFamily:F.sans, letterSpacing:'-0.3px' }}>BetterTrade</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* L'uscita sta dove prima c'erano le iniziali: è l'unico gesto che
              si fa da qui, le iniziali non servivano a niente. */}
          <button onClick={onLogout} title="Esci" style={{
            width:30, height:30, borderRadius:8, background:alpha(C.oro, 0.12), border:`1px solid ${alpha(C.oro, 0.4)}`,
            display:'flex', alignItems:'center', justifyContent:'center', color:C.oro, cursor:'pointer',
            fontSize:14, fontFamily:F.mono, padding:0, lineHeight:1,
          }}>⏻</button>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.testo, fontFamily:F.sans, lineHeight:1.2 }}>{currentUser?.display_name||currentUser?.username}</div>
            <div style={{ fontSize:9, color:rc, fontFamily:F.mono }}>{roleLabel[currentUser?.role]}</div>
          </div>
        </div>
        <button onClick={onMenu} aria-label="Menu" style={{
          background: menuAperto ? alpha(C.oro, 0.12) : 'transparent',
          border:`1px solid ${menuAperto ? alpha(C.oro, 0.4) : C.bordo}`, borderRadius:6,
          color: menuAperto ? C.oro : C.testo, cursor:'pointer', fontSize:16, padding:'2px 9px', lineHeight:1.4,
        }}>☰</button>
      </div>
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { currentUser, logout, isAdmin, booting } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [menu, setMenu] = useState(false)

  // Il ripristino della sessione è asincrono: senza questa attesa comparirebbe
  // un lampo di schermata di login a ogni ricaricamento.
  if (booting) return (
    <div style={{ minHeight:'100vh', background:C.fondo, display:'flex', alignItems:'center', justifyContent:'center',
                  color:C.inattivo, fontFamily:F.mono, fontSize:12, letterSpacing:2 }}>
      CARICAMENTO…
    </div>
  )
  if (!currentUser) return <LoginPage />

  function renderPage() {
    switch(tab) {
      case 'dashboard': return <DashboardPage />
      case 'slot':      return <SlotPage />
      case 'reporting': return <ReportingPage />
      case 'bilancio':  return <BilancioPage />
      case 'partite':   return <PartitePage />
      case 'provvisorie': return <SpinProvvisoriePage />
      case 'storico':   return <StoricoPage />
      case 'utenti':    return <UtentiPage />
      default:          return <DashboardPage />
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.fondo, color:C.testo, display:'flex', flexDirection:'column' }}>
      <Header currentUser={currentUser} onLogout={logout} onMenu={() => setMenu(m => !m)} menuAperto={menu} />
      <Menu aperto={menu} onChiudi={() => setMenu(false)} onVai={setTab} attivo={tab} isAdmin={isAdmin} />
      {/* `flex:1` fa arrivare la pagina fino in fondo qualunque sia l'altezza
          della testata; il padding lascia lo spazio della tab bar, che è fissa
          e senza di esso coprirebbe le ultime righe. */}
      <div style={{
        flex:1, width:'100%', maxWidth:720, margin:'0 auto',
        paddingBottom:'var(--barra-bassa)',
      }}>
        {renderPage()}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
