import { useState, useMemo } from 'react'
import { C, F, S, SP, R, alpha } from '../theme'
import { vistaRegistro, puntiDi } from '../lib/registro'
import GraficoSaldo from './GraficoSaldo'

// L'andamento di un conto — quello comune o di una persona — dal giorno 1: guadagno,
// soldi in gioco e il grafico, per Tutto, Slot o RTW (24/11/2026, lotto S6).

const eur = (x) => `€${Number(x || 0).toFixed(2)}`
const conSegno = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${eur(Math.abs(x))}`

export default function AndamentoConto({ dati, chi, titolo }) {
  const [conto, setConto] = useState('tutto')
  const v = useMemo(() => vistaRegistro(dati, { chi, conto }), [dati, chi, conto])
  const punti = useMemo(() => puntiDi(v, dati.dal), [v, dati.dal])
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SP.s, marginBottom: SP.s }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['tutto', 'Tutto'], ['cassa', 'Slot'], ['rtw', 'RTW']].map(([k, l]) => (
            <button key={k} onClick={() => setConto(k)} aria-pressed={conto === k} style={{ padding: '6px 12px', borderRadius: R.m, cursor: 'pointer',
              background: conto === k ? alpha(C.oro, 0.14) : 'transparent', border: `1px solid ${conto === k ? alpha(C.oro, 0.5) : C.bordo}`,
              color: conto === k ? C.oro : C.spento, fontFamily: F.sans, fontSize: S.base, fontWeight: 600 }}>{l}</button>
          ))}
        </div>
        <span style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento }}>
          guadagno <b style={{ fontFamily: F.mono, color: v.guadagno > 0 ? C.verde : v.guadagno < 0 ? C.rosso : C.testo }}>{conSegno(v.guadagno)}</b>
          {v.apre > 0 && v.guadagno !== 0 && <span style={{ fontFamily: F.mono }}> ({v.guadagno > 0 ? '+' : '−'}{Math.abs(v.guadagno / v.apre * 100).toFixed(1)}%)</span>}
          {v.spostato !== 0 && <> · <span style={{ whiteSpace: 'nowrap' }}>entrati e usciti <b style={{ fontFamily: F.mono, color: C.celeste }}>{conSegno(v.spostato)}</b></span></>}
        </span>
      </div>
      <GraficoSaldo punti={punti} titolo={titolo} />
    </div>
  )
}
