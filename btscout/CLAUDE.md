# BTScout — analista calcistico

Agente che cerca **value bet** sui principali campionati europei, mercati 1X2 e
Over/Under 2.5 gol. Sorella di JARVIS (`../jarvis-pwa/`), ma **agente separato con
regole sue**: Mattia ha scelto esplicitamente di non sporcare il prompt di JARVIS
con il calcio. In prospettiva i due si parleranno — JARVIS coordinatore, BTScout
specialista — ma non ancora.

---

## ⚠️ PRIMA DI QUALSIASI COSA: LEGGI STATO.md

**All'inizio di ogni sessione, leggi sempre [STATO.md](STATO.md).** Contiene
roadmap, to-do e il punto esatto in cui siamo. **Alla fine, aggiornalo.** Se una
task cambia stato e il file non lo riflette, la sessione dopo riparte da
informazioni sbagliate. Aggiornare STATO.md fa parte del lavoro.

---

## ⚠️ LA REGOLA CHE NON SI TOCCA: la matematica calcola, Claude giudica

**Un LLM non produce probabilità calibrate.** Se Claude dice "il Milan ha il 60%",
quel numero non nasce da un calcolo: nasce da come suona la frase. Contro un
bookmaker che prezza di mestiere, è denaro perso — e perso *credendo di avere un
metodo*, che è il modo peggiore.

La divisione è netta e non va mai invertita:

| Chi | Cosa fa |
|-----|---------|
| **Il modello** (codice) | Stima le probabilità. Dixon-Coles sui risultati storici. Deterministico, verificabile, sbaglia in modo misurabile. |
| **Claude** (BTScout) | Legge il contesto che i numeri non contengono (infortuni, turnover, motivazione), **spiega** perché il modello dissente dal mercato, e **avverte** quando il segnale è debole. |

Se ti ritrovi a scrivere codice in cui Claude stima una probabilità, o un prompt
che glielo chiede, **fermati**: stai costruendo un generatore di opinioni sicure
di sé travestito da analisi.

---

## ⚠️ DUE TRAPPOLE CHE INVALIDANO TUTTO

### 1. Il margine del bookmaker (vig / overround)
**Le quote non sono probabilità.** Contengono la commissione: le probabilità
implicite di una partita sommano a 105-108%, non a 100. Chi confronta le quote
grezze col proprio modello trova "valore" ovunque — sta solo misurando la
commissione del banco.

**Va sempre rimosso prima di ogni confronto.** È il passaggio che quasi tutti
sbagliano ed è la differenza fra un segnale e un artefatto.

### 2. Il registro delle previsioni
L'agente **deve** segnare cosa ha detto e verificare com'è andata. Senza, dopo tre
mesi nessuno saprà se funziona: si ricordano i colpi e si dimenticano gli sbagli.
Non è una feature da fare "dopo": senza registro il progetto è infalsificabile,
e un progetto infalsificabile non è uno strumento, è una credenza.

---

## L'aspettativa onesta, da tenere viva

Il mercato ha ragione quasi sempre. **Quasi tutto il "valore" che il modello
troverà sarà errore suo, non un buco del mercato.** I bookmaker prezzano meglio di
qualunque cosa si costruisca in un weekend.

Questo non significa non farlo: significa costruirlo come **strumento di analisi**
che mostra dove e perché il modello dissente dal mercato, e lasciare che sia il
backtest e poi il registro a dire se vale. Non promettere mai a Mattia un margine.
Se i numeri dicono che perde, va detto per primo.

---

## Con chi stai lavorando

Mattia (Pezz) non scrive codice: lo gestisce Claude Code.

- Comunicazione diretta, in italiano, senza giri di parole.
- Soluzione semplice prima; la complessità va giustificata.
- Niente adulazione, niente motivazione.
- Quando serve un'azione manuale (Vercel, Neon, chiavi API), dare i passaggi esatti.
- Se un approccio è sbagliato, dirlo subito con la motivazione.
- **Non committare senza che lo chieda. Il push lo fa sempre lui**, da VSCode:
  fermarsi al commit e dire che è pronto.

## Struttura

```
btscout/
  index.html       # PWA — dark HUD, riadattata da JARVIS
  api/chat.js      # L'agente: system prompt + tool runner
  api/version.js   # Espone l'hash del commit all'etichetta della PWA
  manifest.json    # Config PWA
  package.json     # "type": "module" obbligatorio (ESM su Vercel)
  CLAUDE.md        # Questo file
  STATO.md         # Roadmap e to-do — LEGGERE SEMPRE
```

## Architettura di destinazione

```
football-data.co.uk (CSV, 30+ anni) ──→ [ import ] ──→ Neon (storico)
                                                          │
                                                          ▼
                                                  modello Dixon-Coles
                                                          │
The Odds API (quote giornata) ──→ togli il margine ──→ confronto ──→ divergenze
                                                          │
                                          BTScout: contesto, spiegazione, avvertenze
                                                          │
                                              registro → verifica dopo la partita
```

## Fonti dati — decise

| Fonte | Ruolo | Costo |
|-------|-------|-------|
| **football-data.co.uk** | Storico: risultati + quote di chiusura, 30+ anni, CSV, nessuna chiave | gratis |
| **The Odds API** | Quote e calendario della giornata in arrivo | gratis, 500 crediti/mese |

Scartate: API-Football (stagioni storiche limitate sul piano gratuito),
football-data.org (quote a pagamento, €15/mese), TheSportsDB (niente quote).
Rivalutabili **solo** se il backtest dice che il modello vale — non prima.

**Niente xG** restando gratis: il modello lavora sui gol reali. È il modello
classico della letteratura e basta per capire se la strada regge.

## Servizi

| Cosa | Dove |
|------|------|
| Repo | GitHub `Pezz23/Jarvis`, cartella `btscout/` (monorepo con JARVIS) |
| Deploy | Vercel — **progetto separato**, Root Directory = `btscout/` |
| Database | Neon (stesso account di JARVIS, `DATABASE_URL` in env var) |
| Modello | `claude-sonnet-5`, thinking adattivo, effort medium |

### Env var su Vercel (da configurare)
- `ANTHROPIC_API_KEY`
- `DATABASE_URL` — Neon
- `ODDS_API_KEY` — The Odds API

## Trappole note — ereditate da JARVIS, valgono qui

- **`package.json` deve avere `"type": "module"`** — `@neondatabase/serverless`
  non funziona senza, su Vercel ESM.
- **Segreti solo in env var Vercel**, mai nel codice, mai committati.
- **Su Sonnet 5 il thinking adattivo è attivo di default** e consuma `max_tokens`
  insieme alla risposta: con un tetto stretto la risposta arriva troncata.
- **Il primo blocco della risposta è di tipo `thinking`**, non `text`: leggere
  `content[0].text` restituisce stringa vuota. Va cercato il blocco di testo.
- **Lo storico non deve iniziare con `assistant`** — l'API rifiuta con 400. La
  finestra di 20 messaggi può tagliare uno scambio a metà: vedi `getHistory`.
- **Niente numeri di versione scritti a mano**: l'etichetta mostra l'hash del
  commit via `api/version.js`. Richiede "Enable access to System Environment
  Variables" nelle impostazioni del progetto Vercel (già attivo sull'account).
- **`@anthropic-ai/sdk`**: il tool runner vuole `inputSchema` in **camelCase**
  (la documentazione online dice `input_schema`: è sbagliata, verificare sempre
  sul sorgente in `node_modules`).

## Convenzioni

- Il pattern degli strumenti è già collaudato in `../jarvis-pwa/api/chat.js`:
  `betaTool({ name, description, inputSchema, run })` + `beta.messages.toolRunner`.
  Riusarlo, non reinventarlo.
- La tabella dello storico chat è `btscout_chat_history` — **non** `chat_history`,
  che è di JARVIS: condividono lo stesso database Neon.
- Prima di scrivere codice che dipende da un'API, verificarne la firma reale
  (installare e provare, non fidarsi della documentazione).
