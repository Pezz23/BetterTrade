import { usaPartitaAperta } from '../hooks/usaProssime'
import { chiudiVerso } from '../lib/indirizzi'
import { categoria } from '../lib/attendibilita'
import { C, F, S, R, alpha } from '../theme'
import SchedaScorrevole from './SchedaScorrevole'
import DettaglioPartita from './DettaglioPartita'

// LA SCHEDA DI UNA PARTITA APERTA DA UN INDIRIZZO (29/10/2026, lotto 2).
//
// La usano Partite (`/partite/:id`) e Votate (`/votate/:id`): stessa scheda,
// stesso modo di chiuderla, stesso trattamento del link scaduto. Scritta due
// volte, una delle due si sarebbe dimenticata del link scaduto.
// ⚠️ Chiudere — con la ‹, col gesto o col tasto indietro del telefono — torna
// alla `lista` (`chiudiVerso`): da un link mandato al gruppo, «indietro»
// porterebbe fuori dall'app.
// ⚠️ Una partita **passata** si apre lo stesso (scelta di Mattia): coi dati di
// allora, la scritta «già giocata» e il risultato se c'è. La stellina no:
// votare una partita finita non porta da nessuna parte.

export default function SchedaPartita({ id, righe, caricamento, lista, soglie, votiTipiDi, mioVoto, vota }) {
  const { riga, passata, risultato, nonTrovata } = usaPartitaAperta(id, righe, caricamento)
  if (!id) return null
  const chiudi = () => chiudiVerso(lista)

  if (nonTrovata) return (
    <SchedaScorrevole onChiudi={chiudi}>
      <div style={{ padding: 16, fontFamily: F.sans, fontSize: S.media, color: C.spento, lineHeight: 1.6 }}>
        <button onClick={chiudi} style={{ background: 'transparent', border: 'none', color: C.spento, fontSize: S.titolo, cursor: 'pointer', padding: '0 4px 0 0' }}>‹</button>
        {' '}Questa partita non c&apos;è nel calendario: il link è sbagliato o incompleto.
      </div>
    </SchedaScorrevole>
  )
  if (!riga) return null

  return (
    <SchedaScorrevole onChiudi={chiudi}>
      {passata && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: R.m, background: alpha(C.ambra, 0.12),
          color: C.ambra, fontFamily: F.sans, fontSize: S.minuta, fontWeight: 700, letterSpacing: 1 }}>
          GIÀ GIOCATA · {risultato ? `finita ${risultato}` : 'il risultato non è ancora arrivato'}
          <span style={{ fontWeight: 400, letterSpacing: 0, color: C.spento }}> — i numeri sono quelli di prima della partita</span>
        </div>
      )}
      <DettaglioPartita p={riga} cat={categoria(riga.probGiocata, soglie)}
        voti={votiTipiDi(riga.id)} mio={mioVoto(riga.id)} puoVotare={!passata}
        onVota={() => vota(riga.id)} onChiudi={chiudi} />
    </SchedaScorrevole>
  )
}
