import { useState, useMemo } from 'react'
import { C, F, alpha, S, R } from '../theme'
import { giorno } from './TestataPartita'
import Icona from './Icona'
import { sigla } from '../lib/campionati'
import { pct } from '../lib/formato'
import { tocco } from '../lib/schermo'

// Aggiungere A MANO una partita a un passo della scalata (22/10/2026).
//
// ⚠️⚠️ **Perché non riusa `ScegliCasella`**, che è la finestra gemella delle
// spin: quella parla di **caselle** — si apre sul ruolo della posizione
// (centro, angolo, lato), filtra per categoria, segnala *"già nella spin 2"* e
// in fondo ha *"svuota la casella"*. Qui la domanda è un'altra: *quale partita
// aggiungo a questa schedina*, e i filtri sono i due segni (⚑ e ★). Tenere una
// finestra sola avrebbe voluto dire un albero di `if` su ogni riga; sono
// uguali solo a guardarle.
//
// ⚠️⚠️ **Offre TUTTO il calendario, anche sotto le soglie**, ed è il punto:
// la scaletta la compongono i filtri, questa è la scorciatoia per la partita
// che i filtri non prendono — un gesto esplicito, su una partita sola, dove la
// qualità la giudica chi guarda. Le già prese nel passo si vedono barrate e
// non si scelgono: la stessa partita due volte è una schedina che al banco non
// esiste.

export default function ScegliGamba({ partite, nelPasso = [], inPasso = {}, flagDi, votiDi, titolo, onScegli, onChiudi }) {
  // ⚠️ Si apre sul filtro che ha qualcosa da mostrare: se nessuno ha segnato
  // niente, partire su «⚑ flaggate» vorrebbe dire aprire una finestra vuota.
  const [filtro, setFiltro] = useState(() =>
    partite.some(p => flagDi(p.id) > 0) ? 'flag' : partite.some(p => votiDi(p.id) > 0) ? 'stelle' : 'tutte')
  const [testo, setTesto] = useState('')

  const passa = (p, id) =>
    id === 'flag' ? flagDi(p.id) > 0 : id === 'stelle' ? votiDi(p.id) > 0 : true

  const filtri = [
    { id: 'flag', label: '⚑ flaggate', colore: C.verde },
    { id: 'stelle', label: '★ con stelle', colore: C.oro },
    { id: 'tutte', label: 'tutte', colore: C.grigio },
  ]

  const trovate = useMemo(() => {
    const q = testo.trim().toLowerCase()
    return partite
      .filter(p => passa(p, filtro))
      .filter(p => !q || `${p.casa} ${p.trasferta} ${p.div} ${sigla(p.div)}`.toLowerCase().includes(q))
      // ⚠️ L'ordine è **data e ora**, non attendibilità: un passo è un blocco
      // di orari vicini, quindi chi cerca una gamba da aggiungere la cerca
      // *in quella fascia*. Ordinando per bontà le partite giuste finirebbero
      // sparse in mezzo a quelle di un altro giorno.
      .sort((a, b) => String(a.data).localeCompare(String(b.data))
        || String(a.ora || '').localeCompare(String(b.ora || '')))
      .slice(0, 120)
  }, [partite, filtro, testo, flagDi, votiDi])

  const conta = (id) => partite.filter(p => passa(p, id)).length

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
              Aggiungi a <span style={{ color: C.oro }}>{titolo}</span>
            </span>
            <button onClick={onChiudi} style={{ background: 'transparent', border: `1px solid ${C.bordo}`, borderRadius: 6, color: C.spento, cursor: 'pointer', fontSize: S.media, padding: '2px 9px', fontFamily: F.mono }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {filtri.map(f => {
              const on = filtro === f.id
              return (
                <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                  padding: '5px 10px', borderRadius: R.pastiglia, cursor: 'pointer', fontFamily: F.sans,
                  fontSize: S.base, fontWeight: 600,
                  background: on ? alpha(f.colore, 0.16) : 'transparent',
                  border: `1px solid ${on ? alpha(f.colore, 0.5) : C.bordo}`, color: on ? f.colore : C.fioco,
                }}>{f.label} <span style={{ fontFamily: F.mono, color: on ? C.testo : C.spento }}>{conta(f.id)}</span></button>
              )
            })}
          </div>
          <input autoFocus={!tocco} value={testo} onChange={e => setTesto(e.target.value)}
            placeholder="cerca squadra o campionato…"
            style={{ width: '100%', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 6, padding: '7px 9px', color: C.testo, fontSize: S.corpo, fontFamily: F.sans, outline: 'none' }} />
        </div>

        <div style={{ overflowY: 'auto', padding: 6 }}>
          {trovate.length === 0 && (
            <div style={{ padding: '14px 8px', fontSize: S.corpo, color: C.spento, fontFamily: F.sans }}>
              Nessuna partita con questo filtro.
            </div>
          )}
          {trovate.map(p => {
            // già in QUESTO passo: si vede ma non si sceglie, sarebbe un doppione
            const presa = nelPasso.includes(p.id)
            const f = flagDi(p.id), v = votiDi(p.id)
            return (
              <button key={p.id} disabled={presa} onClick={() => onScegli(p)} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderBottom: `1px solid ${C.bordoTenue}`,
                padding: '8px 6px', cursor: presa ? 'default' : 'pointer', fontFamily: F.mono, fontSize: S.base,
                opacity: presa ? 0.35 : 1, textDecoration: presa ? 'line-through' : 'none', color: C.testo,
              }}>
                {/* i due segni, nello stesso ordine e con gli stessi colori
                    della lista in fondo alla pagina: un segno che cambia posto
                    fra due schermate si impara due volte */}
                <span style={{ width: 30, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                  {f > 0 && <span style={{ color: C.verde, display: 'flex', alignItems: 'center' }}>
                    <Icona nome="bandiera" misura={11} pieno />{f > 1 && f}
                  </span>}
                  {v > 0 && <span style={{ color: C.oro }}>★{v > 1 ? v : ''}</span>}
                </span>
                <span style={{ color: C.blu, width: 32, flexShrink: 0, overflow: 'hidden' }}>{sigla(p.div)}</span>
                {/* ⚠️⚠️ **Data e ora su DUE righe, e con `overflow` chiuso.**
                    Su una riga sola `sab 24/10 15:00` chiede ~97px: in una
                    colonna da 52 con `flexShrink: 0` il testo non si stringe e
                    non si taglia — **esce dalla scatola e finisce sotto il
                    nome della partita**, che è quello che si vedeva. Una
                    larghezza fissa va sempre con un `overflow`, o la misura
                    vale solo per la scatola e non per quello che contiene. */}
                <span style={{ color: C.fioco, width: 58, flexShrink: 0, overflow: 'hidden',
                  fontSize: S.minuta, lineHeight: 1.2 }}>
                  {giorno(p.data)}<br />{String(p.ora || '').slice(0, 5)}
                </span>
                <span style={{ fontFamily: F.sans, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.casa} – {p.trasferta}
                </span>
                {/* ⚠️ La quota e l'attendibilità si vedono **qui**: questa
                    finestra offre anche partite che i filtri hanno scartato,
                    e sceglierne una senza vedere i suoi numeri vorrebbe dire
                    aggiungere al buio. */}
                {/* ⚠️ **Dove sta già**, come la targhetta `S2` della finestra
                    delle spin: senza, l'unico modo di sapere se una partita è
                    già nel piano è chiudere, scorrere i passi e riaprire.
                    ⚠️ Targhetta a **larghezza fissa**, fuori dalla colonna del
                    nome: lì dentro verrebbe tagliata per prima. */}
                <span style={{ width: 26, flexShrink: 0, textAlign: 'center' }}>
                  {!presa && inPasso[p.id] && (
                    <span title={`già nel passo ${inPasso[p.id]}`} style={{
                      display: 'inline-block', padding: '1px 4px', borderRadius: 4,
                      fontSize: S.micro, fontWeight: 700,
                      background: alpha(C.viola, 0.18), border: `1px solid ${alpha(C.viola, 0.45)}`, color: C.viola,
                    }}>P{inPasso[p.id]}</span>
                  )}
                </span>
                <span style={{ color: C.spento, width: 30, textAlign: 'right', flexShrink: 0 }}>{pct(p.att)}</span>
                <span style={{ color: C.oro, width: 32, textAlign: 'right', flexShrink: 0 }}>{Number(p.quota).toFixed(2).replace('.', ',')}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
