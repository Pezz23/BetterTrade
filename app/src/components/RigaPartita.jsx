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

// Il colore di VPM dice da sé se il campo è d'accordo col mercato: verde
// conferma, rosso contraddice, grigio non si pronuncia (squadre troppo simili).
// La barra si deve leggere senza leggere i numeri.
const COLORE_VPM = { contro: C.rosso, conferma: C.verde, incerto: C.fioco }

// Una colonna della barra: il valore in una fascia di altezza fissa, l'etichetta
// sotto, e la linea che la divide dalla precedente.
const ALTA_VALORE = 20

function Colonna({ valore, etichetta, colore, coloreEtichetta, divisore, dimensione = 17, primo = false }) {
  return (
    <div style={{
      textAlign: 'center', padding: '0 4px',
      borderLeft: primo ? 'none' : `1px solid ${alpha(divisore, 0.3)}`,
    }}>
      <div style={{
        height: ALTA_VALORE, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: dimensione, fontWeight: dimensione < 17 ? 800 : 700, fontFamily: F.mono, color: colore,
        lineHeight: 1, whiteSpace: 'nowrap',
      }}>{valore}</div>
      <div style={{ fontSize: 8, fontFamily: F.mono, color: coloreEtichetta || C.spento, letterSpacing: '0.1em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {etichetta}
      </div>
    </div>
  )
}

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

      {/* Quattro colonne **uguali**, divise da una linea, ogni valore centrato
          nella sua — in larghezza e in altezza. Prima la giocata stava a
          sinistra e la quota a destra con colonne di larghezze diverse, e
          scorrendo la lista i numeri ballavano da una riga all'altra.
          ⚠️ La fascia del valore ha **altezza fissa**: la giocata è scritta più
          piccola delle cifre (deve starci "1+O1,5"), e senza quell'altezza le
          quattro etichette sotto finirebbero a quote diverse. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 10, padding: '8px 0',
        background: alpha(c.colore, 0.07), border: `1px solid ${alpha(c.colore, 0.28)}`, borderRadius: 0 }}>
        <Colonna etichetta="GIOCATA" colore={c.colore} dimensione={15}
          valore={pronosticoDa(p.giocata)} divisore={c.colore} primo />

        <Colonna etichetta="GRADO" colore={C.testo} divisore={c.colore}
          valore={p.grado != null ? p.grado.toFixed(2).replace('.', ',') : '—'} />

        {/* VPM: il segno che dice il campo, e quanto è netto. Il segno sta
            davanti in piccolo — come la Q della quota — perché il numero da
            solo non dice **di chi** parla. Lo spazio è riservato anche quando
            il dato non c'è: niente deve cambiare misura quando arriva. */}
        <Colonna etichetta="VPM" colore={COLORE_VPM[vsVpm] || C.fantasma} divisore={c.colore}
          coloreEtichetta={vsVpm && vsVpm !== 'incerto' ? COLORE_VPM[vsVpm] : undefined}
          valore={vpm?.punti != null
            ? <><span style={{ fontSize: 11, fontWeight: 400, opacity: 0.75 }}>{vpm.segno} </span>{vpm.punti.toFixed(2).replace('.', ',')}</>
            : '—'} />

        {/* Per la combinata con l'over non abbiamo la quota (nessuna fonte dà
            l'over 1,5): si mostra quella del segno secco, e lo si dice sotto.
            Il nome del book sta nella scheda: in un quarto di card non ci sta. */}
        <Colonna etichetta={!p.quotaGiocata && p.quota ? `${p.segno} SECCO` : 'QUOTA'}
          colore={C.oro} divisore={c.colore}
          valore={quota ? quota.toFixed(2).replace('.', ',') : '—'} />
      </div>
    </Card>
  )
}
