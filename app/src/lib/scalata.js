// ROAD TO WEEKEND — la scalata a recupero con incasso parziale.
//
// ⚠️ **Solo calcoli, niente database e niente React**: Node la esegue da
// terminale per misurarla sulle partite vere (`btscout/scripts/prova-scalata.js`).
// È la stessa ragione per cui `spin.js` resta puro.
//
// ⚠️⚠️ **Quello che la scalata NON fa, e va saputo prima di leggere qualunque
// numero: non crea un vantaggio.** Ogni euro che resta in gioco perde il
// margine del book a ogni passo, ogni euro messo in accumulo smette di perdere.
// Sul valore atteso la regola migliore è "metti via tutto al primo passo",
// cioè non fare la scalata: calcolato, 9,80 contro 9,67 su dieci unità. Quello
// che la scalata compra è la **forma** del risultato — molte volte poco, di
// rado molto — e costa **tredici centesimi su dieci unità**. Il buco vero è il
// 2% per passo che viene dalle quote, non dalla progressione.

/** La posta di partenza: il 10% del bankroll, all'euro per difetto. */
export const FRAZIONE_BANKROLL = 0.10

/**
 * ⚠️ **Il pavimento di quota per GAMBA, e non è prudenza: è la misura.**
 * Dentro `att ≥ 67%`, per fascia di quota: sotto 1,20 la resa è **88,5%**,
 * fra 1,20 e 1,30 il **95,1%**, fra 1,30 e 1,45 il **99,0%**. Le azzeccate
 * salgono scendendo di quota e la resa crolla — quindi una scalata che pesca
 * "le più sicure" va a prendere proprio le peggiori.
 */
export const QUOTA_MINIMA_GAMBA = 1.30

/**
 * ⚠️ **Quattro gambe al massimo** (scelta di Mattia), e il motivo è che
 * **ogni gamba moltiplica il margine**: una gamba al 99% diventa 98% in due e
 * 97% in tre. Chiedere più quota non allunga la scalata, la fa morire prima —
 * due gambe (quota ~1,88) vincono il 54% delle volte, tre il 39%, sei il 16%.
 */
export const MAX_GAMBE = 4

/** Un passo per giorno di gioco: venerdì · sabato · domenica · lunedì. */
export const MAX_PASSI = 4

/**
 * Le due regole di incasso, decise il 15/10/2026 dopo aver calcolato la
 * distribuzione di sette candidate.
 *
 * ⚠️⚠️ **Entrambe mettono via la POSTA INIZIALE al primo passo**, e questa è
 * la correzione più importante all'idea di partenza. Mattia voleva "rientrare
 * del 10% in 2-3 giocate" mettendo via il 40%: con una quota di 1,88 il 40% di
 * 18,8 fa 7,5, **non basta**, e serve vincere un secondo passo — cosa che
 * succede il **27%** delle volte. Mettendo via esattamente la posta si rientra
 * al **primo** passo, cioè il **52%** delle volte. Stesso obiettivo, il doppio
 * delle probabilità, e costa niente.
 *
 * ⚠️ `capitale` ha il tetto più basso (35) e `gioco` il più alto (63): è la
 * curva di scambio, e le due servono a misurare dove conviene stare. A parità
 * di sicurezza `capitale` batte la frazione fissa al 60% (tetto 35 contro 32),
 * perché al primo passo mette via **il minimo necessario e non un centesimo di
 * più**.
 */
/** Il segnaposto "metti via esattamente la posta iniziale". */
export const POSTA = 'posta'

export const REGOLE = {
  capitale: {
    nome: 'Prima il capitale',
    desc: "al 1° passo mette via tutto l'utile, poi il 70%",
    // la frazione del montante da mettere via, per numero di passo.
    // ⚠️ `'posta'` e non `null`: con `null` il `??` qui sotto lo prendeva per
    // "manca" e restituiva **1**, cioè la regola metteva via tutto al primo
    // passo e la scalata finiva subito. Trovato dal collaudo della libreria
    // appena scritta, non da un errore — `null` è un valore legittimo e un
    // operatore che lo tratta come assenza se lo mangia in silenzio.
    // ⚠️ `POSTA` = "metti al sicuro quello che puoi": sull'utile è il **100%**,
    // e il risultato è che si rigioca sempre la stessa puntata e si intasca la
    // vincita. Il caso peggiore passa da −10 a **−1,2**.
    frazione: (numero) => [POSTA, 0.70, 0.70][numero - 1] ?? 1,
  },
  gioco: {
    nome: 'Tutto in gioco',
    desc: 'non mette via niente fino alla fine',
    frazione: () => 0,
  },
}

/**
 * ⚠️ **Quanto possono essere distanti gli orari di uno stesso passo.** Mattia:
 * *"più fasce orario purché siano vicine"*. Tre ore tiene insieme il blocco
 * delle 15 e quello delle 18, e tiene fuori il 20:45 — che è il posto giusto
 * per il passo dopo, perché **un passo deve finire prima che cominci il
 * successivo**, o la scalata non è una scalata.
 */
export const FINESTRA_ORE = 3

/**
 * Il giorno in `AAAA-MM-GG`, da una stringa **o da un oggetto `Date`**.
 *
 * ⚠️⚠️ **La trappola che questo progetto ha già pagato una volta**: dal
 * browser le date arrivano come stringhe ISO (PostgREST), ma dal driver
 * postgres arrivano come **oggetti `Date`** — e `String(new Date())` dà
 * `"Fri Oct 23 2026…"`. Senza questa funzione `fasce()` ordinava i passi per
 * **nome del giorno**: venerdì prima di lunedì, sabato prima di tutto. Trovato
 * il 15/10/2026 provando la pagina sulle partite vere da terminale, non da un
 * errore — l'ordine sbagliato non lancia niente.
 * ⚠️ Si ricostruisce dai componenti **locali** e non da `toISOString()`, che è
 * UTC e per una partita serale sposta il giorno indietro.
 */
export function giorno(d) {
  if (d == null) return ''
  if (typeof d === 'string') return d.slice(0, 10)
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

const minuti = (ora) => {
  if (!ora) return 12 * 60                       // senza orario si assume il pomeriggio
  const [h, m] = String(ora).slice(0, 5).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Raggruppa le partite in **fasce**: stesso giorno e orari entro `FINESTRA_ORE`.
 * Torna le fasce in ordine di data e ora — che è l'ordine dei passi.
 *
 * ⚠️ Il raggruppamento è una **proposta**, non un vincolo: la pagina lascia
 * togliere e aggiungere partite a mano, perché il tocco personale è il motivo
 * per cui questa pagina esiste.
 */
export function fasce(partite) {
  const ord = [...(partite || [])].sort((a, b) =>
    giorno(a.data).localeCompare(giorno(b.data)) || minuti(a.ora) - minuti(b.ora))
  const out = []
  for (const p of ord) {
    const ultima = out[out.length - 1]
    const vicina = ultima && ultima.giorno === giorno(p.data)
      && minuti(p.ora) - minuti(ultima.partite[0].ora) <= FINESTRA_ORE * 60
    if (vicina) ultima.partite.push(p)
    else out.push({ giorno: giorno(p.data), ora: String(p.ora || '').slice(0, 5), partite: [p] })
  }
  return out
}

/**
 * La percentuale che l'app **consiglia** di mettere via, 0-100.
 *
 * ⚠️⚠️ **È un consiglio e non un comando** (richiesta di Mattia, 15/10/2026):
 * la pagina ha un campo in percentuale e decide lui. Il motivo è che il
 * consiglio nasce da una regola media, mentre lui guarda *quella* partita —
 * e un'app che impone la frazione gli toglie l'unica cosa che la misura non
 * sa fare.
 * ⚠️ Al primo passo il consiglio è **quanto serve a rimettere al sicuro la
 * posta**, non una frazione tonda: con quota 1,88 sono il 53%, e il 40% non
 * basterebbe — è la correzione misurata il 15/10.
 */
export function percentualeConsigliata(regola, { numero, montante, puntata }) {
  if (!(Number(montante) - Number(puntata) > 0)) return 0
  const f = REGOLE[regola]?.frazione(numero)
  // ⚠️ "Metti al sicuro il capitale" **sull'utile** vuol dire tutto l'utile:
  // sotto quota 2,00 l'utile è meno della puntata, quindi la puntata intera non
  // si può mettere via in un passo. Quello che si ottiene è il caso peggiore
  // ridotto a `puntata − utile`, non azzerato.
  if (f === POSTA) return 100
  return (f ?? 1) * 100
}

/**
 * Applica una percentuale **all'utile**: `{ via, rigioca, resto, utile }`.
 *
 * ⚠️⚠️ **All'utile e non al montante** (scelta di Mattia, 15/10/2026: *"vorrei
 * mettere via la % dell'utile non dell'intero"*), e non è cosmetica: al
 * **100%** si rigioca sempre **la stessa puntata** e si intasca la vincita,
 * quindi dopo un passo vinto il caso peggiore è `puntata − utile` — con quota
 * 1,88 sono **−1,2** invece di −10. Al **0%** tutto resta in gioco e compone.
 * ⚠️ Per difetto all'euro, e **il resto va in accumulo**: incassi 17,44,
 * rigiochi 17, e quello 0,44 non deve sparire dal registro.
 * ⚠️ `tutto` chiude il passo mandando in accumulo anche la puntata: oltre
 * l'ultimo passo non c'è una partita dove giocarla.
 */
export function applicaIncasso(montante, percentuale, puntata, tutto = false) {
  const m = Number(montante) || 0
  const utile = Math.max(0, m - (Number(puntata) || 0))
  const via0 = tutto ? m : utile * Math.max(0, Math.min(100, Number(percentuale) || 0)) / 100
  let rigioca = Math.floor(m - via0)
  if (rigioca < 1) rigioca = 0
  return { via: m - rigioca, rigioca, resto: m - via0 - rigioca, utile }
}

/**
 * ⚠️⚠️ **Le soglie consigliate, e stavolta sono MISURATE.** Il 15/10 il tasto
 * diceva "consigliato 62 · 62" su una proposta a occhio di Mattia, e lui
 * giustamente ha chiesto *"su cosa si basa?"*. Un'app che consiglia deve poter
 * dire perché, o quella parola non va scritta.
 *
 * Misurato su **31.442 partite** con quota ≥ 1,30, otto stagioni, camminando
 * nel tempo (`btscout/lib/ricostruisci.js`), sul filtro vero della pagina:
 *
 * | soglia | partite | a giornata | azzeccate | resa |
 * |---|---|---|---|---|
 * | 50% | 11.489 | 7,0 | 61,3% | 97,3% ±1,4 |
 * | 54% | 8.269 | 5,0 | 64,5% | 98,2% ±1,6 |
 * | **58%** | **5.517** | **3,4** | **67,4%** | **98,3% ±1,8** |
 * | 62% | 3.526 | 2,1 | 70,6% | 99,3% ±2,1 |
 * | 65% | 2.373 | 1,4 | 73,0% | 100,3% ±2,5 |
 * | 70% | 767 | 0,5 | 73,9% | 97,9% ±4,1 |
 *
 * ⚠️ **Fra 54% e 67% la resa non si distingue**: gli intervalli si
 * sovrappongono tutti. Sotto il 54% peggiora davvero (97,3%), sopra il 67%
 * anche (97,9%, perché si va a prendere i favoriti più corti).
 * ⚠️ **Quindi si sceglie la soglia più BASSA del pianoro**, non la più alta, e
 * la ragione è il materiale: a 58% ci sono **3,4 partite a giornata su 1.206
 * giorni**, a 62% sono 2,1 su 1.018. Per una scalata che vuole due gambe nello
 * stesso blocco, il doppio del materiale vale più di un punto di resa che non
 * è nemmeno dimostrabile.
 * ⚠️ `scelta` alla stessa soglia di `att` non alza l'asticella due volte:
 * `scelta = att + fino a 0,10`, quindi è già superata — **tranne quando è
 * nulla**, cioè quando il campo contraddice il mercato, e quelle sono le
 * partite da evitare (misurato: 27,2% di vittorie dove il book dava 29,5%).
 */
export const CONSIGLIATO = {
  att: 58, scelta: 58,
  resa: 98.3, partite: 5517, aGiornata: 3.4,
  perche: 'resa 98,3% su 5.517 partite · 3,4 al giorno',
}

/** La posta di partenza di una scalata: il 10% del bankroll, per difetto. */
export const postaDi = (bankroll) => Math.floor(Number(bankroll) * FRAZIONE_BANKROLL)

/**
 * Cosa succede quando un passo **vince**: `{ montante, via, rigioca, resto }`.
 *
 * ⚠️ **L'arrotondamento è per difetto all'euro e il resto NON si perde**: va in
 * accumulo. Vinci 17,44, giochi 17, e quello 0,44 è l'unica scelta che non fa
 * sparire dei soldi dal registro (*"la parte in eccedenza la mettiamo in
 * cassa"*).
 * ⚠️ `ultimo` forza l'incasso totale: un passo oltre il quale non si gioca più
 * deve chiudere, altrimenti il montante resterebbe "in gioco" senza una partita
 * dove giocarlo.
 */
export function incassa(regola, { numero, posta, quota, ultimo = false }) {
  if (!REGOLE[regola]) throw new Error(`regola sconosciuta: ${regola}`)
  const montante = Number(posta) * Number(quota)
  const p = percentualeConsigliata(regola, { numero, montante, puntata: posta })
  return { montante, ...applicaIncasso(montante, p, posta, ultimo) }
}

/**
 * Compone la schedina di un passo: le gambe che portano la quota sopra il
 * minimo, prendendo le migliori e fermandosi appena il minimo è superato.
 *
 * ⚠️ **Si ferma appena supera il minimo**, non appena ha quattro gambe: ogni
 * gamba in più moltiplica il margine, quindi la schedina giusta è la **più
 * corta** che arriva alla quota chiesta.
 * ⚠️ L'ordine è per **attendibilità** decrescente, perché è il miglior
 * selettore misurato (60,3% contro 56,3% di VPM sulle prime 9 del giorno) —
 * non per quota, che sceglierebbe le partite meno probabili.
 * ⚠️ Torna `null` con un **motivo** quando il passo non si può costruire: con
 * le soglie strette quasi un giorno su due non ha nemmeno due gambe sopra
 * 1,30, e la pagina deve poterlo dire invece di mostrare un piano finto.
 */
export function componiPasso(candidate, { quotaMinima, maxGambe = MAX_GAMBE, pavimento = QUOTA_MINIMA_GAMBA } = {}) {
  const buone = (candidate || [])
    .filter(c => Number(c.quota) >= pavimento)
    .sort((a, b) => (b.att ?? 0) - (a.att ?? 0))
  if (!buone.length) return { gambe: null, quota: null, motivo: `nessuna partita sopra quota ${pavimento.toFixed(2)}` }

  const gambe = []
  let quota = 1
  for (const c of buone) {
    gambe.push(c)
    quota *= Number(c.quota)
    if (quota >= quotaMinima) return { gambe, quota, motivo: null }
    if (gambe.length >= maxGambe) break
  }
  return {
    gambe: null, quota: null,
    motivo: `con ${buone.length} partite e ${maxGambe} gambe si arriva a ${quota.toFixed(2)}, serve ${quotaMinima.toFixed(2)}`,
  }
}

/**
 * Le casse di una scalata, **ricalcolate camminando sui passi**.
 *
 * ⚠️⚠️ **Derivate, non memorizzate, ed è la correzione del 18/10/2026.** Prima
 * `scalate.cassa` e `scalate.accumulo` erano aggiornate a ogni esito, quindi
 * ogni modifica successiva — annullare un esito, cambiare una quota, togliere
 * una gamba — avrebbe dovuto "disfare" l'aggiornamento precedente. Per non
 * sbagliare avevo **bloccato tutto**, e Mattia: *"tutto troppo vincolante"*.
 * Aveva ragione due volte: lo strumento serve a cambiare idea, e **la cura non
 * era vietare le modifiche ma smettere di tenere un secondo numero.**
 * Le colonne restano come fotografia di quello che si era scritto al momento,
 * ma **la verità è questa funzione**.
 *
 * `percDi(i)` è la percentuale scelta a mano per il passo `i`, o `undefined`
 * per usare il consiglio della regola.
 */
export function casseDi(passi, posta, regola, percDi = () => undefined) {
  let cassa = Number(posta) || 0, accumulo = 0, vivi = 0
  for (const [i, p] of (passi || []).entries()) {
    // ⚠️ Si ferma al primo passo non ancora giocato: è lì che sta la cassa.
    if (!p || p.esito === 'aperto' || cassa < 1) break
    vivi++
    if (p.esito === 'perso') { cassa = 0; break }
    const montante = cassa * Number(p.quota)
    const pc = percDi(i) ?? percentualeConsigliata(regola, { numero: i + 1, montante, puntata: cassa })
    const r = applicaIncasso(montante, pc, cassa)
    accumulo += r.via
    cassa = r.rigioca
  }
  return { cassa, accumulo, vivi }
}

/**
 * Simula una scalata su una sequenza di passi già composti.
 * `passi` = `[{ quota, vinto }]`, in ordine. Torna il registro e le tre casse.
 *
 * ⚠️ **La posta di un passo è quello che il passo prima ha rigiocato**, non una
 * progressione: è questo che rende la scalata una scalata e non una serie di
 * puntate indipendenti.
 */
export function simula(passi, { bankroll, regola, maxPassi = MAX_PASSI }) {
  const postaIniziale = postaDi(bankroll)
  const registro = []
  let posta = postaIniziale, accumulo = 0
  for (let i = 0; i < Math.min(passi.length, maxPassi); i++) {
    const numero = i + 1
    const ultimo = numero === Math.min(passi.length, maxPassi)
    const { quota, vinto } = passi[i]
    if (posta < 1) break
    if (!vinto) {
      registro.push({ numero, posta, quota, esito: 'perso', montante: 0, via: 0, rigioca: 0 })
      posta = 0
      break
    }
    const r = incassa(regola, { numero, posta, quota, ultimo })
    accumulo += r.via
    registro.push({ numero, posta, quota, esito: 'vinto', ...r })
    posta = r.rigioca
  }
  return {
    postaIniziale, accumulo, inGioco: posta, registro,
    // ⚠️ Il risultato della scalata è **l'accumulo meno la posta**: la cassa in
    // gioco è già persa o già contata, e confrontare l'accumulo con zero
    // direbbe che una scalata morta al primo passo ha "chiuso in pari".
    risultato: accumulo - postaIniziale,
    rientrata: accumulo >= postaIniziale,
  }
}
