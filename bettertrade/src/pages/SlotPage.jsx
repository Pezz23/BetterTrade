import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { C, F, alpha } from '../theme'
import { DISPOSIZIONE, cellaDa } from '../lib/spin'
import { usaProssime } from '../hooks/usaProssime'
import SceltaPartita from '../components/SceltaPartita'

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
// Le giocate ammesse in una cella: quelle che le regole producono davvero
// (vedi lib/attendibilita.js). Niente X e niente doppie: la X non è mai
// l'esito più probabile (0,36% delle partite in archivio) e la doppia chance
// è stata tolta il 23/09/2026.
export const PRONOSTICI = ['1','2','1+O1,5','2+O1,5','1+O2,5','2+O2,5']
// Le prime tre spin sono agganciate alle partite vere del calendario; la
// quarta è libera — "Fun": si scrive quello che si vuole, senza collegamento.
const SPIN_LABELS = ['Spin 1','Spin 2','Spin 3','Fun']
export const SPIN_LIBERA = 3
const TIPO_COLOR  = { tris:C.verde, quaterna:C.blu, full:C.oro }
const TIPO_BG     = { tris:alpha(C.verde,0.10), quaterna:alpha(C.bluPieno,0.10), full:alpha(C.oro,0.10) }
const SLOT_GRID   = DISPOSIZIONE
const TILE_BASE   = {
  1:{bg:alpha(C.giallo,0.15),border:alpha(C.giallo,0.35),color:C.oroChiaro},
  2:{bg:alpha(C.giallo,0.15),border:alpha(C.giallo,0.35),color:C.oroChiaro},
  3:{bg:alpha(C.giallo,0.15),border:alpha(C.giallo,0.35),color:C.oroChiaro},
  4:{bg:alpha(C.giallo,0.15),border:alpha(C.giallo,0.35),color:C.oroChiaro},
  5:{bg:alpha(C.celestePieno,0.12),border:alpha(C.celestePieno,0.35),color:C.celeste},
  6:{bg:alpha(C.celestePieno,0.12),border:alpha(C.celestePieno,0.35),color:C.celeste},
  7:{bg:alpha(C.celestePieno,0.12),border:alpha(C.celestePieno,0.35),color:C.celeste},
  8:{bg:alpha(C.celestePieno,0.12),border:alpha(C.celestePieno,0.35),color:C.celeste},
  9:{bg:alpha(C.grigioMedio,0.10),border:alpha(C.grigioMedio,0.25),color:C.grigio},
}

function emptyTiles() {
  return Array.from({length:9},(_,i)=>({id:i+1,casa:'',ospite:'',pronostico:'',quota:'',data:'',result:'',prossima_id:null}))
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
  background:C.pozzo,border:`1px solid ${C.bordo}`,borderRadius:5,
  padding:'5px 6px',color:C.testo,fontSize:12,
  fontFamily:F.sans,outline:'none',width:'100%',...extra
})

// ── TabellaGriglia ────────────────────────────────────────────────────────────
function TabellaGriglia({tiles,isAdmin,onUpdate,onCambia,onReset,syncing,libera,partite}) {
  const [confirmReset,setConfirmReset]=useState(false)
  // Sulle spin agganciate la partita è una casella sola (il menu con ricerca);
  // sulla spin libera restano i due campi di testo come sempre.
  const COLS=libera?'64px 1fr 12px 1fr 52px 54px 80px':'64px 1fr 52px 54px 80px'   // 64: ci deve stare '1+O1,5'
  function handleReset() {
    if (!confirmReset){setConfirmReset(true);setTimeout(()=>setConfirmReset(false),3000);return}
    onReset();setConfirmReset(false)
  }
  return (
    <div>
      {syncing&&<div style={{fontSize:10,color:C.spento,fontFamily:F.mono,marginBottom:8,textAlign:'right'}}>⟳ Sincronizzazione…</div>}
      {!isAdmin&&<div style={{background:alpha(C.bluPieno,0.08),border:`1px solid ${alpha(C.bluPieno,0.2)}`,borderRadius:8,padding:'9px 12px',fontSize:12,color:C.blu,fontFamily:F.sans,marginBottom:12}}>Modalità lettura</div>}
      <div style={{display:'grid',gridTemplateColumns:COLS,gap:4,padding:'0 2px',marginBottom:4}}>
        {(libera?['Pron.','Casa','','Ospite','Quota','Data','Ris.']:['Pron.','Partita','Quota','Data','Ris.']).map((h,i)=>(
          <div key={`col-${i}`} style={{fontSize:9,color:C.spento,fontFamily:F.mono,textTransform:'uppercase',letterSpacing:'0.07em',textAlign:'center',padding:'4px 0'}}>{h}</div>
        ))}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {tiles.map(t=>{
          const isW=t.result==='win',isL=t.result==='loss',oggi=isOggi(t.data)
          return (
            <div key={t.id} style={{display:'grid',gridTemplateColumns:COLS,gap:4,alignItems:'center',padding:'3px 2px',
              background:oggi?alpha(C.viola,0.07):isW?alpha(C.verde,0.07):isL?alpha(C.rosso,0.07):t.id<=4?alpha(C.giallo,0.05):t.id<=8?alpha(C.celestePieno,0.05):C.card,
              border:`1px solid ${oggi?alpha(C.viola,0.7):isW?alpha(C.verde,0.22):isL?alpha(C.rosso,0.22):t.id<=4?alpha(C.giallo,0.18):t.id<=8?alpha(C.celestePieno,0.15):C.bordoRiga}`,
              boxShadow:oggi?`0 0 8px ${alpha(C.viola,0.35)}, inset 0 0 12px ${alpha(C.viola,0.05)}`:'none',
              borderRadius:7}}>
              <select style={cell({color:C.oro,fontFamily:F.mono,textAlign:'center',padding:'5px 2px'})}
                value={t.pronostico} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'pronostico',e.target.value)}>
                <option value="">-</option>{PRONOSTICI.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
              {libera?<>
                <input style={cell()} placeholder="Casa" value={t.casa} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'casa',e.target.value)}/>
                <div style={{fontSize:10,color:C.fantasma,textAlign:'center',fontFamily:F.mono}}>-</div>
                <input style={cell()} placeholder="Ospite" value={t.ospite} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'ospite',e.target.value)}/>
              </>:
                <SceltaPartita casa={t.casa} ospite={t.ospite} collegata={!!t.prossima_id} partite={partite}
                  disabled={!isAdmin}
                  onScegli={p=>onCambia(t.id,cellaDa(t.id,p))}
                  onLibera={()=>onCambia(t.id,{id:t.id,casa:'',ospite:'',pronostico:'',quota:'',data:'',result:'',prossima_id:null})}/>
              }
              <input style={cell({textAlign:'center',color:C.oro,padding:'5px 4px'})}
                type="number" step="0.01" min="1" placeholder="@"
                value={t.quota} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'quota',e.target.value)}/>
              <input style={cell({textAlign:'center',color:oggi?C.ambra:C.testo,fontSize:11,padding:'5px 3px'})}
                placeholder="gg/mm" value={t.data} disabled={!isAdmin} onChange={e=>onUpdate(t.id,'data',e.target.value)}/>
              <select style={cell({
                color:t.result==='win'?C.verde:t.result==='loss'?C.rosso:C.spento,
                fontFamily:F.mono,textAlign:'center',padding:'5px 2px',
                background:t.result==='win'?alpha(C.verde,0.08):t.result==='loss'?alpha(C.rosso,0.08):C.pozzo,
                border:`1px solid ${t.result==='win'?alpha(C.verde,0.3):t.result==='loss'?alpha(C.rosso,0.3):C.bordo}`})}
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
          <button onClick={handleReset} style={{padding:'9px 28px',borderRadius:8,cursor:'pointer',fontFamily:F.sans,fontSize:13,fontWeight:600,
            border:`1px solid ${confirmReset?alpha(C.rosso,0.5):C.bordo}`,
            background:confirmReset?alpha(C.rosso,0.12):'transparent',
            color:confirmReset?C.rosso:C.inattivo,transition:'all .2s'}}>
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
    if (t.result==='win') return {bg:alpha(C.verde,0.20),border:alpha(C.verde,0.60),color:C.verde,glow:true,glowColor:alpha(C.verde,0.4)}
    if (t.result==='loss') return {bg:alpha(C.rosso,0.15),border:alpha(C.rosso,0.50),color:C.rosso,glow:false}
    // Ancora da giocare: resta del suo colore di posizione (giallo agli angoli,
    // celeste ai lati, grigio al centro). Spegnerle tutte, col fondo opaco
    // sotto, le faceva sembrare nere.
    return {bg:base.bg,border:base.border,color:base.color,glow:false}
  }
  const winCombos=COMBOS.filter(c=>comboStatus(tiles,c.pos)==='win')
  return (
    <div style={{marginTop:20,paddingTop:16,borderTop:`1px solid ${C.bordoRiga}`}}>
      <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,letterSpacing:4,textTransform:'uppercase',marginBottom:12,textAlign:'center'}}>Slot</div>
      {/* Nove caselle attaccate: il bordo esterno è spesso, le righe interne
          sono solo lo sfondo che passa fra le celle (gap di 1px). */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,width:'100%',
        background:C.bianco,border:`3px solid ${C.oro}`,overflow:'hidden',
        boxShadow:`0 0 0 1px ${C.quasiNero}`}}>
        {SLOT_GRID.flat().map(partita=>{
          const ts=getTileStyle(partita),t=tiles.find(t=>t.id===partita)
          // La tinta della casella è semitrasparente e sotto passa la griglia
          // bianca: senza un fondo opaco le caselle si illuminano di biancastro.
          return (
            <div key={partita} style={{background:`linear-gradient(${ts.bg},${ts.bg}), ${C.card}`,padding:'14px 6px',textAlign:'center',
              boxShadow:ts.glow?`inset 0 0 14px ${ts.glowColor}`:'none',transition:'background 0.3s ease'}}>
              <div style={{fontSize:11,fontWeight:700,color:ts.color,fontFamily:F.mono,marginBottom:2,opacity:0.65}}>{partita}</div>
              {/* L'esito prende il posto del pronostico sulla stessa riga: una
                  riga in più cambiava l'altezza della casella. */}
              <div style={{fontSize:t?.result?18:14,fontWeight:700,color:ts.color,fontFamily:F.mono,lineHeight:1.2}}>
                {t?.result==='win'?'✓':t?.result==='loss'?'✗':(t?.pronostico||'-')}
              </div>
            </div>
          )
        })}
      </div>
      {winCombos.length>0&&(
        <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center'}}>
          {winCombos.map(c=>(
            <div key={c.id} style={{fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:20,background:TIPO_BG[c.tipo],color:TIPO_COLOR[c.tipo],border:`1px solid ${TIPO_COLOR[c.tipo]}55`,fontFamily:F.mono,boxShadow:`0 0 8px ${TIPO_COLOR[c.tipo]}44`}}>
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
          {label:'Tris ×5',val:isWip?'WIP':`€${sched.tris}`,color:C.verde},
          {label:'Quaterna ×2',val:isWip?'WIP':`€${sched.quaterna}`,color:C.blu},
          {label:'Full ×1',val:isWip?'WIP':`€${sched.full}`,color:C.oro},
          {label:'Tot. inv.',val:isWip?'WIP':`€${sched.totale}`,color:C.testo},
        ].map(({label,val,color})=>(
          <div key={label} style={{flex:1,minWidth:70,background:C.card,border:`1px solid ${C.bordo}`,borderRadius:8,padding:'8px 10px'}}>
            <div style={{fontSize:9,color:C.spento,fontFamily:F.mono,marginBottom:3}}>{label}</div>
            <div style={{fontSize:14,fontWeight:700,color,fontFamily:F.mono}}>{val}</div>
          </div>
        ))}
      </div>
      {COMBOS.map(c=>{
        const status=comboStatus(tiles,c.pos),isW=status==='win',isL=status==='loss'
        const punt=puntata(c.tipo),odds=comboOdds(tiles,c.pos),vincita=(punt*odds).toFixed(2),ins=inserite[c.id]
        return (
          <div key={c.id} style={{background:isW?alpha(C.verde,0.06):isL?alpha(C.rosso,0.06):C.card,border:`1px solid ${isW?alpha(C.verde,0.25):isL?alpha(C.rosso,0.25):C.bordo}`,borderRadius:12,padding:'12px 14px',opacity:ins?0.75:1}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:TIPO_BG[c.tipo],color:TIPO_COLOR[c.tipo],fontFamily:F.mono}}>{c.tipo.toUpperCase()}</span>
                <span style={{fontSize:13,fontWeight:600,color:C.testo,fontFamily:F.sans}}>{c.nome}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {isWip?<span style={{fontSize:12,color:C.ambra,background:alpha(C.ambra,0.1),border:`1px solid ${alpha(C.ambra,0.2)}`,borderRadius:20,padding:'2px 10px',fontFamily:F.mono}}>WIP</span>
                :<span style={{fontSize:16,fontWeight:700,color:TIPO_COLOR[c.tipo],fontFamily:F.mono}}>€{punt}</span>}
                {isAdmin&&<button onClick={()=>toggle(c.id)} style={{fontSize:11,padding:'4px 10px',borderRadius:6,cursor:'pointer',fontFamily:F.sans,border:`1px solid ${ins?alpha(C.verde,0.3):C.bordo}`,background:ins?alpha(C.verde,0.12):'transparent',color:ins?C.verde:C.spento}}>{ins?'✓ Inserita':'Inserisci'}</button>}
                {!isAdmin&&ins&&<span style={{fontSize:11,color:C.verde}}>✓ Inserita</span>}
              </div>
            </div>
            {isW&&!isWip&&(
              <div style={{display:'flex',justifyContent:'space-between',background:alpha(C.verde,0.08),border:`1px solid ${alpha(C.verde,0.15)}`,borderRadius:7,padding:'6px 10px',marginBottom:8}}>
                <span style={{fontSize:11,color:C.grigio,fontFamily:F.sans}}>Vincita potenziale</span>
                <span style={{fontSize:14,fontWeight:700,color:C.verde,fontFamily:F.mono}}>€{vincita}</span>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {c.pos.map(pos=>{
                const t=tiles.find(t=>t.id===pos);if(!t) return null
                const oggi=isOggi(t.data)
                return (
                  <div key={pos} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderBottom:`1px solid ${C.bordoTenue}`}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:oggi?C.ambra:C.quasiNero,flexShrink:0,boxShadow:oggi?`0 0 6px ${alpha(C.ambra,0.6)}`:''}}/>
                    <span style={{fontSize:11,color:C.oro,fontFamily:F.mono,fontWeight:700,minWidth:14}}>{t.pronostico||'-'}</span>
                    <span style={{flex:1,fontSize:12,color:t.casa?C.testo:C.fantasma,fontFamily:F.sans}}>{t.casa||`Pos.${pos}`}{t.ospite?` - ${t.ospite}`:''}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                      {t.quota&&<span style={{fontSize:10,color:C.oro,fontFamily:F.mono}}>@{t.quota}</span>}
                      {t.data&&<span style={{fontSize:10,color:oggi?C.ambra:C.fioco,fontFamily:F.mono}}>{t.data}{oggi?' 🔴':''}</span>}
                      {t.result==='win'&&<span style={{fontSize:10,color:C.verde}}>✓</span>}
                      {t.result==='loss'&&<span style={{fontSize:10,color:C.rosso}}>✗</span>}
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
  // Le partite future valutate: le stesse della pagina Partite e delle spin
  // provvisorie, dallo stesso hook.
  const {righe:partite} = usaProssime()
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

  // Sostituisce l'intera casella: serve quando si sceglie una partita dal
  // calendario, che porta con sé squadre, data, giocata, quota e prossima_id.
  function cambiaTile(id,cella) {
    setSpins(prev=>prev.map((spin,si)=>si===activeSpin?spin.map(t=>t.id===id?{...cella,result:t.result}:t):spin))
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
          <button key={label} onClick={()=>setActiveSpin(i)} style={{flex:1,padding:'8px 4px',borderRadius:8,cursor:'pointer',fontFamily:F.mono,fontSize:11,fontWeight:600,letterSpacing:1,
            background:activeSpin===i?alpha(C.oro,0.12):'transparent',
            border:`1px solid ${activeSpin===i?alpha(C.oro,0.4):C.bordo}`,
            color:activeSpin===i?C.oro:C.inattivo}}>{label.toUpperCase()}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:6,marginBottom:16}}>
        {[{id:'griglia',label:'🎰 Griglia'},{id:'schedine',label:'📋 Schedine'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:'8px',borderRadius:8,cursor:'pointer',fontFamily:F.sans,fontSize:13,fontWeight:600,
            background:activeTab===t.id?alpha(C.oro,0.08):'transparent',
            border:`1px solid ${activeTab===t.id?alpha(C.oro,0.25):C.bordo}`,
            color:activeTab===t.id?C.oro:C.spento}}>{t.label}</button>
        ))}
      </div>
      {activeTab==='griglia'
        ?<TabellaGriglia tiles={tiles} isAdmin={isAdmin} onUpdate={updateTile} onCambia={cambiaTile}
           onReset={resetSpin} syncing={syncing} libera={activeSpin===SPIN_LIBERA} partite={partite}/>
        :<Schedine tiles={tiles} isAdmin={isAdmin} sched={sched} isWip={isWip} spinIdx={activeSpin}/>
      }
    </div>
  )
}
