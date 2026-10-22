# I GOL ATTESI — over/under e Goal/NoGoal

> Il modello dei gol, i due consigli, il gradiente delle dieci celle e il metro con cui sono stati giudicati.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

### I gol attesi — over x,5 e Goal/NoGoal

**Nato il 12/10/2026** da due richieste di Mattia che sono **la stessa cosa**:
*"un indicatore over x,5, una stima sul numero di reti previste"* e *"un
indicatore Goal/NoGoal"*. Un modello solo li produce entrambi — `lib/gol.js`,
visibile nel blocco **⚽ Gol attesi** della scheda.

⚠️ **Il MODELLO non usa nessuna quota, ed è voluto** (Mattia: *"non mi
interessa un match con le quote"*): resta la lettura della partita dalle
squadre, ed è quello che il blocco ⚽ mostra col gradiente.
⚠️⚠️ **Il CONSIGLIO invece sì, dal 15/10/2026, e la differenza non è
formale**: sulla riga 2,5 la probabilità arriva dalle quote quando ci sono
(`mercatoOver25()`), e il consiglio passa dal **64,8% al 71,2%** di volte
giuste. Vedi *Il consiglio ancorato al prezzo* più sotto.
⚠️ Per il GG/NG le quote **non ci sono** in nessuna delle due tabelle:
football-data non le pubblica, e The Odds API le ha solo a 1 credito per
partita (verificato il 15/10).

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

#### I due consigli — 15 ottobre 2026, spostati il 22/10

**Chiesti da Mattia**: *"sotto giocata un consigliatore di over/under e Goal /
no goal, al centro, in bianco"*. Nella scheda: `OVER 1,5` e `GOL`.

⚠️⚠️ **Dal 22/10/2026 stanno su una RIGA LORO, uno a sinistra e uno a destra**
(`Consigli` in `TestataPartita.jsx`), non più incolonnati sotto il pronostico.
Il motivo è una misura: la colonna della giocata è larga **76px**, quindi i due
verdetti con le due percentuali facevano **quattro righe di testo** e
allungavano la card di una sessantina di pixel — e per starci dentro erano a
corpo 11 con `nowrap`. Sulla riga loro costano **una riga invece di quattro** e
hanno tutta la larghezza della card. La disposizione è quella disegnata da
Mattia:

```
Squadra 1  posizione  ·  GIOCATA  ·  Squadra 2  posizione
                   O/U OVER 1,5 │ GG/NG GOL
                     ven 23/10 · 17:30
                 ───────────────────────────
```
⚠️ **Vicini e con un divisore, non ai due estremi** (correzione del 22/10,
dopo averli visti): ai lati opposti sembravano due informazioni di due blocchi
diversi, attaccati si leggono per quello che sono — due risposte alla stessa
domanda. Il divisore è `stretch`, perché uno dei due può non avere la riga
della percentuale (`IN BILICO`) e un trattino a metà altezza sembra un difetto.
⚠️ Sopra la data c'è `SP.sez` (24) e non 8: consigli e data sono *cosa farei* e
*quando si gioca*, due cose diverse. Sotto la data una riga `bordoTenue` e solo
8 di spazio — **non è il ritorno della linea spessa tolta la mattina stessa**,
che era `2px` del colore della categoria.

⚠️ **E la data prende lo stesso corpo del verdetto** (`CORPO_CONSIGLIO`, una
costante sola: due numeri che devono restare uguali, scritti a mano in due
posti, al primo ritocco divergono).
⚠️ **Stanno lì perché sono dello stesso genere della giocata** — *cosa farei* —
mentre il blocco ⚽ più sotto dice *com'è messa la partita*. Il bianco li lega
fra loro e li separa dal colore della categoria, che sulla giocata vuol dire
un'altra cosa (centro, giallo, blu).
⚠️ **La testata non calcola niente**: i gol attesi arrivano da fuori (`gol`), e
nella riga della lista quella proprietà non c'è — quindi lì le due righe non
compaiono. In lista i gol attesi non sono caricati, e inventarli per riempire
uno spazio sarebbe peggio di lasciarlo vuoto.

⚠️⚠️ **La regola: la riga più AMBIZIOSA che regge, non la più probabile.**
Il modello produce **otto** probabilità (over e under × 4 soglie) e
`p(over 1,5) > p(over 2,5) > p(over 3,5)` **sempre**, per costruzione: scegliendo
la più probabile vincerebbe eternamente l'over 1,5 — e la più probabile in
assoluto è over 0,5 al 92,9%, cioè *"giocati che si segna un gol"*, che non è un
consiglio. Ambiziosa = **base più bassa** (`BASI_GOL`): l'over 2,5 arriva da solo
il 51,0% delle volte contro il 75,4% dell'1,5, quindi dirlo è dire di più.
⚠️ **Un pavimento per riga** (`PAVIMENTI_OVER`), non uno per tutte: over 1,5 e
under 3,5 al **70%** — la soglia che diede Mattia il 12/10 per accendere il verde
(*"70% per gli OVER e UNDER e 65% per il goal"*), e un consiglio e un colore che
si accendono a soglie diverse direbbero due cose diverse sulla stessa partita —
mentre il 2,5 ha pavimento **65%**, perché al 70% verrebbe consigliato 221 volte
su 33.284, cioè mai.
⚠️ **Lo 0,5 resta fuori**, e lo scarto dalla base vive nel **colore della
cella**, che è il posto suo: il 12/10 il verde sull'over 3,5 al 35% era
esattamente l'errore di confondere *sorprendente* con *probabile*.

⚠️⚠️ **3,5 e under 1,5 NON si consigliano, ed è una misura.** Provati tutti i
pavimenti: con 45% l'over 3,5 viene consigliato 813 volte e si avvera il **45%**;
al 50% sono 188 volte col **49%**; al 55% quaranta volte in otto stagioni.
L'under 1,5 fa **36%**. **Non esiste un pavimento dove quelle righe siano
insieme consigliabili e frequenti**: quando avrebbe senso dirlo non succede mai,
e quando succede è una monetina. Un consiglio che si avvera meno di metà delle
volte non è un consiglio. Per riaccenderle basta dare loro un pavimento.

**Misurato su 33.284 partite** di otto stagioni, camminando nel tempo
(`btscout/scripts/prova-consiglio-gol.js`). ⚠️ Il metro **non è il 50%**: è
*"dico sempre la stessa cosa"*, perché over 1,5 arriva da solo nel 75,4% dei
casi.

| | volte | ha ragione | la stessa riga, sempre |
|---|---|---|---|
| **tutto il consiglio** | 33.284 | **75,6%** | 70,8% → **+4,8 ±0,5** |
| UNDER 3,5 | 18.576 | 74,8% | 71,3% (+3,5) |
| OVER 1,5 | 11.712 | 80,0% | 75,4% (+4,6) |
| UNDER 2,5 | 1.592 | 62,2% | 49,0% (**+13,2**) |
| OVER 2,5 | 1.404 | 64,8% | 51,0% (**+13,8**) |
| Goal/NoGoal | 11.643 | 57,5% | 53,2% (+4,3) |

⚠️ **+4,8 punti con un margine di ±0,5 è uno dei pochi risultati solidi di
questo progetto** — la selezione dei segni si muove dentro il rumore, questo no.
⚠️ **Il 2,5 costa in percentuale e paga in informazione**: con lui il consiglio
passa da 77,4% a **75,6%** di volte giuste, perché su ~3.000 partite dice 2,5
invece di 1,5 e lì ha ragione il 62-65%. Ma su quelle righe lo **scarto** è
+13, il triplo delle altre: il modello non è peggiorato, sta dicendo una cosa
più difficile. **Guardare la percentuale e non lo scarto porta alla conclusione
opposta a quella giusta.**
⚠️⚠️ **Non è un consiglio selettivo: parla il 100% delle volte.** Con λ attorno
a 2,6 più righe stanno sopra il loro pavimento, quindi il consiglio è una
lettura della *direzione* della partita, non una selezione di partite da
giocare. **IN BILICO sull'over non si vede mai** (sul Goal sì: lì tace nel 65%
dei casi).
⚠️ **E il 75% non è bravura**: le righe più consigliate hanno basi del 71% e del
75%, sono esiti frequenti.

#### ⚠️⚠️ Il consiglio ancorato al prezzo — 15 ottobre 2026

**Il risultato più grande della giornata, e nasce da una cosa che avevamo in
casa senza saperlo.** Le colonne `avg_ap_over25` / `avg_ap_under25` stanno in
`partite` **e** in `prossime_partite` dal primo import — football-data le
pubblica da sempre — e il modello dei gol era stato costruito e misurato
*senza quote*, per scelta. La misura ha detto quanto costava quella scelta:

| sull'over 2,5 | quanto sbaglia (Brier) | il consiglio sul 2,5 |
|---|---|---|
| la costante (51,0% sempre) | 0,2499 | — |
| **il nostro modello** | 0,2460 | 1.403 volte · **64,8%** |
| **il mercato** | **0,2406** | 1.994 volte · **71,2%** |
| metà e metà | 0,2422 | 1.234 volte · 72,1% |

⚠️ **Il mercato sbaglia due volte e mezzo meno di noi** (+0,0093 contro +0,0039
sulla costante), e il consiglio sul 2,5 guadagna **6,4 punti** su **più**
partite. Con la quota in uso il consiglio completo fa **76,2%** (+5,2 ±0,5)
contro 75,6% (+4,8), e soprattutto:

| | volte | giusto | da sola | scarto |
|---|---|---|---|---|
| OVER 2,5 **con la quota** | 1.994 | **71,2%** | 51,0% | **+20,2** |
| UNDER 2,5 **con la quota** | 690 | **70,1%** | 49,0% | **+21,1** |
| OVER 2,5 col solo modello | 1.403 | 64,8% | 51,0% | +13,8 |

**+20 punti su un evento che accade il 51% delle volte è il numero migliore di
questo progetto.** Per confronto: la selezione dei segni si muove dentro il
rumore.

⚠️ **Perché il mercato e non la media fra i due.** Metà e metà dà 72,1%
sull'OVER ma su 1.234 partite invece di 1.994, e sull'UNDER *peggiora* (66,6%
contro 70,1%). Più semplice e migliore: si prende il prezzo.
⚠️ **Si normalizza sempre**: `1/over` e `1/under` sommano a ~1,05, e
confrontare una probabilità implicita non normalizzata col modello è l'errore
che `btscout/CLAUDE.md` chiama *"misurare la commissione del banco"*.
⚠️ **Solo la riga 2,5**: il mercato delle altre soglie non l'abbiamo. Sulle
righe 1,5 e 3,5 parla il modello, come prima.
⚠️⚠️ **E chi ha parlato si scrive a schermo** — `O/U · quote` in oro accanto
all'etichetta. Un consiglio al 71% e uno al 64% non valgono lo stesso, e far
credere il contrario è peggio che non avere il consiglio. È la stessa regola
della colonna QUOTA, che dice sempre `BET365` o `MEDIA`.
⚠️ **Le altre tre strade sono state provate e misurate prima di questa**: sette
regole di scelta diverse (per scarto, per ambizione, col silenzio sotto una
soglia minima) stanno **tutte** a +5 di scarto. Non era la regola a mancare,
era l'informazione. **Quando sette varianti danno lo stesso numero, il limite
non è nel come si sceglie.**

⚠️ **Da dove arriva la quota sulle future** (15/10/2026): The Odds API, mercato
`totals`, **1 credito per campionato** — il giro passa da 30 a **45 crediti**,
~360 al mese sui 500 gratuiti. Verificato su 172 partite di 14 campionati:
**copertura 172 su 172**, 11-15 bookmaker ciascuna. Primo giro vero: **189
future su 192**, 9 book in media (mancano F1 e T1 in quel momento).
⚠️⚠️ **Si tiene solo chi quota ESATTAMENTE la linea 2,5.** Ogni bookmaker
pubblica la *sua* linea principale: su 2.227 quote era 2,5 nel 67% dei casi,
3,5 nel 23%, il resto sparso. Un over 2,75 **è un altro evento**, non una
versione imprecisa dello stesso, e mediarli darebbe il prezzo di niente. Sotto
tre book che quotano il 2,5 la partita resta senza.
⚠️ **E quelle quattro colonne si scrivono con `coalesce`**: possono essere null,
e football-data invece le riempie sempre per il blocco imminente — senza
`coalesce` un giro di The Odds API **cancellerebbe un dato buono con un vuoto**.
Stessa ragione per cui `b365_*` non è nella lista delle colonne scritte.
⚠️ **La seconda chiamata non può far perdere la prima**: l'over/under sta in un
`try` suo, e se cade le partite entrano comunque con l'1X2.

⚠️ **Il GG/NG resta senza prezzo, e adesso si sa perché.** Il mercato `btts`
esiste (sondato: Pinnacle 1,39 / 3,13) ma **solo sull'endpoint per singolo
evento, 1 credito per partita** — 170 crediti per weekend, fuori dal piano
gratuito. Stessa cosa per `alternate_totals`, che darebbe la riga 2,5 di tutti
i book. **È la risposta al "punto C" di STATO.md: il mercato c'è, non è
accessibile.** Costo della verifica: 16 crediti.

⚠️ **Ogni riga porta il nome della sua domanda** — `O/U` e `GG/NG` davanti al
verdetto (Mattia, 15/10: *"in bilico da solo non si capisce"*). Aveva ragione:
`IN BILICO` da solo non dice **su cosa**, e il Goal tace nel 65% dei casi — cioè
nella maggior parte delle partite quella riga era una parola senza soggetto.
L'etichetta resta spenta e il verdetto bianco: il nome della domanda è contesto,
la risposta è il dato.

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

