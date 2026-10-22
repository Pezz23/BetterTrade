import { useState, useMemo } from 'react'
import { C, F, alpha, S } from '../theme'
import { Card, Etichetta, TastoRipeti, Attesa } from '../components/ui'
import Icona from '../components/Icona'
import { useAuth } from '../context/AuthContext'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { usaSchedine } from '../hooks/usaSchedine'
import { usaPreferenze } from '../hooks/usaPreferenze'
import { valutaPartita } from '../lib/vpm'
import { componiPasso, CONSIGLIATO, QUOTA_MINIMA_GAMBA } from '../lib/scalata'
import { iniziaDopo } from '../lib/attendibilita'
import { sigla } from '../lib/campionati'
import { pct, eur, gg, quando } from '../lib/formato'

// 🎟️ BET BUILDER — la schedina a quota obiettivo.
//
// Mattia, 22/10/2026: *"voglio creare una schedina quota 5: lui deve
// calcolarmi in automatico le partite per arrivare ad almeno quella quota, in
// base ai filtri. E deve concedermi di creare più schedine, dove le nuove
// escludono le partite già inserite — per non giocare due volte la stessa."*
// E sul tono: ***"questa funzione deve essere più fanny che profittevole"***,
// quindi qui dentro non ci sono prediche sul valore atteso. Il numero onesto
// sta scritto una volta sola, in piccolo, e non torna a ogni schedina.
//
// ⚠️⚠️ **Non compone niente da sé**: la schedina la costruisce `componiPasso`
// di `lib/scalata.js`, **la stessa funzione dei passi della scalata**. Un
// passo e una schedina a quota obiettivo sono la stessa cosa — gambe prese
// dalle migliori finché il prodotto arriva alla quota — e scriverne due
// sarebbe il difetto di famiglia di questo progetto.
// ⚠️ **Si ferma appena SUPERA la quota**, non appena ha abbastanza gambe: ogni
// gamba moltiplica il margine del book, quindi la schedina giusta è la **più
// corta** che arriva dove vuoi.

/** I criteri con cui si scelgono le gambe. ⚠️ Si sceglie **schedina per
 *  schedina** (richiesta di Mattia): il criterio finisce nel registro, così
 *  fra due mesi si può confrontare quale sceglieva meglio. */
const CRITERI = [
  { id: 'voto',   label: 'voto',          val: (c) => c.voto },
  { id: 'att',    label: 'attendibilità', val: (c) => c.att },
  { id: 'scelta', label: 'scelta',        val: (c) => c.scelta },
  { id: 'vpm',    label: 'VPM',           val: (c) => c.vpm },
]

export default function BetBuilderPage() {
  const { currentUser } = useAuth()
  const { righe } = usaProssime()
  const datiVpm = usaVpm()
  const reg = usaSchedine(currentUser?.id)
  // ⚠️⚠️ **Le partite scartate stanno in `preferenze`, riga PERSONALE**: è la
  // tabella di stamattina, e scartare una partita non vale una tabella nuova.
  // ⚠️ `personale: true` perché il Bet Builder è privato: senza quel flag un
  // admin scriverebbe la riga **condivisa**, e le sue partite scartate le
  // vedrebbe il gruppo.
  const pref = usaPreferenze('betbuilder', { personale: true })
  const scartate = useMemo(() => new Set(pref.dati?.scartate ?? []), [pref.dati])
  const scarta = (id) => pref.salva({ ...(pref.dati ?? {}), scartate: [...scartate, id] })

  const [attMin, setAttMin] = useState(CONSIGLIATO.att)
  const [sceMin, setSceMin] = useState(0)
  const [vpmMin, setVpmMin] = useState(0)
  const [quotaGamba, setQuotaGamba] = useState(QUOTA_MINIMA_GAMBA)
  const [obiettivo, setObiettivo] = useState(5)
  const [criterio, setCriterio] = useState('voto')
  const [importo, setImporto] = useState('')
  const [avviso, setAvviso] = useState(null)
  const [daOra] = useState(() => Date.now())

  // ⚠️ VPM si calcola **una volta per partita**, non a ogni tocco di una
  // soglia: è la cura che il 18/10 ha tolto i secondi alla scalata.
  const valutate = useMemo(() => (righe || []).map(r => {
    const v = datiVpm ? valutaPartita(datiVpm, r) : null
    return { ...r, att: r.probGiocata, quota: r.quotaResa ?? r.quota,
      scelta: v?.scelta ?? null, vpm: v?.punti ?? null, voto: v?.voto ?? null }
  }), [righe, datiVpm])

  // ⚠️⚠️ **Le già usate escono dalle candidate**, non dalla schedina dopo:
  // è il senso della richiesta — *"non giocare due volte la stessa partita"*.
  // Valgono tutte le schedine vive, bozze comprese.
  const candidate = useMemo(() => valutate.filter(r =>
    !reg.usate.has(r.id)
    && !scartate.has(r.id)
    && !r.quoteIncoerenti
    && iniziaDopo(r, daOra)
    && r.att != null && r.att * 100 >= attMin
    && (sceMin <= 0 || (r.scelta != null && r.scelta * 100 >= sceMin))
    && (vpmMin <= 0 || (r.vpm != null && r.vpm >= vpmMin))
    && (r.quota ?? 0) >= quotaGamba),
    [valutate, reg.usate, scartate, attMin, sceMin, vpmMin, quotaGamba, daOra])

  const proposta = useMemo(() => componiPasso(candidate, {
    quotaMinima: obiettivo, maxGambe: 10, pavimento: quotaGamba,
    ordina: CRITERI.find(c => c.id === criterio).val,
  }), [candidate, obiettivo, criterio, quotaGamba])

  if (!righe) return <Attesa>carico le partite…</Attesa>

  const Tasto = ({ onClick, children, attivo, colore = C.oro, style }) => (
    <button onClick={onClick} style={{ padding: '5px 10px', fontSize: S.base, fontFamily: F.sans, cursor: 'pointer',
      color: attivo ? colore : C.spento, background: attivo ? `linear-gradient(${alpha(colore, .14)},${alpha(colore, .14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(colore, attivo ? .5 : .18)}`, ...style }}>{children}</button>
  )
  const Numero = ({ label, valore, passo, set, min = 0 }) => (
    <div style={{ display: 'contents' }}>
      <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.testo }}>{label}</div>
      <TastoRipeti onScatto={() => set(v => Math.max(min, Math.round((v - passo) * 100) / 100))}>−</TastoRipeti>
      <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro, minWidth: 50, textAlign: 'center' }}>{valore}</div>
      <TastoRipeti onScatto={() => set(v => Math.round((v + passo) * 100) / 100)}>+</TastoRipeti>
    </div>
  )

  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: '4px 0 10px' }}>BET BUILDER</h2>

      <ComeFunziona />

      {(avviso || reg.errore) && (
        <Card onClick={() => setAvviso(null)} style={{ marginBottom: 10, borderColor: alpha(C.ambra, .45), cursor: 'pointer' }}>
          <div style={{ color: C.ambra, fontSize: S.base, fontFamily: F.sans }}>{avviso || reg.errore}</div>
        </Card>
      )}

      {/* ── Il materiale ────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 10 }}>
        <Etichetta>DA QUALI PARTITE</Etichetta>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '4px 6px', alignItems: 'center', marginTop: 7 }}>
          <Numero label="attendibilità ≥" valore={`${attMin}%`} passo={1} set={setAttMin} />
          <Numero label="scelta ≥" valore={sceMin ? `${sceMin}%` : 'tutte'} passo={1} set={setSceMin} />
          <Numero label="VPM ≥" valore={vpmMin ? vpmMin.toFixed(1).replace('.', ',') : 'tutti'} passo={0.5} set={setVpmMin} />
          <Numero label="quota gamba ≥" valore={quotaGamba.toFixed(2).replace('.', ',')} passo={0.05} set={setQuotaGamba} min={1} />
        </div>
        <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento, marginTop: 7 }}>
          <b style={{ color: C.testo }}>{candidate.length}</b> partite disponibili
          {reg.usate.size > 0 && <> · <b style={{ color: C.testo }}>{reg.usate.size}</b> già in una schedina, escluse</>}
          {/* ⚠️ Quello che hai scartato si può **rimettere**: un gesto che
              toglie per sempre e non si disfa è una trappola per il tocco
              sbagliato. */}
          {scartate.size > 0 && <>
            {' · '}<b style={{ color: C.testo }}>{scartate.size}</b> scartate{' '}
            <button onClick={() => pref.salva({ ...(pref.dati ?? {}), scartate: [] })}
              style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                color: C.verde, fontFamily: F.sans, fontSize: S.minuta, textDecoration: 'underline' }}>
              rimettile
            </button>
          </>}
        </div>
      </Card>

      {/* ── La schedina da costruire ────────────────────────────────────── */}
      <Card style={{ marginBottom: 10, borderColor: alpha(C.oro, 0.45),
        background: `linear-gradient(${alpha(C.oro, 0.045)},${alpha(C.oro, 0.045)}), ${C.card}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '4px 6px', alignItems: 'center' }}>
          <Numero label="quota da raggiungere" valore={obiettivo.toFixed(2).replace('.', ',')} passo={0.5} set={setObiettivo} min={1.1} />
        </div>
        {/* ⚠️ Il criterio si sceglie **per schedina** e finisce nel registro:
            è l'unico modo per sapere, fra due mesi, quale sceglieva meglio. */}
        <div style={{ display: 'flex', gap: 5, marginTop: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <Etichetta>LE MIGLIORI PER</Etichetta>
          {CRITERI.map(c => (
            <Tasto key={c.id} attivo={criterio === c.id} onClick={() => setCriterio(c.id)} colore={C.celestePieno}>{c.label}</Tasto>
          ))}
        </div>

        {/* ⚠️ **La proposta si vede PRIMA di salvarla**: un tasto che scrive
            nel registro qualcosa che non hai visto è il modo di riempirlo di
            schedine buttate. */}
        {proposta.gambe ? (
          <div style={{ marginTop: 10 }}>
            {/* ⚠️⚠️ **La × scarta la partita, non toglie la gamba** (Mattia,
                22/10: *"non devono tornare nella selezione"*): esce dalle
                candidate, quindi la schedina **si ricompone da sé** pescando
                la prossima migliore e resta alla quota che hai chiesto. Due
                richieste risolte con un gesto solo. */}
            {proposta.gambe.map(g => <Gamba key={g.id} g={g} onScarta={() => scarta(g.id)} />)}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginTop: 8, paddingTop: 8, borderTop: `1px solid ${alpha(C.testo, 0.1)}` }}>
              <span style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>
                {proposta.gambe.length} gambe
              </span>
              <span style={{ fontFamily: F.mono, fontSize: S.titolo, fontWeight: 700, color: C.oro }}>
                quota {proposta.quota.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {/* ⚠️ **L'importo si scrive qui e la vincita si vede subito**
                (richiesta di Mattia): è il numero che fa decidere se quella
                quota vale la pena, e chiederlo dopo aver salvato vorrebbe dire
                deciderlo senza. È **facoltativo**: vuoto vuol dire *non lo
                dico*, non zero. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Etichetta>IMPORTO</Etichetta>
              <input value={importo} onChange={e => setImporto(e.target.value.replace(',', '.'))}
                placeholder="€" inputMode="decimal"
                style={{ width: 70, background: C.pozzo, color: C.testo, border: `1px solid ${C.bordo}`,
                  borderRadius: 6, padding: '4px 6px', fontFamily: F.mono, fontSize: S.media, textAlign: 'center' }} />
              {Number(importo) > 0 && (
                <span style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento }}>
                  vinci <b style={{ color: C.verde, fontFamily: F.mono, fontSize: S.media }}>
                    {eur(Number(importo) * proposta.quota)}</b>
                </span>
              )}
            </div>
            <button disabled={reg.occupato}
              onClick={async () => {
                const r = await reg.crea({ quotaObiettivo: obiettivo, criterio, gambe: proposta.gambe, importo,
                  filtri: { att: attMin, scelta: sceMin, vpm: vpmMin, quotaGamba } })
                setAvviso(r.errore ?? null)
                if (!r.errore) setImporto('')
              }}
              style={{ width: '100%', marginTop: 10, padding: '9px 0', cursor: 'pointer',
                background: `linear-gradient(${alpha(C.verde, .12)},${alpha(C.verde, .12)}), ${C.card}`,
                border: `1px solid ${alpha(C.verde, 0.5)}`, color: C.verde, fontFamily: F.sans, fontSize: S.base }}>
              {reg.occupato ? 'salvo…' : '＋ TIENI QUESTA SCHEDINA'}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.6 }}>
            {proposta.motivo}
          </div>
        )}
      </Card>

      {/* ── Le schedine tenute ──────────────────────────────────────────── */}
      {/* ⚠️ **L'andamento in una riga sola** — è lo scopo per cui si tracciano
          (*"così da tracciare l'andamento nel tempo"*). ⚠️ Conta solo le
          **giocate**: una bozza non è andata al banco, e includerla gonfierebbe
          il conto. ⚠️ E il saldo compare solo se gli importi ci sono: un totale
          costruito su campi vuoti sarebbe un numero falso.
          ⚠️ **Il riepilogo con le domande vere arriverà più avanti**: con
          cinque schedine qualunque percentuale è rumore, ed è la stessa regola
          per cui il riassunto della scalata aspetta dieci o venti scalate. */}
      {!!reg.schedine?.some(s => s.stato === 'giocata') && (() => {
        const g = reg.schedine.filter(s => s.stato === 'giocata')
        const vinte = g.filter(s => s.esito === 'vinta')
        const conImporto = g.filter(s => Number(s.importo) > 0 && s.esito)
        const speso = conImporto.reduce((a, s) => a + Number(s.importo), 0)
        const incassato = conImporto.filter(s => s.esito === 'vinta')
          .reduce((a, s) => a + Number(s.importo) * s.gambe.reduce((q, x) => q * Number(x.quota), 1), 0)
        const saldo = incassato - speso
        return (
          <Card style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Etichetta>COME STANNO ANDANDO</Etichetta>
              <span style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento }}>
                <b style={{ color: C.testo }}>{g.length}</b> giocate ·{' '}
                <b style={{ color: C.verde }}>{vinte.length}</b> vinte
                {speso > 0 && <> · saldo <b style={{ fontFamily: F.mono, color: saldo >= 0 ? C.verde : C.rosso }}>
                  {saldo >= 0 ? '+' : ''}{eur(saldo)}</b></>}
              </span>
            </div>
          </Card>
        )
      })()}

      {reg.schedine === null ? <Attesa style={{ padding: 0 }} /> : reg.schedine.length === 0 ? (
        <Card><div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.6 }}>
          Nessuna schedina. Scegli la quota, guarda cosa propone e tienila: da lì in poi
          quelle partite non torneranno nelle schedine dopo.
        </div></Card>
      ) : reg.schedine.map((s, i) => {
        const quota = s.gambe.reduce((a, g) => a * Number(g.quota), 1)
        const giocata = s.stato === 'giocata'
        return (
          <Card key={s.id} style={{ marginBottom: 8, borderColor: alpha(giocata ? C.verde : C.bordo, giocata ? 0.45 : 1) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <Etichetta colore={giocata ? C.verde : C.oro}>
                <Icona nome="schedina" misura={12} /> SCHEDINA {reg.schedine.length - i} · per {s.criterio}
              </Etichetta>
              <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro }}>
                quota {quota.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {/* ⚠️ Le quote **si toccano**: la nostra è Bet365 o la media di
                mercato, tu giochi su un altro book o con un bonus. E qui c'è
                l'importo, quindi una quota sbagliata è una **vincita**
                sbagliata. */}
            <div style={{ marginTop: 6 }}>
              {s.gambe.map(g => <Gamba key={g.id} g={g}
                onQuota={(v) => reg.cambiaQuota(g.id, v).then(r => setAvviso(r.errore ?? null))} />)}
            </div>
            {/* l'importo resta modificabile: si scrive quando si gioca, non
                quando si compone */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <Etichetta>IMPORTO</Etichetta>
              <input defaultValue={s.importo ?? ''} placeholder="€" inputMode="decimal"
                onBlur={e => { if (String(e.target.value) !== String(s.importo ?? '')) reg.scriviImporto(s.id, e.target.value) }}
                style={{ width: 66, background: C.pozzo, color: C.testo, border: `1px solid ${C.bordo}`,
                  borderRadius: 6, padding: '3px 6px', fontFamily: F.mono, fontSize: S.base, textAlign: 'center' }} />
              {Number(s.importo) > 0 && (
                <span style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento }}>
                  {s.esito === 'vinta' ? 'hai vinto' : s.esito === 'persa' ? 'avresti vinto' : 'vinci'}{' '}
                  <b style={{ color: s.esito === 'persa' ? C.fioco : C.verde, fontFamily: F.mono, fontSize: S.base }}>
                    {eur(Number(s.importo) * quota)}</b>
                </span>
              )}
            </div>
            <div style={{ fontSize: S.micro, fontFamily: F.sans, color: C.fioco, marginTop: 6 }}>
              {/* ⚠️ **Con quali filtri è stata costruita** (richiesta di
                  Mattia): `criterio` dice *come* si ordinavano le candidate,
                  questi dicono *da quali partite* si pescava. Due schedine
                  «per voto» con filtri diversi sono due esperimenti diversi. */}
              {s.filtri && <>att ≥ {s.filtri.att}%
                {s.filtri.scelta > 0 && <> · scelta ≥ {s.filtri.scelta}%</>}
                {s.filtri.vpm > 0 && <> · VPM ≥ {Number(s.filtri.vpm).toFixed(1).replace('.', ',')}</>}
                {' · '}gamba ≥ {Number(s.filtri.quotaGamba).toFixed(2).replace('.', ',')}<br /></>}
              obiettivo {Number(s.quota_obiettivo).toFixed(2).replace('.', ',')} · creata {quando(s.creata_il)}
              {giocata && s.giocata_il && <> · <span style={{ color: C.verde }}>giocata {quando(s.giocata_il)}</span></>}
              {s.esito && s.chiusa_il && <> · chiusa {quando(s.chiusa_il)}</>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={() => reg.segnaGiocata(s.id, !giocata)} style={{
                flex: 1, padding: '6px 0', cursor: 'pointer', fontFamily: F.sans, fontSize: S.base,
                color: giocata ? C.verde : C.spento,
                background: giocata ? `linear-gradient(${alpha(C.verde, .14)},${alpha(C.verde, .14)}), ${C.card}` : C.card,
                border: `1px solid ${alpha(C.verde, giocata ? 0.5 : 0.18)}`,
              }}>{giocata ? '✓ giocata' : 'segna giocata'}</button>
              <Cancella onCancella={() => reg.cancella(s.id)} />
            </div>
            {/* ⚠️⚠️ **L'esito compare solo DOPO «giocata»** (richiesta di
                Mattia: *"una volta giocata vorrei un secondo menù"*), e non è
                un vezzo: una schedina che non è andata al banco non ha un
                esito da registrare — è la stessa distinzione della spunta
                GIOCATA nella Slot, dove compilare non è giocare.
                ⚠️ E si **annulla** ritoccando il tasto acceso: un esito
                sbagliato e non togliibile è un registro che mente. */}
            {giocata && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {[['vinta', C.verde], ['persa', C.rosso]].map(([e, col]) => (
                  <button key={e} onClick={() => reg.segnaEsito(s.id, s.esito === e ? null : e)} style={{
                    flex: 1, padding: '6px 0', cursor: 'pointer', fontFamily: F.sans, fontSize: S.base,
                    color: s.esito === e ? col : C.spento,
                    background: s.esito === e ? `linear-gradient(${alpha(col, .14)},${alpha(col, .14)}), ${C.card}` : C.card,
                    border: `1px solid ${alpha(col, s.esito === e ? 0.5 : 0.18)}`,
                  }}>{e === 'vinta' ? '✓ vinta' : '✗ persa'}</button>
                ))}
              </div>
            )}
          </Card>
        )
      })}

      {/* ⚠️ La frase onesta, **una volta sola e in fondo**: la resa di una
          combinata è il prodotto delle rese, e una schedina da quota 5 vuole
          quattro o cinque gambe. Mattia lo sa — *"più fanny che
          profittevole"* — e ripeterlo a ogni schedina sarebbe una predica. */}
      <div style={{ fontSize: S.micro, fontFamily: F.sans, color: C.fioco, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
        una gamba nei favoriti corti rende ~98%, e in una combinata le rese si moltiplicano:
        più gambe, più margine al banco. Qui si gioca per divertirsi.
      </div>
    </div>
  )
}

/**
 * Le istruzioni, in parole semplici e **chiuse di default**.
 *
 * ⚠️ Stessa forma della legenda della pagina Partite (`LegendaPartite`): una
 * riga che si apre, senza scatola quando è chiusa. Chi la pagina la conosce
 * non deve scorrerla ogni volta, e chi entra la prima volta trova **dove**
 * chiedere. ⚠️ Non è un `title` col mouse sopra: **su telefono non esiste**,
 * ed è la regola già scritta in questo progetto.
 * ⚠️ Niente numeri e niente avvertenze sul valore atteso qui dentro: è una
 * spiegazione di **cosa fanno i tasti**, non una lezione — *"più fanny che
 * profittevole"*. La frase onesta sta in fondo alla pagina, una volta sola.
 */
function ComeFunziona() {
  const [aperta, setAperta] = useState(false)
  const passi = [
    ['1', 'Scegli da quali partite pescare', <>Le quattro manopole in alto tengono solo le partite che passano quei valori. Più stringi, meno ne restano — il numero delle <b>partite disponibili</b> te lo dice subito.</>],
    ['2', 'Dì che quota vuoi raggiungere', <>Scrivi la quota (per esempio <b>5,00</b>) e scegli con che criterio ordinare le migliori: <b>voto</b>, attendibilità, scelta o VPM. Lui prende le prime finché il prodotto arriva a quella quota, usando <b>meno gambe possibile</b>.</>],
    ['3', 'Guarda la proposta prima di tenerla', <>Se una partita non ti convince, la <b>×</b> la scarta: esce dall&apos;elenco e lui ne pesca un&apos;altra al suo posto. Se cambi idea, <b>rimettile</b> con un tocco.</>],
    ['4', 'Tienila, e diventa tua', <>Con <b>TIENI QUESTA SCHEDINA</b> finisce nel tuo registro e resta lì anche se chiudi l&apos;app. Le sue partite <b>non torneranno</b> nelle schedine successive, così non giochi due volte la stessa.</>],
    ['5', 'Poi segna com&apos;è andata', <>Quando la porti al banco premi <b>segna giocata</b>; a risultati arrivati, <b>vinta</b> o <b>persa</b>. L&apos;<b>importo</b> è facoltativo: se lo scrivi, vedi subito quanto vinci e in cima compare come stai andando.</>],
  ]
  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setAperta(v => !v)} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: aperta ? `linear-gradient(${alpha(C.oro, 0.06)},${alpha(C.oro, 0.06)}), ${C.card}` : C.card,
        border: `1px solid ${aperta ? alpha(C.oro, 0.3) : 'transparent'}`, borderRadius: 10,
        padding: '10px 13px', color: C.spento, fontFamily: F.sans, fontSize: S.corpo, letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: C.oro }}>{aperta ? '⌃' : '⌄'}</span>
        <span>COME FUNZIONA</span>
      </button>
      {aperta && (
        <div style={{ border: `1px solid ${alpha(C.oro, 0.3)}`, borderTop: 'none', padding: '4px 12px 12px' }}>
          {passi.map(([n, titolo, testo]) => (
            <div key={n} style={{ display: 'flex', gap: 10, padding: '8px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}` }}>
              <span style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro, flexShrink: 0 }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontSize: S.corpo, fontWeight: 700, color: C.testo }}>{titolo}</div>
                <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.spento, lineHeight: 1.55, marginTop: 2 }}>{testo}</div>
              </div>
            </div>
          ))}
          {/* ⚠️ Due cose che le persone chiedono per prime, e che non si
              vedono guardando lo schermo: dove finiscono i dati e chi li
              vede. */}
          <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.fioco, lineHeight: 1.6,
            marginTop: 8, paddingTop: 8, borderTop: `1px solid ${alpha(C.testo, 0.06)}` }}>
            Le tue schedine sono <b>solo tue</b>: nessun altro le vede, nemmeno chi è admin.
            Una volta tenuta, una schedina <b>non cambia più</b> da sola — nemmeno quando
            arrivano le partite nuove. L&apos;unica cosa che puoi correggere è la <b>quota</b>
            {' '}di una gamba, se sul tuo book è diversa dalla nostra.
          </div>
        </div>
      )}
    </div>
  )
}

/** Una gamba, uguale nella proposta e nel registro: **se fossero due pezzi,
 *  prima o poi mostrerebbero due cose diverse.** */
function Gamba({ g, onScarta = null, onQuota = null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `minmax(0,1fr) 30px 46px${onScarta ? ' 18px' : ''}`,
      gap: 6, alignItems: 'center', padding: '5px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.spento, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          <b style={{ color: C.blu }}>{sigla(g.div)}</b> · {gg(g.data)} {String(g.ora || '').slice(0, 5)}
          {g.att != null && <> · att <b style={{ color: C.testo }}>{pct(g.att)}</b></>}
        </div>
        <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.testo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {g.casa} — {g.trasferta}
        </div>
      </div>
      <div style={{ fontFamily: F.mono, fontSize: S.corpo, fontWeight: 700, color: C.testo, textAlign: 'center' }}>{g.giocata}</div>
      {/* ⚠️ Si scrive **uscendo dal campo**, non a ogni tasto: altrimenti
          "1,85" passerebbe per "1", "1," e "1,8" — e "1" non è una quota
          valida, quindi il database la respingerebbe tre volte mentre scrivi. */}
      {onQuota ? (
        <input defaultValue={Number(g.quota).toFixed(2)} inputMode="decimal"
          onBlur={e => { if (Number(e.target.value) !== Number(g.quota)) onQuota(e.target.value) }}
          style={{ width: '100%', background: C.pozzo, color: C.oro, border: `1px solid ${alpha(C.oro, 0.3)}`,
            borderRadius: 5, padding: '2px 4px', fontFamily: F.mono, fontSize: S.corpo, textAlign: 'right' }} />
      ) : (
        <div style={{ fontFamily: F.mono, fontSize: S.corpo, color: C.oro, textAlign: 'right' }}>
          {Number(g.quota).toFixed(2).replace('.', ',')}
        </div>
      )}
      {onScarta && (
        <button onClick={onScarta} title="scartala: non tornerà fra le candidate"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
            color: C.fioco, fontSize: S.media }}>×</button>
      )}
    </div>
  )
}

/** ⚠️ **La conferma è il tasto stesso**, come il «riparti da 0» della scalata:
 *  un `confirm()` del browser si accetta senza leggerlo. Si disarma da solo
 *  dopo tre secondi — un tasto rosso che resta armato è una trappola per il
 *  tocco successivo. */
function Cancella({ onCancella }) {
  const [armato, setArmato] = useState(false)
  return (
    <button
      onClick={() => { if (armato) { setArmato(false); onCancella() } else { setArmato(true); setTimeout(() => setArmato(false), 3000) } }}
      style={{ padding: '6px 12px', cursor: 'pointer', fontFamily: F.sans, fontSize: S.base,
        color: armato ? C.rosso : C.fioco,
        background: armato ? `linear-gradient(${alpha(C.rosso, .14)},${alpha(C.rosso, .14)}), ${C.card}` : C.card,
        border: `1px solid ${alpha(C.rosso, armato ? 0.5 : 0.18)}` }}>
      {armato ? 'sicuro?' : '×'}
    </button>
  )
}
