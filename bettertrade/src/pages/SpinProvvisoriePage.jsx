import { useState, useMemo, useEffect } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { C, F, alpha } from '../theme'
import { Card, Etichetta, Btn } from '../components/ui'
import { CATEGORIE, pct, giorno } from '../components/RigaPartita'
import { categoria, SOGLIE_DEFAULT, lunediProssimo } from '../lib/attendibilita'
import { candidate, componi, conStelline, compilaSpin, spinPiena, pronosticoDa, DISPOSIZIONE } from '../lib/spin'
import { supabase } from '../supabase'

// L'anteprima delle spin compilate da sole, dalla lista delle partite della
// settimana. Per ogni spin due griglie: quella automatica (solo attendibilità)
// e quella con le stelline (le votate prima). Le celle in cui le due
// differiscono si accendono. La logica è in lib/spin.js.

const SPIN = [1, 2, 3, 4]

function Cella({ pos, partita, votiDi, diversa }) {
  const cat = partita ? categoria(partita.probGiocata, SOGLIE_DEFAULT) : 'no'
  const colore = CATEGORIE[cat].colore
  const voti = partita ? votiDi(partita.id) : 0
  return (
    <div style={{
      background: alpha(colore, partita ? 0.10 : 0.03), border: `2px solid ${diversa ? C.oro : alpha(colore, partita ? 0.4 : 0.15)}`,
      boxShadow: diversa ? `0 0 10px ${alpha(C.oro, 0.35)}` : 'none',
      borderRadius: 10, padding: '8px 6px', height: 124, textAlign: 'center', fontFamily: F.mono,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.spento, lineHeight: 1 }}>
        <span>{pos}</span>
        {voti > 0 && <span style={{ color: C.oro }}>{'★'.repeat(voti)}</span>}
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
          <div style={{ fontSize: 10, color: C.fantasma, whiteSpace: 'nowrap' }}>{partita.div} · {giorno(partita.data)}</div>
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

function Griglia({ titolo, colore, celle, riferimento, votiDi, indice, piena, onFatto }) {
  const diverse = riferimento ? celle.filter(c => c.partita?.id !== riferimento.find(r => r.pos === c.pos)?.partita?.id).length : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Etichetta colore={colore} style={{ fontSize: 12 }}>{titolo}</Etichetta>
        {riferimento && <span style={{ fontSize: 11, fontFamily: F.mono, color: diverse ? C.oro : C.fantasma }}>{diverse ? `${diverse} celle diverse` : 'uguale all\'automatica'}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {DISPOSIZIONE.flat().map(pos => {
          const c = celle.find(c => c.pos === pos)
          const rif = riferimento?.find(r => r.pos === pos)
          return <Cella key={pos} pos={pos} partita={c.partita} votiDi={votiDi} diversa={!!riferimento && c.partita?.id !== rif?.partita?.id} />
        })}
      </div>
      <Compila indice={indice} celle={celle} piena={piena} onFatto={onFatto} />
    </div>
  )
}

export default function SpinProvvisoriePage() {
  const { righe, votiDi, caricamento, errore } = usaProssime()
  const [quante, setQuante] = useState(2)
  // Quali spin della griglia hanno già qualcosa dentro: per la conferma.
  const [piene, setPiene] = useState([false, false, false, false])
  async function leggiGriglia() {
    const { data } = await supabase.from('griglia').select('spins').eq('id', 1).single()
    setPiene([0, 1, 2, 3].map(i => spinPiena(data?.spins?.[i])))
  }
  useEffect(() => { leggiGriglia() }, [])

  const ordinate = useMemo(() => candidate(righe), [righe])
  const automatiche = useMemo(() => componi(ordinate, quante), [ordinate, quante])
  const votate = useMemo(() => componi(conStelline(ordinate, votiDi), quante), [ordinate, quante, votiDi])
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
          {ordinate.length} partite sopra soglia fino a lunedì, {nVotate} con stelline.
          {ordinate.length < servono && <span style={{ color: C.ambra }}> Per {quante} spin ne servono {servono}: le ultime restano a metà.</span>}
        </>}
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

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      {/* Le spin una accanto all'altra; su schermo stretto vanno a capo. */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))`, gap: 16 }}>
      {!caricamento && automatiche.map((auto, i) => (
        <Card key={i} style={{ padding: '14px' }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.oro, fontFamily: F.sans, letterSpacing: 2, marginBottom: 12 }}>SPIN {i + 1}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Griglia titolo="Automatica · per attendibilità" colore={C.spento} celle={auto} votiDi={votiDi} indice={i} piena={piene[i]} onFatto={leggiGriglia} />
            <Griglia titolo="Con le stelline · le votate prima" colore={C.oro} celle={votate[i]} riferimento={auto} votiDi={votiDi} indice={i} piena={piene[i]} onFatto={leggiGriglia} />
          </div>
        </Card>
      ))}
      </div>

      {!caricamento && (
        <Card style={{ marginTop: 16, padding: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.oro, fontFamily: F.sans, letterSpacing: 2, marginBottom: 8 }}>LE VOTATE</div>
          {votateTutte.length === 0
            ? <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans }}>Nessuna partita con stelline: si votano dalla pagina Partite.</div>
            : votateTutte.map(p => {
              const cat = categoria(p.probGiocata, SOGLIE_DEFAULT), colore = CATEGORIE[cat].colore
              const dove = doveSta(p.id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderTop: `1px solid ${C.bordoTenue}`, fontFamily: F.mono, fontSize: 13 }}>
                  <span style={{ color: C.oro, minWidth: 40 }}>{'★'.repeat(votiDi(p.id))}</span>
                  <span style={{ color: C.spento, minWidth: 90, fontSize: 12 }}>{p.div} · {giorno(p.data)}</span>
                  <span style={{ color: C.testo, fontFamily: F.sans, fontWeight: 600, flex: 1, minWidth: 0 }}>{p.casa} – {p.trasferta}</span>
                  <b style={{ color: colore }}>{pronosticoDa(p.giocata)}</b>
                  <span style={{ color: C.spento, minWidth: 110, textAlign: 'right' }}>{p.quotaGiocata ? `@${p.quotaGiocata.toFixed(2)}` : 'sul book'} · <b style={{ color: colore }}>{pct(p.probGiocata)}</b></span>
                  <span style={{ color: dove ? C.verde : C.fantasma, minWidth: 90, textAlign: 'right', fontSize: 12 }}>{dove ? `spin ${dove.spin} · pos ${dove.pos}` : p.data > lunedi ? 'oltre lunedì' : cat === 'no' ? 'sotto soglia' : 'non entra'}</span>
                </div>
              )
            })}
        </Card>
      )}
    </div>
  )
}
