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
 * ⚠️⚠️ **La quota minima della SCHEDINA: 1,90 dal 26/10/2026** (Mattia: *"ho
 * raggiunto una quota di minimo 2 o poco sotto, almeno 1,9"*), insieme al
 * metodo «Metà utile». È lo schema misurato con `prova-prelievi.js
 * --passo=taglio`: si prendono le più attendibili finché il prodotto supera
 * 1,90, e lì ci si ferma. Giocare fino a 4 partite insieme (quota media 3,24)
 * nello stesso backtest perdeva **il doppio**.
 * ⚠️ Il 2,00 di prima serviva ai **pavimenti** della Scalata madre, che sono
 * usciti con lei; il ragionamento qui sotto è la sua storia.
 *
 * Prima (21/10/2026): *2,00 "a salire"*, e non era un numero tondo scelto per
 * comodità — **era il numero che faceva stare in piedi quel metodo**.
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
export const QUOTA_MINIMA_SCHEDINA = 1.90

/**
 * ⚠️⚠️ **Il CRITERIO A** (Mattia, 29/10/2026: *"evidenziare in modo evidente
 * le partite che rispettano 61 61 7,5"*): attendibilità ≥ 61%, scelta ≥ 61%,
 * VPM ≥ 7,5. La scelta è `null` quando VPM contraddice il segno, quindi la
 * concordanza è già dentro.
 * ⚠️ È il «Filtro A» verificato con `btscout/scripts/prova-filtro-a.js`
 * (`note/criterio.md`): sulle singole rende ~+2% sopra VPM 7,5, non
 * dimostrato. **Si evidenzia, non si sceglie da solo**: i passi restano quelli
 * dei filtri.
 * ⚠️ `Number()`: dal database (piano salvato) i numerici arrivano come
 * stringhe.
 */
export const CRITERIO_A = { att: 0.61, scelta: 0.61, vpm: 7.5 }
export function eCriterioA(g) {
  if (g?.att == null || g?.scelta == null || g?.vpm == null) return false
  return Number(g.att) >= CRITERIO_A.att && Number(g.scelta) >= CRITERIO_A.scelta && Number(g.vpm) >= CRITERIO_A.vpm
}

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
 * ⚠️ **LA STORIA — il metodo dal 21 al 26/10/2026, la Scalata madre.** Non è
 * più in uso (vedi «Metà utile» qui sotto): resta scritto perché spiega da
 * dove vengono le scalate dell'archivio con `regola = 'madre'`.
 *
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
/**
 * ⚠️⚠️ **IL METODO DAL 26/10/2026: «Metà utile»** (Mattia: *"partiamo con
 * questo schema, più avanti capiamo come migliorarlo"*). Al **primo passo
 * vinto si riprende la puntata**, da lì in poi si mette via **metà
 * dell'utile** a ogni passo, senza stop.
 *
 * Perché questo e non i pavimenti qui sopra: misurato con
 * `btscout/scripts/prova-prelievi.js` su 6 stagioni, col passo tagliato a
 * 1,90, contro la variante di Mattia (puntata, 30%, 50% per quattro passi, poi
 * 60…100% e stop all'11°): **−189 € contro −256 €** partendo da 100 €,
 * mediana per stagione **−64 € contro −69 €**. ⚠️⚠️ **Perdono tutte e due, in
 * tutte le stagioni**: il prelievo decide *come* si perde e quanto spesso si
 * torna a casa in utile, **non il segno** — quello lo decide il passo, che da
 * solo rende il 100,5% ±10. La variante perdeva di più perché dal 7° passo
 * teneva in gioco una quota crescente, e al 7° passo non ci arriva nessuno:
 * su 277 scalate, 24 arrivano a 3 passi vinti, 4 a 5, nessuna a 7.
 */
export const METODO_META = {
  id: 'meta',
  nome: 'Metà utile',
  desc: 'al 1° passo vinto riprendi la puntata, poi metà dell’utile a ogni passo',
}

/**
 * ⚠️⚠️ **Il metodo dal 29/10/2026: una PERCENTUALE DEL CONTO a ogni passo**
 * (`sql/49`). Mattia, dopo il backtest del Filtro A: *"accantonare non è un
 * buon piano, è meglio giocare il tot % del bankroll"* — misurato in
 * `btscout/scripts/prova-filtro-a.js`: sulle schedine mai viste la crescita
 * massima sta al **3%**, il 10% rende meno e il 20% brucia il conto.
 *   · ogni passo punta `percentuale × conto` di quel momento, **all'euro per
 *     difetto** (dal 30/10/2026; `puntataDi`); vinto → il conto sale
 *     dell'utile, perso → scende della puntata;
 *   · niente cassa, accumulo né prelievi: il conto è tutto in gioco;
 *   · **a ogni passo perso il giro si chiude da solo** e va in archivio, e ne
 *     riparte un altro con lo stesso conto e la stessa percentuale
 *     (`chiudi_giro_perso`);
 *   · la percentuale si sceglie aprendo e **si cambia solo con STOP**.
 * «Metà utile» (`METODO_META`) resta per l'archivio e per `prova-prelievi.js`.
 */
export const METODO = {
  id: 'percentuale',
  nome: 'Percentuale del conto',
  desc: 'ogni passo punta la stessa percentuale del conto di quel momento',
}
export const PERCENTUALI = [0.03, 0.05, 0.10, 0.14]
export const PERCENTUALE_DEFAULT = 0.05

/**
 * La puntata di un passo: `percentuale × conto`, **all'euro per difetto**
 * (Mattia, 30/10/2026: *"113 € deve consigliare 11 €"*; fino al 29/10 era per
 * eccesso). 0 quando non arriva a 1 €: serve una ricarica.
 * ⚠️ La stessa regola sta in SQL, in `chiudi_giro_perso` (`sql/51`).
 */
export function puntataDi(conto, percentuale) {
  const c = Number(conto), p = Number(percentuale)
  if (!(c >= 1) || !(p > 0)) return 0
  // ⚠️ Prima ai centesimi, poi per difetto: in virgola mobile `100 × 0,29` è
  // 28,999999999999996, e un `floor` diretto farebbe 28 invece di 29.
  return Math.floor(Math.round(c * p * 100) / 100)
}

/**
 * Il conto di un giro a percentuale, **calcolato** dai passi giocati (come
 * le casse di «Metà utile»: un numero scritto a ogni esito andrebbe disfatto
 * a ogni annullamento). Torna `{ live, poste, prossima }`: il conto adesso, la
 * puntata di ogni passo giocato e quella del prossimo.
 */
export function contiPercentuale(iniziale, passi, percentuale) {
  let conto = Number(iniziale)
  const poste = []
  for (const p of passi || []) {
    if (!p || p.esito === 'aperto') break
    const posta = puntataDi(conto, percentuale)
    poste.push(posta)
    conto = Math.round((conto + (p.esito === 'vinto' ? posta * (Number(p.quota) - 1) : -posta)) * 100) / 100
  }
  return { live: conto, poste, prossima: puntataDi(conto, percentuale) }
}

/**
 * I nomi delle regole **vecchie**, che servono solo all'archivio.
 * ⚠️ Le scalate chiuse prima del 21/10/2026 hanno `regola = 'capitale'` o
 * `'gioco'` nel registro: quella colonna è la fotografia di come si giocava
 * **allora**, e riscriverla sarebbe falsificare l'archivio. Qui c'è solo come
 * si chiamavano.
 */
export const NOMI_REGOLA = {
  percentuale: METODO.nome,
  meta: METODO_META.nome,
  // ⚠️ La Scalata madre (pavimenti 0,7× · 1,3× · 2,8×) dal 21 al 26/10/2026.
  madre: 'Scalata madre',
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
 * ⚠️ I separatori dell'elenco RISULTATO FILTRI: **2 ore** dalla prima partita
 * del gruppo (Mattia, 29/10/2026). Solo l'elenco: i passi si compongono
 * ancora con `FINESTRA_ORE`, e cambiarla cambierebbe i piani.
 */
export const FINESTRA_ELENCO_ORE = 2

/**
 * ⚠️⚠️ **Le partite cominciate restano visibili 12 ore** (Mattia, 30/10/2026:
 * *"gioco la partita delle 14, entro alle 15 e non vedo più la partita e non
 * posso recuperarla"*). Nel piano e in RISULTATO FILTRI una partita esce solo
 * dopo 12 ore dall'inizio, o quando si salta il suo passo: prima si vede
 * spenta, e il passo si può ancora confermare.
 */
export const ORE_VISIBILI = 12

/**
 * Un passo **giocato**: confermato al banco (`confermato_il`, sql/50) o con
 * un esito. ⚠️ Il secondo caso tiene dentro i passi di prima del 30/10/2026,
 * che la conferma non l'avevano. È la domanda che fanno il cambio di
 * percentuale, il Reset partite e l'archivio: un passo giocato non si butta.
 */
export const giocato = (p) => !!p && (p.esito !== 'aperto' || !!p.confermato_il)

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
export function fasce(partite, ore = FINESTRA_ORE) {
  const ord = [...(partite || [])].sort((a, b) =>
    giorno(a.data).localeCompare(giorno(b.data)) || minuti(a.ora) - minuti(b.ora))
  const out = []
  for (const p of ord) {
    const ultima = out[out.length - 1]
    const vicina = ultima && ultima.giorno === giorno(p.data)
      && minuti(p.ora) - minuti(ultima.partite[0].ora) <= ore * 60
    if (vicina) ultima.partite.push(p)
    else out.push({ giorno: giorno(p.data), ora: String(p.ora || '').slice(0, 5), partite: [p] })
  }
  return out
}

/**
 * La percentuale **dell'utile** che l'app consiglia di mettere via, 0-100:
 * la regola di «Metà utile» (`METODO`).
 *
 * ⚠️⚠️ **Resta un consiglio e non un comando** (richiesta di Mattia,
 * 15/10/2026): la pagina ha un campo in percentuale e decide lui.
 * ⚠️ **Al primo passo «la puntata» si traduce in percentuale dell'utile**,
 * perché `applicaIncasso` lavora sull'utile: a quota 2,50 l'utile è 1,5 volte
 * la puntata e se ne mette via il 67%. ⚠️ **Sotto quota 2,00 l'utile è meno
 * della puntata**, quindi non la si può riprendere tutta: si mette via tutto
 * l'utile (100%) e si rigioca la puntata. Il backtest lo fa nello stesso modo,
 * perché usa questa funzione.
 * ⚠️ `posta` e `accumulato` non servono più (servivano ai pavimenti), ma le
 * chiamate li passano ancora e non fanno danno.
 */
export function percentualeConsigliata({ numero, montante, puntata }) {
  const utile = Number(montante) - Number(puntata)
  if (!(utile > 0)) return 0
  if (numero === 1) return Math.min(100, Number(puntata) / utile * 100)
  return 50
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
 * ⚠️⚠️ **Le soglie consigliate, e sono MISURATE.** Il 15/10 il tasto diceva
 * "consigliato 62 · 62" su una proposta a occhio di Mattia, e lui giustamente
 * ha chiesto *"su cosa si basa?"*. Un'app che consiglia deve poter dire perché,
 * o quella parola non va scritta.
 *
 * ⚠️ **Rimisurate il 22/10/2026** (`btscout/scripts/prova-soglie-scalata.js`,
 * otto stagioni, camminando nel tempo, sul filtro vero della pagina: `att ≥ s`
 * **e** `scelta ≥ s`, gamba ≥ 1,30). Lo script riproduce la riga del 58%
 * scritta a ottobre — 67,4% di azzeccate, resa 98,2% contro 98,3% — quindi è
 * la stessa misura, non una nuova.
 *
 * | soglia | partite | a giornata | azzeccate | resa | weekend con 1 passo | con 2 |
 * |---|---|---|---|---|---|---|
 * | 58% | 5.395 | 3,3 | 67,4% | 98,2% ±1,8 | 85% | **79%** |
 * | **61%** | **3.915** | **2,4** | **70,2%** | **99,5% ±2,0** | **82%** | **74%** |
 * | 65% | 2.345 | 1,4 | 73,1% | 100,3% ±2,5 | 73% | 48% |
 * | 68% | 1.359 | 0,8 | 74,6% | 100,2% ±3,1 | **50%** | **13%** |
 *
 * ⚠️⚠️ **La colonna che decide è quella dei WEEKEND, non la resa.** Mattia
 * aveva chiesto il 68%: lì la resa è la più alta della tabella, ma **metà dei
 * weekend non ha nemmeno un passo componibile** e **due passi — il suo vincolo,
 * "in due giornate recupero il capitale" — si compongono nel 13% dei weekend**
 * invece del 74%. La scalata non gioca partite singole: gioca una schedina da
 * 2,00, cioè due o tre gambe nello stesso blocco. **Una soglia che azzecca di
 * più e non lascia niente da comporre è la resa di una giocata che non
 * esiste**, e il guadagno non è nemmeno dimostrabile (100,2 ±3,1 contro
 * 99,5 ±2,0: intervalli sovrapposti).
 * ⚠️ Per questo `perche` porta anche i weekend: a 68% il tasto avrebbe scritto
 * *"resa 100,2% su 1.359 partite"*, la frase più bella della tabella, tacendo
 * la cosa che conta.
 *
 * ⚠️ **Fra 54% e 67% la resa non si distingue**: gli intervalli si sovrappongono
 * tutti, e fuori da quel pianoro peggiora da entrambe le parti. Il 61% è il
 * punto più stretto che tiene in piedi il metodo, **non** il punto che rende di
 * più — quello non esiste in modo dimostrabile.
 *
 * ⚠️⚠️ **E una stagione sola non può misurare la resa** (chiesto da Mattia il
 * 22/10: *"misura sulla 25/26"*). A 61%, stagione per stagione: 97,3 · 101,9 ·
 * **103,5** · 98,3 · 101,1 · 97,4 · **96,9** (25/26) · 95,0 — stesso filtro,
 * stesso codice, **±5 su ognuna**: 96,9 e 103,5 sono lo stesso numero misurato
 * due volte. Quello che regge il 99,5% è che **4 stagioni su 8 stanno sopra il
 * 100 e la mediana è 99,7**: non è il merito di una stagione.
 * ⚠️ **Il MATERIALE invece sì, e la 25/26 conferma**: 2,4 partite al giorno,
 * 85% di weekend con un passo, 78% con due — quante partite e quanti weekend
 * giocabili dipendono da quanti campionati e quante quote abbiamo, e *quello*
 * cambia negli anni. ⚠️ La 26/27 non si legge: 7 weekend e 54 partite.
 */
/*
 * ⚠️⚠️ **Dal 26/10/2026 il consigliato è SOLO l'attendibilità** (Mattia, con
 * «Metà utile»): la scelta è spenta (0), come nel backtest dei prelievi.
 * Rimisurato con `prova-soglie-scalata.js --dettaglio=61 --solo-att`: 2.883
 * partite, 2,4 al giorno, resa **99,5% ±2,4**, l'85% dei weekend con almeno
 * un passo a 1,90. ⚠️ Le «8 stagioni» di oggi sono **6 europee**: le altre
 * due sono le stagioni ad anno solare del Giappone, senza quote. I numeri del
 * 22/10 (3.915 partite) non si confrontano con questi: l'archivio da cui
 * partono le otto stagioni non è più lo stesso.
 */
export const CONSIGLIATO = {
  att: 61, scelta: 0,
  resa: 99.5, partite: 2883, aGiornata: 2.4, weekend: 85,
  perche: 'resa 99,5% su 2.883 partite · 2,4 al giorno',
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
/**
 * ⚠️⚠️ **La usa anche il BET BUILDER** (22/10/2026), e non è un riuso
 * disinvolto: *un passo della scalata* e *una schedina a quota obiettivo* sono
 * **la stessa cosa** — gambe prese dalle migliori finché il prodotto arriva a
 * una quota. Scriverne due sarebbe stato il difetto di famiglia di questo
 * progetto: due copie che prima o poi divergono.
 * ⚠️ `ordina` dice **con che criterio** si prendono le migliori. La scalata
 * usa l'attendibilità (il miglior selettore misurato); il Bet Builder lascia
 * scegliere a Mattia schedina per schedina — voto, attendibilità, scelta o VPM.
 */
export function componiPasso(candidate, { quotaMinima, maxGambe = MAX_GAMBE,
  pavimento = QUOTA_MINIMA_GAMBA, ordina = (c) => c.att ?? 0 } = {}) {
  const buone = (candidate || [])
    .filter(c => Number(c.quota) >= pavimento)
    .sort((a, b) => (ordina(b) ?? -1) - (ordina(a) ?? -1))
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
 * ⚠️⚠️ **Il conto della scalata, calcolato e mai scritto** (Mattia,
 * 24/10/2026: *"se perdo 3 bankroll interi, quindi 300 €, e una volta incasso
 * 200 €, devo capire di essere in perdita e non in utile"*).
 *
 *     conto = Σ ricariche + Σ (bankroll_finale − bankroll_iniziale) delle chiuse
 *
 * È la stessa regola del bankroll del gruppo (regola 1), su soldi diversi: un
 * numero memorizzato si può ritoccare, una somma di fatti no. Prima il
 * capitale era *"l'ultimo bankroll_finale"* più i tasti −/+, e quanto ci si
 * era messo dentro non lo sapeva nessuno.
 *
 * `live` è il bankroll live della scalata aperta (`casse.live` nella pagina):
 * con una scalata aperta il conto di adesso è quello fermo più quanto quel
 * giro ha guadagnato o perso finora. ⚠️ Funziona anche se si è ricaricato a
 * scalata aperta: la ricarica entra in `versato`, il giro aperto conta solo la
 * sua differenza.
 *
 * Torna `versato` (quanto è entrato), `fermo` (il conto senza il giro aperto:
 * è il bankroll con cui si apre il prossimo), `conto` (adesso) e `risultato`
 * (`conto − versato`: in rosso se si è in perdita, qualunque sia l'ultimo
 * incasso).
 */
export function contoDi({ ricariche = [], storico = [], aperta = null, live = null } = {}) {
  const versato = ricariche.reduce((a, r) => a + Number(r.importo || 0), 0)
  const chiusi = storico
    .filter(s => s.stato !== 'aperta' && s.bankroll_finale != null)
    .reduce((a, s) => a + Number(s.bankroll_finale) - Number(s.bankroll_iniziale), 0)
  const fermo = versato + chiusi
  const conto = aperta && live != null ? fermo + Number(live) - Number(aperta.bankroll_iniziale) : fermo
  return { versato, fermo, conto, risultato: conto - versato }
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
