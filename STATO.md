# STATO — BetterTrade

> Fonte di verità sul punto in cui siamo. Da leggere all'inizio di ogni sessione e
> aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 9 settembre 2026
**Fase corrente:** sicurezza chiusa — prossimo passo: **misurare il ROI reale**

---

## Dove siamo in una riga

Due pezzi ora nello stesso repo: **l'app che archivia le giocate** (`bettertrade/`,
React+Vite+Supabase) e **il motore che le misura** (`btscout/`, 38.613 partite e i
backtest). Non sono ancora collegati. La falla di sicurezza è chiusa: si entra con
Supabase Auth e i permessi stanno nel database. Resta la domanda scomoda sul
rendimento reale.

---

## Struttura del repo

```
bettertrade/          # L'APP — React + Vite + Supabase (2.037 righe)
  src/App.jsx         # Shell: header, tab bar bottom, routing a stato
  src/context/        # AuthContext — login, ruoli, bankroll, calcSchedule
  src/pages/          # Slot (griglia 3x3 + 8 schedine), Dashboard,
                      # Reporting (giornate/stagioni), Bilancio (movimenti), Utenti
  src/supabase.js     # ⚠️ URL + chiave anon HARDCODED — vedi Sicurezza
btscout/              # IL MOTORE — Node, nessun frontend collegato
  lib/dixon-coles.js  # Modello Dixon-Coles (JS puro, zero dipendenze)
  lib/modelli.js      # Modelli gol / tiri / misto
  lib/mercato.js      # Probabilità eque dal mercato (metodo Shin)
  scripts/            # Import storico, backtest, strategie S1-S6
  api/                # PWA di chat standalone (Vercel serverless + Neon)
  .env                # ⚠️ DATABASE_URL Neon — gitignorato, NON committare
  .cache/partite.json # 22 MB di partite, gitignorato, si rigenera
.gitignore            # Creato nel trasloco: protegge .env e .cache
```

---

## ✅ Fatto — trasloco (8 settembre 2026)

- [x] `.gitignore` creato alla radice (**non esisteva**: repo pubblico senza
      protezioni). Copre `.env`, `.cache/`, `node_modules/`, `dist/`, `.DS_Store`
- [x] BTScout copiato da `Jarvis/btscout/` → `BetterTrade/btscout/` — 29 file,
      verificato con `diff -r`: **identici**
- [x] `.env` (password Neon) trasferito ma **gitignorato**: c'è in locale, non finisce su GitHub
- [x] `.cache/partite.json` trasferito: i backtest girano offline, ~2x più veloci
- [x] Scansione segreti sui 27 file committabili: **pulito**
- [x] BTScout rimosso da Jarvis

**Per rimettere in moto BTScout in locale:**
```bash
cd btscout && npm install          # node_modules non è stato copiato, si rigenera
node --env-file=.env scripts/backtest.js
```

---

## ✅ 1. SICUREZZA — chiusa il 9 settembre 2026

L'app non muove soldi: è l'archivio delle giocate. Ma le password erano in chiaro
in un repo pubblico, e le persone le riusano altrove. Ora:

- [x] **Supabase Auth** al posto del login fatto a mano. Ogni utente ha un account
      con password hashata. Si entra sempre con **username + password**: l'email
      richiesta da Auth è sintetica (`<username>@bettertrade.local`) e nessuno la
      vede mai. Il mestiere lo fa `emailDi()`, identica in `AuthContext.jsx` e
      `scripts/_admin.js` — se una delle due cambia, il login smette di funzionare.
- [x] **Colonna `password` eliminata.** Le vecchie erano di 5 caratteri.
      Le nuove sono corte e pronunciabili (`fuoco-530`): l'app è un archivio, non
      un conto, e devono essere dicibili a voce.
- [x] **RLS attiva** su tutte e sei le tabelle. C'erano sei policy `anon_all_*`
      che davano permesso totale a chiunque avesse la chiave pubblica, **senza
      login** — erano l'impalcatura del vecchio login. Sostituite: chi ha fatto
      login vede tutto l'archivio, scrivono solo admin e superadmin; movimenti e
      spunte "inserita" restano personali. Chi non ha fatto login non vede niente.
- [x] **Chiave e URL Supabase** da env var (`.env`, gitignorato). Nota: la chiave
      `anon` è pubblica per progetto — finisce comunque nel bundle. A proteggere
      è RLS, non nasconderla.
- [ ] **Ruotare la password Neon** di BTScout: la stringa di connessione è passata
      in chat durante il setup. Console Neon → ruolo `neondb_owner` → reset →
      aggiornare `btscout/.env`. **Unico punto ancora aperto.**

**Conseguenza da conoscere:** creare utenti e resettare la password di qualcun
altro richiedono la chiave `service_role`, che nel browser non può stare. Si fanno
da terminale:

```bash
node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"
node --env-file=.env scripts/reset-password.js Bermani
node --env-file=.env scripts/stato-migrazione.js   # a che punto siamo
node --env-file=.env scripts/backup.js             # dump di tutte le tabelle
```

Ognuno può cambiarsi la propria password dalla pagina Utenti. Per rimettere le
altre due operazioni nell'interfaccia serve una Edge Function che tenga la chiave
lato server.

## 🟠 2. La domanda scomoda — il sistema 3x3 è già stato misurato

La strategia dell'app **è già stata testata** in BTScout (`scripts/s5-bettertrade.js`).
La geometria coincide riga per riga: griglia `[[1,5,2],[6,9,7],[3,8,4]]`, tris = 3
righe + 2 diagonali, quaterne = 4 angoli + 4 lati, full a 9. Cambia solo la
numerazione delle caselle e lo split (77/20/3 nell'app, 80/16/4 nel test — lo split
non cambia il segno).

Esito su 110 spin, quote Bet365 reali, modello walk-forward:
- **puntata fissa: −12,71%** — gli accumulator moltiplicano il margine del banco
- **staking dinamico: 1000 → 10 (−99%)**, drawdown 100%
- full a 9 uscito **1 volta su 110**; tris 20,7%, quaterne 14,1%

**Il limite di quel test:** sceglieva le 9 partite col modello. Se la selezione la
fa Mattia a mano, i numeri della selezione sono altri. Ma la parte strutturale —
accumulator che moltiplicano il margine, staking al 10-20% dinamico che accelera la
rovina su vantaggio negativo — **non dipende da chi sceglie le partite**.

- [ ] **Misurare il ROI reale delle spin già giocate.** L'app ha già i dati veri in
      `giornate` e `movimenti`: è la risposta definitiva, e riguarda le partite
      vere, non quelle simulate. **Questo è il test che conta.**

---

## 🔵 3. Collegare i due pezzi — dopo la sicurezza

Nodi tecnici noti:

- [ ] **Due database.** BTScout sta su **Neon**, l'app su **Supabase**. O si migrano
      le 38.613 partite su Supabase (stanno nel free tier), o si tiene Neon dietro
      un'API. Da decidere.
- [ ] **L'app non ha backend.** È una SPA statica, niente `api/`. I backtest sono
      script Node pesanti: nel browser non girano. Servono funzioni serverless —
      che servono comunque per la sicurezza, quindi i due lavori si fanno insieme.
- [ ] **Cosa collegare, esattamente.** Due strade opposte:
      - ❌ *BTScout riempie la griglia coi pronostici più sicuri* → è letteralmente
        S5, già misurato a −99%. Non farlo.
      - ✅ *BTScout come contabile onesto dentro l'app* → ROI reale della selezione,
        quanto costa la struttura ad accumulator rispetto alle 9 singole, quanto è
        sovra-sicura la selezione.
- [ ] **S6 line shopping** è l'unico metodo con edge plausibile trovato finora
      (+1,6%, IC95 che sfiora lo zero). Ma funziona su **singole**, non su
      accumulator: userebbe l'app in modo diverso, non alimenterebbe la griglia.

---

## 🧹 4. Debito tecnico

- [ ] **Annidamento `BetterTrade/bettertrade/`** — una cartella di troppo.
- [ ] **History git sporca** — commit `Add files via upload` / `Delete bettertrade
      directory`: il codice è stato caricato dalla UI web di GitHub, non con git.
- [ ] **README.md vuoto** (contiene solo `# BetterTrade`).
- [x] **Codice morto rimosso** — `PlaceholderPages.jsx` (duplicato mai importato),
      props fantasma in `App.jsx`.
- [x] **Bankroll: una sola fonte di verità** — la formula era copiata identica in
      `BilancioPage` e `ReportingPage`, ora sta in `src/lib/bankroll.js`.
- [x] **Tema unico** — c'erano due temi scollegati (le CSS variables di
      `index.css`, che il JSX non usava mai, e ~130 colori scritti a mano).
      Ora `src/theme.js` è l'unica definizione e `src/components/ui.jsx` raccoglie
      i pezzi ricorrenti. Zero colori hardcoded nelle pagine.
- [ ] **`calcSchedule` arrotonda a zero** — i `Math.floor` in `AuthContext.jsx`
      producono €0 su tutte le voci quando la base è bassa. Correggerlo cambia
      gli importi giocati: è una decisione, non una pulizia.
- [ ] **`btscout/CLAUDE.md` e `btscout/STATO.md`** parlano ancora di BTScout come
      progetto a sé dentro Jarvis. Da fondere in questo file quando i due pezzi si
      collegano davvero.
- [ ] **`btscout/api/` + `index.html`** sono una PWA di chat standalone, mai
      deployata. Se non serve più, si cancella: l'app vera è `bettertrade/`.
- [ ] **Deploy Vercel** — da capire se BetterTrade è già online o gira solo in locale.

---

## Decisioni aperte

1. **Ci sono soldi veri di altre persone dentro adesso?** Se sì, la sicurezza non è
   una priorità: è un'urgenza.
2. **Neon o Supabase** come casa unica dei dati storici?
3. **Che ruolo ha BTScout nell'app**: motore di selezione o contabile onesto?
4. **Vale la pena tenere in vita `btscout/api/`** (la PWA di chat) o si cancella?

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
