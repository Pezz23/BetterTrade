# BetterTrade

Archivio delle giocate di un gruppo di sei persone, più il motore che le misura.

Il gruppo gioca delle **spin**: griglie di nove partite (tre per tre) da cui si
ricavano otto schedine — i quattro angoli, i quattro lati e il centro, combinati
in tris, quaterne e una full. L'app registra le giocate e i saldi; il motore
sceglie quali partite proporre, e verifica se le proposte reggono.

```
app/        L'app.     React + Vite + Supabase. Spin, giornate, bankroll, lista partite.
btscout/    Il motore. Node, nessuna interfaccia: import, misure, backtest.
CLAUDE.md   Le regole del progetto: cosa non si tocca e perché.
STATO.md    La to-do list e il punto esatto in cui siamo.
```

I due pezzi condividono **un solo database** (Supabase): l'app legge le stesse
53.000 partite che il motore importa.

## Partire

```bash
cd app && npm install && npm run dev      # l'app su localhost:5173
cd btscout && npm install                 # il motore (solo da terminale)
```

Servono due file `.env`, non versionati perché contengono le chiavi:
`app/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`)
e `btscout/.env` (`DATABASE_URL`, `ODDS_API_KEY`). Gli esempi sono in
`app/.env.example`.

## Il comando che si usa davvero

```bash
cd btscout && node --env-file=.env scripts/aggiorna.js --esegui
```

Martedì e venerdì dopo le 18: importa i risultati, collega le partite future a
quelle giocate e scarica il calendario con le quote.

## Come funziona la scelta delle partite

In breve: **non prevediamo chi vince, leggiamo quanto il mercato è sicuro.**
La probabilità viene dalla media di ~40 bookmaker, tolto il margine; le partite
si dividono in centro, gialle e blu secondo quanto sono attendibili. Tutto
quello che il progetto ha misurato — e gli errori in cui è già cascato — sta in
[CLAUDE.md](CLAUDE.md), che è anche il file che legge Claude Code a ogni
sessione.

**Prima di cambiare qualcosa, leggi [STATO.md](STATO.md):** è la memoria del
progetto, non un elenco di buone intenzioni.
