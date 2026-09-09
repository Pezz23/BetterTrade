import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

import { C, F, alpha } from '../theme'
import { StatCard } from '../components/ui'

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

export default function BilancioPage() {
  const {
    currentUser, users, fetchUsers, aggiornaSaldo,
    isSuperAdmin, isAdmin,
    pct, numSlot, savePct, saveNumSlot,
    getMyBase, getTotalBase, getTotalBankroll, calcSchedule,
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
  const [saldoReale,setSaldoReale]     = useState('')
  const [trasferendo,setTrasferendo]   = useState(false)
  const [esitoDiff,setEsitoDiff]       = useState(null)

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

  async function trasferisciALaboratorio() {
    if (!saldoReale || isNaN(parseFloat(saldoReale))) return
    setTrasferendo(true)
    const {data:lab} = await supabase.from('users').select('*').ilike('username','laboratorio').single()
    if (!lab) { setEsitoDiff('❌ Utente Laboratorio non trovato'); setTrasferendo(false); return }
    const reale     = parseFloat(saldoReale)
    const aggregato = getTotalBankroll()
    const diff      = parseFloat((reale - aggregato).toFixed(2))
    if (diff === 0) { setEsitoDiff('✓ Nessuna differenza'); setTrasferendo(false); return }
    const tipo    = diff > 0 ? 'deposito' : 'prelievo'
    const importo = Math.abs(diff)
    const nota    = `Trasferimento SuperAdmin · reale €${reale} · aggregato €${aggregato.toFixed(2)}`
    await supabase.from('movimenti').insert([{ user_id:lab.id, tipo, importo, nota }])
    await aggiornaSaldo(lab.id)
    setEsitoDiff(`✓ Trasferiti ${diff>0?'+':''}€${diff.toFixed(2)} a Laboratorio`)
    setSaldoReale('')
    setTrasferendo(false)
  }

  async function handleSavePct(val) { setSavingPct(true); await savePct(val); setSavingPct(false) }
  async function handleSaveNumSlot(val) { setSavingSlot(true); await saveNumSlot(val); setSavingSlot(false) }

  async function salvaMovimento() {
    if (!movForm.importo||parseFloat(movForm.importo)<=0) return
    setSavingMov(true)
    const importo=parseFloat(movForm.importo)
    const delta=movForm.tipo==='deposito'?importo:-importo
    // Salva movimento
    const {data:newMov}=await supabase.from('movimenti').insert([{
      user_id:currentUser.id,
      tipo:movForm.tipo,
      importo,
      nota:movForm.nota||null,
    }]).select('*').single()

    if (newMov) setMovimenti(prev=>[newMov,...prev])

    // Ricalcola dal database: un utente normale non può scrivere users.bankroll
    await aggiornaSaldo(currentUser.id)

    setMovForm({tipo:'deposito',importo:'',nota:''})
    setShowMov(false)
    setSavingMov(false)
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:C.spento,fontFamily:F.sans}}>Caricamento…</div>

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
  const myDiffCol  = myLive>=myInizio?C.verde:C.rosso

  return (
    <div style={{padding:'16px'}}>
      <div style={{fontSize:9,color:C.oro,fontFamily:F.mono,letterSpacing:4,marginBottom:4}}>BILANCIO</div>
      <div style={{fontSize:20,fontWeight:700,color:C.testo,fontFamily:F.sans,marginBottom:20}}>
        {isSuperAdmin?'Vista SuperAdmin':currentUser?.display_name||currentUser?.username}
      </div>

      {/* ── Selettore % ── */}
      <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,padding:'14px 16px',marginBottom:12}}>
        <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>
          % Bankroll da giocare {!isAdmin&&<span style={{color:C.fantasma}}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {PERCENTUALI.map(p=>(
            <button key={p} onClick={()=>isAdmin&&handleSavePct(p)} style={{
              padding:'7px 14px',borderRadius:7,cursor:isAdmin?'pointer':'default',
              fontFamily:F.mono,fontSize:13,fontWeight:600,
              background:pct===p?alpha(C.oro,0.18):'transparent',
              border:`1px solid ${pct===p?alpha(C.oro,0.5):C.bordo}`,
              color:pct===p?C.oro:C.fioco,
              opacity:!isAdmin&&pct!==p?0.4:1,
            }}>{p}%</button>
          ))}
        </div>
        {savingPct&&<div style={{fontSize:10,color:C.spento,fontFamily:F.mono,marginTop:6}}>Salvataggio…</div>}
      </div>

      {/* ── Selettore slot ── */}
      <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,padding:'14px 16px',marginBottom:16}}>
        <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>
          Slot da giocare {!isAdmin&&<span style={{color:C.fantasma}}> · impostato da SuperAdmin</span>}
        </div>
        <div style={{display:'flex',gap:8}}>
          {NUM_SLOT_OPTIONS.map(n=>(
            <button key={n} onClick={()=>isAdmin&&handleSaveNumSlot(n)} style={{
              flex:1,padding:'7px 8px',borderRadius:7,cursor:isAdmin?'pointer':'default',
              fontFamily:F.mono,fontSize:15,fontWeight:700,
              background:numSlot===n?alpha(C.oro,0.18):'transparent',
              border:`1px solid ${numSlot===n?alpha(C.oro,0.5):C.bordo}`,
              color:numSlot===n?C.oro:C.fioco,
              opacity:!isAdmin&&numSlot!==n?0.4:1,
            }}>{n}</button>
          ))}
        </div>
        {savingSlot&&<div style={{fontSize:10,color:C.spento,fontFamily:F.mono,marginTop:6}}>Salvataggio…</div>}
        <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono,marginTop:8}}>
          Base per slot: {isSuperAdmin?fmt(totalBase):fmt(myBase)}
        </div>
      </div>

      {/* ── VISTA SUPERADMIN ── */}
      {isSuperAdmin && (
        <>
          {/* Bankroll aggregato — sola lettura */}
          <div style={{background:C.card,border:`1px solid ${alpha(C.oro,0.2)}`,borderRadius:10,padding:'16px',marginBottom:12}}>
            <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Bankroll totale aggregato</div>
            <div style={{fontSize:28,fontWeight:700,color:C.oro,fontFamily:F.mono}}>{fmt(totalBk)}</div>
            <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono,marginTop:4}}>Somma automatica di tutti gli utenti · sola lettura</div>
          </div>

          {/* Puntate aggregate */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {[
              {label:'Tris ×5',    val:`€${totSched.tris}`,     color:C.verde},
              {label:'Quaterna ×2',val:`€${totSched.quaterna}`, color:C.blu},
              {label:'Full ×1',    val:`€${totSched.full}`,     color:C.oro},
            ].map(({label,val,color})=><StatCard key={label} label={label} value={val} color={color} small/>)}
          </div>

          {/* Tabella utenti */}
          <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Settore ospiti</div>
          <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,overflow:'hidden',marginBottom:16}}>
            {users.filter(u=>u.role!=='superadmin').map((u,i,arr)=>{
              const uBase=((u.bankroll||0)*(pct/100))/numSlot
              const uSched=calcSchedule(uBase)
              return (
                <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:i<arr.length-1?`1px solid ${C.bordoRiga}`:'none'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.testo,fontFamily:F.sans}}>{u.display_name||u.username}</div>
                    <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono}}>T:€{uSched.tris} · Q:€{uSched.quaterna} · F:€{uSched.full}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,fontWeight:700,color:C.oro,fontFamily:F.mono}}>{fmt(u.bankroll||0)}</div>
                    <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono}}>base {fmt(uBase)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sezione Laboratorio */}
          <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,padding:'16px',marginBottom:12}}>
            <div style={{fontSize:9,color:C.oro,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:12}}>Trasferimento a Laboratorio</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,padding:'10px 12px',background:C.barra,borderRadius:8,border:`1px solid ${C.bordoRiga}`}}>
              <span style={{fontSize:12,color:C.spento,fontFamily:F.mono}}>Totale aggregato app</span>
              <span style={{fontSize:16,fontWeight:700,color:C.oro,fontFamily:F.mono}}>{fmt(totalBk)}</span>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,marginBottom:4}}>SALDO REALE CONTO €</div>
              <input type="number" step="0.01" placeholder="0.00"
                value={saldoReale} onChange={e=>{setSaldoReale(e.target.value);setEsitoDiff(null)}}
                style={{width:'100%',background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:7,padding:'9px 12px',color:C.testo,fontSize:15,fontFamily:F.mono,outline:'none'}}/>
            </div>
            {saldoReale&&!isNaN(parseFloat(saldoReale))&&(()=>{
              const diff=parseFloat((parseFloat(saldoReale)-totalBk).toFixed(2))
              return (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderRadius:8,marginBottom:12,
                  background:diff>0?alpha(C.verde,0.08):diff<0?alpha(C.rosso,0.08):alpha(C.grigioMedio,0.08),
                  border:`1px solid ${diff>0?alpha(C.verde,0.25):diff<0?alpha(C.rosso,0.25):C.bordo}`}}>
                  <span style={{fontSize:12,color:C.grigio,fontFamily:F.mono}}>Differenza → Laboratorio</span>
                  <span style={{fontSize:16,fontWeight:700,color:diff>0?C.verde:diff<0?C.rosso:C.spento,fontFamily:F.mono}}>
                    {diff>0?'+':''}{fmt(diff)}
                  </span>
                </div>
              )
            })()}
            {esitoDiff&&(
              <div style={{fontSize:12,color:esitoDiff.startsWith('✓')?C.verde:C.rosso,fontFamily:F.sans,marginBottom:10}}>{esitoDiff}</div>
            )}
            <button onClick={trasferisciALaboratorio} disabled={trasferendo||!saldoReale} style={{
              width:'100%',padding:'11px',borderRadius:8,cursor:'pointer',
              fontFamily:F.sans,fontSize:13,fontWeight:600,
              background:alpha(C.oro,0.12),border:`1px solid ${alpha(C.oro,0.35)}`,color:C.oro,
              opacity:!saldoReale?0.5:1,
            }}>{trasferendo?'Trasferimento…':'⟳ Trasferisci differenza a Laboratorio'}</button>
          </div>

          {/* Movimenti di tutti — SuperAdmin */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em'}}>Movimenti utenti</div>
            <button onClick={()=>setShowAllMov(v=>!v)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:F.sans,background:'transparent',border:`1px solid ${C.bordo}`,color:C.spento}}>
              {showAllMov?'Nascondi':'Mostra'}
            </button>
          </div>
          {showAllMov&&(
            <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,overflow:'hidden',marginBottom:16}}>
              {tuttiMovimenti.length===0&&<div style={{padding:24,textAlign:'center',color:C.fantasma,fontSize:13,fontFamily:F.sans}}>Nessun movimento</div>}
              {tuttiMovimenti.map(m=>(
                <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:`1px solid ${C.bordoTenue}`}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.testo,fontFamily:F.sans}}>{m.users?.display_name||m.users?.username}</div>
                    <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono}}>{new Date(m.created_at).toLocaleDateString('it-IT')} · {m.nota||m.tipo}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:m.tipo==='deposito'?C.verde:C.rosso,fontFamily:F.mono}}>
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
            <StatCard label="Inizio stagione" value={fmt(myInizio)} color={C.testo}/>
            <StatCard label="Saldo live"      value={fmt(myLive)}   color={myLive>=myInizio?C.verde:C.rosso}/>
            <StatCard label="Variazione"      value={myDiff}        color={myDiffCol}/>
            <StatCard label={`Base (${pct}% ÷ ${numSlot})`} value={fmt(myBase)} color={C.blu}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[
              {label:'Tris ×5',    val:`€${mySched.tris}`,     color:C.verde},
              {label:'Quaterna ×2',val:`€${mySched.quaterna}`, color:C.blu},
              {label:'Full ×1',    val:`€${mySched.full}`,     color:C.oro},
            ].map(({label,val,color})=><StatCard key={label} label={label} value={val} color={color} small/>)}
          </div>

          {/* Deposita / Preleva */}
          <div style={{display:'flex',gap:8,marginBottom:16}}>
            {['deposito','prelievo'].map(tipo=>(
              <button key={tipo} onClick={()=>{setMovForm(p=>({...p,tipo}));setShowMov(true)}} style={{
                flex:1,padding:'10px',borderRadius:8,cursor:'pointer',fontFamily:F.sans,fontSize:13,fontWeight:600,
                background:tipo==='deposito'?alpha(C.verde,0.10):alpha(C.rosso,0.10),
                border:`1px solid ${tipo==='deposito'?alpha(C.verde,0.30):alpha(C.rosso,0.30)}`,
                color:tipo==='deposito'?C.verde:C.rosso,
              }}>{tipo==='deposito'?'+ Deposita':'- Preleva'}</button>
            ))}
          </div>

          {/* Form movimento */}
          {showMov&&(
            <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,padding:'16px',marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:C.testo,fontFamily:F.sans,marginBottom:14,textTransform:'capitalize'}}>{movForm.tipo}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,marginBottom:4}}>IMPORTO €</div>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    value={movForm.importo} onChange={e=>setMovForm(p=>({...p,importo:e.target.value}))}
                    style={{width:'100%',background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:7,padding:'9px 12px',color:C.oro,fontSize:15,fontFamily:F.mono,outline:'none'}}/>
                </div>
                <div>
                  <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,marginBottom:4}}>NOTA (opzionale)</div>
                  <input placeholder="es. versamento iniziale"
                    value={movForm.nota} onChange={e=>setMovForm(p=>({...p,nota:e.target.value}))}
                    style={{width:'100%',background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:7,padding:'9px 12px',color:C.testo,fontSize:13,fontFamily:F.sans,outline:'none'}}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={salvaMovimento} disabled={savingMov} style={{
                    flex:1,padding:'10px',borderRadius:7,cursor:'pointer',fontFamily:F.sans,fontSize:13,fontWeight:600,
                    background:movForm.tipo==='deposito'?alpha(C.verde,0.15):alpha(C.rosso,0.15),
                    border:`1px solid ${movForm.tipo==='deposito'?alpha(C.verde,0.40):alpha(C.rosso,0.40)}`,
                    color:movForm.tipo==='deposito'?C.verde:C.rosso,
                  }}>{savingMov?'Salvataggio…':'Conferma'}</button>
                  <button onClick={()=>setShowMov(false)} style={{padding:'10px 16px',borderRadius:7,cursor:'pointer',fontFamily:F.sans,fontSize:13,background:'transparent',border:`1px solid ${C.bordo}`,color:C.spento}}>Annulla</button>
                </div>
              </div>
            </div>
          )}

          {/* Storico movimenti personali */}
          {movimenti.length>0&&(
            <>
              <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Movimenti</div>
              <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,overflow:'hidden',marginBottom:16}}>
                {movimenti.map(m=>(
                  <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',borderBottom:`1px solid ${C.bordoTenue}`}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:m.tipo==='deposito'?C.verde:C.rosso,fontFamily:F.sans,textTransform:'capitalize'}}>{m.tipo}</div>
                      <div style={{fontSize:10,color:C.fioco,fontFamily:F.mono}}>{new Date(m.created_at).toLocaleDateString('it-IT')}{m.nota?` · ${m.nota}`:''}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:m.tipo==='deposito'?C.verde:C.rosso,fontFamily:F.mono}}>
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
      <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>Storico giornate</div>
      {storico.length===0?(
        <div style={{padding:30,textAlign:'center',color:C.fantasma,fontSize:13,fontFamily:F.sans,background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10}}>
          Nessuna giornata registrata
        </div>
      ):(
        <div style={{background:C.card,border:`1px solid ${C.bordo}`,borderRadius:10,overflow:'hidden'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:`1px solid ${C.bordoRiga}`,background:C.pannello}}>
            <span style={{fontSize:12,fontWeight:600,color:C.grigio,fontFamily:F.mono}}>TOTALE STAGIONE</span>
            <span style={{fontSize:16,fontWeight:700,color:myTot>=0?C.verde:C.rosso,fontFamily:F.mono}}>
              {myTot>=0?'+':''}€{Math.abs(myTot).toFixed(2)}
            </span>
          </div>
          {[...storico].reverse().map(entry=>(
            <div key={entry.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',borderBottom:`1px solid ${C.bordoTenue}`}}>
              <div>
                <span style={{fontSize:10,color:C.oro,fontFamily:F.mono,letterSpacing:2}}>{entry.stagione}</span>
                <span style={{fontSize:13,fontWeight:600,color:C.testo,fontFamily:F.sans,marginLeft:8}}>Week {entry.week_number}</span>
                <span style={{fontSize:11,color:C.fioco,fontFamily:F.mono,marginLeft:8}}>{entry.data}</span>
              </div>
              <span style={{fontSize:15,fontWeight:700,color:(entry.tot_saldo||0)>=0?C.verde:C.rosso,fontFamily:F.mono}}>
                {(entry.tot_saldo||0)>=0?'+':''}€{Math.abs(entry.tot_saldo||0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
