import { useAuth } from '../context/AuthContext'

function Placeholder({ icon, title, desc }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'55vh', gap:14, textAlign:'center', padding:'40px 24px' }}>
      <div style={{ fontSize:44 }}>{icon}</div>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4 }}>COMING SOON</div>
      <div style={{ fontSize:22, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{title}</div>
      <div style={{ fontSize:13, color:'#444', maxWidth:300, lineHeight:1.7, fontFamily:"'Sora',sans-serif" }}>{desc}</div>
      <div style={{ padding:'5px 16px', borderRadius:20, border:'1px solid #1e1e1e', fontSize:10, color:'#333', fontFamily:"'DM Mono',monospace", letterSpacing:1 }}>In sviluppo</div>
    </div>
  )
}

export function DashboardPage() {
  const { currentUser, getTotalBankroll, calcSchedule, isSuperAdmin } = useAuth()
  const total = getTotalBankroll()
  const sched = calcSchedule(total)
  const isWip = total === 0

  return (
    <div style={{ padding:'20px 16px' }}>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4, marginBottom:4 }}>DASHBOARD</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", marginBottom:18 }}>
        Ciao, {currentUser?.display_name || currentUser?.username} 👋
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:10 }}>
        <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px' }}>
          <div style={{ fontSize:10, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:6 }}>IL TUO BANKROLL</div>
          <div style={{ fontSize:22, fontWeight:700, color:'#c9a84c', fontFamily:"'DM Mono',monospace" }}>€{(currentUser?.bankroll||0).toFixed(2)}</div>
        </div>
        {isSuperAdmin && (
          <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontSize:10, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:6 }}>BANKROLL TOTALE</div>
            <div style={{ fontSize:22, fontWeight:700, color:'#60a5fa', fontFamily:"'DM Mono',monospace" }}>
              {isWip ? <span style={{ color:'#f59e0b', fontSize:14 }}>WIP — nessun utente</span> : `€${total.toFixed(2)}`}
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {[
          {label:'Tris (×5)', val: isWip?'WIP':`€${sched.tris}`, color:'#22c55e'},
          {label:'Quaterna (×2)', val: isWip?'WIP':`€${sched.quaterna}`, color:'#60a5fa'},
          {label:'Full (×1)', val: isWip?'WIP':`€${sched.full}`, color:'#c9a84c'},
        ].map(({label,val,color})=>(
          <div key={label} style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'12px' }}>
            <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:5 }}>{label}</div>
            <div style={{ fontSize:16, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      <Placeholder icon="📊" title="Spin del giorno" desc="Il riepilogo live apparirà qui: spin attiva, risultati in tempo reale." />
    </div>
  )
}

export function ReportingPage() {
  return <Placeholder icon="📈" title="Reporting" desc="Storico giornate. Puntate, incassi e saldo per ogni sessione." />
}

// BilancioPage spostata in BilancioPage.jsx
