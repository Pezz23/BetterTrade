# Mettere le password al sicuro — runbook

Da eseguire **in quest'ordine**, dalla cartella `app/`.
Ogni passo va verificato prima di passare al successivo: l'ordine serve a non
restare chiusi fuori dall'app.

## Prima di cominciare

1. Aggiungi la chiave `service_role` a `app/.env` (il file esiste già,
   è gitignorato). La trovi in **Supabase → Settings → API → service_role**:

   ```
   SUPABASE_SERVICE_KEY=eyJ...
   ```

   Quella chiave bypassa ogni regola di sicurezza. Non va nel browser, non va in
   git, non va incollata in chat.

2. Backup già fatto: `backup/2026-09-09T08-40-31/` (325 righe).
   Se rifai il backup: `node --env-file=.env scripts/backup.js`

---

## Passo 1 — Aggancio ad Auth (innocuo)

Supabase → **SQL Editor** → incolla ed esegui `sql/01-auth-id.sql`.

Aggiunge la colonna `users.auth_id` e due funzioni di supporto.
L'app continua a funzionare esattamente come prima.

## Passo 2 — Creare gli account Auth

```bash
node --env-file=.env scripts/migra-auth.js            # prova a vuoto, non scrive
node --env-file=.env scripts/migra-auth.js --esegui   # crea davvero
```

Crea un account per ognuno dei 7 utenti, con una password nuova, corta e pronunciabile (es. `lampo-427`).
**Le vecchie password non vengono riusate**: erano in chiaro in un repo pubblico.

Le credenziali finiscono a schermo e in `backup/CREDENZIALI-NUOVE.txt`
(gitignorato). Distribuiscile a voce, poi cancella il file.

A questo punto l'app **non funziona ancora** con le password nuove: manca il
passo 3.

## Passo 3 — Il nuovo login

Il codice è già pronto: `src/context/AuthContext.jsx` usa Supabase Auth.
Riavvia (`npm run dev`) ed entra con username + una password nuova.

**Verifica prima di proseguire:** che entrino tutti, o almeno tu come
superadmin. Se qualcosa non va, il passo 4 non va fatto.

## Passo 4 — RLS (il passo che chiude la falla)

Supabase → **SQL Editor** → `sql/02-rls.sql`.

Da qui i permessi stanno nel database: chiamare l'API a mano non serve più.
Un `user` non vede più i dati degli altri, nemmeno bypassando l'interfaccia.

**Verifica:** entra come utente normale (es. `Bermani`) e controlla che veda
solo il proprio bankroll; entra come superadmin e controlla che veda tutto.

## Passo 5 — Cancellare le password in chiaro

Supabase → **SQL Editor** → `sql/03-elimina-password.sql`.

Si rifiuta di partire se qualcuno non è ancora agganciato ad Auth.
Da qui non si torna indietro (restano solo nel backup su disco).

## Dopo

- Cancella `backup/CREDENZIALI-NUOVE.txt`
- I backup su disco contengono le vecchie password in chiaro: cancellali quando
  non servono più, o tienili su un disco cifrato

---

## Cosa cambia nell'uso quotidiano

Creare utenti e resettare password richiedono la `service_role`, quindi si
fanno da terminale invece che dall'app:

```bash
node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"
node --env-file=.env scripts/reset-password.js Bermani
```

Ognuno può cambiarsi la propria password dalla pagina Utenti.

Per rimetterle nell'interfaccia serve una funzione serverless (Supabase Edge
Function) che tenga la chiave lato server — lavoro già previsto in STATO.md.
