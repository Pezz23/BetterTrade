# STATO — BetterTrade

> **La to-do e il punto esatto in cui siamo.** Si legge all'inizio di ogni
> sessione e si aggiorna quando una task cambia stato.
>
> ⚠️⚠️ **Alleggerito il 22/10/2026**: tutto quello che è **chiuso** è passato in
> [STORICO.md](STORICO.md) — stesso testo, non riassunto. Qui resta **dove
> siamo, cosa è in corso e cosa è ancora aperto**. Lo storico si apre quando
> serve capire *perché* una cosa è fatta così, non per sapere cosa manca.

# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 22 ottobre 2026 (notte) · app alla versione
**1.48.02**

## ▶️ DOVE SIAMO — 22 ottobre 2026, leggi questo per primo

**Tutto il lavoro del 21-22 ottobre sta su ROAD TO WEEKEND.** Il restyling è
chiuso (il blocco più sotto è storia), e la pagina della scalata è diventata lo
strumento principale del weekend.

### Cos'è cambiato, in ordine

| | commit |
|---|---|
| **Scalata madre**: un metodo solo (pavimenti), quota schedina **2,00**, schedine spezzate da sé appena superano 2,00, spezza a mano fra due gambe | `ea6fd16` |
| **«quota gamba ≥»** come quarto filtro, e il ricarica rosso | `57a898e` |
| **La scheda partita si apre dal Weekend**, toccando i nomi | `43af87b` |
| **⚑ Flag**, **«+ aggiungi partita manuale»**, **pagina aperta a tutti in sola lettura** | `1edae37` |
| **Lotto 1**: soglia consigliata a **61%** (rimisurata), **preferenze salvate** (gli admin condividono una riga, gli utenti hanno la loro), **casse e archivio solo agli admin** | `23fa6f9` · `ac4fe13` |

Le migrazioni applicate in questi due giorni: **`sql/31`** (numero del passo
decimale, per inserirne uno in mezzo), **`sql/32`** (il metodo `madre`),
**`sql/33`** (`flag_partite`), **`sql/34`** (lettura aperta + scrittura
stretta). Tutte verificate dal database subito dopo.

### ⚠️ Quello che resta aperto, e va deciso da Mattia

| | |
|---|---|
| **le casse le vedono tutti** | aprendo la pagina agli utenti, bankroll, accumulo e archivio sono visibili a chi entra. Si toglie la card a chi non è admin — una riga — ma è una scelta sua |
| **lo spezza a mano quasi non compare** | col taglio automatico a 2,00 i passi nascono già minimi, e un pezzo minimo non si divide in due pezzi che arrivino entrambi a 2,00. Riappare solo su un passo allungato a mano |
| **un passo può avere 8 gambe** | `fasce()` raggruppa per orario e `MAX_GAMBE` vale solo per la proposta automatica. Mattia: *"decido io a mano"* |
| ~~il lotto 1 non è stato guardato~~ | ✅ **guardato da Mattia il 22/10**, e il giro ha trovato una cosa: gli utenti vedevano *"ARCHIVIO 1"*. Corretto — l'archivio segue le casse |

### 📦 I LOTTI, nell'ordine concordato il 22/10

| # | lotto | stato |
|---|---|---|
| **2** | **Le quattro rifiniture** (idee 2 · 4 · 5 · 7) | ✅ **fatto il 22/10** (`a542cf9`), più la testata rifatta su tre righe (`a095ce0`) e il difetto che Mattia ha fotografato nei filtri (`6bf1468`) |
| **3** | **Gli indirizzi delle pagine** (lotto Q, routing) | da fare — **prima di aggiungere schermate nuove**, o si ricablano dopo. E toglie la trappola della mappa di `guarda.mjs` |
| **4** | **La schedina a schermo** (idee 10 + 9): `schedina-weekend.js` esiste già, va portato in pagina; e `CompilaPerQuota` — ⚠️ **serve prima una risposta di Mattia**: compilare una spin **intera** o solo le caselle vuote? |
| **5** | **La barra dei campionati** (idea 3) | ⚠️ **da progettare prima**: su 375px toglie larghezza ai nomi, già tarati al pixel. Si decide **cosa si restringe** |
| **6** | **L'automazione** (lotto F): il `.plist` di launchd è pronto, due comandi | da fare |
| **7** | **Quello che aspetta i dati**: il riepilogo della scalata (a 10-20 chiuse), il Satellite, la spin 2 sotto soglia, i backtest vecchi | non anticipabile |

⚠️ Restano fuori dai lotti, **non dimenticate**: la **scala a sette colori per
distanza nel tempo** (idea 1) — proposta e **non fatta**, perché nella pagina
il colore dice già *in quale passo* sta la partita e due significati sullo
stesso canale non si leggono; e le **casse visibili agli utenti**, che si
tolgono con una riga quando Mattia vorrà.

### Cosa ha prodotto il lotto 2, oltre alle quattro voci

- **La testata della partita è su tre righe** (squadre · consigli · data), e la
  card si è accorciata di una sessantina di pixel: i due consigli stavano
  incolonnati dentro i **76px** della colonna della giocata.
- ⚠️⚠️ **`guarda.mjs` ha imparato a misurare gli ACCAVALLAMENTI**, perché il
  difetto che Mattia ha fotografato nei filtri — due pastiglie disegnate sopra
  la colonna accanto — **non faceva uscire la pagina di un pixel**. Erano due
  buchi: il pannello dei filtri **nasce chiuso** e non si fotografava mai, e la
  misura guardava la pagina invece dei contenitori. Su tutta l'app riporta un
  caso solo, quindi è una misura e non un allarme.
- ⚠️ E nello script c'era un `Escape` con scritto accanto *"si richiude"*: la
  scheda **non ascolta Escape**, restava aperta e copriva la barra in basso.

### ⛔ Le regole di lavoro aggiunte in questi giorni

- ⚠️⚠️⚠️ **Il permesso di guardare vale per UN giro, non per la serata**
  (22/10, detto due volte). La prima volta era la regola generale; la seconda
  perché, avuto il via per *un* giro di `/guarda`, ne ho fatti sei — e ogni
  giro costa un login vero e molti token. **Si chiede ogni volta.**
- ⚠️⚠️ **Non si entra nell'app col browser di propria iniziativa**
  (22/10): niente `scripts/guarda.mjs` e niente script Playwright con
  `E2E_USER` — **lo chiede Mattia quando serve**. Ogni giro è un login vero su
  Supabase (che ha un limite di tentativi) e con una scalata aperta può
  scrivere. Si verifica con lint, build e script da terminale; quando una
  modifica si giudica **solo guardandola**, lo si dice e si chiede.
- ⚠️ **I backtest si chiedono prima di lanciarli** (21/10), e quello della
  Scalata madre è stato autorizzato e fatto: il risultato sta più sotto.


## 🪜 SCALATA MADRE — il piano di rientro progressivo (21 ottobre 2026)

Briefing di Mattia, ragionato con Gemini. ⛔ **Non sviluppato in blocco**:
valutato, misurato e diviso in lotti. Le decisioni qui sotto sono sue.

### ⚠️⚠️ Il numero su cui si regge, misurato

Il briefing parte da *"precisione storica ~72%"*. In questo progetto quel 72% è
la percentuale con cui vince **un singolo favorito corto** (1,35-1,40:
dichiarato 69,1%, arrivato 72,5%). Il piano però gioca **doppie**, che sono un
altro evento. Misurato con `prova-scalata.js --quota=2.0`, 8 stagioni, 723
passi:

```
quota minima 2,00 →  vince 41,6%   quota media realizzata 2,448
                     gambe medie 2,71      resa 100,8%
```

⚠️ **41,6%, non 72%.** E per arrivare a 2,00 partendo da gambe ≥1,30 ce ne
vogliono **2,71 in media, non 2**: la quota sfonda a 2,448, il che sposta tutte
le poste del piano.

**L'EV del Modello A**, un ciclo da 10 unità:

| p(passo) | EV ciclo | chiude 4/4 | cicli in utile |
|---|---|---|---|
| 41,6% | −3,47u | 3,0% | 17% |
| 49,0% | −0,48u | 5,8% | 24% |
| **50,4%** (resa 100,8%) | **+0,20u** | 6,5% | 25% |

⚠️⚠️ **L'EV è indistinguibile da zero**, e il segno dipende da una stima con
±8 punti di margine. Non è una bocciatura — a quota 2,00 la resa misurata è la
**migliore di tutte le fasce provate** — ma va detto cos'è il modello:
**ridistribuisce la varianza, non crea un margine.**

```
49,6% → −10u    25,0% → −3u    12,6% → +3u    6,3% → +18u    6,5% → +68u
```

Si perdono **tre cicli su quattro**, poco per volta, e si vince molto di rado.
⚠️ **Nel codice non si scrive mai «garantito»**: il «+3u garantito dopo due
passi» del briefing è condizionato ad aver già vinto due passi, cosa che accade
il 25% delle volte.

### Le decisioni di Mattia (21/10/2026)

| | |
|---|---|
| quota minima | **2,00 "a salire"** — corretta il 21/10 dopo aver visto che a 1,90 i due vincoli qui sotto **non possono valere insieme** (il 1° passo incassa 19 e non 20) |
| l'arrotondamento | **i centesimi in accumulo, le cifre intere in «da rigiocare»** |
| il vincolo vero | **in due giornate deve rientrare il capitale iniziale** — è il pavimento del 2° passo |
| il Satellite | **si aspetta**, in fondo a questa lista |
| i backtest | ⚠️⚠️ **si chiedono prima di lanciarli.** Selezione da usare: **attendibilità ≥ 68% _oppure_ scelta ≥ 66%**, gamba con quota ≥ 1,30 |

### I lotti

| | | stato |
|---|---|---|
| **A** | **Spezzare un passo in due** | ✅ **fatto il 21/10** (`sql/31`, `spezzaFasce`, `spezzaPasso`, `puoSpezzare`) — provato dal vivo **e a scalata aperta** |
| **B** | La regola «Madre» a **pavimenti** (`PAVIMENTI`, `percentualeConsigliata`) | ✅ **fatto il 21/10** · **misurata il 22/10**, vedi sotto |
| **C** | La pagina: via la quota schedina e le due regole dai filtri, l'avviso sul passo | ✅ **fatto il 21/10** (`sql/32`) |
| **D** | **Il Satellite** | ⏸️ **in attesa, priorità futura** |
| **E** | ⚑ **Flag**, **«+ aggiungi partita manuale»**, **pagina in sola lettura per tutti** | ✅ **fatto il 22/10** (`sql/33`, `sql/34`) — nato strada facendo, non era nel briefing |
| **F** | **Soglia 61% rimisurata · preferenze salvate · i soldi solo agli admin** | ✅ **fatto il 22/10** (`sql/35`) — vedi sotto |

### Il lotto F, cosa contiene (22 ottobre 2026)

**La soglia consigliata passa da 58% a 61%**, e il come conta più del numero.
Mattia aveva chiesto il **68%**; `btscout/scripts/prova-soglie-scalata.js` —
**nuovo, perché la tabella di ottobre l'aveva prodotta un giro non conservato**
— dice che lì la resa è la più alta della tabella ma **metà dei weekend non ha
un passo componibile**, e **due passi (il suo vincolo: "in due giornate
recupero il capitale") si compongono nel 13% dei weekend invece del 74%**.
⚠️⚠️ **La colonna che decide è quella dei weekend, non la resa**: la scalata
gioca una schedina da 2,00, non una partita singola. E il guadagno non era
nemmeno dimostrabile — 100,2 ±3,1 contro 99,5 ±2,0.
⚠️ Per questo il tasto scrive **anche i weekend**: a 68% avrebbe detto *"resa
100,2% su 1.359 partite"*, la frase più bella della tabella, tacendo la cosa
che conta.
⚠️ **Una stagione sola non misura la resa** (Mattia: *"misura sulla 25/26"*):
a 61% le otto stagioni vanno da **96,9 a 103,5** con ±5 ciascuna. Il
**materiale** invece sì, e la 25/26 conferma (2,4 al giorno, 85% dei weekend
con un passo, 78% con due).

**Le preferenze salvate** (`sql/35`, `hooks/usaPreferenze.js`): una tabella
sola, la riga con `user_id` **nullo** è quella condivisa degli admin. Catena di
lettura **la mia → quella degli admin → i valori di fabbrica**. Si salva
*tutta la situazione* — soglie, bankroll, tolte, aggiunte, tagli, quote,
percentuali — **col tasto e non in automatico** (sei admin sulla stessa riga),
con accanto **chi** ha salvato e **quando**.
⚠️⚠️ E così è sparito un difetto che nessuno aveva visto: la percentuale
«metti via» era **locale alla pagina anche a scalata aperta**, quindi due
admin sullo stesso registro potevano vedere **casse diverse**.

**I soldi solo agli admin**: la card del conto e l'interruttore
`PIANO | ARCHIVIO` non esistono per chi non è admin — la road map si
condivide, il registro dei soldi no. ⚠️ Fatto **togliendo le card**, non
richiudendo la lettura delle tabelle: quella svuoterebbe la pagina per tutti.

### Il lotto E, cosa contiene (22 ottobre 2026)

**⚑ I flag** (`flag_partite`, `sql/33`). Mattia: *"un flag verde per segnare
quelle che mi piacciono, le chiameremo partite flaggate così da non confondere
con le stelle"*. Stessa forma di `voti_partite`, **significato diverso**: la
stella scavalca la soglia nelle spin, **il flag non scavalca niente** — le
soglie della scalata alimentano anche il taglio automatico a 2,00, e una gamba
corta entrata di straforo abbasserebbe il passo in silenzio. Flaggano tutti gli
admin, il conto si vede.
⚠️ **Flaggate e votate restano nell'elenco anche quando i filtri le tagliano**,
marcate `fuori filtri`: un segno che sparisce alzando una soglia è il difetto
peggiore. Ma **non entrano nella scaletta**: per quello c'è il tasto manuale.

**«+ aggiungi partita manuale»** (`components/ScegliGamba.jsx`), sotto il tasto
della consigliata: testo libero più i filtri ⚑/★, **tutto il calendario** anche
sotto le soglie, in ordine di data e ora. Targhetta `P3` = già nel passo 3.
⚠️ Il tasto sopra **accetta** la proposta dell'app, questo **la scavalca**: per
questo hanno un aspetto diverso.

**La pagina aperta a tutti in sola lettura** (`sql/34`). ⚠️⚠️ Due cose che si
sono scoperte solo provandole:
1. `usaScalate` filtrava per `user_id`, quindi uno spettatore avrebbe letto
   **il proprio** registro — vuoto. Ora chi non è admin legge quello che c'è
   (`usaScalate(userId, tutte)`); ogni admin continua a vedere il suo.
2. **`scalate_write` era più largo di quanto dicesse**: `user_id = mio OR
   admin` lasciava a *chiunque* creare una scalata a nome proprio. Non si
   vedeva perché la lettura era chiusa; aprendola, un utente poteva farsi un
   registro che sarebbe comparso agli spettatori. Ora è un **and**.
   ⚠️ Trovato **simulando una sessione utente** contro le policy
   (`set local role authenticated` + `request.jwt.claims` col suo `auth_id`),
   non leggendo il codice: dal ruolo postgres RLS non si vede, e dal JSX
   nemmeno. **È il modo di provare una policy senza password e senza browser,
   e va riusato.**

Verificato per ruolo, dentro una transazione annullata:

| | legge scalate e passi | crea una scalata | tocca un passo | mette un flag |
|---|---|---|---|---|
| **utente** | ✅ sì | ✅ respinto | ✅ respinto | ✅ respinto |
| **admin** | ✅ sì | ✅ può | ✅ può | ✅ può |

⚠️⚠️ **La tabella 7/6/15 del briefing non è una formula: sono tre numeri che
valgono solo a quota 2,00 esatta.** Sotto però c'è una logica che si
generalizza, ed è quella da implementare: **i pavimenti**. Dopo ogni passo
vinto il peggio che può succedere è **−3, poi +3, poi +18** (in unità sulla
posta iniziale di 10). Da lì l'accantonamento si ricava a qualunque quota.
✅ **Sciolto il 21/10 fissando la quota minima a 2,00.** La domanda era: cosa
fare quando la quota non basta a riempire il pavimento (a 1,70 il primo passo
incassa 17, il pavimento ne chiede 7 e ne restano 10 da rigiocare — la scalata
non cresce). La risposta di Mattia non è stata una delle due che avevo
proposto: **ha alzato la quota minima**, e così il caso non si presenta.
⚠️ **Resta vero sotto 2,00, e il codice lo tratta senza inventare**: il
pavimento prende quello che c'è (la percentuale è limitata a 100) e il passo
dopo recupera il resto, perché i pavimenti sono cumulativi. La card avvisa
**quanto** manca alla quota minima.

### ⚠️⚠️ La misura, fatta il 22/10/2026 con la selezione di Mattia

`prova-scalata.js --stagioni=8 --quota=2.0 --soglia=0.68 --scelta=0.66`, cioè
**attendibilità ≥ 68% OPPURE scelta ≥ 66%**, gamba ≥ 1,30. 260 weekend.
⚠️ Lì un passo = **un giorno** (l'archivio non ha l'ora), quindi è la lettura
conservativa.

```
quota 2,00 →  576 passi · 2,80 gambe · quota media 2,459 · vince 42,2% · resa 103,1%
```

⚠️⚠️ **Il 103,1% NON è un guadagno: il margine è ±10 punti** (576 passi a quota
2,46). Dice la stessa cosa di tutte le altre righe — **circa 98-100%** — e la
selezione più stretta **non ha migliorato il passo**: con att ≥ 60% la resa a
2,00 era 100,8%, con att ≥ 68% _oppure_ scelta ≥ 66% è 103,1%, cioè lo stesso
numero dentro il rumore. **Il materiale però cala**: 576 passi invece di 723.

**E la scalata intera, 149 scalate:**

| | |
|---|---|
| muore al 1° passo | **60%** |
| passi vinti di fila | 0→89 · 1→42 · 2→13 · 3→4 · 4→1 |
| rientra la posta | 28% |
| risultato | mediana **−1,00** · media −0,61 · migliore +43 · peggiore −11 |
| bankroll per stagione (da 100) | 69 · 41 · 102 · 46 · 37 · 84 · 27 · 84 → **mediana 69**, in utile **1 su 8** |

⚠️⚠️ **Il vincolo "in due giornate rientra il capitale" si avvera il 12% delle
volte** (18 scalate su 149 hanno vinto due passi), perché per rientrare bisogna
**prima** vincerli. Il pavimento garantisce *quanto* si mette via, non che ci
si arrivi.
⚠️ **I pavimenti non cambiano il segno, cambiano la forma**: con una resa per
passo attorno al 98-100% nessuna regola di accantonamento crea margine — è la
stessa frase scritta per le due regole vecchie, e vale identica per questa.
Quello che comprano è *perdere poco spesso e vincere molto di rado*.
⚠️ **Resta la disputa aperta**, ed è il motivo per cui la pagina salva tutto:
questa misura è sulla selezione **meccanica**. Mattia sceglie a mano, e solo il
registro può dire se fa meglio del 98%.

### ⏸️ D — La Scalata Satellite, in attesa

Si attiva **solo** dopo un 4° passo vinto, finanziata con 10u del profitto.
⚠️ **Scatta nel 6,5% dei cicli**, e nella simulazione su otto stagioni il
quarto passo **non è mai arrivato** (*passi vinti di fila: 0→57 · 1→21 · 2→8 ·
3→2 · **4→0*** su 88 scalate). È una funzione che si vedrebbe forse una volta
l'anno: per questo è l'ultima.
⚠️ Il **«rischio ZERO»** del briefing è contabilità mentale: vinte, quelle 10u
sono bankroll come le altre. La perdita massima di 10u **è** corretta (i passi
1-3 rigiocano solo vincite), ma l'EV resta negativo: si converte un profitto
realizzato in uno atteso un filo più basso, in cambio di varianza.
⚠️ Serve una colonna nuova (`tipo` o `madre_id` su `scalate`), quindi una
migrazione: un motivo in più per non farla finché la Madre non ha girato.


## 📋 LE DIECI IDEE DI MATTIA — 21 ottobre 2026 (notte)

Consegnate in blocco. **Verificate una per una prima di scriverle qui**: tre
esistevano già in tutto o in parte, e una non è un'idea ma un dato vecchio.
⛔ Nessuna è stata sviluppata: si decide l'ordine con Mattia.

| | voce | stato verificato |
|---|---|---|
| **1** | **Road to weekend: aggiungere partite a mano** | 🆕 da fare — **la più urgente, lo dice lui** |
| 2 | La linea spessa nella scheda + data/ora più piccole | 🆕 trovata la riga esatta |
| 3 | Barra dei campionati fissa, tipo Time Machine | 🆕 da progettare |
| 4 | Filtri: via «voto minimo», dentro «scelta» con `+`/`−` | 🆕 il filtro esiste, va sostituito |
| 5 | Le finestre come card 2×2, con «Domani» | 🆕 «Domani» **oggi non esiste** |
| 6 | API di ESPN | ⚠️ **ESPN è già collegato e funziona** |
| 7 | Il campionato a sinistra nelle spin | 🆕 c'è, ma dopo il nome |
| 8 | Non si vedono le leghe minori (Serie B) | ⚠️ **non è il codice: i dati sono fermi al 15/10** |
| 9 | Spin a quota minima | ✅ **esiste già** |
| 10 | Creatore di schedina | ⚠️ **esiste da terminale**, non in app |

### 1 · Road to weekend, partite a mano — la priorità

Un tasto **«+ aggiungi manualmente»** che apre una ricerca *«cerca squadra o
campionato…»*, con sopra i filtri **votate · scelta · attendibilità**. La lista
colorata **per distanza nel tempo**: bianco le più vicine, poi verde, giallo,
arancione, rosso, viola, blu. ⚠️ **La stessa scala va usata anche nella
scaletta** sotto.

⚠️ Non si parte da zero: **`components/ScegliCasella.jsx` fa già ricerca +
filtri + finestra al centro** per le spin, ed è il modello che Mattia cita.
Prima di scrivere un terzo selettore di partite (ce ne sono già due,
`ScegliCasella` e `SceltaPartita`) va deciso se si allarga uno dei due.
⚠️⚠️ **Oggi il `+` della scalata fa un'altra cosa**: tira su la prima gamba del
passo successivo. Non va sostituito — è come si arriva alla quota minima quando
una fascia ha una gamba sola. Il tasto nuovo è un secondo gesto, non lo stesso.
⚠️ La scala a sette colori **è la prima cosa dell'app che codifica il tempo con
un colore**: oggi il colore dice la categoria (centro/giallo/blu) o l'esito. Due
significati sullo stesso canale nella stessa schermata vanno pensati insieme,
non aggiunti di slancio.

### 2 · La linea spessa, e perché si è notata proprio adesso

`DettaglioPartita.jsx:144`: `borderTop: 2px solid alpha(c.colore, 0.35)`, sopra
la barra dei cinque numeri.
⚠️ **Si è fatta notare oggi per colpa mia**: per le partite senza categoria
`c.colore` era `fantasma` (2,27:1, quasi invisibile) e il 21/10 l'ho portato a
`spento` (6,97:1) perché vestiva anche il pronostico, che si deve leggere. La
linea è la stessa di prima, è il colore che è salito. Va tolta o riportata a
`bordoTenue`, e **non ribaltando la correzione sul pronostico**.
Insieme: data e ora nella scheda scendono da `S.grande`.

### 3 · La barra dei campionati, tipo Time Machine

Una barra fissa a destra per saltare da un campionato all'altro.
⚠️ Da progettare con attenzione: su 375px una colonna fissa a destra toglie
larghezza ai **nomi delle squadre**, che il 21/10 sono già stati tarati al
pixel sulla larghezza disponibile (`BOURNEMOUTH` = 8,774px per px di corpo).
Prima di disegnarla va deciso **cosa si restringe**.

### 4 · I filtri

Via **«voto minimo»** (`votoMin` in `PartitePage`, filtro e targhetta), dentro
**«scelta»** con i tasti `+` e `−`. ⚠️ `TastoRipeti` esiste già in `ui.jsx` e si
tiene premuto: è lo stesso pezzo di Andamento e del bankroll della scalata.

### 5 · Le finestre come card

Oggi sono quattro pastiglie in fila (`FINESTRE` in `lib/attendibilita.js`):
`Oggi · Fino a lunedì · Anche la prossima · Tutte`.
⚠️ **«Domani» non esiste**: va aggiunta alla lista, non è solo grafica.

### 6 · ESPN — attenzione, c'è già

⚠️⚠️ **L'integrazione ESPN esiste, è viva e porta i risultati in giornata**:
`btscout/scripts/importa-espn.js`, 59 alias scritti a mano, la pagina
**Importazioni** per i casi dubbi, e `partite.fonte` che dice da dove viene ogni
riga. È stata costruita il 12/10/2026 proprio perché football-data era rimasto
tre settimane indietro.
**Prima di rifare qualcosa va chiarito cosa non funziona**, perché «il
collegamento diretto non funziona» non corrisponde a quello che c'è scritto qui.
⚠️ Quello che ESPN **non** dà sono le quote, e non è un difetto: quelle restano
football-data e The Odds API.

### 7 · Il campionato a sinistra nelle spin

`SpinProvvisoriePage.jsx:58` e `:334` mostrano già `sigla(div) · giorno`, ma
**dopo** il nome delle squadre. Va spostato a sinistra.

### 8 · Le leghe minori — NON è un difetto del codice

Misurato il 21/10:

```
oggi ................................ 21/10
ultimo scarico quote ................ 15/10, 16:16
ultima partita giocata in archivio .. 14/10
```

⚠️⚠️ **L'archivio HA le leghe minori** — stagione in corso: E1 119 partite,
SP2 99, B1 72, F2 72, D2 63, **I2 60**, SC0 48, T1 27 — **ma il calendario no**:
le 67 future coprono solo 7 prime divisioni (SP1, E0, I1, D1, F1, N1, P1).
Il motivo più probabile è che **la routine non gira da sei giorni**, e
`prossime_partite` è la fotografia di quel singolo scarico.
✅ **Prima cosa da fare: `node --env-file=.env scripts/aggiorna.js --esegui`**
e ricontrollare. Se dopo l'aggiornamento la Serie B continua a mancare, allora
è un difetto e si cerca in `importa-prossime.js` / `importa-prossime-odds.js`.
⚠️ Probabilmente spiega anche la pagina **Andamento** vista vuota il 21/10:
`andamento` si ricalcola in coda all'importazione.

### 9 · Spin a quota minima — c'è già

✅ **`components/CompilaPerQuota.jsx`**, tasto *«compila per quota»* nelle Spin
provvisorie: si dà la quota minima e riempie **le caselle vuote** con le più
attendibili che pagano almeno quanto chiedi, mostrando prima quante partite
restano e da che attendibilità si parte.
**Da capire con Mattia cosa manca**: forse che compili una spin **intera** da
zero invece delle sole caselle vuote.

### 10 · Creatore di schedina — esiste, ma da terminale

⚠️ `app/scripts/schedina-weekend.js --quota=5` fa **esattamente questo**: dalla
quota desiderata sceglie le migliori del weekend e compone la schedina. Il
lavoro quindi non è inventare il criterio — **è portarlo a schermo**, e il
calcolo sta già in `src/lib/`, cioè è usabile dal browser senza riscriverlo.


## 🔵 Lotto Q — URL veri per le pagine (routing)
*Da un briefing del secondo cervello: `briefing/2026-10-12-routing-v1.0.md`.
Valutato il 12/10/2026, **non sviluppato**: la risposta completa sta in
`briefing/risposte/2026-10-12-routing-v1.0-risposta.md`.*

23. **Ogni pagina ha il suo indirizzo.** Oggi `AppShell` tiene
    `useState('dashboard')` e uno `switch` di nove casi: l'URL non cambia mai,
    quindi non si condivide un link, il tasto indietro non fa niente e **ogni
    ricaricamento riporta alla Dashboard**.
    Rotte: `/` · `/slot` · `/reporting` · `/bilancio` · `/partite` ·
    **`/partite/:id`** · `/provvisorie` · `/votate` · **`/votate/:id`** ·
    `/storico` · `/utenti` · `/login`.
    **Fattibilità alta**: la navigazione è centralizzata in un punto solo
    (`App.jsx` 216 righe, `TabBar` con `onChange`, `Menu` con `onVai`), quindi
    si tocca un file e due componenti. Stima **mezza giornata**.

    ✅ **Verificato il 12/10:** `vercel.json` non esiste da nessuna parte · la
    **Root Directory su Vercel è `app`**, quindi il rewrite va in
    **`app/vercel.json`** · l'URL condiviso al gruppo è quello **di
    produzione**, quindi vedrà il lavoro.

    ⚠️ **Da decidere prima di partire — un link condiviso scade.**
    `usaProssime` carica solo `data >= oggi`: un link mandato venerdì funziona
    domenica, ma **martedì la partita non è più nella lista** e la scheda non si
    apre. O un messaggio *"già giocata"*, o si recupera la riga da `partite`
    (dove resta per sempre). **Senza una delle due è la prima segnalazione che
    arriva dal gruppo.**

    ⚠️ **`/votate/:id` serve quanto `/partite/:id`**: anche `VotatePage` apre la
    stessa scheda col suo `apertaId`. Il briefing non lo citava.

    ⚠️ **Le pagine solo-admin non si difendono da sole, ma RLS tiene.**
    `SpinProvvisoriePage` non ha nessun controllo su `isAdmin`, `UtentiPage` solo
    cosmetici. Con gli URL diventano digitabili — però `griglia_write`
    (`sql/02`) richiede admin/superadmin e `crea_utente` & co. chiamano
    `esigi_superadmin()` dentro la funzione. Quindi il guard serve alla
    **chiarezza, non alla sicurezza**: senza, un utente normale preme "Compila
    spin" e **non succede niente in silenzio** (RLS blocca senza errore).
    ⚠️ **Manca una prova**: `prova-permessi.js` verifica che l'utente normale
    *legga* la griglia, non che **non la scriva**. Tre righe, da aggiungere con
    questo lotto.

    ⚠️ **Il guard deve aspettare `booting`**: la struttura giusta c'è già
    (`if (booting) return <CARICAMENTO…>` prima di tutto), va solo conservata —
    il rischio è metterci un `<Navigate to="/login">` sopra e far lampeggiare
    il login a ogni refresh.
    ⚠️ **Mai `navigate()` dentro `onAuthStateChange`**: stesso lock di
    supabase-js che ha già bloccato il login una volta. La navigazione dopo il
    login si fa dal componente, reagendo al cambio di `currentUser`.
    ⚠️ **`<Link>`, non `onClick` + `navigate()`** su TabBar e menu: genera un
    `<a href>` vero, quindi funziona anche "apri in nuova scheda". (Lezione
    arrivata da IIRF, dove la mancanza è rimasta nascosta per mesi.)

    **Fuori da questo lotto, per scelta:** i filtri nell'URL (otto stati in
    `PartitePage`: raddoppiano il lavoro, è il lotto dopo), le sotto-viste
    modali (`casella`, `perQuota`, `confirmReset`: sono dialoghi, non pagine),
    il dominio personalizzato, altre librerie oltre al router.

    ❌ **Il briefing sbagliava su un punto**, corretto nella risposta: diceva che
    il gesto "torna indietro trascinando" non esiste nel codice. **Esiste**
    (`hooks/usaIndietro.js`, usato da `SchedaScorrevole`): la ricerca cercava
    `onTouchStart`, ma il gesto è agganciato a mano con
    `addEventListener('touchmove')`. E il ripristino dello scorrimento non c'è
    **di proposito**, tolto il 7/10 perché la lista non viene più smontata.
    **STATO.md era corretto, non va cambiato.**

## 🔵 Lotto N — Il voto unico della partita
*`btscout/scripts/` (misura storica) → poi `lib/`.*

14. **Definire il voto.** Deciso il 10/10/2026 discutendone: il voto finale
    **resta una probabilità**, non una media di indici.
    `voto = attendibilità ± correzione del campo (VPM)`, con la correzione
    limitata a pochi punti.
    ⚠️ **Perché non una media dei tre** (e i conti che lo dicono): nove esiti si
    **moltiplicano**, quindi la probabilità deve dominare. Tutte e 9 all'80% →
    P(9/9) = **13,4%**; al 76% → **8,5%**; al 72% → **5,2%**; al 65% →
    **2,1%**. Sulla spin 1 del 9/10 (P(9/9) = 8,5% con le attendibilità vere),
    mettere al centro una partita al 47% costa **−37%** sulla probabilità di
    tutta la spin.
    ⚠️ **La quota esce dalla selezione**: il Grado la contiene al 30% di
    proposito, e dentro un voto di selezione direbbe "accetta una casella meno
    probabile se paga di più" — su un accumulator da nove è il contrario di
    quello che conviene, perché le probabilità si moltiplicano e la quota la si
    incassa solo se vince tutto. La quota risponde a *quanto punto*, non a
    *cosa gioco*.
    ⚠️ **Una media di indici non è monotòna nella probabilità di vincere**: un
    7,8 può essere "78% con VPM mediocre" o "62% con VPM 9,5", due rischi
    diversissimi, e una soglia su quel numero non governa più niente.
15. **Misurare VPM nel passato, prima di pesarlo.** Si può: 53.973 partite con
    risultati e gol, tiri in porta sul **94,7%** dell'archivio, consenso di
    apertura su **37.910**. Si ricostruisce VPM **com'era il giorno prima** di
    ogni partita giocata e si risponde a una domanda sola: *fra le partite sopra
    soglia, quelle dove il campo era d'accordo col mercato hanno vinto più
    spesso di quelle dove dissentiva — e di quanti punti?*
    ⚠️ **Col consenso di APERTURA e il VPM di quel giorno**: usare dati che
    allora non c'erano è il modo classico di scoprire che un sistema funziona
    fino a quando lo si gioca (vale la trappola apertura/chiusura già scritta in
    CLAUDE.md).
    ⚠️ Se la risposta è **zero**, lo si scopre prima di costruirci sopra — e
    sarebbe coerente con quello che l'archivio ha già detto sulla forma
    (`misura-forma.js`).
15b. [x] **Backtest A1 — fatto il 10 ottobre 2026, e ha cambiato le priorità.**
    `btscout/scripts/misura-resa-favoriti.js`, 37.871 partite.
    - **Le quote corte sono l'unica fascia che non perde**: 1,30-1,45 →
      resa **99,8%** [97,5 … 102,1] su 2.733 partite. Tutti i favoriti insieme:
      **95,3%**; la fascia 1,70-2,00: **94,3%**. È proprio la fascia della SOFT.
    - **Il favourite-longshot bias si vede**: in 1,35-1,40 l'attendibilità
      diceva 69,1% e il favorito ha vinto **72,5%**.
    - ⚠️ **La scoperta vera**: le stesse 2.733 partite a tre prezzi — Bet365
      99,8%, media di mercato 100,3%, **massima di mercato 103,2%
      [100,9 … 105,6]**, il solo valore significativamente sopra 100.
      **Il vantaggio sta nel prezzo, non nella selezione**: +3,4 punti solo
      cambiando book, più di quanto possa aggiungere qualunque indice.
    - ⚠️ **Da verificare prima di costruirci sopra**: su quali book Mattia può
      davvero giocare. La massima di mercato è un prezzo che bisogna POTER
      prendere, e i book che pagano di più limitano i vincenti.
    - Conseguenza sul piano: **la voce 15 (misurare VPM nel passato) scende di
      priorità**. Prima si capisce quanto prezzo si può recuperare, perché quei
      3,4 punti sono più grandi di qualunque correzione.

15c. [x] **Backtest A2 — Mattia gioca su Bet365** (10/10/2026). Il +3,4 della
    massima non è suo, quindi: c'è un sottoinsieme di Bet365 sopra 100?
    - **No, e non è dimostrabile.** "Bet365 paga più della media" dà 101,2%
      [96,9 … 105,6]; attendibilità 65-70% dà 101,3% [98,4 … 104,3]. Nessuno
      significativo.
    - ⚠️ **Il limite è l'archivio, non il criterio**: per dimostrare +2% servono
      **3.553 scommesse**, la fascia ne ha **2.733 in otto stagioni**. Il
      vantaggio minimo visibile è **±2,3%**. Un vantaggio vero del 2% resta
      invisibile — quindi **nessun backtest su questi dati può validare una
      selezione**, e va detto prima di chiederglielo.
    - ⚠️ **Il CLV è negativo (−3,15% contro l'exchange di chiusura) ma è una
      misura sbagliata per questa fascia**: la chiusura implica 70,5% e il
      favorito ha vinto 72,7%, quindi prevedeva resa 96,8% contro il 99,8%
      reale. Il bias sui favoriti sopravvive alla chiusura. **Il CLV resta
      valido solo dove è stato validato** (valore a quota media 6).
    - **Conclusione**: sui favoriti corti a Bet365 si gioca **alla pari**
      (99,8% ± 2,3). I guadagni dimostrabili sono **strutturali**: quote corte
      invece di lunghe (+5,5 punti) e **una partita per volta** invece di due o
      tre. La selezione serve a **escludere**, non a creare margine.

16. **Trovare il voto minimo da giocare**, misurato: sopra quale voto le spin
    pagano. È la domanda che un output unico rende rispondibile e che oggi, con
    tre indicatori e una soglia su uno solo, non lo è.

## 🔵 Lotto O — Il metodo di giocata
*Dopo il lotto N, e senza toccare le spin.*

17. **La "scala a recupero"** — definita con Mattia il 10/10/2026. Nome suo il
    concetto, mio il nome. Tre versioni, **base 20 € per tutte** (per poterle
    confrontare, e perché con base 10 la SOFT non sale: l'arrotondamento per
    eccesso dell'accantonamento si mangia il primo passo).

    | | passo | quota | probabilità | resa |
    |---|---|---|---|---|
    | **SOFT** | 1 partita | 1,35-1,40 | ~72% | ~99% |
    | **MEDIUM** | fino a 2 | 1,70 | ~58% | ~98% |
    | **HARD** | fino a 3 | ≥ 2,00 | ~47% | ~97% |

    **L'accantonamento è una percentuale dell'UTILE del passo, arrotondata per
    eccesso** (verificato sull'esempio di Mattia: 10 a 1,70 → 17, utile 7, il
    65% è 4,55 → accantona 5, rigioca 12). La scaletta:
    `65% · 35% · 35% · 30% · 30% · 25% …`. La cassa assorbe anche la frazione
    non giocabile, perché le puntate sono a euro interi.
    Vocabolario: **la cassa** (l'accantonato, intoccabile) · **fase di
    recupero** finché la cassa non copre la base · **fase di corsa** dopo.

    ⚠️ **Tutte e tre rompono il pari esattamente a resa 100%** — calcolato, non
    stimato. La progressione, la scaletta, il numero di passi: **nessuno sposta
    il punto di pareggio**. La scala **ridistribuisce il rischio, non crea
    vantaggio**. Serve solo a raccogliere quello che la selezione trova.
    ⚠️ **Sotto il 100% HARD sanguina 2,5 volte più di SOFT** (−10,6% contro
    −5,0% per ciclo con base 20), perché ogni partita in più moltiplica il
    margine del book — la resa di una combinata è il **prodotto** delle rese.
    Sopra il 100% sono quasi uguali (+5,3% SOFT, +3,9% HARD a resa 101%).
    **Quindi SOFT domina: stesso guadagno possibile, metà della perdita.**
    Quello che HARD dà in cambio è la velocità: recupera la base al **2°** passo
    (47% dei cicli) invece del **5°** (26%), e se cade al secondo hai perso 6 €
    invece di 14. È una scelta di temperamento, non di matematica.
18. [x] **Backtest delle tre versioni — fatto il 10 ottobre 2026.**
    `btscout/scripts/backtest-scala.js`, otto stagioni, VPM ricalcolato per ogni
    partita con le sole partite precedenti. Vincoli dati da Mattia: bankroll
    200 €, dalla 5ª giornata, **una giocata per turno e due turni per weekend**
    (venerdì-sabato e domenica-lunedì, perché il secondo passo vuole il
    risultato del primo).

    **Tre cose hanno cambiato il risultato, in ordine di peso:**

    1. ⚠️ **La base va in percentuale del bankroll, non fissa.** Con 20 € fissi
       la SOFT **si azzera in 2 stagioni su 7** (dopo 47 e 52 turni); con
       **base = 10% del bankroll** non si azzera mai, in nessuna versione, e la
       media sale. Una scala morta costa sempre la stessa frazione.
    2. ⚠️ **Si scegli per RESA, non per attendibilità.** Stesso tutto il resto:
       per resa **299 €** di media, per attendibilità **183 €**, per VPM 212 €.
       Non è una fortuna trovata provando: la resa **è** il rendimento atteso
       per euro, quindi scegliere per resa è scegliere la giocata che rende di
       più. Scegliere per attendibilità prende le più probabili, che stanno
       sulle quote più corte — quelle con la resa peggiore (1,7 punti per gamba).
    3. ⚠️ **Chiudere la scala a 6 passi batte il lasciarla correre.** Senza
       tetto la SOFT scende da 183 a 142 €: se non si chiude mai, la scala muore
       sempre, e muore con una posta più grossa. Da 2 a 6 passi è tutto uguale
       (178-183), oltre peggiora.

    **Il risultato della SOFT** (base 10%, scelta per resa, 6 passi), da 200 €:
    `122 · 454 · 218 · 97 · 151 · 470 · 581` → **mediana 218 €**, media 299 €,
    peggiore 97 €, **mai azzerata**, punto più basso toccato 75 €. Quattro
    stagioni su sette sopra i 200. Gioca 62-67 turni su 80 e apre ~20 scale.

    **MEDIUM** mediana 177 € (3/7 in attivo) · **HARD** mediana 109 € (1/7).
    SOFT vince in ogni configurazione provata.

    ⚠️ **La fascia 1,35-1,45 — quella scelta da Mattia prima di qualsiasi test —
    è la migliore su sette provate** (mediana 218; le altre 76-196). Allargare
    verso l'alto peggiora sempre.

    ⚠️⚠️ **Trappola trovata strada facendo, da non ripetere:** guardando la
    **media** invece della mediana, la fascia 1,50-2,20 sembrava fare 1.158 € e
    la HARD 1,35-1,45 1.026 €. Erano **sei stagioni su sette in perdita più una
    scala fortunata** (7.549 € e 6.606 €). **Con sette stagioni si guarda la
    mediana**, e si apre sempre il dettaglio per stagione.


## 🔵 Lotto E — Le spin
*`SlotPage.jsx`, `SpinProvvisoriePage.jsx`, `lib/spin.js`, `rendiconto.js`.*

5. **Riempire le spin 1 e 2 in griglia.** ⚠️ **Metà fatta da sola**: l'8/10 la
   griglia è risultata **completamente vuota** (`updated_at` 7/10 16:45, le
   prove del lotto I), quindi i dati del 20/09 con `1X` e `X2` e la cella
   storpiata **non ci sono più**. Resta da riempirle, ed è un clic da "Spin
   provvisorie". `scripts/prova-spin.js` mostra prima cosa scriverebbe.
   (24 voti, tutti deliberati — Marco 14, Admin 9, Nico 1.)
   ✅ **Il problema delle date è chiuso l'8/10 con un blocco** (voce 5b).
   - ⚠️ **Resta da decidere la spin 2**, che scende sotto soglia: West Ham-QPR
     al **61,9%** e Cercle Brugge-Anderlecht al **47%** (quota 2,05) entrano
     perché votate da Admin, e stanno davanti a PSV-Heerenveen al 76,2% che non
     ha stelline. È la regola voluta — la stellina scavalca la soglia — ma è la
     prima volta che si vede l'effetto su una spin intera. Mattia valuta dopo
     questo weekend, quando quelle votate avranno risposto.

5b. [x] **Il blocco del weekend** — fatto l'8 ottobre 2026. Mattia: *"il
   problema delle settimane mi fa molta paura"*.
   - `martediChiusura()` in `lib/attendibilita.js`: in una spin entrano **solo**
     le partite fino al **martedì che chiude il weekend**, compreso. Da
     mercoledì il limite è il martedì dopo; il martedì chiude sé stesso.
   - ⚠️ **È un blocco in `candidate()`**, quindi vale per tutte le strade:
     anteprima, "compila spin", "compila per quota" (quella pescava da **tutte**
     le future e il limite non lo vedeva affatto) e la scelta a mano di una
     casella. **Nemmeno una stellina lo scavalca**: la soglia è un giudizio su
     quella partita, la data è un vincolo sulla spin intera.
   - **Via la scelta della finestra** dalle Spin provvisorie (e `finestraUtile`
     con lei): si poteva allargare a "tutte", ed era proprio da lì che i due
     weekend entravano nella stessa spin. Al suo posto una riga fissa con il
     lucchetto che dice il limite.
   - **Le votate tagliate si vedono**, in un riquadro rosso con nomi e date: un
     voto che non produce niente, in silenzio, sembra un difetto. Oggi sono
     Man City-Ipswich e Bayern-Leipzig del 17/10. In "LE VOTATE" la targhetta
     dice `⛔ oltre martedì`, in rosso.
   - **In griglia (Slot) è un avviso, non un blocco**: là la data è testo
     `gg/mm` senza anno, quindi si misura l'**ampiezza** fra la prima e
     l'ultima casella (oltre **4 giorni** → banner rosso) e si deve poter
     correggere a mano. Provato anche il salto di capodanno (30/12 → 02/01 non
     allarma).
   - **Verificato** con `scripts/prova-spin.js`: la spin 1 è passata da
     "otto partite del 10-11 più due del 17" a **un weekend solo**.
   - ⚠️ **Schermata nera subito dopo**: era rimasta una riga
     `const lunedi = lunediProssimo(0)` con l'import già tolto. `vite build`
     passava, la pagina lanciava `ReferenceError` al render. Corretta
     (1.01.01), e da lì è nato `npm run lint`. **Provato da Mattia: funziona.**


## 🔵 Lotto F — Dati e automazione
9. **Installare l'aggiornamento automatico** (`btscout/aggiornamento.plist`,
   launchd martedì e venerdì 18:30): pronto, servono due comandi. Negli ultimi
   dieci giorni l'aggiornamento è stato chiesto tre volte e due sono fallite
   per la rete.
10. **Lanciare il rendiconto ogni settimana** dopo l'aggiornamento, e annotare
    la riga.
11. **Il pulsante "Aggiorna" nell'app**: serve una Supabase Edge Function. Meno
    urgente ora che l'aggiornamento si fa in chat o da launchd.

## 🔵 Lotto M — Quando si riprenderanno i backtest
12. **`backtest.js` e `s1`-`s6` sono fermi alla vecchia fase** e marcati in testa
    al file. I quattro che usano `ps_*` (backtest, s2, s5, s6) **perdono la
    stagione in corso in silenzio**, perché Pinnacle non esiste più dalla 26/27:
    da passare a `bfe_*` o `avg_*` **prima** di rifidarsi dei numeri.
13. **Simulare il criterio sullo storico** prima di cambiarlo ancora: ogni
    modifica alle regole (soglie, over, Grado) si può provare sulle 37.910
    partite con il consenso di apertura, invece che a sensazione.

## Da decidere, non da fare
- **Le spin esistenti si migrano o si riparte puliti** (voce 8).
- **Vietare i bankroll negativi** nel database (`check (bankroll >= 0)`) o
  tenerli come segnale d'allarme.
- **Gli arrotondamenti di `calcSchedule`**: si perde il 3-4% della base. Toccarli
  sposta gli importi giocati davvero — decide Mattia, non è una pulizia.
- ~~**Ambiente di prova su Vercel**~~ — **scartato il 7/10**: `npm run dev` più
  `npm run build` prendono quasi tutto, e il preview costerebbe tre passaggi in
  più a ogni modifica. Copre solo le differenze di ambiente (la schermata nera
  di settembre), che ora non si ripetono perché le chiavi hanno un valore di
  riserva nel codice. **L'abitudine che lo sostituisce: dopo ogni push, aprire
  il sito e controllare che carichi.**

---

# ✅ Fatto di recente


## 🔵 FASE 5 — Il pulsante Aggiorna nell'app

- [x] ~~Menu ad hamburger~~ → fatto con la fase 6.
- [ ] **Voce "Aggiorna dati"**: lancia l'import dello storico e delle partite
      future dall'app, senza terminale.
- [ ] **Nodo tecnico da risolvere prima.** Gli import sono script Node che
      girano sul Mac di Mattia: un pulsante nell'app non può eseguirli. Servirà
      una **Supabase Edge Function**. Non serve più per gli account (vedi fase 9).

**Nel frattempo, due strade che funzionano già (23/09):**
1. **In chat**: basta chiedere, e l'aggiornamento parte da qui. Fatto il 22 e
   il 23 settembre.
2. **Automatico**: `btscout/aggiornamento.plist`, launchd martedì e venerdì
   alle 18:30, log in `btscout/aggiornamento.log`. **Pronto ma non installato**
   — servono due comandi e la decisione di Mattia. Se il Mac è spento all'ora
   prevista, launchd recupera alla riaccensione.

---


## Nodi da decidere

1. ~~Quali campionati aggiungere~~ — deciso: i 9 paesi che Mattia seguiva + Scozia.
2. **Con che cadenza scaricare le partite future** (fase 4): a mano martedì e
   venerdì, o schedulato. Lo script c'è; manca chi lo lancia.
3. **Quando fare la Edge Function** (fase 5): ormai serve solo all'aggiornamento
   dati — gli account passano dalle funzioni SQL (fase 9).
6. **Account (fase 9)**: chi può creare e resettare (solo superadmin o tutti
   gli admin); password solo hashate o anche in chiaro.
4. **Le spin esistenti si migrano o si riparte puliti** (fase 7).
5. **Vietare i bankroll negativi** a livello di database (`check (bankroll >= 0)`)
   o tenerli come segnale d'allarme.

---

## 🧹 Debito tecnico

- [x] ~~**Annidamento `BetterTrade/bettertrade/`**~~ — risolto il 25/09/2026:
      `bettertrade/` è diventata `app/`. Il repo si chiama BetterTrade, la
      cartella dell'app no: niente più nomi ripetuti. ⚠️ Ha richiesto di
      cambiare la *Root Directory* su Vercel.
- [ ] **README.md vuoto** (contiene solo `# BetterTrade`).
- [ ] **`btscout/CLAUDE.md` e `btscout/STATO.md`** parlano ancora di BTScout come
      progetto a sé. Da fondere quando l'archivio si sposta (fase 1).
- [ ] **`btscout/api/` + `index.html`**: una PWA di chat standalone, mai
      deployata. Se non serve, si cancella.
- [ ] **`calcSchedule` arrotonda a zero** — i `Math.floor` in `AuthContext.jsx`
      producono €0 su tutte le voci quando la base è bassa. Correggerlo cambia
      gli importi giocati: è una decisione, non una pulizia.
- [ ] **Nessun ambiente di prova su Vercel.** Ogni push va in produzione: è già
      costato una schermata nera. Un branch di anteprima costa poco.
- [ ] **History git sporca** — vecchi commit `Add files via upload` dalla UI web.

---

