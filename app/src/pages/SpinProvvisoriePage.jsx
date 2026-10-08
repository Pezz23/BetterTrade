import { useState, useMemo, useEffect } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Btn } from '../components/ui'
import { CATEGORIE, pct, giorno } from '../components/RigaPartita'
import { categoria, SOGLIE_DEFAULT, martediChiusura } from '../lib/attendibilita'
import ScegliCasella from '../components/ScegliCasella'
import CompilaPerQuota from '../components/CompilaPerQuota'
import { candidate, componi, conStelline, votateOltreIlLimite, spinPiena, pronosticoDa, DISPOSIZIONE } from '../lib/spin'
import { compilaSpin } from '../lib/griglia'
import { supabase } from '../supabase'
import { sigla } from '../lib/campionati'

// L'anteprima delle spin compilate da sole, dalla lista delle partite della
// settimana. Per ogni spin due griglie: quella automatica (solo attendibilità)
// e quella con le stelline (le votate prima). Le celle in cui le due
// differiscono si accendono. La logica è in lib/spin.js.

// La quarta spin è "Fun", libera e scritta a mano: la compilazione automatica
// riempie solo le tre agganciate al calendario.
const SPIN = [1, 2, 3]

function Cella({ pos, partita, votiDi, diversa, onClic, inAltre }) {
  const cat = partita ? categoria(partita.probGiocata, SOGLIE_DEFAULT) : 'no'
  const colore = CATEGORIE[cat].colore
  const voti = partita ? votiDi(partita.id) : 0
  return (
    <div style={{
      // Il violetto per le celle sostituite: oro, verde e celeste sono già le
      // tre categorie, e l'arancione si confonderebbe con l'oro degli angoli.
      background: alpha(colore, partita ? 0.10 : 0.03), border: `2px solid ${diversa ? C.viola : alpha(colore, partita ? 0.4 : 0.15)}`,
      boxShadow: diversa ? `0 0 10px ${alpha(C.viola, 0.45)}` : 'none',
      borderRadius: 10, padding: '8px 6px', height: 124, textAlign: 'center', fontFamily: F.mono,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
      cursor: onClic ? 'pointer' : 'default',
    }} onClick={onClic}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.spento, lineHeight: 1 }}>
        <span>{pos}</span>
        <span style={{ display: 'flex', gap: 4 }}>
          {/* ambra, non violetto: il violetto dice già "diversa dall'automatica" */}
          {inAltre?.length > 0 && <span title={`anche nella spin ${inAltre.join(', ')}`} style={{ color: C.ambra }}>↔{inAltre.join('')}</span>}
          {voti > 0 && <span style={{ color: C.oro }}>{'★'.repeat(voti)}</span>}
        </span>
      </div>
      {partita ? (
        <>
          {/* Le squadre su due righe, una ciascuna: i nomi lunghi si tagliano invece di rompere la cella. */}
          <div style={{ fontSize: 12, color: C.testo, fontFamily: F.sans, fontWeight: 600, lineHeight: 1.3 }}>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{partita.casa}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: C.spento }}>{partita.trasferta}</div>
          </div>
          {/* La giocata nella forma compatta della griglia: "1+O1,5" sta su una riga, "1 + over 1,5" no. */}
          <div style={{ fontSize: 17, fontWeight: 700, color: colore, whiteSpace: 'nowrap', lineHeight: 1 }}>{pronosticoDa(partita.giocata)}</div>
          <div style={{ fontSize: 11, color: C.spento, whiteSpace: 'nowrap' }}>
            {partita.quotaGiocata ? `@${partita.quotaGiocata.toFixed(2)}` : 'sul book'} · <b style={{ color: colore }}>{pct(partita.probGiocata)}</b>
          </div>
          <div style={{ fontSize: 10, color: C.fantasma, whiteSpace: 'nowrap' }}>{sigla(partita.div)} · {giorno(partita.data)}</div>
        </>
      ) : <div style={{ fontSize: 12, color: C.fantasma }}>—</div>}
    </div>
  )
}

// Il tasto sotto ogni griglia. Se la spin ha già qualcosa dentro chiede
// conferma al primo clic e scrive al secondo: una spin in corso non si perde
// per sbaglio.
function Compila({ indice, celle, piena, onFatto }) {
  const [conferma, setConferma] = useState(false)
  const [stato, setStato] = useState(null)   // 'scrivo' | 'fatta' | errore
  const vuota = celle.every(c => !c.partita)
  async function clic() {
    if (piena && !conferma) { setConferma(true); return }
    setStato('scrivo')
    const errore = await compilaSpin(indice, celle)
    setStato(errore || 'fatta'); setConferma(false)
    if (!errore) onFatto()
  }
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <Btn onClick={clic} disabled={vuota || stato === 'scrivo'} variante={conferma ? 'pericolo' : 'contorno'} style={{ padding: '8px 14px', fontSize: 12 }}>
        {conferma ? `⚠️ La spin ${indice + 1} è già compilata: sovrascrivo?` : stato === 'scrivo' ? 'Scrivo…' : `Compila spin n.${indice + 1}`}
      </Btn>
      {conferma && <span onClick={() => setConferma(false)} style={{ fontSize: 11, color: C.spento, cursor: 'pointer', fontFamily: F.sans }}>annulla</span>}
      {stato === 'fatta' && <span style={{ fontSize: 11, color: C.verde, fontFamily: F.mono }}>✓ scritta nella griglia — la vedi in Slot</span>}
      {stato && stato !== 'fatta' && stato !== 'scrivo' && <span style={{ fontSize: 11, color: C.rosso, fontFamily: F.sans }}>⚠️ {stato}</span>}
    </div>
  )
}

function Griglia({ titolo, colore, celle, riferimento, votiDi, indice, piena, onFatto, spiegazione, onClicCasella, onRipristina, onPerQuota, altrove }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <Etichetta colore={colore} style={{ fontSize: 12, marginBottom: spiegazione ? 3 : 6 }}>{titolo}</Etichetta>
        {/* Compare solo se hai toccato qualcosa: rimette l'ordine automatico
            delle votate, senza passare dal database. */}
        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {onPerQuota && (
            <button onClick={onPerQuota} style={{
              background: alpha(C.oro, 0.1), border: `1px solid ${alpha(C.oro, 0.35)}`, borderRadius: 20, color: C.oro,
              fontSize: 10, fontFamily: F.mono, padding: '3px 9px', cursor: 'pointer',
            }}>compila per quota</button>
          )}
          {onRipristina && (
            <button onClick={onRipristina} style={{
              background: 'transparent', border: `1px solid ${C.bordo}`, borderRadius: 20, color: C.spento,
              fontSize: 10, fontFamily: F.mono, padding: '3px 9px', cursor: 'pointer',
            }}>↺ riparti dalle votate</button>
          )}
        </span>
      </div>
      {/* Come ci finiscono dentro le partite: va detto qui, è il momento in
          cui lo si guarda. Prima c'era il conto delle celle diverse, che non
          spiegava niente. */}
      {spiegazione && (
        <div style={{ fontSize: 10.5, color: C.spento, fontFamily: F.sans, lineHeight: 1.5, marginBottom: 7 }}>
          {spiegazione}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {DISPOSIZIONE.flat().map(pos => {
          const c = celle.find(c => c.pos === pos)
          const rif = riferimento?.find(r => r.pos === pos)
          return <Cella key={pos} pos={pos} partita={c.partita} votiDi={votiDi} diversa={!!riferimento && c.partita?.id !== rif?.partita?.id}
            inAltre={c.partita ? altrove?.[c.partita.id] : null}
            onClic={onClicCasella ? () => onClicCasella(pos) : undefined} />
        })}
      </div>
      <Compila indice={indice} celle={celle} piena={piena} onFatto={onFatto} />
    </div>
  )
}

export default function SpinProvvisoriePage() {
  const { righe, votiDi, caricamento, errore } = usaProssime()
  const [quante, setQuante] = useState(3)
  // Quali spin della griglia hanno già qualcosa dentro: per la conferma.
  const [piene, setPiene] = useState([false, false, false])
  async function leggiGriglia() {
    const { data } = await supabase.from('griglia').select('spins').eq('id', 1).single()
    setPiene([0, 1, 2].map(i => spinPiena(data?.spins?.[i])))
  }
  useEffect(() => { leggiGriglia() }, [])

  // ⚠️ Niente scelta della finestra: il limite è il martedì che chiude il
  // weekend ed è un blocco (8/10/2026). Prima si poteva allargare a "tutte" e
  // la spin finiva per mescolare due weekend. Se le candidate non bastano, le
  // caselle restano vuote e la pagina lo dice: allargare non è più un rimedio.
  const limite = martediChiusura()
  // Solo giorno/mese: `giorno()` ci mette davanti il giorno della settimana, e
  // accanto alla parola "martedì" diventerebbe "martedì mar 13/10".
  const gm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`
  const ordinate = useMemo(() => candidate(righe, { votiDi }), [righe, votiDi])
  // Le votate che giocano dopo il martedì: il loro voto non produce niente,
  // e tacerlo farebbe sembrare la stellina ignorata.
  const oltre = useMemo(() => votateOltreIlLimite(righe, votiDi), [righe, votiDi])
  const automatiche = useMemo(() => componi(ordinate, quante), [ordinate, quante])
  // Solo le partite votate, niente riempitivi: se i voti non bastano le
  // caselle restano vuote (deciso il 2/10/2026). La griglia con le stelline
  // deve dire cosa avete scelto VOI, non cosa ci metterebbe il criterio.
  const soloVotate = useMemo(() => conStelline(ordinate.filter(r => votiDi(r.id) > 0), votiDi), [ordinate, votiDi])

  // Le scelte fatte a mano: { "spin|posizione": partita | null }. Vivono qui,
  // non nel database — finché non si preme "Compila spin" è un'anteprima, e si
  // possono provare combinazioni senza sporcare niente.
  const [aMano, setAMano] = useState({})
  const [casella, setCasella] = useState(null)   // { spin, pos } aperta
  const [perQuota, setPerQuota] = useState(null) // la spin per cui si compila a quota

  // Dove sta già una partita, nelle ALTRE spin: non la blocca (si può ripetere
  // volendo), ma deve essere evidente prima di sceglierla.
  const altrove = spinCorrente => {
    const m = {}
    votate.forEach((spin, si) => {
      if (si === spinCorrente) return
      spin.forEach(c => { if (c.partita) (m[c.partita.id] ??= []).push(si + 1) })
    })
    return m
  }

  const votate = useMemo(() => componi(soloVotate, quante).map((spin, si) =>
    spin.map(c => (`${si}|${c.pos}` in aMano ? { ...c, partita: aMano[`${si}|${c.pos}`] } : c))
  ), [soloVotate, quante, aMano])
  const nVotate = ordinate.filter(p => votiDi(p.id) > 0).length
  // Tutte le partite con almeno una stellina, anche sotto soglia o oltre la
  // settimana: chi ha votato deve vedere dov'è finito il suo voto.
  const votateTutte = useMemo(() => righe.filter(p => votiDi(p.id) > 0).sort((a, b) => votiDi(b.id) - votiDi(a.id) || b.probGiocata - a.probGiocata), [righe, votiDi])
  const lunedi = lunediProssimo(0)
  const doveSta = id => {
    for (let s = 0; s < votate.length; s++) { const c = votate[s].find(c => c.partita?.id === id); if (c) return { spin: s + 1, pos: c.pos } }
    return null
  }
  const servono = quante * 9

  return (
    <div style={{ padding: 16 }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>SPIN PROVVISORIE</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Anteprima delle spin</div>
      <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans, marginBottom: 14, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : <>
          {ordinate.length} partite candidate · <b style={{ color: nVotate ? C.oro : C.ambra }}>{nVotate} votate</b>,
          che riempiono {Math.min(nVotate, quante * 9)} delle {quante * 9} caselle con le stelline.
          {ordinate.length < servono && <span style={{ color: C.ambra }}> Per {quante} spin ne servono {servono}: le ultime restano a metà.</span>}
        </>}
      </div>

      {/* Il limite, sempre in vista: è la regola che decide chi entra, e prima
          era una scelta che si poteva allargare per sbaglio. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '9px 12px',
        background: `linear-gradient(${alpha(C.oro, 0.07)},${alpha(C.oro, 0.07)}), ${C.card}`,
        border: `1px solid ${alpha(C.oro, 0.3)}`, borderRadius: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>🔒</span>
        <span style={{ fontSize: 12, color: C.testo, fontFamily: F.sans, lineHeight: 1.5 }}>
          Solo le partite di questo weekend, <b style={{ color: C.oro }}>fino a martedì {gm(limite)}</b>.
          Oltre non entra niente, <b style={{ color: C.testo }}>nemmeno se votato</b>: una spin che mescola
          due weekend tiene le schedine aperte nove giorni.
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: C.spento, fontFamily: F.sans }}>Quante spin riempire</span>
        {SPIN.map(n => (
          <button key={n} onClick={() => setQuante(n)} style={{
            width: 36, height: 36, borderRadius: 18, cursor: 'pointer', fontFamily: F.mono, fontSize: 14, fontWeight: 700,
            background: quante === n ? alpha(C.oro, 0.15) : 'transparent', border: `1px solid ${quante === n ? alpha(C.oro, 0.5) : C.bordo}`, color: quante === n ? C.oro : C.fioco,
          }}>{n}</button>
        ))}
      </div>

      {!caricamento && oltre.length > 0 && (
        <Card colore={C.rosso} style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>⛔</span>
            <b style={{ fontSize: 13, color: C.rosso, fontFamily: F.sans }}>
              {oltre.length === 1 ? 'Una partita votata resta fuori' : `${oltre.length} partite votate restano fuori`}
            </b>
          </div>
          <div style={{ fontSize: 12, color: C.fioco, fontFamily: F.sans, marginBottom: 8, lineHeight: 1.5 }}>
            Giocano dopo martedì {gm(limite)}: il voto non le fa entrare in questa spin.
            Torneranno candidate da sole nel weekend giusto.
          </div>
          {oltre.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontFamily: F.mono, fontSize: 12, borderTop: `1px solid ${C.bordoTenue}` }}>
              <span style={{ color: C.oro, flexShrink: 0 }}>{'★'.repeat(votiDi(p.id))}</span>
              <span style={{ color: C.testo, fontFamily: F.sans, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.casa} – {p.trasferta}</span>
              <b style={{ color: C.rosso, flexShrink: 0 }}>{giorno(p.data)}</b>
            </div>
          ))}
        </Card>
      )}

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      {/* Le spin una accanto all'altra; su schermo stretto vanno a capo. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: 16 }}>
      {!caricamento && automatiche.map((auto, i) => (
        <Card key={i} style={{ padding: '14px' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.oro, fontFamily: F.sans, letterSpacing: 2, marginBottom: 12 }}>SPIN {i + 1}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Griglia titolo="Automatica" colore={C.spento} celle={auto} votiDi={votiDi} indice={i} piena={piene[i]} onFatto={leggiGriglia}
              spiegazione={<>Le più attendibili in ordine: la prima al <b style={{ color: C.menta }}>centro</b>, le 4 dopo agli <b style={{ color: C.oroChiaro }}>angoli</b>, le ultime 4 ai <b style={{ color: C.celeste }}>lati</b>.</>} />
            <Griglia titolo="Con le stelline" colore={C.oro} celle={votate[i]} riferimento={auto} votiDi={votiDi} indice={i} piena={piene[i]} onFatto={leggiGriglia}
              onClicCasella={pos => setCasella({ spin: i, pos })}
              altrove={altrove(i)}
              onPerQuota={() => setPerQuota(i)}
              onRipristina={Object.keys(aMano).some(k => k.startsWith(`${i}|`))
                ? () => setAMano(v => Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith(`${i}|`))))
                : undefined}
              spiegazione={<><b style={{ color: C.oro }}>Solo le partite votate</b>, nessun riempitivo: se i voti non bastano le caselle restano vuote. Ordine per stelline, a parità per attendibilità; una votata entra <b style={{ color: C.testo }}>anche se sotto soglia</b>, ma <b style={{ color: C.rosso }}>mai oltre martedì</b>. In <b style={{ color: C.viola }}>violetto</b> le caselle diverse dall'automatica.</>} />
          </div>
        </Card>
      ))}
      </div>

      {casella && (
        <ScegliCasella
          pos={casella.pos}
          partite={ordinate}
          votiDi={votiDi}
          usate={votate[casella.spin].filter(c => c.pos !== casella.pos && c.partita).map(c => c.partita.id)}
          altrove={altrove(casella.spin)}
          onScegli={p => { setAMano(v => ({ ...v, [`${casella.spin}|${casella.pos}`]: p })); setCasella(null) }}
          onSvuota={() => { setAMano(v => ({ ...v, [`${casella.spin}|${casella.pos}`]: null })); setCasella(null) }}
          onChiudi={() => setCasella(null)}
        />
      )}

      {perQuota !== null && (() => {
        const vuote = votate[perQuota].filter(c => !c.partita)
        const usate = votate.flat().filter(c => c.partita).map(c => c.partita.id)
        return (
          <CompilaPerQuota
            /* Pescava da tutte le future: il limite non lo vedeva, e si
               riempiva una casella con una partita di tre settimane dopo. */
            partite={righe.filter(r => r.data <= limite)}
            daRiempire={vuote.length}
            usate={usate}
            onChiudi={() => setPerQuota(null)}
            onCompila={scelte => {
              // Solo le caselle vuote, nell'ordine delle posizioni: le scelte
              // già fatte a mano e le votate non si toccano.
              const nuove = {}
              vuote.forEach((c, i) => { if (scelte[i]) nuove[`${perQuota}|${c.pos}`] = scelte[i] })
              setAMano(v => ({ ...v, ...nuove }))
              setPerQuota(null)
            }}
          />
        )
      })()}

      {!caricamento && (
        <Card style={{ marginTop: 16, padding: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.oro, fontFamily: F.sans, letterSpacing: 2, marginBottom: 8 }}>LE VOTATE</div>
          {votateTutte.length === 0
            ? <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans }}>Nessuna partita con stelline: si votano dalla pagina Partite.</div>
            : votateTutte.map(p => {
              const cat = categoria(p.probGiocata, SOGLIE_DEFAULT), colore = CATEGORIE[cat].colore
              const dove = doveSta(p.id)
              return (
                /* Due righe: in una sola, fra stelline, data, nome, giocata,
                   quota e "spin 1 · pos 9", l'ultima usciva dallo schermo. */
                <div key={p.id} style={{ padding: '8px 0', borderTop: `1px solid ${C.bordoTenue}`, fontFamily: F.mono, fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.oro, flexShrink: 0 }}>{'★'.repeat(votiDi(p.id))}</span>
                    <span style={{ color: C.testo, fontFamily: F.sans, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.casa} – {p.trasferta}</span>
                    <b style={{ color: colore, flexShrink: 0 }}>{pronosticoDa(p.giocata)}</b>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, fontSize: 11, color: C.spento }}>
                    <span style={{ flexShrink: 0 }}>{sigla(p.div)} · {giorno(p.data)}</span>
                    <span style={{ flexShrink: 0 }}>{p.quotaGiocata ? `@${p.quotaGiocata.toFixed(2)}` : 'sul book'}</span>
                    <b style={{ color: colore, flexShrink: 0 }}>{pct(p.probGiocata)}</b>
                    <span style={{ marginLeft: 'auto', textAlign: 'right', color: dove ? C.verde : p.data > limite ? C.rosso : C.fantasma, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dove ? `spin ${dove.spin} · pos ${dove.pos}` : p.data > limite ? '⛔ oltre martedì' : cat === 'no' ? 'sotto soglia' : 'non entra'}
                    </span>
                  </div>
                </div>
              )
            })}
        </Card>
      )}
    </div>
  )
}
