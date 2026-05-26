import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const PERCENTUALI      = [5, 10, 15, 20, 25, 30]
const NUM_SLOT_OPTIONS = [1, 2, 3, 4]

function fmt(n, showSign=false) {
  if (n===null||n===undefined||isNaN(n)) return '—'
  const abs=Math.abs(n).toFixed(2)
  const sign=n<0?'-':(showSign&&n>0?'+':'')
  return `${sign}€${abs}`
}
function fmtPct(a,b) {
  if (!b||b===0) return '—'
  const diff=((a-b)/b*100).toFixed(1)
  return diff>0?`+${diff}%`:`${diff}%`
}

function StatCard({label,value,sub,color,small}) {
  return (
    <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,padding:'14px 16px'}}>
      <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>{label}</div>
      <div style={{fontSize:small?18:22,fontWeight:700,color:color||'#e0d9d0',fontFamily:"'DM Mono',monospace",marginBottom:sub?3:0}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:'#555',fontFamily:"'DM Mono',monospace"}}>{sub}</div>}
    </div>
  )
}

export default function BilancioPage() {
  const {
    currentUser, users, fetchUsers,
    isSuperAdmin,
    pct, numSlot, savePct, saveNumSlot,
    getMyBase, getTotalBase, getTotalBankroll, calcSchedule,
    updateBankroll,
  } = useAuth()

  const [storico,setStorico]         = useState([])
  const [movimenti,setMovimenti]     = useState([])
  const [tuttiMovimenti,setTuttiMovimenti] = useState([]) // solo superadmin
  const [loading,setLoading]         = useState(true)
  const [savingPct,setSavingPct]     = useState(false)
  const [savingSlot,setSavingSlot]   = useState(false)
  const [showMov,setShowMov]         = useState(false)
  const [movForm,setMovForm]         = useState({tipo:'deposito',importo:'',nota:''})
  const [savingMov,setSavingMov]     = useState(false)
  const [showAllMov,setShowAllMov]   = useState(false)

  useEffect(()=>{ init() },[currentUser?.id])

  async function init() {
    await fetchUsers()
    if (currentUser) {
      // Carica storico giornate
      const {data:g}=await supabase.from('giornate').select('*').eq('user_id',currentUser.id).order('stagione').order('week_number')
      if (g) setStorico(g)
      // Carica movimenti personali
      const {data:m}=await supabase.from('movimenti').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false})
      if (m) setMovimenti(m)
      // SuperAdmin: carica movimenti di tutti
      if (currentUser.role==='superadmin') {
        const {data:tm}=await supabase.from('movimenti').select('*, users(display_name, username)').order('created_at',{ascending:false})
        if (tm) setTuttiMovimenti(tm)
      }
    }
    setLoading(false)
  }

  async function handleSavePct(val) { setSavingPct(true); await savePct(val); setSavingPct(false) }
  async function handleSaveNumSlot(val) { setSavingSlot(true); await saveNumSlot(val); setSavingSlot(false) }

  async function salvaMovimento() {
    if (!movForm.importo||parseFloat(movForm.importo)<=0) return
    setSavingMov(true)
    const importo=parseFloat(movForm.importo)
    const delta=movForm.tipo==='deposito'?importo:-importo
    const nuovoBankroll=parseFloat(((currentUser.bankroll||0)+delta).toFixed(2))

    // Salva movimento
    const {data:newMov}=await supabase.from('movimenti').insert([{
      user_id:currentUser.id,
      tipo:movForm.tipo,
      importo,
      nota:movForm.nota||null,
    }]).select('*').single()

    if (newMov) setMovimenti(prev=>[newMov,...prev])

    // Aggiorna bankroll
    await updateBankroll(currentUser.id, nuovoBankroll)

    setMovForm({tipo:'deposito',importo:'',nota:''})
    setShowMov(false)
    setSavingMov(false)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#555',fontFamily:"'Sora',sans-serif"}}>Caricamento…</div>

  const myBase    = getMyBase()
  const totalBase = getTotalBase()
  const totalBk   = getTotalBankroll()
  const mySched   = calcSchedule(myBase)
  const totSched  = calcSchedule(totalBase)

  const myBankroll = currentUser?.bankroll||0
  const myInizio   = currentUser?.bankroll_iniziale||myBankroll
  const myStorTot  = storico.reduce((s,g)=>s+(g.tot_saldo||0),0)
  const myLive     = myBankroll
  const myDiff     = fmtPct(myLive,myInizio)
  const myDiffCol  = myLive>=myInizio?'#22c55e':'#ef4444'

  return (
    <div style={{padding:'16px'}}>
      <div style={{fontSize:9,color:'#c9a84c',fontFamily:"'DM Mono',monospace",letterSpacing:4,marginBottom:4}}>BILANCIO</div>
      <div style={{fontSize:20,fontWeight:700,color:'#e0d9d0',fontFamily:"'Sora',sans-serif",marginBottom:20}}>
        {isSuperAdmin?'Vista SuperAdmin':currentUser?.display_name||currentUser?.username}
      </div>

      {/* ── Selettore % ── */}
      <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,padding:'14px 16px',marginBottom:12}}>
        <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>
          % Bankroll da giocare {!isSuperAdmin&&<span style={{color:'#333'}}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {PERCENTUALI.map(p=>(
            <button key={p} onClick={()=>isSuperAdmin&&handleSavePct(p)} style={{
              padding:'7px 14px',borderRadius:7,cursor:isSuperAdmin?'pointer':'default',
              fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,
              background:pct===p?'rgba(201,168,76,0.18)':'transparent',
              border:`1px solid ${pct===p?'rgba(201,168,76,0.5)':'#1e1e1e'}`,
              color:pct===p?'#c9a84c':'#444',
              opacity:!isSuperAdmin&&pct!==p?0.4:1,
            }}>{p}%</button>
          ))}
        </div>
        {savingPct&&<div style={{fontSize:10,color:'#555',fontFamily:"'DM Mono',monospace",marginTop:6}}>Salvataggio…</div>}
      </div>

      {/* ── Selettore slot ── */}
      <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>
          Slot da giocare {!isSuperAdmin&&<span style={{color:'#333'}}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{display:'flex',gap:8}}>
          {NUM_SLOT_OPTIONS.map(n=>(
            <button key={n} onClick={()=>isSuperAdmin&&handleSaveNumSlot(n)} style={{
              flex:1,padding:'7px 8px',borderRadius:7,cursor:isSuperAdmin?'pointer':'default',
              fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:700,
              background:numSlot===n?'rgba(201,168,76,0.18)':'transparent',
              border:`1px solid ${numSlot===n?'rgba(201,168,76,0.5)':'#1e1e1e'}`,
              color:numSlot===n?'#c9a84c':'#444',
              opacity:!isSuperAdmin&&numSlot!==n?0.4:1,
            }}>{n}</button>
          ))}
        </div>
        {savingSlot&&<div style={{fontSize:10,color:'#555',fontFamily:"'DM Mono',monospace",marginTop:6}}>Salvataggio…</div>}
        <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace",marginTop:8}}>
          Base per slot: {isSuperAdmin?fmt(totalBase):fmt(myBase)}
        </div>
      </div>

      {/* ── VISTA SUPERADMIN ── */}
      {isSuperAdmin && (
        <>
          {/* Bankroll aggregato — sola lettura */}
          <div style={{background:'#141414',border:'1px solid rgba(201,168,76,0.2)',borderRadius:10,padding:'16px',marginBottom:12}}>
            <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Bankroll totale aggregato</div>
            <div style={{fontSize:28,fontWeight:700,color:'#c9a84c',fontFamily:"'DM Mono',monospace"}}>{fmt(totalBk)}</div>
            <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace",marginTop:4}}>Somma automatica di tutti gli utenti · sola lettura</div>
          </div>

          {/* Puntate aggregate */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {[
              {label:'Tris ×5',    val:`€${totSched.tris}`,     color:'#22c55e'},
              {label:'Quaterna ×2',val:`€${totSched.quaterna}`, color:'#60a5fa'},
              {label:'Full ×1',    val:`€${totSched.full}`,     color:'#c9a84c'},
            ].map(({label,val,color})=><StatCard key={label} label={label} value={val} color={color} small/>)}
          </div>

          {/* Tabella utenti */}
          <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Settore ospiti</div>
          <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,overflow:'hidden',marginBottom:16}}>
            {users.filter(u=>u.role!=='superadmin').map((u,i,arr)=>{
              const uBase=((u.bankroll||0)*(pct/100))/numSlot
              const uSched=calcSchedule(uBase)
              return (
                <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:i<arr.length-1?'1px solid #1a1a1a':'none'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif"}}>{u.display_name||u.username}</div>
                    <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace"}}>T:€{uSched.tris} · Q:€{uSched.quaterna} · F:€{uSched.full}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,fontWeight:700,color:'#c9a84c',fontFamily:"'DM Mono',monospace"}}>{fmt(u.bankroll||0)}</div>
                    <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace"}}>base {fmt(uBase)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Movimenti di tutti — SuperAdmin */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em'}}>Movimenti utenti</div>
            <button onClick={()=>setShowAllMov(v=>!v)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:"'Sora',sans-serif",background:'transparent',border:'1px solid #1e1e1e',color:'#555'}}>
              {showAllMov?'Nascondi':'Mostra'}
            </button>
          </div>
          {showAllMov&&(
            <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,overflow:'hidden',marginBottom:16}}>
              {tuttiMovimenti.length===0&&<div style={{padding:24,textAlign:'center',color:'#333',fontSize:13,fontFamily:"'Sora',sans-serif"}}>Nessun movimento</div>}
              {tuttiMovimenti.map(m=>(
                <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #181818'}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif"}}>{m.users?.display_name||m.users?.username}</div>
                    <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace"}}>{new Date(m.created_at).toLocaleDateString('it-IT')} · {m.nota||m.tipo}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:m.tipo==='deposito'?'#22c55e':'#ef4444',fontFamily:"'DM Mono',monospace"}}>
                    {m.tipo==='deposito'?'+':'-'}€{m.importo.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Storico giornate superadmin */}
          <StoricoPagina storico={storico} isSuperAdmin={true}/>
        </>
      )}

      {/* ── VISTA UTENTE ── */}
      {!isSuperAdmin && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <StatCard label="Inizio stagione" value={fmt(myInizio)} color="#e0d9d0"/>
            <StatCard label="Saldo live"      value={fmt(myLive)}   color={myLive>=myInizio?'#22c55e':'#ef4444'}/>
            <StatCard label="Variazione"      value={myDiff}        color={myDiffCol}/>
            <StatCard label={`Base (${pct}% ÷ ${numSlot})`} value={fmt(myBase)} color="#60a5fa"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[
              {label:'Tris ×5',    val:`€${mySched.tris}`,     color:'#22c55e'},
              {label:'Quaterna ×2',val:`€${mySched.quaterna}`, color:'#60a5fa'},
              {label:'Full ×1',    val:`€${mySched.full}`,     color:'#c9a84c'},
            ].map(({label,val,color})=><StatCard key={label} label={label} value={val} color={color} small/>)}
          </div>

          {/* Deposita / Preleva */}
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {['deposito','prelievo'].map(tipo=>(
              <button key={tipo} onClick={()=>{setMovForm(p=>({...p,tipo}));setShowMov(true)}} style={{
                flex:1,padding:'10px',borderRadius:8,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:600,
                background:tipo==='deposito'?'rgba(34,197,94,0.10)':'rgba(239,68,68,0.10)',
                border:`1px solid ${tipo==='deposito'?'rgba(34,197,94,0.30)':'rgba(239,68,68,0.30)'}`,
                color:tipo==='deposito'?'#22c55e':'#ef4444',
              }}>{tipo==='deposito'?'+ Deposita':'- Preleva'}</button>
            ))}
          </div>

          {/* Form movimento */}
          {showMov&&(
            <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,padding:'16px',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif",marginBottom:14,textTransform:'capitalize'}}>{movForm.tipo}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:4}}>IMPORTO €</div>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={movForm.importo} onChange={e=>setMovForm(p=>({...p,importo:e.target.value}))}
                    style={{width:'100%',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:7,padding:'9px 12px',color:'#c9a84c',fontSize:15,fontFamily:"'DM Mono',monospace",outline:'none'}}/>
                </div>
                <div>
                  <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:4}}>NOTA (opzionale)</div>
                  <input placeholder="es. versamento iniziale"
                    value={movForm.nota} onChange={e=>setMovForm(p=>({...p,nota:e.target.value}))}
                    style={{width:'100%',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:7,padding:'9px 12px',color:'#e0d9d0',fontSize:13,fontFamily:"'Sora',sans-serif",outline:'none'}}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={salvaMovimento} disabled={savingMov} style={{
                    flex:1,padding:'10px',borderRadius:7,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:600,
                    background:movForm.tipo==='deposito'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)',
                    border:`1px solid ${movForm.tipo==='deposito'?'rgba(34,197,94,0.40)':'rgba(239,68,68,0.40)'}`,
                    color:movForm.tipo==='deposito'?'#22c55e':'#ef4444',
                  }}>{savingMov?'Salvataggio…':'Conferma'}</button>
                  <button onClick={()=>setShowMov(false)} style={{padding:'10px 16px',borderRadius:7,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:13,background:'transparent',border:'1px solid #1e1e1e',color:'#555'}}>Annulla</button>
                </div>
              </div>
            </div>
          )}

          {/* Storico movimenti personali */}
          {movimenti.length>0&&(
            <>
              <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Movimenti</div>
              <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,overflow:'hidden',marginBottom:16}}>
                {movimenti.map(m=>(
                  <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:'1px solid #181818'}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:m.tipo==='deposito'?'#22c55e':'#ef4444',fontFamily:"'Sora',sans-serif",textTransform:'capitalize'}}>{m.tipo}</div>
                      <div style={{fontSize:10,color:'#444',fontFamily:"'DM Mono',monospace"}}>{new Date(m.created_at).toLocaleDateString('it-IT')}{m.nota?` · ${m.nota}`:''}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:m.tipo==='deposito'?'#22c55e':'#ef4444',fontFamily:"'DM Mono',monospace"}}>
                      {m.tipo==='deposito'?'+':'-'}€{m.importo.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Storico giornate */}
          <StoricoPagina storico={storico} isSuperAdmin={false}/>
        </>
      )}
    </div>
  )
}

function StoricoPagina({storico}) {
  const myTot = storico.reduce((s,g)=>s+(g.tot_saldo||0),0)
  return (
    <>
      <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Storico giornate</div>
      {storico.length===0?(
        <div style={{padding:30,textAlign:'center',color:'#333',fontSize:13,fontFamily:"'Sora',sans-serif",background:'#141414',border:'1px solid #1e1e1e',borderRadius:10}}>
          Nessuna giornata registrata
        </div>
      ):(
        <div style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #1a1a1a',background:'#111'}}>
            <span style={{fontSize:12,fontWeight:600,color:'#888',fontFamily:"'DM Mono',monospace"}}>TOTALE STAGIONE</span>
            <span style={{fontSize:16,fontWeight:700,color:myTot>=0?'#22c55e':'#ef4444',fontFamily:"'DM Mono',monospace"}}>
              {myTot>=0?'+':''}€{Math.abs(myTot).toFixed(2)}
            </span>
          </div>
          {[...storico].reverse().map(entry=>(
            <div key={entry.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #181818'}}>
              <div>
                <span style={{fontSize:10,color:'#c9a84c',fontFamily:"'DM Mono',monospace",letterSpacing:2}}>{entry.stagione}</span>
                <span style={{fontSize:13,fontWeight:600,color:'#e0d9d0',fontFamily:"'Sora',sans-serif",marginLeft:8}}>Week {entry.week_number}</span>
                <span style={{fontSize:11,color:'#444',fontFamily:"'DM Mono',monospace",marginLeft:8}}>{entry.data}</span>
              </div>
              <span style={{fontSize:15,fontWeight:700,color:(entry.tot_saldo||0)>=0?'#22c55e':'#ef4444',fontFamily:"'DM Mono',monospace"}}>
                {(entry.tot_saldo||0)>=0?'+':''}€{Math.abs(entry.tot_saldo||0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
