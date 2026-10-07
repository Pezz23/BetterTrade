import { useEffect } from 'react'
import { C, alpha } from '../theme'
import { usaIndietro } from '../hooks/usaIndietro'

// Il foglio che copre la lista quando si apre una partita.
//
// Perché un foglio sopra e non una pagina al posto della lista: così sotto c'è
// davvero qualcosa da scoprire mentre si trascina — l'effetto di Safari — e la
// lista **non viene smontata**, quindi tiene da sola il punto in cui si era
// senza salvare e rimettere lo scorrimento a mano.
//
// Entra scivolando da destra (`scheda-entra` in index.css) ed esce seguendo il
// dito (hooks/usaIndietro.js).

export default function SchedaScorrevole({ onChiudi, children }) {
  const indietro = usaIndietro(onChiudi)

  // Mentre il foglio è aperto la lista sotto non deve scorrere.
  useEffect(() => {
    const prima = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prima }
  }, [])

  return (
    <div {...indietro} className="scheda-entra" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40,
      background: C.fondo,
      boxShadow: `-8px 0 24px ${alpha(C.fondo, 0.9)}`,
      overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
      paddingBottom: 'var(--barra-bassa)',
    }}>
      <div style={{ padding: 12, maxWidth: 560, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
