# STATO — BTScout

> Fonte di verità sul punto in cui siamo. Da leggere all'inizio di ogni sessione e
> aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 17 luglio 2026
**Fase corrente:** 6 chiusa (S1-S5 tutte perdenti) + **S6 line shopping: primo
ROI positivo del progetto (+1,6/+2,6%), ma con riserve serie — vedi sezione S6.**
**Deploy:** non ancora creato su Vercel

---

## 📊 FASE 5 — modelli alternativi coi tiri in porta (17 lug)

Dopo il verdetto negativo del gol (sotto), su richiesta di Mattia abbiamo provato
modelli diversi sugli stessi dati, sfruttando un segnale gratis che prima buttavamo:
i **tiri in porta** (un "xG del povero", meno rumoroso dei gol). Re-importato lo
storico con tiri/tiri-in-porta e le quote **Bet365 apertura + Max** (per un P&L
più realistico della chiusura Pinnacle).

**Tre modelli, stessi 10 campionati, walk-forward, vs Pinnacle chiusura:**

| Modello | log-loss 1X2 (mkt 1.003) | log-loss O/U (mkt 0.672) | ROI 1X2 ≥0% | ROI O/U ≥0% |
|---------|--------------------------|--------------------------|-------------|-------------|
| gol     | 1.0288 (+0.025)          | 0.6920 (+0.020)          | −6.2%       | −7.9%       |
| tiri    | 1.0276 (+0.024)          | **0.6821 (+0.010)**      | −6.4%       | **−7.0%**   |
| misto   | **1.0221 (+0.018)**      | 0.6833 (+0.011)          | −6.4%       | −9.0%       |

**Cosa dicono:**
- **I tiri dimezzano il distacco dal mercato sull'Over/Under** (+0.020 → +0.010):
  predicono il volume di gioco meglio dei gol. Su 1X2 aiutano poco.
- **Il misto (fonde gol+tiri, peso 0.5) è il miglior predittore su 1X2**
  (+0.018, il più vicino al mercato finora), e quasi il migliore su O/U.
- **MA nessun modello batte ancora il mercato, e nessuno fa ROI positivo.**
  Tutti −6/−9%, tutti peggio di "segui il favorito" (−2%). Il divario si è
  ristretto, non chiuso.

**Bug trovato e corretto (importante):** la stima della correzione ρ (`stimaRho`
in `lib/dixon-coles.js`) aveva un **ciclo infinito** — il ciclo di raffinamento
usava come estremo una variabile aggiornata dentro il ciclo stesso, inseguendo il
proprio bersaglio. Si innescava con pochissime partite a basso punteggio (frequente
coi tiri in porta), mandando E0 da 21s a 46+ minuti. Latente anche nel modello sui
gol. Corretto: estremi fissati prima del ciclo, e ρ=0 quando i dati sono <20 partite.

**Infrastruttura nuova** (riusabile per altri modelli):
- `lib/modelli.js` — modelli intercambiabili (`gol`, `tiri`, `misto`), interfaccia
  `fit`/`prevedi` (prevedi torna null se non può predire → niente crash).
- `backtest.js` esteso: `--modello=`, `--quote=pinnacle|media|max|bet365`,
  `--peso=` (misto), `--taglio=` (sconto di sicurezza), `--maxiter=` (80 = identico
  a 300 ma ~4× più veloce, il warm-start converge presto).

**Prova finale — vs Bet365 apertura (quote reali, più morbide della chiusura):**

| Config | ROI 1X2 ≥0% | ROI O/U ≥0% | favorito (baseline) |
|--------|-------------|-------------|---------------------|
| misto vs Bet365          | −9.1% | −7.0% | −4.8% |
| tiri vs Bet365           | −9.3% | **−5.6%** | −4.8% |
| misto vs Bet365 −5% sic. | −13.2% | −9.0% | −7.0% |

**Verdetto della fase 5, definitivo e onesto:** nessun modello, contro nessuna
fonte quota, con o senza sconto di sicurezza, fa ROI positivo o batte il mercato.
Anzi, **contro Bet365 il ROI è pure peggio** che contro Pinnacle: le quote di
apertura di Bet365 sono meno affilate (log-loss mercato 1.007 vs 1.004 di Pinnacle)
ma hanno un margine più alto, e il modello resta comunque peggiore anche della
linea morbida — quindi non riesce a sfruttarne la morbidezza. "Segui il favorito"
batte ogni modello ovunque.

**Il meno peggio:** `tiri` sull'Over/Under (−5.6%, distacco dal mercato +0.0075,
il più vicino). Resta una perdita netta: non basta.

**Conclusione complessiva delle fasi 4-5:** il Dixon-Coles su gol/tiri con dati
gratis è un modello *vero* (batte le frequenze base, ben calibrato) ma **meno
affilato del mercato**. I tiri lo avvicinano, soprattutto sui gol totali, ma il
divario non si chiude. La strada del "battere le quote" con questi ingredienti è
esaurita. Restano solo idee che costano (xG a pagamento) — escluse dalla regola
finché il modello non vale — o un cambio di obiettivo (vedi decisioni aperte).

**Caveat metodologico:** `peso=0.5` del misto non è stato ottimizzato (di
proposito, per non tarare sul test). Un peso diverso non cambierebbe il verdetto:
il miglior predittore (misto) perde comunque il 9%.

**Cache locale:** i dati sono anche in `.cache/partite.json` (via
`scripts/dump-locale.js`, gitignored). I backtest leggono da lì se c'è — niente
rete, ~2× più veloci. Rilanciare il dump dopo ogni import.

---

## 🧪 FASE 6 — strategie proposte da Mattia (lista da testare, 17 lug)

Ogni idea = una **selezione** (quali partite) + un **mercato** + uno **schema di
puntata** (staking). Si testano una alla volta col backtest onesto. Re-import
fatto con angoli, cartellini, gol primo tempo → dati pronti nella cache.

⚠️ **Nota che vale per TUTTE — da tenere a mente prima di illudersi:**
- **Lo staking NON crea vantaggio.** Il guadagno atteso dipende solo dalla
  selezione (le scommesse hanno valore positivo?), non da come si dosa la puntata.
  Le progressioni ("metti via quando vinci", incrementale) cambiano la *forma* del
  rischio (curva bankroll, drawdown), non il segno. Per ogni idea si misura PRIMA
  se la selezione ha edge; lo staking si **simula** per mostrarne la curva.
- **"Attendibilità Dixon >X%" = selezione per probabilità, non per valore.** Il
  valore è `prob × quota > 1`. Scegliere i favoriti (alta prob) non dà edge se il
  mercato li prezza bene — e i nostri modelli non battono il mercato.
- **Gli accumulator moltiplicano il margine del banco** (due 5% si sommano):
  rendono più difficile battere il mercato, non più facile.

| # | Selezione | Mercato | Staking | Quote/dati | Stato |
|---|-----------|---------|---------|------------|-------|
| S1 | Difese forti vs attacchi deboli (Dixon su gol 1°T) | **Under 1,5 primo tempo** | incrementale: 1u, se vinci rigioca di più, a 2,5u metti via 1u, su perdita reset a 1u | ⚠️ NO quote HT → hit-rate misurato | **misurato** ↓ |
| S2 | 2 partite/settimana con prob. Dixon 1X2 >60% | **Doppia 1X2** | 1u; vinci→via 0,5, rigioca il resto | 1X2 reali Bet365 | **fatto: PERDE** ↓ |
| S3 | come S2 ma sul mercato Over/Under | **Doppia O/U** | come S2 | O/U reali Bet365 (dal 2019/20) | **fatto: PERDE (peggio di S2)** |
| S4 | Squadre coi più pareggi nelle prime stagioni | **Pari/Dispari — gol totali PARI** (quota ~1,8) | 1u; a ogni vittoria metti via 0,5u | ⚠️ NO quote → hit-rate + quota assunta | **fatto: PERDE** ↓ |
| S5 | **BetterTrade** (matrice 3×3, vedi dettaglio sotto) | 1X2, 8 schedine accumulator dalla geometria | 20% bankroll/spin, split 80/16/4 | 1X2 reali Bet365 apertura | **fatto: FALLITO (−99%)** |

Note tecniche per quando si testano:
- **S1/S4** usano mercati per cui non abbiamo le quote reali: prima misuro *quanto
  spesso* la selezione azzecca (hit-rate), poi con una quota media che fissa Mattia
  stimo il ROI. È una stima, non un backtest contro quote reali.
- **S2/S3** sono testabili subito contro quote reali (è la parte solida).
- Serve un **simulatore di staking** nel backtest (curva bankroll, drawdown, ROI):
  da costruire una volta, poi vale per tutte.

### S1 — risultato (misurato 17 lug, `scripts/s1-under1t.js`)

Dixon sui gol del 1° tempo, walk-forward, 34.097 partite fuori campione.
- **Tasso base Under 1,5 HT: 67,4%** (pareggio a quota 1,485).
- La selezione "difese forti vs attacchi deboli" alza il tasso ma **poco**: al
  massimo **73,8%** prendendo solo il top 12% (soglia P≥80%) → serve quota **≥1,355**.
- **Il modello è sovra-sicuro**: dice 83%, succede 73,5%. Vale il tasso reale.
- **Alla quota ipotizzata 1,2 → perde** (~−11%/scommessa: servirebbe 83,3%, si
  arriva a 74%). La progressione non lo salva (staking ≠ edge).
- **Aperto:** quanto offre DAVVERO il mercato per Under 1,5 HT su queste partite?
  Se ≥1,36 c'è margine; se ~1,20 (probabile) si perde. Serve una quota reale da
  Mattia per chiudere il ROI e simulare la progressione.

### S2 — risultato (fatto 17 lug, `scripts/s2-doppia1x2.js`)

372 doppie (settimane), quote Bet365 apertura, walk-forward. Modello: gol.
- Doppie vinte 62,1%, quota media 1,68 (pareggio 59,6%) — **sembra vincente ma è
  illusione da media**: le doppie vinte sono quelle a quota bassa.
- **ROI a puntata fissa: −4,67%** (il vero valore della selezione, negativo).
- **Progressione di Mattia: −23,7u netti, drawdown 29u** — PEGGIO della puntata
  fissa (−17,4u). Rigiocare il montante espone di più sulle serie negative.
- Conferma: accumulator di favoriti = perde contro il mercato; lo staking peggiora.
- Variabili non provate (aspettativa invariata): modello misto, quote Pinnacle.

**Gestione unità testata (Mattia: "crea tu l'algoritmo"):** frazione fissa 5% →
−69%; mezzo Kelly → −99,8%; Kelly pieno → rovina. Gli algoritmi ottimali
DISTRUGGONO S2: il modello crede 230/372 doppie a valore positivo (è sovra-sicuro),
Kelly si fida e punta forte su edge falsi → rovina. La puntata fissa (−4,67%) è la
meno peggio perché non amplifica. Lezione: Kelly è ottimale **solo con probabilità
calibrate**; le nostre no. Nessun money management crea vantaggio o corregge la
sovra-sicurezza — il problema è a monte (selezione + calibrazione).

### S3 — risultato (fatto 17 lug, `scripts/s3-doppiaou.js`)

310 doppie O/U (dal 2019/20), quote Bet365, walk-forward, modello gol. **Peggio di S2.**
- Doppie vinte 43,2%, servirebbe 46,3% (quota media 2,16) → **ROI fisso −11,04%**.
- Progressione Mattia: **−109u, drawdown 109u**. Kelly: **rovina** (il modello crede
  301/310 a valore, ne vince 43% — sovra-sicurezza estrema sull'O/U).
- L'O/U è meno prevedibile dei favoriti 1X2 → quote più alte, confidenza più falsa.

### S4 — risultato (fatto 17 lug, `scripts/s4-pari.js`)

Classifica squadre per pareggi nelle prime 4 stagioni (2016/17–2019/20), test del
tasso "Pari" (gol totali pari) sulle stagioni successive (2020/21→). Fuori campione.
- **Tasso base Pari: 50,6%** (quasi 50/50, pareggio a ~1,98).
- La selezione "da pareggio" quasi non sposta nulla: **51-52%** in tutti i tagli
  (max 52,5% top 33% entrambe, poche partite). L'ipotesi di persistenza non regge.
- **A quota assunta 1,8: −7,68%** (servirebbe 55,6%, si arriva a 51,3%).
- Il Pari è ~50/50: il banco lo prezza ~1,9-1,95 → col margine perde comunque.

### S5 — BetterTrade (dettaglio)

Sistema a **matrice 3×3**: 9 scommesse (celle), da cui la geometria genera 8
schedine-accumulator. La struttura NON crea vantaggio (vedi nota in cima): è un
modo di raggruppare 9 scommesse e di dosare la puntata. Il test dirà cosa fanno
davvero le 9 celle scelte così, con la curva del bankroll.

**Selezione delle 9 celle (una spin per settimana di calendario):**
- Per ogni partita, l'esito **1X2 più probabile** secondo il modello Dixon.
- Filtro: **quota Bet365 apertura ≥ 1,4** su quell'esito.
- Si pescano da **tutti e 10 i campionati**; si prendono le **9 a confidenza più
  alta** della settimana → riempiono la griglia 3×3 (posizioni 1-9).
- Niente regola 6 (niente "aggiungi Over/X": non abbiamo quelle quote reali).

**Le 8 schedine (vince se TUTTE le celle vincono; quota = prodotto):**
- 5 tris: righe 1-2-3, 4-5-6, 7-8-9 + diagonali 1-5-9, 7-5-3.
- 2 quaterne: 4 angoli 1-3-7-9, 4 lati 2-4-6-8.
- 1 full: 1-2-3-4-5-6-7-8-9.

**Staking:** 20% del bankroll per spin, diviso 80%/16%/4% fra tris/quaterne/full →
ogni tris **3,2%**, ogni quaterna **1,6%**, full **0,8%** del bankroll. Bankroll
iniziale **1000**, dinamico (aggiornato dopo ogni settimana), **fallito a ~0**.

**Da decidere in implementazione (default proposti):**
- Quale modello per la confidenza: **gol** (riferimento) o misto. Default: gol.
- Settimane con **<9 partite** idonee (quota ≥1,4): si salta la spin. Default: salta.
- Walk-forward: il modello è ri-stimato coi soli dati prima della settimana (come
  gli altri backtest — niente sguardo al futuro).
- Configurazioni di split alternative (aggressivo/conservativo) come varianti.

**Risultato S5 (fatto 17 lug, `scripts/s5-bettertrade.js`):** 110 spin, quote Bet365,
modello gol, disposizione: più sicura al centro, 2ª-5ª agli angoli, 6ª-9ª ai lati.
- Tassi: tris 20,7%, quaterne 14,1%, **full 1/110** (il 9-fold non esce quasi mai).
- **Valore vero (puntata fissa 1u/schedina): −12,71%** (gli accumulator moltiplicano
  il margine → peggio delle singole).
- **Staking BetterTrade (20% dinamico da 1000): FALLITO, 1000→10 (−99%)**, drawdown
  100%. Curva: sale a 1387 con colpi iniziali, poi si erode fino a zero (la trappola
  del progressivo su vantaggio negativo). La struttura 3×3 massimizza il rischio.

---

## 💡 S6 — Line shopping vs chiusura Pinnacle (17 lug) — IL PRIMO RISULTATO POSITIVO, con riserve

Richiesta di Mattia: "trova un metodo funzionante, anche guadagni minimi ma
costanti". L'unica via rimasta coi nostri dati — e NON usa il nostro modello:
usa **il mercato contro se stesso**. Probabilità eque = Pinnacle chiusura senza
margine (Shin, il miglior stimatore esistente); si scommette quando la **quota
massima di mercato** (MaxC, ~40 book, stesso istante → niente sguardo al futuro)
supera il prezzo equo. Script: `scripts/s6-lineshopping.js`.

**Risultati (24.646 partite dal 2019/20, puntata fissa):**
- Tutte le stagioni, edge >0%: **ROI +2,59%, IC95 [+0,75%, +4,43%]** — primo
  intervallo interamente sopra zero del progetto.
- **MA il 2019/20 (Covid, stadi vuoti) gonfia il dato** (+9,78% quell'anno).
  Senza: **+1,62%, IC95 [−0,34%, +3,58%]** — sfiora lo zero, non è provato.
- Per stagione (senza Covid): **5 su 6 positive** (+0,8/+4,4%), negativa solo
  2025/26 (−3,4% su 887 bet, con Pinnacle che copre ~40% delle partite).
- Regge a un haircut del 2-3% sulla quota (non prendere sempre il prezzo top).

**Lettura onesta:** è l'unico metodo con un piccolo edge plausibile e coerente
con la letteratura (i book "morbidi" sbagliano rispetto a Pinnacle). Ordine di
grandezza: **+1-2%**, non di più. Riserve serie:
1. Statistica: senza Covid l'IC tocca lo zero. Plausibile ≠ dimostrato.
2. Pratica: servono conti su molti book per prendere la quota migliore, e i book
   **limitano in fretta chi vince** — è il collo di bottiglia vero del metodo.
3. Operativa: si scommette a ridosso del calcio d'inizio (quote di chiusura).
4. Futuro: Pinnacle sta sparendo dai dati (2025/26 al 40%) — il "metro" del
   metodo si sta degradando, e infatti l'unica stagione negativa è quella.

---

## 🏁 FASE 6 — CONCLUSIONE: tutte le 5 strategie perdono

| # | Cosa | Esito |
|---|------|-------|
| S1 | Under 1,5 1°T su difese forti | tasso max 74% → serve ≥1,355; a 1,2 perde |
| S2 | Doppia 1X2 favoriti | −4,67% fissa; Kelly → rovina |
| S3 | Doppia O/U | −11% fissa; peggio di S2 |
| S4 | Pari/Dispari su squadre da pareggio | ~51% (base 50,6%) → a 1,8 perde |
| S5 | BetterTrade matrice 3×3 | −12,7% fissa; staking → fallito (−99%) |

**Lezione, ora dimostrata cinque volte:** selezionare per confidenza sceglie i
favoriti (prezzati bene dal mercato); combinarli moltiplica il margine; lo staking
non crea vantaggio e i sistemi aggressivi (Kelly, 20% dinamico) accelerano la
rovina perché amplificano un modello sovra-sicuro. Il muro resta quello delle fasi
4-5: **il modello non batte il mercato, e nessuna sovrastruttura di scommessa lo
aggira.** Le uniche vie non battute restano quelle non-tecniche (fermarsi, cambiare
obiettivo) o a pagamento (xG) — vedi decisioni aperte.

---

## ⛔️ IL CANCELLO (FASE 4) — il gol non batte il mercato

Il backtest su 32.003 partite fuori campione (10 campionati, walk-forward, contro
Pinnacle di chiusura) dice che **il modello Dixon-Coles sui soli gol non batte il
mercato**, né a predire né a fare soldi:

- **Predizione**: log-loss modello 1.0288 vs mercato 1.0038 (1X2). Il modello
  predice **peggio del mercato in ogni singolo campionato**, di ~0.025. Batte le
  frequenze base (1.0743), quindi è un modello vero — ma meno affilato del banco.
- **ROI a puntata fissa**: negativo ovunque, −6% a −8% (1X2), −8% a −10% (O/U),
  con intervalli di confidenza tutti sotto zero (non è rumore).
- **Il "valore" è errore del modello**: alzando la soglia di edge il ROI
  peggiora, non migliora. Le partite dove il modello dissente di più dal mercato
  sono quelle dove sbaglia di più. Esattamente la previsione di CLAUDE.md.
- **"Segui il favorito" (−2%) batte il modello ovunque.**

**Questo è il successo del metodo, non un fallimento del progetto.** Il cancello
serviva a scoprirlo in un pomeriggio invece che in sei mesi di soldi veri. Il
modello, così com'è (Dixon-Coles classico sui gol, niente xG, dati gratis), non
regge contro le quote di chiusura di Pinnacle. Va detto per primo, senza girarci
attorno (regola CLAUDE.md).

**Cosa NON fare:** deployare la PWA come strumento di scommessa, o passare a dati
a pagamento (xG, API) sperando di recuperare. La regola era: rivalutare i dati a
pagamento *solo se il modello vale*. Non vale. Non si spende.

**Decisioni aperte** (in fondo) — cosa farne ora: fermarsi, oppure gli unici
tentativi onesti rimasti (odds migliori disponibili invece della chiusura;
taratura di ξ) che però difficilmente ribaltano un divario sistematico.

---

## Dove siamo in una riga

Storico su Neon (38.613 partite, + cache locale), tre modelli (gol, tiri, misto)
costruiti e testati fino in fondo, anche contro Bet365 e con lo sconto di sicurezza.
**Nessuno batte il mercato né fa ROI positivo** — i tiri migliorano la predizione
(soprattutto sui gol totali) ma il divario col banco non si chiude. La strada
"battere le quote" con dati gratis è esaurita; la decisione su cosa fare ora è di
Mattia (vedi decisioni aperte). La PWA non è deployata: **non come strumento di
scommessa**.

---

## ⛔ Bloccato su Mattia — una cosa

- **Progetto Vercel** con Root Directory = `btscout/` e le env var
  (`ANTHROPIC_API_KEY`, `DATABASE_URL`). Indipendente dal modello: posso
  costruire il Dixon-Coles mentre tu fai Vercel.

## 🔒 Sicurezza — da fare

- **Ruotare la password Neon**: la stringa di connessione è passata in chat
  durante il setup. La `DATABASE_URL` è in `btscout/.env` (ignorato da git, non
  committato), ma la password è stata esposta. Console Neon → ruolo
  `neondb_owner` → reset password → aggiornare `.env` e le env var Vercel.

---

## Cos'è BTScout

Un analista calcistico che cerca **value bet** sui principali campionati europei,
mercati **1X2** e **Over/Under 2.5 gol**. Non è un pronosticatore: è uno strumento
che mostra **dove e perché** un modello statistico dissente dal mercato.

Vive separato da JARVIS per scelta di Mattia (non sporcare il prompt di JARVIS con
il calcio). Un domani si parleranno: JARVIS coordinatore, BTScout specialista.

---

## Fatto ✅

- [x] Cartella `btscout/` nel monorepo, accanto a `jarvis-pwa/`
- [x] PWA riadattata da JARVIS (dark HUD, orb, login, chat, etichetta build)
- [x] `api/chat.js` — system prompt di BTScout + tool runner (lista strumenti vuota)
- [x] `api/version.js` — etichetta build con hash del commit
- [x] Fonti dati scelte: football-data.co.uk (storico) + The Odds API (quote)
- [x] CLAUDE.md con le regole che non si toccano
- [x] Campionati e stagioni decisi: **top 5 + seconde divisioni, 10 stagioni**
      (2016/17 → 2025/26). 100 CSV, tutti verificati raggiungibili.
- [x] `scripts/import-storico.js` — schema `partite` + importatore idempotente
- [x] `scripts/verifica-storico.js` — verifica di sanità post-import
- [x] Parser verificato sui CSV veri: **38.613 partite, 0 duplicati, 1 riga
      scartata** (una partita di Ligue 2 senza risultato)
- [x] Verifica nomi squadra fatta: **un solo alias vero** in 10 stagioni
      (`Leonesa` → `Cultural Leonesa`, Liga 2), già gestito nell'importatore

---

## To-do — in ordine di priorità

### 1. Deploy della base 🔴 PRIMO PASSO — serve Mattia
- [ ] **Mattia:** creare il progetto su Vercel, Root Directory = `btscout/`
- [ ] **Mattia:** env var `ANTHROPIC_API_KEY` e `DATABASE_URL` (stesso Neon di JARVIS)
- [ ] Verificare che la PWA risponda e che BTScout dica onestamente di non avere dati

Serve a chiudere il giro tecnico prima di costruirci sopra: se il deploy non va,
meglio scoprirlo adesso che dopo il modello.

### 2. Storico su Neon ✅ FATTO
- [x] Schema: tabella `partite`
- [x] Importatore dei CSV di football-data.co.uk → Neon
- [x] Verifica dei nomi squadra (la **trappola classica**): fatta, un solo alias
- [x] Import eseguito: **38.613 partite** su Neon, 0 duplicati
- [x] Verifica di sanità superata: 0 esiti incoerenti, 0 quote fuori scala, 0
      squadre con storico spezzato, tutte le 100 combinazioni presenti
- [x] **Margini corretti**: Pinnacle 1.023–1.033, media mercato 1.053–1.067.
      Le probabilità implicite si leggono bene → il confronto col modello è pulito

Per rilanciare (nuova giornata della stagione in corso):
`node --env-file=.env scripts/import-storico.js` — è idempotente.

**Perché prima del modello:** senza storico non c'è né taratura né backtest. Ed è
il pezzo che rende il progetto indipendente dai limiti delle API — l'intuizione di
Mattia: scarichi una volta, poi non chiami più nessuno per il passato.

#### ⚠️ Scoperte dell'import — cambiano le assunzioni

**L'Over/Under 2.5 ha quote di chiusura solo dal 2019/20.** Nelle stagioni
2016/17→2018/19 football-data pubblicava solo le medie Betbrain (`BbAv>2.5`), che
**non sono quote di chiusura**. Usarle mescolate alle altre falserebbe il backtest,
quindi non si importano. Conseguenza concreta: il backtest sull'Over/Under gira su
**6 stagioni, non 10**. Sul 1X2 le 10 stagioni ci sono tutte (`PSC*` di Pinnacle).

**Pinnacle sta sparendo dai dati recenti.** Nel 2025/26 copre ~40% delle partite
(90 su 380 in Serie B), mentre la media di mercato (`AvgC*`) è completa. Per questo
lo schema salva **entrambe**: Pinnacle è il test più severo (margine più basso), la
media è quella che ci sarà sempre. Quale usare lo decide il backtest — sceglierne
una ora avrebbe voluto dire rifare l'import.

**Ligue 1 e 2 del 2019/20 finiscono a marzo 2020.** Il Covid le cancellò: ~280
partite invece di 380. Non è un buco dell'import, non va "riparato".

### 3. Modello Dixon-Coles ✅ FATTO
- [x] Forza d'attacco e di difesa per squadra dai gol storici
- [x] Correzione Dixon-Coles per i risultati bassi (0-0, 1-0, 0-1, 1-1)
- [x] Decadimento temporale: le partite recenti pesano di più (emivita 200 gg)
- [x] Da probabilità dei punteggi → probabilità 1X2 e Over/Under 2.5
- [x] Vantaggio del fattore campo

Dove sta: `lib/dixon-coles.js` (sola matematica, funzioni pure `fit` / `prevedi`
/ `matricePunteggi`) + `scripts/fit-modello.js` (stima sui dati veri e stampa i
controlli). Provalo: `node --env-file=.env scripts/fit-modello.js [I1]`.

#### Come è stimato — la scelta tecnica
Massima verosimiglianza con **aggiornamenti moltiplicativi in forma chiusa**
(non un ottimizzatore generico): attacco = gol segnati pesati / somma delle
difese affrontate, e simmetrico per difesa e fattore campo. ρ stimato dopo con
ricerca 1-D sui soli punteggi bassi. Deterministico, nessuna dipendenza.

**Trappola risolta — l'iterazione divergeva.** Con l'aggiornamento simultaneo,
fattore campo e difese oscillano con ampiezza crescente (l'uno compensa l'altro
a ogni giro) e il fit esplode in NaN. Corretto col **sotto-rilassamento**
(passo parziale in scala log, η=0.5): stesso punto d'arrivo, oscillazione spenta.
Chi tocca `lib/dixon-coles.js` non rimuova il damping.

#### Verifiche fatte
- **Recupero di parametri noti**: genero partite da forze inventate → il fit le
  ritrova (attacco/difesa/campo entro l'1-2%, ρ da congiunta DC vera −0.10→−0.097).
  Prova che la matematica è corretta, non solo "sembra".
- **Sui dati veri, tutti e 10 i campionati**: squadre forti in testa ovunque
  (Bayern 2.55, PSG, Barça, Man City…), calibrazione in-sample a posto (gol
  predetti entro ~0.15 dai reali, vittorie casa entro 1-2 punti).

#### Nota per il backtest (punto 4)
- **ξ (decadimento) è IL parametro da tarare**: 200 giorni è un default ragionato,
  non ottimizzato. Il backtest deve provare più valori.
- **Neopromosse**: es. Como esce 2° in attacco in Serie A. Non è un bug (tutte le
  altre neopromosse forti sono verificabili: Ipswich/Southampton in Championship).
  Ma se il backtest mostra che le loro stime, basate su pochi dati, fanno perdere,
  valutare uno **smorzamento verso la media** per le squadre con poche partite.

### 4. Backtest ✅ FATTO — ESITO NEGATIVO
- [x] Modello sulle stagioni storiche contro le quote reali (walk-forward, niente
      sguardo al futuro: ri-stima a ogni giornata sui soli dati precedenti)
- [x] Margine tolto dalle quote prima del confronto (`lib/mercato.js`,
      proporzionale + Shin)
- [x] Misurato: log-loss vs mercato, calibrazione, ROI a puntata fissa con IC
- [x] Confronto coi baseline: favorito, sempre casa, a caso

Dove sta: `scripts/backtest.js` + `lib/mercato.js`. Rilancialo:
`node --env-file=.env scripts/backtest.js [DIV] [--quote=pinnacle|media]
[--emivita=200] [--mercato=proporzionale|shin]`.

**Esito: il modello non batte il mercato** (dettagli in cima al file). Il cancello
ha fatto il suo lavoro: **il progetto si ferma qui come strumento di scommessa**,
salvo decidere diversamente sulle decisioni aperte.

Note tecniche del backtest, per chi ci torna:
- Robustezza: banda di sicurezza sui rating nel fit (una squadra a 1 partita
  esplodeva a 728 e contaminava gli avversari), e **niente scommesse su squadre
  con <8 partite pregresse** (rating inaffidabile — la preoccupazione neopromosse).
- Calibrazione buona ma lieve **sovra-sicurezza sui grandi favoriti** (dice 92%,
  succede 81%). Non basta a fare edge: ricalibrare = diventare il mercato −margine.

### 5-7. ⏸️ CONGELATI — il punto 4 non regge
Quote live, strumenti di BTScout e registro delle previsioni avevano senso solo
se il modello valeva. Non vale. Restano descritti sotto per memoria, ma non si
costruiscono finché non cambia qualcosa alle decisioni aperte.

### 5. Quote live 🔵 solo se il punto 4 regge — NON regge
- [ ] **Mattia:** chiave di The Odds API (gratis, 500 crediti/mese, niente carta)
- [ ] Strumento `leggi_quote` → calendario e quote della giornata in arrivo
- [ ] Budget crediti: ~80/mese con 5 campionati e 2 mercati. Stare larghi.

### 6. Strumenti di BTScout 🔵
- [ ] `interroga_storico` → legge il database
- [ ] `stima_partita` → chiama il modello
- [ ] `leggi_quote` → quote live
- [ ] `registra_esito` → scrive nel registro

### 7. Registro delle previsioni 🔵 NON opzionale
- [ ] Tabella `previsioni`: cosa ha detto BTScout, quando, con che probabilità
- [ ] Verifica automatica dopo la partita
- [ ] BTScout deve poter dire "negli ultimi tre mesi sono andato così"

Senza, dopo tre mesi nessuno sa se funziona. Vedi CLAUDE.md.

### 8. Collegamento a JARVIS 🔵 FUTURO
- [ ] Esporre BTScout come strumento di JARVIS (hub-and-spoke)
- [ ] "Quale partita guardo sabato visto che ho cena alle 20?" — agenda + calcio

---

## Decisioni aperte

1. **CHE FARE ORA?** (le fasi 4-5 hanno risposto alle vie tecniche: nessuna vince)
   Provato e bocciato: gol, tiri, misto; Pinnacle, Bet365, con/senza sconto. Restano
   scelte **non tecniche**, da fare a Mattia:
   - **Fermarsi.** La regola del progetto lo indica: il cancello ha detto no due
     volte. BTScout resta un esercizio di metodo riuscito (storico, modello,
     backtest onesto, bug trovati), non uno strumento di scommessa. Zero soldi persi.
   - **Cambiare obiettivo:** non "battere le quote" ma uno strumento di **analisi/
     studio** (dove modello e mercato divergono, e perché) — dichiarando che NON
     promette valore. Onesto solo se presentato così; le divergenze restano per lo
     più errori del modello.
   - **Dati a pagamento (xG, API):** l'unica leva tecnica non provata, perché costa.
     Esclusa dalla regola finché il modello non vale. Non vale. Da riaprire solo se
     Mattia decide di investire *sapendo* che l'aspettativa resta bassa.
   - **Idee più ambiziose** (mercati diversi: handicap asiatico, marcatori; ML su
     più feature; ensemble): possibili col banco di prova già pronto, ma con la
     stessa aspettativa onesta — battere Pinnacle è durissimo, e finora nulla lo fa.

2. **Login della PWA:** eredita l'hash di JARVIS. Va bene la stessa password o
   ne serve una sua? (Rilevante solo se si decide di deployare comunque.)

---

## Storico decisioni

| Data | Decisione | Motivo |
|------|-----------|--------|
| 16 lug 2026 | Agente separato, non strumento di JARVIS | Mattia: non sporcare il prompt di JARVIS col calcio. Costo: perde l'accesso all'agenda, che aveva "gratis" restando dentro |
| 16 lug 2026 | Stesso repo, cartella a parte | Repo separato raddoppia la manutenzione per zero vantaggio con un solo sviluppatore |
| 16 lug 2026 | football-data.co.uk per lo storico | 30+ anni di risultati **con le quote di chiusura**, gratis e senza chiave. È l'unica fonte che permette il backtest contro quote reali |
| 16 lug 2026 | The Odds API per le quote live | 500 crediti/mese gratis, 40 bookmaker; calendario e quote insieme |
| 16 lug 2026 | Niente xG per ora | Non c'è gratis. Il Dixon-Coles sui gol è il baseline della letteratura: basta per capire se la strada regge |
| 16 lug 2026 | Backtest prima della PWA completa | Se il modello perde contro le quote storiche, l'interfaccia è lavoro buttato |
| 16 lug 2026 | Il modello calcola, Claude giudica | Gli LLM non danno probabilità calibrate. Vedi CLAUDE.md |
| 16 lug 2026 | **Backtest: esito negativo, il modello non batte il mercato** | 32.003 partite fuori campione, walk-forward vs Pinnacle chiusura. Log-loss modello 1.0288 > mercato 1.0038; ROI −6/−8%; il valore alto è dove il modello sbaglia di più. Il cancello ha fatto il suo lavoro |
| 16 lug 2026 | Top 5 + seconde divisioni, 10 stagioni (2016/17→2025/26) | Il Dixon-Coles si tara su un campionato alla volta: le seconde divisioni non migliorano la stima della Serie A, ma raddoppiano le partite su cui il backtest può pronunciarsi. 10 stagioni perché testarne 2 significa misurare la fortuna |
| 16 lug 2026 | Salvare sia Pinnacle (`PSC*`) sia la media di mercato (`AvgC*`) | Pinnacle ha il margine più basso ed è il test più severo, ma nel 2025/26 copre solo ~40% delle partite. Quale usare lo dirà il backtest; sceglierne una ora avrebbe imposto di rifare l'import |
| 17 lug 2026 | Re-import con tiri in porta + quote Bet365/Max | Su richiesta di Mattia: provare modelli diversi. I tiri sono il miglior segnale gratis inutilizzato ("xG del povero"); Bet365 apertura serve a un P&L realistico |
| 17 lug 2026 | **Fase 5: tiri e misto migliorano ma non battono il mercato** | Misto miglior predittore 1X2 (gap +0.018), tiri miglior O/U (gap +0.010, ROI −5.6% il meno peggio). Nessuno positivo, nemmeno vs Bet365 morbido. La strada dati-gratis è esaurita |
| 17 lug 2026 | Cache locale dei dati (`.cache/partite.json`) | I molti backtest di esplorazione leggono da disco: ~2× più veloci e immuni ai cali di rete (Mac in sleep). Ricostruibile da Neon, gitignored |
| 16 lug 2026 | Nome: **BTScout**, cartella `btscout/`, tabella `btscout_chat_history` | Deciso prima del deploy, quando cambiare nome costa zero: dopo sarebbero stati nome progetto Vercel, URL e icona sul telefono. Restano `scout` le classi CSS interne e la chiave sessionStorage: non le vede nessuno, toccarle era rischio senza beneficio |
| 16 lug 2026 | Niente quote Betbrain pre-2019/20 sull'Over/Under | `BbAv>2.5` è una media, non una quota di chiusura. Mescolarla alle chiusure vere falserebbe il backtest: meglio 6 stagioni oneste che 10 sporche |
