import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { C, F, S, SP, R, alpha } from '../theme'
import { stileCard, Etichetta } from './ui'

// GESTIONE DEL BANKROLL — la % da giocare e quante slot, in cima alla pagina Slot.
//
// Stava in Bilancio (24/11/2026, lotto S5): Mattia, *"togliere le card % bankroll da
// giocare e slot da giocare e spostarle nella schermata Slot, dietro un tasto in
// cima «Gestione del bankroll»"*. È una scelta di come si gioca, non un saldo.
// ⚠️ Solo chi la può cambiare la vede (admin); il tasto da chiuso dice già i valori.

const PERCENTUALI = [5, 10, 15, 20, 25, 30]
const NUM_SLOT = [1, 2, 3, 4]
const eur = (x) => `${Number(x || 0).toFixed(2).replace('.', ',')} €`

export default function GestioneBankroll({ base }) {
  const { pct, numSlot, savePct, saveNumSlot } = useAuth()
  const [aperta, setAperta] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const cambia = async (f, v) => { setSalvo(true); await f(v); setSalvo(false) }
  const scelta = (valori, attivo, onScegli, testo) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${valori.length}, minmax(0,1fr))`, gap: SP.s, marginTop: SP.s }}>
      {valori.map(v => (
        <button key={v} disabled={salvo} onClick={() => onScegli(v)} aria-pressed={attivo === v} style={{
          padding: '8px 2px', borderRadius: R.m, cursor: 'pointer', fontFamily: F.mono, fontSize: S.media, fontWeight: 600,
          background: attivo === v ? alpha(C.oro, 0.18) : 'transparent',
          border: `1px solid ${attivo === v ? alpha(C.oro, 0.5) : C.bordo}`,
          color: attivo === v ? C.oro : C.fioco }}>{testo(v)}</button>
      ))}
    </div>
  )
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setAperta(a => !a)} aria-expanded={aperta} style={{ width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', gap: SP.m, padding: '10px 14px', borderRadius: R.m, cursor: 'pointer', textAlign: 'left',
        background: aperta ? alpha(C.oro, 0.08) : 'transparent', border: `1px solid ${aperta ? alpha(C.oro, 0.4) : C.bordo}` }}>
        <span style={{ fontFamily: F.sans, fontSize: S.media, fontWeight: 600, color: aperta ? C.oro : C.testo, minWidth: 0 }}>Gestione del bankroll</span>
        <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.spento, flexShrink: 0 }}>
          {pct}% · {numSlot} slot {aperta ? '▾' : '▸'}
        </span>
      </button>
      {aperta && (
        <div style={stileCard({ marginTop: SP.s })}>
          <Etichetta>% bankroll da giocare</Etichetta>
          {scelta(PERCENTUALI, pct, v => cambia(savePct, v), v => `${v}%`)}
          <Etichetta style={{ marginTop: SP.l }}>Slot da giocare</Etichetta>
          {scelta(NUM_SLOT, numSlot, v => cambia(saveNumSlot, v), v => v)}
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.fioco, marginTop: SP.m }}>
            {salvo ? 'Salvataggio…' : <>Base per slot: <span style={{ fontFamily: F.mono }}>{eur(base)}</span></>}
          </div>
        </div>
      )}
    </div>
  )
}
