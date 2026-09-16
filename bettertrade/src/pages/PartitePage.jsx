import { useState, useMemo } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import RigaPartita, { CATEGORIE, pct, giorno } from '../components/RigaPartita'
import { categoria, FINESTRE, SOGLIE_DEFAULT } from '../lib/attendibilita'

// La lista delle partite future, ordinata per attendibilità.
// I calcoli stanno in lib/attendibilita.js, la riga in components/RigaPartita.jsx:
// qui solo caricamento, filtri e composizione.

const pillola = (on, colore = C.oro) => ({
  padding: '6px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: F.mono, fontSize: 11, fontWeight: 600,
  background: on ? alpha(colore, 0.15) : 'transparent',
  border: `1px solid ${on ? alpha(colore, 0.5) : C.bordo}`,
  color: on ? colore : C.fioco,
})
const campo = { padding: '6px 10px', borderRadius: 20, background: C.pozzo, border: `1px solid ${C.bordo}`, color: C.testo, fontFamily: F.mono, fontSize: 11, outline: 'none', width: 74 }

export default function PartitePage() {
  const { isAdmin } = useAuth()
  const { righe, vota, votiDi, mioVoto, caricamento, errore } = usaProssime()
  const [soglie, setSoglie] = useState(SOGLIE_DEFAULT)
  const [finestra, setFinestra] = useState('settimana')
  const [campionato, setCampionato] = useState('')
  const [quotaMin, setQuotaMin] = useState('')
  const [quotaMax, setQuotaMax] = useState('')
  const [soloSopraSoglia, setSoloSopraSoglia] = useState(false)
  const [mostraSoglie, setMostraSoglie] = useState(false)

  // Per il menu a tendina: "I1 – Serie A"
  const campionati = useMemo(() => {
    const m = new Map(); for (const r of righe) m.set(r.div, r.campionato)
    return [...m.entries()].sort()
  }, [righe])

  const ultimoDownload = useMemo(() => righe.reduce((m, r) => (!m || r.scaricato_il > m ? r.scaricato_il : m), null), [righe])

  // Quante partite cadono in ogni finestra: serve a dire quando allargare non aggiunge niente.
  const perFinestra = useMemo(() => Object.fromEntries(FINESTRE.map(f => [f.id, righe.filter(r => r.data <= f.fine()).length])), [righe])

  const inFinestra = useMemo(() => {
    const fine = FINESTRE.find(f => f.id === finestra).fine()
    return righe.filter(r => r.data <= fine)
  }, [righe, finestra])

  // La quota su cui si filtra è quella MOSTRATA: della doppia chance se c'è,
  // altrimenti del segno. E si accetta la virgola: "1,5" è quello che si scrive
  // in Italia, e parseFloat da solo lo leggerebbe come 1.
  const numero = t => { const n = parseFloat(String(t).replace(',', '.')); return Number.isFinite(n) ? n : null }
  const quotaMostrata = r => r.quotaGiocata ?? r.quota ?? null

  const visibili = useMemo(() => {
    const qMin = numero(quotaMin), qMax = numero(quotaMax)
    return inFinestra
      .filter(r => campionato ? r.div === campionato : true)
      .filter(r => qMin === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) >= qMin)
      .filter(r => qMax === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) <= qMax)
      .filter(r => soloSopraSoglia ? categoria(r.probGiocata, soglie) !== 'no' : true)
      .sort((a, b) => b.probGiocata - a.probGiocata)
  }, [inFinestra, campionato, quotaMin, quotaMax, soloSopraSoglia, soglie])

  const conteggi = useMemo(() => {
    const c = { centro: 0, giallo: 0, blu: 0 }
    for (const r of inFinestra) { const k = categoria(r.probGiocata, soglie); if (k !== 'no') c[k]++ }
    return c
  }, [inFinestra, soglie])

  const ultimaData = inFinestra.reduce((m, r) => (r.data > m ? r.data : m), '')

  return (
    <div style={{ padding: '16px' }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>PARTITE</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Prossime partite</div>
      <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans, marginBottom: 14, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : (
          <>
            {inFinestra.length} partite{ultimaData && ` fino a ${giorno(ultimaData)}`} ·{' '}
            <span style={{ color: CATEGORIE.centro.colore }}>{conteggi.centro} centro</span> ·{' '}
            <span style={{ color: CATEGORIE.giallo.colore }}>{conteggi.giallo} gialle</span> ·{' '}
            <span style={{ color: CATEGORIE.blu.colore }}>{conteggi.blu} blu</span>
          </>
        )}
        {ultimoDownload && <span style={{ color: C.fioco }}> · aggiornate {new Date(ultimoDownload).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {/* Finestra temporale */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {FINESTRE.map((f, i) => {
          const n = perFinestra[f.id], prec = i > 0 ? perFinestra[FINESTRE[i - 1].id] : null
          const nienteInPiu = prec !== null && n === prec
          return (
            <button key={f.id} onClick={() => setFinestra(f.id)} style={pillola(finestra === f.id)} title={nienteInPiu ? 'Nessuna partita in più: i bookmaker non hanno ancora quotato oltre' : ''}>
              {f.label}
              <span style={{ color: C.fantasma, fontWeight: 400 }}> {f.id === 'tutte' ? '' : giorno(f.fine()).slice(0, 9) + ' · '}{n}{nienteInPiu ? ' =' : ''}</span>
            </button>
          )
        })}
      </div>
      {finestra !== 'settimana' && perFinestra[finestra] === perFinestra.settimana && !caricamento && (
        <div style={{ fontSize: 11, color: C.fioco, fontFamily: F.sans, marginBottom: 8 }}>
          Nessuna partita in più rispetto a "fino a lunedì": i bookmaker non hanno ancora quotato quelle successive. Arrivano con i prossimi aggiornamenti.
        </div>
      )}

      {/* Filtri */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <select value={campionato} onChange={e => setCampionato(e.target.value)} style={{ ...campo, width: 'auto', color: campionato ? C.testo : C.fioco }}>
          <option value="">Tutti i campionati</option>
          {campionati.map(([d, nome]) => <option key={d} value={d}>{d} – {nome}</option>)}
        </select>
        <span style={{ fontSize: 10, color: C.spento, fontFamily: F.mono }}>quota</span>
        <input style={{ ...campo, borderColor: quotaMin && numero(quotaMin) === null ? C.rosso : C.bordo }} placeholder="min" inputMode="decimal" value={quotaMin} onChange={e => setQuotaMin(e.target.value)} />
        <input style={{ ...campo, borderColor: quotaMax && numero(quotaMax) === null ? C.rosso : C.bordo }} placeholder="max" inputMode="decimal" value={quotaMax} onChange={e => setQuotaMax(e.target.value)} />
        {(quotaMin || quotaMax) && <button onClick={() => { setQuotaMin(''); setQuotaMax('') }} style={{ ...pillola(false), padding: '6px 9px' }}>✕</button>}
        <button onClick={() => setSoloSopraSoglia(v => !v)} style={pillola(soloSopraSoglia)}>{soloSopraSoglia ? 'solo sopra soglia' : 'tutte'}</button>
        <button onClick={() => setMostraSoglie(v => !v)} style={{ ...pillola(false), marginLeft: 'auto' }}>⚙ soglie</button>
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
          Nessuna partita futura in archivio. Arrivano con l'aggiornamento:
          <code style={{ display: 'block', marginTop: 8, color: C.oro, fontFamily: F.mono, fontSize: 11 }}>cd btscout && node --env-file=.env scripts/aggiorna.js --esegui</code>
        </div></Card>
      )}
      {!caricamento && righe.length > 0 && visibili.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans }}>Nessuna partita con questi filtri.</div></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibili.map(p => (
          <RigaPartita key={p.id} p={p} cat={categoria(p.probGiocata, soglie)}
            voti={votiDi(p.id)} mio={mioVoto(p.id)} puoVotare={isAdmin} onVota={() => vota(p.id)} />
        ))}
      </div>

      {righe.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 11, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.7 }}>
          <b style={{ color: C.fioco }}>Come leggere.</b> L'attendibilità è la probabilità che la giocata vinca, secondo il consenso
          del mercato (media di ~40 book, tolto il margine). Sui favoriti il mercato è calibrato: un 75% vince tre volte su quattro.
          La X secca non viene mai proposta. Sotto 1,25 si aggiunge l'over 1,5; sopra 1,90 si passa alla doppia chance.
          La quota è di <b style={{ color: C.fioco }}>Codere</b> quando c'è; altrimenti Bet365, altrimenti la massima sul mercato — sotto ogni quota c'è scritto quale.
          Gli orari sono quelli del Regno Unito.
        </div>
      )}
    </div>
  )
}
