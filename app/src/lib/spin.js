import { categoria, martediChiusura } from './attendibilita.js'
import { fondo } from './ordine.js'

// La composizione automatica delle spin. Solo calcoli: la usa la pagina
// "Spin provvisorie" e il tasto che compila la griglia.
//
// Le posizioni nella slot (vedi SlotPage): 1-4 gli angoli (gialli, le più
// attendibili), 5-8 i lati (blu, sacrificabili), 9 il centro (la perfetta).
// La prima partita in ordine va al centro, le 4 dopo agli angoli, le 4 dopo
// ancora ai lati. Ogni spin prende le 9 successive: una partita sta in una
// spin sola.

export const ORDINE_POSIZIONI = [9, 1, 2, 3, 4, 5, 6, 7, 8]
// Com'è disposta la slot a schermo, riga per riga.
export const DISPOSIZIONE = [[1, 5, 2], [6, 9, 7], [3, 8, 4]]

/**
 * ⚠️⚠️ **Le soglie delle spin, e il numero a cui si applicano** (Mattia,
 * 24/10/2026). Dentro le spin verde, giallo e blu si leggono sulla **scelta**
 * — `attendibilità + 0,10 × VPM` normalizzato, vedi `lib/vpm.js` — e non più
 * sull'attendibilità sola: con la regola dell'over i favoriti più forti
 * scendevano a blu (Rangers 76,7% → 69,6%) e il weekend del 24/10 aveva **zero
 * verdi e una gialla** su 145 partite.
 * ⚠️ **Vale solo qui.** Fuori dalle spin i colori restano quelli
 * dell'attendibilità con `SOGLIE_DEFAULT`: VPM è un indicatore in più, non il
 * criterio. ⚠️ E la scelta sta **sopra** l'attendibilità fino a 10 punti:
 * verde a 75 di scelta non vuol dire 75% di probabilità.
 */
export const SOGLIE_SPIN = { centro: 0.75, giallo: 0.72, blu: 0.68 }

/**
 * Il numero con cui una partita entra e si ordina nelle spin. `v` è il
 * risultato di `valutaPartita`: senza (VPM non ancora arrivato) resta
 * l'attendibilità, e `null` quando il campo contraddice il mercato — lì la
 * scelta non si fa, come nella pagina Partite.
 */
export const valoreSpin = (r, v) => (v ? v.scelta : r.probGiocata)

/**
 * Le partite che possono entrare in una spin, in ordine di `valore` (la
 * scelta, vedi `valoreSpin`).
 *
 * ⚠️ **Il limite di data è un blocco, non un filtro**: oltre il martedì che
 * chiude il weekend non entra niente, **nemmeno una partita votata**. Una
 * stellina scavalca la soglia — è un giudizio su quella partita — ma non il
 * calendario, che è un vincolo sulla spin intera: mescolare due weekend
 * significa tenere otto schedine aperte nove giorni (8/10/2026).
 */
export function candidate(righe, { soglie = SOGLIE_SPIN, votiDi, oggi, valore = r => r.probGiocata } = {}) {
  const limite = martediChiusura(oggi)
  const votata = r => !!votiDi && votiDi(r.id) > 0
  return righe
    .filter(r => r.data <= limite)
    // ⚠️ Fuori le partite dove Bet365 e il consenso si contraddicono: uno dei
    // due prezzi è sbagliato e non si sa quale, quindi l'attendibilità non
    // vuol dire niente. ⚠️ **Questo lo scavalca anche una stellina**, come il
    // calendario: la stellina è un giudizio su una partita, qui invece il dato
    // stesso è rotto, e nessun giudizio lo ripara (12/10/2026, dopo il voto
    // del 200% su Burgos-Granada).
    .filter(r => !r.quoteIncoerenti)
    .filter(r => votata(r) || categoria(valore(r), soglie) !== 'no')
    // Una votata senza scelta (campo contro mercato) entra lo stesso, ma in
    // fondo: `fondo` tiene il `null` fuori dalla sottrazione.
    .sort((a, b) => fondo(valore(a), valore(b)) || (valore(b) ?? 0) - (valore(a) ?? 0) || b.probGiocata - a.probGiocata)
}

/**
 * Le votate che il limite lascia fuori: giocano dopo il martedì, quindi il
 * voto di qualcuno non produce niente. Va detto a schermo, o la stellina
 * sembra ignorata.
 */
export function votateOltreIlLimite(righe, votiDi, oggi) {
  const limite = martediChiusura(oggi)
  return righe
    .filter(r => votiDi(r.id) > 0 && r.data > limite)
    .sort((a, b) => a.data.localeCompare(b.data))
}

/**
 * Compone `n` spin da una lista già ordinata. Restituisce un array di spin;
 * ogni spin è un array di 9 celle { pos, partita } (partita null se le
 * candidate finiscono: la spin resta a metà, non si inventa).
 */
export function componi(ordinate, n) {
  const spin = []
  for (let s = 0; s < n; s++) {
    const blocco = ordinate.slice(s * 9, s * 9 + 9)
    spin.push(ORDINE_POSIZIONI.map((pos, i) => ({ pos, partita: blocco[i] ?? null })).sort((a, b) => a.pos - b.pos))
  }
  return spin
}

// La giocata come la scrive lib/attendibilita ("1 + over 1,5") tradotta nel
// valore della tendina della griglia ("1+O1,5", vedi PRONOSTICI in SlotPage).
export const pronosticoDa = giocata => giocata.replace(/ \+ over /, '+O')

/**
 * Il contrario: dal pronostico della griglia (`'1+O1,5'`) alla giocata che
 * legge `giocataArrivata` (`'1 + over 1,5'`). ⚠️ Senza, la regola vedrebbe
 * solo il segno: un 1-0 su «1+O1,5» risulterebbe vinto (30/10/2026).
 */
export const giocataDa = pronostico => String(pronostico ?? '').replace(/\+O/i, ' + over ')

/** Una cella della griglia (il formato di griglia.spins) da una partita valutata. */
export function cellaDa(pos, p) {
  if (!p) return { id: pos, casa: '', ospite: '', pronostico: '', quota: '', data: '', result: '' }
  const [, mm, gg] = p.data.slice(0, 10).split('-')   // l'anno non si mostra in griglia
  return {
    id: pos, casa: p.casa, ospite: p.trasferta, pronostico: pronosticoDa(p.giocata),
    // La combinata con l'over non ha quota da nessuna fonte: si lascia vuota,
    // la scrive chi compila leggendola sul book.
    quota: p.quotaGiocata ? p.quotaGiocata.toFixed(2) : '',
    data: `${gg}/${mm}`, result: '',
    prossima_id: p.id,   // il filo con l'archivio: non lo usa ancora nessuno, ma resta
  }
}

/** Una spin della griglia ha qualcosa dentro? Serve a chiedere conferma prima di sovrascriverla. */
export const spinPiena = celle => Array.isArray(celle) && celle.some(t => t.casa || t.ospite || t.pronostico)

/**
 * Le otto schedine di una spin: cinque tris, due quaterne e la full.
 * ⚠️ Erano scritte **tre volte**, uguali, in Slot, Dashboard e Reporting
 * (trovato il 30/10/2026 costruendo l'archivio): ora stanno qui, e la quarta
 * strada — l'archivio — conta le schedine come le altre tre.
 */
export const COMBOS = [
  { id: 1, nome: 'Tris 1-5-2', tipo: 'tris', pos: [1, 5, 2] },
  { id: 2, nome: 'Tris 1-9-4', tipo: 'tris', pos: [1, 9, 4] },
  { id: 3, nome: 'Tris 6-9-7', tipo: 'tris', pos: [6, 9, 7] },
  { id: 4, nome: 'Tris 3-8-4', tipo: 'tris', pos: [3, 8, 4] },
  { id: 5, nome: 'Tris 3-9-2', tipo: 'tris', pos: [3, 9, 2] },
  { id: 6, nome: 'Quaterna 1-2-3-4', tipo: 'quaterna', pos: [1, 2, 3, 4] },
  { id: 7, nome: 'Quaterna 5-6-7-8', tipo: 'quaterna', pos: [5, 6, 7, 8] },
  { id: 8, nome: 'Full 1→9', tipo: 'full', pos: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
]

/** Una schedina: `'win'` se tutte le sue caselle sono vinte, `'loss'` se una è persa, `'aperta'` se no. */
export function statoSchedina(tiles, c) {
  const rel = c.pos.map(p => (tiles || []).find(t => t?.id === p))
  if (rel.some(t => t?.result === 'loss')) return 'loss'
  if (rel.every(t => t?.result === 'win')) return 'win'
  return 'aperta'
}

/**
 * ⚠️⚠️ **La resa di una spin IN UNITÀ, senza soldi** (archivio, 30/10/2026,
 * Mattia: *"tracciare le spin senza toccare il conto reale"*). Una spin vale 1:
 * le stesse proporzioni di `calcSchedule` — 77% sui cinque tris, 20% sulle due
 * quaterne, 3% sulla full — ma **senza i `Math.floor`**, che nel gioco vero
 * lasciano fuori il 3-4% della base. Così la resa misura il metodo, non gli
 * arrotondamenti.
 * Torna `{ incasso, resa }` (resa = incasso − 1, cioè −1 = tutto perso), o
 * `null` se una schedina è ancora aperta, o se ne è uscita una con una quota
 * mancante (la combinata con l'over la quota la scrive chi compila).
 */
const PESO = { tris: 0.77 / 5, quaterna: 0.20 / 2, full: 0.03 }
export function resaInUnita(tiles) {
  let incasso = 0
  for (const c of COMBOS) {
    const s = statoSchedina(tiles, c)
    if (s === 'aperta') return null
    if (s === 'loss') continue
    const quote = c.pos.map(p => parseFloat(tiles.find(t => t?.id === p)?.quota))
    if (quote.some(q => !(q > 1))) return null
    incasso += PESO[c.tipo] * quote.reduce((a, q) => a * q, 1)
  }
  return { incasso, resa: incasso - 1 }
}
