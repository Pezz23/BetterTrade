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
 * ⚠️⚠️ **La quota minima della SCHEDINA: 2,00 "a salire"** (decisione di
 * Mattia, 21/10/2026), e non è un numero tondo scelto per comodità — **è il
 * numero che fa stare in piedi il metodo**.
 *
 * Il piano della Scalata madre chiede due cose insieme: *"stesso piano di
 * rientro in percentuale"* e *"in due giornate DEVO recuperare il capitale"*.
 * A quota 1,90 le due si contraddicono (il primo passo incassa 19 e non 20,
 * quindi o si accantona meno o il pavimento del secondo passo scende sotto il
 * pari). **A 2,00 coincidono**: la posta raddoppia, l'utile è pari alla
 * puntata, e i pavimenti qui sotto sono esattamente le percentuali del piano.
 * ⚠️ Non è più un filtro con la manopola: era nei filtri e Mattia l'ha
 * toglie (*"il passo mi deve avvisare"*) — il minimo è uno, e il posto dove
 * dirlo è la card del passo che non ci arriva.
 */
export const QUOTA_MINIMA_SCHEDINA = 2.00

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
 * ⚠️⚠️ **IL METODO, e adesso è UNO SOLO** (Mattia, 21/10/2026: *"togliamo
 * l'opzione prima il capitale e tutto in gioco, abbiamo definito il nostro
 * metodo"*). Le due regole servivano a **misurare** dove conviene stare, e la
 * misura ha risposto: sull'utile `capitale` chiudeva a mediana 81 su 100 e
 * `gioco` a 42. Tenere a schermo la regola bocciata voleva dire poter giocare
 * per sbaglio quella che perde il doppio.
 *
 * **I PAVIMENTI sono accumulo CUMULATIVO, in multipli della posta iniziale.**
 * Non una frazione per passo: il vincolo che Mattia ha dato è un traguardo
 * (*"in due giornate devo recuperare il capitale iniziale"*), e un traguardo
 * si scrive come quota da raggiungere, non come percentuale da applicare.
 *
 * Su una posta di 10 e quota 2,00 a ogni passo:
 *
 * | passo | incassa | pavimento | mette via | in accumulo | netto |
 * |---|---|---|---|---|---|
 * | 1 | 20 | 0,7× | 7 (70% dell'utile) | 7 | **−3** |
 * | 2 | 26 | 1,3× | 6 (46%) | 13 | **+3** |
 * | 3 | 40 | 2,8× | 15 (75%) | 28 | **+18** |
 *
 * ⚠️ **Il secondo passo è il traguardo del capitale**: 1,3× la posta vuol dire
 * che dopo due giornate vinte i 10 iniziali sono rientrati **più 3**. È quello
 * il vincolo, e per questo è un pavimento e non un 46% — a quota 2,20 il 46%
 * accantonerebbe un numero diverso, il pavimento no.
 * ⚠️ **Sopra 2,00 il pavimento resta lo stesso e la scalata cresce di più**:
 * si mette via quello che serve, e tutto il resto continua a salire. È il
 * verso giusto — una quota più alta non deve far accantonare di più.
 * ⚠️ **Oltre il terzo passo si mette via tutto l'utile**: non c'è un quarto
 * traguardo, e lasciare un pavimento vuoto vorrebbe dire "non accantonare
 * niente" proprio dove la cassa è più grande.
 */
export const PAVIMENTI = [0.7, 1.3, 2.8]

export const METODO = {
  nome: 'Scalata madre',
  desc: 'pavimenti di accumulo 0,7× · 1,3× · 2,8× la posta — il capitale rientra al 2° passo',
}

/**
 * I nomi delle regole **vecchie**, che servono solo all'archivio.
 * ⚠️ Le scalate chiuse prima del 21/10/2026 hanno `regola = 'capitale'` o
 * `'gioco'` nel registro: quella colonna è la fotografia di come si giocava
 * **allora**, e riscriverla sarebbe falsificare l'archivio. Qui c'è solo come
 * si chiamavano.
 */
export const NOMI_REGOLA = {
  madre: METODO.nome,
  capitale: 'Prima il capitale',
  gioco: 'Tutto in gioco',
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
 * La percentuale che l'app **consiglia** di mettere via, 0-100: quella che
 * porta l'accumulo **esattamente al pavimento** di questo passo.
 *
 * ⚠️⚠️ **Resta un consiglio e non un comando** (richiesta di Mattia,
 * 15/10/2026): la pagina ha un campo in percentuale e decide lui. Il consiglio
 * nasce da una regola media, lui guarda *quella* partita — e un'app che impone
 * la frazione gli toglie l'unica cosa che la misura non sa fare.
 * ⚠️ **Si calcola da quanto MANCA**, non da una frazione fissa: se il passo
 * prima ha messo via più del dovuto (i centesimi dell'arrotondamento, o una
 * percentuale scelta a mano), qui si mette via **meno**. È quello che rende i
 * pavimenti un traguardo invece di una tassa.
 * ⚠️ `posta` è la posta **iniziale** della scalata, non la puntata di questo
 * passo: i pavimenti sono multipli del capitale messo in gioco all'inizio, ed
 * è l'unico numero che non cambia mentre la scalata sale.
 */
export function percentualeConsigliata({ numero, montante, puntata, posta, accumulato = 0 }) {
  const utile = Number(montante) - Number(puntata)
  if (!(utile > 0)) return 0
  const fattore = PAVIMENTI[numero - 1]
  // oltre l'ultimo pavimento: tutto l'utile.
  if (fattore == null) return 100
  const manca = fattore * (Number(posta) || 0) - (Number(accumulato) || 0)
  if (manca <= 0) return 0
  return Math.min(100, manca / utile * 100)
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
export function incassa({ numero, posta, quota, ultimo = false, postaIniziale = posta, accumulato = 0 }) {
  const montante = Number(posta) * Number(quota)
  const p = percentualeConsigliata({ numero, montante, puntata: posta, posta: postaIniziale, accumulato })
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
 * per usare il consiglio del metodo.
 */
export function casseDi(passi, posta, percDi = () => undefined) {
  let cassa = Number(posta) || 0, accumulo = 0, vivi = 0
  for (const [i, p] of (passi || []).entries()) {
    // ⚠️ Si ferma al primo passo non ancora giocato: è lì che sta la cassa.
    if (!p || p.esito === 'aperto' || cassa < 1) break
    vivi++
    if (p.esito === 'perso') { cassa = 0; break }
    const montante = cassa * Number(p.quota)
    const pc = percDi(i) ?? percentualeConsigliata({ numero: i + 1, montante, puntata: cassa, posta, accumulato: accumulo })
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
export function simula(passi, { bankroll, maxPassi = MAX_PASSI }) {
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
    const r = incassa({ numero, posta, quota, ultimo, postaIniziale, accumulato: accumulo })
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


/**
 * Spezza le fasce nei punti scelti a mano.
 *
 * ⚠️ Il taglio è ancorato **all'id della prima gamba del pezzo staccato**, non
 * alla posizione: una fascia può cambiare contenuto (si tolgono partite, se ne
 * tirano su dal passo dopo) e un taglio salvato come "dopo il secondo" finirebbe
 * in un punto diverso da quello che si era toccato.
 * ⚠️ Un taglio sulla **prima** gamba di una fascia non fa niente: staccherebbe
 * tutto, cioè lascerebbe le cose come stanno.
 */
export function spezzaFasce(gruppi, tagli) {
  if (!tagli?.length) return gruppi
  const taglia = new Set(tagli)
  return gruppi.flatMap(f => {
    const pezzi = []
    let corrente = []
    for (const p of f.partite) {
      if (corrente.length && taglia.has(p.id)) { pezzi.push({ ...f, partite: corrente }); corrente = [] }
      corrente.push(p)
    }
    if (corrente.length) pezzi.push({ ...f, partite: corrente })
    return pezzi
  })
}

/**
 * Si può spezzare il passo **prima** della gamba `iTaglio`?
 *
 * ⚠️⚠️ **Trovato da Mattia il 21/10/2026**: *"dice spezza a tutte le partite
 * aggiunte anche se la quota è 1,3"*. Il taglio offerto dappertutto proponeva
 * di fabbricare due schedine sotto il minimo — e una schedina a 1,30 non è un
 * passo di questa scalata, è un'altra cosa. Il tasto non deve offrire un gesto
 * che produce un piano non giocabile.
 * ⚠️ **Si guardano i DUE pezzi**, non solo quello staccato: tagliare dopo la
 * prima gamba lascia *sopra* una schedina da 1,45, che è lo stesso difetto
 * dall'altro lato.
 * ⚠️ Le quote sono quelle **modificate a mano**, non quelle scaricate: il piano
 * è il suo, e il controllo deve guardare i numeri che giocherà.
 */
export function puoSpezzare(quote, iTaglio, quotaMinima = QUOTA_MINIMA_SCHEDINA) {
  if (!(iTaglio > 0) || iTaglio >= quote.length) return false
  const prodotto = (da, a) => quote.slice(da, a).reduce((x, q) => x * (Number(q) || 1), 1)
  return prodotto(0, iTaglio) >= quotaMinima && prodotto(iTaglio, quote.length) >= quotaMinima
}

/**
 * Spezza ogni fascia **appena la quota supera il minimo** (Mattia, 21/10/2026:
 * *"spezza le schedine appena superano la quota 2,00"*).
 *
 * ⚠️⚠️ **Il raggruppamento per orario non è una schedina**: `fasce()` mette
 * insieme tutto quello che si gioca entro tre ore, e in un sabato pieno sono
 * otto partite — una schedina da quota 21, che vince quasi mai. La fascia dice
 * *quando* si può giocare, la quota dice *quanto* ci sta dentro, e sono due
 * domande diverse.
 * ⚠️ **Si taglia appena si SUPERA, non appena ci si avvicina**: ogni gamba in
 * più moltiplica il margine del book, quindi la schedina giusta è la più corta
 * che arriva alla quota chiesta — la stessa regola di `componiPasso`.
 * ⚠️ **La coda sotto il minimo resta**, non si butta e non si attacca alla
 * fascia dopo: è materiale di quell'orario, e la card dirà quanto le manca.
 * Attaccarla al blocco successivo vorrebbe dire una schedina che comincia
 * prima di finire.
 * ⚠️ L'ordine dentro la fascia è quello dell'orario, non dell'attendibilità:
 * la composizione è sua, e riordinare renderebbe imprevedibile dove cade il
 * taglio.
 */
export function spezzaAlMinimo(gruppi, quotaMinima = QUOTA_MINIMA_SCHEDINA) {
  return (gruppi || []).flatMap(f => {
    const pezzi = []
    let corrente = [], q = 1
    for (const p of f.partite) {
      corrente.push(p)
      q *= Number(p.quota) || 1
      if (q >= quotaMinima) { pezzi.push(corrente); corrente = []; q = 1 }
    }
    if (corrente.length) pezzi.push(corrente)
    return pezzi.map(partite => ({ ...f, ora: String(partite[0]?.ora || f.ora || '').slice(0, 5), partite }))
  })
}
