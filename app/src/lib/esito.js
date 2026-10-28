// «La giocata è arrivata?» — la regola, in un posto solo.
//
// ⚠️⚠️ **Spostata qui dal motore il 26/10/2026, non copiata.** Viveva in
// `btscout/lib/ricostruisci.js`, e serviva anche all'app: il resoconto delle
// scalate (l'esito di ogni partita giocata in un passo) e, prima o poi,
// l'esito automatico del Bet Builder. Due copie della stessa regola direbbero
// prima o poi cose diverse sulla stessa schedina; ora il motore la importa da
// qui, come fa già con l'attendibilità.
// ⚠️ Si legge dai **gol**, non dalla colonna `esito`: verificato sulle 67.664
// partite dell'archivio il 26/10/2026, le due coincidono sempre, e i gol
// servono comunque all'over.

/**
 * La giocata (`'1'`, `'2'`, `'1 + over 1,5'` …) è arrivata con questo
 * risultato? `true` / `false`, oppure `null` se il risultato non c'è ancora o
 * la giocata non è leggibile.
 *
 * ⚠️ **La giocata intera**: il segno, e se è combinata anche l'over. *"1 +
 * over 1,5"* con un 1-0 è **persa** — il favorito ha vinto, ma la schedina no.
 * ⚠️ La X non si gioca mai (regola di Mattia): una giocata che comincia per
 * `X` torna `null`, non `false`, perché non è una giocata di questo metodo.
 */
export function giocataArrivata(giocata, golCasa, golTrasferta) {
  if (golCasa == null || golTrasferta == null) return null
  const c = Number(golCasa), t = Number(golTrasferta)
  if (!Number.isFinite(c) || !Number.isFinite(t)) return null
  const testo = String(giocata ?? '').trim()
  const segno = testo[0]
  if (segno !== '1' && segno !== '2') return null
  const vince = segno === '1' ? c > t : t > c
  const over = testo.match(/over\s*(\d+)[,.](\d)/i)
  if (!over) return vince
  return vince && c + t > Number(`${over[1]}.${over[2]}`)
}
