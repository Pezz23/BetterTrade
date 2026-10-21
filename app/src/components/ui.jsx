// Pezzi di interfaccia ricorrenti.
//
// Prima stavano riscritti a mano in ogni pagina: la card grigia compariva 21
// volte, l'etichetta maiuscola 19. Non era un problema di righe risparmiate ma
// di coerenza — le copie divergevano (padding 14 o 16, bordi diversi) e
// cambiare l'aspetto significava rincorrerle tutte.

import { useRef, useEffect } from 'react'
import { C, F, alpha, S, SP, R } from '../theme'

// La card grigia standard: fondo, bordo, angoli tondi.
/**
 * ⚠️⚠️ **Lo stile della superficie, estratto dal componente** (21/10/2026).
 * `Card` resta il modo normale di fare un riquadro, ma sei pagine —
 * Dashboard, Bilancio, Reporting, Slot, Utenti, Login — se lo riscrivevano a
 * mano, in tutto una trentina di volte: fondo, bordo, raggio e riempimenti
 * ripetuti riga per riga, ognuno con la sua piccola differenza. Cambiare
 * `Card` non le toccava, quindi un cambio di look le avrebbe lasciate con
 * l'aspetto vecchio **accanto** a quello nuovo.
 *
 * Serve come stile e non solo come componente perché in quei punti la
 * superficie non è un `<div>` qualunque: è un `<button>`, una `<label>`, una
 * cella dentro un `map` con altre proprietà. **Il componente per il caso
 * normale, lo stile per gli altri — ma il fondo, il bordo e il raggio stanno
 * in un posto solo.**
 */
export const stileCard = (style, colore) => ({
  background: C.card,
  // ⚠️⚠️ **Da spenta la cornice è trasparente** (21/10/2026). La card si vede
  // perché il suo fondo è più chiaro della pagina (1,19:1), non perché ha una
  // linea attorno: l'app era un reticolo di 161 bordi da 1px, e il bordo è
  // tornato a dire qualcosa — lo si passa (`colore`) quando significa la
  // categoria di una partita o com'è andata una spin.
  // ⚠️ Il bordo resta **1px trasparente** e non `none`: toglierlo cambierebbe
  // la misura di ogni card di 2px e sposterebbe i layout.
  border: `1px solid ${colore ? alpha(colore, 0.2) : 'transparent'}`,
  borderRadius: R.g,
  // ⚠️ `SP.xl` e `SP.xxl` **sono** i 14 e 16 di prima: la scala è stata
  // costruita sui numeri già in uso, quindi qui non cambia un pixel.
  padding: `${SP.xl}px ${SP.xxl}px`,
  ...style,
})

/**
 * ⚠️⚠️ **Una card con `onClick` diventa un pulsante vero.** Prima era un
 * `<div>` con un gestore sopra: col dito funzionava, ma **da tastiera non
 * esisteva** — non si poteva raggiungere col tabulatore né premere con Invio,
 * e nessuno strumento di lettura la annunciava come toccabile. La riga della
 * lista delle partite è una di queste, cioè l'elemento più cliccato dell'app.
 * ⚠️ `role` e `tabIndex` si mettono **solo** quando c'è `onClick`: metterli
 * sempre riempirebbe il giro del tabulatore di riquadri che non fanno niente.
 */
export function Card({ children, style, colore, onClick, ...resto }) {
  const tocca = typeof onClick === 'function'
  return (
    <div
      style={stileCard(tocca ? { cursor: 'pointer', ...style } : style, colore)}
      onClick={onClick}
      {...(tocca ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          // ⚠️ Invio **e** spazio: sono i due tasti che un pulsante accetta, e
          // lo spazio va fermato o la pagina scorre sotto le dita.
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e) }
        },
      } : {})}
      {...resto}>
      {children}
    </div>
  )
}

/**
 * L'attesa, in un posto solo.
 * ⚠️ Era scritta a mano in **cinque pagine** con tre testi diversi — *carico…*,
 * *Caricamento…*, *carico i dati…* — e tre stili leggermente diversi. Una
 * schermata che aspetta è la prima cosa che si vede quando qualcosa va piano:
 * se dice tre parole diverse sembrano tre cose diverse.
 * ⚠️ **Non è un'animazione**: un giro che ruota su una lettura da 150 ms è
 * sfarfallio, non informazione.
 */
export function Attesa({ children = 'carico…', style }) {
  return (
    <div style={{ fontSize: S.base, fontFamily: F.mono, color: C.spento, padding: SP.xxl, ...style }}>
      {children}
    </div>
  )
}

/**
 * L'etichetta piccola in maiuscolo che intesta ogni sezione.
 *
 * ⚠️⚠️ **In Sora dal 21/10/2026, ed è il colpo più largo del lotto sul
 * monospaziato**: questa riga sta in **11 file** e intesta quasi ogni cosa
 * dell'app — SELEZIONE, LA SCALETTA, PUNTATA, ACCUMULO. Sono **parole**, non
 * numeri: il monospaziato serve a incolonnare cifre, e su un'etichetta non
 * incolonna niente — fa solo sembrare la pagina un terminale.
 * ⚠️ L'interlettera resta: è quella, non il carattere, a far leggere una riga
 * maiuscola come un'etichetta invece che come un titolo gridato.
 */
export function Etichetta({ children, colore = C.spento, style }) {
  return (
    <div style={{
      fontSize: S.micro,
      color: colore,
      fontFamily: F.sans,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      ...style,
    }}>
      {children}
    </div>
  )
}

// Un numero con la sua etichetta: il mattone di dashboard e bilancio.
export function StatCard({ label, value, sub, color, small }) {
  return (
    <Card>
      <Etichetta style={{ marginBottom: SP.s }}>{label}</Etichetta>
      <div style={{
        fontSize: small ? S.titolo : S.evidenza,
        fontWeight: 700,
        color: color || C.testo,
        fontFamily: F.mono,
        marginBottom: sub ? SP.xs : 0,
      }}>{value}</div>
      {sub && <div style={{ fontSize: S.base, color: C.spento, fontFamily: F.mono }}>{sub}</div>}
    </Card>
  )
}

// Bottone. `variante`: 'pieno' (azione principale), 'contorno' (secondaria),
// 'pericolo' (distruttiva).
export function Btn({ children, variante = 'contorno', colore = C.oro, style, ...resto }) {
  const stili = {
    pieno:    { background: colore,               border: 'none',                          color: C.fondo },
    contorno: { background: alpha(colore, 0.12),  border: `1px solid ${alpha(colore,0.4)}`, color: colore },
    pericolo: { background: alpha(C.rosso, 0.08), border: `1px solid ${alpha(C.rosso,0.2)}`, color: C.rosso },
  }[variante]
  return (
    /* ⚠️ Il colore spento e il cursore del disabilitato **non sono più qui**:
       li dà `index.css` a ogni `<button>` dell'app, così i 58 tasti scritti a
       mano nelle pagine si comportano come questo invece di ognuno a modo suo. */
    <button style={{
      borderRadius: R.m,
      padding: `${SP.l}px ${SP.sez - SP.s}px`,
      fontSize: S.media,
      fontWeight: 600,
      fontFamily: F.sans,
      cursor: 'pointer',
      ...stili,
      ...style,
    }} {...resto}>
      {children}
    </button>
  )
}

// Campo di testo, "incassato" nella superficie.
export function Input({ style, ...resto }) {
  return (
    <input style={{
      background: C.pozzo,
      border: `1px solid ${C.bordo}`,
      borderRadius: R.m,
      padding: `${SP.l}px ${SP.l + SP.xs}px`,
      color: C.testo,
      fontSize: S.grande,
      fontFamily: F.sans,
      outline: 'none',
      width: '100%',
      ...style,
    }} {...resto} />
  )
}

// Pillola colorata: tipo di schedina, ruolo utente, stato.
/**
 * La targhetta tonda: un'etichetta corta su fondo tinto.
 *
 * ⚠️ `sfondo` esiste perché **il fondo non è sempre la stessa tinta del
 * testo**: in `UtentiPage` il ruolo admin è scritto in `blu` su un fondo di
 * `bluPieno`, e sono due token diversi di proposito (`rgba()` e `#hex` dello
 * stesso nome sono tinte diverse — vedi le convenzioni in CLAUDE.md). Senza
 * questo parametro quella pagina si riscriveva la targhetta da sé, ed è
 * esattamente il modo di ritrovarsi con due stili per la stessa cosa.
 */
export function Badge({ children, colore = C.oro, sfondo, style }) {
  return (
    <span style={{
      fontSize: S.minuta,
      fontWeight: 700,
      padding: `${SP.xs - 1}px ${SP.l - 1}px`,
      // ⚠️ `R.pastiglia` (999) e non 20: su una targhetta bassa 20 è già un
      // mezzo cerchio, ma con due righe di testo tornerebbe uno spigolo.
      borderRadius: R.pastiglia,
      background: sfondo || alpha(colore, 0.12),
      color: colore,
      fontFamily: F.mono,
      letterSpacing: '0.05em',
      ...style,
    }}>
      {children}
    </span>
  )
}

// ⚠️ **Il tasto che si ripete finché lo tieni premuto.** Nato in Andamento il
// 15/10/2026 (*"vorrei tenere premuto il tasto più per alzare i valori"*) e
// salito qui il 18/10, quando è servito anche al bankroll della scalata: i
// passi fini sono inutilizzabili a tocchi singoli — 0,25 punti di voto sono
// venti tocchi per cinque punti, 1 € di bankroll sono cento per cento euro.
//
// ⚠️ **Perché una catena di `setTimeout` e non un `setInterval`**: il ritmo
// accelera — il primo scatto è immediato, poi si aspetta mezzo secondo (così
// un tocco singolo resta un tocco singolo), poi 120 ms che scendono a 40.
// Senza l'attesa iniziale un tocco normale ne farebbe due.
//
// ⚠️ **Pointer e non mouse/touch separati**: un solo giro di eventi copre dito,
// mouse e penna. Si ferma anche su `pointercancel` e `pointerleave`, perché su
// telefono il dito che scivola fuori dal tasto non manda `pointerup`, e un
// contatore che continua da solo è il difetto peggiore di un tasto così.
const ATTESA_PRIMA = 500, RITMO_DA = 120, RITMO_A = 40

export function TastoRipeti({ onScatto, colore = C.spento, children, style }) {
  const timer = useRef(null)
  const scatto = useRef(onScatto)
  scatto.current = onScatto

  const ferma = () => { clearTimeout(timer.current); timer.current = null }
  const parti = () => {
    ferma()
    scatto.current()
    let ritmo = RITMO_DA
    const giro = (attesa) => {
      timer.current = setTimeout(() => {
        scatto.current()
        ritmo = Math.max(RITMO_A, ritmo - 10)
        giro(ritmo)
      }, attesa)
    }
    giro(ATTESA_PRIMA)
  }
  // ⚠️ Smontare la pagina mentre il dito è giù lascerebbe il timer vivo.
  useEffect(() => ferma, [])

  return (
    <button
      onPointerDown={e => { e.preventDefault(); parti() }}
      onPointerUp={ferma} onPointerCancel={ferma} onPointerLeave={ferma}
      onContextMenu={e => e.preventDefault()}
      style={{
        padding: '4px 12px', fontSize: S.media, fontFamily: F.mono, cursor: 'pointer',
        color: colore, background: C.card, border: `1px solid ${alpha(colore, 0.3)}`,
        // ⚠️ Tenere premuto su iOS seleziona il testo e apre il menù: queste
        // due righe sono quello che rende il gesto possibile su telefono.
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
        ...style,
      }}>{children}</button>
  )
}
