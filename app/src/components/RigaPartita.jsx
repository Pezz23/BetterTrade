import { memo } from 'react'
import { C, F, alpha, S } from '../theme'
import { Card } from './ui'
import TestataPartita, { CATEGORIE, Stella, pct, giorno } from './TestataPartita'
import BarraPartita from './BarraPartita'
import { sigla } from '../lib/campionati'

// Una partita nella lista: la stessa testata della scheda, in versione
// compatta, più la barra con la giocata. Al tocco si apre la scheda completa
// (components/DettaglioPartita.jsx).

export { CATEGORIE, pct, giorno }

/**
 * ⚠️⚠️ **`memo`, e `onVota`/`onApri` prendono l'id.** Le due cose vanno
 * insieme: finché la pagina passava `onApri={() => apri(p.id)}` costruiva una
 * funzione nuova a ogni ridisegno, quindi la riga aveva sempre una proprietà
 * diversa e si ridisegnava comunque — con 67 partite sono ~270 componenti
 * (riga, testata, barra, stellina) rifatti **a ogni tasto premuto** in un campo
 * dei filtri. Passando l'id, le funzioni restano le stesse e `memo` salta le
 * righe che non sono cambiate.
 * ⚠️ Perché funzioni, le altre proprietà devono essere **valori o riferimenti
 * stabili**: `cat` è una stringa, `voti` un numero, `vpm` l'oggetto che vive
 * nella mappa `vpmDi`. Basta che una torni a essere costruita qui dentro e il
 * `memo` smette di servire, in silenzio.
 */
function RigaPartita({ p, cat, vpm = null, voti = 0, mio = false, puoVotare = false, onVota, onApri }) {
  const c = CATEGORIE[cat]
  return (
    /* ⚠️ `borderRadius: 0` qui e non nel `Card` di ui.jsx: quello lo usano
       anche Dashboard, Bilancio e Reporting, e là gli angoli restano tondi. */
    <Card style={{ padding: '10px 12px', borderRadius: 0, borderColor: cat !== 'no' ? alpha(c.colore, 0.35) : undefined, cursor: 'pointer' }} onClick={() => onApri?.(p.id)}>
      {/* la riga dei contrassegni: campionato, categoria, e il voto — che si
          deve poter dare dalla lista, senza aprire la partita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{sigla(p.div)}</span>
          {cat !== 'no' && <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: 20, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
        </div>
        <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={() => onVota?.(p.id)} />
      </div>

      <TestataPartita p={p} cat={cat} compatta />

      <div style={{ marginTop: 10 }}>
        <BarraPartita p={p} vpm={vpm} colore={c.colore} />
      </div>
    </Card>
  )
}

export default memo(RigaPartita)
