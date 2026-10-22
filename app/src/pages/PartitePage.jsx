import { useState, useMemo, useCallback } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { useAuth } from '../context/AuthContext'
import { C, F, alpha, S, R } from '../theme'
import { Card, Etichetta, TastoRipeti, stileCard } from '../components/ui'
import RigaPartita, { CATEGORIE, giorno } from '../components/RigaPartita'
import SchedaScorrevole from '../components/SchedaScorrevole'
import DettaglioPartita from '../components/DettaglioPartita'
import { categoria, FINESTRE, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { etichetta, sigla } from '../lib/campionati'
import BarraCampionati, { LARGHEZZA_BARRA } from '../components/BarraCampionati'
import { valutaPartita, VPM_NETTO } from '../lib/vpm'
import { ORDINI, ORDINE_DEFAULT, confronto } from '../lib/ordine'
import LegendaPartite from '../components/LegendaPartite'
// ⚠️⚠️ **Le soglie e il confronto arrivano da Andamento, non riscritti qui.**
// Sono gli stessi quattro numeri misurati su 33.141 partite (VPM 7,0 · att 60%
// · scelta 62% · voto 100%) e la stessa funzione `sopra()`, che confronta sul
// **numero arrotondato come si vede**: scritto a mano qui, un valore mostrato
// `60%` ma che dentro è 0,5996 sarebbe escluso dal filtro mentre nella pagina
// Andamento risulta sopra soglia — due schermate che dicono il contrario
// sulla stessa partita.
import { METODI, SOGLIE_BASE, sopra } from '../hooks/usaAndamento'

// La lista delle partite future, ordinata per attendibilità.
// I calcoli stanno in lib/attendibilita.js, la riga in components/RigaPartita.jsx:
// qui solo caricamento, filtri e composizione.

/**
 * ⚠️⚠️ **Le pastiglie erano il pezzo più "terminale" della pagina**: dieci
 * fra filtri e ordinamenti, tutte in **monospaziato** e tutte dentro un bordo
 * da 1px — quattro righe di scatole con dentro testo da console. Due cure, e
 * sono quelle della prova del 21/10/2026:
 *   · **Sora**, perché sono parole («attendibilità», «filtri»), non cifre.
 *     La regola del lotto 2 non era mai arrivata fin qui.
 *   · **niente bordo da spente**: una pastiglia spenta è una superficie
 *     leggermente più chiara del fondo, non una linea. Il bordo resta
 *     **solo su quella accesa**, dove distingue lo stato.
 * ⚠️ E il testo spento passa da `fioco` (3,80:1) a `spento` (6,97:1): sono
 * comandi da leggere, non decorazioni.
 */
const pillola = (on, colore = C.oro) => ({
  padding: '7px 13px', borderRadius: R.pastiglia, cursor: 'pointer', fontFamily: F.sans, fontSize: S.corpo, fontWeight: 600,
  background: on ? alpha(colore, 0.15) : C.card,
  border: `1px solid ${on ? alpha(colore, 0.5) : 'transparent'}`,
  color: on ? colore : C.spento,
})
// Un decimale con la virgola: lo usano le targhette di VPM e voto, che sulla
// loro scala contano i decimi (`7,5`) e non le unità.
const n1 = (v) => Number(v).toFixed(1).replace('.', ',')
/**
 * Le quattro manopole dei filtri: un minimo per indicatore.
 *
 * ⚠️ **In un elenco e non quattro blocchi copiati**: sono la stessa domanda su
 * quattro numeri, e scritte a mano sarebbero quattro posti dove cambiare un
 * passo o un colore. ⚠️ I colori sono quelli con cui lo stesso indicatore è
 * scritto nella riga e nei tasti dell'ordine: un numero che cambia tinta fra
 * due schermate si impara due volte.
 * ⚠️ `voto` arriva a **10** e non a 100: dal 22/10/2026 è una pagella, non una
 * percentuale.
 */
const MANOPOLE = [
  { id: 'att',    label: 'attendibilità ≥', passo: 1,   max: 100, colore: C.menta,   mostra: v => `${v}%` },
  { id: 'vpm',    label: 'VPM ≥',           passo: 0.5, max: 30,  colore: C.celeste, mostra: v => n1(v) },
  { id: 'scelta', label: 'scelta ≥',        passo: 1,   max: 100, colore: C.verde,   mostra: v => `${v}%` },
  { id: 'voto',   label: 'voto ≥',          passo: 0.5, max: 10,  colore: C.verde,   mostra: v => n1(v) },
]

const campo = { padding: '6px 10px', borderRadius: R.pastiglia, background: C.pozzo, border: `1px solid ${C.bordo}`, color: C.testo, fontFamily: F.mono, fontSize: S.base, outline: 'none', width: 74 }

export default function PartitePage() {
  const { isAdmin } = useAuth()
  const { righe, vota, votiDi, mioVoto, caricamento, errore } = usaProssime()
  const datiVpm = usaVpm()
  // ⚠️ Non è più uno stato: dal 22/10/2026 le slitte non ci sono, e nessuno
  // può muoverlo. Resta perché decide il **colore** delle card e il conteggio
  // in cima — la categoria si legge ancora su ogni riga.
  const soglie = SOGLIE_DEFAULT
  const [finestra, setFinestra] = useState('settimana')
  const [campionato, setCampionato] = useState('')
  const [quotaMin, setQuotaMin] = useState('')
  const [quotaMax, setQuotaMax] = useState('')
  // ⚠️⚠️ **Quattro minimi, uno per indicatore** (Mattia, 22/10/2026): stessa
  // forma e stesso gesto, perché sono la stessa domanda fatta su quattro
  // numeri. `0` vuol dire spento in tutti e quattro.
  // ⚠️ Il confronto si fa sul numero **arrotondato come si vede**: col valore
  // pieno una riga che mostra `62%` resterebbe fuori da una soglia di 62
  // perché sotto c'è 0,6249. È la trappola già pagata in Andamento, nelle
  // caselle dei gol e qui accanto con «scelta».
  const [attMin, setAttMin] = useState(0)
  const [vpmMin, setVpmMin] = useState(0)
  const [votoMin, setVotoMin] = useState(0)
  // ⚠️⚠️ **«scelta» ha preso il posto di «voto minimo»** (Mattia, 22/10/2026),
  // ed è un numero e non un campo di testo: si muove col `+`/`−` come le
  // soglie di Andamento e della scalata. `0` vuol dire spento.
  // ⚠️ **Taglia più di quanto sembri, ed è voluto**: `scelta` è **nulla**
  // quando il campo contraddice il mercato, quindi qualunque soglia — anche
  // 1% — butta fuori *tutti* i disaccordi. Sono le partite dove il segno del
  // campo vince il 27,2% contro il 29,5% dato dal book, e giocarle rende
  // 86,8%: toglierle è il senso del filtro, non un effetto collaterale.
  const [sceltaMin, setSceltaMin] = useState(0)
  const [soloVpmContro, setSoloVpmContro] = useState(false)
  const [daccordo, setDaccordo] = useState(false)
  const [ordine, setOrdine] = useState(ORDINE_DEFAULT)
  const [crescente, setCrescente] = useState(false)   // secondo tocco: si inverte
  const [pannello, setPannello] = useState(false)   // i filtri, chiusi di default
  const [apertaId, setApertaId] = useState(null)    // la partita aperta a tutto schermo

  // Lo scorrimento non si salva più: da quando la scheda è un foglio sopra la
  // lista (SchedaScorrevole), la lista non viene smontata e il punto resta suo.
  // ⚠️ Le righe sono `memo`, quindi quello che si passa deve restare lo stesso
  // fra un ridisegno e l'altro: `setApertaId` di `useState` è stabile per
  // costruzione, un `id => setApertaId(id)` scritto qui **no** — ed è il modo
  // di annullare il `memo` senza accorgersene.

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
  const manopole = {
    att: { valore: attMin, set: setAttMin },
    vpm: { valore: vpmMin, set: setVpmMin },
    scelta: { valore: sceltaMin, set: setSceltaMin },
    voto: { valore: votoMin, set: setVotoMin },
  }

  // VPM di ogni partita, una volta sola: il calcolo sta in lib/vpm.js, qui
  // solo la mappa id → valutazione, che serve alla riga e al filtro.
  // ⚠️ Deve stare PRIMA di `visibili`, che lo legge nel filtro: `const` ha la
  // zona morta, e usarlo più sopra è schermata nera al primo render.
  const vpmDi = useMemo(() => {
    const m = new Map()
    if (datiVpm) for (const r of righe) m.set(r.id, valutaPartita(datiVpm, r))
    return m
  }, [datiVpm, righe])

  /**
   * Tutti e quattro gli indicatori sopra la loro soglia.
   *
   * ⚠️ **Misurato su 33.141 partite, otto stagioni**: con zero indicatori
   * sopra soglia la giocata arriva il 45,7% delle volte, con quattro il
   * **74,1%** (su 1.118 partite). ⚠️ Ma il guadagno sulla sola attendibilità
   * **non è dimostrabile**: 74,1% ±2,6 contro 71,6% ±1,1 su 5,6 volte più
   * partite. È un controllo, non un metodo di selezione — e quasi tutto il
   * merito è dell'attendibilità: le altre tre senza di lei fanno 44,7%.
   */
  const tuttiDaccordo = useCallback(r => {
    const v = vpmDi.get(r.id)
    const riga = { att: r.probGiocata, vpm: v?.punti, scelta: v?.scelta, voto: v?.voto }
    return METODI.every(m => sopra(riga, m.id, SOGLIE_BASE))
  }, [vpmDi])

  // ⚠️⚠️ **Il filtro del campionato è uscito dalla catena**, e non è un
  // riordino estetico: la barra a destra scrive accanto a ogni lega quante
  // partite lascerebbe, e quel numero deve tenere conto di **tutti gli altri
  // filtri accesi** ma non di sé stesso — altrimenti, scelta una lega, tutte
  // le altre direbbero zero e la barra non servirebbe più a cambiare lega.
  const filtrate = useMemo(() => {
    const qMin = numero(quotaMin), qMax = numero(quotaMax)
    return inFinestra
      .filter(r => qMin === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) >= qMin)
      .filter(r => qMax === null ? true : quotaMostrata(r) !== null && quotaMostrata(r) <= qMax)
      .filter(r => attMin <= 0 || (r.probGiocata != null && Math.round(r.probGiocata * 100) >= attMin))
      .filter(r => { if (vpmMin <= 0) return true
        const p = vpmDi.get(r.id)?.punti; return p != null && Math.round(p * 100) / 100 >= vpmMin })
      // ⚠️ Il voto è una **pagella da 0 a 10** dal 22/10/2026, non più una
      // percentuale: un `votoMin` c'era già e si confrontava con `1,00`.
      // Stesso nome, scala diversa — ed è il motivo per cui non è tornato
      // com'era.
      .filter(r => { if (votoMin <= 0) return true
        const v = vpmDi.get(r.id)?.voto; return v != null && Math.round(v * 10) / 10 >= votoMin })
      // il voto è una percentuale: si scrive 100 e si confronta con 1,00
      // ⚠️ Il confronto si fa sul numero **arrotondato come si vede**: con il
      // valore pieno una riga che mostra `62%` resterebbe fuori da una soglia
      // di 62 perché sotto c'è 0,6249. Stessa trappola delle soglie di
      // Andamento e delle caselle dei gol.
      .filter(r => { if (sceltaMin <= 0) return true
        const sc = vpmDi.get(r.id)?.scelta; return sc != null && Math.round(sc * 100) >= sceltaMin })
      // Le partite dove il campo dice il contrario del mercato, ed è **netto**:
      // è la lista che Mattia andava a cercare a mano in quattro schermate.
      // Un campo indeciso (sotto VPM_NETTO) non è un disaccordo.
      .filter(r => { if (!soloVpmContro) return true
        const v = vpmDi.get(r.id); return v?.accordo === false && v.punti >= VPM_NETTO })
      .filter(r => daccordo ? tuttiDaccordo(r) : true)
      // L'ordine si applica **dopo** i filtri, nello stesso passaggio: così
      // funziona sempre su quello che è rimasto, senza un secondo elenco da
      // tenere allineato. Il confronto sta in lib/ordine.js.
      .sort(confronto(ordine, vpmDi, crescente))
  }, [inFinestra, quotaMin, quotaMax, attMin, vpmMin, votoMin, sceltaMin, soloVpmContro, daccordo, tuttiDaccordo, vpmDi, ordine, crescente])

  const visibili = useMemo(
    () => campionato ? filtrate.filter(r => r.div === campionato) : filtrate,
    [filtrate, campionato])

  // ⚠️ Una `Map` e non un oggetto: le sigle sono chiavi che arrivano dai dati,
  // e un oggetto porta dietro le sue proprietà ereditate.
  const perCampionato = useMemo(() => {
    const m = new Map()
    for (const r of filtrate) m.set(r.div, (m.get(r.div) ?? 0) + 1)
    return m
  }, [filtrate])

  const conteggi = useMemo(() => {
    const c = { centro: 0, giallo: 0, blu: 0 }
    for (const r of inFinestra) { const k = categoria(r.probGiocata, soglie); if (k !== 'no') c[k]++ }
    return c
  }, [inFinestra, soglie])

  // ⚠️ Il numero sta **sul tasto**, come sulle finestre temporali: un filtro
  // che non dice quante partite lascerebbe costringe a premerlo per saperlo.
  const nDaccordo = useMemo(() => inFinestra.filter(tuttiDaccordo).length, [inFinestra, tuttiDaccordo])

  const ultimaData = inFinestra.reduce((m, r) => (r.data > m ? r.data : m), '')

  // I filtri accesi, per mostrarli e poterli togliere uno a uno.
  // ⚠️ «tutti d'accordo» **non sta qui**, pur essendo un filtro: le targhette
  // servono a far vedere quello che è acceso **dentro il pannello chiuso**, e
  // quel tasto è già in vista e già acceso. Metterlo avrebbe mostrato la stessa
  // cosa due volte a tre centimetri di distanza. Resta però in `azzera`.
  const attivi = [
    campionato && { id: 'camp', label: sigla(campionato), colore: C.blu, togli: () => setCampionato('') },
    quotaMin && { id: 'qmin', label: `quota ≥ ${quotaMin}`, togli: () => setQuotaMin('') },
    quotaMax && { id: 'qmax', label: `quota ≤ ${quotaMax}`, togli: () => setQuotaMax('') },
    attMin > 0 && { id: 'att', label: `att ≥ ${attMin}%`, colore: C.menta, togli: () => setAttMin(0) },
    vpmMin > 0 && { id: 'vpm', label: `VPM ≥ ${n1(vpmMin)}`, colore: C.celeste, togli: () => setVpmMin(0) },
    sceltaMin > 0 && { id: 'scelta', label: `scelta ≥ ${sceltaMin}%`, colore: C.verde, togli: () => setSceltaMin(0) },
    votoMin > 0 && { id: 'voto', label: `voto ≥ ${n1(votoMin)}`, colore: C.verde, togli: () => setVotoMin(0) },
    soloVpmContro && { id: 'vpm', label: 'campo contro mercato', colore: C.rosso, togli: () => setSoloVpmContro(false) },
  ].filter(Boolean)
  const azzera = () => { setCampionato(''); setQuotaMin(''); setQuotaMax(''); setAttMin(0); setVpmMin(0)
    setSceltaMin(0); setVotoMin(0); setSoloVpmContro(false); setDaccordo(false) }

  // La scheda di una partita prende tutta la pagina: sul telefono è l'unico
  // modo di leggerla, e la lista resta dov'era quando si torna indietro.
  const aperta = righe.find(r => r.id === apertaId)


  return (
    // ⚠️⚠️ **Lo spazio per la barra si riserva, non si lascia coprire.** Una
    // striscia `fixed` sopra la lista nasconderebbe la colonna di destra delle
    // card — ed è il difetto che questo progetto ha già fotografato due volte.
    // ⚠️ Riservato a **ogni larghezza**: su uno schermo largo la barra cade nel
    // margine vuoto fuori dalla colonna e quei 40px sono solo aria, ma un conto
    // che cambia col `vw` sarebbe una seconda definizione di dov'è il bordo.
    <div style={{ padding: '16px', paddingRight: 16 + LARGHEZZA_BARRA }}>
      <BarraCampionati campionati={campionati} conteggi={perCampionato}
        attivo={campionato} totale={filtrate.length} onScegli={setCampionato} />

      <LegendaPartite />

      <Etichetta colore={C.oro} style={{ letterSpacing: 2, marginBottom: 4, fontFamily: F.sans }}>PARTITE</Etichetta>
      <div style={{ fontSize: S.evidenza, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Prossime partite</div>
      <div style={{ fontSize: S.corpo, color: C.spento, fontFamily: F.sans, marginBottom: 20, lineHeight: 1.6 }}>
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

      {/* ── La finestra temporale, a card ─────────────────────────────── */}
      {/* ⚠️⚠️ **Quattro card 2×2 invece di quattro pastiglie** (Mattia,
          22/10/2026). Il guadagno non è la misura: è che **il numero di
          partite diventa leggibile**. In pastiglia stava appiccicato
          all'etichetta in corpo 10, e serve a decidere *se vale la pena
          allargare* — che è l'unica domanda che fa quel comando.
          ⚠️ Due per riga: con quattro in fila su 375px le etichette lunghe
          («Anche la prossima») venivano tagliate.
          ⚠️ **«Niente in più» si scrive nella card**, non più nel `title`: il
          `title` col mouse sopra **su telefono non esiste**, ed era l'unico
          posto dove quell'informazione viveva. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {FINESTRE.map((f, i) => {
          const n = perFinestra[f.id], prec = i > 0 ? perFinestra[FINESTRE[i - 1].id] : null
          const nienteInPiu = prec !== null && n === prec
          const on = finestra === f.id
          return (
            <button key={f.id} onClick={() => setFinestra(f.id)}
              style={stileCard({ padding: '8px 10px', textAlign: 'left', cursor: 'pointer',
                background: on ? `linear-gradient(${alpha(C.oro, .12)},${alpha(C.oro, .12)}), ${C.card}` : C.card,
                border: `1px solid ${alpha(C.oro, on ? 0.5 : 0.14)}` })}>
              <div style={{ fontFamily: F.sans, fontSize: S.base, color: on ? C.oro : C.testo }}>{f.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
                <span style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: on ? C.oro : C.testo }}>{n}</span>
                <span style={{ fontFamily: F.sans, fontSize: S.micro, color: C.spento }}>
                  partite · {giorno(f.fine()).slice(0, 9)}
                </span>
              </div>
              {nienteInPiu && (
                <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.fioco, marginTop: 1 }}>
                  niente in più
                </div>
              )}
            </button>
          )
        })}
      </div>
      {/* Solo per le finestre più larghe di "fino a lunedì": su "Oggi" il
          confronto non vuol dire niente, è una finestra più stretta. */}
      {finestra === 'due' && perFinestra[finestra] === perFinestra.settimana && !caricamento && (
        <div style={{ fontSize: S.base, color: C.fioco, fontFamily: F.sans, marginBottom: 8 }}>
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
        {/* ⚠️ Accanto ai filtri e **fuori** dal pannello, come i tasti
            dell'ordine: è una lente che si accende e si spegne di continuo,
            non un filtro che si imposta una volta. */}
        <button onClick={() => setDaccordo(v => !v)} style={pillola(daccordo, C.verde)}
          title="Solo le partite dove VPM, attendibilità, scelta e voto stanno tutti e quattro sopra la loro soglia. Misurato su otto stagioni: lì la giocata è arrivata il 74,1% delle volte contro il 45,7% di quando nessuno è sopra soglia.">
          tutti d&apos;accordo<span style={{ color: C.spento, fontWeight: 400 }}> {nDaccordo}</span>
        </button>
        {attivi.map(f => (
          <button key={f.id} onClick={f.togli} title="togli questo filtro" style={{ ...pillola(true, f.colore || C.oro), fontWeight: 600 }}>
            {f.label} <span style={{ color: C.spento }}>✕</span>
          </button>
        ))}
        {attivi.length > 1 && (
          <button onClick={azzera} style={{ ...pillola(false), color: C.spento }}>azzera tutto</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: S.base, fontFamily: F.mono, color: C.spento }}>
          {visibili.length}/{inFinestra.length}
        </span>
      </div>

      {pannello && (
        <Card style={{ marginBottom: 12, padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            {/* ⚠️ **Qui c'era la tendina del campionato, tolta il 22/10/2026**:
                la barra a destra fa la stessa cosa con un tocco invece di
                quattro, e due comandi per lo stesso filtro si allontanano —
                uno dei due finisce per non essere più quello vero. Lo stato
                `campionato` resta, lo scrive la barra, e la targhetta con la
                ✕ continua a toglierlo da qui. */}

            <div>
              <Etichetta style={{ marginBottom: 5 }}>quota</Etichetta>
              <div style={{ display: 'flex', gap: 6 }}>
                <input style={{ ...campo, width: '50%', borderColor: quotaMin && numero(quotaMin) === null ? C.rosso : C.bordo }}
                  placeholder="min" inputMode="decimal" value={quotaMin} onChange={e => setQuotaMin(e.target.value)} />
                <input style={{ ...campo, width: '50%', borderColor: quotaMax && numero(quotaMax) === null ? C.rosso : C.bordo }}
                  placeholder="max" inputMode="decimal" value={quotaMax} onChange={e => setQuotaMax(e.target.value)} />
              </div>
            </div>

            {/* ⚠️⚠️ **I quattro indicatori, stessa forma e stesso gesto.**
                Prima c'era solo «scelta minima», e il voto era stato tolto il
                22/10 perché diceva `resa × fattore(VPM)`; adesso è una
                pagella 0-10 e torna, con la sua scala.
                ⚠️ `TastoRipeti` si tiene premuto e accelera: è lo stesso pezzo
                di Andamento e del bankroll della scalata, e serve — da 0 a 62
                sarebbero sessantadue tocchi.
                ⚠️⚠️ **Qui dentro ci stanno `−`, il valore e `+`, e basta.**
                Il 22/10 due scorciatoie (61% · 62%) uscivano dalla cella di
                85px e finivano disegnate sopra la colonna accanto: su 375px
                ogni cella ha ~150px e quei tre comandi ne occupano già 146.
                `flexWrap` e `minWidth: 0` restano come rete — se la riga
                ricresce **va a capo invece di uscire**. */}
            {MANOPOLE.map(m => {
              const v = manopole[m.id].valore
              return (
                <div key={m.id}>
                  <Etichetta style={{ marginBottom: 5 }}>{m.label}</Etichetta>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                    <TastoRipeti onScatto={() => manopole[m.id].set(x => Math.max(0, Math.round((x - m.passo) * 10) / 10))}>−</TastoRipeti>
                    <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700,
                      color: v > 0 ? m.colore : C.spento, minWidth: 48, textAlign: 'center' }}>
                      {v > 0 ? m.mostra(v) : 'tutte'}
                    </div>
                    <TastoRipeti onScatto={() => manopole[m.id].set(x => Math.min(m.max, Math.round((x + m.passo) * 10) / 10))}>+</TastoRipeti>
                  </div>
                </div>
              )
            })}

            <div>
              {/* ⚠️ Si chiamava «VPM», e adesso accanto c'è una manopola
                  «VPM ≥»: due celle con la stessa etichetta e due comandi
                  diversi sotto. Questo non è una soglia — è *quali* partite,
                  non *quanto*. */}
              <Etichetta style={{ marginBottom: 5 }}>campo contro mercato</Etichetta>
              <button onClick={() => setSoloVpmContro(v => !v)} disabled={!datiVpm}
                style={{ ...pillola(soloVpmContro, C.rosso), width: '100%', opacity: datiVpm ? 1 : 0.4 }}>
                {soloVpmContro ? 'solo campo ≠ mercato' : 'tutte'}
              </button>
            </div>
          </div>

          {/* ⚠️⚠️ **Le tre slitte delle soglie di probabilità sono state tolte
              il 22/10/2026** (Mattia: *"le spin stanno passando in secondo
              piano"*): erano il comando con cui si tarava la spin, e qui
              dentro non c'è più una spin da tarare.
              ⚠️ **I numeri restano**: `SOGLIE_DEFAULT` continua a decidere il
              colore delle card (CENTRO · GIALLA · BLU) e il conteggio in cima.
              Quello che se ne va è la possibilità di muoverli da questa
              pagina, non le categorie — che sono ancora la prima cosa che si
              legge su una riga. */}
        </Card>
      )}

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: S.media, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}
      {!caricamento && !errore && righe.length === 0 && (
        <Card><div style={{ fontSize: S.media, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
          Nessuna partita futura in archivio. Arrivano con l'aggiornamento:
          <code style={{ display: 'block', marginTop: 8, color: C.oro, fontFamily: F.mono, fontSize: S.base }}>cd btscout && node --env-file=.env scripts/aggiorna.js --esegui</code>
        </div></Card>
      )}
      {!caricamento && righe.length > 0 && visibili.length === 0 && (
        <Card><div style={{ fontSize: S.media, color: C.spento, fontFamily: F.sans }}>Nessuna partita con questi filtri.</div></Card>
      )}

      {/* ── L'ordine ──────────────────────────────────────────────────────
          Sempre visibile, **non** dentro il pannello dei filtri: un filtro si
          mette una volta, l'ordine si cambia continuamente per guardare la
          stessa lista da tre lati. Sta attaccato alla lista, non in cima alla
          pagina, perché è di lei che parla. */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: S.base, color: C.spento, fontFamily: F.sans }}>ordina</span>
        {ORDINI.map(o => (
          /* Un tasto per ogni colonna della barra. ⚠️ Il secondo tocco sullo
             stesso inverte il verso: sulla quota serve davvero, perché a volte
             la vuoi bassa. */
          <button key={o.id} onClick={() => { if (ordine === o.id) setCrescente(v => !v); else { setOrdine(o.id); setCrescente(false) } }}
            style={{ ...pillola(ordine === o.id, o.colore), padding: '6px 10px' }}>
            {ordine === o.id ? (crescente ? '↑ ' : '↓ ') : ''}{o.label}
          </button>
        ))}
      </div>

      {/* ⚠️ 12 e non 8: senza bordo attorno, due righe a 8px di distanza si
          leggono come un blocco unico. Lo stacco fra due card lo fa lo spazio,
          non più la linea. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visibili.map(p => (
          <RigaPartita key={p.id} p={p} cat={categoria(p.probGiocata, soglie)}
            vpm={vpmDi.get(p.id) ?? null}
            voti={votiDi(p.id)} mio={mioVoto(p.id)} puoVotare={isAdmin} onVota={vota}
            onApri={setApertaId} />
        ))}
      </div>

      {righe.length > 0 && (
        <div style={{ marginTop: 20, fontSize: S.base, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
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
