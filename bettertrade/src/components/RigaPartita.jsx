import { useState } from 'react'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Badge } from '../components/ui'

// Una partita nella lista: squadre, attendibilità, giocata suggerita. Si apre
// al tocco e mostra consenso, quote e scarto.

export const CATEGORIE = {
  centro: { nome: 'Centro', colore: C.menta,     desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo', colore: C.oroChiaro, desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',    colore: C.celeste,   desc: 'i 4 lati: sacrificabili' },
  no:     { nome: '—',      colore: C.fantasma,  desc: 'sotto soglia' },
}

export const pct = v => (v * 100).toFixed(0) + '%'
const pctSegno = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'
export const giorno = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })

// La stella: il voto di un admin. `voti` è il totale, `mio` se l'utente
// corrente ha già votato, `puoVotare` se è admin. Il massimo naturale è il
// numero di admin — ognuno vota una volta sola.
function Stella({ voti, mio, puoVotare, onVota }) {
  const on = voti > 0
  return (
    <button onClick={e => { e.stopPropagation(); if (puoVotare) onVota() }} disabled={!puoVotare} title={puoVotare ? (mio ? 'Togli il tuo voto' : 'Vota questa partita') : `${voti} voti`} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '2px 6px',
      background: 'transparent', border: 'none', cursor: puoVotare ? 'pointer' : 'default',
    }}>
      <span style={{ fontSize: 22, lineHeight: 1, color: mio ? C.oro : on ? alpha(C.oro, 0.55) : C.fantasma, filter: mio ? `drop-shadow(0 0 6px ${alpha(C.oro, 0.6)})` : 'none' }}>{on ? '★' : '☆'}</span>
      <span style={{ fontSize: 10, fontFamily: F.mono, fontWeight: 700, color: on ? C.oro : C.fantasma }}>{voti}/3</span>
    </button>
  )
}

export default function RigaPartita({ p, cat, voti = 0, mio = false, puoVotare = false, onVota }) {
  const c = CATEGORIE[cat]
  const [aperta, setAperta] = useState(false)
  return (
    <Card style={{ padding: '12px 14px', borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined, cursor: 'pointer' }} onClick={() => setAperta(v => !v)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <Badge colore={C.blu}>{p.div}</Badge>
            {cat !== 'no' && <Badge colore={c.colore}>{c.nome}</Badge>}
            {cat !== 'no' && <span style={{ color: C.fantasma, fontSize: 12 }}>—</span>}
            <span style={{ fontSize: 13, fontWeight: 600, color: C.testo, fontFamily: F.mono }}>{giorno(p.data)}{p.ora ? <span style={{ color: C.spento }}> · {p.ora.slice(0, 5)}</span> : ''}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.testo, fontFamily: F.sans }}>
            <span style={{ color: p.segno === '1' ? C.testo : C.spento }}>{p.casa}</span>
            <span style={{ color: C.fioco }}> – </span>
            <span style={{ color: p.segno === '2' ? C.testo : C.spento }}>{p.trasferta}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <Etichetta style={{ marginBottom: 2 }}>attendibilità</Etichetta>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.mono, color: c.colore, lineHeight: 1 }}>{pct(p.probGiocata)}</div>
            {p.giocata.length === 2 && <div style={{ fontSize: 9, color: C.spento, fontFamily: F.mono, marginTop: 2 }}>{p.segno} secco {pct(p.prob)}</div>}
          </div>
          <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 10px', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: F.mono, color: C.oro, minWidth: 80 }}>{p.giocata}</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: c.colore }}>
          {p.quotaGiocata ? p.quotaGiocata.toFixed(2) : p.quota ? <span style={{ fontSize: 9, fontWeight: 400, color: C.spento, letterSpacing: 0.5 }}>combinata, sul book</span> : null}
        </div>
        {p.quotaFonte && <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento, alignSelf: 'flex-end', paddingBottom: 2 }}>{p.quotaFonte}</div>}
        {p.giocata !== p.segno && p.quota && (
          <div style={{ fontSize: 10, fontFamily: F.mono, color: C.spento, marginLeft: 'auto' }}>{p.segno} secco {p.quota}</div>
        )}
      </div>

      {aperta && (
        <div style={{ marginTop: 10, fontSize: 11, fontFamily: F.mono, color: C.spento, lineHeight: 1.8 }}>
          <div>consenso: 1 {pct(p.p.p1)} · X {pct(p.p.px)} · 2 {pct(p.p.p2)} · media di mercato {p.avg_ap_1}/{p.avg_ap_x}/{p.avg_ap_2}</div>
          {p.q1 && <div>{p.quotaFonte}: 1 @{p.q1} · X @{p.qx} · 2 @{p.q2}</div>}
          {p.book_1 && p.b365_1 && <div>Bet365: 1 @{p.b365_1} · X @{p.b365_x} · 2 @{p.b365_2}</div>}
          {p.max_ap_1 && <div>massima sul mercato: 1 @{p.max_ap_1} · X @{p.max_ap_x} · 2 @{p.max_ap_2}{p.b365_over25 ? ` · over 2,5 @${p.b365_over25} (Bet365)` : ''}</div>}
          {p.scarto !== null && <div>sul {p.segno}: {p.quotaFonte} paga <span style={{ color: p.scarto >= 0 ? C.verde : C.rosso }}>{pctSegno(p.scarto)}</span> rispetto al prezzo equo ({p.equo.toFixed(2)})</div>}
          {p.nota && <div style={{ color: C.fioco }}>{p.nota}</div>}
          <div style={{ color: C.fantasma }}>fonte: {p.fonte || '—'} · scaricata {new Date(p.scaricato_il).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      )}
    </Card>
  )
}
