// GLI INDIRIZZI DELLE PAGINE (29/10/2026, lotto 2 — il routing).
//
// Prima `AppShell` teneva la pagina in uno `useState`: l'indirizzo non
// cambiava mai, quindi il tasto indietro non faceva niente, **ogni
// ricaricamento riportava alla Dashboard** e un link a una partita non si
// poteva mandare al gruppo. Valutato il 12/10 in
// `briefing/risposte/2026-10-12-routing-v1.0-risposta.md`.
//
// ⚠️⚠️ **Niente libreria router, di proposito.** Le pagine sono una dozzina più
// due schede con l'id della partita: la History API del browser fa tutto, e
// un pezzo nuovo da 20 kB per questo sarebbe peso senza ritorno. Le regole
// che la risposta al briefing chiedeva valgono lo stesso:
//  · **`<a href>` vero** sui tasti (`Collegamento`), non `onClick` e basta:
//    così funzionano anche «apri in una nuova scheda» e il tasto centrale;
//  · **mai `vai()` dentro `onAuthStateChange`** (il lock di supabase-js che
//    ha già bloccato il login una volta): dopo il login l'indirizzo è già
//    quello giusto, perché `AppShell` mostra il login **al posto** della
//    pagina, senza cambiare indirizzo;
//  · **il controllo degli admin aspetta `booting`**: sta in `AppShell`, dopo
//    il caricamento della sessione, mai prima.
// ⚠️ Il server deve rispondere `index.html` a ogni indirizzo: in sviluppo lo fa
// Vite da solo, su Vercel ci pensa `app/vercel.json`.

// Il percorso attuale si legge con `usaPercorso` (`hooks/usaPercorso.js`):
// gli hook stanno in `hooks/`, dove il lint conosce i nomi italiani.

/**
 * Va a un indirizzo. `sostituisci` non lascia traccia nella cronologia: serve
 * a correggere un indirizzo sbagliato senza che «indietro» ci riporti sopra.
 * ⚠️ Nello stato della cronologia si scrive **da dove si arriva** (`da`): è
 * quello che permette a `chiudiVerso` di sapere se «indietro» porta alla lista
 * o fuori dall'app.
 */
export function vai(percorso, { sostituisci = false } = {}) {
  if (percorso === window.location.pathname) return
  const stato = { da: window.location.pathname }
  if (sostituisci) window.history.replaceState(stato, '', percorso)
  else window.history.pushState(stato, '', percorso)
  // `pushState` non avvisa nessuno da solo: lo si fa a mano, così chi usa
  // `usaPercorso` si ridisegna come col tasto indietro.
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/**
 * Chiude una scheda tornando a `lista`. Se ci si è arrivati **dalla lista**,
 * è un «indietro» vero (la cronologia resta pulita e il tasto indietro del
 * telefono non riapre la scheda); se ci si è arrivati **da un link**, indietro
 * porterebbe fuori dall'app, quindi si sostituisce l'indirizzo con la lista.
 */
export function chiudiVerso(lista) {
  if (window.history.state?.da === lista) window.history.back()
  else vai(lista, { sostituisci: true })
}

/**
 * Un collegamento interno: un `<a href>` vero che però non ricarica la pagina.
 * ⚠️ Con Ctrl/Cmd, Maiuscolo o il tasto centrale si lascia fare al browser:
 * è proprio il caso «apri in una nuova scheda» per cui serve l'`href`.
 */
export function Collegamento({ a, onClick, style, ...resto }) {
  return (
    <a href={a} {...resto} style={{ textDecoration: 'none', color: 'inherit', ...style }} onClick={e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onClick?.(e)
      vai(a)
    }} />
  )
}
