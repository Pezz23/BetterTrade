import { useState, useEffect, useMemo } from 'react'
import { C, F, alpha, S, SP } from '../theme'
import { Card, Etichetta, TastoRipeti, Attesa } from '../components/ui'
import { gg } from '../lib/formato'
import {
  METODI, SOGLIE_BASE, FASCE_QUOTA, FASCIA_BASE, QUOTA_MIN, QUOTA_MAX, PASSO_QUOTA,
  conSoglie, scrivi, sopra, quota,
  usaRiassunto, usaChiavi, usaStagioni, partiteDi, partiteVerdi,
} from '../hooks/usaAndamento'

// ANDAMENTO — quanto sono attendibili i nostri indicatori, sulle partite vere.
//
// ⚠️ **Non calcola niente**: i conteggi arrivano già fatti dalle funzioni di
// `sql/23`, e il dettaglio di un giorno si scarica solo quando si apre la
// tendina. Ricostruire VPM e i gol attesi di ogni giornata passata dal browser
// non è fattibile, e scaricare le 101.237 righe per contarle nemmeno —
// PostgREST ne dà 1000 e non lo dice.
//
// ⚠️ **Lo scopo non è l'archivio, è la soglia.** Mattia (12/10/2026): *"in
// questo storico vedo tutto, ma non mi interessa: devo studiare
// l'attendibilità dei nostri indicatori. Attendibilità 37% non la voglio
// neanche vedere, è rumore"*. Le soglie sono **accese** e tolgono le partite
// anche dal riassunto.

const AMBITI = [
  { id: 'giorno',  label: 'Per giorno',  quante: 15 },
  { id: 'weekend', label: 'Per weekend', quante: 36 },
]

function Tasto({ attivo, onClick, children, colore = C.oro, style }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', fontSize: S.base, fontFamily: F.sans, letterSpacing: '0.04em',
      cursor: 'pointer', whiteSpace: 'nowrap',
      // ⚠️ `color` esplicito: un <button> non eredita il colore del testo.
      color: attivo ? colore : C.spento,
      background: attivo ? `linear-gradient(${alpha(colore, 0.14)},${alpha(colore, 0.14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(colore, attivo ? 0.5 : 0.18)}`, ...style,
    }}>{children}</button>
  )
}


/** L'elenco delle partite, coi quattro valori su ogni riga. */
function Elenco({ righe, metodo, soglie, titolo, evidenzia = true }) {
  const ok = righe.filter(r => r.azzeccata).length
  // ⚠️ Le larghezze seguono **quanto scrive ogni indicatore**, non una misura
  // uguale per tutti: VPM è "7,3" (3 caratteri) e il voto "100,25%" (7). Con
  // le colonne vecchie — pensate per l'ordine ATT VPM VOTO RESA — il voto
  // finito in ultima posizione aveva 34px per 7 cifre e sbordava.
  const griglia = '1fr 26px 32px 32px 52px 14px'
  return (
    <div style={{ padding: '2px 0 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <Etichetta>{titolo}</Etichetta>
        <div style={{ fontFamily: F.mono, fontSize: S.corpo, color: !righe.length ? C.spento : ok / righe.length >= 0.5 ? C.verde : C.rosso }}>
          {ok}/{righe.length}{righe.length > 0 && ` · ${(ok / righe.length * 100).toFixed(0)}%`}
        </div>
      </div>
      {!righe.length && <div style={{ fontSize: S.base, color: C.spento, fontFamily: F.sans, padding: '6px 0' }}>nessuna partita sopra soglia qui.</div>}
      {!!righe.length && (
        <div style={{ display: 'grid', gridTemplateColumns: griglia, gap: 4, padding: '0 0 3px' }}>
          <div />
          {METODI.map(M => (
            <div key={M.id} style={{ fontSize: S.nano, fontFamily: F.mono, letterSpacing: '0.06em', textAlign: 'right',
              color: evidenzia && M.id === metodo ? C.celestePieno : C.spento }}>{M.breve}</div>
          ))}
          <div />
        </div>
      )}
      {righe.map((r, i) => (
        <div key={`${r.weekend}-${r.data}-${r.casa}-${i}`} style={{
          display: 'grid', gridTemplateColumns: griglia, gap: 4, alignItems: 'center',
          padding: '5px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: S.corpo, color: C.testo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.casa} — {r.trasferta}
            </div>
            <div style={{ fontSize: S.micro, fontFamily: F.mono, color: C.spento }}>
              {gg(r.data || r.weekend)} · {r.div} · {r.giocata} ·{' '}
              {/* ⚠️ **La quota in bianco pieno, e nient'altro** (scelta di
                  Mattia, 15/10/2026): stessa misura e stesso peso del resto
                  della riga, cambia solo la tinta. È l'unico numero che si
                  cerca con l'occhio — giorno, campionato e segno si leggono di
                  passaggio — e dentro una riga spenta il contrasto da solo
                  basta a renderlo trovabile. Ingrandirlo era di troppo. */}
              <span style={{ color: C.bianco }}>
                {Number(r.quota).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
          {/* ⚠️ Tutti e quattro i valori, non solo quello che ha scelto la
              partita: verde se sta sopra la sua soglia. È la risposta a
              "quali indicatori mi avrebbero allertato". */}
          {METODI.map(M => (
            <div key={M.id} style={{
              // ⚠️ 11 e non 10 (richiesta di Mattia): sono i numeri che si
              // confrontano fra loro. **Le tinte non cambiano** — verde sopra
              // soglia, spento sotto: dicono un'altra cosa.
              fontFamily: F.mono, fontSize: S.base, textAlign: 'right',
              color: sopra(r, M.id, soglie) ? C.verde : C.spento,
              fontWeight: evidenzia && M.id === metodo ? 700 : 400,
            }}>{scrivi(M.id, r[M.id])}</div>
          ))}
          <div style={{ fontFamily: F.mono, fontSize: S.media, color: r.azzeccata ? C.verde : C.rosso, textAlign: 'center' }}>
            {r.azzeccata ? '✓' : '✗'}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Una card che si apre e si chiude.
 *
 * ⚠️⚠️ **Chiusa deve dire comunque il suo stato** (`riassunto`), e non è un
 * vezzo: le soglie e la fascia di quota **decidono tutti i numeri della
 * pagina**. Una card chiusa che non dice "da 1,00 a 1,45" lascia davanti agli
 * occhi quattro percentuali senza il filtro che le ha prodotte — cioè numeri
 * che sembrano assoluti e non lo sono. Un comando si può nascondere; il suo
 * valore no.
 *
 * ⚠️ Il riassunto sta **sotto** il titolo e non accanto: le quattro soglie
 * scritte di fila sono 44 caratteri, e accanto a un titolo su un telefono
 * finirebbero fuori o verrebbero tagliate.
 */
function CardPiega({ titolo, colore = C.oro, riassunto, aperta, onTocca, children, style }) {
  return (
    <Card style={{ marginBottom: 10, ...style }}>
      <div onClick={onTocca} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Etichetta colore={colore}>{titolo}</Etichetta>
          <span style={{ fontFamily: F.mono, fontSize: S.base, color: C.spento }}>{aperta ? '▾' : '▸'}</span>
        </div>
        {riassunto != null && (
          <div style={{ fontFamily: F.sans, fontSize: S.base, color: C.testo, marginTop: 5, lineHeight: 1.45 }}>
            {riassunto}
          </div>
        )}
      </div>
      {aperta && <div style={{ marginTop: 10 }}>{children}</div>}
    </Card>
  )
}

/**
 * I tre stati di una lettura, tenuti distinti: **sto caricando** (`null`),
 * **è andata male** (una stringa) e **ecco le partite** (un elenco).
 * ⚠️ Prima erano due, e un errore si mostrava come un caricamento infinito:
 * chi guarda non ha modo di capire se deve aspettare o chiamare qualcuno.
 */
function Risultato({ righe, ...resto }) {
  if (righe === null)
    return <Attesa style={{ padding: `${SP.m}px 0` }} />
  if (typeof righe === 'string')
    return <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.rosso, padding: '8px 0' }}>non riesco a leggere le partite: {righe}</div>
  return <Elenco righe={righe} {...resto} />
}

/** Una tendina: il tasto col risultato, e sotto le partite quando è aperta. */
function Tendina({ etichetta, conteggio, aperta, onTocca, ambito, metodo, chiave, soglie, fascia, titolo }) {
  const [righe, setRighe] = useState(null)
  useEffect(() => {
    if (!aperta) return
    let vivo = true
    partiteDi(ambito, metodo, chiave, fascia)
      .then(r => { if (vivo) setRighe(r) })
      .catch(e => { if (vivo) setRighe(String(e.message || e)) })
    return () => { vivo = false }
  }, [aperta, ambito, metodo, chiave, fascia])
  const c = quota(conteggio)
  return (
    <div>
      <Tasto attivo={aperta} onClick={onTocca} colore={C.viola}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{aperta ? '▾' : '▸'} {etichetta}</span>
        {/* il risultato sul tasto: senza, per sapere com'è andato un giorno
            bisognerebbe aprirlo, e con le tendine significa aprirli tutti */}
        <span style={{ fontSize: S.minuta, color: c.perc == null ? C.spento : c.perc >= 0.5 ? C.verde : C.rosso }}>
          {c.giocate ? `${c.ok}/${c.giocate}` : '—'}
        </span>
      </Tasto>
      {aperta && (
        <Card style={{ marginTop: 3 }}>
          <Risultato righe={righe} metodo={metodo} soglie={soglie} titolo={titolo} />
        </Card>
      )}
    </div>
  )
}

export default function AndamentoPage() {
  const [ambito, setAmbito] = useState('giorno')
  const [metodo, setMetodo] = useState('att')
  const [stagione, setStagione] = useState(null)        // null = non ancora scelta, '' = tutte
  const [aperta, setAperta] = useState(null)
  // ⚠️ `conSoglie` riempie le chiavi che mancano: lo stato di React sopravvive
  // al ricaricamento a caldo, quindi dopo un cambio dei metodi qui dentro
  // possono restare quelle vecchie — e una soglia mancante diventava NaN al
  // primo tocco di `+`.
  const [soglieGrezze, setSoglie] = useState(SOGLIE_BASE)
  // ⚠️⚠️ **`useMemo` qui non è un'ottimizzazione, è la correzione di un
  // difetto.** `conSoglie` costruisce un oggetto nuovo, quindi senza memoria
  // `soglie` cambiava **identità a ogni ridisegno**: l'effetto che scarica le
  // partite delle quattro spunte verdi ce l'ha fra le dipendenze, e girava
  // all'infinito — scarica, arriva la risposta, il ridisegno fa un oggetto
  // nuovo, l'effetto riparte e riazzera a `null`. A schermo: "carico…" per
  // sempre, e una richiesta al database per ogni giro. Trovato da Mattia il
  // 15/10/2026, introdotto da me il giorno prima insieme a `conSoglie`.
  // ⚠️ Gli altri due hook non ne soffrivano perché confrontano la **chiave
  // scritta** (`JSON.stringify`), non l'identità dell'oggetto — ed è il motivo
  // per cui il difetto si vedeva in un punto solo.
  const soglie = useMemo(() => conSoglie(soglieGrezze), [soglieGrezze])
  // ⚠️ La fascia **sono due numeri**, e le scorciatoie ci scrivono dentro:
  // tenere anche un "quale fascia è selezionata" sarebbe un secondo stato
  // sulla stessa cosa, e i due divergono al primo tocco su un numero.
  const [fascia, setFascia] = useState(FASCIA_BASE)
  // ⚠️ Le tre card partono **chiuse**: sono comandi e un approfondimento, e
  // quello che si guarda ogni volta sono le quattro percentuali. Il loro stato
  // resta visibile nel riassunto della card chiusa.
  const [apri, setApri] = useState({})
  const piega = (id) => setApri(a => ({ ...a, [id]: !a[id] }))
  const verdi = !!apri.accordo
  const [righeVerdi, setRigheVerdi] = useState(null)

  const stagioni = usaStagioni()
  // ⚠️ Si parte dalla stagione più recente, non da "tutte": con tutte, i giorni
  // sono 1636 e l'elenco dei tasti verrebbe tagliato a 400. Il riassunto e
  // l'accordo invece sono conteggi, quindi su "tutte" restano completi.
  useEffect(() => {
    if (stagione === null && stagioni?.length) setStagione(stagioni[0].stagione)
  }, [stagioni, stagione])
  const { riassunto, accordo, base, errore } = usaRiassunto(soglie, stagione, fascia, ambito)
  const chiavi = usaChiavi(ambito, metodo, soglie, stagione, fascia)

  useEffect(() => {
    if (!verdi) return
    let vivo = true
    setRigheVerdi(null)
    partiteVerdi(soglie, stagione, fascia)
      .then(r => { if (vivo) setRigheVerdi(r) })
      // ⚠️ Senza questo, una lettura fallita resta "carico…" per sempre: un
      // caricamento che non finisce e un errore si leggono allo stesso modo,
      // e sono due cose da fare diverse (aspettare, o chiamare qualcuno).
      .catch(e => { if (vivo) setRigheVerdi(String(e.message || e)) })
    return () => { vivo = false }
  }, [verdi, soglie, stagione, fascia])

  // ⚠️ Il minimo non supera il massimo e viceversa: si fermano a un passo di
  // distanza invece di scavalcarsi, perché un intervallo vuoto a schermo si
  // legge come un guasto e non come una scelta.
  const muoviQuota = (quale, verso) => { setAperta(null); setFascia(f => {
    const v = Math.round((f[quale] + verso * PASSO_QUOTA) * 100) / 100
    if (quale === 'min') return { ...f, min: Math.min(Math.max(QUOTA_MIN, v), f.max - PASSO_QUOTA) }
    return { ...f, max: Math.max(Math.min(QUOTA_MAX, v), f.min + PASSO_QUOTA) }
  }) }

  const muovi = (id, verso) => setSoglie(g => {
    const s = conSoglie(g)
    const M = METODI.find(m => m.id === id)
    // ⚠️ Si arrotonda al passo, non a due cifre fisse: con passo 0,0025 un
    // arrotondamento a 0,01 riporterebbe il valore indietro a ogni scatto.
    const quanti = Math.round((s[id] + verso * M.passo) / M.passo)
    return { ...s, [id]: Math.max(0, Math.round(quanti * M.passo * 1e6) / 1e6) }
  })

  const rig = (metodoId, ambitoId) => quota(riassunto?.find(r => r.metodo === metodoId && r.ambito === ambitoId))
  const tutteLeVerdi = quota(accordo?.find(a => Number(a.quanti) === METODI.length))
  const sotto = (() => {
    if (!accordo) return { giocate: 0, ok: 0, perc: null }
    const tot = accordo.reduce((a, x) => ({ giocate: a.giocate + Number(x.giocate), ok: a.ok + Number(x.azzeccate) }), { giocate: 0, ok: 0 })
    const g = tot.giocate - tutteLeVerdi.giocate, o = tot.ok - tutteLeVerdi.ok
    return { giocate: g, ok: o, perc: g ? o / g : null }
  })()

  if (errore) return <div style={{ padding: 16 }}><Card><div style={{ color: C.rosso, fontSize: S.media }}>Non riesco a leggere l&apos;andamento: {errore}</div></Card></div>

  // le tendine, raggruppate per weekend quando l'ambito è il giorno
  const gruppi = (() => {
    if (!chiavi) return null
    if (ambito === 'weekend') return [[null, chiavi]]
    const m = new Map()
    for (const k of chiavi) { if (!m.has(k.weekend)) m.set(k.weekend, []); m.get(k.weekend).push(k) }
    return [...m.entries()]
  })()

  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px' }}>
        <h2 style={{ fontSize: S.titolo, fontFamily: F.sans, letterSpacing: '0.1em', color: C.testo, margin: 0 }}>ANDAMENTO</h2>
        <select value={stagione ?? ''} onChange={e => { setStagione(e.target.value); setAperta(null) }}
          style={{ background: C.card, color: C.testo, border: `1px solid ${alpha(C.oro, 0.3)}`,
            fontFamily: F.mono, fontSize: S.corpo, padding: '4px 6px' }}>
          <option value="">tutte le stagioni</option>
          {(stagioni || []).map(s => (
            <option key={s.stagione} value={s.stagione}>{s.stagione.slice(0, 2)}/{s.stagione.slice(2)}</option>
          ))}
        </select>
      </div>

      {/* ── Le soglie ─────────────────────────────────────────────────────── */}
      <CardPiega titolo="SOGLIE MINIME" aperta={apri.soglie} onTocca={() => piega('soglie')}
        riassunto={METODI.map(M => `${M.breve} ${scrivi(M.id, soglie[M.id])}`).join(' · ')}>
        {/* ⚠️ Qui ci sono **solo i comandi**: il risultato di ogni soglia sta
            nella sua card, subito sotto. Prima era scritto anche qui, e lo
            stesso numero in due posti è il difetto che prima o poi li fa
            divergere — lo stesso motivo per cui il Grado è stato togliere
            dalla barra. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '3px 6px', alignItems: 'center', marginTop: 6 }}>
          {METODI.map(M => (
            <div key={M.id} style={{ display: 'contents' }}>
              <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.testo }}>{M.label}</div>
              <TastoRipeti onScatto={() => muovi(M.id, -1)}>−</TastoRipeti>
              <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro, minWidth: 62, textAlign: 'center' }}>
                {scrivi(M.id, soglie[M.id])}
              </div>
              <TastoRipeti onScatto={() => muovi(M.id, +1)}>+</TastoRipeti>
            </div>
          ))}
        </div>
      </CardPiega>

      {/* ── Le quattro card: un indicatore per card ──────────────────────── */}
      {/* ⚠️ **Sono anche il selettore**, e non per risparmiare spazio: la
          domanda della pagina è *"quante volte ha ragione questo indicatore
          sopra la sua soglia"*, quindi il numero e il tasto che apre le sue
          partite sono la stessa cosa. Prima erano due file separate — una di
          percentuali e una di tasti — e bisognava tenere a mente quale riga
          corrispondeva a quale tasto.
          ⚠️ **Via la card "quanti indicatori sopra soglia"** (15/10/2026):
          Mattia *"non capisco a cosa serva, e non posso cliccare le altre"*.
          Mostrava cinque percentuali di cui una sola apribile — l'unico tocco
          possibile era quello che sembrava meno cliccabile. La domanda che
          rispondeva (*"esiste un punto in comune fra i quattro?"*) resta, in
          una riga sola qui sotto. */}
      {/* ── La fascia di quota ───────────────────────────────────────────── */}
      {/* ⚠️⚠️ **È il filtro più importante della pagina, e il motivo va
          tenuto vivo: l'attendibilità alta È la quota bassa.** Sono lo stesso
          fatto detto in due modi, quindi senza fissare il prezzo "questo
          indicatore azzecca più spesso" può voler dire soltanto "questo
          indicatore sceglie favoriti più corti". Dentro una fascia il
          confronto è alla pari. Chiesto da Mattia il 15/10/2026: *"voglio
          capire con quel filtro e quella quota quale indicatore è più
          preciso"*. */}
      <CardPiega titolo="FASCIA DI QUOTA" aperta={apri.quota} onTocca={() => piega('quota')}
        riassunto={<>da {fascia.min.toFixed(2).replace('.', ',')} a {fascia.max.toFixed(2).replace('.', ',')}
          {base && Number(base.giocate)
            ? <span style={{ color: C.spento }}> · base {(base.azzeccate / base.giocate * 100).toFixed(1)}% su {base.giocate} partite</span>
            : <span style={{ color: C.spento }}> · nessuna partita</span>}</>}>
        {/* i due limiti, scelti a mano: il filtro vero */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto auto 1fr auto', gap: 5, alignItems: 'center', marginTop: 7 }}>
          {[['min', 'DA'], ['max', 'A']].map(([q, et]) => (
            <div key={q} style={{ display: 'contents' }}>
              {/* ⚠️ Le stesse misure di SOGLIE MINIME (12 l'etichetta, 13 il
                  valore): sono due comandi della stessa natura a due
                  centimetri di distanza, e due scale diverse li fanno sembrare
                  due cose diverse. */}
              <div style={{ fontSize: S.corpo, fontFamily: F.sans, color: C.testo }}>{et}</div>
              <TastoRipeti onScatto={() => muoviQuota(q, -1)}>−</TastoRipeti>
              <div style={{ fontFamily: F.mono, fontSize: S.media, fontWeight: 700, color: C.oro, textAlign: 'center' }}>
                {fascia[q].toFixed(2).replace('.', ',')}
              </div>
              <TastoRipeti onScatto={() => muoviQuota(q, +1)}>+</TastoRipeti>
            </div>
          ))}
        </div>
        {/* ⚠️ Le fasce già misurate restano come **scorciatoie**, non come uno
            stato a parte: scrivono nei due numeri qui sopra. Sono accese quando
            i numeri combaciano, così si vede quando ti sei spostato da una
            fascia nota. */}
        {/* ⚠️ **Tutte e quattro su una riga anche su un telefono** (richiesta
            di Mattia): `flex: 1` con `minWidth: 0` e il testo che non va a
            capo. Senza `minWidth: 0` un elemento flessibile non scende sotto
            il suo contenuto — la stessa trappola della griglia della Slot — e
            la quarta scorciatoia finirebbe sotto. A 375px restano ~76px per
            tasto, quindi il testo sta a 10px e il riempimento è stretto.
            ⚠️ E `letterSpacing: normal`: l'interlettera di `Tasto` vale 0,4px
            per carattere, cioè ~4px su "1,90-2,20" — abbastanza da far uscire
            la quarta su uno schermo da 320px. */}
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {FASCE_QUOTA.map(f => (
            <Tasto key={f.id} colore={C.oro}
              attivo={fascia.min === f.min && fascia.max === f.max}
              onClick={() => { setFascia({ min: f.min, max: f.max }); setAperta(null) }}
              style={{ flex: 1, minWidth: 0, padding: '6px 1px', fontSize: S.minuta,
                textAlign: 'center', letterSpacing: 'normal', overflow: 'hidden' }}>
              {f.label}
            </Tasto>
          ))}
        </div>
        {/* ⚠️ **La base della fascia, e non è un ornamento**: senza, un
            indicatore al 74,7% sembra bravo, mentre fra le quote corte il
            74,7% lo fa anche prendendo le partite a caso.
            ⚠️ **La frase definisce la parola `base`**, che poi torna sotto ogni
            card come "+6,8 punti sulla base". Prima diceva *"tutte le partite
            fanno 55,2% su 317"* — "fanno" cosa, e 317 di che? Mattia:
            *"incomprensibile"*. Un numero di confronto ha bisogno di **tre
            cose**: come è stato ottenuto (prendendo tutte le partite, senza
            guardare nessun indicatore), cosa misura (quante volte la giocata è
            arrivata) e a cosa serve (è il livello da battere). */}
        <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, marginTop: 8, lineHeight: 1.5 }}>
          {base && Number(base.giocate)
            ? <>
                <b style={{ color: C.testo }}>base {(base.azzeccate / base.giocate * 100).toFixed(1)}%</b>
                {' '}— prendendo <b style={{ color: C.testo }}>tutte</b> le {base.giocate} partite di questa
                fascia, senza guardare nessun indicatore, la giocata è arrivata così.
                È il livello che un indicatore deve battere per servire a qualcosa.
              </>
            : 'nessuna partita in questa fascia di quota'}
        </div>
      </CardPiega>

      {/* ⚠️ `flexWrap` per **1,8 pixel**: i due tasti misurano 159,8 l'uno e
          con lo spazio fanno 325,6, cioè escono da uno schermo da 320. Il
          testo è `nowrap` di proposito — "prime 36" tagliato non direbbe
          niente — quindi a schermo stretto il secondo va a capo invece di
          spingere fuori la pagina. A 375 restano in riga. Misurato con
          `guarda.mjs --larghezze=320`, che ora conta i pixel che escono. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {AMBITI.map(a => (
          <Tasto key={a.id} attivo={ambito === a.id} onClick={() => { setAmbito(a.id); setAperta(null) }}>
            {a.label} · prime {a.quante}
          </Tasto>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 6, marginBottom: 10 }}>
        {METODI.map(M => {
          const c = rig(M.id, ambito)
          const scelto = metodo === M.id
          // ⚠️ Il colore dice **com'è andata**, il bordo **quale sto
          // guardando**: due informazioni diverse, e con una tinta sola si
          // leggerebbe "l'indicatore scelto è quello buono".
          const tinta = c.perc == null ? C.spento : c.perc >= 0.6 ? C.verde : c.perc >= 0.5 ? C.testo : C.rosso
          const basePerc = base && Number(base.giocate) ? Number(base.azzeccate) / Number(base.giocate) : null
          const scarto = c.perc == null || basePerc == null ? null : c.perc - basePerc
          return (
            <button key={M.id} onClick={() => { setMetodo(M.id); setAperta(null) }} style={{
              textAlign: 'left', cursor: 'pointer', padding: '9px 10px', color: C.testo,
              background: scelto ? `linear-gradient(${alpha(C.celestePieno, 0.08)},${alpha(C.celestePieno, 0.08)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(scelto ? C.celestePieno : C.testo, scelto ? 0.5 : 0.1)}`,
            }}>
              <div style={{ fontSize: S.minuta, fontFamily: F.sans, letterSpacing: '0.08em',
                color: scelto ? C.celestePieno : C.spento, marginBottom: 2 }}>
                {M.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: S.cifra, fontWeight: 700, color: tinta, lineHeight: 1.05 }}>
                {c.perc == null ? '—' : (c.perc * 100).toFixed(1) + '%'}
              </div>
              {/* le partite sotto la percentuale: una percentuale su 40 partite
                  e una su 9.349 non si leggono allo stesso modo */}
              <div style={{ fontFamily: F.sans, fontSize: S.minuta, color: C.spento, marginTop: 3, lineHeight: 1.35 }}>
                {c.giocate
                  ? <>{c.ok} azzeccate<br />su {c.giocate} scelte</>
                  : 'nessuna partita sopra soglia'}
              </div>
              {/* ⚠️ Lo **scarto dalla base**, che è la risposta vera a "quale
                  indicatore è più preciso": dentro una fascia di quota il
                  valore assoluto lo decide il prezzo, non l'indicatore. */}
              {scarto != null && (
                <div style={{ fontFamily: F.sans, fontSize: S.minuta, marginTop: 2,
                  color: scarto > 0.005 ? C.verde : scarto < -0.005 ? C.rosso : C.spento }}>
                  {scarto > 0 ? '+' : ''}{(scarto * 100).toFixed(1)} punti sulla base
                </div>
              )}
              <div style={{ fontFamily: F.sans, fontSize: S.micro, color: C.spento, marginTop: 1 }}>
                sopra {scrivi(M.id, soglie[M.id])}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── I quattro d'accordo ───────────────────────────────────────────── */}
      {/* ⚠️ Risponde alla domanda di Mattia del 12/10 (*"esiste un punto in
          comune per questi 4 valori?"*) e la risposta misurata è: sale, ma il
          guadagno sull'attendibilità da sola **non è dimostrabile** — 74,1%
          ±2,6 su 1.118 partite contro 71,6% ±1,1 su 6.257. Per questo è
          l'ultima card e parte chiusa: è un controllo, non un metodo di scelta.
          ⚠️ **Aprire la card E caricare le partite sono lo stesso gesto**
          (15/10/2026): prima erano due tocchi diversi sullo stesso posto, uno
          per la frase e uno per l'elenco. */}
      <CardPiega titolo="QUANDO SONO D&apos;ACCORDO TUTTI E QUATTRO" colore={C.verde}
        style={{ marginBottom: 12, borderColor: alpha(C.verde, 0.3) }}
        aperta={apri.accordo} onTocca={() => piega('accordo')}
        riassunto={<>{tutteLeVerdi.perc == null ? '—' : (tutteLeVerdi.perc * 100).toFixed(1) + '%'}
          <span style={{ color: C.spento }}> su {tutteLeVerdi.giocate} partite</span></>}>
        {/* ⚠️ **Una percentuale senza la sua frase non si legge.** Mattia
            (15/10/2026): *"a destra c'è una % — cosa indica?"*. Era un numero
            appoggiato all'etichetta, e poteva voler dire tre cose diverse:
            quante partite sono, quante ne azzecca, quanto guadagna. Ora la
            frase dice il soggetto (le partite dove tutti e quattro stanno
            sopra la loro soglia), il verbo (azzeccate) e il confronto (tutte
            le altre), che è l'unico modo di sapere se quel numero è alto. */}
        <div style={{ fontSize: S.base, fontFamily: F.sans, color: C.spento, lineHeight: 1.5 }}>
          nelle <b style={{ color: C.testo }}>{tutteLeVerdi.giocate}</b> partite dove VPM, attendibilità,
          scelta e voto stanno <b style={{ color: C.testo }}>tutti</b> sopra la loro soglia, la giocata è
          arrivata{' '}
          <b style={{ color: tutteLeVerdi.perc == null ? C.spento : C.verde, fontSize: S.media }}>
            {tutteLeVerdi.perc == null ? '—' : (tutteLeVerdi.perc * 100).toFixed(1) + '%'}
          </b>
          {' '}delle volte.
        </div>
        <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.spento, marginTop: 4 }}>
          in tutte le altre: {sotto.perc == null ? '—' : (sotto.perc * 100).toFixed(1) + '%'} su {sotto.giocate}
        </div>
        <Risultato righe={righeVerdi} metodo={metodo} soglie={soglie} evidenzia={false}
          titolo="LE PARTITE CON TUTTI E QUATTRO SOPRA SOGLIA" />
      </CardPiega>

      {gruppi === null && <Attesa style={{ padding: 0 }} />}
      {/* ⚠️ Un elenco tagliato va detto. È la stessa lezione del troncamento a
          1000: un limite che non si vede fa credere di guardare tutto. */}
      {chiavi?.length === 400 && (
        <div style={{ fontSize: S.minuta, fontFamily: F.sans, color: C.ambra, marginBottom: 8 }}>
          mostro i 400 {ambito === 'giorno' ? 'giorni' : 'weekend'} più recenti — scegli una stagione per vederli tutti
        </div>
      )}
      {gruppi?.map(([wk, lista]) => (
        <div key={wk || 'tutti'} style={{ marginBottom: 10 }}>
          {wk && (
            <div style={{ fontSize: S.micro, fontFamily: F.sans, color: C.spento, letterSpacing: '0.08em', marginBottom: 3 }}>
              WEEKEND DEL {gg(wk)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {lista.map(k => (
              <Tendina key={String(k.chiave)} ambito={ambito} metodo={metodo} chiave={k.chiave} soglie={soglie} fascia={fascia}
                etichetta={ambito === 'giorno' ? gg(k.chiave) : `weekend del ${gg(k.chiave)}`}
                conteggio={k} aperta={aperta === String(k.chiave)}
                onTocca={() => setAperta(a => a === String(k.chiave) ? null : String(k.chiave))}
                titolo={`${ambito === 'giorno' ? gg(k.chiave) : 'weekend del ' + gg(k.chiave)} · ${METODI.find(m => m.id === metodo)?.label}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
