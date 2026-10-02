import { useState, useMemo } from 'react'
import { C, F, alpha } from '../theme'
import { giorno, CATEGORIE } from './TestataPartita'
import { categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { pronosticoDa } from '../lib/spin'
import { sigla } from '../lib/campionati'

// Scegliere a mano cosa va in una casella della spin.
//
// È una finestra al centro e non una tendina come in griglia (SceltaPartita):
// le caselle della spin sono quadratini stretti, e una tendina ancorata lì
// sotto uscirebbe dallo schermo sul telefono.
//
// I filtri sono quelli con cui si ragiona: le votate e le tre categorie. Si
// apre già sul filtro giusto per la posizione — il 9 è il centro, 1-4 gli
// angoli, 5-8 i lati.

const RUOLO = { centro: 'il centro', giallo: 'un angolo', blu: 'un lato' }
export const ruoloDi = pos => (pos === 9 ? 'centro' : pos <= 4 ? 'giallo' : 'blu')

export default function ScegliCasella({ pos, partite, votiDi, usate = [], onScegli, onSvuota, onChiudi }) {
  const [filtro, setFiltro] = useState(() => (partite.some(p => votiDi(p.id) > 0) ? 'votate' : ruoloDi(pos)))
  const [testo, setTesto] = useState('')

  const filtri = [
    { id: 'votate', label: '★ votate', colore: C.oro },
    { id: 'centro', label: 'centro', colore: CATEGORIE.centro.colore },
    { id: 'giallo', label: 'gialle', colore: CATEGORIE.giallo.colore },
    { id: 'blu', label: 'blu', colore: CATEGORIE.blu.colore },
    { id: 'tutte', label: 'tutte', colore: C.grigio },
  ]

  const conta = id => partite.filter(p => passa(p, id)).length
  function passa(p, id) {
    if (id === 'votate') return votiDi(p.id) > 0
    if (id === 'tutte') return true
    return categoria(p.probGiocata, SOGLIE_DEFAULT) === id
  }

  const trovate = useMemo(() => {
    const q = testo.trim().toLowerCase()
    return partite
      .filter(p => passa(p, filtro))
      .filter(p => !q || `${p.casa} ${p.trasferta} ${p.div} ${sigla(p.div)}`.toLowerCase().includes(q))
      .sort((a, b) => votiDi(b.id) - votiDi(a.id) || b.probGiocata - a.probGiocata)
      .slice(0, 80)
  }, [partite, filtro, testo, votiDi])

  return (
    <>
      <div onClick={onChiudi} style={{ position: 'fixed', inset: 0, zIndex: 80, background: alpha(C.fondo, 0.75) }} />
      <div style={{
        position: 'fixed', zIndex: 90, left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 'min(420px, calc(100vw - 24px))', maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column',
        background: C.pannello, border: `1px solid ${C.bordo}`, borderRadius: 12,
        boxShadow: `0 20px 48px ${alpha(C.fondo, 0.9)}`,
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.bordoRiga}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.testo, fontFamily: F.sans }}>
              Casella {pos} · <span style={{ color: CATEGORIE[ruoloDi(pos)].colore }}>{RUOLO[ruoloDi(pos)]}</span>
            </span>
            <button onClick={onChiudi} style={{ background: 'transparent', border: `1px solid ${C.bordo}`, borderRadius: 6, color: C.spento, cursor: 'pointer', fontSize: 13, padding: '2px 9px', fontFamily: F.mono }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {filtri.map(f => {
              const on = filtro === f.id
              return (
                <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                  padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 10.5, fontWeight: 600,
                  background: on ? alpha(f.colore, 0.16) : 'transparent',
                  border: `1px solid ${on ? alpha(f.colore, 0.5) : C.bordo}`, color: on ? f.colore : C.fioco,
                }}>{f.label} <span style={{ color: on ? C.testo : C.fantasma }}>{conta(f.id)}</span></button>
              )
            })}
          </div>
          <input autoFocus value={testo} onChange={e => setTesto(e.target.value)} placeholder="cerca squadra o campionato…"
            style={{ width: '100%', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 6, padding: '7px 9px', color: C.testo, fontSize: 12, fontFamily: F.sans, outline: 'none' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: 6 }}>
          {trovate.length === 0 && <div style={{ padding: '14px 8px', fontSize: 12, color: C.fantasma, fontFamily: F.sans }}>Nessuna partita con questo filtro.</div>}
          {trovate.map(p => {
            const cat = categoria(p.probGiocata, SOGLIE_DEFAULT)
            const col = CATEGORIE[cat].colore
            const voti = votiDi(p.id)
            // Già in un'altra casella di questa spin: si vede, ma non si sceglie.
            const presa = usate.includes(p.id)
            return (
              <button key={p.id} disabled={presa} onClick={() => onScegli(p)} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderBottom: `1px solid ${C.bordoTenue}`,
                padding: '8px 6px', cursor: presa ? 'default' : 'pointer', fontFamily: F.mono, fontSize: 11,
                opacity: presa ? 0.35 : 1, textDecoration: presa ? 'line-through' : 'none',
              }}>
                <span style={{ color: C.oro, width: 22, flexShrink: 0 }}>{voti ? '★' + voti : ''}</span>
                <span style={{ color: C.blu, width: 34, flexShrink: 0 }}>{sigla(p.div)}</span>
                <span style={{ color: C.fioco, width: 52, flexShrink: 0 }}>{giorno(p.data)}</span>
                <span style={{ fontFamily: F.sans, color: C.testo, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.casa} – {p.trasferta}</span>
                <span style={{ color: col, width: 50, textAlign: 'right', flexShrink: 0 }}>{pronosticoDa(p.giocata)}</span>
                <span style={{ color: col, width: 32, textAlign: 'right', flexShrink: 0 }}>{(p.probGiocata * 100).toFixed(0)}%</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: 8, borderTop: `1px solid ${C.bordoRiga}` }}>
          <button onClick={onSvuota} style={{
            width: '100%', background: alpha(C.rosso, 0.08), border: `1px solid ${alpha(C.rosso, 0.2)}`, borderRadius: 7,
            color: C.rosso, fontSize: 12, fontFamily: F.sans, padding: '8px', cursor: 'pointer',
          }}>Svuota la casella</button>
        </div>
      </div>
    </>
  )
}
