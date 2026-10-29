import { pOver, mercatoOver } from './gol.js'
import { probabilita } from './attendibilita.js'
import { eDerby } from './derby.js'

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

// ── LA VERSIONE 2: il mercato dei gol e la dispersione (29/10/2026) ─────────
//
// ⚠️⚠️ **Da dove viene.** Yip, Zou, Hung e Yiu, *Forecasting number of corner
// kicks taken in association football using compound Poisson distribution*
// (Journal of the Operational Research Society, 2024; arXiv 2112.13001).
// Due cose che il modello qui sopra non fa:
//   1. **legge il mercato**: dalle quote 1X2 e over/under dei gol ricava i
//      gol totali attesi e lo sbilanciamento fra le due squadre. Una partita
//      da tanti gol, o una con una squadra che assedia, fa angoli diversi — e
//      il prezzo lo sa prima dello storico;
//   2. **non usa Poisson**: gli angoli arrivano a grappoli (uno ne porta un
//      altro), e la varianza è più larga della media. La binomiale negativa
//      lo ammette con un parametro, `k`: grande = quasi Poisson.
// ⚠️ I coefficienti NON si scrivono a mano: li stima il banco di prova
// camminando nel tempo (`btscout/scripts/prova-conteggi-v2.js --tabella`) e
// li stampa nella forma di `COEFFICIENTI`.

/**
 * I due numeri che il mercato dice sulla partita, dalle quote di APERTURA
 * (`avg_ap_*`: quelle che esistono quando si decide — in `partite` le
 * `avg_*` senza `_ap` sono di chiusura, ed è la trappola nota).
 * `tg`: i gol totali attesi, cioè il λ di Poisson che dà all'over 2,5 la
 * probabilità del mercato. `sbil`: |ln(p1/p2)|, 0 = partita equilibrata.
 * `null` se mancano le quote.
 */
export function ingressiMercato(r) {
  const pOv = mercatoOver(r, 2.5)
  const p = probabilita(Number(r?.avg_ap_1), Number(r?.avg_ap_x), Number(r?.avg_ap_2))
  if (pOv == null || !p || !(p.p1 > 0) || !(p.p2 > 0)) return null
  // P(almeno 3 gol) cresce con λ: si cerca per bisezione.
  let lo = 0.2, hi = 8
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (pOver(2, m) < pOv) lo = m; else hi = m }
  return { tg: (lo + hi) / 2, sbil: Math.abs(Math.log(p.p1 / p.p2)) }
}

/**
 * Il totale atteso della versione 2: il totale del modello storico
 * (`atteso().totale`) corretto dal mercato, con i coefficienti della
 * competizione. `log μ = b0 + b1·log(storico) + b2·tg + b3·sbil [+ b4·derby]`.
 * ⚠️ `b4` c'è **solo sui cartellini** (29/10/2026): nei derby i gialli
 * sono il 20% in più, e dentro il modello il log score passa da +1,71% a
 * +1,85%. Sugli angoli il derby non cambia niente (×0,98) e il coefficiente
 * non esiste.
 */
export function attesoV2(totaleStorico, mercato, coeff, derby = false) {
  if (!coeff || !mercato || !(totaleStorico > 0)) return null
  const [b0, b1, b2, b3, b4 = 0] = coeff.b
  return Math.exp(b0 + b1 * Math.log(totaleStorico) + b2 * mercato.tg + b3 * mercato.sbil + (derby ? b4 : 0))
}

/**
 * P(totale > soglia) con la binomiale negativa di media `mu` e dispersione
 * `k` (varianza `mu + mu²/k`). Con `k` infinito è Poisson, e si passa da
 * `pOltre` — una Poisson sola nel repo.
 */
export function pOltreNB(soglia, mu, k) {
  if (!Number.isFinite(k) || k <= 0) return pOltre(soglia, mu)
  const q = k / (k + mu)
  let px = Math.pow(q, k), sotto = 0
  for (let x = 0; x <= Math.floor(soglia); x++) {
    sotto += px
    px *= (x + k) / (x + 1) * (1 - q)
  }
  return Math.max(0, 1 - sotto)
}

/**
 * ⚠️⚠️ **I coefficienti della versione 2, per competizione.** STAMPATI da
 * `btscout/scripts/prova-conteggi-v2.js --tabella` (29/10/2026), stimati su
 * tutte le partite con quote di apertura (dalla 2019/20) e con le regole di
 * `conteggi_dati`: non si ritoccano a mano. `b` sono [b0, b1, b2, b3] di
 * `attesoV2`, `k` la dispersione della binomiale negativa.
 * ⚠️ Solo i quindici campionati di football-data: le coppe non hanno lo
 * storico delle quote di apertura, e lì resta il modello di prima.
 */
export const COEFFICIENTI = {
  E0: { angoli: { b: [1.6616, 0.2040, 0.0675, 0.0013], k: 68.8, n: 2665 }, cartellini: { b: [0.3152, 0.5961, 0.1085, -0.1237, 0.1658], k: 71.6, n: 2665 } },
  E1: { angoli: { b: [1.3162, 0.3063, 0.1109, 0.0022], k: 101.6, n: 3865 }, cartellini: { b: [0.4650, 0.4308, 0.1124, -0.0545, 0.2291], k: 83.5, n: 3865 } },
  I1: { angoli: { b: [0.9819, 0.4823, 0.0597, 0.0193], k: 44.3, n: 2662 }, cartellini: { b: [0.4897, 0.6898, 0.0244, -0.1287, 0.0817], k: Infinity, n: 2662 } },
  I2: { angoli: { b: [1.0823, 0.3983, 0.1113, 0.0133], k: 68.6, n: 2503 }, cartellini: { b: [1.0983, 0.5240, -0.1294, -0.0339, 0.1488], k: Infinity, n: 2503 } },
  SP1: { angoli: { b: [1.2966, 0.3120, 0.0951, -0.0057], k: 70.5, n: 2678 }, cartellini: { b: [1.1394, 0.5239, -0.1382, -0.0610, 0.2030], k: 35.6, n: 2678 } },
  SP2: { angoli: { b: [1.6916, 0.1272, 0.1067, -0.0084], k: 95.3, n: 3146 }, cartellini: { b: [0.8067, 0.4677, 0.0347, -0.0618, 0.1214], k: 950.4, n: 3146 } },
  D1: { angoli: { b: [1.3309, 0.2869, 0.1023, -0.0296], k: 67.1, n: 2118 }, cartellini: { b: [1.0540, 0.3821, -0.0373, -0.1179, -0.0459], k: 41.2, n: 2118 } },
  D2: { angoli: { b: [1.7745, 0.1308, 0.0805, 0.0014], k: 92.4, n: 2089 }, cartellini: { b: [0.7612, 0.4273, 0.0336, -0.0524, 0.2041], k: Infinity, n: 2089 } },
  F1: { angoli: { b: [1.9450, 0.1119, 0.0178, 0.0105], k: 63.2, n: 2336 }, cartellini: { b: [1.0000, 0.4380, -0.0741, -0.0740, 0.1943], k: Infinity, n: 2336 } },
  F2: { angoli: { b: [1.1135, 0.3507, 0.1360, -0.0309], k: 71.5, n: 2311 }, cartellini: { b: [1.4191, 0.3433, -0.2243, -0.0247, 0.0000], k: Infinity, n: 2311 } },
  P1: { angoli: { b: [1.2965, 0.3834, 0.0425, 0.0013], k: 51.6, n: 2128 }, cartellini: { b: [1.0500, 0.4978, -0.0735, -0.0451, 0.3215], k: 44.5, n: 2128 } },
  N1: { angoli: { b: [1.5456, 0.2117, 0.0914, -0.0021], k: 68.7, n: 2084 }, cartellini: { b: [0.9649, 0.1560, 0.0175, -0.1043, 0.1419], k: 19.4, n: 2084 } },
  T1: { angoli: { b: [1.6677, 0.1452, 0.0910, 0.0138], k: 79.8, n: 2411 }, cartellini: { b: [1.0422, 0.3935, -0.0464, -0.0119, 0.3940], k: 21.2, n: 2411 } },
  B1: { angoli: { b: [1.7592, 0.0933, 0.1173, -0.0168], k: 87.4, n: 2091 }, cartellini: { b: [0.9513, 0.3434, -0.0070, -0.0691, 0.1556], k: 87.5, n: 2091 } },
  SC0: { angoli: { b: [1.1611, 0.4223, 0.0665, 0.0199], k: 76.5, n: 1589 }, cartellini: { b: [0.6740, 0.4498, 0.0528, -0.1232, 0.0726], k: Infinity, n: 1589 } },
}
/**
 * Quanto vale la versione 2, competizione per competizione: **misurato
 * camminando nel tempo** (coefficienti stimati solo sulle stagioni prima),
 * sulla soglia con la base più vicina al 50% — la stessa forma di `MISURA`.
 * Sul totale dei quindici campionati (29/10/2026): log score **+0,55%**
 * meglio di chi dice la frequenza della lega sugli angoli (il modello di prima
 * era **−0,67%, peggio**) e **+1,85%** sui cartellini col derby (prima
 * +0,86%).
 */
export const MISURA_V2 = {
  E0: { angoli: { soglia: 10.5, nostra: 0.547, base: 0.545, n: 2303 }, cartellini: { soglia: 3.5, nostra: 0.571, base: 0.502, n: 2303 } },
  E1: { angoli: { soglia: 9.5, nostra: 0.527, base: 0.536, n: 3325 }, cartellini: { soglia: 3.5, nostra: 0.519, base: 0.510, n: 3325 } },
  I1: { angoli: { soglia: 9.5, nostra: 0.539, base: 0.536, n: 2294 }, cartellini: { soglia: 4.5, nostra: 0.590, base: 0.582, n: 2294 } },
  I2: { angoli: { soglia: 9.5, nostra: 0.529, base: 0.507, n: 2156 }, cartellini: { soglia: 4.5, nostra: 0.578, base: 0.568, n: 2156 } },
  SP1: { angoli: { soglia: 9.5, nostra: 0.563, base: 0.541, n: 2304 }, cartellini: { soglia: 4.5, nostra: 0.570, base: 0.502, n: 2304 } },
  SP2: { angoli: { soglia: 9.5, nostra: 0.564, base: 0.556, n: 2713 }, cartellini: { soglia: 4.5, nostra: 0.543, base: 0.548, n: 2713 } },
  D1: { angoli: { soglia: 9.5, nostra: 0.535, base: 0.502, n: 1824 }, cartellini: { soglia: 3.5, nostra: 0.582, base: 0.533, n: 1824 } },
  D2: { angoli: { soglia: 9.5, nostra: 0.548, base: 0.546, n: 1809 }, cartellini: { soglia: 4.5, nostra: 0.551, base: 0.545, n: 1809 } },
  F1: { angoli: { soglia: 9.5, nostra: 0.505, base: 0.529, n: 2063 }, cartellini: { soglia: 3.5, nostra: 0.558, base: 0.532, n: 2063 } },
  F2: { angoli: { soglia: 8.5, nostra: 0.532, base: 0.523, n: 2060 }, cartellini: { soglia: 3.5, nostra: 0.549, base: 0.510, n: 2060 } },
  P1: { angoli: { soglia: 9.5, nostra: 0.521, base: 0.501, n: 1834 }, cartellini: { soglia: 5.5, nostra: 0.576, base: 0.569, n: 1834 } },
  N1: { angoli: { soglia: 9.5, nostra: 0.551, base: 0.550, n: 1858 }, cartellini: { soglia: 2.5, nostra: 0.560, base: 0.564, n: 1858 } },
  T1: { angoli: { soglia: 9.5, nostra: 0.528, base: 0.507, n: 2117 }, cartellini: { soglia: 4.5, nostra: 0.558, base: 0.546, n: 2117 } },
  B1: { angoli: { soglia: 9.5, nostra: 0.529, base: 0.539, n: 1859 }, cartellini: { soglia: 3.5, nostra: 0.560, base: 0.552, n: 1859 } },
  SC0: { angoli: { soglia: 10.5, nostra: 0.541, base: 0.522, n: 1410 }, cartellini: { soglia: 3.5, nostra: 0.552, base: 0.510, n: 1410 } },
}
/**
 * La previsione completa di una partita: versione 2 se la competizione ha i
 * coefficienti **e** la partita ha le quote di apertura, altrimenti quella di
 * prima. Torna `{ totale, soglia, p, v2, voto }` — `voto` è il giudizio
 * della versione che ha risposto, così la card non può dire il numero di una
 * e la fiducia dell'altra.
 */
export function previsione(p, mercato, a) {
  const coeff = COEFFICIENTI[p?.div]?.[mercato]
  const m = coeff ? ingressiMercato(p) : null
  const mu = m ? attesoV2(a.totale, m, coeff, eDerby(p)) : null
  if (mu) {
    const soglia = sogliaCentrale(mercato, mu)
    const v = MISURA_V2[p.div][mercato]
    return { totale: mu, soglia, p: pOltreNB(soglia, mu, coeff.k), v2: true,
      voto: { ...v, utile: v.nostra > v.base, scarto: v.nostra - v.base } }
  }
  const soglia = sogliaCentrale(mercato, a.totale)
  return { totale: a.totale, soglia, p: pOltre(soglia, a.totale), v2: false, voto: giudizio(p?.div, mercato) }
}
