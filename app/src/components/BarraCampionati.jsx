import { C, F, S, SP, alpha } from '../theme'
import { bordoDestro } from '../lib/layout'
import { sigla, etichetta } from '../lib/campionati'

// 🏴 LA BARRA DEI CAMPIONATI — l'indice fisso sul bordo destro delle Partite.
//
// Mattia, 22/10/2026: *"la voglio sulla destra fissa che mentre scorro rimane
// lì sempre visibile e non si muove mai"*.
//
// ⚠️⚠️ **Filtra, non salta.** Un indice che porta a un punto della lista
// vorrebbe dire raggrupparla per campionato, e la lista di Partite è ordinata
// per voto (o attendibilità, o quota) **attraverso tutte le leghe**: è il
// motivo per cui esiste. Raggrupparla avrebbe tolto quello per far funzionare
// la barra. Quindi la barra accende lo **stesso filtro** della tendina dentro
// il pannello — che resta e continua a funzionare — e lo porta a un tocco
// invece che a quattro.
//
// ⚠️ **I numeri vengono da tutti gli altri filtri già applicati**: se hai
// chiesto quota ≥ 2, `ITA1 3` vuol dire *tre partite che passano anche il tuo
// filtro*, non tre partite in Serie A. Un conteggio che ignora i filtri
// accesi è un numero che mente a chi lo legge.
//
// ⚠️ **Le leghe a zero restano, spente**: sparendo farebbero saltare in su
// tutte quelle sotto a ogni tocco di una manopola, e il bersaglio cambierebbe
// posto sotto il dito. È la stessa regola del *"niente cambia altezza quando
// arriva un dato"*.

/** ⚠️ La legge anche la pagina, che si riserva questo spazio a destra: se i
 *  due numeri si allontanano la barra finisce sopra le righe. */
export const LARGHEZZA_BARRA = 40

export default function BarraCampionati({ campionati, conteggi, attivo, totale, onScegli }) {
  const voci = [
    { div: '', testo: 'TUTTI', titolo: 'tutti i campionati', n: totale },
    ...campionati.map(([div, nome]) => ({ div, testo: sigla(div), titolo: etichetta(div, nome), n: conteggi.get(div) ?? 0 })),
  ]
  return (
    <div style={{
      // ⚠️ `fixed` e non `sticky`: è la richiesta — non si muove **mai**,
      // nemmeno quando la pagina finisce. ⚠️ Fra le due barre: sotto la
      // testata appiccicata, sopra la tab bar — le stesse due variabili che
      // usano il menu e il foglio della scheda, così resta d'accordo con loro
      // anche quando una delle due cambia altezza (ed è appena successo).
      position: 'fixed', top: 'var(--barra-alta)', bottom: 'var(--barra-bassa)',
      // ⚠️ Ancorata al bordo della **colonna**, non della finestra: su un
      // portatile, attaccata allo schermo, starebbe a un palmo dalla lista che
      // filtra. Stesso conto del menu.
      right: bordoDestro(0), width: LARGHEZZA_BARRA,
      // ⚠️ `zIndex` sotto la testata (50) e sotto il menu (60/70): la barra è
      // uno strumento della pagina, non qualcosa che copre quello che la apre.
      zIndex: 40,
      background: C.barra, borderLeft: `1px solid ${C.bordoRiga}`,
      display: 'flex', flexDirection: 'column',
      // ⚠️ Scorre per conto suo se i campionati non ci stanno (sono quindici),
      // e `contain` impedisce che arrivata in fondo si metta a scorrere la
      // pagina sotto — il gesto partirebbe sulla barra e finirebbe altrove.
      overflowY: 'auto', overscrollBehavior: 'contain',
    }}>
      {/* ⚠️⚠️ **Centrata in altezza con `margin: auto 0`, non con
          `justifyContent: center`** (Mattia, 22/10/2026: *"ora è tutta in
          cima su iOS, la vorrei al centro, con lo stesso spazio sopra e
          sotto"*). Sembrano la stessa cosa e non lo sono: quando le voci
          diventano più alte del contenitore, `center` **taglia quelle in
          cima** e non si riesce più a raggiungerle scorrendo, perché
          l'eccedenza finisce prima del punto di partenza. Il margine
          automatico invece si annulla da sé appena lo spazio finisce, e la
          barra torna a scorrere normalmente. */}
      <div style={{ margin: 'auto 0', width: '100%' }}>
      {voci.map((v, i) => {
        const on = attivo === v.div
        const vuoto = v.n === 0
        // ⚠️ L'ultima non porta la riga sotto: finché la barra partiva dalla
        // testata quel tratto moriva contro la tab bar e non si vedeva, ma da
        // centrata resta appeso nel vuoto.
        const ultima = i === voci.length - 1
        return (
          <button key={v.div || 'tutti'} onClick={() => onScegli(v.div)} disabled={vuoto && !on} title={v.titolo}
            style={{
              padding: `${SP.s}px 0 ${SP.xs}px`, background: on ? alpha(C.oro, 0.16) : 'transparent',
              border: 'none', borderBottom: ultima ? 'none' : `1px solid ${C.bordoTenue}`,
              // ⚠️ La riga d'oro **a destra e sempre presente**, trasparente da
              // spenta: comparendo solo da accesa sposterebbe di 2px il testo
              // di tutte le altre a ogni tocco. Stessa cura della tab bar.
              borderRight: `2px solid ${on ? C.oro : 'transparent'}`,
              cursor: vuoto && !on ? 'default' : 'pointer', opacity: vuoto && !on ? 0.3 : 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              fontFamily: F.mono, lineHeight: 1.1,
            }}>
            <span style={{ fontSize: S.micro, letterSpacing: 0.5, color: on ? C.oro : C.blu }}>{v.testo}</span>
            <span style={{ fontSize: S.micro, color: on ? C.testo : C.fioco }}>{v.n}</span>
          </button>
        )
      })}
      </div>
    </div>
  )
}
