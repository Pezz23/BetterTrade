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
/**
 * ⚠️⚠️ **Quando i bookmaker non sono d'accordo fra loro, l'attendibilità vale
 * meno** — e le due soglie qui sotto **non** sono la stessa cosa misurata due
 * volte, sono due scale diverse.
 *
 * La misura (15/10/2026, `btscout/scripts/prova-dispersione.js`, 8 stagioni e
 * 38.084 partite): fra le partite con attendibilità ≥ 60%, tenendo il livello
 * dichiarato quasi identico (66,1% contro 68,3%), il taglio sulla dispersione
 * separa due mondi — e **scende in modo monotòno su quattro tagli**, che è
 * quello che lo rende credibile più del singolo numero:
 *
 * | disaccordo sopra | partite | dichiarato → avverato | resa |
 * |---|---|---|---|
 * | 4,2% | 521 | 66,2% → 67,4% (+1,1) | 95,1% |
 * | 5,0% | 234 | 65,5% → 63,2% (−2,2) | 90,0% |
 * | **6,0%** | **97** | **66,1% → 59,8% (−6,3)** | **84,6%** |
 * | 8,0% | 26 | 64,6% → 53,8% (−10,8) | 78,6% |
 * | *sotto 6,0%* | *6.191* | *68,3% → 71,8% (+3,5)* | *99,1%* |
 *
 * ⚠️ **È un avviso, non un'esclusione.** Sono 97 partite su 6.288 (1,5%) e
 * l'errore sul tasso è ±9,8: la direzione regge su quattro tagli, la grandezza
 * no. `SCARTO_FONTI` esclude dalle spin perché là il **dato è rotto**; qui il
 * dato è buono e dice che il mercato è incerto.
 *
 * ⚠️⚠️ **E le due fonti NON hanno la stessa scala, questo era il tranello.**
 * Stessa definizione, stesso segno: football-data ha mediana 2,9% e 98°
 * percentile 7,1%, The Odds API mediana 4,0% e 98° percentile 10,4% — perché la
 * massima è il migliore fra **34** book invece che fra i pochi che
 * football-data segue, e il massimo di un insieme più grande è più estremo.
 * Applicare il 6% misurato alle righe di The Odds API segnalerebbe **187 partite
 * su 192** invece di due o tre.
 * ⚠️ Quindi: **6% è MISURATO** (football-data), **10% è TRASPOSTO per
 * percentile e non misurato** — di storia con le massime di The Odds API non ne
 * abbiamo. Va rimisurato quando ce ne sarà: oggi sono ~300 partite già giocate,
 * troppo poche.
 * ⚠️ Si guarda il **segno favorito**, non la terna: su una partita si gioca l'1
 * o il 2, e il disaccordo sulla X non ci riguarda.
 */
export const DISPERSIONE = { 'football-data': 0.06, 'odds-api': 0.10 }

/** Quanto la quota più generosa supera la media, sul segno favorito. */
export function dispersioneBook(r) {
  const casa = Number(r.avg_ap_1) <= Number(r.avg_ap_2)
  const m = Number(casa ? r.max_ap_1 : r.max_ap_2)
  const a = Number(casa ? r.avg_ap_1 : r.avg_ap_2)
  return m > 1 && a > 1 ? m / a - 1 : null
}

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
  const dispersione = dispersioneBook(r)
  const bookSparsi = dispersione != null && dispersione > (DISPERSIONE[r.fonte] ?? DISPERSIONE['football-data'])
  const scartoQuote = scartoFonti(r)
  const quoteIncoerenti = scartoQuote != null && scartoQuote > SCARTO_FONTI
  return { ...r, p, segno, prob, quota, quotaFonte, quotaDaConsenso, quoteIncoerenti, scartoQuote,
    dispersione, bookSparsi,
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

/**
 * Le finestre della pagina Partite.
 *
 * ⚠️ **«Domani» è entrata il 22/10/2026** su richiesta di Mattia: è la
 * domanda più frequente del venerdì sera, e prima si poteva solo guardare
 * *oggi* o *fino a lunedì*, cioè tre giorni insieme.
 * ⚠️⚠️ **E «Tutte» è USCITA**, sempre per sua scelta. Conseguenza da sapere:
 * **la finestra più larga adesso è il lunedì della settimana dopo**, quindi le
 * partite oltre quell'orizzonte non si vedono più dalla pagina Partite — e
 * The Odds API ne porta fino a tre o quattro settimane avanti. Non sono
 * perse: Road to weekend le vede (lì il filtro è la soglia, non la data), e
 * basta rimettere una riga qui per riaverle.
 * ⚠️ `oggiLocale` passa da mezzogiorno, quindi «Domani» non cambia giorno col
 * fuso o con l'ora legale.
 */
export const FINESTRE = [
  { id: 'oggi',      label: 'Oggi',              fine: () => oggiLocale() },
  { id: 'domani',    label: 'Domani',            fine: () => oggiLocale(new Date(Date.now() + 24 * 3600 * 1000)) },
  { id: 'settimana', label: 'Fino a lunedì',     fine: () => lunediProssimo(0) },
  { id: 'due',       label: 'Anche la prossima', fine: () => lunediProssimo(1) },
]

/**
 * Il **lunedì che chiude il weekend** di una data, come nelle spin: la chiave
 * con cui si raggruppano le giornate di gioco.
 *
 * ⚠️ **Sta qui e non in due posti**: la stessa regola serviva al motore
 * (`btscout/lib/date.js`), che adesso **la ri-esporta da questo file** invece
 * di tenerne una copia. Due definizioni di "quale weekend è questo" sono il
 * difetto peggiore possibile — una copia che nessuno confronta non si accorge
 * di essere sbagliata.
 * ⚠️ Si passa da **mezzogiorno** e si ricostruisce la data dai componenti
 * locali: `toISOString()` è UTC, e per una partita serale sposta il giorno
 * indietro.
 */
export function weekendDi(d) {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  x.setDate(x.getDate() + ((8 - x.getDay()) % 7))
  return oggiLocale(x)
}

/**
 * La partita comincia **dopo** questo istante?
 *
 * ⚠️⚠️ **Stava in due pagine identica** (Road to weekend e Bet Builder) e il
 * tagliando del 22/10/2026 l'ha trovata: due copie della stessa regola
 * divergono sempre, ed è il difetto che questo progetto ha già pagato con
 * `pct`, con la data breve e con la chiave del giorno negli script.
 * ⚠️ Serve perché `usaProssime` filtra per **giorno** (`data >= current_date`),
 * quindi alle 18 di sabato la lista contiene ancora le partite delle 13.
 * ⚠️ Senza orario si tiene la partita: meglio mostrarla che nasconderla — la
 * correzione a mano è prevista, l'invisibilità no.
 */
export function iniziaDopo(p, istante) {
  const g = String(p?.data).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g)) return true
  if (!p.ora) return new Date(`${g}T23:59:00`).getTime() >= istante
  return new Date(`${g}T${String(p.ora).slice(0, 5)}:00`).getTime() >= istante
}
