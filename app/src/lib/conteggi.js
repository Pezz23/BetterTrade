import { pOver } from './gol.js'

// I MERCATI CHE SI CONTANO: angoli e cartellini.
//
// ⚠️⚠️ **Stessa matematica dei gol, altra cosa contata.** Il modello è quello
// classico moltiplicativo — quanto una squadra *produce* per quanto l'altra
// *concede*, riportato alla media della competizione — e la probabilità del
// totale esce da Poisson, con la **stessa `pOver()` di `lib/gol.js`**: una
// seconda implementazione di Poisson in questo repo sarebbe la copia che prima
// o poi dice un numero diverso dallo schermo.
//
// ⚠️ **Casa e fuori si tengono separati, e non è un dettaglio**: in Champions
// la squadra di casa batte in media 4,9 angoli contro i 3,9 dell'ospite. Una
// media unica spalmerebbe quel vantaggio su tutt'e due.
//
// ⚠️⚠️ **Quello che una squadra CONCEDE è quello che l'altra FA.** Gli angoli
// "subiti in trasferta" da B sono gli angoli battuti in casa dai suoi
// avversari: è lo stesso numero letto dall'altra parte, e sbagliare lato qui
// significa prevedere la partita a specchio.

/**
 * ⚠️⚠️ **La stretta verso la media, ed è la riga che fa funzionare il
 * modello in Champions.** Una squadra gioca **otto** partite di fase
 * campionato: su otto partite una media è quasi rumore, e presa alla lettera
 * direbbe che chi ha avuto due serate da 9 angoli ne farà 9 per sempre.
 * `forza = 1 + (grezza − 1) × n / (n + K)`: con poche partite il moltiplicatore
 * tende a 1, cioè *"come tutti"*, e si fida solo quando ha visto abbastanza.
 * ⚠️⚠️ **12 è misurato, non scelto** (22/10/2026, `prova-conteggi.js`): è il
 * migliore o pari al migliore su Champions, Serie A e Liga, sia sugli angoli
 * sia sui cartellini. Con 8 la Champions scende sotto la base; con 20 non
 * guadagna niente.
 *
 * ⚠️⚠️ **E quanto vale davvero questo modello, detto senza giri**: sulla
 * soglia centrale indovina il 56,1% in Serie A contro una base del 52,0%
 * (+4,1), il 54,1% in Liga (+1,2) e il **54,0% in Champions contro 53,1%
 * (+0,9), cioè dentro il rumore**. Sui cartellini è ancora meno: +1,6 in
 * Champions, +0,4 in Serie A. Quindi questi numeri servono a **descrivere
 * cosa succede di solito**, non a dire cosa giocare — ed è la stessa riga che
 * vale per il verde dei gol: *«più del solito», non «giocata vincente»*.
 */
export const K_STRETTA = 12

/** Le soglie che si giocano davvero, per mercato. */
export const SOGLIE = {
  angoli: [7.5, 8.5, 9.5, 10.5, 11.5],
  cartellini: [2.5, 3.5, 4.5, 5.5],
}

/** Da cosa si contano i due mercati, nelle colonne dell'archivio. */
export const COLONNE = {
  angoli: ['angoli_casa', 'angoli_trasf'],
  cartellini: ['gialli_casa', 'gialli_trasf'],
}

export const NOMI = { angoli: 'calci d’angolo', cartellini: 'cartellini gialli' }

/**
 * Il moltiplicatore di una squadra, già stretto verso 1.
 *
 * ⚠️ Prende **media e conteggio**, non la lista dei valori: è la forma in cui
 * il database li consegna (`conteggi_dati()`), ed è anche l'unica che dice
 * quanto pesa quella media. Una media senza il suo `n` non si può stringere,
 * e stringere è tutto il mestiere di questa funzione.
 */
export function forza({ m, n }, mediaLega, k = K_STRETTA) {
  if (m == null || !n || !mediaLega) return 1
  return 1 + (m / mediaLega - 1) * (n / (n + k))
}

/**
 * Il totale atteso di una partita.
 *
 * `casa` sono i numeri della squadra di casa **misurati in casa**, `trasferta`
 * quelli dell'ospite **misurati fuori**: ciascuno con quanti ne fa (`fatti`) e
 * quanti ne concede (`subiti`), nella forma `{ m, n }`.
 * `lega` sono le due medie della competizione, di casa e di trasferta.
 *
 * ⚠️⚠️ **Quello che una squadra CONCEDE è quello che l'altra FA**: gli angoli
 * subiti in trasferta dall'ospite sono gli angoli battuti in casa dai suoi
 * avversari, cioè lo stesso numero letto dall'altra parte. Sbagliare lato qui
 * significa prevedere la partita a specchio.
 * ⚠️ Il riferimento è la media di **casa** per il conto di casa e quella di
 * **trasferta** per quello di trasferta: dividere per la media complessiva
 * gonfierebbe le squadre di casa di un ~12% a tavolino.
 *
 * ⚠️ Torna anche `n`, su quante partite si regge: è quello che permette a chi
 * mostra il numero di dire *"ci credo poco"* invece di mostrarlo e basta. Una
 * previsione senza il suo peso è una previsione che mente.
 */
export function atteso({ casa, trasferta, lega, k = K_STRETTA }) {
  const lCasa = lega.casa * forza(casa.fatti, lega.casa, k) * forza(trasferta.subiti, lega.casa, k)
  const lTrasf = lega.trasferta * forza(trasferta.fatti, lega.trasferta, k) * forza(casa.subiti, lega.trasferta, k)
  return { casa: lCasa, trasferta: lTrasf, totale: lCasa + lTrasf,
    n: Math.min(casa.fatti.n ?? 0, trasferta.fatti.n ?? 0) }
}

/**
 * La probabilità che il totale superi una soglia da scommessa (`8.5`).
 *
 * ⚠️ `pOver` ragiona in **interi**: `pOver(8, λ)` è *"almeno 9"*, cioè
 * esattamente l'over 8,5. Passare 8.5 direttamente la farebbe arrotondare in
 * silenzio, e l'over 8,5 diventerebbe l'over 7,5.
 */
export const pOltre = (soglia, lambdaTotale) => pOver(Math.floor(soglia), lambdaTotale)

/**
 * La soglia più vicina al totale atteso: quella su cui la previsione ha
 * qualcosa da dire. ⚠️ Sulle altre il modello dice solo *"è tanto"* o *"è
 * poco"*, che è quello che si vede anche a occhio.
 */
export function sogliaCentrale(mercato, totale) {
  const s = SOGLIE[mercato]
  return s.reduce((a, b) => (Math.abs(b - totale) < Math.abs(a - totale) ? b : a), s[0])
}

/**
 * Quanto vale il modello, misurato camminando nel tempo su tutto l'archivio
 * (`btscout/scripts/prova-conteggi.js`, 22/10/2026). ⚠️ Sta qui e non in una
 * stringa dentro il JSX perché **è un risultato**, e un risultato scritto a
 * mano in un angolo dell'interfaccia invecchia senza che nessuno se ne accorga.
 */
export const MISURA = {
  UCL: { angoli: { nostra: 0.540, base: 0.531 }, cartellini: { nostra: 0.522, base: 0.506 } },
  I1: { angoli: { nostra: 0.561, base: 0.520 }, cartellini: { nostra: 0.653, base: 0.649 } },
  SP1: { angoli: { nostra: 0.541, base: 0.529 }, cartellini: { nostra: 0.703, base: 0.698 } },
}
