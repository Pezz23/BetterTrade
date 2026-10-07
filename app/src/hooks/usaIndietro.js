import { useRef } from 'react'

// Tornare indietro trascinando da sinistra verso destra.
//
// Sul telefono il `‹` sta in alto a sinistra, cioè il punto più lontano dal
// pollice: il gesto è quello che chiunque prova per primo su un dettaglio
// aperto.
//
// Tre accortezze, o diventa un fastidio:
//  · **la direzione si decide una volta sola**, al primo movimento utile. Se
//    parti in verticale stai scorrendo la pagina, e il gesto non deve più
//    attivarsi nemmeno se poi la mano devia di lato.
//  · **la scheda segue il dito** e torna al suo posto se lasci prima della
//    soglia: senza, non si capisce che sta succedendo qualcosa.
//  · **lo spostamento si scrive sull'elemento, non nello stato di React**: a
//    ogni millimetro di trascinamento si ridisegnerebbe tutta la scheda, che è
//    pesante (forma, classifica, scontri). Qui si tocca solo il `transform`.

export function usaIndietro(onIndietro, { soglia = 80, massimo = 160 } = {}) {
  const elemento = useRef(null)
  const inizio = useRef(null)

  const muovi = (x, animato) => {
    const n = elemento.current
    if (!n) return
    n.style.transition = animato ? 'transform .18s ease, opacity .18s ease' : 'none'
    n.style.transform = x ? `translateX(${x}px)` : ''
    n.style.opacity = x ? String(1 - x / 500) : ''
  }

  const props = {
    ref: elemento,
    onTouchStart: e => {
      if (e.touches.length !== 1) return      // due dita = pizzico per ingrandire
      inizio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, orizzontale: null, spostamento: 0 }
    },
    onTouchMove: e => {
      const i = inizio.current
      if (!i) return
      const dx = e.touches[0].clientX - i.x
      const dy = e.touches[0].clientY - i.y
      if (i.orizzontale === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return   // ancora fermo
        i.orizzontale = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5
      }
      if (!i.orizzontale) return
      i.spostamento = Math.max(0, Math.min(dx, massimo))
      muovi(i.spostamento, false)
    },
    onTouchEnd: () => {
      const i = inizio.current
      inizio.current = null
      muovi(0, true)
      if (i?.orizzontale && i.spostamento >= soglia) onIndietro()
    },
    onTouchCancel: () => { inizio.current = null; muovi(0, true) },
  }

  return props
}
