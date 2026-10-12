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

**All'inizio di ogni sessione leggi [STATO.md](STATO.md)** — è la to-do list e il
punto esatto in cui siamo. ⚠️ **Se è passato più di un mese dall'ultimo
aggiornamento, in cima a STATO c'è il blocco "RIPARTIRE DOPO UNA PAUSA"**: tre
comandi e la tabella di cosa è scaduto (le quote) e cosa no (il criterio).
Partire senza quello significa guardare quote di mesi prima. **Alla fine aggiornalo.** Se una task cambia stato e il
file non lo riflette, la sessione dopo riparte da informazioni sbagliate.
Aggiornare STATO.md fa parte del lavoro, non è un extra.

La to-do sta **in cima al file**, divisa in **lotti** (voci che toccano gli
stessi file e conviene fare insieme), rinumerata il 23/09/2026. Sotto ci sono
le fasi storiche: servono a capire *perché* una cosa è fatta così, non cosa
manca. Quando un lotto finisce, va spuntato lì.

---

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
quota < 1,25 → favorito + over 1,5, e lì l'attendibilità è quella del segno
**scontata di `FATTORE_OVER` = 0,908** (misurato: fra i favoriti che vincono,
il 90,8% ha almeno due gol). Senza quello sconto si dichiarava 81% e si
prendeva il 76%.

⚠️ **La doppia chance è stata tolta il 23/09/2026** — "troppo conservativa".
Misurato sulle 127 proposte già giocate: le doppie prendevano il 64%, ma **25
delle 57 vinte erano pareggi** (si vinceva grazie alla X, non al pronostico);
le stesse partite a secco fanno il 45%. Si accetta di prenderne meno, giocando
quello che si è davvero previsto. Le soglie, scelte da Mattia il 23/09, sono
**75 / 72 / 65** — servono a riempire da una a tre spin con le migliori, non a
fare una lista lunga.

**L'attendibilità non è "quanto spesso vince": è quanto spesso lo pensa il
mercato.** Ed è una stima **prudente** sui favoriti — misurato sull'archivio,
dove dichiarava 69,1% il favorito ha vinto **72,5%**. Va detto così a schermo e
qui dentro: è la stima del mercato, non la verità.

**La resa** è `quota × attendibilità`: quanto torna in media per ogni euro,
**100% è il pareggio**. ⚠️ Dal 10/10/2026 **si mostra in barra**, accanto al
voto (prima stava solo nei dettagli completi, perché diceva la stessa cosa del
Grado — ma il Grado non c'è più).

**Il VOTO** (`voto()` in `lib/vpm.js`) è il numero che riassume tutto:

```
voto = attendibilità × quota × fattore(VPM) = resa × fattore(VPM)
fattore = 1 + (VPM − 5,5) / 45     →  da 1,00 a 1,10
```

⚠️ **Il fattore è vicino a 1 di proposito.** VPM va da 5,5 a 10: moltiplicare
per quei numeri avrebbe reso il voto 5-10 volte più grande, perdendo il
significato di "quanto torna per ogni euro" dove 100% è il pareggio. Il tetto
del +10% è anche il peso che VPM si è **guadagnato**: nel backtest sui favoriti
corti conferma il mercato nel 95% dei casi, quindi corregge, non comanda.
⚠️ **Sopra 100% conviene, sotto no** — ed è l'unico numero della barra che dice
questo. ⚠️ Come prima il Grado, **il voto non entra nella selezione delle spin**.

⚠️ **Il Grado è stato togliere il 10/10/2026**, con `GRADO_MIN/MAX`,
`PESO_QUOTA` e `QUOTA_MIN/MAX`. Era la resa in scala 1-10 più il livello della
quota; il voto risponde alla stessa domanda tenendo dentro anche il campo, e
due numeri costruiti sulla resa a schermo erano un doppione — lo stesso difetto
per cui il 2/10 la resa era stata togliere dalla barra. **Non ricrearlo.**

### VPM — Valutazione Partita Manuale

**Il quarto numero, nato il 9/10/2026.** È l'automazione dell'iter che Mattia
fa a mano prima di giocare: classifica con gol fatti/subiti/differenza · come
sta andando nelle ultime · come va **nel ruolo** che avrà domenica · il testa a
testa. Vive in `src/lib/vpm.js`.

⚠️ **"Manuale" vuol dire "riproduce il giudizio manuale", non "lo scrive una
persona": VPM è calcolato.** L'indice da digitare a mano era un'altra idea —
la voce 4 della to-do — e questa l'ha **sostituita**.

⚠️ **VPM non è una probabilità e non è calibrato su niente.** Dice **quale
segno preferiscono le squadre e quanto**: `5,5` = forze pari, `10` = divario
massimo. Non scende sotto 5,5 per costruzione, perché guarda sempre il lato più
forte. **Il disaccordo col mercato è il colore, non il numero**: verde se il
segno è lo stesso della giocata consigliata, rosso se è l'altro, grigio sotto
`VPM_NETTO` = 6 (squadre troppo simili perché la preferenza voglia dire
qualcosa). L'accordo si misura **sul segno**, non sul valore: la giocata può
essere "1 + over 1,5" e lì conta solo l'1.

⚠️ **Girato il 9/10/2026, poche ore dopo averlo fatto.** La prima versione dava
un voto *alla giocata consigliata dal mercato*: su Lens-Lyon diceva **3,68**,
perché la consigliata era l'1 su Lens e il campo dice Lyon. Mattia:
*"sbagliatissimo, è una partita minimo da 6"*. Il calcolo era coerente ma
rispondeva a un'altra domanda — lui non guarda quanto è buono l'1, guarda **chi
è più squadra**. Lo stesso scarto letto dal lato di Lyon fa **7,32** (i due sono
speculari: sommano 11). **Lezione:** un indice che riassume un giudizio deve
rispondere alla domanda di chi lo legge, non a quella più comoda da calcolare.

⚠️ Come il voto, **non entra nella selezione delle spin**: se Mattia vuole
giocare un disaccordo, lo strumento è **la stellina**, che esiste già per
questo.

**I pesi** (`PESI`) vengono dalle correlazioni misurate su 561 squadre-stagione:
vittorie 0,30 · gol subiti 0,18 · gol fatti 0,13 · **dominio 0,13** · tiri in
porta concessi 0,12 · tiri in porta fatti 0,09 · differenza reti 0,05.
⚠️ La differenza reti è bassa **di proposito**: correla **0,93** con le
vittorie, cioè è lo stesso numero due volte (nell'Excel pesava 0,20).
⚠️ I tiri stanno **accanto** ai gol e non al posto loro: correlano 0,90 (fatti)
e 0,81 (concessi) coi gol, quindi non sono un parametro nuovo ma la versione
meno rumorosa dello stesso — un gol è fortuna, cinque tiri in porta a partita no.
⚠️ La difesa pesa più dell'attacco perché **il pareggio nasce dai gol presi**, e
per noi la X è una sconfitta.
⚠️ **Il possesso palla non esiste nei dati** (football-data non lo pubblica, non
è fra le 59 colonne di `partite`): al suo posto c'è **`dominio`** = tiri in
porta fatti / (fatti + concessi). Dice una cosa migliore — il possesso misura
chi tiene la palla, il dominio chi fa male.

**I tre strati** (`PESI_STRATI`): stagione 45% · forma 30% · ruolo 25%.
⚠️ **Lo strato si guadagna il peso in proporzione alle partite che ha**: a
ottobre le partite in casa giocate sono 1-3, non 5, quindi il blocco prende il
suo peso × (quante ne ha / 5) e il resto torna alla stagione. ⚠️ Sotto
**3 partite VPM non c'è**: nessun numero, non un numero prudente.
⚠️ **Frase legata al momento in cui è stata scritta (ottobre 2026):** con 5
giornate giocate i tre strati guardano quasi le stesse partite — "le ultime 5"
SONO la stagione, e le partite nel ruolo sono 1-3. **Da gennaio è falsa**: gli
strati divergono e la forma comincia a dire altro. Se leggi questa riga a
stagione avanzata, è storia.
⚠️ **A stagione nuova VPM non esiste per le prime 3-4 giornate**, perché
`MIN_PARTITE` = 3: in agosto-settembre la colonna fa `—` e il voto vale la resa
senza correzione. **Non è un difetto, è il minimo per avere un dato.**

**Le ancore** (`ANCORE`) sono il 5° e 95° percentile misurati sulle stagioni
24/25 e 25/26, e sono **fisse**: se si ricalcolassero sulle squadre del momento,
la stessa partita cambierebbe VPM ogni settimana.
⚠️ **Rimisurarle è lecito solo per aggiungere una stagione, e cambia TUTTI i VPM
storici**: si fa una volta, si scrive la data accanto ai numeri, e si rifanno i
backtest che ci stanno sopra. Non si toccano per far quadrare un risultato.
⚠️ **Casa e fuori hanno ancore separate, e la misura lo impone**: la mediana del
dominio è 0,548 in casa e 0,447 fuori, le vittorie 0,40 contro 0,20. Con ancore
uniche ogni squadra di casa prenderebbe un bonus gratuito — e il fattore campo
**è già dentro la quota**, quindi verrebbe contato due volte.

**Il testa a testa è una bandierina, non un peso** (`bandiere()`): sono 6-12
partite di squadre nel frattempo cambiate, e Mattia lo usa come ultimo
controllo. ⚠️ Si guardano **due liste**, e quella che conta è il **solo stesso
campo**: Lens-Lyon ha 1 pareggio negli ultimi 6 scontri ma **3 su 6 giocati a
Lens**. Il pareggio è la bandierina grave, perché per noi la X è una sconfitta.

**I dati arrivano da `vpm_dati()`** (`sql/20`), una chiamata per sessione come
`classifiche()`: per ogni squadra le quattro finestre come **somme grezze**, e
per ogni partita futura i conti del testa a testa. ⚠️ Gli scontri **non**
filtrano sul campionato — i club sono gli stessi club anche quando uno era in
seconda divisione, e `forma_partita()` li mostra già così.

**`scripts/prova-vpm.js` calcola due volte** — dalle partite grezze e da
`vpm_dati()` — e confronta. ⚠️ Non togliere quel confronto: è l'unico modo di
accorgersi che la funzione SQL e la libreria si sono allontanate prima che il
numero sbagliato finisca a schermo, ed è così che il 9/10 si è trovato il
filtro sbagliato (8 bandierine su 149 diverse).

**A schermo** sta in due posti: il numero nella barra della riga
(`RigaPartita`, col segno appoggiato al bordo sinistro della cella) e il blocco
**🧮 VPM** nella scheda (`DettaglioPartita`), che mostra le due forze, i tre
strati e i sette parametri — il valore più alto di ogni riga in grassetto, così
si trova chi vince quel parametro senza leggere le cifre. Le bandierine del
testa a testa stanno sopra l'elenco degli **Scontri diretti**, ed enunciano
sempre *su quante* partite sono calcolate: l'elenco ne mostra 5 complessivi
(`forma_partita`), la bandierina conta 6 sullo stesso campo, e senza quel "su 6"
sembra un errore di conto.
⚠️ Accanto a ogni strato c'è il **peso vero**, non quello nominale: a ottobre
"nel ruolo" vale 10% invece di 25%, perché le partite in quel ruolo sono 2 su 5
e il peso che avanza torna alla stagione. Senza quel numero sembrerebbero tre
strati indipendenti.
⚠️ **La scheda si calcola VPM da sé** dallo stesso hook di sessione della lista
(`usaVpm`): stessa funzione, stessi dati, non possono divergere.

⚠️ `vociPesate()` e `forza()` sono **due strade sugli stessi numeri**: deve
valere `Σ PESI[k] × vociPesate[k] = forza.punti`. `scripts/prova-scheda.js` lo
controlla su tutte le partite (298 squadre-partita, scarto 3,6·10⁻¹⁵) — se non
torna, una delle due è stata toccata senza l'altra.

### I gol attesi — over x,5 e Goal/NoGoal

**Nato il 12/10/2026** da due richieste di Mattia che sono **la stessa cosa**:
*"un indicatore over x,5, una stima sul numero di reti previste"* e *"un
indicatore Goal/NoGoal"*. Un modello solo li produce entrambi — `lib/gol.js`,
visibile nel blocco **⚽ Gol attesi** della scheda.

⚠️ **Non usa nessuna quota, ed è voluto** (Mattia: *"non mi interessa un match
con le quote"*). Per l'over 2,5 il mercato ci sarebbe; per il GG/NG **no** —
nessuna colonna in nessuna delle due tabelle, football-data non le pubblica.

Il modello classico: `λcasa = attacco(casa) × difesa(ospite) × media del
campionato`, con le **stesse tre finestre e gli stessi pesi di VPM** (stagione
45% · forma 30% · ruolo 25%, peso in proporzione alle partite). Da λ escono
l'over a tutte le soglie e il GG.

⚠️⚠️ **Due cose sono misurate, non scelte, e senza di loro il modello è
inutilizzabile.** Misurato su **10.059 partite** (24/25-26/27), camminando nel
tempo con le sole partite precedenti:

1. **La stretta verso la media** (`K_STRETTA = 20`). La prima versione
   prevedeva **1,79 gol dove ne arrivavano 2,55** e **3,75 dove ne arrivavano
   2,99**: l'ordine giusto, l'ampiezza tripla del vero. Succede perché
   `attacco × difesa` moltiplica due rapporti stimati su 5-10 partite, e il
   rumore dell'uno si moltiplica col rumore dell'altro. La cura è tirare ogni
   rapporto verso 1: `1 + (r − 1) × n/(n + K)`. K = 20 sta al centro di un
   plateau (15-30 danno lo stesso), quindi non è cesellato.
2. **La base sono i TIRI IN PORTA, non i gol** (`BASE_DEFAULT = 'tiri'`):
   l'informazione aggiunta **raddoppia** (+0,0022 contro +0,0013). Un gol è un
   evento fortunato, cinque tiri in porta a partita no.

**Come sta messo adesso:** ben calibrato — over 0,5 previsto 93,0% contro 93,1%
vero · over 1,5 74,7 / 76,0 · over 2,5 50,6 / 52,5 · over 3,5 29,0 / 29,6 ·
GG 54,0 / 54,5.
⚠️ **Ma è debole, e va detto a chi lo legge:** sull'over 2,5 aggiunge **+0,0022**
rispetto a "prevedere sempre la media del campionato", mentre il mercato
aggiunge **+0,0082**. Cattura **circa un quarto** di quello che sa il book.
Serve a **leggere la partita**, non a scommetterci sopra — ed è quello che dice
la riga sotto il blocco nella scheda.
⚠️ **Il limite noto**: Poisson assume i gol delle due squadre indipendenti,
mentre nella realtà sono un po' correlati. Pesa più sul GG (moltiplica due
probabilità) che sull'over (somma due medie). Non si corregge a sentimento: se
si corregge, si misura. ✅ **Corretto il 12/10/2026 sul GG** — vedi sotto.

#### Il Goal/NoGoal — un consiglio che sa anche tacere

**Chiesto da Mattia il 12/10/2026**: *"un indicatore che mi dia visione, se la
partita sarà da Goal oppure no… un algoritmo di attendibilità che mi dia il
consiglio preciso"*. Il numero c'era dal mattino; mancava il consiglio, e
mancava la misura di quanto il consiglio valga. Fatto con
`btscout/scripts/prova-gg.js` su **34.434 partite**, camminando nel tempo.
⚠️ **Nessun soldo in questa misura, per scelta di Mattia**: le quote GG/NG non
esistono in archivio e l'indicatore serve a dare visione. I metri sono tre:
quanto aggiunge sul Brier · **quante volte il consiglio è giusto** · quanto è
giusto quando è sicuro.

⚠️⚠️ **Il confronto onesto non è il 50%, è "dico sempre GOL".** Il GG arriva il
**53,2%** delle volte, quindi un indicatore che azzecca il 53% non sta dicendo
niente. **Il nostro azzecca il 54,0%.**

**La cura che l'ha migliorato: `STRETTA_GG = 0,55`.** Il prodotto di due
Poisson indipendenti era **troppo sicuro di sé** — dichiarava 68% dove arrivava
il 63%, 37% dove arrivava il 45%: ordine giusto, ampiezza più larga del vero,
lo stesso difetto che `K_STRETTA` cura sui gol attesi e per la stessa causa (un
prodotto di rapporti stimati su 5-10 partite moltiplica i rumori). Tirando la
probabilità verso la frequenza media con fattore **0,55** si riproduce **tutta
la tabella empirica entro 0,62 punti** su nove fasce — quindi **una costante,
non una tabella**. Dopo la cura il numero non mente più: dichiara 46,2 → arriva
46,3 · 51,4 → 51,6 · 56,4 → 55,9 · 61,3 → 62,1. Il Brier aggiunto passa da
+0,0005 a **+0,0015** (triplicato, ma vedi il tetto qui sotto).
⚠️ **Il centro è fisso (`GG_MEDIO = 0,532`) e la misura lo impone**: col centro
mobile — la frequenza del campionato in corso — l'indicatore prevede **peggio**
(+0,0008), perché a ottobre quella frequenza è ancora rumore. Come le `ANCORE`
di VPM si rimisura solo per aggiungere una stagione.

**Il consiglio tace sotto il 55% di fiducia** (`FIDUCIA_GG = 0,55`,
`consiglioGg()`), e il perché è misurato:

| fiducia | il consiglio è giusto | partite |
|---|---|---|
| 50-55% | **52,2%** (= dire sempre GOL) | 22.343 |
| 55-60% | 56,8% | 10.823 |
| 60-65% | **62,0%** | 1.251 |

Sotto il 55% la scheda mostra **IN BILICO**, non un verdetto. ⚠️ È la scelta che
rende credibile il verdetto quando arriva: dare un responso dove non c'è
informazione è il modo di non essere creduti dove ce n'è.

⚠️⚠️ **E qui c'è il tetto, che chiude il discorso: il GG è quasi
imprevedibile.** Non abbiamo quote GG/NG, ma la quota **over 2,5** è un indizio
di mercato sullo stesso fenomeno: ritarata nello stesso modo, azzecca il
**54,1%** contro il nostro 54,0%. **Non è il nostro modello a essere scarso —
è il fenomeno.** Per confronto, sui segni l'attendibilità azzecca il 60,9%
contro una base del 50,8%.
⚠️ **Due strade provate e bocciate**: il modello diretto sull'evento *"ha
segnato sì/no"* invece dei gol attesi (**−0,0052**, peggio del non dire niente:
l'evento binario butta via l'informazione di quanti gol) e la **correzione di
correlazione** imparata dalle stagioni chiuse (invariata: +0,0005). La
correlazione fra le due squadre esiste ma è già dentro la stretta.

#### La testa del blocco: di chi sono i gol, e quanti aspettarsene

**Rifatta il 12/10/2026.** Prima c'erano i due numeri affiancati con la parola
*attesi* in mezzo (`1,45 attesi 1,56`) e il totale ripetuto nel titolo. Mattia:
*"non si capisce una mazza"*, e aveva ragione due volte — **il totale era
scritto due volte**, e **due numeri con una parola in mezzo si leggono come un
intervallo** mentre sono di due squadre diverse.

Adesso: il **nome di ciascuna squadra sopra il suo numero** (sinistra la casa,
destra la trasferta), e sotto l'intervallo vero del totale — `ATTESI DA 2 A 4
GOL · 62% DELLE VOLTE`, da `intervalloGol()`.
⚠️ **L'intervallo esiste perché "3,01 in tutto" è una media, e una media di gol
non si vede mai in campo**: non esistono partite da 3,01 gol. L'intervallo dice
la stessa cosa in risultati veri.
⚠️ **La percentuale accanto è verificata, non solo calcolata**: su 10.059
partite l'intervallo dichiara 67,9% e si avvera **67,9% ±0,9**
(`scripts/prova-gol.js`, blocco *l'intervallo dei gol*). Un intervallo senza
quanto spesso si avvera non si può leggere, e uno che promette più di quanto
mantiene è peggio di niente.
⚠️ `intervalloGol()` è la dispersione di **Poisson attorno a λ**, non
l'incertezza sulla nostra stima di λ: dice "con questa aspettativa i risultati
si sparpagliano così", non "la mia stima è precisa entro questo". Le due si
sommerebbero, quindi l'intervallo vero è semmai un filo più largo.
⚠️ **Tolto il paragrafo di avvertenze sotto le celle** (*"Stima dalle squadre,
senza quote…"*): era un trafiletto sotto a una griglia già densa e si leggeva
come rumore. Quello che diceva resta qui, dove serve a chi sviluppa; a schermo
resta la sola riga che spiega il colore.

#### Il gradiente delle dieci celle — 12 ottobre 2026

Il blocco **⚽ Gol attesi** ha **due righe da cinque**: over 0,5/1,5/2,5/3,5 +
GOAL sopra, under + NOGOAL sotto. Ogni cella ha un **gradiente a quattro
fasce**: rosso · giallo · verdino · verde brillante.

⚠️ **La regola viene da un esempio di Mattia**: *"con over 2,5 abbiamo il 64%:
0-40 rosso, 40-54 giallo, 54-60 verdino, 60 in su verde"*. Quei tre tagli,
sulla base del 51%, sono esattamente **base − 20% dello spazio sotto · base +
6% dello spazio sopra · base + 20% dello spazio sopra** (`tagliGol()`).
⚠️⚠️ **Gli scarti sono in proporzione allo spazio disponibile, non in punti
fissi**, ed è quello che fa funzionare la scala su tutte e dieci le righe:
l'over 0,5 ha base 92,9% e sopra gli restano sette punti, quindi "base + 10
punti" non esisterebbe. Le basi (`BASI_GOL`) sono misurate su 33.141 partite e
si rimisurano solo per aggiungere una stagione, come le ANCORE di VPM.

**Verificato che le fasce vogliano dire qualcosa** — il tasso vero dentro
ognuna, rosso → verde:

| | rosso | giallo | verdino | verde |
|---|---|---|---|---|
| over 1,5 | 65% | 73% | 78% | **83%** |
| over 2,5 | 41% | 49% | 58% | **62%** |
| over 3,5 | 22% | 28% | 35% | 44% |
| under 2,5 | 38% | 45% | 54% | **59%** |
| under 3,5 | 56% | 68% | 75% | **78%** |
| Goal | 48% | 52% | 59% | **68%** |

Sale su ogni riga, senza scalini al contrario: è questo che rende il colore
leggibile a colpo d'occhio invece che decorativo.

⚠️⚠️ **Il verde dice "più del solito", NON "giocata vincente", e la differenza
va tenuta viva.** L'over 3,5 in fascia verde arriva il **44%** delle volte: più
del suo 28,7% abituale, e comunque una giocata che perde più di quanto vince.
Le uniche righe dove il verde è **anche** una giocata che ha funzionato sopra
il 70% sono **over 0,5, over 1,5 e under 3,5** — le altre non ci arrivano a
nessuna soglia (massimi: over 2,5 64% · under 2,5 62% · Goal 61% · NoGoal 55% ·
over 3,5 43% · under 1,5 35% · under 0,5 12%). La riga sotto il blocco lo dice
a schermo.
⚠️ **Il criterio precedente era sbagliato e Mattia l'ha visto:** accendeva dove
l'esito arriva più spesso del suo solito **senza fasce**, quindi l'over 3,5 si
illuminava di verde al 35%. *"Ho previsione 3,01 gol e si illumina l'over 3,5,
c'è qualcosa che non va."* Il gradiente risolve mostrando **quanto** sopra il
solito, invece di un sì/no.
⚠️ **La fascia si decide sul numero ARROTONDATO**, quello che la persona legge:
col valore pieno una cella mostrava `93%` e stava nella fascia sotto perché
dietro c'era 0,9299, e il colore smentiva la cifra che aveva accanto.
⚠️ **Il fondo è acceso in proporzione alla fascia** (verde .16 · rosso .12 ·
verdino .10 · giallo .05): dieci celle a tinta piena sono un semaforo
illeggibile, e il giallo è il "niente di che" — deve restare sullo sfondo.
⚠️ **GOAL e NOGOAL sono VIOLA** (`C.viola`, scelta di Mattia il 12/10/2026):
contorno ed etichetta, non il numero. Sono una **domanda diversa** dagli
over/under — *"segnano entrambe?"* invece di *"quanti gol?"* — e in blu si
confondevano con la riga sopra. ⚠️ **La famiglia dice cosa stai guardando, la
fascia come sta messa**: il gradiente resta sul numero anche nelle due celle
viola. Gli over/under non hanno famiglia, seguono la fascia anche nel contorno,
perché sono la scala principale.
⚠️ **La riga CONSIGLIO non usa il verde**: con dieci celle colorate accanto,
un consiglio verde sarebbe l'undicesima tinta che significa un'altra cosa.
Porta il **viola della sua famiglia**, perché il consiglio è sul Goal.
⚠️ **Questo gradiente vale SOLO per over/under e GG/NG** (richiesta esplicita
di Mattia): gli altri numeri hanno già i loro codici — il verde/rosso di VPM è
l'accordo col mercato, non una soglia.

⚠️ **Il metro giusto non è il mercato, è la costante.** Un modello che non
batte "prevedi sempre la frequenza media" non sta dicendo niente sulla singola
partita. `scripts/prova-gol.js` lo stampa sempre, e i pomelli `--base=` e
`--k=` servono a rifare la misura invece di fidarsi di questi numeri.

**Si può migliorare? Misurato il 12/10/2026** con
`scripts/prova-gol-varianti.js`, su **34.434 partite** di otto stagioni. Cinque
cambiamenti provati, **nessuno migliora**: media separata casa/fuori +0,0038 ·
tiri totali +0,0038 · angoli +0,0021 · gol +0,0014 · la stagione scorsa come
base a inizio campionato +0,0038, contro i **+0,0039** di quello in uso.
⚠️ **Quanto spazio resta:** sulle stesse partite il mercato aggiunge **+0,0094**
e noi **+0,0039** — **il modello cattura il 42% di quello che sa il book**. Il
58% che manca è in buona parte informazione che **non abbiamo**: formazioni,
infortuni, turnover. È esattamente il territorio che `btscout/CLAUDE.md`
assegna al giudizio e non al calcolo.
⚠️ **Provata anche "la VPM degli over"** (idea di Mattia, 12/10): invece di
sommare i gol attesi delle due squadre, guardare **solo l'accoppiata che
conta** — attacco della favorita contro difesa concessa dalla sfavorita.
Misurata sulle stesse 34.426 partite: **over 2,5 nelle prime 9 del giorno
53,4% contro il 54,3% del modello completo**, over 1,5 76,8% contro 77,7%, e
in soldi 95,3% ±1,7 contro 94,4% ±1,6 — **intervalli sovrapposti, quindi
stesso numero**. L'idea è sensata ma **il modello completo la contiene già**:
`attacco(favorita) × difesa(sfavorita)` è uno dei suoi due termini, e buttare
l'altro perde informazione senza togliere abbastanza rumore.

⚠️ **Provato anche l'aggiustamento per la FORZA DEGLI AVVERSARI AFFRONTATI**
(idea di Mattia, 12/10: *"l'avversario conta tantissimo, anzi è la base"*) —
`scripts/prova-gol-avversari.js`. Ogni partita della storia viene ripesata per
chi c'era di fronte **prima** di entrare nella media: i tiri fatti divisi per
quanto quell'avversario concedeva, quelli subiti per quanto produceva. Tre
intensità (nessuna · metà · piena) più una **senza stretta**. Risultato sulle
stesse 34.434 partite: **+0,0039 in tutte e quattro**, over 2,5 nelle prime 9
54,6% in tutte, e in soldi 94,6-94,7% ±1,7. **Identico.**
⚠️ **Il motivo non è che l'avversario non conta: è che si compensa da sé.**
Entro una stagione ogni squadra incontra quasi tutte le altre, quindi la media
degli avversari affrontati tende alla media del campionato — che è già il
denominatore del modello. La correzione sposta i gol attesi di **0,021** in
media (0,055 a forza piena, massimo 0,41): cambia il numero, non l'ordine.
⚠️ **Provata anche nell'unica fetta dove poteva valere** — quando entrambe le
squadre hanno giocato **meno di 8 partite**, cioè quando una può aver incontrato
solo le prime tre in classifica. 5.426 partite: **+0,0007 senza correzione,
+0,0009 con quella piena senza stretta**, e sulle prime 9 la correzione *peggiora*
(54,3% contro 54,6%). ⚠️ Nota a margine: **a inizio stagione il modello non
aggiunge quasi niente** (+0,0007 contro +0,0039 sul totale) — il limite di
agosto-settembre non è l'avversario, sono le poche partite.

⚠️⚠️ **E l'indicatore degli over NON è la resa, è la probabilità.** Chiesto da
Mattia il 12/10 ("usiamo resa come consiglio per gli over?") e misurato subito
in `prova-gol-varianti.js`: scegliendo le prime 9 di ogni giorno per
`quota over × nostra probabilità` l'over 2,5 si avvera **47,2%**, cioè **sotto
la base del 50,9%** — peggio del caso — e rende **93,6% ±1,9** contro il 94,7%
della probabilità nuda. Col *p* del mercato va 49,0% e 95,7% ±1,9, che è lo
stesso numero del mercato (95,2% ±1,6). ⚠️ **È lo stesso difetto che la resa ha
sui segni** (51,2% di azzeccate, la peggiore): `resa = quota × probabilità`,
quindi resa alta vuol dire **quota alta**, e un over a quota alta è una partita
che il book ritiene poco probabile da over. **La resa dice se il prezzo
conviene, non cosa giocare** — esattamente come la quota.

⚠️⚠️ **Ma migliorarlo non lo renderebbe redditizio, e questo chiude il
discorso:** prendendo le prime 9 partite di ogni giorno **secondo il mercato
stesso**, giocare l'over 2,5 rende **95,1%**. Nemmeno chi prezza quelle partite
di mestiere ci guadagna, perché il margine sull'over/under è del 5-6%. Il
nostro rende 94,7%. **Il tetto di questo mercato è una perdita**: l'indice dei
gol serve a leggere la partita, e investirci altro tempo compra un colore più
nitido, non dei soldi.

#### ⚠️⚠️ IL METRO GIUSTO: la tabella delle soglie

**Chiarito da Mattia il 12/10/2026, dopo che avevo misurato tutto col metro
sbagliato.** Parole sue: *"non voglio una sfera di cristallo che indovina tutte.
Voglio creare degli indicatori che mi aiutano a vedere e leggere la partita, e
statisticare se sopra a una certa soglia quell'indicatore ha senso giocarlo:
se l'indicatore è sopra al tot%, succede X volte."*

⚠️ **Quindi "non batte il mercato" e "non è redditizio" NON sono bocciature.**
Avevo chiuso due volte un indicatore su quei criteri (l'indice dei gol il
12/10, poi il GG) e nessuno dei due era il criterio di Mattia. La domanda è
**interna all'indicatore**: sopra la soglia, quante volte arriva l'esito, su
quante partite, contro la frequenza generale.

**La tabella la stampa `scripts/prova-indicatori.js`** (sezione *LA TABELLA
DELLE SOGLIE*), su **33.141 partite in 1.636 giorni di gioco**, otto stagioni,
dalla 5ª giornata. Tre colonne obbligatorie, e nessuna è facoltativa:
**succede %** · **contro la base** (senza, non si distingue "la soglia
seleziona" da "quell'esito è frequente") · **a giornata** (una soglia che dà
mezza partita a weekend ha ragione e non serve a niente).

| indicatore | soglia | partite | a giornata | succede | contro la base |
|---|---|---|---|---|---|
| **attendibilità** → la giocata | 70% | 2.466 | 1,5 | **76,6%** | +25,8 ±1,7 |
| | 75% | 674 | 0,4 | **81,6%** | +30,8 ±2,9 |
| **VPM** → la giocata | 7,0 | 9.076 | 5,5 | 60,8% | +10,0 ±1,0 |
| | 8,0 | 2.416 | 1,5 | **68,6%** | +17,8 ±1,9 |
| | 8,5 | 958 | 0,6 | **71,4%** | +20,6 ±2,9 |
| **voto** → la giocata | 95% | 20.123 | 12,3 | 53,6% | +2,8 ±0,7 |
| | 100% | 2.312 | 1,4 | **67,3%** | +16,5 ±1,9 |
| **resa** → la giocata | 95% | 7.216 | 4,4 | 52,7% | +1,9 ±1,2 |
| **over 1,5** | 80% | 6.627 | 4,1 | **83,2%** | +7,8 ±0,9 |
| **over 2,5** | 60% | 4.296 | 2,6 | 61,1% | +10,2 ±1,5 |
| | 65% | 1.383 | 0,8 | **64,9%** | +14,0 ±2,5 |
| **Goal** | 58% | 3.602 | 2,2 | 60,0% | +6,7 ±1,6 |
| | 60% | 1.138 | 0,7 | **62,0%** | +8,7 ±2,8 |

⚠️ **Con questo metro funzionano tutti**, e lo scarto è più grande del margine
d'errore in ogni riga tranne due (voto ≥90% e resa ≥90%, che selezionano quasi
tutto e quindi non selezionano).
⚠️ **VPM sale in modo pulito e monotòno** — 53,2% a 6,0 · 60,8% a 7,0 · 71,4%
a 8,5 — ed è l'indicatore che avevo più sottovalutato: col metro del mercato
"perdeva" contro l'attendibilità, col metro della soglia è una lettura
affidabile della partita.
⚠️ **Anche il GG funziona**, pur essendo quasi imprevedibile in media: sopra il
60% i gol da entrambe arrivano il 62,0% delle volte contro il 53,3% generale.
"Quasi imprevedibile" e "inutile sopra soglia" sono due cose diverse.
⚠️ **L'attendibilità oltre il 75% non si misura**: 51 partite sopra l'80% in
otto stagioni, zero sopra l'85%. Le soglie 75/72/65 delle spin stanno al
confine di quello che l'archivio può dire.
⚠️ **Il voto a 100% è un muro, non una scala**: 2.312 partite sopra, 17 sopra
105%. Chi legge la tabella non deve aspettarsi un voto 110%.

#### Misurato il 12/10/2026 — quale indicatore sceglie meglio

`btscout/scripts/prova-indicatori.js`, su **33.133 partite** di otto stagioni,
dalla 5ª giornata, tutto ricostruito camminando nel tempo (VPM, gol attesi,
consenso di **apertura**, quota Bet365 di **apertura**). "Azzeccata" = **la
giocata per intero**: il segno, e per le combinate anche l'over 1,5.
Prendendo le **prime 9 di ogni giorno** secondo ciascun indicatore:

| | azzeccate | resa realizzata |
|---|---|---|
| tutte le partite (la base) | 50,8% | 95,5% |
| **attendibilità** | **60,3%** | **97,5%** |
| VPM | 56,3% | 96,0% |
| voto | 55,7% | 96,9% |
| resa | 51,2% | 96,1% |

⚠️ **L'attendibilità vince su entrambi i metri, e nessuna combinazione la
batte.** Provati tutti e 15 i sottoinsiemi: attendibilità da sola **60,3%**,
con VPM 59,4%, con il voto 59,2%, **tutti e quattro insieme 55,8%**. Ogni
indicatore aggiunto **abbassa**.
⚠️⚠️ **Attenzione a non confondere questa misura con la tabella delle soglie**:
qui si incrociano le **prime 9 di ciascuno** — una gara a chi arriva primo, e
lì combinare peggiora. Sopra una **soglia** la risposta è l'opposta (45,7% →
74,1% da zero a quattro indicatori d'accordo). Sono due domande diverse: vedi
la pagina Andamento.
⚠️ Quindi la risposta alla domanda *"quando tutti e quattro ci azzeccano?"* è:
**non succede, e metterli insieme peggiora.** Il motivo è che chiedere anche
una resa alta significa chiedere quote più lunghe, cioè partite meno probabili.
⚠️ **Due metri, non uno**: *azzeccate* è il metro di chi deve indovinare nove
esiti; *resa realizzata* è quello di chi gioca una singola. La resa e il voto
non servono a indovinare — giudicarli sulle azzeccate è come giudicare un
difensore sui gol fatti. Lo script stampa sempre entrambi.
⚠️ **Nessun indicatore arriva a 100%**: il migliore rende **97,8%**, cioè −2,2%
a giocata. La selezione **riduce la perdita, non la ribalta** — coerente con
tutto il resto misurato qui dentro.
⚠️ Su tre stagioni la resa dava 94,0% e sembrava la peggiore anche a soldi: su
otto fa 96,3%. **Era rumore** — a queste quote servono decine di migliaia di
scommesse per distinguere due punti.

### La pagina Andamento — studiare le soglie, non guardare l'archivio

**Fatta il 12/10/2026.** Nel menu ☰ (📈 Andamento). Misura **quanto sono
attendibili i nostri indicatori** sulle partite vere: per ogni metodo, le
**prime 15 di ogni singolo giorno** e le **prime 36 del weekend intero**
(scelte di Mattia), con *azzeccata* = **la giocata per intero**, over 1,5
compreso per le combinate.

⚠️⚠️ **Lo scopo non è l'archivio, è la soglia.** Mattia: *"in questo storico
vedo tutto, ma non mi interessa: devo studiare l'attendibilità dei nostri
indicatori. Attendibilità 37% non la voglio neanche vedere, è rumore"*. Perciò
le **soglie minime sono accese di default** e tolgono le partite **anche dal
riassunto**, non solo dall'elenco. Partenza (dalla tabella misurata): att 60% ·
VPM 7,0 · voto 100% · resa 95%. Si muovono dalla pagina — servono a **cercare**
la soglia buona, non a dichiararla trovata.
⚠️ **I passi sono scelti da Mattia e non sono uguali fra loro**: attendibilità
**1 punto** (decide le spin, 75/72/65), VPM **0,10**, voto **0,25 punti**, resa
1 punto. Il voto ha il passo più fine perché è il più ripido: fra 100% e 101%
ci sono 1.098 partite.
⚠️ **Il confronto con la soglia si fa sul numero ARROTONDATO come si vede**
(`sopra()` in `hooks/usaAndamento.js`), altrimenti una cella che mostra
`100,25%` accanto a una soglia `100,25%` resta spenta perché sotto c'è
100,2449. Stessa trappola delle caselle dei gol.

**Ogni riga porta tutti e quattro i valori**, non solo quello del metodo che
l'ha scelta (sql/22): *"quando clicco Voto vorrei vedere gli altri 3, per
capire quali indicatori mi avrebbero allertato"*. Verde quelli sopra la loro
soglia.

**I giorni sono tendine**, uno sull'altro e raggruppati per weekend: un tocco
apre, il secondo richiude. Sul tasto c'è già il risultato del giorno (`9/14`),
altrimenti per sapere com'è andato bisognerebbe aprirlo.

#### ⚠️ Il punto in comune esiste — e ribalta una conclusione del 12/10

La card **"tutte e quattro sopra soglia"** risponde alla domanda di Mattia
*"esiste un punto in comune per questi 4 valori?"*. Misurato su **33.141
partite**, con le soglie di partenza:

| indicatori sopra soglia | azzeccate | partite |
|---|---|---|
| 0 | 45,7% | 17.991 |
| 1 | 49,4% | 9.026 |
| 2 | 65,9% | 3.655 |
| 3 | 68,4% | 1.351 |
| **4** | **74,1%** | 1.118 |

⚠️ **Sale in modo pulito, e contraddice quello che avevo scritto poche ore
prima** ("metterli insieme peggiora"). Non è un errore di misura: erano **due
domande diverse**. L'incrocio delle **prime 9 di ciascuno** è una gara a chi
arriva primo e lì combinare peggiora; le **soglie** chiedono "sono tutti
d'accordo che questa è buona?" e lì combinare paga. **Quando due misure si
contraddicono, guardare prima se rispondono alla stessa domanda.**
⚠️ **Ma il guadagno sull'attendibilità da sola non è dimostrabile**: tutte e
quattro **74,1% ±2,6** su 1.118 contro **71,6% ±1,1** su 6.257 — +2,5 punti per
5,6 volte meno partite, dentro il rumore. Quasi tutto il merito è
dell'attendibilità: le altre tre sopra soglia **senza** di lei fanno **44,7%**,
sotto la base.

#### Come sono fatti i dati

⚠️⚠️ **I conteggi li fa il database, non il browser** (`sql/23`): `andamento`
ha **101.237 righe** sulle otto stagioni, e scaricarle per contarle non è
fattibile — oltre al fatto che PostgREST ne dà 1000 **in silenzio**. Cinque
funzioni, tutte con le soglie come **parametri** (servono proprio a essere
spostate): `andamento_riassunto` · `andamento_accordo` (la distribuzione 0-4) ·
`andamento_chiavi` (i tasti, col risultato già dentro) · `andamento_verdi` ·
`andamento_stagioni`. Il dettaglio di un giorno si scarica solo all'apertura
della tendina: 15 righe, 36 per il weekend.
⚠️ **`andamento_chiavi` ha un `p_limite` esplicito (400)**: senza stagione i
giorni sono 1636 e il tetto implicito li avrebbe tagliati a 1000 senza dirlo.
La pagina parte dalla **stagione più recente** e avvisa in ambra quando
l'elenco è al tetto.
⚠️ Le funzioni sono chiuse con le **tre righe** (`revoke from public`,
`revoke from anon`, poi il grant) e verificato dall'API che senza login
rispondano no.

⚠️ **La pagina non calcola niente**: legge la tabella `andamento` (sql/21-22).
Ricostruire VPM e i gol attesi di ogni giornata passata dal browser non è
fattibile, e un numero che cambia a seconda di quando apri la pagina non è una
misura. La riempie `btscout/scripts/calcola-andamento.js` (prova a vuoto di
default, `--esegui` scrive, `--stagioni=8` per il passato).
⚠️ **La ricostruzione camminando nel tempo sta in `btscout/lib/ricostruisci.js`**,
e la usano sia `calcola-andamento.js` sia `prova-indicatori.js`: **non
duplicarla**. ⚠️ Per un giorno le due copie sono esistite davvero, ed erano
**già divergute**: quella di `prova-indicatori` aveva la chiave del giorno
sbagliata. Le date stanno in `btscout/lib/date.js`. È il pezzo in cui si sbaglia più facilmente — basta aggiornare la
storia di una squadra *prima* di valutare la partita e il modello conosce il
futuro.
⚠️ **`andamento` non si scrive dall'app da nessun ruolo**: c'è la sola policy
di lettura per chi ha fatto login, e la riempie lo script con la service_role.
Provato in `scripts/prova-permessi.js`.
⚠️ **Le otto stagioni sono dentro dal 12/10/2026**: 101.237 righe, ricalcolate
in 23 secondi. Con la sola stagione in corso i numeri non dicevano niente —
20 giorni su 25 avevano 15 partite o meno, quindi "le prime 15" erano *tutte* e
i quattro metodi sceglievano la stessa lista; il gruppo delle quattro spunte
verdi aveva 4 partite. ⚠️ L'avviso resta valido anche sull'archivio intero:
**999 giorni su 1636** hanno 15 partite o meno, e lo script lo stampa.
⚠️ `giornoLocale()` nel modulo: il driver postgres consegna oggetti `Date`, e
`String(data).slice(0,10)` su un Date dà `"Mon Oct 05"`, non la data.

### Dove si sta andando: un voto unico, che resta una probabilità

**Deciso parlandone il 10/10/2026.** L'obiettivo di Mattia è **un voto solo per
la partita**, con una soglia minima per giocare — tre indicatori che diventano
un output, così il sistema si può misurare invece di discuterlo. La direzione è
giusta, ma la forma del voto non è libera:

⚠️ **Il voto deve essere la probabilità corretta, non la media dei tre indici.**
`voto = attendibilità ± correzione del campo (VPM)`, con la correzione limitata
a pochi punti. Due ragioni, entrambe con i numeri dietro:

- **Nove esiti si moltiplicano.** Tutte e 9 le caselle all'80% danno
  P(9/9) = **13,4%**; al 76% **8,5%**; al 72% **5,2%**; al 65% **2,1%**. Sulla
  spin 1 del 9/10 (8,5% reale), portare il centro da 75% a 47% costa **−37%**
  sulla probabilità di tutta la spin. Quindi la probabilità deve **dominare** il
  voto: non può essere un terzo di una media.
- **Una media di indici non è monotòna nella probabilità di vincere.** Un voto
  7,8 può nascere da "78% con VPM mediocre" o da "62% con VPM 9,5": due rischi
  diversissimi, e una soglia su quel numero non controlla più niente.

⚠️ **La quota non entra nella selezione.** Il Grado la contiene al 30% *di
proposito*, ma dentro un voto che scegliere le caselle direbbe "accetta una
casella meno probabile se paga di più" — e su un accumulator da nove è il
contrario di quello che conviene, perché le probabilità si moltiplicano mentre
la quota la si incassa solo se vince tutto. La quota risponde a **quanto punto**
e **se vale la pena**, non a **cosa gioco**.

⚠️ **I pesi della correzione si misurano, non si scelgono.** VPM si può
ricostruire nel passato — 53.973 partite con risultati e gol, tiri in porta sul
94,7%, consenso di apertura su 37.910 — e la domanda è una sola: fra le partite
sopra soglia, quelle dove il campo era d'accordo col mercato hanno vinto più
spesso? Da fare **col consenso di apertura e il VPM di quel giorno**: vale la
trappola apertura/chiusura di sotto. Se la risposta è zero, lo si scopre prima
di costruirci sopra.

#### Misurato il 10/10/2026 — il vantaggio sta nel prezzo, non nella selezione

`btscout/scripts/misura-resa-favoriti.js`, su **37.871** partite con favorito
scelto dal consenso di **apertura**, quota Bet365 di apertura e risultato.
La domanda era: giocando il favorito secco, la **resa realizzata** supera il
100%? (Sopra si guadagna, sotto si perde, e nessuna progressione di puntate lo
cambia: la scala a recupero rompe il pari esattamente a resa 100%.)

- **Il favourite-longshot bias è confermato e si vede**: nella fascia 1,35-1,40
  l'attendibilità dichiarava **69,1%** e il favorito ha vinto **72,5%**; in
  1,40-1,45 dichiarava 66,4% e ha vinto 71,4%. Il mercato è conservativo sui
  favoriti, come già scritto sopra.
- **Resa per fascia di quota giocata**: tutti i favoriti **95,3%**
  [94,3 … 96,3] ✗ · 1,70-2,00 **94,3%** ✗ · 1,55-1,70 **96,8%** ✗ ·
  **1,30-1,45 → 99,8%** [97,5 … 102,1], **indistinguibile da 100** su 2.733
  partite. ⚠️ Quindi **le quote corte sono l'unica fascia che non perde**: è
  esattamente la fascia della versione SOFT della scala.
- ⚠️ **Le stesse 2.733 partite, a tre prezzi**: Bet365 apertura **99,8%** ·
  media di mercato **100,3%** · **massima di mercato 103,2% [100,9 … 105,6], il
  solo valore significativamente sopra 100.** Il vantaggio sta **nel prezzo**,
  non (ancora) nella selezione: cambiare book vale **+3,4 punti**, più di
  qualunque rifinitura del criterio.
- ⚠️ **Ma la massima è un prezzo che bisogna POTER giocare**: serve il conto su
  quel book, e i book che pagano di più limitano i vincenti. Prima di costruirci
  sopra va verificato su quali book Mattia può davvero puntare.
- **In euro, su un ciclo SOFT da 20 €**: a resa 97,5% costa **−2,38** · a 99,8%
  **−0,20** · a 102,1% rende **+2,28**. Tutto il sistema vive in una banda di
  quattro punti, che è la stessa larghezza dello scarto fra i book.

#### Misurato il 10/10/2026 — Mattia gioca su Bet365, e il quadro è questo

**Il +3,4 della massima di mercato non è disponibile**: serve il conto su quel
book. Quindi la domanda diventa: su **Bet365**, c'è un sottoinsieme con resa
sopra 100? Misurato sulla fascia 1,30-1,45 (2.733 partite):

- **Bet365 paga più della media di mercato** (748 partite): resa **101,2%**
  [96,9 … 105,6] — non significativo. Con scarto > +2% (124): 103,2%, intervallo
  enorme.
- **Per attendibilità**: 65-70% → **101,3%** [98,4 … 104,3] (1.661 partite) ·
  70-75% → 97,6% · 60-65% → 96,4%. Nessuno significativo.

⚠️ **E non lo sarà mai con questo archivio.** La deviazione standard di una
scommessa a 1,37 è **0,608**, quindi per dimostrare un vantaggio servono:
**+2% → 3.553 scommesse · +1% → 14.211**. La fascia ha **2.733 partite in otto
stagioni** (~340 l'anno): il vantaggio minimo visibile è **±2,3%**. Un vantaggio
reale del 2% è **invisibile** qui. Non si può validare col backtest, e chi dice
il contrario sta leggendo il rumore.

⚠️⚠️ **Il CLV NON vale sui favoriti corti, e questo smentisce in parte la regola
scritta sopra.** Misurato: CLV della fascia contro la chiusura = **−5,66%**
(media) e **−3,15%** (exchange), negativo in tutte le fasce e tutte le stagioni.
Sembrerebbe una condanna, ma **la chiusura sottoprezza i favoriti**: implica
**70,5%** mentre il favorito ha vinto davvero **72,7%** — 2,2 punti di
favourite-longshot bias che restano anche a mercato chiuso. Tradotto: la
chiusura prevedeva resa **96,8%**, la realtà ha dato **99,8%**.
**Quindi il CLV va usato solo dove è stato validato** — le scommesse di valore a
quota media 6 (+2,0%) — e **non sui favoriti a 1,30-1,45**, dove è sistematicamente
pessimista. Se una sessione futura rimisura il CLV e conclude "la scala perde",
sta usando lo strumento sbagliato.

**La conclusione onesta:** sul suo book, la fascia dei favoriti corti è
**approssimativamente un gioco alla pari** (99,8% ± 2,3). Non si dimostra un
vantaggio, ma non si sanguina come su tutto il resto: tutti i favoriti insieme
fanno 95,3%, la fascia 1,70-2,00 il 94,3%. **I guadagni dimostrabili sono
strutturali, non di selezione**: stare sulle **quote corte** invece che lunghe
(+5,5 punti) e giocare **una partita per volta** invece di due o tre
(SOFT −5,0% per ciclo contro HARD −10,6%, perché la resa di una combinata è il
prodotto delle rese). La selezione serve a **escludere** i sottoinsiemi peggiori,
non a creare un margine.

⚠️ **Corollario sul formato:** l'attendibilità **non si converte in 1-10**.
È il seme del voto finale e l'unica cosa calibrata che abbiamo; una conversione
lineare trasforma `75%` in `7,75` — le stesse cifre, nessun guadagno, e si perde
"vince tre volte su quattro". Le soglie 75/72/65 sono percentuali, vivono in
nove file e decidono le spin: due scale sulla stessa cosa sono il difetto
peggiore possibile.

⚠️ **Una stellina scavalca la soglia, non il calendario.** Una partita votata
entra nella spin anche se sta sotto soglia (`candidate()` in `lib/spin.js`
accetta `votiDi`): è un gesto deliberato di una persona, e vale più del calcolo.
⚠️ Ma **oltre il martedì che chiude il weekend non entra niente, nemmeno una
votata** — `martediChiusura()` in `lib/attendibilita.js`, deciso l'8/10/2026.
È un **blocco**, e la differenza è questa: la soglia è un giudizio su *quella*
partita, che una persona può ribaltare; la data è un vincolo sulla *spin intera*,
e nessun giudizio su una casella lo può sciogliere. Una spin che mescola due
weekend tiene otto schedine aperte nove giorni, e il risultato arriva una
settimana dopo aver giocato il resto. Le votate tagliate dal limite **si
mostrano in rosso** nelle Spin provvisorie: un voto che non produce niente, in
silenzio, sembra un difetto. Da mercoledì il limite è il martedì dopo; il
martedì chiude sé stesso. ⚠️ Perciò nelle Spin provvisorie **non c'è più la
scelta della finestra** (`finestraUtile` è stata tolta): si poteva allargare a
"tutte" ed era esattamente così che i due weekend finivano nella stessa spin.
Se le candidate non bastano, le caselle restano vuote e la pagina lo dice —
allargare non è più un rimedio. **In griglia (Slot) invece è un avviso, non un
blocco**: là la data è testo `gg/mm` senza anno, quindi si guarda l'**ampiezza**
(oltre 4 giorni fra la prima e l'ultima casella) e si deve poter correggere a
mano.

⚠️ **I nomi, da non scambiare:** *attendibilità* = la probabilità secondo il
mercato · *resa* = quota × attendibilità, 100% è il pareggio · **VPM** = quale
segno dice il campo e quanto è netto, 5,5-10 (le squadre) · **VOTO** = resa ×
fattore VPM, cioè quanto conviene giocarla · ~~Grado~~, togliere il 10/10 ·
**voti** = le stelline
degli admin (`voti_partite`), che restano voti in app e database. ⚠️ **Sta sotto 100 quasi sempre**,
ed è il margine del book: misurato sull'archivio, nessuna fascia di
attendibilità ha ROI significativamente positivo. Serve a confrontare due
partite fra loro, non a promettere guadagni.
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

### ⚠️⚠️ Quando le due fonti si contraddicono, non si gioca

**Trovato da Mattia il 12/10/2026 guardando una card**: voto **200%**, con
attendibilità 65% accanto a una quota 3,00 — due numeri che non possono stare
insieme. Sotto c'era questo:

```
Bet365 (football-data)    2,40  3,10  3,00   partita equilibrata
consenso (The Odds API)  11,88  3,39  1,40   trasferta straferita
```

⚠️ **Non era un book impazzito**: media, massima ed exchange del consenso
concordavano fra loro, quindi erano più book su un evento che **non era quella
partita**. ESPN conferma che l'accoppiamento Burgos-Granada esiste, e le altre
dieci partite di Segunda di quei giorni hanno `b365 ≈ consenso`. **Dato
sbagliato alla fonte, su un evento solo** — la chiave di conflitto
dell'import è `(div, data, casa, trasferta)`, quindi non è un difetto di
aggancio nostro.

**La difesa, in tre punti** (`SCARTO_FONTI = 0,15` in `lib/attendibilita.js`):
1. `scartoFonti(r)` confronta la probabilità del segno 1 **fra 1 e 2** (la X si
   esclude da entrambe le parti, così il margine diverso non conta).
2. Oltre 15 punti la partita è `quoteIncoerenti`: **non entra nelle spin**
   (`candidate()`), e ⚠️ **questo lo scavalca anche una stellina** — la
   stellina è un giudizio su una partita, qui il **dato** è rotto e nessun
   giudizio lo ripara.
3. A schermo lo dice **sopra la barra**, in rosso, in **una riga sola**:
   *"⚠️ QUOTE IN CONFLITTO — Partita da verificare."* (scelta di Mattia). Il
   dettaglio — quanti punti, quale fonte dice cosa — lo stampa
   `controlla-dati.js`: sopra una card serve sapere **che** c'è un problema,
   non perché.
   ⚠️ **La partita resta visibile di proposito**: nasconderla vorrebbe dire che
   il difetto non lo trova più nessuno.

⚠️ **Non si indovina quale fonte ha ragione**, e non si deve: su 308 future con
entrambe le quote **una sola** supera la soglia. Il costo del controllo è una
partita; il costo di non averlo era un voto del 200% preso per buono.
⚠️ **Il controllo vale solo su `prossime_partite`**, dove b365 e avg sono
**entrambe di apertura**. In `partite` le `avg_*` sono di **chiusura**, quindi
uno scarto grande può essere solo la linea che si è mossa.

### I controlli dopo l'aggiornamento

`scripts/controlla-dati.js`, chiamato in coda a `aggiorna.js` (**non ferma la
routine**: dice cosa guardare, non impedisce l'aggiornamento). Quattro
controlli, nati ciascuno da un difetto vero passato in silenzio:
**risultati che non arrivano** (football-data fermo tre settimane rispondendo
200) · **le due fonti che si contraddicono** (il voto 200%) · **importazioni in
attesa** di una persona · **doppioni in archivio** (due fonti che scrivono
sulla stessa tabella).
⚠️ Il filo comune: **erano tutti dati plausibili e sbagliati**, e nessuno
chiedeva mai *"è andato bene?"*.

## ESPN, la seconda fonte dei risultati

**Aggiunta il 12/10/2026**, dopo che football-data è rimasto **tre settimane
indietro** (fermo al 20 settembre, server che risponde 200, nessun errore da
nessuna parte). ⚠️ **Il problema non era football-data: era avere una fonte
sola senza allarme.** Ce ne siamo accorti solo perché Mattia ha chiesto di
aggiornare.

| | |
|---|---|
| **Cosa dà** | risultati **in giornata**, tiri in porta, tiri, angoli e **possesso palla**, su tutti e 15 i campionati (provati uno per uno) |
| **Cosa non dà** | **le quote**: quelle restano football-data (Bet365) e The Odds API (consenso) |
| **Costo** | gratis, nessuna chiave |
| **Rischio** | **API non documentata**, è quella che alimenta il loro sito: nessun contratto, può cambiare o chiudere senza avviso |

⚠️ **ESPN affianca, non sostituisce.** `partite.fonte` dice da dove viene ogni
riga (`football-data` di default, `espn` per le altre): senza, una riga ESPN
sarebbe indistinguibile — non si saprebbe perché le mancano le quote, e quando
football-data pubblica si creerebbe un doppione invece di completarla.

### La regola che tiene pulito l'archivio: non si indovina mai

`scripts/importa-espn.js` scrive **solo** quando esiste **una e una sola**
partita nostra che combacia su **campionato + data (±1 giorno) + tutt'e due le
squadre**. Zero candidati, due candidati, un nome mai visto → la riga finisce
in `importazioni` e **aspetta una persona** (pagina **Importazioni** nel menu).
⚠️ **Un risultato messo sulla partita sbagliata non si vede e non si corregge**:
sporca l'archivio e ogni misura che ci sta sopra.
⚠️ **ESPN non riscrive mai quello che c'è**: tutti gli aggiornamenti passano da
`coalesce`, quindi riempie i buchi (possesso, tiri) e lascia stare il
risultato di football-data.

**I nomi**: ESPN espone cinque nomi per squadra (`displayName`,
`shortDisplayName`, `name`, `location`, `abbreviation`) e `shortDisplayName` è
praticamente lo stile di football-data — "Manchester City" → **"Man City"**.
Misurato: **18 su 20** si agganciano da soli, in Premier come in Serie A. Le
eccezioni stanno in `lib/nomi-espn.js`, **scritte a mano**: in Serie A sono
`AS Roma → Roma` e `Internazionale → Inter`.
⚠️⚠️ **Non si aggiungono alias con un automatismo di somiglianza**: il 5/10 un
abbinamento automatico mise il **PSG sul Paris FC**.
⚠️⚠️ **I nomi si leggono dalla partita, non dalla rosa del campionato.**
Chiedendo `/teams` si conoscono solo le squadre di quest'anno, e tutto lo
storico diventa "nome sconosciuto": provando il recupero del 2024, Empoli e
Hellas Verona — oggi fuori dalla Serie A — risultavano sconosciute. Con i nomi
presi dall'evento: **70 partite su 70 agganciate, zero dubbie**.

⚠️ **Si va piano di proposito**: `PAUSA_MS = 350` fra le chiamate. Non c'è un
limite dichiarato, e proprio per questo non si corre — una fonte non
documentata si tiene buona.
⚠️ **La data di ESPN è UTC**; per gli orari europei non cambia giorno, ma la
finestra di ±1 copre le partite spostate di poche ore. Il filtro vero sono le
due squadre.
⚠️ `prossime_partite` **non ha** la colonna `stagione` (ha un `fonte`, ma lì
vuol dire "da quale book vengono le quote"): si ricava dalla data, da luglio in
poi è l'anno nuovo. La stessa regola vive **due volte** — in JS nello script e
in SQL in `decidi_importazione()` — e dà gli stessi valori sulle date provate.

**Le decisioni passano da `decidi_importazione()`** (`sql/27`, `security
definer` col controllo admin dentro) e non da due scritture dal browser:
accettare tocca `partite` **e** `importazioni`, e le due devono riuscire o
fallire insieme.

### Il possesso palla: raccolto, non ancora usato

⚠️⚠️ **VPM non lo usa, e non va aggiunto senza misurarlo.** Al suo posto c'è
`dominio` (tiri in porta fatti / totali) per una ragione scritta: *il possesso
misura chi tiene la palla, il dominio chi fa male*. Adesso il dato c'è —
`partite.possesso_casa` / `possesso_trasf` — ma metterlo in un indice perché
"c'è" vuol dire tornare a pesare a sentimento. **Prima si misura se aggiunge
qualcosa, poi si decide.**
⚠️ **In avanti costa niente** (~100 partite a weekend), **all'indietro costa**:
una richiesta per partita, quindi ~34.000 per tutto l'archivio. Si fa un
campionato per volta. **Serie A per prima**, il 12/10/2026.

## Storico e calendario: due tabelle, due significati

| Tabella | Contiene | Quote | Si cancella? |
|---|---|---|---|
| `partite` | Partite **giocate**, con risultato | `b365_*` apertura, `bfe_ap_*` apertura, `bfe_ch_*` chiusura, `avg_*`/`max_*` **chiusura** | Mai |
| `prossime_partite` | Partite **da giocare**, senza risultato | tutte di **apertura**: `b365_*`, `bfe_ap_*`, `avg_ap_*`, `max_ap_*` | **Mai**: è la fotografia di cosa si vedeva prima |

Entrambe hanno `bfe_ap_valido`. `prossime_partite` ha `scaricato_il`: una quota
ha senso solo con l'istante in cui l'hai vista. L'app legge le future con
`where data >= current_date`.

⚠️ **L'ordine delle fonti della quota giocata, dal 12/10/2026: Bet365 → media
di mercato** (`valuta()` in `lib/attendibilita.js`). Bet365 è il book su cui
gioca Mattia; **Codere e la massima sono usciti**.
⚠️ **La massima è uscita perché non è ottenibile**: è il miglior prezzo fra 40
book, e usarla gonfiava resa e voto. La **media** invece è una buona stima di
quanto pagherebbe Bet365 — misurato su 11.344 partite, il rapporto Bet365/media
ha mediana **100,0%** sulle quote corte e 99,4-99,6% sul resto.
⚠️⚠️ **Ma con la media resa e voto non discriminano più, e a schermo si
spengono** (grigio, `quotaDaConsenso`). `resa = quota × attendibilità`, e
l'attendibilità viene **già dalla media**: la formula si semplifica in
`1/margine` — mediana **93,8%**, da 86% a 100,6% — quindi dice quanto margine
ha preso il book su quella partita, non quanto conviene giocarla. **Non è un
errore del calcolo, è la verità**: al prezzo medio di mercato non c'è vantaggio
da nessuna parte, per costruzione. La resa discrimina solo quando il prezzo che
prendi è **diverso** dal consenso.
⚠️ **Misurato il 12/10 su 10 partite: Bet365 e Codere si equivalgono** (scarto
medio di resa **−0,17 punti**, meglio su 4 e peggio su 5). **Il guadagno di
questo cambio non è in punti, è in verità**: prima resa e voto si calcolavano
su un prezzo di un book che Mattia non usa. ⚠️ Non confondere con l'altro
numero: i **2,8 punti** misurati il 10/10 erano Codere contro la **massima di
mercato**, che è il miglior prezzo fra 40 book e **non è ottenibile**.
⚠️ **Bet365 copre solo il blocco imminente** (football-data): il 12/10 erano
**11 future su 76**, il resto cadeva sulla media. L'etichetta della colonna
QUOTA mostra sempre la fonte (`BET365` · `MEDIA`), e con `MEDIA` resa e voto
sono grigi: vuol dire "questo numero non è confrontabile con gli altri".

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

### La spunta "GIOCATA": compilare non è giocare

**Aggiunta il 12/10/2026, su richiesta di Mattia.** Sotto l'elenco della
griglia, nella pagina Slot, c'è una spunta **GIOCATA** per ogni spin
(`griglia.giocate`, `sql/25`, un array di quattro booleani con un `check` che
ne impone la forma).

⚠️⚠️ **È l'unica cosa che fa partire i conti della Dashboard.** Prima bastava
che **una casella avesse una squadra**: si cominciava a compilare la griglia e
la Dashboard mostrava già soldi investiti, come se fossero stati messi al
banco. *"Se si mette la spunta allora la dashboard inizia a contare, se non ci
sono spunte deve rimanere a 0."*
⚠️ **Non si può dedurre dalla griglia**, e non si deve provare: compilare e
giocare sono due momenti diversi, la griglia resta modificabile anche dopo, e
l'unico che sa se la schedina è andata al banco è chi ce l'ha portata.
⚠️ La Dashboard chiede **due** condizioni: la spunta **e** almeno una casella
piena. La seconda tiene fuori una spin spuntata e vuota, che mostrerebbe
investito senza partite — nella Slot la stessa situazione dà un avviso in ambra,
**non un blocco**: può capitare di spuntare prima di finire.
⚠️ **I due vuoti della Dashboard sono distinti**, perché si risolvono in modi
opposti: *"nessuna partita inserita"* manda nella Slot a compilare, *"3 spin
compilate ma nessuna segnata come giocata"* manda a spuntare. Confonderli manda
la persona a fare la cosa sbagliata.
⚠️ La spunta la toccano **solo gli admin** (come la griglia, stessa policy) ma
**la vedono tutti**: a un utente normale serve sapere se quello che legge in
Dashboard è già giocato o è una bozza. ⚠️ Si salva **subito**, senza il ritardo
di 800 ms delle caselle, e **se la scrittura non passa torna indietro**: RLS
blocca in silenzio, e una spunta accesa solo sul proprio schermo è una bugia.

## Il modello dei dati delle spin

**Le spin 1, 2 e 3 sono agganciate alle partite vere** (23/09/2026): ogni
casella porta `prossima_id`, scelto dal menu con ricerca sul calendario
(`components/SceltaPartita.jsx`) o scritto dalla compilazione automatica
(`lib/spin.js`). Resta tutto modificabile a mano: pronostico, quota, data,
risultato. **La quarta spin si chiama "Fun" ed è libera**, con i due campi di
testo di sempre — `SPIN_LIBERA = 3` in `SlotPage.jsx`.

Restano due limiti noti dello schema, da affrontare quando daranno fastidio:

1. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra.
2. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non c'è storico delle spin passate.

Auth, RLS, tema e script si tengono — non c'entrano con il problema.

---

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
  (`TABS_BASE`) **Dashboard · Partite · Slot · Spin**, cioè il giro
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
  `hooks/usaClassifiche.js`, che le chiede **una volta per sessione**: nel tondo
  accanto a ogni squadra c'è la sua posizione, colorata **a terzi** del
  campionato (`fasciaDi`) — non a soglie fisse, perché si va da 12 squadre a 24.
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
- **I filtri della lista** (`PartitePage`) stanno dietro un tasto `⚙ filtri`,
  con le **targhette di quelli accesi** fuori (si tolgono toccandole) e il
  conto `visibili/totali`. Rifatti così il 2/10/2026 perché in fila non si
  capivano: una pagina con più di tre filtri li mette in un pannello, non in
  riga.
- **Pezzi ricorrenti** in `src/components/ui.jsx`: `Card`, `Etichetta`,
  `StatCard`, `Btn`, `Input`, `Badge`. Prima di riscrivere una card a mano,
  guarda se c'è già.
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

---

## Trappole già incontrate

- **`onAuthStateChange` non sopporta query al database dentro il callback.**
  supabase-js tiene un lock mentre lo esegue: una `supabase.from()` lì dentro
  blocca la login stessa. Si rimanda con `setTimeout(…, 0)`.
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

cd btscout && npm install
node --env-file=.env scripts/verifica-storico.js   # coerenza dell'archivio (settimanale)
node --env-file=.env scripts/audit-archivio.js     # controllo completo (dopo ogni campionato nuovo)
node --env-file=.env scripts/aggiorna.js --esegui                   # LA ROUTINE: martedì e venerdì dopo le 18
node --env-file=.env scripts/importa-espn.js --campionati=I1 --giorni=30 --esegui   # la seconda fonte: risultati e possesso
node --env-file=.env scripts/controlla-dati.js     # cosa è passato in silenzio (gira già dentro aggiorna.js)
#   = import-storico --stagioni=2627 → riconcilia-prossime → importa-prossime
node --env-file=.env scripts/prova-vpm.js           # VPM sul weekend: dove campo e mercato litigano
node --env-file=.env scripts/prova-ordine.js        # i tre ordini della lista, casi limite compresi
node --env-file=.env scripts/prova-scheda.js --squadra=Lens   # il blocco VPM della scheda, e l'identità dei pesi
node --env-file=.env scripts/schedina-weekend.js --quota=5    # la schedina del weekend dalle partite vere
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
