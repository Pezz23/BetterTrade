import { useRef } from 'react'

// Tornare indietro trascinando da sinistra verso destra, come un dettaglio di
// Safari: il foglio segue il dito e **esce di scena**, scoprendo la lista che
// sta sotto. Prima si spostava di 160px e poi scattava: sembrava bloccarsi.
//
// Tre accortezze, o diventa un fastidio:
//  · **la direzione si decide una volta sola**, al primo movimento oltre i
//    10px. Se parti in verticale stai scorrendo, e il gesto non si attiva più
//    nemmeno se la mano devia di lato.
//  · **si lascia completare l'uscita** prima di smontare la scheda: chiudere a
//    metà corsa è esattamente l'effetto "si blocca e compare la lista".
//  · **lo spostamento si scrive sul nodo, non nello stato di React**: a ogni
//    millimetro si ridisegnerebbe tutta la scheda, che è pesante.

const USCITA = 260   // ms: quanto dura lo scivolamento finale

export function usaIndietro(onIndietro, { soglia = 0.25 } = {}) {
  const elemento = useRef(null)
  const inizio = useRef(null)
  const chiuso = useRef(false)

  const muovi = (x, durata) => {
    const n = elemento.current
    if (!n) return
    n.style.transition = durata ? `transform ${durata}ms cubic-bezier(.32,.72,0,1)` : 'none'
    n.style.transform = x ? `translateX(${x}px)` : ''
  }

  const esci = () => {
    if (chiuso.current) return
    chiuso.current = true
    const larghezza = elemento.current?.offsetWidth || window.innerWidth
    muovi(larghezza + 40, USCITA)      // fuori dallo schermo, poi si smonta
    setTimeout(onIndietro, USCITA - 20)
  }

  return {
    ref: elemento,
    onTouchStart: e => {
      if (e.touches.length !== 1 || chiuso.current) return
      inizio.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, orizzontale: null, dx: 0 }
    },
    onTouchMove: e => {
      const i = inizio.current
      if (!i) return
      const dx = e.touches[0].clientX - i.x
      const dy = e.touches[0].clientY - i.y
      if (i.orizzontale === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        i.orizzontale = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5
      }
      if (!i.orizzontale) return
      e.preventDefault?.()          // il browser non deve scorrere di lato
      i.dx = Math.max(0, dx)
      muovi(i.dx, 0)
    },
    onTouchEnd: () => {
      const i = inizio.current
      inizio.current = null
      if (!i?.orizzontale) return
      const larghezza = elemento.current?.offsetWidth || window.innerWidth
      // Basta un quarto di schermo, oppure uno scatto veloce del polso.
      if (i.dx >= larghezza * soglia) esci()
      else muovi(0, 200)
    },
    onTouchCancel: () => { inizio.current = null; muovi(0, 200) },
  }
}
