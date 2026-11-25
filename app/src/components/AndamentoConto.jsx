import { useState, useMemo } from 'react'
import { C, F, S, SP, R, alpha } from '../theme'
import { vistaRegistro, candeleDi } from '../lib/registro'
import GraficoCandele from './GraficoCandele'

// L'andamento di un conto — quello comune o di una persona — dal giorno 1: guadagno e
// candele, per Tutto, Slot o RTW e per giorno, settimana o mese (24-25/11/2026).

const eur = (x) => `€${Number(x || 0).toFixed(2)}`
const conSegno = (x) => `${x < 0 ? '−' : x > 0 ? '+' : ''}${eur(Math.abs(x))}`

function Scelta({ voci, valore, onScegli }) {
  return (
    <div style={{ display: 'flex', gap: 4, flex: '1 1 140px' }}>
      {voci.map(([k, l]) => (
        <button key={k} onClick={() => onScegli(k)} aria-pressed={valore === k} style={{ flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: R.m, cursor: 'pointer',
          background: valore === k ? alpha(C.oro, 0.14) : 'transparent', border: `1px solid ${valore === k ? alpha(C.oro, 0.5) : C.bordo}`,
          color: valore === k ? C.oro : C.spento, fontFamily: F.sans, fontSize: S.base, fontWeight: 600 }}>{l}</button>
      ))}
    </div>
  )
}

export default function AndamentoConto({ dati, chi, titolo }) {
  const [conto, setConto] = useState('tutto')
  const [periodo, setPeriodo] = useState('giorno')
  const v = useMemo(() => vistaRegistro(dati, { chi, conto }), [dati, chi, conto])
  const candele = useMemo(() => candeleDi(v, periodo), [v, periodo])
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP.s, marginBottom: SP.s }}>
        <Scelta voci={[['tutto', 'Tutto'], ['cassa', 'Slot'], ['rtw', 'RTW']]} valore={conto} onScegli={setConto} />
        <Scelta voci={[['giorno', 'Giorno'], ['settimana', 'Sett.'], ['mese', 'Mese']]} valore={periodo} onScegli={setPeriodo} />
      </div>
      <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento, marginBottom: SP.s }}>
        guadagno dal {new Date(dati.dal).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit' })} <b style={{ fontFamily: F.mono, color: v.guadagno > 0 ? C.verde : v.guadagno < 0 ? C.rosso : C.testo }}>{conSegno(v.guadagno)}</b>
        {v.apre > 0 && v.guadagno !== 0 && <span style={{ fontFamily: F.mono }}> ({v.guadagno > 0 ? '+' : '−'}{Math.abs(v.guadagno / v.apre * 100).toFixed(1)}%)</span>}
        {v.spostato !== 0 && <> · <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: C.celeste }}>○</span> entrati e usciti <b style={{ fontFamily: F.mono, color: C.celeste }}>{conSegno(v.spostato)}</b></span></>}
      </div>
      <GraficoCandele candele={candele} adesso={v.adesso} periodo={periodo} titolo={titolo} />
    </div>
  )
}
