---
titolo: "Risposta — Restyling globale UI/UX (Dark Analytics)"
briefing: consegnato a voce il 21/10/2026 (riassunto scritto da una sessione esterna, su screenshot)
data: 2026-10-21
progetto: bettertrade
stato: valutato — non sviluppato
decisione: in attesa di Mattia
---

# Risposta al riassunto sul restyling

⛔ **Nessun codice scritto.** Il cancello del progetto vale anche qui: prima
fattibilità, impatto sui file, cosa non torna, stima. Decide Mattia.

⚠️ **Chi ha scritto il riassunto non ha visto il codice**, solo delle schermate.
Si vede, e in buona parte in senso buono: la **diagnosi è giusta e i numeri la
confermano**. Ma sei affermazioni sono sbagliate o incomplete, e due chiedono
cose che il riassunto stesso vieta tre paragrafi dopo.

---

## 1. La diagnosi è corretta, e i numeri la misurano

| quello che dice il riassunto | quello che dice il codice |
|---|---|
| "troppi testi monospaziati" | **`F.mono` 262 usi contro 139 di `F.sans`.** Andamento è mono **28 volte e sans zero**; Road to weekend 42 contro 1 |
| "informazioni che hanno tutte lo stesso peso" | `fontWeight: 700` usato **100 volte** su 149 — il grassetto non distingue più niente |
| "spaziature non uniformi" | `padding`, `gap` e `margin` sono **numeri scritti a mano**, nessuna scala |
| "card molto dense, riquadri annidati" | 5 grigi di superficie quasi uguali (`#090909` → `#141414`) e 3 bordi |
| "etichette con poco contrasto" | `spento #555` su `card #141414` = contrasto **2,6:1**, sotto il minimo di 4,5:1 |

⚠️ E una cosa che il riassunto **non poteva sapere ma è vera**: `index.html`
carica **cinque pesi di Sora** (300-700) e il 300 non lo usa nessuno, mentre
`fontWeight: 800` è usato 5 volte **senza che l'800 sia caricato** — il browser
se lo inventa ingrassando il 700. È un difetto di peso e di resa insieme.

## 2. Le sei cose che correggerei

1. ⚠️⚠️ **"Meno monospaziato" è la conclusione giusta dalla premessa sbagliata.**
   Il mono non è un vezzo: tiene i numeri **incolonnati**, e in questa app le
   colonne di numeri sono il contenuto (i cinque numeri della barra, le dieci
   celle dei gol, le quote, la slot). La regola non è *"meno mono"* ma
   **"mono solo per i numeri, sans per le parole"** — ed è una regola
   meccanica, applicabile sito per sito sui 262 usi.
2. ⚠️ **"Non racchiudere ogni numero in una card" vale, tranne dove la card È
   il comando.** Le quattro card di Andamento *sono* il selettore (decisione
   registrata: il numero e il tasto che apre le sue partite devono essere la
   stessa cosa). Togliere il riquadro lì rompe l'interazione, non la alleggerisce.
3. ⚠️ **La palette proposta è quasi la nostra, spostata di un passo.** Oro
   `#D8B44A` contro `#c9a84c`, verde `#20B875` contro `#22c55e`, rosso `#E05252`
   contro `#ef4444`, blu `#4C9FFF` contro `#60a5fa`. **La differenza vera è
   un'altra, e sarebbe un guadagno**: i suoi fondi sono più **chiari e
   distinguibili** (`#0B0D10` / `#14171B` / `#1B2026`) mentre i nostri cinque
   grigi sono indistinguibili. Cambiarli è una riga in `theme.js`.
4. ⚠️ **Chiede di migliorare "i grafici" del Reporting: grafici non ce ne
   sono.** E aggiungerli sarebbe una funzione nuova, che lo stesso riassunto
   vieta (*"non creare nuove funzionalità per giustificare il lavoro grafico"*).
   Da decidere, non da assumere.
5. ⚠️ **Chiede un font sans "moderno": ce l'abbiamo già** (Sora), e dice anche
   di non aggiungere font pesanti. Quindi nessun font nuovo: **lo stesso Sora,
   usato di più**, e Sora alleggerito dei pesi che non servono.
6. ⚠️ **"Icone di un unico set" vuol dire togliere le emoji** (⭐📚📈📥🪜) e
   disegnarle. Si può fare senza dipendenze, con SVG scritti a mano, ma sono
   ~12 icone da disegnare e mantenere, e cambia l'identità dell'app. È un lotto
   suo, e secondo me l'ultimo: le emoji sono brutte ma **non sono il motivo per
   cui l'app sembra un gestionale**.

## 3. Cosa è già fatto (Fase A e metà della B)

Il riassunto chiede un audit e un design system: **esistono**, da ieri e da
oggi.

- `MAPPA.md` — le quattordici schermate, chi le disegna, da dove arrivano i dati.
- `S` in `theme.js` — la scala dei caratteri, dodici ruoli, 446 misure.
- `stileCard()` — la superficie in un posto solo, 19 travasate.
- `C` in `theme.js` — i colori, già tutti da un posto solo.
- il caricamento a richiesta delle pagine, e `memo` sulle righe della lista.

**Quindi il restyling non parte da zero: parte dal consolidare quei token e
usarli.**

## 4. I rischi veri di questo repo

1. ⚠️⚠️ **Io non vedo lo schermo.** Posso garantire che compila, che il linter
   passa, che i numeri non cambiano e che nessuna misura è scritta a mano. **Non
   posso verificare "non sembra più un AS/400", né 375/390/430/768/1280.** Il
   criterio 11 e 12 del riassunto sono **suoi**, o servono screenshot.
2. ⚠️ **Quattro sistemi di colore significano qualcosa di misurato**: il
   gradiente a quattro fasce dei gol (soglie su 33.141 partite), il verde/rosso
   di VPM (accordo col mercato), l'ambra del disaccordo fra book, i colori per
   passo della scalata. Mattia ha già deciso: **rifacibili, conservando ordine e
   soglie.**
3. ⚠️ **La barra dei cinque numeri è al limite fisico**: cinque colonne su un
   telefono da 375px fanno 63px, con l'etichetta a 7px e altezza fissa. Ogni
   cambio di tipografia lì va rimisurato, non stimato.
4. ⚠️ **La griglia della Slot**: `1fr` non scende sotto il contenuto, serve
   `minmax(0,1fr)` **e** `minWidth: 0` dentro. Trappola già pagata tre volte.
5. ⚠️ **Decisioni registrate che un restyling non deve disfare in silenzio**: le
   card di Andamento sono il selettore · la posizione è la targhetta `1/20` e
   non il tondo · i due consigli O/U e GG/NG stanno al centro in bianco · il
   `title` non è mai l'unico posto di un'informazione · nel `<meta viewport>`
   mai `maximum-scale` · niente cambia altezza quando arriva un dato.

## 5. I lotti

Ognuno è **indipendente, committabile e guardabile sul telefono**: è l'unico
modo di lavorare senza vedere lo schermo.

| # | lotto | file | rischio | perché |
|---|---|---|---|---|
| **1** | **I token**: palette più distinguibile, scala delle spaziature, raggi, pesi, Sora alleggerito | `theme.js`, `index.css`, `index.html` | basso | arriva in ogni pixel senza toccare una struttura |
| **2** | **La regola del mono**: parole in Sora, numeri in mono | 20 file, 262 usi | medio | **è il lotto che toglie l'AS/400**. Si parte da Andamento (28 mono, 0 sans) e Road to weekend (42 a 1) |
| **3** | **I pezzi condivisi**: `Card`, `Etichetta`, `Btn`, `Input`, `Badge`, più gli **stati** che oggi non esistono (focus, hover, disabled, loading) | `ui.jsx` + 11 file | basso | 11 e 9 file di portata; il focus visibile è anche accessibilità |
| **4** | **La partita**: `TestataPartita`, `BarraPartita`, `RigaPartita` | 3 file, 5 schermate | **alto** | è l'oggetto più ripetuto e il più stretto: qui si misura, non si stima |
| **5** | **La scheda partita**: gerarchia a tre livelli, le dieci celle dei gol ridisegnate a fasce conservate | `DettaglioPartita.jsx` (657 righe, il file più grosso) | alto | è la pagina più densa dell'app |
| **6** | **La cornice**: header, menu, tab bar, area sicura in alto | `App.jsx`, `index.css` | basso | si vede sempre |
| **7** | **Le pagine dei numeri**: Dashboard, Bilancio, Reporting, Storico, Andamento | 5 pagine | medio | tanti riquadri annidati da sciogliere |
| **8** | **Le pagine dense**: Slot, Spin provvisorie, Road to weekend | 3 pagine | **alto** | griglie e colori che significano |
| **9** | **Le minori**: Utenti, Importazioni, Login | 3 pagine | basso | coda |
| **10** | **Le icone**: emoji → SVG disegnati, un set solo | `App.jsx` + componenti | medio | opzionale, e per ultimo |
| **11** | **Verifica**: larghezze, trabordamenti, contrasto | — | — | **serve Mattia o gli screenshot** |

⚠️ **L'ordine non è casuale:** 1 → 3 → 2 → 6 sono il massimo di resa col minimo
di rischio, e dopo quei quattro l'app è già un'altra. 4, 5 e 8 sono il lavoro
vero e vanno fatti uno per volta, con una guardata in mezzo.

## 6. Cosa NON farei

- **Grafici nuovi nel Reporting** (è una funzione, non un look).
- **Un font nuovo** (ne abbiamo due, e uno è già moderno).
- **Librerie UI, icon pack, dipendenze** — il riassunto è d'accordo.
- **Riscrivere le pagine da zero**: il restyling passa dai token e dai pezzi
  condivisi, o diventa un rifacimento con dentro i difetti nuovi.
- **Toccare un calcolo.** Nessuna formula, nessuna soglia, nessuna quota.
