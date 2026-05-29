import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const COMBOS = [
  { tipo:'tris',    pos:[1,5,2] },
  { tipo:'tris',    pos:[1,9,4] },
  { tipo:'tris',    pos:[6,9,7] },
  { tipo:'tris',    pos:[3,8,4] },
  { tipo:'tris',    pos:[3,9,2] },
  { tipo:'quaterna',pos:[1,2,3,4] },
  { tipo:'quaterna',pos:[5,6,7,8] },
  { tipo:'full',    pos:[1,2,3,4,5,6,7,8,9] },
]

function calcInvestito(sched) {
  return sched.tris*5 + sched.quaterna*2 + sched.full
}
function calcIncasso(tiles, sched) {
  let tot = 0
  for (const c of COMBOS) {
    const rel = c.pos.map(p => tiles.find(t => t.id===p))
    if (!rel.every(t => t?.result==='win')) continue
    const punt = c.tipo==='tris' ? sched.tris : c.tipo==='quaterna' ? sched.quaterna : sched.full
    const odds = rel.reduce((a,t) => a*(parseFloat(t?.quota)||1), 1)
    tot += punt * odds
  }
  return tot
}

// ── DashboardPage ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, isSuperAdmin, getMyBase, getTotalBase, calcSchedule } = useAuth()
  const [spins, setSpins]     = useState([[], [], [], []])
  const [loading, setLoading] = useState(true)

  // Carica spin da Supabase ogni 15 secondi
  useEffect(() => {
    loadSpins()
    const interval = setInterval(loadSpins, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadSpins() {
    const { data } = await supabase.from('griglia').select('spins').eq('id',1).single()
    if (data?.spins) setSpins(data.spins)
    setLoading(false)
  }

  const base  = isSuperAdmin ? getTotalBase() : getMyBase()
  const sched = calcSchedule(base)

  // Calcola totali su tutte le spin
  const spinResults = [0,1,2,3].map(si => {
    const rawTiles = spins[si] || []
    if (!rawTiles.some(t => t.casa)) return null
    // Normalizza result da Supabase
    const tiles = rawTiles.map(t=>({
      ...t,
      result: t.result===true||t.result===1?'win':
              t.result===false||t.result===0?'loss':
              (t.result||'').toString().toLowerCase()
    }))
    const investito = calcInvestito(sched)
    const incasso   = parseFloat(calcIncasso(tiles, sched).toFixed(2))
    const saldo     = parseFloat((incasso - investito).toFixed(2))
    const pct       = investito > 0 ? (saldo / investito * 100) : 0
    return { investito, incasso, saldo, pct }
  })

  const totInvestito = spinResults.reduce((s,r) => s+(r?.investito||0), 0)
  const totIncasso   = spinResults.reduce((s,r) => s+(r?.incasso||0), 0)
  const totSaldo     = parseFloat((totIncasso - totInvestito).toFixed(2))
  const totPct       = totInvestito > 0 ? (totSaldo / totInvestito * 100) : 0

  const hasAnyData   = spinResults.some(r => r !== null)

  function fmt(n, sign=false) {
    const abs = Math.abs(n).toFixed(2)
    const s   = n < 0 ? '-' : (sign && n > 0 ? '+' : '')
    return `${s}€${abs}`
  }
  function pctColor(v) { return v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#555' }

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4, marginBottom:4 }}>DASHBOARD</div>
      <div style={{ fontSize:20, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif", marginBottom:4 }}>
        Andamento giornata
      </div>
      <div style={{ fontSize:12, color:'#555', fontFamily:"'Sora',sans-serif", marginBottom:20 }}>
        Live · aggiornamento ogni 15 secondi
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#555', fontFamily:"'Sora',sans-serif" }}>Caricamento…</div>
      ) : !hasAnyData ? (
        <div style={{ textAlign:'center', padding:'60px 24px', color:'#333', fontSize:14, fontFamily:"'Sora',sans-serif", background:'#141414', border:'1px solid #1e1e1e', borderRadius:10 }}>
          Nessuna partita inserita oggi.<br/>
          <span style={{ fontSize:12, color:'#2a2a2a' }}>Inserisci le partite nella Slot per vedere l'andamento live.</span>
        </div>
      ) : (
        <>
          {/* Saldo principale */}
          <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:12, padding:'24px 16px', marginBottom:16, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", letterSpacing:4, textTransform:'uppercase' }}>
              {isSuperAdmin ? 'Andamento aggregato' : `Andamento · ${currentUser?.display_name||currentUser?.username}`}
            </div>
            <div style={{ fontSize:48, fontWeight:700, fontFamily:"'DM Mono',monospace", color: totPct >= 0 ? '#22c55e' : '#ef4444', lineHeight:1, transition:'color 0.3s' }}>
              {totPct > 0 ? '+' : ''}{totPct.toFixed(1)}%
            </div>
            <div style={{ fontSize:13, color:'#555', fontFamily:"'DM Mono',monospace" }}>
              {totSaldo >= 0 ? '+' : ''}€{Math.abs(totSaldo).toFixed(2)} sulla giornata
            </div>
          </div>

          {/* Totali */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'Investito',  val: fmt(totInvestito),      color:'#e0d9d0' },
              { label:'Incasso',    val: fmt(totIncasso),         color:'#60a5fa' },
              { label:'Saldo €',    val: fmt(totSaldo, true),     color: pctColor(totSaldo) },
              { label:'Saldo %',    val: `${totPct>0?'+':''}${totPct.toFixed(1)}%`, color: pctColor(totPct) },
            ].map(({label,val,color}) => (
              <div key={label} style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{label}</div>
                <div style={{ fontSize:20, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Dettaglio per spin */}
          <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
            Dettaglio spin
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {spinResults.map((r, i) => (
              <div key={i} style={{
                background:'#141414', border:`1px solid ${r ? (r.saldo>0?'rgba(34,197,94,0.2)':r.saldo<0?'rgba(239,68,68,0.2)':'#1e1e1e') : '#1a1a1a'}`,
                borderRadius:9, padding:'12px 16px',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                opacity: r ? 1 : 0.4,
              }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>Spin {i+1}</div>
                  {r ? (
                    <div style={{ fontSize:11, color:'#444', fontFamily:"'DM Mono',monospace", marginTop:2 }}>
                      Inv: {fmt(r.investito)} · Inc: {fmt(r.incasso)}
                    </div>
                  ) : (
                    <div style={{ fontSize:11, color:'#333', fontFamily:"'DM Mono',monospace", marginTop:2 }}>Nessuna partita</div>
                  )}
                </div>
                {r && (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:pctColor(r.saldo), fontFamily:"'DM Mono',monospace" }}>{fmt(r.saldo, true)}</div>
                    <div style={{ fontSize:11, color:pctColor(r.pct), fontFamily:"'DM Mono',monospace" }}>{r.pct>0?'+':''}{r.pct.toFixed(1)}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
