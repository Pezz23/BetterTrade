import { useState, useMemo } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import RigaPartita, { CATEGORIE, pct, giorno } from '../components/RigaPartita'
import SchedaScorrevole from '../components/SchedaScorrevole'
import DettaglioPartita from '../components/DettaglioPartita'
import { categoria, FINESTRE, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { etichetta, sigla } from '../lib/campionati'
import { valutaPartita, VPM_NETTO } from '../lib/vpm'

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
  const datiVpm = usaVpm()
  const [soglie, setSoglie] = useState(SOGLIE_DEFAULT)
  const [finestra, setFinestra] = useState('settimana')
  const [campionato, setCampionato] = useState('')
  const [quotaMin, setQuotaMin] = useState('')
  const [quotaMax, setQuotaMax] = useState('')
  const [soloSopraSoglia, setSoloSopraSoglia] = useState(false)
  const [gradoMin, setGradoMin] = useState('')
  const [soloVpmContro, setSoloVpmContro] = useState(false)
  const [pannello, setPannello] = useState(false)   // i filtri, chiusi di default
  const [apertaId, setApertaId] = useState(null)    // la partita aperta a tutto schermo

  // Lo scorrimento non si salva più: da quando la scheda è un foglio sopra la
  // lista (SchedaScorrevole), la lista non viene smontata e il punto resta suo.
  const apri = id => setApertaId(id)

  // Per il menu a tendina: "I1 – Serie A"
  const campionati = useMemo(() => {
    const m = new Map(); for (const r of righe) m.set(r.div, r.campionato)
    return [...m.entries()].sort((a, b) => etichetta(a[0], a[1]).localeCompare(etichetta(b[0], b[1])))
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

  // VPM di ogni partita, una volta sola: il calcolo sta in lib/vpm.js, qui
  // solo la mappa id → valutazione, che serve alla riga e al filtro.
  // ⚠️ Deve stare PRIMA di `visibili`, che lo legge nel filtro: `const` ha la
  // zona morta, e usarlo più sopra è schermata nera al primo render.
  const vpmDi = useMemo(() => {
    const m = new Map()
    if (datiVpm) for (const r of righe) m.set(r.id, valutaPartita(datiVpm, r))
    return m
  }, [datiVpm, righe])

  const visibili = useMemo(() => {
    const qMin = numero(quotaMin), qMax = numero(quotaMax), gMin = numero(gradoMin)
    return inFinestra
      .filter(r => campionato ? r.div === campionato : true)
      .filter(r => qMin === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) >= qMin)
      .filter(r => qMax === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) <= qMax)
      .filter(r => soloSopraSoglia ? categoria(r.probGiocata, soglie) !== 'no' : true)
      .filter(r => gMin === null ? true : r.grado !== null && r.grado >= gMin)
      // Le partite dove il campo dice il contrario del mercato, ed è **netto**:
      // è la lista che Mattia andava a cercare a mano in quattro schermate.
      // Un campo indeciso (sotto VPM_NETTO) non è un disaccordo.
      .filter(r => { if (!soloVpmContro) return true
        const v = vpmDi.get(r.id); return v?.accordo === false && v.punti >= VPM_NETTO })
      .sort((a, b) => b.probGiocata - a.probGiocata)
  }, [inFinestra, campionato, quotaMin, quotaMax, soloSopraSoglia, soglie, gradoMin, soloVpmContro, vpmDi])

  const conteggi = useMemo(() => {
    const c = { centro: 0, giallo: 0, blu: 0 }
    for (const r of inFinestra) { const k = categoria(r.probGiocata, soglie); if (k !== 'no') c[k]++ }
    return c
  }, [inFinestra, soglie])

  const ultimaData = inFinestra.reduce((m, r) => (r.data > m ? r.data : m), '')

  // I filtri accesi, per mostrarli e poterli togliere uno a uno.
  const attivi = [
    campionato && { id: 'camp', label: sigla(campionato), colore: C.blu, togli: () => setCampionato('') },
    quotaMin && { id: 'qmin', label: `quota ≥ ${quotaMin}`, togli: () => setQuotaMin('') },
    quotaMax && { id: 'qmax', label: `quota ≤ ${quotaMax}`, togli: () => setQuotaMax('') },
    gradoMin && { id: 'grado', label: `grado ≥ ${gradoMin}`, colore: C.menta, togli: () => setGradoMin('') },
    soloSopraSoglia && { id: 'soglia', label: 'sopra soglia', togli: () => setSoloSopraSoglia(false) },
    soloVpmContro && { id: 'vpm', label: 'campo contro mercato', colore: C.rosso, togli: () => setSoloVpmContro(false) },
  ].filter(Boolean)
  const azzera = () => { setCampionato(''); setQuotaMin(''); setQuotaMax(''); setGradoMin(''); setSoloSopraSoglia(false); setSoloVpmContro(false) }

  // La scheda di una partita prende tutta la pagina: sul telefono è l'unico
  // modo di leggerla, e la lista resta dov'era quando si torna indietro.
  const aperta = righe.find(r => r.id === apertaId)


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

      {/* ── I filtri ──────────────────────────────────────────────────────
          Una riga sola: il tasto, e le targhette di quelli accesi (si tolgono
          toccandole). Tutto il resto sta nel pannello, che si apre solo se
          serve — prima erano sei controlli in fila, illeggibili sul telefono. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => setPannello(v => !v)} style={pillola(pannello || attivi.length > 0)}>
          ⚙ filtri{attivi.length > 0 ? ` · ${attivi.length}` : ''}
        </button>
        {attivi.map(f => (
          <button key={f.id} onClick={f.togli} title="togli questo filtro" style={{ ...pillola(true, f.colore || C.oro), fontWeight: 500 }}>
            {f.label} <span style={{ color: C.fantasma }}>✕</span>
          </button>
        ))}
        {attivi.length > 1 && (
          <button onClick={azzera} style={{ ...pillola(false), color: C.spento }}>azzera tutto</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: F.mono, color: C.spento }}>
          {visibili.length}/{inFinestra.length}
        </span>
      </div>

      {pannello && (
        <Card style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <label>
              <Etichetta style={{ marginBottom: 5 }}>campionato</Etichetta>
              <select value={campionato} onChange={e => setCampionato(e.target.value)} style={{ ...campo, width: '100%', color: campionato ? C.testo : C.fioco }}>
                <option value="">tutti</option>
                {campionati.map(([d, nome]) => <option key={d} value={d}>{etichetta(d, nome)}</option>)}
              </select>
            </label>

            <div>
              <Etichetta style={{ marginBottom: 5 }}>quota</Etichetta>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...campo, width: '50%', borderColor: quotaMin && numero(quotaMin) === null ? C.rosso : C.bordo }}
                  placeholder="min" inputMode="decimal" value={quotaMin} onChange={e => setQuotaMin(e.target.value)} />
                <input style={{ ...campo, width: '50%', borderColor: quotaMax && numero(quotaMax) === null ? C.rosso : C.bordo }}
                  placeholder="max" inputMode="decimal" value={quotaMax} onChange={e => setQuotaMax(e.target.value)} />
              </div>
            </div>

            <div>
              <Etichetta style={{ marginBottom: 5 }}>grado minimo</Etichetta>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input style={{ ...campo, width: 64, borderColor: gradoMin && numero(gradoMin) === null ? C.rosso : C.bordo }}
                  placeholder="1-10" inputMode="decimal" value={gradoMin} onChange={e => setGradoMin(e.target.value)} />
                {[6, 7, 8].map(g => (
                  <button key={g} onClick={() => setGradoMin(String(g))} style={{ ...pillola(numero(gradoMin) === g), padding: '5px 9px' }}>{g}+</button>
                ))}
              </div>
            </div>

            <div>
              <Etichetta style={{ marginBottom: 5 }}>categorie</Etichetta>
              <button onClick={() => setSoloSopraSoglia(v => !v)} style={{ ...pillola(soloSopraSoglia), width: '100%' }}>
                {soloSopraSoglia ? 'solo sopra soglia' : 'anche sotto soglia'}
              </button>
            </div>

            <div>
              <Etichetta style={{ marginBottom: 5 }}>VPM</Etichetta>
              <button onClick={() => setSoloVpmContro(v => !v)} disabled={!datiVpm}
                style={{ ...pillola(soloVpmContro, C.rosso), width: '100%', opacity: datiVpm ? 1 : 0.4 }}>
                {soloVpmContro ? 'solo campo ≠ mercato' : 'tutte'}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bordoChiaro}` }}>
            <Etichetta style={{ marginBottom: 8 }}>soglie di probabilità — le aggiustate voi guardando le partite vere</Etichetta>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              {['centro', 'giallo', 'blu'].map(k => (
                <label key={k} style={{ fontSize: 11, fontFamily: F.mono, color: CATEGORIE[k].colore }}>
                  {CATEGORIE[k].nome} ≥ {pct(soglie[k])}
                  <input type="range" min="40" max="95" step="1" value={Math.round(soglie[k] * 100)}
                    onChange={e => setSoglie(s => ({ ...s, [k]: Number(e.target.value) / 100 }))}
                    style={{ width: '100%', accentColor: CATEGORIE[k].colore }} />
                </label>
              ))}
            </div>
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
            vpm={vpmDi.get(p.id) ?? null}
            voti={votiDi(p.id)} mio={mioVoto(p.id)} puoVotare={isAdmin} onVota={() => vota(p.id)}
            onApri={() => apri(p.id)} />
        ))}
      </div>

      {righe.length > 0 && (
        <div style={{ marginTop: 20, fontSize: 11, color: C.fantasma, fontFamily: F.sans, lineHeight: 1.7 }}>
          <b style={{ color: C.fioco }}>Come leggere.</b> L'attendibilità è la probabilità che la giocata vinca, secondo il consenso
          del mercato (media di ~40 book, tolto il margine). Sui favoriti il mercato è calibrato: un 75% vince tre volte su quattro.
          La X secca non viene mai proposta, e nemmeno la doppia chance. Sotto 1,25 si aggiunge l'over 1,5.
          {' '}<b style={{ color: C.fioco }}>VPM</b> è l'altra campana: guarda solo le squadre — classifica, forma, forma nel ruolo —
          e dice <b style={{ color: C.fioco }}>quale segno preferisce il campo e quanto</b>, da 5,5 (forze pari) a 10.
          {' '}<span style={{ color: C.verde }}>Verde se è lo stesso segno del mercato</span>,
          {' '}<span style={{ color: C.rosso }}>rosso se è l'altro</span>, grigio sotto 6 — squadre troppo simili perché voglia dire
          qualcosa. Non è una probabilità e non entra nella scelta delle spin: serve a vedere dove mercato e campo litigano.
          Il <b style={{ color: C.fioco }}>Grado</b> da 1 a 10 dice quanto conviene: 70% la resa (quota × probabilità), 30% quanto paga la quota.
          La quota è di <b style={{ color: C.fioco }}>Codere</b> quando c'è; altrimenti Bet365, altrimenti la massima sul mercato — sotto ogni quota c'è scritto quale.
          Gli orari sono quelli del Regno Unito.
        </div>
      )}

      {aperta && (
        <SchedaScorrevole onChiudi={() => setApertaId(null)}>
          <DettaglioPartita p={aperta} cat={categoria(aperta.probGiocata, soglie)}
            voti={votiDi(aperta.id)} mio={mioVoto(aperta.id)} puoVotare={isAdmin}
            onVota={() => vota(aperta.id)} onChiudi={() => setApertaId(null)} />
        </SchedaScorrevole>
      )}
    </div>
  )
}
