import { useMemo, useCallback } from 'react'
import { usaProssime } from '../hooks/usaProssime'
import { usaVpm } from '../hooks/usaVpm'
import { C, F, S } from '../theme'
import { Card, Etichetta } from '../components/ui'
import RigaPartita, { CATEGORIE } from '../components/RigaPartita'
import SchedaPartita from '../components/SchedaPartita'
import { vai } from '../lib/indirizzi'
import { usaPercorso } from '../hooks/usaPercorso'
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
  const { righe, vota, votiDi, votiTipiDi, mioVoto, caricamento, errore } = usaProssime()
  const datiVpm = usaVpm()
  // La partita aperta sta nell'indirizzo (`/votate/123`, lotto 2, 29/10/2026).
  const apertaId = usaPercorso().split('/')[2] || null
  const apri = useCallback(id => vai(`/votate/${id}`), [])

  // Prima le più votate, poi per attendibilità. (Era lo stesso ordine della
  // griglia "con le stelline" delle spin, che dal 24/10/2026 parte vuota.)
  const votate = useMemo(
    () => righe.filter(r => votiDi(r.id) > 0).sort((a, b) => votiDi(b.id) - votiDi(a.id) || b.probGiocata - a.probGiocata),
    [righe, votiDi])

  // ⚠️ VPM una volta per partita, come nella pagina Partite: nel `map` del JSX
  // girava a ogni ridisegno per ogni riga, ed è il calcolo più grosso dell'app.
  // ⚠️ Si calcola sulle **votate**, non su tutte le 67 future: qui l'elenco è
  // quello, e valutare il resto sarebbe lavoro che nessuno legge.
  const vpmDi = useMemo(() => {
    const m = new Map()
    if (datiVpm) for (const r of votate) m.set(r.id, valutaPartita(datiVpm, r))
    return m
  }, [datiVpm, votate])


  const conteggi = votate.reduce((c, r) => { const k = categoria(r.probGiocata, SOGLIE_DEFAULT); if (k !== 'no') c[k]++; else c.fuori++; return c },
    { centro: 0, giallo: 0, blu: 0, fuori: 0 })

  return (
    <div style={{ padding: 16 }}>
      <Etichetta colore={C.oro} style={{ letterSpacing: 4, marginBottom: 4 }}>VOTATE</Etichetta>
      <div style={{ fontSize: S.evidenza, fontWeight: 700, color: C.testo, fontFamily: F.sans, marginBottom: 4 }}>Le partite con la stellina</div>
      <div style={{ fontSize: S.corpo, color: C.spento, fontFamily: F.sans, marginBottom: 14, lineHeight: 1.6 }}>
        {caricamento ? 'Caricamento…' : <>
          {votate.length} partite votate ·{' '}
          <span style={{ color: CATEGORIE.centro.colore }}>{conteggi.centro} centro</span> ·{' '}
          <span style={{ color: CATEGORIE.giallo.colore }}>{conteggi.giallo} gialle</span> ·{' '}
          <span style={{ color: CATEGORIE.blu.colore }}>{conteggi.blu} blu</span>
          {conteggi.fuori > 0 && <> · <span style={{ color: C.ambra }}>{conteggi.fuori} sotto soglia</span></>}
          <div style={{ marginTop: 4 }}>Una partita votata entra nella spin comunque, anche sotto soglia o oltre la finestra.</div>
        </>}
      </div>

      {errore && <Card colore={C.rosso}><div style={{ color: C.rosso, fontSize: S.media, fontFamily: F.sans }}>⚠️ {errore}</div></Card>}

      {!caricamento && votate.length === 0 && (
        <Card><div style={{ fontSize: S.media, color: C.spento, fontFamily: F.sans, lineHeight: 1.7 }}>
          Nessuna partita votata. La stellina si tocca dalla pagina <b style={{ color: C.testo }}>Partite</b>,
          sulla riga o dentro la scheda: serve a dire "questa la voglio", e la porta dentro la spin
          scavalcando il criterio automatico.
        </div></Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {votate.map(p => (
          <RigaPartita key={p.id} p={p} cat={categoria(p.probGiocata, SOGLIE_DEFAULT)}
            /* lo stesso numero della pagina Partite: due liste con VPM diversi
               sulla stessa partita sarebbero un difetto.
               ⚠️ Dalla mappa e non calcolato qui: dentro il `map` del JSX
               girava a ogni ridisegno, per ogni riga. */
            vpm={vpmDi.get(p.id) ?? null}
            voti={votiTipiDi(p.id)} mio={mioVoto(p.id)} puoVotare onVota={vota}
            onApri={apri} />
        ))}
      </div>

      <SchedaPartita id={apertaId} righe={righe} caricamento={caricamento} lista="/votate" soglie={SOGLIE_DEFAULT}
        votiTipiDi={votiTipiDi} mioVoto={mioVoto} vota={vota} />
    </div>
  )
}
