# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 9 settembre 2026
**Fase corrente:** saldi allineati — prossimo passo: **confronto con l'Excel**

---

## Dove siamo in una riga

Due pezzi nello stesso repo: **l'app** (`bettertrade/`, React+Vite+Supabase) e
**l'archivio** (`btscout/`, 38.613 partite su Neon). Non sono ancora collegati.
La sicurezza è chiusa e i saldi sono allineati (€3.955,66 aggregati). Adesso si
costruisce: verifica dei numeri contro l'Excel, archivio dentro l'app, e alla
fine la compilazione automatica delle schedine.

**Nessuno sta usando l'app in questo momento** — quindi si può cambiare in
profondità senza rompere niente a nessuno.

---

## L'obiettivo finale

BetterTrade propone una **lista di partite**; io o gli utenti scegliamo quali
prendere; l'app **compila da sola** la griglia e le schedine.

Perché funzioni servono, in ordine: numeri affidabili, un archivio interrogabile
dentro l'app, e solo alla fine il motore che propone.

---

## 🟠 1. Sistemare i numeri del database

### Fatto il 9 settembre

- [x] **MNM rimesso a posto.** Aveva bankroll −€1.311,21 con capitale iniziale
      €106,11 — un saldo residuo finito nel campo del capitale di partenza — e
      una stagione **23/24** che nessun altro utente ha. Il capitale vero era
      €3.000. La 23/24 (31 giornate, saldo +€570,54) è stata rimossa.
- [x] **Coppie allineate.** Dal 24/25 alcune persone hanno giocato le stesse
      schedine e i numeri differivano per errori di trascrizione:
      MNM ← Bermani (scarto €17,58 su 10 giornate, di cui 3 significative:
      24/25 sett. 7 e 24, 25/26 sett. 7) e MarcoM ← Christian (€0,15).
      **Il riferimento scelto è Bermani/Christian: se l'Excel dà ragione
      all'altro lato, si rifà al contrario.**
- [x] **Totale portato a €3.955,66**, con la differenza (+€21,04) registrata
      come **movimento** su Laboratorio — non scritta sul saldo, che è calcolato.
- [x] **Tutti e sette coerenti**, nessun bankroll negativo.

| Utente | Iniziale | Movim. | Giornate | Saldo | N |
|---|---|---|---|---|---|
| Bermani | €3.000,00 | — | −€2.005,44 | **€994,56** | 54 |
| MNM | €3.000,00 | — | −€2.005,44 | **€994,56** | 54 |
| MarcoM | €1.000,00 | — | −€671,61 | **€328,39** | 54 |
| Christian (GLeRoy) | €1.000,00 | — | −€671,61 | **€328,39** | 54 |
| Botturi | €1.000,00 | — | −€469,44 | **€530,56** | 24 |
| Laboratorio | €1.563,13 | −€207,17 | −€576,76 | **€779,20** | 35 |
| **Totale** | €10.563,13 | −€207,17 | −€6.400,30 | **€3.955,66** | 275 |

Botturi ha solo la 25/26 perché è entrato in corsa; Laboratorio non segue gli
anni. Entrambe le cose sono corrette, non anomalie.

### Da fare

- [ ] **Confronto riga per riga con l'Excel** — è il prossimo passo. Da capire
      com'è strutturato il file per costruire il confronto.
- [ ] **Verificare le tre giornate contese** (24/25 sett. 7 e 24, 25/26 sett. 7):
      l'Excel dice se aveva ragione MNM o Bermani.
- [ ] **Inserire i movimenti mancanti.** Oggi ce ne sono solo tre, tutti su
      Laboratorio. I versamenti degli altri utenti non sono mai stati registrati:
      finché mancano, il capitale iniziale è l'unico appiglio.
- [ ] **Decidere se vietare i bankroll negativi** a livello di database
      (`check (bankroll >= 0)`) o tenerli come segnale d'allarme.

### Strumenti costruiti per questo lavoro

```bash
node --env-file=.env scripts/saldi.js                  # riepilogo di tutti
node --env-file=.env scripts/verifica-coerenza.js      # iniziale+movimenti+giornate=bankroll
node --env-file=.env scripts/confronta-utenti.js A B   # differenze fra due utenti
node --env-file=.env scripts/allinea-utenti.js  A B    # allinea (prova a vuoto)
node --env-file=.env scripts/allinea-totale.js  3955.66
```

Tutti girano a vuoto per default: scrivono solo con `--esegui`.

---

## 🔴 2. Portare l'archivio BTScout dentro BetterTrade

Oggi l'archivio vive su **Neon**, separato, raggiungibile solo da script Node.
Deve diventare parte dell'app: interrogabile, espandibile, verificabile.

**Cosa c'è da spostare** — tabella `partite`:

| | |
|---|---|
| partite | 38.613 |
| campionati | 10 (E0 E1 · I1 I2 · SP1 SP2 · D1 D2 · F1 F2) |
| stagioni | 10 (2016/17 → 2025/26) |
| campi per partita | 38 |
| contenuto | gol, esito, tiri, tiri in porta, angoli, cartellini, gol 1° tempo, quote 1X2 (Pinnacle, media, massima, Bet365) e Over/Under 2.5 |

- [ ] **Migrare `partite` da Neon a Supabase.** Sono ~25 MB: stanno nel free
      tier senza problemi. Elimina il secondo database e rende l'archivio
      leggibile dall'app con le stesse credenziali e le stesse regole RLS.
- [ ] **Riscrivere `import-storico.js`** perché scriva su Supabase invece che su
      Neon. È già idempotente: rilanciarlo aggiorna senza duplicare.
- [ ] **Policy RLS su `partite`**: lettura a chi ha fatto login, scrittura solo
      agli admin (o solo dallo script con `service_role`).
- [ ] **Espandere l'archivio.** Oggi: 10 campionati, 10 stagioni. Da decidere
      quali aggiungere — altri campionati, stagioni più vecchie, o le partite
      della settimana in corso per poter proporre le prossime.
- [ ] **Verificare l'archivio.** `verifica-storico.js` esiste già e va rieseguito
      dopo ogni aggiunta: controlla nomi squadra incoerenti fra stagioni (lo
      stesso club con due nomi diventa due squadre e dimezza lo storico), date
      malformate, quote mancanti.
- [ ] **Aggiornamento continuo.** Serve un modo per tenere l'archivio al passo
      con la stagione in corso: a mano ogni settimana, o una funzione schedulata.

---

## 🔵 3. Ricerca partite e compilazione automatica

L'obiettivo finale. Da progettare quando 1 e 2 sono chiusi.

- [ ] **Ricerca dentro l'app**: filtrare l'archivio per campionato, squadra,
      data, quota. È il mattone che serve prima di tutto il resto.
- [ ] **Simulazioni** sull'archivio: provare una selezione sulle partite passate
      e vedere come sarebbe andata.
- [ ] **Proposta di partite**: l'app suggerisce una lista fra cui scegliere.
      Da definire con quale criterio.
- [ ] **Compilazione automatica** della griglia e delle 8 schedine dalle partite
      scelte. Oggi si inserisce tutto a mano in `SlotPage`.

**Nodo tecnico noto:** l'app è una SPA statica, senza backend. Le simulazioni
sui backtest sono script Node pesanti che nel browser non girano. Servirà
almeno una Supabase Edge Function — che serve comunque per creare utenti e
resettare password, quindi i due lavori si fanno insieme.

---

## ⚪ Decisione aperta: evolvere o riscrivere

Nessuno usa l'app: la riscrittura da zero è sul tavolo.

**La mia proposta: né l'una né l'altra.** Riscrivere tutto butterebbe via cose
appena messe a posto e che non c'entrano con l'obiettivo — Supabase Auth, le
policy RLS, il tema, gli script di amministrazione. Ma **il modello dei dati va
rifatto**, perché quello attuale non regge l'obiettivo finale:

- la griglia è **una riga sola condivisa** (`griglia` id=1): due admin che
  editano insieme si sovrascrivono, e non esiste uno storico delle spin
- le 4 spin sono un **blob JSON** dentro quella riga: non si può cercare,
  filtrare, né collegare a una partita dell'archivio
- **non esiste il concetto di partita**: casa, ospite e quota sono testo libero
  digitato a mano, quindi impossibili da agganciare all'archivio

Il pezzo da riscrivere è quello: `griglia` + `SlotPage`. Il resto si tiene.

---

## 🧹 Debito tecnico

- [ ] **Annidamento `BetterTrade/bettertrade/`** — una cartella di troppo.
- [ ] **History git sporca** — commit `Add files via upload` / `Delete bettertrade
      directory`: il codice è stato caricato dalla UI web di GitHub.
- [ ] **README.md vuoto** (contiene solo `# BetterTrade`).
- [ ] **`btscout/CLAUDE.md` e `btscout/STATO.md`** parlano ancora di BTScout come
      progetto a sé. Da fondere qui quando l'archivio si sposta.
- [ ] **`btscout/api/` + `index.html`** sono una PWA di chat standalone, mai
      deployata. Se non serve, si cancella.
- [ ] **Deploy** — da capire se BetterTrade è online o gira solo in locale.
- [ ] **`calcSchedule` arrotonda a zero** — i `Math.floor` in `AuthContext.jsx`
      producono €0 su tutte le voci quando la base è bassa. Correggerlo cambia
      gli importi giocati: è una decisione, non una pulizia.
- [ ] **Ruotare la password Neon** di BTScout: la stringa di connessione è
      passata in chat a luglio. Console Neon → `neondb_owner` → reset →
      aggiornare `btscout/.env`. Decade se si migra tutto su Supabase.

---

## ✅ Fatto

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
