# ROAD TO WEEKEND — la scalata madre

> Il metodo a pavimenti, le casse, il registro, e tutte le decisioni prese costruendo la pagina.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

## ROAD TO WEEKEND — la scalata a recupero (15 ottobre 2026)

Nel menu ☰ (🪜), solo admin. Tabelle sue — `scalate`, `scalata_passi`,
`scalata_gambe` (`sql/30`) — perché i passi **non vanno in `giornate`**: con un
numero solo a fine stagione non si saprebbe se l'ha prodotto la scalata o le
spin del gruppo.

**Le tre casse**, come le ha definite Mattia: **bankroll** (le sue unità, la
posta è il 10% per difetto) · **cassa da gioco** (nasce con quel 10% e cresce
coi passi vinti) · **accumulo** (quello che si mette via, più il resto
dell'arrotondamento; a fine scalata rientra nel bankroll come **movimento**,
perché il bankroll resta calcolato — regola 1).

⚠️⚠️ **È uno strumento di pianificazione, non un ottimizzatore**, e la
differenza è una richiesta esplicita: *"lo scopo è avere una road map precisa
delle giocate del weekend, possibilità di modificare la quota, e accumulare
quanto voglio con un consiglio da parte dell'app"*. Quindi:
- **la quota di ogni gamba è modificabile** — book diversi e bonus, e una
  pagina che mostra la quota del consenso racconterebbe un piano che non è il
  suo. La quota della schedina è il **prodotto delle quote modificate**;
- **la percentuale da mettere via è un consiglio**, con un campo che decide
  lui. Il consiglio resta scritto accanto anche quando lo si scavalca: è
  l'unico modo di sapere *da cosa* ti stai scostando;
- **nessuno stop automatico in nessun passo** — si ferma solo col tasto.

**La percentuale si applica all'UTILE, non al montante** (scelta di Mattia,
15/10/2026: *"vorrei mettere via la % dell'utile non dell'intero"*), e non è
cosmetica — **cambia la natura della cosa**:
- al **100%** si rigioca sempre **la stessa puntata** e si intasca la vincita,
  quindi dopo un passo vinto il caso peggiore è `puntata − utile`: con quota
  1,88 sono **−1,2** invece di −10. È il "recupero aggressivo" che Mattia
  cercava, fatto meglio di come l'aveva chiesto;
- al **0%** tutto resta in gioco e la scalata compone.
⚠️⚠️ **Ma sull'utile la puntata intera NON si può mettere al sicuro in un
passo**: sotto quota 2,00 l'utile è meno della puntata, quindi il 100% è il
massimo possibile e il capitale resta in gioco. Il guadagno non è "zero
rischio", è **rischio ridotto a (puntata − utile)**.
⚠️ Prima la percentuale era sul **montante** e `capitale` metteva via
esattamente la posta: con quota 1,88 erano il 53%, e il 40% che Mattia aveva
proposto **non bastava** (serviva un secondo passo, che arriva il 27% delle
volte). Quella correzione resta valida nel merito — *mettere via poco al primo
passo non rientra* — ed è il motivo per cui il consiglio al primo passo è il
massimo possibile.

### ⚠️⚠️ IL METODO È UNO SOLO: la Scalata madre (21/10/2026)

**Le due regole di incasso sono uscite** (`capitale` e `gioco`, Mattia:
*"abbiamo definito il nostro metodo"*). Servivano a **misurare** quale
conviene, e la misura ha risposto — sull'utile, mediana 81 contro 42 su 100.
Un tasto che offre ancora la regola bocciata è un modo di giocarla per sbaglio.

**Al loro posto i PAVIMENTI** (`PAVIMENTI` in `lib/scalata.js`): l'accumulo
**cumulativo** da raggiungere dopo ogni passo, in multipli della posta
iniziale — **0,7× · 1,3× · 2,8×**, poi tutto l'utile. Su posta 10 e quota 2,00
fanno 7 · 13 · 28, cioè netto **−3 · +3 · +18**.
⚠️⚠️ **Sono un traguardo, non una frazione**, e la differenza è il vincolo che
ha dato Mattia: *"in 2 giornate DEVO recuperare il capitale iniziale"*. 1,3×
dopo il secondo passo **è** quel vincolo; un 46% a quota diversa non lo
sarebbe. Sopra 2,00 si mette via lo stesso e la scalata cresce di più — il
verso giusto, perché una quota più alta non deve far accantonare di più.
⚠️ Il consiglio si calcola **da quanto manca** al pavimento, non da una
percentuale fissa: se un passo ha messo via più del dovuto (i centesimi
dell'arrotondamento, o una scelta a mano), il passo dopo mette via meno.

⚠️⚠️ **La quota minima della SCHEDINA è 2,00 "a salire"**
(`QUOTA_MINIMA_SCHEDINA`), e non è un numero tondo di comodo: **è quello che fa
stare in piedi il metodo**. A 1,90 i due vincoli di Mattia — *stesso piano di
rientro in percentuale* e *capitale rientrato in due giornate* — si
contraddicono; a 2,00 coincidono, perché l'utile è pari alla puntata.
⚠️ **Non è più una manopola nei filtri**: il minimo è uno, e il posto dove
dirlo è la card del passo che non ci arriva — che scrive **quanto** manca, non
solo che manca.
⚠️ **La colonna `regola` del registro non si converte**: le scalate vecchie
restano `capitale`/`gioco` (`NOMI_REGOLA` le legge a schermo), perché quella
colonna è la fotografia di come si giocava allora. `sql/32` allarga il `check`.

⚠️⚠️ **E la schedina si chiude appena supera 2,00** (`spezzaAlMinimo`,
Mattia 21/10/2026). La fascia dice *quando* si gioca, non *quanto* ci sta
dentro: un sabato pieno ne metteva otto nello stesso passo, cioè una schedina a
quota 21. ⚠️ Conseguenza da sapere: dopo il taglio automatico **«spezza qui»
non compare quasi mai**, perché un pezzo minimo non si può dividere in due
pezzi che arrivino entrambi a 2,00 — riappare solo su un passo allungato a mano.
⚠️⚠️ **I passi restano uno per volta anche nel piano**, e questa riga ha già
avuto il suo contrario per un giorno: il 21/10 li avevo aperti tutti perché
*"lo spezza funziona solo sul passo 1"*, e Mattia il 22/10 li ha visti e
rifiutati — *"voglio tornare come prima"*. Ventidue card fino al 1° novembre
non sono una road map, sono una pagina da scorrere. **La regola regge in
entrambi i modi** e per la ragione di sempre: la puntata del passo 2 è la cassa
che arriva fin lì, quindi senza l'esito del 1 è un numero ipotetico.
⚠️ E la riga dei passi nascosti **non promette un passo che non arriverà**: con
la cassa a zero dice che la scalata si è fermata, non *"compare quando segni
l'esito del passo 3"*.

**I passi sono fasce** (`fasce()`): stesso giorno, orari entro **tre ore**
(`FINESTRA_ORE`). Tiene insieme il blocco delle 15 e quello delle 18, lascia il
20:45 al passo dopo — perché **un passo deve finire prima che cominci il
successivo**, o la scalata non è una scalata. Il raggruppamento è una proposta:
si togliono le partite a mano.
⚠️⚠️ **Spezzare un passo in due** (`spezzaPasso` in `usaScalate.js`,
`spezzaFasce` in `lib/scalata.js`, 21/10/2026): il taglio sta **fra due
gambe**, non sul passo — un tasto sul passo dovrebbe indovinare *dove*
tagliare, e con tre gambe non esiste una metà. ⚠️ A scalata aperta inserisce
una riga col **numero di mezzo** (3 e 4 → **3,5**), ed è il motivo di
`sql/31`: con `numero` intero e unico, inserire in mezzo voleva dire
rinumerare la coda un passo per volta. ⚠️⚠️ **E si offre solo dove i DUE pezzi
arrivano a 2,00** (`puoSpezzare`): offerto dappertutto proponeva di fabbricare
una schedina a 1,30, che non è un passo di questa scalata — trovato da Mattia
il 21/10, il giorno dopo averlo fatto.

⚠️ **Dal 22/10/2026 la quota della gamba è il QUARTO FILTRO** della card
SELEZIONE, accanto ad attendibilità, scelta e VPM: sceglie *quali partite*
entrano in scaletta, e `QUOTA_MINIMA_GAMBA` è solo il suo valore di partenza.
Da non confondere con `QUOTA_MINIMA_SCHEDINA` (2,00, fissa): per questo a
schermo si chiama **«quota gamba ≥»** e non «quota».

⚠️ **Il pavimento di quota per gamba è 1,30** (`QUOTA_MINIMA_GAMBA`) e non è
prudenza: dentro `att ≥ 67%`, sotto 1,20 la resa è **88,5%**, fra 1,20 e 1,30 il
**95,1%**, fra 1,30 e 1,45 il **99,0%**. **Le azzeccate salgono scendendo di
quota e la resa crolla**, quindi una scalata che pesca "le più sicure" va a
prendere proprio le peggiori.

### L'archivio: il registro, che è il motivo per cui la pagina salva

**Un interruttore in cima — `PIANO | ARCHIVIO`** — e non una voce di menu: il
menu è per le pagine, questa è un'altra vista della stessa cosa.

```
aperta  →  ▶ APRI SCALATA   congela il piano (le quote TUE) e crea il record
        →  segni gli esiti   ogni esito scrive la fotografia del passo
        →  ⏹ STOP           consolida nel capitale, congela le casse, chiude
```

⚠️⚠️ **Ogni gamba porta con sé `att · scelta · VPM` come erano quel giorno e la
quota DAVVERO giocata.** Senza quei quattro numeri l'archivio direbbe solo se
hai vinto; con quelli dice **perché l'avevi scelta** — ed è l'unica cosa che si
può confrontare con la selezione meccanica. **È la disputa aperta**: il
backtest dice 98%, Mattia pensa di fare meglio a mano, e solo queste righe
possono deciderlo.

⚠️ **Due sorgenti, un componente solo**: senza scalata aperta i passi sono le
fasce composte dal vivo, con una aperta sono le righe salvate. Lo stesso
`Passo` disegna entrambe perché le gambe hanno **la stessa forma** — se fossero
due componenti, prima o poi mostrerebbero due cose diverse.
⚠️⚠️ **E si modificano nei due casi allo stesso modo** (Mattia, 18/10:
*"il comportamento delle card Passo quando clicco apri scalata deve essere
identico a quello che accade quando la scalata non è aperta"*). Un ramo in più
per lo stesso gesto **divergeva**, e l'ha fatto subito: il tasto `+` a scalata
aperta cercava le candidate *"ancora libere"*, e libere non ce n'è mai nessuna
perché aprendo la scalata ogni candidata finisce in un passo — cioè **lo stesso
difetto che Mattia aveva già trovato nella versione dal vivo, rientrato dalla
finestra**. Ora il `+` fa una cosa sola: tira su la prima gamba dei passi
successivi.
⚠️ A scalata aperta è uno **spostamento** (`spostaGamba`), non una copia: senza
il togliere, la stessa partita starebbe in due schedine e la quota di entrambe
sarebbe quella di un piano che non esiste. E **non ruba a un passo già
giocato**: quello che è accaduto non si tocca.

⚠️⚠️ **LE CASSE SONO DERIVATE, SEMPRE** — `casseDi()` cammina sulla catena dei
passi. **Questa riga ha sostituito il suo contrario**: fino al 18/10
`scalate.cassa` e `scalate.accumulo` si aggiornavano a ogni esito, quindi ogni
modifica successiva avrebbe dovuto *disfare* l'aggiornamento di prima — e per
non sbagliare avevo **vietato le modifiche**. Mattia: *"tutto troppo
vincolante"*. **La cura non era togliere i divieti, era togliere il secondo
numero**: senza niente da disfare non c'è niente da vietare.
⚠️ **Ma alla chiusura si congelano**, una volta sola (`chiudi(bankrollFinale,
{ cassa, accumulo })`): una scalata chiusa non si ricalcola più, e senza quel
passaggio l'archivio dichiarava *"100 → 131 · accumulo € 0,00"* — un guadagno
senza nessun posto da cui fosse arrivato. L'unica scalata chiusa prima di quella
correzione era un collaudo e Mattia l'ha azzerata il 19/10, quindi **in archivio
non ce n'è nessuna con accumulo zero**: la card lo omette comunque quando è
zero, perché una cifra mancante si nota e una cifra falsa no.
⚠️ **La puntata di ogni passo è la cassa che arriva fin lì**, ricalcolata dalla
stessa catena: quella salvata al momento del piano non sa quale percentuale
scegliererai.

⚠️⚠️ **I passi si scoprono uno per volta** (Mattia, 18/10: *"passo 2 deve
comparire solo una volta dato l'esito di passo 1"*), e non è ordine estetico:
**la puntata del passo 2 non esiste** finché il passo 1 non ha un esito.
Mostrarla vorrebbe dire mostrare un numero inventato. La frontiera è il
**primo passo senza esito**, non quanti ne hanno uno — se il 2 è segnato e l'1
no, la catena è ferma all'1 — quindi annullare un esito **richiude** il passo
dopo. ⚠️ E i passi nascosti **dicono di esserci** (*"altri 2 passi in
programma"*): sono già nel piano salvato, e una pagina che li omette in silenzio
sembra averli persi.

⚠️⚠️ **Il numero del passo è la sua POSIZIONE NELLA CATENA, non la colonna
`numero`.** Svuotando un passo la riga si cancella (una schedina senza partite
non è una schedina), quindi i numeri salvati **hanno dei buchi**: nel primo
registro vero di Mattia sono 1, 3, 4, 5… Con il numero della colonna il
consiglio scritto nella card e quello applicato dalle casse erano **due numeri
diversi** — al primo passo della catena *"tutto l'utile"* contro *"il 70%"* —
perché `casseDi` conta le posizioni e la card leggeva la colonna.

#### ⚠️⚠️ Il costo di questa pagina sono i GIRI, non i dati

**Tagliando del 18/10/2026, chiesto da Mattia**: *"quando apro scalata o
aggiungo una partita a un passo ci mette davvero tanto"*. Aveva ragione, e la
causa non era in nessun calcolo: una scalata ha quattro passi e una decina di
gambe, cioè niente. Erano **le andate e ritorno**, e ognuna costa 150-300 ms su
una connessione di casa.

| gesto | prima | adesso |
|---|---|---|
| aprire una scalata (4 passi) | **12 richieste** | 5 |
| aggiungere una gamba | 6 | 3 |
| il `+` (spostare una gamba) | **12** | 3 |
| rileggere il registro | 3 | 2 |

Le quattro cure, tutte della stessa famiglia — *conta le richieste, non i
kilobyte*:
- **le gambe arrivano annidate nei passi** (`select('*, scalata_gambe(*)')`),
  che PostgREST risolve seguendo la chiave esterna, invece di una seconda
  richiesta `in(passo_id, …)`. ⚠️ L'ordine delle righe annidate si rifà **in
  JS**: il nome dell'opzione per ordinarle è cambiato fra le versioni di
  supabase-js, e un ordinamento che non viene applicato non dà errore. ⚠️ E le
  chiavi degli oggetti annidati **tornano in un altro ordine** — verificato che
  il contenuto sia identico riga per riga, non con un `JSON.stringify`;
- **tutti i passi in una scrittura, tutte le gambe in un'altra** invece di due
  per passo. ⚠️ Gli id si riagganciano **per `numero`, non per posizione**:
  `insert` non promette di restituire le righe nell'ordine in cui le hai
  mandate, e un piano con le gambe sul passo sbagliato è un registro che mente
  senza dare errore;
- **la quota del passo si ricalcola dalle gambe che l'hook ha già in mano**, non
  rileggendole: erano nello stato, perché sono le stesse che la pagina sta
  disegnando;
- **le scritture indipendenti partono insieme** (`Promise.all`). ⚠️ Attenzione:
  supabase-js **non lancia**, ogni risposta porta il suo `error` — non guardarli
  tutti vuol dire scrivere a metà e dire che è andata bene (`primoErrore()`).

⚠️ **E `occupato` serve a schermo**: un tasto che per mezzo secondo non dice
niente sembra rotto, e invita a premerlo due volte — cioè a provare ad aprire
due scalate sullo stesso capitale. APRI SCALATA si disabilita e scrive *"salvo
il piano…"*.
⚠️ **L'altra lentezza era nei filtri**: `valutaPartita()` girava **due volte**
per partita — una per le candidate e una per l'imbuto — **e a ogni tocco di una
soglia**, perché `attMin` e compagnia stavano fra le dipendenze del `useMemo`.
Circa 400 valutazioni di VPM per ogni scatto del `+`. Ora si valuta una volta
sola (`valutate`, dipende solo da partite e dati) e si filtra sopra.
⚠️ **Il tasto del bankroll si tiene premuto e muove 1 €** (`TastoRipeti`, salito
in `components/ui.jsx` perché ora lo usano Andamento e la scalata): a 10 € per
tocco il bankroll si poteva solo approssimare, **e la puntata è il suo 10%** —
cioè il passo del bankroll decide il passo della puntata.

#### ⚠️ Riparti da 0 — l'unica cosa irreversibile della pagina

In fondo all'**archivio** (Mattia, 18/10: *"deve cancellare lo storico e farmi
ripartire da capo, come se partissi quel giorno per la prima volta"*). Cancella
le righe di `scalate` dell'utente, **anche quella aperta**; passi e gambe
seguono con la `on delete cascade`, e il capitale torna a `CAPITALE_INIZIALE`
da sé perché non c'è più nessun `bankroll_finale` da cui ripartire.
⚠️ **La conferma è il tasto stesso**: il primo tocco lo arma e scrive **quante**
scalate sta per cancellare, il secondo esegue, e dopo cinque secondi si disarma.
Un `confirm()` del browser si accetta senza leggerlo, e il numero di scalate è
l'unica cosa che fa capire *cosa* si sta buttando. Un tasto rosso che resta
armato in fondo alla pagina è una trappola per il tocco successivo.

**Le decisioni di Mattia (18/10/2026), tutte già dentro:**
| | |
|---|---|
| capitale | **dedicato**, vive nelle tabelle della scalata — il conto del gruppo non si muove. Quando lo si vorrà reale, l'accumulo rientra come **movimento** (regola 1) |
| il record nasce | con un **tasto**, non da solo: il salvataggio automatico riempirebbe l'archivio di bozze |
| quante aperte | **una alla volta** — `apri()` rifiuta la seconda |
| correzioni | **nessuna** su una scalata chiusa: non esiste una funzione che la modifichi, ed è voluto. L'unica via è `↺ riparti da 0`, che cancella **tutto** |
| scalate dimenticate | restano aperte: *"rimane lì ferma a livello di denaro, le partite si azzerano"*. Il `↻ nuovo piano` butta i passi non giocati e **lascia le casse dove sono** |
| chi la vede | **solo admin, nella POLICY** e non nel JSX: `soloAdmin` nasconde il tasto, non protegge la tabella |

⚠️ Il capitale della prossima si legge da **`bankroll_finale`**, scritto una
volta sola alla chiusura: ricostruire la catena sommando i risultati di tutte
le scalate è una somma che basta un record saltato a sfalsare.
⚠️ **Il riepilogo con le tre domande** (quanto in accumulo · quante hanno
rientrato la puntata · le gambe a mano hanno reso più del 98%) arriva **quando
ci saranno dieci o venti scalate**: prima direbbe rumore.

### Le tre casse a schermo, e lo stop che consolida

**La card delle casse** sta **in cima**, col bordo e il fondo accesi d'oro
(scelta di Mattia): è il conto, e un conto in mezzo alla pagina si legge **dopo**
le partite, cioè dopo aver già deciso. Mostra `IN GIOCO · ACCUMULO · BANKROLL
LIVE`, e sotto il **bankroll iniziale** con i suoi tasti più la **prossima
puntata**.
⚠️ Il fondo è `linear-gradient(tinta,tinta), C.card`, non una tinta
semitrasparente da sola: quella si illuminerebbe su sfondo chiaro (trappola già
pagata nelle caselle della Slot).
⚠️ **Il bankroll iniziale sta lì e non fra i filtri** (richiesta di Mattia,
15/10): i filtri scelgono le partite, quello è un conto. Il valore che propone
è **quello vero del conto** (`users.bankroll`, calcolato — regola 1), e un `↺`
ci torna dopo averlo cambiato a mano: un esperimento che parte da un numero
inventato non dice niente sul conto che lo gioca.

⚠️⚠️ **Bankroll live** = `iniziale − puntata + accumulo + in gioco`. Verificato
sulla catena: appena aperta torna l'iniziale (−10 +0 +10), dopo un passo vinto
al 100% dell'utile fa 108,77, dopo due 117,54, e se il terzo perde scende a
105,54 — perché i 12 in gioco se ne vanno. È il numero che dice **quanto vale
il conto adesso**, non quanto si è messo via.

⚠️⚠️ **Lo stop CONSOLIDA, non azzera**: accumulo e cassa in gioco **rientrano
nel bankroll**, che diventa il live, e la puntata successiva è il 10% di quello.
Il tasto lo scrive nell'etichetta (*"porta € 17,54 nel bankroll e riparti"*).
Senza il consolidamento un tasto chiamato "incassa tutto" avrebbe **perso** i
soldi guadagnati, che è il contrario di quello che dice.
⚠️ E la frazione fissa si vede qui: se il primo passo perde il live va a 90 e la
prossima puntata diventa **9**. Il bankroll decade, non si azzera.

### ⚠️⚠️ Il "consigliato" deve dire su cosa si basa

Il 15/10 il tasto diceva **"consigliato 62 · 62"**, e il 62 era una proposta a
occhio di Mattia che io avevo trasformato in un tasto chiamandola *consigliata*.
Lui ha chiesto **"su cosa si basa?"** — e non si basava su niente.
⚠️ **Un'app che consiglia deve poter dire perché, o quella parola non va
scritta.** `CONSIGLIATO` in `lib/scalata.js` porta la misura con sé e il tasto
la mostra.

**Rimisurato il 22/10/2026** con `btscout/scripts/prova-soglie-scalata.js` —
che prima **non esisteva**: la tabella di ottobre era stata prodotta da un giro
non conservato, quindi spostando la soglia non si poteva più dire la verità sul
tasto. Lo script riproduce la riga del 58% (67,4% di azzeccate, resa 98,2%
contro 98,3%), quindi è la stessa misura.

| soglia | partite | a giornata | azzeccate | resa | weekend con 1 passo | con 2 |
|---|---|---|---|---|---|---|
| 58% | 5.395 | 3,3 | 67,4% | 98,2% ±1,8 | 85% | **79%** |
| **61%** | **3.915** | **2,4** | **70,2%** | **99,5% ±2,0** | **82%** | **74%** |
| 65% | 2.345 | 1,4 | 73,1% | 100,3% ±2,5 | 73% | 48% |
| 68% | 1.359 | 0,8 | 74,6% | 100,2% ±3,1 | **50%** | **13%** |

⚠️⚠️ **La colonna che decide è quella dei WEEKEND, non la resa**, ed è la
lezione del 22/10: Mattia aveva chiesto di passare al **68%**, dove la resa è
la più alta della tabella. Lì però **metà dei weekend non ha nemmeno un passo
componibile** e **due passi — il suo vincolo, *"in due giornate recupero il
capitale"* — si compongono nel 13% dei weekend** invece del 74%. La scalata non
gioca partite singole: gioca una **schedina da 2,00**, cioè due o tre gambe
nello stesso blocco. **Una soglia che azzecca di più e non lascia niente da
comporre è la resa di una giocata che non esiste.** E il guadagno non è
nemmeno dimostrabile: 100,2 ±3,1 contro 99,5 ±2,0, intervalli sovrapposti.
✅ Scelto **61%**: il punto più stretto che tiene in piedi il metodo.
⚠️ Per questo il tasto scrive **anche i weekend** (`CONSIGLIATO.weekend`): a
68% avrebbe detto *"resa 100,2% su 1.359 partite"*, la frase più bella della
tabella, tacendo la cosa che conta.
⚠️ **Fra 54% e 67% la resa non si distingue** e fuori da quel pianoro peggiora
da entrambe le parti: la soglia più stretta non è la migliore, ed è la terza
misura di questo progetto che lo dice.

⚠️⚠️ **E una stagione sola non può misurare la resa** (Mattia, 22/10: *"misura
sulla 25/26"*). A 61%, stagione per stagione: 97,3 · 101,9 · **103,5** · 98,3 ·
101,1 · 97,4 · **96,9** (25/26) · 95,0 — stesso filtro, stesso codice, **±5 su
ognuna**: 96,9 e 103,5 sono lo stesso numero misurato due volte, e tarare la
soglia sull'ultima stagione vorrebbe dire ritararla ogni anno inseguendo il
rumore. Quello che regge il 99,5% è che **4 stagioni su 8 stanno sopra il 100 e
la mediana è 99,7**.
⚠️ **Il MATERIALE invece si legge sulla stagione recente, e la 25/26
conferma**: 2,4 partite al giorno, 85% di weekend con un passo, 78% con due —
quante partite e quanti weekend giocabili dipendono da quanti campionati e
quante quote abbiamo, e *quello* cambia negli anni. La 26/27 non si legge: 7
weekend e 54 partite.
⚠️ Il tasto sta **in testa alla card SELEZIONE, a destra**: accanto ai tasti
del metodo sembrava una terza regola.

### 💾 Le preferenze salvate — gli admin vedono la stessa cosa (22/10/2026)

`preferenze` (`sql/35`) e `hooks/usaPreferenze.js`. Mattia: *"vorrei che gli
admin vedano tutti la stessa schermata; gli utenti invece devono essere liberi
di avere i loro filtri"*, e *"vorrei poter salvare i filtri selezione"*.

⚠️⚠️ **Una tabella sola, e la riga con `user_id` NULLO È quella degli admin.**
Due tabelle per la stessa cosa sarebbero due posti da tenere d'accordo. L'unicità
sta in **due indici parziali** (una riga condivisa per ambito, una personale per
persona): senza, due salvataggi quasi simultanei creerebbero due righe e la
lettura ne prenderebbe una a caso. ⚠️ Il `primary key` non può contenere un
NULL, ed è il motivo per cui l'unicità non è una chiave.
⚠️ **La catena di lettura è: la mia riga → quella degli admin → i valori di
fabbrica.** Chi non ha mai salvato eredita la selezione degli admin invece di
partire da zero; un **admin legge sempre la condivisa**, anche se per caso ha
una riga sua — è il senso di *"vediamo tutti la stessa schermata"*.
⚠️ `dati` è **jsonb e non quattro colonne**: i filtri cambiano (il 21/10 è
entrata «quota gamba»), e una migrazione per ogni manopola non è sostenibile. In
cambio **chi legge deve reggere una chiave che non c'è** — ogni valore ha il suo
predefinito e i numeri non finiti si scartano, che è la lezione del NaN delle
soglie di Andamento.
⚠️ **Si salva TUTTA la situazione**, non solo i filtri (richiesta di Mattia):
soglie · bankroll · partite tolte · aggiunte a mano · tagli · quote modificate ·
percentuali «metti via». ⚠️⚠️ E questo **sistema un difetto che c'era**: la
percentuale «metti via» era locale alla pagina **anche a scalata aperta**,
quindi due admin sullo stesso registro potevano vedere **casse diverse**.
⚠️ **Col tasto, non in automatico**: siete **sei account admin sulla stessa
riga**, e il salvataggio automatico riscriverebbe le soglie agli altri a ogni
tocco del `+`, mentre guardano. E la riga sotto dice **chi** ha salvato e
quando — con sei admin, una soglia cambiata da sola fra ieri e oggi è
illeggibile senza un nome accanto.
⚠️ **Non è in tempo reale, ed è una scelta confermata**: chi ha la pagina
aperta vede il salvataggio di un altro al prossimo caricamento.
⚠️ **Update e poi insert, non `upsert`**: gli indici sono **parziali** e
PostgREST non sa esprimere un `on conflict … where`. Un upsert senza il
bersaglio giusto creerebbe la seconda riga che gli indici esistono per
impedire. ⚠️ E *"zero righe toccate"* vuol dire **che non c'era**, non che è
fallita: RLS rifiuta in silenzio e una `update` a vuoto si comporta uguale.
⚠️ **Si applica UNA VOLTA SOLA**, al primo caricamento (`useRef`): senza il
guardiano, ogni ridisegno rimetterebbe i valori salvati sopra quelli che stai
muovendo — le manopole tornerebbero indietro da sole.

Verificato per ruolo, simulando le sessioni (ruolo `authenticated` +
`request.jwt.claims`) dentro una transazione annullata:

| | riga condivisa | la propria | per un altro | cosa legge |
|---|---|---|---|---|
| **admin** | ✅ scrive | ✅ | ✗ respinto | la condivisa (due admin diversi, stessa riga) |
| **utente** | ✗ respinto | ✅ | ✗ respinto | la propria, se non c'è la condivisa |

### ⚑ Le partite FLAGGATE — il segno della scalata (22/10/2026)

`flag_partite` (`sql/33`): **la stessa forma di `voti_partite`** — una riga per
admin per partita, chiave composta, tre policy, lettura aperta a chi è entrato
perché serve al contatore. Nell'hook `usaProssime` ci sono `flagga`, `flagDi`,
`mioFlag`, gemelli di `vota`, `votiDi`, `mioVoto`.

⚠️⚠️ **La differenza fra flag e stella è il SIGNIFICATO, non la forma**, ed è
voluta (*"così da non confondere con le stelle"*): la **stella** dice *questa
entra nella spin* e **scavalca la soglia** (`candidate()` in `lib/spin.js`); il
**flag** dice *questa mi piace per la scalata* e **non scavalca niente**. Il
motivo è misurabile: le soglie di Road to weekend alimentano anche il taglio
automatico delle schedine a 2,00, quindi una gamba corta entrata di straforo
abbasserebbe la qualità del passo **in silenzio**.
⚠️ **Non si uniscono in una funzione sola** con i voti: sono due tabelle e due
domande, e il giorno in cui una delle due cambia regola una funzione condivisa
diventerebbe un albero di `if`.
⚠️ **Flaggate e votate restano nell'elenco anche quando i filtri le tagliano**,
marcate `fuori filtri` in ambra — ma **non entrano nella scaletta**: un segno
che sparisce alzando una soglia è il difetto peggiore, e una gamba che entra
senza passare i filtri è l'altro.
⚠️ **I due segni stanno incolonnati a sinistra, staccati dal resto**: nella
riga il colore dice già *in quale passo sta* la partita, e un flag verde dentro
una riga verde (il passo 1) non si leggerebbe. **La bandiera si tocca, la
stella no** — la stella si mette nella pagina Partite e qui è informazione.
⚠️ `Icona.bandiera` è la seconda icona con `pieno`, dopo la stella, e per lo
stesso motivo: dice *mia / non mia*.

### «+ aggiungi partita manuale» e la pagina aperta a tutti (22/10/2026)

**Il tasto sta sotto quello della consigliata, dentro la card del passo**, con
un'aria diversa di proposito: quello sopra **accetta** la proposta dell'app e
dice quale partita sarebbe, questo **la scavalca** aprendo il calendario
intero. Lo stesso aspetto per entrambi direbbe che anche il secondo è
consigliato, e non è vero. ⚠️ C'è **anche quando non c'è niente da
consigliare**: è il caso in cui serve di più, la fascia è finita e il passo è
sotto quota.

La finestra è `components/ScegliGamba.jsx`: testo libero più i filtri **⚑
flaggate · ★ con stelle · tutte**, con la targhetta **`P3`** (= già nel passo
3) e le già prese in *questo* passo barrate e non cliccabili, in ordine di
**data e ora** (un passo è un
blocco di orari vicini: ordinando per bontà le partite giuste finirebbero
sparse fra quelle di un altro giorno).
⚠️ **Non riusa `ScegliCasella`**, che è la gemella delle spin: quella parla di
*caselle* — ruolo della posizione, categorie, *"già nella spin 2"*, *"svuota la
casella"*. Sono uguali solo a guardarle.
⚠️⚠️ **Nel piano le aggiunte a mano si cercano in `valutate`, non in
`candidate`**: da qui può arrivare una partita che i filtri non prendono, e
cercandola fra le candidate sparirebbe **in silenzio** — il tasto avrebbe fatto
finta di funzionare.

**La pagina è aperta a tutti, in sola lettura** (`sql/34`): `Weekend` non è più
`soloAdmin` e le tre `select` delle tabelle della scalata valgono per chiunque
abbia fatto login. Le scritture restano com'erano.
⚠️⚠️ **E `usaScalate` ha un secondo parametro, `tutte`**: con il filtro
`user_id` uno spettatore avrebbe letto **il proprio** registro, cioè niente —
pagina vuota e policy aperta inutile. Ogni admin continua a vedere **il suo**
(due admin con una scalata aperta sono due capitali diversi, e mescolarli
vorrebbe dire segnare un esito su quella di un altro); lo spettatore vede la
più recente, e non segna niente.
⚠️ Per chi guarda e basta i tasti **non ci sono**, né spenti: un tasto
disabilitato racconta una cosa che si potrebbe fare. Restano leggibili i campi
(`readOnly`, non `disabled`: `fantasma` è 2,27:1, un campo disabilitato qui
sparisce).
✅ **E le casse sono state nascoste il 22/10**, su richiesta di Mattia: la road
map del weekend è una cosa da condividere, **i soldi no**. La card del conto
(in gioco · accumulo · bankroll live · puntata) esiste solo per gli admin, e
**con lei l'interruttore PIANO | ARCHIVIO**: l'archivio è il registro dei
soldi — capitale, accumulo, quanto ha reso ogni scalata — quindi segue le
casse. Trovato da Mattia provando con un utente vero: in PIANO si comportava
bene, ma in cima leggeva *"ARCHIVIO 1"*.
⚠️ Sparisce **l'interruttore intero**, non il solo tasto: con una vista sola
non c'è niente da commutare. E la vista è legata a `isAdmin`
(`vista = isAdmin ? modo : 'piano'`), non alla sola assenza dei tasti — così è
vera per costruzione, e non per conseguenza del fatto che nessuno può premerli.
⚠️ La strada è stata **togliere la card**, non richiudere la lettura delle
tabelle: senza quelle righe la pagina tornerebbe vuota per tutti e gli
spettatori non vedrebbero più nemmeno i passi. L'archivio delle scalate chiuse
resta visibile.

### La scheda della partita si apre anche da qui (22/10/2026)

Toccando **i nomi** di una gamba — nel passo o nell'elenco in fondo — si apre
la **stessa** scheda della pagina Partite: `DettaglioPartita` dentro
`SchedaScorrevole`, non una versione ridotta. Un secondo posto per la stessa
cosa prima o poi diverge.
⚠️ **I nomi e non tutta la riga**: lì dentro ci sono già il campo della quota e
la × che toglie la gamba, e un contenitore cliccabile sopra di loro vuol dire
aprire un foglio a tutto schermo mentre si corregge una quota.
⚠️ **L'id da aprire è `prossima_id`** quando la gamba arriva dal registro: in
`scalata_gambe` la colonna `id` è la gamba, non la partita. E la scheda vuole
la **riga intera** di `prossime_partite` — la gamba salvata porta solo la
fotografia dei quattro numeri di quel giorno.

### La posizione in classifica dentro il passo

⚠️ **La posizione sta a destra di OGNI squadra**, inline e in corpo 8: così si
legge *"Nott'm Forest 15/20"* come una cosa sola. ⚠️ La prima versione le
metteva **incolonnate** in una colonna a parte, casa sopra e trasferta sotto —
e Mattia ha corretto: *"lo vorrei a destra della singola squadra"*. Due
targhette incolonnate costringono ad accoppiarle ai due nomi con l'occhio, ed è
un lavoro in più per la stessa informazione.
⚠️⚠️ **È la stessa `Posizione` della testata**, non una copia: formato `1/20`
colorato a terzi del campionato, solo rimpicciolito con uno `style`.
⚠️⚠️ **E quello `style` per due giri non ha fatto niente**: il componente non
aveva quella prop, quindi l'oggetto veniva ignorato **in silenzio** e la
targhetta restava a corpo 13 — due volte "ho rimpicciolito" senza cambiare un
pixel, finché Mattia non ha mandato lo schermo. ⚠️ **Un oggetto passato a una
prop che non esiste non dà errore**, e io avevo "verificato" con un conto
aritmetico sull'altezza invece di guardare la firma: il conto descriveva un
componente che non esisteva. ✅ Ora `Posizione` accetta `style` e lo sovrascrive
in fondo. **Quando una modifica di aspetto non si vede, il primo sospetto è che
non sia arrivata — non che sia troppo timida.** Un secondo
posto per la stessa cosa prima o poi diverge — è la ragione per cui
`TestataPartita` è condivisa fra lista e scheda.
⚠️ `flexWrap` sul blocco e `minWidth: 0` sui nomi: su un telefono le due coppie
vanno a capo invece di tagliare il nome, e senza `minWidth: 0` un elemento
flessibile non scende sotto il suo contenuto — la trappola della griglia della
Slot, terza volta.
⚠️ Serve perché dice **se il favorito è favorito per davvero o solo per la
quota**: `Nott'm Forest 15/20 — Arsenal 2/20` si legge in un colpo, `Cambuur
12/18 — AZ Alkmaar 3/18` anche.

### Il colore lega le due viste

⚠️ **Un colore per blocco** (`COLORI_PASSO`, dal verde: verde · giallo · rosso ·
blu, poi gli altri token del tema — mai valori scritti a mano): lo stesso verde
sta sul `● PASSO 1` e sulle sue righe nell'elenco spento in fondo. Senza quel
filo bisognerebbe confrontare gli orari per capire quale partita finisce in
quale passo. ⚠️ Chi non sta in nessun passo resta **grigio**, e si vede subito
che è materiale non usato; l'**esito vince sul colore del blocco**, perché a
piano finito conta com'è andata.

⚠️⚠️ **Il tasto `+` tira su la prima partita dei passi SUCCESSIVI**, e la
prima versione non si vedeva mai: cercava una partita "libera", ma `fasce()`
mette **ogni** candidata in un blocco, quindi di libere non ce n'è nessuna.
Trovato da Mattia (*"non vedo il tasto"*). Il senso di *"aggiungo le partite
successive"* è **allungare questo passo prendendo dal prossimo** — che è come si
arriva alla quota minima quando una fascia ha una gamba sola.
⚠️ E il tasto **dice quale partita aggiungerebbe**, col suo orario, invece di
dire "aggiungi": un tasto che pesca al buio costringe a premere per sapere cosa
fa.
⚠️ **Le aggiunte a mano non ricompongono le fasce**: una partita messa nel passo
1 resta nel passo 1 anche se il suo orario sarebbe di un altro blocco. È il
punto della pagina — il raggruppamento è una proposta, la composizione è sua.

### ⚠️⚠️ Cosa dice il backtest, e perché la pagina esiste comunque

`btscout/scripts/prova-scalata.js`, otto stagioni. ⚠️ Lì **un passo = un
giorno**, perché `partite` non ha la colonna `ora` (solo `prossime_partite`):
è la lettura conservativa, nella pagina un giorno con più fasce ospita più passi.

| quota minima | passi | gambe | quota media | vince | RESA |
|---|---|---|---|---|---|
| 1,30 | 1.124 | 1,00 | 1,382 | 71,3% | 98,2% |
| 1,70 | 780 | 2,04 | 1,938 | 50,6% | 97,3% |
| 2,50 | 591 | 3,33 | 2,989 | 34,7% | 102,2% |

⚠️ **A 2,50 sembra in guadagno e non lo è**: con 591 passi a quota 3 il margine
è ±10 punti. Tutte le righe dicono **circa 98%** e le differenze sono rumore.
⚠️ **E qui una mia previsione è stata smentita dai dati**: avevo calcolato che
ogni gamba moltiplicasse il margine (98% in due, 97% in tre). **Sui dati non si
vede** — il conto teorico valeva solo con gambe scelte a caso, mentre si
prendono le migliori disponibili.

Il bankroll stagione per stagione, partendo sempre da 100 — **rimisurato il
15/10 con la percentuale sull'utile**:
`capitale` 99 · 34 · 92 · 23 · 84 · 31 · 34 · 81 → **mediana 81**, zero stagioni
in utile su 8; `gioco` 73 · 17 · 86 · 13 · 42 · 19 · 18 · 74 → **mediana 42**.
⚠️ **Sull'utile le due regole si separano, e `capitale` vince chiaramente**
(mediana 81 contro 42): mettere via tutto l'utile al primo passo riduce il caso
peggiore a −1,2 e il tetto resta 32, mentre `gioco` arriva a +86 ma brucia il
doppio. Sul montante erano indistinguibili (73 e 70) — **cambiare la base ha
cambiato quale regola conviene**, ed è il motivo per cui le misure si rifanno
quando si cambia una definizione.
⚠️ Resta vero che **nessuna regola di incasso salva una scalata alimentata da
passi al 98%**: il margine sta nelle quote, non nella progressione.
⚠️⚠️ **Mattia lo sa e vuole provarla con la selezione a mano**: *"qui c'è
troppa teoria e backtest che non tengono conto del tocco personale… facendolo a
caso sono nettamente in utile"*. È la sua decisione, presa due volte dopo che
il dubbio era stato posto. **Per questo la pagina salva tutto: il registro
dirà chi ha ragione**, e senza registro l'esperimento non è falsificabile — che
è la regola del motore.

⚠️ **La trappola delle date, pagata una seconda volta.** `fasce()` ordinava i
passi con `String(p.data).localeCompare(...)`: dal browser le date arrivano come
stringhe ISO, ma **dal driver postgres arrivano come oggetti `Date`**, e
`String(new Date())` dà `"Fri Oct 23 2026…"` — quindi i passi venivano ordinati
**per nome del giorno**, venerdì prima di lunedì. ✅ `giorno()` in `scalata.js`
regge entrambi. Trovato provando la pagina sui dati veri da terminale: **un
ordine sbagliato non lancia niente.**
⚠️ **E un difetto trovato dal collaudo della libreria appena scritta**:
`[POSTA, 0.50, 0.70][0] ?? 1` — con `null` come segnaposto, `??` lo prendeva
per "manca" e restituiva **1**, cioè la regola metteva via tutto al primo passo
e la scalata finiva subito. Il segnaposto ora è la stringa `'posta'`.
**`null` è un valore legittimo, e un operatore che lo tratta come assenza se lo
mangia in silenzio.**


### 💰 Il conto personale, la ricarica e ⟳ RIPARTI (24/10/2026)

Due difetti trovati da Mattia giocando, e una richiesta che li ha assorbiti:
*"il bankroll deve essere sempre solo 1, quando finisce devo poterlo
ricaricare: se perdo 3 bankroll interi, quindi 300 €, e una volta incasso
200 €, devo capire di essere in perdita e non in utile"*. E: *"ogni account
avrà il suo conto personale, sia Admin che user"* (`sql/41`, `1.59.00`).

**I due difetti, perché non si ripetano:**
- ⚠️ **Il bankroll tornava a 100 dopo lo STOP.** La selezione salvata
  portava con sé il bankroll del 22/10, e senza una scalata aperta
  **passava sopra** al capitale del registro (90). Il bankroll non sta più
  nelle preferenze.
- ⚠️ **I passi «sparivano».** Erano tre cose insieme: «fissa passo» era stato
  della pagina e si perdeva chiudendo l'app; dopo un passo perso la catena si
  ferma e i passi dopo si nascondevano; e l'unico modo di andare avanti era
  STOP, che li chiudeva in archivio. Oggi «fissato» è una colonna del passo,
  i passi dopo un perso restano **visibili e spenti**, e c'è RIPARTI.

**Il conto è CALCOLATO, mai scritto**, come il bankroll del gruppo (regola 1):

    conto = Σ ricariche + Σ (bankroll_finale − bankroll_iniziale) dei giri chiusi

`contoDi` in `lib/scalata.js`. ⚠️ **Non ci sono più i tasti −/+** sul
bankroll: cambiavano il capitale senza lasciare traccia, ed è il motivo per
cui *quanto ci si era messo dentro* non lo sapeva nessuno. Entra denaro solo
con **＋ ricarica**. ⚠️ Il **risultato è `conto − versato`**, non la somma
dei giri: dice *perdita* anche dopo un buon incasso, se prima si è
ricaricato di più. ⚠️ **Tutti partono da 0**, Admin compreso (Mattia ha
azzerato il suo archivio il 24/10): `CAPITALE_INIZIALE` non esiste più.
⚠️ È un conto **separato** da `users.bankroll`: una ricarica qui non tocca il
Bilancio (*"sono 2 conti diversi"*).
⚠️ Lo STOP scrive il `bankroll_finale` **al centesimo**, non per difetto: con
il conto fatto di giri, il `Math.floor` toglieva i centesimi dell'accumulo.

**⟳ RIPARTI**, sul giro con un passo perso e passi ancora da giocare: chiude
il giro come STOP e ne apre uno nuovo con **i passi programmati che restano —
spostati, non copiati** — e la puntata del 10% del conto nuovo. Gli accumuli
ripartono **dalla prima vittoria** del giro nuovo (*"la solita scaletta"*),
perché `casseDi` cammina sui passi del giro. ⚠️ È una funzione del database
(`riparti_scalata`), non tre chiamate: supabase-js non ha transazioni, e a
metà resterebbe un giro chiuso senza il successivo. I numeri li calcola la
pagina; la funzione controlla solo che abbiano senso (puntata ≥ 1, passi da
spostare). Se la puntata scenderebbe sotto 1 €, il tasto lo dice e chiede una
ricarica.

**Ognuno il suo**: le policy di `scalate`, `scalata_passi`,
`scalata_gambe` e `scalata_ricariche` guardano `user_id`, **admin compresi**
— come le schedine del Bet Builder. ⚠️ `sql/41` ha chiuso anche un resto di
`sql/30`: `passi_write` e `gambe_write` lasciavano a qualunque admin scrivere
i passi di chiunque. Provato simulando un utente e un admin in una
transazione annullata. La selezione è **personale e si salva da sola** (niente
più tasto «salva»). ⚠️ «Riparti da 0» cancella **anche le ricariche**:
cancellare solo le scalate restituirebbe le perdite.

**I flag ⚑ li mette chiunque**: **verde** di un admin, **blu** di un utente
(`flag_partite.da_admin`, una fotografia del ruolo; la policy rifiuta chi si
dichiara admin senza esserlo). Le **stelline** restano agli admin.

### 🕐 Il piano non si perde più col passare delle partite (24/10/2026, sera)

Mattia: *"continua a perdersi tutto, partite fissate o giocate, quando passa
l'orario delle partite le cancella"* (`1.59.01`, `sql/42`).

⚠️⚠️ **La causa, nel piano**: il piano non è salvato come oggetto, si
**ricompone** dalle candidate — e le candidate escludevano le partite **già
cominciate rispetto ad adesso**. Alla prima partita del passo 1 il passo
spariva, quelli dopo **scalavano di un posto** ereditando esiti e
percentuali del passo sparito (erano `esiti[i]`, per posizione), e i fissati
(ancorati alla prima gamba) non trovavano più il loro passo. Verificato sui
dati salvati di Admin: i due fissati erano Aston Villa-Man City (13:30) e
Preston-West Brom (16:00), entrambe cominciate.

**La correzione:**
- **il calendario del piano è fermo** all'istante dell'ultimo **«⟳ Aggiorna
  calendario»** (`calendarioDa`, salvato con il piano): il piano resta
  com'era finché non lo si aggiorna. Il tasto sta nella card SELEZIONE, al
  posto della riga del metodo, e **non cancella niente** — né tolte, né
  aggiunte, né i passi di una scalata aperta. `daOra` resta l'orologio vivo
  del `+` e della finestra manuale;
- **esiti e percentuali si agganciano al passo** (`kp(i)`: `s:<id riga>` a
  scalata aperta, `p:<prima gamba>` nel piano), non alla posizione;
- il tasto rosso «↻ nuovo piano», che a scalata aperta **cancella i passi non
  giocati**, resta (Mattia) ma **chiede conferma**: il primo tocco dice quanti
  passi butta, il secondo esegue, si disarma dopo cinque secondi.

⚠️ **A scalata aperta il tempo non toccava i passi**: sono righe salvate. Ma
il 24/10 la scalata 41 (aperta 15:28, STOP 15:31) è finita **senza passi**,
e Mattia non ha premuto «nuovo piano». Le strade che cancellano un passo
sono quattro (nuovo piano, riparti da 0, × sull'ultima gamba, il `+` che
svuota il passo dopo) e **non si è potuto sapere quale**. Per questo
`sql/42`: un **trigger** annota in `scalata_cancellazioni` ogni passo
cancellato — chi, quando, numero, esito, fissato, le partite, e lo stato
della scalata (`null` = cancellata insieme, cioè una cascata). **La prossima
volta che sparisce qualcosa, si guarda lì prima di indovinare.**

### ✂️ «Metà utile» al posto della Scalata madre (26/10/2026)

Mattia ha giocato una serie di **7 passi vinti** a quote 3,12 · 3,14 · 2,74 ·
1,98 · 2,59 · 3,00 · 2,34 prelevando a sentimento, e ha portato a casa ~150 €
su 100 di bankroll. Tutto in gioco avrebbe fatto 9.664 € — ma una serie così
capita **una volta ogni ~1.400** (probabilità di ogni passo ≈ 0,95 / quota),
e un piano si giudica su tutte le serie possibili, non su quella capitata.
Il conto di quella sera, sette regole sulla stessa serie, sta nella
conversazione del 26/10; la conclusione è qui sotto.

**Il backtest** (`btscout/scripts/prova-prelievi.js`, 6 stagioni europee,
attendibilità ≥ 61%, gamba ≥ 1,30, schedina ≥ 1,90, partendo da 100 € e
ricaricando 100 € quando la puntata scende sotto 1 €):

| passo | regola | risultato | mediana/stagione | stagioni in utile |
|---|---|---|---|---|
| fino a 4 insieme (q. media 3,24, vince 33%) | metà utile | −382 € | −81 € | 0/6 |
| fino a 4 insieme | variante di Mattia | −416 € | −84 € | 0/6 |
| **taglio a 1,90** (q. media 2,29, vince 45%) | **metà utile** (codice dell'app) | **−174 €** | **−63 €** | **1/6** |
| taglio a 1,90 | variante di Mattia | −256 € | −69 € | 0/6 |

La variante di Mattia: puntata al 1° passo, 30% al 2°, 50% dal 3° al 6°, poi
60 · 70 · 80 · 90 e 100% con STOP all'11°.

⚠️⚠️ **Quello che dice davvero:**
- **la leva è la quota del passo, non il prelievo**: a 4 partite insieme la
  perdita raddoppia. Su 277 scalate a quota ~2, 24 arrivano a 3 passi vinti,
  4 a 5, **nessuna a 7** — per questo i gradini alti della variante non
  contano: tengono in gioco più soldi in passi che non arrivano;
- **nessuna regola ribalta il segno**: il passo da solo rende 100,5% ±10. Il
  prelievo decide come si perde e quanto spesso si torna in utile;
- *"partiamo con questo schema, più avanti capiamo come migliorarlo"* —
  Mattia, 26/10.

**Cosa è cambiato nell'app** (`1.60.00`, `sql/43`):
- `METODO` è **«Metà utile»** (`regola = 'meta'`): al primo passo vinto si
  riprende la puntata, poi il 50% dell'utile. ⚠️ Sotto quota 2,00 l'utile è
  meno della puntata: al primo passo si mette via tutto l'utile e si rigioca
  la puntata (`percentualeConsigliata`, che usa anche il backtest);
- `QUOTA_MINIMA_SCHEDINA` **1,90** (era 2,00: serviva ai pavimenti);
- il consigliato è **attendibilità ≥ 61%, scelta spenta**: rimisurato con
  `prova-soglie-scalata.js --dettaglio=61 --solo-att` — 2.883 partite, 2,4 al
  giorno, resa 99,5% ±2,4, 85% dei weekend con almeno un passo;
- le scalate vecchie restano `madre` nell'archivio, e i pavimenti restano
  scritti in `lib/scalata.js` come storia.

### 🎯 La card in evidenza del passo da giocare (26/10/2026)

Mattia: *"la parte filtri è accettabile, la parte passi troppo confusionaria"*.
La card di prima metteva sullo stesso piano una ventina di cose (`1.61.00`):
- **il passo da giocare** è `PassoHero`: bordo e fondo dorati, **«punta» in
  grande in oro** e la **quota** accanto col minimo (ambra e «manca x» se non
  ci arriva), una riga «se vince incassi · metti via · rigiochi» con i numeri
  in verde e oro. ⚠️ **Senza riquadro verde**: Mattia l'ha trovato
  *"ingannevole"* — un fondo verde si legge come «vinto», qui è un *se*;
- **partite e conti in due tendine** chiuse, con un riassunto di una riga.
  Dentro c'è **la card di prima** (`Passo` con `parte` e `nudo`), non una
  copia: il disegno delle gambe e dei conti resta uno solo;
- **gli altri passi sono righe** (`PassoRiga`), che si aprono **nella stessa
  card**: ⚠️ la prima versione apriva una card sotto una testata quadrata, e
  *"sembrano 2 card diverse"*;
- **i tasti dell'esito sono quadratini** (`TastiEsito`) ✓ · ✗ · · · 🔒 a
  destra, 34×30 px: a tutta larghezza *"occupavano troppo spazio"*.
⚠️ **Si torna indietro con `NUOVO_PASSO = false`** in `ScalataPage.jsx`.
⚠️ Resta grande il «fissa passo» dei passi **in anteprima**, che non hanno
esiti; e la card in evidenza non porta il colore della fascia.

### 📋 Il resoconto delle giocate nell'archivio (26/10/2026)

Mattia: *"quando chiudo la scalata non deve dirmi solo gli importi, voglio un
resoconto delle giocate"* (`1.62.00`). Ogni giro chiuso dell'ARCHIVIO è una
card che si apre (`GiroArchivio`): chiusa dice i soldi come prima, aperta
mostra **passi giocati · vinti · persi** (e i non giocati), poi passo per
passo giorno, quota, incassato e messo via, e **ogni partita col suo
risultato e il suo esito vero**.

⚠️⚠️ **L'esito di ogni partita non sta nel registro**: `segna` scrive l'esito
del PASSO anche sulle gambe. Quello per partita si ricava dal risultato in
archivio — gamba → `prossime_partite.partita_id` → `partite` — con
`giocataArrivata` di **`app/src/lib/esito.js`**: la regola *"la giocata è
arrivata"* è stata **spostata lì dal motore, non copiata** (`ricostruisci.js`
la importa). Verificato che il motore dia gli stessi numeri: 24.225 partite
valutate, 12.419 vinte, stessa impronta prima e dopo.
⚠️ Una partita non ancora collegata al risultato (football-data in ritardo)
dice **«in attesa»**, non «persa». Il resoconto si legge **alla prima
apertura** di un giro (tre giri al database), non a ogni caricamento.
