// Il contatore dello sviluppo, in chiaro nella barra in alto.
//
// Serve a sapere a occhio quale versione si ha davanti sul telefono: l'app sta
// su Vercel e si aggiorna da sola, quindi senza un numero visibile non c'è
// modo di dire se quello che si guarda è il lavoro di oggi o la cache di ieri.
//
// Si legge maggiore.minore.ritocco e si alza a mano, a ogni commit che cambia
// l'app:
//   terza cifra  +1  una rifinitura, un difetto corretto, una modifica piccola
//   seconda      +1  un lotto chiuso o una funzione nuova (la terza torna a 00)
//   prima        +1  un cambio d'impianto (le altre tornano a 00)
//
// ⚠️ Non è la `version` di package.json (quella è npm e non c'entra).
export const VERSIONE = '1.02.01'
