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
