import { parametri, pesiStrati, MIN_PARTITE } from './vpm.js'

// I GOL ATTESI di una partita, e quello che ne discende: over x,5 e Goal/NoGoal.
//
// Nato il 12/10/2026 da due richieste di Mattia che sono **la stessa cosa**:
// "un indicatore over x,5, una stima sul numero di reti previste" e "un
// indicatore Goal/NoGoal". Un modello solo li produce entrambi.
//
// ⚠️ **Non usa nessuna quota, ed è voluto** — Mattia: *"non mi interessa un
// match con le quote"*. Per l'over 2,5 il mercato ci sarebbe, per il GG/NG no
// (nessuna colonna in nessuna delle due tabelle). Questo è un indicatore
// **delle squadre**, come VPM: dice cosa dice il campo, non cosa dice il book.
//
// Il modello è il più semplice che funzioni, ed è quello classico della
// letteratura: quanti gol segna una squadra, quanti ne concede l'altra, pesati
// per la media del campionato. Niente xG (non li abbiamo), niente Dixon-Coles.
//
//   forza d'attacco di A   = gol fatti da A per partita    / media del campionato
//   debolezza difensiva B  = gol subiti da B per partita   / media del campionato
//   λA = attacco(A) × difesa(B) × media        ← gol attesi di A
//
// ⚠️ Le tre finestre e i loro pesi sono **gli stessi di VPM** (stagione 45% ·
// forma 30% · ruolo 25%, con il peso in proporzione alle partite disponibili):
// scelta di Mattia, e tiene i due indicatori confrontabili. Per la squadra di
// casa il ruolo è "casa", per l'altra "fuori".

// ⚠️ **LA STRETTA VERSO LA MEDIA — senza, il modello è inutilizzabile.**
// Misurato il 12/10/2026 su 10.059 partite: la prima versione prevedeva 1,79
// gol dove ne arrivavano 2,55, e 3,75 dove ne arrivavano 2,99. L'ordine era
// giusto ma l'ampiezza tripla del vero.
// Il motivo è che `attacco × difesa` moltiplica **due rapporti stimati su 5-10
// partite**: il rumore di uno si moltiplica col rumore dell'altro.
// La cura è tirare ogni rapporto verso 1 (la media del campionato) tanto più
// quanto poche partite ha la squadra:
//
//     rapporto corretto = 1 + (rapporto − 1) × n / (n + K)
//
// Con n = partite giocate. A K partite di storia la squadra "pesa" metà sé
// stessa e metà la media. ⚠️ **K è misurato, non scelto**: `prova-gol.js --k=`
// lo fa variare e guarda l'errore.
export const K_STRETTA = 20
// ⚠️ **La base migliore sono i TIRI IN PORTA, non i gol** — misurato il
// 12/10/2026 su 10.059 partite: col modello sui tiri l'informazione aggiunta
// raddoppia (+0,0022 contro +0,0013 dei gol, sull'errore quadratico medio
// rispetto a "prevedere sempre la media"). Un gol è un evento fortunato,
// cinque tiri in porta a partita no. K = 20 sta al centro di un plateau
// (15-30 danno lo stesso), quindi non è un numero scelto col cesello.

/** Poisson: la probabilità di esattamente k gol con media λ. */
function poisson(k, lambda) {
  let f = 1
  for (let i = 2; i <= k; i++) f *= i
  return Math.exp(-lambda) * Math.pow(lambda, k) / f
}

/** P(più di `soglia` gol in totale), con soglia intera: over 0,5 → soglia 0. */
export function pOver(soglia, lambdaTotale) {
  let sotto = 0
  for (let k = 0; k <= soglia; k++) sotto += poisson(k, lambdaTotale)
  return 1 - sotto
}

// ── IL GOAL / NO GOAL ───────────────────────────────────────────────────────
// ⚠️ Il prodotto di due Poisson indipendenti è **troppo sicuro di sé**, e la
// misura lo dice: su 34.434 partite dichiarava 68% dove arrivava il 63%, e 37%
// dove arrivava il 45%. L'ordine era giusto, l'ampiezza più larga del vero —
// lo stesso difetto che K_STRETTA cura sui gol attesi, e la stessa causa: un
// prodotto di rapporti stimati su 5-10 partite moltiplica i rumori.
// ⚠️ La cura è **una sola costante**, non una tabella: tirando la probabilità
// verso la frequenza media con fattore 0,55 si riproduce tutta la tabella
// empirica entro **0,62 punti** su nove fasce. Dopo la cura il numero non
// mente più: dichiara 46,2 → arriva 46,3 · 51,4 → 51,6 · 56,4 → 55,9 ·
// 61,3 → 62,1. ⚠️ Misurato il 12/10/2026 con `btscout/scripts/prova-gg.js`;
// come le ANCORE di VPM si rimisura solo per aggiungere una stagione.
export const STRETTA_GG = 0.55
// La frequenza del GG su tutto l'archivio: 8 stagioni, 15 campionati.
// ⚠️ È **fissa di proposito**, e la misura lo impone: col centro mobile (la
// frequenza del campionato in corso) l'indicatore prevede PEGGIO (+0,0008
// contro +0,0015), perché a ottobre quella frequenza è ancora rumore.
export const GG_MEDIO = 0.532
// ⚠️ Sotto questa fiducia l'indicatore **non dà un verdetto**, e il motivo è
// misurato: fra il 50 e il 55% di fiducia il consiglio è giusto il 52,2% delle
// volte, cioè quanto dire sempre GOL (53,2%). Da 55 a 60% sale a 56,8%, sopra
// il 60% a 62,0%. Un indicatore di visione deve poter dire "in bilico": dare
// un verdetto dove non c'è informazione è il modo di non essere creduto quando
// invece ce n'è.
export const FIDUCIA_GG = 0.55

/**
 * Il consiglio sul Goal/NoGoal, con la sua fiducia.
 * @returns {{esito: 'GOL'|'NO GOL'|null, p: number, fiducia: number}}
 *   `esito` è `null` quando la partita è in bilico — e va mostrato come tale.
 */
export function consiglioGg(gg) {
  if (gg == null) return null
  const fiducia = Math.max(gg, 1 - gg)
  const gol = gg >= 0.5
  return {
    esito: fiducia < FIDUCIA_GG ? null : (gol ? 'GOL' : 'NO GOL'),
    // ⚠️ `p` è la probabilità **del lato consigliato**, non quella del GG: su
    // NO GOL sono due numeri diversi (58% e 42%), e mostrare il secondo
    // accanto alla parola NO GOL direbbe il contrario di quello che si vuole.
    p: fiducia,
    // la riga di `BASI_GOL` a cui confrontarsi, perché il consiglio porti con
    // sé il suo metro invece di farlo cercare a chi legge
    chiave: gol ? 'gg' : 'ng',
    fiducia,
  }
}

// ── IL GRADIENTE DELLE CELLE ────────────────────────────────────────────────
// ⚠️ **La regola viene da un esempio di Mattia** (12/10/2026): *"con over 2,5
// abbiamo il 64%: 0-40 rosso, 40-54 giallo, 54-60 verdino, 60 in su verde
// brillante"*. Quei tre tagli, sulla base del 51%, sono esattamente:
//    giallo  = base − 20% dello spazio **sotto** la base
//    verdino = base +  6% dello spazio **sopra** la base
//    verde   = base + 20% dello spazio **sopra** la base
//
// ⚠️⚠️ **Gli scarti sono in proporzione allo spazio disponibile, non in punti
// fissi**, ed è la cosa che fa funzionare la scala su tutte e dieci le righe:
// l'over 0,5 ha base 92,9% e sopra gli restano sette punti, quindi
// "base + 10 punti" non esisterebbe nemmeno. In proporzione, invece, ogni riga
// ha le sue quattro fasce.
//
// ⚠️ **Le basi sono misurate**, non stimate: 33.141 partite in otto stagioni
// dalla 5ª giornata (`btscout/scripts/prova-indicatori.js`). Si rimisurano solo
// per aggiungere una stagione, come le ANCORE di VPM.
//
// ⚠️ **Verificato che le fasce vogliano dire qualcosa** — dentro ognuna, quante
// volte l'esito è arrivato davvero (rosso · giallo · verdino · verde):
//    over 1,5   65% · 73% · 78% · 83%      over 2,5   41% · 49% · 58% · 62%
//    under 2,5  38% · 45% · 54% · 59%      under 3,5  56% · 68% · 75% · 78%
//    Goal       48% · 52% · 59% · 68%      over 3,5   22% · 28% · 35% · 44%
// Sale su ogni riga, senza scalini al contrario: è questo che rende il colore
// leggibile a colpo d'occhio invece che decorativo.
//
// ⚠️⚠️ **Il verde dice "più del solito", NON "giocata vincente".** Sono due
// cose diverse e vanno tenute separate: l'over 3,5 in fascia verde arriva il
// 44% delle volte — più del suo 28,7% abituale, e comunque una giocata che
// perde più di quanto vince. Le uniche righe in cui il verde è **anche** una
// giocata che ha funzionato (sopra il 70%) sono **over 0,5, over 1,5 e
// under 3,5**: le altre non ci arrivano a nessuna soglia.
export const BASI_GOL = {
  'over0': 0.929, 'over1': 0.754, 'over2': 0.510, 'over3': 0.287,
  'under0': 0.071, 'under1': 0.246, 'under2': 0.490, 'under3': 0.713,
  'gg': 0.533, 'ng': 0.467,
}

/** Le tre soglie del gradiente per una riga, dalla sua base. */
export function tagliGol(chiave) {
  const base = BASI_GOL[chiave]
  if (base == null) return null
  return {
    base,
    giallo: base - 0.20 * base,
    verdino: base + 0.06 * (1 - base),
    verde: base + 0.20 * (1 - base),
  }
}

/**
 * In quale fascia sta un numero: `'verde'`, `'verdino'`, `'giallo'` o `'rosso'`.
 */
export function fasciaGol(chiave, p) {
  const t = tagliGol(chiave)
  if (!t || p == null) return null
  // ⚠️ Si decide sul numero ARROTONDATO, quello che la persona legge. Col
  // valore pieno una cella può mostrare "93%" e stare nella fascia sotto
  // perché sotto c'è 0,9299: il colore smentisce la cifra che ha accanto, e
  // chi guarda conclude che il colore è rotto. Trovato da Mattia il 12/10.
  const letto = Math.round(p * 100) / 100
  return letto >= t.verde ? 'verde' : letto >= t.verdino ? 'verdino' : letto >= t.giallo ? 'giallo' : 'rosso'
}

/**
 * L'intervallo centrale dei gol totali: `{ da, a, copertura }`.
 * Risponde a "quanti gol aspettarsi", che è la domanda di chi legge — mentre
 * `3,01 in tutto` è una media, e una media di gol non si vede mai in campo
 * (non esistono partite da 3,01 gol).
 *
 * ⚠️ È la dispersione di Poisson attorno a λ, **non** l'incertezza sul nostro
 * λ: dice "con questa aspettativa i risultati si sparpagliano così", non "la
 * mia stima è precisa entro questo". Le due si sommerebbero, quindi
 * l'intervallo vero è semmai un filo più largo.
 * ⚠️ `copertura` è **verificata**: su 10.059 partite dichiara 67,9% e si avvera
 * 67,9% ±0,9 (`btscout/scripts/prova-gol.js`). Va mostrata accanto —
 * un intervallo senza quanto spesso si avvera non si può leggere.
 */
export function intervalloGol(lambdaTotale, quota = 0.25) {
  if (lambdaTotale == null) return null
  let cum = 0, da = null, a = 0
  for (let k = 0; k <= 15; k++) {
    const prima = cum
    cum += poisson(k, lambdaTotale)
    if (da === null && cum >= quota) da = k
    if (prima < 1 - quota) a = k
    if (cum >= 1 - quota) break
  }
  let copertura = 0
  for (let k = da; k <= a; k++) copertura += poisson(k, lambdaTotale)
  return { da, a, copertura }
}

export const BASE_DEFAULT = 'tiri'
export const SOGLIE_OVER = [0, 1, 2, 3]   // over 0,5 · 1,5 · 2,5 · 3,5

/**
 * ⚠️⚠️ **Un pavimento per riga, non uno per tutte** (15/10/2026, su richiesta
 * di Mattia: *"se il 2,5 supera una certa % vorrei consigliasse over 2,5"*).
 *
 * Il 70% dell'over 1,5 è **la soglia che diede Mattia il 12/10** per accendere
 * il verde (*"70% per gli OVER e UNDER e 65% per il goal"*), e resta. Ma sul
 * 2,5 il 70% è quasi inarrivabile — succede 221 volte su 33.284 — quindi quella
 * riga non verrebbe mai consigliata: il suo pavimento è **65%**.
 *
 * ⚠️⚠️ **3,5 e under 1,5 NON si consigliano, ed è una misura, non una
 * dimenticanza.** Provati tutti i pavimenti: con 45% l'over 3,5 viene
 * consigliato 813 volte e si avvera il **45%**; alzandolo al 50% scende a 188
 * volte col **49%**; al 55% sono 40 volte in otto stagioni. L'under 1,5 fa
 * **36%**. Non esiste un pavimento dove quelle righe siano *insieme*
 * consigliabili e frequenti: quando avrebbe senso dirlo non succede mai, e
 * quando succede è una monetina. **Un consiglio che si avvera meno di metà
 * delle volte non è un consiglio.** Per riaccenderle basta aggiungerle qui.
 */
export const PAVIMENTI_OVER = {
  over1: 0.70, under1: null,
  over2: 0.65, under2: 0.65,
  over3: null,  under3: 0.70,
}

/**
 * La probabilità dell'over 2,5 **secondo il mercato**, dalle quote di una riga.
 * `null` quando quelle due quote non ci sono.
 *
 * ⚠️⚠️ **Questo numero esisteva in archivio da sempre e non lo usavamo.** Le
 * colonne `*_over25` stanno in `partite` e `prossime_partite` dal primo import
 * (football-data le pubblica), e il modello dei gol è stato costruito e
 * misurato *senza quote* per scelta di Mattia (12/10/2026). Il 15/10 la misura
 * ha detto quanto costava quella scelta: sul Brier dell'over 2,5 il mercato
 * aggiunge **+0,0093** contro i nostri **+0,0039**, e il consiglio sul 2,5
 * passa dal **63%** al **71%** di volte giuste. Il modello resta la *lettura*
 * della partita; il prezzo è un'informazione che non possiamo rifiutare.
 *
 * ⚠️ **Si normalizza**, perché le due quote contengono il margine del banco:
 * `1/over` e `1/under` sommano a ~1,05. Confrontare una probabilità implicita
 * non normalizzata col nostro modello è l'errore che `btscout/CLAUDE.md`
 * chiama "misurare la commissione del banco".
 * ⚠️ Si usano le quote di **apertura** (`avg_ap_*`): sono quelle che esistono
 * quando si decide. In `partite` le `avg_*` senza `_ap` sono di chiusura.
 */
export function mercatoOver25(r) {
  const o = Number(r?.avg_ap_over25), u = Number(r?.avg_ap_under25)
  if (!(o > 1) || !(u > 1)) return null
  return (1 / o) / (1 / o + 1 / u)
}

/**
 * Il consiglio su over/under: `{ esito, p, chiave, fonte }`, `esito: null`
 * quando nessuna riga passa il suo pavimento.
 *
 * ⚠️ `pMercato` è la probabilità dell'over 2,5 secondo le quote: quando c'è
 * **prende il posto della nostra** sulle righe 2,5, e solo su quelle — sulle
 * altre soglie il mercato non ce l'abbiamo (football-data pubblica il 2,5 e
 * nient'altro). `fonte` dice chi ha parlato, e va mostrato: un consiglio del
 * mercato e uno nostro non valgono lo stesso, e far credere il contrario è
 * peggio che non averlo.
 *
 * ⚠️⚠️ **La regola è "la più AMBIZIOSA che regge", non "la più probabile".**
 * È il cambio del 15/10/2026 e senza di lui l'over 2,5 non sarebbe mai
 * consigliabile: `p(over 1,5) > p(over 2,5) > p(over 3,5)` **sempre**, per
 * costruzione, quindi scegliendo la più probabile vince eternamente l'1,5.
 * Ambiziosa = **base più bassa** (`BASI_GOL`): l'over 2,5 arriva da solo il
 * 51,0% delle volte contro il 75,4% dell'1,5, quindi dirlo è dire di più.
 *
 * ⚠️ **Cosa costa, misurato su 33.284 partite** (otto stagioni, camminando nel
 * tempo, `btscout/scripts/prova-consiglio-gol.js`): il consiglio passa da
 * **77,4% a 75,5%** di volte giuste, perché su ~2.800 partite dice 2,5 invece
 * di 1,5 e lì ha ragione il 62-64%. **Lo scarto sulla riga consigliata resta
 * +4,8 ±0,5** — il modello non è peggiorato, sta dicendo una cosa più difficile.
 * ⚠️ Lo 0,5 resta fuori: over 0,5 arriva il 92,9% delle volte da solo, e
 * "giocati che si segna un gol" non è un consiglio.
 */
export function consiglioOver(over, pMercato = null) {
  if (!over) return null
  let meglio = null
  for (const s of SOGLIE_OVER) {
    const daMercato = s === 2 && pMercato != null
    const p = daMercato ? pMercato : over[s]
    if (p == null) continue
    for (const [verso, prob] of [['over', p], ['under', 1 - p]]) {
      const chiave = `${verso}${s}`
      const pavimento = PAVIMENTI_OVER[chiave]
      if (pavimento == null || prob < pavimento) continue
      if (!meglio || BASI_GOL[chiave] < BASI_GOL[meglio.chiave])
        meglio = { esito: `${verso.toUpperCase()} ${s},5`, p: prob, chiave, fonte: daMercato ? 'mercato' : 'modello' }
    }
  }
  return meglio || { esito: null, p: null, chiave: null, fonte: null }
}

/**
 * Le medie di un campionato per squadra per partita: gol e tiri in porta.
 * Servono come metro — "attacco 1,20" vuol dire il 20% sopra la media di QUEL
 * campionato, e la Scozia non segna come la Bundesliga.
 */
export function medieCampionato(squadreDelDiv) {
  let gol = 0, tiri = 0, partite = 0
  for (const finestre of Object.values(squadreDelDiv || {})) {
    const st = finestre?.stagione
    if (!st?.n) continue
    gol += st.gf; tiri += st.tf; partite += st.n
  }
  return partite ? { gol: gol / partite, tiri: tiri / partite } : null
}

/** Gol fatti e subiti per partita di una squadra, coi tre strati già fusi. */
function ritmo(finestre, dove) {
  const st = parametri(finestre?.stagione)
  if (!st || st.n < MIN_PARTITE) return null
  const fo = parametri(finestre.forma), ru = parametri(finestre[dove])
  const p = pesiStrati(fo?.n, ru?.n)
  const fondi = (c) => p.stagione * st[c] + p.forma * (fo?.[c] ?? 0) + p.ruolo * (ru?.[c] ?? 0)
  return { fatti: fondi('gf'), subiti: fondi('gs'),
           tiriFatti: fondi('tf'), tiriSubiti: fondi('tc'), pesi: p, n: st.n }
}

/**
 * I gol attesi di una partita. `squadre` è il blocco di `vpm_dati()` per quel
 * campionato; `casa` e `trasferta` sono i nomi.
 *
 * ⚠️ Restituisce `null` se una delle due squadre ha meno di `MIN_PARTITE`
 * partite: a inizio stagione non c'è niente da stimare, e un numero prudente
 * sarebbe comunque inventato.
 */
/**
 * `base` sceglie da cosa si stimano attacco e difesa:
 *   'gol'  — i gol fatti e subiti
 *   'tiri' — i tiri in porta fatti e concessi, che sono **meno rumorosi**
 *            (un gol è un evento fortunato, cinque tiri in porta a partita no)
 *   'misto'— la media dei due
 * ⚠️ Quale sia il migliore **si misura**: `prova-gol.js --base=`. Vince 'tiri'.
 */
export function golAttesi(squadre, casa, trasferta, mediaData = null, k = K_STRETTA, base = BASE_DEFAULT, mediaTiri = null) {
  // `mediaData` serve a chi cammina nel tempo (gli script storici): ricalcolare
  // la media del campionato a ogni partita costerebbe un giro su tutte le
  // squadre, e il risultato è lo stesso.
  const medie = medieCampionato(squadre)
  const media = mediaData ?? medie?.gol
  const mTiri = mediaTiri ?? medie?.tiri
  const c = ritmo(squadre?.[casa], 'casa')
  const t = ritmo(squadre?.[trasferta], 'fuori')
  if (!media || !c || !t) return null

  // attacco e difesa in rapporto alla media: 1,00 = come il campionato.
  // Poi la stretta, che è ciò che rende il modello utilizzabile.
  const str = (r, n) => 1 + (r - 1) * n / (n + k)
  // I rapporti si possono prendere dai gol o dai tiri in porta: la scala
  // cambia (si divide per la media di quella grandezza), il significato no —
  // "quanto questa squadra sta sopra o sotto la media del campionato".
  const rap = (sq, campo, mediaBase) => (mediaBase ? sq[campo] / mediaBase : 1)
  const daGol = sq => [rap(sq, 'fatti', media), rap(sq, 'subiti', media)]
  const daTiri = sq => (mTiri ? [rap(sq, 'tiriFatti', mTiri), rap(sq, 'tiriSubiti', mTiri)] : daGol(sq))
  const mix = sq => { const g = daGol(sq), t2 = daTiri(sq); return [(g[0] + t2[0]) / 2, (g[1] + t2[1]) / 2] }
  const scegli = base === 'tiri' ? daTiri : base === 'misto' ? mix : daGol
  const [aC, dC] = scegli(c), [aT, dT] = scegli(t)
  const attC = str(aC, c.n), difC = str(dC, c.n)
  const attT = str(aT, t.n), difT = str(dT, t.n)

  const lambdaCasa = attC * difT * media
  const lambdaFuori = attT * difC * media
  const totale = lambdaCasa + lambdaFuori

  // ⚠️ L'over si calcola sul TOTALE, che per somma di due Poisson indipendenti
  // è ancora Poisson. ⚠️ L'indipendenza è un'approssimazione: nella realtà i
  // gol delle due squadre sono un po' correlati (lo 0-0 è più frequente di
  // quanto dica Poisson). È il limite noto del modello, e si vedrà nella
  // calibrazione — non si corregge a sentimento.
  const over = {}
  for (const s of SOGLIE_OVER) over[s] = pOver(s, totale)

  return {
    lambdaCasa, lambdaFuori, totale, over,
    // GG = entrambe segnano almeno un gol, **ristretto verso la media**:
    // l'indipendenza di Poisson pesa qui più che sull'over (moltiplica due
    // probabilità invece di sommare due medie), e senza la stretta il numero
    // dichiara più di quanto mantiene. Vedi STRETTA_GG.
    gg: GG_MEDIO + ((1 - Math.exp(-lambdaCasa)) * (1 - Math.exp(-lambdaFuori)) - GG_MEDIO) * STRETTA_GG,
    // il GG crudo, per chi vuole vedere cosa dice il modello prima della cura
    ggCrudo: (1 - Math.exp(-lambdaCasa)) * (1 - Math.exp(-lambdaFuori)),
    attacco: { casa: attC, trasferta: attT },
    difesa: { casa: difC, trasferta: difT },
    media,
    pesi: c.pesi,
  }
}
