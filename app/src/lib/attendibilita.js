// L'attendibilità di una partita e la giocata suggerita. Solo calcoli, niente
// interfaccia: la usa la pagina Partite e la userà la compilazione delle spin.
//
// Attendibilità = probabilità che la giocata vinca, stimata dal consenso del
// mercato: la media di ~40 book (avg_ap_*) con il margine tolto. Sui favoriti
// il mercato è calibrato, anzi un filo conservativo (+3 punti, misurato). Nessun
// modello e nessun indice di forma lo migliora: misurato anche quello.
// Vedi STATO.md, "La misura che conta" e "Il segnale Como".
//
// Le regole di Mattia (16/09/2026, riviste il 23/09):
//   · si gioca il segno secco, 1 o 2 — mai la X
//   · quota < 1,25  → favorito + over 1,5 (se non basta, over 2,5), e
//     l'attendibilità è quella del segno scontata del fattore over (FATTORE_OVER)
//   · gialli = le più attendibili, blu = sacrificabili, centro = la perfetta
//
// La doppia chance è stata tolta il 23/09: "troppo conservativa". Misurato
// sulle 127 proposte già giocate, le doppie prendevano il 64% ma 25 delle 57
// vinte erano finite in pareggio — si vinceva grazie alla X, non al pronostico.
// Le stesse partite giocate a secco: 45%. Si accetta di prenderne meno,
// giocando quello che si è davvero previsto.
//
// Conseguenza: senza le doppie le probabilità sono molto più basse, e le
// soglie sono state ritarate a mano da Mattia in più giri (75/62/52 →
// 80/74/68 → 78/72/65 → 75/72/65). Il criterio non è "fare una lista lunga"
// ma **riempire da una a tre spin con le migliori**: con 75/72/65, sulle 189
// partite future del 23/09, restano 6 centro, 5 gialle e 16 blu — 27, cioè
// tre spin piene. Si regolano dall'app con la ⚙, questi sono solo i default.

export const REGOLA_OVER = 1.25

// Quando si aggiunge l'over 1,5 non basta che il favorito vinca: servono anche
// due gol. Misurato sull'archivio (rendiconto.js, 1.411 partite dal 19/20):
// fra le volte in cui il favorito ha vinto, il 90,8% aveva almeno due gol.
// Senza questa correzione l'attendibilità dichiarata era 81,1% e la resa
// vera 76,2% — cinque punti di troppo, sempre sulle partite più importanti.
export const FATTORE_OVER = 0.908
export const SOGLIE_DEFAULT = { centro: 0.75, giallo: 0.72, blu: 0.65 }

/** Probabilità normalizzate da una terna di quote: toglie il margine. */
export function probabilita(q1, qx, q2) {
  if (!q1 || !qx || !q2) return null
  const s = 1 / q1 + 1 / qx + 1 / q2
  return { p1: 1 / q1 / s, px: 1 / qx / s, p2: 1 / q2 / s }
}


/**
 * Arricchisce una riga di prossime_partite con attendibilità e giocata.
 * Restituisce { prob: null } se manca il consenso.
 */
// ⚠️⚠️ **Quanto possono discordare le due fonti prima di non crederci più.**
// Trovato da Mattia il 12/10/2026 su **Burgos-Granada**: a schermo un voto del
// **200%**, costruito su un'attendibilità del 65% accanto a una quota 3,00 —
// due numeri che non possono stare insieme. Sotto c'era questo:
//
//   Bet365 (football-data)   2,40  3,10  3,00   → partita equilibrata
//   consenso (The Odds API) 11,88  3,39  1,40   → trasferta straferita
//
// Le tre colonne del consenso (media, massima, exchange) **concordavano fra
// loro**, quindi non era un book impazzito: erano più book su un evento che
// non era quella partita. ESPN conferma che l'accoppiamento Burgos-Granada
// esiste davvero, e tutte le altre dieci partite di Segunda di quei giorni
// hanno `b365 ≈ consenso`. **Dato sbagliato alla fonte, su un evento solo.**
//
// ⚠️ Non si può sapere *quale* delle due ha ragione, e non si deve indovinare:
// quando litigano così, la partita **non si propone**. Misurato: su 308 future
// con entrambe le quote, **una sola** supera questa soglia — il costo di questo
// controllo è una partita, il costo di non averlo era un voto del 200% preso
// per buono.
export const SCARTO_FONTI = 0.15

/**
 * Quanto discordano Bet365 e il consenso sul **chi vince**, da 0 a 1.
 * Si confronta la probabilità del segno 1 **fra 1 e 2** (la X si esclude da
 * entrambe le parti), così il margine diverso dei due prezzi non conta.
 * `null` quando manca una delle due fonti: senza confronto non c'è allarme.
 */
export function scartoFonti(r) {
  if (!r.b365_1 || !r.b365_2 || !r.avg_ap_1 || !r.avg_ap_2) return null
  const quota = (a, b) => (1 / a) / (1 / a + 1 / b)
  return Math.abs(quota(Number(r.b365_1), Number(r.b365_2)) - quota(Number(r.avg_ap_1), Number(r.avg_ap_2)))
}

export function valuta(r) {
  const p = probabilita(r.avg_ap_1, r.avg_ap_x, r.avg_ap_2)
  if (!p) return { ...r, prob: null }

  const segno = p.p1 >= p.p2 ? '1' : '2'          // il favorito fra 1 e 2: la X è esclusa
  const prob = segno === '1' ? p.p1 : p.p2

  // La terna di quote su cui si gioca, in ordine di preferenza.
  // ⚠️ **Bet365 per primo dal 12/10/2026: è il book su cui gioca Mattia.**
  // Prima veniva prima Codere, e su un weekend misurato pagava 2,8 punti meno
  // della massima di mercato — su un sistema che vive in una banda di quattro
  // punti è la differenza fra giocare alla pari e perdere.
  // ⚠️ Bet365 arriva **solo da football-data**, che copre il blocco imminente:
  // The Odds API non lo include (41 bookmaker, nessun Bet365 — verificato).
  // Quindi le partite oltre il weekend in corso cadono su Codere o sulla
  // massima finché il prossimo giro di football-data non le porta.
  // ⚠️ **La seconda scelta è la MEDIA di mercato, non la massima** (12/10/2026,
  // scelta di Mattia). La massima è il miglior prezzo fra 40 book e **non è
  // ottenibile**: usarla gonfiava resa e voto. La media invece è una buona
  // stima di quanto pagherebbe Bet365 — misurato su 11.344 partite, il rapporto
  // Bet365/media ha mediana **100,0%** sulle quote corte e 99,4-99,6% sul resto.
  // ⚠️ **Ma con la media resa e voto non discriminano più.** `resa = quota ×
  // attendibilità`, e l'attendibilità viene **già** dalla media: la formula si
  // semplifica in `1/margine` (mediana 93,8%, da 86% a 100,6%). Dice quanto
  // margine ha preso il book su quella partita, non quanto conviene giocarla.
  // Non è un errore, è la verità: al prezzo medio non c'è vantaggio da nessuna
  // parte. Per questo a schermo **resa e voto si spengono** quando la fonte è
  // la media — `quotaStimata` è il campo che lo dice.
  const terna = r.b365_1 ? { q: [r.b365_1, r.b365_x, r.b365_2], fonte: 'Bet365' }
              : r.avg_ap_1 ? { q: [r.avg_ap_1, r.avg_ap_x, r.avg_ap_2], fonte: 'media' }
              : null
  const [q1, qx, q2] = terna?.q ?? [null, null, null]
  const quotaFonte = terna?.fonte ?? null
  const quota = segno === '1' ? q1 : q2
  const equo = prob ? 1 / prob : null
  const scarto = quota && equo ? quota / equo - 1 : null

  let giocata = segno, quotaGiocata = quota, nota = null
  if (quota && quota < REGOLA_OVER) {
    giocata = `${segno} + over 1,5`
    quotaGiocata = null
    nota = `quota ${quota} sotto ${REGOLA_OVER}: si aggiunge l'over 1,5 (se non basta, over 2,5 @${r.b365_over25 ?? '—'}). La quota combinata va letta sul book.`
  }

  // Sulla combinata la probabilità è quella del segno scontata del fattore
  // misurato: non abbiamo le quote dell'over 1,5, ma abbiamo lo storico.
  const probGiocata = giocata.includes('over') ? prob * FATTORE_OVER : prob

  // La resa attesa: quota × probabilità, cioè quanto torna in media per ogni
  // euro giocato. 1,00 è il pareggio, sopra si guadagna, sotto si perde.
  // Per la combinata con l'over la quota non esiste in nessuna fonte: si stima
  // dividendo quella del segno per il fattore over, cioè assumendo che il book
  // prezzi l'over 1,5 in modo equo. È una stima, e `quotaStimata` lo dice.
  const quotaStimata = giocata.includes('over') && quota ? quota / FATTORE_OVER : null
  const quotaResa = quotaGiocata ?? quotaStimata
  const resa = quotaResa ? quotaResa * probGiocata : null

  // ⚠️ Vero quando la quota non viene da un book vero: resa e voto, che si
  // calcolano da lei, non vanno letti come numeri della partita.
  const quotaDaConsenso = quotaFonte === 'media'

  // ⚠️ Le due fonti litigano troppo: uno dei due prezzi è sbagliato e non
  // sappiamo quale. La partita resta visibile — nasconderla sarebbe peggio,
  // perché nessuno andrebbe a cercare il difetto — ma **non si propone**.
  const scartoQuote = scartoFonti(r)
  const quoteIncoerenti = scartoQuote != null && scartoQuote > SCARTO_FONTI
  return { ...r, p, segno, prob, quota, quotaFonte, quotaDaConsenso, quoteIncoerenti, scartoQuote,
           q1, qx, q2, equo, scarto, giocata, quotaGiocata, nota, probGiocata, quotaStimata, resa }
}

// ⚠️ **Il Grado è stato togliere il 10/10/2026**, con i suoi estremi fissi e il
// peso della quota. Era la resa in scala 1-10 più il livello della quota, e
// serviva al colpo d'occhio; il suo posto l'ha preso il **VOTO**
// (`voto()` in lib/vpm.js) = resa × fattore VPM, che risponde alla stessa
// domanda — quanto conviene giocarla — tenendo dentro anche il campo.
// Due numeri costruiti sulla resa a schermo erano un doppione.

export function categoria(probGiocata, soglie = SOGLIE_DEFAULT) {
  if (probGiocata === null || probGiocata === undefined) return 'no'
  if (probGiocata >= soglie.centro) return 'centro'
  if (probGiocata >= soglie.giallo) return 'giallo'
  if (probGiocata >= soglie.blu) return 'blu'
  return 'no'
}

// ── La settimana di gioco ─────────────────────────────────────────────────────
// Va da oggi al lunedì che la chiude. Il lunedì stesso chiude la settimana in
// corso; da martedì si guarda al lunedì successivo.
export function lunediProssimo(settimaneAvanti = 0, oggi = new Date()) {
  const d = new Date(oggi); d.setHours(12, 0, 0, 0)
  const g = d.getDay()                        // 0 dom … 6 sab
  const avanti = g === 1 ? 0 : (8 - g) % 7
  d.setDate(d.getDate() + avanti + 7 * settimaneAvanti)
  return d.toISOString().slice(0, 10)
}

// ── Il limite delle spin: il martedì che chiude il weekend ────────────────────
// ⚠️ In una spin entrano SOLO le partite del weekend in corso, **fino al
// martedì compreso**. È un blocco, non un filtro: nemmeno una stellina lo
// scavalca.
//
// Deciso l'8/10/2026, dopo aver visto l'anteprima proporre una spin con otto
// partite del 10-11 ottobre e due del 17 (entrate perché votate): le otto
// schedine di quella spin sarebbero rimaste aperte nove giorni, e il risultato
// sarebbe arrivato una settimana dopo aver giocato il resto.
//
// Il martedì stesso chiude il ciclo — da mercoledì si guarda al martedì
// successivo — come il lunedì chiude la settimana in `lunediProssimo`.
export function martediChiusura(oggi = new Date()) {
  const d = new Date(oggi); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + ((2 - d.getDay() + 7) % 7))   // 2 = martedì
  return d.toISOString().slice(0, 10)
}

/**
 * La data di oggi, **in ora locale**.
 *
 * ⚠️ `new Date().toISOString().slice(0,10)` è la data **UTC**: fra mezzanotte e
 * le due italiane restituisce ieri, e un filtro "Oggi" mostrerebbe le partite
 * del giorno prima. Si passa da mezzogiorno, come in `martediChiusura`.
 */
export function oggiLocale(d = new Date()) {
  const x = new Date(d); x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

export const FINESTRE = [
  { id: 'oggi',      label: 'Oggi',              fine: () => oggiLocale() },
  { id: 'settimana', label: 'Fino a lunedì',     fine: () => lunediProssimo(0) },
  { id: 'due',       label: 'Anche la prossima', fine: () => lunediProssimo(1) },
  { id: 'tutte',     label: 'Tutte',             fine: () => '9999-12-31' },
]
