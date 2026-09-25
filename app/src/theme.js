// Tema unico dell'app.
//
// Prima di questo file i colori stavano in due posti scollegati: le CSS
// variables di index.css (che il JSX non usava mai) e ~130 valori scritti a
// mano dentro gli stili inline — `#c9a84c` compariva 48 volte. Cambiare l'oro
// significava 48 sostituzioni sperando di non saltarne una.
//
// Qui la definizione è una sola. index.css rispecchia questi stessi valori per
// quel poco che stila fuori da React (body, scrollbar).

export const C = {
  // Sfondi, dal più scuro al più chiaro
  fondo:    '#090909',  // sfondo pagina
  barra:    '#0d0d0d',  // header e tab bar
  pozzo:    '#0a0a0a',  // campi di input, "incassati" nella superficie
  pannello: '#111111',  // card di login, modali
  card:     '#141414',  // card di contenuto

  // Bordi, dal più tenue al più marcato
  bordoTenue: '#181818',
  bordoRiga:  '#1a1a1a',
  bordo:      '#1e1e1e',

  // Testo
  testo:      '#e0d9d0',
  spento:     '#555555',  // etichette, testo secondario
  fioco:      '#444444',  // testo terziario
  fantasma:   '#333333',  // placeholder, testo disabilitato
  inattivo:   '#4a4540',  // icone tab non selezionate

  // Grigi neutri: testo terziario e caselle senza esito
  grigio:      '#888888',
  grigioScuro: '#777777',
  grigioFioco: '#666666',
  quasiNero:   '#222222',
  bordoChiaro: '#2a2a2a',

  // Accenti — anche i ruoli usano questi
  oro:    '#c9a84c',  // colore dell'app, superadmin, full
  verde:  '#22c55e',  // vincita, deposito, tris
  rosso:  '#ef4444',  // perdita, prelievo, errore
  blu:    '#60a5fa',  // admin, quaterna, informazione
  ambra:  '#f59e0b',  // partita di oggi, avviso
  viola:  '#a855f7',  // riga evidenziata
  menta:  '#4ade80',  // ruolo user
  oroChiaro: '#f0d060',
  acciaio:   '#9aa3ab',  // argento spento
  bianco:    '#ffffff',  // le linee interne della slot, l'unico bianco puro
  celeste:   '#7dd3fc',

  // Tinte usate solo come sfondo trasparente. Sono più sature delle
  // corrispondenti piene qui sopra: servono a colorare un fondo senza
  // schiarirlo, e vanno tenute distinte o l'aspetto cambia.
  bluPieno:      '#3b82f6',
  giallo:        '#eab308',
  celestePieno:  '#38bdf8',
  grigioMedio:   '#646464',
  grigioCupo:    '#3c3c3c',
}

export const F = {
  mono: "'DM Mono',monospace",
  sans: "'Sora',sans-serif",
}

// Colore con trasparenza: alpha(C.oro, .12) invece di 'rgba(201,168,76,0.12)'.
// Nel codice c'erano 72 rgba() diversi scritti a mano, spesso lo stesso colore
// con opacità leggermente diverse per distrazione.
export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// I tre tipi di schedina, con il loro colore.
export const TIPO = {
  tris:     C.verde,
  quaterna: C.blu,
  full:     C.oro,
}

// I ruoli, con colore ed etichetta leggibile.
export const RUOLO = {
  superadmin: { colore: C.oro,   nome: 'SuperAdmin' },
  admin:      { colore: C.blu,   nome: 'Admin' },
  user:       { colore: C.menta, nome: 'User' },
}

