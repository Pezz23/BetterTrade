import { useState, useMemo } from 'react'
import { C, F, alpha } from '../theme'
import { Etichetta } from './ui'
import { tocco } from '../lib/schermo'

// "Compila in base alla quota": riempie **solo le caselle vuote** della spin
// con le partite più attendibili fra quelle che pagano almeno quanto chiedi.
//
// ⚠️ Alzando la quota si scende di attendibilità: è il senso stesso della cosa
// (Mattia: "il fatto che non ci siano partite sicure non mi interessa, mi
// assumo i rischi"), ma il conto va fatto vedere **prima** di toccare la
// griglia — quante partite restano, e da che attendibilità si parte.

const numero = t => { const n = parseFloat(String(t).replace(',', '.')); return Number.isFinite(n) ? n : null }

export default function CompilaPerQuota({ partite, daRiempire, usate = [], onCompila, onChiudi }) {
  const [testo, setTesto] = useState('1,40')
  const minimo = numero(testo)

  const scelte = useMemo(() => {
    if (minimo === null) return []
    return partite
      .filter(p => !usate.includes(p.id))
      .filter(p => (p.quotaGiocata ?? p.quotaStimata ?? 0) >= minimo)
      .sort((a, b) => b.probGiocata - a.probGiocata)
      .slice(0, daRiempire)
  }, [partite, usate, minimo, daRiempire])

  const q = p => (p.quotaGiocata ?? p.quotaStimata ?? 0).toFixed(2).replace('.', ',')

  return (
    <>
      <div onClick={onChiudi} style={{ position: 'fixed', inset: 0, zIndex: 80, background: alpha(C.fondo, 0.75) }} />
      <div style={{
        position: 'fixed', zIndex: 90, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(400px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
        background: C.pannello, border: `1px solid ${C.bordo}`, borderRadius: 12,
        boxShadow: `0 20px 48px ${alpha(C.fondo, 0.9)}`,
      }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.bordoRiga}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.testo, fontFamily: F.sans }}>Compila per quota</span>
            <button onClick={onChiudi} style={{ background: 'transparent', border: `1px solid ${C.bordo}`, borderRadius: 6, color: C.spento, cursor: 'pointer', fontSize: 13, padding: '2px 9px', fontFamily: F.mono }}>✕</button>
          </div>

          <Etichetta style={{ marginBottom: 6 }}>quota minima</Etichetta>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <input autoFocus={!tocco} value={testo} inputMode="decimal" onChange={e => setTesto(e.target.value)}
              style={{ width: 80, background: C.pozzo, border: `1px solid ${minimo === null ? C.rosso : C.bordo}`, borderRadius: 7, padding: '8px 10px', color: C.testo, fontSize: 15, fontFamily: F.mono, outline: 'none' }} />
            {['1,30', '1,40', '1,50', '1,70'].map(v => (
              <button key={v} onClick={() => setTesto(v)} style={{
                padding: '6px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11,
                background: testo === v ? alpha(C.oro, 0.15) : 'transparent',
                border: `1px solid ${testo === v ? alpha(C.oro, 0.5) : C.bordo}`, color: testo === v ? C.oro : C.fioco,
              }}>{v}</button>
            ))}
          </div>

          {/* Il conto, prima di toccare la griglia */}
          <div style={{ marginTop: 10, fontSize: 12, fontFamily: F.sans, color: C.spento, lineHeight: 1.6 }}>
            {minimo === null ? <span style={{ color: C.rosso }}>Scrivi una quota, per esempio 1,40.</span>
              : scelte.length === 0 ? <span style={{ color: C.ambra }}>Nessuna partita paga almeno {testo} fra quelle disponibili.</span>
                : <>Riempie <b style={{ color: C.testo }}>{scelte.length}</b> {scelte.length === 1 ? 'casella vuota' : 'caselle vuote'} su {daRiempire},
                  con attendibilità da <b style={{ color: C.testo }}>{(scelte[0].probGiocata * 100).toFixed(0)}%</b> a <b style={{ color: C.testo }}>{(scelte[scelte.length - 1].probGiocata * 100).toFixed(0)}%</b>.</>}
          </div>
        </div>

        <div style={{ overflowY: 'auto', padding: 6 }}>
          {scelte.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 6px', fontFamily: F.mono, fontSize: 11, borderBottom: `1px solid ${C.bordoTenue}` }}>
              <span style={{ fontFamily: F.sans, color: C.testo, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.casa} – {p.trasferta}</span>
              <span style={{ color: C.oro, flexShrink: 0 }}>@{q(p)}</span>
              <span style={{ color: C.spento, width: 36, textAlign: 'right', flexShrink: 0 }}>{(p.probGiocata * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        <div style={{ padding: 10, borderTop: `1px solid ${C.bordoRiga}` }}>
          <button disabled={scelte.length === 0} onClick={() => onCompila(scelte)} style={{
            width: '100%', background: scelte.length ? alpha(C.oro, 0.14) : 'transparent',
            border: `1px solid ${scelte.length ? alpha(C.oro, 0.45) : C.bordo}`, borderRadius: 7,
            color: scelte.length ? C.oro : C.fioco, fontSize: 13, fontWeight: 600, fontFamily: F.sans,
            padding: '10px', cursor: scelte.length ? 'pointer' : 'default',
          }}>Riempi le caselle vuote</button>
        </div>
      </div>
    </>
  )
}
