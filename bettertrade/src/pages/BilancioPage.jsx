import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const PERCENTUALI = [5, 10, 15, 20, 25, 30]
const NUM_SLOT_OPTIONS = [1, 2, 3, 4]
const STORAGE_KEY_STORICO = 'bt_storico'

function loadStorico() {
  try { const s = localStorage.getItem(STORAGE_KEY_STORICO); return s ? JSON.parse(s) : {} }
  catch { return {} }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  const abs = Math.abs(n).toFixed(2)
  return n < 0 ? `-€${abs}` : `€${abs}`
}
function fmtPct(a, b) {
  if (!b || b === 0) return '—'
  const diff = ((a - b) / b * 100).toFixed(1)
  return diff > 0 ? `+${diff}%` : `${diff}%`
}

// ── Card statistica ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, small }) {
  return (
    <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize: small?18:22, fontWeight:700, color: color||'#e0d9d0', fontFamily:"'DM Mono',monospace", marginBottom: sub?3:0 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#555', fontFamily:"'DM Mono',monospace" }}>{sub}</div>}
    </div>
  )
}

export default function BilancioPage() {
  const { currentUser, users, fetchUsers, isSuperAdmin, getTotalBankroll } = useAuth()
  const [pct, setPct]           = useState(10)
  const [savingPct, setSavingPct] = useState(false)
  const [numSlot, setNumSlot] = useState(1)
  const [savingSlot, setSavingSlot] = useState(false)
  const [storico, setStorico]   = useState(loadStorico)
  const [showAddWeek, setShowAddWeek] = useState(false)
  const [newWeek, setNewWeek]   = useState({ label:'', importo:'' })
  const [loading, setLoading]   = useState(true)

  // Carica % e utenti da Supabase
  useEffect(() => {
    async function init() {
      await fetchUsers()
      const { data } = await supabase.from('impostazioni').select('percentuale_gioco').eq('id', 1).single()
      if (data) { setPct(data.percentuale_gioco); setNumSlot(data.num_slot || 1) }
      setLoading(false)
    }
    init()
  }, [])

  async function savePct(val) {
    setSavingPct(true)
    await supabase.from('impostazioni').update({ percentuale_gioco: val }).eq('id', 1)
    setPct(val)
    setSavingPct(false)
  }

  async function saveNumSlot(val) {
    setSavingSlot(true)
    await supabase.from('impostazioni').update({ num_slot: val }).eq('id', 1)
    setNumSlot(val)
    setSavingSlot(false)
  }

  function saveStorico(s) {
    setStorico(s)
    localStorage.setItem(STORAGE_KEY_STORICO, JSON.stringify(s))
  }

  function addWeekEntry() {
    if (!newWeek.label || newWeek.importo === '') return
    const userId = currentUser.id
    const current = storico[userId] || []
    const updated = { ...storico, [userId]: [...current, { label: newWeek.label, importo: parseFloat(newWeek.importo) }] }
    saveStorico(updated)
    setNewWeek({ label:'', importo:'' })
    setShowAddWeek(false)
  }

  function removeWeekEntry(userId, idx) {
    const current = storico[userId] || []
    const updated = { ...storico, [userId]: current.filter((_,i) => i !== idx) }
    saveStorico(updated)
  }

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'#555', fontFamily:"'Sora',sans-serif" }}>Caricamento…</div>
  )

  // Calcoli utente corrente
  const myBankroll      = currentUser?.bankroll || 0
  const myInizio        = currentUser?.bankroll_iniziale || myBankroll
  const myBase          = (myBankroll * (pct / 100)) / numSlot
  const myStorico       = storico[currentUser?.id] || []
  const myTotaleStorico = myStorico.reduce((s, e) => s + e.importo, 0)
  const myLive          = myInizio + myTotaleStorico
  const myDiff          = fmtPct(myLive, myInizio)
  const myDiffColor     = myLive >= myInizio ? '#22c55e' : '#ef4444'

  // Totale aggregato SuperAdmin
  const totaleBankroll  = getTotalBankroll()
  const totaleBase      = (totaleBankroll * (pct / 100)) / numSlot

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4, marginBottom:4 }}>BILANCIO</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", marginBottom:20 }}>
        {isSuperAdmin ? 'Vista SuperAdmin' : currentUser?.display_name || currentUser?.username}
      </div>

      {/* ── Selettore % ─────────────────────────────────────────────────── */}
      <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
          % Bankroll da giocare {!isSuperAdmin && '(impostata da SuperAdmin)'}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {PERCENTUALI.map(p => (
            <button key={p} onClick={() => isSuperAdmin && savePct(p)}
              style={{
                padding:'7px 14px', borderRadius:7, cursor: isSuperAdmin?'pointer':'default',
                fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600,
                background: pct===p ? 'rgba(201,168,76,0.18)' : 'transparent',
                border: `1px solid ${pct===p ? 'rgba(201,168,76,0.5)' : '#1e1e1e'}`,
                color: pct===p ? '#c9a84c' : '#444',
                opacity: !isSuperAdmin && pct!==p ? 0.4 : 1,
              }}>
              {p}%
            </button>
          ))}
        </div>
        {savingPct && <div style={{ fontSize:11, color:'#555', fontFamily:"'DM Mono',monospace", marginTop:8 }}>Salvataggio…</div>}
      </div>

      {/* Selettore numero slot */}
      <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
          Numero slot da giocare {!isSuperAdmin && '(impostato da SuperAdmin)'}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {NUM_SLOT_OPTIONS.map(n => (
            <button key={n} onClick={() => isSuperAdmin && saveNumSlot(n)}
              style={{
                flex:1, padding:'7px 8px', borderRadius:7, cursor: isSuperAdmin?'pointer':'default',
                fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700,
                background: numSlot===n ? 'rgba(201,168,76,0.18)' : 'transparent',
                border: `1px solid ${numSlot===n ? 'rgba(201,168,76,0.5)' : '#1e1e1e'}`,
                color: numSlot===n ? '#c9a84c' : '#444',
                opacity: !isSuperAdmin && numSlot!==n ? 0.4 : 1,
              }}>
              {n}
            </button>
          ))}
        </div>
        {savingSlot && <div style={{ fontSize:11, color:'#555', fontFamily:"'DM Mono',monospace", marginTop:8 }}>Salvataggio…</div>}
        {!savingSlot && (
          <div style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace", marginTop:8 }}>
            Base per slot: {isSuperAdmin ? `€${((totaleBankroll*(pct/100))/numSlot).toFixed(2)}` : `€${((myBankroll*(pct/100))/numSlot).toFixed(2)}`}
          </div>
        )}
      </div>

      {/* ── Vista SuperAdmin: tabella ospiti ────────────────────────────── */}
      {isSuperAdmin && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
            Settore ospiti
          </div>
          <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
            {users.filter(u => u.role !== 'superadmin').map((u, i, arr) => (
              <div key={u.id} style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'12px 16px',
                borderBottom: i < arr.length-1 ? '1px solid #1a1a1a' : 'none',
              }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{u.display_name||u.username}</div>
                  <div style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace" }}>base: {fmt(u.bankroll * (pct/100))}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:16, fontWeight:700, color:'#c9a84c', fontFamily:"'DM Mono',monospace" }}>{fmt(u.bankroll||0)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totali aggregati */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <StatCard label="Totale aggregato" value={fmt(totaleBankroll)} color="#c9a84c" />
            <StatCard label={`Base da giocare (${pct}%)`} value={fmt(totaleBase)} color="#60a5fa" />
          </div>

          {/* Riepilogo puntate aggregate */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'Tris ×5',    val: fmt(Math.floor(totaleBase*0.77/5)),    color:'#22c55e' },
              { label:'Quaterna ×2',val: fmt(Math.floor(totaleBase*0.19/2)),    color:'#60a5fa' },
              { label:'Full ×1',    val: fmt(Math.floor(totaleBase*0.04)),      color:'#c9a84c' },
            ].map(({label,val,color}) => (
              <StatCard key={label} label={label} value={val} color={color} small />
            ))}
          </div>
        </div>
      )}

      {/* ── Vista utente: saldi personali ───────────────────────────────── */}
      {!isSuperAdmin && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <StatCard label="Saldo inizio stagione" value={fmt(myInizio)} color="#e0d9d0" />
          <StatCard label="Saldo live"            value={fmt(myLive)}   color={myLive >= myInizio ? '#22c55e' : '#ef4444'} />
          <StatCard label="Variazione stagione"   value={myDiff}        color={myDiffColor} />
          <StatCard label={`Base da giocare (${pct}%)`} value={fmt(myBase)} color="#60a5fa" />
        </div>
      )}

      {/* ── Puntate personali ───────────────────────────────────────────── */}
      {!isSuperAdmin && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Tris ×5',    val: fmt(Math.floor(myBase*0.77/5)),  color:'#22c55e' },
            { label:'Quaterna ×2',val: fmt(Math.floor(myBase*0.19/2)),  color:'#60a5fa' },
            { label:'Full ×1',    val: fmt(Math.floor(myBase*0.04)),    color:'#c9a84c' },
          ].map(({label,val,color}) => (
            <StatCard key={label} label={label} value={val} color={color} small />
          ))}
        </div>
      )}

      {/* ── Storico settimanale ─────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em' }}>Storico settimanale</div>
        {isSuperAdmin && (
          <button onClick={() => setShowAddWeek(v=>!v)} style={{
            padding:'5px 12px', borderRadius:6, cursor:'pointer',
            fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:600,
            background: showAddWeek?'rgba(239,68,68,0.10)':'rgba(201,168,76,0.10)',
            border: `1px solid ${showAddWeek?'rgba(239,68,68,0.3)':'rgba(201,168,76,0.3)'}`,
            color: showAddWeek?'#ef4444':'#c9a84c',
          }}>
            {showAddWeek ? '✕ Annulla' : '+ Aggiungi'}
          </button>
        )}
      </div>

      {/* Form aggiungi settimana */}
      {showAddWeek && isSuperAdmin && (
        <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:4 }}>ETICHETTA</div>
              <input
                style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 10px', color:'#e0d9d0', fontSize:13, fontFamily:"'Sora',sans-serif", outline:'none' }}
                placeholder="es. Week 1" value={newWeek.label}
                onChange={e => setNewWeek(p=>({...p,label:e.target.value}))} />
            </div>
            <div>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:4 }}>IMPORTO €</div>
              <input
                type="number" step="0.01"
                style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 10px', color:'#c9a84c', fontSize:13, fontFamily:"'DM Mono',monospace", outline:'none' }}
                placeholder="es. -25.00 o +80.00" value={newWeek.importo}
                onChange={e => setNewWeek(p=>({...p,importo:e.target.value}))} />
            </div>
          </div>
          <button onClick={addWeekEntry} style={{
            background:'#c9a84c', border:'none', borderRadius:7, padding:'9px 22px',
            color:'#090909', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif",
          }}>
            Salva
          </button>
        </div>
      )}

      {/* Lista storico */}
      {myStorico.length === 0 ? (
        <div style={{ padding:'30px', textAlign:'center', color:'#333', fontSize:13, fontFamily:"'Sora',sans-serif", background:'#141414', border:'1px solid #1e1e1e', borderRadius:10 }}>
          Nessuna giornata registrata
        </div>
      ) : (
        <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, overflow:'hidden' }}>
          {/* Totale */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #1a1a1a', background:'#111' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#888', fontFamily:"'DM Mono',monospace" }}>TOTALE STAGIONE</span>
            <span style={{ fontSize:16, fontWeight:700, color: myTotaleStorico>=0?'#22c55e':'#ef4444', fontFamily:"'DM Mono',monospace" }}>
              {fmt(myTotaleStorico)}
            </span>
          </div>
          {/* Righe */}
          {[...myStorico].reverse().map((entry, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #181818' }}>
              <span style={{ fontSize:13, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{entry.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:15, fontWeight:700, color: entry.importo>=0?'#22c55e':'#ef4444', fontFamily:"'DM Mono',monospace" }}>
                  {fmt(entry.importo)}
                </span>
                {isSuperAdmin && (
                  <button onClick={() => removeWeekEntry(currentUser.id, myStorico.length-1-i)} style={{
                    background:'transparent', border:'none', color:'#333', cursor:'pointer', fontSize:12, padding:2,
                  }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
