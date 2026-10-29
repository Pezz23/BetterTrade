import { useSyncExternalStore } from 'react'

// Il percorso della pagina (`/partite/123`), e chi lo usa si ridisegna quando
// cambia — col tasto indietro (`popstate`) o con `vai()` di `lib/indirizzi.jsx`,
// che lo stesso evento lo manda a mano. Lotto 2, 29/10/2026.

const ascolta = avvisa => {
  window.addEventListener('popstate', avvisa)
  return () => window.removeEventListener('popstate', avvisa)
}
const leggi = () => window.location.pathname

export function usaPercorso() {
  return useSyncExternalStore(ascolta, leggi)
}

