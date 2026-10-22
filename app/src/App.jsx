import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { C, F, alpha, S, SP, R } from './theme'
import Icona from './components/Icona'
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
const BetBuilderPage = lazy(() => import('./pages/BetBuilderPage'))
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

// ⚠️⚠️ **Una colonna sola per tutta l'app** (21/10/2026). Il contenuto era già
// incolonnato a 720, ma header e tab bar restavano larghi quanto la finestra:
// su un portatile il nome dell'utente finiva all'estremo destro, il logo
// all'estremo sinistro e la pagina in mezzo — **tre allineamenti diversi**, e
// quattro tasti larghi 320 px con la riga d'oro lunga un terzo di schermo.
// Su telefono non cambia niente, perché 375 è sotto il limite.
export const COLONNA = 720

// ── Tab bar bottom ────────────────────────────────────────────────────────────
// ⚠️ **Rifatta il 12/10/2026, scelta di Mattia**: in basso stanno le pagine del
// giro settimanale — si guardano le partite, si compila la spin, si gioca.
// Reporting e Bilancio sono passati nel menu: si aprono a giornata chiusa, non
// mentre si decide.
// ⚠️ `soloAdmin` qui **non basta a nascondere**: la TabBar va filtrata come il
// menu, altrimenti un utente normale vede un tasto che non può usare. La
// protezione vera resta la policy RLS.
// ⚠️ `icona` è un nome del set in `components/Icona.jsx`, non un carattere:
// un'emoji non obbedisce al colore, quindi i tasti spenti sembravano accesi.
// ⚠️ **Spin è scesa nel menu e Road to weekend è salita qui** (scelta di
// Mattia, 21/10/2026): la scalata è diventata il giro settimanale, la spin
// provvisoria si guarda più di rado.
// ⚠️ L'etichetta in basso è **WEEKEND** e non "Road to weekend": i tasti sono
// a 9px e il nome intero misura 96px contro i ~90 disponibili su un telefono
// da 375. È la stessa ragione per cui Spin non si chiamava "Spin provvisorie".
const TABS_BASE = [
  { id:'dashboard',   label:'Dashboard', icona:'dashboard' },
  // ⚠️ **Slot è scesa nel menu il 22/10/2026** e al suo posto c'è il Bet
  // Builder: la griglia si compila una volta a settimana, la schedina a quota
  // obiettivo si costruisce ogni volta che si gioca. In basso sta il **giro
  // settimanale**, non l'importanza.
  { id:'builder',     label:'Builder',   icona:'schedina' },
  // ⚠️ **Weekend non è più soloAdmin** (Mattia, 22/10/2026): la road map del
  // weekend la guardano tutti, e dal 22/10 `sql/34` apre la lettura delle
  // tabelle della scalata. A scrivere resta solo chi è admin, e il controllo
  // è nelle policy — qui si decide solo chi vede il tasto.
  { id:'scalata',     label:'Weekend',   icona:'scalata' },
  // ⚠️ `colore` lo porta **solo l'icona**, non l'etichetta (scelta di Mattia):
  // il campo è verde, la scritta resta oro da accesa e spenta da spenta come
  // gli altri tre tasti. È il verde del tema — quello delle vincite — non una
  // tinta nuova.
  { id:'partite',     label:'Partite',   icona:'partite', colore:C.verde },
]
// Il menu ad hamburger: tutto quello che non sta nei tasti in basso.
// `soloAdmin` nasconde la voce, ma la protezione vera è la policy RLS.
// ⚠️ **L'ordine è quello chiesto da Mattia il 21/10/2026**, e non è alfabetico
// né per importanza: Andamento in cima perché è quella che apre più spesso.
// Non riordinarlo "per pulizia".
const VOCI_MENU = [
  { id:'andamento',   label:'Andamento',        icona:'andamento', desc:'Quale indicatore ci azzecca, giorno per giorno' },
  { id:'votate',      label:'Partite votate',   icona:'stella', desc:'Quelle con la stellina: entrano nella spin comunque' },
  { id:'storico',     label:'Storico',          icona:'storico', desc:'L\'archivio e come stanno andando le proposte' },
  // ⚠️ Scesa dalla barra in basso il 21/10/2026, dove ha preso il suo posto
  // Road to weekend.
  { id:'slot',        label:'Slot',             icona:'slot', desc:'La griglia delle quattro spin', soloAdmin:true },
  { id:'provvisorie', label:'Spin',             icona:'spin', desc:'Le spin provvisorie: le candidate di questo weekend', soloAdmin:true },
  { id:'reporting',   label:'Reporting',        icona:'reporting', desc:'Le giornate registrate, per persona e per settimana' },
  { id:'bilancio',    label:'Bilancio',         icona:'bilancio', desc:'Saldi, movimenti e bankroll del gruppo' },
  { id:'utenti',      label:'Utenti',           icona:'utenti', desc:'Gestione utenti e password', soloAdmin:true },
  { id:'importazioni',label:'Importazioni',     icona:'importazioni', desc:'Partite da ESPN che non si agganciano da sole' },
]

/**
 * ⚠️⚠️ **Quanto spazio resta sotto l'etichetta della tab bar.** Non è una
 * spaziatura come le altre, ed è il motivo per cui non viene da `SP`: è la
 * **distanza dei bersagli dal bordo inferiore dell'iPhone**, dove stanno
 * l'indicatore Home e la risalita di sistema. Mattia l'ha alzata due volte il
 * 22/10/2026 (*"rischio di attivare Siri quando clicco"*, poi *"è ancora
 * troppo bassa"*): 6 → 12 → 20.
 * ⚠️ Chi la ritocca ritocchi anche `--barra-bassa` in `index.css`: quello è lo
 * spazio che le pagine lasciano sotto, e se resta indietro le ultime righe
 * finiscono sotto la barra.
 */
const SOTTO_BARRA = 20

function TabBar({ active, onChange, isAdmin }) {
  // ⚠️ Stesso filtro del menu: senza, un utente normale vedrebbe il tasto Spin
  // e finirebbe su una pagina che la RLS gli svuota. Con tre tasti invece di
  // quattro la barra si ridistribuisce da sola (`flex:1`).
  const tabs = TABS_BASE.filter(t => !t.soloAdmin || isAdmin)
  return (
    <div style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:100,
      background:C.barra,
      borderTop:`1px solid ${C.bordoRiga}`,
      paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      <div style={{ display:'flex', width:'100%', maxWidth:COLONNA, margin:'0 auto' }}>
      {tabs.map(t => {
        const on = t.id === active
        return (
          <button key={t.id} onClick={()=>onChange(t.id)} aria-current={on ? 'page' : undefined} style={{
            // ⚠️⚠️ **Più alta del 15% e con il riempimento sbilanciato in
            // basso** (Mattia, 22/10/2026: *"è troppo bassa e rischio di
            // attivare Siri su iPhone quando clicco"*). Non è una questione di
            // estetica: sul bordo inferiore dell'iPhone ci sono l'indicatore
            // Home e la risalita di sistema, e un bersaglio appoggiato lì
            // prende il gesto del telefono invece del tocco. Quindi i pixel in
            // più vanno **sotto** l'etichetta — spingere il bersaglio in alto è
            // tutto il senso della modifica — e `SP.ml` sotto contro `SP.l`
            // sopra viene da lì, non da uno sbaglio.
            // ⚠️ Entrambi dalla scala di `theme.js`: una misura scritta a mano
            // qui si allontanerebbe dal resto al primo ritocco.
            flex:1, padding:`${SP.l}px 2px ${SOTTO_BARRA}px`, background:'transparent', border:'none',
            // ⚠️ La riga d'oro sta SOPRA il tasto e c'è sempre, trasparente da
            // spenta: se comparisse solo da accesa, i 2px sposterebbero di
            // altrettanto l'icona di tutti gli altri tasti a ogni cambio pagina.
            borderTop:`2px solid ${on?C.oro:'transparent'}`,
            color: on?C.oro:C.inattivo,
            fontFamily:F.mono, fontSize:S.micro, letterSpacing:1,
            cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:SP.xs,
          }}>
            <span style={{ display:'flex', color: t.colore ?? 'inherit' }}>
              <Icona nome={t.icona} misura={S.icona} />
            </span>
            {t.label.toUpperCase()}
          </button>
        )
      })}
      </div>
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
        /* ⚠️ Ancorato alla **colonna**, non alla finestra: su un portatile
           il pannello si apriva a un palmo di distanza dal tasto che lo apre. */
        position:'fixed', top:'var(--barra-alta)', zIndex:70,
        right:`max(12px, calc(50vw - ${COLONNA / 2}px + 12px))`,
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
              <button key={v.id} onClick={() => { onVai(v.id); onChiudi() }} aria-current={on ? 'page' : undefined} style={{
                display:'flex', alignItems:'center', gap:SP.xl, width:'100%', textAlign:'left',
                padding:`${SP.l}px ${SP.xl}px`, borderRadius:R.g, cursor:'pointer', border:'none', marginBottom:2,
                background: on ? alpha(C.oro, 0.1) : 'transparent',
                // il filo a sinistra dice quale pagina si sta guardando; da
                // spento è trasparente, così le voci restano incolonnate
                borderLeft:`3px solid ${on ? C.oro : 'transparent'}`,
              }}>
                {/* ⚠️ Spenta l'icona è `spento` e non `testo`: alla stessa
                    intensità del titolo rubava l'occhio al nome della pagina. */}
                <span style={{ display:'flex', color: on ? C.oro : C.spento }}><Icona nome={v.icona} misura={20} /></span>
                <span style={{ minWidth:0 }}>
                  <div style={{ fontSize:S.grande, fontWeight:600, color: on ? C.oro : C.testo, fontFamily:F.sans }}>{v.label}</div>
                  <div style={{ fontSize:S.minuta, color:C.spento, fontFamily:F.sans, lineHeight:1.4 }}>{v.desc}</div>
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
    <div style={{
      background:C.barra, borderBottom:`1px solid ${C.bordoRiga}`,
      position:'sticky', top:0, zIndex:50,
    }}>
      <div style={{
        width:'100%', maxWidth:COLONNA, margin:'0 auto',
        padding:`${SP.m}px ${SP.xxl}px`, display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:SP.m, minWidth:0 }}>
        <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
          <rect x="2" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
          <rect x="16" y="2" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
          <rect x="2" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".5"/>
          <rect x="16" y="16" width="10" height="10" rx="2" fill={C.oro} opacity=".9"/>
        </svg>
        <span style={{ fontSize:S.grande, fontWeight:700, color:C.testo, fontFamily:F.sans, letterSpacing:'-0.3px' }}>BetterTrade</span>
        {/* Il contatore dello sviluppo: dice quale versione si ha davanti.
            Sta attaccato al nome perché è un dato del programma, non dell'utente.
            ⚠️ Il bordo è `bordoTenue` e non `bordo`: il testo resta leggibile
            (6,97:1) ma la targhetta smette di sembrare un tasto. */}
        <span style={{
          fontSize:S.micro, color:C.spento, fontFamily:F.mono, letterSpacing:'0.5px',
          border:`1px solid ${C.bordoTenue}`, borderRadius:R.s, padding:'2px 4px', lineHeight:1,
        }}>{VERSIONE}</span>
      </div>
      {/* ⚠️⚠️ **L'ordine qui è una correzione di gerarchia (21/10/2026).**
          Prima ESCI era il pezzo più luminoso di tutta l'app — fondo e bordo
          d'oro — mentre il menu, che si tocca dieci volte al giorno, era
          trasparente: il gesto più raro e meno reversibile gridava più di
          quello ordinario, e stava anche **a sinistra del nome**, cioè nel
          punto dove di solito c'è l'identità e non un comando.
          Adesso: prima chi sei, poi i due tasti, e l'oro è solo del menu
          aperto. ESCI resta raggiungibile, smette di essere invitante. */}
      <div style={{ display:'flex', alignItems:'center', gap:SP.m, minWidth:0 }}>
        <div style={{ textAlign:'right', minWidth:0 }}>
          <div style={{ fontSize:S.base, fontWeight:600, color:C.testo, fontFamily:F.sans, lineHeight:1.2,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {currentUser?.display_name||currentUser?.username}
          </div>
          <div style={{ fontSize:S.micro, color:rc, fontFamily:F.mono }}>{roleLabel[currentUser?.role]}</div>
        </div>
        <button onClick={onLogout} title="Esci" aria-label="Esci" style={{
          width:32, height:32, borderRadius:R.m, background:'transparent', border:`1px solid ${C.bordo}`,
          display:'flex', alignItems:'center', justifyContent:'center', color:C.spento, cursor:'pointer', padding:0,
        }}><Icona nome="esci" misura={16} /></button>
        <button onClick={onMenu} aria-label="Menu" aria-expanded={menuAperto} style={{
          width:32, height:32, borderRadius:R.m,
          background: menuAperto ? alpha(C.oro, 0.12) : 'transparent',
          border:`1px solid ${menuAperto ? alpha(C.oro, 0.4) : C.bordo}`,
          cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center',
          transition:'background .2s ease, border-color .2s ease',
        }}>
          <span className={menuAperto ? 'icona-menu aperta' : 'icona-menu'}>
            {[0,1,2].map(i => <span key={i} style={{ background: menuAperto ? C.oro : C.testo }} />)}
          </span>
        </button>
      </div>
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
                  color:C.inattivo, fontFamily:F.mono, fontSize:S.corpo, letterSpacing:2 }}>
      CARICAMENTO…
    </div>
  )
  if (!currentUser) return <LoginPage />

  function renderPage() {
    switch(tab) {
      case 'dashboard': return <DashboardPage />
      case 'slot':      return <SlotPage />
      case 'builder':   return <BetBuilderPage />
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
        flex:1, width:'100%', maxWidth:COLONNA, margin:'0 auto',
        paddingBottom:'var(--barra-bassa)',
      }}>
        {/* ⚠️ L'attesa è **una riga sola e discreta**, non uno scheletro:
            il pezzo di una pagina pesa 10-40 kB e arriva in un lampo sulla
            connessione di casa. Un'animazione che compare e sparisce in
            200 ms si legge come uno sfarfallio, non come un caricamento. */}
        <Suspense fallback={
          <div style={{ padding: 24, fontFamily: F.mono, fontSize: S.base, color: C.spento }}>carico…</div>
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
