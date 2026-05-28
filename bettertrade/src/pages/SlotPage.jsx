import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const COMBOS = [
  { id:1, nome:'Tris 1-5-2',       tipo:'tris',    pos:[1,5,2]              },
  { id:2, nome:'Tris 1-9-4',       tipo:'tris',    pos:[1,9,4]              },
  { id:3, nome:'Tris 6-9-7',       tipo:'tris',    pos:[6,9,7]              },
  { id:4, nome:'Tris 3-8-4',       tipo:'tris',    pos:[3,8,4]              },
  { id:5, nome:'Tris 3-9-2',       tipo:'tris',    pos:[3,9,2]              },
  { id:6, nome:'Quaterna 1-2-3-4', tipo:'quaterna',pos:[1,2,3,4]            },
  { id:7, nome:'Quaterna 5-6-7-8', tipo:'quaterna',pos:[5,6,7,8]            },
  { id:8, nome:'Full 1→9',         tipo:'full',    pos:[1,2,3,4,5,6,7,8,9] },
]
const SPIN_LABELS = ['Spin 1','Spin 2','Spin 3','Spin 4']
const TIPO_COLOR  = { tris:'#22c55e', quaterna:'#60a5fa', full:'#c9a84c' }
const TIPO_BG     = { tris:'rgba(34,197,94,0.10)', quaterna:'rgba(59,130,246,0.10)', full:'rgba(201,168,76,0.10)' }
const SLOT_GRID   = [[1,5,2],[6,9,7],[3,8,4]]
const TILE_BASE   = {
  1:{bg:'rgba(234,179,8,0.15)',border:'rgba(234,179,8,0.35)',color:'#f0d060'},
  2:{bg:'rgba(234,179,8,0.15)',border:'rgba(234,179,8,0.35)',color:'#f0d060'},
  3:{bg:'rgba(234,179,8,0.15)',border:'rgba(234,179,8,0.35)',color:'#f0d060'},
  4:{bg:'rgba(234,179,8,0.15)',border:'rgba(234,179,8,0.35)',color:'#f0d060'},
  5:{bg:'rgba(56,189,248,0.12)',border:'rgba(56,189,248,0.35)',color:'#7dd3fc'},
  6:{bg:'rgba(56,189,248,0.12)',border:'rgba(56,189,248,0.35)',color:'#7dd3fc'},
  7:{bg:'rgba(56,189,248,0.12)',border:'rgba(56,189,248,0.35)',color:'#7dd3fc'},
  8:{bg:'rgba(56,189,248,0.12)',border:'rgba(56,189,248,0.35)',color:'#7dd3fc'},
  9:{bg:'rgba(100,100,100,0.10)',border:'rgba(100,100,100,0.25)',color:'#888'},
}

function emptyTiles() {
  return Array.from({length:9},(_,i)=>({id:i+1,casa:'',ospite:'',pronostico:'',quota:'',data:'',result:''}))
}
function emptySpins() { return [0,1,2,3].map(()=>emptyTiles()) }
function isOggi(dataStr) {
  if (!dataStr) return false
  const m=dataStr.trim().match(/^(\d{1,2})[\/\.](\d{2})/)
  if (!m) return false
  const oggi=new Date()
  return parseInt(m[1])===oggi.getDate()&&parseInt(m[2])===(oggi.getMonth()+1)
}
function comboStatus(tiles,pos) {
  const rel=tiles.filter(t=>pos.includes(t.id))
  if (rel.some(t=>t.result==='loss')) return 'loss'
  if (rel.every(t=>t.result==='win')) return 'win'
  return 'pending'
}
function comboOdds(tiles,pos) {
  return pos.reduce((a,p)=>{const q=parseFloat(tiles.find(t=>t.id===p)?.quota);return a*(isNaN(q)?1:q)},1)
}
const cell=(extra={})=>({
  background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:5,
  padding:'5px 6px',color:'#e0d9d0',fontSize:12,
  fontFamily:"'Sora',sans-serif",outline:'none',width:'100%',...extra
})

// ── TabellaGriglia ────────────────────────────────────────────────────────────
function TabellaGriglia({tiles,isAdmin,onUpdate,onReset,syncing}) {
  const [confirmReset,setConfirmReset]=useState(false)
  const COLS='46px 1fr 12px 1fr 52px 54px 80px'
  function handleReset() {
    if (!confirmReset){setConfirmReset(true);setTimeout(()=>setConfirmReset(false),3000);return}
    onReset();setConfirmReset(false)
  }
  return (
    <div>
      {syncing&&<div style={{fontSize:10,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:8,textAlign:'right'}}>⟳ Sincronizzazione…</div>}
      {!isAdmin&&<div style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:8,padding:'9px 12px',fontSize:12,color:'#60a5fa',fontFamily:"'Sora',sans-serif",marginBottom:12}}>Modalità lettura</div>}
      <div style={{display:'grid',gridTemplateColumns:COLS,gap:4,padding:'0 2px',marginBottom:4}}>
        {['Pron.','Casa','','Ospite','Quota','Data','Ris.'].map((h,i)=>(
          <div key={`col-${i}`} style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',textAlign:'center',padding:'4px 0'}}>{h}</div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {tiles.map(t=>{
          const isW=t.result==='win',isL=t.result==='loss',oggi=isOggi(t.data)
          return (
            <div key={t.id} style={{display:'grid',gridTemplateColumns:COLS,gap:4,alignItems:'center',padding:'3px 2px',
              background:isW?'rgba(34,197,94,0.07)':isL?'rgba(239,68,68,0.07)':t.id<=4?'rgba(234,179,8,0.05)':t.id<=8?'rgba(56,189,248,0.05)':'#141414',
              border:`1px solid ${isW?'rgba(34,197,94,0.22)':isL?'rgba(239,68,68,0.22)':t.id<=4?'rgba(234,179,8,0.18)':t.id<=8?'rgba(56,189,248,0.15)':'#1a1a1a'}`,
              borderRadius:7}}>
              <select style={cell({color:'#c9a84c',fontFamily:"'DM Mono',monospace",textAlign:'center',padding:'5px 2px'})}
                value={t.pronostico} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'pronostico',e.target.value)}>
                <option value="">-</option><option value="1">1</option><option value="X">X</option><option value="2">2</option>
              </select>
              <input style={cell()} placeholder="Casa" value={t.casa} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'casa',e.target.value)}/>
              <div style={{fontSize:10,color:'#333',textAlign:'center',fontFamily:"'DM Mono',monospace"}}>-</div>
              <input style={cell()} placeholder="Ospite" value={t.ospite} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'ospite',e.target.value)}/>
              <input style={cell({textAlign:'center',color:'#c9a84c',padding:'5px 4px'})}
                type="number" step="0.01" min="1" placeholder="@"
                value={t.quota} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'quota',e.target.value)}/>
              <input style={cell({textAlign:'center',color:oggi?'#f59e0b':'#e0d9d0',fontSize:11,padding:'5px 3px'})}
                placeholder="gg/mm" value={t.data} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'data',e.target.value)}/>
              <select style={cell({
                color:t.result==='win'?'#22c55e':t.result==='loss'?'#ef4444':'#555',
                fontFamily:"'DM Mono',monospace",textAlign:'center',padding:'5px 2px',
                background:t.result==='win'?'rgba(34,197,94,0.08)':t.result==='loss'?'rgba(239,68,68,0.08)':'#0a0a0a',
                border:`1px solid ${t.result==='win'?'rgba(34,197,94,0.3)':t.result==='loss'?'rgba(239,68,68,0.3)':'#1e1e1e'}`})}
                value={t.result} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'result',e.target.value)}>
                <option value="">—</option><option value="win">✓ Win</option><option value="loss">✗ Loss</option>
              </select>
            </div>
          )
        })}
      </div>
      <SlotVisiva tiles={tiles}/>
      {isAdmin&&(
        <div style={{marginTop:16,display:'flex',justifyContent:'center'}}>
          <button onClick={handleReset} style={{padding:'9px 28px',borderRadius:8,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:600,
            border:`1px solid ${confirmReset?'rgba(239,68,68,0.5)':'#1e1e1e'}`,
            background:confirmReset?'rgba(239,68,68,0.12)':'transparent',
            color:confirmReset?'#ef4444':'#4a4540',transition:'all .2s'}}>
            {confirmReset?'⚠️ Conferma reset':'↺  Nuova spin'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── SlotVisiva ────────────────────────────────────────────────────────────────
function SlotVisiva({tiles}) {
  const hasResults=tiles.some(t=>t.result==='win'||t.result==='loss')
  function getTileStyle(partita) {
    const t=tiles.find(t=>t.id===partita),base=TILE_BASE[partita]
    if (!t||!hasResults) return {bg:base.bg,border:base.border,color:base.color,glow:false}
    if (t.result==='win') return {bg:'rgba(34,197,94,0.20)',border:'rgba(34,197,94,0.60)',color:'#22c55e',glow:true,glowColor:'rgba(34,197,94,0.4)'}
    if (t.result==='loss') return {bg:'rgba(239,68,68,0.15)',border:'rgba(239,68,68,0.50)',color:'#ef4444',glow:false}
    return {bg:'rgba(60,60,60,0.15)',border:'rgba(60,60,60,0.30)',color:'#444',glow:false}
  }
  const winCombos=COMBOS.filter(c=>comboStatus(tiles,c.pos)==='win')
  return (
    <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid #1a1a1a'}}>
      <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",letterSpacing:4,textTransform:'uppercase',marginBottom:12,textAlign:'center'}}>Slot</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,maxWidth:280,margin:'0 auto'}}>
        {SLOT_GRID.flat().map(partita=>{
          const ts=getTileStyle(partita),t=tiles.find(t=>t.id===partita)
          return (
            <div key={partita} style={{background:ts.bg,border:`2px solid ${ts.border}`,borderRadius:10,padding:'10px 6px',textAlign:'center',boxShadow:ts.glow?`0 0 12px ${ts.glowColor},0 0 24px ${ts.glowColor}`:'none',transition:'all 0.3s ease'}}>
              <div style={{fontSize:11,fontWeight:700,color:ts.color,fontFamily:"'DM Mono',monospace",marginBottom:2}}>{partita}</div>
              <div style={{fontSize:13,fontWeight:700,color:ts.color,fontFamily:"'DM Mono',monospace"}}>{t?.pronostico||'-'}</div>
              {hasResults&&<div style={{fontSize:10,marginTop:2}}>{t?.result==='win'?'✓':t?.result==='loss'?'✗':'·'}</div>}
            </div>
          )
        })}
      </div>
      {winCombos.length>0&&(
        <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center'}}>
          {winCombos.map(c=>(
            <div key={c.id} style={{fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,background:TIPO_BG[c.tipo],color:TIPO_COLOR[c.tipo],border:`1px solid ${TIPO_COLOR[c.tipo]}55`,fontFamily:"'DM Mono',monospace",boxShadow:`0 0 8px ${TIPO_COLOR[c.tipo]}44`}}>
              ✓ {c.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Schedine ──────────────────────────────────────────────────────────────────
function Schedine({tiles,isAdmin,sched,isWip,spinIdx}) {
  const {currentUser} = useAuth()
  const [inserite,setInserite] = useState({})

  useEffect(()=>{
    async function load() {
      if (!currentUser) return
      const {data}=await supabase.from('inserite').select('combo_id').eq('user_id',currentUser.id).eq('spin_idx',spinIdx)
      if (data) {
        const map={}; data.forEach(r=>{map[r.combo_id]=true}); setInserite(map)
      }
    }
    load()
  },[spinIdx,currentUser?.id])

  async function toggle(id) {
    if (!isAdmin||!currentUser) return
    const isOn=inserite[id]
    if (isOn) {
      await supabase.from('inserite').delete().eq('user_id',currentUser.id).eq('spin_idx',spinIdx).eq('combo_id',id)
    } else {
      await supabase.from('inserite').upsert({user_id:currentUser.id,spin_idx:spinIdx,combo_id:id})
    }
    setInserite(p=>({...p,[id]:!isOn}))
  }

  function puntata(tipo) {
    if (tipo==='tris') return sched.tris
    if (tipo==='quaterna') return sched.quaterna
    return sched.full
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:4}}>
        {[
          {label:'Tris ×5',val:isWip?'WIP':`€${sched.tris}`,color:'#22c55e'},
          {label:'Quaterna ×2',val:isWip?'WIP':`€${sched.quaterna}`,color:'#60a5fa'},
          {label:'Full ×1',val:isWip?'WIP':`€${sched.full}`,color:'#c9a84c'},
          {label:'Tot. inv.',val:isWip?'WIP':`€${sched.totale}`,color:'#e0d9d0'},
        ].map(({label,val,color})=>(
          <div key={label} style={{flex:1,minWidth:70,background:'#141414',border:'1px solid #1e1e1e',borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:3}}>{label}</div>
            <div style={{fontSize:14,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>
      {COMBOS.map(c=>{
        const status=comboStatus(tiles,c.pos),isW=status==='win',isL=status==='loss'
        const punt=puntata(c.tipo),odds=comboOdds(tiles,c.pos),vincita=(punt*odds).toFixed(2),ins=inserite[c.id]
        return (
          <div key={c.id} style={{background:isW?'rgba(34,197,94,0.06)':isL?'rgba(239,68,68,0.06)':'#141414',border:`1px solid ${isW?'rgba(34,197,94,0.25)':isL?'rgba(239,68,68,0.25)':'#1e1e1e'}`,borderRadius:12,padding:'12px 14px',opacity:ins?0.75:1}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:TIPO_BG[c.tipo],color:TIPO_COLOR[c.tipo],fontFamily:"'DM Mono',monospace"}}>{c.tipo.toUpperCase()}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif"}}>{c.nome}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {isWip?<span style={{fontSize:12,color:'#f59e0b',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:20,padding:'2px 10px',fontFamily:"'DM Mono',monospace"}}>WIP</span>
                :<span style={{fontSize:16,fontWeight:700,color:TIPO_COLOR[c.tipo],fontFamily:"'DM Mono',monospace"}}>€{punt}</span>}
                {isAdmin&&<button onClick={()=>toggle(c.id)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:"'Sora',sans-serif",border:`1px solid ${ins?'rgba(34,197,94,0.3)':'#1e1e1e'}`,background:ins?'rgba(34,197,94,0.12)':'transparent',color:ins?'#22c55e':'#555'}}>{ins?'✓ Inserita':'Inserisci'}</button>}
                {!isAdmin&&ins&&<span style={{fontSize:11,color:'#22c55e'}}>✓ Inserita</span>}
              </div>
            </div>
            {isW&&!isWip&&(
              <div style={{display:'flex',justifyContent:'space-between',background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.15)',borderRadius:7,padding:'6px 10px',marginBottom:8}}>
                <span style={{fontSize:11,color:'#888',fontFamily:"'Sora',sans-serif"}}>Vincita potenziale</span>
                <span style={{fontSize:14,fontWeight:700,color:'#22c55e',fontFamily:"'DM Mono',monospace"}}>€{vincita}</span>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {c.pos.map(pos=>{
                const t=tiles.find(t=>t.id===pos);if(!t) return null
                const oggi=isOggi(t.data)
                return (
                  <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:'1px solid #181818'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:oggi?'#f59e0b':'#222',flexShrink:0,boxShadow:oggi?'0 0 6px rgba(245,158,11,0.6)':''}}/>
                    <span style={{fontSize:11,color:'#c9a84c',fontFamily:"'DM Mono',monospace",fontWeight:700,minWidth:14}}>{t.pronostico||'-'}</span>
                    <span style={{flex:1,fontSize:12,color:t.casa?'#e0d9d0':'#333',fontFamily:"'Sora',sans-serif"}}>{t.casa||`Pos.${pos}`}{t.ospite?` - ${t.ospite}`:''}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                      {t.quota&&<span style={{fontSize:10,color:'#c9a84c',fontFamily:"'DM Mono',monospace"}}>@{t.quota}</span>}
                      {t.data&&<span style={{fontSize:10,color:oggi?'#f59e0b':'#444',fontFamily:"'DM Mono',monospace"}}>{t.data}{oggi?' 🔴':''}</span>}
                      {t.result==='win'&&<span style={{fontSize:10,color:'#22c55e'}}>✓</span>}
                      {t.result==='loss'&&<span style={{fontSize:10,color:'#ef4444'}}>✗</span>}
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
  const {isAdmin,isSuperAdmin,getMyBase,getTotalBase,calcSchedule} = useAuth()
  const [activeSpin,setActiveSpin] = useState(0)
  const [activeTab,setActiveTab]   = useState('griglia')
  const [spins,setSpinsState]      = useState(emptySpins)
  const [syncing,setSyncing]       = useState(false)
  const saveTimeout = useRef(null)

  useEffect(()=>{
    async function load() {
      setSyncing(true)
      const {data}=await supabase.from('griglia').select('spins').eq('id',1).single()
      if (data?.spins) {
        const merged=[0,1,2,3].map(si=>{
          const spin=data.spins[si]
          return (!spin||spin.length===0)?emptyTiles():spin
        })
        setSpinsState(merged)
      }
      setSyncing(false)
    }
    load()
  },[])

  function saveToSupabase(newSpins) {
    if (!isAdmin) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current=setTimeout(async()=>{
      setSyncing(true)
      await supabase.from('griglia').update({spins:newSpins,updated_at:new Date().toISOString()}).eq('id',1)
      setSyncing(false)
    },800)
  }

  function setSpins(updater) {
    setSpinsState(prev=>{
      const next=typeof updater==='function'?updater(prev):updater
      saveToSupabase(next); return next
    })
  }

  function updateTile(id,field,val) {
    setSpins(prev=>prev.map((spin,si)=>si===activeSpin?spin.map(t=>t.id===id?{...t,[field]:val}:t):spin))
  }

  async function resetSpin() {
    setSpins(prev=>prev.map((spin,si)=>si===activeSpin?emptyTiles():spin))
    // Reset spunte su Supabase
    const {data:ud} = await supabase.from('users').select('id')
    if (ud) {
      for (const u of ud) {
        await supabase.from('inserite').delete().eq('spin_idx',activeSpin).eq('user_id',u.id)
      }
    }
  }

  const base  = isSuperAdmin?getTotalBase():getMyBase()
  const sched = calcSchedule(base)
  const isWip = base===0
  const tiles = spins[activeSpin]

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex',gap:6,marginBottom:14}}>
        {SPIN_LABELS.map((label,i)=>(
          <button key={label} onClick={()=>setActiveSpin(i)} style={{flex:1,padding:'8px 4px',borderRadius:8,cursor:'pointer',fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,letterSpacing:1,
            background:activeSpin===i?'rgba(201,168,76,0.12)':'transparent',
            border:`1px solid ${activeSpin===i?'rgba(201,168,76,0.4)':'#1e1e1e'}`,
            color:activeSpin===i?'#c9a84c':'#4a4540'}}>{label.toUpperCase()}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[{id:'griglia',label:'🎰 Griglia'},{id:'schedine',label:'📋 Schedine'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:600,
            background:activeTab===t.id?'rgba(201,168,76,0.08)':'transparent',
            border:`1px solid ${activeTab===t.id?'rgba(201,168,76,0.25)':'#1e1e1e'}`,
            color:activeTab===t.id?'#c9a84c':'#555'}}>{t.label}</button>
        ))}
      </div>
      {activeTab==='griglia'
        ?<TabellaGriglia tiles={tiles} isAdmin={isAdmin} onUpdate={updateTile} onReset={resetSpin} syncing={syncing}/>
        :<Schedine tiles={tiles} isAdmin={isAdmin} sched={sched} isWip={isWip} spinIdx={activeSpin}/>
      }
    </div>
  )
}
