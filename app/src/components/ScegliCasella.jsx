import { useState, useMemo } from 'react'
import { C, F, alpha, S, R } from '../theme'
import { giorno, CATEGORIE } from './TestataPartita'
import { categoria } from '../lib/attendibilita'
import { pronosticoDa, SOGLIE_SPIN } from '../lib/spin'
import { ORDINI, fondo } from '../lib/ordine'
import { sigla } from '../lib/campionati'
import { tocco } from '../lib/schermo'

// Scegliere a mano cosa va in una casella della spin.
//
// È una finestra al centro e non una tendina come in griglia (SceltaPartita):
// le caselle della spin sono quadratini stretti, e una tendina ancorata lì
// sotto uscirebbe dallo schermo sul telefono.
//
// I filtri sono quelli con cui si ragiona: le votate e le tre categorie. Si
// apre già sul filtro giusto per la posizione — il 9 è il centro, 1-4 gli
// angoli, 5-8 i lati. Le categorie sono quelle **delle spin**: la scelta con
// `SOGLIE_SPIN`, la stessa regola della griglia.
//
// ⚠️ **Sotto, i quattro indicatori** (Mattia, 24/10/2026): attendibilità,
// voto, VPM e scelta. Non filtrano, **ordinano**: mostrano tutte le partite del
// weekend dalla più alta in giù per quel numero, che si legge a destra. Le
// chiavi sono quelle di `lib/ordine.js`, le stesse dei tasti delle Partite —
// due ordinamenti scritti a parte direbbero prima o poi cose diverse.

// Nell'ordine chiesto da Mattia, non in quello della barra delle Partite.
const INDICATORI = ['att', 'voto', 'vpm', 'scelta'].map(id => ORDINI.find(o => o.id === id))
// Come si legge il numero di ciascuno nella colonna di destra: VPM e voto sono
// punteggi (5,5-10 e 0-10), attendibilità e scelta percentuali.
const n1 = v => v.toFixed(1).replace('.', ',')
const MOSTRA = { att: v => `${(v * 100).toFixed(0)}%`, scelta: v => `${(v * 100).toFixed(0)}%`, vpm: n1, voto: n1 }

const RUOLO = { centro: 'il centro', giallo: 'un angolo', blu: 'un lato' }
export const ruoloDi = pos => (pos === 9 ? 'centro' : pos <= 4 ? 'giallo' : 'blu')

export default function ScegliCasella({ pos, partite, votiDi, vpmDi, valoreDi, usate = [], altrove = {}, onScegli, onSvuota, onChiudi }) {
  const [filtro, setFiltro] = useState(() => (partite.some(p => votiDi(p.id) > 0) ? 'votate' : ruoloDi(pos)))
  const [testo, setTesto] = useState('')

  const filtri = [
    { id: 'votate', label: '★ votate', colore: C.oro },
    { id: 'centro', label: 'centro', colore: CATEGORIE.centro.colore },
    { id: 'giallo', label: 'gialle', colore: CATEGORIE.giallo.colore },
    { id: 'blu', label: 'blu', colore: CATEGORIE.blu.colore },
    { id: 'tutte', label: 'tutte', colore: C.grigio },
  ]

  const indicatore = INDICATORI.find(o => o.id === filtro)
  const chiave = (p, o) => o.chiave(p, vpmDi)
  // Un indicatore conta le partite che **hanno** quel numero: VPM manca a
  // inizio stagione, la scelta quando il campo contraddice il mercato.
  const conta = id => {
    const o = INDICATORI.find(x => x.id === id)
    return partite.filter(p => (o ? chiave(p, o) != null : passa(p, id))).length
  }
  function passa(p, id) {
    if (id === 'votate') return votiDi(p.id) > 0
    if (id === 'tutte') return true
    return categoria(valoreDi(p), SOGLIE_SPIN) === id
  }

  const trovate = useMemo(() => {
    const q = testo.trim().toLowerCase()
    // ⚠️ Il valore che manca va in fondo, in entrambi i casi (`fondo`).
    const ordine = indicatore
      ? (a, b) => { const x = chiave(a, indicatore), y = chiave(b, indicatore); return fondo(x, y) || (y ?? 0) - (x ?? 0) || b.probGiocata - a.probGiocata }
      : (a, b) => votiDi(b.id) - votiDi(a.id) || fondo(valoreDi(a), valoreDi(b)) || (valoreDi(b) ?? 0) - (valoreDi(a) ?? 0)
    return partite
      .filter(p => indicatore || passa(p, filtro))
      .filter(p => !q || `${p.casa} ${p.trasferta} ${p.div} ${sigla(p.div)}`.toLowerCase().includes(q))
      .sort(ordine)
      .slice(0, 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partite, filtro, testo, votiDi, vpmDi, valoreDi])

  const pastiglia = (f, on) => ({
    padding: '5px 10px', borderRadius: R.pastiglia, cursor: 'pointer', fontFamily: F.mono, fontSize: S.base, fontWeight: 600,
    background: on ? alpha(f.colore, 0.16) : 'transparent',
    border: `1px solid ${on ? alpha(f.colore, 0.5) : C.bordo}`, color: on ? f.colore : C.fioco,
  })

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
            <span style={{ fontSize: S.media, fontWeight: 700, color: C.testo, fontFamily: F.sans }}>
              Casella {pos} · <span style={{ color: CATEGORIE[ruoloDi(pos)].colore }}>{RUOLO[ruoloDi(pos)]}</span>
            </span>
            <button onClick={onChiudi} style={{ background: 'transparent', border: `1px solid ${C.bordo}`, borderRadius: 6, color: C.spento, cursor: 'pointer', fontSize: S.media, padding: '2px 9px', fontFamily: F.mono }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {filtri.map(f => {
              const on = filtro === f.id
              return (
                <button key={f.id} onClick={() => setFiltro(f.id)} style={pastiglia(f, on)}>
                  {f.label} <span style={{ color: on ? C.testo : C.spento }}>{conta(f.id)}</span></button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: S.minuta, color: C.spento, fontFamily: F.sans, marginRight: 2 }}>ordina per</span>
            {INDICATORI.map(o => {
              const on = filtro === o.id
              return (
                <button key={o.id} onClick={() => setFiltro(o.id)} style={pastiglia(o, on)}>
                  {o.label} {on ? '↓' : ''}</button>
              )
            })}
          </div>
          {Object.keys(altrove).length > 0 && (
            <div style={{ fontSize: S.minuta, color: C.spento, fontFamily: F.sans, marginBottom: 7 }}>
              <span style={{ color: C.viola, fontFamily: F.mono, fontWeight: 700 }}>S1</span> = già nella spin 1
              (automatica, a mano o in Slot) · le barrate sono già in questa griglia
            </div>
          )}
          <input autoFocus={!tocco} value={testo} onChange={e => setTesto(e.target.value)} placeholder="cerca squadra o campionato…"
            style={{ width: '100%', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 6, padding: '7px 9px', color: C.testo, fontSize: S.corpo, fontFamily: F.sans, outline: 'none' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: 6 }}>
          {trovate.length === 0 && <div style={{ padding: '14px 8px', fontSize: S.corpo, color: C.spento, fontFamily: F.sans }}>Nessuna partita con questo filtro.</div>}
          {trovate.map(p => {
            const valore = valoreDi(p)
            const cat = categoria(valore, SOGLIE_SPIN)
            // A destra il numero dell'indicatore scelto; nelle schede il
            // valore della spin, lo stesso della casella.
            const numero = indicatore ? chiave(p, indicatore) : valore
            const mostra = indicatore ? MOSTRA[indicatore.id] : MOSTRA.scelta
            const col = CATEGORIE[cat].colore
            const voti = votiDi(p.id)
            // In questa stessa spin: si vede ma non si sceglie, sarebbe un doppione.
            const presa = usate.includes(p.id)
            // In una spin, compresa questa (automatica, a mano o in Slot): si
            // può usare lo stesso, ma lo deve sapere.
            const inAltre = altrove[p.id] || []
            return (
              <button key={p.id} disabled={presa} onClick={() => onScegli(p)} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderBottom: `1px solid ${C.bordoTenue}`,
                padding: '8px 6px', cursor: presa ? 'default' : 'pointer', fontFamily: F.mono, fontSize: S.base,
                opacity: presa ? 0.35 : 1, textDecoration: presa ? 'line-through' : 'none',
              }}>
                <span style={{ color: C.oro, width: 22, flexShrink: 0 }}>{voti ? '★' + voti : ''}</span>
                <span style={{ color: C.blu, width: 34, flexShrink: 0 }}>{sigla(p.div)}</span>
                <span style={{ color: C.fioco, width: 56, flexShrink: 0, whiteSpace: 'nowrap' }}>{giorno(p.data)}</span>
                <span style={{ fontFamily: F.sans, color: C.testo, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.casa} – {p.trasferta}
                </span>
                {/* Targhetta a larghezza fissa: dentro la colonna del nome la
                    scritta veniva tagliata per prima. "S2" = già nella spin 2. */}
                <span style={{ width: 30, flexShrink: 0, textAlign: 'center' }}>
                  {!presa && inAltre.length > 0 && (
                    <span title={`già nella spin ${inAltre.join(', ')}`} style={{
                      display: 'inline-block', padding: '1px 5px', borderRadius: 4, fontSize: S.micro, fontWeight: 700,
                      background: alpha(C.viola, 0.18), border: `1px solid ${alpha(C.viola, 0.45)}`, color: C.viola,
                    }}>S{inAltre.join(',')}</span>
                  )}
                </span>
                <span style={{ color: col, width: 50, textAlign: 'right', flexShrink: 0 }}>{pronosticoDa(p.giocata)}</span>
                <span style={{ color: indicatore ? indicatore.colore : col, width: 32, textAlign: 'right', flexShrink: 0 }}>{numero == null ? '—' : mostra(numero)}</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: 8, borderTop: `1px solid ${C.bordoRiga}` }}>
          <button onClick={onSvuota} style={{
            width: '100%', background: alpha(C.rosso, 0.08), border: `1px solid ${alpha(C.rosso, 0.2)}`, borderRadius: 7,
            color: C.rosso, fontSize: S.corpo, fontFamily: F.sans, padding: '8px', cursor: 'pointer',
          }}>Svuota la casella</button>
        </div>
      </div>
    </>
  )
}
