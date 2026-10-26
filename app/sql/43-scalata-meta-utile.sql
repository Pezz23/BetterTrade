-- 🪜 ROAD TO WEEKEND — il metodo «Metà utile» (26/10/2026)
--
-- Al primo passo vinto si riprende la puntata, poi metà dell'utile a ogni
-- passo (`METODO` in `lib/scalata.js`, misurato con `prova-prelievi.js`).
-- Le scalate nuove si registrano con `regola = 'meta'`.
--
-- ⚠️ Le vecchie restano `madre`, `capitale` o `gioco`: quella colonna è la
-- fotografia di come si giocava **allora** (vedi `sql/32`). Il vincolo si
-- allarga e basta, nessuna riga esistente lo viola.

alter table scalate drop constraint if exists scalate_regola_check;
alter table scalate add  constraint scalate_regola_check
  check (regola in ('meta', 'madre', 'capitale', 'gioco'));
