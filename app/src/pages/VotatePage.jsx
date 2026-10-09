import { useState, useMemo } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { useAuth } from '../context/AuthContext'
import { C, F } from '../theme'
import { Card, Etichetta } from '../components/ui'
import RigaPartita, { CATEGORIE } from '../components/RigaPartita'
import SchedaScorrevole from '../components/SchedaScorrevole'
import DettaglioPartita from '../components/DettaglioPartita'
import { categoria, SOGLIE_DEFAULT } from '../lib/attendibilita'
import { valutaPartita } from '../lib/vpm'

// Le partite che qualcuno ha votato con la stellina, tutte in un posto.
//
// Non duplica niente: la riga è `RigaPartita`, la scheda `DettaglioPartita`,
// i dati l'hook `usaProssime` — gli stessi della pagina Partite. Qui c'è solo
// il filtro e l'ordine.
//
// ⚠️ "Voto" = la stellina delle persone. Il numero calcolato è il **Grado**.

export default function VotatePage() {
  const { isAdmin } = useAuth()
  const { righe, vota, votiDi, mioVoto, caricamento, errore } = usaProssime()
  const datiVpm = usaVpm()
  const [apertaId, setApertaId] = useState(null)

  // Prima le più votate, poi per attendibilità: lo stesso ordine con cui
  // entrano nelle spin (vedi `conStelline` in lib/spin.js).
  const votate = useMemo(
    () => righe.filter(r => votiDi(r.id) > 0).sort((a, b) => votiDi(b.id) - votiDi(a.id) || b.probGiocata - a.probGiocata),
    [righe, votiDi])

  const aperta = righe.find(r => r.id === apertaId)


  const conteggi = votate.reduce((c, r) => { const k = categoria(r.probGiocata, SOGLIE_DEFAULT); if (k !== 'no') c[k]++; else c.fuori++; return c },
    { centro: 0, giallo: 0, blu: 0, fuori: 0 })

  return (
    <div style={{ padding: 16 }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>VOTATE</Etichetta>
      <div style={{ fontSize: 20, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Le partite con la stellina</div>
      <div style={{ fontSize: 12, color: C.spento, fontFamily: F.sans, marginBottom: 14, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : <>
          {votate.length} partite votate ·{' '}
          <span style={{ color: CATEGORIE.centro.colore }}>{conteggi.centro} centro</span> ·{' '}
          <span style={{ color: CATEGORIE.giallo.colore }}>{conteggi.giallo} gialle</span> ·{' '}
          <span style={{ color: CATEGORIE.blu.colore }}>{conteggi.blu} blu</span>
          {conteggi.fuori > 0 && <> · <span style={{ color: C.ambra }}>{conteggi.fuori} sotto soglia</span></>}
          <div style={{ marginTop: 4 }}>Una partita votata entra nella spin comunque, anche sotto soglia o oltre la finestra.</div>
        </>}
      </div>

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: 13, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      {!caricamento && votate.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
          Nessuna partita votata. La stellina si tocca dalla pagina <b style={{ color: C.testo }}>Partite</b>,
          sulla riga o dentro la scheda: serve a dire "questa la voglio", e la porta dentro la spin
          scavalcando il criterio automatico.
        </div></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {votate.map(p => (
          <RigaPartita key={p.id} p={p} cat={categoria(p.probGiocata, SOGLIE_DEFAULT)}
            /* lo stesso numero della pagina Partite: due liste con VPM diversi
               sulla stessa partita sarebbero un difetto */
            vpm={datiVpm ? valutaPartita(datiVpm, p) : null}
            voti={votiDi(p.id)} mio={mioVoto(p.id)} puoVotare={isAdmin} onVota={() => vota(p.id)}
            onApri={() => setApertaId(p.id)} />
        ))}
      </div>

      {aperta && (
        <SchedaScorrevole onChiudi={() => setApertaId(null)}>
          <DettaglioPartita p={aperta} cat={categoria(aperta.probGiocata, SOGLIE_DEFAULT)}
            voti={votiDi(aperta.id)} mio={mioVoto(aperta.id)} puoVotare={isAdmin}
            onVota={() => vota(aperta.id)} onChiudi={() => setApertaId(null)} />
        </SchedaScorrevole>
      )}
    </div>
  )
}
