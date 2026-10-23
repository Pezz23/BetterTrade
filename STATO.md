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
**1.52.01** · ultimo commit `28322a1`

## ▶️ DOVE SIAMO — 22 ottobre 2026, leggi questo per primo

**Tutto il lavoro del 21-22 ottobre sta su ROAD TO WEEKEND**, e la sera del 22
si è spostato su **BET BUILDER** e **PARTITE**. Il restyling è chiuso (il
blocco più sotto è storia): la pagina della scalata è lo strumento del
weekend, il Builder quello delle schedine personali, e Partite ha preso la
barra dei campionati.

⚠️ **Versione a schermo: `1.54.00`.** Il 22 sera sono passati sette commit
senza che il contatore si alzasse — se succede di nuovo, sul telefono non si
distingue il lavoro di oggi dalla cache di ieri.

⚠️⚠️ **Ci sono 8 commit non pushati** (da `c5e4e95` a questo). **Il push è
sempre di Mattia**: se la prossima sessione li trova lì, non sono dimenticati,
aspettano lui.

### Cos'è cambiato, in ordine

| | commit |
|---|---|
| **Scalata madre**: un metodo solo (pavimenti), quota schedina **2,00**, schedine spezzate da sé appena superano 2,00, spezza a mano fra due gambe | `ea6fd16` |
| **«quota gamba ≥»** come quarto filtro, e il ricarica rosso | `57a898e` |
| **La scheda partita si apre dal Weekend**, toccando i nomi | `43af87b` |
| **⚑ Flag**, **«+ aggiungi partita manuale»**, **pagina aperta a tutti in sola lettura** | `1edae37` |
| **Lotto 1**: soglia consigliata a **61%** (rimisurata), **preferenze salvate** (gli admin condividono una riga, gli utenti hanno la loro), **casse e archivio solo agli admin** | `23fa6f9` · `ac4fe13` |
| **Lotto 2**: le quattro rifiniture viste, la testata della partita su tre righe, e `guarda.mjs` che impara a misurare gli **accavallamenti** | `a542cf9` · `a095ce0` · `6bf1468` · `ab682e1` |
| **Istruzioni alleggerite**: CLAUDE 202→23 kB, STATO 220→47 kB, lo storico in `STORICO.md` e gli approfondimenti in `note/` | `c6c0077` |
| **Il VOTO diventa una pagella 0-10** coi pesi misurati, e `andamento` ricalcolata su 8 stagioni | `60ffca7` |
| **🎟️ BET BUILDER**: schedine a quota obiettivo, **private per utente** (`sql/36`-`38`), con esito · importo e vincita · filtri nel registro · partite scartate · quota correggibile. Slot scende nel menu, il Builder prende il suo posto in basso | `946af5d` → `28322a1` |
| **🧰 Tagliando**: via il codice orfano del voto vecchio e una copia di `iniziaDopo` | `c5e4e95` → `76b7c60` |
| **🎟️ Bet Builder, il secondo giro**: `ATTIVE \| ARCHIVIO` coi dieci secondi, i **filtri che restano**, il filtro **«fino a lunedì»** e **＋ aggiungi partita** (la finestra di Road to weekend, con `S3` al posto di `P3`) | `3368fed` |
| **Tab bar più alta due volte** (Siri sul bordo dell'iPhone): ~49 → ~65px, e `--barra-bassa` 62 → 78 | `60863c6` · `d291d7d` |
| **🏴 LA BARRA DEI CAMPIONATI** a destra, fissa — e i filtri delle Partite rifatti sui **quattro indicatori** | `6bf18ae` |

Le migrazioni applicate in questi due giorni: **`sql/31`** (numero del passo
decimale, per inserirne uno in mezzo), **`sql/32`** (il metodo `madre`),
**`sql/33`** (`flag_partite`), **`sql/34`** (lettura aperta + scrittura
stretta). Tutte verificate dal database subito dopo.

### ⚠️ Quello che resta aperto, e va deciso da Mattia

| | |
|---|---|
| **l'esito automatico del Bet Builder** | fattibile, ma prima la regola *"questa giocata è arrivata"* deve **spostarsi** da `btscout/lib/ricostruisci.js` a `app/src/lib/`, **non essere copiata**: due versioni direbbero prima o poi cose diverse sulla stessa schedina |
| **idea 9** | `CompilaPerQuota` riempie le caselle **vuote** di una spin: va capito se Mattia voleva compilarne una **intera**. Domanda ancora senza risposta |
| **«solo sopra soglia»** | tolto il 22/10 insieme alle slitte, **deciso da me**: diceva la stessa cosa di «attendibilità ≥» in lingua spin. Una riga per rimetterlo |
| **le casse le vedono tutti** | aprendo la pagina agli utenti, bankroll, accumulo e archivio sono visibili a chi entra. Si toglie la card a chi non è admin — una riga — ma è una scelta sua |
| **lo spezza a mano quasi non compare** | col taglio automatico a 2,00 i passi nascono già minimi, e un pezzo minimo non si divide in due pezzi che arrivino entrambi a 2,00. Riappare solo su un passo allungato a mano |
| **un passo può avere 8 gambe** | `fasce()` raggruppa per orario e `MAX_GAMBE` vale solo per la proposta automatica. Mattia: *"decido io a mano"* |
| ~~il lotto 1 non è stato guardato~~ | ✅ **guardato da Mattia il 22/10**, e il giro ha trovato una cosa: gli utenti vedevano *"ARCHIVIO 1"*. Corretto — l'archivio segue le casse |

### 📦 I LOTTI, nell'ordine concordato il 22/10

| # | lotto | stato |
|---|---|---|
| **2** | **Le quattro rifiniture** (idee 2 · 4 · 5 · 7) | ✅ **fatto il 22/10** (`a542cf9`), più la testata rifatta su tre righe (`a095ce0`) e il difetto che Mattia ha fotografato nei filtri (`6bf1468`) |
| **3** | **Gli indirizzi delle pagine** (lotto Q, routing) | da fare — **prima di aggiungere schermate nuove**, o si ricablano dopo. E toglie la trappola della mappa di `guarda.mjs` |
| **4** | ✅ **La schedina a schermo — fatta il 22/10 come 🎟️ BET BUILDER** (`sql/36`): schedine a quota obiettivo, private per utente, con «giocata» e «cancella», e le partite già usate escluse dalle successive. ⚠️ **Resta aperta solo l'idea 9**: `CompilaPerQuota` riempie le caselle **vuote** di una spin — va capito con Mattia se voleva compilarne una **intera**. |
| **5** | **La barra dei campionati** (idea 3) | ✅ **fatta il 22/10 sera** (`6bf18ae`), anticipata da Mattia prima del routing. La domanda *"cosa si restringe"* ha avuto risposta: **niente** — lo spazio si **riserva** (40px di margine a destra) invece di lasciar galleggiare la striscia sopra la lista |
| **6** | **L'automazione** (lotto F): il `.plist` di launchd è pronto, due comandi | da fare |
| **7** | **Quello che aspetta i dati**: il riepilogo della scalata (a 10-20 chiuse), il Satellite, la spin 2 sotto soglia, i backtest vecchi | non anticipabile |
| **8** | 🧬 **UPGRADE MODELLO DI DATI — fonti** (briefing 1 di Mattia, 22/10): angoli e cartellini **già in archivio e mai letti**, over 1,5 e 3,5, FBref per xG e Champions, live. Il piano sta più sotto | ⛔ **da decidere**, quattro domande aperte |
| **9** | 🧬 **UPGRADE MODELLO DI DATI — evoluzione predittiva** (briefing 2): matrice dei risultati esatti e fair odds. ⚠️ Il Poisson **esiste già** in `lib/gol.js` con le sue correzioni misurate: qui si estende, non si riscrive — e **non in Python**, o nascono due verità | ⛔ **da decidere** |

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

### 🧰 Tagliando del 22/10/2026 (sera)

- **`fattoreVpm` e `FATTORE_SCALA` tolti**: erano il cuore del voto vecchio e
  dal cambio di stamattina **non li chiamava più nessuno**. Trovati cercando
  gli export senza usi **in tutto il repo** — `src/lib/` è condivisa col
  motore, e un controllo che guarda solo `app/` sbaglia.
- **`iniziaDopo` era in due copie** (Road to weekend e Bet Builder, identiche):
  salita in `lib/attendibilita.js`, dove stanno le altre regole di tempo. È lo
  stesso difetto già pagato con `pct`, la data breve e la chiave del giorno.
- **`@anthropic-ai/sdk` tolto da `btscout/package.json`**: residuo della
  vecchia fase PWA, e `btscout/api/` non esiste più.
- Dipendenze dell'app: **tutte usate**, nessuna mancante. Pacchetto principale
  **146 kB** (47,6 gzip) + 241 kB di `App` caricato a richiesta.
- ⚠️ Gli altri 30 export "senza usi" **non sono codice morto**: sono le
  costanti misurate (`PAVIMENTI`, `GG_MEDIO`, `DISPERSIONE`…), esportate
  apposta per essere leggibili e provabili da terminale.

### 🎟️ Il Bet Builder, cosa è rimasto aperto

- ✅ **L'archivio c'è** (22/10 sera): interruttore `ATTIVE | ARCHIVIO`, e la
  schedina ci scende **dieci secondi dopo l'esito** — richiesta di Mattia.
  Il criterio è lo **stato**, non il tempo; i dieci secondi sono il tempo per
  accorgersi di un tocco sbagliato, e la card lo scrive mentre scorrono.
  Il dettaglio sta in `note/betbuilder.md`.

- **L'esito automatico** dall'archivio: ogni gamba ha `prossima_id`, ma la
  regola che dice *"questa giocata è arrivata"* vive in
  `btscout/lib/ricostruisci.js` e va **spostata** in `app/src/lib/`, non
  copiata — due versioni direbbero prima o poi cose diverse sulla stessa
  schedina.
- ✅ **I filtri restano** (22/10 sera, chiesto da Mattia): si salvano da sé,
  senza tasto, perché la riga di `preferenze` è **personale** — al contrario
  della scalata, dove il tasto serve perché la riga è condivisa fra sei admin.
  ⚠️ Chi apre e non tocca niente **non scrive niente**.
- ⚠️ **Non si salvano `quota da raggiungere` e il criterio**: non stanno nella
  card dei filtri. Offerto a Mattia, due righe quando vorrà.
- **Il riassunto con le domande vere** (quale criterio sceglie meglio, quanto
  rende davvero) arriva a **dieci o venti schedine**: prima direbbe rumore.

### 🏴 La barra dei campionati e i filtri delle Partite (22/10/2026, sera)

**La barra.** Striscia `fixed` larga 40px sul bordo destro, fra testata e tab
bar: non si muove mai. Ancorata al bordo della **colonna** e non della
finestra — attaccata allo schermo, su un portatile starebbe a un palmo dalla
lista che filtra.

⚠️⚠️ **Filtra, non salta**, ed è la domanda che ha deciso il lotto. Un indice
che porta a un *punto* della lista vorrebbe dire raggrupparla per campionato,
ma la lista è ordinata per voto (o attendibilità, o quota) **attraverso tutte
le leghe**: è il motivo per cui la pagina esiste. Raggrupparla avrebbe tolto
quello per far funzionare la barra. Mattia ha scelto **A** (filtra).

⚠️⚠️ **I numeri accanto alle sigle contano tutti gli altri filtri accesi ma
non sé stessi** — per ottenerlo il filtro del campionato è **uscito dalla
catena** (`filtrate` → `visibili`). Senza, scelta una lega tutte le altre
direbbero zero e la barra non servirebbe più a cambiare lega.
⚠️ Le leghe a zero **restano al loro posto, spente**: sparendo farebbero
saltare in su quelle sotto a ogni tocco di una manopola, e il bersaglio
cambierebbe posto sotto il dito.

**I filtri**, rifatti subito dopo su richiesta di Mattia:
- **via la tendina del campionato**, superflua — due comandi per lo stesso
  filtro si allontanano, e uno dei due finisce per non essere più quello vero.
  Lo stato resta, lo scrive la barra, e la targhetta con la ✕ lo toglie;
- **quattro manopole**: `attendibilità ≥` · `VPM ≥` · `scelta ≥` · `voto ≥`,
  scritte come un **elenco** (`MANOPOLE`) e non come quattro blocchi copiati.
  ⚠️ Il voto arriva a **10**, non a 100: è una pagella da stamattina, e il
  vecchio `votoMin` si confrontava con `1,00`;
- ⚠️⚠️ **via le tre slitte delle soglie di probabilità** (*"le spin stanno
  passando in secondo piano"*). **I numeri restano**: `SOGLIE_DEFAULT` decide
  ancora il colore delle card e il conteggio in cima — se ne va la possibilità
  di muoverli da lì, non le categorie. ⚠️ Via con loro **«solo sopra soglia»**,
  che diceva la stessa cosa di «attendibilità ≥» in lingua spin: **deciso da
  me**, Mattia può rivolerlo.

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


## 🧬 UPGRADE MODELLO DI DATI — il piano (22 ottobre 2026)

Due briefing di Mattia, consegnati insieme: **1. fonti di dati** (football-data,
FBref, ESPN/Sofascore via `soccerdata`; top 5 + Champions; over/under 1,5 · 2,5
· 3,5; GG/NG; **angoli e cartellini**; storico + live) e **2. evoluzione
predittiva** (una classe Python `PoissonMatchPredictor`: forze d'attacco e
difesa, λ casa/trasferta, matrice 0-0…6-6 con `scipy.stats.poisson`, mercati
O/U e GG/NG, fair odds, 1X2).

⛔ **Non sviluppato: questo è il piano, la decisione è di Mattia.**

### ⚠️⚠️ Cosa esiste GIÀ — verificato dal database il 22/10

| | |
|---|---|
| **angoli, cartellini, tiri** | **ci sono già in `partite`** (`sql/05`): `angoli_*`, `gialli_*`, `rossi_*`, `tiri_*`, `tirip_*`. **51.415 righe su 54.249 piene — il 94,8%**, da `1617` a `2627`, 15 campionati. ⚠️⚠️ **Non li legge nessuno**: l'unico file che li tocca oltre agli import è `prova-gol-varianti.js`. Il dato è in casa da sempre, e il lavoro **non è prenderlo: è usarlo** |
| **gol del primo tempo** | `gol1t_*`, **99,9% pieno** — mai usato |
| **il modello di Poisson** | **c'è, in `app/src/lib/gol.js`** (395 righe): `poisson(k, λ)`, `pOver(soglia, λ)` per **0,5 · 1,5 · 2,5 · 3,5**, GG, `intervalloGol`, `consiglioGg`. Il briefing 2 descrive **questo**, in un'altra lingua |
| **le correzioni misurate** | ⚠️ `STRETTA_GG = 0,55`: il prodotto di due Poisson indipendenti è **troppo sicuro di sé** e va stretto verso la media. È la correzione che il briefing non prevede, e **senza di essa i numeri sono peggiori** |
| **quote over/under** | `avg_over25`, `b365_over25` — 38.214 righe (70,4%) |

### ⚠️⚠️ Le quattro cose che non tornano, da dire prima di tutto

1. **Il briefing 2 chiede di riscrivere in Python un motore che esiste in JS.**
   ⚠️ E non è una questione di gusto: l'invariante di questo repo è che *"una
   misura e lo schermo devono dire lo stesso numero, e l'unico modo è che
   eseguano lo stesso codice"* — gli script del motore importano
   `app/src/lib/*.js` apposta. Due Poisson, uno in `gol.js` e uno in Python,
   **divergono**: è lo stesso difetto di `emailDi()` in tre copie e di
   `iniziaDopo` in due, già pagati.
2. **Il GG/NG è già stato misurato, e quasi non si prevede**: 54,0% di volte
   giuste contro una base del 53,2% (`prova-gg.js`, 12/10). ⚠️ **Non è colpa
   del modello** — è il mercato che è quasi efficiente lì. Un modulo nuovo per
   GG/NG non cambierà quel numero: cambiarlo vorrebbe dire un'**informazione**
   nuova (xG, formazioni), non una formula nuova.
3. **Dixon-Coles è già stato provato** nella fase vecchia del motore
   (`btscout/STATO.md`, fasi S1-S6), e `prova-gol-varianti.js` /
   `prova-gol-avversari.js` concludono **no**: l'indice dei gol non migliora
   né con le varianti né correggendo per gli avversari affrontati.
4. **«Live / near-real-time» è una modalità operativa, non una fonte**. Qui la
   regola è che **ESPN non indovina mai**: nel dubbio la riga aspetta una
   persona (`importazioni`). Un flusso live che scrive da solo va contro
   quella regola, e prima del live serve l'**automazione** (lotto F, il
   `.plist` di launchd già pronto).

### ✅ Quello che è stato fatto il 22/10 sera, e perché NON in Python

Mattia: *"priorità flusso di dati… quando torno vorrei avere tutta la
Champions e magari qualche campionato come Olanda 2, Giappone, Serie B
portoghese"*, più **l'aggiornamento orario dei risultati**. Autorizzato a
scaricare.

⚠️⚠️ **La ricerca ha spostato la strada.** Il briefing proponeva
Python + `soccerdata` + FBref: `soccerdata` oggi vuole **Python ≥ 3.10** (qui
c'è il 3.9 di sistema) e si porta dietro **`seleniumbase`**, cioè un browser
intero, perché FBref sta dietro Cloudflare. **ESPN è già dentro il progetto**,
è gratis, senza chiave, e in una chiamata dà gol, tiri, **tiri in porta**,
possesso, **angoli** e **cartellini**. Il dettaglio sta in `note/dati.md`.

| | |
|---|---|
| **`lib/espn.js`** | cinque competizioni nuove (`UCL`, `UEL`, `UECL`, `N2`, `JPN1`), `partiteDelMese()` — ⚠️ lo scoreboard accetta un **mese** ma non un intervallo: 12 chiamate per stagione invece di 330 — e i **cartellini**, che ESPN dava e noi buttavamo via |
| **`scripts/importa-competizione.js`** | nuovo: importa una competizione intera. Prova a vuoto di default, solo partite **finite**, `fonte='espn'` |
| **`scripts/aggiorna-risultati.js`** + **`aggiornamento-orario.plist`** | l'aggiornamento **orario**: solo i risultati, **zero crediti** |
| **`lib/campionati.js`** (app) | sigle e nomi delle cinque competizioni, così la barra non mostra un codice grezzo |
| ⚠️ **tiri in porta** | **c'erano già**: `tirip_*`, pieni al 91-100% su tutti e quindici i campionati. Non era un dato da prendere, era un dato da usare |

### ⏳ Il recupero storico è PARTITO e gira da solo (22/10, 23:15)

```
cd btscout && tail -f recupero.log          # a che punto è
node --env-file=.env -e "import('./lib/db.js').then(async({sql,chiudi})=>{\
  const r=await sql\`select div,count(*) n,min(data) da,max(data) a from partite \
  where div in ('UCL','UEL','UECL','N2','JPN1') group by div\`; console.table(r); await chiudi()})"
```

Cinque competizioni dal 2016, ~11.000 partite stimate, **~1,2 secondi l'una**:
tre o quattro ore. È lanciato **staccato dalla sessione** (`nohup`), quindi
continua anche a terminale chiuso, e **riprende da dove è arrivato** se si
ferma — la chiave è l'indice unico della tabella, non un segnaposto.

⚠️ **Era cinque volte più lento, e il perché conta**: ESPN non ha il riepilogo
delle partite vecchie, e `prendi()` insisteva **tre volte** con attese
crescenti su ogni buco. Da 4,5 a 1,2 secondi a riga aggiungendo un parametro
`tentativi`: per una partita di ieri tre tentativi sono giusti, per una del
2016 il buco è una risposta.

### ✅ Il ponte fra i nomi, e la Champions nella colonna di destra

Fatto la sera del 22/10: **UCL e JPN1 sono accese** in `lib/odds-api.js`,
quindi le loro partite **future** prendono il consenso dei bookmaker come
tutte le altre — e con le quote arrivano attendibilità, scelta e voto. Appena
entrano in `prossime_partite` compaiono **da sole** nella barra dei campionati
a destra: la barra si costruisce da quello che c'è, non da un elenco scritto.

| | |
|---|---|
| **`lib/nomi-squadre.js`** | 18 accoppiamenti nuovi (10 UCL, 8 JPN1). ⚠️ Il verso è **opposto** al resto del file: a destra ci sono i nomi di **ESPN** ("Internazionale", "Sporting CP"), non quelli di football-data. ⚠️ Letti uno per uno: il confronto automatico ne risolveva 8, ma sbaglia in silenzio — è già successo con "Paris Saint Germain" finito su "Paris FC" |
| **`importa-prossime-odds.js`** | ⚠️⚠️ i nomi validi si cercano **per data** (`data > current_date - 730`) e non più per codice stagione: la J1 giapponese ha `stagione = '2026'`, e nel vecchio filtro `in ('2526','2627')` **ogni squadra giapponese risultava sconosciuta**. E il nome della competizione ha un ripiego su `COMPETIZIONI`, perché `CAMPIONATI` elenca i file di football-data e la Champions non ne ha uno |
| **il codice d'uscita** | un nome sconosciuto vale **1 solo nei quindici di football-data**, dove è un segnale. In Champions le partecipanti cambiano **per costruzione** ogni stagione: la partita si salta, l'avviso resta scritto, la routine prosegue |

⚠️⚠️ **La dipendenza da ricordare**: il controllo dei nomi guarda l'archivio
degli **ultimi due anni**, quindi le quote di una competizione nuova entrano
**solo dopo** che il recupero ESPN ha portato le sue stagioni recenti. Il
22/10 il primo tentativo è tornato a mani vuote proprio per questo — il
recupero era al 2017. Per una competizione nuova si parte sempre da
`--da=<anno scorso>`, poi si lascia andare lo storico profondo.

⚠️⚠️ **Un limite che resta:**

1. **La Serie B portoghese non esiste in nessuna delle fonti gratuite**: non
   football-data (`P2` reindirizza su `SP2`, verificato il 16/09), non ESPN
   (sei slug provati), non The Odds API. Resta FBref, cioè Cloudflare e un
   browser: va deciso a parte.

### ✅ U1 — angoli e cartellini: letti, MISURATI, e mostrati in Champions

Mattia, 23/10: *"partiamo con U1, magari mettiamo un'indicazione che quei dati
provengono solo dallo storico. Crea qualcosa che fa previsione di goal
cartellino over calci d'angolo e proviamo a metterlo per ora solo nelle
partite di champion"*.

| | |
|---|---|
| **`app/src/lib/conteggi.js`** | il modello: forza d'attacco × forza di difesa × media della competizione, casa e fuori separati, e Poisson sul totale. ⚠️ **Usa la `pOver()` di `lib/gol.js`**: una seconda Poisson in questo repo sarebbe la copia che prima o poi dice un numero diverso dallo schermo |
| **`app/sql/39-conteggi.sql`** | `conteggi_dati(div, ultime)`: medie per squadra, casa/fuori, fatti/concessi, **con il conteggio accanto**. Per competizione e non per archivio — serve alla scheda di UNA partita |
| **`app/src/hooks/usaConteggi.js`** | memoria **per competizione**: aprire una partita di Champions non butta via i conteggi della Serie A |
| **`btscout/scripts/prova-conteggi.js`** | il banco di prova: cammina nel tempo, non guarda mai avanti, e confronta con la **base** |
| **la scheda partita** | blocco «Angoli e cartellini», **solo UCL** |

⚠️⚠️ **LA MISURA, ed è il motivo per cui il blocco NON dà consigli.** Sulla
soglia centrale, camminando nel tempo su tutto l'archivio:

| | nostra | base | |
|---|---|---|---|
| angoli, Serie A | 56,1% | 52,0% | **+4,1** |
| angoli, Liga | 54,1% | 52,9% | +1,2 |
| **angoli, Champions** | **54,0%** | **53,1%** | **+0,9 — dentro il rumore** |
| cartellini, Champions | 52,2% | 50,6% | +1,6 |
| cartellini, Serie A | 65,3% | 64,9% | +0,4 |

Quindi il blocco **descrive**, non consiglia: niente verde, niente «giocata».
È la stessa riga del verde dei gol — *«più del solito», non «giocata
vincente»*. ⚠️ `K_STRETTA = 12` è **misurato**: con 8 la Champions scende
sotto la base, con 20 non guadagna niente. ⚠️ `MISURA` è **esportata dalla
libreria** e non scritta nel JSX: un risultato copiato in un angolo
dell'interfaccia invecchia senza che nessuno se ne accorga.

⚠️ **Perché solo in Champions, oltre alla richiesta**: lì l'archivio è nostro
(ESPN) e le due squadre si chiamano come le chiamiamo noi. In Serie A i
conteggi ci sono ma i nomi vengono da football-data: lo stesso club nelle due
competizioni è ancora **due squadre diverse**. Il ponte fra i nomi *fra
competizioni* non c'è — ed è il lavoro che aprirebbe il blocco a tutti.

### 🏆 Dove sono arrivati i dati (23/10, notte)

| | |
|---|---|
| **UCL** | ✅ **completa**: 1.823 partite dal 2016, 93% con statistiche. **18 partite future** con 33 bookmaker, exchange e over/under |
| **JPN1** | 1.070 partite (stagioni recenti) + **10 partite future** con le quote |
| **UEL** | in corso, al 2019 |
| **UECL · N2** | in coda |
| **Serie B portoghese** | ⛔ **abbandonata** da Mattia il 23/10 |

### Il piano, in cinque pezzi — da fare in quest'ordine

| # | pezzo | cosa aggiunge DAVVERO | stima |
|---|---|---|---|
| **U1** | **Leggere angoli e cartellini** che sono già lì: medie per squadra, casa/fuori, ultime N; il blocco nella scheda partita accanto a quello dei gol | il dato c'è dal primo giorno e **non si vede da nessuna parte**. È il miglior rapporto fra lavoro e risultato di tutto il piano | mezza giornata |
| **U2** | **I mercati 1,5 e 3,5 a schermo**: `pOver` li calcola già, la scheda consiglia solo il 2,5 | tre righe di modello, zero dati nuovi — e il 2,5 è **il numero migliore del progetto** (64,8% → 71,2%) | 2 ore |
| **U3** | **La matrice dei risultati esatti e le fair odds**: da λ casa/λ trasferta a 1X2 + O/U + GG in un colpo, **in `lib/gol.js`**, non altrove | ⚠️ Serve a confrontare il nostro 1X2 col **consenso dei book**, che oggi è l'unica fonte dell'attendibilità. Da lì nasce un VPM sui gol | 1 giorno |
| **U4** | **FBref**: xG e **Champions League** — l'unica cosa del briefing 1 che porta **informazione nuova** | ⚠️ È anche l'unico pezzo che può muovere il GG, perché aggiunge un dato, non una formula. Ma: fonte nuova, nomi squadra da riconciliare, e `soccerdata` è **Python** | 2-3 giorni |
| **U5** | **Live / Sofascore** | ⏸️ **dopo** l'automazione (lotto F) e **dopo** che U1-U4 hanno detto se il modello vale | non stimabile ora |

### ⚠️ La domanda su Python, e la risposta che consiglio

**Python sì, ma solo come braccio, mai come cervello.** `soccerdata` è la via
più corta per FBref, e scriverne l'equivalente in Node sarebbe lavoro vero.
Quindi:

- **Ingestione in Python** (U4): uno script che scarica, normalizza e **scrive
  in Postgres**, nello stesso schema di tutti gli altri import — con la prova
  a vuoto di default, come ogni script che tocca dati qui.
- **Modello in JS, uno solo** (`app/src/lib/gol.js`): perché è lo stesso codice
  che gira nell'app e nei backtest. ⚠️ **Nessun calcolo di probabilità in
  Python**, o nascono due verità.

### Le decisioni che servono a Mattia prima di partire

1. **Si parte da U1** (angoli e cartellini già in casa) o da **U4** (FBref e
   Champions, che è la cosa che più assomiglia al briefing ma costa dieci volte
   tanto)?
2. **Il GG/NG**: sapendo che misurato vale 54,0% contro 53,2%, lo si vuole
   comunque a schermo come mercato, o si tiene solo come numero dentro la
   scheda?
3. **Champions League**: entra nell'archivio come sedicesimo campionato, o è
   una cosa a parte? ⚠️ Le squadre si ripetono fra lega e coppa, e
   `calcola-andamento` conta per campionato.
4. **Angoli e cartellini**: servono per **guardarli** o per **giocarli**? Se
   per giocarli serve una fonte di quote che oggi non abbiamo.

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
| 10 | Creatore di schedina | ✅ **fatto il 22/10: è il BET BUILDER** |

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

### 10 · Creatore di schedina — ✅ diventato il Bet Builder il 22/10/2026

⚠️ **Com'era previsto, il criterio non è stato inventato**: la pagina usa
`componiPasso` di `lib/scalata.js` — la stessa funzione dei passi della
scalata, perché *un passo* e *una schedina a quota obiettivo* sono la stessa
cosa. Quello che è stato aggiunto è il parametro `ordina` (voto ·
attendibilità · scelta · VPM, scelto schedina per schedina) e il registro.

#### Com'era la voce

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

