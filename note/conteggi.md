# ANGOLI E CARTELLINI — i mercati che si contano

Il dato c'era dal primo giorno e non lo leggeva nessuno: `angoli_*`,
`gialli_*`, `rossi_*`, `tiri_*`, `tirip_*` stanno in `partite` da `sql/05`,
pieni al 94,8% su 54.249 righe. ⚠️ **Il lavoro non è stato prenderlo: è stato
usarlo.**

## Il modello — `app/src/lib/conteggi.js`

Quello classico moltiplicativo: *quanto una squadra produce* × *quanto l'altra
concede*, riportato alla media della competizione, e la probabilità del totale
esce da Poisson.

⚠️⚠️ **Usa la `pOver()` di `lib/gol.js`.** Una seconda Poisson in questo repo
sarebbe la copia che prima o poi dice un numero diverso dallo schermo.

⚠️ **Casa e fuori separati**: in Champions chi gioca in casa batte 5,3 angoli
contro i 4,3 dell'ospite. Una media unica spalmerebbe quel vantaggio su
tutt'e due.

⚠️⚠️ **Quello che una squadra CONCEDE è quello che l'altra FA**: gli angoli
subiti in trasferta dall'ospite sono gli angoli battuti in casa dai suoi
avversari. Sbagliare lato qui significa prevedere la partita a specchio.

⚠️ **`K_STRETTA = 12`, misurato.** Una squadra di Champions gioca otto partite
di fase campionato: su otto una media è quasi rumore. `forza = 1 + (grezza − 1)
× n/(n+K)` tende a 1 finché non ha visto abbastanza. Con 8 la Champions scende
sotto la base, con 20 non guadagna niente.

## ⚠️⚠️ Quanto vale — e perché il blocco NON dà consigli

Misurato camminando nel tempo su tutto l'archivio (`prova-conteggi.js`), sulla
soglia con la **base più vicina al 50%** — l'unica dove un modello possa
aggiungere qualcosa, perché dove l'over esce il 70% delle volte "dico sempre
over" fa 70% e nessuno lo batte.

| | angoli | cartellini |
|---|---|---|
| Serie A | **+4,1** | +1,8 |
| Premier | −0,8 | **+4,0** |
| Scozia | +1,4 | **+3,4** |
| Francia 1 | −0,4 | **+2,7** |
| Champions | +0,9 | +1,6 |
| Belgio | **−2,6** | −0,4 |

**In otto competizioni su venti il modello sta sotto la base.** Per questo le
due card **descrivono e non consigliano**: niente verde, niente «giocata», e
dove non serve lo dicono in ambra — ⚠️ **fuori dalla parte che si apre**,
perché nascondere proprio la cautela farebbe leggere quei numeri come se
fossero l'attendibilità.

⚠️ **Sui cartellini rende più che sugli angoli**, al contrario di quanto
sembrava misurando solo la Champions: è il motivo per cui le card sono **due**
e non una — due mercati, due giudizi.

⚠️⚠️ **La tabella `MISURA` la STAMPA il banco di prova** (`--tabella`), nella
forma che la libreria vuole. Un numero misurato e poi ricopiato a mano è un
numero che può sbagliarsi in silenzio.

## Quello che è stato provato e NON funziona

**Prevedere gli angoli dai tiri.** La letteratura dice che i tiri portano
informazione oltre il risultato, e in questo progetto sui gol avevano già vinto
(`lib/gol.js` usa `BASE_DEFAULT = 'tiri'`). Sugli angoli **no**: in Serie A
49,4% contro il 56,1% della storia degli angoli. Anche la media delle due
(`--base=misto`) resta sotto. La storia degli angoli è la migliore delle tre.

⚠️ **E un avvertimento di metodo.** La prima volta le tre varianti davano
numeri **identici al decimale**: la query non leggeva i tiri e la prova
ripiegava in silenzio sugli angoli. *Un interruttore che non morde è peggio di
uno che manca, perché fa credere di aver misurato.* Tre numeri uguali sono
impossibili: è così che si è visto.

## I dati — `sql/39`, `conteggi_dati(div, ultime)`

⚠️ **Per competizione, non per archivio**: `vpm_dati()` torna 77 kB perché
serve alla lista di duecento partite; questa serve alla scheda di **una**.

⚠️ **Tre anni, non tutto lo storico**: le ultime dieci in casa di una squadra
che in Champions torna ogni tanto arriverebbero dal 2017 — altri giocatori,
spesso un altro allenatore. Meglio poche partite recenti **col loro conteggio
scritto accanto** che una media lunga e falsa.

⚠️ **Solo righe con le statistiche** (`angoli_casa is not null`): nelle
stagioni vecchie ESPN non ha il riepilogo, e una media su righe vuote sarebbe
uno zero travestito da dato.

## ⚠️⚠️ La verifica sulle partite vere — ottobre 2026 (29/10)

Mattia: *"gli indicatori cartellini e calci d'angolo sbagliano quasi sempre
nelle partite che ho guardato"*. Rifatto il conto su **423 partite giocate
dal 1/10/2026**, con la stessa formula della scheda (`atteso`,
`sogliaCentrale`, `pOltre`) e **solo i dati precedenti** a ogni partita:

| | angoli | cartellini |
|---|---|---|
| probabilità media data all'over della soglia | 48% | 46% |
| over uscito davvero | 49% | 47% |
| verso giusto | **53,7%** | **52,0%** |
| partite «decise» (≥60% o ≤40%) | 2 | 91, giuste il **59%** |

**Le probabilità sono tarate, il modello non è rotto: non sa quasi niente.**
⚠️⚠️ **E il difetto è di presentazione**: la card sceglie la soglia **più
vicina al totale atteso**, cioè per costruzione quella dove il modello sta
intorno al 50%. «O 9,5 · 52%» si legge *"gioca over 9,5"*, e l'over esce meno
di metà delle volte: letto così, sbaglia più di quanto indovina — è
esattamente quello che Mattia ha visto. Sugli angoli la card è stata incerta
in **421 partite su 423**. Proposta (non ancora decisa): via la soglia dalla
testata, angoli solo descrittivi, cartellini col verso **solo** dove il
modello è deciso e la misura coi falli dice che regge.

## ⛔ I falli NON aiutano, e nemmeno le altre varianti (29/10/2026)

Misurato con `prova-conteggi.js --riassunto` sui quindici campionati,
camminando nel tempo, K=12. Lo «scarto» è quanti punti il modello fa meglio
di chi dice sempre il più frequente, sulla soglia con la base più vicina al
50%:

| | base | scarto |
|---|---|---|
| cartellini | i cartellini stessi (oggi) | **+1,18** |
| | i **falli** | −0,09 |
| | metà e metà | +1,25 |
| | finestra 20 invece di 10 | +1,54 |
| angoli | gli angoli stessi (oggi) | **+0,61** |
| | i tiri | −0,26 |
| | i tiri in porta | −0,24 |
| | metà angoli, metà tiri in porta | +0,80 |
| | finestra 20 | +0,72 |

Nessuna supera il punto e mezzo: sono decimali, cioè rumore. **Il recupero
dei falli da ESPN per le coppe non serve.**
⚠️⚠️ **E una correzione di metodo, da non ripetere**: il 29/10 si era detto
che sui cartellini «quando il modello si sbilancia» indovina il 59% (e il
74% su tutte le soglie). **Non è merito suo**: il modello si sbilancia quasi
solo sulle soglie dove quel risultato capita comunque spesso. Contro la base
**sulle stesse partite** il vantaggio è **+0,4 punti** (cartellini) e **+0,2**
(angoli). Per questo `--riassunto` stampa le decise **con la loro base
accanto**: un numero di «giuste» senza la base è la frequenza travestita.

## ✅ LA VERSIONE 2 — il mercato dei gol, la binomiale negativa, il derby (29/10/2026)

Dall'articolo di Yip, Zou, Hung e Yiu (*Journal of the Operational Research
Society*, 2024; arXiv 2112.13001), cercato perché Mattia voleva *"migliorare
l'algoritmo"* invece di toglierlo. Tre cose nuove, in `lib/conteggi.js`:

1. **le quote dei gol** (`ingressiMercato`): dall'over 2,5 e dall'1X2 di
   **apertura** i gol totali attesi (`tg`) e lo sbilanciamento (`sbil`);
2. **la binomiale negativa** (`pOltreNB`): angoli e cartellini variano più di
   una Poisson, e il modello di prima era troppo sicuro di sé;
3. **il derby**, solo sui cartellini (`lib/derby.js`, ~110 coppie scritte a
   mano coi nomi dell'archivio): nei derby i gialli sono **×1,21** su 1.347
   partite (Turchia ×1,50, Portogallo ×1,34), gli angoli **×0,98**.

`log μ = b0 + b1·log(storico) + b2·tg + b3·sbil [+ b4·derby]`, i coefficienti
per campionato **stampati** da `prova-conteggi-v2.js --tabella` (stimati con
le regole di `conteggi_dati`: ultime 10 in tre anni, lega su due anni).

**Misurato camminando nel tempo** (coefficienti dalle sole stagioni prima,
quindici campionati, 31.929 partite dal 2020/21). Il metro principale è il
**log score contro un modello nullo** (`L`, la frequenza della lega):

| | oggi (v1) | v2 |
|---|---|---|
| angoli | **−0,67%** — peggio di non sapere niente | **+0,55%** |
| cartellini | +0,86% | **+1,85%** (col derby; +1,71% senza) |

⚠️⚠️ **La v1 sugli angoli era peggio di niente**: come probabilità, scrivere
la media della lega avrebbe fatto meglio. La sola binomiale negativa la
riporta sopra lo zero (+0,40%).
⚠️ **Resta poco, e va detto**: le «decise» della v2 non battono la loro base.
La v2 rende le probabilità **più oneste**, non trova le partite sicure — per
quello servirebbero le quote dei mercati angoli/cartellini, che The Odds API
non risulta avere.
⚠️ **Solo i quindici campionati**: le coppe non hanno lo storico delle quote
di apertura e lì risponde la v1 (`previsione` sceglie, e il voto di fiducia
è sempre quello della versione che ha risposto).

## Quello che manca, e da dove viene

La letteratura (Kruse & Maennig) indica **arbitro, derby e fattore campo** come
i fattori dei cartellini. Il fattore campo c'è già, il derby dal 29/10 (sopra).
Il resto:

- **i falli** — ✅ **in archivio dal 29/10/2026** (`sql/47`, colonne
  `falli_casa`/`falli_trasf`): football-data li pubblicava (`HF`/`AF`) in
  tutti e quindici i campionati e in ogni stagione, nello stesso file dei
  cartellini, ed ESPN li manda (`foulsCommitted`). **50.683 partite**
  riempite con `recupera-da-csv.js`, che tocca solo quelle due colonne. Coppe,
  Olanda 2 e Giappone vengono solo da ESPN: da lì solo le partite nuove, il
  recupero dello storico (~13.500, ore) si fa **se la misura dice che
  servono**. ⚠️ **Non ancora misurati**: nessuno sa se migliorino i
  cartellini, e finché la misura non c'è non entrano nella scheda;
- **l'arbitro** — ⛔ **verificato il 29/10: football-data lo pubblica solo
  per Premier, Championship e Scozia** (`Referee` vuota negli altri dodici,
  in ogni stagione). Tre campionati su quindici: lasciato stare.
