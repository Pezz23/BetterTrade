import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const COMBOS = [
  { id:1, nome:'Tris 1-2-3',       tipo:'tris',    pos:[1,2,3]              },
  { id:2, nome:'Tris 4-5-6',       tipo:'tris',    pos:[4,5,6]              },
  { id:3, nome:'Tris 7-8-9',       tipo:'tris',    pos:[7,8,9]              },
  { id:4, nome:'Tris 1-5-9',       tipo:'tris',    pos:[1,5,9]              },
  { id:5, nome:'Tris 7-5-3',       tipo:'tris',    pos:[7,5,3]              },
  { id:6, nome:'Quaterna 1-3-7-9', tipo:'quaterna',pos:[1,3,7,9]            },
  { id:7, nome:'Quaterna 2-4-6-8', tipo:'quaterna',pos:[2,4,6,8]            },
  { id:8, nome:'Full 1→9',         tipo:'full',    pos:[1,2,3,4,5,6,7,8,9] },
]

const SPIN_LABELS = ['Spin 1','Spin 2','Spin 3','Spin 4']
const STORAGE_KEY = 'bt_spins'
const TIPO_COLOR  = { tris:'#22c55e', quaterna:'#60a5fa', full:'#c9a84c' }
const TIPO_BG     = { tris:'rgba(34,197,94,0.10)', quaterna:'rgba(59,130,246,0.10)', full:'rgba(201,168,76,0.10)' }

function emptyTiles() {
  return Array.from({length:9},(_,i)=>({ id:i+1, casa:'', ospite:'', pronostico:'', quota:'', data:'', result:'' }))
}
function emptySpins() { return [0,1,2,3].map(()=>emptyTiles()) }
function loadSpins() {
  try { const s=localStorage.getItem(STORAGE_KEY); return s?JSON.parse(s):emptySpins() }
  catch { return emptySpins() }
}
function saveSpins(spins) {
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(spins)) } catch {}
}
function isOggi(dataStr) {
  if (!dataStr) return false
  const m = dataStr.trim().match(/^(\d{1,2})[\/\.](\d{2})/)
  if (!m) return false
  const oggi = new Date()
  return parseInt(m[1])===oggi.getDate() && parseInt(m[2])===(oggi.getMonth()+1)
}
function comboStatus(tiles, pos) {
  const rel = tiles.filter(t=>pos.includes(t.id))
  if (rel.some(t=>t.result==='loss')) return 'loss'
  if (rel.every(t=>t.result==='win')) return 'win'
  return 'pending'
}
function comboOdds(tiles, pos) {
  return pos.reduce((a,p)=>{ const q=parseFloat(tiles.find(t=>t.id===p)?.quota); return a*(isNaN(q)?1:q) },1)
}

// Stile celle input/select
const cell = (extra={}) => ({
  background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:5,
  padding:'5px 6px', color:'#e0d9d0', fontSize:12,
  fontFamily:"'Sora',sans-serif", outline:'none', width:'100%', ...extra
})

// ── Tabella Griglia ───────────────────────────────────────────────────────────
// Colonne: Pron. | Casa | - | Ospite | Quota | Data | Ris.
// gridTemplateColumns: 46px 1fr 12px 1fr 52px 54px 80px
function TabellaGriglia({ tiles, isAdmin, onUpdate, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false)
  const COLS = '46px 1fr 12px 1fr 52px 54px 80px'

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); setTimeout(()=>setConfirmReset(false),3000); return }
    onReset(); setConfirmReset(false)
  }

  return (
    <div>
      {!isAdmin && (
        <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#60a5fa', fontFamily:"'Sora',sans-serif", marginBottom:12 }}>
          Modalità lettura
        </div>
      )}

      {/* Header */}
      <div style={{ display:'grid', gridTemplateColumns:COLS, gap:4, padding:'0 2px', marginBottom:4 }}>
        {['Pron.','Casa','','Ospite','Quota','Data','Ris.'].map((h,i)=>(
          <div key={i} style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', textAlign:'center', padding:'4px 0' }}>{h}</div>
        ))}
      </div>

      {/* Righe */}
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {tiles.map(t => {
          const isW = t.result==='win'
          const isL = t.result==='loss'
          const oggi = isOggi(t.data)
          return (
            <div key={t.id} style={{
              display:'grid', gridTemplateColumns:COLS, gap:4, alignItems:'center', padding:'3px 2px',
              background: isW?'rgba(34,197,94,0.07)':isL?'rgba(239,68,68,0.07)':'#141414',
              border:`1px solid ${isW?'rgba(34,197,94,0.22)':isL?'rgba(239,68,68,0.22)':'#1a1a1a'}`,
              borderRadius:7,
            }}>

              {/* Pronostico */}
              <select style={cell({ color:'#c9a84c', fontFamily:"'DM Mono',monospace", textAlign:'center', padding:'5px 2px' })}
                value={t.pronostico} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'pronostico',e.target.value)}>
                <option value="">-</option>
                <option value="1">1</option>
                <option value="X">X</option>
                <option value="2">2</option>
              </select>

              {/* Casa */}
              <input style={cell()} placeholder="Casa" value={t.casa} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'casa',e.target.value)} />

              {/* Separatore */}
              <div style={{ fontSize:10, color:'#333', textAlign:'center', fontFamily:"'DM Mono',monospace" }}>-</div>

              {/* Ospite */}
              <input style={cell()} placeholder="Ospite" value={t.ospite} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'ospite',e.target.value)} />

              {/* Quota */}
              <input style={cell({ textAlign:'center', color:'#c9a84c', padding:'5px 4px' })}
                type="number" step="0.01" min="1" placeholder="@"
                value={t.quota} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'quota',e.target.value)} />

              {/* Data gg/mm */}
              <input style={cell({ textAlign:'center', color: oggi?'#f59e0b':'#e0d9d0', fontSize:11, padding:'5px 3px' })}
                placeholder="gg/mm" value={t.data} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'data',e.target.value)} />

              {/* Risultato — menu a tendina */}
              <select style={cell({
                color: t.result==='win'?'#22c55e':t.result==='loss'?'#ef4444':'#555',
                fontFamily:"'DM Mono',monospace", textAlign:'center', padding:'5px 2px',
                background: t.result==='win'?'rgba(34,197,94,0.08)':t.result==='loss'?'rgba(239,68,68,0.08)':'#0a0a0a',
                border:`1px solid ${t.result==='win'?'rgba(34,197,94,0.3)':t.result==='loss'?'rgba(239,68,68,0.3)':'#1e1e1e'}`,
              })}
                value={t.result} disabled={!isAdmin}
                onChange={e=>onUpdate(t.id,'result',e.target.value)}>
                <option value="">—</option>
                <option value="win">✓ Win</option>
                <option value="loss">✗ Loss</option>
              </select>

            </div>
          )
        })}
      </div>

      {/* Nuova spin */}
      {isAdmin && (
        <div style={{ marginTop:16, display:'flex', justifyContent:'center' }}>
          <button onClick={handleReset} style={{
            padding:'9px 28px', borderRadius:8, cursor:'pointer',
            fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600,
            border:`1px solid ${confirmReset?'rgba(239,68,68,0.5)':'#1e1e1e'}`,
            background:confirmReset?'rgba(239,68,68,0.12)':'transparent',
            color:confirmReset?'#ef4444':'#4a4540', transition:'all .2s',
          }}>
            {confirmReset?'⚠️ Conferma reset':'↺  Nuova spin'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Schedine ──────────────────────────────────────────────────────────────────
function Schedine({ tiles, isAdmin, sched, isWip }) {
  const [inserite, setInserite] = useState({})
  function toggle(id) { if (!isAdmin) return; setInserite(p=>({...p,[id]:!p[id]})) }
  function puntata(tipo) {
    if (tipo==='tris') return sched.tris
    if (tipo==='quaterna') return sched.quaterna
    return sched.full
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {/* Riepilogo */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
        {[
          {label:'Tris ×5',    val:isWip?'WIP':`€${sched.tris}`,     color:'#22c55e'},
          {label:'Quaterna ×2',val:isWip?'WIP':`€${sched.quaterna}`, color:'#60a5fa'},
          {label:'Full ×1',    val:isWip?'WIP':`€${sched.full}`,     color:'#c9a84c'},
          {label:'Tot. inv.',  val:isWip?'WIP':`€${sched.totale}`,   color:'#e0d9d0'},
        ].map(({label,val,color})=>(
          <div key={label} style={{ flex:1, minWidth:70, background:'#141414', border:'1px solid #1e1e1e', borderRadius:8, padding:'8px 10px' }}>
            <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
          </div>
        ))}
      </div>

      {COMBOS.map(c => {
        const status = comboStatus(tiles, c.pos)
        const isW = status==='win', isL = status==='loss'
        const punt   = puntata(c.tipo)
        const odds   = comboOdds(tiles, c.pos)
        const vincita = (punt * odds).toFixed(2)
        const ins = inserite[c.id]

        return (
          <div key={c.id} style={{
            background:isW?'rgba(34,197,94,0.06)':isL?'rgba(239,68,68,0.06)':'#141414',
            border:`1px solid ${isW?'rgba(34,197,94,0.25)':isL?'rgba(239,68,68,0.25)':'#1e1e1e'}`,
            borderRadius:12, padding:'12px 14px', opacity:ins?0.75:1,
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:TIPO_BG[c.tipo], color:TIPO_COLOR[c.tipo], fontFamily:"'DM Mono',monospace" }}>
                  {c.tipo.toUpperCase()}
                </span>
                <span style={{ fontSize:13, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{c.nome}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {isWip
                  ? <span style={{ fontSize:12, color:'#f59e0b', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:20, padding:'2px 10px', fontFamily:"'DM Mono',monospace" }}>WIP</span>
                  : <span style={{ fontSize:16, fontWeight:700, color:TIPO_COLOR[c.tipo], fontFamily:"'DM Mono',monospace" }}>€{punt}</span>
                }
                {isAdmin && (
                  <button onClick={()=>toggle(c.id)} style={{
                    fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:"'Sora',sans-serif",
                    border:`1px solid ${ins?'rgba(34,197,94,0.3)':'#1e1e1e'}`,
                    background:ins?'rgba(34,197,94,0.12)':'transparent',
                    color:ins?'#22c55e':'#555',
                  }}>
                    {ins?'✓ Inserita':'Inserisci'}
                  </button>
                )}
                {!isAdmin && ins && <span style={{ fontSize:11, color:'#22c55e' }}>✓ Inserita</span>}
              </div>
            </div>

            {isW && !isWip && (
              <div style={{ display:'flex', justifyContent:'space-between', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:7, padding:'6px 10px', marginBottom:8 }}>
                <span style={{ fontSize:11, color:'#888', fontFamily:"'Sora',sans-serif" }}>Vincita potenziale</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#22c55e', fontFamily:"'DM Mono',monospace" }}>€{vincita}</span>
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {c.pos.map(pos => {
                const t = tiles.find(t=>t.id===pos)
                if (!t) return null
                const oggi = isOggi(t.data)
                return (
                  <div key={pos} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', borderBottom:'1px solid #181818' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:oggi?'#f59e0b':'#222', flexShrink:0, boxShadow:oggi?'0 0 6px rgba(245,158,11,0.6)':'' }} />
                    <span style={{ fontSize:11, color:'#c9a84c', fontFamily:"'DM Mono',monospace", fontWeight:700, minWidth:14 }}>{t.pronostico||'-'}</span>
                    <span style={{ flex:1, fontSize:12, color:t.casa?'#e0d9d0':'#333', fontFamily:"'Sora',sans-serif" }}>
                      {t.casa||`Pos.${pos}`}{t.ospite?` - ${t.ospite}`:''}
                    </span>
                    <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                      {t.quota && <span style={{ fontSize:10, color:'#c9a84c', fontFamily:"'DM Mono',monospace" }}>@{t.quota}</span>}
                      {t.data  && <span style={{ fontSize:10, color:oggi?'#f59e0b':'#444', fontFamily:"'DM Mono',monospace" }}>{t.data}{oggi?' 🔴':''}</span>}
                      {t.result==='win'  && <span style={{ fontSize:10, color:'#22c55e' }}>✓</span>}
                      {t.result==='loss' && <span style={{ fontSize:10, color:'#ef4444' }}>✗</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── SlotPage ──────────────────────────────────────────────────────────────────
export default function SlotPage() {
  const { isAdmin, getTotalBankroll, calcSchedule } = useAuth()
  const [activeSpin, setActiveSpin] = useState(0)
  const [activeTab,  setActiveTab]  = useState('griglia')
  const [spins, setSpinsState]      = useState(loadSpins)

  function setSpins(updater) {
    setSpinsState(prev => {
      const next = typeof updater==='function' ? updater(prev) : updater
      saveSpins(next); return next
    })
  }
  function updateTile(id, field, val) {
    setSpins(prev => prev.map((spin,si) =>
      si===activeSpin ? spin.map(t=>t.id===id?{...t,[field]:val}:t) : spin
    ))
  }
  function resetSpin() {
    setSpins(prev => prev.map((spin,si) => si===activeSpin ? emptyTiles() : spin))
  }

  const total = getTotalBankroll()
  const sched = calcSchedule(total)
  const isWip = total === 0
  const tiles = spins[activeSpin]

  return (
    <div style={{ padding:'16px' }}>

      {/* Selettore Spin */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {SPIN_LABELS.map((label,i) => (
          <button key={i} onClick={()=>setActiveSpin(i)} style={{
            flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer',
            fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:600, letterSpacing:1,
            background: activeSpin===i?'rgba(201,168,76,0.12)':'transparent',
            border:`1px solid ${activeSpin===i?'rgba(201,168,76,0.4)':'#1e1e1e'}`,
            color: activeSpin===i?'#c9a84c':'#4a4540',
          }}>
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sub-tab */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[{id:'griglia',label:'🎰 Griglia'},{id:'schedine',label:'📋 Schedine'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
            flex:1, padding:'8px', borderRadius:8, cursor:'pointer',
            fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600,
            background: activeTab===t.id?'rgba(201,168,76,0.08)':'transparent',
            border:`1px solid ${activeTab===t.id?'rgba(201,168,76,0.25)':'#1e1e1e'}`,
            color: activeTab===t.id?'#c9a84c':'#555',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='griglia'
        ? <TabellaGriglia tiles={tiles} isAdmin={isAdmin} onUpdate={updateTile} onReset={resetSpin} />
        : <Schedine tiles={tiles} isAdmin={isAdmin} sched={sched} isWip={isWip} />
      }
    </div>
  )
}
