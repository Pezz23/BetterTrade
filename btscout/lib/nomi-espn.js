// I nomi che ESPN scrive diversamente da noi, scritti A MANO.
//
// ⚠️⚠️ **Non si aggiungono con un automatismo di somiglianza.** Il 5/10/2026
// un abbinamento automatico mise il **PSG sul Paris FC**: due squadre diverse
// della stessa città, nomi vicinissimi, risultato sulla partita sbagliata. Un
// risultato sbagliato nell'archivio non si vede e non si corregge — sporca
// tutte le misure che ci stanno sopra.
//
// Chi aggiunge una riga qui **ha guardato le due squadre** e sa che sono la
// stessa. Tutto quello che non sta qui e non si aggancia da solo finisce nella
// tabella `importazioni`, e aspetta una persona.
//
// ⚠️ ESPN espone cinque nomi per squadra (`displayName`, `shortDisplayName`,
// `name`, `location`, `abbreviation`): l'aggancio automatico li prova tutti, e
// in Serie A come in Premier ne risolve **18 su 20**. Qui restano le eccezioni.
export const ALIAS = {
  // Serie A (I1) — verificati il 12/10/2026
  'AS Roma': 'Roma',
  'Internazionale': 'Inter',
  // ⚠️ Trovata dal recupero storico: ESPN scrive SPAL tutto maiuscolo, noi
  // "Spal". 114 partite in archivio, verificate il 12/10/2026.
  'SPAL': 'Spal',
};

/**
 * Il nostro nome per una squadra ESPN, o `null` se non lo sappiamo.
 * @param {{nomi: string[]}} squadra  la squadra come la dà ESPN
 * @param {Set<string>} nostri        i nomi che usiamo noi in quel campionato
 */
export function nostroNome(squadra, nostri) {
  for (const n of squadra.nomi) {
    if (nostri.has(n)) return n;
    const a = ALIAS[n];
    if (a && nostri.has(a)) return a;
  }
  return null;
}
