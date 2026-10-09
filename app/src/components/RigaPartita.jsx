import { C, F, alpha } from '../theme'
import { Card } from './ui'
import TestataPartita, { CATEGORIE, Stella, pct, giorno } from './TestataPartita'
import { pronosticoDa } from '../lib/spin'
import { verso } from '../lib/vpm'
import { sigla } from '../lib/campionati'

// Una partita nella lista: la stessa testata della scheda, in versione
// compatta, più la barra con la giocata. Al tocco si apre la scheda completa
// (components/DettaglioPartita.jsx).

export { CATEGORIE, pct, giorno }

// Il colore di VPM dice da sé se il campo è d'accordo con la giocata: rosso
// contro, verde conferma, grigio non si pronuncia. La barra si deve leggere
// senza leggere i numeri.
const COLORE_VPM = { contro: C.rosso, conferma: C.verde, neutro: C.fioco }

export default function RigaPartita({ p, cat, vpm = null, voti = 0, mio = false, puoVotare = false, onVota, onApri }) {
  const c = CATEGORIE[cat]
  const quota = p.quotaGiocata ?? p.quota
  const vsVpm = verso(vpm)
  return (
    /* ⚠️ `borderRadius: 0` qui e non nel `Card` di ui.jsx: quello lo usano
       anche Dashboard, Bilancio e Reporting, e là gli angoli restano tondi. */
    <Card style={{ padding: '10px 12px', borderRadius: 0, borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined, cursor: 'pointer' }} onClick={onApri}>
      {/* la riga dei contrassegni: campionato, categoria, e il voto — che si
          deve poter dare dalla lista, senza aprire la partita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{sigla(p.div)}</span>
          {cat !== 'no' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
        </div>
        <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
      </div>

      <TestataPartita p={p} cat={cat} compatta />

      {/* Quattro colonne **uguali**, ogni numero centrato nella sua: prima la
          giocata stava a sinistra e la quota a destra, con larghezze diverse, e
          scorrendo la lista i numeri ballavano da una riga all'altra.
          Ogni colonna ha la sua etichetta sotto, anche la giocata: senza, quella
          colonna sarebbe l'unica più alta e la fila si vedrebbe storta. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', alignItems: 'start', gap: 6, marginTop: 10, padding: '8px 6px',
        background: alpha(c.colore, 0.07), border: `1px solid ${alpha(c.colore, 0.28)}`, borderRadius: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 800, fontFamily: F.mono, color: c.colore, lineHeight: 1, whiteSpace: 'nowrap' }}>{pronosticoDa(p.giocata)}</div>
          <div style={{ fontSize: 8, fontFamily: F.mono, color: C.spento, letterSpacing: '0.1em', marginTop: 3 }}>GIOCATA</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: C.testo, lineHeight: 1 }}>
            {p.grado != null ? p.grado.toFixed(2).replace('.', ',') : '—'}
          </div>
          <div style={{ fontSize: 8, fontFamily: F.mono, color: C.spento, letterSpacing: '0.1em', marginTop: 3 }}>GRADO</div>
        </div>

        {/* VPM: quanto il campo conferma la giocata. Lo spazio è riservato
            anche quando il dato non c'è — niente deve cambiare altezza o
            larghezza quando arriva un numero. */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: COLORE_VPM[vsVpm] || C.fantasma, lineHeight: 1 }}>
            {vpm != null ? vpm.toFixed(2).replace('.', ',') : '—'}
          </div>
          <div style={{ fontSize: 8, fontFamily: F.mono, color: vsVpm === 'neutro' || !vsVpm ? C.spento : COLORE_VPM[vsVpm], letterSpacing: '0.1em', marginTop: 3 }}>VPM</div>
        </div>

        {/* Per la combinata con l'over non abbiamo la quota (nessuna fonte dà
            l'over 1,5): si mostra quella del segno secco, e si dice che l'over
            va letto sul book. */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: C.oro, lineHeight: 1 }}>
            {quota ? quota.toFixed(2).replace('.', ',') : '—'}
          </div>
          {/* ⚠️ Una riga sola: con quattro colonne uguali lo spazio è un quarto
              della card, e questa scritta andando a capo allungherebbe solo
              alcune righe — lista irregolare. La fonte sta nella scheda. */}
          <div style={{ fontSize: 8, fontFamily: F.mono, color: C.spento, letterSpacing: '0.1em', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {!p.quotaGiocata && p.quota ? `${p.segno} SECCO` : 'QUOTA'}
          </div>
        </div>
      </div>
    </Card>
  )
}
