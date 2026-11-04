import { useState } from 'react'
import { C, F, S, SP, R, alpha } from '../theme'
import { eur } from '../lib/formato'

/** Cassa ↔ RTW sul proprio conto. ⚠️ Campo a 16px: sotto, iOS ingrandisce la pagina. */
export default function TrasferisciConto({ cassa, occupato, onTrasferisci }) {
  const [importo, setImporto] = useState('')
  const valido = Number(importo) > 0 && !occupato
  const tasto = (verso, testo) => (
    <button disabled={!valido} onClick={async () => {
      if (await onTrasferisci(Math.round(Number(importo) * 100) / 100, verso)) setImporto('')
    }} style={{ flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: R.m, cursor: valido ? 'pointer' : 'default',
      background: alpha(C.oro, valido ? 0.14 : 0.04), border: `1px solid ${alpha(C.oro, valido ? 0.5 : 0.18)}`,
      color: valido ? C.oro : C.fioco, fontFamily: F.sans, fontSize: S.base, fontWeight: 700 }}>
      {testo}
    </button>
  )
  return (
    <div style={{ marginTop: SP.l }}>
      <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.spento, marginBottom: SP.s }}>
        in cassa <b style={{ fontFamily: F.mono, color: C.testo }}>{eur(cassa || 0)}</b>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: SP.s }}>
        <input value={importo} onChange={e => setImporto(e.target.value.replace(',', '.'))}
          inputMode="decimal" placeholder="€" aria-label="importo da trasferire"
          style={{ width: 76, flexShrink: 0, boxSizing: 'border-box', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: R.m,
            padding: '6px 8px', color: C.testo, fontFamily: F.mono, fontSize: 16, outline: 'none' }} />
        {tasto('a_rtw', 'Cassa → RTW')}
        {tasto('a_cassa', 'RTW → Cassa')}
      </div>
    </div>
  )
}
