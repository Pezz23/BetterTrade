import { useState } from 'react'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Badge } from '../components/ui'

// Una partita nella lista: squadre, attendibilità, giocata suggerita. Si apre
// al tocco e mostra consenso, quote e scarto.

export const CATEGORIE = {
  centro: { nome: 'Centro', colore: C.oro,       desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo', colore: C.oroChiaro, desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',    colore: C.celeste,   desc: 'i 4 lati: sacrificabili' },
  no:     { nome: '—',      colore: C.fantasma,  desc: 'sotto soglia' },
}

export const pct = v => (v * 100).toFixed(0) + '%'
const pctSegno = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'
export const giorno = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })

export default function RigaPartita({ p, cat }) {
  const c = CATEGORIE[cat]
  const [aperta, setAperta] = useState(false)
  return (
    <Card style={{ padding: '12px 14px', borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined, cursor: 'pointer' }} onClick={() => setAperta(v => !v)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <Badge colore={C.blu}>{p.div}</Badge>
            {cat !== 'no' && <Badge colore={c.colore}>{c.nome}</Badge>}
            <span style={{ fontSize: 11, color: C.spento, fontFamily: F.mono }}>{giorno(p.data)}{p.ora ? ` · ${p.ora.slice(0, 5)}` : ''}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.testo, fontFamily: F.sans }}>
            <span style={{ color: p.segno === '1' ? C.testo : C.spento }}>{p.casa}</span>
            <span style={{ color: C.fioco }}> – </span>
            <span style={{ color: p.segno === '2' ? C.testo : C.spento }}>{p.trasferta}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Etichetta style={{ marginBottom: 2 }}>attendibilità</Etichetta>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: F.mono, color: c.colore, lineHeight: 1 }}>{pct(p.probGiocata)}</div>
          {p.giocata.length === 2 && <div style={{ fontSize: 9, color: C.spento, fontFamily: F.mono, marginTop: 2 }}>{p.segno} secco {pct(p.prob)}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 10px', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: F.mono, color: C.oro, minWidth: 80 }}>{p.giocata}</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: c.colore }}>
          {p.quotaGiocata ? p.quotaGiocata.toFixed(2) : p.quota ? <span style={{ fontSize: 12, fontWeight: 400, color: C.spento }}>combinata, sul book</span> : null}
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
