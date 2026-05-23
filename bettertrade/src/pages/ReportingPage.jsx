import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabase'

const STORAGE_KEY = 'bt_reporting'
const SPIN_LABELS = ['Spin 1','Spin 2','Spin 3','Spin 4']

function loadReporting() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] }
  catch { return [] }
}
function saveReporting(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function fmt(n, showSign=false) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  const abs = Math.abs(n).toFixed(2)
  const sign = n < 0 ? '-' : (showSign && n > 0 ? '+' : '')
  return `${sign}€${abs}`
}
function fmtPct(saldo, investito) {
  if (!investito || investito === 0) return '—'
  const p = (saldo / investito * 100).toFixed(1)
  return p > 0 ? `+${p}%` : `${p}%`
}
function pctColor(saldo) {
  if (!saldo) return '#555'
  return saldo > 0 ? '#22c55e' : saldo < 0 ? '#ef4444' : '#555'
}

// Calcola investito di una spin dato il bankroll base
function calcInvestito(sched) {
  return sched.tris * 5 + sched.quaterna * 2 + sched.full
}

// Calcola incasso di una spin dai tiles
function calcIncasso(tiles, sched) {
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
  let totale = 0
  for (const c of COMBOS) {
    const rel = c.pos.map(p => tiles.find(t => t.id === p))
    const tutteWin = rel.every(t => t?.result === 'win')
    if (!tutteWin) continue
    const punt = c.tipo==='tris' ? sched.tris : c.tipo==='quaterna' ? sched.quaterna : sched.full
    const odds = rel.reduce((a, t) => a * (parseFloat(t?.quota)||1), 1)
    totale += punt * odds
  }
  return totale
}

export default function ReportingPage() {
  const {
    currentUser, users, fetchUsers,
    isSuperAdmin, isAdmin,
    pct, numSlot,
    getMyBase, calcSchedule, updateBankroll,
  } = useAuth()

  const [giornate, setGiornate] = useState(loadReporting)
  const [saving, setSaving]     = useState(false)
  const [confirmIdx, setConfirmIdx] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  // Legge le spin dal localStorage della griglia
  function getSpinsData() {
    try {
      const raw = localStorage.getItem('bt_spins')
      return raw ? JSON.parse(raw) : [[], [], [], []]
    } catch { return [[], [], [], []] }
  }

  async function salvaGiornata() {
    setSaving(true)
    const spins = getSpinsData()
    const oggi  = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })

    // Calcola per ogni utente (e superadmin vede aggregato)
    const myBase  = getMyBase()
    const mySched = calcSchedule(myBase)

    const spinData = SPIN_LABELS.map((_, si) => {
      const tiles = spins[si] || []
      const hasData = tiles.some(t => t.casa || t.result)
      if (!hasData) return null
      const investito = calcInvestito(mySched)
      const incasso   = calcIncasso(tiles, mySched)
      const saldo     = incasso - investito
      return { investito, incasso, saldo }
    })

    const totInvestito = spinData.reduce((s, d) => s + (d?.investito||0), 0)
    const totIncasso   = spinData.reduce((s, d) => s + (d?.incasso||0), 0)
    const totSaldo     = totIncasso - totInvestito

    const nuovaGiornata = {
      id: Date.now(),
      data: oggi,
      spins: spinData,
      totInvestito,
      totIncasso,
      totSaldo,
    }

    const updated = [...giornate, nuovaGiornata]
    setGiornate(updated)
    saveReporting(updated)

    // Aggiorna bankroll live: bankroll attuale + saldo giornata
    const nuovoBankroll = (currentUser.bankroll || 0) + totSaldo
    await updateBankroll(currentUser.id, nuovoBankroll)

    setSaving(false)
  }

  function eliminaGiornata(id) {
    const updated = giornate.filter(g => g.id !== id)
    setGiornate(updated)
    saveReporting(updated)
    setConfirmIdx(null)
  }

  const SEZIONI = [
    { key:'investito', label:'Investiti',  getValue: (d) => d?.investito ?? null },
    { key:'incasso',   label:'Incasso',    getValue: (d) => d?.incasso   ?? null },
    { key:'saldo',     label:'Saldo',      getValue: (d) => d?.saldo     ?? null },
    { key:'pct',       label:'Saldo %',    getValue: (d) => d ? fmtPct(d.saldo, d.investito) : '—', raw: true },
  ]

  const totali = {
    investito: giornate.reduce((s,g) => s + (g.totInvestito||0), 0),
    incasso:   giornate.reduce((s,g) => s + (g.totIncasso||0), 0),
    saldo:     giornate.reduce((s,g) => s + (g.totSaldo||0), 0),
  }

  return (
    <div style={{ padding:'16px' }}>
      <div style={{ fontSize:9, color:'#c9a84c', fontFamily:"'DM Mono',monospace", letterSpacing:4, marginBottom:4 }}>REPORTING</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ fontSize:20, fontWeight:700, color:'#e0d9d0', fontFamily:"'Sora',sans-serif" }}>Giornate</div>
        {isAdmin && (
          <button onClick={salvaGiornata} disabled={saving} style={{
            padding:'9px 18px', borderRadius:8, cursor:'pointer',
            fontFamily:"'Sora',sans-serif", fontSize:13, fontWeight:600,
            background:'rgba(201,168,76,0.15)', border:'1px solid rgba(201,168,76,0.4)', color:'#c9a84c',
          }}>
            {saving ? 'Salvataggio…' : '+ Salva giornata'}
          </button>
        )}
      </div>

      {/* Totali stagione */}
      {giornate.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Tot. Investito', val: fmt(totali.investito), color:'#e0d9d0' },
            { label:'Tot. Incasso',   val: fmt(totali.incasso),   color:'#60a5fa' },
            { label:'Tot. Saldo',     val: fmt(totali.saldo, true), color: pctColor(totali.saldo) },
          ].map(({label,val,color}) => (
            <div key={label} style={{ background:'#141414', border:'1px solid #1e1e1e', borderRadius:10, padding:'12px' }}>
              <div style={{ fontSize:9, color:'#555', fontFamily:"'DM Mono',monospace", marginBottom:5 }}>{label}</div>
              <div style={{ fontSize:15, fontWeight:700, color, fontFamily:"'DM Mono',monospace" }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {giornate.length === 0 ? (
        <div style={{ padding:'60px 24px', textAlign:'center', color:'#333', fontSize:14, fontFamily:"'Sora',sans-serif", background:'#141414', border:'1px solid #1e1e1e', borderRadius:10 }}>
          Nessuna giornata salvata.<br/>
          <span style={{ fontSize:12, color:'#2a2a2a' }}>Inserisci le partite nella Slot e premi "Salva giornata".</span>
        </div>
      ) : (
        /* Tabella scrollabile orizzontalmente */
        <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
          <table style={{ borderCollapse:'collapse', minWidth: `${180 + giornate.length * 100}px`, width:'100%' }}>
            {/* Header date */}
            <thead>
              <tr>
                <th style={TH({ sticky:true })}></th>
                <th style={TH({ color:'#555' })}>Totale</th>
                {giornate.map(g => (
                  <th key={g.id} style={TH({ color:'#c9a84c' })}>
                    <div>{g.data}</div>
                    {isSuperAdmin && (
                      <button onClick={() => confirmIdx===g.id ? eliminaGiornata(g.id) : setConfirmIdx(g.id)}
                        style={{ fontSize:9, color: confirmIdx===g.id?'#ef4444':'#333', background:'none', border:'none', cursor:'pointer', marginTop:2 }}>
                        {confirmIdx===g.id ? '⚠️ Conferma' : '✕'}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SEZIONI.map(sez => (
                <>
                  {/* Header sezione */}
                  <tr key={`h-${sez.key}`}>
                    <td colSpan={2 + giornate.length} style={{
                      padding:'10px 10px 4px',
                      fontSize:9, fontWeight:700, color:'#c9a84c',
                      fontFamily:"'DM Mono',monospace", textTransform:'uppercase', letterSpacing:'0.08em',
                      background:'#0d0d0d', borderTop:'1px solid #1a1a1a',
                    }}>{sez.label}</td>
                  </tr>

                  {/* Righe spin */}
                  {SPIN_LABELS.map((label, si) => {
                    const totSpin = giornate.reduce((s, g) => {
                      const d = g.spins?.[si]
                      if (!d) return s
                      return s + (sez.key==='investito' ? d.investito : sez.key==='incasso' ? d.incasso : sez.key==='saldo' ? d.saldo : 0)
                    }, 0)

                    return (
                      <tr key={`${sez.key}-${si}`}>
                        <td style={TD({ label:true })}>{label}</td>
                        <td style={TD({ color: sez.key==='saldo'||sez.key==='pct' ? pctColor(totSpin) : '#888' })}>
                          {sez.key==='pct' ? '—' : fmt(totSpin, sez.key==='saldo')}
                        </td>
                        {giornate.map(g => {
                          const d = g.spins?.[si]
                          if (!d) return <td key={g.id} style={TD({ muted:true })}>—</td>
                          let val, color
                          if (sez.key==='investito') { val=fmt(d.investito); color='#888' }
                          else if (sez.key==='incasso') { val=fmt(d.incasso); color='#60a5fa' }
                          else if (sez.key==='saldo') { val=fmt(d.saldo, true); color=pctColor(d.saldo) }
                          else { val=fmtPct(d.saldo, d.investito); color=pctColor(d.saldo) }
                          return <td key={g.id} style={TD({ color })}>{val}</td>
                        })}
                      </tr>
                    )
                  })}

                  {/* Riga totale sezione */}
                  <tr key={`tot-${sez.key}`} style={{ background:'#111' }}>
                    <td style={TD({ label:true, bold:true })}>
                      {sez.key==='investito' ? 'Tot Investiti' : sez.key==='incasso' ? 'Tot Incassati' : sez.key==='saldo' ? 'Tot Saldo' : 'Tot %'}
                    </td>
                    <td style={TD({ bold:true, color: sez.key==='saldo'||sez.key==='pct' ? pctColor(totali.saldo) : '#e0d9d0' })}>
                      {sez.key==='pct' ? fmtPct(totali.saldo, totali.investito) : sez.key==='investito' ? fmt(totali.investito) : sez.key==='incasso' ? fmt(totali.incasso) : fmt(totali.saldo, true)}
                    </td>
                    {giornate.map(g => {
                      let val, color
                      if (sez.key==='investito') { val=fmt(g.totInvestito); color='#e0d9d0' }
                      else if (sez.key==='incasso') { val=fmt(g.totIncasso); color='#60a5fa' }
                      else if (sez.key==='saldo') { val=fmt(g.totSaldo, true); color=pctColor(g.totSaldo) }
                      else { val=fmtPct(g.totSaldo, g.totInvestito); color=pctColor(g.totSaldo) }
                      return <td key={g.id} style={TD({ bold:true, color })}>{val}</td>
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

// Stili celle tabella
function TH({ sticky, color } = {}) {
  return {
    padding:'8px 10px', fontSize:11, fontWeight:600,
    color: color||'#e0d9d0', fontFamily:"'DM Mono',monospace",
    background:'#0d0d0d', borderBottom:'1px solid #1a1a1a',
    textAlign:'center', whiteSpace:'nowrap',
    ...(sticky ? { position:'sticky', left:0, zIndex:2, background:'#0d0d0d', textAlign:'left' } : {}),
  }
}
function TD({ label, bold, color, muted } = {}) {
  return {
    padding:'7px 10px', fontSize: bold?13:12,
    fontWeight: bold?700:400,
    color: muted?'#333': color||'#888',
    fontFamily:"'DM Mono',monospace",
    borderBottom:'1px solid #181818',
    textAlign: label?'left':'center', whiteSpace:'nowrap',
    ...(label ? { position:'sticky', left:0, background:'#141414', zIndex:1, minWidth:100 } : {}),
  }
}
