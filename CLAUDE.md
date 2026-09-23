# BetterTrade

Archivio delle giocate di un gruppo di persone, più il motore che le misura.
Due pezzi nello stesso repo, non ancora collegati:

| | |
|---|---|
| `bettertrade/` | **L'app.** React + Vite + Supabase. Registra spin, giornate e bankroll di 6 persone. |
| `btscout/` | **Il motore.** Node, nessun frontend: modelli, backtest, import. Le 53.796 partite di 15 campionati stanno in Supabase con il resto. |

---

## ⚠️ PRIMA DI QUALSIASI COSA: leggi STATO.md

**All'inizio di ogni sessione leggi [STATO.md](STATO.md)** — è la to-do list e il
punto esatto in cui siamo. **Alla fine aggiornalo.** Se una task cambia stato e il
file non lo riflette, la sessione dopo riparte da informazioni sbagliate.
Aggiornare STATO.md fa parte del lavoro, non è un extra.

---

## Come lavorare con Mattia

- **Un passo alla volta.** Quando serve che faccia qualcosa lui (SQL sulla
  dashboard, una chiave da copiare), dai **una sola istruzione** e aspetta l'ok
  prima della successiva. Ha chiesto esplicitamente di non ricevere liste di
  cinque passi insieme.
- **Verifica prima di dichiarare fatto.** Ogni passo che tocca il database va
  verificato da terminale prima di passare al successivo, non dato per riuscito.
- **Le migrazioni SQL** stanno in `bettertrade/sql/`, numerate, e si possono
  applicare dalla connessione diretta (`btscout/lib/db.js` ha il ruolo
  postgres): `sql.unsafe(readFileSync(...))`. Provare la funzione o la colonna
  subito dopo, dall'API con un utente normale — la grant e le policy non si
  vedono dal ruolo postgres.
- **Prova a vuoto prima di scrivere.** Ogni script che modifica dati ha una
  modalità di default che non scrive e mostra cosa cambierebbe; si scrive solo
  con `--esegui`. È la convenzione del progetto, va mantenuta.
- **Backup prima di ogni modifica ai dati:** `node --env-file=.env scripts/backup.js`.
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

## Il criterio del progetto: attendibilità, cioè probabilità

**Chiarito il 16 settembre 2026, dopo un malinteso.** Il sistema di Mattia
deve indovinare nove esiti per spin: serve sapere **quale esito è più
probabile**, non dove il prezzo è generoso. L'11/09 avevo costruito il secondo
("quota più alta di quanto dovrebbe essere"): trova sfavoriti a quota 8 con l'1%
di vantaggio, vero e inutile. Non rifarlo.

**Attendibilità = probabilità della giocata secondo il consenso di mercato**
(`avg_ap_*` normalizzata). Sui favoriti il mercato è calibrato, anzi un filo
conservativo (+3,3 punti, favourite-longshot bias). Nessun modello e nessun
indice di forma migliora il consenso: misurato (`misura-forma.js`), il mercato
si aggiusta entro cinque partite. **Como e Sunderland erano eccezioni.**

**Le regole di gioco:** si gioca il **segno secco**, 1 o 2 · mai la X ·
quota < 1,25 → favorito + over 1,5.

⚠️ **La doppia chance è stata tolta il 23/09/2026** — "troppo conservativa".
Misurato sulle 127 proposte già giocate: le doppie prendevano il 64%, ma **25
delle 57 vinte erano pareggi** (si vinceva grazie alla X, non al pronostico);
le stesse partite a secco fanno il 45%. Si accetta di prenderne meno, giocando
quello che si è davvero previsto. Le soglie sono scese di conseguenza a
**75 / 62 / 52** (con le doppie erano 80/65/55): il secco ha probabilità molto
più basse, e con le vecchie soglie il "centro" restava vuoto.
**La spin:** gialli (angoli) le più attendibili, blu (lati) sacrificabili, centro
la perfetta — il centro sta in 3 schedine, i gialli in 3, i blu in 2.

Quello che segue sul valore resta vero e utile **come informazione secondaria**.

### Il valore: dove Bet365 paga più del consenso

Se Bet365 paga 2,10 una cosa che il mercato vale 2,00, quella differenza si
misura senza prevedere niente.

Il riferimento è **Betfair Exchange** — non un bookmaker ma uno scambio fra
persone, quindi senza margine del banco sopra. Margine implicito misurato
sull'archivio: exchange 1,007, Pinnacle 1,033, media di mercato 1,073.

**Le colonne hanno ruoli opposti e non vanno confuse:**

| Colonna | Cos'è | Ruolo |
|---|---|---|
| `b365_*` | Bet365, **apertura** | La quota che si **gioca davvero** |
| `bfe_ap_*` | Betfair Exchange, **apertura** | **Il riferimento onesto** |
| `bfe_ch_*` | Betfair Exchange, **chiusura** | Più preciso, ma non esiste ancora quando si gioca |
| `avg_*`, `max_*` | Media e massima di mercato | Contesto |

⚠️ **Apertura contro chiusura è la trappola.** Misurare un segnale contro
`bfe_ch_*` significa scoprire che funziona usando informazioni che non avevi.
Il confronto onesto è `b365_*` contro `bfe_ap_*`.

⚠️ **L'apertura dell'exchange NON è un prezzo equo.** Margine implicito ~1,03
(la chiusura è ~1,007): all'apertura il mercato è sottile e il prezzo largo.
Va **normalizzato** — probabilità implicite divise per la loro somma — prima di
confrontarlo con qualsiasi cosa. Resta comunque il riferimento migliore
disponibile al momento della giocata: 1,03 contro 1,07 di Bet365.

⚠️ **Il 3,4% delle aperture exchange sono mercati vuoti**, non prezzi:
`1.02/1.01/1.01`, il segnaposto quando nessuno ha ancora offerto. Confrontarli
con Bet365 produce "valore" inesistente (il +163% dell'11/09 era questo).
La colonna **`bfe_ap_valido`** — calcolata dal database, `sql/08` — li marca
FALSE. **Ogni query sul criterio usa `where bfe_ap_valido`.** Senza, i numeri
sono sbagliati.

L'exchange esiste solo **dalla stagione 24/25**: prima, quelle colonne sono
vuote per forza.

### Misurato il 16/09/2026 — il riferimento giusto è la media di mercato

`btscout/scripts/misura-valore.js --riferimento=media`. Selezione: Bet365
apertura > **media di mercato di apertura** (`avg_ap_*`) normalizzata.

- **L'exchange di apertura NON è il riferimento.** Sembrava l'ovvio candidato
  (margine 1,007 alla chiusura) ma all'apertura è troppo sottile: le scommesse
  scelte con l'exchange **perdono** contro la chiusura (CLV −2,1%). Il
  riferimento del progetto è `avg_ap_*`, non `bfe_ap_*`.
- **La misura che conta è il CLV**, non il ROI: quota giocata / quota equa di
  chiusura − 1. La chiusura VALUTA dopo, non sceglie prima. Su 5.480 scommesse
  in otto stagioni: **CLV +2,0% [+1,7 … +2,3]**, positivo in 7 stagioni su 8,
  su tutti e tre i segni, in 12 campionati su 15 e in nessuno negativo.
  Con scarto > 5%: +7,2% su 907.
- **Il ROI realizzato è rumore** a queste quote (media 6): −3,4% [−9 … +2,5] su
  5.480. Non contraddice il CLV, è varianza. Non promettere rendimenti.
- **Il vantaggio è in calo**: +3,5% nelle prime stagioni, ~+1,5% nelle ultime.
- **Vale su singole.** Niente è stato misurato su accumulator.

Dettagli, tabelle e limiti in STATO.md.

---

## Storico e calendario: due tabelle, due significati

| Tabella | Contiene | Quote | Si cancella? |
|---|---|---|---|
| `partite` | Partite **giocate**, con risultato | `b365_*` apertura, `bfe_ap_*` apertura, `bfe_ch_*` chiusura, `avg_*`/`max_*` **chiusura** | Mai |
| `prossime_partite` | Partite **da giocare**, senza risultato | tutte di **apertura**: `b365_*`, `bfe_ap_*`, `avg_ap_*`, `max_ap_*` | **Mai**: è la fotografia di cosa si vedeva prima |

Entrambe hanno `bfe_ap_valido`. `prossime_partite` ha `scaricato_il`: una quota
ha senso solo con l'istante in cui l'hai vista. L'app legge le future con
`where data >= current_date`.

Le future arrivano da **due fonti** che si fondono sulla stessa riga:
football-data (`fixtures.csv`, il prossimo blocco, l'unica con Bet365) e
**The Odds API** (3-4 settimane, consenso di 40+ book, niente Bet365 — non
sovrascrivere `b365_*` con null). I nomi di The Odds API passano da
`lib/nomi-squadre.js`: un nome nuovo va aggiunto **a mano** dopo averlo
verificato — l'automatico ha messo il PSG sul Paris FC. Chiave in
`btscout/.env` (`ODDS_API_KEY`), 500 crediti/mese, 30 per giro, **anche la
prova a vuoto li consuma**.

Quando una futura si gioca, `riconcilia-prossime.js` le mette `partita_id` che
punta alla riga di `partite`. Non si sposta e non si cancella: la futura resta
la fotografia di cosa si vedeva prima, e il confronto con le quote registrate
dice se era fedele. Tutto in un comando: `scripts/aggiorna.js --esegui`.

---

## Il modello dei dati, e perché va rifatto

Lo schema attuale non regge l'obiettivo finale (l'app propone partite e compila
da sola le schedine). Tre problemi, in ordine di gravità:

1. **Non esiste il concetto di partita.** In `griglia`, casa e ospite sono testo
   libero digitato a mano: impossibile agganciarli all'archivio di BTScout.
2. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra,
   non si collega.
3. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non c'è storico delle spin.

Il pezzo da riscrivere è `griglia` + `SlotPage`. Auth, RLS, tema e script si
tengono — sono appena stati messi a posto e non c'entrano con il problema.

---

## Convenzioni del codice

- **Colori e font**: solo da `src/theme.js`. Nelle pagine non deve tornare
  nessun valore hardcoded — `alpha(C.oro, .12)`, mai `rgba(201,168,76,0.12)`.
  `index.css` ne tiene una copia per il poco CSS fuori da React: se cambi un
  colore lì, riportalo in `theme.js` e viceversa.
- **Navigazione**: 4 tasti in basso (Dashboard, Slot, Reporting, Bilancio) per
  l'uso quotidiano; il menu ☰ in alto a destra per il resto (`VOCI_MENU` in
  `App.jsx`). Una pagina nuova va nel menu, non come quinto tasto.
- **L'attendibilità è in `src/lib/attendibilita.js`**, solo calcoli: probabilità
  dal consenso (`avg_ap_*`, non l'exchange), regole di gioco, categorie, finestra
  della settimana. **La composizione delle spin è in `src/lib/spin.js`**
  (candidate, ordine con le stelline, celle della griglia, scrittura). Le
  pagine (`PartitePage`, `SpinProvvisoriePage`) leggono partite e voti dallo
  stesso hook `hooks/usaProssime.js`: **non duplicare la logica nelle pagine.**
  La riga della lista è `components/RigaPartita.jsx`.
- **Le librerie in `src/lib/` importano con l'estensione** (`'./attendibilita.js'`):
  Vite non se ne accorge e Node le può eseguire da terminale per provarle sui
  dati veri, senza browser.
- **Pezzi ricorrenti** in `src/components/ui.jsx`: `Card`, `Etichetta`,
  `StatCard`, `Btn`, `Input`, `Badge`. Prima di riscrivere una card a mano,
  guarda se c'è già.
- **Script generali, non usa-e-getta.** `confronta-utenti.js` e
  `allinea-utenti.js` prendono due nomi qualsiasi. Se serve una cosa una volta
  sola, probabilmente servirà di nuovo.
- **I commenti spiegano il perché**, non il cosa. Se una riga è strana, dire
  quale problema evita vale più di descrivere cosa fa.

---

## Trappole già incontrate

- **`onAuthStateChange` non sopporta query al database dentro il callback.**
  supabase-js tiene un lock mentre lo esegue: una `supabase.from()` lì dentro
  blocca la login stessa. Si rimanda con `setTimeout(…, 0)`.
- **Un backup con la chiave anon torna vuoto senza errore.** Con RLS attiva
  legge zero righe e dichiara successo. `backup.js` usa la `service_role` e
  fallisce se scarica zero righe: non togliere quel controllo.
- **`bankroll_iniziale` può contenere un saldo residuo.** È successo con MNM:
  106,11 al posto di 3000, con 85 giornate e 25k di volume. Se un bankroll è
  negativo o assurdo, guarda prima lì.
- **RLS blocca in silenzio, non con un errore.** Una `update` che nessuna policy
  permette modifica zero righe e non solleva nulla. È già successo: un utente
  normale registrava il movimento e il saldo restava fermo. Dopo ogni modifica
  alle policy, lancia `scripts/prova-permessi.js` — controlla cosa ogni ruolo
  può e non può fare, e sarebbe bastato la prima volta.
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
- **Le date dell'archivio erano istanti UTC.** Nel dump di Neon
  `2016-08-25T22:00:00.000Z` sono le 00:00 del **26** agosto ora italiana:
  tagliare i primi dieci caratteri sposta tutto indietro di un giorno. Si
  ricostruisce la data dai componenti locali — `giornoLocale()` in
  `bettertrade/scripts/importa-partite.js`.
- **Nel convertire i colori, `rgba()` e `#hex` dello stesso nome sono tinte
  diverse.** `rgba(59,130,246)` è `#3b82f6`, non il `#60a5fa` usato per il testo.
  Sono token separati in `theme.js` (`bluPieno`, `giallo`, `celestePieno`).

---

## Comandi

```bash
cd bettertrade
npm run dev                                        # avvia l'app

node --env-file=.env scripts/backup.js             # PRIMA di ogni modifica ai dati
node --env-file=.env scripts/saldi.js              # riepilogo saldi
node --env-file=.env scripts/verifica-coerenza.js  # invariante del bankroll
node --env-file=.env scripts/stato-migrazione.js   # stato della sicurezza
node --env-file=.env scripts/prova-permessi.js Bermani <pw> MNM <pw>   # RLS, voti compresi

node --env-file=.env scripts/confronta-utenti.js MarcoM Christian
node --env-file=.env scripts/allinea-utenti.js  MarcoM Christian [--esegui]
node --env-file=.env scripts/allinea-totale.js  3955.66 [--esegui]

node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"   # riserva: ora si fa dall'app
node --env-file=.env scripts/reset-password.js Bermani                    # riserva: ora si fa dall'app
node --env-file=.env scripts/prova-login.js Admin <password>

cd bettertrade
node --env-file=.env scripts/importa-partite.js    # archivio → Supabase (prova a vuoto)
node --env-file=.env scripts/verifica-partite.js   # confronto con la sorgente

cd btscout && npm install
node --env-file=.env scripts/verifica-storico.js   # coerenza dell'archivio (settimanale)
node --env-file=.env scripts/audit-archivio.js     # controllo completo (dopo ogni campionato nuovo)
node --env-file=.env scripts/aggiorna.js --esegui                   # LA ROUTINE: martedì e venerdì dopo le 18
#   = import-storico --stagioni=2627 → riconcilia-prossime → importa-prossime
node --env-file=.env scripts/misura-valore.js --riferimento=media   # il criterio, a fine stagione
node --env-file=.env scripts/import-storico.js --campionati=P1,N1   # solo alcuni campionati
node --env-file=.env scripts/importa-prossime-odds.js --campionati=E0,I1 --esegui   # riprende i campionati caduti (1 credito l'uno)
node scripts/backtest.js                           # gira offline, dalla cache
```

`btscout/CLAUDE.md` contiene le regole del motore — in particolare **"la
matematica calcola, Claude giudica"**: un LLM non produce probabilità calibrate,
e non deve stimarle. Vale anche qui quando i due pezzi si collegheranno.
