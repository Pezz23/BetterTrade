import { useState, useMemo, Fragment } from 'react'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import { usaAndamento, METODI, conta, scrivi, tutteVerdi, sopra } from '../hooks/usaAndamento'

// ANDAMENTO — quanto sono attendibili i nostri indicatori, sulle partite vere.
//
// ⚠️ **Non calcola niente**: legge la tabella `andamento` (sql/21-22), riempita
// da `btscout/scripts/calcola-andamento.js`. Ricostruire VPM e i gol attesi di
// ogni giornata passata dal browser non è fattibile, e un numero che cambia a
// seconda di quando apri la pagina non è una misura.
//
// ⚠️ **Lo scopo non è l'archivio, è la soglia.** Mattia (12/10/2026): *"in
// questo storico vedo tutto, ma non mi interessa: devo studiare
// l'attendibilità dei nostri indicatori. Attendibilità 37% non la voglio
// neanche vedere, è rumore"*. Perciò le soglie sono **accese di default** e
// tutto quello che sta sotto sparisce — dal riassunto, non solo dall'elenco.

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

/**
 * L'elenco delle partite scelte, coi quattro valori su ogni riga.
 * ⚠️ Separato dalla pagina perché ora compare **dentro la tendina del giorno**
 * e dentro la card delle quattro spunte: lo stesso elenco in due posti, non
 * due elenchi che prima o poi divergono.
 */
function Elenco({ righe, metodo, soglie, titolo, evidenzia = true }) {
  const c = conta(righe)
  return (
    <div style={{ padding: '2px 0 6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <Etichetta>{titolo}</Etichetta>
        <div style={{ fontFamily: F.mono, fontSize: 12, color: c.perc == null ? C.spento : c.perc >= 0.5 ? C.verde : C.rosso }}>
          {c.ok}/{c.giocate}{c.perc != null && ` · ${(c.perc * 100).toFixed(0)}%`}
        </div>
      </div>
      {!righe.length && <div style={{ fontSize: 11, color: C.spento, fontFamily: F.mono, padding: '6px 0' }}>nessuna partita sopra soglia qui.</div>}
      {!!righe.length && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 34px 42px 48px 34px 14px', gap: 4, padding: '0 0 3px' }}>
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
          display: 'grid', gridTemplateColumns: '1fr 34px 42px 48px 34px 14px', gap: 4, alignItems: 'center',
          padding: '5px 0', borderTop: `1px solid ${alpha(C.testo, 0.06)}`,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: C.testo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.casa} — {r.trasferta}
            </div>
            <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento }}>
              {(r.data || r.weekend).slice(8, 10)}/{(r.data || r.weekend).slice(5, 7)} · {r.div} · {r.giocata} · {Number(r.quota).toFixed(2).replace('.', ',')}
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

export default function AndamentoPage() {
  const { righe, errore } = usaAndamento()
  const [ambito, setAmbito] = useState('giorno')
  const [metodo, setMetodo] = useState('att')
  const [chiave, setChiave] = useState(null)
  const [soglie, setSoglie] = useState(Object.fromEntries(METODI.map(m => [m.id, m.soglia])))
  const [filtro, setFiltro] = useState(true)
  const [verdi, setVerdi] = useState(false)       // il gruppo delle quattro spunte

  const muovi = (id, verso) => setSoglie(s => {
    const M = METODI.find(m => m.id === id)
    // ⚠️ Si arrotonda al passo, non a due cifre fisse: con passo 0,0025 un
    // arrotondamento a 0,01 riporterebbe il valore indietro a ogni scatto.
    const quanti = Math.round((s[id] + verso * M.passo) / M.passo)
    return { ...s, [id]: Math.max(0, Math.round(quanti * M.passo * 1e6) / 1e6) }
  })

  // ⚠️ Il filtro agisce su **quell'indicatore**: guardando il voto si tolgono
  // le partite col voto basso, non quelle con VPM basso. Le altre tre colonne
  // restano visibili, perché servono proprio a vedere chi altro avvisava.
  const passa = (r, id) => !filtro || sopra(r, id, soglie)

  const chiavi = useMemo(() => {
    if (!righe) return []
    const campo = ambito === 'giorno' ? 'data' : 'weekend'
    return [...new Set(righe.filter(r => r.ambito === ambito).map(r => r[campo]))].sort().reverse()
  }, [righe, ambito])
  // ⚠️ `null` = tutto chiuso. Il secondo tocco sullo stesso giorno richiude
  // (richiesta di Mattia): una tendina che si apre e basta obbliga a scorrere
  // per tornare all'elenco dei giorni.
  const apri = (k) => setChiave(c => c === k ? null : k)
  const aperta = chiave && chiavi.includes(chiave) ? chiave : null

  // ⚠️ I giorni raggruppati **per weekend, uno sull'altro** (richiesta di
  // Mattia): un elenco piatto di venticinque date non dice a quale weekend
  // appartengono, e il weekend è l'unità con cui si gioca.
  const perWeekend = useMemo(() => {
    if (!righe || ambito !== 'giorno') return []
    const m = new Map()
    for (const r of righe.filter(x => x.ambito === 'giorno')) {
      if (!m.has(r.weekend)) m.set(r.weekend, new Set())
      m.get(r.weekend).add(r.data)
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([wk, giorni]) => [wk, [...giorni].sort()])
  }, [righe, ambito])

  // Le partite distinte dell'ambito, una per riga, coi quattro valori: è la
  // base sia del gruppo "quattro spunte verdi" sia dei conteggi.
  const distinte = useMemo(() => {
    if (!righe) return []
    const viste = new Map()
    for (const r of righe.filter(x => x.ambito === ambito)) {
      const k = `${r.weekend}|${r.data}|${r.casa}|${r.trasferta}`
      if (!viste.has(k)) viste.set(k, r)
    }
    return [...viste.values()]
  }, [righe, ambito])

  const gruppoVerdi = useMemo(() => distinte.filter(r => tutteVerdi(r, soglie)), [distinte, soglie])

  // le partite di una chiave (giorno o weekend), per il metodo scelto
  const partiteDi = (k) => {
    if (!righe) return []
    const campo = ambito === 'giorno' ? 'data' : 'weekend'
    return righe.filter(r => r.ambito === ambito && r.metodo === metodo && r[campo] === k && passa(r, metodo))
      .sort((a, b) => a.posizione - b.posizione)
  }

  if (errore) return <div style={{ padding: 16 }}><Card><div style={{ color: C.rosso, fontSize: 13 }}>Non riesco a leggere l&apos;andamento: {errore}</div></Card></div>
  if (!righe) return <div style={{ padding: 16, color: C.spento, fontFamily: F.mono, fontSize: 12 }}>carico…</div>
  if (!righe.length) return (
    <div style={{ padding: 16 }}><Card>
      <div style={{ fontSize: 13, color: C.testo, lineHeight: 1.6 }}>Ancora nessun dato. Si riempie da terminale:
        <div style={{ fontFamily: F.mono, fontSize: 11, color: C.spento, marginTop: 8 }}>node --env-file=.env scripts/calcola-andamento.js --esegui</div>
      </div></Card></div>
  )

  const gg = (d) => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '—'

  return (
    <div style={{ padding: '12px 12px 90px' }}>
      <h2 style={{ fontSize: 15, fontFamily: F.mono, letterSpacing: '0.1em', color: C.testo, margin: '4px 0 10px' }}>ANDAMENTO</h2>

      {/* ── Le soglie ─────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Etichetta>SOGLIE MINIME</Etichetta>
          <Tasto attivo={filtro} onClick={() => setFiltro(f => !f)} colore={filtro ? C.verde : C.spento}>
            {filtro ? 'filtro acceso' : 'filtro spento'}
          </Tasto>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '3px 6px', alignItems: 'center' }}>
          {METODI.map(M => {
            // quante partite sopravvivono a questa soglia, e con che esito:
            // è il numero che rende la soglia una scelta e non un'opinione
            const c = conta(distinte.filter(r => sopra(r, M.id, soglie)))
            return (
              <Fragment key={M.id}>
                <div style={{ fontSize: 12, fontFamily: F.mono, color: C.testo }}>{M.label}</div>
                <Tasto onClick={() => muovi(M.id, -1)} colore={C.spento} style={{ padding: '2px 8px' }}>−</Tasto>
                <div style={{ fontFamily: F.mono, fontSize: 13, fontWeight: 700, color: C.oro, minWidth: 62, textAlign: 'center' }}>
                  {scrivi(M.id, soglie[M.id])}
                </div>
                <Tasto onClick={() => muovi(M.id, +1)} colore={C.spento} style={{ padding: '2px 8px' }}>+</Tasto>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: C.spento, textAlign: 'right', minWidth: 76 }}>
                  {c.giocate ? `${(c.perc * 100).toFixed(0)}% su ${c.giocate}` : 'nessuna'}
                </div>
              </Fragment>
            )
          })}
        </div>
      </Card>

      {/* ── Il riassunto, sulle partite che passano la soglia ──────────────── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 10px', alignItems: 'center' }}>
          <Etichetta>RIASSUNTO{filtro ? ' · sopra soglia' : ''}</Etichetta>
          {AMBITI.map(a => (
            <div key={a.id} style={{ fontSize: 8, fontFamily: F.mono, color: C.spento, letterSpacing: '0.08em', textAlign: 'right' }}>PRIME {a.quante}</div>
          ))}
          {METODI.map(M => (
            <Fragment key={M.id}>
              <div style={{ fontSize: 12, fontFamily: F.mono, color: C.testo }}>{M.label}</div>
              {AMBITI.map(a => {
                const c = conta(righe.filter(r => r.ambito === a.id && r.metodo === M.id && passa(r, M.id)))
                return (
                  <div key={a.id} style={{ textAlign: 'right', fontFamily: F.mono }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: c.perc == null ? C.spento : c.perc >= 0.6 ? C.verde : c.perc >= 0.5 ? C.testo : C.rosso }}>
                      {c.perc == null ? '—' : (c.perc * 100).toFixed(1) + '%'}
                    </span>
                    <span style={{ fontSize: 9, color: C.spento, marginLeft: 5 }}>{c.ok}/{c.giocate}</span>
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </Card>

      {/* ── Le quattro spunte verdi ────────────────────────────────────────── */}
      {/* ⚠️ La domanda di Mattia: *"esiste un punto in comune per questi 4
          valori?"*. Qui si vede sulle partite vere. ⚠️ Il gruppo pesca solo
          fra le partite che almeno un metodo ha messo nelle sue prime: una
          partita che nessuno ha scelto non è in tabella, quindi non può
          comparire qui nemmeno se superasse tutte e quattro le soglie. */}
      {(() => {
        const c = conta(gruppoVerdi)
        const tutte = conta(distinte)
        return (
          <Card style={{ marginBottom: 12, borderColor: alpha(C.verde, 0.4) }}
            onClick={() => setVerdi(v => !v)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div>
                <Etichetta colore={C.verde}>✓✓✓✓ TUTTE E QUATTRO SOPRA SOGLIA</Etichetta>
                <div style={{ fontSize: 10, fontFamily: F.mono, color: C.spento, marginTop: 3 }}>
                  {c.giocate} partite su {tutte.giocate} · le altre fanno {tutte.giocate - c.giocate ? ((tutte.ok - c.ok) / (tutte.giocate - c.giocate) * 100).toFixed(1) + '%' : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 700, color: c.perc == null ? C.spento : c.perc >= 0.6 ? C.verde : C.testo }}>
                  {c.perc == null ? '—' : (c.perc * 100).toFixed(1) + '%'}
                </div>
                <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento }}>{verdi ? 'tocca per chiudere' : 'tocca per vederle'}</div>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* ── I tasti ────────────────────────────────────────────────────────── */}
      {!verdi && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {AMBITI.map(a => <Tasto key={a.id} attivo={ambito === a.id} onClick={() => { setAmbito(a.id); setChiave(null) }}>{a.label}</Tasto>)}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {METODI.map(M => <Tasto key={M.id} attivo={metodo === M.id} onClick={() => setMetodo(M.id)} colore={C.celestePieno}>{M.breve}</Tasto>)}
          </div>

          {/* ⚠️ Il giorno è una tendina: si tocca, si apre sotto, si ritocca
              e si chiude. I giorni restano uno sull'altro e raggruppati per
              weekend, così si vede a quale weekend appartiene quello aperto. */}
          {ambito === 'giorno' ? (
            <div style={{ marginBottom: 12 }}>
              {perWeekend.map(([wk, giorni]) => (
                <div key={wk} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento, letterSpacing: '0.08em', marginBottom: 3 }}>
                    WEEKEND DEL {gg(wk)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {giorni.map(d => {
                      const l = partiteDi(d), c = conta(l)
                      return (
                        <div key={d}>
                          <Tasto attivo={aperta === d} onClick={() => apri(d)} colore={C.viola}
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{aperta === d ? '▾' : '▸'} {gg(d)}</span>
                            {/* il risultato del giorno sul tasto: così si sceglie
                                quale aprire invece di aprirli tutti per sapere */}
                            <span style={{ fontSize: 10, color: c.perc == null ? C.spento : c.perc >= 0.5 ? C.verde : C.rosso }}>
                              {c.giocate ? `${c.ok}/${c.giocate}` : '—'}
                            </span>
                          </Tasto>
                          {aperta === d && (
                            <Card style={{ marginTop: 3 }}>
                              <Elenco righe={l} metodo={metodo} soglie={soglie}
                                titolo={`${gg(d)} · ${METODI.find(m => m.id === metodo)?.label}`} />
                            </Card>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
              {chiavi.map(k => {
                const l = partiteDi(k), c = conta(l)
                return (
                  <div key={k}>
                    <Tasto attivo={aperta === k} onClick={() => apri(k)} colore={C.viola}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{aperta === k ? '▾' : '▸'} weekend del {gg(k)}</span>
                      <span style={{ fontSize: 10, color: c.perc == null ? C.spento : c.perc >= 0.5 ? C.verde : C.rosso }}>
                        {c.giocate ? `${c.ok}/${c.giocate}` : '—'}
                      </span>
                    </Tasto>
                    {aperta === k && (
                      <Card style={{ marginTop: 3 }}>
                        <Elenco righe={l} metodo={metodo} soglie={soglie}
                          titolo={`weekend del ${gg(k)} · ${METODI.find(m => m.id === metodo)?.label}`} />
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Le quattro spunte verdi hanno il loro elenco, fuori dalle tendine:
          non appartengono a un giorno solo. */}
      {verdi && (
        <Card>
          <Elenco righe={gruppoVerdi} metodo={metodo} soglie={soglie} evidenzia={false}
            titolo="LE QUATTRO SPUNTE VERDI" />
        </Card>
      )}
    </div>
  )
}
