# BetterTrade

Archivio delle giocate di un gruppo di persone, più il motore che le misura.
Due pezzi nello stesso repo, non ancora collegati:

| | |
|---|---|
| `app/` | **L'app.** React + Vite + Supabase. Registra spin, giornate e bankroll di 6 persone. |
| `btscout/` | **Il motore.** Node, nessun frontend: modelli, backtest, import. Le 53.796 partite di 15 campionati stanno in Supabase con il resto. |

⚠️ **I due pezzi condividono il codice dei calcoli, non solo il database**: gli
script del motore importano `app/src/lib/*.js` (VPM, gol attesi, attendibilità)
invece di riscriverli, ed è il motivo per cui le librerie in `src/lib/`
importano con l'estensione. La ricostruzione camminando nel tempo, che serve a
entrambi, sta in `btscout/lib/ricostruisci.js`, e le date in
`btscout/lib/date.js`. **Una misura e lo schermo devono dire lo stesso numero,
e l'unico modo è che eseguano lo stesso codice.**

---

## ⚠️ PRIMA DI QUALSIASI COSA: leggi STATO.md

**All'inizio di ogni sessione si legge [STATO.md](STATO.md)** — è la to-do e il
punto esatto in cui siamo: dove siamo oggi, i lotti nell'ordine concordato, il
lavoro in corso e tutto quello che è **ancora aperto**. Dal 22/10/2026
quello che è chiuso sta in [STORICO.md](STORICO.md), e ci torna ogni volta che
una sezione finisce: il 24/10 sono scesi là il piano della Scalata madre e il
lotto del voto, **spostati con uno script e verificati riga per riga contro
git** — mai ribattuti a mano.
**Alla fine si aggiorna.** Se una task cambia stato e il file non lo riflette,
la sessione dopo riparte da informazioni sbagliate: aggiornarlo fa parte del
lavoro, non è un extra.

### 🤝 Il passaggio di consegne — come si chiude una sessione

Si chiama così dal 24/10/2026: quando Mattia dice **«passaggio di consegne»**
(o «chiudiamo»), si fa questo, in quest'ordine, e alla fine **si dice cosa è
stato toccato**:

1. **STATO.md** — la riga *«Ultimo aggiornamento»* (data, versione, ultimo
   commit dell'app); *«Dove siamo»*; una riga per commit in *«Cos'è
   cambiato»*; gli aperti nuovi in *«Quello che resta aperto»* e i chiusi
   barrati con la data; *«Da dove ripartire»* rivalutato.
2. **`note/`** — la nota dell'area toccata riceve la regola nuova, con la data
   e il **perché**. È lì che vive il dettaglio, non qui.
3. **CLAUDE.md** — **solo** se cambia una regola o la conclusione di una riga
   della tabella *«Dove sta scritto il resto»*: una riga, mai la storia.
   Questo file si paga in ogni sessione.
4. **STORICO.md** — quando una **sezione intera** di STATO è chiusa, scende
   là **con uno script** e si verifica contro git. Mai ribattuta a mano.
5. **`app/src/versione.js`** allineata all'ultimo commit che cambia l'app, e
   `npm run lint` a 0 errori.
6. **Commit** dei documenti. Il **push** solo se Mattia lo chiede.
7. Se il server di sviluppo è ancora acceso, **lo si dice**.

⚠️ **In cima a STATO ci sono due blocchi fatti per questo**: *«Per ripartire»*
(il comando del server di sviluppo e lo stato dei dati) e *«Da dove ripartire,
in ordine di valore»* — cinque voci con il costo di ciascuna. ⛔ Nessuna di
quelle è stata promessa: **si propone e decide Mattia.**

⚠️ **Se è passato più di un mese dall'ultimo aggiornamento**, in cima a STATO
c'è il blocco "RIPARTIRE DOPO UNA PAUSA": tre comandi e la tabella di cosa è
scaduto (le quote) e cosa no (il criterio). Partire senza quello significa
guardare quote di mesi prima.

⚠️⚠️ **E non si legge tutto per abitudine.** I tre archivi — `STORICO.md`, le
note in `note/` e `btscout/STATO.md` — pesano insieme più di 90.000 token, e
ogni file aperto si paga per il resto della sessione. Si apre **quello che
serve al lavoro di oggi**, e basta. `STORICO.md` risponde a *"perché è fatto
così?"* e serve a **non rifare un esperimento già fallito**; per sapere cosa
manca c'è STATO.

## I briefing arrivano dal secondo cervello

I lavori con peso architetturale vengono preparati fuori da qui e consegnati
come file in `briefing/` (nome: `YYYY-MM-DD-argomento-vN.N.md`). Li scrive una
sessione collegata al secondo cervello di Mattia, che conosce tutti i progetti
ma **non tutto il codice di questo**.

A inizio sessione, se Mattia dice "leggi il briefing": apri `briefing/`, prendi
quello con la versione più alta e `stato: consegnato`, ed esegui la sezione
"Verifica prima di partire" **prima** di toccare codice. Se la realtà è diversa
da come è scritta, **fermati e dillo**.

⛔ **Nessun briefing autorizza a sviluppare.** Prima si risponde con
fattibilità, impatto sui file, cosa non torna, e la stima. Decide Mattia.

La risposta e, a lavoro finito, l'esito vanno in `briefing/risposte/`
(`...-vN.N-risposta.md`): quella cartella è tua, `briefing/` no — non
modificare i file del briefing.

Il briefing dice **cosa fare adesso**. Come funziona questo progetto sta in
questo file e in STATO.md: se un briefing contraddice un invariante, vince il
repo — e segnalalo.

⚠️ **Un briefing può sbagliare sui fatti, e il primo l'ha fatto** (12/10/2026):
cercando `onTouchStart` concludeva che il gesto indietro non esiste, mentre sta
in `hooks/usaIndietro.js` agganciato a mano con `addEventListener('touchmove')`.
**Prima di dare per sbagliato STATO.md, cerca con la parola giusta.**

---

## Come lavorare con Mattia

- **Un passo alla volta.** Quando serve che faccia qualcosa lui (SQL sulla
  dashboard, una chiave da copiare), dai **una sola istruzione** e aspetta l'ok
  prima della successiva. Ha chiesto esplicitamente di non ricevere liste di
  cinque passi insieme.
- **Verifica prima di dichiarare fatto.** Ogni passo che tocca il database va
  verificato da terminale prima di passare al successivo, non dato per riuscito.
- **Le migrazioni SQL** stanno in `app/sql/`, numerate, e si possono
  applicare dalla connessione diretta (`btscout/lib/db.js` ha il ruolo
  postgres): `sql.unsafe(readFileSync(...))`. Provare la funzione o la colonna
  subito dopo, dall'API con un utente normale — la grant e le policy non si
  vedono dal ruolo postgres.
  ⚠️⚠️ **E una policy si può provare SENZA password e senza browser**
  (22/10/2026), simulando la sessione dentro una transazione che si annulla:
  ```js
  await sql.begin(async t => {
    await t.unsafe(`set local role authenticated`)
    await t.unsafe(`set local request.jwt.claims = '{"sub":"<auth_id>"}'`)
    // … legge e scrive come quell'utente …
    throw new Error('rollback')   // niente resta scritto
  })
  ```
  `mio_user_id()` e `mio_ruolo()` leggono `auth.uid()`, cioè il `sub` del
  claim: basta l'`auth_id` dell'utente, preso da `users`. **È così che il
  22/10 si è scoperto che `scalate_write` aveva un `OR` al posto di un `AND`**
  — `user_id = mio_user_id() OR admin` lasciava a *chiunque* avesse fatto
  login creare una scalata a nome proprio. Dal ruolo postgres RLS non si vede,
  dal JSX nemmeno, e nessun errore era mai comparso.
- **Prova a vuoto prima di scrivere.** Ogni script che modifica dati ha una
  modalità di default che non scrive e mostra cosa cambierebbe; si scrive solo
  con `--esegui`. È la convenzione del progetto, va mantenuta.
- **Backup prima di ogni modifica ai dati:** `node --env-file=.env scripts/backup.js`.
- ⚠️⚠️ **Non si apre l'app nel browser di propria iniziativa** (22/10/2026).
  Niente `scripts/guarda.mjs` e niente script Playwright con `E2E_USER`: **lo
  chiede Mattia quando serve**. Ogni giro è un login vero su Supabase (che ha
  un limite di tentativi) e con una scalata aperta può anche scrivere dati.
  L'autorizzazione a cliccare è **per sessione e su richiesta**, mai una
  delega permanente. Si verifica con lint, build e gli script da terminale;
  quando una modifica si può giudicare **solo guardandola**, lo si dice e si
  chiede — non si apre il browser da soli.
- **Italiano** nel codice, nei commenti, nei commit e nella conversazione.

---

## ⚠️ Regole che non si toccano

### 1. Il bankroll è calcolato, non memorizzato

```
bankroll = bankroll_iniziale + movimenti + saldo delle giornate
```

`users.bankroll` è **solo una cache** di questo calcolo. La formula vive in un
unico posto, `src/lib/bankroll.js`, ed è già stata deduplicata una volta: non
riscriverla altrove.

**Corollario pratico:** per correggere un saldo **non scrivere il numero**.
Registra un `movimento` e ricalcola — altrimenti il primo ricalcolo dell'app
cancella la correzione. `scripts/allinea-totale.js` fa esattamente questo.

Dopo ogni modifica ai dati:
```bash
node --env-file=.env scripts/verifica-coerenza.js
```

### 2. Il login passa da `emailDi()`, che esiste in tre copie

Gli utenti non hanno email e non ne useranno una: entrano con **username +
password**. L'identificatore che Supabase Auth pretende è sintetico e invisibile,
costruito da `emailDi()` — che vive in `src/context/AuthContext.jsx`, in
`scripts/_admin.js` **e**, in SQL, come `email_di()` (`sql/16`, la usa
`crea_utente`). **Devono restare identiche**, o il login non trova l'account.
⚠️ **Il 12/10/2026 si erano già allontanate**, e il controllo del codice l'ha
trovato: le due JS fanno `toLowerCase()` **e poi** tolgono ciò che non è
`[a-z0-9]`; l'SQL toglieva ciò che non è `[a-zA-Z0-9]` **e poi** abbassava.
Identiche su ogni nome italiano, diverse su una lettera che diventa `a-z` solo
dopo l'abbassamento (la `İ` turca): `irem@` da una parte, `rem@` dall'altra —
cioè **account creato dall'app e login impossibile**. Allineate con `sql/24`,
abbassando prima: togliere prima **butta** caratteri, e un identificatore che
butta caratteri crea collisioni (`İrem` e `rem` diventerebbero lo stesso
account). Verificato che nessuno degli 11 utenti cambi email.
⚠️ **Non basta che le tre copie "si somiglino": l'ordine delle operazioni fa
parte della definizione.**

### 3. Le password non tornano nel database

Sono in Supabase Auth, hashate. La colonna `users.password` è stata eliminata:
non ricrearla. Sono corte e pronunciabili di proposito (`fuoco-530`) — l'app è
un archivio, non un conto, e devono essere dicibili a voce.

### 4. I permessi stanno nel database, non nel browser

RLS è attiva su tutte le tabelle. I controlli `if (role === 'admin')` nel JSX
servono a nascondere i bottoni, **non a proteggere**: la protezione è la policy.
Se aggiungi una tabella, aggiungi la sua policy — senza, non è leggibile da
nessuno tranne la `service_role`.

**Il bankroll non si scrive nemmeno da admin:** si chiama la funzione
`ricalcola_bankroll(uuid)` (sql/04), che gira in `security definer`, legge le
fonti e scrive lei. Un utente può ricalcolare solo il proprio, un admin quello
di chiunque. Nessuno può imporre un numero — solo farlo ricalcolare.

### 5. La chiave `service_role` non entra nel browser

Bypassa ogni regola. Sta in `.env` (gitignorato) e la usano solo gli script Node.
Nel frontend può stare solo `VITE_SUPABASE_ANON_KEY`, che è pubblica per
progetto: a proteggere è RLS, non nasconderla.

**Creare utenti, assegnare password ed eliminare account si fanno dall'app**
(pagina Utenti) senza che la chiave entri nel browser: li esegue il database,
con tre funzioni `security definer` in `sql/16` — `crea_utente`,
`assegna_password`, `elimina_utente` — la stessa strada di `ricalcola_bankroll`.

⚠️ **Solo il superadmin** le può chiamare, e il controllo è **dentro la
funzione** (`esigi_superadmin()`): gli admin normali vengono respinti dal
database, non dal JSX. ⚠️ `crea_utente` costruisce l'email sintetica con
`email_di()` in SQL: è la **terza copia** di `emailDi()` e deve restare
identica alle due JS. ⚠️ `elimina_utente` cancella **anche** la riga in
`auth.users`: prima l'app toglieva solo quella in `public.users` e quello
username restava bruciato per sempre. Gli script in `scripts/` restano come
riserva da terminale.

---

---

## 📚 DOVE STA SCRITTO IL RESTO — e cosa sapere senza aprirlo

⚠️⚠️ **Questo file è stato alleggerito il 22/10/2026** (da 202 kB a ~30), e il
motivo è di costo: `CLAUDE.md` entra **per intero in ogni sessione**, quindi
ogni riga qui dentro si paga sempre, anche quando si tocca tutt'altro. Le
misure e le storie sono state **spostate, non riassunte**: in `note/` c'è lo
stesso testo, parola per parola.

⚠️ **Come si usa:** le conclusioni qui sotto bastano per non sbagliare. Si apre
il file **solo** quando si lavora su quella cosa — e allora si apre **quello,
non tutti**.

| file | si apre quando | la conclusione che non va persa |
|---|---|---|
| `note/conteggi.md` | angoli e cartellini, o si tocca `lib/conteggi.js` | **Descrivono, non consigliano**, e la differenza è **misurata per competizione** (`MISURA`, venti voci): in otto su venti il modello sta **sotto** la base, e la scheda lo scrive. Meglio sui **cartellini** che sugli angoli. ⚠️ La tabella la **stampa** `prova-conteggi.js --tabella`: non si ricopia a mano. ⚠️ Prevedere gli angoli dai **tiri** è peggio (Serie A 49,4% contro 56,1%), al contrario di quanto vale per i gol. ⚠️⚠️ **Dal 29/10/2026 la VERSIONE 2** (`previsione`): storico corretto dalle **quote dei gol** di apertura, **binomiale negativa**, e il **derby** sui cartellini (`lib/derby.js`, gialli ×1,21) — coefficienti **stampati** da `prova-conteggi-v2.js --tabella`. Log score contro la frequenza della lega: angoli da **−0,67% (peggio di niente)** a +0,55%, cartellini da +0,86% a +1,85%. Più onesta, **non** più veggente. I **falli non aiutano** (misurati); l'**arbitro** c'è solo per E0, E1, SC0. |
| `note/criterio.md` | si tocca attendibilità, VPM, scelta, voto, o si sceglie cosa giocare | **L'attendibilità è la probabilità secondo il consenso**, non "quanto spesso vince". Si gioca il segno secco, mai la X; soglie **75/72/65** sull'attendibilità, ma ⚠️ **nelle spin 75/72/68 sulla SCELTA** (24/10/2026, `SOGLIE_SPIN`). ⚠️ **La selezione riduce la perdita, non la ribalta**: il miglior indicatore rende 97,8%, e nessuna fascia ha ROI positivo dimostrabile. **La resa dice se il prezzo conviene, non cosa giocare.** VPM entra nelle spin **solo attraverso la scelta**: è un indicatore in più, non il criterio, e fuori dalle spin i colori restano dell'attendibilità. ⚠️⚠️ **Il VOTO è una PAGELLA 0-10 dal 22/10/2026** — `10 × att − penalità sul disaccordo + bonus limitato sul prezzo` — e **non è una probabilità**: serve a ordinare e filtrare. Prima era `resa × fattore(VPM)`, che con la quota dal consenso diceva solo `1/margine`: misurato, era il peggior selettore (49,0% di azzeccate contro il 60,5% dell'attendibilità). `scelta` è **null** quando il campo contraddice il mercato. ⚠️ **Il «Filtro A»** (att ≥ 61 + VPM ≥ 7,5 concorde; «scelta > 61» è ridondante) verificato il 29/10/2026: sulle singole **~+2% ±3**, non dimostrato — un +13-18% sulle doppie è composizione e scelta a posteriori. |
| `note/gol.md` | si tocca `lib/gol.js`, i consigli over/GG, il blocco ⚽ | Il **modello** non usa quote; il **consiglio sul 2,5 sì** e passa da 64,8% a **71,2%** di volte giuste (+20 punti sulla base: **il numero migliore del progetto**). ⚠️ Il verde dice *"più del solito"*, **non** *"giocata vincente"*. Il GG è quasi imprevedibile: 54,0% contro una base di 53,2%, e **non è colpa del modello**. ⚠️ **Il consiglio copre GIÀ tutte le soglie** e sceglie *la più ambiziosa che regge*: in calendario dice `OVER 1,5` tre volte più spesso del `2,5`. ⚠️ **La linea 3,5 si raccoglie dal 23/10 ma NON si usa** (`MERCATO_35 = false`): football-data non l'ha mai pubblicata, quindi non c'è un passato su cui misurarla — la query per farlo sta nella nota. |
| `note/andamento.md` | si tocca la pagina Andamento o `sql/21-23` | **I conteggi li fa il database**: 101.237 righe, e PostgREST ne dà 1000 **in silenzio**. Le soglie sono **parametri** delle funzioni. La tabella `andamento` è **derivata** e si ricalcola in coda a ogni importazione. ⚠️ **Dal 28/10/2026 nel giorno ci sono TUTTE le partite** (nel weekend le prime 36), e ogni card **esporta in CSV** esattamente le partite che conta. |
| `note/dati.md` | import, quote, ESPN, controlli, calendario | `partite` e `prossime_partite` sono **due cose diverse** e nessuna delle due si cancella. ⚠️ In `partite` le `avg_*` sono di **chiusura**, in `prossime_partite` di **apertura**: confrontarle è la trappola. La quota giocata è **Bet365 → media**. ESPN **non indovina mai**: nel dubbio la riga aspetta una persona. ⚠️ Dal 29/10/2026 una partita **rinviata si sposta** alla data nuova invece di raddoppiare (`btscout/lib/rinvii.js`), e `partite` ha **`ora`** (italiana, dalla 2019/20) e i **falli**. ⚠️⚠️ **Dal 30/10 i risultati si scaricano anche dal TELEFONO** (tasto «⤓ Scarica risultati», superadmin): ESPN **rifiuta i server di Supabase (403)**, quindi la chiede il telefono e la funzione `aggiorna-risultati` scrive — con **lo stesso abbinamento** del Mac (`btscout/lib/risultati-espn.js`). ESPN sta in `app/src/lib/espn.js`. |
| `note/scalata.md` | Road to weekend, in qualunque punto | ⚠️⚠️ **Dal 29/10/2026 la puntata è una PERCENTUALE DEL CONTO** (3·5·10·14%, `sql/49`): ogni passo punta `% × conto` di quel momento, **all'euro per difetto** dal 30/10 (`puntataDi`, e in SQL `sql/51`); niente cassa, accumulo né «Metà utile» (resta `METODO_META` per archivio e `prova-prelievi.js`). **Niente APRI e STOP**: **✓ Conferma giocata** sul passo 1 salva il piano e apre il giro (`confermaPrimo`, `sql/50`), l'esito si segna dopo; una partita cominciata resta **12 ore** (`ORE_VISIBILI`) e si conferma o si salta; **a ogni perso il giro va in archivio** e ne riparte uno coi passi rimasti (`chiudi_giro_perso`); la percentuale **si cambia solo dopo un giro perso**. ⚠️ Misurato (`prova-filtro-a.js`): la crescita massima sta al **3%**, il 10% rende meno — la pagina lo dice. **Il conto è CALCOLATO** (`contoDi` + `contiPercentuale`), mai scritto; ogni account ha **il suo** conto e i suoi giri (`sql/41`). Il **criterio A** (att 61 · scelta 61 · VPM 7,5, `eCriterioA`) è in **viola**, e il viola è solo suo. ⚠️ Il backtest dice che la scalata meccanica **perde**: il registro esiste per dire se la scelta a mano fa meglio. |
| `note/betbuilder.md` | Bet Builder | Schedine a quota obiettivo, **private per utente** (`sql/36`-`38`): nessuno vede quelle di un altro, admin compresi. Compone con **`componiPasso` della scalata** — un passo e una schedina sono la stessa cosa — e si ferma **appena supera** la quota. Le già usate e le **scartate** (`preferenze`, riga personale) escono dalle candidate. ⚠️ **Una schedina salvata non cambia mai da sola**: le gambe sono una **copia**, non un collegamento — l'unica cosa che la tocca è la **quota corretta a mano**, perché c'è l'importo e una quota sbagliata è una vincita sbagliata. Esito **per schedina** e a mano; per l'automatico la regola *"questa giocata è arrivata"* **sta già in `src/lib/esito.js`** (spostata dal motore il 26/10/2026, non copiata). ⚠️ **Interruttore `ATTIVE \| ARCHIVIO`**: una chiusa ci scende **dieci secondi dopo l'esito** — il criterio è lo **stato**, non il tempo, e i dieci secondi sono il tempo per disfare un tocco sbagliato. ⚠️ I **filtri si salvano da sé, senza tasto**, perché lì la riga di `preferenze` è **personale** (nella scalata è condivisa, e il tasto serve). ⚠️ Le partite aggiunte **a mano sono fisse** e l'automatico punta a `obiettivo ÷ quota delle aggiunte`: in fondo darebbero quota 9 a chi ne ha chieste 5. |
| `note/spin.md` | Slot, Spin provvisorie | La spunta **GIOCATA** è l'unica cosa che fa partire i conti della Dashboard. ⚠️ **Dal 24/10/2026 le spin si compongono per SCELTA** con soglie proprie 75/72/68 (`SOGLIE_SPIN`), solo lì; la griglia «A mano» parte vuota, e «S1» guarda automatica, a mano **e Slot**, anche per la spin che si compila. ⚠️ **Dal 29/10/2026 votano tutti** (oro admin, blu user, `sql/46`): nelle Spin contano **solo le stelline degli admin**, in Road to weekend e Bet Builder tutte. ⚠️ **Dal 30/10/2026 gli esiti delle caselle sono AUTOMATICI** (solo nelle vuote, `lib/esitiSpin.js`) e ogni spin va in **archivio senza soldi** a «↺ Nuova spin» (`spin_archivio`, resa in unità). Il flag `in_spin` in Bilancio decide chi entra nella **percentuale** delle spin, **non** il totale dei soldi. |
| `note/interfaccia.md` | **qualunque** modifica a una pagina o a un componente | Colori, caratteri, spaziature e raggi **solo da `theme.js`**, ma **dove finisce la pagina** sta in `lib/layout.js` (`COLONNA`, `bordoDestro`) — un componente che la importasse da `App.jsx` chiuderebbe un anello col `lazy` delle pagine. Le tre barre fisse si misurano con `--barra-alta` e `--barra-bassa` di `index.css`, e **`--barra-bassa` È l'altezza della tab bar**: se non sale con lei, nasconde le ultime righe. ⚠️ `SOTTO_BARRA` **non viene da `SP`**: è la distanza dei bersagli dal bordo dell'iPhone (Siri e l'indicatore Home), un vincolo del telefono. I segni **solo da `Icona.jsx`** (niente emoji); le superfici da `stileCard`; le righe della lista sono `memo` e vogliono proprietà stabili; ogni pagina è `lazy`. ⚠️ **Dal 29/10/2026 ogni pagina ha il suo indirizzo** (`/partite`, `/partite/:id`…) senza libreria router: `lib/indirizzi.jsx` + `hooks/usaPercorso.js`, tasti come `<a href>`, e `app/vercel.json` per Vercel. **`npm run lint` deve dare 0 errori.** |
| `note/trappole.md` | **prima** di toccare layout, migrazioni, date, query o script di misura | 46 difetti veri, ciascuno costato una sessione. L'elenco dei titoli è qui sotto: **se quello che stai per fare somiglia a uno di questi, apri il file.** |

### ⚠️ I titoli delle 46 trappole — il dettaglio sta in `note/trappole.md`

- Una `timestamptz` non si taglia a fette
- Il contenuto che non ci sta NON si stringe e NON si taglia: esce, e si disegna sopra il vicino
- Una larghezza fissa va sempre con un `overflow`
- Un commento `/* … */` fra due tag JSX diventa TESTO A SCHERMO
- La mappa di `guarda.mjs` va tenuta allineata alla navigazione
- `borderColor: undefined` NON vuol dire "lascia il bordo com'è": lo cancella
- Il nome di una squadra si misura, e il vincolo è la PAROLA PIÙ LUNGA
- `onAuthStateChange` non sopporta query al database dentro il callback
- `Promise.all` su supabase-js non lancia, e il suo errore si perde
- Le righe annidate di PostgREST tornano con le chiavi in un ordine diverso
- `create table if not exists` NON aggiunge colonne a una tabella che esiste già
- Paginare senza `order` è paginare su un ordine non definito
- Un backup con la chiave anon torna vuoto senza errore
- `bankroll_iniziale` può contenere un saldo residuo
- `grant execute ... to authenticated` NON restringe niente
- `String(data).slice(0,10)` su un oggetto Date NON è una data
- PostgREST restituisce al massimo 1000 righe e non lo dice
- RLS blocca in silenzio, non con un errore
- Gli importi delle schedine perdono il 3-4% per arrotondamento, ed è noto
- Pinnacle non esiste più
- football-data risponde 200 anche ai codici che non esistono
- Un club che cambia nome spezza il suo storico in due
- Il DNS del router di Mattia risolve a intermittenza
- Le date dell'archivio erano istanti UTC
- `vite build` passa anche con un nome che non esiste
- Una variabile usata venti righe prima della sua riga è schermata nera, e `no-undef` non la vede
- `new Date().toISOString().slice(0,10)` è la data UTC, non quella di oggi
- Niente deve cambiare altezza quando arriva un dato
- Su iOS un campo con testo sotto i 16px fa ingrandire la pagina da solo
- `onTouchMove` di React è passivo: `preventDefault()` lì dentro non fa niente
- Un gesto che segue il dito non passa dallo stato di React
- Un dettaglio che *sostituisce* l'elenco smonta l'elenco
- Con otto stagioni si guarda la MEDIANA, non la media
- Paginare con `.range()` su un ordine con pari merito perde righe
- Un oggetto ricostruito a ogni ridisegno dentro le dipendenze di un `useEffect` è un ciclo infinito
- Lo stato di React sopravvive al ricaricamento a caldo, le costanti no
- In una griglia `1fr` NON scende sotto il contenuto: serve `minmax(0,1fr)`
- Sei elementi a larghezza fissa su una riga non stanno su un telefono
- Un'etichetta dentro una colonna elastica viene tagliata per prima
- I `<button>` non ereditano il colore del testo
- Una tinta semitrasparente su uno sfondo chiaro si illumina
- Nel convertire i colori, `rgba()` e `#hex` dello stesso nome sono tinte diverse
- Una connessione a Postgres non sopravvive a un lavoro di ore
- L'ora di football-data e di The Odds API è INGLESE, non italiana
- Un dato sbagliato tutto insieme non si vede
- Una lettura FALLITA non è un utente che non esiste (il logout «ogni tanto»)

---

## Comandi

```bash
cd app
npm run dev                                        # avvia l'app
npm run lint                                       # nomi inesistenti e import morti: deve dare 0 errori

node --env-file=.env scripts/backup.js             # PRIMA di ogni modifica ai dati
node --env-file=.env scripts/saldi.js              # riepilogo saldi
node --env-file=.env scripts/verifica-coerenza.js  # invariante del bankroll
node --env-file=.env scripts/stato-migrazione.js   # stato della sicurezza
node --env-file=.env scripts/prova-permessi.js Bermani <pw> MNM <pw>   # RLS, voti e tabella andamento

node --env-file=.env scripts/confronta-utenti.js MarcoM Christian
node --env-file=.env scripts/allinea-utenti.js  MarcoM Christian [--esegui]
node --env-file=.env scripts/allinea-totale.js  3955.66 [--esegui]

node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"   # riserva: ora si fa dall'app
node --env-file=.env scripts/reset-password.js Bermani                    # riserva: ora si fa dall'app
node --env-file=.env scripts/prova-login.js Admin <password>

cd app
node --env-file=.env scripts/importa-partite.js    # archivio → Supabase (prova a vuoto)
node --env-file=.env scripts/verifica-partite.js   # confronto con la sorgente

# ⚠️ Questi quattro stanno in app/scripts, NON in btscout: importano src/lib/*
# con un percorso relativo e da btscout non partono (MODULE_NOT_FOUND). Erano
# elencati nel blocco sbagliato fino al 15/10/2026.
node --env-file=.env scripts/guarda.mjs            # GUARDA: apre l'app a 375px e fotografa le 15 schermate
#   pomelli: --largo (anche 1280) · --larghezze=320,430,768 · --intera · guarda.mjs partite scheda
#   ⚠️ Fotografa anche **login** (prima di entrare), **scheda** (la partita aperta: foglio
#      `fixed`, quindi a schermate successive e NON con fullPage) e **menu** aperto.
#   ⚠️ Fotografa anche il **pannello dei filtri** (`filtri`), che nasce chiuso e
#      quindi non si vedeva mai: è lì che il 22/10 c'erano due comandi sovrapposti.
#   ⚠️ **Misura lo sbordo**: dice quante pagine escono dallo schermo e di quanti px.
#   ⚠️⚠️ **E misura gli ACCAVALLAMENTI**, che lo sbordo di pagina non vede: due
#      fratelli che si intersecano, o il contenuto che esce dal suo riquadro.
#      Verificato il 21/10/2026: zero a 320, 375, 430, 768 e 1280.
node --env-file=.env scripts/prova-vpm.js          # VPM sul weekend: dove campo e mercato litigano
node --env-file=.env scripts/prova-ordine.js       # i criteri della lista, casi limite compresi
node --env-file=.env scripts/prova-scheda.js --squadra=Lens    # il blocco VPM della scheda, e l'identità dei pesi
node --env-file=.env scripts/schedina-weekend.js --quota=5     # la schedina del weekend dalle partite vere

cd btscout && npm install
node --env-file=.env scripts/verifica-storico.js   # coerenza dell'archivio (settimanale)
node --env-file=.env scripts/audit-archivio.js     # controllo completo (dopo ogni campionato nuovo)
node --env-file=.env scripts/aggiorna.js --esegui                   # LA ROUTINE: martedì e venerdì dopo le 18
node --env-file=.env scripts/importa-espn.js --campionati=I1 --giorni=30 --esegui   # la seconda fonte: risultati e possesso
node --env-file=.env scripts/importa-competizione.js --comp=UCL --da=2016 --esegui  # Champions & co. da ESPN (prova a vuoto senza --esegui)
#   ⚠️ Qui ESPN **non è la seconda fonte: è l'unica**. Crea la riga invece di
#      arricchirla, quindi importa solo partite **finite** e scrive `fonte='espn'`.
#   ⚠️⚠️ **Niente quote**: ESPN non le ha, quindi queste partite hanno gol,
#      tiri, angoli e cartellini ma **nessuna attendibilità**, e non possono
#      comparire fra le consigliate finché le quote non arrivano da The Odds API.
#   comp: UCL · UEL · UECL · N2 (Olanda 2) · JPN1 (stagione ad anno solare)
node --env-file=.env scripts/aggiorna-risultati.js --esegui   # OGNI ORA: solo i risultati, zero crediti
# la funzione del tasto «Scarica risultati» (da app/, con SUPABASE_ACCESS_TOKEN in .env):
#   npx supabase@2.122.0 functions deploy aggiorna-risultati --project-ref <ref> --use-api
#   ⚠️ Non è `aggiorna.js` più spesso: quella spende 30 crediti di The Odds API
#      a giro (500 al mese) e ricalcola `andamento`. Questa fa solo ESPN.
node --env-file=.env scripts/controlla-dati.js     # cosa è passato in silenzio (gira già dentro aggiorna.js)
#   = import-storico --stagioni=2627 → riconcilia-prossime → importa-prossime
#     → importa-prossime-odds → calcola-andamento --stagioni=1
node --env-file=.env scripts/rendiconto.js          # IL RENDICONTO: calibrazione + resa delle proposte
node --env-file=.env scripts/backtest-scala.js --basepct=10 --scelta=resa   # il metodo di giocata su 8 stagioni
#   altri pomelli: --passi=6 --banda=1.35,1.45 --bankroll=200 --scelta=att|resa|vpm
node --env-file=.env scripts/misura-resa-favoriti.js   # la resa realizzata dei favoriti, per fascia e per book
node --env-file=.env scripts/misura-schedine.js --quota=5   # le schedine del weekend sull'archivio
node --env-file=.env scripts/prova-gol.js                  # il modello dei gol contro i risultati veri
node --env-file=.env scripts/prova-indicatori.js --stagioni=8   # quale indicatore sceglie meglio
node --env-file=.env scripts/calcola-andamento.js --esegui      # riempie la tabella della pagina Andamento
node --env-file=.env scripts/prova-gol-varianti.js         # si può migliorare l'indice dei gol? (no)
node --env-file=.env scripts/prova-gol-avversari.js        # e correggendo per gli avversari affrontati? (no)
node --env-file=.env scripts/prova-gg.js                   # il Goal/NoGoal: quanto è giusto il consiglio
node --env-file=.env scripts/prova-consiglio-gol.js --stagioni=8   # i due consigli sotto la giocata
#   con --mercato la riga 2,5 usa la quota invece del modello
node --env-file=.env scripts/prova-dispersione.js --stagioni=8    # l'attendibilità vale meno se i book litigano?
node --env-file=.env scripts/prova-conteggi.js --div=I1,UCL --k=12
#   angoli e cartellini: cammina nel tempo e confronta con la BASE, non col caso
#   ⚠️ `--tabella` stampa `MISURA` pronta per `app/src/lib/conteggi.js`
#   pomelli: --mercato=angoli|cartellini --base=angoli|tiri|misto --finestra=10
node --env-file=.env scripts/prova-soglie-scalata.js --dettaglio=61
#   le soglie della card SELEZIONE: partite, a giornata, azzeccate, resa, e
#   ⚠️ **quanti weekend reggono un passo e quanti ne reggono due** — che è la
#      colonna che decide, non la resa.
#   pomelli: --soglie=58,61,65,68 --quota=1.30 --stagioni=8
node --env-file=.env scripts/prova-scalata.js --stagioni=8 --quota=2.0 --soglia=0.68 --scelta=0.66
#   Road to weekend: la scalata su 8 stagioni, con la selezione di Mattia
#   ⚠️ `--scelta` è una **OR** con `--soglia`: due modi di arrivare alla stessa
#      fiducia, e chiederli insieme terrebbe fuori le partite dove il campo
#      aggiunge qualcosa. Senza, resta il filtro sulla sola attendibilità.
#   ⚠️⚠️ **I backtest si chiedono a Mattia prima di lanciarli** (21/10/2026).
#   pomelli: --bankroll=100
#   pomelli: --base=gol|tiri|misto --k=20 --stagioni=3
node --env-file=.env scripts/misura-valore.js --riferimento=media   # il criterio, a fine stagione
node --env-file=.env scripts/import-storico.js --campionati=P1,N1   # solo alcuni campionati
node --env-file=.env scripts/importa-prossime-odds.js --campionati=E0,I1 --esegui   # riprende i campionati caduti (1 credito l'uno)
node scripts/backtest.js                           # gira offline, dalla cache
```

`btscout/CLAUDE.md` contiene **solo** le regole del motore (le regole del
progetto sono qui), e `btscout/STATO.md` è l'**archivio storico** delle fasi
S1-S6: serve a non rifare esperimenti già falliti, non a sapere dove siamo.
⚠️ `backtest.js` e `s1`-`s6` sono della vecchia fase e **marcati in testa al
file**: quattro usano `ps_*` e perdono la stagione in corso in silenzio.
Vale la regola del motore — in particolare **"la
matematica calcola, Claude giudica"**: un LLM non produce probabilità calibrate,
e non deve stimarle. Vale anche qui quando i due pezzi si collegheranno.
