import { useState, useMemo, useRef, useEffect } from 'react'
import { C, F, alpha } from '../theme'
import { giorno, CATEGORIE } from './TestataPartita'
import { categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { pronosticoDa } from '../lib/spin'

// Il menu a tendina con ricerca per agganciare una casella della griglia a una
// partita vera del calendario. Scrivendo si filtra su squadra e campionato;
// scegliendo, la casella prende squadre, data, giocata e quota — e soprattutto
// `prossima_id`, il filo con l'archivio.
//
// La quarta spin ("Fun") non lo usa: lì si scrive a mano quello che si vuole.

export default function SceltaPartita({ casa, ospite, collegata, partite, onScegli, onLibera, disabled }) {
  const [aperto, setAperto] = useState(false)
  const [testo, setTesto] = useState('')
  const box = useRef(null)

  // Un clic fuori chiude: senza, la tendina resta aperta sotto le altre righe.
  useEffect(() => {
    if (!aperto) return
    const fuori = e => { if (box.current && !box.current.contains(e.target)) setAperto(false) }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [aperto])

  const trovate = useMemo(() => {
    const q = testo.trim().toLowerCase()
    const lista = q
      ? partite.filter(p => `${p.casa} ${p.trasferta} ${p.div} ${p.campionato || ''}`.toLowerCase().includes(q))
      : partite
    return lista.slice(0, 60)
  }, [partite, testo])

  const etichetta = casa || ospite ? `${casa || '?'} – ${ospite || '?'}` : 'scegli la partita…'

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button disabled={disabled} onClick={() => { setAperto(v => !v); setTesto('') }} style={{
        width: '100%', textAlign: 'left', background: C.pozzo,
        border: `1px solid ${collegata ? alpha(C.verde, 0.35) : C.bordo}`, borderRadius: 5,
        padding: '5px 6px', color: casa ? C.testo : C.fantasma, fontSize: 12, fontFamily: F.sans,
        cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {collegata && <span style={{ color: C.verde, marginRight: 4 }}>●</span>}{etichetta}
      </button>

      {aperto && (
        <div style={{
          position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, marginTop: 4, minWidth: 280,
          background: C.pannello, border: `1px solid ${C.bordo}`, borderRadius: 8, boxShadow: `0 12px 28px ${alpha(C.fondo, 0.8)}`,
          maxHeight: 320, overflowY: 'auto', padding: 6,
        }}>
          <input autoFocus value={testo} onChange={e => setTesto(e.target.value)} placeholder="cerca squadra o campionato…"
            style={{ width: '100%', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 6, padding: '7px 9px', color: C.testo, fontSize: 12, fontFamily: F.sans, outline: 'none', marginBottom: 6 }} />
          {(casa || ospite) && (
            <button onClick={() => { onLibera(); setAperto(false) }} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: C.rosso, fontSize: 11, fontFamily: F.sans, padding: '5px 6px', cursor: 'pointer' }}>
              ✕ svuota la casella
            </button>
          )}
          {trovate.length === 0 && <div style={{ padding: '8px 6px', fontSize: 11, color: C.fantasma, fontFamily: F.sans }}>nessuna partita trovata</div>}
          {trovate.map(p => {
            const cat = categoria(p.probGiocata, SOGLIE_DEFAULT)
            const col = CATEGORIE[cat].colore
            return (
              <button key={p.id} onClick={() => { onScegli(p); setAperto(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderBottom: `1px solid ${C.bordoTenue}`,
                padding: '6px 6px', cursor: 'pointer', fontFamily: F.mono, fontSize: 11, color: C.testo,
              }}>
                <span style={{ color: C.blu, width: 26, flexShrink: 0 }}>{p.div}</span>
                <span style={{ color: C.fioco, width: 56, flexShrink: 0 }}>{giorno(p.data)}</span>
                <span style={{ fontFamily: F.sans, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.casa} – {p.trasferta}</span>
                <span style={{ color: col, width: 52, textAlign: 'right', flexShrink: 0 }}>{pronosticoDa(p.giocata)}</span>
                <span style={{ color: col, width: 34, textAlign: 'right', flexShrink: 0 }}>{(p.probGiocata * 100).toFixed(0)}%</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
