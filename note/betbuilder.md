# 🎟️ BET BUILDER — le schedine a quota obiettivo

> Nato il 22/10/2026 da una richiesta di Mattia, e con un tono dichiarato:
> ***"questa funzione deve essere più fanny che profittevole"*** — quindi nella
> pagina non ci sono prediche sul valore atteso. La frase onesta sta scritta
> **una volta sola**, in piccolo, in fondo.

**Cosa fa**: scegli i filtri e la quota che vuoi raggiungere, lui compone la
schedina con le migliori partite finché il prodotto arriva a quella quota. Ne
puoi fare più d'una: **le partite già usate escono dalle candidate**, così non
si gioca due volte la stessa.

⚠️⚠️ **Non compone niente da sé: usa `componiPasso` di `lib/scalata.js`**, la
stessa funzione dei passi della scalata. *Un passo* e *una schedina a quota
obiettivo* **sono la stessa cosa** — gambe prese dalle migliori finché il
prodotto arriva alla quota — e scriverne due sarebbe il difetto di famiglia di
questo progetto. La funzione ha preso un parametro **`ordina`**: la scalata usa
l'attendibilità (il miglior selettore misurato), il Builder lascia scegliere
**schedina per schedina** fra voto · attendibilità · scelta · VPM, e il
criterio finisce nel registro — così fra due mesi si potrà dire quale
sceglieva meglio.
⚠️ **Si ferma appena SUPERA la quota**, non appena ha abbastanza gambe: ogni
gamba moltiplica il margine del book, quindi la schedina giusta è la **più
corta** che arriva dove vuoi.

## I dati — `sql/36` e `sql/37`

`schedine` + `schedina_gambe`. ⚠️⚠️ **Sono PRIVATE** (richiesta esplicita:
*"ogni utente ha il suo bet builder, nessuna condivisione"*), ed è l'opposto
della scalata, dove dal 22/10 la lettura è aperta a tutti: quella è la road map
del weekend del gruppo, questa è il foglio di una persona. Verificato
simulando le sessioni: **nemmeno un admin** vede le schedine di un altro, né
può crearne o cancellarne a nome d'altri. L'hook non filtra nemmeno per
`user_id` — lo fa il database.

⚠️ **Le gambe portano la fotografia** di `att · scelta · VPM` e della quota
giocata: senza, fra due mesi l'archivio direbbe solo *se* hai vinto, non
**perché l'avevi scelta**. È la stessa ragione delle gambe della scalata.

⚠️ `stato` è `bozza` o `giocata`, e **l'esito compare solo dopo «giocata»**:
una schedina che non è andata al banco non ha un esito da registrare — stessa
distinzione della spunta GIOCATA nella Slot, dove *compilare non è giocare*.
L'esito si **annulla** ritoccando il tasto acceso: un esito sbagliato e non
togliibile è un registro che mente.

⚠️ **L'esito sta sulla SCHEDINA, non sulle gambe**: una combinata è persa
appena cade una gamba, quindi un tocco solo basta. E la gamba non si perde —
ha `prossima_id`, quindi un giorno si potrà dire chi l'ha azzeccata
**leggendola dall'archivio**. ⚠️⚠️ Ma quel giorno la regola che decide *"questa
giocata è arrivata"* (segno, e per le combinate anche l'over 1,5) va
**spostata** da `btscout/lib/ricostruisci.js` a `app/src/lib/`, **non copiata**:
due versioni direbbero prima o poi cose diverse sulla stessa schedina.

⚠️ **L'importo è facoltativo e `null` non è zero**: vuoto vuol dire *non lo
dico*, e un saldo costruito su uno zero finto sarebbe falso. Si scrive già
sulla proposta, perché **la vincita possibile è il numero che fa decidere** se
quella quota vale la pena — chiederlo dopo aver salvato vorrebbe dire deciderlo
senza.

⚠️ `sql/37` aggiunge le colonne con **`alter table … add column if not
exists`** e non dentro la `create table` di `sql/36`: una colonna aggiunta lì
non comparirebbe mai, perché la migrazione rilanciata vede la tabella e salta
il blocco senza un errore. È già successo il 18/10 con `bankroll_finale`.

## A schermo

**Il tasto è in basso al posto di Slot** (che è scesa nel menu, sopra Spin): in
basso sta il **giro settimanale**, e la griglia si compila una volta a
settimana mentre una schedina si costruisce ogni volta che si gioca.
⚠️ Spostando una voce **va aggiornata la mappa di `guarda.mjs`**, o quella
pagina smette di essere fotografata in silenzio.

⚠️ **La proposta si vede PRIMA di salvarla**: un tasto che scrive nel registro
qualcosa che non hai visto lo riempie di schedine buttate.
⚠️ Il riepilogo conta **solo le giocate** e mostra il saldo **solo se gli
importi ci sono**. ⚠️ Il riassunto con le domande vere (quale criterio sceglie
meglio, quanto rende davvero) arriva **quando ci saranno dieci o venti
schedine**: prima direbbe rumore, ed è la stessa regola della scalata.

## I filtri nel registro, e le partite scartate (22/10/2026)

**`sql/38` aggiunge `filtri jsonb`** alla schedina: `criterio` dice *come* si
ordinavano le candidate, questi dicono **da quali partite si pescava**. Due
schedine «per voto» con filtri diversi sono **due esperimenti diversi**, e
senza questa colonna l'archivio non saprebbe distinguerli.

⚠️⚠️ **La `×` su una gamba della proposta SCARTA la partita, non toglie la
gamba** (*"non devono tornare nella selezione"*): esce dalle candidate, quindi
la schedina **si ricompone da sé** pescando la prossima migliore e resta alla
quota chiesta. Verificato sui dati veri: scartando la prima gamba la schedina
passa da 5,45 a 5,69, sempre sei gambe, e la scartata non torna. **Due
richieste risolte con un gesto solo.**
⚠️ E si **rimettono** (*"rimettile"* accanto al conto): un gesto che toglie per
sempre e non si disfa è una trappola per il tocco sbagliato.

⚠️⚠️ **Le scartate vivono in `preferenze`, riga PERSONALE**, non in una tabella
nuova: è la tabella nata la mattina stessa per i filtri della scalata.
`usaPreferenze(ambito, { personale: true })` esiste **per questo** — senza quel
flag un admin scriverebbe la **riga condivisa**, e le sue partite scartate le
vedrebbe il gruppo: l'opposto di quello che è stato chiesto per il Builder.

## ⚠️⚠️ Una schedina salvata NON si tocca mai più da sola

Le gambe sono una **copia**, non un collegamento: squadre, giocata, quota e i
numeri di quel giorno stanno in `schedina_gambe`. Quindi quando l'importazione
aggiorna il calendario, o quando le partite si giocano e **escono** da
`prossime_partite`, **la schedina resta identica** — si vede ancora
*Venezia – Inter @1,30* con l'attendibilità che aveva il venerdì.
È la condizione perché il registro valga qualcosa: una riga che cambia da sola
non è una prova.

**L'unica cosa che la cambia sei tu**: ⚠️ **la quota di ogni gamba è
modificabile dopo il salvataggio** (Mattia, 22/10: *"la quota potrebbe essere
diversa dalla media trovata da noi"*). La nostra viene da Bet365 o dalla media
di mercato, lui gioca su altri book e con i bonus — e siccome qui c'è
l'**importo**, una quota sbagliata sarebbe una **vincita sbagliata**. Verificato:
correggendo una gamba da 1,30 a 1,55 la schedina passa da 1,82 a 2,17 e la
vincita da 18,20 a 21,70 €; una quota sotto 1 la respinge il vincolo del
database.
⚠️ E `prossime_partite` **non si tocca**: resta la fotografia di cosa si vedeva
prima, e lo scarto fra le due quote è un dato, non un errore.

## 📁 L'archivio, e i dieci secondi (22/10/2026, sera)

Mattia: *"non possiamo tenerle tutte in lista"*, e poi **"dopo 10 secondi che
metto l'esito deve andare in archivio"**. Interruttore `ATTIVE | ARCHIVIO`,
coi conteggi sui due tasti.

⚠️⚠️ **Il criterio è lo STATO, non il tempo** — è il motivo per cui NON è
*"dopo tot giorni non si vedono più"*: una schedina **chiusa** non ha più
niente da fare, una **aperta** ne ha anche dopo un mese. I dieci secondi non
sono una scadenza: sono il tempo per accorgersi di un tocco sbagliato, perché
una card che sparisce nell'istante in cui la tocchi non lascia modo di
rimediare. Nel frattempo la card scrive *"va in archivio tra 7s · ritocca
vinta per annullare"* — ⚠️ **una cosa che sparisce da sola e non lo dice
sembra un dato perso**.

⚠️ `archiviata()` guarda `esito` **e** `chiusa_il`: annullando l'esito la
riga risale fra le attive **da sé**, senza niente da disfare.
⚠️ Il battito di un secondo gira **solo** finché c'è una schedina dentro la
finestra, poi si spegne. Un `setInterval` sempre acceso ridisegnerebbe la
pagina ogni secondo per niente.
⚠️ Il numero è la posizione nel registro **intero**: la «SCHEDINA 7» resta la
7 anche con le prime sei in archivio, o due schedine porterebbero lo stesso
nome. E **COME STANNO ANDANDO conta tutto**, archivio compreso: è lo scopo per
cui si tracciano.

## I filtri che restano, e il «fino a lunedì»

⚠️⚠️ **Si salvano da sé, senza tasto**, ed è l'opposto della scalata: lì la
riga di `preferenze` è **condivisa** fra sei admin e il tasto serve a dire
*"questo vale per tutti"*; qui è **personale**, quindi muovere una manopola
riguarda solo te. Si scrive un attimo dopo l'ultimo tocco, perché
`TastoRipeti` tiene il passo del dito e salvare a ogni scatto sarebbe una
scrittura per unità.
⚠️ **Chi apre e non tocca niente non scrive niente**: `partenza` tiene i valori
con cui la pagina è partita, e senza quel confronto il primo caricamento
salverebbe i valori di fabbrica — una riga nel database per un gesto mai fatto.

**«fino a lunedì»** è `lunediProssimo(0)`: lo stesso confine che raggruppa le
giornate nelle spin e che la pagina Partite chiama con quel nome, lunedì
compreso. ⚠️ Due tasti (`tutte` · `fino a lunedì`) e non un interruttore:
*"tutte"* è una scelta anche quella, e un bottone solo acceso o spento non dice
cosa fa da spento.

## ＋ aggiungi partita (22/10/2026, sera)

⚠️ **La stessa finestra di Road to weekend** (`ScegliGamba`), coi suoi filtri
⚑ e ★ e la ricerca a testo libero — con due parametri in più (`dove`,
`prefisso`) invece di una gemella: là la targhetta è `P3` (passo), qui `S3`
(schedina). Offre **tutto il calendario**, anche sotto le soglie: i filtri
compongono, questa è la scorciatoia per la partita che i filtri non prendono.

⚠️⚠️ **Le aggiunte a mano sono FISSE e il resto si compone intorno**: la parte
automatica punta a `obiettivo ÷ quota delle aggiunte`. Appiccicarle in fondo
avrebbe dato quota 9 a chi ne ha chieste 5 — e la quota è il senso della
pagina. Con una gamba a mano da 1,80 dentro una schedina da 5, l'automatico
arriva a 2,78.
⚠️ Si tengono gli **id**, non le righe: una riga copiata lì invecchierebbe
appena arriva una quota nuova.
⚠️ **La × su una gamba a mano la TOGLIE, non la scarta**: scartarla la
butterebbe fuori anche dalle candidate, cioè il contrario del gesto appena
fatto. E le aggiunte si svuotano col salvataggio, o finirebbero anche nella
schedina dopo.
⚠️ Il tasto c'è **anche quando non c'è nessuna proposta**: se i filtri non
lasciano passare niente, la via a mano è l'unica che resta.

## Quello che resta da fare

- **L'esito automatico** dall'archivio, col vincolo scritto sopra.
