import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { giocataArrivata } from '../lib/esito'
import { C, F, S, SP } from '../theme'
import { Card, Etichetta } from './ui'

// I numeri in cima all'Archivio di Road to weekend (Mattia, 04/11/2026): guadagno
// sui soldi versati, passi presi, partite prese. Si conta dal 4/11 per tutti
// (`statistiche_rtw`, sql/60). ⚠️ Una partita senza risultato non conta: né
// presa né persa. `aggiorna` cambia quando arrivano risultati nuovi.

const per = (x) => `${x.toFixed(1).replace('.', ',')}%`

export default function StatisticheRtw({ aggiorna = 0 }) {
  const [d, setD] = useState(null)
  const [errore, setErrore] = useState(null)
  useEffect(() => {
    supabase.rpc('statistiche_rtw').then(({ data, error }) => {
      if (error) setErrore(error.message); else { setD(data); setErrore(null) }
    })
  }, [aggiorna])

  if (errore) return (
    <Card style={{ marginTop: SP.m }}><div style={{ fontFamily: F.sans, fontSize: S.base, color: C.rosso }}>{errore}</div></Card>
  )
  const risultato = Number(d?.risultato || 0)
  const base = Number(d?.conto || 0) - risultato
  const guadagno = d && base > 0 ? risultato / base * 100 : null
  const esiti = (d?.partite || []).map(g => giocataArrivata(g.giocata, g.gol_casa, g.gol_trasferta)).filter(x => x !== null)
  const prese = esiti.filter(Boolean).length
  const voci = [
    ['GUADAGNO', guadagno == null ? '—' : `${guadagno > 0 ? '+' : ''}${per(guadagno)}`,
      guadagno == null || guadagno === 0 ? C.testo : guadagno > 0 ? C.verde : C.rosso, d ? `${risultato >= 0 ? '+' : ''}${risultato.toFixed(2).replace('.', ',')} €` : ''],
    ['PASSI PRESI', d?.passi ? per(d.passi_presi / d.passi * 100) : '—', C.testo, d ? `${d.passi_presi} su ${d.passi}` : ''],
    ['PARTITE PRESE', esiti.length ? per(prese / esiti.length * 100) : '—', C.testo, d ? `${prese} su ${esiti.length}` : ''],
  ]
  return (
    <Card style={{ marginTop: SP.m, marginBottom: SP.m }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: SP.s, textAlign: 'center' }}>
        {voci.map(([l, v, col, sotto]) => (
          <div key={l} style={{ minWidth: 0 }}>
            <Etichetta>{l}</Etichetta>
            <div style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: col, marginTop: 3 }}>{v}</div>
            <div style={{ fontFamily: F.mono, fontSize: S.micro, color: C.fioco, marginTop: 2 }}>{sotto}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco, marginTop: SP.s, textAlign: 'center' }}>dal 4/11/2026</div>
    </Card>
  )
}
