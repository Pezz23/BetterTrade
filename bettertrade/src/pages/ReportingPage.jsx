import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const SPIN_LABELS = ['Spin 1','Spin 2','Spin 3','Spin 4']

// Stagioni disponibili
const STAGIONI = [
  '23/24','24/25','25/26','26/27','27/28','28/29','29/30',
  '30/31','31/32','32/33','33/34','34/35','35/36','36/37',
  '37/38','38/39','39/40'
]
const STAGIONE_CORRENTE = '25/26'


const COMBOS = [
  {tipo:'tris',    pos:[1,5,2]},
  {tipo:'tris',    pos:[1,9,4]},
  {tipo:'tris',    pos:[6,9,7]},
  {tipo:'tris',    pos:[3,8,4]},
  {tipo:'tris',    pos:[3,9,2]},
  {tipo:'quaterna',pos:[1,2,3,4]},
  {tipo:'quaterna',pos:[5,6,7,8]},
  {tipo:'full',    pos:[1,2,3,4,5,6,7,8,9]},
]

function fmt(n,showSign=false) {
  if (n===null||n===undefined||isNaN(n)) return '—'
  const abs=Math.abs(n).toFixed(2)
  const sign=n<0?'-':(showSign&&n>0?'+':'')
  return `${sign}€${abs}`
}
function fmtPct(saldo,investito) {
  if (!investito||investito===0) return '—'
  const p=(saldo/investito*100).toFixed(1)
  return p>0?`+${p}%`:`${p}%`
}
function pctColor(saldo) {
  if (!saldo) return '#555'
  return saldo>0?'#22c55e':saldo<0?'#ef4444':'#555'
}
function calcInvestito(sched) { return sched.tris*5+sched.quaterna*2+sched.full }
function calcIncasso(tiles,sched) {
  let tot=0
  for (const c of COMBOS) {
    const rel=c.pos.map(p=>tiles.find(t=>t.id===p))
    if (!rel.every(t=>t?.result==='win')) continue
    const punt=c.tipo==='tris'?sched.tris:c.tipo==='quaterna'?sched.quaterna:sched.full
    const odds=rel.reduce((a,t)=>a*(parseFloat(t?.quota)||1),1)
    tot+=punt*odds
  }
  return tot
}

// Calcola schedule per un utente dato il suo bankroll
function calcUserSched(user, pct, numSlot, calcSchedule) {
  const base = ((user.bankroll||0) * (pct/100)) / numSlot
  return calcSchedule(base)
}

export default function ReportingPage() {
  const {currentUser,users,fetchUsers,isSuperAdmin,isAdmin,pct,numSlot,getMyBase,calcSchedule,updateBankroll} = useAuth()
  const [giornate,setGiornate] = useState([])
  const [saving,setSaving]     = useState(false)
  const [savingAll,setSavingAll] = useState(false)
  const [confirmIdx,setConfirmIdx] = useState(null)
  const [loading,setLoading]   = useState(true)
  const [stagione,setStagione] = useState(STAGIONE_CORRENTE)

  useEffect(()=>{ init() },[currentUser?.id])
  useEffect(()=>{ if(!loading) loadGiornate(stagione) },[stagione])

  async function init() {
    await fetchUsers()
    await loadGiornate()
    setLoading(false)
  }

  async function loadGiornate(sTag) {
    if (!currentUser) return
    const s = sTag || stagione
    const {data}=await supabase.from('giornate').select('*').eq('user_id',currentUser.id).eq('stagione',s).order('week_number')
    if (data) setGiornate(data)
  }

  // Ottieni il prossimo week_number disponibile
  async function getNextWeekNumber() {
    const { data } = await supabase.from('giornate').select('week_number').eq('stagione', stagione).order('week_number', { ascending: false }).limit(1)
    if (data && data.length > 0 && data[0].week_number) return data[0].week_number + 1
    return 1
  }

  async function getSpins() {
    const {data}=await supabase.from('griglia').select('spins').eq('id',1).single()
    return data?.spins||[[],[],[],[]]
  }

  function buildSpinData(spins, sched) {
    return SPIN_LABELS.map((_,si)=>{
      const tiles=spins[si]||[]
      if (!tiles.some(t=>t.casa||t.result)) return null
      const investito=calcInvestito(sched)
      const incasso=parseFloat(calcIncasso(tiles,sched).toFixed(2))
      const saldo=parseFloat((incasso-investito).toFixed(2))
      return {investito,incasso,saldo}
    })
  }

  // Salva giornata per utente corrente
  async function salvaGiornata() {
    setSaving(true)
    const spins=await getSpins()
    const oggi=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})
    const mySched=calcSchedule(getMyBase())
    const spinData=buildSpinData(spins,mySched)
    const totInvestito=spinData.reduce((s,d)=>s+(d?.investito||0),0)
    const totIncasso=spinData.reduce((s,d)=>s+(d?.incasso||0),0)
    const totSaldo=parseFloat((totIncasso-totInvestito).toFixed(2))

    const weekNumber = await getNextWeekNumber()
    const {data:newG}=await supabase.from('giornate').insert([{
      user_id:currentUser.id, data:oggi,
      spins:spinData, tot_investito:totInvestito, tot_incasso:totIncasso, tot_saldo:totSaldo,
      week_number:weekNumber, stagione:stagione
    }]).select().single()

    if (newG) setGiornate(prev=>[...prev,newG])
    const nuovoBankroll=parseFloat(((currentUser.bankroll||0)+totSaldo).toFixed(2))
    await updateBankroll(currentUser.id,nuovoBankroll)
    setSaving(false)
  }

  // Salva giornata per TUTTI gli utenti (solo SuperAdmin)
  async function salvaPerTutti() {
    setSavingAll(true)
    const spins=await getSpins()
    const oggi=new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})
    const allUsers=users.length>0?users:[]
    const weekNumber=await getNextWeekNumber()

    for (const u of allUsers) {
      const uSched=calcUserSched(u,pct,numSlot,calcSchedule)
      const spinData=buildSpinData(spins,uSched)
      const totInvestito=spinData.reduce((s,d)=>s+(d?.investito||0),0)
      const totIncasso=spinData.reduce((s,d)=>s+(d?.incasso||0),0)
      const totSaldo=parseFloat((totIncasso-totInvestito).toFixed(2))

      await supabase.from('giornate').insert([{
        user_id:u.id, data:oggi,
        spins:spinData, tot_investito:totInvestito, tot_incasso:totIncasso, tot_saldo:totSaldo,
        week_number:weekNumber, stagione:stagione
      }])
      // Aggiorna bankroll di ogni utente
      const nuovoBankroll=parseFloat(((u.bankroll||0)+totSaldo).toFixed(2))
      await supabase.from('users').update({bankroll:nuovoBankroll}).eq('id',u.id)
    }

    await loadGiornate()
    await fetchUsers()
    setSavingAll(false)
  }

  async function eliminaGiornata(id) {
    const giornata = giornate.find(g => g.id === id)
    if (!giornata) return
    const wn = giornata.week_number
    // Elimina tutte le righe con lo stesso week_number (tutti gli utenti)
    await supabase.from('giornate').delete().eq('week_number', wn)
    setGiornate(prev => prev.filter(g => g.week_number !== wn))
    setConfirmIdx(null)
  }

  const SEZIONI=[
    {key:'investito',label:'Investiti'},
    {key:'incasso',  label:'Incasso'},
    {key:'saldo',    label:'Saldo'},
    {key:'pct',      label:'Saldo %'},
  ]

  const totali={
    investito:giornate.reduce((s,g)=>s+(g.tot_investito||0),0),
    incasso:  giornate.reduce((s,g)=>s+(g.tot_incasso||0),0),
    saldo:    giornate.reduce((s,g)=>s+(g.tot_saldo||0),0),
  }

  function getSpinVal(sezKey,spinData) {
    if (!spinData) return null
    if (sezKey==='investito') return spinData.investito
    if (sezKey==='incasso')   return spinData.incasso
    if (sezKey==='saldo')     return spinData.saldo
    return null
  }

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#555',fontFamily:"'Sora',sans-serif"}}>Caricamento…</div>

  return (
    <div style={{padding:'16px'}}>
      <div style={{fontSize:9,color:'#c9a84c',fontFamily:"'DM Mono',monospace",letterSpacing:4,marginBottom:4}}>REPORTING</div>
      {/* Selettore stagione */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.07em'}}>Stagione</div>
        <select value={stagione} onChange={e=>setStagione(e.target.value)} style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:7,padding:'6px 12px',color:'#c9a84c',fontSize:13,fontFamily:"'DM Mono',monospace",outline:'none',cursor:'pointer'}}>
          {STAGIONI.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {stagione!==STAGIONE_CORRENTE && (
          <span style={{fontSize:10,color:'#f59e0b',background:'rgba(245,158,11,0.10)',border:'1px solid rgba(245,158,11,0.20)',borderRadius:20,padding:'3px 10px',fontFamily:"'DM Mono',monospace"}}>
            Sola lettura
          </span>
        )}
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,gap:8,flexWrap:'wrap'}}>
        <div style={{fontSize:20,fontWeight:700,color:'#e0d9d0',fontFamily:"'Sora',sans-serif"}}>Giornate</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {isAdmin&&stagione===STAGIONE_CORRENTE&&(
            <button onClick={salvaGiornata} disabled={saving||savingAll} style={{padding:'9px 14px',borderRadius:8,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,background:'rgba(201,168,76,0.10)',border:'1px solid rgba(201,168,76,0.3)',color:'#c9a84c'}}>
              {saving?'Salvataggio…':'+ Salva mia giornata'}
            </button>
          )}
          {isSuperAdmin&&stagione===STAGIONE_CORRENTE&&(
            <button onClick={salvaPerTutti} disabled={saving||savingAll} style={{padding:'9px 14px',borderRadius:8,cursor:'pointer',fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,background:'rgba(34,197,94,0.10)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e'}}>
              {savingAll?'Salvataggio…':'✦ Salva per tutti'}
            </button>
          )}
        </div>
      </div>

      {/* Totali stagione */}
      {giornate.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
          {[
            {label:'Tot. Investito',val:fmt(totali.investito),color:'#e0d9d0'},
            {label:'Tot. Incasso',  val:fmt(totali.incasso),  color:'#60a5fa'},
            {label:'Tot. Saldo',    val:fmt(totali.saldo,true),color:pctColor(totali.saldo)},
          ].map(({label,val,color})=>(
            <div key={label} style={{background:'#141414',border:'1px solid #1e1e1e',borderRadius:10,padding:'12px'}}>
              <div style={{fontSize:9,color:'#555',fontFamily:"'DM Mono',monospace",marginBottom:5}}>{label}</div>
              <div style={{fontSize:15,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {giornate.length===0?(
        <div style={{padding:'60px 24px',textAlign:'center',color:'#333',fontSize:14,fontFamily:"'Sora',sans-serif",background:'#141414',border:'1px solid #1e1e1e',borderRadius:10}}>
          Nessuna giornata salvata.<br/>
          <span style={{fontSize:12,color:'#2a2a2a'}}>Inserisci le partite nella Slot e premi "Salva giornata".</span>
        </div>
      ):(
        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <table style={{borderCollapse:'collapse',minWidth:`${160+giornate.length*100}px`,width:'100%'}}>
            <thead>
              <tr>
                <th style={TH({sticky:true})}></th>
                <th style={TH({color:'#555'})}>Totale</th>
                {giornate.map(g=>(
                  <th key={g.id} style={TH({color:'#c9a84c'})}>
                    <div style={{fontWeight:700}}>Week {g.week_number}</div>
                    <div style={{fontSize:9,color:'#666',marginTop:2}}>{g.data}</div>
                    {isSuperAdmin&&stagione===STAGIONE_CORRENTE&&(
                      <button onClick={()=>confirmIdx===g.id?eliminaGiornata(g.id):setConfirmIdx(g.id)}
                        style={{fontSize:9,color:confirmIdx===g.id?'#ef4444':'#333',background:'none',border:'none',cursor:'pointer',marginTop:2}}>
                        {confirmIdx===g.id?'⚠️ Conferma':'✕'}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEZIONI.map(sez=>(
                <>
                  <tr key={`h-${sez.key}`}>
                    <td colSpan={2+giornate.length} style={{padding:'10px 10px 4px',fontSize:9,fontWeight:700,color:'#c9a84c',fontFamily:"'DM Mono',monospace",textTransform:'uppercase',letterSpacing:'0.08em',background:'#0d0d0d',borderTop:'1px solid #1a1a1a'}}>
                      {sez.label}
                    </td>
                  </tr>
                  {SPIN_LABELS.map((label,si)=>{
                    const spinTot=giornate.reduce((s,g)=>{
                      const d=g.spins?.[si];if(!d) return s
                      const v=getSpinVal(sez.key,d);return v!==null?s+v:s
                    },0)
                    return (
                      <tr key={`${sez.key}-${si}`}>
                        <td style={TD({label:true})}>{label}</td>
                        <td style={TD({color:sez.key==='saldo'||sez.key==='pct'?pctColor(spinTot):'#888'})}>
                          {sez.key==='pct'?'—':fmt(spinTot,sez.key==='saldo')}
                        </td>
                        {giornate.map(g=>{
                          const d=g.spins?.[si]
                          if (!d) return <td key={g.id} style={TD({muted:true})}>—</td>
                          let val,color
                          if (sez.key==='investito'){val=fmt(d.investito);color='#888'}
                          else if (sez.key==='incasso'){val=fmt(d.incasso);color='#60a5fa'}
                          else if (sez.key==='saldo'){val=fmt(d.saldo,true);color=pctColor(d.saldo)}
                          else{val=fmtPct(d.saldo,d.investito);color=pctColor(d.saldo)}
                          return <td key={g.id} style={TD({color})}>{val}</td>
                        })}
                      </tr>
                    )
                  })}
                  <tr key={`tot-${sez.key}`} style={{background:'#111'}}>
                    <td style={TD({label:true,bold:true})}>
                      {sez.key==='investito'?'Tot Investiti':sez.key==='incasso'?'Tot Incassati':sez.key==='saldo'?'Tot Saldo':'Tot %'}
                    </td>
                    <td style={TD({bold:true,color:sez.key==='saldo'||sez.key==='pct'?pctColor(totali.saldo):'#e0d9d0'})}>
                      {sez.key==='pct'?fmtPct(totali.saldo,totali.investito):sez.key==='investito'?fmt(totali.investito):sez.key==='incasso'?fmt(totali.incasso):fmt(totali.saldo,true)}
                    </td>
                    {giornate.map(g=>{
                      let val,color
                      if (sez.key==='investito'){val=fmt(g.tot_investito);color='#e0d9d0'}
                      else if (sez.key==='incasso'){val=fmt(g.tot_incasso);color='#60a5fa'}
                      else if (sez.key==='saldo'){val=fmt(g.tot_saldo,true);color=pctColor(g.tot_saldo)}
                      else{val=fmtPct(g.tot_saldo,g.tot_investito);color=pctColor(g.tot_saldo)}
                      return <td key={g.id} style={TD({bold:true,color})}>{val}</td>
                    })}
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TH({sticky,color}={}) {
  return {padding:'8px 10px',fontSize:11,fontWeight:600,color:color||'#e0d9d0',fontFamily:"'DM Mono',monospace",background:'#0d0d0d',borderBottom:'1px solid #1a1a1a',textAlign:'center',whiteSpace:'nowrap',
    ...(sticky?{position:'sticky',left:0,zIndex:2,background:'#0d0d0d',textAlign:'left'}:{})}
}
function TD({label,bold,color,muted}={}) {
  return {padding:'7px 10px',fontSize:bold?13:12,fontWeight:bold?700:400,color:muted?'#333':color||'#888',fontFamily:"'DM Mono',monospace",borderBottom:'1px solid #181818',textAlign:label?'left':'center',whiteSpace:'nowrap',
    ...(label?{position:'sticky',left:0,background:'#141414',zIndex:1,minWidth:100}:{})}
}
