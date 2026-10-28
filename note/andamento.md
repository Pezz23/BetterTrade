# LA PAGINA ANDAMENTO — studiare le soglie

> A cosa serve, come sono fatti i dati (sql/21-23), e cosa dicono le misure sulle soglie e sulle fasce di quota.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

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
VPM 7,0 · voto 100% · scelta 62%. Si muovono dalla pagina — servono a **cercare**
la soglia buona, non a dichiararla trovata.
⚠️ **I passi sono scelti da Mattia e non sono uguali fra loro**: attendibilità
**1 punto** (decide le spin, 75/72/65), VPM **0,10**, voto **0,25 punti**, resa
1 punto. Il voto ha il passo più fine perché è il più ripido: fra 100% e 101%
ci sono 1.098 partite.
⚠️ **Il confronto con la soglia si fa sul numero ARROTONDATO come si vede**
(`sopra()` in `hooks/usaAndamento.js`), altrimenti una cella che mostra
`100,25%` accanto a una soglia `100,25%` resta spenta perché sotto c'è
100,2449. Stessa trappola delle caselle dei gol.

⚠️ **Le diciture sono state rifatte il 15/10/2026**, perché i numeri non si
leggevano. Mattia: *"le card dicono x su y partite, ma da dove arriva Y?"* e
*"sotto 'tutti e quattro sopra soglia' c'è una % — cosa indica?"*. Due regole
che valgono oltre questa pagina:
- **Un denominatore va spiegato dove non è ovvio.** `Y` non è "le partite
  giocate" né "quelle in archivio": è **quante ne ha scelte quell'indicatore**,
  cioè quante volte è comparso nelle prime 15 del giorno stando sopra la sua
  soglia e dentro la fascia di quota. Ogni card ha quindi un Y **diverso**, e
  senza dirlo sembra un errore di conto. Spiegato **una volta**, in una riga
  sopra le quattro card, invece che in ognuna.
- **Un numero di confronto ha bisogno di tre cose, non di una.** La riga della
  base diceva *"in questa fascia tutte le partite fanno 55,2% su 317 — un
  indicatore vale solo quanto sta sopra questo"*, e Mattia: *"incomprensibile"*.
  Aveva ragione: *fanno* cosa, e 317 di che? Adesso dice **come è stato
  ottenuto** (prendendo tutte le partite della fascia, senza guardare nessun
  indicatore), **cosa misura** (quante volte la giocata è arrivata) e **a cosa
  serve** (è il livello da battere). ⚠️ E la frase **definisce la parola
  `base`**, che torna sotto ogni card come *"+6,8 punti sulla base"*: la
  definizione sta in **un posto solo** — ripeterla sopra le card voleva dire
  due testi da tenere d'accordo, e il nome resta **uno** (`base`, come
  `andamento_base`) perché due nomi per la stessa cosa sono il difetto peggiore.
- **Una percentuale senza la sua frase non si legge.** Quel numero appoggiato
  all'etichetta poteva voler dire tre cose: quante partite sono, quante ne
  azzecca, quanto rende. Adesso c'è il soggetto (*nelle 15 partite dove tutti e
  quattro stanno sopra la loro soglia*), il verbo (*la giocata è arrivata*) e
  **il confronto** (*in tutte le altre: 53,2%*), che è l'unica cosa che dice se
  quel numero è alto.

**Ogni riga porta tutti e quattro i valori**, non solo quello del metodo che
l'ha scelta (sql/22): *"quando clicco Voto vorrei vedere gli altri 3, per
capire quali indicatori mi avrebbero allertato"*. Verde quelli sopra la loro
soglia.

#### Le tre card a scomparsa — 15 ottobre 2026

**SOGLIE MINIME · FASCIA DI QUOTA · QUANDO SONO D'ACCORDO TUTTI E QUATTRO** si
aprono e si chiudono, e **partono chiuse** (scelta di Mattia): sono due comandi
e un approfondimento, mentre quello che si guarda ogni volta sono le quattro
percentuali.

⚠️⚠️ **Chiusa, una card deve dire comunque il suo stato**, e qui non è un vezzo:
le soglie e la fascia **decidono tutti i numeri della pagina**. Una card chiusa
che non dice "da 1,00 a 1,45" lascia davanti agli occhi quattro percentuali
senza il filtro che le ha prodotte — numeri che sembrano assoluti e non lo sono.
**Un comando si può nascondere, il suo valore no.** Perciò il riassunto porta le
quattro soglie scritte, i due limiti di quota con la base, e la percentuale
dell'accordo.
⚠️ Il riassunto sta **sotto** il titolo e non accanto: le quattro soglie di fila
sono 44 caratteri, e accanto a un titolo su un telefono verrebbero tagliate.
⚠️ **Aprire la card dell'accordo E caricare le sue partite sono lo stesso
gesto**: prima erano due tocchi diversi nello stesso posto, uno per la frase e
uno per l'elenco.
⚠️ **Togliere la riga che spiegava `scelte`** sotto i tasti per giorno/weekend
(richiesta di Mattia, 15/10): la parola resta nelle card (*"su 8.372 scelte"*)
senza la sua definizione a schermo. È una scelta sua — la pagina la usa lui — e
la definizione resta qui: *quante volte quell'indicatore l'ha messa fra le prime
15 del giorno, stando sopra la sua soglia e dentro la fascia di quota*.

#### Le quattro card — 15 ottobre 2026

**Un indicatore per card**, nell'ordine chiesto da Mattia: **VPM ·
Attendibilità · Scelta · Voto**. Titolo, la percentuale in grande, sotto le
partite (`70 su 92`) e la soglia che le ha selezionate.
⚠️⚠️ **Le card SONO il selettore**, e non per risparmiare spazio: la domanda
della pagina è *"quante volte ha ragione questo indicatore sopra la sua
soglia"*, quindi il numero e il tasto che apre le sue partite devono essere la
stessa cosa. Prima erano due file separate — una di percentuali e una di tasti
`ATT VPM VOTO RESA` — e bisognava tenere a mente quale riga corrispondeva a
quale tasto.
⚠️ **Il colore dice com'è andata, il bordo quale stai guardando**: con una
tinta sola si leggerebbe "l'indicatore selezionato è quello buono".
⚠️ **La card delle soglie ora ha solo i comandi**, niente percentuali: il
risultato di ogni soglia sta nella sua card tre centimetri sotto, e lo stesso
numero in due posti è il difetto che prima o poi li fa divergere.
⚠️⚠️ **Togliere la card "QUANTI INDICATORI SOPRA SOGLIA"** (Mattia: *"non
capisco a cosa serva, e non posso cliccare le altre"*). Mostrava cinque
percentuali — 0,1,2,3,4 indicatori d'accordo — di cui **una sola apribile**, e
il tocco stava sul contenitore: l'unica cosa cliccabile era quella che sembrava
meno cliccabile. La domanda che rispondeva resta, in **una riga sola**, perché
la misura dice che è un controllo e non un metodo di scelta: il guadagno
sull'attendibilità da sola non è dimostrabile.

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

#### ⚠️⚠️ La fascia di quota — e cosa succede quando si fissa il prezzo

**Chiesta da Mattia il 15/10/2026**: *"vorrei una ricerca anche per quota:
voglio capire con quel filtro e quella quota quale indicatore è più preciso"*.
È la domanda giusta, e la risposta ribalta la lettura di tutta la pagina.

⚠️ **Il motivo per cui serve: l'attendibilità alta È la quota bassa.** Sono lo
stesso fatto detto in due modi. Quindi "questo indicatore azzecca più spesso"
può voler dire soltanto *"questo indicatore sceglie favoriti più corti"* — e
misurato è **quasi tutta lì** la sua precisione. Dentro una fascia il confronto
è alla pari, perché tutti partono dalla stessa probabilità.

Misurato su 33.292 partite, otto stagioni, soglie di partenza. `base` = **tutte
le partite della fascia** scelte da almeno un metodo; accanto, lo scarto:

| fascia | base | VPM | attendibilità | scelta | voto |
|---|---|---|---|---|---|
| tutte | 54,9% | +6,8 | **+16,8** | +15,9 | +12,4 |
| ≤ 1,45 | 74,7% | +0,4 | **−0,0** | +0,1 | **+2,0** |
| 1,45-1,70 | 62,7% | +1,4 | +2,5 | +1,5 | **+3,8** |
| 1,70-2,20 | 50,0% | −0,9 | — | −8,8 | −4,2 |
| > 2,20 | 39,6% | −0,3 | — | — | −2,8 |

⚠️⚠️ **Dentro una fascia nessun indicatore batte la fascia in modo
dimostrabile.** L'attendibilità passa da **+16,8 a −0,0**: il suo vantaggio
*era* il prezzo. Quello che resta in piedi è il **voto** (+2,0 e +3,8), e ha
senso che sia lui — `voto = resa × fattore` confronta la probabilità **col
prezzo**, quindi è l'unico che a prezzo fisso non sta ripetendo il prezzo.
⚠️ **Ma sono scarti dentro il rumore**: +2,0 **±2,5** su 1.456 partite e +3,8
**±5,1** su 355. **La direzione regge, la grandezza no** — la stessa frase
della scelta, e per la stessa ragione (a queste quote servono migliaia di
scommesse per vedere due punti).
⚠️ **Sopra 1,70 tutti vanno sotto la base**, e l'attendibilità **non esiste**:
sopra il 60% implica una quota sotto 1,67, quindi in quella fascia ha **una
partita in tutto**. Soglia e fascia lì sono lo stesso filtro.
⚠️ **Cosa misura davvero il filtro**: le liste sono le prime 15 di ogni giorno
calcolate **prima** del filtro di quota, quindi la risposta è *"fra quelle che
ha scelto, le partite di questa fascia sono andate così"* — non *"cosa avrebbe
scelto restringendosi a questa fascia"*. La seconda domanda vuole un ricalcolo
in `calcola-andamento.js`.
⚠️ **La fascia SONO due numeri scelti a mano** — `DA` e `A`, passo 0,05
(richiesta di Mattia il 15/10: *"devo poter scegliere io la quota"*). Le cinque
fasce misurate restano come **scorciatoie che scrivono nei due numeri**, e si
accendono quando combaciano: un secondo stato "quale fascia è selezionata"
divergerebbe dai numeri al primo tocco.
⚠️ **Il comando va da 1,00 a 10,00**, e di partenza sta su tutto l'intervallo.
Nei dati di oggi la quota più alta è **3,60** — la giocata è sempre il favorito
del mercato, quindi oltre non si va — ma **il limite del comando non deve
essere il limite dell'archivio di adesso**: un tetto a 4 nasconderebbe una
quota più lunga *senza dirlo*, che è il difetto di famiglia di questo progetto.
⚠️ Le quattro scorciatoie (`tutte · 1,35-1,50 · 1,50-1,90 · 1,90-2,20`) stanno
**su una riga sola anche su un telefono**: `flex: 1` con `minWidth: 0` — senza
quello un elemento flessibile non scende sotto il suo contenuto, la stessa
trappola della griglia della Slot — testo a 10px e **interlettera annullata**,
perché gli 0,4px per carattere di `Tasto` fanno 4px su "1,90-2,20" e bastano a
far uscire la quarta su uno schermo da 320px.
⚠️ **I caratteri di `DA`/`A` sono gli stessi di SOGLIE MINIME** (12 l'etichetta,
13 il valore): sono due comandi della stessa natura a due centimetri di
distanza, e due scale diverse li fanno sembrare due cose diverse.
⚠️ **I due limiti non si scavalcano, si fermano a un passo di distanza**: un
intervallo vuoto a schermo si legge come un guasto, non come una scelta.

⚠️ **I tasti `−` e `+` si tengono premuti** (`TastoRipeti` in `AndamentoPage`),
e servono: il voto si muove di 0,25 punti per volta, quindi da 100% a 105%
erano venti tocchi. Tre cose non sono estetiche —
**la catena di `setTimeout` invece di un `setInterval`** (il ritmo accelera:
subito il primo scatto, poi mezzo secondo di attesa perché un tocco singolo
resti un tocco singolo, poi 120 ms che scendono a 40);
**i `pointer*` invece di mouse e touch separati**, con lo stop anche su
`pointercancel` e `pointerleave` — su telefono il dito che scivola fuori dal
tasto **non manda `pointerup`**, e un contatore che continua da solo è il
difetto peggiore di un tasto così;
**`userSelect: none` e `touch-action: manipulation`**, senza cui tenere premuto
su iOS seleziona il testo e apre il menù contestuale invece di ripetere.
⚠️ Il timer si ferma anche allo smontaggio della pagina: il dito giù mentre si
cambia schermata lascerebbe il giro vivo.
⚠️ **La base segue l'ambito** (`p_ambito` in `andamento_base`): le prime 15 di
un giorno e le prime 36 di un weekend pescano da insiemi diversi, e confrontare
la percentuale del weekend con la base del giorno sarebbe un confronto fra due
universi.

⚠️⚠️ **Lezione di migrazione, pagata due volte in un giorno** (`sql/29`):
- **Aggiungere** un parametro con un valore predefinito è retrocompatibile,
  **rinominarlo** no. PostgREST chiama **per nome**: l'app pubblicata che passa
  i nomi di prima continua a funzionare perché i nuovi prendono il default. Il
  15/10, rinominando `p_resa` in `p_scelta` (`sql/28`), l'app in produzione è
  rimasta rotta fino al deploy — *"Could not find the function… in the schema
  cache"*. **Prima il frontend, poi la rinomina; o si aggiunge e si toglie
  dopo.** Ma la vecchia firma **va cancellata**: con entrambe vive, una chiamata
  che nomina i vecchi parametri ne trova due candidate e Postgres risponde
  *function is not unique*.
- **`create or replace`, mai `create` secco.** I `drop` in testa togliono le
  firme *vecchie*: al secondo giro la creazione trova la propria già lì, va in
  errore e **annulla tutta la transazione**. È succeduto: metà migrazione
  applicata, metà no, e il database a metà strada senza che nulla lo dicesse.
  **Una migrazione che non si può rilanciare non si può nemmeno correggere.**

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
⚠️ **Si ricalcola da sé a ogni importazione dal 15/10/2026**: è l'ultimo passo
di `aggiorna.js` ed è in coda a `importa-espn.js` (solo se ha portato risultati
nuovi), sempre sulla **sola stagione in corso** — il passato non cambia, e
rifarlo tutto vorrebbe dire riscrivere 101.000 righe identiche ogni volta.
⚠️ **Ed è l'unico passo che non ferma la routine se fallisce**, perché
`andamento` è **derivata** da `partite`: nessun altro passo dipende da lei, e
un suo errore non deve impedire i controlli sui dati veri. Fallisce
rumorosamente e l'aggiornamento continua, dicendo in fondo che la pagina è
rimasta indietro.
⚠️ **Il motivo per cui esiste questo automatismo**: dal 12 al 15/10 la pagina
è rimasta ferma al 4 ottobre e sembrava rotta. Non lo era — lo script era
girato quando football-data era fermo da tre settimane, e aveva scritto
fedelmente tutto quello che c'era. **Una tabella derivata che si aggiorna solo
a mano mente ogni volta che la fonte cambia, e lo fa in silenzio.**
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


#### ⤓ Nel giorno TUTTE le partite, e l'esportazione delle card — 28 ottobre 2026

Mattia: *"io imposto i filtri e per ogni card devo poter fare il download; mi
serve una lista come quella che crea Road to weekend"*, e poi, vedendo la
card dire 529 e il file 72: *"dimentica l'idea delle prime 15 della
giornata: voglio tutte le partite con quei filtri, sia nel csv sia nella
pagina; tieni le prime 36 del weekend"* (`1.63.00`).

⚠️⚠️ **Nella vista per giorno `andamento` tiene TUTTE le partite**
(`PRIME_GIORNO = Infinity` in `calcola-andamento.js`): le soglie della pagina
fanno già da filtro, e le prime 15 erano un secondo taglio che su un sabato
pieno lasciava fuori partite sopra soglia. La tabella è passata da 100.005 a
**163.229 righe**. Il weekend resta alle **prime 36**. Il tasto della vista
dice «Per giorno · tutte»; la card dice «su N **partite**» nel giorno e «su N
**scelte**» nel weekend, dove scegliere c'è ancora.
⚠️ **L'elenco di un giorno mostra solo le partite sopra la soglia**
dell'indicatore (`partiteDi`): senza, un sabato ne mostrerebbe cento accanto
a un tasto che ne conta dodici.

**«⤓ esporta .csv»** in fondo a ogni card scarica **esattamente le partite
che la card conta** — stessa tabella, stessa vista, stesso confronto
**esatto** con la soglia di `andamento_riassunto` (non il numero arrotondato):
il file e il numero coincidono sempre. Data e risultato si prendono da
`partite` (le righe del weekend non hanno data). Formato **Excel italiano**:
`;`, virgola nei decimali, BOM (`lib/csv.js`). Il nome del file porta i
filtri, e la scritta sotto il tasto **si azzera a ogni cambio di filtro** e
dice con quali filtri è stato fatto l'ultimo file: il «72» accanto a «529» era
un file fatto prima, con i filtri di partenza.
Verificato: att ≥ 61%, quota da 1,30, 25/26, giorno → card **365 su 532**,
file 532 righe, 365 azzeccate, tutte con data e risultato.

⚠️ Strada facendo è nata e morta `partite_valutate` (`sql/44` la toglie):
serviva finché il giorno teneva le prime 15. Con tutte le partite in
`andamento` sarebbe stata una seconda copia dello stesso elenco.

⚠️⚠️ **Trovato strada facendo, e riguarda tutto il motore**: `ricostruisci.js`
sceglieva le «ultime N» stagioni ordinando i **codici come testo**, e dal
23/10 le stagioni ad anno solare del Giappone («2025», «2026») si mettevano
fra «2021» e «2122». **Ogni backtest «su 8 stagioni» dal 23 al 28/10 ne ha
misurate 6** (24.225 partite valutate invece di 33.418). Corretto il 28/10:
si scelgono fra le stagioni **con le quote**, in ordine di tempo. `andamento`
non ne aveva risentito — l'ultimo ricalcolo completo era del 22/10.
