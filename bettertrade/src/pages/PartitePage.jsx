import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Badge } from '../components/ui'

// La lista delle partite future, ordinata per ATTENDIBILITÀ.
//
// Attendibilità = probabilità che l'esito si verifichi, stimata dal consenso
// del mercato: la media di ~40 book (avg_ap_*) con il margine tolto. Sui
// favoriti il mercato è calibrato — un 75% vince il 75% delle volte — quindi
// è la stima migliore disponibile. Vedi STATO.md.
//
// Le regole di Mattia (16/09/2026):
//   · si gioca 1 o 2, mai la X secca
//   · quota < 1,25  → favorito + over 1,5 (se non basta, over 2,5)
//   · quota > 1,90  → doppia chance (1X o X2)
//   · gialli = le partite più attendibili, blu = sacrificabili, centro = perfetta
//
// Lo scarto rispetto al prezzo equo (quanto Bet365 paga in più o in meno del
// consenso) resta come informazione secondaria: fra due favoriti uguali,
// meglio quello pagato meglio.

const SOGLIE_DEFAULT = { centro: 0.80, giallo: 0.65, blu: 0.55 }
const REGOLA_OVER = 1.25
const REGOLA_DOPPIA = 1.90

function equa(q1, qx, q2) {
  if (!q1 || !qx || !q2) return null
  const s = 1 / q1 + 1 / qx + 1 / q2
  return { p1: 1 / q1 / s, px: 1 / qx / s, p2: 1 / q2 / s }
}

// Quota doppia chance stimata dalle quote Bet365 1X2: 1/(1/a + 1/b).
// È il modo in cui i book la prezzano, a meno di centesimi.
const doppia = (a, b) => (a && b) ? 1 / (1 / a + 1 / b) : null

function arricchisci(r) {
  const p = equa(r.avg_ap_1, r.avg_ap_x, r.avg_ap_2)
  if (!p) return { ...r, prob: null }
  // Il favorito fra 1 e 2: la X è esclusa per regola.
  const segno = p.p1 >= p.p2 ? '1' : '2'
  const prob = segno === '1' ? p.p1 : p.p2
  const quota = segno === '1' ? r.b365_1 : r.b365_2
  const equo = quota && prob ? 1 / prob : null
  const scarto = quota && equo ? quota / equo - 1 : null

  // La giocata suggerita dalle regole.
  let giocata, quotaGiocata, nota = null
  if (quota && quota < REGOLA_OVER) {
    giocata = `${segno} + over 1,5`
    quotaGiocata = null
    nota = `quota ${quota} sotto ${REGOLA_OVER}: si aggiunge l'over 1,5 (se non basta, over 2,5 @${r.b365_over25 ?? '—'}). La quota combinata va letta sul book.`
  } else if (quota && quota > REGOLA_DOPPIA) {
    giocata = segno === '1' ? '1X' : 'X2'
    quotaGiocata = segno === '1' ? doppia(r.b365_1, r.b365_x) : doppia(r.b365_x, r.b365_2)
    nota = `quota ${quota} sopra ${REGOLA_DOPPIA}: doppia chance, stimata dalle quote 1X2`
  } else {
    giocata = segno
    quotaGiocata = quota
  }
  // L'attendibilità è quella della GIOCATA, non del segno secco: una doppia
  // chance al 73% è più attendibile del suo 2 secco al 45% — è il senso della
  // regola sopra 1,90. Per "+ over" resta quella del segno: un limite superiore,
  // perché la combinata vale meno (manca l'1-0), e non abbiamo le quote per dirlo.
  const probDoppia = segno === '1' ? p.p1 + p.px : p.p2 + p.px
  const probGiocata = giocata.length === 2 ? probDoppia : prob
  return { ...r, p, segno, prob, quota, equo, scarto, giocata, quotaGiocata, nota, probDoppia, probGiocata }
}

const pct = v => (v * 100).toFixed(0) + '%'
const pctSegno = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%'
const giorno = d => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })

const CATEGORIE = {
  centro: { nome: 'Centro',  colore: C.oro,          desc: 'la partita perfetta' },
  giallo: { nome: 'Giallo',  colore: C.oroChiaro,    desc: 'i 4 angoli: le più attendibili' },
  blu:    { nome: 'Blu',     colore: C.celeste,      desc: 'i 4 lati: sacrificabili' },
  no:     { nome: '—',       colore: C.fantasma,     desc: 'sotto soglia' },
}
const categoria = (prob, s) => prob === null ? 'no' : prob >= s.centro ? 'centro' : prob >= s.giallo ? 'giallo' : prob >= s.blu ? 'blu' : 'no'

export default function PartitePage() {
  const [righe, setRighe] = useState([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState(null)
  const [soglie, setSoglie] = useState(SOGLIE_DEFAULT)
  const [campionato, setCampionato] = useState('')
  const [quotaMin, setQuotaMin] = useState('')
  const [quotaMax, setQuotaMax] = useState('')
  const [soloSopraSoglia, setSoloSopraSoglia] = useState(true)
  const [mostraSoglie, setMostraSoglie] = useState(false)

  useEffect(() => {
    async function carica() {
      const oggi = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('prossime_partite')
        .select('id, div, campionato, data, ora, casa, trasferta, scaricato_il, b365_1, b365_x, b365_2, b365_over25, avg_ap_1, avg_ap_x, avg_ap_2')
        .gte('data', oggi).order('data').order('ora')
      if (error) setErrore(error.message)
      else setRighe((data || []).map(arricchisci))
      setCaricamento(false)
    }
    carica()
  }, [])

  const campionati = useMemo(() => [...new Set(righe.map(r => r.div))].sort(), [righe])
  const ultimoDownload = useMemo(() => righe.reduce((m, r) => (!m || r.scaricato_il > m ? r.scaricato_il : m), null), [righe])

  const visibili = useMemo(() => {
    const qMin = parseFloat(quotaMin), qMax = parseFloat(quotaMax)
    return righe
      .filter(r => r.prob !== null)
      .filter(r => campionato ? r.div === campionato : true)
      .filter(r => Number.isFinite(qMin) ? (r.quota ?? 0) >= qMin : true)
      .filter(r => Number.isFinite(qMax) ? (r.quota ?? 99) <= qMax : true)
      .filter(r => soloSopraSoglia ? categoria(r.probGiocata, soglie) !== 'no' : true)
      .sort((a, b) => b.probGiocata - a.probGiocata)
  }, [righe, campionato, quotaMin, quotaMax, soloSopraSoglia, soglie])

  const conteggi = useMemo(() => {
    const c = { centro: 0, giallo: 0, blu: 0 }
    for (const r of righe) { if (r.prob === null) continue; const k = categoria(r.probGiocata, soglie); if (k !== 'no') c[k]++ }
    return c
  }, [righe, soglie])

  const inputStile = { padding: '6px 10px', borderRadius: 20, background: C.pozzo, border: `1px solid ${C.bordo}`, color: C.testo, fontFamily: F.mono, fontSize: 11, outline: 'none', width: 74 }

  return (
    <div style={{ padding: '16px' }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>PARTITE</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Prossime partite</div>
      <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans, marginBottom: 14, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : (
          <>
            {righe.length} partite ·{' '}
            <span style={{ color: C.oro }}>{conteggi.centro} centro</span> ·{' '}
            <span style={{ color: C.oroChiaro }}>{conteggi.giallo} gialle</span> ·{' '}
            <span style={{ color: C.celeste }}>{conteggi.blu} blu</span>
          </>
        )}
        {ultimoDownload && <span style={{ color: C.fioco }}> · aggiornate {new Date(ultimoDownload).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <select value={campionato} onChange={e => setCampionato(e.target.value)} style={{ ...inputStile, width: 'auto', color: campionato ? C.testo : C.fioco }}>
          <option value="">Tutti i campionati</option>
          {campionati.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 10, color: C.spento, fontFamily: F.mono }}>quota</span>
        <input style={inputStile} placeholder="min" inputMode="decimal" value={quotaMin} onChange={e => setQuotaMin(e.target.value)} />
        <input style={inputStile} placeholder="max" inputMode="decimal" value={quotaMax} onChange={e => setQuotaMax(e.target.value)} />
        <button onClick={() => setSoloSopraSoglia(v => !v)} style={{
          padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11,
          background: soloSopraSoglia ? alpha(C.oro, 0.15) : 'transparent',
          border: `1px solid ${soloSopraSoglia ? alpha(C.oro, 0.5) : C.bordo}`, color: soloSopraSoglia ? C.oro : C.fioco,
        }}>{soloSopraSoglia ? 'solo sopra soglia' : 'tutte'}</button>
        <button onClick={() => setMostraSoglie(v => !v)} style={{ padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11, background: 'transparent', border: `1px solid ${C.bordo}`, color: C.fioco, marginLeft: 'auto' }}>⚙ soglie</button>
      </div>

      {mostraSoglie && (
        <Card style={{ marginBottom: 12 }}>
          <Etichetta style={{ marginBottom: 8 }}>Soglie di probabilità — le aggiustate voi guardando le partite vere</Etichetta>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {['centro', 'giallo', 'blu'].map(k => (
              <label key={k} style={{ fontSize: 11, fontFamily: F.mono, color: CATEGORIE[k].colore }}>
                {CATEGORIE[k].nome} ≥ {pct(soglie[k])}
                <input type="range" min="40" max="95" step="1" value={Math.round(soglie[k] * 100)}
                  onChange={e => setSoglie(s => ({ ...s, [k]: Number(e.target.value) / 100 }))}
                  style={{ width: '100%', accentColor: CATEGORIE[k].colore }} />
              </label>
            ))}
          </div>
        </Card>
      )}

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}
      {!caricamento && !errore && righe.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
          Nessuna partita futura in archivio. Arrivano con l'aggiornamento del martedì e del venerdì:
          <code style={{ display: 'block', marginTop: 8, color: C.oro, fontFamily: F.mono, fontSize: 11 }}>cd btscout && node --env-file=.env scripts/aggiorna.js --esegui</code>
        </div></Card>
      )}
      {!caricamento && righe.length > 0 && visibili.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans }}>Nessuna partita con questi filtri.</div></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibili.map(p => <RigaPartita key={p.id} p={p} cat={categoria(p.probGiocata, soglie)} />)}
      </div>

      {righe.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 11, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.7 }}>
          <b style={{ color: C.fioco }}>Come leggere.</b> L'attendibilità è la probabilità che il favorito vinca, secondo il consenso
          del mercato (media di ~40 book, tolto il margine). Sui favoriti il mercato è calibrato: un 75% vince tre volte su quattro.
          La X secca non viene mai proposta. Sotto 1,25 si aggiunge l'over 1,5; sopra 1,90 si passa alla doppia chance.
          Lo scarto sotto la quota dice se Bet365 paga più (+) o meno (−) del consenso.
          Gli orari sono quelli del Regno Unito.
        </div>
      )}
    </div>
  )
}

function RigaPartita({ p, cat }) {
  const c = CATEGORIE[cat]
  const [aperta, setAperta] = useState(false)
  return (
    <Card style={{ padding: '12px 14px', borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined }} onClick={() => setAperta(v => !v)}>
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

      {/* La giocata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 10px', background: C.pozzo, border: `1px solid ${C.bordo}`, borderRadius: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: F.mono, color: C.oro, minWidth: 80 }}>{p.giocata}</div>
        <div style={{ fontSize: 13, fontFamily: F.mono, color: C.testo }}>
          {p.quotaGiocata ? `@ ${p.quotaGiocata.toFixed(2)}` : <span style={{ color: C.spento }}>quota sul book</span>}
        </div>
        {p.giocata !== p.segno && (
          <div style={{ fontSize: 10, fontFamily: F.mono, color: C.spento, marginLeft: 'auto' }}>
            {p.segno} secco @{p.quota}
          </div>
        )}
      </div>

      {aperta && (
        <div style={{ marginTop: 10, fontSize: 11, fontFamily: F.mono, color: C.spento, lineHeight: 1.8 }}>
          <div>consenso: 1 {pct(p.p.p1)} · X {pct(p.p.px)} · 2 {pct(p.p.p2)}</div>
          <div>Bet365: 1 @{p.b365_1} · X @{p.b365_x} · 2 @{p.b365_2}{p.b365_over25 ? ` · over 2,5 @${p.b365_over25}` : ''}</div>
          {p.scarto !== null && <div>sul {p.segno}: Bet365 paga <span style={{ color: p.scarto >= 0 ? C.verde : C.rosso }}>{pctSegno(p.scarto)}</span> rispetto al prezzo equo ({p.equo.toFixed(2)})</div>}
          {p.nota && <div style={{ color: C.fioco }}>{p.nota}</div>}
        </div>
      )}
    </Card>
  )
}
