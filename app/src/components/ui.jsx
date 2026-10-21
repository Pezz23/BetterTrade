// Pezzi di interfaccia ricorrenti.
//
// Prima stavano riscritti a mano in ogni pagina: la card grigia compariva 21
// volte, l'etichetta maiuscola 19. Non era un problema di righe risparmiate ma
// di coerenza — le copie divergevano (padding 14 o 16, bordi diversi) e
// cambiare l'aspetto significava rincorrerle tutte.

import { useRef, useEffect } from 'react'
import { C, F, alpha, S } from '../theme'

// La card grigia standard: fondo, bordo, angoli tondi.
export function Card({ children, style, colore, ...resto }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${colore ? alpha(colore, 0.2) : C.bordo}`,
      borderRadius: 10,
      padding: '14px 16px',
      ...style,
    }} {...resto}>
      {children}
    </div>
  )
}

// L'etichetta piccola in maiuscolo che intesta ogni sezione.
export function Etichetta({ children, colore = C.spento, style }) {
  return (
    <div style={{
      fontSize: S.micro,
      color: colore,
      fontFamily: F.mono,
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
      <Etichetta style={{ marginBottom: 6 }}>{label}</Etichetta>
      <div style={{
        fontSize: small ? 18 : 22,
        fontWeight: 700,
        color: color || C.testo,
        fontFamily: F.mono,
        marginBottom: sub ? 3 : 0,
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
    <button style={{
      borderRadius: 8,
      padding: '10px 18px',
      fontSize: S.media,
      fontWeight: 600,
      fontFamily: F.sans,
      cursor: resto.disabled ? 'default' : 'pointer',
      opacity: resto.disabled ? 0.5 : 1,
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
      borderRadius: 8,
      padding: '10px 13px',
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
      padding: '3px 9px',
      borderRadius: 20,
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
