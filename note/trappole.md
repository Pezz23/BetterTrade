# LE TRAPPOLE GIÀ INCONTRATE

> Difetti veri, ciascuno costato una sessione. Si leggono PRIMA di toccare layout, migrazioni, date o query.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

## Trappole già incontrate

- ⚠️⚠️ **Una `timestamptz` non si taglia a fette.** PostgREST la consegna
  come `2026-10-22T16:30:00+00:00`, cioè in **UTC**: `slice(11,16)` dà *le
  16:30* per un salvataggio fatto alle 18:30, e `slice(8,10)` sbaglia perfino
  il **giorno** per tutto quello che succede dopo le 22 (verificato:
  `22:30+00:00` è il **23** alle 00:30). `gg()` va bene sulle **date**, che
  arrivano come `2026-10-25`; per gli istanti c'è `quando()` in
  `lib/formato.js`, che passa da un `Date` vero e legge i componenti locali.
  È la stessa famiglia di `new Date().toISOString().slice(0,10)` e delle date
  dell'archivio: **in questo progetto ogni volta che si tagliano dieci
  caratteri da una data si sbaglia.**
- ⚠️⚠️ **Il contenuto che non ci sta NON si stringe e NON si taglia: esce, e
  si disegna sopra il vicino.** Il 22/10/2026 nei filtri di Partite due
  scorciatoie (`61%` `62%`) uscivano di **85px** dalla loro cella di griglia e
  finivano sopra «solo sopra soglia» della colonna accanto. ⚠️ **La pagina non
  usciva di un pixel**, quindi la misura dello sbordo di `guarda.mjs` diceva
  tutto a posto: un accavallamento avviene **dentro** un contenitore.
  ✅ Ora `guarda.mjs` misura anche quello, in due modi — i **fratelli** i cui
  rettangoli si intersecano, e il contenuto che **esce dal suo riquadro**
  (`scrollWidth > clientWidth` con `overflow: visible`). Su tutta l'app
  riporta **un solo** caso, quindi è una misura e non un allarme continuo.
  ⚠️ Il pannello dei filtri è una **griglia a due colonne**: su 375px ogni
  cella ha ~150px, e `−` + valore + `+` ne occupano già 146.
- ⚠️⚠️ **Una larghezza fissa va sempre con un `overflow`.** In
  `ScegliGamba` la colonna della data era `width: 52, flexShrink: 0` e
  conteneva `sab 24/10 15:00`, che ne chiede **~97**: con `flexShrink: 0` il
  testo non si stringe, e senza `overflow` **non si taglia** — esce dalla
  scatola e finisce **sotto il nome della partita**, che è quello che Mattia
  ha fotografato (22/10/2026). Una misura fissa vale per la scatola, non per
  quello che contiene: o si chiude l'`overflow` (con `ellipsis` o andando a
  capo), o si misura il testo prima di scegliere la larghezza — come per i
  nomi delle squadre. ⚠️ Vale per `flex` e per `grid` allo stesso modo: un
  elemento di griglia **esce** dalla sua colonna, non viene ritagliato.
- ⚠️⚠️ **Un commento `/* … */` fra due tag JSX diventa TESTO A SCHERMO**, e
  né il lint né `vite build` se ne accorgono: per loro è una stringa
  legittima. Ci sono cascato **due volte**, e la seconda la riga
  *«/* stessa traccia della barra…»* è finita in mezzo alla scheda di una
  partita. Dentro il JSX un commento vuole le graffe: `{/* … */}`.
  ✅ Ora `guarda.mjs` cerca `/*` nel testo che la pagina mostra e lo segnala.
- ⚠️ **La mappa di `guarda.mjs` va tenuta allineata alla navigazione.**
  Spostando Spin nel menu e Road to weekend nella barra in basso ho dimenticato
  `PAGINE`: due pagine sono andate in **timeout di trenta secondi l'una**, con
  una riga `❌` in mezzo alle altre. È scritto nella skill, e me ne sono
  dimenticato lo stesso.
- ⚠️⚠️ **`borderColor: undefined` NON vuol dire "lascia il bordo com'è": lo
  cancella.** React imposta la scorciatoia `border: 1px solid <colore>` e poi
  la longhand `borderColor`; metterla a `undefined` la **toglie dalla
  scorciatoia**, e un bordo senza colore cade su `currentColor` — che in
  quest'app è `C.testo`, cioè **bianco**. In `RigaPartita` il ramo
  `cat !== 'no' ? alpha(…) : undefined` ha dato per settimane il **bordo
  bianco a 56 righe su 67**, ed è *quello* il reticolo da gestionale che Mattia
  vedeva: non l'aveva scelto nessuno e dal codice sembrava giusto. Misurato nel
  browser (`border-width: 1px; border-style: solid;` e nessun `border-color`),
  non dedotto. ✅ **Il bordo si scrive intero, con un colore in tutti i rami.**
  ⚠️ Vale per ogni longhand di una scorciatoia: `background`, `font`, `margin`.
- ⚠️⚠️ **Il nome di una squadra si misura, e il vincolo è la PAROLA PIÙ LUNGA.**
  Nella scheda `ASTON VILLA` si spezzava in **quattro righe da due lettere**
  (`AST / ON / VILL / A`). Misurato: la colonna laterale è **104,5px** e al
  nome ne restavano **45,6**, perché il resto se lo prendeva la targhetta della
  posizione. E misurato il carattere: `BOURNEMOUTH` — la parola più lunga delle
  132 squadre in calendario — occupa **8,774px per ogni px di corpo**, cioè
  **96,5px già a 11px**. Quindi *nessuna* misura leggibile la fa stare accanto
  alla targhetta: non era un problema di font-size. ✅ `flexWrap` sul blocco
  nome+targhetta: la targhetta scende sotto **solo quando serve**, e la regola
  "targhetta a destra della squadra" vale finché c'è spazio invece di rompersi.
  ⚠️ **Prima di cambiare un corpo di carattere per far stare un testo, misura
  quanto occupa quel testo**: il conto dice se la strada è quella giusta.
- **`onAuthStateChange` non sopporta query al database dentro il callback.**
  supabase-js tiene un lock mentre lo esegue: una `supabase.from()` lì dentro
  blocca la login stessa. Si rimanda con `setTimeout(…, 0)`.
- **`Promise.all` su supabase-js non lancia, e il suo errore si perde.** Ogni
  risposta porta il suo `error`: mandare quattro scritture insieme e guardare
  solo il valore di ritorno vuol dire **scrivere a metà dichiarando successo**.
  In `usaScalate.js` lo raccoglie `primoErrore()`. ⚠️ Stessa famiglia del
  `const { data } = await …` che scarta l'errore — nel registro una lettura
  fatta così tornava una scalata aperta **senza passi** quando RLS rifiutava.
- **Le righe annidate di PostgREST tornano con le chiavi in un ordine
  diverso.** Chiedendo `select('*, scalata_gambe(*)')` le gambe arrivano con le
  colonne in un altro ordine rispetto a una `select('*')` su quella tabella:
  identico il contenuto, diverso l'ordine delle chiavi. Confrontare le due
  strade con `JSON.stringify` dice **"diverse"** e manda a cercare un guasto che
  non c'è (18/10/2026). Si confronta colonna per colonna, o con le chiavi
  ordinate.
- **`create table if not exists` NON aggiunge colonne a una tabella che esiste
  già.** Il 18/10/2026 `bankroll_finale` è stata aggiunta alla `create table`
  di `sql/30` e **non è mai comparsa nel database**: la migrazione rilanciata
  vedeva la tabella e saltava tutto il blocco, senza un errore. Il guasto è
  arrivato molto dopo, alla prima scrittura (*column does not exist*). ✅ Ogni
  colonna aggiunta dopo la prima applicazione vuole il suo
  `alter table … add column if not exists`, che è anche l'unica forma
  rilanciabile. ⚠️ Vale per vincoli e indici allo stesso modo: **in una
  migrazione già applicata, `if not exists` sulla tabella vuol dire "non
  guardare più dentro".**
- **Paginare senza `order` è paginare su un ordine non definito.** Non è solo
  il caso dei pari merito: `backup.js` chiamava `.range()` **senza nessun
  ordinamento**, quindi fra una pagina e l'altra Postgres poteva restituire le
  righe in ordine diverso — righe doppie e righe **sparite**, in un backup, in
  silenzio. Trovato il 12/10/2026 dal controllo del codice. ✅ Ora ordina su
  `id`. ⚠️ Stessa cura in `prova-vpm.js`, dove una query paginava su `data`
  (5.214 partite per stagione = sei pagine, migliaia di pari merito) mentre
  l'altra query dello stesso file era già stata corretta nove giorni prima:
  **una correzione applicata a metà è peggio di nessuna**, perché sembra fatta.
- **Un backup con la chiave anon torna vuoto senza errore.** Con RLS attiva
  legge zero righe e dichiara successo. `backup.js` usa la `service_role` e
  fallisce se scarica zero righe: non togliere quel controllo.
- **`bankroll_iniziale` può contenere un saldo residuo.** È successo con MNM:
  106,11 al posto di 3000, con 85 giornate e 25k di volume. Se un bankroll è
  negativo o assurdo, guarda prima lì.
- **`grant execute ... to authenticated` NON restringe niente.** Postgres
  concede l'esecuzione a PUBLIC e **Supabase la concede ad `anon`** su tutto ciò
  che nasce nello schema `public`: una funzione nuova è chiamabile da chiunque
  anche senza login. Per chiuderla servono **tre righe**, non una:
  `revoke all ... from public`, `revoke all ... from anon`, poi il grant.
  Fatto per tutte le funzioni in `sql/19-permessi-funzioni.sql` (8/10/2026);
  vale per ogni funzione che si aggiungerà.
- **`String(data).slice(0,10)` su un oggetto Date NON è una data.** Il driver
  postgres consegna `Date`, e quello restituisce `"Mon Oct 05"` — il testo
  inglese tagliato, **senza l'anno**. In cinque script di misura quella stringa
  era la **chiave del giorno** per prendere "le prime 9 di ogni giorno": su otto
  stagioni il 5 ottobre 2026 e il 5 ottobre 2020 finivano nello stesso gruppo,
  **952 chiavi su 2.072 fondevano più anni**, e la classifica del giorno pescava
  da un mucchio più grande del vero. Trovato il 12/10/2026 **dal controllo del
  codice, non da un errore**: nessuno script si era mai lamentato.
  ✅ Ora c'è `btscout/lib/date.js` (`giornoLocale`, `weekendDi`) e la usano
  tutti. ⚠️ I numeri "prime N del giorno" di prima erano gonfiati di 0,2-0,6
  punti: l'attendibilità faceva 60,9% e fa **60,3%**. Le conclusioni non
  cambiano, i numeri sì — e quelli sopra una **soglia** non erano toccati,
  perché non passano dal raggruppamento per giorno.
- **PostgREST restituisce al massimo 1000 righe e non lo dice.** La pagina
  Andamento scaricava la tabella intera per contarla: con 1.212 righe ne
  riceveva **1000**, e il riassunto girava su cinque sesti dei dati senza un
  errore, senza un avviso, con numeri perfettamente plausibili (12/10/2026).
  **Un troncamento silenzioso è peggio di un errore.** Due regole da allora:
  i conteggi li fa il database (`sql/23`), e ogni elenco che può crescere ha un
  **limite scritto** (`p_limite`) invece di affidarsi a quello implicito — un
  tetto che si vede si può raccontare a chi guarda, uno che non si vede no.
- **RLS blocca in silenzio, non con un errore.** Una `update` che nessuna policy
  permette modifica zero righe e non solleva nulla. È già successo: un utente
  normale registrava il movimento e il saldo restava fermo. Dopo ogni modifica
  alle policy, lancia `scripts/prova-permessi.js` — controlla cosa ogni ruolo
  può e non può fare, e sarebbe bastato la prima volta.
- **Gli importi delle schedine perdono il 3-4% per arrotondamento, ed è noto.**
  `calcSchedule` in `AuthContext.jsx` usa `Math.floor`: misurato il 7/10/2026
  sui saldi veri si gioca il 96-97% della base. **Non correggerlo di slancio**:
  cambia gli importi che il gruppo gioca davvero, quindi è una decisione di
  Mattia. Sotto i 33 € di base sparisce la full, sotto i 10 la quaterna.
- **Pinnacle non esiste più.** football-data ha smesso di pubblicarlo: le
  colonne `PSC*` ci sono fino alla stagione 25/26 (e lì già coprono meno della
  metà delle partite), spariscono dalla 26/27. Il riferimento "affilato" ora è
  **Betfair Exchange**, `bfe_*`, presente dalla 24/25 — ed è migliore: margine
  implicito 1,007 contro 1,033 di Pinnacle e 1,073 della media di mercato.
  Le stagioni 24/25 e 25/26 hanno entrambi, quindi il passaggio è calibrabile.
  **Uno script che usa `ps_*` perde silenziosamente la stagione in corso.**
- **football-data risponde 200 anche ai codici che non esistono.** Reindirizza
  su un file simile: `P2.csv` → `SP2.csv`. Sono entrate 4.675 partite spagnole
  etichettate come portoghesi prima di accorgersene dai nomi delle squadre.
  L'import ora controlla che la colonna `Div` dentro il file coincida con il
  codice richiesto. **Un 200 dice che il server ha risposto, non che ha risposto
  quello che hai chiesto.**
- **Un club che cambia nome spezza il suo storico in due.** Dentro una stagione
  i conti tornano, quindi il controllo "poche partite" non lo vede. `ALIAS` in
  `import-storico.js` mappa sul nome attuale; `verifica-storico.js` cerca nomi
  simili che non coesistono mai nella stessa stagione. I falsi positivi noti
  stanno in `NON_ALIAS`.
- **Il DNS del router di Mattia risolve a intermittenza.** Un `ENOTFOUND` su
  football-data o Supabase è quasi sempre quello, non il codice. Il Mac usa
  1.1.1.1 e 8.8.8.8; `importa-prossime.js` prova entrambi i nomi del sito con
  quattro tentativi.
  **Prima di dare la colpa alla rete di casa, prova un altro sito**
  (`curl https://example.com` e l'endpoint Supabase): il 5/10/2026 quelli
  rispondevano e football-data no, quindi era il **loro** server. In quel caso
  non serve insistere: **le quote hanno un altro fornitore** e si scaricano lo
  stesso con `importa-prossime-odds.js --esegui`, mentre i risultati si
  recuperano al primo aggiornamento che riesce — `riconcilia-prossime.js`
  guarda indietro e non perde niente.
- **Le date dell'archivio erano istanti UTC.** Nel dump di Neon
  `2016-08-25T22:00:00.000Z` sono le 00:00 del **26** agosto ora italiana:
  tagliare i primi dieci caratteri sposta tutto indietro di un giorno. Si
  ricostruisce la data dai componenti locali — `giornoLocale()` in
  `app/scripts/importa-partite.js`.
- **`vite build` passa anche con un nome che non esiste.** Togliendo la finestra
  dalle Spin provvisorie è rimasta una riga `const lunedi = lunediProssimo(0)`
  con l'import già cancellato: per esbuild è legittimo, la pagina lanciava
  `ReferenceError` al primo render e Mattia ha visto **schermata nera**.
  **Il build non è una verifica**: quando si toglie un nome da un `import`, si
  cerca quel nome in tutto `src/` (`grep -rn`), e la pagina si apre davvero.
  ✅ Ora c'è la rete: **`npm run lint`** lo prende in un secondo (`no-undef`,
  uscita 1) sullo stesso file su cui `vite build` passa — provato l'8/10/2026.
- **Una variabile usata venti righe prima della sua riga è schermata nera, e
  `no-undef` non la vede.** In `PartitePage` il `useMemo` dei filtri leggeva
  `vpmDi`, dichiarato più sotto: `const` ha la **zona morta**, quindi al primo
  render è `Cannot access 'vpmDi' before initialization`. Il nome **esiste**,
  per questo il linter taceva e il build passava (9/10/2026).
  ✅ Chiuso con **`no-use-before-define`** (`variables: true`, funzioni libere):
  acceso, ha trovato subito altri due casi latenti — `nomeBook` in
  `attendibilita.js` e `votate` in `SpinProvvisoriePage`, che funzionavano solo
  perché chiamati dal JSX, cioè dopo. Riordinati.
  ⚠️ **In un componente l'ordine delle righe è semantica, non stile**: un
  `useMemo` che legge un altro `useMemo` deve stare sotto di lui.
- **`new Date().toISOString().slice(0,10)` è la data UTC, non quella di oggi.**
  Fra mezzanotte e le due italiane restituisce **ieri**: il filtro "Oggi"
  avrebbe mostrato le partite del giorno prima, e `usaProssime` le caricava già
  così. Si passa da mezzogiorno — `oggiLocale()` in `lib/attendibilita.js`, la
  stessa che usa la finestra, così le due non possono divergere (9/10/2026).
- **Niente deve cambiare altezza quando arriva un dato.** Nella slot il ✓/✗ è
  più grande del pronostico e allungava la casella; la riga delle combinazioni
  vinte compariva dal nulla e spingeva giù la pagina sotto le dita. Si risolve
  riservando lo spazio (altezza fissa, `minHeight`), non sperando che il
  contenuto sia della misura giusta.
- **Su iOS un campo con testo sotto i 16px fa ingrandire la pagina da solo.**
  Al fuoco Safari zooma e non torna indietro: ci si ritrova sulla tastiera
  senza aver visto il contenuto. Due regole, entrambe applicate: `index.css`
  porta `input, select, textarea` a **16px sotto `@media (pointer: coarse)`**,
  e l'`autoFocus` si dà solo col mouse (`tocco` in `lib/schermo.js`).
  ⚠️ Il `<meta viewport>` **non** deve mai avere `maximum-scale` o
  `user-scalable=no`: il pizzico per ingrandire a mano resta libero.
- **`onTouchMove` di React è passivo: `preventDefault()` lì dentro non fa
  niente.** Il foglio della partita andava di lato mentre la pagina continuava
  a scorrere in verticale — sembrava "un foglio libero". Un gesto che deve
  impedire lo scorrimento va agganciato a mano in un `useEffect`:
  `addEventListener('touchmove', f, { passive: false })`, più
  `touch-action: none` sull'elemento appena la direzione è decisa.
- **Un gesto che segue il dito non passa dallo stato di React.** In
  `hooks/usaIndietro.js` lo spostamento si scrive sul nodo (`style.transform`):
  tenerlo in `useState` ridisegnava tutta la scheda a ogni frame del
  trascinamento. E la direzione del gesto si decide **una volta sola**, al primo
  movimento utile: se parte in verticale è uno scorrimento, e deve restare tale.
- **Un dettaglio che *sostituisce* l'elenco smonta l'elenco**: lo scorrimento
  si azzera, e sotto non c'è niente da scoprire quando lo si trascina via.
  La scheda della partita è perciò un **foglio sopra** la lista
  (`components/SchedaScorrevole.jsx`, `position: fixed`): la lista resta
  montata e tiene da sola il suo punto, e il gesto indietro scopre quello che
  c'è sotto. **Prima c'era un rattoppo** (salvare e rimettere `window.scrollY`):
  tolto, perché la struttura giusta l'ha reso inutile.
- **Con otto stagioni si guarda la MEDIANA, non la media.** Misurando la scala
  a recupero (10/10/2026), la fascia 1,50-2,20 sembrava rendere **1.158 €** di
  media: erano **sei stagioni su sette in perdita più una scala fortunata da
  7.549 €**. La mediana diceva 76 €. ⚠️ Vale per ogni misura su pochi cicli ad
  alta varianza: **media + dettaglio per stagione**, sempre, e la decisione si
  prende sulla mediana.
- **Paginare con `.range()` su un ordine con pari merito perde righe.** Nello
  script di VPM gli scontri diretti sono ~34.000 (35 pagine) ordinati per sola
  `data`, che ha migliaia di pari merito: fra una pagina e l'altra Postgres può
  restituirli in ordine diverso, quindi alcune righe escono due volte e altre
  **spariscono**. Così sparivano 2 dei 4 scontri di Virtus Entella-Juve Stabia
  (9/10/2026). **Ogni query paginata vuole un secondo criterio univoco**
  (`.order('data').order('id')`). L'ha scoperto il confronto fra le due strade,
  non un errore: senza quel confronto sarebbe passato.
- **Un oggetto ricostruito a ogni ridisegno dentro le dipendenze di un
  `useEffect` è un ciclo infinito.** Il 15/10/2026 la correzione del NaN delle
  soglie ha introdotto `const soglie = conSoglie(soglieGrezze)`: un oggetto
  **nuovo a ogni render**, e l'effetto che scarica le partite delle quattro
  spunte verdi lo aveva fra le dipendenze. Il giro: scarica → arriva la
  risposta → il ridisegno fabbrica un oggetto nuovo → l'effetto riparte e
  riazzera a `null`. A schermo **"carico…" per sempre**, e una richiesta al
  database per ogni giro — nessun errore, niente in console, solo una cosa che
  non finisce mai. ✅ `useMemo` sulle soglie.
  ⚠️ **Gli altri due hook non ne soffrivano**, e il perché dice dove guardare:
  confrontano la **chiave scritta** (`JSON.stringify`), non l'identità
  dell'oggetto. Un difetto che si vede in un punto solo mentre tre punti fanno
  la stessa cosa **non è un caso**: è il punto che la fa in modo diverso.
  ⚠️ **E un caricamento che non finisce non deve poter essere un errore
  travestito.** Le due letture di Andamento scartavano l'errore di PostgREST
  (`const { data } = await …`) e tornavano un elenco vuoto: a schermo
  *"nessuna partita"*, cioè **una risposta sbagliata presentata come giusta**.
  Ora l'errore si solleva e la pagina ha **tre stati distinti** — carico, non
  riesco a leggere, ecco le partite (`Risultato` in `AndamentoPage`): aspettare
  e chiamare qualcuno sono due azioni diverse.
- **Lo stato di React sopravvive al ricaricamento a caldo, le costanti no.**
  Il 15/10/2026 `resa` è diventata `scelta` fra i quattro metodi di Andamento:
  Vite ha ricaricato il modulo, ma `useState(…)` era già girato, quindi le
  soglie in memoria avevano ancora le **chiavi vecchie** e non quella nuova.
  Da lì **due guasti in fila, entrambi silenziosi**: `p_scelta: undefined`
  **spariva** dal JSON della chiamata e l'SQL usava il suo predefinito **0**
  (la soglia sembrava partire da zero e non filtrava niente); poi al primo
  tocco di `+`, `undefined + passo` fa **NaN** — e `JSON.stringify(NaN)` è
  **`null`**, quindi la funzione riceveva null, `null >= null` in SQL è null, e
  **tutti i conteggi diventavano zero senza un errore**. A schermo: `NaN%` e la
  soglia bloccata. ✅ Ora `conSoglie()` in `hooks/usaAndamento.js` riempie le
  chiavi mancanti **e scarta i valori non finiti** — un NaN già finito nello
  stato sopravviverebbe allo spread e la pagina resterebbe inchiodata.
  ⚠️ Vale ogni volta che si aggiunge o si rinomina una chiave dentro uno stato
  iniziale: **un valore che manca non dà errore, dà il predefinito di qualcun
  altro.**
- **In una griglia `1fr` NON scende sotto il contenuto: serve `minmax(0,1fr)`.**
  Un elemento di griglia ha `min-width:auto`, quindi una colonna `1fr` si
  allarga fino a contenere il testo più lungo e **spinge fuori schermo** tutte
  le colonne di destra. Nella Slot, con un nome come *"St. Gilloise –
  Oud-Heverlee Leuven"*, la riga usciva dalla finestra appena la si
  restringeva (13/10/2026, trovato da Mattia). ⚠️ **Serve anche `minWidth:0`
  sul contenitore dentro la cella** — `SceltaPartita` ce l'aveva nel pulsante
  ma non nel div che lo avvolge, e il minimo si era semplicemente spostato di
  un livello. ⚠️ `TestataPartita` e le righe di `DettaglioPartita` erano già a
  posto: la Slot era l'unica scoperta.
- **Sei elementi a larghezza fissa su una riga non stanno su un telefono.**
  Nella lista "LE VOTATE" l'ultima scritta usciva dallo schermo. Quando una
  riga ha più di tre o quattro informazioni, **si divide in due righe** invece
  di stringere: sopra ciò che identifica (squadre), sotto i dettagli.
- **Un'etichetta dentro una colonna elastica viene tagliata per prima.** In
  `ScegliCasella` la scritta "già in spin 2" divideva lo spazio col nome delle
  squadre e spariva. Le segnalazioni vogliono una **colonna a larghezza fissa**
  e una legenda visibile: il `title` che appare col mouse sopra **su telefono
  non esiste**, quindi non è mai l'unico posto dove mettere un'informazione.
- **I `<button>` non ereditano il colore del testo.** Un glifo dentro un
  pulsante prende il colore predefinito del browser: l'icona `◎` di Utenti era
  nera su nero, e le vicine si vedevano solo perché ⚽🎰📚 sono emoji a colori,
  che il colore del testo non lo guardano. Dare sempre un `color` esplicito.
- **Una tinta semitrasparente su uno sfondo chiaro si illumina.** Le caselle
  della slot usano `alpha(...)`: con la griglia bianca sotto diventavano
  biancastre, e il grigio "spento" sul fondo opaco sembrava nero. Serve un
  fondo opaco sotto la tinta: `linear-gradient(tinta,tinta), C.card`.
- **Nel convertire i colori, `rgba()` e `#hex` dello stesso nome sono tinte
  diverse.** `rgba(59,130,246)` è `#3b82f6`, non il `#60a5fa` usato per il testo.
  Sono token separati in `theme.js` (`bluPieno`, `giallo`, `celestePieno`).

---
- **Una connessione a Postgres non sopravvive a un lavoro di ore.** La notte
  del 22/10/2026 il recupero storico delle competizioni ESPN è **morto a metà
  Europa League** con `ECONNRESET`, e Conference e Olanda 2 non sono mai
  partite: dopo un'ora di scritture continue il pooler di Supabase ha chiuso
  la connessione. ⚠️ Non era la fonte — ESPN rispondeva benissimo — ed è il
  motivo per cui si guarda **quale** pezzo è caduto prima di accusare quello
  che sta scaricando. ⚠️⚠️ Uno script che dura ore se lo deve aspettare: la
  scrittura va dentro una ripetizione con attesa crescente, e si può riprovare
  senza pensarci solo perché è **idempotente** (`on conflict do nothing`). Un
  recupero che riparte da zero a ogni singhiozzo non finisce mai.

