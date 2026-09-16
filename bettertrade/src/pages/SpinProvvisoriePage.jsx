import { useState, useMemo } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { C, F, alpha } from '../theme'
import { Card, Etichetta } from '../components/ui'
import { CATEGORIE, pct, giorno } from '../components/RigaPartita'
import { categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { candidate, componi, conStelline, DISPOSIZIONE } from '../lib/spin'

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
      borderRadius: 10, padding: '7px 6px', minHeight: 78, textAlign: 'center', fontFamily: F.mono,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.spento }}>
        <span>{pos}</span>
        {voti > 0 && <span style={{ color: C.oro }}>{'★'.repeat(voti)}</span>}
      </div>
      {partita ? (
        <>
          <div style={{ fontSize: 10, color: C.testo, fontFamily: F.sans, fontWeight: 600, lineHeight: 1.25, marginTop: 2 }}>{partita.casa}<br /><span style={{ color: C.spento }}>{partita.trasferta}</span></div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colore, marginTop: 4 }}>{partita.giocata}</div>
          <div style={{ fontSize: 9, color: C.spento }}>
            {partita.quotaGiocata ? `@${partita.quotaGiocata.toFixed(2)}` : 'quota sul book'} · {pct(partita.probGiocata)}
          </div>
          <div style={{ fontSize: 9, color: C.fantasma }}>{partita.div} · {giorno(partita.data)}</div>
        </>
      ) : <div style={{ fontSize: 10, color: C.fantasma, marginTop: 20 }}>—</div>}
    </div>
  )
}

function Griglia({ titolo, colore, celle, riferimento, votiDi }) {
  const diverse = riferimento ? celle.filter(c => c.partita?.id !== riferimento.find(r => r.pos === c.pos)?.partita?.id).length : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <Etichetta colore={colore}>{titolo}</Etichetta>
        {riferimento && <span style={{ fontSize: 10, fontFamily: F.mono, color: diverse ? C.oro : C.fantasma }}>{diverse ? `${diverse} celle diverse` : 'uguale all\'automatica'}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {DISPOSIZIONE.flat().map(pos => {
          const c = celle.find(c => c.pos === pos)
          const rif = riferimento?.find(r => r.pos === pos)
          return <Cella key={pos} pos={pos} partita={c.partita} votiDi={votiDi} diversa={!!riferimento && c.partita?.id !== rif?.partita?.id} />
        })}
      </div>
    </div>
  )
}

export default function SpinProvvisoriePage() {
  const { righe, votiDi, caricamento, errore } = usaProssime()
  const [quante, setQuante] = useState(2)

  const ordinate = useMemo(() => candidate(righe), [righe])
  const automatiche = useMemo(() => componi(ordinate, quante), [ordinate, quante])
  const votate = useMemo(() => componi(conStelline(ordinate, votiDi), quante), [ordinate, quante, votiDi])
  const nVotate = ordinate.filter(p => votiDi(p.id) > 0).length
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
            <Griglia titolo="Automatica · per attendibilità" colore={C.spento} celle={auto} votiDi={votiDi} />
            <Griglia titolo="Con le stelline · le votate prima" colore={C.oro} celle={votate[i]} riferimento={auto} votiDi={votiDi} />
          </div>
        </Card>
      ))}
      </div>
    </div>
  )
}
