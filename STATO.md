# STATO — BetterTrade

> **La to-do e il punto esatto in cui siamo.** Si legge all'inizio di ogni
> sessione e si aggiorna quando una task cambia stato.
>
> ⚠️⚠️ **Alleggerito il 22/10/2026**: tutto quello che è **chiuso** è passato in
> [STORICO.md](STORICO.md) — stesso testo, non riassunto. Qui resta **dove
> siamo, cosa è in corso e cosa è ancora aperto**. Lo storico si apre quando
> serve capire *perché* una cosa è fatta così, non per sapere cosa manca.

**Ultimo aggiornamento:** 24 ottobre 2026 · app alla versione **1.58.00** ·
ultimo commit dell'app `a115a23` · ultimo passaggio di consegne: 24/10

## ▶️ DOVE SIAMO — 24 ottobre 2026, leggi questo per primo

**Versione `1.58.00`** — il 24/10 il tasto **Bilancio** è diventato solo per
gli admin (`1.57.02`), e la pagina **Spin** è cambiata (`1.58.00`):
- l'automatica ordina e colora per **scelta** con soglie proprie **75/72/68**
  (`SOGLIE_SPIN`): il weekend del 24/10 passa da 0 verdi e 1 gialla a **5 e
  6**. Fuori dalle spin i colori restano dell'attendibilità. Perché, in
  `note/criterio.md`;
- la seconda griglia («A mano», prima «Con le stelline») **parte vuota** e ha
  il tasto «↺ svuota»;
- la finestra della casella ha **«ordina per» attendibilità · voto · VPM ·
  scelta**, su tutte le partite fino a martedì, sotto soglia comprese;
- **«S1 · S2 · S3»** nella finestra guarda tre fonti per spin — automatica, a
  mano e **la griglia salvata in Slot** — e compare **anche per la spin che si
  sta compilando**: lo scopo è non mettere la stessa partita in due spin.

Provata da Mattia in `npm run dev` il 24/10; lint e build passano,
`prova-spin.js` torna coi numeri della misura.

⚠️ **Aperto: tre partite rinviate sono DOPPIE in `prossime_partite`**, con la
data vecchia e la nuova (Paris SG-Lyon 25 e 26/10, Toulouse-Troyes 24 e 25,
Montpellier-Red Star 24 e 26). Possono finire due volte nella stessa spin. Da
guardare in `riconcilia-prossime` / importazione.

Il lavoro del **21-22 ottobre** sta su ROAD TO WEEKEND e BET BUILDER; quello
del **23 ottobre** — una giornata lunga — su **dati** e **scheda partita**:

| | |
|---|---|
| **l'archivio è passato da 54.249 a 67.517 partite** | Champions, Europa, Conference, Olanda 2 e Giappone da ESPN. **20 competizioni** |
| **il fuso era sbagliato di un'ora** su tutto il calendario, dall'inizio | corretto alla radice e i dati rimessi a posto |
| **angoli e cartellini** entrano nella scheda, **misurati su venti competizioni** | e dove il modello non batte la base, la scheda lo scrive |
| **la scheda partita è stata ristrutturata** | data nella riga del campionato, quattro voci coi divisori, card a scomparsa |
| **«fissa passo»** in Road to weekend | per programmare tutto il percorso a tavolino |
| **la linea over/under 3,5** smette di finire nel cestino | raccolta sì, usata **no**: non c'è un passato su cui misurarla |

### Per ripartire

```bash
cd app && npm run dev          # il server di sviluppo non resta acceso fra le sessioni
```

**I dati del weekend sono già dentro** (caricati il 23/10 sera): risultati
della stagione, calendario, `andamento` ricalcolata, `controlla-dati` pulito.
Non serve rilanciare niente prima di lunedì.

⚠️ **Crediti The Odds API: 157 su 500** rimasti questo mese. Un giro completo
ne costa **51** — vedi il blocco «I CREDITI» più sotto prima di lanciarne uno.

⚠️ **Il contatore di versione si alza a mano** (`app/src/versione.js`), a ogni
commit che cambia l'app. Il 22 sera sono passati sette commit senza alzarlo, e
sul telefono non si distingueva il lavoro di oggi dalla cache di ieri.

### 👉 Da dove ripartire, in ordine di valore

Nessuna di queste è stata promessa a Mattia: **si propone e decide lui.**

| | cosa | costo |
|---|---|---|
| 0 | **Le partite rinviate doppie** (vedi «Quello che resta aperto») — piccolo, ma tocca quello che si gioca: la stessa partita può finire due volte in una spin | un'ora |
| 1 | **I falli** — ESPN li manda (`foulsCommitted`) in ogni riepilogo e **li buttiamo via**, esattamente com'era per i cartellini fino al 22/10. Sono il meccanismo che produce il giallo, e i cartellini sono il mercato dove il modello rende di più. Serve: una colonna, due righe in `lib/espn.js`, il recupero, **e la rimisura** | mezza giornata, zero crediti |
| 2 | **Il routing** (lotto 3) — era *"da fare prima di aggiungere schermate nuove"* e da allora ne sono arrivate tre. Vuole mezza giornata in cui non si aggiunge niente | mezza giornata |
| 3 | **L'arbitro** — la letteratura lo chiama cruciale per i cartellini. ⚠️ **Prima va verificato** che football-data abbia davvero la colonna `Referee`: il 23/10 il DNS di quel sito era giù tutto il giorno e **non l'ho potuto controllare** | da stimare dopo la verifica |
| 4 | **La misura `eu` contro `eu,uk`** sull'1X2: se la sola `eu` basta, libera **148 crediti al mese** | 2 crediti, un'ora |
| 5 | **U3** — matrice dei risultati esatti e fair odds | 1 giorno |

⏳ **In attesa che passino le partite, non da fare adesso:**
- **`MERCATO_35`** — 89 partite hanno la quota 3,5 dal 23/10; quando si saranno
  giocate si lancia la query di `note/gol.md` e si decide se accendere.
- **Il riepilogo del Bet Builder** e quello della scalata, che vogliono
  dieci-venti schedine chiuse: prima direbbero rumore.

## 🔄 RIPARTIRE DOPO UNA PAUSA

⚠️ Questo blocco era finito in `STORICO.md` con l'alleggerimento del 22/10,
mentre `CLAUDE.md` continuava a prometterlo *"in cima a STATO"*: un rimando a
qualcosa che non c'era. Rimesso qui il 24/10, con i numeri aggiornati.

Se fra l'ultimo aggiornamento e oggi sono passate settimane o mesi, **i dati
sono vecchi, non il codice**. In ordine:

```bash
cd btscout
node --env-file=.env scripts/aggiorna.js --esegui    # risultati + quote: recupera tutto da solo
node --env-file=.env scripts/verifica-storico.js     # l'archivio è coerente?
cd ../app && npm run lint && npm run dev             # 0 errori, poi la barra deve dire la versione di `app/src/versione.js`
```

`aggiorna.js` guarda indietro e non perde niente: `riconcilia-prossime` chiude
le future diventate partite anche se sono di tre mesi fa. **I crediti di The
Odds API si rigenerano ogni mese** (500), quindi dopo una pausa sono pieni.
⚠️ **Dal 23/10/2026 un giro costa 51 crediti** (17 competizioni: 34 per l'1X2
su due regioni + 17 per l'over), cioè ~442 al mese su 500. Il conto per intero
sta nel blocco «I CREDITI DI THE ODDS API» più sotto.

**Cosa sarà sicuramente da rifare, e cosa invece regge:**

| | |
|---|---|
| ⚠️ **Le quote future** | `prossime_partite` è una fotografia: dopo una pausa è tutta scaduta. La riempie `aggiorna.js`. |
| ⚠️ **A stagione nuova VPM non esiste per ~4 giornate.** | Serve un minimo di **3 partite giocate** per squadra (`MIN_PARTITE`): in agosto-settembre la colonna VPM fa `—` e il voto vale la resa. **Non è un difetto.** |
| ⚠️ **Le ancore di VPM** | misurate su 24/25 e 25/26, **fisse di proposito**. Vanno rimisurate solo quando si vuole aggiungere una stagione — e allora cambiano *tutti* i VPM storici, quindi si fa una volta e si scrive la data. |
| ⚠️ **La tabella `andamento`** | è **derivata**: la stagione in corso si rifà **da sola** a ogni importazione (dal 15/10/2026), l'archivio intero con `calcola-andamento.js --stagioni=8 --esegui` (23 secondi). Non è un backup da conservare. |
| ⚠️ **Le note "a ottobre…"** | in CLAUDE.md e qui ci sono frasi legate al momento (i tre strati di VPM che guardano quasi le stesse partite, le 1-3 partite in casa). **Da gennaio sono false**: la forma comincia a dire altro. |
| ✅ **Il criterio, le soglie, i pesi** | non scadono: sono misurati sull'archivio, non sulla settimana. |
| ✅ **sql/01-29, RLS, permessi** | applicati e verificati. `scripts/prova-permessi.js` lo riconferma in un minuto. |

**I numeri qui sotto con una data accanto sono fotografie, non verità**: se
leggi "884 partite" o "440 crediti" e siamo a marzo, sono vecchi di mesi.

---

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
| **🏆 Champions, Europa, Conference, Olanda 2 e J1 da ESPN** + l'aggiornamento orario + il ponte fra i nomi | `7c7657f` |
| **🧮 U1 — angoli e cartellini** letti, misurati, mostrati | `e2a2545` |
| **Scalata**: le stelle entrano nella scaletta, «spezza» sbloccato, la scheda dal Bet Builder | `af8e046` |
| **Partite**: tasti dell'ordine più bassi del 30% e coi filtri accoppiati | `60ec07a` · `076d625` |
| **🕐 Il fuso**: il calendario era indietro di un'ora, corretto alla radice | `25f45a1` |
| **La scheda partita ristrutturata**, e i conteggi misurati su venti competizioni | `978d3fd` |
| **«fissa passo»** in Road to weekend | `5f511d9` |
| **U2' — la linea 3,5** smette di finire nel cestino | `5da5b0a` |
| **Il tasto Bilancio solo per gli admin** (24/10) | `7deafd9` |
| **Spin**: selezione per **scelta** 75/72/68, griglia «A mano» vuota, «ordina per» i quattro indicatori, «S1» su tre fonti (24/10) | `a115a23` |

Le migrazioni applicate in questi due giorni: **`sql/31`** (numero del passo
decimale, per inserirne uno in mezzo), **`sql/32`** (il metodo `madre`),
**`sql/33`** (`flag_partite`), **`sql/34`** (lettura aperta + scrittura
stretta). Tutte verificate dal database subito dopo.

### ⚠️ Quello che resta aperto, e va deciso da Mattia

| | |
|---|---|
| **le due automazioni non sono installate** | verificato il 23/10 con `launchctl`: **nessun agente**. Né l'orario (`aggiornamento-orario.plist`, solo risultati, zero crediti) né quello del martedì/venerdì (`aggiornamento.plist`). Due comandi ciascuno, in testa ai file |
| **i falli e l'arbitro** | i due ingressi che la letteratura indica per i cartellini — il mercato dove il modello rende di più. I **falli** ESPN li dà già (`foulsCommitted`) e li buttiamo via, come i cartellini fino al 22/10. L'**arbitro** sta in football-data, ma ⚠️ **la colonna `Referee` non è stata verificata**: il 23/10 il DNS di quel sito era giù tutto il giorno |
| ~~**U2'**~~ | ✅ **raccolta accesa il 23/10** (`sql/40`, zero crediti: la chiamata era già quella). ⚠️ **Ma non si usa**: l'archivio viene da football-data, che la 3,5 non la pubblica, quindi non c'è un passato su cui misurare se migliori il consiglio come ha fatto il 2,5. `MERCATO_35 = false` finché le partite raccolte non bastano — la query per misurarlo sta in `note/gol.md`. ⚠️ Giro completo lanciato il 23/10 (51 crediti, autorizzati): **89 partite su 246 hanno la 3,5, il 36%** — più del 23% atteso. Champions 17, Eredivisie 15, Bundesliga 15 |
| **il routing** | era *"da fare prima di aggiungere schermate nuove"*, e da allora ne sono arrivate tre: Bet Builder, le due card dei conteggi, la barra dei campionati. Più si aspetta, più si ricabla |
| **Europa e Conference senza quote** | The Odds API non ha **nessuna** partita futura per loro (ricontrollato il 23/10): accenderle costerebbe crediti per zero righe. Le voci sono pronte e commentate in `lib/odds-api.js` |
| **l'esito automatico del Bet Builder** | fattibile, ma prima la regola *"questa giocata è arrivata"* deve **spostarsi** da `btscout/lib/ricostruisci.js` a `app/src/lib/`, **non essere copiata**: due versioni direbbero prima o poi cose diverse sulla stessa schedina |
| **tre partite rinviate DOPPIE in `prossime_partite`** | trovate il 24/10: Paris SG-Lyon (25 e 26/10), Toulouse-Troyes (24 e 25), Montpellier-Red Star (24 e 26) — resta la riga con la data vecchia. Possono entrare due volte nella stessa spin e nel Builder. Da guardare in `riconcilia-prossime` / importazione, **prima** di cancellare qualcosa: `prossime_partite` non si cancella a mano (`note/dati.md`) |
| **idea 9** | `CompilaPerQuota` riempie le caselle **vuote** di una spin: va capito se Mattia voleva compilarne una **intera**. Domanda ancora senza risposta |
| **«solo sopra soglia»** | tolto il 22/10 insieme alle slitte, **deciso da me**: diceva la stessa cosa di «attendibilità ≥» in lingua spin. Una riga per rimetterlo |
| ~~**le casse le vedono tutti**~~ | ✅ **chiuso il 24/10** (`1.57.02`): in Road to weekend casse e archivio erano **già** solo per gli admin (lotto 1, `ScalataPage` `{isAdmin && …}`), e questa riga era rimasta indietro. Mattia ha chiesto di togliere agli `user` anche il tasto **Bilancio** del menu: `soloAdmin:true` in `VOCI_MENU`. ⚠️ Nasconde il tasto, **non** i dati: la lettura resta quella delle policy |
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
| **6** | **L'automazione** (lotto F) | ⚠️ Ora i `.plist` sono **due** e **nessuno dei due è installato** (verificato con `launchctl` il 23/10): `aggiornamento.plist` (martedì/venerdì, la routine intera) e `aggiornamento-orario.plist` (solo i risultati da ESPN, **zero crediti**). Due comandi ciascuno, scritti in testa ai file |
| **7** | **Quello che aspetta i dati**: il riepilogo della scalata (a 10-20 chiuse), il Satellite, la spin 2 sotto soglia, i backtest vecchi | non anticipabile |
| **8** | 🧬 **UPGRADE MODELLO DI DATI — fonti** | 🟡 **in corso, e la parte grossa è fatta**: le cinque competizioni nuove da ESPN, angoli e cartellini letti e misurati (U1), la linea 3,5 raccolta (U2'). **Resta**: i falli, l'arbitro, l'xG da FBref (U4), il live (U5) |
| **9** | 🧬 **UPGRADE MODELLO DI DATI — evoluzione predittiva** (U3): matrice dei risultati esatti e fair odds. ⚠️ Il Poisson **esiste già** in `lib/gol.js` con le sue correzioni misurate: qui si estende, non si riscrive — e **non in Python**, o nascono due verità | ⛔ **da decidere**, mai iniziato |

⚠️ Restano fuori dai lotti, **non dimenticate**: la **scala a sette colori per
distanza nel tempo** (idea 1) — proposta e **non fatta**, perché nella pagina
il colore dice già *in quale passo* sta la partita e due significati sullo
stesso canale non si leggono.

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

### 💳 I CREDITI DI THE ODDS API — il conto, che nessuno aveva mai fatto

Contato il 23/10/2026, perché Mattia ha chiesto *"U2 ci manda fuori budget?"*.

| | crediti |
|---|---|
| un giro completo (17 competizioni) | **51** — 34 per l'1X2 (`eu,uk` = 2 regioni) + 17 per l'over (`eu`) |
| due giri a settimana | **~442 al mese** su 500 |
| con Europa e Conference accese | **~494**, cioè il tetto |

⚠️⚠️ **Aggiungendo Champions e J League il costo per giro è passato da 39 a
51**, e non l'avevo detto. Oggi il margine c'è ma è sottile: un mese con
qualche richiamo a mano e i crediti finiscono prima del 30.

⚠️ **Dove si recupera, se servirà**: l'1X2 si chiede su **due** regioni e costa
il doppio dell'over. Togliendo `uk` si passa da 442 a **294 al mese**. Per
l'over la sola `eu` dà già 11-15 book su 172 partite su 172 (misurato il
15/09): se vale anche per l'1X2 sono **148 crediti al mese** per qualche book
in più su una media. ⚠️ **Da misurare prima**, confrontando su un campionato la
media `eu` con la media `eu,uk`: costa **2 crediti** saperlo.

⚠️ `alternate_totals` (la 2,5 esatta per tutti i book) e `btts` (il Goal/NoGoal
di mercato) esistono, ma **solo sull'endpoint per singola partita, 1 credito
l'una**: ~170 a weekend, fuori dal piano gratuito. Non sono in nessun piano.

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

### ✅ FINITO — l'archivio è passato da 54.249 a 67.515 partite (23/10)

Tutti e cinque i recuperi sono arrivati in fondo. **+24% in una notte**, con
angoli, cartellini, tiri, tiri in porta e possesso.

| | partite | da | con statistiche |
|---|---|---|---|
| **Champions** | 1.823 | 2016 | **93%** |
| **Europa League** | 3.090 | 2016 | 62% |
| **Conference** | 765 | 2021 | **100%** |
| **Olanda 2** | 3.991 | 2016 | 60% |
| **Giappone J1** | 3.597 | 2016 | **24%** |

⚠️ **Le statistiche sono parziali dove ESPN non ha i riepiloghi vecchi.** I gol
ci sono sempre; angoli, cartellini e tiri no. Non tocca la scheda partita
(`conteggi_dati()` guarda tre anni), **ma tocca chi vorrà misurare in
profondità**: sulla J1 il campione utile è quello recente, non tutto.

⚠️ Il primo tentativo era **morto a metà Europa League** con `ECONNRESET`: non
era ESPN, era il pooler di Supabase che chiude la connessione dopo un'ora di
scritture. La scrittura sta ora in una ripetizione con attesa crescente — si
può riprovare perché è idempotente. **Trappola 44.**

### 🕐 IL FUSO ERA SBAGLIATO — tutto il calendario indietro di un'ora (23/10)

Trovato da Mattia: *"le partite delle 15 le segna alle 14"*. Vero, e
**sistematico**: The Odds API dà un istante UTC e lo formattavamo in
`Europe/London` *"come football-data"*; football-data pubblica `Time` **in ora
inglese** e la copiavamo. Londra è un'ora indietro rispetto a Roma **tutto
l'anno** (UK e UE cambiano l'ora negli stessi due giorni).

La conversione vive ora in `btscout/lib/date.js`, in un posto solo, con **due**
funzioni: da un istante si passa per il fuso, da un'ora inglese si somma l'ora.
⚠️ E si converte **data e ora insieme**: le 23:30 inglesi sono lo 00:30 del
giorno dopo.

**Dati rimessi a posto** (backup prima): 245 partite future reimportate dalla
fonte — gli id restano, quindi le 57 stelle e i 2 flag sono intatti — più le 12
gambe delle schedine salvate, che si erano portate dietro la copia sbagliata.

⚠️⚠️ **Trappola 45, che vale più del difetto**: *un dato sbagliato tutto
insieme non si vede*. Un errore sistematico non rompe l'ordinamento, non crea
buchi e non fa sbagliare i confronti interni — passa ogni controllo di
coerenza. Si trova **solo confrontando con l'esterno**: qui è bastato chiedere
a The Odds API l'istante grezzo e convertirlo a mano.

### 🧮 U1 — misurato su VENTI competizioni, e la scheda ristrutturata (23/10)

`prova-conteggi.js --tabella` **stampa** la tabella nella forma che
`lib/conteggi.js` vuole: niente numeri ricopiati a mano. La soglia scelta è
quella con la **base più vicina al 50%**, l'unica dove un modello può
aggiungere qualcosa.

⚠️⚠️ **In otto competizioni su venti il modello sta SOTTO la base**, e la
scheda lo scrive in ambra invece di tacere. Dove va meglio: cartellini in
Premier (+4,0), Scozia (+3,4), Francia (+2,7); angoli in Serie A (+4,1).
⚠️ **Sui cartellini rende più che sugli angoli**, al contrario di quanto
sembrava misurando solo la Champions.

**Provata anche la base «tiri»** (la letteratura dice che i tiri portano
informazione, e sui gol qui avevano già vinto): **sugli angoli no** — in Serie
A 49,4% contro il 56,1% della storia degli angoli. ⚠️ La prima volta le tre
varianti davano numeri **identici**: la query non leggeva i tiri e la prova
ripiegava in silenzio. *Un interruttore che non morde è peggio di uno che
manca, perché fa credere di aver misurato.*

**La scheda partita**, nell'ordine chiesto da Mattia: testata (data e ora nella
riga di campionato e stelle; quattro voci coi divisori **O/U · GG/NG · ANGOLI ·
GIALLI** spartite con `flex: 1`) → forma (gol fatti|subiti accanto al nome, via
la sezione in fondo: ~90px) → classifica → gol attesi **a scomparsa** →
**due card** angoli e cartellini, a scomparsa → scontri → VPM.
⚠️ `Blocco` ha imparato `sotto` (la parte che si apre) e `avviso` (visibile
anche da chiusa): dove il modello non batte la base, nascondere la cautela
farebbe leggere quei numeri come se fossero l'attendibilità.

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
| ~~**U1**~~ | ✅ **fatto il 23/10** (`e2a2545`, poi `978d3fd`): due card nella scheda, misurate su venti competizioni. Il dettaglio sta in `note/conteggi.md` | ✅ |
| ~~**U2**~~ | ⚠️⚠️ **ERA GIÀ FATTO, e la riga qui sopra era sbagliata.** «La scheda consiglia solo il 2,5» non l'avevo verificato: `consiglioOver()` scorre **tutte** le soglie e sceglie *la più ambiziosa che regge*, e la griglia della scheda mostra over/under 0,5 · 1,5 · 2,5 · 3,5 con le fasce misurate. Provato il 23/10 sulle 245 partite in calendario: **OVER 1,5 → 149 volte, UNDER 3,5 → 50, OVER 2,5 → 46**. Le due soglie "mancanti" sono la maggioranza dei consigli | ✅ niente da fare |
| **U3** | **La matrice dei risultati esatti e le fair odds**: da λ casa/λ trasferta a 1X2 + O/U + GG in un colpo, **in `lib/gol.js`**, non altrove | ⚠️ Serve a confrontare il nostro 1X2 col **consenso dei book**, che oggi è l'unica fonte dell'attendibilità. Da lì nasce un VPM sui gol | 1 giorno |
| **U4** | **FBref: solo l'xG** — ⚠️ la Champions **non serve più**: dal 23/10 ce l'abbiamo da ESPN, con angoli e cartellini. Resta l'xG, che è l'unico dato davvero nuovo | ⚠️ È anche l'unico pezzo che può muovere il GG, perché aggiunge un dato e non una formula. Ma: fonte nuova, nomi squadra da riconciliare, e `soccerdata` oggi vuole **Python ≥ 3.10** (qui c'è il 3.9) e un **browser** (Cloudflare) | 2-3 giorni |
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

⚠️ **Le quattro domande qui sotto sono del 22/10 e hanno avuto risposta**: si
è partiti da U1 (fatto), il GG resta un numero dentro la scheda, la Champions
è entrata come competizione a sé (`div = 'UCL'`) ed è servita per **guardare**
angoli e cartellini, non per giocarli. Restano come traccia del ragionamento.

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

## 🪜 SCALATA MADRE e ⚖️ IL VOTO — spostati in STORICO.md (24/10/2026)

Il piano della scalata (21/10) è stato **eseguito per intero**: pavimenti,
quota 2,00, selezione 61%, i lotti A · B · C · E · F. Il voto è diventato la
**pagella 0-10** il 22/10. Tutte e due le sezioni — misure, decisioni e numeri
— stanno ora in [STORICO.md](STORICO.md), parola per parola.

⚠️ **Quello che resta aperto di quel piano, e non va perso:**
- **D — la Scalata Satellite**: ⏸️ in attesa, priorità futura. Il come è
  descritto in STORICO.
- il **riepilogo della scalata** vuole dieci-venti scalate chiuse: prima
  direbbe rumore.

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

