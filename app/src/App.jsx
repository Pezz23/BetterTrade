import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { C, F, alpha } from './theme'
import { VERSIONE } from './versione'

// ⚠️⚠️ **Ogni pagina è un pezzo a parte, scaricato quando la apri** (21/10/2026).
// Prima stavano tutte in un file solo da **437 kB**: aprendo l'app si
// scaricavano e si compilavano anche Andamento, Reporting, Bilancio e Road to
// weekend, cioè quattro pagine che in una sessione normale non si aprono.
// Su telefono quel peso è l'avvio.
// ⚠️ **Dashboard no**: è quella che si apre per prima, e metterla in un pezzo
// separato vorrebbe dire una seconda richiesta prima di poter disegnare
// qualcosa — l'opposto di quello che serve.
// ⚠️ E **LoginPage nemmeno**: chi non ha fatto login vede solo quella.
const SpinProvvisoriePage = lazy(() => import('./pages/SpinProvvisoriePage'))
const VotatePage = lazy(() => import('./pages/VotatePage'))
const StoricoPage = lazy(() => import('./pages/StoricoPage'))
const UtentiPage = lazy(() => import('./pages/UtentiPage'))
const SlotPage = lazy(() => import('./pages/SlotPage'))
const ReportingPage = lazy(() => import('./pages/ReportingPage'))
const BilancioPage = lazy(() => import('./pages/BilancioPage'))
const PartitePage = lazy(() => import('./pages/PartitePage'))
const AndamentoPage = lazy(() => import('./pages/AndamentoPage'))
const ImportazioniPage = lazy(() => import('./pages/ImportazioniPage'))
const ScalataPage = lazy(() => import('./pages/ScalataPage'))

// ── Tab bar bottom ────────────────────────────────────────────────────────────
// ⚠️ **Rifatta il 12/10/2026, scelta di Mattia**: in basso stanno le pagine del
// giro settimanale — si guardano le partite, si compila la spin, si gioca.
// Reporting e Bilancio sono passati nel menu: si aprono a giornata chiusa, non
// mentre si decide.
// ⚠️ `soloAdmin` qui **non basta a nascondere**: la TabBar va filtrata come il
// menu, altrimenti un utente normale vede un tasto che non può usare. La
// protezione vera resta la policy RLS.
const TABS_BASE = [
  { id:'dashboard',   label:'Dashboard', icon:'◈' },
  { id:'slot',        label:'Slot',      icon:'⊞' },
  { id:'provvisorie', label:'Spin',      icon:'🎰', soloAdmin:true },
  { id:'partite',     label:'Partite',   icon:'⚽' },
]
// Il menu ad hamburger: tutto quello che non sta nei tasti in basso.
// `soloAdmin` nasconde la voce, ma la protezione vera è la policy RLS.
const VOCI_MENU = [
  { id:'votate',      label:'Partite votate',   icon:'⭐', desc:'Quelle con la stellina: entrano nella spin comunque' },
  { id:'storico',     label:'Storico',          icon:'📚', desc:'L\'archivio e come stanno andando le proposte' },
  { id:'andamento',   label:'Andamento',        icon:'📈', desc:'Quale indicatore ci azzecca, giorno per giorno' },
  { id:'reporting',   label:'Reporting',        icon:'◫', desc:'Le giornate registrate, per persona e per settimana' },
  { id:'bilancio',    label:'Bilancio',         icon:'◉', desc:'Saldi, movimenti e bankroll del gruppo' },
  { id:'importazioni',label:'Importazioni',     icon:'📥', desc:'Partite da ESPN che non si agganciano da sole' },
  // ⚠️ Nel menu e non fra i tasti in basso: una pagina nuova va nel menu, e
  // questa è un esperimento con un bankroll suo, non il giro settimanale.
  { id:'scalata',     label:'Road to weekend',  icon:'🪜', desc:'La road map del weekend: scaletta, quote a mano, accumulo', soloAdmin:true },
  { id:'utenti',      label:'Utenti',           icon:'◎', desc:'Gestione utenti e password', soloAdmin:true },
]

function TabBar({ active, onChange, isAdmin }) {
  // ⚠️ Stesso filtro del menu: senza, un utente normale vedrebbe il tasto Spin
  // e finirebbe su una pagina che la RLS gli svuota. Con tre tasti invece di
  // quattro la barra si ridistribuisce da sola (`flex:1`).
  const tabs = TABS_BASE.filter(t => !t.soloAdmin || isAdmin)
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
  const voci = VOCI_MENU.filter(v => !v.soloAdmin || isAdmin)
  return (
    <>
      {/* lo sfondo chiude il menu al tocco */}
      <div onClick={onChiudi} className="menu-sfondo" aria-hidden={!aperto} style={{
        position:'fixed', top:'var(--barra-alta)', left:0, right:0, bottom:0, zIndex:60,
        background:alpha(C.fondo, 0.7),
        opacity: aperto ? 1 : 0, pointerEvents: aperto ? 'auto' : 'none',
      }} />
      {/* Il pannello prende tutta l'altezza dello schermo: prima era un
          riquadro sotto il tasto, e l'ultima voce finiva tagliata. */}
      <div className="menu-pannello" style={{
        position:'fixed', top:'var(--barra-alta)', right:12, zIndex:70,
        width:'min(320px, calc(100vw - 24px))', display:'flex', flexDirection:'column',
        /* mai più alto dello spazio che resta sotto la testata: così l'ultima
           voce non può finire tagliata */
        maxHeight:'calc(100vh - var(--barra-alta) - 16px)',
        background:C.pannello, border:`1px solid ${C.bordo}`, borderRadius:'0 0 12px 12px',
        boxShadow:`0 16px 32px ${alpha(C.fondo, 0.85)}`,
        transformOrigin:'top right',
        transform: aperto ? 'translateY(0)' : 'translateY(-10px)',
        opacity: aperto ? 1 : 0,
        visibility: aperto ? 'visible' : 'hidden',
        pointerEvents: aperto ? 'auto' : 'none',
      }}>
        {/* le voci scorrono se un giorno saranno tante; il pannello no */}
        <div style={{ overflowY:'auto', padding:8 }}>
          {voci.map(v => {
            const on = v.id === attivo
            return (
              <button key={v.id} onClick={() => { onVai(v.id); onChiudi() }} style={{
                display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left',
                padding:'12px 12px', borderRadius:8, cursor:'pointer', border:'none', marginBottom:2,
                background: on ? alpha(C.oro, 0.1) : 'transparent',
                borderLeft:`3px solid ${on ? C.oro : 'transparent'}`,
              }}>
                <span style={{ fontSize:18, width:24, textAlign:'center', color: on ? C.oro : C.testo }}>{v.icon}</span>
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
        {/* Il contatore dello sviluppo: dice quale versione si ha davanti.
            Sta attaccato al nome perché è un dato del programma, non dell'utente. */}
        <span style={{
          fontSize:9, color:C.spento, fontFamily:F.mono, letterSpacing:'0.5px',
          border:`1px solid ${C.bordo}`, borderRadius:4, padding:'2px 4px', lineHeight:1,
        }}>{VERSIONE}</span>
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
        <button onClick={onMenu} aria-label="Menu" aria-expanded={menuAperto} style={{
          background: menuAperto ? alpha(C.oro, 0.12) : 'transparent',
          border:`1px solid ${menuAperto ? alpha(C.oro, 0.4) : C.bordo}`, borderRadius:6,
          cursor:'pointer', padding:'8px 9px', display:'flex', alignItems:'center', justifyContent:'center',
          transition:'background .2s ease, border-color .2s ease',
        }}>
          <span className={menuAperto ? 'icona-menu aperta' : 'icona-menu'}>
            {[0,1,2].map(i => <span key={i} style={{ background: menuAperto ? C.oro : C.testo }} />)}
          </span>
        </button>
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
      case 'votate':    return <VotatePage />
      case 'storico':   return <StoricoPage />
      case 'andamento': return <AndamentoPage />
      case 'importazioni': return <ImportazioniPage />
      case 'scalata': return <ScalataPage />
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
        {/* ⚠️ L'attesa è **una riga sola e discreta**, non uno scheletro:
            il pezzo di una pagina pesa 10-40 kB e arriva in un lampo sulla
            connessione di casa. Un'animazione che compare e sparisce in
            200 ms si legge come uno sfarfallio, non come un caricamento. */}
        <Suspense fallback={
          <div style={{ padding: 24, fontFamily: F.mono, fontSize: 11, color: C.spento }}>carico…</div>
        }>
          {renderPage()}
        </Suspense>
      </div>
      <TabBar active={tab} onChange={setTab} isAdmin={isAdmin} />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
