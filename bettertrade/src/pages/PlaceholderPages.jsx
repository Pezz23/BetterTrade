import { useAuth } from '../context/AuthContext'
// eslint-disable-next-line no-unused-vars

function Placeholder({ icon, title, description, badge }) {
  return (
    <div style={{ padding: '60px 24px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>{icon}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '12px' }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '22px', fontWeight: '600', color: '#e0d9d0' }}>{title}</h2>
        {badge && <span style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', fontSize: '11px',
          fontWeight: '500', padding: '3px 10px', borderRadius: '20px', fontFamily: "'DM Mono',monospace" }}>
          {badge}
        </span>}
      </div>
      <p style={{ fontFamily: "'Sora',sans-serif", fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{description}</p>
      <div style={{ marginTop: '24px', display: 'inline-block', background: '#111', border: '1px dashed #2a2a2a',
        borderRadius: '8px', padding: '10px 20px', fontSize: '12px', color: '#333', fontFamily: "'DM Mono',monospace" }}>
        In sviluppo
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { currentUser, getTotalBankroll, calcSchedule, isSuperAdmin } = useAuth()
  const total = getTotalBankroll()
  const sched = calcSchedule(total)

  return (
    <div style={{ padding: '32px 24px', maxWidth: '860px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: '22px', fontWeight: '600',
        color: '#e0d9d0', marginBottom: '6px' }}>Dashboard</h1>
      <p style={{ fontSize: '13px', color: '#555', fontFamily: "'Sora',sans-serif", marginBottom: '28px' }}>
        Benvenuto, {currentUser?.displayName || currentUser?.username}
      </p>

      {/* Bankroll cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <StatCard label="Il tuo bankroll" value={`€ ${(currentUser?.bankroll || 0).toFixed(2)}`} color="#c9a84c" />
        {isSuperAdmin && <StatCard label="Bankroll totale" value={`€ ${total.toFixed(2)}`} color="#60a5fa" />}
        <StatCard label="Puntata tris" value={`€ ${sched.tris}`} sub="× 5 schedine" color="#22c55e" />
        <StatCard label="Puntata quaterna" value={`€ ${sched.quaterna}`} sub="× 2 schedine" color="#22c55e" />
        <StatCard label="Puntata full" value={`€ ${sched.full}`} sub="1 schedina" color="#22c55e" />
      </div>

      <Placeholder icon="📊" title="Spin del giorno" description="Il riepilogo live della giornata apparirà qui: slot attiva, risultati in tempo reale e andamento." />
    </div>
  )
}

export function SlotPage({ partite = [], setPartite }) {
  // Griglia 3x3 semplificata per inserire le 9 partite
  // Ogni cella: { pos, casa, ospite, pronostico, quota, data, campionato }
  const { isAdmin } = useAuth()

  function updatePartita(pos, field, value) {
    if (!setPartite) return
    setPartite(prev => {
      const next = [...prev]
      const idx = pos - 1
      next[idx] = { ...next[idx], pos, [field]: value }
      return next
    })
  }

  function getP(pos) {
    return partite[pos - 1] || {}
  }

  const inputStyle = {
    background: '#0d0d0d', border: '1px solid #1e1e1e', borderRadius: 5,
    padding: '4px 7px', color: '#e0d9d0', fontSize: 12,
    fontFamily: "'Sora',sans-serif", outline: 'none', width: '100%',
  }
  const labelStyle = { fontSize: 10, color: '#444', fontFamily: "'DM Mono',monospace", marginBottom: 3, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 600, color: '#e0d9d0', marginBottom: 6 }}>Slot</h1>
      <p style={{ fontSize: 13, color: '#555', fontFamily: "'Sora',sans-serif", marginBottom: 28 }}>
        Inserisci le 9 partite della griglia. Le schedine vengono generate automaticamente nel tab Schedine.
      </p>

      {!isAdmin && (
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#60a5fa', fontFamily: "'Sora',sans-serif", marginBottom: 24 }}>
          Modalità lettura — solo Admin e SuperAdmin possono inserire le partite.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[1,2,3,4,5,6,7,8,9].map(pos => {
          const p = getP(pos)
          return (
            <div key={pos} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#c9a84c', fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>#{pos}</span>
                {p?.casa && <span style={{ fontSize: 10, color: '#444', fontFamily: "'DM Mono',monospace" }}>{p.campionato}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <label style={labelStyle}>Squadra Casa</label>
                  <input style={inputStyle} placeholder="es. Juventus" value={p.casa || ''} disabled={!isAdmin}
                    onChange={e => updatePartita(pos, 'casa', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Squadra Ospite</label>
                  <input style={inputStyle} placeholder="es. Milan" value={p.ospite || ''} disabled={!isAdmin}
                    onChange={e => updatePartita(pos, 'ospite', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <label style={labelStyle}>Pronostico</label>
                    <select style={{ ...inputStyle, cursor: isAdmin ? 'pointer' : 'default' }} value={p.pronostico || ''} disabled={!isAdmin}
                      onChange={e => updatePartita(pos, 'pronostico', e.target.value)}>
                      <option value="">-</option>
                      <option value="1">1</option>
                      <option value="X">X</option>
                      <option value="2">2</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Campionato</label>
                    <input style={inputStyle} placeholder="es. SPA 1" value={p.campionato || ''} disabled={!isAdmin}
                      onChange={e => updatePartita(pos, 'campionato', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Data/Ora (GG.MM. HH:MM)</label>
                  <input style={inputStyle} placeholder="10.04. 21:00" value={p.data || ''} disabled={!isAdmin}
                    onChange={e => updatePartita(pos, 'data', e.target.value)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ReportingPage() {
  return <Placeholder icon="📈" title="Reporting" description="Storico delle giornate. Puntate, incassi e saldo per ogni sessione." badge="In costruzione" />
}

export function BilancioPage() {
  return <Placeholder icon="💶" title="Bilancio" description="Riepilogo finanziario. Bankroll, versamenti, prelievi e andamento stagione." badge="In costruzione" />
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '16px 18px' }}>
      <p style={{ fontSize: '11px', color: '#555', fontFamily: "'Sora',sans-serif",
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: '600', color: color || '#e0d9d0',
        fontFamily: "'DM Mono',monospace", marginBottom: sub ? '4px' : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: '#444', fontFamily: "'Sora',sans-serif" }}>{sub}</p>}
    </div>
  )
}
