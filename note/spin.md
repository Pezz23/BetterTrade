# LE SPIN — la griglia e il modello dei dati

> La spunta GIOCATA e i due limiti noti dello schema.
> Staccato da `CLAUDE.md` il 22/10/2026 per alleggerire ogni sessione:
> **il testo è lo stesso, non è stato riassunto**.

### La spunta "GIOCATA": compilare non è giocare

**Aggiunta il 12/10/2026, su richiesta di Mattia.** Sotto l'elenco della
griglia, nella pagina Slot, c'è una spunta **GIOCATA** per ogni spin
(`griglia.giocate`, `sql/25`, un array di quattro booleani con un `check` che
ne impone la forma).

⚠️⚠️ **È l'unica cosa che fa partire i conti della Dashboard.** Prima bastava
che **una casella avesse una squadra**: si cominciava a compilare la griglia e
la Dashboard mostrava già soldi investiti, come se fossero stati messi al
banco. *"Se si mette la spunta allora la dashboard inizia a contare, se non ci
sono spunte deve rimanere a 0."*
⚠️ **Non si può dedurre dalla griglia**, e non si deve provare: compilare e
giocare sono due momenti diversi, la griglia resta modificabile anche dopo, e
l'unico che sa se la schedina è andata al banco è chi ce l'ha portata.
⚠️ La Dashboard chiede **due** condizioni: la spunta **e** almeno una casella
piena. La seconda tiene fuori una spin spuntata e vuota, che mostrerebbe
investito senza partite — nella Slot la stessa situazione dà un avviso in ambra,
**non un blocco**: può capitare di spuntare prima di finire.
⚠️ **I due vuoti della Dashboard sono distinti**, perché si risolvono in modi
opposti: *"nessuna partita inserita"* manda nella Slot a compilare, *"3 spin
compilate ma nessuna segnata come giocata"* manda a spuntare. Confonderli manda
la persona a fare la cosa sbagliata.
⚠️ La spunta la toccano **solo gli admin** (come la griglia, stessa policy) ma
**la vedono tutti**: a un utente normale serve sapere se quello che legge in
Dashboard è già giocato o è una bozza. ⚠️ Si salva **subito**, senza il ritardo
di 800 ms delle caselle, e **se la scrittura non passa torna indietro**: RLS
blocca in silenzio, e una spunta accesa solo sul proprio schermo è una bugia.

## Il modello dei dati delle spin

**Le spin 1, 2 e 3 sono agganciate alle partite vere** (23/09/2026): ogni
casella porta `prossima_id`, scelto dal menu con ricerca sul calendario
(`components/SceltaPartita.jsx`) o scritto dalla compilazione automatica
(`lib/spin.js`). Resta tutto modificabile a mano: pronostico, quota, data,
risultato. **La quarta spin si chiama "Fun" ed è libera**, con i due campi di
testo di sempre — `SPIN_LIBERA = 3` in `SlotPage.jsx`.

Restano due limiti noti dello schema, da affrontare quando daranno fastidio:

1. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra.
2. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non c'è storico delle spin passate.

Auth, RLS, tema e script si tengono — non c'entrano con il problema.

---


## La pagina Spin provvisorie dal 24/10/2026

Tre cambi chiesti da Mattia, nello stesso giorno (`a115a23`, 1.58.00):

- ⚠️⚠️ **L'automatica ordina e colora per SCELTA**, non per attendibilità, con
  soglie proprie **verde 75 · giallo 72 · blu 68** (`SOGLIE_SPIN` e
  `valoreSpin` in `lib/spin.js`). Il motivo e i limiti stanno in
  `note/criterio.md`: in breve, la regola dell'over portava i favoriti più
  forti a blu, e il 24/10 c'erano zero verdi. ⚠️ **Solo nelle spin**: fuori
  dalla pagina i colori restano dell'attendibilità con `SOGLIE_DEFAULT`.
  Casella, finestra e card «LE VOTATE» mostrano **la scelta**, così colore e
  numero dicono la stessa cosa.
- **La seconda griglia si chiama «A mano» e parte VUOTA.** Prima («Con le
  stelline») la riempivano le votate da sole. Si riempie toccando le caselle,
  il tasto «↺ svuota» la rimette vuota, e resta un'anteprima finché non si
  preme «Compila». `conStelline` è stata tolta: non la usava più nessuno.
- **La finestra della casella** ha le schede di sempre (votate · verdi · gialle
  · blu · tutte, con le soglie delle spin) e sotto **«ordina per» attendibilità
  · voto · VPM · scelta**: questi non filtrano, ordinano **tutte** le partite
  fino a martedì, sotto soglia comprese, e a destra mostrano il loro numero.
  Le chiavi sono quelle di `lib/ordine.js`, le stesse dei tasti delle Partite.
- ⚠️⚠️ **«S1 · S2 · S3» serve a non mettere la stessa partita in due spin.**
  Guarda **tre fonti** per ogni spin — l'automatica, quella a mano e **la
  griglia già salvata in Slot** (per `prossima_id`) — e nella finestra compare
  **anche per la spin che si sta compilando**. Solo il segno «↔» dentro le
  caselle esclude la propria spin, altrimenti ogni casella della spin 1
  direbbe «↔1».
- ⚠️ VPM arriva con una chiamata a parte: finché non c'è, la pagina compone
  sull'attendibilità **e lo scrive**, invece di restare ferma.

## ⭐ Le stelline a tutti, separate per ruolo (29/10/2026)

Mattia: *"vorrei che anche gli user mettano le stelline dentro Partite, però
separate da quelle degli admin"* (`1.64.00`, `sql/46`). Ogni stellina porta
`da_admin` (una fotografia del ruolo, come i flag di `sql/41`; la policy
rifiuta chi si dichiara admin senza esserlo). A schermo **un tasto solo**:
**oro `n/3`** gli admin, **blu `+n`** gli user, solo se ci sono; la mia
stellina si riempie del mio colore. ⚠️ Non due righe: una seconda riga avrebbe
fatto crescere solo alcune card della lista.

⚠️⚠️ **Cosa CONTANO**, deciso da Mattia:
- nelle **Spin** (del gruppo) **solo quelle degli admin** —
  `SpinProvvisoriePage` usa `votiAdminDi`, con l'alias `votiDi` così il resto
  della pagina non cambia;
- in **Road to weekend** e **Bet Builder** (personali) **tutte** (`votiDi`):
  una stellina di chiunque fa entrare la partita in scaletta sotto soglia.

### L'esito PROPOSTO delle caselle (30/10/2026, `1.76.00`)

Mattia: *"vorrei che calcolassero l'esito da sole"* — *"per ora proposto, se
funziona lo passiamo ad automatico"*. Una casella collegata al calendario
(`prossima_id`), **senza esito**, con la partita finita, mostra *«finita 2-1 ·
proposto ✓ Win»* e il tasto **conferma**; con più proposte c'è anche
«conferma i N esiti proposti». La regola è `giocataArrivata` (la stessa di
Road to weekend e dell'archivio), dal pronostico tradotto con `giocataDa`
(`lib/spin.js`): ⚠️ senza traduzione «1+O1,5» verrebbe letto come «1», e un
1-0 risulterebbe vinto.
- **Non tocca mai un esito già scelto**: la proposta esiste solo sulle caselle
  vuote.
- Vale **anche sulle spin non spuntate** GIOCATA; la Dashboard conta comunque
  solo le spuntate.
- Una giocata che la regola non legge (X, 1X, GG) e la spin Fun dicono
  «esito a mano».
- I risultati si leggono all'apertura della pagina (`risultatiDi` in
  `hooks/usaRecenti.js`, una lettura): arrivano col tasto «Scarica risultati»
  (anche in fondo alla Dashboard) o con la routine del Mac.
- ⏭ **Da passare ad automatico** quando Mattia avrà visto che funziona.

### Esiti AUTOMATICI, flag, archivio (30/10/2026, `1.77.00`)

Il giorno stesso dell'esito proposto, Mattia: *"metti esiti automatici,
confermare è noioso"*.
- **Esiti automatici** (`lib/esitiSpin.js`, `completaEsiti`): scritti solo
  nelle caselle **vuote** — mai sopra un esito scelto a mano — alla fine di
  «Scarica risultati» (`aggiornaEsitiGriglia`, così la Dashboard è subito
  aggiornata) e quando un admin apre la Slot. Sotto la casella resta «finita
  2-1», e «esito a mano» se la giocata non si legge. L'appunto «da proposto ad
  automatico» è chiuso.
- **Il risultato nelle schedine**: «2-1 ✓» accanto a ogni partita.
- **Dashboard → Slot**: toccando una spin si apre `/slot/N` (solo admin).
- **Il flag delle spin in Bilancio** (`users.in_spin`, `sql/52`): solo chi ce
  l'ha entra in `getSpinBankroll`, cioè nella percentuale delle spin; in
  «Salva per tutti» partono selezionati solo loro. ⚠️ **Non** tocca
  `getTotalBankroll`, il totale dei soldi veri che decide il trasferimento a
  Laboratorio: un utente fuori dalle spin ha comunque soldi veri.
- ⚠️ Un **conto demo** è stato fatto e tolto nella stessa ora (Mattia ha
  cambiato idea): la colonna `demo` non esiste più. Al suo posto l'archivio.
- **L'ARCHIVIO DELLE SPIN** (`spin_archivio`, `sql/53`; scheda «Archivio»
  nella Slot): la fotografia di ogni spin — caselle con risultato ed esito,
  schedine uscite, giocata o no, **resa in unità** (`resaInUnita`: una spin
  vale 1, 77/20/3 senza i `Math.floor`). Si scrive a «↺ Nuova spin» **prima**
  di svuotare (se l'archivio non risponde la griglia non si svuota) o col tasto
  «salva in archivio»; la stessa spin (`firma`) aggiorna la sua riga. Anche le
  non giocate e la Fun (scelte di Mattia). **Non tocca soldi né giornate.**
  Risolve il limite n. 2 di questa nota: lo storico delle spin ora c'è.
- `COMBOS` erano **tre copie** (Slot, Dashboard, Reporting): ora stanno in
  `lib/spin.js`, con `statoSchedina` e `resaInUnita`.
