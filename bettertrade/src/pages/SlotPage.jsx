import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// ── Combinazioni 3x3 ──────────────────────────────────────────────────────────
//  1 2 3
//  4 5 6
//  7 8 9
const COMBOS = [
  { id:1, nome:'Tris 1-2-3',       tipo:'tris',    pos:[1,2,3]         },
  { id:2, nome:'Tris 4-5-6',       tipo:'tris',    pos:[4,5,6]         },
  { id:3, nome:'Tris 7-8-9',       tipo:'tris',    pos:[7,8,9]         },
  { id:4, nome:'Tris 1-5-9',       tipo:'tris',    pos:[1,5,9]         },
  { id:5, nome:'Tris 7-5-3',       tipo:'tris',    pos:[7,5,3]         },
  { id:6, nome:'Quaterna 1-3-7-9', tipo:'quaterna',pos:[1,3,7,9]       },
  { id:7, nome:'Quaterna 2-4-6-8', tipo:'quaterna',pos:[2,4,6,8]       },
  { id:8, nome:'Full 1→9',         tipo:'full',    pos:[1,2,3,4,5,6,7,8,9] },
]

const emptyTile = i => ({ id:i, casa:'', ospite:'', pronostico:'', quota:'', campionato:'', data:'', result:null })
const emptyTiles = () => Array.from({length:9},(_,i)=>emptyTile(i+1))

function comboStatus(tiles, pos) {
  const rel = tiles.filter(t=>pos.includes(t.id))
  if (rel.some(t=>t.result===0)) return 'loss'
  if (rel.every(t=>t.result===1)) return 'win'
  return 'pending'
}
function comboOdds(tiles, pos) {
  return pos.reduce((a,p)=>{ const q=parseFloat(tiles.find(t=>t.id===p)?.quota); return a*(isNaN(q)?1:q) },1)
}

const TIPO_COLOR = {
  tris:     '#22c55e',
  quaterna: '#60a5fa',
  full:     '#c9a84c',
}
const TIPO_BG = {
  tris:     'rgba(34,197,94,0.10)',
  quaterna: 'rgba(59,130,246,0.10)',
  full:     'rgba(201,168,76,0.10)',
}

// Ordine tabella: angoli → lati → centro
const TABLE_ORDER = [1,3,7,9,2,4,6,8,5]

export default function SlotPage({ tiles, setTiles }) {
  const { isAdmin, getTotalBankroll, calcSchedule } = useAuth()
  const [activeTab, setActiveTab] = useState('griglia') // 'griglia' | 'schedine'

  const total = getTotalBankroll()
  const sched = calcSchedule(total)
  const isWip = total === 0

  function updateTile(id, field, val) {
    setTiles(prev => prev.map(t => t.id===id ? {...t,[field]:val} : t))
  }

  function puntata(tipo) {
    if (tipo==='tris') return sched.tris
    if (tipo==='quaterna') return sched.quaterna
    return sched.full
  }

  // ── GRIGLIA ────────────────────────────────────────────────────────────────
  const Griglia = () => (
    <div>
      {!isAdmin && (
        <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#60a5fa', fontFamily:"'Sora',sans-serif", marginBottom:16 }}>
          Modalità lettura — solo Admin e SuperAdmin possono inserire partite.
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {tiles.map(tile => {
          const isW = tile.result===1, isL = tile.result===0
          return (
            <div key={tile.id} style={{ background: isW?'rgba(34,197,94,0.08)':isL?'rgba(239,68,68,0.08)':'#141414', border:`1px solid ${isW?'rgba(34,197,94,0.3)':isL?'rgba(239,68,68,0.3)':'#1e1e1e'}`, borderRadius:10, padding:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:10, color:'#c9a84c', fontFamily:"'DM Mono',monospace", fontWeight:600 }}>#{tile.id}</span>
                <span style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace" }}>{tile.campionato}</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {[
                  {label:'Casa',      field:'casa',        ph:'es. Juventus'},
                  {label:'Ospite',    field:'ospite',      ph:'es. Milan'},
                  {label:'Campionato',field:'campionato',  ph:'es. ITA 1'},
                  {label:'Data/Ora',  field:'data',        ph:'10.04. 21:00'},
                ].map(({label,field,ph})=>(
                  <div key={field}>
                    <div style={{ fontSize:9, color:'#444', fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{label}</div>
                    <input style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:5, padding:'5px 7px', color:'#e0d9d0', fontSize:12, fontFamily:"'Sora',sans-serif", outline:'none' }}
                      placeholder={ph} value={tile[field]} disabled={!isAdmin}
                      onChange={e=>updateTile(tile.id,field,e.target.value)} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:9, color:'#444', fontFamily:"'DM Mono',monospace", marginBottom:2 }}>Pronostico</div>
                  <select style={{ width:'100%', background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:5, padding:'5px 7px', color:'#c9a84c', fontSize:12, fontFamily:"'DM Mono',monospace", outline:'none' }}
                    value={tile.pronostico} disabled={!isAdmin}
                    onChange={e=>updateTile(tile.id,'pronostico',e.target.value)}>
                    <option value="">-</option>
                    <option value="1">1</option>
                    <option value="X">X</option>
                    <option value="2">2</option>
                  </select>
                </div>
                {/* Risultato — solo admin */}
                {isAdmin && (
                  <div>
                    <div style={{ fontSize:9, color:'#444', fontFamily:"'DM Mono',monospace", marginBottom:2 }}>Risultato</div>
                    <div style={{ display:'flex', gap:4 }}>
                      {[{v:null,l:'—'},{v:1,l:'✓'},{v:0,l:'✗'}].map(b=>(
                        <button key={String(b.v)} onClick={()=>updateTile(tile.id,'result',b.v)}
                          style={{ flex:1, padding:'5px 2px', borderRadius:5, fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif",
                            border:`1px solid ${tile.result===b.v?(b.v===1?'#22c55e':b.v===0?'#ef4444':'#666'):'#1e1e1e'}`,
                            background: tile.result===b.v?(b.v===1?'rgba(34,197,94,0.15)':b.v===0?'rgba(239,68,68,0.15)':'rgba(100,100,100,0.15)'):'transparent',
                            color: tile.result===b.v?(b.v===1?'#22c55e':b.v===0?'#ef4444':'#aaa'):'#555' }}>
                          {b.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── SCHEDINE ───────────────────────────────────────────────────────────────
  const Schedine = () => {
    const [inserite, setInserite] = useState({})
    function toggle(id) {
      if (!isAdmin) return
      setInserite(p=>({...p,[id]:!p[id]}))
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Riepilogo bankroll */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
          {[
            {label:'Tris (×5)', val: isWip?'WIP':`€${sched.tris}`, color:'#22c55e'},
            {label:'Quaterna (×2)', val: isWip?'WIP':`€${sched.quaterna}`, color:'#60a5fa'},
            {label:'Full (×1)', val: isWip?'WIP':`€${sched.full}`, color:'#c9a84c'},
            {label:'Totale inv.', val: isWip?'WIP':`€${sched.totale}`, color:'#e0d9d0'},
          ].map(({label,val,color})=>(
            <div key={label} style={{ flex:1, minWidth:80, background:'#141414', border:'1px solid #1e1e1e', borderRadius:8, padding:'8px 10px' }}>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>

        {COMBOS.map(c => {
          const status = comboStatus(tiles, c.pos)
          const isW = status==='win', isL = status==='loss'
          const punt = puntata(c.tipo)
          const odds = comboOdds(tiles, c.pos)
          const vincita = (punt * odds).toFixed(2)
          const ins = inserite[c.id]

          return (
            <div key={c.id} style={{ background: isW?'rgba(34,197,94,0.06)':isL?'rgba(239,68,68,0.06)':'#141414',
              border:`1px solid ${isW?'rgba(34,197,94,0.25)':isL?'rgba(239,68,68,0.25)':'#1e1e1e'}`,
              borderRadius:12, padding:'12px 14px', opacity: ins?0.75:1 }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:TIPO_BG[c.tipo], color:TIPO_COLOR[c.tipo], fontFamily:"'DM Mono',monospace" }}>{c.tipo.toUpperCase()}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>{c.nome}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {isWip
                    ? <span style={{ fontSize:12, color:'#f59e0b', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:20, padding:'2px 10px', fontFamily:"'DM Mono',monospace" }}>WIP</span>
                    : <span style={{ fontSize:16, fontWeight:700, color:TIPO_COLOR[c.tipo], fontFamily:"'DM Mono',monospace" }}>€{punt}</span>
                  }
                  {isAdmin && (
                    <button onClick={()=>toggle(c.id)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer', fontFamily:"'Sora',sans-serif",
                      border:`1px solid ${ins?'rgba(34,197,94,0.3)':'#1e1e1e'}`,
                      background: ins?'rgba(34,197,94,0.12)':'transparent',
                      color: ins?'#22c55e':'#555' }}>
                      {ins?'✓ Inserita':'Inserisci'}
                    </button>
                  )}
                  {!isAdmin && ins && <span style={{ fontSize:11, color:'#22c55e', fontFamily:"'Sora',sans-serif" }}>✓ Inserita</span>}
                </div>
              </div>

              {/* Vincita potenziale */}
              {isW && !isWip && (
                <div style={{ display:'flex', justifyContent:'space-between', background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.15)', borderRadius:7, padding:'6px 10px', marginBottom:8 }}>
                  <span style={{ fontSize:11, color:'#888', fontFamily:"'Sora',sans-serif" }}>Vincita</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'#22c55e', fontFamily:"'DM Mono',monospace" }}>€{vincita}</span>
                </div>
              )}

              {/* Partite */}
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                {c.pos.map(pos => {
                  const t = tiles.find(t=>t.id===pos)
                  if (!t) return null
                  const oggi = isOggi(t.data)
                  return (
                    <div key={pos} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid #181818' }}>
                      <div style={{ width:7, height:7, borderRadius:'50%', background: oggi?'#f59e0b':'#222', flexShrink:0, boxShadow: oggi?'0 0 6px rgba(245,158,11,0.6)':'' }} />
                      <span style={{ fontSize:11, color:'#c9a84c', fontFamily:"'DM Mono',monospace", fontWeight:700, minWidth:14 }}>{t.pronostico||'-'}</span>
                      <span style={{ flex:1, fontSize:12, color: t.casa?'#e0d9d0':'#333', fontFamily:"'Sora',sans-serif" }}>
                        {t.casa||`Pos.${pos}`}{t.ospite?` vs ${t.ospite}`:''}
                      </span>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        {t.campionato && <span style={{ fontSize:10, color:'#444', fontFamily:"'DM Mono',monospace" }}>{t.campionato}</span>}
                        {t.data && <span style={{ fontSize:10, color: oggi?'#f59e0b':'#444', fontFamily:"'DM Mono',monospace" }}>{t.data}{oggi?' 🔴':''}</span>}
                      </div>
                      {/* Campo quota */}
                      <input type="number" step="0.01" min="1" placeholder="quota"
                        value={t.quota}
                        onChange={e=>updateTile(t.id,'quota',e.target.value)}
                        style={{ width:60, background:'#0a0a0a', border:'1px solid #1e1e1e', borderRadius:5, padding:'3px 6px', color:'#c9a84c', fontSize:11, fontFamily:"'DM Mono',monospace", outline:'none', textAlign:'center' }} />
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

  return (
    <div style={{ padding:'16px' }}>
      {/* Sub-tab */}
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {[{id:'griglia',label:'🎰 Griglia'},{id:'schedine',label:'📋 Schedine'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ flex:1, padding:'9px', borderRadius:8, cursor:'pointer', fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600,
            background: activeTab===t.id?'rgba(201,168,76,0.12)':'transparent',
            border: `1px solid ${activeTab===t.id?'rgba(201,168,76,0.35)':'#1e1e1e'}`,
            color: activeTab===t.id?'#c9a84c':'#555' }}>
            {t.label}
          </button>
        ))}
      </div>
      {activeTab==='griglia' ? <Griglia/> : <Schedine/>}
    </div>
  )
}

function isOggi(dataStr) {
  if (!dataStr) return false
  // formato GG.MM. HH:MM
  const m = dataStr.trim().match(/^(\d{1,2})\.(\d{2})\.\s*(\d{2}):(\d{2})$/)
  if (!m) return false
  const oggi = new Date()
  return parseInt(m[1])===oggi.getDate() && parseInt(m[2])===(oggi.getMonth()+1)
}
