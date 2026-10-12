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

export const BASE_DEFAULT = 'tiri'
export const SOGLIE_OVER = [0, 1, 2, 3]   // over 0,5 · 1,5 · 2,5 · 3,5

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
    // GG = entrambe segnano almeno un gol. Qui l'indipendenza pesa di più che
    // sull'over, perché moltiplica due probabilità invece di sommare due medie.
    gg: (1 - Math.exp(-lambdaCasa)) * (1 - Math.exp(-lambdaFuori)),
    attacco: { casa: attC, trasferta: attT },
    difesa: { casa: difC, trasferta: difT },
    media,
    pesi: c.pesi,
  }
}
