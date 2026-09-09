# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 9 settembre 2026
**Fase corrente:** sicurezza e numeri chiusi — si parte con **l'archivio**

---

## Dove siamo in una riga

Due pezzi nello stesso repo: **l'app** (`bettertrade/`, React+Vite+Supabase, in
produzione su Vercel) e **l'archivio** (`btscout/`, 38.613 partite su Neon).
Non sono ancora collegati. Sicurezza chiusa, numeri chiusi: adesso si costruisce.

---

## L'obiettivo finale

BetterTrade propone una **lista di partite** scelte secondo parametri calcolati
sull'archivio, con filtri sulle quote. Io o gli utenti scegliamo quali prendere,
e l'app **compila da sola** griglia e schedine.

---

## ⚠️ Il pezzo che manca a tutti, e che detta l'ordine

**L'archivio contiene solo partite già giocate.** Va dal 28 luglio 2016 al
30 maggio 2026, zero partite senza risultato, zero partite dopo agosto 2026.
È uno storico, non un calendario.

Quindi **oggi l'app non può proporre partite da giocare**: quelle partite non
esistono da nessuna parte nel sistema. Serve una seconda fonte, con il
**calendario delle prossime giornate e le relative quote**.

Le due cose sono diverse e vanno tenute separate:

| | Fonte | A cosa serve |
|---|---|---|
| **Storico** | football-data.co.uk, stagioni chiuse | Calcolare i parametri, fare ricerca e simulazioni |
| **Calendario** | *da trovare* — football-data pubblica un `fixtures.csv` settimanale, da verificare | Sapere quali partite si giocano e a che quota |

Senza il secondo, i punti 4 e 5 non possono esistere. Con il solo storico si può
comunque fare ricerca e simulazione — che è già metà del valore.

---

## 🔴 FASE 1 — L'archivio dentro l'app

Prerequisito di tutto il resto. Finché le partite stanno su Neon, l'app non le
vede.

- [ ] **Migrare `partite` da Neon a Supabase.** 38.613 righe, 38 colonne, ~25 MB:
      stanno nel free tier. Elimina il secondo database e l'archivio eredita le
      credenziali e le policy che già ci sono.
- [ ] **Riscrivere `btscout/scripts/import-storico.js`** perché scriva su
      Supabase invece che su Neon. È già idempotente: rilanciarlo aggiorna senza
      duplicare.
- [ ] **Policy RLS su `partite`**: lettura a chi ha fatto login, scrittura solo
      dagli script con `service_role`. Senza policy la tabella è invisibile.
- [ ] **Rilanciare `verifica-storico.js`** dopo la migrazione: controlla nomi
      squadra incoerenti fra stagioni (lo stesso club con due nomi diventa due
      squadre e dimezza lo storico di entrambe), date malformate, quote mancanti.
- [ ] **Ruotare la password Neon** o dismettere il progetto, una volta migrato.

---

## 🟠 FASE 2 — Vedere l'archivio nell'app

Il primo risultato visibile, e la prova che la fase 1 ha funzionato. Solo
lettura: nessun rischio sui dati.

- [ ] **Menu ad hamburger**, oltre ai 4 tasti in basso. Da decidere cosa ci va:
      i 4 tasti restano per l'uso quotidiano (Dashboard, Slot, Reporting,
      Bilancio), l'hamburger raccoglie il resto (Partite, Utenti, Impostazioni).
- [ ] **Pagina Partite — ricerca nell'archivio**: filtri per campionato,
      stagione, squadra, data, fascia di quota. È il mattone su cui si appoggia
      tutto il resto.
- [ ] **Dove girano i calcoli.** L'app non ha backend. Probabile risposta:
      viste e funzioni in Postgres, che regge tranquillamente 38 mila righe —
      niente serverless finché non serve davvero. Da confermare alla prova.

---

## 🟠 FASE 3 — Ampliare e tenere aggiornato l'archivio

Più facile dopo la fase 2, perché si vede subito l'effetto di quello che si
aggiunge.

- [ ] **Aggiungere la stagione in corso (26/27).** L'elenco `STAGIONI` in
      `import-storico.js` si ferma a `2526`: manca tutto quello che si è giocato
      da agosto 2026.
- [ ] **Aggiungere campionati.** Oggi sono 10 (Inghilterra, Italia, Spagna,
      Germania, Francia — prime due divisioni ciascuno). Da decidere quali:
      Olanda, Portogallo, Belgio e Turchia sono nello stesso formato e si
      importano con la stessa pipeline.
- [ ] **Aggiornamento continuo.** Serve un modo per stare al passo con la
      stagione: a mano ogni settimana, o una funzione schedulata.
- [ ] **Rieseguire `verifica-storico.js` dopo ogni aggiunta.** Con più
      campionati il problema degli alias di squadra cresce.

---

## 🔵 FASE 4 — Il calendario delle partite future

Il pezzo nuovo, senza il quale la compilazione automatica non può esistere.

- [ ] **Trovare e verificare la fonte** del calendario con le quote.
      Candidato naturale: il `fixtures.csv` di football-data.co.uk, stesso
      formato dello storico — da verificare che esista ancora, cosa contenga e
      con che anticipo.
- [ ] **Tabella `prossime_partite`** separata dallo storico: sono cose diverse,
      una ha il risultato e l'altra no. Quando la partita si gioca, passa nello
      storico.
- [ ] **Aggiornamento automatico** del calendario, o quantomeno un comando da
      lanciare prima di ogni spin.

---

## 🔵 FASE 5 — Il modello dei dati delle spin

Qui si riscrive. Lo schema attuale non regge l'obiettivo, per tre motivi in
ordine di gravità:

1. **Non esiste il concetto di partita.** In `griglia`, casa e ospite sono testo
   libero digitato a mano: non c'è niente da agganciare all'archivio.
2. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra,
   non si collega.
3. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non esiste storico delle spin.

- [ ] **Nuovo schema**: una spin è una riga, ogni casella è una riga che punta a
      una partita reale, con pronostico e quota. Lo storico delle spin diventa
      interrogabile.
- [ ] **Migrare le spin esistenti** nel nuovo schema, o decidere di ripartire
      puliti (oggi c'è una sola riga in `griglia`).
- [ ] **Riscrivere `SlotPage`** sul nuovo modello — **è lo stesso lavoro della
      nuova visualizzazione delle spin**, non due cose separate: tanto vale
      ridisegnarla mentre la si riscrive.

---

## ⚪ FASE 6 — Selezione e compilazione automatica

L'obiettivo finale. Ha senso solo dopo tutte le fasi precedenti.

- [ ] **Definire i parametri** con cui si scelgono le "migliori partite".
      Da discutere nel dettaglio quando ci arriviamo.
- [ ] **Filtri sulle quote** sopra la selezione.
- [ ] **Simulare il criterio sullo storico prima di metterlo nell'app.**
      L'archivio serve esattamente a questo: qualunque criterio si scelga, si
      può vedere come sarebbe andato sulle 38.613 partite passate senza
      rischiare niente. È gratis e va fatto prima, non dopo.
- [ ] **Compilazione automatica** della griglia e delle 8 schedine dalle partite
      scelte.

---

## Nodi da decidere

1. **Quali campionati aggiungere** (fase 3).
2. **Da dove prendere il calendario** delle partite future (fase 4) — è il nodo
   più grosso, perché non ha ancora una risposta.
3. **Le spin esistenti si migrano o si riparte puliti** (fase 5).
4. **Cosa va nell'hamburger e cosa resta nei 4 tasti** (fase 2).
5. **Vietare i bankroll negativi** a livello di database (`check (bankroll >= 0)`)
   o tenerli come segnale d'allarme.

---

## 🧹 Debito tecnico

- [ ] **Annidamento `BetterTrade/bettertrade/`** — una cartella di troppo.
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
bettertrade/          # L'APP — React + Vite + Supabase
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
