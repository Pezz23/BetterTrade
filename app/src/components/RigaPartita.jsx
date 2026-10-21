import { memo } from 'react'
import { C, F, alpha, S, SP, R } from '../theme'
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
    /* ⚠️⚠️ **Il bordo si scrive INTERO, e questa riga ha nascosto un difetto
       per settimane** (21/10/2026). Prima era
       `borderColor: cat !== 'no' ? alpha(…) : undefined`, e il ramo
       `undefined` non vuol dire *"lascia il bordo che ha `Card`"*: React
       **cancella la longhand** dalla scorciatoia già impostata, e un bordo
       senza colore cade su `currentColor` — cioè `C.testo`, **bianco**.
       Misurato nel browser: `border-width: 1px; border-style: solid;` e
       nessun `border-color`, quindi **56 righe su 67 avevano il bordo
       bianco**. Era quello il reticolo da gestionale, e non l'aveva scelto
       nessuno. **Una proprietà a `undefined` non è una proprietà assente.**
       ⚠️ E gli angoli tornano tondi come tutto il resto: squadrati erano
       l'altra metà di quell'effetto. */
    <Card style={{ padding: `${SP.m}px ${SP.l}px`, borderRadius: R.g,
      border: `1px solid ${cat !== 'no' ? alpha(c.colore, 0.35) : C.bordo}`,
      cursor: 'pointer' }} onClick={() => onApri?.(p.id)}>
      {/* la riga dei contrassegni: campionato, categoria, e il voto — che si
          deve poter dare dalla lista, senza aprire la partita */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: SP.m, marginBottom: SP.m }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP.s }}>
          <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: R.pastiglia, background: alpha(C.bluPieno, 0.12), color: C.blu }}>{sigla(p.div)}</span>
          {cat !== 'no' && <span style={{ fontSize: S.minuta, fontWeight: 700, fontFamily: F.mono, padding: '2px 8px', borderRadius: R.pastiglia, background: alpha(c.colore, 0.15), color: c.colore, textTransform: 'uppercase' }}>{c.nome}</span>}
        </div>
        <Stella voti={voti} mio={mio} puoVotare={puoVotare} onVota={() => onVota?.(p.id)} />
      </div>

      <TestataPartita p={p} cat={cat} compatta />

      <div style={{ marginTop: SP.m }}>
        <BarraPartita p={p} vpm={vpm} colore={c.colore} />
      </div>
    </Card>
  )
}

export default memo(RigaPartita)
