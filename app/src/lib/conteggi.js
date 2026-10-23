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
 * ⚠️⚠️ **QUANTO VALE IL MODELLO, COMPETIZIONE PER COMPETIZIONE.** Misurato
 * camminando nel tempo su tutto l'archivio (`btscout/scripts/prova-conteggi.js
 * --tabella`, 23/10/2026): niente è scritto a mano, la tabella la **stampa il
 * banco di prova** nella forma che serve qui. Un numero misurato e poi
 * ricopiato è un numero che può sbagliarsi in silenzio.
 *
 * `soglia` è quella con la **base più vicina al 50%**, cioè l'unica dove un
 * modello può aggiungere qualcosa: dove l'over esce il 70% delle volte, dire
 * sempre over fa 70% e nessuno lo batte.
 * `nostra` è quante volte il verso era giusto, `base` quante ne prendeva il
 * «dico sempre il più frequente», `n` su quante partite.
 *
 * ⚠️⚠️ **In parecchie competizioni `nostra` è SOTTO `base`**, e non è un
 * errore da nascondere: lì il modello non serve, e la scheda lo scrive invece
 * di tacere. Un numero senza il suo voto di fiducia è peggio di nessun numero.
 */
export const MISURA = {
  E0: { angoli: { soglia: 10.5, nostra: 0.533, base: 0.541, n: 3720 }, cartellini: { soglia: 3.5, nostra: 0.566, base: 0.526, n: 3720 } },
  E1: { angoli: { soglia: 9.5, nostra: 0.545, base: 0.551, n: 5431 }, cartellini: { soglia: 3.5, nostra: 0.545, base: 0.527, n: 5431 } },
  I1: { angoli: { soglia: 9.5, nostra: 0.561, base: 0.520, n: 3724 }, cartellini: { soglia: 4.5, nostra: 0.574, base: 0.556, n: 3724 } },
  I2: { angoli: { soglia: 9.5, nostra: 0.543, base: 0.506, n: 3290 }, cartellini: { soglia: 4.5, nostra: 0.569, base: 0.556, n: 3290 } },
  SP1: { angoli: { soglia: 9.5, nostra: 0.541, base: 0.529, n: 3757 }, cartellini: { soglia: 4.5, nostra: 0.553, base: 0.533, n: 3757 } },
  SP2: { angoli: { soglia: 9.5, nostra: 0.544, base: 0.551, n: 4011 }, cartellini: { soglia: 4.5, nostra: 0.565, base: 0.572, n: 4011 } },
  D1: { angoli: { soglia: 9.5, nostra: 0.521, base: 0.500, n: 2980 }, cartellini: { soglia: 3.5, nostra: 0.529, base: 0.522, n: 2980 } },
  D2: { angoli: { soglia: 9.5, nostra: 0.524, base: 0.538, n: 2664 }, cartellini: { soglia: 4.5, nostra: 0.570, base: 0.559, n: 2664 } },
  F1: { angoli: { soglia: 9.5, nostra: 0.518, base: 0.522, n: 3400 }, cartellini: { soglia: 3.5, nostra: 0.546, base: 0.519, n: 3400 } },
  F2: { angoli: { soglia: 8.5, nostra: 0.565, base: 0.542, n: 3036 }, cartellini: { soglia: 3.5, nostra: 0.540, base: 0.517, n: 3036 } },
  N1: { angoli: { soglia: 10.5, nostra: 0.543, base: 0.547, n: 2645 }, cartellini: { soglia: 2.5, nostra: 0.557, base: 0.575, n: 2645 } },
  N2: { angoli: { soglia: 9.5, nostra: 0.547, base: 0.560, n: 2276 }, cartellini: { soglia: 2.5, nostra: 0.588, base: 0.605, n: 2276 } },
  P1: { angoli: { soglia: 9.5, nostra: 0.537, base: 0.523, n: 2697 }, cartellini: { soglia: 4.5, nostra: 0.555, base: 0.576, n: 2697 } },
  T1: { angoli: { soglia: 9.5, nostra: 0.508, base: 0.506, n: 2964 }, cartellini: { soglia: 4.5, nostra: 0.530, base: 0.529, n: 2964 } },
  B1: { angoli: { soglia: 9.5, nostra: 0.511, base: 0.537, n: 2520 }, cartellini: { soglia: 3.5, nostra: 0.562, base: 0.566, n: 2520 } },
  SC0: { angoli: { soglia: 10.5, nostra: 0.551, base: 0.537, n: 2205 }, cartellini: { soglia: 3.5, nostra: 0.548, base: 0.514, n: 2205 } },
  UCL: { angoli: { soglia: 9.5, nostra: 0.540, base: 0.531, n: 1112 }, cartellini: { soglia: 3.5, nostra: 0.522, base: 0.506, n: 1112 } },
  UEL: { angoli: { soglia: 9.5, nostra: 0.523, base: 0.521, n: 1125 }, cartellini: { soglia: 4.5, nostra: 0.567, base: 0.574, n: 1125 } },
  UECL: { angoli: { soglia: 9.5, nostra: 0.543, base: 0.538, n: 208 }, cartellini: { soglia: 4.5, nostra: 0.534, base: 0.553, n: 208 } },
  JPN1: { angoli: { soglia: 9.5, nostra: 0.556, base: 0.529, n: 753 }, cartellini: { soglia: 2.5, nostra: 0.571, base: 0.551, n: 753 } },
}

/**
 * Il giudizio su una competizione, già pronto da leggere: `null` quando di
 * quella competizione non si è misurato niente.
 * ⚠️ `utile` è **falso anche in pareggio**: battere la base di zero punti vuol
 * dire non servire, e arrotondare in su una differenza che non c'è sarebbe
 * esattamente il modo di farsi credere.
 */
export function giudizio(div, mercato) {
  const m = MISURA[div]?.[mercato]
  if (!m) return null
  return { ...m, utile: m.nostra > m.base, scarto: m.nostra - m.base }
}
