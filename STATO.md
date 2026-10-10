# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 10 ottobre 2026
**Fatti il 2 ottobre:** lotto A (le stelline contano, scelta a mano delle
caselle, pagina Partite votate) e lotto B (scorrimento, filtri rifatti, filtro
Grado, il Grado al posto della resa).
**Fatti il 5 ottobre:** lotto C (scheda finita), lotto D (storico a 30),
l'ingrandimento automatico su iOS, le coppe valutate e scartate, quote
aggiornate.
**Fatti il 7-8 ottobre:** lotto G (pulizia: README, documenti di btscout, PWA
di chat cancellata), lotto H (si torna indietro trascinando, alla Safari),
lotto I (la posizione in classifica nel tondo, "compila per quota") e la
**stretta sui permessi delle funzioni** (sql/19).
**Fatti l'8 ottobre, dopo:** il **contatore dello sviluppo** in barra
(`src/versione.js`, ora **1.01.02**), il **blocco del weekend** nelle spin
(voce 5b, provato da Mattia: *"ok funziona"*) e **`npm run lint`**, che è la
rete sotto la schermata nera di quel pomeriggio.
**Fatti il 9-10 ottobre:** **VPM** per intero — il calcolo (`lib/vpm.js`), i dati
in una chiamata (`sql/20`), il numero in lista col colore, il blocco nella
scheda — più i **tasti per ordinare** (attendibilità · Grado · VPM), la finestra
**"Oggi"**, la riga delle partite squadrata a quattro colonne uguali e due
schermate nere corrette. Contatore a **1.06.02**.

**Fatto il 10 ottobre (sera):** la **scala a recupero** definita e misurata
(lotto O) e il **voto a schermo** con la card rifatta (lotto P, 1.07.00).

**Prossimo passo — cambio di tema, deciso il 10 ottobre.** Mattia vuole arrivare
a **un voto unico per la partita** e poi a un **metodo di giocata**: si esce
dalle spin per un po'. L'ordine è **lotto N** (definire e misurare il voto, con
backtest sull'archivio) e poi **lotto O** (il metodo di giocata, tipo scalata).
I lotti fermi ma vivi restano **E** (il resto delle spin), **F** (automazione) e
**M** (backtest vecchi da riportare su `bfe_*`). **L4** di VPM si fonde nel
lotto N: i pesi si ritoccano misurando, non a sensazione.

**Recuperato il 7 ottobre**: Mattia ha cambiato wi-fi e football-data è tornato
raggiungibile. `aggiorna.js --esegui` ha chiuso le 11 partite SP2 del 2-5/10
(**tutte con quote fedeli**) e rinfrescato le quote: archivio a **884 partite**,
ultima giocata il 5/10, **206 future** fino al 19, 32 book di media, 440 crediti.
Resta aperta una sola futura: **Levante-Ath Bilbao del 16/09, rinviata e mai
giocata** — quella non si chiuderà mai, ed è giusto così.
Sopra soglia: **9 centro, 5 gialle, 21 blu**; dei 19 voti, **12 su partite
ancora da giocare**.

---

## Dove siamo in una riga

**L'app e l'archivio sono ora nello stesso database.** `app/` (React+Vite,
in produzione su Vercel) e le 53.796 partite di 15 campionati vivono entrambi in Supabase;
`btscout/` resta il motore che le importa e le analizza. Sicurezza chiusa, numeri
chiusi, archivio dentro. Sopra ci sono la pagina Partite (attendibilità, resa,
stelline, forma), la **scheda della partita**, le **Spin provvisorie** che
compilano la griglia da sole, la griglia **agganciata alle partite vere** e il
**rendiconto** che misura come stiamo andando.

---

---

## 🎯 Il metodo di giocata, come esce dai test del 10 ottobre 2026

Non è ancora nell'app: è il risultato del backtest (voce 18), scritto qui perché
è la cosa che Mattia userà.

| | |
|---|---|
| **Quando** | venerdì-sabato e domenica-lunedì, **una** giocata per turno |
| **Cosa** | **la partita con la resa più alta** fra quelle a quota **1,35-1,45** dove VPM conferma il segno del mercato ed è netto (≥ 6) |
| **Quanto** | base = **10% del bankroll**, ricalcolata all'inizio di ogni scala |
| **Come sale** | accantona `65 · 35 · 35 · 30 · 30 · 25%` **dell'utile**, arrotondato per eccesso; il resto si rigioca |
| **Quando chiude** | al primo passo perso, **o al 6° passo vinto**: si incassa tutto e si riparte |
| **Da quando** | 5ª giornata di campionato |

Su otto stagioni: mediana **218 €** partendo da 200, mai azzerato, punto più
basso 75 €, quattro stagioni su sette in attivo.

⚠️ **Mattia gioca su Bet365**, e nell'app le quote arrivano da The Odds API che
**non lo include** (41 book, nessun Bet365 — verificato). L'app mostra Codere,
che su questo weekend pagava **2,8 punti meno** della massima. Bet365 ce l'ha
solo football-data, nel blocco imminente: `importa-prossime.js` lo riempirebbe.
**Resta da decidere** se metterlo davanti a Codere in `valuta()`.

---

# 🗂 LA TO-DO LIST

> Riscritta il **7 ottobre 2026**: solo quello che manca, numerato 1-13 e diviso
> in lotti per file toccati. Quello che è stato fatto sta sotto, in "Fatto di
> recente": serve a capire *perché* una cosa è com'è, non cosa resta.

## 🟢 Lotto H — Il gesto di tornare indietro — fatto il 7 ottobre 2026

1. [x] **Si torna alla lista trascinando da sinistra a destra.**
   `hooks/usaIndietro.js`, usato da **Partite e Partite votate** (aprono la
   scheda allo stesso modo, quindi stesso gesto).
   - **La direzione si decide una volta sola**, al primo movimento oltre i
     10px: se parti in verticale stai scorrendo la pagina e il gesto non si
     attiva più, nemmeno se la mano devia di lato. Serve `|dx| > 1,5·|dy|`.
   - **La scheda segue il dito** fino a 160px e torna al suo posto se lasci
     prima degli 80 di soglia: senza, non si capisce che sta succedendo.
   - ⚠️ **Lo spostamento si scrive sull'elemento, non nello stato di React**:
     aggiornare lo stato a ogni millimetro ridisegnava tutta la scheda (forma,
     classifica, scontri) a ogni frame.
   - Due dita non contano: è il pizzico per ingrandire.
   - Sotto la scheda, **solo su telefono**, una riga lo dice: altrimenti il
     gesto resta nascosto.

1b. [x] **Rifatto subito dopo, alla maniera di Safari** (7/10, sera). Primo
   tentativo: la scheda si spostava di 160px e poi scattava via — Mattia:
   *"sembra che si blocca la schermata e appare la lista"*. Aveva ragione, e il
   limite era strutturale: **la scheda sostituiva la lista**, quindi sotto non
   c'era niente da scoprire.
   - Ora la scheda è un **foglio sopra la lista** (`components/SchedaScorrevole.jsx`):
     entra scivolando da destra, segue il dito **per tutta la larghezza** ed
     **esce di scena** prima di smontarsi (260 ms). Chiudere a metà corsa era
     esattamente l'effetto "si blocca".
   - Basta **un quarto di schermo** per lasciarla andare, non 80px fissi.
   - Mentre è aperta, **la lista sotto non scorre** (`body overflow hidden`).
   - ⚠️ **Il salvataggio dello scorrimento è stato tolto**: la lista non viene
     più smontata, quindi tiene da sola il punto in cui si era. Il rattoppo del
     lotto B (useRef + useLayoutEffect) non serviva più — una struttura giusta
     ha reso inutile un rimedio.

1c. [x] **Due correzioni dopo la prova** (7/10, sera tardi).
   - **Il foglio partiva da `top: 0`** e finiva sotto la barra dell'app: la
     stellina non si riusciva a toccare. Ora parte da `var(--barra-alta)`, la
     stessa misura che usa il menu.
   - ⚠️ **Il trascinamento sembrava "un foglio libero", non un binario**, perché
     la pagina continuava a scorrere in verticale mentre il foglio andava di
     lato. Causa: **React registra `onTouchMove` come passivo**, e in un
     ascoltatore passivo `preventDefault()` non fa niente. Gli eventi ora si
     agganciano a mano (`addEventListener(..., { passive: false })`), e appena
     il gesto è orizzontale si mette `touch-action: none` sul foglio.

## ✅ Lotto I — Classifica nella lista e compila per quota — fatto l'8 ottobre 2026

2. [x] **Nel tondo c'è la posizione in classifica**, al posto delle iniziali, e
   si colora da sola. Le iniziali restano solo quando la posizione non la
   sappiamo (nome nuovo, campionato senza partite giocate).
   - ⚠️ **A terzi, non con le soglie fisse 7 e 12.** I campionati vanno da **12
     squadre (Scozia) a 24 (Championship)**: con le soglie fisse in Scozia
     nessuno sarebbe mai rosso e l'ultima risulterebbe gialla, in Championship
     metà campionato sarebbe rosso. Su 20 squadre i terzi danno **1-7, 8-13,
     14-20** — gli stessi numeri che aveva in mente Mattia, ma che reggono
     ovunque. `fasciaDi()` in `hooks/usaClassifiche.js`.
   - **`sql/18-classifiche.sql`**: una funzione che porta **tutte** le
     classifiche in una chiamata (17,5 KB, 131 ms). `forma_partita` le calcola
     già ma una partita per volta, e la lista ne ha 200.
     Prende l'**ultima stagione di ogni campionato**, non una fissa: non
     cominciano e non finiscono tutti insieme.
   - L'hook tiene il risultato **una volta per sessione**: lista, scheda e spin
     chiedono la stessa cosa.
3. [x] **"Compila per quota" sulla griglia con le stelline.** Chiedi la quota
   minima e riempie **solo le caselle vuote** con le più attendibili fra quelle
   che pagano almeno tanto — le votate e le scelte a mano non si toccano.
   - **Il conto si vede prima di toccare la griglia**: quante caselle riempie e
     da che attendibilità a che attendibilità. Alzando la quota si scende di
     attendibilità, ed è il senso della cosa (Mattia: *"mi assumo i rischi"*),
     ma va visto mentre si sceglie. Con i dati dell'8/10: a **1,40** si parte
     dal 67%, a **1,70** dal 58%.
   - Scorciatoie 1,30 · 1,40 · 1,50 · 1,70, e l'elenco di cosa entrerebbe.

3b. [x] **Due rifiniture dopo la prova** (8/10).
   - Il **`°` stava a metà altezza**: dentro un flex allineato alla base quel
     carattere non fa l'esponente. Ora è `vertical-align: super` in un testo
     normale.
   - Nella lista **LE VOTATE** la scritta "spin 1 · pos 9" **usciva dallo
     schermo**: sei elementi a larghezza fissa su una riga sola non stanno su un
     telefono. Divisa in **due righe** — stelline, squadre e giocata sopra;
     campionato, data, quota, attendibilità e destinazione sotto. Alla scritta
     finale restano 151px su uno schermo da 375.

### ⚠️ Scoperta sui permessi, l'8 ottobre
Creando `classifiche()` è saltato fuori che **`grant ... to authenticated` non
restringe niente**: Postgres concede l'esecuzione a PUBLIC e **Supabase la
concede ad `anon`** su tutto ciò che nasce in `public`. Otto funzioni erano
chiamabili senza login.

**Nessuna era sfruttabile** — provate dall'API senza credenziali: le tre degli
account rispondono *"Solo il superadmin…"*, `ricalcola_bankroll` rifiuta,
`forma_partita` torna vuota perché RLS blocca la lettura. Ma una funzione
`security definer` **non deve essere nemmeno chiamabile** da chi non si è
identificato. `sql/19-permessi-funzioni.sql` revoca PUBLIC **e `anon`** su
tutte e otto. Riprovato dopo: un utente normale legge classifiche e forma,
ricalcola il proprio bankroll, e non può creare utenti.

## 🟢 Lotto P — Il voto a schermo — fatto il 10 ottobre 2026 (**1.07.00**)

19. [x] **La card della partita rifatta**, disposizione decisa da Mattia:
    - in alto le squadre con **la giocata in mezzo** (prima lì c'era
      l'attendibilità, che è scesa nella barra);
    - sotto la barra dei **cinque numeri**: `QUOTA · ATTEND. · VPM · RESA · VOTO`,
      in un componente nuovo (`BarraPartita.jsx`) **condiviso fra lista e
      scheda**;
    - nella scheda la barra ha preso il posto del riquadro con le quote di
      mercato (max · media · equo), del Grado e del confronto con la massima:
      erano informazioni di prezzo da consultare, e restano nei dettagli
      completi. **La nota sulla combinata resta**, perché spiega la giocata e
      non il prezzo.
20. [x] **Il VOTO ha preso il posto del Grado.** `voto = resa × (1 + (VPM −
    5,5)/45)`, cioè da 1,00 a 1,10 di correzione. ⚠️ Il fattore è vicino a 1
    perché VPM va da 5,5 a 10 e moltiplicare per quei numeri avrebbe fatto
    perdere al voto il significato di "quanto torna per ogni euro" (100% =
    pareggio). ⚠️ **Grado cancellato** da `attendibilita.js` con
    `GRADO_MIN/MAX`, `PESO_QUOTA`, `QUOTA_MIN/MAX`: due numeri costruiti sulla
    resa erano un doppione.
21. [x] **Cinque tasti d'ordine**, uno per colonna, sempre visibili; **il secondo
    tocco inverte**. Il filtro "grado minimo" è diventato **"voto minimo"** in
    percentuale. Provato con `prova-ordine.js`: tutti e cinque decrescenti,
    vuoti in fondo, stabili a pari merito e corretti anche al contrario.
22. [x] **Legenda a scomparsa** (`LegendaPartite.jsx`) sopra il titolo della
    pagina, chiusa di default, con la spiegazione di ognuno dei cinque numeri.
    ⚠️ Dice anche che **l'attendibilità non è "quanto spesso vince" ma quanto
    spesso lo pensa il mercato**, e che sui favoriti è prudente di ~3 punti.

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

## 🟢 Lotto L — VPM, la valutazione della partita — **chiuso il 9-10 ottobre**
*`lib/vpm.js` · `sql/20` · `hooks/usaVpm.js` · `BarraPartita` · `DettaglioPartita`.*

4. **~~Indice di attendibilità manuale~~ → diventato VPM** il 9 ottobre 2026.
   L'idea di partenza era un numero **digitato a mano**; parlandone è diventata
   una cosa migliore: **riprodurre l'iter che Mattia fa già a mano**, che è
   ripetibile e quindi calcolabile. Il nome lo ha scelto lui — **VPM,
   Valutazione Partita Manuale** — e vuol dire "riproduce il giudizio manuale",
   non "lo scrive una persona". ⚠️ Quindi **non serve più** la tabella nuova per
   i voti numerici, e le tre decisioni (chi lo mette, che forma ha, cosa ne fa
   la selezione) sono risolte: lo calcola il database, è 1-10 come il Grado, e
   **non entra nella selezione delle spin**.

4a. [x] **Il calcolo** — `src/lib/vpm.js`, puro e provabile da terminale con
   `scripts/prova-vpm.js`. L'iter di Mattia, nelle sue parole: *"1) classifica,
   gol fatti subiti e differenza · 2) la forma nelle ultime 5/10 · 3) forma casa
   e fuori, ci sono squadre che in casa non subiscono gol · 4) testa a testa,
   per vedere se pareggiano sempre"*. I primi tre sono lo stesso calcolo su tre
   finestre (45/30/25); il quarto è una **bandierina**, non un peso.
   - **Misurato prima di scegliere i pesi** (561 squadre-stagione, 24/25+25/26):
     vittorie e differenza reti correlano **0,93** — nell'Excel pesavano 0,30 e
     0,20, cioè metà indice su un'informazione sola, e la differenza reti è
     scesa a 0,05. Gol fatti e tiri in porta **0,90**, gol subiti e tiri
     concessi **0,81**: i tiri stanno accanto ai gol, non al posto loro.
   - **Il possesso palla non esiste** nei dati: al suo posto `dominio` = quota
     dei tiri in porta. Misura chi fa male invece di chi tiene la palla.
   - **Ancore separate per casa e fuori**, perché la misura lo impone (mediana
     del dominio 0,548 contro 0,447): altrimenti la squadra di casa prendeva un
     bonus gratuito, e il fattore campo è già nella quota.
   - **Verificato sui dati veri del 9/10.** Lens-Lyon: il mercato dà l'1 al 39%,
     VPM **3,68** (Lens 4,90 contro Lyon 8,54) più la bandierina rossa
     *"3 pareggi su 6 a Lens"* — che il conteggio sui soli scontri complessivi
     non vedeva (1 su 6). Le **9 partite della spin 1** escono tutte fra 6,37 e
     9,27, e Barcellona 9,39 / Porto 9,96 / Freiburg 9,91: nessun segno
     invertito. Su 149 partite del weekend, 5 sotto 4 e 12 sopra 8.

4b. [x] **L1 — i dati, in una chiamata** — fatto il 9 ottobre 2026.
   `sql/20-vpm.sql` → **`vpm_dati()`**, applicata e provata: **76,9 KB in
   837 ms**, 15 campionati e gli scontri di 183 partite future (per confronto
   `classifiche()` è 17,5 KB in 131 ms — accettabile per una chiamata per
   sessione).
   - Restituisce due blocchi: **squadre** (per campionato e squadra, le quattro
     finestre `stagione · forma · casa · fuori` come somme grezze `n,v,gf,gs,tf,tc`)
     e **scontri** (per `prossima_id`, i conti del testa a testa: ultimi 6
     complessivi e ultimi 6 **sullo stesso campo**).
   - ⚠️ **Somme grezze, non punteggi**: ancore e pesi restano in `lib/vpm.js`,
     così si ritoccano senza migrazione. Stessa divisione dell'attendibilità —
     il database dà i numeri, la libreria decide cosa valgono.
   - ⚠️ **Niente filtro sul campionato negli scontri**, e il primo tentativo
     aveva sbagliato: con `p.div = f.div` Ipswich-Fulham passava da 6 scontri a
     2 e la bandierina spariva. I club sono gli stessi club, e `forma_partita()`
     (sql/17) li mostra già così: due conteggi diversi sulla stessa partita
     nella stessa schermata sarebbero un difetto.
   - **Provato due volte, di proposito**: `scripts/prova-vpm.js` ora calcola
     **dalle partite grezze e da `vpm_dati()`** e confronta — **149/149
     identiche sul numero e sulle bandierine**. È così che si è trovato
     l'errore del filtro: il confronto segnalava 8 bandierine diverse.
   - **Permessi verificati con la chiave anon**: `permission denied for
     function vpm_dati`. I tre `revoke`/`grant` di sql/19 sono nel file.

4c. [x] **L2 — il numero in lista** — fatto il 9 ottobre 2026 (**1.02.00**).
   - `hooks/usaVpm.js`: `vpm_dati()` **una volta per sessione**, come
     `usaClassifiche`. ⚠️ Se la chiamata fallisce la lista funziona comunque e
     le caselle fanno `—`: VPM è un dato in più, non il contenuto della pagina.
   - **Il collante sta in `lib/vpm.js`** (`valutaPartita`, `verso`), non nelle
     pagine: lista e scheda devono leggere lo stesso numero, e la logica in due
     posti è la strada per farli divergere.
   - La barra della riga ha **quattro campi**: *giocata · Grado · VPM · quota*.
     Mattia: *"4 dati ci stanno, non c'è testo solo dei numeri"*. I due numeri
     stanno in mezzo e **vicini**, perché il confronto fra loro è il motivo per
     cui ci sono. **Rosso sotto 4, verde sopra 6,5, grigio in mezzo**: si legge
     senza leggere i numeri.
   - ⚠️ **L'etichetta della quota è bloccata su una riga** (`nowrap` +
     ellissi): con la quarta colonna ha meno spazio, e andando a capo avrebbe
     allungato **solo alcune** card — lista irregolare. È la regola "niente
     deve cambiare altezza".
   - **Anche in Partite votate**, che usa la stessa riga: due liste con VPM
     diversi sulla stessa partita sarebbero un difetto.
   - Un filtro nel pannello ⚙: **solo VPM < 4**, con la targhetta rossa fuori.
     È la lista che Mattia cercava a mano in quattro schermate.
   - **Verificato**: `prova-vpm.js` ora fa passare la strada del database da
     **`valutaPartita`**, cioè la funzione che chiama l'app — **149/149
     identiche** su numero e bandierine. Non è una copia del calcolo: è quello.
   - ⚠️ **Seconda schermata nera, stessa famiglia** (1.02.01): il `useMemo` dei
     filtri leggeva `vpmDi`, che avevo dichiarato **venti righe sotto**. `const`
     ha la zona morta → `Cannot access 'vpmDi' before initialization` al primo
     render. Il nome esiste, quindi `no-undef` taceva e il build passava.
     ✅ Chiuso con **`no-use-before-define`** nel linter: acceso, ha trovato
     subito altri **due casi latenti** (`nomeBook` in `attendibilita.js`,
     `votate` in `SpinProvvisoriePage`) che funzionavano solo perché chiamati
     dal JSX. Riordinati, lint a 0.
     ⚠️ Resta scoperto il montaggio vero della pagina: due schermate nere in due
     giorni le ha trovate **Mattia**, non io. Se ne capita una terza, la risposta
     è una prova di render delle pagine, non un'altra regola.

4c-bis. [x] **La riga squadrata, quattro colonne uguali** — 9 ottobre 2026
   (**1.02.02**). Mattia: *"le schede devono diventare quadrate, sotto la barra
   deve avere 4 colonne equidistanti e il risultato in mezzo alla colonna"*.
   - **Spigoli vivi** sulla card della riga e sulla barra dentro. ⚠️ Fatto in
     `RigaPartita`, **non** nel `Card` di `ui.jsx`: quello lo usano anche
     Dashboard, Bilancio e Reporting, dove gli angoli restano tondi. I tondini
     delle squadre e le targhette restano rotondi — sono distintivi, non schede.
   - **`repeat(4, 1fr)`** con tutto centrato: prima la giocata stava a sinistra
     e la quota a destra, con colonne di larghezze diverse, e scorrendo la lista
     i numeri ballavano da una riga all'altra.
   - **Ogni colonna ha la sua etichetta sotto, anche la giocata** (`GIOCATA`):
     senza, quella sarebbe l'unica colonna più bassa e la fila si vedeva storta.
   - ⚠️ **Il nome del book è uscito dalla riga**: `Codere · 1 secco` non sta in
     un quarto di card (86px su ~75 disponibili), e andando a capo avrebbe
     allungato solo alcune righe. Ora dice `QUOTA` o `1 SECCO`; **la fonte
     resta nei dettagli completi della scheda**, dove c'era già.
   - Vale anche per **Partite votate**, che usa la stessa riga.
   - **Rifinito subito dopo** (1.02.03): valore **centrato anche in altezza** e
     **linee divisorie** fra le quattro colonne. ⚠️ La fascia del valore ha
     **altezza fissa** (`ALTA_VALORE`): la giocata è scritta più piccola delle
     cifre perché deve starci `1+O1,5`, e senza quell'altezza le quattro
     etichette sotto stavano a quote diverse. Le quattro colonne sono ora un
     unico componente `Colonna`, così non si possono più disallineare.

4c-ter. [x] **VPM girato: il verdetto del campo, non il voto alla giocata** —
   9 ottobre 2026 (**1.03.00**). Mattia, guardando la lista: *"la partita Lens
   Lyon la vedo con VPM 3,68. Sbagliatissimo, è una partita minimo minimo da 6"*.
   - **Aveva ragione sulla sostanza.** Il calcolo era coerente — la giocata
     consigliata è l'1 su Lens, il campo dice Lyon, quindi voto basso — ma
     rispondeva alla domanda sbagliata: lui non guarda quanto è buono l'1,
     guarda **chi è più squadra**. Lo stesso scarto dal lato di Lyon fa **7,32**
     (i due sono speculari, sommano 11).
   - **Ora VPM dice il segno del campo e quanto è netto**: 5,5 forze pari, 10
     divario massimo. **Il disaccordo col mercato è il colore**: verde stesso
     segno, rosso segno opposto, grigio sotto 6. In lista si legge `2 7,32` in
     rosso — il campo dice 2, la giocata è 1.
   - Il filtro diventa **"solo campo ≠ mercato"**, e conta solo se il campo è
     netto (≥ 6): un campo indeciso non è un disaccordo.
   - ⚠️ **Lezione**: un indice che riassume un giudizio deve rispondere alla
     domanda di chi lo legge, non a quella più comoda da calcolare.
   - ⚠️ **Trovato di rimbalzo**: il confronto fra le due strade ha segnalato una
     bandierina diversa su Virtus Entella-Juve Stabia. Non era la funzione SQL:
     era lo **script** che paginava 34.000 scontri ordinati per sola `data`, con
     migliaia di pari merito — `.range()` su un ordine non deterministico perde
     righe. Aggiunto `.order('id')`. Di nuovo **149/149**.

4c-quater. [x] **I tasti per ordinare la lista** — 9 ottobre 2026 (**1.04.00**).
   Attendibilità · Grado · VPM, **sempre visibili** e funzionanti con i filtri
   attivi, come chiesto.
   - I tasti stanno **attaccati alla lista**, fuori dal pannello ⚙: un filtro si
     mette una volta, l'ordine si cambia continuamente per guardare la stessa
     lista da tre lati. L'ordinamento avviene **dentro lo stesso `useMemo` dei
     filtri**, subito dopo di loro: così vale sempre su quello che è rimasto, e
     non c'è un secondo elenco da tenere allineato.
   - ⚠️ **I confronti stanno in `lib/ordine.js`**, non nella pagina. Motivo
     concreto: un ordinamento dentro un componente **non si prova**, e i suoi
     difetti non si vedono — un confronto che restituisce `NaN` non lancia
     niente, lascia solo la lista in un ordine qualunque.
   - `scripts/prova-ordine.js` li esegue sui dati veri **e su righe finte**:
     oggi le 149 partite hanno tutte Grado e VPM, quindi la protezione sui
     valori mancanti non sarebbe stata provata da niente. Con le righe finte:
     tutti e tre decrescenti ✓, mancanti in fondo ✓, ordine stabile ✓.
   - ⚠️ Due dettagli che sembrano stile e non lo sono: il valore assente va **in
     fondo** (`null` in una sottrazione dà `NaN`), e ogni criterio ha **due
     criteri di riserva** (attendibilità, poi data) — senza, due partite con lo
     stesso Grado si scambiano di posto a ogni ridisegno e la lista balla.

4c-quinquies. [x] **Finestra "Oggi" e il segno di VPM al bordo** — 9 ottobre
   2026 (**1.05.00**).
   - **"Oggi"** è la prima pillola delle finestre, accanto a "Fino a lunedì":
     oggi dà **17 partite** su 141 della settimana. ⚠️ La data è **locale**
     (`oggiLocale()`), non `toISOString`: quella è UTC e fra mezzanotte e le due
     italiane dà ieri — provato, all'01:00 del 10/10 UTC dice 09/10. **La stessa
     funzione la usa ora anche `usaProssime`**, che prima caricava con la data
     UTC: così le due non possono divergere.
   - La nota *"nessuna partita in più"* ora compare solo per le finestre **più
     larghe** di "fino a lunedì": su "Oggi" quel confronto non vuol dire niente.
   - **Il segno di VPM è appoggiato al bordo sinistro della cella**, fuori dal
     flusso, e il numero resta centrato. Mattia: *"è brutto, quasi non si
     capisce"*. Messo accanto alla cifra la spostava fuori centro e si
     confondeva con lei; `position: absolute` lo stacca senza muovere il numero.

4d. [x] **L3 — la scheda** — fatto il 9 ottobre 2026 (**1.06.00**), provato da
   Mattia in `npm run dev` prima del commit.
   - Blocco **🧮 VPM** in fondo, prima del consenso (spostato due volte da
     Mattia: 1.06.01 sotto il consenso, poi 1.06.02 il consenso **per ultimo**,
     quindi l'ordine finale è forma → classifica → scontri → **VPM** → consenso
     → dettagli): le due forze a confronto, i tre strati, i sette parametri.
   - **Tolte le tre quote `max · media · equo`** dalla testa della scheda
     (1.06.02): erano numeri da consultare, non da guardare, e rubavano spazio
     alla giocata. **Restano tutte nei dettagli completi**, con le terne per
     intero — verificato, non si è perso niente. Il Grado resta accanto alla
     giocata, più grande di prima perché ora ha la riga per sé. Il numero più alto di ogni riga è in grassetto e
     chiaro, l'altro spento — si trova chi vince quel parametro **senza leggere
     le cifre**.
   - ⚠️ **Accanto a ogni strato c'è il peso VERO, non quello nominale.** Su
     Lens-Lyon "nel ruolo" vale **10%** e non 25%, perché Lens ha giocato 2
     partite in casa su 5: il peso che avanza torna alla stagione, che sale a
     60%. Una riga lo spiega in chiaro. Senza quel numero sembrerebbero tre
     strati indipendenti, e a ottobre non lo sono.
   - **Quello che la lista non poteva dire**: nella riga "nel ruolo" Lens fa
     **7,29** contro il 6,55 di Lyon — in casa Lens è più squadra di quanto Lyon
     lo sia fuori. È il passo 3 dell'iter che funziona; pesa 10%, quindi non
     ribalta niente, ma ora si vede invece di essere dedotto.
   - **Le bandierine** stanno nel blocco "⚔️ Scontri diretti", sopra l'elenco.
     ⚠️ L'elenco mostra **5** scontri (`forma_partita`, sql/17) e la bandierina
     conta **6, sullo stesso campo**: per questo la scritta dice sempre *su
     quante*, altrimenti sembra un errore di conto.
   - ⚠️ **La scheda si calcola VPM da sé**, dallo stesso hook di sessione della
     lista: stessa funzione e stessi dati, quindi non possono divergere. Passarlo
     come proprietà avrebbe voluto dire toccare due pagine.
   - **Nuovo controllo che resta**: `vociPesate()` (i parametri con i tre strati
     fusi) e `forza()` sono due strade sugli stessi numeri, quindi deve valere
     `Σ pesi × parametri = FORZA`. `scripts/prova-scheda.js` lo verifica su
     tutte le partite: **298 squadre-partita, scarto massimo 3,6·10⁻¹⁵**. Se un
     giorno qualcuno tocca i pesi in un posto e non nell'altro, lo dice subito.

4f. [ ] **Normalizzare la forma dei tre numeri** (deciso il 10/10, non ancora
   fatto): stesso corpo e peso per attendibilità, Grado e VPM, il `%` **più
   piccolo e in alto**, un `/10` esplicito dopo Grado e VPM nella scheda, e
   l'attendibilità con **un decimale** nella scheda.
   ⚠️ **L'attendibilità NON si converte in 1-10.** Mattia l'aveva proposto per
   uniformare; misurando si è visto che non guadagna nulla e perde molto: con
   una conversione lineare `75%` diventa `7,75` — le stesse cifre con un nome
   peggiore — e si perde l'unica cosa calibrata che abbiamo ("vince tre volte su
   quattro", misurato). Ancorandola al campo osservato gli estremi cambierebbero
   ogni settimana, la trappola già evitata con `GRADO_MIN/MAX` e le `ANCORE`.
   E le soglie **75/72/65** sono percentuali scelte da Mattia il 23/09, vivono
   in **nove file** e decidono le spin: due scale sulla stessa cosa sarebbero il
   difetto peggiore. ⚠️ Decisivo: il **voto unico** (lotto N) sarà una
   probabilità, quindi l'attendibilità è il suo seme — sono gli **altri due** a
   dover cedere il posto, un domani.

4e. [x] **L4 — assorbito dal lotto N** (10/10): i pesi di VPM si ritoccano
   misurando VPM nel passato, non a sensazione dopo qualche settimana. ~~Dopo
   qualche settimana.~~ Ritoccare i pesi con le partite vere
   davanti, e rispondere a *VPM aggiunge qualcosa al mercato?* — si fonde con
   la voce 7 (giocate vere contro proposte).

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

## ✅ Fuori lotto — il contatore e il linter — 8 ottobre 2026

**Il contatore dello sviluppo** (`src/versione.js`) si vede in barra accanto al
nome, piccolo e mono. Serve perché l'app si aggiorna da sola su Vercel: senza un
numero a schermo non si sa se si guarda il lavoro di oggi o la cache di ieri.
Si legge maggiore.minore.ritocco e **si alza a mano a ogni commit** che cambia
l'app: terza cifra una rifinitura, seconda un lotto o una funzione, prima un
cambio d'impianto. Non è la `version` di `package.json`, che resta a npm.

**`npm run lint`** — chiesto da Mattia dopo la schermata nera. ESLint 10,
configurazione piatta in `eslint.config.js`, quattro pacchetti di sviluppo.
- **Prende quello che il build non vede.** Provato su un file finto con
  `lunediProssimo` non importata: ESLint esce con 1 e dice
  `'lunediProssimo' is not defined`; `vite build` sullo stesso file passa.
- **Deve restare a 0 errori**, altrimenti non lo si guarda più. All'accensione
  erano **27 errori e 8 avvisi**; ora **0 errori e 8 avvisi**.
- **Cosa ha trovato di vero** (tutto sistemato): `delta` e `myStorTot` in
  `BilancioPage` erano calcoli che non finivano da nessuna parte, `getMyBase` e
  `getTotalBase` prese dal contesto e mai usate in `ReportingPage`, `Scudetto` e
  `giorno` importate e non usate in `DettaglioPartita`, `alpha` in `VotatePage`,
  `aaaa` in `cellaDa`, due risultati scartati in `prova-permessi.js` e tre
  protezioni inutili nelle regex di `SlotPage`.
- ⚠️ **`rules-of-hooks` è spenta in `src/hooks/`**: i nostri hook si chiamano
  `usa*` e la regola riconosce un hook solo dal prefisso `use`, senza poter
  essere istruita — bocciava tutti e quattro i file. Si perde il controllo
  "niente hook dentro un `if`" in quella cartella; nelle pagine resta.
- ⚠️ **`eslint-plugin-react` non è installato**: la 7.37 non supporta ESLint 10.
  Non è stato forzato. Conseguenza: niente `jsx-uses-vars`, quindi se un giorno
  un componente usato **solo** nel JSX venisse segnalato come inutilizzato, la
  causa è questa — non va cancellato.
6. **Escludere una partita dall'anteprima** con un clic, senza correggerla dopo
   in Slot.
7. **Confrontare le giocate vere con le proposte** nel rendiconto: ora si può,
   ogni casella porta `prossima_id`. È la domanda di fine settembre — *il
   giudizio delle persone aggiunge qualcosa al mercato?* — e con 19 voti
   comincia a essere rispondibile.
8. **Lo storico delle spin**: oggi le 4 spin sono un blob JSON in una riga sola
   condivisa (`griglia` id=1). Niente spin passate, e due admin che editano
   insieme si sovrascrivono.

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

## ✅ Lotto A — Le stelline contano davvero — fatto il 2 ottobre 2026

1. [x] **Una stellina forza l'ingresso.** `candidate()` accetta `votiDi`: una
   partita votata entra comunque, sotto soglia **e fuori dalla finestra**.
2. [x] **Riprodotto il difetto, e la causa non era quella che sospettavo.**
   Non la soglia — **la finestra**. Le Spin provvisorie usavano "fino a lunedì"
   fissa: il 02/10 trovavano **una sola candidata**, perché le partite votate
   erano del 9-17 ottobre. Tutte le votate erano sopra soglia.
   Ora `finestraUtile()` parte dalla finestra più stretta che basta a riempire
   le spin chieste, e tre pillole con i conteggi permettono di cambiarla.
   Verificato: con i voti veri le candidate passano da **1 a 9**, e le nove
   votate riempiono una spin con la più votata (★2) al centro.
3bis. [x] **La griglia con le stelline contiene SOLO le votate** (2/10): niente
   riempitivi, le caselle restano vuote se i voti non bastano. Deve dire cosa
   avete scelto voi, non cosa ci metterebbe il criterio. Le celle diverse
   dall'automatica si accendono in **violetto** — oro, verde e celeste sono già
   i colori delle tre categorie, e l'arancione si confondeva con l'oro.
3ter. [x] **Si sceglie a mano cosa va in ogni casella** (2/10). Tocchi una
   casella della griglia con le stelline e si apre `ScegliCasella`: filtri
   **★ votate · centro · gialle · blu · tutte** con i conteggi, ricerca per
   squadra o campionato (anche per sigla nuova, "ITA1"), e "svuota la casella".
   Si apre **già sul filtro giusto per la posizione** (9 = centro, 1-4 angoli,
   5-8 lati). Le scelte **vivono nella pagina**, non nel database: finché non
   si preme "Compila spin" è anteprima, e **↺ riparti dalle votate** rimette
   l'ordine automatico.
   - È una **finestra al centro**, non una tendina ancorata come in griglia:
     le caselle sono quadratini da 100px e sul telefono la tendina usciva fuori.
   - **I doppioni**: stessa spin → barrata e non scegliibile; altra spin →
     scegliibile ma con la targhetta **`S2`** (violetto) e il segno **`↔2`**
     ambra nella casella, così l'errore si vede senza aprire niente.
     ⚠️ Due colori diversi di proposito: il violetto dice già "diversa
     dall'automatica", l'ambra dice "sta anche altrove".
   - ⚠️ **Le etichette lunghe dentro una colonna elastica vengono tagliate**:
     "già in spin 2" spariva perché divideva lo spazio col nome delle squadre.
     Ogni segnalazione vuole una **colonna a larghezza fissa**, più una legenda
     — su telefono il suggerimento del mouse non esiste.
3. [x] **Pagina "Partite votate"** (menu ☰, ⭐). Riusa `RigaPartita`,
   `DettaglioPartita` e l'hook `usaProssime`: contiene solo filtro e ordine —
   le più votate prima, poi per attendibilità, lo stesso ordine con cui entrano
   nelle spin.

**Fatto strada facendo:** `lib/spin.js` è tornato puro, la scrittura della
griglia è passata in **`lib/griglia.js`**. Senza, il caso non si poteva
riprodurre da terminale (spin.js importava Supabase). È la convenzione del
progetto, e stavolta è servita a trovare la causa vera.

## ✅ Lotto B — La lista delle partite — fatto il 2 ottobre 2026

4. [x] **La lista torna dov'era.** `posizione` (useRef) salva `window.scrollY`
   all'apertura della scheda, un `useLayoutEffect` lo rimette quando si torna.
   Serve perché la scheda **sostituisce** la lista, che viene smontata.
5. [x] **Barra dei filtri rifatta da zero.** Prima erano sei controlli in fila
   che sul telefono andavano a capo a caso. Ora: **un tasto `⚙ filtri`** col
   numero di quelli accesi, le **targhette dei filtri attivi** (si tolgono
   toccandole), `azzera tutto`, e a destra il conto `visibili/totali`.
   Il resto sta in un **pannello che si apre solo se serve**, con i campi
   raggruppati (campionato · quota min/max · grado minimo · categorie) e le
   soglie in fondo.
6. [x] **Filtro per Grado**, con le scorciatoie `6+ 7+ 8+`.
7. [x] **Deciso: il Grado sostituisce la resa a schermo.** Dicevano la stessa
   cosa in due modi. Via la resa dalla testata (lista e scheda); nella scheda
   il riquadro `RESA` è diventato `GRADO`; la resa in percentuale, col decimale,
   resta nei **dettagli completi**, dove si va per il numero esatto.

**Trovato strada facendo:** la nota "Come leggere" in fondo alla lista diceva
ancora *"sopra 1,90 si passa alla doppia chance"* — regola tolta il 23/09.
Corretta, e aggiunta una riga su cos'è il Grado.

## ✅ Fuori lotto — l'ingrandimento automatico su iOS — 5 ottobre 2026

Aprendo la scelta della partita in "Spin provvisorie", il telefono si
ingrandiva sul campo di ricerca e non si vedeva più la scheda. Causa: su iOS
un campo con testo **sotto i 16px** fa zoomare Safari quando riceve il fuoco,
e i due campi avevano `autoFocus` + testo 12px.

- [x] `index.css`: `input, select, textarea` a **16px** sotto
      `@media (pointer: coarse)` — vale per tutta l'app, non solo qui.
- [x] L'`autoFocus` si dà solo col mouse (`tocco` in `lib/schermo.js`): sul
      telefono la finestra si apre intera, la tastiera arriva se la chiami.
- [x] Verificato che il `<meta viewport>` non blocchi il pizzico: ingrandire a
      mano resta possibile, ed è giusto così.

## ✅ Lotto C — Finire la scheda della partita — fatto il 5 ottobre 2026

8. [x] **Scontri diretti e consenso rifiniti** (5/10/2026).
   - Titoli coerenti con gli altri blocchi: **⚔️ Scontri diretti** e
     **📊 Consenso di mercato**, con la linea sotto.
   - La sintesi degli scontri è **una barra** verde/gialla/rossa con i conti
     ai lati, non più tre nomi accorciati coi puntini — venivano tagliati e il
     confronto spariva (stessa trappola della targhetta "già in spin 2").
   - Ogni precedente ha **una casella V/N/P** letta dal lato della squadra di
     casa di domani: prima bisognava dedurre dal punteggio chi avesse vinto fra
     le due che interessano.
   - Nel consenso, **la quota accanto a ogni percentuale** (`q1/qx/q2`, dati
     che già avevamo): "il mercato dice 75%" e "te la pagano 1,30" sono due
     metà della stessa frase. Più una riga che dice da dove vengono le
     percentuali e che la X non si gioca mai.
   - **Gli scontri restano "in qualunque campionato"** (confermato da Mattia):
     ora che le coppe sono escluse significa solo "quando una delle due stava
     in serie inferiore", e la sigla accanto dice quanto pesarlo.
9. [x] **Provato da Mattia il 5/10: nessun problema segnalato.** Calcolato
   prima: nella riga degli scontri ai due nomi restano 83px a 375, 90 a 390,
   110 a 430 — i nomi lunghi si accorciano coi puntini, il resto resta
   leggibile. ⚠️ Questa prova la può fare **solo lui**: l'over/under che andava
   a capo era sfuggito proprio perché guardato solo sul browser.

## ✅ Lotto D — Storico — fatto il 5 ottobre 2026

10. [x] **Le ultime chiuse: 10 subito, 30 col tocco.** In fondo alla lista un
    tasto `⌄ altre 20 · in tutto 30`, che si richiude. In testa alla sezione il
    conto `10 di 166`, così si sa quante ce ne sono in tutto.
    Trenta righe sempre aperte allungavano la pagina di uno schermo e mezzo.
    Costanti `VISIBILI` e `MASSIME` in cima al file.

## 🟢 Lotto G — Pulizia — fatta il 7 ottobre 2026

18. [x] **README.md** scritto: cos'è il progetto, le due cartelle, come si
    parte, il comando che si usa davvero, e il rimando a CLAUDE.md/STATO.md.
    Era vuoto (una riga).
18b. [x] **I documenti di btscout aggiornati.** `btscout/CLAUDE.md` non dice più
    "sorella di JARVIS, progetto a sé": dice che è il motore di BetterTrade, che
    le regole stanno nella radice, e tiene solo le regole del motore — che
    valgono tutte ("la matematica calcola, Claude giudica", il margine, le
    trappole della misura). `btscout/STATO.md` è diventato **archivio storico**
    con un cappello che lo dice: serve a non rifare gli esperimenti S1-S6 già
    falliti, non a sapere dove siamo.
19. [x] **PWA di chat cancellata** (`btscout/api/`, `index.html`, `vercel.json`
    vuoto): mai andata online — lo diceva il loro stesso STATO, *"Deploy: non
    ancora creato su Vercel"*. Resta nella storia di git se servisse.
20. [x] **`calcSchedule`: misurato, e NON va corretto.** Avevo scritto che "con
    base bassa produce €0 su tutte le voci": falso con i numeri veri. Sui saldi
    del 7/10 si gioca il **96-97%** della base (Bermani: base 198,91 → 193
    giocati), si perde il 3-4% per arrotondamento. Gli zeri arrivano solo sotto
    i 33 € di base (sparisce la full), sotto i 10 (la quaterna), sotto i 6,50
    (il tris). Cambiarlo **sposta gli importi che il gruppo gioca davvero**:
    è una decisione, non una pulizia. Scritto nel commento del codice.
21. [x] **Backtest marcati, non toccati.** Mattia (7/10): *"non mi interessano i
    backtest, ma un domani potrebbero servirmi"*. `backtest.js` e `s1`-`s6`
    hanno ora un avviso in testa: sono della vecchia fase, e i quattro che usano
    `ps_*` (backtest, s2, s5, s6) **perdono la stagione in corso in silenzio**
    perché Pinnacle non esiste più dalla 26/27. Da passare a `bfe_*` o `avg_*`
    prima di rifidarsi dei numeri.
21b. [ ] **Ambiente di prova su Vercel** — resta aperto, ed è una decisione di
    Mattia: ogni push su un ramo diverso da `main` genererebbe un'anteprima, ma
    cambia il modo di lavorare (push sul ramo → guardi → unisci). Oggi ogni
    push va dritto in produzione, ed è già costato una schermata nera.

---

## ✅ Lotto 1 — Testata e navigazione — fatto il 30 settembre 2026

1. [x] **Le pagine arrivano fino in fondo.** La tab bar è `position:fixed` e le
   pagine ci scorrevano sotto: le ultime righe restavano nascoste. Ora la
   scocca è un flex verticale, la pagina ha `flex:1` (così riempie lo schermo
   qualunque sia l'altezza della testata, senza numeri magici) e un
   `paddingBottom` pari a `--barra-bassa`, definita una volta in `index.css`.
2. [x] **Il tasto di uscita al posto delle iniziali**, a sinistra del nome,
   in oro. Le iniziali non dicevano niente che il nome accanto non dicesse già.
3. [x] **Il menu**, rifatto in tre passaggi con Mattia: prima pannello laterale
   a tutta altezza, poi riportato **sotto la testata** — copriva la barra e si
   perdeva l'animazione del tasto. Ora scende dall'alto sfumando (0,24s),
   ha un'altezza massima che gli impedisce di finire tagliato, e **l'hamburger
   si trasforma in ✕**: le tre barrette ruotano e quella di mezzo svanisce.
   Pannello e sfondo restano montati (spostati e trasparenti) — se React li
   smontasse, l'uscita non potrebbe animarsi. Transizioni in `index.css`, che
   le spegne da sé per chi ha chiesto meno movimento nel sistema.

⚠️ **Trappola trovata qui:** i `<button>` **non ereditano il colore del testo**.
L'icona `◎` di Utenti usciva nera su nero, mentre ⚽🎰📚 si vedevano perché le
emoji a colori ignorano il colore del testo. Ogni glifo dentro un pulsante
vuole il suo `color`.

## ✅ Lotto 2 — Il Grado — fatto il 30 settembre 2026

3. [x] **Il Grado, da 1 a 10 con due decimali**, nella barra della riga:
   **giocata a sinistra, Grado al centro, quota a destra**.

   **Le decisioni di Mattia, e perché contano:**
   - **Il nome.** Si chiama **Grado**, non "voto": così le stelline restano
     "voti" in app e database e **non serve nessuna migrazione**. Avevo
     proposto di rinominare `voti_partite`; il nome nuovo ha reso inutile
     il problema.
   - **La formula.** Non `attendibilità × resa` ma **la resa da sola**.
     Motivo: la resa *contiene già* l'attendibilità (resa = quota × prob), e
     moltiplicarle di nuovo fa pesare la probabilità due volte, premiando la
     sicurezza. Mattia vuole il contrario: *"per capire al volo se vale la
     pena rischiare di più per un guadagno maggiore"*.
   - **Non entra nella selezione delle spin.** È un dato da guardare.
   - **La scala è stirata, non lineare.** Sulle 4.813 partite sopra soglia
     dell'archivio la resa sta fra 0,905 (1° pc) e 0,987 (max), mediana 0,946:
     moltiplicata per 10 darebbe voti tutti fra 9,0 e 9,8. Estremi fissi
     **0,90 → 1** e **0,98 → 10** (`GRADO_MIN`/`GRADO_MAX`), misurati una
     volta sola: ricalcolarli sulla lista corrente farebbe cambiare Grado alla
     stessa partita ogni settimana.

   - **Poi la quota è entrata nel conto** (30/09, dopo il primo giro):
     *"il Grado deve includere anche il valore della quota"*. Aveva ragione e
     i dati lo dicevano: la correlazione fra Grado e quota era **0,10**, cioè
     quasi zero. Il motivo è che resa = quota × probabilità e le due si
     compensano: Barcelona-Getafe (Q 1,18, att 82%) e Lille-Le Havre (Q 1,48,
     att 65%) avevano **la stessa resa 97%** e quindi lo stesso Grado, ma con
     100 € rendono 18 contro 48.
     Ora **Grado = 70% resa + 30% livello della quota** (`PESO_QUOTA = 0.30`,
     quota stirata fra `QUOTA_MIN` 1,15 e `QUOTA_MAX` 1,55 — nell'archivio le
     giocabili stanno fra 1,19 e 1,45). Il peso si cambia in una riga.

   Sulle 28 di oggi: in testa **Arsenal-Leeds 9,19** (Q 1,43, att 69%),
   poi Strasbourg-PSG 8,54 (Q 1,46) e Lille-Le Havre 8,43 (Q 1,48);
   Man City-Ipswich scende a 7,11 perché a 1,26 rende poco per euro.

   - [ ] **Da decidere guardandolo**: il Grado e la "resa 97%" nella testata
         dicono la stessa cosa in due modi. Forse va tolta una delle due.

## ✅ Lotto 5 — Le ultime 5 partite, al tocco — fatto il 1° ottobre 2026

9. [x] **Cliccando una casella V/N/P (o O/U) si apre la partita che c'è
   dietro**: giorno, in casa o fuori, avversario, risultato **dalla parte della
   squadra** e over/under. La casella toccata si accende, si richiude
   ritoccandola. Il dato prima stava solo nel `title`: col mouse sopra, quindi
   su telefono invisibile.

   **La riga mostra la partita nell'ordine vero** — `Cagliari 0–1 Inter`, non
   `fuori vs Cagliari 1–0`: è come la si ricorda. La squadra che si sta
   guardando è in chiaro e in grassetto, l'altra spenta. (Primo giro fatto
   girando i gol dalla parte della squadra: Mattia non era convinto, e aveva
   ragione — obbligava a ricostruire a mente chi avesse segnato cosa.)
   Verificato sui dati veri su Inter e Parma, casi in trasferta compresi.

   `striscia()` è stata spostata da `hooks/usaForma.js` a **`lib/forma.js`**:
   è un calcolo puro e nell'hook non era provabile da terminale (l'hook importa
   React e Supabase). È la convenzione del progetto, vale la pena rispettarla.

---

## L'obiettivo finale

BetterTrade propone una **lista di partite** scelte secondo parametri calcolati
sull'archivio, con filtri sulle quote. Io o gli utenti scegliamo quali prendere,
e l'app **compila da sola** griglia e schedine.

**Il criterio che interessa a Mattia (11 settembre):** riconoscere le partite in
cui **la quota è più alta di quanto dovrebbe essere**. Non "chi vincerà", ma
"questo prezzo è sbagliato in mio favore". Vedi la sezione qui sotto.

**Come si userà (16 settembre, chiarito la sera):** l'app mostra le partite
future ordinate per **attendibilità = probabilità che la giocata vinca**, secondo
il consenso del mercato. Da quella lista **tre persone** scelgono a mano 9 o 18
partite per 2 spin. L'app semplifica la ricerca, la scelta resta umana.

**La spin come la vede Mattia:**

```
   1(G)  5(B)  2(G)     G = gialli, i 4 angoli: le partite più attendibili
   6(B)  9(★)  7(B)     B = blu, i 4 lati: sacrificabili
   3(G)  8(B)  4(G)     ★ = centro: la partita perfetta (sta in 3 schedine)
```

**Le regole di gioco:** mai la X secca · quota < 1,25 → favorito + over 1,5 (se
non basta, over 2,5) · quota > 1,90 → doppia chance (1X o X2).

⚠️ **Il primo criterio era sbagliato.** "Quota più alta di quanto dovrebbe
essere" trova sfavoriti a quota 8 con l'1% di vantaggio — vero e inutile per un
sistema che deve indovinare nove esiti. La domanda giusta è *quale esito è più
probabile*; lo scarto sul prezzo resta un'informazione secondaria.

---

## 🎯 Il criterio: quote più alte di quanto dovrebbero essere

Deciso l'11 settembre 2026. È il parametro con cui l'app sceglierà le partite da
proporre, e cambia cosa conta nei dati.

### Perché è diverso da "prevedere il risultato"

Non serve un modello che indovini chi vince: serve un **prezzo di riferimento**
con cui confrontare la quota del bookmaker. Se Bet365 paga 2,10 una cosa che vale
2,00, quella differenza è misurabile senza prevedere niente.

### Il riferimento c'è, ed è buono

**Betfair Exchange.** Non è un bookmaker: è gente che si scambia scommesse fra
loro. Non c'è un banco che ci mette sopra il suo margine, quindi il prezzo è il
più vicino a quello vero che si possa avere gratis.

Quanto vale la differenza, misurata sull'archivio — margine implicito, dove 1 è
il prezzo equo:

| | margine |
|---|---|
| Betfair Exchange | **1,007** |
| Pinnacle (non più pubblicato) | 1,033 |
| Media di mercato | 1,073 |

### Le colonne, e a cosa servono

Nell'archivio stanno vicine ma hanno ruoli opposti — **non confonderle**:

| Colonna | Cos'è | Ruolo |
|---|---|---|
| `b365_*` | Bet365, **apertura** | La quota che **giochi davvero** |
| `bfe_ap_*` | Betfair Exchange, **apertura** | **Il riferimento onesto**: esiste quando giochi |
| `bfe_ap_valido` | Calcolata dal database | **TRUE solo se `bfe_ap_*` è un prezzo reale.** Usare sempre `where bfe_ap_valido` |
| `bfe_ch_*` | Betfair Exchange, **chiusura** | Più preciso ma *non esiste ancora* quando giochi |
| `avg_*`, `max_*` | Media e massima di mercato, chiusura | Contesto |

⚠️ **Apertura contro chiusura è la trappola del progetto.** Misurare un segnale
contro `bfe_ch_*` significa scoprire che il metodo funziona usando informazioni
che non avevi. Il confronto onesto è `b365_*` contro `bfe_ap_*`.

### Fatto l'11 settembre 2026

- [x] **Colonne rinominate**: `bfe_*` → `bfe_ch_*`, perché erano la chiusura e il
      nome non lo diceva. Vedi `app/sql/07-exchange-apertura.sql`.
- [x] **Aggiunte `bfe_ap_1/x/2` e `bfe_ap_over25/under25`** e caricate.
- [x] **Reimportate le stagioni 24/25, 25/26, 26/27** (l'exchange non esiste
      prima della 24/25 — limite della fonte, non un errore).

**Copertura:**

| Stagione | partite | b365 | exchange apertura | exchange chiusura |
|---|---|---|---|---|
| 2023/24 | 3.831 | 3.827 | — | — |
| 2024/25 | 3.758 | 3.758 | **3.753** | 3.758 |
| 2025/26 | 3.757 | 3.756 | **3.498** | 3.524 |
| 2026/27 | 370 | 370 | **358** | 369 |

### ⚠️ Scoperta importante: l'apertura non è un prezzo equo

Il margine implicito dell'exchange **di apertura** non è quel 1,007 che aveva
colpito — quello è la chiusura. All'apertura il mercato è ancora sottile e il
prezzo è largo:

| Stagione | Bet365 apertura | **Exchange apertura** | Exchange chiusura |
|---|---|---|---|
| 2024/25 | 1,0617 | **1,0521** | 1,0065 |
| 2025/26 | 1,0681 | **1,0381** | 1,0073 |
| 2026/27 | 1,0725 | **1,0296** | 1,0070 |

**Conseguenza pratica:** l'exchange di apertura non si usa così com'è. Va
**normalizzato** — si dividono le tre probabilità implicite per la loro somma,
e da lì si ricava la quota equa. Solo dopo ha senso confrontarlo con Bet365.

Resta comunque il riferimento migliore disponibile al momento della giocata:
1,03 contro 1,07 di Bet365. E il suo margine si sta restringendo di stagione in
stagione (1,052 → 1,038 → 1,030).

### La misura del criterio — 16 settembre 2026

`btscout/scripts/misura-valore.js`. Regole: solo quote di apertura, solo
`bfe_ap_valido`, prezzo equo = exchange normalizzato, puntata fissa, intervallo
di confidenza al 95%. Nessun modello, quindi niente da stimare né walk-forward.

**10.415 partite** con exchange reale (24/25, 25/26, 26/27 parziale), 31.245
scommesse possibili.

| Cosa giochi | n | vinte | ROI | IC 95% |
|---|---|---|---|---|
| Tutto, sempre *(= margine del banco)* | 31.245 | 33,3% | **−7,9%** | [−9,6 … −6,3] |
| Solo il favorito | 10.568 | 50,8% | −5,5% | [−7,4 … −3,7] |
| **Bet365 > equo** (scarto > 0) | **777** | 28,4% | **+1,0%** | **[−11,3 … +13,4]** |
| Bet365 > equo, scarto > 2% | 348 | 24,1% | −12,2% | [−31,1 … +6,7] |
| Bet365 > equo, scarto > 5% | 151 | 20,5% | −23,2% | [−54,6 … +8,2] |
| Bet365 < equo di oltre 10% *(controllo)* | 5.751 | 20,5% | −20,0% | [−24,7 … −15,3] |

**Tre cose che i numeri dicono:**

1. **Il segnale distingue i prezzi buoni dai cattivi.** A caso −8%; dove Bet365
   è generoso ~0%; dove è tirchio −20%. La direzione è giusta, il controllo lo
   conferma.
2. **Cancella il margine, non lo batte.** +1,0% con intervallo [−11%, +13%]:
   777 scommesse non distinguono un +1% dal caso. Onesto dire: *il criterio
   porta a pari*. Non: *guadagna*.
3. **Peggiora alzando la soglia.** Un vantaggio vero cresce con la soglia; qui
   crolla (0% → −12% → −23%). Gli scarti grandi sono soprattutto **rumore**
   dell'exchange di apertura, che è sottile. `bfe_ap_valido` toglie i mercati
   vuoti, non il rumore ordinario.

**Tracce, non dimostrate** (intervallo include lo zero): la **X** (+8,2%,
n=516) e la **fascia di quota 3–5** (+9,7%, n=566). Per stagione: 24/25 +8%,
25/26 −5%, 26/27 −27% su 58 scommesse — instabile.

**Coerente con S6 line shopping** (+1,6%, IC che sfiora lo zero): stessa natura,
stesso ordine di grandezza. Confrontare prezzi funziona quanto basta a non
perdere, non ancora quanto basta a vincere.

**Limiti della misura:** Bet365 e exchange di apertura possono essere raccolti in
momenti diversi (parte dello scarto è movimento, non errore); le quote sono
quelle pubblicate, non quelle che un conto reale otterrebbe.

### Il secondo riferimento cambia il verdetto — 16 settembre 2026, sera

Aggiunte a `partite` le quote di **apertura** della media di mercato e della
massima (`avg_ap_*`, `max_ap_*`, `sql/10`): 37.755 partite dal 2019/20, otto
stagioni contro le tre dell'exchange. Il margine della media di apertura è
uguale a quello di Bet365 (~1,06): non è un prezzo più affilato, è il
**consenso** di 40 book — toglie gli errori del singolo bookmaker.

**Il ROI resta rumoroso con qualunque riferimento:**

| Riferimento | n | ROI (scarto > 0) | Forma |
|---|---|---|---|
| Exchange apertura | 777 | +1,0% [−11 … +13] | peggiora alzando la soglia |
| **Media apertura** | 5.480 | −3,4% [−9 … +2,5] | **migliora**: >5% → +15,8% [−4 … +36] |
| Accordo di entrambi | 181 | −15% | troppo pochi |

Per stagione il segno del ROI cambia quasi ogni anno. A quota media 6, il conto
economico su qualche centinaio di scommesse è quasi tutto varianza.

### La misura che conta: il valore rispetto alla chiusura (CLV)

La quota di **chiusura** — l'ultimo prezzo prima del fischio, con tutte le
informazioni dentro — è la migliore stima disponibile della probabilità vera.
Se le scommesse scelte hanno *in media* una quota Bet365 sopra la chiusura equa,
la selezione ha **vantaggio atteso**, anche quando il ROI balla. È la misura
che i professionisti usano al posto del ROI, perché ha venti volte meno rumore.

**La chiusura qui valuta la selezione dopo il fatto. Non entra nella scelta.**
Nessun senno di poi: si sceglie con l'apertura, si giudica con la chiusura.

Selezione: *Bet365 apertura > media di mercato apertura normalizzata*.
Valutazione: *quota Bet365 / media di mercato di chiusura normalizzata − 1*.

| Selezione | n | CLV | IC 95% | |
|---|---|---|---|---|
| Tutte le scommesse | 113.082 | **−5,7%** | [−5,7 … −5,6] | il margine del banco |
| Scarto > 0 | 5.480 | **+2,0%** | [+1,7 … +2,3] | ✓ |
| Scarto > 2% | 2.602 | **+4,0%** | [+3,5 … +4,5] | ✓ |
| Scarto > 5% | 907 | **+7,2%** | [+6,2 … +8,2] | ✓ |
| *Exchange ap., scarto > 0* | 777 | *−2,1%* | *[−2,8 … −1,5]* | ✗ **perde** contro la chiusura |

**Regge ovunque lo si guardi** (scarto > 0):

| | | |
|---|---|---|
| **Per stagione** | positivo in 7 su 8, con IC sopra lo zero in 6 | 19/20 +3,3 · 20/21 +3,7 · 21/22 +1,3 · 22/23 +1,9 · 23/24 +1,1 · **24/25 −0,4** · 25/26 +1,5 · 26/27 +0,7 (n=102) |
| **Per segno** | positivo su tutti e tre | 1: +1,7 · X: +1,9 · 2: +2,1 |
| **Per fascia di quota** | cresce con la quota | 3–5: +0,9 · 5–10: +2,3 · 10+: +5,1 |
| **Per campionato** | 12 su 15 con IC sopra lo zero, **nessuno negativo** | E0 +4,2 · T1 +4,1 · SP2 +2,9 · … · SP1 +0,1 · I1 +0,8 |

**Cosa dice, e cosa non dice:**

- **Dice:** quando la quota Bet365 di apertura è sopra il consenso di apertura,
  in media resta sopra anche il consenso finale. Bet365 sta pagando **più del
  prezzo vero** su quelle scommesse, di circa il 2% (7% con soglia 5%). Non è
  rumore: 5.480 scommesse, otto stagioni, tre segni, quindici campionati.
- **Dice anche:** l'exchange di apertura come riferimento **non funziona**. Le
  scommesse che sembrano buone contro l'exchange sono *peggiori* della chiusura
  (−2,1%): l'exchange all'apertura è troppo sottile, il suo "prezzo" è rumore.
  **Il riferimento del progetto è la media di mercato di apertura, non l'exchange.**
- **Non dice:** che giocando si guadagna il 2% a colpo sicuro. CLV +2% è il
  vantaggio *atteso* per scommessa; il realizzato su 800 scommesse a quota 6
  può stare ovunque fra −10% e +15%. Servono migliaia di scommesse perché il
  realizzato converga sull'atteso.
- **Non dice:** che il vantaggio resterà. La tendenza è in **calo**: +3,3% e
  +3,7% nelle prime due stagioni, ~+1,5% nelle ultime. I mercati si fanno più
  efficienti.
- **Non dice** niente sulla struttura ad accumulator (tris, quaterne, full):
  queste sono misure su singole. Combinare 3 o 4 scommesse moltiplica anche i
  margini, non solo i vantaggi.

**Coerenza con S6 line shopping** (+1,6%): stesso meccanismo — confrontare
prezzi — e stesso ordine di grandezza. Ora però con una misura molto più
robusta e otto stagioni invece di due.

### Il segnale "Como" non esiste come regola — misurato il 16/09

`btscout/scripts/misura-forma.js`. La domanda: le squadre che nelle ultime 5
partite hanno fatto meglio di quanto il mercato prevedeva, continuano a farlo?
64.127 osservazioni (squadra × partita) su otto stagioni.

| Sorpresa nelle ultime 5 | n | vittorie attese | reali | scarto |
|---|---|---|---|---|
| molto sotto le attese | 8.644 | 34,3% | 34,9% | +0,6 |
| in linea | 18.217 | 37,0% | 36,8% | −0,2 |
| **molto sopra le attese** | 8.559 | 39,9% | 38,8% | **−1,0** ✗ |

**Il mercato non è in ritardo: è già a posto entro cinque partite.** Le squadre
in forma vincono *leggermente meno* di quanto le quote dicono — il mercato le
ha già rialzate, semmai un filo troppo. Solo squadre nuove nella categoria
(10.794 oss.): stesso quadro, ancora più marcato (−2,6% per le "molto sopra").
**Como e Sunderland sono eccezioni memorabili, non una regola.** Nessun indice
di forma migliora il consenso.

**Ma c'è un dato utile, e va nella direzione giusta:** i **favoriti vincono più
di quanto il consenso dice**, di circa 3,5 punti, in tutte le fasce di forma:

| Favorite (consenso ≥ 55%) | n | attese | reali | scarto |
|---|---|---|---|---|
| tutte le fasce di forma | 9.028 | ~65,5% | ~68,8% | **+3,3** ✓ |

È il noto *favourite-longshot bias*: il mercato tiene i favoriti un po' più
bassi del vero. Per un sistema che deve indovinare esiti è una buona notizia —
**l'attendibilità mostrata in pagina è leggermente conservativa**. Non è un
vantaggio sul prezzo (CLV −5,7%, ROI ~−1%): il margine resta.

### L'indice di attendibilità, deciso

**Probabilità della giocata secondo il consenso di mercato.** Nessun modello,
nessun indice di forma: la misura dice che non aggiungono niente. Lo scarto sul
prezzo resta nel dettaglio della riga, come seconda informazione.

### Rilanciare la misura

```bash
cd btscout
node --env-file=.env scripts/misura-valore.js --riferimento=media      # quella che conta
node --env-file=.env scripts/misura-valore.js --riferimento=exchange   # per confronto
```

Da rifare a fine stagione, quando ci sono più dati. Se il CLV della stagione in
corso scende sotto zero con IC stretto, il vantaggio è finito.

### Come rifare tutto da capo

```bash
# 1. le colonne (una volta sola, già fatto)
#    app/sql/07-exchange-apertura.sql sulla dashboard Supabase

# 2. i dati
cd btscout
node --env-file=.env scripts/import-storico.js --stagioni=2425,2526,2627

# 3. il controllo
node --env-file=.env scripts/verifica-storico.js
```

La mappa fra colonne CSV e colonne del database sta in `COLONNE`, in cima a
`btscout/scripts/import-storico.js`. I nomi dei CSV: `BFEH/BFED/BFEA` è
l'apertura, `BFECH/BFECD/BFECA` la chiusura.

### Nota dallo storico del progetto

Questo tipo di confronto **è già stato misurato una volta** in BTScout: la
strategia S6 *line shopping* — l'unica con esito positivo fra le sei provate
(+1,6%) — funzionava esattamente così, confrontando prezzi invece di prevedere
risultati. Non usava il modello. Vedi l'appendice in fondo.

---

## ⚠️ Storico e calendario sono due cose diverse

**L'archivio contiene solo partite già giocate.** Dal 29 luglio 2016 al 31 maggio
2026, zero partite senza risultato. È uno storico, non un calendario: da solo
non può proporre partite da giocare, perché quelle partite non ci sono.

| | Fonte | A cosa serve |
|---|---|---|
| **Storico** | `football-data.co.uk`, stagioni chiuse | Calcolare i parametri, fare ricerca e simulazioni |
| **Calendario** | `football-data.co.uk/fixtures.csv` (prossimo blocco, con Bet365) + **The Odds API** (3-4 settimane, consenso di 40 book) | Sapere quali partite si giocano e a che quota |

Le due cose stanno in due tabelle separate e si incontrano solo quando una
partita viene giocata: allora esce dal calendario ed entra nello storico.

---

## ✅ FASE 1 — L'archivio dentro l'app — fatta il 9 settembre 2026

- [x] **38.613 partite migrate su Supabase**, nello stesso database dell'app.
      Verificate contro la sorgente: totale, conteggi su tutti e 100 i gruppi
      campionato-stagione, estremi temporali, 200 partite confrontate campo per
      campo, e la lettura reale dall'app con e senza login.
- [x] **Policy RLS su `partite`**: lettura a chi ha fatto login, scrittura solo
      dagli script con `service_role`.
- [x] **BTScout parla con Supabase.** Gli script continuano a fare SQL — qui si
      fanno aggregazioni e GROUP BY, tradurle in chiamate REST sarebbe stato una
      perdita netta — cambia solo a quale Postgres puntano (`btscout/lib/db.js`).
- [x] **`import-storico.js` non ricostruisce più la tabella.** Faceva
      `DROP TABLE partite` a ogni esecuzione: ora si porterebbe via anche le
      policy. Fa upsert sulla chiave unique, che è anche quello che serve ogni
      settimana per la stagione in corso.
- [x] **`verifica-storico.js` dà gli stessi numeri di prima** letti da Supabase.
- [ ] **Dismettere Neon.** Non serve più a niente: l'ultimo consumatore era
      `api/chat.js`, migrato anche lui. **Da fare a mano sulla console Neon.**

**Attenzione alle date.** Nel dump di Neon erano istanti UTC: `2016-08-25T22:00Z`
sono le 00:00 del **26** agosto ora italiana. Tagliare i primi dieci caratteri
avrebbe spostato l'archivio indietro di un giorno su tutte e 38.613 le righe.
Conseguenza da tenere a mente: **la cache locale `btscout/.cache/partite.json`
è quella vecchia**, con le date sfalsate, e i backtest girano su quella. Quando
la si rigenera con `dump-locale.js` le date cambiano di un giorno — nel verso
giusto, ma i risultati dei backtest non saranno bit-per-bit gli stessi.

---

## ✅ FASE 2 — Portare l'archivio a oggi — fatta l'11 settembre 2026

- [x] **Stagione 26/27 importata.** L'archivio arriva a oggi: **38.983 partite**.
      Aggiunta anche l'opzione `--stagioni=2627`, perché rifare tutte e undici
      significa scaricare 110 CSV — giusto la prima volta, sprecato ogni settimana.
- [x] **Quote Betfair Exchange aggiunte** (`bfe_1`, `bfe_x`, `bfe_2`,
      `bfe_over25`, `bfe_under25`) e caricate sulle stagioni dalla 24/25.

### Pinnacle è sparito, e il sostituto è migliore

football-data ha smesso di pubblicare Pinnacle: le colonne `PSC*` ci sono fino
alla 25/26 — dove già coprivano meno della metà delle partite — e spariscono
dalla 26/27. Era il riferimento "affilato" dei backtest.

Al suo posto **Betfair Exchange**, presente dalla 24/25. È un exchange: il prezzo
che le persone si scambiano davvero, senza margine del banco sopra.

| Stagione | partite | Pinnacle | Exchange | media |
|---|---|---|---|---|
| 2023/24 | 3.831 | 3.831 | — | 3.831 |
| 2024/25 | 3.758 | 3.758 | **3.758** | 3.758 |
| 2025/26 | 3.757 | 1.646 | **3.524** | 3.757 |
| 2026/27 | 370 | 0 | **369** | 370 |

**Margine implicito** (1 = prezzo equo; più alto = più margine del banco):

| Stagione | Pinnacle | Exchange | Media mercato |
|---|---|---|---|
| 2024/25 | 1,0333 | **1,0065** | 1,0546 |
| 2025/26 | 1,0330 | **1,0073** | 1,0713 |
| 2026/27 | — | **1,0070** | 1,0728 |

L'exchange copre più partite *e* ha un margine cinque volte più stretto di
Pinnacle. Non è un ripiego: è il prezzo più onesto che abbiamo mai avuto.

### Resta da fare

- [ ] **Gli script di backtest usano ancora `ps_*`.** Con Pinnacle sparito,
      chiunque li lanci sulla stagione in corso perde le partite senza accorgersene.
      Va aggiunta l'opzione `--quote=exchange` e reso quello il riferimento
      predefinito.
- [ ] **Il controllo sulle squadre con poche partite fa rumore.**
      `verifica-storico.js` segnala decine di squadre della 26/27, che è
      cominciata da tre giornate: corretto, ma seppellisce i problemi veri.
      Va insegnato a distinguere una stagione appena iniziata da un buco.
- [ ] **Rigenerare la cache locale** (`dump-locale.js`). Le date cambieranno di
      un giorno — nel verso giusto, vedi la nota della fase 1 — quindi i backtest
      non torneranno bit-per-bit come prima.

---

## ✅ FASE 3 — Censire e ampliare i campionati — fatta il 16 settembre 2026

### Cosa c'è ora: 15 campionati, 53.796 partite

| Paese | 1ª serie | 2ª serie |
|---|---|---|
| Inghilterra | E0 Premier League | E1 Championship |
| Italia | I1 Serie A | I2 Serie B |
| Spagna | SP1 Liga | SP2 Liga 2 |
| Germania | D1 Bundesliga | D2 2. Bundesliga |
| Francia | F1 Ligue 1 | F2 Ligue 2 |
| **Portogallo** | **P1 Primeira Liga** | *non pubblicata* |
| **Olanda** | **N1 Eredivisie** | *non pubblicata* |
| **Turchia** | **T1 Süper Lig** | *non pubblicata* |
| **Belgio** | **B1 Pro League** | *non pubblicata* |
| **Scozia** | **SC0 Premiership** | — |

I cinque in grassetto sono nuovi: **14.714 partite**, 11 stagioni ciascuno,
exchange dalla 24/25 come gli altri. Verificati per nome delle squadre, non
solo per codice (vedi sotto perché).

Copertura dell'exchange di apertura sulle stagioni recenti, dopo l'aggiunta:
2024/25 **100%** · 2025/26 **93%** · 2026/27 **97%**.

### Cosa NON c'è, e perché

- **Seconde serie di Portogallo, Olanda, Turchia, Belgio**: football-data non
  le pubblica. Non esistono sulla fonte.
- **Giappone (J1)**: esiste, ma in un'altra sezione del sito e in un altro
  formato — un solo file dal 2012, **solo quote di chiusura**, niente apertura né
  statistiche. Per il criterio del progetto (Bet365 apertura contro exchange
  apertura) è inutilizzabile. Escluso.
- **Serie minori inglesi e scozzesi** (E2, E3, EC, SC1-3): disponibili, stesso
  formato, ma mercati sottili — l'exchange di apertura sarebbe larghissimo e
  "Bet365 paga più dell'exchange" diventerebbe frequente e vuoto. Rimandate a
  quando avremo visto se il segnale funziona su mercati liquidi.
- **Grecia (G1)**: disponibile, non richiesta.

### ⚠️ L'errore del P2, da non rifare

Avevo annunciato che la seconda serie portoghese esisteva: `P2.csv` rispondeva
HTTP 200 con 462 righe. **Era falso.** Il server reindirizza i codici inesistenti
su un file simile — `P2.csv` → `SP2.csv` — e ho importato **4.675 partite della
Segunda spagnola etichettate come portoghesi**. Le squadre erano Mallorca,
Getafe, Alaves: bastava guardarle.

Rimosse (verificato che fossero duplicati esatti di SP2, riga per riga), e
messa una **guardia nell'import**: la colonna `Div` dentro il file deve
coincidere con il codice richiesto, altrimenti si ferma. Provata su P2: blocca.

**Regola:** un HTTP 200 dice che il server ha risposto, non che ha risposto
quello che hai chiesto. Guardare il contenuto, sempre.

### Rinomine trovate e sistemate

Un club che cambia nome fra due stagioni spezza il suo storico in due squadre.
Trovate due, mappate sul nome attuale sia nel database che in `ALIAS`
(`import-storico.js`) per le importazioni future:

| Campionato | Vecchio nome | Nome attuale | Motivo |
|---|---|---|---|
| B1 | Waasland-Beveren | Beveren | rinominato SK Beveren nel 2022 |
| T1 | Erzurum BB | Erzurumspor | BB Erzurumspor → Erzurumspor FK |

**Non** unite, perché sono club diversi: `Gaziantepspor` (fallito nel 2020) e
`Gaziantep` (ex Gazişehir); `Lorca` e `Mallorca`. Registrate in `NON_ALIAS`
dentro `verifica-storico.js` così non vengono più segnalate.

### Audit completo del 16 settembre — archivio pulito

Prima di passare alla fase 4, `scripts/audit-archivio.js` (nuovo): 14 controlli
su duplicati sotto etichette diverse, squadre nel paese sbagliato, date fuori
stagione, campi vuoti, coerenza esito/gol, quote fuori scala, struttura dei
campionati. **Tutti verdi.** Da rilanciare dopo ogni import di un campionato nuovo.

Tre cose della fonte, non correggibili, da sapere:
- **VVV Venlo–Ajax 0-13** (N1, 24/10/2020) è vero: record dell'Eredivisie.
- **Celtic–Hearts `max_2` = 251** (SC0, 16/05/2026): quota di un book rimasta
  appesa a fine stagione. `max_*` ha qualche valore così.
- **6 terne `avg_*` con somma < 1** (arbitraggi impossibili): errori di
  football-data. Elencate dall'audit.

E una che riguarda il criterio: **370 partite (3,4%) hanno un exchange di
apertura che non è un prezzo** — `1.02/1.01/1.01`, il segnaposto di un mercato
ancora vuoto. Marcate FALSE da `bfe_ap_valido` (`sql/08`), colonna che il
database calcola da solo a ogni riga.

### Strumenti migliorati

- `audit-archivio.js` — il controllo completo, vedi sopra.
- `import-storico.js --campionati=P1,N1` — importa solo alcuni campionati,
  senza riscaricare gli altri.
- `verifica-storico.js` ora **esclude la stagione in corso** dal controllo
  "squadre con poche partite" (a settembre le segnalava tutte) e ha un
  **controllo nuovo sulle rinomine fra stagioni**: cerca nomi simili che non
  giocano mai nella stessa stagione. Avrebbe trovato Beveren ed Erzurum da solo.

---

## ✅ FASE 4 — Le partite future — fatta il 16 settembre 2026 (prova del weekend venerdì)

**Fonte verificata e gratuita:** `football-data.co.uk/fixtures.csv`. Stesso
formato dello storico, stessi codici, stessi nomi squadra. Per ogni partita:
Bet365, **exchange di apertura**, media e massima di mercato, Over/Under 2.5.

**Il limite:** non è una finestra di 7 giorni. È *il prossimo blocco* di partite,
sostituito ogni volta — quote raccolte **venerdì pomeriggio** (weekend) e
**martedì** (infrasettimanale). Si scarica due volte a settimana e si accumula.

### Fatto

- [x] **Tabella `prossime_partite`** (`sql/09`). Separata dallo storico: una ha
      il risultato, l'altra no. Con `scaricato_il` — l'istante del download,
      perché una quota ha senso solo insieme al momento in cui l'hai vista — e
      `bfe_ap_valido` calcolata dal database, stessa regola dello storico.
      Media e massima si chiamano `avg_ap_*`/`max_ap_*`: qui sono di apertura,
      nello storico di chiusura, e un nome uguale con significato diverso è una
      trappola.
- [x] **Non si cancella mai niente.** Ogni riga è la fotografia di cosa si vedeva
      prima della partita. Quando si gioca, entra in `partite` dall'import
      normale, ma qui resta la traccia. L'app legge `where data >= current_date`.
- [x] **`btscout/scripts/importa-prossime.js`**: scarica, tiene solo i 15
      campionati seguiti, fa upsert (la fotografia più recente vince). Robusto a
      un DNS che risolve a intermittenza: prova entrambi i nomi del sito, quattro
      volte, con pause crescenti.
- [x] **Primo download riuscito:** 30 partite nel file, 15 dei nostri campionati
      (blocco infrasettimanale 15-17/09), tutte con l'exchange.

### Il criterio applicato dal vivo, per la prima volta

Sulle 6 partite ancora da giocare al momento del download (16/09, 18:00):

| Partita | Bet365 | Equo (exchange norm.) | Scarto 1 / X / 2 |
|---|---|---|---|
| La Coruna–Sevilla | 2,40 / 3,25 / 3,00 | 2,65 / 3,19 / 3,24 | −9,5 / **+2,0** / −7,3 |
| Betis–Getafe | 1,57 / 4,00 / 5,75 | 1,73 / 3,84 / 6,26 | −9,0 / **+4,3** / −8,1 |
| Barcelona–Santander | 1,06 / 14 / 23 | 1,09 / 21,1 / 32,2 | −2,3 / −33,7 / −28,5 |
| altre 3 | | | tutti negativi |

Due segnali su sei, **entrambi sulla X**: come diceva lo storico. E su
Barcelona–Santander Bet365 paga la X il 34% meno del dovuto — il margine del
banco si concentra dove pensa che la gente giochi male.

**Non è una raccomandazione:** non abbiamo ancora misurato se giocare quei +2% e
+4% guadagna. È la prima volta che la macchina fa la cosa per cui la stiamo
costruendo.

### Da futuro a storico — costruito il 16 settembre 2026

Non si sposta niente. Quando una partita si gioca entra in `partite` dall'import
dello storico; la riga in `prossime_partite` resta com'era e riceve un puntatore
(`partita_id`, `sql/11`) alla riga dello storico. Così ogni partita, una volta
giocata, sa: com'è finita, che quote football-data ha registrato come apertura,
e che quote **noi** avevamo visto al download. Il confronto fra le ultime due
dice se la fotografia era fedele — `riconcilia-prossime.js` lo fa e segnala
scarti oltre il 5%. Cerca anche nei ±7 giorni, per i rinvii.

**Stato:** le 9 partite del 15/09 sono *in attesa* — football-data non ha ancora
pubblicato quei risultati (latenza normale, i risultati infrasettimanali escono
nei giorni dopo). Al prossimo aggiornamento il collegamento scatta da solo.

### Seconda fonte: The Odds API — 16 settembre, sera

Football-data dà solo il prossimo blocco. Mattia voleva più partite senza
aspettare venerdì: **The Odds API**, piano gratuito da 500 crediti al mese.
Copre tutti e 15 i campionati, elenca le partite **tre-quattro settimane in
anticipo** con le quote di 40+ bookmaker (Pinnacle e Betfair compresi).

- [x] **`lib/odds-api.js`** e **`scripts/importa-prossime-odds.js`**: scrive in
      `prossime_partite` la media (`avg_ap_*`), la massima e l'exchange; **non
      tocca Bet365** — The Odds API non ce l'ha — così una riga arrivata da
      football-data tiene la sua.
- [x] **`lib/nomi-squadre.js`**: la mappa dei nomi, 146 tradotti ("Inter Milan"
      → "Inter", "Atlético Madrid" → "Ath Madrid"), generata in automatico e
      **rivista a mano**. Una trappola trovata nella revisione: "Paris Saint
      Germain" era finito su "Paris FC", un'altra squadra. Un nome sconosciuto
      viene segnalato e la partita saltata, mai inserita con un nome che non
      aggancia lo storico.
- [x] **Colonna `fonte`** in `prossime_partite` (`sql/12`): chi ha scritto
      l'ultima fotografia.
- [x] **Primo import: 161 partite fino al 12 ottobre**, tutti i nomi
      riconosciuti, 35 bookmaker in media. Le 6 partite già presenti da
      football-data si sono fuse sulle stesse righe: Bet365 conservato, consenso
      aggiornato. Nessun doppione.
- [x] Nella routine come passo 4, **solo con `--esegui`**: la prova a vuoto
      costa comunque 30 crediti.

- [x] **Bookmaker di riferimento: Codere** (`book_*`, `sql/13`), l'unico con
      licenza italiana fra quelli presenti — Bet365, Sisal, Snai, Eurobet non ci
      sono. Scelto da Mattia: "la variazione sarà simile", ed è vero, i book
      italiani hanno margini simili. Configurabile con `ODDS_BOOK` in `.env`;
      il nome del book sta nella colonna, niente da rinominare se cambia.
- [x] **Codere non quota tutto**: 118 partite su 161. Mancano **Belgio e
      Portogallo interi**, metà della Liga del weekend, e tutto ciò che è oltre
      la settimana. La pagina usa una scala — **Codere → Bet365 → massima sul
      mercato** — e sotto ogni quota dice quale delle tre è.

**Crediti:** 30 per giro. Mattia prevede ~4 giri al mese → 120 su 500.
Controllo: `x-requests-remaining` stampato a ogni import.

### La routine, in un comando

```bash
cd btscout && node --env-file=.env scripts/aggiorna.js --esegui
```

Fa quattro cose in ordine: risultati → storico, future giocate → collegamento,
prossimo blocco (football-data), tre settimane (The Odds API). Se un passo
fallisce si ferma lì. **È il comando che il pulsante
"Aggiorna" nell'app dovrà eseguire** (fase 5).

**Quando:** martedì e venerdì, dopo le 18. Provata da cima a fondo il 16/09.

### Da fare

- [ ] **Venerdì 18/09 dopo le 18**: primo blocco del weekend con tutti i
      campionati maggiori. `aggiorna.js --esegui`.
- [ ] **Decidere la cadenza:** a mano (in calendario!) o schedulato. Lo script
      c'è; manca chi lo lancia.
- [ ] **Al primo collegamento riuscito**, leggere il confronto quote viste /
      quote registrate: se lo scarto è sistematico, la "apertura" dello storico
      non è il prezzo che si gioca davvero, e la misura del criterio va riletta.

### Rete: il DNS singhiozza, gli script lo sopportano

Il 16/09 la risoluzione dei nomi falliva a intermittenza — prima col router
(192.168.1.1), poi anche con 1.1.1.1 impostato. `lib/rete.js` prova entrambi
i nomi del sito (con e senza `www`), quattro volte, con pause crescenti; lo
usano sia `import-storico` sia `importa-prossime`. Se uno script fallisce
comunque con `ENOTFOUND`, aspettare un minuto e rilanciare.

---

## 📅 Aggiornamento del 22 settembre 2026 — e la sosta lunga

`aggiorna.js --esegui` eseguito. Archivio a **53.951 partite**, stagione in
corso 862, ultima giocata **20/09**. Riconciliazione: 155 future su 156
collegate allo storico.

**⚠️ Non ci sono partite fino al 9 ottobre.** Non è un errore dell'import: lo
dicono entrambe le fonti. `fixtures.csv` è fermo al blocco 18-20/09 e
l'elenco eventi di The Odds API (gratis, `eventi()`) per I1 ed E0 salta da
subito al 10 ottobre. Nelle stagioni 24/25 e 25/26 la Serie A giocava il
27-29 settembre: quest'anno no — è la sosta lunga del calendario post-Mondiale.
**Unica eccezione: SP2, che gioca il 25-28/09** (le seconde serie spesso
giocano durante le soste).

Conseguenza pratica per la pagina Partite: **questa settimana la finestra
"fino a lunedì" è vuota** tranne 11 partite di SP2. Il blocco vero è
**9-19 ottobre, 189 partite** già in tabella con il consenso.

- Crediti The Odds API: **368 rimasti** su 500 (24 + 6 oggi).
- Tre campionati (E0, E1, I1) sono caduti per DNS durante il passo 4 e sono
  stati ripresi da soli: da qui `importa-prossime-odds.js --campionati=E0,E1,I1`,
  che costa 3 crediti invece di 24.
- Una futura resta scollegata: **SP1 Levante-Ath Bilbao del 16/09, mai
  giocata** (rinviata). Resta come fotografia, è il comportamento giusto.
- `verifica-storico.js`: nessuna anomalia — 0 esiti incoerenti, 0 quote fuori
  scala, nessuna rinomina sospetta, margini nel range.
- Gestione utenti provata da Mattia dall'app: **Marco e Nico creati** il 22/09.

---

## 🎨 23 settembre 2026 — sigle dei campionati e restyling della slot

### Le sigle: ITA1, ENG1, ESP1…
`src/lib/campionati.js`. ⚠️ **Solo a schermo**: nel database la colonna `div`
resta quella di football-data (`I1`, `E0`, `SC0`), perché è la chiave con cui
arrivano i file ogni martedì e venerdì e sta in tutte le 53.951 righe. Cambiate
in lista, scheda, filtri, spin provvisorie, storico e ricerca della griglia —
dove si può cercare anche scrivendo `ITA1`. Un campionato nuovo va aggiunto
**anche lì**, o mostra la sigla originale (brutta ma innocua).

### La slot, com'è finita dopo una manciata di aggiustamenti
Nove caselle **attaccate**, senza angoli arrotondati, **larghe quanto la
tabella** sopra. Cornice **oro da 3px**, griglia interna **bianca da 1px**
(ottenuta col `gap:1` sullo sfondo del contenitore).

Tre trappole trovate strada facendo, tutte di impaginazione:
1. **Le tinte delle caselle sono semitrasparenti**: con la griglia bianca sotto
   si illuminavano di biancastro. Serve un fondo opaco —
   `linear-gradient(tinta,tinta), C.card`.
2. **Spegnere le caselle non giocate** (grigio scuro) con quel fondo opaco le
   faceva sembrare **nere**: ora restano del loro colore di posizione.
3. **Niente deve cambiare altezza quando arriva un esito.** Il ✓/✗ prende il
   posto del pronostico sulla stessa riga, che ha **altezza fissa 24px**; e la
   riga delle combinazioni vinte **occupa sempre il suo spazio** (22px), o al
   primo esito compariva dal nulla e spingeva giù la pagina.

Nuovi token in `theme.js`: `acciaio` (argento spento, provato e scartato per la
cornice) e `bianco` (l'unico bianco puro, per le linee della slot).

---

## 🎯 23 settembre 2026, sera — soglie 80/74/68 e la resa attesa

Mattia: *"alla fine devo riempire da 1 a max 3 spin con le migliori partite"*,
e la sua stima di redditività: **74% per casella con quota minima 1,40**.

### ⚠️ Quel 74% a 1,40 non esiste, ed è aritmetica
Il 74% vale una quota equa di 1,35; col margine del book diventa ~1,28. Per
trovare 1,40 bisogna scendere **sotto** il 71,4%. Misurato sull'archivio
(37.910 partite dal 19/20): filtrando "attendibilità ≥ 70% **e** quota ≥ 1,40"
restano **zero partite su 37.910**, e zero sulle 189 future.

| attendibilità | quota media | quota più alta MAI vista | resa reale | ROI |
|---|---|---|---|---|
| 65-70% | 1,39 | 1,50 | 71,9% | +0,1% |
| 70-75% | 1,31 | **1,37** | 74,8% | −2,3% |
| 75-80% | 1,24 | **1,30** | 81,2% | +0,9% |
| 80%+ | 1,18 | 1,21 | 91,5% | +7,5% (59 partite: rumore) |

**Il mercato prezza al centesimo**: nessuna fascia ha un vantaggio vero. E la
spin peggiora le cose, perché **le combinate moltiplicano il margine**: se ogni
casella è a −2%, un tris è a −6%. La struttura amplifica la varianza, il
vantaggio può venire solo dalla scelta delle caselle.

### Fatto
- [x] **Soglie 75 / 72 / 65** (`SOGLIE_DEFAULT`), dopo due giri a 80/74/68 e
      78/72/65. Sulle 189 future: 6 centro, 5 gialle, 16 blu — 27 partite,
      tre spin piene.
- [x] **La resa attesa** accanto all'attendibilità, in lista e nella scheda:
      `quota × probabilità`, 100% = pareggio. Per le combinate con l'over la
      quota non esiste in nessuna fonte: si stima dividendo quella del segno
      per `FATTORE_OVER`, ed è marcata con `~`.
      Sulle future di oggi la resa sta fra **93% e 97%**: è il margine del
      book, e va letta come confronto fra partite, non come promessa.

---

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

## ✅ FASE 9 — Le credenziali dentro l'app — fatta il 22 settembre 2026

Mattia: "non mi serve troppa sicurezza, qui ci sono solo dati; vorrei gestire
le credenziali direttamente da dentro l'app". Creare un utente e cambiare la
password di un altro vivevano in `scripts/` perché servono la `service_role`.

**Fatto senza Edge Function**: le esegue il database, `sql/16-gestione-utenti.sql`,
tre funzioni `security definer` come `ricalcola_bankroll`. La chiave resta
fuori dal browser.

### Deciso il 22/09
- **Solo il superadmin** crea, assegna password ed elimina. Gli altri admin
  votano le partite e compilano le spin, niente account.
- **Password sempre hashate**, mai in chiaro nel database. **Le assegna il
  superadmin** (non generate a caso): si vedono una volta sola, nel messaggio
  di conferma.

### Fatto
- [x] `crea_utente(username, password, ruolo, nome, bankroll)`: riga in
      `auth.users` (password bcrypt via `extensions.crypt`), riga in
      `auth.identities` — senza, GoTrue non riconosce l'account come
      email/password — e riga in `public.users`. Controlla username libero,
      formato, password ≥ 6, ruolo valido, e che l'email sintetica non collida.
- [x] `assegna_password(username, password)`.
- [x] `elimina_utente(user_id)`: **chiude una falla vera** — `deleteUser`
      cancellava solo `public.users`, l'account Auth restava e quello username
      non era più ricreabile (l'email risultava presa).
- [x] `email_di()` in SQL: **terza copia** di `emailDi()`, da tenere allineata.
- [x] Pagina Utenti: "＋ Nuovo utente" (username, nome, password, ruolo,
      bankroll) e 🔑 su ogni riga per assegnare una password. Via il riquadro
      che spiegava come fare da terminale.
- [x] `AuthContext`: `creaUtente`, `assegnaPassword`, `deleteUser` via RPC.
- [x] `prova-permessi.js`: sei controlli nuovi — né utente né admin possono
      chiamare le tre funzioni. **Tutti verdi il 22/09.**

### Verificato dall'API, non solo compilato
Quattordici controlli con account veri creati e poi cancellati: utente normale
respinto, superadmin crea, **il nuovo account fa login davvero** (è la prova
che conta: la password hashata dal database è accettata da GoTrue), password
riassegnata (la vecchia non entra più), username già preso / con spazio /
password corta rifiutati, eliminazione che rimuove anche l'account Auth e
username di nuovo riusabile.

### Resta
- [ ] Gli script `crea-utente.js` e `reset-password.js` restano come riserva.
- [ ] Da provare dall'app da Mattia (finora provato solo via API).

---

## 🟢 FASE 6 — La pagina Partite — costruita il 16 settembre 2026

- [x] **Menu ad hamburger** (☰ in alto a destra). I 4 tasti in basso restano
      per l'uso quotidiano; il menu raccoglie il resto: **Partite** e, per gli
      admin, **Utenti** (che era un quinto tasto), **Spin provvisorie**. Il
      pulsante "Aggiorna" arriverà qui con la Edge Function (fase 5).
- [x] **Pagina Partite** (`src/pages/PartitePage.jsx`), riscritta la sera del
      16/09 dopo il chiarimento: le partite future ordinate per **attendibilità
      = probabilità della giocata** secondo il consenso (`avg_ap_*` normalizzata).
      Il favorito è fra 1 e 2 (X esclusa); sotto 1,25 propone "+ over 1,5", sopra
      1,90 la doppia chance con la sua quota stimata e la **sua** probabilità
      (Levante–Bilbao X2 è al 73%, non al 45% del 2 secco).
- [x] **Categorie** centro / giallo / blu con soglie di probabilità **regolabili
      dalla pagina** (default 80 / 65 / 55%): le aggiustano loro tre.
- [x] **Filtri**: campionato, quota min e max, solo sopra soglia. Ogni riga si
      apre e mostra consenso, quote Bet365, over 2,5 e lo scarto sul prezzo.
- [x] **Verificata** sui dati: Barcelona centro 89%, Ath Madrid giallo 68%,
      Betis blu 57%; le altre tre sotto soglia.
- [x] **Finestra della settimana di gioco** (fino a lunedì / anche la prossima /
      tutte) con il conteggio su ogni pulsante; il menu dei campionati mostra
      "I1 – Serie A". Codice spezzato: `lib/attendibilita.js` (solo calcoli, li
      riuserà la compilazione), `components/RigaPartita.jsx`, la pagina.
- [x] **La stella: il voto degli admin** (`voti_partite`, `sql/14`). Ogni admin
      vota una partita una volta; contatore `n/3`; tutti vedono, solo gli admin
      votano e solo a nome proprio. Sette controlli in `prova-permessi.js`.
      È il "tre persone dicono la loro" della visione di Mattia, dentro l'app.
- [x] Centro in verde chiaro, data e ora grandi, quota colorata come la
      categoria con la fonte accanto (Codere / Bet365 / massima), `Q:` davanti.
- [x] **Il quadro di forma al clic** (`forma_partita`, `sql/15`, calcolata dal
      database in una chiamata): ultimi 5 risultati per squadra colorati V/N/P,
      gol fatti e subiti nella stagione con le partite giocate, ultimi 5 scontri
      diretti in qualunque campionato, posizione in classifica e "per forma"
      (la classifica se contassero solo le ultime 5). Solo la stagione in corso:
      a settembre sono 4 partite, e va bene così. Le quote restano in una riga
      piccola in fondo. **Non cambia l'attendibilità**: la forma è già nel
      consenso, serve a chi sceglie per ragionare con gli occhi.
- [x] Filtri quota: accettano la virgola e filtrano sulla quota mostrata.

**Da questa sessione le migrazioni SQL le applico io** dalla connessione
diretta (`btscout/lib/db.js`, ruolo postgres), e le provo subito. I file in
`app/sql/` restano la memoria di cosa c'è nel database.
- [ ] **Da vedere su Vercel dopo il push.** Se la lista è vuota, non è un
      errore: l'aggiornamento del venerdì non è ancora passato.

I calcoli girano nel browser (una divisione per riga): con poche decine di
partite future non serve niente lato database. Se un giorno servissero
aggregazioni sullo storico, quelle vanno in una vista SQL.

---

## 🟢 FASE 10 — La scheda della partita — 22 settembre 2026, in corso

Restyling partito da un mockup che Mattia ha fatto con ChatGPT. Il pannello
che si apriva dentro la riga è diventato una **scheda a tutto schermo**
(`components/DettaglioPartita.jsx`), pensata prima per il telefono. Il clic
sulla riga la apre, il `‹` torna alla lista. `FormaPartita.jsx` è stato
eliminato: la sua query vive ora in `hooks/usaForma.js`, usato dalla scheda.

### Tre cose del mockup che NON abbiamo seguito, e perché
1. **Niente loghi dei club.** Nel database le squadre sono solo nomi di
   football-data, senza codici: servirebbero **282 squadre mappate a mano** su
   una fonte esterna, e i crest sono marchi. Al loro posto **le iniziali su un
   tondo** (`Scudetto`). I loghi veri restano una fase a sé.
2. **Niente riquadro rosso "VALORE −5,6%".** Misurato sulle 103 partite
   quotate del 22/09: lo scarto contro la quota equa è **negativo su tutte**
   (media −6,0%, mai positivo). Non è il valore della giocata, **è la ricarica
   del book** — l'equa la calcoliamo dal consenso senza margine. Un riquadro
   rosso su tutte le partite non informa, spaventa. Al suo posto il confronto
   con la **massima di mercato** (`max_ap_*`), che può essere positivo o
   negativo e dice "altrove pagano meglio". Il margine resta nei dettagli, in
   grigio. **Se qualcuno rimetterà un indicatore di valore, ricordarsi questo.**
3. **Rimessi tre dati che il mockup perdeva**: le stelline (il voto degli
   admin, che serve alle spin provvisorie), la **giocata vera** (`1X`,
   `1+O1,5`, non il segno secco) e la **striscia over/under**.

### Com'è fatta, dall'alto
1. **Evento + giocata in un unico riquadro**, separati da una riga spessa nel
   colore della categoria: badge campionato e categoria, stellina, poi
   **squadra sinistra — attendibilità con barra — squadra destra** (nomi in
   maiuscolo, la favorita accesa), 📅 data e 🕐 ora; sotto la giocata con la
   quota grande, MAX/MEDIA/EQUO e il confronto con la massima.
2. **📈 Forma** — due strisce per squadra (V/N/P e U/O) separate da una linea
   verticale, poi **⚽ gol fatti / subiti**.
3. **🏆 Classifica** — posizione e punti, **V/N/P della stagione**, e sotto la
   posizione per forma con la freccia ▲▼ di quante posizioni sale o scende.
   La barra dei punti è stata tolta: "non mi dice nulla" (Mattia).
   I conti li aggiunge `sql/17-classifica-esiti.sql` dentro `forma_partita`.
4. **Scontri diretti** con la riga di sintesi (vinte / pareggi / vinte).
5. **Consenso** 1/X/2 a barre.
6. **Dettagli completi**, collassato: tutte le terne di quote, over/under 2,5,
   il margine del book, fonte e istante di scarico.

### Resta da fare
- [ ] **La lista** (`PartitePage` + `RigaPartita`): è il pezzo dove si sceglie,
      e non è ancora stato toccato. Mattia: "sicuramente dovremo sistemare
      anche la lista".
- [ ] Rifinire i blocchi 4-6 della scheda (finora rivisti evento, giocata,
      forma, classifica).
- [ ] Provare su telefono vero: finora solo browser desktop.

---

## 🎯 23 settembre 2026 — via la doppia chance

Mattia: *"vorrei che l'algoritmo puntasse direttamente 1 o 2 con le relative
quote. Escludiamo tutte le 1X e X2, troppo conservative. Questa settimana ne
hai prese 15 su 18, ma erano quasi tutte con la X."*

### Misurato prima di cambiare — 155 future poi giocate
| | prese | |
|---|---|---|
| Tutte le proposte sopra soglia (regole vecchie) | 82/127 | **65%** |
| — di cui doppia chance | 57/89 | 64% |
| — favorito + over 1,5 | 6/7 | 86% |
| — segno secco | 19/31 | 61% |
| **Le stesse partite giocate a secco** | 57/127 | **45%** |

**25 delle 57 doppie vinte sono finite in pareggio**: il 44% viveva della X.
L'osservazione di Mattia era giusta, e il prezzo del cambio è noto: **−20
punti di partite prese**, in cambio di giocate che dicono quello che pensano.

### Fatto
- [x] `lib/attendibilita.js`: via la regola `REGOLA_DOPPIA`, via `quotaDoppia`
      e `probDoppia`. Resta `REGOLA_OVER` (sotto 1,25 → favorito + over 1,5).
- [x] **Soglie scese a 75 / 62 / 52** (erano 80/65/55). Sulle 189 future il
      secco dà 3 partite sopra l'80% e 11 sopra il 75%: con le vecchie soglie
      il centro sarebbe rimasto vuoto. Restano regolabili con ⚙ nella lista.
      ⚠️ **Superate la sera stessa**: Mattia le ha ritarate a **75 / 72 / 65**
      (vedi più avanti, "soglie e resa attesa"). Queste restano come storia
      del ragionamento, non sono i valori in vigore.
- [x] Verificato sui dati veri: 189 future → **11 centro, 23 gialle, 30 blu**,
      125 sotto soglia. Le uniche giocate proposte ora sono `1`, `2` e
      `# + over 1,5`.

### La X resta esclusa — confermato il 23/09, con i numeri
Misurato su 37.917 partite con le quote di chiusura: il mercato sulla X è
**calibrato benissimo** (dato al 27-30% → pareggia il 29,6%; al 21-24% →
20,9%), ma **non arriva mai in alto**. La X è stata l'esito più probabile
**135 volte su 37.917, lo 0,36%**, e il massimo mai visto è 33-36%. I pareggi
sono il 26,3% delle partite ma non sono mai il più probabile dei tre.

Quindi anche riaprendola non verrebbe mai scelta: servirebbe un criterio
diverso ("la partita più equilibrata" invece di "l'esito più probabile"), e lì
il mercato non ci dà vantaggio. Tolta anche dalla tendina della griglia
(`PRONOSTICI` in SlotPage), che ora offre solo `1 · 2 · #+O1,5 · #+O2,5`.

---

## 📊 Il rendiconto — 23 settembre 2026

`btscout/scripts/rendiconto.js`. Nato dalla domanda di Mattia: "capire se
stiamo facendo bene e cosa migliorare". Due parti, perché ci sono due dati:

- **A. Calibrazione sull'archivio** (37.910 partite dal 19/20): il criterio
  applicato all'indietro con le sole quote di **apertura**. Dice se "75%" vale
  davvero 75%.
- **B. Le proposte vere** (`prossime_partite` riconciliate, 155 e in crescita):
  resa per categoria, fedeltà delle quote, e le stelline.
  ⚠️ **Ricostruita con le regole di oggi**, non è il registro delle giocate —
  quello sta in `griglia`, non ancora collegata.

### Cosa ha trovato subito: l'over non era scontato
Sulle combinate `favorito + over 1,5` si dichiarava **81,1%** e si prendeva
**76,2%**. Il segno da solo vince l'83,9%, ma solo il **90,8%** di quelle
partite ha almeno due gol. Introdotto `FATTORE_OVER = 0,908` in
`lib/attendibilita.js`: la combinata ora dichiara 73,6% e ne prende 76,2%.

### La calibrazione, dopo la correzione
| dichiarato | reale | scarto |
|---|---|---|
| 50-55% | 53,2% | +0,8 |
| 55-60% | 59,8% | +2,4 |
| 60-65% | 64,6% | +2,2 |
| 65-70% | 71,9% | +4,4 |
| 70-75% | 74,8% | +2,5 |
| 75-80% | 81,2% | +4,6 |
| 80-90% | 91,5% | +10,4 |

**Il criterio è prudente in ogni fascia**: promette meno di quanto mantiene.
È il favourite-longshot bias già misurato, e va nella direzione giusta.
Per categoria: centro 82,0% (dichiarato 76,9), giallo 71,4% (68,4), blu 58,4%
(56,4).

### Quanto è rara una spin perfetta
Prendendo le 9 più attendibili di ogni campionato e stagione: **caselle
indovinate 65,4%**, ma **spin piene 62 su 1.422, il 4,4%** (attese 34, quindi
anche qui si fa meglio del previsto). Una spin perfetta capita una volta su
23: è la matematica delle nove caselle, non un difetto del criterio.

### Le proposte vere (57 sopra soglia, dal 16/09)
33 prese su 57 (57,9%, atteso 62,2%) — centro 7/9, giallo 9/12, blu 17/36.
Le blu sono la parte debole, e sono le sacrificabili: coerente.
Quote viste prima contro Bet365 registrata dopo: **+1,5%**, la fotografia è
fedele. Stelline: **1 sola partita votata**, non c'è ancora niente da leggere.

### Da fare
- [ ] Rilanciarlo ogni settimana dopo `aggiorna.js` e annotare la riga.
- [ ] Portarlo nell'app come pagina "Rendiconto" quando ci sarà più storia.
- [ ] Quando `griglia` sarà collegata (fase 7), confrontare le proposte con
      **quello che il gruppo ha davvero giocato**: è un'altra domanda.

---

## ✅ FASE 11 — La pagina Storico — fatta il 23 settembre 2026

Voce **Storico** nel menu ☰ (tutti, non solo admin). Mostra:
- **L'archivio**: partite totali, ultima giocata, partite future e periodo,
  ultimo scarico delle quote.
- **Le prossime per campionato**, con il conto di centro/gialle/blu.
- **Le nostre proposte**: prese su totali e resa contro il dichiarato, in
  totale e per categoria.
- **Le ultime chiuse**: dodici righe con ✓/✗, risultato e giocata.

I conti usano la stessa `valuta()` della lista — **nessuna logica duplicata**.
La calibrazione sulle 37.910 partite resta in `rendiconto.js`: troppa roba per
il browser e non serve guardarla ogni giorno. Provato dall'API con un utente
normale: l'aggancio `prossime_partite → partite` passa anche con RLS.

---

## 🟢 FASE 7 — La griglia agganciata alle partite — 23 settembre 2026

Deciso da Mattia: **spin 1, 2 e 3 collegate al calendario; la quarta si chiama
"Fun" e resta libera.** Le tre collegate devono restare modificabili a mano.

### Fatto
- [x] `components/SceltaPartita.jsx`: menu a tendina con **ricerca immediata**
      su squadra e campionato. Ogni voce mostra campionato, giorno, squadre,
      giocata e attendibilità. Scegliendo, la casella prende squadre, data,
      giocata, quota e **`prossima_id`** — il filo con l'archivio.
- [x] `SlotPage`: sulle spin 1-3 la partita è una casella sola (il menu);
      sulla spin Fun restano i due campi di testo. `SPIN_LIBERA = 3`.
      Pronostico, quota, data e risultato restano editabili su tutte.
- [x] Le partite arrivano dallo stesso hook `usaProssime` di Partite e Spin
      provvisorie: una lista sola.
- [x] Spin provvisorie: la compilazione automatica riempie **solo le tre**.

### Resta
- [ ] **Le spin 1 e 2 in griglia sono vecchie**: compilate il 20/09 con le
      regole di allora (1X e X2), su partite già giocate, e una cella ha un
      nome storpiato ("dd - Santander"). Da rifare con "Compila spin" quando
      Mattia vuole — non le ho toccate perché sono sue.
- [ ] Le 4 spin restano un blob JSON in una riga sola condivisa: niente
      storico delle spin passate, e due admin che editano insieme si
      sovrascrivono. Da affrontare quando darà fastidio.
- [ ] Con `prossima_id` in griglia si può finalmente confrontare **quello che
      il gruppo ha giocato davvero** con quello che il criterio proponeva
      (il rendiconto oggi misura solo le proposte).

---

## 🟢 FASE 8 — Selezione e compilazione automatica — prima versione il 16 settembre 2026

Costruita **senza aspettare la fase 7**: scrive nella griglia di oggi
(`griglia.spins`, il JSON che `SlotPage` già legge) e si corregge in Slot come
sempre. Ogni cella porta anche `prossima_id`: nessuno lo legge ancora, ma le
spin compilate così sono già agganciate all'archivio quando si farà la fase 7.

### Come sceglie (deciso con Mattia il 16/09)
- Candidate: le partite **sopra soglia** (soglie di default) **fino a lunedì**.
- Ordine **automatico**: attendibilità. Ordine **con le stelline**: i voti
  comandano (3 > 2 > 1 > 0), a parità l'attendibilità.
- La prima va al **centro** (9), le 4 dopo agli **angoli** (1-4), le 4 dopo ai
  **lati** (5-8). Ogni spin prende le 9 successive: **una partita, una spin**.
  Se le candidate finiscono la spin resta a metà — non si inventa.
- Campionati non mescolati di proposito: "non è un grosso problema".
- La quota delle combinate con l'over resta **vuota** (nessuna fonte dà l'over
  1,5): la scrive chi compila leggendola sul book.

### Fatto
- [x] Tendina del pronostico in griglia: `1 X 2 1X X2 12 1+O1,5 2+O1,5 1+O2,5 2+O2,5`.
- [x] `src/lib/spin.js`: candidate, componi, conStelline, cellaDa, compilaSpin.
      Solo calcoli, provabile da Node (gli import hanno l'estensione).
- [x] `src/hooks/usaProssime.js`: partite + voti, condiviso con la pagina Partite.
- [x] **Pagina "Spin provvisorie"** (menu ☰, solo admin): quante spin (1-4),
      le spin in orizzontale, per ognuna la griglia automatica sopra e quella
      con le stelline sotto, con le celle diverse accese in oro.
- [x] **"Compila spin n.X"** sotto ogni griglia: scrive le 9 celle, cancella
      le spunte delle schedine di quella spin, chiede conferma se era piena.
- [ ] **Da provare dal vivo**: primo clic su "Compila spin n.1" da Mattia dopo
      il push (griglia vuota al 16/09, prova senza rischi); io verifico dal DB.

### Da fare
- [ ] **Simulare il criterio sullo storico** prima di fidarsi: la stessa
      composizione applicata alle stagioni passate dice quante spin sarebbero
      uscite. L'archivio serve a questo.
- [ ] Filtri (quota, campionato) sopra la selezione, se serviranno.
- [ ] Escludere una partita dall'anteprima con un clic, senza doverla
      correggere dopo in Slot.

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

## ✅ Fatto

### Deploy — 9 settembre 2026

- [x] **L'app è su Vercel**, e si ricostruisce da sola a ogni push su `main`.
- [x] **Credenziali Supabase di nuovo nel codice** come valori predefiniti.
      Spostarle in variabili d'ambiente non proteggeva niente — la chiave `anon`
      è pubblica per costruzione e finisce comunque nel bundle — e in cambio
      aveva rotto il deploy: su Vercel le variabili non c'erano e il sito
      mostrava una schermata nera. A proteggere sono le policy RLS.
- [x] **Una configurazione mancante non è più una schermata nera** ma un
      riquadro che dice cosa manca (`src/main.jsx`).

### Sicurezza — 9 settembre 2026

Le password erano in chiaro nella tabella `users`, e sei policy `anon_all_*`
davano permesso totale a chiunque avesse la chiave pubblica **senza login**:
erano l'impalcatura del vecchio login, che interrogava `users` dal browser.

- [x] **Supabase Auth**. Si entra con **username + password**: l'email che Auth
      pretende è sintetica (`<username>@bettertrade.local`) e nessuno la vede.
      La costruisce `emailDi()`, che vive in due copie — `AuthContext.jsx` e
      `scripts/_admin.js` — e **deve restare identica**, o il login non trova
      l'account.
- [x] **Colonna `password` eliminata.** Le nuove sono corte e pronunciabili
      (`fuoco-530`): l'app è un archivio, devono essere dicibili a voce.
- [x] **RLS su tutte e sei le tabelle**: chi ha fatto login vede tutto
      l'archivio, scrivono solo admin e superadmin; `movimenti` e `inserite`
      restano personali; la cancellazione utenti è del solo superadmin.
- [x] **Chiave e URL da env var** (`.env`, gitignorato). La chiave `anon` resta
      pubblica per progetto: a proteggere è RLS, non nasconderla.
- [x] Verificati tutti e 7 i login, con il bankroll corretto.

### Pulizia — 9 settembre 2026

- [x] `PlaceholderPages.jsx` rimosso (duplicato mai importato) e props fantasma
      in `App.jsx`.
- [x] **Bankroll con una sola fonte di verità**: la formula era copiata identica
      in due pagine, ora sta in `src/lib/bankroll.js`.
- [x] **Tema unico**: c'erano due temi scollegati — le CSS variables di
      `index.css`, che il JSX non usava mai, e ~130 colori scritti a mano.
      Ora `src/theme.js` è l'unica definizione, `src/components/ui.jsx` raccoglie
      i pezzi ricorrenti, e nelle pagine non resta nessun colore hardcoded.

### Permessi e ricalcolo — 9 settembre 2026

- [x] **Regressione trovata e chiusa.** Con RLS attiva un utente normale poteva
      registrare un proprio movimento ma **non** scrivere `users.bankroll`: la
      modifica veniva bloccata in silenzio (zero righe, nessun errore) e il
      saldo restava fermo. Ora il ricalcolo passa da `ricalcola_bankroll()`
      lato database: si può chiedere il ricalcolo, non imporre un numero.
- [x] **La formula del bankroll vive in un posto solo**, il database. La copia
      JavaScript è stata rimossa.
- [x] **`scripts/prova-permessi.js`** — verifica cosa ogni ruolo può e non può
      fare. 16 controlli, tutti verdi. **Da rilanciare dopo ogni modifica alle
      policy.**

### Numeri — 9 settembre 2026

- [x] Saldi allineati e totale portato a €3.955,66 (dettaglio nella sezione 1).
- [x] **`backup.js` era rotto**: leggeva con la chiave anon e dopo l'attivazione
      di RLS tornava **zero righe dichiarando successo**. Ora usa la
      `service_role` e fallisce se non scarica niente.

### Trasloco di BTScout — 8 settembre 2026

- [x] `.gitignore` creato alla radice (non esisteva: repo pubblico senza
      protezioni). Copre `.env`, `.cache/`, `node_modules/`, `dist/`, `backup/`.
- [x] `.cache/partite.json` trasferito: i backtest girano offline.
- [x] Scansione segreti sui file committabili: pulito.

---

## Struttura del repo

```
app/                  # L'APP — React + Vite + Supabase
  src/App.jsx         # Shell: header, tab bar, routing a stato
  src/theme.js        # Colori e font — unica definizione
  src/components/     # Card, Etichetta, StatCard, Btn, Input, Badge
  src/lib/bankroll.js # Ricalcolo bankroll — unica fonte di verità
  src/context/        # AuthContext — login, ruoli, calcSchedule
  src/pages/          # Slot, Dashboard, Reporting, Bilancio, Utenti
  sql/                # Migrazioni: auth_id, RLS, rimozione password
  scripts/            # backup, saldi, verifica-coerenza, confronta-utenti,
                      # allinea-utenti, allinea-totale, migra-auth,
                      # crea-utente, reset-password, prova-login,
                      # stato-migrazione, sistema-mnm
  .env                # ⚠️ chiavi Supabase — gitignorato
  backup/             # ⚠️ dump del database — gitignorato

btscout/              # L'ARCHIVIO — Node, nessun frontend collegato
  lib/dixon-coles.js  # Modello Dixon-Coles (JS puro, zero dipendenze)
  lib/modelli.js      # Modelli gol / tiri / misto
  lib/mercato.js      # Probabilità eque dal mercato (metodo Shin)
  scripts/            # Import storico, backtest, strategie S1-S6
  api/                # PWA di chat standalone (mai deployata)
  .env                # ⚠️ DATABASE_URL Neon — gitignorato
  .cache/partite.json # 22 MB di partite, gitignorato, si rigenera
```

### Comandi utili

```bash
cd app
npm run dev                                        # avvia l'app

node --env-file=.env scripts/backup.js             # PRIMA di ogni modifica ai dati
node --env-file=.env scripts/saldi.js              # riepilogo saldi
node --env-file=.env scripts/verifica-coerenza.js  # invariante del bankroll
node --env-file=.env scripts/stato-migrazione.js   # stato della sicurezza

node --env-file=.env scripts/confronta-utenti.js MarcoM Christian
node --env-file=.env scripts/allinea-utenti.js  MarcoM Christian [--esegui]
node --env-file=.env scripts/allinea-totale.js  3955.66 [--esegui]

node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"
node --env-file=.env scripts/reset-password.js Bermani

cd btscout && npm install
node --env-file=.env scripts/verifica-storico.js   # coerenza dell'archivio
```

---

## Storico — cosa BTScout ha già dimostrato

Il lavoro fatto in `btscout/` non è teoria: sono backtest walk-forward su 38.613
partite, 10 campionati, 10 stagioni, contro quote reali.

| Test | Esito |
|------|-------|
| Dixon-Coles sui gol vs mercato | log-loss 1.0288 vs 1.0038 → **il modello predice peggio del mercato** |
| Modello a tiri / misto | avvicinano, non chiudono il divario |
| ROI 1X2 e O/U | −6% / −9% ovunque; "segui il favorito" (−2%) batte ogni modello |
| S1 Under 1,5 primo tempo | tasso max 74% → serve quota ≥1,355; a 1,2 perde |
| S2 Doppia 1X2 favoriti | −4,67% a puntata fissa; Kelly → rovina |
| S3 Doppia Over/Under | −11%; peggio di S2 |
| S4 Pari/Dispari | ~51% su base 50,6% → perde |
| **S5 BetterTrade 3x3** | **−12,7% fissa; staking → −99%** |
| S6 Line shopping | **+1,6%** (unico positivo), IC95 sfiora lo zero, non usa il modello |

**La lezione, dimostrata cinque volte:** selezionare per confidenza sceglie i
favoriti, che il mercato prezza bene; combinarli in accumulator moltiplica il
margine del banco; lo staking non crea vantaggio e i sistemi aggressivi accelerano
la rovina. Nessuna sovrastruttura di scommessa aggira un modello che non batte il
mercato.
