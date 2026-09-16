import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha } from '../theme'
import { Etichetta } from './ui'

// Il quadro di forma di una partita: si apre al clic sulla riga. I dati li
// calcola il database (forma_partita, sql/15) in una chiamata sola.
//
// Non cambia l'attendibilità — la forma è già dentro il consenso di mercato,
// misurato. Serve a chi sceglie per ragionare con gli occhi.

const ESITO = {
  V: { colore: C.verde, nome: 'vittoria' },
  N: { colore: C.giallo, nome: 'pareggio' },
  P: { colore: C.rosso, nome: 'sconfitta' },
}

const data = d => new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
const ordinale = n => `${n}°`

const Chip = ({ lettera, colore, title }) => (
  <span title={title} style={{
    width: 22, height: 22, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, fontFamily: F.mono,
    background: alpha(colore, 0.18), color: colore, border: `1px solid ${alpha(colore, 0.4)}`,
  }}>{lettera}</span>
)

// Due strisce affiancate, dalla più vecchia alla più recente come si legge:
// l'esito (V/N/P) e, a destra, l'over/under 2,5 della stessa partita (O/U).
function Risultati({ lista }) {
  if (!lista.length) return <span style={{ color: C.fantasma, fontSize: 11 }}>nessuna partita giocata</span>
  const ordinate = [...lista].reverse()
  const titolo = m => `${data(m.data)} · ${m.casa} ${m.gol_casa}–${m.gol_trasferta} ${m.trasferta}`
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {ordinate.map((m, i) => <Chip key={'e' + i} lettera={m.esito} colore={ESITO[m.esito].colore} title={titolo(m)} />)}
      <span style={{ width: 10 }} />
      {ordinate.map((m, i) => {
        const over = m.gol_casa + m.gol_trasferta > 2.5
        return <Chip key={'o' + i} lettera={over ? 'O' : 'U'} colore={over ? C.celeste : C.spento} title={`${titolo(m)} · ${over ? 'over' : 'under'} 2,5`} />
      })}
    </span>
  )
}

const Riga = ({ titolo, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 8, alignItems: 'start', padding: '7px 0', borderTop: `1px solid ${C.bordoTenue}` }}>
    <Etichetta style={{ paddingTop: 3 }}>{titolo}</Etichetta>
    <div style={{ fontSize: 12, fontFamily: F.mono, color: C.testo, lineHeight: 1.7 }}>{children}</div>
  </div>
)
const Squadra = ({ nome }) => <span style={{ display: 'inline-block', minWidth: 96, color: C.spento, fontFamily: F.sans, fontWeight: 600 }}>{nome}</span>

export default function FormaPartita({ div, casa, trasferta }) {
  const [f, setF] = useState(null)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    let vivo = true
    supabase.rpc('forma_partita', { p_div: div, p_casa: casa, p_trasferta: trasferta })
      .then(({ data, error }) => { if (!vivo) return; if (error) setErrore(error.message); else setF(data) })
    return () => { vivo = false }
  }, [div, casa, trasferta])

  if (errore) return <div style={{ fontSize: 11, color: C.rosso, fontFamily: F.sans, marginTop: 10 }}>⚠️ {errore}</div>
  if (!f) return <div style={{ fontSize: 11, color: C.spento, fontFamily: F.mono, marginTop: 10 }}>carico la forma…</div>

  const st = `20${f.stagione.slice(0, 2)}/${f.stagione.slice(2)}`
  const squadre = [casa, trasferta]

  return (
    <div style={{ marginTop: 10 }}>
      <Riga titolo="Ultimi 5">
        {squadre.map(sq => <div key={sq}><Squadra nome={sq} /><Risultati lista={f.ultimi5[sq] || []} /></div>)}
      </Riga>
      <Riga titolo={`Gol ${st}`}>
        {squadre.map(sq => {
          const g = f.gol[sq]
          return <div key={sq}><Squadra nome={sq} /><b style={{ color: C.verde }}>{g.fatti}</b> fatti · <b style={{ color: C.rosso }}>{g.subiti}</b> subiti <span style={{ color: C.spento }}>({g.partite} partite)</span></div>
        })}
      </Riga>
      <Riga titolo="Scontri diretti">
        {f.scontri.length === 0
          ? <span style={{ color: C.fantasma }}>nessun precedente in archivio (dal 2016)</span>
          : f.scontri.map((s, i) => (
            <div key={i}>
              <span style={{ color: C.spento }}>{data(s.data)}</span>{'  '}
              <span style={{ color: s.gol_casa > s.gol_trasferta ? C.testo : C.spento }}>{s.casa}</span>
              {' '}<b>{s.gol_casa}–{s.gol_trasferta}</b>{' '}
              <span style={{ color: s.gol_trasferta > s.gol_casa ? C.testo : C.spento }}>{s.trasferta}</span>
              {s.div !== div && <span style={{ color: C.fantasma }}> [{s.div}]</span>}
            </div>
          ))}
      </Riga>
      <Riga titolo="Classifica">
        {squadre.map(sq => {
          const c = f.classifica?.[sq]
          if (!c) return <div key={sq}><Squadra nome={sq} /><span style={{ color: C.fantasma }}>—</span></div>
          return (
            <div key={sq}>
              <Squadra nome={sq} />
              <b>{ordinale(c.posizione)}</b> in classifica <span style={{ color: C.spento }}>({c.punti} pt)</span>
              {' · '}<b style={{ color: c.posizione_forma < c.posizione ? C.verde : c.posizione_forma > c.posizione ? C.rosso : C.testo }}>{ordinale(c.posizione_forma)}</b> per forma <span style={{ color: C.spento }}>({c.punti_forma} pt nelle ultime 5, su {c.squadre})</span>
            </div>
          )
        })}
      </Riga>
    </div>
  )
}
