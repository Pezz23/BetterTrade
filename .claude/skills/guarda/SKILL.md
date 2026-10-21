---
name: guarda
description: Apre BetterTrade in un browser vero su localhost e fotografa le pagine, per poterle guardare davvero invece di dedurle dal codice. Da usare ogni volta che si tocca qualcosa di visivo — colori, caratteri, spaziature, layout — e prima di dichiarare finito un lotto del restyling.
---

# Guardare l'app, invece di dedurla

⚠️⚠️ **Chi sviluppa questa app dal terminale non vede lo schermo, e questo ha
già prodotto difetti veri**: uno `style` passato a un componente che non aveva
quella prop — ignorato **in silenzio**, due giri di *"ho rimpicciolito"* senza
cambiare un pixel — e un tondo della posizione in classifica che Mattia ha
dovuto bocciare con una foto. `npm run lint` e `vite build` dicono che il
codice è **giusto**, non che la pagina si **legge**.

## Il giro, in due comandi

```bash
cd app
npm run dev > /dev/null 2>&1 &                     # se non gira già
node --env-file=.env scripts/guarda.mjs            # tutte le pagine, a 375px
```

Poi si **leggono i PNG** in `app/.schermate/` con lo strumento di lettura: sono
immagini, si vedono davvero.

Pomelli:

```bash
node --env-file=.env scripts/guarda.mjs scalata partite   # solo due pagine
node --env-file=.env scripts/guarda.mjs --largo           # anche a 1280px
```

## Cosa serve

- `E2E_USER` e `E2E_PW` in `app/.env` (gitignorato). ⚠️ **Le pagine `soloAdmin`
  — Spin, Road to weekend, Utenti — si vedono solo se quell'utente è admin**:
  con un utente normale quelle tre falliscono, ed è giusto così.
- Playwright, già fra le **devDependencies** di `app/`. ⚠️ Non è una dipendenza
  dell'app: non entra nel pacchetto che va su Vercel.

## Le cose che non sono ovvie

- ⚠️⚠️ **Si fotografa a 375px, non su un desktop comodo.** È lo schermo stretto
  su cui questo progetto ha già rotto due layout — la griglia della Slot
  (`1fr` non scende sotto il contenuto: serve `minmax(0,1fr)`) e le quattro
  scorciatoie di Andamento. Un difetto di larghezza su un monitor non esiste.
- ⚠️⚠️ **Le pagine si raggiungono CLICCANDO, non con un indirizzo.** L'app
  tiene la pagina corrente in uno stato di React e non ha rotte (è il lotto Q
  di STATO.md, mai fatto): lo script preme i tasti della barra in basso e le
  voci del menu ☰. Se si cambia un'etichetta della navigazione, **va cambiata
  anche in `PAGINE`** dentro lo script, o quella pagina smette di essere
  fotografata — in silenzio, con una sola riga `❌` in mezzo alle altre.
- ⚠️ **Lo script raccoglie gli errori del browser** (`pageerror` e la console) e
  li stampa in fondo: una pagina può *sembrare* a posto e aver lanciato tre
  eccezioni. È la differenza fra "si disegna" e "funziona", e `vite build` non
  la vede.
- ⚠️ L'attesa fra un clic e la foto è **fissa (1,2 s)** e non `networkidle`:
  l'app continua a parlare col database, quindi "rete ferma" non arriva mai.
- ⚠️ `fullPage: true`: si fotografa la pagina **intera**, non la finestra — il
  difetto sta quasi sempre sotto la piega.
- ⚠️ Le schermate **non si versionano** (`.schermate/` è in `.gitignore`):
  sono materiale di lavoro, e un PNG per pagina per lotto gonfierebbe il repo.

## Quando NON basta

Questo giro **non fa login come utente normale e non prova i gesti**: niente
trascinamento della scheda partita, niente tenuta premuta sui tasti `+`,
niente tastiera. Quelle cose restano da provare a mano — e il tocco su telefono
vero resta l'unica prova che `:hover` non resti attaccato.
