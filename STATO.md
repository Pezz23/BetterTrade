# STATO — BetterTrade

> To-do list e fonte di verità sul punto in cui siamo. Da leggere all'inizio di
> ogni sessione e aggiornare ogni volta che una task cambia stato.

**Ultimo aggiornamento:** 9 settembre 2026
**Fase corrente:** pagina Partite costruita — prossimo passo: **vederla su Vercel, poi il pulsante Aggiorna (fase 5) o le spin (fase 7)**

---

## Dove siamo in una riga

**L'app e l'archivio sono ora nello stesso database.** `bettertrade/` (React+Vite,
in produzione su Vercel) e le 53.796 partite di 15 campionati vivono entrambi in Supabase;
`btscout/` resta il motore che le importa e le analizza. Sicurezza chiusa, numeri
chiusi, archivio dentro: adesso si costruisce sopra.

---

## L'obiettivo finale

BetterTrade propone una **lista di partite** scelte secondo parametri calcolati
sull'archivio, con filtri sulle quote. Io o gli utenti scegliamo quali prendere,
e l'app **compila da sola** griglia e schedine.

**Il criterio che interessa a Mattia (11 settembre):** riconoscere le partite in
cui **la quota è più alta di quanto dovrebbe essere**. Non "chi vincerà", ma
"questo prezzo è sbagliato in mio favore". Vedi la sezione qui sotto.

**Come si userà (16 settembre):** l'app mostra una lista di partite future con
un **indice di attendibilità** (lo scarto fra Bet365 e il consenso di mercato).
Da quella lista si scelgono **a mano** 9 o 18 partite per riempire **2 spin**.
Scelta manuale: l'app propone e misura, la persona decide. I dettagli durante
lo sviluppo dell'app.

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
      nome non lo diceva. Vedi `bettertrade/sql/07-exchange-apertura.sql`.
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

### L'indice di attendibilità per la lista delle partite

È esattamente quello che serve alla fase 6 (pagina Partite) e alla fase 8
(compilazione): per ogni partita futura, per ogni segno, **lo scarto fra la
quota Bet365 e la media di mercato normalizzata**. `prossime_partite` ha già
tutto quello che serve (`b365_*`, `avg_ap_*`). La soglia non va alzata troppo:
sopra il 5% restano poche scommesse a quote alte.

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
#    bettertrade/sql/07-exchange-apertura.sql sulla dashboard Supabase

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

### La routine, in un comando

```bash
cd btscout && node --env-file=.env scripts/aggiorna.js --esegui
```

Fa tre cose in ordine: risultati → storico, future giocate → collegamento,
nuove future. Se un passo fallisce si ferma lì. **È il comando che il pulsante
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

## 🔵 FASE 5 — Il pulsante Aggiorna nell'app

- [x] ~~Menu ad hamburger~~ → fatto con la fase 6.
- [ ] **Voce "Aggiorna dati"**: lancia l'import dello storico e delle partite
      future dall'app, senza terminale.
- [ ] **Nodo tecnico da risolvere prima.** Gli import sono script Node che
      girano sul Mac di Mattia: un pulsante nell'app non può eseguirli. Servirà
      una **Supabase Edge Function** — la stessa che serve già per creare utenti
      e resettare password. Da fare una volta, serve a tre cose.

---

## 🟢 FASE 6 — La pagina Partite — costruita il 16 settembre 2026

- [x] **Menu ad hamburger** (☰ in alto a destra). I 4 tasti in basso restano
      per l'uso quotidiano; il menu raccoglie il resto: **Partite** e, per gli
      admin, **Utenti** (che era un quinto tasto). Il pulsante "Aggiorna" arriverà
      qui con la Edge Function (fase 5).
- [x] **Pagina Partite** (`src/pages/PartitePage.jsx`): le partite future da
      `prossime_partite` con l'**indice di attendibilità** per ogni segno — lo
      scarto fra Bet365 e la media di mercato normalizzata. Il riferimento è
      `avg_ap_*`, **non l'exchange**: è quello che la misura ha validato.
- [x] **Filtri**: soglia (tutte / >0 / >2% / >5%), campionato, ordine per indice
      o per data. Sotto ogni quota lo scarto e il prezzo equo.
- [x] **Verificata** con i permessi di un utente normale: 6 partite, 2 con
      indice positivo (Betis–Getafe X +3,2%, Ath Madrid–Osasuna 2 +1,1%).
- [x] **Spiegazione in pagina**: cos'è l'indice, cosa dice e cosa non dice
      ("vantaggio atteso per singola scommessa, non una previsione").
- [ ] **Da vedere su Vercel dopo il push.** Se la lista è vuota, non è un
      errore: l'aggiornamento del venerdì non è ancora passato.

I calcoli girano nel browser (una divisione per riga): con poche decine di
partite future non serve niente lato database. Se un giorno servissero
aggregazioni sullo storico, quelle vanno in una vista SQL.

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

1. ~~Quali campionati aggiungere~~ — deciso: i 9 paesi che Mattia seguiva + Scozia.
2. **Con che cadenza scaricare le partite future** (fase 4): a mano martedì e
   venerdì, o schedulato. Lo script c'è; manca chi lo lancia.
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
