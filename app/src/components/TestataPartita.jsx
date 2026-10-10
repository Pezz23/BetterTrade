import { C, F, alpha } from '../theme'
import { pronosticoDa } from '../lib/spin'
import { Etichetta } from './ui'
import { usaClassifiche, postoDi, fasciaDi } from '../hooks/usaClassifiche'

// La testata di una partita: squadra sinistra — attendibilità — squadra destra,
// con data e ora sotto. La usano sia la riga della lista (compatta) sia la
// scheda (grande): stessa grafica, un posto solo, così non divergono.

export const CATEGORIE = {
  centro: { nome: 'Centro', colore: C.menta,     desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo', colore: C.oroChiaro, desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',    colore: C.celeste,   desc: 'i 4 lati: sacrificabili' },
  no:     { nome: '—',      colore: C.fantasma,  desc: 'sotto soglia' },
}

export const pct = v => (v * 100).toFixed(0) + '%'
export const giorno = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })

// Nel tondo va la **posizione in classifica**, colorata: verde il primo terzo,
// giallo il secondo, rosso l'ultimo (vedi `fasciaDi` in hooks/usaClassifiche).
// Se la posizione non la sappiamo — nome nuovo, campionato senza partite
// giocate — restano le iniziali, che almeno dicono di chi si parla.
const COLORE_FASCIA = { alta: C.verde, media: C.giallo, bassa: C.rosso }

export function Scudetto({ nome, colore, dim = 44, posto }) {
  const fascia = fasciaDi(posto)
  const tinta = COLORE_FASCIA[fascia] || colore
  const iniziali = nome.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
  return (
    <div title={posto ? `${posto.posizione}° su ${posto.squadre} · ${posto.punti} punti in ${posto.giocate}` : nome}
      style={{
        width: dim, height: dim, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: alpha(tinta, 0.12), border: `1px solid ${alpha(tinta, 0.4)}`,
        color: tinta, fontFamily: F.mono, fontWeight: 700,
      }}>
      {/* `verticalAlign: super` e non un flex con `baseline`: in un flex il
          cerchietto finiva a metà altezza invece che in alto, come nei gradi. */}
      {posto ? (
        <span style={{ fontSize: Math.round(dim * 0.42), lineHeight: 1 }}>
          {posto.posizione}<span style={{ fontSize: '0.5em', verticalAlign: 'super' }}>°</span>
        </span>
      ) : <span style={{ fontSize: Math.round(dim * 0.3), lineHeight: 1 }}>{iniziali}</span>}
    </div>
  )
}

export const Barra = ({ frazione, colore, altezza = 6 }) => (
  <div style={{ height: altezza, borderRadius: altezza, background: C.quasiNero, overflow: 'hidden' }}>
    <div style={{ width: `${Math.max(0, Math.min(1, frazione)) * 100}%`, height: '100%', background: colore, borderRadius: altezza }} />
  </div>
)

// La stella: il voto di un admin. `voti` è il totale, `mio` se l'utente
// corrente ha già votato, `puoVotare` se è admin. Il massimo naturale è il
// numero di admin — ognuno vota una volta sola.
export function Stella({ voti, mio, puoVotare, onVota }) {
  return (
    <button onClick={e => { e.stopPropagation(); if (puoVotare) onVota() }} disabled={!puoVotare}
      title={puoVotare ? (mio ? 'Togli il tuo voto' : 'Vota questa partita') : `${voti} voti`}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
        background: voti ? alpha(C.oro, 0.10) : 'transparent', border: `1px solid ${voti ? alpha(C.oro, 0.3) : C.bordo}`,
        cursor: puoVotare ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 16, lineHeight: 1, color: mio ? C.oro : voti ? alpha(C.oro, 0.55) : C.fioco }}>{voti ? '★' : '☆'}</span>
      <span style={{ fontSize: 11, fontFamily: F.mono, fontWeight: 700, color: voti ? C.oro : C.fioco }}>{voti}/3</span>
    </button>
  )
}

export default function TestataPartita({ p, cat, compatta = false }) {
  const c = CATEGORIE[cat]
  const classifiche = usaClassifiche()
  const dim = compatta ? 34 : 52
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'start', gap: 8 }}>
        {[[p.casa, '1'], [p.trasferta, '2']].map(([sq, segno], i) => (
          <div key={sq} style={{ display: 'contents' }}>
            {/* ⚠️ In mezzo alle squadre sta **la giocata** (10/10/2026, scelta di
                Mattia): è la cosa che si decide, e deve stare dove l'occhio va
                per primo. L'attendibilità era qui e si è spostata nella barra
                sotto, con gli altri quattro numeri. */}
            {i === 1 && (
              <div style={{ alignSelf: 'center', textAlign: 'center', padding: '0 6px', minWidth: compatta ? 76 : 96 }}>
                <Etichetta style={{ fontSize: 9, letterSpacing: '0.12em', marginBottom: 4 }}>giocata</Etichetta>
                <div style={{ fontSize: compatta ? 19 : 24, fontWeight: 800, fontFamily: F.mono, color: c.colore, lineHeight: 1.1 }}>{pronosticoDa(p.giocata)}</div>
                <div style={{ marginTop: compatta ? 5 : 7 }}><Barra frazione={p.probGiocata} colore={c.colore} altezza={compatta ? 5 : 6} /></div>
              </div>
            )}
            <div style={{ textAlign: 'center', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: compatta ? 6 : 8 }}>
                <Scudetto nome={sq} colore={p.segno === segno ? c.colore : C.grigioFioco} dim={dim}
                  posto={postoDi(classifiche, p.div, sq)} />
              </div>
              <div style={{
                fontSize: compatta ? 'clamp(13px, 4vw, 16px)' : 'clamp(15px, 5.2vw, 22px)',
                fontWeight: 800, fontFamily: F.sans, letterSpacing: '0.02em',
                textTransform: 'uppercase', lineHeight: 1.15, overflowWrap: 'anywhere',
                color: p.segno === segno ? C.testo : C.spento,
              }}>{sq}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: compatta ? 9 : 14,
        paddingTop: compatta ? 8 : 10, borderTop: `1px solid ${C.bordoTenue}` }}>
        <span style={{ fontSize: compatta ? 12 : 14, fontWeight: 600, fontFamily: F.mono, color: C.testo }}>📅 {giorno(p.data).toUpperCase()}</span>
        {p.ora && <span style={{ fontSize: compatta ? 12 : 14, fontWeight: 600, fontFamily: F.mono, color: C.testo }}>🕐 {p.ora.slice(0, 5)}</span>}
      </div>
    </>
  )
}
