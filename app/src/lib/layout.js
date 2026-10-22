// Le misure della struttura della pagina.
//
// ⚠️⚠️ **Sta in `lib/` e non in `App.jsx` perché la legge anche un
// componente** (`BarraCampionati`, che si ancora al bordo destro della
// colonna): importarla da `App.jsx` avrebbe creato un anello — `App` carica le
// pagine con `lazy`, e una pagina che torna a importare `App` è il tipo di
// ciclo che si rompe solo in produzione, dove i moduli vengono uniti in un
// ordine diverso.
// ⚠️ Non è una spaziatura e non sta in `theme.js`: quello descrive come sono
// fatte le cose, questo **dov'è il bordo della pagina**.

/**
 * ⚠️⚠️ **Una colonna sola per tutta l'app** (21/10/2026). Il contenuto era già
 * incolonnato a 720, ma header e tab bar restavano larghi quanto la finestra:
 * su un portatile il nome dell'utente finiva all'estremo destro, il logo
 * all'estremo sinistro e la pagina in mezzo — **tre allineamenti diversi**, e
 * quattro tasti larghi 320 px con la riga d'oro lunga un terzo di schermo.
 * Su telefono non cambia niente, perché 375 è sotto il limite.
 */
export const COLONNA = 720

/**
 * Da che parte sta il bordo destro della colonna, in CSS: zero su un telefono,
 * il margine vuoto su uno schermo largo. ⚠️ Serve a **tutto quello che si
 * ancora a destra** — il menu lo fa già a mano, con lo stesso conto.
 */
export const bordoDestro = (scostamento = 0) =>
  `max(${scostamento}px, calc(50vw - ${COLONNA / 2}px + ${scostamento}px))`
