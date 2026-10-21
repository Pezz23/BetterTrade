# MAPPA — tutto quello che si vede, e chi lo disegna

> Scritta il 21 ottobre 2026 come base per il **cambio di look**, che deve
> comprendere tutte le pagine. Serve a una cosa sola: **non dimenticare niente**,
> e sapere in anticipo *quanto arriva lontano* ogni modifica.
> Compilata leggendo il codice, non a memoria. App alla versione **1.29.01**.

---

## 1. La cornice — c'è intorno a ogni pagina

| pezzo | dove | cosa contiene |
|---|---|---|
| **Header** | in alto, fisso (`--barra-alta`) | nome dell'app, **numero di versione**, chi sei, ☰ e logout |
| **Menu ☰** | tendina sopra la pagina | 8 voci, ognuna con icona, nome e **una riga di descrizione** |
| **TabBar** | in basso, fissa (`--barra-bassa`) | 4 tasti (3 per chi non è admin): il giro settimanale |
| **il contenitore** | in mezzo | `maxWidth: 720`, centrato, `flex: 1` |

⚠️ **Le due barre sono fisse e il loro spessore vive in `index.css`** come
`--barra-alta` / `--barra-bassa`: il padding della pagina li legge da lì. Se il
look cambia l'altezza di una barra, **quelle due variabili vanno cambiate con
lei**, o le ultime righe di ogni pagina finiscono sotto la tab bar.

**In basso (il gesto settimanale, in quest'ordine di proposito):**
`◈ Dashboard` · `⊞ Slot` · `🎰 Spin` *(solo admin)* · `⚽ Partite`

**Nel menu (tutto il resto):**
`⭐ Partite votate` · `📚 Storico` · `📈 Andamento` · `◫ Reporting` ·
`◉ Bilancio` · `📥 Importazioni` · `🪜 Road to weekend` *(admin)* ·
`◎ Utenti` *(admin)*

---

## 2. Le quattordici schermate

⚠️ `solo admin` nasconde **il tasto**: la protezione è sempre la policy RLS.

| # | schermata | come si arriva | a cosa serve | dentro c'è |
|---|---|---|---|---|
| 1 | **Login** | prima di tutto | username + password (niente email) | un pannello solo, centrato |
| 2 | **Dashboard** | tab `◈` | come sta andando la spin in corso | 4 riquadri + il blocco GIOCATA |
| 3 | **Slot** | tab `⊞` | la griglia 3×3 e le 8 combinazioni | la griglia, le combinazioni, le spunte **GIOCATA** |
| 4 | **Spin provvisorie** | tab `🎰` · admin | comporre le 4 spin prima di giocarle | Automatica / Con le stelline / LE VOTATE |
| 5 | **Partite** | tab `⚽` | la lista delle future con i 5 numeri | legenda, filtri `⚙`, ordine, le righe |
| 6 | **Scheda partita** | si apre **sopra** la lista | tutto su una partita | 8 blocchi (vedi sotto) |
| 7 | **Partite votate** | menu `⭐` | quelle con la stellina | le stesse righe della 5 |
| 8 | **Storico** | menu `📚` | l'archivio e come vanno le proposte | 4 riquadri · prossime per campionato · le proposte · le ultime chiuse |
| 9 | **Andamento** | menu `📈` | quale indicatore ci azzecca | 3 card a scomparsa · **4 card indicatore** · i giorni a tendina |
| 10 | **Reporting** | menu `◫` | le giornate per persona e settimana | tabellone per settimana + inserimento |
| 11 | **Bilancio** | menu `◉` | saldi, movimenti, bankroll | totale stagione · storico giornate · movimenti |
| 12 | **Importazioni** | menu `📥` | le partite ESPN che non si agganciano | la coda, con *crea nuova* / *scarta* |
| 13 | **Road to weekend** | menu `🪜` · admin | la scalata del weekend | `PIANO \| ARCHIVIO` · casse · selezione · passi · consigliate |
| 14 | **Utenti** | menu `◎` | creare utenti e password | elenco + form |

**I blocchi della scheda partita (6), nell'ordine deciso da Mattia:**
evento e giocata → forma → **⚽ gol attesi** (10 celle a gradiente) → classifica
→ scontri diretti → **🧮 VPM** (due forze, tre strati, sette parametri) →
consenso di mercato → dettagli completi.

---

## 3. I pezzi condivisi — qui una modifica arriva lontano

**Toccare questi è il modo efficiente di cambiare look.** Il numero dice in
quanti file compare.

| pezzo | file | che cos'è |
|---|---|---|
| `Etichetta` | **11** | la scritta maiuscola spaziata sopra ogni cosa. **La più diffusa di tutte.** |
| `Card` | **9** | il riquadro grigio: fondo, bordo, angoli |
| `TestataPartita` | 7 | le due squadre con la giocata in mezzo — **la stessa in lista e in scheda** |
| `RigaPartita` | 4 | una riga della lista = testata + barra |
| `DettaglioPartita` | 4 | la scheda intera |
| `BarraPartita` | 3 | i cinque numeri `QUOTA · ATTEND. · VPM · RESA · VOTO` |
| `SchedaScorrevole` | 3 | il foglio che si apre sopra la lista, col gesto indietro |
| `Input` | 3 | il campo di testo (adottato il 15/10: prima erano tre copie) |
| `TastoRipeti` | 3 | il tasto che si ripete tenendolo premuto |
| `Btn` · `Badge` · `StatCard` · `Posizione` · `LegendaPartite` | 2 | il resto |

### ✅ La trappola del restyling, chiusa il 21/10/2026

Sei pagine — **Dashboard, Bilancio, Reporting, Slot, Utenti, Login** — non
usavano `Card` e si riscrivevano la superficie a mano. Cambiare `Card` non le
avrebbe toccate: sarebbero rimaste con l'aspetto vecchio **accanto** a quello
nuovo, ed è il difetto che non si nota provando una pagina alla volta.

⚠️ **E il numero scritto qui la prima volta era sbagliato: dicevo 33 contando
le righe con `borderRadius`**, che però comprendono pulsanti, pastiglie, caselle
e celle della griglia. Le superfici vere — fondo `C.card`, bordo, raggio — erano
**19**, e sono tutte travasate:

| pagina | superfici | ora |
|---|---|---|
| **Bilancio** | 10 | `stileCard()` |
| **Dashboard** | 4 | `stileCard()` |
| **Reporting** | 3 | `stileCard()` |
| **Slot** | 2 | `stileCard()` |
| **Login** | 1 | **lasciata**: è `C.pannello` con raggio 18, ed è voluto — `pannello` è il token delle modali e del login |
| Utenti | 0 | quelle che sembravano card sono due avvisi e due pulsanti |

⚠️ **`stileCard(style, colore)` e non il componente `Card`**, in quei punti: la
superficie non è un `<div>` qualunque ma un `<button>`, una `<label>`, una cella
dentro un `map` con altre proprietà. **Il componente per il caso normale, lo
stile per gli altri — e il fondo, il bordo e il raggio stanno in un posto solo.**
⚠️ Quello che è cambiato a vedersi, in tutto: il raggio del blocco grosso della
Dashboard (12 → 10), delle sue righe per spin (9 → 10) e dei due riquadri della
Slot (8 → 10), più il bordo verde di Reporting da 0,30 a 0,20 di opacità.

---

## 4. Com'è fatto l'aspetto adesso

**I colori stanno tutti in `src/theme.js`** (`C`), e nelle pagine non deve
comparire nessun valore scritto a mano: `alpha(C.oro, .12)`, mai
`rgba(201,168,76,0.12)`. ⚠️ `index.css` ne tiene **una copia ridotta al minimo**
(`--bg`, `--border`, `--text`, `--sans`): se si cambia un colore lì, va
riportato in `theme.js` e viceversa.

**Le superfici, dal fondo alla card** — cinque grigi quasi uguali:
`fondo #090909` → `barra #0d0d0d` → `pozzo #0a0a0a` (i campi, "incassati") →
`pannello #111111` (login, modali) → `card #141414`.
Più **tre bordi**: `bordoTenue #181818` · `bordoRiga #1a1a1a` · `bordo #1e1e1e`.

**Il testo, quattro livelli:** `testo #e0d9d0` → `spento #555` (etichette) →
`fioco #444` → `fantasma #333` (disabilitato).

**I colori che parlano:** `oro` = l'app, il superadmin, la full · `verde` =
vincita e deposito · `rosso` = perdita e errore · `blu` = admin e informazione ·
`ambra` = oggi e avviso · `viola` = GG/NG · `menta` = ruolo user.

**Due caratteri:** `DM Mono` (**262 usi**) e `Sora` (139). ⚠️ Il mono domina, ed
è una scelta: i numeri in colonna devono stare incolonnati. È anche il motivo
per cui l'app sembra un terminale.

### ✅ La scala dei caratteri, fatta il 21/10/2026

Prima non c'era: **19 misure diverse** scritte a mano, con tre picchi (11px
**102 volte**, 10px 81, 9px 50) e una coda di numeri usati una o due volte.
*"Piccolo"* voleva dire 9, 10 o 11 a seconda di chi aveva scritto la riga.

Adesso `S` in `theme.js` ha **dodici passi, ognuno con un ruolo** — si scrive
`S.base` perché è il testo corrente, non perché sono 11 pixel:

`nano 7` · `micro 9` · `minuta 10` · **`base 11`** · `corpo 12` · `media 13` ·
`grande 14` · `titolo 16` · `evidenza 20` · `cifra 28` · `mega 48` ·
`icona 18` *(i glifi, che non sono testo)*

**446 misure sostituite in 23 file**, e verificato risolvendo i nomi in numeri e
confrontando col prima: ne cambiano **29**, tutte di 1-2 px e tutte usi singoli.
⚠️ `nano` resta 7 e **non si tocca per fare ordine**: è l'etichetta sotto i
cinque numeri della barra, e cinque colonne su 375px fanno 63px l'una.
⚠️ I nomi delle squadre restano in `clamp()`: devono restringersi col telefono
invece di andare a capo.

---

## 5. Da dove arrivano i dati (quello che il look non deve rompere)

| sorgente | chi la usa | nota |
|---|---|---|
| `usaProssime` | **6 pagine** | le 67 future valutate + le stelline · **memoria di sessione** |
| `usaVpm` | 4 | `vpm_dati()`, 67 kB · memoria di sessione |
| `usaClassifiche` | 3 | `classifiche()`, 17 kB · memoria di sessione |
| `usaAndamento` | 1 | cinque funzioni SQL: **i conteggi li fa il database** |
| `usaScalate` | 1 | il registro della scalata |
| `usaForma` | 1 | la forma, chiesta all'apertura della scheda |
| `AuthContext` | tutte | chi sei, il ruolo, gli utenti, il bankroll |

⚠️ **Le pagine non calcolano**: i numeri vengono da `src/lib/` (`attendibilita`,
`vpm`, `gol`, `scalata`, `ordine`, `spin`, `griglia`, `bankroll`) e i formattatori
da `lib/formato.js`. Un cambio di look non deve spostare un calcolo dentro una
pagina — è la regola che tiene il motore e lo schermo sullo stesso numero.

---

## 6. Se si cambia il look, l'ordine conveniente

⚠️ **I punti 1 e 3 sono stati fatti il 21/10/2026**, prima di sapere l'idea di
Mattia, proprio perché erano lavoro meccanico e non di gusto: la scala dei
caratteri esiste e le superfici passano tutte da un posto solo. **Quindi il
restyling ora parte dal punto 2.**

1. ✅ **La scala dei caratteri** (`S` in `theme.js`) — fatta. Le **spaziature**
   no: `padding`, `gap` e `marginBottom` sono ancora numeri a mano, e sono il
   prossimo `S` da scrivere se serve.
2. **`Etichetta` e `Card`** (11 e 9 file) **più `stileCard`** (4 pagine): il
   colpo più largo con la modifica più piccola.
3. ✅ **Le sei pagine fuori da `ui.jsx`** — fatte: 19 superfici travasate.
4. **`TestataPartita` + `BarraPartita`**: sono *la* partita, e si vedono in
   cinque schermate su quattordici.
5. **La cornice** (header, menu, tab bar) — ricordando `--barra-alta` e
   `--barra-bassa` in `index.css`.
6. **Le pagine con una grafica propria e densa**: Slot (la griglia), Andamento
   (le quattro card e il gradiente), Road to weekend (i colori per passo), la
   scheda partita (le dieci celle dei gol). ⚠️ Qui il colore **significa**
   qualcosa di misurato — il gradiente dei gol, il verde/rosso di VPM, l'ambra
   del disaccordo fra book — e non si può cambiare solo perché sta meglio.
