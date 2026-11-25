import { useState, useRef, useEffect, useMemo } from 'react'
import { C, F, S, R, alpha } from '../theme'

// LE CANDELE del saldo (25/11/2026, Mattia: *"candele cinesi: giorno, settimana,
// mese"*, al posto della linea a gradini, *"inguardabile"*). Verde = il periodo ha
// guadagnato, rosso = ha perso; gli stoppini sono il massimo e il minimo toccati.
// ⚠️ SVG a mano e animazione in CSS (`.candela`): niente Motion, *"solo se essenziale"*.
// ⚠️ Il prezzo sta a **destra**, dove si guarda l'ultima candela. Si disegnano le
// ultime che ci stanno: per andare più indietro si passa a settimana o mese.
// ⚠️ `touch-action: pan-y`: il dito di lato legge, in su scorre la pagina.

const ALTO = 210
const M = { su: 14, giu: 22, sin: 2, des: 58 }
const eur = (x) => `€${Number(x || 0).toFixed(2)}`
// Sopra i 1000 € i decimali non ci stanno su un telefono: restano sulla chiusura.
const intero = (x) => (Math.abs(x) >= 1000 ? x.toFixed(0) : x.toFixed(2))
const conSegno = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${eur(Math.abs(x))}`
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const corto = (k) => (k.length === 7 ? `${MESI[Number(k.slice(5)) - 1]} ${k.slice(2, 4)}` : `${k.slice(8)}/${k.slice(5, 7)}`)
const lungo = (k, periodo) => (periodo === 'settimana' ? `sett. del ${corto(k)}` : corto(k))

/** Tacche «tonde» dentro l'intervallo: 1, 2, 2,5 o 5 per una potenza di dieci. */
function tacche(min, max, quante = 5) {
  const grezzo = (max - min) / quante, p = 10 ** Math.floor(Math.log10(grezzo))
  const passo = [1, 2, 2.5, 5, 10].map(x => x * p).find(x => x >= grezzo)
  const l = []
  for (let v = Math.ceil(min / passo) * passo; v <= max; v += passo) l.push(Math.round(v * 100) / 100)
  return l
}

export default function GraficoCandele({ candele, adesso, periodo, titolo }) {
  const riquadro = useRef(null)
  const [largo, setLargo] = useState(320)
  const [sel, setSel] = useState(null)
  useEffect(() => {
    const el = riquadro.current
    if (!el) return
    const o = new ResizeObserver(([e]) => setLargo(Math.max(220, Math.round(e.contentRect.width))))
    o.observe(el)
    return () => o.disconnect()
  }, [])
  useEffect(() => { setSel(null) }, [candele])

  const g = useMemo(() => {
    const area = largo - M.sin - M.des
    const c = candele.slice(-Math.max(1, Math.floor(area / 9)))
    // Con poche candele i posti restano almeno dodici: una sola non diventa un muro.
    const posto = area / Math.max(c.length, 12)
    const w = Math.min(16, Math.max(4, posto * 0.66))
    const valori = c.flatMap(q => [q.alto, q.basso]).concat(adesso)
    let min = Math.min(...valori), max = Math.max(...valori)
    const aria = Math.max((max - min) * 0.1, Math.abs(max) * 0.004, 1)
    min -= aria; max += aria
    const y = (v) => M.su + (max - v) / (max - min) * (ALTO - M.su - M.giu)
    return { c, y, w, x: (i) => M.sin + posto * (i + 0.5), tacche: tacche(min, max) }
  }, [candele, adesso, largo])

  const scegli = (clientX) => {
    if (!g.c.length) return
    const px = clientX - riquadro.current.getBoundingClientRect().left
    let m = 0
    g.c.forEach((_, i) => { if (Math.abs(g.x(i) - px) < Math.abs(g.x(m) - px)) m = i })
    setSel(m)
  }
  const i = sel != null ? Math.min(sel, g.c.length - 1) : g.c.length - 1
  const s = g.c[i]
  const yOra = g.y(adesso)
  const colOra = s ? (g.c.at(-1).guadagno >= 0 ? C.verde : C.rosso) : C.oro
  // Le date che ci stanno, senza accavallarsi: la prima, poi una ogni ~60px.
  const salto = Math.max(1, Math.ceil(60 / Math.max(1, g.c.length > 1 ? g.x(1) - g.x(0) : 60)))
  return (
    <div>
      {/* ⚠️ La lettura sta **sopra** e ha altezza fissa: il dito non la copre e niente salta. */}
      <div aria-live="polite" style={{ minHeight: 34, fontFamily: F.mono, fontVariantNumeric: 'tabular-nums', fontSize: S.minuta, lineHeight: '17px', color: C.spento }}>
        {s ? <>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: C.testo }}>{lungo(s.chiave, periodo)}</span>
            {' '}<b style={{ color: s.guadagno > 0 ? C.verde : s.guadagno < 0 ? C.rosso : C.testo }}>
              {conSegno(s.guadagno)}{s.apre > 0 && s.guadagno !== 0 && ` (${s.guadagno > 0 ? '+' : '−'}${Math.abs(s.guadagno / s.apre * 100).toFixed(1)}%)`}</b>
            {' '}· {s.quante} {s.quante === 1 ? 'evento' : 'eventi'}
            {s.mosso !== 0 && <span style={{ color: C.celeste }}> · mossi {conSegno(s.mosso)}</span>}
          </div>
          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            A {intero(s.apre)} · max {intero(s.alto)} · min {intero(s.basso)} · C <span style={{ color: C.testo }}>{s.chiude.toFixed(2)}</span>
          </div>
        </> : <span style={{ fontFamily: F.sans }}>Dal giorno 1 non è ancora successo niente: la prima candela nasce alla prossima giocata.</span>}
      </div>
      <div ref={riquadro} tabIndex={0} role="img" aria-label={`${titolo}: ${g.c.length} candele, adesso ${eur(adesso)}`}
        onPointerDown={e => scegli(e.clientX)} onPointerMove={e => scegli(e.clientX)}
        onPointerLeave={e => { if (e.pointerType === 'mouse') setSel(null) }}
        onKeyDown={e => {
          const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
          if (passo && g.c.length) { e.preventDefault(); setSel(k => Math.min(g.c.length - 1, Math.max(0, (k ?? g.c.length - 1) + passo))) }
          if (e.key === 'Escape') setSel(null)
        }}
        style={{ position: 'relative', width: '100%', minWidth: 0, height: ALTO, touchAction: 'pan-y', cursor: 'crosshair', overflow: 'hidden', borderRadius: R.m }}>
        <svg width={largo} height={ALTO} style={{ display: 'block' }} aria-hidden="true">
          {g.tacche.map(v => (
            <g key={v}>
              <line x1={M.sin} x2={largo - M.des} y1={g.y(v)} y2={g.y(v)} stroke={C.bordo} strokeWidth="1" />
              {/* il prezzo di adesso copre la tacca che gli sta sotto */}
              {Math.abs(g.y(v) - yOra) > 14 && (
                <text x={largo - M.des + 6} y={g.y(v) + 3} fill={C.spento} fontSize="10" fontFamily={F.mono}>{v}</text>
              )}
            </g>
          ))}
          {s && sel != null && <rect x={g.x(i) - g.w / 2 - 3} y={M.su - 8} width={g.w + 6} height={ALTO - M.su - M.giu + 10} rx="4" fill={alpha(C.testo, 0.07)} />}
          <g key={`${periodo}${candele.length}`}>
            {g.c.map((q, k) => {
              const col = q.guadagno > 0 ? C.verde : q.guadagno < 0 ? C.rosso : C.spento
              const a = g.y(Math.max(q.apre, q.chiude)), b = g.y(Math.min(q.apre, q.chiude))
              return (
                <g key={q.chiave} className="candela" style={{ animationDelay: `${Math.min(k * 25, 500)}ms` }}>
                  <line x1={g.x(k)} x2={g.x(k)} y1={g.y(q.alto)} y2={g.y(q.basso)} stroke={col} strokeWidth="1.5" />
                  <rect x={g.x(k) - g.w / 2} y={a} width={g.w} height={Math.max(2, b - a)} rx={Math.min(2, g.w / 4)} fill={col} />
                </g>
              )
            })}
          </g>
          {g.c.map((q, k) => (q.mosso !== 0
            ? <circle key={q.chiave} cx={g.x(k)} cy={ALTO - M.giu - 2} r="3" fill={C.card} stroke={C.celeste} strokeWidth="1.5" /> : null))}
          <line x1={M.sin} x2={largo - M.des} y1={yOra} y2={yOra} stroke={colOra} strokeWidth="1" strokeDasharray="2 4" />
          <rect x={largo - M.des + 1} y={yOra - 9} width={M.des - 1} height="18" rx="4" fill={colOra} />
          <text x={largo - M.des / 2 + 0.5} y={yOra + 3.5} fill={C.fondo} fontSize="10" fontWeight="700" fontFamily={F.mono} textAnchor="middle">{adesso.toFixed(2)}</text>
          {g.c.map((q, k) => (k % salto === 0 && g.x(k) < largo - M.des - 14
            ? <text key={q.chiave} x={Math.max(g.x(k), periodo === 'mese' ? 21 : 17)} y={ALTO - 5} fill={C.spento} fontSize="10" fontFamily={F.mono} textAnchor="middle">{corto(q.chiave)}</text> : null))}
        </svg>
      </div>
    </div>
  )
}
