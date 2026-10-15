import { useState, useEffect } from 'react'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import {
  METODI, SOGLIE_BASE, conSoglie, scrivi, sopra, quota,
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
      padding: '6px 10px', fontSize: 11, fontFamily: F.mono, letterSpacing: '0.04em',
      cursor: 'pointer', whiteSpace: 'nowrap',
      // ⚠️ `color` esplicito: un <button> non eredita il colore del testo.
      color: attivo ? colore : C.spento,
      background: attivo ? `linear-gradient(${alpha(colore, 0.14)},${alpha(colore, 0.14)}), ${C.card}` : C.card,
      border: `1px solid ${alpha(colore, attivo ? 0.5 : 0.18)}`, ...style,
    }}>{children}</button>
  )
}

const gg = (d) => d ? String(d).slice(8, 10) + '/' + String(d).slice(5, 7) : '—'

/** L'elenco delle partite, coi quattro valori su ogni riga. */
function Elenco({ righe, metodo, soglie, titolo, evidenzia = true }) {
  const ok = righe.filter(r => r.azzeccata).length
  const griglia = '1fr 34px 42px 48px 34px 14px'
  return (
    <div style={{ padding: '2px 0 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <Etichetta>{titolo}</Etichetta>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: !righe.length ? C.spento : ok / righe.length >= 0.5 ? C.verde : C.rosso }}>
          {ok}/{righe.length}{righe.length > 0 && ` · ${(ok / righe.length * 100).toFixed(0)}%`}
        </div>
      </div>
      {!righe.length && <div style={{ fontSize: 11, color: C.spento, fontFamily: F.mono, padding: '6px 0' }}>nessuna partita sopra soglia qui.</div>}
      {!!righe.length && (
        <div style={{ display: 'grid', gridTemplateColumns: griglia, gap: 4, padding: '0 0 3px' }}>
          <div />
          {METODI.map(M => (
            <div key={M.id} style={{ fontSize: 7, fontFamily: F.mono, letterSpacing: '0.06em', textAlign: 'right',
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
            <div style={{ fontSize: 12, color: C.testo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.casa} — {r.trasferta}
            </div>
            <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento }}>
              {gg(r.data || r.weekend)} · {r.div} · {r.giocata} · {Number(r.quota).toFixed(2).replace('.', ',')}
            </div>
          </div>
          {/* ⚠️ Tutti e quattro i valori, non solo quello che ha scelto la
              partita: verde se sta sopra la sua soglia. È la risposta a
              "quali indicatori mi avrebbero allertato". */}
          {METODI.map(M => (
            <div key={M.id} style={{
              fontFamily: F.mono, fontSize: 10, textAlign: 'right',
              color: sopra(r, M.id, soglie) ? C.verde : C.spento,
              fontWeight: evidenzia && M.id === metodo ? 700 : 400,
            }}>{scrivi(M.id, r[M.id])}</div>
          ))}
          <div style={{ fontFamily: F.mono, fontSize: 13, color: r.azzeccata ? C.verde : C.rosso, textAlign: 'center' }}>
            {r.azzeccata ? '✓' : '✗'}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Una tendina: il tasto col risultato, e sotto le partite quando è aperta. */
function Tendina({ etichetta, conteggio, aperta, onTocca, ambito, metodo, chiave, soglie, titolo }) {
  const [righe, setRighe] = useState(null)
  useEffect(() => {
    if (!aperta) return
    let vivo = true
    partiteDi(ambito, metodo, chiave).then(r => { if (vivo) setRighe(r) })
    return () => { vivo = false }
  }, [aperta, ambito, metodo, chiave])
  const c = quota(conteggio)
  return (
    <div>
      <Tasto attivo={aperta} onClick={onTocca} colore={C.viola}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{aperta ? '▾' : '▸'} {etichetta}</span>
        {/* il risultato sul tasto: senza, per sapere com'è andato un giorno
            bisognerebbe aprirlo, e con le tendine significa aprirli tutti */}
        <span style={{ fontSize: 10, color: c.perc == null ? C.spento : c.perc >= 0.5 ? C.verde : C.rosso }}>
          {c.giocate ? `${c.ok}/${c.giocate}` : '—'}
        </span>
      </Tasto>
      {aperta && (
        <Card style={{ marginTop: 3 }}>
          {righe === null
            ? <div style={{ fontSize: 11, fontFamily: F.mono, color: C.spento, padding: '6px 0' }}>carico…</div>
            : <Elenco righe={righe} metodo={metodo} soglie={soglie} titolo={titolo} />}
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
  const soglie = conSoglie(soglieGrezze)
  const [verdi, setVerdi] = useState(false)
  const [righeVerdi, setRigheVerdi] = useState(null)

  const stagioni = usaStagioni()
  // ⚠️ Si parte dalla stagione più recente, non da "tutte": con tutte, i giorni
  // sono 1636 e l'elenco dei tasti verrebbe tagliato a 400. Il riassunto e
  // l'accordo invece sono conteggi, quindi su "tutte" restano completi.
  useEffect(() => {
    if (stagione === null && stagioni?.length) setStagione(stagioni[0].stagione)
  }, [stagioni, stagione])
  const { riassunto, accordo, errore } = usaRiassunto(soglie, stagione)
  const chiavi = usaChiavi(ambito, metodo, soglie, stagione)

  useEffect(() => {
    if (!verdi) return
    let vivo = true
    setRigheVerdi(null)
    partiteVerdi(soglie, stagione).then(r => { if (vivo) setRigheVerdi(r) })
    return () => { vivo = false }
  }, [verdi, soglie, stagione])

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

  if (errore) return <div style={{ padding: 16 }}><Card><div style={{ color: C.rosso, fontSize: 13 }}>Non riesco a leggere l&apos;andamento: {errore}</div></Card></div>

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
        <h2 style={{ fontSize: 15, fontFamily: F.mono, letterSpacing: '0.1em', color: C.testo, margin: 0 }}>ANDAMENTO</h2>
        <select value={stagione ?? ''} onChange={e => { setStagione(e.target.value); setAperta(null) }}
          style={{ background: C.card, color: C.testo, border: `1px solid ${alpha(C.oro, 0.3)}`,
            fontFamily: F.mono, fontSize: 12, padding: '4px 6px' }}>
          <option value="">tutte le stagioni</option>
          {(stagioni || []).map(s => (
            <option key={s.stagione} value={s.stagione}>{s.stagione.slice(0, 2)}/{s.stagione.slice(2)}</option>
          ))}
        </select>
      </div>

      {/* ── Le soglie ─────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 12 }}>
        <Etichetta>SOGLIE MINIME</Etichetta>
        {/* ⚠️ Qui ci sono **solo i comandi**: il risultato di ogni soglia sta
            nella sua card, subito sotto. Prima era scritto anche qui, e lo
            stesso numero in due posti è il difetto che prima o poi li fa
            divergere — lo stesso motivo per cui il Grado è stato togliere
            dalla barra. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '3px 6px', alignItems: 'center', marginTop: 6 }}>
          {METODI.map(M => (
            <div key={M.id} style={{ display: 'contents' }}>
              <div style={{ fontSize: 12, fontFamily: F.mono, color: C.testo }}>{M.label}</div>
              <Tasto onClick={() => muovi(M.id, -1)} colore={C.spento} style={{ padding: '2px 8px' }}>−</Tasto>
              <div style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.oro, minWidth: 62, textAlign: 'center' }}>
                {scrivi(M.id, soglie[M.id])}
              </div>
              <Tasto onClick={() => muovi(M.id, +1)} colore={C.spento} style={{ padding: '2px 8px' }}>+</Tasto>
            </div>
          ))}
        </div>
      </Card>

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
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
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
          return (
            <button key={M.id} onClick={() => { setMetodo(M.id); setAperta(null) }} style={{
              textAlign: 'left', cursor: 'pointer', padding: '9px 10px', color: C.testo,
              background: scelto ? `linear-gradient(${alpha(C.celestePieno, 0.08)},${alpha(C.celestePieno, 0.08)}), ${C.card}` : C.card,
              border: `1px solid ${alpha(scelto ? C.celestePieno : C.testo, scelto ? 0.5 : 0.1)}`,
            }}>
              <div style={{ fontSize: 10, fontFamily: F.mono, letterSpacing: '0.08em',
                color: scelto ? C.celestePieno : C.spento, marginBottom: 2 }}>
                {M.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 26, fontWeight: 700, color: tinta, lineHeight: 1.05 }}>
                {c.perc == null ? '—' : (c.perc * 100).toFixed(1) + '%'}
              </div>
              {/* le partite sotto la percentuale: una percentuale su 40 partite
                  e una su 9.349 non si leggono allo stesso modo */}
              <div style={{ fontFamily: F.mono, fontSize: 10, color: C.spento, marginTop: 3 }}>
                {c.giocate ? `${c.ok} su ${c.giocate} partite` : 'nessuna partita sopra soglia'}
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.spento, marginTop: 1 }}>
                sopra {scrivi(M.id, soglie[M.id])}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── I quattro d'accordo, in una riga ──────────────────────────────── */}
      {/* ⚠️ Risponde alla domanda di Mattia del 12/10 (*"esiste un punto in
          comune per questi 4 valori?"*) e la risposta misurata è: sale, ma il
          guadagno sull'attendibilità da sola **non è dimostrabile** — 74,1%
          ±2,6 su 1.118 partite contro 71,6% ±1,1 su 6.257. Per questo è una
          riga e non una card: è un controllo, non un metodo di scelta. */}
      <Card style={{ marginBottom: 12, borderColor: alpha(C.verde, 0.3), cursor: 'pointer' }}>
        <div onClick={() => setVerdi(v => !v)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <Etichetta colore={C.verde}>TUTTI E QUATTRO SOPRA SOGLIA</Etichetta>
            <span style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: tutteLeVerdi.perc == null ? C.spento : C.verde }}>
              {tutteLeVerdi.perc == null ? '—' : (tutteLeVerdi.perc * 100).toFixed(1) + '%'}
            </span>
          </div>
          <div style={{ fontSize: 10, fontFamily: F.mono, color: C.spento, marginTop: 4 }}>
            {tutteLeVerdi.giocate} partite · tutte le altre {sotto.perc == null ? '—' : (sotto.perc * 100).toFixed(1) + '%'} su {sotto.giocate}
            {' · '}{verdi ? 'chiudi' : 'tocca per vederle'}
          </div>
        </div>
        {verdi && (righeVerdi === null
          ? <div style={{ fontSize: 11, fontFamily: F.mono, color: C.spento, paddingTop: 8 }}>carico…</div>
          : <Elenco righe={righeVerdi} metodo={metodo} soglie={soglie} evidenzia={false} titolo="LE QUATTRO SPUNTE VERDI" />)}
      </Card>

      {gruppi === null && <div style={{ fontSize: 11, fontFamily: F.mono, color: C.spento }}>carico…</div>}
      {/* ⚠️ Un elenco tagliato va detto. È la stessa lezione del troncamento a
          1000: un limite che non si vede fa credere di guardare tutto. */}
      {chiavi?.length === 400 && (
        <div style={{ fontSize: 10, fontFamily: F.mono, color: C.ambra, marginBottom: 8 }}>
          mostro i 400 {ambito === 'giorno' ? 'giorni' : 'weekend'} più recenti — scegli una stagione per vederli tutti
        </div>
      )}
      {gruppi?.map(([wk, lista]) => (
        <div key={wk || 'tutti'} style={{ marginBottom: 10 }}>
          {wk && (
            <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento, letterSpacing: '0.08em', marginBottom: 3 }}>
              WEEKEND DEL {gg(wk)}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {lista.map(k => (
              <Tendina key={String(k.chiave)} ambito={ambito} metodo={metodo} chiave={k.chiave} soglie={soglie}
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
