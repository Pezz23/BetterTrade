import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Badge } from '../components/ui'

// La lista delle partite future con l'indice di attendibilità.
//
// L'indice è lo scarto fra la quota Bet365 e il prezzo equo ricavato dalla
// media di mercato di apertura, normalizzata (probabilità implicite divise per
// la loro somma). È il criterio del progetto, misurato il 16/09/2026: le
// scommesse con scarto > 0 battono la quota di chiusura del 2% in media, su
// 5.480 casi in otto stagioni. Vedi STATO.md.
//
// NON si usa l'exchange come riferimento: all'apertura è troppo sottile, e le
// scommesse scelte con quello perdono contro la chiusura. Il riferimento è
// avg_ap_*, non bfe_ap_*.

const SOGLIE = [
  { id: 'tutte', label: 'Tutte',   min: -Infinity },
  { id: 'pos',   label: '> 0%',    min: 0 },
  { id: 'due',   label: '> 2%',    min: 0.02 },
  { id: 'cinque',label: '> 5%',    min: 0.05 },
]

// Quota equa da una terna: toglie il margine, lascia il rapporto fra gli esiti.
function equa(q1, qx, q2) {
  if (!q1 || !qx || !q2) return null
  const s = 1 / q1 + 1 / qx + 1 / q2
  return [q1 * s, qx * s, q2 * s]
}

// Per ogni partita: lo scarto su ognuno dei tre segni, e il migliore.
function arricchisci(p) {
  const eq = equa(p.avg_ap_1, p.avg_ap_x, p.avg_ap_2)
  const quote = [p.b365_1, p.b365_x, p.b365_2]
  const segni = ['1', 'X', '2']
  const scarti = eq && quote.every(Boolean) ? quote.map((q, i) => q / eq[i] - 1) : [null, null, null]
  let migliore = -1
  scarti.forEach((s, i) => { if (s !== null && (migliore < 0 || s > scarti[migliore])) migliore = i })
  return { ...p, quote, segni, equo: eq, scarti, migliore, indice: migliore >= 0 ? scarti[migliore] : null }
}

const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'
const giorno = d => {
  const x = new Date(d + 'T12:00:00')
  return x.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
const coloreScarto = s => s === null ? C.fantasma : s > 0.02 ? C.verde : s > 0 ? C.menta : C.spento

export default function PartitePage() {
  const [righe, setRighe] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [soglia, setSoglia] = useState('pos')
  const [campionato, setCampionato] = useState('')
  const [ordine, setOrdine] = useState('indice') // indice | data

  useEffect(() => {
    async function carica() {
      const oggi = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('prossime_partite')
        .select('id, div, campionato, data, ora, casa, trasferta, scaricato_il, b365_1, b365_x, b365_2, avg_ap_1, avg_ap_x, avg_ap_2')
        .gte('data', oggi)
        .order('data').order('ora')
      if (error) setErrore(error.message)
      else setRighe((data || []).map(arricchisci))
      setCaricamento(false)
    }
    carica()
  }, [])

  const campionati = useMemo(() => [...new Set(righe.map(r => r.div))].sort(), [righe])
  const ultimoDownload = useMemo(() => righe.reduce((m, r) => (!m || r.scaricato_il > m ? r.scaricato_il : m), null), [righe])

  const visibili = useMemo(() => {
    const min = SOGLIE.find(s => s.id === soglia).min
    let v = righe.filter(r => (campionato ? r.div === campionato : true))
    v = v.filter(r => soglia === 'tutte' ? true : r.indice !== null && r.indice > min)
    if (ordine === 'indice') v = [...v].sort((a, b) => (b.indice ?? -9) - (a.indice ?? -9))
    return v
  }, [righe, soglia, campionato, ordine])

  const conSegnale = righe.filter(r => r.indice !== null && r.indice > 0).length

  return (
    <div style={{ padding: '16px' }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>PARTITE</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Prossime partite</div>
      <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans, marginBottom: 16, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : `${righe.length} partite · ${conSegnale} con quota sopra il prezzo equo`}
        {ultimoDownload && <span style={{ color: C.fioco }}> · aggiornate {new Date(ultimoDownload).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {SOGLIE.map(s => (
          <button key={s.id} onClick={() => setSoglia(s.id)} style={{
            padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11, fontWeight: 600,
            background: soglia === s.id ? alpha(C.oro, 0.15) : 'transparent',
            border: `1px solid ${soglia === s.id ? alpha(C.oro, 0.5) : C.bordo}`,
            color: soglia === s.id ? C.oro : C.fioco,
          }}>{s.label}</button>
        ))}
        <select value={campionato} onChange={e => setCampionato(e.target.value)} style={{
          padding: '6px 10px', borderRadius: 20, background: C.pozzo, border: `1px solid ${C.bordo}`,
          color: campionato ? C.testo : C.fioco, fontFamily: F.mono, fontSize: 11, outline: 'none',
        }}>
          <option value="">Tutti i campionati</option>
          {campionati.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button onClick={() => setOrdine(o => o === 'indice' ? 'data' : 'indice')} style={{
          padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11,
          background: 'transparent', border: `1px solid ${C.bordo}`, color: C.fioco, marginLeft: 'auto',
        }}>↕ {ordine === 'indice' ? 'per indice' : 'per data'}</button>
      </div>

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      {!caricamento && !errore && righe.length === 0 && (
        <Card>
          <div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
            Nessuna partita futura in archivio. Le partite arrivano con l'aggiornamento del martedì e del venerdì:
            <code style={{ display: 'block', marginTop: 8, color: C.oro, fontFamily: F.mono, fontSize: 11 }}>cd btscout && node --env-file=.env scripts/aggiorna.js --esegui</code>
          </div>
        </Card>
      )}

      {!caricamento && righe.length > 0 && visibili.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans }}>Nessuna partita con questi filtri.</div></Card>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibili.map(p => <RigaPartita key={p.id} p={p} />)}
      </div>

      {righe.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 11, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.7 }}>
          <b style={{ color: C.fioco }}>Come leggere.</b> L'indice è quanto la quota Bet365 sta sopra (+) o sotto (−) il prezzo equo
          del mercato — la media di ~40 book, tolto il margine. Sopra lo zero, Bet365 sta pagando più del dovuto.
          Sullo storico (5.480 casi, otto stagioni) quelle quote battono il prezzo finale del 2% in media.
          È un vantaggio <i>atteso</i> per singola scommessa: non una previsione del risultato.
          Gli orari sono quelli del Regno Unito.
        </div>
      )}
    </div>
  )
}

function RigaPartita({ p }) {
  const haIndice = p.indice !== null
  return (
    <Card style={{ padding: '12px 14px', borderColor: haIndice && p.indice > 0.02 ? alpha(C.verde, 0.3) : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <Badge colore={C.blu}>{p.div}</Badge>
            <span style={{ fontSize: 11, color: C.spento, fontFamily: F.mono }}>{giorno(p.data)}{p.ora ? ` · ${p.ora.slice(0, 5)}` : ''}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.testo, fontFamily: F.sans }}>{p.casa} <span style={{ color: C.fioco }}>–</span> {p.trasferta}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <Etichetta style={{ marginBottom: 2 }}>indice</Etichetta>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: F.mono, color: coloreScarto(p.indice) }}>
            {haIndice ? pct(p.indice) : '—'}
          </div>
          {haIndice && <div style={{ fontSize: 10, color: C.spento, fontFamily: F.mono }}>sul segno <b style={{ color: C.testo }}>{p.segni[p.migliore]}</b></div>}
        </div>
      </div>
      {/* Le tre quote, con lo scarto sotto ognuna */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {p.segni.map((s, i) => {
          const sc = p.scarti[i]
          const top = i === p.migliore && sc !== null && sc > 0
          return (
            <div key={s} style={{
              background: top ? alpha(C.verde, 0.08) : C.pozzo, border: `1px solid ${top ? alpha(C.verde, 0.3) : C.bordo}`,
              borderRadius: 7, padding: '6px 8px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, color: C.spento, fontFamily: F.mono, marginBottom: 2 }}>{s}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: top ? C.verde : C.testo, fontFamily: F.mono }}>{p.quote[i] ?? '—'}</div>
              <div style={{ fontSize: 10, fontFamily: F.mono, color: coloreScarto(sc) }}>
                {sc !== null ? pct(sc) : '—'}
                {p.equo && <span style={{ color: C.fantasma }}> · eq {p.equo[i].toFixed(2)}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
