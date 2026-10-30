# LE CONVENZIONI DEL CODICE E DELL'INTERFACCIA

> Tema, pezzi condivisi, navigazione, prestazioni: come si scrive una pagina in questo progetto.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

## Convenzioni del codice

- **Colori e font**: solo da `src/theme.js`. Nelle pagine non deve tornare
  nessun valore hardcoded — `alpha(C.oro, .12)`, mai `rgba(201,168,76,0.12)`.
  `index.css` ne tiene una copia per il poco CSS fuori da React: se cambi un
  colore lì, riportalo in `theme.js` e viceversa.
  ⚠️ **La copia è stata ridotta al minimo il 12/10/2026**: delle quattordici
  variabili CSS **otto non le usava nessuno**, e `--surface: #0f0f0f` non
  corrispondeva a nessun colore del tema — stava fra `barra` (#0d0d0d) e
  `pannello` (#111111). **Una copia che nessuno legge non si accorge di essere
  sbagliata.** Restano `--bg`, `--border`, `--text`, `--sans` (più
  `--barra-alta` e `--barra-bassa`, che sono misure e le usa il JSX).
- **Navigazione**, rifatta il 12/10/2026 (scelta di Mattia): in basso
  (`TABS_BASE`) **Dashboard · Slot · Spin · Partite**, cioè il giro
  settimanale — si guardano le partite, si compila la spin, si gioca. Nel menu
  ☰ (`VOCI_MENU`) il resto: **Partite votate, Storico, Andamento, Reporting,
  Bilancio, Utenti**. ⚠️ **Reporting e Bilancio sono scesi dalla barra al
  menu**: si aprono a giornata chiusa, non mentre si decide.
  Una pagina nuova va nel menu, non come quinto tasto in basso.
  ⚠️⚠️ **La TabBar si filtra per ruolo esattamente come il menu**: `Spin` è
  `soloAdmin`, e senza il filtro un utente normale vedrebbe un tasto che lo
  porta su una pagina che la RLS gli svuota. Con tre tasti invece di quattro la
  barra si ridistribuisce da sola (`flex:1`). Come sempre, `soloAdmin` nasconde
  e basta: **la protezione è la policy**.
- ⚠️⚠️ **Ogni pagina ha il suo INDIRIZZO dal 29/10/2026** (lotto 2, il
  routing): `/` è la Dashboard, le altre sono `/<id>` con l'id di `TABS_BASE`
  e `VOCI_MENU` — **un elenco solo**, l'indirizzo è l'id. La scheda di una
  partita è `/partite/:id` e `/votate/:id` (`components/SchedaPartita.jsx`).
  **Niente libreria router**: `lib/indirizzi.jsx` (`vai`, `chiudiVerso`,
  `Collegamento`) e `hooks/usaPercorso.js` sulla History API, una cinquantina
  di righe. Le regole:
  · i tasti sono **`<a href>` veri** (`Collegamento`), non `onClick` e basta:
    «apri in una nuova scheda» deve funzionare;
  · una scheda si chiude con **`chiudiVerso(lista)`**: se ci si è arrivati
    dalla lista è un «indietro» vero, se ci si è arrivati da un link
    sostituisce l'indirizzo — indietro porterebbe fuori dall'app;
  · un **link scaduto si apre lo stesso** (scelta di Mattia): la lista ha solo
    le future, quindi `usaPartitaAperta` chiede la riga **per id** e la scheda
    dice «GIÀ GIOCATA» col risultato; la stellina lì è spenta;
  · indirizzo sconosciuto o pagina solo-admin da utente normale → **Dashboard**,
    con `replace` e **solo dopo `booting`** (prima `isAdmin` non si sa).
    Non protegge niente: a impedire di scrivere è RLS, e `prova-permessi.js`
    ora prova anche che un utente normale **non scrive** la griglia;
  · **mai `vai()` dentro `onAuthStateChange`**: dopo il login l'indirizzo è
    già giusto, perché il login si mostra al posto della pagina;
  · su Vercel serve **`app/vercel.json`** (tutto → `index.html`), o un
    ricaricamento su `/partite` è un 404. In sviluppo lo fa Vite da solo;
  · `guarda.mjs` cerca i tasti in basso come **`link`**, non più `button`.
  Fuori, per scelta: i filtri nell'indirizzo, le schede aperte da Road to
  weekend e dal Builder (restano finestre della pagina).
  ⚠️ In basso l'etichetta è **"Spin"**, non "Spin provvisorie": i tasti sono a
  9px e il nome intero non ci sta.
  ⚠️ **L'ordine è quello del gesto, non dell'importanza**: Dashboard · Slot ·
  Spin · Partite.
- **L'attendibilità è in `src/lib/attendibilita.js`**, solo calcoli: probabilità
  dal consenso (`avg_ap_*`, non l'exchange), regole di gioco, categorie, finestra
  della settimana. **La composizione delle spin è in `src/lib/spin.js`**
  (candidate, ordine con le stelline, celle della griglia, scrittura). Le
  pagine (`PartitePage`, `SpinProvvisoriePage`) leggono partite e voti dallo
  stesso hook `hooks/usaProssime.js`: **non duplicare la logica nelle pagine.**
  **La scrittura della griglia sta in `lib/griglia.js`**, non in `spin.js`:
  quello resta puro e provabile da terminale — è così che si è trovata la causa
  vera del difetto delle spin (2/10/2026).
  La riga della lista è `components/RigaPartita.jsx`, la scheda intera
  `components/DettaglioPartita.jsx`, e **la testata (squadre, attendibilità,
  data) è la stessa per tutt'e due**: `components/TestataPartita.jsx`, in
  versione compatta o grande. Cambiarla lì cambia entrambe — è voluto.
  La scelta a mano di una casella della spin è `components/ScegliCasella.jsx`
  (finestra al centro, filtri votate/categorie); quella della griglia Slot è
  `components/SceltaPartita.jsx` (tendina ancorata alla riga).
  **Lista e scheda sono finite** (lotti A-D, 2-5 ottobre 2026): niente è
  rimasto con l'aspetto vecchio.
  **Le classifiche** arrivano tutte insieme da `classifiche()` (sql/18) via
  `hooks/usaClassifiche.js`, che le chiede **una volta per sessione**: accanto a
  ogni squadra c'è la sua posizione, colorata **a terzi** del campionato
  (`fasciaDi`) — non a soglie fisse, perché si va da 12 squadre a 24.
  ⚠️ **Dal 15/10/2026 è una targhetta `1/20`, a destra del nome, non più un
  tondo col solo `3°` sopra il nome** (il tondo bocciato da Mattia; proposte
  tre strade, scelta la targhetta). ⚠️⚠️ **E il guadagno non è estetico**: nel
  tondo stava la sola posizione e *"su quante squadre"* viveva nel `title`, che
  **su telefono non esiste** — regola già scritta qui sotto fra le trappole.
  Senza il denominatore la cifra non si legge: **12° è metà classifica in un
  campionato da 24 squadre e ultimo in uno da 12**. È la stessa ragione per cui
  il colore va a terzi.
  ⚠️ Il denominatore è **più piccolo e più tenue** del numeratore: la posizione
  è il dato, "su quante" è il contesto che la rende leggibile — alla stessa
  misura sarebbero due numeri in gara fra loro.
  ⚠️ Il nome squadra è scesO di due punti (`clamp(11-14px)` in lista,
  `clamp(13-19px)` in scheda) **perché la targhetta gli toglie ~40px di
  larghezza**: le due cose sono una sola modifica, non due.
  Le sigle dei campionati a schermo (ITA1, ENG1…) stanno in `lib/campionati.js`
  e **non toccano il database**: `div` resta quella di football-data.
- **Le librerie in `src/lib/` importano con l'estensione** (`'./attendibilita.js'`):
  Vite non se ne accorge e Node le può eseguire da terminale per provarle sui
  dati veri, senza browser.
- **La card di una partita è composta così** (10/10/2026, disposizione decisa da
  Mattia): in alto le due squadre con **la giocata in mezzo** — `TestataPartita`,
  la stessa per lista e scheda — e sotto la **barra dei cinque numeri**:
  `QUOTA · ATTEND. · VPM · RESA · VOTO`. La barra è `components/BarraPartita.jsx`
  e **la usano sia la riga della lista sia la scheda**: nella scheda ha preso il
  posto del riquadro con le quote di mercato (max · media · equo) e del Grado,
  così i numeri sono gli stessi nelle due schermate e non possono divergere. Le
  quote per intero restano nei **dettagli completi** in fondo alla scheda.
  ⚠️ Cinque colonne su un telefono da 375px fanno ~63px: il valore sta a **14px**
  e l'etichetta a **7px**, e la fascia del valore ha **altezza fissa** — senza,
  le cinque etichette finiscono a quote diverse. ⚠️ Il segno di VPM è
  **appoggiato al bordo sinistro** della sua colonna, fuori dal flusso: accanto
  alla cifra la spostava fuori centro.
- **La spiegazione dei cinque numeri** è `components/LegendaPartite.jsx`, una
  card a scomparsa **sopra il titolo** della pagina Partite, chiusa di default.
  Se cambia il significato di un numero, va aggiornata lì: è l'unico posto dove
  è scritto a schermo.
- **L'ordine della lista sta in `src/lib/ordine.js`**, non nella pagina: **un
  criterio per ogni colonna della barra** (quota, attendibilità, VPM, resa,
  voto) con i confronti, e `scripts/prova-ordine.js`
  li esegue sui dati veri **e su righe finte** con i valori mancanti. Un
  ordinamento dentro un componente non si prova, e i suoi difetti non si vedono:
  un confronto che torna `NaN` non lancia niente, lascia solo la lista in un
  ordine qualunque. ⚠️ Il valore assente va **in fondo** (`fondo()`), e ogni
  criterio ha **due criteri di riserva** — attendibilità, poi data — altrimenti
  due partite a pari merito si scambiano di posto a ogni ridisegno.
  ⚠️ I tasti dell'ordine sono **sempre visibili**, attaccati alla lista e fuori
  dal pannello dei filtri: un filtro si mette una volta, l'ordine si cambia
  continuamente per guardare la stessa lista da cinque lati. **Il secondo tocco
  sullo stesso tasto inverte il verso** — serve sulla quota, che a volte la
  vuoi bassa — e il verso inverso deve tenere i **vuoti sempre in fondo**
  (provato da `prova-ordine.js`). L'ordinamento avviene
  **dentro lo stesso `useMemo` dei filtri**, dopo di loro, così vale sempre su
  quello che è rimasto visibile.
- **L'ordine dei blocchi nella scheda** (`DettaglioPartita`) è una scelta di
  Mattia, non un caso: evento e giocata · forma · **gol attesi** · classifica ·
  scontri diretti · **VPM** · consenso di mercato · dettagli completi.
  ⚠️ I **gol attesi** sono passati dal fondo a **subito sotto la forma** il
  12/10/2026: sono la lettura della partita, e si leggono accanto a come stanno
  andando le squadre, non in coda dopo i numeri. ⚠️ Il loro blocco sta **fuori**
  dal gruppo `{forma && …}` di proposito — dipende da `golAttesi()`, non dalla
  forma, e lì dentro sparirebbe mentre la forma carica o se la sua query
  fallisce. Per questo il gruppo è spezzato in due. Il consenso sta **per
  ultimo** perché sono le quote crude, il materiale da cui nasce
  l'attendibilità, non una cosa da leggere per prima; e le tre quote
  `max · media · equo` **non stanno più in cima** (9/10/2026) — erano numeri da
  consultare, non da guardare, e vivono nei dettagli completi con le terne
  intere. Prima di rimettere qualcosa in alto, chiedere.
- ⚠️⚠️ **Le finestre sono quattro card 2×2** (22/10/2026), non più pastiglie
  in fila: `Oggi · Domani · Fino a lunedì · Anche la prossima`. Il guadagno
  non è la misura, è che **il numero di partite diventa leggibile** — serve a
  decidere *se vale la pena allargare*, che è l'unica domanda di quel comando,
  e in pastiglia stava appiccicato all'etichetta in corpo 10. ⚠️ Due per riga
  perché quattro in fila su 375px tagliavano «Anche la prossima». ⚠️ E
  *"niente in più"* si scrive **nella card**: prima viveva nel `title`, che
  **su telefono non esiste**.
  ⚠️⚠️ **«Tutte» è uscita** (scelta di Mattia): la finestra più larga è il
  lunedì della settimana dopo, quindi **le partite oltre quell'orizzonte non
  si vedono più dalla pagina Partite**. Misurato il giorno del cambio: 207
  future in calendario, **zero** oltre il limite — ma The Odds API arriva a
  tre o quattro settimane, quindi un giorno ce ne saranno. Non sono perse
  (Road to weekend filtra per soglia, non per data) e basta rimettere una riga
  in `FINESTRE`.
- ⚠️⚠️ **«scelta minima» ha preso il posto di «voto minimo»** nei filtri
  (22/10/2026), con `+`/`−` tenuti premuti (`TastoRipeti`) invece di un campo
  di testo. ⚠️ **Taglia più di quanto sembri, ed è il suo senso**: `scelta` è
  **nulla** quando il campo contraddice il mercato, quindi qualunque soglia —
  anche 1% — butta fuori *tutti* i disaccordi, cioè le partite dove il segno
  del campo vince il 27,2% contro il 29,5% del book e giocarle rende 86,8%.
  ⚠️ Il confronto è sul numero **arrotondato come si vede**, come in Andamento.
- **I filtri della lista** (`PartitePage`) stanno dietro un tasto `⚙ filtri`,
  con le **targhette di quelli accesi** fuori (si tolgono toccandole) e il
  conto `visibili/totali`. Rifatti così il 2/10/2026 perché in fila non si
  capivano: una pagina con più di tre filtri li mette in un pannello, non in
  riga.
- ⚠️⚠️ **Spaziature e raggi vengono da `SP` e `R` di `theme.js`**, e **si
  adottano una pagina per volta** (21/10/2026). I passi sono ricavati dai valori
  già in uso — `gap: 8` compariva 49 volte, 6 venticinque, 10 diciannove — e
  `SP.xl`/`SP.xxl` **sono** i 14 e 16 del riempimento di `Card`, quindi entrare
  nei pezzi condivisi non ha cambiato un pixel. ⚠️ **Perché una pagina per
  volta e non tutte insieme**: cambiare cinquecento `padding` alla cieca sposta
  i layout, e un trabordamento su un telefono stretto non si vede dal terminale.
  ⚠️ `R.pastiglia` è **999 e non 20**: su un elemento basso 20 è già un mezzo
  cerchio, ma se l'elemento cresce torna a essere uno spigolo arrotondato. 999
  è *"tonda qualunque sia l'altezza"* — una proprietà, non una misura.
- ⚠️⚠️ **Il contrasto si misura, non si guarda.** Il 21/10/2026 `spento` — il
  colore **più usato dell'app, 173 volte**, quello di tutte le etichette — stava
  a **2,47:1** sulla card, sotto il minimo leggibile di 4,5:1. Non era una
  sensazione: il briefing diceva *"etichette con poco contrasto"* e il calcolo
  gli dava ragione. Ora è `#9AA2AC`, **6,97:1**. ⚠️ Un'etichetta secondaria
  deve essere **discreta, non quasi invisibile**, e la differenza fra le due
  cose è un numero. ⚠️ `fantasma` resta basso (2,27:1) **ed è giusto**: è il
  testo disabilitato, che per convenzione è escluso dal requisito.
- ⚠️ **Il fondo di una card NON la stacca dalla pagina, e non è un difetto da
  correggere di slancio**: `fondo #0B0D10` → `card #14171B` fa **1,08:1**,
  esattamente come i vecchi `#090909` → `#141414`. È la tavolozza scelta. Quindi
  **una card si vede grazie al bordo**, ed è la ragione per cui l'app è un
  reticolo di riquadri: per staccarla col solo fondo servirebbe ~`#1A1F26`, un
  passo oltre la tavolozza. **Decisione aperta, da prendere guardando lo
  schermo.**
- ⚠️ **`:focus-visible` sta in `index.css`** e prima non c'era: si vedeva
  l'anello azzurro di sistema sopra un tema scuro. ⚠️ `focus-visible` e **non**
  `focus`: così compare con la tastiera e non resta attaccato al pulsante dopo
  averlo premuto col dito.
- ⚠️⚠️ **Le misure dei caratteri vengono dalla scala `S` di `theme.js`**, non si
  scrivono a mano (21/10/2026): dodici passi con un ruolo — `S.base` è il testo
  corrente, `S.minuta` un contrassegno, `S.evidenza` un titolo grande o un
  numero che conta. Prima erano **19 misure sparse** e *"piccolo"* voleva dire
  9, 10 o 11 a seconda di chi scriveva. ⚠️ `S.nano` (7) è **misurato**, non
  scelto: è l'etichetta sotto i cinque numeri della barra, cinque colonne su
  375px. ⚠️ I nomi delle squadre restano in `clamp()`, perché devono
  restringersi invece di andare a capo. ⚠️ Le **spaziature** non sono ancora in
  scala: `padding` e `gap` sono numeri a mano.
- ⚠️ **La traccia di una barra di avanzamento è `C.traccia`**, cioè *"un po'
  più chiara di quello che c'è sotto"*, **non** un token di superficie. Scritta
  come colore fisso è sparita appena le righe hanno preso quel fondo (1,00:1),
  e la cura non è rimettere un bordo: è un colore che si schiarisce su
  qualunque fondo. ⚠️ Era scritta in **due** file — due copie divergono.
- ⚠️ **Una pastiglia è `R.pastiglia` (999), mai 20**: 20 è tondo finché
  l'elemento resta basso, poi torna a essere uno spigolo arrotondato. Dodici
  punti lo facevano ancora, ed è stato corretto nel tagliando del 21/10/2026.
  ⚠️ **`R` descrive 23 raggi su 94**, e i due più usati — 7 (×20) e 8 (×22) —
  non ci sono: all'occhio sono lo stesso raggio, scelto a caso 42 volte.
  **Unificarli è una decisione aperta**, non una pulizia da fare di slancio.
- ⚠️⚠️ **Il tagliando cerca gli export senza usi in TUTTO il repo, e
  distingue due cose.** Il **codice** che non chiama più nessuno si toglie —
  il 22/10/2026 `fattoreVpm` e `FATTORE_SCALA`, orfani da quando il voto è
  diventato una pagella — mentre le **costanti misurate** (`PAVIMENTI`,
  `GG_MEDIO`, `DISPERSIONE`, `BASI_GOL`…) restano esportate anche senza usi
  esterni: esistono per essere lette e provate da terminale, e sono la
  documentazione dei numeri. Confondere le due vuol dire cancellarla.
- ⚠️ **Un controllo del codice morto che guarda solo `app/` sbaglia.**
  `componiPasso` e `simula` in `lib/scalata.js` sembrano senza usi e li chiama
  `btscout/scripts/prova-scalata.js`: `app/src/lib/` è **condiviso col
  motore**, ed è scritto in cima a questo file. Si cerca in tutto il repo.
- ⚠️⚠️ **Le superfici sono una SCALA, e una card si vede perché è più chiara,
  non perché è cerchiata** (21/10/2026). Prima `card #14171B` su
  `fondo #0B0D10` faceva **1,08:1**, cioè niente: l'unica cosa che separava un
  riquadro dalla pagina era il bordo disegnato attorno, e da lì i **161 bordi
  da 1px su 61 superfici** che davano all'app l'aria di un gestionale. Nessuno
  l'aveva scelto: era la conseguenza di due fondi indistinguibili.
  La scala adesso è `fondo 1,00 → card 1,19 → pannello 1,25 → attiva 1,36`,
  più `pozzo` che è l'unico gradino **in giù** (i campi, incassati).
  ⚠️ `attiva` serve a due cose: lo stato premuto/scelto **e una superficie
  dentro un'altra** — senza, una card annidata sparisce ora che i bordi non
  ci sono più.
  ⚠️ `stileCard` dà un bordo **1px trasparente**: il bordo si passa
  (`colore`) solo quando **significa** qualcosa — la categoria di una partita,
  com'è andata una spin. E resta 1px trasparente invece di `none`, o la misura
  di ogni card cambierebbe di 2px.
- ⚠️ **Le etichette sono parole: vanno in Sora.** Mono maiuscolo e spaziato è
  *letteralmente* l'estetica di un terminale, ed era rimasto sulle etichette
  della barra dei cinque numeri e sulle dieci pastiglie dei filtri. La regola
  del mono vale per le **cifre**.
- ⚠️⚠️ **Quando una colonna deve restare uguale, si fissa la LARGHEZZA e si
  adatta la scritta — non il contrario.** La colonna della giocata aveva un
  `minWidth`: `1+O1,5` occupa 3,6px per ogni px di corpo, quindi a 19px
  cresceva a 68px contro i 58 del minimo, e quei **22px** li guadagnava la
  barra (che smetteva di essere un metro) e li perdevano i due nomi, **solo
  sulle combinate**. Ora la larghezza è fissa e il corpo si calcola
  dallo spazio. ⚠️ Vale anche per l'**altezza**: due righe riservate al nome,
  o un nome che va a capo alza un lato e sfalsa le due squadre.
- ⚠️⚠️ **Nell'interfaccia non si scrivono emoji: i segni vengono da
  `components/Icona.jsx`** (21/10/2026). Due motivi, il secondo è un difetto
  vero: **un'emoji non obbedisce al colore del testo** — nella tab bar
  convivevano due glifi (`◈` `⊞`) e due emoji (`🎰` `⚽`), e le seconde
  restavano a colori pieni anche da spente, quindi **due tasti su quattro
  sembravano accesi quando non lo erano**, cioè l'unico segnale di "dove sono"
  non funzionava su metà della barra. E **un'emoji la disegna il sistema
  operativo**, quindi la stessa schermata ha tre aspetti su tre telefoni.
  Il set: riquadro 24×24, **solo contorno**, spessore 1,6, `currentColor`,
  `aria-hidden`. Una icona nuova si aggiunge lì, non nel JSX.
  ⚠️ `pieno` esiste **per una sola icona**, la stella del voto, che deve
  distinguere votata da non votata come facevano `★` e `☆`.
  ⚠️ Restano i **glifi monocromatici** (`✓ ✗ ✕ ⚙ ·`): obbediscono al colore e
  non sono emoji. Le emoji nei **commenti** e in questo file non c'entrano.
- ⚠️ **Header, contenuto e tab bar stanno nella stessa colonna** (`COLONNA`,
  720px, in `App.jsx`). Il contenuto era già incolonnato, header e tab bar no:
  su un portatile il nome dell'utente finiva all'estremo destro, il logo
  all'estremo sinistro e la pagina in mezzo — **tre allineamenti diversi** — e
  i quattro tasti erano larghi 320px l'uno. Su telefono non cambia niente.
- ⚠️ **Il marchio sta dentro `index.html`** come SVG in un `data:`: non esiste
  una cartella `public/`, quindi senza di lui il browser chiedeva
  `/favicon.ico` e si prendeva un **404 a ogni caricamento, su ogni pagina**.
- ⚠️⚠️ **La superficie di un riquadro viene da `stileCard()`** (`ui.jsx`), e
  `Card` è lo stesso stile avvolto in un componente. Si usa il componente nel
  caso normale e lo **stile** quando la superficie è un `<button>`, una
  `<label>` o una cella dentro un `map` con altre proprietà. Esiste perché sei
  pagine — Dashboard, Bilancio, Reporting, Slot, Utenti, Login — se la
  riscrivevano a mano, **19 volte**, e un cambio di `Card` non le toccava: un
  restyling le avrebbe lasciate con l'aspetto vecchio accanto a quello nuovo.
  ⚠️ Un `border` scritto a mano sopra `stileCard` va bene **quando il bordo dice
  qualcosa** (nella Dashboard dice com'è andata la spin): è informazione, non
  stile.
- ⚠️⚠️ **Le righe della lista sono `memo`, e questo vincola chi le usa.**
  `RigaPartita` è avvolta in `memo` e `onVota`/`onApri` prendono **l'id**: la
  pagina passa `onApri={setApertaId}`, non `onApri={() => apri(p.id)}`. Una
  funzione costruita nel JSX è una proprietà nuova a ogni ridisegno, quindi il
  `memo` non salta niente — e con 67 partite erano **~270 componenti rifatti a
  ogni tasto premuto** in un campo dei filtri. Per lo stesso motivo `vota`,
  `votiDi`, `mioVoto` e `ricarica` in `usaProssime` sono in `useCallback`.
  ⚠️ **Basta che una proprietà torni a essere costruita sul posto e il `memo`
  smette di servire, in silenzio.**
- ⚠️⚠️ **Ogni pagina è un pezzo a parte, e una pagina nuova va aggiunta così**
  (21/10/2026): in `App.jsx` con `lazy(() => import('./pages/…'))`, non con un
  `import` in testa. Prima stavano tutte in un file solo da **437 kB** —
  aprendo l'app si scaricavano e si compilavano anche Andamento, Reporting,
  Bilancio e Road to weekend, cioè quattro pagine che in una sessione normale
  non si aprono. Il pezzo principale è passato a **236 kB** (116 → 63 kB
  compressi). ⚠️ **Dashboard e Login restano statiche**: sono le prime due cose
  che si vedono, e metterle in un pezzo a parte vorrebbe dire una seconda
  richiesta prima di poter disegnare qualcosa.
- ⚠️⚠️ **Un hook che legge dati condivisi ha la memoria di modulo.**
  `usaVpm`, `usaClassifiche` e — **dal 21/10/2026** — `usaProssime` tengono il
  risultato in una variabile del modulo con la richiesta in volo accanto
  (`memoria` / `inCorso`), quindi la chiamata si fa **una volta per sessione**
  anche se sei pagine montano lo stesso hook. Senza, cambiare pagina quattro
  volte scaricava quattro volte le stesse 67 partite. ⚠️ **E la memoria deve
  avere un modo di buttarla** (`ricarica()`): il calendario cambia quando gira
  l'importazione, e una cache senza invalidazione è il difetto peggiore di una
  cache. ⚠️ Chi scrive (il voto) aggiorna **anche la memoria**, o la stellina
  sparisce tornando sulla pagina.
- **I formattatori stanno in `src/lib/formato.js`** — `pct`, `eur`, `gg`,
  `ggAnno`, `giorno`, **`quando`** (un istante nell'ora locale, dal 22/10/2026)
  — e non si riscrivono nelle pagine. ⚠️ Sono nati da tre
  copie di `pct` con **due nomi** (`pct` in `TestataPartita`, `pct1` in
  `BarraPartita`, una locale in `ScalataPage`) che **erano già divergute**: due
  guardavano il valore nullo e la terza scriveva `NaN%`. Stessa storia della
  data breve, in tre pagine, una con l'anno e due senza. È lo stesso difetto del
  campo di testo e della chiave del giorno negli script: **una copia che nessuno
  confronta non si accorge di essere sbagliata.**
- **Pezzi ricorrenti** in `src/components/ui.jsx`: `Card`, `Etichetta`,
  `StatCard`, `Btn`, `Input`, `Badge`. Prima di riscrivere una card a mano,
  guarda se c'è già.
  ⚠️ **`Input` e `Badge` erano dichiarati qui e non li usava nessuno**, mentre
  `UtentiPage` e `LoginPage` si riscrivevano il proprio campo di testo: **tre
  copie dello stesso stile con tre raggi, tre riempimenti e due corpi
  diversi**. Adottati il 15/10/2026, le copie locali togliere. Il campo di
  testo dell'app ora è definito **in un posto solo**.
  ⚠️ `Badge` ha preso un parametro `sfondo`, perché **il fondo non è sempre la
  tinta del testo**: il ruolo admin in `UtentiPage` è scritto in `blu` su un
  fondo di `bluPieno`, e sono due token diversi di proposito. Senza quel
  parametro quella pagina continuava a riscriversi la targhetta — e un pezzo di
  libreria che non copre il caso reale è il motivo per cui nasce la copia.
  ⚠️ **Cosa cambia a vedersi**: nei campi di `UtentiPage` un pixel di raggio e
  uno di riempimento; nel login il corpo passa da 15 a 14 — **invisibile su
  telefono**, dove `index.css` forza comunque i campi a 16px sotto
  `@media (pointer: coarse)` per non far ingrandire la pagina a iOS. La
  targhetta del ruolo è un filo più in grassetto (600 → 700).
  ⚠️ **Non tutto quello che somiglia a un campo è un `Input`**: `campo` in
  `PartitePage` (tondo, mono, 11px, largo 74) e `cell()` nella Slot sono altre
  cose, e restano dove sono.
- **`npm run lint` prima di dire che è fatto.** ESLint sta in `eslint.config.js`
  (configurazione piatta) e serve a **una** cosa: i nomi che non esistono
  (`no-undef`) e quelli rimasti inutilizzati — cioè la coda che resta quando si
  toglie un import. Deve restare a **0 errori**: un linter che ne stampa
  ventisette ogni volta si impara a ignorarlo. Gli 8 **avvisi** su
  `exhaustive-deps` sono voluti e restano avvisi.
  ⚠️ `rules-of-hooks` è **spenta in `src/hooks/`**: i nostri hook si chiamano
  `usa*` — italiano, come tutto il resto — e la regola riconosce un hook solo
  dal prefisso `use`, senza poter essere istruita. Bocciava tutti e quattro i
  file. Nelle pagine e nei componenti resta accesa.
  ⚠️ `eslint-plugin-react` **non è installato**: la 7.37 non supporta ESLint 10
  e non va forzata con `--legacy-peer-deps`.
- **Il contatore dello sviluppo** sta in `src/versione.js` e si vede nella barra
  in alto, accanto al nome. **Si alza a mano a ogni commit che cambia l'app**:
  terza cifra per una rifinitura, seconda per un lotto o una funzione nuova,
  prima per un cambio d'impianto. Serve perché l'app si aggiorna da sola su
  Vercel: senza un numero a schermo non si sa se si guarda il lavoro di oggi o
  la cache di ieri. ⚠️ Non è la `version` di `package.json`, che resta a npm.
- **Script generali, non usa-e-getta.** `confronta-utenti.js` e
  `allinea-utenti.js` prendono due nomi qualsiasi. Se serve una cosa una volta
  sola, probabilmente servirà di nuovo.
- **I commenti spiegano il perché**, non il cosa. Se una riga è strana, dire
  quale problema evita vale più di descrivere cosa fa.
- ⚠️⚠️ **Dove sta il bordo della pagina: `src/lib/layout.js`** (22/10/2026).
  `COLONNA` (720) stava in `App.jsx` e la leggeva solo lui; dal momento in cui
  l'ha chiesta anche un **componente** — `BarraCampionati`, ancorata al bordo
  destro della colonna — importarla da lì avrebbe chiuso un anello, perché
  `App` carica le pagine con `lazy` e una pagina che torna a importare `App` è
  il ciclo che si rompe **solo in produzione**, dove i moduli vengono uniti in
  un ordine diverso. ⚠️ Non sta in `theme.js` e non è una spaziatura: `theme`
  dice **come sono fatte** le cose, `layout` **dove finiscono**. Lì c'è anche
  `bordoDestro(scostamento)`, il conto che il menu faceva a mano.
- ⚠️ **Le tre barre fisse si misurano con le stesse due variabili**
  (`index.css`): `--barra-alta` (testata) e `--barra-bassa` (tab bar). Chi si
  ancora in verticale — il menu, il foglio della scheda, la barra dei
  campionati — parte da quelle, così quando una delle due cambia altezza gli
  altri restano d'accordo. **Ed è appena successo**: il 22/10 la tab bar è
  cresciuta due volte, e `--barra-bassa` è salita con lei (62 → 70 → 78).
  ⚠️⚠️ Quel numero **è** l'altezza della barra, non un margine a piacere:
  lasciarlo indietro nasconde le ultime righe di ogni pagina.
- ⚠️⚠️ **`SOTTO_BARRA` (`App.jsx`) non viene da `SP`, ed è voluto.** È quanto
  spazio resta sotto l'etichetta della tab bar, cioè la **distanza dei
  bersagli dal bordo inferiore dell'iPhone**, dove stanno l'indicatore Home e
  la risalita di sistema: un vincolo del telefono, non una scelta di stile.
  Mattia l'ha alzata due volte il 22/10 (*"rischio di attivare Siri quando
  clicco"*, poi *"è ancora troppo bassa"*): **6 → 12 → 20**. ⚠️ Solo il
  riempimento **in basso** sposta i tasti: la barra è ancorata a `bottom: 0`,
  quindi allargarla in modo simmetrico li lascerebbe dov'erano.
- ⚠️ **Una striscia `fixed` sopra una lista si riserva lo spazio, non lo
  prende**: `PartitePage` ha 40px di margine a destra per la barra dei
  campionati. Lasciarla galleggiare avrebbe coperto la colonna del voto — ed è
  il difetto che questo progetto ha già fotografato due volte.

---


### `/slot/N` (30/10/2026)

La Slot legge la spin dall'indirizzo (`/slot/2`), e cambiando spin l'indirizzo
la segue (`vai(..., { sostituisci: true })`, niente voce nuova nella
cronologia). La Dashboard ci porta toccando una spin, **solo per gli admin**:
la Slot è loro, e a un utente il link riporterebbe alla Dashboard.
