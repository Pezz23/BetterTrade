# BetterTrade

Archivio delle giocate di un gruppo di persone, più il motore che le misura.
Due pezzi nello stesso repo, non ancora collegati:

| | |
|---|---|
| `bettertrade/` | **L'app.** React + Vite + Supabase. Registra spin, giornate e bankroll di 6 persone. |
| `btscout/` | **L'archivio.** Node, nessun frontend. 38.613 partite su Neon, modelli e backtest. |

---

## ⚠️ PRIMA DI QUALSIASI COSA: leggi STATO.md

**All'inizio di ogni sessione leggi [STATO.md](STATO.md)** — è la to-do list e il
punto esatto in cui siamo. **Alla fine aggiornalo.** Se una task cambia stato e il
file non lo riflette, la sessione dopo riparte da informazioni sbagliate.
Aggiornare STATO.md fa parte del lavoro, non è un extra.

---

## Come lavorare con Mattia

- **Un passo alla volta.** Quando serve che faccia qualcosa lui (SQL sulla
  dashboard, una chiave da copiare), dai **una sola istruzione** e aspetta l'ok
  prima della successiva. Ha chiesto esplicitamente di non ricevere liste di
  cinque passi insieme.
- **Verifica prima di dichiarare fatto.** Ogni passo che tocca il database va
  verificato da terminale prima di passare al successivo, non dato per riuscito.
- **Prova a vuoto prima di scrivere.** Ogni script che modifica dati ha una
  modalità di default che non scrive e mostra cosa cambierebbe; si scrive solo
  con `--esegui`. È la convenzione del progetto, va mantenuta.
- **Backup prima di ogni modifica ai dati:** `node --env-file=.env scripts/backup.js`.
- **Italiano** nel codice, nei commenti, nei commit e nella conversazione.

---

## ⚠️ Regole che non si toccano

### 1. Il bankroll è calcolato, non memorizzato

```
bankroll = bankroll_iniziale + movimenti + saldo delle giornate
```

`users.bankroll` è **solo una cache** di questo calcolo. La formula vive in un
unico posto, `src/lib/bankroll.js`, ed è già stata deduplicata una volta: non
riscriverla altrove.

**Corollario pratico:** per correggere un saldo **non scrivere il numero**.
Registra un `movimento` e ricalcola — altrimenti il primo ricalcolo dell'app
cancella la correzione. `scripts/allinea-totale.js` fa esattamente questo.

Dopo ogni modifica ai dati:
```bash
node --env-file=.env scripts/verifica-coerenza.js
```

### 2. Il login passa da `emailDi()`, che esiste in due copie

Gli utenti non hanno email e non ne useranno una: entrano con **username +
password**. L'identificatore che Supabase Auth pretende è sintetico e invisibile,
costruito da `emailDi()` — che vive in `src/context/AuthContext.jsx` **e** in
`scripts/_admin.js`. **Devono restare identiche**, o il login non trova l'account.

### 3. Le password non tornano nel database

Sono in Supabase Auth, hashate. La colonna `users.password` è stata eliminata:
non ricrearla. Sono corte e pronunciabili di proposito (`fuoco-530`) — l'app è
un archivio, non un conto, e devono essere dicibili a voce.

### 4. I permessi stanno nel database, non nel browser

RLS è attiva su tutte le tabelle. I controlli `if (role === 'admin')` nel JSX
servono a nascondere i bottoni, **non a proteggere**: la protezione è la policy.
Se aggiungi una tabella, aggiungi la sua policy — senza, non è leggibile da
nessuno tranne la `service_role`.

### 5. La chiave `service_role` non entra nel browser

Bypassa ogni regola. Sta in `.env` (gitignorato) e la usano solo gli script Node.
Nel frontend può stare solo `VITE_SUPABASE_ANON_KEY`, che è pubblica per
progetto: a proteggere è RLS, non nasconderla.

Per questo **creare utenti e resettare la password di altri sono usciti
dall'interfaccia** e vivono in `scripts/`. Per riportarli nell'app serve una
Supabase Edge Function.

---

## Il modello dei dati, e perché va rifatto

Lo schema attuale non regge l'obiettivo finale (l'app propone partite e compila
da sola le schedine). Tre problemi, in ordine di gravità:

1. **Non esiste il concetto di partita.** In `griglia`, casa e ospite sono testo
   libero digitato a mano: impossibile agganciarli all'archivio di BTScout.
2. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra,
   non si collega.
3. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non c'è storico delle spin.

Il pezzo da riscrivere è `griglia` + `SlotPage`. Auth, RLS, tema e script si
tengono — sono appena stati messi a posto e non c'entrano con il problema.

---

## Convenzioni del codice

- **Colori e font**: solo da `src/theme.js`. Nelle pagine non deve tornare
  nessun valore hardcoded — `alpha(C.oro, .12)`, mai `rgba(201,168,76,0.12)`.
  `index.css` ne tiene una copia per il poco CSS fuori da React: se cambi un
  colore lì, riportalo in `theme.js` e viceversa.
- **Pezzi ricorrenti** in `src/components/ui.jsx`: `Card`, `Etichetta`,
  `StatCard`, `Btn`, `Input`, `Badge`. Prima di riscrivere una card a mano,
  guarda se c'è già.
- **Script generali, non usa-e-getta.** `confronta-utenti.js` e
  `allinea-utenti.js` prendono due nomi qualsiasi. Se serve una cosa una volta
  sola, probabilmente servirà di nuovo.
- **I commenti spiegano il perché**, non il cosa. Se una riga è strana, dire
  quale problema evita vale più di descrivere cosa fa.

---

## Trappole già incontrate

- **`onAuthStateChange` non sopporta query al database dentro il callback.**
  supabase-js tiene un lock mentre lo esegue: una `supabase.from()` lì dentro
  blocca la login stessa. Si rimanda con `setTimeout(…, 0)`.
- **Un backup con la chiave anon torna vuoto senza errore.** Con RLS attiva
  legge zero righe e dichiara successo. `backup.js` usa la `service_role` e
  fallisce se scarica zero righe: non togliere quel controllo.
- **`bankroll_iniziale` può contenere un saldo residuo.** È successo con MNM:
  106,11 al posto di 3000, con 85 giornate e 25k di volume. Se un bankroll è
  negativo o assurdo, guarda prima lì.
- **Nel convertire i colori, `rgba()` e `#hex` dello stesso nome sono tinte
  diverse.** `rgba(59,130,246)` è `#3b82f6`, non il `#60a5fa` usato per il testo.
  Sono token separati in `theme.js` (`bluPieno`, `giallo`, `celestePieno`).

---

## Comandi

```bash
cd bettertrade
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
node --env-file=.env scripts/prova-login.js Admin <password>

cd btscout && npm install
node --env-file=.env scripts/verifica-storico.js   # coerenza dell'archivio
node --env-file=.env scripts/backtest.js
```

`btscout/CLAUDE.md` contiene le regole del motore — in particolare **"la
matematica calcola, Claude giudica"**: un LLM non produce probabilità calibrate,
e non deve stimarle. Vale anche qui quando i due pezzi si collegheranno.
