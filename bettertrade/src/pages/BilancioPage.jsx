import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../context/AuthContext'

const PERCENTUALI      = [5, 10, 15, 20, 25, 30]
const NUM_SLOT_OPTIONS = [1, 2, 3, 4]

function fmt(n) {
  const abs = Math.abs(n).toFixed(2)
  return n < 0 ? `-€${abs}` : `€${abs}`
}
function fmtPct(a, b) {
  if (!b || b === 0) return '—'
  const diff = ((a - b) / b * 100).toFixed(1)
  return diff > 0 ? `+${diff}%` : `${diff}%`
}

function StatCard({ label, value, sub, color, small }) {
  return (
    <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:small?18:22, fontWeight:700, color:color||'#e0d9d0', fontFamily:"'DM Mono',monospace", marginBottom:sub?3:0 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#555', fontFamily:"'DM Mono',monospace" }}>{sub}</div>}
    </div>
  )
}

export default function BilancioPage() {
  const {
    currentUser, users, fetchUsers,
    isSuperAdmin,
    pct, numSlot, savePct, saveNumSlot,
    getMyBase, getTotalBase, getTotalBankroll, calcSchedule,
  } = useAuth()

  const [storico, setStorico]     = useState([])
  const [showAddWeek, setShowAddWeek] = useState(false)
  const [newWeek, setNewWeek]     = useState({ label:'', importo:'' })
  const [loading, setLoading]     = useState(true)
  const [savingPct, setSavingPct] = useState(false)
  const [savingSlot, setSavingSlot] = useState(false)

  useEffect(() => {
    async function init() {
      await fetchUsers()
      if (currentUser) {
        const { data } = await supabase.from('giornate').select('*').eq('user_id', currentUser.id).order('created_at')
        if (data) setStorico(data)
      }
      setLoading(false)
    }
    init()
  }, [currentUser?.id])


  async function handleSavePct(val) {
    setSavingPct(true); await savePct(val); setSavingPct(false)
  }
  async function handleSaveNumSlot(val) {
    setSavingSlot(true); await saveNumSlot(val); setSavingSlot(false)
  }

  async function addWeekEntry() {
    if (!newWeek.label || newWeek.importo === '') return
    const importo = parseFloat(newWeek.importo)
    const { data } = await supabase.from('giornate').insert([{
      user_id: currentUser.id, data: newWeek.label,
      spins: [], tot_investito: 0, tot_incasso: importo > 0 ? importo : 0,
      tot_saldo: importo
    }]).select().single()
    if (data) setStorico(prev => [...prev, data])
    setNewWeek({ label:'', importo:'' }); setShowAddWeek(false)
  }
  async function removeWeekEntry(id) {
    await supabase.from('giornate').delete().eq('id', id)
    setStorico(prev => prev.filter(g => g.id !== id))
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#555', fontFamily:"'Sora',sans-serif" }}>Caricamento…</div>

  // Calcoli
  const myBase          = getMyBase()
  const totalBase       = getTotalBase()
  const totaleBankroll  = getTotalBankroll()
  const mySched         = calcSchedule(myBase)
  const totalSched      = calcSchedule(totalBase)

  const myBankroll      = currentUser?.bankroll || 0
  const myInizio        = currentUser?.bankroll_iniziale || myBankroll
  const myStorico       = storico
  const myTotaleStorico = myStorico.reduce((s, e) => s + (e.tot_saldo||0), 0)
  const myLive          = myInizio + myTotaleStorico
  const myDiff          = fmtPct(myLive, myInizio)
  const myDiffColor     = myLive >= myInizio ? '#22c55e' : '#ef4444'

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4, marginBottom:4 }}>BILANCIO</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", marginBottom:20 }}>
        {isSuperAdmin ? 'Vista SuperAdmin' : currentUser?.display_name || currentUser?.username}
      </div>

      {/* ── Selettore % ── */}
      <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
          % Bankroll da giocare {!isSuperAdmin && <span style={{ color:'#333' }}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {PERCENTUALI.map(p => (
            <button key={p} onClick={() => isSuperAdmin && handleSavePct(p)} style={{
              padding:'7px 14px', borderRadius:7, cursor:isSuperAdmin?'pointer':'default',
              fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600,
              background: pct===p?'rgba(201,168,76,0.18)':'transparent',
              border:`1px solid ${pct===p?'rgba(201,168,76,0.5)':'#1e1e1e'}`,
              color: pct===p?'#c9a84c':'#444',
              opacity: !isSuperAdmin && pct!==p ? 0.4 : 1,
            }}>{p}%</button>
          ))}
        </div>
        {savingPct && <div style={{ fontSize:10, color:'#555', fontFamily:"'DM Mono',monospace", marginTop:6 }}>Salvataggio…</div>}
      </div>

      {/* ── Selettore numero slot ── */}
      <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
          Slot da giocare {!isSuperAdmin && <span style={{ color:'#333' }}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {NUM_SLOT_OPTIONS.map(n => (
            <button key={n} onClick={() => isSuperAdmin && handleSaveNumSlot(n)} style={{
              flex:1, padding:'7px 8px', borderRadius:7, cursor:isSuperAdmin?'pointer':'default',
              fontFamily:"'DM Mono',monospace", fontSize:15, fontWeight:700,
              background: numSlot===n?'rgba(201,168,76,0.18)':'transparent',
              border:`1px solid ${numSlot===n?'rgba(201,168,76,0.5)':'#1e1e1e'}`,
              color: numSlot===n?'#c9a84c':'#444',
              opacity: !isSuperAdmin && numSlot!==n ? 0.4 : 1,
            }}>{n}</button>
          ))}
        </div>
        {savingSlot && <div style={{ fontSize:10, color:'#555', fontFamily:"'DM Mono',monospace", marginTop:6 }}>Salvataggio…</div>}
        {!savingSlot && (
          <div style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace", marginTop:8 }}>
            Base per slot: {isSuperAdmin ? fmt(totalBase) : fmt(myBase)}
          </div>
        )}
      </div>

      {/* ── Vista SuperAdmin: tabella ospiti ── */}
      {isSuperAdmin && (
        <>
          <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Settore ospiti</div>
          <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, overflow:'hidden', marginBottom:10 }}>
            {users.filter(u => u.role !== 'superadmin').map((u, i, arr) => {
              const uBase = ((u.bankroll||0) * (pct/100)) / numSlot
              const uSched = calcSchedule(uBase)
              return (
                <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom: i<arr.length-1?'1px solid #1a1a1a':'none' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{u.display_name||u.username}</div>
                    <div style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace" }}>
                      T:€{uSched.tris} · Q:€{uSched.quaterna} · F:€{uSched.full}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#c9a84c', fontFamily:"'DM Mono',monospace" }}>{fmt(u.bankroll||0)}</div>
                    <div style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace" }}>base {fmt(uBase)}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <StatCard label="Totale aggregato" value={fmt(totaleBankroll)} color="#c9a84c" />
            <StatCard label={`Base (${pct}% ÷ ${numSlot})`} value={fmt(totalBase)} color="#60a5fa" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'Tris ×5',    val:`€${totalSched.tris}`,     color:'#22c55e' },
              { label:'Quaterna ×2',val:`€${totalSched.quaterna}`, color:'#60a5fa' },
              { label:'Full ×1',    val:`€${totalSched.full}`,     color:'#c9a84c' },
            ].map(({label,val,color}) => <StatCard key={label} label={label} value={val} color={color} small />)}
          </div>
        </>
      )}

      {/* ── Vista utente: saldi personali ── */}
      {!isSuperAdmin && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <StatCard label="Inizio stagione" value={fmt(myInizio)} color="#e0d9d0" />
            <StatCard label="Saldo live"      value={fmt(myLive)}   color={myLive>=myInizio?'#22c55e':'#ef4444'} />
            <StatCard label="Variazione"      value={myDiff}        color={myDiffColor} />
            <StatCard label={`Base (${pct}% ÷ ${numSlot})`} value={fmt(myBase)} color="#60a5fa" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'Tris ×5',    val:`€${mySched.tris}`,     color:'#22c55e' },
              { label:'Quaterna ×2',val:`€${mySched.quaterna}`, color:'#60a5fa' },
              { label:'Full ×1',    val:`€${mySched.full}`,     color:'#c9a84c' },
            ].map(({label,val,color}) => <StatCard key={label} label={label} value={val} color={color} small />)}
          </div>
        </>
      )}

      {/* ── Storico settimanale ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em' }}>Storico settimanale</div>
        {isSuperAdmin && (
          <button onClick={() => setShowAddWeek(v=>!v)} style={{
            padding:'5px 12px', borderRadius:6, cursor:'pointer',
            fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:600,
            background: showAddWeek?'rgba(239,68,68,0.10)':'rgba(201,168,76,0.10)',
            border:`1px solid ${showAddWeek?'rgba(239,68,68,0.3)':'rgba(201,168,76,0.3)'}`,
            color: showAddWeek?'#ef4444':'#c9a84c',
          }}>
            {showAddWeek?'✕ Annulla':'+ Aggiungi'}
          </button>
        )}
      </div>

      {showAddWeek && isSuperAdmin && (
        <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:4 }}>ETICHETTA</div>
              <input style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 10px', color:'#e0d9d0', fontSize:13, fontFamily:"'Sora',sans-serif", outline:'none' }}
                placeholder="es. Week 1" value={newWeek.label} onChange={e=>setNewWeek(p=>({...p,label:e.target.value}))} />
            </div>
            <div>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:4 }}>IMPORTO €</div>
              <input type="number" step="0.01"
                style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:6, padding:'8px 10px', color:'#c9a84c', fontSize:13, fontFamily:"'DM Mono',monospace", outline:'none' }}
                placeholder="-25.00 o +80.00" value={newWeek.importo} onChange={e=>setNewWeek(p=>({...p,importo:e.target.value}))} />
            </div>
          </div>
          <button onClick={addWeekEntry} style={{ background:'#c9a84c', border:'none', borderRadius:7, padding:'9px 22px', color:'#090909', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
            Salva
          </button>
        </div>
      )}

      {myStorico.length === 0 ? (
        <div style={{ padding:'30px', textAlign:'center', color:'#333', fontSize:13, fontFamily:"'Sora',sans-serif", background:'#141414', border:'1px solid #1e1e1e', borderRadius:10 }}>
          Nessuna giornata registrata
        </div>
      ) : (
        <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, overflow:'hidden' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #1a1a1a', background:'#111' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#888', fontFamily:"'DM Mono',monospace" }}>TOTALE STAGIONE</span>
            <span style={{ fontSize:16, fontWeight:700, color:myTotaleStorico>=0?'#22c55e':'#ef4444', fontFamily:"'DM Mono',monospace" }}>
              {fmt(myTotaleStorico)}
            </span>
          </div>
          {[...myStorico].reverse().map((entry) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #181818' }}>
              <span style={{ fontSize:13, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{entry.data}</span>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:15, fontWeight:700, color:(entry.tot_saldo||0)>=0?'#22c55e':'#ef4444', fontFamily:"'DM Mono',monospace" }}>
                  {fmt(entry.tot_saldo||0, true)}
                </span>
                {isSuperAdmin && (
                  <button onClick={()=>removeWeekEntry(currentUser.id, myStorico.length-1-i)}
                    style={{ background:'transparent', border:'none', color:'#333', cursor:'pointer', fontSize:12, padding:2 }}>✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
