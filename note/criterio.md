# IL CRITERIO — attendibilità, VPM, scelta, voto

> Che cosa si gioca e perché: la probabilità dal consenso, i quattro numeri della barra, e tutte le misure che li hanno decisi.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

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

### ⚠️⚠️ IL VOTO È CAMBIATO IL 22/10/2026 — adesso è una pagella

**Quello che segue descrive il voto VECCHIO**, `resa × fattore(VPM)`, e si
tiene perché spiega *perché* è stato sostituito. Oggi:

    voto = 10 × attendibilità
         − 0,6 se il campo contraddice il mercato
         + bonus del prezzo, tagliato a ±0,5

⚠️ **Non è una probabilità**: è una pagella da 0 a 10 per **ordinare e
filtrare**, e non torna mai nulla (il disaccordo è un voto basso, non un
`null`). ⚠️ I pesi sono **misurati** (`btscout/scripts/prova-pagella.js`,
otto stagioni, verificati su due mai viste): **VPM come addendo pesa ZERO** —
il Brier peggiora in modo monotòno appena lo si alza — ma come **bandierina**
vale dieci punti (43,1% contro 53,2%). Il bonus del prezzo è **gratis**
(60,4% contro 60,1% sulle prime 9, dentro il rumore).
⚠️ **Perché il vecchio è morto**: con la quota dalla media di mercato
`resa = quota × att` si semplifica in `1/margine`, quindi il voto diceva
*quanto margine si è preso il book*. Misurato, ordinando per lui si azzeccava
il **49,0%** contro il 60,5% dell'attendibilità: il peggiore di tutti.

**Il VOTO vecchio** (storia, non più vero):

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

### SCELTA — l'attendibilità corretta dal campo (12/10/2026)

**Ha preso il posto della resa nella barra**, su richiesta di Mattia dopo una
giornata di misure. `scelta = attendibilità + 0,10 × (VPM − 5,5)/4,5`,
`null` quando il campo contraddice il mercato (`scelta()` in `lib/vpm.js`).

**Com'è nata.** Mattia cercava *"le partite dove la quota è alta e la
probabilità supera il 50%"*, e proponeva `VPM × quota`. Misurando è venuto
fuori il contrario di quello che cercava, più una cosa vera:
- ⚠️ **VPM è calibrato**, e non lo sapevamo: quando dice 5,5-6 il suo segno
  vince il 38,2% (il mercato dava 38,2%), a 7-7,5 il 55,3% (53,8%), a 8,5+ il
  74,2% (72,6%). **Si può trasformare in una probabilità.**
- ⚠️⚠️ **Ma il disaccordo col mercato è da evitare, non da cercare**: su 7.593
  partite il segno del campo vince **27,2%** dove il book ne dava **29,5%**, e
  giocarle rende **86,8%**. Peggiora con la quota: sopra 4,00 scende a 80,6%.
  Per questo il disaccordo vale `null` e non un punteggio basso.
- ⚠️ **Una quota alta non compensa mai una probabilità più bassa di quella
  implicita**, perché la quota è alta *proprio per quello*. È il motivo per cui
  ogni formula moltiplicata per la quota ordina male.

⚠️⚠️ **Quanto vale, detto onestamente: mezzo punto non dimostrato.** Tarato
sulle prime sei stagioni e verificato sulle ultime due, mai viste: il guadagno
passa da **+0,9** a **+0,5 punti di resa** con un intervallo di ±5,6; stagione
per stagione la mediana è **+0,2**, positiva in 5 su 8. **La direzione regge,
la grandezza no.** Il +0,8/+1,1 della prima misura era gonfiato perché le
soglie erano scelte sugli stessi dati su cui venivano giudicate.

⚠️ **Perché al posto della resa.** La resa ordinava male: `quota ×
attendibilità` vuol dire che in cima finiscono le quote lunghe, cioè le partite
meno probabili — ultima fra gli indicatori sulle azzeccate (51,2% contro 60,3%
dell'attendibilità). La scelta, sul 10% migliore di 33.133 partite, rende
**99,2%** con 75,8% di azzeccate. ⚠️ **La resa non è sparita**: resta nei
dettagli completi della scheda e **dentro il voto**.
⚠️ **Non ha il pareggio a 100%**: serve a ordinare, non a dire quanto rende.
Quel ruolo resta del voto.

⚠️⚠️ **IL VOTO NON È CAMBIATO, ed è una scelta misurata.** `voto = resa ×
fattore(VPM)` continua a usare la **resa**, non la scelta. Se usasse la scelta,
**VPM entrerebbe due volte** — e misurato costa: `scelta × quota × fattore`
rende **95,6%** contro il **97,8%** del voto di oggi. Il motivo generale è
sempre lo stesso: moltiplicare per la quota sposta la selezione sulle quote
lunghe. Confronto completo sul 10% migliore:
`scelta da sola 99,2% · attendibilità 99,1% · voto 97,8% · scelta × quota
96,4% · scelta × quota × fattore 95,6%`.

✅ **La pagina Andamento misura la scelta dal 15/10/2026** (`sql/28`), al posto
della resa: le righe `metodo = 'resa'` sono state cancellate e le quattro
funzioni ricreate con `p_scelta`. La **colonna** `resa` resta su ogni riga —
ogni riga porta tutti i valori della partita, serve a "quale indicatore mi
avrebbe allertato" — spariscono solo le partite **scelte dalla resa**.
⚠️ **E qui la scelta si comporta in due modi opposti, che vanno letti
insieme:**
- **Prendendo le prime 15 di un giorno** è il miglior selettore che abbiamo:
  **59,3%** contro 57,8% dell'attendibilità (e 66,1% contro 65,8% sul weekend),
  su 33.292 partite di otto stagioni. Il merito è che **scarta i disaccordi**:
  dove il campo contraddice il mercato `scelta` è `null`, quindi quelle partite
  non entrano in classifica.
- **Sopra una soglia, invece, non batte l'attendibilità**: a parità di volume
  `scelta ≥ 62%` fa **70,8% su 6.708** contro **71,7% su 6.212** di `att ≥ 60%`.
  Non è una contraddizione, sono le due domande di sempre — *chi arriva primo*
  e *chi sta sopra la soglia* — e la seconda non premia il bonus del campo.
⚠️ **La soglia di partenza della scelta è 62% e non 60% per forza**:
`scelta = att + fino a 0,10`, quindi a pari soglia selezionerebbe molte più
partite e le due card non si potrebbero confrontare.

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

