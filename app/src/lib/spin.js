import { categoria, SOGLIE_DEFAULT, martediChiusura } from './attendibilita.js'

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
 * Le partite che possono entrare in una spin, nell'ordine di attendibilità.
 *
 * ⚠️ **Il limite di data è un blocco, non un filtro**: oltre il martedì che
 * chiude il weekend non entra niente, **nemmeno una partita votata**. Una
 * stellina scavalca la soglia — è un giudizio su quella partita — ma non il
 * calendario, che è un vincolo sulla spin intera: mescolare due weekend
 * significa tenere otto schedine aperte nove giorni (8/10/2026).
 */
export function candidate(righe, { soglie = SOGLIE_DEFAULT, votiDi, oggi } = {}) {
  const limite = martediChiusura(oggi)
  const votata = r => !!votiDi && votiDi(r.id) > 0
  return righe
    .filter(r => r.data <= limite)
    .filter(r => votata(r) || categoria(r.probGiocata, soglie) !== 'no')
    .sort((a, b) => b.probGiocata - a.probGiocata)
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

/** Le stelline comandano: le votate prima (più voti prima), a parità l'attendibilità. */
export function conStelline(ordinate, votiDi) {
  return [...ordinate].sort((a, b) => votiDi(b.id) - votiDi(a.id) || b.probGiocata - a.probGiocata)
}

// La giocata come la scrive lib/attendibilita ("1 + over 1,5") tradotta nel
// valore della tendina della griglia ("1+O1,5", vedi PRONOSTICI in SlotPage).
export const pronosticoDa = giocata => giocata.replace(/ \+ over /, '+O')

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
