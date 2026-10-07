import { useRef, useEffect } from 'react'

// Tornare indietro trascinando da sinistra verso destra, come un dettaglio di
// Safari: il foglio segue il dito e **esce di scena**, scoprendo la lista sotto.
//
// ⚠️ Gli eventi si agganciano **a mano**, non con `onTouchMove` di React:
// React li registra come "passivi", e in un ascoltatore passivo
// `preventDefault()` non fa niente. Risultato: il browser continuava a scorrere
// in verticale mentre il foglio andava di lato — sembrava un foglio libero
// invece che su un binario.
//
// Le altre accortezze, o diventa un fastidio:
//  · **la direzione si decide una volta sola**, al primo movimento oltre i 10px:
//    se parti in verticale stai scorrendo, e il gesto non si attiva più.
//  · appena il gesto è orizzontale si blocca lo scorrimento (`touch-action`),
//    così il movimento è su un asse solo.
//  · **si lascia completare l'uscita** prima di smontare: chiudere a metà corsa
//    è l'effetto "si blocca e compare la lista".

const USCITA = 260   // ms dello scivolamento finale

export function usaIndietro(onIndietro, { soglia = 0.25 } = {}) {
  const elemento = useRef(null)
  const chiusura = useRef(onIndietro)
  chiusura.current = onIndietro

  useEffect(() => {
    const n = elemento.current
    if (!n) return
    let inizio = null, chiuso = false

    const muovi = (x, durata) => {
      n.style.transition = durata ? `transform ${durata}ms cubic-bezier(.32,.72,0,1)` : 'none'
      n.style.transform = x ? `translateX(${x}px)` : ''
    }

    const start = e => {
      if (e.touches.length !== 1 || chiuso) return
      inizio = { x: e.touches[0].clientX, y: e.touches[0].clientY, orizzontale: null, dx: 0 }
    }

    const move = e => {
      if (!inizio) return
      const dx = e.touches[0].clientX - inizio.x
      const dy = e.touches[0].clientY - inizio.y
      if (inizio.orizzontale === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        inizio.orizzontale = dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5
        // Da qui in poi è un binario: niente scorrimento verticale.
        if (inizio.orizzontale) n.style.touchAction = 'none'
      }
      if (!inizio.orizzontale) return
      e.preventDefault()
      inizio.dx = Math.max(0, dx)
      muovi(inizio.dx, 0)
    }

    const fine = () => {
      const i = inizio
      inizio = null
      n.style.touchAction = ''
      if (!i?.orizzontale) return
      if (i.dx >= n.offsetWidth * soglia) {
        chiuso = true
        muovi(n.offsetWidth + 40, USCITA)
        setTimeout(() => chiusura.current(), USCITA - 20)
      } else muovi(0, 200)
    }

    n.addEventListener('touchstart', start, { passive: true })
    n.addEventListener('touchmove', move, { passive: false })   // serve preventDefault
    n.addEventListener('touchend', fine)
    n.addEventListener('touchcancel', fine)
    return () => {
      n.removeEventListener('touchstart', start)
      n.removeEventListener('touchmove', move)
      n.removeEventListener('touchend', fine)
      n.removeEventListener('touchcancel', fine)
    }
  }, [soglia])

  return elemento
}
