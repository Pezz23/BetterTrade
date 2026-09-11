# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 9 settembre 2026
**Fase corrente:** archivio a oggi — prossimo passo: **censire e ampliare i campionati**

---

## Dove siamo in una riga

**L'app e l'archivio sono ora nello stesso database.** `bettertrade/` (React+Vite,
in produzione su Vercel) e le 38.613 partite vivono entrambi in Supabase;
`btscout/` resta il motore che le importa e le analizza. Sicurezza chiusa, numeri
chiusi, archivio dentro: adesso si costruisce sopra.

---

## L'obiettivo finale

BetterTrade propone una **lista di partite** scelte secondo parametri calcolati
sull'archivio, con filtri sulle quote. Io o gli utenti scegliamo quali prendere,
e l'app **compila da sola** griglia e schedine.

---

## ⚠️ Storico e calendario sono due cose diverse

**L'archivio contiene solo partite già giocate.** Dal 29 luglio 2016 al 31 maggio
2026, zero partite senza risultato. È uno storico, non un calendario: da solo
non può proporre partite da giocare, perché quelle partite non ci sono.

| | Fonte | A cosa serve |
|---|---|---|
| **Storico** | `football-data.co.uk`, stagioni chiuse | Calcolare i parametri, fare ricerca e simulazioni |
| **Calendario** | `football-data.co.uk/fixtures.csv` — **verificato il 10/09/2026** | Sapere quali partite si giocano e a che quota |

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

## 🟠 FASE 3 — Censire e ampliare i campionati

- [ ] **Fare l'elenco di quelli presenti.** Oggi sono 10: Inghilterra, Italia,
      Spagna, Germania, Francia, prime due divisioni ciascuna
      (`E0 E1 · I1 I2 · SP1 SP2 · D1 D2 · F1 F2`).
- [ ] **Elencare quelli disponibili su football-data** e non ancora presi.
      Dal file delle partite future si vedono già `E2`, `G1` (Grecia), `N1`
      (Olanda), `P1` (Portogallo), `SC0` (Scozia): sono nello stesso formato.
- [ ] **Decidere quali aggiungere.** Più campionati significa più partite fra
      cui scegliere, ma anche più nomi squadra da tenere allineati.
- [ ] **Importare e verificare.** Dopo ogni aggiunta, `verifica-storico.js`:
      con più campionati il problema degli alias di squadra cresce.

---

## 🟠 FASE 4 — Le partite future

**Verificato il 10 settembre: la fonte esiste ed è gratuita.**
`https://football-data.co.uk/fixtures.csv` — 94 colonne, stesso formato dello
storico, stessi codici campionato e stessi nomi squadra. Contiene `Div`, `Date`,
`Time`, le squadre, e le quote 1X2 di 8 bookmaker più `Max` e `Avg`, Over/Under
2.5 e handicap asiatico.

**Il limite da conoscere: non è una finestra di 7 giorni.** Il file contiene *il
prossimo blocco* di partite e viene sostituito ogni volta. Dal sito: le quote
sono raccolte **venerdì pomeriggio** (non oltre le 17:00 BST) per il weekend, e
**martedì** (non oltre le 13:00) per l'infrasettimanale. Scaricandolo giovedì 10
settembre restituiva 18 partite dell'8-10 settembre: il blocco di martedì, quasi
esaurito.

Quindi non si "scarica una settimana": **si scarica due volte a settimana e si
accumula**. Vantaggio nascosto: sono quote raccolte a orario fisso prima delle
partite, cioè lo stesso tipo di quota che sta nello storico (`B365` di apertura).
Storico e futuro restano confrontabili.

- [ ] **Tabella `prossime_partite`**, separata dallo storico: una ha il
      risultato, l'altra no. Quando la partita si gioca, entra in `partite`
      dall'import normale e sparisce da qui.
- [ ] **Script `importa-prossime.js`** che scarica il CSV e fa upsert.
- [ ] **Provarlo di venerdì**, quando esce il blocco del weekend con i
      campionati maggiori.
- [ ] **Decidere la cadenza**: a mano il martedì e il venerdì, oppure
      schedulato.

*Piano B se servisse l'orizzonte lungo:* API-Football o The Odds API danno il
calendario a settimane di distanza, ma hanno piani gratuiti stretti e richiedono
una chiave. Da valutare solo se football-data non basta.

---

## 🔵 FASE 5 — Il menu di aggiornamento nell'app

- [ ] **Menu ad hamburger**, oltre ai 4 tasti in basso.
- [ ] **Voce "Aggiorna dati"**: lancia l'import dello storico e delle partite
      future dall'app, senza terminale.
- [ ] **Nodo tecnico da risolvere prima.** Gli import sono script Node che
      girano sul Mac di Mattia: un pulsante nell'app non può eseguirli. Servirà
      una **Supabase Edge Function** — la stessa che serve già per creare utenti
      e resettare password. Da fare una volta, serve a tre cose.

---

## 🔵 FASE 6 — Vedere e cercare le partite nell'app

- [ ] **Pagina Partite**: filtri per campionato, stagione, squadra, data, fascia
      di quota.
- [ ] **Dove girano i calcoli.** L'app non ha backend. Probabile risposta: viste
      e funzioni in Postgres, che su 38 mila righe non fa fatica.

---

## 🔵 FASE 7 — Il modello dei dati delle spin

Qui si riscrive. Lo schema attuale non regge l'obiettivo, per tre motivi in
ordine di gravità:

1. **Non esiste il concetto di partita.** In `griglia`, casa e ospite sono testo
   libero digitato a mano: non c'è niente da agganciare all'archivio.
2. **Le 4 spin sono un blob JSON** dentro una riga: non si cerca, non si filtra,
   non si collega.
3. **La griglia è una riga sola condivisa** (`griglia` id=1): due admin che
   editano insieme si sovrascrivono, e non esiste storico delle spin.

- [ ] **Nuovo schema**: una spin è una riga, ogni casella punta a una partita
      reale, con pronostico e quota.
- [ ] **Migrare le spin esistenti** o ripartire puliti (oggi c'è una riga sola).
- [ ] **Riscrivere `SlotPage`** — **è lo stesso lavoro della nuova
      visualizzazione delle spin**, non due cose separate.

---

## ⚪ FASE 8 — Selezione e compilazione automatica

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
2. **Con che cadenza scaricare le partite future** (fase 4): a mano due volte a
   settimana, o schedulato.
3. **Quando fare la Edge Function** (fase 5): serve a tre cose insieme —
   aggiornamento dati, creazione utenti, reset password.
4. **Le spin esistenti si migrano o si riparte puliti** (fase 7).
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
