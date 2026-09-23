import { C, F, alpha } from '../theme'
import { Card } from './ui'
import TestataPartita, { CATEGORIE, Stella, pct, giorno } from './TestataPartita'
import { pronosticoDa } from '../lib/spin'

// Una partita nella lista: la stessa testata della scheda, in versione
// compatta, più la barra con la giocata. Al tocco si apre la scheda completa
// (components/DettaglioPartita.jsx).

export { CATEGORIE, pct, giorno }

export default function RigaPartita({ p, cat, voti = 0, mio = false, puoVotare = false, onVota, onApri }) {
  const c = CATEGORIE[cat]
  const quota = p.quotaGiocata ?? p.quota
  return (
    <Card style={{ padding: '10px 12px', borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined, cursor: 'pointer' }} onClick={onApri}>
      {/* la riga dei contrassegni: campionato, categoria, e il voto — che si
          deve poter dare dalla lista, senza aprire la partita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{p.div}</span>
          {cat !== 'no' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
        </div>
        <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={onVota} />
      </div>

      <TestataPartita p={p} cat={cat} compatta />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, padding: '8px 10px',
        background: alpha(c.colore, 0.07), border: `1px solid ${alpha(c.colore, 0.28)}`, borderRadius: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: F.mono, color: c.colore, whiteSpace: 'nowrap' }}>{pronosticoDa(p.giocata)}</div>
        {/* Per la combinata con l'over non abbiamo la quota (nessuna fonte dà
            l'over 1,5): si mostra quella del segno secco, e si dice che l'over
            va letto sul book. */}
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: F.mono, color: C.oro, lineHeight: 1 }}>
            {quota ? <><span style={{ fontSize: 11, color: C.spento, fontWeight: 400 }}>Q: </span>{quota.toFixed(2).replace('.', ',')}</> : '—'}
          </div>
          <div style={{ fontSize: 9, fontFamily: F.mono, color: C.spento, marginTop: 3 }}>
            {p.quotaFonte}{!p.quotaGiocata && p.quota ? ` · ${p.segno} secco, l'over sul book` : ''}
          </div>
        </div>
      </div>
    </Card>
  )
}
