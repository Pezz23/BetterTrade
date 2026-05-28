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

// ── Manometro SVG ─────────────────────────────────────────────────────────────
// Semicerchio: -100% (sx, 180°) → 0% (cima, 90°) → +500% (dx, 0°)
function Manometro({ pct }) {
  const val = Math.max(-100, Math.min(500, pct || 0))
  // Mappa: -100→180°, 0→90°, +500→0°
  const pctToAngle = v => 180 - ((v + 100) / 600) * 180
  const angle = pctToAngle(val)
  const needleColor = val < 0 ? '#ef4444' : val < 100 ? '#f59e0b' : '#22c55e'

  const cx = 160, cy = 150, r = 110
  const rad = angle * Math.PI / 180
  const x2  = cx + r * Math.cos(rad)
  const y2  = cy - r * Math.sin(rad)  // -sin perché SVG y è invertita

  // Arco: angoli in gradi, sweep=0 (antiorario in SVG con y invertita)
  function arcPath(startPct, endPct, radius) {
    const a1  = pctToAngle(startPct) * Math.PI / 180
    const a2  = pctToAngle(endPct)   * Math.PI / 180
    const x1s = cx + radius * Math.cos(a1)
    const y1s = cy - radius * Math.sin(a1)
    const x2e = cx + radius * Math.cos(a2)
    const y2e = cy - radius * Math.sin(a2)
    const deg = Math.abs(endPct - startPct) / 600 * 180
    const large = deg > 180 ? 1 : 0
    // sweep=0 → antiorario (da sx verso destra passando per cima)
    return `M ${x1s} ${y1s} A ${radius} ${radius} 0 ${large} 0 ${x2e} ${y2e}`
  }

  function tick(pctVal, inner, outer) {
    const a = pctToAngle(pctVal) * Math.PI / 180
    const xi = cx + inner * Math.cos(a), yi = cy - inner * Math.sin(a)
    const xo = cx + outer * Math.cos(a), yo = cy - outer * Math.sin(a)
    return `M ${xi} ${yi} L ${xo} ${yo}`
  }
  function tickLabel(pctVal, r2, label) {
    const a = pctToAngle(pctVal) * Math.PI / 180
    return { x: cx + r2*Math.cos(a), y: cy - r2*Math.sin(a), label }
  }

  const labels = [
    tickLabel(-100, 82, '-100%'),
    tickLabel(   0, 82, '0%'),
    tickLabel( 100, 82, '+100%'),
    tickLabel( 300, 82, '+300%'),
    tickLabel( 500, 82, '+500%'),
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <svg width="320" height="175" viewBox="0 0 320 175">
        {/* Sfondo arco */}
        <path d={arcPath(-100, 500, 110)} fill="none" stroke="#1a1a1a" strokeWidth="22" strokeLinecap="round"/>

        {/* Archi colorati */}
        <path d={arcPath(-100,   0, 110)} fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="butt" opacity="0.9"/>
        <path d={arcPath(   0, 100, 110)} fill="none" stroke="#f59e0b" strokeWidth="20" strokeLinecap="butt" opacity="0.9"/>
        <path d={arcPath( 100, 500, 110)} fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="butt" opacity="0.9"/>

        {/* Tacche */}
        {[-100,0,100,200,300,400,500].map(v=>(
          <path key={v} d={tick(v, 88, 98)} stroke="#333" strokeWidth="1.5"/>
        ))}
        {[-100,0,100,500].map(v=>(
          <path key={`m${v}`} d={tick(v, 84, 102)} stroke="#555" strokeWidth="2.5"/>
        ))}

        {/* Label */}
        {labels.map(({x,y,label})=>(
          <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            style={{fontSize:9, fill:'#555', fontFamily:"'DM Mono',monospace"}}>
            {label}
          </text>
        ))}

        {/* Cerchio interno */}
        <circle cx={cx} cy={cy} r={68} fill="#0d0d0d" stroke="#1e1e1e" strokeWidth="1"/>

        {/* Ago */}
        <line
          x1={cx - 16*Math.cos(rad)} y1={cy + 16*Math.sin(rad)}
          x2={x2} y2={y2}
          stroke={needleColor} strokeWidth="3.5" strokeLinecap="round"
          style={{transition:'all 0.6s ease'}}
        />
        <circle cx={x2} cy={y2} r="4" fill={needleColor} style={{transition:'all 0.6s ease'}}/>
        <circle cx={cx} cy={cy} r="10" fill="#1a1a1a" stroke={needleColor} strokeWidth="2"/>

        {/* Valore centrale */}
        <text x={cx} y={cy+28} textAnchor="middle"
          style={{fontSize:20, fontWeight:700, fill:'#e0d9d0', fontFamily:"'DM Mono',monospace"}}>
          {val > 0 ? '+' : ''}{val.toFixed(1)}%
        </text>

        {/* Maschera bordo inferiore */}
        <rect x="0" y="155" width="320" height="25" fill="#090909"/>
      </svg>
    </div>
  )
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
          {/* Manometro */}
          <div style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:12, padding:'20px 16px', marginBottom:16, display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", letterSpacing:4, textTransform:'uppercase', marginBottom:8 }}>
              {isSuperAdmin ? 'Andamento aggregato' : `Andamento · ${currentUser?.display_name||currentUser?.username}`}
            </div>
            <Manometro pct={totPct} />
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
