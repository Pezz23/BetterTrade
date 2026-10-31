# I DATI — fonti, quote, import, controlli

> Da dove arrivano le quote e i risultati, quando non ci si può fidare, e i controlli che girano dopo ogni aggiornamento.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

### ⚠️⚠️ Quando i bookmaker non sono d'accordo fra loro — 15 ottobre 2026

**L'attendibilità *è* la media di mercato.** Ma una media di 34 opinioni
allineate e una media di 34 opinioni sparse non sono lo stesso numero, e fino
al 15/10 le mostravamo identiche. `DISPERSIONE` e `dispersioneBook()` in
`lib/attendibilita.js` misurano la distanza fra la quota **più generosa** e la
**media**, sul segno favorito.

**Misurato su 8 stagioni e 38.084 partite** (`btscout/scripts/prova-dispersione.js`),
fra quelle con attendibilità ≥ 60% e a livello dichiarato quasi identico:

| disaccordo sopra | partite | dichiarato → avverato | resa |
|---|---|---|---|
| 4,2% | 521 | 66,2% → 67,4% (+1,1) | 95,1% |
| 5,0% | 234 | 65,5% → 63,2% (−2,2) | 90,0% |
| **6,0%** | **97** | **66,1% → 59,8% (−6,3)** | **84,6%** |
| 8,0% | 26 | 64,6% → 53,8% (−10,8) | 78,6% |
| *sotto 6,0%* | *6.191* | *68,3% → 71,8% (+3,5)* | *99,1%* |

⚠️ **Quello che rende credibile la misura non è un numero, è che scende in modo
monotòno su quattro tagli.** Il singolo gruppo ha ±9,8 di errore; quattro
gruppi che peggiorano in fila nello stesso verso no.
⚠️ **È un avviso, non un'esclusione**: 97 partite su 6.288, l'1,5%.
`SCARTO_FONTI` esclude dalle spin perché là il **dato è rotto**; qui il dato è
buono e dice che il mercato è incerto.
⚠️ **A schermo: il marchio ambra `ATTEND. ~` in barra**, e il numero per esteso
nei dettagli completi. Sta su ATTEND. perché è quel numero a valerne meno. **Non**
una riga rossa sopra la barra: due avvisi con lo stesso peso rendono illeggibile
quello grave.
⚠️⚠️ **È discreto di proposito, e la decisione è stata confermata dopo una
prova.** Il 15/10 Mattia non l'ha trovato — *"non vedo la scritta"* — e sono
dieci partite su 192, quindi il più delle volte non c'è niente da vedere. Gli
ho proposto una riga ambra nella scheda o un glifo più forte in barra:
**"lascia così"**. ⚠️ Quindi **non va alzato credendo di correggere una
dimenticanza**: la ragione per tenerlo basso è che l'avviso rosso delle quote in
conflitto deve restare l'unica cosa che grida. Se un giorno si vuole cambiare,
si cambia quello sapendo di spendere l'attenzione che oggi va al dato rotto.

⚠️⚠️ **IL TRANELLO, e c'è mancato poco: le due fonti non hanno la stessa
scala.** Stessa definizione, stesso segno — football-data mediana **2,9%** e 98°
percentile **7,1%**; The Odds API mediana **4,0%** e 98° percentile **10,4%**.
Il motivo è meccanico: la massima è il migliore fra **34** book invece che fra i
pochi che football-data segue, e **il massimo di un insieme più grande è più
estremo**. Applicare il 6% misurato alle righe di The Odds API segnalerebbe
**187 partite su 192** invece di dieci.
⚠️ Quindi la soglia dipende dalla fonte: **6% è MISURATO** (football-data),
**10% è TRASPOSTO per percentile e NON misurato** — di storia con le massime di
The Odds API non ne abbiamo (oggi ~300 partite già giocate, troppo poche). **Va
rimisurato quando ce ne sarà.** Con queste soglie, 10 future su 192 sono
segnalate.
⚠️ **E `prossime_partite.fonte` dice chi ha scritto per ultimo**, non chi ha
portato ogni colonna: The Odds API gira dopo football-data e sovrascrive
`max_ap_*`, quindi `fonte = 'odds-api'` vuol dire *questa massima è di 34 book*.
È per questo che la soglia si sceglie su quella colonna.

⚠️⚠️ **E attenzione a una misura che sembra enorme e non lo è.** Prendendo le
prime 9 di ogni giorno per attendibilità, i soli "book allineati" fanno
**61,7%** e i soli "sparsi" **52,1%**: dieci punti, che è il numero più grande
dell'intera misura. **È un artefatto.** Il disaccordo correla con la quota —
dove i book litigano le quote sono più lunghe — quindi il gruppo "sparsi" ha
attendibilità media 43,9% contro 55,7%: si sta misurando la quota, non il
disaccordo. Il confronto onesto tiene l'attendibilità **fissa**, e lì l'effetto
è 4-6 punti nel solo quartile estremo. **Quando una differenza è troppo bella,
cercare cos'altro è cambiato fra i due gruppi.**

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

⚠️⚠️ **E un controllo può sbagliare nello stesso modo di ciò che sorveglia.**
Il 21/10/2026 il primo controllo diceva *"2 partite giocate da più di 2 giorni
sono ancora senza risultato → football-data è indietro, recupera con ESPN"*.
Erano **Levante-Ath Bilbao del 16/09** e **Vallecano-Ath Bilbao del 10/10**:
**rinviate**, mai giocate, e la prima è ricomparsa in calendario il 21/10.
Il controllo dava per scontato che una riga di calendario con data passata
volesse dire *"partita disputata"*, e mandava a recuperare partite che non
esistono — un dato plausibile e sbagliato, esattamente il difetto che lui
stesso esiste per trovare.
✅ Ora distingue, e il segnale sta nei nostri dati:
- **quel giorno quel campionato non ha NESSUNA partita in archivio** → la fonte
  non ha pubblicato: è indietro davvero, e l'allarme resta;
- **le altre partite di quel giorno ci sono e questa no** → la fonte ha
  pubblicato, quindi questa non si è giocata: rinviata o spostata, si stampa
  come informazione e **non alza il contatore dei problemi**.
⚠️ Verificato sui casi veri: il 16/09 e il 10/10 la Liga aveva **3 partite in
archivio per giorno**, e quelle due non erano fra loro. E il ramo dell'allarme
vero scatta ancora: Wolves-Portsmouth del 20/10 viene classificato come buco,
perché quel giorno in archivio non c'è niente di nessun campionato.

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

**I nomi, 59 alias scritti a mano al 15/10/2026.** Due regole:
⚠️ **Gli accenti li toglie la macchina**: `Almería` → `Almeria` non è
indovinare, è normalizzare — la stessa stringa in due codifiche. Ha risolto da
solo una decina di casi spagnoli.
⚠️⚠️ **Tutto il resto è scritto a mano, e il motivo ha un nome: Paris.**
Cercando "paris" in archivio escono **`Paris FC` e `Paris SG`**, due club
diversi della stessa città — ed è esattamente l'abbinamento che un automatismo
di somiglianza aveva sbagliato. Stessa trappola con `Sporting CP`, che è lo
Sporting di **Lisbona** mentre in archivio c'è anche `Sp Braga`.
⚠️ Alcuni alias sono **vecchi nomi di club** che football-data non ha mai
aggiornato: `Istanbul Basaksehir` → `Buyuksehyr`, `Waasland-Beveren` →
`Beveren`, `Deportivo` → `La Coruna`.
⚠️ **E il confronto ignora già maiuscole e accenti** (`nostroNome`, il passaggio
su `_piatti`): `SPAL` trova `Spal` da sé, come `Almería` trova `Almeria`. Il
15/10 stavo per "aggiungere" quella correzione e c'era già da tre giorni —
**le 15 righe ferme in `importazioni` erano solo più vecchie della correzione**,
non la prova che mancasse. ⚠️ **Niente ripassa la coda quando si aggiunge un
alias**: una riga messa in attesa resta in attesa per sempre, anche se il motivo
nel frattempo è sparito. Se un giorno dà fastidio, si rilancia l'import sulle
stesse date invece di aspettare che si sblocchi da sola.

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

⚠️⚠️ **Un intoppo della fonte non deve uccidere il lavoro, e il database è una
fonte come le altre.** Il 12/10 un singolo `502` di ESPN ha fatto cadere un
recupero da mezz'ora dopo 246 partite; il giorno dopo un `ECONNRESET` del
database ne ha uccisi **due insieme** (li avevo lanciati in parallelo). Ora
`tollera()` avvolge **tutto il giro di una partita**, non solo la chiamata a
ESPN: quella partita si salta, si conta, si stampa in fondo, e il lavoro va
avanti — postgres.js riapre la connessione da solo. ⚠️ **E i recuperi lunghi si
fanno uno alla volta.**
⚠️ **I giorni si chiedono all'archivio, non al calendario**: la Serie A gioca
in ~130 giorni l'anno, e camminando sul calendario civile due richieste su tre
cadono a vuoto (2.660 chiamate invece di 1.399).
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

## 🏆 Le competizioni che football-data non copre (22/10/2026)

Mattia: *"vorrei avere tutta la Champions e magari aggiungere qualche
campionato — Olanda 2, Giappone, Serie B portoghese"*, più **una funzione che
aggiorna l'app ogni ora con i risultati**.

### ⚠️⚠️ Metà del lavoro era già in casa, e la ricerca l'ha spostata altrove

Il briefing proponeva Python + `soccerdata` + FBref. **Si è scelto ESPN**, e
non per pigrizia:

| | |
|---|---|
| **`soccerdata` oggi** | versione 2026.43, vuole **Python ≥ 3.10** (sul Mac c'è il 3.9 di sistema) e si porta dietro **`seleniumbase`**, cioè un browser intero: FBref sta dietro Cloudflare e non si legge più con una richiesta semplice |
| **ESPN** | è **già dentro il progetto** (`lib/espn.js`), gratis, senza chiave, e in una sola chiamata dà gol, tiri, **tiri in porta**, possesso, **angoli** e **cartellini** |
| **la prova** | `uefa.champions` risponde dal **2016**; `ned.2` (Keuken Kampioen Divisie) e `jpn.1` pure. ⚠️ `por.2` **non esiste su ESPN** sotto nessuno slug provato |
| **e i cartellini** | ESPN li espone come `yellowCards`/`redCards` in ogni riepilogo e la tabella ha `gialli_*`/`rossi_*` da sempre: **nessuno li leggeva**. Due righe in `statistiche()` |

⚠️ **I tiri in porta esistevano già**: `tirip_*`, pieni fra il 91% e il 100% su
tutti e quindici i campionati. Non era un dato da prendere, era un dato da
usare.

### ⚠️ Lo scoreboard si chiede a MESI, non a giorni

Provato il 22/10/2026: `dates=20251001-20251031` torna **zero**,
`dates=202510` torna **27 partite**. Una stagione di Champions camminando sul
calendario sono ~330 chiamate; a mesi sono **12**. È la differenza fra un'ora
e un minuto, ed è il motivo per cui esiste `partiteDelMese()`.

### ⚠️⚠️ Qui ESPN non è la seconda fonte: è l'UNICA

Nei quindici campionati football-data porta la riga ed ESPN la arricchisce,
quindi ogni numero ha un secondo parere e nel dubbio la riga aspetta una
persona. In Champions non c'è niente con cui confrontare. Per questo
`importa-competizione.js`:

- importa **solo le partite finite** — una riga senza risultato non è una
  partita giocata, è un calendario;
- scrive `fonte = 'espn'`, così si potrà sempre sapere quale parte
  dell'archivio ha **un solo testimone**;
- tiene i **nomi di ESPN** ("Internazionale", non "Inter"). Dentro la
  competizione sono coerenti, ed è quello che serve alle medie di squadra —
  ⚠️ ma **non si agganciano da sé** allo stesso club nel suo campionato.

### ⚠️⚠️ Senza quote non c'è attendibilità — ed è il limite da sapere

ESPN **non ha le quote**. L'attendibilità di BetterTrade *è* il consenso dei
bookmaker: queste partite hanno gol, tiri, angoli e cartellini, ma **nessuna
attendibilità**, e **non possono comparire fra le consigliate**. Servono per
le medie, i gol attesi, gli angoli e i cartellini — non per scegliere cosa
giocare.

### ✅ Il ponte fra i nomi — e il cerchio si chiude

Per le partite **future** le quote ci sono: The Odds API copre
`soccer_uefa_champs_league` e `soccer_japan_j_league` (verificato il 22/10), e
dalla sera del 22/10 sono **accese**. Con le quote arrivano attendibilità,
scelta e voto, e la competizione compare **da sola** nella barra a destra
delle Partite — quella barra si costruisce da quello che c'è in
`prossime_partite`, non da un elenco scritto a mano.

⚠️ **18 accoppiamenti in `lib/nomi-squadre.js`** (10 UCL, 8 JPN1), e il verso è
**opposto** a tutto il resto del file: a destra ci sono i nomi di **ESPN**
("Internazionale", "Sporting CP", "Kyoto Sanga"), non quelli di football-data.
Letti uno per uno: il confronto automatico ne risolveva 8, ma la regola
automatica sbaglia in silenzio — in questo stesso file c'è la cicatrice di
"Paris Saint Germain" finito su "Paris FC", che è un'altra squadra.

⚠️⚠️ **I nomi validi si cercano per DATA, non per codice stagione.** Il filtro
era `stagione in ('2526','2627')`: la J1 giapponese ha `stagione = '2026'`
(anno solare), quindi **ogni squadra giapponese risultava sconosciuta** e
tutte le partite venivano saltate. Ora è `data > current_date - 730`, che
parla la stessa lingua per tutti i calendari.

⚠️ **Il codice d'uscita non vale uguale per tutti.** Un nome sconosciuto nei
quindici di football-data è un **segnale**: le squadre cambiano tre volte
l'anno e va aggiunto alla mappa. In Champions le partecipanti cambiano **per
costruzione** ogni stagione, e i qualificati portano club mai visti: fermare
l'aggiornamento perché una squadra albanese ha passato il turno sarebbe il
rimedio peggiore del male. La partita si salta, l'avviso resta scritto, la
routine prosegue.

⚠️⚠️ **La dipendenza da ricordare**: il controllo guarda l'archivio degli
**ultimi due anni**, quindi le quote di una competizione nuova entrano **solo
dopo** che il recupero ESPN ha portato le sue stagioni recenti. Il 22/10 il
primo tentativo è tornato a mani vuote proprio per questo — il recupero era
al 2017. **Per una competizione nuova si parte da `--da=<anno scorso>`**, e
solo dopo si lascia andare lo storico profondo.

### L'aggiornamento orario

`aggiorna-risultati.js` + `aggiornamento-orario.plist` (`StartInterval 3600`).
⚠️ **Non è `aggiorna.js` più spesso**: quella scarica football-data, spende ~30
crediti di The Odds API a giro (500 al mese — sarebbero finiti in diciassette
ore) e ricalcola `andamento`. Questa fa **una cosa sola**, i risultati da ESPN,
e costa **zero crediti**. ⚠️ E se un passo fallisce **continua**: qui nessun
passo dipende da quello prima, e una fonte non documentata che tace per un'ora
non deve fermare anche l'altra.

### ⚠️ La Serie B portoghese non c'è, e non è un dimenticanza

Non la copre **football-data** (`P2` reindirizza su `SP2`, verificato il
16/09/2026), non la copre **ESPN** (sei slug provati, tutti 404) e non la
copre **The Odds API**. Resterebbe FBref, cioè Cloudflare e un browser: è
l'unico pezzo del briefing che costa davvero, e va deciso a parte.

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

⚠️⚠️ **Una partita rinviata si SPOSTA, non si raddoppia** (29/10/2026). La
chiave di `prossime_partite` è `(div, data, casa, trasferta)`: quando una
partita cambiava giorno l'upsert creava una riga nuova e lasciava la vecchia,
e finché tutt'e due le date erano future la stessa partita compariva **due
volte** in Partite, spin e Builder (Paris SG-Lyon, Toulouse-Troyes,
Montpellier-Red Star, 24/10). Ora i due import chiamano `lib/rinvii.js`
**prima** dell'upsert, e la riga vecchia si porta alla data nuova — spostata e
non cancellata, così stelline, flag e gambe restano attaccate al suo `id`.
Si sposta solo se è non giocata, futura, entro 21 giorni, **dentro il periodo
del file e assente dal file**: se la fonte elenca tutt'e due le date sono due
partite vere (la Scozia dopo la divisione in gironi). E
`riconcilia-prossime.js` **non collega** una riga vecchia se c'è anche quella
con la data vera: altrimenti la partita finiva due volte in Storico.
✅ **Provato dal vero nell'aggiornamento del 29/10**: Nice-Rennes (31/10 →
30/10) e Lorient-Brest (31/10 → 2/11) spostate, e i tre doppioni vecchi
lasciati scollegati dalla riconciliazione.
⚠️ **Resta scoperto il rinvio "a data da destinarsi"**: la partita sparisce
dal file senza una data nuova, e la riga vecchia resta in calendario finché
la data non passa.

---


### «Scarica risultati» dal telefono (30/10/2026, `1.75.00`)

Mattia: *"un tasto che lancio dall'app che chiede solo i risultati a ESPN"*.
In fondo a Road to weekend, **solo superadmin**: per ognuno dei 15 campionati
la funzione di Supabase `aggiorna-risultati` (`supabase/functions/`) dice
quali giorni guardare, **il telefono** scarica da ESPN, la funzione abbina e
scrive. Solo risultati, ultimi 2 giorni, niente coppe.
- ⚠️⚠️ **ESPN risponde 403 ai server di Supabase** (provato il 30/10): per
  questo la chiamata la fa il telefono. Non si aggira (cambiare l'identità
  della richiesta sarebbe aggirare un blocco voluto).
- **Un codice solo**: l'abbinamento sta in `btscout/lib/risultati-espn.js`,
  usato da `importa-espn.js`, `importa-competizione.js` e dalla funzione
  (che riceve le partite dal telefono come `fonte`). ESPN sta in
  `app/src/lib/espn.js` (il motore la re-esporta da `btscout/lib/espn.js`).
  Verificato: gli script vecchi e nuovi danno uscite **identiche** a vuoto.
- Doppioni: regola «una e una sola partita», e football-data il martedì e il
  venerdì **completa** la riga con la stessa chiave invece di raddoppiarla.
  Primo giro di Mattia: 2 partite scritte, 0 doppioni.
- Pubblicare la funzione: `npx supabase@2.122.0 functions deploy
  aggiorna-risultati --project-ref <ref> --use-api` con
  `SUPABASE_ACCESS_TOKEN` in `app/.env` (chiave personale, solo Edge
  Functions, con una scadenza: rinnovarla quando la pubblicazione la rifiuta).
- ⚠️ `andamento` non si ricalcola col tasto: la pagina Andamento resta
  indietro fino alla routine.
- ⚠️ **Dal 31/10/2026 il tasto prende anche il GIAPPONE** (`JPN1`): era
  finito per errore fra le coppe escluse. Lì ESPN è l'unica fonte, quindi il
  telefono manda **anche le statistiche** (solo per lui: `CON_STATISTICHE`
  nella funzione), e la stagione è ad **anno solare** («2026», come
  l'archivio: così `importa-competizione.js` riconosce le stesse partite e non
  le raddoppia). E l'abbinamento ora **collega al calendario** anche una
  partita che era già in archivio (una e una sola riga libera): il risultato
  compare in Road to weekend e nelle spin senza aspettare la riconciliazione.
- ⚠️⚠️ **Il Giappone dal 2026 gioca col calendario EUROPEO** (31/10/2026,
  Mattia: *"Hiroshima gol reali 32-10, l'app 64-32"*). Fino al 2025 la J1 era
  ad anno solare; febbraio-giugno 2026 è stato un mezzo campionato di passaggio
  (stagione «2026», 200 partite), e da agosto 2026 si gioca la 2026/27
  («2627»). La regola è `annoSolareFino: '2026-06-30'` in `app/src/lib/espn.js`,
  letta da `stagioneDi`. Con la regola vecchia tutto finiva in «2026» e le
  classifiche (`classifiche()`, sql/18: l'**ultima** stagione per campionato)
  sommavano i due campionati. Spostate in «2627» le **126 partite** dal 7/8 al
  31/10 (backup prima, nessun conflitto); dopo, Hiroshima 32-10 e 29 punti in
  13 partite, come la classifica vera.
