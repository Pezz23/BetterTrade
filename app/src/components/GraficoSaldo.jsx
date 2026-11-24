import { useState, useRef, useEffect, useMemo } from 'react'
import { C, F, S, R } from '../theme'
import { NON_GUADAGNO, NOMI_TIPO } from '../lib/registro'

// IL GRAFICO DEL SALDO (24/11/2026, lotto S6): una linea a gradini, perché i soldi
// cambiano a un evento e fra un evento e l'altro stanno fermi — una linea obliqua
// direbbe che sono cresciuti piano piano.
// ⚠️ I depositi, i prelievi e i trasferimenti **si vedono ma non sono guadagno**
// (Mattia): hanno un cerchio vuoto celeste, e il tocco dice cos'è.
// ⚠️ In SVG a mano: nel progetto non c'è una libreria di grafici. La larghezza si
// misura, così i testi non si stirano.
// ⚠️ `touch-action: pan-y`: il dito di lato legge il grafico, in su scorre la pagina.

const ALTO = 150
const M = { su: 12, giu: 22, sin: 6, des: 10 }
const eur = (x) => `€${Number(x || 0).toFixed(2)}`
const conSegno = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${eur(Math.abs(x))}`
const data = (t, ora = false) => new Date(t).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit',
  ...(ora ? { hour: '2-digit', minute: '2-digit' } : {}) })

export default function GraficoSaldo({ punti, titolo }) {
  const riquadro = useRef(null)
  const [largo, setLargo] = useState(320)
  const [sel, setSel] = useState(null)
  useEffect(() => {
    const el = riquadro.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setLargo(Math.max(200, Math.round(e.contentRect.width))))
    o.observe(el)
    return () => o.disconnect()
  }, [])
  // Cambia la vista (persona, conto): la selezione di prima non vale più.
  useEffect(() => { setSel(null) }, [punti])

  const g = useMemo(() => {
    const t0 = punti[0].t, t1 = Math.max(punti.at(-1).t, t0 + 1)
    const valori = punti.map(p => p.saldo)
    let min = Math.min(...valori), max = Math.max(...valori)
    const aria = Math.max((max - min) * 0.12, Math.abs(max) * 0.01, 1)
    min -= aria; max += aria
    const x = (t) => M.sin + (t - t0) / (t1 - t0) * (largo - M.sin - M.des)
    const y = (v) => M.su + (max - v) / (max - min) * (ALTO - M.su - M.giu)
    const p = punti.map(q => ({ ...q, x: x(q.t), y: y(q.saldo) }))
    const linea = p.map((q, i) => (i ? `H${q.x.toFixed(1)}V${q.y.toFixed(1)}` : `M${q.x.toFixed(1)},${q.y.toFixed(1)}`)).join('')
    // ⚠️ Niente riempimento: l'asse non parte da zero, e un'area piena lo farebbe credere.
    return { p, linea,
      alto: Math.max(...valori), basso: Math.min(...valori), y }
  }, [punti, largo])

  const scegli = (clientX) => {
    const px = clientX - riquadro.current.getBoundingClientRect().left
    let m = 0
    g.p.forEach((q, i) => { if (Math.abs(q.x - px) <= Math.abs(g.p[m].x - px)) m = i })
    setSel(m)
  }
  const s = sel != null ? g.p[Math.min(sel, g.p.length - 1)] : null
  const ultimo = g.p.at(-1)
  const livelli = g.alto - g.basso > 0.005 ? [g.alto, g.basso] : [g.alto]
  return (
    <div>
      <div ref={riquadro} tabIndex={0} role="img" aria-label={`${titolo}: da ${eur(g.p[0].saldo)} a ${eur(ultimo.saldo)}`}
        onPointerDown={e => scegli(e.clientX)} onPointerMove={e => scegli(e.clientX)}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setSel(null) }}
        onKeyDown={e => {
          const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
          if (passo) { e.preventDefault(); setSel(i => Math.min(g.p.length - 1, Math.max(0, (i ?? g.p.length - 1) + passo))) }
          if (e.key === 'Escape') setSel(null)
        }}
        style={{ position: 'relative', width: '100%', minWidth: 0, height: ALTO, touchAction: 'pan-y', cursor: 'crosshair', overflow: 'hidden', borderRadius: R.m }}>
        <svg width={largo} height={ALTO} style={{ display: 'block' }} aria-hidden="true">
          {livelli.map(v => (
            <g key={v}>
              <line x1={M.sin} x2={largo - M.des} y1={g.y(v)} y2={g.y(v)} stroke={C.bordoRiga} strokeWidth="1" />
              <text x={M.sin} y={v === g.alto ? g.y(v) - 3 : g.y(v) + 11} fill={C.spento} fontSize="10" fontFamily={F.mono}>{eur(v)}</text>
            </g>
          ))}
          <path d={g.linea} fill="none" stroke={C.oro} strokeWidth="2" strokeLinejoin="round" />
          {g.p.filter(q => NON_GUADAGNO.has(q.tipo)).map(q => (
            <circle key={q.rif} cx={q.x} cy={q.y} r="4" fill={C.card} stroke={C.celeste} strokeWidth="2" />
          ))}
          {s && <line x1={s.x} x2={s.x} y1={M.su - 6} y2={ALTO - M.giu} stroke={C.spento} strokeWidth="1" />}
          <circle cx={(s ?? ultimo).x} cy={(s ?? ultimo).y} r="5" fill={C.oro} stroke={C.card} strokeWidth="2" />
          <text x={M.sin} y={ALTO - 6} fill={C.spento} fontSize="10" fontFamily={F.mono}>{data(g.p[0].t)}</text>
          <text x={largo - M.des} y={ALTO - 6} fill={C.spento} fontSize="10" fontFamily={F.mono} textAnchor="end">oggi</text>
        </svg>
      </div>
      {/* ⚠️ La lettura sta **sotto**, in una riga di altezza fissa, e non in un
          fumetto: su un telefono il dito lo coprirebbe, e niente deve cambiare
          altezza. Gli stessi valori sono nel Registro dei soldi. */}
      <div aria-live="polite" style={{ height: 34, overflow: 'hidden', fontFamily: F.sans, fontSize: S.minuta, lineHeight: '17px', color: C.spento }}>
        {s ? <>
          <b style={{ fontFamily: F.mono, color: C.testo }}>{eur(s.saldo)}</b>
          {s.importo != null && <> · {conSegno(s.importo)}</>} · {data(s.t, true)}{s.tipo ? ` · ${NOMI_TIPO[s.tipo] ?? s.tipo}` : ''}
          <br /><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.motivo || ''}</span>
        </> : g.p.length <= 2 ? 'Dal giorno 1 non è ancora successo niente: si riempie con le prossime giocate.' : <>Tocca il grafico per leggere un evento.{g.p.some(q => NON_GUADAGNO.has(q.tipo)) && <><br /><span style={{ color: C.celeste }}>○</span> soldi entrati, usciti o spostati</>}</>}
      </div>
    </div>
  )
}
