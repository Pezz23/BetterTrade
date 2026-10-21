import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'
import { C, F, alpha, S } from '../theme'

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
  // ⚠️ La spunta "giocata" di ogni spin, dalla pagina Slot: è l'unica cosa che
  // fa partire i conti. Prima bastava che una casella avesse una squadra,
  // quindi la Dashboard mostrava soldi investiti mentre si stava ancora
  // compilando la griglia (corretto il 12/10/2026, su richiesta di Mattia).
  const [giocate, setGiocate] = useState([false, false, false, false])
  const [loading, setLoading] = useState(true)

  // Carica spin da Supabase ogni 15 secondi
  useEffect(() => {
    loadSpins()
    const interval = setInterval(loadSpins, 15000)
    return () => clearInterval(interval)
  }, [])

  async function loadSpins() {
    const { data } = await supabase.from('griglia').select('spins,giocate').eq('id',1).single()
    if (data?.spins) setSpins(data.spins)
    // ⚠️ Solo se è un array: una colonna nuova su una riga vecchia può tornare
    // null, e `null[0]` farebbe saltare tutta la pagina.
    if (Array.isArray(data?.giocate)) setGiocate(data.giocate)
    setLoading(false)
  }

  const base  = isSuperAdmin ? getTotalBase() : getMyBase()
  const sched = calcSchedule(base)

  // Calcola totali su tutte le spin
  const spinResults = [0,1,2,3].map(si => {
    const rawTiles = spins[si] || []
    // ⚠️ Due condizioni, e la prima è quella che conta: **la spin dev'essere
    // stata spuntata come giocata** nella pagina Slot. La seconda tiene fuori
    // una spin spuntata ma ancora vuota, che darebbe investito senza partite.
    if (!giocate[si]) return null
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
  // ⚠️ Due vuoti diversi, e confonderli manda la persona a fare la cosa
  // sbagliata: "non c'è niente da contare" e "c'è tutto ma manca la spunta"
  // si risolvono in due modi opposti.
  const compilate    = [0,1,2,3].filter(si => (spins[si] || []).some(t => t.casa)).length
  const daSpuntare   = compilate > 0 && !hasAnyData

  function fmt(n, sign=false) {
    const abs = Math.abs(n).toFixed(2)
    const s   = n < 0 ? '-' : (sign && n > 0 ? '+' : '')
    return `${s}€${abs}`
  }
  function pctColor(v) { return v > 0 ? C.verde : v < 0 ? C.rosso : C.spento }

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ fontSize:S.micro, color:C.oro, fontFamily:F.mono, letterSpacing:4, marginBottom:4 }}>DASHBOARD</div>
      <div style={{ fontSize:S.evidenza, fontWeight:700, color:C.testo, fontFamily:F.sans, marginBottom:4 }}>
        Andamento giornata
      </div>
      <div style={{ fontSize:S.corpo, color:C.spento, fontFamily:F.sans, marginBottom:20 }}>
        Live · aggiornamento ogni 15 secondi
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:C.spento, fontFamily:F.sans }}>Caricamento…</div>
      ) : !hasAnyData ? (
        <div style={{ textAlign:'center', padding:'60px 24px', color:C.fantasma, fontSize:S.grande, fontFamily:F.sans, background:C.card, border:`1px solid ${C.bordo}`, borderRadius:10 }}>
          {daSpuntare ? (
            <>
              {compilate === 1 ? 'Una spin è compilata' : `${compilate} spin sono compilate`}, ma nessuna è segnata come giocata.<br/>
              <span style={{ fontSize:S.corpo, color:C.bordoChiaro }}>
                Nella Slot, sotto l&apos;elenco, spunta <strong style={{ color:C.verde }}>GIOCATA</strong>: da lì la Dashboard comincia a contare.
              </span>
            </>
          ) : (
            <>
              Nessuna partita inserita oggi.<br/>
              <span style={{ fontSize:S.corpo, color:C.bordoChiaro }}>Inserisci le partite nella Slot per vedere l&apos;andamento live.</span>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Saldo principale */}
          <div style={{ background:C.card, border:`1px solid ${C.bordo}`, borderRadius:12, padding:'24px 16px', marginBottom:16, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:S.micro, color:C.spento, fontFamily:F.mono, letterSpacing:4, textTransform:'uppercase' }}>
              {isSuperAdmin ? 'Andamento aggregato' : `Andamento · ${currentUser?.display_name||currentUser?.username}`}
            </div>
            <div style={{ fontSize:S.mega, fontWeight:700, fontFamily:F.mono, color: totPct >= 0 ? C.verde : C.rosso, lineHeight:1, transition:'color 0.3s' }}>
              {totPct > 0 ? '+' : ''}{totPct.toFixed(1)}%
            </div>
            <div style={{ fontSize:S.media, color:C.spento, fontFamily:F.mono }}>
              {totSaldo >= 0 ? '+' : ''}€{Math.abs(totSaldo).toFixed(2)} sulla giornata
            </div>
          </div>

          {/* Totali */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:16 }}>
            {[
              { label:'Investito',  val: fmt(totInvestito),      color:C.testo },
              { label:'Incasso',    val: fmt(totIncasso),         color:C.blu },
              { label:'Saldo €',    val: fmt(totSaldo, true),     color: pctColor(totSaldo) },
              { label:'Saldo %',    val: `${totPct>0?'+':''}${totPct.toFixed(1)}%`, color: pctColor(totPct) },
            ].map(({label,val,color}) => (
              <div key={label} style={{ background:C.card, border:`1px solid ${C.bordo}`, borderRadius:10, padding:'14px 16px' }}>
                <div style={{ fontSize:S.micro, color:C.spento, fontFamily:F.mono, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{label}</div>
                <div style={{ fontSize:S.evidenza, fontWeight:700, color, fontFamily:F.mono }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Dettaglio per spin */}
          <div style={{ fontSize:S.micro, color:C.spento, fontFamily:F.mono, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
            Dettaglio spin
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {spinResults.map((r, i) => (
              <div key={i} style={{
                background:C.card, border:`1px solid ${r ? (r.saldo>0?alpha(C.verde,0.2):r.saldo<0?alpha(C.rosso,0.2):C.bordo) : C.bordoRiga}`,
                borderRadius:9, padding:'12px 16px',
                display:'flex', justifyContent:'space-between', alignItems:'center',
                opacity: r ? 1 : 0.4,
              }}>
                <div>
                  <div style={{ fontSize:S.media, fontWeight:600, color:C.testo, fontFamily:F.sans }}>Spin {i+1}</div>
                  {r ? (
                    <div style={{ fontSize:S.base, color:C.fioco, fontFamily:F.mono, marginTop:2 }}>
                      Inv: {fmt(r.investito)} · Inc: {fmt(r.incasso)}
                    </div>
                  ) : (
                    <div style={{ fontSize:S.base, color:C.fantasma, fontFamily:F.mono, marginTop:2 }}>Nessuna partita</div>
                  )}
                </div>
                {r && (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:S.titolo, fontWeight:700, color:pctColor(r.saldo), fontFamily:F.mono }}>{fmt(r.saldo, true)}</div>
                    <div style={{ fontSize:S.base, color:pctColor(r.pct), fontFamily:F.mono }}>{r.pct>0?'+':''}{r.pct.toFixed(1)}%</div>
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
