// Pezzi di interfaccia ricorrenti.
//
// Prima stavano riscritti a mano in ogni pagina: la card grigia compariva 21
// volte, l'etichetta maiuscola 19. Non era un problema di righe risparmiate ma
// di coerenza — le copie divergevano (padding 14 o 16, bordi diversi) e
// cambiare l'aspetto significava rincorrerle tutte.

import { C, F, alpha } from '../theme'

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
      fontSize: 9,
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
      {sub && <div style={{ fontSize: 11, color: C.spento, fontFamily: F.mono }}>{sub}</div>}
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
      fontSize: 13,
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
      fontSize: 14,
      fontFamily: F.sans,
      outline: 'none',
      width: '100%',
      ...style,
    }} {...resto} />
  )
}

// Pillola colorata: tipo di schedina, ruolo utente, stato.
export function Badge({ children, colore = C.oro, style }) {
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 9px',
      borderRadius: 20,
      background: alpha(colore, 0.12),
      color: colore,
      fontFamily: F.mono,
      letterSpacing: '0.05em',
      ...style,
    }}>
      {children}
    </span>
  )
}
